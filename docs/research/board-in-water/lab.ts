// The board-in-water probes' lab (2026-11-12). Not part of the suite: run through ./vitest.probe.config.ts.
import { appendFileSync } from 'node:fs';
// Analytic water only (flat, planar faces, a step, a rising surface). Nothing here is shipped.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../src/physics/AttachedRider';
import { BoardBody } from '../../../src/physics/BoardBody';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../src/physics/SurfWater';
import { SwellWater } from '../../../src/physics/SwellWater';
import { WET_RAMP } from '../../../src/physics/hullForces';

export const STEP = 1 / 60;
export const DEG = 180 / Math.PI;
const G = 9.81;

/** Fills a flat-ish sample (still water, 3 m deep) with surface y, slope along z, flow. */
function fill(out: WaterSample, surfaceY: number, slopeZ: number, flowY = 0, flowZ = 0): WaterSample {
  const norm = Math.hypot(slopeZ, 1);
  Object.assign(out, {
    surfaceY, stillDepth: 3, waterDepth: 3, bedY: surfaceY - 3, wet: true, outsideDomain: false, slopeX: 0, slopeZ,
    normalX: 0, normalY: 1 / norm, normalZ: -slopeZ / norm, flowX: 0, flowY, flowZ, regime: 'profile', breaking: 0, voidFraction: 0,
    bedNormalX: 0, bedNormalY: 1 / norm, bedNormalZ: -slopeZ / norm, bedMaterial: 'sand',
  });
  return out;
}

/** A planar face falling toward +z at `angle`° (0: flat), still water. */
export class Slope implements SurfWater {
  readonly s: number;
  constructor(angle: number) { this.s = -Math.tan(angle / DEG); }
  surfaceAt(_x: number, z: number): number { return this.s * z; }
  sampleAt(_x: number, _y: number, z: number, out: WaterSample): WaterSample { return fill(out, this.s * z, this.s); }
  addReaction(): void {}
}

/**
 * A planar face that tilts from flat to `angle`° over `ramp` s about the line z = 0 (falling toward +z), the water at
 * each point moving up or down with its surface: a rider placed on the flat finds the slope come on gradually.
 */
export class Tilting implements SurfWater {
  time = 0;
  private offset = 0;
  constructor(readonly angle: number, readonly ramp: number) {}
  advance(dt: number): void { this.time += dt; }
  setSampleTime(offset: number): void { this.offset = offset; }
  private slope(t: number): number {
    const x = Math.min(1, Math.max(0, t / this.ramp));
    return -Math.tan((this.angle * x * x * (3 - 2 * x)) / DEG);
  }
  surfaceAt(_x: number, z: number): number { return this.slope(this.time) * z; }
  sampleAt(_x: number, _y: number, z: number, out: WaterSample): WaterSample {
    const t = this.time + this.offset;
    const s = this.slope(t);
    const rate = (this.slope(t + 1e-3) - this.slope(t - 1e-3)) / 2e-3;
    return fill(out, s * z, s, rate * z);
  }
  addReaction(): void {}
}

/** Flat still water with a fixed step of `height` m rising over `ramp` m from z = `at`. */
export class Step implements SurfWater {
  constructor(readonly at: number, readonly height: number, readonly ramp: number) {}
  surfaceAt(_x: number, z: number): number {
    const t = Math.min(1, Math.max(0, (z - this.at) / this.ramp));
    return this.height * t;
  }
  sampleAt(_x: number, _y: number, z: number, out: WaterSample): WaterSample {
    const inRamp = z > this.at && z < this.at + this.ramp;
    return fill(out, this.surfaceAt(0, z), inRamp ? this.height / this.ramp : 0);
  }
  addReaction(): void {}
}

/** Flat water whose whole surface rises by `height` m at `rate` m/s from time `start`, the water moving up with it. */
export class Rising implements SurfWater {
  time = 0;
  /** `kinematic` false: the surface rises through still water (as the pool's case surface does through the felt water, #245). */
  constructor(readonly start: number, readonly rate: number, readonly height: number, readonly kinematic = true) {}
  advance(dt: number): void { this.time += dt; }
  private level(t: number): number { return Math.min(this.height, Math.max(0, (t - this.start) * this.rate)); }
  surfaceAt(): number { return this.level(this.time); }
  private offset = 0;
  setSampleTime(offset: number): void { this.offset = offset; }
  sampleAt(_x: number, _y: number, _z: number, out: WaterSample): WaterSample {
    const t = this.time + this.offset;
    const rising = t > this.start && this.level(t) < this.height;
    return fill(out, this.level(t), 0, rising && this.kinematic ? this.rate : 0);
  }
  addReaction(): void {}
}

