import { stepToward } from '../world/movement.js';
import { TILE } from '../renderer.js';

export const SPEED = 120; // px/s (내부 해상도 기준, 타일 32px)
const FRAME_TIME = 0.18;
export const BOX_W = 20, BOX_H = 16; // 발 밑 충돌 박스

export class Character {
  /**
   * @param {{sprites:object,name:string,x:number,y:number}} o
   * x,y는 발 밑 중앙. sprites: {down:Sprite[],up,left,right} (프레임 0 = idle, 1.. = 걷기)
   */
  constructor({ sprites, name, x, y }) {
    this.sprites = sprites;
    this.name = name;
    this.x = x; this.y = y;
    this.dir = 'down';
    this.frame = 0;
    this.animT = 0;
    this.target = null;
    this.onArrive = null;
    this.bubble = null;
    this.bubbleT = 0;
  }

  box() { return { x: this.x - BOX_W / 2, y: this.y - BOX_H, w: BOX_W, h: BOX_H }; }

  moveTo(x, y, onArrive = null) {
    this.target = { x, y };
    this.onArrive = onArrive;
  }

  /** 경유점 목록을 차례로 지나 마지막 점에 도착하면 onArrive 호출 */
  followPath(points, onArrive = null) {
    if (points.length === 0) { if (onArrive) onArrive(); return; }
    const [head, ...rest] = points;
    this.moveTo(head.x, head.y, rest.length ? () => this.followPath(rest, onArrive) : onArrive);
  }

  stop() { this.target = null; this.onArrive = null; this.frame = 0; }

  say(text, seconds = 3) { this.bubble = text; this.bubbleT = seconds; }

  /** blockedAt(x,y): 발 위치가 (x,y)일 때 충돌 박스가 막히는지 */
  update(dt, blockedAt) {
    if (this.bubble) { this.bubbleT -= dt; if (this.bubbleT <= 0) this.bubble = null; }
    if (!this.target) return;
    const r = stepToward(this, this.target, SPEED * dt, blockedAt);
    this.x = r.x; this.y = r.y; this.dir = r.dir;
    if (r.moved) {
      this.animT += dt;
      if (this.animT >= FRAME_TIME) { this.animT = 0; this.frame++; }
    }
    if (r.arrived) {
      const cb = this.onArrive;
      this.stop();
      if (cb) cb();
    }
  }

  get walking() { return this.target !== null; }

  sprite() {
    const frames = this.sprites[this.dir];
    if (!this.walking || frames.length < 2) return frames[0];
    const cycle = frames.length - 1;
    return frames[1 + (this.frame % cycle)];
  }

  /** 스프라이트 좌상단. 걷는 동안 홀수 프레임에 1px 들썩임(정면 1장짜리 이미지도 살아 보이게) */
  drawPos() {
    const s = this.sprite();
    const bob = this.walking && this.frame % 2 === 1 ? -2 : 0;
    return { x: Math.round(this.x) - Math.floor(s.w / 2), y: Math.round(this.y) - s.h + bob, w: s.w, h: s.h };
  }
}

/** 타일 (tx,ty)에 서 있을 때의 발 위치 */
export function standPos(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE - 4 };
}
