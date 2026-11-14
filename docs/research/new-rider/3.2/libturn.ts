/**
 * Step 3.2t, job 1: **the owner's acceptance test on the face `?wave=library` actually presents.**
 *
 * Every load-factor number the surfer track has (3.2r's n = 1.05–1.09, Part 17's vertical ledger, the 12-of-12 /
 * 1-of-12 gate) was measured on `FaceWater` matched to the **Canyon arm**: 1.4 m, 16°, 5.7 m/s. C2 step 5e
 * (`docs/research/wave-strategy-alternatives/c2-step5e.md`) then measured the water a board reads under
 * `?wave=library` and found **35.9° (26.2–44.6) over the 0.75 s before the lip goes vertical and 47.3° (36.7–53.6)
 * over the 0.5 s after** — and that the 16° row is the wave the library replaced. So nobody has put a rider on the
 * face the game has. This probe does.
 *
 * It runs the owner's own movement — in trim, Compress held, the stick over until the board is `ACROSS`° off the fall
 * line, then centred and held — on **the live library sea**, the same sim `c2-step5e-face.ts` part R read, from the
 * same spun-up cache, with the sim stepped under the rider frame by frame. The fall line is the slice's own lane ray;
 * the wave's pace is that lane's measured crest speed along it.
 *
 * Parts:
 * - **S, scout.** Every live slice every 0.1 s: its τ, its crest's station along its lane, the face's four reductions
 *   (step 5e's `faceOf`), and the crest's speed along the ray. Picks the start instants for part T and prints them.
 * - **T, the test.** The acceptance test from a chosen instant and lane, 12 runs per rider (2 stances × 3 entry
 *   speeds × 2 stick positions), each from the same imported sim state so the twelve see the same water. Reports
 *   n (nUp / nPerp / nTotal / liftShare / φ_F), the turn rate, the gate, and **the face under the board every frame**,
 *   so the round can say how much of each turn was even on steep water.
 *
 * Run from the repository's root (the probes' usual shape: `--parts`, env for the rider and its switches):
 *   npx rolldown docs/research/new-rider/3.2/libturn.ts -o <scratch>/lt.mjs --format esm --platform node
 *
 *   # job 0, the lean hold's ring, and the Canyon-matched yardstick: old rider against new, Compress and tall apart
 *   RIDER=old STANCES=compress OUT=<scratch>/j0-old.jsonl   node <scratch>/lt.mjs --parts F --face 1.4,16,5.7
 *   RIDER=new STANCES=compress OUT=<scratch>/j0-new.jsonl   node <scratch>/lt.mjs --parts F --face 1.4,16,5.7
 *
 *   # job 1, the compressed turn's pull against the honest leg pair (the old rider, which is the one that has a pull)
 *   RIDER=old STANCES=compress                 node <scratch>/lt.mjs --parts F --face 1.4,16,5.7   # COMPRESS_PULL
 *   RIDER=old STANCES=compress LEG_DRIVE=turn  node <scratch>/lt.mjs --parts F --face 1.4,16,5.7   # the pair
 *
 *   # the library face: the scout, then the test at a chosen tau and placement (reuses step 5e's spun-up cache)
 *   node <scratch>/lt.mjs --parts S --cache <scratch>/sea5e.bin --from 40 --until 44
 *   RIDER=old node <scratch>/lt.mjs --parts T --cache <scratch>/sea5e.bin --at 42.5 --tau -1 --ahead 0.75
 *
 * `--parts S` costs about 24 s of CPU a simulated second (the face reads, not the solver); `--parts T` about 12 s a
 * run, plus a minute to step the cache to `--at`. Env: RIDER=new|old, STANCES, EXTRAS, STEERS, HOLD, TURN_LIMIT,
 * ACROSS, BALANCE, SUBSTEPS, LEG_POWER, LEG_DRIVE=on|turn, OUT (one JSON line a run; `--out` does the same).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { buildBoardShape } from '../../../../src/physics/BoardShape';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { libraryFromBytes } from '../../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { SweptContact } from '../../../../src/wave/barrel/sweptContact';
import { decodeWaveCase } from '../../../../src/wave/library/caseFormat';
import { LANE } from '../../../../src/wave/library/Handover';
import { MAX_BLEND as BLEND_CAP, WaveLibrary } from '../../../../src/wave/library/WaveLibrary';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../../src/wave/surfZoneState';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const CASES = option('cases') ?? 'public/library';
const CACHE = option('cache');
const FROM = Number(option('from') ?? 40);
const UNTIL = Number(option('until') ?? 70);
const PARTS = option('parts') ?? 'S';
const DS = Number(option('ds') ?? 0.05);
const OUT = option('out');
/** Part T: the instant to start the runs at (s of the sim's own clock) and the lane to ride. */
const AT = Number(option('at') ?? 50);
const LANE_AT = Number(option('lane') ?? -1);
/** Part T: which way across the face (°, from the lane ray toward +x·ray-left); the owner's test is −45. */
const SIDE = Number(option('side') ?? -45);
/**
 * Where on the face the board starts, as a share of the face's own run **onshore of the crest**: the owner's test is
 * **0.75**, which is low on the face near the trough — the place a bottom turn starts from. 0.5 is the face's steepest
 * point on a `FaceWater` by construction, and on the library's own profile it is where step 5e's 30–47° lives. The
 * lever exists because the first live run showed the board reading 2–3° of slope under a 31° face: on this movement the
 * placement, not the wave, decides what water the board is on.
 */
const AHEAD = Number(option('ahead') ?? 0.75);
const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const G = 9.81;

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'compress,tall').split(',') as Stance[];
const ACROSS = Number(process.env.ACROSS ?? 85);
const HOLD = Number(process.env.HOLD ?? 5);
const TURN_LIMIT = Number(process.env.TURN_LIMIT ?? 4);
type Stance = 'tall' | 'crouch' | 'compress';

