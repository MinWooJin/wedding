import { Game } from './game.js';
import { loadConfig } from './config.js';
import { loadProfile, saveProfile } from './state.js';
import { loadAssets } from './assets.js';
import { fetchMessages, postVisit } from './api.js';
import { showIntro } from './ui/intro.js';
import { createHud } from './ui/hud.js';
import { createHub } from './world/hub.js';
import { createInfo } from './world/info.js';
import { createGallery } from './world/gallery.js';
import { createStory } from './world/story.js';
import { createGuestbook } from './world/guestbook.js';
import { createGifts } from './world/gifts.js';

async function loadManifest() {
  try { const r = await fetch('gallery/manifest.json', { cache: 'no-cache' }); return r.ok ? await r.json() : []; }
  catch { return []; }
}

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');
const [config, assets, gallery] = await Promise.all([loadConfig(), loadAssets(), loadManifest()]);
document.title = `${config.groom.name} ♥ ${config.bride.name} 결혼합니다`;

let profile = loadProfile();
if (!profile) {
  profile = await showIntro(document.getElementById('intro'), config, assets);
  saveProfile(profile);
}

const game = new Game({
  canvas, frame, config, profile, assets,
  scenes: { hub: createHub, info: createInfo, gallery: createGallery, story: createStory, guestbook: createGuestbook, gifts: createGifts },
  ui: {},
});
game.gallery = Array.isArray(gallery) ? gallery : [];
game.data = { messages: [] };
game.ui.hud = createHud(document.getElementById('hud'), config, game);
game.onMessagesChanged = () => {
  game.scenes.hub?.setGuests(game.data.messages);
  game.scenes.guestbook?.setEntries(game.data.messages);
};
game.start('hub');

async function refreshMessages() {
  const list = await fetchMessages(config.guestbookApi);
  if (list.length) { game.data.messages = list; game.onMessagesChanged(); }
}

/** 한 번 입장한 하객은 광장에 남는다: 세션당 한 번 닉네임·캐릭터를 등록 */
async function registerVisit() {
  const key = `pixel-wedding-visited:${profile.nickname}:${profile.charId}`;
  try { if (sessionStorage.getItem(key)) return; } catch {}
  const r = await postVisit(config.guestbookApi, { nickname: profile.nickname, characterId: profile.charId });
  if (r.ok) { try { sessionStorage.setItem(key, '1'); } catch {} }
}
registerVisit().then(refreshMessages);
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
