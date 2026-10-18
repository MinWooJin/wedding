// 정원 배경음악: 파헬벨 '캐논 D장조'(1700년경, 퍼블릭 도메인 작품)를 밝은 웨딩 축하곡 느낌으로 직접 편곡해 Web Audio로 합성한다.
// 녹음 파일을 쓰지 않으므로 음원 저작권·용량 문제가 없다. 빠른 템포, 통통 튀는 저음, 오르골 같은 종소리, 가벼운 박자로 밝게.
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
/** 위 선율 네 갈래(박 단위): 경쾌한 4분음표 선율 → 2분음표 노래 → 다시 4분음표 → 한 옥타브 위 축하 */
const MELODY_Q = [['D5', 1], ['F#5', 1], ['A5', 1], ['G5', 1], ['F#5', 1], ['D5', 1], ['F#5', 1], ['E5', 1],
  ['D5', 1], ['B4', 1], ['D5', 1], ['A4', 1], ['G4', 1], ['B4', 1], ['A4', 1], ['G4', 1]];
const MELODY_H = [['F#5', 2], ['E5', 2], ['D5', 2], ['C#5', 2], ['B4', 2], ['A4', 2], ['B4', 2], ['C#5', 2]];
const up = (voice) => voice.map(([n, b]) => [n.replace(/\d$/, (d) => String(Number(d) + 1)), b]);
const VOICES = [MELODY_Q, MELODY_H, MELODY_Q, up(MELODY_H)];

export const TEMPO = 96; // 밝고 경쾌하게(걷는 속도보다 조금 빠르게)
export const BEAT = 60 / TEMPO;
const octave = (n, k = 1) => n.replace(/\d$/, (d) => String(Number(d) + k));

/**
 * 한 바퀴(저음 8개 × 4회 = 64박)의 음표 목록. 시간은 초.
 * { t, dur, f, kind: 'bass'|'bell'|'lead'|'tick', vol }
 */
export function canonEvents() {
  const out = [];
  VOICES.forEach((voice, pass) => {
    const base = pass * BASS.length * 2 * BEAT;
    BASS.forEach((b, i) => {
      const t = base + i * 2 * BEAT;
      // 통통 튀는 저음: 8분음표로 근음-옥타브-5도-옥타브
      const root = b, fifth = CHORDS[i][2].replace(/\d$/, '3');
      [root, octave(root), fifth, octave(root)].forEach((n, k) => out.push({ t: t + k * BEAT / 2, dur: BEAT / 2 * 0.8, f: freq(n), kind: 'bass', vol: 0.42 }));
      // 오르골 같은 종소리 화음: 한 옥타브 위에서 위로 굴린다
      [...CHORDS[i], octave(CHORDS[i][0])].forEach((n, k) => out.push({ t: t + k * BEAT / 2, dur: BEAT * 1.2, f: freq(octave(n)), kind: 'bell', vol: pass === 1 ? 0.14 : 0.18 }));
      // 가벼운 박자: 엇박 8분음표마다 작은 '칙'(첫 바퀴는 쉬어 시작을 부드럽게)
      if (pass > 0) for (let k = 0; k < 2; k++) out.push({ t: t + k * BEAT + BEAT / 2, dur: 0.05, f: 0, kind: 'tick', vol: 0.08 });
    });
    let t = base;
    for (const [n, beats] of voice) { out.push({ t, dur: beats * BEAT * 0.9, f: freq(n), kind: 'lead', vol: 0.3 }); t += beats * BEAT; }
  });
  return out;
}
export const LOOP_SECONDS = VOICES.length * BASS.length * 2 * BEAT;

/**
 * 예식장 BGM: 바그너 '로엔그린' 중 결혼 행진곡(1850년, 퍼블릭 도메인 작품)을 신나는 행진으로 직접 편곡.
 * 다장조 4/4, 112bpm. "빰 | 빰.빠 빰 빰" 동기(못갖춘마디는 앞 마디 4박째).
 * 반주는 전형적인 행진: 1·3박 저음, 2·4박 브라스 같은 짧은 화음 + 스네어, 큰 마디 첫 박 심벌. 선율 위로 종소리 한 옥타브.
 * 두 번째 반복은 선율이 한 옥타브 위로 올라가 더 화려하다.
 */
