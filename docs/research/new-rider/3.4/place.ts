/**
 * **Step 3.4h: the placement arm, and the hole in every ride time.** Step 3.4g ruled that the folder's
 * `FACE=1.4,16,5.7` is the owner's own wave *in the moment it breaks*, and that the probe has never put the board on
 * 16° of anything: it sits where the test wave gives **12.3°** along the face and his own spot gives **5.4–5.6°**
 * [R, README Part 7 §5]. The handoff's first resume item was *"the placement arm — free, and start here"*. This file
 * is the instrument for it, and for the unnamed conditionality 3.4g found sideways: the frames in which the board has
 * **no face under it at all**.
 *
 * Read-only. Part P imports `FaceWater` from `src/physics/testing/` and nothing else; Parts O and R read the `.jsonl`
 * dumps `3.3/plant.ts` writes and import nothing at all. **No byte under `src/` or `server/` moves in this round**,
 * so there is no switch to add and no default to keep: the game cannot ride differently because nothing of it changed.
 *
 * ## P — the placement sweep, analytic and therefore exact
 *
 * `FaceWater`'s face is `η = H (1 − smoothstep(a / front))` with `front = 1.5 H / tan(slope)` [R, `FaceWater.ts`], so
 * at `a = AHEAD · front`
 *
 *     the height fraction   faceFrac(AHEAD) = 1 − smoothstep(AHEAD)             (exactly the probe's own column)
 *     the along-face slope  along(AHEAD)    = atan( tan(slope) · 4 AHEAD (1 − AHEAD) )
 *     the across-deck tilt  tilt            = atan( tan(along) · sin ψ )        (3.4g's C2, residual ≤ 0.003°)
 *
 * **Two consequences the handoff's four-value list does not carry, and they are the round's own findings.**
 * `4 AHEAD (1 − AHEAD)` is symmetric about mid-face, so **every slope below the nominal one is reached twice** —
 * once low on the face and once high on it — and the two differ in the only other thing the placement sets: the
 * **room**, `(1 − AHEAD) · front` metres of face between the board and the trough, past which `FaceWater` is a flat
 * still lake (Part O). And `3.3/plant.ts`'s `EXTRAS` entry speed is `(c − u)/cos 45°` with `u = c η/(d + η)` the water's own flow at the
 * placement [R, `:813`], so the placement moves the **entry speed band** as well — by **2.67 m/s** over this sweep,
 * against the glide cell's own 6 m/s span of `EXTRAS`. So the placement does not pick one quantity, it picks
 * **four**, and they are not independent. An `EXTRAS` placement sweep is therefore not a one-variable sweep, and
 * every arm in Part C's own sweep is run on **absolute** entries (`ENTRIES`) for that reason.
 *
 * The sweep also prints, for each slope, **where on the owner's own wave that slope lives** — interpolated in his
 * measured profile of the clean ridable faces within 25 m of the Practice take-off (`CANYON_PROFILE` below, 2 194
 * faces, seed 3, step 3.4g §4b [R]) — so "put the board on the slope he rides" has a second column saying whether
 * it also puts it where on his face he rides.
 *
 * ## O — the frames with no face under the board, and what a ride time is then
 *
 * 3.4g measured `faceFrac ≤ 0.001` on **22.5 %** of the shipped glide arm's frames and **0 of 845** on the arm that
 * dies first, and declined to turn it into a mechanism. This part names the mechanism and tests it rather than
 * asserting it, with four reads whose candidates are the brief's own:
 *
 * 1. **The identity.** `faceFrac` recomputed from `aheadFronts` alone (`1 − smoothstep`, or 1 behind the crest)
 *    against the dumped column, frame by frame. If it closes, the column is geometry and not a guard, a datum or a
 *    missing value dressed as a zero (`Number(null) === 0`).
 * 2. **Which end.** The `aheadFronts` of the off-face frames themselves. `> 1` is the board **past the trough**,
 *    onshore; `< 0` would be behind the crest, which `faceFraction` returns **1** for, so it cannot appear here.
 * 3. **Survivorship, at a matched age.** The share off the face inside a time window every arm lives through. If the
 *    arms differ there, the share is a property of the arm; if they do not, the three-fold spread is a property of
 *    how long each arm lives, and cannot be the interaction Part 5 could not explain.
 * 4. **The bias's own sign and size.** Per run: the share of its own duration off the face, whether its **last**
 *    frame is off the face, and the **on-face ride time** — the first off-face frame's `t`, or the ride's own end if
 *    it never leaves. Printed beside the published median, never instead of it, and with the per-run column, because
 *    a median over a bimodal population is a knife edge (`s8-off`, §R).
 *
 * ## R — the falls, both conventions, with the on-face time beside them
 *
 * The folder's own `qt(v, 0.5)` (the **upper** middle element [R, `mount.ts`]), fallers-at-`fellAt` and
 * non-fallers-at-9 s, per arm and per stance, never pooled, with each arm's frame-1 geometry read out of its own
 * mount dump so no arm is quoted at a placement it did not run.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/place.ts -o <scratch>/pc.mjs --format esm --platform node
 *   node <scratch>/pc.mjs --parts P
 *   DIR=docs/research/new-rider/3.4/results/34f ARMS=g-off,g-predict node <scratch>/pc.mjs --parts OR
 *
 * Env / flags: `--parts POR`, `DIR` (the results folder), `ARMS` (comma-separated), `--slopes 8,16,24`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const PARTS = option('parts') ?? 'POR';
const part = (c: string) => PARTS.includes(c);
const DIR = process.env.DIR ?? 'docs/research/new-rider/3.4/results/34h';
const ARMS = (process.env.ARMS ?? '').split(',').filter((s) => s.length);
const SLOPES = (option('slopes') ?? '16,8,24').split(',').map(Number);
const DEG = 180 / Math.PI;

/** `FaceWater`'s own smoothstep and its derivative, restated so Part P needs no instance to be exact. */
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const smoothRate = (t: number) => (t <= 0 || t >= 1 ? 0 : 6 * t * (1 - t));

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);
/** **The folder's own convention**: `q(v, 0.5)` is the UPPER element of the middle pair, not the pair's mean [R]. */
const q = (v: number[], p: number) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN;
};

