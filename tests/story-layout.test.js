import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyLayout } from '../js/world/story-layout.js';

test('이정표 4개: 위에서 아래로 좌우 번갈아, 끝에 벤치, 출구는 맨 아래', () => {
  const L = storyLayout(4);
  assert.equal(L.rows[0], 'HHHHHHHHHHH');
  assert.equal(L.rows.at(-1), 'HHHHHNHHHHH');
  assert.equal(L.rows.length, 2 + 4 * 2 + 4);
  assert.deepEqual(L.signs.map((s) => [s.tx, s.ty]), [[3, 2], [7, 4], [3, 6], [7, 8]]);
  assert.deepEqual(L.bench, { tx: 6, ty: L.rows.length - 4 });
  assert.deepEqual(L.spawn, { tx: 5, ty: 1 });
  assert.deepEqual(L.exit, { tx: 5, ty: L.rows.length - 1 });
  for (const r of L.rows.slice(1, -1)) assert.equal(r[5], 'N', '가운데는 돌길');
});

test('이정표 0개도 동작', () => {
  const L = storyLayout(0);
  assert.equal(L.signs.length, 0);
  assert.equal(L.rows.length, 6);
});
