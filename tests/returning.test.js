import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findVisitor, filterVisitors } from '../js/ui/returning.js';

const visitors = [{ n: '새암친구', c: 2 }, { n: 'Alice', c: 5 }, { n: '가람', c: 1 }];

test('findVisitor: 대소문자·앞뒤 공백을 무시하고 같은 닉네임을 찾는다, 없으면 null', () => {
  assert.deepEqual(findVisitor(visitors, ' alice '), { n: 'Alice', c: 5 });
  assert.equal(findVisitor(visitors, '새암'), null);
});

test('filterVisitors: 검색어가 들어간 닉네임만 가나다순, 빈 검색어면 전체', () => {
  assert.deepEqual(filterVisitors(visitors, '').map((v) => v.n), ['가람', '새암친구', 'Alice']);
  assert.deepEqual(filterVisitors(visitors, '암').map((v) => v.n), ['새암친구']);
});
