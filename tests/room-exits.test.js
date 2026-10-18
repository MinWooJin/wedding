import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInfo } from '../js/world/info.js';
import { createGifts } from '../js/world/gifts.js';
import { createGallery } from '../js/world/gallery.js';
import { createGuestbook } from '../js/world/guestbook.js';
import { HUB_DOORS } from '../js/world/hub.js';
import { DEFAULT_CONFIG } from '../js/config.js';
import { Character, standPos } from '../js/entities/character.js';
import { GROOM } from '../js/sprites/characters.js';

for (const [id, create] of Object.entries({ info: createInfo, gifts: createGifts, gallery: createGallery, guestbook: createGuestbook })) {
  test(`${id}: 걸어서 나가는 문·매트는 없고, 하단 "정원으로" 버튼이 돌아갈 광장 자리만 있다`, (t) => {
    const previousDocument = globalThis.document;
    globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
    t.after(() => { globalThis.document = previousDocument; });
    const player = new Character({ sprites: GROOM, name: '손님', ...standPos(5, 5) });
    const calls = [];
    const game = { player, config: DEFAULT_CONFIG, assets: { objects: { frame: { w: 64, h: 64, canvas: {} } } }, profile: { nickname: '나' }, data: { messages: [] }, gallery: [], goTo: (...args) => calls.push(args) };
    const scene = create(game);
    assert.ok(!scene.objects.some((o) => o.sprite === 'door'), '문 매트 없음');
    const last = scene.map.h - 1;
    for (let tx = 0; tx < scene.map.w; tx++) assert.equal(scene.isSolidTile(tx, last), true, '아래 벽에 나가는 틈이 없다');
    const back = scene.entrances.find((e) => e.to === 'hub');
    assert.deepEqual(back.spawn, HUB_DOORS[id].back, '버튼은 그 공간 그림 옆으로 돌아간다');
    assert.ok(back.tx < 0 && back.ty < 0, '맵 안에서 밟거나 누를 수 있는 출구가 아니다');
    scene.onTap(5 * 32 + 16, last * 32 + 8, game); // 예전 매트 자리
    assert.equal(calls.length, 0, '아래 가운데를 눌러도 나가지 않는다');
  });
}