export const MARCH_TEMPO = 112;
/** 마디별 선율(음, 박) — 각 마디 정확히 4박. 마디 끝 'G4' 1박은 다음 마디로 들어가는 못갖춘마디 */
const MARCH_BARS = [
  { lead: [['C5', 1.5], ['C5', 0.5], ['C5', 1], ['G4', 1]], chords: ['C', 'C'] },
  { lead: [['D5', 1.5], ['B4', 0.5], ['C5', 1], ['G4', 1]], chords: ['G', 'C'] },
  { lead: [['C5', 1.5], ['F5', 0.5], ['F5', 2]], chords: ['C', 'F'] },
  { lead: [['E5', 1.5], ['D5', 0.5], ['C5', 1], ['B4', 1]], chords: ['C', 'G'] },
  { lead: [['C5', 1], ['D5', 1], ['E5', 1], ['G4', 1]], chords: ['C', 'G'] },
  { lead: [['C5', 1.5], ['C5', 0.5], ['C5', 1], ['G4', 1]], chords: ['C', 'C'] },
  { lead: [['D5', 1.5], ['B4', 0.5], ['C5', 1], ['G4', 1]], chords: ['G', 'C'] },
  { lead: [['C5', 1.5], ['F5', 0.5], ['E5', 1], ['D5', 1]], chords: ['F', 'G'] },
  { lead: [['C5', 1.5], ['B4', 0.5], ['C5', 1], ['G4', 1]], chords: ['G', 'C'] },
];
/** 화음: 저음 근음·5도, 브라스 화음 세 음 */
const MARCH_CHORDS = {
  C: { root: 'C3', fifth: 'G3', tones: ['E4', 'G4', 'C5'] },
  F: { root: 'F2', fifth: 'C3', tones: ['F4', 'A4', 'C5'] },
  G: { root: 'G2', fifth: 'D3', tones: ['D4', 'G4', 'B4'] },
};
const MARCH_PASSES = 2;
const upOctave = (n) => n.replace(/\d$/, (d) => String(Number(d) + 1));

/** 결혼 행진곡 한 바퀴(9마디 × 4박 × 2회 = 72박) */
export function marchEvents() {
  const beat = 60 / MARCH_TEMPO, out = [];
  for (let pass = 0; pass < MARCH_PASSES; pass++) {
    MARCH_BARS.forEach((bar, i) => {
      const base = (pass * MARCH_BARS.length + i) * 4 * beat;
      // 선율: 또렷하게 끊고, 종소리를 한 옥타브 위에 겹친다. 두 번째 반복은 선율 자체도 한 옥타브 위
      let t = base;
      for (const [n, b] of bar.lead) {
        const note = pass ? upOctave(n) : n;
        out.push({ t, dur: b * beat * 0.8, f: freq(note), kind: 'lead', vol: 0.3 });
        out.push({ t, dur: b * beat * 1.2, f: freq(upOctave(note)), kind: 'bell', vol: pass ? 0.12 : 0.1 });
        t += b * beat;
      }
      // 반주: 쿵(1박 근음) 짝(2박 화음+스네어) 쿵(3박 5도) 짝(4박 화음+스네어)
      for (let b = 0; b < 4; b++) {
        const ch = MARCH_CHORDS[bar.chords[b < 2 ? 0 : 1]], at = base + b * beat;
        if (b % 2 === 0) out.push({ t: at, dur: beat * 0.6, f: freq(b === 0 ? ch.root : ch.fifth), kind: 'bass', vol: 0.5 });
        else {
          ch.tones.forEach((n) => out.push({ t: at, dur: beat * 0.35, f: freq(n), kind: 'brass', vol: 0.07 }));
          out.push({ t: at, dur: 0.07, f: 0, kind: 'tick', vol: 0.13 });
        }
        out.push({ t: at + beat / 2, dur: 0.04, f: 0, kind: 'tick', vol: 0.05 }); // 8분 하이햇
      }
      if (i % 4 === 0) out.push({ t: base, dur: 0.5, f: 0, kind: 'crash', vol: 0.1 }); // 큰 마디 첫 박 심벌
    });
  }
  return out;
}
export const MARCH_SECONDS = MARCH_PASSES * MARCH_BARS.length * 4 * 60 / MARCH_TEMPO;

