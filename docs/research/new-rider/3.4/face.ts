/**
 * Step 3.4g: **is the 16° test face the face the owner rides?** A read and a ruling, not a build. Nothing under
 * `src/` moves and no rider runs on a sea.
 *
 * Three parts, three populations, and every angle says which of step 5e's four metrics it is
 * (`docs/research/wave-strategy-alternatives/c2-step5e.md` §1): **local** the steepest slope anywhere on the face as
 * the body reads it, **upper80** Carini's least-squares line through the upper 80 % of the height, **chord2/chord1**
 * the steepest 2 m and 1 m chord, **turn** the slope *change* from the trough to the steepest point. The project has
 * confused `local` with `turn` once before, so the four are always printed together.
 *
 * - **F. The test face itself** (`FaceWater`, the probes' own water, read through the same `sampleAt` the board is
 *   handed) reduced the four ways at 8 / 16 / 24°, with the slope at height fractions. No sea, no rider: the face is
 *   analytic, so these are exact for the arms step 3.3k onwards ran.
 * - **B. The face the board actually meets on it**, read out of step 3.4f's own kept per-frame dumps
 *   (`results/34f/*.mount.jsonl.gz`): `faceFrac` (where on the face the board sits), `aheadFronts`, `headOff` (its
 *   crossing angle) and **`tilt`** — the water's own surface tilt across the board's heading at the board's own
 *   position, which is the datum the balance loop reads. Per arm, per cell, never pooled. The along-face slope at the
 *   board is recomputed from `FaceWater` at the measured `faceFrac`, and the projection
 *   `tilt = atan(tan(slope) · sin ψ)` is **checked against the dumped `tilt`** rather than assumed (control C2).
 * - **C. Canyon B, the owner's own spot** (`?canyonWaves=true`), the arm's columns, read the way step 5e reads a face
 *   — along the ray, through `PhysicalSurfWater.forSimulation`, the water the bodies read. Three populations, because
 *   the two published Canyon measurements differ by their window and not by their metric: **every face** (step 5e's
 *   own population, which is the control that this probe reproduces its numbers), **the clean ridable faces** (a
 *   crest over the trough of at least `--minH`, nothing breaking at the crest) and **the breaking ones**. The
 *   owner's own swell is `DEFAULT_CONDITIONS.swell = 'practice'` [R, `SurfConditions.ts`], so that is the default
 *   here; `--swell medium` is step 5e's own row, for the control.
 *
 * `faceOf`, `band`, `q` and `feltFace` are **copies** of `c2-step5e-face.ts`'s, deliberately: importing that file
 * runs its own parts and then `process.exit(0)`. Part C's control is that the copies reproduce its published
 * Canyon row to the decimal on the same configuration.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/face.ts -o <scratch>/face.mjs --format esm --platform node
 *   node <scratch>/face.mjs --parts FB
 *   node <scratch>/face.mjs --parts C --swell medium --seeds 1 --from 60 --until 120   # step 5e's own row
 *   node <scratch>/face.mjs --parts C --swell practice --seeds 1,2,3 --from 60 --until 160
 *
 * Read-only: it imports from `src/` and writes nothing but its own `--out` json.
 */
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { libraryFromBytes } from '../../../../src/wave/barrel/barrelLibrary';
import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const PARTS = option('parts') ?? 'FBC';
const part = (c: string) => PARTS.includes(c);
const DS = Number(option('ds') ?? 0.05);
const FROM = Number(option('from') ?? 60);
const UNTIL = Number(option('until') ?? 160);
const SEEDS = (option('seeds') ?? '1,2,3').split(',').map(Number);
const SWELL = option('swell') ?? 'practice';
const MIN_H = Number(option('minH') ?? 1.0);
const RESULTS = option('results') ?? 'docs/research/new-rider/3.4/results/34f';
const OUT = option('out');
const DEG = 180 / Math.PI;
const STEP = 1 / 60;

// ------------------------------------------------------------------ copies from c2-step5e-face.ts (see the header)
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const band = (v: number[], d = 1) => {
  const n = v.filter(Number.isFinite).length;
  return n ? `${f(q(v, 0.5), d)} (${f(q(v, 0.05), d)}–${f(q(v, 0.95), d)}, most ${f(q(v, 1), d)}; n ${n})` : '– (n 0)';
};
/**
 * The height fractions the profile is read at. `0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95` are step 5e's own, kept
 * exactly so its published rows are comparable; `0.16` and `0.45` are **this round's**, the median and the 95th of
 * where the board actually sits in step 3.4f's dumps (part B).
 */
