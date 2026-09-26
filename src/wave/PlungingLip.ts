import { Vector3 } from 'three';
import type { LipContactParcel, LipParcelSource } from '../physics/DetachedSurfer';
import { GRAVITY } from './dispersion';
import { jetRelativeSpeed, overturn, overturnParameter, tubeFloorDepth, type OverturnShape, type TubeGeometry } from './Overturn';
import type { ShallowWaterSolver } from './ShallowWaterSolver';

/** Parcels along one column's jet: the sheet's resolution across its thickness of flight (numerical). */
export const STRIP_PARCELS = 8;
/**
 * The jet leaves the crest over this long, s: the strip's parcels are released
 * evenly across it, each from where the crest has moved to, so a strip is the
 * jet's cross-section from its fallen tip back up to the crest. Provisional,
 * to confirm against measured jet kinematics.
 */
export const JET_RELEASE_TIME = 0.25;
/** Strips of neighbouring columns thrown within this long of each other join into one sheet, s (numerical). */
export const LINK_TIME = 1;
/** Largest share of a source cell's water one throw may take. */
const SOURCE_SHARE = 0.2;
/** Parcels still airborne after this long land where they are, s. */
const MAX_FLIGHT = 3;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Overturn area A/H² against U/C (positive onshore), through the Surf Ranch
 * values of Feddersen et al. (2023): ≈ 0.2 at U/C = 0.75 and ≈ 0.4 for offshore
 * U/C < −0.4, clamped to that range.
 */
export function overturnArea(windOverCelerity: number): number {
  return clamp(0.2 + (0.2 * (0.75 - windOverCelerity)) / 1.15, 0.2, 0.4);
}

/** A flying parcel's place in the lip sheet. */
export interface LipSheetParcel {
  /** Pool slot, as `forEachLink` names it. */
  slot: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** World column (x / dx, rounded), so links survive a sliding window. */
  column: number;
  /** Place along its strip: 0 left the crest first. */
  index: number;
  launchTime: number;
  /** Seconds since it left the crest. */
  age: number;
  volume: number;
}

/** A landed parcel's flight: where it left the crest, the height it came down at (m), how long it flew (s) and the speed of the crest it left (m/s). */
export interface LipFlight {
  launch: { x: number; y: number; z: number };
  y: number;
  age: number;
  crestSpeed: number;
}

export interface LipConditions {
  /** Local breaker-point Iribarren number ξ_b. */
  iribarren: number;
  /** Bed slope under the crest. */
  slope: number;
  /** The incoming sea's height over the tank's offshore depth, H0/h0. */
  nonlinearity: number;
  /** The breaking wave's height, m. */
  breakerHeight: number;
  /** Local wind over the breaker celerity, positive onshore. */
  windOverCelerity: number;
  /** Crest length the throw covers, m. */
  width: number;
}

export interface LipThrow {
  /** Water thrown, m³: the jet's area times the crest length. */
  volume: number;
  /** Level launch speed ahead of the crest that flies the jet over the void, m/s. */
  relativeSpeed: number;
  /** The overturn, wind included. */
  shape: OverturnShape;
}

/**
 * A lip only leaves plunging breakers, 0.4 ≤ ξ_b ≤ 2.0 (plan §1.9, Q12). Its
 * overturn is Pick & Feddersen's (2026) for the bed slope and the sea, and
 * the wind reshapes the void as measured at Surf Ranch: its area by
 * `overturnArea`'s ratio to calm, and its aspect by −0.18 per unit U/C
 * (Feddersen et al. 2023).
 */
export function lipThrow(conditions: LipConditions): LipThrow | undefined {
  const { iribarren, slope, nonlinearity, breakerHeight, windOverCelerity, width } = conditions;
  if (!(iribarren >= 0.4 && iribarren <= 2) || !(breakerHeight > 0)) return undefined;
  const calm = overturn(overturnParameter(slope, nonlinearity));
  const shape: OverturnShape = {
    ...calm,
    area: (calm.area * overturnArea(windOverCelerity)) / overturnArea(0),
    aspect: clamp(calm.aspect - 0.18 * windOverCelerity, 0.2, 1),
  };
  return {
    volume: shape.jetArea * breakerHeight * breakerHeight * width,
    relativeSpeed: jetRelativeSpeed(shape, breakerHeight),
    shape,
  };
}

