/**
 * C2 step 3's bars (2026-11-13; c2-step3.md): the library zone on the 2 m pool (`?poolSize=ref&wave=library` and the
 * owner's ride switches), the sea only: no rider, no page. The game's config path (`physicalSettingsFor`,
 * `surfZoneConfigFor` on a stand-in `location`), the game's sea (`SurfZoneSimulation`), the felt water as the runner
 * builds it (`PhysicalSurfWater.forSimulation` with the library's contact, `SweptContact.forLoft`, its loft rebuilt over
 * the felt nodes each step), and the page's drawing rebuilt from the snapshot (`writeUniformSnapshot`, the Rich cubic
 * surface, `LibraryLoft` with the sheet, the seam mask). Measured:
 * - **At the hand-over** (each slice where its blend starts): the case's crest over still water against the sea's along
 *   its lane, and its H (crest over the lowest water within 15 m ahead, the cases' 3 h0) against the sea's; at points a
 *   board would sit (−10 to +10 m along the lane from the crest), the period-mean of (felt − sea) (the mean step) and,
 *   through the blend, how fast (felt − sea) changes (the surface rising under the board; the felt water is the sea's).
 * - **Along the crest:** ruling 17's J1 (the share's step between neighbouring lanes: |Δα| |case − sea|), the whole step
 *   between neighbours at the same profile point, its rib (the middle of three off their line), J2 (the face's slope
 *   between neighbours, at the course's two ends), J3 (the zone's edges against the sea: height and slope steps), J5 (the
 *   share's step 1 m apart; the crest place off its neighbours' line).
 * - **The mesh:** each quad's fold (the angle between its two triangles' normals) on the contact's loft.
 * - **Drawn = felt:** at random points, the felt surface (`surfaceAt`) against the drawn one (the loft's floor where the
 *   seam mask is on, the cubic surface where it is off).
 * - The keys' clamps, the hand-over's rule, and the cost per step.
 * Run from the repository's root:
 *   npx rolldown docs/research/wave-strategy-alternatives/c2-step3-bars.ts -o <scratch>/bars.mjs --format esm --platform node
 *   node <scratch>/bars.mjs --cases public/library --cache <scratch>/sea21.bin --from 40 --until 200 [--out rows.json]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { rasterizeBarrelMask } from '../../../src/scene/barrel/barrelMask';
import { sampleCubicHeight } from '../../../src/scene/water/cubicSurface';
import { libraryFromBytes } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { SweptContact } from '../../../src/wave/barrel/sweptContact';
import { LOFT_SAMPLES } from '../../../src/wave/barrel/sweptLoft';
import { decodeWaveCase, PATH, PATH_COLUMNS, WAVE_LANDMARK, WAVE_POINTS } from '../../../src/wave/library/caseFormat';
import { LANE } from '../../../src/wave/library/Handover';
import { LibraryLoft } from '../../../src/wave/library/libraryLoft';
import { SLICE_LIFE, type FieldSlice } from '../../../src/wave/library/SliceField';
import { WaveLibrary } from '../../../src/wave/library/WaveLibrary';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const CASES = option('cases') ?? 'public/library';
const CACHE = option('cache');
const FROM = Number(option('from') ?? 40);
const UNTIL = Number(option('until') ?? 200);
const EVERY = Number(option('every') ?? 0.5);
const DRAWN_EVERY = Number(option('drawn-every') ?? 2);
const OUT = option('out');
const SEARCH = option('search') ?? '?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long';

(globalThis as unknown as { location: { search: string } }).location = { search: SEARCH };
const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
const config = { ...surfZoneConfigFor(settings as never, 1, false), wave: 'library' } as SurfZoneConfig;
const files = readdirSync(CASES).filter((f) => f.endsWith('.bin')).sort();
const library = new WaveLibrary(files.map((f) => decodeWaveCase(new Uint8Array(readFileSync(`${CASES}/${f}`)))));
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
const grid = sim.renderGrid(1);
const surface = new Float32Array(grid.nx * grid.nz * 2);
const flow = new Float32Array(grid.nx * grid.nz * 2);
const aeration = new Float32Array(grid.nx * grid.nz * 2);
const mask = new Uint8Array(grid.nx * grid.nz);
const pageLoft = new LibraryLoft(undefined, true);
const pageContact = SweptContact.forLoft(() => pageLoft.result);
const period = config.peakPeriod;
const STEP = 1 / 60;

const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const line = (v: number[], d = 3) => `median ${f(q(v, 0.5), d)}, 90 % ${f(q(v, 0.9), d)}, 99 % ${f(q(v, 0.99), d)}, most ${f(q(v, 1), d)} (${v.filter(Number.isFinite).length})`;
const over = (v: number[], bar: number) => `${f((100 * v.filter((x) => x > bar).length) / Math.max(1, v.filter(Number.isFinite).length), 1)} %`;
const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const share = (s: FieldSlice, t: number) => smoothstep((t - s.blendFrom) / SLICE_LIFE.blend) * (1 - smoothstep((t - s.goFrom) / SLICE_LIFE.blend));

// The sea along a lane at s m (η over still water).
const seaOn = (k: number, s: number) => zone.seaLevel(lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]);
/** The sea's crest along lane k nearest `want` within ±`reach` m, and its H over the lowest within 15 m ahead. */
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
/** The slice's case H at time t, m: its cases' path H at their τ, by weight, × h0. */
const tauOut = new Float64Array(8);
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
const caseCurve = new Float32Array(2 * WAVE_POINTS);

