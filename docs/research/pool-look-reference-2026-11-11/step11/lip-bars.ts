/**
 * Step 11's bars L1 to L6 (ruling 23): the hand-thinned lip, measured on the case's frames before and after the cut.
 * The cut is the game's own function (`thinLip`, src/wave/barrel/lipThin.ts); the measures are `lip.mjs`'s
 * (docs/research/lip-look-2026-11-11/tools/lip.mjs), copied. No sea, no rider.
 *
 * Build: npx rolldown docs/research/pool-look-reference-2026-11-11/step11/lip-bars.ts -o dist/scripts/lip-bars11.mjs --format esm --platform node
 * Run:   node dist/scripts/lip-bars11.mjs > docs/research/pool-look-reference-2026-11-11/step11/lip-bars.txt
 */
import { readFileSync } from 'node:fs';
import { decodeCase } from '../../../../src/wave/barrel/profileFormat';
import { LANDMARK as L, PROFILE_POINTS as P, removeLoops, type BarrelCase } from '../../../../src/wave/barrel/ProfileLibrary';
import { LIP_THIN, thinLip } from '../../../../src/wave/barrel/lipThin';
import { overturnAt } from '../../../../src/wave/barrel/heldOverturn';

const F = 2 * P, G = 9.81;
const ID = 'periodic-pool-straight-big-l13';
const FOOT = 1.08;

function frameAt(c: BarrelCase, tau: number): Float64Array {
  const count = c.frames.length / F;
  const pos = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
  const f = Math.floor(pos), n = Math.min(count - 1, f + 1), s = pos - f;
  const out = new Float64Array(F);
  for (let i = 0; i < F; i++) out[i] = c.frames[f * F + i] + s * (c.frames[n * F + i] - c.frames[f * F + i]);
  return out;
}
function distToRun(p: ArrayLike<number>, i: number, from: number, to: number): number {
  const px = p[2 * i], py = p[2 * i + 1]; let best = Infinity;
  for (let k = from; k < to; k++) {
    const ax = p[2 * k], ay = p[2 * k + 1], dx = p[2 * k + 2] - ax, dy = p[2 * k + 3] - ay, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - ax - t * dx, py - ay - t * dy); if (d < best) best = d;
  }
  return best;
}
function arc(p: ArrayLike<number>, a: number, b: number): number { let s = 0; for (let k = a; k < b; k++) s += Math.hypot(p[2 * k + 2] - p[2 * k], p[2 * k + 3] - p[2 * k + 1]); return s; }
/** lip.mjs's measure, unchanged in what it reads. */
function measure(p: ArrayLike<number>) {
  const under = arc(p, L.lip, L.throat);
  const th: [number, number][] = [];
  let s = 0;
  for (let i = L.lip + 1; i < L.throat; i++) { s += Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]); th.push([s / (under || 1), distToRun(p, i, L.crest, L.lip)]); }
  const at = (u: number) => { if (!th.length || under <= 0) return 0; let b = th[0]; for (const e of th) if (Math.abs(e[0] - u) < Math.abs(b[0] - u)) b = e; return b[1]; };
  let area = 0;
  for (let i = L.crest; i <= L.throat; i++) { const j = i === L.throat ? L.crest : i + 1; area += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; }
  area = Math.abs(area) / 2;
  let trough = Infinity; for (let i = L.crest; i < P; i++) trough = Math.min(trough, p[2 * i + 1]);
  let top = -Infinity; for (let i = 0; i < P; i++) top = Math.max(top, p[2 * i + 1]);
  return { under, tRoot: at(0.9), tMid: at(0.5), tTip: at(0.15), area, H: top - trough, reach: p[2 * L.lip] - p[2 * L.throat] };
}
/** The turn at vertex i between its two neighbour segments, degrees; 0 where a segment has no length. */
function turnAt(p: ArrayLike<number>, o: number, i: number): number {
  const ax = p[o + 2 * i] - p[o + 2 * i - 2], ay = p[o + 2 * i + 1] - p[o + 2 * i - 1];
  const bx = p[o + 2 * i + 2] - p[o + 2 * i], by = p[o + 2 * i + 3] - p[o + 2 * i + 1];
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (!(la > 0 && lb > 0)) return 0;
  return Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) * 180 / Math.PI;
}

