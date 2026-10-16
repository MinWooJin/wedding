import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Character, SPEED } from '../js/entities/character.js';
import { presetSprites } from '../js/sprites/characters.js';

const mk = () => new Character({ sprites: presetSprites(0), name: '민우', x: 100, y: 100 });

test('기본 상태: 아래를 보고 정지', () => {
  const c = mk();
  assert.equal(c.dir, 'down');
  assert.equal(c.target, null);
  assert.equal(c.sprite().h, 48);
});

test('충돌 박스는 발 밑 중앙 기준 20×16', () => {
  assert.deepEqual(mk().box(), { x: 90, y: 84, w: 20, h: 16 });
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

test('걷는 동안 걷기 프레임(1,2)을 오가고 멈추면 idle(0)', () => {
  const c = mk();
  c.moveTo(1000, 100);
  const seen = new Set();
  for (let i = 0; i < 10; i++) { c.update(0.1, () => false); seen.add(c.sprite()); }
  assert.equal(seen.size, 2);
  assert.ok(seen.has(c.sprites.right[1]) && seen.has(c.sprites.right[2]));
  c.stop();
  assert.equal(c.sprite(), c.sprites.right[0]);
});

test('drawPos는 스프라이트 크기 기준으로 발 밑 중앙에 맞춘다', () => {
  const c = mk();
  assert.deepEqual(c.drawPos(), { x: 84, y: 52, w: 32, h: 48 });
});

test('followPath는 경유점을 차례로 지나 마지막에 onArrive를 호출한다', () => {
  const c = mk();
  let done = 0;
  c.followPath([{ x: 100, y: 110 }, { x: 110, y: 110 }], () => done++);
  assert.deepEqual(c.target, { x: 100, y: 110 });
  for (let i = 0; i < 60; i++) c.update(1 / 60, () => false);
  assert.deepEqual([Math.round(c.x), Math.round(c.y)], [110, 110]);
  assert.equal(done, 1);
  assert.equal(c.target, null);
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

test('정지 호흡은 1px 이내이며 좌표·충돌·탭 영역을 움직이지 않는다', () => {
  const c = mk(), box = c.box(), pos = c.drawPos(), first = c.motion();
  c.update(1, () => true);
  assert.notDeepEqual(c.motion(), first);
  assert.ok(c.motion().scaleY >= 1 - 1 / c.sprite().h && c.motion().scaleY <= 1);
  assert.deepEqual(c.box(), box);
  assert.deepEqual(c.drawPos(), pos);
  assert.deepEqual([c.x, c.y], [100, 100]);
});

test('단일 PNG도 걸을 때 흔들리고 막히거나 도착하면 정지 모션으로 돌아온다', () => {
  const spr = { w: 48, h: 72 };
  const c = new Character({ sprites: { down: [spr], right: [spr] }, name: '하객', x: 100, y: 100 });
  c.moveTo(1000, 100);
  c.update(0.09, () => false);
  assert.equal(c.sprite(), spr);
  assert.ok(c.motion().lean > 0);
  assert.equal(c.motion().lift, 1.5);
  assert.equal(c.motion(true), null);
  c.update(0.1, () => true);
  assert.equal(c.moving, false);
  assert.equal(c.motion().lean, 0);
  assert.equal(c.motion().lift, 0);
});

test('경유점에서도 보행 위상과 남은 프레임 시간을 유지한다', () => {
  const c = mk();
  c.followPath([{ x: 112, y: 100 }, { x: 200, y: 100 }]);
  c.update(0.1, () => false);
  assert.equal(c.moving, true);
  c.update(0.1, () => false);
  assert.equal(c.frame, 1);
  assert.ok(Math.abs(c.animT - 0.02) < 1e-9);
  assert.equal(c.sprite(true), c.sprites.right[0]);
});
