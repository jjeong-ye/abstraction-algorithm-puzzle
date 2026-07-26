// 최대의 길: 왼쪽아래→오른쪽위, 위/오른쪽 이동, 최대 합 (DP + 완전탐색 대조)
// grid[r][c], r=0이 맨 위 행. start/end: [r,c]
export function solveMaxPathDP(grid) {
  const R = grid.length, C = grid[0].length;
  const best = Array.from({ length: R }, () => new Array(C).fill(-Infinity));
  best[R - 1][0] = grid[R - 1][0]; // 시작: 왼쪽 아래
  for (let r = R - 1; r >= 0; r--) {
    for (let c = 0; c < C; c++) {
      if (r === R - 1 && c === 0) continue;
      const fromDown = r + 1 < R ? best[r + 1][c] : -Infinity; // 아래에서 위로
      const fromLeft = c - 1 >= 0 ? best[r][c - 1] : -Infinity; // 왼쪽에서 오른쪽
      const prev = Math.max(fromDown, fromLeft);
      if (prev > -Infinity) best[r][c] = prev + grid[r][c];
    }
  }
  return best[0][C - 1]; // 오른쪽 위
}
export function solveMaxPathBrute(grid) {
  const R = grid.length, C = grid[0].length;
  let mx = -Infinity;
  (function go(r, c, sum) {
    sum += grid[r][c];
    if (r === 0 && c === C - 1) { mx = Math.max(mx, sum); return; }
    if (r - 1 >= 0) go(r - 1, c, sum); // 위
    if (c + 1 < C) go(r, c + 1, sum);  // 오른쪽
  })(R - 1, 0, 0);
  return mx;
}
