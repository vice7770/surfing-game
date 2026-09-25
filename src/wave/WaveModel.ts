import { Vector3 } from 'three';

export interface WaveSettings {
  height: number;
  period: number;
  speed: number;
  currentX?: number;
  windX?: number;
  shelfStrength?: number;
  sustained?: boolean;
}

export interface WaveSample {
  height: number;
  slopeX: number;
  slopeZ: number;
  normal: Vector3;
  velocity: Vector3;
  breaking: number;
}

export interface WaveSeedShape {
  skew: number;
  phase: number;
  lateral: number;
}

export const DEFAULT_WAVE_SETTINGS: WaveSettings = {
  height: 1.4,
  period: 8,
  speed: 3,
  currentX: 0,
  windX: 0,
  shelfStrength: 0,
};

export function makeSeedShape(seed: number): WaveSeedShape {
  let value = seed >>> 0;
  const next = (): number => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    skew: 0.12 + next() * 0.2,
    phase: next() * Math.PI * 2,
    lateral: 0.025 + next() * 0.045,
  };
}

/**
 * CPU-authoritative depth-averaged shallow-water approximation. The incoming wave is initialized
 * as a right-travelling height/velocity packet, then evolves on a grid that can
 * scroll with a replenished swell during sustained play.
 * Rendering and board physics sample this same state. Wave speed is tunable, so
 * the field uses an effective pressure coefficient while board gravity remains
 * SI gravity; this is a qualitative, deterministic surfing model, not CFD.
 */
export class InteractiveWaterField {
  readonly shape: WaveSeedShape;
  readonly startZ = -18;
  readonly nx = 97;
  readonly nz = 161;
  readonly spacing = 0.5;
  readonly xMin = -24;
  zMin = -32;
  readonly meanDepth: number;
  readonly effectiveGravity: number;
  readonly packetWidth: number;
  time = 0;
  private driverZ = this.startZ;
  /** Cumulative horizontal-flow energy removed by breaker damping, in totalEnergy() units. */
  breakingDissipation = 0;

  private height: Float32Array;
  private nextHeight: Float32Array;
  private velocityX: Float32Array;
  private nextVelocityX: Float32Array;
  private velocityZ: Float32Array;
  private nextVelocityZ: Float32Array;
  private surfaceVelocityY: Float32Array;
  private readonly bedDepth: Float32Array;
  private readonly breakingStrength: Float32Array;
  private readonly cellArea = this.spacing * this.spacing;
  private readonly fluidDensity = 1000;
  private readonly damping = 0.003;
  private readonly viscosity = 0.08;
  private readonly peelSpeed = 2.8;

  constructor(
    readonly seed: number,
    readonly settings: WaveSettings,
  ) {
    this.shape = makeSeedShape(seed);
    this.meanDepth = Math.max(4, settings.height * 2.1);
    this.effectiveGravity = (settings.speed * settings.speed) / this.meanDepth;
    this.packetWidth = Math.max(3.4, (settings.speed * settings.period) / Math.PI * 0.72);
    const size = this.nx * this.nz;
    this.height = new Float32Array(size);
    this.nextHeight = new Float32Array(size);
    this.velocityX = new Float32Array(size);
    this.nextVelocityX = new Float32Array(size);
    this.velocityZ = new Float32Array(size);
    this.nextVelocityZ = new Float32Array(size);
    this.surfaceVelocityY = new Float32Array(size);
    this.bedDepth = new Float32Array(size);
    this.breakingStrength = new Float32Array(size);
    for (let iz = 0; iz < this.nz; iz += 1) {
      const depth = this.depthAt(0, this.zMin + iz * this.spacing);
      this.bedDepth.fill(depth, iz * this.nx, (iz + 1) * this.nx);
    }
    this.initializeIncomingWave();
  }

