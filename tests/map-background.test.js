import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { composeMap, MAP_PIECES, assetFilename } from '../js/assets.js';
import { createHub, CEREMONY } from '../js/world/hub.js';
import { createGuestbook } from '../js/world/guestbook.js';
import { DEFAULT_CONFIG } from '../js/config.js';
import { findPath } from '../js/world/movement.js';

const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
const png = (dir, name) => {
  const buf = readFileSync(new URL(`../assets/${dir}/${assetFilename(manifest, dir, name)}`, import.meta.url));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};
const objects = Object.fromEntries(manifest.objects.map((id) => { const d = png('objects', id); return [id, { w: d.width, h: d.height }]; }));

test('광장 배경은 세 조각을 0/256/544에 이어 붙여 352×864 한 장이 된다', () => {
  const images = Object.fromEntries(MAP_PIECES.hub.map((p) => [p.id, png('maps', p.id)]));
  const drawn = [];
  const create = (w, h) => ({ width: w, height: h, getContext: () => ({ drawImage: (img, x, y) => drawn.push([img.height, x, y]) }) });
  const canvas = composeMap(images, MAP_PIECES.hub, create);
  assert.deepEqual([canvas.width, canvas.height], [352, 864]);
  assert.deepEqual(drawn, [[256, 0, 0], [288, 0, 256], [320, 0, 544]]);
  assert.equal(composeMap({ 'hub-top': images['hub-top'] }, MAP_PIECES.hub, create), null, '조각이 빠지면 타일 그리기로 폴백');
  const gb = png('maps', 'guestbook-bg');
  assert.equal(composeMap({ 'guestbook-bg': gb }, MAP_PIECES.guestbook, create), gb, '한 장짜리는 그대로');
  assert.deepEqual([gb.width, gb.height], [352, 448]);
});

test('그려진 광장의 리셉션을 그대로 통과해 네 문까지 이동하고 두 사람은 단상에 선다', () => {
  const hubBg = { width: 352, height: 864 };
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects, maps: { hub: hubBg } }, data: { messages: [] } });
  assert.equal(hub.bgImage, hubBg);
  const sprites = new Set(hub.objects.map((o) => o.sprite));
  assert.deepEqual([...sprites].sort(), ['door', 'party-table', 'ribbon-lantern', 'sign', 'wedding-cake', 'welcome-board']);
  assert.ok(hub.hosts.every((c) => c.y === CEREMONY.feetY && c.y >= 128 + 15 && c.y <= 164), '발이 단상 윗면(y128~164) 안');
  const leftSign = hub.objects.find((o) => o.id === 'sign-guestbook');
  const rightSign = hub.objects.find((o) => o.id === 'sign-gallery');
  const guideBounds = hub.guide.drawPos();
  assert.ok(guideBounds.x > leftSign.tx * 32 + leftSign.spr.w, '안내인은 왼쪽 표지판 바깥');
  assert.ok(guideBounds.x + guideBounds.w < rightSign.tx * 32, '오른쪽 표지판도 가리지 않는다');
  assert.ok(hub.guide.y + 2 > leftSign.drawY, '이름은 표지판 캡션 아래에 표시');
  assert.equal(hub.npcs.find((n) => n.character === hub.guide).solid, false, '안내인이 중앙 통행을 막지 않는다');
  for (const n of hub.guestMap.values()) {
    const { ty, tx } = n.wander.home;
    assert.ok(ty >= 6, `하객은 단상·화분 아래(${tx},${ty})`);
  }
  for (const e of hub.entrances) assert.ok(findPath(hub.map.w, hub.map.h, (x, y) => hub.isSolidTile(x, y), hub.spawn, e), '문 접근');
  for (const prop of hub.objects.filter((o) => ['party-table', 'ribbon-lantern', 'wedding-cake'].includes(o.sprite))) {
    assert.equal(prop.solid, false, '리셉션 소품은 위치를 유지하고 통행을 허용한다');
    const foot = prop.ty + Math.ceil(prop.spr.h / 32) - 1;
    assert.equal(hub.isSolidTile(prop.tx, foot), false);
  }
  // 출입구까지 우회 경로가 있는 것만으로는 부족하다. 중앙을 직진할 수 있어야 한다.
  for (let row = 18; row <= 25; row++) {
    assert.equal(hub.isSolidTile(5, row), false, `중앙 통로 ${row}행`);
    assert.equal(hub.blockedStatic()(176, (row + 1) * 32), false, '실제 캐릭터 충돌 박스도 통과');
  }
  const crowd = [...hub.guestMap.values()];
  assert.equal(crowd.length, 20);
  for (let i = 0; i < 2400 && crowd.some((n) => n.arrival); i++) {
    hub.updateArrivals(.05, false);
    for (const n of crowd) n.character.update(.05, hub.blockedStatic());
  }
  assert.ok(crowd.every((n) => !n.arrival), '리셉션이 있어도 스무 명 모두 자기 자리에 도착한다');
  const plain = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects }, data: { messages: [] } });
  assert.ok(plain.objects.some((o) => o.sprite === 'arch'), '배경이 없으면 예전처럼 장식 오브젝트');
});

test('배경 그림이 있으면 방명록 정원은 장식 오브젝트를 올리지 않고 꽃은 그림의 식생 위를 피한다', () => {
  const bg = { width: 352, height: 448 };
  const scene = createGuestbook({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects, maps: { guestbook: bg } }, data: { messages: [] } });
  assert.equal(scene.bgImage, bg);
  assert.deepEqual([...new Set(scene.objects.map((o) => o.sprite))].sort(), ['door', 'wedding-mailbox']);
  assert.equal(scene.npcs.length, 2, '두 사람은 그대로');
  scene.setEntries(Array.from({ length: 60 }, (_, i) => ({ n: `하객${i}`, c: 0, m: '축하해요', t: i })));
  const flowers = scene.objects.filter((o) => o.id.startsWith('flower'));
  assert.ok(flowers.length >= 25, `꽃 ${flowers.length}송이`);
  for (const f of flowers) {
    assert.ok(f.tx >= 1 && f.tx <= 9 && f.tx !== 5, `바깥 열·돌길 밖 (${f.tx},${f.ty})`);
    assert.ok(!(f.ty <= 3 && (f.tx <= 2 || f.tx >= 8)), '위쪽 모서리 나무·덤불 밖');
  }
});
