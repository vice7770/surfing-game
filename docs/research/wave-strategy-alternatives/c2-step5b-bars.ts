/**
 * C2 step 5b's bars (2026-11-14; c2-step5b.md): the hand-back, the set-up, and ruling 35's carried items, on the 2 m
 * pool (`?poolSize=ref&wave=library` and the owner's ride switches), the sea only: no rider, no page. The setup is step
 * 3b's and step 4's probe (the game's config path, the game's sea, the felt water as the runner builds it).
 *
 * Measured (`--parts`, by letter; the default is `AFCDEK`):
 * - **A, the hand-back.** Per slice, from half a second before its blend-out to half a second after it, the bore's top
 *   along its lane as the render nodes take it ((1 − W) η_sea + Σ W H on the lane's stations), and the sea's own top in
 *   the same window: the place and height, every step. Reported: the change in one step and over 0.1 s, raw and as the
 *   hand-back's own part (the library's reading less the sea's own, so the water's own motion is out). Also the gap
 *   between the case's crest and the sea's at the moment the blend-out starts, which is what the blend-out pays back.
 * - **F, the hand-over's height bar** (step 3b's, re-read with ruling 31's ten more cases): the case's H over the sea's
 *   at the hand-over, the key clamps, and per case how often its τ clamped.
 * - **C, ruling 35 item 2.** At one seat: the share the surface took, resampled on the 1 m render nodes
 *   (`ZoneSurface.weightAt`), against the share the flow took at the point (`ZoneSurface.flowAt`'s return). Bar: 0.02.
 * - **D, ruling 35 item 1.** The library's flow at 0.2, 0.45, 0.8 and 1.5 m under the surface against the sea's own
 *   there: how far the held value stands from the sea's below the deeper stored depth, and the share at each depth.
 * - **E, ruling 35 item 3.** At a slice's throw: Σ w |rate − 1| (the cases' clocks before the throw against after it),
 *   and the step in the library's own du/dt across the throw.
 * - **K, ruling 35 item 4.** Each case's own collapse: how long after its touchdown its profile's steepest segment
 *   falls under `LIFT.bridge`, against `LIFT.collapse` (0.6 s, the old swept tube's √(2W/g)).
 * - **S, the set-up and the mean level** (`--parts S --until 600`): the solver's own state with the switch on and off,
 *   its mean level, the water piled against the beach, and the mean currents in the surf zone (the rips), on against
 *   off. The library writes no solver field, so this is a check that it does not.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/wave-strategy-alternatives/c2-step5b-bars.ts -o <scratch>/s5b.mjs --format esm --platform node
 *   node <scratch>/s5b.mjs --cases public/library --cache <scratch>/sea21.bin --from 40 --until 130
 *   node <scratch>/s5b.mjs --parts S --cache <scratch>/sea21.bin --from 21 --until 621
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { createWaterSample } from '../../../src/physics/SurfWater';
import { libraryFromBytes } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { SweptContact } from '../../../src/wave/barrel/sweptContact';
import { decodeWaveCase, PATH, PATH_COLUMNS, WAVE_LANDMARK, WAVE_POINTS } from '../../../src/wave/library/caseFormat';
import { LIFT } from '../../../src/wave/library/libraryLoft';
import { FLOW_VALUES, WaveLibrary } from '../../../src/wave/library/WaveLibrary';
import { SLICE_LIFE, type FieldSlice } from '../../../src/wave/library/SliceField';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const CASES = option('cases') ?? 'public/library';
const CACHE = option('cache');
const FROM = Number(option('from') ?? 40);
const UNTIL = Number(option('until') ?? 130);
const PARTS = option('parts') ?? 'AFCDEK';
const OUT = option('out');
const SEARCH = option('search') ?? '?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long';
const part = (letter: string) => PARTS.includes(letter);

const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const line = (v: number[], d = 3) => `median ${f(q(v, 0.5), d)}, 90 % ${f(q(v, 0.9), d)}, 99 % ${f(q(v, 0.99), d)}, most ${f(q(v, 1), d)} (${v.filter(Number.isFinite).length})`;
const over = (v: number[], bar: number) => `${f((100 * v.filter((x) => x > bar).length) / Math.max(1, v.filter(Number.isFinite).length), 1)} %`;
const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

(globalThis as unknown as { location: { search: string } }).location = { search: SEARCH };
const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
const files = readdirSync(CASES).filter((n) => n.endsWith('.bin')).sort();
const library = new WaveLibrary(files.map((n) => decodeWaveCase(new Uint8Array(readFileSync(`${CASES}/${n}`)))));

function build(withLibrary: boolean): SurfZoneSimulation {
  const config = { ...surfZoneConfigFor(settings as never, 1, false), ...(withLibrary ? { wave: 'library' } : {}) } as SurfZoneConfig;
  const barrel = libraryFromBytes(readBarrelCases(config.spot, undefined, config.poolTubeCase), config.tubeShape, config.spot, config.heldRule);
  if (CACHE && existsSync(CACHE)) {
    const sim = new SurfZoneSimulation(config, 'warm', barrel, library);
    const state = decodeSurfZoneState(new Uint8Array(readFileSync(CACHE)));
    delete (state as { library?: unknown }).library;
    sim.importState(state);
    return sim;
  }
  const sim = new SurfZoneSimulation(config, 'spun-up', barrel, library);
  if (CACHE) { const st = sim.exportState(); delete (st as { library?: unknown }).library; writeFileSync(CACHE, encodeSurfZoneState(st)); }
  return sim;
}

const STEP = 1 / 60;

// ---- K. Each case's own collapse, from its own frames (no simulation needed).
if (part('K')) {
  console.log('\n## K. Ruling 35 item 4: the lip blend tuned for the old swept tube');
  const steepest = (curve: Float64Array): { angle: number; folded: boolean } => {
    let angle = 0;
    let folded = false;
    for (let i = 0; i + 1 < WAVE_POINTS; i += 1) {
      const run = curve[2 * i + 2] - curve[2 * i];
      const rise = Math.abs(curve[2 * i + 3] - curve[2 * i + 1]);
      if (run < -1e-4) { folded = true; angle = 90; continue; }
      if (!(Math.sqrt(run * run + rise * rise) > 0.02 / 5)) continue;
      const a = run > 1e-6 ? (Math.atan(rise / run) * 180) / Math.PI : rise > 1e-4 ? 90 : 0;
      if (a > angle) angle = a;
    }
    return { angle, folded };
  };
  const curve = new Float64Array(2 * WAVE_POINTS);
  const rows: string[] = [];
  const unfold: number[] = [];
  const unsteep: number[] = [];
  for (let i = 0; i < library.cases.length; i += 1) {
    const c = library.cases[i];
    if (!(c.touchdown === c.touchdown)) { rows.push(`${c.id}: no touchdown`); continue; }
    let folds = Number.NaN;
    let steep = Number.NaN;
    const last = c.tauStart + (c.count - 1) * c.tauStep;
    // The fold must go and stay gone for 0.3 tau: a single frame reading unfolded is the join's own noise.
    for (let tau = c.touchdown; tau <= last; tau += 0.02) {
      library.caseFrameAt(i, tau, curve);
      const here = steepest(curve);
      if (!(steep === steep) && here.angle < LIFT.bridge) steep = tau - c.touchdown;
      if (folds === folds || here.folded) continue;
      let held = true;
      for (let on = tau; on <= Math.min(last, tau + 0.3); on += 0.02) {
        library.caseFrameAt(i, on, curve);
        if (steepest(curve).folded) { held = false; break; }
      }
      if (held) folds = tau - c.touchdown;
    }
    const unit = Math.sqrt(2.4 / 9.81);
    const at = (d: number) => {
      library.caseFrameAt(i, Math.min(last, c.touchdown + d), curve);
      return steepest(curve).angle;
    };
    rows.push(`${c.id.replace('periodic-pool-c2-', '').replace('-l12', '')}: the fold goes for good ${f(folds, 2)} τ (${f(folds * unit, 2)} s), under ${LIFT.bridge}° ${f(steep, 2)} τ (${f(steep * unit, 2)} s); steepest at +0.3/+1/+3 τ ${f(at(0.3), 0)}/${f(at(1), 0)}/${f(at(3), 0)}°`);
    if (folds === folds) unfold.push(folds * unit);
    if (steep === steep) unsteep.push(steep * unit);
  }
  for (const r of rows) console.log(`  ${r}`);
  console.log(`  after touchdown, the case's own fold goes: ${line(unfold, 2)} s; under ${LIFT.bridge}°: ${line(unsteep, 2)} s; LIFT.collapse is ${LIFT.collapse} s`);
}

if (!(part('A') || part('F') || part('C') || part('D') || part('E') || part('S'))) process.exit(0);

const sim = build(true);
const zone = sim.waveZone;
if (!zone) throw new Error('no library zone: the probe needs ?poolSize=ref and the cases');
const { lanes } = zone;
const contact = SweptContact.forLoft(() => zone.loft.result);
const felt = PhysicalSurfWater.forSimulation(sim, contact, 1);
const sea = new PhysicalSurfWater(sim.solver, { peakPeriod: 10.5, nodeSpacing: 1 });
console.log(`cases ${library.cases.length}, stored depths ${library.depthCount}; lanes ${lanes.count}; from ${FROM} to ${UNTIL} s; parts ${PARTS}`);

// ---- S. The set-up, the mean level and the rips: the switch on against off.
if (part('S')) {
  const off = build(false);
  const hash = (s: SurfZoneSimulation) => {
    let a = 2166136261 >>> 0;
    const push = (v: number) => {
      const view = new DataView(new ArrayBuffer(8));
      view.setFloat64(0, v);
      for (let b = 0; b < 8; b += 1) { a ^= view.getUint8(b); a = Math.imul(a, 16777619) >>> 0; }
    };
    for (const arr of [s.solver.h, s.solver.qx, s.solver.qz]) for (let i = 0; i < arr.length; i += 97) push(arr[i]);
    return a.toString(16).padStart(8, '0');
  };
  const { nx, nz, dx } = sim.solver;
  const level = (s: SurfZoneSimulation) => {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < s.solver.h.length; i += 1) {
      if (!(s.solver.h[i] > 0.05)) continue;
      sum += s.solver.h[i] + s.solver.bed[i] - s.solver.restLevel;
      n += 1;
    }
    return n > 0 ? sum / n : Number.NaN;
  };
  /** The water piled against the beach: the mean level over the ten shallowest wet rows. */
  const setUp = (s: SurfZoneSimulation) => {
    let sum = 0;
    let n = 0;
    for (let iz = nz - 12; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        if (!(s.solver.h[i] > 0.05)) continue;
        sum += s.solver.h[i] + s.solver.bed[i] - s.solver.restLevel;
        n += 1;
      }
    }
    return n > 0 ? sum / n : Number.NaN;
  };
  const rips = { on: new Float64Array(nx * nz * 2), off: new Float64Array(nx * nz * 2), n: 0 };
  const take = (s: SurfZoneSimulation, into: Float64Array) => {
    for (let i = 0; i < nx * nz; i += 1) {
      const h = s.solver.h[i];
      into[2 * i] += h > 0.05 ? s.solver.qx[i] / h : 0;
      into[2 * i + 1] += h > 0.05 ? s.solver.qz[i] / h : 0;
    }
  };
  const levels: Array<[number, number, number]> = [];
  let next = FROM;
  let nextRip = FROM + 60;
  for (let t = FROM; t <= UNTIL; t += STEP) {
    while (sim.solver.time < t - 1e-9) sim.step(STEP);
    while (off.solver.time < t - 1e-9) off.step(STEP);
    if (t >= next) {
      levels.push([t, level(sim), level(off)]);
      next += 5;
    }
    // The mean currents every fifth of a second (the rips turn over in tens of seconds).
    if (t >= nextRip) { take(sim, rips.on); take(off, rips.off); rips.n += 1; nextRip += 0.2; }
  }
  const drift = levels.length > 1 ? levels[levels.length - 1][1] - levels[0][1] : Number.NaN;
  const spread = levels.map((r) => r[1]);
  console.log(`\n## S. The set-up, the mean level and the rips over ${f(UNTIL - FROM, 0)} s`);
  console.log(`  the solver's state (h, qx, qz every 97th cell), the switch on / off: ${hash(sim)} / ${hash(off)}`);
  console.log(`  the mean level, m over still water: first ${f(levels[0][1], 5)}, last ${f(levels[levels.length - 1][1], 5)}, drift ${f(drift, 5)} (bar 0.01); its band ${f(Math.min(...spread), 5)} to ${f(Math.max(...spread), 5)}`);
  console.log(`  the sea alone's: first ${f(levels[0][2], 5)}, last ${f(levels[levels.length - 1][2], 5)}, drift ${f(levels[levels.length - 1][2] - levels[0][2], 5)}`);
  console.log(`  the water piled against the beach (the 12 shallowest rows), on / off: ${f(setUp(sim), 5)} / ${f(setUp(off), 5)} m; on over off ${f(setUp(sim) / setUp(off), 4)} (bar 0.7–1.3)`);
  // The rips' correlation over the wet surf zone.
  let sx = 0; let sy = 0; let sxx = 0; let syy = 0; let sxy = 0; let n = 0;
  for (let i = 0; i < 2 * nx * nz; i += 1) {
    const a = rips.on[i] / Math.max(1, rips.n);
    const b = rips.off[i] / Math.max(1, rips.n);
    if (a === 0 && b === 0) continue;
    sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b; n += 1;
  }
  const r = (n * sxy - sx * sy) / Math.sqrt(Math.max(1e-12, (n * sxx - sx * sx) * (n * syy - sy * sy)));
  console.log(`  the mean currents cell by cell (${n} components over ${f(UNTIL - FROM - 60, 0)} s), on against off: correlation ${f(r, 6)} (bar 0.8); dx ${f(dx, 2)} m`);
  if (OUT) writeFileSync(OUT, `${JSON.stringify({ levels }, null, 1)}\n`);
  process.exit(0);
}

