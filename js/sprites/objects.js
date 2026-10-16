import { PAL } from './palette.js';
import { parseSprite, mirrorRows, scaleSprite } from './raster.js';

const ARCH_HALF = [ // 24×32 왼쪽 절반
  '...........ooooooooooooo',
  '.........oottttfttttyttt',
  '.......oottttyttttttfttt',
  '......otttfttttttyttttt.',
  '.....otttttfttty........',
  '....ottyttttt...........',
  '...otttfttt.............',
  '..ottttytt..............',
  '..otfttt................',
  '.ottyttt................',
  '.otttttt................',
  'ottfttt.................',
  'otttttto................',
  'ottytto.................',
  'otttttto................',
  'otftttto................',
  'otttttto................',
  'otttttto................',
  'oWWWWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWWWWo..................',
  'oooooo..................',
];

export const OBJECTS = {
  arch: mirrorRows(ARCH_HALF), // 48×32 꽃 아치(가운데 비어 있어 지나갈 수 있음)
  tree: [ // 16×32
    '......oooo......', '....ootttToo....', '...otttttttTo...', '..ottttTtttttTo.',
    '..otTtttttttTto.', '.otttttTttttttto', '.ottTtttttttttTo', 'otttttttTtttttto',
    'oTtttttttttTttto', 'otttTtttttttttto', 'ottttttttTttttTo', '.otTtttttttttto.',
    '.otttttTtttttto.', '..ottttttttTto..', '...ootttttooo...', '.....oWWWo......',
    '.....oWwWo......', '.....oWwWo......', '.....oWwWo......', '.....oWwWo......',
    '.....oWwWo......', '.....oWwWo......', '.....oWwWo......', '....ooWwWoo.....',
    '....oWWwWWo.....', '....ooooooo.....', '................', '................',
    '................', '................', '................', '................',
  ],
  sign: [ // 16×16 표지판
    '.oooooooooooooo.', 'owwwwwwwwwwwwwwo', 'owwyyywwwyyywwwo', 'owwwwwwwwwwwwwwo',
    'owwyyyyywwyywwwo', 'owwwwwwwwwwwwwwo', '.oooooooooooooo.', '......oWWo......',
    '......oWWo......', '......oWWo......', '......oWWo......', '......oWWo......',
    '......oWWo......', '......oWWo......', '.....ooWWoo.....', '.....oooooo.....',
  ],
  mailbox: [ // 16×16 우체통
    '....oooooooo....', '...orrrrrrrro...', '..orrrrrrrrrro..', '..orrrrnnrrrro..',
    '..orrrnnnnrrro..', '..orrrrnnrrrro..', '..orrrrrrrrrro..', '..orrrrrrrrrro..',
    '..oooooooooooo..', '......oWWo......', '......oWWo......', '......oWWo......',
    '......oWWo......', '......oWWo......', '.....ooWWoo.....', '.....oooooo.....',
  ],
  frame: [ // 16×16 액자(사진은 코드에서 안쪽 (3,3)~(12,10) 10×8에 그림)
    '................', '.oooooooooooooo.', '.oWWWWWWWWWWWWo.', '.oWkkkkkkkkkkWo.',
    '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.',
    '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWWWWWWWWWWWWo.',
    '.oooooooooooooo.', '................', '................', '................',
  ],
  bench: mirrorRows([ // 32×16
    '................', '................', '................', '................',
    '..oooooooooooooo', '.oWwwwwwwwwwwwww', '.oWwwwwwwwwwwwww', '.ooooooooooooooo',
    '..oWWo..........', '..oWWo..........', '.oWwwwwwwwwwwwww', '.ooooooooooooooo',
    '..oWWo..........', '..oWWo..........', '..oooo..........', '................',
  ]),
  chest: [ // 16×16 보관함
    '................', '................', '..oooooooooooo..', '.oWWWWWWWWWWWWo.',
    '.oWwwwwwwwwwwWo.', '.oWwwwwwwwwwwWo.', '.oooooooooooooo.', '.oWwwwwyyywwwWo.',
    '.oWwwwwyoywwwWo.', '.oWwwwwyyywwwWo.', '.oWwwwwwwwwwwWo.', '.oWwwwwwwwwwwWo.',
    '.oWwwwwwwwwwwWo.', '.oooooooooooooo.', '................', '................',
  ],
  desk: mirrorRows([ // 32×16 안내 데스크
    '................', '................', '................', '................',
    'oooooooooooooooo', 'oWWWWWWWWWWWWWWW', 'oWwwwwwwwwwwwwww', 'oooooooooooooooo',
    'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww',
    'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww', 'oooooooooooooooo', '................',
  ]),
  board: [ // 16×16 게시판(벽걸이)
    '.oooooooooooooo.', 'oWWWWWWWWWWWWWWo', 'oWkkkkkkkkkkkkWo', 'oWkbbbkkkkbbbkWo',
    'oWkkkkkkkkkkkkWo', 'oWkrrrrrrkkkkkWo', 'oWkkkkkkkkkkkkWo', 'oWkyyyyykkyyykWo',
    'oWkkkkkkkkkkkkWo', 'oWkbbbbbbbbkkkWo', 'oWkkkkkkkkkkkkWo', 'oWWWWWWWWWWWWWWo',
    '.oooooooooooooo.', '................', '................', '................',
  ],
  phone: [ // 16×16 전화기
    '................', '................', '................', '......oooo......',
    '.....oMMMMo.....', '....oMmmmmMo....', '....oMmnnmMo....', '....oMmmmmMo....',
    '....oMMMMMMo....', '...oMMMMMMMMo...', '..oMMMMMMMMMMo..', '..oMmmmmmmmmMo..',
    '..oMMMMMMMMMMo..', '..oooooooooooo..', '................', '................',
  ],
  calendar: [ // 16×16 달력(벽걸이)
    '......o..o......', '.oooooooooooooo.', '.orrrrrrrrrrrro.', '.orrrrrrrrrrrro.',
    '.onnnnnnnnnnnno.', '.onononononnnno.', '.onnnnnnnnnnnno.', '.onononononnnno.',
    '.onnnnnnnnnnnno.', '.ononononrnnnno.', '.onnnnnnnnnnnno.', '.oooooooooooooo.',
    '................', '................', '................', '................',
  ],
  mapframe: [ // 16×16 지도 액자(벽걸이)
    '.oooooooooooooo.', '.oWWWWWWWWWWWWo.', '.oWbbbbbbbbbbWo.', '.oWbbggbbbggbWo.',
    '.oWbgggbbbgggWo.', '.oWbgggggggggWo.', '.oWbbggdddggbWo.', '.oWbbbgdrdgbbWo.',
    '.oWbbbggdggbbWo.', '.oWbbbbgggbbbWo.', '.oWbbbbbbbbbbWo.', '.oWWWWWWWWWWWWo.',
    '.oooooooooooooo.', '................', '................', '................',
  ],
  flower: [ // 16×16 방명록 꽃
    '................', '................', '................', '......off.......',
    '.....offff......', '.....ofyff......', '.....offff......', '......off.......',
    '.......t........', '.......t.t......', '......ttt.......', '.......t........',
    '.......t........', '................', '................', '................',
  ],
  stone: [ // 16×16 공유 비석
    '................', '.....oooooo.....', '....ossssssso...', '...ossSsssSso...',
    '...osssssssso...', '...ossyyyyyso...', '...osssssssso...', '...osSsssssSo...',
    '...osssssssso...', '...osssssssso...', '..oosssssssoo...', '..oSSSSSSSSSSo..',
    '..oooooooooooo..', '................', '................', '................',
  ],
  door: [ // 16×16 출입구(바닥 표시)
    'oooooooooooooooo', 'oyyyyyyyyyyyyyyo', 'oyddddddddddddyo', 'oyddddddddddddyo',
    'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo',
    'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo',
    'oyddddddddddddyo', 'oyddddddddddddyo', 'oyyyyyyyyyyyyyyo', 'oooooooooooooooo',
  ],
};

/** 코드 오브젝트는 16px 기준으로 그려져 있어 32px 격자에 맞게 2배 확대해 돌려준다(폴백용). */
const cache = new Map();
/** PNG 전용 장식(덤불·랜턴·단상 등)이 로드에 실패하면 엉뚱한 그림 대신 보이지 않는 1칸으로 대체한다. */
const EMPTY = { w: 32, h: 32, px: Array.from({ length: 32 }, () => Array(32).fill(null)) };
export function objectSprite(id) {
  if (!OBJECTS[id]) return EMPTY;
  if (!cache.has(id)) cache.set(id, scaleSprite(parseSprite(OBJECTS[id], PAL), 2));
  return cache.get(id);
}
