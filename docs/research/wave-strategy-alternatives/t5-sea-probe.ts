/**
 * T5, the sea's side (2026-11-12): is the live sea's wave as tall as the Basilisk case's wave 2 to 4 s before the throw?
 * Solver only (no riders, no page). Built from ruling-17-runs/r17-probe3.ts (step 5's crash-probe with `--extra`): the
 * same game config path (`physicalSettingsFor`, `surfZoneConfigFor`, `?poolSize=ref` plus `--extra` on a stand-in
 * `location`), the same library (`readBarrelCases`, `libraryFromBytes`) and the same sea (`SurfZoneSimulation`, 'spun-up').
 * Its bar readers are left out; only t5-run.md section 5's measure is kept:
 * - a ring buffer of the sea's surface η every 0.1 s for the last 5 s;
 * - each front point is followed by its id; at its throw (its clock's τ = 0: the first step it reads τ >= 0, its throw
 *   time = now − τ) its place P and its ray (the front's shoreward normal there, from its neighbours along σ, as the
 *   loft stands a slice) are taken;
 * - for Δ = 2, 2.5, 3, 3.5, 4 s the sea at t_throw − Δ (two buffered frames, linear in time) is sampled along the ray
 *   every 0.25 m from 20 m shoreward of P to 80 m seaward of it: the crest = the local top nearest the case's crest
 *   place at that Δ; its height over the lowest water within 3 h0 shoreward of it (the case's rule); its height over
 *   still water; its distance before P; the face's steepest slope along the ray between the trough and the crest
 *   (samples 0.25 m apart; the case reads points >= 0.05 h0 apart, 0.23 m), and the angle between the ray and the
 *   sea's own η gradient at that steepest place (a check that the ray is square to the crest);
 * - the case at τ = −Δ, scaled as the game scales it: h0 = `library.caseBlend(...).scale` for the point's foot crest and
 *   foot depth (one case: foot crest / A0), times by √(h0/g). Read from the committed level-10 scout track
 *   (docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_scout_track.json: τ from its own vertical, the
 *   crest, the trough within 3 h0 ahead, the face angle, as t5_case_side.py), and, where the game's library has frames
 *   (τ >= its first frame), from the library's own profile (`profileAt`) as a check.
 * Run from the repository's root (the case files are read from public/):
 *   npx rolldown docs/research/wave-strategy-alternatives/t5-sea-probe.ts -o <scratch>/t5-sea-probe.mjs --format esm --platform node
 *   node <scratch>/t5-sea-probe.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug"
 */
import { readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { POOL_REF_FRONT_REACH } from '../../../src/wave/barrel/barrelSpots';
import { libraryFromBytes } from '../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../src/wave/barrel/nodeBarrelCases';
import { BARREL_SLOPE } from '../../../src/wave/barrel/sweptLoft';
import { GRAVITY } from '../../../src/wave/dispersion';
import { poolRefLine, poolStraightFrame as frameOnLine } from '../../../src/wave/pool';
import { SurfZoneSimulation, sweptBarrelOn, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const ref = process.argv.includes('--ref');
const until = Number(option('until') ?? 300);
const FROM = Number(option('from') ?? 60);
const TO = Number(option('to') ?? 270);
const TRACK = option('track') ?? 'docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_scout_track.json';
if (option('reach-to')) (POOL_REF_FRONT_REACH as unknown as { to: number }).to = Number(option('reach-to'));
const extra = [option('case') ? `&poolTubeCase=${option('case')}` : '', option('extra') ?? ''].join('');
if (ref) (globalThis as unknown as { location: { search: string } }).location = { search: `?poolSize=ref${extra}` };
const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
const config = surfZoneConfigFor(settings as never, 1, false) as SurfZoneConfig;
const slope = BARREL_SLOPE[config.spot];
const caseBytes = sweptBarrelOn(config) && slope !== undefined ? readBarrelCases(config.spot, undefined, config.poolTubeCase) : undefined;
const library = caseBytes ? libraryFromBytes(caseBytes, config.tubeShape, config.spot, config.heldRule) : undefined;
if (!library || slope === undefined) throw new Error('no library: the probe needs the swept barrel (--ref)');
const sim = new SurfZoneSimulation(config, 'spun-up', library);
const front = sim.front;
if (!front) throw new Error('no front');
const { solver } = sim;
const { nx, nz, xCenters, zCenters } = solver;
const reefStartX = poolRefLine().startX;
const frameOf = (x: number, z: number) => frameOnLine(x, z, reefStartX);

// ---- The case's scout track (h0 = 1 units, t in √(h0/g)).
interface TrackRow { t: number; x: number; y: number; trough: number; angle: number }
const trackFile = JSON.parse(readFileSync(TRACK, 'utf8')) as { t_vertical: number; x_vertical: number; track: TrackRow[]; level: number };
const track = trackFile.track;
function trackAt(t: number): TrackRow | undefined {
  for (let k = 0; k + 1 < track.length; k += 1) {
    const a = track[k]; const b = track[k + 1];
    if (a.t <= t && t <= b.t) {
      const w = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
      const m = (key: keyof TrackRow) => a[key] + w * (b[key] - a[key]);
      return { t, x: m('x'), y: m('y'), trough: m('trough'), angle: m('angle') };
    }
  }
  return undefined;
}

// ---- The ring buffer: η every 0.1 s, the last 5 s.
const STEP = 1 / 30; const EVERY = 3; const KEEP = 52;
const ring: Float32Array[] = []; const ringT: number[] = [];
for (let k = 0; k < KEEP; k += 1) { ring.push(new Float32Array(nx * nz)); ringT.push(Number.NaN); }
let ringHead = -1;
function pushFrame(time: number): void {
  ringHead = (ringHead + 1) % KEEP;
  const a = ring[ringHead];
  for (let i = 0; i < a.length; i += 1) a[i] = solver.h[i] > 0.05 ? solver.h[i] + solver.bed[i] - solver.restLevel : Number.NaN;
  ringT[ringHead] = time;
}
function bilinear(a: Float32Array, x: number, z: number): number {
  const gx = (x - xCenters[0]) / solver.dx;
  if (gx < 0 || gx > nx - 1) return Number.NaN;
  const ix = Math.min(nx - 2, Math.floor(gx)); const tx = gx - ix;
  if (z < zCenters[0] || z > zCenters[nz - 1]) return Number.NaN;
  const iz = solver.rowBelow(z); const tz = Math.min(1, Math.max(0, (z - zCenters[iz]) / (zCenters[iz + 1] - zCenters[iz])));
  const i = iz * nx + ix;
  return (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - tz) + (a[i + nx] * (1 - tx) + a[i + nx + 1] * tx) * tz;
}
/** η at (x, z) at time t, linear between the two buffered frames around it; NaN outside the buffer. */
function etaAt(t: number, x: number, z: number): number {
  let lo = -1; let hi = -1;
  for (let k = 0; k < KEEP; k += 1) {
    const tk = ringT[k]; if (tk !== tk) continue;
    if (tk <= t + 1e-9 && (lo < 0 || tk > ringT[lo])) lo = k;
    if (tk >= t - 1e-9 && (hi < 0 || tk < ringT[hi])) hi = k;
  }
  if (lo < 0 || hi < 0) return Number.NaN;
  const a = bilinear(ring[lo], x, z);
  if (lo === hi) return a;
  const w = (t - ringT[lo]) / (ringT[hi] - ringT[lo]);
  return a + w * (bilinear(ring[hi], x, z) - a);
}

// ---- The measure.
/** 1 and 1.5 s: a check only (there the game's library has frames, so the track and the library can be read side by side). */
const DELTAS = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const DS = 0.25; const BACK = 80; const AHEAD = 20;
interface Sample {
  ratio: number; rise: number; seaH: number; caseH: number; seaUp: number; caseUp: number; seaDist: number; caseDist: number;
  seaSlope: number; caseSlope: number; libH: number; libSlope: number; libDist: number; skew: number; t: number; s: number; scale: number; front: number;
}
const samples = new Map<number, Sample[]>(DELTAS.map((d) => [d, []]));
const misses = new Map<number, Record<string, number>>(DELTAS.map((d) => [d, {}]));
const miss = (d: number, why: string) => { const m = misses.get(d)!; m[why] = (m[why] ?? 0) + 1; };
const done = new Set<number>();
const profile = new Float32Array(2 * 128);
let throws = 0; const throwTimes: number[] = [];
const scales: number[] = []; const rayOff: number[] = [];

function caseFromLibrary(footHeight: number, footDepth: number, seconds: number, scale: number): { H: number; slope: number; dist: number } | undefined {
  const times = library!.profileTimes({ slope: slope!, footHeight, footDepth });
  if (seconds < times.startSeconds - 1e-6) return undefined;
  library!.profileAt({ slope: slope!, footHeight, footDepth, seconds }, profile);
  const cx = profile[64]; const cy = profile[65];
  let trough = Infinity;
  for (let k = 32; k < 128; k += 1) if (profile[2 * k] >= cx && profile[2 * k] <= cx + 3 * scale) trough = Math.min(trough, profile[2 * k + 1]);
  let steep = 0;
  for (let a = 32; a < 112; a += 1) for (let b = a + 1; b <= 112; b += 1) {
    const dx = profile[2 * b] - profile[2 * a]; const dy = profile[2 * b + 1] - profile[2 * a + 1];
    if (Math.hypot(dx, dy) >= 0.05 * scale) { steep = Math.max(steep, (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI); break; }
  }
  // The crest's place before its throw place: the frame's crest x against the τ = 0 frame's (the library's x is the case's own).
  library!.profileAt({ slope: slope!, footHeight, footDepth, seconds: 0 }, profile);
  return { H: cy - trough, slope: steep, dist: profile[64] - cx };
}

function measure(p: (typeof front.points)[number], tThrow: number, rayX: number, rayZ: number): void {
  const blend = library!.caseBlend({ slope: slope!, footHeight: p.footHeight, footDepth: p.footDepth });
  const h0 = blend.scale; const unit = Math.sqrt(h0 / GRAVITY);
  scales.push(h0);
  const xv = trackFile.x_vertical; const tv = trackFile.t_vertical;
  for (const d of DELTAS) {
    const row = trackAt(tv - d / unit);
    if (!row) { miss(d, 'case track ends'); continue; }
    const caseDist = (xv - row.x) * h0; const caseH = (row.y - row.trough) * h0; const caseUp = row.y * h0;
    // The sea along the ray: k = 0 at 20 m shoreward of P, distance before P = k·DS − AHEAD.
    const t = tThrow - d;
    const n = Math.round((BACK + AHEAD) / DS) + 1;
    const e = new Float64Array(n);
    for (let k = 0; k < n; k += 1) { const back = k * DS - AHEAD; e[k] = etaAt(t, p.x - rayX * back, p.z - rayZ * back); }
    if (!e.some((v) => v === v)) { miss(d, 'outside the buffer or window'); continue; }
    const W = Math.round(1 / DS); const troughSpan = Math.round((3 * h0) / DS);
    let bestK = -1; let bestGap = Infinity;
    for (let k = W; k < n - W; k += 1) {
      const v = e[k]; if (v !== v || v < 0.05) continue;
      let top = true;
      for (let j = k - W; j <= k + W; j += 1) if (j !== k && !(e[j] <= v)) { top = false; break; }
      if (!top) continue;
      let low = Infinity; for (let j = Math.max(0, k - troughSpan); j < k; j += 1) if (e[j] === e[j]) low = Math.min(low, e[j]);
      if (!(v - low >= 0.2)) continue;
      const gap = Math.abs(k * DS - AHEAD - caseDist);
      if (gap < bestGap) { bestGap = gap; bestK = k; }
    }
    if (bestK < 0) { miss(d, 'no sea crest on the ray'); continue; }
    let low = Infinity; let lowK = bestK;
    for (let j = Math.max(0, bestK - troughSpan); j < bestK; j += 1) if (e[j] === e[j] && e[j] < low) { low = e[j]; lowK = j; }
    if (bestK - troughSpan < 0) miss(d, 'trough span cut at the ray end (kept)');
    let steep = 0; let steepK = bestK;
    for (let j = lowK; j < bestK; j += 1) { const g = Math.abs(e[j + 1] - e[j]) / DS; if (g > steep) { steep = g; steepK = j; } }
    // The sea's own gradient at the steepest place, against the ray: is the ray square to the crest?
    const back = steepK * DS + DS / 2 - AHEAD; const qx = p.x - rayX * back; const qz = p.z - rayZ * back;
    const gx = (etaAt(t, qx + 0.5, qz) - etaAt(t, qx - 0.5, qz)); const gz = (etaAt(t, qx, qz + 0.5) - etaAt(t, qx, qz - 0.5));
    const skew = (Math.acos(Math.min(1, Math.abs(gx * rayX + gz * rayZ) / Math.max(1e-9, Math.hypot(gx, gz)))) * 180) / Math.PI;
    const seaH = e[bestK] - low;
    const lib = caseFromLibrary(p.footHeight, p.footDepth, -d, h0);
    samples.get(d)!.push({
      ratio: seaH / caseH, rise: caseUp - e[bestK], seaH, caseH, seaUp: e[bestK], caseUp, seaDist: bestK * DS - AHEAD, caseDist,
      seaSlope: (Math.atan(steep) * 180) / Math.PI, caseSlope: row.angle, libH: lib?.H ?? Number.NaN, libSlope: lib?.slope ?? Number.NaN,
      libDist: lib?.dist ?? Number.NaN, skew, t: tThrow, s: frameOf(p.x, p.z).s, scale: h0, front: p.front,
    });
  }
}

function onThrows(time: number): void {
  const byFront = new Map<number, typeof front.points>();
  for (const p of front!.points) { const l = byFront.get(p.front) ?? []; l.push(p); byFront.set(p.front, l); }
  for (const list of byFront.values()) {
    list.sort((a, b) => a.sigma - b.sigma);
    for (let k = 0; k < list.length; k += 1) {
      const p = list[k];
      if (done.has(p.id) || !(p.tau >= 0) || !(p.footHeight > 0)) continue;
      done.add(p.id);
      const tThrow = time - p.tau;
      if (p.tau > 0.2 || tThrow < FROM || tThrow > TO) continue;
      // The front's shoreward normal at P from its neighbours (up to two each way).
      const a = list[Math.max(0, k - 2)]; const b = list[Math.min(list.length - 1, k + 2)];
      let tx = b.x - a.x; let tz = b.z - a.z; const len = Math.hypot(tx, tz);
      if (!(len > 0.5)) continue;
      tx /= len; tz /= len;
      let rx = -tz; let rz = tx;
      const dir = sim.sea.components[0].direction; const fx = Math.sin(dir); const fz = Math.cos(dir);
      if (rx * fx + rz * fz < 0) { rx = -rx; rz = -rz; }
      rayOff.push((Math.acos(Math.min(1, rx * fx + rz * fz)) * 180) / Math.PI);
      throws += 1; throwTimes.push(tThrow);
      measure(p, tThrow, rx, rz);
    }
  }
}

const t0 = Date.now();
for (let n = 1; solver.time < until - 1e-9; n += 1) {
  sim.step(STEP);
  const time = solver.time;
  if (time < FROM - 5.5) continue;
  if (n % EVERY === 0) pushFrame(time);
  onThrows(time);
}

// ---- The report.
const q = (v: number[], p: number) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : Number.NaN; };
const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const r = (v: number[], d = 2) => `${f(q(v, 0.5), d)} (${f(q(v, 0.1), d)}–${f(q(v, 0.9), d)})`;
/** A wave = one front (its id), as the game's front carries one breaking crest line. */
const waves = [...new Set(samples.get(2)!.map((x) => x.front))];
console.log(`t5 sea side: pool, ${ref ? `?poolSize=ref${extra}` : 'big (no --ref)'}; to ${until} s (${((Date.now() - t0) / 1000).toFixed(0)} s wall); throws ${FROM}–${TO} s`);
console.log(`library: ${library.cases.map((c) => `${c.id} (A0 ${c.nonlinearity.toFixed(4)}, slope ${c.slope.toFixed(4)})`).join(', ')}; the spot's slope ${slope.toFixed(4)}; case track ${TRACK} (level ${trackFile.level}, vertical t ${trackFile.t_vertical.toFixed(3)}, x ${trackFile.x_vertical.toFixed(3)} h0)`);
console.log(`thrown points measured: ${throws} on ${waves.length} fronts (one front = one wave's breaking crest line); the game's h0 for them ${r(scales)} m (Froude: lengths x h0/4.5, times x sqrt(h0/4.5) from the 4.5 m case); the ray off the sea's feed direction ${r(rayOff, 0)} deg`);
console.log('\nper Δ: median (10–90 %). ratio = sea H / case H (H = crest over the lowest water within 3 h0 shoreward). rise = case crest − sea crest, over still water (m). dist = crest before the throw place along the ray (m). slope = the face\'s steepest along the ray (deg). lib = the same from the game\'s library where it has frames. skew = the ray against the sea\'s gradient at its steepest (deg).');
for (const d of DELTAS) {
  const v = samples.get(d)!;
  const pick = (k: keyof Sample) => v.map((x) => x[k]);
  console.log(`Δ ${d.toFixed(1)} s: n ${v.length} | ratio ${r(pick('ratio'))} | sea H ${r(pick('seaH'))} case H ${r(pick('caseH'))} | sea crest ${r(pick('seaUp'))} case crest ${r(pick('caseUp'))} rise ${r(pick('rise'))} | dist sea ${r(pick('seaDist'), 1)} case ${r(pick('caseDist'), 1)} | slope sea ${r(pick('seaSlope'), 0)} case ${r(pick('caseSlope'), 0)} | lib H ${r(pick('libH'))} lib slope ${r(pick('libSlope'), 0)} lib dist ${r(pick('libDist'), 1)} (${pick('libH').filter(Number.isFinite).length}) | skew ${r(pick('skew'), 0)} | misses ${JSON.stringify(misses.get(d))}`);
}
// Per wave (the median point of each wave), so long fronts do not outweigh short ones.
console.log('\nthe trough ahead (crest − H, over still water, m), sea and case, per Δ');
for (const d of DELTAS) { const v = samples.get(d)!; console.log(`Δ ${d.toFixed(1)} s: sea ${r(v.map((x) => x.seaUp - x.seaH))} case ${r(v.map((x) => x.caseUp - x.caseH))}`); }
console.log('\nper wave (one front): the median ratio over its points, per Δ, then the medians of those');
for (const d of DELTAS) {
  const v = samples.get(d)!;
  const per = waves.map((w) => v.filter((x) => x.front === w)).filter((l) => l.length >= 5);
  console.log(`Δ ${d.toFixed(1)} s: ${per.length} fronts with 5+ points, ratio ${r(per.map((l) => q(l.map((x) => x.ratio), 0.5)))}; each front's first throw at ${per.map((l) => Math.min(...l.map((x) => x.t)).toFixed(0)).join(', ')} s`);
}
// Along the reef: s thirds.
console.log('\nalong the reef (s at the throw), ratio at Δ 2 / 3 / 4 s');
const all = samples.get(2)!.map((x) => x.s);
const cuts = [q(all, 0), q(all, 1 / 3), q(all, 2 / 3), q(all, 1) + 1e-6];
for (let k = 0; k < 3; k += 1) {
  const part = (d: number) => samples.get(d)!.filter((x) => x.s >= cuts[k] && x.s < cuts[k + 1]).map((x) => x.ratio);
  console.log(`s ${f(cuts[k], 0)}–${f(cuts[k + 1], 0)} m: ${[2, 3, 4].map((d) => `${r(part(d))} (${part(d).length})`).join(' / ')}`);
}
const pass = [2, 3, 4].every((d) => { const m = q(samples.get(d)!.map((x) => x.ratio), 0.5); return m >= 0.9 && m <= 1.1; });
console.log(`\nbar (median ratio 0.90–1.10 at 2, 3 and 4 s): ${pass ? 'PASS' : 'FAIL'}`);
