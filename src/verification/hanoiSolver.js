// 하노이 타워: 최소 이동 = 2^n - 1, 재귀 이동열 생성
export function hanoiMoves(n, from = "A", via = "B", to = "C") {
  const moves = [];
  (function rec(k, a, b, c) {
    if (k === 0) return;
    rec(k - 1, a, c, b);
    moves.push([a, c]);
    rec(k - 1, b, a, c);
  })(n, from, via, to);
  return moves;
}
export function minHanoi(n) { return Math.pow(2, n) - 1; }

// 규칙(작은 원반 위 큰 원반 금지)을 지키며 이동열이 목표를 달성하는지 검증
export function verifyHanoi(n, moves) {
  const pegs = { A: [], B: [], C: [] };
  for (let i = n; i >= 1; i--) pegs.A.push(i);
  for (const [f, t] of moves) {
    const disk = pegs[f].pop();
    if (disk === undefined) return { ok: false, reason: "빈 기둥에서 옮김" };
    if (pegs[t].length && pegs[t][pegs[t].length - 1] < disk)
      return { ok: false, reason: "큰 원반을 작은 원반 위에 놓음" };
    pegs[t].push(disk);
  }
  const done = pegs.C.length === n;
  return { ok: done, moves: moves.length };
}
