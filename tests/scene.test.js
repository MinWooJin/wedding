import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '../js/world/scene.js';
import { Character } from '../js/entities/character.js';
import { presetSprites, GROOM } from '../js/sprites/characters.js';

function makeScene(extra = {}) {
  return new Scene({
    id: 't',
    rows: [
      'HHHHHHH',
      'HGGGGGH',
      'HGGGGGH',
      'HGGGGGH',
      'HGGGGGH',
      'HHHPHHH',
    ],
    spawn: { tx: 3, ty: 2 },
    entrances: [{ tx: 3, ty: 5, to: 'hub', spawn: { tx: 1, ty: 1 } }],
    ...extra,
  });
}
const player = () => new Character({ sprites: presetSprites(0), name: 'me', x: 0, y: 0 });

test('enter는 플레이어를 spawn 타일 중앙 하단에 놓는다', () => {
  const s = makeScene(); const p = player();
  s.enter(p);
  assert.deepEqual([p.x, p.y], [3 * 16 + 8, 2 * 16 + 14]);
});

test('enter에 spawn을 주면 그 타일을 쓴다', () => {
  const s = makeScene(); const p = player();
  s.enter(p, { tx: 1, ty: 1 });
  assert.deepEqual([p.x, p.y], [24, 30]);
});

test('오브젝트 발자국은 solid, solid:false면 통과', () => {
  const s = makeScene({ objects: [
    { id: 'a', sprite: 'tree', tx: 1, ty: 1 },
    { id: 'b', sprite: 'arch', tx: 2, ty: 1, solid: false },
  ] });
  assert.ok(s.extraSolid.has('1,2'));
  assert.ok(!s.extraSolid.has('1,1'));
  assert.ok(!s.extraSolid.has('2,2'));
});

test('빈 곳을 탭하면 플레이어가 그쪽으로 이동 목표를 잡는다', () => {
  const s = makeScene(); const p = player(); s.enter(p);
  const game = { player: p, goTo: () => {} };
  s.onTap(40, 60, game);
  assert.deepEqual(p.target, { x: 40, y: 60 });
});

test('오브젝트를 탭하면 앞 타일로 이동한 뒤 interact(game)가 호출된다', () => {
  let hit = 0;
  const s = makeScene({ objects: [{ id: 'm', sprite: 'mailbox', tx: 3, ty: 1, interact: () => hit++ }] });
  const p = player(); s.enter(p, { tx: 3, ty: 4 });
  const game = { player: p, goTo: () => {} };
  s.onTap(3 * 16 + 8, 1 * 16 + 8, game);
  assert.deepEqual(p.target, { x: 56, y: 2 * 16 + 14 });
  assert.equal(hit, 0, '도착 전에는 호출되지 않음');
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.equal(hit, 1);
});

test('stand를 지정한 오브젝트는 그 타일로 이동한다(갤러리 액자용)', () => {
  const s = makeScene({ objects: [{ id: 'f', sprite: 'frame', tx: 1, ty: 2, stand: { tx: 2, ty: 2 }, interact: () => {} }] });
  const p = player(); s.enter(p, { tx: 5, ty: 4 });
  s.onTap(1 * 16 + 8, 2 * 16 + 8, { player: p, goTo: () => {} });
  assert.deepEqual(p.target, { x: 2 * 16 + 8, y: 2 * 16 + 14 });
});

test('floor 오브젝트는 solid가 아니고 캐릭터보다 먼저 그려진다', () => {
  const s = makeScene({ objects: [{ id: 'd', sprite: 'door', tx: 3, ty: 2, floor: true }] });
  assert.ok(!s.extraSolid.has('3,2'));
  const p = player(); s.enter(p);
  const log = [];
  s.draw({ drawTile: () => {}, drawSprite: (spr) => log.push(spr.h), drawNameTag: () => {}, drawBubble: () => {} }, p);
  assert.deepEqual(log, [16, 24]);
});

test('입구 타일을 밟으면 game.goTo가 호출된다', () => {
  const s = makeScene(); const p = player(); s.enter(p, { tx: 3, ty: 4 });
  const calls = [];
  const game = { player: p, goTo: (to, spawn) => calls.push([to, spawn]) };
  p.moveTo(56, 5 * 16 + 8);
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.deepEqual(calls[0], ['hub', { tx: 1, ty: 1 }]);
  assert.equal(calls.length, 1, '입구는 한 번만 발동');
});

test('NPC는 solid이며 탭하면 interact가 호출된다', () => {
  let hit = 0;
  const npc = new Character({ sprites: GROOM, name: '신랑', x: 56, y: 30 });
  const s = makeScene({ npcs: [{ character: npc, interact: () => hit++ }] });
  const p = player(); s.enter(p, { tx: 3, ty: 3 });
  const game = { player: p, goTo: () => {} };
  assert.ok(s.extraSolid.has('3,1'));
  s.onTap(56, 20, game);
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.equal(hit, 1);
});

test('draw는 타일 → y정렬 드로어블 → 말풍선 순으로 renderer를 호출한다', () => {
  const s = makeScene({ objects: [{ id: 'm', sprite: 'mailbox', tx: 3, ty: 1 }] });
  const p = player(); s.enter(p); p.say('hi');
  const log = [];
  const r = {
    drawTile: (id) => log.push(`tile:${id}`),
    drawSprite: () => log.push('sprite'),
    drawNameTag: () => log.push('tag'),
    drawBubble: () => log.push('bubble'),
  };
  s.draw(r, p);
  assert.equal(log.filter((l) => l.startsWith('tile:')).length, 7 * 6);
  assert.equal(log.filter((l) => l === 'sprite').length, 2);
  assert.ok(log.indexOf('bubble') > log.lastIndexOf('sprite'));
});
