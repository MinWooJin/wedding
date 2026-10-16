const pad = (n) => String(n).padStart(2, '0');

/** Date → KST 벽시계 기준 'YYYYMMDDTHHMMSS' */
function kstStamp(date) {
  const k = new Date(date.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}T${pad(k.getUTCHours())}${pad(k.getUTCMinutes())}00`;
}
const escText = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

export function buildIcs(cfg) {
  const start = new Date(cfg.wedding.date);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const w = cfg.wedding;
  const location = [w.venue, w.hall].filter(Boolean).join(' ') + (w.address ? `, ${w.address}` : '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//pixel-wedding//KO', 'BEGIN:VEVENT',
    `UID:wedding-${start.getTime()}@pixel-wedding`,
    `DTSTAMP:${kstStamp(new Date())}`,
    `DTSTART;TZID=Asia/Seoul:${kstStamp(start)}`,
    `DTEND;TZID=Asia/Seoul:${kstStamp(end)}`,
    `SUMMARY:${escText(`${cfg.groom.name} ♥ ${cfg.bride.name} 결혼식`)}`,
    `LOCATION:${escText(location)}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
