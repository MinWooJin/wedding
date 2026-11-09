import { h } from './dom.js';

/**
 * 사진 확대 뷰어. <img> 대신 canvas에 그려 길게 누르기 저장/드래그를 막고,
 * 우클릭 차단, 탭이 숨겨지면 자동으로 닫는다. (OS 스크린샷은 막을 수 없음)
 */
export function openViewer(game, images, index) {
  const root = document.getElementById('overlay');
  root.innerHTML = '';
  // 이전·다음 버튼으로 닫지 않고 바로 넘겨 본다(좌우로 밀기·방향키도 된다). 마지막 다음은 첫 사진으로.
  const v = h(`<div id="viewer"><canvas></canvas><button class="btn ghost close">닫기</button>
    <button class="viewer-nav prev" aria-label="이전 사진">‹</button><button class="viewer-nav next" aria-label="다음 사진">›</button>
    <div class="counter" aria-live="polite"></div></div>`);
  const cv = v.querySelector('canvas'), ctx = cv.getContext('2d'), counter = v.querySelector('.counter');
  let i = index;

  const draw = () => {
    const img = images[i];
    const r = root.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    counter.textContent = `${i + 1} / ${images.length}`;
    if (!img || !img.naturalWidth) {
      ctx.fillStyle = '#fff'; ctx.font = `${14 * dpr}px Galmuri11, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('사진 준비 중', cv.width / 2, cv.height / 2);
      return;
    }
    const s = Math.min(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
    const w = img.naturalWidth * s, hh = img.naturalHeight * s;
    ctx.drawImage(img, (cv.width - w) / 2, (cv.height - hh) / 2, w, hh);
  };

  const prevent = (e) => e.preventDefault();
  let down = null;
  const onDown = (e) => { down = { x: e.clientX, t: performance.now() }; };
  const onUp = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x; down = null;
    if (dx < -40) i = (i + 1) % images.length;
    else if (dx > 40) i = (i + images.length - 1) % images.length;
    else return;
    draw();
  };
  const step = (d) => { i = (i + d + images.length) % images.length; draw(); };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Escape') close();
  };
  const onHide = () => { if (document.hidden) close(); };
  // 창이 포커스를 잃으면(데스크톱 캡처 도구 등) 사진을 가린다
  const veil = () => v.classList.add('veiled'), unveil = () => v.classList.remove('veiled');

  const close = () => {
    document.removeEventListener('visibilitychange', onHide);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('blur', veil); window.removeEventListener('focus', unveil);
    window.removeEventListener('resize', draw);
    root.hidden = true; root.innerHTML = ''; game.paused = false;
  };

  v.addEventListener('contextmenu', prevent);
  v.addEventListener('dragstart', prevent);
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointerup', onUp);
  v.querySelector('.close').onclick = close;
  v.querySelector('.prev').onclick = () => step(-1);
  v.querySelector('.next').onclick = () => step(1);
  if (images.length < 2) v.querySelectorAll('.viewer-nav').forEach((b) => { b.hidden = true; });
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('blur', veil); window.addEventListener('focus', unveil);
  window.addEventListener('resize', draw);

  root.appendChild(v); root.hidden = false; game.paused = true;
  draw();
  for (const img of images) if (img && !img.naturalWidth) img.addEventListener('load', draw, { once: true });
  return { close, next: () => step(1), prev: () => step(-1), index: () => i };
}
