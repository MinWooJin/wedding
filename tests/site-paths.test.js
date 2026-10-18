import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(root + file, 'utf8');

test('루트는 픽셀 게스트북(/common/)으로 바로 보낸다', () => {
  const html = read('index.html');
  assert.match(html, /http-equiv="refresh" content="0; url=common\/"/);
  assert.match(html, /location\.replace\('common\/'/);
  assert.match(html, /name="robots" content="noindex"/);
  assert.doesNotMatch(html, /js\/main\.js/, '루트에서는 게임을 띄우지 않는다');
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