/**
 * A small wind chop (the new surfer's step 3.2): `trains` linear wave trains (`SwellWater`, 6 m deep) with periods
 * 1.4–2.6 s, each `height` × 0.5–1 m high, running within ±100° of +z, from phases drawn by `seed` (a Park–Miller
 * generator, so the sea is the same every run), summed. At the default 0.1 m a train the sea is about 0.2 m significant
 * height, its surface sloped a few degrees: small random bumps under a glide, not waves to ride. Each train's flow is
 * read at its depth under the summed surface (as `src/physics/testing/ChopWater.ts`, which is a larger sea). It takes
 * no reactions, and samples at the board's substep times (`setSampleTime`).
 */
export class Chop implements SurfWater {
  private readonly trains: SwellWater[] = [];
  private readonly scratch = createWaterSample();
  private offset = 0;
  constructor(readonly seed = 1, readonly height = 0.1, count = 6) {
    let state = seed * 7919 + 13;
    const random = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
    for (let i = 0; i < count; i += 1) {
      const train = new SwellWater({ height: height * (0.5 + 0.5 * random()), period: 1.4 + 1.2 * random(), direction: (random() - 0.5) * (200 / DEG), depth: 6 });
      train.time = random() * 10;
      this.trains.push(train);
    }
  }
  advance(dt: number): void { for (const train of this.trains) train.advance(dt); }
  setSampleTime(offset: number): void { this.offset = offset; }
  private shifted<T>(f: () => T): T {
    if (this.offset !== 0) for (const train of this.trains) train.time += this.offset;
    try { return f(); } finally { if (this.offset !== 0) for (const train of this.trains) train.time -= this.offset; }
  }
  surfaceAt(x: number, z: number): number { return this.shifted(() => this.trains.reduce((s, t) => s + t.surfaceAt(x, z), 0)); }
  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    return this.shifted(() => {
      const surface = this.trains.reduce((s, t) => s + t.surfaceAt(x, z), 0);
      let slopeX = 0; let slopeZ = 0; let flowX = 0; let flowY = 0; let flowZ = 0;
      for (const train of this.trains) {
        const own = train.surfaceAt(x, z);
        const sample = train.sampleAt(x, Math.min(y, surface) - surface + own, z, this.scratch);
        slopeX += sample.slopeX; slopeZ += sample.slopeZ; flowX += sample.flowX; flowY += sample.flowY; flowZ += sample.flowZ;
      }
      this.trains[0].sampleAt(x, y, z, out);
      const norm = Math.hypot(slopeX, 1, slopeZ);
      Object.assign(out, { surfaceY: surface, slopeX, slopeZ, normalX: -slopeX / norm, normalY: 1 / norm, normalZ: -slopeZ / norm, flowX, flowY, flowZ });
      return out;
    });
  }
  addReaction(): void {}
}

/**
 * Any of these waters laid on a planar face falling toward +z at `angle`° (the new surfer's step 3.2: the steady glide
 * runs down the face whose slope balances the board's drag at its speed, so the start is a terminal glide, not a placed
 * board settling or a decelerating one). Heights, slopes and normals add; the inner water's flow is kept.
 */
export class OnFace implements SurfWater {
  private readonly s: number;
  constructor(readonly angle: number, readonly inner: SurfWater) { this.s = -Math.tan(angle / DEG); }
  advance(dt: number): void { (this.inner as { advance?: (dt: number) => void }).advance?.(dt); }
  setSampleTime(offset: number): void { (this.inner as { setSampleTime?: (o: number) => void }).setSampleTime?.(offset); }
  surfaceAt(x: number, z: number): number { return this.inner.surfaceAt(x, z - 0) + this.s * z; }
  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const base = this.s * z;
    this.inner.sampleAt(x, y - base, z, out);
    const slopeX = out.slopeX;
    const slopeZ = out.slopeZ + this.s;
    const norm = Math.hypot(slopeX, 1, slopeZ);
    Object.assign(out, { surfaceY: out.surfaceY + base, bedY: out.bedY + base, slopeZ, normalX: -slopeX / norm, normalY: 1 / norm, normalZ: -slopeZ / norm });
    return out;
  }
  addReaction(): void {}
}

