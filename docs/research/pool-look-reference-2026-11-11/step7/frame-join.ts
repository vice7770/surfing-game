import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { libraryFromBytes } from '../../../../src/wave/barrel/barrelLibrary';
import { heldFrameJetStep } from '../../../../src/wave/barrel/heldJetStep';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type BarrelCase } from '../../../../src/wave/barrel/ProfileLibrary';
import { BARREL_SLOPE } from '../../../../src/wave/barrel/sweptLoft';
import { jetLength, lipShare } from '../../../../src/wave/barrel/arcMesh';
import { caseCrossing } from '../../../../src/wave/barrel/faceAnchor';
/**
 * Step 7's check of `?frameJoin=arc` on the library itself (no game run), through the game's own `profileAt` and
 * `pointAt`: bars A1, A2 and A3 of ruling 19, and how often a frame pair before the throw falls back to today's join.
 *   A1  at each stored frame's own time, the arc join's curve off the raw frame, crest to toe, both ways.
 *   A2  leave one out: a library built from every other frame of the case (the frames twice as far apart), read at the
 *       left-out frames' times, against the full case's raw frame there. With today's join and with the arc join.
 *   A3  at clock 0 and after, the arc join's profile against today's, every point; and the step just before clock 0.
 * Per tube case: `big` (the reference pool's), `a38` (the default pool's, the case ruling 19's table was read on).
 *   npx rolldown docs/research/pool-look-reference-2026-11-11/step7/frame-join.ts -o dist/scripts/frame-join7.mjs --format esm --platform node
 *   node dist/scripts/frame-join7.mjs
 */
const FLOATS = 2 * PROFILE_POINTS;
const slope = BARREL_SLOPE['pool' as never] as number;
const offAt = (a: Float32Array, b: Float32Array, i: number) => { let best = Infinity; for (let k = LANDMARK.crest; k < LANDMARK.toe; k += 1) { const ax = b[2 * k], ay = b[2 * k + 1], bx = b[2 * k + 2] - ax, by = b[2 * k + 3] - ay; const l2 = bx * bx + by * by; const u = l2 > 0 ? Math.min(1, Math.max(0, ((a[2 * i] - ax) * bx + (a[2 * i + 1] - ay) * by) / l2)) : 0; best = Math.min(best, Math.hypot(a[2 * i] - ax - u * bx, a[2 * i + 1] - ay - u * by)); } return best; };
const off = (a: Float32Array, b: Float32Array) => { let worst = 0; for (let i = LANDMARK.crest; i <= LANDMARK.toe; i += 1) worst = Math.max(worst, offAt(a, b, i)); return worst; };
const two = (x: Float32Array, y: Float32Array) => Math.max(off(x, y), off(y, x));
const pct = (v: number[], p: number) => (v.length ? [...v].sort((x, y) => x - y)[Math.min(v.length - 1, Math.floor(p * v.length))] : Number.NaN);
const row = (v: number[]) => `median ${pct(v, 0.5).toFixed(4)}, 90 % ${pct(v, 0.9).toFixed(4)}, most ${Math.max(0, ...v).toFixed(4)} m (${v.length})`;

