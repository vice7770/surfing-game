import { createWaterSample, type SurfWater } from './SurfWater';

type Vec3Like = { x: number; y: number; z: number };

/**
 * The rider measured against the wave it rides (spec P9, phase 0): where the
 * crest is, how fast it moves, how high on the face the rider sits, and how fast
 * the rider must go to keep pace with a peeling break.
 */
export interface WaveFrame {
  valid: boolean;
  /** The wave's horizontal travel direction, unit. */
  directionX: number;
  directionZ: number;
  /** Metres from the crest to the rider along the travel direction: positive on the face ahead of it, negative on its back. */
  aheadOfCrest: number;
  /** The crest's speed along the travel direction, m/s, smoothed over 0.3 s. */
  crestSpeed: number;
  /** Crest height above the trough ahead of it, m. */
  faceHeight: number;
  /** Height on the face: 0 at the trough ahead, 1 at the crest (the water surface at the rider). */
  faceFraction: number;
  /** Breaking strength (the sample's `breaking`) at the crest near the rider: the most within ±4 m along the crest. */
  crestBreaking: number;
  /** Horizontal speed over ground, m/s, and its parts along the travel direction and along the crest (toward +x for a wave travelling +z). */
  speedOverGround: number;
  speedShoreward: number;
  speedAlongCrest: number;
  /** Speed needed to keep pace with the peel, c / sin α. */
  requiredSpeed: number;
}

/** Sample spacing along the travel direction, m, and the window: behind the rider, and the crest's farthest place ahead of it. */
const SPACING = 0.5;
const BACK = 40;
const CREST_AHEAD = 12;
/** How far ahead of the crest the trough is looked for, m. */
const TROUGH_SPAN = 40;
/** Below this surface slope the water gives no direction; the direction's and the crest speed's smoothing times, s. */
const MIN_SLOPE = 0.02;
const DIRECTION_TIME = 0.5;
const SPEED_TIME = 0.3;
/** A crest that moves further than this in one update, m, is a new crest. */
const NEW_CREST = 3;
/** The least face height that counts as a wave, m. */
const MIN_FACE = 0.1;
/** Peel angles at or below this are a close-out, degrees. */
const CLOSE_OUT_DEGREES = 0.5;
/** Places along the crest where breaking is read, m. */
const CREST_OFFSETS = [0, -2, 2, -4, 4];

const COUNT = Math.round((BACK + CREST_AHEAD + TROUGH_SPAN) / SPACING) + 1;
const CREST_LAST = Math.round((BACK + CREST_AHEAD) / SPACING);
const RIDER_INDEX = Math.round(BACK / SPACING);

/**
 * The speed a rider needs to keep pace with a peeling break, c / sin α, from the
 * breaker's celerity c and the peel angle α between the crest and the whitewater
 * trail (Walker 1974; Hutt et al. 2001). Infinite for a close-out.
 */
export function requiredSpeed(crestSpeed: number, peelAngleDegrees: number): number {
  if (!(peelAngleDegrees > CLOSE_OUT_DEGREES)) return Infinity;
  if (peelAngleDegrees >= 90) return crestSpeed;
  return crestSpeed / Math.sin((peelAngleDegrees * Math.PI) / 180);
}

function createWaveFrame(directionX: number, directionZ: number): WaveFrame {
  return {
    valid: false, directionX, directionZ, aheadOfCrest: 0, crestSpeed: 0, faceHeight: 0, faceFraction: 0, crestBreaking: 0,
    speedOverGround: 0, speedShoreward: 0, speedAlongCrest: 0, requiredSpeed: Infinity,
  };
}

/**
 * Measures the rider against the crest of the wave under it, from the water
 * surface alone. The direction follows the surface slope at the rider (smoothed,
 * and kept pointing the way the wave travels); the crest is the highest water in
 * a window along it, refined between samples; its speed is the smoothed rate of
 * change of its position. The returned frame is the gauge's own and is
 * overwritten by the next update.
 */
export class WaveFrameGauge {
  private readonly initialX: number;
  private readonly initialZ: number;
  private readonly frame: WaveFrame;
  private readonly heights = new Float64Array(COUNT);
  private readonly sample = createWaterSample();
  private directionX: number;
  private directionZ: number;
  private lastCrest = Number.NaN;
  private seeded = false;
  private speed = 0;

  constructor(options: { directionX?: number; directionZ?: number } = {}) {
    const x = options.directionX ?? 0;
    const z = options.directionZ ?? 1;
    const norm = Math.hypot(x, z) || 1;
    this.initialX = x / norm;
    this.initialZ = z / norm;
    this.directionX = this.initialX;
    this.directionZ = this.initialZ;
    this.frame = createWaveFrame(this.initialX, this.initialZ);
  }

  reset(): void {
    this.directionX = this.initialX;
    this.directionZ = this.initialZ;
    this.lastCrest = Number.NaN;
    this.seeded = false;
    this.speed = 0;
    Object.assign(this.frame, createWaveFrame(this.initialX, this.initialZ));
  }

