// The new surfer, step 3.2 (docs/research/new-rider/design.md §7 "3.2", the brief's bars): every test starts from a
// steady glide. The board is placed at the test's speed straight down the planar face whose slope balances its drag at
// that speed (`terminalAngle`), and left SETTLE s: the body settles on its feet and the board at its own draft and trim,
// at its speed. Only then does the test begin. RIDER=new runs the new rider; without it, the old. One line per row ($OUT).
// PART=glide,rise,carve,push,modes picks parts (default all). SUBSTEPS=n sets the new surfer's standing substeps.
// No ride session, catch report or autopilot ride: flat water, a small seeded chop, a rising surface, a 15° plane.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { dampedMode } from '../../../../src/dev/carveMetrics';
import type { SurfWater } from '../../../../src/physics/SurfWater';
import { Chop, OnFace, Rising, STEP, Slope, emit, place, r, state, type Rig } from '../../board-in-water/lab';

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
/** A part, run once (kept as a wrapper so a part can be repeated over a sweep). */
function each(part: () => void): void {
  part();
}
const PARTS = (process.env.PART ?? 'glide,rise,carve,push,modes').split(',');
const SETTLE = Number(process.env.SETTLE ?? 2.5);

const G = 9.81;
const DEG = 180 / Math.PI;
type Stance = 'tall' | 'crouch' | 'compress';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inner = any;

const inner = (rig: Rig): Inner => rig.rider as unknown as Inner;
const level = (rig: Rig) => new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize();
const side = (rig: Rig) => new Vector3(1, 0, 0).applyQuaternion(rig.board.orientation).setY(0).normalize();

/** The stance's inputs: the pumping crouch is the crouch held; Compress as the probes take it (compress 1, crouch 0.6). */
function hold(rig: Rig, stance: Stance): void {
  const rider = rig.rider!;
  rider.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rider.compress = stance === 'compress' ? 1 : 0;
}

/**
 * The face whose slope balances the board's drag at a speed (`calib.probe.ts`, the old rider: a board placed at v keeps
 * v over 3 s within 0.1 m/s), degrees, interpolated. A glide down it is a terminal glide: the steady start. (A pull on
 * board and body to hold the speed on flat water instead tilts their felt gravity off the water's normal by the drag's
 * angle; reset at each frame it pinned the speed and the 3.1c pitch loop rang and grew; on the board alone, as a kick
 * each frame, it threw the old rider too. README section 3.)
 */
const TERMINAL: [number, number][] = [[5, 13.37], [7, 11.01], [9, 10.37], [12, 11.07]];
export function terminalAngle(v: number): number {
  if (v <= TERMINAL[0][0]) return TERMINAL[0][1];
  for (let i = 1; i < TERMINAL.length; i += 1) {
    const [v1, a1] = TERMINAL[i];
    const [v0, a0] = TERMINAL[i - 1];
    if (v <= v1) return a0 + ((a1 - a0) * (v - v0)) / (v1 - v0);
  }
  return TERMINAL[TERMINAL.length - 1][1];
}

/** One frame: the water on, the board's step, the state. */
function frame(rig: Rig, water: SurfWater, t: number) {
  (water as { advance?: (dt: number) => void }).advance?.(STEP);
  rig.board.step(STEP, water);
  return state(rig, water, t);
}

/** Placed at `speed` heading +z (down the face) on `water`, in `stance`, left SETTLE s: a steady glide. Returns the rig and the time. */
function steady(water: SurfWater, speed: number, stance: Stance = 'tall'): { rig: Rig; t: number; fell: string } {
  const rig = place(water, 0, 0, speed, 'standing');
  hold(rig, stance);
  let t = 0;
  for (let i = 0; i < Math.round(SETTLE / STEP); i += 1) {
    t = (i + 1) * STEP;
    const s = frame(rig, water, t);
    if (s.fell) return { rig, t, fell: s.fell };
  }
  return { rig, t, fell: '' };
}

/** The feet's pressure along from their middle, as a share of the way to the toe (+) or heel (−) end. */
function pressureShare(rig: Rig): number {
  const q = inner(rig);
  const mid = (q.support.zMin + q.support.zMax) / 2;
  const half = (q.support.zMax - q.support.zMin) / 2;
  return (rig.rider!.contact.centreOfPressure.z - mid) / half;
}

