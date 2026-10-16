import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTS, objectSprite } from '../js/sprites/objects.js';

test('필수 오브젝트가 있고 크기는 32의 배수', () => {
  const need = ['arch', 'tree', 'sign', 'mailbox', 'frame', 'bench', 'chest', 'desk', 'board', 'phone', 'calendar', 'mapframe', 'flower', 'stone', 'door'];
  for (const id of need) {
    assert.ok(OBJECTS[id], id);
    const s = objectSprite(id);
    assert.equal(s.w % 32, 0, `${id} w`);
    assert.equal(s.h % 32, 0, `${id} h`);
  }
});

test('아치는 96×64, 나무는 32×64, 벤치/책상은 64×32', () => {
  assert.deepEqual([objectSprite('arch').w, objectSprite('arch').h], [96, 64]);
  assert.deepEqual([objectSprite('tree').w, objectSprite('tree').h], [32, 64]);
  assert.deepEqual([objectSprite('bench').w, objectSprite('bench').h], [64, 32]);
  assert.deepEqual([objectSprite('desk').w, objectSprite('desk').h], [64, 32]);
});
