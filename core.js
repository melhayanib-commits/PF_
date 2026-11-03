/* Núcleo del juego: estados, puertas, jugador, persecución, mensajes. Sin THREE ni DOM => se prueba en Node. */
import { CFG, roomZ0, doorZ, generateRooms, itemFootprints, roomExplain } from './rooms.js';
import { box, moveCircle, resolveCircle, findPath, segmentClear, circleHits, clamp, lerpAngle, wrapAngle } from './nav.js';

export const ST = { INICIO: 'INICIO', OBS: 'OBSERVANDO_SALA', TRANS: 'TRANSICION', ESPERA: 'ESPERANDO_RESPUESTA', OK: 'RESPUESTA_CORRECTA', MAL: 'RESPUESTA_INCORRECTA', ALARMA: 'ALARMA', PERSE: 'PERSECUCION', CAPTURA: 'CAPTURA', FIN: 'FIN_DE_PARTIDA', VICTORIA: 'VICTORIA', PAUSA: 'PAUSA' };
const NEXT = {
  INICIO: ['OBSERVANDO_SALA'], OBSERVANDO_SALA: ['TRANSICION', 'PAUSA'], TRANSICION: ['ESPERANDO_RESPUESTA', 'PAUSA'],
  ESPERANDO_RESPUESTA: ['RESPUESTA_CORRECTA', 'RESPUESTA_INCORRECTA', 'PAUSA'], RESPUESTA_CORRECTA: ['TRANSICION', 'VICTORIA', 'PAUSA'],
  RESPUESTA_INCORRECTA: ['ALARMA', 'PAUSA'], ALARMA: ['PERSECUCION', 'PAUSA'], PERSECUCION: ['CAPTURA', 'PAUSA'],
  CAPTURA: ['FIN_DE_PARTIDA'], FIN_DE_PARTIDA: ['INICIO'], VICTORIA: ['INICIO'], PAUSA: [],
};
const MOVE_OK = new Set([ST.OBS, ST.TRANS, ST.ESPERA, ST.OK, ST.MAL, ST.ALARMA, ST.PERSE]);
export const P = { WALK: 3.3, SPRINT: 5.9, R: .35, JUMP: 5.2, G: 13 };
const M = { R: .5, V0: [3.4, 3.9, 4.4], RAMP: .12, VMAX: 6.6, EMERGE: 1.3, CAPTURE: .95 };

export class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] ||= []).push(f); return this; } emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } }

export function messageDuration(text, kind) {
  if (kind === 'explain') return Math.min(6500, Math.max(4200, 3000 + text.length * 38));
  return Math.min(4000, 2200 + Math.max(0, text.length - 30) * 30);
}
export class MessageCenter { // un único mensaje activo: el nuevo sustituye al anterior
  constructor(emit) { this.cur = null; this.emit = emit; this.seq = 0; }
  show(text, kind = 'info', ms) { const d = (ms ?? messageDuration(text, kind)) / 1000; this.cur = { id: ++this.seq, text, kind, left: d, total: d }; this.emit('message', this.cur); }
  clear() { if (this.cur) { this.cur = null; this.emit('messageEnd'); } }
  update(dt) { if (!this.cur) return; this.cur.left -= dt; if (this.cur.left <= 0) { this.cur = null; this.emit('messageEnd'); } }
}

