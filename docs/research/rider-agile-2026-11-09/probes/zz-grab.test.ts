// The rail grab's probe (rider-agile stage 2a; not part of the suite; the agile legs' probe with the hand button). HAND=1 (the hand button with Snap),
// HOLD=<s> (Snap held), REL=<s> (let go that long after the launch instead), LEAD=<s> (Snap and the hand before the steer), FASTER=<m/s>, OPTS='{"agile":"on"}',
// S=1 (the steer under Snap), CASE=face|climb|flat, RAMP=0 (pad), OUT=<file.json>.
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import type { SurfWater } from './SurfWater';
import { FaceWater } from './testing/FaceWater';
import { DEG, Ramp, STEP, diff, frameOf, onWater, r, type Frame, type Rig } from './zz-r2Lab';

const CASE = process.env.CASE ?? 'face';
const OUT = process.env.OUT ?? '/dev/null';
const RAMP = Number(process.env.RAMP ?? 0);
const S = Number(process.env.S ?? 1);
const OPTS = JSON.parse(process.env.OPTS ?? '{}');
const HAND = Number(process.env.HAND ?? 0);
const extra = { grabAt: Number.NaN, hand: 0, hip: 0, roll: 0, rest: 0, launchAt: Number.NaN, head: 0 };
const FALL = new Vector3(0, 0, 1);
const DIRN = CASE === 'face' ? -1 : 1;
// The lead: Snap (and the hand button) held this long before the steer, so the body is down and the hand on the rail.
const LEAD = Number(process.env.LEAD ?? 0);
// With REL, Snap (and the hand) let go that long after the launch, whenever the launch came.
const REL = Number(process.env.REL ?? 0);
type Water = SurfWater & { advance?: (dt: number) => void; faceFraction?: (z: number) => number };

function rigOn(water: SurfWater, x: number, z: number, heading: number, speed: number): Rig {
  const base = onWater(water, x, z, heading, speed);
  const board = base.board as BoardBody;
  board.attach(new AttachedRider(board.shape, { phase: 'standing', ...OPTS }));
  return { board, get rider() { return board.rider as AttachedRider; }, get heading() { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); } } as Rig;
}

interface Plan { steer: number; snap: number; phase: string }

function run(rig: Rig, water: Water, seconds: number, plan: (t: number, rig: Rig) => Plan) {
  Object.assign(extra, { grabAt: Number.NaN, hand: 0, hip: 0, roll: 0, rest: 0, launchAt: Number.NaN, head: 0 });
  const frames: Frame[] = [];
  let last = rig.heading; let fell = Number.NaN; let fellIn = ''; let cause = '';
  const steer = new Ramp(RAMP); const snap = new Ramp(RAMP);
  for (let n = 0; n < Math.round(seconds / STEP); n += 1) {
    const t = n * STEP;
    const p = plan(t, rig);
    if (REL > 0 && !Number.isNaN(extra.launchAt) && t >= extra.launchAt + REL - 1e-9) p.snap = 0;
    const rider = rig.board.rider as AttachedRider;
    rider.steer = steer.update(p.steer, STEP); rider.snap = snap.update(p.snap, STEP); rider.hand = HAND > 0 && p.snap > 0; rider.trim = 0; rider.crouch = 0; rider.compress = 0;
    water.advance?.(STEP);
    rig.board.step(STEP, water);
    if (!rider.attached) { fell = t + STEP; fellIn = p.phase; cause = String(rider.separation); break; }
    if (rider.grab.held && Number.isNaN(extra.grabAt)) extra.grabAt = r(t + STEP, 2);
    extra.hand = Math.max(extra.hand, r(rider.grab.force)); extra.hip = Math.max(extra.hip, r(Math.abs(rider.hip.angle) * DEG));
    extra.rest = Math.min(extra.rest, r(rider.leg.rest, 2));
    if (Number.isNaN(extra.launchAt) && (rider as unknown as { stampTime: number }).stampTime >= 0) { extra.launchAt = r(t + STEP, 2); extra.head = r(rig.heading * DEG); }
    frames.push(frameOf({ board: rig.board, rider, heading: rig.heading } as Rig, water, t + STEP, p.phase, FALL, last));
    last = rig.heading;
  }
  return { frames, fell, fellIn, cause };
}

