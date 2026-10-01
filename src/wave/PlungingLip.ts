import { Vector3 } from 'three';
import type { LipContactParcel, LipParcelSource } from '../physics/DetachedSurfer';
import { GRAVITY } from './dispersion';
import { AERATION } from './AerationField';
import { LH82_AREA, REEF_OVERTURN, jetRelativeSpeed, overturn, overturnParameter, reefOverturn, type OverturnShape, type TubeGeometry } from './Overturn';
import type { ShallowWaterSolver } from './ShallowWaterSolver';
import { TUBE_STRIDE, carveAt } from './tubeTable';

/** Parcels along one column's jet: the sheet's resolution across its thickness of flight (numerical). */
export const STRIP_PARCELS = 8;
/**
 * The jet leaves the crest over this long, s, unless a throw says otherwise
 * (a plunging break pours for its jet's flight): the strip's parcels are
 * released evenly across it, each from where the crest has moved to, so a
 * strip is the jet's cross-section from its fallen tip back up to the crest.
 */
export const JET_RELEASE_TIME = 0.25;
/** Strips of neighbouring columns thrown within this long of each other join into one sheet, s (numerical). */
export const LINK_TIME = 1;
/**
 * The splash-up a landing jet throws (G9, docs/research/whitewater-sources.md;
 * provisional, bounded by Peregrine 1983 and the measured splash-up speeds): the
 * share of a landing jet parcel's water it re-throws, its speed over the
 * impact's, up and on, and the least downward impact speed that throws one, m/s.
 */
export const SPLASH_UP = { share: 0.3, vertical: 0.6, horizontal: 0.8, minImpact: 0.5 } as const;
/**
 * A tube's trapped air (G9, docs/research/whitewater-sources.md): once its jet has
 * all landed the void closes, shrinking over its free-fall time t_c = √(2W/g) as
 * its air is squeezed out as the void loses volume. `escape` of it leaves as spray (the
 * spit, out of a peel's open end; or an eruption up through the lip where a
 * section closes all at once) and the rest breaks into bubbles. Provisional,
 * but for the air's volume, which is conserved.
 */
export const TUBE_AIR = { escape: 0.5 } as const;
/** Densities of seawater and of air, kg/m³. */
const WATER_DENSITY = 1025;
const AIR_DENSITY = 1.2;

/**
 * The fastest a collapsing tube can blow its air out of its mouth, m/s. The
 * roof falls on the air at about √(gW/2) (its free fall over the void's
 * height W), so the air's pressure can rise no higher than the roof's dynamic
 * pressure, ½ρ_w·gW/2; air driven by that leaves at √(ρ_w/ρ_a)·√(gW/2). Air
 * the mouth cannot pass that fast bursts up through the lip instead. (G9,
 * provisional: a mechanism, not a measurement.)
 */
export function spitSpeedLimit(width: number): number {
  return Math.sqrt((WATER_DENSITY / AIR_DENSITY) * GRAVITY * width / 2);
}

/** A closing void's bubbles are spread over this many points along it (numerical). */
const BUBBLE_POINTS = 4;
/** A breaking roller's cross-section per H² (G9, κ_r; Svendsen 1984): the foam ball tumbling in a collapsing tube. */
export const ROLLER_AREA = 0.9;

/** Air a closing peel squeezes out of its open end this step (G9): where the mouth is, which way it blows, how fast, m/s, and how much air, m³/s. */
export interface TubeSpit {
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  airRate: number;
}

/**
 * The foam ball in a collapsing tube this step (G9): the roller of churned
 * water where the void was, κ_r·H² in section (H the jet's fall) over its
 * column's width, riding with its crest. `id` is its throw's, the same each
 * step, so the sprites drawing it can follow it.
 */
export interface TubeRoller {
  id: number;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  area: number;
  width: number;
}

/** Air bursting up through a section that closes with no open end this step (G9): where, how fast (as fast as its voids' roofs fall, √(gW/2)), m/s, and how much air, m³/s. */
export interface TubeEruption {
  x: number;
  y: number;
  z: number;
  airRate: number;
  speed: number;
}
/**
 * Largest share of its water above the wave's trough a source cell may give one throw (the P7 bound), so the
 * crest is never cut flat. The throw's ask sets the jet; this only caps it. Round 6's Basilisk jet at Padang's
 * peak is about a fifth of the water above still level within 1.5 m of its crest (the water-physics advisor,
 * 2026-09-29).
 */
const SOURCE_SHARE = 0.2;
/**
 * How far from its crest a jet's water may come, in wave heights: its share tapers from the crest to none at
 * ±2H. Basilisk's jet water sits within about ±0.5 H of its crest; the solver's crest is about twice as broad,
 * and ±2H leaves margin (the water-physics advisor, 2026-09-29).
 */
const SOURCE_REACH = 2;
/** Parcels still airborne after this long land where they are, s. */
const MAX_FLIGHT = 3;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** A column's water above a level `levelDepth` m above its bed, m: all of it when the level is below the bed. */
function aboveLevel(depth: number, levelDepth: number): number {
  return Math.max(0, depth - Math.max(0, levelDepth));
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
  /** 0 a jet's water, 1 a splash-up's (G9). */
  kind: number;
}

/**
 * A landed parcel's flight: where it left the crest, the height it came down
 * at (m), how long it flew (s), the speed of the crest it left (m/s),
 * whether it was a jet's water (0) or a splash-up's (1, G9), which draws no
 * tube, the parcel's whole water, m³ (what landed and what its splash-up took),
 * and the height of the breaking wave that threw its jet, m (0 for a splash-up,
 * or when the thrower did not say).
 */
export interface LipFlight {
  launch: { x: number; y: number; z: number };
  y: number;
  age: number;
  crestSpeed: number;
  kind: number;
  volume: number;
  waveHeight: number;
  /** A swept barrel's jet, poured from its crash curve (the Padang Padang spec, Part B, PR 5): it lands where its spray rises. */
  swept: boolean;
}

