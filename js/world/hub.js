import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { showOverlay } from '../ui/overlay.js';
import { characterSet } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { displayName } from '../config.js';

// 11열 × 27행(352×864px). 잔디가 외곽까지 이어지는 정원, 가운데 3칸 버진로드, 바깥 꽃장식과 양옆 하객.
// 타일: H 외곽 충돌 마스크(화면은 G), G 잔디, N 모래 돌길(4~6열)
// 이야기 길을 없애며 생긴 여유를 정원에 돌려줬다(정원 17행). 하객이 모이는 공간이 이 청첩장의 중심이다.
const GARDEN_ROWS = 17;
const gardenRow = () => 'HGGGNNNGGGH'; // 꽃무늬를 섞지 않고 단상·꽃길에 시선을 모은다.
const crossRow = 'HNNNNNNNNNH';
const CROSS_A = GARDEN_ROWS + 1;   // 18 교차로
const BLOCK_A = CROSS_A + 1;       // 19 문: 안내소/갤러리
const CROSS_B = BLOCK_A + 3;       // 22 교차로
const BLOCK_B = CROSS_B + 1;       // 23 문: 마음 전하기/방명록
export const HUB_ROWS = [
  'HHHHHHHHHHH',
  ...Array.from({ length: GARDEN_ROWS }, (_, i) => gardenRow(i + 1)),
  // 네 표지판 아래까지 같은 모래빛 바닥으로 이어지는 입구 광장.
  ...Array.from({ length: BLOCK_B + 3 - CROSS_A }, () => crossRow),
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 8 }; // 단상 앞에서 시작해 두 사람의 얼굴이 상단 HUD에 가리지 않게 한다.

// 발은 단상 윗면 위에, 두 사람의 실제 그림 사이에는 몇 px만 남긴다.
export const CEREMONY = { groomX: 157, brideX: 192, feetY: 176, aisleStart: 5, aisleEnd: BLOCK_B + 2, flowerStart: 6, flowerEnd: GARDEN_ROWS - 1, flowerStep: 2 };

function ceremonyFloors(assets) {
  const objects = [];
  if (assets?.objects?.['aisle-runner']) {
    for (let ty = CEREMONY.aisleStart; ty <= CEREMONY.aisleEnd; ty++) {
      objects.push({ id: `aisle-${ty}`, sprite: 'aisle-runner', tx: 4, ty, floor: true });
    }
  }
  for (const [sprite, tx] of [['aisle-flower-left', 3], ['aisle-flower-right', 7]]) {
    if (!assets?.objects?.[sprite]) continue;
    for (let ty = CEREMONY.flowerStart; ty <= CEREMONY.flowerEnd; ty += CEREMONY.flowerStep) {
      objects.push({ id: `${sprite}-${ty}`, sprite, tx, ty, floor: true });
    }
  }
  return objects;
}

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  // sign은 64×64(2×2칸)라 문 옆 두 칸을 차지한다
  guestbook: { door: { tx: 1, ty: BLOCK_A }, sign: { tx: 2, ty: BLOCK_A }, back: { tx: 1, ty: CROSS_A }, label: '방명록 정원' },
  gallery:   { door: { tx: 9, ty: BLOCK_A }, sign: { tx: 7, ty: BLOCK_A }, back: { tx: 9, ty: CROSS_A }, label: '갤러리관' },
  gifts:     { door: { tx: 1, ty: BLOCK_B }, sign: { tx: 2, ty: BLOCK_B }, back: { tx: 1, ty: CROSS_B }, label: '마음 전하는 곳' },
  info:      { door: { tx: 9, ty: BLOCK_B }, sign: { tx: 7, ty: BLOCK_B }, back: { tx: 9, ty: CROSS_B }, label: '예식 안내소' },
};

/** 꽃은 3/7열, 하객은 그 바깥 잔디에 모인다. 중앙 세 칸은 전부 버진로드다. */
export const GUEST_ZONE = { cols: [1, 2, 8, 9], rowMin: 6, rowMax: GARDEN_ROWS };

