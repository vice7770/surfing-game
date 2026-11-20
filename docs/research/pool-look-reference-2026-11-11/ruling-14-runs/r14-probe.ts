/**
 * pool-look-reference (2026-11-11), ruling 13's step 1: the straight Barrel at the reference size (`?poolSize=ref`) against
 * today's 1.8 m Barrel, solver only (no riders, no tube library). pool-barrel-straight's frame probe
 * (docs/research/pool-barrel-straight-2026-11-01/frame-probe.ts; its header explains the white line, the waves and the
 * onsets), with `--ref` and three reads added for the ruling's bars:
 * - the foot crest: the crest's height above still water where the face is `footDepth` deep (4.4 m; 4.884 m at the
 *   reference size), at s 65, 90, 120, 150 and 175 along the reef, the median of each period's highest water (bar C);
 * - the wall ahead: in the column 0 / 10 / 20 / 30 m ahead of the white line's far end along the reef, the highest water
 *   within reach of the crest there, less the lowest water in the 25 m shoreward of it, and the steepest slope on that
 *   front, while the line's end is on the barrel section with 30 m of it ahead (u 65-145) (bar E);
 * - the onsets' deepest and the lip jets' share over u 40-90 (bars C and D).
 *   rolldown docs/research/pool-look-reference-2026-11-11/step1/ref-probe.ts -o dist/scripts/ref-probe.mjs --format esm --platform node \
 *     && node dist/scripts/ref-probe.mjs [--ref] [--inside] [--H <m>] [--period <s>] [--periods 14] [--settle 27] [--json <file>]
 */
