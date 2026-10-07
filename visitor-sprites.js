(() => {
  'use strict';
  // Measured alpha >= 128 bounds in the original, unmodified 1122 x 1402 PNG.
  // The generated sheet is NOT an equal-cell atlas. Crop each figure separately.
  // Values: left, top, right-exclusive, bottom-exclusive. Directions: F/B/L/R.
  const frames = {
    suit: [[90,34,214,297],[357,35,483,297],[637,38,763,297],[909,38,1035,297]],
    sport: [[86,306,216,578],[353,308,484,578],[638,309,764,578],[909,310,1035,578]],
    campus: [[78,587,221,855],[350,587,488,854],[634,590,763,856],[910,593,1039,855]],
    service: [[79,863,221,1129],[348,863,492,1130],[626,865,768,1129],[905,863,1047,1130]],
    lab: [[62,1144,219,1388],[350,1140,485,1387],[601,1142,764,1388],[909,1144,1068,1388]]
  };
  const directions = ['front','back','left','right'];
  const pivots = [152,419,700,974];
  const legacy={frames,directions,pivots,source:'assets/visitor-consistency-v8.webp',width:1122,height:1402,visibleHeight:64,footOffset:10};
  window.VISITOR_FRAME_DATA=legacy;
  // Entry and fishing keep their approved art. Only the linear career journey
  // uses the taller, common-proportion visitor atlas and its measured pivots.
  window.getVisitorFrameSpec=(outfit='suit',facing='front',journey=false)=>{
    const data=journey&&window.JOURNEY_VISITOR_FRAME_DATA||legacy;
    const direction=Math.max(0,data.directions.indexOf(facing));
    const safeOutfit=data.frames[outfit]?outfit:'suit';
    const bounds=data.frames[safeOutfit][direction];
    const pivot=Array.isArray(data.pivots)?data.pivots[direction]:data.pivots[safeOutfit][direction];
    return {data,bounds,pivot,direction,outfit:safeOutfit,key:data.source+':'+safeOutfit+':'+direction};
  };
  window.renderVisitorSprite = (element, outfit='suit', facing='front') => {
    const journey=document.body.dataset.scene==='journey'&&Boolean(element.closest('#visitor'));
    const {data,bounds,pivot,key}=window.getVisitorFrameSpec(outfit,facing,journey);
    if(element.dataset.frame===key)return;
    const [left,top,right,bottom]=bounds;
    const scale=data.visibleHeight/(bottom-top), padding=2;
    const frame=document.createElement('span');
    frame.className='visitor-frame';
    frame.style.width=(right-left+padding*2)*scale+'px';
    frame.style.height=(bottom-top+padding*2)*scale+'px';
    frame.style.left='calc(50% + '+((left-padding-pivot)*scale)+'px)';
    frame.style.bottom=-padding*scale+'px';
    frame.style.backgroundSize=(data.width*scale)+'px '+(data.height*scale)+'px';
    frame.style.backgroundPosition=(-(left-padding)*scale)+'px '+(-(top-padding)*scale)+'px';
    if(journey)frame.style.backgroundImage='url("'+data.source+'")';
    element.replaceChildren(frame);
    if(journey){
      // The fallback mirrors the same registered feet used by the WebGL layer.
      const reflection=frame.cloneNode();
      reflection.className='visitor-frame visitor-reflection';
      reflection.setAttribute('aria-hidden','true');
      reflection.style.bottom=-(data.visibleHeight*.3+padding*scale*.3)+'px';
      reflection.style.height=(data.visibleHeight+padding*scale*2)*.3+'px';
      reflection.style.backgroundSize=(data.width*scale)+'px '+(data.height*scale*.3)+'px';
      reflection.style.backgroundPosition=(-(left-padding)*scale)+'px '+(-(top-padding)*scale*.3)+'px';
      element.prepend(reflection);
    }
    element.classList.add('registered-visitor');
    element.dataset.frame=key;
    element.dataset.visitorArt=journey?'journey-v14':'legacy-v8';
  };
})();
