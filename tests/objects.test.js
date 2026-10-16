import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTS, objectSprite } from '../js/sprites/objects.js';

test('필수 오브젝트가 있고 크기는 16의 배수', () => {
  const need = ['arch', 'tree', 'sign', 'mailbox', 'frame', 'bench', 'chest', 'desk', 'board', 'phone', 'calendar', 'mapframe', 'flower', 'stone', 'door'];
  for (const id of need) {
    assert.ok(OBJECTS[id], id);
    const s = objectSprite(id);
    assert.equal(s.w % 16, 0, `${id} w`);
    assert.equal(s.h % 16, 0, `${id} h`);
  }
});

test('아치는 48×32, 나무는 16×32, 벤치/책상은 32×16', () => {
  assert.deepEqual([objectSprite('arch').w, objectSprite('arch').h], [48, 32]);
  assert.deepEqual([objectSprite('tree').w, objectSprite('tree').h], [16, 32]);
  assert.deepEqual([objectSprite('bench').w, objectSprite('bench').h], [32, 16]);
  assert.deepEqual([objectSprite('desk').w, objectSprite('desk').h], [32, 16]);
});
