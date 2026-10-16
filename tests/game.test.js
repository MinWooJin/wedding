import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCamera, cameraBounds } from '../js/game.js';

test('cameraBounds: 맵이 크면 [-pad, mapLen-avail-pad], 작으면 고정값', () => {
  const view = { width: 176, height: 300 };
  assert.deepEqual(cameraBounds(view, { pixelW: 176, pixelH: 800 }, 56), { minX: 0, maxX: 0, minY: -56, maxY: 800 - 244 - 56 });
  assert.deepEqual(cameraBounds(view, { pixelW: 176, pixelH: 160 }, 56), { minX: 0, maxX: 0, minY: -98, maxY: -98 });
  assert.deepEqual(cameraBounds(view, { pixelW: 400, pixelH: 160 }, 0), { minX: 0, maxX: 224, minY: -70, maxY: -70 });
});

test('맵이 뷰보다 크면 플레이어를 세로 중앙에 두고 맵 범위로 클램프', () => {
  const view = { width: 176, height: 300 };
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 400 }), { x: 0, y: 250 });
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 10 }), { x: 0, y: 0 });
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 790 }), { x: 0, y: 500 });
});

test('topPad가 있으면 그만큼 위를 비우고 나머지 영역 기준으로 계산', () => {
  const view = { width: 176, height: 300 };
  // 맵이 남는 영역(244)보다 작음: 56 + (244-160)/2 = 98 위로
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 160 }, { x: 88, y: 80 }, 56), { x: 0, y: -98 });
  // 맵이 큼: 가용 244 기준 클램프 후 -56
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 10 }, 56), { x: 0, y: -56 });
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 790 }, 56), { x: 0, y: 800 - 244 - 56 });
});

test('맵이 뷰보다 작으면 가운데 정렬(음수 카메라)', () => {
  const view = { width: 176, height: 300 };
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 160 }, { x: 88, y: 80 }), { x: 0, y: -70 });
  assert.deepEqual(computeCamera(view, { pixelW: 112, pixelH: 160 }, { x: 56, y: 80 }), { x: -32, y: -70 });
});
