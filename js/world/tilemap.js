import { TILE } from '../renderer.js';
import { SOLID_TILES } from '../sprites/tiles.js';

/** 문자열 배열 → {w,h,rows}. 각 문자는 tiles.js의 타일 ID. */
export function parseMap(rows) {
  const w = rows[0].length;
  rows.forEach((r, y) => {
    if (r.length !== w) throw new Error(`map row ${y} length ${r.length} != ${w}`);
  });
  return { w, h: rows.length, rows };
}

export function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return 'X';
  return map.rows[ty][tx];
}

export function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

/** 월드 픽셀 사각형이 solid 타일 또는 extraSolid("tx,ty" 집합)에 걸치는지 */
export function rectBlocked(map, x, y, w, h, extraSolid) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (SOLID_TILES.has(tileAt(map, tx, ty))) return true;
      if (extraSolid.has(tileKey(tx, ty))) return true;
    }
  }
  return false;
}
