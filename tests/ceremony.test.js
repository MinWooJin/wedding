import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHub, CEREMONY, GUEST_ZONE, HUB_DOORS, HUB_SPAWN, SIDE_COLS, AISLE_OPEN_FROM, ARRIVAL, CHATTER, DROP_IN } from '../js/world/hub.js';
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

test('버진로드는 단상 밑에서 끝까지 이어지고 양쪽 꽃띠는 끊김 없이 붙어 이동을 막지 않는다', () => {
  const hub = make();
  const strips = hub.objects.filter((o) => o.sprite === 'aisle-runner');
  assert.equal(strips.length, CEREMONY.aisleEnd - CEREMONY.aisleStart + 1);
  assert.equal(strips[0].drawY, 160);
  assert.equal(strips[strips.length - 1].bottom, hub.pixelH - 32);
  const stage = hub.objects.find((o) => o.id === 'platform');
  assert.ok(hub.objects.indexOf(strips[0]) < hub.objects.indexOf(stage), '단상을 위에 합성');
  for (let i = 1; i < strips.length; i++) assert.equal(strips[i - 1].bottom, strips[i].drawY);
  assert.equal(hub.objects.some((o) => o.sprite.startsWith('aisle-flower-')), false, '같은 간격 꽃다발은 꽃띠로 대체');
  for (const side of ['left', 'right']) {
    const edge = hub.objects.filter((o) => o.sprite === `aisle-edge-${side}`);
    assert.equal(edge.length, CEREMONY.edgeEnd - CEREMONY.edgeStart + 1);
    assert.ok(edge.every((o) => o.floor && !o.solid));
    for (let i = 1; i < edge.length; i++) assert.equal(edge[i - 1].bottom, edge[i].drawY, '위아래 끊김 없음');
    assert.ok(edge[edge.length - 1].bottom <= HUB_DOORS.guestbook.back.ty * 32, '교차로에 걸치지 않는다');
  }
  // 꽃띠 그림(x10..22)이 깔개(128..224) 바로 바깥에 닿는다.
  const left = hub.objects.find((o) => o.sprite === 'aisle-edge-left'), right = hub.objects.find((o) => o.sprite === 'aisle-edge-right');
  assert.equal(left.tx * 32 + 22, strips[0].tx * 32);
  assert.equal(right.tx * 32 + 10, strips[0].tx * 32 + strips[0].spr.w);
  for (let ty = 6; ty <= CEREMONY.aisleEnd; ty++) {
    assert.equal(hub.isSolidTile(5, ty), false, `중앙 통로 ${ty}`);
  }
  const meadow = hub.objects.filter((o) => o.sprite === 'meadow-sprig');
  assert.ok(meadow.length >= 6 && meadow.every((o) => o.floor && !o.solid && (o.tx < 3 || o.tx > 7)), '작은 들꽃은 바깥 잔디의 비충돌 바닥');
  assert.equal(hub.objects.some((o) => o.sprite === 'party-table'), false, '리셉션 테이블은 치워 하객 자리를 넓힌다');
  const cake = hub.objects.find((o) => o.sprite === 'wedding-cake');
  assert.ok(cake.ty >= HUB_DOORS.guestbook.door.ty && !cake.solid, '케이크는 아래 입구 광장의 지나갈 수 있는 장식');
  for (const door of Object.values(HUB_DOORS)) {
    const path = findPath(hub.map.w, hub.map.h, (x, y) => hub.isSolidTile(x, y), HUB_SPAWN, door.back);
    assert.ok(path.length > 0, `${door.label} 접근 가능`);
  }
});

