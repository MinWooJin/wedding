import { stepToward } from '../world/movement.js';
import { TILE } from '../renderer.js';

export const SPEED = 120; // px/s (내부 해상도 기준, 타일 32px)
const FRAME_TIME = 0.18;
export const BOX_W = 20, BOX_H = 16; // 발 밑 충돌 박스

export class Character {
  /**
   * @param {{sprites:object,name:string,x:number,y:number,speed?:number}} o
   * x,y는 발 밑 중앙. sprites: {down:Sprite[],up,left,right} (프레임 0 = idle, 1.. = 걷기)
   */
  constructor({ sprites, name, x, y, speed = SPEED }) {
    this.sprites = sprites;
    this.name = name;
    this.speed = speed;
    this.x = x; this.y = y;
    this.dir = 'down';
    this.frame = 0;
    this.animT = 0;
    this.moving = false;
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

  stop() { this.target = null; this.onArrive = null; this.frame = 0; this.animT = 0; this.moving = false; }

  say(text, seconds = 3) { this.bubble = text; this.bubbleT = seconds; }

  /** blockedAt(x,y): 발 위치가 (x,y)일 때 충돌 박스가 막히는지 */
  update(dt, blockedAt) {
    this.moving = false;
    if (this.bubble) { this.bubbleT -= dt; if (this.bubbleT <= 0) this.bubble = null; }
    if (!this.target) return;
    const r = stepToward(this, this.target, this.speed * dt, blockedAt);
    const distance = Math.hypot(r.x - this.x, r.y - this.y);
    this.x = r.x; this.y = r.y; this.dir = r.dir;
    if (r.moved) {
      this.moving = true;
      this.animT += distance / SPEED; // 실제로 걸은 거리에 맞춰 리듬을 진행한다.
      const steps = Math.floor(this.animT / FRAME_TIME);
      this.frame += steps;
      this.animT -= steps * FRAME_TIME;
    }
    if (r.blocked) { this.stop(); return; }
    if (r.arrived) {
      const cb = this.onArrive;
      this.target = null; this.onArrive = null;
      if (cb) cb();
      // 경유점을 넘어갈 때 보행 리듬을 끊지 않는다.
      if (!this.target) this.stop();
    }
  }

  get walking() { return this.target !== null; }

  sprite(reducedMotion = false) {
    const frames = this.sprites[this.dir];
    if (reducedMotion || !this.moving || frames.length < 2) return frames[0];
    const cycle = frames.length - 1;
    return frames[1 + (this.frame % cycle)];
  }

  /** 발을 기준으로 한 시각 효과만 반환한다. 월드 좌표·충돌·탭 영역에는 영향을 주지 않는다. */
  motion(reducedMotion = false) {
    if (reducedMotion || !this.moving || this.sprites[this.dir].length > 1) return null;
    // 단일 PNG는 늘리거나 기울이지 않는다. 보행 중에만 정수 1px 리듬.
    const phase = (this.frame + this.animT / FRAME_TIME) % 2;
    return { lift: phase >= 0.5 && phase < 1.5 ? 1 : 0 };
  }

  /** 안정된 스프라이트 영역. 이름표와 말풍선은 보행의 시각 효과에 따라 흔들리지 않는다. */
  drawPos() {
    const s = this.sprite();
    return { x: Math.round(this.x) - Math.floor(s.w / 2), y: Math.round(this.y) - s.h, w: s.w, h: s.h };
  }
}

/** 타일 (tx,ty)에 서 있을 때의 발 위치 */
export function standPos(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE - 4 };
}
