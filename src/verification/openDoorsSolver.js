// 30개의 열린 문: 시뮬레이션 + 약수(제곱수) 이론 대조
export function simulateDoors(n, startOpen = true) {
  const door = new Array(n + 1).fill(startOpen); // door[1..n]
  for (let k = 1; k <= n; k++)
    for (let d = k; d <= n; d += k) door[d] = !door[d];
  const open = [], closed = [];
  for (let i = 1; i <= n; i++) (door[i] ? open : closed).push(i);
  return { openCount: open.length, open, closed };
}

// 이론: 약수 개수가 홀수인 수 = 제곱수. 시작이 열림이면 제곱수만 닫힘.
export function theoryDoors(n, startOpen = true) {
  const squares = [];
  for (let i = 1; i * i <= n; i++) squares.push(i * i);
  const closed = startOpen ? squares : Array.from({ length: n }, (_, i) => i + 1).filter(x => !squares.includes(x));
  const openCount = n - closed.length;
  return { openCount, closed };
}
