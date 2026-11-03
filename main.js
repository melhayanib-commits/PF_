/* Orquestador: une núcleo (core.js) + vista THREE + UI + controles. Se importa desde anomaly3d.js tras configurar el importmap. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GameCore, ST } from './core.js';
import { CFG, roomZ0 } from './rooms.js';
import { createStation } from './station.js';
import { loadCharacter, ModelError, MODEL_SPECS } from './models.js';
import { createAudio } from './audio.js';
import { createControls } from './controls.js';
import { cameraReach, clamp, lerpAngle } from './nav.js';

const CSS = `#anom-game{position:relative;width:100%;height:min(82vh,860px);min-height:520px;background:#06090e;color:#fff;border-radius:18px;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#anom-game.pseudo-fs{position:fixed;inset:0;z-index:9999;width:100vw;height:100vh;height:100dvh;border-radius:0;min-height:0}
#anom-game:fullscreen{width:100vw;height:100vh;border-radius:0;min-height:0}
#anom-game canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
#anom-hud{position:absolute;left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));display:flex;gap:6px;align-items:center;pointer-events:none;z-index:3}
.anom-chip{background:#07111dcc;border:1px solid #c4d6e63a;border-radius:9px;padding:5px 9px;font-size:12px;font-weight:800;white-space:nowrap}
.anom-btn{pointer-events:auto;background:#07111dcc;border:1px solid #c4d6e655;border-radius:9px;color:#fff;font-weight:800;font-size:13px;min-width:38px;min-height:36px;padding:0 9px;cursor:pointer;touch-action:manipulation}
#anom-stam{width:54px;height:6px;border-radius:4px;background:#ffffff26;overflow:hidden}#anom-stam i{display:block;height:100%;width:100%;background:#7ee08f;transform-origin:left}
#anom-toast{position:absolute;left:50%;top:max(52px,calc(env(safe-area-inset-top) + 46px));transform:translate(-50%,-6px);max-width:min(560px,86%);text-align:center;background:#07111de8;border:1px solid #dce8f333;padding:8px 13px;border-radius:11px;font-size:13px;line-height:1.35;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;z-index:3}
#anom-toast.show{opacity:1;transform:translate(-50%,0)}#anom-toast.ok{border-color:#58d98a;color:#d8ffe6}#anom-toast.alert{border-color:#ff5a4d;background:#2a0907ee;color:#ffe3df}#anom-toast.explain{border-color:#e6bf56;text-align:left}
#anom-q{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);display:none;gap:8px;z-index:3;align-items:center}
#anom-q.show{display:flex}#anom-q button{font-size:14px;font-weight:900;border:0;border-radius:11px;padding:12px 16px;min-height:46px;cursor:pointer;touch-action:manipulation;box-shadow:0 4px 16px #0008}
#anom-changes{background:#e5b748;color:#18140a}#anom-same{background:#dbe7f4;color:#17202b}
#anom-touch{position:absolute;inset:0;pointer-events:none;display:none;z-index:2}#anom-touch.on{display:block}
#anom-joy{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(22px,env(safe-area-inset-bottom));width:116px;height:116px;border-radius:50%;border:2px solid #ffffff55;background:#07111d66;pointer-events:auto;touch-action:none}
#anom-knob{position:absolute;left:38px;top:38px;width:40px;height:40px;border-radius:50%;background:#d9eaffcc;border:1px solid #fff}
#anom-acts{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(2,64px);gap:9px;pointer-events:none}
#anom-acts button{pointer-events:auto;touch-action:none;width:64px;height:64px;border-radius:50%;border:1px solid #ffffff77;background:#10253bcc;color:#fff;font-weight:900;font-size:11px}
#anom-act-run{background:#5a38b8cc!important}#anom-act-use{background:#18697acc!important}
#anom-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#03070de6;padding:16px;z-index:6;overflow:auto}
#anom-overlay.show{display:flex}
#anom-card{max-width:560px;width:100%;background:linear-gradient(145deg,#172637,#0b111c);border:1px solid #a5bfd244;border-radius:20px;padding:20px;text-align:center;box-shadow:0 20px 90px #000b}
#anom-card h2{font-size:clamp(22px,4vw,32px);margin:6px 0 10px}#anom-card p{color:#d4deea;line-height:1.5;font-size:14px;margin:8px 0}
#anom-card button{border:0;border-radius:11px;padding:13px 18px;margin:5px;background:#e4b84c;color:#17120a;font-weight:950;cursor:pointer;min-height:46px;touch-action:manipulation}#anom-card button.sec{background:#25394d;color:#fff;border:1px solid #fff3}
#anom-card .err{background:#3a0f0f;border:1px solid #ff6b6b;border-radius:10px;padding:10px;text-align:left;font-size:12px;color:#ffd5d5;word-break:break-word;margin:8px 0}
#anom-card .bar{height:8px;background:#ffffff22;border-radius:5px;overflow:hidden;margin:8px 0}#anom-card .bar i{display:block;height:100%;width:0;background:#7ee08f;transition:width .2s}
#anom-dbg{position:absolute;left:8px;bottom:8px;font:10px/1.3 monospace;color:#9fe;background:#000a;padding:4px 6px;border-radius:6px;z-index:4;pointer-events:none;max-width:60%;white-space:pre-wrap}
#anom-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:5;transition:opacity 1.2s}
#anom-vig{position:absolute;inset:0;pointer-events:none;z-index:1;opacity:0;background:radial-gradient(ellipse at center,#0000 55%,#8a0b0b99 100%);transition:opacity .4s}
@media(max-width:650px){#anom-game{min-height:480px;height:78vh}.anom-chip{font-size:11px;padding:4px 7px}}`;

const $ = (r, s) => r.querySelector(s);
const isTouchDevice = () => (matchMedia && matchMedia('(pointer:coarse)').matches) || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const isLowEnd = () => isTouchDevice() || (navigator.deviceMemory && navigator.deviceMemory <= 4) || Math.min(screen.width, screen.height) < 700;

export async function launchGame({ menu, container, importInfo }) {
  const debug = /[?&]debug\b/.test(location.search), low = isLowEnd(), touchDev = isTouchDevice();
  if (!document.getElementById('anom-css')) { const st = document.createElement('style'); st.id = 'anom-css'; st.textContent = CSS; document.head.append(st); }
  menu.classList.add('hidden'); container.classList.remove('hidden');
  container.innerHTML = `<div id="anom-game"><canvas id="anom-canvas" tabindex="0"></canvas><div id="anom-vig"></div>
  <div id="anom-hud"><span class="anom-chip">SALA <b id="anom-room">1</b>/${CFG.TOTAL_ROOMS}</span><span class="anom-chip">PTS <b id="anom-score">0</b></span><span id="anom-stam" title="Energía para correr"><i></i></span><span style="flex:1"></span>
  <button class="anom-btn" id="anom-pause" aria-label="Pausa">Ⅱ</button><button class="anom-btn" id="anom-mute" aria-label="Sonido">🔊</button><button class="anom-btn" id="anom-full" aria-label="Pantalla completa">⛶</button><button class="anom-btn" id="anom-exit" aria-label="Salir">✕</button></div>
  <div id="anom-toast" role="status" aria-live="polite"></div>
  <div id="anom-q"><button id="anom-changes">CAMBIOS</button><button id="anom-same">SIN CAMBIOS</button></div>
  <div id="anom-touch"><div id="anom-joy"><div id="anom-knob"></div></div><div id="anom-acts"><button id="anom-act-jump">SALTAR</button><button id="anom-act-run">CORRER</button><button id="anom-act-use" style="grid-column:1/3;width:100%;border-radius:32px">INTERACTUAR</button></div></div>
  <div id="anom-fade"></div><div id="anom-overlay" class="show"><div id="anom-card"></div></div>${debug ? '<div id="anom-dbg"></div>' : ''}</div>`;
  const root = $(container, '#anom-game'), canvas = $(root, '#anom-canvas'), card = $(root, '#anom-card'), overlay = $(root, '#anom-overlay');
  const showCard = html => { card.innerHTML = html; overlay.classList.add('show'); }, hideCard = () => overlay.classList.remove('show');
  const fatal = (title, lines, retry) => { showCard(`<div style="font-size:38px">⚠️</div><h2>${title}</h2>${lines.map(l => `<div class="err">${l}</div>`).join('')}<p>No se muestra ningún personaje provisional: el juego necesita los modelos originales.</p>${retry ? '<button id="anom-retry">Reintentar</button>' : ''}<button class="sec" id="anom-back">Volver al menú</button>`); const b = $(card, '#anom-back'); if (b) b.onclick = () => teardown(); const r = $(card, '#anom-retry'); if (r) r.onclick = () => { teardown(); launchGame({ menu, container, importInfo }); }; };
  let dead = false, raf = 0, renderer = null, station = null, core = null, ctl = null, audio = createAudio(), ro = null; const cleanup = [];
  const teardown = () => {
    if (dead) return; dead = true; cancelAnimationFrame(raf); cleanup.forEach(f => { try { f(); } catch {} }); try { ctl?.destroy(); } catch {} try { audio.close(); } catch {}
    try { station?.dispose(); } catch {} try { if (renderer) { renderer.dispose(); renderer.forceContextLoss?.(); } } catch {}
    try { if (document.fullscreenElement) document.exitFullscreen(); else if (document.webkitFullscreenElement) document.webkitExitFullscreen(); } catch {}
    container.innerHTML = ''; container.classList.add('hidden'); menu.classList.remove('hidden'); window.__pfAnomActive = false; window.__pfAnomTeardown = null;
  };
  window.__pfAnomTeardown = teardown; window.__pfAnomActive = true;
  showCard(`<div style="font-size:38px">🚇</div><h2>Preparando la estación…</h2><p id="anom-load-t">Cargando Naruto y Terrifying (${low ? 'versión ligera para móvil' : 'texturas 1K'}).</p><div class="bar"><i id="anom-bar"></i></div>`);
  const bar = $(card, '#anom-bar'), loadTxt = $(card, '#anom-load-t');

  /* ---- renderer + escena ---- */
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  } catch (e) { fatal('Tu navegador no puede crear el contexto WebGL', [String(e.message || e)], false); return; }
  const pr = Math.min(devicePixelRatio || 1, low ? 1.5 : 2); renderer.setPixelRatio(pr); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const shadows = !low; if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0c10); scene.fog = new THREE.Fog(0x0a0c10, 14, 40);
  const camera = new THREE.PerspectiveCamera(62, 1, .08, 80);
  const fit = () => { const w = Math.max(2, root.clientWidth), h = Math.max(2, root.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 74 : 62; camera.updateProjectionMatrix(); };
  fit(); ro = new ResizeObserver(fit); ro.observe(root); const onRz = () => fit(); addEventListener('resize', onRz); addEventListener('orientationchange', () => setTimeout(fit, 250)); cleanup.push(() => { ro.disconnect(); removeEventListener('resize', onRz); });
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  station = createStation(THREE, scene, { low, shadows, maxAniso });

  /* ---- modelos originales (sin plan B visual) ---- */
  const quality = low ? 'low' : 'high', reports = {}; let naruto, terr; const prog = { naruto: 0, terrifying: 0 };
  const setProg = () => { const v = (prog.naruto * .75 + prog.terrifying * .25) * 100; if (bar) bar.style.width = v.toFixed(0) + '%'; if (loadTxt) loadTxt.textContent = `Cargando modelos… ${v.toFixed(0)} %`; };
  try {
    [naruto, terr] = await Promise.all([loadCharacter(THREE, GLTFLoader, 'naruto', quality, p => { prog.naruto = p; setProg(); }, maxAniso), loadCharacter(THREE, GLTFLoader, 'terrifying', quality, p => { prog.terrifying = p; setProg(); }, maxAniso)]);
  } catch (e) {
    console.error('[Món obert] Fallo de carga de modelo', e);
    const url = e.url ? `<br><b>Archivo:</b> ${e.url}` : ''; fatal(`No se pudo cargar ${e.label || 'un modelo'}`, [`${String(e.message || e)}${url}`, 'Comprueba que la carpeta assets/characters/ está publicada con los .glb y que las rutas distinguen mayúsculas/minúsculas.'], true); return;
  }
  if (dead) return; reports.naruto = naruto.report; reports.terrifying = terr.report; window.__PF_MODELS = reports; console.info('[Món obert] Modelos cargados', reports);
  for (const m of [naruto, terr]) m.holder.traverse(o => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = false; } });
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blob = r => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .02; return m; };
  const pActor = new THREE.Group(); pActor.add(naruto.holder); const pBlob = blob(.55); scene.add(pActor, pBlob);
  const mActor = new THREE.Group(); mActor.add(terr.holder); mActor.visible = false; const mBlob = blob(.8); mBlob.visible = false; const mLight = new THREE.PointLight(0xff2a20, 0, 9, 1.6); mLight.position.y = 1.4; mActor.add(mLight); scene.add(mActor, mBlob);

  /* ---- núcleo ---- */
  const difficulty = Math.max(1, Math.min(3, +document.querySelector('#game-difficulty')?.value || 2)); core = new GameCore({ seed: (Math.random() * 1e9) | 0, difficulty });
  const toast = $(root, '#anom-toast'), qBox = $(root, '#anom-q'), roomEl = $(root, '#anom-room'), scoreEl = $(root, '#anom-score'), stamEl = $(root, '#anom-stam i'), vig = $(root, '#anom-vig'), fade = $(root, '#anom-fade');
  core.on('message', m => { toast.textContent = m.text; toast.className = 'show ' + m.kind; });
  core.on('messageEnd', () => { toast.className = ''; });
  core.on('score', s => { scoreEl.textContent = s; });
  core.on('sfx', n => audio.sfx(n));
  core.on('alarm', on => { audio.alarm(on); vig.style.opacity = on ? 1 : 0; });
  core.on('needRoom', i => { if (i < CFG.TOTAL_ROOMS && !station.rooms.has(i)) station.buildRoom(i, core.rooms[i]); for (const k of [...station.rooms.keys()]) if (k < core.curRoom - 2) station.disposeRoom(k); });
  core.on('enterRoom', i => { roomEl.textContent = i + 1; });
  let recorded = false;
  core.on('end', r => {
    if (!recorded) { recorded = true; try { const P = window.PF; if (P?.data) { P.data.games.push({ id: Date.now().toString(36), mode: 'Món obert: Observació', score: r.score, duration: Math.round(core.t), hits: core.completed, misses: r.won ? 0 : 1, level: difficulty, date: new Date().toISOString().slice(0, 10), at: new Date().toISOString() }); P.addActivity('game', 'Partida completada', `Món obert: Observació · ${r.score} punts`); P.save(); P.refreshGameHistory(); } } catch (e) { console.warn(e); } }
    ctl.releaseLock(); audio.alarm(false); audio.ambient(false); if (r.won) audio.sfx('win');
    setTimeout(() => showCard(`<div style="font-size:40px">${r.won ? '🏁' : '☠️'}</div><h2>${r.won ? 'Has completado la estación' : 'Has sido atrapado'}</h2><p><b>Puntuación: ${r.score}</b><br>Salas completadas: ${r.won ? CFG.TOTAL_ROOMS : r.rooms} de ${CFG.TOTAL_ROOMS}</p><button id="anom-again">Volver a intentarlo</button><button class="sec" id="anom-menu">Salir al menú</button>`) || bindEnd(), r.won ? 300 : 700);
  });
  const bindEnd = () => { const a = $(card, '#anom-again'), m = $(card, '#anom-menu'); if (a) a.onclick = () => beginRun(); if (m) m.onclick = () => teardown(); };

  /* ---- controles ---- */
  const isPlaying = () => core && !dead && core.state !== ST.INICIO && core.state !== ST.FIN && core.state !== ST.VICTORIA && !overlay.classList.contains('show') || core.state === ST.PAUSA && false;
  const doPause = (fromLock) => { if (core.state === ST.PAUSA) return; if (core.pause()) { ctl.reset(); ctl.releaseLock(); showCard(`<h2>Pausa</h2><p>Estación detenida. ${touchDev ? '' : 'Pulsa en el juego para volver a capturar el ratón.'}</p><button id="anom-resume">Continuar</button><button class="sec" id="anom-menu2">Salir al menú</button>`); $(card, '#anom-resume').onclick = doResume; $(card, '#anom-menu2').onclick = () => teardown(); } };
  const doResume = () => { if (core.state !== ST.PAUSA) return; core.resume(); hideCard(); audio.unlock(); canvas.focus(); last = performance.now(); };
  ctl = createControls({ root, canvas, joyEl: $(root, '#anom-joy'), knobEl: $(root, '#anom-knob'), onInteract: () => { core.interact(); }, onPause: doPause, onAnswer: a => { if (core.can('answer')) core.answer(a); }, isPlaying: () => !dead && !overlay.classList.contains('show') && core.state !== ST.PAUSA });
  const touchUI = $(root, '#anom-touch'); const showTouch = () => touchUI.classList.add('on'); if (touchDev) showTouch(); canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') showTouch(); }, { passive: true });
  const holdBtn = (el, down, up) => { el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch {} down(); }); for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, up); };
  holdBtn($(root, '#anom-act-run'), () => ctl.setSprintTouch(true), () => ctl.setSprintTouch(false));
  holdBtn($(root, '#anom-act-jump'), () => { ctl.st.jump = true; }, () => { ctl.st.jump = false; });
  holdBtn($(root, '#anom-act-use'), () => core.interact(), () => {});
  const answer = a => { if (core.can('answer')) core.answer(a); };
  $(root, '#anom-changes').onclick = () => answer('CAMBIOS'); $(root, '#anom-same').onclick = () => answer('SIN CAMBIOS');
  $(root, '#anom-pause').onclick = () => doPause(); $(root, '#anom-exit').onclick = () => teardown();
  const muteBtn = $(root, '#anom-mute'); const paintMute = () => { muteBtn.textContent = audio.muted ? '🔇' : '🔊'; }; paintMute(); muteBtn.onclick = () => { audio.setMuted(!audio.muted); paintMute(); };
  /* pantalla completa: API nativa; en iPhone Safari (sin API para elementos) → modo «pseudo» a pantalla completa de la página */
  const fsApi = !!(root.requestFullscreen || root.webkitRequestFullscreen), fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fullBtn = $(root, '#anom-full');
  fullBtn.onclick = async () => {
    try {
      if (fsApi) { if (fsEl()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document); else { await (root.requestFullscreen || root.webkitRequestFullscreen).call(root); try { await screen.orientation?.lock?.('landscape'); } catch {} } }
      else { root.classList.toggle('pseudo-fs'); document.documentElement.style.overflow = root.classList.contains('pseudo-fs') ? 'hidden' : ''; scrollTo(0, 0); }
    } catch (e) { root.classList.toggle('pseudo-fs'); }
    setTimeout(fit, 120); setTimeout(fit, 450);
  };
  const onFs = () => setTimeout(fit, 100); document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs); cleanup.push(() => { document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); document.documentElement.style.overflow = ''; });
  const onVis = () => { if (document.hidden && core && !dead) doPause(); }; document.addEventListener('visibilitychange', onVis); cleanup.push(() => document.removeEventListener('visibilitychange', onVis));

  /* ---- bucle ---- */
  let camYaw = 0, camPitch = .2, camDist = 3.7, last = performance.now(), clockT = 0, pFall = 0;
  const idleT = MODEL_SPECS.naruto.idleTime; const camPos = new THREE.Vector3(), tgt = new THREE.Vector3();
  const nAct = naruto.action, tAct = terr.action; let nScale = 0, tScale = 0;
  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; clockT += dt;
    const playing = core.state !== ST.PAUSA && core.state !== ST.INICIO && !overlay.classList.contains('show');
    if (playing) {
      const look = ctl.takeLook(), mv = ctl.pollMove();
      if (!core.cine && core.state !== ST.CAPTURA) { camYaw += look.yaw; camPitch = clamp(camPitch + look.pitch, -.15, .95); }
      const sy = Math.sin(camYaw), cy = Math.cos(camYaw); core.input = { x: -sy * mv.f + cy * mv.s, z: -cy * mv.f - sy * mv.s, sprint: mv.sprint, jump: mv.jump }; if (mv.jump) ctl.consumeJump();
      core.update(dt);
    }
    const p = core.player, m = core.monster;
    // actores
    pActor.position.set(p.x, p.y, p.z); pBlob.position.set(p.x, .02, p.z); pBlob.scale.setScalar(1 / (1 + p.y * .8));
    if (core.state === ST.CAPTURA || core.state === ST.FIN) { pFall = Math.min(1, pFall + dt / .9); } else pFall = 0;
    pActor.rotation.set(-pFall * 1.35, p.yaw, 0, 'YXZ'); pActor.position.y = p.y - pFall * .55;
    const want = !playing ? 0 : p.moving ? (p.sprinting ? 1.25 : .78) : 0; nScale += (want - nScale) * Math.min(1, dt * 10);
    if (nScale > .03) { nAct.timeScale = nScale; naruto.mixer.update(dt); } else if (nAct.timeScale !== 0) { nAct.time = idleT; nAct.timeScale = 0; naruto.mixer.update(0); }
    if (m.active) {
      mActor.visible = true; mBlob.visible = true; mActor.position.set(m.x, 0, m.z); mBlob.position.set(m.x, .02, m.z); mActor.rotation.y = m.yaw;
      if (m.state === 'emerging') { const k = Math.min(1, m.t / 1.3); mActor.visible = (Math.sin(m.t * 38) > -.5) || k > .8; mActor.scale.set(1, .6 + .4 * k, 1); mLight.intensity = 2.2 * (1 - k * .4); tAct.timeScale = .25; }
      else { mActor.scale.set(1, 1, 1); mLight.intensity = .9; tScale += ((m.moving ? clamp(m.speed / 4.6, .5, 1.6) : 0) - tScale) * Math.min(1, dt * 8); tAct.timeScale = Math.max(tScale, core.state === ST.CAPTURA ? .15 : 0); }
      if (playing || core.state === ST.CAPTURA) terr.mixer.update(dt);
    } else { mActor.visible = false; mBlob.visible = false; }
    // cámara
    const chasing = core.state === ST.PERSE; let distT = chasing ? 4.1 : 3.7;
    if (core.cine && m.active) { camYaw = lerpAngle(camYaw, Math.atan2(-(m.x - p.x), -(m.z - p.z)), 1 - Math.exp(-3.2 * dt)); camPitch += (.16 - camPitch) * Math.min(1, dt * 2); distT = 4.6; }
    if (core.state === ST.CAPTURA && m.active) { camYaw = lerpAngle(camYaw, Math.atan2(-(m.x - p.x), -(m.z - p.z)), 1 - Math.exp(-4 * dt)); distT = 2.4; if (!fade.style.opacity || fade.style.opacity === '0') fade.style.opacity = '.85'; }
    else if (core.state !== ST.FIN && fade.style.opacity !== '0') fade.style.opacity = '0';
    const ux = Math.sin(camYaw), uz = Math.cos(camYaw), hMax = distT * Math.cos(camPitch), cols = core.cols;
    tgt.set(p.x, p.y + 1.45, p.z); const reach = cameraReach(tgt.x, tgt.z, ux, uz, hMax, cols), hUse = Math.min(hMax, reach);
    camDist += ((hUse) - camDist) * (hUse < camDist ? 1 : Math.min(1, dt * 4)); const hh = camDist, vv = Math.max(.25, Math.tan(camPitch) * hh);
    camPos.set(tgt.x + ux * hh, clamp(tgt.y + vv + .1, .45, CFG.W > 0 ? 3.7 : 3.7), tgt.z + uz * hh); if (core.state === ST.CAPTURA) camPos.x += Math.sin(clockT * 60) * .02;
    camera.position.copy(camPos); camera.lookAt(tgt.x, tgt.y + (camPitch < 0 ? 0 : -.15), tgt.z);
    // escena
    station.update(core, clockT); station.followSun(p.x, p.z);
    qBox.classList.toggle('show', core.questionVisible()); stamEl.style.transform = `scaleX(${core.player.stamina.toFixed(3)})`; stamEl.style.background = core.player.tired ? '#e8a13c' : '#7ee08f';
    if (playing) { audio.step(dt, p.moving, p.sprinting, p.onGround); if (core.state === ST.PERSE) audio.chase(dt, Math.hypot(m.x - p.x, m.z - p.z)); }
    renderer.render(scene, camera);
    if (debug) { const d = $(root, '#anom-dbg'); if (d) d.textContent = `estado ${core.state} · sala ${core.curRoom + 1} (eval ${core.evalRoom + 1})\nNaruto: ${reports.naruto.url.split('/').pop()} [${reports.naruto.variant}] huesos ${reports.naruto.bones} clip ${nAct.isRunning()}\nTerrifying: ${reports.terrifying.url.split('/').pop()} huesos ${reports.terrifying.bones}\nthree: ${importInfo?.source || '?'} · luces/tex: ${renderer.info.render.calls} calls ${renderer.info.memory.textures} tex`; }
  }
  function beginRun() {
    recorded = false; hideCard(); ctl.reset(); audio.unlock(); audio.ambient(true); core.reset(Date.now()); for (const k of [...station.rooms.keys()]) station.disposeRoom(k);
    camYaw = 0; camPitch = .2; camDist = 3.7; roomEl.textContent = '1'; scoreEl.textContent = '0'; vig.style.opacity = 0; fade.style.opacity = 0; pFall = 0; mActor.visible = false; mBlob.visible = false; m0();
    core.start(); last = performance.now(); canvas.focus();
  }
  const m0 = () => { core.monster.active = false; };
  // pantalla inicial (modelos ya cargados)
  const startHtml = `<div style="font-size:40px">🚇 ◈</div><div style="letter-spacing:2px;font-size:11px;color:#e6bf56;font-weight:900">MÓN OBERT · OBSERVACIÓ</div><h2>Observa la estación</h2><p>La sala 1 es solo de observación: memorízala. A partir de la sala 2 deberás decidir si hay <b>CAMBIOS</b> o <b>SIN CAMBIOS</b>. Si te equivocas, las puertas se cierran y Terrifying te perseguirá.</p><p style="font-size:12px;color:#aab8c6">${touchDev ? 'Joystick izquierdo para moverte · arrastra para mirar · CORRER / SALTAR / INTERACTUAR.' : 'WASD / flechas · ratón para girar la cámara · Shift correr · Espacio saltar · E interactuar · Esc pausa · 1/2 responder.'}</p><button id="anom-start">Entrar a la estación</button><button class="sec" id="anom-menu0">Volver al menú</button>`;
  showCard(startHtml); $(card, '#anom-start').onclick = beginRun; $(card, '#anom-menu0').onclick = () => teardown();
  last = performance.now(); raf = requestAnimationFrame(frame);
  window.__PF_GAME = { core, station, scene, camera, renderer, reports };
}
