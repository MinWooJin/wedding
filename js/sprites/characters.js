import { parseSprite, flipX, stackY, scaleSprite } from './raster.js';

// 팔레트 문자: o 외곽선, H 머리, S 피부, C 옷, P 바지, E 눈동자, n 흰자, f 볼터치, . 투명
// 머리+몸통 20행 + 다리 4행 = 24행, 폭 16.
const HEAD_BODY_DOWN = [
  '....oooooooo....',
  '..ooHHHHHHHHoo..',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  'oHHHHHHHHHHHHHHo',
  'oHHHSSSSSSSSHHHo',
  'oHHSSSSSSSSSSHHo',
  'oHSSSSSSSSSSSSHo',
  'oHSSnESSSSEnSSHo',
  'oHSSnESSSSEnSSHo',
  '.oSSSSSSSSSSSSo.',
  '.oSfSSSSSSSSfSo.',
  '..oSSSSooSSSSo..',
  '...ooSSSSSSoo...',
  '....oCCCCCCo....',
  '..ooCCCCCCCCoo..',
  '.oSCCCCCCCCCCSo.',
  '.oSCCCCCCCCCCSo.',
  '.oSoCCCCCCCCoSo.',
  '..ooCCCCCCCCoo..',
];
const HEAD_BODY_UP = [
  '....oooooooo....',
  '..ooHHHHHHHHoo..',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  '..oHHHHHHHHHHo..',
  '...ooSSSSSSoo...',
  '....oCCCCCCo....',
  '..ooCCCCCCCCoo..',
  '.oSCCCCCCCCCCSo.',
  '.oSCCCCCCCCCCSo.',
  '.oSoCCCCCCCCoSo.',
  '..ooCCCCCCCCoo..',
];
const HEAD_BODY_LEFT = [
  '....oooooooo....',
  '..ooHHHHHHHHoo..',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  'oHHHHHHHHHHHHHHo',
  'oHSSSSSSHHHHHHHo',
  'oSSSSSSSHHHHHHHo',
  'oSSSSSSSSHHHHHHo',
  'oSSnESSSSHHHHHHo',
  'oSSnESSSSHHHHHHo',
  '.oSSSSSSSSHHHHo.',
  '.oSfSSSSSSSHHHo.',
  '..oSSSSSSSHHHo..',
  '...ooSSSSSSoo...',
  '....oCCCCCCo....',
  '...ooCCCCCCoo...',
  '..oSCCCCCCCCCo..',
  '..oSCCCCCCCCCo..',
  '..ooCCCCCCCCCo..',
  '...oCCCCCCCCo...',
];
const LEGS_A = [
  '...oPPPooPPPo...',
  '...oPPPooPPPo...',
  '...oPPPooPPPo...',
  '...oooo..oooo...',
];
const LEGS_B = [
  '..oPPPo..oPPPo..',
  '..oPPPo..oPPPo..',
  '..oPPPo..oPPPo..',
  '..oooo....oooo..',
];

function palette({ hair, skin, cloth, pants }) {
  return { '.': null, o: '#2b1d14', H: hair, S: skin, C: cloth, P: pants, E: '#2b1d14', n: '#ffffff', f: '#f4a6b8' };
}

/**
 * 캐릭터 스프라이트 세트: 방향별 프레임 배열. 프레임 0 = idle, 1.. = 걷기 사이클.
 * 코드 그림은 16×24로 그려져 있어 2배 확대(32×48)해 돌려준다(폴백용).
 * @returns {{down:Sprite[],up:Sprite[],left:Sprite[],right:Sprite[]}}
 */
export function makeCharacter(colors) {
  const pal = palette(colors);
  const frames = (body) => {
    const a = scaleSprite(stackY(parseSprite(body, pal), parseSprite(LEGS_A, pal)), 2);
    const b = scaleSprite(stackY(parseSprite(body, pal), parseSprite(LEGS_B, pal)), 2);
    return [a, a, b];
  };
  const left = frames(HEAD_BODY_LEFT);
  return { down: frames(HEAD_BODY_DOWN), up: frames(HEAD_BODY_UP), left, right: left.map(flipX) };
}

