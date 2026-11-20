/**
 * pool-look-reference (2026-11-11), step 3 (ruling 15's step 1): the pool's straight Barrel read on the GAME'S OWN LIP.
 * Solver only (no riders, no page). It is step2/window-probe.ts with the sea built as the game builds it:
 * - the config from the game's own path (`physicalSettingsFor` then `surfZoneConfigFor`; `--ref` sets `?poolSize=ref`
 *   on a stand-in `location`, so `poolSizeSwitch` and `poolRefConfig` do the rest: 10.5 s, 1.47 m, the 311 m window, the
 *   tube case 'big');
 * - the tube's profile library as the third constructor value (`SurfZoneRunner.ts:447-448`; the case files read from
 *   public/ by `readBarrelCases`, the game's own list for the config's `poolTubeCase`). With it the sea has `sim.crash`
 *   (`SweptCrash`) and `throwLip` returns on its first line. `--no-library` builds the step 2 sea again (a check).
 * The bars are ruling 15's (section 4):
 * - A: as step 2, over the waves of 60 to 270 s.
 * - B: the white line's pace on u 65 to 145 (waves that started 60 to 270 s); its end, u 40 to 65 and the halves apart.
 * - C: the first break's depth (report).
 * - D, replaced: the crash's own ledger. `sim.crash.counts` (totals), and per 10 m of s (the reef's own frame,
 *   `poolStraightFrame`) a tally made HERE: every front point is followed by its id each step; the step its clock reaches
 *   its throw (tau >= 0) it is counted, and what `SweptCrash` did with it is read from the point (`jetStrip` >= 0: a jet;
 *   -1 with no pace: missed, never drawn; -1 with a pace: covered, or no water). The water asked and thrown per jet is
 *   read by wrapping this sea's `lip.holdJet` (a listener in the probe: the call goes through unchanged).
 * - E: the wall ahead of the white line's end, as step 2.
 * - F: the fastest water within 60 m of the reef line (|n| <= 60 m square to it, s 0 to the reef's end), every step; and
 *   the fastest elsewhere (the swash) apart, per 100 s.
 * - Also: the drawn tube's height at the throw (the library's scaled case, crest over the lower of toe and front, as
 *   `SurfZoneSimulation.throwHeight`), from the thrown points' own foot crests.
 * Run from the repository's root (the case files are read from public/):
 *   npx rolldown docs/research/pool-look-reference-2026-11-11/step3/crash-probe.ts -o dist/scripts/crash-probe.mjs --format esm --platform node \
 *     && node dist/scripts/crash-probe.mjs [--ref] [--until 300] [--settle 27] [--no-library]
 */
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { POOL, POOL_REF, POOL_STRAIGHT, POOL_STRAIGHT_EDGE_HEIGHT, poolStraightAt, poolStraightFrame } from '../../../../src/wave/pool';
import { libraryFromBytes } from '../../../../src/wave/barrel/barrelLibrary';
import { POOL_FOOT_DEPTH, POOL_FRONT_REACH } from '../../../../src/wave/barrel/barrelSpots';
import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { LANDMARK } from '../../../../src/wave/barrel/ProfileLibrary';
import { BARREL_SLOPE } from '../../../../src/wave/barrel/sweptLoft';
import { GRAVITY } from '../../../../src/wave/dispersion';
import { SurfZoneSimulation, sweptBarrelOn, takeOffPoint, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const ref = process.argv.includes('--ref');
const withLibrary = !process.argv.includes('--no-library');
const size = ref ? 'ref' : 'big';
const height = ref ? POOL_REF.edgeHeight : POOL_STRAIGHT_EDGE_HEIGHT.big;
const PERIOD = ref ? POOL_REF.period : POOL.period;
const until = Number(option('until') ?? 300);
/** The reading windows, s of sea time: ruling 15's (60 to 270), step 2's (60 to 180), and the drift bar's when the run reaches it. */
const WINDOWS: [number, number][] = until >= 600 ? [[60, 270], [60, 180], [480, 600]] : [[60, 270], [60, 180]];
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
/** Bar B's stretch (ruling 15). */
const PACE = [65, 145];

// The game's own config: the Surf screen's Wave Pool, Barrel waves, Big, on the CPU; `?poolSize=ref` as the page reads it.
if (ref) (globalThis as unknown as { location: { search: string } }).location = { search: '?poolSize=ref' };
const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
const config = surfZoneConfigFor(settings as never, 1, false) as SurfZoneConfig;
// The library as `SurfZoneRunner`'s constructor makes it (`:447-448`), from the game's case list for this config.
const slopeOf = BARREL_SLOPE[config.spot];
const caseBytes = withLibrary && sweptBarrelOn(config) && slopeOf !== undefined ? readBarrelCases(config.spot, undefined, config.poolTubeCase) : undefined;
const library = caseBytes ? libraryFromBytes(caseBytes, config.tubeShape, config.spot) : undefined;
const sim = new SurfZoneSimulation(config, 'spun-up', library);
const crash = sim.crash;
const front = sim.front;
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
  thrownBySolver += 1;
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
// ---- Bar D on the game's path: the crash's ledger, tallied here per front point.
/** A front point's story: where it was first seen, when its clock reached its throw, and what the crash did with it. */
interface Fate {
  first: number; firstS: number; last: number; reached?: number; s: number; n: number; footHeight: number; footDepth: number;
  outcome?: 'jet' | 'missed' | 'covered' | 'no water' | 'covered or no water'; at?: number; left?: 'exit' | 'fade exit';
}
const fates = new Map<number, Fate>();
/** Every jet the crash asked the lip for (`PlungingLip.holdJet`): the water asked and thrown, m³, and its crest cell's place. */
const holds: { t: number; x: number; z: number; s: number; asked: number; thrown: number; strip: number }[] = [];
const counts0 = crash ? { ...crash.counts } as unknown as Record<string, number> : {};
if (crash) {
  const lip = sim.lip as unknown as { holdJet: (jet: { cell: number; volume: number }, keep?: boolean) => { strip: number; thrown: number } };
  const hold = lip.holdJet.bind(sim.lip);
  // A listener only: the call and its result pass through unchanged.
  lip.holdJet = (jet, keep) => {
    const result = hold(jet, keep);
    const x = xCenters[jet.cell % nx]; const z = zCenters[Math.floor(jet.cell / nx)];
    holds.push({ t: solver.time, x, z, s: poolStraightFrame(x, z).s, asked: jet.volume, thrown: result.thrown, strip: result.strip });
    return result;
  };
}
let coveredBefore = 0;
/** After each step: follow the front's points (`sim.front.points`, as the crash was handed them). */
function followFront(time: number): void {
  if (!front || !crash) return;
  const fresh: Fate[] = [];
  for (const p of front.points) {
    let f = fates.get(p.id);
    const frame = poolStraightFrame(p.x, p.z);
    if (!f) { f = { first: time, firstS: frame.s, last: time, s: frame.s, n: frame.n, footHeight: p.footHeight, footDepth: p.footDepth }; fates.set(p.id, f); }
    f.last = time;
    if (f.outcome) continue;
    f.footHeight = p.footHeight; f.footDepth = p.footDepth;
    if (f.reached === undefined && p.tau >= 0) { f.reached = time; f.s = frame.s; f.n = frame.n; }
    if (p.jetStrip === undefined) continue;
    if (f.reached === undefined) { f.reached = time; f.s = frame.s; f.n = frame.n; }
    f.at = time;
    if (p.jetStrip >= 0) f.outcome = 'jet';
    else if (p.jetAt === undefined) f.outcome = 'missed';
    else { f.outcome = 'covered or no water'; fresh.push(f); }
  }
  // A paced point without a jet is covered (the crash counts it) or had no water to throw (zero volume, or the crest gave none).
  const covered = crash.counts.covered - coveredBefore;
  coveredBefore = crash.counts.covered;
  if (fresh.length && covered === fresh.length) for (const f of fresh) f.outcome = 'covered';
  else if (fresh.length && covered === 0) for (const f of fresh) f.outcome = 'no water';
  for (const p of crash.exited) { const f = fates.get(p.id); if (f) f.left = 'exit'; }
  for (const p of crash.fadeExited) { const f = fates.get(p.id); if (f) f.left = 'fade exit'; }
}
/** The crash's counts at a moment (a copy), by the time they were taken. */
const countsAt = new Map<number, Record<string, number>>();
const MARKS = [...new Set([settle, ...WINDOWS.flat()])].sort((a, b) => a - b);
let nextMark = 0;
/** Within 60 m of the reef line, square to it, along its length: bar F's water. The rest is "elsewhere" (the beach's swash). */
const REEF_BAND = 60;
const reefBand = new Uint8Array(nx * nz);
for (let iz = 0; iz < nz; iz += 1) for (let col = 0; col < nx; col += 1) {
  const frame = poolStraightFrame(xCenters[col], zCenters[iz]);
  if (Math.abs(frame.n) <= REEF_BAND && frame.s >= 0 && frame.s <= U_END) reefBand[iz * nx + col] = 1;
}
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
  fastest: peak(0), fastestElse: peak(0), leastTop: peak(Infinity), q: 0, h: 0,
}));
/** The fastest water per 100 s of the run, at the reef and elsewhere (is the swash growing?). */
const blocks: { from: number; reef: Peak; other: Peak }[] = [];
// The mean along-shore current behind the reef (the advisor's treadmill check): Σqx / Σh over z −100…−45.
let currentQ = 0; let currentH = 0; let currentFrom = settle;
const currents: string[] = [];
const behind: number[] = [];
for (let iz = 0; iz < nz; iz += 1) if (zCenters[iz] >= -100 && zCenters[iz] <= -45) for (let col = 0; col < nx; col += 1) behind.push(iz * nx + col);
const volume = () => { let v = 0; for (let i = 0; i < solver.h.length; i += 1) v += solver.h[i]; return v; };
let volume0 = Number.NaN; let finite = true; let runFastest = peak(0); let runFastestElse = peak(0);
let thrownBySolver = 0;
const t0 = Date.now();
for (let n = 1; solver.time < until - 1e-9; n += 1) {
  sim.step(step);
  const time = solver.time;
  followFront(time);
  while (nextMark < MARKS.length && time >= MARKS[nextMark] - 1e-9) { if (crash) countsAt.set(MARKS[nextMark], { ...crash.counts } as unknown as Record<string, number>); nextMark += 1; }
  if (time < settle) continue;
  if (volume0 !== volume0) volume0 = volume();
  const frame = n % perFrame === 0;
  record(time, frame);
  for (const w of acc) if (!w.done && time >= w.to) { w.meter = sim.surf.reading(time); w.done = true; }
  const active = acc.filter((w) => time >= w.from && time < w.to);
  if (frame) {
    onsetShapes(time);
    let qSum = 0; let hSum = 0;
    for (const i of behind) { qSum += solver.qx[i]; hSum += solver.h[i]; }
    currentQ += qSum; currentH += hSum;
    if (time - currentFrom >= 100 - 1e-6) { currents.push(`${currentFrom.toFixed(0)}–${time.toFixed(0)} s ${(currentQ / currentH).toFixed(3)}`); currentQ = 0; currentH = 0; currentFrom = time; }
    for (const a of active) {
      a.q += qSum; a.h += hSum;
      a.foot.forEach((c, k) => { c.now = Math.max(c.now, eta(footCells[k].cell)); });
      if (time - a.footFrom >= PERIOD - 1e-6) { for (const c of a.foot) { c.peaks.push(c.now); c.now = -Infinity; } a.footFrom = time; }
      a.platform.forEach((c, k) => { const e = eta(platformCells[k].cell); c.max = Math.max(c.max, e); c.min = Math.min(c.min, e); });
    }
  }
  {
    // This step's fastest water at the reef and elsewhere, and (on the frame) the least water on the reef top.
    let reefV = 0; let reefI = -1; let elseV = 0; let elseI = -1; let topH = Infinity; let topI = -1; let ok = true;
    for (let i = 0; i < solver.h.length; i += 1) {
      const h = solver.h[i];
      if (!Number.isFinite(h) || !Number.isFinite(solver.qx[i]) || !Number.isFinite(solver.qz[i])) ok = false;
      if (h > 0.05) {
        const v = Math.hypot(solver.qx[i], solver.qz[i]) / h;
        if (reefBand[i]) { if (v > reefV) { reefV = v; reefI = i; } } else if (v > elseV) { elseV = v; elseI = i; }
      }
      if (frame) {
        const d = depthAt(i);
        if (d > 0.5 && d < 1.2 && zCenters[Math.floor(i / nx)] < -30 && h < topH) { topH = h; topI = i; }
      }
    }
    const at = (v: number, i: number): Peak => ({ v, x: xCenters[i % nx], z: zCenters[Math.floor(i / nx)], t: time, depth: depthAt(i) });
    if (!ok) { finite = false; for (const a of active) a.finite = false; }
    if (reefI >= 0 && reefV > runFastest.v) runFastest = at(reefV, reefI);
    if (elseI >= 0 && elseV > runFastestElse.v) runFastestElse = at(elseV, elseI);
    const blockFrom = Math.floor(time / 100) * 100;
    let block = blocks.at(-1);
    if (!block || block.from !== blockFrom) { block = { from: blockFrom, reef: peak(0), other: peak(0) }; blocks.push(block); }
    if (reefI >= 0 && reefV > block.reef.v) block.reef = at(reefV, reefI);
    if (elseI >= 0 && elseV > block.other.v) block.other = at(elseV, elseI);
    for (const a of active) {
      if (reefI >= 0 && reefV > a.fastest.v) a.fastest = at(reefV, reefI);
      if (elseI >= 0 && elseV > a.fastestElse.v) a.fastestElse = at(elseV, elseI);
      if (topI >= 0 && topH < a.leastTop.v) a.leastTop = at(topH, topI);
    }
  }
}
if (crash) countsAt.set(until, { ...crash.counts } as unknown as Record<string, number>);
for (const w of acc) if (!w.done) w.meter = sim.surf.reading(solver.time);

