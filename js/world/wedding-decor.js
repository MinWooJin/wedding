/** Restore archived wedding art on the painted map without changing its paths. */
export const WEDDING_FLOWERS = [
  // Quiet ivory/blush floral islands, with open lawn between each pair.
  ['aisle-flower-left', 88, 192, 40, 60],
  ['aisle-flower-right', 224, 192, 40, 60],
  ['aisle-flower-airy-left', 96, 304, 32, 48],
  ['aisle-flower-airy-right', 224, 304, 32, 48],
  ['aisle-flower-airy-left', 96, 416, 32, 48],
  ['aisle-flower-airy-right', 224, 416, 32, 48],
  ['aisle-flower-left', 88, 512, 40, 60],
  ['aisle-flower-right', 224, 512, 40, 60],
];

function clearDenseFlowerBeds(ctx, grass) {
  if (!grass) return; // Missing grass art must never erase the original garden.
  for (const x of [80, 224]) {
    // Include the old bed's tiny overhanging leaves, which otherwise remain as dots.
    ctx.save(); ctx.beginPath(); ctx.rect(x, 184, 48, 392); ctx.clip();
    for (let y = Math.floor(184 / grass.height) * grass.height; y < 576; y += grass.height) {
      for (let gx = 0; gx < 352; gx += grass.width) ctx.drawImage(grass, gx, y);
    }
    ctx.restore();
  }
  // Do not restore the dense tiny-flower hedge. Individual arrangements below
  // provide the wedding rhythm, and the lawn remains open between them.
}

/** Native canvas composition: reuse existing PNGs, keeping the base art intact. */
export function decorateWeddingHub(map, { top, guestbook, objects, grass }, create = (w, h) =>
  Object.assign(document.createElement('canvas'), { width: w, height: h })) {
  const canvas = create(map.width, map.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return map;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(map, 0, 0);
  clearDenseFlowerBeds(ctx, grass);
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
