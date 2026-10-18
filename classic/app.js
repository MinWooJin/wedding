import { DEFAULT_INVITATION, SIDE_NAMES, validSide, escapeHtml as esc, calendarFor, dayLabel, formatWeddingDate, orderedParents, sideContacts, sideAccounts, photoPath, safeLink, shareUrls } from './model.js';

export const FALLBACK = { groom:{name:'신랑',parents:[]}, bride:{name:'신부',parents:[]}, wedding:{date:'',venue:'예식 장소를 준비하고 있어요',map:{},transport:{}}, classic:{} };
const PHONE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h4l2 5-3 2c2 3 3 4 6 6l2-3 5 2v4c0 2-2 2-3 2C10 20 4 14 3 6c0-1 0-3 2-3Z"/></svg>';
const external = (url,text) => safeLink(url) ? `<a class="btn" href="${esc(safeLink(url))}" target="_blank" rel="noopener">${esc(text)}</a>` : '';
const section = (id,en,title,body) => `<section class="section reveal" aria-labelledby="${id}-title"><header class="section-head"><p class="eyebrow">${en}</p><h2 id="${id}-title">${title}</h2></header>${body}</section>`;
let toastTimer;
function toast(text) {
  let el = document.getElementById('classic-toast');
  if (!el) { el = document.createElement('div'); el.id = 'classic-toast'; el.className = 'toast'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); document.body.appendChild(el); }
  clearTimeout(toastTimer); el.textContent = text; el.hidden = false;
  toastTimer = setTimeout(()=>{el.hidden=true;},2000);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* In-app browsers may require the legacy copy path. */ }
  const previous = document.activeElement, area = document.createElement('textarea');
  area.value = text; area.setAttribute('readonly',''); area.style.cssText = 'position:fixed;left:0;top:0;opacity:0;font-size:16px';
  document.body.appendChild(area); area.focus(); area.select(); area.setSelectionRange(0,area.value.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* Return the failure to the user. */ }
  area.remove(); previous?.focus({preventScroll:true}); return ok;
}
function calendarHtml(iso) {
  const c = calendarFor(iso);
  if (!c) return '<p class="empty">예식 일정을 준비하고 있어요.</p>';
  const rows = [];
  for (let i=0;i<c.cells.length;i+=7) rows.push(`<tr>${c.cells.slice(i,i+7).map((d)=>`<td${d===c.day?' aria-current="date"':''}>${d?`<span${d===c.day?' class="wedding-day"':''}>${d}</span>`:''}</td>`).join('')}</tr>`);
  return `<div class="card"><p class="calendar-title">${c.year}. ${String(c.month).padStart(2,'0')}</p><table class="calendar" aria-label="${c.year}년 ${c.month}월, 예식일 ${c.day}일"><thead><tr>${[...'일월화수목금토'].map((d)=>`<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table><p class="countdown">${esc(dayLabel(iso))}</p></div>`;
}
function accountHtml(config,side) {
  const accounts = sideAccounts(config,side);
  return `<details class="card accounts"><summary>${SIDE_NAMES[side]}측 계좌 안내</summary><div class="account-list">${accounts.length ? accounts.map(({label,account:a})=>`<div class="account-row"><p class="account-role">${esc(label)}</p><p class="account-number">${esc(a.bank)} ${esc(a.number)}</p><p class="account-holder">예금주 ${esc(a.holder)}</p><div class="actions"><button class="btn" data-copy="${esc(a.number)}" aria-label="${esc(label)} 계좌번호 복사">계좌번호 복사</button>${external(a.kakaopay,'카카오페이')}</div></div>`).join('') : '<p class="muted">계좌 정보를 준비하고 있어요.</p>'}</div></details>`;
}

export function renderInvitation(root, config, photos = [], side = document.documentElement.dataset.side) {
  side = validSide(side);
  const w = config.wedding || {}, groom = config.groom || FALLBACK.groom, bride = config.bride || FALLBACK.bride;
  const name = `${groom.name} ♥ ${bride.name}`, date = formatWeddingDate(w.date);
  const cover = photoPath(config.classic?.coverPhoto) || photos[0];
  const contacts = sideContacts(config,side);
  const transport = Object.entries({지하철:w.transport?.subway,버스:w.transport?.bus,주차:w.transport?.parking}).filter(([,v])=>v);
  const urls = shareUrls(config.siteUrl,side,location.href);
  root.innerHTML = `<main class="page" id="classic-main">
    <section class="cover" aria-labelledby="cover-title"><p class="eyebrow">THE WEDDING DAY</p>${cover?`<img class="cover-photo" src="${esc(cover)}" alt="${esc(groom.name)} · ${esc(bride.name)}의 웨딩 사진" fetchpriority="high">`:`<div class="cover-fallback"><span>OUR NEW BEGINNING</span><img src="../assets/characters/couple.png" alt="팔짱을 낀 신랑과 신부의 픽셀 그림" width="144" height="108"><span>TOGETHER, WITH LOVE</span></div>`}<h1 id="cover-title">${esc(groom.name)}<span>·</span>${esc(bride.name)}</h1><time${w.date?` datetime="${esc(w.date)}"`:''}>${esc(date)}</time><p class="cover-venue">${esc(w.venue||'')}<br>${esc(w.hall||'')}</p></section>
    ${section('invitation','INVITATION','소중한 분들을 초대합니다',`<p class="invitation-copy">${esc(config.classic?.invitation || DEFAULT_INVITATION)}</p>${w.notice?`<p class="notice">${esc(w.notice)}</p>`:''}`)}
    ${section('family','OUR FAMILIES','함께하는 가족',`<div class="family-lines">${[groom,bride].map((p)=>`<p>${esc(orderedParents(p).map((parent)=>parent.name).filter(Boolean).join(' · '))}${p.parents?.some((parent)=>parent.name)?` 의 ${esc(p.relation||'')}`:''}<strong>${esc(p.name)}</strong></p>`).join('')}</div><div class="card contacts"><h3>${SIDE_NAMES[side]}측 연락하기</h3>${contacts.map((p)=>`<div class="contact-row"><span class="role">${esc(p.label)}</span><span class="name">${esc(p.name)}</span>${p.tel?`<a class="call" href="tel:${esc(p.tel)}" aria-label="${esc(p.name)}에게 전화">${PHONE_ICON}</a>`:''}</div>`).join('')}</div>`)}
    ${section('calendar','SAVE THE DATE','우리의 결혼식',calendarHtml(w.date))}
    ${section('gallery','OUR MOMENTS','우리의 순간들',photos.length?`<div class="gallery">${photos.map((src,i)=>`<button class="thumbnail" data-photo="${i}" aria-label="웨딩 사진 ${i+1} 크게 보기"><img src="${esc(src)}" alt="두 사람의 웨딩 사진 ${i+1}" loading="lazy" draggable="false"></button>`).join('')}</div>`:'<p class="empty">사진은 곧 채워질 예정이에요.</p>')}
    ${section('location','LOCATION','오시는 길',`<div class="card"><p class="venue-title">${esc(w.venue||'예식 장소를 준비하고 있어요')}</p><p>${esc(w.hall||'')}</p>${w.address?`<p class="address">${esc(w.address)}</p><div class="actions"><button class="btn" data-copy="${esc(w.address)}">주소 복사</button></div>`:''}<div class="actions map-actions">${external(w.map?.kakao,'카카오맵')}${external(w.map?.naver,'네이버지도')}${external(w.map?.tmap,'티맵')}</div>${transport.length?`<dl class="transport">${transport.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:''}</div>`)}
    ${section('accounts','WITH GRATITUDE','마음 전하실 곳',accountHtml(config,side))}
    ${section('garden','OUR LITTLE GARDEN','축하가 피어나는 정원',`<p class="garden-copy">두 사람의 작은 픽셀 정원에서<br>축하 한마디를 남겨 주세요.</p><img class="garden-preview" src="../classic/img/garden-preview.png" width="352" height="240" loading="lazy" alt="벚꽃과 꽃 아치 아래 두 사람이 서 있는 픽셀 웨딩 정원"><a class="btn primary garden-link" href="../common/">정원 입장하기 →</a>`)}
    ${section('share','SHARE OUR JOY','소식 나누기',`<div class="actions share-actions">${config.kakaoJsKey?'<button class="btn" data-kakao>카카오톡으로 공유</button>':''}<button class="btn" data-copy="${esc(urls.page)}">링크 복사</button></div>`)}
    <footer class="footer" aria-label="청첩장 맺음말"><p>${esc(groom.name)} · ${esc(bride.name)}</p><p>${calendarFor(w.date)?`${calendarFor(w.date).year}.${String(calendarFor(w.date).month).padStart(2,'0')}.${String(calendarFor(w.date).day).padStart(2,'0')}`:'함께해 주셔서 감사합니다'}</p></footer></main>`;
  root.querySelectorAll('[data-copy]').forEach((b)=>{b.onclick=async()=>toast(await copyText(b.dataset.copy)?'복사했어요':'복사하지 못했어요. 다시 시도해 주세요.');});
  root.querySelectorAll('[data-photo]').forEach((b)=>{b.onclick=()=>openViewer(photos,Number(b.dataset.photo),root);});
  root.querySelectorAll('.cover-photo,.thumbnail img').forEach((img)=>{img.draggable=false;img.oncontextmenu=(e)=>e.preventDefault();img.ondragstart=(e)=>e.preventDefault();});
  root.querySelector('[data-kakao]')?.addEventListener('click',async()=>{
    try { await loadKakao(config.kakaoJsKey); window.Kakao.Share.sendDefault({objectType:'feed',content:{title:`${name} 결혼합니다`,description:`${date} · ${w.venue||''} ${w.hall||''}`,imageUrl:urls.image,link:{mobileWebUrl:urls.page,webUrl:urls.page}},buttons:[{title:'청첩장 보기',link:{mobileWebUrl:urls.page,webUrl:urls.page}}]}); }
    catch { toast('공유를 열지 못했어요. 링크 복사를 이용해 주세요.'); }
  });
  const coverImage = root.querySelector('.cover-photo');
  if (coverImage) coverImage.onerror=()=>{coverImage.replaceWith(fallbackCover());};
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries)=>entries.forEach((e)=>{if(e.isIntersecting){e.target.classList.remove('pending');observer.unobserve(e.target);}}),{threshold:.06});
    root.querySelectorAll('.reveal').forEach((el)=>{el.classList.add('pending');observer.observe(el);});
  }
  document.title = `${name} 결혼합니다 · ${SIDE_NAMES[side]}측`;
  document.querySelector('meta[property="og:image"]')?.setAttribute('content',urls.image);
  return { urls };
}
function fallbackCover() {
  const div=document.createElement('div');div.className='cover-fallback';
  div.innerHTML='<span>OUR NEW BEGINNING</span><img src="../assets/characters/couple.png" alt="팔짱을 낀 신랑과 신부의 픽셀 그림" width="144" height="108"><span>TOGETHER, WITH LOVE</span>';return div;
}