// ---- The sea along a lane, and the shown surface along it (the render nodes' own arithmetic).
const seaOn = (k: number, s: number) => zone.seaLevel(lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]);
const shownOn = (k: number, s: number) => {
  const { weight, height } = zone.surface.laneAt(k, s);
  const v = seaOn(k, s);
  return (1 - weight) * (v === v ? v : 0) + height;
};
/**
 * A bore's place and height along a lane, within ±`reach` m of `want`.
 *
 * The place is **the bore's front**, not its top: a bore's top is nearly flat, so the highest station hops metres from
 * step to step and measures nothing (round 1 did this and read a median place change of 0.3 m where the arithmetic
 * says 0.08). The front is the shoreward place where the surface falls through the half-height between the bore's top
 * and the water ahead of it — a steep, single crossing, read to centimetres. The height is the bore's own: its top
 * over the water ahead.
 */
function boreOf(at: (s: number) => number, want: number, reach: number): { s: number; y: number; top: number } | undefined {
  const ds = 0.05;
  let top = Number.NaN;
  let topY = -Infinity;
  for (let s = want - reach; s <= want + reach + 1e-9; s += ds) {
    const y = at(s);
    if (y === y && y > topY) { topY = y; top = s; }
  }
  if (!(top === top)) return undefined;
  let low = Infinity;
  for (let s = top; s <= top + 15; s += ds) {
    const y = at(s);
    if (y === y && y < low) low = y;
  }
  if (!(low < topY)) return undefined;
  const half = 0.5 * (topY + low);
  // The first shoreward crossing of the half-height, interpolated between its two stations.
  let prev = topY;
  for (let s = top + ds; s <= top + 15; s += ds) {
    const y = at(s);
    if (!(y === y)) break;
    if (y <= half && prev > half) {
      const u = (prev - half) / (prev - y);
      return { s: s - ds + u * ds, y: topY - low, top };
    }
    prev = y;
  }
  return undefined;
}

