import { TILE } from '../renderer.js';
import { parseMap, tileAt, rectBlocked, tileKey } from './tilemap.js';
import { objectSprite } from '../sprites/objects.js';

const INTERACT_DIST = 26; // px: 이 거리 안이면 이동 없이 바로 상호작용

/** 타일 (tx,ty)에 서 있을 때의 발 위치 */
export function standPos(tx, ty) {
  return { x: tx * TILE + 8, y: ty * TILE + 14 };
}

/**
 * @typedef {{id:string, sprite:string, tx:number, ty:number, solid?:boolean, floor?:boolean,
 *            stand?:{tx:number,ty:number}, interact?:(game)=>void}} SceneObject
 *   sprite: objects.js의 ID. 발자국 = 스프라이트 맨 아래 타일 행 전체(solid 기본 true).
 *   floor: 바닥 장식(문 등). solid 아님, 캐릭터보다 먼저 그림. stand: 상호작용 시 설 타일(기본은 바로 아래/위).
 * @typedef {{tx:number, ty:number, to:string, spawn:{tx:number,ty:number}|null}} Entrance
 * @typedef {{character:Character, interact?:(game)=>void}} Npc
 */
export class Scene {
  constructor({ id, rows, spawn, objects = [], entrances = [], npcs = [], bg = '#1b2a1f', onEnter = null }) {
    this.id = id;
    this.map = parseMap(rows);
    this.spawn = spawn;
    this.objects = objects.map((o) => ({ solid: !o.floor, ...o, spr: objectSprite(o.sprite) }));
    this.entrances = entrances;
    this.npcs = npcs;
    this.bg = bg;
    this.onEnter = onEnter;
    this.pending = null;      // 도착 후 실행할 상호작용
    this.onEntrance = false;  // 입구 재발동 방지
    this.rebuildSolid();
  }

  rebuildSolid() {
    this.extraSolid = new Set();
    for (const o of this.objects) {
      if (!o.solid) continue;
      const wTiles = o.spr.w / TILE, footY = o.ty + o.spr.h / TILE - 1;
      for (let i = 0; i < wTiles; i++) this.extraSolid.add(tileKey(o.tx + i, footY));
    }
    for (const n of this.npcs) {
      const c = n.character;
      this.extraSolid.add(tileKey(Math.floor(c.x / TILE), Math.floor((c.y - 1) / TILE)));
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
    return (x, y) => rectBlocked(this.map, x - 5, y - 8, 10, 8, this.extraSolid);
  }

  entranceAt(player) {
    const tx = Math.floor(player.x / TILE), ty = Math.floor((player.y - 1) / TILE);
    return this.entrances.find((e) => e.tx === tx && e.ty === ty) ?? null;
  }

  /** 오브젝트/NPC 앞에 설 타일: 바로 아래가 비어 있으면 아래, 아니면 위 */
  standTileFor(tx, footY, wTiles = 1) {
    const cx = tx + Math.floor((wTiles - 1) / 2);
    const below = { tx: cx, ty: footY + 1 };
    if (!this.isSolidTile(below.tx, below.ty)) return below;
    return { tx: cx, ty: footY - 1 };
  }

  isSolidTile(tx, ty) {
    return rectBlocked(this.map, tx * TILE, ty * TILE, TILE, TILE, this.extraSolid);
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
      return wx >= p.x && wx < p.x + 16 && wy >= p.y && wy < p.y + 24;
    }) ?? null;
  }

  onTap(wx, wy, game) {
    const player = game.player;
    const npc = this.hitNpc(wx, wy);
    const obj = npc ? null : this.hitObject(wx, wy);
    const target = npc ?? obj;
    if (target && target.interact) {
      const c = npc ? npc.character : null;
      const tx = c ? Math.floor(c.x / TILE) : obj.tx;
      const footY = c ? Math.floor((c.y - 1) / TILE) : obj.ty + obj.spr.h / TILE - 1;
      const wTiles = c ? 1 : obj.spr.w / TILE;
      const st = (obj && obj.stand) ? obj.stand : this.standTileFor(tx, footY, wTiles);
      const stand = standPos(st.tx, st.ty);
      const faceX = c ? c.x : obj.tx * TILE + obj.spr.w / 2;
      const faceY = c ? c.y : footY * TILE + 8;
      if (Math.hypot(stand.x - player.x, stand.y - player.y) < INTERACT_DIST) {
        player.stop();
        this.face(player, faceX, faceY);
        target.interact(game);
        return;
      }
      this.pending = target;
      player.moveTo(stand.x, stand.y, () => {
        if (this.pending !== target) return;
        this.pending = null;
        this.face(player, faceX, faceY);
        target.interact(game);
      });
      return;
    }
    this.pending = null;
    const x = Math.max(8, Math.min(this.pixelW - 8, wx));
    const y = Math.max(16, Math.min(this.pixelH - 2, wy));
    player.moveTo(x, y);
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

  /** @param r renderer: drawTile(id,x,y), drawSprite(spr,x,y), drawNameTag(text,cx,topY), drawBubble(text,cx,bottomY) */
  draw(r, player) {
    for (let ty = 0; ty < this.map.h; ty++) {
      for (let tx = 0; tx < this.map.w; tx++) r.drawTile(tileAt(this.map, tx, ty), tx * TILE, ty * TILE);
    }
    for (const o of this.objects) if (o.floor) r.drawSprite(o.spr, o.tx * TILE, o.ty * TILE);
    const items = [];
    for (const o of this.objects) if (!o.floor) items.push({ y: o.ty * TILE + o.spr.h, draw: () => r.drawSprite(o.spr, o.tx * TILE, o.ty * TILE) });
    const chars = [player, ...this.npcs.map((n) => n.character)];
    for (const c of chars) {
      const p = c.drawPos();
      items.push({ y: c.y, draw: () => { r.drawSprite(c.sprite(), p.x, p.y); r.drawNameTag(c.name, p.x + 8, p.y - 2); } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    for (const c of chars) if (c.bubble) { const p = c.drawPos(); r.drawBubble(c.bubble, p.x + 8, p.y - 10); }
  }
}
