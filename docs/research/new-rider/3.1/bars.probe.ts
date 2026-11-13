// The new surfer, step 3.1 (docs/research/new-rider/design.md §7): bars N1 to N5 on analytic water, and the roll checks
// for P4e's Modes A and B. RIDER=new runs the new rider (`rider: 'new'`); without it, the old. One line per row ($OUT).
// No ride session, catch report or autopilot ride: planar faces, a tilting face, a rising surface and flat water only.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { dampedMode, turnMeasures } from '../../../../src/dev/carveMetrics';
import { Rising, STEP, Slope, Tilting, emit, mean, place, r, run, state, type Rig, type State } from '../../board-in-water/lab';

const G = 9.81;
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const DEG = 180 / Math.PI;

interface Inner { finish: (h: number, b: unknown) => void; work: { contact: number }; attached: boolean; separation?: string; leg: { extension: number }; standingBody?: { pitch: { angle: number } } }

/** Books each substep's net contact work on board and body together (the study's measure) and its span. */
function ledger(rig: Rig): { works: number[]; spans: number[] } {
  const board = rig.board;
  const rider = rig.rider! as unknown as Inner;
  const works: number[] = [];
  const spans: number[] = [];
  const original = rider.finish.bind(rider);
  rider.finish = (h, b) => {
    const before = board.work.rider + rider.work.contact;
    original(h, b);
    works.push(board.work.rider + rider.work.contact - before);
    spans.push(h);
  };
  return { works, spans };
}

/** The peak net power per substep, and the most net work over any 0.5 s, as power, W. */
function powers(works: number[], spans: number[]): { sub: number; window: number } {
  let sub = 0;
  for (let k = 0; k < works.length; k += 1) sub = Math.max(sub, works[k] / spans[k]);
  let window = 0;
  let sum = 0;
  let span = 0;
  let from = 0;
  for (let k = 0; k < works.length; k += 1) {
    sum += works[k];
    span += spans[k];
    while (span - spans[from] >= 0.5 - 1e-9) { sum -= works[from]; span -= spans[from]; from += 1; }
    window = Math.max(window, sum / 0.5);
  }
  return { sub, window };
}

const ankle = (rig: Rig) => ((rig.rider as unknown as Inner).standingBody?.pitch.angle ?? 0) * DEG;
const headingOf = (rig: Rig) => { const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation); return Math.atan2(f.x, f.z); };
const rail = (rig: Rig) => -Math.asin(Math.max(-1, Math.min(1, new Vector3(1, 0, 0).applyQuaternion(rig.board.orientation).y)));

it('N1 and N4: steep faces, placed and tilted in, the five lines', () => {
  for (const kind of ['placed', 'tilted'] as const) for (const heading of [0, 20, 45, 135, 180]) for (const angle of [25, 30, 35, 40, 45, 50]) {
    const up = heading > 90;
    const ramp = up ? 0.8 : 1.5;
    const water = kind === 'placed' ? new Slope(angle) : new Tilting(angle, ramp);
    const rig = place(water, 0, heading, 6, 'standing');
    const rider = rig.rider! as unknown as Inner;
    const board = rig.board;
    const { works, spans } = ledger(rig);
    const seconds = kind === 'placed' ? 1.5 : 2.5;
    let frameW = 0; let accelAll = 0; let accelLate = 0; let fell = ''; let t = 0; let on05 = true; let peakLoad = 0; let ankleMax = 0;
    let last = board.velocity.clone(); let lastW = board.work.rider + rider.work.contact;
    for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
      (water as { advance?: (dt: number) => void }).advance?.(STEP);
      board.step(STEP, water);
      t = (i + 1) * STEP;
      const w = board.work.rider + rider.work.contact;
      frameW = Math.max(frameW, (w - lastW) / STEP); lastW = w;
      const a = board.velocity.distanceTo(last) / STEP / G; last = board.velocity.clone();
      accelAll = Math.max(accelAll, a);
      if (t > 0.1) accelLate = Math.max(accelLate, a);
      peakLoad = Math.max(peakLoad, rig.rider!.contact.load);
      ankleMax = Math.max(ankleMax, Math.abs(ankle(rig)));
      if (!rider.attached) { fell = String(rider.separation); if (t <= 0.5 + 1e-9) on05 = false; break; }
    }
    const p = powers(works, spans);
    const s = state(rig, water, t);
    const down = new Vector3(0, -Math.sin(angle / DEG), Math.cos(angle / DEG));
    emit({
      bar: 'N1/N4', rider: RIDER, kind, heading, angle, fell, t: r(t, 3), on05, frameW: r(frameW, 0), subW: r(p.sub, 0), window05W: r(p.window, 0),
      boardG: r(accelAll, 1), boardGafter01: r(accelLate, 1), peakLoad: r(peakLoad, 2), ankleMaxDeg: r(ankleMax, 1), speed: r(s.speed, 2), alongFallLine: r(board.velocity.dot(down), 2),
    });
  }
});

