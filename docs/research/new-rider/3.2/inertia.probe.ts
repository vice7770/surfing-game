// Step 3.2b (ruling 29f): the rider's whole-body moment of inertia about the vertical through its centre of mass, by
// posture, from de Leva's (1996) segment table for the male sample (73.0 kg, the game's reference rider). One line per
// posture ($OUT). From the repo root:
//   npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts inertia
//
// Sources:
// - Segment masses (fraction of the body's), centre-of-mass places (fraction of the segment from its first end) and
//   radii of gyration (fraction of the segment's length, sagittal / transverse / longitudinal): de Leva, P. 1996,
//   "Adjustments to Zatsiorsky-Seluyanov's segment inertia parameters", J Biomech 29(9):1223-1230, as tabulated in
//   Duarte's BMC notebook (https://raw.githubusercontent.com/demotu/BMC/master/notebooks/BodySegmentParameters.ipynb).
// - Segment lengths, mm, the male means of de Leva's Table 1 (recalled, not read: the PDF's scan did not decode); the
//   trunk's three parts sum to its whole (170.7 + 215.5 + 145.7 = 531.9), as they should.
// - The posture: the game's standing pose (`riderPosture.ts`): the feet 0.63 m apart along the board (Borgonovo-Santos
//   et al. 2021), the hips 0.78 m over the deck, the hands 1.0 m up and 0.45 m out along the board; the crouch ladder's
//   depths (the pumping crouch 0.195 m lower, Compress 0.30). The joints' places beyond that are this file's [I].
import { it } from 'vitest';
import { emit, r } from '../../board-in-water/lab';

const MASS = 73;
/** [mass fraction, CM from the first end, r sagittal, r transverse, r longitudinal, length m] (de Leva 1996, male). */
const SEG = {
  head: [0.0694, 0.5976, 0.362, 0.376, 0.312, 0.2033],
  trunk: [0.4346, 0.4486, 0.372, 0.347, 0.191, 0.5319],
  upperArm: [0.0271, 0.5772, 0.285, 0.269, 0.158, 0.2817],
  forearm: [0.0162, 0.4574, 0.276, 0.265, 0.121, 0.2689],
  hand: [0.0061, 0.79, 0.628, 0.513, 0.401, 0.0862],
  thigh: [0.1416, 0.4095, 0.329, 0.329, 0.149, 0.4222],
  shank: [0.0433, 0.4395, 0.251, 0.246, 0.102, 0.434],
  foot: [0.0137, 0.4415, 0.257, 0.245, 0.124, 0.2581],
} as const;
type Seg = keyof typeof SEG;
type P = [number, number, number];
/** One segment from its first end `a` to its second `b` (x along the board, y across toward the toes, z up). */
interface Part { seg: Seg; a: P; b: P }

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: P, s: number): P => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: P) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: P): P => mul(a, 1 / len(a));

/** The knee of a leg from the hip to the ankle, bent toward `toward` (a horizontal direction), m. */
function knee(hip: P, ankle: P, toward: P): P {
  const t = SEG.thigh[5];
  const s = SEG.shank[5];
  const line = sub(ankle, hip);
  const d = len(line);
  const along = (t * t - s * s + d * d) / (2 * d);
  const out = Math.sqrt(Math.max(0, t * t - along * along));
  const u = unit(line);
  // The bend: `toward` made square to the line.
  const dot = toward[0] * u[0] + toward[1] * u[1] + toward[2] * u[2];
  const w = unit(sub(toward, mul(u, dot)));
  return add(add(hip, mul(u, along)), mul(w, out));
}

