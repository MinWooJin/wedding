import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { toast } from '../ui/toast.js';
import { characterSet } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { displayName } from '../config.js';

// 11열 × 32행(352×1024px). 위쪽 19행은 아치까지 이어지는 긴 정원, 아래는 방 입구가 있는 교차로.
// 타일: Z 장미 산울타리(막힘), M 대리석(무대), Q 분홍 꽃밭, E 장미꽃잎 잔디, A/B 버진로드, C 입구 마감, V 흰 자갈길
const STAGE = 'ZMMMM?MMMMZ';   // 1~4행: 아치 주변 대리석 무대
const GARDEN = ['ZQEEE?EEEQZ']; // 5~19행: 양옆 꽃밭(1·9열), 2~4·6~8열 잔디(하객·의자)
/** 가운데(5열)는 버진로드 A, 4행마다 꽃잎 B, 19행은 입구 마감 C */
const aisleRow = (i) => {
  const base = i <= 3 ? STAGE : GARDEN[(i - 4) % GARDEN.length];
  const mid = i === 18 ? 'C' : (i % 4 === 1 ? 'B' : 'A');
  return base.replace('?', mid);
};
export const HUB_ROWS = [
  'ZZZZZZZZZZZ',
  ...Array.from({ length: 19 }, (_, i) => aisleRow(i)), // rows 1..19
  'ZVVVVVVVVVZ', // 20 교차로(흰 자갈길)
  'ZVQEQVQEQVZ', // 21 문: 안내소(1,21), 갤러리(9,21)
  'ZVEEEVEEEVZ',
  'ZVQEQVQEQVZ',
  'ZVVVVVVVVVZ', // 24
  'ZVQEQVQEQVZ', // 25 문: 이야기 길(1,25), 방명록(9,25)
  'ZVEEEVEEEVZ',
  'ZVQEQVQEQVZ',
  'ZVVVVVVVVVZ', // 28
  'ZVQEQVQEQVZ',
  'ZVEEEVEEEVZ', // 30 문: 마음 전하기(5,30)
  'ZZZZZZZZZZZ',
];

export const HUB_SPAWN = { tx: 5, ty: 9 }; // 버진로드 중간에서 시작: 위로 신랑신부, 아래로 하객들이 보인다

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  // sign은 64×64(2×2칸)라 문 옆 두 칸을 차지한다
  info:      { door: { tx: 1, ty: 21 }, sign: { tx: 2, ty: 21 }, back: { tx: 1, ty: 20 }, label: '예식 안내소' },
  gallery:   { door: { tx: 9, ty: 21 }, sign: { tx: 7, ty: 21 }, back: { tx: 9, ty: 20 }, label: '갤러리관' },
  story:     { door: { tx: 1, ty: 25 }, sign: { tx: 2, ty: 25 }, back: { tx: 1, ty: 24 }, label: '우리 이야기 길' },
  guestbook: { door: { tx: 9, ty: 25 }, sign: { tx: 7, ty: 25 }, back: { tx: 9, ty: 24 }, label: '방명록 정원' },
  gifts:     { door: { tx: 5, ty: 30 }, sign: { tx: 3, ty: 29 }, back: { tx: 5, ty: 29 }, label: '마음 전하는 곳' },
};

/** 하객용 흰 의자(32×48): 버진로드 바로 옆 4·6열, 3행 간격 */
const CHAIR_ROWS = [5, 8, 11, 14, 17];
/** 장식: 무대 모서리 덤불·랜턴, 잔디 위 꽃잎, 입구 환영판, 교차로 블록의 덤불·랜턴 */
const DECOR = [
  { sprite: 'bush', tx: 1, ty: 1 }, { sprite: 'bush', tx: 8, ty: 1 },
  { sprite: 'lantern', tx: 2, ty: 3 }, { sprite: 'lantern', tx: 8, ty: 3 },
  { sprite: 'petal-pile', tx: 3, ty: 7, floor: true }, { sprite: 'petal-pile', tx: 7, ty: 10, floor: true },
  { sprite: 'petal-pile', tx: 2, ty: 13, floor: true }, { sprite: 'petal-pile', tx: 8, ty: 16, floor: true },
  { sprite: 'welcome-board', tx: 7, ty: 18 },
  { sprite: 'bush', tx: 3, ty: 22 }, { sprite: 'bush', tx: 6, ty: 22 },
  { sprite: 'bush', tx: 3, ty: 26 }, { sprite: 'bush', tx: 6, ty: 26 },
  { sprite: 'lantern', tx: 2, ty: 29 }, { sprite: 'lantern', tx: 8, ty: 29 },
];

/** 하객이 서는 구역: 의자 줄 바깥쪽 2~3열·7~8열, 아치 아래 5행부터 입구 직전 19행까지 */
export const GUEST_ZONE = { cols: [2, 3, 7, 8], rowMin: 6, rowMax: 19 }; // 6행부터: 5행에 서면 무대(1~4행) 위로 겹쳐 보인다

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
    if (chosen.some((c) => Math.abs(c.tx - t.tx) <= 1 && Math.abs(c.ty - t.ty) <= 1)) continue;
    chosen.push(t);
  }
  return chosen.map((t, i) => ({ tx: t.tx, ty: t.ty, entry: list[i] }));
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    // 아치(160×128, 0~3행) 바로 앞 4행에 나란히(4·6열, 48px 캐릭터가 어깨를 맞댄 간격). 예식이 진행 중인 장면.
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: displayName(cfg.groom), ...standPos(4, 4) });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: displayName(cfg.bride), ...standPos(6, 4) });
    groom.dir = 'down'; bride.dir = 'down';
    const greet = (c) => () => c.say(pick(cfg.greetings));

    const objects = [
      { id: 'arch', sprite: 'arch', tx: 3, ty: 0, solid: false },
      ...CHAIR_ROWS.flatMap((ty) => [{ id: `chairL${ty}`, sprite: 'chair', tx: 4, ty }, { id: `chairR${ty}`, sprite: 'chair', tx: 6, ty }]),
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
    const faceAisle = (tx) => (tx < 5 ? 'right' : 'left');
    const guests = guestPlacements(others, reserved).map(({ tx, ty, entry }) => {
      const id = ((entry.c % PRESET_COUNT) + PRESET_COUNT) % PRESET_COUNT;
      const c = new Character({ sprites: characterSet(this.assets, `preset-${id}`, presetSprites(id)), name: entry.n, ...standPos(tx, ty) });
      c.dir = faceAisle(tx); // 버진로드 쪽을 바라본다
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