/** Frames within `band` of speed `v` after `after` s, averaged. */
function atSpeed(frames: State[], v: number, band = 0.25, after = 0.15): State | undefined {
  const near = frames.filter((f) => f.t >= after && Math.abs(f.speed - v) <= band);
  return near.length ? mean(near) : undefined;
}

it('N2: straight down a 20° face from 4 m/s', () => {
  for (const angle of [20, 35, 50]) {
    const face = new Slope(angle);
    const rig = place(face, 0, 0, 4, 'standing');
    const ankles: number[] = [];
    const frames = run(rig, face, 2.5, () => ankles.push(ankle(rig)));
    const end = frames[frames.length - 1];
    const at = (v: number) => { const s = atSpeed(frames, v); return s ? { pitch: r(s.pitch, 1), draft: r(s.draft * 100, 1) } : null; };
    const last = frames.filter((f) => f.t > end.t - 0.5);
    emit({
      bar: 'N2', rider: RIDER, angle, t: r(end.t, 2), fell: end.fell ?? '', speedEnd: r(end.speed, 2), gain: r(end.speed - 4, 2),
      pitchAt5: at(5), pitchAt7: at(7), pitchAt9: at(9), pitchLast05: r(mean(last).pitch, 1), pitchEnd: r(end.pitch, 1), draftEnd: r(end.draft * 100, 1),
      ankleEndDeg: r(ankles[ankles.length - 1] ?? 0, 1),
    });
  }
});

/** The bumps probe's row (`../../board-in-water/bumps.probe.ts`): a standing glide at 7.4 m/s, the surface rising from 0.5 s. */
function bump(name: string, water: Rising): void {
  const rig = place(water, 0, 0, 7.4, 'standing');
  const { board, rider } = rig;
  let peakLoad = 0; let legMin = Infinity; let fell = ''; let fellAt = Number.NaN;
  for (let i = 0; i < Math.round(1.7 / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    if (t > 0.5) { peakLoad = Math.max(peakLoad, rider!.contact.load); legMin = Math.min(legMin, rider!.leg.extension); }
    const s = state(rig, water, t);
    if (s.fell) { fell = s.fell; fellAt = t - 0.5; break; }
  }
  emit({ bar: 'N3', rider: RIDER, name, peakLoad: r(peakLoad, 2), kneesCm: r(-legMin * 100, 1), fell, fellAfter: r(fellAt, 2) });
}

it('N3: the surface rising under a 7.4 m/s glide', () => {
  for (const rate of [1, 2, 4]) bump(`rises 20 cm at ${rate} m/s`, new Rising(0.5, rate, 0.2));
  bump('rises 5 cm at 4 m/s', new Rising(0.5, 4, 0.05));
});

it('N5: flat glides, held carves, the 4 s full carve on the 15° plane', () => {
  const flat = new Slope(0);
  for (const v of [5, 7, 9, 12]) {
    const rig = place(flat, 0, 0, v + 0.8, 'standing');
    const f = run(rig, flat, 3);
    const s = atSpeed(f, v, 0.15, 0.25);
    emit({ bar: 'N5 glide', rider: RIDER, v, fell: f[f.length - 1].fell ?? '', draftCm: s ? r(s.draft * 100, 1) : null, pitch: s ? r(s.pitch, 1) : null, decelG: r((f[10].speed - f[40].speed) / 0.5 / G, 3), ankleDeg: r(ankle(rig), 1) });
  }
  for (const compress of [0, 1]) {
    const rig = place(flat, 0, 0, 7.7, 'standing');
    const f = run(rig, flat, 3, undefined, (t) => {
      if (t > 0.2) { rig.rider!.steer = 1; rig.rider!.compress = compress; rig.rider!.crouch = compress ? 0.6 : 0; }
    });
    const end = f[f.length - 1];
    emit({ bar: 'N5 held carve', rider: RIDER, stance: compress ? 'Compress' : 'standing', t: r(end.t, 2), fell: end.fell ?? '', speedEnd: r(end.speed, 2), bank: r(end.bank, 1) });
  }
  // The carve lab's envelope (scripts/carve-lab.ts `carve`): straight down the 15° face, 0.3 s, then full steer held 4 s.
  const face = new Slope(15);
  for (const speed of [5, 7, 9]) {
    const rig = place(face, 0, 0, speed, 'standing');
    for (let i = 0; i < 18; i += 1) rig.board.step(STEP, face);
    rig.rider!.steer = 1;
    const headings: number[] = []; const rails: number[] = []; const rolls: number[] = [];
    let time = 0;
    for (let i = 0; i < 240 && rig.rider!.attached; i += 1) {
      rig.board.step(STEP, face);
      time += STEP;
      headings.push(headingOf(rig));
      rails.push(rail(rig));
      rolls.push(rig.board.angularVelocity.dot(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation)));
    }
    const tail = Math.min(60, headings.length - 1);
    const rate = tail > 0 ? turnMeasures(headings.slice(-tail - 1), STEP, 360).yaw / (tail * STEP) : Number.NaN;
    const lastRails = rails.slice(-tail);
    emit({
      bar: 'N5 full carve 15°', rider: RIDER, speed, on: r(time, 2), attached: rig.rider!.attached, fell: rig.rider!.attached ? '' : String(rig.rider!.separation),
      yawRate: r(rate, 2), railDeg: r((lastRails.reduce((a, b) => a + b, 0) / Math.max(1, lastRails.length)) * DEG, 1), speedEnd: r(rig.board.velocity.length(), 2), ...bands(rolls),
    });
  }
});

