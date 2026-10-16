import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { showOverlay } from '../ui/overlay.js';
import { characterSet } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { displayName } from '../config.js';

// 11열 × 26행(352×832px). 레퍼런스(@dding_one)처럼: 울타리 안 잔디 정원, 가운데 3칸 폭 모래 돌길, 가장자리 나무·덤불, 하객은 길 위까지 가득.
// 타일: H 그늘진 잔디(막힘), G 잔디, J/U 꽃 섞인 잔디, N 모래 돌길(4~6열)
const FLOWER_SEED = 7;
const grassAt = (tx, ty) => { const v = (tx * 73856093 ^ ty * 19349663 ^ FLOWER_SEED) >>> 0; return v % 7 === 0 ? 'J' : v % 11 === 0 ? 'U' : 'G'; };
const gardenRow = (ty) => 'H' + Array.from({ length: 9 }, (_, i) => { const tx = i + 1; return tx >= 4 && tx <= 6 ? 'N' : grassAt(tx, ty); }).join('') + 'H';
const crossRow = 'HNNNNNNNNNH';
const blockRow = (ty) => 'H' + Array.from({ length: 9 }, (_, i) => { const tx = i + 1; return tx === 1 || tx === 9 || (tx >= 4 && tx <= 6) ? 'N' : grassAt(tx, ty); }).join('') + 'H';
export const HUB_ROWS = [
  'HHHHHHHHHHH',
  ...Array.from({ length: 13 }, (_, i) => gardenRow(i + 1)), // rows 1..13 정원(아치·신랑신부·하객)
  crossRow,                                                  // 14 교차로
  blockRow(15), blockRow(16), blockRow(17),                  // 15 문: 안내소/갤러리
  crossRow,                                                  // 18
  blockRow(19), blockRow(20), blockRow(21),                  // 19 문: 이야기/방명록
  crossRow,                                                  // 22
  blockRow(23), blockRow(24),                                // 24 문: 마음 전하기
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 9 }; // 돌길 중간에서 시작: 위로 신랑신부, 주변에 하객들

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  // sign은 64×64(2×2칸)라 문 옆 두 칸을 차지한다
  info:      { door: { tx: 1, ty: 15 }, sign: { tx: 2, ty: 15 }, back: { tx: 1, ty: 14 }, label: '예식 안내소' },
  gallery:   { door: { tx: 9, ty: 15 }, sign: { tx: 7, ty: 15 }, back: { tx: 9, ty: 14 }, label: '갤러리관' },
  story:     { door: { tx: 1, ty: 19 }, sign: { tx: 2, ty: 19 }, back: { tx: 1, ty: 18 }, label: '우리 이야기 길' },
  guestbook: { door: { tx: 9, ty: 19 }, sign: { tx: 7, ty: 19 }, back: { tx: 9, ty: 18 }, label: '방명록 정원' },
  gifts:     { door: { tx: 5, ty: 24 }, sign: { tx: 3, ty: 23 }, back: { tx: 5, ty: 23 }, label: '마음 전하는 곳' },
};

/** 가장자리 장식: 울타리 안쪽을 따라 큰 나무(96×96)와 꽃덤불(64×64)을 번갈아 둔다. 레퍼런스처럼 나무가 양옆 경계를 만든다. */
const DECOR = [ // 0~4행은 큰 아치(최대 7칸 폭) 자리라 비워 둔다
  { sprite: 'tree', tx: 1, ty: 5 }, { sprite: 'tree', tx: 7, ty: 5 },
  { sprite: 'bush-white', tx: 1, ty: 9 }, { sprite: 'bush-white', tx: 8, ty: 9 },
  { sprite: 'bush', tx: 1, ty: 12 }, { sprite: 'bush-white', tx: 8, ty: 12 },
  { sprite: 'bush', tx: 3, ty: 16 }, { sprite: 'bush', tx: 6, ty: 16 },
  { sprite: 'bush', tx: 3, ty: 20 }, { sprite: 'bush', tx: 6, ty: 20 },
];

