import { Euler, Vector3 } from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';

export type RunState = 'ready' | 'paddling' | 'pop-up-available' | 'catching' | 'riding' | 'missed' | 'wipeout' | 'complete';

export interface PhysicsSettings {
  paddleForce: number;
  boardResponse: number;
}

export interface BoardInput {
  paddle: boolean;
  steer: number;
  getUp: boolean;
}

export interface BoardDiagnostics {
  speed: number;
  waterline: number;
  submersion: number;
  catchProgress: number;
  state: RunState;
  localWaterSpeed: number;
  relativeSpeed: number;
  distanceToCrest: number;
  popUpAvailable: boolean;
}

export class BoardPhysics {
  private readonly boardMass = 80;
  readonly position = new Vector3(0, 0.05, 0);
  readonly velocity = new Vector3();
  readonly rotation = new Euler(0, 0, 0, 'YXZ');
  state: RunState = 'ready';
  time = 0;
  rideDistance = 0;
  private catchTime = 0;
  private rideTime = 0;
  private aboveWaterTime = 0;
  private lastZ = 0;
  private lastWaterline = 0;
  private lastSubmersion = 0;
  private lastWaterSpeed = 0;
  private lastRelativeSpeed = 0;
  private lastCrestDistance = 0;
  private missedTime = 0;
  private readonly contacts = [
    new Vector3(-0.22, -0.08, -1.05),
    new Vector3(0.22, -0.08, -1.05),
    new Vector3(-0.22, -0.08, 1.05),
    new Vector3(0.22, -0.08, 1.05),
  ];

  constructor(readonly wave: InteractiveWaterField, readonly settings: PhysicsSettings) {}

  get contactPoints(): Vector3[] {
    return this.contacts.map((local) => local.clone().applyEuler(this.rotation).add(this.position));
  }

