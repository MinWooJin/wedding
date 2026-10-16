import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, tileAt, rectBlocked } from '../js/world/tilemap.js';

const map = parseMap([
  'HHHH',
  'HGPH',
  'HGGH',
  'HHHH',
]);

test('parseMap은 폭·높이·행을 돌려준다', () => {
  assert.equal(map.w, 4);
  assert.equal(map.h, 4);
  assert.equal(map.rows[1], 'HGPH');
});

test('행 길이가 다르면 에러', () => {
  assert.throws(() => parseMap(['GG', 'G']), /map row 1/);
});

test('tileAt은 맵 밖을 X로 취급', () => {
  assert.equal(tileAt(map, 1, 1), 'G');
  assert.equal(tileAt(map, 2, 1), 'P');
  assert.equal(tileAt(map, -1, 0), 'X');
  assert.equal(tileAt(map, 0, 99), 'X');
});

test('rectBlocked: 잔디 위 박스는 통과, 울타리에 걸치면 막힘', () => {
  const extra = new Set();
  assert.equal(rectBlocked(map, 20, 20, 10, 8, extra), false);
  assert.equal(rectBlocked(map, 10, 20, 10, 8, extra), true);
  assert.equal(rectBlocked(map, 20, 44, 10, 8, extra), true);
});

test('rectBlocked: 추가 solid 타일(오브젝트 발자국)도 막는다', () => {
  const extra = new Set(['2,2']);
  assert.equal(rectBlocked(map, 36, 36, 10, 8, extra), true);
  assert.equal(rectBlocked(map, 18, 36, 10, 8, extra), false);
});
