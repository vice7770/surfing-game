import type { RideInput } from '../physics/RideSession';
import type { TubeApproachCue } from '../wave/barrel/tubeApproach';
import type { AutopilotView } from './Autopilot';

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value: number, bound: number) => Math.max(-bound, Math.min(bound, value));
export type TubePilotPhase = 'seek' | 'prepare' | 'enter' | 'travel' | 'exit';

/** Dev driver: observes current water and produces the same controls as a player. */
export class TubePilot {
  phase: TubePilotPhase = 'seek';
  private front?: number;
  /** Pose rates remain available while seeking; mouth transport needs consecutive accepted guidance. */
  private previousPose?: { heading: number; bank: number };
  private previousMouth?: { mouthX: number; mouthZ: number; front: number };
  private steer = 0;
  private travelled = 0;
  private insideTime = 0;
  private insidePosition?: { x: number; z: number };
  private outsideTime = 0;
  private lastTime = Number.NaN;
  private held: RideInput = { paddle: false, popUp: false, steer: 0, crouch: 1, compress: 0, trim: 0 };

  reset(): void {
    this.phase = 'seek'; this.front = undefined; this.previousPose = undefined; this.previousMouth = undefined;
    this.steer = 0; this.travelled = 0; this.insideTime = 0; this.insidePosition = undefined;
    this.outsideTime = 0;
    this.lastTime = Number.NaN;
    this.held = { paddle: false, popUp: false, steer: 0, crouch: 1, compress: 0, trim: 0 };
  }

  next(view: AutopilotView, fallbackDt: number): RideInput {
    const time = view.seaTime;
    if (time !== undefined && time === this.lastTime) return { ...this.held };
    const dt = time !== undefined && Number.isFinite(this.lastTime)
      ? Math.max(0, time - this.lastTime) : Math.max(0, fallbackDt);
    if (time !== undefined) this.lastTime = time;
    const cue = view.ride.tubeApproach;
    const current = cue && (time === undefined || Math.abs(cue.seaTime - time) < 1e-8) ? cue : undefined;
    let target = this.faceLine(view);
    if (!current || (this.front !== undefined && current.frontId !== this.front)) {
      this.phase = 'seek'; this.front = undefined; this.insidePosition = undefined;
      this.insideTime = 0; this.travelled = 0; this.outsideTime = 0; this.previousMouth = undefined;
    } else {
      this.front = current.frontId;
      const stable = Math.abs(view.ride.bank ?? 0) < Math.PI / 7 && view.ride.balance > 0.35;
      if (current.bodyInCavity) {
        if (this.phase !== 'travel' && this.phase !== 'exit') {
          this.phase = 'travel'; this.insideTime = 0; this.travelled = 0;
        }
        this.insidePosition ??= { x: view.board.x - current.mouth.x, z: view.board.z - current.mouth.z };
        this.travelled = Math.max(0, ((view.board.x - current.mouth.x - this.insidePosition.x) * current.tangentX
          + (view.board.z - current.mouth.z - this.insidePosition.z) * current.tangentZ) * (Math.sign(view.peelDirection) || 1));
        this.outsideTime = 0;
        this.insideTime += dt;
        if (this.insideTime >= 1 && this.travelled >= 3) this.phase = 'exit';
      } else if (this.phase === 'travel') {
        // Loss of containment is an interrupted attempt, not a certified exit.
        this.phase = 'prepare'; this.insideTime = 0; this.travelled = 0; this.insidePosition = undefined;
      } else if (this.phase === 'exit') this.outsideTime += dt;
      else this.phase = current.bodyFitsMouth && stable ? 'enter' : 'prepare';
      target = this.targetHeading(view, current, stable, dt);
    }

    const previous = this.previousPose;
    const yaw = previous && dt > 0 ? wrap(view.board.heading - previous.heading) / dt : 0;
    const bank = view.ride.bank ?? 0;
    const bankRate = previous && dt > 0 ? (bank - previous.bank) / dt : 0;
    // Release a held turn as ankle bank builds; yaw damping alone allowed bank runaway.
    let wanted = clamp(wrap(target - view.board.heading) / 0.7 - 0.25 * yaw - 0.7 * bank - 0.12 * bankRate, 0.5);
    const anticipatedBank = bank + 0.2 * bankRate;
    if ((Math.abs(anticipatedBank) > 0.4 && Math.sign(wanted) === Math.sign(anticipatedBank)) || Math.abs(bank) > 0.55) {
      wanted = -0.3 * Math.sign(anticipatedBank || bank);
    }
    this.steer += clamp(wanted - this.steer, 1.5 * dt);
    this.previousPose = { heading: view.board.heading, bank };
    this.previousMouth = current && this.front === current.frontId
      ? { mouthX: current.mouth.x, mouthZ: current.mouth.z, front: current.frontId } : undefined;
    this.held = { paddle: false, popUp: false, steer: this.steer,
      crouch: this.phase === 'exit' ? Math.max(0, 1 - this.outsideTime) : 1, compress: 0, trim: 0 };
    return { ...this.held };
  }

  private faceLine(view: AutopilotView): number {
    const wave = view.ride.wave;
    const travel = wave.valid ? Math.atan2(wave.directionX, wave.directionZ) : 0;
    const open = wave.valid && Number.isFinite(wave.curlSide) && wave.curlSide !== 0
      ? -Math.sign(wave.curlSide) : Math.sign(view.peelDirection);
    const fraction = wave.valid && Number.isFinite(wave.faceFraction) ? wave.faceFraction : 0.45;
    const angle = Math.max(25, Math.min(80, 45 + 60 * (0.45 - fraction))) * Math.PI / 180;
    return travel + open * angle;
  }

  private targetHeading(view: AutopilotView, cue: TubeApproachCue, stable: boolean, dt: number): number {
    const direction = Math.sign(view.peelDirection) || 1;
    const peel = cue.tangentX * direction;
    const peelZ = cue.tangentZ * direction;
    let x: number, z: number;
    if (this.phase === 'travel') {
      x = cue.inside.x + 2 * peel; z = cue.inside.z + 2 * peelZ;
    } else if (this.phase === 'exit') {
      x = cue.mouth.x + cue.rayX * 1.5; z = cue.mouth.z + cue.rayZ * 1.5;
    } else {
      const point = this.phase === 'enter' && stable ? cue.inside : cue.mouth;
      const standOff = this.phase === 'prepare' ? 0.8 : 0;
      x = point.x + cue.rayX * standOff; z = point.z + cue.rayZ * standOff;
    }
    // Follow measured mouth transport, rather than the material velocity of the falling lip.
    const previous = this.previousMouth;
    const lead = Math.min(0.5, Math.hypot(x - view.board.x, z - view.board.z) / Math.max(2, view.ride.speed));
    if (previous && previous.front === cue.frontId && dt > 0) {
      const vx = (cue.mouth.x - previous.mouthX) / dt;
      const vz = (cue.mouth.z - previous.mouthZ) / dt;
      if (Math.hypot(vx, vz) < 20) { x += lead * vx; z += lead * vz; }
    }
    return Math.atan2(x - view.board.x, z - view.board.z);
  }
}
