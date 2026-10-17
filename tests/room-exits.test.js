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
  test(`${id}: 출구 주변을 한 번 누르면 멀리 있어도 바로 해당 입구 밖으로 돌아간다`, (t) => {
    const previousDocument = globalThis.document;
    globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
    t.after(() => { globalThis.document = previousDocument; });
    const player = new Character({ sprites: GROOM, name: '손님', ...standPos(5, 5) });
    const calls = [];
    const game = { player, config: DEFAULT_CONFIG, assets: { objects: { frame: { w: 64, h: 64, canvas: {} } } }, profile: { nickname: '나' }, data: { messages: [] }, gallery: [], goTo: (...args) => calls.push(args) };
    const scene = create(game);
    const exit = scene.entrances.find((e) => e.to === 'hub');
    // Door's upper rim and left/right padding used to be treated as a floor tap.
    for (const [dx, dy] of [[-31, -12], [16, 0], [63, 16]]) {
      player.moveTo(100, 100);
      scene.onTap(exit.tx * 32 + dx, exit.ty * 32 + dy, game);
      assert.deepEqual(calls.at(-1), ['hub', HUB_DOORS[id].back]);
      assert.equal(player.walking, false);
    }
    assert.equal(calls.length, 3, '탭 한 번에 전환 한 번');
    assert.equal(scene.exitAt((exit.tx - 2) * 32, exit.ty * 32), null, '먼 바닥은 출구가 아니다');
    // Entering a room still leaves the player inside; no automatic bounce back.
    scene.enter(player);
    scene.update(.016, game);
    assert.equal(calls.length, 3);
  });
}