export class GameCore extends Emitter {
  constructor({ seed = Date.now(), difficulty = 2, total = CFG.TOTAL_ROOMS } = {}) {
    super(); this.total = total; this.difficulty = difficulty; this.seed = seed; this.msg = new MessageCenter((e, m) => this.emit(e, m)); this.reset(seed);
  }
  reset(seed = Date.now()) {
    this.seed = seed; this.rooms = generateRooms(seed, this.difficulty, this.total); this.state = ST.INICIO; this.prevState = null; this.history = [ST.INICIO];
    this.t = 0; this.score = 0; this.completed = 0; this.curRoom = 0; this.evalRoom = -1; this.answered = {}; this.alarm = { on: false, t: 0 }; this.alarmT = 0; this.cine = null; this.winT = 0; this.capT = 0;
    this.player = { x: 0, z: -2.2, y: 0, vy: 0, onGround: true, yaw: Math.PI, moving: false, sprinting: false, stamina: 1, tired: false, r: P.R };
    this.monster = { active: false, x: 0, z: 0, yaw: 0, state: 'none', t: 0, speed: 0, moving: false, path: null, repath: 0, stuck: 0, lastX: 0, lastZ: 0 };
    this.doors = {}; for (let k = -1; k < this.total; k++) this.doors[k] = { k, z: doorZ(k), open: 0, target: 0 };
    this.bounds = { minX: -CFG.HALF, maxX: CFG.HALF, minZ: doorZ(this.total - 1), maxZ: 0 }; this.sealRoom = -1; this.msg.cur = null;
    this.buildColliders();
  }
  /* ---------- colisiones ---------- */
  buildColliders() {
    const cols = [], Z = doorZ(this.total - 1), hw = CFG.DOOR_W / 2;
    cols.push(box(-5, -CFG.HALF, Z - 1, 1, { tag: 'wall' }), box(CFG.HALF, 5, Z - 1, 1, { tag: 'wall' }));
    for (let k = -1; k < this.total; k++) {
      const z = doorZ(k), d = this.doors[k];
      cols.push(box(-5, -hw, z - .2, z + .2, { tag: 'wall' }), box(hw, 5, z - .2, z + .2, { tag: 'wall' }));
      cols.push(box(-hw - .05, hw + .05, z - .35, z + .35, { tag: 'door', active: () => !(d.open >= .85 && d.target === 1) }));
    }
    this.furniture = [];
    for (const r of this.rooms) for (const f of itemFootprints(r.layout, r.index)) { const c = box(f.minX, f.maxX, f.minZ, f.maxZ, { tag: 'item:' + f.id, h: f.h, cam: f.h >= 1.4 }); cols.push(c); this.furniture.push({ room: r.index, id: f.id, c }); }
    this.cols = cols;
  }
  /* ---------- estados ---------- */
  can(action) {
    const s = this.state;
    if (action === 'move') return MOVE_OK.has(s) && !this.capturing();
    if (action === 'answer') return s === ST.ESPERA && this.questionVisible();
    if (action === 'openDoor') return s === ST.OBS || s === ST.ESPERA;
    if (action === 'pause') return [ST.OBS, ST.TRANS, ST.ESPERA, ST.OK, ST.MAL, ST.ALARMA, ST.PERSE].includes(s);
    return false;
  }
  capturing() { return this.state === ST.CAPTURA || this.state === ST.FIN || this.state === ST.VICTORIA; }
  go(next) {
    if (!NEXT[this.state] || !NEXT[this.state].includes(next)) { this.illegal = `${this.state} -> ${next}`; return false; }
    const old = this.state; this.state = next; this.history.push(next); this.emit('state', next, old); return true;
  }
  pause() { if (!this.can('pause')) return false; this.prevState = this.state; this.state = ST.PAUSA; this.history.push(ST.PAUSA); this.emit('state', ST.PAUSA, this.prevState); return true; }
  resume() { if (this.state !== ST.PAUSA) return false; const s = this.prevState; this.state = s; this.history.push(s); this.emit('state', s, ST.PAUSA); return true; }
  start() {
    if (this.state !== ST.INICIO) this.reset(Date.now());
    this.go(ST.OBS); this.emit('needRoom', 0); this.emit('needRoom', 1);
    this.msg.show('Sala 1: observa los detalles y memoriza esta habitación. Todavía no hay ninguna pregunta.', 'info');
  }
  roomAt(z) { return clamp(Math.floor(-z / CFG.D), 0, this.total - 1); }
  questionVisible() { const p = this.player; return this.state === ST.ESPERA && this.evalRoom >= 1 && !this.answered[this.evalRoom] && this.roomAt(p.z) === this.evalRoom && (roomZ0(this.evalRoom) - p.z) > 1.2; }
  /* ---------- puertas ---------- */
  openDoor(k) { const d = this.doors[k]; if (!d || this.alarm.on || [ST.ALARMA, ST.PERSE, ST.CAPTURA, ST.FIN].includes(this.state)) return false; d.target = 1; this.emit('door', k, 1); this.emit('sfx', 'door'); return true; }
  closeDoor(k, silent) { const d = this.doors[k]; if (!d || d.target === 0) return; d.target = 0; this.emit('door', k, 0); if (!silent) this.emit('sfx', 'door'); }
  interact() {
    if (!this.can('openDoor')) return false;
    if (this.state === ST.OBS) { const d = this.doors[0], p = this.player; if (Math.abs(p.x) < 2.4 && p.z - d.z < 3.4) { this.openDoor(0); this.go(ST.TRANS); return true; } this.msg.show('Acércate a la puerta de salida para abrirla.', 'info', 2000); return false; }
    if (this.state === ST.ESPERA) { this.msg.show('Responde primero: CAMBIOS o SIN CAMBIOS.', 'info', 2000); }
    return false;
  }
  /* ---------- respuesta ---------- */
  answer(a) {
    if (!this.can('answer')) return false;
    const i = this.evalRoom, room = this.rooms[i]; if (this.answered[i]) return false; this.answered[i] = true;
    const text = roomExplain(room, a), correct = text === 'Respuesta correcta.';
    if (correct) {
      this.score += 100 + (room.hasAnomaly ? 50 : 0); this.completed = i; this.emit('score', this.score); this.msg.show('Respuesta correcta', 'ok', 2000); this.emit('sfx', 'ok'); this.go(ST.OK);
      if (i >= this.total - 1) { this.winT = 0; } else this.openDoor(i);
    } else {
      this.go(ST.MAL); this.alarmT = 0; this.msg.show(text, 'explain'); this.emit('sfx', 'wrong');
    }
    return { correct, text };
  }
  /* ---------- bucle ---------- */
  update(dt) {
    if (this.state === ST.PAUSA || this.state === ST.INICIO || this.state === ST.FIN) return;
    dt = Math.min(dt, .05); this.t += dt; this.msg.update(dt);
    for (const d of Object.values(this.doors)) if (d.open !== d.target) { d.open = clamp(d.open + Math.sign(d.target - d.open) * dt / 1.0, 0, 1); }
    this.updatePlayer(dt);
    const s = this.state, p = this.player;
    if (s === ST.OBS) { const d = this.doors[0]; if (Math.abs(p.x) < 1.1 && p.z - d.z < 1.5) { this.openDoor(0); this.go(ST.TRANS); } }
    else if ((s === ST.TRANS) && this.crossed()) this.enterRoom(this.curRoom + 1);
    else if (s === ST.OK) {
      if (this.evalRoom >= this.total - 1) { this.winT += dt; if (this.winT > 1.6) { this.go(ST.VICTORIA); this.emit('end', { won: true, score: this.score, rooms: this.total }); } }
      else if (this.doors[this.evalRoom].open >= .85) this.go(ST.TRANS);
    } else if (s === ST.MAL || s === ST.ALARMA) this.updateAlarm(dt);
    else if (s === ST.PERSE) { this.updateMonster(dt); }
    else if (s === ST.CAPTURA) { this.capT += dt; this.monster.moving = false; if (this.capT > 2.0) { this.go(ST.FIN); this.emit('end', { won: false, score: this.score, rooms: this.completed }); } }
    if (this.state === ST.ALARMA && this.monster.active) this.updateMonster(dt, true);
    if (this.cine && this.alarmT > this.cine.until) this.cine = null;
  }
  crossed() { const k = this.curRoom; return this.player.z < doorZ(k) - 1.5 && this.doors[k].open > .5; }
  enterRoom(i) {
    this.curRoom = i; this.evalRoom = i; this.emit('needRoom', i + 1);
    if (i >= 2) this.closeDoor(i - 2, true);
    this.go(ST.ESPERA); this.msg.show('¿Ha cambiado algo respecto a la sala anterior?', 'info', 2600); this.emit('enterRoom', i);
  }
  /* ---------- jugador ---------- */
  updatePlayer(dt) {
    const p = this.player, inp = this.input || { x: 0, z: 0, sprint: false, jump: false };
    p.moving = false; p.sprinting = false;
    if (this.can('move')) {
      const mag = Math.hypot(inp.x, inp.z);
      if (mag > .08) {
        const nx = inp.x / Math.max(1, mag), nz = inp.z / Math.max(1, mag), len = Math.min(1, mag);
        const wantSprint = inp.sprint && !p.tired && p.stamina > 0; p.sprinting = wantSprint;
        const v = (wantSprint ? P.SPRINT : P.WALK) * len;
        moveCircle(p, nx * v * dt, nz * v * dt, p.r, this.cols, this.bounds, p.y);
        p.yaw = lerpAngle(p.yaw, Math.atan2(nx, nz), 1 - Math.exp(-14 * dt)); p.moving = true; p.speed = v;
      }
      if (inp.jump && p.onGround) { p.vy = P.JUMP; p.onGround = false; this.emit('sfx', 'jump'); }
    }
    if (p.sprinting) { p.stamina = Math.max(0, p.stamina - dt / 3.6); if (p.stamina <= 0) p.tired = true; } else { p.stamina = Math.min(1, p.stamina + dt / 5); if (p.tired && p.stamina > .3) p.tired = false; }
    p.vy -= P.G * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    resolveCircle(p, p.r, this.cols, p.y);
  }
  /* ---------- alarma ---------- */
  updateAlarm(dt) {
    this.alarmT += dt;
    if (this.state === ST.MAL && this.alarmT >= .9) {
      this.go(ST.ALARMA); this.alarm.on = true; this.sealRoom = this.roomAt(this.player.z);
      for (const d of Object.values(this.doors)) if (d.target !== 0 || d.open > 0) { d.target = 0; this.emit('door', d.k, 0); }
      const z0 = roomZ0(this.sealRoom), z1 = doorZ(this.sealRoom);
      this.bounds = { minX: -CFG.HALF, maxX: CFG.HALF, minZ: z1, maxZ: z0 }; this.emit('alarm', true); this.emit('sfx', 'alarm');
    }
    if (this.state === ST.ALARMA && !this.monster.active && this.alarmT >= 2.4) this.spawnMonster();
    if (this.state === ST.ALARMA && this.monster.active && this.monster.state === 'chasing') { this.go(ST.PERSE); }
  }
  spawnMonster() {
    const p = this.player, b = this.bounds, m = this.monster; let best = null;
    for (let z = b.minZ + 1.2; z <= b.maxZ - 1.2; z += 1.2) for (const x of [-2.6, 0, 2.6]) {
      if (circleHits(x, z, .9, this.cols)) continue; const d = Math.hypot(x - p.x, z - p.z);
      const los = segmentClear(p.x, p.z, x, z, .3, this.cols), score = d + (los ? 6 : 0); if (d < 6) continue;
      if (!best || score > best.score) best = { x, z, score, d };
    }
    if (!best) { for (let z = b.minZ + 1; z <= b.maxZ - 1; z += 1) for (const x of [-2.5, 0, 2.5]) { if (circleHits(x, z, .8, this.cols)) continue; const d = Math.hypot(x - p.x, z - p.z); if (!best || d > best.d) best = { x, z, d }; } }
    Object.assign(m, { active: true, x: best.x, z: best.z, state: 'emerging', t: 0, yaw: Math.atan2(p.x - best.x, p.z - best.z), speed: 0, path: null, repath: 0, stuck: 0, lastX: best.x, lastZ: best.z, chaseT: 0 });
    this.cine = { until: this.alarmT + 2.1 }; this.msg.show('¡La criatura te persigue!', 'alert', 2600); this.emit('sfx', 'spawn'); this.emit('monster', 'spawn');
  }
  updateMonster(dt, onlyEmerge) {
    const m = this.monster, p = this.player; if (!m.active) return; m.t += dt;
    if (m.state === 'emerging') { m.moving = false; m.yaw = lerpAngle(m.yaw, Math.atan2(p.x - m.x, p.z - m.z), 1 - Math.exp(-6 * dt)); if (m.t >= M.EMERGE) { m.state = 'chasing'; m.chaseT = 0; } return; }
    if (onlyEmerge) return;
    m.chaseT += dt; const v0 = M.V0[this.difficulty - 1] || M.V0[1]; m.speed = Math.min(M.VMAX, v0 + M.RAMP * m.chaseT);
    m.repath -= dt;
    const dist = Math.hypot(p.x - m.x, p.z - m.z), direct = segmentClear(m.x, m.z, p.x, p.z, M.R, this.cols);
    let tx = p.x, tz = p.z;
    if (!direct) {
      if (m.repath <= 0 || !m.path) { m.path = findPath({ x: m.x, z: m.z }, { x: p.x, z: p.z }, M.R * .92, this.cols, this.bounds); m.repath = .25; }
      if (m.path) { while (m.path.length > 1 && Math.hypot(m.path[1].x - m.x, m.path[1].z - m.z) < .45) m.path.shift(); const w = m.path[1] || m.path[0]; tx = w.x; tz = w.z; }
    } else m.path = null;
    const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz) || 1;
    moveCircle(m, dx / d * m.speed * dt, dz / d * m.speed * dt, M.R, this.cols, this.bounds);
    m.yaw = lerpAngle(m.yaw, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt)); m.moving = true;
    m.stuck = Math.hypot(m.x - m.lastX, m.z - m.lastZ) < m.speed * dt * .15 ? m.stuck + dt : 0; m.lastX = m.x; m.lastZ = m.z;
    if (m.stuck > .5) { m.repath = 0; m.path = null; m.stuck = 0; }
    if (dist <= M.CAPTURE && (dist < .7 || segmentClear(m.x, m.z, p.x, p.z, .15, this.cols.filter(c => c.tag !== 'item:wetSign')))) this.capture();
  }
  capture() {
    if (this.state !== ST.PERSE) return; this.go(ST.CAPTURA); this.capT = 0; this.monster.moving = false; this.msg.show('Has sido atrapado', 'alert', 2600); this.emit('sfx', 'capture');
  }
  summary() { return { state: this.state, room: this.curRoom, score: this.score, completed: this.completed }; }
}
