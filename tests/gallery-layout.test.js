import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryLayout } from '../js/world/gallery-layout.js';

test('사진 0장: 최소 복도, 액자 없음', () => {
  const L = galleryLayout(0);
  assert.equal(L.rows.length, 6);
  assert.equal(L.rows[0], 'KKKKKKKKKKK');
  assert.equal(L.rows[1], 'KDDDDDDDDDK');
  assert.equal(L.rows.at(-1), 'KKKKKDKKKKK');
  assert.deepEqual(L.frames, []);
  assert.deepEqual(L.exit, { tx: 5, ty: 5 });
  assert.deepEqual(L.spawn, { tx: 5, ty: 4 });
});

test('사진 5장: 2장씩 3줄, 왼쪽은 tx1/stand tx2, 오른쪽은 tx9/stand tx8', () => {
  const L = galleryLayout(5);
  assert.equal(L.rows.length, 10);
  assert.equal(L.frames.length, 5);
  assert.deepEqual(L.frames[0], { index: 0, tx: 1, ty: 2, stand: { tx: 2, ty: 2 } });
  assert.deepEqual(L.frames[1], { index: 1, tx: 9, ty: 2, stand: { tx: 8, ty: 2 } });
  assert.deepEqual(L.frames[4], { index: 4, tx: 1, ty: 6, stand: { tx: 2, ty: 6 } });
  assert.deepEqual(L.exit, { tx: 5, ty: 9 });
});
