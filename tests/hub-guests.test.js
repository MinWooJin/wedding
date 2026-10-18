import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guestPlacements, HUB_ROWS, HUB_DOORS, GUEST_ZONE, createHub, uniqueGuests, MAX_GUESTS } from '../js/world/hub.js';
import { MIN_CROWD, withExtras, AISLE_OPEN_FROM } from '../js/world/hub.js';
import { findPath } from '../js/world/movement.js';
import { DEFAULT_CONFIG } from '../js/config.js';
import { assetFilename } from '../js/assets.js';

test('꽃 장식은 통과하되 하객20명의 기본 자리는 장식 바깥에 유지한다', () => {
  const hub=createHub({config:DEFAULT_CONFIG,profile:{nickname:'나'},assets:{maps:{hub:{}}},data:{messages:[]}});
  assert.ok(hub.guestMap.size>=MIN_CROWD);
  assert.ok([...hub.guestMap.values()].filter(n=>[4,5,6].includes(n.wander.home.tx)).length>=3,'중앙 길도 하객이 자연스럽게 채운다');
  for(const n of hub.guestMap.values()) {
    const {tx,ty}=n.wander.home;
    assert.ok(![3,7].includes(tx), '기본 자리는 장식을 가리지 않는다');
    assert.equal(n.wander.allow(3,10),true);
    assert.equal(n.wander.allow(7,10),true);
  }
  for(const tx of [3,7]) for(let ty=6;ty<=17;ty++) assert.equal(hub.isSolidTile(tx,ty),false);
  // 실제 발 충돌 박스로 꽃무더기와 빈 잔디를 모두 가로지를 수 있다.
  for (const y of [240, 340, 448, 560]) for(let x=80;x<=272;x+=2) assert.equal(hub.blockedStatic()(x,y),false);
  assert.equal(hub.isSolidTile(3,18),false,'꽃띠 아래 교차로는 열린다');
  for(const door of Object.values(HUB_DOORS)) assert.ok(findPath(hub.map.w,hub.map.h,(x,y)=>hub.isSolidTile(x,y),hub.spawn,door.back),'네 공간으로 가는 길은 유지한다');
  const guests=[...hub.guestMap.values()];
  for(let i=0;i<2400&&guests.some(n=>n.arrival);i++) {
    hub.updateArrivals(.05,false);
    for(const n of guests) {
      n.character.update(.05,hub.blockedStatic());
    }
  }
  assert.ok(guests.every(n=>!n.arrival),'꽃을 통과하며 모두 자기 자리에 도착한다');
});

test('방명록 글을 남긴 사람만 광장에 서고, 그 수만큼 분위기용 하객이 줄어든다', () => {
  const entries = [
    { t: 1, n: '글쓴이', c: 1, m: '축하해요' },
    { t: 2, n: '구경꾼', c: 2, m: '' },
    { t: 3, n: '또글쓴이', c: 3, m: '행복하세요' },
  ];
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: entries } });
  const real = [...hub.guestMap.keys()].filter((k) => !k.startsWith('extra:'));
  assert.deepEqual(real.sort(), ['글쓴이:1', '또글쓴이:3'], '입장만 한 사람은 서지 않는다');
  assert.equal(hub.guestMap.size, MIN_CROWD, '글쓴이 2명 + 분위기용 18명');
});

test('여러 글과 방문 기록이 섞여도 한 하객을 한 번만 업데이트한다', () => {
  const entries = [
    { n: '하객', c: 1, m: '첫 글', t: 1 },
    { n: '하객', c: 1, m: '최신 글', t: 3 },
    { n: '하객', c: 1, m: '', t: 4 },
  ];
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: entries } });
  for (let i = 0; i < 3; i++) {
    hub.setGuests(entries);
    const real = [...hub.guestMap.keys()].filter((k) => !k.startsWith('extra:'));
    assert.equal(real.length, 1, '실제 하객은 한 명');
    assert.equal(hub.npcs.length - hub.baseNpcs.length, MIN_CROWD, '부족분은 분위기용 하객으로 채움');
    assert.equal(hub.guestMap.get('하객:1').entry.m, '최신 글');
    assert.equal(new Set(hub.npcs).size, hub.npcs.length);
  }
  assert.equal(entries.length, 3, '원본 메시지 목록은 그대로 유지');
  assert.equal(uniqueGuests(entries).length, 1);
});