const FRACTIONS = [0.05, 0.15, 0.16, 0.3, 0.45, 0.5, 0.7, 0.85, 0.95];

interface Face {
  H: number; run: number; local: number; upper80: number; chord2: number; chord1: number; turn: number;
  steepFrac: number; profile: number[]; steepArc: number;
  uCrest: number; uSteep: number; uTrough: number;
  /** This round's own columns: the game's `breaking` field at the crest and at the steepest point, 0 … 1. */
  brCrest: number; brSteep: number;
}

function faceOf(
  pts: { d: number; y: number }[], localSlope?: number[],
  flow?: { u: number[]; br: number[] },
): Face | undefined {
  const n = pts.length;
  if (n < 4) return undefined;
  const H = pts[n - 1].y - pts[0].y;
  const run = pts[n - 1].d - pts[0].d;
  if (!(H > 0.1) || !(run > 0.2)) return undefined;
  let local = 0;
  let steepAt = 0;
  for (let i = 0; i < n; i += 1) {
    const a = localSlope ? localSlope[i] : (i + 1 < n ? Math.atan((pts[i + 1].y - pts[i].y) / Math.max(1e-6, pts[i + 1].d - pts[i].d)) * DEG : 0);
    if (a > local) { local = a; steepAt = i; }
  }
  const yLow = pts[0].y + 0.2 * H;
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0; let m = 0;
  for (const p of pts) {
    if (p.y < yLow) continue;
    sx += p.d; sy += p.y; sxx += p.d * p.d; sxy += p.d * p.y; m += 1;
  }
  const upper80 = m > 2 && m * sxx - sx * sx > 1e-9 ? Math.atan((m * sxy - sx * sy) / (m * sxx - sx * sx)) * DEG : Number.NaN;
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
  const slopeAt = (i: number) => (localSlope ? localSlope[i] : (i + 1 < n ? Math.atan((pts[i + 1].y - pts[i].y) / Math.max(1e-6, pts[i + 1].d - pts[i].d)) * DEG : 0));
  const turn = local - slopeAt(0);
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
  return {
    H, run, local, upper80, chord2, chord1, turn, steepFrac: (pts[steepAt].y - pts[0].y) / H, profile, steepArc,
    uCrest: flow ? flow.u[n - 1] : Number.NaN, uSteep: flow ? flow.u[steepAt] : Number.NaN, uTrough: flow ? flow.u[0] : Number.NaN,
    brCrest: flow ? flow.br[n - 1] : Number.NaN, brSteep: flow ? flow.br[steepAt] : Number.NaN,
  };
}

