// The board's roll–yaw plant (ruling 29e): the board with a rigid rider, towed on flat water at 5, 7 and 9 m/s.
// PART=captive,step,decay,kick picks parts (default all); RIDER=point|human (default point, the game's riders' yaw
// inertia); SPEEDS=5,7,9. One JSON line per row ($OUT). Analytic water only: no ride session, no game page.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Vector3 } from 'three';
import { DEG, Flat, G, GROUPS, Lab, PARTS, STEP, r, sum, type Hold, type Ledger, type RiderKind } from './plant';

const PART = (process.env.PART ?? 'captive,step,decay,kick').split(',');
const RIDER = (process.env.RIDER ?? 'point') as RiderKind;
const SPEEDS = (process.env.SPEEDS ?? '5,7,9').split(',').map(Number);
/** The rider's place along the board, m from mid-length (shape z; default −0.30, the old rider's in a 7 m/s glide). */
const RIDER_Z = process.env.RIDER_Z !== undefined ? Number(process.env.RIDER_Z) : undefined;
const SETTLE = 2.5;
/** The deck under the rider's centre of mass (shape coordinates). */
const DECK = { x: 0, y: 0.07, z: -0.30 };
const water = new Flat();

function emit(line: unknown): void {
  const out = process.env.OUT;
  if (out) appendFileSync(out, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** A board towed straight and level at v for SETTLE s (roll 0, no yaw, no slip): the steady glide. */
function settled(v: number, rider: RiderKind = RIDER): Lab {
  const lab = new Lab(water, rider, RIDER_Z !== undefined ? { z: RIDER_Z } : {});
  lab.place(v);
  lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0 };
  for (let i = 0; i < Math.round(SETTLE / STEP); i += 1) lab.frame();
  return lab;
}

/** Mean ledger over frames. */
function meanBook(books: Ledger[]): { force: Record<string, Vector3>; moment: Record<string, Vector3>; ramp: { force: Vector3; moment: Vector3 } } {
  const force: Record<string, Vector3> = {};
  const moment: Record<string, Vector3> = {};
  const ramp = { force: new Vector3(), moment: new Vector3() };
  for (const b of books) { ramp.force.addScaledVector(b.ramp.force, 1 / books.length); ramp.moment.addScaledVector(b.ramp.moment, 1 / books.length); }
  for (const p of PARTS) {
    force[p] = new Vector3(); moment[p] = new Vector3();
    for (const b of books) { force[p].add(b.force[p]); moment[p].add(b.moment[p]); }
    force[p].multiplyScalar(1 / books.length); moment[p].multiplyScalar(1 / books.length);
  }
  return { force, moment, ramp };
}

/** Yaw moment (about world up, + toward the board's left), side force (along its level left) and roll moment (about its long axis) by group. */
function split(lab: Lab, book: { force: Record<string, Vector3>; moment: Record<string, Vector3> }) {
  const { fwd, left } = lab.axes();
  const levelLeft = left.clone().setY(0).normalize();
  const out: Record<string, { N: number; Y: number; K: number; Kdeck: number }> = {};
  // The roll moment about the deck under the rider (the 3.2 model's board axis): M + (c − P) × F, along the long axis.
  const deck = lab.board.toWorld(DECK, new Vector3());
  const arm = lab.board.centerOfMass.clone().sub(deck);
  const groups: Record<string, readonly string[]> = { ...GROUPS, radL: ['radL'], radR: ['radR'], pressL: ['pressL'], pressR: ['pressR'], buoyL: ['buoyL'], buoyR: ['buoyR'], finL: ['finL'], finR: ['finR'], finC: ['finC'], railL: ['railL'], railR: ['railR'], waterL: ['waterL'], waterR: ['waterR'] };
  for (const [name, parts] of Object.entries(groups)) {
    const F = sum(book.force as never, parts as never);
    const M = sum(book.moment as never, parts as never);
    out[name] = { N: r(M.y, 2)!, Y: r(F.dot(levelLeft), 1)!, K: r(M.dot(fwd), 1)!, Kdeck: r(M.clone().add(arm.clone().cross(F)).dot(fwd), 2)! };
  }
  if ('ramp' in book) {
    const ramp = (book as unknown as { ramp: { force: Vector3; moment: Vector3 } }).ramp;
    out.ramp = { N: r(ramp.moment.y, 2)!, Y: r(ramp.force.dot(levelLeft), 1)!, K: r(ramp.moment.dot(fwd), 1)!, Kdeck: r(ramp.moment.clone().add(arm.clone().cross(ramp.force)).dot(fwd), 2)! };
  }
  return out;
}

/** Hold `hold` (plus the tow) for `seconds`; the mean split over the last `tail` s and the readings. */
function captive(v: number, hold: Hold, seconds = 0.6, tail = 0.25) {
  const lab = settled(v);
  lab.hold = { speed: v, ...hold };
  const books: Ledger[] = [];
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i += 1) {
    const b = lab.frame();
    if (i >= n - Math.round(tail / STEP)) books.push(b);
  }
  return { lab, parts: split(lab, meanBook(books)), read: lab.read() };
}

