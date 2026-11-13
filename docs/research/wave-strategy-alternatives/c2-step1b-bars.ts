/**
 * C2 step 1b's bars (2026-11-13; c2-step1b.md): the BRL3 cases through `WaveLibrary`, no game, no sea.
 *   L1 the stored frames reproduced; L2 leave-one-out along a key; L3 the path monotone near the break; L4 T5 against
 *   today's library (BRL2, `ProfileLibrary`); L6 determinism; the cost of a slice's blend; the coverage of the pool's
 *   slices (t5-sea-probe.ts --keys-out) by the state matching, on the BRL3 cases' paths and on scout paths
 *   (c2_scout_paths.py).
 * Run from the repository's root:
 *   npx rolldown docs/research/wave-strategy-alternatives/c2-step1b-bars.ts -o <scratch>/bars.mjs --format esm --platform node
 *   node <scratch>/bars.mjs --cases DIR [--c2 FILE.json.gz …] [--t5 FILE.bin --t5-brl2 FILE.bin] [--keys FILE.json[.gz]] [--hd Hd15]
 *     [--paths FILE.json …] [--cost]
 * The coverage as written up: --keys c2-step1b-keys-rows.json.gz --hd Hd15 --paths c2-step1b-scout-paths.json (here).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { C2File } from '../../../src/wave/library/caseFromC2';
import { decodeCase } from '../../../src/wave/barrel/profileFormat';
import { ProfileLibrary } from '../../../src/wave/barrel/ProfileLibrary';
import { GRAVITY } from '../../../src/wave/dispersion';
import { decodeWaveCase, encodeWaveCase, PATH, PATH_COLUMNS, WAVE_LANDMARK, WAVE_POINTS, type WaveCase } from '../../../src/wave/library/caseFormat';
import { StateMatcher, WaveLibrary, type CasePath, type HandoverState, type Slice } from '../../../src/wave/library/WaveLibrary';

const argv = process.argv;
const all = (name: string) => argv.flatMap((a, i) => (a === `--${name}` && i + 1 < argv.length ? [argv[i + 1]] : []));
const one = (name: string) => all(name)[0];
const FLOATS = 2 * WAVE_POINTS;
const q = (v: number[], p: number) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : Number.NaN; };
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const pct = (n: number, of: number) => `${of > 0 ? ((100 * n) / of).toFixed(1) : '—'} %`;

const caseDir = one('cases');
const files = caseDir ? readdirSync(caseDir).filter((n) => n.endsWith('.bin')).sort().map((n) => `${caseDir}/${n}`) : [];
const cases: WaveCase[] = files.map((p) => decodeWaveCase(new Uint8Array(readFileSync(p))));
const onBed = cases.filter((c) => c.header.level >= 12 && c.header.id.includes('pool-c2-'));
console.log(`cases: ${cases.map((c) => `${c.header.id} (A0 ${c.header.a0.toFixed(3)}, S ${c.header.slope}, HS ${c.header.reefDepth}, ${c.header.frames} frames)`).join('; ')}`);

/** Distance from (x, y) to the polyline `p` (128 points), any units. */
function toCurve(p: ArrayLike<number>, x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i + 1 < WAVE_POINTS; i += 1) {
    const ax = p[2 * i], ay = p[2 * i + 1], ex = p[2 * i + 2] - ax, ey = p[2 * i + 3] - ay;
    const len = ex * ex + ey * ey;
    const u = len > 0 ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / len)) : 0;
    const dx = ax + u * ex - x, dy = ay + u * ey - y;
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** H (the crest over the lowest water within 3 h0 ahead) and the crest's x, from a profile in h0. */
function heightOf(p: ArrayLike<number>, scale = 1): { H: number; x: number } {
  const cx = p[2 * WAVE_LANDMARK.crest], cy = p[2 * WAVE_LANDMARK.crest + 1];
  let low = Number.POSITIVE_INFINITY;
  for (let k = WAVE_LANDMARK.crest; k < WAVE_POINTS; k += 1) if (p[2 * k] >= cx && p[2 * k] <= cx + 3 * scale) low = Math.min(low, p[2 * k + 1]);
  return { H: cy - low, x: cx };
}

