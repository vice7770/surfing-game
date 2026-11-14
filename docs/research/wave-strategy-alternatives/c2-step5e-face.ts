/**
 * C2 step 5e (2026-11-14; c2-step5e.md): **the face angle a rider meets**, measured the way a rider meets it — the
 * slope of the water surface along the path from the trough up to the crest, in the ridable zone — on the three waves
 * the owner can ride, and against the library asset's own shape.
 *
 * The question it answers: our wave gives a rider a 16° face; a real bottom turn wants 30–45°. **Where is the shape
 * lost?** The advisor's read of the Basilisk cases (consult-log, 2026-11-14) says the asset itself carries 30–52° at
 * τ = −1 and 48–70° at τ = −0.5, so if the rider reads 19° the loss is downstream of the asset.
 *
 * Every face is reduced four ways, so the numbers are comparable both to the surfer track's `FaceWater` and to
 * Carini 2019's 4200 real waves:
 * - **local** — the steepest slope anywhere on the face, as the body reads it (the sampled gradient for the felt
 *   surfaces, the segment slope for the asset's own curve). This is the surfer track's "steepest slope".
 * - **upper80** — a least-squares line through the upper 80 % of the face (Carini's own window: her plunging median is
 *   16.45°, 95th 27.46°). The full face reads low because of the curvature near the trough.
 * - **chord2** — the steepest 2 m chord of the face. This is the brief's "30–45° over about 2 m" taken literally.
 *   **chord1** is the same over 1 m, which is the most a 1 m node grid can carry at all: the library zone's nodes are
 *   `renderGrid(1)` by construction (`SurfZoneSimulation`, the `?wave=library` branch), and `?renderSpacing` does not
 *   reach them.
 * - **turn** — the slope *change* from the trough to the steepest point. The advisor's reduction says the load factor
 *   needs 40–50° of this along the rider's own path, and it is the only one of the four the identity n = 1/cos φ cares
 *   about.
 *   Plus the slope at height fractions 0.05 … 0.95, so the profile's shape shows and not only its maximum.
 *
 * Parts (`--parts`, default `NRDC`):
 * - **N, the asset.** Each case's own 128-point curve (`WaveLibrary.caseFrameAt`) at τ −3 … +1, reduced the four ways.
 *   No simulation: the curve's x and y share a scale, so its angles are the asset's angles. 19 cases.
 * - **R, the rider's surface under `?wave=library`.** The game's 2 m pool with the switch on, built down the game's own
 *   config path, stepped on the CPU; the face read through `PhysicalSurfWater.forSimulation` — the water the bodies
 *   read, at the render nodes the snapshot draws — along each live slice's own lane ray, every `--ds` m, every 0.1 s.
 *   Reported per slice against its own τ, so it lines up with N frame for frame. `--spacing` re-reads the same sea at a
 *   finer node grid (the `?renderSpacing` lever), which separates the sampler's loss from the shape's.
 * - **D, the 2 m pool Barrel as it ships** (the switch off), the same reading along the same lanes.
 * - **C, Canyon B** (`?canyonWaves=true`), the rider's own test spot, read along +z in the arm's columns.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/wave-strategy-alternatives/c2-step5e-face.ts -o <scratch>/s5e.mjs --format esm --platform node
 *   node <scratch>/s5e.mjs --parts N
 *   node <scratch>/s5e.mjs --parts RD --cache <scratch>/sea21.bin --from 40 --until 130
 *   node <scratch>/s5e.mjs --parts R --spacing 0.5,0.25 --from 40 --until 90
 *   node <scratch>/s5e.mjs --parts C --from 60 --until 140
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type WaterSample } from '../../../src/physics/SurfWater';
import { libraryFromBytes } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { SweptContact } from '../../../src/wave/barrel/sweptContact';
import { decodeWaveCase, WAVE_POINTS } from '../../../src/wave/library/caseFormat';
import { LANE } from '../../../src/wave/library/Handover';
import { LIFT } from '../../../src/wave/library/libraryLoft';
import { MAX_BLEND as BLEND_CAP, WaveLibrary } from '../../../src/wave/library/WaveLibrary';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const CASES = option('cases') ?? 'public/library';
const CACHE = option('cache');
const FROM = Number(option('from') ?? 40);
const UNTIL = Number(option('until') ?? 130);
const PARTS = option('parts') ?? 'NRDC';
const DS = Number(option('ds') ?? 0.05);
const SPACINGS = (option('spacing') ?? '1').split(',').map(Number);
/**
 * Part N's scale, m: the case curves are stored in h0, and `chord2` and the arcs are metres, so the curve is scaled by
 * h0 before it is reduced. The 2 m pool's slices read h0 = `--h0` (part R prints the sea's own, which is where this
 * default comes from); angles themselves do not depend on it.
 */