/** A posture: hips `hip` m over the deck and `back` m behind the feet's line, the trunk leaning `lean` rad toward the toes, the knees bent toward `kneeTo`, and the arms. */
function posture(hip: number, back: number, lean: number, kneeTo: P, arms: 'in' | 'pose' | 'out'): Part[] {
  const feet = 0.315;
  const ankleZ = 0.08;
  const hipHalf = 0.085;
  const parts: Part[] = [];
  for (const side of [1, -1]) {
    const h: P = [side * hipHalf, -back, hip];
    const ankle: P = [side * feet, 0, ankleZ];
    const k = knee(h, ankle, [side * kneeTo[0], kneeTo[1], kneeTo[2]]);
    parts.push({ seg: 'thigh', a: h, b: k }, { seg: 'shank', a: k, b: ankle });
    // The foot across the board, the heel 0.05 m behind the ankle.
    parts.push({ seg: 'foot', a: [side * feet, -0.05, 0.04], b: [side * feet, -0.05 + SEG.foot[5], 0.04] });
  }
  const pelvis: P = [0, -back, hip];
  const up: P = [0, Math.sin(lean), Math.cos(lean)];
  const supr = add(pelvis, mul(up, SEG.trunk[5]));
  parts.push({ seg: 'trunk', a: supr, b: pelvis });
  parts.push({ seg: 'head', a: add(supr, mul(up, 0.25)), b: add(supr, mul(up, 0.25 - SEG.head[5])) });
  for (const side of [1, -1]) {
    const shoulder = add(supr, [side * 0.165, 0, -0.04]);
    let elbow: P; let wrist: P; let tip: P;
    if (arms === 'in') {
      elbow = add(shoulder, [side * 0.03, 0, -SEG.upperArm[5]]);
      wrist = add(elbow, [side * 0.01, 0.02, -SEG.forearm[5]]);
      tip = add(wrist, [0, 0, -SEG.hand[5]]);
    } else if (arms === 'out') {
      elbow = add(shoulder, [side * SEG.upperArm[5], 0, 0]);
      wrist = add(elbow, [side * SEG.forearm[5], 0, 0]);
      tip = add(wrist, [side * SEG.hand[5], 0, 0]);
    } else {
      // The game's pose: the hands 0.45 m out along the board from the middle, 0.22 m over the hips (1.0 m over the
      // deck standing tall), a little toward the toes; the elbow bent out and down between.
      const hand: P = [side * 0.45, pelvis[1] + 0.1, hip + 0.22];
      wrist = add(hand, [-side * 0.035, 0, 0]);
      const u = SEG.upperArm[5];
      const f = SEG.forearm[5];
      const line = sub(wrist, shoulder);
      const d = Math.min(len(line), u + f - 1e-3);
      const along = (u * u - f * f + d * d) / (2 * d);
      const out = Math.sqrt(Math.max(0, u * u - along * along));
      const lu = unit(line);
      const bend = unit(sub([side, 0, -1], mul(lu, side * lu[0] - lu[2])));
      elbow = add(add(shoulder, mul(lu, along)), mul(bend, out));
      tip = add(wrist, mul(unit(sub(wrist, elbow)), SEG.hand[5]));
    }
    parts.push({ seg: 'upperArm', a: shoulder, b: elbow }, { seg: 'forearm', a: elbow, b: wrist }, { seg: 'hand', a: wrist, b: tip });
  }
  return parts;
}

/** The centre of mass and the inertia about the vertical through it, kg·m², and its share from the arms and from the legs. */
function verticalInertia(parts: Part[]) {
  let m = 0;
  let c: P = [0, 0, 0];
  const placed = parts.map((p) => {
    const [fm, at, rs, rt, rl, l] = SEG[p.seg];
    const mass = fm * MASS;
    const cm = add(p.a, mul(sub(p.b, p.a), at));
    const axis = unit(sub(p.b, p.a));
    // About a vertical: the long radius on the axis's vertical part, the mean transverse on the rest.
    const cos2 = axis[2] * axis[2];
    const own = mass * l * l * (rl * rl * cos2 + ((rs * rs + rt * rt) / 2) * (1 - cos2));
    m += mass;
    c = add(c, mul(cm, mass));
    return { seg: p.seg, mass, cm, own };
  });
  c = mul(c, 1 / m);
  let total = 0; let arms = 0; let legs = 0;
  for (const p of placed) {
    const d2 = (p.cm[0] - c[0]) ** 2 + (p.cm[1] - c[1]) ** 2;
    const i = p.own + p.mass * d2;
    total += i;
    if (p.seg === 'upperArm' || p.seg === 'forearm' || p.seg === 'hand') arms += i;
    if (p.seg === 'thigh' || p.seg === 'shank' || p.seg === 'foot') legs += i;
  }
  return { mass: m, com: c, total, arms, legs };
}

