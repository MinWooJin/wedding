import { Game } from './game.js';
import { createHub } from './world/hub.js';
import { loadConfig } from './config.js';
import { loadProfile, saveProfile } from './state.js';
import { showIntro } from './ui/intro.js';
import { createHud } from './ui/hud.js';

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');
const config = await loadConfig();
document.title = `${config.groom.name} ♥ ${config.bride.name} 결혼합니다`;

let profile = loadProfile();
if (!profile) {
  profile = await showIntro(document.getElementById('intro'), config);
  saveProfile(profile);
}

const game = new Game({ canvas, frame, config, profile, scenes: { hub: createHub }, ui: {} });
game.ui.hud = createHud(document.getElementById('hud'), config, game);
game.start('hub');

window.__game = game; // 디버깅용