// ---- Collected readings.
const H0 = { crest: [] as number[], ratio: [] as number[], toe: [] as number[], tau: [] as number[], clampsTau: 0, clampsSlope: 0, clampsA0: 0, count: 0, missed: 0,
  /** The same two readings on the field's whole lanes (end weight 1) whose keys did not clamp. */
  cleanCrest: [] as number[], cleanRatio: [] as number[], interiorRatio: [] as number[], tauCleanRatio: [] as number[] };
const CLAMPS: Record<string, { slices: number; weight: number; low: number; high: number; lowWeight: number }> = {};
let ratio0: (s: FieldSlice, t: number) => number = () => Number.NaN;
interface Sitting { x: number; z: number; from: number; sum: number; n: number; last: number; rises: number[] }
const sitting: Sitting[] = [];
const MEAN = [] as number[];
const RISE = [] as number[];
const J = { share: [] as number[], whole: [] as number[], rib: [] as number[], seaWhole: [] as number[], j2On: [] as number[], j2Off: [] as number[], j2All: [] as number[], j5Share: [] as number[], j5Place: [] as number[], j3Height: [] as number[], j3Slope: [] as number[] };
const QUADS = { fold: [] as number[], over90: 0, quads: 0 };
const RIBS: Record<string, number[]> = {};
const FOLDS: Record<string, { quads: number; over90: number }> = {};
const DRAWN = { off: [] as number[], on: [] as number[], band: [] as number[] };
const COST = { field: [] as number[], surface: [] as number[], contact: [] as number[], page: [] as number[] };
const blended = new Set<number>();
let nextSample = FROM;
let nextDrawn = FROM;
const t0 = Date.now();