/** The share of a frame-sampled signal's power (Hann window, mean removed) in the Mode B band (2.5–4.5 Hz) and Mode A's (12–17 Hz). */
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

it('Modes A and B: the roll after a kick riding straight, and the roll riding straight', () => {
  const face = new Slope(15);
  for (const speed of [5, 7, 9]) {
    // The carve lab's `wobble`: a roll kick of 0.5 rad/s; the yaw rate's ringing (P4e's Mode B).
    const rig = place(face, 0, 0, speed, 'standing');
    for (let i = 0; i < 60; i += 1) rig.board.step(STEP, face);
    rig.board.angularVelocity.addScaledVector(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation), 0.5);
    const rates: number[] = []; const rolls: number[] = [];
    let previous = headingOf(rig);
    for (let i = 0; i < 180 && rig.rider!.attached; i += 1) {
      rig.board.step(STEP, face);
      let d = headingOf(rig) - previous;
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      previous = headingOf(rig);
      rates.push(d / STEP);
      rolls.push(rig.board.angularVelocity.dot(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation)));
    }
    const mode = dampedMode(rates, STEP);
    emit({ bar: 'Mode B kick', rider: RIDER, speed, attached: rig.rider!.attached, frequencyHz: mode ? r(mode.frequency, 2) : null, damping: mode ? r(mode.damping, 3) : null, ...bands(rolls) });
  }
  // Straight down the 15° face for 5 s with no input: the roll's bands and the yaw rate's sign flips.
  for (const speed of [6, 8]) {
    const rig = place(face, 0, 0, speed, 'standing');
    const rolls: number[] = []; let flips = 0; let lastSign = 0; let t = 0;
    for (let i = 0; i < 300 && rig.rider!.attached; i += 1) {
      rig.board.step(STEP, face);
      t += STEP;
      const roll = rig.board.angularVelocity.dot(new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation));
      rolls.push(roll);
      const yaw = rig.board.angularVelocity.y;
      const sign = Math.abs(yaw) > 1e-3 ? Math.sign(yaw) : 0;
      if (sign !== 0 && lastSign !== 0 && sign !== lastSign) flips += 1;
      if (sign !== 0) lastSign = sign;
    }
    const peakRoll = rolls.reduce((a, b) => Math.max(a, Math.abs(b)), 0);
    emit({ bar: 'Modes straight', rider: RIDER, speed, on: r(t, 2), attached: rig.rider!.attached, yawFlips: flips, peakRollRate: r(peakRoll, 3), ...bands(rolls) });
  }
});