export interface Rig { board: BoardBody; rider?: AttachedRider }

/** A board on the surface at (0, z), heading `heading`° (from +z toward +x) in the surface plane, at `speed` through the water (the water's own velocity there added, so on a moving face it starts moving with the surface). */
export function place(water: SurfWater, z: number, heading: number, speed: number, phase?: 'prone' | 'standing' | 'none', options: ConstructorParameters<typeof BoardBody>[0] = {}, x = 0): Rig {
  const s = water.sampleAt(x, 10, z, createWaterSample());
  const normal = new Vector3(s.normalX, s.normalY, s.normalZ).normalize();
  const h = heading / DEG;
  const level = new Vector3(Math.sin(h), 0, Math.cos(h));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody(options);
  board.place(new Vector3(x, s.surfaceY, z).addScaledVector(normal, board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed).add(new Vector3(s.flowX, s.flowY, s.flowZ)));
  if (phase === 'none' || phase === undefined) return { board };
  // LEG_POWER=cap runs the probes with ruling 27's A-lite on (`legPower: 'cap'`, a-lite/README.md); RIDER=new with the
  // new surfer (`rider: 'new'`, docs/research/new-rider/3.1).
  const rider = new AttachedRider(board.shape, {
    phase, ...(process.env.LEG_POWER === 'cap' ? { legPower: 'cap' as const } : {}), ...(process.env.RIDER === 'new' ? { rider: 'new' as const } : {}),
    // SUBSTEPS=n: the new surfer's standing substeps (step 3.2's trials).
    ...(process.env.SUBSTEPS ? { standingSubsteps: Number(process.env.SUBSTEPS) } : {}),
    // YAW_SCALE=k: a scale on the new surfer's own yaw inertia (step 3.2b; 0 is 3.2's point mass).
    ...(process.env.YAW_SCALE ? { yawInertiaScale: Number(process.env.YAW_SCALE) } : {}),
    // GAINS=bank,rate,forward: the new surfer's roll balance gains (step 3.2b's sweeps).
    ...(process.env.GAINS ? { humanGains: (([bank, bankRate, forward]) => ({ bank, bankRate, forward }))(process.env.GAINS.split(',').map(Number)) } : {}),
    // BALANCE={...}: the new surfer's balance by prediction, the probes' rounds (step 3.2e; `balance` in AttachedRider).
    ...(process.env.BALANCE ? { balance: JSON.parse(process.env.BALANCE) } : {}),
  });
  board.attach(rider);
  return { board, rider };
}

export interface State {
  t: number;
  /** Speed through the water, m/s, of the board's centre. */
  speed: number;
  /** Deepest bottom point under the surface, along the surface normal, m (negative: all above). */
  draft: number;
  /** Mean depth of the wetted patches, m. */
  meanDepth: number;
  /** Wetted length along the board, m (patches at least half wet, plus one station), and wetted bottom area, m². */
  wetLength: number;
  wetArea: number;
  /** Pitch of the board's axis to the surface (nose up +), roll to the surface (left rail up +), and the bottom's attack to the flow, °. */
  pitch: number;
  roll: number;
  attack: number;
  /** Slip: the angle between the board's axis and its path through the water, in the board's plane, ° (+: sliding toward the board's right). */
  slip: number;
  /** Depth of the low rail's bottom edge and of its deck edge, m (deepest station). */
  railBottom: number;
  railDeck: number;
  /** Mean forces over the latest step in units of the system's weight: fins and rail faces across the board (+ toward its left), pressure, buoyancy along the surface normal. */
  finSide: number;
  railSide: number;
  pressureN: number;
  buoyancyN: number;
  /** The rider's peak foot load in the step, in body weights, its bank °, its phase, and whether it fell. */
  load: number;
  bank: number;
  phase: string;
  fell?: string;
}

const scratch = new Vector3();
const sample = createWaterSample();

