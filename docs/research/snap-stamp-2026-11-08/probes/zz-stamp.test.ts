// Snap round 4's probe (snap-stamp; not part of the suite). OPTS='{"snapStamp":"on"}', (STAMP= set the tuning knobs while they were read; the built code has none),
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
if (process.env.STAMP) (globalThis as unknown as { __stamp: unknown }).__stamp = JSON.parse(process.env.STAMP);
const FALL = new Vector3(0, 0, 1);
const DIRN = CASE === 'face' ? -1 : 1;
type Water = SurfWater & { advance?: (dt: number) => void; faceFraction?: (z: number) => number };

function rigOn(water: SurfWater, x: number, z: number, heading: number, speed: number): Rig {
  const base = onWater(water, x, z, heading, speed);
  const board = base.board as BoardBody;
  board.attach(new AttachedRider(board.shape, { phase: 'standing', ...OPTS }));
  return { board, get rider() { return board.rider as AttachedRider; }, get heading() { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); } } as Rig;
}

interface Plan { steer: number; snap: number; phase: string }

function run(rig: Rig, water: Water, seconds: number, plan: (t: number, rig: Rig) => Plan) {
  const frames: Frame[] = [];
  let last = rig.heading; let fell = Number.NaN; let fellIn = ''; let cause = '';
  const steer = new Ramp(RAMP); const snap = new Ramp(RAMP);
  for (let n = 0; n < Math.round(seconds / STEP); n += 1) {
    const t = n * STEP;
    const p = plan(t, rig);
    const rider = rig.board.rider as AttachedRider;
    rider.steer = steer.update(p.steer, STEP); rider.snap = snap.update(p.snap, STEP); rider.trim = 0; rider.crouch = 0; rider.compress = 0;
    water.advance?.(STEP);
    rig.board.step(STEP, water);
    if (!rider.attached) { fell = t + STEP; fellIn = p.phase; cause = String(rider.separation); break; }
    frames.push(frameOf({ board: rig.board, rider, heading: rig.heading } as Rig, water, t + STEP, p.phase, FALL, last));
    last = rig.heading;
  }
  return { frames, fell, fellIn, cause };
}

/** From the Snap's press: the turn by 1 s, the peak, the time to 90° and 150°, the speed kept at 1 s and its least, the fin. */
function measure(frames: Frame[], start: number) {
  const m = frames.filter((f) => f.t > start + 1e-9);
  let turned = 0; let at1 = Number.NaN; let peak = 0; let t90 = Number.NaN; let t150 = Number.NaN; let least = Infinity; let finMax = 0; let past = 0; let finAt1 = Number.NaN; let v1 = Number.NaN;
  const sign = S >= 0 ? 1 : -1;
  for (let i = 1; i < m.length; i += 1) {
    turned += sign * DIRN * diff(m[i].heading, m[i - 1].heading);
    const dt = m[i].t - start;
    if (dt <= 1 + 1e-9) {
      peak = Math.max(peak, sign * DIRN * m[i].rate); least = Math.min(least, m[i].speed); finMax = Math.max(finMax, m[i].fin);
      if (m[i].fin > 18) past += STEP;
      at1 = turned; v1 = m[i].speed; finAt1 = m[i].fin;
    }
    if (Number.isNaN(t90) && turned >= 90) t90 = dt;
    if (Number.isNaN(t150) && turned >= 150) t150 = dt;
  }
  const v0 = m[0]?.speed ?? Number.NaN;
  // The fin's attack every 0.1 s over the first 0.6 s.
  const fins = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((d) => r(m.find((f) => f.t - start >= d - 1e-9)?.fin ?? Number.NaN));
  return { at1: r(at1), peak: r(peak), t90: r(t90, 2), t150: r(t150, 2), v0: r(v0, 1), kept: r(v1 / v0, 2), least: r(least, 1), fin: r(finMax), past18: r(past, 2), finAt1: r(finAt1), fins };
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
      const rig = rigOn(water, 0, 0, -across, speed);
      const res = run(rig, water, 1.8, (t) => (t < 0.2 ? { steer: 0, snap: 0, phase: 'pre' } : t < 0.2 + HOLD ? { steer: S, snap: 1, phase: 'snap' } : { steer: S, snap: 0, phase: 'after' }));
      out.push({ case: `climb ${across}° ${speed}`, ...measure(res.frames, 0.2), fell: r(res.fell, 2), fellIn: res.fellIn, cause: res.cause });
    }
  } else {
    const HOLD = Number(process.env.HOLD ?? 0.6);
    for (const speed of [7, 9]) {
      const water = new PlaneWater() as Water;
      const rig = rigOn(water, 0, 0, 0, speed);
      const res = run(rig, water, 2.2, (t) => (t < 0.2 ? { steer: 0, snap: 0, phase: 'pre' } : t < 0.2 + HOLD ? { steer: S, snap: 1, phase: 'snap' } : { steer: 0, snap: 0, phase: 'after' }));
      out.push({ case: `flat ${speed}`, ...measure(res.frames, 0.2), fell: r(res.fell, 2), fellIn: res.fellIn, cause: res.cause });
    }
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
