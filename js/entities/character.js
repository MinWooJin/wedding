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
    this.motionT = 0;
    // 같은 줄에 서 있는 하객들도 각자 다른 호흡 리듬을 갖는다.
    this.motionPhase = [...name].reduce((sum, ch) => sum + ch.codePointAt(0), x + y) % 31 / 31 * Math.PI * 2;
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
    this.motionT = (this.motionT + dt) % 60;
    this.moving = false;
    if (this.bubble) { this.bubbleT -= dt; if (this.bubbleT <= 0) this.bubble = null; }
    if (!this.target) return;
    const r = stepToward(this, this.target, SPEED * dt, blockedAt);
    this.x = r.x; this.y = r.y; this.dir = r.dir;
    if (r.moved) {
      this.moving = true;
      this.animT += dt;
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
    if (reducedMotion) return null;
    if (this.moving) {
      const phase = (this.frame + this.animT / FRAME_TIME) * Math.PI;
      return { lean: Math.sin(phase) * 0.018, scaleY: 1, lift: Math.abs(Math.sin(phase)) * 1.5 };
    }
    const breath = (1 - Math.cos(this.motionT * Math.PI * 2 / 4 + this.motionPhase)) / 2;
    return { lean: 0, scaleY: 1 - breath / this.sprite().h, lift: 0 };
  }

  /** 안정된 스프라이트 영역. 이름표와 말풍선은 호흡에 따라 흔들리지 않는다. */
  drawPos() {
    const s = this.sprite();
    return { x: Math.round(this.x) - Math.floor(s.w / 2), y: Math.round(this.y) - s.h, w: s.w, h: s.h };
  }
}

/** 타일 (tx,ty)에 서 있을 때의 발 위치 */
export function standPos(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE - 4 };
}