// ---- F. The hand-over's height bar, re-read.
const H0 = { ratio: [] as number[], interior: [] as number[], clean: [] as number[], tauClean: [] as number[], crest: [] as number[], count: 0, missed: 0, clampsTau: 0, clampsSlope: 0, clampsA0: 0, clampsReef: 0 };
const CLAMPS: Record<string, { slices: number; weight: number; low: number; high: number; lowWeight: number }> = {};
const tauOut = new Float64Array(8);
const caseCurve = new Float32Array(2 * WAVE_POINTS);
function caseH(s: FieldSlice, t: number): number {
  const sl = s.slice;
  library.tausAt(sl, t, tauOut);
  let H = 0;
  for (let k = 0; k < sl.n; k += 1) {
    const c = library.cases[sl.caseIndex[k]];
    const pos = Math.min(c.count - 1, Math.max(0, (tauOut[k] - c.tauStart) / c.tauStep));
    const a = Math.floor(pos);
    const b = Math.min(c.count - 1, a + 1);
    const ha = c.case.path[a * PATH_COLUMNS + PATH.H];
    const hb = c.case.path[b * PATH_COLUMNS + PATH.H];
    H += sl.weight[k] * (ha + (pos - a) * (hb - ha));
  }
  return H * sl.h0;
}
function seaCrestAt(k: number, want: number, reach: number): { s: number; y: number; H: number } | undefined {
  let best: { s: number; y: number; H: number } | undefined;
  for (let s = want - reach; s <= want + reach; s += 0.25) {
    const v = seaOn(k, s);
    if (!(v === v)) continue;
    let top = true;
    for (let d = -1; d <= 1; d += 0.25) if (d !== 0 && !(seaOn(k, s + d) <= v)) { top = false; break; }
    if (!top) continue;
    let low = Infinity;
    for (let a = s; a <= s + 15; a += 0.25) { const w = seaOn(k, a); if (w === w && w < low) low = w; }
    if (!best || Math.abs(s - want) < Math.abs(best.s - want)) best = { s, y: v, H: v - low };
  }
  return best;
}

