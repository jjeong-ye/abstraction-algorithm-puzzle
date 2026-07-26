// 폭탄(뺄셈 게임, misère): 마지막을 가져가면 패배
// 남은 수 n에서 '지금 가져갈 사람'이 이길 수 있는 최적 수. 없으면 0(패배 자리).
export function bestTake(remaining, maxTake = 3, loseOnLast = true) {
  // misère 규칙: 남은 수가 1이면 지금 사람은 마지막을 가져가야 하므로 패배
  if (loseOnLast) {
    // 패배 자리: remaining % (maxTake+1) === 1
    const mod = remaining % (maxTake + 1);
    if (mod === 1) return 0; // 어떤 수를 가져가도 진다
    // 상대를 (…≡1)로 몰기 위해 (mod-1)개, mod=0이면 maxTake
    return mod === 0 ? maxTake : mod - 1;
  } else {
    // 마지막 가져가면 승리(일반 Nim 뺄셈): 패배 자리 remaining % (maxTake+1) === 0
    const mod = remaining % (maxTake + 1);
    return mod === 0 ? 0 : mod;
  }
}
// 선공이 이기는가?
export function firstPlayerWins(total, maxTake = 3, loseOnLast = true) {
  return bestTake(total, maxTake, loseOnLast) !== 0;
}
// 미니맥스로 검증(작은 n)
export function minimaxWin(remaining, maxTake, loseOnLast) {
  const memo = new Map();
  function win(r) { // 지금 두는 사람이 이길 수 있나
    if (r === 0) return loseOnLast ? true : false; // 아무도 남은 게 없음(상대가 마지막을 이미 가져감)
    if (memo.has(r)) return memo.get(r);
    let res = false;
    for (let t = 1; t <= Math.min(maxTake, r); t++) {
      // 내가 t개 가져가고 마지막을 내가 가져가면?
      if (t === r) { // 마지막을 내가 가져감
        if (!loseOnLast) { res = true; break; }
        else continue; // 마지막 가져가면 패배 → 이 수는 승리 아님
      }
      if (!win(r - t)) { res = true; break; } // 상대가 지는 자리로 보냄
    }
    memo.set(r, res); return res;
  }
  return win(remaining);
}