/** 곡 목록: 정원은 밝은 캐논, 예식장은 결혼 행진곡 */
export const TRACKS = {
  garden: { events: canonEvents, seconds: LOOP_SECONDS },
  // 예식장: 멘델스존 결혼행진곡 실제 연주 녹음(퍼블릭 도메인, assets/audio/README.md). 파일을 못 읽으면 합성한 바그너 행진곡으로.
  march: { file: 'assets/audio/wedding-march.mp3', events: marchEvents, seconds: MARCH_SECONDS },
};

const PREF_KEY = 'pixel-wedding-bgm';
const WAVES = { bass: 'triangle', bell: 'sine', lead: 'square', organ: 'triangle', brass: 'square' };

export class Bgm {
  /**
   * @param {{ createContext?: () => AudioContext, storage?: Storage, volume?: number }} o
   */
  constructor({ createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(), storage = safeStorage(), volume = 0.1, fetchImpl = (u) => globalThis.fetch(u), fileVolume = 4 } = {}) {
    this.createContext = createContext; this.storage = storage; this.volume = volume;
    // 녹음 파일은 합성음보다 조용하게 들리므로 버스에서 키운다(전체 볼륨 0.1 × 4 ≈ 0.4)
    this.fetchImpl = fetchImpl; this.fileVolume = fileVolume; this.buffers = new Map(); this.playToken = 0;
    this.ctx = null; this.master = null; this.timer = null; this.nextLoop = 0; this.listeners = new Set();
    this.muted = readPref(storage) === 'off'; // 기본은 켬. 하객이 끈 적이 있으면 꺼진 채로 시작
    this.track = 'garden'; this.bus = null; this.voices = [];
    this.events = TRACKS.garden.events(); this.loopSeconds = TRACKS.garden.seconds;
  }

  /**
   * 곡 바꾸기(정원 ↔ 예식장). 지금 곡은 0.6초에 걸쳐 줄이며 끊고, 새 곡을 처음부터 이어 튼다.
   * restart: 같은 곡이어도 처음부터(예식 다시 보기).
   */
  play(track, { restart = false } = {}) {
    if (!TRACKS[track] || (track === this.track && !restart)) return;
    this.track = track;
    this.events = TRACKS[track].events(); this.loopSeconds = TRACKS[track].seconds;
    if (!this.ctx || !this.timer) return; // 아직 시작 전이면 시작할 때 이 곡으로
    this.fadeOutCurrent();
    this.beginTrack(0.7);
  }

  /** 지금 버스를 0.6초에 걸쳐 줄이고 아직 울릴 소리를 멈춘다 */
  fadeOutCurrent() {
    const now = this.ctx.currentTime, old = this.bus, oldVoices = this.voices;
    this.playToken++; // 아직 불러오는 중인 녹음 파일이 늦게 도착해도 틀지 않게
    if (!old) return;
    old.gain.setValueAtTime(old.gain.value, now);
    old.gain.linearRampToValueAtTime(0, now + 0.6);
    for (const v of oldVoices) { try { v.stop(now + 0.65); } catch {} }
  }

  /** 현재 곡을 delay초 뒤부터. 녹음 파일 곡이면 불러와서 반복 재생, 실패하면 합성음으로 */
  beginTrack(delay) {
    this.newBus();
    const file = TRACKS[this.track].file;
    if (!file) { this.nextLoop = this.ctx.currentTime + delay; this.schedule(); return; }
    this.nextLoop = Infinity; // 녹음 곡 동안 합성 예약은 쉰다
    const token = this.playToken, bus = this.bus;
    this.loadBuffer(file).then((buffer) => {
      if (token !== this.playToken) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer; src.loop = true;
      bus.gain.setValueAtTime(this.fileVolume, this.ctx.currentTime);
      src.connect(bus);
      src.start(this.ctx.currentTime + 0.05);
      src.endsAt = Infinity; this.voices.push(src);
    }).catch(() => {
      if (token !== this.playToken) return;
      this.nextLoop = this.ctx.currentTime + 0.1; this.schedule(); // 파일이 없거나 못 읽으면 합성한 행진곡
    });
  }

