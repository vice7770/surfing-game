/**
 * Twelve falls on flat water, back on the board holding the reel (swim-back, 2026-10-29): standing at 3, 4, 5 and 6 m/s
 * for 0.5, 1 and 1.5 s, then off; the reel held (and the pop-up pressed) from the first moment. Prints, per fall, the
 * seconds until the rider lies on the board again (attached, the climb done), or — within 20 s: today's, then
 * `swim: 'old'`'s.
 *   rolldown docs/research/swim-back-2026-10-29/twelve-falls.ts -o dist/scripts/twelve-falls.mjs --format esm --platform node \
 *     && node dist/scripts/twelve-falls.mjs
 */
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession } from '../../../src/physics/RideSession';
const STEP = 1 / 60; const idle = { paddle: false, popUp: false, steer: 0 };
for (const swim of [undefined, 'old'] as const) {
  const out: string[] = [];
  for (const speed of [3, 4, 5, 6]) for (const ride of [30, 60, 90]) {
    const session = new RideSession(swim ? { swim } : {}); const water = new PlaneWater({ depth: 3 });
    session.place({ x: 0, z: 0, heading: 0, speed, phase: 'standing', followSurface: true }, water);
    for (let i = 0; i < ride; i += 1) session.step(STEP, water, idle);
    session.separate('balance');
    let back = NaN;
    for (let n = 0; n < 20 / STEP; n += 1) { session.step(STEP, water, session.rider.attached ? idle : { ...idle, popUp: n === 0, reel: true }); if (session.rider.attached && !session.rider.climbingOn && session.phase === 'prone') { back = (n + 1) * STEP; break; } }
    out.push(Number.isNaN(back) ? '—' : back.toFixed(1));
  }
  console.log(swim ?? 'new', out.join(' '));
}