  /** Advance the coupled surface/flow state by one fixed simulation step. */
  step(dt: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    if (this.settings.sustained) {
      this.driverZ += this.settings.speed * 1.08 * Math.sqrt(this.depthAt(0, this.driverZ) / this.meanDepth) * dt;
      this.advanceWindow();
    }
    const dx = this.spacing;
    const inv2Dx = 1 / (2 * dx);
    const invDxSquared = 1 / (dx * dx);
    const g = this.effectiveGravity;
    const backgroundCurrent = this.settings.currentX ?? 0;
    const windX = this.settings.windX ?? 0;
    const h = this.height;
    const u = this.velocityX;
    const w = this.velocityZ;
    const hNext = this.nextHeight;
    const uNext = this.nextVelocityX;
    const wNext = this.nextVelocityZ;
    const breakingCrest = this.crestZ();
    const breakingFront = this.breakingFrontX;
    hNext.fill(0);
    uNext.fill(0);
    wNext.fill(0);
    this.breakingStrength.fill(0);

    // First update the complete horizontal flow field. Continuity below reads
    // neighboring values from this same time level, never partially updated
    // and partially stale values from an in-progress row traversal.
    for (let iz = 1; iz < this.nz - 1; iz += 1) {
      const row = iz * this.nx;
      for (let ix = 1; ix < this.nx - 1; ix += 1) {
        const index = row + ix;
        const etaX = (h[index + 1] - h[index - 1]) * inv2Dx;
        const etaZ = (h[index + this.nx] - h[index - this.nx]) * inv2Dx;
        const duDx = (u[index + 1] - u[index - 1]) * inv2Dx;
        const dwDz = (w[index + this.nx] - w[index - this.nx]) * inv2Dx;
        const damp = this.damping + this.edgeSponge(ix, iz);

        // Linearized momentum plus a mild advective term keeps the approximation
        // stable while allowing the traveling wave to carry horizontal water.
        const advectU = u[index] * duDx + w[index] * (u[index + this.nx] - u[index - this.nx]) * inv2Dx;
        const advectW = u[index] * (w[index + 1] - w[index - 1]) * inv2Dx + w[index] * dwDz;
        const lapU = (u[index - 1] + u[index + 1] + u[index - this.nx] + u[index + this.nx] - 4 * u[index]) * invDxSquared;
        const lapW = (w[index - 1] + w[index + 1] + w[index - this.nx] + w[index + this.nx] - 4 * w[index]) * invDxSquared;
        uNext[index] = this.clampVelocity(u[index] + dt * (
          this.viscosity * lapU - g * etaX - advectU - damp * (u[index] - backgroundCurrent)
          + windX
        ));
        wNext[index] = this.clampVelocity(w[index] + dt * (this.viscosity * lapW - g * etaZ - advectW - damp * w[index]));
      }
    }

    // Then update elevation from face-averaged fluxes of local water depth and
    // completed next-step flow. A flat free surface over the shelf stays at
    // rest, while a traveling packet slows as the still-water depth decreases.
    // The split prevents traversal-order-dependent divergence.
    for (let iz = 1; iz < this.nz - 1; iz += 1) {
      const row = iz * this.nx;
      for (let ix = 1; ix < this.nx - 1; ix += 1) {
        const index = row + ix;
        const eta = h[index];
        const etaX = (h[index + 1] - h[index - 1]) * inv2Dx;
        const etaZ = (h[index + this.nx] - h[index - this.nx]) * inv2Dx;
        const fluxXPlus = Math.max(0.35, (this.bedDepth[index] + eta + this.bedDepth[index + 1] + h[index + 1]) * 0.5)
          * (uNext[index] + uNext[index + 1]) * 0.5;
        const fluxXMinus = Math.max(0.35, (this.bedDepth[index] + eta + this.bedDepth[index - 1] + h[index - 1]) * 0.5)
          * (uNext[index] + uNext[index - 1]) * 0.5;
        const fluxZPlus = Math.max(0.35, (this.bedDepth[index] + eta + this.bedDepth[index + this.nx] + h[index + this.nx]) * 0.5)
          * (wNext[index] + wNext[index + this.nx]) * 0.5;
        const fluxZMinus = Math.max(0.35, (this.bedDepth[index] + eta + this.bedDepth[index - this.nx] + h[index - this.nx]) * 0.5)
          * (wNext[index] + wNext[index - this.nx]) * 0.5;
        const divFlux = (fluxXPlus - fluxXMinus + fluxZPlus - fluxZMinus) / dx;
        const lapEta = (h[index - 1] + h[index + 1] + h[index - this.nx] + h[index + this.nx] - 4 * eta) * invDxSquared;
        let nextEta = eta + dt * (this.viscosity * lapEta - divFlux);
        const x = this.xMin + ix * dx;
        if (x < breakingFront) {
          const z = this.zMin + iz * dx;
          const breaking = this.breakingAt(x, z, Math.hypot(etaX, etaZ), breakingCrest);
          if (breaking > 0) {
            this.breakingStrength[index] = breaking;
            // Spilling water spreads the crest in the shared height field.
            const neighborMean = (h[index - 1] + h[index + 1] + h[index - this.nx] + h[index + this.nx]) * 0.25;
            nextEta += dt * 0.14 * breaking * (neighborMean - eta);
          }
        }
        hNext[index] = this.clampHeight(nextEta, this.bedDepth[index]);
      }
    }

    // Apply breaker damping only after every cell has read the same complete
    // next-step flow field for its divergence. This avoids traversal bias.
    for (let index = 0; index < h.length; index += 1) {
      const breaking = this.breakingStrength[index];
      if (breaking <= 0) continue;
      const damping = 1 - Math.min(0.4, breaking * dt * 0.45);
      const flowSquared = uNext[index] * uNext[index] + wNext[index] * wNext[index];
      this.breakingDissipation += 0.5 * this.bedDepth[index] * flowSquared
        * (1 - damping * damping) * this.cellArea;
      uNext[index] *= damping;
      wNext[index] *= damping;
    }

    if (this.settings.sustained) this.driveSwell(hNext, wNext, dt);

    for (let index = 0; index < h.length; index += 1) {
      this.surfaceVelocityY[index] = (hNext[index] - h[index]) / dt;
    }
    this.height = hNext;
    this.nextHeight = h;
    this.velocityX = uNext;
    this.nextVelocityX = u;
    this.velocityZ = wNext;
    this.nextVelocityZ = w;
    this.time += dt;
  }

