// Snap round 3's yaw-moment budget (not part of the suite). Needs `yawLedger.patch` applied to BoardBody.ts and
// round 2's zz-r2Lab.ts beside it. CASE=flat|climb, MOVES=steer,compress,snap, SPEEDS=7,9, OUT=<file.json>.
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { PlaneWater } from './PlaneWater';
import { FaceWater } from './testing/FaceWater';
import type { SurfWater } from './SurfWater';
import { DEG, Ramp, STEP, apply, diff, frameOf, input, onWater, type Move, type Rig } from './zz-r2Lab';

const OUT = process.env.OUT ?? '/dev/null';
const CASE = process.env.CASE ?? 'flat';
const HOLD = Number(process.env.HOLD ?? 0.6);
const RAMP = Number(process.env.RAMP ?? 0.2);
const MOVES = (process.env.MOVES ?? 'steer,compress,snap').split(',') as Move[];
const SPEEDS = (process.env.SPEEDS ?? (CASE === 'flat' ? '7,9' : '6.7,8')).split(',').map(Number);
const FALL = new Vector3(0, 0, 1);

type Board = Rig['board'] & { yawLedger?: Float64Array; probeCouple: number };
const COUPLE = Number(process.env.COUPLE ?? 0);
const NOTWIST = process.env.NOTWIST === '1';

function budgetRun(rig: Rig, water: SurfWater, seconds: number, plan: (t: number) => { move: Move; steer: number; phase: string }) {
  const board = rig.board as Board;
  board.yawLedger = new Float64Array(64);
  const ramps = { steer: new Ramp(RAMP), snap: new Ramp(RAMP), compress: new Ramp(RAMP), crouch: new Ramp(RAMP), trim: new Ramp(RAMP) };
  const rows: Record<string, number | string | null>[] = [];
  let last = rig.heading;
  let lastL = Number.NaN;
  let lastBody = Number.NaN;
  let fell = Number.NaN;
  const P = new Vector3();
  const local = new Vector3();
  const composite = () => {
    const mb = board.mass; const mr = rig.rider.mass;
    P.copy(board.centerOfMass).multiplyScalar(mb).addScaledVector(rig.rider.position, mr).divideScalar(mb + mr);
    const I = (board as unknown as { worldInertia: number[] }).worldInertia; const w = board.angularVelocity;
    const cb = board.centerOfMass.clone().sub(P); const cr = rig.rider.position.clone().sub(P);
    const L = I[3] * w.x + I[4] * w.y + I[5] * w.z + mb * (cb.z * board.velocity.x - cb.x * board.velocity.z) + mr * (cr.z * rig.rider.velocity.x - cr.x * rig.rider.velocity.z);
    const Isys = I[4] + mb * (cb.x * cb.x + cb.z * cb.z) + mr * (cr.x * cr.x + cr.z * cr.z);
    return { L, Isys };
  };
  for (let n = 0; n < Math.round(seconds / STEP); n += 1) {
    const t = n * STEP;
    const p = plan(t);
    const i = input(p.move, p.steer);
    apply(rig, { steer: ramps.steer.update(i.steer, STEP), snap: ramps.snap.update(i.snap ?? 0, STEP), compress: ramps.compress.update(i.compress ?? 0, STEP), crouch: ramps.crouch.update(i.crouch ?? 0, STEP), trim: ramps.trim.update(i.trim ?? 0, STEP) });
    board.yawLedger.fill(0);
    board.probeCouple = p.phase === 'move' && t < 0.2 + Number(process.env.COUPLE_FOR ?? 9) ? p.steer * COUPLE : 0;
    if (NOTWIST) (rig.rider as unknown as { rotate: number }).rotate = 0;
    if (process.env.ROTATE) (rig.rider as unknown as { rotate: number }).rotate = p.phase === 'move' ? Number(process.env.ROTATE) * p.steer : Number.NaN;
    (water as { advance?: (dt: number) => void }).advance?.(STEP);
    board.step(STEP, water);
    if (!rig.rider.attached) { fell = t + STEP; break; }
    const f = frameOf(rig, water, t + STEP, p.phase, FALL, last);
    last = rig.heading;
    const Lg = board.yawLedger;
    const m = (k: number) => Lg[k] / STEP;
    const { L, Isys } = composite();
    board.toLocal(P, local);
    const pz = local.z;
    let fore = 0; let aft = 0; let latFore = 0; let latAft = 0;
    const stationZ = (k: number) => -0.8149166666666667 + 0.14816666666666667 * k;
    for (let k = 0; k < 12; k += 1) {
      if (stationZ(k) > pz) { fore += m(k); latFore += m(40 + k); } else { aft += m(k); latAft += m(40 + k); }
    }
    let railFore = 0; let railAft = 0;
    for (let k = 0; k < 12; k += 1) if (stationZ(k) > pz) railFore += m(12 + k); else railAft += m(12 + k);
    const external = fore + aft + railFore + railAft + m(24) + m(25) + m(26) + m(27) + m(28) + m(29) + m(30) + m(33);
    const sign = plan(0.5).steer; // + into the turn
    rows.push({
      t: +(t + STEP).toFixed(3), ph: p.phase, hd: +f.heading.toFixed(1), rate: +f.rate.toFixed(0), drift: +diff(f.heading, f.path).toFixed(1), fin: +f.fin.toFixed(1),
      bank: +f.bank.toFixed(1), roll: +f.roll.toFixed(1), pitch: +f.pitch.toFixed(1), v: +f.speed.toFixed(2), front: +f.front.toFixed(2), tw: +f.twist.toFixed(1),
      pz: +pz.toFixed(3), Isys: +Isys.toFixed(2),
      // Yaw moments about the composite centre, N·m, + into the turn.
      hullFore: +(sign * fore).toFixed(1), hullAft: +(sign * aft).toFixed(1), railFore: +(sign * railFore).toFixed(1), railAft: +(sign * railAft).toFixed(1),
      finL: +(sign * m(24)).toFixed(1), finR: +(sign * m(25)).toFixed(1), finC: +(sign * m(26)).toFixed(1), buoy: +(sign * m(27)).toFixed(1), fric: +(sign * m(28)).toFixed(1), water: +(sign * m(29)).toFixed(1),
      twist: +(sign * m(31)).toFixed(1), swing: +(sign * m(32)).toFixed(1), hand: +(sign * m(33)).toFixed(1), contact: +(sign * m(34)).toFixed(1),
      ext: +(sign * external).toFixed(1),
      xcp: +((sign * external) / Math.max(1, sign * (m(35) + m(36) + m(37)))).toFixed(3), Fin: +(sign * (m(35) + m(36) + m(37))).toFixed(0),
      bodyDrift: +diff(f.heading, f.bodyPath).toFixed(1), pathRate: Number.isNaN(lastBody) ? null : +(diff(f.bodyPath, lastBody) / STEP).toFixed(0), dL: Number.isNaN(lastL) ? null : +((sign * (L - lastL)) / STEP).toFixed(1),
      // Lateral forces (toward the board's left, +; the turn is to its right, so − is inward), N.
      latHull: +m(35).toFixed(0), latFore: +latFore.toFixed(0), latAft: +latAft.toFixed(0), latFins: +m(36).toFixed(0), latRails: +m(37).toFixed(0), latContact: +m(38).toFixed(0),
    });
    lastL = L;
    lastBody = f.bodyPath;
  }
  return { rows, fell };
}

