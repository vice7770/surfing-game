/**
 * C2 step 4's bars (2026-11-13; c2-step4.md): the water's speed from the library, on the 2 m pool
 * (`?poolSize=ref&wave=library` and the owner's ride switches), the sea only: no rider, no page. The setup is step 3b's
 * probe (`c2-step3b-bars.ts`): the game's config path, the game's sea, and the felt water as the runner builds it
 * (`PhysicalSurfWater.forSimulation` with the library's contact).
 *
 * Measured:
 * - **A, the data path.** Each case's velocity as the library serves it (`WaveLibrary.flowProfileAt` on a one-case
 *   slice, at an own frame's own τ) against the run's VELOUT in its `_c2.json.gz`, relative.
 * - **B, no jump under a board at the hand-over.** At points a board would sit (±10 m along the lane from the crest at
 *   the hand-over, every 4th lane), the felt flow just under the surface, every step: the largest change over any
 *   0.1 s window while the slice's share comes in, and the largest in one step.
 * - **C, the crest water's share.** Per slice, the library's own water at the crest landmark over that slice's steady
 *   crest speed (a straight line through its crest's place over the 1.4 s before its throw), at −0.7, −0.34, −0.17, 0,
 *   +0.17 and +0.34 s from the throw; and the fastest water on the profile over the same speed
 *   (docs/research/pool-tube-flow/README.md's table).
 * - **D, the share and the acceleration:** how the flow's share compares with the surface's own weight at the same
 *   point, and the size of the library's Du/Dt.
 * - The cost per step (the zone's parts, and the flow sample's own).
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/wave-strategy-alternatives/c2-step4-bars.ts -o <scratch>/s4.mjs --format esm --platform node
 *   node <scratch>/s4.mjs --cases public/library --cache <scratch>/sea21.bin --from 40 --until 130
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { createWaterSample } from '../../../src/physics/SurfWater';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { libraryFromBytes } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { SweptContact } from '../../../src/wave/barrel/sweptContact';
import { decodeWaveCase, WAVE_LANDMARK, WAVE_POINTS } from '../../../src/wave/library/caseFormat';
import { SLICE_LIFE, type FieldSlice } from '../../../src/wave/library/SliceField';
import { FLOW_VALUES, WaveLibrary } from '../../../src/wave/library/WaveLibrary';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const CASES = option('cases') ?? 'public/library';
const SOURCE = option('source') ?? 'docs/research/pool-c2-library/data';
const CACHE = option('cache');
const FROM = Number(option('from') ?? 40);
const UNTIL = Number(option('until') ?? 130);
const OUT = option('out');
const SEARCH = option('search') ?? '?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long';

const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const line = (v: number[], d = 3) => `median ${f(q(v, 0.5), d)}, 90 % ${f(q(v, 0.9), d)}, 99 % ${f(q(v, 0.99), d)}, most ${f(q(v, 1), d)} (${v.filter(Number.isFinite).length})`;
const over = (v: number[], bar: number) => `${f((100 * v.filter((x) => x > bar).length) / Math.max(1, v.filter(Number.isFinite).length), 1)} %`;
const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

const files = readdirSync(CASES).filter((n) => n.endsWith('.bin')).sort();
const cases = files.map((n) => decodeWaveCase(new Uint8Array(readFileSync(`${CASES}/${n}`))));
const library = new WaveLibrary(cases);
console.log(`cases ${cases.length}, stored depths ${library.depthCount} (${cases[0].header.velocityDepths.map((d) => f(d, 4)).join(', ')} h0)`);

// ---- A. The data path: the library's velocity against the run's VELOUT.
function barA(): void {
  const rows: number[] = [];
  const abs: number[] = [];
  let compared = 0;
  let missing = 0;
  for (const c of cases) {
    const file = `${SOURCE}/${c.header.run}_c2.json.gz`;
    if (!existsSync(file)) { missing += 1; continue; }
    const src = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as {
      frames: Array<{ tau: number; u: Array<Array<number | null>> | null; v: Array<Array<number | null>> | null }>;
    };
    const one = new WaveLibrary([c]);
    const nd = one.depthCount;
    const slice = one.slice({ heightOverDepth: 0.3, period: 10, slope: c.header.slope, reefDepth: c.header.reefDepth, depth: c.header.h0, time: 0 });
    if (slice.n !== 1 || Math.abs(slice.weight[0] - 1) > 1e-9) throw new Error('the one-case slice did not take the whole weight');
    const flow = new Float64Array(WAVE_POINTS * nd * FLOW_VALUES);
    const motion = new Float64Array(2 * WAVE_POINTS);
    const speed = Math.sqrt(9.81 * slice.h0);
    // Every 40th frame, "own" only (a refill frame is rebuilt from its neighbours, by design).
    for (let k = 0; k < c.header.frames; k += 40) {
      if (c.use[k] !== 1) continue;
      const frame = src.frames[k];
      if (!frame?.u || !frame.v) continue;
      const tau = c.header.tauStart + k * c.header.tauStep;
      const t = slice.tH + (tau - slice.tauH[0]) * slice.unit;
      one.flowProfileAt(slice, t, flow, motion);
      for (let i = 0; i < WAVE_POINTS; i += 1) {
        for (let j = 0; j < nd; j += 1) {
          for (let comp = 0; comp < 2; comp += 1) {
            const want = (comp === 0 ? frame.u : frame.v)[i]?.[j];
            if (want === null || want === undefined) continue;
            const got = flow[(i * nd + j) * FLOW_VALUES + comp] / speed;
            compared += 1;
            abs.push(Math.abs(got - want));
            rows.push(Math.abs(got - want) / Math.max(Math.abs(want), 1e-3));
          }
        }
      }
    }
  }
  console.log('\n## A. The library against VELOUT (relative, at the stored points)');
  console.log(`  ${line(rows, 5)}; over 2 %: ${over(rows, 0.02)}; samples ${compared}, cases without a source file ${missing}`);
  console.log(`  absolute, sqrt(g h0): ${line(abs, 6)}`);
}
barA();

// ---- The game's sea and its felt water.
(globalThis as unknown as { location: { search: string } }).location = { search: SEARCH };
const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
const config = { ...surfZoneConfigFor(settings as never, 1, false), wave: 'library' } as SurfZoneConfig;
const barrel = libraryFromBytes(readBarrelCases(config.spot, undefined, config.poolTubeCase), config.tubeShape, config.spot, config.heldRule);
let sim: SurfZoneSimulation;
if (CACHE && existsSync(CACHE)) {
  sim = new SurfZoneSimulation(config, 'warm', barrel, library);
  const state = decodeSurfZoneState(new Uint8Array(readFileSync(CACHE)));
  delete (state as { library?: unknown }).library;
  sim.importState(state);
} else {
  sim = new SurfZoneSimulation(config, 'spun-up', barrel, library);
  if (CACHE) { const st = sim.exportState(); delete (st as { library?: unknown }).library; writeFileSync(CACHE, encodeSurfZoneState(st)); }
}
const zone = sim.waveZone;
if (!zone) throw new Error('no library zone: the probe needs ?poolSize=ref and the cases');
const { lanes } = zone;
const contact = SweptContact.forLoft(() => zone.loft.result);
const felt = PhysicalSurfWater.forSimulation(sim, contact, 1);
const sea = new PhysicalSurfWater(sim.solver, { peakPeriod: config.peakPeriod, nodeSpacing: 1 });
const sample = createWaterSample();
const seaSample = createWaterSample();
const STEP = 1 / 60;
const share = (s: FieldSlice, t: number) => smoothstep((t - s.blendFrom) / SLICE_LIFE.blend) * (1 - smoothstep((t - s.goFrom) / SLICE_LIFE.blend));

// ---- B. A board's place through the hand-over: the felt flow, step by step.
/** A board's hull sits this far under the surface, m. */
const DRAFT = 0.05;
interface Seat { x: number; z: number; lane: number; s: number; from: number; until: number; flow: number[][]; gap: number[][]; sea: number[][]; shares: number[] }
const seats: Seat[] = [];
const B = { step: [] as number[], window: [] as number[], gapWindow: [] as number[], seaWindow: [] as number[], shareStep: [] as number[] };
const D = { accel: [] as number[], shareOff: [] as number[], libAlong: [] as number[], seaAlong: [] as number[], ratio: [] as number[] };
const C: Record<string, number[]> = {};
/** E: near a slice's throw, the water at its crest: the library's along the ray, and the sea's own at the same place. */
const E = { lib: [] as number[], sea: [] as number[], ratio: [] as number[] };
/** B's worst windows (over 0.3 m/s of the library's own part): how many went with a step in the share. */
const WHY = { windows: 0, withShareStep: 0, shareStep: [] as number[] };
const CMAX: Record<string, number[]> = {};
const COST = { field: [] as number[], surface: [] as number[], flow: [] as number[] };
const seen = new Set<number>();
const flowOut = new Float64Array(6);

