import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { toast } from '../ui/toast.js';
import { characterSet } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';

// 11열 × 32행(352×1024px). 위쪽 19행은 아치까지 이어지는 긴 정원, 아래는 방 입구가 있는 교차로.
const GARDEN = ['HGGGGPGGGGH', 'HGWGGPGGWGH', 'HGGGGPGGGGH', 'HWGGGPGGGWH', 'HGGGGPGGGGH', 'HGGWGPGWGGH'];
export const HUB_ROWS = [
  'HHHHHHHHHHH',
  ...Array.from({ length: 19 }, (_, i) => GARDEN[i % GARDEN.length]), // rows 1..19
  'HPPPPPPPPPH', // 20 교차로 · 시작 위치
  'HPGGGPGGGPH', // 21 문: 안내소(1,21), 갤러리(9,21)
  'HPGWGPGWGPH',
  'HPGGGPGGGPH',
  'HPPPPPPPPPH', // 24
  'HPGGGPGGGPH', // 25 문: 이야기 길(1,25), 방명록(9,25)
  'HPWGGPGGWPH',
  'HPGGGPGGGPH',
  'HPPPPPPPPPH', // 28
  'HPGGGPGGGPH',
  'HPWGGPGGWPH', // 30 문: 마음 전하기(5,30)
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 20 };

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  info:      { door: { tx: 1, ty: 21 }, sign: { tx: 2, ty: 21 }, back: { tx: 1, ty: 20 }, label: '예식 안내소' },
  gallery:   { door: { tx: 9, ty: 21 }, sign: { tx: 8, ty: 21 }, back: { tx: 9, ty: 20 }, label: '갤러리관' },
  story:     { door: { tx: 1, ty: 25 }, sign: { tx: 2, ty: 25 }, back: { tx: 1, ty: 24 }, label: '우리 이야기 길' },
  guestbook: { door: { tx: 9, ty: 25 }, sign: { tx: 8, ty: 25 }, back: { tx: 9, ty: 24 }, label: '방명록 정원' },
  gifts:     { door: { tx: 5, ty: 30 }, sign: { tx: 4, ty: 30 }, back: { tx: 5, ty: 29 }, label: '마음 전하는 곳' },
};

const TREES = [[1, 1], [9, 1], [1, 5], [9, 5], [3, 7], [7, 7], [1, 9], [9, 9], [3, 12], [7, 12], [1, 15], [9, 15], [2, 18], [8, 18]];

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
    // 64px 폭 캐릭터가 겹치지 않도록 길(5열) 양옆 3·7열에 세운다
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: cfg.groom.name, ...standPos(3, 3) });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: cfg.bride.name, ...standPos(7, 3) });
    const greet = (c) => () => c.say(pick(cfg.greetings));

    const objects = [
      { id: 'arch', sprite: 'arch', tx: 4, ty: 1, solid: false },
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
    for (const o of this.objects) { // 나무 꼭대기 등 오브젝트가 덮는 모든 타일
      const w = Math.ceil(o.spr.w / 32), h = Math.ceil(o.spr.h / 32);
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) reserved.add(`${o.tx + dx},${o.ty + dy}`);
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