test('보존한 하객과 신규 하객을 합쳐도 전체 상한을 넘지 않는다', () => {
  const entries = Array.from({ length: 100 }, (_, i) => ({ t: i, n: `추가하객${i}`, c: i % 10, m: '축하' }));
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: entries.slice(0, 20) } });
  for (let i = 20; i <= 100; i += 10) {
    hub.setGuests(entries.slice(0, i));
    assert.ok(hub.npcs.length - hub.baseNpcs.length <= MAX_GUESTS);
  }
});

test('반복 갱신과 새 하객 추가 시 기존 캐릭터·배회 상태를 보존한다', () => {
  const entries = Array.from({ length: 5 }, (_, i) => ({ t: i, n: `손님${i}`, c: i, m: '축하' }));
  const game = { config: DEFAULT_CONFIG, profile: { nickname: '나의 이름' }, assets: {}, data: { messages: entries } };
  const hub = createHub(game);
  const guest = hub.guestMap.get('손님0:0');
  guest.character.x += 2; guest.wander.timer = 3.5;
  hub.setGuests([{ t: 8, n: '새 하객', c: 8, m: '안녕하세요' }, ...entries]);
  assert.equal(hub.guestMap.get('손님0:0'), guest);
  assert.equal(guest.wander.timer, 3.5);
  hub.setGuests([]);
  assert.equal([...hub.guestMap.keys()].filter((k) => !k.startsWith('extra:')).length, 0, '실제 하객은 모두 사라짐');
  assert.equal(hub.guestMap.size, MIN_CROWD, '대신 분위기용 하객이 돌아다님');
  assert.ok([...hub.guestMap.values()].every((g) => g.character.name === '하객'));
});

test('가장자리 장식을 포함한 실제 PNG 크기로 하객 24명 이상을 배치한다', () => {
  // 단상·아치·표지판 등 현재 선택된 PNG 크기로 여유 공간을 확인한다.
  const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
  const objects = Object.fromEntries(manifest.objects.map((name) => {
    const png = readFileSync(new URL(`../assets/objects/${assetFilename(manifest, 'objects', name)}`, import.meta.url));
    return [name, { w: png.readUInt32BE(16), h: png.readUInt32BE(20) }];
  }));
  const entries = Array.from({ length: 30 }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: '축하' }));
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects }, data: { messages: entries } });
  assert.ok(hub.guestMap.size >= 24, `배치된 하객 ${hub.guestMap.size}명`);
  const trees = hub.objects.filter((o) => o.sprite === 'tree');
  assert.equal(trees.length, 2, '벚꽃나무 한 쌍');
  assert.equal(trees[0].tx * 32, 0);
  assert.equal(trees[1].tx * 32 + trees[1].spr.w, hub.pixelW);
  assert.equal(hub.objects.filter((o) => o.sprite === 'tree-green').length, 2, '위쪽 모서리 초록 나무 한 쌍');
  for (const n of hub.guestMap.values()) {
    const { tx, ty } = n.wander.home;
    assert.ok(!hub.isSolidTile(tx, ty), `장식 위에 서지 않는다 ${tx},${ty}`);
    assert.ok(![4, 5, 6].includes(tx) || ty >= AISLE_OPEN_FROM, '단상 앞 길은 비운다');
  }
});

