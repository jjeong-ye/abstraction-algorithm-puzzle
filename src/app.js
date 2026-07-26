// ============ 앱 컨트롤러 · 화면 전환 & 게임 셸 ============
import { WORLDS, PROBLEMS } from "./data.js";
import { Store } from "./storage.js";
import { el, clear, beep, toast, modal, winBurst, renderFullExplanation, renderProcessTable } from "./ui.js";
import { ENGINES } from "./engines.js";

const main = document.getElementById("main");
const titleEl = document.getElementById("topbar-title");
let route = { screen: "start" };

// 교사 모드는 '교사용 빌드(teacher.html)'에서만 활성화됨.
// 학생용 index.html 에는 교사 버튼이 없고 이 플래그도 false → 교사 기능 전부 비활성.
const TEACHER_ENABLED = (typeof window !== "undefined") && window.TEACHER_MODE_ENABLED === true;
function teacherOn() { return TEACHER_ENABLED && Store.getSettings().teacher; }

// ---------------- 설정/상단바 ----------------
function applySettings() {
  const s = Store.getSettings();
  document.body.classList.toggle("reduce-motion", !!s.motion);
  document.getElementById("btn-sound").setAttribute("aria-pressed", s.sound ? "true" : "false");
  document.getElementById("btn-sound").textContent = s.sound ? "🔊 소리" : "🔇 소리";
  document.getElementById("btn-motion").setAttribute("aria-pressed", s.motion ? "true" : "false");
  const tb = document.getElementById("btn-teacher");
  if (tb) {
    if (!TEACHER_ENABLED) { tb.style.display = "none"; }
    else { tb.setAttribute("aria-pressed", s.teacher ? "true" : "false"); tb.textContent = s.teacher ? "🎓 교사(켬)" : "🎓 교사"; }
  }
}
document.getElementById("btn-home").onclick = () => go({ screen: Store.getPlayer() ? "worlds" : "start" });
document.getElementById("btn-sound").onclick = () => { Store.setSetting("sound", !Store.getSettings().sound); applySettings(); beep("click"); };
document.getElementById("btn-motion").onclick = () => { Store.setSetting("motion", !Store.getSettings().motion); applySettings(); };
if (TEACHER_ENABLED && document.getElementById("btn-teacher")) document.getElementById("btn-teacher").onclick = () => {
  Store.setSetting("teacher", !Store.getSettings().teacher); applySettings();
  toast(Store.getSettings().teacher ? "교사 모드 켜짐: 모든 해설을 바로 볼 수 있어요" : "교사 모드 꺼짐");
  if (route.screen === "stages") renderStages(route.world);
};
document.getElementById("btn-fullscreen").onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
};

// ---------------- 라우팅 ----------------
function go(r) { route = r; render(); window.scrollTo(0, 0); }
function render() {
  clear(main);
  applySettings();
  if (route.screen === "start") return renderStart();
  if (route.screen === "worlds") return renderWorlds();
  if (route.screen === "stages") return renderStages(route.world);
  if (route.screen === "game") return renderGame(route.stageId);
}

// ---------------- 시작 화면 ----------------
function renderStart() {
  titleEl.textContent = "퍼즐 탐험대";
  const input = el("input", { type: "text", value: Store.getPlayer(), maxlength: "20", placeholder: "이름 또는 번호", "aria-label": "학생 이름 또는 번호" });
  const start = () => { const v = input.value.trim() || "탐험가"; Store.setPlayer(v); beep("good"); go({ screen: "worlds" }); };
  input.addEventListener("keydown", e => { if (e.key === "Enter") start(); });
  main.appendChild(el("div", { class: "hero" }, [
    el("div", { class: "mascot", text: "🧭" }),
    el("h1", { text: "퍼즐 탐험대" }),
    el("p", { text: "추상화와 알고리즘을 배우는 24개의 퍼즐 모험!" }),
    el("p", { text: "문제를 분석하고, 조작하고, 실행하고, 설명하며 스스로 규칙을 찾아봐요." }),
    el("div", { class: "namebox" }, [
      el("label", { text: "🙋 이름/번호를 입력하세요", for: "" }), input,
      el("div", { style: "margin-top:12px" }, [el("button", { class: "btn", text: "🚀 모험 시작!", onclick: start })]),
    ]),
    el("p", { style: "font-size:.85rem;color:#888", text: "기록은 이 브라우저에만 저장돼요(localStorage)." }),
  ]));
}

