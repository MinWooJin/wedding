import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bgm, canonEvents, marchEvents, MARCH_SECONDS, MARCH_TEMPO, TRACKS, freq, LOOP_SECONDS, BEAT } from '../js/audio/bgm.js';

// 단언이 실패해 clearInterval에 닿지 못해도 테스트 프로세스가 멈추지 않게 한다
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (...a) => { const t = realSetInterval(...a); t.unref?.(); return t; };

/** 노드에서 쓰는 가짜 AudioContext: 만든 소리와 볼륨 변화를 기록한다 */
function fakeContext() {
  const log = { notes: [], gains: [], stops: [], resumed: 0, suspended: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime(v) { log.gains.push(v); }, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    state: 'suspended', currentTime: 0, destination: {},
    createGain: () => ({ gain: param(), connect() {} }),
    createOscillator: () => ({ type: '', frequency: { value: 0 }, connect() {}, start(t) { log.notes.push(t); }, stop(t) { log.stops.push(t); } }),
    resume() { log.resumed++; ctx.state = 'running'; return Promise.resolve(); },
    suspend() { log.suspended++; ctx.state = 'suspended'; return Promise.resolve(); },
  };
  return { ctx, log };
}
const memoryStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('음 높이와 밝은 캐논 한 바퀴(저음 8개 × 4회 = 64박, 96bpm)', () => {
  assert.ok(Math.abs(freq('A4') - 440) < 1e-9);
  assert.ok(Math.abs(freq('A3') - 220) < 1e-9);
  const ev = canonEvents();
  assert.equal(ev.filter((e) => e.kind === 'bass').length, 8 * 4 * 4, '8분음표로 튀는 저음');
  assert.equal(ev.filter((e) => e.kind === 'lead').length, 16 + 8 + 16 + 8);
  assert.ok(ev.some((e) => e.kind === 'bell') && ev.some((e) => e.kind === 'tick'), '종소리와 가벼운 박자');
  assert.ok(ev.filter((e) => e.kind === 'tick').every((e) => e.t >= 16 * BEAT), '첫 바퀴는 박자 없이 부드럽게 시작');
  assert.ok(Math.abs(LOOP_SECONDS - 64 * BEAT) < 1e-9);
  assert.ok(Math.abs(BEAT - 60 / 96) < 1e-9);
  assert.ok(ev.every((e) => e.t >= 0 && e.t < LOOP_SECONDS), '한 바퀴 안에서 시작한다');
  assert.ok(ev.filter((e) => e.kind !== 'bell').every((e) => e.t + e.dur <= LOOP_SECONDS + 1e-9), '종소리 여운 외에는 한 바퀴 안에 끝난다');
});

test('첫 터치 전에는 소리를 내지 않고, 깨운 뒤 시작하면 예약하고 볼륨을 올린다', () => {
  const { ctx, log } = fakeContext();
  const bgm = new Bgm({ createContext: () => ctx, storage: memoryStorage() });
  bgm.start();
  assert.equal(log.notes.length, 0, '깨우기 전에는 아무 것도 하지 않는다');
  assert.equal(bgm.unlock(), true);
  assert.equal(log.resumed, 1, '첫 터치에서 오디오를 깨운다');
  try {
    bgm.start();
    assert.ok(log.notes.length >= canonEvents().filter((e) => e.kind !== 'tick').length, '한 바퀴를 예약(박자 잡음은 지원하는 브라우저에서만)');
    assert.ok(log.gains.at(-1) > 0, '볼륨을 올린다');
  } finally { clearInterval(bgm.timer); }
});

test('끄기·켜기를 기억하고, 끈 상태로 다시 오면 꺼진 채 시작한다. 화면이 숨으면 멈춘다', () => {
  const storage = memoryStorage();
  const a = fakeContext();
  const bgm = new Bgm({ createContext: () => a.ctx, storage });
  const seen = [];
  bgm.onChange((m) => seen.push(m));
  bgm.unlock(); bgm.start();
  bgm.toggle();
  assert.equal(bgm.muted, true);
  assert.equal(a.log.gains.at(-1), 0, '끄면 볼륨 0');
  assert.deepEqual(seen, [true]);
  bgm.setVisible(false); assert.equal(a.log.suspended, 1);
  clearInterval(bgm.timer);
  const b = fakeContext();
  const again = new Bgm({ createContext: () => b.ctx, storage });
  assert.equal(again.muted, true, '다시 와도 꺼진 상태');
  again.unlock();
  assert.equal(b.log.resumed, 0, '꺼진 상태면 깨우기만 하고 재생하지 않는다');
  again.toggle();
  assert.equal(again.muted, false);
  assert.ok(b.log.resumed >= 1 && b.log.gains.at(-1) > 0, '켜면 그 터치에서 재생');
  clearInterval(again.timer);
});

