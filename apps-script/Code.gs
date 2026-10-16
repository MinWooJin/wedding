// Google 스프레드시트 → 확장 프로그램 → Apps Script 에 붙여넣고
// 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" 로 배포한다.
// 배포 URL(https://script.google.com/macros/s/.../exec)을 data/config.json 의 guestbookApi 에 넣는다.
// 시트 1행 헤더: timestamp | nickname | characterId | message
const SHEET_NAME = 'guestbook';
const MAX_ROWS = 100;
const COOLDOWN_SEC = 60;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(['timestamp', 'nickname', 'characterId', 'message']); }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_([]);
  const from = Math.max(2, last - MAX_ROWS + 1);
  const rows = sh.getRange(from, 1, last - from + 1, 4).getValues();
  const out = rows
    .filter(r => r[1] && r[3])
    .map(r => ({ t: new Date(r[0]).getTime(), n: String(r[1]), c: Number(r[2]), m: String(r[3]) }))
    .reverse();
  return json_(out);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: '잘못된 요청' }); }
  const nickname = String(body.nickname || '').trim();
  const message = String(body.message || '').trim();
  const characterId = Number(body.characterId);
  if (nickname.length < 2 || nickname.length > 10) return json_({ ok: false, error: '닉네임은 2~10자' });
  if (message.length < 1 || message.length > 100) return json_({ ok: false, error: '메시지는 1~100자' });
  if (!Number.isInteger(characterId) || characterId < 0 || characterId > 9) return json_({ ok: false, error: '캐릭터 오류' });

  const cache = CacheService.getScriptCache();
  const key = 'nick:' + nickname;
  if (cache.get(key)) return json_({ ok: false, error: '1분에 한 번만 남길 수 있어요' });

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    sheet_().appendRow([new Date(), nickname, characterId, message]);
    cache.put(key, '1', COOLDOWN_SEC);
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
