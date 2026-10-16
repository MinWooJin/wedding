import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { toast } from '../ui/toast.js';
import { characterSet } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { displayName } from '../config.js';

// 11열 × 32행(352×1024px). 레퍼런스(@dding_one)처럼: 울타리 안 잔디 정원, 가운데 3칸 폭 모래 돌길, 가장자리 나무·덤불, 하객은 길 위까지 가득.
// 타일: H 산울타리(막힘), G 잔디, J/U 꽃 섞인 잔디, N 모래 돌길(4~6열)
const FLOWER_SEED = 7;
const grassAt = (tx, ty) => { const v = (tx * 73856093 ^ ty * 19349663 ^ FLOWER_SEED) >>> 0; return v % 7 === 0 ? 'J' : v % 11 === 0 ? 'U' : 'G'; };
const gardenRow = (ty) => 'H' + Array.from({ length: 9 }, (_, i) => { const tx = i + 1; return tx >= 4 && tx <= 6 ? 'N' : grassAt(tx, ty); }).join('') + 'H';
const crossRow = 'HNNNNNNNNNH';
const blockRow = (ty) => 'H' + Array.from({ length: 9 }, (_, i) => { const tx = i + 1; return tx === 1 || tx === 9 || (tx >= 4 && tx <= 6) ? 'N' : grassAt(tx, ty); }).join('') + 'H';
export const HUB_ROWS = [
  'HHHHHHHHHHH',
  ...Array.from({ length: 19 }, (_, i) => gardenRow(i + 1)), // rows 1..19 정원(아치·신랑신부·하객)
  crossRow,                                                  // 20 교차로
  blockRow(21), blockRow(22), blockRow(23),                  // 21 문: 안내소(1,21), 갤러리(9,21)
  crossRow,                                                  // 24
  blockRow(25), blockRow(26), blockRow(27),                  // 25 문: 이야기 길(1,25), 방명록(9,25)
  crossRow,                                                  // 28
  blockRow(29), blockRow(30),                                // 30 문: 마음 전하기(5,30)
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 12 }; // 돌길 중간에서 시작: 위로 신랑신부, 주변에 하객들

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  // sign은 64×64(2×2칸)라 문 옆 두 칸을 차지한다
  info:      { door: { tx: 1, ty: 21 }, sign: { tx: 2, ty: 21 }, back: { tx: 1, ty: 20 }, label: '예식 안내소' },
  gallery:   { door: { tx: 9, ty: 21 }, sign: { tx: 7, ty: 21 }, back: { tx: 9, ty: 20 }, label: '갤러리관' },
  story:     { door: { tx: 1, ty: 25 }, sign: { tx: 2, ty: 25 }, back: { tx: 1, ty: 24 }, label: '우리 이야기 길' },
  guestbook: { door: { tx: 9, ty: 25 }, sign: { tx: 7, ty: 25 }, back: { tx: 9, ty: 24 }, label: '방명록 정원' },
  gifts:     { door: { tx: 5, ty: 30 }, sign: { tx: 3, ty: 29 }, back: { tx: 5, ty: 29 }, label: '마음 전하는 곳' },
};

/** 가장자리 장식: 울타리 안쪽을 따라 큰 나무(96×96)와 꽃덤불(64×64)을 번갈아 둔다. 레퍼런스처럼 나무가 양옆 경계를 만든다. */
const DECOR = [ // 0~4행은 큰 아치(최대 7칸 폭) 자리라 비워 둔다
  { sprite: 'tree', tx: 1, ty: 5 }, { sprite: 'tree', tx: 7, ty: 5 },
  { sprite: 'bush', tx: 1, ty: 9 }, { sprite: 'bush', tx: 8, ty: 9 },
  { sprite: 'tree', tx: 1, ty: 12 }, { sprite: 'tree', tx: 7, ty: 12 },
  { sprite: 'bush', tx: 1, ty: 16 }, { sprite: 'bush', tx: 8, ty: 16 },
  { sprite: 'bush', tx: 3, ty: 22 }, { sprite: 'bush', tx: 6, ty: 22 },
  { sprite: 'bush', tx: 3, ty: 26 }, { sprite: 'bush', tx: 6, ty: 26 },
];