function handoverReadings(t: number): void {
  for (const s of zone!.field.slices()) {
    if (blended.has(s.id) || t < s.blendFrom) continue;
    blended.add(s.id);
    if (t > s.blendFrom + 2 * STEP || s.tH < FROM - 5) continue;
    H0.count += 1;
    library.surfaceAt(s.slice, t, caseCurve);
    const crestS = s.s + caseCurve[2 * WAVE_LANDMARK.crest];
    const crestY = s.mean + caseCurve[2 * WAVE_LANDMARK.crest + 1];
    const seaCrest = seaCrestAt(s.lane, crestS, 3);
    if (!seaCrest) { H0.missed += 1; continue; }
    ratio0 = (x, at) => caseH(x, at) / seaCrest.H;
    H0.crest.push(crestY - seaCrest.y);
    const ratio = caseH(s, t) / seaCrest.H;
    H0.ratio.push(ratio);
    const m0 = s.slice.match;
    for (const c of m0.cases) {
      const id = library.cases[c.case].id.replace('periodic-pool-c2-', '').replace('-l12', '');
      const row = (CLAMPS[id] ??= { slices: 0, weight: 0, low: 0, high: 0, lowWeight: 0 });
      row.slices += 1;
      row.weight += c.weight;
      if (c.tauClamp < 0) { row.low += 1; row.lowWeight += c.weight; }
      if (c.tauClamp > 0) row.high += 1;
    }
    const tauClean = !m0.cases.some((c) => c.tauClamp !== 0 && c.weight > 0.05);
    if (tauClean && s.end >= 0.99) H0.tauCleanRatio.push(ratio0(s, t));
    const clean = !m0.cases.some((c) => c.tauClamp !== 0) && m0.clamp.slope === 'in' && m0.clamp.a0 !== 'low' && m0.clamp.a0 !== 'high';
    if (s.end >= 0.99) H0.interiorRatio.push(ratio);
    if (clean && s.end >= 0.99) { H0.cleanCrest.push(crestY - seaCrest.y); H0.cleanRatio.push(ratio); }
    H0.toe.push(s.toeShare);
    H0.tau.push(s.throwAt - s.tH);
    const m = s.slice.match;
    if (m.cases.some((c) => c.tauClamp !== 0)) H0.clampsTau += 1;
    if (m.clamp.slope !== 'in') H0.clampsSlope += 1;
    if (m.clamp.a0 === 'low' || m.clamp.a0 === 'high') H0.clampsA0 += 1;
    // Where a board would sit: every 4th lane, 5 places along it.
    if (s.lane % 4 === 0) {
      for (const d of [-10, -5, 0, 5, 10]) {
        const at = crestS + d;
        sitting.push({ x: lanes.baseX[s.lane] + at * lanes.rayX[s.lane], z: lanes.baseZ[s.lane] + at * lanes.rayZ[s.lane], from: t, sum: 0, n: 0, last: Number.NaN, rises: [] });
      }
    }
  }
}

function sittingReadings(t: number): void {
  for (let i = sitting.length - 1; i >= 0; i -= 1) {
    const p = sitting[i];
    const gap = felt.surfaceAt(p.x, p.z) - sea.plainSurfaceAt(p.x, p.z);
    p.sum += gap;
    p.n += 1;
    if (t - p.from <= SLICE_LIFE.blend && p.last === p.last) p.rises.push(Math.abs(gap - p.last) / STEP);
    p.last = gap;
    if (t - p.from >= period) {
      MEAN.push(Math.abs(p.sum / p.n));
      RISE.push(...p.rises);
      sitting.splice(i, 1);
    }
  }
}