/**
 * A swept barrel's jet (the Padang Padang spec, Part B, PR 5): taken from the crest at its throw, held through the open
 * tube, and poured from the crash curve once the lip touches down.
 */
export interface SweptJet {
  /** The crest cell its water leaves, its horizontal velocity (m/s), the water asked (m³) and the breaking wave's height (m). */
  cell: number;
  velocityX: number;
  velocityZ: number;
  volume: number;
  waveHeight: number;
  /** Where it left the crest, m: its landings' drop, and the plunge zone's back, are measured from there. */
  launchX: number;
  launchY: number;
  launchZ: number;
  /** The pour as foreseen at the throw: from where (m), starting how long from now and how far apart (s), falling how fast (m/s). */
  pourX: number;
  pourY: number;
  pourZ: number;
  pourIn: number;
  pourSpacing: number;
  pourVY: number;
  /** Its void: its length along its axis (m) and that axis (unit, forward and down), its height W (m), its cross-section (m²) and the crest it spans (m). */
  voidLength: number;
  axisX: number;
  axisY: number;
  voidHeight: number;
  voidArea: number;
  span: number;
  /** The drawn crest: which way it travels (unit), how fast (m/s), and how much faster the lip's tip runs (m/s). */
  dirX: number;
  dirZ: number;
  crestSpeed: number;
  relativeSpeed: number;
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
  /** A break over a submerged crest (a reef break): the gradient it climbs along its travel, rise over run. */
  reef?: { orthogonalGradient: number };
}

export interface LipThrow {
  /** Water thrown, m³: the jet's area times the crest length. */
  volume: number;
  /** Level launch speed ahead of the crest that flies the jet over the void, m/s. */
  relativeSpeed: number;
  /** The overturn, wind included. */
  shape: OverturnShape;
  /** A reef break's vortex ratio (Mead & Black 2001), within the range they measured. */
  reef?: { vortexRatio: number };
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
  // A reef break follows Mead & Black by the gradient it climbs (the Teahupo'o Reef, Part B). Their tubes were
  // photographed in offshore wind, so the wind reshapes the void as it does a plane slope's (Feddersen et al.
  // 2023) only from theirs, and a stronger offshore wind rounds it no further.
  if (conditions.reef && breakerHeight > 0) {
    const reef = reefOverturn(conditions.reef.orthogonalGradient, nonlinearity);
    if (reef) {
      const wind = Math.max(windOverCelerity, REEF_OVERTURN.windOverCelerity) - REEF_OVERTURN.windOverCelerity;
      const shape: OverturnShape = { ...reef, aspect: clamp(reef.aspect - 0.18 * wind, 0.2, 1) };
      return {
        volume: shape.jetArea * breakerHeight * breakerHeight * width,
        relativeSpeed: jetRelativeSpeed(shape, breakerHeight),
        shape,
        reef: { vortexRatio: 1 / reef.aspect },
      };
    }
  }
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

/** One throw's parcels (a strip): a jet's, or the splash-up it throws when it lands (G9). */
interface LipStrip {
  column: number;
  launchTime: number;
  parcels: number[];
  live: number;
  kind: 0 | 1;
  /** The breaking wave's height that threw it, m (0 for a splash-up's strip). */
  waveHeight: number;
  tube?: FlyingTube;
  /** A jet's splash-up strip, once it has one. */
  splash?: number;
  /** A swept barrel's held jet (PR 5): released from where it stands, carving nothing. */
  swept?: boolean;
}

/** A void under a flying jet, riding with the crest that threw it. */
/** A lip parcel's per-slot fields, as the sea handover carries them (spec N1). */
const PARCEL_FIELDS = [
  'x', 'y', 'z', 'volume', 'vx', 'vy', 'vz', 'px', 'py', 'pz', 'id', 'age', 'active', 'lx', 'ly', 'lz', 'crestSpeed', 'state',
  'releaseAt', 'strip', 'column', 'index', 'launchTime', 'kind',
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
  strips: [number, LipStripState][];
  byColumn: [number, number[]][];
}

/**
 * A strip as plain data (G9 adds its kind, its splash-up strip and its tube's
 * collapse). A tube still flying has `closedAt` null, not NaN, which JSON
 * cannot carry.
 */
interface LipStripState {
  column: number;
  launchTime: number;
  parcels: number[];
  live: number;
  kind?: 0 | 1;
  waveHeight?: number;
  splash?: number;
  swept?: boolean;
  tube?: Omit<FlyingTube, 'closedAt'> & { closedAt: number | null };
}

interface FlyingTube {
  /** Its strip's id. */
  id: number;
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
  /** When its jet had all landed and the void began to close, s; NaN while it flies or pours. */
  closedAt: number;
  /** The air it trapped as it closed, m³, and the share of it squeezed out so far. */
  air: number;
  released: number;
  /** How far its jet's tip fell, m: its air is driven down in proportion. */
  drop: number;
  /**
   * A swept barrel's void (PR 5): its own cross-section, m², over the crest it spans, m (its air is their product, in
   * place of LH82's over a column's width), and its long axis, forward and down (in place of the tilt's cosine and sine).
   */
  area?: number;
  span?: number;
  axisX?: number;
  axisY?: number;
}

/** The share of a tube's collapse done by `time`: 0 while it flies, 1 once its void is gone. */
function collapsed(tube: FlyingTube, time: number): number {
  if (Number.isNaN(tube.closedAt)) return 0;
  const collapseTime = Math.sqrt((2 * tube.geometry.width) / GRAVITY);
  return collapseTime > 0 ? Math.min(1, (time - tube.closedAt) / collapseTime) : 1;
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
  /** Throws their crest could not fill, and the water they fell short by, m³. */
  starvedThrows = 0;
  starvedVolume = 0;
  /** Throws whose crest carried less momentum along the jet than the jet takes, and what it could not give, m⁴/s. */
  momentumClamps = 0;
  unplacedMomentum = 0;
  /** Air its tubes have trapped as they closed, m³ (G9; a running total for the air's balance). */
  trappedAir = 0;
  /**
   * Told of every landing: where the parcel fell, how much water it returned
   * (m³), how fast it hit (m/s), and its flight: where it left the crest and
   * the height it landed at (the tube it drew, `measureTube`).
   */
  onLand?: (x: number, z: number, volume: number, vx: number, vy: number, vz: number, flight?: LipFlight) => void;
  /** Told of a closing tube's air breaking into bubbles (G9): where, how much, m³, and how deep it is driven, m. */
  onAir?: (x: number, z: number, volume: number, penetration: number) => void;
  /** This step's spits, eruptions and foam balls from closing tubes (G9). */
  readonly spits: TubeSpit[] = [];
  readonly eruptions: TubeEruption[] = [];
  readonly rollers: TubeRoller[] = [];
  /** Scratch for `tubeChains`: the strips already in a chain. */
  private readonly chained = new Set<LipStrip>();
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
  private readonly strips = new Map<number, LipStrip>();
  /** Each parcel's kind: 0 a jet's water, 1 a splash-up's (G9). */
  private readonly kind: Uint8Array;
  private readonly byColumn = new Map<number, number[]>();
  private nextStrip = 1;
  /** The lip's clock, s. */
  time = 0;
  private readonly view = { slot: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, column: 0, index: 0, launchTime: 0, age: 0, volume: 0, kind: 0 };
  /** Marks parcels a query found linked, by query number. */
  private readonly linked: Uint32Array;
  private query = 0;
  private readonly near = { a: new Vector3(), b: new Vector3(), pa: new Vector3(), pb: new Vector3(), velocity: new Vector3() };
  private readonly flight: LipFlight = { launch: { x: 0, y: 0, z: 0 }, y: 0, age: 0, crestSpeed: 0, kind: 0, volume: 0, waveHeight: 0, swept: false };
  private readonly free: number[] = [];
  /** The flying tubes as a `tubeTable` (G9), refreshed as the clock moves and strips come and go. */
  private tubes = new Float64Array(64 * TUBE_STRIDE);
  private tubeRows = 0;

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
    this.kind = new Uint8Array(capacity);
    this.linked = new Uint32Array(capacity);
    for (let index = capacity - 1; index >= 0; index -= 1) this.free.push(index);
  }