/** A void under a flying jet, riding with the crest that threw it. */
/** A lip parcel's per-slot fields, as the sea handover carries them (spec N1). */
const PARCEL_FIELDS = [
  'x', 'y', 'z', 'volume', 'vx', 'vy', 'vz', 'px', 'py', 'pz', 'id', 'age', 'active', 'lx', 'ly', 'lz', 'crestSpeed', 'state',
  'releaseAt', 'strip', 'column', 'index', 'launchTime',
] as const;

/** A lip as plain data (JSON-safe): its clock and counters, its free slots, the parcels in use and their strips. */
export interface LipState {
  capacity: number;
  time: number;
  landings: number;
  nextId: number;
  nextStrip: number;
  free: number[];
  /** The slots in use, and each per-parcel field's values in that order. */
  slots: number[];
  fields: Record<(typeof PARCEL_FIELDS)[number], number[]>;
  strips: [number, { column: number; launchTime: number; parcels: number[]; live: number; tube?: FlyingTube }][];
  byColumn: [number, number[]][];
}

interface FlyingTube {
  geometry: TubeGeometry;
  /** The crest when it threw: where, and how high, m. */
  x: number;
  z: number;
  y: number;
  /** The crest's travel direction (unit) and speed, m/s. */
  dirX: number;
  dirZ: number;
  crestSpeed: number;
  /** How fast the jet's tip leaves the crest behind, m/s. */
  relativeSpeed: number;
}

/**
 * Mass-conserving plunging lip for the physical surf zone (plan §1.9, Q12).
 * A throw takes water from the crest cell and its across-shore neighbours (at
 * most a fifth of each), with the momentum the jet carries off, and launches it
 * as ballistic parcels. A parcel that falls back through the surface returns its
 * volume and horizontal momentum to the cell it lands in, which drives the
 * splash-up and the secondary bore; its vertical momentum is lost to turbulence.
 * The parcels are a coarse sample of the jet: one throw is a strip of
 * STRIP_PARCELS.
 */
export class PlungingLip implements LipParcelSource {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly volume: Float64Array;
  /** Landings since the lip was created. */
  landings = 0;
  /**
   * Told of every landing: where the parcel fell, how much water it returned
   * (m³), how fast it hit (m/s), and its flight: where it left the crest and
   * the height it landed at (the tube it drew, `measureTube`).
   */
  onLand?: (x: number, z: number, volume: number, vx: number, vy: number, vz: number, flight?: LipFlight) => void;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly vz: Float64Array;
  /** Each parcel's position before the latest step, for swept contact, and its id (unique per throw). */
  private readonly px: Float64Array;
  private readonly py: Float64Array;
  private readonly pz: Float64Array;
  private readonly id: Float64Array;
  private nextId = 1;
  private readonly contact = {
    id: 0, previousPosition: new Vector3(), position: new Vector3(), velocity: new Vector3(), volume: 0, radius: 0,
  };
  private readonly age: Float64Array;
  private readonly active: Uint8Array;
  /** Where each parcel left the crest. */
  private readonly lx: Float64Array;
  private readonly ly: Float64Array;
  private readonly lz: Float64Array;
  /** The speed of the crest each parcel left, m/s. */
  private readonly crestSpeed: Float64Array;
  /** 0 free, 1 flying, 2 waiting to leave the crest. */
  private readonly state: Uint8Array;
  /** When a waiting parcel leaves, s on the lip's clock. */
  private readonly releaseAt: Float64Array;
  /** Each parcel's strip (throw), world column, place along the strip and the strip's launch time. */
  private readonly strip: Int32Array;
  private readonly column: Int32Array;
  private readonly index: Uint8Array;
  private readonly launchTime: Float64Array;
  /** Live strips: their parcels, by strip id; and the strips of each world column. */
  private readonly strips = new Map<number, { column: number; launchTime: number; parcels: number[]; live: number; tube?: FlyingTube }>();
  private readonly byColumn = new Map<number, number[]>();
  private nextStrip = 1;
  /** The lip's clock, s. */
  time = 0;
  private readonly view = { slot: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, column: 0, index: 0, launchTime: 0, age: 0, volume: 0 };
  /** Marks parcels a query found linked, by query number. */
  private readonly linked: Uint32Array;
  private query = 0;
  private readonly near = { a: new Vector3(), b: new Vector3(), pa: new Vector3(), pb: new Vector3(), velocity: new Vector3() };
  private readonly flight: LipFlight = { launch: { x: 0, y: 0, z: 0 }, y: 0, age: 0, crestSpeed: 0 };
  private readonly free: number[] = [];

