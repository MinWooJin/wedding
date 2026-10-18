/** 사진 n장 → 세로 복도 맵. 세로 액자(96×112, 3칸×4행)는 5행 간격으로 좌(tx1~3)/우(tx7~9) 번갈아. 서는 자리는 액자 옆 맨 아래 줄. */
export const FRAME_ROWS = 4, PAIR_ROWS = 5;
export function galleryLayout(n) {
  const pairs = Math.max(1, Math.ceil(n / 2));
  // 사진이 없을 때도 12행: 안내 이젤과 가운데 두 사람, 들어온 하객이 겹치지 않을 만큼
  const h = Math.max(12, 1 + pairs * PAIR_ROWS + 2);
  const rows = ['KKKKKKKKKKK'];
  for (let y = 1; y < h - 1; y++) rows.push('KDDDDDDDDDK');
  rows.push('KKKKKKKKKKK'); // 아래 벽도 막는다(나가기는 하단 "정원으로" 버튼)
  const frames = [];
  for (let i = 0; i < n; i++) {
    const ty = 1 + Math.floor(i / 2) * PAIR_ROWS;
    const left = i % 2 === 0;
    frames.push({ index: i, tx: left ? 1 : 7, ty, stand: { tx: left ? 4 : 6, ty: ty + FRAME_ROWS - 1 } });
  }
  // 두 사람 자리: 가운데 통로에서 방 한가운데에 가장 가까운 줄. 액자 앞 설 자리(ty+3) 줄은 피한다.
  // 사진이 없으면 안내 이젤 아래 가운데.
  const center = (h - 1) / 2;
  const hostRow = n === 0 ? 7
    : [...Array(h).keys()].filter((r) => r >= 2 && r <= h - 4 && !frames.some((f) => f.stand.ty === r))
      .reduce((a, b) => (Math.abs(b - center) < Math.abs(a - center) ? b : a));
  return { rows, frames, exit: { tx: 5, ty: h - 1 }, spawn: { tx: 5, ty: h - 2 }, hostRow };
}