const part = (letter: string) => PARTS.includes(letter);
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 2) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const peak = (v: number[]) => (sorted(v).length ? Math.max(...sorted(v)) : Number.NaN);
/**
 * How many times a series turns around: the sign changes of its own difference, ignoring steps under `dead` so the
 * solver's last digit is not counted as a wobble. Divided by the window it is read over, this is the **ring** — the
 * quantity 3.2q said would be the cost of the lean hold if the owner found Compress worse.
 */
function turns(v: number[], dead = 0.05): number {
  let count = 0;
  let sign = 0;
  for (let i = 1; i < v.length; i += 1) {
    const d = v[i] - v[i - 1];
    if (!Number.isFinite(d) || Math.abs(d) < dead) continue;
    const s = Math.sign(d);
    if (sign !== 0 && s !== sign) count += 1;
    sign = s;
  }
  return count;
}

// ---------------------------------------------------------------- the sea, exactly as step 5e built it.
const library = new WaveLibrary(readdirSync(CASES).filter((n) => n.endsWith('.bin')).sort().map((n) => decodeWaveCase(new Uint8Array(readFileSync(`${CASES}/${n}`)))));

function buildPool(): SurfZoneSimulation {
  (globalThis as unknown as { location: { search: string } }).location = {
    search: option('search') ?? '?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long',
  };
  const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
  const config = { ...surfZoneConfigFor(settings as never, 1, false, { stage: 2, compute: 'cpu' }), wave: 'library' } as SurfZoneConfig;
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

/**
 * The four reductions of one face, **the same arithmetic as C2 step 5e's `faceOf`** (`c2-step5e-face.ts`), copied
 * rather than imported because that module runs its own measurement at import time (it calls `process.exit(0)` when
 * its parts are not asked for). The copy is checked against step 5e's published τ rows by part S, which reads the same
 * sea at the same windows: if these numbers do not reproduce 35.9°/47.3°, the copy is wrong and the round says so.
 * `pts` runs **from the trough up to the crest**, d increasing; `localSlope` is the slope the surface itself reports.
 */
interface Face { H: number; run: number; local: number; chord2: number; turn: number; uCrest: number; uTrough: number }
function faceOf(pts: { d: number; y: number }[], localSlope: number[], u: number[]): Face | undefined {
  const n = pts.length;
  if (n < 4) return undefined;
  const H = pts[n - 1].y - pts[0].y;
  const run = pts[n - 1].d - pts[0].d;
  if (!(H > 0.1) || !(run > 0.2)) return undefined;
  let local = 0;
  for (let i = 0; i < n; i += 1) if (localSlope[i] > local) local = localSlope[i];
  let chord2 = 0;
  for (let i = 0; i < n; i += 1) {
    let j = i;
    while (j + 1 < n && pts[j + 1].d - pts[i].d <= 2) j += 1;
    const dd = pts[j].d - pts[i].d;
    if (!(dd > 0.5)) continue;
    const a = Math.atan((pts[j].y - pts[i].y) / dd) * DEG;
    if (a > chord2) chord2 = a;
  }
  return { H, run, local, chord2, turn: local - localSlope[0], uCrest: u[n - 1], uTrough: u[0] };
}

/** The face along a lane's ray through the felt water, from the crest nearest `want` down to the trough ahead. */
function faceAlong(water: PhysicalSurfWater, sample: WaterSample, bx: number, bz: number, rx: number, rz: number, from: number, to: number): Face | undefined {
  const pts: { d: number; y: number }[] = [];
  const slopes: number[] = [];
  const us: number[] = [];
  const cover: boolean[] = [];
  for (let s = from; s <= to + 1e-9; s += DS) {
    water.sampleAt(bx + s * rx, 50, bz + s * rz, sample);
    const y = sample.surfaceY;
    if (!(y === y)) return undefined;
    const along = sample.slopeX * rx + sample.slopeZ * rz;
    pts.push({ d: s - from, y });
    slopes.push(Math.atan(-along) * DEG);
    us.push(sample.flowX * rx + sample.flowZ * rz);
    cover.push(sample.ceilingY !== undefined);
  }
  let crest = 0;
  for (let i = 1; i < pts.length; i += 1) if (pts[i].y > pts[crest].y) crest = i;
  let trough = crest;
  for (let i = crest + 1; i < pts.length; i += 1) {
    if (pts[i].y < pts[trough].y) trough = i;
    else if (pts[i].y > pts[trough].y + 0.05) break;
  }
  if (trough - crest < 4) return undefined;
  const up: { d: number; y: number }[] = [];
  const upSlope: number[] = [];
  const upU: number[] = [];
  const upCover: boolean[] = [];
  for (let i = trough; i >= crest; i -= 1) {
    up.push({ d: pts[trough].d - pts[i].d, y: pts[i].y });
    upSlope.push(slopes[i]); upU.push(us[i]); upCover.push(cover[i]);
  }
  void upCover;
  return faceOf(up, upSlope, upU);
}

interface Zone {
  lanes: { baseX: Float64Array; baseZ: Float64Array; rayX: Float64Array; rayZ: Float64Array; stations: number };
  field: { slices: () => Iterable<{ lane: number; blendFrom: number; goneAt: number; slice: { h0: number; n: number; weight: Float64Array } }> };
  surface: { laneAt: (k: number, s: number) => { height: number; weight: number } };
  loft: { result: unknown };
}

/** The crest's station along lane k now: the highest station the library's own weight reaches (step 5e's window). */
function crestStation(zone: Zone, k: number): number {
  const span = (zone.lanes.stations - 1) * LANE.step;
  let want = Number.NaN;
  let top = -Infinity;
  for (let st = 0; st <= span; st += LANE.step) {
    const at = zone.surface.laneAt(k, st);
    if (!(at.weight > 0.1)) continue;
    const y = at.height / at.weight;
    if (y > top) { top = y; want = st; }
  }
  return want;
}

// ---------------------------------------------------------------- S. the scout.
if (part('S')) {
  const sim = buildPool();
  const zone = sim.waveZone as unknown as Zone;
  const contact = SweptContact.forLoft(() => (sim.waveZone as unknown as Zone).loft.result as never);
  const water = PhysicalSurfWater.forSimulation(sim, contact, 1);
  const sample = createWaterSample();
  const taus = new Float64Array(BLEND_CAP);
  const rows: { t: number; lane: number; tau: number; want: number; face: Face; pace: number }[] = [];
  const lastWant = new Map<number, { t: number; s: number }>();
  const t0 = Date.now();
  let frames = 0;
  let next = FROM;
  for (let t = FROM; t <= UNTIL; t += STEP) {
    while (sim.solver.time < t - 1e-9) sim.step(STEP);
    if (t < next) continue;
    next += 0.1;
    frames += 1;
    for (const slice of zone.field.slices()) {
      if (sim.solver.time < slice.blendFrom || sim.solver.time > slice.goneAt) continue;
      const k = slice.lane;
      const want = crestStation(zone, k);
      if (!(want === want)) continue;
      const prev = lastWant.get(k);
      const pace = prev && t > prev.t ? (want - prev.s) / (t - prev.t) : Number.NaN;
      lastWant.set(k, { t, s: want });
      const face = faceAlong(water, sample, zone.lanes.baseX[k], zone.lanes.baseZ[k], zone.lanes.rayX[k], zone.lanes.rayZ[k], Math.max(0, want - 3), Math.min((zone.lanes.stations - 1) * LANE.step, want + 15));
      if (!face) continue;
      library.tausAt(slice.slice as never, sim.solver.time, taus);
      let tau = 0;
      for (let c = 0; c < slice.slice.n; c += 1) tau += slice.slice.weight[c] * taus[c];
      rows.push({ t: sim.solver.time, lane: k, tau, want, face, pace });
    }
  }
  const secs = (Date.now() - t0) / 1000;
  console.log(`\n## S. scout ${f(FROM, 0)}–${f(UNTIL, 0)} s, ${frames} frames, ${rows.length} slice readings, ${f(secs, 0)} s wall (${f(secs / Math.max(1e-9, UNTIL - FROM), 1)} s CPU per sim second)`);
  const steep = rows.filter((x) => x.face.turn >= 30);
  console.log(`  faces whose turn reaches 30°: ${steep.length} of ${rows.length} (${f((100 * steep.length) / Math.max(1, rows.length))} %)`);
  console.log(`  turn ${f(median(rows.map((x) => x.face.turn)))}° median, ${f(peak(rows.map((x) => x.face.turn)))}° most · H ${f(median(rows.map((x) => x.face.H)), 2)} m · run ${f(median(rows.map((x) => x.face.run)))} m`);
  console.log(`  the crest's pace along its lane, m/s: ${f(median(rows.map((x) => x.pace)), 2)} median (${f(qt(rows.map((x) => x.pace), 0.05), 2)}–${f(qt(rows.map((x) => x.pace), 0.95), 2)})`);
  // The candidate start instants: a steep face with a long enough run, and its lane's neighbours also live.
  const best = [...steep].sort((a, b) => b.face.turn - a.face.turn).slice(0, 25);
  console.log('  the steepest readings (t, lane, τ, crest station, H, run, turn, chord2, local, pace):');
  for (const x of best) {
    console.log(`    t ${f(x.t, 2)} lane ${x.lane} τ ${f(x.tau, 2)} s ${f(x.want, 1)} m · H ${f(x.face.H, 2)} m run ${f(x.face.run, 1)} m · turn ${f(x.face.turn)}° chord2 ${f(x.face.chord2)}° local ${f(x.face.local)}° · pace ${f(x.pace, 2)} m/s · u crest ${f(x.face.uCrest, 2)} trough ${f(x.face.uTrough, 2)}`);
  }
  // By τ, so the window's own width shows.
  for (const [lo, hi] of [[-3, -1.5], [-1.5, -0.75], [-0.75, -0.25], [-0.25, 0.25], [0.25, 3]] as const) {
    const b = rows.filter((x) => x.tau >= lo && x.tau < hi);
    if (b.length) console.log(`  τ ${lo} … ${hi}: n ${b.length} · turn ${f(median(b.map((x) => x.face.turn)))}° (most ${f(peak(b.map((x) => x.face.turn)))}°) · run ${f(median(b.map((x) => x.face.run)))} m · pace ${f(median(b.map((x) => x.pace)), 2)} m/s`);
  }
  if (OUT) writeFileSync(OUT, `${JSON.stringify(rows.map((x) => ({ t: r(x.t, 3), lane: x.lane, tau: r(x.tau, 3), want: r(x.want, 2), pace: r(x.pace, 3), H: r(x.face.H, 3), run: r(x.face.run, 2), turn: r(x.face.turn, 2), chord2: r(x.face.chord2, 2), local: r(x.face.local, 2), uCrest: r(x.face.uCrest, 2), uTrough: r(x.face.uTrough, 2) })))}\n`);
}

// ---------------------------------------------------------------- the acceptance test, on whatever water it is given.
/** A wrapper so the rider's water is the sim's own, and `advance` steps the sim under it. */
class LiveWater implements SurfWater {
  constructor(readonly sim: SurfZoneSimulation, readonly inner: PhysicalSurfWater) {}
  advance(dt: number): void { this.sim.step(dt); }
  setSampleTime(offset: number): void { this.inner.setSampleTime(offset); }
  surfaceAt(x: number, z: number): number { return this.inner.surfaceAt(x, z); }
  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample { return this.inner.sampleAt(x, y, z, out); }
  addReaction(x: number, z: number, ix: number, iy: number, iz: number): void { this.inner.addReaction(x, z, ix, iy, iz); }
}

const WATER = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth'] as const;
const HULL = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'froth'] as const;

