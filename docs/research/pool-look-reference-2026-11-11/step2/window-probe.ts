/**
 * pool-look-reference (2026-11-11), step 2 (ruling 14's first choice, its step 1): `?poolSize=ref` on its own 311 m
 * wrapped window, against the first build's 280 m and today's 1.8 m Barrel. Solver only (no riders, no tube library).
 * It is ruling-14-runs/r14-probe.ts (the frame probe: the white line, the waves, the onsets) with ruling 14's bars read
 * as section 3 re-states them, each on the waves from 60 to 180 s (and from 480 to 600 s when `--until 600`):
 * - A: the reef's own largest onset face per wave. The game's break measure (`sim.onBreak`, the surf meter's input) in
 *   the take-off's band (x = take-off +/- 10 m), only onsets within 30 m of the reef's crest line, square to it; the median
 *   over the waves. The meter's own number (any z) is printed beside it, as a report.
 * - B: the white line's far end is followed on every step (1/30 s), so the peel's pace over u 65-175 reads to 0.2 %.
 *   Waves from 60 s to the run's end count (the 60-180 s window holds only 11 or 12).
 * - C: the foot crest (as before) and the depth where each wave's white first shows.
 * - D: per column on u 40-110, the waves that broke at the reef (onsets within 30 m of the reef line, a repeat within
 *   0.6 period is the same wave) and the waves whose lip threw there (`sim.onThrow`, the same rule). The onsets farther
 *   than 30 m from the reef line (the second break line) are counted apart.
 * - E: the wall 0 / 10 / 20 / 30 m ahead of the white line's end, as a share of bar A's face.
 * - F: finite, the fastest water (read every step, with its place and time; the 0.267 s frame's reading beside it, which
 *   is what the earlier probes gave), the least water on the reef top, the along-reef current behind the reef.
 *   rolldown docs/research/pool-look-reference-2026-11-11/step2/window-probe.ts -o dist/scripts/window-probe.mjs --format esm --platform node \
 *     && node dist/scripts/window-probe.mjs [--ref] [--width <m>] [--until 300] [--settle 27]
 */
import { POOL, POOL_REF, POOL_STRAIGHT, POOL_STRAIGHT_EDGE_HEIGHT, poolStraightAt, poolStraightFrame, regularSignificantHeight } from '../../../../src/wave/pool';
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
const until = Number(option('until') ?? 300);
/** The reading windows, s of sea time: ruling 14's fixed window, and the drift bar's when the run reaches it. */
const WINDOWS: [number, number][] = until >= 600 ? [[60, 180], [480, 600]] : [[60, 180]];
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
const wallSamples: { t: number; k: number; height: number; slope: number }[] = [];
function record(time: number, sample: boolean): void {
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
      if (sample && wave.ok && time > settle + 1 && uFar >= BARREL[0] && uFar <= BARREL[1] - 30 && white[farCol] === white[farCol]) {
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
          wallSamples.push({ t: time, k, height: crest - trough, slope: (Math.atan(steep) * 180) / Math.PI });
        });
      }
    }
  }
  for (const wave of active) if (time - wave.seen > FRAME + 1e-9) wave.ok = false;
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
  live = active.filter((w) => time - w.seen <= FRAME + 1e-9);
}

