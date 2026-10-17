import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guestPlacements, HUB_ROWS, HUB_DOORS, GUEST_ZONE, createHub, uniqueGuests, MAX_GUESTS } from '../js/world/hub.js';
import { MIN_CROWD, withExtras } from '../js/world/hub.js';
import { DEFAULT_CONFIG } from '../js/config.js';
import { assetFilename } from '../js/assets.js';

test('여러 글과 방문 기록이 섞여도 한 하객을 한 번만 업데이트한다', () => {
  const entries = [
    { n: '하객', c: 1, m: '첫 글', t: 1 },
    { n: '하객', c: 1, m: '최신 글', t: 3 },
    { n: '하객', c: 1, m: '', t: 4 },
  ];
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: entries } });
  for (let i = 0; i < 3; i++) {
    hub.setGuests(entries);
    const real = [...hub.guestMap.keys()].filter((k) => !k.startsWith('extra:'));
    assert.equal(real.length, 1, '실제 하객은 한 명');
    assert.equal(hub.npcs.length - hub.baseNpcs.length, MIN_CROWD, '부족분은 분위기용 하객으로 채움');
    assert.equal(hub.guestMap.get('하객:1').entry.m, '최신 글');
    assert.equal(new Set(hub.npcs).size, hub.npcs.length);
  }
  assert.equal(entries.length, 3, '원본 메시지 목록은 그대로 유지');
  assert.equal(uniqueGuests(entries).length, 1);
});

test('보존한 하객과 신규 하객을 합쳐도 전체 상한을 넘지 않는다', () => {
  const entries = Array.from({ length: 100 }, (_, i) => ({ t: i, n: `추가하객${i}`, c: i % 10, m: '축하' }));
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: entries.slice(0, 20) } });
  for (let i = 20; i <= 100; i += 10) {
    hub.setGuests(entries.slice(0, i));
    assert.ok(hub.npcs.length - hub.baseNpcs.length <= MAX_GUESTS);
  }
});

test('반복 갱신과 새 하객 추가 시 기존 캐릭터·배회 상태를 보존한다', () => {
  const entries = Array.from({ length: 5 }, (_, i) => ({ t: i, n: `손님${i}`, c: i, m: '축하' }));
  const game = { config: DEFAULT_CONFIG, profile: { nickname: '나의 이름' }, assets: {}, data: { messages: entries } };
  const hub = createHub(game);
  const guest = hub.guestMap.get('손님0:0');
  guest.character.x += 2; guest.wander.timer = 3.5;
  hub.setGuests([{ t: 8, n: '새 하객', c: 8, m: '안녕하세요' }, ...entries]);
  assert.equal(hub.guestMap.get('손님0:0'), guest);
  assert.equal(guest.wander.timer, 3.5);
  hub.setGuests([]);
  assert.equal([...hub.guestMap.keys()].filter((k) => !k.startsWith('extra:')).length, 0, '실제 하객은 모두 사라짐');
  assert.equal(hub.guestMap.size, MIN_CROWD, '대신 하객 10명이 돌아다님');
  assert.ok([...hub.guestMap.values()].every((g) => g.character.name === '하객'));
});

test('실제 PNG 크기로 광장에 하객이 충분히 모인다(30명 중 20명 이상)', () => {
  // 코드 대체 그림은 실제 PNG(나무 96×128 등)보다 작아 수용 인원을 부풀린다. 반드시 실제 크기로 잰다.
  const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
  const objects = Object.fromEntries(manifest.objects.map((name) => {
    const png = readFileSync(new URL(`../assets/objects/${assetFilename(manifest, 'objects', name)}`, import.meta.url));
    return [name, { w: png.readUInt32BE(16), h: png.readUInt32BE(20) }];
  }));
  const entries = Array.from({ length: 30 }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: '축하' }));
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects }, data: { messages: entries } });
  assert.ok(hub.guestMap.size >= 20, `배치된 하객 ${hub.guestMap.size}명`);
  const trees = hub.objects.filter((o) => o.sprite === 'tree');
  assert.equal(trees[0].tx * 32, 32);
  assert.equal(trees[1].tx * 32 + trees[1].spr.w, 320, '새 나무도 좌우 여백이 대칭');
});

test('문 배치: 방명록 왼쪽 위, 갤러리 오른쪽 위, 마음 전하기 왼쪽 아래, 예식 안내소 오른쪽 아래', () => {
  assert.equal(HUB_DOORS.story, undefined);
  const { guestbook, gallery, gifts, info } = HUB_DOORS;
  assert.equal(guestbook.door.tx, 1); assert.equal(gallery.door.tx, 9); assert.equal(gifts.door.tx, 1); assert.equal(info.door.tx, 9);
  assert.equal(guestbook.door.ty, gallery.door.ty); assert.equal(gifts.door.ty, info.door.ty);
  assert.equal(gifts.door.ty, guestbook.door.ty + 4, '두 번째 줄');
});

test('guestPlacements: 제외 타일 회피, 잔디 위, 서로 인접하지 않음, 결정적', () => {
  const entries = Array.from({ length: 40 }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: `축하 ${i}` }));
  const reserved = new Set(['3,3', '7,3', '5,20']);
  const a = guestPlacements(entries, reserved);
  assert.ok(a.length >= 10 && a.length <= 30, `배치 수 ${a.length}`);
  assert.deepEqual(a, guestPlacements(entries, reserved));
  for (const g of a) {
    assert.ok(!reserved.has(`${g.tx},${g.ty}`));
    assert.ok('GWEJUN'.includes(HUB_ROWS[g.ty][g.tx]), '잔디 또는 돌길 위');
    assert.ok(GUEST_ZONE.cols.includes(g.tx) && g.ty >= GUEST_ZONE.rowMin && g.ty <= GUEST_ZONE.rowMax, '버진로드 양옆 구역 안');
    assert.ok(g.entry.n.startsWith('손님'));
  }
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    assert.ok(a[i].tx !== a[j].tx || Math.abs(a[i].ty - a[j].ty) > 1, '같은 열 바로 위아래 금지');
  }
});

test('guestPlacements: 항목이 적으면 그 수만큼', () => {
  assert.equal(guestPlacements([{ t: 1, n: 'a', c: 0, m: 'm' }], new Set()).length, 1);
  assert.deepEqual(guestPlacements([], new Set()), []);
});

test('withExtras: 실제 하객이 10명보다 적으면 "하객"으로 채우고, 많으면 그대로', () => {
  const real = (n) => Array.from({ length: n }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: '축하' }));
  assert.equal(withExtras(real(0)).length, 10);
  assert.equal(withExtras(real(4)).filter((e) => e.n === '하객').length, 6);
  assert.equal(withExtras(real(12)).length, 12);
  assert.ok(withExtras(real(0)).every((e) => e.m === '' && e.extra !== undefined), '메시지 없음 → 축하 개수에 안 잡힘');
});