test('가장자리 장식: 화분은 단상 양옆, 라벤더·장미·버드배스·리본 조명은 바깥 열에 불규칙하게', () => {
  const hub = make();
  const stage = hub.objects.find((o) => o.id === 'platform');
  const planters = hub.objects.filter((o) => o.sprite === 'planter-box');
  assert.equal(planters.length, 2);
  assert.ok(planters[0].tx * 32 + planters[0].spr.w <= stage.tx * 32 && planters[1].tx * 32 >= stage.tx * 32 + stage.spr.w, '단상과 겹치지 않는 양옆');
  const decor = ['lavender', 'rose-bush-s', 'birdbath', 'ribbon-lantern'];
  for (const id of decor) {
    const list = hub.objects.filter((o) => o.sprite === id);
    assert.ok(list.length >= 1, id);
    assert.ok(list.every((o) => o.tx === 0 || o.tx * 32 + o.spr.w === hub.pixelW), `${id}는 바깥 열에 붙는다`);
  }
  const left = hub.objects.filter((o) => o.tx === 0 && decor.includes(o.sprite)).map((o) => o.sprite);
  const right = hub.objects.filter((o) => o.tx > 0 && decor.includes(o.sprite)).map((o) => o.sprite);
  assert.notDeepEqual(left, right, '좌우 대칭이 아니라 불규칙');
});

test('하객은 길 양옆에서 시작하고, 단상 앞 몇 줄을 뺀 버진로드로도 건너가 배회한다', () => {
  const hub = make();
  const homes = [...hub.guestMap.values()].map((n) => n.wander.home);
  assert.equal(hub.guestMap.size, 20, '분위기용 하객 20명');
  assert.ok(homes.every((t) => SIDE_COLS.includes(t.tx)), '20명은 모두 길 양옆에서 시작');
  for (const n of hub.guestMap.values()) {
    for (let ty = GUEST_ZONE.rowMin; ty < AISLE_OPEN_FROM; ty++) for (const tx of [4, 5, 6]) assert.equal(n.wander.allow(tx, ty), false, '단상 앞 길');
    assert.equal(n.wander.allow(5, 12), true, '길 뒤쪽은 건너갈 수 있다');
    assert.equal(n.character.hideTag, true, '분위기용 하객은 이름표 없음');
    assert.equal(n.character.speed, 48, '하객은 천천히 걷는다');
    assert.ok(Math.abs(n.wander.jitter.x) <= 7 && Math.abs(n.wander.jitter.y) <= 3, '칸 안에서 조금씩 흩어진다');
  }
});

test('새 꽃/버진로드 PNG가 없으면 기존 모래길로 표시하고 기능을 유지한다', () => {
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: [] } });
  assert.equal(hub.objects.some((o) => o.sprite.startsWith('aisle-')), false);
  assert.equal(hub.entrances.length, 4);
  assert.equal(hub.guestMap.size, 20);
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

test('처음 열면 하객이 이미 자리에 흩어져 있고, 새로 생긴 하객만 아래 교차로에서 반투명하게 나타나 걸어 들어온다', () => {
  const hub = make();
  const guests = [...hub.guestMap.values()];
  assert.ok(guests.every((n) => !n.character.hidden && !n.arrival && (n.character.alpha ?? 1) === 1), '첫 로딩은 입장 행렬 없이 바로 보인다');
  hub.setGuests([{ t: 1, n: '늦은손님', c: 2, m: '축하해요' }, { t: 2, n: '더늦은손님', c: 5, m: '축하' }]);
  const late = hub.guestMap.get('늦은손님:2'), later = hub.guestMap.get('더늦은손님:5');
  assert.ok(late.arrival && late.character.hidden, '새 하객은 숨은 채 대기');
  assert.ok(guests.every((n) => !n.arrival), '기존 하객은 그대로');
  const c0 = late.character;
  assert.notEqual(hub.hitNpc(c0.x, c0.y - 20)?.character, c0, '숨은 하객은 누를 수 없다');
  const home = { x: c0.x, y: c0.y };
  hub.updateArrivals(0.01, false);
  assert.equal(c0.hidden, false);
  assert.ok(c0.y > home.y, '아래 교차로에서 출발');
  assert.ok(c0.alpha < 1, '반투명으로 시작');
  assert.equal(later.character.hidden, true, '다음 하객은 간격을 두고 출발');
  const arriving = [late, later];
  for (let i = 0; i < 4000 && arriving.some((n) => n.arrival); i++) {
    hub.updateArrivals(0.05, false);
    for (const n of arriving) n.character.update(0.05, () => false);
  }
  assert.ok(arriving.every((n) => !n.arrival && !n.character.hidden && n.character.alpha === 1), '모두 도착');
  assert.deepEqual({ x: c0.x, y: c0.y }, home, '자기 자리(흩뜨린 위치)에 선다');
  assert.equal(c0.speed, 48, '도착 후에는 천천히 배회');
});

