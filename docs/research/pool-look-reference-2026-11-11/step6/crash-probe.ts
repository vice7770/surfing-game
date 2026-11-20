/**
 * pool-look-reference (2026-11-11), step 6 (ruling 18): ruling-18-runs/r18-probe2.ts (step 5's probe with the ruling's
 * ribs, fold, by-clock and T3 readings; `--feed2 r,T,n` the two-train sea) with relative imports, and new here:
 * - `--throws <file>`: every jet the crash asked the lip for, one line each (time, the crest cell's x and z, asked, thrown,
 *   strip), for a run-to-run compare of each throw's place and step.
 * - the drawn crest's move in one step in the wave's frame, per front point (60-270 s): the change of its drawn place
 *   along its ray (the records' anchor: `anchorDrawn` where the build has it, else `anchorShift`) less the wave's own
 *   advance (`wallSpeed`, the wave's celerity under `wallBody=stream`); and the kept shift's own, the same way.
 * Its text follows.
 * pool-look-reference (2026-11-11), step 5 (ruling 17): step4/crash-probe.ts with the ruling's own readings
 * (ruling-17-runs/r17-probe3.ts: the seam's neighbours, the white standing by the reef) and the join's readings on the
 * DRAWN surface. Still solver only: no riders, no page. New here:
 * - `--extra "&crestLine=top&seamTau=-1.64,-0.5"`: more switches on the stand-in `location`, as the page would read them.
 * - `--reach-to 150`: the lip reach's end the bars are read on (the game's own reach comes from the switches).
 * - The drawn surface: the contact's own loft (`new SweptLoft(library, slope, { contact: true, face: sim.tubeFace })`,
 *   built from `sim.writeTubeRecords` over the solver's plain surface, as `SurfZoneRunner` hands it to the contact) on
 *   each 0.25 s frame and 0.1 s later. From it: J1, J2, J3 (the join bar), the wall ahead of the throw as drawn, and a
 *   rider-free reading of the surface's rise (README: what each one is, and what it is not).
 * - B1 (pace on u 72 to 117) and B3 (white standing by the reef) as ruling 17 restates B.
 * Step 4's text follows.
 * pool-look-reference (2026-11-11), step 4 (ruling 16): step3/crash-probe.ts with the library held as the game's config
 * says (`config.heldRule`) and step 4's switches. Without `--ref` it is step 3's probe. Step 3's own text follows.
 * Step 3 (ruling 15's step 1): the pool's straight Barrel read on the GAME'S OWN LIP.
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
 *   npx rolldown docs/research/pool-look-reference-2026-11-11/step4/crash-probe.ts -o dist/scripts/crash-probe.mjs --format esm --platform node \
 *     && node dist/scripts/crash-probe.mjs [--ref] [--until 300] [--settle 27] [--no-library] [--held old] [--reef short] [--case a38|pool]
 */
import { writeFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { POOL, POOL_REF, POOL_STRAIGHT, POOL_STRAIGHT_EDGE_HEIGHT, poolRefLine, poolStraightAt as atOnLine, poolStraightFrame as frameOnLine } from '../../../../src/wave/pool';
import { libraryFromBytes } from '../../../../src/wave/barrel/barrelLibrary';
import { POOL_FOOT_DEPTH, POOL_FRONT_REACH as POOL_REACH, POOL_REF_FRONT_REACH } from '../../../../src/wave/barrel/barrelSpots';
import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { FRONT_CAPACITY, FRONT_STRIDE } from '../../../../src/wave/barrel/frontRecords';
import { LANDMARK, PROFILE_POINTS } from '../../../../src/wave/barrel/ProfileLibrary';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, SweptLoft } from '../../../../src/wave/barrel/sweptLoft';
import { seamTauWeight } from '../../../../src/wave/barrel/tubeSeam';
import { SeaState } from '../../../../src/wave/SeaState';
import { SeaStateBoundary } from '../../../../src/wave/SeaStateBoundary';
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
/** Step 4, build 2 (ruling 16): the reference size's reef on its own line, 1.11 times longer (`--reef short`: the line before). */
const long = ref && (option('reef') ?? '').trim().toLowerCase() !== 'short';
const reefLine = long ? poolRefLine() : { crestProfile: s.crestProfile, startX: s.startX, takeOffS: s.takeOffS };
const poolStraightAt = (at: number) => atOnLine(at, reefLine.startX);
const poolStraightFrame = (x: number, z: number) => frameOnLine(x, z, reefLine.startX);
const POOL_FRONT_REACH = long ? { ...POOL_REF_FRONT_REACH, to: Number(option('reach-to') ?? POOL_REF_FRONT_REACH.to) } : POOL_REACH;
const u = (x: number) => (reefLine.startX - s.side * x) / cosPhi;
const U_TAKE_OFF = reefLine.takeOffS;
const U_END = reefLine.crestProfile[reefLine.crestProfile.length - 1][0];
const BARREL = [reefLine.crestProfile[2][0], reefLine.crestProfile[3][0]];
/** Bar B's stretch (ruling 15; ruling 16 §4 on the long reef: u 72 to 161). */
const PACE = long ? [72, 161] : [65, 145];
/** The places along the reef the probe names, on the short line and × 1.11 on the long one. */
const AT = long ? { platform: [72, 133, 194], foot: [44, 58, 72, 86, 100, 111, 122, 133, 144, 155, 166.5, 180, 194, 210], mid: 133, marks: [111, 133, 166.5, 227.6], step2: [44, 122], tail: 33.3 }
  : { platform: [65, 120, 175], foot: [65, 90, 120, 150, 175], mid: 120, marks: [100, 120, 150, 205], step2: [40, 110], tail: 30 };

// The game's own config: the Surf screen's Wave Pool, Barrel waves, Big, on the CPU; `?poolSize=ref` as the page reads it.
// Step 4's switches ride on the same stand-in `location`: `--held old` (`?poolHeld=old`), `--reef short` (`?poolReef=short`),
// `--case a38|pool` (`?poolTubeCase=`). All of them act only with `--ref`, as in the game.
const extra = [option('held') ? `&poolHeld=${option('held')}` : '', option('reef') ? `&poolReef=${option('reef')}` : '', option('case') ? `&poolTubeCase=${option('case')}` : '', option('extra') ?? ''].join('');
if (ref) (globalThis as unknown as { location: { search: string } }).location = { search: `?poolSize=ref${extra}` };
const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
const config = surfZoneConfigFor(settings as never, 1, false) as SurfZoneConfig;
// The library as `SurfZoneRunner`'s constructor makes it (`:447-448`), from the game's case list for this config.
const slopeOf = BARREL_SLOPE[config.spot];
const caseBytes = withLibrary && sweptBarrelOn(config) && slopeOf !== undefined ? readBarrelCases(config.spot, undefined, config.poolTubeCase) : undefined;
const library = caseBytes ? libraryFromBytes(caseBytes, config.tubeShape, config.spot, config.heldRule) : undefined;
const sim = new SurfZoneSimulation(config, 'spun-up', library);
// r18 (T3): a second wave train on the machine's zone, probe only. `--feed2 r,T,n`: amplitude r of the main's, period T s,
// n along-shore wavelengths in the wrapped window; both scaled so the energy is the one wave's.
const feed2 = option('feed2');
if (feed2) {
  const [r2, T2, n2] = feed2.split(',').map(Number);
  const main = sim.sea.components[0];
  const W = (2 * Math.PI * POOL_STRAIGHT.periodicWaves) / Math.abs(main.kx);
  const omega2 = (2 * Math.PI) / T2; const k2 = sim.sea.waveNumberAt(omega2, sim.sea.depth);
  const dir2 = Math.sign(main.kx) * Math.asin(Math.min(1, (2 * Math.PI * n2) / (W * k2)));
  const scale = 1 / Math.sqrt(1 + r2 * r2);
  const sea2 = new SeaState([{ amplitude: main.amplitude * scale, omega: main.omega, direction: main.direction, phase: main.phase }, { amplitude: main.amplitude * scale * r2, omega: omega2, direction: dir2, phase: 1.3 }], sim.sea.depth, sim.sea.waveNumberAt);
  const b = (sim as unknown as { boundary: SeaStateBoundary }).boundary;
  const nb = new SeaStateBoundary(sim.solver as never, sea2, b.weights, b.timeOffset);
  Object.assign(b, nb);
  console.log(`r18 feed2: window ${W.toFixed(1)} m; main a ${(main.amplitude * scale).toFixed(3)} m, T ${(2 * Math.PI / main.omega).toFixed(2)} s, ${(main.direction * 180 / Math.PI).toFixed(1)} deg; second a ${(main.amplitude * scale * r2).toFixed(3)} m, T ${T2} s, ${(dir2 * 180 / Math.PI).toFixed(1)} deg (n ${n2}); components in the zone now ${(b as unknown as { count: number }).count}`);
}
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