/** A face read along a ray through the felt water: from the crest in the window down to the trough ahead of it. */
function feltFace(
  water: SurfWater, sample: WaterSample, atX: (s: number) => number, atZ: (s: number) => number,
  from: number, to: number,
): Face | undefined {
  const pts: { d: number; y: number }[] = [];
  const slopes: number[] = [];
  const us: number[] = [];
  const brs: number[] = [];
  for (let s = from; s <= to + 1e-9; s += DS) {
    water.sampleAt(atX(s), 50, atZ(s), sample);
    const y = sample.surfaceY;
    if (!(y === y)) return undefined;
    const dxds = (atX(s + 1e-3) - atX(s)) / 1e-3;
    const dzds = (atZ(s + 1e-3) - atZ(s)) / 1e-3;
    const along = sample.slopeX * dxds + sample.slopeZ * dzds;
    pts.push({ d: s - from, y });
    slopes.push(Math.atan(-along) * DEG);
    us.push(sample.flowX * dxds + sample.flowZ * dzds);
    brs.push(sample.breaking);
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
  const upBr: number[] = [];
  for (let i = trough; i >= crest; i -= 1) {
    up.push({ d: pts[trough].d - pts[i].d, y: pts[i].y });
    upSlope.push(slopes[i]); upU.push(us[i]); upBr.push(brs[i]);
  }
  return faceOf(up, upSlope, { u: upU, br: upBr });
}

/**
 * **Every** face in a window, not only the tallest crest's. `feltFace` (step 5e's own) takes the single highest point
 * in its 90 m window as the crest, so one column-frame yields one face and it is whichever swell in that stretch
 * happens to be tallest — usually an unbroken one well offshore of where the arm breaks (the Practice take-off is at
 * z −125 and the onsets sit at z −98 … −102 [R, PR #223's calibration]). This walks the window instead and returns
 * the face under **each** local crest, with the crest's own z, so a population can be conditioned on where the rider
 * actually is. `brMax` is the largest `breaking` anywhere on the face, which is the control that the field is not
 * identically zero by construction.
 */
function feltFaces(
  water: SurfWater, sample: WaterSample, x: number, z0: number, z1: number,
): { face: Face; crestZ: number; brMax: number }[] {
  const ys: number[] = [];
  const slopes: number[] = [];
  const us: number[] = [];
  const brs: number[] = [];
  const zs: number[] = [];
  for (let z = z0; z <= z1 + 1e-9; z += DS) {
    water.sampleAt(x, 50, z, sample);
    if (!(sample.surfaceY === sample.surfaceY)) return [];
    ys.push(sample.surfaceY);
    slopes.push(Math.atan(-sample.slopeZ) * DEG);
    us.push(sample.flowZ);
    brs.push(sample.breaking);
    zs.push(z);
  }
  const outFaces: { face: Face; crestZ: number; brMax: number }[] = [];
  const n = ys.length;
  for (let i = 1; i + 1 < n; i += 1) {
    if (!(ys[i] > ys[i - 1] && ys[i] >= ys[i + 1])) continue;
    // Onshore (+z) from the crest to the trough ahead: the first point the surface starts rising again from.
    let trough = i;
    for (let j = i + 1; j < n; j += 1) {
      if (ys[j] < ys[trough]) trough = j;
      else if (ys[j] > ys[trough] + 0.05) break;
    }
    if (trough - i < 4) continue;
    const up: { d: number; y: number }[] = [];
    const upSlope: number[] = [];
    const upU: number[] = [];
    const upBr: number[] = [];
    for (let j = trough; j >= i; j -= 1) {
      up.push({ d: zs[trough] - zs[j], y: ys[j] });
      upSlope.push(slopes[j]); upU.push(us[j]); upBr.push(brs[j]);
    }
    const face = faceOf(up, upSlope, { u: upU, br: upBr });
    if (face) outFaces.push({ face, crestZ: zs[i], brMax: Math.max(...upBr) });
  }
  return outFaces;
}

interface Bucket {
  local: number[]; upper80: number[]; chord2: number[]; chord1: number[]; turn: number[]; steepFrac: number[];
  steepArc: number[]; H: number[]; run: number[]; profile: number[][]; uCrest: number[]; uSteep: number[];
  uTrough: number[]; brCrest: number[]; atBoard: number[];
}
const bucket = (): Bucket => ({
  local: [], upper80: [], chord2: [], chord1: [], turn: [], steepFrac: [], steepArc: [], H: [], run: [],
  profile: FRACTIONS.map(() => []), uCrest: [], uSteep: [], uTrough: [], brCrest: [], atBoard: [],
});
/** The index in FRACTIONS of the board's own measured place on the face (part B's median). */
const AT_BOARD = FRACTIONS.indexOf(0.16);
const add = (b: Bucket, face: Face) => {
  b.local.push(face.local); b.upper80.push(face.upper80); b.chord2.push(face.chord2); b.chord1.push(face.chord1);
  b.turn.push(face.turn); b.steepFrac.push(face.steepFrac); b.steepArc.push(face.steepArc); b.H.push(face.H);
  b.run.push(face.run); b.uCrest.push(face.uCrest); b.uSteep.push(face.uSteep); b.uTrough.push(face.uTrough);
  b.brCrest.push(face.brCrest); b.atBoard.push(face.profile[AT_BOARD]);
  face.profile.forEach((v, i) => b.profile[i].push(v));
};
const report = (name: string, b: Bucket) => {
  console.log(`  ${name}`);
  console.log(`    H ${band(b.H, 2)} m · run ${band(b.run, 1)} m · steepest at ${band(b.steepFrac, 2)} of H`);
  console.log(`    local ${band(b.local)}° · upper80 ${band(b.upper80)}° · chord2 ${band(b.chord2)}° · chord1 ${band(b.chord1)}° · turn ${band(b.turn)}°`);
  console.log(`    AT THE BOARD'S OWN PLACE (0.16 of H, part B): ${band(b.atBoard)}°`);
  console.log(`    over 30°, arc ${band(b.steepArc, 2)} m · share of faces whose local reaches 30° ${f((100 * b.local.filter((v) => v >= 30).length) / Math.max(1, b.local.length))} %`);
  console.log(`    profile up the face: ${FRACTIONS.map((fr, i) => `${(100 * fr).toFixed(0)} % ${f(q(b.profile[i], 0.5))}°`).join(' · ')}`);
  if (b.uCrest.some(Number.isFinite)) {
    console.log(`    the water along the face, m/s (onshore +): crest ${band(b.uCrest, 2)} · steepest ${band(b.uSteep, 2)} · trough ${band(b.uTrough, 2)}`);
    console.log(`    breaking at the crest: ${band(b.brCrest, 3)} · share of faces with any: ${f((100 * b.brCrest.filter((v) => v > 0).length) / Math.max(1, b.brCrest.length))} %`);
  }
};

const out: Record<string, unknown> = {};

// ------------------------------------------------------------------ F. The test face itself.
if (part('F')) {
  console.log('\n## F. The test face — `FaceWater` as the 3.3/3.4 probes build it, reduced step 5e\'s four ways');
  console.log('  (read along +z through the same `sampleAt` the board is handed, every 5 cm; the face is analytic, so these are exact)');
  const rows: { slope: number; face: Face; water: FaceWater }[] = [];
  for (const slope of [8, 16, 24]) {
    const water = new FaceWater({ depth: 2.6, height: 1.4, slope, speed: 5.7 });
    const sample = createWaterSample();
    const face = feltFace(water, sample, () => 0, (s) => water.crestZ() - 2 + s, 0, 2 + 1.4 * water.front);
    if (!face) { console.log(`  ${slope}°: no face`); continue; }
    rows.push({ slope, face, water });
    const b = bucket();
    add(b, face);
    report(`\`FACE=1.4,${slope},5.7\`, 2.6 m deep — the front is ${f(water.front, 2)} m`, b);
  }
  out.F = rows.map((r) => ({ slope: r.slope, front: r.water.front, ...r.face }));
}

// ------------------------------------------------------------------ B. The face the board actually meets on it.
interface MountRow { wheel: string; mount: string; arange: string; entryAsked: number | null; stance: string; frame: number; t: number; tilt: number; faceFrac: number; aheadFronts: number; headOff: number; roll: number; speed: number }

const readRows = async (path: string): Promise<MountRow[]> => {
  const rows: MountRow[] = [];
  const rl = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of rl) if (line) rows.push(JSON.parse(line) as MountRow);
  return rows;
};

