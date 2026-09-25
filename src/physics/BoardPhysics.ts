import { Euler, Vector3 } from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';
import type { PlungingSheet } from '../wave/PlungingSheet';
import { RiderFall } from './RiderFall';

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
  rideDistance: number;
  waterline: number;
  submersion: number;
  catchProgress: number;
  state: RunState;
  localWaterSpeed: number;
  relativeSpeed: number;
  distanceToCrest: number;
  popUpAvailable: boolean;
  breaking: number;
  lipImpact: number;
  lateralSpeed: number;
  pathTurnRate: number;
  balance: number;
  flow: number;
  maneuver: string;
  outcomeReason: string;
}

export class BoardPhysics {
  private readonly boardMass = 80;
  private readonly riderMass = 74;
  readonly position = new Vector3(0, 0.05, 0);
  readonly velocity = new Vector3();
  readonly rotation = new Euler(0, 0, 0, 'YXZ');
  readonly riderFall = new RiderFall();
  state: RunState = 'ready';
  time = 0;
  rideDistance = 0;
  private catchTime = 0;
  private rideTime = 0;
  private wipeoutElapsed = 0;
  private aboveWaterTime = 0;
  private lastZ = 0;
  private lastWaterline = 0;
  private lastSubmersion = 0;
  private lastWaterSpeed = 0;
  private lastRelativeSpeed = 0;
  private lastCrestDistance = 0;
  private missedTime = 0;
  private lastBreaking = 0;
  private lastLipImpact = 0;
  private lastLateralSpeed = 0;
  private lastPathTurnRate = 0;
  private balance = 1;
  private lean = 0;
  private flow = 0;
  private maneuver = '';
  private maneuverTime = 0;
  private heldTurnTime = 0;
  private lastTurnDirection = 0;
  private turnReleaseTime = 0;
  private outcomeReason = '';
  private readonly contacts = [
    new Vector3(-0.22, -0.08, -1.05),
    new Vector3(0.22, -0.08, -1.05),
    new Vector3(-0.22, -0.08, 1.05),
    new Vector3(0.22, -0.08, 1.05),
  ];

  constructor(readonly wave: InteractiveWaterField, readonly settings: PhysicsSettings,
    readonly plungingSheet?: PlungingSheet) {}

  get contactPoints(): Vector3[] {
    return this.contacts.map((local) => local.clone().applyEuler(this.rotation).add(this.position));
  }

  get riderLean(): number { return this.lean; }

