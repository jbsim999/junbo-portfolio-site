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
  window.renderVisitorSprite = (element, outfit='suit', facing='front') => {
    const direction=Math.max(0,directions.indexOf(facing));
    const key=outfit+':'+direction;
    if(element.dataset.frame===key)return;
    const [left,top,right,bottom]=(frames[outfit]||frames.suit)[direction];
    const scale=64/(bottom-top), padding=2;
    const frame=document.createElement('span');
    frame.className='visitor-frame';
    frame.style.width=(right-left+padding*2)*scale+'px';
    frame.style.height=(bottom-top+padding*2)*scale+'px';
    frame.style.left='calc(50% + '+((left-padding-pivots[direction])*scale)+'px)';
    frame.style.bottom=-padding*scale+'px';
    frame.style.backgroundSize=(1122*scale)+'px '+(1402*scale)+'px';
    frame.style.backgroundPosition=(-(left-padding)*scale)+'px '+(-(top-padding)*scale)+'px';
    element.replaceChildren(frame);
    element.classList.add('registered-visitor');
    element.dataset.frame=key;
  };
})();
