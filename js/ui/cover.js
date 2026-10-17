import { esc, h } from './dom.js';
import { displayName, formatDate } from '../config.js';

export function showCover(root, config, assetsReady, returning = false) {
  return new Promise((resolve) => {
    const card = h(`<section class="cover" aria-labelledby="cover-title">
      <p class="eyebrow">A LITTLE GARDEN, FULL OF LOVE</p>
      <div class="cover-garden" aria-hidden="true">
        <img class="cover-arch" src="assets/objects/arch.png" alt="">
        <img class="cover-groom" src="assets/characters/groom.png" alt="">
        <img class="cover-bride" src="assets/characters/bride.png" alt="">
      </div>
      <p class="eyebrow">우리의 새로운 시작</p>
      <h1 id="cover-title">${esc(displayName(config.groom))}<span> & </span>${esc(displayName(config.bride))}</h1>
      <p class="cover-date">${esc(formatDate(config.wedding.date))}</p>
      <p class="muted">${esc(config.wedding.venue)} ${esc(config.wedding.hall)}</p>
      <p class="cover-letter">작은 정원에 우리의 소식을 담았어요.<br>따뜻한 축하 한마디를 꽃으로 남겨 주세요.</p>
      ${config.wedding.notice ? `<p class="cover-notice">${esc(config.wedding.notice)}</p>` : ''}
      <button class="btn primary cover-enter" disabled>정원을 준비하고 있어요…</button>
      ${config.classicUrl ? `<a class="cover-classic" href="${esc(config.classicUrl)}">청첩장만 볼게요 →</a>` : ''}
      <p class="muted cover-footnote">캐릭터와 함께 걷고, 마음을 남기는 픽셀 방명록</p>
    </section>`);
    root.replaceChildren(card); root.hidden = false;
    const button = card.querySelector('button');
    assetsReady.then((assets) => {
      for (const name of ['groom', 'bride']) {
        const url = assets?.urls?.[`characters/${name}`];
        if (url) card.querySelector(`.cover-${name}`).src = url;
      }
      button.disabled = false;
      button.textContent = returning ? '정원에 다시 입장하기 →' : '정원에 입장하기 →';
    }).catch(() => { button.disabled = false; button.textContent = '정원에 입장하기 →'; });
    button.onclick = () => { root.hidden = true; root.replaceChildren(); resolve(); };
  });
}
