import { tileSprite } from './sprites/tiles.js';

export const TILE = 32;
export const VIEW_TILES_W = 11;
export const VIEW_W = TILE * VIEW_TILES_W; // 352

/**
 * 컨테이너 CSS 크기 → 배율과 내부 해상도.
 * 352px 이상이면 정수 배율(1~4), 그보다 좁은 화면이면 꽉 차게 소수 배율.
 */
export function computeViewport(cssW, cssH) {
  const scale = cssW >= VIEW_W ? Math.min(4, Math.floor(cssW / VIEW_W)) : cssW / VIEW_W;
  return { scale, width: VIEW_W, height: Math.ceil(cssH / scale) };
}

/** 코드 Sprite({w,h,px}) → 오프스크린 캔버스(캐시). 브라우저 전용. */
const spriteCache = new WeakMap();
export function spriteCanvas(sprite) {
  if (sprite.canvas) return sprite.canvas; // 이미지 스프라이트
  let c = spriteCache.get(sprite);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = sprite.w; c.height = sprite.h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(sprite.w, sprite.h);
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      const col = sprite.px[y][x];
      if (!col) continue;
      const i = (y * sprite.w + x) * 4;
      const n = parseInt(col.slice(1), 16);
      img.data[i] = (n >> 16) & 255; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  spriteCache.set(sprite, c);
  return c;
}

/** 캔버스 위에 월드를 그리는 어댑터. Scene.draw가 이 메서드들만 호출한다. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0 };
    this.view = { scale: 1, width: VIEW_W, height: 600 };
    this.tiles = {}; // id → 이미지 스프라이트(있으면 코드 타일 대신 사용)
    this.motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  }

  get reducedMotion() { return this.motionPreference?.matches ?? false; }

  resize(cssW, cssH) {
    this.view = computeViewport(cssW, cssH);
    this.canvas.width = this.view.width;
    this.canvas.height = this.view.height;
    this.canvas.style.width = `${this.view.width * this.view.scale}px`;
    this.canvas.style.height = `${this.view.height * this.view.scale}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  begin(bg) {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.view.width, this.view.height);
  }

  drawTile(id, x, y) { this.drawSprite(this.tiles[id] ?? tileSprite(id), x, y); }

  drawSprite(spr, x, y, motion = null) {
    const sx = Math.round(x - this.cam.x), sy = Math.round(y - this.cam.y);
    if (sx + spr.w < 0 || sy + spr.h < 0 || sx > this.view.width || sy > this.view.height) return;
    if (motion && !this.reducedMotion) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(sx + spr.w / 2, sy + spr.h - motion.lift);
      ctx.transform(1, 0, motion.lean, motion.scaleY, 0, 0);
      ctx.drawImage(spriteCanvas(spr), -spr.w / 2, -spr.h);
      ctx.restore();
    } else {
      this.ctx.drawImage(spriteCanvas(spr), sx, sy);
    }
  }

  /** 미리 그려둔 캔버스/이미지(썸네일, 맵 배경 등)를 월드 좌표에 그린다 */
  drawCanvas(c, x, y) {
    this.ctx.drawImage(c, Math.round(x - this.cam.x), Math.round(y - this.cam.y));
  }

  /** 반투명 검은 띠 위 흰 글씨 */
  drawNameTag(text, cx, topY) {
    const ctx = this.ctx;
    ctx.font = '11px Galmuri11, Galmuri9, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 8;
    const x = Math.round(cx - this.cam.x - w / 2), y = Math.round(topY - this.cam.y - 14);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x, y, w, 15);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 4, y + 2);
  }

  /** 흰 말풍선 + 꼬리, 폭 200px에서 줄바꿈 */
  drawBubble(text, cx, bottomY) {
    const ctx = this.ctx;
    ctx.font = '12px Galmuri11, Galmuri9, sans-serif';
    const maxW = 200, lineH = 16, lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 16;
    const h = lines.length * lineH + 10;
    let x = Math.round(cx - this.cam.x - w / 2);
    x = Math.max(4, Math.min(this.view.width - w - 4, x));
    const y = Math.round(bottomY - this.cam.y - h - 8);
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
    const tx = Math.round(cx - this.cam.x);
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(tx - 4, y + h, 8, 4); ctx.fillRect(tx - 2, y + h + 4, 4, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(tx - 2, y + h, 4, 2);
    ctx.fillStyle = '#2b1d14'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 5 + i * lineH));
  }

  /** 전환 페이드 */
  drawFade(alpha) {
    if (alpha <= 0) return;
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, this.view.width, this.view.height);
  }
}
