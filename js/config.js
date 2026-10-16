export const DEFAULT_CONFIG = {
  groom: { name: '신랑', phone: '', parents: [], account: { bank: '', number: '', holder: '', kakaopay: '' } },
  bride: { name: '신부', phone: '', parents: [], account: { bank: '', number: '', holder: '', kakaopay: '' } },
  wedding: {
    date: '2027-01-01T12:00:00+09:00',
    venue: '', hall: '', address: '',
    map: { kakao: '', naver: '', tmap: '' },
    transport: { subway: '', bus: '', parking: '' },
  },
  greetings: ['와주셔서 감사해요!', '오늘 꼭 뵈어요 🌸', '천천히 둘러보세요~'],
  timeline: [],
  guestbookApi: '',
  kakaoJsKey: '',
  siteUrl: '',
};

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function mergeConfig(base, over) {
  if (!isObj(over)) return structuredClone(base);
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    out[k] = isObj(v) && isObj(out[k]) ? mergeConfig(out[k], v) : structuredClone(v);
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
    return structuredClone(DEFAULT_CONFIG);
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