const H0 = Number(option('h0') ?? 4.9);
/**
 * `--lift on,bridge,gentle` overwrites `LIFT`'s three angles for the run (degrees), so part R can be read with the
 * bridge out of the way. The bridge is what the nodes do with water steeper than `LIFT.bridge`: a cubic Hermite from
 * the ≤ `LIFT.gentle` ground each side, which is the only thing between the asset's shape and the rider. Raising all
 * three to 90 measures what a 1 m node grid can hold on its own; leaving it alone measures what ships.
 */
const LIFTS = option('lift')?.split(',').map(Number);
/** `--dump` prints the first few faces, point by point, so the window and the direction can be checked before quoting. */
const DUMP = process.argv.includes('--dump');
const OUT = option('out');
const part = (letter: string) => PARTS.includes(letter);
if (LIFTS) {
  const lift = LIFT as unknown as { on: number; bridge: number; gentle: number };
  [lift.on, lift.bridge, lift.gentle] = [LIFTS[0] ?? LIFT.on, LIFTS[1] ?? LIFT.bridge, LIFTS[2] ?? LIFT.gentle];
}
const DEG = 180 / Math.PI;
const STEP = 1 / 60;

const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
/** A population, as the round reports them: the count, the median, and the band it lies in. */
const band = (v: number[], d = 1) => {
  const n = v.filter(Number.isFinite).length;
  return n ? `${f(q(v, 0.5), d)} (${f(q(v, 0.05), d)}–${f(q(v, 0.95), d)}, most ${f(q(v, 1), d)}; n ${n})` : '– (n 0)';
};

/** The height fractions up the face the profile is read at. */
const FRACTIONS = [0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95];

export interface Face {
  /** Trough-to-crest height, m, and the face's horizontal run, m. */
  H: number;
  run: number;
  /** The four reductions, degrees. */
  local: number;
  upper80: number;
  chord2: number;
  chord1: number;
  turn: number;
  /** Where the steepest point sits, as a share of the height up from the trough. */
  steepFrac: number;
  /** The slope at each of FRACTIONS, degrees. */
  profile: number[];
  /** The arc the face spends over 30°, m (0 where it never does). */
  steepArc: number;
  /**
   * The water's own flow along the face's own direction at the crest, at the steepest point and at the trough, m/s
   * (positive onshore), and the share of the face the loft's ceiling covers. NaN where the caller reads no flow: part N
   * has none. The three flows are what a `FaceWater` match is fitted to (face-hold's calibration.md, part 2).
   */
  uCrest: number;
  uSteep: number;
  uTrough: number;
  covered: number;
}

/**
 * A face from one monotone profile: `pts` runs **from the trough up to the crest**, each point its horizontal distance
 * along the face (increasing) and its surface height. `localSlope` is the slope the surface itself reports at that
 * point in degrees where the caller has one (the sampled gradient, which is what a board reads); without it the
 * segment slopes are used.
 *
 * The run is measured between the trough and the crest, so `upper80` is Carini's own window (her "upper 80 % of the
 * face", fitted as a line) and `chord2` scans every 2 m window of it.
 */
