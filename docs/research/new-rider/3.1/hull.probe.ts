// The new surfer, step 3.1b: the board's own numbers for the pitch model (`pitchModel.ts`), measured. A standing rider
// (the old one, plumb and carried) towed at a steady speed on flat water (`towAlongHeading`) with W/S held at −1, 0 and +1:
// the feet's pressure along the board moves, and the board trims to it. The hull's pitch stiffness about the load is the
// load times the pressure's move over the trim's. The drag's slope with speed: the board's drag at speeds 0.5 m/s apart.
import { it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { dampedMode } from '../../../../src/dev/carveMetrics';
import { towAlongHeading } from '../../../../src/dev/heldRider';
import { STEP, Slope, emit, place, r } from '../../board-in-water/lab';

const G = 9.81;

function towed(speed: number, trim: number, seconds = 3) {
  const flat = new Slope(0);
  const rig = place(flat, 0, 0, speed, 'standing');
  const rider = rig.rider!;
  const middle = (rider as unknown as { feet: { rear: number; front: number } }).feet;
  const centre = (middle.rear + middle.front) / 2;
  rider.trim = trim;
  let n = 0; let pitch = 0; let cop = 0; let load = 0; let drag = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    towAlongHeading(rig.board, rider, speed);
    rig.board.step(STEP, flat);
    if ((i + 1) * STEP > seconds - 1) {
      const fwd = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation);
      pitch += Math.asin(fwd.y); cop += rider.contact.centreOfPressure.z - centre; load += rider.contact.force.dot(new Vector3(0, 1, 0));
      drag += -(rig.board.forces.pressure.z + rig.board.forces.friction.z + rig.board.forces.fins.z + rig.board.forces.buoyancy.z);
      n += 1;
    }
  }
  return { pitch: pitch / n, cop: cop / n, load: load / n, drag: drag / n, attached: rider.attached };
}

it('hull: pitch stiffness about the load, and the drag\'s slope', () => {
  for (const speed of [5, 7, 9]) {
    const back = towed(speed, -1);
    const mid = towed(speed, 0);
    const front = towed(speed, 1);
    const stiffness = (mid.load * (front.cop - back.cop)) / Math.max(1e-6, back.pitch - front.pitch);
    const slower = towed(speed - 0.25, 0);
    const faster = towed(speed + 0.25, 0);
    emit({
      speed, attached: back.attached && mid.attached && front.attached, trimDeg: [r(back.pitch * 57.3, 2), r(mid.pitch * 57.3, 2), r(front.pitch * 57.3, 2)],
      copM: [r(back.cop, 3), r(mid.cop, 3), r(front.cop, 3)], loadBW: r(mid.load / (73 * G), 2), pitchStiffness: r(stiffness, 0),
      dragN: r(mid.drag, 1), dragSlope: r((faster.drag - slower.drag) / 0.5, 1),
    });
  }
});

// The hull's pitch ringing: towed as above, W/S at 0, the board kicked 0.5 rad/s nose-down after 2 s; its pitch rate's
// damped mode, and with the stiffness measured above, the inertia and damping it implies (I = K / ω², C = 2 ζ √(K I)).
it('hull: pitch ringing after a kick', () => {
  for (const [speed, stiffness] of [[7, 1896], [9, 2839]] as const) {
    const flat = new Slope(0);
    const rig = place(flat, 0, 0, speed, 'standing');
    const rates: number[] = [];
    for (let i = 0; i < Math.round(4 / STEP); i += 1) {
      towAlongHeading(rig.board, rig.rider!, speed);
      if (i === Math.round(2 / STEP)) rig.board.angularVelocity.addScaledVector(new Vector3(1, 0, 0).applyQuaternion(rig.board.orientation), 0.5);
      rig.board.step(STEP, flat);
      if (i >= Math.round(2 / STEP)) rates.push(rig.board.angularVelocity.dot(new Vector3(1, 0, 0).applyQuaternion(rig.board.orientation)));
    }
    const mode = dampedMode(rates, STEP);
    if (!mode) { emit({ speed, mode: null }); continue; }
    const omega = (2 * Math.PI * mode.frequency) / Math.sqrt(Math.max(1e-6, 1 - mode.damping ** 2));
    const inertia = stiffness / (omega * omega);
    emit({ speed, frequencyHz: r(mode.frequency, 2), damping: r(mode.damping, 3), impliedInertia: r(inertia, 2), impliedDamping: r(2 * mode.damping * Math.sqrt(stiffness * inertia), 0), attached: rig.rider!.attached });
  }
});

// 3.1c (ruling 29b): the hull's pitch damping, measured with the rider held in pitch. The new surfer (`rider: 'new'`)
// with its ninth row replaced by a hold: the body turns with the deck about the feet (its pitch rate on the deck held at
// nothing), so no ankle or loop of its own acts in pitch. Towed at a steady speed, the board kicked 0.3 rad/s nose-down;
// the pair's pitch rings at ω with damping ζ. Its stiffness is the hull's about the load less the held body's toppling,
// K = K_hull − m g L, so the hull's damping is C = 2 ζ K / ω_n (no inertia needed), and the pair's inertia K / ω_n².
class HeldPitch extends AttachedRider {
  override coupleStanding(system: Float64Array, rhs: Float64Array, h: number): void {
    super.coupleStanding(system, rhs, h);
    if (!this.freeBody) return;
    const N = 9;
    const self = this as unknown as { standingBody: { speed: number }; drive: Vector3; forward: Vector3 };
    for (let j = 0; j < N; j += 1) system[8 * N + j] = 0;
    system[8 * N + 8] = 1;
    // After the solve the body's speed along its forward axis is the drive's alone: no pitch rate on the deck.
    rhs[8] = -(self.standingBody.speed + self.drive.dot(self.forward));
  }
}

it('hull: pitch damping with the rider held in pitch', () => {
  for (const [speed, hull] of [[5, 1197], [7, 1896], [9, 2839]] as const) {
    const flat = new Slope(0);
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
    const rider = new HeldPitch(board.shape, { phase: 'standing', rider: 'new' });
    board.attach(rider);
    const rates: number[] = [];
    for (let i = 0; i < Math.round(5 / STEP); i += 1) {
      towAlongHeading(board, rider, speed);
      if (i === Math.round(2.5 / STEP)) board.angularVelocity.addScaledVector(new Vector3(1, 0, 0).applyQuaternion(board.orientation), 0.3);
      board.step(STEP, flat);
      if (i >= Math.round(2.5 / STEP)) rates.push(board.angularVelocity.dot(new Vector3(1, 0, 0).applyQuaternion(board.orientation)));
    }
    const mode = dampedMode(rates, STEP);
    const length = Math.max(0.4, rider.leg.height + rider.leg.extension);
    const stiffness = hull - rider.mass * G * length;
    if (!mode) { emit({ speed, held: true, mode: null, attached: rider.attached }); continue; }
    const omega = (2 * Math.PI * mode.frequency) / Math.sqrt(Math.max(1e-6, 1 - mode.damping ** 2));
    emit({
      speed, held: true, attached: rider.attached, frequencyHz: r(mode.frequency, 2), damping: r(mode.damping, 3), legLength: r(length, 3), pairStiffness: r(stiffness, 0),
      hullDamping: r((2 * mode.damping * stiffness) / omega, 0), pairInertia: r(stiffness / (omega * omega), 1), boardPitchInertia: r(stiffness / (omega * omega) - rider.mass * length * length, 1),
    });
  }
});