test('움직임 줄이기 설정이면 새 하객도 걷지 않고 제자리에 나타난다', () => {
  const hub = make();
  hub.setGuests([{ t: 1, n: '늦은손님', c: 2, m: '축하해요' }]);
  const n = hub.guestMap.get('늦은손님:2');
  const home = { x: n.character.x, y: n.character.y };
  hub.updateArrivals(0.01, true);
  assert.equal(n.arrival, null);
  assert.deepEqual({ x: n.character.x, y: n.character.y, alpha: n.character.alpha }, { ...home, alpha: 1 });
});

test('가끔 한 명씩: 분위기용 하객이 화면 밖에서 사라졌다가 입구로 다시 걸어 들어와 원래 자리에 선다', () => {
  const hub = make();
  const extras = [...hub.guestMap.values()].filter((n) => n.entry.extra !== undefined);
  const before = hub.guestMap.size;
  const game = { cam: { x: 0, y: 0 }, cameraView: { height: 300 } }; // 위쪽 300px만 보이는 화면
  hub.updateDropIns(DROP_IN.first + 0.01, game);
  const re = extras.filter((n) => n.arrival);
  assert.equal(re.length, 1, '한 명만');
  assert.ok(re[0].character.y >= 300, '화면 밖에 있던 사람을 고른다');
  assert.ok(re[0].character.hidden);
  const j = re[0].wander.jitter, h = re[0].wander.home;
  const expected = { x: h.tx * 32 + 16 + j.x, y: h.ty * 32 + 28 + j.y };
  for (let i = 0; i < 4000 && re[0].arrival; i++) { hub.updateArrivals(0.05, false); re[0].character.update(0.05, () => false); }
  assert.deepEqual({ x: re[0].character.x, y: re[0].character.y }, expected, '배회 위치가 아니라 원래 자리로 돌아온다');
  assert.equal(hub.guestMap.size, before, '군중 수는 늘지 않는다');
  assert.ok(hub.dropInT >= DROP_IN.min && hub.dropInT <= DROP_IN.max, '다음은 60~120초 뒤');
});

test('자동 말풍선: 동시에 두 개까지, 실제 하객은 자기 메시지를 줄여 말한다', () => {
  const message = '두 사람 정말 축하해! 행복하게 잘 살아야 해, 꼭 꼭 꼭이야';
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects }, data: { messages: [{ t: 1, n: '친구', c: 2, m: message }] } });
  hub.updateArrivals(100, true);
  const random = Math.random;
  try {
    Math.random = () => 0.5;
    for (let i = 0; i < 10; i++) hub.updateChatter(CHATTER.max + 0.01, null);
    assert.equal(hub.npcs.filter((n) => n.character.bubble).length, CHATTER.maxBubbles);
    for (const n of hub.npcs) n.character.bubble = null;
    const friend = hub.guestMap.get('친구:2');
    for (const n of hub.guestMap.values()) if (n !== friend) n.arrival = { delay: 1 }; // 다른 하객은 입장 중인 것으로 둔다
    Math.random = () => 0.99; // 두 사람 인사 확률(15%)을 넘는 값
    hub.updateChatter(CHATTER.max + 0.01, null);
    assert.equal(friend.character.bubble, `${[...message].slice(0, 30).join('')}…`);
  } finally { Math.random = random; }
});
