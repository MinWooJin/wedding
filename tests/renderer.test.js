import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, VIEW_TILES_W, computeViewport } from '../js/renderer.js';

test('기본 상수', () => {
  assert.equal(TILE, 32);
  assert.equal(VIEW_TILES_W, 11);
});

test('뷰 폭은 항상 352px, 352 이상이면 정수 배율, 더 좁으면 꽉 차는 소수 배율', () => {
  assert.deepEqual(computeViewport(390, 844), { scale: 1, width: 352, height: 844 });
  assert.deepEqual(computeViewport(430, 932), { scale: 1, width: 352, height: 932 });
  assert.deepEqual(computeViewport(1200, 900), { scale: 3, width: 352, height: 300 });
  assert.deepEqual(computeViewport(176, 300), { scale: 0.5, width: 352, height: 600 });
});