const f = (x: number, d = 3) => x.toFixed(d);
// `--held 0.2`: the stop rule's one retry (the held share lowered), for this print only; the game's constant is not written.
const heldArg = process.argv.indexOf('--held');
if (heldArg >= 0) (LIP_THIN as { held: number }).held = Number(process.argv[heldArg + 1]);
const stored = decodeCase(new Uint8Array(readFileSync(`public/barrels/${ID}.bin`)));
LIP_THIN.on = true;
const cut = thinLip(stored);
LIP_THIN.on = false;
const off = thinLip(stored);
LIP_THIN.on = true;
const h0 = FOOT / stored.nonlinearity, unit = Math.sqrt(h0 / G), td = stored.touchdown * unit;
const count = stored.frames.length / F;
const H0 = measure(frameAt(stored, 0)).H * h0;
console.log(`# step 11, the hand-thinned lip: ${ID} at foot ${FOOT} m`);
console.log(`points ${P} (crest ${L.crest}, lip ${L.lip}, throat ${L.throat}, toe ${L.toe}); frames ${count}, step ${f(stored.tauStep, 4)} units = ${f(stored.tauStep * unit, 4)} s, first ${f(stored.tauStart * unit, 2)} s`);
console.log(`h0 ${f(h0, 2)} m; time unit ${f(unit, 3)} s; touchdown ${f(td, 3)} s (${f(stored.touchdown, 4)} units); H at the throw ${f(H0, 2)} m`);
console.log(`the cut: ${LIP_THIN.cut} h0 = ${f(LIP_THIN.cut * h0, 3)} m; floor ${LIP_THIN.floor} h0 = ${f(LIP_THIN.floor * h0, 3)} m; whole to ${LIP_THIN.fullUntil} units = ${f(LIP_THIN.fullUntil * unit, 2)} s, held share ${LIP_THIN.held} from ${LIP_THIN.heldFrom} units = ${f(LIP_THIN.heldFrom * unit, 2)} s`);
console.log(`constant off: the case comes back as the same object: ${off === stored}`);

console.log('\n## the lip through the flight (lip.mjs\'s table), before -> after');
console.log('tau_s   under_m          t_root_m         t_mid_m          t_tip_m          mid/H            jet_m2             jet/H^2            reach_m');
const taus = [-0.2, -0.1, 0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, td - 0.001].filter((t) => t <= td).sort((a, b) => a - b);
const pair = (a: number, b: number, d = 3) => `${f(a, d)} -> ${f(b, d)}`.padEnd(17);
const rows = new Map<number, { a: ReturnType<typeof measure>; b: ReturnType<typeof measure> }>();
for (const t of taus) {
  const a = measure(frameAt(stored, t / unit)), b = measure(frameAt(cut, t / unit));
  rows.set(t, { a, b });
  console.log(`${f(t, 2).padStart(5)}   ${pair(a.under * h0, b.under * h0)}${pair(a.tRoot * h0, b.tRoot * h0)}${pair(a.tMid * h0, b.tMid * h0)}${pair(a.tTip * h0, b.tTip * h0)}${pair(a.tMid * h0 / H0, b.tMid * h0 / H0)}${pair(a.area * h0 * h0, b.area * h0 * h0, 4)}  ${pair(a.area * h0 * h0 / H0 / H0, b.area * h0 * h0 / H0 / H0, 4)}  ${pair(a.reach * h0, b.reach * h0)}`);
}

// How far the underside's line itself moved: each cut point's distance to the stored underside's line (64..88). A point
// that only slides along the underside reads 0 here, whatever its distance to the top run does.
console.log('\n## how far the underside moved across itself (cut points 65..87 to the stored underside line), m');
console.log('tau_s   largest  mean    | the points\' own move, largest | the top face 40..60 to the underside, mean (before -> after)');
for (const t of taus.filter((v) => v > 0)) {
  const a = frameAt(stored, t / unit), b = frameAt(cut, t / unit);
  let most = 0, sum = 0, own = 0;
  for (let i = L.lip + 1; i < L.throat; i++) {
    const merged = new Float64Array(F); merged.set(a); merged[2 * 0] = b[2 * i]; merged[1] = b[2 * i + 1];
    const d = distToRun(merged, 0, L.lip, L.throat); most = Math.max(most, d); sum += d;
    own = Math.max(own, Math.hypot(b[2 * i] - a[2 * i], b[2 * i + 1] - a[2 * i + 1]));
  }
  let ma = 0, mb = 0; for (let i = 40; i <= 60; i++) { ma += distToRun(a, i, L.lip, L.throat); mb += distToRun(b, i, L.lip, L.throat); }
  console.log(`${f(t, 2).padStart(5)}   ${f(most * h0)}    ${f(sum / 23 * h0)}   | ${f(own * h0)}                          | ${f(ma / 21 * h0)} -> ${f(mb / 21 * h0)}`);
}