// ---------------- 월드 선택 ----------------
function worldProgress(worldId) {
  const list = PROBLEMS.filter(p => p.world === worldId);
  const done = list.filter(p => Store.getRecord(p.id).cleared).length;
  return { done, total: list.length };
}
function renderWorlds() {
  titleEl.textContent = `${Store.getPlayer()} 님의 모험`;
  const grid = el("div", { class: "world-grid" });
  WORLDS.forEach(w => {
    const { done, total } = worldProgress(w.id);
    grid.appendChild(el("div", { class: "world-card " + w.color, role: "button", tabindex: "0",
      onclick: () => go({ screen: "stages", world: w.id }), onkeydown: e => { if (e.key === "Enter") go({ screen: "stages", world: w.id }); } }, [
      el("div", { class: "emoji", text: w.emoji }),
      el("h2", { text: w.name }),
      el("p", { text: w.desc }),
      el("div", { class: "prog", text: `진행: ${done} / ${total} 스테이지` }),
      el("div", { class: "bar" }, [el("i", { style: `width:${total ? (done / total * 100) : 0}%` })]),
    ]));
  });
  const totalDone = PROBLEMS.filter(p => Store.getRecord(p.id).cleared).length;
  main.append(
    el("h2", { text: "월드를 선택하세요" }),
    grid,
    el("p", { class: "status-line", text: `전체 진행: ${totalDone} / 24 스테이지 완료` }),
    el("div", { style: "text-align:center;margin-top:10px" }, [
      el("button", { class: "btn ghost small", text: "🗂 학습 기록 보기", onclick: showRecords }),
      el("button", { class: "btn ghost small", text: "♻ 기록 초기화", onclick: () => { if (confirm("모든 학습 기록을 지울까요?")) { Store.reset(); toast("초기화됨"); go({ screen: "start" }); } } }),
    ]),
  );
}

function showRecords() {
  const box = el("div");
  PROBLEMS.forEach(p => {
    const r = Store.getRecord(p.id);
    box.appendChild(el("div", { class: "cond" }, [
      el("span", { class: "num", text: p.id }),
      el("span", { html: `<b>${p.title}</b> · ${r.cleared ? "✅통과" : "⬜미완"} · 최고 ${r.bestScore}점 · 시도 ${r.attempts} · 힌트 ${r.hintsUsed}` +
        (r.minMoves != null ? ` · 최소이동 ${r.minMoves}` : "") + (r.minTime != null ? ` · 최소시간 ${r.minTime}` : "") }),
    ]));
  });
  modal("🗂 학습 기록", box);
}

// ---------------- 스테이지 목록 ----------------
function renderStages(worldId) {
  const w = WORLDS.find(x => x.id === worldId);
  titleEl.textContent = w.name;
  const list = PROBLEMS.filter(p => p.world === worldId);
  const grid = el("div", { class: "stage-list" });
  const teacher = teacherOn();
  list.forEach(p => {
    const r = Store.getRecord(p.id);
    const stars = { basic: "★☆☆", normal: "★★☆", challenge: "★★★" }[p.difficulty];
    const card = el("div", { class: "stage-card", role: "button", tabindex: "0",
      onclick: () => go({ screen: "game", stageId: p.id }), onkeydown: e => { if (e.key === "Enter") go({ screen: "game", stageId: p.id }); } }, [
      r.cleared ? el("div", { class: "badge", text: "✅" }) : null,
      el("div", { class: "sid", text: `${p.id} · 교재 ${p.sourceProblem} (${p.sourcePage}쪽)` }),
      el("h3", { text: p.title }),
      el("div", { class: "meta" }, [el("span", { class: "diff " + p.difficulty, text: { basic: "기초", normal: "기본", challenge: "도전" }[p.difficulty] }),
        el("span", { class: "stars", text: " " + stars }), el("span", { text: ` · ⏱${p.estimatedMinutes}분` })]),
      el("div", {}, (p.learningGoals || []).slice(0, 2).map(g => el("span", { class: "chip", text: g }))),
      (teacher || r.submitted) ? el("button", { class: "btn small ghost", text: r.submitted ? "📖 해설 다시 보기" : "📖 해설 미리보기", onclick: (e) => { e.stopPropagation(); openExplanation(p, teacher); } }) : null,
    ]);
    grid.appendChild(card);
  });
  main.append(
    el("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, [
      el("button", { class: "btn ghost small", text: "← 월드 선택", onclick: () => go({ screen: "worlds" }) }),
      el("h2", { text: w.name, style: "margin:6px 0" }),
    ]),
    el("p", { text: w.desc, class: "status-line" }),
    grid,
  );
}

