/* Controles: teclado + ratón (pointer lock) + táctil (joystick, botones, gesto de cámara). Multitáctil por pointerId. */
export function createControls({ root, canvas, joyEl, knobEl, onInteract, onPause, onAnswer, isPlaying }) {
  const keys = new Set(), st = { fwd: 0, str: 0, sprint: false, jump: false, yawD: 0, pitchD: 0, touch: false };
  const touchBtn = { sprint: false }; let joyId = null, lookId = null, joyC = null, lookLast = null, locked = false; const cleanups = [];
  const on = (t, e, f, o) => { t.addEventListener(e, f, o); cleanups.push(() => t.removeEventListener(e, f, o)); };
  const reset = () => { keys.clear(); st.fwd = st.str = 0; st.sprint = false; st.jump = false; touchBtn.sprint = false; joyId = lookId = null; if (knobEl) knobEl.style.transform = 'translate(0,0)'; };
  const typing = e => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  on(window, 'keydown', e => {
    if (typing(e) || !isPlaying()) return; const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) { return; } keys.add(k);
    if (k === 'e') onInteract(); if (k === 'p') onPause(); if (k === ' ') st.jump = true;
    if (k === '1') onAnswer?.('CAMBIOS'); if (k === '2') onAnswer?.('SIN CAMBIOS');
  });
  on(window, 'keyup', e => { const k = e.key.toLowerCase(); keys.delete(k); if (k === ' ') st.jump = false; });
  on(window, 'blur', reset); on(document, 'visibilitychange', () => { if (document.hidden) reset(); });
  // ratón
  on(document, 'pointerlockchange', () => { locked = document.pointerLockElement === canvas; if (!locked && isPlaying()) onPause(true); });
  on(canvas, 'click', e => { if (e.pointerType === 'touch' || st.touch || locked || !isPlaying()) return; try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch {} });
  on(document, 'mousemove', e => { if (locked) { st.yawD -= e.movementX * .0024; st.pitchD += e.movementY * .0020; } });
  let mouseDrag = false; on(canvas, 'pointerdown', e => { if (e.pointerType === 'mouse' && !locked && e.button === 0) { mouseDrag = true; lookLast = { x: e.clientX, y: e.clientY }; } });
  on(window, 'pointermove', e => { if (mouseDrag && e.pointerType === 'mouse' && !locked && lookLast) { st.yawD -= (e.clientX - lookLast.x) * .005; st.pitchD += (e.clientY - lookLast.y) * .004; lookLast = { x: e.clientX, y: e.clientY }; } });
  on(window, 'pointerup', e => { if (e.pointerType === 'mouse') mouseDrag = false; });
  // táctil: joystick en su zona; cualquier otro dedo sobre el canvas gira la cámara
  if (joyEl) {
    on(joyEl, 'pointerdown', e => { e.preventDefault(); st.touch = true; joyId = e.pointerId; try { joyEl.setPointerCapture(e.pointerId); } catch {} const r = joyEl.getBoundingClientRect(); joyC = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; moveJoy(e); });
    on(joyEl, 'pointermove', e => { if (e.pointerId === joyId) moveJoy(e); });
    const end = e => { if (e.pointerId === joyId) { joyId = null; st.fwd = st.str = 0; if (knobEl) knobEl.style.transform = 'translate(0,0)'; } };
    on(joyEl, 'pointerup', end); on(joyEl, 'pointercancel', end); on(joyEl, 'lostpointercapture', end);
  }
  function moveJoy(e) { const dx = e.clientX - joyC.x, dy = e.clientY - joyC.y, d = Math.hypot(dx, dy) || 1, m = Math.min(d, joyC.R * .8), nx = dx / d * m, ny = dy / d * m; if (knobEl) knobEl.style.transform = `translate(${nx}px,${ny}px)`; const mag = m / (joyC.R * .8); st.str = dx / d * mag; st.fwd = -dy / d * mag; if (mag < .12) st.fwd = st.str = 0; }
  on(canvas, 'pointerdown', e => { if (e.pointerType !== 'touch') return; st.touch = true; if (lookId === null) { lookId = e.pointerId; lookLast = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch {} } });
  on(canvas, 'pointermove', e => { if (e.pointerType === 'touch' && e.pointerId === lookId && lookLast) { st.yawD -= (e.clientX - lookLast.x) * .0055; st.pitchD += (e.clientY - lookLast.y) * .0045; lookLast = { x: e.clientX, y: e.clientY }; } });
  const lend = e => { if (e.pointerId === lookId) { lookId = null; lookLast = null; } };
  on(canvas, 'pointerup', lend); on(canvas, 'pointercancel', lend); on(canvas, 'lostpointercapture', lend);
  on(root, 'touchmove', e => { if (isPlaying()) e.preventDefault(); }, { passive: false });
  on(root, 'contextmenu', e => e.preventDefault());
  return {
    st, reset, touchBtn, setSprintTouch(v) { touchBtn.sprint = v; },
    pollMove() { let f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) + st.fwd, s = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + st.str; const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; } return { f, s, sprint: keys.has('shift') || touchBtn.sprint, jump: st.jump }; },
    takeLook() { const r = { yaw: st.yawD, pitch: st.pitchD }; st.yawD = 0; st.pitchD = 0; return r; },
    consumeJump() { st.jump = false; },
    get locked() { return locked; }, releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); },
    destroy() { reset(); this.releaseLock(); cleanups.forEach(f => f()); },
  };
}
