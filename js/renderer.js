export const TILE = 16;
export const VIEW_TILES_W = 11;
export const VIEW_W = TILE * VIEW_TILES_W; // 176

/** 컨테이너 CSS 크기 → 정수 배율과 내부 해상도 */
export function computeViewport(cssW, cssH) {
  const scale = Math.max(1, Math.min(4, Math.floor(cssW / VIEW_W)));
  return { scale, width: VIEW_W, height: Math.ceil(cssH / scale) };
}
