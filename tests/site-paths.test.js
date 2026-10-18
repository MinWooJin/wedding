import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(root + file, 'utf8');

test('루트는 픽셀 정원·신랑측·신부측 세 입구를 고르는 페이지다', () => {
  const html = read('index.html');
  for (const [href, label] of [['common/', '정원 입장하기'], ['groom/', '신랑측 청첩장 보기'], ['bride/', '신부측 청첩장 보기']]) {
    assert.ok(html.includes(`href="${href}"`), `${href} 링크`);
    assert.ok(html.includes(label), label);
  }
  assert.match(html, /name="robots" content="noindex"/);
  assert.doesNotMatch(html, /js\/main\.js|http-equiv="refresh"/, '루트에서는 게임을 띄우거나 자동 이동하지 않는다');
  assert.ok(existsSync(root + 'assets/characters/couple.png'), '입구 페이지의 두 사람 그림');
});

test('/common/은 루트의 코드·그림·설정을 base로 가리키는 픽셀 앱 페이지다', () => {
  const html = read('common/index.html');
  assert.match(html, /<base href="\.\.\/">/);
  assert.ok(html.indexOf('<base') < html.indexOf('<link'), 'base는 모든 상대 참조보다 먼저');
  for (const ref of ['css/style.css', 'js/main.js']) {
    assert.ok(html.includes(`"${ref}"`), `${ref} 참조`);
    assert.ok(existsSync(root + ref), `${ref} 존재`);
  }
  assert.doesNotMatch(html, /href="#/, 'base가 있으면 #링크가 루트로 튀므로 쓰지 않는다');
  for (const id of ['game', 'hud', 'intro', 'overlay', 'toast']) assert.ok(html.includes(`id="${id}"`), `#${id}`);
});

test('일반형 청첩장의 정원 입장 버튼은 /common/으로 간다', () => {
  assert.match(read('classic/app.js'), /class="btn primary garden-link" href="\.\.\/common\/"/);
  for (const side of ['groom', 'bride']) assert.ok(existsSync(`${root}${side}/index.html`));
});
