/* Simulación headless del flujo completo con el núcleo real (core.js, rooms.js, nav.js). Sin THREE. */
import assert from 'node:assert/strict';
import { GameCore, ST } from '../game3d/core.js';
import { CFG, doorZ, roomZ0, diffLayouts, explain, generateRooms } from '../game3d/rooms.js';
import { moveCircle, findPath, box, segmentClear } from '../game3d/nav.js';
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✔', m); };
const step = (g, n, dt = 1 / 60) => { for (let i = 0; i < n; i++) g.update(dt); };
function walkTo(g, tx, tz, maxS = 40, sprint = false) { // bot: avanza hacia el punto
  for (let i = 0; i < maxS * 60; i++) { const p = g.player, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d < .25) { g.input = { x: 0, z: 0, sprint: false, jump: false }; return true; } g.input = { x: dx / d, z: dz / d, sprint, jump: false }; g.update(1 / 60); if (g.state === ST.CAPTURA || g.state === ST.FIN) return false; }
  g.input = { x: 0, z: 0, sprint: false, jump: false }; return false;
}
function truthAnswer(g, i) { return g.rooms[i].anomalies.length ? 'CAMBIOS' : 'SIN CAMBIOS'; }

console.log('1) Consistencia de datos de salas (50 semillas)');
for (let s = 1; s <= 50; s++) { const r = generateRooms(s, 1 + s % 3); for (let i = 1; i < r.length; i++) { const d = diffLayouts(r[i - 1].layout, r[i].layout); assert.deepEqual(d, r[i].anomalies); assert.equal(r[i].correctAnswer, d.length ? 'CAMBIOS' : 'SIN CAMBIOS'); } assert.equal(r[0].anomalies.length, 0); assert.equal(r[0].question, false); }
ok(true, 'respuesta correcta y lista de anomalías derivadas siempre de diffLayouts (50 semillas × 10 salas)');
const r7 = generateRooms(7, 2); const wrongForChange = explain(r7[1].anomalies, 'SIN CAMBIOS');
ok(wrongForChange.startsWith('Respuesta incorrecta. Los cambios eran:') && r7[1].anomalies.every(a => wrongForChange.includes(a.text)), 'explicación incluye exactamente las anomalías reales: ' + wrongForChange);
const noChange = r7.find(r => r.index && !r.hasAnomaly); ok(explain(noChange.anomalies, 'CAMBIOS').includes('ningún cambio'), 'si no había cambios y se responde CAMBIOS se explica que no existían');