interface Onset { t: number; x: number; u: number; z: number; depth: number; height: number; face: number }
interface Jet { t: number; x: number; z: number; u: number; depth: number; X: number; Y: number; xiRay: number; xiBed: number; H: number; W: number; L: number; tilt: number }
const onsets: Onset[] = [];
const jets: Jet[] = [];
sim.onThrow = (e) => {
  if (solver.time < settle) return;
  const X = e.orthogonalGradient ? 1 / e.orthogonalGradient : Number.NaN;
  jets.push({
    t: solver.time, x: e.x, z: e.z ?? Number.NaN, u: u(e.x), depth: e.depth ?? Number.NaN, X, Y: e.vortexRatio ?? Number.NaN, xiRay: Number.isFinite(X) ? (1 / X) / Math.sqrt(e.height / L0) : Number.NaN,
    xiBed: e.iribarren ?? Number.NaN, H: e.height, W: e.tube.width, L: e.tube.length, tilt: (e.tube.tilt * 180) / Math.PI,
  });
};
/** The reef's crest line at along-shore x: its z, m. An onset within NEAR m of the line, square to it, is the reef's own. */
const reefZ = (x: number) => poolStraightAt(u(x)).z;
const NEAR = 30;
/** Square to the reef line (not along z: the face's foot is 34 m from the line square to it, 45 m along z). */
const near = (x: number, z: number) => Math.abs(poolStraightFrame(x, z).n) <= NEAR;
/** The game's break measure (the surf meter's input), every column. */
const breaks: { t: number; x: number; z: number; face: number; depth: number }[] = [];
const takeOffAt = takeOffPoint(sim.config);
sim.onBreak = (w) => {
  if (solver.time < settle) return;
  const i = solver.rowBelow(w.z) * nx + Math.round((w.x - xCenters[0]) / solver.dx);
  breaks.push({ t: solver.time, x: w.x, z: w.z, face: w.face, depth: depthAt(i) });
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
const startedAt = solver.time;
// The wave's height on the platform 10 m seaward of the face's knee, square to the reef, at s 65, 120 and 175.
const phiR = (s.reefAngle * Math.PI) / 180;
const kneeOut = (shape.platformDepth - shape.crest) / s.gradient + shape.kneeRounding + 10;
const cellOut = (at: number, out: number) => {
  const p = poolStraightAt(at);
  return solver.rowBelow(p.z - out * Math.cos(phiR)) * nx + Math.round((p.x - s.side * out * Math.sin(phiR) - xCenters[0]) / solver.dx);
};
const platformCells = [65, 120, 175].map((at) => ({ at, cell: cellOut(at, kneeOut) }));
// The foot crest: the highest water of each period where the face is `footDepth` deep, square to the reef.
const footCells = [65, 90, 120, 150, 175].map((at) => ({ at, cell: cellOut(at, (shape.footDepth - shape.crest) / s.gradient) }));
interface Peak { v: number; x: number; z: number; t: number; depth: number }
const peak = (v: number): Peak => ({ v, x: Number.NaN, z: Number.NaN, t: Number.NaN, depth: Number.NaN });
const acc = WINDOWS.map(([from, to]) => ({
  from, to, finite: true, done: false, meter: undefined as ReturnType<typeof sim.surf.reading>,
  platform: platformCells.map(() => ({ max: -Infinity, min: Infinity })),
  foot: footCells.map(() => ({ peaks: [] as number[], now: -Infinity })), footFrom: from,
  fastest: peak(0), fastestFrame: peak(0), leastTop: peak(Infinity), q: 0, h: 0,
}));
// The mean along-shore current behind the reef (the advisor's treadmill check): Σqx / Σh over z −100…−45.
let currentQ = 0; let currentH = 0; let currentFrom = settle;
const currents: string[] = [];
const behind: number[] = [];
for (let iz = 0; iz < nz; iz += 1) if (zCenters[iz] >= -100 && zCenters[iz] <= -45) for (let col = 0; col < nx; col += 1) behind.push(iz * nx + col);
const volume = () => { let v = 0; for (let i = 0; i < solver.h.length; i += 1) v += solver.h[i]; return v; };
let volume0 = Number.NaN; let finite = true; let runFastest = peak(0);
const t0 = Date.now();
for (let n = 1; solver.time < until - 1e-9; n += 1) {
  sim.step(step);
  const time = solver.time;
  if (time < settle) continue;
  if (volume0 !== volume0) volume0 = volume();
  const frame = n % perFrame === 0;
  record(time, frame);
  for (const w of acc) if (!w.done && time >= w.to) { w.meter = sim.surf.reading(time); w.done = true; }
  const a = acc.find((w) => time >= w.from && time < w.to);
  if (frame) {
    onsetShapes(time);
    let qSum = 0; let hSum = 0;
    for (const i of behind) { qSum += solver.qx[i]; hSum += solver.h[i]; }
    currentQ += qSum; currentH += hSum;
    if (time - currentFrom >= 100 - 1e-6) { currents.push(`${currentFrom.toFixed(0)}–${time.toFixed(0)} s ${(currentQ / currentH).toFixed(3)}`); currentQ = 0; currentH = 0; currentFrom = time; }
    if (a) {
      a.q += qSum; a.h += hSum;
      a.foot.forEach((c, k) => { c.now = Math.max(c.now, eta(footCells[k].cell)); });
      if (time - a.footFrom >= PERIOD - 1e-6) { for (const c of a.foot) { c.peaks.push(c.now); c.now = -Infinity; } a.footFrom = time; }
      a.platform.forEach((c, k) => { const e = eta(platformCells[k].cell); c.max = Math.max(c.max, e); c.min = Math.min(c.min, e); });
    }
  }
  {
    for (let i = 0; i < solver.h.length; i += 1) {
      const h = solver.h[i];
      if (!Number.isFinite(h)) { finite = false; if (a) a.finite = false; }
      const d = depthAt(i);
      const v = h > 0.05 ? Math.hypot(solver.qx[i], solver.qz[i]) / h : 0;
      if (v > runFastest.v) runFastest = { v, x: xCenters[i % nx], z: zCenters[Math.floor(i / nx)], t: time, depth: d };
      if (!a) continue;
      if (h > 0.05) {
        if (v > a.fastest.v) a.fastest = { v, x: xCenters[i % nx], z: zCenters[Math.floor(i / nx)], t: time, depth: d };
        if (frame && v > a.fastestFrame.v) a.fastestFrame = { v, x: xCenters[i % nx], z: zCenters[Math.floor(i / nx)], t: time, depth: d };
      }
      if (frame && d > 0.5 && d < 1.2 && zCenters[Math.floor(i / nx)] < -30 && h < a.leastTop.v) a.leastTop = { v: h, x: xCenters[i % nx], z: zCenters[Math.floor(i / nx)], t: time, depth: d };
    }
  }
}
for (const w of acc) if (!w.done) w.meter = sim.surf.reading(solver.time);

const q = (v: number[], p: number) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : Number.NaN; };
const f = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const count = (v: number[]) => v.filter(Number.isFinite).length;
const range = (v: number[], d = 2) => `${f(q(v, 0.5), d)} (${f(q(v, 0.1), d)}–${f(q(v, 0.9), d)})`;
const where = (p: Peak) => `x ${f(p.x)} (u ${f(u(p.x))}), z ${f(p.z)}, ${f(p.z - reefZ(p.x))} m shoreward of the reef line, still depth ${f(p.depth, 2)} m, at ${f(p.t, 1)} s`;
/** Group events into waves as the surf meter does: an event within `gap` s of a wave's first is that wave's. */
function grouped<T extends { t: number }>(events: T[], gap: number): T[][] {
  const out: T[][] = [];
  for (const e of [...events].sort((x, y) => x.t - y.t)) {
    const last = out.at(-1);
    if (last && e.t - last[0].t < gap) last.push(e); else out.push([e]);
  }
  return out;
}
const best = <T extends { face: number }>(wave: T[]) => wave.reduce((x, y) => (y.face > x.face ? y : x));
const width = nx * solver.dx;
console.log(`pool straight ${size} (H ${height} m at the feed, period ${PERIOD} s), window ${f(width)} m (nx ${nx}, nz ${nz}, dx ${solver.dx} m), from ${f(startedAt, 1)} s (the sea as built, spun up) to ${until} s on the solver's clock, read from ${settle} s (${((Date.now() - t0) / 1000).toFixed(0)} s wall); `
  + `xBoundary ${(solver as unknown as { periodicAlongShore?: boolean }).periodicAlongShore ? 'periodic' : 'open'}; the sea's direction ${f((sim.sea.components[0].direction * 180) / Math.PI, 1)}°; `
  + `u of the take-off ${f(U_TAKE_OFF)} m (x ${f(takeOffAt.x, 1)}, z ${f(takeOffAt.z, 1)}; the reef line there z ${f(reefZ(takeOffAt.x), 1)}), of the reef's end ${f(U_END)} m`);