/** 하객이 서는 구역: 아치 아래 5행부터 입구 직전 13행까지, 돌길 위를 포함한 정원 전체(1~9열) */
export const GUEST_ZONE = { cols: [1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 6, rowMax: 13 }; // 5행은 신랑신부

export const MAX_GUESTS = 30;

/**
 * 방명록 항목 → 광장 잔디 위 하객 자리. reserved: "tx,ty" 제외 집합. 같은 입력이면 같은 배치.
 * 캐릭터가 2칸 폭이라 서로 인접(8방향)하지 않게 간격을 둔다. 자리가 모자라면 남는 항목은 생략.
 */
export function guestPlacements(entries, reserved) {
  const list = entries.slice(0, MAX_GUESTS);
  const zone = freeTiles(HUB_ROWS, reserved).filter((t) => GUEST_ZONE.cols.includes(t.tx) && t.ty >= GUEST_ZONE.rowMin && t.ty <= GUEST_ZONE.rowMax);
  const shuffled = pickTiles(zone, Infinity, 2026);
  const chosen = [];
  for (const t of shuffled) {
    if (chosen.length >= list.length) break;
    if (chosen.some((c) => Math.abs(c.tx - t.tx) <= 1 && Math.abs(c.ty - t.ty) <= 2)) continue; // 폭 48px·높이 72px를 고려해 간격 유지
    chosen.push(t);
  }
  return chosen.map((t, i) => ({ tx: t.tx, ty: t.ty, entry: list[i] }));
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    // 아치(224×160, 0~4행) 바로 앞 5행, 돌길 한가운데(x=176)에 어깨를 맞대고 나란히. 예식이 진행 중인 장면.
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: displayName(cfg.groom), x: 176 - 24, y: standPos(5, 5).y });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: displayName(cfg.bride), x: 176 + 24, y: standPos(5, 5).y });
    groom.dir = 'down'; bride.dir = 'down';
    const greet = (c) => () => c.say(pick(cfg.greetings));
    const guide = new Character({ sprites: characterSet(game.assets, 'preset-4', presetSprites(4)), name: '정원 안내인', ...standPos(3, 11) });
    const guideNpc = { character: guide, solid: false, interact: () => showOverlay(game, {
      title: '작은 정원에 오신 걸 환영해요',
      html: '<p>두 사람에게 축하 편지를 남기면 정원에 꽃이 피어요.</p><p>꽃과 하객을 누르면 남겨진 마음을 읽을 수 있어요. 공간 메뉴에서는 사진과 이야기도 만나 보세요.</p>',
      buttons: [{ label: '좋아요' }],
    }) };

    // 아치는 PNG 폭(160=5칸, 224=7칸 …)에 맞춰 돌길 중앙(5열)에 가운데 정렬한다
    const archTiles = Math.round((game.assets?.objects?.arch?.w ?? 160) / 32);
    const objects = [
      { id: 'arch', sprite: 'arch', tx: 5 - Math.floor(archTiles / 2), ty: 0, solid: false },
      // 단상(160×64, 3~7열 × 4~5행): 바닥 장식이라 신랑신부 발밑에 깔리고 충돌 없음. assets/objects/platform.png가 있을 때만 표시
      ...(game.assets?.objects?.platform ? [{ id: 'platform', sprite: 'platform', tx: 3, ty: 4, floor: true }] : []),
      ...DECOR.map((d, i) => ({ id: `decor${i}`, ...d })),
    ];
    const entrances = [];
    for (const [id, d] of Object.entries(HUB_DOORS)) {
      objects.push({ id: `door-${id}`, sprite: 'door', floor: true, ...d.door });
      objects.push({ id: `sign-${id}`, sprite: id === 'guestbook' ? 'welcome-board' : 'sign', label: d.label, ...d.sign, interact: (g) => g.goTo(id) });
      entrances.push({ ...d.door, to: id, spawn: null }); // spawn null → 해당 씬의 기본 spawn
    }

    super({
      id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN, objects, entrances, assets: game.assets,
      npcs: [{ character: groom, interact: greet(groom) }, { character: bride, interact: greet(bride) }, guideNpc],
    });
    this.game = game;
    this.hosts = [groom, bride];
    this.baseNpcs = this.npcs.slice();
    this.setGuests(game.data?.messages ?? []);
  }

  /** 방명록 목록 → 광장 하객 NPC 재배치. 탭하면 그 사람 메시지를 말풍선으로. */
  setGuests(entries) {
    this.npcs = this.baseNpcs;
    this.rebuildSolid(); // 오브젝트 발자국 + 신랑신부 자리
    const reserved = new Set(this.extraSolid);
    for (const o of this.objects) { // 오브젝트가 덮는 타일(표지판은 주변 1칸까지)
      const w = Math.ceil(o.spr.w / 32), h = Math.ceil(o.spr.h / 32);
      const m = o.sprite === 'sign' ? 1 : 0;
      for (let dy = -m; dy < h + m; dy++) for (let dx = -m; dx < w + m; dx++) reserved.add(`${o.tx + dx},${o.ty + dy}`);
    }
    for (const h of this.hosts) { // 신랑·신부 주변 1칸도 비운다
      const t = this.tileOf(h.x, h.y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${t.tx + dx},${t.ty + dy}`);
    }
    const guideTile = this.tileOf(this.baseNpcs[2].character.x, this.baseNpcs[2].character.y);
    for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${guideTile.tx + dx},${guideTile.ty + dy}`);
    reserved.add(`${HUB_SPAWN.tx},${HUB_SPAWN.ty}`);
    for (const d of Object.values(HUB_DOORS)) {
      reserved.add(`${d.door.tx},${d.door.ty}`);
      reserved.add(`${d.back.tx},${d.back.ty}`);
    }
    const me = this.game?.profile?.nickname;
    const others = entries.filter((e) => e.n !== me); // 본인은 플레이어로 이미 있으므로 제외
    const wanderReserved = new Set(reserved);
    const inZone = (tx, ty) => GUEST_ZONE.cols.includes(tx) && ty >= GUEST_ZONE.rowMin && ty <= GUEST_ZONE.rowMax && !wanderReserved.has(`${tx},${ty}`);
    const faceAisle = () => 'down'; // 레퍼런스처럼 모두 정면(카메라)을 본다
    const previous = this.guestMap ?? new Map();
    this.guestMap = new Map();
    const retained = others.filter((entry) => previous.has(`${entry.n}:${entry.c}`));
    for (const entry of retained) {
      const n = previous.get(`${entry.n}:${entry.c}`);
      const current = this.tileOf(n.character.x, n.character.y);
      for (const center of [current, n.wander.home, n.wander.target].filter(Boolean)) {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${center.tx + dx},${center.ty + dy}`);
      }
    }
    const placements = [
      ...retained.map((entry) => ({ entry, ...previous.get(`${entry.n}:${entry.c}`).wander.home })),
      ...guestPlacements(others.filter((entry) => !previous.has(`${entry.n}:${entry.c}`)), reserved),
    ];
    const guests = placements.map(({ tx, ty, entry }) => {
      const key = `${entry.n}:${entry.c}`;
      if (previous.has(key)) { const n = previous.get(key); n.entry = entry; this.guestMap.set(key, n); return n; }
      const id = ((entry.c % PRESET_COUNT) + PRESET_COUNT) % PRESET_COUNT;
      const c = new Character({ sprites: characterSet(this.assets, `preset-${id}`, presetSprites(id)), name: entry.n, ...standPos(tx, ty) });
      c.dir = faceAisle(tx);
      const npc = {
        entry, character: c, solid: false, // 돌아다니므로 플레이어가 지나갈 수 있다
        wander: { home: { tx, ty }, radius: 2, allow: inZone, faceDir: faceAisle, timer: 1 + Math.random() * 6 },
        interact: () => { c.stop(); c.say(npc.entry.m || '결혼 축하해요! 🎉', 4); },
      };
      this.guestMap.set(key, npc); return npc;
    });
    this.npcs = [...this.baseNpcs, ...guests];
    this.rebuildSolid();
  }
}

export function createHub(game) { return new HubScene(game); }
