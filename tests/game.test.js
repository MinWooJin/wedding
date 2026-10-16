import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCamera } from '../js/game.js';

test('맵이 뷰보다 크면 플레이어를 세로 중앙에 두고 맵 범위로 클램프', () => {
  const view = { width: 176, height: 300 };
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 400 }), { x: 0, y: 250 });
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 10 }), { x: 0, y: 0 });
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 790 }), { x: 0, y: 500 });
});

test('맵이 뷰보다 작으면 가운데 정렬(음수 카메라)', () => {
  const view = { width: 176, height: 300 };
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 160 }, { x: 88, y: 80 }), { x: 0, y: -70 });
  assert.deepEqual(computeCamera(view, { pixelW: 112, pixelH: 160 }, { x: 56, y: 80 }), { x: -32, y: -70 });
});