const q = (v: number[], p: number) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : Number.NaN; };
const f = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const count = (v: number[]) => v.filter(Number.isFinite).length;
const range = (v: number[], d = 2) => `${f(q(v, 0.5), d)} (${f(q(v, 0.1), d)}–${f(q(v, 0.9), d)})`;
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
const where = (p: Peak) => `x ${f(p.x)} (u ${f(u(p.x))}), z ${f(p.z)}, ${f(p.z - reefZ(p.x))} m shoreward of the reef line, still depth ${f(p.depth, 2)} m, at ${f(p.t, 1)} s`;
console.log(`pool straight ${size} (H ${height} m at the feed, period ${PERIOD} s), window ${f(width)} m (nx ${nx}, nz ${nz}, dx ${solver.dx} m), from ${f(startedAt, 1)} s (the sea as built, spun up) to ${until} s on the solver's clock, read from ${settle} s (${((Date.now() - t0) / 1000).toFixed(0)} s wall); `
  + `xBoundary ${(solver as unknown as { periodicAlongShore?: boolean }).periodicAlongShore ? 'periodic' : 'open'}; the sea's direction ${f((sim.sea.components[0].direction * 180) / Math.PI, 1)}°; `
  + `u of the take-off ${f(U_TAKE_OFF)} m (x ${f(takeOffAt.x, 1)}, z ${f(takeOffAt.z, 1)}; the reef line there z ${f(reefZ(takeOffAt.x), 1)}), of the reef's end ${f(U_END)} m`);
