/**
 * A pop-up on a still sheet of water tilted at θ (canyon-catch, 2026-10-29): the prone rider paddles down it from rest
 * for `--lead` s (sprinting), pops up, and the probe reads whether it stands, how the contact load ran through the
 * push and the landing, and how the board's speed went. `--rise w` lifts the whole sheet at w m/s (a wave's face
 * rising under the board as the crest comes); `--flow u` adds a shoreward current. `--speed c` (popup-moving-face,
 * 2026-10-29) lifts each sheet as a face of its slope travelling at c m/s does, c tan θ, and moves it through the
 * bodies' step (`setSampleTime`) unless `--held` holds it still through each step, as the sea's surface was.
 *   rolldown docs/research/canyon-catch-2026-10-29/face-popup.ts -o dist/scripts/face-popup.mjs --format esm --platform node \
 *     && node dist/scripts/face-popup.mjs [--lead 3] [--rise 0.3 | --speed 6 [--held]] [--flow 0]
 */
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession } from '../../../src/physics/RideSession';
import type { SurfWater, WaterSample } from '../../../src/physics/SurfWater';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const lead = Number(option('lead') ?? 3);
const riseOption = Number(option('rise') ?? 0);
const speed = option('speed') !== undefined ? Number(option('speed')) : undefined;
const held = process.argv.includes('--held');
const flow = Number(option('flow') ?? 0);
const STEP = 1 / 60;

/** A plane whose level rises at `rise` m/s, its water moving up with it; `time` is its state's, the step's end. */
class RisingPlane implements SurfWater {
  private readonly plane: PlaneWater;
  time = 0;
  private offset = 0;
  constructor(slope: number, private readonly rise: number) {
    this.plane = new PlaneWater({ slopeZ: -Math.tan(slope), depth: 4, flow: { x: 0, y: rise, z: flow } });
  }
  surfaceAt(x: number, z: number): number { return this.plane.surfaceAt(x, z) + this.rise * (this.time + this.offset); }
  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const lift = this.rise * (this.time + this.offset);
    this.plane.sampleAt(x, y - lift, z, out);
    out.surfaceY += lift;
    out.bedY += lift;
    return out;
  }
  addReaction(): void {}
  setSampleTime(offset: number): void { this.offset = held ? 0 : offset; }
}

for (const degrees of [8, 12, 15, 18, 20, 22, 25, 28]) {
  const slope = (degrees * Math.PI) / 180;
  const water = new RisingPlane(slope, speed !== undefined ? speed * Math.tan(slope) : riseOption);
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
    water.time = t + STEP;
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
