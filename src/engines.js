// ============ 게임 엔진 모음 (v2 · 제출 기반) ============
// 규칙:
//  - 정답/최소횟수/최소시간/모범경로/완전풀이를 '제출 전'에 절대 표시하지 않음
//  - 각 엔진은 controller.submit() 로 채점(정답 여부와 무관하게 해설은 셸이 공개)
//  - 조작·풀이 '과정'을 processTable 로 기록해 제출 후 모범 풀이와 비교
// controller = { submitLabel, undo?, restart?, submit() }
// submit() -> { isCorrect, partial?, notReady?, message?, answerText, processTable?, modelTable?, moves?, time?, detail? }
import { el, clear, beep, toast, shapeSVG } from "./ui.js";
import { balancesWith } from "./verification/mobileSolver.js";
import { classifyEuler, findEulerTrail } from "./verification/graphTrailSolver.js";
import { bestTake } from "./verification/strategySolver.js";
import { solveWaterJug } from "./verification/waterJugSolver.js";
import { hanoiMoves, minHanoi } from "./verification/hanoiSolver.js";
import { solveRiver } from "./verification/riverCrossingSolver.js";

export const ENGINES = {};
const T = (headers, rows) => ({ headers, rows });

// ---------- 1) deduce : 조건 카드 + 후보 제거 (A-01, A-02) ----------
ENGINES.deduce = function (host, problem) {
  const cfg = problem.config;
  let state = cfg.candidates.map(c => ({ ...c, alive: true }));
  const appliedLog = [];
  const condWrap = el("div", { class: "cond-cards" });
  const candWrap = el("div", { class: "cand" });

  function renderCands() {
    clear(candWrap);
    state.forEach(s => candWrap.appendChild(el("button", {
      class: "n" + (s.alive ? "" : " killed"), text: s.label, style: "width:auto;padding:0 10px",
      onclick: () => { s.alive = !s.alive; beep("click"); renderCands(); },
    })));
  }
  cfg.tests.forEach(tst => {
    const card = el("div", { class: "cond" }, [
      el("span", { class: "num", text: "규칙" }), el("span", { text: tst.text }),
      el("button", { class: "btn small secondary", text: "이 규칙으로 거르기", onclick: () => {
        let killed = 0; state.forEach(s => { if (s.alive && !tst.fn(s.v)) { s.alive = false; killed++; } });
        card.classList.add("used"); appliedLog.push(tst.text); beep(killed ? "good" : "click");
        toast(killed ? `${killed}개 후보를 지웠어요` : "지워진 후보 없음", killed ? "good" : ""); renderCands();
      } }),
    ]);
    condWrap.appendChild(card);
  });
  renderCands();
  host.append(el("p", { class: "status-line", text: "규칙을 적용해 안 맞는 후보를 지우고, 정답만 남긴 뒤 제출하세요." }),
    condWrap, el("div", { class: "status-line", text: "▼ 후보 (클릭해서 켜고 끄기)" }), candWrap);

  return {
    submitLabel: "선택 제출하기",
    restart: () => { state = cfg.candidates.map(c => ({ ...c, alive: true })); appliedLog.length = 0; document.querySelectorAll(".cond.used").forEach(c => c.classList.remove("used")); renderCands(); },
    submit: () => {
      const alive = state.filter(s => s.alive).map(s => s.label);
      const ans = cfg.answerKeys.slice();
      const isCorrect = alive.length === ans.length && ans.every(a => alive.includes(a));
      const partial = !isCorrect && ans.every(a => alive.includes(a));
      return {
        isCorrect, partial,
        answerText: `남긴 후보: ${alive.length ? alive.join(", ") : "(없음)"}`,
        processTable: T(["적용한 규칙 순서"], appliedLog.length ? appliedLog.map(x => [x]) : [["(규칙을 적용하지 않음)"]]),
        moves: appliedLog.length,
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 효율성: isCorrect ? Math.max(50, 100 - Math.abs(appliedLog.length - cfg.tests.length) * 10) : 40 },
      };
    },
  };
};

// ---------- 2) base : 진법 찾기 (A-03) ----------
ENGINES.base = function (host, problem) {
  const cfg = problem.config;
  let picked = null;
  const parseNum = (str, b) => [...str].reduce((a, ch) => a * b + parseInt(ch, 36), 0);
  const scratch = el("div", { class: "hint-box", style: "display:none" });
  const grid = el("div", { class: "opt-grid" });
  cfg.bases.forEach(b => {
    const btn = el("button", { class: "opt", text: `${b}진법`, onclick: () => {
      picked = b; grid.querySelectorAll(".opt").forEach(o => o.classList.remove("sel")); btn.classList.add("sel"); beep("click");
    } });
    grid.appendChild(btn);
  });
  const calcBtn = el("button", { class: "btn ghost small", text: "🧮 고른 진법으로 10진수 변환해 보기(계산기)", onclick: () => {
    if (!picked) { toast("먼저 진법을 골라 보세요", ""); return; }
    scratch.style.display = "block";
    const parts = [];
    cfg.equations.forEach(eq => { const m = eq.replace(/\s/g, "").match(/^(\w+)([+*\-])(\w+)=(\w+)$/); if (m) parts.push(`${eq}  ⇒  ${parseNum(m[1], picked)} ${m[2]} ${parseNum(m[3], picked)} = ? (오른쪽은 ${parseNum(m[4], picked)})`); });
    scratch.innerHTML = `<b>${picked}진법에서 각 수의 10진수 값:</b><br>` + parts.join("<br>") + "<br><i>맞는지 스스로 판단한 뒤 제출하세요.</i>";
  } });
  host.append(el("p", { class: "problem-text", text: cfg.equations.join("\n") }),
    el("p", { class: "status-line", text: "세 계산이 모두 성립하는 진법을 골라 제출하세요." }), grid, calcBtn, scratch);
  return {
    submitLabel: "선택 제출하기",
    restart: () => { picked = null; grid.querySelectorAll(".opt").forEach(o => o.classList.remove("sel")); scratch.style.display = "none"; },
    submit: () => {
      if (picked == null) return { notReady: true, message: "진법을 하나 고른 뒤 제출하세요." };
      const isCorrect = picked === cfg.answerBase;
      return { isCorrect, answerText: `내가 고른 진법: ${picked}진법`,
        processTable: T(["확인"], [[`${picked}진법으로 계산이 맞는지 검토함`]]),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40 } };
    },
  };
};

// ---------- 3) analogy : 그림 유추 (A-04,05,06) ----------
ENGINES.analogy = function (host, problem) {
  const cfg = problem.config;
  let picked = null;
  const wrap = el("div");
  wrap.appendChild(el("p", { class: "status-line", text: cfg.prompt }));
  if (cfg.mode === "proportion") wrap.appendChild(el("div", { class: "board" }, [shapeSVG(cfg.left.a, 70), el("b", { text: " → " }), shapeSVG(cfg.left.b, 70), el("b", { text: "   그렇다면   " }), shapeSVG(cfg.cShape, 70), el("b", { text: " → ?" })]));
  else if (cfg.mode === "next") { const row = el("div", { class: "board" }); cfg.series.forEach(s => row.appendChild(shapeSVG(s, 70))); row.appendChild(el("b", { text: " → ?" })); wrap.appendChild(row); }
  const grid = el("div", { class: "opt-grid" });
  cfg.options.forEach(o => {
    const cell = el("button", { class: "opt", "aria-label": "보기 " + o.id }, [shapeSVG(o.shape, 80), el("div", { text: o.id })]);
    cell.addEventListener("click", () => { picked = o.id; grid.querySelectorAll(".opt").forEach(c => c.classList.remove("sel")); cell.classList.add("sel"); beep("click"); });
    grid.appendChild(cell);
  });
  wrap.appendChild(grid); host.appendChild(wrap);
  return {
    submitLabel: "선택 제출하기",
    restart: () => { picked = null; grid.querySelectorAll(".opt").forEach(c => c.classList.remove("sel")); },
    submit: () => {
      if (picked == null) return { notReady: true, message: "보기를 하나 고른 뒤 제출하세요." };
      const isCorrect = picked === cfg.answer;
      return { isCorrect, answerText: `내가 고른 보기: ${picked}`,
        processTable: T(["고른 규칙 근거"], [[(cfg.ruleTags || []).join(", ") || "관찰"]]),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40 } };
    },
  };
};