it('captive: roll, slip and yaw rate held, the water\'s yaw moment, side force and roll moment by contributor', () => {
  if (!PART.includes('captive')) return;
  for (const v of SPEEDS) {
    const base = captive(v, { roll: 0, yawRate: 0, slip: 0 });
    emit({ part: 'captive', rider: RIDER, v, case: 'straight', read: base.read, parts: base.parts });
    for (const deg of [0.5, 1, 2, 5]) {
      // Roll toward the right rail (left rail up, +): the low rail is the right; a turn into it is a negative yaw.
      const c = captive(v, { roll: deg / DEG, yawRate: 0, slip: 0 });
      emit({ part: 'captive', rider: RIDER, v, case: 'roll', deg, read: c.read, parts: c.parts });
    }
    for (const deg of [0.5, 1, 2]) {
      const c = captive(v, { roll: 0, yawRate: 0, slip: deg / DEG });
      emit({ part: 'captive', rider: RIDER, v, case: 'slip', deg, read: c.read, parts: c.parts });
    }
    // A roll rate about the deck under the rider (the 3.2 model's board rolls under the feet), and about the centre of mass.
    for (const [axis, at] of [['deck', { x: 0, y: 0.07, z: -0.30 }], ['centre', undefined]] as const) for (const p of [0.2, 0.5]) {
      const c = captive(v, { roll: 0, yawRate: 0, slip: 0, rollRate: p, ...(at ? { rollAxis: at } : {}) });
      emit({ part: 'captive', rider: RIDER, v, case: `rollRate-${axis}`, rate: p, read: c.read, parts: c.parts });
    }
    for (const rate of [0.05, 0.1, 0.2]) {
      const c = captive(v, { roll: 0, yawRate: -rate, slip: 0 });
      emit({ part: 'captive', rider: RIDER, v, case: 'yawRate', rate: -rate, read: c.read, parts: c.parts });
    }
  }
});

it('roll steps held, yaw and slip free: the yaw rate\'s gain and time constant, the slip', () => {
  if (!PART.includes('step')) return;
  for (const v of SPEEDS) {
    for (const deg of [0.5, 1, 2, 5]) {
      const lab = settled(v);
      lab.hold = { speed: v, roll: deg / DEG };
      const trace: { t: number; yaw: number; slip: number; pull: number; N: number; Nf: number; Nh: number; Nr: number; Yf: number; Yh: number; Yr: number }[] = [];
      for (let i = 0; i < Math.round(2 / STEP); i += 1) {
        const b = lab.frame();
        const s = lab.read();
        const p = split(lab, meanBook([b]));
        trace.push({ t: (i + 1) * STEP, yaw: s.yawRate, slip: s.slip, pull: -p.all.Y / (lab.board.mass * G * Math.tan(deg / DEG)), N: p.all.N, Nf: p.fins.N, Nh: p.pressure.N + p.buoyancy.N + p.friction.N + p.waterInertia.N + p.radiation.N, Nr: p.rails.N, Yf: p.fins.Y, Yh: p.pressure.Y + p.buoyancy.Y + p.friction.Y + p.waterInertia.Y + p.radiation.Y, Yr: p.rails.Y });
      }
      // Into the low (right) rail is −yaw; report it as +.
      const into = trace.map((x) => -x.yaw);
      const final = into.slice(-30).reduce((a, b) => a + b, 0) / 30;
      const at = (t: number) => into[Math.min(into.length - 1, Math.round(t / STEP) - 1)];
      const t63 = (trace.find((x, i) => into[i] >= 0.632 * final)?.t) ?? Number.NaN;
      const peak = Math.max(...into);
      const turn = (v * final) / (G * Math.tan(deg / DEG));
      const pulls = trace.map((x) => x.pull);
      const pullEnd = pulls.slice(-30).reduce((a, b) => a + b, 0) / 30;
      const pull63 = trace.find((x) => x.pull - pulls[0] >= 0.632 * (pullEnd - pulls[0]))?.t ?? Number.NaN;
      emit({
        part: 'step', rider: RIDER, riderZ: RIDER_Z ?? -0.3, pitch: r(lab.read().pitch, 2), v, deg, yawRateEnd: r(final, 4), gainPerDeg: r(final / deg, 4), peak: r(peak, 4), at010: r(at(0.1), 4), at025: r(at(0.25), 4), at050: r(at(0.5), 4), t63: r(t63, 3),
        turnPull: r(turn, 3), pullFirst: r(pulls[0], 3), pullAt010: r(pulls[5], 3), pullAt025: r(pulls[14], 3), pullEnd: r(pullEnd, 3), pull63: r(pull63, 3), slipEnd: r(trace[trace.length - 1].slip, 3), slipAt025: r(trace[14].slip, 3),
        first: trace[0], at025split: trace[14], end: trace[trace.length - 1],
      });
      if (process.env.TRACE === `${v},${deg}`) for (const x of trace) emit({ part: 'stepTrace', v, deg, ...Object.fromEntries(Object.entries(x).map(([k, y]) => [k, r(y, 4)])) });
    }
  }
});

