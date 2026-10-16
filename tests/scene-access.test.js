import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHub } from '../js/world/hub.js';
import { createGuestbook } from '../js/world/guestbook.js';
import { createInfo } from '../js/world/info.js';
import { createGifts } from '../js/world/gifts.js';
import { findPath } from '../js/world/movement.js';

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
