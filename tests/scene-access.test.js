import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHub } from '../js/world/hub.js';
import { createGuestbook } from '../js/world/guestbook.js';
import { createInfo } from '../js/world/info.js';
import { createGifts } from '../js/world/gifts.js';
import { findPath } from '../js/world/movement.js';

test('안내소는 원목 바닥으로 통일하고 야외 경계의 이동 제한은 유지한다', () => {
  const game = { config: JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url))), assets: {}, profile: { nickname: '테스트' }, data: { messages: [] } };
  const info = createInfo(game);
  assert.equal(info.map.rows.some((row) => row.includes('L')), false, '중앙 분홍 카펫 제거');
  assert.equal(info.groundTile, null, '실내 밖을 잔디로 채우지 않음');
  for (const create of [createHub, createGuestbook]) {
    const scene = create(game);
    assert.equal(scene.groundTile, 'G');
    assert.equal(scene.isSolidTile(0, 0), true, '화면 경계는 자연스러워도 충돌은 유지');
  }
});

test('실제 PNG 크기 기준으로 모든 상호작용 오브젝트와 입구까지 길이 열린다', () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
  const objects = Object.fromEntries(manifest.objects.map((name) => {
    const png = readFileSync(new URL(`../assets/objects/${name}.png`, import.meta.url));
    return [name, { w: png.readUInt32BE(16), h: png.readUInt32BE(20) }];
  }));
  const game = { config: JSON.parse(readFileSync(new URL('../data/config.json', import.meta.url))), assets: { objects }, profile: { nickname: '테스트' }, data: { messages: [] } };
  for (const create of [createHub, createGuestbook, createInfo, createGifts]) {
    const scene = create(game);
    const pathTo = (target) => findPath(scene.map.w, scene.map.h, (x, y) => scene.isSolidTile(x, y), scene.spawn, target);
    for (const o of scene.objects.filter((o) => o.interact)) {
      const target = scene.standTileFor(o.tx, o.ty + Math.ceil(o.spr.h / 32) - 1, Math.ceil(o.spr.w / 32));
      assert.ok(pathTo(target), `${scene.id}/${o.id} 접근 불가`);
    }
    for (const entrance of scene.entrances) assert.ok(pathTo(entrance), `${scene.id} 출입구 접근 불가`);
  }
});