  /** Every per-parcel array, by name, for the sea handover (spec N1). */
  private parcelArrays(): Record<(typeof PARCEL_FIELDS)[number], Float64Array | Int32Array | Uint8Array> {
    return {
      x: this.x, y: this.y, z: this.z, volume: this.volume, vx: this.vx, vy: this.vy, vz: this.vz, px: this.px, py: this.py, pz: this.pz,
      id: this.id, age: this.age, active: this.active, lx: this.lx, ly: this.ly, lz: this.lz, crestSpeed: this.crestSpeed, state: this.state,
      releaseAt: this.releaseAt, strip: this.strip, column: this.column, index: this.index, launchTime: this.launchTime,
      kind: this.kind,
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
      strips: [...this.strips].map(([id, strip]): [number, LipStripState] => [id, {
        column: strip.column, launchTime: strip.launchTime, parcels: [...strip.parcels], live: strip.live, kind: strip.kind,
        waveHeight: strip.waveHeight,
        ...(strip.splash === undefined ? {} : { splash: strip.splash }),
        ...(strip.swept ? { swept: true } : {}),
        ...(strip.tube ? {
          tube: { ...strip.tube, geometry: { ...strip.tube.geometry }, closedAt: Number.isNaN(strip.tube.closedAt) ? null : strip.tube.closedAt },
        } : {}),
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
      const { tube } = strip;
      this.strips.set(id, {
        column: strip.column, launchTime: strip.launchTime, parcels: [...strip.parcels], live: strip.live, kind: strip.kind ?? 0,
        waveHeight: strip.waveHeight ?? 0,
        ...(strip.splash === undefined ? {} : { splash: strip.splash }),
        ...(strip.swept ? { swept: true } : {}),
        ...(tube ? {
          tube: {
            ...tube, geometry: { ...tube.geometry }, id: tube.id ?? id,
            closedAt: typeof tube.closedAt === 'number' ? tube.closedAt : Number.NaN,
            air: tube.air ?? 0, released: tube.released ?? 0, drop: tube.drop ?? 0,
          },
        } : {}),
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
   * Take up to `volume` m³ of jet from the crest at `cell` of a breaking wave `waveHeight` m high (the
   * water-physics advisor, 2026-09-29), and return what was taken. The jet is the top of the wave: it comes
   * from the wave's upper half, the cells across shore through the crest standing at least H/2 above its
   * trough (crest − H, where the wave's height is measured to), within SOURCE_REACH wave heights of the crest.
   * Each gives its water above the trough, tapered as 1 − (d / 2H)² with its distance d from the crest, times
   * one share, at most SOURCE_SHARE: most from the crest's top, and none at the window's ends. The trough, not
   * still level: at the Reef's step the trough drains metres below still level ahead of crests standing at
   * or below it. Told no wave height, it measures the wave from still level.
   *
   * The jet's momentum (volume × jet velocity) comes from the wave's forward-moving upper half, nearest the
   * crest first: out from the crest a cell each way at a time until their flow along the jet covers it, and
   * never past the upper half. Each cell reached gives in proportion to its own flow along the jet and is
   * never reversed; what the upper half cannot give is counted. The jet's extra speed comes from the crest's
   * pressure, acting over the moving crest, not only the cells its water leaves; at the Reef's step the
   * depth-mean flow under the crest runs seaward as the trough drains back beneath it.
   */
  private drawFromCrest(cell: number, velocity: { x: number; z: number }, volume: number, waveHeight: number): number {
    const { nx, nz, h, qx, qz, dx, dz, bed, restLevel, zCenters } = this.solver;
    const surface = (index: number) => h[index] + bed[index];
    const height = waveHeight > 0 ? waveHeight : surface(cell) - restLevel;
    if (!(height > 0) || !(h[cell] > 0)) return 0;
    const trough = surface(cell) - height;
    const reach = SOURCE_REACH * height;
    const column = cell % nx;
    const row = Math.floor(cell / nx);
    const area = (index: number) => dx * dz[Math.floor(index / nx)];
    // The wave's upper half through the crest, in rings a cell further out each way.
    const inUpperHalf = (iz: number) => iz >= 0 && iz < nz && h[iz * nx + column] > 0 && surface(iz * nx + column) - trough >= 0.5 * height;
    const rings: number[][] = [[cell]];
    for (let k = 1, back = true, ahead = true; back || ahead; k += 1) {
      back &&= inUpperHalf(row - k);
      ahead &&= inUpperHalf(row + k);
      const ring = [...(back ? [(row - k) * nx + column] : []), ...(ahead ? [(row + k) * nx + column] : [])];
      if (ring.length > 0) rings.push(ring);
    }
    // Its water: within SOURCE_REACH wave heights of the crest, tapered to none there.
    const window: number[] = [];
    const weights: number[] = [];
    let water = 0;
    for (const index of rings.flat()) {
      const distance = Math.abs(zCenters[Math.floor(index / nx)] - zCenters[row]);
      if (distance >= reach) continue;
      const weight = aboveLevel(h[index], trough - bed[index]) * (1 - (distance / reach) ** 2);
      window.push(index);
      weights.push(weight);
      water += weight * area(index);
    }
    if (!(water > 0)) return 0;
    const share = Math.min(SOURCE_SHARE, volume / water);
    const thrown = share * water;
    if (thrown < volume) {
      this.starvedThrows += 1;
      this.starvedVolume += volume - thrown;
    }
    // Its momentum: from the rings out to where their flow along the jet covers it, nearest first.
    for (const [q, speed] of [[qx, velocity.x], [qz, velocity.z]] as const) {
      const wanted = Math.abs(thrown * speed);
      if (!(wanted > 0)) continue;
      const sign = Math.sign(speed);
      let carried = 0;
      let reached = 0;
      for (; reached < rings.length && carried < wanted; reached += 1) {
        for (const index of rings[reached]) carried += Math.max(0, sign * q[index]) * area(index);
      }
      const taken = Math.min(wanted, carried);
      if (taken < wanted) {
        this.momentumClamps += 1;
        this.unplacedMomentum += wanted - taken;
      }
      if (!(carried > 0)) continue;
      for (const index of rings.slice(0, reached).flat()) q[index] -= (sign * taken * Math.max(0, sign * q[index])) / carried;
    }
    window.forEach((index, n) => {
      h[index] -= share * weights[n];
    });
    return thrown;
  }

  /**
   * Throw up to `volume` m³ from `cell` at `height` (m above datum) with
   * horizontal `velocity` (m/s), from a breaking wave `waveHeight` m high (its
   * landings say so). Returns the volume actually thrown (`drawFromCrest`): 0
   * when the parcel pool is full or the crest holds no water above its trough.
   */
  launch(
    cell: number, velocity: { x: number; z: number }, height: number, volume: number, crestSpeed = 0, tube?: TubeGeometry,
    releaseTime = JET_RELEASE_TIME, waveHeight = 0,
  ): number {
    if (this.free.length < STRIP_PARCELS || !(volume > 0)) return 0;
    const thrown = this.drawFromCrest(cell, velocity, volume, waveHeight);
    if (!(thrown > 0)) return 0;
    const { solver } = this;
    const { nx, dx } = solver;
    const row = Math.floor(cell / nx);
    const x = solver.xCenters[cell - row * nx];
    const z = solver.zCenters[row];
    const stripId = this.nextStrip;
    this.nextStrip += 1;
    const column = Math.round(x / dx - 0.5);
    const strip: LipStrip = { column, launchTime: this.time, parcels: [], live: STRIP_PARCELS, kind: 0, waveHeight };
    const spacing = releaseTime / (STRIP_PARCELS - 1);
    // The crest moves on at its own speed, the way the jet leaves.
    const jetSpeed = Math.hypot(velocity.x, velocity.z);
    const crestX = jetSpeed > 0 ? (velocity.x / jetSpeed) * crestSpeed : 0;
    const crestZ = jetSpeed > 0 ? (velocity.z / jetSpeed) * crestSpeed : 0;
    if (tube && jetSpeed > 0) {
      strip.tube = {
        id: stripId, geometry: tube, x, z, y: height, dirX: velocity.x / jetSpeed, dirZ: velocity.z / jetSpeed, crestSpeed, relativeSpeed: jetSpeed - crestSpeed,
        closedAt: Number.NaN, air: 0, released: 0, drop: 0,
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
      this.kind[parcel] = 0;
    }
    this.strips.set(stripId, strip);
    const inColumn = this.byColumn.get(column);
    if (inColumn) inColumn.push(stripId);
    else this.byColumn.set(column, [stripId]);
    this.refreshTubes();
    return thrown;
  }

  /**
   * A swept barrel's jet (the Padang Padang spec, Part B, PR 5; the advisor's rulings, 2026-10-01): its water leaves the
   * crest at the barrel's throw, by `drawFromCrest`'s rule (its momentum along the jet nearest first, never reversed, the
   * rest counted), and waits as a strip of parcels until it pours from the crash curve: from where `pourIn` s from now,
   * a parcel every `pourSpacing`, as foreseen at the throw (`crashJet` re-times it at the crash; `movePour` follows the
   * drawn lip). The drawn barrel is the tube, so its void carves nothing. Returns the strip and the water thrown; strip
   * −1 when none was (the pool can't hold a strip, or the crest has nothing above its trough).
   */
  holdJet(jet: SweptJet): { strip: number; thrown: number } {
    if (this.free.length < STRIP_PARCELS || !(jet.volume > 0)) return { strip: -1, thrown: 0 };
    const thrown = this.drawFromCrest(jet.cell, { x: jet.velocityX, z: jet.velocityZ }, jet.volume, jet.waveHeight);
    if (!(thrown > 0)) return { strip: -1, thrown: 0 };
    const stripId = this.nextStrip;
    this.nextStrip += 1;
    const column = Math.round(jet.launchX / this.solver.dx - 0.5);
    const strip: LipStrip = {
      column, launchTime: this.time, parcels: [], live: STRIP_PARCELS, kind: 0, waveHeight: jet.waveHeight, swept: true,
      tube: {
        id: stripId, geometry: { length: jet.voidLength, width: jet.voidHeight, tilt: 0 }, x: jet.launchX, z: jet.launchZ, y: jet.launchY,
        dirX: jet.dirX, dirZ: jet.dirZ, crestSpeed: jet.crestSpeed, relativeSpeed: jet.relativeSpeed, closedAt: Number.NaN, air: 0, released: 0,
        drop: 0, area: jet.voidArea, span: jet.span, axisX: jet.axisX, axisY: jet.axisY,
      },
    };
    for (let k = 0; k < STRIP_PARCELS; k += 1) {
      const parcel = this.free.pop()!;
      strip.parcels.push(parcel);
      this.active[parcel] = 1;
      this.state[parcel] = 2;
      this.releaseAt[parcel] = this.time + jet.pourIn + k * jet.pourSpacing;
      this.x[parcel] = this.px[parcel] = jet.pourX;
      this.y[parcel] = this.py[parcel] = jet.pourY;
      this.z[parcel] = this.pz[parcel] = jet.pourZ;
      this.lx[parcel] = jet.launchX;
      this.ly[parcel] = jet.launchY;
      this.lz[parcel] = jet.launchZ;
      this.crestSpeed[parcel] = jet.crestSpeed;
      this.id[parcel] = this.nextId;
      this.nextId += 1;
      this.vx[parcel] = jet.velocityX;
      this.vy[parcel] = jet.pourVY;
      this.vz[parcel] = jet.velocityZ;
      this.volume[parcel] = thrown / STRIP_PARCELS;
      this.age[parcel] = 0;
      this.strip[parcel] = stripId;
      this.column[parcel] = column;
      this.index[parcel] = k;
      this.launchTime[parcel] = this.time;
      this.kind[parcel] = 0;
    }
    this.strips.set(stripId, strip);
    const inColumn = this.byColumn.get(column);
    if (inColumn) inColumn.push(stripId);
    else this.byColumn.set(column, [stripId]);
    return { strip: stripId, thrown };
  }

  /**
   * A held jet's lip touches down (the crash, PR 5): its void closes now, trapping its own air (its cross-section over
   * the crest it spans), and rides on from the drawn crest `crest`; its water still waiting pours from (x, y, z), a
   * parcel every `spacing` s from now, falling at `vy`, m/s. False for a strip that is not a held jet.
   */
  crashJet(stripId: number, pour: { x: number; y: number; z: number; spacing: number; vy: number }, crest: { x: number; y: number; z: number }): boolean {
    const strip = this.strips.get(stripId);
    if (!strip?.swept || !strip.tube) return false;
    const { tube } = strip;
    if (Number.isNaN(tube.closedAt)) {
      tube.closedAt = this.time;
      tube.air = (tube.area ?? 0) * (tube.span ?? this.solver.dx);
      this.trappedAir += tube.air;
    }
    const age = this.time - strip.launchTime;
    tube.x = crest.x - tube.dirX * tube.crestSpeed * age;
    tube.z = crest.z - tube.dirZ * tube.crestSpeed * age;
    tube.y = crest.y;
    let n = 0;
    for (const parcel of strip.parcels) {
      if (parcel < 0 || this.state[parcel] !== 2) continue;
      this.releaseAt[parcel] = this.time + n * pour.spacing;
      this.x[parcel] = this.px[parcel] = pour.x;
      this.y[parcel] = this.py[parcel] = pour.y;
      this.z[parcel] = this.pz[parcel] = pour.z;
      this.vy[parcel] = pour.vy;
      n += 1;
    }
    return true;
  }

  /** A pouring jet's parcels still waiting move to (x, y, z), where its drawn lip now lands (PR 5). */
  movePour(stripId: number, x: number, y: number, z: number): void {
    const strip = this.strips.get(stripId);
    if (!strip?.swept) return;
    for (const parcel of strip.parcels) {
      if (parcel < 0 || this.state[parcel] !== 2) continue;
      this.x[parcel] = this.px[parcel] = x;
      this.y[parcel] = this.py[parcel] = y;
      this.z[parcel] = this.pz[parcel] = z;
    }
  }

  /** Release the parcels whose time has come, fly them under gravity, and land those that fall through the surface. */
  step(dt: number): void {
    if (!(dt > 0)) return;
    const { solver } = this;
    this.time += dt;
    this.refreshTubes();
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      const state = this.state[parcel];
      if (state === 0) continue;
      // A splash-up thrown earlier in this very step already stands where it leaves from.
      if (state === 1 && this.kind[parcel] === 1 && this.age[parcel] === 0 && this.releaseAt[parcel] === this.time) continue;
      let flight = dt;
      if (state === 2) {
        if (this.releaseAt[parcel] > this.time) continue;
        this.state[parcel] = 1;
        flight = this.time - this.releaseAt[parcel];
        // A crest still rising as it throws lets the later jet go from higher up; a swept barrel's pour leaves its lip where it stands.
        if (!this.strips.get(this.strip[parcel])?.swept) {
          const crest = solver.sampleCentered(solver.h, this.x[parcel], this.z[parcel]) + solver.sampleCentered(solver.bed, this.x[parcel], this.z[parcel]);
          if (crest > this.y[parcel]) this.y[parcel] = this.ly[parcel] = crest;
        }
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
    this.releaseAir(dt);
  }

  /**
   * The water surface where the lip's voids leave it, m. Under a flying jet,
   * inside its overturn, the rider and the eye meet the void's floor (the lower
   * half of the overturn curve), not the depth-averaged face that stands where
   * a real face has gone vertical. A void rides with its crest, opens as far as
   * the jet's tip has flown, and once its jet lands shrinks away as its air is
   * squeezed out (G9, `TUBE_AIR`). The solver's water is left as it is.
   */
  carve(x: number, z: number, surface: number): number {
    return carveAt(this.tubes, this.tubeRows, this.solver.dx, x, z, surface);
  }

  /** The flying tubes as a `tubeTable` (G9); `tubeCount` rows are live. */
  get tubeTable(): Float64Array {
    return this.tubes;
  }

  get tubeCount(): number {
    return this.tubeRows;
  }

  /**
   * Copy up to `capacity` flying tubes into `into` as a `tubeTable`; returns how
   * many. Past capacity it keeps the newest (the table runs oldest first): they
   * are at the peel's front, where the rider is.
   */
  writeTubes(into: Float32Array, capacity: number): number {
    const count = Math.min(this.tubeRows, capacity, Math.floor(into.length / TUBE_STRIDE));
    const first = (this.tubeRows - count) * TUBE_STRIDE;
    for (let k = 0; k < count * TUBE_STRIDE; k += 1) into[k] = this.tubes[first + k];
    return count;
  }

  /** Pack every live strip's void where its crest is now, opened as far as its jet's tip has flown and shrunk as far as it has collapsed. */
  private refreshTubes(): void {
    let rows = 0;
    for (const strip of this.strips.values()) {
      const tube = strip.tube;
      // A swept barrel's void is drawn and ridden as the barrel's own surface: it carves nothing.
      if (!tube || strip.swept) continue;
      const scale = 1 - collapsed(tube, this.time);
      if (!(scale > 0)) continue;
      if ((rows + 1) * TUBE_STRIDE > this.tubes.length) {
        const grown = new Float64Array(this.tubes.length * 2);
        grown.set(this.tubes);
        this.tubes = grown;
      }
      const age = this.time - strip.launchTime;
      const o = rows * TUBE_STRIDE;
      const t = this.tubes;
      t[o] = tube.x + tube.dirX * tube.crestSpeed * age;
      t[o + 1] = tube.z + tube.dirZ * tube.crestSpeed * age;
      t[o + 2] = tube.y;
      t[o + 3] = tube.dirX;
      t[o + 4] = tube.dirZ;
      t[o + 5] = tube.relativeSpeed * age;
      t[o + 6] = tube.geometry.length;
      t[o + 7] = tube.geometry.width;
      t[o + 8] = tube.geometry.tilt;
      t[o + 9] = strip.column;
      t[o + 10] = scale;
      // Its length and width both shrink: the void, and the air it still holds, go as scale².
      t[o + 11] = tube.air * scale * scale;
      rows += 1;
    }
    this.tubeRows = rows;
  }

  /** Air the closing tubes still hold, m³: what they trapped and have not yet let go (G9). */
  get heldAir(): number {
    let held = 0;
    for (const strip of this.strips.values()) {
      const { tube } = strip;
      if (tube && !Number.isNaN(tube.closedAt)) held += tube.air * (1 - tube.released);
    }
    return held;
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
      // Splash-ups are whitewater: they never strike a body (G9).
      if (this.state[parcel] !== 1 || this.kind[parcel] === 1) continue;
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
      if (this.kind[a] === 1) return;
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
      if (this.state[parcel] !== 1 || this.linked[parcel] === query || this.kind[parcel] === 1) continue;
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
      view.kind = this.kind[parcel];
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
        if (neighbour.kind !== strip.kind || Math.abs(neighbour.launchTime - strip.launchTime) >= LINK_TIME) continue;
        for (let k = 0; k < parcels.length; k += 1) {
          if (flying(parcels[k]) && flying(neighbour.parcels[k])) visit(parcels[k], neighbour.parcels[k]);
        }
      }
    }
  }

  /**
   * A parcel falls back in. A jet's water hitting hard enough throws a
   * splash-up (G9): SPLASH_UP's share of it, up and on; the rest returns to
   * the cell it lands in at once, with all the parcel's forward momentum but
   * the splash-up's, so the water's momentum is conserved. A splash-up lands
   * whole.
   */
  private land(parcel: number): void {
    const { solver } = this;
    const [x, y, z] = [this.x[parcel], this.y[parcel], this.z[parcel]];
    const [vx, vy, vz] = [this.vx[parcel], this.vy[parcel], this.vz[parcel]];
    const volume = this.volume[parcel];
    const splash = this.kind[parcel] === 0 && -vy > SPLASH_UP.minImpact ? SPLASH_UP.share * volume : 0;
    const stripId = this.strip[parcel];
    const strip = this.strips.get(stripId);
    // A jet comes down as thick as its sheet, its water over the void's length (a thick lip over more than one
    // cell), spread along its travel (Part B). A splash-up, and a sheet no thicker than a cell, land in one.
    const thickness = this.kind[parcel] === 0 && strip?.tube ? (STRIP_PARCELS * volume) / solver.dx / strip.tube.geometry.length : 0;
    const speed = Math.hypot(vx, vz);
    const pieces = speed > 0 ? Math.max(1, Math.ceil(thickness / solver.dx - 1e-9)) : 1;
    for (let k = 0; k < pieces; k += 1) {
      const along = ((k + 0.5) / pieces - 0.5) * thickness;
      const cell = pieces > 1 ? solver.cellIndex(x + (vx / speed) * along, z + (vz / speed) * along) : solver.cellIndex(x, z);
      const area = pieces * solver.dx * solver.dz[Math.floor(cell / solver.nx)];
      solver.h[cell] += (volume - splash) / area;
      solver.qx[cell] += (volume * vx - splash * SPLASH_UP.horizontal * vx) / area;
      solver.qz[cell] += (volume * vz - splash * SPLASH_UP.horizontal * vz) / area;
    }
    const { flight } = this;
    flight.launch.x = this.lx[parcel];
    flight.launch.y = this.ly[parcel];
    flight.launch.z = this.lz[parcel];
    flight.y = y;
    flight.age = this.age[parcel];
    flight.crestSpeed = this.crestSpeed[parcel];
    flight.kind = this.kind[parcel];
    flight.volume = volume;
    flight.waveHeight = strip?.waveHeight ?? 0;
    flight.swept = strip?.swept ?? false;
    this.active[parcel] = 0;
    this.state[parcel] = 0;
    this.free.push(parcel);
    this.landings += 1;
    if (strip) {
      // Its slot is free for other throws now.
      strip.parcels[strip.parcels.indexOf(parcel)] = -1;
      strip.live -= 1;
      const { tube } = strip;
      // Its air is driven down as far as the jet's tip fell.
      if (tube && tube.drop === 0) tube.drop = Math.max(0.1, flight.launch.y - y);
      if (tube && strip.live === 0 && Number.isNaN(tube.closedAt)) {
        // The jet has all come down: its void closes, trapping its air (its cross-section over its column's width).
        // While it still pours, the curtain holds the void whole and the pour lands where the tube is, not on the crest.
        tube.closedAt = this.time;
        tube.air = (tube.area ?? LH82_AREA * tube.geometry.length * tube.geometry.width) * (tube.span ?? solver.dx);
        this.trappedAir += tube.air;
      }
      // A strip stays while its water flies or its void is still collapsing.
      if (strip.live === 0 && (!tube || collapsed(tube, this.time) >= 1)) this.removeStrip(stripId, strip);
    }
    // Each drop is told of once: the splash-up's share when it comes down itself, unless it could not fly.
    const flies = splash > 0 && this.throwSplash(strip, x, y, z, splash, vx, vy, vz);
    this.onLand?.(x, z, flies ? volume - splash : volume, vx, vy, vz, flight);
  }

  private removeStrip(stripId: number, strip: LipStrip): void {
    this.strips.delete(stripId);
    const inColumn = this.byColumn.get(strip.column)!;
    inColumn.splice(inColumn.indexOf(stripId), 1);
    if (inColumn.length === 0) this.byColumn.delete(strip.column);
  }

  /**
   * Squeeze out this step's share of every closing tube's air (G9, `TUBE_AIR`).
   * `escape` of it leaves as spray. Where the closing tube's peel (its chain of
   * tubes in neighbouring columns thrown within LINK_TIME) still has an open
   * end, it blows out of the nearer one, along the tube, as fast as that much
   * air must go through the mouth's void cross-section; where the peel has
   * closed all along, it bursts up through the lip. The rest breaks into
   * bubbles where the void was, driven down as far as the jet fell. Each
   * closing tube rolls a foam ball where its void was.
   */
  private releaseAir(dt: number): void {
    this.spits.length = 0;
    this.eruptions.length = 0;
    this.rollers.length = 0;
    let closing = false;
    for (const [stripId, strip] of this.strips) {
      const { tube } = strip;
      if (!tube || Number.isNaN(tube.closedAt)) continue;
      if (tube.released < 1) closing = true;
      else if (strip.live === 0) this.removeStrip(stripId, strip);
    }
    if (!closing) return;
    for (const chain of this.tubeChains()) {
      let lowest = Infinity;
      let highest = -Infinity;
      for (const strip of chain) {
        lowest = Math.min(lowest, strip.column);
        highest = Math.max(highest, strip.column);
      }
      const mouths = chain.filter((strip) => Number.isNaN(strip.tube!.closedAt) && (strip.column === lowest || strip.column === highest));
      const fed = mouths.map(() => ({ rate: 0, x: 0, z: 0 }));
      const burst = { rate: 0, x: 0, y: 0, z: 0, speed: 0 };
      for (const strip of chain) {
        const tube = strip.tube!;
        if (Number.isNaN(tube.closedAt) || tube.released >= 1) continue;
        const done = collapsed(tube, this.time);
        // The air leaves as the void loses volume (scale², the scale falling linearly): fastest as it starts to close.
        const gone = 1 - (1 - done) * (1 - done);
        const volume = tube.air * (gone - tube.released);
        tube.released = gone;
        if (!(volume > 0)) continue;
        const centre = this.voidCentre(strip, 1 - done);
        this.rollers.push({
          id: tube.id, x: centre.x, y: centre.y, z: centre.z, dirX: tube.dirX, dirZ: tube.dirZ, speed: tube.crestSpeed,
          area: ROLLER_AREA * tube.drop * tube.drop, width: tube.span ?? this.solver.dx,
        });
        const escaping = TUBE_AIR.escape * volume;
        this.breakIntoBubbles(strip, 1 - done, volume - escaping);
        const rate = escaping / dt;
        if (mouths.length > 0) {
          let nearest = 0;
          for (let m = 1; m < mouths.length; m += 1) {
            if (Math.abs(mouths[m].column - strip.column) < Math.abs(mouths[nearest].column - strip.column)) nearest = m;
          }
          fed[nearest].rate += rate;
          fed[nearest].x += rate * centre.x;
          fed[nearest].z += rate * centre.z;
        } else {
          burst.rate += rate;
          burst.x += rate * centre.x;
          burst.y += rate * tube.y;
          burst.z += rate * centre.z;
          burst.speed += rate * Math.sqrt((GRAVITY * tube.geometry.width) / 2);
        }
      }
      mouths.forEach((mouth, m) => {
        const { rate } = fed[m];
        if (!(rate > 0)) return;
        const tube = mouth.tube!;
        const centre = this.voidCentre(mouth, 1);
        // Along the tube (across its travel), out of the peel: from the closing voids toward the mouth.
        const alongX = -tube.dirZ;
        const alongZ = tube.dirX;
        const outward = (centre.x - fed[m].x / rate) * alongX + (centre.z - fed[m].z / rate) * alongZ >= 0 ? 1 : -1;
        // The mouth passes air no faster than the falling lip can drive it; the rest bursts up through the lip.
        const area = tube.area ?? LH82_AREA * tube.geometry.length * tube.geometry.width;
        const spat = Math.min(rate, spitSpeedLimit(tube.geometry.width) * area);
        this.spits.push({
          x: centre.x, y: centre.y, z: centre.z, dirX: outward * alongX, dirZ: outward * alongZ, speed: spat / area, airRate: spat,
        });
        const excess = rate - spat;
        if (excess > 0) {
          burst.rate += excess;
          burst.x += (excess * fed[m].x) / rate;
          burst.y += excess * tube.y;
          burst.z += (excess * fed[m].z) / rate;
          burst.speed += excess * Math.sqrt((GRAVITY * tube.geometry.width) / 2);
        }
      });
      if (burst.rate > 0) {
        this.eruptions.push({
          x: burst.x / burst.rate, y: burst.y / burst.rate, z: burst.z / burst.rate, airRate: burst.rate, speed: burst.speed / burst.rate,
        });
      }
    }
  }

  /**
   * A closing void's air that does not escape breaks into bubbles all along
   * it, crest to jet tip (as it now stands, shrunk to `scale`), driven down as
   * far as the jet fell.
   */
  private breakIntoBubbles(strip: LipStrip, scale: number, volume: number): void {
    if (!this.onAir) return;
    const tube = strip.tube!;
    const reach = tube.geometry.length * Math.max(scale, 0) * (tube.axisX ?? Math.cos(tube.geometry.tilt));
    const age = this.time - strip.launchTime;
    const crestX = tube.x + tube.dirX * tube.crestSpeed * age;
    const crestZ = tube.z + tube.dirZ * tube.crestSpeed * age;
    for (let k = 0; k < BUBBLE_POINTS; k += 1) {
      const ahead = ((k + 0.5) / BUBBLE_POINTS) * reach;
      this.onAir(crestX + tube.dirX * ahead, crestZ + tube.dirZ * ahead, volume / BUBBLE_POINTS, AERATION.plungeDepth * tube.drop);
    }
  }

  /** The middle of a strip's void now, shrunk to `scale`: ahead of its crest and down, halfway along its long axis. */
  private voidCentre(strip: LipStrip, scale: number): { x: number; y: number; z: number } {
    const tube = strip.tube!;
    const { length, width, tilt } = tube.geometry;
    const age = this.time - strip.launchTime;
    // A swept void's own axis, forward and down; else the overturn's tilt.
    const ahead = 0.5 * length * scale * (tube.axisX ?? Math.cos(tilt));
    return {
      x: tube.x + tube.dirX * (tube.crestSpeed * age + ahead),
      y: tube.y - 0.5 * width * scale - 0.5 * length * scale * (tube.axisY === undefined ? Math.sin(tilt) : -tube.axisY),
      z: tube.z + tube.dirZ * (tube.crestSpeed * age + ahead),
    };
  }

  /** The tubed strips, grouped into peels: tubes of neighbouring columns thrown within LINK_TIME of each other. */
  private tubeChains(): LipStrip[][] {
    const seen = this.chained;
    seen.clear();
    const chains: LipStrip[][] = [];
    for (const strip of this.strips.values()) {
      if (!strip.tube || seen.has(strip)) continue;
      const chain = [strip];
      seen.add(strip);
      for (let k = 0; k < chain.length; k += 1) {
        const at = chain[k];
        for (const column of [at.column - 1, at.column + 1]) {
          for (const id of this.byColumn.get(column) ?? []) {
            const other = this.strips.get(id)!;
            if (!other.tube || seen.has(other) || Math.abs(other.launchTime - at.launchTime) >= LINK_TIME) continue;
            seen.add(other);
            chain.push(other);
          }
        }
      }
      chains.push(chain);
    }
    return chains;
  }

  /** One splash-up parcel, gathered with the rest of its jet's into one strip, so they draw as one sheet. */
  private throwSplash(jet: LipStrip | undefined, x: number, y: number, z: number, volume: number, vx: number, vy: number, vz: number): boolean {
    const parcel = jet ? this.free.pop() : undefined;
    if (!jet || parcel === undefined) {
      // No room in the pool (or no jet to gather it with): the water lands after all.
      const cell = this.solver.cellIndex(x, z);
      const area = this.solver.dx * this.solver.dz[Math.floor(cell / this.solver.nx)];
      this.solver.h[cell] += volume / area;
      this.solver.qx[cell] += (volume * SPLASH_UP.horizontal * vx) / area;
      this.solver.qz[cell] += (volume * SPLASH_UP.horizontal * vz) / area;
      return false;
    }
    let splashId = jet.splash;
    let splash = splashId === undefined ? undefined : this.strips.get(splashId);
    if (!splash) {
      splashId = this.nextStrip;
      this.nextStrip += 1;
      splash = { column: jet.column, launchTime: this.time, parcels: [], live: 0, kind: 1, waveHeight: 0 };
      this.strips.set(splashId, splash);
      const inColumn = this.byColumn.get(jet.column);
      if (inColumn) inColumn.push(splashId);
      else this.byColumn.set(jet.column, [splashId]);
      jet.splash = splashId;
    }
    splash.parcels.push(parcel);
    splash.live += 1;
    // Airborne at once; the step that threw it does not fly it again (see `step`).
    this.active[parcel] = 1;
    this.state[parcel] = 1;
    this.releaseAt[parcel] = this.time;
    this.x[parcel] = this.px[parcel] = this.lx[parcel] = x;
    this.y[parcel] = this.py[parcel] = this.ly[parcel] = y;
    this.z[parcel] = this.pz[parcel] = this.lz[parcel] = z;
    this.crestSpeed[parcel] = 0;
    this.id[parcel] = this.nextId;
    this.nextId += 1;
    this.vx[parcel] = SPLASH_UP.horizontal * vx;
    this.vy[parcel] = SPLASH_UP.vertical * Math.abs(vy);
    this.vz[parcel] = SPLASH_UP.horizontal * vz;
    this.volume[parcel] = volume;
    this.age[parcel] = 0;
    this.strip[parcel] = splashId!;
    this.column[parcel] = splash.column;
    this.index[parcel] = splash.parcels.length - 1;
    this.launchTime[parcel] = splash.launchTime;
    this.kind[parcel] = 1;
    return true;
  }
}