for (const [which, footHeight, footDepth] of [['big', 1.25, 4.88], ['a38', 1.26, 4.88]] as const) {
  const bytes = readBarrelCases('pool' as never, undefined, which as never);
  const plain = libraryFromBytes(bytes, 'basilisk' as never, 'pool' as never, 'jet-step' as never);
  const arc = libraryFromBytes(bytes, 'basilisk' as never, 'pool' as never, 'jet-step' as never, 'arc');
  const c = plain.cases[0];
  const q = (seconds: number) => ({ slope, footHeight, footDepth, seconds, hold: 'contact' }) as never;
  const at = (lib: ProfileLibrary, seconds: number) => { const p = new Float32Array(FLOATS); lib.profileAt(q(seconds), p); return p; };
  const scale = plain.profileAt(q(-0.3), new Float32Array(FLOATS)).scale;
  const unit = Math.sqrt(scale / 9.81);
  const count = c.frames.length / FLOATS;
  const raw = (k: number) => { const p = new Float32Array(FLOATS); for (let i = 0; i < FLOATS; i += 1) p[i] = c.frames[k * FLOATS + i] * scale; return p; };
  const secondsOf = (k: number) => (c.tauStart + k * c.tauStep) * unit;
  const last = Math.floor(-c.tauStart / c.tauStep + 1e-6);
  let firstJet = -1; for (let k = 0; k < count && firstJet < 0; k += 1) if (jetLength(c.frames.subarray(k * FLOATS, (k + 1) * FLOATS)) > 0) firstJet = k;
  console.log(`=== ${which}: ${c.id}; foot crest ${footHeight} m, scale (h0) ${scale.toFixed(3)} m, frames ${(c.tauStep * unit).toFixed(4)} s apart; ${count} frames, frame ${last} at clock ${secondsOf(last).toFixed(5)} s, the first frame with an underside: ${firstJet} (clock ${secondsOf(firstJet).toFixed(3)} s) ===`);
  // A frame the library's builder refilled (its landmark checks failed: `caseFromLibrary`, "refilled linearly from their
  // nearest clean neighbours") is stored as its neighbours' point-by-point join: it lies on the line between the frames
  // either side of it, every point, to the file's rounding.
  const refilled = (k: number) => { if (k < 1 || k + 1 >= count) return false; let w = 0; for (let i = 0; i < FLOATS; i += 1) w = Math.max(w, Math.abs(c.frames[k * FLOATS + i] - 0.5 * (c.frames[(k - 1) * FLOATS + i] + c.frames[(k + 1) * FLOATS + i]))); return w < 2e-5; };
  { let all = 0; let late = 0; let n = 0; for (let k = 0; k < last; k += 1) { if (refilled(k)) { all += 1; if (secondsOf(k) >= -0.6) late += 1; } if (secondsOf(k) >= -0.6) n += 1; }
    console.log(`stored frames before the throw that are their neighbours' point-by-point join (refilled by the builder): ${all} of ${last}; in the last 0.6 s: ${late} of ${n}`); }
  console.log(`frame pairs before the throw: ${arc.arcJoinPairs}; pairs with one frame with an underside and one without (today's join): ${arc.arcJoinMixed}`);

  // A1: at each frame's own time. The clock is nudged by 1e-9 s toward the frame so the pair that holds it is read.
  for (const [lo, hi] of [[-9, -0.6], [-0.6, 0]] as const) {
    const A: number[] = []; const P: number[] = []; const V: number[] = [];
    for (let k = 0; k <= last; k += 1) {
      const s = secondsOf(k); if (!(s >= lo && s < hi - 1e-9)) continue;
      const r = raw(k); const a = at(arc, s); const p = at(plain, s);
      A.push(two(a, r)); P.push(two(p, r));
      let v = 0; for (let i = 0; i < FLOATS; i += 1) v = Math.max(v, Math.abs(a[i] - r[i])); V.push(v);
    }
    console.log(`A1, clock ${lo === -9 ? 'first frame' : lo}..${hi} s, at each stored frame's own time, the curve off the raw frame, crest to toe, both ways: arc join ${row(A)}; today's join ${row(P)}; the arc join's vertices off the raw frame's own (along the curve) ${row(V)}`);
    { const over: string[] = []; let m = 0; for (let k = 0; k <= last; k += 1) { const s = secondsOf(k); if (!(s >= lo && s < hi - 1e-9)) continue; if (A[m] > 0.005) over.push(`frame ${k} (clock ${s.toFixed(3)} s, ${A[m].toFixed(4)} m, the mark's share ${lipShare(c.frames.subarray(k * FLOATS, (k + 1) * FLOATS)).toFixed(2)}${refilled(k) ? ', refilled' : ''})`); m += 1; }
      if (over.length) console.log(`   over 0.005 m: ${over.join('; ')}`); }
  }

  // A3: clock 0 and after.
  let after = 0; let afterPoint = 0; const out = new Float64Array(2); const out2 = new Float64Array(2);
  for (let s = 0; s <= (c.tauStart + (count - 1) * c.tauStep) * unit; s += 0.003) {
    const a = at(arc, s); const p = at(plain, s);
    for (let i = 0; i < FLOATS; i += 1) after = Math.max(after, Math.abs(a[i] - p[i]));
    for (const point of [LANDMARK.crest, LANDMARK.lip, LANDMARK.throat, LANDMARK.toe, LANDMARK.front]) { arc.pointAt(q(s), point, out); plain.pointAt(q(s), point, out2); afterPoint = Math.max(afterPoint, Math.abs(out[0] - out2[0]), Math.abs(out[1] - out2[1])); }
  }
  const b0 = at(arc, -1e-7); const a0 = at(arc, 0); let step = 0; for (let i = 0; i < FLOATS; i += 1) step = Math.max(step, Math.abs(b0[i] - a0[i]));
  const p0 = at(plain, -1e-7); let stepPlain = 0; for (let i = 0; i < FLOATS; i += 1) stepPlain = Math.max(stepPlain, Math.abs(p0[i] - a0[i]));
  console.log(`A3, clock 0 and after (every 0.003 s to the last frame): the arc join's profile against today's, the largest vertex move ${after.toFixed(6)} m; pointAt at the five marks ${afterPoint.toFixed(6)} m`);
  console.log(`   the step at clock 0 (the profile 1e-7 s before against at 0): arc join, largest vertex move ${step.toFixed(4)} m (along the curve: the curve itself off the raw frame ${two(b0, a0).toFixed(4)} m); today's join ${stepPlain.toFixed(6)} m`);
  // pointAt agrees with profileAt before the throw (one curve for the wall water, the contact and the crash).
  let agree = 0;
  for (let s = -1.6; s < 0; s += 0.0037) { const a = at(arc, s); for (const point of [LANDMARK.crest, LANDMARK.lip, LANDMARK.throat, LANDMARK.toe]) { arc.pointAt(q(s), point, out); agree = Math.max(agree, Math.abs(out[0] - a[2 * point]), Math.abs(out[1] - a[2 * point + 1])); } }
  console.log(`   before the throw, pointAt against profileAt's own point (crest, lip, throat, toe; -1.6..0 s): largest ${agree.toExponential(2)} m`);
  // What the readers of the marks see before the throw: the lip's and throat's points, arc join against today's.
  const L: number[] = []; const T: number[] = [];
  for (let s = -0.6; s < 0; s += 0.0037) { for (const [point, list] of [[LANDMARK.lip, L], [LANDMARK.throat, T]] as const) { arc.pointAt(q(s), point, out); plain.pointAt(q(s), point, out2); list.push(Math.hypot(out[0] - out2[0], out[1] - out2[1])); } }
  console.log(`   before the throw (-0.6..0 s), the mark's place, arc join against today's: lip ${row(L)}; throat ${row(T)}`);
  // The face anchor's reader (`FaceAnchor.caseFace`): where the curve, from the crest on, comes down through the anchor's
  // level (`caseCrossing`), m along the profile. The sea's crash stands each case by it, so a move here moves the throws.
  { const X: number[] = []; const AT: number[] = []; const S: number[] = []; let prevA = Number.NaN; let prevP = Number.NaN;
    const SA: number[] = []; const SP: number[] = [];
    for (let s = -1.6; s < -1e-6; s += 0.003) {
      const a = caseCrossing(at(arc, s), LANDMARK.crest); const p = caseCrossing(at(plain, s), LANDMARK.crest);
      X.push(Math.abs(a - p));
      if (prevA === prevA) { SA.push(Math.abs(a - prevA)); SP.push(Math.abs(p - prevP)); }
      prevA = a; prevP = p;
    }
    for (let k = 0; k < last; k += 1) { const s = secondsOf(k); if (s < -1.6) continue; AT.push(Math.abs(caseCrossing(at(arc, s), LANDMARK.crest) - caseCrossing(raw(k), LANDMARK.crest))); S.push(s); }
    console.log(`the face anchor's crossing (the curve through the anchor's level, from the crest; -1.6..0 s every 0.003 s): arc join against today's ${row(X)}; at the stored frames' own times, arc join against the raw frame ${row(AT)}`);
    console.log(`   its move per 0.003 s: arc join ${row(SA)}; today's join ${row(SP)}`); }

  // A2: leave one out through profileAt. `from` 0: the even frames kept, the odd ones left out; `from` 1: the other way.
  const R = new Map<string, number[]>();
  for (const from of [0, 1]) {
    const kept = Math.floor((count - from + 1) / 2);
    const frames = new Float32Array(kept * FLOATS);
    for (let m = 0; m < kept; m += 1) frames.set(c.frames.subarray((from + 2 * m) * FLOATS, (from + 2 * m + 1) * FLOATS), m * FLOATS);
    const tip = c.tipVelocity ? new Float32Array(kept * 2) : undefined;
    if (tip && c.tipVelocity) for (let m = 0; m < kept; m += 1) { tip[2 * m] = c.tipVelocity[2 * (from + 2 * m)]; tip[2 * m + 1] = c.tipVelocity[2 * (from + 2 * m) + 1]; }
    const half: BarrelCase = { ...c, frames, tauStart: c.tauStart + from * c.tauStep, tauStep: 2 * c.tauStep, ...(tip ? { tipVelocity: tip } : {}) };
    const libs = { today: new ProfileLibrary([half], { heldFrame: heldFrameJetStep }), arc: new ProfileLibrary([half], { heldFrame: heldFrameJetStep, frameJoin: 'arc' }) };
    for (let k = from + 1; k < last; k += 2) {
      const s = secondsOf(k); const band = s >= -0.6 ? 'last' : s >= -1.6 ? 'early' : undefined; if (!band) continue;
      // The last left-out frame of the odd set lies in a pair that crosses the throw (today's join there): counted apart.
      const crosses = k + 1 > Math.floor(-half.tauStart / half.tauStep + 1e-6) * 2 + from;
      const r = raw(k);
      for (const name of ['today', 'arc'] as const) { const key = `${band}|${name}${crosses ? '|cross' : ''}`; const l = R.get(key) ?? []; l.push(two(at(libs[name], s), r)); R.set(key, l); }
      const kind = refilled(k) || refilled(k - 1) || refilled(k + 1) ? 'refilled' : 'clean';
      if (!crosses) for (const name of ['today', 'arc'] as const) { const key = `${band}|${name}|${kind}`; const l = R.get(key) ?? []; l.push(two(at(libs[name], s), r)); R.set(key, l); }
    }
  }
  for (const [band, label] of [['early', 'clock -1.6..-0.6 s'], ['last', 'clock -0.6..0 s']] as const) {
    console.log(`A2, ${label}: each frame left out and read from a library of every other frame (frames ${(2 * c.tauStep * unit).toFixed(4)} s apart), the curve off the real frame, crest to toe, both ways:`);
    console.log(`   today's join: ${row(R.get(`${band}|today`) ?? [])}`);
    console.log(`   arc join:     ${row(R.get(`${band}|arc`) ?? [])}`);
    console.log(`   split: the frame and both its neighbours as the run gave them: today ${row(R.get(`${band}|today|clean`) ?? [])}; arc ${row(R.get(`${band}|arc|clean`) ?? [])}`);
    console.log(`          the frame or a neighbour refilled by the builder:    today ${row(R.get(`${band}|today|refilled`) ?? [])}; arc ${row(R.get(`${band}|arc|refilled`) ?? [])}`);
    if (R.has(`${band}|arc|cross`)) console.log(`   (apart: the left-out frame whose pair crosses the throw, joined as today in both: today ${row(R.get(`${band}|today|cross`) ?? [])}; arc ${row(R.get(`${band}|arc|cross`) ?? [])})`);
  }
}