it('glides at 5, 7, 9 and 12 m/s, flat and on chop: hold 3 s from a steady glide', () => each(() => {
  if (!PARTS.includes('glide')) return;
  const waters: { name: string; make: (v: number) => SurfWater }[] = [
    { name: 'plane', make: (v) => new Slope(terminalAngle(v)) },
    ...[1, 2, 3].map((seed) => ({ name: `chop ${seed}`, make: (v: number) => new OnFace(terminalAngle(v), new Chop(seed)) })),
  ];
  // STANCE=tall,crouch,compress (step 3.2h: the stance the glide is ridden in; the bar is tall).
  for (const stance of (process.env.STANCE ?? 'tall').split(',') as Stance[]) for (const w of waters) for (const v of [5, 7, 9, 12]) {
    const water = w.make(v);
    const start = steady(water, v, stance);
    const { rig } = start;
    let t = start.t; let fell = start.fell ? `settling: ${start.fell}` : ''; let minReserve = 1; let peakShare = -Infinity; let lowShare = Infinity; let s = state(rig, water, t);
    const from = t;
    if (!fell) {
      for (let i = 0; i < Math.round(3 / STEP); i += 1) {
        t = from + (i + 1) * STEP;
        s = frame(rig, water, t);
        if (s.fell) { fell = s.fell; break; }
        minReserve = Math.min(minReserve, rig.rider!.balanceReserve);
        const share = pressureShare(rig);
        peakShare = Math.max(peakShare, share); lowShare = Math.min(lowShare, share);
      }
    }
    emit({ bar: 'glide', rider: RIDER, ...(process.env.STANCE ? { stance } : {}), water: w.name, faceDeg: r(terminalAngle(v), 1), v, fell, heldS: r(t - from, 2), speedEnd: r(s.speed, 2), draftCm: r(s.draft * 100, 1), minReserve: r(minReserve, 2), pressureShare: [r(lowShare, 2), r(peakShare, 2)] });
  }
}));

it('a surface rising 20 cm under a 7.4 m/s glide', () => each(() => {
  if (!PARTS.includes('rise')) return;
  for (const rate of [1, 2, 4]) {
    const water = new OnFace(terminalAngle(7.4), new Rising(SETTLE + 0.5, rate, 0.2));
    const start = steady(water, 7.4);
    const { rig } = start;
    let peakLoad = 0; let legMin = Infinity; let fell = start.fell ? `settling: ${start.fell}` : ''; let fellAfter = Number.NaN;
    if (!fell) {
      for (let i = 0; i < Math.round(1.7 / STEP); i += 1) {
        const t = start.t + (i + 1) * STEP;
        const s = frame(rig, water, t);
        if (t > SETTLE + 0.5) { peakLoad = Math.max(peakLoad, rig.rider!.contact.load); legMin = Math.min(legMin, rig.rider!.leg.extension); }
        if (s.fell) { fell = s.fell; fellAfter = t - (SETTLE + 0.5); break; }
      }
    }
    emit({ bar: 'rise', rider: RIDER, rate, peakLoad: r(peakLoad, 2), kneesCm: r(-legMin * 100, 1), fell, fellAfter: r(fellAfter, 2) });
  }
}));

it('held carves on flat water from a steady 7.7 m/s glide, standing and in Compress', () => each(() => {
  if (!PARTS.includes('carve')) return;
  for (const stance of ['tall', 'compress'] as const) {
    const water = new Slope(terminalAngle(7.7));
    const start = steady(water, 7.7, stance);
    const { rig } = start;
    let t = start.t; let fell = start.fell ? `settling: ${start.fell}` : ''; let s = state(rig, water, t); let bankMax = 0;
    const rolls: number[] = [];
    if (!fell) {
      rig.rider!.steer = 1;
      for (let i = 0; i < Math.round(3 / STEP); i += 1) {
        t = start.t + (i + 1) * STEP;
        s = frame(rig, water, t);
        rolls.push(rig.board.angularVelocity.dot(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation)));
        bankMax = Math.max(bankMax, Math.abs(rig.rider!.bank.angle * DEG));
        if (s.fell) { fell = s.fell; break; }
      }
    }
    emit({ bar: 'held carve', rider: RIDER, stance, heldS: r(t - start.t, 2), fell, speedEnd: r(s.speed, 2), bankEnd: r(s.bank, 1), bankMax: r(bankMax, 1), ...bands(rolls) });
  }
}));

/**
 * One shove across the board (the body's velocity changed by `dv` m/s toward the board's +x, `dir` ±1) on a towed 7 m/s
 * glide in `stance`; then 2 s, still towed. Returns whether it fell, when, when the capture point first left the feet,
 * and the first move of the active rest across and of the feet's pressure across after the shove.
 */