/** From the Snap's press: the turn by 1 s, the peak, the time to 90° and 150°, the speed kept at 1 s and its least, the fin. */
function measure(frames: Frame[], start: number) {
  const m = frames.filter((f) => f.t > start + 1e-9);
  let turned = 0; let at1 = Number.NaN; let peak = 0; let t90 = Number.NaN; let t150 = Number.NaN; let least = Infinity; let finMax = 0; let past = 0; let finAt1 = Number.NaN; let v1 = Number.NaN; let at08 = Number.NaN; let back = 0;
  const sign = S >= 0 ? 1 : -1;
  for (let i = 1; i < m.length; i += 1) {
    turned += sign * DIRN * diff(m[i].heading, m[i - 1].heading);
    const dt = m[i].t - start;
    if (dt <= 1 + 1e-9) {
      peak = Math.max(peak, sign * DIRN * m[i].rate); least = Math.min(least, m[i].speed); finMax = Math.max(finMax, m[i].fin);
      if (m[i].fin > 18) past += STEP;
      at1 = turned; v1 = m[i].speed; finAt1 = m[i].fin;
    }
    // The bars: the turn 0.8 s after the launch (STAMP_SET, 0.3 s, after the press), and the fin's attack 0.5 s after the launch's end (0.55 s), the most over 0.1 s.
    if (dt <= 1.1 + 1e-9) at08 = turned;
    if (dt > 1.0 && dt <= 1.1 + 1e-9) back = Math.max(back, m[i].fin);
    if (Number.isNaN(t90) && turned >= 90) t90 = dt;
    if (Number.isNaN(t150) && turned >= 150) t150 = dt;
  }
  const v0 = m[0]?.speed ?? Number.NaN;
  // The fin's attack every 0.1 s over the first 0.6 s.
  const fins = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((d) => r(m.find((f) => f.t - start >= d - 1e-9)?.fin ?? Number.NaN));
  return { at08: r(at08), back: r(back), at1: r(at1), peak: r(peak), t90: r(t90, 2), t150: r(t150, 2), v0: r(v0, 1), kept: r(v1 / v0, 2), least: r(least, 1), fin: r(finMax), past18: r(past, 2), finAt1: r(finAt1), fins };
}

/** From the launch: the turn in 0.8 s, the peak rate, the fin's most attack, when it last sat past stall (18 deg), the speed kept 0.7 s on (of the press's). */
function launched(frames: Frame[], at: number, v0: number) {
  if (Number.isNaN(at)) return {};
  const sign = S >= 0 ? 1 : -1;
  const m = frames.filter((f) => f.t >= at - 1e-9);
  let turned = 0; let l08 = Number.NaN; let lpeak = 0; let lfin = 0; let stalled = Number.NaN; let regrip = Number.NaN; let lkept = Number.NaN;
  for (let i = 1; i < m.length; i += 1) {
    turned += sign * DIRN * diff(m[i].heading, m[i - 1].heading);
    const dt = m[i].t - at;
    if (dt <= 0.8 + 1e-9) { l08 = turned; lpeak = Math.max(lpeak, sign * DIRN * m[i].rate); lfin = Math.max(lfin, m[i].fin); }
    if (dt <= 1 + 1e-9 && m[i].fin > 18) { if (Number.isNaN(stalled)) stalled = dt; regrip = dt + STEP; }
    if (dt <= 0.7 + 1e-9) lkept = m[i].speed / v0;
  }
  return { l08: r(l08), lpeak: r(lpeak), lfin: r(lfin), stalled: r(stalled, 2), regrip: r(regrip, 2), lkept: r(lkept, 2) };
}

