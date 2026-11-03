/* Construcción 3D de la estación (THREE). Geometría y materiales compartidos; solo se crean grupos por sala. */
import { CFG, roomZ0, doorZ, SLOTS, LAMPS, ITEMS } from './rooms.js';

export function createStation(THREE, scene, opts) {
  const lowQ = !!opts.low, shadows = !!opts.shadows, maxAniso = opts.maxAniso || 4;
  const geo = {}, mats = {}, texs = {}, rooms = new Map(), doorViews = new Map();
  const G = (key, make) => geo[key] || (geo[key] = make());
  const BOX = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
  const CYL = (r1, r2, h, s = 12) => G(`c${r1},${r2},${h},${s}`, () => new THREE.CylinderGeometry(r1, r2, h, s));
  const PLN = (w, h) => G(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));
  const scaleUV = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; return g; };
  const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const tex = (key, w, h, fn, rep) => {
    if (texs[key]) return texs[key]; const t = new THREE.CanvasTexture(cv(w, h, fn)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return texs[key] = t;
  };
  const rnd = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  /* ---- texturas procedimentales (sin descargas) ---- */
  const wallTex = () => tex('wall', 512, 512, (g, w, h) => { // 4 columnas x 2 filas: azulejo 0,3 x 0,6 m en 1,2 m
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const v = 232 + Math.floor(rnd() * 14); g.fillStyle = `rgb(${v},${v + 2},${v})`; g.fillRect(c * 128, r * 256, 128, 256); const gr = g.createLinearGradient(c * 128, r * 256, c * 128 + 128, r * 256 + 256); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(0,0,0,.06)'); g.fillStyle = gr; g.fillRect(c * 128, r * 256, 128, 256); }
    g.strokeStyle = '#7f8a8b'; g.lineWidth = 5; for (let c = 0; c <= 4; c++) { g.beginPath(); g.moveTo(c * 128, 0); g.lineTo(c * 128, h); g.stroke(); } for (let r = 0; r <= 2; r++) { g.beginPath(); g.moveTo(0, r * 256); g.lineTo(w, r * 256); g.stroke(); }
  }, true);
  const floorTex = () => tex('floor', 512, 512, (g, w, h) => { // 2x2 baldosas de 0,5 m en 1 m
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const v = 118 + Math.floor(rnd() * 22); g.fillStyle = `rgb(${v},${v + 3},${v + 5})`; g.fillRect(c * 256, r * 256, 256, 256); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},.05)`; g.fillRect(c * 256 + rnd() * 256, r * 256 + rnd() * 256, 3, 3); } }
    g.strokeStyle = '#3d4348'; g.lineWidth = 6; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 256); g.lineTo(w, i * 256); g.stroke(); }
  }, true);
  const lineTex = () => tex('yline', 64, 256, (g, w, h) => { g.fillStyle = '#e8b900'; g.fillRect(0, 0, w, h); g.fillStyle = '#b88f00'; for (let y = 8; y < h; y += 32) for (let x = 10; x < w; x += 22) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }, true);
  const POSTER_COL = { azul: ['#1d5f8f', '#0b2f4d'], rojo: ['#b3342e', '#5a1210'], verde: ['#2f8a4f', '#10381f'], naranja: ['#d97a1c', '#6a3306'] };
  const posterTex = (id, vi) => { const name = ITEMS[id].variants[vi], key = `poster${id}${name}`, big = id === 'posterA'; return tex(key, 256, 360, (g, w, h) => { const [a, b] = POSTER_COL[name]; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffffee'; g.fillRect(14, 14, w - 28, 8); g.font = 'bold 44px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(big ? 'METRO' : id === 'posterB' ? 'AVISO' : 'INFO', w / 2, 90); g.beginPath(); g.arc(w / 2, 190, 52, 0, 7); g.fillStyle = '#ffffff33'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff'; g.fillRect(w / 2 - 6, 160, 12, 60); for (let i = 0; i < 4; i++) g.fillRect(24, 268 + i * 18, w - 48 - (i * 28 % 70), 7); }); };
  const textTex = (key, text, bg, fg, w = 512, h = 128, font = 'bold 64px system-ui,sans-serif') => tex(key, w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3); });
  const clockTex = vi => tex('clock' + vi, 256, 256, (g) => { g.fillStyle = '#f2f0e8'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#222'; g.stroke(); g.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.lineWidth = 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * 114, 128 - Math.cos(a) * 114); g.stroke(); } const T = [[3, 10], [9, 25], [6, 40]][vi], ha = ((T[0] % 12) + T[1] / 60) / 12 * 6.283, ma = T[1] / 60 * 6.283; g.strokeStyle = '#111'; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ha) * 62, 128 - Math.cos(ha) * 62); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ma) * 95, 128 - Math.cos(ma) * 95); g.stroke(); });
  const vendTex = () => tex('vend', 256, 512, (g, w, h) => { g.fillStyle = '#143a66'; g.fillRect(0, 0, w, h); g.fillStyle = '#eaf6ff'; g.font = 'bold 34px system-ui'; g.textAlign = 'center'; g.fillText('BEBIDAS', w / 2, 48); const cols = ['#e63946', '#f1c40f', '#2ecc71', '#3498db']; for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(r + c) % 4]; g.fillRect(24 + c * 56, 80 + r * 62, 40, 50); } g.fillStyle = '#0b1c30'; g.fillRect(24, 410, w - 48, 70); });

  /* ---- materiales compartidos ---- */
  const M = (key, make) => mats[key] || (mats[key] = make());
  const std = (key, p) => M(key, () => new THREE.MeshStandardMaterial(p));
  const wallM = () => M('wallM', () => new THREE.MeshStandardMaterial({ map: wallTex(), roughness: .35, metalness: 0 }));
  const floorM = () => M('floorM', () => new THREE.MeshStandardMaterial({ map: floorTex(), roughness: .45, metalness: .05 }));
  const lampOn = () => M('lampOn', () => new THREE.MeshStandardMaterial({ color: 0xf6f6ea, emissive: 0xeaf2ff, emissiveIntensity: 1.6, roughness: .4 }));
  const lampOff = () => std('lampOff', { color: 0x4a4e50, roughness: .6 });
  const mesh = (g, m, x = 0, y = 0, z = 0, cast = true, recv = false) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = shadows && cast; o.receiveShadow = shadows && recv; return o; };
  const tiledBox = (w, h, d, x, y, z) => { const g = G(`tb${w},${h},${d}`, () => scaleUV(new THREE.BoxGeometry(w, h, d), Math.max(w, d) / 1.2, h / 1.2)); const o = new THREE.Mesh(g, wallM()); o.position.set(x, y, z); o.receiveShadow = shadows; return o; };
  const geoOwned = [];
  const H = 4.2;

  /* ---- puertas ---- */
  function makeDoor(k, label, locked) {
    const g = new THREE.Group(); g.position.z = doorZ(k);
    const leafM = std('doorLeaf', { color: 0x59636c, roughness: .35, metalness: .75 }), trim = std('doorTrim', { color: 0xd1a800, roughness: .6 });
    const mk = (side) => { const lf = new THREE.Group(); lf.add(mesh(BOX(1.3, 3.3, .07), leafM, 0, 1.65, 0)); lf.add(mesh(BOX(.05, 3.3, .09), trim, -side * .6, 1.65, 0)); lf.add(mesh(BOX(.05, .7, .1), std('handle', { color: 0xcfd6dc, metalness: .9, roughness: .25 }), side * .5, 1.1, 0)); const win = mesh(BOX(.5, .6, .075), std('doorWin', { color: 0x1a2630, roughness: .1, metalness: .3 }), 0, 2.3, 0); lf.add(win); return lf; };
    const L = mk(-1), R = mk(1); L.position.z = .06; R.position.z = -.06; g.add(L, R);
    g.add(mesh(BOX(2.7, .12, .45), std('doorFrame', { color: 0x9aa3a8, roughness: .5, metalness: .4 }), 0, 3.36, 0));
    const lamp = new THREE.Mesh(G('doorLamp', () => new THREE.SphereGeometry(.09, 10, 8)), new THREE.MeshBasicMaterial({ color: 0xff2222 })); lamp.position.set(0, 3.6, .25); g.add(lamp);
    const sign = new THREE.Mesh(PLN(1.1, .28), new THREE.MeshBasicMaterial({ map: textTex('dl' + label, label, '#1a1f24', locked ? '#ff6b6b' : '#d8e2ea', 256, 64, 'bold 30px system-ui') })); sign.position.set(0, 3.82, .24); g.add(sign);
    const dv = { k, group: g, L, R, lamp, locked: !!locked, open: -1 }; doorViews.set(k, dv); scene.add(g); return dv;
  }
  function syncDoor(dv, d) {
    const o = d.open; if (dv.open === o && dv.tgt === d.target) return; dv.open = o; dv.tgt = d.target; const s = o * o * (3 - 2 * o);
    dv.L.position.x = -.65 - s * 1.3; dv.R.position.x = .65 + s * 1.3;
    dv.lamp.material.color.setHex(dv.locked ? 0xff2222 : d.target === 1 ? 0x2cff6a : (o > .02 ? 0xffb020 : 0xff2222));
  }

  /* ---- objetos ---- */
  function makeItem(id, it, roomIdx, lv) {
    const def = ITEMS[id], s = it.slot ? SLOTS[it.slot] : null, g = new THREE.Group(); if (s) g.position.set(s.x, 0, s.z);
    const sgn = s ? (s.wall === 'L' ? -1 : s.wall === 'R' ? 1 : 0) : 0; // hacia la pared
    switch (def.kind) {
      case 'poster': { const p = mesh(PLN(id === 'posterA' ? 1.2 : 0.9, id === 'posterA' ? 1.68 : 1.26), new THREE.MeshStandardMaterial({ map: posterTex(id, it.variant), roughness: .6 }), 0, 2.1, 0, false); p.rotation.y = s.wall === 'L' ? Math.PI / 2 : -Math.PI / 2; p.position.x = -sgn * .04; const fr = mesh(BOX(.03, id === 'posterA' ? 1.78 : 1.36, id === 'posterA' ? 1.3 : 1.0), std('frame', { color: 0x30363b, roughness: .5 }), sgn * .005, 2.1, 0, false); g.add(fr, p); break; }
      case 'bench': { const m = std('benchM', { color: 0x9aa2a8, roughness: .35, metalness: .7 }), fm = std('benchF', { color: 0x2b3034, roughness: .5, metalness: .6 }); g.add(mesh(BOX(.5, .06, 1.9), m, -sgn * .02, .46, 0, true, true), mesh(BOX(.05, .45, 1.9), m, sgn * .22, .78, 0, true, true), mesh(BOX(.05, .46, .45), fm, 0, .23, .8), mesh(BOX(.05, .46, .45), fm, 0, .23, -.8), mesh(BOX(.5, .04, .06), fm, 0, .4, .8), mesh(BOX(.5, .04, .06), fm, 0, .4, -.8)); break; }
      case 'bin': { g.add(mesh(CYL(.26, .22, .8, 14), std('binM', { color: 0x2d5a3d, roughness: .6, metalness: .2 }), 0, .4, 0, true, true), mesh(CYL(.275, .275, .06, 14), std('binLid', { color: 0x1d2a22, roughness: .5, metalness: .4 }), 0, .83, 0), mesh(BOX(.02, .1, .26), std('binSlot', { color: 0x050505 }), sgn ? -sgn * .26 : 0, .72, 0)); break; }
      case 'vending': { const body = mesh(BOX(.8, 1.9, 1.05), std('vendM', { color: 0x1c4f86, roughness: .4, metalness: .3 }), 0, .95, 0, true, true); const f = mesh(PLN(.9, 1.7), new THREE.MeshStandardMaterial({ map: vendTex(), emissive: 0xffffff, emissiveMap: vendTex(), emissiveIntensity: .55, roughness: .4 }), 0, 1.0, 0, false); f.rotation.y = s.wall === 'L' ? Math.PI / 2 : -Math.PI / 2; f.position.x = -sgn * .405; g.add(body, f); break; }
      case 'ticket': { g.add(mesh(BOX(.5, 1.4, .9), std('tktM', { color: 0x6c7a86, roughness: .4, metalness: .6 }), 0, .7, 0, true, true)); const scr = mesh(PLN(.5, .3), new THREE.MeshBasicMaterial({ map: textTex('tkt', 'BILLETES', '#0d3b2e', '#7dffb8', 256, 128, 'bold 34px system-ui') }), 0, 1.05, 0, false); scr.rotation.y = s.wall === 'L' ? Math.PI / 2 : -Math.PI / 2; scr.position.x = -sgn * .26; g.add(scr); break; }
      case 'extinguisher': { g.add(mesh(CYL(.1, .1, .5, 12), std('extM', { color: 0xc4261d, roughness: .4, metalness: .3 }), -sgn * .1, 1.05, 0), mesh(BOX(.05, .1, .1), std('extB', { color: 0x222 }), sgn * 0, 1.35, 0)); break; }
      case 'wetSign': { const y = std('wetM', { color: 0xf2c200, roughness: .6 }); const a = mesh(BOX(.04, .6, .32), y, .09, .3, 0), b = mesh(BOX(.04, .6, .32), y, -.09, .3, 0); a.rotation.z = .16; b.rotation.z = -.16; g.add(a, b); g.position.x = s.x; break; }
      case 'hangSign': { const t = textTex('hs' + it.variant, def.variants[it.variant], '#10324f', '#ffffff', 512, 128); const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }); const p = new THREE.Mesh(PLN(2.2, .55), m); p.position.set(0, 3.5, 0); g.add(p, mesh(BOX(.03, .5, .03), std('rod', { color: 0x777777 }), -.9, 3.95, 0), mesh(BOX(.03, .5, .03), std('rod', { color: 0x777777 }), .9, 3.95, 0)); g.position.set(0, 0, -8); break; }
      case 'exitSign': { const col = [['#0a5c2b', '#c8ffd9'], ['#6a0e0e', '#ffd0d0'], ['#0b3a6b', '#cfe6ff']][it.variant]; const t = textTex('ex' + it.variant, 'SALIDA', col[0], col[1], 512, 128); const p = new THREE.Mesh(PLN(1.4, .35), new THREE.MeshBasicMaterial({ map: t })); p.position.set(0, 3.72, -15.77); g.add(p); break; }
      case 'clock': { const d = mesh(CYL(.42, .42, .06, 24), std('clkR', { color: 0x222 }), 0, 3, 0, false); d.rotation.x = Math.PI / 2; const face = new THREE.Mesh(PLN(.8, .8), new THREE.MeshBasicMaterial({ map: clockTex(it.variant) })); face.position.set(0, 3, .04); g.add(d, face); g.position.set(2.8, 0, -15.77); break; }
    }
    g.userData.itemId = id; return g;
  }

  /* ---- sala ---- */
  function buildRoom(index, room) {
    if (rooms.has(index)) return rooms.get(index);
    const g = new THREE.Group(), z0 = roomZ0(index); g.position.z = z0;
    const fl = new THREE.Mesh(G('floorG', () => scaleUV(new THREE.PlaneGeometry(8, 16), 8, 16)), floorM()); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -8); fl.receiveShadow = shadows; g.add(fl);
    const cl = new THREE.Mesh(PLN(8, 16), std('ceil', { color: 0xc9cfd2, roughness: .9 })); cl.rotation.x = Math.PI / 2; cl.position.set(0, H, -8); g.add(cl);
    for (const sd of [-1, 1]) {
      const w = new THREE.Mesh(G('wallG', () => scaleUV(new THREE.PlaneGeometry(16, H), 16 / 1.2, H / 1.2)), wallM()); w.rotation.y = sd < 0 ? Math.PI / 2 : -Math.PI / 2; w.position.set(sd * 4, H / 2, -8); w.receiveShadow = shadows; g.add(w);
      g.add(mesh(BOX(.04, .26, 16), std('band', { color: 0x1f4e79, roughness: .5 }), sd * 3.98, 1.1, -8, false), mesh(BOX(.05, .14, 16), std('base', { color: 0x30363b, roughness: .7 }), sd * 3.97, .07, -8, false));
      g.add(mesh(BOX(.05, .06, 16), std('lampRail', { color: 0xd1a800 }), sd * 3.97, 3.2, -8, false)); // franja amarilla superior de referencia
    }
    const yl = new THREE.Mesh(G('ylG', () => scaleUV(new THREE.PlaneGeometry(.16, 16), 1, 16)), new THREE.MeshStandardMaterial({ map: lineTex(), roughness: .5 })); yl.rotation.x = -Math.PI / 2; yl.position.set(2.35, .012, -8); g.add(yl);
    const yl2 = new THREE.Mesh(PLN(.12, 16), std('yline2', { color: 0xe8b900, roughness: .5 })); yl2.rotation.x = -Math.PI / 2; yl2.position.set(-2.35, .011, -8); g.add(yl2);
    // pared del fondo (puerta de salida) y, en la sala 0, pared de entrada
    const endWall = (zz, lab, locked, kd) => { g.add(tiledBox(2.7, H, .4, -2.65, H / 2, zz), tiledBox(2.7, H, .4, 2.65, H / 2, zz), tiledBox(2.6, H - 3.3, .4, 0, 3.3 + (H - 3.3) / 2, zz)); };
    endWall(-16); if (index === 0) endWall(0);
    const exitDoor = makeDoor(index, index === CFG.TOTAL_ROOMS - 1 ? 'SALIDA FINAL' : 'SALIDA', false); room._doorView = exitDoor;
    if (index === 0) makeDoor(-1, 'ENTRADA', true);
    // lámparas
    const lampMeshes = {};
    for (const l of LAMPS) { const on = room.layout.items[l.id].present; const m = mesh(BOX(.5, .07, 2.0), on ? lampOn() : lampOff(), l.x, H - .06, l.z, false); g.add(m); lampMeshes[l.id] = m; const hous = mesh(BOX(.62, .04, 2.12), std('lampHousing', { color: 0x80878b, roughness: .6 }), l.x, H - .015, l.z, false); g.add(hous); }
    // objetos
    for (const [id, it] of Object.entries(room.layout.items)) { if (!ITEMS[id] || !it.present) continue; g.add(makeItem(id, it, index)); }
    // detalles fijos (mismo en todas las salas): rejillas de ventilación y cámaras
    for (const sd of [-1, 1]) g.add(mesh(BOX(.04, .3, 1.0), std('vent', { color: 0x70777b, roughness: .8 }), sd * 3.97, 3.6, -5, false), mesh(BOX(.04, .3, 1.0), std('vent', { color: 0x70777b, roughness: .8 }), sd * 3.97, 3.6, -11, false));
    scene.add(g); const ro = { index, group: g, lampMeshes, room }; rooms.set(index, ro); return ro;
  }
  function disposeRoom(index) { const r = rooms.get(index); if (!r) return; scene.remove(r.group); rooms.delete(index); if (index >= 0) { const dv = doorViews.get(index); if (dv) { scene.remove(dv.group); doorViews.delete(index); } if (index === 0) { const e = doorViews.get(-1); if (e) { scene.remove(e.group); doorViews.delete(-1); } } } }

  /* ---- luces: pool fijo (evita recompilar shaders al construir salas) ---- */
  const hemi = new THREE.HemisphereLight(0xe3ecf6, 0x535a60, lowQ ? 1.15 : .95); scene.add(hemi);
  const poolN = lowQ ? 3 : 6, pool = []; for (let i = 0; i < poolN; i++) { const l = new THREE.PointLight(0xe8f0ff, 1.0, 17, 1.6); l.position.set(0, 3.6, -4 - i * 8); scene.add(l); pool.push(l); }
  let sun = null; if (shadows) { sun = new THREE.DirectionalLight(0xffffff, .5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const c = sun.shadow.camera; c.left = -9; c.right = 9; c.top = 9; c.bottom = -9; c.near = 1; c.far = 40; sun.shadow.bias = -.0006; scene.add(sun, sun.target); }
  const baseCol = new THREE.Color(0xe8f0ff), redCol = new THREE.Color(0xff1a14);
  function updateLights(curRoom, core, alarm, t) {
    const pulse = alarm.on ? .5 + .5 * Math.sin(t * 7) : 0, flick = alarm.on ? (Math.sin(t * 29) > .86 ? .35 : 1) : 1;
    const rr = [curRoom - 1, curRoom, curRoom + 1]; let n = 0;
    for (const ri of rr) {
      const ro = rooms.get(ri); const rows = lowQ ? [-8] : [-4, -12];
      for (const zl of rows) { const L = pool[n++]; if (!L) break; if (!ro) { L.intensity = 0; continue; } L.position.set(0, 3.7, roomZ0(ri) + zl); let on = 0, tot = 0; for (const l of LAMPS) if (Math.abs(l.z - zl) < (lowQ ? 6 : 4.5)) { tot++; if (ro.room.layout.items[l.id].present) on++; } const base = tot ? on / tot : 0; L.color.copy(alarm.on ? redCol : baseCol); L.intensity = (alarm.on ? (.25 + .9 * pulse) * flick : 1.05) * base * (lowQ ? 1.5 : 1); }
    }
    for (; n < pool.length; n++) pool[n].intensity = 0;
    hemi.color.setHex(alarm.on ? 0xff4a40 : 0xe3ecf6); hemi.groundColor.setHex(alarm.on ? 0x4a0d0a : 0x535a60); hemi.intensity = alarm.on ? (lowQ ? .5 : .4) + .25 * pulse : (lowQ ? 1.15 : .95);
    const lo = lampOn(); lo.emissive.setHex(alarm.on ? 0xff2018 : 0xeaf2ff); lo.emissiveIntensity = alarm.on ? .5 + 1.6 * pulse * flick : 1.6; lo.color.setHex(alarm.on ? 0xff8a80 : 0xf6f6ea);
    scene.fog.color.setHex(alarm.on ? 0x1a0505 : 0x0a0c10); scene.background.setHex(alarm.on ? 0x1a0505 : 0x0a0c10);
  }
  function update(core, t) {
    for (const [k, dv] of doorViews) syncDoor(dv, core.doors[k]);
    updateLights(core.curRoom, core, core.alarm, t);
  }
  function followSun(x, z) { if (sun) { sun.position.set(x + 4, 14, z + 3); sun.target.position.set(x, 0, z); } }
  function dispose() { for (const r of [...rooms.keys()]) disposeRoom(r); Object.values(geo).forEach(g => g.dispose()); geoOwned.forEach(g => g.dispose()); Object.values(texs).forEach(t => t.dispose()); Object.values(mats).forEach(m => m.dispose()); pool.forEach(l => scene.remove(l)); scene.remove(hemi); if (sun) scene.remove(sun, sun.target); }
  return { buildRoom, disposeRoom, rooms, update, followSun, dispose, doorViews };
}