// ---- A. The hand-back: each slice's bore followed through its blend-out.
interface Back { slice: FieldSlice; from: number; until: number; place: number[]; height: number[]; seaPlace: number[]; seaHeight: number[]; times: number[]; live: number[]; shares: number[]; want: number; seaWant: number; gap: number }
const backs: Back[] = [];
const allBacks: Back[] = [];
const A = { stepPlace: [] as number[], stepHeight: [] as number[], winPlace: [] as number[], winHeight: [] as number[], ownPlace: [] as number[], ownHeight: [] as number[], seaWinPlace: [] as number[], seaWinHeight: [] as number[], gap: [] as number[], heightGap: [] as number[],
  /** The jump across the hand-back itself: the step the slice is dropped on (`goneAt`), place and height. */
  dropPlace: [] as number[], dropHeight: [] as number[],
  /** The drift, split by whether one slice or two were live on the lane at the time. */
  onePlace: [] as number[], twoPlace: [] as number[], oneHeight: [] as number[], twoHeight: [] as number[] };

// ---- C, D, E.
const C = { gap: [] as number[], nodes: [] as number[], point: [] as number[], inside: [] as number[], edge: [] as number[], was: [] as number[] };
/** C and D read one seat a lane each step (every 7th lane). */
const seats = new Set<number>();
const D: Record<string, { gap: number[]; share: number[]; felt: number[] }> = {};
const E = { rate: [] as number[], jump: [] as number[], cases: [] as number[] };
const flowOut = new Float64Array(6);
const sample = createWaterSample();
const seaSample = createWaterSample();
const seen = new Set<number>();
const thrown = new Set<number>();
const DEPTHS = [0.2, 0.45, 0.8, 1.5];
const t0 = Date.now();