  constructor(private readonly solver: ShallowWaterSolver, readonly capacity = 16384) {
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    this.z = new Float64Array(capacity);
    this.volume = new Float64Array(capacity);
    this.vx = new Float64Array(capacity);
    this.vy = new Float64Array(capacity);
    this.vz = new Float64Array(capacity);
    this.px = new Float64Array(capacity);
    this.py = new Float64Array(capacity);
    this.pz = new Float64Array(capacity);
    this.id = new Float64Array(capacity);
    this.age = new Float64Array(capacity);
    this.active = new Uint8Array(capacity);
    this.lx = new Float64Array(capacity);
    this.ly = new Float64Array(capacity);
    this.lz = new Float64Array(capacity);
    this.crestSpeed = new Float64Array(capacity);
    this.state = new Uint8Array(capacity);
    this.releaseAt = new Float64Array(capacity);
    this.strip = new Int32Array(capacity);
    this.column = new Int32Array(capacity);
    this.index = new Uint8Array(capacity);
    this.launchTime = new Float64Array(capacity);
    this.linked = new Uint32Array(capacity);
    for (let index = capacity - 1; index >= 0; index -= 1) this.free.push(index);
  }

  /** Every per-parcel array, by name, for the sea handover (spec N1). */
  private parcelArrays(): Record<(typeof PARCEL_FIELDS)[number], Float64Array | Int32Array | Uint8Array> {
    return {
      x: this.x, y: this.y, z: this.z, volume: this.volume, vx: this.vx, vy: this.vy, vz: this.vz, px: this.px, py: this.py, pz: this.pz,
      id: this.id, age: this.age, active: this.active, lx: this.lx, ly: this.ly, lz: this.lz, crestSpeed: this.crestSpeed, state: this.state,
      releaseAt: this.releaseAt, strip: this.strip, column: this.column, index: this.index, launchTime: this.launchTime,
    };
  }

  /** The lip as plain data (spec N1: the sea handover): its clock, its parcels in flight or waiting, and their strips. */
  exportState(): LipState {
    const slots: number[] = [];
    for (let slot = 0; slot < this.capacity; slot += 1) if (this.state[slot] !== 0 || this.active[slot] !== 0) slots.push(slot);
    const arrays = this.parcelArrays();
    const fields = Object.fromEntries(PARCEL_FIELDS.map((name) => [name, slots.map((slot) => arrays[name][slot])])) as LipState['fields'];
    return {
      capacity: this.capacity, time: this.time, landings: this.landings, nextId: this.nextId, nextStrip: this.nextStrip,
      free: [...this.free], slots, fields,
      strips: [...this.strips].map(([id, strip]) => [id, {
        column: strip.column, launchTime: strip.launchTime, parcels: [...strip.parcels], live: strip.live,
        ...(strip.tube ? { tube: { ...strip.tube, geometry: { ...strip.tube.geometry } } } : {}),
      }]),
      byColumn: [...this.byColumn].map(([column, ids]) => [column, [...ids]]),
    };
  }

