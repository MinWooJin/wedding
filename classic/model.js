export const DEFAULT_INVITATION = '서로 다른 길을 걸어온 두 사람이\n이제 같은 길을 함께 걷고자 합니다.\n저희 두 사람의 새로운 시작을\n마음으로 함께해 주시면 감사하겠습니다.';
export const SIDE_NAMES = { groom: '신랑', bride: '신부' };
export const validSide = (side) => side === 'bride' ? 'bride' : 'groom';
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function seoulDate(value) {
  const d = new Date(value);
  if (!value || !Number.isFinite(d.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(d).map((p) => [p.type,p.value]));
  return Object.fromEntries(['year','month','day','hour','minute'].map((k) => [k,Number(parts[k])]));
}
export function calendarFor(iso) {
  const d = seoulDate(iso);
  if (!d) return null;
  const first = new Date(Date.UTC(d.year,d.month-1,1)).getUTCDay();
  const count = new Date(Date.UTC(d.year,d.month,0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((first+count)/7)*7 }, (_,i) => i>=first && i<first+count ? i-first+1 : null);
  return { ...d, cells };
}
export function daysUntil(iso, now = new Date()) {
  const target = seoulDate(iso), today = seoulDate(now);
  if (!target || !today) return null;
  return Math.round((Date.UTC(target.year,target.month-1,target.day)-Date.UTC(today.year,today.month-1,today.day))/86400000);
}
export function dayLabel(iso, now) {
  const days = daysUntil(iso,now);
  return days === null ? '예식 일정을 준비하고 있어요' : days>0 ? `D-${days}` : days===0 ? '오늘이에요' : '함께해 주셔서 감사합니다';
}
export function formatWeddingDate(iso) {
  const d = seoulDate(iso);
  if (!d) return '예식 일정을 준비하고 있어요';
  const weekday = '일월화수목금토'[new Date(Date.UTC(d.year,d.month-1,d.day)).getUTCDay()];
  return `${d.year}년 ${d.month}월 ${d.day}일 ${weekday}요일 ${d.hour<12?'오전':'오후'} ${d.hour%12||12}시${d.minute?` ${d.minute}분`:''}`;
}
const role = (p) => p.role || p.relation || '혼주';
const parentOrder = (p) => /아버지|father/i.test(role(p)) ? 0 : /어머니|mother/i.test(role(p)) ? 1 : 2;
export const orderedParents = (person) => [...(person?.parents || [])].sort((a,b)=>parentOrder(a)-parentOrder(b));
export function familyLine(person) {
  const parents = orderedParents(person).map((p)=>p.name).filter(Boolean).join(' · ');
  return parents ? `${parents}의 ${person.relation||''} ${person.name||''}` : person.name || '';
}
export function sideAccounts(config, side) {
  const person = config[validSide(side)] || {}, label = SIDE_NAMES[validSide(side)];
  return [{label,name:person.name,account:person.account}, ...orderedParents(person).map((p)=>({label:`${label} ${role(p)}`,name:p.name,account:p.account}))]
    .filter((row)=>String(row.account?.number||'').trim()).map((row)=>({...row,account:{...row.account}}));
}
export function sideContacts(config, side) {
  const person = config[validSide(side)] || {}, label = SIDE_NAMES[validSide(side)];
  return [{label,name:person.name,phone:person.phone},...orderedParents(person).map((p)=>({label:`${label} ${role(p)}`,name:p.name,phone:p.phone}))]
    .filter((p)=>p.name).map((p)=>({...p,tel:String(p.phone||'').replace(/[^\d+]/g,'')}));
}
export function photoPath(file) {
  if (typeof file !== 'string' || !file || file.includes('..') || /[:\\?#]/.test(file) || file.startsWith('/')) return '';
  return `../gallery/${file.split('/').map(encodeURIComponent).join('/')}`;
}
export function safeLink(url) {
  try { const u = new URL(url); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
export function shareUrls(siteUrl, side, pageUrl) {
  const pageDirectory = new URL('./', pageUrl);
  let root = /\/(groom|bride)\/$/.test(pageDirectory.pathname) ? new URL('../',pageDirectory) : new URL('../',pageUrl);
  if (safeLink(siteUrl)) {
    root = new URL(siteUrl);
    root.search = ''; root.hash = '';
    if (/\/(common|groom|bride)\/?$/.test(root.pathname)) root = new URL('../',root.href.replace(/\/?$/,'/'));
    else if (/\.[a-z]+$/i.test(root.pathname)) root = new URL('./',root);
    else if (!root.pathname.endsWith('/')) root.pathname += '/';
  }
  side = validSide(side);
  return { page:new URL(`${side}/`,root).href, image:new URL(`classic/img/og-${side}.png`,root).href };
}
