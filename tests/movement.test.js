import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepToward, dirOf, findPath } from '../js/world/movement.js';

test('findPath: 장애물을 돌아가는 최단 경로', () => {
  // 3×3, 가운데 막힘
  const blocked = (tx, ty) => tx === 1 && ty === 1;
  const p = findPath(3, 3, blocked, { tx: 0, ty: 1 }, { tx: 2, ty: 1 });
  assert.equal(p.length, 4);
  assert.deepEqual(p.at(-1), { tx: 2, ty: 1 });
  assert.ok(!p.some((t) => t.tx === 1 && t.ty === 1));
});

test('findPath: 같은 칸이면 [], 도달 불가/목표가 막혔으면 null', () => {
  assert.deepEqual(findPath(3, 3, () => false, { tx: 1, ty: 1 }, { tx: 1, ty: 1 }), []);
  assert.equal(findPath(3, 3, (tx) => tx === 1, { tx: 0, ty: 0 }, { tx: 2, ty: 0 }), null);
  assert.equal(findPath(3, 3, (tx, ty) => tx === 2 && ty === 2, { tx: 0, ty: 0 }, { tx: 2, ty: 2 }), null);
});

const free = () => false;

test('dirOf: 큰 축 기준 4방향', () => {
  assert.equal(dirOf(5, 1), 'right');
  assert.equal(dirOf(-5, 1), 'left');
  assert.equal(dirOf(1, 5), 'down');
  assert.equal(dirOf(1, -5), 'up');
});

test('목표까지 거리가 스텝보다 작으면 바로 도착', () => {
  const r = stepToward({ x: 0, y: 0 }, { x: 1, y: 0 }, 5, free);
  assert.deepEqual([r.x, r.y], [1, 0]);
  assert.equal(r.arrived, true);
  assert.equal(r.moved, true);
});

test('스텝 거리만큼 목표 방향으로 이동', () => {
  const r = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 5, free);
  assert.ok(Math.abs(r.x - 3) < 1e-9);
  assert.ok(Math.abs(r.y - 4) < 1e-9);
  assert.equal(r.arrived, false);
  assert.equal(r.dir, 'down');
});

test('x축이 막히면 y축으로만 미끄러진다', () => {
  const blocked = (x) => x > 0.5;
  const r = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 5, blocked);
  assert.equal(r.x, 0);
  assert.ok(Math.abs(r.y - 4) < 1e-9);
  assert.equal(r.moved, true);
  assert.equal(r.arrived, false);
});

test('한 축은 변위 0, 다른 축은 막히면 제자리 → moved=false로 멈춘다', () => {
  const r = stepToward({ x: 40, y: 208 }, { x: 40, y: 238 }, 5, (x, y) => y > 208);
  assert.deepEqual([r.x, r.y], [40, 208]);
  assert.equal(r.moved, false);
  assert.equal(r.arrived, true);
});

test('양 축 모두 막히면 그 자리에서 도착 처리(멈춤)', () => {
  const r = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 5, () => true);
  assert.deepEqual([r.x, r.y], [0, 0]);
  assert.equal(r.moved, false);
  assert.equal(r.arrived, true);
});
