/* Datos de las salas, registro de anomalías y explicaciones. Sin THREE: se prueba en Node.
   La respuesta correcta y la explicación se derivan SIEMPRE de diffLayouts(anterior, actual). */
export const CFG = { W: 8, D: 16, HALF: 4, DOOR_W: 2.6, WALL_T: .4, TOTAL_ROOMS: 10 };
export const roomZ0 = i => -i * CFG.D;          // plano de entrada de la sala i
export const doorZ = i => -(i + 1) * CFG.D;     // plano de la puerta de salida de la sala i (= entrada de i+1)

export function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* Ranuras (posición local: x, z negativo hacia el fondo; wall L/R/C; rot = giro Y del objeto) */
const S = (id, x, z, wall, desc) => ({ id, x, z, wall, desc });
export const SLOTS = {
  'pL-4': S('pL-4', -3.97, -4, 'L', 'en la pared izquierda, cerca de la entrada'), 'pL-9': S('pL-9', -3.97, -9.2, 'L', 'en la pared izquierda, hacia el centro'),
  'pR-5': S('pR-5', 3.97, -5, 'R', 'en la pared derecha, cerca de la entrada'), 'pR-10': S('pR-10', 3.97, -10.2, 'R', 'en la pared derecha, hacia el fondo'),
  'pL-12.5': S('pL-12.5', -3.97, -12.6, 'L', 'en la pared izquierda, junto a la puerta de salida'), 'pL-1.8': S('pL-1.8', -3.97, -1.8, 'L', 'en la pared izquierda, junto a la entrada'),
  'bL-6': S('bL-6', -3.35, -6.2, 'L', 'en la pared izquierda, a media sala'), 'bL-10': S('bL-10', -3.35, -10.4, 'L', 'en la pared izquierda, hacia el fondo'),
  'bR-4': S('bR-4', 3.35, -4.2, 'R', 'en la pared derecha, cerca de la entrada'), 'bR-9': S('bR-9', 3.35, -9, 'R', 'en la pared derecha, a media sala'),
  'tL-2.5': S('tL-2.5', -3.5, -2.4, 'L', 'junto a la entrada, a la izquierda'), 'tL-13.5': S('tL-13.5', -3.5, -13.6, 'L', 'junto a la puerta de salida, a la izquierda'), 'tL-7.5': S('tL-7.5', -3.5, -8, 'L', 'en la pared izquierda, a media sala'),
  'tR-2.5': S('tR-2.5', 3.5, -2.4, 'R', 'junto a la entrada, a la derecha'), 'tR-13.5': S('tR-13.5', 3.5, -13.6, 'R', 'junto a la puerta de salida, a la derecha'), 'tR-7': S('tR-7', 3.5, -7, 'R', 'en la pared derecha, a media sala'),
  'vR-8': S('vR-8', 3.4, -8, 'R', 'en la pared derecha, a media sala'), 'vR-13': S('vR-13', 3.4, -12.6, 'R', 'en la pared derecha, hacia el fondo'),
  'mL-3.5': S('mL-3.5', -3.45, -3.6, 'L', 'en la pared izquierda, cerca de la entrada'), 'mL-12': S('mL-12', -3.45, -12.2, 'L', 'en la pared izquierda, hacia el fondo'),
  'eR-14.6': S('eR-14.6', 3.93, -14.7, 'R', 'junto a la puerta de salida'), 'eL-1.3': S('eL-1.3', -3.93, -1.4, 'L', 'junto a la entrada'),
  'fs-a': S('fs-a', 1.5, -6.5, 'C', 'a la derecha del pasillo central'), 'fs-b': S('fs-b', -1.4, -11, 'C', 'a la izquierda del pasillo central'),
};

