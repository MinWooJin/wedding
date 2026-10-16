import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE } from '../sprites/characters.js';
import { toast } from '../ui/toast.js';

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

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    const groom = new Character({ sprites: GROOM, name: cfg.groom.name, ...standPos(4, 3) });
    const bride = new Character({ sprites: BRIDE, name: cfg.bride.name, ...standPos(6, 3) });
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
      id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN, objects, entrances,
      npcs: [{ character: groom, interact: greet(groom) }, { character: bride, interact: greet(bride) }],
    });
    this.hosts = [groom, bride];
  }
}

export function createHub(game) { return new HubScene(game); }