// ---------- 4) sequence : 수열 유추 (A-07) ----------
ENGINES.sequence = function (host, problem) {
  const cfg = problem.config;
  const diffs = cfg.seq.slice(1).map((v, i) => v - cfg.seq[i]);
  const ruleWrap = el("div", { class: "cond-cards" });
  cfg.ruleOptions.forEach(r => ruleWrap.appendChild(el("label", { class: "cond" }, [el("input", { type: "radio", name: "rule", value: r.id }), el("span", { text: r.text })])));
  const input = el("input", { type: "number", class: "namebox", style: "max-width:180px;padding:8px", placeholder: "다음 수" });
  host.append(el("p", { class: "status-line", text: "수열: " + cfg.seq.join(", ") + ", ?" }),
    el("button", { class: "btn ghost small", text: "이웃한 수의 차이 보기", onclick: () => toast("차이: " + diffs.join(", "), "good") }),
    ruleWrap, el("div", { class: "board" }, [input]));
  return {
    submitLabel: "답 제출하기",
    restart: () => { input.value = ""; ruleWrap.querySelectorAll("input").forEach(i => i.checked = false); },
    submit: () => {
      if (input.value === "") return { notReady: true, message: "다음에 올 수를 입력한 뒤 제출하세요." };
      const val = Number(input.value);
      const picked = ruleWrap.querySelector("input:checked");
      const ruleOk = picked && cfg.ruleOptions.find(r => r.id === picked.value)?.correct;
      const isCorrect = val === cfg.answer;
      return { isCorrect, answerText: `내가 쓴 다음 수: ${val}` + (picked ? ` / 고른 규칙: ${cfg.ruleOptions.find(r => r.id === picked.value).text}` : " / 규칙 미선택"),
        processTable: T(["관찰"], [["차이 수열: " + diffs.join(", ")]]),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 설명: ruleOk ? 100 : 50 } };
    },
  };
};

// ---------- 5) hub : 축에는 어떤 수 (A-08) ----------
ENGINES.hub = function (host, problem) {
  const cfg = problem.config;
  let picked = null;
  const grid = el("div", { class: "opt-grid" });
  cfg.options.forEach(v => { const b = el("button", { class: "opt", text: String(v), onclick: () => { picked = v; grid.querySelectorAll(".opt").forEach(o => o.classList.remove("sel")); b.classList.add("sel"); beep("click"); } }); grid.appendChild(b); });
  host.append(el("p", { class: "status-line", text: "가운데 축에 들어갈 수를 골라 제출하세요 (1~13 중)." }), grid);
  function pairing(h) {
    const rest = []; for (let x = 1; x <= 13; x++) if (x !== h) rest.push(x);
    const total = rest.reduce((a, b) => a + b, 0); if (total % 6 !== 0) return null;
    const pair = total / 6, set = new Set(rest), used = new Set(), pairs = [];
    for (const v of rest) { if (used.has(v)) continue; const need = pair - v; if (need !== v && set.has(need) && !used.has(need)) { used.add(v); used.add(need); pairs.push([v, need]); } else return null; }
    return { pair, pairs };
  }
  return {
    submitLabel: "선택 제출하기",
    restart: () => { picked = null; grid.querySelectorAll(".opt").forEach(o => o.classList.remove("sel")); },
    submit: () => {
      if (picked == null) return { notReady: true, message: "축에 넣을 수를 고른 뒤 제출하세요." };
      const isCorrect = cfg.acceptable.includes(picked);
      const model = cfg.acceptable.map(h => { const p = pairing(h); return [`${h}`, p ? p.pair + h : "-", p ? p.pairs.map(x => `(${x[0]},${x[1]})`).join(" ") : "-"]; });
      return { isCorrect, answerText: `내가 고른 축: ${picked}`,
        processTable: T(["고른 축"], [[String(picked)]]),
        modelTable: T(["가능한 축", "지름 합", "살 짝짓기"], model),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40 } };
    },
  };
};

// ---------- 6) waterjug : 물항아리 (B-01) ----------
ENGINES.waterjug = function (host, problem) {
  const cfg = problem.config;
  let state, history, log, sel, pours;
  const board = el("div", { class: "board" });
  const status = el("div", { class: "status-line" });
  function init() { state = cfg.start.slice(); history = []; log = [["시작", "-", ...cfg.start]]; sel = -1; pours = 0; render(); }
  function render() {
    clear(board);
    cfg.caps.forEach((cap, i) => {
      const pct = Math.round((state[i] / cap) * 100);
      const glass = el("div", { class: "glass", style: `height:${cap * 16 + 20}px;width:80px` }, [el("div", { class: "water", style: `height:${pct}%` })]);
      board.appendChild(el("div", { class: "jug" + (sel === i ? " sel" : ""), role: "button", tabindex: "0", "aria-label": `${cfg.labels[i]} ${state[i]}리터`,
        onclick: () => pick(i), onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } } },
        [glass, el("div", { class: "cap", text: `${state[i]}/${cap}` }), el("div", { text: cfg.labels[i] })]));
    });
    status.textContent = `현재 상태 (${state.join(", ")}) · 부은 횟수 ${pours}`;
  }
  function pick(i) {
    if (sel === -1) { sel = i; render(); return; }
    if (sel === i) { sel = -1; render(); return; }
    const amt = Math.min(state[sel], cfg.caps[i] - state[i]);
    if (amt <= 0) { beep("bad"); toast("부을 수 없어요(빈 항아리이거나 가득 참)", "bad"); sel = -1; render(); return; }
    history.push(state.slice());
    state[sel] -= amt; state[i] += amt; pours++;
    log.push([`${pours}`, `${cfg.labels[sel]}→${cfg.labels[i]}`, ...state]);
    sel = -1; beep("click"); render();
  }
  host.append(el("p", { class: "status-line", text: "'주는 항아리 → 받는 항아리' 순으로 클릭해 부으세요. 목표를 만들면 제출!" }), board, status);
  init();
  return {
    submitLabel: "현재 풀이 제출하기",
    undo: () => { if (history.length) { state = history.pop(); pours = Math.max(0, pours - 1); log.pop(); sel = -1; render(); } },
    restart: init,
    submit: () => {
      const isCorrect = cfg.goal.every((g, k) => g === state[k]);
      const model = solveWaterJug(cfg.caps, cfg.start, cfg.goal);
      const modelRows = model.path.map((s, i) => [i === 0 ? "시작" : String(i), ...s]);
      return { isCorrect, moves: pours,
        answerText: `최종 상태 (${state.join(", ")}) · 부은 횟수 ${pours}` + (isCorrect ? ` (최소 ${cfg.minPours}번)` : ""),
        processTable: T(["단계", "동작", "8L", "5L", "3L"], log),
        modelTable: T(["단계", "8L", "5L", "3L"], modelRows),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 효율성: isCorrect ? (pours <= cfg.minPours ? 100 : Math.max(40, 100 - (pours - cfg.minPours) * 12)) : 40 } };
    },
  };
};

