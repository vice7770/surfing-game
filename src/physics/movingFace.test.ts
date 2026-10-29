import { describe, expect, it } from 'vitest';
import { PlaneWater } from './PlaneWater';
import { RideSession } from './RideSession';
import type { SurfWater, WaterSample } from './SurfWater';

const STEP = 1 / 60;

/**
 * A face of slope θ travelling shoreward at c: a plane rising at c tan θ, its water moving up with it. Its state is at
 * `time`, the end of the step the bodies integrate over (as the sea's after its step). Moving, it answers the bodies'
 * sample time (`setSampleTime`); held, it stands still through each step and jumps c tan θ dt at the next, as the
 * sea's surface did before popup-moving-face (2026-10-29).
 */
class TravellingFace implements SurfWater {
  time = 0;
  private offset = 0;
  private readonly plane: PlaneWater;
  constructor(slope: number, private readonly rise: number, private readonly held: boolean) {
    this.plane = new PlaneWater({ slopeZ: -Math.tan(slope), depth: 4, flow: { x: 0, y: rise, z: 0 } });
  }

  surfaceAt(x: number, z: number): number {
    return this.plane.surfaceAt(x, z) + this.rise * (this.time + this.offset);
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const lift = this.rise * (this.time + this.offset);
    this.plane.sampleAt(x, y - lift, z, out);
    out.surfaceY += lift;
    out.bedY += lift;
    return out;
  }

  addReaction(): void {}

  setSampleTime(offset: number): void {
    this.offset = this.held ? 0 : offset;
  }
}

/** Paddling (sprinting) down the face from rest for 3 s, then the pop-up: how long its contact could not hold, and how it ends 4 s on. */
function popUp(degrees: number, faceSpeed: number, held = false) {
  const slope = (degrees * Math.PI) / 180;
  const water = new TravellingFace(slope, faceSpeed * Math.tan(slope), held);
  const session = new RideSession();
  session.place({ x: 0, z: 0, heading: 0, speed: 0, phase: 'prone' }, water);
  let popped = false;
  let infeasible = 0;
  for (let n = 0; n < 7 / STEP && session.phase !== 'fallen'; n += 1) {
    water.time = (n + 1) * STEP;
    const pop = !popped && n * STEP >= 3;
    popped ||= pop;
    session.step(STEP, water, { paddle: !popped, sprint: !popped, popUp: pop, steer: 0 });
    if (popped && session.phase !== 'standing' && session.phase !== 'fallen' && !session.rider.contact.feasible) infeasible += STEP;
  }
  const v = session.board.velocity;
  return { phase: session.phase, infeasible, speed: Math.hypot(v.x, v.z) };
}

// popup-moving-face (2026-10-29): on a Big Canyon set's face (20° travelling at 6 m/s), the surface climbs c tan θ ≈
// 2.2 m/s. Held still through each 1/60 s step, it jumped 3.6 cm at every step: the board slid down the frozen face,
// lost its water and fell free, then was kicked by the face; a rider pushing up could not hold it and let go.
describe('a pop-up on a face travelling shoreward', () => {
  for (const degrees of [18, 22]) {
    it(`holds its contact through the push on a ${degrees}° face at 6 m/s as on a still one, where the held face kicked it`, () => {
      const still = popUp(degrees, 0);
      const moving = popUp(degrees, 6);
      const held = popUp(degrees, 6, true);
      expect(moving.phase).toBe('standing');
      // Rising uniformly with its water, the moving face is the still one seen from a lift: the same ride.
      expect(Math.abs(moving.speed - still.speed) / still.speed).toBeLessThan(0.02);
      expect(moving.infeasible).toBeLessThanOrEqual(still.infeasible + 0.02);
      expect(moving.infeasible).toBeLessThan(0.1);
      // Held through the step, the face's 60 Hz jumps cost the contact more than 0.15 s of the push (0.28 s measured).
      expect(held.infeasible).toBeGreaterThan(0.15);
    });
  }
});
