// ============ 앱 컨트롤러 · 화면 전환 & 게임 셸 ============
import { WORLDS, PROBLEMS } from "./data.js";
import { Store } from "./storage.js";
import { el, clear, beep, toast, modal, winBurst, renderFullExplanation, renderProcessTable } from "./ui.js";
import { ENGINES } from "./engines.js";
import { LIVE } from "./live-config.js";

// 링크 파라미터: ?class=2-3 (반), ?g=방코드 (교사별 네임스페이스), ?api=... (고급: 자체 백엔드)
const _params = new URLSearchParams(location.search);
const URL_CLASS = _params.get("class") || "";
const URL_GROUP = _params.get("g") || "";
const URL_API = _params.get("api") || "";
function liveApiUrl() { return URL_API || LIVE.apiUrl || ""; }
// 이 기기(교사) 또는 링크로 받은 방 코드
function liveGroup() { return URL_GROUP || Store.getGroup() || ""; }
function genGroup() { return Math.random().toString(36).slice(2, 8); }  // 6자리 임의 코드
// 서버에 저장/조회할 코드 = 방 코드 하나로 구분 (학교/반/교사 모두 이걸로 갈라짐)
function liveCode() { return liveGroup() || LIVE.classCode || ""; }

// ---------------- 라이브 현황판으로 '문 열림' 이벤트 전송 (선택) ----------------
// 서버 응답을 기다리지 않고 쏘기만 한다(fire-and-forget). 실패해도 게임엔 영향 없음.
function sendOpenEvent({ worldName, room, title }) {
  const api = liveApiUrl();
  if (!LIVE.enabled || !api) return;
  try {
    const q = new URLSearchParams({
      action: "open",
      code: liveCode(),
      name: Store.getPlayer() || "익명",
      world: worldName || "",
      room: String(room ?? ""),
      title: title || "",
    });
    fetch(`${api}?${q.toString()}`, { method: "GET", mode: "no-cors", cache: "no-store" }).catch(() => {});
  } catch { /* 무시 */ }
}

const main = document.getElementById("main");
const titleEl = document.getElementById("topbar-title");
let route = { screen: "start" };

// ---------------- 방탈출: 난이도 정렬 & 문 잠금 ----------------
const DIFF_RANK = { basic: 0, normal: 1, challenge: 2 };
function idNum(id) { const m = String(id).match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
// 월드의 스테이지를 '난이도(기초→기본→도전)' 순으로 정렬해서 돌려준다.
function stagesOfWorld(worldId) {
  return PROBLEMS.filter(p => p.world === worldId).sort((a, b) => {
    const d = (DIFF_RANK[a.difficulty] ?? 1) - (DIFF_RANK[b.difficulty] ?? 1);
    return d !== 0 ? d : idNum(a.id) - idNum(b.id);
  });
}
// 정렬된 목록에서 각 문의 잠금 상태를 계산.
// 규칙: 첫 문은 항상 열림. 그 외에는 '바로 앞 문'을 통과(cleared)해야 열림.
// (교사 모드면 모두 열림)
function computeLocks(list) {
  const teacher = teacherOn();
  return list.map((p, i) => {
    if (teacher) return false;
    if (i === 0) return false;
    return !Store.getRecord(list[i - 1].id).cleared;
  });
}

// 교사 모드: 학생과 같은 사이트에서 '🎓 교사용'을 누르고 코드로 켠다.
// 코드는 공용 고정값이 아니라, 각 선생님이 이 기기에서 '처음' 들어올 때 직접 정하고
// 그 기기(브라우저)에만 저장된다. (클라이언트 측 간이 잠금 — 학생이 무심코 정답을 보는 것 방지)
function teacherOn() { return Store.getSettings().teacher === true; }

// ---------------- 설정/상단바 ----------------
function applySettings() {
  const s = Store.getSettings();
  document.body.classList.toggle("reduce-motion", !!s.motion);
  const sound = document.getElementById("btn-sound");
  sound.setAttribute("aria-pressed", s.sound ? "true" : "false");
  sound.querySelector(".ico").textContent = s.sound ? "🔊" : "🔇";
  document.getElementById("btn-motion").setAttribute("aria-pressed", s.motion ? "true" : "false");
}
// 기본 URL은 교사만 접속(학생은 QR/링크). 그래서 홈=교사 허브, ?g= 로 온 학생은 시작화면.
document.getElementById("btn-home").onclick = () => go({ screen: URL_GROUP ? "start" : "teacher" });
document.getElementById("btn-sound").onclick = () => { Store.setSetting("sound", !Store.getSettings().sound); applySettings(); beep("click"); };
document.getElementById("btn-motion").onclick = () => { Store.setSetting("motion", !Store.getSettings().motion); applySettings(); };

document.getElementById("btn-fullscreen").onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
};
// ---------------- 라우팅 ----------------
function go(r) { route = r; render(); window.scrollTo(0, 0); }
function render() {
  clear(main);
  applySettings();
  if (route.screen === "teacher") return renderTeacherHub();
  if (route.screen === "start") return renderStart();
  if (route.screen === "worlds") return renderWorlds();
  if (route.screen === "stages") return renderStages(route.world);
  if (route.screen === "game") return renderGame(route.stageId);
}