// Per stored frame.
let untouchedDiffer = 0, preDiffer = 0, movedPoints = 0, movedFrames = 0, firstMoved = -1;
let grew = 0, underFloor = 0, worstGrow = 0, leastAfter = Infinity, mostCut = 0;
let turnBefore = 0, turnAfter = 0, turnOver = 0, turnOverAt = '', throatOver = 0, throatBefore = 0, throatAfter = 0, tipBefore = 0, tipAfter = 0, tipOver = 0;
const kinks: string[] = [];
let piled = 0, piledBefore = 0;
let folded = 0, moveBefore = 0, moveAfter = 0, moveOver = 0;
const bits = (a: Float32Array, i: number, b: Float32Array) => { const x = new Uint32Array(a.buffer, a.byteOffset, a.length), y = new Uint32Array(b.buffer, b.byteOffset, b.length); return x[i] === y[i]; };
for (let fr = 0; fr < count; fr++) {
  const o = fr * F, tau = stored.tauStart + fr * stored.tauStep;
  let any = false;
  for (let i = 0; i < P; i++) {
    const same = bits(stored.frames, o + 2 * i, cut.frames) && bits(stored.frames, o + 2 * i + 1, cut.frames);
    if (same) continue;
    if (i <= L.lip || i >= L.throat) untouchedDiffer++;
    if (!(tau > 0)) preDiffer++;
    any = true; movedPoints++;
  }
  if (any) { movedFrames++; if (firstMoved < 0) firstMoved = fr; }
  const a = stored.frames.subarray(o, o + F), b = cut.frames.subarray(o, o + F);
  for (let i = L.lip + 1; i < L.throat; i++) {
    const ta = distToRun(a, i, L.crest, L.lip), tb = distToRun(b, i, L.crest, L.lip);
    if (tb > ta + 1e-7) { grew++; worstGrow = Math.max(worstGrow, tb - ta); }
    if (ta > LIP_THIN.floor && tb < LIP_THIN.floor - 1e-6) underFloor++;
    if (ta > LIP_THIN.floor) leastAfter = Math.min(leastAfter, tb);
    mostCut = Math.max(mostCut, ta - tb);
    const xa = turnAt(a, 0, i), xb = turnAt(b, 0, i);
    turnBefore = Math.max(turnBefore, xa); turnAfter = Math.max(turnAfter, xb);
    if (xb - xa > turnOver) { turnOver = xb - xa; turnOverAt = `frame ${fr} (${f(tau * unit, 3)} s), point ${i}: ${f(xa, 1)} -> ${f(xb, 1)} deg`; }
  }
  {
    let worst = 0, at = 0, before = 0;
    for (let i = L.lip + 1; i < L.throat; i++) { const xa = turnAt(a, 0, i), xb = turnAt(b, 0, i); if (xb - xa > worst) { worst = xb - xa; at = i; before = xa; } }
    if (worst > 5) kinks.push(`frame ${fr} (${f(tau * unit, 3)} s) point ${at}: ${f(before, 1)} -> ${f(before + worst, 1)} deg`);
    for (let i = L.lip; i < L.throat; i++) {
      if (Math.hypot(b[2 * i + 2] - b[2 * i], b[2 * i + 3] - b[2 * i + 1]) * h0 < 0.001) piled++;
      if (Math.hypot(a[2 * i + 2] - a[2 * i], a[2 * i + 3] - a[2 * i + 1]) * h0 < 0.001) piledBefore++;
    }
  }
  if (tau > 0) {
    const ka = turnAt(a, 0, L.throat), kb = turnAt(b, 0, L.throat);
    throatBefore = Math.max(throatBefore, ka); throatAfter = Math.max(throatAfter, kb); throatOver = Math.max(throatOver, Math.abs(kb - ka));
    const pa = turnAt(a, 0, L.lip), pb = turnAt(b, 0, L.lip);
    tipBefore = Math.max(tipBefore, pa); tipAfter = Math.max(tipAfter, pb); tipOver = Math.max(tipOver, pb - pa);
  }
  for (let i = L.lip; i < L.throat; i++) {
    const ax = a[2 * i + 2] - a[2 * i], ay = a[2 * i + 3] - a[2 * i + 1], bx = b[2 * i + 2] - b[2 * i], by = b[2 * i + 3] - b[2 * i + 1];
    if (ax * bx + ay * by < 0) folded++;
  }
  if (fr > 0) for (let i = L.lip + 1; i < L.throat; i++) {
    const ma = Math.hypot(a[2 * i] - stored.frames[o - F + 2 * i], a[2 * i + 1] - stored.frames[o - F + 2 * i + 1]);
    const mb = Math.hypot(b[2 * i] - cut.frames[o - F + 2 * i], b[2 * i + 1] - cut.frames[o - F + 2 * i + 1]);
    moveBefore = Math.max(moveBefore, ma); moveAfter = Math.max(moveAfter, mb); moveOver = Math.max(moveOver, mb - ma);
  }
}
const loopsStored = removeLoops(stored.frames.slice()), loopsCut = removeLoops(cut.frames.slice());
const heldFrame = Math.floor((stored.touchdown - stored.tauStart) / stored.tauStep + 1e-6) - 1;
console.log('\n## every stored frame');
console.log(`frames with a moved point: ${movedFrames} of ${count} (the first is frame ${firstMoved}, ${f((stored.tauStart + firstMoved * stored.tauStep) * unit, 3)} s); points moved ${movedPoints}`);
console.log(`points 0..64 and 88..127 that differ (any frame): ${untouchedDiffer}; points that differ in a frame at or before the throw: ${preDiffer}`);
console.log(`underside points whose thickness grew: ${grew} (most ${f(worstGrow * h0 * 1000, 3)} mm); taken under the floor from over it: ${underFloor}; least thickness left where it was over the floor: ${f(leastAfter * h0 * 1000, 1)} mm; the largest cut ${f(mostCut * h0 * 1000, 1)} mm`);
console.log(`underside's largest turn (points 65..87): ${f(turnBefore, 1)} -> ${f(turnAfter, 1)} deg; the largest rise at one vertex ${f(turnOver, 2)} deg, ${turnOverAt}`);
console.log(`frames where one underside vertex turns over 5 deg more than stored: ${kinks.length}${kinks.length ? '\n  ' + kinks.join('\n  ') : ''}`);
console.log(`underside segments shorter than 1 mm (64..88, all frames): ${piledBefore} -> ${piled}`);
console.log(`the turn at point 88 after the throw: largest ${f(throatBefore, 2)} -> ${f(throatAfter, 2)} deg; the largest change in one frame ${f(throatOver, 3)} deg`);
console.log(`the turn at the tip, point 64 (not a bar): largest ${f(tipBefore, 1)} -> ${f(tipAfter, 1)} deg; the largest rise in one frame ${f(tipOver, 2)} deg`);
console.log(`underside segments turned over by the cut (64..88): ${folded}; points the library's loop closing moves: ${loopsStored} -> ${loopsCut}`);
console.log(`an underside point's largest move between neighbour frames: ${f(moveBefore * h0 * 1000, 1)} -> ${f(moveAfter * h0 * 1000, 1)} mm; the largest rise for one point and frame pair ${f(moveOver * h0 * 1000, 2)} mm`);
const oa = overturnAt(stored.frames, heldFrame), ob = overturnAt(cut.frames, heldFrame), os = overturnAt(cut.storedFrames ?? cut.frames, heldFrame);
console.log(`the crash's jet at frame ${heldFrame} (overturnAt, h0^2): stored ${f(oa.jetArea, 5)}; the cut frames ${f(ob.jetArea, 5)}; what the crash reads (storedFrames) ${f(os.jetArea, 5)}`);