/** The slice's steady crest speed, m/s: a straight line through its crest's place over the 1.4 s before its throw. */
function crestSpeed(s: FieldSlice): number {
  const crest = new Float64Array(2);
  let n = 0; let st = 0; let sy = 0; let stt = 0; let sty = 0;
  for (let d = -1.4; d <= 0.0001; d += 0.05) {
    const t = s.throwAt + d;
    if (t < s.tH) continue;
    library.crestAt(s.slice, t, crest);
    n += 1; st += d; sy += crest[0]; stt += d * d; sty += d * crest[0];
  }
  if (n < 5) return Number.NaN;
  const den = stt - (st * st) / n;
  return den > 1e-9 ? (sty - (st * sy) / n) / den : Number.NaN;
}

for (let t = FROM; t <= UNTIL; t += STEP) {
  while (sim.solver.time < t - 1e-9) sim.step(STEP);
  // The contact's loft, as the runner builds it near the bodies (here: everywhere the probe may sample).
  const cached = felt.createCachedPlainSurface();
  cached.invalidate();
  zone.contactLoft((x, z) => cached.heightAt(x, z));
  COST.field.push(zone.costs.field);
  COST.surface.push(zone.costs.surface);
  // New slices: a board's seats through the hand-over, and the crest share readings.
  for (const s of zone.field.slices()) {
    if (seen.has(s.id) || t < s.blendFrom) continue;
    seen.add(s.id);
    if (t > s.blendFrom + 2 * STEP || s.tH < FROM - 5) continue;
    if (s.lane % 4 === 0) {
      const curve = new Float32Array(2 * WAVE_POINTS);
      library.surfaceAt(s.slice, t, curve);
      const crestS = s.s + curve[2 * WAVE_LANDMARK.crest];
      for (const d of [-10, -5, 0, 5, 10]) {
        const at = crestS + d;
        seats.push({
          x: lanes.baseX[s.lane] + at * lanes.rayX[s.lane], z: lanes.baseZ[s.lane] + at * lanes.rayZ[s.lane], lane: s.lane, s: at,
          from: t, until: t + SLICE_LIFE.blend + 0.5, flow: [], gap: [], sea: [], shares: [],
        });
      }
    }
    // C: the crest water's share, on this slice's own clock.
    const c = crestSpeed(s);
    if (c === c && c > 1) {
      const nd = library.depthCount;
      const flow = new Float64Array(WAVE_POINTS * nd * FLOW_VALUES);
      const motion = new Float64Array(2 * WAVE_POINTS);
      for (const d of [-0.7, -0.34, -0.17, 0, 0.17, 0.34]) {
        const at = s.throwAt + d;
        if (at < s.tH || at > s.goneAt) continue;
        library.flowProfileAt(s.slice, at, flow, motion);
        const u = flow[(WAVE_LANDMARK.crest * nd) * FLOW_VALUES];
        let most = 0;
        for (let i = 0; i < WAVE_POINTS; i += 1) most = Math.max(most, flow[(i * nd) * FLOW_VALUES]);
        (C[d.toFixed(2)] ??= []).push(u / c);
        (CMAX[d.toFixed(2)] ??= []).push(most / c);
      }
    }
  }
  // E: near a slice's throw, the push at its crest against the sea's own there.
  for (const shown of zone.surface.shown()) {
    const s = shown.slice;
    if (!(Math.abs(t - s.throwAt) < 0.17) || !shown.flow || shown.share < 0.99) continue;
    const at = shown.curve[2 * WAVE_LANDMARK.crest];
    const y = shown.curve[2 * WAVE_LANDMARK.crest + 1];
    const x = lanes.baseX[s.lane] + at * lanes.rayX[s.lane];
    const z = lanes.baseZ[s.lane] + at * lanes.rayZ[s.lane];
    const rx = lanes.rayX[s.lane];
    const rz = lanes.rayZ[s.lane];
    felt.sampleAt(x, y - DRAFT, z, sample);
    sea.sampleAt(x, sea.surfaceAt(x, z) - DRAFT, z, seaSample);
    const lib = sample.flowX * rx + sample.flowZ * rz;
    const own = seaSample.flowX * rx + seaSample.flowZ * rz;
    E.lib.push(lib);
    E.sea.push(own);
    if (Math.abs(own) > 0.2) E.ratio.push(lib / own);
  }
  // B: each live seat's felt flow just under the surface, and the sea's own there (the control).
  const start = performance.now();
  let samples = 0;
  for (const seat of seats) {
    if (t < seat.from || t > seat.until) continue;
    const surface = felt.surfaceAt(seat.x, seat.z);
    felt.sampleAt(seat.x, surface - DRAFT, seat.z, sample);
    samples += 1;
    const lib = [sample.flowX, sample.flowY, sample.flowZ];
    const w = zone.surface.flowAt(seat.x, surface - DRAFT, seat.z, flowOut);
    const accel = Math.hypot(sample.flowAccelX ?? 0, sample.flowAccelY ?? 0, sample.flowAccelZ ?? 0);
    const seaSurface = sea.surfaceAt(seat.x, seat.z);
    sea.sampleAt(seat.x, seaSurface - DRAFT, seat.z, seaSample);
    const own = [seaSample.flowX, seaSample.flowY, seaSample.flowZ];
    seat.flow.push(lib);
    seat.sea.push(own);
    seat.gap.push([lib[0] - own[0], lib[1] - own[1], lib[2] - own[2]]);
    seat.shares.push(w);
    if (w > 0) {
      D.accel.push(accel);
      // The share the flow took against the slice's own blend share × its lane's end weight (one slice, whole frame).
      const live = [...zone.field.byLane[seat.lane]].filter((s) => t >= s.blendFrom && t <= s.goneAt);
      if (live.length === 1) D.shareOff.push(Math.abs(w - share(live[0], t) * live[0].end));
    }
    if (w > 0.99) {
      const rx = lanes.rayX[seat.lane];
      const rz = lanes.rayZ[seat.lane];
      D.libAlong.push(lib[0] * rx + lib[2] * rz);
      D.seaAlong.push(own[0] * rx + own[2] * rz);
    }
  }
  if (samples > 0) COST.flow.push((performance.now() - start) / samples);
}

