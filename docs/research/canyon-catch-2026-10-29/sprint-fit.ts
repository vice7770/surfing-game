/**
 * The sprint paddle's flat-water top speed against its blade area (canyon-catch, 2026-10-29): `the sprint paddle` test's
 * measure (16 s from rest, the reserve kept full, the mean over the last 4 s), for the stroke as it is ('feather') and
 * as before ('old'). Dev only: reads `globalThis.__area` (a scratch build sets SPRINT_PADDLE_AREA from it).
 */
import { Vector3 } from 'three';
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession } from '../../../src/physics/RideSession';

const STEP = 1 / 60;
const top = (sprint: boolean, stroke: 'feather' | 'old') => {
  const water = new PlaneWater();
  const session = new RideSession({ stroke });
  session.reset(new Vector3(), 0, water);
  const out: number[] = [];
  for (let i = 0; i < Math.round(16 / STEP); i += 1) {
    session.reserve.level = 1;
    session.step(STEP, water, { paddle: true, sprint, popUp: false, steer: 0 });
    out.push(session.board.velocity.z);
  }
  return out.slice(-240).reduce((a, b) => a + b, 0) / 240;
};
const g = globalThis as unknown as { __area?: number };
g.__area = 2.4;
console.log(`old stroke: cruise ${top(false, 'old').toFixed(3)}, sprint ${top(true, 'old').toFixed(3)} (area 2.4)`);
for (const area of (process.argv[2] ?? '2.4,2.2,2.0,1.9,1.8').split(',').map(Number)) {
  g.__area = area;
  console.log(`feather, area ${area}: cruise ${top(false, 'feather').toFixed(3)}, sprint ${top(true, 'feather').toFixed(3)}`);
}
