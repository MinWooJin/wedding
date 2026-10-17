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
 * 지도 위에 상시로 보이는 것은 레퍼런스처럼 최소로 둔다: 왼쪽 위 작은 이름 칩, 아래의 "축하 남기기"와 둥근 메뉴 버튼.
 * 공간 설명·이동·메시지 보기·내 위치·캐릭터 바꾸기·공유는 모두 메뉴 팝업 안에 있다. 공간에 들어오면 이름을 토스트로 한 번 알린다.
 */
export function createHud(root, config, game) {
  root.innerHTML = `<div class="garden-header"><strong>${esc(displayName(config.groom))}<i> ♥ </i>${esc(displayName(config.bride))}</strong><span class="date-chip">${esc(ddayLabel(config.wedding.date))}</span></div>
    <nav class="garden-dock" aria-label="정원 메뉴"><button class="fab fab-write" data-action="write"><span aria-hidden="true">✉</span>축하 남기기</button><button class="fab fab-menu menu-button" aria-label="메뉴 열기">☰</button></nav>`;
  root.hidden = false;
  let sceneId = 'hub';
  const navigate = (id) => { game.player.stop(); game.goTo(id, id === 'hub' ? HUB_SPAWN : null); };
  const changeProfile = async () => {
    const profile = await showIntro(document.getElementById('intro'), config, game.assets, game.profile);
    game.profile = profile; saveProfile(profile);
    game.player.name = profile.nickname;
    game.player.sprites = characterSet(game.assets, `preset-${profile.charId}`, presetSprites(profile.charId));
    game.paused = false; game.onMessagesChanged?.();
  };
  const walkGuide = () => showOverlay(game, { title: '정원 산책 안내', html: '<p>빈 곳을 짧게 누르면 캐릭터가 걸어가요. 화면을 끌면 정원을 둘러볼 수 있어요.</p><p>이름이 적힌 표지판은 공간 입구예요. 꽃과 사람도 눌러 보세요.</p><p>걷기 대신 메뉴로 바로 이동해도 좋아요.</p>' });

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
      buttons: [{ label: '내 캐릭터 바꾸기', onClick: () => { close(true); game.paused = true; changeProfile(); return true; } }, { label: '소식 공유', onClick: () => { close(true); showShare(game); return true; } }, { label: '닫기' }],
    });
    card.querySelectorAll('[data-space]').forEach((b) => { b.onclick = () => { close(); if (b.dataset.space !== sceneId) navigate(b.dataset.space); }; });
    const run = {
      messages: () => game.openMessages(), locate: () => { game.follow = true; }, guide: walkGuide,
      letter: () => showGiftsNotice(game), groom: () => showAccounts(game, '신랑', config.groom), bride: () => showAccounts(game, '신부', config.bride),
    };
    card.querySelectorAll('[data-menu]').forEach((b) => { b.onclick = () => { close(true); run[b.dataset.menu]?.(); }; });
  };
  root.querySelector('.menu-button').onclick = openMenu;
  root.querySelector('[data-action="write"]').onclick = () => game.openGuestbook();
  const refresh = () => {}; // 지도 위에는 갱신할 글이 없다(메뉴는 열 때마다 새로 만든다)
  return { onScene(id) { sceneId = id; const s = SPACES[id]; toast(`${s.icon} ${s.name}`, 1800); }, refresh, openMenu };
}
