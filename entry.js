// Preserve incoming links shared before the version selector was introduced.
if (location.hash && location.hash !== '#choose') {
  location.replace('normal.html' + location.search + location.hash);
}
window.renderVisitorSprite(document.querySelector('.preview-visitor'));
const previewPath=document.querySelector('.preview-path');
new ResizeObserver(()=>window.renderBrickPath(previewPath,previewPath.clientWidth,.5)).observe(previewPath);
