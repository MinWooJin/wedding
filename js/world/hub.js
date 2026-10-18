import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { showOverlay } from '../ui/overlay.js';
import { characterSet, EXTRA_GUEST_COUNT } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { findPath } from './movement.js';
import { displayName } from '../config.js';
import { PetalField, petalSheet } from './petals.js';

// 11열 × 27행(352×864px). 레퍼런스(Pixel Guestbook)처럼: 종·커튼 아치 아래 계단 단상의 두 사람,
// 그 아래로 버진로드와 길 가장자리 꽃띠, 양옆 잔디에 하객이 무리 지어 서고 가장자리는 나무·덤불·라벤더가 감싼다.
// 타일: H 외곽 충돌 마스크(화면은 G), G/J/U 잔디(같은 바탕에 들꽃만 다름), N 모래 돌길(4~6열)
const GARDEN_ROWS = 17;
/** 잔디에 흰 들꽃(J)·분홍/노랑 들꽃(U)을 드문드문 섞는다. 위치는 고정(결정적). */
export const grassAt = (tx, ty) => {
  const v = (Math.imul(tx + 11, 73856093) ^ Math.imul(ty + 7, 19349663)) >>> 0;
  return v % 7 === 0 ? 'J' : v % 11 === 0 ? 'U' : 'G';
};
const gardenRow = (ty) => 'H' + Array.from({ length: 9 }, (_, i) => (i >= 3 && i <= 5 ? 'N' : grassAt(i + 1, ty))).join('') + 'H';
const crossRow = 'HNNNNNNNNNH';
const CROSS_A = GARDEN_ROWS + 1;   // 18 교차로
const BLOCK_A = CROSS_A + 1;       // 19 문: 방명록/갤러리
const CROSS_B = BLOCK_A + 3;       // 22 교차로
const BLOCK_B = CROSS_B + 1;       // 23 문: 마음 전하기/예식 안내소
export const HUB_ROWS = [
  'HHHHHHHHHHH',
  ...Array.from({ length: GARDEN_ROWS }, (_, i) => gardenRow(i + 1)),
  // 네 표지판 아래까지 같은 모래빛 바닥으로 이어지는 입구 광장.
  ...Array.from({ length: BLOCK_B + 3 - CROSS_A }, () => crossRow),
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 7 }; // 단상 바로 앞에서 시작해 작은 화면에서도 두 사람의 얼굴이 상단 바에 가리지 않게 한다.

/**
 * 예식 무대 좌표.
 * 계단 단상(160×64, 그림은 y14부터)을 4행에 두면 넓은 윗면이 y148~164라 두 사람의 발(feetY 160)이 그 위에 선다.
 * 버진로드 깔개는 5행부터 광장 끝까지, 꽃띠는 깔개 바로 바깥(왼쪽 그림 끝 x128, 오른쪽 시작 x224)에 끊김 없이 붙인다.
 */
export const CEREMONY = {
  groomX: 157, brideX: 192, feetY: 160, stageTy: 4,
  aisleStart: 5, aisleEnd: BLOCK_B + 2,
  edgeStart: 6, edgeEnd: GARDEN_ROWS,
  // 꽃띠 PNG(32×32)의 실제 그림은 x10..22다.
  edgeLeftX: 128 - 22, edgeRightX: 224 - 10,
};

/** PNG가 있을 때만 장식을 넣는다(그림이 없으면 그 장식만 생략). */
const has = (assets, id) => !!assets?.objects?.[id];

function ceremonyFloors(assets) {
  const objects = [];
  if (has(assets, 'aisle-runner')) {
    for (let ty = CEREMONY.aisleStart; ty <= CEREMONY.aisleEnd; ty++) {
      objects.push({ id: `aisle-${ty}`, sprite: 'aisle-runner', tx: 4, ty, floor: true });
    }
  }
  // 같은 간격의 꽃다발 대신 위아래로 끊김 없이 이어지는 꽃띠(레퍼런스).
  for (const [sprite, x] of [['aisle-edge-left', CEREMONY.edgeLeftX], ['aisle-edge-right', CEREMONY.edgeRightX]]) {
    if (!has(assets, sprite)) continue;
    for (let ty = CEREMONY.edgeStart; ty <= CEREMONY.edgeEnd; ty++) {
      objects.push({ id: `${sprite}-${ty}`, sprite, tx: x / 32, ty, floor: true });
    }
  }
  if (has(assets, 'meadow-sprig')) {
    const patches = [[2, 7], [8, 8], [1, 10], [9, 11], [2, 13], [8, 14], [1, 16], [9, 17]];
    for (const [tx, ty] of patches) objects.push({ id: `meadow-${tx}-${ty}`, sprite: 'meadow-sprig', tx, ty, floor: true });
  }
  return objects;
}

