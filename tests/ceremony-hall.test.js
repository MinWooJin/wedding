import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sceneAt, along, SEATS, STAGE, END_T, HALL, guestPose } from '../js/world/ceremony-timeline.js';
import { framesFromStrip, assetFilename } from '../js/assets.js';
import { createHub, HUB_DOORS, HUB_SPAWN } from '../js/world/hub.js';
import { createInfo } from '../js/world/info.js';
import { ceremonyArt, CeremonyScene } from '../js/world/ceremony.js';
import { DEFAULT_CONFIG } from '../js/config.js';
import { findPath } from '../js/world/movement.js';

const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
const png = (path) => { const b = readFileSync(new URL(`../assets/${path}`, import.meta.url)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

test('예식 장면 타임라인: 신랑 입장 → 신부 입장(박수) → 마주 보고 맞절(하트) → 행진(꽃잎) → 단상 인사', () => {
  const s0 = sceneAt(0, { groom: '민우', bride: '새암' });
  assert.equal(s0.line, '민우 & 새암 결혼식, 지금부터 시작합니다!!');
  assert.equal(s0.groom, null); assert.equal(s0.bride, null);
  const g = sceneAt(5);
  assert.equal(g.line, '신랑 입장!');
  assert.ok(g.groom.kind === 'sheet' && g.groom.frame <= 3 && g.groom.y > STAGE.groom.y, '뒷모습으로 걸어 올라오는 중');
  assert.deepEqual({ x: sceneAt(7.6).groom.x, y: sceneAt(7.6).groom.y }, STAGE.groom, '단상 자리 도착');
  const b = sceneAt(10);
  assert.ok(b.clap && b.bride.frame <= 3, '신부 입장 때 박수');
  assert.deepEqual([sceneAt(13).groom.frame, sceneAt(13).bride.frame], [4, 4], '마주 보기');
  const bow = sceneAt(14.2);
  assert.deepEqual([bow.groom.frame, bow.bride.frame], [5, 5], '맞절');
  assert.ok(bow.hearts.length > 0, '하트');
  const march = sceneAt(20);
  assert.ok(march.groom.kind === 'front' && march.petals.length > 0 && march.clap, '행진: 정면 걷기, 꽃잎, 박수');
  assert.ok(march.groom.y > STAGE.groom.y, '단상에서 내려와 아래로');
  const end = sceneAt(END_T + 1);
  assert.ok(end.done);
  assert.deepEqual([end.groom.frame, end.bride.frame, end.groom.y], [6, 6, STAGE.groom.y], '마지막은 단상에서 정면 인사');
  assert.equal(end.line, '와 주셔서 감사합니다 ♥');
});

test('경로·좌석·박수 박자', () => {
  const path = [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }];
  assert.deepEqual(along(path, 0, 2, 0), { x: 0, y: 0 });
  assert.deepEqual(along(path, 0, 2, 1), { x: 0, y: 10 });
  assert.deepEqual(along(path, 0, 2, 5), { x: 10, y: 10 });
  assert.equal(SEATS.length, 32);
  assert.ok(SEATS.every((s) => s.person >= 0 && s.person < 6 && s.x > 0 && s.x < HALL.w));
  assert.ok(SEATS.every((s) => s.x + 20 <= 144 || s.x - 20 >= 208), '버진로드(x144~208)에는 아무도 앉지 않는다');
  assert.equal(guestPose(3, 1, false), 0);
  const poses = new Set(Array.from({ length: 8 }, (_, i) => guestPose(i, 1.1, true)));
  assert.deepEqual([...poses].sort(), [0, 1], '박수 박자를 엇갈린다');
});

test('가로 프레임 시트는 프레임 크기 그대로 자르고, 등록된 시트·예식 그림 규격이 맞다', () => {
  const cuts = [];
  const frames = framesFromStrip({ width: 384 }, 48, 72, 8, (sx) => { cuts.push(sx); return { width: 48, height: 72 }; });
  assert.equal(frames.length, 8);
  assert.deepEqual(cuts, [0, 48, 96, 144, 192, 240, 288, 336]);
  assert.equal(framesFromStrip({ width: 100 }, 48, 72, 8, () => ({ width: 48, height: 72 })).length, 2, '그림이 짧으면 있는 만큼만');
  for (const [id, sheet] of Object.entries(manifest.ceremonySheets)) {
    const d = png(sheet.file);
    assert.equal(d.w, sheet.frameWidth * sheet.frames, `${id} 폭`); assert.equal(d.h, sheet.frameHeight, `${id} 높이`);
  }
  assert.deepEqual(png(`ceremony/${assetFilename(manifest, 'ceremony', 'back')}`), { w: 352, h: 288 });
  assert.deepEqual(png(`ceremony/${assetFilename(manifest, 'ceremony', 'front')}`), { w: 352, h: 288 });
  assert.deepEqual(png(`ceremony/${assetFilename(manifest, 'ceremony', 'map')}`), { w: 352, h: 200 });
});

test('예식 그림이 모두 있으면 안내소는 예식 안내관, 하나라도 없으면 예전 안내소 방', () => {
  const fake = { width: 352, height: 288 };
  const sprite = { w: 48, h: 72, canvas: {} };
  const sheets = { 'groom-ceremony': Array(8).fill(sprite), 'bride-ceremony': Array(8).fill(sprite), 'guest-seated': Array(12).fill({ w: 40, h: 48, canvas: {} }) };
  const game = { config: DEFAULT_CONFIG, profile: { nickname: '나' }, data: { messages: [] }, assets: { ceremony: { back: fake, front: fake }, ceremonySheets: sheets } };
  assert.ok(ceremonyArt(game.assets));
  const hall = createInfo(game);
  assert.ok(hall instanceof CeremonyScene);
  assert.equal(hall.entrances.find((e) => e.to === 'hub').spawn, HUB_DOORS.info.back, '"정원으로"는 광장의 예식 안내소 앞으로');
  hall.update(1); assert.equal(hall.t, 1);
  hall.onTap(); assert.equal(hall.t, END_T, '누르면 끝 장면으로 건너뛴다');
  const old = createInfo({ ...game, assets: { ceremony: { back: fake } } });
  assert.ok(!(old instanceof CeremonyScene), '그림이 빠지면 예전 방');
});

test('입구 랜드마크는 문·통로를 막지 않고 발 기준이 타일 바닥에 맞는다', () => {
  const objects = Object.fromEntries(manifest.objects.map((id) => { const d = png(`objects/${assetFilename(manifest, 'objects', id)}`); return [id, { w: d.w, h: d.h }]; }));
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects }, data: { messages: [] } });
  const lm = Object.fromEntries(['gallery', 'gifts', 'info'].map((id) => [id, hub.objects.find((o) => o.id === `sign-${id}`)]));
  assert.deepEqual(Object.values(lm).map((o) => o.sprite), ['landmark-gallery', 'landmark-gifts', 'landmark-info']);
  assert.deepEqual([lm.gallery.bottom, lm.gifts.bottom, lm.info.bottom], [672, 832, 832], '20행·25행 바닥(그림 아래 문구 자리)');
  assert.deepEqual(['guestbook', 'gallery', 'gifts', 'info'].map((id) => hub.objects.find((o) => o.id === `sign-${id}`).caption), ['방명록', '갤러리', '마음 보내기', '예식장'], '상자 없는 문구');
  assert.ok(lm.gallery.bottom + 3 + 16 < lm.info.drawY, '위 줄 문구가 아래 줄 그림과 겹치지 않는다');
  assert.ok(Object.values(lm).every((o) => !o.label && o.interact && o.instant), '이름표 없이 그림을 누르면 바로 이동');
  const gb = hub.objects.find((o) => o.id === 'sign-guestbook');
  assert.equal(gb.bottom, 672, '방명록도 위 줄 바닥에 맞춘다');
  assert.equal(lm.gallery.tx - 6, 1, '위 줄은 왼쪽 1~3열·오른쪽 7~9열 칸');
  assert.deepEqual([lm.gifts.tx, lm.info.tx], [1, 7], '아래 줄도 같은 칸');
  for (const d of Object.values(HUB_DOORS)) {
    assert.equal(hub.isSolidTile(d.door.tx, d.door.ty), false);
    assert.ok(findPath(hub.map.w, hub.map.h, (x, y) => hub.isSolidTile(x, y), HUB_SPAWN, d.back), `${d.label} 앞까지 걸어갈 수 있다`);
  }
  for (let ty = 18; ty <= 25; ty++) assert.equal(hub.isSolidTile(5, ty), false, '가운데 통로');
  const plain = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: {}, data: { messages: [] } });
  assert.equal(plain.objects.find((o) => o.id === 'sign-gallery').sprite, 'sign', '그림이 없으면 표지판');
});

test('광장 입구 그림을 누르면 걸어가지 않고 바로 그 공간으로 넘어간다', () => {
  const objects = Object.fromEntries(manifest.objects.map((id) => { const d = png(`objects/${assetFilename(manifest, 'objects', id)}`); return [id, { w: d.w, h: d.h }]; }));
  const hub = createHub({ config: DEFAULT_CONFIG, profile: { nickname: '나' }, assets: { objects }, data: { messages: [] } });
  const went = [];
  const player = { x: 176, y: 252, stop() { this.stopped = true; }, followPath() { this.walked = true; } };
  const game = { player, goTo: (id) => went.push(id) };
  for (const id of ['guestbook', 'gallery', 'gifts', 'info']) {
    const o = hub.objects.find((x) => x.id === `sign-${id}`);
    hub.onTap(o.tx * 32 + o.spr.w / 2, o.drawY + o.spr.h / 2, game);
  }
  assert.deepEqual(went, ['guestbook', 'gallery', 'gifts', 'info']);
  assert.equal(player.walked, undefined, '먼저 걸어가지 않는다');
});
