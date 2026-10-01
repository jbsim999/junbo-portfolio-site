(() => {
  'use strict';
  // The source contains 4 brick pitches and 8 courses. Its outside border is
  // not seamless. Repeat only the INNER three pitches (x=12.5%..87.5%), so
  // alternate half-bricks join without a vertical frame every four bricks.
  window.renderBrickPath = (element,width,scale=1) => {
    const pitch=300*scale;
    const count=Math.ceil(width/pitch);
    const signature=count+':'+scale;
    if(element.dataset.paving===signature)return;
    element.dataset.paving=signature;
    element.style.setProperty('--paving-texture-width',400*scale+'px');
    element.style.setProperty('--paving-texture-height',280*scale+'px');
    element.style.setProperty('--paving-offset',-50*scale+'px');
    element.replaceChildren(...Array.from({length:count},(_,index)=>{
      const tile=document.createElement('span');tile.className='paving-tile';
      tile.style.left=index*pitch+'px';tile.style.width=pitch+'px';return tile;
    }));
  };
})();
