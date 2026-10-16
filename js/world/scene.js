import { TILE } from '../renderer.js';
import { parseMap, tileAt, rectBlocked, tileKey } from './tilemap.js';
import { findPath } from './movement.js';
import { objectSprite } from '../sprites/objects.js';
import { BOX_W, BOX_H, standPos } from '../entities/character.js';

export { standPos };

const INTERACT_DIST = TILE * 1.6; // 이 거리 안이면 이동 없이 바로 상호작용

/**
 * @typedef {{id:string, sprite:string, tx:number, ty:number, solid?:boolean, floor?:boolean,
 *            stand?:{tx:number,ty:number}, interact?:(game)=>void}} SceneObject
 *   sprite: objects.js의 ID(assets.objects에 같은 이름의 PNG가 있으면 그것을 사용).
 *   발자국 = 스프라이트 맨 아래 타일 행 전체(solid 기본 true).
 *   floor: 바닥 장식(문 등). solid 아님, 캐릭터보다 먼저 그림. stand: 상호작용 시 설 타일(기본은 가장 가까운 빈 이웃).
 * @typedef {{tx:number, ty:number, to:string, spawn:{tx:number,ty:number}|null}} Entrance
 * @typedef {{character:Character, interact?:(game)=>void}} Npc
 */
export class Scene {
  constructor({ id, rows, spawn, objects = [], entrances = [], npcs = [], bg = '#1b2a1f', onEnter = null, assets = {} }) {
    this.id = id;
    this.map = parseMap(rows);
    this.spawn = spawn;
    this.assets = assets;
    this.objects = objects.map((o) => this.makeObject(o));
    this.entrances = entrances;
    this.npcs = npcs;
    this.bg = bg;
    this.bgImage = assets.maps?.[id] ?? null; // 씬 배경 한 장(있으면 타일 대신 그림)
    this.onEnter = onEnter;
    this.pending = null;      // 도착 후 실행할 상호작용
    this.onEntrance = false;  // 입구 재발동 방지
    this.rebuildSolid();
  }

  /** 오브젝트 정의에 스프라이트(PNG 우선, 없으면 코드 그림)를 붙인다. 동적으로 추가할 때도 사용. */
  makeObject(o) {
    return { solid: !o.floor, ...o, spr: this.assets.objects?.[o.sprite] ?? objectSprite(o.sprite) };
  }

  rebuildSolid() {
    this.extraSolid = new Set();
    for (const o of this.objects) {
      if (!o.solid) continue;
      const wTiles = Math.ceil(o.spr.w / TILE), footY = o.ty + Math.ceil(o.spr.h / TILE) - 1;
      for (let i = 0; i < wTiles; i++) this.extraSolid.add(tileKey(o.tx + i, footY));
    }
    for (const n of this.npcs) {
      const t = this.tileOf(n.character.x, n.character.y);
      this.extraSolid.add(tileKey(t.tx, t.ty));
    }
  }

  get pixelW() { return this.map.w * TILE; }
  get pixelH() { return this.map.h * TILE; }

  enter(player, spawn = this.spawn, game = null) {
    const p = standPos(spawn.tx, spawn.ty);
    player.x = p.x; player.y = p.y; player.dir = 'down';
    player.stop();
    this.pending = null;
    this.onEntrance = this.entranceAt(player) !== null;
    if (this.onEnter && game) this.onEnter(game);
  }

  blockedFor() {
    return (x, y) => rectBlocked(this.map, x - BOX_W / 2, y - BOX_H, BOX_W, BOX_H, this.extraSolid);
  }

  tileOf(x, y) { return { tx: Math.floor(x / TILE), ty: Math.floor((y - 1) / TILE) }; }

  entranceAt(player) {
    const { tx, ty } = this.tileOf(player.x, player.y);
    return this.entrances.find((e) => e.tx === tx && e.ty === ty) ?? null;
  }

  /**
   * 오브젝트/NPC 앞에 설 타일. 아래·위·왼쪽·오른쪽 이웃 중 비어 있고 from(플레이어 발 위치)에 가장 가까운 타일.
   * 모두 막혀 있으면 아래 타일.
   */
  standTileFor(tx, footY, wTiles = 1, from = null) {
    const cx = tx + Math.floor((wTiles - 1) / 2);
    const candidates = [
      { tx: cx, ty: footY + 1 },
      { tx: cx, ty: footY - 1 },
      { tx: tx - 1, ty: footY },
      { tx: tx + wTiles, ty: footY },
    ].filter((t) => !this.isSolidTile(t.tx, t.ty));
    if (candidates.length === 0) return { tx: cx, ty: footY + 1 };
    if (!from) return candidates[0];
    const dist = (t) => { const p = standPos(t.tx, t.ty); return Math.hypot(p.x - from.x, p.y - from.y); };
    return candidates.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  }