// ---------------- 해설 열기 ----------------
function openExplanation(problem, teacher) {
  const rec = Store.getRecord(problem.id);
  const content = el("div");
  if (rec.lastSubmission) {
    content.append(el("div", { class: "verdict " + (rec.lastSubmission.isCorrect ? "ok" : "no"),
      text: rec.lastSubmission.isCorrect ? "🎉 정답으로 제출함" : "제출 기록" }));
    content.append(el("p", { text: "내가 제출한 답: " + (rec.lastSubmission.answerText || "-") }));
    if (rec.lastSubmission.processTable) { content.append(el("h4", { text: "나의 풀이 과정" }), renderProcessTable(rec.lastSubmission.processTable)); }
    if (rec.lastSubmission.modelTable) { content.append(el("h4", { text: "모범/최적 풀이" }), renderProcessTable(rec.lastSubmission.modelTable)); }
  }
  content.append(renderFullExplanation(problem, { teacher: teacher || teacherOn() }));
  modal("📖 " + problem.title + " · 해설", content);
}

// ---------------- 게임 셸 ----------------
function renderGame(stageId) {
  const p = PROBLEMS.find(x => x.id === stageId);
  const w = WORLDS.find(x => x.id === p.world);
  titleEl.textContent = `${p.id} · ${p.title}`;

  // 제출 상태 관리
  const S = { hasStarted: false, hasSubmitted: false, submittedAnswer: null, submittedProcess: null,
              isCorrect: false, attemptCount: 0, hintCount: 0, explanationUnlocked: false };
  let hintsUsed = 0;
  const engineHost = el("div", { class: "stage-stage" });
  const statusEl = el("div", { class: "status-line", "aria-live": "polite" });

  // 힌트 영역
  const hintBox = el("div", { class: "hint-box", style: "display:none" });
  const hints = [p.hint1Observation, p.hint2KeyCondition, p.hint3NextAction];
  let hintLevel = 0;
  const hintBtn = el("button", { class: "btn small ghost", text: "💡 힌트 (0/3)",
    onclick: () => {
      if (hintLevel >= 3) { toast("마지막 힌트예요. 정답과 해설은 '제출' 후에 볼 수 있어요.", ""); return; }
      hintBox.style.display = "block";
      hintBox.innerHTML = "";
      hintLevel++; hintsUsed++; S.hintCount++; Store.addHint(p.id);
      for (let i = 0; i < hintLevel; i++) hintBox.appendChild(el("div", { html: `<b>${i + 1}단계:</b> ${hints[i]}` }));
      hintBtn.textContent = `💡 힌트 (${hintLevel}/3)`;
      beep("click");
    } });

  const engineFn = ENGINES[p.engine];
  let engineCtl = null;
  function mountEngine() {
    clear(engineHost);
    engineCtl = engineFn ? engineFn(engineHost, p) : null;
    if (!engineFn) engineHost.appendChild(el("p", { text: "이 스테이지 엔진을 찾을 수 없어요: " + p.engine }));
    if (submitBtn) submitBtn.textContent = "✅ " + ((engineCtl && engineCtl.submitLabel) || "제출하기");
  }

  function doSubmit() {
    if (!engineCtl || !engineCtl.submit) { toast("제출할 수 없는 스테이지예요", "bad"); return; }
    const res = engineCtl.submit();
    if (res && res.notReady) { toast(res.message || "아직 제출할 수 없어요", "bad"); return; }
    S.hasSubmitted = true; S.explanationUnlocked = true; S.isCorrect = !!res.isCorrect;
    S.submittedAnswer = res.answerText; S.submittedProcess = res.processTable; S.attemptCount++;
    const detail = res.detail || {};
    const vals = Object.values(detail);
    const score = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : (res.isCorrect ? 100 : 0);
    Store.recordSubmission(p.id, {
      isCorrect: res.isCorrect, score, moves: res.moves ?? null, time: res.time ?? null, hintsUsed,
      answerText: res.answerText,
      lastSubmission: { isCorrect: res.isCorrect, partial: res.partial, answerText: res.answerText,
        processTable: res.processTable, modelTable: res.modelTable, moves: res.moves ?? null, time: res.time ?? null, detail },
    });
    hintsUsed = 0;
    if (res.isCorrect) winBurst();
    explainBtn.disabled = false;
    renderResult(p, res, score);
  }

  // 툴바 (완전 해설은 제출 후에만 열림)
  const alreadySubmitted = Store.getRecord(p.id).submitted;
  const explainBtn = el("button", { class: "btn ghost small", text: "📖 정답·해설(제출 후)",
    disabled: (S.explanationUnlocked || alreadySubmitted || teacherOn()) ? null : "true",
    onclick: () => { if (!S.hasSubmitted && !alreadySubmitted && !teacherOn()) { toast("문제를 '제출'하면 정답과 해설이 열려요", ""); return; } openExplanation(p, teacherOn()); } });
  const toolbar = el("div", { class: "stage-toolbar" }, [
    el("button", { class: "btn ghost small", text: "← 목록", onclick: () => go({ screen: "stages", world: p.world }) }),
    hintBtn,
    el("button", { class: "btn ghost small", text: "↩ 실행취소", onclick: () => { engineCtl && engineCtl.undo ? engineCtl.undo() : toast("이 퍼즐엔 실행취소가 없어요", ""); } }),
    el("button", { class: "btn ghost small", text: "🔄 다시 시작", onclick: () => { engineCtl && engineCtl.restart ? engineCtl.restart() : mountEngine(); toast("다시 시작"); } }),
    explainBtn,
  ]);

  const goalTags = (p.learningGoals || []).map(g => el("span", { class: "chip", text: g }));
  const submitBtn = el("button", { class: "btn green submit-btn", text: "✅ 제출하기",
    onclick: doSubmit, onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doSubmit(); } } });

  main.append(
    el("div", { class: "game-wrap" }, [
      el("div", { class: "panel" }, [
        toolbar,
        el("span", { class: "goal-tag", text: "🎯 " + (p.learningGoals ? p.learningGoals[0] : "도전!") }),
        el("h2", { text: `${p.title}` }),
        el("div", { class: "problem-text", text: p.studentFriendlyText }),
        el("details", { style: "margin-top:8px" }, [el("summary", { text: "📜 교재 원문 보기" }), el("p", { class: "explain", text: p.originalProblemText })]),
        el("div", { style: "margin-top:6px" }, goalTags),
        hintBox,
      ]),
      el("div", { class: "panel" }, [statusEl, engineHost, el("div", { class: "submit-bar" }, [submitBtn])]),
    ]),
  );
  mountEngine();
}