export function state(rig: Rig, water: SurfWater, t: number): State {
  const { board, rider } = rig;
  const shape = board.shape;
  const q = board.orientation;
  const centre = water.sampleAt(board.position.x, board.position.y, board.position.z, createWaterSample());
  const n = new Vector3(centre.normalX, centre.normalY, centre.normalZ);
  const fwd = new Vector3(0, 0, 1).applyQuaternion(q);
  const up = new Vector3(0, 1, 0).applyQuaternion(q);
  const left = new Vector3(1, 0, 0).applyQuaternion(q);
  const v = board.velocity.clone().sub(new Vector3(centre.flowX, centre.flowY, centre.flowZ));
  const speed = v.length();
  let draft = -Infinity;
  let sum = 0;
  let wet = 0;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of shape.patches) {
    const w = board.toWorld(p.position, scratch);
    const s = water.sampleAt(w.x, w.y, w.z, sample);
    const depth = (s.surfaceY - w.y) * s.normalY;
    draft = Math.max(draft, depth);
    if (s.surfaceY - w.y >= 0) {
      sum += depth;
      wet += 1;
      zMin = Math.min(zMin, p.position.z);
      zMax = Math.max(zMax, p.position.z);
    }
  }
  const stationLength = shape.patches[0].length;
  const wetLength = zMax >= zMin ? zMax - zMin + stationLength : 0;
  // Rails: each station's two side edges, bottom and deck (rail taper).
  let railBottom = -Infinity;
  let railDeck = -Infinity;
  const stations = [...new Set(shape.patches.map((p) => p.position.z))];
  for (const z of stations) {
    const sf = Math.min(1, Math.max(0, z / shape.length + 0.5));
    const half = shape.curves.width(sf) / 2;
    const y0 = shape.curves.rocker(sf);
    const y1 = y0 + shape.curves.thickness(sf) * (1 - shape.taper);
    for (const side of [1, -1]) {
      for (const [y, which] of [[y0, 0], [y1, 1]] as const) {
        const w = board.toWorld({ x: side * half, y, z }, scratch);
        const s = water.sampleAt(w.x, w.y, w.z, sample);
        const depth = (s.surfaceY - w.y) * s.normalY;
        if (which === 0) railBottom = Math.max(railBottom, depth);
        else railDeck = Math.max(railDeck, depth);
      }
    }
  }
  const weight = (board.mass + (rider?.attached ? rider.mass : 0)) * G;
  const vb = v.clone().applyQuaternion(q.clone().invert());
  const slip = Math.atan2(-vb.x, vb.z) * DEG;
  const attack = speed > 0.05 ? Math.asin(Math.max(-1, Math.min(1, -v.dot(up) / speed))) * DEG : Number.NaN;
  return {
    t, speed, draft, meanDepth: wet > 0 ? sum / wet : Number.NaN, wetLength, wetArea: board.wettedArea,
    pitch: Math.asin(Math.max(-1, Math.min(1, fwd.dot(n)))) * DEG, roll: Math.asin(Math.max(-1, Math.min(1, left.dot(n)))) * DEG, attack, slip,
    railBottom, railDeck,
    finSide: board.forces.fins.dot(left) / weight, railSide: board.forces.rails.dot(left) / weight,
    pressureN: board.forces.pressure.dot(n) / weight, buoyancyN: board.forces.buoyancy.dot(n) / weight,
    load: rider ? rider.contact.load : 0, bank: rider ? rider.bank.angle * DEG : 0, phase: rider ? rider.phase : 'board', fell: rider && !rider.attached ? String(rider.separation) : undefined,
  };
}

export function run(rig: Rig, water: SurfWater, seconds: number, each?: (s: State) => void, before?: (t: number) => void): State[] {
  const frames: State[] = [];
  const advance = (water as { advance?: (dt: number) => void }).advance?.bind(water);
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    const t = (i + 1) * STEP;
    before?.(t);
    advance?.(STEP);
    rig.board.step(STEP, water);
    const s = state(rig, water, t);
    frames.push(s);
    each?.(s);
    if (s.fell) break;
  }
  return frames;
}

/** Mean of numeric fields over frames. */
export function mean(frames: State[]): State {
  const out = { ...frames[frames.length - 1] } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    const values = frames.map((f) => (f as unknown as Record<string, unknown>)[key]);
    if (typeof values[0] === 'number') out[key] = (values as number[]).reduce((a, b) => a + b, 0) / values.length;
  }
  return out as unknown as State;
}

export const r = (x: number, d = 2) => (Number.isFinite(x) ? +x.toFixed(d) : null);
export const WET = WET_RAMP;

/** One line of output: appended to $OUT (vitest hides a passing test's console). */
export function emit(line: unknown): void {
  const out = process.env.OUT;
  if (out) appendFileSync(out, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}