  step(dt: number, input: BoardInput): BoardDiagnostics {
    if (this.state === 'wipeout') {
      if (this.wipeoutElapsed >= 3) return this.diagnostics();
      this.wave.step(dt);
      this.plungingSheet?.step(dt);
      this.time += dt;
      this.wipeoutElapsed += dt;
      this.riderFall.step(dt, this.wave);
      const water = this.wave.sample(this.position.x, this.position.z);
      this.velocity.x += (water.velocity.x - this.velocity.x) * Math.min(1, dt * 0.8);
      this.velocity.z += (water.velocity.z - this.velocity.z) * Math.min(1, dt * 0.8);
      this.velocity.y += (water.height + 0.08 - this.position.y) * dt * 8;
      this.velocity.y *= Math.exp(-4 * dt);
      this.position.addScaledVector(this.velocity, dt);
      this.rotation.z *= Math.exp(-0.5 * dt);
      return this.diagnostics();
    }
    if (this.isTerminal()) return this.diagnostics();
    this.wave.step(dt);
    this.plungingSheet?.step(dt);
    this.time += dt;
    if (input.paddle && this.state === 'ready') this.state = 'paddling';

    const contacts = this.contactPoints;
    let immersion = 0;
    let waterline = 0;
    const meanWaterVelocity = new Vector3();
    let meanSlopeX = 0;
    let meanSlopeZ = 0;
    let meanBreaking = 0;
    const contactPressure = new Vector3();
    for (const point of contacts) {
      const water = this.wave.sample(point.x, point.z);
      const depth = water.height - point.y + 0.22;
      const contactImmersion = Math.max(0, Math.min(1, depth / 0.34));
      immersion += contactImmersion;
      waterline += water.height;
      meanWaterVelocity.add(water.velocity);
      meanSlopeX += water.slopeX;
      meanSlopeZ += water.slopeZ;
      meanBreaking += water.breaking;
      const approachSpeed = Math.max(0, Math.min(1.5, water.velocity.clone().sub(this.velocity).dot(water.normal)));
      const support = 9.81 * contactImmersion + approachSpeed * 2;
      contactPressure.addScaledVector(water.normal, support / contacts.length);
    }
    immersion /= contacts.length;
    waterline /= contacts.length;
    meanWaterVelocity.multiplyScalar(1 / contacts.length);
    meanSlopeX /= contacts.length;
    meanSlopeZ /= contacts.length;
    meanBreaking /= contacts.length;
    this.lastBreaking = meanBreaking;
    this.lastWaterline = waterline;
    this.lastSubmersion = immersion;

    const speed = this.velocity.length();
    const previousTravelHeading = Math.atan2(this.velocity.x, this.velocity.z);
    const previousBoardHeading = this.rotation.y;
    const forwardX = Math.sin(this.rotation.y);
    const forwardZ = Math.cos(this.rotation.y);
    const relativeVelocity = this.velocity.clone().sub(meanWaterVelocity);
    const tangentRelativeSpeed = Math.hypot(relativeVelocity.x, relativeVelocity.z);
    const lateralSlip = relativeVelocity.x * forwardZ - relativeVelocity.z * forwardX;
    const forwardRelative = relativeVelocity.x * forwardX + relativeVelocity.z * forwardZ;
    this.lastLateralSpeed = lateralSlip;
    const waterForwardSpeed = meanWaterVelocity.x * forwardX + meanWaterVelocity.z * forwardZ;
    this.lastWaterSpeed = meanWaterVelocity.length();
    this.lastRelativeSpeed = relativeVelocity.length();

    const buoyancy = 9.81 * 1.14 * immersion;
    const planingLift = Math.min(5.2, tangentRelativeSpeed * tangentRelativeSpeed * 0.035) * immersion;
    const hydrostaticRestoring = (waterline - this.position.y) * 16 - this.velocity.y * 5;
    this.velocity.y += (buoyancy + planingLift - 9.81 + hydrostaticRestoring) * dt;

    // Drag is relative to the sampled fluid velocity: a moving wave can carry
    // the board, while a stationary surface cannot propel it forward.
    const waterOvertaking = Math.max(0, -forwardRelative);
    const longitudinalDrag = 0.14 + immersion * 0.12 + Math.min(2, waterOvertaking) * immersion;
    const crossDrag = 0.35 + immersion * 0.4;
    const dragAcceleration = new Vector3(
      -forwardRelative * longitudinalDrag * forwardX - lateralSlip * crossDrag * forwardZ,
      -this.velocity.y * 0.25,
      -forwardRelative * longitudinalDrag * forwardZ + lateralSlip * crossDrag * forwardX,
    );
    this.velocity.addScaledVector(dragAcceleration, dt);
    // Rails and fins resist sideways slip through the local moving water.
    // Rotating the board alone does not turn its path; this lateral force does.
    const slipAngle = Math.atan2(lateralSlip, Math.max(0.35, Math.abs(forwardRelative)));
    const finLift = Math.tanh(3 * slipAngle);
    const railAcceleration = -Math.max(-3.5, Math.min(3.5,
      finLift * tangentRelativeSpeed * tangentRelativeSpeed * immersion
      * (this.state === 'riding' ? 0.18 : 0.085),
    ));
    this.velocity.x += forwardZ * railAcceleration * dt;
    this.velocity.z -= forwardX * railAcceleration * dt;
    if (this.state === 'catching' || this.state === 'riding') {
      this.velocity.x += contactPressure.x * dt;
      this.velocity.z += contactPressure.z * dt;
    }
    // The breaking part of the same wave adds turbulence and reduces support.
    // It is sampled from the authoritative field and remains deterministic.
    if (meanBreaking > 0.01) {
      this.velocity.x += meanBreaking * Math.sin(this.time * 9 + this.wave.shape.phase) * 0.55 * dt;
      this.velocity.y -= meanBreaking * 0.45 * dt;
    }
    if (input.paddle && (this.state === 'ready' || this.state === 'paddling' || this.state === 'pop-up-available')) {
      const paddleAcceleration = this.settings.paddleForce / 80;
      this.velocity.x += forwardX * paddleAcceleration * dt;
      this.velocity.z += forwardZ * paddleAcceleration * dt;
    }

    const response = this.settings.boardResponse;
    this.lean += (input.steer - this.lean) * Math.min(1, 4.5 * dt);
    this.rotation.y += input.steer * response * (0.22 + speed * 0.15) * dt;
    const headingX = Math.sin(this.rotation.y);
    const headingZ = Math.cos(this.rotation.y);
    const forwardSlope = meanSlopeX * headingX + meanSlopeZ * headingZ;
    const crossSlope = meanSlopeX * Math.cos(this.rotation.y) - meanSlopeZ * Math.sin(this.rotation.y);
    const targetPitch = -Math.atan(forwardSlope);
    const targetRoll = -this.lean * (this.riderMass / this.boardMass)
      * (0.65 + Math.min(0.45, speed * 0.12)) + Math.atan(crossSlope) * 0.4;
    const pitchResponse = 6 + Math.min(4, Math.hypot(meanSlopeX, meanSlopeZ) * 8);
    this.rotation.x += (targetPitch - this.rotation.x) * Math.min(1, pitchResponse * response * dt);
    this.rotation.z += (targetRoll - this.rotation.z) * Math.min(1, 2.4 * response * dt);
    this.rotation.x *= Math.exp(-0.45 * dt);
    this.rotation.z *= Math.exp(-0.65 * dt);
    const travelHeading = Math.atan2(this.velocity.x, this.velocity.z);
    const pathTurnRate = Math.atan2(
      Math.sin(travelHeading - previousTravelHeading),
      Math.cos(travelHeading - previousTravelHeading),
    ) / dt;
    this.lastPathTurnRate = pathTurnRate;
    const boardTurnRate = (this.rotation.y - previousBoardHeading) / dt;

    if (this.state === 'riding') {
      const control = Math.min(1, Math.abs(input.steer));
      const faceGap = Math.max(0, Math.abs(crestDistanceFrom(this.wave, this.position.z))
        - this.wave.packetWidth * 2);
      const instability = meanBreaking * 0.6 + Math.max(0, Math.abs(lateralSlip) - 0.8) * 0.06
        + Math.max(0, Math.abs(this.rotation.z) - 0.45) * 0.28
        + (this.wave.settings.sustained ? control * control * 0.1 + Math.min(0.5, faceGap * 0.06) : 0);
      this.balance = Math.max(0, Math.min(1, this.balance + dt * (0.11 * (1 - control) - instability)));
      const pocket = crestDistanceFrom(this.wave, this.position.z) > -this.wave.packetWidth * 0.7
        && crestDistanceFrom(this.wave, this.position.z) < this.wave.packetWidth * 1.2;
      this.flow = Math.max(0, Math.min(1, this.flow + dt * ((pocket ? 0.12 : -0.1) - meanBreaking * 0.14)));
      this.updateManeuver(input.steer, speed, pocket, pathTurnRate, boardTurnRate, lateralSlip, dt);
    }
    if (this.maneuverTime > 0) this.maneuverTime = Math.max(0, this.maneuverTime - dt);
    else this.maneuver = '';

    this.velocity.y = Math.max(-2.4, Math.min(1.5, this.velocity.y));
    this.position.addScaledVector(this.velocity, dt);
    const sideMargin = this.wave.settings.sustained ? 10 : 2;
    this.position.x = Math.max(this.wave.xMin + sideMargin,
      Math.min(this.wave.xMin + (this.wave.nx - 1) * this.wave.spacing - sideMargin, this.position.x));
    this.position.y = Math.max(-0.7, Math.min(2.8, this.position.y));

    this.lastLipImpact *= Math.exp(-3 * dt);
    if (this.plungingSheet) {
      const standing = this.state === 'catching' || this.state === 'riding';
      const riderCenter = this.position.clone().add(new Vector3(0, standing ? 0.75 : 0.28, 0));
      const impact = this.plungingSheet.resolveSphere(riderCenter, standing ? 0.34 : 0.27, this.velocity);
      if (impact) {
        this.velocity.addScaledVector(impact.impulse, 1 / (this.boardMass + this.riderMass));
        this.position.addScaledVector(impact.normal, Math.min(0.05, impact.penetration * 0.2));
        const impactStrength = impact.impulse.length() / 42;
        this.lastLipImpact = Math.max(this.lastLipImpact, impactStrength);
        if (this.state === 'riding') this.balance = Math.max(0, this.balance - impactStrength * 0.06);
      }
    }

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
      this.velocity.y = Math.max(this.velocity.y, Math.min(1.5, meanSurfaceVelocityY));
    }