// ---------------------------------------------------------------- L1
console.log('\n## L1: each stored "own" frame reproduced (m at the case\'s own h0)');
const sources = new Map<string, C2File>();
for (const p of all('c2')) {
  const raw = readFileSync(p);
  const c2 = JSON.parse((p.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8')) as C2File;
  sources.set(c2.run.toLowerCase().replaceAll('_', '-'), c2);
}
for (const c of cases) {
  const lib = new WaveLibrary([c]);
  const h = c.header;
  const out = new Float64Array(FLOATS);
  const src = sources.get(h.id);
  // (1) The library's frame at each own frame's τ against c2_library.py's profile (re-origined), if the file was given.
  let worstJson = Number.NaN;
  if (src) {
    worstJson = 0;
    src.frames.forEach((frame, k) => {
      if (c.use[k] !== 1 || !frame.profile) return;
      lib.caseFrameAt(0, h.tauStart + k * h.tauStep, out);
      for (let i = 0; i < WAVE_POINTS; i += 1) worstJson = Math.max(worstJson, Math.hypot(out[2 * i] - (frame.profile[i][0] - h.origin), out[2 * i + 1] - frame.profile[i][1]) * h.h0);
    });
  }
  // (2) Through a slice matched on the case's own state at τ −7 (5 s before the throw at 5 m), at its own h0: every own
  // frame from there on at its time, t = (τ − τ_h) √(h0/g).
  const path = lib.cases[0].path;
  const k0 = Math.max(0, Math.round((-7 - h.tauStart) / h.tauStep));
  const m = lib.matcher.matchCase(0, path.Hd[k0]);
  const d = m.depth;
  const slice = lib.slice({ heightOverDepth: path.Hd[k0], period: h.period / Math.sqrt(d), slope: h.slope, reefDepth: h.reefDepth, depth: d * h.h0, time: 0 });
  const surface = new Float32Array(FLOATS);
  let worstSlice = 0, n = 0;
  for (let k = 0; k < h.frames; k += 1) {
    const tau = h.tauStart + k * h.tauStep;
    if (c.use[k] !== 1 || tau < slice.tauH[0]) continue;
    n += 1;
    lib.surfaceAt(slice, (tau - slice.tauH[0]) * slice.unit, surface);
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      const x = (c.frames[k * FLOATS + 2 * i] - slice.crestH[0]) * slice.h0, y = c.frames[k * FLOATS + 2 * i + 1] * slice.h0;
      worstSlice = Math.max(worstSlice, Math.hypot(surface[2 * i] - x, surface[2 * i + 1] - y));
    }
  }
  const worst = Math.max(Number.isFinite(worstJson) ? worstJson : 0, worstSlice);
  console.log(`${h.id}: against c2_library.py's file ${src ? `${f(worstJson * 1000, 3)} mm` : '(not given)'}; through a slice matched at τ ${f(path.tau[k0], 2)} (τ_h ${f(slice.tauH[0], 3)}, h0 ${f(slice.h0, 4)} m), ${n} own frames at their times: ${f(worstSlice * 1000, 3)} mm; bar 5 mm: ${worst <= 0.005 ? 'PASS' : 'MISS'}; ${lib.cases[0].refilled} refill frames rebuilt, ${lib.cases[0].filledVelocity} of ${c.velocity.length} velocity values filled`);
}

// ---------------------------------------------------------------- L3
console.log('\n## L3: the path near the break (smoothed ±0.25 as c2_library.py; share of steps the wrong way)');
for (const c of cases) {
  const h = c.header;
  const tau: number[] = [], d: number[] = [], hd: number[] = [];
  for (let k = 0; k < h.frames; k += 1) {
    const r = k * PATH_COLUMNS;
    if (c.path[r + PATH.tau] < 0) { tau.push(c.path[r + PATH.tau]); d.push(c.path[r + PATH.d]); hd.push(c.path[r + PATH.Hd]); }
  }
  const wrong = (v: number[], from: number, sign: 1 | -1) => {
    const idx = tau.map((t, i) => [t, i] as const).filter(([t]) => t >= from).map(([, i]) => i);
    const sm = idx.map((i) => { let s = 0, n = 0; for (let j = 0; j < tau.length; j += 1) if (Math.abs(tau[j] - tau[i]) <= 0.25 + 1e-9 && Number.isFinite(v[j])) { s += v[j]; n += 1; } return s / n; });
    let bad = 0, worst = 0;
    for (let i = 0; i + 1 < sm.length; i += 1) { const step = (sm[i + 1] - sm[i]) * sign; if (step < 0) { bad += 1; worst = Math.max(worst, -step); } }
    return `${pct(bad, sm.length - 1)} (largest ${f(worst, 5)})`;
  };
  console.log(`${h.id}: τ −8..0: d ${wrong(d, -8, -1)}, H/d ${wrong(hd, -8, 1)}; τ −4..0: d ${wrong(d, -4, -1)}, H/d ${wrong(hd, -4, 1)}`);
}

// ---------------------------------------------------------------- L4
const t5Path = one('t5');
// --t5-brl2 FILE (repeatable): today's game case (public/barrels/periodic-pool-straight-big-l13.bin, the bar) and T5's own
// BRL2 file (docs/research/pool-tube-runs-t5/barrels/, a check of the format path alone).
for (const t5Old of t5Path ? all('t5-brl2') : []) {
  console.log(`\n## L4: T5 through the new library against ${t5Old.split('/').at(-1)} through today's (BRL2 + ProfileLibrary), at 4.5 m`);
  const c = decodeWaveCase(new Uint8Array(readFileSync(t5Path)));
  const h = c.header;
  const lib = new WaveLibrary([c]);
  const old = decodeCase(new Uint8Array(readFileSync(t5Old)));
  const today = new ProfileLibrary([old]);
  const unit = Math.sqrt(h.h0 / GRAVITY);
  const profile = new Float32Array(FLOATS);
  const fresh = new Float64Array(FLOATS);
  const rows: Array<{ tau: number; dH: number; dx: number; dxPath: number; Hold: number; Hnew: number }> = [];
  const count = old.frames.length / FLOATS;
  for (let k = 0; k < count; k += 1) {
    const tau = old.tauStart + k * old.tauStep;
    if (tau > old.touchdown + 1e-9) break;
    today.profileAt({ slope: old.slope, footHeight: old.nonlinearity * h.h0, footDepth: h.h0, seconds: tau * unit }, profile);
    const a = heightOf(profile, h.h0);
    lib.caseFrameAt(0, tau, fresh);
    const b = heightOf(fresh, 1);
    const position = (tau - h.tauStart) / h.tauStep;
    const f0 = Math.max(0, Math.floor(position));
    const cx = lib.cases[0].crestX[f0] + (position - f0) * (lib.cases[0].crestX[Math.min(h.frames - 1, f0 + 1)] - lib.cases[0].crestX[f0]);
    rows.push({ tau, dH: (b.H * h.h0) / a.H - 1, dx: b.x * h.h0 - a.x, dxPath: cx * h.h0 - a.x, Hold: a.H, Hnew: b.H * h.h0 });
  }
  const before = (lo: number, hi: number) => rows.filter((r) => r.tau >= lo && r.tau < hi);
  for (const [lo, hi, name] of [[-8, -7.39, 'τ −8 to −7.4 (BRL2\'s crest on the wave ahead)'], [-7.39, -1.4, 'τ −7.375 to −1.4'], [-1.4, 0, 'τ −1.4 to 0 (the last 0.95 s)'], [0, 9, 'the throw to touchdown']] as const) {
    const r = before(lo, hi);
    if (!r.length) continue;
    const worstH = r.reduce((m, x) => (Math.abs(x.dH) > Math.abs(m.dH) ? x : m));
    const worstX = r.reduce((m, x) => (Math.abs(x.dx) > Math.abs(m.dx) ? x : m));
    console.log(`${name}: ${r.length} frames; H differs by ${f(100 * q(r.map((x) => Math.abs(x.dH)), 0.5), 2)} % median, at most ${f(100 * worstH.dH, 2)} % (τ ${f(worstH.tau, 3)}); crest place by ${f(q(r.map((x) => Math.abs(x.dx)), 0.5), 3)} m median, at most ${f(worstX.dx, 3)} m (τ ${f(worstX.tau, 3)}); frames over 2 % in H ${r.filter((x) => Math.abs(x.dH) > 0.02).length}, over 0.5 m in place ${r.filter((x) => Math.abs(x.dx) > 0.5).length} (by the path's crest ${r.filter((x) => Math.abs(x.dxPath) > 0.5).length})`);
  }
}

// ---------------------------------------------------------------- L2
console.log('\n## L2: leave one out (each held-out case predicted from the rest, from its own state at the hand-over)');
/** Drop `out` from `pool`; predict it from its own state at τ_h; compare surfaces over its frames. */
function leaveOneOut(pool: WaveCase[], heldIndex: number, tauHand: number, only?: WaveCase[]): string {
  const held = pool[heldIndex];
  const rest = only ?? pool.filter((_, i) => i !== heldIndex);
  const h = held.header;
  const truthLib = new WaveLibrary([held]);
  const lib = new WaveLibrary(rest);
  const k0 = Math.round((tauHand - h.tauStart) / h.tauStep);
  const tp = truthLib.cases[0];
  const d = tp.path.d[k0];
  const state: HandoverState = { heightOverDepth: tp.path.Hd[k0], period: h.period / Math.sqrt(d), slope: h.slope, reefDepth: h.reefDepth, depth: d * h.h0, time: 0 };
  const slice = lib.slice(state);
  const unit = Math.sqrt(h.h0 / GRAVITY);
  const truth = new Float64Array(FLOATS);
  const truthM = new Float64Array(FLOATS);
  const pred = new Float32Array(FLOATS);
  const crest = new Float64Array(2);
  const crest0 = tp.crestX[k0];
  const phases: Record<string, number[]> = { pre: [], open: [], after: [] };
  const phasesReg: Record<string, number[]> = { pre: [], open: [], after: [] };
  const crestGap: number[] = [];
  const hGap: number[] = [];
  const touchdown = h.touchdown;
  for (let k = k0; k < h.frames; k += 1) {
    const tau = h.tauStart + k * h.tauStep;
    if (tau > touchdown + 3) break;
    const phase = tau < 0 ? 'pre' : tau <= touchdown ? 'open' : 'after';
    truthLib.caseFrameAt(0, tau, truth);
    for (let i = 0; i < WAVE_POINTS; i += 1) { truthM[2 * i] = (truth[2 * i] - crest0) * h.h0; truthM[2 * i + 1] = truth[2 * i + 1] * h.h0; }
    // (a) at the same time since the hand-over
    // The wave only: points from 2 h0 behind the truth's crest to 3 h0 ahead of it (the ends of the frames are the runs'
    // windows, which differ from case to case).
    const cxTruth = (tp.crestX[k] - crest0) * h.h0;
    const near = (x: number) => x >= cxTruth - 2 * h.h0 && x <= cxTruth + 3 * h.h0;
    lib.surfaceAt(slice, (tau - tauHand) * unit, pred, crest);
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      if (near(pred[2 * i])) phases[phase].push(toCurve(truthM, pred[2 * i], pred[2 * i + 1]));
      if (near(truthM[2 * i])) phases[phase].push(toCurve(pred, truthM[2 * i], truthM[2 * i + 1]));
    }
    crestGap.push(crest[0] - (tp.crestX[k] - crest0) * h.h0);
    const a = heightOf(pred, slice.h0), b = heightOf(truthM, h.h0);
    hGap.push(a.H / b.H - 1);
    // (b) registered on the throw: the prediction at the same τ of its own throw, its crest put on the truth's
    lib.surfaceAt(slice, lib.throwTime(slice) + tau * slice.unit, pred, crest);
    const shift = (tp.crestX[k] - crest0) * h.h0 - crest[0];
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      if (near(pred[2 * i] + shift)) phasesReg[phase].push(toCurve(truthM, pred[2 * i] + shift, pred[2 * i + 1]));
      if (near(truthM[2 * i])) phasesReg[phase].push(toCurve(pred, truthM[2 * i] - shift, truthM[2 * i + 1]));
    }
  }
  const w = slice.match.cases.map((c) => `${lib.cases[c.case].id} ${f(c.weight)} from τ ${f(c.tauH, 2)}`).join(' + ');
  const line = (r: Record<string, number[]>) => Object.entries(r).map(([k, v]) => `${k} p90 ${f(q(v, 0.9) * 100, 1)} cm (≤ 2 cm: ${pct(v.filter((x) => x <= 0.02).length, v.length)})`).join(', ');
  const allPts = [...phases.pre, ...phases.open];
  return `${h.id} from τ ${tauHand} (H/d ${f(state.heightOverDepth)}, d ${f(d)} h0): ${w}; h0 ${f(slice.h0, 3)} m, throw ${f(lib.throwTime(slice), 2)} s vs its own ${f(-tauHand * unit, 2)} s\n` +
    `   same time: ${line(phases)}; to touchdown p90 ${f(q(allPts, 0.9) * 100, 1)} cm, bar ${q(allPts, 0.9) <= 0.02 ? 'PASS' : 'MISS'}; crest place gap p90 ${f(q(crestGap.map(Math.abs), 0.9), 2)} m; H gap p90 ${f(100 * q(hGap.map(Math.abs), 0.9), 1)} %\n` +
    `   on the throw, crest on crest: ${line(phasesReg)}`;
}
if (onBed.length >= 3) {
  // Along the slope: a case with a neighbour on each side at the same A0 row.
  const rows = new Map<string, WaveCase[]>();
  for (const c of onBed) { const row = c.header.id.replace(/.*_?(a\d)-l\d+$/, '$1').replace(/.*-(a\d)-.*/, '$1'); rows.set(row, [...(rows.get(row) ?? []), c]); }
  for (const [row, list] of rows) {
    const sorted = [...list].sort((a, b) => a.header.slope - b.header.slope);
    for (let i = 1; i + 1 < sorted.length; i += 1) {
      for (const tauHand of [-7, -4]) {
        console.log(`slope, row ${row}: ${leaveOneOut(sorted, i, tauHand)}`);
        // The baseline: each neighbour alone (no blend), from the same state.
        for (const alone of [sorted[i - 1], sorted[i + 1]]) console.log(`   baseline, ${alone.header.id} alone: ${leaveOneOut(sorted, i, tauHand, [alone]).split('\n')[1].trim()}`);
      }
    }
  }
  // Along A0: a case with a neighbour on each side on the same bed.
  const beds = new Map<string, WaveCase[]>();
  for (const c of onBed) { const bed = `${c.header.slope}/${c.header.reefDepth}`; beds.set(bed, [...(beds.get(bed) ?? []), c]); }
  for (const [bed, list] of beds) {
    const sorted = [...list].sort((a, b) => a.header.a0 - b.header.a0);
    for (let i = 1; i + 1 < sorted.length; i += 1) for (const tauHand of [-7, -4]) console.log(`A0, bed ${bed}: ${leaveOneOut(sorted, i, tauHand)}`);
    if (sorted.length < 3) console.log(`A0, bed ${bed}: ${sorted.length} case(s) finished, no pair to test`);
  }
} else console.log('fewer than three level-12 C2 cases: no pair to test');