  sample(x: number, z: number): WaveSample {
    const height = this.sampleArray(this.height, x, z);
    const slopeX = (this.sampleHeight(x + this.spacing, z) - this.sampleHeight(x - this.spacing, z)) / (2 * this.spacing);
    const slopeZ = (this.sampleHeight(x, z + this.spacing) - this.sampleHeight(x, z - this.spacing)) / (2 * this.spacing);
    const slope = Math.hypot(slopeX, slopeZ);
    return {
      height,
      slopeX,
      slopeZ,
      normal: new Vector3(-slopeX, 1, -slopeZ).normalize(),
      velocity: new Vector3(
        this.sampleArray(this.velocityX, x, z),
        this.sampleArray(this.surfaceVelocityY, x, z),
        this.sampleArray(this.velocityZ, x, z),
      ),
      breaking: this.breakingAt(x, z, slope),
    };
  }

  /** A scheduled peel front gates breaking; live crest and slope set its strength. */
  breakingAt(x: number, z: number, slope = this.slopeMagnitude(x, z), centerCrest = this.crestZ()): number {
    if (this.settings.height <= 0) return 0;
    const frontX = this.breakingFrontX;
    if (frontX <= x) return 0;
    const behindFront = Math.max(0, Math.min(1, (frontX - x) / 2.5));
    const localCrest = centerCrest + this.crestOffset(x) - this.crestOffset(0);
    const distance = (z - localCrest) / Math.max(0.9, this.packetWidth * 0.85);
    const crestEnvelope = Math.exp(-0.5 * distance * distance);
    // The depth-averaged field cannot resolve an overturning lip. Use local
    // shoaling only to make a steep crest spill more readily on the shelf;
    // the lateral peel remains authored so the ride stays predictable.
    const depthGain = Math.sqrt(this.meanDepth / this.depthAt(x, z));
    const steepness = Math.max(0, Math.min(1, (slope - 0.035 / depthGain) * 10 * depthGain));
    return behindFront * crestEnvelope * steepness;
  }

  get breakingFrontX(): number {
    if (this.settings.sustained) {
      const span = 28;
      const phase = Math.max(0, this.time - 2) * this.peelSpeed;
      return -20 + phase % span;
    }
    return Math.max(this.xMin, Math.min(this.xMin + (this.nx - 1) * this.spacing,
      -20 + this.peelSpeed * (this.time - 2)));
  }

  heightAt(x: number, z: number): number {
    return this.sampleHeight(x, z);
  }

  /** Copy raw node elevations for rendering: node `iz * nx + ix` lands at `offset + index * stride`. */
  copyHeights(target: Float32Array, stride = 1, offset = 0): void {
    const heights = this.height;
    for (let index = 0; index < heights.length; index += 1) target[offset + index * stride] = heights[index];
  }

  /** Still-water depth; the optional shelf shallows smoothly toward shore (+z). */
  depthAt(_x: number, z: number): number {
    const strength = Math.max(0, Math.min(1, this.settings.shelfStrength ?? 0));
    const progress = Math.max(0, Math.min(1, (z + 8) / 28));
    const shelf = progress * progress * (3 - 2 * progress);
    return this.meanDepth * (1 - 0.58 * strength * shelf);
  }

  /** Steepest still-water bed slope |∂h/∂z| across the shelf, for the physics readout. */
  maxBedSlope(): number {
    const step = 0.25;
    let steepest = 0;
    for (let z = -40; z < 60; z += step) {
      steepest = Math.max(steepest, Math.abs(this.depthAt(0, z + step) - this.depthAt(0, z)) / step);
    }
    return steepest;
  }

