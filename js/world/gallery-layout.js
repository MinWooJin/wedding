/** 사진 n장 → 세로 복도 맵. 액자(64×64, 2×2칸)는 3행 간격으로 좌(tx1~2)/우(tx8~9) 번갈아. 서는 자리는 액자 옆 아래 칸. */
export function galleryLayout(n) {
  const pairs = Math.max(1, Math.ceil(n / 2));
  const h = 1 + pairs * 3 + 2;
  const rows = ['KKKKKKKKKKK'];
  for (let y = 1; y < h - 1; y++) rows.push('KDDDDDDDDDK');
  rows.push('KKKKKDKKKKK');
  const frames = [];
  for (let i = 0; i < n; i++) {
    const ty = 1 + Math.floor(i / 2) * 3;
    const left = i % 2 === 0;
    frames.push({ index: i, tx: left ? 1 : 8, ty, stand: { tx: left ? 3 : 7, ty: ty + 1 } });
  }
  return { rows, frames, exit: { tx: 5, ty: h - 1 }, spawn: { tx: 5, ty: h - 2 } };
}
