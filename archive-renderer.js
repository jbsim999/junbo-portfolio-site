/* Pixi owns the environment; accessible HTML owns text, controls and characters.
   Both layers use the same world coordinates. No WebGL is required to read. */
(() => {
  'use strict';
  let app, scene, room, last, pending, ready=false;
  const host=document.getElementById('render-surface');
  const viewport=document.getElementById('viewport');
  const palette={base:0x151d27,edge:0x080f18,metal:0x566576,light:0x81dce9};
  const textures={},roomFrames=[];
  function rect(g,x,y,w,h,color,alpha=1){g.rect(x,y,w,h).fill({color,alpha});}
  function floor(width,height,start=0){
    const g=new PIXI.Graphics();rect(g,0,start,width,height-start,palette.edge);
    // Offset slabs, bevels, restrained grain and flush fixings, not a luminous grid.
    for(let row=0,y=start;y<height;y+=44,row++){
      for(let x=(row%2?-84:0);x<width;x+=168){
        const variation=((row*19+Math.floor(x/168)*13)%4+4)%4;
        rect(g,x+1,y+1,166,42,[0x1c2631,0x202b36,0x1e2933,0x1d2732][variation]);
        rect(g,x+2,y+2,164,1,0x617081,.19);rect(g,x+2,y+41,164,1,0x03090f,.55);
        rect(g,x+3,y+4,1,34,0x82919a,.07);
        for(let n=0;n<9;n++){const sx=x+9+(n*37+row*23)%148,sy=y+8+(n*7+row*11)%28;rect(g,sx,sy,9+(n%3)*6,.6,0x99a8ad,.035);}
        rect(g,x+8,y+7,2,2,0x71818c,.26);rect(g,x+157,y+35,2,2,0x71818c,.2);
      }
    }
    return g;
  }
  function horizontalFence(g,x,y,length){
    rect(g,x,y-2,length,17,0x000710,.36);
    rect(g,x,y-25,length,21,0x789ba9,.07);
    rect(g,x,y-27,length,3,palette.metal);rect(g,x,y-26,length,1,0xa5b7c6,.55);
    rect(g,x,y-12,length,2,palette.metal,.7);rect(g,x,y-24,length,1,palette.light,.85);
    // Short, grounded posts are all registered on the same front threshold.
    for(let p=x;p<=x+length;p+=100){rect(g,p-2,y-31,4,34,0x344454);rect(g,p-1,y-30,1,30,0x95b3bf,.7);rect(g,p-4,y+2,8,3,0x101923);}
  }
  function verticalFence(g,x){
    rect(g,x-4,0,8,340,0x152633,.92);
    rect(g,x-1,0,2,338,palette.metal);rect(g,x,0,1,338,palette.light,.75);
    for(let y=24;y<=324;y+=100){rect(g,x-4,y-24,8,27,0x334654);rect(g,x-1,y-24,1,26,0x9ac6d0,.8);}
  }
  function sprite(texture,x,y,width,height){const s=new PIXI.Sprite(texture);s.position.set(x,y);s.width=width;s.height=height;scene.addChild(s);return s;}
  function crop(texture,x,y,width,height){return new PIXI.Texture({source:texture.source,frame:new PIXI.Rectangle(x,y,width,height)});}
  function build(kind){
    if(scene) {app.stage.removeChild(scene);scene.destroy({children:true});}
    scene=new PIXI.Container();app.stage.addChild(scene);room=kind;
    if(kind==='journey'){
      roomFrames.forEach((texture,i)=>sprite(texture,i*600,0,600,340));
      const shade=new PIXI.Graphics();rect(shade,0,0,3600,340,0x142636,.16);scene.addChild(shade);
      scene.addChild(floor(3600,520,340));
      const light=new PIXI.Graphics();
      for(let i=0;i<9;i++)rect(light,0,341+i*3,3600,3,palette.light,.042*(1-i/9));
      scene.addChild(light);
      const rails=new PIXI.Graphics();for(let x=600;x<3600;x+=600)verticalFence(rails,x);horizontalFence(rails,0,340,3600);scene.addChild(rails);
    }else{
      scene.addChild(floor(1800,1640));
      const g=new PIXI.Graphics();
      for(let i=0;i<9;i++){
        const x=i%3*600+300,y=Math.floor(i/3)*520;
        // A low plinth and integrated terminal, with one consistent footprint.
        g.roundRect(x-192,y+56,384,316,18).fill({color:0x050d16,alpha:.48});
        g.roundRect(x-181,y+42,362,306,12).fill(0x263643).stroke({color:0x597782,width:1});
        rect(g,x-174,y+46,348,3,palette.light,.48);
        rect(g,x-181,y+329,362,17,0x101c28);
        rect(g,x-165,y+341,330,2,0x82dce8,.55);
        rect(g,x-180,y+50,6,275,0x75949d,.28);rect(g,x+174,y+50,6,275,0x0a141e,.65);
        rect(g,x-129,y+346,8,16,0x496270);rect(g,x+121,y+346,8,16,0x496270);
        rect(g,x-155,y+360,310,5,0x182a38);rect(g,x-155,y+360,310,1,0x7796a0,.4);
        horizontalFence(g,x-210,y+378,420);
        // Wayfinding light only at the edges of the walking aisles.
        rect(g,x-245,y+409,2,38,0x71c8da,.32);rect(g,x+243,y+409,2,38,0x71c8da,.32);
      }
      scene.addChild(g);
    }
  }
  function update(state,scale){
    pending={...state,scale};if(!ready)return;
    if(room!==state.room)build(state.room);
    const width=viewport.clientWidth,height=viewport.clientHeight;
    if(app.screen.width!==width||app.screen.height!==height)app.renderer.resize(width,height);
    scene.scale.set(scale);scene.position.set(-state.camera*scale,-state.cameraY*scale);
    // Render only on movement, navigation or resize, never an idle GPU loop.
    const signature=[state.room,state.camera,state.cameraY,width,height,scale].join(':');
    if(signature!==last){app.render();last=signature;}
  }
  window.archiveRenderer={update,get ready(){return ready;}};
  async function init(){
    if(!window.PIXI)throw new Error('Renderer unavailable');
    app=new PIXI.Application();
    await app.init({width:viewport.clientWidth,height:viewport.clientHeight,preference:'webgl',antialias:false,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,autoStart:false,background:palette.base});
    const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(PIXI.Texture.from(img));img.onerror=reject;img.src=src;});
    [textures.rooms,textures.lab]=await Promise.all([load('assets/rooms-open-v10.webp'),load('assets/lab-open-v10.webp')]);
    // Trim the old heavy side walls once, keeping original room registration.
    [[0,0],[1,0],[0,1],null,[1,1],[1,1]].forEach(cell=>roomFrames.push(cell?crop(textures.rooms,cell[0]*627+43,cell[1]*627,541,410):crop(textures.lab,86,0,1082,820)));
    host.append(app.canvas);app.canvas.setAttribute('aria-hidden','true');
    app.canvas.addEventListener('webglcontextlost',()=>{ready=false;document.body.classList.remove('pixi-ready');document.body.classList.add('renderer-fallback');});
    app.canvas.addEventListener('webglcontextrestored',()=>{ready=true;last=null;document.body.classList.add('pixi-ready');if(pending)update(pending,pending.scale);});
    ready=true;document.body.classList.add('pixi-ready');if(pending)update(pending,pending.scale);
  }
  init().catch(()=>{document.body.classList.add('renderer-fallback');});
})();