console.log(`whole run: finite ${finite}, fastest water from ${settle} s on ${f(runFastest.v, 2)} m/s (${where(runFastest)}), volume ${f((100 * (volume() - volume0)) / volume0, 2)} % since ${settle} s; lip jets ${sim.lipJets}, rollers ${sim.lipRollers}; `
  + `mean along-shore current behind the reef (z −100…−45), m/s: ${currents.join(', ') || '—'}`);

const band = breaks.filter((b) => Math.abs(b.x - takeOffAt.x) <= 10);
const reefWaves = grouped(band.filter((b) => near(b.x, b.z)), 0.5 * PERIOD);
const meterWaves = grouped(band, 0.5 * PERIOD);
const tracked = waves.filter((w) => w.frames >= 30);
const at = (w: Wave, target: number) => { const p = w.track.find(([, v]) => v >= target); return p ? p[0] - w.start : Number.NaN; };
const speeds = (list: Wave[], a: number, b: number) => list.map((w) => { const ta = at(w, a); const tb = at(w, b); return tb > ta ? (b - a) / (tb - ta) : Number.NaN; });
const SEGMENTS = [[U_TAKE_OFF, BARREL[0]], [BARREL[0], BARREL[1]], [BARREL[0], 120], [120, BARREL[1]], [U_TAKE_OFF, BARREL[1]]];
function pace(label: string, list: Wave[]): void {
  const reach = list.map((w) => u(w.endX));
  console.log(`B, pace, ${label}: ${list.length} waves; one travelling line reached ${[U_TAKE_OFF, BARREL[0], 100, 120, 150, BARREL[1], 205].map((m) => `u ${f(m)}: ${reach.filter((r) => r >= m - LINK).length}`).join(', ')}; `
    + `its end median u ${f(q(reach, 0.5))} (10th ${f(q(reach, 0.1))}); longest line median ${f(q(list.map((w) => w.longest), 0.5))} m`);
  for (const [a, b] of SEGMENTS) { const v = speeds(list, a, b); console.log(`  peel along the reef u ${f(a)}–${f(b)}: ${range(v)} m/s, ${count(v)} waves`); }
}
/** The first of each wave among the times in one column: a repeat within 0.6 period is the same wave. */
const firsts = (times: number[]) => grouped(times.map((t) => ({ t })), 0.6 * PERIOD).map((g) => g[0].t);
const colOf = (x: number) => Math.round((x - xCenters[0]) / solver.dx);