  /** 녹음 파일을 한 번만 받아 해독해 둔다 */
  loadBuffer(url) {
    if (!this.buffers.has(url)) {
      const p = Promise.resolve(this.fetchImpl(url))
        .then((r) => { if (!r.ok) throw new Error(`audio ${r.status}`); return r.arrayBuffer(); })
        .then((data) => new Promise((resolve, reject) => {
          const result = this.ctx.decodeAudioData(data, resolve, reject); // 옛 사파리는 콜백 방식
          if (result?.then) result.then(resolve, reject);
        }));
      p.catch(() => this.buffers.delete(url)); // 실패하면 다음에 다시 시도
      this.buffers.set(url, p);
    }
    return this.buffers.get(url);
  }

  newBus() {
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(this.master);
    this.voices = [];
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
    this.timer = setInterval(() => this.schedule(), 200);
    this.beginTrack(0.3);
    this.applyVolume(2);
  }

  /** 앞으로 몇 초 안에 울릴 바퀴를 미리 예약한다(한 바퀴씩) */
  schedule() {
    if (!this.ctx) return;
    while (this.nextLoop < this.ctx.currentTime + 2) {
      const at = this.nextLoop;
      for (const e of this.events) this.playNote(at + e.t, e);
      this.nextLoop += this.loopSeconds;
      // 끝난 소리는 목록에서 뺀다(곡을 바꿀 때 아직 울릴 소리만 멈추면 된다)
      const now = this.ctx.currentTime;
      this.voices = this.voices.filter((v) => v.endsAt > now);
    }
  }

  playNote(at, e) {
    if (e.kind === 'tick' || e.kind === 'crash') { this.playTick(at, e); return; }
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = WAVES[e.kind]; o.frequency.value = e.f;
    g.gain.setValueAtTime(0, at);
    if (e.kind === 'bell') {
      // 종·오르골: 바로 울리고 길게 사라진다
      g.gain.linearRampToValueAtTime(e.vol, at + 0.005);
      g.gain.setTargetAtTime(0, at + 0.01, e.dur * 0.35);
    } else {
      // 부드러운 시작·끝(딱딱 끊기는 소리 방지)
      g.gain.linearRampToValueAtTime(e.vol, at + 0.015);
      g.gain.setTargetAtTime(e.vol * 0.6, at + 0.04, e.dur * 0.5);
      g.gain.linearRampToValueAtTime(0, at + e.dur);
    }
    o.connect(g); g.connect(this.bus ?? this.master);
    o.start(at); o.stop(at + e.dur + 0.05);
    o.endsAt = at + e.dur + 0.05; this.voices.push(o);
  }

  /** 가벼운 박자(짧은 잡음). 잡음 버퍼는 한 번만 만든다. 지원하지 않는 브라우저는 건너뛴다. */
  playTick(at, e) {
    if (!this.ctx.createBuffer || !this.ctx.createBufferSource) return;
    if (!this.noise) {
      const len = Math.floor((this.ctx.sampleRate || 44100) * 0.5); // 심벌까지 쓰도록 0.5초
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate || 44100);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = this.noise;
    // 짧게 사라지는 소리(스네어·하이햇은 빨리, 심벌은 길게)
    g.gain.setValueAtTime(e.vol, at);
    g.gain.setTargetAtTime(0, at, e.kind === 'crash' ? 0.15 : 0.015);
    src.connect(g); g.connect(this.bus ?? this.master);
    src.start(at); src.stop?.(at + e.dur);
    src.endsAt = at + e.dur; this.voices.push(src);
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
