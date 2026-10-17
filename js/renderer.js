import { tileSprite } from './sprites/tiles.js';

export const TILE = 32;
// 그려진 정원의 양끝을 보존한다. 320px만 확대하면 나무가 다시 잘리고 가로 카메라도 흔들린다.
export const VIEW_TILES_W = 11;
export const VIEW_W = TILE * VIEW_TILES_W; // 352
/** 지도 폭(11칸). 배율을 정한 뒤 화면에 여유가 있으면(데스크톱) 이 폭까지 더 보여 준다. */
export const MAX_VIEW_W = TILE * 11; // 352

/**
 * 컨테이너 CSS 크기 → 배율과 내부 해상도.
 * 내부 폭352px 전체를 화면에 맞춘다(390폭 약1.11배, 430폭 약1.22배). 정수 배율로 묶으면 큰 폰일수록
 * 좌우가 비고 글씨가 작아진다. 캔버스는 기기 해상도로 그려서(resize) 소수 배율의 픽셀 불균일이 보이지 않는다.
 */
export function computeViewport(cssW, cssH, dpr = 1) {
  let scale = Math.min(4, cssW / VIEW_W);
  // 기기 픽셀 비율이 낮은 화면(데스크톱)에서는 소수 배율이 픽셀을 1칸·2칸으로 들쭉날쭉 늘려 그림이 울퉁불퉁해진다.
  // 그런 화면에서는 정수 배율로 내리고 남는 좌우는 잔디 배경으로 채운다. 고해상도 폰(2~3배)에서는 티가 나지 않아 꽉 채운다.
  if (dpr < 2 && scale >= 1) scale = Math.floor(scale);
  const width = Math.max(VIEW_W, Math.min(MAX_VIEW_W, Math.floor(cssW / scale)));
  return { scale, width, height: Math.ceil(cssH / scale) };
}