import { writeFileSync } from 'node:fs';
import { POOL, POOL_REF, POOL_STRAIGHT, POOL_STRAIGHT_EDGE_HEIGHT, poolStraightAt, regularSignificantHeight } from '../../../../src/wave/pool';
import { POOL_FOOT_DEPTH } from '../../../../src/wave/barrel/barrelSpots';
import { GRAVITY } from '../../../../src/wave/dispersion';
import { SurfZoneSimulation, takeOffPoint, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const ref = process.argv.includes('--ref');
const size = ref ? 'ref' : 'big';
const height = Number(option('H') ?? (ref ? POOL_REF.edgeHeight : POOL_STRAIGHT_EDGE_HEIGHT.big));
// `--period <s>`: the reference size's machine period (a probe's question only; the game's is `POOL_REF.period`).
if (ref && option('period')) (POOL_REF as { period: number }).period = Number(option('period'));
const PERIOD = ref ? POOL_REF.period : POOL.period;
const periods = Number(option('periods') ?? 14);
const settle = Number(option('settle') ?? 27);
const FRAME = 0.25; const THRESHOLD = 0.3; const SWASH = 0.5; const LINK = 4; const PATCH = 3; const CREST = 14; const NEW_WAVE = 15; const JUMP = 8; const SECTION = 1.5; const BIN = 10;
const L0 = (GRAVITY * PERIOD ** 2) / (2 * Math.PI);
const s = POOL_STRAIGHT;
/** The floor's numbers that change with the size. */
const shape = ref ? { platformDepth: POOL_REF.platformDepth, crest: 1.0, kneeRounding: POOL_REF.kneeRounding, footDepth: POOL_FOOT_DEPTH * POOL_REF.scale } : { platformDepth: s.platformDepth, crest: 0.9, kneeRounding: s.kneeRounding, footDepth: POOL_FOOT_DEPTH };
const cosPhi = Math.cos((s.reefAngle * Math.PI) / 180);
/** Distance along the reef's crest line from its start, m, at along-shore position x. */
const u = (x: number) => (s.startX - s.side * x) / cosPhi;
const U_TAKE_OFF = s.takeOffS;
const U_END = s.crestProfile[s.crestProfile.length - 1][0];
const BARREL = [s.crestProfile[2][0], s.crestProfile[3][0]];

const sim = new SurfZoneSimulation({
  spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: PERIOD, directionDegrees: 0, spreading: 1000,
  tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', ...(option('width') ? { alongShore: Number(option('width')) } : {}),
  ...(ref ? { poolSize: 'ref', poolTubeCase: 'big' } : {}), ...(process.argv.includes('--inside') ? { poolFloor: 'inside' } : {}),
} as unknown as SurfZoneConfig);
const { solver } = sim;
const { nx, nz, xCenters, zCenters } = solver;
const firstRow = solver.rowBelow(sim.tank.fineFrom);
const strength = sim.breaking.strength;
const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
const depthAt = (i: number) => solver.restLevel - solver.bed[i];
/** The peel's direction along x: toward the reef's end. */
const toward = -s.side;

interface Run { low: number; high: number; z: number }
function runs(): { white: Float64Array; list: Run[] } {
  const white = new Float64Array(nx).fill(Number.NaN);
  for (let col = 0; col < nx; col += 1) {
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (strength[i] > THRESHOLD && depthAt(i) > SWASH && solver.h[i] > 0.05) { white[col] = zCenters[iz]; break; }
    }
  }
  const list: Run[] = [];
  const used = new Uint8Array(nx);
  for (let k = 0; k < nx; k += 1) {
    if (white[k] !== white[k] || used[k]) continue;
    let high = k; let last = white[k]; used[k] = 1;
    for (let m = k + 1; m < nx;) {
      if (white[m] === white[m] && !used[m] && Math.abs(white[m] - last) <= LINK) { high = m; last = white[m]; used[m] = 1; m += 1; continue; }
      const skip = m + 1;
      if (skip < nx && white[skip] === white[skip] && !used[skip] && Math.abs(white[skip] - last) <= LINK) { high = skip; last = white[skip]; used[skip] = 1; m = skip + 1; continue; }
      break;
    }
    if (high - k + 1 < PATCH) continue;
    let zSum = 0; let count = 0;
    for (let m = k; m <= high; m += 1) if (white[m] === white[m]) { zSum += white[m]; count += 1; }
    list.push({ low: k, high, z: zSum / count });
  }
  return { white, list };
}
interface Wave { start: number; x: number; z: number; d: number; zNow: number; speed: number; seen: number; endX: number; ok: boolean; track: [number, number][]; frames: number; patched: number; longest: number }
const waves: Wave[] = [];
let live: Wave[] = [];
/** The wall ahead of the white line's far end: per distance ahead along the reef, the wave's height and its front's steepest slope. */
const AHEAD = [0, 10, 20, 30];
const wall = AHEAD.map(() => ({ height: [] as number[], slope: [] as number[] }));
function record(time: number): void {
  const { white, list } = runs();
  const active = live.filter((w) => time - w.seen <= 1);
  const taken = new Set<Run>();
  for (const wave of [...active].sort((a, b) => a.zNow - b.zNow)) {
    const expected = wave.zNow + wave.speed * (time - wave.seen);
    const mine = list.filter((r) => !taken.has(r) && Math.abs(r.z - expected) <= CREST);
    if (!mine.length) continue;
    for (const r of mine) taken.add(r);
    const main = mine.reduce((a, b) => (b.high - b.low > a.high - a.low ? b : a));
    wave.speed = Math.max(0, Math.min(8, (main.z - wave.zNow) / Math.max(1e-6, time - wave.seen))) * 0.5 + wave.speed * 0.5;
    wave.zNow = main.z; wave.seen = time; wave.frames += 1;
    if (mine.length > 1) wave.patched += 1;
    wave.longest = Math.max(wave.longest, (main.high - main.low) * solver.dx);
    const far = toward < 0 ? xCenters[main.low] : xCenters[main.high];
    if (wave.ok) {
      if (toward * (far - wave.endX) > JUMP && time - wave.start > SECTION) wave.ok = false;
      else if (toward * (far - wave.endX) > 0) { wave.endX = far; wave.track.push([time, u(far)]); }
      const farCol = toward < 0 ? main.low : main.high;
      const uFar = u(far);
      if (wave.ok && time > settle + 1 && uFar >= BARREL[0] && uFar <= BARREL[1] - 30 && white[farCol] === white[farCol]) {
        AHEAD.forEach((ahead, k) => {
          const col = Math.round((s.side * (s.startX - (uFar + ahead) * cosPhi) - xCenters[0]) / solver.dx);
          if (col < 1 || col > nx - 2) return;
          // Where this crest will break in that column, and the reach seaward of it the crest can be at now.
          const zBreak = white[farCol] + poolStraightAt(uFar + ahead).z - poolStraightAt(uFar).z;
          let crestRow = -1; let crest = -Infinity;
          for (let iz = Math.max(firstRow, solver.rowBelow(zBreak - ahead - 8)); iz <= Math.min(nz - 2, solver.rowBelow(zBreak + 3)); iz += 1) {
            const e = eta(iz * nx + col);
            if (e > crest) { crest = e; crestRow = iz; }
          }
          if (crestRow < 0) return;
          let trough = Infinity; let steep = 0;
          for (let iz = crestRow; iz <= nz - 2 && zCenters[iz] <= zCenters[crestRow] + 25; iz += 1) {
            const i = iz * nx + col;
            if (solver.h[i] < 0.05) break;
            const e = eta(i);
            if (e < trough) trough = e;
            if (zCenters[iz] <= zCenters[crestRow] + 12) steep = Math.max(steep, Math.hypot((eta(i + 1) - eta(i - 1)) / (2 * solver.dx), (eta(i + nx) - eta(i - nx)) / (zCenters[iz + 1] - zCenters[iz - 1])));
          }
          wall[k].height.push(crest - trough);
          wall[k].slope.push((Math.atan(steep) * 180) / Math.PI);
        });
      }
    }
  }
  for (const wave of active) if (wave.seen !== time) wave.ok = false;
  const seaward = Math.min(Infinity, ...active.map((w) => w.zNow));
  for (const r of list) {
    if (taken.has(r) || !(r.z < seaward - NEW_WAVE)) continue;
    // Where it first went white: its most seaward cell.
    let best = { x: 0, z: Infinity, d: 0 };
    for (let col = r.low; col <= r.high; col += 1) {
      for (let iz = firstRow; iz < nz; iz += 1) {
        const i = iz * nx + col;
        if (strength[i] > THRESHOLD && depthAt(i) > SWASH) { if (zCenters[iz] < best.z) best = { x: xCenters[col], z: zCenters[iz], d: depthAt(i) }; break; }
      }
    }
    const far = toward < 0 ? xCenters[r.low] : xCenters[r.high];
    const wave: Wave = { start: time, x: best.x, z: best.z, d: best.d, zNow: r.z, speed: 4, seen: time, endX: far, ok: true, track: [[time, u(far)]], frames: 1, patched: 0, longest: (r.high - r.low) * solver.dx };
    waves.push(wave); active.push(wave);
    break;
  }
  live = active.filter((w) => w.seen === time);
}