const HAIR = ['#2b2b2b', '#5a3a1e', '#c98b3a', '#8e4a5b', '#3b5b8c'];
const SKIN = ['#f6d3b3', '#c58c5a'];
const CLOTH = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e84393', '#34495e', '#f8f8f8'];
const PANTS = ['#2c3e50', '#4a3b2a', '#5d6d7e'];

const EXTRA_PRESETS = [
  {
    "hair": "#242e3e",
    "skin": "#f6d3b3",
    "cloth": "#76896b",
    "pants": "#554737"
  },
  {
    "hair": "#a5a5a3",
    "skin": "#e9c6a4",
    "cloth": "#54555c",
    "pants": "#393a43"
  },
  {
    "hair": "#65452f",
    "skin": "#ddb28c",
    "cloth": "#557e79",
    "pants": "#ad9570"
  },
  {
    "hair": "#252521",
    "skin": "#f1c49e",
    "cloth": "#ad865e",
    "pants": "#555c3f"
  },
  {
    "hair": "#282423",
    "skin": "#885a40",
    "cloth": "#8eafbf",
    "pants": "#4c5055"
  },
  {
    "hair": "#795137",
    "skin": "#f6d3b3",
    "cloth": "#aa8db3",
    "pants": "#89718e"
  },
  {
    "hair": "#4e372c",
    "skin": "#efc5a3",
    "cloth": "#91ae9c",
    "pants": "#708a75"
  },
  {
    "hair": "#28282c",
    "skin": "#efc3a7",
    "cloth": "#39465a",
    "pants": "#303d51"
  },
  {
    "hair": "#93908d",
    "skin": "#dfb995",
    "cloth": "#b3838d",
    "pants": "#55545a"
  },
  {
    "hair": "#47312b",
    "skin": "#f4c9ab",
    "cloth": "#d7a085",
    "pants": "#a67862"
  },
  {
    "hair": "#6b5b50",
    "skin": "#edc4a3",
    "cloth": "#8e4b59",
    "pants": "#42434b"
  },
  {
    "hair": "#676563",
    "skin": "#d9aa86",
    "cloth": "#43576a",
    "pants": "#55616b"
  },
  {
    "hair": "#8b684a",
    "skin": "#f2c6a4",
    "cloth": "#b49d7e",
    "pants": "#c3b497"
  },
  {
    "hair": "#bd9658",
    "skin": "#f1ceb0",
    "cloth": "#745268",
    "pants": "#4a3c46"
  },
  {
    "hair": "#392b27",
    "skin": "#b9825d",
    "cloth": "#ba795f",
    "pants": "#7e5143"
  },
  {
    "hair": "#27252a",
    "skin": "#edc2a1",
    "cloth": "#8eaebc",
    "pants": "#7695a5"
  },
  {
    "hair": "#2e2c30",
    "skin": "#f0c8aa",
    "cloth": "#9eaaa5",
    "pants": "#76837f"
  },
  {
    "hair": "#bdb8af",
    "skin": "#e5c2a3",
    "cloth": "#b4bea2",
    "pants": "#d8c9b5"
  },
  {
    "hair": "#8b8881",
    "skin": "#d4a681",
    "cloth": "#c7b99a",
    "pants": "#505b65"
  },
  {
    "hair": "#724031",
    "skin": "#ebbf9d",
    "cloth": "#d8c593",
    "pants": "#725844"
  }
];

export const PRESET_COUNT = 10 + EXTRA_PRESETS.length;

export function presetColors(i) {
  if (i >= 10 && i < PRESET_COUNT) return { ...EXTRA_PRESETS[i - 10] };
  return { hair: HAIR[i % 5], skin: SKIN[Math.floor(i / 5) % 2], cloth: CLOTH[i % CLOTH.length], pants: PANTS[i % 3] };
}

const presetCache = new Map();
export function presetSprites(i) {
  if (!presetCache.has(i)) presetCache.set(i, makeCharacter(presetColors(i)));
  return presetCache.get(i);
}

export const GROOM = makeCharacter({ hair: '#2b2b2b', skin: '#f6d3b3', cloth: '#1f2933', pants: '#1f2933' });
export const BRIDE = makeCharacter({ hair: '#5a3a1e', skin: '#f6d3b3', cloth: '#ffffff', pants: '#ffffff' });
