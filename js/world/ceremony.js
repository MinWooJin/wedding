// 예식 안내관: 위에는 예식 장면(자동 재생), 아래에는 날짜·약도·오시는 길 카드.
// 레이어 순서: 배경(back) → 하객·두 사람(발 y 순) → 앞 레이어(front: 의자 등받이·꽃) → 하트·꽃잎. 대사는 캔버스 밖 DOM.
import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { characterSet } from '../assets.js';
import { GROOM, BRIDE } from '../sprites/characters.js';
import { displayName, formatDate } from '../config.js';
import { esc, h, copyText } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { showOverlay } from '../ui/overlay.js';
import { HALL, SEATS, END_T, sceneAt, guestPose } from './ceremony-timeline.js';

const ROWS = Array.from({ length: HALL.h / 32 }, () => 'K'.repeat(HALL.w / 32));

/** 예식 장면에 필요한 그림이 모두 있는지 */
export function ceremonyArt(assets) {
  const c = assets?.ceremony, s = assets?.ceremonySheets;
  return c?.back && c?.front && s?.['groom-ceremony'] && s?.['bride-ceremony'] && s?.['guest-seated'] ? { ...c, sheets: s } : null;
}

// 약도 위 라벨 위치(%, 코덱스 약도 기준). 예식장 라벨은 하트 핀 건물 아래, 백화점 라벨은 건물 지붕 위에 둬 겹치지 않게 한다.
const mapLabels = [
  ['을지로입구역 2호선', 66, 4],
  ['♥ 더그랜드롯데 서울(롯데호텔)', 27, 86],
  ['롯데백화점 본점', 64, 48],
];

export class CeremonyScene extends Scene {
  /** helpers: { infoHtml, contactsHtml, downloadIcs } — 기존 안내소의 팝업 내용을 그대로 쓴다 */
  constructor(game, art, helpers) {
    super({ id: 'info', rows: ROWS, spawn: { tx: 5, ty: 6 }, assets: game.assets, bg: '#3a2a22' });
    this.game = game; this.art = art; this.helpers = helpers;
    this.bgImage = art.back; // 배경 그림이 있는 씬은 카메라가 위에 붙인다
    this.entrances = [{ tx: -9, ty: -9, to: 'hub', spawn: HUB_DOORS.info.back }]; // "정원으로" 버튼이 돌아갈 자리. 걸어서 닿는 입구는 없다
    this.names = { groom: displayName(game.config.groom), bride: displayName(game.config.bride) };
    this.front = { groom: characterSet(game.assets, 'groom', GROOM), bride: characterSet(game.assets, 'bride', BRIDE) };
    this.t = 0; this.panel = null; this.lastLine = '';
  }

  enter(player, spawn, game) {
    super.enter(player, spawn, game);
    this.t = this.game.renderer?.reducedMotion ? END_T : 0; // 움직임 줄이기면 마지막 장면만
    this.mountPanel();
  }

  leave() { this.panel?.remove(); this.panel = null; }

  replay() { this.t = this.game.renderer?.reducedMotion ? END_T : 0; }

