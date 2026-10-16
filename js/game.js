import { Renderer } from './renderer.js';
import { attachPointer } from './input.js';
import { Character } from './entities/character.js';
import { presetSprites } from './sprites/characters.js';

/** 카메라: 뷰보다 큰 축은 플레이어 중심 + 클램프, 작은 축은 가운데 정렬(음수) */
export function computeCamera(view, scene, player) {
  const axis = (viewLen, mapLen, p) => {
    if (mapLen <= viewLen) return 0 - Math.floor((viewLen - mapLen) / 2); // 0 - 0 → +0
    return Math.max(0, Math.min(mapLen - viewLen, Math.round(p - viewLen / 2)));
  };
  return { x: axis(view.width, scene.pixelW, player.x), y: axis(view.height, scene.pixelH, player.y) };
}

const FADE_TIME = 0.3;

export class Game {
  /**
   * @param {{canvas:HTMLCanvasElement, frame:HTMLElement, config:object, profile:{nickname:string,charId:number},
   *          scenes:Record<string,(game)=>Scene>, ui:object}} o
   * scenes: id → 팩토리. 처음 goTo할 때 생성해 캐시한다.
   */
  constructor({ canvas, frame, config, profile, scenes, ui }) {
    this.canvas = canvas; this.frame = frame;
    this.config = config; this.profile = profile; this.ui = ui;
    this.renderer = new Renderer(canvas);
    this.player = new Character({ sprites: presetSprites(profile.charId), name: profile.nickname, x: 0, y: 0 });
    this.factories = scenes;
    this.scenes = {};
    this.scene = null;
    this.fade = { alpha: 0, dir: 0, next: null };
    this.last = 0;
    this.paused = false;
    attachPointer(canvas, (cx, cy) => this.tap(cx, cy));
    new ResizeObserver(() => this.resize()).observe(frame);
    this.resize();
  }

  resize() {
    const r = this.frame.getBoundingClientRect();
    this.renderer.resize(r.width, r.height);
  }

  sceneById(id) {
    if (!this.scenes[id]) this.scenes[id] = this.factories[id](this);
    return this.scenes[id];
  }

  /** 페이드 아웃 → 씬 교체 → 페이드 인 */
  goTo(id, spawn) {
    if (this.fade.dir !== 0) return;
    this.fade = { alpha: 0, dir: 1, next: { id, spawn } };
  }

  switchNow(id, spawn) {
    this.scene = this.sceneById(id);
    this.scene.enter(this.player, spawn ?? this.scene.spawn, this);
    this.ui.hud?.onScene?.(id);
  }

  tap(cssX, cssY) {
    if (!this.scene || this.paused || this.fade.dir !== 0) return;
    const { scale } = this.renderer.view;
    const wx = cssX / scale + this.renderer.cam.x;
    const wy = cssY / scale + this.renderer.cam.y;
    this.scene.onTap(wx, wy, this);
  }

  start(id) {
    this.switchNow(id);
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0);
    this.last = t;
    if (!this.paused) this.update(dt);
    this.draw();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  update(dt) {
    const f = this.fade;
    if (f.dir === 1) {
      f.alpha = Math.min(1, f.alpha + dt / FADE_TIME);
      if (f.alpha >= 1) { this.switchNow(f.next.id, f.next.spawn); f.dir = -1; }
      return;
    }
    if (f.dir === -1) {
      f.alpha = Math.max(0, f.alpha - dt / FADE_TIME);
      if (f.alpha <= 0) f.dir = 0;
    }
    this.scene.update(dt, this);
  }

  draw() {
    const r = this.renderer;
    r.cam = computeCamera(r.view, this.scene, this.player);
    r.begin(this.scene.bg);
    this.scene.draw(r, this.player);
    r.drawFade(this.fade.alpha);
  }
}
