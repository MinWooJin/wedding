import { Renderer } from './renderer.js';
import { attachPointer } from './input.js';
import { Character } from './entities/character.js';
import { presetSprites } from './sprites/characters.js';
import { characterSet } from './assets.js';

/** HUD(상단 이름·날짜)가 맵 위쪽을 가리지 않도록 비워 두는 높이(내부 px) */
export const HUD_PAD = 56;

/**
 * 카메라: 뷰보다 큰 축은 플레이어 중심 + 클램프, 작은 축은 가운데 정렬(음수).
 * topPad만큼은 화면 위를 비워 둔다(세로축 전용).
 */
export function computeCamera(view, scene, player, topPad = 0) {
  const axis = (viewLen, mapLen, p, pad) => {
    const avail = viewLen - pad;
    if (mapLen <= avail) return 0 - pad - Math.floor((avail - mapLen) / 2); // 0 - 0 → +0
    return Math.max(0, Math.min(mapLen - avail, Math.round(p - avail / 2))) - pad;
  };
  return { x: axis(view.width, scene.pixelW, player.x, 0), y: axis(view.height, scene.pixelH, player.y, topPad) };
}

/** 수동 스크롤로 갈 수 있는 카메라 범위. 맵이 뷰보다 작으면 min=max(고정). */
export function cameraBounds(view, scene, topPad = 0) {
  const range = (viewLen, mapLen, pad) => {
    const avail = viewLen - pad;
    if (mapLen <= avail) { const v = 0 - pad - Math.floor((avail - mapLen) / 2); return [v, v]; }
    return [0 - pad, mapLen - avail - pad];
  };
  const [minX, maxX] = range(view.width, scene.pixelW, 0);
  const [minY, maxY] = range(view.height, scene.pixelH, topPad);
  return { minX, maxX, minY, maxY };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const FADE_TIME = 0.3;
const CAM_SMOOTH = 10; // 클수록 빨리 따라붙음

export class Game {
  /**
   * @param {{canvas:HTMLCanvasElement, frame:HTMLElement, config:object, profile:{nickname:string,charId:number},
   *          scenes:Record<string,(game)=>Scene>, ui:object}} o
   * scenes: id → 팩토리. 처음 goTo할 때 생성해 캐시한다.
   */
  constructor({ canvas, frame, config, profile, scenes, ui, assets = {} }) {
    this.canvas = canvas; this.frame = frame;
    this.config = config; this.profile = profile; this.ui = ui;
    this.assets = assets;
    this.renderer = new Renderer(canvas);
    this.renderer.tiles = assets.tiles ?? {};
    this.player = new Character({
      sprites: characterSet(assets, `preset-${profile.charId}`, presetSprites(profile.charId)),
      name: profile.nickname, x: 0, y: 0,
    });
    this.factories = scenes;
    this.scenes = {};
    this.scene = null;
    this.fade = { alpha: 0, dir: 0, next: null };
    this.last = 0;
    this.paused = false;
    this.cam = { x: 0, y: 0 };
    this.follow = true; // false면 사용자가 드래그한 위치에 머문다
    attachPointer(canvas, {
      onTap: (cx, cy) => this.tap(cx, cy),
      onDrag: (dx, dy) => this.drag(dx, dy),
      onDragEnd: () => {},
    });
    new ResizeObserver(() => this.resize()).observe(frame);
    this.resize();
  }

  resize() {
    const r = this.frame.getBoundingClientRect();
    this.renderer.resize(r.width, r.height);
    const header = this.frame.querySelector?.('.garden-header')?.getBoundingClientRect();
    const panel = this.frame.querySelector?.('.scene-panel')?.getBoundingClientRect();
    const scale = this.renderer.view.scale;
    this.cameraView = { ...this.renderer.view, height: panel ? Math.max(200, Math.floor((panel.top - r.top - 8) / scale)) : this.renderer.view.height };
    this.cameraTop = header ? Math.ceil((header.bottom - r.top + 12) / scale) : HUD_PAD;
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
    this.scene.enter(this.player, spawn ?? this.scene.spawn, null);
    this.afterTransition = () => this.scene.onEnter?.(this);
    this.follow = true;
    this.ui.hud?.onScene?.(id);
    this.resize();
    this.cam = computeCamera(this.cameraView, this.scene, this.player, this.cameraTop);
  }

  tap(cssX, cssY) {
    if (!this.scene || this.paused || this.fade.dir !== 0) return;
    const { scale } = this.renderer.view;
    const wx = cssX / scale + this.cam.x;
    const wy = cssY / scale + this.cam.y;
    this.follow = true; // 탭하면 다시 캐릭터를 따라간다
    this.scene.onTap(wx, wy, this);
  }

  /** 드래그/휠로 맵 스크롤. 캐릭터 추적을 멈추고 범위 안에서만 움직인다. */
  drag(dxCss, dyCss) {
    if (!this.scene || this.paused) return;
    const { scale } = this.renderer.view;
    const b = cameraBounds(this.cameraView, this.scene, this.cameraTop);
    this.follow = false;
    this.cam = {
      x: clamp(this.cam.x - dxCss / scale, b.minX, b.maxX),
      y: clamp(this.cam.y - dyCss / scale, b.minY, b.maxY),
    };
  }

  updateCamera(dt) {
    if (!this.follow) return;
    const t = computeCamera(this.cameraView, this.scene, this.player, this.cameraTop);
    const k = 1 - Math.exp(-CAM_SMOOTH * dt);
    this.cam = {
      x: Math.abs(t.x - this.cam.x) < 0.5 ? t.x : this.cam.x + (t.x - this.cam.x) * k,
      y: Math.abs(t.y - this.cam.y) < 0.5 ? t.y : this.cam.y + (t.y - this.cam.y) * k,
    };
  }

  start(id) {
    this.switchNow(id);
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0);
    this.last = t;
    if (!this.paused) this.update(dt);
    this.updateCamera(dt);
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
    if (f.dir === 0 && this.afterTransition) {
      const enter = this.afterTransition; this.afterTransition = null; enter();
      if (this.paused) return;
    }
    this.scene.update(dt, this);
  }

  draw() {
    const r = this.renderer;
    r.cam = { x: Math.round(this.cam.x), y: Math.round(this.cam.y) };
    r.begin(this.scene.bg);
    this.scene.draw(r, this.player);
    r.drawFade(this.fade.alpha);
  }
}