  isSolidTile(tx, ty) {
    return rectBlocked(this.map, tx * TILE, ty * TILE, TILE, TILE, this.extraSolid);
  }

  /**
   * (x,y)까지 타일 BFS 경로를 따라 걷는다. 경로가 없으면 직선 이동으로 폴백.
   * 마지막 경유점은 정확히 (x,y).
   */
  walkTo(player, x, y, onArrive = null) {
    const from = this.tileOf(player.x, player.y);
    const to = this.tileOf(x, y);
    const path = findPath(this.map.w, this.map.h, (tx, ty) => this.isSolidTile(tx, ty), from, to);
    if (!path) { player.moveTo(x, y, onArrive); return; }
    const points = path.slice(0, -1).map((t) => standPos(t.tx, t.ty));
    points.push({ x, y });
    player.followPath(points, onArrive);
  }

  hitObject(wx, wy) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      const x0 = o.tx * TILE, y0 = o.ty * TILE;
      if (wx >= x0 && wx < x0 + o.spr.w && wy >= y0 && wy < y0 + o.spr.h) return o;
    }
    return null;
  }

  hitNpc(wx, wy) {
    return this.npcs.find((n) => {
      const p = n.character.drawPos();
      return wx >= p.x && wx < p.x + p.w && wy >= p.y && wy < p.y + p.h;
    }) ?? null;
  }

  onTap(wx, wy, game) {
    const player = game.player;
    const npc = this.hitNpc(wx, wy);
    const obj = npc ? null : this.hitObject(wx, wy);
    const target = npc ?? obj;
    if (target && target.interact) {
      const c = npc ? npc.character : null;
      const ct = c ? this.tileOf(c.x, c.y) : null;
      const tx = c ? ct.tx : obj.tx;
      const footY = c ? ct.ty : obj.ty + Math.ceil(obj.spr.h / TILE) - 1;
      const wTiles = c ? 1 : Math.ceil(obj.spr.w / TILE);
      const st = (obj && obj.stand) ? obj.stand : this.standTileFor(tx, footY, wTiles, player);
      const stand = standPos(st.tx, st.ty);
      const faceX = c ? c.x : obj.tx * TILE + obj.spr.w / 2;
      const faceY = c ? c.y : footY * TILE + TILE / 2;
      if (Math.hypot(stand.x - player.x, stand.y - player.y) < INTERACT_DIST) {
        player.stop();
        this.face(player, faceX, faceY);
        target.interact(game);
        return;
      }
      this.pending = target;
      this.walkTo(player, stand.x, stand.y, () => {
        if (this.pending !== target) return;
        this.pending = null;
        this.face(player, faceX, faceY);
        target.interact(game);
      });
      return;
    }
    this.pending = null;
    const x = Math.max(TILE / 2, Math.min(this.pixelW - TILE / 2, wx));
    const y = Math.max(TILE, Math.min(this.pixelH - 2, wy));
    this.walkTo(player, x, y);
  }

  face(player, x, y) {
    const dx = x - player.x, dy = y - player.y;
    player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  update(dt, game) {
    const player = game.player;
    player.update(dt, this.blockedFor());
    for (const n of this.npcs) n.character.update(dt, () => true);
    const e = this.entranceAt(player);
    if (e && !this.onEntrance) {
      this.onEntrance = true;
      player.stop();
      game.goTo(e.to, e.spawn);
    } else if (!e) {
      this.onEntrance = false;
    }
  }

  /** @param r renderer: drawTile, drawSprite, drawCanvas, drawNameTag(text,cx,topY), drawBubble(text,cx,bottomY) */
  draw(r, player) {
    if (this.bgImage) {
      r.drawCanvas(this.bgImage, 0, 0);
    } else {
      for (let ty = 0; ty < this.map.h; ty++) {
        for (let tx = 0; tx < this.map.w; tx++) r.drawTile(tileAt(this.map, tx, ty), tx * TILE, ty * TILE);
      }
    }
    for (const o of this.objects) if (o.floor) r.drawSprite(o.spr, o.tx * TILE, o.ty * TILE);
    const items = [];
    for (const o of this.objects) if (!o.floor) items.push({ y: o.ty * TILE + o.spr.h, draw: () => r.drawSprite(o.spr, o.tx * TILE, o.ty * TILE) });
    const chars = [player, ...this.npcs.map((n) => n.character)];
    for (const c of chars) {
      const p = c.drawPos();
      items.push({ y: c.y, draw: () => { r.drawSprite(c.sprite(), p.x, p.y); r.drawNameTag(c.name, p.x + p.w / 2, p.y - 2); } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    for (const c of chars) if (c.bubble) { const p = c.drawPos(); r.drawBubble(c.bubble, p.x + p.w / 2, p.y - 16); }
  }
}
