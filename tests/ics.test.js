import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs } from '../js/ics.js';
import { DEFAULT_CONFIG, mergeConfig } from '../js/config.js';

test('buildIcs: 일정 2시간, CRLF, 필수 필드', () => {
  const cfg = mergeConfig(DEFAULT_CONFIG, {
    groom: { name: '민우' }, bride: { name: '지은' },
    wedding: { date: '2027-03-13T12:30:00+09:00', venue: '웨딩홀', hall: '3층', address: '서울' },
  });
  const ics = buildIcs(cfg);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART;TZID=Asia/Seoul:20270313T123000\r\n'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Seoul:20270313T143000\r\n'));
  assert.ok(ics.includes('SUMMARY:민우 ♥ 지은 결혼식\r\n'));
  assert.ok(ics.includes('LOCATION:웨딩홀 3층\\, 서울\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});
