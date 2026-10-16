import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, VIEW_TILES_W, computeViewport } from '../js/renderer.js';

test('기본 상수', () => {
  assert.equal(TILE, 16);
  assert.equal(VIEW_TILES_W, 11);
});

test('배율은 1~4 사이 정수, 뷰 폭은 항상 176px', () => {
  assert.deepEqual(computeViewport(390, 844), { scale: 2, width: 176, height: 422 });
  assert.deepEqual(computeViewport(430, 932), { scale: 2, width: 176, height: 466 });
  assert.deepEqual(computeViewport(1200, 900), { scale: 4, width: 176, height: 225 });
  assert.deepEqual(computeViewport(150, 300), { scale: 1, width: 176, height: 300 });
});
