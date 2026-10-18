import { esc, h } from './dom.js';
import { ddayLabel, displayName } from '../config.js';
import { HUB_SPAWN } from '../world/hub.js';
import { showOverlay } from './overlay.js';
import { showIntro } from './intro.js';
import { saveProfile } from '../state.js';
import { characterSet } from '../assets.js';
import { presetSprites } from '../sprites/characters.js';
import { showShare, showAccounts, showGiftsNotice } from '../world/gifts.js';
import { toast } from './toast.js';

export const SPACES = {
  hub: { icon: '⌂', name: '두 사람의 정원', text: '두 사람을 만나고, 따뜻한 축하를 꽃으로 남겨 주세요.' },
  guestbook: { icon: '✉', name: '축하가 피어나는 정원', text: '우체통을 누르면 편지를 쓸 수 있어요. 꽃에는 하객의 마음이 담겨요.' },
  gallery: { icon: '▧', name: '우리의 순간들', text: '사진 속 두 사람의 이야기를 천천히 만나 보세요.' },
  info: { icon: '♧', name: '결혼 소식', text: '예식 소식과 가족분들을 위한 안내를 모았어요.' },
  gifts: { icon: '♥', name: '마음 전하는 곳', text: '보내주시는 축하의 마음만 감사히 받을게요.' },
};

/**
 * 지도 위에는 작은 이름 칩과 메뉴 버튼, 광장은 "축하 남기기"·각 방은 "정원으로"를 둔다.
 * 공간 설명·이동·메시지 보기·내 위치·캐릭터 바꾸기·공유는 모두 메뉴 팝업 안에 있다. 공간에 들어오면 이름을 토스트로 한 번 알린다.
 */