// B's steps and windows.
const WINDOW = Math.round(0.1 / STEP);
for (const seat of seats) {
  for (let i = 1; i < seat.flow.length; i += 1) {
    const a = seat.flow[i - 1];
    const b = seat.flow[i];
    B.step.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    B.shareStep.push(Math.abs(seat.shares[i] - seat.shares[i - 1]));
  }
  for (let i = WINDOW; i < seat.flow.length; i += 1) {
    const d = (v: number[][]) => Math.hypot(v[i][0] - v[i - WINDOW][0], v[i][1] - v[i - WINDOW][1], v[i][2] - v[i - WINDOW][2]);
    B.window.push(d(seat.flow));
    B.gapWindow.push(d(seat.gap));
    B.seaWindow.push(d(seat.sea));
    if (d(seat.gap) > 0.3) {
      WHY.windows += 1;
      const step = Math.abs(seat.shares[i] - seat.shares[i - WINDOW]);
      WHY.shareStep.push(step);
      if (step > 0.1) WHY.withShareStep += 1;
    }
  }
}

console.log(`\n## B. Under a board at the hand-over (${seats.length} seats, ${B.step.length} steps)`);
console.log(`  the felt flow's change over 0.1 s, m/s: ${line(B.window)}; over 0.3: ${over(B.window, 0.3)}`);
console.log(`  the sea's own change there over 0.1 s (the control): ${line(B.seaWindow)}; over 0.3: ${over(B.seaWindow, 0.3)}`);
console.log(`  the hand-over's own part, (felt − sea)'s change over 0.1 s: ${line(B.gapWindow)}; over 0.3: ${over(B.gapWindow, 0.3)}`);
console.log(`  the felt flow's change in one step (1/60 s), m/s: ${line(B.step)}`);
console.log(`  the library's share's change in one step: ${line(B.shareStep, 4)}`);