// ---------- 7) orderSteps : 절차 순서 맞추기 (B-02) ----------
ENGINES.orderSteps = function (host, problem) {
  const cfg = problem.config;
  const pool = cfg.steps.slice().sort(() => Math.random() - 0.5);
  let chosen = [];
  const poolWrap = el("div", { class: "cond-cards" }), seqWrap = el("div", { class: "cond-cards" });
  function render() {
    clear(poolWrap); clear(seqWrap);
    pool.forEach(s => { if (chosen.includes(s.id)) return; poolWrap.appendChild(el("div", { class: "cond" }, [el("span", { text: s.text }), el("button", { class: "btn small", text: "▼ 넣기", onclick: () => { chosen.push(s.id); beep("click"); render(); } })])); });
    chosen.forEach((id, idx) => { const s = cfg.steps.find(x => x.id === id); seqWrap.appendChild(el("div", { class: "cond used" }, [el("span", { class: "num", text: String(idx + 1) }), el("span", { text: s.text }), el("button", { class: "btn small ghost", text: "빼기", onclick: () => { chosen.splice(idx, 1); render(); } })])); });
  }
  host.append(el("p", { class: "status-line", text: "행동 카드를 올바른 순서로 배열한 뒤 제출하세요." }), el("h4", { text: "▤ 카드 보관함" }), poolWrap, el("h4", { text: "▶ 내가 만든 순서" }), seqWrap);
  render();
  return {
    submitLabel: "순서 제출하기",
    restart: () => { chosen = []; render(); },
    submit: () => {
      const isCorrect = JSON.stringify(chosen) === JSON.stringify(cfg.correctOrder);
      return { isCorrect,
        answerText: "내가 배열한 순서: " + (chosen.length ? chosen.map((id, i) => `${i + 1}) ${cfg.steps.find(s => s.id === id).text}`).join("  ") : "(비어 있음)"),
        processTable: T(["내 순서"], chosen.length ? chosen.map((id, i) => [`${i + 1}. ${cfg.steps.find(s => s.id === id).text}`]) : [["(없음)"]]),
        modelTable: T(["모범 순서"], cfg.correctOrder.map((id, i) => [`${i + 1}. ${cfg.steps.find(s => s.id === id).text}`])),
        detail: { 추상화: isCorrect ? 90 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 설명: isCorrect ? 90 : 40 } };
    },
  };
};

// ---------- 8) mobile : 모빌 평형 (B-03, B-04) ----------
ENGINES.mobile = function (host, problem) {
  const cfg = problem.config;
  let picked = null;
  const svg = buildMobileSVG(cfg.tree);
  const grid = el("div", { class: "opt-grid" });
  cfg.options.forEach(v => { const b = el("button", { class: "opt", text: `${v}g`, onclick: () => { picked = v; grid.querySelectorAll(".opt").forEach(o => o.classList.remove("sel")); b.classList.add("sel"); setUnknown(svg, v); beep("click"); } }); grid.appendChild(b); });
  host.append(svg, el("p", { class: "status-line", text: "힘 = 거리 × 무게. '?' 자리 추를 골라 평형을 맞춘 뒤 제출하세요." }), grid);
  return {
    submitLabel: "선택 제출하기",
    restart: () => { picked = null; grid.querySelectorAll(".opt").forEach(o => o.classList.remove("sel")); setUnknown(svg, "?"); },
    submit: () => {
      if (picked == null) return { notReady: true, message: "'?' 자리 추를 고른 뒤 제출하세요." };
      const isCorrect = balancesWith(cfg.tree, picked);
      return { isCorrect, answerText: `내가 고른 추: ? = ${picked}g`,
        processTable: T(["선택"], [[`? = ${picked}g`]]),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40 } };
    },
  };
};
function buildMobileSVG(tree) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "mobile-svg"); svg.setAttribute("viewBox", "0 0 520 175");
  const mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const vline = (x, y1, y2, w) => svg.appendChild(mk("line", { x1: x, y1: y1, x2: x, y2: y2, stroke: "#495057", "stroke-width": w || 2 }));
  // (x,y): 이 노드가 '매달리는' 윗점. 항상 그 점에서 아래로 연결선을 그린다.
  function draw(node, x, y, span) {
    if (node.type === "leaf") {
      const cy = y + 34;
      vline(x, y, cy - 18);                                   // 매다는 줄
      svg.appendChild(mk("circle", { cx: x, cy: cy, r: 18, fill: node.unknown ? "#ffd43b" : "#ff8c42", stroke: "#7a5230", "stroke-width": 2 }));
      const t = mk("text", { x: x, y: cy + 5, "text-anchor": "middle", "font-weight": "800", "font-size": "15" });
      t.textContent = node.unknown ? "?" : node.w; if (node.unknown) t.setAttribute("data-unknown", "1");
      svg.appendChild(t); return;
    }
    const barY = y + 20;
    vline(x, y, barY);                                        // 부모점 → 이 막대(가운데) 연결선
    const lx = x - span, rx = x + span;
    svg.appendChild(mk("line", { x1: lx, y1: barY, x2: rx, y2: barY, stroke: "#343a40", "stroke-width": 5 }));  // 막대
    const dl = mk("text", { x: (x + lx) / 2, y: barY - 7, "text-anchor": "middle", "font-size": "13", "font-weight": "700" }); dl.textContent = "거리 " + node.left.dist;
    const dr = mk("text", { x: (x + rx) / 2, y: barY - 7, "text-anchor": "middle", "font-size": "13", "font-weight": "700" }); dr.textContent = "거리 " + node.right.dist;
    svg.append(dl, dr);
    draw(node.left.node, lx, barY, span / 2);                 // 왼쪽 끝에서 자식이 매달림
    draw(node.right.node, rx, barY, span / 2);                // 오른쪽 끝에서 자식이 매달림
  }
  draw(tree, 260, 12, 130);
  return svg;
}
function setUnknown(svg, v) { const t = svg.querySelector('text[data-unknown="1"]'); if (t) t.textContent = (v === "?" ? "?" : v + "g"); }