/**
 * 정원 가장자리: 위쪽 모서리 둥근 초록 나무, 그 아래 벚꽃나무 한 쌍, 단상 양옆 화분 상자,
 * 바깥 열(0·10열, 원래 막힌 칸)을 따라 리본 조명·라벤더·장미 덤불·버드배스를 불규칙하게 둔다.
 * 바깥 열에 두면 하객 자리를 거의 줄이지 않고 틀만 만든다.
 */
function gardenEdges(assets, treeCols) {
  const list = [
    ['tree-green', 0, 0], ['tree-green', 8, 0],
    ['tree', 0, 6], ['tree', 11 - treeCols, 6],
    ['planter-box', 1, CEREMONY.stageTy], ['planter-box', 8, CEREMONY.stageTy],
    ['ribbon-lantern', 0, 10], ['lavender', 10, 10],
    ['lavender', 0, 12], ['ribbon-lantern', 10, 12],
    ['rose-bush-s', 0, 14], ['birdbath', 10, 14],
    ['lavender', 0, 16], ['rose-bush-s', 9, 16],
  ];
  return list.filter(([id]) => id === 'tree' || has(assets, id))
    .map(([sprite, tx, ty]) => ({ id: `edge-${sprite}-${tx}-${ty}`, sprite, tx, ty }));
}

/**
 * 입구 광장의 네 공간 그림. 같은 크기의 칸(96×112, 3칸 폭)에 2×2로 좌우 대칭 배치하고, 줄마다 바닥을 맞춘다.
 *   왼쪽 위 방명록 · 오른쪽 위 갤러리(바닥 20행) / 왼쪽 아래 마음 전하기 · 오른쪽 아래 예식 안내(바닥 24행)
 * 가운데 4~6열은 통로로 비운다. 충돌은 그림 맨 아랫줄만. 이름표는 그리지 않는다(그림이 곧 입구).
 * 그림이 없으면 예전 표지판(이름표 있음)으로 돌아간다.
 */
export const ENTRANCE_SLOT = { w: 96, h: 112 };
const SLOT_COLS = { left: 1, right: 7 };
// 그림 아래에 문구가 들어가도록 아래 줄을 한 칸 내렸다(위 줄 바닥 20행, 아래 줄 바닥 25행).
const SLOT_BOTTOM_ROW = { top: 20, bottom: 25 };
const LANDMARKS = {
  guestbook: { sprite: 'landmark-guestbook', col: 'left', row: 'top', fallback: 'welcome-board', caption: '방명록' },
  gallery: { sprite: 'landmark-gallery', col: 'right', row: 'top', caption: '갤러리' },
  gifts: { sprite: 'landmark-gifts', col: 'left', row: 'bottom', caption: '마음 보내기' },
  info: { sprite: 'landmark-info', col: 'right', row: 'bottom', caption: '예식장' },
};
/** 칸 안에 그림을 가운데·바닥 맞춤으로 놓을 타일 좌표 */
function slotPlace(spr, slot) {
  const rows = Math.ceil(spr.h / 32);
  // 칸보다 좁은 그림(임시 웰컴보드 64px)은 가운데에 가깝게 두되 타일 단위로 맞춘다(반 칸 좌표는 충돌·경로 계산을 깨뜨린다).
  return { tx: SLOT_COLS[slot.col] + Math.round((ENTRANCE_SLOT.w - spr.w) / 64), ty: SLOT_BOTTOM_ROW[slot.row] + 1 - rows };
}

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  // sign은 그림이 없을 때 쓰는 64×64 표지판 자리. back은 그 공간에서 돌아올 때 서는 자리(그림 옆 가운데 통로).
  guestbook: { door: { tx: 1, ty: BLOCK_A }, sign: { tx: 2, ty: BLOCK_A }, back: { tx: 4, ty: 21 }, label: '방명록 정원' },
  gallery:   { door: { tx: 9, ty: BLOCK_A }, sign: { tx: 7, ty: BLOCK_A }, back: { tx: 6, ty: 21 }, label: '갤러리관' },
  gifts:     { door: { tx: 1, ty: BLOCK_B }, sign: { tx: 2, ty: BLOCK_B }, back: { tx: 4, ty: 23 }, label: '마음 전하는 곳' },
  info:      { door: { tx: 9, ty: BLOCK_B }, sign: { tx: 7, ty: BLOCK_B }, back: { tx: 6, ty: 23 }, label: '예식 안내소' },
};