export const MAX_GUESTS = 30;
/** 실제 하객이 이보다 적으면 이름이 "하객"인 분위기용 캐릭터로 채운다(방명록·메시지 수에는 포함하지 않는다). */
export const MIN_CROWD = 10;
const EXTRA_LINES = ['결혼 축하해요! 🎉', '두 분 정말 잘 어울려요', '행복하세요 🌸', '오늘 날씨도 축하하나 봐요'];

/** 실제 하객 목록 뒤에 부족한 만큼 "하객"을 붙인다. 실제 하객이 늘면 그만큼 자리를 비켜 준다. */
export function withExtras(guests) {
  const need = Math.max(0, MIN_CROWD - guests.length);
  const extras = Array.from({ length: need }, (_, i) => ({ t: -1 - i, n: '하객', c: (i * 3 + 1) % 10, m: '', extra: i }));
  return [...guests, ...extras];
}
const guestKey = (e) => (e.extra !== undefined ? `extra:${e.extra}` : `${e.n}:${e.c}`);

/**
 * 하객 두 명이 너무 붙었는지. 레퍼런스처럼 빽빽하게 서되 몸이 포개지지 않게:
 * 같은 열은 위아래 한 칸 비우고(키 72px), 옆 열은 같은 줄만 피한다(폭 48px > 타일 32px). 대각선은 허용.
 */
export function tooClose(a, b) {
  const dx = Math.abs(a.tx - b.tx), dy = Math.abs(a.ty - b.ty);
  return (dx === 0 && dy <= 1) || (dx === 1 && dy === 0);
}

/**
 * 방명록 항목 → 광장 잔디 위 하객 자리. reserved: "tx,ty" 제외 집합. 같은 입력이면 같은 배치.
 * 캐릭터가 2칸 폭이라 서로 인접(8방향)하지 않게 간격을 둔다. 자리가 모자라면 남는 항목은 생략.
 */
