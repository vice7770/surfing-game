import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { PlaneWater } from './PlaneWater';
import { DEG, Ramp, STEP, apply, frameOf, input, onWater } from './zz-r2Lab';
it('trace', () => {
  const out: string[] = [];
  for (const depth of [1, 1.5]) {
    const water = new PlaneWater();
    const r = onWater(water, 0, 0, 0, Number(process.env.SPEED ?? 9));
    const rider = new AttachedRider(r.board.shape, { phase: 'standing' });
    (rider as unknown as { snapDepth: number }).snapDepth = depth;
    r.board.attach(rider);
    const g = { board: r.board, rider, get heading() { const f = new Vector3(0, 0, 1).applyQuaternion(r.board.orientation); return Math.atan2(f.x, f.z); } };
    const rs = new Ramp(0.2); const rn = new Ramp(0.2);
    let last = g.heading;
    for (let n = 0; n < 120; n += 1) {
      const t = n * STEP;
      const i = input(t >= 0.2 && t < 0.8 ? 'snap' : 'none', t < 0.2 ? 0 : -1);
      apply(g, { steer: rs.update(i.steer, STEP), snap: rn.update(i.snap ?? 0, STEP) });
      r.board.step(STEP, water);
      if (!rider.attached) { out.push(`${depth} FELL ${(t + STEP).toFixed(2)} ${rider.separation}`); break; }
      const f = frameOf(g, water, t + STEP, '', new Vector3(0, 0, 1), last); last = g.heading;
      const p = rider as unknown as { legLoad: number; mass: number; balanceMargin: number };
      if (n % 6 === 5) out.push(`${depth} t${f.t.toFixed(2)} v${f.speed.toFixed(1)} rest${f.rest.toFixed(3)} drop${f.drop.toFixed(2)} bank${f.bank.toFixed(0)} ref${f.bankRef.toFixed(0)} roll${f.roll.toFixed(0)} pitch${f.pitch.toFixed(0)} front${f.front.toFixed(2)} load${(p.legLoad / p.mass / 9.81).toFixed(2)} margin${p.balanceMargin?.toFixed?.(2)} rate${f.rate.toFixed(0)}`);
    }
  }
  writeFileSync(process.env.OUT!, out.join('\n'));
  void DEG;
});