if (part('B')) {
  console.log('\n## B. The face the board actually MEETS on it — step 3.4f\'s own kept per-frame dumps, nothing re-run');
  console.log('  (`faceFrac` where on the face the board sits, `tilt` the water\'s surface tilt ACROSS the board\'s heading at its own position — the datum the balance loop reads)');
  // The arms, named apart: the glide cell (`g-`, EXTRAS) and the owner's own low cell (`l-`, ENTRIES). Never pooled.
  const arms = [
    ['g-off', 'the glide, the datum off'], ['g-predict', 'the glide, the prediction alone'],
    ['g-ref', 'the glide, the reference alone'], ['g-tilt', 'the glide, both'],
    ['l-off', "the owner's cell, the datum off"], ['l-tilt', "the owner's cell, both"],
    ['s8-off', 'the 8° face, the datum off'], ['s24-off', 'the 24° face, the datum off'],
  ];
  const faceOfArm = (name: string) => (name.startsWith('s8') ? 8 : name.startsWith('s24') ? 24 : 16);
  const lines: string[] = [];
  const dump: Record<string, unknown> = {};
  for (const [name, label] of arms) {
    let rows: MountRow[];
    try { rows = await readRows(`${RESULTS}/${name}.mount.jsonl.gz`); } catch { console.log(`  ${name}: no dump`); continue; }
    const slope = faceOfArm(name);
    const water = new FaceWater({ depth: 2.6, height: 1.4, slope, speed: 5.7 });
    const sample = createWaterSample();
    // The along-face slope the water reports at the board's own z, and the across-board projection of it: both
    // recomputed from `FaceWater` at the measured `faceFrac`, so C2 can check them against the dumped `tilt`.
    const along: number[] = [];
    const predicted: number[] = [];
    const measured: number[] = [];
    const resid: number[] = [];
    for (const r of rows) {
      const z = water.crestZ() + r.aheadFronts * water.front;
      water.sampleAt(0, 0, z, sample);
      const a = Math.atan(-sample.slopeZ) * DEG;
      const psi = Math.abs(Math.sin(r.headOff / DEG));
      along.push(a);
      predicted.push(Math.atan(Math.tan(a / DEG) * psi) * DEG);
      measured.push(Math.abs(r.tilt));
      resid.push(Math.abs(Math.abs(Math.atan(Math.tan(a / DEG) * psi) * DEG) - Math.abs(r.tilt)));
    }
    const first = rows.filter((r) => r.frame === 1);
    console.log(`  ${label} (\`${name}\`, nominal local ${slope}°): ${rows.length} frames of ${first.length} runs`);
    console.log(`    where on the face: faceFrac ${band(rows.map((r) => r.faceFrac), 3)} · aheadFronts ${band(rows.map((r) => r.aheadFronts), 3)} · the crossing angle ${band(rows.map((r) => Math.abs(r.headOff)), 1)}°`);
    console.log(`    the slope the water reports there, ALONG the face: ${band(along)}° · at frame 1 ${band(along.filter((_, i) => rows[i].frame === 1))}°`);
    console.log(`    the tilt the loop reads, ACROSS the board: ${band(measured)}° · at frame 1 ${band(measured.filter((_, i) => rows[i].frame === 1))}°`);
    console.log(`    C2, the projection against the dump: |atan(tan(slope)·sin ψ)| − |tilt| peak ${f(q(resid, 1), 6)}°`);
    lines.push(name);
    dump[name] = {
      frames: rows.length, runs: first.length, slope,
      faceFrac: q(rows.map((r) => r.faceFrac), 0.5), faceFrac95: q(rows.map((r) => r.faceFrac), 0.95),
      along: q(along, 0.5), alongFrame1: q(along.filter((_, i) => rows[i].frame === 1), 0.5),
      tilt: q(measured, 0.5), tiltFrame1: q(measured.filter((_, i) => rows[i].frame === 1), 0.5),
      residPeak: q(resid, 1),
    };
  }
  out.B = dump;
}

