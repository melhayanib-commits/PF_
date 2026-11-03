/* Colisiones 2D (círculo contra cajas), navegación A* y utilidades. Sin dependencias: se prueba en Node. */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrapAngle = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * t;

/** Caja de colisión en coordenadas de mundo. active(): bool dinámico (puertas). h: altura (saltable si el actor está por encima). */
export function box(minX, maxX, minZ, maxZ, o = {}) {
  return { minX, maxX, minZ, maxZ, tag: o.tag || 'solid', h: o.h, cam: o.cam !== false, active: o.active || (() => true) };
}

export function resolveCircle(p, r, cols, y = 0) {
  for (let it = 0; it < 5; it++) {
    let moved = false;
    for (const c of cols) {
      if (!c.active() || (c.h !== undefined && y >= c.h - 0.05)) continue;
      const cx = clamp(p.x, c.minX, c.maxX), cz = clamp(p.z, c.minZ, c.maxZ);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-9) { const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push; }
        else {
          const l = p.x - c.minX, rr = c.maxX - p.x, t = p.z - c.minZ, b = c.maxZ - p.z, m = Math.min(l, rr, t, b);
          if (m === l) p.x = c.minX - r; else if (m === rr) p.x = c.maxX + r; else if (m === t) p.z = c.minZ - r; else p.z = c.maxZ + r;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
  return p;
}

/** Mueve un círculo en pasos pequeños para que nunca atraviese una caja (anti-túnel). bounds = región cerrada de seguridad. */
export function moveCircle(p, dx, dz, r, cols, bounds, y = 0) {
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / (r * 0.4)));
  for (let i = 0; i < steps; i++) {
    p.x += dx / steps; p.z += dz / steps;
    resolveCircle(p, r, cols, y);
    if (bounds) { p.x = clamp(p.x, bounds.minX + r, bounds.maxX - r); p.z = clamp(p.z, bounds.minZ + r, bounds.maxZ - r); }
  }
  return p;
}

export function circleHits(x, z, r, cols, y = 0) {
  for (const c of cols) {
    if (!c.active() || (c.h !== undefined && y >= c.h - 0.05)) continue;
    const cx = clamp(x, c.minX, c.maxX), cz = clamp(z, c.minZ, c.maxZ);
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
  }
  return false;
}

export function segmentClear(ax, az, bx, bz, r, cols, y = 0) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / (Math.max(r, .1) * 0.5)));
  for (let i = 0; i <= n; i++) { const t = i / n; if (circleHits(ax + (bx - ax) * t, az + (bz - az) * t, r, cols, y)) return false; }
  return true;
}

/** Distancia máxima de la cámara a lo largo de (ux,uz) desde (ox,oz) antes de chocar con una pared/puerta. */
export function cameraReach(ox, oz, ux, uz, maxD, cols, margin = 0.3) {
  const step = 0.1;
  for (let d = 0.4; d <= maxD; d += step) {
    const x = ox + ux * d, z = oz + uz * d;
    for (const c of cols) {
      if (!c.active() || !c.cam) continue;
      if (x > c.minX - margin && x < c.maxX + margin && z > c.minZ - margin && z < c.maxZ + margin) return Math.max(0.6, d - step);
    }
  }
  return maxD;
}

/** A* sobre rejilla. Devuelve lista de puntos {x,z} (suavizada) o null si no hay camino. */
export function findPath(from, to, r, cols, bounds, cell = 0.4) {
  const nx = Math.ceil((bounds.maxX - bounds.minX) / cell), nz = Math.ceil((bounds.maxZ - bounds.minZ) / cell);
  const cx = i => bounds.minX + (i + .5) * cell, cz = j => bounds.minZ + (j + .5) * cell;
  const toI = x => clamp(Math.floor((x - bounds.minX) / cell), 0, nx - 1), toJ = z => clamp(Math.floor((z - bounds.minZ) / cell), 0, nz - 1);
  const blocked = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = cx(i), z = cz(j);
    blocked[j * nx + i] = (x < bounds.minX + r || x > bounds.maxX - r || z < bounds.minZ + r || z > bounds.maxZ - r || circleHits(x, z, r, cols)) ? 1 : 0;
  }
  const si = toI(from.x), sj = toJ(from.z); let gi = toI(to.x), gj = toJ(to.z);
  blocked[sj * nx + si] = 0;
  if (blocked[gj * nx + gi]) { // objetivo en celda bloqueada: busca la libre más cercana
    let best = null, bd = 1e9;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (!blocked[j * nx + i]) { const d = (i - gi) ** 2 + (j - gj) ** 2; if (d < bd) { bd = d; best = [i, j]; } }
    if (!best) return null; [gi, gj] = best;
  }
  const g = new Float32Array(nx * nz).fill(1e9), par = new Int32Array(nx * nz).fill(-1), closed = new Uint8Array(nx * nz);
  const open = [[sj * nx + si, 0]]; g[sj * nx + si] = 0;
  const h = (i, j) => Math.hypot(i - gi, j - gj);
  const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][1] < open[bi][1]) bi = k;
    const [id] = open.splice(bi, 1)[0]; if (closed[id]) continue; closed[id] = 1;
    const i = id % nx, j = (id / nx) | 0;
    if (i === gi && j === gj) break;
    for (const [di, dj, w] of N8) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
      const nid = nj * nx + ni; if (blocked[nid] || closed[nid]) continue;
      if (di && dj && (blocked[j * nx + ni] || blocked[nj * nx + i])) continue; // sin cortar esquinas
      const ng = g[id] + w; if (ng < g[nid]) { g[nid] = ng; par[nid] = id; open.push([nid, ng + h(ni, nj)]); }
    }
  }
  const goal = gj * nx + gi; if (!closed[goal]) return null;
  const pts = []; for (let id = goal; id !== -1; id = par[id]) pts.push({ x: cx(id % nx), z: cz((id / nx) | 0) });
  pts.reverse(); pts[0] = { x: from.x, z: from.z };
  // suavizado por visibilidad
  const out = [pts[0]]; let k = 0;
  while (k < pts.length - 1) {
    let far = pts.length - 1;
    while (far > k + 1 && !segmentClear(pts[k].x, pts[k].z, pts[far].x, pts[far].z, r * 0.98, cols)) far--;
    out.push(pts[far]); k = far;
  }
  return out;
}