function shove(stance: Stance, dv: number, dir: number) {
  const water = new Slope(terminalAngle(7));
  const start = steady(water, 7, stance);
  const { rig } = start;
  if (start.fell) return { fell: `settling: ${start.fell}`, fellAfter: Number.NaN, leftAfter: Number.NaN, beyondAfter: Number.NaN, activeAfter: Number.NaN, pressureAfter: Number.NaN, loadMin: Number.NaN };
  const q = inner(rig);
  const restBefore = RIDER === 'new' ? q.human.rollRest : q.ankleRest;
  const copBefore = rig.rider!.contact.centreOfPressure.x;
  rig.rider!.velocity.addScaledVector(side(rig), dir * dv);
  let fell = ''; let fellAfter = Number.NaN; let leftAfter = Number.NaN; let beyondAfter = Number.NaN; let activeAfter = Number.NaN; let pressureAfter = Number.NaN; let loadMin = Infinity;
  // The step is 1/60 s; the substeps inside it carry the timing: read the rest and the pressure at each substep.
  const original = q.finish.bind(q);
  let clock = 0;
  q.finish = (h: number, b: unknown) => {
    original(h, b);
    clock += h;
    const rest = RIDER === 'new' ? q.human.rollRest : q.ankleRest;
    if (Number.isNaN(activeAfter) && Math.abs(rest - restBefore) > 0.005) activeAfter = clock;
    if (Number.isNaN(pressureAfter) && Math.abs(rig.rider!.contact.centreOfPressure.x - copBefore) > 0.01) pressureAfter = clock;
    if (RIDER === 'new' && Number.isNaN(leftAfter) && q.human.state.past > 0) leftAfter = clock;
    if (RIDER === 'new' && Number.isNaN(beyondAfter) && q.human.state.beyond) beyondAfter = clock;
    if (RIDER === 'new') loadMin = Math.min(loadMin, q.captureLoad ?? Infinity);
  };
  for (let i = 0; i < Math.round(2 / STEP); i += 1) {
    const s = frame(rig, water, start.t + (i + 1) * STEP);
    if (s.fell) { fell = s.fell; fellAfter = clock; break; }
  }
  return { fell, fellAfter, leftAfter, beyondAfter, activeAfter, pressureAfter, loadMin };
}

it('push recovery, reaction and the save window on a 7 m/s glide', () => each(() => {
  if (!PARTS.includes('push')) return;
  for (const stance of ['tall', 'crouch', 'compress'] as const) for (const dir of [1, -1]) {
    // The largest shove saved, by bisection over 0–3 m/s (the body's velocity across; × 73 kg for the impulse).
    let lo = 0; let hi = 3;
    if (!shove(stance, hi, dir).fell) lo = hi;
    else for (let k = 0; k < 9; k += 1) { const mid = (lo + hi) / 2; if (shove(stance, mid, dir).fell) hi = mid; else lo = mid; }
    const small = shove(stance, 0.3, dir);
    const past = shove(stance, Math.min(3, lo * 1.1 + 0.02), dir);
    const hard = shove(stance, Math.min(3, lo * 1.5 + 0.05), dir);
    const window = (x: ReturnType<typeof shove>) => (x.fell && !Number.isNaN(x.leftAfter) ? r(x.fellAfter - x.leftAfter, 3) : null);
    // Step 3.2h: the design's save window is the body's own tipping time, from the loss of balance (the capture point
    // past the feet by MORE than the room's reach) to the separation; `window` above measures it from the capture
    // point's first touch outside the feet, which a savable shove crosses at once.
    const lost = (x: ReturnType<typeof shove>) => (x.fell && !Number.isNaN(x.beyondAfter) ? r(x.fellAfter - x.beyondAfter, 3) : null);
    emit({
      bar: 'push', rider: RIDER, stance, dir, savedDv: r(lo, 3), savedImpulseNs: r(lo * 73, 0),
      reaction: { activeRestS: r(small.activeAfter, 3), pressureS: r(small.pressureAfter, 3), fell: small.fell },
      justPast: { dv: r(lo * 1.1 + 0.02, 3), fell: past.fell, fellAfterS: r(past.fellAfter, 3), leftFeetAfterS: r(past.leftAfter, 3), beyondAfterS: r(past.beyondAfter, 3), saveWindowS: window(past), lostWindowS: lost(past), loadMin: r(past.loadMin, 2) },
      hard: { dv: r(lo * 1.5 + 0.05, 3), fell: hard.fell, fellAfterS: r(hard.fellAfter, 3), leftFeetAfterS: r(hard.leftAfter, 3), beyondAfterS: r(hard.beyondAfter, 3), saveWindowS: window(hard), lostWindowS: lost(hard), loadMin: r(hard.loadMin, 2) },
    });
    // The window against the shove's size (step 3.2h): the time to fall diverges as the shove approaches the savable one,
    // so a window read at 1.1x the margin is read at a singular point.
    if (process.env.LADDER === '1') for (const k of [1.02, 1.05, 1.1, 1.2, 1.5, 2, 3]) {
      const x = shove(stance, Math.min(3, lo * k + 0.02), dir);
      emit({ bar: 'ladder', rider: RIDER, stance, dir, k, dv: r(Math.min(3, lo * k + 0.02), 3), fell: x.fell, fellAfterS: r(x.fellAfter, 3), leftFeetAfterS: r(x.leftAfter, 3), beyondAfterS: r(x.beyondAfter, 3), saveWindowS: window(x), lostWindowS: lost(x), loadMin: r(x.loadMin, 2) });
    }
  }
}));

