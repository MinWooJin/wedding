import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHub, CEREMONY, GUEST_ZONE, HUB_DOORS, HUB_SPAWN } from '../js/world/hub.js';
import { DEFAULT_CONFIG } from '../js/config.js';
import { assetFilename } from '../js/assets.js';
import { findPath } from '../js/world/movement.js';

const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
const objects = Object.fromEntries(manifest.objects.map((id) => {
  const png = readFileSync(new URL(`../assets/objects/${assetFilename(manifest, 'objects', id)}`, import.meta.url));
  return [id, { w: png.readUInt32BE(16), h: png.readUInt32BE(20) }];
}));
const make = () => createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects }, data: { messages: [] } });

test('두 사람은 단상 윗면에 가까이 서고 각각 따로 누를 수 있다', () => {
  const hub = make();
  const [groom, bride] = hub.hosts;
  const stage = hub.objects.find((o) => o.id === 'platform');
  assert.equal(bride.x - groom.x, 35);
  assert.equal(groom.y, bride.y);
  assert.ok(groom.y > stage.drawY + 15 && groom.y < stage.bottom - 8, '단상 표면 안쪽');
  assert.equal(hub.hitNpc(groom.x, groom.y - 24).character, groom);
  assert.equal(hub.hitNpc(bride.x, bride.y - 24).character, bride);
});

test('버진로드는 단상 밑에서 끝까지 이어지고 양쪽 꽃장식은 이동을 막지 않는다', () => {
  const hub = make();
  const strips = hub.objects.filter((o) => o.sprite === 'aisle-runner');
  assert.equal(strips.length, CEREMONY.aisleEnd - CEREMONY.aisleStart + 1);
  assert.equal(strips[0].drawY, 160);
  assert.equal(strips.at(-1).bottom, hub.pixelH - 32);
  const stage = hub.objects.find((o) => o.id === 'platform');
  assert.ok(hub.objects.indexOf(strips[0]) < hub.objects.indexOf(stage), '단상을 위에 합성');
  for (let i = 1; i < strips.length; i++) assert.equal(strips[i - 1].bottom, strips[i].drawY);
  const flowers = hub.objects.filter((o) => o.sprite.startsWith('aisle-flower-'));
  assert.equal(flowers.length, 2 * (Math.floor((CEREMONY.flowerEnd - CEREMONY.flowerStart) / CEREMONY.flowerStep) + 1));
  assert.ok(flowers.every((o) => o.floor && !o.solid));
  assert.ok(flowers.every((o) => o.ty < HUB_DOORS.guestbook.back.ty), '교차로는 꽃장식 밖');
  assert.ok(flowers.every((o) => o.bottom <= HUB_DOORS.guestbook.back.ty * 32), '큰 꽃도 교차로에 걸치지 않는다');
  const leftFlowers = flowers.filter((o) => o.sprite === 'aisle-flower-left');
  assert.equal(leftFlowers.length, 6, '한쪽에 큰 꽃장식 여섯 개');
  assert.ok(flowers.every((o) => o.spr.w === 32 && o.spr.h === 48), '선택된 새 꽃 PNG 규격');
  const left = leftFlowers[0], right = flowers.find((o) => o.sprite === 'aisle-flower-right');
  assert.equal(right.tx * 32 - (left.tx * 32 + left.spr.w), 32, '꽃 사이 중앙 한 칸 유지');
  for (let i = 1; i < leftFlowers.length; i++) {
    assert.ok(leftFlowers[i].drawY > leftFlowers[i - 1].bottom, '큰 꽃송이를 포개지 않고 간격을 둔다');
  }
  for (let ty = 6; ty <= CEREMONY.aisleEnd; ty++) {
    assert.equal(hub.isSolidTile(5, ty), false, `중앙 통로 ${ty}`);
  }
  for (const door of Object.values(HUB_DOORS)) {
    const path = findPath(hub.map.w, hub.map.h, (x, y) => hub.isSolidTile(x, y), HUB_SPAWN, door.back);
    assert.ok(path.length > 0, `${door.label} 접근 가능`);
  }
});

test('실제 하객과 분위기용 하객은 버진로드를 비우고 양옆에만 서고 배회한다', () => {
  const hub = make();
  for (const npc of hub.guestMap.values()) {
    assert.ok(![4, 5, 6].includes(npc.wander.home.tx));
    for (let ty = GUEST_ZONE.rowMin; ty <= GUEST_ZONE.rowMax; ty++) {
      for (const tx of [4, 5, 6]) assert.equal(npc.wander.allow(tx, ty), false);
    }
  }
  assert.equal(hub.guestMap.size, 10, '클로드의 분위기용 하객 유지');
});

test('새 꽃/버진로드 PNG가 없으면 기존 모래길로 표시하고 기능을 유지한다', () => {
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: [] } });
  assert.equal(hub.objects.some((o) => o.sprite.startsWith('aisle-')), false);
  assert.equal(hub.entrances.length, 4);
  assert.equal(hub.guestMap.size, 10);
});

test('팔짱 커플이 있으면 단상에는 한 쌍만 그리고 하객 갱신 후에도 안내인을 보존한다', () => {
  const sprite = { w: 96, h: 72 };
  const couple = { down: [sprite], up: [sprite], left: [sprite], right: [sprite] };
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects, characters: { couple } }, data: { messages: [] } });
  assert.equal(hub.hosts.length, 1);
  assert.equal(hub.hosts[0].sprite(), sprite);
  assert.equal(hub.hosts[0].x, 176);
  assert.equal(hub.baseNpcs.length, 2, '커플 한 쌍과 안내인');
  const guide = hub.guide;
  hub.setGuests([{ n: '손님', c: 0, m: '축하해요', t: 1 }]);
  assert.equal(hub.guide, guide);
  assert.ok(hub.npcs.some((n) => n.character === guide));
  hub.baseNpcs[0].interact();
  assert.ok(hub.hosts[0].bubble);
});