interface Onset { t: number; x: number; u: number; z: number; depth: number; height: number; face: number }
interface Jet { t: number; x: number; u: number; depth: number; X: number; Y: number; xiRay: number; xiBed: number; H: number; W: number; L: number; tilt: number }
const onsets: Onset[] = [];
const jets: Jet[] = [];
sim.onThrow = (e) => {
  if (solver.time < settle) return;
  const X = e.orthogonalGradient ? 1 / e.orthogonalGradient : Number.NaN;
  jets.push({
    t: solver.time, x: e.x, u: u(e.x), depth: e.depth ?? Number.NaN, X, Y: e.vortexRatio ?? Number.NaN, xiRay: Number.isFinite(X) ? (1 / X) / Math.sqrt(e.height / L0) : Number.NaN,
    xiBed: e.iribarren ?? Number.NaN, H: e.height, W: e.tube.width, L: e.tube.length, tilt: (e.tube.tilt * 180) / Math.PI,
  });
};
const meterWaves: { t: number; x: number; z: number; face: number; depth: number; crest: number }[] = [];
const takeOffAt = takeOffPoint(sim.config);
sim.onBreak = (w) => {
  if (solver.time < settle || Math.abs(w.x - takeOffAt.x) > 10) return;
  const i = solver.rowBelow(w.z) * nx + Math.round((w.x - xCenters[0]) / solver.dx);
  meterWaves.push({ t: solver.time, x: w.x, z: w.z, face: w.face, depth: depthAt(i), crest: eta(i) });
};
const lastWhite = new Float64Array(nx).fill(Number.NaN);
function onsetShapes(time: number): void {
  for (let col = 0; col < nx; col += 1) {
    let row = -1;
    for (let iz = firstRow; iz < nz; iz += 1) {
      const i = iz * nx + col;
      if (strength[i] > THRESHOLD && depthAt(i) > SWASH && solver.h[i] > 0.05) { row = iz; break; }
    }
    const z = row >= 0 ? zCenters[row] : Number.NaN;
    const before = lastWhite[col];
    lastWhite[col] = z;
    if (row < 0 || !(before !== before || z < before - NEW_WAVE)) continue;
    let crest = -Infinity; let trough = Infinity; let face = 0;
    for (let iz = Math.max(firstRow, row - 40); iz < Math.min(nz - 1, row + 20); iz += 1) {
      const e = eta(iz * nx + col);
      if (Math.abs(iz - row) <= 4) crest = Math.max(crest, e);
      trough = Math.min(trough, e);
    }
    for (let iz = Math.max(1, row - 6); iz <= Math.min(nz - 2, row + 6); iz += 1) {
      for (let c = Math.max(1, col - 6); c <= Math.min(nx - 2, col + 6); c += 1) {
        const i = iz * nx + c;
        face = Math.max(face, Math.hypot((eta(i + 1) - eta(i - 1)) / (2 * solver.dx), (eta(i + nx) - eta(i - nx)) / (zCenters[iz + 1] - zCenters[iz - 1])));
      }
    }
    const x = xCenters[col];
    onsets.push({ t: time, x, u: u(x), z, depth: depthAt(row * nx + col), height: crest - trough, face: (Math.atan(face) * 180) / Math.PI });
  }
}

