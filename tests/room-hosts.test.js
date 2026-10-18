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
    // 방명록 정원에는 두 사람이 우체통 양옆에 함께 선다. 다른 방은 한 사람씩.
    assert.equal(scene.npcs.length, 2, '모든 방에 신랑·신부가 함께');
    assert.deepEqual(scene.npcs.map((n) => n.character.name).sort(), [g.config.groom.shortName, g.config.bride.shortName].sort());
    const npc = scene.npcs.find((n) => n.character.name === g.config[role].shortName);
    assert.equal(npc.character.name, g.config[role].shortName);
    assert.equal(npc.solid, false);
    assert.ok(scene.hosts.includes(npc.character), '멀리서도 이름 표시');
    npc.interact(); const first = npc.character.bubble;
    npc.interact(); assert.notEqual(npc.character.bubble, first);
    if (scene.id === 'gifts') assert.ok(npc.character.bubble.includes('축의금은 정중히 사양'));
    const point = scene.tileOf(npc.character.x, npc.character.y);
    assert.notEqual(point.tx, 5, '가운데 통로 밖에 배치');
    assert.ok(findPath(scene.map.w, scene.map.h, (x, y) => scene.isSolidTile(x, y), scene.spawn, point));
    for (const door of scene.entrances.filter((e) => e.tx >= 0)) assert.ok(findPath(scene.map.w, scene.map.h, (x, y) => scene.isSolidTile(x, y), scene.spawn, door));
  }
  const gallery = createGallery(game(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg']));
  const npc = gallery.npcs[0]; npc.interact();
  assert.ok(npc.character.bubble.includes('액자를 누르면'));
  for (const frame of gallery.frames) assert.ok(findPath(gallery.map.w, gallery.map.h, (x, y) => gallery.isSolidTile(x, y), gallery.spawn, frame.stand));
});

test('편지가 많아져도 방명록의 두 사람 자리·돌길에는 꽃을 배치하지 않고, 꽃 자리는 넉넉하다', () => {
  const scene = createGuestbook(game());
  scene.setEntries(Array.from({ length: 50 }, (_, i) => ({ n: `하객${i}`, c: 0, m: '축하해요', t: i })));
  const flowers = scene.objects.filter((o) => o.id.startsWith('flower'));
  assert.ok(flowers.length >= 20, `꽃 ${flowers.length}송이`);
  for (const flower of flowers) {
    for (const host of scene.hosts) {
      const t = scene.tileOf(host.x, host.y);
      assert.ok(!(Math.abs(flower.tx - t.tx) <= 1 && flower.ty >= t.ty - 2 && flower.ty <= t.ty + 1), '두 사람 주변');
    }
    assert.notEqual(flower.tx, 5, '돌길');
    assert.ok(!scene.isSolidTile(flower.tx, flower.ty), '장식 위');
  }
  assert.ok(scene.objects.filter((o) => ['lavender', 'rose-bush-s', 'birdbath', 'tree-green'].includes(o.sprite)).length >= 6, '가장자리 식생');
});

test('방명록 정원: 글마다 꽃이 하나씩 피고, 그림 속 꽃띠(돌길 양옆)에는 피지 않으며, 목록은 내 글을 맨 위에 모은다', () => {
  const g = game();
  g.assets.maps = { guestbook: { width: 352, height: 448 } };
  g.profile = { nickname: '민지' };
  const scene = createGuestbook(g);
  const msgs = [
    { n: '민지', c: 1, m: '첫 글', t: 1 }, { n: '민지', c: 1, m: '둘째 글', t: 2 },
    { n: '하나', c: 2, m: '축하해요', t: 3 }, { n: '구경꾼', c: 3, m: '', t: 4 },
  ];
  scene.setEntries(msgs);
  const flowers = scene.objects.filter((o) => o.id.startsWith('flower'));
  assert.equal(flowers.length, 3, '같은 사람이 두 번 쓰면 꽃도 두 송이, 입장 기록은 꽃 없음');
  assert.ok(flowers.every((f) => f.tx !== 4 && f.tx !== 6 && f.tx !== 5), '돌길과 그 옆 꽃띠에는 피지 않는다');
  scene.setEntries(Array.from({ length: 40 }, (_, i) => ({ n: `하객${i}`, c: 0, m: '축하', t: i })));
  assert.ok(scene.objects.filter((o) => o.id.startsWith('flower')).length >= 25, '자리는 여전히 넉넉하다');
});
