import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assetFilename, loadAssets } from '../js/assets.js';

test('버전 파일은 같은 ID로 선택하고 경로 또는 잘못된 값은 원본을 사용한다', () => {
  assert.equal(assetFilename({ files: { characters: { groom: 'groom-v3.png' } } }, 'characters', 'groom'), 'groom-v3.png');
  for (const value of ['../groom.png', 'https://elsewhere/groom.png', null, {}, 'groom.svg']) {
    assert.equal(assetFilename({ files: { characters: { groom: value } } }, 'characters', 'groom'), 'groom.png');
  }
  assert.equal(assetFilename({}, 'tiles', 'X1'), 'X1.png');
});

test('선택된 버전 PNG가 없어도 기존 그림을 로드하고 커버에 실제 URL을 전달한다', async () => {
  const saved = { fetch: globalThis.fetch, Image: globalThis.Image, document: globalThis.document };
  const requested = [];
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ characters: ['groom'], files: { characters: { groom: 'groom-v3.png' } } }) });
  globalThis.Image = class {
    width = 48; height = 72;
    set src(value) {
      requested.push(value);
      queueMicrotask(() => value.endsWith('-v3.png') ? this.onerror() : this.onload());
    }
  };
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {}, translate() {}, scale() {} }) }) };
  try {
    const loaded = await loadAssets('assets');
    assert.deepEqual(requested, ['assets/characters/groom-v3.png', 'assets/characters/groom.png']);
    assert.equal(loaded.characters.groom.down[0].h, 72);
    assert.equal(loaded.urls['characters/groom'], 'assets/characters/groom.png');
  } finally {
    Object.assign(globalThis, saved);
  }
});

test('등록된 버전 파일은 실제 PNG이고 캐릭터 프레임과 타일 격자는 유지된다', () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));
  for (const [group, variants] of Object.entries(manifest.files ?? {})) {
    for (const [name, filename] of Object.entries(variants)) {
      assert.equal(assetFilename(manifest, group, name), filename);
      const png = readFileSync(new URL(`../assets/${group}/${filename}`, import.meta.url));
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      const size = [png.readUInt32BE(16), png.readUInt32BE(20)];
      if (group === 'characters') assert.deepEqual(size, [48, 72]);
      if (group === 'tiles') assert.deepEqual(size, filename === 'lawn-v5.png' ? [128,128] : [32,32]);
      if (name === 'tree') assert.deepEqual(size, [64, 96]);
    }
  }
});

test('단상용 커플은 개별 캐릭터와 달리 96×72 크기로 로드한다', async () => {
  const saved = { fetch: globalThis.fetch, Image: globalThis.Image, document: globalThis.document };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ characters: ['couple', 'groom'] }) });
  globalThis.Image = class {
    width = 96; height = 72;
    set src(value) { queueMicrotask(() => this.onload()); }
  };
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {}, translate() {}, scale() {} }) }) };
  try {
    const loaded = await loadAssets();
    assert.equal(loaded.characters.couple.down[0].w, 96);
    assert.equal(loaded.characters.couple.down[0].h, 72);
    assert.equal(loaded.characters.groom.down[0].w, 48);
  } finally { Object.assign(globalThis, saved); }
});


test('128px 잔디 재질은 축소하지 않고 일반 바닥만 32px로 로드한다', async () => {
  const saved = { fetch: globalThis.fetch, Image: globalThis.Image, document: globalThis.document };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ tiles: ['G','N'] }) });
  globalThis.Image = class { width = 128; height = 128; set src(value) { queueMicrotask(() => this.onload()); } };
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
  try {
    const loaded = await loadAssets();
    assert.equal(loaded.tiles.G.w, 128);
    assert.equal(loaded.tiles.G.h, 128);
    assert.equal(loaded.tiles.N.w, 32);
  } finally { Object.assign(globalThis, saved); }
});