function stance(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown): void {
  const out = OUT ?? process.env.OUT;
  if (out) appendFileSync(out, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/**
 * One place on one wave to run the movement from: the water, the fall line, the wave's own pace along it, where the
 * board starts, and how to put the water back for the next run. The live sea and the analytic `FaceWater` both present
 * this, so the twelve runs are the **same movement** on both and the columns are comparable frame for frame.
 */
interface Spot {
  label: string;
  water: SurfWater;
  /** The fall line: level, unit, pointing the way the wave runs (onshore). */
  fall: Vector3;
  /** The wave's own pace along the fall line, m/s. */
  pace: number;
  /** The face at the start instant, as step 5e reduces it. */
  face: Face | undefined;
  /** Where the board is placed (world x, z), 0.75 face lengths onshore of the crest. */
  place: () => { x: number; z: number };
  /** Puts the water back to the start instant before each run. */
  reset: () => void;
}

/**
 * The owner's own movement, once (2026-11-13, through the coordinator): *a compressed turn to take the wave on the
 * side must never fall.* In trim across the face, Compress held, the stick over to `steer` until the board is `ACROSS`°
 * off the fall line, then centred and held for `HOLD` s. A run passes if the rider is still up at the end.
 *
 * Everything reported is the same column `load.probe.ts` reports on the Canyon-matched face, plus **the slope of the
 * water actually under the board every frame**, which is the one thing this round exists to measure.
 */
function oneRun(spot: Spot, st: Stance, extra: number, steer: number): Record<string, unknown> {
  spot.reset();
  const sample = createWaterSample();
  const { x: px, z: pz } = spot.place();
  const rx = spot.fall.x; const rz = spot.fall.z;
  const here = spot.water.sampleAt(px, 50, pz, sample);
  const alongFlow = here.flowX * rx + here.flowZ * rz;
  const entry = (spot.pace - alongFlow) / Math.cos(45 / DEG) + extra;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const h = (Math.atan2(rx, rz) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(h), 0, Math.cos(h));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  // HULL=rail (step 3.2u): the board gets its rail band and the buried rail's suction; RAIL_SUCTION=off keeps the
  // section and drops the grip, which is the cell that tells the geometry's own effect from the grip's.
  // ACROSS_N (step 3.2u): the patches across a station, which `buildBoardShape` has always taken — the **flat** board
  // at 12 across is the control that tells resolution from shape, because `WET_RAMP` is keyed on each patch's centre
  // and with 4 across the outermost centre sits 58 mm inboard of the rail (Part 17 §3 item 3).
  const across = Number(process.env.ACROSS_N ?? 4);
  const board = new BoardBody({
    ...(process.env.HULL === 'rail' ? { hull: 'rail' as const } : {}),
    ...(process.env.RAIL_SUCTION === 'off' ? { railSuction: 'off' as const } : {}),
    ...(across === 4 ? {} : { shape: buildBoardShape(undefined, 12, across, process.env.HULL === 'rail' ? 'rail' : 'flat') }),
  });
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(process.env.LEG_POWER === 'cap' ? { legPower: 'cap' as const } : {}),
    // LEG_DRIVE=on|turn (step 3.2t): the rail change's leg pair, and with `turn` the compressed turn's lead-in too,
    // in COMPRESS_PULL's place. `turn` is the thing this round is measuring against the old rider's own pull.
    ...(process.env.LEG_DRIVE === 'on' || process.env.LEG_DRIVE === 'turn' ? { legDrive: process.env.LEG_DRIVE as 'on' | 'turn' } : {}),
    // PULL=off (step 3.2u): COMPRESS_PULL deleted with nothing in its place — the ablation the hull's grip is scored against.
    ...(process.env.PULL === 'off' ? { compressPull: 'off' as const } : {}),
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(process.env.SUBSTEPS ? { standingSubsteps: Number(process.env.SUBSTEPS) } : {}),
    ...(process.env.BALANCE ? { balance: JSON.parse(process.env.BALANCE) } : {}),
  });
  board.attach(rider);
  stance(rider, st);
  const weight = (board.mass + rider.mass) * G;
  const fwd = new Vector3();
  const up = new Vector3();
  const total = new Vector3();
  const hull = new Vector3();
  const vRel = new Vector3();
  const perp = new Vector3();
  const leftB = new Vector3();
  const nW = new Vector3();
  const fromFall = () => {
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    return Math.acos(Math.max(-1, Math.min(1, fwd.dot(spot.fall)))) * DEG;
  };
  const pathAzimuth = () => {
    const s = spot.water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    const vx = board.velocity.x - s.flowX;
    const vz = board.velocity.z - s.flowZ;
    return Math.hypot(vx, vz) > 0.05 ? Math.atan2(vx, vz) * DEG : Number.NaN;
  };
  let phase = 'turn';
  let fell = '';
  let fellAt = Number.NaN;
  let acrossAt = Number.NaN;
  let maxFromFall = fromFall();
  let lastPath = pathAzimuth();
  const nUp: number[] = []; const nPerp: number[] = []; const nHull: number[] = []; const nTotals: number[] = [];
  const lifts: number[] = []; const phiFs: number[] = []; const ceil: number[] = [];
  const banks: number[] = []; const rails: number[] = []; const speeds: number[] = [];
  const pathRates: number[] = []; const lawRates: number[] = []; const incid: number[] = []; const areas: number[] = [];
  /** The water under the board, every frame: its own slope (the face it presents here), its froth, its void. */
  const slopeUnder: number[] = []; const breaking: number[] = []; const voids: number[] = [];
  /**
   * Step 3.2u, the rail band every frame of the turn. `drift` is the angle between the board's path through the water
   * and its own nose, **unsigned, in the horizontal plane** — the sideways slip, which is the whole of the suction's
   * driving term (see `railbench.ts`: with the flow along the rail no facet is leeward and the band makes nothing).
   * `maxNormalX` is 0 on the flat board by construction, so it is the build check. The lateral load factor is the
   * system's own horizontal acceleration **toward the buried rail**, in g — the column `COMPRESS_PULL` moves.
   */
  const drift: number[] = []; const suctionN: number[] = []; const suctionDownN: number[] = []; const suctionInN: number[] = [];
  const bandShare: number[] = []; const maxNx: number[] = []; const vented: number[] = []; const capped: number[] = [];
  const lateralG: number[] = []; const bandFacets: number[] = [];
  /**
   * Where on the face the board is: the water's surface height under it, m over still water. The face runs from the
   * trough (low) up to the crest (high), so a rise means the board has climbed it (or the crest has reached it — the
   * two cannot be told apart from this column alone, which is said in the write-up).
   */
  const yUnder: number[] = [];
  /**
   * Job 0 (the owner's ride of 2026-11-14: *"the compress is still to slow and barely turns now, if turn a bit falls
   * immediately"*). Step 3.2q's §9 named this risk in advance: *the cap closes a new loop (lean → rail → turn → felt
   * vertical → lean) through a 0.1 s low-pass*. So the columns that decide it are the **ring** — how often the lean the
   * body asks for turns around — and **how far round the board is at one second**, which is "barely turns" as a number.
   */
  const leanAsked: number[] = []; const leanHeld: number[] = []; const times: number[] = [];
  let fromFallAt1 = Number.NaN;
  /** Job 1: the work the legs' drive does on the body and the board's own share of the pair, J (`RiderWork.legDrive`). */
  let legWork = 0;
  let boardWork = 0;
  let speed0 = Number.NaN;
  let turnFrom = 0;
  const at: Record<string, number> = { '0.5': Number.NaN, '1': Number.NaN, '1.5': Number.NaN, '2': Number.NaN };
  rider.steer = steer;
  /** 3.2q's own two columns, read off the rider: the lean it asks for and the cap that holds it. */
  const asking = rider as unknown as { leanAsked?: number; leanHeld?: number };
  const advance = (spot.water as { advance?: (dt: number) => void }).advance?.bind(spot.water);
  for (let i = 0; i < Math.round((TURN_LIMIT + HOLD) / STEP); i += 1) {
    const t = (i + 1) * STEP;
    advance?.(STEP);
    board.step(STEP, spot.water);
    const ff = fromFall();
    maxFromFall = Math.max(maxFromFall, ff);
    if (!Number.isFinite(fromFallAt1) && t >= 1) fromFallAt1 = ff;
    const path = pathAzimuth();
    const wrap = (d: number) => ((d + 540) % 360) - 180;
    const pathRate = wrap(path - lastPath) / STEP;
    lastPath = path;
    total.set(0, 0, 0);
    for (const key of WATER) total.add((board.forces as unknown as Record<string, Vector3>)[key]);
    hull.set(0, 0, 0);
    for (const key of HULL) hull.add((board.forces as unknown as Record<string, Vector3>)[key]);
    up.set(0, 1, 0).applyQuaternion(board.orientation);
    const cen = spot.water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
    const sp = vRel.length();
    perp.copy(total);
    if (sp > 0.05) perp.addScaledVector(vRel, -total.dot(vRel) / (sp * sp));
    const nTotal = total.length() / weight;
    // φ_F is the tilt of the **water's resultant** from the world vertical (3.2r's advisor correction), and
    // `liftShare` = total.y / weight is 1 + a_com/g exactly, gravity being the only other external force.
    const phiF = nTotal > 1e-6 ? Math.acos(Math.max(-1, Math.min(1, total.y / total.length()))) : 0;
    leftB.set(1, 0, 0).applyQuaternion(board.orientation);
    nW.set(cen.normalX, cen.normalY, cen.normalZ);
    const roll = Math.asin(Math.max(-1, Math.min(1, leftB.dot(nW)))) * DEG;
    if (phase === 'turn') {
      if (!Number.isFinite(speed0)) { speed0 = sp; turnFrom = t; }
      for (const k of Object.keys(at)) if (!Number.isFinite(at[k]) && t - turnFrom >= Number(k)) at[k] = sp;
      nUp.push(total.dot(up) / weight);
      nPerp.push(perp.length() / weight);
      nHull.push(hull.dot(up) / weight);
      nTotals.push(nTotal);
      lifts.push(total.y / weight);
      phiFs.push(phiF * DEG);
      ceil.push(1 / Math.max(0.05, Math.cos(phiF)));
      banks.push(Math.abs(rider.bank.angle * DEG));
      rails.push(Math.abs(roll));
      speeds.push(sp);
      slopeUnder.push(Math.atan(Math.hypot(cen.slopeX, cen.slopeZ)) * DEG);
      yUnder.push(cen.surfaceY);
      leanAsked.push((asking.leanAsked ?? 0) * DEG);
      leanHeld.push(Number.isFinite(asking.leanHeld) ? (asking.leanHeld as number) * DEG : Number.NaN);
      times.push(t);
      breaking.push(cen.breaking ?? 0);
      voids.push(cen.voidFraction ?? 0);
      areas.push(board.wettedArea);
      if (sp > 0.05) incid.push(Math.abs(Math.asin(Math.max(-1, Math.min(1, -vRel.dot(up) / sp))) * DEG));
      // The sideways slip: the path's angle off the nose, in the horizontal plane.
      {
        const px2 = vRel.x;
        const pz2 = vRel.z;
        const flat = Math.hypot(px2, pz2);
        fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
        if (flat > 0.05) drift.push(Math.abs(Math.atan2(px2 * fwd.z - pz2 * fwd.x, (px2 * fwd.x + pz2 * fwd.z)) * DEG));
        const L = board.bandLedger;
        maxNx.push(L.maxNormalX);
        bandFacets.push(L.wetFacets);
        bandShare.push(board.wettedArea > 0 ? L.wetArea / board.wettedArea : 0);
        vented.push(L.ventedShare);
        capped.push(L.cappedShare);
        const q = board.forces.suction;
        suctionN.push(Math.hypot(q.x, q.y, q.z));
        suctionDownN.push(-q.y);
        // Toward the buried rail: the board's own −x·sign(roll) side, projected on the horizontal.
        const side = Math.sign(roll) || 1;
        leftB.set(-side, 0, 0).applyQuaternion(board.orientation).setY(0);
        if (leftB.lengthSq() > 1e-9) {
          leftB.normalize();
          suctionInN.push(q.x * leftB.x + q.z * leftB.z);
          lateralG.push((total.x * leftB.x + total.z * leftB.z) / weight);
        }
      }
      if (Number.isFinite(pathRate)) {
        pathRates.push(Math.abs(pathRate));
        lawRates.push(sp > 0.3 ? ((perp.length() / weight) * G * Math.sin(phiF)) / sp * DEG : Number.NaN);
      }
    }
    legWork = (rider.work as { legDrive: number }).legDrive;
    boardWork = (board.work as { rider: number }).rider;
    if (phase === 'turn' && (ff >= ACROSS || t >= TURN_LIMIT)) { phase = 'hold'; acrossAt = t; rider.steer = 0; }
    if (!rider.attached) { fell = String(rider.separation); fellAt = t; break; }
  }
  return {
    bar: 'libturn', spot: spot.label, rider: RIDER, legDrive: process.env.LEG_DRIVE ?? 'off', side: SIDE, stance: st, extra, steer,
    faceTurnDeg: r(spot.face?.turn ?? Number.NaN, 1), faceLocalDeg: r(spot.face?.local ?? Number.NaN, 1),
    faceH: r(spot.face?.H ?? Number.NaN, 2), faceRun: r(spot.face?.run ?? Number.NaN, 2),
    paceMs: r(spot.pace, 2), entryMs: r(entry, 2),
    reachedAcross: maxFromFall >= ACROSS, maxFromFallDeg: r(maxFromFall, 1),
    held: !fell, fell, fellAtS: r(fellAt, 2), acrossAtS: r(acrossAt, 2), frames: nUp.length,
    nUpMedian: r(median(nUp), 3), nUpPeak: r(peak(nUp), 3),
    nPerpMedian: r(median(nPerp), 3), nPerpPeak: r(peak(nPerp), 3),
    nMedian: r(median(nTotals), 3), nPeak: r(peak(nTotals), 3), nHullMedian: r(median(nHull), 3),
    phiFMedianDeg: r(median(phiFs), 1), phiFPeakDeg: r(peak(phiFs), 1),
    liftShareMedian: r(median(lifts), 3), liftSharePeak: r(peak(lifts), 3),
    ceilingMedian: r(median(ceil), 3), overCeilingMedian: r(median(nPerp.map((n, k) => n - ceil[k])), 3),
    bankMedianDeg: r(median(banks), 1), railMedianDeg: r(median(rails), 1), railPeakDeg: r(peak(rails), 1),
    pathRateMedian: r(median(pathRates), 2), pathRatePeak: r(peak(pathRates), 2), lawRateMedian: r(median(lawRates), 2),
    incidenceMedianDeg: r(median(incid), 1), wetAreaMedian: r(median(areas), 4),
    // Step 3.2u, the rail band and the lateral load factor.
    hull: process.env.HULL === 'rail' ? (process.env.RAIL_SUCTION === 'off' ? 'rail-nosuction' : 'rail') : 'flat',
    across,
    pull: process.env.PULL === 'off' ? 'off' : 'on',
    driftMedianDeg: r(median(drift), 1), driftPeakDeg: r(peak(drift), 1),
    maxNormalX: r(peak(maxNx), 3), bandFacetsMedian: r(median(bandFacets), 1), bandAreaShareMedian: r(median(bandShare), 4),
    suctionMedianN: r(median(suctionN), 1), suctionPeakN: r(peak(suctionN), 1),
    suctionDownMedianN: r(median(suctionDownN), 1), suctionInMedianN: r(median(suctionInN), 1),
    ventedMedian: r(median(vented), 3), ventedPeak: r(peak(vented), 3), cappedMedian: r(median(capped), 3),
    lateralGMedian: r(median(lateralG), 3), lateralGPeak: r(peak(lateralG), 3),
    speedStartMs: r(speed0, 3), speedMedianMs: r(median(speeds), 3), speedAt1: r(at['1'], 3), speedAt2: r(at['2'], 3),
    slopeUnderMedianDeg: r(median(slopeUnder), 1), slopeUnderPeakDeg: r(peak(slopeUnder), 1),
    shareOver30: r(slopeUnder.filter((v) => v >= 30).length / Math.max(1, slopeUnder.length), 3),
    shareOver20: r(slopeUnder.filter((v) => v >= 20).length / Math.max(1, slopeUnder.length), 3),
    breakingMedian: r(median(breaking), 3), voidPeak: r(peak(voids), 3),
    yUnderStart: r(yUnder[0] ?? Number.NaN, 3), yUnderMedian: r(median(yUnder), 3), yUnderPeak: r(peak(yUnder), 3),
    climbM: r((peak(yUnder) - (yUnder[0] ?? Number.NaN)), 3),
    // Job 1's seatbelt: the legs' own work through the turn, and the board's share of the pair. A leg drive that is
    // switched on and never fires would otherwise measure exactly like one that is off.
    legWorkJ: r(legWork, 1), boardWorkJ: r(boardWork, 1),
    // Job 0: the ring, and "barely turns" as a number.
    upS: r(fell ? fellAt : (TURN_LIMIT + HOLD), 2), fromFallAt1sDeg: r(fromFallAt1, 1),
    leanAskedPeakDeg: r(peak(leanAsked.map(Math.abs)), 1), leanHeldMedianDeg: r(median(leanHeld), 1),
    ringPerS: r(turns(leanAsked) / Math.max(1e-9, (times[times.length - 1] ?? 0) - (times[0] ?? 0)), 2),
    capRingPerS: r(turns(leanHeld) / Math.max(1e-9, (times[times.length - 1] ?? 0) - (times[0] ?? 0)), 2),
  };
}