// ---------------------------------------------------------------- L6
if (files.length > 0) {
  console.log('\n## L6: determinism');
  const hash = (chunks: Array<Float32Array | Float64Array>) => {
    let x = 0x811c9dc5;
    for (const c of chunks) for (const b of new Uint8Array(c.buffer, c.byteOffset, c.byteLength)) x = Math.imul(x ^ b, 0x01000193) >>> 0;
    return x.toString(16).padStart(8, '0');
  };
  const runOnce = () => {
    const lib = new WaveLibrary(files.map((p) => decodeWaveCase(new Uint8Array(readFileSync(p)))));
    const chunks: Array<Float32Array | Float64Array> = [];
    for (let s = 0; s < 200; s += 1) {
      const slice = lib.slice({ heightOverDepth: 0.2 + 0.002 * s, period: 15 + 0.01 * s, slope: 0.04 + 0.0003 * s, reefDepth: 0.2, depth: 4.6 - 0.002 * s, time: 0 });
      for (let k = 0; k < 10; k += 1) {
        const out = new Float32Array(FLOATS);
        lib.surfaceAt(slice, 0.5 * k, out);
        chunks.push(out, Float64Array.from(lib.velocityAt(slice, 0.5 * k, 64, 0.2, new Float64Array(2))));
      }
    }
    return hash(chunks);
  };
  const a = runOnce(), b = runOnce();
  const reencoded = files.every((p) => { const bytes = new Uint8Array(readFileSync(p)); const again = encodeWaveCase(decodeWaveCase(bytes)); return again.length === bytes.length && again.every((v, i) => v === bytes[i]); });
  console.log(`2000 surfaces and velocities over 200 slices, twice: ${a} / ${b} ${a === b ? 'PASS' : 'MISS'}; every file re-encodes byte for byte: ${reencoded ? 'PASS' : 'MISS'}`);
}