const step = 1 / 30;
const perFrame = Math.round(FRAME / step);
const steps = Math.round((settle + periods * PERIOD) / step);
let fastest = 0; let leastTop = Infinity; let volume0 = Number.NaN; let finite = true;
// The wave's height on the platform 10 m seaward of the face's knee, square to the reef, at s 65, 120 and 175 (the Basilisk
// cases' H/h0), and at the reef's crest line itself (its trough's water over the crest is the top's least).
const phiR = (s.reefAngle * Math.PI) / 180;
const kneeOut = (shape.platformDepth - shape.crest) / s.gradient + shape.kneeRounding + 10;
const platformCells = [65, 120, 175].map((at) => {
  const p = poolStraightAt(at);
  const x = p.x - s.side * kneeOut * Math.sin(phiR);
  const z = p.z - kneeOut * Math.cos(phiR);
  return { at, cell: solver.rowBelow(z) * nx + Math.round((x - xCenters[0]) / solver.dx), max: -Infinity, min: Infinity };
});
// The foot crest: the highest water of each period where the face is `footDepth` deep, square to the reef.
const footOut = (shape.footDepth - shape.crest) / s.gradient;
const footCells = [65, 90, 120, 150, 175].map((at) => {
  const p = poolStraightAt(at);
  const x = p.x - s.side * footOut * Math.sin(phiR);
  const z = p.z - footOut * Math.cos(phiR);
  const cell = solver.rowBelow(z) * nx + Math.round((x - xCenters[0]) / solver.dx);
  return { at, cell, depth: 0, peaks: [] as number[], now: -Infinity };
});
let footFrom = settle;
// The mean along-shore current behind the reef (the advisor's treadmill check): Σqx / Σh over z −100…−45, per 100 s.
let currentQ = 0; let currentH = 0; let currentFrom = settle;
const currents: string[] = [];
const behind: number[] = [];
for (let iz = 0; iz < nz; iz += 1) if (zCenters[iz] >= -100 && zCenters[iz] <= -45) for (let col = 0; col < nx; col += 1) behind.push(iz * nx + col);
const volume = () => { let v = 0; for (let i = 0; i < solver.h.length; i += 1) v += solver.h[i]; return v; };
const t0 = Date.now();
for (let n = 1; n <= steps; n += 1) {
  sim.step(step);
  if (solver.time < settle) continue;
  if (volume0 !== volume0) volume0 = volume();
  if (n % perFrame === 0) {
    record(solver.time);
    onsetShapes(solver.time);
    for (const i of behind) { currentQ += solver.qx[i]; currentH += solver.h[i]; }
    for (const c of footCells) c.now = Math.max(c.now, eta(c.cell));
    if (solver.time - footFrom >= PERIOD - 1e-6) { for (const c of footCells) { c.peaks.push(c.now); c.now = -Infinity; } footFrom = solver.time; }
    for (const c of platformCells) { const e = eta(c.cell); c.max = Math.max(c.max, e); c.min = Math.min(c.min, e); }
    if (solver.time - currentFrom >= 100 - 1e-6) { currents.push(`${currentFrom.toFixed(0)}–${solver.time.toFixed(0)} s ${(currentQ / currentH).toFixed(3)} m/s`); currentQ = 0; currentH = 0; currentFrom = solver.time; }
    for (let i = 0; i < solver.h.length; i += 1) {
      const h = solver.h[i];
      if (!Number.isFinite(h)) finite = false;
      if (h > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / h);
      const d = depthAt(i);
      if (d > 0.5 && d < 1.2 && zCenters[Math.floor(i / nx)] < -30) leastTop = Math.min(leastTop, h);
    }
  }
}
const q = (v: number[], p: number) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : Number.NaN; };
const f = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const sd = (v: number[]) => { const a = v.filter(Number.isFinite); if (a.length < 2) return Number.NaN; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
console.log(`pool straight ${size} (H ${height} m at the feed, period ${PERIOD} s), ${periods} periods after ${settle} s (${((Date.now() - t0) / 1000).toFixed(0)} s wall); xBoundary ${(solver as unknown as { periodicAlongShore?: boolean }).periodicAlongShore ? 'periodic' : 'open'}; `
  + `the sea's direction ${f((sim.sea.components[0].direction * 180) / Math.PI, 1)}°; u of the take-off ${f(U_TAKE_OFF)} m, of the reef's end ${f(U_END)} m; ${JSON.stringify(POOL_STRAIGHT)}`);
const reading = sim.surf.reading(solver.time);
console.log(`surf meter typical ${f(reading?.typical ?? Number.NaN, 2)} m, sets ${f(reading?.sets ?? Number.NaN, 2)} m (${reading?.waves ?? 0} waves); health: finite ${finite}, fastest ${f(fastest, 2)} m/s, `
  + `least water on the reef top ${f(leastTop, 2)} m, volume ${f((100 * (volume() - volume0)) / volume0, 2)} % since ${settle} s; lip jets ${sim.lipJets}, rollers ${sim.lipRollers}; `
  + `mean along-shore current behind the reef ${currents.join(', ') || '—'}${currentH > 0 ? `, last ${(currentQ / currentH).toFixed(3)} m/s` : ''}`);
console.log(`the wave on the platform 10 m seaward of the knee: ${platformCells.map((c) => `s ${c.at} H ${f(c.max - c.min, 2)} m (H/h ${f((c.max - c.min) / shape.platformDepth, 3)})`).join(', ')}`);
for (const c of footCells) c.depth = depthAt(c.cell);
console.log(`the foot crest (highest water each period where the face is ${f(shape.footDepth, 2)} m deep): ${footCells.map((c) => `s ${c.at} ${f(q(c.peaks, 0.5), 2)} m (${f(q(c.peaks, 0.1), 2)}–${f(q(c.peaks, 0.9), 2)}; floor ${f(c.depth, 2)} m)`).join(', ')}; `
  + `median over the barrel ${f(q(footCells.map((c) => q(c.peaks, 0.5)), 0.5), 3)} m, mean ${f(footCells.reduce((a, c) => a + q(c.peaks, 0.5), 0) / footCells.length, 3)} m`);
const list = waves.filter((w) => w.frames >= 4 && w.start > settle + 1);
const at = (w: Wave, target: number) => { const p = w.track.find(([, v]) => v >= target); return p ? p[0] - w.start : Number.NaN; };
const reach = list.map((w) => u(w.endX));
const marks = [0, 30, U_TAKE_OFF, BARREL[0], 100, 150, BARREL[1], 205, U_END].filter((v, i, a) => a.indexOf(v) === i && v <= U_END + 1).sort((a, b) => a - b);
console.log(`${list.length} waves: start at ${f(q(list.map((w) => w.start % PERIOD), 0.5), 2)} s in the period (sd ${f(sd(list.map((w) => w.start % PERIOD)), 2)}), x ${f(q(list.map((w) => w.x), 0.5))} `
  + `(sd ${f(sd(list.map((w) => w.x)), 1)}; u ${f(q(list.map((w) => u(w.x)), 0.5))}), z ${f(q(list.map((w) => w.z), 0.5))}, ${f(q(list.map((w) => w.d), 0.5), 2)} m deep; one travelling line reached `
  + marks.map((m) => `u ${f(m)}: ${reach.filter((r) => r >= m - LINK).length} (+${f(q(list.map((w) => at(w, m)), 0.5), 1)} s, sd ${f(sd(list.map((w) => at(w, m))), 2)})`).join(', ')
  + `; its end median u ${f(q(reach, 0.5))} (10th ${f(q(reach, 0.1))}); longest line median ${f(q(list.map((w) => w.longest), 0.5))} m; frames with a patch median ${f(100 * q(list.map((w) => w.patched / w.frames), 0.5))} %`);
const speeds = (a: number, b: number) => list.map((w) => { const ta = at(w, a); const tb = at(w, b); return tb > ta ? (b - a) / (tb - ta) : Number.NaN; });
for (const [a, b] of [[0, U_TAKE_OFF], [U_TAKE_OFF, BARREL[0]], [BARREL[0], BARREL[1]], [U_TAKE_OFF, BARREL[1]], [BARREL[1], U_END - 10]]) console.log(`  peel along the reef u ${f(a)}–${f(b)}: ${f(q(speeds(a, b), 0.5), 2)} m/s (${f(q(speeds(a, b), 0.1), 2)}–${f(q(speeds(a, b), 0.9), 2)})`);
console.log(`  waves: ${list.map((w) => `t ${(w.start % PERIOD).toFixed(2)} x ${w.x.toFixed(0)} → u ${f(u(w.endX))} by +${f((w.track.at(-1)?.[0] ?? w.start) - w.start, 1)} s`).join(' | ')}`);
const plunging: string[] = [];
for (let b = -20; b < U_END + 20; b += BIN) {
  const o = onsets.filter((v) => v.u >= b && v.u < b + BIN && v.t > settle + 1);
  const j = jets.filter((v) => v.u >= b && v.u < b + BIN && v.t > settle + 1);
  if (!o.length && !j.length) continue;
  const xi = q(j.map((v) => v.xiRay), 0.5);
  if (o.length && j.length >= 0.5 * o.length) plunging.push(`${b}–${b + BIN}`);
  console.log(`u ${String(b).padStart(4)}–${b + BIN} (x ${f(Math.max(...o.map((v) => v.x), ...j.map((v) => v.x)))}…${f(Math.min(...o.map((v) => v.x), ...j.map((v) => v.x)))}): onsets ${o.length}, depth ${f(q(o.map((v) => v.depth), 0.5), 2)} m, `
    + `H ${f(q(o.map((v) => v.height), 0.5), 2)} m, face ${f(q(o.map((v) => v.face), 0.5))}°; jets ${j.length} (${f((100 * j.length) / Math.max(1, o.length))} %), at ${f(q(j.map((v) => v.depth), 0.5), 2)} m, `
    + `X ${f(q(j.map((v) => v.X), 0.5), 1)} Y ${f(q(j.map((v) => v.Y), 0.5), 2)}, ξb along the ray ${f(xi, 2)} (bed's ${f(q(j.map((v) => v.xiBed), 0.5), 2)}), H ${f(q(j.map((v) => v.H), 0.5), 2)} m, `
    + `void W ${f(q(j.map((v) => v.W), 0.5), 2)} × L ${f(q(j.map((v) => v.L), 0.5), 2)} m, tilt ${f(q(j.map((v) => v.tilt), 0.5))}°`);
}
{
  const o = onsets.filter((v) => v.t > settle + 1);
  const mid = o.filter((v) => v.u >= 40 && v.u < 175);
  const o49 = o.filter((v) => v.u >= 40 && v.u < 90);
  const j49 = jets.filter((v) => v.u >= 40 && v.u < 90 && v.t > settle + 1);
  console.log(`onsets: deepest ${f(Math.max(...o.map((v) => v.depth)), 2)} m (99th ${f(q(o.map((v) => v.depth), 0.99), 2)} m), over u 40–175 deepest ${f(Math.max(...mid.map((v) => v.depth)), 2)} m (median ${f(q(mid.map((v) => v.depth), 0.5), 2)} m); `
    + `deeper than 3 m: ${o.filter((v) => v.depth > 3).length} of ${o.length} (u 40–175: ${mid.filter((v) => v.depth > 3).length} of ${mid.length}); lip jets over u 40–90: ${j49.length} on ${o49.length} onsets (${f((100 * j49.length) / Math.max(1, o49.length))} %)`);
  const face = reading?.typical ?? Number.NaN;
  console.log(`the wall ahead of the white line's end (its end on u ${BARREL[0]}–${BARREL[1] - 30}; ${wall[0].height.length} frames), against the meter's face ${f(face, 2)} m: `
    + AHEAD.map((ahead, k) => `${ahead} m ahead H ${f(q(wall[k].height, 0.5), 2)} m (${f(q(wall[k].height, 0.1), 2)}–${f(q(wall[k].height, 0.9), 2)}; ${f(q(wall[k].height, 0.5) / face, 2)} of the face), steepest ${f(q(wall[k].slope, 0.5))}° (90th ${f(q(wall[k].slope, 0.9))}°)`).join('; '));
}
console.log(`plunging (jets on half the onsets or more): ${plunging.join(', ') || 'none'}`);
const out = option('json');
if (out) writeFileSync(out, JSON.stringify({ waves: list.map((w) => ({ start: w.start, x: w.x, z: w.z, d: w.d, track: w.track })), onsets, jets, meterWaves, takeOffAt }));

