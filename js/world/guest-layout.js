/** rows에서 'G' 또는 'W' 타일 중 exclude("tx,ty")에 없는 타일 목록(행 우선) */
export function freeTiles(rows, exclude = new Set()) {
  const out = [];
  rows.forEach((row, ty) => [...row].forEach((ch, tx) => {
    if ((ch === 'G' || ch === 'W') && !exclude.has(`${tx},${ty}`)) out.push({ tx, ty });
  }));
  return out;
}

/** 결정적 셔플(LCG) 후 앞에서 count개. 같은 seed면 같은 결과. */
export function pickTiles(tiles, count, seed) {
  const arr = tiles.slice();
  let s = (seed >>> 0) || 1;
  const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, Math.min(count, arr.length));
}