export function openViewer(photos, index, background) {
  const previous=document.activeElement, viewer=document.createElement('div'), scrollY=window.scrollY;
  const oldStyle={position:document.body.style.position,top:document.body.style.top,width:document.body.style.width};
  const oldHidden=background.getAttribute('aria-hidden'),oldInert=background.inert;
  viewer.className='viewer';viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','웨딩 사진 보기');
  viewer.innerHTML='<img alt=""><button class="viewer-close" aria-label="사진 닫기">×</button><button class="viewer-prev" aria-label="이전 사진">‹</button><button class="viewer-next" aria-label="다음 사진">›</button><p class="viewer-count" aria-live="polite"></p>';
  const img=viewer.querySelector('img'),closeButton=viewer.querySelector('.viewer-close');
  const render=()=>{index=(index+photos.length)%photos.length;img.src=photos[index];img.alt=`웨딩 사진 ${index+1} / ${photos.length}`;viewer.querySelector('.viewer-count').textContent=`${index+1} / ${photos.length}`;};
  const close=()=>{document.removeEventListener('keydown',key);viewer.remove();background.inert=oldInert;if(oldHidden===null)background.removeAttribute('aria-hidden');else background.setAttribute('aria-hidden',oldHidden);Object.assign(document.body.style,oldStyle);window.scrollTo(0,scrollY);previous?.focus({preventScroll:true});};
  const key=(e)=>{
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='ArrowRight'){e.preventDefault();index++;render();}
    if(e.key==='ArrowLeft'){e.preventDefault();index--;render();}
    if(e.key==='Tab'){const buttons=[...viewer.querySelectorAll('button:not([hidden])')],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===closeButton){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();closeButton.focus();}}
  };
  closeButton.onclick=close;
  viewer.querySelector('.viewer-prev').onclick=()=>{index--;render();};viewer.querySelector('.viewer-next').onclick=()=>{index++;render();};
  if(photos.length<2){viewer.querySelector('.viewer-prev').hidden=true;viewer.querySelector('.viewer-next').hidden=true;}
  viewer.oncontextmenu=(e)=>e.preventDefault();viewer.ondragstart=(e)=>e.preventDefault();
  let start;
  img.addEventListener('touchstart',(e)=>{start=e.touches.length===1?[e.touches[0].clientX,e.touches[0].clientY]:null;},{passive:true});
  img.addEventListener('touchcancel',()=>{start=null;},{passive:true});
  img.addEventListener('touchend',(e)=>{if(!start)return;const dx=e.changedTouches[0].clientX-start[0],dy=e.changedTouches[0].clientY-start[1];start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2){index+=dx<0?1:-1;render();}},{passive:true});
  background.setAttribute('aria-hidden','true');background.inert=true;Object.assign(document.body.style,{position:'fixed',top:`-${scrollY}px`,width:'100%'});
  document.body.appendChild(viewer);document.addEventListener('keydown',key);render();closeButton.focus();
}
let kakaoLoading;
function loadKakao(key) {
  if(window.Kakao?.isInitialized?.())return Promise.resolve();
  if(!kakaoLoading)kakaoLoading=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    script.integrity='sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka';script.crossOrigin='anonymous';
    const fail=()=>{clearTimeout(timer);script.remove();kakaoLoading=null;reject(new Error('SDK unavailable'));};
    const timer=setTimeout(fail,8000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=fail;document.head.appendChild(script);
  });
  return kakaoLoading.then(()=>{if(!window.Kakao.isInitialized())window.Kakao.init(key);});
}
export async function loadInvitationData(fetcher = fetch) {
  const get = async (url) => {
    const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),6000);
    try { const response=await fetcher(url,{cache:'no-cache',signal:controller.signal});if(!response.ok)throw new Error('load');return await response.json(); }
    finally { clearTimeout(timer); }
  };
  const [configResult, galleryResult] = await Promise.allSettled([get('../data/config.json'),get('../gallery/manifest.json')]);
  const value=configResult.status==='fulfilled'?configResult.value:null;
  const failed=!(value?.groom && value?.bride && value?.wedding);
  return { config:failed?FALLBACK:value, failed, photos:galleryResult.status==='fulfilled' && Array.isArray(galleryResult.value)?galleryResult.value.map(photoPath).filter(Boolean):[] };
}
/**
 * 웨딩 사진 저장 막기. 길게 누르기·우클릭·끌어 저장을 막고, 화면이 뒤로 가거나(앱 전환 미리보기) 창이 포커스를 잃으면
 * 사진을 가린다(데스크톱 캡처 도구가 뜰 때 등). 휴대폰 OS의 스크린샷 자체는 웹 페이지가 막을 수 없다.
 */