export function faceOf(
  pts: { d: number; y: number }[], localSlope?: number[],
  flow?: { u: number[]; covered: boolean[] },
): Face | undefined {
  const n = pts.length;
  if (n < 4) return undefined;
  const H = pts[n - 1].y - pts[0].y;
  const run = pts[n - 1].d - pts[0].d;
  if (!(H > 0.1) || !(run > 0.2)) return undefined;
  // local: the steepest the face gets, as the surface reports it.
  let local = 0;
  let steepAt = 0;
  for (let i = 0; i < n; i += 1) {
    const a = localSlope ? localSlope[i] : (i + 1 < n ? Math.atan((pts[i + 1].y - pts[i].y) / Math.max(1e-6, pts[i + 1].d - pts[i].d)) * DEG : 0);
    if (a > local) { local = a; steepAt = i; }
  }
  // upper80: a least-squares line through the upper 80 % of the height.
  const yLow = pts[0].y + 0.2 * H;
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0; let m = 0;
  for (const p of pts) {
    if (p.y < yLow) continue;
    sx += p.d; sy += p.y; sxx += p.d * p.d; sxy += p.d * p.y; m += 1;
  }
  const upper80 = m > 2 && m * sxx - sx * sx > 1e-9 ? Math.atan((m * sxy - sx * sy) / (m * sxx - sx * sx)) * DEG : Number.NaN;
  // chord2 / chord1: the steepest 2 m and 1 m chord anywhere on the face (the whole face where it is shorter).
  const chordOf = (span: number) => {
    let most = 0;
    for (let i = 0; i < n; i += 1) {
      let j = i;
      while (j + 1 < n && pts[j + 1].d - pts[i].d <= span) j += 1;
      const dd = pts[j].d - pts[i].d;
      if (!(dd > 0.25 * span)) continue;
      const a = Math.atan((pts[j].y - pts[i].y) / dd) * DEG;
      if (a > most) most = a;
    }
    return most;
  };
  const chord2 = chordOf(2);
  const chord1 = chordOf(1);
  // turn: the slope change the rider's path turns through, trough to the steepest point.
  const slopeAt = (i: number) => (localSlope ? localSlope[i] : (i + 1 < n ? Math.atan((pts[i + 1].y - pts[i].y) / Math.max(1e-6, pts[i + 1].d - pts[i].d)) * DEG : 0));
  const turn = local - slopeAt(0);
  // The arc over 30°, and the profile at the fractions.
  let steepArc = 0;
  for (let i = 0; i + 1 < n; i += 1) {
    const seg = Math.hypot(pts[i + 1].d - pts[i].d, pts[i + 1].y - pts[i].y);
    if (0.5 * (slopeAt(i) + slopeAt(i + 1)) >= 30) steepArc += seg;
  }
  const profile = FRACTIONS.map((fr) => {
    const want = pts[0].y + fr * H;
    let best = 0;
    let gap = Infinity;
    for (let i = 0; i < n; i += 1) { const g = Math.abs(pts[i].y - want); if (g < gap) { gap = g; best = i; } }
    return slopeAt(best);
  });
  const covered = flow ? flow.covered.filter(Boolean).length / Math.max(1, flow.covered.length) : Number.NaN;
  return {
    H, run, local, upper80, chord2, chord1, turn, steepFrac: (pts[steepAt].y - pts[0].y) / H, profile, steepArc,
    uCrest: flow ? flow.u[n - 1] : Number.NaN, uSteep: flow ? flow.u[steepAt] : Number.NaN, uTrough: flow ? flow.u[0] : Number.NaN, covered,
  };
}

interface Bucket { local: number[]; upper80: number[]; chord2: number[]; chord1: number[]; turn: number[]; steepFrac: number[]; steepArc: number[]; H: number[]; run: number[]; profile: number[][]; uCrest: number[]; uSteep: number[]; uTrough: number[]; covered: number[] }
const bucket = (): Bucket => ({ local: [], upper80: [], chord2: [], chord1: [], turn: [], steepFrac: [], steepArc: [], H: [], run: [], profile: FRACTIONS.map(() => []), uCrest: [], uSteep: [], uTrough: [], covered: [] });
const add = (b: Bucket, face: Face) => {
  b.local.push(face.local); b.upper80.push(face.upper80); b.chord2.push(face.chord2); b.chord1.push(face.chord1); b.turn.push(face.turn);
  b.steepFrac.push(face.steepFrac); b.steepArc.push(face.steepArc); b.H.push(face.H); b.run.push(face.run);
  b.uCrest.push(face.uCrest); b.uSteep.push(face.uSteep); b.uTrough.push(face.uTrough); b.covered.push(face.covered);
  face.profile.forEach((v, i) => b.profile[i].push(v));
};
const report = (name: string, b: Bucket) => {
  console.log(`  ${name}`);
  console.log(`    H ${band(b.H, 2)} m · run ${band(b.run, 1)} m · steepest at ${band(b.steepFrac, 2)} of H`);
  console.log(`    local ${band(b.local)}° · upper80 ${band(b.upper80)}° · chord2 ${band(b.chord2)}° · chord1 ${band(b.chord1)}° · turn ${band(b.turn)}°`);
  console.log(`    over 30°, arc ${band(b.steepArc, 2)} m · share of faces whose local reaches 30° ${f((100 * b.local.filter((v) => v >= 30).length) / Math.max(1, b.local.length))} %`);
  console.log(`    profile up the face: ${FRACTIONS.map((fr, i) => `${(100 * fr).toFixed(0)} % ${f(q(b.profile[i], 0.5))}°`).join(' · ')}`);
  if (b.uCrest.some(Number.isFinite)) {
    console.log(`    the water along the face, m/s (onshore +): crest ${band(b.uCrest, 2)} · steepest ${band(b.uSteep, 2)} · trough ${band(b.uTrough, 2)}`);
    console.log(`    the share of the face under the loft's ceiling: ${band(b.covered, 3)}`);
  }
};