export function createHud(root, config, game) {
  root.innerHTML = `<div class="garden-header"><strong>${esc(displayName(config.groom))}<i> ♥ </i>${esc(displayName(config.bride))}</strong><span class="date-chip">${esc(ddayLabel(config.wedding.date))}</span></div>
    <button class="sound-toggle" aria-pressed="false" aria-label="배경음악 끄기"></button>
    <nav class="garden-dock" aria-label="정원 메뉴"><button class="fab fab-write" data-action="write"><span aria-hidden="true">✉</span>축하 남기기</button><button class="fab fab-return" data-action="exit" aria-label="정원으로 돌아가기" hidden><span class="return-arrow" aria-hidden="true">←</span><span>정원으로</span></button><button class="fab fab-menu menu-button" aria-label="메뉴 열기">☰</button></nav>`;
  root.hidden = false;
  let sceneId = 'hub';
  const navigate = (id) => { game.player.stop(); game.goTo(id, id === 'hub' ? HUB_SPAWN : null); };
  const changeProfile = async () => {
    const picked = await showIntro(document.getElementById('intro'), config, game.assets, game.profile, { checkNickname: game.checkNickname });
    const profile = { nickname: picked.nickname, charId: picked.charId };
    if (picked.claim) game.claimed = true;
    game.profile = profile; saveProfile(profile);
    game.registerVisit?.(); // 새 닉네임을 이 브라우저 것으로 등록(본인 확인 포함)
    game.player.name = profile.nickname;
    game.player.sprites = characterSet(game.assets, `preset-${profile.charId}`, presetSprites(profile.charId));
    game.paused = false; game.onMessagesChanged?.();
  };
  const walkGuide = () => showOverlay(game, { title: '정원 산책 안내', html: '<p>빈 곳을 짧게 누르면 캐릭터가 걸어가요. 화면을 끌면 정원을 둘러볼 수 있어요.</p><p>아래쪽 방명록 보드·갤러리 액자·선물·예식장 문을 누르면 바로 그 공간으로 들어가요. 꽃과 사람도 눌러 보세요.</p><p>걷기 대신 메뉴로 바로 이동해도 좋아요.</p>' });

  const openMenu = () => {
    const s = SPACES[sceneId];
    const count = game.data.messages.filter((e) => e.m).length;
    const status = sceneId === 'gallery' && !game.gallery.length ? '사진은 마지막 준비 단계에서 채워질 예정이에요.'
      : count ? `지금까지 ${count}개의 축하가 피어났어요.` : '아직 피어난 축하가 없어요. 첫 번째 꽃을 남겨 주세요.';
    const actions = [
      ['messages', '❀ 메시지 보기'], ['locate', '↗ 내 위치로'], ['guide', '? 산책 안내'],
      ...(sceneId === 'gifts' ? (config.gifts?.declineMoney ? [['letter', '♥ 두 사람의 편지']] : [['groom', '신랑측 마음'], ['bride', '신부측 마음']]) : []),
    ];
    const { card, close } = showOverlay(game, {
      title: `${s.icon} ${s.name}`,
      html: `<p class="muted">${esc(s.text)}</p><p class="menu-status">${esc(status)}</p>
        ${!game.config.guestbookApi ? '<p class="preview-notice">기기 저장 미리보기 · 다른 사람에게 공개되지 않아요</p>' : ''}
        <div class="space-grid">${Object.entries(SPACES).map(([id, sp]) => `<button class="space-tile" data-space="${id}" ${id === sceneId ? 'aria-current="page"' : ''}><span>${sp.icon}</span><strong>${sp.name}</strong></button>`).join('')}</div>
        <div class="menu-actions">${actions.map(([id, label]) => `<button class="text-button" data-menu="${id}">${esc(label)}</button>`).join('')}</div>
        ${config.classicUrl ? `<a class="classic-link" href="${esc(config.classicUrl)}">일반 청첩장 보기 →</a>` : ''}`,
      buttons: [{ label: '내 캐릭터 바꾸기', onClick: () => { close(true); game.paused = true; changeProfile(); return true; } }, { label: '소식 나누기', onClick: () => { close(true); showShare(game); return true; } }, { label: '닫기' }],
    });
    card.querySelectorAll('[data-space]').forEach((b) => { b.onclick = () => { close(); if (b.dataset.space !== sceneId) navigate(b.dataset.space); }; });
    const run = {
      messages: () => game.openMessages(), locate: () => { game.follow = true; }, guide: walkGuide,
      letter: () => showGiftsNotice(game), groom: () => showAccounts(game, '신랑', config.groom), bride: () => showAccounts(game, '신부', config.bride),
    };
    card.querySelectorAll('[data-menu]').forEach((b) => { b.onclick = () => { close(true); run[b.dataset.menu]?.(); }; });
  };
  root.querySelector('.menu-button').onclick = openMenu;
  // 배경음악 켜기/끄기(오른쪽 위). 켠 상태·끈 상태를 아이콘과 읽어 주는 이름으로 함께 알린다.
  const sound = root.querySelector('.sound-toggle');
  const ON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', OFF = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const showSound = (muted) => {
    sound.innerHTML = muted ? OFF : ON;
    sound.setAttribute('aria-pressed', String(muted));
    sound.setAttribute('aria-label', muted ? '배경음악 켜기' : '배경음악 끄기');
    sound.classList.toggle('muted', muted);
  };
  if (game.bgm) { showSound(game.bgm.muted); game.bgm.onChange(showSound); sound.onclick = () => game.bgm.toggle(); }
  else sound.hidden = true;
  root.querySelector('[data-action="write"]').onclick = () => game.openGuestbook();
  const returnButton = root.querySelector('[data-action="exit"]');
  const writeButton = root.querySelector('[data-action="write"]');
  returnButton.onclick = () => {
    const exit = game.scene?.entrances.find((e) => e.to === 'hub');
    game.player.stop();
    game.goTo('hub', exit?.spawn ?? HUB_SPAWN);
  };
  const refresh = () => {}; // 지도 위에는 갱신할 글이 없다(메뉴는 열 때마다 새로 만든다)
  return { onScene(id) {
    sceneId = id;
    returnButton.hidden = id === 'hub';
    writeButton.hidden = id !== 'hub';
    const s = SPACES[id]; toast(`${s.icon} ${s.name}`, 1800);
  }, refresh, openMenu };
}