/**
 * **The owner's own wave, as step 3.4g measured it** [R, README Part 7 §4b]: the slope at each fraction of the height
 * on the **clean ridable faces whose crest is within 25 m of the Practice take-off**, Canyon B (`?canyonWaves=true`),
 * swell Practice, tide mid, stage 2, CPU, **seed 3, n = 2 194 faces**. Seeds 1 and 2 give 5.5° and 5.4° at 0.16 of H
 * against seed 3's 5.6°, so the band quoted against this table is **5.4–5.6°, three seeds, never pooled**.
 * It is data, not a model: nothing here fits or smooths it.
 */
const CANYON_PROFILE: { frac: number; slope: number }[] = [
  { frac: 0.05, slope: 2.3 }, { frac: 0.15, slope: 5.3 }, { frac: 0.16, slope: 5.6 }, { frac: 0.30, slope: 8.7 },
  { frac: 0.45, slope: 10.8 }, { frac: 0.50, slope: 11.2 }, { frac: 0.70, slope: 11.4 }, { frac: 0.85, slope: 9.6 },
  { frac: 0.95, slope: 6.0 },
];
/**
 * The fraction of his own height at which the owner's clean face presents `deg`, read off `CANYON_PROFILE` by linear
 * interpolation **on the rising limb only** (0.05 → 0.70, where it is monotone). Above 11.4° it does not exist on
 * that population at all, and the function says so rather than extrapolating.
 */
function canyonFracOf(deg: number): number {
  const rise = CANYON_PROFILE.filter((p) => p.frac <= 0.70);
  if (deg < rise[0].slope || deg > rise[rise.length - 1].slope) return Number.NaN;
  for (let i = 0; i + 1 < rise.length; i += 1) {
    const a = rise[i];
    const b = rise[i + 1];
    if (deg >= a.slope && deg <= b.slope) return a.frac + ((deg - a.slope) / (b.slope - a.slope)) * (b.frac - a.frac);
  }
  return Number.NaN;
}