function crestReadings(t: number): void {
  const shown = zone!.surface.shown();
  const byLane = new Map<number, { slice: FieldSlice; curve: Float64Array; a: number; caseY: Float64Array }[]>();
  for (const { slice, curve } of shown) {
    const a = share(slice, t);
    library.surfaceAt(slice.slice, t, caseCurve);
    const caseY = new Float64Array(WAVE_POINTS);
    for (let i = 0; i < WAVE_POINTS; i += 1) caseY[i] = slice.mean + caseCurve[2 * i + 1];
    const list = byLane.get(slice.lane) ?? [];
    list.push({ slice, curve: Float64Array.from(curve), a, caseY });
    byLane.set(slice.lane, list);
  }
  const partner = (k: number, tH: number) => (byLane.get(k) ?? []).find((e) => Math.abs(e.slice.tH - tH) < 0.25 * period);
  const angle = (c: Float64Array, i: number) => {
    const a = Math.max(0, i - 1), b = Math.min(WAVE_POINTS - 1, i + 1);
    return (Math.atan2(c[2 * b + 1] - c[2 * a + 1], c[2 * b] - c[2 * a]) * 180) / Math.PI;
  };
  // The lanes' surfaces at a world point: lane k's (1 − W) η_sea + Σ W H at the point's place along it.
  const laneSurface = (k: number, x: number, z: number) => {
    const s = (x - lanes.baseX[k]) * lanes.rayX[k] + (z - lanes.baseZ[k]) * lanes.rayZ[k];
    const { weight, height } = zone!.surface.laneAt(k, s);
    const sea = zone!.seaLevel(lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]);
    return { w: weight, y: (1 - weight) * (sea === sea ? sea : 0) + height, sea };
  };
  const segment = (c: Float64Array, i: number) => {
    const ds = c[2 * i + 2] - c[2 * i];
    const dy = c[2 * i + 3] - c[2 * i + 1];
    return Math.hypot(ds, dy) > 0.01 && ds > 0 ? (Math.atan2(dy, ds) * 180) / Math.PI : Number.NaN;
  };
  const folded = (c: Float64Array) => { for (let i = 0; i + 1 < WAVE_POINTS; i += 1) if (c[2 * i + 2] < c[2 * i] - 1e-4) return true; return false; };
  for (const [k, list] of byLane) {
    for (const e of list) {
      const n1 = partner(k + 1, e.slice.tH);
      const inCourse = (a: number) => a > 0.001 && a < 0.999;
      if (n1) {
        if (inCourse(e.a) || inCourse(n1.a)) {
          // Ruling 17's J1: the share's step, |Δα| times the case over the sea there, at each profile point.
          for (let i = 0; i < WAVE_POINTS; i += 2) {
            if (!(e.a < 0.999)) continue;
            const seaY = (e.curve[2 * i + 1] - e.a * e.caseY[i]) / (1 - e.a);
            J.share.push(Math.abs(e.a - n1.a) * Math.abs(e.caseY[i] - seaY));
          }
          // J2: the face's slope between the two at the same profile point, the worst on the face (crest to toe), single-valued.
          if (!folded(e.curve) && !folded(n1.curve)) {
            let worst = 0;
            for (let i = WAVE_LANDMARK.crest; i < WAVE_LANDMARK.toe; i += 1) {
              const a = segment(e.curve, i);
              const b = segment(n1.curve, i);
              if (a === a && b === b) worst = Math.max(worst, Math.abs(a - b));
            }
            J.j2All.push(worst);
            if (e.a <= 0.25 && n1.a <= 0.25) J.j2On.push(worst);
            if (e.a >= 0.75 && n1.a >= 0.75) J.j2Off.push(worst);
          }
        }
        // The whole step and the rib, on the lanes' surfaces at the same world points along this lane (every 0.5 m).
        const n0 = partner(k - 1, e.slice.tH);
        for (let s = e.curve[0]; s <= e.curve[2 * (WAVE_POINTS - 1)]; s += 0.5) {
          const x = lanes.baseX[k] + s * lanes.rayX[k];
          const z = lanes.baseZ[k] + s * lanes.rayZ[k];
          const here = laneSurface(k, x, z);
          if (!(here.w > 0.5)) continue;
          const next = laneSurface(k + 1, x, z);
          if (next.w > 0.5) { J.whole.push(Math.abs(here.y - next.y)); J.seaWhole.push(Math.abs(here.sea - next.sea)); }
          if (n0) {
            const back = laneSurface(k - 1, x, z);
            if (back.w > 0.5 && next.w > 0.5) {
              const rib = Math.abs(back.y - 2 * here.y + next.y) / 2;
              J.rib.push(rib);
              // Where: before the throw, open, after touchdown; behind the crest, on the face, past the toe.
              const tau = t - e.slice.throwAt;
              const phase = tau < 0 ? 'pre' : tau < e.slice.touchdown ? 'open' : 'post';
              const part = s < e.curve[2 * WAVE_LANDMARK.crest] ? 'back' : s < e.curve[2 * WAVE_LANDMARK.toe] ? 'face' : 'front';
              (RIBS[`${phase} ${part}`] ??= []).push(rib);
            }
          }
        }
      }
      // J5: the share exactly 1 m along the crest either way (between the lanes there, linear), pairs in the course; and the
      // crest place off the line through the crest places 1 m either side.
      const at = (sigma: number): { a: number; x: number; z: number } | undefined => {
        let j = k;
        while (j + 1 < lanes.count && lanes.sigma[j + 1] < sigma) j += 1;
        while (j > 0 && lanes.sigma[j] > sigma) j -= 1;
        if (j + 1 >= lanes.count || sigma < lanes.sigma[0]) return undefined;
        const p0 = partner(j, e.slice.tH);
        const p1 = partner(j + 1, e.slice.tH);
        if (!p0 || !p1) return undefined;
        const u = (sigma - lanes.sigma[j]) / (lanes.sigma[j + 1] - lanes.sigma[j]);
        const s0 = p0.curve[2 * WAVE_LANDMARK.crest];
        const s1 = p1.curve[2 * WAVE_LANDMARK.crest];
        const x0 = lanes.baseX[j] + s0 * lanes.rayX[j], z0 = lanes.baseZ[j] + s0 * lanes.rayZ[j];
        const x1 = lanes.baseX[j + 1] + s1 * lanes.rayX[j + 1], z1 = lanes.baseZ[j + 1] + s1 * lanes.rayZ[j + 1];
        return { a: p0.a + u * (p1.a - p0.a), x: x0 + u * (x1 - x0), z: z0 + u * (z1 - z0) };
      };
      const ahead = at(lanes.sigma[k] + 1);
      const behind = at(lanes.sigma[k] - 1);
      if (ahead && (inCourse(e.a) || inCourse(ahead.a))) J.j5Share.push(Math.abs(e.a - ahead.a));
      if (ahead && behind) {
        const s = e.curve[2 * WAVE_LANDMARK.crest];
        const bx = lanes.baseX[k] + s * lanes.rayX[k], bz = lanes.baseZ[k] + s * lanes.rayZ[k];
        const lx = ahead.x - behind.x, lz = ahead.z - behind.z;
        const len = Math.hypot(lx, lz);
        if (len > 0.5) J.j5Place.push(Math.abs((bx - behind.x) * lz - (bz - behind.z) * lx) / len);
      }
      // J3: at the frame's two ends on the lane's own stations (ruling 17's reading at the first vertex with a share): the
      // first station inside, its height over the sea, and the slope from it to the station outside against the sea's.
      if (e.a >= 0.999) {
        for (const [end, inward] of [[e.curve[0], 1], [e.curve[2 * (WAVE_POINTS - 1)], -1]] as const) {
          const first = inward > 0 ? Math.ceil(end / LANE.step) * LANE.step : Math.floor(end / LANE.step) * LANE.step;
          const outside = first - inward * LANE.step;
          const P = (s: number) => [lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]] as const;
          const a = laneSurface(k, ...P(first));
          const b = laneSurface(k, ...P(outside));
          if (!(a.sea === a.sea && b.sea === b.sea)) continue;
          J.j3Height.push(Math.abs(a.y - a.sea));
          const zoneSlope = (Math.atan((a.y - b.y) / LANE.step) * 180) / Math.PI;
          const seaSlope = (Math.atan((a.sea - b.sea) / LANE.step) * 180) / Math.PI;
          J.j3Slope.push(Math.abs(zoneSlope - seaSlope));
        }
      }
    }
  }
  // The contact's loft: each joined quad's fold.
  const loft = zone!.loft.result;
  const p = loft.positions;
  // A triangle's normal; none for a sliver (twice its area under 2 cm²: the lip and throat points coincide before the throw).
  const normal = (a: number, b: number, c: number) => {
    const ux = p[3 * b] - p[3 * a], uy = p[3 * b + 1] - p[3 * a + 1], uz = p[3 * b + 2] - p[3 * a + 2];
    const vx = p[3 * c] - p[3 * a], vy = p[3 * c + 1] - p[3 * a + 1], vz = p[3 * c + 2] - p[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    return l > 2e-4 ? [nx / l, ny / l, nz / l] : undefined;
  };
  for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
    if (loft.sliceJoined[s] !== 1) continue;
    for (let j = 0; j + 1 < LOFT_SAMPLES; j += 1) {
      const v00 = s * LOFT_SAMPLES + j;
      const v10 = v00 + LOFT_SAMPLES;
      // Only where the loft is drawn off the water (on it, it is the nodes' own surface).
      if (!(Math.max(loft.lift[v00], loft.lift[v00 + 1], loft.lift[v10], loft.lift[v10 + 1]) > 0)) continue;
      const n1 = normal(v00, v10, v00 + 1);
      const n2 = normal(v00 + 1, v10, v10 + 1);
      if (!n1 || !n2) continue;
      const fold = (Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180) / Math.PI;
      QUADS.quads += 1;
      if (fold > 90) QUADS.over90 += 1;
      QUADS.fold.push(fold);
      const i = j - 3;
      const part = i < 0 || i >= WAVE_POINTS - 1 ? 'ext' : i < WAVE_LANDMARK.crest ? 'back' : i < WAVE_LANDMARK.lip ? 'crest-lip' : i < WAVE_LANDMARK.throat ? 'lip-throat' : i < WAVE_LANDMARK.toe ? 'throat-toe' : 'front';
      const phase = loft.slicePhase[s] === 0 && loft.slicePhase[s + 1] === 0 ? 'pre' : loft.slicePhase[s] === 2 && loft.slicePhase[s + 1] === 2 ? 'post' : loft.slicePhase[s] !== loft.slicePhase[s + 1] ? 'mixed' : 'open';
      const row = (FOLDS[`${phase} ${part}`] ??= { quads: 0, over90: 0 });
      row.quads += 1;
      if (fold > 90) row.over90 += 1;
    }
  }
}

