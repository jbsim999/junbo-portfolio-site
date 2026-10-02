/* One continuous view-centred projection, shared by WebGL and its CSS/Canvas
   fallback. The grid is NEVER restarted at an era boundary. */
(() => {
  'use strict';
  const START=340,BOTTOM=520,HORIZON=220,PITCH=84,ROWS=6;
  let description=null;
  function geometry(camera,viewWidth,bottom=BOTTOM){
    const centre=camera+viewWidth/2;
    const factor=y=>(y-HORIZON)/(bottom-HORIZON);
    const project=(x,y)=>[centre+(x-centre)*factor(y),y];
    const first=Math.floor((centre-viewWidth/2/factor(START)-PITCH)/PITCH);
    const last=Math.ceil((centre+viewWidth/2/factor(START)+PITCH)/PITCH);
    const rows=bottom>BOTTOM?Math.ceil(Math.log((bottom-HORIZON)/(START-HORIZON))/.15):ROWS;
    const panels=[],ys=Array.from({length:rows+1},(_,i)=>HORIZON+(START-HORIZON)*Math.pow((bottom-HORIZON)/(START-HORIZON),i/rows));
    for(let row=0;row<rows;row++)for(let col=first;col<last;col++){
      const x=col*PITCH,y0=ys[row]+.4,y1=ys[row+1]-.4;
      const quad=(a,b)=>[...project(x+.7,a),...project(x+PITCH-.7,a),...project(x+PITCH-.7,b),...project(x+.7,b)];
      panels.push({row,points:quad(y0,y1),bands:Array.from({length:5},(_,i)=>quad(y0+(y1-y0)*i/5,y0+(y1-y0)*(i+1)/5))});
    }
    description={camera,viewWidth,vanishingX:viewWidth/2,horizon:HORIZON,start:START,bottom,pitch:PITCH,farPitch:PITCH*factor(START),nearPitch:PITCH,rowEdges:ys,continuousOrigin:0};
    return {panels,description};
  }
  function drawFallback(state,scale){
    if(state.room!=='journey'||document.body.classList.contains('pixi-ready'))return;
    const path=document.querySelector('.journey-path'),viewport=document.getElementById('viewport');
    let canvas=path.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');canvas.id='perspective-floor-fallback';canvas.setAttribute('aria-hidden','true');path.append(canvas);}
    const bottom=Math.max(BOTTOM,viewport.clientHeight/scale),width=viewport.clientWidth/scale,height=bottom-START,d=Math.min(devicePixelRatio||1,2),ctx=canvas.getContext('2d');if(!ctx)return;
    canvas.style.left=state.camera+'px';canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.ceil(width*d);canvas.height=height*d;
    ctx.setTransform(d,0,0,d,-state.camera*d,-START*d);ctx.fillStyle='#263f50';ctx.fillRect(state.camera,START,width,height);
    const data=geometry(state.camera,width,bottom);
    function polygon(points){ctx.beginPath();points.forEach((v,i)=>{if(i%2===0)i===0?ctx.moveTo(v,points[i+1]):ctx.lineTo(v,points[i+1]);});ctx.closePath();}
    for(const p of data.panels){polygon(p.points);const g=ctx.createLinearGradient(0,p.points[1],0,p.points[5]);g.addColorStop(0,'#526f82');g.addColorStop(.35,'#426376');g.addColorStop(1,'#345568');ctx.fillStyle=g;ctx.fill();}
    const sheen=ctx.createLinearGradient(state.camera,START,state.camera+width,bottom);sheen.addColorStop(0,'#e3f1ed00');sheen.addColorStop(.5,'#e3f1ed18');sheen.addColorStop(1,'#e3f1ed00');ctx.fillStyle=sheen;ctx.fillRect(state.camera,START,width,height);
    canvas.dataset.projection='perspective';
  }
  window.ArchivePerspective={geometry,drawFallback,get snapshot(){return description;}};
})();
