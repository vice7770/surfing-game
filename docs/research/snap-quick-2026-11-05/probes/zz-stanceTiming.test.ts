// Stance timing probe (not part of the suite): how long each stance change takes to show in the physics.
// OUT=<file.json> RAMP=0.2 (keys) or 0 (pad).
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { PlaneWater } from './PlaneWater';
import { Ramp, STEP, onWater } from './zz-r2Lab';

const OUT = process.env.OUT ?? '/dev/null';
const RAMP = Number(process.env.RAMP ?? 0.2);
type Stance = 'none' | 'crouch' | 'compress' | 'snap' | 'S';

interface Sample { t: number; rest: number; drop: number; front: number; balanceZ: number; twist: number; pelvisBack: number; bank: number; yawRate: number; speed: number }

function inputs(s: Stance) {
  return { crouch: s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0, compress: s === 'compress' ? 1 : 0, snap: s === 'snap' ? 1 : 0, trim: s === 'S' ? -1 : 0 };
}

function run(from: Stance, to: Stance, steer: number, speed: number, hold = 1.5, after = 1.5) {
  const water = new PlaneWater();
  const rig = onWater(water, 0, 0, 0, speed);
  const { board, rider } = rig;
  const ramps = { crouch: new Ramp(RAMP), compress: new Ramp(RAMP), snap: new Ramp(RAMP), trim: new Ramp(RAMP), steer: new Ramp(RAMP) };
  const samples: Sample[] = [];
  const priv = rider as unknown as { balance: Vector3; position: Vector3; baseWorld: Vector3 };
  for (let n = 0; n < Math.round((hold + after) / STEP); n += 1) {
    const t = n * STEP;
    const s = t < hold ? from : to;
    const i = inputs(s);
    rider.crouch = ramps.crouch.update(i.crouch, STEP);
    rider.compress = ramps.compress.update(i.compress, STEP);
    rider.snap = ramps.snap.update(i.snap, STEP);
    rider.trim = ramps.trim.update(i.trim, STEP);
    rider.steer = ramps.steer.update(steer, STEP);
    board.step(STEP, water);
    if (!rider.attached) break;
    const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const pelvis = rider.partPosition(0, new Vector3());
    const feetMid = new Vector3(0, 0, (rider as unknown as { feet: { front: number; rear: number } }).feet.front / 2 + (rider as unknown as { feet: { front: number; rear: number } }).feet.rear / 2);
    const mid = board.toWorld(feetMid, new Vector3());
    samples.push({
      t: t + STEP - hold, rest: rider.leg.rest, drop: rider.leg.extension, front: rider.contact.frontShare, balanceZ: priv.balance.z,
      twist: rider.twist.angle, pelvisBack: -pelvis.clone().sub(mid).dot(f), bank: rider.bank.angle, yawRate: board.angularVelocity.y, speed: Math.hypot(board.velocity.x, board.velocity.z),
    });
  }
  return { attached: rider.attached, samples };
}

/** Time after the switch for `key` to cover `share` of its way from its value at the switch to its value at the end. */
function reach(samples: Sample[], key: keyof Sample, share: number): number | null {
  const start = samples.filter((s) => s.t <= 0).at(-1)?.[key] as number;
  const after = samples.filter((s) => s.t > 0);
  if (after.length === 0) return null;
  const end = after.slice(-15).reduce((a, s) => a + (s[key] as number), 0) / Math.min(15, after.length);
  const change = end - start;
  if (Math.abs(change) < 1e-3) return null;
  for (const s of after) if (((s[key] as number) - start) / change >= share) return +s.t.toFixed(3);
  return null;
}

it('stance timing', () => {
  const out: unknown[] = [];
  const pairs: [Stance, Stance][] = [['none', 'compress'], ['none', 'snap'], ['compress', 'snap'], ['snap', 'compress'], ['crouch', 'compress'], ['compress', 'none'], ['snap', 'none'], ['none', 'crouch'], ['none', 'S']];
  for (const steer of [0, -1]) {
    for (const [a, b] of pairs) {
      const res = run(a, b, steer, 8, steer ? 0.4 : 1.5, steer ? 0.7 : 1.5);
      const row: Record<string, unknown> = { case: `${a} → ${b}${steer ? ', full steer' : ''}`, on: res.attached };
      for (const key of ['rest', 'drop', 'front', 'balanceZ', 'pelvisBack', 'twist', 'bank'] as const) {
        const s = res.samples;
        const start = s.filter((x) => x.t <= 0).at(-1)?.[key] as number;
        const end = s.slice(-15).reduce((acc, x) => acc + (x[key] as number), 0) / 15;
        row[key] = `${start?.toFixed(3)}→${end.toFixed(3)} t10 ${reach(s, key, 0.1)} t25 ${reach(s, key, 0.25)} t50 ${reach(s, key, 0.5)} t90 ${reach(s, key, 0.9)} t98 ${reach(s, key, 0.98)}`;
      }
      out.push(row);
    }
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