it('yaw budget', () => {
  (globalThis as unknown as { __snapProbe?: Record<string, number> }).__snapProbe = JSON.parse(process.env.PROBE ?? '{}');
  const out: unknown[] = [];
  for (const speed of SPEEDS) for (const move of MOVES) {
    let water: SurfWater; let rig: Rig; let steerSign = -1;
    if (CASE === 'flat') {
      water = new PlaneWater();
      rig = onWater(water, 0, 0, 0, speed);
    } else if (CASE === 'face') {
      const across = Number(process.env.ACROSS ?? 150);
      const w = new FaceWater({ depth: 2, height: 1.2, slope: 20 });
      water = w;
      rig = onWater(w, 0, w.crestZ() + Number(process.env.AHEAD ?? 0.35) * w.front, -across, speed);
      steerSign = 1;
    } else {
      const across = Number(process.env.ACROSS ?? 150);
      water = new PlaneWater({ slopeZ: -Math.tan(15 / DEG) });
      rig = onWater(water, 0, 0, -across, speed);
      steerSign = 1;
    }
    const scales = (process.env.FINSCALE ?? '1,1,1').split(',').map(Number);
    const foils = (rig.board as unknown as { foils: { kind: string; fin?: { area: number } }[] }).foils;
    for (let k = 0; k < 3; k += 1) if (foils[k].fin) foils[k].fin = { ...foils[k].fin!, area: foils[k].fin!.area * (scales[k] ?? 1) };
    const res = budgetRun(rig, water, Number(process.env.DUR ?? 1.6), (t) => (t < 0.2 ? { move: 'none', steer: 0, phase: 'pre' } : t < 0.2 + HOLD ? { move, steer: steerSign, phase: 'move' } : { move: 'none', steer: steerSign, phase: 'after' }));
    const mv = res.rows.filter((row) => row.ph !== 'pre');
    let turned = 0; const turns: number[] = [];
    for (let k = 0; k < mv.length; k += 1) { if (k > 0) turned += steerSign * diff(mv[k].hd as number, mv[k - 1].hd as number); turns.push(turned); }
    const at = (dt: number) => { const k = mv.findIndex((x) => (x.t as number) >= 0.2 + dt - 1e-9); return k >= 0 ? +turns[k].toFixed(0) : null; };
    const peak = Math.max(...mv.map((x) => steerSign * (x.rate as number)));
    const fin = Math.max(...mv.map((x) => x.fin as number));
    const vmin = Math.min(...mv.map((x) => x.v as number));
    out.push({ case: `${CASE} ${speed}: ${move}`, fell: res.fell, summary: { at06: at(0.6), at08: at(0.8), at10: at(1.0), peak: +peak.toFixed(0), fin: +fin.toFixed(0), vmin: +vmin.toFixed(1) }, rows: res.rows });
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
