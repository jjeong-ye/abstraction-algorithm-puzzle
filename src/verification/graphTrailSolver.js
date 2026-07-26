// 한붓그리기(오일러 경로/회로) 판정 + 경로 탐색
// nodes: [ids], edges: [[u,v],...] (평행변 허용)
export function degrees(nodes, edges) {
  const deg = {}; nodes.forEach(n => deg[n] = 0);
  edges.forEach(([u, v]) => { deg[u]++; deg[v]++; });
  return deg;
}
export function classifyEuler(nodes, edges) {
  const deg = degrees(nodes, edges);
  const odd = nodes.filter(n => deg[n] % 2 === 1);
  if (odd.length === 0) return { type: "circuit", odd, msg: "모든 차수 짝수 → 닫힌 한붓그리기(회로) 가능" };
  if (odd.length === 2) return { type: "trail", odd, msg: "홀수 차수 2개 → 열린 한붓그리기 가능(그 두 점에서 시작/끝)" };
  return { type: "impossible", odd, msg: "홀수 차수 점이 " + odd.length + "개 → 한붓그리기 불가능" };
}
// 실제 오일러 경로 하나 찾기(Hierholzer). 없으면 null.
export function findEulerTrail(nodes, edges) {
  const cls = classifyEuler(nodes, edges);
  if (cls.type === "impossible") return null;
  const adj = {}; nodes.forEach(n => adj[n] = []);
  edges.forEach(([u, v], i) => { adj[u].push({ to: v, id: i }); adj[v].push({ to: u, id: i }); });
  const used = new Array(edges.length).fill(false);
  const start = cls.type === "trail" ? cls.odd[0] : nodes[0];
  const stack = [start], trail = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    const e = adj[v].find(x => !used[x.id]);
    if (e) { used[e.id] = true; stack.push(e.to); }
    else trail.push(stack.pop());
  }
  return trail.length === edges.length + 1 ? trail.reverse() : null;
}