  /** Relative depth-averaged wave energy for calibration checks, not joules. */
  totalEnergy(): number {
    let energy = 0;
    for (let index = 0; index < this.height.length; index += 1) {
      const elevation = this.height[index];
      const flowSquared = this.velocityX[index] ** 2 + this.velocityZ[index] ** 2;
      energy += 0.5 * (this.effectiveGravity * elevation * elevation + this.bedDepth[index] * flowSquared);
    }
    return energy * this.cellArea;
  }

  slopeMagnitude(x: number, z: number): number {
    const epsilon = this.spacing;
    const slopeX = (this.sampleHeight(x + epsilon, z) - this.sampleHeight(x - epsilon, z)) / (2 * epsilon);
    const slopeZ = (this.sampleHeight(x, z + epsilon) - this.sampleHeight(x, z - epsilon)) / (2 * epsilon);
    return Math.hypot(slopeX, slopeZ);
  }

  crestZ(): number {
    const centerX = Math.round((0 - this.xMin) / this.spacing);
    // Read the live packet instead of assuming deep-water travel speed. The
    // shelf changes propagation speed, so a constant-speed search window can
    // eventually leave the physical crest behind.
    let peakIndex = 1;
    let peakHeight = -Infinity;
    for (let iz = 1; iz < this.nz - 1; iz += 1) {
      const value = this.height[iz * this.nx + centerX];
      if (value > peakHeight) {
        peakHeight = value;
        peakIndex = iz;
      }
    }
    return this.zMin + peakIndex * this.spacing;
  }

  crestZAt(x: number, centerCrest = this.crestZ()): number {
    return centerCrest + this.crestOffset(x) - this.crestOffset(0);
  }

  /** Apply the equal-and-opposite water impulse to a small hull-contact footprint. */
  applyBoardReaction(x: number, z: number, forceOnBoard: Vector3, dt: number): void {
    this.applyBoardImpulse(x, z, forceOnBoard.x * dt, forceOnBoard.y * dt, forceOnBoard.z * dt);
  }

