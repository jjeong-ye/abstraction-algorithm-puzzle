// 자동 검증 테스트 — test.html에서 실행
// (1) solver 정답 검증  (2) 24개 스테이지 제출/노출 규칙 DOM 테스트  (3) 저장/이동 로직
import { solveWaterJug } from "./waterJugSolver.js";
import { solveBridge } from "./bridgeSolver.js";
import { simulateDoors, theoryDoors } from "./openDoorsSolver.js";
import { minHanoi, hanoiMoves, verifyHanoi } from "./hanoiSolver.js";
import { solveRiver } from "./riverCrossingSolver.js";
import { minWeighings, verify3Split } from "./coinSolver.js";
import { classifyEuler, findEulerTrail } from "./graphTrailSolver.js";
import { bestTake, firstPlayerWins, minimaxWin } from "./strategySolver.js";
import { solveMaxPathDP, solveMaxPathBrute } from "./maxPathSolver.js";
import { balancesWith } from "./mobileSolver.js";
import { PROBLEMS } from "../data.js";
import { ENGINES } from "../engines.js";
import { Store } from "../storage.js";

export function runTests() {
  const snapshot = JSON.parse(JSON.stringify(Store.data || {}));
  const R = [];
  const t = (name, got, exp) => R.push({ name, got: JSON.stringify(got), exp: JSON.stringify(exp), pass: JSON.stringify(got) === JSON.stringify(exp) });
  try { Store.setSetting("sound", false); } catch {}

  // ===== (1) solver 정답 검증 =====
  const wj = solveWaterJug([8, 5, 3], [8, 0, 0], [4, 4, 0]);
  t("[solver] B-01 물항아리 최소(7)", wj.minPours, 7);
  t("[solver] C-05 다리 최소(17)", solveBridge([1, 2, 5, 10]).minTime, 17);
  const sim = simulateDoors(30, true), th = theoryDoors(30, true);
  t("[solver] C-06 열린 문(25)", sim.openCount, 25);
  t("[solver] C-06 닫힌 문=제곱수", sim.closed, [1, 4, 9, 16, 25]);
  t("[solver] C-06 시뮬==이론", sim.openCount, th.openCount);
  t("[solver] B-07 하노이(7,15,31)", [minHanoi(3), minHanoi(4), minHanoi(5)], [7, 15, 31]);
  t("[solver] B-07 이동검증", verifyHanoi(4, hanoiMoves(4)).ok, true);
  t("[solver] B-08 농부(7)", solveRiver(["wolf", "goat", "cabbage"], [["wolf", "goat"], ["goat", "cabbage"]]).minCrossings, 7);
  t("[solver] B-05 9개 저울(2)", minWeighings(9), 2);
  t("[solver] 코인 27개(3)", minWeighings(27), 3);
  t("[solver] B-06 3등분 최악(2)", verify3Split(9), 2);
  const g = PROBLEMS.find(p => p.id === "B-09").config.grid;
  t("[solver] B-09 최대합(31)", solveMaxPathDP(g), 31);
  t("[solver] B-09 DP==완전탐색", solveMaxPathDP(g), solveMaxPathBrute(g));
  const c03 = PROBLEMS.find(p => p.id === "C-03").config;
  t("[solver] C-03 쾨니히스베르크(impossible)", classifyEuler(c03.nodes.map(n => n.id), c03.edges).type, "impossible");
  const c04 = PROBLEMS.find(p => p.id === "C-04").config;
  t("[solver] C-04 한붓그리기(trail)", classifyEuler(c04.nodes.map(n => n.id), c04.edges).type, "trail");
  t("[solver] C-04 경로 존재(9)", findEulerTrail(c04.nodes.map(n => n.id), c04.edges).length, 9);
  t("[solver] C-07 첫 수(1)", bestTake(30, 3, true), 1);
  t("[solver] C-07 선공 승리", firstPlayerWins(30, 3, true), true);
  t("[solver] C-07 미니맥스 대조", minimaxWin(30, 3, true), true);
  t("[solver] B-03 모빌 ?=6", balancesWith(PROBLEMS.find(p => p.id === "B-03").config.tree, 6), true);
  t("[solver] B-04 모빌 ?=4", balancesWith(PROBLEMS.find(p => p.id === "B-04").config.tree, 4), true);
  // 산술 검증
  let selfNums = []; for (let n = 1000; n <= 9998; n += 2) { const d = String(n).split("").map(Number); if (new Set(d).size !== 4 || d.includes(0)) continue; if (d.reduce((a, b) => a + b, 0) !== 10) continue; if (d[0] + d[1] !== d[2] + d[3]) continue; if (d[0] !== Math.max(...d)) continue; selfNums.push(n); }
  t("[solver] A-01 자기수(4132)", selfNums, [4132]);
  let coinN = []; for (let n = 2; n <= 14; n += 2) if (100 * n + 50 * (15 - n) === 50 * n + 150 * (15 - n)) coinN.push(n);
  t("[solver] C-01 동전(10)", coinN, [10]);
  { let daily = 1, total = 1; for (let d = 2; d <= 12; d++) { daily += d; total += daily; } t("[solver] C-02 선물(364)", total, 364); }

  // ===== (2) 24개 스테이지 · 제출/노출 규칙 DOM 테스트 =====
  const host = document.createElement("div"); host.style.display = "none"; document.body.appendChild(host);
  const manipEngines = ["waterjug", "hanoi", "river", "bridge", "balance", "maxpath", "graph", "orderSteps", "iterate", "deduce"];
  PROBLEMS.forEach(p => {
    host.innerHTML = "";
    let ctl;
    try { ctl = ENGINES[p.engine](host, p); } catch (e) { t(`[${p.id}] 엔진 마운트`, "error:" + e.message, "ok"); return; }
    const txt = (host.innerText || host.textContent || "");
    const fx = p.fullExplanation || {};
    const gs0 = (p.guidedSolution && p.guidedSolution[0]) || "###none###";
    // 1. 진입 직후 단계별 풀이(해설) 미노출
    t(`[${p.id}] (1)진입 시 단계풀이 미노출`, txt.includes(gs0), false);
    // 2. 진입 직후 핵심 조건/추상화 해설 미노출
    t(`[${p.id}] (2)진입 시 핵심/추상화 해설 미노출`, txt.includes(fx.key || "###") || txt.includes(fx.abstraction || "###"), false);
    // 3. 힌트에 완전 정답 미포함
    t(`[${p.id}] (3)힌트에 정답 미포함`, !!(p.hint1Observation && p.hint2KeyCondition && p.hint3NextAction) && !(p.hint3NextAction || "").includes(fx.answer || "###"), true);
    // 4. 채점은 submit() 게이트를 거쳐야 함
    t(`[${p.id}] (4)제출 함수 존재(해설 잠금)`, typeof ctl.submit === "function", true);
    // 5/6/7. 제출 결과 형식(제출 답 표시 포함)
    const res = ctl.submit();
    const wellFormed = !!res && (res.notReady === true || (typeof res.isCorrect === "boolean" && typeof res.answerText === "string"));
    t(`[${p.id}] (5-7)제출 결과 형식/제출답 표시`, wellFormed, true);
    // 진입 즉시 자동 정답 처리 안 됨
    t(`[${p.id}] 자동정답 방지`, res.notReady === true || res.isCorrect === false, true);
    // 8. 조작형은 풀이 과정 표 기록
    if (manipEngines.includes(p.engine) && !res.notReady) t(`[${p.id}] (8)풀이 과정표 존재`, !!res.processTable, true);
    // 9. 다시풀기 초기화 함수
    t(`[${p.id}] (9)다시풀기 초기화`, typeof ctl.restart === "function", true);
  });
  host.remove();

  // ===== (3) 저장/이동 로직 =====
  // 10. 제출 후 기록 보존 · 재열람
  Store.recordSubmission("ZZ-test", { isCorrect: false, score: 0, answerText: "테스트", lastSubmission: { isCorrect: false, answerText: "테스트" } });
  const rec = Store.getRecord("ZZ-test");
  t("[storage] (10)제출 기록 보존/재열람", rec.submitted === true && rec.explanationUnlocked === true && !!rec.lastSubmission, true);
  // 11. 다음 문제 이동 로직
  const list = PROBLEMS.filter(p => p.world === "abstraction");
  t("[logic] (11)다음 문제 이동", list[list.findIndex(p => p.id === "A-01") + 1].id, "A-02");
  // 정답 제출 시 cleared 처리
  Store.recordSubmission("ZZ-test2", { isCorrect: true, score: 100, moves: 7, answerText: "정답", lastSubmission: { isCorrect: true, answerText: "정답" } });
  t("[storage] 정답 제출 시 cleared", Store.getRecord("ZZ-test2").cleared, true);

  // 힌트는 클릭 때 이미 저장되므로 제출 시 이중 집계되면 안 됨
  Store.updateRecord("ZZ-hint", { hintsUsed: 0 });
  Store.addHint("ZZ-hint"); Store.addHint("ZZ-hint");
  Store.recordSubmission("ZZ-hint", { isCorrect: false, score: 0, hintsUsed: 2, answerText: "테스트", lastSubmission: { isCorrect: false, answerText: "테스트" } });
  t("[storage] 힌트 이중 집계 방지", Store.getRecord("ZZ-hint").hintsUsed, 2);

  // 열린 문 재시작 시 이전 답안 입력도 초기화되어야 함
  const dHost = document.createElement("div");
  const dProb = PROBLEMS.find(p => p.id === "C-06");
  const dCtl = ENGINES[dProb.engine](dHost, dProb);
  const dInput = dHost.querySelector("input");
  dInput.value = "25"; dCtl.restart();
  t("[C-06] 다시 시작 시 답 입력 초기화", dInput.value, "");

  // 테스트 페이지 실행이 실제 학생 기록을 오염시키지 않도록 복구
  Store.data = snapshot;
  Store._flush();
  return R;
}