/** The share of a frame-sampled signal's power (Hann window, mean removed) in Mode B's band (2.5–4.5 Hz) and Mode A's (12–17 Hz). */
function bands(samples: number[]): { modeB: number | null; modeA: number | null } {
  const n = samples.length;
  if (n < 32) return { modeB: null, modeA: null };
  const m = samples.reduce((a, b) => a + b, 0) / n;
  const x = samples.map((s, i) => (s - m) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))));
  let total = 0; let b = 0; let a = 0;
  for (let k = 1; k < n / 2; k += 1) {
    let re = 0; let im = 0;
    for (let i = 0; i < n; i += 1) { re += x[i] * Math.cos((2 * Math.PI * k * i) / n); im -= x[i] * Math.sin((2 * Math.PI * k * i) / n); }
    const p = re * re + im * im;
    const f = k / (n * STEP);
    total += p;
    if (f >= 2.5 && f <= 4.5) b += p;
    if (f >= 12 && f <= 17) a += p;
  }
  return { modeB: total > 0 ? r(b / total, 3) : null, modeA: total > 0 ? r(a / total, 3) : null };
}

/** The roll's decay per cycle: successive peaks of one sign, their mean ratio over the first three cycles (3.1d's measure). */
function decayPerCycle(rolls: number[]): number | null {
  const peaks: number[] = [];
  for (let i = 1; i < rolls.length - 1; i += 1) if (Math.abs(rolls[i]) >= Math.abs(rolls[i - 1]) && Math.abs(rolls[i]) > Math.abs(rolls[i + 1]) && Math.abs(rolls[i]) > 1e-4) peaks.push(rolls[i]);
  const ratios: number[] = [];
  for (let i = 0; i + 2 < peaks.length && ratios.length < 3; i += 1) if (Math.sign(peaks[i]) === Math.sign(peaks[i + 2])) ratios.push(Math.abs(peaks[i + 2] / peaks[i]));
  return ratios.length ? r(ratios.reduce((a, b) => a + b, 0) / ratios.length, 3) : null;
}

it('Modes A and B: a roll kick riding straight down the terminal face at 5, 7 and 9 m/s', () => each(() => {
  if (!PARTS.includes('modes')) return;
  const headingOf = (rig: Rig) => { const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation); return Math.atan2(f.x, f.z); };
  for (const speed of [5, 7, 9]) {
    const face = new Slope(terminalAngle(speed));
    const start = steady(face, speed);
    const { rig } = start;
    if (start.fell) { emit({ bar: 'Mode B kick', rider: RIDER, speed, fell: `settling: ${start.fell}` }); continue; }
    rig.board.angularVelocity.addScaledVector(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation), 0.5);
    const rates: number[] = []; const rolls: number[] = [];
    let previous = headingOf(rig); let fell = '';
    for (let i = 0; i < 180; i += 1) {
      const s = frame(rig, face, start.t + (i + 1) * STEP);
      let d = headingOf(rig) - previous;
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      previous = headingOf(rig);
      rates.push(d / STEP);
      rolls.push(rig.board.angularVelocity.dot(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation)));
      if (s.fell) { fell = s.fell; break; }
    }
    const mode = dampedMode(rates, STEP);
    emit({ bar: 'Mode B kick', rider: RIDER, speed, fell, frequencyHz: mode ? r(mode.frequency, 2) : null, damping: mode ? r(mode.damping, 3) : null, rollDecayPerCycle: decayPerCycle(rolls), ...bands(rolls) });
  }
  void G;
}));