// ---------- 9) balance : 저울 동전 (B-05, B-06) ----------
ENGINES.balance = function (host, problem) {
  const cfg = problem.config, N = cfg.n;
  const coins = Array.from({ length: N }, (_, i) => i + 1);
  let left = [], right = [], weighings = 0, suspect = null, log = [];
  const weight = id => (id === cfg.oddIndex ? (cfg.heavier ? 1.1 : 0.9) : 1);
  const pans = el("div", { class: "pans" }), tray = el("div", { class: "board" }), result = el("div", { class: "status-line" }), status = el("div", { class: "status-line" });
  function render() {
    clear(pans); clear(tray);
    const panEl = (arr, name) => { const p = el("div", { class: "pan" }, [el("h4", { text: name })]); arr.forEach(id => p.appendChild(el("span", { class: "coin", text: id, onclick: () => remove(id) }))); return p; };
    pans.append(panEl(left, "왼쪽 접시"), panEl(right, "오른쪽 접시"));
    coins.forEach(id => { if (left.includes(id) || right.includes(id)) return; tray.appendChild(el("span", { class: "coin" + (suspect === id ? " sel" : ""), text: id, title: "클릭: 접시에 올리기 / 다시 클릭 팝업", onclick: () => addMenu(id), oncontextmenu: e => { e.preventDefault(); suspect = id; render(); } })); });
    status.textContent = `저울질 ${weighings}번 · 지목: ${suspect ?? "없음"} · (범인 지목: 보관함 동전을 길게/우클릭)`;
  }
  function addMenu(id) { if (left.length <= right.length) left.push(id); else right.push(id); beep("click"); render(); }
  function remove(id) { left = left.filter(x => x !== id); right = right.filter(x => x !== id); render(); }
  const weighBtn = el("button", { class: "btn secondary", text: "⚖ 저울질!", onclick: () => {
    if (!left.length || !right.length) { toast("양쪽 접시에 동전을 올리세요", "bad"); return; }
    weighings++; const lw = left.reduce((a, id) => a + weight(id), 0), rw = right.reduce((a, id) => a + weight(id), 0);
    const tilt = lw > rw ? "왼쪽 내려감" : lw < rw ? "오른쪽 내려감" : "평형";
    log.push([`${weighings}`, `[${left.join(",")}] vs [${right.join(",")}]`, tilt]); result.textContent = `결과: ${tilt}`; beep("click");
  } });
  const clearBtn = el("button", { class: "btn ghost", text: "접시 비우기", onclick: () => { left = []; right = []; render(); } });
  const pickBtn = el("button", { class: "btn ghost", text: "🎯 범인 지목(번호 입력)", onclick: () => { const v = Number(prompt(`무게가 다른 동전 번호(1~${N})`)); if (v >= 1 && v <= N) { suspect = v; render(); } } });
  host.append(el("p", { class: "status-line", text: "3개씩 나눠 저울질로 후보를 좁히고, 범인 동전을 지목한 뒤 제출하세요." }),
    pans, el("div", { style: "text-align:center;margin:6px" }, [weighBtn, el("span", { text: " " }), clearBtn, el("span", { text: " " }), pickBtn]), result, el("h4", { text: "동전 보관함" }), tray, status);
  render();
  return {
    submitLabel: "현재 풀이 제출하기",
    restart: () => { left = []; right = []; weighings = 0; suspect = null; log = []; result.textContent = ""; render(); },
    submit: () => {
      if (suspect == null) return { notReady: true, message: "범인 동전을 지목한 뒤 제출하세요." };
      const isCorrect = suspect === cfg.oddIndex;
      return { isCorrect, moves: weighings,
        answerText: `내가 지목한 동전: ${suspect}번 · 저울질 ${weighings}번`,
        processTable: T(["회차", "왼 vs 오", "결과"], log.length ? log : [["-", "-", "저울질 안 함"]]),
        modelTable: T(["효율 기준"], [[`동전 ${N}개는 3등분으로 최소 ${cfg.optimalWeighings}번이면 특정 가능`]]),
        detail: { 추상화: isCorrect ? 90 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 효율성: isCorrect ? (weighings <= cfg.optimalWeighings ? 100 : Math.max(40, 100 - (weighings - cfg.optimalWeighings) * 20)) : 40 } };
    },
  };
};

// ---------- 10) hanoi : 하노이 타워 (B-07) ----------
ENGINES.hanoi = function (host, problem) {
  const cfg = problem.config;
  let disks = cfg.defaultDisks, pegs, sel, moves, history, log;
  const colors = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc"];
  const board = el("div", { class: "hanoi" }), status = el("div", { class: "status-line" });
  function init() { pegs = { A: [], B: [], C: [] }; for (let i = disks; i >= 1; i--) pegs.A.push(i); sel = null; moves = 0; history = []; log = []; render(); }
  function render() {
    clear(board);
    ["A", "B", "C"].forEach(name => {
      const peg = el("div", { class: "peg" + (sel === name ? " sel" : ""), role: "button", tabindex: "0", "aria-label": name + " 기둥", onclick: () => pick(name), onkeydown: e => { if (e.key === "Enter") pick(name); } }, [el("div", { class: "rod" }), el("div", { class: "base" })]);
      pegs[name].forEach(d => peg.appendChild(el("div", { class: "disk", style: `width:${20 + d * 22}px;background:${colors[(d - 1) % colors.length]}`, text: d })));
      board.appendChild(el("div", {}, [peg, el("div", { style: "text-align:center;font-weight:800", text: name })]));
    });
    status.textContent = `원반 ${disks}개 · 이동 ${moves}번`;
  }
  function pick(name) {
    if (sel === null) { if (!pegs[name].length) { beep("bad"); return; } sel = name; render(); return; }
    if (sel === name) { sel = null; render(); return; }
    const disk = pegs[sel][pegs[sel].length - 1], top = pegs[name][pegs[name].length - 1];
    if (top && top < disk) { beep("bad"); toast("큰 원반을 작은 원반 위에 놓을 수 없어요!", "bad"); sel = null; render(); return; }
    history.push(JSON.stringify(pegs)); pegs[name].push(pegs[sel].pop()); moves++; log.push([`${moves}`, `원반 ${disk}`, `${sel} → ${name}`]); sel = null; beep("click"); render();
  }
  const modeWrap = el("div", { class: "board" });
  cfg.modes.forEach(m => modeWrap.appendChild(el("button", { class: "btn small ghost", text: `원반 ${m}개`, onclick: () => { disks = m; init(); } })));
  host.append(el("p", { class: "status-line", text: "'옮길 기둥 → 놓을 기둥' 순으로 클릭해 모든 원반을 C로! 완성하면 제출." }), modeWrap, board, status);
  init();
  return {
    submitLabel: "현재 풀이 제출하기",
    undo: () => { if (history.length) { pegs = JSON.parse(history.pop()); moves = Math.max(0, moves - 1); log.pop(); sel = null; render(); } },
    restart: init,
    submit: () => {
      const isCorrect = pegs.C.length === disks;
      const min = minHanoi(disks);
      return { isCorrect, moves,
        answerText: `원반 ${disks}개 · 내 이동 ${moves}번` + (isCorrect ? ` (최소 ${min}번, 차이 ${moves - min})` : " · 아직 미완성"),
        processTable: T(["번호", "원반", "이동"], log.length ? log : [["-", "-", "이동 없음"]]),
        modelTable: T(["최소 이동"], [[`원반 ${disks}개 최소 = 2^${disks}−1 = ${min}번`]]),
        detail: { 추상화: isCorrect ? 90 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 효율성: isCorrect ? (moves <= min ? 100 : Math.max(40, 100 - (moves - min) * 8)) : 40 } };
    },
  };
};

