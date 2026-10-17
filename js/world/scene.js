import { TILE } from '../renderer.js';
import { parseMap, tileAt, rectBlocked, tileKey } from './tilemap.js';
import { findPath, reachableTiles } from './movement.js';
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
 * @typedef {{character:Character, interact?:(game)=>void, solid?:boolean,
 *            wander?:{home:{tx:number,ty:number}, radius:number, allow?:(tx:number,ty:number)=>boolean, faceDir?:string|((tx:number)=>string), timer?:number}}} Npc
 *   solid:false 면 플레이어가 지나갈 수 있다(움직이는 하객용). wander가 있으면 home 주변 radius 칸 안을 몇 초 간격으로 돌아다닌다.
 */
export class Scene {
  constructor({ id, rows, spawn, objects = [], entrances = [], npcs = [], bg = '#f6efe7', groundTile = null, onEnter = null, assets = {} }) {
    this.id = id;
    this.map = parseMap(rows);
    this.spawn = spawn;
    this.assets = assets;
    this.objects = objects.map((o) => this.makeObject(o));
    this.entrances = entrances;
    this.npcs = npcs;
    this.bg = bg;
    this.groundTile = groundTile; // 야외는 같은 잔디로 경계 H와 맵 밖 여백까지 이어 그린다. 충돌 ID는 유지.
    this.bgImage = assets.maps?.[id] ?? null; // 씬 배경 한 장(있으면 타일 대신 그림)
    this.onEnter = onEnter;
    this.pending = null;      // 도착 후 실행할 상호작용
    this.onEntrance = false;  // 입구 재발동 방지
    this.rebuildSolid();
  }

  /** 오브젝트 정의에 스프라이트(PNG 우선, 없으면 코드 그림)를 붙인다. 동적으로 추가할 때도 사용. */
  makeObject(o) {
    const spr = this.assets.objects?.[o.sprite] ?? objectSprite(o.sprite);
    const rows = Math.ceil(spr.h / TILE);
    // 스프라이트 아래쪽을 발자국 행의 바닥에 맞춘다(48px 의자 등). 32 배수면 ty*TILE과 같다.
    return { ...o, solid: !spr.missing && (o.solid ?? !o.floor), spr, drawY: (o.ty + rows) * TILE - spr.h, bottom: (o.ty + rows) * TILE };
  }

  rebuildSolid() {
    this.extraSolid = new Set();
    for (const o of this.objects) {
      if (!o.solid) continue;
      const wTiles = Math.ceil(o.spr.w / TILE), footY = o.ty + Math.ceil(o.spr.h / TILE) - 1;
      for (let i = 0; i < wTiles; i++) this.extraSolid.add(tileKey(o.tx + i, footY));
    }
    this.objectSolid = new Set(this.extraSolid); // 오브젝트 발자국만(NPC 이동 충돌용)
    for (const n of this.npcs) {
      if (n.solid === false) continue;
      const t = this.tileOf(n.character.x, n.character.y);
      this.extraSolid.add(tileKey(t.tx, t.ty));
    }
  }

  /** 맵 + 오브젝트만 막힘(다른 NPC·플레이어는 통과). 배회하는 NPC의 충돌 판정에 쓴다. */
  blockedStatic() {
    return (x, y) => rectBlocked(this.map, x - BOX_W / 2, y - BOX_H, BOX_W, BOX_H, this.objectSolid);
  }

