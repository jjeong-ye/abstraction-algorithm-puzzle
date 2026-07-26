// 농부의 강 건너기: BFS 최단 건너기 횟수
// 상태: {items:Set(저쪽에 있는 것), farmer:0/1}  0=이쪽,1=저쪽
// conflicts: 농부 없는 쪽에 함께 있으면 안 되는 쌍
export function solveRiver(items, conflicts) {
  const all = items.slice(); // ['wolf','goat','cabbage']
  const startSide = new Set();          // 저쪽(far)에 있는 것들
  const key = (far, farmer) => [...far].sort().join("|") + "#" + farmer;
  const safe = (far, farmer) => {
    // 농부가 없는 쪽 확인
    const nearHasFarmer = farmer === 0;
    const near = new Set(all.filter(x => !far.has(x)));
    const check = (setSide) => conflicts.every(([a, b]) => !(setSide.has(a) && setSide.has(b)));
    if (nearHasFarmer) return check(far);        // far에 농부 없음
    else return check(near);                     // near에 농부 없음
  };
  const startFar = new Set(), startFarmer = 0;
  const q = [{ far: startFar, farmer: startFarmer, d: 0, path: [] }];
  const seen = new Set([key(startFar, startFarmer)]);
  while (q.length) {
    const cur = q.shift();
    if (cur.far.size === all.length && cur.farmer === 1)
      return { minCrossings: cur.d, path: cur.path };
    // 이동: 농부가 있는 쪽에서 0 또는 1개를 데리고 반대편으로
    const farmerSide = cur.farmer; // 0 near,1 far
    const cargoPool = cur.farmer === 1 ? [...cur.far] : all.filter(x => !cur.far.has(x));
    const options = [null, ...cargoPool];
    for (const carry of options) {
      const nf = new Set(cur.far);
      if (cur.farmer === 0) { // near->far
        if (carry) nf.add(carry);
      } else { // far->near
        if (carry) nf.delete(carry);
      }
      const nFarmer = cur.farmer === 0 ? 1 : 0;
      if (!safe(nf, nFarmer)) continue;
      const kk = key(nf, nFarmer);
      if (seen.has(kk)) continue;
      seen.add(kk);
      q.push({ far: nf, farmer: nFarmer, d: cur.d + 1, path: [...cur.path, carry || "농부만"] });
    }
  }
  return { minCrossings: -1, path: [] };
}
