// 픽셀 웨딩 방명록 — Google Apps Script 웹 앱
//
// 설치: Google 스프레드시트 → 확장 프로그램 → Apps Script → 이 파일 내용을 Code.gs에 붙여넣기 → 저장
//      → 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" → 배포
//      → 배포 URL(https://script.google.com/macros/s/.../exec)을 data/config.json 의 guestbookApi 에 넣는다.
//      코드를 고친 뒤에는 배포 → 배포 관리 → 연필 → 버전 "새 버전" 으로 다시 배포해야 반영된다.
//
// 시트 'guestbook' 1행 헤더: timestamp | nickname | characterId | message | guestId | hidden
//   - message가 비어 있는 행은 "입장만 한 하객"(type: visit). 목록에는 글 행만 **모두** 내려준다(글 하나 = 방명록 정원의 꽃 하나).
//     같은 사람의 여러 글은 캐릭터 번호를 그 사람의 가장 최근 값(입장 기록 포함)으로 맞춰 광장에는 한 사람으로 선다.
//   - hidden 열에 TRUE(체크)를 넣으면 그 행은 목록에서 빠진다(지우지 않고 가리기).
//
// 보안 장치 (docs/DEPLOY.md 2절):
//   - 시트는 비공개. 웹 앱은 닉네임·캐릭터·메시지·시각만 내려준다.
//   - 기기 토큰(guestId)마다 글 1분 1건·하루 MAX_PER_DAY건, 입장 등록은 1시간 1건.
//   - PUBLIC_TOKEN을 비워 두지 않으면 요청의 token과 같아야 받는다(config.json의 guestbookToken과 동일하게).
//   - 셀이 = + - @ 로 시작하면 앞에 ' 를 붙여 수식으로 실행되지 않게 한다.
//   - 닉네임은 그 이름으로 기록을 남긴 기기(guestId)들의 것이다. 다른 기기가 같은 닉네임(대소문자·앞뒤 공백 무시)으로 쓰면 거절한다.
//     입장 화면은 GET ?action=check&nickname=..&guestId=.. 로 미리 확인하고, 겹치면 "본인이세요?"를 묻는다.
//     하객이 "네, 저예요"를 누르면 claim:true로 보내고, 그 기기도 같은 닉네임의 주인으로 추가된다
//     (카카오톡 인앱 ↔ 사파리, 폰 ↔ PC처럼 같은 사람이 다른 브라우저로 오는 경우). hidden 처리한 행은 닉네임을 붙잡지 않는다.
//   - 목록에는 방명록 글을 남긴 사람만 나온다(입장 기록은 닉네임 확보와 캐릭터 갱신에만 쓴다).
//   - 목록(doGet)은 CACHE_SEC 동안 캐시해 시트 읽기를 줄인다. 글이 들어오면 캐시를 지운다.