    // Equal-and-opposite, deliberately modest hull reaction closes the first
    // two-way coupling loop without modelling paddle/hand fluid interaction.
    if (immersion > 0.02) {
      const dragForceOnBoard = dragAcceleration.multiplyScalar(this.boardMass);
      dragForceOnBoard.x += forwardZ * railAcceleration * this.boardMass;
      dragForceOnBoard.z -= forwardX * railAcceleration * this.boardMass;
      if (this.state === 'catching' || this.state === 'riding') {
        dragForceOnBoard.x += contactPressure.x * this.boardMass;
        dragForceOnBoard.z += contactPressure.z * this.boardMass;
      }
      dragForceOnBoard.y += (buoyancy + planingLift) * this.boardMass;
      this.wave.applyBoardReaction(this.position.x, this.position.z, dragForceOnBoard, dt);
    }

    const crestZ = this.wave.crestZ();
    const crestDistance = crestZ - this.position.z;
    this.lastCrestDistance = crestDistance;
    const localSlope = this.wave.slopeMagnitude(this.position.x, this.position.z);
    const onIncomingFace = crestDistance > -this.wave.packetWidth * 1.7 && crestDistance < this.wave.packetWidth * 0.1
      && localSlope > 0.035 && meanSlopeZ < -0.025;
    const canPopUp = (this.state === 'paddling' || this.state === 'pop-up-available')
      && onIncomingFace && this.velocity.z > 0.16 && speed > 0.2;

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
      const boardForwardSpeed = this.velocity.x * headingX + this.velocity.z * headingZ;
      if (boardForwardSpeed > 0.18 && (meanSlopeZ < -0.025 || waterForwardSpeed > 0.25)) {
        this.catchTime += dt;
      } else this.catchTime = Math.max(0, this.catchTime - dt * 1.5);
      if (this.catchTime >= 0.55) this.state = 'riding';
      if (crestDistance > this.wave.packetWidth * 1.5 && this.state === 'catching') {
        this.state = 'missed';
        this.outcomeReason = 'The wave ran ahead before the catch took hold.';
      }
    }

    if (this.state === 'paddling' || this.state === 'ready') {
      if (crestDistance > this.wave.packetWidth * 1.4) this.missedTime += dt;
      if (this.missedTime > 2.5) {
        this.state = 'missed';
        this.outcomeReason = 'The pop-up window passed before you stood.';
      }
    }
    if (this.state === 'riding') {
      this.rideTime += dt;
      this.rideDistance += Math.max(0, this.position.z - this.lastZ);
      if (Math.abs(this.rotation.z) > (48 * Math.PI) / 180 || Math.abs(this.rotation.x) > (55 * Math.PI) / 180) {
        this.state = 'wipeout';
        this.outcomeReason = 'The board rolled or pitched beyond a recoverable angle.';
      }
      const aboveAllContacts = this.contactPoints.every((point) => point.y > this.wave.sample(point.x, point.z).height + 0.25);
      this.aboveWaterTime = aboveAllContacts ? this.aboveWaterTime + dt : 0;
      if (this.aboveWaterTime > 1) {
        this.state = 'wipeout';
        this.outcomeReason = 'The board lost water contact for too long.';
      }
      if (this.balance <= 0.04) {
        this.state = 'wipeout';
        this.outcomeReason = this.wave.settings.sustained && Math.abs(crestDistance) > this.wave.packetWidth * 2
          ? 'The wave ran ahead and the rider lost balance on the fading face.'
          : 'Breaking water and the turn overwhelmed your balance.';
      }
      if (!this.wave.settings.sustained && this.state === 'riding' && this.rideDistance >= 20) {
        this.state = 'complete';
        this.outcomeReason = 'You held a 20 m line on the wave.';
      } else if (!this.wave.settings.sustained && this.state === 'riding' && this.rideTime >= 3 && crestDistance > 15) {
        this.state = this.rideDistance >= 8 ? 'complete' : 'missed';
        this.outcomeReason = this.state === 'complete'
          ? 'You rode the face until the wave ran ahead.'
          : 'The wave ran ahead before the ride developed.';
      }
    }
    if (this.state === 'wipeout') this.riderFall.start(this.position, this.velocity, this.rotation.z);
    this.lastZ = this.position.z;
    return this.diagnostics();
  }

  reset(): void {
    this.wave.reset();
    this.position.set(0, 0.05, 0);
    this.velocity.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.riderFall.reset();
    this.state = 'ready';
    this.time = 0;
    this.rideDistance = 0;
    this.catchTime = 0;
    this.rideTime = 0;
    this.wipeoutElapsed = 0;
    this.aboveWaterTime = 0;
    this.lastZ = 0;
    this.lastWaterline = 0;
    this.lastSubmersion = 0;
    this.lastWaterSpeed = 0;
    this.lastRelativeSpeed = 0;
    this.lastCrestDistance = 0;
    this.missedTime = 0;
    this.lastBreaking = 0;
    this.lastLipImpact = 0;
    this.plungingSheet?.reset();
    this.lastLateralSpeed = 0;
    this.lastPathTurnRate = 0;
    this.balance = 1;
    this.lean = 0;
    this.flow = 0;
    this.maneuver = '';
    this.maneuverTime = 0;
    this.heldTurnTime = 0;
    this.lastTurnDirection = 0;
    this.turnReleaseTime = 0;
    this.outcomeReason = '';
  }

  diagnostics(): BoardDiagnostics {
    const points = this.contactPoints;
    const waterline = points.reduce((sum, point) => sum + this.wave.sample(point.x, point.z).height, 0) / points.length;
    const crestDistance = this.wave.crestZ() - this.position.z;
    return {
      speed: this.velocity.length(),
      rideDistance: this.rideDistance,
      waterline: this.lastWaterline || waterline,
      submersion: this.lastSubmersion,
      catchProgress: this.catchTime,
      state: this.state,
      localWaterSpeed: this.lastWaterSpeed,
      relativeSpeed: this.lastRelativeSpeed,
      distanceToCrest: this.lastCrestDistance || crestDistance,
      popUpAvailable: this.state === 'pop-up-available',
      breaking: this.lastBreaking,
      lipImpact: this.lastLipImpact,
      lateralSpeed: this.lastLateralSpeed,
      pathTurnRate: this.lastPathTurnRate,
      balance: this.balance,
      flow: this.flow,
      maneuver: this.maneuver,
      outcomeReason: this.outcomeReason,
    };
  }

  private updateManeuver(
    steer: number, speed: number, pocket: boolean,
    pathTurnRate: number, boardTurnRate: number, lateralSlip: number, dt: number,
  ): void {
    const direction = Math.abs(steer) > 0.4 ? Math.sign(steer) : 0;
    if (direction !== 0) {
      const carvingPath = Math.sign(pathTurnRate) === direction && Math.abs(pathTurnRate) > 0.04;
      this.heldTurnTime = carvingPath && direction === this.lastTurnDirection ? this.heldTurnTime + dt : 0;
      if (this.lastTurnDirection !== 0 && direction !== this.lastTurnDirection
        && this.turnReleaseTime < 0.8 && speed > 0.8 && pocket
        && Math.abs(boardTurnRate) > 0.2 && Math.abs(lateralSlip) > 0.15) {
        this.maneuver = 'SNAP';
        this.maneuverTime = 1.2;
        this.flow = Math.min(1, this.flow + 0.1);
      } else if (carvingPath && this.heldTurnTime > 0.65 && speed > 0.6 && pocket && this.maneuverTime <= 0) {
        this.maneuver = 'CARVE';
        this.maneuverTime = 1.2;
        this.flow = Math.min(1, this.flow + 0.07);
        this.heldTurnTime = 0;
      }
      this.lastTurnDirection = direction;
      this.turnReleaseTime = 0;
    } else {
      this.turnReleaseTime += dt;
      this.heldTurnTime = 0;
      if (this.turnReleaseTime >= 0.8) this.lastTurnDirection = 0;
    }
  }

  private isTerminal(): boolean {
    return this.state === 'missed' || this.state === 'wipeout' || this.state === 'complete';
  }
}

function crestDistanceFrom(wave: InteractiveWaterField, z: number): number {
  return wave.crestZ() - z;
}