/* Definición de objetos. fp = huella de colisión (ancho a lo largo de z, fondo hacia x) y altura h. */
export const ITEMS = {
  posterA: { kind: 'poster', label: 'el cartel grande de la pared izquierda', slots: ['pL-4', 'pL-9'], variants: ['azul', 'rojo', 'verde', 'naranja'], optional: true, lvl: 2 },
  posterB: { kind: 'poster', label: 'el cartel de la pared derecha', slots: ['pR-5', 'pR-10'], variants: ['azul', 'rojo', 'verde', 'naranja'], optional: true, lvl: 2 },
  posterC: { kind: 'poster', label: 'el cartel pequeño de la pared izquierda', slots: ['pL-12.5', 'pL-1.8'], variants: ['azul', 'rojo', 'verde', 'naranja'], optional: true, lvl: 1 },
  bench1: { kind: 'bench', label: 'el banco izquierdo', slots: ['bL-6', 'bL-10'], optional: true, lvl: 1, fp: { a: 1.0, b: .45, h: .55 } },
  bench2: { kind: 'bench', label: 'el banco derecho', slots: ['bR-4', 'bR-9'], optional: true, lvl: 1, fp: { a: 1.0, b: .45, h: .55 } },
  bin1: { kind: 'bin', label: 'la papelera de la izquierda', slots: ['tL-2.5', 'tL-13.5', 'tL-7.5'], optional: true, lvl: 1, fp: { a: .3, b: .3, h: .85 } },
  bin2: { kind: 'bin', label: 'la papelera de la derecha', slots: ['tR-2.5', 'tR-13.5', 'tR-7'], optional: true, lvl: 1, fp: { a: .3, b: .3, h: .85 } },
  vending: { kind: 'vending', label: 'la máquina expendedora', slots: ['vR-8', 'vR-13'], optional: true, lvl: 1, fp: { a: .6, b: .5, h: 1.95 } },
  ticket: { kind: 'ticket', label: 'la máquina de billetes', slots: ['mL-3.5', 'mL-12'], optional: true, lvl: 2, fp: { a: .45, b: .35, h: 1.5 } },
  extinguisher: { kind: 'extinguisher', label: 'el extintor', slots: ['eR-14.6', 'eL-1.3'], optional: true, lvl: 3 },
  wetSign: { kind: 'wetSign', label: 'el cartel amarillo de suelo mojado', slots: ['fs-a', 'fs-b'], optional: true, lvl: 2, fp: { a: .25, b: .25, h: .6 } },
  hangSign: { kind: 'hangSign', label: 'el rótulo colgado del techo', variants: ['ANDANA 4', 'ANDANA 7', 'ANDANA 2'], lvl: 3 },
  exitSign: { kind: 'exitSign', label: 'el letrero sobre la puerta de salida', variants: ['verde', 'rojo', 'azul'], lvl: 3 },
  clock: { kind: 'clock', label: 'el reloj de la pared del fondo', variants: ['las 3:10', 'las 9:25', 'las 6:40'], lvl: 3 },
};
const LAMP_NAMES = ['la lámpara izquierda cercana a la entrada', 'la lámpara derecha cercana a la entrada', 'la lámpara izquierda del centro', 'la lámpara derecha del centro', 'la lámpara izquierda del fondo', 'la lámpara derecha del fondo'];
export const LAMPS = [0, 1, 2, 3, 4, 5].map(i => ({ id: 'lamp' + i, x: i % 2 ? 1.55 : -1.55, z: -[3, 3, 8, 8, 13, 13][i], label: LAMP_NAMES[i] }));

export function baseLayout() {
  const items = {};
  for (const [id, d] of Object.entries(ITEMS)) items[id] = { present: true, slot: d.slots ? d.slots[0] : null, variant: d.variants ? 0 : null };
  for (const l of LAMPS) items[l.id] = { present: true, slot: null, variant: null };
  return { items };
}
export const cloneLayout = l => JSON.parse(JSON.stringify(l));
export const labelOf = id => ITEMS[id] ? ITEMS[id].label : LAMPS.find(l => l.id === id).label;

/* Diferencias reales entre dos configuraciones. Es la ÚNICA fuente de verdad de las anomalías. */
export function diffLayouts(prev, cur) {
  const out = [];
  for (const id of Object.keys(cur.items)) {
    const a = prev.items[id], b = cur.items[id], lamp = id.startsWith('lamp'), lab = labelOf(id), cap = lab[0].toUpperCase() + lab.slice(1);
    if (a.present !== b.present) {
      out.push({ item: id, type: b.present ? 'added' : 'removed', text: lamp ? (b.present ? `se ha encendido ${lab}` : `se ha apagado ${lab}`) : (b.present ? `ha aparecido ${lab}` : `ha desaparecido ${lab}`) });
    } else if (b.present && a.slot !== b.slot) {
      out.push({ item: id, type: 'moved', text: `${lab} ha cambiado de sitio y ahora está ${SLOTS[b.slot].desc}` });
    } else if (b.present && a.variant !== b.variant) {
      const v = ITEMS[id].variants;
      const t = ITEMS[id].kind === 'poster' ? `${lab} ha cambiado de color: antes era ${v[a.variant]} y ahora es ${v[b.variant]}`
        : ITEMS[id].kind === 'clock' ? `${lab} marcaba ${v[a.variant]} y ahora marca ${v[b.variant]}`
        : ITEMS[id].kind === 'hangSign' ? `${lab} decía «${v[a.variant]}» y ahora dice «${v[b.variant]}»`
        : `${lab} era ${v[a.variant]} y ahora es ${v[b.variant]}`;
      out.push({ item: id, type: 'variant', text: t });
    }
  }
  return out;
}