/**
 * 하객 구역. 처음에는 길 양옆 잔디(SIDE_COLS)에 무리 지어 서고, 돌아다니다 버진로드(4~6열)로도 건너간다.
 * 단, 단상 앞(AISLE_OPEN_FROM 행 전)의 길은 비워 두 사람이 가려지지 않게 한다.
 */
export const GUEST_ZONE = { cols: [1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 6, rowMax: GARDEN_ROWS };
export const SIDE_COLS = [1, 2, 3, 7, 8, 9];
export const AISLE_COLS = [4, 5, 6];
export const AISLE_OPEN_FROM = 9;
export const inGuestZone = (tx, ty) => GUEST_ZONE.cols.includes(tx) && ty >= GUEST_ZONE.rowMin && ty <= GUEST_ZONE.rowMax
  && (!AISLE_COLS.includes(tx) || ty >= AISLE_OPEN_FROM);

export const MAX_GUESTS = 30;
/** 실제 하객이 이보다 적으면 "하객" 분위기용 캐릭터로 채운다. 이름표는 숨기고 메시지 수에도 넣지 않는다. */
export const MIN_CROWD = 20;
export const EXTRA_LINES = ['결혼 축하해요! 🎉', '두 분 정말 잘 어울려요', '행복하세요 🌸', '오늘 날씨도 축하하나 봐요', '축하합니다 💐', '와, 너무 예쁘다', '오래오래 행복하세요'];

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
 * 방명록 항목 → 광장 하객 자리. reserved: "tx,ty" 제외 집합. 같은 입력이면 같은 배치.
 * 길 양옆을 먼저 채우고, 모자라면 버진로드 뒤쪽(단상에서 먼 곳)에 선다. 자리가 모자라면 남는 항목은 생략.
 */
export function guestPlacements(entries, reserved, mixAisle = false) {
  const list = entries.slice(0, MAX_GUESTS);
  const zone = freeTiles(HUB_ROWS, reserved).filter((t) => inGuestZone(t.tx, t.ty));
  const side = pickTiles(zone.filter((t) => SIDE_COLS.includes(t.tx)), Infinity, 2026);
  const aisle = pickTiles(zone.filter((t) => AISLE_COLS.includes(t.tx)), Infinity, 2027);
  const chosen = [];
  const fill = (tiles, limit) => {
    for (const t of tiles) {
      if (chosen.length >= limit) break;
      if (chosen.some((c) => tooClose(c, t))) continue;
      chosen.push(t);
    }
  };
  // 꽃띠를 막은 광장은 길 쪽 하객도 처음부터 섞어 두 줄 행렬처럼 보이지 않게 한다.
  fill(side, mixAisle ? Math.ceil(list.length * .7) : list.length);
  fill(aisle, list.length);
  fill(side, list.length);
  return chosen.map((t, i) => ({ tx: t.tx, ty: t.ty, entry: list[i] }));
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** 같은 문자열이면 같은 값(-1..1). 하객마다 칸 안에서 위치를 조금 흩뜨려 줄 맞춘 느낌을 없앤다. */
const hash01 = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return ((h >>> 0) % 1001) / 500 - 1; };
/** 말풍선용으로 글을 n자에서 자른다. */
export const short = (text, n = 30) => ([...text].length > n ? `${[...text].slice(0, n).join('')}…` : text);

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

/** 입장 행렬: 하객이 아래 교차로에서 반투명하게 나타나 버진로드를 따라 걸어와 자기 자리로 흩어진다. */
export const ARRIVAL = { gap: 0.35, fade: 0.6, speed: 80, from: { tx: 5, ty: CROSS_A } };
/** 가끔 한 명씩 들어오기: 60~120초마다 분위기용 하객 한 명이 (가능하면 화면 밖에서) 사라졌다가 아래 입구로 다시 걸어 들어온다. 군중 수는 늘지 않는다. */
export const DROP_IN = { min: 60, max: 120, first: 25 };
/** 자동 말풍선: 2.2~3.8초마다 화면 안의 하객 한 명이 축하를 말한다. 동시에 최대 2개. */
export const CHATTER = { min: 2.2, max: 3.8, maxBubbles: 2, hostChance: 0.15, seconds: 3.4 };
const GUEST_SPEED = 48;
/** 발에서 말풍선 꼭대기까지의 대략 높이(캐릭터 72 + 간격 + 말풍선 한 줄) */
const BUBBLE_ROOM = 130;

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    // 아치와 단상 중앙에서 두 사람이 가까이 나란히 선다.
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: displayName(cfg.groom), x: CEREMONY.groomX, y: CEREMONY.feetY });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: displayName(cfg.bride), x: CEREMONY.brideX, y: CEREMONY.feetY });
    groom.dir = 'down'; bride.dir = 'down';
    const joined = game.assets?.characters?.couple ? new Character({
      sprites: game.assets.characters.couple, name: `${displayName(cfg.groom)} ♥ ${displayName(cfg.bride)}`,
      x: 176, y: CEREMONY.feetY,
    }) : null;
    const hosts = joined ? [joined] : [groom, bride];
    const greet = (c) => () => c.say(pick(cfg.greetings));
    // Keep the guide in the open gap between the two entrance signs, with the
    // name below their captions rather than hidden behind the guestbook plaque.
    const guidePos = standPos(5, CROSS_A);
    guidePos.y += 8; // Leave a clear gap below the plaques for the name tag.
    guidePos.x -= 8; // 갤러리 랜드마크(6~8열)가 커져서 왼쪽으로 조금 비켜 선다(웰컴보드와도 겹치지 않음).
    const guide = new Character({ sprites: characterSet(game.assets, 'preset-4', presetSprites(4)), name: '정원 안내인', ...guidePos });
    const guideNpc = { character: guide, solid: false, interact: () => showOverlay(game, {
      title: '작은 정원에 오신 걸 환영해요',
      html: '<p>두 사람에게 축하 편지를 남기면 정원에 꽃이 피어요.</p><p>꽃과 하객을 누르면 남겨진 마음을 읽을 수 있어요. 공간 메뉴에서는 사진과 결혼 소식도 만나 보세요.</p>',
      buttons: [{ label: '좋아요' }],
    }) };

    // 아치는 PNG 폭(160=5칸, 224=7칸 …)에 맞춰 돌길 중앙(5열)에 가운데 정렬한다
    const archTiles = Math.round((game.assets?.objects?.arch?.w ?? 160) / 32);
    const treeCols = Math.ceil((game.assets?.objects?.tree?.w ?? 96) / 32);
    // 한 장의 배경 그림(assets.maps.hub)이 있으면 아치·단상·화분·나무·꽃띠·길이 모두 그 안에 있다(레퍼런스 방식).
    // 꽃과 벚꽃은 로더가 같은 배경 위에 합성하고, 리셉션 소품은 발자국이 있는 오브젝트로 올린다.
    const painted = !!game.assets?.maps?.hub;
    const objects = painted ? [] : [
      // 버진로드·꽃띠는 단상보다 먼저 합성해 시작 부분이 단상 밑으로 자연스럽게 이어진다.
      ...ceremonyFloors(game.assets),
      ...gardenEdges(game.assets, treeCols),
      { id: 'arch', sprite: 'arch', tx: 5 - Math.floor(archTiles / 2), ty: 0, solid: false },
      // 계단 단상(160×64, 3~7열): 바닥 장식이라 두 사람 발밑에 깔리고 충돌 없음.
      ...(has(game.assets, 'platform') ? [{ id: 'platform', sprite: 'platform', tx: 3, ty: CEREMONY.stageTy, floor: true }] : []),
    ];
    // 입구 광장은 네 공간의 그림만 둔다(사용자 결정: 가운데 케이크·테이블 같은 리셉션 소품과 문 앞 매트는 치움).
    // 걸어서 밟는 입구도 없다. 방명록 보드·갤러리 액자·선물·예식장 문을 누르면 바로 그 공간으로 넘어간다.
    const entrances = [];
    for (const [id, d] of Object.entries(HUB_DOORS)) {
      // 공간을 보여 주는 그림을 같은 칸에 놓는다. 그림이 하나도 없으면(코드 그림만 있을 때) 예전 표지판+이름표.
      const slot = LANDMARKS[id];
      const found = [slot.sprite, slot.fallback].find((s) => s && has(game.assets, s));
      // 광장 그림은 0.4배로 줄인 판(칸 폭 96에 가운데 맞춤, assets.js)을 쓴다. 없으면 원래 크기.
      const art = found && has(game.assets, `${found}-small`) ? `${found}-small` : found;
      if (art) objects.push({ id: `sign-${id}`, sprite: art, ...slotPlace(game.assets.objects[art], slot), instant: true, interact: (g) => g.goTo(id), name: d.label, caption: slot.caption });
      else objects.push({ id: `sign-${id}`, sprite: id === 'guestbook' ? 'welcome-board' : 'sign', label: d.label, ...d.sign, instant: true, interact: (g) => g.goTo(id) });
    }

    super({
      id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN, objects, entrances, assets: game.assets, groundTile: 'G',
      npcs: [...hosts.map((character) => ({ character, interact: greet(character) })), guideNpc],
    });
    this.game = game;
    this.painted = painted;
    this.petals = new PetalField();
    this.hosts = hosts;
    this.guide = guide;
    this.baseNpcs = this.npcs.slice();
    this.chatterT = CHATTER.min;
    this.dropInT = DROP_IN.first;
    this.setGuests(game.data?.messages ?? []);
  }

  /** 방명록 목록 → 광장 하객 NPC 재배치. 탭하면 그 사람 메시지를 말풍선으로. */
  setGuests(entries) {
    this.npcs = this.baseNpcs;
    this.rebuildSolid(); // 오브젝트 발자국 + 신랑신부 자리
    const reserved = new Set(this.extraSolid);
    for (const o of this.objects) { // 오브젝트가 덮는 타일(표지판은 주변 1칸까지)
      if (o.spr.missing || o.floor || o.solid === false) continue; // 바닥 장식·지나갈 수 있는 장식은 예약하지 않는다.
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
    if (this.painted) { // 배경 그림의 단상·화분(3~7열 × 4~5행)과 모서리 나무(0~2·8~10열 × 0~3행) 위에는 서지 않는다
      for (let ty = 4; ty <= 5; ty++) for (let tx = 1; tx <= 9; tx++) reserved.add(`${tx},${ty}`);
      for (let ty = 0; ty <= 3; ty++) for (const tx of [0, 1, 2, 8, 9, 10]) reserved.add(`${tx},${ty}`);
    }
    for (const d of Object.values(HUB_DOORS)) {
      reserved.add(`${d.door.tx},${d.door.ty}`);
      reserved.add(`${d.back.tx},${d.back.ty}`);
    }
    const me = this.game?.profile?.nickname;
    // 방명록 글을 남긴 사람만 광장에 선다(입장만 한 기록은 세지 않는다). 그 수만큼 분위기용 하객이 줄어든다. 본인은 플레이어로 이미 있으므로 제외.
    const others = withExtras(uniqueGuests(entries).filter((e) => e.m && e.n !== me).slice(0, MAX_GUESTS));
    const wanderReserved = new Set(reserved);
    const inZone = (tx, ty) => inGuestZone(tx, ty) && !wanderReserved.has(`${tx},${ty}`);
    const faceFront = () => 'down'; // 레퍼런스처럼 모두 정면(카메라)을 본다
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
    // Keep standing guests off the floral display; walking may cross it freely.
    const homeReserved = new Set(reserved);
    if (this.painted) for (let ty=6;ty<=17;ty++) for (const tx of [3,7]) homeReserved.add(`${tx},${ty}`);
    const placements = [
      ...retained.map((entry) => ({ entry, ...previous.get(guestKey(entry)).wander.home })),
      ...guestPlacements(others.filter((entry) => !previous.has(guestKey(entry))), homeReserved, this.painted),
    ];
    // 처음 정원을 열 때는 하객이 이미 자리에 흩어져 있다(레퍼런스의 로딩 직후 모습). 그 뒤 새로 생긴 하객만 입장 행렬로 걸어 들어온다.
    let order = 0;
    const firstLoad = previous.size === 0;
    const guests = placements.map(({ tx, ty, entry }) => {
      const key = guestKey(entry);
      if (previous.has(key)) { const n = previous.get(key); n.entry = entry; this.guestMap.set(key, n); return n; }
      const id = ((entry.c % PRESET_COUNT) + PRESET_COUNT) % PRESET_COUNT;
      // 분위기용 하객은 정장·원피스 차림의 군중 전용 그림(guest-extra)과 일반 프리셋을 반반 섞는다.
      // 군중 그림만 쓰면 검정·회색이 몰려 무거워 보이고, 프리셋만 쓰면 실제 하객과 구분되지 않는다. 군중 그림이 없으면 프리셋으로 돌아간다.
      const extraName = entry.extra !== undefined && entry.extra % 2 === 0 ? `guest-extra-${(entry.extra / 2) % EXTRA_GUEST_COUNT}` : null;
      const sprites = (extraName && this.assets?.characters?.[extraName]) || characterSet(this.assets, `preset-${id}`, presetSprites(id));
      // 그림 모드는 꽃 장식과 겹침을 줄이도록 기본 자리에서 ±5px로 흩뜨린다.
      const jitter = { x: Math.round(hash01(`${key}:x`) * (this.painted ? 5 : 7)), y: Math.round(hash01(`${key}:y`) * 3) };
      const home = standPos(tx, ty);
      const c = new Character({ sprites, name: entry.n, speed: GUEST_SPEED, x: home.x + jitter.x, y: home.y + jitter.y });
      c.dir = faceFront(tx);
      c.hideTag = entry.extra !== undefined; // 분위기용 하객은 이름 없이 군중으로 보인다
      const npc = {
        entry, character: c, solid: false, // 돌아다니므로 플레이어가 지나갈 수 있다
        wander: { home: { tx, ty }, radius: 1, roam: true, allow: inZone, faceDir: faceFront, jitter, timer: 1 + Math.random() * 6 },
        interact: () => { c.stop(); c.say(npc.entry.m ? short(npc.entry.m, 40) : pick(EXTRA_LINES), 4); },
      };
      if (!firstLoad) { npc.arrival = { delay: order * ARRIVAL.gap }; order++; c.hidden = true; c.alpha = 0; }
      this.guestMap.set(key, npc); return npc;
    });
    this.npcs = [...this.baseNpcs, ...guests];
    this.rebuildSolid();
  }

  /** 입장 행렬 진행: 대기 → 아래 교차로에서 등장 → 버진로드(5열)를 따라 올라와 자기 자리로. */
  updateArrivals(dt, reduced) {
    for (const n of this.npcs) {
      const a = n.arrival;
      if (!a) continue;
      const c = n.character;
      if (!a.started) {
        a.delay -= dt;
        if (a.delay > 0) continue;
        a.started = true;
        // 움직임 줄이기 설정이면 걷지 않고 제자리에 나타나기만 한다.
        if (reduced) { c.hidden = false; c.alpha = 1; n.arrival = null; continue; }
        const home = a.home ?? { x: c.x, y: c.y };
        const homeTile = n.wander.home;
        const start = standPos(ARRIVAL.from.tx, ARRIVAL.from.ty);
        c.x = start.x + Math.round(hash01(`${n.character.name}${homeTile.tx},${homeTile.ty}`) * 8); c.y = start.y;
        c.hidden = false; c.alpha = 0; c.speed = ARRIVAL.speed; c.dir = 'up';
        const blocked = (tx, ty) => this.isSolidTile(tx, ty) || this.entrances.some((e) => e.tx === tx && e.ty === ty);
        // 꽃은 통행 가능하므로 중앙 길에서 자기 자리 쪽으로 자연스럽게 흩어진다.
        const via = { tx: 5, ty: Math.max(AISLE_OPEN_FROM, homeTile.ty) };
        const leg1 = findPath(this.map.w, this.map.h, blocked, ARRIVAL.from, via) ?? [];
        const leg2 = findPath(this.map.w, this.map.h, blocked, via, homeTile) ?? [];
        const points = [...leg1, ...leg2].map((t) => standPos(t.tx, t.ty));
        points.push(home);
        // 걸음은 목표 0.5px 안에서 멈추므로 도착하면 원래 자리(흩뜨린 위치)에 정확히 맞춘다.
        c.followPath(points, () => { n.arrival = null; c.x = home.x; c.y = home.y; c.speed = GUEST_SPEED; c.dir = 'down'; c.alpha = 1; });
      }
      else if (c.alpha < 1) c.alpha = Math.min(1, c.alpha + dt / ARRIVAL.fade);
    }
  }

  /** 자동 말풍선: 화면 안의 하객이 돌아가며 축하를 말하고, 가끔 두 사람도 인사한다. */
  updateChatter(dt, game) {
    this.chatterT -= dt;
    if (this.chatterT > 0) return;
    this.chatterT = CHATTER.min + Math.random() * (CHATTER.max - CHATTER.min);
    const speaking = this.npcs.filter((n) => n.character.bubble).length;
    if (speaking >= CHATTER.maxBubbles) return;
    // 말풍선까지 상단 바 아래에 다 들어오는 사람만 말한다(잘린 말풍선이 두 사람 얼굴을 덮지 않게).
    const top = game?.cam ? game.cam.y + (game.cameraTop ?? 0) : -Infinity;
    const bottom = game?.cam ? game.cam.y + (game.cameraView?.height ?? 600) : Infinity;
    const visible = (c) => c.y - BUBBLE_ROOM > top && c.y < bottom;
    const hosts = this.hosts.filter((h) => !h.bubble && visible(h));
    if (hosts.length && Math.random() < CHATTER.hostChance) { pick(hosts).say(pick(this.game.config.greetings), CHATTER.seconds); return; }
    const pool = [...this.guestMap.values()].filter((n) => !n.arrival && !n.character.bubble && visible(n.character));
    if (!pool.length) return;
    const n = pick(pool);
    // 지금 떠 있는 말과 같은 문구는 피한다(두 사람이 동시에 같은 말을 하면 어색하다).
    const shown = new Set(this.npcs.map((o) => o.character.bubble).filter(Boolean));
    const lines = EXTRA_LINES.filter((l) => !shown.has(l));
    n.character.say(n.entry.m ? short(n.entry.m) : pick(lines.length ? lines : EXTRA_LINES), CHATTER.seconds);
  }

  /** 화면(카메라) 안에 있는지. game이 없으면 모두 보이는 것으로 본다. */
  inView(c, game) {
    if (!game?.cam) return true;
    const top = game.cam.y, bottom = game.cam.y + (game.cameraView?.height ?? 600);
    return c.y - 80 < bottom && c.y > top;
  }

  /** 분위기용 하객 한 명을 입구에서 다시 걸어 들어오게 한다. 화면 밖에 있는 사람을 먼저 고른다. */
  updateDropIns(dt, game) {
    this.dropInT -= dt;
    if (this.dropInT > 0) return;
    this.dropInT = DROP_IN.min + Math.random() * (DROP_IN.max - DROP_IN.min);
    const extras = [...this.guestMap.values()].filter((n) => n.entry.extra !== undefined && !n.arrival && !n.character.bubble);
    if (!extras.length) return;
    const hidden = extras.filter((n) => !this.inView(n.character, game));
    this.reenter(pick(hidden.length ? hidden : extras));
  }

  /** 하객을 숨기고 입장 행렬에 다시 넣는다. 도착지는 배회 중인 현재 위치가 아니라 원래 자리(흩뜨린 위치). */
  reenter(n) {
    const c = n.character, home = standPos(n.wander.home.tx, n.wander.home.ty), j = n.wander.jitter ?? { x: 0, y: 0 };
    c.stop(); n.wander.target = null;
    n.arrival = { delay: 0, home: { x: home.x + j.x, y: home.y + j.y } };
    c.hidden = true; c.alpha = 0;
  }

  update(dt, game) {
    this.updateArrivals(dt, !!game?.renderer?.reducedMotion);
    this.updateDropIns(dt, game);
    this.updateChatter(dt, game);
    this.petals.update(dt, game?.renderer?.view);
    super.update(dt, game);
  }

  /** 정원 위로 분홍 벚꽃잎이 흩날린다 */
  drawWeather(r) { this.petals.draw(r, petalSheet()); }
}

export function createHub(game) { return new HubScene(game); }
