import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { toast } from '../ui/toast.js';
import { characterSet } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { displayName } from '../config.js';

// 11열 × 32행(352×1024px). 위쪽 19행은 아치까지 이어지는 긴 정원, 아래는 방 입구가 있는 교차로.
// 타일: H 산울타리, G 잔디, W 꽃잔디, E 장미꽃잎 잔디, M 아이보리 대리석(무대·산책로), A/B 버진로드, C 입구 마감
const STAGE = 'HMMMM?MMMMH';                                   // 1~4행: 아치 주변 대리석 무대
const GARDEN = ['HMEEE?EEEMH']; // 5~19행: 양옆 대리석 산책로(1·9열) + 꽃잎 잔디(W 꽃잔디는 톤이 달라 얼룩처럼 보여 제외)
/** 가운데(5열)는 버진로드 A, 4행마다 꽃잎 B, 19행은 입구 마감 C */
const aisleRow = (i) => {
  const base = i <= 3 ? STAGE : GARDEN[(i - 4) % GARDEN.length];
  const mid = i === 18 ? 'C' : (i % 4 === 1 ? 'B' : 'A');
  return base.replace('?', mid);
};
export const HUB_ROWS = [
  'HHHHHHHHHHH',
  ...Array.from({ length: 19 }, (_, i) => aisleRow(i)), // rows 1..19
  'HMMMMMMMMMH', // 20 교차로(대리석) · 시작 위치
  'HMEEEMEEEMH', // 21 문: 안내소(1,21), 갤러리(9,21)
  'HMEEEMEEEMH',
  'HMEEEMEEEMH',
  'HMMMMMMMMMH', // 24
  'HMEEEMEEEMH', // 25 문: 이야기 길(1,25), 방명록(9,25)
  'HMEEEMEEEMH',
  'HMEEEMEEEMH',
  'HMMMMMMMMMH', // 28
  'HMEEEMEEEMH',
  'HMEEEMEEEMH', // 30 문: 마음 전하기(5,30)
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 20 };

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  // sign은 64×64(2×2칸)라 문 옆 두 칸을 차지한다
  info:      { door: { tx: 1, ty: 21 }, sign: { tx: 2, ty: 21 }, back: { tx: 1, ty: 20 }, label: '예식 안내소' },
  gallery:   { door: { tx: 9, ty: 21 }, sign: { tx: 7, ty: 21 }, back: { tx: 9, ty: 20 }, label: '갤러리관' },
  story:     { door: { tx: 1, ty: 25 }, sign: { tx: 2, ty: 25 }, back: { tx: 1, ty: 24 }, label: '우리 이야기 길' },
  guestbook: { door: { tx: 9, ty: 25 }, sign: { tx: 7, ty: 25 }, back: { tx: 9, ty: 24 }, label: '방명록 정원' },
  gifts:     { door: { tx: 5, ty: 30 }, sign: { tx: 3, ty: 29 }, back: { tx: 5, ty: 29 }, label: '마음 전하는 곳' },
};

// 나무는 96×96(3칸 폭). 왼쪽은 2~4열, 오른쪽은 6~8열에 두고 5열 버진로드와 1·9열 산책로는 비운다
const TREES = [[2, 5], [6, 7], [2, 10], [6, 12], [2, 15], [6, 17]];

export const MAX_GUESTS = 30;

/**
 * 방명록 항목 → 광장 잔디 위 하객 자리. reserved: "tx,ty" 제외 집합. 같은 입력이면 같은 배치.
 * 캐릭터가 2칸 폭이라 서로 인접(8방향)하지 않게 간격을 둔다. 자리가 모자라면 남는 항목은 생략.
 */
export function guestPlacements(entries, reserved) {
  const list = entries.slice(0, MAX_GUESTS);
  const shuffled = pickTiles(freeTiles(HUB_ROWS, reserved), Infinity, 2026);
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
    // 아치(160×128, 0~3행)보다 아래인 4행에, 길(5열) 양옆 3·7열에 세운다
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: displayName(cfg.groom), ...standPos(3, 4) });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: displayName(cfg.bride), ...standPos(7, 4) });
    const greet = (c) => () => c.say(pick(cfg.greetings));

    const objects = [
      { id: 'arch', sprite: 'arch', tx: 3, ty: 0, solid: false },
      ...TREES.map(([tx, ty], i) => ({ id: `tree${i}`, sprite: 'tree', tx, ty })),
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
    this.hosts = [groom, bride];
    this.baseNpcs = this.npcs.slice();
    this.setGuests(game.data?.messages ?? []);
  }

  /** 방명록 목록 → 광장 하객 NPC 재배치. 탭하면 그 사람 메시지를 말풍선으로. */
  setGuests(entries) {
    this.npcs = this.baseNpcs;
    this.rebuildSolid(); // 오브젝트 발자국 + 신랑신부 자리
    const reserved = new Set(this.extraSolid);
    for (const o of this.objects) { // 오브젝트가 덮는 타일 + 주변 1칸(64px 폭 캐릭터가 겹치지 않게)
      const w = Math.ceil(o.spr.w / 32), h = Math.ceil(o.spr.h / 32);
      for (let dy = -1; dy <= h; dy++) for (let dx = -1; dx <= w; dx++) reserved.add(`${o.tx + dx},${o.ty + dy}`);
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
    const guests = guestPlacements(entries, reserved).map(({ tx, ty, entry }) => {
      const id = ((entry.c % PRESET_COUNT) + PRESET_COUNT) % PRESET_COUNT;
      const c = new Character({ sprites: characterSet(this.assets, `preset-${id}`, presetSprites(id)), name: entry.n, ...standPos(tx, ty) });
      c.dir = ['down', 'left', 'right'][(tx + ty) % 3];
      return { character: c, interact: () => c.say(entry.m, 4) };
    });
    this.npcs = [...this.baseNpcs, ...guests];
    this.rebuildSolid();
  }
}

export function createHub(game) { return new HubScene(game); }