function drawnReadings(): void {
  const start = performance.now();
  sim.writeUniformSnapshot(surface, flow, aeration, grid);
  const curves = zone!.surface.curves;
  const count = zone!.surface.curveCount;
  const heightAt = (x: number, z: number) => sampleCubicHeight(surface, grid, x, z);
  const loft = pageLoft.build(curves, count, heightAt);
  rasterizeBarrelMask(loft, grid, mask);
  pageContact.update(new Float32Array(0), 0, config.tide, () => 0);
  COST.page.push(performance.now() - start);
  const maskAt = (x: number, z: number) => {
    const gx = (x - grid.xMin) / grid.spacing, gz = (z - grid.zMin) / grid.spacing;
    const i = Math.floor(gx), j = Math.floor(gz);
    if (i < 0 || j < 0 || i + 1 >= grid.nx || j + 1 >= grid.nz) return 0;
    const tx = gx - i, tz = gz - j, o = j * grid.nx + i;
    return ((mask[o] * (1 - tx) + mask[o + 1] * tx) * (1 - tz) + (mask[o + grid.nx] * (1 - tx) + mask[o + grid.nx + 1] * tx) * tz) / 255;
  };
  // Random points over the shown slices' frames.
  const shown = zone!.surface.shown();
  if (shown.length === 0) return;
  let seed = 12345 + Math.round(sim.solver.time * 60);
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let n = 0; n < 1500; n += 1) {
    const { slice, curve } = shown[Math.floor(random() * shown.length)];
    const s = curve[0] + random() * (curve[2 * (WAVE_POINTS - 1)] - curve[0]);
    const across = (random() - 0.5) * LANE.spacing;
    const k = slice.lane;
    const x = lanes.baseX[k] + s * lanes.rayX[k] + across * lanes.rayZ[k];
    const z = lanes.baseZ[k] + s * lanes.rayZ[k] - across * lanes.rayX[k];
    const feltY = felt.surfaceAt(x, z);
    const m = maskAt(x, z);
    const cubic = heightAt(x, z);
    const floor = pageContact.floorAt(x, z);
    if (m <= 0.05) DRAWN.off.push(Math.abs(feltY - cubic));
    else if (m >= 0.95) DRAWN.on.push(Math.abs(feltY - (floor === floor ? floor : cubic)));
    else DRAWN.band.push(Math.abs((floor === floor ? floor : cubic) - cubic));
  }
}