for (const w of acc) {
  const inWindow = (t: number) => t >= w.from && t < w.to;
  console.log(`\n=== waves from ${w.from} to ${w.to} s ===`);
  // A.
  const reefBest = reefWaves.filter((g) => inWindow(g[0].t)).map(best);
  const meterBest = meterWaves.filter((g) => inWindow(g[0].t)).map(best);
  const faceA = q(reefBest.map((b) => b.face), 0.5);
  const third = [...meterBest].sort((x, y) => y.face - x.face).slice(0, Math.max(1, Math.ceil(meterBest.length / 3)));
  console.log(`A, size: the reef's own largest onset face per wave (take-off band, within ${NEAR} m of the reef line): median ${f(faceA, 2)} m `
    + `(least ${f(Math.min(...reefBest.map((b) => b.face)), 2)}, most ${f(Math.max(...reefBest.map((b) => b.face)), 2)}; ${reefBest.length} waves; mean ${f(reefBest.reduce((x, b) => x + b.face, 0) / reefBest.length, 2)} m); `
    + `each: ${reefBest.map((b) => `${f(b.face, 2)} (z ${f(b.z)}, ${f(b.depth, 2)} m deep)`).join(', ')}`);
  console.log(`   report only, the surf meter: typical ${f(w.meter?.typical ?? Number.NaN, 2)} m, sets ${f(w.meter?.sets ?? Number.NaN, 2)} m (${w.meter?.waves ?? 0} waves, read at the window's end); `
    + `its waves' largest faces: ${meterBest.map((b) => `${f(b.face, 2)} (z ${f(b.z)})`).join(', ')}; of the ${third.length} that make its typical, ${third.filter((b) => !near(b.x, b.z)).length} are not at the reef; `
    + `of all ${meterBest.length}, ${meterBest.filter((b) => !near(b.x, b.z)).length} are not at the reef`);
  // B.
  pace(`waves that started in ${w.from}–${w.to} s`, tracked.filter((v) => inWindow(v.start)));
  // C.
  const started = tracked.filter((v) => inWindow(v.start));
  console.log(`C, the foot crest (highest water each period where the face is ${f(shape.footDepth, 2)} m deep): ${footCells.map((c, k) => `s ${c.at} ${f(q(w.foot[k].peaks, 0.5), 2)} m (${f(q(w.foot[k].peaks, 0.1), 2)}–${f(q(w.foot[k].peaks, 0.9), 2)}; floor ${f(depthAt(c.cell), 2)} m)`).join(', ')}; `
    + `median over the barrel ${f(q(w.foot.map((c) => q(c.peaks, 0.5)), 0.5), 3)} m, mean ${f(w.foot.reduce((x, c) => x + q(c.peaks, 0.5), 0) / w.foot.length, 3)} m (${w.foot[0].peaks.length} periods)`);
  console.log(`C, the first break (where each wave's white first shows): ${range(started.map((v) => v.d))} m deep, u ${f(q(started.map((v) => u(v.x)), 0.5))}, z ${f(q(started.map((v) => v.z), 0.5))}, at ${f(q(started.map((v) => v.start % PERIOD), 0.5), 2)} s in the period; ${started.length} waves`);
  // D, per column.
  let nReef = 0; let nJet = 0; let nFar = 0; let columns = 0;
  const perBin = new Map<number, { reef: number; jet: number; far: number; repeats: number }>();
  for (let col = 0; col < nx; col += 1) {
    const uc = u(xCenters[col]);
    if (uc < -20 || uc >= U_END + 20) continue;
    const mine = onsets.filter((o) => colOf(o.x) === col);
    const reef = firsts(mine.filter((o) => near(o.x, o.z)).map((o) => o.t)).filter(inWindow).length;
    const far = mine.filter((o) => !near(o.x, o.z) && inWindow(o.t)).length;
    const jet = firsts(jets.filter((j) => colOf(j.x) === col && (j.z !== j.z || near(j.x, j.z))).map((j) => j.t)).filter(inWindow).length;
    const repeats = mine.filter((o) => near(o.x, o.z) && inWindow(o.t)).length - reef;
    const key = Math.floor(uc / BIN) * BIN;
    const bin = perBin.get(key) ?? { reef: 0, jet: 0, far: 0, repeats: 0 };
    bin.reef += reef; bin.jet += jet; bin.far += far; bin.repeats += repeats;
    perBin.set(key, bin);
    if (uc >= 40 && uc < 110) { nReef += reef; nJet += jet; nFar += far; columns += 1; }
  }
  const periodsIn = (w.to - w.from) / PERIOD;
  const jetsRaw = jets.filter((j) => inWindow(j.t) && j.u >= 40 && j.u < 110);
  const jetsFar = jetsRaw.filter((j) => j.z === j.z && !near(j.x, j.z));
  console.log(`D, plunge, u 40–110 (${columns} columns): waves that broke at the reef, summed over the columns ${nReef}; waves whose lip threw there ${nJet} = ${f((100 * nJet) / Math.max(1, nReef), 1)} % `
    + `(against columns × periods in the window, ${f(columns * periodsIn)}: ${f((100 * nJet) / (columns * periodsIn), 1)} %); every lip jet there ${jetsRaw.length}, of them farther than ${NEAR} m from the reef line ${jetsFar.length} (z ${range(jetsFar.map((j) => j.z), 0)}, throw H ${range(jetsFar.map((j) => j.H))} m)`);
  const farOn = onsets.filter((o) => inWindow(o.t) && !near(o.x, o.z));
  const farMid = farOn.filter((o) => o.u >= 40 && o.u < 110);
  const farBreaks = breaks.filter((b) => inWindow(b.t) && !near(b.x, b.z) && u(b.x) >= 40 && u(b.x) < 110);
  console.log(`   the second break line (onsets farther than ${NEAR} m from the reef line): on u 40–110 ${farMid.length} onsets (${f(farMid.length / Math.max(1, nReef), 2)} per wave at the reef), z ${range(farMid.map((o) => o.z), 0)}, `
    + `${range(farMid.map((o) => o.z - reefZ(o.x)), 0)} m shoreward of the reef line, ${range(farMid.map((o) => o.depth))} m deep; over the whole window's width ${farOn.length} onsets, z ${range(farOn.map((o) => o.z), 0)}; `
    + `the game's own break measure there (u 40–110): ${farBreaks.length} onsets, z ${range(farBreaks.map((b) => b.z), 0)}, face ${range(farBreaks.map((b) => b.face))} m`);
  for (const key of [...perBin.keys()].sort((x, y) => x - y)) {
    const bin = perBin.get(key)!;
    const j = jets.filter((v) => inWindow(v.t) && v.u >= key && v.u < key + BIN);
    const jReef = j.filter((v) => v.z !== v.z || near(v.x, v.z));
    const o = onsets.filter((v) => inWindow(v.t) && v.u >= key && v.u < key + BIN && near(v.x, v.z));
    if (!bin.reef && !bin.jet && !bin.far) continue;
    console.log(`   u ${String(key).padStart(4)}–${key + BIN}: waves at the reef ${bin.reef} (repeat onsets there ${bin.repeats}), lips thrown at the reef ${bin.jet} (${f((100 * bin.jet) / Math.max(1, bin.reef))} %), second-line onsets ${bin.far}, lip jets away from the reef ${j.filter((v) => v.z === v.z && !near(v.x, v.z)).length}; `
      + `onset depth ${f(q(o.map((v) => v.depth), 0.5), 2)} m, onset H ${f(q(o.map((v) => v.height), 0.5), 2)} m, face ${f(q(o.map((v) => v.face), 0.5))}°; the reef's throw H ${f(q(jReef.map((v) => v.H), 0.5), 2)} m at ${f(q(jReef.map((v) => v.depth), 0.5), 2)} m, `
      + `void W ${f(q(jReef.map((v) => v.W), 0.5), 2)} × L ${f(q(jReef.map((v) => v.L), 0.5), 2)} m`);
  }
  // E.
  const wallIn = wallSamples.filter((v) => inWindow(v.t));
  console.log(`E, the wall ahead of the white line's end (its end on u ${BARREL[0]}–${BARREL[1] - 30}; ${wallIn.filter((v) => v.k === 0).length} frames), against bar A's face ${f(faceA, 2)} m: `
    + AHEAD.map((ahead, k) => { const h = wallIn.filter((v) => v.k === k).map((v) => v.height); const sl = wallIn.filter((v) => v.k === k).map((v) => v.slope); return `${ahead} m ahead H ${range(h)} m = ${f(q(h, 0.5) / faceA, 2)} of the face, steepest ${f(q(sl, 0.5))}° (90th ${f(q(sl, 0.9))}°)`; }).join('; '));
  // F.
  console.log(`F, health: finite ${w.finite}; fastest water ${f(w.fastest.v, 2)} m/s read every step (${where(w.fastest)}); on the 0.267 s frame ${f(w.fastestFrame.v, 2)} m/s (${where(w.fastestFrame)}); `
    + `least water on the reef top ${f(w.leastTop.v, 2)} m (${where(w.leastTop)}); mean along-shore current behind the reef ${f(w.q / w.h, 3)} m/s`);
  console.log(`the wave on the platform 10 m seaward of the knee: ${platformCells.map((c, k) => `s ${c.at} H ${f(w.platform[k].max - w.platform[k].min, 2)} m (H/h ${f((w.platform[k].max - w.platform[k].min) / shape.platformDepth, 3)})`).join(', ')}`);
}
console.log('');
pace(`every wave that started from 60 s to ${until - 30} s (the bar's 20 waves)`, tracked.filter((v) => v.start >= 60 && v.start < until - 30));
console.log(`  waves: ${tracked.filter((v) => v.start >= 60).map((w) => `${f(w.start, 1)} s x ${w.x.toFixed(0)} → u ${f(u(w.endX))} by +${f((w.track.at(-1)?.[0] ?? w.start) - w.start, 1)} s`).join(' | ')}`);