const lastFrame = Math.floor((stored.touchdown - stored.tauStart) / stored.tauStep + 1e-6) - 1;
const la = measure(stored.frames.subarray(lastFrame * F, lastFrame * F + F)), lb = measure(cut.frames.subarray(lastFrame * F, lastFrame * F + F));
console.log(`the jet at the last stored frame before touchdown (frame ${lastFrame}, ${f((stored.tauStart + lastFrame * stored.tauStep) * unit, 3)} s): ${f(la.area * h0 * h0 / H0 / H0, 4)} -> ${f(lb.area * h0 * h0 / H0 / H0, 4)} H^2`);
// L1 read two ways: lip.mjs's (the point nearest half of the underside's arc), and the same stored point before and after.
{
  const pa = frameAt(stored, 0.1 / unit), pb = frameAt(cut, 0.1 / unit);
  let s = 0, mid = L.lip + 1, best = Infinity; const under = arc(pa, L.lip, L.throat);
  for (let i = L.lip + 1; i < L.throat; i++) { s += Math.hypot(pa[2 * i] - pa[2 * i - 2], pa[2 * i + 1] - pa[2 * i - 1]); if (Math.abs(s / under - 0.5) < best) { best = Math.abs(s / under - 0.5); mid = i; } }
  console.log(`at 0.10 s, the stored mid point (${mid}) itself: ${f(distToRun(pa, mid, L.crest, L.lip) * h0)} -> ${f(distToRun(pb, mid, L.crest, L.lip) * h0)} m from the top run; its nearest place on the top run is the tip: ${Math.abs(distToRun(pa, mid, L.crest, L.lip) - Math.hypot(pa[2 * mid] - pa[2 * L.lip], pa[2 * mid + 1] - pa[2 * L.lip + 1])) < 1e-9}`);
  // The sheet across: from the top run's points to the underside (the fray look's measure for the top face).
  const across = (p: ArrayLike<number>) => { let m = 0; for (let i = 40; i <= 60; i++) m += distToRun(p, i, L.lip, L.throat); return m / 21; };
  console.log(`at 0.10 s, the top face's points 40..60 to the underside, mean (lip.mjs's mean40-60): ${f(across(pa) * h0)} -> ${f(across(pb) * h0)} m`);
}
const r10 = rows.get(0.1)!, r60 = rows.get(0.6)!;
const H2 = H0 * H0, A = (m: ReturnType<typeof measure>) => m.area * h0 * h0 / H2;
const bar = (name: string, aim: string, before: string, after: string, pass: boolean) => console.log(`${name} | ${aim} | ${before} | ${after} | ${pass ? 'pass' : 'MISS'}`);
console.log('\n## bars');
console.log('bar | aim | before | after | result');
bar('L1', 'mid-lip at 0.10 s at most 0.04 H', `${f(r10.a.tMid * h0 / H0)} H (${f(r10.a.tMid * h0)} m)`, `${f(r10.b.tMid * h0 / H0)} H (${f(r10.b.tMid * h0)} m)`, r10.b.tMid * h0 / H0 <= 0.04);
bar('L2', 'none under 2 cm where it was over; none grows', '-', `${underFloor} under the floor; ${grew} grew`, underFloor === 0 && grew === 0);
const reachSame = [...rows.values()].every((r) => r.a.reach === r.b.reach);
bar('L3', 'points 0..64 and 88..127 byte-equal; touchdown 0.808 s; reach equal', `touchdown ${f(td, 3)} s`, `${untouchedDiffer} points differ; ${preDiffer} before the throw; touchdown ${f(cut.touchdown * unit, 3)} s; reach ${reachSame ? 'equal' : 'DIFFERS'}`, untouchedDiffer === 0 && preDiffer === 0 && cut.touchdown === stored.touchdown && reachSame);
bar('L4', 'jet at 0.6 s at least 0.090 H^2; before touchdown at least 0.10 H^2', `${f(A(r60.a), 4)}; ${f(la.area * h0 * h0 / H2, 4)}`, `${f(A(r60.b), 4)}; ${f(lb.area * h0 * h0 / H2, 4)}`, A(r60.b) >= 0.090 && la.area >= 0 && lb.area * h0 * h0 / H2 >= 0.10);
bar('L5', 'largest underside turn at most 5 deg over; point 88 within 1 deg; no folded segment', `${f(turnBefore, 1)} deg; ${f(throatBefore, 2)} deg`, `${f(turnAfter, 1)} deg (one vertex at most +${f(turnOver, 2)}); point 88 changes ${f(throatOver, 3)} deg; ${folded} folded`, turnAfter - turnBefore <= 5 && throatOver <= 1 && folded === 0);
bar('L6', 'largest move between neighbour frames at most 5 mm over', `${f(moveBefore * h0 * 1000, 1)} mm`, `${f(moveAfter * h0 * 1000, 1)} mm (one point at most +${f(moveOver * h0 * 1000, 2)})`, (moveAfter - moveBefore) * h0 * 1000 <= 5);
