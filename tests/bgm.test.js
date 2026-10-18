import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bgm, canonEvents, freq, LOOP_SECONDS, BEAT } from '../js/audio/bgm.js';

/** 노드에서 쓰는 가짜 AudioContext: 만든 소리와 볼륨 변화를 기록한다 */
function fakeContext() {
  const log = { notes: [], gains: [], resumed: 0, suspended: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime(v) { log.gains.push(v); }, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    state: 'suspended', currentTime: 0, destination: {},
    createGain: () => ({ gain: param(), connect() {} }),
    createOscillator: () => ({ type: '', frequency: { value: 0 }, connect() {}, start(t) { log.notes.push(t); }, stop() {} }),
    resume() { log.resumed++; ctx.state = 'running'; return Promise.resolve(); },
    suspend() { log.suspended++; ctx.state = 'suspended'; return Promise.resolve(); },
  };
  return { ctx, log };
}
const memoryStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('음 높이와 캐논 한 바퀴(저음 8개 × 3회 = 48박)', () => {
  assert.ok(Math.abs(freq('A4') - 440) < 1e-9);
  assert.ok(Math.abs(freq('A3') - 220) < 1e-9);
  const ev = canonEvents();
  assert.equal(ev.filter((e) => e.kind === 'bass').length, 24);
  assert.equal(ev.filter((e) => e.kind === 'lead').length, 8 + 8 + 16);
  assert.ok(Math.abs(LOOP_SECONDS - 48 * BEAT) < 1e-9);
  assert.ok(ev.every((e) => e.t >= 0 && e.t + e.dur <= LOOP_SECONDS + 1e-9), '한 바퀴 안에 끝난다');
});

test('첫 터치 전에는 소리를 내지 않고, 깨운 뒤 시작하면 예약하고 볼륨을 올린다', () => {
  const { ctx, log } = fakeContext();
  const bgm = new Bgm({ createContext: () => ctx, storage: memoryStorage() });
  bgm.start();
  assert.equal(log.notes.length, 0, '깨우기 전에는 아무 것도 하지 않는다');
  assert.equal(bgm.unlock(), true);
  assert.equal(log.resumed, 1, '첫 터치에서 오디오를 깨운다');
  bgm.start();
  assert.ok(log.notes.length >= canonEvents().length, '한 바퀴를 예약');
  assert.ok(log.gains.at(-1) > 0, '볼륨을 올린다');
  clearInterval(bgm.timer);
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