for (let t = FROM; t <= UNTIL; t += STEP) {
  while (sim.solver.time < t - 1e-9) sim.step(STEP);
  for (const s of zone.field.slices()) {
    if (seen.has(s.id) || t < s.blendFrom) continue;
    seen.add(s.id);
    if (t > s.blendFrom + 2 * STEP || s.tH < FROM - 5) continue;
    // F: the hand-over's height.
    if (part('F')) {
      H0.count += 1;
      library.surfaceAt(s.slice, t, caseCurve);
      const crestS = s.s + caseCurve[2 * WAVE_LANDMARK.crest];
      const crestY = s.mean + caseCurve[2 * WAVE_LANDMARK.crest + 1];
      const sc = seaCrestAt(s.lane, crestS, 3);
      const m = s.slice.match;
      for (const c of m.cases) {
        const id = library.cases[c.case].id.replace('periodic-pool-c2-', '').replace('-l12', '');
        const row = (CLAMPS[id] ??= { slices: 0, weight: 0, low: 0, high: 0, lowWeight: 0 });
        row.slices += 1;
        row.weight += c.weight;
        if (c.tauClamp < 0) { row.low += 1; row.lowWeight += c.weight; }
        if (c.tauClamp > 0) row.high += 1;
      }
      if (m.cases.some((c) => c.tauClamp !== 0)) H0.clampsTau += 1;
      if (m.clamp.slope !== 'in') H0.clampsSlope += 1;
      if (m.clamp.a0 === 'low' || m.clamp.a0 === 'high') H0.clampsA0 += 1;
      if (m.clamp.reefDepth === 'low' || m.clamp.reefDepth === 'high') H0.clampsReef += 1;
      if (!sc) H0.missed += 1;
      else {
        const ratio = caseH(s, t) / sc.H;
        H0.ratio.push(ratio);
        H0.crest.push(crestY - sc.y);
        if (s.end >= 0.99) H0.interior.push(ratio);
        const tauClean = !m.cases.some((c) => c.tauClamp !== 0 && c.weight > 0.05);
        if (tauClean && s.end >= 0.99) H0.tauClean.push(ratio);
        const clean = !m.cases.some((c) => c.tauClamp !== 0) && m.clamp.slope === 'in' && m.clamp.a0 !== 'low' && m.clamp.a0 !== 'high';
        if (clean && s.end >= 0.99) H0.clean.push(ratio);
      }
    }
    // A: follow this slice's bore through its blend-out (every 3rd lane keeps the cost down).
    if (part('A') && s.lane % 3 === 0 && s.goFrom < UNTIL - 1) {
      const back: Back = { slice: s, from: s.goFrom - 0.5, until: s.goneAt + 0.5, place: [], height: [], seaPlace: [], seaHeight: [], times: [], live: [], shares: [], want: Number.NaN, seaWant: Number.NaN, gap: Number.NaN };
      backs.push(back);
      allBacks.push(back);
    }
  }
  // A: the followed bores.
  if (part('A')) {
    for (let i = backs.length - 1; i >= 0; i -= 1) {
      const b = backs[i];
      if (t < b.from) continue;
      if (t > b.until) { backs.splice(i, 1); continue; }
      const k = b.slice.lane;
      if (!(b.want === b.want)) {
        library.surfaceAt(b.slice.slice, t, caseCurve);
        b.want = b.slice.s + caseCurve[2 * WAVE_LANDMARK.crest];
        b.seaWant = b.want;
      }
      const top = boreOf((s) => shownOn(k, s), b.want, 4);
      const seaTop = boreOf((s) => seaOn(k, s), b.seaWant, 4);
      if (!top || !seaTop) continue;
      b.want = top.top;
      b.seaWant = seaTop.top;
      b.place.push(top.s);
      b.height.push(top.y);
      b.seaPlace.push(seaTop.s);
      b.seaHeight.push(seaTop.y);
      b.times.push(t);
      b.live.push(zone.field.byLane[k].filter((o) => t >= o.blendFrom && t <= o.goneAt).length);
      b.shares.push(share(b.slice, t));
      // The gap the blend-out pays back, read once as it starts: the code's own two places, the case's crest and the
      // sea's crest as the slice has been following it (`FieldSlice.seaS`).
      if (!(b.gap === b.gap) && t >= b.slice.goFrom) {
        library.surfaceAt(b.slice.slice, t, caseCurve);
        const caseCrest = b.slice.s + caseCurve[2 * WAVE_LANDMARK.crest];
        b.gap = b.slice.seaS - caseCrest;
        A.gap.push(Math.abs(b.gap));
        A.heightGap.push(Math.abs(top.y - seaTop.y));
      }
    }
  }
  // C and D: one seat under a board, on a lane with a whole slice.
  if (part('C') || part('D')) {
    for (const shown of zone.surface.shown()) {
      const s = shown.slice;
      if (!(shown.share > 0.02) || s.lane % 7 !== 0) continue;
      if (seats.has(s.lane)) continue;
      seats.add(s.lane);
      const at = shown.curve[2 * WAVE_LANDMARK.crest] - 2;
      const x = lanes.baseX[s.lane] + at * lanes.rayX[s.lane];
      const z = lanes.baseZ[s.lane] + at * lanes.rayZ[s.lane];
      const surface = felt.surfaceAt(x, z);
      if (!(surface === surface)) continue;
      if (part('C')) {
        // The surface's own share of the library at this seat: Σ w a on the lanes, resampled on the 1 m render nodes,
        // exactly as the node heights are (`ZoneSurface.shareAt`).
        const nodes = zone.surface.shareAt(x, z);
        const flow = zone.surface.flowAt(x, surface - 0.05, z, flowOut);
        // What step 4 used instead: the same Σ w a evaluated at the point, from the slices on the seat's own lane.
        let at = 0;
        for (const other of zone.surface.shown()) {
          if (other.slice.lane !== s.lane || !(other.share > 0)) continue;
          const back = other.curve[0];
          const front = other.curve[2 * (WAVE_POINTS - 1)];
          const sAt = (x - lanes.baseX[s.lane]) * lanes.rayX[s.lane] + (z - lanes.baseZ[s.lane]) * lanes.rayZ[s.lane];
          at += other.slice.end * smoothstep((sAt - back) / 3) * smoothstep((front - sAt) / 3) * other.share;
        }
        at = Math.min(1, at);
        if (nodes > 0 || flow > 0) {
          C.nodes.push(nodes);
          C.point.push(flow);
          C.gap.push(Math.abs(nodes - flow));
          C.was.push(Math.abs(nodes - at));
          // The field's own σ ends, where the end taper runs out, against its middle.
          (s.end >= 0.99 ? C.inside : C.edge).push(Math.abs(nodes - flow));
        }
      }
      if (part('D')) {
        const rx = lanes.rayX[s.lane];
        const rz = lanes.rayZ[s.lane];
        for (const d of DEPTHS) {
          const row = (D[d.toFixed(2)] ??= { gap: [], share: [], felt: [] });
          const share = zone.surface.flowAt(x, surface - d, z, flowOut);
          if (!(share > 0)) { row.share.push(0); continue; }
          sea.sampleAt(x, sea.surfaceAt(x, z) - d, z, seaSample);
          const lib = flowOut[0] * rx + flowOut[2] * rz;
          const own = seaSample.flowX * rx + seaSample.flowZ * rz;
          row.gap.push(Math.abs(lib - own));
          row.share.push(share);
          // What a body there feels: the sea's own flow with the library's share of the library's over it.
          row.felt.push(Math.abs(own + share * (lib - own) - own));
        }
      }
    }
    seats.clear();
  }
  // E: the clock's step at a slice's throw.
  if (part('E')) {
    for (const s of zone.field.slices()) {
      if (thrown.has(s.id) || t < s.throwAt || s.throwAt < FROM) continue;
      thrown.add(s.id);
      const sl = s.slice;
      let r = 0;
      for (let k = 0; k < sl.n; k += 1) r += sl.weight[k] * Math.abs(sl.rate[k] - 1);
      E.rate.push(r);
      E.cases.push(sl.n);
      // The library's own du/dt at the crest, just before and just after the throw.
      const flow = new Float64Array(WAVE_POINTS * library.depthCount * FLOW_VALUES);
      const motion = new Float64Array(2 * WAVE_POINTS);
      const read = (when: number) => {
        library.flowProfileAt(sl, when, flow, motion);
        return flow[(WAVE_LANDMARK.crest * library.depthCount) * FLOW_VALUES + 2];
      };
      E.jump.push(Math.abs(read(s.throwAt + 0.02) - read(s.throwAt - 0.02)));
    }
  }
}

