/** 타임라인 n개 → 세로 산책로. 이정표는 (3,2),(7,4),(3,6)... 끝에 벤치, 맨 아래 출구. */
export function storyLayout(n) {
  const h = 2 + n * 2 + 4;
  const rows = ['HHHHHHHHHHH'];
  for (let y = 1; y < h - 1; y++) rows.push(y % 3 === 0 ? 'HGWGGPGGWGH' : 'HGGGGPGGGGH');
  rows.push('HHHHHPHHHHH');
  const signs = Array.from({ length: n }, (_, i) => ({ index: i, tx: i % 2 === 0 ? 3 : 7, ty: 2 + i * 2 }));
  return { rows, signs, bench: { tx: 6, ty: h - 4 }, spawn: { tx: 5, ty: 1 }, exit: { tx: 5, ty: h - 1 } };
}
