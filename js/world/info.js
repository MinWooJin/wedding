import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { showOverlay, kv } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { esc, copyText } from '../ui/dom.js';
import { formatDate, familyLine } from '../config.js';
import { buildIcs } from '../ics.js';
import { makeHostNpc } from './host-npc.js';

const ROWS = [
  'KKKKKKKKKKK',
  ...Array.from({ length: 10 }, () => 'KDDDDDDDDDK'),
  'KKKKKDKKKKK',
];

let shownOnce = false;

function infoHtml(cfg) {
  const w = cfg.wedding;
  const notice = w.notice
    ? `<p class="notice">${esc(w.notice).split('\n').join('<br>')}</p>`
    : '';
  const family = `<div class="family-lines"><p>${esc(familyLine(cfg.groom))}</p><p>${esc(familyLine(cfg.bride))}</p></div>`;
  return family + kv([['일시', formatDate(w.date)], ['장소', [w.venue, w.hall].filter(Boolean).join(' ')], ['주소', w.address]]) + notice;
}

function contactsHtml(cfg) {
  const line = (label, name, phone) => phone
    ? `<p><b>${esc(label)}</b> ${esc(name)} <a class="btn" href="tel:${esc(phone)}">전화</a> <a class="btn" href="sms:${esc(phone)}">문자</a></p>`
    : '';
  return [
    line('신랑', cfg.groom.name, cfg.groom.phone),
    ...cfg.groom.parents.map((p) => line(`신랑 ${p.role}`, p.name, p.phone)),
    line('신부', cfg.bride.name, cfg.bride.phone),
    ...cfg.bride.parents.map((p) => line(`신부 ${p.role}`, p.name, p.phone)),
  ].join('') || '<p class="muted">연락처가 아직 등록되지 않았어요.</p>';
}

function downloadIcs(cfg) {
  const blob = new Blob([buildIcs(cfg)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'wedding.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function createInfo(game) {
  const cfg = game.config, w = cfg.wedding;
  const mapButtons = [['카카오맵', w.map.kakao], ['네이버지도', w.map.naver], ['티맵', w.map.tmap]]
    .filter(([, u]) => u).map(([l, u]) => `<a class="btn" target="_blank" rel="noopener" href="${esc(u)}">${esc(l)}</a>`).join(' ');

  return new Scene({
    id: 'info', rows: ROWS, bg: '#f6efe7', assets: game.assets,
    spawn: { tx: 5, ty: 10 },
    npcs: [makeHostNpc(game, 'groom', { tx: 7, ty: 8 }, [
      '예식 소식과 가족분들을 위한 안내를 모아 두었어요.',
      '위 안내판에서 오시는 길과 날짜를 확인해 주세요.',
    ])],
    entrances: [{ tx: 5, ty: 11, to: 'hub', spawn: HUB_DOORS.info.back }],
    objects: [
      { id: 'door', sprite: 'door', floor: true, tx: 5, ty: 11 },
      { id: 'board', sprite: 'board', label: '가족분 안내', tx: 1, ty: 1, interact: () => showOverlay(game, {
        title: '오시는 길', html: kv([['지하철', w.transport.subway], ['버스', w.transport.bus], ['주차', w.transport.parking]]) || '<p class="muted">준비 중</p>' }) },
      { id: 'map', sprite: 'mapframe', label: '지도', tx: 4, ty: 1, interact: () => showOverlay(game, {
        title: '지도', html: `<p>${esc(w.address)}</p><div class="row">${mapButtons}</div>`,
        buttons: [{ label: '주소 복사', onClick: async () => { toast((await copyText(w.address)) ? '주소를 복사했어요' : '복사에 실패했어요'); return true; } }, { label: '닫기' }] }) },
      { id: 'calendar', sprite: 'calendar', label: '날짜 저장', tx: 7, ty: 1, interact: () => showOverlay(game, {
        title: '캘린더에 저장', html: `<p>${esc(formatDate(w.date))}</p>`,
        buttons: [{ label: '.ics 다운로드', primary: true, onClick: () => { downloadIcs(cfg); } }, { label: '닫기' }] }) },
      { id: 'desk', sprite: 'desk', label: '예식 소식', tx: 2, ty: 4, interact: () => showOverlay(game, { title: '예식 안내', html: infoHtml(cfg) }) },
      ...(game.assets?.objects?.plant ? [{ id: 'plantL', sprite: 'plant', tx: 1, ty: 8 }, { id: 'plantR', sprite: 'plant', tx: 9, ty: 8 }] : []),
      { id: 'phone', sprite: 'phone', label: '연락하기', tx: 7, ty: 4, interact: () => showOverlay(game, { title: '연락하기', html: contactsHtml(cfg) }) },
    ],
    onEnter: (g) => { if (!shownOnce) { shownOnce = true; showOverlay(g, { title: '예식 안내', html: infoHtml(cfg) }); } },
  });
}
