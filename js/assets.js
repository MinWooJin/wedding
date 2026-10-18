/**
 * 선택적 PNG 에셋 로더. 파일이 있으면 코드 그림 대신 사용하고, 없으면 조용히 폴백.
 *
 *  assets/characters/<name>.png  정면 1장(가로:세로 ≈ 2:3, 48×72로 맞춰짐) 또는 3열×4행 시트(열: idle/걷기A/걷기B, 행: down/left/right/up)
 *  assets/tiles/<ID>.png         일반 타일32×32, 연속 잔디 재질128×128
 *  assets/objects/<id>.png       오브젝트별 크기(현재 아치 224×160, 나무 64×96, 꽃 32×48 등)
 *  manifest.files               같은 ID의 별도 버전 PNG 선택. 누락/실패하면 원래 파일 사용.
 *  assets/maps/<sceneId>.png     씬 전체 배경(맵 픽셀 크기와 같게; 다르면 늘려 맞춤)
 */
import { TILE } from './renderer.js';
import { PRESET_COUNT } from './sprites/characters.js';
import { decorateWeddingHub } from './world/wedding-decor.js';

export const CHAR_W = 48, CHAR_H = 72; // 화면(352px 폭 기준)에서 캐릭터가 폭 48px, 높이 72px로 보인다(타일 1.5칸 폭)
/** 분위기용 군중 하객 그림 수(선택 프리셋 30종과 별개, 캐릭터 고르기에는 나오지 않는다) */
export const EXTRA_GUEST_COUNT = 6;
export const CHARACTER_NAMES = [...Array.from({ length: PRESET_COUNT }, (_, i) => `preset-${i}`), 'groom', 'bride', 'couple',
  ...Array.from({ length: EXTRA_GUEST_COUNT }, (_, i) => `guest-extra-${i}`)];
export const TILE_IDS = ['G', 'W', 'P', 'H', 'F', 'D', 'K', 'R', 'S', 'A', 'B', 'C', 'E', 'M', 'L', 'Q', 'Y', 'V', 'Z', 'N', 'J', 'U'];
// N 모래빛 돌길, 현재 G/J/U는 같은 128px 연속 잔디 재질 v5. 들꽃은 별도 바닥 소품.
// 맵 문자열은 한 글자가 한 칸이므로, 두 글자 파일명(X1~X4)은 한 글자 코드로 쓴다.
// Q 분홍 꽃밭(X1), Y 흰 꽃밭(X2), V 흰 자갈길(X3), Z 장미 산울타리(X4, 막힘)
export const TILE_FILES = { Q: 'X1', Y: 'X2', V: 'X3', Z: 'X4' };
const FILE_TO_TILE = Object.fromEntries(Object.entries(TILE_FILES).map(([k, v]) => [v, k]));
export const OBJECT_IDS = ['arch', 'tree', 'sign', 'mailbox', 'frame', 'bench', 'chest', 'desk', 'board', 'phone', 'calendar', 'mapframe', 'flower', 'stone', 'door',
  'chair', 'bush', 'lantern', 'petal-pile', 'welcome-board', 'bush-white', 'platform', 'window', 'plant', 'wedding-mailbox', 'share-letter',
  'aisle-runner', 'aisle-flower-left', 'aisle-flower-right', 'party-table', 'ribbon-lantern', 'meadow-sprig', 'aisle-flower-airy-left', 'aisle-flower-airy-right', 'wedding-cake',
  'planter-box', 'aisle-edge-left', 'aisle-edge-right', 'lavender', 'rose-bush-l', 'rose-bush-s', 'tree-green', 'birdbath', 'landmark-gallery', 'landmark-gifts', 'landmark-info', 'landmark-guestbook'];
export const SCENE_IDS = ['hub', 'info', 'gallery', 'guestbook', 'gifts'];
/**
 * 광장 배경은 레퍼런스처럼 세 조각(위·반복·아래)을 세로로 이어 한 장으로 쓴다. y는 조각이 시작하는 월드 좌표.
 * 방명록 정원 배경은 한 장(guestbook-bg)이다.
 */
