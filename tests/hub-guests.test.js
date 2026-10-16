import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guestPlacements, HUB_ROWS } from '../js/world/hub.js';

test('guestPlacements: 최대 30명, 제외 타일 회피, 잔디 위, 중복 없음, 결정적', () => {
  const entries = Array.from({ length: 40 }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: `축하 ${i}` }));
  const reserved = new Set(['4,3', '6,3', '5,12']);
  const a = guestPlacements(entries, reserved);
  assert.equal(a.length, 30);
  assert.deepEqual(a, guestPlacements(entries, reserved));
  for (const g of a) {
    assert.ok(!reserved.has(`${g.tx},${g.ty}`));
    assert.ok('GW'.includes(HUB_ROWS[g.ty][g.tx]), '잔디/꽃잔디 위');
    assert.ok(g.entry.n.startsWith('손님'));
  }
  assert.equal(new Set(a.map((g) => `${g.tx},${g.ty}`)).size, 30, '타일 중복 없음');
});

test('guestPlacements: 항목이 적으면 그 수만큼', () => {
  assert.equal(guestPlacements([{ t: 1, n: 'a', c: 0, m: 'm' }], new Set()).length, 1);
  assert.deepEqual(guestPlacements([], new Set()), []);
});