  /** Takes over another lip's state (the same capacity): what it has in the air lands here as it would there. */
  importState(state: LipState): void {
    if (state.capacity !== this.capacity) throw new Error(`A lip state for ${state.capacity} parcels, not ${this.capacity}`);
    const arrays = this.parcelArrays();
    for (const name of PARCEL_FIELDS) {
      arrays[name].fill(0);
      state.slots.forEach((slot, k) => { arrays[name][slot] = state.fields[name][k]; });
    }
    this.linked.fill(0);
    this.free.length = 0;
    this.free.push(...state.free);
    this.strips.clear();
    for (const [id, strip] of state.strips) {
      this.strips.set(id, {
        column: strip.column, launchTime: strip.launchTime, parcels: [...strip.parcels], live: strip.live,
        ...(strip.tube ? { tube: { ...strip.tube, geometry: { ...strip.tube.geometry } } } : {}),
      });
    }
    this.byColumn.clear();
    for (const [column, ids] of state.byColumn) this.byColumn.set(column, [...ids]);
    this.time = state.time;
    this.landings = state.landings;
    this.nextId = state.nextId;
    this.nextStrip = state.nextStrip;
  }

  /**
   * Throw up to `volume` m³ from `cell` at `height` (m above datum) with
   * horizontal `velocity` (m/s). Returns the volume actually thrown: 0 when the
   * parcel pool is full or the crest is dry.
   */
  launch(cell: number, velocity: { x: number; z: number }, height: number, volume: number, crestSpeed = 0, tube?: TubeGeometry): number {
    if (this.free.length < STRIP_PARCELS || !(volume > 0)) return 0;
    const { solver } = this;
    const { nx, h, qx, qz, dx, dz } = solver;
    const row = Math.floor(cell / nx);
    const sources: number[] = [];
    let available = 0;
    for (const index of [cell - nx, cell, cell + nx]) {
      if (index < 0 || index >= h.length) continue;
      sources.push(index);
      available += SOURCE_SHARE * h[index] * dx * dz[Math.floor(index / nx)];
    }
    if (!(available > 0)) return 0;
    const thrown = Math.min(volume, available);
    const share = thrown / available;
    for (const index of sources) {
      const depth = h[index];
      if (!(depth > 0)) continue;
      const removed = share * SOURCE_SHARE * depth;
      // The jet is the crest's fast surface water: the column keeps what is left of its momentum.
      qx[index] -= velocity.x * removed;
      qz[index] -= velocity.z * removed;
      h[index] = depth - removed;
    }
    const x = solver.xCenters[cell - row * nx];
    const z = solver.zCenters[row];
    const stripId = this.nextStrip;
    this.nextStrip += 1;
    const column = Math.round(x / dx - 0.5);
    const strip = { column, launchTime: this.time, parcels: [] as number[], live: STRIP_PARCELS, tube: undefined as FlyingTube | undefined };
    const spacing = JET_RELEASE_TIME / (STRIP_PARCELS - 1);
    // The crest moves on at its own speed, the way the jet leaves.
    const jetSpeed = Math.hypot(velocity.x, velocity.z);
    const crestX = jetSpeed > 0 ? (velocity.x / jetSpeed) * crestSpeed : 0;
    const crestZ = jetSpeed > 0 ? (velocity.z / jetSpeed) * crestSpeed : 0;
    if (tube && jetSpeed > 0) {
      strip.tube = {
        geometry: tube, x, z, y: height, dirX: velocity.x / jetSpeed, dirZ: velocity.z / jetSpeed, crestSpeed, relativeSpeed: jetSpeed - crestSpeed,
      };
    }
    for (let k = 0; k < STRIP_PARCELS; k += 1) {
      const parcel = this.free.pop()!;
      strip.parcels.push(parcel);
      this.active[parcel] = 1;
      this.state[parcel] = k === 0 ? 1 : 2;
      this.releaseAt[parcel] = this.time + k * spacing;
      // Each parcel leaves from where the crest has moved to by its release (its height is taken then).
      this.x[parcel] = this.px[parcel] = this.lx[parcel] = x + crestX * k * spacing;
      this.y[parcel] = this.py[parcel] = this.ly[parcel] = height;
      this.z[parcel] = this.pz[parcel] = this.lz[parcel] = z + crestZ * k * spacing;
      this.crestSpeed[parcel] = crestSpeed;
      this.id[parcel] = this.nextId;
      this.nextId += 1;
      this.vx[parcel] = velocity.x;
      this.vy[parcel] = 0;
      this.vz[parcel] = velocity.z;
      this.volume[parcel] = thrown / STRIP_PARCELS;
      this.age[parcel] = 0;
      this.strip[parcel] = stripId;
      this.column[parcel] = column;
      this.index[parcel] = k;
      this.launchTime[parcel] = this.time;
    }
    this.strips.set(stripId, strip);
    const inColumn = this.byColumn.get(column);
    if (inColumn) inColumn.push(stripId);
    else this.byColumn.set(column, [stripId]);
    return thrown;
  }