  /** The water takes −J for the impulse J (N·s) it exerted on the board at (x, z): horizontal flow, plus an outward-flow proxy for the vertical part. */
  applyBoardImpulse(x: number, z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    const gx = Math.round((x - this.xMin) / this.spacing);
    const gz = Math.round((z - this.zMin) / this.spacing);
    if (gx < 2 || gx >= this.nx - 2 || gz < 2 || gz >= this.nz - 2) return;
    let weightSum = 0;
    const weights: Array<{ index: number; weight: number }> = [];
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const weight = Math.exp(-0.7 * (dx * dx + dz * dz));
        weights.push({ index: (gz + dz) * this.nx + gx + dx, weight });
        weightSum += weight;
      }
    }
    const cellMass = this.fluidDensity * this.bedDepth[gz * this.nx + gx] * this.cellArea;
    for (const { index, weight } of weights) {
      const share = weight / weightSum;
      this.velocityX[index] = this.clampVelocity(this.velocityX[index] - impulseX * share / cellMass);
      this.velocityZ[index] = this.clampVelocity(this.velocityZ[index] - impulseZ * share / cellMass);
    }
    // A downward hull reaction cannot exist as vertical flow in this depth-
    // averaged field. Represent its first-order effect as outward surface flow.
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const radius = Math.hypot(dx, dz);
        if (radius === 0) continue;
        const weight = Math.exp(-0.7 * radius * radius) / weightSum;
        const index = (gz + dz) * this.nx + gx + dx;
        const impulse = impulseY * weight / cellMass * 0.35;
        this.velocityX[index] = this.clampVelocity(this.velocityX[index] + impulse * dx / radius);
        this.velocityZ[index] = this.clampVelocity(this.velocityZ[index] + impulse * dz / radius);
      }
    }
  }

  reset(): void {
    this.time = 0;
    this.zMin = -32;
    this.driverZ = this.startZ;
    this.breakingDissipation = 0;
    this.height.fill(0);
    this.nextHeight.fill(0);
    this.velocityX.fill(0);
    this.nextVelocityX.fill(0);
    this.velocityZ.fill(0);
    this.nextVelocityZ.fill(0);
    this.surfaceVelocityY.fill(0);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.bedDepth.fill(this.depthAt(0, this.zMin + iz * this.spacing), iz * this.nx, (iz + 1) * this.nx);
    }
    this.initializeIncomingWave();
  }

  private advanceWindow(): void {
    const shiftRows = 16;
    const shiftCells = shiftRows * this.nx;
    while (this.driverZ > this.zMin + 38) {
      for (const values of [this.height, this.nextHeight, this.velocityX, this.nextVelocityX,
        this.velocityZ, this.nextVelocityZ, this.surfaceVelocityY, this.breakingStrength, this.bedDepth]) {
        values.copyWithin(0, shiftCells);
        values.fill(0, values.length - shiftCells);
      }
      this.zMin += shiftRows * this.spacing;
      for (let iz = this.nz - shiftRows; iz < this.nz; iz += 1) {
        this.bedDepth.fill(this.depthAt(0, this.zMin + iz * this.spacing), iz * this.nx, (iz + 1) * this.nx);
      }
    }
  }

  private driveSwell(height: Float32Array, velocityZ: Float32Array, dt: number): void {
    // A moving wave maker replaces energy lost to spreading and breaking. It
    // acts on the same field sampled by the board, independently of the rider.
    const response = 1 - Math.exp(-1.15 * dt);
    const reach = this.packetWidth * 3.2;
    const first = Math.max(1, Math.floor((this.driverZ - reach - this.zMin) / this.spacing));
    const last = Math.min(this.nz - 2, Math.ceil((this.driverZ + reach - this.zMin) / this.spacing));
    for (let iz = first; iz <= last; iz += 1) {
      const z = this.zMin + iz * this.spacing;
      for (let ix = 1; ix < this.nx - 1; ix += 1) {
        const x = this.xMin + ix * this.spacing;
        const index = iz * this.nx + ix;
        const target = this.waveProfile(x, z, this.driverZ);
        const envelope = Math.exp(-0.5 * ((z - this.driverZ) / (this.packetWidth * 1.4)) ** 2);
        const gain = response * envelope;
        height[index] += (target - height[index]) * gain;
        velocityZ[index] += (this.settings.speed * target / this.meanDepth - velocityZ[index]) * gain;
      }
    }
  }

  private initializeIncomingWave(): void {
    for (let iz = 1; iz < this.nz - 1; iz += 1) {
      const z = this.zMin + iz * this.spacing;
      for (let ix = 1; ix < this.nx - 1; ix += 1) {
        const x = this.xMin + ix * this.spacing;
        const index = iz * this.nx + ix;
        const eta = this.initialHeight(x, z);
        this.height[index] = eta;
        this.velocityX[index] = this.settings.currentX ?? 0;
        // Initialize horizontal orbital motion with the right-traveling packet.
        this.velocityZ[index] = this.settings.speed * eta / this.meanDepth;
      }
    }
  }

  private initialHeight(x: number, z: number): number {
    return this.waveProfile(x, z, this.startZ);
  }

  private waveProfile(x: number, z: number, centerZ: number): number {
    const q = (z - centerZ - this.crestOffset(x)) / this.packetWidth;
    const skewed = q * (1 + this.shape.skew * Math.tanh(q));
    const crest = Math.exp(-0.5 * skewed * skewed);
    const trough = 0.55 * Math.exp(-0.5 * ((q - 1.65) / 0.75) ** 2);
    const profile = crest - trough;
    const across = 1 - this.shape.lateral * (1 - Math.cos(x * 0.22 + this.shape.phase));
    return this.settings.height * 0.74 * profile * across;
  }

  private crestOffset(x: number): number {
    return 1.6 * Math.sin(x * 0.075 + this.shape.phase) - 1.6 * Math.sin(this.shape.phase);
  }

  private sampleHeight(x: number, z: number): number {
    return this.sampleArray(this.height, x, z);
  }

  private sampleArray(values: Float32Array, x: number, z: number): number {
    const gx = (x - this.xMin) / this.spacing;
    const gz = (z - this.zMin) / this.spacing;
    if (gx < 0 || gz < 0 || gx >= this.nx - 1 || gz >= this.nz - 1) return 0;
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const tx = gx - x0;
    const tz = gz - z0;
    const i = z0 * this.nx + x0;
    const top = values[i] * (1 - tx) + values[i + 1] * tx;
    const bottom = values[i + this.nx] * (1 - tx) + values[i + this.nx + 1] * tx;
    return top * (1 - tz) + bottom * tz;
  }

  private edgeSponge(ix: number, iz: number): number {
    const width = 14;
    const edge = Math.min(ix, this.nx - 1 - ix, iz, this.nz - 1 - iz);
    const amount = Math.max(0, (width - edge) / width);
    return amount * amount * 2.4;
  }

  private clampHeight(value: number, localDepth: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-localDepth * 0.8, Math.min(this.settings.height * 2.5, value));
  }

  private clampVelocity(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-8, Math.min(8, value));
  }
}