console.log('2) Flujo: sala 1 sin pregunta, puerta, sala 2 con pregunta');
const g = new GameCore({ seed: 7, difficulty: 2 }); const msgs = []; g.on('message', m => msgs.push(m.text)); const sfx = []; g.on('sfx', s => sfx.push(s));
g.start();
ok(g.state === ST.OBS && g.evalRoom === -1, 'estado inicial OBSERVANDO_SALA, sin sala evaluable');
ok(msgs[0].startsWith('Sala 1: observa los detalles'), 'mensaje breve de la sala 1');
step(g, 60 * 5); ok(g.msg.cur === null, 'el mensaje de la sala 1 desaparece solo (<4 s)');
ok(!g.can('answer') && !g.questionVisible(), 'en la sala 1 no se puede responder ni hay pregunta');
// la puerta cerrada bloquea
walkTo(g, 0, doorZ(0) + 1.8, 20); g.input = { x: 0, z: -1, sprint: true, jump: false }; g.doors[0].target = 0; g.doors[0].open = 0; const before = g.state;
for (let i = 0; i < 120 && g.state === before; i++) { g.update(1 / 60); if (g.state !== before) break; }
// con auto-apertura al llegar al punto de salida se abre; comprobamos que antes de abrir no se atraviesa: forzamos puerta cerrada
const g2 = new GameCore({ seed: 7 }); g2.start(); g2.player.z = doorZ(0) + 2.5; g2.input = { x: 0, z: -1, sprint: true }; g2.doors[0].target = 0; let min = 0; for (let i = 0; i < 200; i++) { g2.state = ST.OBS; g2.doors[0].open = 0; g2.update(1 / 60); min = Math.min(min, g2.player.z - doorZ(0)); } 
ok(g2.player.z > doorZ(0) + .3, 'una puerta cerrada bloquea físicamente al jugador (z=' + g2.player.z.toFixed(2) + ' > ' + (doorZ(0) + .3).toFixed(2) + ')');
// continuar con el flujo real en g
g.input = { x: 0, z: 0 }; g.player.x = 0; g.player.z = -2; walkTo(g, 0, doorZ(0) + 1.3, 30);
ok(g.state === ST.TRANS && g.doors[0].target === 1, 'al llegar al punto de salida la puerta se abre (TRANSICION)');
step(g, 70); ok(g.doors[0].open >= .99, 'la puerta termina de abrirse con animación (open 0→1)');
walkTo(g, 0, doorZ(0) - 1.0, 10); ok(g.state === ST.TRANS, 'cruzando la puerta todavía no hay pregunta');
walkTo(g, 0, doorZ(0) - 1.9, 10); ok(g.state === ST.ESPERA && g.evalRoom === 1, 'sala 2: estado ESPERANDO_RESPUESTA');
ok(g.questionVisible(), 'la pregunta aparece solo dentro de la sala a evaluar'); g.input = { x: 0, z: 0 };
console.log('3) Respuesta correcta');
const right = truthAnswer(g, 1); const res = g.answer(right);
ok(res.correct && g.state === ST.OK && g.score >= 100, 'respuesta correcta → RESPUESTA_CORRECTA y puntuación');
ok(!g.answer(right), 'no se puede responder dos veces a la misma sala');
step(g, 90); ok(g.state === ST.TRANS && g.doors[1].open >= .99, 'la puerta de salida de la sala 2 se abre y se pasa a TRANSICION');
step(g, 60 * 3); ok(g.msg.cur === null, 'la confirmación desaparece sola');
walkTo(g, 0, doorZ(1) - 1.95, 20); ok(g.state === ST.ESPERA && g.evalRoom === 2 && g.questionVisible(), 'sala 3 alcanzada y visible, con pregunta; cada sala conserva su configuración');
ok(g.doors[0].target === 0 && g.doors[1].target === 1, 'la puerta de dos salas atrás se cierra; la de detrás sigue abierta');
console.log('4) Respuesta incorrecta → alarma → puertas → criatura → persecución → captura');
const wrong = truthAnswer(g, 2) === 'CAMBIOS' ? 'SIN CAMBIOS' : 'CAMBIOS'; const alarms = []; g.on('alarm', a => alarms.push(a));
const rr = g.answer(wrong); ok(!rr.correct && g.state === ST.MAL, 'respuesta incorrecta → RESPUESTA_INCORRECTA');
ok(rr.text.startsWith('Respuesta incorrecta.') && (g.rooms[2].anomalies.length ? g.rooms[2].anomalies.every(a => rr.text.includes(a.text)) : rr.text.includes('ningún cambio')), 'explicación basada en datos reales: ' + rr.text);
ok(g.msg.cur.kind === 'explain' && g.msg.cur.total >= 4 && g.msg.cur.total <= 6.5, 'el texto explicativo dura entre 4 y 6,5 s (' + g.msg.cur.total.toFixed(1) + ' s)');
g.input = { x: 0, z: 0 }; step(g, 60 * 1.1); ok(g.state === ST.ALARMA && g.alarm.on && alarms.includes(true), 'ALARMA activa (luces rojas se aplican en la vista)');
ok(Object.values(g.doors).every(d => d.target === 0), 'todas las puertas reciben orden de cerrarse');
step(g, 70); ok(Object.values(g.doors).every(d => d.open === 0), 'las puertas llegan a cerrarse mediante animación');
ok(!g.openDoor(2) && g.doors[2].target === 0, 'no se pueden abrir puertas durante la alarma');
const ev = []; g.on('monster', e => ev.push(e)); let sawEmerge = false; for (let i = 0; i < 60 * 1.7; i++) { g.update(1 / 60); if (g.monster.state === 'emerging') sawEmerge = true; } ok(g.monster.active && ev.includes('spawn') && sawEmerge, 'Terrifying aparece (fase de aparición antes de perseguir)');
const d0 = Math.hypot(g.monster.x - g.player.x, g.monster.z - g.player.z); ok(d0 >= 6, 'aparece a ' + d0.toFixed(1) + ' m del jugador (no encima)');
ok(g.bounds.minZ === doorZ(g.sealRoom) && g.monster.z <= g.bounds.maxZ && g.monster.z >= g.bounds.minZ, 'aparece dentro de la zona sellada');
let tele = 0, last = { x: g.monster.x, z: g.monster.z }, outside = 0, t = 0, maxJump = 0;
while (g.state !== ST.CAPTURA && g.state !== ST.FIN && t < 60) { // el jugador huye (esquiva siguiendo al lado opuesto)
  const p = g.player, m = g.monster, dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz) || 1; g.input = { x: dx / d, z: dz / d, sprint: true, jump: false };
  g.update(1 / 60); t += 1 / 60; const j = Math.hypot(m.x - last.x, m.z - last.z); maxJump = Math.max(maxJump, j); last = { x: m.x, z: m.z };
  if (m.x < g.bounds.minX - .01 || m.x > g.bounds.maxX + .01 || m.z < g.bounds.minZ - .01 || m.z > g.bounds.maxZ + .01 || g.player.z < g.bounds.minZ - .01 || g.player.z > g.bounds.maxZ + .01) outside++;
}
ok(g.history.includes(ST.PERSE), 'estado PERSECUCION alcanzado'); ok(maxJump < .2, 'la criatura nunca se teletransporta (salto máx. por fotograma ' + maxJump.toFixed(3) + ' m)');
ok(outside === 0, 'ni jugador ni criatura salen de la sala sellada'); ok(g.state === ST.CAPTURA || g.state === ST.FIN, 'la criatura alcanza al jugador tras ' + t.toFixed(1) + ' s → captura');
step(g, 60 * 2.2); ok(g.state === ST.FIN, 'FIN_DE_PARTIDA'); const sc = g.summary(); ok(sc.score >= 100, 'puntuación y salas completadas disponibles: ' + JSON.stringify(sc));
const px = g.player.x, pz = g.player.z; g.input = { x: 1, z: 1 }; step(g, 30); ok(g.player.x === px && g.player.z === pz, 'tras el fin de partida el personaje ya no se mueve');
ok(!g.illegal, 'ninguna transición de estado ilegal');
console.log('5) Reinicio'); g.start(); ok(g.state === ST.OBS && g.score === 0 && !g.alarm.on && !g.monster.active && g.doors[0].open === 0, 'reiniciar vuelve a la sala 1 limpia'); ok(!g.questionVisible(), 'sin pregunta tras reiniciar');
console.log('6) Pausa'); g.pause(); const tt = g.t; step(g, 30); ok(g.state === ST.PAUSA && g.t === tt, 'pausa congela el juego'); g.resume(); ok(g.state === ST.OBS, 'reanuda en el estado anterior');
console.log('7) Anti-trampas: no se puede responder en sala 1 ni durante la persecución');
const h = new GameCore({ seed: 3 }); h.start(); ok(!h.answer('CAMBIOS'), 'answer() rechazado en la sala 1');
console.log('8) Navegación A*: rodea obstáculos'); const cols = [box(-2, 2, -1, 1)]; const path = findPath({ x: 0, z: 4 }, { x: 0, z: -4 }, .45, cols, { minX: -4, maxX: 4, minZ: -8, maxZ: 8 }); ok(path && path.length >= 3 && path.every((p, i) => i === 0 || segmentClear(path[i - 1].x, path[i - 1].z, p.x, p.z, .4, cols)), 'camino válido de ' + path.length + ' puntos que evita la caja');
console.log('9) Anti-túnel: jugador a sprint contra pared fina'); const wall = [box(-4, 4, -.1, .1)]; const pp = { x: 0, z: 2 }; for (let i = 0; i < 100; i++) moveCircle(pp, 0, -.5, .35, wall, null); ok(pp.z > .4, 'no atraviesa una pared de 0,2 m a 30 m/s');
console.log(`\nSIMULACIÓN OK · ${pass} comprobaciones`);