console.log(`the config (the game's path: physicalSettingsFor, surfZoneConfigFor): ${JSON.stringify(config)}`);
console.log(`the library: ${library ? `${library.cases.map((c) => c.id).join(', ')} (poolTubeCase ${config.poolTubeCase ?? 'default'}; slope ${f(slopeOf ?? Number.NaN, 4)})` : 'NONE (--no-library)'}; `
  + `sim.front ${front ? 'exists' : 'absent'}; sim.crash ${crash ? 'exists' : 'ABSENT'}`);
console.log(`the lips: sim.lipJets ${sim.lipJets}, rollers ${sim.lipRollers}; the solver's own lip (throwLip) reached its throw ${thrownBySolver} times since the sea was built (sim.onThrow)`
  + (crash ? `; the crash's throws ${crash.counts.throws}, so lip jets not thrown by the crash: ${sim.lipJets - crash.counts.throws}; onsets the crash stood in for (throwLip returned on its first line) ${crash.counts.onsets}` : ''));
if (crash) {
  console.log(`the crash's own counts since the sea was built: ${JSON.stringify(crash.counts)}`);
  const sum = (v: number[]) => v.reduce((x, y) => x + y, 0);
  const d = (key: string) => crash.counts[key as 'throws'] - counts0[key];
  console.log(`   check of the probe's listener against them (since the listener was set): jets asked ${holds.length}, with a strip ${holds.filter((h) => h.strip >= 0).length} (counts.throws ${d('throws')}); `
    + `asked ${f(sum(holds.map((h) => h.asked)), 3)} m³ (counts ${f(d('asked'), 3)}), thrown ${f(sum(holds.map((h) => h.thrown)), 3)} m³ (counts ${f(d('thrown'), 3)}), starved ${holds.filter((h) => h.thrown < h.asked).length} (counts ${d('starved')}); `
    + `points the probe read as missed ${[...fates.values()].filter((v) => v.outcome === 'missed').length} (counts.missed ${d('missed')}), covered ${[...fates.values()].filter((v) => v.outcome === 'covered').length} (counts.covered ${d('covered')})`);
}
console.log(`whole run: finite ${finite}; fastest water from ${settle} s on, within ${REEF_BAND} m of the reef line ${f(runFastest.v, 2)} m/s (${where(runFastest)}); elsewhere ${f(runFastestElse.v, 2)} m/s (${where(runFastestElse)}); `
  + `volume ${f((100 * (volume() - volume0)) / volume0, 2)} % since ${settle} s; mean along-shore current behind the reef (z −100…−45), m/s: ${currents.join(', ') || '—'}`);