// ---------------------------------------------------------------- cost
if (argv.includes('--cost') && onBed.length > 0) {
  console.log('\n## Cost: 600 slices, each a blend of 4 cases (2 slopes × 2 A0)');
  // Two A0 rows from the finished cases: each case, and a copy of it as a smaller case (H/d 0.12 lower, A0 0.25).
  const copies = onBed.slice(0, 2).flatMap((c) => {
    const path = c.path.slice();
    for (let k = 0; k < c.header.frames; k += 1) path[k * PATH_COLUMNS + PATH.Hd] -= 0.12;
    return [c, { ...c, header: { ...c.header, id: `${c.header.id}-low`, a0: 0.25 }, path }];
  });
  const lib = new WaveLibrary(copies);
  const s0 = Math.min(...copies.map((c) => c.header.slope)), s1 = Math.max(...copies.map((c) => c.header.slope));
  // The states: a period that puts the slice between each bed's two rows (the most 4-case blends of a few tried).
  const stateAt = (s: number, period: number): HandoverState => ({ heightOverDepth: 0.45 + 0.0002 * s, period, slope: s0 + (s1 - s0) * (0.2 + 0.001 * s), reefDepth: 0.2, depth: 4.4, time: 0 });
  let period = 15;
  let most = -1;
  for (let p = 14.75; p <= 15.6; p += 0.05) {
    let n = 0;
    for (let s = 0; s < 600; s += 10) if (lib.slice(stateAt(s, p)).n === 4) n += 1;
    if (n > most) { most = n; period = p; }
  }
  const slices: Slice[] = [];
  let t0 = performance.now();
  for (let s = 0; s < 600; s += 1) slices.push(lib.slice(stateAt(s, period)));
  const matchUs = ((performance.now() - t0) * 1000) / 600;
  const fours = slices.filter((s) => s.n === 4).length;
  const out = new Float32Array(FLOATS);
  const vel = new Float64Array(2);
  const steps = 200;
  for (let rep = 0; rep < 2; rep += 1) { // the first round warms the JIT
    t0 = performance.now();
    for (let step = 0; step < steps; step += 1) for (const s of slices) lib.surfaceAt(s, step / 30, out);
    const surfaceUs = ((performance.now() - t0) * 1000) / (steps * slices.length);
    t0 = performance.now();
    for (let step = 0; step < steps; step += 1) for (const s of slices) lib.velocityAt(s, step / 30, 70, 0.3, vel);
    const velUs = ((performance.now() - t0) * 1000) / (steps * slices.length);
    // The 4-case slices alone, repeated to 600.
    const four = slices.filter((x) => x.n === 4);
    t0 = performance.now();
    for (let step = 0; step < steps; step += 1) for (let k = 0; k < 600; k += 1) lib.surfaceAt(four[k % four.length], step / 30, out);
    const fourUs = ((performance.now() - t0) * 1000) / (steps * 600);
    if (rep === 1) console.log(`4-case slices alone: a surface ${f(fourUs, 2)} µs a slice, ${f((fourUs * 600) / 1000, 2)} ms a step for 600`);
    if (rep === 1) console.log(`${fours} of 600 slices blend 4 cases; the match at the hand-over ${f(matchUs, 1)} µs a slice (once); a surface (128 points) ${f(surfaceUs, 2)} µs a slice, so ${f((surfaceUs * 600) / 1000, 2)} ms a step for 600; one velocity sample ${f(velUs, 3)} µs`);
  }
}