  /** Release the parcels whose time has come, fly them under gravity, and land those that fall through the surface. */
  step(dt: number): void {
    if (!(dt > 0)) return;
    const { solver } = this;
    this.time += dt;
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      const state = this.state[parcel];
      if (state === 0) continue;
      let flight = dt;
      if (state === 2) {
        if (this.releaseAt[parcel] > this.time) continue;
        this.state[parcel] = 1;
        flight = this.time - this.releaseAt[parcel];
        // A crest still rising as it throws lets the later jet go from higher up.
        const crest = solver.sampleCentered(solver.h, this.x[parcel], this.z[parcel]) + solver.sampleCentered(solver.bed, this.x[parcel], this.z[parcel]);
        if (crest > this.y[parcel]) this.y[parcel] = this.ly[parcel] = crest;
      }
      this.px[parcel] = this.x[parcel];
      this.py[parcel] = this.y[parcel];
      this.pz[parcel] = this.z[parcel];
      this.vy[parcel] -= GRAVITY * flight;
      this.x[parcel] += this.vx[parcel] * flight;
      this.y[parcel] += this.vy[parcel] * flight;
      this.z[parcel] += this.vz[parcel] * flight;
      this.age[parcel] += flight;
      const water = solver.sampleCentered(solver.h, this.x[parcel], this.z[parcel]) + solver.sampleCentered(solver.bed, this.x[parcel], this.z[parcel]);
      const surface = this.carve(this.x[parcel], this.z[parcel], water);
      if ((this.vy[parcel] < 0 && this.y[parcel] <= surface) || this.age[parcel] > MAX_FLIGHT) this.land(parcel);
    }
  }

  /**
   * The water surface where the lip's voids leave it, m. Under a flying jet,
   * inside its overturn, the rider and the eye meet the void's floor (the lower
   * half of the overturn curve), not the depth-averaged face that stands where
   * a real face has gone vertical. A void rides with its crest, opens as far as
   * the jet's tip has flown, and closes when its strip has landed. The solver's
   * water is left as it is.
   */
  carve(x: number, z: number, surface: number): number {
    const strips = this.byColumn.get(Math.round(x / this.solver.dx - 0.5));
    if (!strips) return surface;
    let carved = surface;
    for (const id of strips) {
      const strip = this.strips.get(id);
      const tube = strip?.tube;
      if (!strip || !tube) continue;
      const age = this.time - strip.launchTime;
      const ahead = (x - tube.x - tube.dirX * tube.crestSpeed * age) * tube.dirX + (z - tube.z - tube.dirZ * tube.crestSpeed * age) * tube.dirZ;
      if (ahead > tube.relativeSpeed * age) continue;
      const depth = tubeFloorDepth(tube.geometry, ahead);
      if (!Number.isNaN(depth)) carved = Math.min(carved, tube.y - depth);
    }
    return carved;
  }

  /** Each flying void's ground: its column's x span, and the z span from its crest to its open front, padded by a cell, m. */
  forEachTubeExtent(visit: (xMin: number, xMax: number, zMin: number, zMax: number) => void): void {
    const { dx } = this.solver;
    for (const strip of this.strips.values()) {
      const tube = strip.tube;
      if (!tube) continue;
      const age = this.time - strip.launchTime;
      const crestZ = tube.z + tube.dirZ * tube.crestSpeed * age;
      const front = crestZ + tube.dirZ * Math.min(tube.geometry.length * Math.cos(tube.geometry.tilt), tube.relativeSpeed * age);
      visit(strip.column * dx, (strip.column + 1) * dx, Math.min(crestZ, front) - dx, Math.max(crestZ, front) + dx);
    }
  }

  /** Water thrown and not yet landed, flying or still to leave the crest, m³. */
  airborneVolume(): number {
    let total = 0;
    for (let parcel = 0; parcel < this.capacity; parcel += 1) if (this.active[parcel]) total += this.volume[parcel];
    return total;
  }

  /** Parcels in use, flying or still to leave the crest. */
  activeCount(): number {
    return this.capacity - this.free.length;
  }

  /**
   * Offer each flying parcel for swept contact over the latest step, as a
   * sphere of its own volume. A velocity the visitor changes stays with the
   * parcel, so it lands with its momentum after the strike.
   */
  forEachContact(visit: (parcel: LipContactParcel) => void): void {
    const c = this.contact;
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      if (this.state[parcel] !== 1) continue;
      c.id = this.id[parcel];
      c.previousPosition.set(this.px[parcel], this.py[parcel], this.pz[parcel]);
      c.position.set(this.x[parcel], this.y[parcel], this.z[parcel]);
      c.velocity.set(this.vx[parcel], this.vy[parcel], this.vz[parcel]);
      c.volume = this.volume[parcel];
      c.radius = Math.cbrt((3 * c.volume) / (4 * Math.PI));
      visit(c);
      this.vx[parcel] = c.velocity.x;
      this.vy[parcel] = c.velocity.y;
      this.vz[parcel] = c.velocity.z;
    }
  }

  /**
   * Offer the sheet within `reach` of `center` for contact (plan P7): each link
   * at its closest point to `center`, with the link's interpolated motion, the
   * water around that point (the two parcels' volumes, weighted) and the
   * sheet's half thickness there (that volume over the link's length and a
   * column's width, at least 5 cm); and each lone flying parcel as its sphere.
   * A velocity change the visitor makes goes back to the link's two parcels in
   * proportion to their weights, so momentum is conserved.
   */
  forEachContactNear(center: Vector3, reach: number, visit: (parcel: LipContactParcel) => void): void {
    // A body gone non-finite would meet every parcel, and hand its NaN to the whole sheet.
    if (!Number.isFinite(center.x + center.y + center.z + reach)) return;
    const { near, contact: c } = this;
    this.query = (this.query + 1) >>> 0 || 1;
    const query = this.query;
    const width = this.solver.dx;
    this.forEachLink((a, b) => {
      this.linked[a] = query;
      this.linked[b] = query;
      near.a.set(this.x[a], this.y[a], this.z[a]);
      near.b.set(this.x[b], this.y[b], this.z[b]);
      const along = near.b.sub(near.a);
      const length = along.length();
      const t = length > 1e-9 ? Math.min(1, Math.max(0, near.pa.subVectors(center, near.a).dot(along) / (length * length))) : 0;
      c.position.copy(near.a).addScaledVector(along, t);
      if (c.position.distanceTo(center) > reach) return;
      near.pa.set(this.px[a], this.py[a], this.pz[a]);
      near.pb.set(this.px[b], this.py[b], this.pz[b]);
      c.previousPosition.copy(near.pa).lerp(near.pb, t);
      near.velocity.set(
        this.vx[a] + (this.vx[b] - this.vx[a]) * t,
        this.vy[a] + (this.vy[b] - this.vy[a]) * t,
        this.vz[a] + (this.vz[b] - this.vz[a]) * t,
      );
      c.velocity.copy(near.velocity);
      c.volume = this.volume[a] * (1 - t) + this.volume[b] * t;
      c.radius = Math.max(0.05, c.volume / (2 * Math.max(0.05, length) * width));
      // A link's id: negative, so it never meets a lone parcel's.
      c.id = -(this.id[a] * 4194304 + this.id[b]);
      visit(c);
      const change = near.velocity.subVectors(c.velocity, near.velocity).multiplyScalar(c.volume);
      if (change.lengthSq() === 0) return;
      this.vx[a] += (change.x * (1 - t)) / this.volume[a];
      this.vy[a] += (change.y * (1 - t)) / this.volume[a];
      this.vz[a] += (change.z * (1 - t)) / this.volume[a];
      this.vx[b] += (change.x * t) / this.volume[b];
      this.vy[b] += (change.y * t) / this.volume[b];
      this.vz[b] += (change.z * t) / this.volume[b];
    });
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      if (this.state[parcel] !== 1 || this.linked[parcel] === query) continue;
      c.position.set(this.x[parcel], this.y[parcel], this.z[parcel]);
      if (c.position.distanceTo(center) > reach) continue;
      c.id = this.id[parcel];
      c.previousPosition.set(this.px[parcel], this.py[parcel], this.pz[parcel]);
      c.velocity.set(this.vx[parcel], this.vy[parcel], this.vz[parcel]);
      c.volume = this.volume[parcel];
      c.radius = Math.cbrt((3 * c.volume) / (4 * Math.PI));
      visit(c);
      this.vx[parcel] = c.velocity.x;
      this.vy[parcel] = c.velocity.y;
      this.vz[parcel] = c.velocity.z;
    }
  }

  forEachActive(visit: (x: number, y: number, z: number, volume: number) => void): void {
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      if (this.state[parcel] === 1) visit(this.x[parcel], this.y[parcel], this.z[parcel], this.volume[parcel]);
    }
  }

  /** Each flying parcel with its place in the sheet: pool slot, world column, index along its strip and the strip's launch time. */
  forEachActiveParcel(visit: (parcel: Readonly<LipSheetParcel>) => void): void {
    const view = this.view;
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      if (this.state[parcel] !== 1) continue;
      view.slot = parcel;
      view.x = this.x[parcel];
      view.y = this.y[parcel];
      view.z = this.z[parcel];
      view.vx = this.vx[parcel];
      view.vy = this.vy[parcel];
      view.vz = this.vz[parcel];
      view.column = this.column[parcel];
      view.index = this.index[parcel];
      view.launchTime = this.launchTime[parcel];
      view.age = this.age[parcel];
      view.volume = this.volume[parcel];
      visit(view);
    }
  }

  /**
   * The sheet's links between flying parcels (pool slots): along each strip,
   * k to k + 1; and across to the next world column's strips thrown within
   * LINK_TIME, k to k. A peeling wave's strips so join into one curling sheet.
   */
  forEachLink(visit: (a: number, b: number) => void): void {
    const flying = (parcel: number) => this.state[parcel] === 1;
    for (const strip of this.strips.values()) {
      const { parcels } = strip;
      for (let k = 0; k + 1 < parcels.length; k += 1) {
        if (flying(parcels[k]) && flying(parcels[k + 1])) visit(parcels[k], parcels[k + 1]);
      }
      for (const neighbourId of this.byColumn.get(strip.column + 1) ?? []) {
        const neighbour = this.strips.get(neighbourId)!;
        if (Math.abs(neighbour.launchTime - strip.launchTime) >= LINK_TIME) continue;
        for (let k = 0; k < parcels.length; k += 1) {
          if (flying(parcels[k]) && flying(neighbour.parcels[k])) visit(parcels[k], neighbour.parcels[k]);
        }
      }
    }
  }

  private land(parcel: number): void {
    const { solver } = this;
    const cell = solver.cellIndex(this.x[parcel], this.z[parcel]);
    const area = solver.dx * solver.dz[Math.floor(cell / solver.nx)];
    const depth = this.volume[parcel] / area;
    solver.h[cell] += depth;
    solver.qx[cell] += depth * this.vx[parcel];
    solver.qz[cell] += depth * this.vz[parcel];
    this.active[parcel] = 0;
    this.state[parcel] = 0;
    this.free.push(parcel);
    this.landings += 1;
    const stripId = this.strip[parcel];
    const strip = this.strips.get(stripId);
    if (strip) {
      strip.live -= 1;
      if (strip.live === 0) {
        this.strips.delete(stripId);
        const inColumn = this.byColumn.get(strip.column)!;
        inColumn.splice(inColumn.indexOf(stripId), 1);
        if (inColumn.length === 0) this.byColumn.delete(strip.column);
      }
    }
    const { flight } = this;
    flight.launch.x = this.lx[parcel];
    flight.launch.y = this.ly[parcel];
    flight.launch.z = this.lz[parcel];
    flight.y = this.y[parcel];
    flight.age = this.age[parcel];
    flight.crestSpeed = this.crestSpeed[parcel];
    this.onLand?.(this.x[parcel], this.z[parcel], this.volume[parcel], this.vx[parcel], this.vy[parcel], this.vz[parcel], flight);
  }
}
