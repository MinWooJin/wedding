import { stepToward } from '../world/movement.js';

export const SPEED = 60; // px/s (내부 해상도 기준)
const FRAME_TIME = 0.18;

export class Character {
  /** @param {{sprites:object,name:string,x:number,y:number}} o  x,y는 발 밑 중앙 */
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

  box() { return { x: this.x - 5, y: this.y - 8, w: 10, h: 8 }; }

  moveTo(x, y, onArrive = null) {
    this.target = { x, y };
    this.onArrive = onArrive;
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
      if (this.animT >= FRAME_TIME) { this.animT = 0; this.frame = this.frame ? 0 : 1; }
    }
    if (r.arrived) {
      const cb = this.onArrive;
      this.stop();
      if (cb) cb();
    }
  }

  sprite() { return this.sprites[this.dir][this.target ? this.frame : 0]; }

  /** 스프라이트 좌상단 */
  drawPos() { return { x: Math.round(this.x) - 8, y: Math.round(this.y) - 24 }; }
}
