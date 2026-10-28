import { PRESET_COUNT, presetSprites } from '../sprites/characters.js';
import { spriteCanvas } from '../renderer.js';
import { validateNickname } from '../state.js';
import { esc, h } from './dom.js';
import { characterSet } from '../assets.js';
import { displayName } from '../config.js';

/** 정원에서 헷갈리는 이름(분위기용 하객, 두 사람 이름)은 닉네임으로 쓰지 않는다. */
export function reservedNickname(nickname, config) {
  const key = (s) => String(s || '').normalize('NFC').trim().toLowerCase();
  const names = ['하객', '정원 안내인', config?.groom?.name, config?.groom?.shortName, config?.bride?.name, config?.bride?.shortName].filter(Boolean).map(key);
  return names.includes(key(nickname));
}

/**
 * 인트로 화면을 띄우고 {nickname, charId}를 resolve한다.
 * checkNickname(nickname) → Promise<{ok, available}>가 있으면 다른 기기가 쓰는 닉네임인지 확인한다.
 */
export function showIntro(root, config, assets = {}, current = null, { checkNickname = null } = {}) {
  return new Promise((resolve) => {
    let charId = current?.charId ?? Math.floor(Math.random() * PRESET_COUNT);
    let frame = 0;
    const card = h(`
      <div class="card" role="dialog" aria-modal="true" aria-label="정원의 내 캐릭터" tabindex="-1">
        <h2>${esc(displayName(config.groom))} ♥ ${esc(displayName(config.bride))}</h2>
        <p>픽셀 가든에 오신 걸 환영해요!<br>닉네임을 정하고 캐릭터를 골라주세요.</p>
        <label for="nick">정원에서 사용할 이름</label><input id="nick" maxlength="10" placeholder="닉네임 (2~10자)" autocomplete="nickname">
        <div class="picker">
          <canvas width="48" height="72" aria-hidden="true"></canvas>
          <div class="picker-side">
            <p class="picker-title">내 캐릭터</p>
            <p class="muted" id="count"></p>
            <div class="picker-steps"><button class="btn" id="prev" aria-label="이전 캐릭터">◀</button><button class="btn" id="next" aria-label="다음 캐릭터">▶</button></div>
          </div>
        </div>
        <p class="picker-hint">아래에서 마음에 드는 하객을 눌러 고르세요.</p>
        <div class="character-grid" id="character-grid" role="radiogroup" aria-label="캐릭터 ${PRESET_COUNT}종"></div>
        <!-- 카드 아래에 붙어 있는 입장 영역: 휴대폰에서 격자를 스크롤하지 않아도 항상 보인다 -->
        <div class="intro-footer">
          <p id="err" class="intro-error" role="status"></p>
          <div class="claim-box" id="claim" hidden>
            <p><b id="claim-name"></b> 님은 이미 정원에 다녀가셨어요.<br>같은 분이세요?</p>
            <div class="row"><button class="btn primary" id="claim-yes">네, 저예요</button><button class="btn" id="claim-no">다른 닉네임 쓸게요</button></div>
            <p class="muted">다른 휴대폰이나 브라우저로 다시 오셨다면 "네, 저예요"를 눌러 주세요.</p>
          </div>
          <div class="row intro-go" id="main-row"><button class="btn primary" id="go">입장하기</button></div>
        </div>
      </div>`);
    const cv = card.querySelector('canvas'), ctx = cv.getContext('2d');
    const count = card.querySelector('#count'), err = card.querySelector('#err'), nick = card.querySelector('#nick');
    // 30종을 좌우로 넘기면 너무 오래 걸려서 전체 격자를 처음부터 보여 준다(얼굴·상반신만 크게). 좌우 버튼은 보조 조작.
    const grid = card.querySelector('#character-grid');
    let selectedButton;
    const hud = document.getElementById('hud'), previousFocus = document.activeElement;
    hud.inert = true;
    const finish = (profile) => {
      clearInterval(timer); hud.inert = false;
      root.hidden = true; root.replaceChildren();
      if (previousFocus?.isConnected) previousFocus.focus();
      resolve(profile);
    };
    nick.value = current?.nickname || '';

    const render = () => {
      const set = characterSet(assets, `preset-${charId}`, presetSprites(charId));
      const spr = set.down[Math.min(frame, set.down.length - 1)];
      cv.width = spr.w; cv.height = spr.h;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spriteCanvas(spr), 0, 0);
      count.textContent = `캐릭터 ${charId + 1} / ${PRESET_COUNT}`;
      const nextButton = grid.children[charId];
      if (nextButton && nextButton !== selectedButton) {
        if (selectedButton) { selectedButton.setAttribute('aria-checked','false'); selectedButton.tabIndex = -1; }
        nextButton.setAttribute('aria-checked','true'); nextButton.tabIndex = 0; selectedButton = nextButton;
      }
    };
    for (let id = 0; id < PRESET_COUNT; id++) {
      const button = h(`<button class="character-option" type="button" role="radio" aria-label="캐릭터 ${id + 1}" aria-checked="false" tabindex="-1"><canvas width="40" height="40" aria-hidden="true"></canvas></button>`);
      const sprite = characterSet(assets,`preset-${id}`,presetSprites(id)).down[0];
      const canvas = button.querySelector('canvas'), context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      // 격자에서는 머리와 어깨만 크게(48×72 그림의 위쪽 가운데 40×40) 보여 얼굴로 고르기 쉽게 한다.
      const crop = Math.round(sprite.w * 0.84), sx = Math.round((sprite.w - crop) / 2), sy = Math.round(sprite.h * 0.06);
      context.drawImage(spriteCanvas(sprite), sx, sy, crop, crop, 0, 0, 40, 40);
      button.onclick = () => { charId = id; frame = 0; render(); };
      grid.appendChild(button);
    }
    const timer = setInterval(() => { frame = frame ? 0 : 2; render(); }, 300);
    card.querySelector('#prev').onclick = () => { charId = (charId + PRESET_COUNT - 1) % PRESET_COUNT; render(); };
    card.querySelector('#next').onclick = () => { charId = (charId + 1) % PRESET_COUNT; render(); };
    // 격자 안에서는 화살표로 고를 수 있다(라디오 그룹 관례). 위/아래는 한 줄만큼 이동.
    grid.addEventListener('keydown', (e) => {
      const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 6;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
      if (!step) return;
      e.preventDefault();
      charId = Math.min(PRESET_COUNT - 1, Math.max(0, charId + step)); frame = 0; render();
      grid.children[charId]?.focus();
    });
    const goButton = card.querySelector('#go');
    const claimBox = card.querySelector('#claim'), mainRow = card.querySelector('#main-row');
    let checking = false, pending = null;
    const showClaim = (show) => { claimBox.hidden = !show; mainRow.hidden = show; };
    card.querySelector('#claim-yes').onclick = () => { if (pending) finish({ ...pending, claim: true }); };
    card.querySelector('#claim-no').onclick = () => { pending = null; showClaim(false); nick.select(); nick.focus(); };
    nick.addEventListener('input', () => { if (pending) { pending = null; showClaim(false); } });
    const go = async () => {
      if (checking) return;
      const v = validateNickname(nick.value);
      if (!v.ok) { err.textContent = v.error; return; }
      if (reservedNickname(v.value, config)) { err.textContent = '정원에서 쓰는 이름이라 다른 닉네임을 골라 주세요'; return; }
      if (checkNickname && v.value !== current?.nickname) {
        checking = true; goButton.disabled = true; err.textContent = '닉네임을 확인하고 있어요…';
        const r = await checkNickname(v.value);
        checking = false; goButton.disabled = false; err.textContent = '';
        if (r.ok && !r.available) { // 막지 않고 본인인지 묻는다(카카오톡 ↔ 사파리처럼 같은 사람이 다른 브라우저로 온 경우)
          pending = { nickname: v.value, charId };
          card.querySelector('#claim-name').textContent = v.value;
          showClaim(true); card.querySelector('#claim-yes').focus();
          return;
        }
      }
      finish({ nickname: v.value, charId });
    };
    goButton.onclick = go;
    if (current) {
      const cancel = h('<button class="btn">그대로 돌아가기</button>');
      cancel.onclick = () => finish(current);
      card.querySelector('#main-row').appendChild(cancel);
    }
    nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && current) finish(current);
      if (e.key !== 'Tab') return;
      const nodes = [...card.querySelectorAll('input,button')].filter((n) => n.tabIndex >= 0 && !n.closest('[hidden]')), first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === card)) { e.preventDefault(); first.focus(); }
    });

    root.innerHTML = ''; root.appendChild(card); root.hidden = false;
    render();
    card.focus({ preventScroll: true });
  });
}
