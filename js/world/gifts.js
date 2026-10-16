import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { showOverlay } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { esc, copyText } from '../ui/dom.js';

const ROWS = [
  'HHHHHHHHHHH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HHHHHPHHHHH',
];
const EXIT = { tx: 5, ty: 7 };

function accountHtml(label, acc) {
  if (!acc || !acc.number) return '';
  return `<p><b>${esc(label)}</b> ${esc(acc.bank)} ${esc(acc.number)} (${esc(acc.holder)})
    <button class="btn copy" data-num="${esc(acc.number)}">복사</button>
    ${acc.kakaopay ? `<a class="btn" target="_blank" rel="noopener" href="${esc(acc.kakaopay)}">카카오페이</a>` : ''}</p>`;
}

function showAccounts(game, side, person) {
  const html = [
    accountHtml(side, person.account),
    ...person.parents.map((p) => accountHtml(`${side} ${p.role}`, p.account)),
  ].join('') || '<p class="muted">계좌 정보가 아직 없어요.</p>';
  const { card } = showOverlay(game, { title: `${side}측에 마음 전하기`, html });
  card.querySelectorAll('.copy').forEach((b) => {
    b.onclick = async () => toast((await copyText(b.dataset.num)) ? '계좌번호를 복사했어요' : '복사에 실패했어요');
  });
}

async function loadKakao(key) {
  if (window.Kakao?.isInitialized?.()) return window.Kakao;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  window.Kakao.init(key);
  return window.Kakao;
}

function showShare(game) {
  const cfg = game.config;
  const url = cfg.siteUrl || location.href.split('#')[0];
  const title = `${cfg.groom.name} ♥ ${cfg.bride.name} 결혼합니다`;
  const buttons = [
    { label: '링크 복사', onClick: async () => { toast((await copyText(url)) ? '링크를 복사했어요' : '복사에 실패했어요'); return true; } },
  ];
  if (navigator.share) buttons.push({ label: '공유하기', onClick: async () => { try { await navigator.share({ title, url }); } catch {} return true; } });
  if (cfg.kakaoJsKey) buttons.push({ label: '카카오톡', primary: true, onClick: async () => {
    try {
      const K = await loadKakao(cfg.kakaoJsKey);
      K.Share.sendDefault({
        objectType: 'feed',
        content: { title, description: '픽셀 가든에서 만나요', imageUrl: `${url.replace(/\/[^/]*$/, '/')}og.png`, link: { mobileWebUrl: url, webUrl: url } },
      });
    } catch { toast('카카오톡 공유를 열 수 없어요'); }
    return true;
  } });
  buttons.push({ label: '닫기' });
  showOverlay(game, { title: '청첩장 공유', html: `<p class="muted">${esc(url)}</p>`, buttons });
}

export function createGifts(game) {
  const cfg = game.config;
  return new Scene({
    id: 'gifts', rows: ROWS, bg: '#2a2f33', spawn: { tx: 5, ty: 6 }, assets: game.assets,
    entrances: [{ ...EXIT, to: 'hub', spawn: HUB_DOORS.gifts.back }],
    objects: [
      { id: 'door', sprite: 'door', floor: true, ...EXIT },
      { id: 'groom-chest', sprite: 'chest', tx: 3, ty: 2, interact: () => showAccounts(game, '신랑', cfg.groom) },
      { id: 'bride-chest', sprite: 'chest', tx: 7, ty: 2, interact: () => showAccounts(game, '신부', cfg.bride) },
      { id: 'share', sprite: 'stone', tx: 5, ty: 4, interact: () => showShare(game) },
    ],
  });
}
