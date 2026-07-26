// 위조/다른 동전 찾기: N개에서 최소 저울질 횟수 = ceil(log3 N)
export function minWeighings(n) {
  let w = 0, cap = 1;
  while (cap < n) { cap *= 3; w++; }
  return w;
}
// 3등분 전략이 항상 하나의 후보로 좁혀지는지(방향 알려진 경우) 검증
export function verify3Split(n) {
  // 결정 트리: 매 저울질이 후보를 최대 3분할
  function decide(cands) {
    if (cands.length <= 1) return 0;
    const g = Math.ceil(cands.length / 3);
    // 좌 g, 우 g, 나머지 → 최악 그룹 크기
    const worst = Math.max(g, g, cands.length - 2 * g);
    return 1 + decide(new Array(worst).fill(0));
  }
  return decide(new Array(n).fill(0));
}
