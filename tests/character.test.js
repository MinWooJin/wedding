import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Character, SPEED } from '../js/entities/character.js';
import { presetSprites } from '../js/sprites/characters.js';

const mk = () => new Character({ sprites: presetSprites(0), name: '민우', x: 100, y: 100 });

test('기본 상태: 아래를 보고 정지', () => {
  const c = mk();
  assert.equal(c.dir, 'down');
  assert.equal(c.target, null);
  assert.equal(c.sprite().h, 24);
});

test('충돌 박스는 발 밑 중앙 기준 10×8', () => {
  assert.deepEqual(mk().box(), { x: 95, y: 92, w: 10, h: 8 });
});

test('target이 있으면 update로 이동하고 방향이 바뀐다', () => {
  const c = mk();
  c.moveTo(160, 100);
  c.update(0.1, () => false);
  assert.ok(c.x > 100);
  assert.equal(c.dir, 'right');
  assert.ok(Math.abs(c.x - (100 + SPEED * 0.1)) < 1e-9);
});

test('도착하면 target이 null이 되고 onArrive가 한 번 호출된다', () => {
  const c = mk();
  let n = 0;
  c.moveTo(101, 100, () => n++);
  c.update(1, () => false);
  assert.equal(c.target, null);
  assert.equal(n, 1);
  c.update(1, () => false);
  assert.equal(n, 1);
});

test('걷는 동안 프레임이 0/1을 오간다', () => {
  const c = mk();
  c.moveTo(1000, 100);
  const seen = new Set();
  for (let i = 0; i < 10; i++) { c.update(0.1, () => false); seen.add(c.frame); }
  assert.deepEqual([...seen].sort(), [0, 1]);
});

test('say는 말풍선을 설정하고 시간이 지나면 사라진다', () => {
  const c = mk();
  c.say('축하해요', 1);
  assert.equal(c.bubble, '축하해요');
  c.update(0.5, () => false);
  assert.equal(c.bubble, '축하해요');
  c.update(0.6, () => false);
  assert.equal(c.bubble, null);
});