export function guardPhotos(doc = document, win = window) {
  const root = doc.documentElement;
  const veil = (on) => root.classList.toggle('photos-veiled', on);
  doc.addEventListener('visibilitychange', () => veil(doc.hidden));
  win.addEventListener('blur', () => veil(true));
  win.addEventListener('focus', () => veil(false));
  win.addEventListener('pagehide', () => veil(true));
  win.addEventListener('pageshow', () => veil(doc.hidden));
  const isPhoto = (t) => t?.closest?.('.cover-photo,.thumbnail,.viewer');
  doc.addEventListener('contextmenu', (e) => { if (isPhoto(e.target)) e.preventDefault(); });
  doc.addEventListener('dragstart', (e) => { if (isPhoto(e.target)) e.preventDefault(); });
  // 데스크톱 PrintScreen 키: 잠깐 가린다(이미 찍힌 화면은 되돌릴 수 없지만 연속 캡처를 어렵게)
  doc.addEventListener('keyup', (e) => { if (e.key === 'PrintScreen') { veil(true); setTimeout(() => veil(doc.hidden), 1500); } });
}

async function start() {
  const root=document.getElementById('invitation');if(!root)return;
  const {config,photos,failed}=await loadInvitationData();
  if(failed){const status=document.getElementById('load-status');status.textContent='청첩장을 준비 중입니다. 정보를 불러오지 못했어요.';const retry=document.createElement('button');retry.className='btn';retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();status.appendChild(retry);}
  renderInvitation(root,config,photos);
  guardPhotos();
  document.getElementById('load-status')?.removeAttribute('aria-busy');
}
if(typeof document!=='undefined')start();
