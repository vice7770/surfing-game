// Snap-carve probe (not part of the suite): Snap's load depth against its turn and falls. DEPTHS=1,1.25,1.5 OUT=<file>.
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { PlaneWater } from './PlaneWater';
import type { SurfWater } from './SurfWater';
import { DEG, Ramp, STEP, apply, diff, frameOf, input, onWater, type Rig } from './zz-r2Lab';

const OUT = process.env.OUT ?? '/dev/null';
const DEPTHS = (process.env.DEPTHS ?? '1,1.25,1.5').split(',').map(Number);
const FALL = new Vector3(0, 0, 1);

function rig(water: SurfWater, heading: number, speed: number, depth: number, lean: boolean): Rig {
  const r = onWater(water, 0, 0, heading, speed);
  const board = r.board;
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...(lean ? { snapPivot: 'lean' as const } : {}) });
  (rider as unknown as { snapDepth: number }).snapDepth = depth;
  board.attach(rider);
  return { board, rider, get heading() { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); } };
}

function run(water: SurfWater, heading: number, speed: number, depth: number, lean: boolean, o: { dur: number; steer: number; after: number; ramp: number }) {
  const g = rig(water, heading, speed, depth, lean);
  const ramps = { steer: new Ramp(o.ramp), snap: new Ramp(o.ramp) };
  let last = g.heading; let turned = 0; let peak = 0; let v0 = Number.NaN; let v = 0; let at1 = Number.NaN; let low = 0; let fell = Number.NaN; let cause = '';
  for (let n = 0; n < Math.round(o.dur / STEP); n += 1) {
    const t = n * STEP;
    const phase = t < 0.2 ? 'pre' : t < 0.8 ? 'move' : 'after';
    const i = input(phase === 'move' ? 'snap' : 'none', phase === 'pre' ? 0 : phase === 'after' ? o.steer * o.after : o.steer);
    apply(g, { steer: ramps.steer.update(i.steer, STEP), snap: ramps.snap.update(i.snap ?? 0, STEP) });
    g.board.step(STEP, water);
    if (!g.rider.attached) { fell = t + STEP; cause = String(g.rider.separation); break; }
    const f = frameOf(g, water, t + STEP, phase, FALL, last);
    if (phase !== 'pre') {
      if (Number.isNaN(v0)) v0 = f.speed;
      turned += o.steer * diff(f.heading, last * DEG);
      peak = Math.max(peak, o.steer * f.rate);
      v = f.speed;
      low = Math.min(low, g.rider.leg.rest);
      if (Number.isNaN(at1) && t + STEP >= 1.2 - 1e-9) at1 = turned;
    }
    last = g.heading;
  }
  return { at1: Math.round(at1), end: Math.round(turned), peak: Math.round(peak), kept: +(v / v0).toFixed(2), rest: +low.toFixed(3), fell: Number.isFinite(fell) ? +fell.toFixed(2) : null, cause };
}

it('probe', () => {
  const out: unknown[] = [];
  for (const lean of (process.env.LEAN ? [process.env.LEAN === '1'] : [false, true])) for (const depth of DEPTHS) {
    const row: Record<string, unknown> & { list?: unknown[] } = { lean, depth };
    for (const speed of [7, 9]) row[`flat${speed}`] = run(new PlaneWater(), 0, speed, depth, lean, { dur: 2, steer: -1, after: 1, ramp: 0.2 });
    for (const across of [150, 120]) for (const speed of [6.7, 8]) {
      row[`climb${across}_${speed}`] = run(new PlaneWater({ slopeZ: -Math.tan(15 / DEG) }), -across, speed, depth, lean, { dur: 1.6, steer: 1, after: 1, ramp: 0.2 });
    }
    let falls = 0; let pad = 0;
    for (const speed of [7, 9]) for (const after of [1, 0.5, 0]) for (const ramp of [0.2, 0]) {
      const r = run(new PlaneWater(), 0, speed, depth, lean, { dur: 2, steer: -1, after, ramp });
      if (r.fell !== null) { (row.list ??= [] as unknown[]) && (row.list as unknown[]).push([speed, after, ramp, r.fell, r.cause, r.kept]); falls += 1; if (ramp === 0) pad += 1; }
    }
    row.falls = `${falls} (${pad})`;
    out.push(row);
    console.log(JSON.stringify(row));
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
}, 600_000);