const ff = (v: number, d = 0) => v.toFixed(d);
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
// ---- r17c: where the white stands against the reef line.
const sinPhi17 = Math.sin((s.reefAngle * Math.PI) / 180);
const colOfU = (uu: number) => Math.round((s.side * (reefLine.startX - uu * cosPhi) - xCenters[0]) / solver.dx);
const nOf = (uu: number, z: number) => s.startZ + uu * sinPhi17 - z;
const STAND = { bins: [] as number[], near: [] as number[], inside: [] as number[], none: [] as number[], frames: 0, dumps: 0 };
for (let uu = 65; uu <= 205; uu += 10) { STAND.bins.push(uu); STAND.near.push(0); STAND.inside.push(0); STAND.none.push(0); }
function standRead(white: Float64Array): void {
  STAND.frames += 1;
  STAND.bins.forEach((uu, k) => { const c = colOfU(uu); const z = white[c]; if (z !== z) STAND.none[k] += 1; else if (nOf(uu, z) >= -10) STAND.near[k] += 1; else STAND.inside[k] += 1; });
}
function dump(white: Float64Array, time: number, label: string): void {
  if (STAND.dumps >= 8) return; STAND.dumps += 1;
  const cells: string[] = [];
  for (let uu = 100; uu <= 205; uu += 5) { const z = white[colOfU(uu)]; cells.push(`${uu}:${z === z ? ff(nOf(uu, z)) : '-'}`); }
  console.log(`r17c ${label} at ${ff(time, 1)} s, most seaward white per column as u:n (n m seaward of the reef line, - none): ${cells.join(' ')}`);
}
interface Wave { start: number; x: number; z: number; d: number; zNow: number; speed: number; seen: number; endX: number; ok: boolean; track: [number, number][]; frames: number; patched: number; longest: number }
const waves: Wave[] = [];
let live: Wave[] = [];
/** The wall ahead of the white line's far end: per distance ahead along the reef, the wave's height and its front's steepest slope. */
const AHEAD = [0, 10, 20, 30];
const wallSamples: { t: number; k: number; height: number; slope: number }[] = [];
let r17Before: Float64Array | undefined;
function record(time: number, sample: boolean): void {
  const { white, list } = runs();
  if (time >= 60 && time <= 270) standRead(white);
  const r17Prev = r17Before; r17Before = white;
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
      if (toward * (far - wave.endX) > JUMP && time - wave.start > SECTION) { wave.ok = false; dump(r17Prev ?? white, time - 1 / 30, 'the step before the jump'); dump(white, time, 'the jump'); (wave as unknown as { why: string }).why = `jump ${ff(u(wave.endX))}>${ff(u(far))} +${ff(time - wave.start, 1)}s, runs ${mine.length}, nEnd ${ff(poolStraightFrame(wave.endX, wave.zNow).n, 1)}`; }
      else if (toward * (far - wave.endX) > 0) { wave.endX = far; wave.track.push([time, u(far)]); }
      const farCol = toward < 0 ? main.low : main.high;
      const uFar = u(far);
      if (sample && wave.ok && time > settle + 1 && uFar >= BARREL[0] && uFar <= BARREL[1] - AT.tail && white[farCol] === white[farCol]) {
        AHEAD.forEach((ahead, k) => {
          const col = Math.round((s.side * (reefLine.startX - (uFar + ahead) * cosPhi) - xCenters[0]) / solver.dx);
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
  for (const wave of active) if (time - wave.seen > FRAME + 1e-9) { if (wave.ok) (wave as unknown as { why: string }).why = `lost +${ff(time - wave.start, 1)}s`; wave.ok = false; }
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
  first: number; firstS: number; firstTau: number; last: number; reached?: number; s: number; n: number; footHeight: number; footDepth: number;
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
/** Step 6: each point's drawn and kept place last step, and their moves in one step in the wave's frame, m. */
const S6_LAST = new Map<number, { t: number; x: number; z: number; drawn: number; kept: number }>();
const S6 = { drawnPre: [] as number[], drawnOpen: [] as number[], keptPre: [] as number[], keptOpen: [] as number[] };
function crestMoves(time: number): void {
  if (!front) return;
  const seen = new Set<number>();
  for (const p of front.points) {
    const q = p as unknown as { id: number; x: number; z: number; tau: number; anchorShift?: number; anchorDrawn?: number; anchorRayX?: number; anchorRayZ?: number; wallSpeed?: number };
    seen.add(q.id);
    const kept = q.anchorShift ?? Number.NaN;
    const drawn = q.anchorDrawn ?? kept;
    const last = S6_LAST.get(q.id);
    if (last && time >= 60 && time <= 270 && q.anchorRayX !== undefined && q.wallSpeed !== undefined) {
      const dt = time - last.t;
      const moved = (q.x - last.x) * q.anchorRayX + (q.z - last.z) * q.anchorRayZ!;
      const dDrawn = Math.abs(moved + drawn - last.drawn - q.wallSpeed * dt);
      const dKept = Math.abs(moved + kept - last.kept - q.wallSpeed * dt);
      if (dDrawn === dDrawn) (q.tau < 0 ? S6.drawnPre : S6.drawnOpen).push(dDrawn);
      if (dKept === dKept) (q.tau < 0 ? S6.keptPre : S6.keptOpen).push(dKept);
    }
    S6_LAST.set(q.id, { t: time, x: q.x, z: q.z, drawn, kept });
  }
  for (const id of [...S6_LAST.keys()]) if (!seen.has(id)) S6_LAST.delete(id);
}
function crestMovesReport(): void {
  const sorted = (v: number[]) => [...v].sort((a, b) => a - b);
  const line = (v: number[]) => { const s = sorted(v); const at = (f: number) => s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : Number.NaN; return `${at(0.5).toFixed(4)}/${at(0.9).toFixed(4)}/${at(0.99).toFixed(4)}/${at(0.999).toFixed(4)}, largest ${(s.at(-1) ?? Number.NaN).toFixed(4)} (${s.length})`; };
  console.log(`\n=== step 6, the crest's move in one step in the wave's frame, per front point, 60-270 s (median / 90 % / 99 % / 99.9 %, largest; m) ===`);
  console.log(`   the drawn place (the records' anchor): before the throw ${line(S6.drawnPre)}; from the throw ${line(S6.drawnOpen)}`);
  console.log(`   the kept shift (anchorShift):          before the throw ${line(S6.keptPre)}; from the throw ${line(S6.keptOpen)}`);
}
/** After each step: follow the front's points (`sim.front.points`, as the crash was handed them). */
function followFront(time: number): void {
  if (!front || !crash) return;
  const fresh: Fate[] = [];
  for (const p of front.points) {
    let f = fates.get(p.id);
    const frame = poolStraightFrame(p.x, p.z);
    if (!f) { f = { first: time, firstS: frame.s, firstTau: p.tau, last: time, s: frame.s, n: frame.n, footHeight: p.footHeight, footDepth: p.footDepth }; fates.set(p.id, f); }
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


// ---- r17: the seam's readings (every frame from 60 s).
const R17 = { preAlpha: [] as number[], preSlope: [] as number[], openStep: [] as number[], openStepAcross: [] as number[], firstTau: [] as number[], lead: [] as number[], fronts: [] as number[],
  kinkOpen: [] as number[], kinkPre: [] as number[], paceStep: [] as number[], footStep: [] as number[],
  byTau: new Map<number, { rise: number[]; height: number[]; slope: number[]; n: number }>(),  };
const r17Seen = new Set<number>();
const r17Profile = new Float32Array(2 * 128);
/** The share's course in use (`TubeFace.seam`): its ends for a point's foot depth, s; and the share by the clock. */
const seam5 = sim.tubeFace?.seam as undefined | { tau: readonly [number, number]; depth?: readonly [number, number] };
const courseOf = (footDepth: number): [number, number] => (seam5?.depth ? [seam5.depth[0] * Math.sqrt(footDepth / GRAVITY), seam5.depth[1] * Math.sqrt(footDepth / GRAVITY)] : seam5 ? [seam5.tau[0], seam5.tau[1]] : [-1e9, -1e9 + 1]);
const alphaOf = (tau: number, footDepth: number) => { const c = courseOf(footDepth); return seamTauWeight(tau, c[0], c[1]); };
const J4 = { rise: [] as number[], height: [] as number[], slope: [] as number[], sea: [] as number[] };
const R18 = { spans: [0.5, 1, 2, 4], q: new Map<string, number[]>(), tau: new Map<number, { caseCrest: number[]; seaCrest: number[]; seaH: number[]; str: number[]; seaSlope: number[]; caseH: number[] }>() };
const r18push = (key: string, v: number) => { if (v === v && Number.isFinite(v)) { const l = R18.q.get(key) ?? []; l.push(v); R18.q.set(key, l); } };
const TAU_BINS = [-2.5, -1.75, -1.25, -0.75, -0.5, -0.25, 0, 0.3];
function seamRead(): void {
  if (!front || !library || slopeOf === undefined) return;
  const byFront = new Map<number, typeof front.points>();
  for (const p of front.points) {
    if (!r17Seen.has(p.id)) { r17Seen.add(p.id); R17.firstTau.push(p.tau); }
    const list = byFront.get(p.front) ?? []; list.push(p); byFront.set(p.front, list);
    // The case's shape at this point's clock against the sea under it.
    if (p.tau < 0.3 && p.footHeight > 0) {
      let k = 0; while (k < TAU_BINS.length - 2 && p.tau >= TAU_BINS[k + 1]) k += 1;
      const bin = R17.byTau.get(k) ?? { rise: [], height: [], slope: [], n: 0 };
      library.profileAt({ slope: slopeOf, footHeight: p.footHeight, footDepth: p.footDepth, seconds: p.tau }, r17Profile);
      const cy = r17Profile[2 * 32 + 1]; const ty = Math.min(r17Profile[2 * 112 + 1], r17Profile[2 * 127 + 1]);
      // The face's steepest slope over points crest..toe, read between points at least 0.1 m apart.
      let steep = 0;
      for (let a = 32; a < 112; a += 1) for (let b2 = a + 1; b2 <= 112; b2 += 1) {
        const dx = r17Profile[2 * b2] - r17Profile[2 * a]; const dy = r17Profile[2 * b2 + 1] - r17Profile[2 * a + 1];
        if (Math.hypot(dx, dy) >= 0.25) { steep = Math.max(steep, (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI); break; }
      }
      const col = Math.round((p.x - xCenters[0]) / solver.dx); const row = solver.rowBelow(p.z);
      let seaCrest = -Infinity; let seaTrough = Infinity;
      for (let iz = Math.max(firstRow, row - 3); iz <= Math.min(nz - 1, row + 25); iz += 1) { const e = eta(iz * nx + col); if (iz <= row + 3) seaCrest = Math.max(seaCrest, e); seaTrough = Math.min(seaTrough, e); }
      { const b18 = R18.tau.get(k) ?? { caseCrest: [], seaCrest: [], seaH: [], str: [], seaSlope: [], caseH: [] };
        let st = 0; for (let iz = Math.max(firstRow, row - 3); iz <= Math.min(nz - 1, row + 8); iz += 1) st = Math.max(st, strength[iz * nx + col]);
        const sw = seaWall(col, p.z - 3, p.z + 3);
        b18.caseCrest.push(cy); b18.seaCrest.push(seaCrest); b18.seaH.push(seaCrest - seaTrough); b18.str.push(st); b18.caseH.push(cy - ty); if (sw) b18.seaSlope.push(sw.slope);
        R18.tau.set(k, b18); }
      bin.rise.push(cy - seaCrest); bin.height.push((cy - ty) / Math.max(0.05, seaCrest - seaTrough)); bin.slope.push(steep); bin.n += 1;
      // J4: where the share is 0.05 (read on 0.02 to 0.10).
      const share = alphaOf(p.tau, p.footDepth);
      if (share >= 0.02 && share <= 0.1) { J4.rise.push(cy - seaCrest); J4.height.push((cy - ty) / Math.max(0.05, seaCrest - seaTrough)); J4.slope.push(steep); }
      R17.byTau.set(k, bin);
    }
  }
  let onReef = 0;
  for (const list of byFront.values()) {
    list.sort((a, b2) => a.sigma - b2.sigma);
    if (list.some((p) => p.tau >= 0 && p.tau < 0.87)) onReef += 1;
    for (let k = 1; k < list.length; k += 1) {
      const a = list[k - 1]; const b2 = list[k]; const ds = b2.sigma - a.sigma;
      if (!(ds > 0) || ds > 1.6) continue;
      const ca = courseOf(a.footDepth);
      if (a.tau > ca[0] - 0.1 && a.tau < ca[1] + 0.1 && b2.tau > ca[0] - 0.1 && b2.tau < ca[1] + 0.1) { R17.preAlpha.push(Math.abs(alphaOf(a.tau, a.footDepth) - alphaOf(b2.tau, b2.footDepth))); R17.preSlope.push(Math.abs(a.tau - b2.tau) / ds); }
      if (a.tau >= 0 && a.tau < 0.87 && b2.tau >= 0 && b2.tau < 0.87) R17.openStep.push(Math.abs(a.tau - b2.tau) / ds);
    }
    for (let k = 2; k < list.length; k += 1) {
      const a = list[k - 2]; const b2 = list[k - 1]; const c = list[k];
      if (c.sigma - a.sigma > 3.2) continue;
      const open3 = [a, b2, c].every((p) => p.tau >= 0 && p.tau < 0.87);
      const pre3 = [a, b2, c].every((p) => p.tau < 0 && p.tau > courseOf(p.footDepth)[0] - 0.1);
      if (!open3 && !pre3) continue;
      const w = (b2.sigma - a.sigma) / Math.max(1e-6, c.sigma - a.sigma);
      const kinkZ = Math.abs(b2.z - (a.z + w * (c.z - a.z)));
      (open3 ? R17.kinkOpen : R17.kinkPre).push(kinkZ);
      if (open3 && a.jetPace !== undefined && b2.jetPace !== undefined) R17.paceStep.push(Math.abs(a.jetPace - b2.jetPace));
      if (open3) R17.footStep.push(Math.abs(a.footHeight - b2.footHeight));
    }
    // The formed wall this front carries ahead of its throw: sigma from the point nearest tau 0 to its youngest end.
    const pre = list.filter((p) => p.tau < 0);
    if (pre.length && list.some((p) => p.tau >= 0)) R17.lead.push(pre.length * (list.length > 1 ? (list[list.length - 1].sigma - list[0].sigma) / (list.length - 1) : 1));
  }
  // Two fronts' open points that stand within 2 m of each other: their clocks' difference.
  const open = front.points.filter((p) => p.tau >= 0 && p.tau < 0.87);
  for (let a = 0; a < open.length; a += 1) for (let b2 = a + 1; b2 < open.length; b2 += 1) {
    if (open[a].front === open[b2].front) continue;
    if (Math.hypot(open[a].x - open[b2].x, open[a].z - open[b2].z) <= 2) R17.openStepAcross.push(Math.abs(open[a].tau - open[b2].tau));
  }
  R17.fronts.push(onReef);
}
function seamReport(): void {
  const share = (v: number[], over: number) => `${f((100 * v.filter((x) => x > over).length) / Math.max(1, v.length), 1)} %`;
  console.log(`\n=== r17, the seam (frames from 60 s) ===`);
  console.log(`points' clock when first seen: ${range(R17.firstTau)} s (${R17.firstTau.length} points)`);
  console.log(`formed wall ahead of the throw along the crest (points with tau < 0 on a front that has thrown): ${range(R17.lead, 1)} m (${R17.lead.length} frames)`);
  console.log(`neighbours in the share's course (its ends -0.1 s and +0.1 s): clock slope ${range(R17.preSlope, 3)} s/m; the share's step between neighbours ${range(R17.preAlpha, 3)}, over 0.2 ${share(R17.preAlpha, 0.2)}, over 0.4 ${share(R17.preAlpha, 0.4)} (${R17.preAlpha.length} pairs)`);
  console.log(`neighbours in the open tube (0..0.87 s), same front: clock slope ${range(R17.openStep, 3)} s/m, over 0.3 s/m ${share(R17.openStep, 0.3)}, over 0.6 s/m ${share(R17.openStep, 0.6)} (${R17.openStep.length} pairs)`);
  console.log(`open points of two fronts within 2 m: ${R17.openStepAcross.length} pairs, clock difference ${range(R17.openStepAcross)} s, over 0.2 s ${share(R17.openStepAcross, 0.2)}; fronts with an open tube at once: ${range(R17.fronts)}, two or more ${share(R17.fronts, 1.5)} of ${R17.fronts.length} frames`);
  console.log(`three neighbours, the middle one's z off the line through the other two: open tube ${range(R17.kinkOpen)} m, over 0.5 m ${share(R17.kinkOpen, 0.5)}, over 1 m ${share(R17.kinkOpen, 1)}; in the tau course ${range(R17.kinkPre)} m, over 0.5 m ${share(R17.kinkPre, 0.5)}`);
  console.log(`open neighbours: jet pace step ${range(R17.paceStep)} m/s, over 1 m/s ${share(R17.paceStep, 1)}, over 2 m/s ${share(R17.paceStep, 2)}; foot crest step ${range(R17.footStep, 3)} m, over 0.1 m ${share(R17.footStep, 0.1)}`);
  for (const k of [...R17.byTau.keys()].sort((x, y) => x - y)) { const b2 = R17.byTau.get(k)!; console.log(`   tau ${TAU_BINS[k]}..${TAU_BINS[k + 1]} s: case crest over the sea's crest ${range(b2.rise)} m; case height / sea's wave height ${range(b2.height)}; case face steepest ${range(b2.slope, 0)} deg; ${b2.n} samples`); }
}
// ---- Step 5: the drawn surface, read without a rider (the contact's loft over the solver's plain surface).
const E5 = LOFT.extensionSamples;
const loft5 = library && slopeOf !== undefined && sim.tubeFace ? new SweptLoft(library, slopeOf, { contact: true, face: sim.tubeFace }) : undefined;
// Step 6, build 2 (`?loftMesh=arc`): the same loft without the arc spacing, built from the same records, to compare the two
// surfaces (the contact's and the collision's own): the curve must be the same to 0.005 m.
const arcOn = (sim.tubeFace as { arcMesh?: true } | undefined)?.arcMesh === true;
const loftPlain = arcOn && library && slopeOf !== undefined && sim.tubeFace
  ? new SweptLoft(library, slopeOf, { contact: true, face: (({ arcMesh: _arc, ...rest }: { arcMesh?: true }) => rest)(sim.tubeFace as { arcMesh?: true }) as typeof sim.tubeFace }) : undefined;
const ARC = { before: [] as number[], back: [] as number[], thrown: 0, outside: 0, mismatched: 0, slices: 0, snaps: 0 };
/** A point's distance from a slice's polyline between two vertex columns, m. */
function offPolyline(px: number, py: number, pz: number, pos: Float32Array, row: number, from: number, to: number): number {
  let best = Infinity;
  for (let j = from; j < to; j += 1) {
    const o = 3 * (row + j); const ax = pos[o]; const ay = pos[o + 1]; const az = pos[o + 2];
    const bx = pos[o + 3] - ax; const by = pos[o + 4] - ay; const bz = pos[o + 5] - az;
    const l2 = bx * bx + by * by + bz * bz;
    const u = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * bx + (py - ay) * by + (pz - az) * bz) / l2)) : 0;
    const d = Math.hypot(px - ax - u * bx, py - ay - u * by, pz - az - u * bz);
    if (d < best) best = d;
  }
  return best;
}
function arcCompare(time: number, r: { sliceCount: number; positions: Float32Array; sliceTau: Float32Array; sliceWeight: Float32Array; sliceSigma: Float32Array }, count: number): void {
  if (!loftPlain || time < 60 || time > 270) return;
  const mine = r.positions.slice(0, 3 * r.sliceCount * LOFT_SAMPLES);
  const tau = r.sliceTau.slice(0, r.sliceCount); const weight = r.sliceWeight.slice(0, r.sliceCount); const sigma = r.sliceSigma.slice(0, r.sliceCount);
  const q = loftPlain.build(records5, count, solver.restLevel, plain);
  ARC.snaps += 1;
  if (q.sliceCount !== tau.length) { ARC.mismatched += 1; return; }
  const from = LOFT.extensionSamples + 32; const to = LOFT.extensionSamples + 112;
  for (let k = 0; k < q.sliceCount; k += 1) {
    if (q.sliceSigma[k] !== sigma[k] || q.sliceTau[k] !== tau[k]) { ARC.mismatched += 1; continue; }
    const row = k * LOFT_SAMPLES;
    let moved = 0; let outside = 0;
    for (let j = 0; j < LOFT_SAMPLES; j += 1) {
      const o = 3 * (row + j);
      const d = Math.max(Math.abs(mine[o] - q.positions[o]), Math.abs(mine[o + 1] - q.positions[o + 1]), Math.abs(mine[o + 2] - q.positions[o + 2]));
      if (j > from && j < to) moved = Math.max(moved, d); else outside = Math.max(outside, d);
    }
    if (outside > ARC.outside) ARC.outside = outside;
    if (!(tau[k] < 0)) { if (moved > ARC.thrown) ARC.thrown = moved; continue; }
    if (!(weight[k] > 0)) continue;
    ARC.slices += 1;
    // Each way: the arc loft's vertices off the plain loft's polyline, and the plain loft's vertices off the arc loft's.
    let a = 0; let b = 0;
    for (let j = from; j <= to; j += 1) {
      const o = 3 * (row + j);
      a = Math.max(a, offPolyline(mine[o], mine[o + 1], mine[o + 2], q.positions, row, from, to));
      b = Math.max(b, offPolyline(q.positions[o], q.positions[o + 1], q.positions[o + 2], mine, row, from, to));
    }
    ARC.before.push(a); ARC.back.push(b);
  }
}
function arcReport(): void {
  if (!loftPlain) return;
  const q = (v: number[], p: number) => { if (!v.length) return Number.NaN; const s2 = [...v].sort((x, y) => x - y); return s2[Math.min(s2.length - 1, Math.floor(p * s2.length))]; };
  const line = (v: number[]) => `${q(v, 0.5).toFixed(4)}/${q(v, 0.9).toFixed(4)}/${q(v, 0.99).toFixed(4)}, largest ${Math.max(0, ...v).toFixed(4)}, over 0.005 m on ${(100 * v.filter((x) => x > 0.005).length / Math.max(1, v.length)).toFixed(2)} %`;
  console.log(`=== step 6, build 2: the contact's surface with the arc spacing against the same loft without it (same records; ${ARC.snaps} frames 60-270 s; ${ARC.slices} slices before the throw with weight) ===`);
  console.log(`   before the throw, crest to toe, per slice the largest distance (median / 90 % / 99 %; m): the arc loft's vertices off the plain loft's polyline ${line(ARC.before)}; the plain loft's vertices off the arc loft's polyline ${line(ARC.back)}`);
  console.log(`   from the throw on, the largest vertex move ${ARC.thrown.toFixed(6)} m; outside crest to toe (any clock) ${ARC.outside.toFixed(6)} m; slices that did not pair ${ARC.mismatched}`);
}
const records5 = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
const plain = (x: number, z: number) => solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
interface Pt { x: number; z: number; sigma: number; tau: number; front: number; footDepth: number }
interface Snap {
  t: number; n: number; front: Int32Array; sigma: Float32Array; tau: Float32Array; rayX: Float32Array; rayZ: Float32Array; weight: Float32Array; over: Uint8Array;
  pos: Float32Array; a: Float32Array; shift: Float32Array; share?: Float32Array; byFront: Map<number, number[]>; points: Map<number, Pt>;
}
function snap(time: number): Snap | undefined {
  if (!loft5 || !front) return undefined;
  const count = sim.writeTubeRecords(records5);
  const r = loft5.build(records5, count, solver.restLevel, plain);
  arcCompare(time, r, count);
  const n = r.sliceCount; const V = n * LOFT_SAMPLES;
  const pos = r.positions.slice(0, 3 * V); const a = new Float32Array(V);
  for (let v = 0; v < V; v += 1) a[v] = pos[3 * v + 1] - plain(pos[3 * v], pos[3 * v + 2]);
  const byFront = new Map<number, number[]>();
  for (let k = 0; k < n; k += 1) { const list = byFront.get(r.sliceFront[k]) ?? []; list.push(k); byFront.set(r.sliceFront[k], list); }
  const sigma = r.sliceSigma.slice(0, n);
  for (const list of byFront.values()) list.sort((x, y) => sigma[x] - sigma[y]);
  const points = new Map<number, Pt>();
  for (const p of front.points) points.set(p.id, { x: p.x, z: p.z, sigma: p.sigma, tau: p.tau, front: p.front, footDepth: p.footDepth });
  return { t: time, n, front: r.sliceFront.slice(0, n), sigma, tau: r.sliceTau.slice(0, n), rayX: r.sliceRayX.slice(0, n), rayZ: r.sliceRayZ.slice(0, n), weight: r.sliceWeight.slice(0, n),
    over: r.sliceOverturned.slice(0, n), pos, a, shift: r.sliceShift.slice(0, n), ...(r.wall?.seam ? { share: r.wall.seam.slice(0, V) } : {}), byFront, points };
}
/** On slice k, the added height (`a`) or the drawn height (`y`) where its ray coordinate from (px, pz) is rho; the highest where it folds. */
function onSlice(sn: Snap, k: number, px: number, pz: number, rho: number, what: 'a' | 'y'): number {
  const rx = sn.rayX[k]; const rz = sn.rayZ[k]; let best = Number.NaN; let prev = 0; let prevValue = 0;
  for (let j = 0; j < LOFT_SAMPLES; j += 1) {
    const v = k * LOFT_SAMPLES + j;
    const c = (sn.pos[3 * v] - px) * rx + (sn.pos[3 * v + 2] - pz) * rz; const value = what === 'a' ? sn.a[v] : sn.pos[3 * v + 1];
    if (j > 0 && c !== prev && (prev - rho) * (c - rho) <= 0) { const y = prevValue + ((rho - prev) / (c - prev)) * (value - prevValue); if (!(best >= y)) best = y; }
    prev = c; prevValue = value;
  }
  return best;
}
/** The two slices of a front that bracket sigma (at most 0.8 m apart), and the weight of the second. */
function bracket(sn: Snap, frontId: number, sigma: number): [number, number, number] | undefined {
  const list = sn.byFront.get(frontId);
  if (!list || list.length < 2) return undefined;
  for (let m = 1; m < list.length; m += 1) {
    const s0 = sn.sigma[list[m - 1]]; const s1 = sn.sigma[list[m]];
    if (sigma >= s0 && sigma <= s1) return s1 - s0 > 0.8 || !(s1 > s0) ? undefined : [list[m - 1], list[m], (sigma - s0) / (s1 - s0)];
  }
  return undefined;
}
const addedAt = (sn: Snap, frontId: number, sigma: number, px: number, pz: number, rho: number): number => {
  const b = bracket(sn, frontId, sigma);
  return b ? (1 - b[2]) * onSlice(sn, b[0], px, pz, rho, 'a') + b[2] * onSlice(sn, b[1], px, pz, rho, 'a') : Number.NaN;
};
/** A slice's face as drawn: its steepest slope from the crest on (spans of at least 0.25 m), deg; its highest and, ahead of the crest, lowest vertex over the rest level, m. */
function sliceFace(sn: Snap, k: number): { steep: number; crest: number; trough: number } {
  const o = k * LOFT_SAMPLES; let steep = 0; let crest = -Infinity; let trough = Infinity;
  for (let j = 0; j < LOFT_SAMPLES; j += 1) crest = Math.max(crest, sn.pos[3 * (o + j) + 1]);
  for (let a = E5 + LANDMARK.crest; a < LOFT_SAMPLES - 1; a += 1) {
    trough = Math.min(trough, sn.pos[3 * (o + a) + 1]);
    for (let b = a + 1; b < LOFT_SAMPLES; b += 1) {
      const run = Math.hypot(sn.pos[3 * (o + b)] - sn.pos[3 * (o + a)], sn.pos[3 * (o + b) + 2] - sn.pos[3 * (o + a) + 2]); const rise = sn.pos[3 * (o + b) + 1] - sn.pos[3 * (o + a) + 1];
      if (Math.hypot(run, rise) >= 0.25) { steep = Math.max(steep, (Math.atan2(Math.abs(rise), run) * 180) / Math.PI); break; }
    }
  }
  return { steep, crest: crest - solver.restLevel, trough: trough - solver.restLevel };
}
const S5 = {
  j1Share: [] as number[], j1All: [] as number[], j2On: [] as number[], j2Full: [] as number[], j2Mid: [] as number[], j2CrestOn: [] as number[], j2CrestFull: [] as number[],
  j3Height: [] as number[], j3Slope: [] as number[], slices: [] as number[], courseSlices: [] as number[],
  wall: [] as { k: number; has: boolean; seaH: number; seaSlope: number; drawnH: number; drawnSlope: number; share: number; tau: number }[],
  rise: [] as number[], riseOld: [] as number[], riseBefore: [] as number[], riseAfter: [] as number[], speed: [] as number[], footDepth: [] as number[], frames: 0, pairs: 0,
};
const AHEAD5 = [5, 10, 20, 30];
const RISE_LAG = 3;
const RISE_AT = [0, 0.5, 1, 1.5, 2, 2.5, 3];
let snapA: Snap | undefined;
const placesBefore: Map<number, Pt>[] = [];
/** The sea's wave in a column: its crest between two z, its height over the trough 25 m on, and its steepest slope within 12 m of the crest (E's reading). */
function seaWall(col: number, zFrom: number, zTo: number): { crest: number; trough: number; slope: number } | undefined {
  if (col < 1 || col > nx - 2) return undefined;
  let crestRow = -1; let crest = -Infinity;
  for (let iz = Math.max(firstRow, solver.rowBelow(zFrom)); iz <= Math.min(nz - 2, solver.rowBelow(zTo)); iz += 1) { const e = eta(iz * nx + col); if (e > crest) { crest = e; crestRow = iz; } }
  if (crestRow < 1) return undefined;
  let trough = Infinity; let steep = 0;
  for (let iz = crestRow; iz <= nz - 2 && zCenters[iz] <= zCenters[crestRow] + 25; iz += 1) {
    const i = iz * nx + col;
    if (solver.h[i] < 0.05) break;
    const e = eta(i);
    if (e < trough) trough = e;
    if (zCenters[iz] <= zCenters[crestRow] + 12) steep = Math.max(steep, Math.hypot((eta(i + 1) - eta(i - 1)) / (2 * solver.dx), (eta(i + nx) - eta(i - nx)) / (zCenters[iz + 1] - zCenters[iz - 1])));
  }
  return { crest, trough, slope: (Math.atan(steep) * 180) / Math.PI };
}
const R18_KEYS = ['tau', 'shift', 'crest', 'crestRho', 's1', 's2', 'seaC', 'seaRho'] as const;
const R18_RHOS = [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6];
function ribsRead(sn: Snap): void {
  const pts = new Map<number, Pt[]>();
  for (const p of sn.points.values()) { const l = pts.get(p.front) ?? []; l.push(p); pts.set(p.front, l); }
  for (const l of pts.values()) l.sort((a, b) => a.sigma - b.sigma);
  const placeAt = (id: number, sigma: number) => {
    const l = pts.get(id); if (!l || l.length < 2) return undefined;
    for (let m = 1; m < l.length; m += 1) if (sigma >= l[m - 1].sigma && sigma <= l[m].sigma && l[m].sigma > l[m - 1].sigma) { const w = (sigma - l[m - 1].sigma) / (l[m].sigma - l[m - 1].sigma); return { x: l[m - 1].x + w * (l[m].x - l[m - 1].x), z: l[m - 1].z + w * (l[m].z - l[m - 1].z), footDepth: l[m].footDepth }; }
    return undefined;
  };
  for (const [id, list] of sn.byFront) {
    const vals = list.map((k) => {
      if (sn.over[k] || !(sn.weight[k] > 0.99) || !(sn.tau[k] < 0)) return undefined;
      const P = placeAt(id, sn.sigma[k]); if (!P) return undefined;
      const o = k * LOFT_SAMPLES; let crest = -Infinity; let jc = 0;
      for (let j = 0; j < LOFT_SAMPLES; j += 1) if (sn.pos[3 * (o + j) + 1] > crest) { crest = sn.pos[3 * (o + j) + 1]; jc = j; }
      const rx = sn.rayX[k]; const rz = sn.rayZ[k];
      let seaC = -Infinity; let seaRho = 0;
      for (let rho = -4; rho <= 4; rho += 0.25) { const y = plain(P.x + rho * rx, P.z + rho * rz); if (y > seaC) { seaC = y; seaRho = rho; } }
      return { sigma: sn.sigma[k], tau: sn.tau[k], shift: sn.shift[k], share: alphaOf(sn.tau[k], P.footDepth), crest, crestRho: (sn.pos[3 * (o + jc)] - P.x) * rx + (sn.pos[3 * (o + jc) + 2] - P.z) * rz,
        s1: plain(P.x + rx, P.z + rz), s2: plain(P.x + 2 * rx, P.z + 2 * rz), seaC, seaRho, a: R18_RHOS.map((rho) => onSlice(sn, k, P.x, P.z, rho, 'a')), band: '' };
    });
    for (let m = 0; m < list.length; m += 1) {
      const c = vals[m]; if (!c) continue;
      c.band = c.share <= 0 ? 'none' : c.share < 0.5 ? 'low' : c.share < 1 ? 'high' : 'whole';
      R18_RHOS.forEach((rho, i) => r18push(`${c.band}|val|a${i}`, c.a[i]));
      r18push(`${c.band}|val|shift`, c.shift); r18push(`${c.band}|val|crestRho`, c.crestRho); r18push(`${c.band}|val|seaRho`, c.seaRho);
      for (const d of R18.spans) {
        let a; let b;
        for (let i = m - 1; i >= 0; i -= 1) { const v = vals[i]; if (!v) break; if (c.sigma - v.sigma >= d - 0.3) { if (c.sigma - v.sigma <= d + 0.3) a = v; break; } }
        for (let i = m + 1; i < list.length; i += 1) { const v = vals[i]; if (!v) break; if (v.sigma - c.sigma >= d - 0.3) { if (v.sigma - c.sigma <= d + 0.3) b = v; break; } }
        if (!a || !b) continue;
        const w = (c.sigma - a.sigma) / (b.sigma - a.sigma);
        const band = c.share <= 0 ? 'none' : c.share < 0.5 ? 'low' : c.share < 1 ? 'high' : 'whole';
        for (const key of R18_KEYS) r18push(`${band}|${d}|${key}`, Math.abs(c[key] - (a[key] + w * (b[key] - a[key]))));
        let worst = 0;
        R18_RHOS.forEach((rho, i) => { const kk = Math.abs(c.a[i] - (a.a[i] + w * (b.a[i] - a.a[i]))); r18push(`${band}|${d}|a${i}`, kk); if (kk === kk && kk > worst) worst = kk; });
        r18push(`${band}|${d}|worst`, worst);
      }
    }
  }
}
const FOLD_TAU = [-1.7, -1.0, -0.5, -0.15, 0.15, 0.5, 0.9];
const FOLD_SEG: [string, number, number][] = [['back-crest', 0, 32], ['crest-lip', 32, 64], ['lip-throat', 64, 88], ['throat-toe', 88, 112], ['toe-front', 112, 126]];
const FOLD = new Map<string, number[]>();
/** The crease along a slice line: the angle between the quads on its two sides (same profile index), the largest per profile segment. */
function foldRead(sn: Snap): void {
  const P = (k: number, j: number, c: number) => sn.pos[3 * (k * LOFT_SAMPLES + E5 + j) + c];
  const normal = (k: number, k2: number, j: number): [number, number, number] => {
    const ax = P(k, j + 1, 0) - P(k, j, 0); const ay = P(k, j + 1, 1) - P(k, j, 1); const az = P(k, j + 1, 2) - P(k, j, 2);
    const bx = P(k2, j, 0) - P(k, j, 0); const by = P(k2, j, 1) - P(k, j, 1); const bz = P(k2, j, 2) - P(k, j, 2);
    return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  };
  for (const list of sn.byFront.values()) for (let m = 2; m < list.length; m += 1) {
    const k0 = list[m - 2]; const k1 = list[m - 1]; const k2 = list[m];
    const d0 = sn.sigma[k1] - sn.sigma[k0]; const d1 = sn.sigma[k2] - sn.sigma[k1];
    if (!(d0 >= 0.2 && d0 <= 0.8 && d1 >= 0.2 && d1 <= 0.8) || !(sn.weight[k0] > 0.99 && sn.weight[k1] > 0.99 && sn.weight[k2] > 0.99)) continue;
    const tau = sn.tau[k1]; if (!(tau >= FOLD_TAU[0] && tau < FOLD_TAU[FOLD_TAU.length - 1])) continue;
    let bin = 0; while (bin < FOLD_TAU.length - 2 && tau >= FOLD_TAU[bin + 1]) bin += 1;
    for (const [name, from, to] of FOLD_SEG) {
      let worst = 0;
      for (let j = from; j < to; j += 1) {
        const a = normal(k0, k1, j); const b = normal(k1, k2, j);
        const la = Math.hypot(a[0], a[1], a[2]); const lb = Math.hypot(b[0], b[1], b[2]);
        if (!(la > 1e-9 && lb > 1e-9)) continue;
        const ang = (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb)))) * 180) / Math.PI;
        if (ang > worst) worst = ang;
      }
      const key = `${bin}|${name}`; const l = FOLD.get(key) ?? []; l.push(worst); FOLD.set(key, l);
    }
  }
}
function foldReport(): void {
  const q = (v: number[], p: number) => { if (!v.length) return Number.NaN; const s2 = [...v].sort((x, y) => x - y); return s2[Math.min(s2.length - 1, Math.floor(p * s2.length))]; };
  console.log(`=== r18, the crease along a slice line: the angle between the drawn quads on a slice's two sides (slices about 0.5 m apart), the largest per profile segment; median / 90 % / 99 % deg, share over 45 deg, over 90 deg; by the middle slice's clock ===`);
  for (let bin = 0; bin < FOLD_TAU.length - 1; bin += 1) console.log(`   tau ${FOLD_TAU[bin]}..${FOLD_TAU[bin + 1]} s: ` + FOLD_SEG.map(([name]) => { const v = FOLD.get(`${bin}|${name}`) ?? []; return `${name} ${q(v, 0.5).toFixed(0)}/${q(v, 0.9).toFixed(0)}/${q(v, 0.99).toFixed(0)}, ${(100 * v.filter((x) => x > 45).length / Math.max(1, v.length)).toFixed(1)} %, ${(100 * v.filter((x) => x > 90).length / Math.max(1, v.length)).toFixed(1)} %`; }).join('; ') + ` (${(FOLD.get(`${bin}|crest-lip`) ?? []).length})`);
}
function r18Report(): void {
  const q = (v: number[], p: number) => { if (!v.length) return Number.NaN; const s2 = [...v].sort((x, y) => x - y); return s2[Math.min(s2.length - 1, Math.floor(p * s2.length))]; };
  console.log(`\n=== r18, ribs: the middle of three slices off the line through the two at +-d along the crest (median / 90 % / 99 %), by the share at the middle slice (low: under 0.5; high: 0.5 to 1; whole: 1, before the throw) ===`);
  console.log(`keys: tau s (slice clock); crest m (drawn crest height); crestRho m (drawn crest's place along the ray from the front point); y1, y2 m (drawn height 1 and 2 m ahead of the front point); a1 (added height over the sea 1 m ahead); s1, s2 m (the sea alone there); seaC m, seaRho m (the sea's own crest within 4 m: height, place)`);
  for (const band of ['low', 'high', 'whole']) for (const d of R18.spans) {
    console.log(`  ${band} d ${d} m, added height off the line: worst place on the slice ${q(R18.q.get(`${band}|${d}|worst`) ?? [], 0.5).toFixed(3)}/${q(R18.q.get(`${band}|${d}|worst`) ?? [], 0.9).toFixed(3)}/${q(R18.q.get(`${band}|${d}|worst`) ?? [], 0.99).toFixed(3)}; by rho (m ahead of the front point) median/90 %: ` + R18_RHOS.map((rho, i) => { const v = R18.q.get(`${band}|${d}|a${i}`) ?? []; return `${rho}: ${q(v, 0.5).toFixed(3)}/${q(v, 0.9).toFixed(3)}`; }).join('; '));
    console.log(`  ${band} d ${d} m: ` + R18_KEYS.map((key) => { const v = R18.q.get(`${band}|${d}|${key}`) ?? []; return `${key} ${q(v, 0.5).toFixed(3)}/${q(v, 0.9).toFixed(3)}/${q(v, 0.99).toFixed(3)}`; }).join('; ') + ` (${(R18.q.get(`${band}|${d}|tau`) ?? []).length})`);
  }
  for (const band of ['low', 'high', 'whole']) console.log(`  ${band}: the added height itself by rho, median: ` + R18_RHOS.map((rho, i) => `${rho}: ${q(R18.q.get(`${band}|val|a${i}`) ?? [], 0.5).toFixed(2)}`).join('; ') + `; shift ${q(R18.q.get(`${band}|val|shift`) ?? [], 0.5).toFixed(2)} (10-90 %: ${q(R18.q.get(`${band}|val|shift`) ?? [], 0.1).toFixed(2)} to ${q(R18.q.get(`${band}|val|shift`) ?? [], 0.9).toFixed(2)}) m; drawn crest's rho ${q(R18.q.get(`${band}|val|crestRho`) ?? [], 0.5).toFixed(2)} (10-90 %: ${q(R18.q.get(`${band}|val|crestRho`) ?? [], 0.1).toFixed(2)} to ${q(R18.q.get(`${band}|val|crestRho`) ?? [], 0.9).toFixed(2)}); the sea's crest's rho ${q(R18.q.get(`${band}|val|seaRho`) ?? [], 0.5).toFixed(2)}`);
  console.log(`=== r18, by the clock: the case and the sea, absolute (median, 10-90 %) ===`);
  const rg = (v: number[], dg = 2) => `${q(v, 0.5).toFixed(dg)} (${q(v, 0.1).toFixed(dg)}-${q(v, 0.9).toFixed(dg)})`;
  for (const k of [...R18.tau.keys()].sort((x, y) => x - y)) { const b = R18.tau.get(k)!; console.log(`   tau ${TAU_BINS[k]}..${TAU_BINS[k + 1]} s: case crest over rest ${rg(b.caseCrest)} m, case height ${rg(b.caseH)} m; sea crest over rest ${rg(b.seaCrest)} m, sea height ${rg(b.seaH)} m, sea steepest ${rg(b.seaSlope, 0)} deg, breaking strength at the crest ${rg(b.str)} (over 0.3 in ${(100 * b.str.filter((x) => x > 0.3).length / Math.max(1, b.str.length)).toFixed(0)} %); ${b.str.length} samples`); }
  console.log(`=== r18, T3: the clock at which thrown points were first seen (points that reached their throw 60-270 s) ===`);
  const all = [...fates.values()].filter((v) => v.reached !== undefined && v.reached >= 60 && v.reached <= 270);
  for (const [label, l] of [['all that reached the throw', all], ['those that threw a jet', all.filter((v) => v.outcome === 'jet')]] as const) {
    const ft = l.map((v) => v.firstTau);
    console.log(`   ${label}: ${l.length}; first seen at ${rg(ft)} s; later than -1 s: ${(100 * ft.filter((x) => x > -1).length / Math.max(1, ft.length)).toFixed(1)} %; later than -0.5 s: ${(100 * ft.filter((x) => x > -0.5).length / Math.max(1, ft.length)).toFixed(1)} %; at or after the throw: ${(100 * ft.filter((x) => x >= 0).length / Math.max(1, ft.length)).toFixed(1)} %`);
  }
  const bins = new Map<number, number[]>();
  for (const v of all) { const key = Math.floor(v.s / 20) * 20; const l = bins.get(key) ?? []; l.push(v.firstTau); bins.set(key, l); }
  console.log('   per 20 m of s (count, share later than -1 s): ' + [...bins.keys()].sort((x, y) => x - y).map((key) => { const l = bins.get(key)!; return `s ${key}: ${l.length}, ${(100 * l.filter((x) => x > -1).length / l.length).toFixed(0)} %`; }).join('; '));
}
function drawnRead(time: number): void {
  const sn = snap(time);
  snapA = sn;
  if (!sn || !front) return;
  S5.frames += 1;
  ribsRead(sn); foldRead(sn);
  const depthOf = new Map<number, number>();
  for (const p of sn.points.values()) { if (!depthOf.has(p.front)) depthOf.set(p.front, p.footDepth); S5.footDepth.push(p.footDepth); }
  const shareOf = (k: number) => alphaOf(sn.tau[k], depthOf.get(sn.front[k]) ?? depthOf.values().next().value ?? shape.footDepth);
  let inCourse = 0;
  // J1 and J2: neighbouring slices along the crest (0.2 to 0.8 m apart, read per 0.5 m), where the share is in its course.
  for (const list of sn.byFront.values()) {
    for (let m = 1; m < list.length; m += 1) {
      const k0 = list[m - 1]; const k1 = list[m]; const ds = sn.sigma[k1] - sn.sigma[k0];
      if (!(ds >= 0.2 && ds <= 0.8) || sn.over[k0] || sn.over[k1] || !(sn.weight[k0] > 0) || !(sn.weight[k1] > 0)) continue;
      const s0 = shareOf(k0); const s1 = shareOf(k1);
      const moving = (s0 > 0 && s0 < 1) || (s1 > 0 && s1 < 1) || s0 !== s1;
      if (!moving) continue;
      inCourse += 1;
      let all = 0; let part = 0;
      for (let j = E5; j < E5 + PROFILE_POINTS; j += 1) {
        const a0 = sn.a[k0 * LOFT_SAMPLES + j]; const a1 = sn.a[k1 * LOFT_SAMPLES + j];
        all = Math.max(all, Math.abs(a1 - a0));
        // The share's own part: the case's height over the sea at a whole share (a / share), times the share's step.
        const whole = s0 > 0.02 && s1 > 0.02 ? 0.5 * (a0 / s0 + a1 / s1) : s1 > 0.02 ? a1 / s1 : s0 > 0.02 ? a0 / s0 : 0;
        part = Math.max(part, Math.abs(s1 - s0) * Math.max(0, whole));
      }
      S5.j1All.push((all * 0.5) / ds); S5.j1Share.push((part * 0.5) / ds);
      if (m >= 2) {
        const kb = list[m - 2]; const db = sn.sigma[k0] - sn.sigma[kb];
        if (db >= 0.2 && db <= 0.8 && !sn.over[kb] && sn.weight[kb] > 0) {
          let worst = 0; let atCrest = 0;
          for (let j = E5 + LANDMARK.crest; j <= E5 + LANDMARK.toe; j += 1) {
            const before = Math.atan((sn.a[k0 * LOFT_SAMPLES + j] - sn.a[kb * LOFT_SAMPLES + j]) / db); const after = Math.atan((sn.a[k1 * LOFT_SAMPLES + j] - sn.a[k0 * LOFT_SAMPLES + j]) / ds);
            const change = (Math.abs(after - before) * 180) / Math.PI;
            worst = Math.max(worst, change);
            if (j === E5 + LANDMARK.crest) atCrest = change;
          }
          (s0 <= 0.25 ? S5.j2On : s0 >= 0.75 ? S5.j2Full : S5.j2Mid).push(worst);
          if (s0 <= 0.25) S5.j2CrestOn.push(atCrest); else if (s0 >= 0.75) S5.j2CrestFull.push(atCrest);
        }
      }
    }
  }
  S5.slices.push(sn.n); S5.courseSlices.push(inCourse);
  // J3: across the crest, the first vertex with a share at each edge of the band (behind the crest and ahead of the face).
  if (sn.share) for (let k = 0; k < sn.n; k += 1) {
    if (sn.over[k] || !(sn.weight[k] > 0.99) || !(shareOf(k) > 0.05) || sn.tau[k] >= 0) continue;
    const o = k * LOFT_SAMPLES;
    const edge = (j: number, out: number) => {
      const run = Math.hypot(sn.pos[3 * (o + j)] - sn.pos[3 * (o + out)], sn.pos[3 * (o + j) + 2] - sn.pos[3 * (o + out) + 2]);
      S5.j3Height.push(Math.abs(sn.a[o + j])); S5.j3Slope.push((Math.atan2(Math.abs(sn.a[o + j] - sn.a[o + out]), Math.max(1e-6, run)) * 180) / Math.PI);
    };
    for (let j = E5 + 1; j <= E5 + LANDMARK.crest; j += 1) if (sn.share[o + j] > 0 && sn.share[o + j - 1] === 0) { edge(j, j - 1); break; }
    for (let j = LOFT_SAMPLES - 2; j >= E5 + LANDMARK.crest; j -= 1) if (sn.share[o + j] > 0 && sn.share[o + j + 1] === 0) { edge(j, j + 1); break; }
  }
  // The wall ahead of the throw, along the crest: from each front's leading thrown point.
  const fronts = new Map<number, Pt[]>();
  for (const p of sn.points.values()) { const list = fronts.get(p.front) ?? []; list.push(p); fronts.set(p.front, list); }
  for (const [id, list] of fronts) {
    list.sort((x, y) => u(x.x) - u(y.x));
    let lead = -1;
    for (let m = 0; m < list.length; m += 1) if (list[m].tau >= 0) lead = m;
    if (lead < 0 || lead === list.length - 1) continue;
    const from = list[lead]; const u0 = u(from.x);
    if (!(u0 >= BARREL[0] && u0 <= BARREL[1] - AT.tail)) continue;
    AHEAD5.forEach((ahead, k) => {
      const target = u0 + ahead;
      let place: { x: number; z: number; sigma: number; tau: number; footDepth: number } | undefined;
      for (let m = lead + 1; m < list.length; m += 1) {
        const a = list[m - 1]; const b = list[m]; const ua = u(a.x); const ub = u(b.x);
        if (target >= ua && target <= ub && ub > ua) { const w = (target - ua) / (ub - ua); place = { x: a.x + w * (b.x - a.x), z: a.z + w * (b.z - a.z), sigma: a.sigma + w * (b.sigma - a.sigma), tau: a.tau + w * (b.tau - a.tau), footDepth: b.footDepth }; break; }
      }
      const x = place ? place.x : s.side * (reefLine.startX - target * cosPhi);
      const col = Math.round((x - xCenters[0]) / solver.dx);
      const zBreak = from.z + poolStraightAt(target).z - poolStraightAt(u0).z;
      const sea = place ? seaWall(col, place.z - 3, place.z + 3) : seaWall(col, zBreak - ahead - 8, zBreak + 3);
      if (!sea) return;
      const b = place ? bracket(sn, id, place.sigma) : undefined;
      const k5 = b ? (b[2] < 0.5 ? b[0] : b[1]) : -1;
      if (k5 >= 0 && sn.weight[k5] > 0) {
        const face = sliceFace(sn, k5);
        S5.wall.push({ k, has: true, seaH: sea.crest - sea.trough, seaSlope: sea.slope, drawnH: Math.max(sea.crest, face.crest) - Math.min(sea.trough, face.trough), drawnSlope: face.steep, share: alphaOf(sn.tau[k5], place!.footDepth), tau: sn.tau[k5] });
      } else S5.wall.push({ k, has: false, seaH: sea.crest - sea.trough, seaSlope: sea.slope, drawnH: sea.crest - sea.trough, drawnSlope: sea.slope, share: 0, tau: place ? place.tau : Number.NaN });
    });
  }
  placesBefore.push(sn.points);
  if (placesBefore.length > 3) placesBefore.shift();
}
/** 0.1 s after a frame: how fast the drawn surface's height over the sea changed at places carried with the wave. */
function riseRead(time: number): void {
  const a = snapA;
  if (!a || placesBefore.length < 3) return;
  const b = snap(time);
  if (!b) return;
  const dt = time - a.t; const old = placesBefore[0]; const span = a.t - (placesBefore.length === 3 ? a.t - 2 * FRAME : a.t);
  // Each front's speed along its rays: its points' mean travel over the last two frames (0.5 s).
  const travel = new Map<number, number[]>();
  for (const [id, p] of a.points) {
    const before = old.get(id); const near = bracket(a, p.front, p.sigma);
    if (!before || !near || !(p.tau < 0)) continue;
    const list = travel.get(p.front) ?? []; list.push(((p.x - before.x) * a.rayX[near[0]] + (p.z - before.z) * a.rayZ[near[0]]) / span); travel.set(p.front, list);
  }
  for (const [id, p] of a.points) {
    const after = b.points.get(id); const list = travel.get(p.front);
    if (!after || after.front !== p.front || !list || list.length < 4 || !(p.tau < 0.3)) continue;
    const c = list.reduce((x, y) => x + y, 0) / list.length;
    const course = courseOf(p.footDepth);
    for (const rho of RISE_AT) {
      const h0 = addedAt(a, p.front, p.sigma, p.x, p.z, rho); const h1 = addedAt(b, after.front, after.sigma, p.x, p.z, rho + c * dt);
      if (!(h0 === h0 && h1 === h1) || Math.max(h0, h1) < 0.02) continue;
      const rate = Math.abs(h1 - h0) / dt;
      if (p.tau >= 0) S5.riseAfter.push(rate);
      else if (p.tau >= course[0]) S5.rise.push(rate); else S5.riseBefore.push(rate);
      if (p.tau >= -0.5 && p.tau < 0) S5.riseOld.push(rate);
    }
    S5.speed.push(c); S5.pairs += 1;
  }
}
function step5Report(): void {
  const over = (v: number[], bar: number) => `${f((100 * v.filter((x) => x > bar).length) / Math.max(1, v.length), 1)} %`;
  const top = (v: number[]) => f(v.reduce((x, y) => Math.max(x, y), 0), 3);
  const line = (v: number[], d = 3) => `median ${f(q(v, 0.5), d)}, 90 % ${f(q(v, 0.9), d)}, 95 % ${f(q(v, 0.95), d)}, most ${top(v)} (${v.length})`;
  console.log(`\n=== step 5, the join on the drawn surface (frames 60-270 s; ${S5.frames} frames; the share's course ${seam5 ? (seam5.depth ? `by depth, ${seam5.depth.join(' and ')} x sqrt(h0/g)` : `tau ${seam5.tau.join(' to ')} s`) : 'NONE (no seam blend)'}; `
    + `at the points' foot depth ${range(S5.footDepth)} m that is ${courseOf(q(S5.footDepth, 0.5)).map((v) => f(v, 2)).join(' to ')} s; slices per frame ${range(S5.slices, 0)}, pairs in the course per frame ${range(S5.courseSlices, 0)}) ===`);
  console.log(`J1, height step between slices 0.5 m apart along the crest, in the course (bar 0.05 m at 90 %, 0.10 m at most): from the share's step (the bar's reading) ${line(S5.j1Share)} m, over 0.05 ${over(S5.j1Share, 0.05)}, over 0.10 ${over(S5.j1Share, 0.1)}; `
    + `the whole step of the case's height over the sea (share and shape together) ${line(S5.j1All)} m, over 0.05 ${over(S5.j1All, 0.05)}, over 0.10 ${over(S5.j1All, 0.1)}`);
  console.log(`J2, change of the slope along the crest between such slices, the worst place on the face (bar 2 deg at 90 %, 4 at most, both ends): where the share starts (to 0.25) ${line(S5.j2On, 2)} deg, over 2 ${over(S5.j2On, 2)}, over 4 ${over(S5.j2On, 4)}; `
    + `where it ends (from 0.75) ${line(S5.j2Full, 2)} deg, over 2 ${over(S5.j2Full, 2)}, over 4 ${over(S5.j2Full, 4)}; between ${line(S5.j2Mid, 2)} deg; at the crest alone: start ${line(S5.j2CrestOn, 2)}, end ${line(S5.j2CrestFull, 2)} deg`);
  console.log(`J3, across the crest at the band's two edges, read at the loft's own vertices (the first vertex with a share; a bound, not a step): its height over the sea ${line(S5.j3Height)} m (bar 0.01); the slope to the vertex outside ${line(S5.j3Slope, 2)} deg (bar 2)`);
  console.log(`J4, points whose share is 0.02 to 0.10: case crest over the sea's crest ${range(J4.rise)} m (bar within 0.25); case height / sea's wave height ${range(J4.height)} (bar 0.9 to 1.15); case face steepest ${range(J4.slope, 0)} deg; ${J4.rise.length} samples`);
  console.log(`J5, neighbours 1 m apart: the share's step over 0.2 in ${over(R17.preAlpha, 0.2)} of ${R17.preAlpha.length} pairs (bar under 5 %; median step ${f(q(R17.preAlpha, 0.5), 3)}); the middle of three off the line over 0.5 m: open tube ${over(R17.kinkOpen, 0.5)} of ${R17.kinkOpen.length} (bar under 10 %; median ${f(q(R17.kinkOpen, 0.5), 2)} m), in the course ${over(R17.kinkPre, 0.5)} of ${R17.kinkPre.length} (median ${f(q(R17.kinkPre, 0.5), 2)} m)`);
  console.log(`the wall ahead of the throw along the crest (from each front's leading thrown point, its u on ${BARREL[0]}-${BARREL[1] - AT.tail}), as drawn (the loft's slice where the front reaches, else the sea) and the sea alone:`);
  AHEAD5.forEach((ahead, k) => {
    const mine = S5.wall.filter((v) => v.k === k); const has = mine.filter((v) => v.has);
    console.log(`   ${ahead} m ahead: ${mine.length} samples, ${f((100 * has.length) / Math.max(1, mine.length))} % on a slice (share there ${range(has.map((v) => v.share))}, clock ${range(has.map((v) => v.tau))} s); drawn steepest ${f(q(mine.map((v) => v.drawnSlope), 0.5))} deg (10 %-90 % ${f(q(mine.map((v) => v.drawnSlope), 0.1))}-${f(q(mine.map((v) => v.drawnSlope), 0.9))}), height ${range(mine.map((v) => v.drawnH))} m; `
      + `the sea alone steepest ${f(q(mine.map((v) => v.seaSlope), 0.5))} deg (90 % ${f(q(mine.map((v) => v.seaSlope), 0.9))}), height ${range(mine.map((v) => v.seaH))} m`);
  });
  console.log(`the surface's rise, rider-free (how fast the case's height over the sea changes at places carried with the wave, 0 to 3 m ahead of the crest point, over 0.1 s; NOT the #245 probe, which needs a board): `
    + `in the course before the throw median ${f(q(S5.rise, 0.5), 2)} m/s, 95 % ${f(q(S5.rise, 0.95), 2)} m/s (${S5.rise.length} readings; bar 0.4 and 1.0); in the last 0.5 s before the throw ${f(q(S5.riseOld, 0.5), 2)} / ${f(q(S5.riseOld, 0.95), 2)} (${S5.riseOld.length}); `
    + `before the course ${f(q(S5.riseBefore, 0.5), 2)} / ${f(q(S5.riseBefore, 0.95), 2)} (${S5.riseBefore.length}); after the throw, to 0.3 s ${f(q(S5.riseAfter, 0.5), 2)} / ${f(q(S5.riseAfter, 0.95), 2)} (${S5.riseAfter.length}); the fronts' speed along their rays ${range(S5.speed)} m/s (${S5.pairs} points)`);
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
const platformCells = AT.platform.map((at) => ({ at, cell: cellOut(at, kneeOut) }));
// The foot crest: the highest water of each period where the face is `footDepth` deep, square to the reef.
const footCells = AT.foot.map((at) => ({ at, cell: cellOut(at, (shape.footDepth - shape.crest) / s.gradient) }));
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
  crestMoves(time);
  while (nextMark < MARKS.length && time >= MARKS[nextMark] - 1e-9) { if (crash) countsAt.set(MARKS[nextMark], { ...crash.counts } as unknown as Record<string, number>); nextMark += 1; }
  if (time < settle) continue;
  if (volume0 !== volume0) volume0 = volume();
  const frame = n % perFrame === 0;
  record(time, frame);
  if (n % perFrame === RISE_LAG && time >= 60 && time <= 270.2) riseRead(time);
  for (const w of acc) if (!w.done && time >= w.to) { w.meter = sim.surf.reading(time); w.done = true; }
  const active = acc.filter((w) => time >= w.from && time < w.to);
  if (frame) {
    onsetShapes(time);
    if (time >= 60) seamRead();
    if (time >= 60 && time <= 270) drawnRead(time); else snapA = undefined;
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
if (ref && library) console.log(`the held frames (config.heldRule ${config.heldRule ?? 'none: the first frame clear of the ground'}): ${library.cases.map((c) => `${c.id} held at tau ${library.heldFrameOf(c).tau.toFixed(4)} (void ${library.heldFrameOf(c).voidHeight.toFixed(4)})`).join(', ')}`);
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
const SEGMENTS = [[PACE[0], PACE[1]], [U_TAKE_OFF, PACE[0]], [PACE[0], MID], [MID, PACE[1]], [BARREL[0], BARREL[1]], [BARREL[0], AT.mid], [AT.mid, BARREL[1]]];
function pace(label: string, list: Wave[]): void {
  const reach = list.map((w) => u(w.endX));
  console.log(`B, pace, ${label}: ${list.length} waves; one travelling line reached ${[U_TAKE_OFF, BARREL[0], AT.marks[0], AT.marks[1], PACE[1], AT.marks[2], BARREL[1], AT.marks[3]].map((m) => `u ${f(m)}: ${reach.filter((r) => r >= m - LINK).length}`).join(', ')}; `
    + `its end median u ${f(q(reach, 0.5))} (10th ${f(q(reach, 0.1))}); longest line median ${f(q(list.map((w) => w.longest), 0.5))} m`);
  if (long) { const v = speeds(list, 72, 117); console.log(`  B1 (ruling 17): peel along the reef u 72-117: ${range(v)} m/s, ${count(v)} waves of ${list.length} (bar 6.3-7.2 m/s from 18 of 20)`); }
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
        + `; n ${range(mine.map((v) => v.n), 1)} m; foot crest ${f(q(mine.map((v) => v.footHeight), 0.5), 2)} m; drawn tube ${range(mine.filter((v) => v.outcome === 'jet').map((v) => drawnHeight(v.footHeight, v.footDepth)))} m; asked per jet ${f(holdsIn.filter((h) => Math.floor(h.s / BIN) * BIN === key).reduce((x, h) => x + h.asked, 0) / Math.max(1, holdsIn.filter((h) => Math.floor(h.s / BIN) * BIN === key).length), 2)} m3`);
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
    if (uc >= AT.step2[0] && uc < AT.step2[1]) { nReef += reef; nJet += jet; nFar += far; columns += 1; }
  }
  const lipsFar = lips.filter((j) => inWindow(j.t) && j.z === j.z && !near(j.x, j.z));
  console.log(`D as step 2 counted it, u ${AT.step2[0]}–${AT.step2[1]} (${columns} columns): waves that broke at the reef (the probe's onsets), summed over the columns ${nReef}; waves whose lip threw there ${nJet} = ${f((100 * nJet) / Math.max(1, nReef), 1)} % `
    + `(against columns × periods, ${f(columns * periodsIn)}: ${f((100 * nJet) / (columns * periodsIn), 1)} %); lips thrown farther than ${NEAR} m from the reef line, anywhere: ${lipsFar.length}; second-line onsets on u ${AT.step2[0]}–${AT.step2[1]}: ${nFar}`);
  console.log(`   per 10 m of u, waves at the reef / lips thrown at the reef (%) / second-line onsets: ${[...perBin.keys()].sort((x, y) => x - y).filter((key) => perBin.get(key)!.reef || perBin.get(key)!.jet || perBin.get(key)!.far).map((key) => { const b = perBin.get(key)!; return `u ${key}: ${b.reef} / ${b.jet} (${f((100 * b.jet) / Math.max(1, b.reef))} %) / ${b.far}`; }).join('; ')}`);
  if (ref) {
    // Step 4 (ruling 16): the second break line near the reef's end (the long reef's end is 17 m nearer the beach, z −53 against −70).
    const tailFrom = Math.floor((U_END - 60) / BIN) * BIN;
    const farEnd = onsets.filter((o) => inWindow(o.t) && !near(o.x, o.z) && o.u >= tailFrom && o.u < U_END + 20);
    const farAll = onsets.filter((o) => inWindow(o.t) && !near(o.x, o.z) && o.u >= -20 && o.u < U_END + 20);
    console.log(`the second break line (onsets farther than ${NEAR} m from the reef line), whole reef u −20–${f(U_END + 20)}: ${farAll.length}, z ${range(farAll.map((o) => o.z), 1)} m, ${range(farAll.map((o) => o.depth))} m deep; `
      + `near the reef's end, u ${tailFrom}–${f(U_END + 20)} (the reef line ends at z ${f(poolStraightAt(U_END).z, 1)}): ${farEnd.length}, z ${range(farEnd.map((o) => o.z), 1)} m, ${range(farEnd.map((o) => o.depth))} m deep, `
      + `${farEnd.filter((o) => o.z < reefZ(o.x)).length} seaward of the line and ${farEnd.filter((o) => o.z >= reefZ(o.x)).length} shoreward`);
  }
  // E.
  const wallIn = wallSamples.filter((v) => inWindow(v.t));
  console.log(`E, the wall ahead of the white line's end (its end on u ${BARREL[0]}–${BARREL[1] - AT.tail}; ${wallIn.filter((v) => v.k === 0).length} frames), against bar A's face ${f(faceA, 2)} m: `
    + AHEAD.map((ahead, k) => { const h = wallIn.filter((v) => v.k === k).map((v) => v.height); const sl = wallIn.filter((v) => v.k === k).map((v) => v.slope); return `${ahead} m ahead H ${range(h)} m = ${f(q(h, 0.5) / faceA, 2)} of the face, steepest ${f(q(sl, 0.5))}° (90th ${f(q(sl, 0.9))}°)`; }).join('; '));
  // F.
  console.log(`F, health: finite ${w.finite}; fastest water within ${REEF_BAND} m of the reef line ${f(w.fastest.v, 2)} m/s, read every step (${where(w.fastest)}); elsewhere (the swash) ${f(w.fastestElse.v, 2)} m/s (${where(w.fastestElse)}); `
    + `least water on the reef top ${f(w.leastTop.v, 2)} m (${where(w.leastTop)}); mean along-shore current behind the reef ${f(w.q / w.h, 3)} m/s`);
  console.log(`the wave on the platform 10 m seaward of the knee: ${platformCells.map((c, k) => `s ${c.at} H ${f(w.platform[k].max - w.platform[k].min, 2)} m (H/h ${f((w.platform[k].max - w.platform[k].min) / shape.platformDepth, 3)})`).join(', ')}`);
}
seamReport();
step5Report();
r18Report();
foldReport();
console.log(`r17c standing white, share of frames 60-270 s per 10 m of u (near = most seaward white within 10 m inside the reef line or seaward; inside = farther in; none): ${STAND.bins.map((uu, k) => `u ${uu}: ${ff((100 * STAND.near[k]) / STAND.frames)}/${ff((100 * STAND.inside[k]) / STAND.frames)}/${ff((100 * STAND.none[k]) / STAND.frames)}`).join('; ')}`);
crestMovesReport();
arcReport();
{
  const file = option('throws');
  if (file) writeFileSync(file, holds.map((h) => `${h.t.toFixed(4)} ${h.x.toFixed(3)} ${h.z.toFixed(3)} ${h.asked.toFixed(5)} ${h.thrown.toFixed(5)} ${h.strip >= 0 ? 1 : 0}`).join('\n') + '\n');
  console.log(`step 6, the throws' list: ${holds.length} jets asked from ${settle} s${file ? `, written to ${file}` : ''}`);
}
console.log('');
console.log(`  waves: ${tracked.filter((v) => v.start >= 60).map((w) => `${f(w.start, 1)} s x ${w.x.toFixed(0)} → u ${f(u(w.endX))} [${(w as unknown as { why?: string }).why ?? 'open'}] by +${f((w.track.at(-1)?.[0] ?? w.start) - w.start, 1)} s`).join(' | ')}`);
