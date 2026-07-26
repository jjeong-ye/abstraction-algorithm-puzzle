// 모빌 평형: 트리에서 각 막대의 (거리×무게합)이 좌우 같은지 검사
// node: {type:'leaf', w} 또는 {type:'bar', left:{dist,node}, right:{dist,node}}
export function totalWeight(node) {
  if (node.type === "leaf") return node.w || 0;
  return totalWeight(node.left.node) + totalWeight(node.right.node);
}
export function isBalanced(node) {
  if (node.type === "leaf") return true;
  const lm = node.left.dist * totalWeight(node.left.node);
  const rm = node.right.dist * totalWeight(node.right.node);
  return lm === rm && isBalanced(node.left.node) && isBalanced(node.right.node);
}
// 미지수(unknown leaf)에 값 val을 넣고 평형이면 true
export function balancesWith(tree, val) {
  const clone = JSON.parse(JSON.stringify(tree));
  (function set(n) {
    if (n.type === "leaf") { if (n.unknown) n.w = val; return; }
    set(n.left.node); set(n.right.node);
  })(clone);
  return isBalanced(clone);
}