// ---------- 11) river : 농부의 강 건너기 (B-08) ----------
ENGINES.river = function (host, problem) {
  const cfg = problem.config;
  let farSide, farmerSide, crossings, history, log, everConflict;
  const status = el("div", { class: "status-line" }), board = el("div");
  function init() { farSide = new Set(); farmerSide = "near"; crossings = 0; history = []; log = []; everConflict = false; render(); }
  function itemsOn(side) { return cfg.items.filter(it => (side === "far") === farSide.has(it.id)); }
  function conflictOn(side) { const ids = itemsOn(side).map(i => i.id); return cfg.conflicts.some(([a, b]) => ids.includes(a) && ids.includes(b)); }
  function render() {
    clear(board);
    const bank = (side, label) => { const b = el("div", { class: "pan", style: "min-height:120px" }, [el("h4", { text: label + (farmerSide === side ? " 🧑\u200d🌾" : "") })]); itemsOn(side).forEach(it => b.appendChild(el("button", { class: "opt", style: "display:inline-block;width:auto;margin:3px", disabled: farmerSide === side ? null : "true", text: `${it.emoji} ${it.name}`, onclick: () => cross(it.id) }))); return b; };
    board.append(el("div", { class: "pans" }, [bank("near", "이쪽 강가"), bank("far", "건너편")]), el("div", { style: "text-align:center;margin-top:8px" }, [el("button", { class: "btn secondary", text: "🚣 농부만 건너기", onclick: () => cross(null) })]));
    status.textContent = `건넌 횟수 ${crossings} · 농부: ${farmerSide === "near" ? "이쪽" : "건너편"}`;
  }
  function cross(itemId) {
    if (itemId) { const itemSide = farSide.has(itemId) ? "far" : "near"; if (itemSide !== farmerSide) { toast("농부와 같은 쪽 것만 태워요", "bad"); return; } }
    history.push({ far: new Set(farSide), farmer: farmerSide, c: crossings, ec: everConflict });
    if (itemId) { if (farSide.has(itemId)) farSide.delete(itemId); else farSide.add(itemId); }
    farmerSide = farmerSide === "near" ? "far" : "near"; crossings++;
    const carried = itemId ? cfg.items.find(i => i.id === itemId).name : "농부만";
    const emptySide = farmerSide === "near" ? "far" : "near";
    const bad = conflictOn(emptySide); if (bad) everConflict = true;
    log.push([`${crossings}`, carried, farmerSide === "far" ? "→ 건너편" : "← 이쪽", bad ? "⚠ 위험 발생" : "안전"]);
    beep(bad ? "bad" : "click"); if (bad) toast("농부 없는 쪽에 위험 조합이 생겼어요(되돌리기 가능)", "bad");
    render();
  }
  host.append(el("p", { class: "status-line", text: "농부와 하나만 태워 강을 건너요. 모두 건너면 제출! (늑대+염소 / 염소+배추 단둘이 남으면 위험)" }), board, status);
  init();
  return {
    submitLabel: "현재 풀이 제출하기",
    undo: () => { if (history.length) { const h = history.pop(); farSide = h.far; farmerSide = h.farmer; crossings = h.c; everConflict = h.ec; log.pop(); render(); } },
    restart: init,
    submit: () => {
      const allFar = farSide.size === cfg.items.length && farmerSide === "far";
      const isCorrect = allFar && !everConflict;
      const model = solveRiver(cfg.items.map(i => i.id), cfg.conflicts);
      const nameOf = id => id === "농부만" ? "농부만" : (cfg.items.find(i => i.id === id)?.name || id);
      return { isCorrect, moves: crossings,
        answerText: `건넌 횟수 ${crossings}` + (isCorrect ? ` (최소 ${cfg.minCrossings}번, 모두 안전)` : everConflict ? " · 도중에 위험 발생" : " · 아직 다 건너지 못함"),
        processTable: T(["번호", "태운 것", "방향", "안전"], log.length ? log : [["-", "-", "-", "이동 없음"]]),
        modelTable: T(["모범 순서(최소)"], model.path.map((c, i) => [`${i + 1}. ${nameOf(c)} 이동`])),
        detail: { 추상화: isCorrect ? 90 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 효율성: isCorrect ? (crossings <= cfg.minCrossings ? 100 : Math.max(40, 100 - (crossings - cfg.minCrossings) * 12)) : 40 } };
    },
  };
};

// ---------- 12) maxpath : 최대의 길 (B-09) ----------
ENGINES.maxpath = function (host, problem) {
  const cfg = problem.config, R = cfg.grid.length, C = cfg.grid[0].length;
  let path, sum;
  const status = el("div", { class: "status-line" });
  const gridEl = el("div", { class: "gridpath", style: `grid-template-columns:repeat(${C},1fr)` });
  function init() { path = [[cfg.start[0], cfg.start[1]]]; sum = cfg.grid[cfg.start[0]][cfg.start[1]]; render(); }
  const inPath = (r, c) => path.some(p => p[0] === r && p[1] === c);
  function render() {
    clear(gridEl);
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const cur = path[path.length - 1], isCur = cur[0] === r && cur[1] === c;
      gridEl.appendChild(el("div", { class: "gcell" + (inPath(r, c) ? " on" : "") + (isCur ? " cur" : ""), text: cfg.grid[r][c], role: "button", tabindex: "0", onclick: () => step(r, c), onkeydown: e => { if (e.key === "Enter") step(r, c); } }));
    }
    status.textContent = `현재 합 ${sum} · 칸 수 ${path.length}`;
  }
  function step(r, c) {
    const cur = path[path.length - 1];
    if (path.length >= 2) { const prev = path[path.length - 2]; if (prev[0] === r && prev[1] === c) { sum -= cfg.grid[cur[0]][cur[1]]; path.pop(); beep("click"); render(); return; } }
    const isUp = r === cur[0] - 1 && c === cur[1], isRight = r === cur[0] && c === cur[1] + 1;
    if (!isUp && !isRight) { toast("위 또는 오른쪽 칸으로만 이동!", "bad"); return; }
    path.push([r, c]); sum += cfg.grid[r][c]; beep("click"); render();
  }
  // 모범 경로(역추적)
  function modelPath() {
    const best = Array.from({ length: R }, () => new Array(C).fill(-Infinity));
    best[R - 1][0] = cfg.grid[R - 1][0];
    for (let r = R - 1; r >= 0; r--) for (let c = 0; c < C; c++) { if (r === R - 1 && c === 0) continue; const d = r + 1 < R ? best[r + 1][c] : -Infinity, l = c - 1 >= 0 ? best[r][c - 1] : -Infinity; const pv = Math.max(d, l); if (pv > -Infinity) best[r][c] = pv + cfg.grid[r][c]; }
    let r = 0, c = C - 1; const rev = [];
    while (!(r === R - 1 && c === 0)) { rev.push(cfg.grid[r][c]); const d = r + 1 < R ? best[r + 1][c] : -Infinity, l = c - 1 >= 0 ? best[r][c - 1] : -Infinity; if (d >= l) r++; else c--; }
    rev.push(cfg.grid[R - 1][0]); return rev.reverse();
  }
  host.append(el("p", { class: "status-line", text: "왼쪽 아래→위/오른쪽으로만 이동해 오른쪽 위까지! 합을 크게. 도착하면 제출.(마지막 칸 다시 눌러 되돌리기)" }), gridEl, status);
  init();
  return {
    submitLabel: "이 경로 제출하기",
    undo: () => { if (path.length > 1) { const last = path[path.length - 1]; sum -= cfg.grid[last[0]][last[1]]; path.pop(); render(); } },
    restart: init,
    submit: () => {
      const cur = path[path.length - 1], reached = cur[0] === cfg.end[0] && cur[1] === cfg.end[1];
      const isCorrect = reached && sum === cfg.maxSum;
      const partial = reached && !isCorrect;
      return { isCorrect, partial,
        answerText: `내 경로 합 ${sum}` + (reached ? "" : " · 아직 도착 못함") + (isCorrect ? ` (최대 ${cfg.maxSum})` : ""),
        processTable: T(["순서", "칸 값", "누적 합"], (() => { let s = 0; return path.map((p, i) => { s += cfg.grid[p[0]][p[1]]; return [`${i + 1}`, cfg.grid[p[0]][p[1]], s]; }); })()),
        modelTable: T(["모범(최대) 경로 값"], [[modelPath().join(" → ") + ` = ${cfg.maxSum}`]]),
        detail: { 추상화: isCorrect ? 90 : 40, 알고리즘정확성: isCorrect ? 100 : (reached ? 60 : 40), 효율성: isCorrect ? 100 : 40 } };
    },
  };
};

