import { Game } from './game.js';
import { loadConfig } from './config.js';
import { loadProfile, saveProfile, getGuestId } from './state.js';
import { loadAssets } from './assets.js';
import { fetchMessages, postVisit, checkNickname } from './api.js';
import { showIntro } from './ui/intro.js';
import { createHud } from './ui/hud.js';
import { createHub } from './world/hub.js';
import { createInfo } from './world/info.js';
import { createGallery } from './world/gallery.js';
import { createGuestbook } from './world/guestbook.js';
import { createGifts } from './world/gifts.js';
import { showCover } from './ui/cover.js';
import { readPreview } from './guestbook-store.js';

async function loadManifest() {
  try { const r = await fetch('gallery/manifest.json', { cache: 'no-cache' }); return r.ok ? await r.json() : []; }
  catch { return []; }
}

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');
const assetsReady = loadAssets();
const galleryReady = loadManifest();
const config = await loadConfig();
document.title = `${config.groom.name} ♥ ${config.bride.name} 결혼합니다`;

let profile = loadProfile();
await showCover(document.getElementById('intro'), config, assetsReady, !!profile);
const [assets, gallery] = await Promise.all([assetsReady, galleryReady]);
const guestId = getGuestId(); // 서버 도배 방지·닉네임 소유 확인용 기기 토큰
let claimed = false; // 같은 닉네임이 이미 있을 때 하객이 "네, 저예요"로 확인했는지(이번 방문 동안)
const nicknameChecker = config.guestbookApi ? (nickname) => checkNickname(config.guestbookApi, nickname, guestId) : null;
if (!profile) {
  profile = await showIntro(document.getElementById('intro'), config, assets, null, { checkNickname: nicknameChecker });
  claimed = !!profile.claim;
  profile = { nickname: profile.nickname, charId: profile.charId };
  saveProfile(profile);
}

// 캔버스 글씨는 폰트 로딩을 일으키지 않는다. 이름표가 기본 고딕으로 나오지 않게 미리 불러온다(최대 1.5초).
await Promise.race([
  Promise.all(['12px Galmuri11', '13px Galmuri11', '14px Galmuri11', '15px "Pretendard Variable"', '600 20px "Pretendard Variable"'].map((f) => document.fonts?.load(f, '민우 새암 방명록 정원 소식 나누기'))).catch(() => {}),
  new Promise((r) => setTimeout(r, 1500)),
]);

const game = new Game({
  canvas, frame, config, profile, assets,
  scenes: { hub: createHub, info: createInfo, gallery: createGallery, guestbook: createGuestbook, gifts: createGifts },
  ui: {},
});
game.gallery = Array.isArray(gallery) ? gallery : [];
game.guestId = guestId;
game.claimed = claimed;
game.checkNickname = nicknameChecker;
game.data = { messages: config.guestbookApi ? [] : readPreview() };
game.openGuestbook = () => game.sceneById('guestbook').openForm(game);
game.openMessages = () => game.sceneById('guestbook').openList();
game.ui.hud = createHud(document.getElementById('hud'), config, game);
game.onMessagesChanged = () => {
  game.scenes.hub?.setGuests(game.data.messages);
  game.scenes.guestbook?.setEntries(game.data.messages);
  game.ui.hud?.refresh?.();
};
game.start('hub');

async function refreshMessages() {
  if (!config.guestbookApi) return;
  const result = await fetchMessages(config.guestbookApi, { withStatus: true });
  if (result.ok) { game.data.messages = result.entries; game.onMessagesChanged(); }
}

/** 한 번 입장한 하객은 광장에 남는다: 세션당 한 번 닉네임·캐릭터를 등록 */
async function registerVisit() {
  const { nickname, charId } = game.profile;
  const key = `pixel-wedding-visited:${nickname}:${charId}`;
  try { if (sessionStorage.getItem(key)) return; } catch {}
  // 본인 확인(claim)한 입장 기록이 저장되면 이 브라우저도 그 닉네임의 주인이 된다.
  const r = await postVisit(config.guestbookApi, { nickname, characterId: charId }, { guestId: game.guestId, token: config.guestbookToken, claim: game.claimed });
  if (r.ok) { try { sessionStorage.setItem(key, '1'); } catch {} }
}
game.registerVisit = registerVisit;
registerVisit(); refreshMessages();
setInterval(refreshMessages, 60_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMessages(); });

window.__game = game; // 디버깅용

/** 현재 씬의 타일 렌더를 PNG로 내려받는다(배경 이미지 img2img 밑그림용). 콘솔에서 __exportMap() */
window.__exportMap = () => {
  const s = game.scene;
  const c = document.createElement('canvas');
  c.width = s.pixelW; c.height = s.pixelH;
  const r = Object.create(game.renderer);
  r.ctx = c.getContext('2d'); r.cam = { x: 0, y: 0 }; r.view = { width: c.width, height: c.height, scale: 1 };
  r.ctx.imageSmoothingEnabled = false;
  const saved = s.bgImage; s.bgImage = null;
  s.draw({ drawTile: (id, x, y) => r.drawTile(id, x, y), drawSprite: () => {}, drawCanvas: () => {}, drawNameTag: () => {}, drawBubble: () => {} }, game.player);
  s.bgImage = saved;
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png'); a.download = `${s.id}-${c.width}x${c.height}.png`; a.click();
};
