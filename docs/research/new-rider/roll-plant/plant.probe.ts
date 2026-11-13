// The board's roll–yaw plant (ruling 29e): the board with a rigid rider, towed on flat water at 5, 7 and 9 m/s.
// PART=captive,step,decay,kick,rail,pitch picks parts (default all but rail; RAILS for it); RIDER=point|human (default point, the game's riders' yaw
// inertia); SPEEDS=5,7,9. One JSON line per row ($OUT). Analytic water only: no ride session, no game page.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Vector3 } from 'three';
import { DEG, Flat, G, GROUPS, Lab, PARTS, STEP, euler, r, sum, type Hold, type Ledger, type RiderKind } from './plant';

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

/**
 * Step 3.2f (ruling 29j): the plant at a big rail. At each speed and each held rail, the board is first held at that
 * roll with the yaw and the slip FREE for TRIM s, so it settles into the turn that rail makes (the trim: its yaw rate
 * r0, slip b0, pitch and draft; the last 2 s averaged, and its spread reported, since some rails never settle). Then
 * the twelve derivatives are measured about that trim by central differences: the trim triple is held, and one of roll
 * (±1°), slip (±1°), the yaw rate (±0.1 rad/s) and the roll rate about the deck (±0.2 rad/s) is perturbed. Each
 * perturbation runs on from the one before (the same lab, no fresh settle), HOLD s, the last TAIL s averaged, because
 * jumping from straight running to a big rail takes about 2 s of pitch and heave to settle. The base is measured at the
 * start and again at the end, so the drift over the point is on the record. RAILS=0,10,20,30,40.
 */
