/** 사진 n장 → 세로 복도 맵. 액자(64×64, 2×2칸)는 3행 간격으로 좌(tx1~2)/우(tx8~9) 번갈아. 서는 자리는 액자 옆 아래 칸. */
export function galleryLayout(n) {
  const pairs = Math.max(1, Math.ceil(n / 2));
  // 사진이 없을 때도 12행: 안내 이젤과 가운데 두 사람, 들어온 하객이 겹치지 않을 만큼
  const h = Math.max(12, 1 + pairs * 4 + 2);
  const rows = ['KKKKKKKKKKK'];
  for (let y = 1; y < h - 1; y++) rows.push('KDDDDDDDDDK');
  rows.push('KKKKKDKKKKK');
  const frames = [];
  for (let i = 0; i < n; i++) {
    const ty = 1 + Math.floor(i / 2) * 4;
    const left = i % 2 === 0;
    frames.push({ index: i, tx: left ? 1 : 7, ty, stand: { tx: left ? 4 : 6, ty: ty + 2 } });
  }
  // 두 사람 자리: 가운데 통로에서 방 한가운데에 가장 가까운 줄. 액자 앞 설 자리(ty+2) 줄은 피한다(4k+2 줄).
  // 사진이 없으면 안내 이젤 아래 가운데.
  const center = (h - 1) / 2;
  const hostRow = n === 0 ? 7
    : [...Array(h).keys()].filter((r) => r % 4 === 2 && r <= h - 4).reduce((a, b) => (Math.abs(b - center) < Math.abs(a - center) ? b : a), 2);
  return { rows, frames, exit: { tx: 5, ty: h - 1 }, spawn: { tx: 5, ty: h - 2 }, hostRow };
}