// ---------------- 제출 후 결과·해설 화면 ----------------
function renderResult(problem, res, score) {
  const fx = problem.fullExplanation || {};
  const record = Store.getRecord(problem.id);
  const box = el("div", { class: "result-full" });
  const sect = (title, node) => { if (node == null || node === "") return; box.append(el("h3", { class: "res-h", text: "[" + title + "]" }), (typeof node === "string" ? el("p", { text: node }) : node)); };
  const list = arr => { const ul = el("ul"); (arr || []).forEach(v => ul.appendChild(el("li", { text: v }))); return ul; };

  // 1. 채점 결과
  const verdict = res.isCorrect ? "🎉 정답입니다!" : res.partial ? "🟡 일부 조건을 만족했어요" : "🔴 다시 확인이 필요해요";
  box.append(el("div", { class: "verdict " + (res.isCorrect ? "ok" : res.partial ? "mid" : "no"), text: verdict }));

  // 2. 내가 제출한 답 + 과정
  sect("내가 제출한 답", res.answerText || "-");
  if (res.moves != null || res.time != null) sect("내 기록", `${res.moves != null ? "이동/횟수 " + res.moves : ""}${res.time != null ? "  시간 " + res.time + "분" : ""}`);
  if (res.processTable) sect("나의 풀이 과정", renderProcessTable(res.processTable));

  // 3~7
  sect("정답 · 성공 조건", fx.answer);
  sect("핵심 정보(조건)", fx.key);
  sect("문제의 추상화", fx.abstraction);
  sect("단계별 풀이", list(fx.steps));
  sect("각 단계가 필요한 이유", list(fx.why));

  // 8. 나의 풀이 ↔ 모범 풀이 비교
  const cmp = el("div", { class: "compare" }, [
    el("div", { class: "cmp-col" }, [el("h4", { text: "🙋 나의 풀이" }), res.processTable ? renderProcessTable(res.processTable) : el("p", { text: res.answerText || "-" })]),
    el("div", { class: "cmp-col" }, [el("h4", { text: "⭐ 모범 / 최적 풀이" }), res.modelTable ? renderProcessTable(res.modelTable) : list(fx.steps)]),
  ]);
  sect("나의 풀이 ↔ 모범 풀이 비교", cmp);

  // 9~11
  sect("자주 하는 실수", list(fx.mistakes));
  sect("더 효율적인 방법", fx.better);
  sect("정보 교과 개념", fx.concept);

  // 점수
  const scoreChips = el("div", { class: "score-row" });
  Object.entries(res.detail || {}).forEach(([k, v]) => scoreChips.appendChild(el("div", { class: "score-chip" }, [el("b", { text: v }), el("span", { text: k })])));
  scoreChips.appendChild(el("div", { class: "score-chip" }, [el("b", { text: score }), el("span", { text: "종합" })]));
  box.append(el("h3", { class: "res-h", text: "[점수]" }), scoreChips);

  // 생각 정리
  const reflect = el("textarea", { class: "reflect", placeholder: "내가 어떻게 풀었는지 한두 문장으로 설명해 볼까요?", "aria-label": "풀이 설명" });
  reflect.value = record.reflection || "";
  reflect.addEventListener("blur", () => Store.updateRecord(problem.id, { reflection: reflect.value }));
  box.append(el("p", { style: "font-weight:800;margin:10px 0 4px", text: "✍️ 생각 정리 (설명 점수)" }), reflect);

  // 12,13 버튼
  const nextP = nextStage(problem);
  box.append(el("div", { class: "result-actions" }, [
    el("button", { class: "btn ghost small", text: "🔄 다시 풀기", onclick: () => { closeM(); go({ screen: "game", stageId: problem.id }); } }),
    nextP ? el("button", { class: "btn green small", text: "다음 문제 →", onclick: () => { closeM(); go({ screen: "game", stageId: nextP.id }); } })
      : el("button", { class: "btn green small", text: "월드로 →", onclick: () => { closeM(); go({ screen: "stages", world: problem.world }); } }),
    el("button", { class: "btn secondary small", text: "📖 완전 해설", onclick: () => openExplanation(problem, teacherOn()) }),
  ]));

  const closeM = modal("📊 채점 & 해설", box);
  beep(res.isCorrect ? "win" : "click");
}

function nextStage(problem) {
  const list = PROBLEMS.filter(p => p.world === problem.world);
  const idx = list.findIndex(p => p.id === problem.id);
  return list[idx + 1] || null;
}

// ---------------- 시작 ----------------
go({ screen: Store.getPlayer() ? "worlds" : "start" });
