/**
 * The sprint paddle's flat-water top speed (canyon-catch, 2026-10-29): `the sprint paddle` test's measure (16 s from
 * rest, the reserve kept full, the mean over the last 4 s), cruising and sprinting, with the stroke as it is ('feather':
 * the outrun hand edge-on, the sprint's blade SPRINT_PADDLE_AREA 1.8) and as before ('old': broadside, 2.4). The blade
 * was refitted by rerunning this with SPRINT_PADDLE_AREA set to 2.4, 2.0, 1.8, 1.6 and 1.4 in a scratch build:
 * 2.225, 2.136, 2.084, 2.024 and 1.958 m/s, against the old stroke's 2.084.
 *   rolldown docs/research/canyon-catch-2026-10-29/sprint-fit.ts -o dist/scripts/sprint-fit.mjs --format esm --platform node \
 *     && node dist/scripts/sprint-fit.mjs
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
for (const stroke of ['feather', 'old'] as const) console.log(`${stroke}: cruise ${top(false, stroke).toFixed(3)} m/s, sprint ${top(true, stroke).toFixed(3)} m/s`);