test('문 배치: 방명록 왼쪽 위, 갤러리 오른쪽 위, 마음 전하기 왼쪽 아래, 예식 안내소 오른쪽 아래', () => {
  assert.equal(HUB_DOORS.story, undefined);
  const { guestbook, gallery, gifts, info } = HUB_DOORS;
  assert.equal(guestbook.door.tx, 1); assert.equal(gallery.door.tx, 9); assert.equal(gifts.door.tx, 1); assert.equal(info.door.tx, 9);
  assert.equal(guestbook.door.ty, gallery.door.ty); assert.equal(gifts.door.ty, info.door.ty);
  assert.equal(gifts.door.ty, guestbook.door.ty + 4, '두 번째 줄');
});

test('guestPlacements: 제외 타일 회피, 잔디 위, 서로 인접하지 않음, 결정적', () => {
  const entries = Array.from({ length: 40 }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: `축하 ${i}` }));
  const reserved = new Set(['3,3', '7,3', '5,20']);
  const a = guestPlacements(entries, reserved);
  assert.ok(a.length >= 10 && a.length <= 30, `배치 수 ${a.length}`);
  assert.deepEqual(a, guestPlacements(entries, reserved));
  for (const g of a) {
    assert.ok(!reserved.has(`${g.tx},${g.ty}`));
    assert.ok('GWEJUN'.includes(HUB_ROWS[g.ty][g.tx]), '잔디 또는 돌길 위');
    assert.ok(GUEST_ZONE.cols.includes(g.tx) && g.ty >= GUEST_ZONE.rowMin && g.ty <= GUEST_ZONE.rowMax, '버진로드 양옆 구역 안');
    assert.ok(g.entry.n.startsWith('손님'));
  }
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    assert.ok(a[i].tx !== a[j].tx || Math.abs(a[i].ty - a[j].ty) > 1, '같은 열 바로 위아래 금지');
  }
});

test('guestPlacements: 항목이 적으면 그 수만큼', () => {
  assert.equal(guestPlacements([{ t: 1, n: 'a', c: 0, m: 'm' }], new Set()).length, 1);
  assert.deepEqual(guestPlacements([], new Set()), []);
});

test('withExtras: 실제 하객이 20명보다 적으면 "하객"으로 채우고, 많으면 그대로', () => {
  const real = (n) => Array.from({ length: n }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: '축하' }));
  assert.equal(MIN_CROWD, 20);
  assert.equal(withExtras(real(0)).length, 20);
  assert.equal(withExtras(real(4)).filter((e) => e.n === '하객').length, 16);
  assert.equal(withExtras(real(24)).length, 24);
  assert.ok(withExtras(real(0)).every((e) => e.m === '' && e.extra !== undefined), '메시지 없음 → 축하 개수에 안 잡힘');
});

test('분위기용 하객은 군중 전용 그림과 일반 프리셋을 반반 섞으며, 그림이 없으면 프리셋으로 돌아간다', () => {
  const sheet = (tag) => ({ down: [{ w: 48, h: 72, tag }], up: [{ w: 48, h: 72, tag }], left: [{ w: 48, h: 72, tag }], right: [{ w: 48, h: 72, tag }] });
  const characters = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`guest-extra-${i}`, sheet(`extra${i}`)]));
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { characters }, data: { messages: [{ t: 1, n: '친구', c: 3, m: '축하' }] } });
  const extras = [...hub.guestMap.entries()].filter(([k]) => k.startsWith('extra:'));
  const usingExtra = extras.filter(([, n]) => n.character.sprites.down[0].tag?.startsWith('extra'));
  assert.equal(usingExtra.length, Math.ceil(extras.length / 2), `군중 그림 ${usingExtra.length}/${extras.length}`);
  assert.equal(new Set(usingExtra.map(([, n]) => n.character.sprites.down[0].tag)).size, 6, '여섯 종류를 모두 쓴다');
  assert.equal(hub.guestMap.get('친구:3').character.sprites.down[0].tag, undefined, '실제 하객은 자기가 고른 프리셋');
  const plain = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: [] } });
  assert.ok([...plain.guestMap.values()].every((n) => n.character.sprites.down[0].tag === undefined), '그림이 없으면 프리셋');
});
