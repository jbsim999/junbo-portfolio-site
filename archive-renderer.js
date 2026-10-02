/* Pixi owns the environment; accessible HTML owns text, controls and characters.
   Both layers use the same world coordinates. No WebGL is required to read. */
(() => {
  'use strict';
  let app, scene, room, last, pending, reflection, footShadow, floorMesh, floorKey='', ready=false;
  const host=document.getElementById('render-surface');
  const viewport=document.getElementById('viewport');
  const palette={base:0x151d27,edge:0x080f18,metal:0x566576,light:0x81dce9};
  const textures={},roomFrames=[];
  function rect(g,x,y,w,h,color,alpha=1){g.rect(x,y,w,h).fill({color,alpha});}
  function floor(width,height,start=0){
    const g=new PIXI.Graphics();rect(g,0,start,width,height-start,0x233a4a);
    // Opaque satin glass: 2:1 panels on one origin, two-pixel joints.
    // All rooms share the same material and registration; no threshold rail.
    for(let row=0,y=start;y<height;y+=42,row++){
      for(let x=0;x<width;x+=84){
        rect(g,x+.5,y+.5,83,41,0x365364);
        for(let band=0;band<8;band++)rect(g,x+2,y+2+band*4.75,80,4.75,0x9ab4c4,.105*(1-band/9));
        rect(g,x+1,y+1,82,.5,0xc2d4df,.16);rect(g,x+1,y+41,82,.5,0x142c3d,.2);
        rect(g,x+1,y+2,.5,39,0xb5cdd8,.08);
        rect(g,x+83,y+2,.5,39,0x243e50,.18);
      }
    }
    // Broad, soft highlights rather than neon outlines on every panel.
    for(let x=-500;x<width;x+=600){
      g.poly([x,start,x+200,start,x+480,height,x+240,height]).fill({color:0xd1e0e7,alpha:.025});
      g.poly([x+70,start,x+145,start,x+350,height,x+280,height]).fill({color:0xd1e0e7,alpha:.025});
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
    // Complete slim glass partitions: framed plane, capped top, two uprights,
    // discreet fittings and a grounded foot, not a loose vertical light strip.
    g.poly([x-15,12,x+15,25,x+15,331,x-15,340]).fill({color:0x0e2635,alpha:.22});
    g.poly([x-11,21,x+10,31,x+10,324,x-11,331]).fill({color:0xc3dce0,alpha:.24}).stroke({color:0xdbedf0,alpha:.35,width:.6});
    g.poly([x-7,26,x-3,29,x-3,325,x-7,327]).fill({color:0xf0faf6,alpha:.18});
    g.poly([x-16,8,x+16,22,x+16,28,x-16,14]).fill(0x526878).stroke({color:0xadc1cb,alpha:.55,width:.7});
    rect(g,x-16,14,4,319,0x314958);rect(g,x-15,15,1,317,0xa4bcc6,.65);
    rect(g,x+12,28,4,305,0x304655);rect(g,x+13,29,1,301,0x91aab4,.55);
    for(const y of [100,242]){rect(g,x+9,y,8,9,0x4d6473);rect(g,x+10,y+1,6,1,0xbed0d6,.6);}
    g.poly([x-19,330,x+19,326,x+22,336,x-18,343]).fill({color:0x102e3c,alpha:.25});
    g.poly([x-18,330,x+18,327,x+18,334,x-18,340]).fill(0x3e5564).stroke({color:0x9cb2bf,alpha:.5,width:.6});
  }
  function perspectiveFloor(state,scale,width){
    const viewWidth=width/scale,bottom=Math.max(520,viewport.clientHeight/scale),key=[state.camera,viewWidth,bottom].join(':');
    if(key===floorKey)return;floorKey=key;
    const data=window.ArchivePerspective.geometry(state.camera,viewWidth,bottom);
    floorMesh.clear();rect(floorMesh,state.camera,340,viewWidth,bottom-340,0x263f50);
    for(const panel of data.panels){
      floorMesh.poly(panel.points).fill(0x365768);
      panel.bands.forEach((points,i)=>floorMesh.poly(points).fill({color:0xa9c3d0,alpha:.19*(1-i/5)}));
      // The narrow physical joint defines edges; a second bright outline on
      // every subpixel trapezoid made diagonal borders look dotted/unfinished.
    }
    const x=state.camera;
    floorMesh.poly([x+viewWidth*.03,340,x+viewWidth*.36,340,x+viewWidth*.72,bottom,x+viewWidth*.35,bottom]).fill({color:0xe0edea,alpha:.035});
    floorMesh.poly([x+viewWidth*.13,340,x+viewWidth*.24,340,x+viewWidth*.59,bottom,x+viewWidth*.47,bottom]).fill({color:0xedf6f0,alpha:.025});
  }
  function sprite(texture,x,y,width,height){const s=new PIXI.Sprite(texture);s.position.set(x,y);s.width=width;s.height=height;scene.addChild(s);return s;}
  function crop(texture,x,y,width,height){return new PIXI.Texture({source:texture.source,frame:new PIXI.Rectangle(x,y,width,height)});}
  function build(kind){
    if(scene) {app.stage.removeChild(scene);scene.destroy({children:true});}
    scene=new PIXI.Container();app.stage.addChild(scene);room=kind;
    if(kind==='journey'){
      roomFrames.forEach((texture,i)=>sprite(texture,i*600,0,600,340));
      const shade=new PIXI.Graphics();rect(shade,0,0,3600,340,0x142636,.16);scene.addChild(shade);
      floorMesh=new PIXI.Graphics();floorKey='';scene.addChild(floorMesh);
      const rails=new PIXI.Graphics();for(let x=600;x<3600;x+=600)verticalFence(rails,x);scene.addChild(rails);
      reflection=new PIXI.Sprite(textures.visitors);reflection.alpha=.105;reflection.tint=0xaac8d8;scene.addChild(reflection);
      footShadow=new PIXI.Graphics();scene.addChild(footShadow);
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
    if(document.body.classList.contains('fishing-active'))return;
    if(room!==state.room)build(state.room);
    const width=viewport.clientWidth,height=viewport.clientHeight;
    if(app.screen.width!==width||app.screen.height!==height)app.renderer.resize(width,height);
    scene.scale.set(scale);scene.position.set(-state.camera*scale,-state.cameraY*scale);
    if(state.room==='journey'&&reflection&&window.VISITOR_FRAME_DATA){
      perspectiveFloor(state,scale,width);
      const data=window.VISITOR_FRAME_DATA,visitor=document.getElementById('visitor');
      const direction=Math.max(0,data.directions.indexOf(visitor.dataset.facing));
      const bounds=(data.frames[visitor.dataset.outfit]||data.frames.suit)[direction];
      const key=visitor.dataset.outfit+':'+direction;
      if(reflection.frameKey!==key){
        reflection.texture=crop(textures.visitors,bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]);reflection.frameKey=key;
      }
      const texture=reflection.texture;reflection.scale.set(64/texture.height,-26/texture.height);reflection.position.set(state.x-texture.width*64/texture.height/2,state.y+36);
      footShadow.clear().ellipse(state.x,state.y+9,17,3).fill({color:0x193443,alpha:.18});
    }
    // Render only on movement, navigation or resize, never an idle GPU loop.
    const signature=[state.room,state.camera,state.cameraY,state.x,state.y,state.stop,document.getElementById('visitor').dataset.facing,width,height,scale].join(':');
    if(signature!==last){app.render();last=signature;}
  }
  window.archiveRenderer={update,get ready(){return ready;},get partition(){return {width:36,height:332,framed:true,capped:true,grounded:true};}};
  async function init(){
    if(!window.PIXI)throw new Error('Renderer unavailable');
    app=new PIXI.Application();
    await app.init({width:viewport.clientWidth,height:viewport.clientHeight,preference:'webgl',antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,autoStart:false,background:palette.base});
    const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(PIXI.Texture.from(img));img.onerror=reject;img.src=src;});
    [textures.rooms,textures.lab,textures.visitors]=await Promise.all([load('assets/rooms-open-v10.webp'),load('assets/lab-open-v10.webp'),load('assets/visitor-consistency-v8.webp')]);
    // Trim the old heavy side walls once, keeping original room registration.
    [[0,0],[1,0],[0,1],null,[1,1],[1,1]].forEach(cell=>roomFrames.push(cell?crop(textures.rooms,cell[0]*627+43,cell[1]*627,541,410):crop(textures.lab,86,0,1082,820)));
    host.append(app.canvas);app.canvas.setAttribute('aria-hidden','true');
    app.canvas.addEventListener('webglcontextlost',()=>{ready=false;document.body.classList.remove('pixi-ready');document.body.classList.add('renderer-fallback');if(pending)window.ArchivePerspective?.drawFallback(pending,pending.scale);});
    app.canvas.addEventListener('webglcontextrestored',()=>{ready=true;last=null;document.body.classList.add('pixi-ready');if(pending)update(pending,pending.scale);});
    ready=true;document.body.classList.add('pixi-ready');if(pending)update(pending,pending.scale);
  }
  init().catch(()=>{document.body.classList.add('renderer-fallback');});
})();