function sweep(spot: Spot): void {
  const t0 = Date.now();
  const rows: Record<string, unknown>[] = [];
  for (const st of STANCES) for (const extra of EXTRAS) for (const steer of STEERS) {
    const row = oneRun(spot, st, extra, steer);
    rows.push(row);
    emit(row);
  }
  const num = (k: string) => rows.map((x) => Number(x[k])).filter(Number.isFinite);
  const gate = rows.filter((x) => x.reachedAcross).length;
  console.log(`  ${spot.label}: rider ${RIDER}, ${rows.length} runs, ${f((Date.now() - t0) / 1000, 0)} s wall`);
  console.log(`    the gate (reaches the wave on the side): ${gate} of ${rows.length} · still up at the end: ${rows.filter((x) => x.held).length} of ${rows.length}`);
  console.log(`    n: nUp ${f(median(num('nUpMedian')), 3)} median of medians (${f(qt(num('nUpMedian'), 0.05), 3)}–${f(qt(num('nUpMedian'), 0.95), 3)}) · nPerp ${f(median(num('nPerpMedian')), 3)} · n(total) ${f(median(num('nMedian')), 3)} · peak n ${f(peak(num('nPeak')), 3)}`);
  console.log(`    φ_F ${f(median(num('phiFMedianDeg')))}° · liftShare (1 + a_com/g) ${f(median(num('liftShareMedian')), 3)} · ceiling 1/cos φ_F ${f(median(num('ceilingMedian')), 3)}`);
  console.log(`    the turn: path rate ${f(median(num('pathRateMedian')))} °/s median, ${f(peak(num('pathRatePeak')))} °/s most · the law's rate from the measured n ${f(median(num('lawRateMedian')))} °/s · rail ${f(median(num('railMedianDeg')))}° median, ${f(peak(num('railPeakDeg')))}° most`);
  console.log(`    the band (step 3.2u): max |normal.x| ${f(peak(num('maxNormalX')))} · wetted facets ${f(median(num('bandFacetsMedian')))} · of the wetted hull ${f(100 * median(num('bandAreaShareMedian')))} % · drift ${f(median(num('driftMedianDeg')))}° median, ${f(peak(num('driftPeakDeg')))}° most`);
  console.log(`    the suction: ${f(median(num('suctionMedianN')))} N median, ${f(peak(num('suctionPeakN')))} N most · down ${f(median(num('suctionDownMedianN')))} N · toward the buried rail ${f(median(num('suctionInMedianN')))} N · at the cap ${f(100 * median(num('cappedMedian')))} % · ventilated ${f(100 * median(num('ventedMedian')))} % median, ${f(100 * peak(num('ventedPeak')))} % most`);
  console.log(`    the lateral load factor toward the buried rail: ${f(median(num('lateralGMedian')))} g median, ${f(peak(num('lateralGPeak')))} g most`);
  console.log(`    the water under the board: slope ${f(median(num('slopeUnderMedianDeg')))}° median, ${f(peak(num('slopeUnderPeakDeg')))}° most · frames over 30° ${f(100 * median(num('shareOver30')))} % · over 20° ${f(100 * median(num('shareOver20')))} %`);
  console.log(`    speed ${f(median(num('speedStartMs')), 2)} m/s at the start, ${f(median(num('speedMedianMs')), 2)} through the turn · froth ${f(median(num('breakingMedian')), 3)} · void most ${f(peak(num('voidPeak')), 3)}`);
  console.log(`    where on the face: placed ${f(AHEAD, 2)} of the run onshore of the crest; the water under the board ${f(median(num('yUnderStart')), 2)} m over still water at the start, ${f(median(num('yUnderPeak')), 2)} m at most (a climb of ${f(median(num('climbM')), 2)} m)`);
  console.log(`    job 0, the ring: the lean asked for turns around ${f(median(num('ringPerS')), 2)} times a second · it reaches ${f(median(num('leanAskedPeakDeg')))}° · round ${f(median(num('fromFallAt1sDeg')))}° off the fall line at 1 s · up for ${f(median(num('upS')), 2)} s (mean ${f(num('upS').reduce((a, b) => a + b, 0) / Math.max(1, num('upS').length), 2)})`);
  console.log(`    job 1, the legs: work done by the leg drive ${f(median(num('legWorkJ')), 1)} J median (0 means the pair never fired) · the board's share of it ${f(median(num('boardWorkJ')), 1)} J`);
}