it('probe', () => {
  const out: unknown[] = [];
  if (CASE === 'face') {
    const waters: { name: string; make: () => { water: Water; x: number; z: number } ; speed: number }[] = [];
    for (const speed of [7, 8, 9]) waters.push({ name: `face 1.2 m ${speed}`, speed, make: () => { const w = new FaceWater({ depth: 2, height: 1.2, slope: 20 }); return { water: w as Water, x: 0, z: w.crestZ() + 0.75 * w.front }; } });
    for (const speed of [7, 8]) waters.push({ name: `face 0.85 m ${speed}`, speed, make: () => { const w = new FaceWater({ depth: 2, height: 0.85, slope: 14, speed: 4.7 }); return { water: w as Water, x: 0, z: w.crestZ() + 0.75 * w.front }; } });
    // The top move off a climb (round 2's two moves): low on the face heading 45° from its fall line, a full steer up
    // until UP° from the fall line or TOP of the face (or HOLD1 s), GAP s straight, then Snap with the steer S back down
    // for HOLD2 s, then let go.
    const UP = Number(process.env.UP ?? 150); const TOP = Number(process.env.TOP ?? 0.85); const HOLD1 = 0.8; const GAP = Number(process.env.GAP ?? 0.15); const HOLD2 = Number(process.env.HOLD2 ?? 0.6);
    for (const w of waters) {
      const { water, x, z } = w.make();
      const PLACED = process.env.PLACED ? Number(process.env.PLACED) : 0;
      const rig = PLACED ? rigOn(water, x, (water as FaceWater).crestZ() + Number(process.env.START ?? 0.75) * (water as FaceWater).front, -PLACED, w.speed) : rigOn(water, x, z, -45, w.speed);
      let phase = PLACED ? 'gap' : 'pre'; let t0 = 0; let snapAt = Number.NaN; let top = 0; let high = 0;
      const fromFall = () => { const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation).setY(0).normalize(); return Math.acos(Math.max(-1, Math.min(1, f.dot(FALL)))) * DEG; };
      const frac = () => water.faceFraction?.(rig.board.position.z) ?? 0;
      const res = run(rig, water, 3.5, (t) => {
        if (phase === 'pre' && t >= 0.2) { phase = 'up'; t0 = t; }
        if (phase === 'up' && (fromFall() >= UP || frac() >= TOP || t - t0 >= HOLD1)) { phase = 'gap'; t0 = t; }
        if (phase === 'gap' && t - t0 >= GAP) { phase = 'snap'; t0 = t; snapAt = t; top = fromFall(); high = frac(); }
        if (phase === 'snap' && t - t0 >= HOLD2) { phase = 'after'; t0 = t; }
        return phase === 'up' ? { steer: -1, snap: 0, phase } : phase === 'snap' ? { steer: S, snap: 1, phase } : { steer: 0, snap: 0, phase };
      });
      out.push({ case: w.name, top: r(top), high: r(high, 2), ...measure(res.frames, snapAt), fell: r(res.fell - snapAt, 2), fellIn: res.fellIn, cause: res.cause });
    }
  } else if (CASE === 'climb') {
    const HOLD = Number(process.env.HOLD ?? 0.6);
    for (const across of [150, 120]) for (const speed of [6.7, 8]) {
      const water = new PlaneWater({ slopeZ: -Math.tan(15 / DEG) }) as Water;
      const rig = rigOn(water, 0, 0, -across, speed + Number(process.env.FASTER ?? 0));
      const res = run(rig, water, 1.2 + HOLD + LEAD, (t) => (t < 0.2 ? { steer: 0, snap: 0, phase: 'pre' } : t < 0.2 + LEAD ? { steer: 0, snap: 1, phase: 'lead' } : t < 0.2 + LEAD + HOLD ? { steer: S, snap: 1, phase: 'snap' } : { steer: S, snap: 0, phase: 'after' }));
      const m = measure(res.frames, 0.2 + LEAD);
      out.push({ case: `climb ${across}° ${speed}`, ...m, fell: r(res.fell - LEAD, 2), fellIn: res.fellIn, cause: res.cause, ...extra, ...launched(res.frames, extra.launchAt, m.v0) });
    }
  } else {
    const HOLD = Number(process.env.HOLD ?? 0.6);
    for (const speed of [7, 9]) {
      const water = new PlaneWater() as Water;
      const rig = rigOn(water, 0, 0, 0, speed);
      const res = run(rig, water, 1.6 + HOLD + LEAD, (t) => (t < 0.2 ? { steer: 0, snap: 0, phase: 'pre' } : t < 0.2 + LEAD ? { steer: 0, snap: 1, phase: 'lead' } : t < 0.2 + LEAD + HOLD ? { steer: S, snap: 1, phase: 'snap' } : { steer: 0, snap: 0, phase: 'after' }));
      const m = measure(res.frames, 0.2 + LEAD);
      out.push({ case: `flat ${speed}`, ...m, fell: r(res.fell - LEAD, 2), fellIn: res.fellIn, cause: res.cause, ...extra, ...launched(res.frames, extra.launchAt, m.v0) });
    }
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
