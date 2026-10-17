/** Restore archived wedding art on the painted map without changing its paths. */
export const WEDDING_FLOWERS = [
  // Large rose arrangements at the stage and entrance; low hydrangeas between.
  ['aisle-flower-left', 92, 192, 36, 54],
  ['aisle-flower-right', 224, 192, 36, 54],
  ['aisle-flower-airy-left', 104, 352, 24, 36],
  ['aisle-flower-airy-right', 224, 352, 24, 36],
  ['aisle-flower-left', 92, 512, 36, 54],
  ['aisle-flower-right', 224, 512, 36, 54],
];

// Wider near the stage and entrance, lower and lighter along the middle.
const FLOWER_PROFILE = [[184,40], [224,38], [280,28], [328,24], [368,30], [408,24], [472,26], [520,36], [560,40], [576,40]];
export function flowerBedWidth(y) {
  for (let i = 1; i < FLOWER_PROFILE.length; i++) {
    const [end, b] = FLOWER_PROFILE[i], [start, a] = FLOWER_PROFILE[i - 1];
    if (y <= end) {
      const t = Math.max(0, (y - start) / (end - start));
      const eased = t * t * (3 - 2 * t);
      // Fixed small leaf edges, never animated with the camera or characters.
      const leaf = y > 224 && y < 520 ? [0,1,1,0,-1,-1][Math.floor(y / 3) % 6] : 0;
      return Math.max(24, Math.min(40, Math.round(a + (b - a) * eased) + leaf));
    }
  }
  return 40;
}

function shapeFlowerBeds(ctx, map, grass) {
  if (!grass) return; // Missing grass art must never erase the original garden.
  for (const x of [80, 224]) {
    // Include the old bed's tiny overhanging leaves, which otherwise remain as dots.
    ctx.save(); ctx.beginPath(); ctx.rect(x, 184, 48, 392); ctx.clip();
    for (let y = Math.floor(184 / grass.height) * grass.height; y < 576; y += grass.height) {
      for (let gx = 0; gx < 352; gx += grass.width) ctx.drawImage(grass, gx, y);
    }
    ctx.restore();
  }
  for (let y = 184; y < 576; y++) {
    const w = flowerBedWidth(y);
    // Keep all pixels at their original world position; only thin the outside.
    ctx.drawImage(map, 128 - w, y, w, 1, 128 - w, y, w, 1);
    ctx.drawImage(map, 224, y, w, 1, 224, y, w, 1);
  }
}

/** Native canvas composition: reuse existing PNGs, keeping the base art intact. */
export function decorateWeddingHub(map, { top, guestbook, objects, grass }, create = (w, h) =>
  Object.assign(document.createElement('canvas'), { width: w, height: h })) {
  const canvas = create(map.width, map.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return map;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(map, 0, 0);
  shapeFlowerBeds(ctx, map, grass);
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
