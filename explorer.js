(() => {
  'use strict';
  const profile = window.PROFILE;
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = items => '<ul>' + items.map(item => '<li>' + escape(item) + '</li>').join('') + '</ul>';
  const education = profile.resume.education[0];
  const firstJob = profile.resume.experience[1];
  const currentJob = profile.resume.experience[0];
  const earlierWork = profile.resume.previous;
  // School and service dates/role confirmed by the user on 2026-09-30.
  // Military service falls within the university period, not after graduation.
  const stops = [
    {title:'춘천고등학교', short:'고등학교', period:'2010.03 - 2013.02', scenic:true, scene:'school', sprite:'schoolboy'},
    {title:education.title, short:'대학 시절', period:education.period, subtitle:education.description, items:[education.description], scene:'university', sprite:'student'},
    {title:'육군', short:'군 복무', period:'2014.08 - 2016.03', subtitle:'취사병 · 만기전역', scenic:true, scene:'military', sprite:'soldier-cook'},
    {title:earlierWork.company, short:'오뗄 · 비개발 경력', period:earlierWork.period, subtitle:'실험 업무 · 데이터 비교 자동화', items:[earlierWork.description], scene:'lab', sprite:'lab-scientist'},
    {title:firstJob.company, short:'첫 백엔드 경력', period:firstJob.period, subtitle:'IoT 통신 서버와 웹 서비스 개발', items:firstJob.items, scene:'office', sprite:'developer-early'},
    {title:currentJob.company, short:'현재 경력', period:currentJob.period, subtitle:'책이음 서비스 운영·개선', items:currentJob.items, scene:'office', sprite:'developer-coffee'}
  ].map((stop,index)=>({...stop,x:index*600+300}));
  const projects = profile.projects;
  const gallery = [
    {label:'통계 성능 개선',project:0,description:'집계 구조 · 인덱스 · 쿼리 튜닝',visual:'성능'},
    {label:'회원수 수집 자동화',project:0,section:'.batch-work',description:'200개 이상 지역 · 20개 단위 병렬 수집',visual:'병렬 수집'},
    {label:'PDF 자료실',description:'이력서·포트폴리오·경력기술서',href:'normal.html#downloads',visual:'문서'},
    {label:'이력서 전시',description:'학력과 회사별 경력',return:true},
    {label:'회원 상태 보정',project:1,visual:'데이터'},
    {label:'WEB 탈퇴 처리 통일',project:1,section:'.detail-related',description:'탈퇴 경로 간 Soft Delete 정책 일치',visual:'정책'},
    {label:'경력기술서',description:'담당 업무와 상세 경력',href:'normal.html#career'},
    {label:'운영 도구 화면',project:2,section:'.detail-screens',description:'조회 · 지역 상태 확인 · 동기화',visual:'화면'},
    {label:'운영 조회 도구',project:2,visual:'연계'}
  ].map((tile,index)=>({...tile,x:index%3*600+300,y:Math.floor(index/3)*520+440,code:String.fromCharCode(65+Math.floor(index/3))+(index%3+1)}));
  const viewport = $('#viewport'), world = $('#world'), visitor = $('#visitor');
  const dialog = $('#detail-dialog'), interact = $('#interact');
  const keys = new Set(), pointers = new Map();
  const state = {room:'journey', x:stops[stops.length-1].x, y:440, stop:stops.length-1, gallery:0, near:'journey', camera:0, cameraY:0, width:stops.length*600, height:520};
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let returnFocus = null, lastTime = 0, frame = 0, previousLocation = '', fishingReady = false;
  function reveal(element) {
    if(!window.anime||document.body.classList.contains('reduce-motion'))return;
    window.anime.animate(element,{opacity:[0,1],translateY:[8,0],duration:260,ease:'out(3)'});
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function clearInput() {keys.clear();pointers.clear();visitor.classList.remove('walking');window.FishingExhibition?.clearHeld();}
  function applyMotion() {document.body.classList.toggle('reduce-motion', $('#reduce-motion').checked);}
  // A device-local accessibility preference only; storage can be unavailable.
  let motionPreference;
  try {motionPreference=localStorage.getItem('junbo-reduce-motion');} catch {}
  $('#reduce-motion').checked = motionPreference===null||motionPreference===undefined?motionQuery.matches:motionPreference==='true';
  $('#reduce-motion').addEventListener('change', applyMotion);
  $('#reduce-motion').addEventListener('change',()=>{try{localStorage.setItem('junbo-reduce-motion',String($('#reduce-motion').checked));}catch{}});
  motionQuery.addEventListener('change', event => {$('#reduce-motion').checked=event.matches;applyMotion();});
  applyMotion();
  function stopMarkup(stop,index) {
    const content=stop.scenic?(stop.period?'<p class="overline">'+escape(stop.period)+'</p>':'')+'<h2>'+escape(stop.title)+'</h2>'+(stop.subtitle?'<p>'+escape(stop.subtitle)+'</p>':''):'<p class="overline">'+escape(stop.period)+'</p><h2>'+escape(stop.title)+'</h2><p>'+escape(stop.subtitle)+'</p><button type="button" data-read="'+index+'">이 시기 읽기</button>';
    return '<article class="exhibit'+(stop.scenic?' scenic-exhibit':'')+'" style="left:'+stop.x+'px" data-stop="'+index+'"><div class="exhibit-info">'+content+'</div>'+npcMarkup(stop.sprite,false)+'</article>';
  }
  // Junbo belongs to each exhibit, never to the visitor's movement loop.
  function npcMarkup(sprite,showName=true) {return '<div class="npc-display" aria-hidden="true"><span class="pixel-sprite junbo-identity '+sprite+'"></span>'+(showName?'<span class="npc-label">심준보</span>':'')+'</div>';}
  function updateEra() {
    const era=state.room==='journey'?stops[state.stop].scene:'gallery';
    if(document.body.dataset.era===era)return;
    document.body.dataset.era=era;
    visitor.dataset.outfit=({school:'sport',university:'campus',military:'service',lab:'lab'})[era]||'suit';
  }
  Promise.all(['assets/visitor-consistency-v8.webp','assets/junbo-props-v4.webp','assets/rooms-open-v10.webp','assets/lab-open-v10.webp','assets/junbo-life-stages-v7.webp'].map(src=>new Promise((resolve,reject)=>{
    const img=new Image();img.onload=resolve;img.onerror=reject;img.src=src;
  }))).then(()=>document.body.classList.add('era-art-ready')).catch(()=>{
    const notice=$('#art-status');notice.hidden=false;
    document.body.classList.add('art-unavailable');
    notice.innerHTML='일부 이미지를 불러오지 못했습니다. 안내도에서 내용을 열거나 <a href="normal.html">문서로 보기</a>를 이용해 주세요.';
  });
  function galleryMarkup(tile,index) {
    const project=projects[tile.project];
    const core=project&&!tile.section;
    const visuals={성능:'<strong>30분</strong><i>→</i><strong>100ms</strong>',데이터:'<span>회원 상태</span><i>→</i><span>갱신 규칙</span>',연계:'<span>직접 조회</span><i>↔</i><span>이기종 도서관</span>','병렬 수집':'<strong>20</strong><span>지역 / 그룹</span>',정책:'<span>WEB</span><i>→</i><span>Soft Delete</span>',화면:'<span>조회</span><span>확인</span><span>동기화</span>',문서:'<span>RESUME</span><span>PORTFOLIO</span>'};
    const summaries=['집계 구조와 인덱스를 정비해 오래 걸리던 통계 조회를 개선했습니다.','과도한 동시 요청을 피하면서 수동 수집 업무를 자동화했습니다.','필요한 문서를 골라 내려받을 수 있습니다.','시기에 따라 달라지는 모습과 함께 경력을 살펴보세요.','회원 상태에 맞게 갱신 조건을 나누고 데이터 정합성을 보완했습니다.','WEB 탈퇴 경로에도 기존 서비스와 같은 처리 방식을 적용했습니다.','회사별 담당 업무와 구현 경험을 정리했습니다.','조회부터 가입지역 확인, 동기화까지 화면의 변화를 살펴보세요.','유지보수 업체나 사서를 거치던 확인 업무를 직접 조회로 바꿨습니다.'];
    const content='<p class="overline"><span>'+tile.code+' / '+(core?'PROJECT 0'+(tile.project+1):tile.section?'RELATED WORK':'DOCUMENT')+'</span><span>J.</span></p><h2>'+escape(tile.label)+'</h2><p class="station-result">'+escape(tile.description||(core?project.result:tile.return?'학교에서 현재 직장까지':'담당 업무와 문제 해결 기록'))+'</p><div class="station-visual" aria-hidden="true">'+(visuals[tile.visual]||'<span>JUNBO SIM</span>')+'</div><p class="station-summary">'+summaries[index]+'</p><button type="button" data-gallery-action="'+index+'">'+(core?'문제 해결 과정 읽기':tile.section?'구현 내용 보기':tile.return?'이력서로 이동':'문서 열기')+' ↗</button>';
    return '<article class="exhibit gallery-exhibit '+(core?'station-project':'station-support')+'" style="left:'+tile.x+'px;top:'+(Math.floor(index/3)*520+49)+'px" data-gallery-exhibit="'+index+'"><div class="station-info">'+content+'</div></article>';
  }
  function setRoom(room, focus = true) {
    window.FishingExhibition?.leave();
    clearInput();state.room=room;document.body.dataset.scene=room;previousLocation='';
    const journey = room === 'journey';
    state.x=journey?stops[state.stop].x:gallery[0].x;state.y=440;state.gallery=0;state.width=journey?stops.length*600:1800;state.height=journey?520:1640;
    world.style.width=state.width+'px';world.style.height=state.height+'px';
    $('.scene-backdrop').innerHTML=(journey?stops:gallery).map(tile=>'<div class="scene-bay scene-'+(journey?tile.scene:'station')+'"></div>').join('');
    viewport.setAttribute('aria-label',journey?'이력서 전시: 좌우로 이동하는 관람로':'프로젝트 전시: 네 방향으로 이동하는 관람로');
    $('#scene-label').textContent=journey?'이력서 전시':'프로젝트 전시';
    $('#room-description').textContent=journey?'좌우로 걸으며 학력과 경력을 살펴보세요.':'3×3 전시를 둘러보며 프로젝트와 관련 작업을 읽어보세요.';
    $('#guide-title').textContent=journey?'시기별 바로가기':'전시장 안내도';
    $('#guide-count').textContent=journey?'6개 구간':'3 × 3';
    $('#guide-note').textContent=journey?'군 복무 기간은 대학 재학 기간에 포함됩니다.':'대각선에 핵심 프로젝트 3개를 배치했습니다. 나머지 구역에는 관련 작업과 경력 문서를 연결했습니다.';
    $('#timeline-nav').hidden=!journey;$('#gallery-map').hidden=journey;$('#vertical-help').hidden=journey;
    document.querySelectorAll('[data-dir="up"],[data-dir="down"]').forEach(button => button.hidden=journey);
    document.querySelectorAll('[data-room]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.room===room)));
    $('#exhibits').innerHTML=journey?stops.map(stopMarkup).join(''):gallery.map(galleryMarkup).join('');
    if(!journey&&fishingReady){updateEra();window.FishingExhibition.enter();}
    else {updateLocation();render();}
    reveal(viewport);
    if(focus) viewport.focus({preventScroll:true});
  }
  function focusExhibit() {
    viewport.focus({preventScroll:true});
    // On stacked/mobile layouts the map is below the scene. Bring the changed
    // exhibit back into view instead of leaving visitors below their destination.
    const box=viewport.getBoundingClientRect();
    if(matchMedia('(max-width:800px)').matches&&(box.top<0||box.bottom>innerHeight))viewport.scrollIntoView({block:'start',behavior:'auto'});
  }
  function jump(index) {clearInput();state.stop=index;state.x=stops[index].x;state.y=440;updateLocation();render();focusExhibit();}
  function galleryJump(index) {clearInput();state.x=gallery[index].x;state.y=gallery[index].y;updateLocation();render();focusExhibit();}
  function galleryAction(index) {
    const tile=gallery[index];
    if(tile.project!==undefined){
      openDetail('project',tile.project);
      if(tile.section){const section=dialog.querySelector(tile.section);if(section){if(section.tagName==='DETAILS')section.open=true;section.scrollIntoView({block:'start'});}}
    }else if(tile.return)setRoom('journey');else if(tile.href)location.assign(tile.href);
  }
  $('#gallery-map-grid').innerHTML=gallery.map((tile,index)=>'<button type="button" data-gallery-jump="'+index+'"><span>'+tile.code+'</span>'+escape(tile.label)+'</button>').join('');
  $('#gallery-map-grid').addEventListener('click',event=>{const button=event.target.closest('[data-gallery-jump]');if(button)galleryJump(Number(button.dataset.galleryJump));});
  $('#timeline-nav').innerHTML=stops.map((stop,index)=>'<button type="button" data-jump="'+index+'">'+escape(stop.short)+'<span>'+escape(stop.period||stop.subtitle||'')+'</span></button>').join('');
  document.querySelectorAll('[data-room]').forEach(button=>button.addEventListener('click',()=>setRoom(button.dataset.room)));
  $('#timeline-nav').addEventListener('click', event=>{const button=event.target.closest('[data-jump]');if(button)jump(Number(button.dataset.jump));});
  $('#exhibits').addEventListener('click', event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-read'))openDetail('journey',Number(button.dataset.read));
    if(button.hasAttribute('data-gallery-action'))galleryAction(Number(button.dataset.galleryAction));
  });
  function updateLocation() {
    if(state.room==='journey'){
      state.stop=stops.reduce((best,stop,index)=>Math.abs(stop.x-state.x)<Math.abs(stops[best].x-state.x)?index:best,0);
      state.near=Math.abs(stops[state.stop].x-state.x)<230?'journey':null;
      document.querySelectorAll('[data-stop]').forEach(el=>{const current=Number(el.dataset.stop)===state.stop;el.classList.toggle('current',current);el.inert=!current;});
      document.querySelectorAll('[data-jump]').forEach(el=>el.setAttribute('aria-current',String(Number(el.dataset.jump)===state.stop)));
    } else {
      state.gallery=gallery.reduce((best,tile,index)=>Math.hypot(tile.x-state.x,tile.y-state.y)<Math.hypot(gallery[best].x-state.x,gallery[best].y-state.y)?index:best,0);
      const tile=gallery[state.gallery];
      state.near=Math.abs(state.x-tile.x)<245&&Math.abs(state.y-tile.y)<85?'gallery':null;
      document.querySelectorAll('[data-gallery-jump]').forEach(el=>el.setAttribute('aria-current',String(Number(el.dataset.galleryJump)===state.gallery)));
      document.querySelectorAll('[data-gallery-exhibit]').forEach(el=>{const current=Number(el.dataset.galleryExhibit)===state.gallery;el.classList.toggle('current',current);el.inert=!current;});
    }
    updateEra();
    const signature=state.room+':'+state.stop+':'+state.gallery+':'+state.near;
    if(previousLocation===signature)return;
    previousLocation=signature;
    const stop=stops[state.stop];
    const tile=gallery[state.gallery], project=projects[tile.project];
    const title=state.room==='journey'?stop.title:tile.code+' · '+tile.label;
    $('#location-title').textContent=title;
    $('#scene-position').textContent=state.room==='journey'?String(state.stop+1).padStart(2,'0')+' / '+String(stops.length).padStart(2,'0'):tile.code+' / 3 × 3';
    $('#location-subtitle').textContent=state.room==='journey'?(stop.scenic?[stop.period,stop.subtitle].filter(Boolean).join(' · '):stop.period):(project?project.period:tile.description||'다른 전시로 자유롭게 이동하세요.');
    $('#location-label').textContent=state.near?'현재 위치':'다음 전시로 이동 중';
    const scenery=state.room==='journey'?stop.scenic:!(project||tile.href||tile.return);
    interact.disabled=!state.near||scenery;
    const action=scenery?'관람 중':!state.near?'전시 앞 통로로 이동하세요':state.room==='journey'?'이력 읽기':project?'프로젝트 읽기':tile.return?'이력서로 이동':'문서 보기';
    interact.innerHTML=action+(state.near&&!scenery?' <kbd>Space</kbd>':'');
    $('#announcement').textContent=state.near?title+'. '+action:'다음 전시로 이동 중입니다.';
  }
  function render() {
    if(window.FishingExhibition?.active){window.FishingExhibition.resize();return;}
    // Scale the world, not the page: touch controls and reading text stay native size.
    const scale=matchMedia('(max-width:600px)').matches ? 0.8 : 1;
    const viewWidth=viewport.clientWidth/scale,viewHeight=viewport.clientHeight/scale;
    world.style.width=Math.max(state.width,viewWidth)+'px';
    state.camera=clamp(state.x-viewWidth/2,0,Math.max(0,state.width-viewWidth));
    state.cameraY=state.room==='journey'?0:clamp(state.y-viewHeight+105,0,Math.max(0,state.height-viewHeight));
    world.style.transform='scale('+scale+') translate('+(-state.camera)+'px,'+(-state.cameraY)+'px)';
    visitor.style.transform='translate('+(state.x-40)+'px,'+(state.y-70)+'px)';
    window.renderVisitorSprite(visitor.querySelector('.pixel-sprite'),visitor.dataset.outfit,visitor.dataset.facing);
    visitor.dataset.x=state.x.toFixed(1);visitor.dataset.y=state.y.toFixed(1);
    window.archiveRenderer?.update(state,scale);
    window.ArchivePerspective?.drawFallback(state,scale);
  }
  function projectEvidence(project) {
    const decisions='<details class="detail-decisions"><summary>구현에서 중요했던 판단</summary><dl>'+project.decisions.map(([subject,choice,reason])=>'<dt>'+escape(subject)+'</dt><dd><strong>'+escape(choice)+'</strong><p>'+escape(reason)+'</p></dd>').join('')+'</dl></details>';
    const related=project.related?(project.related.batch?window.renderBatchWork(project.related):'<section class="detail-related"><h3>'+escape(project.related.title)+'</h3><p>'+escape(project.related.body)+'</p></section>'):'';
    const screens=project.screens?'<details class="detail-screens"><summary>화면과 기능의 변화</summary><p class="code-caption">'+escape(project.screens.caption)+'</p>'+project.screens.items.map(screen=>'<figure><img src="'+escape(screen.src)+'" alt="'+escape(screen.title)+'. 가상 데이터로 재구성한 설명용 화면." loading="lazy"><figcaption><strong>'+escape(screen.title)+'</strong><p>'+escape(screen.description)+'</p></figcaption></figure>').join('')+'</details>':'';
    return decisions+related+screens;
  }
  function openDetail(kind,index=state.stop) {
    if(dialog.open||(kind==='journey'&&stops[index].scenic))return;
    clearInput();returnFocus=document.activeElement;
    $('#detail-kind').textContent=kind==='project'?'포트폴리오':'이력서';
    let html;
    if(kind==='project'){
      const project=projects[index];
      const code=project.code;
      html='<p class="period">'+escape(project.period)+'</p><h2 id="detail-title">'+escape(project.title)+'</h2><div class="detail-meta">'+project.tags.map(tag=>'<span>'+escape(tag)+'</span>').join('')+'</div><p class="detail-result">'+escape(project.result)+'</p><h3>담당한 일</h3><p>'+escape(project.role)+'</p><h3>어떤 문제였나요?</h3><p>'+escape(project.problem)+'</p><h3>어떻게 해결했나요?</h3><p>'+escape(project.action)+'</p><ol class="flow-list">'+project.flow.map(step=>'<li>'+escape(step)+'</li>').join('')+'</ol><h3>무엇이 달라졌나요?</h3><p>'+escape(project.outcome)+'</p>'+
        '<details><summary>구현 코드 · '+escape(code.title)+'</summary><p class="code-caption">'+escape(code.context)+'</p>'+code.blocks.map(block=>'<h3>'+escape(block.label)+'</h3><pre tabindex="0"><code>'+escape(block.source)+'</code></pre>').join('')+list(code.points)+'<p class="code-caption">'+escape(code.note)+'</p></details>'+
        projectEvidence(project)+'<div class="detail-links"><a href="normal.html#case-'+(index+1)+'">문서형 포트폴리오에서 보기</a><a href="pdf/portfolio.pdf" download="심준보_포트폴리오.pdf">포트폴리오 PDF</a></div>';
    } else {
      const stop=stops[index];
      html='<p class="period">'+escape(stop.period)+'</p><h2 id="detail-title">'+escape(stop.title)+'</h2><p>'+escape(stop.subtitle)+'</p>'+list(stop.items)+
        '<div class="detail-links"><a href="normal.html#resume">전체 이력서</a><a href="pdf/resume.pdf" download="심준보_이력서.pdf">이력서 PDF</a></div>';
    }
    $('#detail-content').innerHTML=html;
    dialog.showModal();dialog.scrollTop=0;$('#close-dialog').focus({preventScroll:true});
    reveal($('#detail-content'));
  }
  function activate() {if(dialog.open)return;if(window.FishingExhibition?.active){window.FishingExhibition.act();return;}if(!state.near)return;if(state.room==='gallery')galleryAction(state.gallery);else openDetail('journey');}
  interact.addEventListener('click',activate);
  $('#close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button,a[href],summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  dialog.addEventListener('close',()=>{clearInput();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
  dialog.addEventListener('click', event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  const keyDirections={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  function editableTarget(target) {return target.closest('button,a,input,textarea,select,summary,[contenteditable="true"]');}
  document.addEventListener('keydown',event=>{
    if(dialog.open||event.ctrlKey||event.metaKey||event.altKey||editableTarget(event.target))return;
    const direction=keyDirections[event.key];
    if(direction){
      if((state.room==='journey'||window.FishingExhibition?.active)&&(direction==='up'||direction==='down'))return;
      event.preventDefault();
      // A quick tap still moves, even when keyup precedes the next animation frame.
      if(!keys.has(direction))move(direction==='left'?-10:direction==='right'?10:0,direction==='up'?-10:direction==='down'?10:0);
      keys.add(direction);
    }
    if((event.code==='Space'||event.key==='Enter')&&!event.repeat){event.preventDefault();activate();}
  });
  document.addEventListener('keyup',event=>{if(keyDirections[event.key])keys.delete(keyDirections[event.key]);});
  window.addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',()=>{clearInput();lastTime=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(!frame)frame=requestAnimationFrame(tick);});
  document.querySelectorAll('[data-dir]').forEach(button=>{
    button.addEventListener('contextmenu',event=>event.preventDefault());
    button.addEventListener('selectstart',event=>event.preventDefault());
    button.addEventListener('pointerdown',event=>{
      if(dialog.open)return;event.preventDefault();button.setPointerCapture(event.pointerId);
      const d=button.dataset.dir;pointers.set(event.pointerId,d);
      move(d==='left'?-10:d==='right'?10:0,d==='up'?-10:d==='down'?10:0);
      viewport.focus({preventScroll:true});
    });
    const release=event=>pointers.delete(event.pointerId);
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    // Keyboard and assistive-technology activation moves one discrete step.
    button.addEventListener('click',event=>{if(event.detail===0){const d=button.dataset.dir;move(d==='left'?-42:d==='right'?42:0,d==='up'?-22:d==='down'?22:0);}});
  });
  function move(dx,dy) {
    if(window.FishingExhibition?.active){window.FishingExhibition.move(dx,dy);return;}
    if(state.room==='journey'){state.x=clamp(state.x+dx,120,state.width-120);state.y=440;}
    else {
      // Only freestanding exhibit footprints block movement; no invisible rooms.
      const walkable=(x,y)=>!gallery.some((tile,index)=>{const top=Math.floor(index/3)*520;return x>tile.x-180&&x<tile.x+180&&y>top+40&&y<top+360;});
      const nextX=clamp(state.x+dx,28,state.width-28);
      if(walkable(nextX,state.y))state.x=nextX;
      const nextY=clamp(state.y+dy,28,1525);
      if(walkable(state.x,nextY))state.y=nextY;
    }
    if(dx||dy){
      const facing=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');
      visitor.dataset.facing=facing;
      visitor.querySelector('.pixel-sprite').classList.add('registered-visitor');
    }
    updateLocation();render();
  }
  function tick(time) {
    frame=0;const dt=lastTime?Math.min((time-lastTime)/1000,.04):0;lastTime=time;
    const held=new Set([...keys,...pointers.values()]);
    const dx=Number(held.has('right'))-Number(held.has('left'));
    const dy=state.room==='journey'?0:Number(held.has('down'))-Number(held.has('up'));
    const walking=Boolean((dx||dy)&&!dialog.open);
    visitor.classList.toggle('walking',walking);
    if(walking){const scale=240*dt/(dx&&dy?Math.SQRT2:1);move(dx*scale,dy*scale);}
    frame=requestAnimationFrame(tick);
  }
  new ResizeObserver(render).observe(viewport);
  try {fishingReady=Boolean(window.FishingExhibition?.attach({
    openProject:(index,section)=>{openDetail('project',index);if(section){const target=dialog.querySelector(section);if(target){if(target.tagName==='DETAILS')target.open=true;target.scrollIntoView({block:'start'});}}},
    journey:()=>setRoom('journey')
  }));} catch(error) {console.warn('Fishing view unavailable; document exhibits remain accessible.',error);}
  setRoom('journey',false);frame=requestAnimationFrame(tick);
})();