// ---------- 13) iterate : 변수·반복 표 (C-01 검색, C-02 누적) ----------
ENGINES.iterate = function (host, problem) {
  return problem.config.mode === "search" ? iterateSearch(host, problem) : iterateAccumulate(host, problem);
};
function iterateSearch(host, problem) {
  const cfg = problem.config;
  let picked = null;
  const table = el("table", { style: "width:100%;border-collapse:collapse;background:#fff" });
  const thead = el("tr"); cfg.columns.forEach(c => thead.appendChild(el("th", { style: "border:1px solid #e6ddca;padding:6px;background:#ff8c42;color:#fff", text: c }))); thead.appendChild(el("th", { style: "border:1px solid #e6ddca;padding:6px", text: "선택" })); table.appendChild(thead);
  cfg.candidates.forEach(N => {
    const row = cfg.row(N), tr = el("tr");
    row.forEach(v => tr.appendChild(el("td", { style: "border:1px solid #e6ddca;padding:6px;text-align:center", text: String(v) })));
    const btn = el("button", { class: "btn small", text: "이 값 선택", onclick: () => { picked = N; table.querySelectorAll("tr").forEach(r => r.style.background = ""); tr.style.background = "#fff3e6"; beep("click"); } });
    tr.appendChild(el("td", { style: "border:1px solid #e6ddca;padding:6px;text-align:center" }, [btn])); table.appendChild(tr);
  });
  host.append(el("p", { class: "status-line", text: `${cfg.varLabel}를 바꿔가며 표를 보고, '내 합계=친구 합계'가 되는 값을 골라 제출하세요. (짝수만!)` }), table);
  return {
    submitLabel: "답 제출하기",
    restart: () => { picked = null; table.querySelectorAll("tr").forEach(r => r.style.background = ""); },
    submit: () => {
      if (picked == null) return { notReady: true, message: "표에서 값을 하나 고른 뒤 제출하세요." };
      const isCorrect = picked === cfg.answer; const r = cfg.row(cfg.answer);
      return { isCorrect, answerText: `내가 고른 값: ${picked}`,
        processTable: T(cfg.columns, [cfg.row(picked).map(String)]),
        modelTable: T(cfg.columns, [r.map(String)]),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40 } };
    },
  };
}
function iterateAccumulate(host, problem) {
  const cfg = problem.config;
  let day = 1, daily = cfg.initDaily, total = cfg.initTotal, log = [[1, cfg.initDaily, cfg.initTotal]];
  const table = el("table", { style: "width:100%;border-collapse:collapse;background:#fff" });
  const head = el("tr"); cfg.columns.forEach(c => head.appendChild(el("th", { style: "border:1px solid #e6ddca;padding:6px;background:#ff8c42;color:#fff", text: c }))); table.appendChild(head);
  const status = el("div", { class: "status-line" });
  function addRow(a, b, c) { const tr = el("tr");[a, b, c].forEach(v => tr.appendChild(el("td", { style: "border:1px solid #e6ddca;padding:6px;text-align:center", text: String(v) }))); table.appendChild(tr); }
  addRow(1, daily, total);
  const input = el("input", { type: "number", class: "namebox", style: "max-width:180px;padding:8px", placeholder: "총합" });
  const nextBtn = el("button", { class: "btn secondary", text: "▶ 다음 날 계산", onclick: () => {
    if (day >= cfg.days) { toast("12일까지 계산했어요. 총합을 입력해 제출하세요.", "good"); return; }
    day++; daily += day; total += daily; log.push([day, daily, total]); addRow(day, daily, total); beep("click"); status.textContent = `${day}일까지 진행`;
  } });
  host.append(el("p", { class: "status-line", text: "'다음 날'을 눌러 누적 규칙으로 표를 채우고, 12일까지 총합을 입력해 제출하세요." }), table, el("div", { style: "text-align:center;margin:8px" }, [nextBtn]), status, el("div", { class: "board" }, [input]));
  return {
    submitLabel: "답 제출하기",
    restart: () => { day = 1; daily = cfg.initDaily; total = cfg.initTotal; log = [[1, cfg.initDaily, cfg.initTotal]]; clear(table); table.appendChild(head); addRow(1, daily, total); input.value = ""; status.textContent = ""; },
    submit: () => {
      if (input.value === "") return { notReady: true, message: "12일까지의 총합을 입력한 뒤 제출하세요." };
      const isCorrect = Number(input.value) === cfg.answer;
      return { isCorrect, moves: day, answerText: `내가 쓴 총합: ${input.value} (${day}일까지 계산함)`,
        processTable: T(cfg.columns, log.map(r => r.map(String))),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 효율성: day >= cfg.days ? 100 : 70 } };
    },
  };
}

