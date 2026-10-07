// Use the exhibition's floor projection without loading the game renderer.
(() => {
  'use strict';
  const path=document.querySelector('.preview-path');
  if(!path||!window.ArchivePerspective)return;
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  path.append(canvas);
  const context=canvas.getContext('2d');
  if(!context)return;
  function draw(){
    const width=path.clientWidth,height=path.clientHeight;
    if(!width||!height)return;
    const scale=height/180,density=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*density);
    canvas.height=Math.round(height*density);
    context.setTransform(density*scale,0,0,density*scale,0,-340*density*scale);
    context.fillStyle='#263f50';
    context.fillRect(0,340,width/scale,180);
    const {panels}=window.ArchivePerspective.geometry(0,width/scale);
    for(const panel of panels){
      const points=panel.points;
      context.beginPath();
      context.moveTo(points[0],points[1]);
      for(let i=2;i<points.length;i+=2)context.lineTo(points[i],points[i+1]);
      context.closePath();
      const gradient=context.createLinearGradient(0,points[1],0,points[5]);
      gradient.addColorStop(0,'#526f82');
      gradient.addColorStop(.35,'#426376');
      gradient.addColorStop(1,'#345568');
      context.fillStyle=gradient;
      context.fill();
    }
    const sheen=context.createLinearGradient(0,340,width/scale,520);
    sheen.addColorStop(0,'#e3f1ed00');
    sheen.addColorStop(.5,'#e3f1ed18');
    sheen.addColorStop(1,'#e3f1ed00');
    context.fillStyle=sheen;
    context.fillRect(0,340,width/scale,180);
    canvas.dataset.projection='perspective';
  }
  new ResizeObserver(draw).observe(path);
  draw();
})();