// ---------------------------------------------------------------- coverage
const keysFile = one('keys');
if (keysFile) {
  interface Row { dH: number; S: number; HS: number; Hd: number; Hd15?: number; deep: number; a0: number; s: number; t: number; seaH: number }
  // `--hd Hd15`: H over the lowest water within 15 m shoreward (the cases' 3 h0 at 5 m); Hd: within 3 × the game's h0.
  const hdKey = (one('hd') ?? 'Hd') as 'Hd' | 'Hd15';
  const keysRaw = readFileSync(keysFile);
  const dump = JSON.parse((keysFile.endsWith('.gz') ? gunzipSync(keysRaw) : keysRaw).toString('utf8')) as { components: Array<{ amplitude: number; period: number }>; rows: Record<string, Row[]> };
  const top = [...dump.components].sort((a, b) => b.amplitude - a.amplitude)[0];
  const period = Number(one('period') ?? top.period);
  const PLATFORM = Number(one('platform') ?? 5);
  console.log(`\n## Coverage: the pool's slices (${keysFile}); T ${f(period, 2)} s (${dump.components.length} components, the largest's${one('period') ? ', overridden' : ''}), HS/h0 over the ${PLATFORM} m platform; H/d_h as ${hdKey}`);
  const sets: Array<[string, CasePath[]]> = [];
  if (cases.length) {
    const lib = new WaveLibrary(onBed.length ? onBed : cases);
    sets.push([`the finished level-12 cases' paths (${lib.cases.map((c) => c.id).join(', ')})`, lib.cases.map((c) => c.path)]);
  }
  for (const p of all('paths')) {
    const raw = JSON.parse(readFileSync(p, 'utf8')) as Array<{ id: string; a0: number; slope: number; reefDepth: number; period: number; tau: number[]; d: number[]; Hd: number[] }>;
    sets.push([`scout paths ${p.split('/').at(-1)} (${raw.map((r) => `${r.id.replace('periodic_pool_c2_', '').replace('_scout_L10', '')} A0 ${r.a0.toFixed(3)}`).join(', ')})`,
      raw.map((r) => ({ id: r.id, a0: r.a0, slope: r.slope, reefDepth: r.reefDepth, period: r.period, tau: Float64Array.from(r.tau), d: Float64Array.from(r.d), Hd: Float64Array.from(r.Hd) }))]);
  }
  for (const [name, paths] of sets) {
    const m = new StateMatcher(paths);
    console.log(`\n${name}`);
    for (const [delta, rows] of Object.entries(dump.rows)) {
      const tally: Record<string, number> = {};
      const add = (k: string) => { tally[k] = (tally[k] ?? 0) + 1; };
      const offs: number[] = [], h0s: number[] = [], lows: number[] = [], toThrow: number[] = [], keys: number[] = [];
      const thirds: Array<{ s: number; low: boolean; key: number }> = [];
      let n = 0;
      let tauWeight = 0;
      for (const r of rows) {
        const hdv = r[hdKey] ?? Number.NaN;
        if (!(r.dH > 0) || !Number.isFinite(hdv) || !Number.isFinite(r.S)) { add('skipped'); continue; }
        n += 1;
        const state: HandoverState = { heightOverDepth: hdv, period: period * Math.sqrt(GRAVITY / r.dH), slope: r.S, reefDepth: r.HS / PLATFORM, depth: r.dH, time: 0 };
        const match = m.match(state);
        if (r.dH >= 0.99 * PLATFORM) add('platform');
        add(`slope ${match.clamp.slope}`);
        add(`HS ${match.clamp.reefDepth}`);
        add(`A0 ${match.clamp.a0}`);
        if (match.a0Low > 0) add('A0 low (any weight)');
        if (match.a0High > 0) add('A0 high (any weight)');
        if (match.cases.some((c) => c.tauClamp !== 0 && c.weight > 0)) add('τ clamped in a used case');
        tauWeight += match.cases.reduce((sum, c) => sum + (c.tauClamp !== 0 ? c.weight : 0), 0);
        lows.push(match.a0Low);
        offs.push(match.reefOff);
        h0s.push(match.h0);
        toThrow.push(match.toThrow * Math.sqrt(match.h0 / GRAVITY));
        keys.push(match.a0Key);
        thirds.push({ s: r.s, low: match.a0Low > 0, key: match.a0Key });
      }
      const share = (k: string) => pct(tally[k] ?? 0, n);
      const cuts = [q(thirds.map((x) => x.s), 0), q(thirds.map((x) => x.s), 1 / 3), q(thirds.map((x) => x.s), 2 / 3), q(thirds.map((x) => x.s), 1) + 1e-6];
      const byThird = [0, 1, 2].map((k) => { const part = thirds.filter((x) => x.s >= cuts[k] && x.s < cuts[k + 1]); return `s ${f(cuts[k], 0)}–${f(cuts[k + 1], 0)} m: A0 low ${pct(part.filter((x) => x.low).length, part.length)}, A0 ${f(q(part.map((x) => x.key), 0.5))}`; }).join('; ');
      const under = (a: number) => pct(keys.filter((x) => x < a).length, keys.length);
      console.log(`Δ ${delta} s: the slices' A0 read off the cases (extrapolated past the smallest) ${f(q(keys, 0.5))} median (${f(q(keys, 0.1))}–${f(q(keys, 0.9))}; 1 % ${f(q(keys, 0.01))}); under 0.15 ${under(0.15)}, under 0.12 ${under(0.12)}, under 0.10 ${under(0.1)} | ${byThird}`);
      console.log(`Δ ${delta} s: n ${n}${tally.skipped ? ` (${tally.skipped} skipped)` : ''} | slope low ${share('slope low')}, high ${share('slope high')} | HS off its bed ${pct((tally['HS one'] ?? 0) + (tally['HS low'] ?? 0) + (tally['HS high'] ?? 0), n)} (by ${f(q(offs, 0.5))} h0 median, ${f(q(offs, 0.9))} p90) | A0 low ${share('A0 low')} (any weight ${share('A0 low (any weight)')}, weight share ${f(100 * lows.reduce((a, b) => a + b, 0) / Math.max(1, n), 1)} %), high ${share('A0 high')} | τ clamped ${share('τ clamped in a used case')} (weight share ${f(100 * tauWeight / Math.max(1, n), 1)} %) | crest still on the platform ${share('platform')} | h0 ${f(q(h0s, 0.5), 2)} (${f(q(h0s, 0.1), 2)}–${f(q(h0s, 0.9), 2)}) m | hand-over to throw ${f(q(toThrow, 0.5), 2)} (${f(q(toThrow, 0.1), 2)}–${f(q(toThrow, 0.9), 2)}) s`);
    }
  }
}
