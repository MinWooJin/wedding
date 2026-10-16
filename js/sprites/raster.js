/**
 * @typedef {{w:number,h:number,px:(string|null)[][]}} Sprite
 */

/** 문자열 배열 + 팔레트 → Sprite. 팔레트에 없는 문자/행 길이 불일치는 에러. */
export function parseSprite(rows, palette) {
  const w = rows[0].length;
  const px = rows.map((row, y) => {
    if (row.length !== w) throw new Error(`row ${y} length ${row.length} != ${w}`);
    return [...row].map((ch) => {
      if (!(ch in palette)) throw new Error(`unknown palette char "${ch}"`);
      return palette[ch];
    });
  });
  return { w, h: rows.length, px };
}

export function flipX(sprite) {
  return { w: sprite.w, h: sprite.h, px: sprite.px.map((row) => [...row].reverse()) };
}

/** 여러 Sprite를 세로로 이어붙인다(머리+다리 조합용). 폭이 같아야 한다. */
export function stackY(...sprites) {
  const w = sprites[0].w;
  for (const s of sprites) if (s.w !== w) throw new Error('stackY width mismatch');
  return { w, h: sprites.reduce((a, s) => a + s.h, 0), px: sprites.flatMap((s) => s.px) };
}

/** 정수 배율 확대(nearest). 16px 코드 그림을 32px 타일 격자에 맞출 때 사용. */
export function scaleSprite(sprite, k) {
  const px = [];
  for (const row of sprite.px) {
    const r = row.flatMap((c) => Array(k).fill(c));
    for (let i = 0; i < k; i++) px.push(r);
  }
  return { w: sprite.w * k, h: sprite.h * k, px };
}

/** 왼쪽 절반 행들을 받아 좌우 대칭인 전체 행을 만든다(대칭 오브젝트 제작용). */
export function mirrorRows(halfRows) {
  return halfRows.map((r) => r + [...r].reverse().join(''));
}
