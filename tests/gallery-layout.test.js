import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryLayout } from '../js/world/gallery-layout.js';

test('사진 0장: 최소 복도, 액자 없음', () => {
  const L = galleryLayout(0);
  assert.equal(L.rows.length, 12, '이젤·두 사람·입구가 겹치지 않는 높이');
  assert.equal(L.rows[0], 'KKKKKKKKKKK');
  assert.equal(L.rows[1], 'KDDDDDDDDDK');
  assert.equal(L.rows.at(-1), 'KKKKKDKKKKK');
  assert.deepEqual(L.frames, []);
  assert.deepEqual(L.exit, { tx: 5, ty: 11 });
  assert.deepEqual(L.spawn, { tx: 5, ty: 10 });
  assert.equal(L.hostRow, 7);
});

test('사진 5장: 96px 액자 5장: 4행 간격, 가운데 세 칸 통로 유지', () => {
  const L = galleryLayout(5);
  assert.equal(L.rows.length, 15);
  assert.equal(L.frames.length, 5);
  assert.deepEqual(L.frames[0], { index: 0, tx: 1, ty: 1, stand: { tx: 4, ty: 3 } });
  assert.deepEqual(L.frames[1], { index: 1, tx: 7, ty: 1, stand: { tx: 6, ty: 3 } });
  assert.deepEqual(L.frames[4], { index: 4, tx: 1, ty: 9, stand: { tx: 4, ty: 11 } });
  assert.deepEqual(L.exit, { tx: 5, ty: 14 });
  assert.equal(L.hostRow, 6, '방 가운데에 가장 가까운, 액자 앞 설 자리(3·7·11행)가 아닌 줄');
  assert.ok(L.frames.every((f) => f.stand.ty !== L.hostRow));
});
