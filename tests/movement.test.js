import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepToward, dirOf } from '../js/world/movement.js';

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

test('양 축 모두 막히면 그 자리에서 도착 처리(멈춤)', () => {
  const r = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 5, () => true);
  assert.deepEqual([r.x, r.y], [0, 0]);
  assert.equal(r.moved, false);
  assert.equal(r.arrived, true);
});