const joinEs = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
export function explain(anomalies, answer) {
  const truth = anomalies.length ? 'CAMBIOS' : 'SIN CAMBIOS';
  if (answer === truth) return 'Respuesta correcta.';
  if (!anomalies.length) return 'Respuesta incorrecta. En esta sala no había ningún cambio respecto a la anterior.';
  return `Respuesta incorrecta. Los cambios eran: ${joinEs(anomalies.map(a => a.text))}.`;
}

function mutate(layout, rnd, maxLvl, usedItems) {
  const cands = [];
  for (const [id, d] of Object.entries(ITEMS)) {
    if (usedItems.has(id) || d.lvl > maxLvl) continue; const it = layout.items[id];
    if (d.optional && it.present) cands.push({ id, op: 'remove' });
    if (d.optional && !it.present) cands.push({ id, op: 'add' });
    if (d.slots && it.present) cands.push({ id, op: 'move' });
    if (d.variants && it.present) cands.push({ id, op: 'variant' });
  }
  for (const l of LAMPS) if (!usedItems.has(l.id)) cands.push({ id: l.id, op: layout.items[l.id].present ? 'remove' : 'add' });
  // las anomalías «grandes» pesan más en salas tempranas
  const c = cands[Math.floor(rnd() * cands.length)]; const it = layout.items[c.id];
  if (c.op === 'remove') it.present = false; else if (c.op === 'add') it.present = true;
  else if (c.op === 'move') {
    const taken = occupiedSlots(layout, c.id), free = ITEMS[c.id].slots.filter(s => s !== it.slot && !taken.has(s) && !wallConflict(layout, c.id, s));
    if (!free.length) return false; it.slot = free[Math.floor(rnd() * free.length)];
  } else if (c.op === 'variant') { const n = ITEMS[c.id].variants.length; it.variant = (it.variant + 1 + Math.floor(rnd() * (n - 1))) % n; }
  if (c.op === 'add' && ITEMS[c.id]?.slots && wallConflict(layout, c.id, it.slot)) { it.present = false; return false; }
  usedItems.add(c.id); return true;
}
function occupiedSlots(layout, except) { const s = new Set(); for (const [id, it] of Object.entries(layout.items)) if (id !== except && it.present && it.slot) s.add(it.slot); return s; }
function wallConflict(layout, id, slot) { // dos objetos en la misma pared a menos de 1,9 m se solapan
  const me = SLOTS[slot]; if (me.wall === 'C') return false;
  for (const [oid, it] of Object.entries(layout.items)) { if (oid === id || !it.present || !it.slot) continue; const o = SLOTS[it.slot]; if (o.wall === me.wall && Math.abs(o.z - me.z) < 1.9) return true; }
  return false;
}

/** Genera la lista completa de salas (datos). La sala 0 es la referencia: sin pregunta. */
export function generateRooms(seed = Date.now(), difficulty = 2, total = CFG.TOTAL_ROOMS) {
  const rnd = mulberry32(seed), rooms = [], pAnom = [.5, .6, .65][difficulty - 1] || .6;
  let prev = baseLayout(); rooms.push({ index: 0, layout: prev, anomalies: [], hasAnomaly: false, correctAnswer: null, question: false });
  let noChangeStreak = 0;
  for (let i = 1; i < total; i++) {
    const cur = cloneLayout(prev); let want = rnd() < pAnom || noChangeStreak >= 2;
    if (want) {
      const tier = Math.min(3, 1 + Math.floor((i - 1) / 3)), n = tier === 1 ? 1 : tier === 2 ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 2);
      const used = new Set(); let tries = 0, made = 0;
      while (made < n && tries++ < 40) { if (mutate(cur, rnd, tier, used)) made++; }
    }
    const anomalies = diffLayouts(prev, cur), has = anomalies.length > 0;
    noChangeStreak = has ? 0 : noChangeStreak + 1;
    rooms.push({ index: i, layout: cur, anomalies, hasAnomaly: has, correctAnswer: has ? 'CAMBIOS' : 'SIN CAMBIOS', question: true });
    prev = cur;
  }
  return rooms;
}
export const roomExplain = (room, answer) => explain(room.anomalies, answer);

/* Cajas de colisión de los objetos de una sala (mundo). */
export function itemFootprints(layout, roomIndex) {
  const z0 = roomZ0(roomIndex), out = [];
  for (const [id, it] of Object.entries(layout.items)) {
    const d = ITEMS[id]; if (!d || !d.fp || !it.present) continue; const s = SLOTS[it.slot];
    const hx = s.wall === 'C' ? d.fp.b : d.fp.b, hz = d.fp.a;
    out.push({ id, minX: s.x - hx, maxX: s.x + hx, minZ: z0 + s.z - hz, maxZ: z0 + s.z + hz, h: d.fp.h });
  }
  return out;
}
