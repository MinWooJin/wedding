import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, standPos } from '../js/world/scene.js';
const T = 32;
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
  assert.deepEqual([p.x, p.y], [3 * T + 16, 2 * T + 28]);
});

test('enter에 spawn을 주면 그 타일을 쓴다', () => {
  const s = makeScene(); const p = player();
  s.enter(p, { tx: 1, ty: 1 });
  assert.deepEqual([p.x, p.y], [48, 60]);
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
  s.onTap(80, 120, game);
  assert.ok(p.target, '이동 시작');
  for (let i = 0; i < 60; i++) s.update(0.1, game);
  assert.deepEqual([Math.round(p.x), Math.round(p.y)], [80, 120]);
  assert.equal(p.target, null);
});

test('장애물이 가로막아도 돌아가서 도착한다(BFS)', () => {
  // (3,3)에 표지판: (3,4)→(3,2) 직선은 막힘
  const s = makeScene({ objects: [{ id: 'w', sprite: 'sign', tx: 3, ty: 3 }] });
  const p = player(); s.enter(p, { tx: 3, ty: 4 });
  const game = { player: p, goTo: () => {} };
  s.onTap(standPos(3, 2).x, standPos(3, 2).y, game);
  for (let i = 0; i < 100; i++) s.update(0.1, game);
  assert.deepEqual([Math.round(p.x), Math.round(p.y)], [standPos(3, 2).x, standPos(3, 2).y]);
});

test('오브젝트를 탭하면 앞 타일로 이동한 뒤 interact(game)가 호출된다', () => {
  let hit = 0;
  const s = makeScene({ objects: [{ id: 'm', sprite: 'mailbox', tx: 3, ty: 1, interact: () => hit++ }] });
  const p = player(); s.enter(p, { tx: 3, ty: 4 });
  const game = { player: p, goTo: () => {} };
  s.onTap(3 * T + 16, 1 * T + 16, game);
  assert.ok(p.target, '이동 시작');
  assert.equal(hit, 0, '도착 전에는 호출되지 않음');
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.deepEqual([Math.round(p.x), Math.round(p.y)], [standPos(3, 2).x, standPos(3, 2).y], '바로 아래 타일 (3,2)에 섬');
  assert.equal(hit, 1);
});

test('위에서 접근하면 오브젝트 위쪽 타일에 선다(가장 가까운 빈 이웃)', () => {
  const s = makeScene({ objects: [{ id: 'm', sprite: 'sign', tx: 3, ty: 4, interact: () => {} }] });
  const p = player(); s.enter(p, { tx: 3, ty: 1 });
  const game = { player: p, goTo: () => {} };
  s.onTap(3 * T + 16, 4 * T + 16, game);
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.deepEqual([Math.round(p.x), Math.round(p.y)], [standPos(3, 3).x, standPos(3, 3).y]);
});

test('stand를 지정한 오브젝트는 그 타일로 이동한다(갤러리 액자용)', () => {
  const s = makeScene({ objects: [{ id: 'f', sprite: 'frame', tx: 1, ty: 2, stand: { tx: 2, ty: 2 }, interact: () => {} }] });
  const p = player(); s.enter(p, { tx: 5, ty: 4 });
  const game = { player: p, goTo: () => {} };
  s.onTap(1 * T + 16, 2 * T + 16, game);
  for (let i = 0; i < 30; i++) s.update(0.1, game);
  assert.deepEqual([Math.round(p.x), Math.round(p.y)], [standPos(2, 2).x, standPos(2, 2).y]);
});

test('floor 오브젝트는 solid가 아니고 캐릭터보다 먼저 그려진다', () => {
  const s = makeScene({ objects: [{ id: 'd', sprite: 'door', tx: 3, ty: 2, floor: true }] });
  assert.ok(!s.extraSolid.has('3,2'));
  const p = player(); s.enter(p);
  const log = [];
  s.draw({ drawTile: () => {}, drawSprite: (spr) => log.push(spr.h), drawNameTag: () => {}, drawBubble: () => {} }, p);
  assert.deepEqual(log, [32, 48]);
});

test('입구 타일을 밟으면 game.goTo가 호출된다', () => {
  const s = makeScene(); const p = player(); s.enter(p, { tx: 3, ty: 4 });
  const calls = [];
  const game = { player: p, goTo: (to, spawn) => calls.push([to, spawn]) };
  p.moveTo(standPos(3, 5).x, 5 * T + 16);
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.deepEqual(calls[0], ['hub', { tx: 1, ty: 1 }]);
  assert.equal(calls.length, 1, '입구는 한 번만 발동');
});

test('NPC는 solid이며 탭하면 interact가 호출된다', () => {
  let hit = 0;
  const npc = new Character({ sprites: GROOM, name: '신랑', x: 112, y: 60 });
  const s = makeScene({ npcs: [{ character: npc, interact: () => hit++ }] });
  const p = player(); s.enter(p, { tx: 3, ty: 3 });
  const game = { player: p, goTo: () => {} };
  assert.ok(s.extraSolid.has('3,1'));
  s.onTap(112, 40, game);
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.equal(hit, 1);
});

test('wander NPC는 시간이 지나면 home 주변으로 이동하고, solid:false면 플레이어를 막지 않는다', () => {
  const npc = new Character({ sprites: GROOM, name: '손님', x: standPos(3, 3).x, y: standPos(3, 3).y });
  const s = makeScene({ npcs: [{ character: npc, solid: false, wander: { home: { tx: 3, ty: 3 }, radius: 1, timer: 0.5, faceDir: 'left' } }] });
  assert.ok(!s.extraSolid.has('3,3'), '비충돌 NPC');
  const p = player(); s.enter(p, { tx: 1, ty: 1 });
  const game = { player: p, goTo: () => {} };
  const start = [npc.x, npc.y];
  for (let i = 0; i < 40; i++) s.update(0.1, game); // 4초: 타이머 만료 → 이동 → 도착
  const moved = npc.x !== start[0] || npc.y !== start[1];
  assert.ok(moved, '자리를 옮겼다');
  const t = s.tileOf(npc.x, npc.y);
  assert.ok(Math.abs(t.tx - 3) <= 1 && Math.abs(t.ty - 3) <= 1, 'home 반경 1칸 안');
  assert.ok(!s.isSolidTile(t.tx, t.ty), '막힌 칸이 아님');
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
