/**
 * 사진 n장 → 세로 복도 맵. 세로 액자(96×112, 3칸×4행).
 * - 짝수 장: 5행 간격으로 좌(tx1~3)/우(tx7~9) 한 쌍씩.
 * - 홀수 장: 첫 사진을 맨 위 가운데(tx4~6)에 크게 걸고, 나머지를 그 아래에 좌/우 한 쌍씩(삼각형으로 균형 있게).
 * 서는 자리는 좌우 액자는 옆 맨 아래 줄, 가운데 액자는 바로 아래 칸.
 */
export const FRAME_ROWS = 4, PAIR_ROWS = 5;
export function galleryLayout(n) {
  const frames = [];
  const centered = n % 2 === 1;
  if (centered) frames.push({ index: 0, tx: 4, ty: 1, stand: { tx: 5, ty: 1 + FRAME_ROWS } });
  const pairStart = centered ? 1 + FRAME_ROWS + 1 : 1; // 가운데 액자 아래 설 자리 한 줄을 비운다
  const rest = centered ? n - 1 : n;
  for (let k = 0; k < rest; k++) {
    const ty = pairStart + Math.floor(k / 2) * PAIR_ROWS;
    const left = k % 2 === 0;
    frames.push({ index: frames.length, tx: left ? 1 : 7, ty, stand: { tx: left ? 4 : 6, ty: ty + FRAME_ROWS - 1 } });
  }
  const pairs = Math.ceil(rest / 2);
  // 사진이 없을 때도 12행: 안내 이젤과 가운데 두 사람, 들어온 하객이 겹치지 않을 만큼
  const h = Math.max(12, pairStart + Math.max(pairs, centered ? 0 : 1) * PAIR_ROWS + 2);
  const rows = ['KKKKKKKKKKK'];
  for (let y = 1; y < h - 1; y++) rows.push('KDDDDDDDDDK');
  rows.push('KKKKKKKKKKK'); // 아래 벽도 막는다(나가기는 하단 "정원으로" 버튼)
  // 두 사람 자리: 가운데 통로.
  // - 가운데 액자가 있으면 그 아래 첫 쌍 사이(액자 두 장 가운데)에 선다.
  // - 아니면 방 한가운데에 가장 가까운, 액자 앞 설 자리(ty+3)가 아닌 줄. 사진이 없으면 안내 이젤 아래 가운데.
  const center = (h - 1) / 2;
  const hostRow = n === 0 ? 7
    : centered ? pairStart + 1
      : [...Array(h).keys()].filter((r) => r >= 2 && r <= h - 4 && !frames.some((f) => f.stand.ty === r))
        .reduce((a, b) => (Math.abs(b - center) < Math.abs(a - center) ? b : a));
  return { rows, frames, exit: { tx: 5, ty: h - 1 }, spawn: { tx: 5, ty: h - 2 }, hostRow };
}