/** Successive roll peaks: the frequency and the damping ratio from the log decrement. */
function ringing(t: number[], x: number[]): { frequency: number; damping: number; peaks: number } {
  const ext: { t: number; x: number }[] = [];
  for (let i = 1; i < x.length - 1; i += 1) if ((x[i] > x[i - 1] && x[i] >= x[i + 1]) || (x[i] < x[i - 1] && x[i] <= x[i + 1])) ext.push({ t: t[i], x: x[i] });
  if (ext.length < 3) return { frequency: Number.NaN, damping: Number.NaN, peaks: ext.length };
  const half = (ext[Math.min(ext.length - 1, 4)].t - ext[0].t) / (Math.min(ext.length - 1, 4));
  const ratios: number[] = [];
  for (let i = 0; i + 1 < Math.min(ext.length, 6); i += 1) ratios.push(Math.abs(ext[i + 1].x / ext[i].x));
  const delta = -Math.log(ratios.reduce((a, b) => a * b, 1)) / ratios.length * 2; // per full cycle
  return { frequency: 1 / (2 * half), damping: delta / Math.sqrt(4 * Math.PI * Math.PI + delta * delta), peaks: ext.length };
}

it('free roll decay from 3°, the rider rigid: roll damping ratio and frequency from the water alone', () => {
  if (!PART.includes('decay')) return;
  for (const rider of ['point', 'human', 'none'] as const) for (const v of SPEEDS) for (const yaw of ['free', 'held'] as const) {
    const lab = settled(v, rider);
    // Released at 3° (left rail up), roll rate 0.
    lab.hold = { speed: v, roll: 3 / DEG, ...(yaw === 'held' ? { yawRate: 0, slip: 0 } : {}) };
    lab.frame();
    lab.hold = { speed: v, ...(yaw === 'held' ? { yawRate: 0, slip: 0 } : {}) };
    const ts: number[] = []; const rolls: number[] = []; const yaws: number[] = []; const Ks: number[] = []; const rates: number[] = [];
    let capsized = '';
    for (let i = 0; i < Math.round(3 / STEP); i += 1) {
      const b = lab.frame();
      const s = lab.read();
      ts.push((i + 1) * STEP); rolls.push(s.roll); yaws.push(s.yawRate); rates.push(s.rollRate);
      Ks.push(split(lab, meanBook([b])).all.K);
      if (Math.abs(s.roll) > 45) { capsized = `rolled past 45° at ${r((i + 1) * STEP, 2)} s`; break; }
    }
    const ring = ringing(ts, rolls);
    // The water's roll moment against roll and roll rate (least squares on the first 1.5 s): stiffness and damping.
    const n = Math.min(ts.length, Math.round(1.5 / STEP));
    let a11 = 0; let a12 = 0; let a22 = 0; let b1 = 0; let b2 = 0;
    for (let i = 0; i < n; i += 1) { const p = rolls[i] / DEG; const q = rates[i]; a11 += p * p; a12 += p * q; a22 += q * q; b1 += -Ks[i] * p; b2 += -Ks[i] * q; }
    const det = a11 * a22 - a12 * a12;
    const stiffness = (b1 * a22 - b2 * a12) / det;
    const damping = (a11 * b2 - a12 * b1) / det;
    emit({ part: 'decay', rider, v, yaw, capsized, frequencyHz: r(ring.frequency, 3), dampingRatio: r(ring.damping, 3), peaks: ring.peaks, waterRollStiffness: r(stiffness, 1), waterRollDamping: r(damping, 2), rollAt: [0.1, 0.25, 0.5, 1, 2].map((t) => r(rolls[Math.round(t / STEP) - 1] ?? Number.NaN, 3)), yawAt: [0.1, 0.25, 0.5, 1, 2].map((t) => r(yaws[Math.round(t / STEP) - 1] ?? Number.NaN, 4)) });
    if (process.env.TRACE === `decay,${rider},${v},${yaw}`) for (let i = 0; i < ts.length; i += 1) emit({ part: 'decayTrace', t: r(ts[i]), roll: r(rolls[i], 4), yaw: r(yaws[i], 4), K: Ks[i] });
  }
});