if (part('F')) {
  const outside = (v: number[]) => `${f((100 * v.filter((r) => !(r >= 0.95 && r <= 1.05)).length) / Math.max(1, v.length), 1)} %`;
  console.log(`\n## F. The hand-over's height bar, with ${library.cases.length} cases (${H0.count} slices, ${H0.missed} with no sea crest within 3 m)`);
  console.log(`  the case's H over the sea's (bar 0.95–1.05): ${line(H0.ratio)}; outside the bar ${outside(H0.ratio)}`);
  console.log(`  on the field's whole lanes: ${line(H0.interior)}, outside ${outside(H0.interior)}`);
  console.log(`  with no τ clamp over 5 % of the weight: ${line(H0.tauClean)}, outside ${outside(H0.tauClean)}`);
  console.log(`  with no clamp at all: ${line(H0.clean)}, outside ${outside(H0.clean)}`);
  console.log(`  the crest's place against the sea's, m (bar 0.25): ${line(H0.crest)}; over 0.25 ${over(H0.crest.map(Math.abs), 0.25)}`);
  console.log(`  clamped: τ ${H0.clampsTau}, slope ${H0.clampsSlope}, A0 ${H0.clampsA0}, HS/h0 ${H0.clampsReef} of ${H0.count}`);
  console.log(`  per case (slices that blend it; τ clamped low/high; the low clamp's share of its weight): ${Object.entries(CLAMPS).sort().map(([id, r]) => `${id} ${r.slices}: low ${r.low} (${f(r.lowWeight / Math.max(1e-9, r.weight), 2)}), high ${r.high}`).join('; ')}`);
}

