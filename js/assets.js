/**
 * 선택적 PNG 에셋 로더. 파일이 있으면 코드 그림 대신 사용하고, 없으면 조용히 폴백.
 *
 *  assets/characters/<name>.png  정면 1장(가로:세로 ≈ 2:3, 48×72로 맞춰짐) 또는 3열×4행 시트(열: idle/걷기A/걷기B, 행: down/left/right/up)
 *  assets/tiles/<ID>.png         32×32
 *  assets/objects/<id>.png       오브젝트별 크기(현재 아치 224×160, 나무 64×96, 꽃 32×48 등)
 *  manifest.files               같은 ID의 별도 버전 PNG 선택. 누락/실패하면 원래 파일 사용.
 *  assets/maps/<sceneId>.png     씬 전체 배경(맵 픽셀 크기와 같게; 다르면 늘려 맞춤)
 */
import { TILE } from './renderer.js';
import { PRESET_COUNT } from './sprites/characters.js';

export const CHAR_W = 48, CHAR_H = 72; // 화면(352px 폭 기준)에서 캐릭터가 폭 48px, 높이 72px로 보인다(타일 1.5칸 폭)
export const CHARACTER_NAMES = [...Array.from({ length: PRESET_COUNT }, (_, i) => `preset-${i}`), 'groom', 'bride', 'couple'];
export const TILE_IDS = ['G', 'W', 'P', 'H', 'F', 'D', 'K', 'R', 'S', 'A', 'B', 'C', 'E', 'M', 'L', 'Q', 'Y', 'V', 'Z', 'N', 'J', 'U'];
// N 모래빛 돌길(버진로드), J/U 꽃이 드문드문 섞인 잔디(G와 같은 베이스색) — 레퍼런스 톤
// 맵 문자열은 한 글자가 한 칸이므로, 두 글자 파일명(X1~X4)은 한 글자 코드로 쓴다.
// Q 분홍 꽃밭(X1), Y 흰 꽃밭(X2), V 흰 자갈길(X3), Z 장미 산울타리(X4, 막힘)
export const TILE_FILES = { Q: 'X1', Y: 'X2', V: 'X3', Z: 'X4' };
const FILE_TO_TILE = Object.fromEntries(Object.entries(TILE_FILES).map(([k, v]) => [v, k]));
export const OBJECT_IDS = ['arch', 'tree', 'sign', 'mailbox', 'frame', 'bench', 'chest', 'desk', 'board', 'phone', 'calendar', 'mapframe', 'flower', 'stone', 'door',
  'chair', 'bush', 'lantern', 'petal-pile', 'welcome-board', 'bush-white', 'platform', 'window', 'plant', 'wedding-mailbox', 'share-letter',
  'aisle-runner', 'aisle-flower-left', 'aisle-flower-right'];
export const SCENE_IDS = ['hub', 'info', 'gallery', 'guestbook', 'gifts'];

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 6000);
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
  const out = { characters: {}, tiles: {}, objects: {}, maps: {}, urls: {} };
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
    jobs.push(imageFor('tiles', file).then((img) => { if (img) out.tiles[id] = imgSprite(toCanvas(img, 0, 0, img.width, img.height, TILE, TILE)); }));
  }
  for (const id of pick(manifest.objects, OBJECT_IDS)) jobs.push(imageFor('objects', id).then((img) => {
    if (!img) return;
    // 폭은 타일 배수로 맞추고, 높이는 원본을 유지한다(의자 48px 등). Scene이 발자국 행 바닥에 맞춰 그린다.
    const w = Math.max(TILE, Math.round(img.width / TILE) * TILE), h = Math.max(TILE, img.height);
    out.objects[id] = imgSprite(toCanvas(img, 0, 0, img.width, img.height, w, h));
  }));
  for (const id of pick(manifest.maps, SCENE_IDS)) jobs.push(imageFor('maps', id).then((img) => { if (img) out.maps[id] = img; }));
  await Promise.all(jobs);
  return out;
}

/** 이름에 해당하는 PNG 세트가 있으면 그것, 없으면 코드 폴백 */
export function characterSet(assets, name, fallback) {
  return assets?.characters?.[name] ?? fallback;
}
