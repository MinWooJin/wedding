import { esc, h } from './dom.js';
import { ddayLabel, displayName } from '../config.js';
import { HUB_SPAWN } from '../world/hub.js';
import { showOverlay } from './overlay.js';
import { showIntro } from './intro.js';
import { saveProfile } from '../state.js';
import { characterSet } from '../assets.js';
import { presetSprites } from '../sprites/characters.js';
import { showShare, showAccounts } from '../world/gifts.js';

export const SPACES = {
  hub: { icon: '⌂', name: '두 사람의 정원', text: '두 사람을 만나고, 따뜻한 축하를 꽃으로 남겨 주세요.' },
  guestbook: { icon: '✉', name: '축하가 피어나는 정원', text: '우체통을 누르면 편지를 쓸 수 있어요. 꽃에는 하객의 마음이 담겨요.' },
  gallery: { icon: '▧', name: '우리의 순간들', text: '사진 속 두 사람의 이야기를 천천히 만나 보세요.' },
  info: { icon: '♧', name: '결혼 소식', text: '예식 소식과 가족분들을 위한 안내를 모았어요.' },
  gifts: { icon: '♥', name: '마음 전하는 곳', text: '양측 봉투함에서 마음을 전하고, 우리의 소식을 나눠 주세요.' },
};

export function createHud(root, config, game) {
  root.innerHTML = `<header class="garden-header"><div class="brand"><span class="eyebrow">OUR WEDDING GARDEN</span><strong>${esc(displayName(config.groom))}<i> ♥ </i>${esc(displayName(config.bride))}</strong></div><span class="date-chip">${esc(ddayLabel(config.wedding.date))}</span><button class="btn icon-button menu-button" aria-label="공간 메뉴 열기">☰</button></header>
    <section class="scene-panel" aria-live="polite"><p class="eyebrow scene-kicker"></p><h2></h2><p class="scene-description"></p><p class="scene-extra"></p><div class="scene-links"></div></section>
    <nav class="garden-dock" aria-label="정원 빠른 메뉴"><button data-action="home"><span>⌂</span>광장</button><button data-action="write" class="dock-write"><span>✉</span>축하 남기기</button><button data-action="messages"><span>❀</span>메시지 보기</button></nav>`;
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
  root.querySelector('.menu-button').onclick = () => {
    const { card, close } = showOverlay(game, {
      title: '어디로 가볼까요?',
      html: `<p class="muted">걷지 않아도 원하는 공간으로 바로 갈 수 있어요.</p><div class="space-grid">${Object.entries(SPACES).map(([id, s]) => `<button class="space-tile" data-space="${id}" ${id === sceneId ? 'aria-current="page"' : ''}><span>${s.icon}</span><strong>${s.name}</strong></button>`).join('')}</div>${config.classicUrl ? `<a class="classic-link" href="${esc(config.classicUrl)}">일반 청첩장 보기 →</a>` : ''}`,
      buttons: [{ label: '내 캐릭터 바꾸기', onClick: () => { close(true); game.paused = true; changeProfile(); return true; } }, { label: '소식 공유', onClick: () => { close(true); showShare(game); return true; } }, { label: '닫기' }],
    });
    card.querySelectorAll('[data-space]').forEach((b) => { b.onclick = () => { close(); navigate(b.dataset.space); }; });
  };
  root.querySelector('[data-action="home"]').onclick = () => navigate('hub');
  root.querySelector('[data-action="write"]').onclick = () => game.openGuestbook();
  root.querySelector('[data-action="messages"]').onclick = () => game.openMessages();
  const refresh = () => {
    const s = SPACES[sceneId];
    root.querySelector('.scene-kicker').textContent = game.config.guestbookApi ? 'A GARDEN OF WISHES' : '기기 저장 미리보기 · 다른 사람에게 공개되지 않아요';
    root.querySelector('.scene-panel h2').textContent = s.name;
    root.querySelector('.scene-description').textContent = s.text;
    const count = game.data.messages.filter((e) => e.m).length;
    root.querySelector('.scene-extra').textContent = sceneId === 'gallery' && !game.gallery.length ? '사진은 마지막 준비 단계에서 채워질 예정이에요.' : sceneId === 'hub' || sceneId === 'guestbook' ? count ? `지금까지 ${count}개의 축하가 피어났어요.` : '아직 피어난 축하가 없어요. 첫 번째 꽃을 남겨 주세요.' : '';
    const links = root.querySelector('.scene-links'); links.replaceChildren();
    const addLink = (text, fn) => { const button = h(`<button class="text-button">${esc(text)}</button>`); button.onclick = fn; links.appendChild(button); };
    if (sceneId === 'hub') { addLink('탭하면 이동 · 끌어서 둘러보기', () => showOverlay(game, { title: '정원 산책 안내', html: '<p>빈 곳을 짧게 누르면 캐릭터가 걸어가요. 화면을 끌면 정원을 둘러볼 수 있어요.</p><p>이름이 적힌 표지판은 공간 입구예요. 꽃과 사람도 눌러 보세요.</p><p>걷기 대신 공간 메뉴와 아래 버튼을 사용해도 좋아요.</p>' })); }
    else if (sceneId === 'gifts') {
      addLink('신랑측 마음 →', () => showAccounts(game, '신랑', config.groom));
      addLink('신부측 마음 →', () => showAccounts(game, '신부', config.bride));
      addLink('소식 공유 →', () => showShare(game));
    }
    addLink('내 위치로 ↗', () => { game.follow = true; });
  };
  return { onScene(id) { sceneId = id; refresh(); }, refresh };
}