it('the plant at a held rail: the trim of the turn it makes, and the derivatives about it', () => {
  if (!PART.includes('rail')) return;
  const RAILS = (process.env.RAILS ?? '0,10,20,30,40').split(',').map(Number);
  const TRIM = Number(process.env.TRIM ?? 8);
  const HOLD = Number(process.env.HOLD ?? 0.6);
  const TAIL = Number(process.env.TAIL ?? 0.25);
  const DECK_AT = { x: 0, y: 0.07, z: -0.30 };
  for (const v of SPEEDS) for (const rail of RAILS) {
    const lab = settled(v);
    lab.hold = { speed: v, roll: rail / DEG };
    const reads: ReturnType<Lab['read']>[] = [];
    const levels: number[] = [];
    const books: Ledger[] = [];
    const n = Math.round(TRIM / STEP);
    for (let i = 0; i < n; i += 1) {
      const b = lab.frame();
      if (i >= n - Math.round(2 / STEP)) {
        books.push(b); reads.push(lab.read());
        // Wrapped into (−π, π]: the board turns, so both angles pass ±π and their difference must not jump.
        const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
        levels.push(d - 2 * Math.PI * Math.round(d / (2 * Math.PI)));
      }
    }
    const mean = (pick: (x: ReturnType<Lab['read']>) => number) => reads.reduce((a, x) => a + pick(x), 0) / reads.length;
    const spread = (pick: (x: ReturnType<Lab['read']>) => number) => Math.max(...reads.map(pick)) - Math.min(...reads.map(pick));
    const r0 = mean((x) => x.yawRate);
    // The slip the hold takes is the path's angle in the LEVEL plane (its `dir = heading − slip`), which is what a
    // turn's sideslip means. `read().slip` is the body-frame one: at a rolled board it mixes in the heave, and is near
    // zero where the level slip is −3.3° (rail 20) or −5.6° (rail 30). Holding `read().slip` at a big rail put the
    // board far off its trim (at 30° it sank to the tank's floor within a second); holding the level slip holds it
    // exactly (pitch, draft and the forces steady to the last digit over 3 s).
    const b0 = levels.reduce((a, x) => a + x, 0) / levels.length;
    const trim = {
      roll: rail, yawRate: r(r0, 4), slipDeg: r(b0 * DEG, 3), bodySlipDeg: r(mean((x) => x.slip), 3), pitch: r(mean((x) => x.pitch), 2), draft: r(mean((x) => x.draft), 3),
      yawSpread: r(spread((x) => x.yawRate), 4), slipSpread: r(spread((x) => x.slip), 3), pitchSpread: r(spread((x) => x.pitch), 2),
      // The turn's pull over what the rail's lean would balance (the lab's G): V r0 / (g tan rail).
      pull: rail > 0 ? r(Math.abs(v * r0) / (G * Math.tan(rail / DEG)), 3) : null,
    };
    const stalled = !Number.isFinite(r0) || !Number.isFinite(b0) || Math.abs(b0 * DEG) > 20 || Math.abs(mean((x) => x.slip)) > 20;
    emit({ part: 'rail', rider: RIDER, v, rail, case: 'trim', trim, stalled, parts: stalled ? {} : split(lab, meanBook(books)) });
    // A board that spun out or stalled has no plant about a turn: its derivatives are not measured.
    if (stalled) { emit({ part: 'rail', rider: RIDER, v, rail, case: 'derivatives', trim, stalled: true }); continue; }
    // On from the trim: the trim held BACK s to settle again, then the triple HOLD s, the last TAIL s averaged. A roll
    // rate is held for RATE_HOLD s only (it is a rate: the roll itself drifts while it acts).
    const hold = (h: Hold, seconds = HOLD, tail = TAIL) => {
      lab.hold = { speed: v, roll: rail / DEG, yawRate: r0, slip: b0 };
      for (let i = 0; i < Math.round(Number(process.env.BACK ?? 0.8) / STEP); i += 1) lab.frame();
      lab.hold = { speed: v, roll: rail / DEG, yawRate: r0, slip: b0, ...h };
      const bs: Ledger[] = [];
      const m = Math.round(seconds / STEP);
      for (let i = 0; i < m; i += 1) { const b = lab.frame(); if (i >= m - Math.round(tail / STEP)) bs.push(b); }
      const p = split(lab, meanBook(bs));
      return { N: p.all.N, Y: p.all.Y, K: p.all.Kdeck };
    };
    const RATE_HOLD = Number(process.env.RATE_HOLD ?? 0.25);
    const centre = (lo: { N: number; Y: number; K: number }, hi: { N: number; Y: number; K: number }, d: number) => [r((hi.N - lo.N) / d, 1), r((hi.Y - lo.Y) / d, 1), r((hi.K - lo.K) / d, 1)];
    const base = hold({});
    const rollLo = hold({ roll: (rail - 1) / DEG });
    const rollHi = hold({ roll: (rail + 1) / DEG });
    const slipLo = hold({ slip: b0 - 1 / DEG });
    const slipHi = hold({ slip: b0 + 1 / DEG });
    const yawLo = hold({ yawRate: r0 - 0.1 });
    const yawHi = hold({ yawRate: r0 + 0.1 });
    const rateLo = hold({ rollRate: -0.2, rollAxis: DECK_AT }, RATE_HOLD, 0.1);
    const rateHi = hold({ rollRate: 0.2, rollAxis: DECK_AT }, RATE_HOLD, 0.1);
    const again = hold({});
    emit({
      part: 'rail', rider: RIDER, v, rail, case: 'derivatives', trim,
      base: [r(base.N, 1), r(base.Y, 1), r(base.K, 1)], drift: [r(again.N - base.N, 1), r(again.Y - base.Y, 1), r(again.K - base.K, 1)],
      roll: centre(rollLo, rollHi, 2 / DEG), slip: centre(slipLo, slipHi, 2 / DEG), yaw: centre(yawLo, yawHi, 0.2), rate: centre(rateLo, rateHi, 0.4),
    });
  }
});

/**
 * Step 3.2g (ruling 29k): the PITCH plant, measured as the rail plant was. At each speed the board is towed straight
 * and left free in pitch and heave until it settles (the trim). Then the pitch and the height are held at the trim and
 * the derivatives are central differences about it: the pitch moment M (about the board's lateral axis through the deck
 * under the rider, where the feet are) and the vertical force Z, per rad of pitch (±1°), per metre of heave (±2 cm),
 * per rad/s of pitch rate (±0.2, nose up +) and per m/s of heave rate (±0.2, up +). M is nose up +, Z is up +. PITCHES adds offsets to the trim (degrees), to see
 * whether the plant bends: the nose-high end at low speed and the bow burying at the other.
 */
