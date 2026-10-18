import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calendarFor, daysUntil, dayLabel, familyLine, sideAccounts, sideContacts, photoPath, safeLink, shareUrls } from '../classic/model.js';
import { loadInvitationData, copyText } from '../classic/app.js';

const root = fileURLToPath(new URL('../',import.meta.url));
const read = (name)=>readFileSync(resolve(root,name),'utf8');
test('신랑·신부 HTML은 측 구분과 제목·OG 메타를 제외하고 동일하다',()=>{
  const normalize=(html)=>html.replace(/data-side="(?:groom|bride)"/g,'data-side="SIDE"').replace(/<title>.*?<\/title>/g,'<title></title>').replace(/<meta property="og:[^"]+"[^>]*>/g,'');
  assert.equal(normalize(read('groom/index.html')),normalize(read('bride/index.html')));
});
test('일반형 참조 파일과 공유 그림이 존재한다',()=>{
  for(const file of ['groom/index.html','bride/index.html','classic/app.js','classic/app.css','classic/model.js']){
    const source=read(file),base=dirname(resolve(root,file));
    for(const [,value] of source.matchAll(/(?:src|href)=["'](\.\.\/[^"']+)["']/g)){
      assert.ok(existsSync(resolve(base,value.split(/[?#]/)[0])),`${file}: ${value}`);
    }
  }
  for(const [file,size] of [['garden-preview.png',[352,240]],['og-groom.png',[1200,630]],['og-bride.png',[1200,630]]]){
    const png=readFileSync(resolve(root,'classic/img',file));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],size);
  }
  const cfg=JSON.parse(read('data/config.json'));assert.equal(typeof cfg.classic.invitation,'string');assert.equal(typeof cfg.classic.coverPhoto,'string');
});
test('설정 실패 시 준비 중 뼈대로, 사진 실패 시 빈 갤러리로 돌아간다',async()=>{
  const failed=await loadInvitationData(async()=>{throw new Error('offline');});
  assert.equal(failed.failed,true);assert.equal(failed.config.groom.name,'신랑');assert.deepEqual(failed.photos,[]);
  const loaded=await loadInvitationData(async(url)=>({ok:true,json:async()=>url.includes('config')?{groom:{name:'G'},bride:{name:'B'},wedding:{}}:['photo.webp','../private.png']}));
  assert.equal(loaded.failed,false);assert.deepEqual(loaded.photos,['../gallery/photo.webp']);
});
test('달력은 한국 날짜의 1월9일 토요일과 윤년 2월을 정확히 표시한다',()=>{
  const c=calendarFor('2027-01-09T11:30:00+09:00');
  assert.equal(c.cells.indexOf(9)%7,6);assert.equal(c.cells.filter(Boolean).length,31);
  assert.equal(calendarFor('2028-02-29T11:30:00+09:00').cells.filter(Boolean).length,29);
  assert.equal(calendarFor('invalid'),null);
});
test('D-day는 실행 컴퓨터 시간대와 관계없이 서울의 날짜로 계산한다',()=>{
  const date='2027-01-09T11:30:00+09:00';
  assert.equal(daysUntil(date,new Date('2026-10-17T15:30:00Z')),83);
  assert.equal(dayLabel(date,new Date('2027-01-08T16:00:00Z')),'오늘이에요');
  assert.equal(daysUntil(date,new Date('2027-01-08T14:59:59Z')),1);
  assert.equal(dayLabel(date,new Date('2027-01-10T00:00:00Z')),'함께해 주셔서 감사합니다');
});
const cfg={groom:{name:'신랑',relation:'아들',phone:'010-1111-1111',account:{number:'G-SELF'},parents:[{name:'어머니',role:'어머니',phone:'010-1111-3333',account:{number:'G-MOTHER'}},{name:'아버지',role:'아버지',phone:'',account:{number:'G-FATHER'}}]},bride:{name:'신부',relation:'딸',phone:'010-2222-1111',account:{number:'B-SELF'},parents:[{name:'아버지',role:'아버지',phone:'010-2222-2222',account:{number:''}}]}};
test('계좌와 연락처는 선택한 측만, 본인·아버지·어머니 순서로 추린다',()=>{
  const groom=sideAccounts(cfg,'groom'),bride=sideAccounts(cfg,'bride');
  assert.deepEqual(groom.map((p)=>p.account.number),['G-SELF','G-FATHER','G-MOTHER']);
  assert.deepEqual(bride.map((p)=>p.account.number),['B-SELF']);
  assert.equal(JSON.stringify(groom).includes('B-SELF'),false);
  assert.equal(JSON.stringify(sideContacts(cfg,'groom')).includes('2222'),false);
  assert.equal(sideContacts(cfg,'groom')[0].tel,'01011111111');
  assert.equal(sideContacts(cfg,'groom')[1].tel,'');
  assert.equal(familyLine(cfg.groom),'아버지 · 어머니의 아들 신랑');
  assert.equal(familyLine({name:'신부',parents:[]}), '신부');
});
test('정적 하위 경로 공유 링크를 유지하고 외부·상위 경로 사진을 거절한다',()=>{
  assert.equal(photoPath('웨딩/사진 1.webp'),'../gallery/%EC%9B%A8%EB%94%A9/%EC%82%AC%EC%A7%84%201.webp');
  for(const value of ['../secret','https://example.com/x.png','/photo.jpg','bad.png?x=1'])assert.equal(photoPath(value),'');
  assert.equal(safeLink('javascript:alert(1)'),'');
  const expected={page:'https://example.com/wedding/bride/',image:'https://example.com/wedding/classic/img/og-bride.png'};
  assert.deepEqual(shareUrls('', 'bride', 'https://example.com/wedding/groom/'),expected);
  assert.deepEqual(shareUrls('', 'bride', 'https://example.com/wedding/groom/index.html'),expected);
  assert.deepEqual(shareUrls('https://example.com/wedding/common/', 'bride', 'https://localhost/groom/'),expected);
});


test('복사는 Clipboard API 거절 시 기존 copy 명령으로 폴백하고 포커스를 돌려준다',async()=>{
  const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),doc=Object.getOwnPropertyDescriptor(globalThis,'document');
  let copied='',selected=false,removed=false,focused=false;
  const area={style:{},setAttribute(){},focus(){},select(){selected=true;},setSelectionRange(){},remove(){removed=true;}};
  try {
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async(text)=>{copied=text;}}}});
    assert.equal(await copyText('public test link'),true);assert.equal(copied,'public test link');
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw new Error('denied');}}}});
    Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:{focus(){focused=true;}},createElement(){return area;},body:{appendChild(){}},execCommand(command){assert.equal(command,'copy');return true;}}});
    assert.equal(await copyText('fallback test link'),true);assert.equal(area.value,'fallback test link');
    assert.ok(selected&&removed&&focused);
  } finally {
    if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;
    if(doc)Object.defineProperty(globalThis,'document',doc);else delete globalThis.document;
  }
});