// ---------------------------------------------------------------- F. the reference: an analytic FaceWater.
if (part('F')) {
  const [h, slope, speed] = (option('face') ?? '1.4,16,5.7').split(',').map(Number);
  const depth = Number(option('depth') ?? 2.6);
  console.log(`\n## F. the acceptance test on FaceWater ${f(h, 2)} m / ${f(slope, 0)}° / ${f(speed, 2)} m/s, depth ${f(depth, 1)} m, rider ${RIDER}`);
  let water = new FaceWater({ depth, height: h, slope, speed });
  const sample = createWaterSample();
  // The same reduction as the live face: the surface along +z from the trough up to the crest.
  const faceOfAnalytic = (w: FaceWater): Face | undefined => {
    const pts: { d: number; y: number }[] = []; const sl: number[] = []; const u: number[] = [];
    const z0 = w.crestZ();
    for (let d = 0; d <= w.front + 1e-9; d += DS) {
      const z = z0 + (w.front - d);
      const s = w.sampleAt(0, 50, z, sample);
      pts.push({ d, y: s.surfaceY }); sl.push(Math.atan(-s.slopeZ) * DEG); u.push(s.flowZ);
    }
    return faceOf(pts, sl, u);
  };
  const face = faceOfAnalytic(water);
  console.log(`  the face, reduced as step 5e does: H ${f(face?.H ?? Number.NaN, 2)} m · run ${f(face?.run ?? Number.NaN, 2)} m · turn ${f(face?.turn ?? Number.NaN)}° · local ${f(face?.local ?? Number.NaN)}°`);
  sweep({
    label: `FaceWater ${f(h, 2)}/${f(slope, 0)}`,
    get water() { return water; },
    fall: new Vector3(0, 0, 1),
    pace: speed,
    face,
    place: () => ({ x: 0, z: water.crestZ() + AHEAD * water.front }),
    reset: () => { water = new FaceWater({ depth, height: h, slope, speed }); },
  } as Spot);
}