/**
 * Step 3.2c (ruling 29g, item 1): the yaw inertia split by where it sits. Two yaw coordinates: the board's turn ψ_b (the
 * feet, the shanks and the knees go with it, planted) and the upper body's twist θ_t about the vertical through the
 * pelvis (the pelvis, trunk, arms and head turn rigidly with it). The thighs run from the hip (on the pelvis) to the knee
 * (with the board), so their lateral speed in a twist falls linearly from the hip's to nothing: their share of the twist
 * is m [(1 − c)² + r_t²] d_hip² (c the centre's place from the hip, r_t the transverse radius over the length, d_hip the
 * hip joint's distance from the twist's axis). The kinetic energy is ½ [ψ̇_b θ̇_t] M [ψ̇_b θ̇_t]ᵀ, M from the segments:
 * M_bb the whole body's (as `verticalInertia`), M_tt the twist's with the board held, M_bt their coupling. The lumped
 * split: the twist rotor I_U = M_tt, the board's share I_L = M_bb − M_tt (exact when M_bt = M_tt); what the board meets
 * with the upper body free, M_bb − M_bt² / M_tt, is reported as the check.
 */
function yawSplit(parts: Part[], pivot: [number, number] | 'com') {
  const upper: Seg[] = ['trunk', 'head', 'upperArm', 'forearm', 'hand'];
  let m = 0;
  let c: P = [0, 0, 0];
  for (const p of parts) {
    const [fm, at] = SEG[p.seg];
    m += fm * MASS;
    c = add(c, mul(add(p.a, mul(sub(p.b, p.a), at)), fm * MASS));
  }
  c = mul(c, 1 / m);
  const axis: [number, number] = pivot === 'com' ? [c[0], c[1]] : pivot;
  let bb = 0; let tt = 0; let bt = 0; let thighShare = 0;
  for (const p of parts) {
    const [fm, at, rs, rt, rl, l] = SEG[p.seg];
    const mass = fm * MASS;
    const cm = add(p.a, mul(sub(p.b, p.a), at));
    const u = unit(sub(p.b, p.a));
    const cos2 = u[2] * u[2];
    const own = mass * l * l * (rl * rl * cos2 + ((rs * rs + rt * rt) / 2) * (1 - cos2));
    const toC = (cm[0] - c[0]) ** 2 + (cm[1] - c[1]) ** 2;
    bb += own + mass * toC;
    if (upper.includes(p.seg)) {
      // Turns rigidly with the twist about the pelvis's vertical: ω_b about the centre, θ̇_t about the axis.
      const toAxis = (cm[0] - axis[0]) ** 2 + (cm[1] - axis[1]) ** 2;
      const dot = (cm[0] - c[0]) * (cm[0] - axis[0]) + (cm[1] - c[1]) * (cm[1] - axis[1]);
      tt += own + mass * toAxis;
      bt += own + mass * dot;
    } else if (p.seg === 'thigh') {
      // The hip end (p.a) moves with the twist, the knee end (p.b) with the board; the speed is linear along the thigh.
      const hip: [number, number] = [p.a[0] - axis[0], p.a[1] - axis[1]];
      const dHip2 = hip[0] ** 2 + hip[1] ** 2;
      const weight = (1 - at) ** 2 + ((rs * rs + rt * rt) / 2);
      tt += mass * weight * dHip2;
      thighShare += mass * weight * dHip2;
      // Coupling: ∫ (1 − s) (r(s) − c) · (hip − axis) dm, r(s) along the thigh: the mean (1 − s)-weighted place.
      // (1 − s) r(s) integrated: r(s) = a + s (b − a); ∫ (1 − s) dm = m (1 − c); ∫ (1 − s) s dm = m (c − c² − r_t²).
      const w0 = 1 - at;
      const w1 = at - at * at - ((rs * rs + rt * rt) / 2);
      const place: P = add(mul(p.a, w0), mul(sub(p.b, p.a), w1));
      bt += mass * ((place[0] - w0 * c[0]) * hip[0] + (place[1] - w0 * c[1]) * hip[1]);
    }
  }
  return { bb, tt, bt, thighShare, lower: bb - tt, boardMeetsFree: bb - (bt * bt) / tt };
}