// ------------------------------------------------------------------ P. the placement sweep
if (part('P')) {
  const AHEADS = [0.0925, 0.15, 0.25, 0.35, 0.50, 0.65, 0.75, 0.80, 0.85, 0.90, 0.9075, 0.95];
  for (const slope of SLOPES) {
    const H = 1.4;
    const front = (1.5 * H) / Math.tan(slope / DEG);
    out(`\n## P. \`FACE=1.4,${slope},5.7\` — the front is ${f(front, 2)} m; the placement's FOUR quantities, exact`);
    out(`  (\`AHEAD\` is the placement in fronts; ψ = 45° is the probe's own \`SIDE = −45\`; the room is the face left between the board and the trough; `EXTRAS entry` is the speed band's own baseline, which the placement moves too)`);
    out(['AHEAD', 'faceFrac', 'along °', 'tilt(45°) °', 'room m', 'room fronts', 'the water u m/s', 'EXTRAS entry m/s', 'Canyon frac', 'side'].map((s, i) => pad(s, i ? 13 : 8)).join(''));
    for (const a of AHEADS) {
      const frac = 1 - smooth(a);
      const along = Math.atan((Math.tan(slope / DEG) * smoothRate(a)) / 1.5) * DEG;
      const tilt = Math.atan(Math.tan(along / DEG) * Math.sin(45 / DEG)) * DEG;
      const room = (1 - a) * front;
      const cf = canyonFracOf(along);
      // **The fourth quantity the placement sets, and the one that is easy to miss.** `3.3/plant.ts` takes its
      // `EXTRAS` entry speed as `(wave speed − the water's own along-fall-line flow) / cos 45° + extra` [R, `:813`],
      // and that flow is `c η / (d + η)` — a function of the placement. So moving `AHEAD` moves the whole speed band
      // the arm rides, and an `EXTRAS` placement sweep is not a one-variable sweep.
      const eta = 1.4 * frac;
      const u = (5.7 * eta) / (2.6 + eta);
      const entry = (5.7 - u) / Math.cos(45 / DEG);
      out([f(a, 4), f(frac, 3), f(along, 2), f(tilt, 2), f(room, 2), f(1 - a, 3), f(u, 3), f(entry, 3),
        Number.isFinite(cf) ? f(cf, 3) : 'not on it', a < 0.5 ? 'upper' : a > 0.5 ? 'lower' : 'mid',
      ].map((s, i) => pad(s, i ? 13 : 8)).join(''));
    }
    // The control that the closed forms above are `FaceWater`'s own water and not an algebra that resembles it:
    // the same two columns read through `sampleAt`, the call the board is handed.
    const water = new FaceWater({ depth: 2.6, height: 1.4, slope, speed: 5.7 });
    const sample = createWaterSample();
    let worstSlope = 0;
    let worstFrac = 0;
    for (const a of AHEADS) {
      water.sampleAt(0, 0, water.crestZ() + a * front, sample);
      const read = Math.atan(-sample.slopeZ) * DEG;
      const closed = Math.atan((Math.tan(slope / DEG) * smoothRate(a)) / 1.5) * DEG;
      worstSlope = Math.max(worstSlope, Math.abs(read - closed));
      const readFrac = water.faceFraction(water.crestZ() + a * front);
      worstFrac = Math.max(worstFrac, Math.abs(readFrac - (1 - smooth(a))));
    }
    out(`  P1, the closed forms against \`FaceWater.sampleAt\` / \`.faceFraction\` at the same twelve placements: peak |Δslope| ${worstSlope.toExponential(1)}°, peak |ΔfaceFrac| ${worstFrac.toExponential(1)}`);
  }
}

// ------------------------------------------------------------------ the dumps
interface Frame { frame: number; t: number; aheadFronts: number; faceFrac: number; tilt: number; roll: number; headOff: number; speed: number; stance: string }
interface Run { stance: string; extra: number | null; entryAsked: number | null; fell: string | false; fellAt: number; mount: string; wheel: string }

const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8')
  : existsSync(`${path}.gz`) ? gunzipSync(readFileSync(`${path}.gz`)).toString('utf8') : '');
const lines = <T, >(path: string): T[] => read(path).split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as T);
/** Split a per-frame dump into runs on `frame` returning to 1. */
function runsOf(rows: Frame[]): Frame[][] {
  const o: Frame[][] = [];
  let cur: Frame[] = [];
  for (const r of rows) {
    if (r.frame === 1 && cur.length) { o.push(cur); cur = []; }
    cur.push(r);
  }
  if (cur.length) o.push(cur);
  return o;
}
const armNames = () => (ARMS.length ? ARMS : []);

