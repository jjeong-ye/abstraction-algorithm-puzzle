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
// 플래시 게임 감성의 효과음을 파일 없이 코드로 합성한다.
let actx = null;
function ctx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
  // 브라우저 자동재생 정책: 사용자 상호작용 후 suspended 상태면 깨운다.
  if (actx && actx.state === "suspended") { actx.resume().catch(() => {}); }
  return actx;
}

// 음 하나 재생 (주파수, 시작오프셋(초), 길이(초), 파형, 최대볼륨)
function playTone(c, freq, start, dur, { type = "sine", vol = 0.14, glideTo = null } = {}) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.connect(g); g.connect(c.destination);
  const t = c.currentTime + start;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo != null) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  // 부드러운 어택 + 자연스러운 감쇠 (딸깍거림 방지)
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}

export function beep(type = "good") {
  if (!Store.getSettings().sound) return;
  const c = ctx(); if (!c) return;
  switch (type) {
    case "click": // 버튼 "뽕"
      playTone(c, 520, 0, 0.09, { type: "triangle", vol: 0.12, glideTo: 760 });
      break;
    case "good": // 정답 "딩-동"
      playTone(c, 660, 0, 0.12, { type: "triangle", vol: 0.14 });
      playTone(c, 990, 0.10, 0.18, { type: "triangle", vol: 0.14 });
      playTone(c, 1320, 0.10, 0.25, { type: "sine", vol: 0.06 }); // 살짝 반짝이는 배음
      break;
    case "bad": // 오답 "삐-빅" (내려가는 음)
      playTone(c, 300, 0, 0.14, { type: "sawtooth", vol: 0.10, glideTo: 150 });
      playTone(c, 200, 0.14, 0.16, { type: "square", vol: 0.08, glideTo: 120 });
      break;
    case "win": { // 클리어 팡파레 (도-미-솔-도)
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => playTone(c, f, i * 0.11, 0.28, { type: "triangle", vol: 0.15 }));
      playTone(c, 1568, 0.44, 0.4, { type: "sine", vol: 0.08 }); // 마지막 반짝
      break;
    }
    default:
      playTone(c, 440, 0, 0.1, { type: "sine" });
  }
}

// 팝(선택) 사운드 — 엔진에서 조작할 때 가볍게 쓸 수 있음
export function pop(freq = 600) {
  if (!Store.getSettings().sound) return;
  const c = ctx(); if (!c) return;
  playTone(c, freq, 0, 0.07, { type: "triangle", vol: 0.10, glideTo: freq * 1.3 });
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

// ---------- 성공 애니메이션 (색종이 폭발 + 큰 이모지) ----------
export function winBurst() {
  if (Store.getSettings().motion) return;
  // 가운데 큰 이모지 팝
  const b = el("div", { class: "win-burst" }, [
    el("div", { class: "big", text: pickWinEmoji() }),
  ]);
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1100);

  // 색종이(confetti) 뿌리기
  const layer = el("div", { class: "confetti-layer" });
  document.body.appendChild(layer);
  const colors = ["#ff8c42", "#4dabf7", "#51cf66", "#9775fa", "#ff87ab", "#ffd43b", "#ff6b6b"];
  const N = 90;
  for (let i = 0; i < N; i++) {
    const piece = el("i", { class: "confetti" });
    const size = 8 + Math.random() * 8;
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.width = size + "px";
    piece.style.height = size * (0.5 + Math.random()) + "px";
    piece.style.background = colors[(Math.random() * colors.length) | 0];
    piece.style.setProperty("--dur", (1.6 + Math.random() * 1.4).toFixed(2) + "s");
    piece.style.setProperty("--delay", (Math.random() * 0.35).toFixed(2) + "s");
    piece.style.setProperty("--drift", ((Math.random() - 0.5) * 260).toFixed(0) + "px");
    piece.style.setProperty("--spin", (Math.random() * 720 - 360).toFixed(0) + "deg");
    if (Math.random() < 0.35) piece.style.borderRadius = "50%"; // 동그란 조각 섞기
    layer.appendChild(piece);
  }
  setTimeout(() => layer.remove(), 3400);
}
function pickWinEmoji() {
  const list = ["🎉", "🎊", "🌟", "🏆", "🥳", "✨", "🎯", "💯"];
  return list[(Math.random() * list.length) | 0];
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