console.log(`C2 step 3 bars: ${SEARCH}&wave=library; cases ${files.join(', ')}; lanes ${lanes.count} (σ ${f(lanes.sigma[lanes.count - 1], 1)} m), footprint ${zone.surface.footprint} nodes; from ${FROM} to ${UNTIL} s (solver), sea built at ${f(sim.solver.time, 1)} s`);
while (sim.solver.time < UNTIL) {
  sim.step(STEP);
  const t = sim.solver.time;
  const c0 = performance.now();
  felt.withSurfaceNodeCache(() => zone.contactLoft((x, z) => felt.plainSurfaceAt(x, z)));
  contact.update(new Float32Array(0), 0, config.tide, () => 0);
  const contactMs = performance.now() - c0;
  if (t < FROM) continue;
  COST.field.push(zone.costs.field);
  COST.surface.push(zone.costs.surface);
  COST.contact.push(contactMs);
  handoverReadings(t);
  sittingReadings(t);
  if (t >= nextSample) { nextSample += EVERY; crestReadings(t); }
  if (t >= nextDrawn) { nextDrawn += DRAWN_EVERY; drawnReadings(); }
}
const stats = zone.field.stats;
console.log(`ran ${f((Date.now() - t0) / 1000, 0)} s wall; slices made ${stats.made} (slope clamped ${stats.slopeOut}, A0 clamped ${stats.a0Out}, some τ clamped ${stats.tauOut}, at the toe ${stats.toeHandovers}); tracker ${JSON.stringify(zone.field.tracker.stats)}`);
console.log(`\n=== at the hand-over (each slice where its blend starts; ${H0.count} slices, ${H0.missed} with no sea crest within 3 m) ===`);
console.log(`crest: the case's over still water less the sea's (bar within 0.25 m): ${line(H0.crest)}; |gap| over 0.25: ${over(H0.crest.map(Math.abs), 0.25)}`);
const outside = (v: number[]) => `${f((100 * v.filter((r) => !(r >= 0.95 && r <= 1.05)).length) / Math.max(1, v.length), 1)} %`;
console.log(`height: the case's H over the sea's (bar 0.95–1.05): ${line(H0.ratio)}; outside the bar: ${outside(H0.ratio)}`);
console.log(`   on the field's whole lanes (end weight 1): ${line(H0.interiorRatio)}, outside ${outside(H0.interiorRatio)}; and of those no key clamped: ${line(H0.cleanRatio)}, outside ${outside(H0.cleanRatio)}; their crest gap ${line(H0.cleanCrest)}`);
console.log(`   of them τ-clamped ${H0.clampsTau}, slope-clamped ${H0.clampsSlope}, A0-clamped ${H0.clampsA0}; the toe's share ${line(H0.toe, 2)}; the library's throw after t_h ${line(H0.tau, 2)} s`);
console.log(`   with no τ clamp weighing over 5 % (the field's whole lanes): ${line(H0.tauCleanRatio)}, outside ${outside(H0.tauCleanRatio)}`);
console.log(`   the cases' τ clamps (slices that blend each; clamped below its first frame, above its throw; their weight): ${Object.entries(CLAMPS).sort().map(([id, r]) => `${id} ${r.slices}: low ${r.low} (${f(r.lowWeight / Math.max(1e-9, r.weight), 2)} of its weight), high ${r.high}`).join('; ')}`);
console.log(`the mean step under a board (|period-mean of felt − sea| at points −10…+10 m along the lane; bar 0.03 m): ${line(MEAN)}; over 0.03: ${over(MEAN, 0.03)}`);
console.log(`the surface rising under a board through the blend (|d(felt − sea)/dt|; bar 0.4 m/s median): ${line(RISE, 2)}`);
console.log('\n=== along the crest ===');
console.log(`J1, the share's step between neighbouring lanes (|Δα| |case − sea|; bar 0.05 m at 90 %, 0.10 most): ${line(J.share)}; over 0.05 ${over(J.share, 0.05)}, over 0.10 ${over(J.share, 0.1)}`);
console.log(`(a diagnostic) the whole step between neighbouring lanes' surfaces at the same world point (lanes ≈ 0.7 m apart): ${line(J.whole)}; the sea's own there ${line(J.seaWhole)}`);
console.log(`   the rib (the middle lane of three off their line, at the same world point): ${line(J.rib)}; over 0.02 ${over(J.rib, 0.02)}`);
console.log(`   the rib by where it is (phase, part): ${Object.entries(RIBS).sort().map(([k, v]) => `${k}: 90 % ${f(q(v, 0.9))}, over 0.02 ${over(v, 0.02)} (${v.length})`).join('; ')}`);
console.log(`J2, the face's slope between neighbouring lanes, worst on the face (bar 2° at 90 %, 4° most, both ends of the course): start ${line(J.j2On, 2)}; end ${line(J.j2Off, 2)}; all ${line(J.j2All, 2)}`);
console.log(`J3, at the frames' two ends on the lanes' stations (the first inside against the sea; the slope to the one outside): height ${line(J.j3Height, 4)} m (bar 0.01); slope step ${line(J.j3Slope, 2)}° (bar 2)`);
console.log(`J5, the share's step 1 m apart (pairs in the course): over 0.2 in ${over(J.j5Share, 0.2)} of ${J.j5Share.length} (bar under 5 %; ${line(J.j5Share, 3)}); the crest place off its neighbours' line: over 0.5 m in ${over(J.j5Place, 0.5)} (bar under 10 %; ${line(J.j5Place, 3)} m)`);
console.log('\n=== the mesh and drawn = felt ===');
console.log(`quads of the contact's loft off the water (slivers left out): ${QUADS.quads}; folded over 90°: ${QUADS.over90}; the fold ${line(QUADS.fold, 1)}°`);
console.log(`   folds by where (slices' phases, profile part): ${Object.entries(FOLDS).sort().map(([k, r]) => `${k}: ${r.over90} of ${r.quads}`).join('; ')}`);
console.log(`drawn = felt (bar 0.005 m): where the seam mask is off ${line(DRAWN.off, 4)}; on ${line(DRAWN.on, 4)}; in its dithered band, the loft against the cubic surface ${line(DRAWN.band, 4)}`);
console.log('\n=== cost per step on this machine (ms) ===');
console.log(`worker: hand-over and slices ${line(COST.field, 2)}; the zone's surface ${line(COST.surface, 2)}; the contact's loft ${line(COST.contact, 2)}; page (snapshot write + loft + mask, measured here): ${line(COST.page, 2)}`);
if (OUT) writeFileSync(OUT, JSON.stringify({ H0, MEAN, RISE, J, QUADS: { over90: QUADS.over90, quads: QUADS.quads }, DRAWN, COST }));