if (part('A')) {
  const WINDOW = Math.round(0.1 / STEP);
  for (const b of allBacks) {
    for (let i = 1; i < b.place.length; i += 1) {
      if (b.times[i] - b.times[i - 1] > 1.5 * STEP) continue;
      A.stepPlace.push(Math.abs(b.place[i] - b.place[i - 1]));
      A.stepHeight.push(Math.abs(b.height[i] - b.height[i - 1]));
    }
    // The jump across the hand-back itself: the one step the slice is dropped on.
    for (let i = 1; i < b.place.length; i += 1) {
      if (b.times[i - 1] <= b.slice.goneAt && b.times[i] > b.slice.goneAt && b.times[i] - b.times[i - 1] < 1.5 * STEP) {
        A.dropPlace.push(Math.abs((b.place[i] - b.seaPlace[i]) - (b.place[i - 1] - b.seaPlace[i - 1])));
        A.dropHeight.push(Math.abs((b.height[i] - b.seaHeight[i]) - (b.height[i - 1] - b.seaHeight[i - 1])));
      }
    }
    for (let i = WINDOW; i < b.place.length; i += 1) {
      if (b.times[i] - b.times[i - WINDOW] > 1.5 * 0.1) continue;
      const own = Math.abs((b.place[i] - b.seaPlace[i]) - (b.place[i - WINDOW] - b.seaPlace[i - WINDOW]));
      const ownY = Math.abs((b.height[i] - b.seaHeight[i]) - (b.height[i - WINDOW] - b.seaHeight[i - WINDOW]));
      const two = Math.max(b.live[i], b.live[i - WINDOW]) > 1;
      (two ? A.twoPlace : A.onePlace).push(own);
      (two ? A.twoHeight : A.oneHeight).push(ownY);
      A.winPlace.push(Math.abs(b.place[i] - b.place[i - WINDOW]));
      A.winHeight.push(Math.abs(b.height[i] - b.height[i - WINDOW]));
      A.seaWinPlace.push(Math.abs(b.seaPlace[i] - b.seaPlace[i - WINDOW]));
      A.seaWinHeight.push(Math.abs(b.seaHeight[i] - b.seaHeight[i - WINDOW]));
      A.ownPlace.push(Math.abs((b.place[i] - b.seaPlace[i]) - (b.place[i - WINDOW] - b.seaPlace[i - WINDOW])));
      A.ownHeight.push(Math.abs((b.height[i] - b.seaHeight[i]) - (b.height[i - WINDOW] - b.seaHeight[i - WINDOW])));
    }
  }
  console.log(`\n## A. The hand-back (${allBacks.length} bores followed, ${A.winPlace.length} windows)`);
  console.log(`  the bore's place, the hand-back's own part over 0.1 s, m (bar 0.3): ${line(A.ownPlace)}; over 0.3 ${over(A.ownPlace, 0.3)}`);
  console.log(`  its height, the same, m (bar 0.05): ${line(A.ownHeight, 4)}; over 0.05 ${over(A.ownHeight, 0.05)}`);
  console.log(`  raw over 0.1 s: place ${line(A.winPlace)}; height ${line(A.winHeight, 4)}`);
  console.log(`  the sea's own over 0.1 s (the control): place ${line(A.seaWinPlace)}; height ${line(A.seaWinHeight, 4)}`);
  console.log(`  in one step (1/60 s): place ${line(A.stepPlace, 4)}; height ${line(A.stepHeight, 5)}`);
  console.log(`  the gap the blend-out pays back, m: ${line(A.gap, 2)}; the height gap then, m: ${line(A.heightGap, 3)}`);
  console.log(`  THE JUMP across the hand-back itself (the one step the slice is dropped on): place ${line(A.dropPlace, 4)} m (bar 0.3); over 0.3 ${over(A.dropPlace, 0.3)}`);
  console.log(`                                                                              height ${line(A.dropHeight, 5)} m (bar 0.05); over 0.05 ${over(A.dropHeight, 0.05)}`);
  console.log(`  the drift with one slice live on the lane: place ${line(A.onePlace)}, over 0.3 ${over(A.onePlace, 0.3)}; height ${line(A.oneHeight, 4)}, over 0.05 ${over(A.oneHeight, 0.05)}`);
  console.log(`  the drift with two:                        place ${line(A.twoPlace)}, over 0.3 ${over(A.twoPlace, 0.3)}; height ${line(A.twoHeight, 4)}, over 0.05 ${over(A.twoHeight, 0.05)}`);
}