// ---------------- 교사 허브 (기본 URL 첫 화면 · 교사 전용) ----------------
function hubBtn(emoji, title, desc, onclick) {
  return el("button", { class: "hub-card", onclick }, [
    el("div", { class: "hub-emoji", text: emoji }),
    el("div", { class: "hub-text" }, [
      el("div", { class: "hub-title", text: title }),
      el("div", { class: "hub-desc", text: desc }),
    ]),
  ]);
}
function openBoardNow() {
  let g = liveGroup(); if (!g) { g = genGroup(); Store.setGroup(g); }
  beep("click");
  let url = "live/board.html?g=" + encodeURIComponent(g);
  if (URL_API) url += "&api=" + encodeURIComponent(URL_API);
  window.open(url, "_blank", "noopener");
}
function renderTeacherHub() {
  titleEl.textContent = "UNLOCK";
  Store.setSetting("teacher", true);                              // 교사 화면 = 정답·해설 보임 / 모든 문 열림
  if (!Store.getPlayer()) Store.setPlayer("선생님");
  if (LIVE.enabled && !liveGroup()) Store.setGroup(genGroup());   // 방 코드 자동 준비 (현황판/QR 분류용)
  main.append(el("div", { class: "hero" }, [
    el("div", { class: "mascot", text: "🗝️" }),
    el("h1", { text: "🔓 UNLOCK" }),
    el("p", { text: "🎓 교사용 · 추상화와 알고리즘 퍼즐 방탈출" }),
    el("div", { class: "hub-grid" }, [
      hubBtn("📘", "사용 방법", "수업에서 쓰는 법", openTeacherGuide),
      LIVE.enabled ? hubBtn("🔑", "방 코드 · 학생 접속", "방 코드 / QR / 링크", openTeacherSetup) : null,
      LIVE.enabled ? hubBtn("📺", "현황판 열기", "프로젝터에 실시간 표시", openBoardNow) : null,
      hubBtn("🎮", "게임 · 문제 풀이", "직접 풀기 + 정답·해설 보기", () => go({ screen: "worlds" })),
    ]),
    el("p", { class: "home-hint", text: "학생은 선생님이 준 QR·링크로 들어와요 🗝️" }),
  ]));
}

