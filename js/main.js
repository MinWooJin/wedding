import { Game } from './game.js';
import { createHub } from './world/hub.js';

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');

const game = new Game({
  canvas, frame,
  config: {},
  profile: { nickname: '테스트', charId: 0 },
  scenes: { hub: createHub },
  ui: {},
});
game.start('hub');

window.__game = game; // 디버깅용