// ---------------------------------------------------------------- N. The asset's own shape.
const needLibrary = part('N') || part('R') || part('D');
const library = needLibrary
  ? new WaveLibrary(readdirSync(CASES).filter((n) => n.endsWith('.bin')).sort().map((n) => decodeWaveCase(new Uint8Array(readFileSync(`${CASES}/${n}`)))))
  : undefined;

if (part('N') && library) {
  console.log('\n## N. The asset: each Basilisk case\'s own face, from its own 128-point curve');
  console.log(`  (the curve is stored in h0 and scaled by h0 = ${f(H0, 2)} m here, so the arcs and chord2 are metres; the angles do not depend on it. Forward of the crest, to the first overhang.)`);
  const curve = new Float64Array(2 * WAVE_POINTS);
  const whole = bucket();
  const byTau = new Map<string, Bucket>();
  const rows: string[] = [];
  for (let i = 0; i < library.cases.length; i += 1) {
    const c = library.cases[i];
    const last = c.tauStart + (c.count - 1) * c.tauStep;
    const own = bucket();
    for (let tau = Math.max(c.tauStart, -3); tau <= Math.min(last, 1); tau += 0.1) {
      library.caseFrameAt(i, tau, curve);
      // The curve runs from offshore to onshore; its crest is its highest point. The face is forward (onshore) of the
      // crest, down to the trough ahead, and stops at the first overhang (x going back on itself).
      let crest = 0;
      for (let k = 1; k < WAVE_POINTS; k += 1) if (curve[2 * k + 1] > curve[2 * crest + 1]) crest = k;
      // Which way is onshore: the side whose far point is lower.
      const dir = curve[1] < curve[2 * (WAVE_POINTS - 1) + 1] ? -1 : 1;
      const pts: { d: number; y: number }[] = [];
      let x0 = curve[2 * crest];
      for (let k = crest; k >= 0 && k < WAVE_POINTS; k += dir) {
        const x = curve[2 * k];
        const y = curve[2 * k + 1];
        const d = dir > 0 ? x - x0 : x0 - x;
        // Overhang: the profile turning back on itself ends the single-valued face.
        if (pts.length && d < pts[pts.length - 1].d) break;
        pts.push({ d, y });
        // Past the trough: once the surface has risen 0.05 h0 off its lowest, stop.
        let low = pts[0].y;
        for (const p of pts) if (p.y < low) low = p.y;
        if (y > low + 0.05) break;
      }
      // Trim back to the trough and turn it the other way up (trough first).
      let lowAt = 0;
      for (let k = 0; k < pts.length; k += 1) if (pts[k].y < pts[lowAt].y) lowAt = k;
      const face = faceOf(pts.slice(0, lowAt + 1).reverse().map((p) => ({ d: H0 * (pts[lowAt].d - p.d), y: H0 * p.y })));
      if (!face) continue;
      add(own, face); add(whole, face);
      const key = `${tau < -2.5 ? '≤ −2.5' : tau < -1.5 ? '−2.5 … −1.5' : tau < -0.75 ? '−1.5 … −0.75' : tau < -0.25 ? '−0.75 … −0.25' : tau < 0.25 ? '−0.25 … +0.25' : '> +0.25'}`;
      if (!byTau.has(key)) byTau.set(key, bucket());
      add(byTau.get(key) as Bucket, face);
    }
    rows.push(`${c.id.replace('periodic-pool-c2-', '').replace('-l12', '')}: local ${f(q(own.local, 1), 0)}° most · chord2 ${f(q(own.chord2, 1), 0)}° most · over 30° in ${f((100 * own.local.filter((v) => v >= 30).length) / Math.max(1, own.local.length), 0)} % of its frames`);
  }
  for (const r of rows) console.log(`  ${r}`);
  console.log('');
  for (const key of ['≤ −2.5', '−2.5 … −1.5', '−1.5 … −0.75', '−0.75 … −0.25', '−0.25 … +0.25', '> +0.25']) {
    const b = byTau.get(key);
    if (b) report(`τ ${key} (√(h0/g) before verticality)`, b);
  }
  report('every case, every frame', whole);
}

