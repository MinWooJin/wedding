// Review only: no production scene registration or API traffic.
(function(){
  const ids=['groom','bride','guest'],files=['groom-ceremony-v1.png','bride-ceremony-v1.png','guest-seated-v1.png'];
  const button=document.getElementById('play'),bow=document.getElementById('bow'),status=document.getElementById('motion-status');
  let running=false,timer,phase=0,images=[];
  const render=(pose)=>{
    ids.forEach((id,i)=>{const c=document.getElementById(id+'-motion'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;const frame=i===2?(phase%6)*2+(phase%2):pose??phase%4;ctx.drawImage(images[i],frame*w,0,w,h,0,0,w,h);});
    status.textContent=pose===5?'맞절 · 프레임5':`보행 프레임 ${phase%4} · 하객 ${phase%6+1} ${phase%2?'박수':'착석'}`;
  };
  const stop=()=>{running=false;clearInterval(timer);button.setAttribute('aria-pressed','false');button.textContent='보행·박수 재생';};
  Promise.all(files.map(file=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src='../assets/characters/'+file;}))).then(loaded=>{
    images=loaded;render();
    button.onclick=()=>{if(running){stop();return;}running=true;button.setAttribute('aria-pressed','true');button.textContent='재생 멈추기';timer=setInterval(()=>{phase++;render();},250);};
    bow.onclick=()=>{stop();render(5);};
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){button.disabled=true;status.textContent='움직임 줄이기 · 정지 프레임 표시';}
  }).catch(()=>{status.textContent='프레임을 불러오지 못했습니다.';button.disabled=true;bow.disabled=true;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