test('오디오를 만들 수 없는 브라우저에서는 조용히 넘어간다', () => {
  const bgm = new Bgm({ createContext: () => { throw new Error('no audio'); }, storage: memoryStorage() });
  assert.equal(bgm.unlock(), false);
  bgm.start(); bgm.setVisible(true);
  bgm.toggle();
  assert.equal(bgm.muted, true);
  clearInterval(bgm.timer);
});

test('예식장 결혼 행진곡: "빰 빰-빠-밤" 첫 동기와 길이', () => {
  const ev = marchEvents();
  const lead = ev.filter((e) => e.kind === 'lead');
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  assert.ok(['G4', 'C5', 'C5', 'C5'].every((n, i) => near(lead[i].f, freq(n))), '솔-도-도-도');
  assert.ok(near(lead[1].dur / lead[2].dur, 3), '점음표 리듬(1.5박 : 0.5박)');
  assert.ok(Math.abs(MARCH_SECONDS - 80 * 60 / MARCH_TEMPO) < 1e-9, '8프레이즈 × 2회');
  assert.ok(MARCH_TEMPO >= 100, '신나는 빠르기');
  assert.equal(ev.filter((e) => e.kind === 'bass').length, 8 * 5 * 2, '박마다 쿵');
  assert.equal(ev.filter((e) => e.kind === 'tick').length, 8 * 5 * 2, '엇박마다 짝');
  const second = lead.slice(lead.length / 2);
  assert.ok(second.every((e, i) => Math.abs(e.f / lead[i].f - 2) < 1e-6), '두 번째 반복은 선율이 한 옥타브 위');
  assert.ok(ev.every((e) => e.t >= 0 && e.t < MARCH_SECONDS));
  assert.deepEqual(Object.keys(TRACKS), ['garden', 'march']);
});

test('곡 바꾸기: 예식장에 들어가면 행진곡으로, 지금 곡은 줄이며 멈추고 새 곡을 바로 예약', () => {
  const { ctx, log } = fakeContext();
  const bgm = new Bgm({ createContext: () => ctx, storage: memoryStorage() });
  try {
    bgm.unlock(); bgm.start();
    assert.equal(bgm.track, 'garden');
    const before = log.notes.length;
    ctx.currentTime = 5;
    bgm.play('march');
    assert.equal(bgm.track, 'march');
    assert.ok(log.stops.some((t) => Math.abs(t - 5.65) < 1e-9), '정원 곡 소리를 멈춘다');
    assert.ok(log.notes.length - before >= marchEvents().filter((e) => e.kind !== 'tick').length, '행진곡 한 바퀴를 예약(박자 잡음 제외)');
    assert.ok(Math.abs(bgm.loopSeconds - MARCH_SECONDS) < 1e-9);
    const n = log.notes.length;
    bgm.play('march');
    assert.equal(log.notes.length, n, '같은 곡이면 다시 시작하지 않는다');
    bgm.play('march', { restart: true });
    assert.ok(log.notes.length > n, '다시 보기는 처음부터');
    bgm.play('garden');
    assert.equal(bgm.track, 'garden');
  } finally { clearInterval(bgm.timer); }
});

test('시작 전에 곡을 고르면 시작할 때 그 곡으로 튼다', () => {
  const { ctx } = fakeContext();
  const bgm = new Bgm({ createContext: () => ctx, storage: memoryStorage() });
  try {
    bgm.play('march');
    bgm.unlock(); bgm.start();
    assert.equal(bgm.track, 'march');
    assert.ok(Math.abs(bgm.loopSeconds - MARCH_SECONDS) < 1e-9);
  } finally { clearInterval(bgm.timer); }
});

