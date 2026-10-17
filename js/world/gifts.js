import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { showOverlay } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { esc, copyText } from '../ui/dom.js';
import { makeHostNpc } from './host-npc.js';
import { formatDate } from '../config.js';

const ROWS = [
  'KKKKKKKKKKK',
  ...Array.from({ length: 10 }, () => 'KMMMMMMMMMK'),
  'KKKKKMKKKKK',
];
const EXIT = { tx: 5, ty: 11 };

function accountHtml(label, acc) {
  if (!acc || !acc.number) return '';
  return `<p><b>${esc(label)}</b> ${esc(acc.bank)} ${esc(acc.number)} (${esc(acc.holder)})
    <button class="btn copy" data-num="${esc(acc.number)}">복사</button>
    ${acc.kakaopay ? `<a class="btn" target="_blank" rel="noopener" href="${esc(acc.kakaopay)}">카카오페이</a>` : ''}</p>`;
}

export function showAccounts(game, side, person) {
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

export function showShare(game) {
  const cfg = game.config;
  const url = cfg.siteUrl || location.href.split('#')[0];
  const title = `${cfg.groom.name} ♥ ${cfg.bride.name} 결혼합니다`;
  const buttons = [
    { label: '링크 복사', primary: !cfg.kakaoJsKey, onClick: async () => { toast((await copyText(url)) ? '링크를 복사했어요' : '복사에 실패했어요'); return true; } },
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
  showOverlay(game, { title: '소식 나누기', html: `<div class="share-preview"><span class="share-heart" aria-hidden="true">♥</span><p class="share-title">${esc(title)}</p><p>${esc(formatDate(cfg.wedding.date))}</p></div><label for="share-url">청첩장 링크</label><input id="share-url" class="share-url" readonly value="${esc(url)}"><p class="muted share-help">링크를 복사해 소중한 분들께 전해 주세요.</p>`, buttons });
}

/** 초대하지 못한 사과와 축의금 사양 안내 */
export function showGiftsNotice(game) {
  const text = game.config.gifts?.notice;
  if (!text) return;
  showOverlay(game, {
    title: '마음 전하는 곳',
    html: `<p class="gifts-notice">${esc(text)}</p>`,
    buttons: [{ label: '축하 남기기', primary: true, onClick: () => { setTimeout(() => game.openGuestbook?.(), 0); } }, { label: '닫기' }],
  });
}

let giftsShown = false;

export function createGifts(game) {
  const cfg = game.config;
  const decline = !!cfg.gifts?.declineMoney;
  return new Scene({
    id: 'gifts', rows: ROWS, bg: '#f6efe7', spawn: { tx: 5, ty: 10 }, assets: game.assets,
    npcs: [makeHostNpc(game, 'bride', { tx: 3, ty: 8 }, [
      '함께 마음을 나눠 주시는 것만으로도 참 감사해요.',
      decline ? '축의금은 정중히 사양해요. 따뜻한 축하만으로 충분해요.' : '보내 주신 축하를 소중히 간직할게요.',
    ])],
    entrances: [{ ...EXIT, to: 'hub', spawn: HUB_DOORS.gifts.back }],
    objects: [
      { id: 'door', sprite: 'door', floor: true, ...EXIT },
      // 축의금을 사양하면 계좌 대신 두 사람의 편지(안내판)와 축하 우체통을 둔다
      ...(decline ? [
        { id: 'notice', sprite: 'welcome-board', label: '두 사람의 편지', tx: 2, ty: 2, interact: () => showGiftsNotice(game) },
        { id: 'post', sprite: game.assets?.objects?.['wedding-mailbox'] ? 'wedding-mailbox' : 'mailbox', label: '축하 남기기', tx: 7, ty: 1, interact: () => game.openGuestbook?.() },
      ] : [
        { id: 'groom-chest', sprite: 'chest', label: '신랑측 마음', tx: 2, ty: 3, interact: () => showAccounts(game, '신랑', cfg.groom) },
        { id: 'bride-chest', sprite: 'chest', label: '신부측 마음', tx: 7, ty: 3, interact: () => showAccounts(game, '신부', cfg.bride) },
      ]),
      { id: 'share', sprite: game.assets?.objects?.['share-letter'] ? 'share-letter' : 'welcome-board', label: '소식 나누기', tx: 4, ty: 6, interact: () => showShare(game) },
      ...(game.assets?.objects?.plant ? [{ id: 'plantL', sprite: 'plant', tx: 1, ty: 8 }, { id: 'plantR', sprite: 'plant', tx: 9, ty: 8 }] : []),
      { id: 'lanternL', sprite: 'lantern', tx: 1, ty: 1 }, { id: 'lanternR', sprite: 'lantern', tx: 9, ty: 1 },
    ],
    onEnter: (g) => { if (decline && !giftsShown) { giftsShown = true; showGiftsNotice(g); } },
  });
}