  update(water: SurfWater, position: Vec3Like, velocity: Vec3Like, dt: number, peelAngleDegrees: number): WaveFrame {
    const { frame, heights } = this;
    this.steer(water, position, dt);
    const dx = this.directionX;
    const dz = this.directionZ;
    frame.directionX = dx;
    frame.directionZ = dz;
    frame.speedOverGround = Math.hypot(velocity.x, velocity.z);
    frame.speedShoreward = velocity.x * dx + velocity.z * dz;
    frame.speedAlongCrest = velocity.x * dz - velocity.z * dx;

    for (let i = 0; i < COUNT; i += 1) {
      const s = i * SPACING - BACK;
      heights[i] = water.surfaceAt(position.x + dx * s, position.z + dz * s);
    }
    let crest = 0;
    for (let i = 1; i <= CREST_LAST; i += 1) if (heights[i] > heights[crest]) crest = i;
    let trough = crest;
    const troughLast = Math.min(COUNT - 1, crest + Math.round(TROUGH_SPAN / SPACING));
    for (let i = crest + 1; i <= troughLast; i += 1) if (heights[i] < heights[trough]) trough = i;
    const interior = crest > 0 && crest < CREST_LAST;
    let offset = 0;
    let crestHeight = heights[crest];
    if (interior) {
      // A parabola through the highest sample and its neighbours.
      const before = heights[crest - 1];
      const after = heights[crest + 1];
      const curvature = before - 2 * crestHeight + after;
      if (curvature < 0) {
        offset = Math.max(-0.5, Math.min(0.5, (0.5 * (before - after)) / curvature));
        crestHeight -= 0.25 * (before - after) * offset;
      }
    }
    const faceHeight = crestHeight - heights[trough];
    frame.valid = interior && Number.isFinite(faceHeight) && faceHeight >= MIN_FACE;
    if (!frame.valid) {
      this.lastCrest = Number.NaN;
      this.seeded = false;
      frame.aheadOfCrest = 0;
      frame.faceHeight = 0;
      frame.faceFraction = 0;
      frame.crestBreaking = 0;
      frame.crestSpeed = this.speed;
      frame.requiredSpeed = requiredSpeed(this.speed, peelAngleDegrees);
      return frame;
    }

    const along = (crest + offset) * SPACING - BACK;
    frame.aheadOfCrest = -along;
    frame.faceHeight = faceHeight;
    frame.faceFraction = Math.min(1, Math.max(0, (heights[RIDER_INDEX] - heights[trough]) / faceHeight));

    // The crest's world coordinate along the direction, and its smoothed rate of change.
    const world = position.x * dx + position.z * dz + along;
    if (Number.isFinite(this.lastCrest) && dt > 0) {
      const moved = world - this.lastCrest;
      if (Math.abs(moved) > NEW_CREST) {
        this.seeded = false;
      } else if (!this.seeded) {
        this.speed = moved / dt;
        this.seeded = true;
      } else {
        this.speed += (moved / dt - this.speed) * (1 - Math.exp(-dt / SPEED_TIME));
      }
    }
    this.lastCrest = world;
    frame.crestSpeed = this.speed;
    frame.requiredSpeed = requiredSpeed(this.speed, peelAngleDegrees);

    // Breaking at the crest near the rider, along the crest axis (dz, −dx).
    const crestX = position.x + dx * along;
    const crestZ = position.z + dz * along;
    let breaking = 0;
    for (const offsetAlong of CREST_OFFSETS) {
      const x = crestX + dz * offsetAlong;
      const z = crestZ - dx * offsetAlong;
      const sample = water.sampleAt(x, crestHeight, z, this.sample);
      if (sample.wet && !sample.outsideDomain) breaking = Math.max(breaking, sample.breaking);
    }
    frame.crestBreaking = breaking;
    return frame;
  }

  /** Turn the direction toward the way the surface falls at the rider, kept pointing the way the wave travels. */
  private steer(water: SurfWater, position: Vec3Like, dt: number): void {
    const sample = water.sampleAt(position.x, water.surfaceAt(position.x, position.z), position.z, this.sample);
    if (!sample.wet || sample.outsideDomain) return;
    const slope = Math.hypot(sample.slopeX, sample.slopeZ);
    if (!(slope > MIN_SLOPE)) return;
    let x = -sample.slopeX / slope;
    let z = -sample.slopeZ / slope;
    // On the back of a wave the surface falls seaward: that is still the same wave travelling on.
    if (x * this.directionX + z * this.directionZ < 0) {
      x = -x;
      z = -z;
    }
    const blend = dt > 0 ? 1 - Math.exp(-dt / DIRECTION_TIME) : 0;
    const nx = this.directionX + (x - this.directionX) * blend;
    const nz = this.directionZ + (z - this.directionZ) * blend;
    const norm = Math.hypot(nx, nz);
    if (norm > 1e-9) {
      this.directionX = nx / norm;
      this.directionZ = nz / norm;
    }
  }
}
