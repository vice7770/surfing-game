/**
 * A pop-up on a still sheet of water tilted at θ (canyon-catch, 2026-10-29): the prone rider paddles down it from rest
 * for `--lead` s (sprinting), pops up, and the probe reads whether it stands, how the contact load ran through the
 * push and the landing, and how the board's speed went. `--rise w` lifts the whole sheet at w m/s (a wave's face
 * rising under the board as the crest comes); `--flow u` adds a shoreward current.
 *   rolldown docs/research/canyon-catch-2026-10-29/face-popup.ts -o dist/scripts/face-popup.mjs --format esm --platform node \
 *     && node dist/scripts/face-popup.mjs [--lead 3] [--rise 0.3] [--flow 0]
 */
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession } from '../../../src/physics/RideSession';
import type { SurfWater, WaterSample } from '../../../src/physics/SurfWater';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const lead = Number(option('lead') ?? 3);
const rise = Number(option('rise') ?? 0);
const flow = Number(option('flow') ?? 0);
const STEP = 1 / 60;

/** A plane whose level rises at `rise` m/s, its water moving up with it. */
class RisingPlane implements SurfWater {
  private readonly plane: PlaneWater;
  time = 0;
  constructor(slope: number) {
    this.plane = new PlaneWater({ slopeZ: -Math.tan(slope), depth: 4, flow: { x: 0, y: rise, z: flow } });
  }
  surfaceAt(x: number, z: number): number { return this.plane.surfaceAt(x, z) + rise * this.time; }
  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    this.plane.sampleAt(x, y - rise * this.time, z, out);
    out.surfaceY += rise * this.time;
    out.bedY += rise * this.time;
    return out;
  }
  addReaction(): void {}
}

for (const degrees of [8, 12, 15, 18, 20, 22, 25, 28]) {
  const water = new RisingPlane((degrees * Math.PI) / 180);
  const session = new RideSession();
  session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' }, water);
  let t = 0;
  let popped = Number.NaN;
  let minLoad = Infinity;
  let infeasible = 0;
  let speedAtPop = 0;
  let stood = Number.NaN;
  const weight = session.rider.mass * 9.81;
  for (; t < lead + 4; t += STEP) {
    water.time = t;
    const pop = Number.isNaN(popped) && t >= lead;
    if (pop) { popped = t; speedAtPop = Math.hypot(session.board.velocity.x, session.board.velocity.z); }
    session.step(STEP, water, { paddle: Number.isNaN(popped), sprint: Number.isNaN(popped), popUp: pop, steer: 0 });
    if (!Number.isNaN(popped) && session.phase !== 'standing' && session.phase !== 'fallen') {
      minLoad = Math.min(minLoad, session.rider.contact.load / weight);
      if (!session.rider.contact.feasible) infeasible += STEP;
    }
    if (session.phase === 'standing' && Number.isNaN(stood)) stood = t;
    if (session.phase === 'fallen') break;
  }
  const v = session.board.velocity;
  console.log(`${String(degrees).padStart(2)}°: popped at ${speedAtPop.toFixed(2)} m/s; ${session.phase === 'fallen' ? `FELL (${session.separation}) ${(t - popped).toFixed(2)} s after the pop` : `standing ${(stood - popped).toFixed(2)} s after the pop, ${Math.hypot(v.x, v.z).toFixed(2)} m/s at the end`}; `
    + `pop-up's least contact load ${minLoad.toFixed(2)} body weights, contact infeasible ${infeasible.toFixed(2)} s`);
}
