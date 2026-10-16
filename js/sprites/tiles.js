import { PAL } from './palette.js';
import { parseSprite } from './raster.js';

/** 16×16을 한 문자로 채운 뒤 (x,y,ch) 점을 찍어 타일 행을 만든다. */
function fillTile(base, dots = []) {
  const rows = Array.from({ length: 16 }, () => Array(16).fill(base));
  for (const [x, y, ch] of dots) rows[y][x] = ch;
  return rows.map((r) => r.join(''));
}

/** 가로 판자 무늬(마루/돌바닥 공용): 4행마다 어두운 줄, 줄마다 다른 위치에 세로 틈. */
function plankTile(light, dark, seams) {
  return Array.from({ length: 16 }, (_, y) => {
    if (y % 4 === 3) return dark.repeat(16);
    const seam = seams[Math.floor(y / 4)];
    return light.repeat(seam) + dark + light.repeat(15 - seam);
  });
}

const GRASS_DOTS = [[2, 3, 'G'], [9, 1, 'l'], [13, 6, 'G'], [5, 10, 'l'], [11, 12, 'G'], [1, 14, 'l'], [7, 7, 'G']];
const FLOWER_DOTS = [
  [3, 4, 'f'], [4, 4, 'f'], [3, 5, 'f'], [4, 5, 'f'], [4, 6, 't'],
  [11, 9, 'y'], [12, 9, 'y'], [11, 10, 'y'], [12, 10, 'y'], [12, 11, 't'],
];

export const TILES = {
  // 야외
  G: fillTile('g', GRASS_DOTS),                       // 잔디
  W: fillTile('g', [...GRASS_DOTS, ...FLOWER_DOTS]),  // 꽃잔디
  P: fillTile('d', [[1, 2, 'D'], [6, 5, 'D'], [12, 3, 'D'], [3, 9, 'D'], [9, 11, 'D'], [14, 13, 'D'], [7, 14, 'D']]), // 흙길
  H: [ // 산울타리(solid)
    'tttTtttttTtttttt', 'tTtttTtttttTtttt', 'ttttttttTttttttT', 'TtttTtttttTttttt',
    'tttttttTtttttttT', 'ttTtttttttTttttt', 'tttttTttttttTttt', 'TttttttTtttttttt',
    'tttTtttttTtttttt', 'tTtttTtttttTtttt', 'ttttttttTttttttT', 'TtttTtttttTttttt',
    'tttttttTtttttttT', 'ttTtttttttTttttt', 'oooooooooooooooo', 'WWWWWWWWWWWWWWWW',
  ],
  F: [ // 울타리(solid)
    'gggggggggggggggg', 'googgggggggggoog', 'gowoggggggggowog', 'gowoggggggggowog',
    'oooooooooooooooo', 'owwwwwwwwwwwwwwo', 'oooooooooooooooo', 'gowoggggggggowog',
    'gowoggggggggowog', 'oooooooooooooooo', 'owwwwwwwwwwwwwwo', 'oooooooooooooooo',
    'gowoggggggggowog', 'googgggggggggoog', 'gggggggggggggggg', 'gggggggggggggggg',
  ],
  // 실내
  D: plankTile('w', 'W', [7, 3, 11, 5]),  // 마루
  K: [ // 벽(solid): 위는 벽지, 아래는 걸레받이
    'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'KKKKKKKKKKKKKKKK',
    'oooooooooooooooo', 'WWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWW', 'oooooooooooooooo',
  ],
  R: fillTile('c', [[0, 0, 'C'], [15, 0, 'C'], [0, 15, 'C'], [15, 15, 'C'], [7, 7, 'y'], [8, 7, 'y'], [7, 8, 'y'], [8, 8, 'y']]), // 카펫
  S: plankTile('s', 'S', [8, 4, 12, 2]),  // 돌바닥
  X: fillTile('o'),                       // 공백(solid, 맵 밖)
};

export const SOLID_TILES = new Set(['H', 'F', 'K', 'X']);

const cache = new Map();
export function tileSprite(id) {
  if (!cache.has(id)) cache.set(id, parseSprite(TILES[id], PAL));
  return cache.get(id);
}
