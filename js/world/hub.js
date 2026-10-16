import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE, presetSprites, PRESET_COUNT } from '../sprites/characters.js';
import { toast } from '../ui/toast.js';
import { characterSet } from '../assets.js';
import { freeTiles, pickTiles } from './guest-layout.js';

export const HUB_ROWS = [
  'HHHHHHHHHHH',
  'HGGGGPGGGGH',
  'HGWGGPGGWGH',
  'HGGGGPGGGGH',
  'HWGGGPGGGWH',
  'HGGGGPGGGGH',
  'HGGWGPGWGGH',
  'HGGGGPGGGGH',
  'HWGGGPGGGWH',
  'HGGGGPGGGGH',
  'HGGWGPGWGGH',
  'HGGGGPGGGGH',
  'HPPPPPPPPPH',
  'HPGGGPGGGPH',
  'HPGWGPGWGPH',
  'HPGGGPGGGPH',
  'HPPPPPPPPPH',
  'HPGGGPGGGPH',
  'HPWGGPGGWPH',
  'HPGGGPGGGPH',
  'HPPPPPPPPPH',
  'HPGGGPGGGPH',
  'HPWGGPGGWPH',
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 12 };

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  info:      { door: { tx: 1, ty: 13 }, sign: { tx: 2, ty: 13 }, back: { tx: 1, ty: 12 }, label: '예식 안내소' },
  gallery:   { door: { tx: 9, ty: 13 }, sign: { tx: 8, ty: 13 }, back: { tx: 9, ty: 12 }, label: '갤러리관' },
  story:     { door: { tx: 1, ty: 17 }, sign: { tx: 2, ty: 17 }, back: { tx: 1, ty: 16 }, label: '우리 이야기 길' },
  guestbook: { door: { tx: 9, ty: 17 }, sign: { tx: 8, ty: 17 }, back: { tx: 9, ty: 16 }, label: '방명록 정원' },
  gifts:     { door: { tx: 5, ty: 22 }, sign: { tx: 4, ty: 22 }, back: { tx: 5, ty: 21 }, label: '마음 전하는 곳' },
};

const TREES = [[1, 1], [9, 1], [1, 5], [9, 5], [3, 7], [7, 7], [1, 9], [9, 9]];

export const MAX_GUESTS = 30;

/** 방명록 항목 → 광장 잔디 위 하객 자리. reserved: "tx,ty" 제외 집합. 같은 입력이면 같은 배치. */
export function guestPlacements(entries, reserved) {
  const list = entries.slice(0, MAX_GUESTS);
  const tiles = pickTiles(freeTiles(HUB_ROWS, reserved), list.length, 2026);
  return tiles.map((t, i) => ({ tx: t.tx, ty: t.ty, entry: list[i] }));
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: cfg.groom.name, ...standPos(4, 3) });
    const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: cfg.bride.name, ...standPos(6, 3) });
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
