// 픽셀 웨딩 방명록 — Google Apps Script 웹 앱
//
// 설치: Google 스프레드시트 → 확장 프로그램 → Apps Script → 이 파일 내용을 Code.gs에 붙여넣기 → 저장
//      → 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" → 배포
//      → 배포 URL(https://script.google.com/macros/s/.../exec)을 data/config.json 의 guestbookApi 에 넣는다.
//      코드를 고친 뒤에는 배포 → 배포 관리 → 연필 → 버전 "새 버전" 으로 다시 배포해야 반영된다.
//
// 시트 'guestbook' 1행 헤더: timestamp | nickname | characterId | message | guestId | hidden
//   - message가 비어 있는 행은 "입장만 한 하객"(type: visit). 같은 닉네임은 가장 최근 행 하나만 내려준다.
//   - hidden 열에 TRUE(체크)를 넣으면 그 행은 목록에서 빠진다(지우지 않고 가리기).
//
// 보안 장치 (docs/DEPLOY.md 2절):
//   - 시트는 비공개. 웹 앱은 닉네임·캐릭터·메시지·시각만 내려준다.
//   - 기기 토큰(guestId)마다 글 1분 1건·하루 MAX_PER_DAY건, 입장 등록은 1시간 1건.
//   - PUBLIC_TOKEN을 비워 두지 않으면 요청의 token과 같아야 받는다(config.json의 guestbookToken과 동일하게).
//   - 셀이 = + - @ 로 시작하면 앞에 ' 를 붙여 수식으로 실행되지 않게 한다.
//   - 목록(doGet)은 CACHE_SEC 동안 캐시해 시트 읽기를 줄인다. 글이 들어오면 캐시를 지운다.

const SHEET_NAME = 'guestbook';
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

/** 목록: 숨김 아닌 행 중 닉네임당 최신 1건(메시지가 있는 행 우선), 최신순 */
function listEntries_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const from = Math.max(2, last - MAX_ROWS + 1);
  const rows = sh.getRange(from, 1, last - from + 1, HEADERS.length).getValues();
  const byNick = new Map();
  for (const r of rows) {
    const nickname = readCell_(r[1]).trim();
    if (!nickname || isHidden_(r[5])) continue;
    const e = { t: new Date(r[0]).getTime(), n: nickname, c: Number(r[2]) || 0, m: readCell_(r[3]) };
    const prev = byNick.get(e.n);
    // 메시지가 있는 행을 우선 보존하고, 입장 기록만 새로 오면 캐릭터·시각만 갱신한다.
    if (!prev) byNick.set(e.n, e);
    else if (e.m) byNick.set(e.n, e);
    else if (!prev.m) byNick.set(e.n, e);
    else byNick.set(e.n, { ...prev, c: e.c, t: e.t });
  }
  return [...byNick.values()].sort((a, b) => b.t - a.t);
}

function doGet() {
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
  if (!Number.isInteger(characterId) || characterId < 0 || characterId > 9) return json_({ ok: false, error: '캐릭터 오류' });

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
    sheet_().appendRow([new Date(), nickname, characterId, message, guestId || '', false]);
    cache.put(key, '1', isVisit ? VISIT_SEC : COOLDOWN_SEC);
    if (!isVisit) cache.put(dayKey, String(today + 1), 60 * 60 * 26);
    cache.remove('list');
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
