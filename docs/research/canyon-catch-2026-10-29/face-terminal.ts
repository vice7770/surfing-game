/**
 * A prone paddler on a still sheet of water tilted at θ (canyon-catch, 2026-10-29): how fast the game's board and rider
 * go down a face of that slope with nothing else moving, paddling (cruise, or the sprint while the reserve lasts), from
 * rest and from a cruise. The speed it settles at is where gravity along the face balances the hull's and the body's
 * drag; a wave whose crest runs faster than that on its face's slope leaves the paddler behind, however well timed.
 * `--flow u` adds a shoreward current (the wave's own water near its crest, m/s); `--stroke old` paddles with hands
 * that meet water outrunning them broadside, as before canyon-catch.
 *   rolldown docs/research/canyon-catch-2026-10-29/face-terminal.ts -o dist/scripts/face-terminal.mjs --format esm --platform node \
 *     && node dist/scripts/face-terminal.mjs [--flow 0.8] [--seconds 8] [--stroke old]
 */
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession } from '../../../src/physics/RideSession';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const flow = Number(option('flow') ?? 0);
const seconds = Number(option('seconds') ?? 8);
const STEP = 1 / 60;
const stroke = (option('stroke') ?? 'feather') as 'feather' | 'old';
for (const degrees of [0, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24]) {
  const row: string[] = [];
  for (const sprint of [false, true]) {
    const water = new PlaneWater({ slopeZ: -Math.tan((degrees * Math.PI) / 180), depth: 4, flow: { x: 0, y: 0, z: flow } });
    const session = new RideSession({ stroke });
    session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' }, water);
    const reach: Record<number, number> = {};
    let lift = 0;
    let t = 0;
    for (; t < seconds; t += STEP) {
      session.step(STEP, water, { paddle: true, sprint, popUp: false, steer: 0 });
      const v = session.board.velocity;
      const speed = Math.hypot(v.x, v.z);
      for (const mark of [3, 4, 5, 6]) if (reach[mark] === undefined && speed >= mark) reach[mark] = t;
      if (t > seconds - 1) lift = Math.max(lift, session.board.forces.pressure.y / ((session.board.mass + session.rider.mass) * 9.81));
    }
    const v = session.board.velocity;
    const marks = [3, 4, 5, 6].map((m) => `${m}: ${reach[m] === undefined ? '—' : `${reach[m].toFixed(1)} s`}`).join(', ');
    row.push(`${sprint ? 'sprint' : 'cruise'} ${Math.hypot(v.x, v.z).toFixed(2)} m/s after ${seconds} s (reached ${marks}; planing lift ${(100 * lift).toFixed(0)} %${session.phase === 'fallen' ? '; FELL' : ''})`);
  }
  console.log(`${String(degrees).padStart(2)}°: ${row.join(' | ')}`);
}
