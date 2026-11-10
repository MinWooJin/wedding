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

test('사진 5장(홀수): 첫 사진은 맨 위 가운데, 나머지 네 장은 그 아래 좌우 두 쌍', () => {
  const L = galleryLayout(5);
  assert.equal(L.rows.length, 18);
  assert.equal(L.frames.length, 5);
  assert.deepEqual(L.frames[0], { index: 0, tx: 4, ty: 1, stand: { tx: 5, ty: 5 } });
  assert.deepEqual(L.frames[1], { index: 1, tx: 1, ty: 6, stand: { tx: 4, ty: 9 } });
  assert.deepEqual(L.frames[2], { index: 2, tx: 7, ty: 6, stand: { tx: 6, ty: 9 } });
  assert.deepEqual(L.frames[4], { index: 4, tx: 7, ty: 11, stand: { tx: 6, ty: 14 } });
  assert.deepEqual(L.exit, { tx: 5, ty: 17 });
  assert.equal(L.hostRow, 7, '두 사람은 첫 쌍의 액자 사이');
  assert.ok(L.frames.every((f) => f.stand.ty !== L.hostRow));
});

test('사진 3장: 1번 맨 위 가운데, 2번 왼쪽·3번 오른쪽 아래로 삼각형 배치, 두 사람은 2·3번 사이', () => {
  const L = galleryLayout(3);
  assert.deepEqual(L.frames.map((f) => [f.index, f.tx, f.ty]), [[0, 4, 1], [1, 1, 6], [2, 7, 6]]);
  assert.equal(L.frames[0].tx * 32 + 48, 176, '가운데 액자는 방 한가운데(x176)');
  assert.equal(L.rows.length, 13);
  assert.equal(L.hostRow, 7);
  assert.ok(L.frames.every((f) => f.stand.ty !== L.hostRow && f.stand.ty < L.rows.length - 1));
});

test('사진 6장(짝수)은 예전처럼 좌우 세 쌍', () => {
  const L = galleryLayout(6);
  assert.deepEqual(L.frames.map((f) => [f.tx, f.ty]), [[1, 1], [7, 1], [1, 6], [7, 6], [1, 11], [7, 11]]);
  assert.equal(L.rows.length, 18);
});

test('사진 2장: 위쪽에 큰 액자 한 쌍, 두 사람은 바로 아래 가운데', () => {
  const L = galleryLayout(2);
  assert.equal(L.rows.length, 12);
  assert.equal(L.hostRow, 5);
});