if (part('C')) {
  console.log('\n## C. Ruling 35 item 2: the surface\'s share and the flow\'s at one seat');
  console.log(`  |the nodes' share − the point's| (bar 0.02): ${line(C.gap, 4)}; over 0.02 ${over(C.gap, 0.02)}`);
  console.log(`  in the field's middle (its lane's end weight 1): ${line(C.inside, 4)}; over 0.02 ${over(C.inside, 0.02)}`);
  console.log(`  at its σ ends (the end taper): ${line(C.edge, 4)}; over 0.02 ${over(C.edge, 0.02)}`);
  console.log(`  the nodes' share ${line(C.nodes, 3)}`);
  console.log(`  the point's share ${line(C.point, 3)}`);
  console.log(`  |the nodes' share − the same sum evaluated at the point| (what step 4 gave the flow): ${line(C.was, 4)}; over 0.02 ${over(C.was, 0.02)}`);
}

if (part('D')) {
  console.log('\n## D. Ruling 35 item 1: the flow below the deeper stored depth');
  for (const d of DEPTHS) {
    const row = D[d.toFixed(2)];
    if (!row) continue;
    console.log(`  ${d.toFixed(2)} m under the surface: the share ${line(row.share, 3)}; |library − sea| along the ray ${line(row.gap, 3)} m/s; what a body there feels over the sea's ${line(row.felt, 3)} m/s`);
  }
}

if (part('E')) {
  console.log('\n## E. Ruling 35 item 3: the clock\'s step at a slice\'s throw');
  console.log(`  Σ w |rate − 1| at the throw: ${line(E.rate, 4)}; the cases blended ${line(E.cases, 1)}`);
  console.log(`  |the step in the library's own du/dt across the throw|, m/s²: ${line(E.jump, 3)}`);
}

console.log(`\nthe sea's crest lost on a step, over the whole run: ${zone.surface.stats.seaMissed}`);
console.log(`\nran ${f((Date.now() - t0) / 1000, 0)} s wall; slices made ${zone.field.stats.made} (slope clamped ${zone.field.stats.slopeOut}, A0 clamped ${zone.field.stats.a0Out}, some τ clamped ${zone.field.stats.tauOut}, at the toe ${zone.field.stats.toeHandovers}); tracker ${JSON.stringify(zone.field.tracker.stats)}`);