  step(dt: number, input: BoardInput): BoardDiagnostics {
    if (this.isTerminal()) return this.diagnostics();
    this.wave.step(dt);
    this.time += dt;
    if (input.paddle && this.state === 'ready') this.state = 'paddling';

    const contacts = this.contactPoints;
    let immersion = 0;
    let waterline = 0;
    const meanWaterVelocity = new Vector3();
    let meanSlopeX = 0;
    let meanSlopeZ = 0;
    for (const point of contacts) {
      const water = this.wave.sample(point.x, point.z);
      const depth = water.height - point.y + 0.22;
      immersion += Math.max(0, Math.min(1, depth / 0.34));
      waterline += water.height;
      meanWaterVelocity.add(water.velocity);
      meanSlopeX += water.slopeX;
      meanSlopeZ += water.slopeZ;
    }
    immersion /= contacts.length;
    waterline /= contacts.length;
    meanWaterVelocity.multiplyScalar(1 / contacts.length);
    meanSlopeX /= contacts.length;
    meanSlopeZ /= contacts.length;
    this.lastWaterline = waterline;
    this.lastSubmersion = immersion;

    const speed = this.velocity.length();
    const forwardX = Math.sin(this.rotation.y);
    const forwardZ = Math.cos(this.rotation.y);
    const relativeVelocity = this.velocity.clone().sub(meanWaterVelocity);
    const relativeForwardSpeed = relativeVelocity.x * forwardX + relativeVelocity.z * forwardZ;
    const waterForwardSpeed = meanWaterVelocity.x * forwardX + meanWaterVelocity.z * forwardZ;
    this.lastWaterSpeed = meanWaterVelocity.length();
    this.lastRelativeSpeed = relativeVelocity.length();

    const buoyancy = 9.81 * 1.14 * immersion;
    const planingLift = Math.min(5.2, speed * speed * 0.035) * immersion;
    const hydrostaticRestoring = (waterline - this.position.y) * 16 - this.velocity.y * 5;
    this.velocity.y += (buoyancy + planingLift - 9.81 + hydrostaticRestoring) * dt;

    // Drag is relative to the sampled fluid velocity: a moving wave can carry
    // the board, while a stationary surface cannot propel it forward.
    const drag = 0.55 + immersion * 0.4;
    const dragAcceleration = relativeVelocity.clone().multiplyScalar(-drag * (0.55 + immersion * 0.35));
    this.velocity.addScaledVector(dragAcceleration, dt);
    if (input.paddle && (this.state === 'ready' || this.state === 'paddling' || this.state === 'pop-up-available')) {
      const paddleAcceleration = this.settings.paddleForce / 80;
      this.velocity.x += forwardX * paddleAcceleration * dt;
      this.velocity.z += forwardZ * paddleAcceleration * dt;
    }

    const response = this.settings.boardResponse;
    this.rotation.y += input.steer * response * (0.22 + speed * 0.15) * dt;
    const headingX = Math.sin(this.rotation.y);
    const headingZ = Math.cos(this.rotation.y);
    const forwardSlope = meanSlopeX * headingX + meanSlopeZ * headingZ;
    const crossSlope = meanSlopeX * Math.cos(this.rotation.y) - meanSlopeZ * Math.sin(this.rotation.y);
    const targetPitch = -Math.atan(forwardSlope);
    const targetRoll = -input.steer * (0.85 + speed * 0.35) + Math.atan(crossSlope) * 0.4;
    this.rotation.x += (targetPitch - this.rotation.x) * Math.min(1, 1.8 * response * dt);
    this.rotation.z += (targetRoll - this.rotation.z) * Math.min(1, 2.4 * response * dt);
    this.rotation.x *= Math.exp(-0.45 * dt);
    this.rotation.z *= Math.exp(-0.65 * dt);

    this.position.addScaledVector(this.velocity, dt);
    this.position.x = Math.max(-5.5, Math.min(5.5, this.position.x));
    this.position.y = Math.max(-0.7, Math.min(2.8, this.position.y));

    let worstPenetration = 0;
    let meanSurfaceVelocityY = 0;
    const movedContacts = this.contactPoints;
    for (const point of movedContacts) {
      const sample = this.wave.sample(point.x, point.z);
      worstPenetration = Math.max(worstPenetration, sample.height - point.y);
      meanSurfaceVelocityY += sample.velocity.y;
    }
    meanSurfaceVelocityY /= movedContacts.length;
    if (worstPenetration > 0.12) {
      this.position.y += worstPenetration - 0.12;
      this.velocity.y = Math.max(this.velocity.y, meanSurfaceVelocityY);
    }

    // Equal-and-opposite, deliberately modest hull reaction closes the first
    // two-way coupling loop without modelling paddle/hand fluid interaction.
    if (immersion > 0.02) {
      const dragForceOnBoard = dragAcceleration.multiplyScalar(this.boardMass);
      this.wave.applyBoardReaction(this.position.x, this.position.z, dragForceOnBoard, dt);
    }

    const crestZ = this.wave.crestZ();
    const crestDistance = crestZ - this.position.z;
    this.lastCrestDistance = crestDistance;
    const localSlope = this.wave.slopeMagnitude(this.position.x, this.position.z);
    const onIncomingFace = crestDistance > -1.5 && crestDistance < this.wave.packetWidth * 1.35
      && localSlope > 0.025 && waterForwardSpeed > 0.12;
    const canPopUp = (this.state === 'paddling' || this.state === 'pop-up-available')
      && onIncomingFace && relativeForwardSpeed > 0.04 && speed > 0.28;

    if (canPopUp) {
      this.state = 'pop-up-available';
      if (input.getUp) {
        this.state = 'catching';
        this.catchTime = 0;
      }
    } else if (this.state === 'pop-up-available') {
      this.state = 'paddling';
    }

    if (this.state === 'catching') {
      // Get Up is an explicit stance/timing change. Success still depends on
      // continued wave-driven motion after paddle thrust has ended.
      if (waterForwardSpeed > 0.25 && relativeForwardSpeed > 0.05) {
        this.catchTime += dt;
      } else this.catchTime = Math.max(0, this.catchTime - dt * 1.5);
      if (this.catchTime >= 0.55) this.state = 'riding';
      if (crestDistance < -this.wave.packetWidth * 0.8 && this.state === 'catching') this.state = 'missed';
    }

    if (this.state === 'paddling' || this.state === 'ready') {
      if (crestDistance > this.wave.packetWidth * 1.4) this.missedTime += dt;
      if (this.missedTime > 2.5) this.state = 'missed';
    }
    if (this.state === 'riding') {
      this.rideTime += dt;
      this.rideDistance += Math.max(0, this.position.z - this.lastZ);
      // A clean ride ends after 20 m or once the wave has run well beyond the
      // board. Require three seconds in the riding state before the latter so
      // the wave-pass condition cannot truncate the initial carry validation.
      if (this.rideDistance >= 20 || (this.rideTime >= 3 && crestDistance > 15)) this.state = 'complete';
      if (Math.abs(this.rotation.z) > (48 * Math.PI) / 180 || Math.abs(this.rotation.x) > (55 * Math.PI) / 180) this.state = 'wipeout';
      const aboveAllContacts = movedContacts.every((point) => point.y > this.wave.sample(point.x, point.z).height + 0.25);
      this.aboveWaterTime = aboveAllContacts ? this.aboveWaterTime + dt : 0;
      if (this.aboveWaterTime > 1) this.state = 'wipeout';
    }
    this.lastZ = this.position.z;
    return this.diagnostics();
  }

  reset(): void {
    this.wave.reset();
    this.position.set(0, 0.05, 0);
    this.velocity.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.state = 'ready';
    this.time = 0;
    this.rideDistance = 0;
    this.catchTime = 0;
    this.rideTime = 0;
    this.aboveWaterTime = 0;
    this.lastZ = 0;
    this.lastWaterline = 0;
    this.lastSubmersion = 0;
    this.lastWaterSpeed = 0;
    this.lastRelativeSpeed = 0;
    this.lastCrestDistance = 0;
    this.missedTime = 0;
  }

  diagnostics(): BoardDiagnostics {
    const points = this.contactPoints;
    const waterline = points.reduce((sum, point) => sum + this.wave.sample(point.x, point.z).height, 0) / points.length;
    const crestDistance = this.wave.crestZ() - this.position.z;
    return {
      speed: this.velocity.length(),
      waterline: this.lastWaterline || waterline,
      submersion: this.lastSubmersion,
      catchProgress: this.catchTime,
      state: this.state,
      localWaterSpeed: this.lastWaterSpeed,
      relativeSpeed: this.lastRelativeSpeed,
      distanceToCrest: this.lastCrestDistance || crestDistance,
      popUpAvailable: this.state === 'pop-up-available',
    };
  }

  private isTerminal(): boolean {
    return this.state === 'missed' || this.state === 'wipeout' || this.state === 'complete';
  }
}
