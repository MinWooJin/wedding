import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, mergeConfig, daysUntil, ddayLabel, formatDate } from '../js/config.js';

test('mergeConfig: 중첩 객체는 병합, 배열·원시값은 교체, undefined는 무시', () => {
  const r = mergeConfig(DEFAULT_CONFIG, { groom: { name: '민우' }, greetings: ['안녕'], wedding: { map: { kakao: 'k' } } });
  assert.equal(r.groom.name, '민우');
  assert.equal(r.groom.phone, '');
  assert.deepEqual(r.greetings, ['안녕']);
  assert.equal(r.wedding.map.kakao, 'k');
  assert.equal(r.wedding.map.naver, '');
  assert.notEqual(r, DEFAULT_CONFIG);
  assert.equal(DEFAULT_CONFIG.groom.name, '신랑');
});

test('daysUntil: 날짜 차이(일), 시간 무시', () => {
  const now = new Date(2026, 9, 16, 23, 0);
  assert.equal(daysUntil('2026-10-17T01:00:00+09:00', now), 1);
  assert.equal(daysUntil('2026-10-16T09:00:00+09:00', now), 0);
  assert.equal(daysUntil('2026-10-10T12:00:00+09:00', now), -6);
});

test('ddayLabel', () => {
  const now = new Date(2026, 9, 16);
  assert.equal(ddayLabel('2026-12-25T12:00:00+09:00', now), 'D-70');
  assert.equal(ddayLabel('2026-10-16T12:00:00+09:00', now), 'D-Day');
  assert.equal(ddayLabel('2026-10-01T12:00:00+09:00', now), '감사합니다');
});

test('formatDate: 한국어 날짜·요일·시각', () => {
  assert.equal(formatDate('2027-03-13T12:30:00+09:00'), '2027년 3월 13일 토요일 오후 12시 30분');
  assert.equal(formatDate('2027-03-14T11:00:00+09:00'), '2027년 3월 14일 일요일 오전 11시');
});