/** 이름표·말풍선·문 이름표 글씨(내부 px). 화면 배율이 곱해져 390폭에서 약 13·16·13px. */
export const TEXT = { name: 12, bubble: 14, bubbleLine: 18, label: 12 };

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
    this.groundCache = new WeakMap();
    this.backdropPatterns = new Map();
  }

  get reducedMotion() { return this.motionPreference?.matches ?? false; }

  resize(cssW, cssH) {
    // 캔버스 실제 픽셀 = CSS 크기 × 기기 픽셀 비율. 그리기는 내부 좌표 그대로 하고 변환 행렬로 키운다.
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    this.view = computeViewport(cssW, cssH, dpr);
    this.pixelRatio = this.view.scale * dpr;
    this.canvas.width = Math.round(this.view.width * this.pixelRatio);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${this.view.width * this.view.scale}px`;
    this.canvas.style.height = `${this.view.height * this.view.scale}px`;
    this.ctx.setTransform?.(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** 입장하는 하객의 반투명(0~1). 다음 호출 전까지 이후 그리기에 적용된다. */
  setAlpha(alpha) { this.ctx.globalAlpha = alpha; }

  begin(bg) {
    if (this.pixelRatio) this.ctx.setTransform?.(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.view.width, this.view.height);
  }

  drawTile(id, x, y) {
    const spr = this.tiles[id] ?? tileSprite(id);
    if (['G', 'J', 'U'].includes(id) && spr.w > TILE && spr.h > TILE) {
      const sx = ((x % spr.w) + spr.w) % spr.w, sy = ((y % spr.h) + spr.h) % spr.h;
      this.ctx.drawImage(spriteCanvas(spr), sx, sy, TILE, TILE, Math.round(x-this.cam.x), Math.round(y-this.cam.y), TILE, TILE);
    } else this.drawSprite(spr, x, y);
  }

  /** 맵 밖도 월드 좌표와 같은 위상의 잔디로 채운다. 반복 패턴은 타일 교체 때만 만든다. */
  drawBackdrop(id) {
    const ctx = this.ctx;
    if (!ctx.createPattern) return;
    const sprite = this.tiles[id] ?? tileSprite(id);
    let entry = this.backdropPatterns.get(id);
    if (!entry || entry.sprite !== sprite) {
      entry = { sprite, pattern: ctx.createPattern(spriteCanvas(sprite), 'repeat') };
      this.backdropPatterns.set(id, entry);
    }
    if (!entry.pattern) return;
    const x = -(Math.round(this.cam.x) % (sprite.w ?? TILE)), y = -(Math.round(this.cam.y) % (sprite.h ?? TILE));
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = entry.pattern;
    ctx.fillRect(-x, -y, this.view.width, this.view.height); ctx.restore();
  }

  /** 정적 타일·바닥 장식은 씬당 한 번 합성하고 카메라 위치만 바꿔 그린다. */
  drawGround(map, bgImage, floors, groundTile = null) {
    // 긴 갤러리는 거대한 캔버스를 만들지 않고 기존 가시 영역 렌더링으로 돌아간다.
    if (map.w * TILE * map.h * TILE > 2_000_000) return false;
    let cached = this.groundCache.get(map);
    if (!cached || cached.tiles !== this.tiles || cached.bgImage !== bgImage || cached.groundTile !== groundTile || cached.floors.length !== floors.length || cached.floors.some((o, i) => o !== floors[i])) {
      const canvas = document.createElement('canvas');
      canvas.width = map.w * TILE; canvas.height = map.h * TILE;
      const context = canvas.getContext('2d');
      if (!context) return false;
      const painter = Object.create(this);
      painter.ctx = context; painter.ctx.imageSmoothingEnabled = false;
      painter.cam = { x: 0, y: 0 }; painter.view = { width: canvas.width, height: canvas.height, scale: 1 };
      if (bgImage) painter.drawCanvas(bgImage, 0, 0);
      else for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
        const tile = map.rows[ty][tx];
        painter.drawGardenTile(tile === 'H' && groundTile ? groundTile : tile, tx * TILE, ty * TILE, [
          map.rows[ty - 1]?.[tx] === 'N', map.rows[ty]?.[tx + 1] === 'N',
          map.rows[ty + 1]?.[tx] === 'N', map.rows[ty]?.[tx - 1] === 'N',
        ]);
      }
      for (const o of floors) painter.drawSprite(o.spr, o.tx * TILE, o.drawY);
      cached = { canvas, tiles: this.tiles, bgImage, groundTile, floors: floors.slice() };
      this.groundCache.set(map, cached);
    }
    this.drawCanvas(cached.canvas, 0, 0);
    return true;
  }

  invalidateGround(map) { this.groundCache.delete(map); }

  /** 기존 G/N 이미지를 그대로 사용해 길의 바깥 모서리만 부드럽게 잇는다. */
  drawGardenTile(id, x, y, neighbors) {
    if (id !== 'N' || !this.ctx.roundRect) { this.drawTile(id, x, y); return; }
    const [north, east, south, west] = neighbors;
    const radius = [!north && !west, !north && !east, !south && !east, !south && !west].map((corner) => corner ? 8 : 0);
    this.drawTile('G', x, y);
    this.ctx.save(); this.ctx.beginPath();
    this.ctx.roundRect(Math.round(x - this.cam.x), Math.round(y - this.cam.y), TILE, TILE, radius);
    this.ctx.clip(); this.drawTile(id, x, y); this.ctx.restore();
  }

  drawSprite(spr, x, y, motion = null) {
    const sx = Math.round(x - this.cam.x), sy = Math.round(y - this.cam.y);
    if (sx + spr.w < 0 || sy + spr.h < 0 || sx > this.view.width || sy > this.view.height) return;
    // 픽셀 그림 전체의 비율·기울기를 바꾸면 얼굴과 윤곽이 일그러진다.
    const lift = motion && !this.reducedMotion ? Math.round(motion.lift ?? 0) : 0;
    this.ctx.drawImage(spriteCanvas(spr), sx, sy - lift);
  }

  /** 미리 그려둔 캔버스/이미지(썸네일, 맵 배경 등)를 월드 좌표에 그린다 */
  drawCanvas(c, x, y) {
    this.ctx.drawImage(c, Math.round(x - this.cam.x), Math.round(y - this.cam.y));
  }

  drawLabel(text, cx, topY) {
    const ctx = this.ctx;
    ctx.save(); ctx.font = `bold ${TEXT.label}px Galmuri11, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 16;
    const x = Math.max(3, Math.min(this.view.width - w - 3, Math.round(cx - this.cam.x - w / 2)));
    const y = Math.round(topY - this.cam.y - 20);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, w, 23);
    ctx.strokeStyle = '#aca98b'; ctx.strokeRect(x + .5, y + .5, w - 1, 22);
    ctx.fillStyle = '#4e5e3e'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, x + 8, y + 12); ctx.restore();
  }

  drawDestination(x, y) {
    const ctx = this.ctx; ctx.save(); ctx.strokeStyle = '#fff8dc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x - this.cam.x, y - this.cam.y - 2, 10, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  drawPlayerMarker(x, y) {
    const ctx = this.ctx; ctx.save(); ctx.fillStyle = '#fff5b5';
    ctx.fillRect(Math.round(x - this.cam.x - 7), Math.round(y - this.cam.y + 1), 14, 2); ctx.restore();
  }

  /** 발밑에 상자 없는 흰 글씨 + 어두운 외곽선(레퍼런스). 머리 위보다 겹친 얼굴을 덜 가린다. 플레이어는 연노랑. */
  drawNameTag(text, cx, feetY, highlight = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${TEXT.name}px Galmuri11, Galmuri9, sans-serif`;
    ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    const x = Math.round(cx - this.cam.x), y = Math.round(feetY - this.cam.y);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(38,30,24,.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = highlight ? '#fff5b5' : '#fff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /** 흰 말풍선 + 꼬리, 폭 200px에서 줄바꿈 */
  drawBubble(text, cx, bottomY) {
    const ctx = this.ctx;
    ctx.font = `${TEXT.bubble}px Galmuri11, Galmuri9, sans-serif`;
    const maxW = 220, lineH = TEXT.bubbleLine, lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 16;
    const h = lines.length * lineH + 10;
    let x = Math.round(cx - this.cam.x - w / 2);
    x = Math.max(4, Math.min(this.view.width - w - 4, x));
    const y = Math.max(this.topInset ?? 84, Math.round(bottomY - this.cam.y - h - 8)); // 상단 바 밑으로는 숨지 않게
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
