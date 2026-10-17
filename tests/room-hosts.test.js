import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInfo } from '../js/world/info.js';
import { createGifts } from '../js/world/gifts.js';
import { createGuestbook } from '../js/world/guestbook.js';
import { createGallery } from '../js/world/gallery.js';
import { assetFilename } from '../js/assets.js';
import { findPath } from '../js/world/movement.js';

const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
const objects = Object.fromEntries(manifest.objects.map((name) => {
  const png = readFileSync(new URL(`../assets/objects/${assetFilename(manifest, 'objects', name)}`, import.meta.url));
  return [name, { w: png.readUInt32BE(16), h: png.readUInt32BE(20), canvas: {} }];
}));
function game(gallery = []) {
  return { config: JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url))), assets: { objects }, profile: { nickname: '나' }, data: { messages: [] }, gallery };
}

test('네 공간의 신랑/신부는 서로 다른 대사를 말하고 통로를 막지 않는다', (t) => {
  const saved = { document: globalThis.document, Image: globalThis.Image };
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
  globalThis.Image = class { addEventListener() {} };
  t.after(() => Object.assign(globalThis, saved));
  for (const [create, role] of [[createInfo, 'groom'], [createGifts, 'bride'], [createGuestbook, 'bride'], [createGallery, 'groom']]) {
    const g = game();
    const scene = create(g);
    const npc = scene.npcs[0];
    assert.equal(scene.npcs.length, 1);
    assert.equal(npc.character.name, g.config[role].shortName);
    assert.equal(npc.solid, false);
    assert.ok(scene.hosts.includes(npc.character), '멀리서도 이름 표시');
    npc.interact(); const first = npc.character.bubble;
    npc.interact(); assert.notEqual(npc.character.bubble, first);
    if (scene.id === 'gifts') assert.ok(npc.character.bubble.includes('축의금은 정중히 사양'));
    const point = scene.tileOf(npc.character.x, npc.character.y);
    assert.notEqual(point.tx, 5, '가운데 통로 밖에 배치');
    assert.ok(findPath(scene.map.w, scene.map.h, (x, y) => scene.isSolidTile(x, y), scene.spawn, point));
    for (const door of scene.entrances) assert.ok(findPath(scene.map.w, scene.map.h, (x, y) => scene.isSolidTile(x, y), scene.spawn, door));
  }
  const gallery = createGallery(game(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg']));
  const npc = gallery.npcs[0]; npc.interact();
  assert.ok(npc.character.bubble.includes('액자를 누르면'));
  for (const frame of gallery.frames) assert.ok(findPath(gallery.map.w, gallery.map.h, (x, y) => gallery.isSolidTile(x, y), gallery.spawn, frame.stand));
});

test('편지가 많아져도 방명록 신부 자리에는 꽃을 배치하지 않는다', () => {
  const scene = createGuestbook(game());
  scene.setEntries(Array.from({ length: 50 }, (_, i) => ({ n: `하객${i}`, c: 0, m: '축하해요', t: i })));
  for (const flower of scene.objects.filter((o) => o.id.startsWith('flower'))) {
    assert.ok(!(flower.tx >= 1 && flower.tx <= 3 && flower.ty >= 4 && flower.ty <= 6));
  }
});
