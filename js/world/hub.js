import { Scene } from './scene.js';

export const HUB_ROWS = [
  'HHHHHHHHHHH',
  'HGGGGPGGGGH',
  'HGWGGPGGWGH',
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
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 8 };

export function createHub(game) {
  return new Scene({ id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN });
}