// ---------------------------------------------------------------- The game's seas.
if (!(part('R') || part('D') || part('C'))) process.exit(0);

/** A face read along a ray through the felt water: from the crest nearest `want` down to the trough ahead of it. */
function feltFace(
  water: PhysicalSurfWater, sample: WaterSample, atX: (s: number) => number, atZ: (s: number) => number,
  from: number, to: number,
): Face | undefined {
  const pts: { d: number; y: number }[] = [];
  const slopes: number[] = [];
  const us: number[] = [];
  const cover: boolean[] = [];
  for (let s = from; s <= to + 1e-9; s += DS) {
    water.sampleAt(atX(s), 50, atZ(s), sample);
    const y = sample.surfaceY;
    if (!(y === y)) return undefined;
    // The slope along the ray, in degrees, downhill positive (the ray runs onshore, down the face).
    const dxds = (atX(s + 1e-3) - atX(s)) / 1e-3;
    const dzds = (atZ(s + 1e-3) - atZ(s)) / 1e-3;
    const along = sample.slopeX * dxds + sample.slopeZ * dzds;
    pts.push({ d: s - from, y });
    slopes.push(Math.atan(-along) * DEG);
    us.push(sample.flowX * dxds + sample.flowZ * dzds);
    cover.push(sample.ceilingY !== undefined);
  }
  // The highest point in the window is the crest; the face runs onshore from it to the trough ahead.
  let crest = 0;
  for (let i = 1; i < pts.length; i += 1) if (pts[i].y > pts[crest].y) crest = i;
  let trough = crest;
  for (let i = crest + 1; i < pts.length; i += 1) {
    if (pts[i].y < pts[trough].y) trough = i;
    else if (pts[i].y > pts[trough].y + 0.05) break;
  }
  if (trough - crest < 4) return undefined;
  // Trough first, up to the crest; the slope is the same number read the other way.
  const up: { d: number; y: number }[] = [];
  const upSlope: number[] = [];
  const upU: number[] = [];
  const upCover: boolean[] = [];
  for (let i = trough; i >= crest; i -= 1) {
    up.push({ d: pts[trough].d - pts[i].d, y: pts[i].y });
    upSlope.push(slopes[i]); upU.push(us[i]); upCover.push(cover[i]);
  }
  return faceOf(up, upSlope, { u: upU, covered: upCover });
}

const buildPool = (withLibrary: boolean): SurfZoneSimulation => {
  (globalThis as unknown as { location: { search: string } }).location = {
    search: option('search') ?? '?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long',
  };
  const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
  const config = { ...surfZoneConfigFor(settings as never, 1, false, { stage: 2, compute: 'cpu' }), ...(withLibrary ? { wave: 'library' } : {}) } as SurfZoneConfig;
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
};

const out: Record<string, unknown> = {};