export const MAP_PIECES = {
  hub: [{ id: 'hub-top', y: 0 }, { id: 'hub-repeat', y: 256 }, { id: 'hub-bottom', y: 544 }],
  guestbook: [{ id: 'guestbook-bg', y: 0 }],
};
const MAP_IDS = [...SCENE_IDS, ...Object.values(MAP_PIECES).flat().map((p) => p.id)];
/** 예식 안내관 그림(assets/ceremony/)과 가로 프레임 시트(manifest.ceremonySheets) */
export const CEREMONY_IDS = ['back', 'front', 'petals', 'heart', 'map'];
export const CEREMONY_SHEETS = ['groom-ceremony', 'bride-ceremony', 'guest-seated'];

/** 가로로 이어 붙인 프레임 시트 → 프레임 스프라이트 배열(크기 그대로 자른다) */
export function framesFromStrip(img, frameWidth, frameHeight, frames, cut = (sx) => toCanvas(img, sx, 0, frameWidth, frameHeight, frameWidth, frameHeight)) {
  const count = Math.min(frames, Math.floor(img.width / frameWidth));
  return Array.from({ length: count }, (_, i) => imgSprite(cut(i * frameWidth)));
}

/**
 * 조각 그림들을 한 캔버스에 이어 붙인다. 조각이 하나라도 빠지면 null(타일 그리기로 폴백).
 * @param {Record<string, {width:number,height:number}>} images id → 이미지
 */
