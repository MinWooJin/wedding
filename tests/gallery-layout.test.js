import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryLayout } from '../js/world/gallery-layout.js';

test('사진 0장: 최소 복도, 액자 없음', () => {
  const L = galleryLayout(0);
  assert.equal(L.rows.length, 12, '이젤·두 사람·입구가 겹치지 않는 높이');
  assert.equal(L.rows[0], 'KKKKKKKKKKK');
  assert.equal(L.rows[1], 'KDDDDDDDDDK');
  assert.equal(L.rows.at(-1), 'KKKKKKKKKKK');
  assert.deepEqual(L.frames, []);
  assert.deepEqual(L.exit, { tx: 5, ty: 11 });
  assert.deepEqual(L.spawn, { tx: 5, ty: 10 });
  assert.equal(L.hostRow, 7);
});

test('사진 5장: 세로 액자(96×112) 5장: 5행 간격, 가운데 세 칸 통로 유지', () => {
  const L = galleryLayout(5);
  assert.equal(L.rows.length, 18);
  assert.equal(L.frames.length, 5);
  assert.deepEqual(L.frames[0], { index: 0, tx: 1, ty: 1, stand: { tx: 4, ty: 4 } });
  assert.deepEqual(L.frames[1], { index: 1, tx: 7, ty: 1, stand: { tx: 6, ty: 4 } });
  assert.deepEqual(L.frames[4], { index: 4, tx: 1, ty: 11, stand: { tx: 4, ty: 14 } });
  assert.deepEqual(L.exit, { tx: 5, ty: 17 });
  assert.equal(L.hostRow, 8, '방 가운데에 가장 가까운, 액자 앞 설 자리(4·9·14행)가 아닌 줄');
  assert.ok(L.frames.every((f) => f.stand.ty !== L.hostRow));
});

test('사진 2장: 위쪽에 큰 액자 한 쌍, 두 사람은 바로 아래 가운데', () => {
  const L = galleryLayout(2);
  assert.equal(L.rows.length, 12);
  assert.equal(L.hostRow, 5);
});
