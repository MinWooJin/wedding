/** 사진 n장 → 세로 복도 맵. 액자는 2행 간격으로 좌(tx1)/우(tx9) 번갈아. */
export function galleryLayout(n) {
  const pairs = Math.max(1, Math.ceil(n / 2));
  const h = 2 + pairs * 2 + 2;
  const rows = ['KKKKKKKKKKK'];
  for (let y = 1; y < h - 1; y++) rows.push('KDDDDDDDDDK');
  rows.push('KKKKKDKKKKK');
  const frames = [];
  for (let i = 0; i < n; i++) {
    const ty = 2 + Math.floor(i / 2) * 2;
    const left = i % 2 === 0;
    frames.push({ index: i, tx: left ? 1 : 9, ty, stand: { tx: left ? 2 : 8, ty } });
  }
  return { rows, frames, exit: { tx: 5, ty: h - 1 }, spawn: { tx: 5, ty: h - 2 } };
}
