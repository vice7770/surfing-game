import { Vector3 } from 'three';
import type { LipContactParcel, LipParcelSource } from '../physics/DetachedSurfer';
import { GRAVITY } from './dispersion';
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

/**
 * Tube width-to-length ratio W/L. The ξ_b mapping is the plan's modeling choice
 * (Q12): almond (1:3) at ξ = 0.4 to round (1:1) at ξ = 2.0, after passyworld's
 * tube ratios. Wind tilts it by −0.18 per unit U/C, the slope of Feddersen et
 * al. (2023): W/L ≈ 0.48 offshore to ≈ 0.25 at U/C = 0.75.
 */
export function tubeWidthRatio(iribarren: number, windOverCelerity: number): number {
  const plunge = clamp((iribarren - 0.4) / 1.6, 0, 1);
  return clamp(1 / 3 + (2 / 3) * plunge - 0.18 * windOverCelerity, 0.2, 1);
}

/** A flying parcel's place in the lip sheet. */
export interface LipSheetParcel {
  /** Pool slot, as `forEachLink` names it. */
  slot: number;
  x: number;
  y: number;
  z: number;
  /** World column (x / dx, rounded), so links survive a sliding window. */
  column: number;
  /** Place along its strip: 0 left the crest first. */
  index: number;
  launchTime: number;
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
  /** Breaker height H_b, m. */
  breakerHeight: number;
  /** Local wind over the breaker celerity, positive onshore. */
  windOverCelerity: number;
  /** Crest length the throw covers, m. */
  width: number;
}

export interface LipThrow {
  /** Water thrown, m³: the overturn area times the crest length. */
  volume: number;
  /** Level launch speed that lands the lip one tube length L = H·(L/W) ahead, m/s. */
  speed: number;
  widthRatio: number;
}

/** A lip only leaves plunging breakers, 0.4 ≤ ξ_b ≤ 2.0 (plan §1.9, Q12). */
export function lipThrow(conditions: LipConditions): LipThrow | undefined {
  const { iribarren, breakerHeight, windOverCelerity, width } = conditions;
  if (!(iribarren >= 0.4 && iribarren <= 2) || !(breakerHeight > 0)) return undefined;
  const widthRatio = tubeWidthRatio(iribarren, windOverCelerity);
  return {
    volume: overturnArea(windOverCelerity) * breakerHeight * breakerHeight * width,
    speed: Math.sqrt((GRAVITY * breakerHeight) / 2) / widthRatio,
    widthRatio,
  };
}

/**
 * Mass-conserving plunging lip for the physical surf zone (plan §1.9, Q12).
 * A throw takes water from the crest cell and its across-shore neighbours (at
 * most a fifth of each), keeping their velocity, and launches it as ballistic
 * parcels. A parcel that falls back through the surface returns its volume and
 * horizontal momentum to the cell it lands in, which drives the splash-up and
 * the secondary bore; its vertical momentum is lost to turbulence. The parcels
 * are a coarse sample of the jet: one throw is four parcels.
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
  private readonly strips = new Map<number, { column: number; launchTime: number; parcels: number[]; live: number }>();
  private readonly byColumn = new Map<number, number[]>();
  private nextStrip = 1;
  /** The lip's clock, s. */
  time = 0;
  private readonly view = { slot: 0, x: 0, y: 0, z: 0, column: 0, index: 0, launchTime: 0, volume: 0 };
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
    for (let index = capacity - 1; index >= 0; index -= 1) this.free.push(index);
  }

  /**
   * Throw up to `volume` m³ from `cell` at `height` (m above datum) with
   * horizontal `velocity` (m/s). Returns the volume actually thrown: 0 when the
   * parcel pool is full or the crest is dry.
   */
  launch(cell: number, velocity: { x: number; z: number }, height: number, volume: number, crestSpeed = 0): number {
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
      qx[index] -= (qx[index] / depth) * removed;
      qz[index] -= (qz[index] / depth) * removed;
      h[index] = depth - removed;
    }
    const x = solver.xCenters[cell - row * nx];
    const z = solver.zCenters[row];
    const stripId = this.nextStrip;
    this.nextStrip += 1;
    const column = Math.round(x / dx - 0.5);
    const strip = { column, launchTime: this.time, parcels: [] as number[], live: STRIP_PARCELS };
    const spacing = JET_RELEASE_TIME / (STRIP_PARCELS - 1);
    for (let k = 0; k < STRIP_PARCELS; k += 1) {
      const parcel = this.free.pop()!;
      strip.parcels.push(parcel);
      this.active[parcel] = 1;
      this.state[parcel] = k === 0 ? 1 : 2;
      this.releaseAt[parcel] = this.time + k * spacing;
      // Each parcel leaves from where the crest has moved to by its release.
      this.x[parcel] = this.px[parcel] = this.lx[parcel] = x + velocity.x * k * spacing;
      this.y[parcel] = this.py[parcel] = this.ly[parcel] = height;
      this.z[parcel] = this.pz[parcel] = this.lz[parcel] = z + velocity.z * k * spacing;
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
      }
      this.px[parcel] = this.x[parcel];
      this.py[parcel] = this.y[parcel];
      this.pz[parcel] = this.z[parcel];
      this.vy[parcel] -= GRAVITY * flight;
      this.x[parcel] += this.vx[parcel] * flight;
      this.y[parcel] += this.vy[parcel] * flight;
      this.z[parcel] += this.vz[parcel] * flight;
      this.age[parcel] += flight;
      const surface = solver.sampleCentered(solver.h, this.x[parcel], this.z[parcel]) + solver.sampleCentered(solver.bed, this.x[parcel], this.z[parcel]);
      if ((this.vy[parcel] < 0 && this.y[parcel] <= surface) || this.age[parcel] > MAX_FLIGHT) this.land(parcel);
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
      view.column = this.column[parcel];
      view.index = this.index[parcel];
      view.launchTime = this.launchTime[parcel];
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