it('the rider yaw inertia by posture (de Leva 1996)', () => {
  // The anatomical check: standing straight, the feet together, the arms at the sides.
  const anatomical: Part[] = [];
  for (const side of [1, -1]) {
    const hip: P = [side * 0.085, 0, 0.94];
    const kneeP: P = [side * 0.085, 0, 0.94 - SEG.thigh[5]];
    const ankle: P = [side * 0.08, 0, 0.08];
    anatomical.push({ seg: 'thigh', a: hip, b: kneeP }, { seg: 'shank', a: kneeP, b: ankle }, { seg: 'foot', a: [side * 0.08, -0.05, 0.04], b: [side * 0.08, 0.208, 0.04] });
  }
  const pelvis: P = [0, 0, 0.94];
  const supr: P = [0, 0, 0.94 + SEG.trunk[5]];
  anatomical.push({ seg: 'trunk', a: supr, b: pelvis }, { seg: 'head', a: [0, 0, supr[2] + 0.25], b: [0, 0, supr[2] + 0.25 - SEG.head[5]] });
  for (const side of [1, -1]) {
    const s: P = [side * 0.165, 0, supr[2] - 0.04];
    const e: P = [side * 0.19, 0, s[2] - SEG.upperArm[5]];
    const w: P = [side * 0.2, 0, e[2] - SEG.forearm[5]];
    anatomical.push({ seg: 'upperArm', a: s, b: e }, { seg: 'forearm', a: e, b: w }, { seg: 'hand', a: w, b: [w[0], 0, w[2] - SEG.hand[5]] });
  }
  const a = verticalInertia(anatomical);
  emit({ posture: 'anatomical (feet together, arms at the sides)', comHeight: r(a.com[2], 3), inertia: r(a.total, 3), arms: r(a.arms, 3), legs: r(a.legs, 3) });
  // The same with the arms out level at the sides (a skater's spin opened): "more than double" (fsps.muni.cz, Masaryk).
  const spread = anatomical.filter((p) => !['upperArm', 'forearm', 'hand'].includes(p.seg));
  for (const side of [1, -1]) {
    const s: P = [side * 0.165, 0, supr[2] - 0.04];
    const e: P = [side * (0.165 + SEG.upperArm[5]), 0, s[2]];
    const w: P = [e[0] + side * SEG.forearm[5], 0, s[2]];
    spread.push({ seg: 'upperArm', a: s, b: e }, { seg: 'forearm', a: e, b: w }, { seg: 'hand', a: w, b: [w[0] + side * SEG.hand[5], 0, s[2]] });
  }
  const o = verticalInertia(spread);
  emit({ posture: 'anatomical, arms out level', inertia: r(o.total, 3), arms: r(o.arms, 3), ratio: r(o.total / a.total, 2) });
  // The surfing stances: hips 0.78 / 0.585 / 0.48 m over the deck (tall, the pumping crouch, Compress), sitting back
  // and leaning the trunk forward more as they go lower; the knees forward (toward the toes) and a little out.
  const stances: [string, number, number, number][] = [['tall', 0.78, 0.04, 0.15], ['crouch', 0.585, 0.08, 0.35], ['compress', 0.48, 0.1, 0.5]];
  for (const [name, hip, back, lean] of stances) for (const arms of ['in', 'pose', 'out'] as const) {
    const v = verticalInertia(posture(hip, back, lean, [0.3, 1, 0], arms));
    emit({ posture: name, arms, comHeight: r(v.com[2], 3), comAcross: r(v.com[1], 3), inertia: r(v.total, 3), arms_: r(v.arms, 3), legs: r(v.legs, 3) });
    // Step 3.2c: the split between the board (feet, shanks, the thighs' share that stays) and the twist (pelvis, trunk, arms, head).
    // The twist about the vertical through the body's centre of mass (used: the game's rider spins about its leg line
    // through it, as 3.2b's whole inertia did), and about the vertical through the pelvis (the check).
    for (const pivot of ['com', [0, -back]] as const) {
      const s = yawSplit(posture(hip, back, lean, [0.3, 1, 0], arms), pivot as 'com' | [number, number]);
      emit({ part: 'split', posture: name, arms, pivot: pivot === 'com' ? 'centre of mass' : 'pelvis', whole: r(s.bb, 3), twist: r(s.tt, 3), withBoard: r(s.lower, 3), coupling: r(s.bt, 3), thighsOnTwist: r(s.thighShare, 3), boardMeetsUpperFree: r(s.boardMeetsFree, 3) });
    }
  }
});