// ---------- 14) graph : 그래프 (C-03 분석, C-04 한붓그리기) ----------
ENGINES.graph = function (host, problem) {
  return problem.config.mode === "analyze" ? graphAnalyze(host, problem) : graphTrail(host, problem);
};
function graphSVG(cfg) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "graph-svg"); svg.setAttribute("viewBox", "0 0 520 340");
  const pos = {}; cfg.nodes.forEach(n => pos[n.id] = n); const seen = {};
  cfg.edges.forEach(([u, v], idx) => {
    const kk = [u, v].sort().join("-"); seen[kk] = (seen[kk] || 0) + 1; const off = (seen[kk] - 1) * 22;
    const a = pos[u], b = pos[v], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.y - a.y, dy = a.x - b.x, len = Math.hypot(dx, dy) || 1;
    const cx = mx + (dx / len) * off, cy = my + (dy / len) * off;
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`); p.setAttribute("fill", "none"); p.setAttribute("stroke", "#adb5bd"); p.setAttribute("stroke-width", 4); p.setAttribute("data-edge", idx); svg.appendChild(p);
  });
  cfg.nodes.forEach(n => {
    const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", n.x); c.setAttribute("cy", n.y); c.setAttribute("r", 26); c.setAttribute("fill", "#4dabf7"); c.setAttribute("stroke", "#1c7ed6"); c.setAttribute("stroke-width", 3); c.setAttribute("class", "node"); c.setAttribute("data-node", n.id);
    const t = document.createElementNS(NS, "text"); t.setAttribute("x", n.x); t.setAttribute("y", n.y + 5); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-weight", "800"); t.setAttribute("fill", "#fff"); t.textContent = n.id;
    const lbl = document.createElementNS(NS, "text"); lbl.setAttribute("x", n.x); lbl.setAttribute("y", n.y + 44); lbl.setAttribute("text-anchor", "middle"); lbl.setAttribute("font-size", "12"); lbl.textContent = n.name;
    svg.append(c, t, lbl);
  });
  return svg;
}
function graphAnalyze(host, problem) {
  const cfg = problem.config; const svg = graphSVG(cfg); let choice = null; const seen = new Set();
  const out = el("div", { class: "status-line" });
  svg.querySelectorAll(".node").forEach(node => node.addEventListener("click", () => { const id = node.getAttribute("data-node"); seen.add(id); node.setAttribute("fill", "#51cf66"); out.textContent = `${id}의 차수 = ${cfg.degrees[id]}` + (cfg.degrees[id] % 2 ? " (홀수)" : " (짝수)"); }));
  const btns = el("div", { class: "board" }, [
    el("button", { class: "btn secondary", text: "제자리로 돌아오는 길이 있다(가능)", onclick: () => { choice = "possible"; out.textContent = "선택: 가능"; } }),
    el("button", { class: "btn secondary", text: "불가능하다", onclick: () => { choice = "impossible"; out.textContent = "선택: 불가능"; } }),
  ]);
  host.append(el("p", { class: "status-line", text: "점을 클릭해 차수를 확인하고, 한붓그리기(제자리 복귀)가 가능한지 골라 제출하세요." }), svg, out, btns);
  return {
    submitLabel: "선택 제출하기",
    restart: () => { choice = null; out.textContent = ""; svg.querySelectorAll(".node").forEach(n => n.setAttribute("fill", "#4dabf7")); },
    submit: () => {
      if (!choice) return { notReady: true, message: "'가능/불가능'을 고른 뒤 제출하세요." };
      const correctChoice = cfg.answer === "impossible" ? "impossible" : "possible";
      const isCorrect = choice === correctChoice;
      return { isCorrect, answerText: `내 판단: ${choice === "impossible" ? "불가능" : "가능"}`,
        processTable: T(["점", "차수", "홀짝"], cfg.nodes.map(n => [n.id, cfg.degrees[n.id], cfg.degrees[n.id] % 2 ? "홀수" : "짝수"])),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 설명: isCorrect ? 90 : 40 } };
    },
  };
}
function graphTrail(host, problem) {
  const cfg = problem.config; const svg = graphSVG(cfg); const used = new Set(); let cur = null; const order = [];
  const out = el("div", { class: "status-line" });
  const edgeList = cfg.edges.map((e, i) => ({ i, u: e[0], v: e[1] }));
  function hl() { svg.querySelectorAll("[data-edge]").forEach(p => p.setAttribute("stroke", used.has(+p.getAttribute("data-edge")) ? "#51cf66" : "#adb5bd")); svg.querySelectorAll(".node").forEach(n => n.setAttribute("fill", n.getAttribute("data-node") === cur ? "#ff8c42" : "#4dabf7")); }
  svg.querySelectorAll(".node").forEach(node => node.addEventListener("click", () => {
    const id = node.getAttribute("data-node");
    if (cur === null) { cur = id; order.push(id); out.textContent = `출발점 ${id}`; hl(); return; }
    const e = edgeList.find(x => !used.has(x.i) && ((x.u === cur && x.v === id) || (x.v === cur && x.u === id)));
    if (!e) { beep("bad"); toast("그 점으로 가는 '안 지난 선'이 없어요.", "bad"); return; }
    used.add(e.i); cur = id; order.push(id); beep("click"); hl(); out.textContent = `지난 선 ${used.size}/${cfg.totalEdges}`;
  }));
  host.append(el("p", { class: "status-line", text: "점을 클릭해 선을 따라 이어요. 모든 선을 한 번씩 지난 뒤 제출!" }), svg, out, el("button", { class: "btn ghost small", text: "다시 그리기", onclick: () => { used.clear(); cur = null; order.length = 0; out.textContent = ""; hl(); } }));
  hl();
  return {
    submitLabel: "이 경로 제출하기",
    restart: () => { used.clear(); cur = null; order.length = 0; out.textContent = ""; hl(); },
    submit: () => {
      const isCorrect = used.size === cfg.totalEdges;
      const trail = findEulerTrail(cfg.nodes.map(n => n.id), cfg.edges);
      return { isCorrect, moves: used.size,
        answerText: `내 경로: ${order.join(" → ") || "(없음)"} · 지난 선 ${used.size}/${cfg.totalEdges}`,
        processTable: T(["내가 지난 점 순서"], [[order.join(" → ") || "(없음)"]]),
        modelTable: T(["모범 한붓그리기 경로"], [[trail ? trail.join(" → ") : "경로 없음"]]),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 효율성: isCorrect ? 100 : 40 } };
    },
  };
}

// ---------- 15) bridge : 다리 건너기 (C-05) ----------
ENGINES.bridge = function (host, problem) {
  const cfg = problem.config;
  let side, torch, time, history, sel, log;
  function init() { side = {}; cfg.people.forEach(p => side[p.id] = "near"); torch = "near"; time = 0; history = []; sel = new Set(); log = []; render(); }
  const status = el("div", { class: "status-line" }), board = el("div");
  function render() {
    clear(board);
    const bankEl = (bank, label) => { const b = el("div", { class: "pan", style: "min-height:120px" }, [el("h4", { text: label + (torch === bank ? " 🔦" : "") })]); cfg.people.filter(p => side[p.id] === bank).forEach(p => { const on = sel.has(p.id); b.appendChild(el("button", { class: "opt" + (on ? " sel" : ""), style: "display:inline-block;width:auto;margin:3px", disabled: torch === bank ? null : "true", text: `${p.emoji} ${p.name}(${p.time}분)`, onclick: () => { if (on) sel.delete(p.id); else { if (sel.size >= cfg.boatMax) { toast("최대 2명!", "bad"); return; } sel.add(p.id); } render(); } })); }); return b; };
    board.append(el("div", { class: "pans" }, [bankEl("near", "출발 강가"), bankEl("far", "건너편")]), el("div", { style: "text-align:center;margin-top:8px" }, [el("button", { class: "btn secondary", text: torch === "near" ? "🚶 건너가기 →" : "← 돌아오기", onclick: go })]));
    status.textContent = `누적 시간 ${time}분 · 손전등: ${torch === "near" ? "출발쪽" : "건너편"}`;
  }
  function go() {
    if (sel.size === 0) { toast("건널 사람을 고르세요", "bad"); return; }
    history.push({ side: { ...side }, torch, time, log: log.slice() });
    const movers = [...sel], t = Math.max(...movers.map(id => cfg.people.find(p => p.id === id).time));
    movers.forEach(id => side[id] = torch === "near" ? "far" : "near"); time += t;
    log.push([`${log.length + 1}`, movers.map(id => cfg.people.find(p => p.id === id).name).join(","), torch === "near" ? "→" : "←", `${t}분`, `${time}분`]);
    torch = torch === "near" ? "far" : "near"; sel = new Set(); beep("click"); render();
  }
  host.append(el("p", { class: "status-line", text: "손전등 있는 쪽에서 1~2명을 골라 건너요(둘이면 느린 사람 시간). 모두 건너면 제출!" }), board, status);
  init();
  function modelSeq() {
    const s = cfg.people.slice().sort((a, b) => a.time - b.time); // fast..slow
    if (s.length < 4) return [["-"]];
    const [f1, f2, s1, s2] = s;
    return [[`${f1.name},${f2.name} → (${f2.time}분)`], [`${f1.name} ← (${f1.time}분)`], [`${s1.name},${s2.name} → (${s2.time}분)`], [`${f2.name} ← (${f2.time}분)`], [`${f1.name},${f2.name} → (${f2.time}분)`], [`합계 ${cfg.minTime}분`]];
  }
  return {
    submitLabel: "현재 풀이 제출하기",
    undo: () => { if (history.length) { const h = history.pop(); side = h.side; torch = h.torch; time = h.time; log = h.log; sel = new Set(); render(); } },
    restart: init,
    submit: () => {
      const allFar = cfg.people.every(p => side[p.id] === "far");
      const isCorrect = allFar && time <= cfg.minTime;
      const partial = allFar && !isCorrect;
      return { isCorrect, partial, time,
        answerText: `걸린 시간 ${time}분` + (allFar ? (isCorrect ? ` (최소 ${cfg.minTime}분!)` : ` (최소는 ${cfg.minTime}분)`) : " · 아직 다 못 건넜어요"),
        processTable: T(["번호", "건넌 사람", "방향", "시간", "누적"], log.length ? log : [["-", "-", "-", "-", "0분"]]),
        modelTable: T(["모범(최소 17분) 순서"], modelSeq()),
        detail: { 추상화: isCorrect ? 90 : 40, 알고리즘정확성: allFar ? 100 : 40, 효율성: isCorrect ? 100 : (allFar ? Math.max(30, 100 - (time - cfg.minTime) * 10) : 40) } };
    },
  };
};

// ---------- 16) doors : 30개의 열린 문 (C-06) ----------
ENGINES.doors = function (host, problem) {
  const cfg = problem.config;
  let door, person, log;
  function init() { door = new Array(cfg.n + 1).fill(cfg.startOpen); person = 0; log = []; render(); }
  const grid = el("div", { class: "gridpath", style: "grid-template-columns:repeat(10,1fr)" }), status = el("div", { class: "status-line" });
  function render() {
    clear(grid);
    for (let i = 1; i <= cfg.n; i++) grid.appendChild(el("div", { class: "gcell " + (door[i] ? "on" : ""), text: i, style: door[i] ? "" : "background:#495057;color:#fff" }));
    status.textContent = `${person}번째 사람까지 진행 · 지금 열린 문 ${door.slice(1).filter(Boolean).length}개`;
  }
  function stepPerson() { if (person >= cfg.n) { toast("모든 사람이 지나갔어요. 열린 문 개수를 입력해 제출!", "good"); return; } person++; const changed = []; for (let d = person; d <= cfg.n; d += person) { door[d] = !door[d]; changed.push(d); } log.push([person, changed.join(",")]); beep("click"); render(); }
  const nextBtn = el("button", { class: "btn secondary", text: "▶ 다음 사람", onclick: stepPerson });
  const allBtn = el("button", { class: "btn ghost", text: "⏭ 전체 실행", onclick: () => { while (person < cfg.n) { person++; const changed = []; for (let d = person; d <= cfg.n; d += person) { door[d] = !door[d]; changed.push(d); } log.push([person, changed.join(",")]); } render(); } });
  const input = el("input", { type: "number", class: "namebox", style: "max-width:160px;padding:8px", placeholder: "열린 문 개수" });
  host.append(el("p", { class: "status-line", text: "문은 처음에 모두 열림! '다음 사람'이 자기 배수 문을 반대로. 다 실행 후 열린 문 개수를 입력해 제출." }), grid, el("div", { style: "text-align:center;margin:8px" }, [nextBtn, el("span", { text: " " }), allBtn]), status, el("div", { class: "board" }, [input]));
  init();
  return {
    submitLabel: "답 제출하기",
    restart: () => { init(); input.value = ""; },
    submit: () => {
      if (input.value === "") return { notReady: true, message: "열린 문 개수를 입력한 뒤 제출하세요." };
      const nowOpen = door.slice(1).filter(Boolean).length;
      const isCorrect = Number(input.value) === cfg.answerOpen;
      const openList = []; for (let i = 1; i <= cfg.n; i++) if (door[i]) openList.push(i);
      return { isCorrect, moves: person, answerText: `내가 쓴 열린 문 개수: ${input.value} (실제 시뮬레이션: ${nowOpen}개)`,
        processTable: T(["사람", "상태 바꾼 문(일부)"], log.length ? log.slice(0, 8).map(r => [r[0], r[1].length > 40 ? r[1].slice(0, 40) + "…" : r[1]]) : [["-", "실행 안 함"]]),
        modelTable: T(["규칙"], [["약수 개수가 홀수인 수(제곱수)만 닫힘 → 닫힌 문 = " + cfg.closed.join(",") + " (5개), 열린 문 = 25개"]]),
        detail: { 추상화: isCorrect ? 100 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 설명: isCorrect ? 90 : 40 } };
    },
  };
};

// ---------- 17) nim : 폭탄 전략 (C-07) ----------
ENGINES.nim = function (host, problem) {
  const cfg = problem.config;
  let remaining, turn, over, studentWon, log;
  function init() { remaining = cfg.total; turn = "you"; over = false; studentWon = false; log = []; render(); }
  const board = el("div", { class: "board" }), status = el("div", { class: "status-line" }), logBox = el("div", { class: "hint-box" });
  function render() {
    clear(board); for (let i = 0; i < remaining; i++) board.appendChild(el("span", { text: i === 0 ? "💣" : "🧨", style: "font-size:1.6rem" }));
    status.textContent = `남은 폭탄 ${remaining}개 · ${over ? "게임 끝 — '플레이 결과 제출하기'를 누르세요" : (turn === "you" ? "내 차례" : "컴퓨터 차례")}`;
  }
  function take(n, who) {
    remaining -= n; log.push([who === "you" ? "나" : "컴퓨터", `${n}개`, `${remaining}`]);
    logBox.innerHTML += `<div>${who === "you" ? "🙂 나" : "🤖 컴퓨터"}: ${n}개 → 남은 ${remaining}</div>`;
    if (remaining <= 0) { over = true; studentWon = (who !== "you"); status.textContent = studentWon ? "컴퓨터가 마지막 폭탄을! 결과를 제출하세요." : "내가 마지막 폭탄을… 결과를 제출하세요."; render(); return true; }
    return false;
  }
  function cpu() { let t = bestTake(remaining, cfg.maxTake, cfg.loseOnLast); if (t === 0) t = 1; t = Math.min(t, remaining, cfg.maxTake); if (take(t, "cpu")) return; turn = "you"; render(); }
  const btns = el("div", { class: "board" });
  const maxTake = cfg.maxTake || 3;
  for (let n = 1; n <= maxTake; n++) btns.appendChild(el("button", { class: "btn", text: `${n}개`, onclick: () => { if (over || turn !== "you" || n > remaining) return; if (take(n, "you")) return; turn = "cpu"; render(); setTimeout(cpu, 450); } }));
  host.append(el("p", { class: "status-line", text: `1~${maxTake}개씩 번갈아 가져가요. 마지막 💣을 가져가면 패배! 게임이 끝나면 결과를 제출하세요.` }), board, btns, status, logBox);
  init();
  return {
    submitLabel: "플레이 결과 제출하기",
    restart: init,
    submit: () => {
      if (!over) return { notReady: true, message: "게임을 끝까지 진행한 뒤 결과를 제출하세요." };
      const isCorrect = studentWon;
      return { isCorrect, answerText: isCorrect ? "내가 이겼어요!" : "이번엔 졌어요.",
        processTable: T(["차례", "가져간 수", "남은 수"], log),
        modelTable: T(["필승 전략"], [["상대에게 남는 수를 1,5,9,…,29(4로 나눠 1 남음)로 만들기 → 처음에 1개를 가져가면 선공 필승"]]),
        detail: { 추상화: isCorrect ? 90 : 40, 알고리즘정확성: isCorrect ? 100 : 40, 설명: isCorrect ? 90 : 50 } };
    },
  };
};