/** 하객이 서는 구역: 아치 아래 5행부터 입구 직전 19행까지, 돌길 위를 포함한 정원 전체(1~9열) */
export const GUEST_ZONE = { cols: [1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 5, rowMax: 19 };

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
    if (chosen.some((c) => c.tx === t.tx && Math.abs(c.ty - t.ty) <= 1)) continue; // 같은 열 바로 위아래만 비운다(옆은 붙어 서도 됨)
    chosen.push(t);
  }
  return chosen.map((t, i) => ({ tx: t.tx, ty: t.ty, entry: list[i] }));
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    // 아치(160×128, 0~3행) 아래 돌길 한가운데(x=176)에 어깨를 맞대고 나란히. 예식이 진행 중인 장면.
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: displayName(cfg.groom), x: 176 - 24, y: standPos(5, 4).y });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: displayName(cfg.bride), x: 176 + 24, y: standPos(5, 4).y });
    groom.dir = 'down'; bride.dir = 'down';
    const greet = (c) => () => c.say(pick(cfg.greetings));

    // 아치는 PNG 폭(160=5칸, 224=7칸 …)에 맞춰 돌길 중앙(5열)에 가운데 정렬한다
    const archTiles = Math.round((game.assets?.objects?.arch?.w ?? 160) / 32);
    const objects = [
      { id: 'arch', sprite: 'arch', tx: 5 - Math.floor(archTiles / 2), ty: 0, solid: false },
      ...DECOR.map((d, i) => ({ id: `decor${i}`, ...d })),
    ];
    const entrances = [];
    for (const [id, d] of Object.entries(HUB_DOORS)) {
      objects.push({ id: `door-${id}`, sprite: 'door', floor: true, ...d.door });
      objects.push({ id: `sign-${id}`, sprite: 'sign', ...d.sign, interact: () => toast(`${d.label} →`) });
      entrances.push({ ...d.door, to: id, spawn: null }); // spawn null → 해당 씬의 기본 spawn
    }

    super({
      id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN, objects, entrances, assets: game.assets,
      npcs: [{ character: groom, interact: greet(groom) }, { character: bride, interact: greet(bride) }],
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
    reserved.add(`${HUB_SPAWN.tx},${HUB_SPAWN.ty}`);
    for (const d of Object.values(HUB_DOORS)) {
      reserved.add(`${d.door.tx},${d.door.ty}`);
      reserved.add(`${d.back.tx},${d.back.ty}`);
    }
    const me = this.game?.profile?.nickname;
    const others = entries.filter((e) => e.n !== me); // 본인은 플레이어로 이미 있으므로 제외
    const inZone = (tx, ty) => GUEST_ZONE.cols.includes(tx) && ty >= GUEST_ZONE.rowMin && ty <= GUEST_ZONE.rowMax && !reserved.has(`${tx},${ty}`);
    const faceAisle = () => 'down'; // 레퍼런스처럼 모두 정면(카메라)을 본다
    const guests = guestPlacements(others, reserved).map(({ tx, ty, entry }) => {
      const id = ((entry.c % PRESET_COUNT) + PRESET_COUNT) % PRESET_COUNT;
      const c = new Character({ sprites: characterSet(this.assets, `preset-${id}`, presetSprites(id)), name: entry.n, ...standPos(tx, ty) });
      c.dir = faceAisle(tx);
      return {
        character: c, solid: false, // 돌아다니므로 플레이어가 지나갈 수 있다
        wander: { home: { tx, ty }, radius: 2, allow: inZone, faceDir: faceAisle, timer: 1 + Math.random() * 6 },
        interact: () => { c.stop(); c.say(entry.m || '결혼 축하해요! 🎉', 4); },
      };
    });
    this.npcs = [...this.baseNpcs, ...guests];
    this.rebuildSolid();
  }
}

export function createHub(game) { return new HubScene(game); }
