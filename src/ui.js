// 공용 UI 헬퍼: DOM, 소리, 토스트, 모달, SVG 도형, 해설 렌더
import { Store } from "./storage.js";

export function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return n;
}
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

// ---------- 소리 (WebAudio, 음소거 지원) ----------
let actx = null;
function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return actx; }
export function beep(type = "good") {
  if (!Store.getSettings().sound) return;
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.connect(g); g.connect(c.destination);
  const map = { good: [660, 880], bad: [220, 160], click: [440], win: [660, 880, 1320] };
  const notes = map[type] || [440];
  let t = c.currentTime;
  g.gain.setValueAtTime(0.08, t);
  notes.forEach((f, i) => { o.frequency.setValueAtTime(f, t + i * 0.09); });
  o.start(t); g.gain.exponentialRampToValueAtTime(0.0001, t + notes.length * 0.09 + 0.05);
  o.stop(t + notes.length * 0.09 + 0.06);
}

// ---------- 토스트 ----------
export function toast(msg, kind = "") {
  const root = document.getElementById("toast-root");
  const t = el("div", { class: "toast " + kind, text: msg });
  root.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ---------- 모달 ----------
export function modal(titleText, contentNode, opts = {}) {
  const root = document.getElementById("modal-root");
  clear(root);
  const close = () => clear(root);
  const box = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": titleText });
  const closeBtn = el("button", { class: "btn ghost small close", text: "✕ 닫기", onclick: close });
  box.appendChild(closeBtn);
  box.appendChild(el("h2", { text: titleText }));
  box.appendChild(contentNode);
  const bg = el("div", { class: "modal-bg", onclick: (e) => { if (e.target === bg) close(); } }, [box]);
  root.appendChild(bg);
  closeBtn.focus();
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
  return close;
}

// ---------- 성공 애니메이션 ----------
export function winBurst() {
  if (Store.getSettings().motion) return;
  const root = document.getElementById("modal-root");
  const b = el("div", { class: "win-burst" }, [el("div", { class: "big", text: "🎉" })]);
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 900);
}

// ---------- SVG 도형 (그림 유추 엔진용) ----------
export function shapeSVG(spec, size = 90) {
  const s = spec.size ? spec.size : 1;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", size); svg.setAttribute("height", size);
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("role", "img");
  const cx = 50, cy = 50, R = 34 * s;
  const fill = spec.fill || "#a5d8ff", stroke = "#333";
  let shapeEl;
  const rot = spec.rotate || 0;
  const g = document.createElementNS(svgNS, "g");
  g.setAttribute("transform", `rotate(${rot} ${cx} ${cy})`);
  switch (spec.outline) {
    case "circle":
      shapeEl = document.createElementNS(svgNS, "circle");
      shapeEl.setAttribute("cx", cx); shapeEl.setAttribute("cy", cy); shapeEl.setAttribute("r", R);
      break;
    case "square":
      shapeEl = document.createElementNS(svgNS, "rect");
      shapeEl.setAttribute("x", cx - R); shapeEl.setAttribute("y", cy - R);
      shapeEl.setAttribute("width", 2 * R); shapeEl.setAttribute("height", 2 * R); shapeEl.setAttribute("rx", 4);
      break;
    case "triangle":
      shapeEl = document.createElementNS(svgNS, "polygon");
      shapeEl.setAttribute("points", `${cx},${cy - R} ${cx - R},${cy + R} ${cx + R},${cy + R}`);
      break;
    case "pentagon": {
      let pts = [];
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; pts.push(`${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`); }
      shapeEl = document.createElementNS(svgNS, "polygon");
      shapeEl.setAttribute("points", pts.join(" "));
      break;
    }
    case "arrow":
      shapeEl = document.createElementNS(svgNS, "polygon");
      shapeEl.setAttribute("points", `20,42 55,42 55,28 82,50 55,72 55,58 20,58`);
      break;
    default:
      shapeEl = document.createElementNS(svgNS, "circle");
      shapeEl.setAttribute("cx", cx); shapeEl.setAttribute("cy", cy); shapeEl.setAttribute("r", R);
  }
  shapeEl.setAttribute("fill", fill); shapeEl.setAttribute("stroke", stroke); shapeEl.setAttribute("stroke-width", 3);
  g.appendChild(shapeEl);
  if (spec.dot) {
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", 7);
    dot.setAttribute("fill", "#333");
    g.appendChild(dot);
  }
  svg.appendChild(g);
  return svg;
}

// ---------- 풀이 과정 표 렌더 ----------
export function renderProcessTable(tbl) {
  if (!tbl || !tbl.rows) return el("p", { text: "-" });
  const table = el("table", { class: "proc-table" });
  const thead = el("tr");
  (tbl.headers || []).forEach(h => thead.appendChild(el("th", { text: h })));
  table.appendChild(thead);
  tbl.rows.forEach(r => {
    const tr = el("tr");
    (Array.isArray(r) ? r : [r]).forEach(c => tr.appendChild(el("td", { text: String(c) })));
    table.appendChild(tr);
  });
  return table;
}

// ---------- 해설/힌트 렌더 ----------
const SECTION_LABELS = {
  answer: "정답", key: "핵심 정보", abstraction: "문제의 추상화", steps: "단계별 풀이",
  why: "왜 이렇게 풀까?", verify: "검증", mistakes: "자주 하는 실수", failReason: "실패하는 이유",
  better: "더 효율적인 방법", other: "다른 풀이", concept: "정보 개념", think: "생각해 보기",
};

export function renderFullExplanation(problem, { teacher = false } = {}) {
  const fx = problem.fullExplanation;
  const box = el("div", { class: "explain" });
  const add = (label, val) => {
    if (val == null) return;
    box.appendChild(el("h3", { text: `[${label}]` }));
    if (Array.isArray(val)) {
      const ul = el("ul");
      val.forEach(v => ul.appendChild(el("li", { text: v })));
      box.appendChild(ul);
    } else box.appendChild(el("p", { text: val }));
  };
  for (const k of Object.keys(SECTION_LABELS)) add(SECTION_LABELS[k], fx[k]);

  if (teacher && problem.teacher) {
    const t = problem.teacher;
    box.appendChild(el("h3", { text: "──────── 👩‍🏫 교사용 심화 ────────" }));
    const trow = (label, val) => add(label, val);
    trow("교재 문제 번호", problem.sourceProblem);
    trow("교재 쪽수", String(problem.sourcePage) + "쪽");
    trow("원문 난이도", t.origDifficulty);
    trow("정답 도출/검증", problem.verificationMethod);
    trow("프로그램 검증 결과", problem.verificationEvidence);
    trow("가능한 모든 정답", t.allAnswers);
    trow("최소 이동/시간(최적)", t.optimal);
    trow("대표 오답", t.commonWrong);
    trow("오답을 고르는 이유", t.wrongWhy);
    trow("수업 발문", t.questions);
    trow("개념 도입", t.intro);
    trow("모둠 활동", t.group);
    trow("난이도 조절", t.tune);
    trow("프로그래밍 연결", t.programming);
    trow("추가 도전 문제", t.extension);
    trow("평가 관점", t.eval);
    trow("예상 해결 시간", String(t.minutes) + "분");
    if (t.note) trow("비고", t.note);
  }
  return box;
}
