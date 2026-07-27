// 물항아리 최소 붓기 횟수 (BFS로 상태 그래프 최단 경로)
// 상태: [a,b,c] 각 항아리의 물 양. caps: 용량.
export function solveWaterJug(caps, start, goal) {
  const key = (s) => s.join(",");
  const q = [{ s: start.slice(), d: 0, path: [start.slice()] }];
  const seen = new Set([key(start)]);
  while (q.length) {
    const { s, d, path } = q.shift();
    if (goal.every((g, i) => g === s[i])) return { minPours: d, path };
    for (let i = 0; i < s.length; i++) {
      for (let j = 0; j < s.length; j++) {
        if (i === j) continue;
        const amt = Math.min(s[i], caps[j] - s[j]);
        if (amt <= 0) continue;
        const ns = s.slice();
        ns[i] -= amt; ns[j] += amt;
        if (!seen.has(key(ns))) { seen.add(key(ns)); q.push({ s: ns, d: d + 1, path: [...path, ns] }); }
      }
    }
  }
  return { minPours: -1, path: [] };
}

// 특정 이동열이 규칙을 지키며 목표에 도달하는지 검사
export function verifyWaterJugMoves(caps, start, moves, goal) {
  let s = start.slice();
  for (const [i, j] of moves) {
    const amt = Math.min(s[i], caps[j] - s[j]);
    if (amt <= 0) return { ok: false, reason: "빈 항아리를 붓거나 가득 찬 항아리에 부음" };
    s = s.slice(); s[i] -= amt; s[j] += amt;
  }
  return { ok: goal.every((g, k) => g === s[k]), final: s };
}
