import { loadAssets } from '../js/assets.js';
import { createHub } from '../js/world/hub.js';
import { DEFAULT_CONFIG } from '../js/config.js';
import { Renderer } from '../js/renderer.js';
import { Character } from '../js/entities/character.js';

const status = document.getElementById('status');
try {
  const assets = await loadAssets('../assets');
  const ids = ['guestbook', 'gallery', 'gifts', 'info'];
  for (const id of ids) {
    const spr = assets.objects[`landmark-${id}`];
    if (spr?.w !== 96 || spr?.h !== 112) throw new Error(`${id}: 96×112 불일치`);
  }
  if (!assets.urls['objects/landmark-guestbook']?.endsWith('landmark-guestbook-v1.png')) throw new Error('방명록 임시 그림 사용');
  const goTo = id => { document.getElementById('action').textContent = `${id} 입구 이동 요청 확인 · 실제 기록 없음`; };
  const game = { config: DEFAULT_CONFIG, assets, profile: { nickname: '검토 하객', charId: 0 }, data: { messages: [] }, goTo };
  const scene = createHub(game);
  const canvas = document.getElementById('hub');
  const renderer = new Renderer(canvas);
  renderer.tiles = assets.tiles;
  renderer.cam = { x: 0, y: 512 };
  renderer.view = { scale: 1, width: 352, height: 352 };
  const player = new Character({ sprites: assets.characters['preset-0'], name: '검토 하객', x: 176, y: 752 });
  game.player = player;
  renderer.begin('#a6bc79');
  scene.draw(renderer, player);
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    scene.onTap((event.clientX - rect.left) * 352 / rect.width, (event.clientY - rect.top) * 352 / rect.height + 512, game);
  });
  for (const id of ids) {
    const object = scene.objects.find(o => o.id === `sign-${id}`);
    const button = document.createElement('button');
    button.textContent = object.name;
    button.addEventListener('click', () => scene.onTap(object.tx * 32 + 48, object.drawY + 56, game));
    document.getElementById('links').append(button);
  }
  status.textContent = '4 / 4종 96×112 PNG 로드 완료 · 새 방명록 v1 / 선물 v2 · 실제 광장 배치';
} catch (error) {
  status.textContent = `검토 실패: ${error.message}`;
  console.error(error);
}
