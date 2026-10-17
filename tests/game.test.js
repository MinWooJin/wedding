import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCamera, cameraBounds, groundBackgroundStyle } from '../js/game.js';
import { computeViewport } from '../js/renderer.js';

test('모바일 정원에서 플레이어가 좌우로 걸어도 배경의 가로 구도는 고정된다', () => {
  for (const width of [320,390,430]) {
    const view=computeViewport(width,844,3),scene={pixelW:352,pixelH:864,bgImage:{}};
    for (const x of [48,176,304]) assert.equal(computeCamera(view,scene,{x,y:240},48).x,0);
    const bounds=cameraBounds(view,scene,48);
    assert.equal(bounds.minX,0);assert.equal(bounds.maxX,0);
  }
});

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

test('배경 그림이 있는 짧은 야외 맵은 세로로 위에 붙인다(가로는 가운데)', () => {
  const view = { width: 176, height: 300 };
  const scene = { pixelW: 112, pixelH: 160, bgImage: {} };
  assert.deepEqual(computeCamera(view, scene, { x: 56, y: 80 }, 56), { x: -32, y: -56 });
  assert.deepEqual(cameraBounds(view, scene, 56), { minX: -32, maxX: -32, minY: -56, maxY: -56 });
});


test('양옆 잔디는 소수 배율과 카메라 이동 중에도 캔버스와 같은 지점을 표시한다', () => {
  for (const scale of [1, 2, 320/352]) {
    const view = { width: 352, scale }, frameWidth = 430;
    const left = (frameWidth - 352*scale)/2;
    const a = groundBackgroundStyle(view, frameWidth, {x:0,y:45.4}, {w:128,h:128});
    const b = groundBackgroundStyle(view, frameWidth, {x:0,y:82.4}, {w:128,h:128});
    const [x,y] = a.position.split(' ').map(parseFloat);
    assert.ok(Math.abs((left + 37*scale - x)/scale - 37) < 1e-10, '공유 경계의 같은 가로 원점');
    assert.ok(Math.abs((100*scale-y)/scale - 145) < 1e-10, '캔버스와 같은 반올림 카메라');
    assert.ok(Math.abs(parseFloat(b.position.split(' ')[1])-y + 37*scale) < 1e-10, '카메라와 같은 이동량');
    assert.equal(a.size, `${128*scale}px ${128*scale}px`);
  }
});