  /** 배회 NPC가 다음에 갈 타일을 고른다. 없으면 null. */
  pickWanderTile(n) {
    const { home, radius, allow } = n.wander;
    const taken = new Set(this.npcs.filter((o) => o !== n).map((o) => {
      const t = o.wander?.target ?? this.tileOf(o.character.x, o.character.y);
      return tileKey(t.tx, t.ty);
    }));
    const options = [];
    const current = this.tileOf(n.character.x, n.character.y);
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const tx = home.tx + dx, ty = home.ty + dy;
      if (tx === current.tx && ty === current.ty) continue;
      if (this.entrances.some((e) => e.tx === tx && e.ty === ty)) continue;
      if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) continue;
      if (rectBlocked(this.map, tx * TILE, ty * TILE, TILE, TILE, this.objectSolid)) continue;
      if (allow && !allow(tx, ty)) continue;
      if (taken.has(tileKey(tx, ty))) continue;
      if ([...taken].some((key) => { const [x, y] = key.split(',').map(Number); const dx = Math.abs(tx - x), dy = Math.abs(ty - y); return (dx === 0 && dy <= 1) || (dx === 1 && dy === 0); })) continue;
      options.push({ tx, ty });
    }
    return options.length ? options[Math.floor(Math.random() * options.length)] : null;
  }

  updateWander(n, dt) {
    const w = n.wander, c = n.character;
    if (c.walking) return;
    w.target = null;
    w.timer = (w.timer ?? 1 + Math.random() * 3) - dt;
    if (w.timer > 0) return;
    w.timer = 2 + Math.random() * 5;
    const t = this.pickWanderTile(n);
    if (!t) return;
    w.target = t;
    const p = standPos(t.tx, t.ty);
    c.moveTo(p.x, p.y, () => {
      w.target = null;
      const face = typeof w.faceDir === 'function' ? w.faceDir(t.tx) : w.faceDir;
      if (face) c.dir = face;
    });
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
    const blocked = (tx, ty) => this.isSolidTile(tx, ty) || this.entrances.some((e) => e.tx === tx && e.ty === ty && (tx !== to.tx || ty !== to.ty));
    let path = findPath(this.map.w, this.map.h, blocked, from, to);
    if (!path || this.blockedFor()(x, y)) {
      // 막힌 곳을 누르면 거절하지 않고, 걸어서 닿을 수 있는 칸 중 그 지점에 가장 가까운 곳으로 간다.
      // 상호작용(onArrive)은 원래 목적지에 닿았을 때만 실행한다.
      const near = reachableTiles(this.map.w, this.map.h, (tx, ty) => this.isSolidTile(tx, ty) || this.entrances.some((e) => e.tx === tx && e.ty === ty), from)
        .reduce((best, t) => { const p = standPos(t.tx, t.ty); const d = Math.hypot(p.x - x, p.y - y); return d < best.d ? { t, d } : best; }, { t: from, d: Infinity }).t;
      path = findPath(this.map.w, this.map.h, blocked, from, near);
      if (!path || path.length === 0) { player.stop(); this.destination = null; this.face(player, x, y); return; }
      const end = standPos(near.tx, near.ty);
      this.destination = end;
      player.followPath(path.map((t) => standPos(t.tx, t.ty)), () => { this.destination = null; this.face(player, x, y); });
      return;
    }
    this.destination = { x, y };
    const points = path.slice(0, -1).map((t) => standPos(t.tx, t.ty));
    points.push({ x, y });
    player.followPath(points, () => { this.destination = null; onArrive?.(); });
  }

  hitObject(wx, wy) {
    const ordered = this.objects.slice().sort((a, b) => (a.floor ? -Infinity : a.bottom) - (b.floor ? -Infinity : b.bottom));
    for (let i = ordered.length - 1; i >= 0; i--) {
      const o = ordered[i];
      if (o.spr.missing && !o.interact) continue;
      const width = o.label ? Math.max(o.spr.w, o.label.length * 10 + 14) : o.spr.w;
      const x0 = o.tx * TILE + (o.spr.w - width) / 2;
      if (wx >= x0 && wx < x0 + width && wy >= o.drawY - (o.label ? 24 : 0) && wy < o.drawY + o.spr.h) return o;
    }
    return null;
  }

  hitNpc(wx, wy) {
    return this.npcs.slice().sort((a, b) => b.character.y - a.character.y).find((n) => {
      const p = n.character.drawPos();
      return wx >= p.x && wx < p.x + p.w && wy >= p.y && wy < p.y + p.h;
    }) ?? null;
  }

  onTap(wx, wy, game) {
    const player = game.player;
    let npc = this.hitNpc(wx, wy);
    let obj = this.hitObject(wx, wy);
    if (npc && obj) { if (!obj.floor && obj.bottom >= npc.character.y) npc = null; else obj = null; }
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
        if (npc && Math.hypot(npc.character.x - player.x, npc.character.y - player.y) > TILE * 2) return;
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
    if (!player.walking) this.destination = null;
    const npcBlocked = this.blockedStatic();
    for (const n of this.npcs) {
      if (n.wander) this.updateWander(n, dt);
      n.character.update(dt, n.wander ? npcBlocked : () => true);
    }
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
    if (this.groundTile) r.drawBackdrop?.(this.groundTile);
    const floors = this.objects.filter((o) => o.floor);
    if (r.drawGround?.(this.map, this.bgImage, floors, this.groundTile) !== true) {
      if (this.bgImage) {
        r.drawCanvas(this.bgImage, 0, 0);
      } else {
        for (let ty = 0; ty < this.map.h; ty++) {
          for (let tx = 0; tx < this.map.w; tx++) {
            const tile = tileAt(this.map, tx, ty);
            const id = tile === 'H' && this.groundTile ? this.groundTile : tile;
            if (r.drawGardenTile) r.drawGardenTile(id, tx * TILE, ty * TILE, [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => tileAt(this.map, tx + dx, ty + dy) === 'N'));
            else r.drawTile(id, tx * TILE, ty * TILE);
          }
        }
      }
      for (const o of floors) r.drawSprite(o.spr, o.tx * TILE, o.drawY);
    }
    if (this.destination) r.drawDestination?.(this.destination.x, this.destination.y);
    const items = [];
    for (const o of this.objects) if (!o.floor) items.push({ y: o.bottom, draw: () => { r.drawSprite(o.spr, o.tx * TILE, o.drawY); o.drawContent?.(r); } });
    const chars = [player, ...this.npcs.map((n) => n.character)];
    for (const c of chars) {
      const p = c.drawPos();
      items.push({ y: c.y, draw: () => { r.drawSprite(c.sprite(r.reducedMotion), p.x, p.y, c.motion(r.reducedMotion)); if (c === player || this.hosts?.includes(c) || Math.hypot(c.x - player.x, c.y - player.y) < 96 || c.bubble) r.drawNameTag(c.name, p.x + p.w / 2, p.y - 2); } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    r.drawPlayerMarker?.(player.x, player.y);
    for (const o of this.objects) if (o.label) r.drawLabel?.(o.label, o.tx * TILE + o.spr.w / 2, o.drawY - 6);
    for (const c of chars) if (c.bubble) { const p = c.drawPos(); r.drawBubble(c.bubble, p.x + p.w / 2, p.y - 16); }
  }
}
