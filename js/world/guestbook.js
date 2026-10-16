import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { showOverlay } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { savePreview } from '../guestbook-store.js';
import { esc } from '../ui/dom.js';
import { validateEntry, postMessage, MESSAGE_MAX } from '../api.js';

const ROWS = [
  'HHHHHHHHHHH',
  'HGJGGGGGUGH',
  'HGGGGGGGGGH',
  'HGGGGGGGGGH',
  'HGGUGGGJGGH',
  'HGGGGNGGGGH',
  'HGGGGNGGGGH',
  'HGJGGNGGUGH',
  'HGGGGGGGGGH',
  'HGGGGNGGGGH',
  'HGGGGNGGGGH',
  'HHHHHNHHHHH',
];
const MAILBOX = { tx: 4, ty: 2 }; // 64×64: 4~5열, 2~3행
const EXIT = { tx: 5, ty: 11 };
const SPAWN = { tx: 5, ty: 10 };
const RESERVED = new Set(['4,2', '5,2', '4,3', '5,3', '4,4', '5,4', '3,3', '6,3', '5,9', '5,10', '4,10', '6,10', '5,11',
  '1,1', '2,1', '3,1', '1,2', '2,2', '3,2', '1,3', '2,3', '3,3', '1,4', '2,4', '3,4', '7,1', '8,1', '9,1', '7,2', '8,2', '9,2', '7,3', '8,3', '9,3', '7,4', '8,4', '9,4',
  '1,7', '2,7', '1,8', '2,8', '8,7', '9,7', '8,8', '9,8']); // 우체통·입구·나무·덤불 자리
const POST_COOLDOWN_MS = 60_000;
let lastPostAt = 0;

export class GuestbookScene extends Scene {
  constructor(game) {
    super({
      id: 'guestbook', rows: ROWS, spawn: SPAWN, assets: game.assets,
      entrances: [{ ...EXIT, to: 'hub', spawn: HUB_DOORS.guestbook.back }],
      objects: [
        { id: 'door', sprite: 'door', floor: true, ...EXIT },
        { id: 'mailbox', sprite: game.assets?.objects?.['wedding-mailbox'] ? 'wedding-mailbox' : 'mailbox', label: '축하 편지 쓰기', ...MAILBOX, interact: () => this.openForm(game) },
        { id: 'treeL', sprite: 'tree', tx: 1, ty: 1 }, { id: 'treeR', sprite: 'tree', tx: 7, ty: 1 },
        { id: 'bushL', sprite: 'bush-white', tx: 1, ty: 7 }, { id: 'bushR', sprite: 'bush', tx: 8, ty: 7 },
      ],
    });
    this.game = game;
    this.reserved = new Set(RESERVED);
    for (const o of this.objects) {
      for (let y = -1; y < Math.ceil(o.spr.h / 32); y++) for (let x = 0; x < Math.ceil(o.spr.w / 32); x++) this.reserved.add(`${o.tx + x},${o.ty + y}`);
    }
    this.baseObjects = this.objects.slice();
    this.setEntries(game.data?.messages ?? []);
  }

  /** 메시지 목록 → 꽃 오브젝트 재배치 */
  setEntries(allEntries) {
    const entries = allEntries.filter((e) => e.m); // 입장만 한 하객(메시지 없음)은 꽃을 피우지 않는다
    this.entries = entries;
    const tiles = pickTiles(freeTiles(ROWS, this.reserved), Math.min(entries.length, 40), 7);
    const flowers = tiles.map((t, i) => this.makeObject({
      id: `flower${i}`, sprite: 'flower', tx: t.tx, ty: t.ty, solid: false,
      interact: () => showOverlay(this.game, { title: `${entries[i].n}님의 메시지`, html: `<p>${esc(entries[i].m)}</p>` }),
    }));
    this.objects = [...this.baseObjects, ...flowers];
    this.rebuildSolid();
  }