console.log(`  of the ${WHY.windows} windows over 0.3, ${WHY.withShareStep} went with a share step over 0.1 (the share's own step there: ${line(WHY.shareStep, 3)})`);

console.log('\n## E. The push at a slice\'s crest near its throw (the library whole)');
console.log(`  along the ray, m/s: library ${line(E.lib, 2)}`);
console.log(`                      sea     ${line(E.sea, 2)}`);
console.log(`  the library over the sea: ${line(E.ratio, 2)}`);

console.log('\n## D. The push, the share and the acceleration');
console.log(`  |Du/Dt| where the library has a share, m/s²: ${line(D.accel, 2)}`);
console.log(`  |the flow's share − the slice's own blend share| (one slice on the lane): ${line(D.shareOff, 4)}`);
console.log(`  where the library is whole, the flow along the ray, m/s: library ${line(D.libAlong, 2)}`);
console.log(`                                                         sea     ${line(D.seaAlong, 2)}`);

console.log('\n## C. The crest water over the slice\'s own steady crest speed');
console.log('  (the measured pool small: 0.59 at −0.7 s, 0.70 at −0.34, 0.75 at −0.17, 0.80 at the throw, 0.83, 0.86)');
for (const d of ['-0.70', '-0.34', '-0.17', '0.00', '0.17', '0.34']) {
  console.log(`  ${d} s: crest point ${line(C[d] ?? [], 3)}`);
  console.log(`         fastest    ${line(CMAX[d] ?? [], 3)}`);
}

console.log('\n## The cost, ms a step');
console.log(`  the hand-over and slices: ${f(q(COST.field, 0.5))} / ${f(q(COST.field, 0.9))}`);
console.log(`  the zone's surface (the flow filled with it): ${f(q(COST.surface, 0.5))} / ${f(q(COST.surface, 0.9))}`);
console.log(`  one flow sample under a board, ms: ${f(q(COST.flow, 0.5), 4)} / ${f(q(COST.flow, 0.9), 4)}`);
console.log(`  slices ${zone.surface.stats.slices}, shown ${zone.surface.stats.shown}, lofted ${zone.surface.stats.lofted}, nodes ${zone.surface.stats.nodes}`);

if (OUT) writeFileSync(OUT, `${JSON.stringify({ B: { window: B.window, step: B.step }, C, CMAX }, null, 1)}\n`);