// ---------------------------------------------------------------- T. the live library sea.
if (part('T')) {
  const sim = buildPool();
  const zone = sim.waveZone as unknown as Zone;
  const contact = SweptContact.forLoft(() => (sim.waveZone as unknown as Zone).loft.result as never);
  const live = new LiveWater(sim, PhysicalSurfWater.forSimulation(sim, contact, 1));
  const sample = createWaterSample();
  const t0 = Date.now();
  while (sim.solver.time < AT - 1e-9) sim.step(STEP);
  const exported = sim.exportState();
  delete (exported as { library?: unknown }).library;
  const frozen = encodeSurfZoneState(exported);
  const restore = () => { const s = decodeSurfZoneState(frozen); delete (s as { library?: unknown }).library; sim.importState(s); };
  console.log(`\n## T. the acceptance test on ?wave=library at t ${f(sim.solver.time, 2)} s (${f((Date.now() - t0) / 1000, 0)} s to reach it), rider ${RIDER}`);
  const span = (zone.lanes.stations - 1) * LANE.step;
  const faceAt = (k: number): Face | undefined => {
    const want = crestStation(zone, k);
    if (!(want === want)) return undefined;
    return faceAlong(live.inner, sample, zone.lanes.baseX[k], zone.lanes.baseZ[k], zone.lanes.rayX[k], zone.lanes.rayZ[k], Math.max(0, want - 3), Math.min(span, want + 15));
  };
  /**
   * The lane: the one asked for, else the live slice whose **τ** is closest to `--tau` — because the steep band is a
   * window in the slice's own clock (step 5e: 35.9° over the 0.75 s before verticality, 47.3° over the 0.5 s after),
   * so a turn that is to happen *in* it must start a little before it. With `--tau none` the steepest face is taken.
   */
  const tauWant = option('tau') ?? '-1';
  let lane = LANE_AT;
  let laneTau = Number.NaN;
  const taus = new Float64Array(BLEND_CAP);
  const tauOf = (slice: { slice: { n: number; weight: Float64Array } }): number => {
    library.tausAt(slice.slice as never, sim.solver.time, taus);
    let tau = 0;
    for (let c = 0; c < slice.slice.n; c += 1) tau += slice.slice.weight[c] * taus[c];
    return tau;
  };
  {
    let best = -Infinity;
    for (const slice of zone.field.slices()) {
      if (sim.solver.time < slice.blendFrom || sim.solver.time > slice.goneAt) continue;
      const face = faceAt(slice.lane);
      if (!face) continue;
      const tau = tauOf(slice);
      if (slice.lane === LANE_AT) { laneTau = tau; continue; }
      if (LANE_AT >= 0) continue;
      const score = tauWant === 'none' ? face.turn : -Math.abs(tau - Number(tauWant));
      if (score > best) { best = score; lane = slice.lane; laneTau = tau; }
    }
  }
  if (lane < 0) throw new Error('no live slice at that instant');
  console.log(`  the slice chosen: lane ${lane}, τ ${f(laneTau, 2)} (asked for τ ${tauWant})`);
  const bx = zone.lanes.baseX[lane]; const bz = zone.lanes.baseZ[lane];
  const rx = zone.lanes.rayX[lane]; const rz = zone.lanes.rayZ[lane];
  const face = faceAt(lane);
  const want0 = crestStation(zone, lane);
  /**
   * The crest's place along the lane to sub-station precision: the stations move in `LANE.step` = 0.25 m, so a
   * difference of `crestStation` over a tenth of a second is quantized to 2.5 m/s. The crest is interpolated by the
   * parabola through the three stations around the highest, and the pace is differenced over `--paceover` s.
   */
  const crestFine = (k: number): number => {
    const s0 = crestStation(zone, k);
    if (!(s0 === s0)) return Number.NaN;
    const hAt = (s: number) => { const a = zone.surface.laneAt(k, s); return a.weight > 0.1 ? a.height / a.weight : Number.NaN; };
    const a = hAt(s0 - LANE.step); const b = hAt(s0); const c = hAt(s0 + LANE.step);
    if (!(a === a) || !(b === b) || !(c === c)) return s0;
    const den = a - 2 * b + c;
    return Math.abs(den) < 1e-9 ? s0 : s0 + (LANE.step * (a - c)) / (2 * den);
  };
  const paceOver = Number(option('paceover') ?? 1);
  const paceOf = (): number => {
    const a = crestFine(lane);
    for (let i = 0; i < Math.round(paceOver / STEP); i += 1) sim.step(STEP);
    const b = crestFine(lane);
    restore();
    return (b - a) / paceOver;
  };
  const pace = paceOf();
  /** Which way across the face the peel runs: the side the breaking lanes are moving toward (lower lane index). */
  const leftOf = (k: number) => zone.lanes.rayZ[k] * (zone.lanes.baseX[Math.max(0, k - 8)] - zone.lanes.baseX[k]) - zone.lanes.rayX[k] * (zone.lanes.baseZ[Math.max(0, k - 8)] - zone.lanes.baseZ[k]);
  const peelLeft = leftOf(lane) > 0;
  console.log(`  lane ${lane} · ray (${f(rx, 3)}, ${f(rz, 3)}) · crest at s ${f(want0, 2)} (fine ${f(crestFine(lane), 2)}) of ${f(span, 0)} m`);
  console.log(`  the face: H ${f(face?.H ?? Number.NaN, 2)} m · run ${f(face?.run ?? Number.NaN, 2)} m · turn ${f(face?.turn ?? Number.NaN)}° · local ${f(face?.local ?? Number.NaN)}° · chord2 ${f(face?.chord2 ?? Number.NaN)}°`);
  console.log(`  pace along the lane ${f(pace, 2)} m/s (differenced over ${f(paceOver, 1)} s) · the peel runs to the ${peelLeft ? 'left' : 'right'} of the ray, so SIDE ${peelLeft ? '+' : '−'}45 goes down the line; SIDE is ${SIDE}`);
  const ahead = AHEAD * (face?.run ?? 6);
  sweep({
    label: `?wave=library t ${f(AT, 1)} lane ${lane}`,
    water: live,
    fall: new Vector3(rx, 0, rz).normalize(),
    pace,
    face,
    place: () => {
      const w = crestFine(lane);
      const s = Math.min(span, (w === w ? w : want0) + ahead);
      return { x: bx + s * rx, z: bz + s * rz };
    },
    reset: restore,
  });
  console.log(`  ${f((Date.now() - t0) / 1000, 0)} s wall in all`);
}