console.log(`   fastest water per 100 s, at the reef / elsewhere (the swash), m/s: ${blocks.map((b) => `${b.from}–${b.from + 100} s ${f(b.reef.v, 2)} / ${f(b.other.v, 2)} (elsewhere at x ${f(b.other.x)}, z ${f(b.other.z)}, ${f(b.other.depth, 2)} m deep)`).join('; ')}`);

const band = breaks.filter((b) => Math.abs(b.x - takeOffAt.x) <= 10);
const reefWaves = grouped(band.filter((b) => near(b.x, b.z)), 0.5 * PERIOD);
const meterWaves = grouped(band, 0.5 * PERIOD);
const tracked = waves.filter((w) => w.frames >= 30);
const at = (w: Wave, target: number) => { const p = w.track.find(([, v]) => v >= target); return p ? p[0] - w.start : Number.NaN; };
const speeds = (list: Wave[], a: number, b: number) => list.map((w) => { const ta = at(w, a); const tb = at(w, b); return tb > ta ? (b - a) / (tb - ta) : Number.NaN; });
const MID = (PACE[0] + PACE[1]) / 2;
const SEGMENTS = [[PACE[0], PACE[1]], [U_TAKE_OFF, PACE[0]], [PACE[0], MID], [MID, PACE[1]], [BARREL[0], BARREL[1]], [BARREL[0], 120], [120, BARREL[1]]];
function pace(label: string, list: Wave[]): void {
  const reach = list.map((w) => u(w.endX));
  console.log(`B, pace, ${label}: ${list.length} waves; one travelling line reached ${[U_TAKE_OFF, BARREL[0], 100, 120, PACE[1], 150, BARREL[1], 205].map((m) => `u ${f(m)}: ${reach.filter((r) => r >= m - LINK).length}`).join(', ')}; `
    + `its end median u ${f(q(reach, 0.5))} (10th ${f(q(reach, 0.1))}); longest line median ${f(q(list.map((w) => w.longest), 0.5))} m`);
  SEGMENTS.forEach(([a, b], k) => { const v = speeds(list, a, b); console.log(`  peel along the reef u ${f(a)}–${f(b)}${k === 0 ? ' (THE BAR)' : k >= 4 ? ' (step 2\'s stretch)' : ''}: ${range(v)} m/s, ${count(v)} waves`); });
}
/** The first of each wave among the times in one column: a repeat within 0.6 period is the same wave. */
const firsts = (times: number[]) => grouped(times.map((t) => ({ t })), 0.6 * PERIOD).map((g) => g[0].t);
const colOf = (x: number) => Math.round((x - xCenters[0]) / solver.dx);
/** A tube's drawn height at its throw for a foot crest and depth, m: crest over the lower of toe and front (`SurfZoneSimulation.throwHeight`). */
const point = new Float64Array(2);
function drawnHeight(footHeight: number, footDepth: number): number {
  if (!library || slopeOf === undefined) return Number.NaN;
  const query = { slope: slopeOf, footHeight, footDepth, seconds: 0, hold: 'contact' as const };
  library.pointAt(query, LANDMARK.crest, point); const crest = point[1];
  library.pointAt(query, LANDMARK.toe, point); const toe = point[1];
  library.pointAt(query, LANDMARK.front, point);
  return crest - Math.min(toe, point[1]);
}

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
  // D on the game's path.
  const periodsIn = (w.to - w.from) / PERIOD;
  if (crash) {
    const c0 = countsAt.get(w.from); const c1 = countsAt.get(w.to) ?? countsAt.get(until)!;
    if (c0) console.log(`D, the crash's own counts in this window (the difference of sim.crash.counts): ${Object.keys(c1).map((key) => `${key} ${f(c1[key] - c0[key], ['asked', 'thrown', 'starvedVolume'].includes(key) ? 3 : 0)}`).join(', ')}; thrown / asked ${f((c1.thrown - c0.thrown) / (c1.asked - c0.asked), 3)}`);
    const all = [...fates.values()];
    const reached = all.filter((v) => v.reached !== undefined && inWindow(v.reached));
    const inReach = (sAt: number) => sAt >= POOL_FRONT_REACH.from && sAt < POOL_FRONT_REACH.to;
    const tally = (list: Fate[]) => {
      const n = (o: Fate['outcome']) => list.filter((v) => v.outcome === o).length;
      return { reached: list.length, jet: n('jet'), missed: n('missed'), covered: n('covered'), noWater: n('no water'), either: n('covered or no water'), none: list.filter((v) => v.outcome === undefined).length };
    };
    const water = (list: typeof holds) => ({ asked: list.reduce((x, h) => x + h.asked, 0), thrown: list.reduce((x, h) => x + h.thrown, 0), starved: list.filter((h) => h.thrown < h.asked).length, refused: list.filter((h) => h.strip < 0).length });
    const line = (label: string, list: Fate[], jetsIn: typeof holds, columns: number) => {
      const k = tally(list); const v = water(jetsIn);
      const left = (kind: Fate['left']) => list.filter((x) => x.left === kind).length;
      return `   ${label}: points that reached their throw ${k.reached}, jets ${k.jet} = ${f((100 * k.jet) / Math.max(1, k.reached), 1)} %, missed ${k.missed}, covered ${k.covered}, no water ${k.noWater}, covered or no water ${k.either}, not handled ${k.none}; `
        + `jets per column per period ${f(k.jet / Math.max(1e-9, columns * periodsIn), 2)}; asked ${f(v.asked, 2)} m³, thrown ${f(v.thrown, 2)} m³ = ${f(v.thrown / Math.max(1e-9, v.asked), 3)}, starved ${v.starved}, the crest gave none ${v.refused}; `
        + `left at a stall ${left('exit')}, in the fade ${left('fade exit')}`;
    };
    const holdsIn = holds.filter((h) => inWindow(h.t));
    const columnsOf = (span: number) => (span * cosPhi) / solver.dx;
    const onReach = reached.filter((v) => inReach(v.s));
    console.log(`D, replaced (ruling 15): the front's points whose clock reached its throw in this window, by where they stood then (s along the reef line, n seaward of it), and what the crash did with each:`);
    console.log(line(`s ${POOL_FRONT_REACH.from}–${POOL_FRONT_REACH.to} (THE BAR)`, onReach, holdsIn.filter((h) => inReach(h.s)), columnsOf(POOL_FRONT_REACH.to - POOL_FRONT_REACH.from)));
    console.log(line(`anywhere else (s under ${POOL_FRONT_REACH.from} or over ${POOL_FRONT_REACH.to})`, reached.filter((v) => !inReach(v.s)), holdsIn.filter((h) => !inReach(h.s)), 1));
    const keys = [...new Set([...reached.map((v) => Math.floor(v.s / BIN) * BIN), ...holdsIn.map((h) => Math.floor(h.s / BIN) * BIN)])].sort((x, y) => x - y);
    for (const key of keys) {
      const mine = reached.filter((v) => Math.floor(v.s / BIN) * BIN === key);
      console.log(line(`s ${String(key).padStart(4)}–${key + BIN}`, mine, holdsIn.filter((h) => Math.floor(h.s / BIN) * BIN === key), columnsOf(BIN))
        + `; n ${range(mine.map((v) => v.n), 1)} m; foot crest ${f(q(mine.map((v) => v.footHeight), 0.5), 2)} m`);
    }
    const never = all.filter((v) => inWindow(v.first) && v.reached === undefined && v.last < until - 2 * PERIOD);
    console.log(`   points first seen in this window that left the front before their clock reached the throw: ${never.length} (of ${all.filter((v) => inWindow(v.first)).length} first seen); by 10 m of s where first seen: `
      + `${[...new Set(never.map((v) => Math.floor(v.firstS / BIN) * BIN))].sort((x, y) => x - y).map((key) => `${key}: ${never.filter((v) => Math.floor(v.firstS / BIN) * BIN === key).length}`).join(', ') || '—'}`);
    const jetPoints = onReach.filter((v) => v.outcome === 'jet');
    console.log(`   the drawn tube at the throw (the library's case scaled by each thrown point's foot crest; crest over the lower of toe and front), s ${POOL_FRONT_REACH.from}–${POOL_FRONT_REACH.to}: `
      + `height ${range(jetPoints.map((v) => drawnHeight(v.footHeight, v.footDepth)))} m; foot crest ${range(jetPoints.map((v) => v.footHeight))} m at ${f(q(jetPoints.map((v) => v.footDepth), 0.5), 2)} m; `
      + `the case's scale ${range(jetPoints.map((v) => library!.profileTimes({ slope: slopeOf!, footHeight: v.footHeight, footDepth: v.footDepth }).scale))} m, touchdown ${f(q(jetPoints.map((v) => library!.profileTimes({ slope: slopeOf!, footHeight: v.footHeight, footDepth: v.footDepth }).touchdownSeconds), 0.5), 2)} s after the throw; ${jetPoints.length} points`);
  }
  // D as step 2 counted it (per column, by the probe's own onsets), with the lips now the crash's jets (or the solver's own without the library).
  const lips = crash ? holds.filter((h) => h.strip >= 0).map((h) => ({ t: h.t, x: h.x, z: h.z, u: u(h.x) })) : jets.map((j) => ({ t: j.t, x: j.x, z: j.z, u: j.u }));
  let nReef = 0; let nJet = 0; let nFar = 0; let columns = 0;
  const perBin = new Map<number, { reef: number; jet: number; far: number }>();
  for (let col = 0; col < nx; col += 1) {
    const uc = u(xCenters[col]);
    if (uc < -20 || uc >= U_END + 20) continue;
    const mine = onsets.filter((o) => colOf(o.x) === col);
    const reef = firsts(mine.filter((o) => near(o.x, o.z)).map((o) => o.t)).filter(inWindow).length;
    const far = mine.filter((o) => !near(o.x, o.z) && inWindow(o.t)).length;
    const jet = firsts(lips.filter((j) => colOf(j.x) === col && (j.z !== j.z || near(j.x, j.z))).map((j) => j.t)).filter(inWindow).length;
    const key = Math.floor(uc / BIN) * BIN;
    const bin = perBin.get(key) ?? { reef: 0, jet: 0, far: 0 };
    bin.reef += reef; bin.jet += jet; bin.far += far;
    perBin.set(key, bin);
    if (uc >= 40 && uc < 110) { nReef += reef; nJet += jet; nFar += far; columns += 1; }
  }
  const lipsFar = lips.filter((j) => inWindow(j.t) && j.z === j.z && !near(j.x, j.z));
  console.log(`D as step 2 counted it, u 40–110 (${columns} columns): waves that broke at the reef (the probe's onsets), summed over the columns ${nReef}; waves whose lip threw there ${nJet} = ${f((100 * nJet) / Math.max(1, nReef), 1)} % `
    + `(against columns × periods, ${f(columns * periodsIn)}: ${f((100 * nJet) / (columns * periodsIn), 1)} %); lips thrown farther than ${NEAR} m from the reef line, anywhere: ${lipsFar.length}; second-line onsets on u 40–110: ${nFar}`);
  console.log(`   per 10 m of u, waves at the reef / lips thrown at the reef (%) / second-line onsets: ${[...perBin.keys()].sort((x, y) => x - y).filter((key) => perBin.get(key)!.reef || perBin.get(key)!.jet || perBin.get(key)!.far).map((key) => { const b = perBin.get(key)!; return `u ${key}: ${b.reef} / ${b.jet} (${f((100 * b.jet) / Math.max(1, b.reef))} %) / ${b.far}`; }).join('; ')}`);
  // E.
  const wallIn = wallSamples.filter((v) => inWindow(v.t));
  console.log(`E, the wall ahead of the white line's end (its end on u ${BARREL[0]}–${BARREL[1] - 30}; ${wallIn.filter((v) => v.k === 0).length} frames), against bar A's face ${f(faceA, 2)} m: `
    + AHEAD.map((ahead, k) => { const h = wallIn.filter((v) => v.k === k).map((v) => v.height); const sl = wallIn.filter((v) => v.k === k).map((v) => v.slope); return `${ahead} m ahead H ${range(h)} m = ${f(q(h, 0.5) / faceA, 2)} of the face, steepest ${f(q(sl, 0.5))}° (90th ${f(q(sl, 0.9))}°)`; }).join('; '));
  // F.
  console.log(`F, health: finite ${w.finite}; fastest water within ${REEF_BAND} m of the reef line ${f(w.fastest.v, 2)} m/s, read every step (${where(w.fastest)}); elsewhere (the swash) ${f(w.fastestElse.v, 2)} m/s (${where(w.fastestElse)}); `
    + `least water on the reef top ${f(w.leastTop.v, 2)} m (${where(w.leastTop)}); mean along-shore current behind the reef ${f(w.q / w.h, 3)} m/s`);
  console.log(`the wave on the platform 10 m seaward of the knee: ${platformCells.map((c, k) => `s ${c.at} H ${f(w.platform[k].max - w.platform[k].min, 2)} m (H/h ${f((w.platform[k].max - w.platform[k].min) / shape.platformDepth, 3)})`).join(', ')}`);
}
console.log('');
console.log(`  waves: ${tracked.filter((v) => v.start >= 60).map((w) => `${f(w.start, 1)} s x ${w.x.toFixed(0)} → u ${f(u(w.endX))} by +${f((w.track.at(-1)?.[0] ?? w.start) - w.start, 1)} s`).join(' | ')}`);