// ---------------------------------------------------------------- R and D. The 2 m pool, switch on and off.
if (part('R') || part('D')) {
  const withLibrary = true;
  const sim = buildPool(withLibrary);
  const zone = sim.waveZone;
  if (withLibrary && !(zone && library)) throw new Error('no library zone: the probe needs ?poolSize=ref and the cases');
  const lanes = zone?.lanes;
  const contact = zone ? SweptContact.forLoft(() => zone.loft.result) : undefined;
  const waters = SPACINGS.map((sp) => ({ spacing: sp, water: PhysicalSurfWater.forSimulation(sim, contact, sp) }));
  /**
   * Part D: the **sea's own** surface on the same sim, at the same window and the same instant — the 2 m pool Barrel as
   * it ships, since the library writes no solver field (step 5b's part S measured that: identical hashes). This is a
   * paired reading, not a second run, so the two columns differ by the switch and nothing else.
   */
  const seaWater = part('D') ? new PhysicalSurfWater(sim.solver, { peakPeriod: sim.config.peakPeriod, nodeSpacing: 1 }) : undefined;
  const seaBucket = bucket();
  const sample = createWaterSample();
  const taus = new Float64Array(BLEND_CAP);
  const h0s: number[] = [];
  let dumped = 0;
  const whole = new Map<number, Bucket>();
  const byTau = new Map<string, Bucket>();
  for (const w of waters) whole.set(w.spacing, bucket());
  let frames = 0;
  let next = FROM;
  for (let t = FROM; t <= UNTIL; t += STEP) {
    while (sim.solver.time < t - 1e-9) sim.step(STEP);
    if (t < next) continue;
    next += 0.1;
    frames += 1;
    if (withLibrary && zone && lanes && library) {
      // Each live slice, along its own lane's ray, through the shape's whole life.
      for (const slice of zone.field.slices()) {
        if (sim.solver.time < slice.blendFrom || sim.solver.time > slice.goneAt) continue;
        const k = slice.lane;
        const bx = lanes.baseX[k]; const bz = lanes.baseZ[k];
        const rx = lanes.rayX[k]; const rz = lanes.rayZ[k];
        // The window. `FieldSlice.s` is the crest's place at the hand-over, five seconds and tens of metres back, so it
        // is not the window: the crest **now** is the highest station the library's own weight reaches along this lane
        // this step (`ZoneSurface.laneAt`), and the face runs onshore from it (s increasing along the ray).
        const span = (lanes.stations - 1) * LANE.step;
        let want = Number.NaN;
        let top = -Infinity;
        for (let st = 0; st <= span; st += LANE.step) {
          const at = zone.surface.laneAt(k, st);
          if (!(at.weight > 0.1)) continue;
          const y = at.height / at.weight;
          if (y > top) { top = y; want = st; }
        }
        if (!(want === want)) continue;
        const from = Math.max(0, want - 3);
        const to = Math.min(span, want + 15);
        // The slice's own τ: its cases' clocks at this time, weighted as the surface weights them.
        h0s.push(slice.slice.h0);
        library.tausAt(slice.slice, sim.solver.time, taus);
        let tau = 0;
        for (let c = 0; c < slice.slice.n; c += 1) tau += slice.slice.weight[c] * taus[c];
        if (DUMP && dumped < 6 && tau > -1.6 && tau < -0.2) {
          dumped += 1;
          console.log(`  dump: lane ${k} τ ${f(tau, 2)} share ${f(zone.surface.laneAt(k, want).weight, 2)} crest at s ${f(want, 2)} of ${f(span, 0)} m, h0 ${f(slice.slice.h0, 2)} m`);
          let row = '';
          let lib = '';
          for (let st = from; st <= to; st += 0.5) {
            waters[0].water.sampleAt(bx + st * rx, 50, bz + st * rz, sample);
            row += ` ${f(st - want, 1)}:${f(sample.surfaceY, 2)}`;
            const at = zone.surface.laneAt(k, st);
            lib += ` ${f(st - want, 1)}:${f(at.weight, 2)}/${f(at.weight > 0.01 ? at.height / at.weight : Number.NaN, 2)}`;
          }
          console.log(`    felt surface along the ray (s − crest : m over still water):${row}`);
          console.log(`    the library's own weight / height along it:${lib}`);
        }
        if (seaWater) {
          const seaFace = feltFace(seaWater, sample, (s) => bx + s * rx, (s) => bz + s * rz, from, to);
          if (seaFace) add(seaBucket, seaFace);
        }
        for (const w of waters) {
          const face = feltFace(w.water, sample, (s) => bx + s * rx, (s) => bz + s * rz, from, to);
          if (!face) continue;
          add(whole.get(w.spacing) as Bucket, face);
          if (w.spacing === 1) {
            const key = tau < -2.5 ? '≤ −2.5' : tau < -1.5 ? '−2.5 … −1.5' : tau < -0.75 ? '−1.5 … −0.75' : tau < -0.25 ? '−0.75 … −0.25' : tau < 0.25 ? '−0.25 … +0.25' : '> +0.25';
            if (!byTau.has(key)) byTau.set(key, bucket());
            add(byTau.get(key) as Bucket, face);
          }
        }
      }
    }
  }
  console.log(`\n## R. The rider's surface under ?wave=library, and D. the same water with the switch off (${f(FROM, 0)}–${f(UNTIL, 0)} s, ${frames} frames, ds ${DS} m; LIFT on/bridge/gentle ${LIFT.on}/${LIFT.bridge}/${LIFT.gentle}°)`);
  if (h0s.length) console.log(`  the slices' own scale h0: ${band(h0s, 2)} m`);
  for (const key of ['≤ −2.5', '−2.5 … −1.5', '−1.5 … −0.75', '−0.75 … −0.25', '−0.25 … +0.25', '> +0.25']) {
    const b = byTau.get(key);
    if (b) report(`τ ${key}, node spacing 1 m`, b);
  }
  for (const w of waters) report(`R, every slice and frame, node spacing ${w.spacing} m`, whole.get(w.spacing) as Bucket);
  if (seaWater) report('D, the sea\'s own surface at the same windows and instants (the switch off)', seaBucket);
  out.R = Object.fromEntries([...whole].map(([k, b]) => [k, { local: b.local, chord2: b.chord2, chord1: b.chord1, turn: b.turn, upper80: b.upper80 }]));
  out.D = { local: seaBucket.local, chord2: seaBucket.chord2, chord1: seaBucket.chord1, turn: seaBucket.turn, upper80: seaBucket.upper80 };
}