const SHEET_NAME = 'guestbook';
const PRESET_COUNT = 30;       // 클라이언트와 동일: 캐릭터 ID 0~29
const MAX_ROWS = 300;          // 목록으로 내려줄 최근 행 수(닉네임 중복 제거 전)
const COOLDOWN_SEC = 60;       // 같은 기기의 글 간격
const VISIT_SEC = 3600;        // 같은 기기의 입장 등록 간격
const MAX_PER_DAY = 10;        // 같은 기기의 하루 글 수
const CACHE_SEC = 20;          // 목록 캐시
const PUBLIC_TOKEN = '';       // 비우면 검사하지 않음. 넣으면 config.json guestbookToken과 같아야 한다.
const HEADERS = ['timestamp', 'nickname', 'characterId', 'message', 'guestId', 'hidden'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(HEADERS); }
  if (sh.getLastColumn() < HEADERS.length) { // 예전 4열 시트에 guestId·hidden 헤더를 보탠다
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 시트에 넣기 전 정리: 제어 문자 제거, 수식 시작 문자 앞에 ' */
function cleanCell_(value) {
  const s = String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
/** 시트에서 읽을 때 cleanCell_이 붙인 ' 를 벗긴다 */
function readCell_(value) {
  const s = String(value == null ? '' : value);
  return s.startsWith("'") ? s.slice(1) : s;
}
function isHidden_(value) {
  return value === true || /^(true|y|yes|1|o|v|✓|숨김)$/i.test(String(value || '').trim());
}
function validGuestId_(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

/** 닉네임 비교용: 유니코드 정규화 + 앞뒤 공백 제거 + 소문자 */
function nickKey_(value) {
  return readCell_(value).normalize('NFC').trim().toLowerCase();
}

/** 이 닉네임으로 기록을 남긴 기기 토큰들(숨김 행·빈 토큰 제외) */
function ownersOf_(nickname) {
  const key = nickKey_(nickname);
  const owners = new Set();
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return owners;
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (const r of rows) {
    if (isHidden_(r[5]) || !String(r[4] || '')) continue;
    if (nickKey_(r[1]) === key) owners.add(String(r[4]));
  }
  return owners;
}

function nicknameAvailable_(nickname, guestId) {
  const owners = ownersOf_(nickname);
  return owners.size === 0 || (!!guestId && owners.has(guestId));
}

/** 목록: 숨김 아닌 글 행 전부(최근 MAX_ROWS행 안), 최신순. 캐릭터는 그 사람의 가장 최근 값으로 맞춘다. */
function listEntries_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const from = Math.max(2, last - MAX_ROWS + 1);
  const rows = sh.getRange(from, 1, last - from + 1, HEADERS.length).getValues();
  const latestChar = new Map(), out = [];
  for (const r of rows) { // 시트는 시간순이라 뒤에 나온 값이 최신
    const nickname = readCell_(r[1]).trim();
    if (!nickname || isHidden_(r[5])) continue;
    latestChar.set(nickname, Number(r[2]) || 0);
    const m = readCell_(r[3]);
    if (m) out.push({ t: new Date(r[0]).getTime(), n: nickname, m });
  }
  return out.map((e) => ({ t: e.t, n: e.n, c: latestChar.get(e.n), m: e.m })).sort((a, b) => b.t - a.t);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'check') { // 닉네임 사용 가능 여부만 알려준다(누가 쓰는지는 알려주지 않는다)
    const nickname = cleanCell_(p.nickname);
    const guestId = validGuestId_(p.guestId) ? p.guestId : null;
    const len = readCell_(nickname).length;
    if (len < 2 || len > 10) return json_({ ok: false, error: '닉네임은 2~10자' });
    return json_({ ok: true, available: nicknameAvailable_(nickname, guestId) });
  }
  const cache = CacheService.getScriptCache();
  const cached = cache.get('list');
  if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  const text = JSON.stringify(listEntries_());
  if (text.length < 90000) cache.put('list', text, CACHE_SEC); // 캐시 항목 상한(100KB) 안에서만
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: '잘못된 요청' }); }
  if (PUBLIC_TOKEN && String(body.token || '') !== PUBLIC_TOKEN) return json_({ ok: false, error: '잘못된 요청' });

  const nickname = cleanCell_(body.nickname);
  const message = cleanCell_(body.message);
  const characterId = Number(body.characterId);
  const isVisit = body.type === 'visit';
  const guestId = validGuestId_(body.guestId) ? body.guestId : null;
  const nickLen = readCell_(nickname).length, msgLen = readCell_(message).length;
  if (nickLen < 2 || nickLen > 10) return json_({ ok: false, error: '닉네임은 2~10자' });
  if (!isVisit && (msgLen < 1 || msgLen > 100)) return json_({ ok: false, error: '메시지는 1~100자' });
  if (isVisit && msgLen > 0) return json_({ ok: false, error: '잘못된 요청' });
  if (!Number.isInteger(characterId) || characterId < 0 || characterId >= PRESET_COUNT) return json_({ ok: false, error: '캐릭터 오류' });

  const cache = CacheService.getScriptCache();
  const who = guestId || `nick:${readCell_(nickname)}`; // 기기 토큰이 없으면 닉네임 기준으로라도 제한
  const key = (isVisit ? 'visit:' : 'post:') + who;
  if (cache.get(key)) return json_(isVisit ? { ok: true } : { ok: false, error: '1분에 한 번만 남길 수 있어요' });
  const dayKey = `day:${who}:${Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd')}`;
  const today = Number(cache.get(dayKey) || 0);
  if (!isVisit && today >= MAX_PER_DAY) return json_({ ok: false, error: '오늘은 더 남길 수 없어요. 내일 다시 찾아 주세요' });

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    // 잠금 안에서 확인해야 두 기기가 동시에 같은 닉네임을 잡지 못한다.
    // claim: 하객이 "네, 저예요"로 확인한 요청. 기기 토큰이 있어야 하며, 기록되면 이 기기도 주인이 된다.
    const claim = body.claim === true && !!guestId;
    if (!claim && !nicknameAvailable_(nickname, guestId)) return json_({ ok: false, error: '이미 정원에 있는 닉네임이에요. 메뉴 → 내 캐릭터 바꾸기에서 본인 확인을 하거나 다른 닉네임을 골라 주세요', code: 'nickname-taken' });
    sheet_().appendRow([new Date(), nickname, characterId, message, guestId || '', false]);
    cache.put(key, '1', isVisit ? VISIT_SEC : COOLDOWN_SEC);
    if (!isVisit) cache.put(dayKey, String(today + 1), 60 * 60 * 26);
    cache.remove('list');
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
