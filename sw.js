const CACHE='pantalla-focus-v14-observacio';
const ASSETS=['./','./index.html','./styles.css','./app.js','./games-arcade.js','./anomaly3d.js','./game3d/main.js','./game3d/core.js','./game3d/rooms.js','./game3d/nav.js','./game3d/station.js','./game3d/models.js','./game3d/audio.js','./game3d/controls.js','./focusia-local.js','./manifest.webmanifest','./focusia-config.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||r.headers.has('range'))return;const u=new URL(r.url);if(u.pathname.includes('/api/'))return;
 const heavy=u.origin===location.origin&&(u.pathname.includes('/assets/')||u.pathname.includes('/vendor/'))||u.hostname==='cdn.jsdelivr.net';
 if(heavy){e.respondWith(caches.match(r).then(c=>c||fetch(r).then(x=>{if(x.ok){const y=x.clone();caches.open(CACHE).then(k=>k.put(r,y))}return x})));return}
 e.respondWith(fetch(r).then(x=>{if(x.ok){const y=x.clone();caches.open(CACHE).then(k=>k.put(r,y))}return x}).catch(()=>caches.match(r).then(c=>c||caches.match('./index.html'))));
});
