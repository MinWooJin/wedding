import { PAL } from './palette.js';
import { parseSprite, scaleSprite } from './raster.js';

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
  // 웨딩 타일(PNG 전용). 코드 폴백은 비슷한 기존 타일을 재사용한다.
  A: fillTile('k', [[0, 0, 'y'], [0, 8, 'y'], [15, 4, 'y'], [15, 12, 'y']]),   // 아이보리 버진로드
  B: fillTile('k', [[3, 4, 'f'], [11, 10, 'f'], [7, 13, 'f'], [0, 0, 'y'], [15, 8, 'y']]), // 꽃잎 버진로드
  C: fillTile('k', [[2, 14, 'g'], [5, 15, 'g'], [9, 14, 'g'], [13, 15, 'g']]),           // 버진로드 입구
  E: fillTile('g', [...GRASS_DOTS, [3, 4, 'f'], [12, 9, 'f'], [8, 13, 'f']]),           // 장미 꽃잎 잔디
  M: fillTile('k', [[4, 4, 'K'], [11, 11, 'K'], [7, 13, 'K']]),                        // 아이보리 대리석
  L: fillTile('f', [[0, 0, 'y'], [15, 15, 'y']]),                                      // 블러시 카펫
  Q: fillTile('t', [[2, 2, 'f'], [6, 4, 'f'], [11, 3, 'n'], [4, 9, 'f'], [9, 10, 'n'], [13, 12, 'f'], [1, 13, 'f']]), // 분홍 꽃밭
  Y: fillTile('t', [[2, 2, 'n'], [6, 4, 'y'], [11, 3, 'n'], [4, 9, 'n'], [9, 10, 'y'], [13, 12, 'n'], [1, 13, 'y']]), // 흰 꽃밭
  V: fillTile('k', [[3, 2, 'K'], [8, 6, 'K'], [13, 4, 'K'], [5, 11, 'K'], [10, 13, 'K'], [1, 8, 'K']]),               // 흰 자갈길
  Z: fillTile('t', [[2, 3, 'f'], [9, 1, 'f'], [13, 6, 'f'], [5, 10, 'f'], [11, 12, 'f'], [1, 14, 'T'], [7, 7, 'T']]), // 장미 산울타리(solid)
  N: fillTile('k', [[2, 3, 'd'], [9, 1, 'd'], [13, 7, 'd'], [5, 10, 'd'], [11, 13, 'd'], [1, 14, 'd'], [7, 6, 'd']]),  // 모래빛 돌길
  J: fillTile('g', [...GRASS_DOTS, [3, 4, 'n'], [12, 9, 'y']]),                                                    // 잔디 + 흰·노랑 꽃
  U: fillTile('g', [...GRASS_DOTS, [10, 3, 'f'], [4, 12, 'n']]),                                                   // 잔디 + 분홍·흰 꽃
};

export const SOLID_TILES = new Set(['H', 'F', 'K', 'X', 'Z']);

/** 코드 타일은 16px로 그려져 있어 32px 격자에 맞게 2배 확대해 돌려준다(폴백용). */
const cache = new Map();
export function tileSprite(id) {
  if (!cache.has(id)) cache.set(id, scaleSprite(parseSprite(TILES[id], PAL), 2));
  return cache.get(id);
}
