/** Restore archived wedding art on the painted map without changing its paths. */
export const WEDDING_FLOWERS = [
  // Large rose arrangements at the stage and entrance; low hydrangeas between.
  ['aisle-flower-left', 88, 190, 40, 60],
  ['aisle-flower-right', 224, 190, 40, 60],
  ['aisle-flower-airy-left', 94, 344, 34, 51],
  ['aisle-flower-airy-right', 224, 362, 34, 51],
  ['aisle-flower-left', 88, 496, 40, 60],
  ['aisle-flower-right', 224, 496, 40, 60],
];

/** Native canvas composition: reuse existing PNGs, keeping the base art intact. */
export function decorateWeddingHub(map, { top, guestbook, objects }, create = (w, h) =>
  Object.assign(document.createElement('canvas'), { width: w, height: h })) {
  const canvas = create(map.width, map.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return map;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(map, 0, 0);
  if (top && guestbook) {
    // The already repaired cherry canopy occupies this corner in the guestbook.
    // Reuse the complete canopy and matching grass, then restore arch overlaps.
    ctx.drawImage(guestbook, 256, 0, 96, 128, 256, 0, 96, 128);
    ctx.save(); ctx.translate(96, 0); ctx.scale(-1, 1);
    ctx.drawImage(guestbook, 256, 0, 96, 128, 0, 0, 96, 128);
    ctx.restore();
    ctx.drawImage(top, 76, 64, 24, 64, 76, 64, 24, 64);
    ctx.drawImage(top, 252, 64, 24, 64, 252, 64, 24, 64);
  }
  for (const [id, x, y, w, h] of WEDDING_FLOWERS) {
    const sprite = objects[id];
    if (sprite?.canvas) ctx.drawImage(sprite.canvas, x, y, w, h);
  }
  return canvas;
}

/** A single reception vignette between the upper and lower pairs of signs. */
export const WEDDING_RECEPTION = [
  { id: 'reception-lantern', sprite: 'ribbon-lantern', tx: 3, ty: 20, solid: false },
  { id: 'reception-table', sprite: 'party-table', tx: 4, ty: 20, solid: false },
  { id: 'cake-display', sprite: 'wedding-cake', tx: 5, ty: 19, solid: false },
];
