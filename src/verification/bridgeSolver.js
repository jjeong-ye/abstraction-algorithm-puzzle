// 다리 건너기 최소 시간: 유한 상태 그래프에서 다익스트라 탐색
// times: 각 사람의 이동 시간 배열
// 상태: mask = 건너편(far)에 있는 사람 비트, torch = 0(출발쪽)/1(건너편)
export function solveBridge(times) {
  const n = times.length;
  const full = (1 << n) - 1;
  const startKey = "0|0";
  const goalKey = `${full}|1`;
  const dist = new Map([[startKey, 0]]);
  const prev = new Map();
  const pq = [{ cost: 0, mask: 0, torch: 0 }];

  const push = (cost, mask, torch, fromKey, move) => {
    const key = `${mask}|${torch}`;
    if (cost < (dist.get(key) ?? Infinity)) {
      dist.set(key, cost);
      prev.set(key, { fromKey, move });
      pq.push({ cost, mask, torch });
    }
  };

  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const cur = pq.shift();
    const curKey = `${cur.mask}|${cur.torch}`;
    if (cur.cost !== dist.get(curKey)) continue;
    if (curKey === goalKey) break;

    if (cur.torch === 0) {
      const near = [];
      for (let i = 0; i < n; i++) if (((cur.mask >> i) & 1) === 0) near.push(i);
      for (let a = 0; a < near.length; a++) {
        for (let b = a; b < near.length; b++) {
          const movers = a === b ? [near[a]] : [near[a], near[b]];
          let nm = cur.mask;
          movers.forEach(i => { nm |= (1 << i); });
          const step = Math.max(...movers.map(i => times[i]));
          push(cur.cost + step, nm, 1, curKey, { movers, direction: "near-to-far", step });
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        if ((cur.mask >> i) & 1) {
          const nm = cur.mask & ~(1 << i);
          push(cur.cost + times[i], nm, 0, curKey, { movers: [i], direction: "far-to-near", step: times[i] });
        }
      }
    }
  }

  const minTime = dist.get(goalKey) ?? Infinity;
  const path = [];
  if (Number.isFinite(minTime)) {
    let key = goalKey;
    while (key !== startKey) {
      const p = prev.get(key);
      if (!p) break;
      path.push(p.move);
      key = p.fromKey;
    }
    path.reverse();
  }
  return { minTime, path };
}