// ------------------------------------------------------------------ O. the frames with no face under the board
if (part('O')) {
  out('\n## O. The frames with NO face under the board, and the ride time with the face-less ones taken out');
  out('  (`faceFrac ≤ 0.001` is 3.4g\'s own test; past the trough `FaceWater` is flat to the last bit and still to the last bit [R])');
  out(['arm', 'frames', 'runs', 'off-face %', 'ident. resid', 'their aheadFronts', 'behind crest', 'matched 0.2–0.7 s'].map((s, i) => pad(s, i ? 14 : 18)).join(''));
  const keep: { name: string; rows: Frame[]; runs: Frame[][] }[] = [];
  for (const name of armNames()) {
    const rows = lines<Frame>(`${DIR}/${name}.mount.jsonl`);
    if (!rows.length) { out(`  ${name}: no dump`); continue; }
    const runs = runsOf(rows);
    keep.push({ name, rows, runs });
    let resid = 0;
    for (const r of rows) resid = Math.max(resid, Math.abs((r.aheadFronts < 0 ? 1 : 1 - smooth(r.aheadFronts)) - r.faceFrac));
    const off = rows.filter((r) => r.faceFrac <= 0.001);
    const win = rows.filter((r) => r.t >= 0.2 && r.t < 0.7);
    out([name, `${rows.length}`, `${runs.length}`, `${f((100 * off.length) / rows.length)} %`, resid.toExponential(1),
      off.length ? `${f(Math.min(...off.map((r) => r.aheadFronts)), 3)}–${f(Math.max(...off.map((r) => r.aheadFronts)), 3)}` : '–',
      `${off.filter((r) => r.aheadFronts < 0).length}`,
      win.length ? `${win.filter((r) => r.faceFrac <= 0.001).length} of ${win.length}` : '–',
    ].map((s, i) => pad(s, i ? 14 : 18)).join(''));
  }
  out('');
  out(['arm', 'runs off face', 'own duration off', 'ends off face', 'drift m/s', 'room m', '1st off, med s'].map((s, i) => pad(s, i ? 18 : 18)).join(''));
  for (const { name, runs } of keep) {
    const shares: number[] = [];
    const firsts: number[] = [];
    const rates: number[] = [];
    let nOff = 0;
    let endsOff = 0;
    const slope = Number(/s(\d+)/.exec(name)?.[1] ?? 16);
    const front = (1.5 * 1.4) / Math.tan(slope / DEG);
    for (const run of runs) {
      const o = run.filter((r) => r.faceFrac <= 0.001);
      shares.push(o.length / run.length);
      if (o.length) { nOff += 1; firsts.push(o[0].t); }
      if (run[run.length - 1].faceFrac <= 0.001) endsOff += 1;
      for (let i = 1; i < run.length; i += 1) {
        const dt = run[i].t - run[i - 1].t;
        if (dt > 1e-9) rates.push(((run[i].aheadFronts - run[i - 1].aheadFronts) / dt) * front);
      }
    }
    const a0 = runs[0][0].aheadFronts;
    out([name, `${nOff} of ${runs.length}`, `${f(100 * q(shares, 0.5))} %`, `${endsOff} of ${runs.length}`,
      f(q(rates, 0.5), 3), f((1 - a0) * front, 2), firsts.length ? f(q(firsts, 0.5), 3) : '–',
    ].map((s, i) => pad(s, i ? 18 : 18)).join(''));
  }
}

// ------------------------------------------------------------------ R. the falls
if (part('R')) {
  out('\n## R. The falls, both conventions, with each arm\'s own frame-1 geometry and its on-face time');
  out(['arm', 'frame 1: faceFrac', 'along °', 'tilt °', 'runs', 'fell', 'median s', 'ON-FACE med s', 'Compress fell', 'Compress med s'].map((s, i) => pad(s, i ? 15 : 18)).join(''));
  for (const name of armNames()) {
    const summary = lines<Run>(`${DIR}/${name}.jsonl`);
    const rows = lines<Frame>(`${DIR}/${name}.mount.jsonl`);
    if (!summary.length) { out(`  ${name}: no summary`); continue; }
    const runs = rows.length ? runsOf(rows) : [];
    const first = runs.map((r) => r[0]);
    const end = (r: Run) => (r.fell ? r.fellAt : 9);
    // The on-face time: the first off-face frame's own `t`, or the ride's own end if the board never leaves the face.
    const onFace = summary.map((r, i) => {
      const run = runs[i];
      if (!run) return Number.NaN;
      const o = run.find((x) => x.faceFrac <= 0.001);
      return o ? o.t : end(r);
    });
    const cm = summary.filter((r) => r.stance === 'compress');
    const psi = first.length ? Math.abs(q(first.map((r) => r.headOff), 0.5)) : 45;
    const tilt = first.length ? q(first.map((r) => Math.abs(r.tilt)), 0.5) : Number.NaN;
    const along = Math.atan(Math.tan(tilt / DEG) / Math.sin(psi / DEG)) * DEG;
    out([name, f(first.length ? q(first.map((r) => r.faceFrac), 0.5) : Number.NaN, 4), f(along, 2), f(tilt, 2),
      `${summary.length}`, `${summary.filter((r) => r.fell).length}`, f(q(summary.map(end), 0.5), 3),
      f(q(onFace, 0.5), 3), `${cm.filter((r) => r.fell).length} of ${cm.length}`, f(q(cm.map(end), 0.5), 3),
    ].map((s, i) => pad(s, i ? 15 : 18)).join(''));
  }
  out('\n  and every run of every arm, because a median over a bimodal population is a knife edge:');
  for (const name of armNames()) {
    const summary = lines<Run>(`${DIR}/${name}.jsonl`);
    const rows = lines<Frame>(`${DIR}/${name}.mount.jsonl`);
    if (!summary.length) continue;
    const runs = rows.length ? runsOf(rows) : [];
    const cells = summary.map((r, i) => {
      const run = runs[i];
      const o = run?.find((x) => x.faceFrac <= 0.001);
      const t = r.fell ? r.fellAt : 9;
      return `${(r.extra ?? r.entryAsked ?? 0).toString()}:${t.toFixed(2)}${o ? `/${o.t.toFixed(2)}` : ''}`;
    });
    out(`  ${pad(name, 18)} ${cells.join(' ')}`);
  }
}
