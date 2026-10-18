// 정원 배경음악: 파헬벨 '캐논 D장조'(1700년경, 퍼블릭 도메인 작품)를 직접 편곡해 Web Audio로 합성한다.
// 녹음 파일을 쓰지 않으므로 음원 저작권·용량 문제가 없고, 픽셀 정원에 어울리는 부드러운 8비트 소리가 난다.
//
// 재생 규칙
// - 브라우저는 사용자가 화면을 누르기 전에는 소리를 낼 수 없다. 첫 터치(표지의 "정원에 입장하기")에서 오디오를 깨워 바로 재생한다.
// - Web Audio는 아이폰 무음 스위치를 따른다(무음 모드면 들리지 않음). 즉 기기 설정에 따라 저절로 음소거된다.
// - 하객이 끈 상태는 기기에 기억한다. 화면이 숨으면 멈추고, 돌아오면 이어서 재생한다.

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
/** 'F#4' → 주파수(Hz) */
export function freq(name) {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

/** 캐논의 반복 저음 8개(한 음에 2박)와 그 위 화음 */
const BASS = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D2', 'G2', 'A2'];
const CHORDS = [
  ['D4', 'F#4', 'A4'], ['C#4', 'E4', 'A4'], ['B3', 'D4', 'F#4'], ['C#4', 'F#4', 'A4'],
  ['B3', 'D4', 'G4'], ['A3', 'D4', 'F#4'], ['B3', 'D4', 'G4'], ['C#4', 'E4', 'A4'],
];
/** 위 성부 세 갈래(박 단위 길이): 2분음표 두 번, 그리고 4분음표 선율 */
const VOICES = [
  [['F#5', 2], ['E5', 2], ['D5', 2], ['C#5', 2], ['B4', 2], ['A4', 2], ['B4', 2], ['C#5', 2]],
  [['D5', 2], ['C#5', 2], ['B4', 2], ['A4', 2], ['G4', 2], ['F#4', 2], ['G4', 2], ['E4', 2]],
  [['D5', 1], ['F#5', 1], ['A5', 1], ['G5', 1], ['F#5', 1], ['D5', 1], ['F#5', 1], ['E5', 1],
    ['D5', 1], ['B4', 1], ['D5', 1], ['A4', 1], ['G4', 1], ['B4', 1], ['A4', 1], ['G4', 1]],
];

export const TEMPO = 68; // 느린 행진 정도
export const BEAT = 60 / TEMPO;

/**
 * 한 바퀴(저음 8개 × 3회 = 48박)의 음표 목록. 시간은 초.
 * { t, dur, f, kind: 'bass'|'arp'|'lead', vol }
 */
export function canonEvents() {
  const out = [];
  VOICES.forEach((voice, pass) => {
    const base = pass * BASS.length * 2 * BEAT;
    BASS.forEach((b, i) => {
      const t = base + i * 2 * BEAT;
      out.push({ t, dur: 2 * BEAT * 0.95, f: freq(b), kind: 'bass', vol: 0.5 });
      // 화음은 8분음표로 부드럽게 굴린다(위아래 왕복)
      const arp = [...CHORDS[i], CHORDS[i][1]];
      arp.forEach((n, k) => out.push({ t: t + k * BEAT / 2, dur: BEAT / 2 * 0.9, f: freq(n), kind: 'arp', vol: 0.22 }));
    });
    let t = base;
    for (const [n, beats] of voice) { out.push({ t, dur: beats * BEAT * 0.92, f: freq(n), kind: 'lead', vol: 0.34 }); t += beats * BEAT; }
  });
  return out;
}
export const LOOP_SECONDS = VOICES.length * BASS.length * 2 * BEAT;

const PREF_KEY = 'pixel-wedding-bgm';
const WAVES = { bass: 'triangle', arp: 'triangle', lead: 'square' };

export class Bgm {
  /**
   * @param {{ createContext?: () => AudioContext, storage?: Storage, volume?: number }} o
   */
  constructor({ createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(), storage = safeStorage(), volume = 0.09 } = {}) {
    this.createContext = createContext; this.storage = storage; this.volume = volume;
    this.ctx = null; this.master = null; this.timer = null; this.nextLoop = 0; this.listeners = new Set();
    this.muted = readPref(storage) === 'off'; // 기본은 켬. 하객이 끈 적이 있으면 꺼진 채로 시작
    this.events = canonEvents();
  }

  /** 첫 터치 안에서 불러야 한다(브라우저 자동 재생 정책). 이미 깨어 있으면 아무 일도 하지 않는다. */
  unlock() {
    if (!this.ctx) {
      try { this.ctx = this.createContext(); } catch { return false; }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume?.();
    return true;
  }

  /** 정원이 시작될 때. 오디오가 깨어 있고 켬 상태면 재생한다. */
  start() {
    if (!this.ctx || this.timer) return;
    this.nextLoop = this.ctx.currentTime + 0.3;
    this.timer = setInterval(() => this.schedule(), 200);
    this.schedule();
    this.applyVolume(2);
  }

  /** 앞으로 몇 초 안에 울릴 바퀴를 미리 예약한다(한 바퀴씩) */
  schedule() {
    if (!this.ctx) return;
    while (this.nextLoop < this.ctx.currentTime + 2) {
      const at = this.nextLoop;
      for (const e of this.events) this.playNote(at + e.t, e);
      this.nextLoop += LOOP_SECONDS;
    }
  }

  playNote(at, e) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = WAVES[e.kind]; o.frequency.value = e.f;
    // 부드러운 시작·끝(딱딱 끊기는 소리 방지)
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(e.vol, at + 0.02);
    g.gain.setTargetAtTime(e.vol * 0.55, at + 0.05, e.dur * 0.4);
    g.gain.linearRampToValueAtTime(0, at + e.dur);
    o.connect(g); g.connect(this.master);
    o.start(at); o.stop(at + e.dur + 0.05);
  }

  applyVolume(seconds = 0.4) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime, target = this.muted ? 0 : this.volume;
    this.master.gain.cancelScheduledValues?.(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(target, now + seconds);
    if (!this.muted && this.ctx.state === 'suspended') this.ctx.resume?.();
  }

  setMuted(muted) {
    this.muted = !!muted;
    try { this.storage?.setItem(PREF_KEY, this.muted ? 'off' : 'on'); } catch {}
    this.unlock(); // 음소거를 푸는 버튼도 사용자 터치라 여기서 오디오를 깨울 수 있다
    if (!this.timer) this.start();
    this.applyVolume();
    this.listeners.forEach((fn) => fn(this.muted));
  }

  toggle() { this.setMuted(!this.muted); }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** 화면이 숨으면 멈추고 돌아오면 이어서 */
  setVisible(visible) {
    if (!this.ctx) return;
    if (!visible) this.ctx.suspend?.();
    else if (!this.muted) this.ctx.resume?.();
  }
}

function safeStorage() { try { return globalThis.localStorage ?? null; } catch { return null; } }
function readPref(storage) { try { return storage?.getItem(PREF_KEY); } catch { return null; } }