  /** 아래 안내 카드(DOM). 지도 API 대신 약도 그림을 보여 주고 길찾기는 지도 앱으로 넘긴다. */
  mountPanel() {
    this.leave();
    const cfg = this.game.config, w = cfg.wedding;
    const maps = [['카카오맵', w.map?.kakao], ['네이버지도', w.map?.naver], ['티맵', w.map?.tmap]].filter(([, u]) => u);
    const transport = [['지하철', w.transport?.subway], ['버스', w.transport?.bus], ['주차', w.transport?.parking]].filter(([, v]) => v);
    const mapUrl = this.game.assets?.urls?.['ceremony/map'];
    const panel = h(`<section class="ceremony-panel" aria-label="예식 안내">
      <p class="ceremony-line" aria-live="polite"></p>
      <div class="ceremony-card">
        <p class="ceremony-date">${esc(formatDate(w.date))}</p>
        <p class="ceremony-venue">${esc([w.venue, w.hall].filter(Boolean).join(' '))}</p>
        ${mapUrl ? `<div class="ceremony-map"><img src="${esc(mapUrl)}" alt="예식장 주변 약도. 을지로입구역 남쪽, 롯데백화점 서쪽의 롯데호텔 서울 건물" width="352" height="200">${mapLabels.map(([t, x, y]) => `<span class="map-label" style="left:${x}%;top:${y}%">${esc(t)}</span>`).join('')}</div>` : ''}
        ${w.address ? `<p class="ceremony-address">${esc(w.address)}</p>` : ''}
        <div class="ceremony-actions">${w.address ? '<button class="btn" data-act="copy">주소 복사</button>' : ''}${maps.map(([l, u]) => `<a class="btn" target="_blank" rel="noopener" href="${esc(u)}">${esc(l)}</a>`).join('')}</div>
        ${transport.length ? `<dl class="ceremony-transport">${transport.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        <div class="ceremony-actions two-col">
          <button class="btn" data-act="replay">예식 다시 보기</button>
          <button class="btn" data-act="family">가족 안내</button>
          <button class="btn" data-act="contact">연락하기</button>
          <button class="btn" data-act="ics">캘린더 저장</button>
        </div>
      </div>
    </section>`);
    const act = {
      copy: async () => toast((await copyText(w.address)) ? '주소를 복사했어요' : '복사에 실패했어요'),
      replay: () => { this.replay(); this.game.frame.querySelector('#game')?.scrollIntoView?.({ block: 'nearest' }); },
      family: () => showOverlay(this.game, { title: '예식 안내', html: this.helpers.infoHtml(cfg) }),
      contact: () => showOverlay(this.game, { title: '연락하기', html: this.helpers.contactsHtml(cfg) }),
      ics: () => this.helpers.downloadIcs(cfg),
    };
    panel.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => act[b.dataset.act](); });
    this.game.frame.appendChild(panel);
    this.panel = panel; this.lastLine = ''; this.panelTop = null;
  }

  /** 걷기 없음: 화면을 누르면 재생 중엔 끝 장면으로 건너뛴다 */
  onTap() { if (this.t < END_T) this.t = END_T; }

  update(dt) {
    if (this.t < END_T + 4) this.t += dt; // 끝난 뒤에도 꽃잎이 잠깐 내려앉도록 조금 더 흐른다
  }

  sheetFrame(id, frame) { return this.art.sheets[id]?.[frame]; }

  draw(r) {
    const s = sceneAt(this.t, this.names);
    r.drawCanvas(this.art.back, 0, 0);
    const items = [];
    SEATS.forEach((seat, i) => {
      const spr = this.sheetFrame('guest-seated', seat.person * 2 + guestPose(i, this.t, s.clap));
      if (spr) items.push({ y: seat.y, spr, x: seat.x });
    });
    for (const who of ['groom', 'bride']) {
      const a = s[who];
      if (!a) continue;
      const spr = a.kind === 'sheet'
        ? this.sheetFrame(`${who}-ceremony`, a.frame)
        : (() => { const f = this.front[who].down; return f[f.length > 1 ? 1 + (a.frame % (f.length - 1)) : 0]; })();
      if (spr) items.push({ y: a.y, spr, x: a.x });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) r.drawSprite(it.spr, it.x - it.spr.w / 2, it.y - it.spr.h);
    r.drawCanvas(this.art.front, 0, 0);
    if (this.art.heart) for (const ht of s.hearts) { r.setAlpha?.(ht.alpha); r.drawCrop?.(this.art.heart, ht.frame * 8, 0, 8, 8, ht.x, ht.y); r.setAlpha?.(1); }
    if (this.art.petals) for (const p of s.petals) r.drawCrop?.(this.art.petals, p.frame * 8, 0, 8, 8, p.x, p.y);
    this.syncPanel(s);
  }

  /** 대사와 카드 위치를 장면에 맞춘다(카드는 캔버스 장면 바로 아래부터) */
  syncPanel(s) {
    if (!this.panel) return;
    if (s.line !== this.lastLine) { this.lastLine = s.line; this.panel.querySelector('.ceremony-line').textContent = s.line; }
    const g = this.game, scale = g.renderer.view.scale;
    const top = Math.round((HALL.h - Math.round(g.cam.y)) * scale);
    if (top !== this.panelTop) { this.panelTop = top; this.panel.style.top = `${top}px`; }
  }
}
