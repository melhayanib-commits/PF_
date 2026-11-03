/* Món obert: Observació — lanzador. Configura un ÚNICO importmap de Three.js (local vendor/three/ o CDN fijado) y carga game3d/main.js. */
(()=>{'use strict';
const VER='0.170.0';let info=null;
async function exists(u){try{const r=await fetch(u,{method:'HEAD',cache:'no-cache'});return r.ok}catch{return false}}
async function setupThree(){
 if(info)return info;
 if(!(window.HTMLScriptElement&&HTMLScriptElement.supports&&HTMLScriptElement.supports('importmap')))throw new Error('Este navegador es demasiado antiguo (falta compatibilidad con importmap: se necesita Safari 16.4+, Chrome 89+ o Firefox 108+).');
 const local=new URL('vendor/three/build/three.module.js',document.baseURI).href;const hasLocal=await exists(local);
 const base=hasLocal?new URL('vendor/three/',document.baseURI).href:`https://cdn.jsdelivr.net/npm/three@${VER}/`;
 const s=document.createElement('script');s.type='importmap';s.textContent=JSON.stringify({imports:{'three':base+'build/three.module.js','three/addons/':base+'examples/jsm/'}});document.head.appendChild(s);
 info={source:hasLocal?'local (vendor/three)':'CDN jsDelivr three@'+VER,base};console.info('[Món obert] Three.js:',info.source);return info;
}
document.addEventListener('click',async e=>{
 const t=e.target;if(!t||!t.closest||!t.closest('#launch-game'))return;
 if(document.querySelector('.mode-card.selected')?.dataset.mode!=='anomaly')return;
 e.preventDefault();e.stopImmediatePropagation();if(window.__pfAnomActive)return;
 const menu=document.querySelector('#game-menu'),container=document.querySelector('#game-container');
 try{const importInfo=await setupThree();const mod=await import(new URL('game3d/main.js',document.baseURI).href);await mod.launchGame({menu,container,importInfo})}
 catch(err){console.error('[Món obert]',err);menu.classList.add('hidden');container.classList.remove('hidden');
  container.innerHTML='<div style="padding:20px;background:#2a0907;border:1px solid #ff5a4d;border-radius:14px;color:#ffe3df"><b>No se pudo iniciar Món obert: Observació.</b><br><small></small><br><br><button class="btn btn-primary" id="anom-err-back">Volver al menú</button></div>';
  container.querySelector('small').textContent=String(err&&err.message||err);
  container.querySelector('#anom-err-back').onclick=()=>{container.innerHTML='';container.classList.add('hidden');menu.classList.remove('hidden')}}
},true);
})();