// ---------------------------------------------------------------- C. Canyon B.
if (part('C')) {
  (globalThis as unknown as { location: { search: string } }).location = { search: '?canyonWaves=true' };
  const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday', waves: 'practice' } as never, { stage: 2, compute: 'cpu' });
  const config = surfZoneConfigFor(settings as never, 1, false, { stage: 2, compute: 'cpu' }) as SurfZoneConfig;
  const sim = new SurfZoneSimulation(config, 'spun-up', libraryFromBytes(readBarrelCases(config.spot, undefined, config.poolTubeCase), config.tubeShape, config.spot, config.heldRule));
  const waters = SPACINGS.map((sp) => ({ spacing: sp, water: PhysicalSurfWater.forSimulation(sim, undefined, sp) }));
  const sample = createWaterSample();
  const whole = new Map<number, Bucket>();
  for (const w of waters) whole.set(w.spacing, bucket());
  // The arm's columns, where the owner rides (the calibration's x −122 … −32).
  const COLUMNS = (option('columns') ?? '-112,-102,-92,-82,-72,-62').split(',').map(Number);
  let frames = 0;
  let next = FROM;
  for (let t = FROM; t <= UNTIL; t += STEP) {
    while (sim.solver.time < t - 1e-9) sim.step(STEP);
    if (t < next) continue;
    next += 0.1;
    frames += 1;
    for (const x of COLUMNS) {
      for (const w of waters) {
        const face = feltFace(w.water, sample, () => x, (s) => -200 + s, 0, 90);
        if (face) add(whole.get(w.spacing) as Bucket, face);
      }
    }
  }
  console.log(`\n## C. Canyon B, the arm (?canyonWaves=true; ${f(FROM, 0)}–${f(UNTIL, 0)} s, ${frames} frames, columns ${COLUMNS.join(' ')})`);
  for (const w of waters) report(`every frame and column, node spacing ${w.spacing} m`, whole.get(w.spacing) as Bucket);
  out.C = Object.fromEntries([...whole].map(([k, b]) => [k, { local: b.local, chord2: b.chord2, chord1: b.chord1, turn: b.turn, upper80: b.upper80 }]));
}

if (OUT) writeFileSync(OUT, `${JSON.stringify(out)}\n`);