// ------------------------------------------------------------------ C. Canyon B, the owner's own spot.
if (part('C')) {
  const COLUMNS = (option('columns') ?? '-122,-112,-102,-92,-82,-72,-62').split(',').map(Number);
  /** This round's own window, which reaches onshore of the onsets (z −98 … −102 on Practice [R, PR #223]). */
  const Z0 = Number(option('z0') ?? -175);
  const Z1 = Number(option('z1') ?? -60);
  console.log(`\n## C. Canyon B, the arm (?canyonWaves=true, swell ${SWELL}, tide mid, stage 2, CPU; ${f(FROM, 0)}–${f(UNTIL, 0)} s, every 0.1 s, columns ${COLUMNS.join(' ')}, seeds ${SEEDS.join(',')}, window z ${f(Z0, 0)} … ${f(Z1, 0)})`);
  /** The take-off's own z and the half-width of the window around it that counts as "where the rider is". */
  const TAKEOFF = Number(option('takeoffZ') ?? -125);
  const NEAR = Number(option('near') ?? 25);
  const fiveE = bucket();          // step 5e's own read, for the control
  const all = bucket();            // every crest in the window
  const clean = bucket();          // H ≥ MIN_H, nothing breaking on the face
  const bigClean = bucket();       // the same, H ≥ 1.3 m (the calibration's sets)
  const nearClean = bucket();      // H ≥ MIN_H, clean, the crest within NEAR m of the take-off
  const breaking = bucket();       // anything breaking on the face
  let frames = 0;
  let brAny = 0;
  let faces = 0;
  for (const seed of SEEDS) {
    (globalThis as unknown as { location: { search: string } }).location = { search: '?canyonWaves=true' };
    const settings = physicalSettingsFor('canyon', { swell: SWELL, tide: 'mid', wind: 'calm', time: 'midday', waves: 'practice' } as never, { stage: 2, compute: 'cpu' });
    const config = surfZoneConfigFor(settings as never, seed, false, { stage: 2, compute: 'cpu' }) as SurfZoneConfig;
    const t0 = Date.now();
    const sim = new SurfZoneSimulation(config, 'spun-up', libraryFromBytes(readBarrelCases(config.spot, undefined, config.poolTubeCase), config.tubeShape, config.spot, config.heldRule));
    const water = PhysicalSurfWater.forSimulation(sim, undefined, 1);
    const sample = createWaterSample();
    console.log(`  seed ${seed}: spun up on the CPU in ${((Date.now() - t0) / 1000).toFixed(1)} s, solver at t ${sim.solver.time.toFixed(1)} s`);
    // C1: the spot this is, read off the built config and the solver's own grid, so nobody has to take the URL's word
    // for it. Canyon B is 400 × 451 = 180 400; the DEFAULT Canyon is 400 × 507 = 202 800 — a different spot.
    console.log(`  C1, the spot: spot ${config.spot} · canyonBed ${String(config.canyonBed)} · swell ${SWELL} · grid ${sim.solver.nx} × ${sim.solver.nz} = ${sim.solver.nx * sim.solver.nz} · stage ${String(config.stage)}`);
    let next = FROM;
    for (let t = FROM; t <= UNTIL; t += STEP) {
      while (sim.solver.time < t - 1e-9) sim.step(STEP);
      if (t < next) continue;
      next += 0.1;
      frames += 1;
      for (const x of COLUMNS) {
        // step 5e's own read: the tallest crest in z −200 … −110, one face a column-frame.
        const one = feltFace(water, sample, () => x, (s) => -200 + s, 0, 90);
        if (one) add(fiveE, one);
        // This round's: every crest in a window that reaches onshore of where the arm breaks.
        for (const { face, crestZ, brMax } of feltFaces(water, sample, x, Z0, Z1)) {
          faces += 1;
          if (brMax > 0) brAny += 1;
          add(all, face);
          if (brMax > 0) { add(breaking, face); continue; }
          if (face.H >= MIN_H) {
            add(clean, face);
            if (face.H >= 1.3) add(bigClean, face);
            if (Math.abs(crestZ - TAKEOFF) <= NEAR) add(nearClean, face);
          }
        }
      }
    }
    console.log(`  seed ${seed}: ${frames} frame-reads so far, ${faces} faces, ${brAny} of them with breaking anywhere on them`);
  }
  console.log(`  ${faces} faces in all, ${brAny} with breaking anywhere on them (${f((100 * brAny) / Math.max(1, faces))} %) — the control that the field is not zero by construction`);
  report('step 5e\'s own read: the TALLEST crest in z −200 … −110, one face a column-frame', fiveE);
  report(`every crest in z ${f(Z0, 0)} … ${f(Z1, 0)} (this round's window, which reaches the onsets)`, all);
  report(`the CLEAN faces: H ≥ ${f(MIN_H, 2)} m, nothing breaking anywhere on them`, clean);
  report('the clean faces of H ≥ 1.30 m (the calibration\'s sets)', bigClean);
  report(`the clean faces whose crest is within ${f(NEAR, 0)} m of the take-off (z ${f(TAKEOFF, 0)})`, nearClean);
  report('the BREAKING faces (breaking > 0 anywhere on them)', breaking);
  const pack = (b: Bucket) => ({
    n: b.local.length, H: q(b.H, 0.5), local: q(b.local, 0.5), localTop: q(b.local, 0.95), localMax: q(b.local, 1),
    upper80: q(b.upper80, 0.5), chord2: q(b.chord2, 0.5), turn: q(b.turn, 0.5), atBoard: q(b.atBoard, 0.5),
    steepFrac: q(b.steepFrac, 0.5),
  });
  out.C = {
    swell: SWELL, seeds: SEEDS, from: FROM, until: UNTIL, minH: MIN_H, columns: COLUMNS, window: [Z0, Z1], takeoff: TAKEOFF, near: NEAR,
    faces, brAny, fiveE: pack(fiveE), all: pack(all), clean: pack(clean), bigClean: pack(bigClean), nearClean: pack(nearClean), breaking: pack(breaking),
  };
}

if (OUT) writeFileSync(OUT, `${JSON.stringify(out)}\n`);