it('the pitch plant: the trim, and the derivatives about it', () => {
  if (!PART.includes('pitch')) return;
  const OFFSETS = (process.env.PITCHES ?? '0,-3,3,6').split(',').map(Number);
  const SETTLE2 = Number(process.env.TRIM ?? 6);
  const HOLD = Number(process.env.HOLD ?? 0.6);
  const TAIL = Number(process.env.TAIL ?? 0.25);
  const BACK = Number(process.env.BACK ?? 0.8);
  const DECK_AT = { x: 0, y: 0.07, z: -0.30 };
  for (const v of SPEEDS) {
    // The trim: towed straight, pitch and heave free.
    const lab = settled(v);
    lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0 };
    const reads: ReturnType<Lab['read']>[] = [];
    const heights: number[] = [];
    const n = Math.round(SETTLE2 / STEP);
    for (let i = 0; i < n; i += 1) {
      lab.frame();
      if (i >= n - Math.round(1 / STEP)) { reads.push(lab.read()); heights.push(lab.board.centerOfMass.y); }
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    const pitch0 = mean(reads.map((x) => x.pitch)) / DEG;
    const y0 = mean(heights);
    emit({ part: 'pitch', rider: RIDER, v, case: 'trim', pitchDeg: r(pitch0 * DEG, 2), heightM: r(y0, 4), draft: r(mean(reads.map((x) => x.draft)), 4), pitchSpread: r(spread(reads.map((x) => x.pitch)), 2), heightSpread: r(spread(heights), 4) });
    for (const off of OFFSETS) {
      const base = pitch0 + off / DEG;
      // The height at this pitch: held free in heave for BACK s with the pitch held, then its own mean.
      lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0, pitch: base };
      const hs: number[] = [];
      for (let i = 0; i < Math.round(1.5 / STEP); i += 1) { lab.frame(); if (i >= Math.round(1 / STEP)) hs.push(lab.board.centerOfMass.y); }
      const yBase = mean(hs);
      const hold = (h: Hold) => {
        lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0, pitch: base, height: yBase };
        for (let i = 0; i < Math.round(BACK / STEP); i += 1) lab.frame();
        lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0, pitch: base, height: yBase, ...h };
        const bs: Ledger[] = [];
        const m = Math.round(HOLD / STEP);
        for (let i = 0; i < m; i += 1) { const b = lab.frame(); if (i >= m - Math.round(TAIL / STEP)) bs.push(b); }
        const book = meanBook(bs);
        const F = sum(book.force as never, GROUPS.all as never);
        const M = sum(book.moment as never, GROUPS.all as never);
        const { left } = lab.axes();
        const deck = lab.board.toWorld(DECK_AT, new Vector3());
        const arm = lab.board.centerOfMass.clone().sub(deck);
        // The pitch moment about the deck under the rider, nose up +: the board's left axis is +x, so nose up is −left.
        return { M: -M.clone().add(arm.clone().cross(F)).dot(left), Z: F.y, pitch: lab.read().pitch, draft: lab.read().draft };
      };
      const centre = (lo: { M: number; Z: number }, hi: { M: number; Z: number }, d: number) => [r((hi.M - lo.M) / d, 1), r((hi.Z - lo.Z) / d, 1)];
      const b0 = hold({});
      const pLo = hold({ pitch: base - 1 / DEG });
      const pHi = hold({ pitch: base + 1 / DEG });
      const zLo = hold({ height: yBase - 0.02 });
      const zHi = hold({ height: yBase + 0.02 });
      const qLo = hold({ pitchRate: -0.2 });
      const qHi = hold({ pitchRate: 0.2 });
      const wLo = hold({ heaveRate: -0.2 });
      const wHi = hold({ heaveRate: 0.2 });
      const again = hold({});
      emit({
        part: 'pitch', rider: RIDER, v, case: 'derivatives', offset: off, pitchDeg: r(base * DEG, 2), heightM: r(yBase, 4), draft: r(b0.draft, 4),
        base: [r(b0.M, 1), r(b0.Z, 1)], drift: [r(again.M - b0.M, 1), r(again.Z - b0.Z, 1)],
        pitch: centre(pLo, pHi, 2 / DEG), heave: centre(zLo, zHi, 0.04), pitchRate: centre(qLo, qHi, 0.4), heaveRate: centre(wLo, wHi, 0.4),
        drafts: { base: r(b0.draft, 4), heaveLo: r(zLo.draft, 4), heaveHi: r(zHi.draft, 4), pitchLo: r(pLo.draft, 4), pitchHi: r(pHi.draft, 4) },
      });
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
