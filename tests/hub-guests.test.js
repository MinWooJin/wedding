import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guestPlacements, HUB_ROWS, GUEST_ZONE, createHub } from '../js/world/hub.js';
import { DEFAULT_CONFIG } from '../js/config.js';

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
  assert.equal(hub.guestMap.size, 0);
  assert.equal(hub.npcs.length, 3, '두 사람과 안내인만 남음');
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
