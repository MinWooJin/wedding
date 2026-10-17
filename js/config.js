export const DEFAULT_CONFIG = {
  groom: { name: '신랑', shortName: '', relation: '아들', phone: '', parents: [], account: { bank: '', number: '', holder: '', kakaopay: '' } },
  bride: { name: '신부', shortName: '', relation: '딸', phone: '', parents: [], account: { bank: '', number: '', holder: '', kakaopay: '' } },
  wedding: {
    date: '2027-01-01T12:00:00+09:00',
    venue: '', hall: '', address: '',
    notice: '', // 장소 안내와 함께 보여줄 양해 문구(선택)
    map: { kakao: '', naver: '', tmap: '' },
    transport: { subway: '', bus: '', parking: '' },
  },
  greetings: ['정원에 와주셔서 감사해요!', '멀리서 보내주시는 축하도 감사히 간직할게요 🌸', '천천히 둘러보세요~'],
  guestbookApi: '',
  kakaoJsKey: '',
  siteUrl: '',
  classicUrl: '',
  gifts: { declineMoney: false, notice: '' },
};

/** 청첩장식 혼주 표기: "진영근 · 박순이의 아들 진민우" */
export function familyLine(person) {
  const parents = (person.parents ?? []).map((p) => p.name).filter(Boolean).join(' · ');
  return parents ? `${parents}의 ${person.relation || ''} ${person.name}`.replace(/\s+/g, ' ').trim() : person.name;
}

/** 게임 안(HUD·이름표·인트로)에서 쓰는 호칭. shortName이 없으면 본명. 공적인 문구(예식 안내·연락처·계좌·공유·캘린더)는 name을 쓴다. */
export const displayName = (person) => person.shortName || person.name;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = (value) => typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));

export function mergeConfig(base, over) {
  if (!isObj(over)) return clone(base);
  const out = clone(base);
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    out[k] = isObj(v) && isObj(out[k]) ? mergeConfig(out[k], v) : clone(v);
  }
  return out;
}

export async function loadConfig(url = 'data/config.json') {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    return mergeConfig(DEFAULT_CONFIG, await res.json());
  } catch (e) {
    console.warn('config.json 로드 실패, 기본값 사용', e);
    return clone(DEFAULT_CONFIG);
  }
}

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function daysUntil(iso, now = new Date()) {
  return Math.round((dayStart(new Date(iso)) - dayStart(now)) / 86400000);
}

export function ddayLabel(iso, now = new Date()) {
  const n = daysUntil(iso, now);
  if (n > 0) return `D-${n}`;
  if (n === 0) return 'D-Day';
  return '감사합니다';
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function formatDate(iso) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${ampm} ${h12}시${m ? ` ${m}분` : ''}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일 ${time}`;
}
