import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer, TILE, VIEW_TILES_W, computeViewport } from '../js/renderer.js';

test('정적 바닥은 카메라 이동 중 재사용하고 자산·바닥 변경 시에만 다시 합성한다', (t) => {
  const frames = [];
  const ctx = { drawImage: (...args) => frames.push(args) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ getContext: () => ({ drawImage: () => {} }) }) } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  const r = new Renderer({ getContext: () => ctx });
  let tilePaints = 0, floorPaints = 0;
  r.drawGardenTile = () => { tilePaints++; };
  r.drawSprite = () => { floorPaints++; };
  const map = { w: 2, h: 2, rows: ['GN', 'NN'] };
  const floor = { spr: {}, tx: 0, drawY: 32 };
  r.drawGround(map, null, [floor]);
  const canvas = frames[0][0];
  assert.equal(canvas.width, 64); assert.equal(canvas.height, 64);
  r.cam = { x: 16, y: 32 };
  r.drawGround(map, null, [floor]);
  assert.deepEqual(frames.at(-1), [canvas, -16, -32]);
  assert.equal(tilePaints, 4); assert.equal(floorPaints, 1);
  r.tiles = {};
  r.drawGround(map, null, [floor]);
  assert.equal(tilePaints, 8);
  r.drawGround(map, null, []);
  assert.equal(tilePaints, 12);
  r.invalidateGround(map);
  r.drawGround(map, null, []);
  assert.equal(tilePaints, 16);
  assert.equal(r.drawGround({ w: 11, h: 1000 }, null, []), false, '긴 갤러리에 대형 캐시를 할당하지 않음');
  assert.equal(tilePaints, 16);
  globalThis.document.createElement = () => ({ getContext: () => null });
  r.invalidateGround(map);
  assert.equal(r.drawGround(map, null, []), false, '캐시 캔버스를 만들 수 없으면 일반 렌더링으로 복귀');
});

test('기본 상수', () => {
  assert.equal(TILE, 32);
  assert.equal(VIEW_TILES_W, 11);
});

test('잔디 배경은 패턴을 재사용하고 카메라와 같은 위상으로 맵 밖까지 채운다', () => {
  const calls = [];
  let patterns = 0;
  const ctx = {
    createPattern: () => { patterns++; return {}; },
    save() {}, restore() {},
    translate: (...args) => calls.push(['translate', ...args]),
    fillRect: (...args) => calls.push(['fill', ...args]),
  };
  const r = new Renderer({ getContext: () => ctx });
  r.tiles = { G: { canvas: {} } };
  r.cam = { x: 17, y: -45 };
  r.drawBackdrop('G'); r.drawBackdrop('G');
  assert.equal(patterns, 1);
  assert.deepEqual(calls.slice(0, 2), [['translate', -17, 13], ['fill', 17, -13, 352, 600]]);
  r.tiles.G = { canvas: {} };
  r.drawBackdrop('G');
  assert.equal(patterns, 2, '실제 잔디 교체 시 패턴 갱신');
});

test('야외 경계의 H는 잔디로 합성하고 표시 정책 변경 시 바닥 캐시를 갱신한다', (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  const r = new Renderer({ getContext: () => ({ drawImage() {} }) });
  const painted = [];
  r.drawGardenTile = (id) => painted.push(id);
  const map = { w: 2, h: 1, rows: ['HG'] };
  r.drawGround(map, null, [], 'G');
  assert.deepEqual(painted, ['G', 'G']);
  assert.equal(map.rows[0], 'HG', '실제 충돌 타일 ID는 보존');
  r.drawGround(map, null, [], null);
  assert.deepEqual(painted, ['G', 'G', 'H', 'G']);
});

test('캐릭터는 비율·기울기를 변형하지 않고 정수 픽셀로만 그린다', () => {
  const calls = [];
  const ctx = {drawImage:(...args)=>calls.push(args),transform:()=>assert.fail('캐릭터 변형 금지')};
  const r = new Renderer({getContext:()=>ctx});
  const canvas = {}, spr = {w:48,h:72,canvas};
  r.motionPreference = {matches:false};
  r.drawSprite(spr,10,20,{lift:1});
  assert.deepEqual(calls.pop(),[canvas,10,19]);
  r.drawSprite(spr,10,20,null);
  assert.deepEqual(calls.pop(),[canvas,10,20]);
  r.motionPreference.matches = true;
  r.drawSprite(spr,10,20,{lift:1});
  assert.deepEqual(calls.pop(),[canvas,10,20]);
});

test('뷰 폭은 항상 352px이고 화면 폭에 꽉 차는 소수 배율(최대 4배)', () => {
  assert.deepEqual(computeViewport(352, 700), { scale: 1, width: 352, height: 700 });
  assert.deepEqual(computeViewport(440, 880), { scale: 1.25, width: 352, height: 704 });
  assert.deepEqual(computeViewport(2000, 900), { scale: 4, width: 352, height: 225 });
  assert.deepEqual(computeViewport(176, 300), { scale: 0.5, width: 352, height: 600 });
  const v = computeViewport(390, 844);
  assert.ok(v.scale > 1.1 && v.width * v.scale === 390, '390폭은 좌우 여백 없이 1.1배 이상');
});

test('캔버스는 기기 픽셀 비율로 그리고 내부 좌표는 변환 행렬로 키운다', () => {
  const transforms = [];
  const canvas = { style: {}, getContext: () => ({ setTransform: (...a) => transforms.push(a) }) };
  const r = new Renderer(canvas);
  const dpr = globalThis.devicePixelRatio;
  globalThis.devicePixelRatio = 3;
  try { r.resize(440, 880); } finally { globalThis.devicePixelRatio = dpr; }
  assert.equal(canvas.width, 352 * 3.75);
  assert.equal(canvas.height, 704 * 3.75);
  assert.equal(canvas.style.width, '440px');
  assert.deepEqual(transforms.at(-1), [3.75, 0, 0, 3.75, 0, 0]);
});


test('넓은 잔디 재질은 32px 격자마다 반복하지 않고 월드 좌표로 연속 샘플링한다', () => {
  const calls = [], canvas = {};
  const r = new Renderer({ getContext: () => ({ drawImage: (...args) => calls.push(args) }) });
  r.tiles = { G: { w:128,h:128,canvas } };
  r.cam = { x:0,y:17 };
  r.drawTile('G',96,160); r.drawTile('G',128,160);
  assert.deepEqual(calls[0], [canvas,96,32,32,32,96,143,32,32]);
  assert.deepEqual(calls[1], [canvas,0,32,32,32,128,143,32,32]);
  const translates = [];
  r.ctx = { createPattern: () => ({}), save(){},restore(){},fillRect(){},translate:(...args)=>translates.push(args) };
  r.cam = {x:17,y:45}; r.drawBackdrop('G');
  assert.deepEqual(translates[0],[-17,-45], '배경도 128px 재질 위상에 맞춘다');
});
