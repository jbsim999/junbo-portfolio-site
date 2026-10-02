/* A bounded, local-only fishing experience. Content never depends on winning.
   World geometry, actor baselines, camera and effects have one coordinate space. */
(() => {
  'use strict';
  const W=1080,H=520,FOOT=440;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projects=window.PROFILE.projects;
  const sites=[
    {id:'statistics',x:180,y:222,label:'통계 조회 성능 개선',color:['#466c80','#87bac8','#d3e7e5']},
    {id:'consistency',x:540,y:222,label:'회원 상태 데이터 보정',color:['#537768','#a6c7a1','#e2e7c7']},
    {id:'operations',x:900,y:222,label:'운영 도구 · 이기종 연계',color:['#856951','#c6aa7b','#eee0b9']}
  ];
  const settingKey='junbo-fishing-v1';
  const state={active:false,selected:0,x:180,y:FOOT,camera:0,phase:'idle',elapsed:0,clock:0,goal:null,progress:0,hold:false,walking:false,facing:1,frame:0,caught:new Set(),assist:true,sound:false};
  try{const saved=JSON.parse(localStorage.getItem(settingKey)||'null');if(saved&&typeof saved==='object'){state.caught=new Set((Array.isArray(saved.caught)?saved.caught:[]).filter(id=>sites.some(s=>s.id===id)));if(typeof saved.assist==='boolean')state.assist=saved.assist;if(typeof saved.sound==='boolean')state.sound=saved.sound;}}catch{}
  let api,viewport,layer,guide,canvas,c,action,status,meter,catchPanel,live,pointNav,scale=1,visible=true,raf=0,last=0,lastDraw=0,bookSignature='',movingUntil=0,reelSoundAt=0,drawCount=0;
  const assets={},fishArt=[],particles=[],rings=[],sprite={size:160,foot:148};
  const loaded={beach:false,poses:false,visitor:false};
  let audio=null,master=null,ticking=false,assetsRequested=false,lastStepX=state.x;
  const allowedMovement=()=>['idle','walk','caught'].includes(state.phase);
  function save(){try{localStorage.setItem(settingKey,JSON.stringify({caught:[...state.caught],assist:state.assist,sound:state.sound}));}catch{}}
  function image(key,src){const img=new Image();assets[key]=img;img.onload=()=>{loaded[key]=true;draw(true);};img.onerror=()=>{loaded[key]=false;layer.dataset.artFallback='true';draw(true);};img.src=src;}
  function makeFish(colors){
    const q=document.createElement('canvas');q.width=48;q.height=30;const p=q.getContext('2d');
    const r=(x,y,w,h,col)=>{p.fillStyle=col;p.fillRect(x,y,w,h);};
    r(11,8,27,15,colors[0]);r(16,5,18,4,colors[0]);r(17,23,14,3,colors[0]);r(37,11,6,9,colors[0]);r(4,7,6,18,colors[0]);r(8,12,6,8,colors[0]);
    r(13,9,23,10,colors[1]);r(17,7,15,3,colors[1]);r(36,12,5,6,colors[1]);r(6,9,3,14,colors[1]);r(19,18,17,4,colors[2]);r(23,21,10,2,colors[2]);
    r(22,2,8,5,colors[0]);r(23,3,5,3,colors[1]);r(22,23,6,5,colors[0]);r(25,23,2,3,colors[1]);
    for(let x=16;x<30;x+=5){r(x,12,2,2,colors[2]);r(x+2,16,2,2,colors[0]);}
    r(34,11,4,4,'#253943');r(35,11,1,1,'#f5ffff');r(39,18,3,1,colors[0]);return q;
  }
  function audioReady(){
    if(!state.sound)return false;
    try{if(!audio){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;audio=new Context();master=audio.createGain();master.gain.value=.45;master.connect(audio.destination);
      // Quiet filtered surf, created only after an explicit sound-on gesture.
      const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),samples=buffer.getChannelData(0);let seed=71;
      for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/4294967296*2-1)*(.5+.25*Math.sin(i/samples.length*Math.PI*2));}
      const surf=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();surf.buffer=buffer;surf.loop=true;filter.type='lowpass';filter.frequency.value=420;gain.gain.value=.018;surf.connect(filter);filter.connect(gain);gain.connect(master);surf.start();
    }if(audio.state==='suspended')audio.resume().catch(()=>{});return audio.state!=='closed';}catch{return false;}
  }
  function tone(frequency,delay=0,duration=.12,volume=.035,type='sine'){
    if(!audioReady())return;const now=audio.currentTime+delay,osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,now);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function sfx(kind){if(kind==='cast'){tone(220,0,.12,.02);tone(450,.08,.14,.015);}if(kind==='water'){tone(310,0,.11,.045);tone(140,.04,.18,.028);}if(kind==='bite'){tone(660,0,.1,.04);tone(880,.12,.12,.035);}if(kind==='hook')tone(360,0,.09,.04);if(kind==='catch'){tone(523,0,.2,.035);tone(659,.12,.2,.035);tone(784,.24,.3,.035);}}
  function burst(x,y,type='drop',count=14){
    if(reduced())return;
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2;const speed=type==='dust'?17:46+(i%4)*13;particles.push({x,y,vx:Math.cos(a)*speed,vy:-Math.abs(Math.sin(a))*speed-15,age:0,life:type==='spark'?1.1:.7+(i%3)*.12,type,size:i%3===0?3:2});}
    if(particles.length>90)particles.splice(0,particles.length-90);
  }
  function ring(x,y,strength=1){if(!reduced()){rings.push({x,y,age:0,life:.9,strength});if(rings.length>12)rings.shift();}}
  function reduced(){return document.body.classList.contains('reduce-motion');}
  function phase(next){state.phase=next;state.elapsed=0;layer.dataset.phase=next;layer.dataset.project=sites[state.selected].id;refresh();wake();}
  function select(index,walk=true){
    if(!Number.isInteger(index)||!sites[index])return;
    clearHeld();particles.length=0;rings.length=0;state.progress=0;state.selected=index;catchPanel.hidden=true;
    if(walk&&Math.abs(state.x-sites[index].x)>4){state.goal=sites[index].x;phase('walk');}
    else{state.goal=null;state.x=sites[index].x;phase('idle');}
    focusScene();
  }
  function focusScene(){viewport.focus({preventScroll:true});if(matchMedia('(max-width:800px)').matches){const r=viewport.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)viewport.scrollIntoView({block:'start',behavior:'auto'});}}
  function read(index=state.selected,section){
    state.selected=index;state.goal=null;clearHeld();particles.length=0;rings.length=0;catchPanel.hidden=true;phase('idle');api.openProject(index,section);
  }
  function act(){
    if(!state.active||document.getElementById('detail-dialog').open||state.phase==='walk')return;
    audioReady();
    if(state.phase==='caught'){read();return;}
    if(state.phase==='idle'){
      if(Math.abs(state.x-sites[state.selected].x)>160){select(state.selected,true);return;}
      state.progress=0;state.y=FOOT;catchPanel.hidden=true;phase('windup');sfx('cast');return;
    }
    if(state.phase==='bite'){
      phase('hook');sfx('hook');ring(sites[state.selected].x,sites[state.selected].y,1.5);burst(sites[state.selected].x,sites[state.selected].y,'drop',16);return;
    }
    if(state.phase==='reel'){state.progress=clamp(state.progress+.19,0,1);if(state.progress>=1)land();refresh();draw(true);}
  }
  function land(){clearHeld();phase('land');burst(state.x,state.y-35,'drop',8);sfx('catch');}
  function finish(){
    state.caught.add(sites[state.selected].id);state.goal=null;save();phase('caught');
    const project=projects[state.selected];
    catchPanel.querySelector('h2').textContent=project.title;
    catchPanel.querySelector('.fish-catch-result').textContent=project.result;
    const portrait=catchPanel.querySelector('canvas'),p=portrait.getContext('2d');p.clearRect(0,0,portrait.width,portrait.height);p.imageSmoothingEnabled=false;p.drawImage(fishArt[state.selected],12,7,96,60);
    catchPanel.hidden=false;live.textContent=project.title+' 프로젝트를 낚았습니다. 상세 내용은 읽기 버튼으로 확인할 수 있습니다.';refresh();
    if([viewport,action,document.getElementById('interact')].includes(document.activeElement))catchPanel.querySelector('[data-catch-read]').focus({preventScroll:true});
  }
  function clearHeld(){state.hold=false;state.walking=false;movingUntil=0;}
  function move(dx,dy=0){
    if(!state.active||!allowedMovement())return;
    if(state.phase==='caught'){catchPanel.hidden=true;phase('idle');}
    state.goal=null;if(state.phase==='walk')phase('idle');
    state.x=clamp(state.x+dx,90,W-90);state.y=clamp(state.y+dy,418,448);
    if(dx){state.facing=dx<0?-1:1;movingUntil=performance.now()+110;state.walking=true;}
    const nearest=sites.reduce((best,s,i)=>Math.abs(s.x-state.x)<Math.abs(sites[best].x-state.x)?i:best,0);
    if(nearest!==state.selected){state.selected=nearest;refresh();}
    // Input updates position, but only the fishing RAF paints it together with
    // its camera. Painting here alternated stale/new camera positions (jitter).
    wake(false);
  }
  function refresh(){
    if(!layer)return;
    const p=projects[state.selected],phaseName=state.phase;
    const phrases={idle:'이름표가 있는 어군에서 낚시를 시작하세요.',walk:'선택한 낚시 포인트로 이동 중입니다.',windup:'캐스팅 준비',cast:'찌를 던지는 중…',settle:'찌가 물에 닿았습니다.',waiting:'물고기가 다가오고 있어요.',bite:'입질! 지금 챔질하세요.',hook:'걸렸어요! 천천히 끌어올립니다.',reel:state.assist?'끌어올리는 중 · 누르면 더 빨라요.':'버튼을 길게 누르거나 여러 번 눌러 끌어올리세요.',land:'물고기를 낚았습니다!',caught:'프로젝트를 낚았습니다. 상세 내용을 읽어보세요.'};
    const buttons={idle:'낚시 시작',walk:'이동 중',windup:'캐스팅 준비',cast:'캐스팅 중',settle:'입질 기다리기',waiting:'입질 기다리기',bite:'챔질하기',hook:'걸렸어요!',reel:'끌어올리기',land:'낚았습니다!',caught:'프로젝트 읽기'};
    status.textContent=phrases[phaseName];action.textContent=buttons[phaseName];
    action.disabled=!['idle','bite','reel','caught'].includes(phaseName);
    action.setAttribute('aria-label',buttons[phaseName]+': '+p.title);
    document.querySelectorAll('[data-dir="left"],[data-dir="right"]').forEach(b=>b.disabled=!allowedMovement());
    meter.hidden=phaseName!=='reel';
    const bar=meter.querySelector('[role="progressbar"]');bar.setAttribute('aria-valuenow',Math.round(state.progress*100));bar.querySelector('span').style.width=Math.round(state.progress*100)+'%';
    document.getElementById('location-title').textContent=sites[state.selected].label;
    document.getElementById('location-subtitle').textContent=p.result;
    document.getElementById('location-label').textContent='현재 낚시 포인트';
    document.getElementById('scene-position').textContent=String(state.selected+1).padStart(2,'0')+' / 03';
    const main=document.getElementById('interact');main.textContent=buttons[phaseName];main.disabled=action.disabled;
    const signature=state.selected+':'+[...state.caught].join(',');
    if(signature!==bookSignature){
      bookSignature=signature;
      guide.querySelectorAll('[data-fish-select]').forEach(b=>{const i=Number(b.dataset.fishSelect);b.setAttribute('aria-current',String(i===state.selected));b.querySelector('.fish-book-state').textContent=state.caught.has(sites[i].id)?'낚은 프로젝트':'아직 낚기 전';});
      guide.querySelector('.fish-book-count').textContent=state.caught.size+' / 3';
    }
    layer.querySelectorAll('[data-school]').forEach(b=>{const current=Number(b.dataset.school)===state.selected;b.setAttribute('aria-pressed',String(current));b.setAttribute('aria-current',String(current));});
    pointNav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.fishPoint)===state.selected)));
  }
  function geometry(){
    scale=Math.min(1,viewport.clientHeight/H);
    const visibleWidth=viewport.clientWidth/scale;
    return {visibleWidth,camera:visibleWidth>=W?(W-visibleWidth)/2:clamp(state.x-visibleWidth/2,0,W-visibleWidth)};
  }
  function resize(){if(!canvas)return;const d=Math.min(devicePixelRatio||1,1.75);const width=Math.max(1,viewport.clientWidth),height=Math.max(1,viewport.clientHeight);if(canvas.width!==Math.round(width*d)||canvas.height!==Math.round(height*d)){canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);}state.camera=geometry().camera;draw(true);}
  function heroPose(){
    if(state.walking||state.phase==='walk')return Math.floor(state.clock*5)%2+1;
    if(state.phase==='windup')return 3;
    if(state.phase==='cast')return state.elapsed<.18?3:4;
    if(['settle','waiting','bite'].includes(state.phase))return 5;
    if(['hook','reel','land'].includes(state.phase))return 6;
    if(state.phase==='caught')return 7;
    return 0;
  }
  function drawHero(pose,x,foot,alpha=1){
    c.save();c.globalAlpha=alpha;c.translate(x,foot);
    const walking=state.walking||state.phase==='walk';
    if(walking&&state.facing<0)c.scale(-1,1);
    const bounce=reduced()?0:walking?Math.sin(state.clock*10)*.45:state.phase==='hook'?-Math.sin(clamp(state.elapsed/.22,0,1)*Math.PI)*5:state.phase==='land'?-Math.sin(clamp(state.elapsed/.85,0,1)*Math.PI)*7:0;
    if(loaded.poses){c.imageSmoothingEnabled=false;c.drawImage(assets.poses,pose%4*sprite.size,Math.floor(pose/4)*sprite.size,sprite.size,sprite.size,-40,-74+bounce,80,80);}
    else if(loaded.visitor){const img=assets.visitor,w=64*img.naturalWidth/img.naturalHeight;c.imageSmoothingEnabled=false;c.drawImage(img,-w/2,-64+bounce,w,64);}
    else{c.fillStyle='#bead84';c.fillRect(-15,-63,30,8);c.fillStyle='#e5b992';c.fillRect(-10,-55,20,19);c.fillStyle='#527469';c.fillRect(-13,-35,26,22);c.fillStyle='#344b61';c.fillRect(-10,-13,8,10);c.fillRect(2,-13,8,10);c.fillStyle='#283a3b';c.fillRect(-11,-4,10,4);c.fillRect(2,-4,10,4);}
    c.restore();
  }
  function fishShadow(x,y,a,depth=1){
    c.save();c.translate(x,y);c.rotate(a);c.globalAlpha=.72*depth;c.fillStyle='#174759';c.strokeStyle='#b9ece4';c.lineWidth=.8;c.beginPath();c.ellipse(0,0,22,7.5,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-18,0);c.lineTo(-31,-10);c.lineTo(-27,1);c.lineTo(-31,10);c.closePath();c.fill();c.fillStyle='#d2efdf';c.globalAlpha=.48*depth;c.fillRect(13,-2,2,2);c.restore();
  }
  function fallbackBeach(){
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#6aafc9');g.addColorStop(.62,'#a7dcd7');g.addColorStop(1,'#d3eee0');c.fillStyle=g;c.fillRect(0,0,W,H);c.fillStyle='#efdeb7';c.beginPath();c.moveTo(0,H);c.lineTo(0,338);for(let x=0;x<=W;x+=8)c.lineTo(x,338+Math.sin(x*.014)*5);c.lineTo(W,H);c.closePath();c.fill();
    for(let i=0;i<350;i++){c.fillStyle=i%3?'#bda57655':'#fff4d680';c.fillRect((i*79+23)%W,354+(i*29)%158,i%7===0?3:1,1);}
    for(const x of [85,W-80]){c.fillStyle='#887f62';c.fillRect(x,369,20,12);c.fillStyle='#a6ae7f';c.fillRect(x+6,352,5,25);c.fillRect(x-4,358,5,18);}
  }
  function water(){
    if(reduced())return;
    const left=Math.floor(state.camera/80)*80,right=Math.min(W,state.camera+viewport.clientWidth/scale+80);
    c.save();c.lineWidth=.7;
    for(let y=70;y<316;y+=48)for(let x=left;x<right;x+=92){const seed=x*.03+y;const yy=y+Math.sin(state.clock*.55+seed)*2;c.strokeStyle='#e8fff120';c.beginPath();c.moveTo(x,yy);c.quadraticCurveTo(x+12,yy+2,x+29,yy);c.stroke();}
    c.strokeStyle='#f6fff8a0';c.lineWidth=2;c.beginPath();for(let x=left;x<=right;x+=8){const y=337+Math.sin(x*.016+state.clock*.52)*3+Math.sin(state.clock*.9)*1.5;x===left?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();c.restore();
  }
  function rodAndBob(){
    if(['idle','walk','caught'].includes(state.phase))return;
    const spot=sites[state.selected];let hand={x:state.x+8,y:state.y-28},tip={x:state.x+43,y:state.y-129};
    if(state.phase==='windup'){const u=clamp(state.elapsed/.24,0,1);hand={x:state.x-10,y:state.y-31};tip={x:state.x-35-25*u,y:state.y-128+12*u};}
    if(state.phase==='cast'){const u=ease(state.elapsed/.58);hand={x:lerp(state.x-10,state.x+24,u),y:lerp(state.y-31,state.y-42,u)};tip={x:lerp(state.x-60,state.x+43,u),y:state.y-123-Math.sin(u*Math.PI)*23};}
    if(state.phase==='hook'){tip.y-=Math.sin(clamp(state.elapsed/.22,0,1)*Math.PI)*21;}
    if(state.phase==='reel'){tip.x+=Math.sin(state.clock*8)*3;tip.y+=Math.sin(state.clock*10)*2;}
    let bob={x:spot.x,y:spot.y};
    if(state.phase==='windup')bob={x:tip.x+7,y:tip.y+27};
    if(state.phase==='cast'){const u=ease(state.elapsed/.58);bob={x:lerp(state.x-50,spot.x,u),y:lerp(state.y-104,spot.y,u)-Math.sin(u*Math.PI)*67};}
    if(['waiting','bite','settle'].includes(state.phase)){bob.x+=reduced()?0:Math.sin(state.clock*1.8)*1.3;bob.y+=reduced()?0:Math.sin(state.clock*2.2)*1.4;if(state.phase==='bite')bob.y+=Math.sin(state.elapsed*20)*3.5;}
    if(state.phase==='reel'){const u=state.progress;bob={x:lerp(spot.x,state.x+18,u)+(reduced()?0:Math.sin(state.clock*8)*8*(1-u)),y:lerp(spot.y,state.y-33,u)};}
    if(state.phase==='land'){const u=ease(state.elapsed/.85);bob={x:lerp(state.x+18,state.x,u),y:lerp(state.y-33,state.y-80,u)-Math.sin(u*Math.PI)*28};}
    c.save();c.strokeStyle='#786246';c.lineWidth=2.3;c.beginPath();c.moveTo(hand.x,hand.y);c.quadraticCurveTo(hand.x+4,tip.y+8,tip.x,tip.y);c.stroke();c.strokeStyle='#decba4';c.lineWidth=.7;c.beginPath();c.moveTo(hand.x-1,hand.y);c.lineTo(tip.x-1,tip.y);c.stroke();
    c.strokeStyle='#f4fff3b3';c.lineWidth=.8;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+bob.x)/2,Math.max(tip.y,bob.y)+15,bob.x,bob.y);c.stroke();
    c.fillStyle='#334b4b';c.beginPath();c.arc(hand.x,hand.y+4,4,0,Math.PI*2);c.fill();c.fillStyle='#c0cba8';c.fillRect(hand.x-2,hand.y+2,2,3);
    if(['reel','land'].includes(state.phase)){
      c.save();c.translate(bob.x,bob.y);if(!reduced())c.rotate(Math.sin(state.clock*11)*.1);const u=state.phase==='land'?1:state.progress;c.imageSmoothingEnabled=false;c.drawImage(fishArt[state.selected],-24-u*8,-15-u*4,48+u*16,30+u*8);c.restore();
    }else{c.fillStyle='#e1785c';c.fillRect(bob.x-2,bob.y-7,4,5);c.fillStyle='#fffbe4';c.fillRect(bob.x-2,bob.y-2,4,4);c.fillStyle='#cf6248';c.fillRect(bob.x-1,bob.y-11,2,4);}
    if(state.phase==='bite'&&!reduced()){
      const y=bob.y-34-Math.sin(state.elapsed*5)*2;c.fillStyle='#fff4cb';c.beginPath();c.roundRect(bob.x-11,y,22,24,6);c.fill();c.fillStyle='#925737';c.fillRect(bob.x-1,y+5,3,8);c.fillRect(bob.x-1,y+15,3,3);
    }c.restore();
  }
  function draw(force=false){
    if(!c||!state.active||document.hidden||!visible&&!force)return;
    geometry();
    const width=viewport.clientWidth,height=viewport.clientHeight,d=canvas.width/Math.max(1,width);
    c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,width,height);c.save();c.scale(scale,scale);
    const shake=reduced()?0:state.phase==='hook'?Math.sin(state.elapsed*55)*1.6*(1-clamp(state.elapsed/.22,0,1)):0;
    c.translate(-state.camera+shake,0);
    c.imageSmoothingEnabled=false;if(loaded.beach){const image=assets.beach,bgWidth=Math.max(W,width/scale),cropWidth=Math.min(image.naturalWidth,bgWidth);c.drawImage(image,(image.naturalWidth-cropWidth)/2,0,cropWidth,image.naturalHeight,(W-bgWidth)/2,0,bgWidth,600);}else{c.fillStyle='#7fbfc4';c.fillRect(state.camera,0,width/scale,H);c.fillStyle='#efdeb7';c.fillRect(state.camera,338,width/scale,H-338);fallbackBeach();}
    water();
    sites.forEach((site,i)=>{
      const selected=i===state.selected;
      c.save();c.fillStyle=selected?'#153e5542':'#19475b2c';c.strokeStyle=selected?'#fff4c5':'#d9f5e2bb';c.lineWidth=selected?2:1.2;c.beginPath();c.ellipse(site.x,site.y+4,104,49,0,0,Math.PI*2);c.fill();c.stroke();
      c.setLineDash([3,9]);c.strokeStyle=selected?'#fff5d28c':'#dcf7ed55';c.lineWidth=1;c.beginPath();c.ellipse(site.x,site.y+4,111,55,0,0,Math.PI*2);c.stroke();c.restore();
      for(let n=0;n<5;n++){const t=state.clock*.48+n*1.24+i;const motion=reduced()?0:Math.sin(t)*5;fishShadow(site.x+[-52,-8,46,-34,34][n]+motion,site.y+[-14,-22,-6,18,23][n],Math.sin(t)*.13,.85+(n%2)*.15);}
      // A grounded shoreline marker ties the visible shoal to its casting point.
      c.fillStyle=selected?'#fff0c099':'#ffffff44';c.beginPath();c.ellipse(site.x,FOOT+3,24,5,0,0,Math.PI*2);c.fill();
    });
    rings.forEach(r=>{c.globalAlpha=(1-r.age/r.life)*.55;c.strokeStyle='#f5fff8';c.lineWidth=1.2;c.beginPath();c.ellipse(r.x,r.y,4+r.age/r.life*28,(4+r.age/r.life*28)*.42,0,0,Math.PI*2);c.stroke();});c.globalAlpha=1;
    c.fillStyle='#aa916433';c.beginPath();c.ellipse(state.x,state.y+2,18,4,0,0,Math.PI*2);c.fill();
    rodAndBob();drawHero(heroPose(),state.x,state.y);
    particles.forEach(p=>{c.globalAlpha=1-p.age/p.life;c.fillStyle=p.type==='dust'?'#c2ad7d':p.type==='spark'?'#fff0b3':'#effff3';c.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);});c.globalAlpha=1;
    // A soft directional wash unifies character and environment, not a page filter.
    const sunlight=c.createLinearGradient(state.camera,0,state.camera+width/scale,H);sunlight.addColorStop(0,'#fff4c514');sunlight.addColorStop(1,'#24547608');c.fillStyle=sunlight;c.fillRect(state.camera,0,width/scale,H);c.restore();
    const pad=9;
    layer.querySelectorAll('[data-school]').forEach(b=>{const index=Number(b.dataset.school),site=sites[index],x=(site.x-state.camera)*scale;
      const half=Math.min(width-24,width<=600?170:190)/2;
      const onScreen=x>pad+half&&x<width-pad-half;b.hidden=!onScreen;b.inert=!onScreen;
      if(onScreen){b.style.left=x+'px';b.style.top=Math.max((site.y-90)*scale,12+status.offsetHeight+14+b.offsetHeight/2)+'px';}
    });
    layer.querySelectorAll('[data-school-zone]').forEach(b=>{const site=sites[Number(b.dataset.schoolZone)],x=(site.x-state.camera)*scale,w=218*scale;b.hidden=x<w/2+8||x>width-w/2-8;b.inert=b.hidden;b.style.left=x+'px';b.style.top=(site.y+4)*scale+'px';b.style.width=w+'px';b.style.height=112*scale+'px';});
    layer.dataset.camera=state.camera.toFixed(2);layer.dataset.x=state.x.toFixed(2);layer.dataset.spriteFrame=String(heroPose());layer.dataset.drawCount=String(++drawCount);
  }
  function step(dt){
    if(document.getElementById('detail-dialog').open){state.hold=false;state.walking=false;return;}
    state.clock+=dt;state.elapsed+=dt;
    if(state.goal!==null){const delta=state.goal-state.x;state.facing=delta<0?-1:1;state.walking=true;state.x+=Math.sign(delta)*Math.min(Math.abs(delta),500*dt);if(Math.abs(delta)<3){state.x=state.goal;state.goal=null;state.walking=false;phase('idle');}}
    else state.walking=performance.now()<movingUntil;
    const target=geometry().camera,manual=performance.now()<movingUntil,dx=state.x-lastStepX;
    let next=reduced()?target:lerp(state.camera,target,1-Math.exp(-dt*11));
    // A following camera must not outrun/reverse the visitor during held input,
    // including the transition from auto-walking to keyboard/touch movement.
    if(manual&&!reduced()){const delta=next-state.camera;next=state.camera+(dx>0?clamp(delta,0,dx):dx<0?clamp(delta,dx,0):0);}
    state.camera=next;lastStepX=state.x;
    if(!reduced()&&state.walking&&Math.floor(state.clock*10)!==state.lastDust){state.lastDust=Math.floor(state.clock*10);burst(state.x-9*state.facing,state.y,'dust',2);}
    const duration=reduced()?.09:.24;
    if(state.phase==='windup'&&state.elapsed>=duration)phase('cast');
    else if(state.phase==='cast'&&state.elapsed>=(reduced()?.12:.58)){ring(sites[state.selected].x,sites[state.selected].y);burst(sites[state.selected].x,sites[state.selected].y,'drop',12);sfx('water');phase('settle');}
    else if(state.phase==='settle'&&state.elapsed>=(reduced()?.1:.25))phase('waiting');
    else if(state.phase==='waiting'&&state.elapsed>=(reduced()?.2:.72)){phase('bite');sfx('bite');}
    else if(state.phase==='bite'&&state.assist&&state.elapsed>3.6){phase('hook');sfx('hook');ring(sites[state.selected].x,sites[state.selected].y,1.5);}
    else if(state.phase==='hook'&&state.elapsed>=(reduced()?.09:.22)){if(reduced()&&state.assist)land();else phase('reel');}
    else if(state.phase==='reel'){
      state.progress=clamp(state.progress+dt*((state.assist?.28:0)+(state.hold?.53:0)),0,1);
      if(state.hold&&state.clock-reelSoundAt>.18){reelSoundAt=state.clock;tone(190,0,.025,.012,'triangle');}
      if(!reduced()&&Math.floor(state.elapsed*3)!==state.lastRipple){state.lastRipple=Math.floor(state.elapsed*3);ring(lerp(sites[state.selected].x,state.x,state.progress),lerp(sites[state.selected].y,state.y-33,state.progress),.7);}
      if(state.progress>=1)land();
      else{const bar=meter.querySelector('[role="progressbar"]');bar.setAttribute('aria-valuenow',Math.round(state.progress*100));bar.firstElementChild.style.width=Math.round(state.progress*100)+'%';}
    }else if(state.phase==='land'&&state.elapsed>=(reduced()?.08:.85)){burst(state.x,state.y-65,'spark',10);finish();}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.type==='dust'?35:170)*dt;if(p.age>=p.life)particles.splice(i,1);}
    for(let i=rings.length-1;i>=0;i--){rings[i].age+=dt;if(rings[i].age>=rings[i].life)rings.splice(i,1);}
  }
  function tick(time){
    raf=0;if(!state.active||document.hidden||!visible)return;
    if(document.getElementById('detail-dialog').open){last=0;clearHeld();return;}
    const dt=last?Math.min((time-last)/1000,.05):0;last=time;
    ticking=true;step(dt);ticking=false;
    const cameraMoving=Math.abs(geometry().camera-state.camera)>.02;
    const playing=!['idle','caught'].includes(state.phase)||state.walking||particles.length||rings.length||cameraMoving;
    if(!reduced()||playing){if(state.walking||cameraMoving||time-lastDraw>=1000/30||reduced()){draw();lastDraw=time;}}
    if(!reduced()||playing)raf=requestAnimationFrame(tick);else last=0;
  }
  function wake(paint=true){if(state.active&&visible&&!document.hidden&&!raf&&!ticking){last=0;raf=requestAnimationFrame(tick);}if(paint&&!ticking)draw(true);}
  function enter(){
    if(!layer)return false;state.active=true;state.goal=null;state.progress=0;clearHeld();state.x=sites[state.selected].x;state.y=FOOT;lastStepX=state.x;
    if(!assetsRequested){assetsRequested=true;image('visitor','assets/fishing-visitor-v11.webp');image('poses','assets/fishing-poses-v11.webp');image('beach','assets/fishing-beach-v11.webp');}
    document.body.classList.add('fishing-active');layer.hidden=false;guide.hidden=false;pointNav.hidden=false;document.getElementById('world').inert=true;
    viewport.setAttribute('aria-label','프로젝트 해변: 좌우로 이동하고 이름표 어군에서 낚시');
    document.getElementById('room-description').textContent='해변을 걸으며 프로젝트를 낚아보세요. 내용은 바로 읽어도 됩니다.';
    document.getElementById('scene-label').textContent='프로젝트 해변';
    document.getElementById('guide-title').textContent='프로젝트 도감';document.getElementById('guide-count').textContent='3개 프로젝트';
    document.getElementById('gallery-map').hidden=true;document.getElementById('guide-note').textContent='낚은 프로젝트는 이 기기에 기록됩니다. 낚시 여부와 관계없이 모든 내용을 읽을 수 있습니다.';
    document.querySelectorAll('[data-dir="up"],[data-dir="down"]').forEach(b=>b.hidden=true);
    document.getElementById('vertical-help').hidden=true;
    document.getElementById('control-help').querySelector('.keyboard-help').innerHTML='<kbd>←</kbd><kbd>→</kbd> 이동 · <kbd>Space</kbd> 낚시 · <kbd>Esc</kbd> 취소';
    document.getElementById('control-help').querySelector('.touch-help').textContent='방향 버튼으로 이동 · 낚시 버튼을 눌러 캐스팅과 챔질';
    catchPanel.hidden=true;phase('idle');resize();wake();return true;
  }
  function leave(){
    if(!layer)return;state.active=false;clearHeld();state.goal=null;state.phase='idle';state.progress=0;particles.length=0;rings.length=0;cancelAnimationFrame(raf);raf=0;last=0;
    document.body.classList.remove('fishing-active');layer.hidden=true;guide.hidden=true;pointNav.hidden=true;document.getElementById('world').inert=false;catchPanel.hidden=true;
    document.querySelectorAll('[data-dir]').forEach(b=>b.disabled=false);if(audio)audio.suspend().catch(()=>{});
    document.getElementById('control-help').querySelector('.keyboard-help').innerHTML='<kbd>←</kbd><kbd>→</kbd> 이동 <span id="vertical-help" hidden><kbd>↑</kbd><kbd>↓</kbd></span> · <kbd>Space</kbd> 읽기 · <kbd>Esc</kbd> 닫기';
    document.getElementById('control-help').querySelector('.touch-help').textContent='화면 안 방향 버튼으로 이동 · 상세 내용은 아래에서 읽기';
  }
  function attach(callbacks){
    api=callbacks;viewport=document.getElementById('viewport');
    layer=document.createElement('div');layer.id='fishing-layer';layer.hidden=true;
    layer.innerHTML='<canvas id="fishing-canvas" role="img" aria-label="모래사장과 잔잔한 바다, 낚시 복장을 입은 방문자"></canvas><div class="fish-status-chip" role="status" aria-live="polite"></div>'+sites.map((s,i)=>'<button type="button" class="fish-school" data-school="'+i+'" aria-pressed="false"><span>'+esc(s.label)+'</span><small>어군 · 포인트 선택</small></button>').join('')+'<div id="fishing-meter" hidden><span>끌어올리기</span><div role="progressbar" aria-label="물고기 끌어올리기 진행" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></div><button id="fish-action" type="button">낚시 시작</button><section id="fish-catch-panel" aria-labelledby="fish-catch-title" hidden><p class="fish-catch-eyebrow">프로젝트를 낚았습니다</p><canvas width="120" height="76" aria-hidden="true"></canvas><h2 id="fish-catch-title"></h2><p class="fish-catch-result"></p><div><button type="button" data-catch-read>상세 읽기</button><button type="button" data-catch-close>계속 둘러보기</button></div></section><span class="sr-only" id="fish-announcement" aria-live="polite"></span>';
    viewport.append(layer);canvas=layer.querySelector('canvas');c=canvas.getContext('2d');if(!c){layer.remove();layer=null;return false;}
    pointNav=document.createElement('nav');pointNav.className='fishing-points';pointNav.setAttribute('aria-label','프로젝트 낚시 포인트');pointNav.hidden=true;pointNav.innerHTML=['통계 조회','회원 상태','운영 도구'].map((title,i)=>'<button type="button" data-fish-point="'+i+'" aria-pressed="false"><span>0'+(i+1)+'</span>'+title+'</button>').join('');viewport.before(pointNav);pointNav.addEventListener('click',e=>{const b=e.target.closest('[data-fish-point]');if(b)select(Number(b.dataset.fishPoint));});
    sites.forEach((site,i)=>{const b=document.createElement('button');b.type='button';b.className='fish-zone';b.dataset.schoolZone=String(i);b.setAttribute('aria-label',site.label+' 어군으로 이동');b.addEventListener('click',()=>select(i));layer.insertBefore(b,layer.querySelector('#fishing-meter'));});
    action=layer.querySelector('#fish-action');status=layer.querySelector('.fish-status-chip');meter=layer.querySelector('#fishing-meter');catchPanel=layer.querySelector('#fish-catch-panel');live=layer.querySelector('#fish-announcement');
    guide=document.createElement('div');guide.id='fishing-guide';guide.hidden=true;guide.innerHTML='<div class="fish-book-heading"><span>낚은 프로젝트</span><span class="fish-book-count">0 / 3</span></div><div class="fish-book">'+projects.map((p,i)=>'<div class="fish-book-row"><button type="button" data-fish-select="'+i+'"><strong>'+esc(p.title)+'</strong><span class="fish-book-state">아직 낚기 전</span></button><button class="fish-book-read" type="button" data-fish-read="'+i+'" aria-label="'+esc(p.title)+' 바로 읽기">읽기</button></div>').join('')+'</div><div class="fish-preferences"><label><input id="fishing-assist" type="checkbox">낚시 도움</label><button id="fishing-sound" type="button" aria-pressed="false">소리 끔</button></div><p class="fish-assist-note">도움을 켜면 늦게 챔질해도 자동으로 끌어올립니다.</p><details class="fish-related"><summary>연관 작업 · 경력 문서</summary><div><button type="button" data-related="batch">회원수 수집 자동화</button><button type="button" data-related="withdrawal">WEB 탈퇴 처리 통일</button><button type="button" data-related="screens">운영 도구 화면</button><button type="button" data-related="journey">이력서로 돌아가기</button><a href="normal.html#career">경력기술서</a><a href="normal.html#downloads">PDF 자료실</a></div></details><button class="fish-direct" type="button">선택한 프로젝트 바로 읽기</button>';
    document.getElementById('gallery-map').before(guide);
    sites.forEach(s=>fishArt.push(makeFish(s.color)));
    layer.querySelectorAll('[data-school]').forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.school))));
    guide.querySelectorAll('[data-fish-select]').forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.fishSelect))));
    guide.querySelectorAll('[data-fish-read]').forEach(b=>b.addEventListener('click',()=>read(Number(b.dataset.fishRead))));
    guide.querySelector('.fish-direct').addEventListener('click',()=>read());
    guide.querySelectorAll('[data-related]').forEach(b=>b.addEventListener('click',()=>{const name=b.dataset.related;if(name==='journey')api.journey();else read(name==='batch'?0:name==='withdrawal'?1:2,name==='batch'?'.batch-work':name==='withdrawal'?'.detail-related':'.detail-screens');}));
    const assist=guide.querySelector('#fishing-assist');assist.checked=state.assist;assist.addEventListener('change',()=>{state.assist=assist.checked;save();refresh();wake();});
    const sound=guide.querySelector('#fishing-sound');sound.setAttribute('aria-pressed',String(state.sound));sound.textContent=state.sound?'소리 켬':'소리 끔';sound.addEventListener('click',()=>{state.sound=!state.sound;sound.setAttribute('aria-pressed',String(state.sound));sound.textContent=state.sound?'소리 켬':'소리 끔';if(state.sound){audioReady();tone(523);}else if(audio)audio.suspend().catch(()=>{});save();});
    action.addEventListener('click',act);action.addEventListener('pointerdown',e=>{if(state.phase==='reel'){e.preventDefault();state.hold=true;action.setPointerCapture(e.pointerId);audioReady();}});
    const release=()=>state.hold=false;for(const type of ['pointerup','pointercancel','lostpointercapture'])action.addEventListener(type,release);
    action.addEventListener('contextmenu',e=>e.preventDefault());action.addEventListener('selectstart',e=>e.preventDefault());
    action.addEventListener('keydown',e=>{if((e.code==='Space'||e.key==='Enter')&&state.phase==='reel'){e.preventDefault();state.hold=true;}});action.addEventListener('keyup',e=>{if(e.code==='Space'||e.key==='Enter')state.hold=false;});
    catchPanel.querySelector('[data-catch-read]').addEventListener('click',()=>read());catchPanel.querySelector('[data-catch-close]').addEventListener('click',()=>{catchPanel.hidden=true;phase('idle');focusScene();});
    document.addEventListener('keydown',e=>{if(!state.active||document.getElementById('detail-dialog').open)return;if(e.key==='Escape'){state.goal=null;catchPanel.hidden=true;clearHeld();phase('idle');}if(e.code==='Space'&&state.phase==='reel'&&e.target===viewport){e.preventDefault();state.hold=true;}});
    document.addEventListener('keyup',e=>{if(e.code==='Space')state.hold=false;});
    window.addEventListener('blur',clearHeld);
    document.addEventListener('visibilitychange',()=>{clearHeld();if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;if(audio)audio.suspend().catch(()=>{});}else wake();});
    document.getElementById('detail-dialog').addEventListener('close',()=>{clearHeld();wake();});
    document.getElementById('reduce-motion').addEventListener('change',()=>{particles.length=0;rings.length=0;wake();});
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(raf);raf=0;last=0;clearHeld();}},{threshold:.08}).observe(viewport);
    new ResizeObserver(resize).observe(viewport);
    return true;
  }
  window.FishingExhibition={attach,enter,leave,move,act,select,resize,clearHeld,get active(){return state.active;},get snapshot(){return {phase:state.phase,selected:state.selected,x:state.x,y:state.y,camera:state.camera,width:W,shoalRadius:104,drawCount,progress:state.progress,caught:[...state.caught],assist:state.assist,sound:state.sound,visible,reduced:reduced(),loaded:{...loaded},running:!!raf};}};
})();