export function composeMap(images, pieces, create = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })) {
  if (!pieces.every((p) => images[p.id])) return null;
  if (pieces.length === 1 && pieces[0].y === 0) return images[pieces[0].id];
  const width = Math.max(...pieces.map((p) => images[p.id].width));
  const height = Math.max(...pieces.map((p) => p.y + images[p.id].height));
  const canvas = create(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  for (const p of pieces) ctx.drawImage(images[p.id], 0, p.y);
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    // 그림 150장을 한꺼번에 받으므로 느린 망에서는 한 장이 6초를 넘기기도 한다. 너무 짧게 잡으면
    // 버전 파일을 포기하고 없는 기본 파일(404)로 넘어가 그림이 빠진다. 서버 오류는 onerror가 바로 잡는다.
    const timer = setTimeout(() => resolve(null), 20000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

/** 이미지(또는 일부)를 w×h 캔버스로. 크기가 같으면 그대로, 다르면 리샘플(축소는 부드럽게, 확대는 픽셀 유지). */
function toCanvas(img, sx, sy, sw, sh, w, h, flip = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = sw > w || sh > h;
  if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return c;
}

const imgSprite = (canvas) => ({ w: canvas.width, h: canvas.height, canvas });

/** 정면 1장 → 4방향 세트(좌우는 반전, 뒷모습은 정면 재사용). 걷기 들썩임은 Character가 처리. */
export function setFromSingle(img, w = CHAR_W, h = CHAR_H) {
  const front = imgSprite(toCanvas(img, 0, 0, img.width, img.height, w, h));
  const flipped = imgSprite(toCanvas(img, 0, 0, img.width, img.height, w, h, true));
  return { down: [front], up: [front], left: [front], right: [flipped] };
}

/** 3열×4행 시트 → 4방향 세트. 행 순서: down, left, right, up. 열: idle, 걷기A, 걷기B */
export function setFromSheet(img, w = CHAR_W, h = CHAR_H) {
  const fw = img.width / 3, fh = img.height / 4;
  const row = (r) => [0, 1, 2].map((c) => imgSprite(toCanvas(img, c * fw, r * fh, fw, fh, w, h)));
  return { down: row(0), left: row(1), right: row(2), up: row(3) };
}

/** 세로/가로 비율로 시트(≈2.0)인지 정면 1장(≈1.5)인지 판별 */
export function characterSetFromImage(img) {
  const ratio = img.height / img.width;
  return Math.abs(ratio - 2) < Math.abs(ratio - 1.5) ? setFromSheet(img) : setFromSingle(img);
}

/** 같은 ID의 새 그림은 별도 파일로 연결해 이전 PNG를 보존한다. */
export function assetFilename(manifest, category, name) {
  const variant = manifest?.files?.[category]?.[name];
  return typeof variant === 'string' && /^[a-zA-Z0-9_-]+\.png$/.test(variant) ? variant : `${name}.png`;
}

/**
 * assets/manifest.json: {"characters":[...], "tiles":[...], "objects":[...], "maps":[...]} — 존재하는 파일 이름만 적는다.
 * tools/prepare_assets.py가 자동으로 만들어 준다. manifest가 없으면 아무것도 로드하지 않는다(코드 그림 폴백).
 */
export async function loadAssets(base = 'assets') {
  const out = { characters: {}, tiles: {}, objects: {}, maps: {}, urls: {}, ceremony: {}, ceremonySheets: {} };
  let manifest;
  try {
    const res = await fetch(`${base}/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return out;
    manifest = await res.json();
  } catch { return out; }

  async function imageFor(category, name) {
    const filename = assetFilename(manifest, category, name);
    let url = `${base}/${category}/${filename}`;
    let img = await loadImage(url);
    if (!img && filename !== `${name}.png`) {
      url = `${base}/${category}/${name}.png`;
      img = await loadImage(url);
    }
    if (img) out.urls[`${category}/${name}`] = url;
    return img;
  }

  const pick = (list, allowed) => (Array.isArray(list) ? list.filter((n) => allowed.includes(n)) : []);
  const jobs = [];
  for (const n of pick(manifest.characters, CHARACTER_NAMES)) jobs.push(imageFor('characters', n).then((img) => { if (img) out.characters[n] = n === 'couple' ? setFromSingle(img, 96, 72) : characterSetFromImage(img); }));
  const tileNames = Array.isArray(manifest.tiles) ? manifest.tiles.map((n) => FILE_TO_TILE[n] ?? n) : [];
  for (const id of pick(tileNames, TILE_IDS)) {
    const file = TILE_FILES[id] ?? id;
    jobs.push(imageFor('tiles', file).then((img) => {
      if (!img) return;
      // 잔디 재질은 4×4칸 그림을 보존하고 렌더러가 월드 좌표로 잘라 쓴다.
      const size = ['G', 'J', 'U'].includes(id) && img.width === 128 && img.height === 128 ? 128 : TILE;
      out.tiles[id] = imgSprite(toCanvas(img, 0, 0, img.width, img.height, size, size));
    }));
  }
  for (const id of pick(manifest.objects, OBJECT_IDS)) jobs.push(imageFor('objects', id).then((img) => {
    if (!img) return;
    // 폭은 타일 배수로 맞추고, 높이는 원본을 유지한다(의자 48px 등). Scene이 발자국 행 바닥에 맞춰 그린다.
    const w = Math.max(TILE, Math.round(img.width / TILE) * TILE), h = Math.max(TILE, img.height);
    out.objects[id] = imgSprite(toCanvas(img, 0, 0, img.width, img.height, w, h));
  }));
  for (const id of pick(manifest.ceremony, CEREMONY_IDS)) jobs.push(imageFor('ceremony', id).then((img) => { if (img) out.ceremony[id] = img; }));
  for (const id of CEREMONY_SHEETS) {
    const sheet = manifest.ceremonySheets?.[id];
    if (!sheet || !/^characters\/[a-zA-Z0-9_-]+\.png$/.test(sheet.file ?? '')) continue;
    jobs.push(loadImage(`${base}/${sheet.file}`).then((img) => {
      if (img) out.ceremonySheets[id] = framesFromStrip(img, sheet.frameWidth, sheet.frameHeight, sheet.frames);
    }));
  }
  await Promise.all(jobs.splice(0)); // 아래 대체 그림이 objects를 쓰므로 먼저 기다린다
  if (!out.objects['landmark-guestbook'] && out.objects['welcome-board']?.canvas) {
    const board = out.objects['welcome-board'].canvas, scale = 96 / board.width;
    out.objects['landmark-guestbook'] = imgSprite(toCanvas(board, 0, 0, board.width, board.height, 96, Math.round(board.height * scale)));
  }
  const pieces = {};
  for (const id of pick(manifest.maps, MAP_IDS)) jobs.push(imageFor('maps', id).then((img) => { if (img) (SCENE_IDS.includes(id) ? out.maps : pieces)[id] = img; }));
  await Promise.all(jobs);
  for (const [scene, list] of Object.entries(MAP_PIECES)) {
    if (out.maps[scene]) continue; // 씬 전체 한 장이 따로 있으면 그것을 우선한다
    const composed = composeMap(pieces, list);
    if (composed) out.maps[scene] = scene === 'hub'
      ? decorateWeddingHub(composed, { top: pieces['hub-top'], guestbook: pieces['guestbook-bg'], objects: out.objects, grass: out.tiles.G?.canvas })
      : composed;
  }
  return out;
}

/** 이름에 해당하는 PNG 세트가 있으면 그것, 없으면 코드 폴백 */
export function characterSet(assets, name, fallback) {
  return assets?.characters?.[name] ?? fallback;
}