it('a yaw-rate kick of 0.2 rad/s at zero roll: its decay and the slip', () => {
  if (!PART.includes('kick')) return;
  for (const v of SPEEDS) for (const roll of ['held', 'free'] as const) {
    const lab = settled(v);
    lab.hold = { speed: v, ...(roll === 'held' ? { roll: 0 } : {}) };
    lab.board.angularVelocity.add(new Vector3(0, 0.2, 0));
    const ts: number[] = []; const yaws: number[] = []; const slips: number[] = []; const rolls: number[] = [];
    for (let i = 0; i < Math.round(1.5 / STEP); i += 1) {
      lab.frame();
      const s = lab.read();
      ts.push((i + 1) * STEP); yaws.push(s.yawRate); slips.push(s.slip); rolls.push(s.roll);
    }
    const t37 = ts.find((_, i) => yaws[i] <= 0.2 * Math.exp(-1)) ?? Number.NaN;
    emit({ part: 'kick', rider: RIDER, v, roll, t37: r(t37, 3), yawAt: [1 / 60, 0.05, 0.1, 0.25, 0.5, 1].map((t) => r(yaws[Math.max(0, Math.round(t / STEP) - 1)], 4)), slipAt: [1 / 60, 0.05, 0.1, 0.25, 0.5, 1].map((t) => r(slips[Math.max(0, Math.round(t / STEP) - 1)], 3)), rollAt: [0.1, 0.25, 0.5, 1].map((t) => r(rolls[Math.round(t / STEP) - 1], 3)) });
  }
});

it('a sideways push on the deck under the rider (the feet\'s across force): the yaw it makes', () => {
  if (!PART.includes('push')) return;
  // Deck top at the rider's station, 0.30 m behind mid-length (shape y: rocker + thickness there, about 0.07 m).
  for (const v of SPEEDS) for (const roll of ['held', 'free'] as const) for (const force of [20, 50]) {
    const lab = settled(v);
    lab.hold = { speed: v, ...(roll === 'held' ? { roll: 0 } : {}), push: { force, at: { x: 0, y: 0.07, z: -0.30 } } };
    const ts: number[] = []; const yaws: number[] = []; const slips: number[] = []; const rolls: number[] = []; const books: Ledger[] = [];
    for (let i = 0; i < Math.round(1.5 / STEP); i += 1) {
      const b = lab.frame();
      const s = lab.read();
      ts.push((i + 1) * STEP); yaws.push(s.yawRate); slips.push(s.slip); rolls.push(s.roll);
      if (i === 14 || i === 89) books.push(b);
    }
    const at = (t: number) => Math.max(0, Math.round(t / STEP) - 1);
    emit({
      part: 'push', rider: RIDER, v, roll, force, yawAt: [0.05, 0.1, 0.25, 0.5, 1, 1.5].map((t) => r(yaws[at(t)], 4)), slipAt: [0.05, 0.1, 0.25, 0.5, 1, 1.5].map((t) => r(slips[at(t)], 3)),
      rollAt: [0.1, 0.25, 0.5, 1, 1.5].map((t) => r(rolls[at(t)], 3)), at025: split(lab, meanBook([books[0]])), at150: split(lab, meanBook([books[1]])),
    });
  }
});

it('the drag carried through feet off the stringer: a forward force at the deck 1 and 3 cm toward the right rail', () => {
  if (!PART.includes('cop')) return;
  // About the hull's drag at the speed (0.2 of the weight, the README's 0.18–0.24 g), pushing forward at the feet's
  // centre of pressure, with the tow keeping the speed (so it is the drag passed through the feet, not extra thrust).
  for (const rider of ['point', 'human'] as const) for (const v of SPEEDS) for (const off of [0.01, 0.03]) {
    const lab = settled(v, rider);
    lab.hold = { speed: v, roll: 0, push: { force: 0.2 * 75.5 * G, at: { x: -off, y: 0.07, z: -0.30 }, forward: true } };
    const yaws: number[] = []; const slips: number[] = [];
    for (let i = 0; i < Math.round(1 / STEP); i += 1) { lab.frame(); const s = lab.read(); yaws.push(s.yawRate); slips.push(s.slip); }
    const at = (t: number) => Math.max(0, Math.round(t / STEP) - 1);
    const peak = yaws.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    emit({ part: 'cop', rider, v, offsetCm: off * 100, momentNm: r(0.2 * 75.5 * G * off, 2), yawAt: [1 / 60, 0.05, 0.1, 0.25, 0.5, 1].map((t) => r(yaws[at(t)], 4)), peak: r(peak, 4), peakAt: r((yaws.indexOf(peak) + 1) * STEP, 3), slipAt: [0.1, 0.25, 1].map((t) => r(slips[at(t)], 3)) });
  }
});