export function guestPlacements(entries, reserved) {
  const list = entries.slice(0, MAX_GUESTS);
  const zone = freeTiles(HUB_ROWS, reserved).filter((t) => GUEST_ZONE.cols.includes(t.tx) && t.ty >= GUEST_ZONE.rowMin && t.ty <= GUEST_ZONE.rowMax);
  const preferred = [7, 9, 11, 13, 15].flatMap((ty) => [2, 8].map((tx) => ({ tx, ty })));
  const available = new Set(zone.map((t) => `${t.tx},${t.ty}`));
  const shuffled = [...preferred.filter((t) => available.has(`${t.tx},${t.ty}`)), ...pickTiles(zone, Infinity, 2026)];
  const chosen = [];
  for (const t of shuffled) {
    if (chosen.length >= list.length) break;
    if (chosen.some((c) => tooClose(c, t))) continue;
    chosen.push(t);
  }
  return chosen.map((t, i) => ({ tx: t.tx, ty: t.ty, entry: list[i] }));
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** 한 사람의 여러 글은 목록에 유지하되 광장의 캐릭터는 한 명만 만든다. */
export function uniqueGuests(entries) {
  const selected = new Map();
  for (const entry of entries) {
    const key = `${entry.n}:${entry.c}`;
    const previous = selected.get(key);
    if (!previous || (!previous.m && entry.m) || (!!previous.m === !!entry.m && entry.t > previous.t)) selected.set(key, entry);
  }
  return [...selected.values()];
}

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    // 아치와 단상 중앙에서 두 사람이 행진을 앞두고 가까이 나란히 선다.
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: displayName(cfg.groom), x: CEREMONY.groomX, y: CEREMONY.feetY });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: displayName(cfg.bride), x: CEREMONY.brideX, y: CEREMONY.feetY });
    groom.dir = 'down'; bride.dir = 'down';
    const joined = game.assets?.characters?.couple ? new Character({
      sprites: game.assets.characters.couple, name: `${displayName(cfg.groom)} ♥ ${displayName(cfg.bride)}`,
      x: 176, y: CEREMONY.feetY,
    }) : null;
    const hosts = joined ? [joined] : [groom, bride];
    const greet = (c) => () => c.say(pick(cfg.greetings));
    const guide = new Character({ sprites: characterSet(game.assets, 'preset-4', presetSprites(4)), name: '정원 안내인', ...standPos(3, CROSS_A) });
    const guideNpc = { character: guide, solid: false, interact: () => showOverlay(game, {
      title: '작은 정원에 오신 걸 환영해요',
      html: '<p>두 사람에게 축하 편지를 남기면 정원에 꽃이 피어요.</p><p>꽃과 하객을 누르면 남겨진 마음을 읽을 수 있어요. 공간 메뉴에서는 사진과 결혼 소식도 만나 보세요.</p>',
      buttons: [{ label: '좋아요' }],
    }) };

    // 아치는 PNG 폭(160=5칸, 224=7칸 …)에 맞춰 돌길 중앙(5열)에 가운데 정렬한다
    const archTiles = Math.round((game.assets?.objects?.arch?.w ?? 160) / 32);
    const treeCols = Math.ceil((game.assets?.objects?.tree?.w ?? 96) / 32);
    const objects = [
      // 버진로드는 단상보다 먼저 합성해 시작 부분이 단상 밑으로 자연스럽게 이어진다.
      ...ceremonyFloors(game.assets),
      // 나무 한 쌍은 바깥 가장자리에 두어 꽃길·하객과 겹치지 않게 한다.
      { id: 'tree-left', sprite: 'tree', tx: 0, ty: 5 },
      { id: 'tree-right', sprite: 'tree', tx: 11 - treeCols, ty: 5 },
      // 리셉션 소품은 나무 아래 바깥 잔디에만 놓고 중앙 통로를 비운다.
      ...(game.assets?.objects?.['party-table'] ? [
        { id: 'party-table-left', sprite: 'party-table', tx: 0, ty: 12 },
        { id: 'party-table-right', sprite: 'party-table', tx: 9, ty: 12 },
      ] : []),
      ...(game.assets?.objects?.['ribbon-lantern'] ? [
        { id: 'ribbon-left', sprite: 'ribbon-lantern', tx: 0, ty: 8 },
        { id: 'ribbon-right', sprite: 'ribbon-lantern', tx: 10, ty: 8 },
      ] : []),
      { id: 'arch', sprite: 'arch', tx: 5 - Math.floor(archTiles / 2), ty: 0, solid: false },
      // 단상(160×64, 3~7열 × 4~5행): 바닥 장식이라 신랑신부 발밑에 깔리고 충돌 없음. assets/objects/platform.png가 있을 때만 표시
      ...(game.assets?.objects?.platform ? [{ id: 'platform', sprite: 'platform', tx: 3, ty: 4, floor: true }] : []),
    ];
    const entrances = [];
    for (const [id, d] of Object.entries(HUB_DOORS)) {
      objects.push({ id: `door-${id}`, sprite: 'door', floor: true, ...d.door });
      objects.push({ id: `sign-${id}`, sprite: id === 'guestbook' ? 'welcome-board' : 'sign', label: d.label, ...d.sign, interact: (g) => g.goTo(id) });
      entrances.push({ ...d.door, to: id, spawn: null }); // spawn null → 해당 씬의 기본 spawn
    }

    super({
      id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN, objects, entrances, assets: game.assets, groundTile: 'G',
      npcs: [...hosts.map((character) => ({ character, interact: greet(character) })), guideNpc],
    });
    this.game = game;
    this.hosts = hosts;
    this.guide = guide;
    this.baseNpcs = this.npcs.slice();
    this.setGuests(game.data?.messages ?? []);
  }

  /** 방명록 목록 → 광장 하객 NPC 재배치. 탭하면 그 사람 메시지를 말풍선으로. */
  setGuests(entries) {
    this.npcs = this.baseNpcs;
    this.rebuildSolid(); // 오브젝트 발자국 + 신랑신부 자리
    const reserved = new Set(this.extraSolid);
    for (const o of this.objects) { // 오브젝트가 덮는 타일(표지판은 주변 1칸까지)
      if (o.spr.missing || o.floor) continue; // 얇은 바닥 꽃장식을 32px 전체 장애물로 예약하지 않는다.
      const w = Math.ceil(o.spr.w / 32), h = Math.ceil(o.spr.h / 32);
      const m = o.sprite === 'sign' ? 1 : 0;
      for (let dy = -m; dy < h + m; dy++) for (let dx = -m; dx < w + m; dx++) reserved.add(`${o.tx + dx},${o.ty + dy}`);
    }
    for (const h of this.hosts) { // 신랑·신부 주변 1칸도 비운다
      const t = this.tileOf(h.x, h.y);
      const radiusX = Math.max(1, Math.ceil(h.sprite().w / 64)); // 두 사람짜리 프레임은 단상 양옆까지 여유를 둔다.
      for (let dy = -1; dy <= 1; dy++) for (let dx = -radiusX; dx <= radiusX; dx++) reserved.add(`${t.tx + dx},${t.ty + dy}`);
    }
    const guideTile = this.tileOf(this.guide.x, this.guide.y);
    for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(`${guideTile.tx + dx},${guideTile.ty + dy}`);
    reserved.add(`${HUB_SPAWN.tx},${HUB_SPAWN.ty}`);
    for (const d of Object.values(HUB_DOORS)) {
      reserved.add(`${d.door.tx},${d.door.ty}`);
      reserved.add(`${d.back.tx},${d.back.ty}`);
    }
    const me = this.game?.profile?.nickname;
    const others = withExtras(uniqueGuests(entries).filter((e) => e.n !== me).slice(0, MAX_GUESTS)); // 본인은 플레이어로 이미 있으므로 제외
    const wanderReserved = new Set(reserved);
    const inZone = (tx, ty) => GUEST_ZONE.cols.includes(tx) && ty >= GUEST_ZONE.rowMin && ty <= GUEST_ZONE.rowMax && !wanderReserved.has(`${tx},${ty}`);
    const faceAisle = () => 'down'; // 레퍼런스처럼 모두 정면(카메라)을 본다
    const previous = this.guestMap ?? new Map();
    this.guestMap = new Map();
    const retained = others.filter((entry) => previous.has(guestKey(entry)));
    for (const entry of retained) {
      const n = previous.get(guestKey(entry));
      const current = this.tileOf(n.character.x, n.character.y);
      for (const center of [current, n.wander.home, n.wander.target].filter(Boolean)) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (tooClose(center, { tx: center.tx + dx, ty: center.ty + dy })) reserved.add(`${center.tx + dx},${center.ty + dy}`);
        }
      }
    }
    const placements = [
      ...retained.map((entry) => ({ entry, ...previous.get(guestKey(entry)).wander.home })),
      ...guestPlacements(others.filter((entry) => !previous.has(guestKey(entry))), reserved),
    ];
    const guests = placements.map(({ tx, ty, entry }) => {
      const key = guestKey(entry);
      if (previous.has(key)) { const n = previous.get(key); n.entry = entry; this.guestMap.set(key, n); return n; }
      const id = ((entry.c % PRESET_COUNT) + PRESET_COUNT) % PRESET_COUNT;
      const c = new Character({ sprites: characterSet(this.assets, `preset-${id}`, presetSprites(id)), name: entry.n, ...standPos(tx, ty) });
      c.dir = faceAisle(tx);
      const npc = {
        entry, character: c, solid: false, // 돌아다니므로 플레이어가 지나갈 수 있다
        wander: { home: { tx, ty }, radius: 1, allow: (x, y) => x === tx && inZone(x, y), faceDir: faceAisle, timer: 1 + Math.random() * 6 },
        interact: () => { c.stop(); c.say(npc.entry.m || '결혼 축하해요! 🎉', 4); },
      };
      this.guestMap.set(key, npc); return npc;
    });
    this.npcs = [...this.baseNpcs, ...guests];
    this.rebuildSolid();
  }
}

export function createHub(game) { return new HubScene(game); }