  openList() {
    const entries = this.game.data.messages.filter((e) => e.m).slice().sort((a, b) => b.t - a.t);
    const { card, close } = showOverlay(this.game, {
      title: `정원에 도착한 마음 · ${entries.length}`,
      html: `${!this.game.config.guestbookApi ? '<p class="preview-notice">이 기기에 저장한 미리보기예요. 다른 사람에게 공개되지 않아요.</p>' : ''}
        <div class="message-list">${entries.length ? entries.map((e) => `<article class="message-item"><strong>${esc(e.n)}</strong><p>${esc(e.m)}</p><small>${esc(new Date(e.t).toLocaleDateString('ko-KR'))}</small>${!this.game.config.guestbookApi ? `<button class="text-button preview-delete" data-time="${e.t}">이 미리보기 지우기</button>` : ''}</article>`).join('') : '<div class="empty-state"><span>❀</span><h3>첫 번째 꽃을 기다리고 있어요</h3><p>따뜻한 한마디가 정원의 첫 꽃이 됩니다.</p></div>'}</div>`,
      buttons: [{ label: '축하 남기기', primary: true, onClick: () => { close(true); this.openForm(this.game); return true; } }, { label: '닫기' }],
    });
    card.querySelectorAll('.preview-delete').forEach((button) => {
      button.onclick = () => {
        const entries = this.game.data.messages.filter((e) => String(e.t) !== button.dataset.time);
        if (!savePreview(entries)) { toast('기기에 저장할 수 없어 지우지 못했어요.'); return; }
        this.game.data.messages = entries; this.game.onMessagesChanged?.();
        close(); this.openList();
      };
    });
    return card;
  }

  openForm(game) {
    const url = game.config.guestbookApi;
    let submitted = false;
    const { card } = showOverlay(game, {
      title: '마음을 꽃으로 남겨 주세요',
      html: `${!url ? '<p class="preview-notice">기기 저장 미리보기 · 이 브라우저에만 남으며 실제 방명록으로 전송되지 않아요.</p>' : ''}
        <p class="muted">${esc(game.profile.nickname)}님의 축하 편지</p>
        <label for="msg">축하 메시지</label>
        <textarea id="msg" rows="4" maxlength="${MESSAGE_MAX}" placeholder="두 사람에게 전하고 싶은 마음을 적어 주세요.">${esc(game.guestbookDraft || '')}</textarea>
        <p class="message-count muted" aria-live="polite"></p><p id="err" class="form-error" role="status"></p>`,
      onClose: (el) => { game.guestbookDraft = submitted ? '' : el.querySelector('#msg').value; },
      buttons: [
        { label: '나중에 쓸게요' },
        { label: url ? '축하 보내기' : '이 기기에 미리 저장', primary: true, onClick: async (el) => {
          const err = el.querySelector('#err');
          if (url && Date.now() - lastPostAt < POST_COOLDOWN_MS) { err.textContent = '1분에 한 번만 남길 수 있어요'; return true; }
          const v = validateEntry({ nickname: game.profile.nickname, characterId: game.profile.charId, message: el.querySelector('#msg').value });
          if (!v.ok) { err.textContent = v.error; return true; }
          err.textContent = url ? '마음을 전하고 있어요…' : '이 기기에 저장하고 있어요…';
          if (url) {
            const result = await postMessage(url, v.value);
            if (!result.ok) { err.textContent = result.error; return true; }
            lastPostAt = Date.now();
          }
          const entry = { t: Date.now(), n: v.value.nickname, c: v.value.characterId, m: v.value.message };
          const entries = [entry, ...game.data.messages];
          if (!url && !savePreview(entries)) { err.textContent = '기기에 저장할 수 없어요. 브라우저 저장 공간 설정을 확인해 주세요.'; return true; }
          game.data.messages = entries.slice(0, url ? Infinity : 100);
          submitted = true; game.onMessagesChanged?.();
          game.player.say(url ? '축하를 전했어요 ♡' : '내 기기에 꽃이 피었어요 ♡');
          toast(url ? '마음을 전했어요. 메시지 보기에서 확인해 주세요.' : '이 기기에만 저장했어요. 메시지 보기에서 확인해 주세요.');
          return false;
        } },
      ],
    });
    const input = card.querySelector('#msg'), count = card.querySelector('.message-count');
    const updateCount = () => { count.textContent = `${input.value.length} / ${MESSAGE_MAX}`; };
    input.addEventListener('input', updateCount); updateCount();
  }
}

export function createGuestbook(game) { return new GuestbookScene(game); }