// ---------------- 시작 화면 (기본 = 학생) ----------------
function renderStart() {
  titleEl.textContent = "UNLOCK";
  const hasRoom = !!URL_GROUP;              // QR/링크로 방 코드를 받고 왔는가
  if (hasRoom) Store.setGroup(URL_GROUP);   // 링크의 방 코드를 저장
  // 앞서 교사가 쓴 기기라면 닉네임에 '선생님'이 남아있을 수 있으니 그때만 비운다.
  const prevName = Store.getPlayer() === "선생님" ? "" : Store.getPlayer();
  const input = el("input", { type: "text", value: prevName, maxlength: "20", placeholder: "예: 22번, 3모둠, 번개", "aria-label": "닉네임·번호·모둠명" });
  // 방 코드 하나로 반/학교를 구분한다. 학생은 선생님이 알려준 방 코드만 입력(반 입력 불필요).
  const roomInput = el("input", { type: "text", maxlength: "16", placeholder: "선생님이 알려준 방 코드",
    value: Store.getGroup() || "", "aria-label": "방 코드" });
  const start = () => {
    Store.setSetting("teacher", false);     // 학생 세션 (공용 PC에서 정답 노출 방지)
    const v = input.value.trim() || "탈출자"; Store.setPlayer(v);
    if (LIVE.enabled) Store.setGroup(hasRoom ? URL_GROUP : roomInput.value.trim());
    beep("good"); go({ screen: "worlds" });
  };
  input.addEventListener("keydown", e => { if (e.key === "Enter") start(); });
  roomInput.addEventListener("keydown", e => { if (e.key === "Enter") start(); });
  const mascot = el("div", { class: "mascot", text: "🗝️", title: "눌러봐!", role: "button", tabindex: "0",
    onclick: () => { beep("good"); mascot.classList.remove("happy"); void mascot.offsetWidth; mascot.classList.add("happy"); },
    onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mascot.click(); } } });
  // 방 코드 입력칸: 링크(QR)로 코드를 받고 왔으면 숨기고 닉네임만. (LIVE 켜졌고 코드 없을 때만 노출)
  const showRoom = LIVE.enabled && !hasRoom;
  main.appendChild(el("div", { class: "hero" }, [
    mascot,
    el("h1", { text: "🔓 UNLOCK" }),
    el("p", { text: "추상화와 알고리즘 퍼즐로 잠긴 문을 하나씩 열어라!" }),
    el("p", { text: "문제를 풀면 다음 문이 열려요. 모든 문을 열고 탈출에 성공해 봐요 🗝️" }),
    el("div", { class: "namebox" }, [
      showRoom ? el("label", { text: "🔑 방 코드 (선생님이 알려줘요)" }) : null,
      showRoom ? roomInput : null,
      el("label", { text: "🙋 닉네임 · 번호 · 모둠명", style: showRoom ? "margin-top:12px" : "" }), input,
      LIVE.enabled ? el("p", { class: "name-guide", text: "⚠️ 실명은 쓰지 마세요. 친구가 기분 나쁠 수 있는 별명도 안 돼요. (닉네임·번호·모둠명으로!)" }) : null,
      el("div", { style: "margin-top:12px" }, [el("button", { class: "btn", text: "🚪 탈출 시작!", onclick: start })]),
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
  titleEl.textContent = `${Store.getPlayer()} 님의 UNLOCK`;
  const grid = el("div", { class: "world-grid" });
  // 추천 순서: 아직 완주하지 못한 '첫' 월드를 "여기부터" 로 안내 (강제 아님)
  const suggestedIdx = WORLDS.findIndex(w => { const { done, total } = worldProgress(w.id); return total === 0 || done < total; });
  WORLDS.forEach((w, i) => {
    const { done, total } = worldProgress(w.id);
    const complete = total > 0 && done === total;
    const isSuggested = i === suggestedIdx;
    const softLock = suggestedIdx !== -1 && i > suggestedIdx && done === 0; // 순서상 뒤 + 아직 시작 안 함
    const remaining = total - done;

    let statusCls = "", badge = "", progText = `남은 문 ${remaining}개`;
    if (complete) { statusCls = "complete"; badge = "✅"; progText = "🎉 탈출 완료!"; }
    else if (isSuggested) { statusCls = "suggested"; badge = "🗝️"; progText = done > 0 ? `이어서 도전! 남은 문 ${remaining}개` : "🗝️ 여기부터 추천!"; }
    else if (softLock) { statusCls = "soft-lock"; badge = "🔒"; progText = `🔒 남은 문 ${remaining}개 · 앞 월드 먼저 추천`; }

    const openWorld = () => {
      if (softLock) toast("앞 월드부터 하면 흐름이 자연스러워요 (그래도 들어갈 수 있어요) 🙂", "");
      go({ screen: "stages", world: w.id });
    };
    grid.appendChild(el("div", { class: "world-card " + w.color + (statusCls ? " " + statusCls : ""), role: "button", tabindex: "0",
      onclick: openWorld, onkeydown: e => { if (e.key === "Enter") openWorld(); } }, [
      badge ? el("div", { class: "world-status-badge", text: badge }) : null,
      el("div", { class: "world-head" }, [
        el("span", { class: "world-num", text: String(i), "aria-label": `${i}단계` }),
        el("div", { class: "emoji", text: w.emoji }),
      ]),
      el("h2", { text: w.name }),
      el("p", { text: w.desc }),
      el("div", { class: "prog", text: `진행 ${done} / ${total} · ${progText}` }),
      el("div", { class: "bar" }, [el("i", { style: `width:${total ? (done / total * 100) : 0}%` })]),
    ]));
  });
  const totalDone = PROBLEMS.filter(p => Store.getRecord(p.id).cleared).length;
  main.append(
    el("h2", { text: "단계를 선택하세요" }),
    grid,
    el("p", { class: "status-line", text: `전체 진행: ${totalDone} / ${PROBLEMS.length} 스테이지 완료` }),
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
  const list = stagesOfWorld(worldId);        // 난이도 순 정렬
  const locks = computeLocks(list);            // 문 잠금 상태
  const teacher = teacherOn();
  const clearedCount = list.filter(p => Store.getRecord(p.id).cleared).length;

  const grid = el("div", { class: "stage-list" });
  list.forEach((p, i) => {
    const r = Store.getRecord(p.id);
    const locked = locks[i];
    const isCurrent = !locked && !r.cleared;   // 지금 열 수 있는 '현재 문'
    const stars = { basic: "★☆☆", normal: "★★☆", challenge: "★★★" }[p.difficulty];
    const doorIcon = r.cleared ? "🔓" : locked ? "🔒" : "🗝️";

    const openStage = () => { if (locked) { beep("bad"); toast("앞의 문을 먼저 통과해야 열려요 🔒", "bad"); return; } go({ screen: "game", stageId: p.id }); };
    const cls = "stage-card door" + (locked ? " locked" : "") + (isCurrent ? " current" : "") + (r.cleared ? " cleared" : "");
    const card = el("div", { class: cls, role: "button", tabindex: "0", "aria-disabled": locked ? "true" : "false",
      onclick: openStage, onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openStage(); } } }, [
      el("div", { class: "door-badge", text: doorIcon }),
      el("div", { class: "sid", text: `${i + 1}번째 문 · ${teacher || r.submitted ? p.id + " · 교재 " + p.sourceProblem + " (" + p.sourcePage + "쪽)" : ""}` }),
      el("h3", { text: locked ? "🔒 잠긴 문" : p.title }),
      el("div", { class: "meta" }, [el("span", { class: "diff " + p.difficulty, text: { basic: "기초", normal: "기본", challenge: "도전" }[p.difficulty] }),
        el("span", { class: "stars", text: " " + stars }), el("span", { text: ` · ⏱${p.estimatedMinutes}분` })]),
      locked ? el("div", { class: "lock-hint", text: "앞의 문을 통과하면 열려요" })
             : el("div", {}, (p.learningGoals || []).slice(0, 2).map(g => el("span", { class: "chip", text: g }))),
      (!locked && (teacher || r.submitted)) ? el("button", { class: "btn small ghost", text: r.submitted ? "📖 해설 다시 보기" : "📖 해설 미리보기", onclick: (e) => { e.stopPropagation(); openExplanation(p, teacher); } }) : null,
    ]);
    grid.appendChild(card);
  });

  const escaped = clearedCount === list.length;
  main.append(
    el("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, [
      el("button", { class: "btn ghost small", text: "← 월드 선택", onclick: () => go({ screen: "worlds" }) }),
      el("h2", { text: "🚪 " + w.name, style: "margin:6px 0" }),
    ]),
    el("p", { class: "status-line", text: escaped ? "🎉 모든 문을 열고 탈출 성공!" : `🗝️ 문을 하나씩 열며 탈출하세요! (${clearedCount} / ${list.length} 통과)` }),
    el("div", { class: "escape-bar" }, [el("i", { style: `width:${list.length ? (clearedCount / list.length * 100) : 0}%` })]),
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

// ---------------- 교사 모드 켤 때: 수업 준비 (방 코드 + 반 + 학생 링크) ----------------
function openTeacherSetup() {
  const studentLink = () => location.origin + location.pathname + "?g=" + encodeURIComponent(liveGroup());
  const codeEl = el("b", { text: liveGroup() });
  const qrImg = el("img", { class: "qr", alt: "학생 접속 QR 코드", width: "220", height: "220" });
  const refreshQR = () => { qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=" + encodeURIComponent(studentLink()); };
  const regen = () => { Store.setGroup(genGroup()); codeEl.textContent = liveGroup(); refreshQR(); toast("새 방 코드가 만들어졌어요", "good"); };
  const copyLink = () => { if (navigator.clipboard) navigator.clipboard.writeText(studentLink()).then(() => toast("학생 링크가 복사됐어요!", "good")).catch(() => {}); };
  refreshQR();
  const content = el("div", { class: "teacher-guide" }, [
    el("div", { class: "roomcode" }, [el("span", { text: "🔑 방 코드" }), codeEl]),
    el("p", { style: "text-align:center;color:var(--ink-soft);margin:6px 0", text: "학생은 QR을 찍거나, 방 코드를 직접 입력하면 돼요." }),
    el("div", { style: "text-align:center" }, [qrImg]),
    el("div", { style: "display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap" }, [
      el("button", { class: "btn ghost small", text: "🔄 새 코드 (다른 반)", onclick: regen }),
      el("button", { class: "btn ghost small", text: "🔗 링크 복사", onclick: copyLink }),
    ]),
  ]);
  modal("🔑 방 코드 · 학생 접속", content);
}

// ---------------- 교사용 안내 (라이브 현황판 사용법 + 시트 나눠주기) ----------------
function openTeacherGuide() {
  const box = el("div", { class: "explain teacher-guide" });
  const step = (n, html) => el("div", { class: "guide-step" }, [el("span", { class: "gnum", text: n }), el("div", { html })]);

  // ===== 매 수업 3단계 =====
  box.append(el("div", { class: "guide-hero" }, [
    el("div", { class: "guide-title", text: "🎬 매 수업, 이 3가지만!" }),
    step("1", "이 사이트 주소를 열면 <b>교사용 화면(4개 버튼)</b>이 바로 나와요 (이 주소는 선생님만 접속)"),
    step("2", "<b>🔑 방 코드·학생 접속</b>에서 <b>QR</b>를 프로젝터에 띄워 학생이 찍게 하고, <b>📺 현황판 열기</b>도 함께"),
    step("3", "학생은 QR·링크로 들어와 <b>닉네임</b>(실명 ❌)만 넣고 바로 문제 풀기"),
    el("p", { class: "guide-tip", html: "맞히면 이름이 반짝여요 · <b>오늘 기록만</b> 나와서 초기화 불필요 · 다른 반은 방 코드 창의 <b>🔄 새 코드</b> 또는 현황판 <b>⚙️ 방 코드</b>" }),
  ]));

  // ===== 방 코드가 하는 일 =====
  box.append(el("div", { class: "guide-title2", text: "🔑 방 코드가 뭐예요?" }));
  box.append(el("ul", {}, [
    el("li", { html: "<b>QR·링크에 이미 방 코드가 들어 있어요</b>(<code>?g=코드</code>). 학생은 찍기만 하면 코드가 자동 입력돼서 <b>닉네임만</b> 쓰면 돼요." }),
    el("li", { html: "방 코드는 <b>현황판(구글시트)에서 어느 교실 기록인지 분류</b>하는 값이에요. 방 코드가 다르면 <b>학교·반끼리 절대 안 섞여요.</b>" }),
    el("li", { html: "다른 반 수업이면 방 코드 창의 <b>🔄 새 코드</b>로 새 QR을 만들면 돼요." }),
  ]));

  // ===== 다른 선생님께 나눠주기 (설정 0) =====
  box.append(el("div", { class: "guide-title2", text: "🤝 다른 선생님께 나눠주기" }));
  box.append(el("div", { class: "guide-setup" }, [
    el("p", { html: "<b>이 사이트 링크만</b> 보내주면 끝이에요. 받은 선생님은 설정·배포·코드 수정 <b>전혀 없이</b> 바로 써요." }),
    el("ol", {}, [
      el("li", { html: "받은 선생님이 사이트를 열면 바로 <b>교사용 화면</b>이 뜨고 <b>자기만의 방 코드</b>가 자동으로 생겨요." }),
      el("li", { html: "그 방 코드(QR)를 자기 반 학생에게 보여주면 끝. 방 코드가 다르니 <b>학교·반끼리 절대 안 섞여요.</b>" }),
    ]),
  ]));

  // ===== 개인정보 =====
  box.append(el("div", { class: "guide-title2", text: "🔒 기록·개인정보" }));
  box.append(el("ul", {}, [
    el("li", { html: "쌓이는 정보는 <b>닉네임 + 몇 번 문을 열었나</b> 뿐이에요(성적·실명 아님). 학생에게 <b>실명 금지</b>를 안내하세요." }),
    el("li", { html: "현황판은 <b>오늘 기록만</b> 보여줘서 매번 지울 필요가 없어요." }),
  ]));

  // ===== 고급(접이식): 자기 기록 시트 따로 쓰기 =====
  const apiIn = el("input", { class: "pw-input", style: "text-align:left;letter-spacing:0;font-size:1rem", placeholder: "배포 주소 (.../exec)", value: URL_API || "" });
  const out = el("textarea", { class: "reflect", readonly: "true", rows: "2", placeholder: "여기에 링크가 만들어져요" });
  const makeLink = () => {
    if (!apiIn.value.trim()) { toast("먼저 배포 주소(.../exec)를 넣어주세요", "bad"); return; }
    const base = location.origin + location.pathname;
    const link = base + "?api=" + encodeURIComponent(apiIn.value.trim());
    out.value = link;
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast("링크가 복사됐어요", "good")).catch(() => {});
  };
  const adv = el("details", { class: "guide-more" }, [
    el("summary", { text: "🛠 (고급) 기록을 내 구글시트에 따로 모으고 싶다면" }),
    el("div", { class: "guide-more-body" }, [
      el("p", { html: "기본은 공용 기록판이라 <b>안 해도 돼요.</b> 우리 학교 기록을 완전히 분리하고 싶을 때만 하세요." }),
      el("ol", {}, [
        el("li", { html: "구글시트 만들고 <b>Apps Script</b> 에 <code>live/apps-script.js</code> 붙여넣어 <b>웹 앱 배포</b> → <code>.../exec</code> 복사 (자세힌 시트 <b>📖 사용안내</b>)" }),
        el("li", { html: "아래에 그 주소를 넣고 <b>[링크 만들기]</b> → 이 링크로 접속하면 그 시트에 저장돼요." }),
      ]),
      LIVE.templateCopyUrl ? el("button", { class: "btn small", text: "📄 기록용 시트 사본 만들기", onclick: () => window.open(LIVE.templateCopyUrl, "_blank", "noopener") }) : null,
      el("div", { class: "linkgen" }, [apiIn, el("button", { class: "btn small", text: "🔗 링크 만들기 + 복사", onclick: makeLink }), out]),
    ]),
  ]);
  box.append(adv);

  box.append(el("p", { class: "guide-foot", html: "라이브 기능 끄기: <code>src/live-config.js</code> 의 <b>enabled: false</b>" }));

  modal("📘 교사 사용 안내", box);
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
    const wasCleared = Store.getRecord(p.id).cleared;   // 첫 통과인지 판단용
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
    if (res.isCorrect) {
      winBurst();
      const nxt = nextStage(p);
      if (nxt && !Store.getRecord(nxt.id).cleared) toast("🔓 다음 문이 열렸어요!", "good");
      if (!wasCleared) {   // 첫 통과일 때만 현황판에 알림 (재도전 스팸 방지)
        const wList = stagesOfWorld(p.world);
        const room = wList.findIndex(x => x.id === p.id) + 1;
        const wName = (WORLDS.find(x => x.id === p.world) || {}).name || "";
        sendOpenEvent({ worldName: wName, room, title: p.title });
      }
    }
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
  const cleared = res.isCorrect || Store.getRecord(problem.id).cleared;
  // 방탈출: 통과했을 때만 '다음 문'이 열린다. 틀리면 이 문을 다시 풀어야 함.
  const advanceBtn = (nextP && cleared)
    ? el("button", { class: "btn green small", text: "🚪 다음 문 →", onclick: () => { closeM(); go({ screen: "game", stageId: nextP.id }); } })
    : (!nextP && cleared)
      ? el("button", { class: "btn green small", text: "🏁 문 목록으로 →", onclick: () => { closeM(); go({ screen: "stages", world: problem.world }); } })
      : el("button", { class: "btn small", text: "🔒 다음 문(잠김)", disabled: "true", title: "이 문을 통과해야 다음 문이 열려요" });
  box.append(el("div", { class: "result-actions" }, [
    el("button", { class: "btn ghost small", text: "🔄 다시 풀기", onclick: () => { closeM(); go({ screen: "game", stageId: problem.id }); } }),
    advanceBtn,
    el("button", { class: "btn secondary small", text: "📖 완전 해설", onclick: () => openExplanation(problem, teacherOn()) }),
  ]));

  const closeM = modal("📊 채점 & 해설", box);
  beep(res.isCorrect ? "win" : res.partial ? "good" : "bad");
}

function nextStage(problem) {
  const list = stagesOfWorld(problem.world);
  const idx = list.findIndex(p => p.id === problem.id);
  return list[idx + 1] || null;
}

// ---------------- 시작 ----------------
// QR/링크(?g=코드)면 학생 시작화면(닉네임만). 아니면(기본 URL=교사) 바로 교사 허브.
go({ screen: URL_GROUP ? "start" : "teacher" });
