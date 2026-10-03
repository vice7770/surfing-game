import { GRAVITY } from './dispersion';
import { seededRandom } from './random';
import { SPLASH_UP, type TubeEruption, type TubeRoller, type TubeSpit } from './PlungingLip';
import { LANDMARK } from './barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, type LoftResult } from './barrel/sweptLoft';

/**
 * A lip parcel falling back into the water: where, how much stays (its
 * splash-up's share flies on, G9), and how fast; the parcel's whole water, and
 * whether it was a jet's (0) or a splash-up's (1).
 */
export interface LipImpact {
  x: number;
  z: number;
  volume: number;
  vx: number;
  vy: number;
  vz: number;
  whole?: number;
  kind?: number;
  /**
   * A swept barrel's landing (the Padang Padang spec, Part B, PR 5): the height it came down at, m, where its spray rises,
   * since the solver's water there is the hump under the drawn tube. Every other landing's spray rises from the water.
   */
  y?: number;
}

/** Which water look the spray is for: Classic keeps its spray as it was before G9, Rich follows the splash-up. */
export type SprayLook = 'classic' | 'rich';

/**
 * A paddling hand's pull during one step (G7): where it was, the impulse the
 * water gave it (N·s; the water took the opposite), and its speed through the water.
 */
export interface StrokeSplash {
  x: number;
  y: number;
  z: number;
  jx: number;
  jy: number;
  jz: number;
  speed: number;
}

/** What the spray needs from a surf zone: its grid and water, bore foam, the latest lip impacts and paddle strokes, and the wind. */
export interface SprayScene {
  readonly solver: {
    readonly nx: number;
    readonly nz: number;
    readonly xCenters: ArrayLike<number>;
    readonly zCenters: ArrayLike<number>;
    readonly dx: number;
    readonly dz: ArrayLike<number>;
    readonly h: ArrayLike<number>;
    readonly qx: ArrayLike<number>;
    readonly qz: ArrayLike<number>;
    readonly bed: ArrayLike<number>;
    readonly restLevel: number;
    cellIndex(x: number, z: number): number;
  };
  readonly foam: { readonly source: ArrayLike<number> };
  readonly lipImpacts: readonly LipImpact[];
  /** Local wind at crest height, m/s: positive onshore (+z). */
  readonly windSpeed: number;
  /** The rider's hands pulling through the water this step. */
  readonly strokes?: readonly StrokeSplash[];
  /** This step's spits, eruptions and foam balls from closing tubes (G9). */
  readonly spits?: readonly TubeSpit[];
  readonly eruptions?: readonly TubeEruption[];
  readonly rollers?: readonly TubeRoller[];
  /** A swept barrel's drawn crest, where it is drawn (Padang Padang, Part B): the offshore veil comes off it (`writeLipCrests`). */
  readonly lipCrests?: LipCrests;
}

/** Floats per stretch of drawn crest in `LipCrests`: its ends' x, y and z. */
export const LIP_CREST_STRIDE = 6;

/** A swept barrel's drawn crest, as `count` straight stretches of `LIP_CREST_STRIDE` floats in `data`. */
export interface LipCrests {
  data: Float32Array;
  count: number;
}

export function createLipCrests(capacity = 1024): LipCrests {
  return { data: new Float32Array(capacity * LIP_CREST_STRIDE), count: 0 };
}

/**
 * The drawn crest of a swept barrel's open slices (phase open, weight at least a half: the curl the page draws), into
 * `out`: for each, the stretch of crest it stands for, from halfway to the slice before it to halfway to the one after
 * (where they are joined to it on its front), through the apexes of the crests the page draws. As many as fit.
 */
export function writeLipCrests(
  loft: Pick<LoftResult, 'positions' | 'sliceCount' | 'slicePhase' | 'sliceWeight' | 'sliceFront' | 'sliceJoined'>, out: LipCrests,
): LipCrests {
  const capacity = Math.floor(out.data.length / LIP_CREST_STRIDE);
  const apex = (s: number) => 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
  let count = 0;
  for (let s = 0; s < loft.sliceCount && count < capacity; s += 1) {
    if (loft.slicePhase[s] !== 1 || !(loft.sliceWeight[s] >= 0.5)) continue;
    const here = apex(s);
    const before = s > 0 && loft.sliceJoined[s - 1] === 1 && loft.sliceFront[s - 1] === loft.sliceFront[s] ? apex(s - 1) : here;
    const after = s + 1 < loft.sliceCount && loft.sliceJoined[s] === 1 && loft.sliceFront[s + 1] === loft.sliceFront[s] ? apex(s + 1) : here;
    const o = count * LIP_CREST_STRIDE;
    for (let axis = 0; axis < 3; axis += 1) {
      out.data[o + axis] = (loft.positions[before + axis] + loft.positions[here + axis]) / 2;
      out.data[o + 3 + axis] = (loft.positions[here + axis] + loft.positions[after + axis]) / 2;
    }
    count += 1;
  }
  out.count = count;
  return out;
}

/**
 * Terminal fall speeds, m/s: millimetre spray drops fall at 3–7 m/s (Gunn &
 * Kinzer 1949); spume and mist, tenths of a millimetre, at 0.3–0.6 m/s and so
 * ride the wind. The drag is quadratic in the speed relative to the air.
 */
const SPRAY_FALL = { min: 3, max: 7 };
const MIST_FALL = { min: 0.3, max: 0.6 };
const SPRAY_LIFE = 3;
const MIST_LIFE = 4;
/**
 * Rendering densities (drawn particles, each a cluster of drops): per joule of
 * lip impact energy, per unit of bore foam made on a square metre, and per
 * square metre of crest per (m/s of wind over the feathering onset)² each second.
 */
const SPRAY_PER_JOULE = 0.05;
const SPRAY_PER_FOAM = 0.6;
const FEATHER_RATE = 0.05;
/** Drawn spray and mist per m³ of air a closing tube blows out (G9, s_a; docs/research/whitewater-sources.md, provisional). */
export const SPRAY_PER_AIR = 40;
/** The share of a spit's and of an eruption's particles that are mist (provisional). */
const SPIT_MIST = 0.5;
const ERUPTION_MIST = 0.3;
/** One foam-ball sprite stands for this much of a roller's churned water, m³: a 0.6 m ball (provisional render value). */
export const FOAM_BALL_VOLUME = (Math.PI * 0.6 ** 3) / 6;
/** Foam-ball sprites are this wide, m, and outlive their roller by this long, s. */
const FOAM_BALL_SIZE = { min: 0.5, max: 0.8 };
const FOAM_BALL_LINGER = 1;
/** Offshore wind this fast starts blowing spray off steep crests, m/s; the crest must face it this steeply and stand this high over the depth. */
const FEATHER_ONSET = 4;
const FEATHER_SLOPE = 0.25;
const FEATHER_HEIGHT = 0.3;
/**
 * The Rich offshore veil (decided 2026-09-29, spray item 4; round-4 notes §2c): spume is torn off a crest once the wind
 * relative to it passes 7–11 m/s (Veron 2015, citing Andreas et al. 1995 and Andreas 2002), the offshore wind plus the
 * crest's own speed √(g d): at a surf break "the phase speed of the wave may be sufficient" (Veron 2015). None comes off
 * under the onset's low end.
 */
export const VEIL_ONSET = 7;
/** Its drops are 0.1 mm in radius, the spume's peak (Veron 2015), falling at 0.72 m/s, their terminal speed (round-4 notes §2f). */
export const VEIL_RADIUS = 1e-4;
export const VEIL_FALL = 0.72;
/**
 * The water the veil sheds, m³ per metre of crest per second, on the square of the relative wind over the onset, as
 * feathering's rate was on the absolute wind's excess (spray-and-mist.md: "Amount provisional (square law on the
 * excess, as today)") [the rate provisional: no surf-zone measurement exists, set by eye so that at Padang Padang's
 * sourced 5 m/s offshore over a medium swell, some 9–12 m/s relative, the veil is a haze over the crest and not a row
 * of white plumes: a particle's optical depth about 1 as it leaves the crest and a few tenths once it has spread].
 */
export const VEIL_RATE = 3e-6;
/**
 * It is drawn as particles each standing for the water `spacing` m of crest sheds over `interval` s: every place
 * `spacing` m apart along a crest sheds one every `interval` s, at a moment of its own (`placePhase`), drawn over the
 * way it has flown in that time, so the particles one place sheds join into a trail, and as wide as the crest it
 * stands for, so neighbouring places' trails meet: a sheet of fine streaks, with neither the gaps nor the clumps
 * shedding at random leaves. The solver's crests, which stand for the crest away from the drawn lip, shed it from the
 * same places every `coarse` intervals: as fine, each drawn over that longer time, half as many [render values,
 * provisional].
 */
export const VEIL_DRAW = { spacing: 0.5, interval: 0.4, width: 0.5, coarse: 2 } as const;
/**
 * The air the relative wind drives up a crest's face lifts the veil, at the face's slope times the wind (round-4 notes
 * §2c: "of order |U| × the face slope", inferred) for as long as the air takes to rise over the wave's height, so the
 * veil rises about the face's slope times that height above the lip, then streams back and falls (§2c: it "rises 1–3 m
 * above the lip"): `face` is a steep face's slope, about 24°, and the wave's height is taken as twice the crest's over
 * still water [both provisional]. The air's gusts spread a place's drops apart at `gust` of the relative wind for as
 * long as an eddy lasts, `eddy` s: its drops ride the air, so the air's eddies, not their own fall, set how far they
 * spread, and its trail widens into a haze as it goes [both provisional].
 */
export const VEIL_AIR = { face: 0.45, gust: 0.1, eddy: 0.4 } as const;
/**
 * The veil's own rooms in the pool, a share for the drawn lip and one for the solver's crests, so neither starves the
 * other, and the rest of the pool the other spray's: when its room is full, a new veil particle takes the place of its
 * room's oldest; when the pool is full, a newcomer, veil or not, takes the place of the oldest of the other spray, the
 * faintest by then, so neither the veil nor an impact is ever turned away, and the veil costs the other spray only its
 * oldest places, and only in a full pool (round-4 notes §5, item 2: "reserve room for impact bursts and evict the
 * oldest, farthest or faintest first") [the shares provisional]. The oldest is looked for among the next `look`
 * particles of the pool, round from where the last was taken.
 */
export const VEIL_ROOM = { lip: 0.15, crest: 0.1, look: 64 } as const;
/**
 * Solver crest cells within about this many metres of a drawn stretch of crest (in the same cell of this size or the
 * next) leave the veil to it: the drawn lip stands ahead of the solver's crest by up to about the wave's height
 * [provisional].
 */
export const VEIL_COVER = 3;

/** The wind relative to a crest over `depth` m of water, m/s, positive when the air flows seaward past it: the offshore wind plus the crest's own speed √(g d). */
export function relativeWind(windSpeed: number, depth: number): number {
  return -windSpeed + Math.sqrt(GRAVITY * Math.max(0, depth));
}

/** The water a metre of crest sheds as veil a second at relative wind `relative`, m³: the square law on its excess over the onset. */
export function veilRate(relative: number): number {
  const excess = relative - VEIL_ONSET;
  return excess > 0 ? VEIL_RATE * excess * excess : 0;
}

/** When in its interval the place `key` sheds its veil, 0–1: an integer hash of it (murmur3's finaliser), so neighbouring places shed at moments of their own. */
export function placePhase(key: number): number {
  let h = Math.imul(key ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Classic's lip-impact drops (as before G9): up at these shares of the impact speed, and on at these of its horizontal speed. */
const CLASSIC_SPLASH_UP = { min: 0.3, max: 0.8 };
const CLASSIC_SPLASH_FORWARD = { min: 0.2, max: 0.6 };
/** A paddle splash leaves at these shares of the hand's speed through the water: upward, and back along the water the hand pushed. */
const STROKE_UP = { min: 0.3, max: 0.9 };
const STROKE_BACK = { min: 0.3, max: 0.7 };
/**
 * A lip impact's drops leave at the splash-up sheet's speeds (G9, `SPLASH_UP`):
 * up at its share of the downward impact speed, on at its share of the
 * parcel's forward speed, each a fifth either way for variety. `random` is in [0, 1).
 */
export function splashLaunch(downSpeed: number, random: number): { up: number; forward: number } {
  const spread = 0.8 + 0.4 * random;
  return { up: downSpeed * SPLASH_UP.vertical * spread, forward: SPLASH_UP.horizontal * (1.2 - 0.4 * random) };
}
const WET = 0.05;
const WATER_DENSITY = 1025;
/**
 * Floats per particle in `particles`: x, y, z, size (m), opacity, and kind:
 * 0 spray, 1 mist, and a closing tube's whitewater (G9, drawn in Rich only):
 * 2 foam ball, 3 the spit's and eruption's spray, 4 their mist. Those first
 * six are Classic's, as they always were, whichever look the cloud is packed
 * for. Then, after the kind so every older reader keeps its offsets, what the
 * Rich look draws a cluster by (decided 2026-09-29, spray item 1): its streak
 * (the metres it travels while the eye takes it in, x, y, z), `tau` (its
 * drops' optical depth, its mean over its disc), `column` (the optical depth
 * of the spray round it) and `glass` (the share of its disc its water still
 * covers as sheets), then the width (m) and opacity Rich draws it with. All
 * are written in both looks: Classic's draw reads the same floats whichever
 * look the cloud was packed for, and Rich's width and opacity never reach it.
 */
export const SPRAY_STRIDE = 14;
/**
 * The worker's pools: spray and mist, and a closing tube's whitewater beside them, so neither crowds the other out. The
 * spray pool is the decided 16k (2026-09-29, spray-and-mist.md: the 4,096 it was is full on a sixth of the Reef's
 * steps and clips its biggest impacts): the Rich look uses all of it, Classic the 4,096 it always had.
 */
export const SPRAY_CAPACITY = 16384;
export const CLASSIC_SPRAY_CAPACITY = 4096;
export const WHITEWATER_CAPACITY = 1024;

type Kind = 0 | 1 | 2 | 3 | 4;
const SPRAY: Kind = 0;
const MIST: Kind = 1;
const FOAM_BALL: Kind = 2;
const TUBE_SPRAY: Kind = 3;
const TUBE_MIST: Kind = 4;
/**
 * The law of spray drop sizes (Erinin et al. 2023, fitted to plunging breakers' splash; round-4 notes §2a): the count
 * of drops falls as d^-2 below the knee and d^-6 above it, which sits at 0.8–1.5 mm.
 */
export const DROP_LAW = { knee: 1e-3, below: -2, above: -6 } as const;

/**
 * A drop diameter, m, for a cluster: a drop picked by the water it holds, not by count, so that clusters of equal water
 * drawn this way have the mean extinction of the law's Sauter mean (τ = 1.5 w / r₃₂, Bohren 1987). By volume the law
 * weighs d³ · d^-2 = d below the knee and d³ · knee⁴ d^-6 above it; `u` in [0, 1) walks that weight between `smallest`
 * and `largest`.
 */
export function dropDiameter(u: number, smallest: number, largest: number): number {
  const knee = DROP_LAW.knee;
  const below = smallest < knee ? (Math.min(largest, knee) ** 2 - smallest ** 2) / 2 : 0;
  const start = Math.max(smallest, knee);
  const above = largest > knee ? (knee ** 4 * (start ** -2 - largest ** -2)) / 2 : 0;
  const target = u * (below + above);
  if (target < below) return Math.sqrt(smallest ** 2 + 2 * target);
  return (start ** -2 - (2 * (target - below)) / knee ** 4) ** -0.5;
}

/** The optical depth of drops of radius `radius` over a water path `water` (a depth, m): Bohren 1987, τ = 1.5 w / r. */
export function opticalDepth(water: number, radius: number): number {
  return (1.5 * water) / radius;
}

/**
 * The drops each kind of cluster holds: the diameters its fall speeds stand for (G6's 3–7 m/s for drops and
 * 0.3–0.6 m/s for mist are drops of 0.7–2.3 mm and 0.11–0.17 mm by their terminal speeds, round-4 notes §1 and §2f),
 * drawn by the law of drop sizes (`dropDiameter`).
 */
const DROPS: readonly { smallest: number; largest: number }[] = [
  { smallest: 0.7e-3, largest: 2.3e-3 },
  { smallest: 0.11e-3, largest: 0.17e-3 },
  { smallest: 1e-3, largest: 1e-3 },
  { smallest: 0.7e-3, largest: 2.3e-3 },
  { smallest: 0.11e-3, largest: 0.17e-3 },
];
/**
 * The water share of a cluster's volume at birth, by where it comes from [all provisional: no field measurement of a
 * splash's, a bore's or a spit's spray water exists]:
 * - `splash`: a lip impact's, 2 %, the most Chanson et al. 2002 measured in a near-full-scale splash ("less than 2 %"),
 *   so that an impact's clusters together reach the optical depth over 15 that makes a reef splash's core white
 *   (round-4 notes §3);
 * - `fizz`: a bore's and a paddle stroke's, a twentieth of a splash's: the spray off a broken wave's face is sparse;
 * - `spit`: a closing tube's air blows its spray out dense (spray-and-mist.md: "fine and dense, it glows hard when
 *   backlit"), half a splash's;
 * - `mist`: mist a 250th of its source's drops: its drops are a tenth the size, so the same water would be ten times as
 *   deep, and a mist cluster is a faint haze, glowing toward the sun, not a puff.
 */
export const SPRAY_WATER = { splash: 2e-2, fizz: 1e-3, spit: 1e-2, mist: 4e-3 } as const;
/**
 * A cluster stands for drops launched with its emitter's spread of speeds, even over `spread` m/s on each axis, so
 * they fly apart evenly, its width growing by that spread each second, until the air has taken their speeds: over
 * v_t / g, their terminal speed over gravity (the quadratic drag they fly with), a few tenths of a second for
 * millimetre drops and a few hundredths for mist. Mist then spreads as G6 draws it, to twice its width over its life.
 */
const DISPERSION = 1;
/**
 * A cluster's water is born as sheets and ligaments, which tear into drops: a ligament of radius a pinches off in a
 * few of Rayleigh's capillary times, 2.91 √(ρ a³ / σ) (about 4 ms for a 0.5 mm ligament, 20 ms for 1.5 mm), and a
 * splash-up's sheets fly a few tenths of a second first (Chanson et al. 2002: the splash is over in under 0.4 s). The
 * share still sheets falls as e^(−age / BREAKUP) [the time provisional]. Sheets are about the drops' diameter over
 * 1.89 thick (Rayleigh–Plateau: a jet breaks into drops 1.89 times its diameter).
 */
const BREAKUP = 0.1;
const LIGAMENT = 1.89;
/** How long the eye takes a cluster in, s: it is drawn streaked over the way it travels in it, a frame at 60 Hz (round-4 notes §5, item 1). */
export const STREAK_EXPOSURE = 1 / 60;
/** The cell the optical depth of the spray round a cluster (`column`) is gathered over, m: about a splash's core [provisional]. */
export const COLUMN_CELL = 0.5;
/** Each cluster reads the spray round it every this many steps (a newborn one at once): it changes over tenths of a second, a step is a sixtieth. */
export const COLUMN_EVERY = 4;
const COLUMN_SLOTS = 1 << 16;

/** A closing tube's whitewater, drawn in Rich only. */
const isWhitewater = (kind: number) => kind >= FOAM_BALL;
const isMist = (kind: number) => kind === MIST || kind === TUBE_MIST;

/**
 * Spray and mist (plan §2.6, G6): pooled particles marking where the water's
 * kinetic energy converts, launched from lip impacts (splash-up with the
 * parcel's own momentum), from bore faces, blown off steep crests by
 * offshore wind, and blown out of closing tubes by their air (G9). A closing
 * tube's foam ball is drawn by sprites tumbling in its roller (G9). A tube's
 * whitewater has its own pool (`whitewaterCapacity`) beside the spray's
 * (`capacity`), so neither crowds the other out. They fly ballistically with quadratic air drag toward the
 * wind, and end when they fall back through the surface or their time is up.
 * Visual only, with no rendering dependency, so it runs in the worker beside
 * the water; `SprayPoints` draws it.
 */
export class SprayCloud {
  /** Per live particle: x, y, z, size, opacity, kind (`SPRAY_STRIDE`), packed at the front. */
  readonly particles: Float32Array;
  count = 0;
  /** How many of them are a closing tube's whitewater. */
  whitewaterCount = 0;
  /** How many are the offshore veil, off the drawn lip and off the solver's crests (`VEIL_ROOM`). */
  veilLipCount = 0;
  veilCrestCount = 0;
  /** The look the spray is drawn in: Classic's lip-impact drops are as they were before G9. */
  look: SprayLook = 'rich';
  private readonly x: Float64Array;
  private readonly y: Float64Array;
  private readonly z: Float64Array;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly vz: Float64Array;
  private readonly age: Float64Array;
  private readonly life: Float64Array;
  /** g / v_t², 1/m: the quadratic drag giving each particle its terminal speed. */
  private readonly drag: Float64Array;
  private readonly size: Float64Array;
  private readonly kind: Uint8Array;
  /**
   * Per particle, for the Rich look: its drops' radius, m, the water it holds, m³, its emitter's spread of speeds, m/s,
   * how long it is streaked over, s, and the optical depth of the spray round it when it last read it (NaN till then).
   */
  private readonly radius: Float64Array;
  private readonly water: Float64Array;
  private readonly spread: Float64Array;
  private readonly streak: Float64Array;
  private readonly around: Float64Array;
  /**
   * Per particle, how long its drops spread at their spread of speeds, s (`DISPERSION`): till the air takes their own
   * speeds, v_t / g, or, for the veil's, which ride the air, as long as its eddies last (`VEIL_AIR`).
   */
  private readonly settle: Float64Array;
  /** Per particle: 0, or the veil it is, 1 off the drawn lip and 2 off the solver's crests; and the updraft that lifts it at birth, m/s, and how long that lasts, s. */
  private readonly veilOf: Uint8Array;
  private readonly lift: Float64Array;
  private readonly liftTime: Float64Array;
  /** Where the search for the veil's oldest particle goes on from, and the Rich veil's clock, s (`placePhase`). */
  private cursor = 0;
  private veilClock = 0;
  /** Scratch for `veil`: the coarse cells a drawn stretch of crest covers (`VEIL_COVER`). */
  private readonly veilCover = new Set<number>();
  /** Scratch for `pack`: each cluster's width, and its water in drops and in sheets, now (`optics`). */
  private readonly widthNow: Float64Array;
  private readonly dropsNow: Float64Array;
  private readonly sheetsNow: Float64Array;
  /** A foam-ball sprite's roller, and where it sits in it: its distance from the axis, angle round it, and offset along it. */
  private readonly owner: Float64Array;
  private readonly radial: Float64Array;
  private readonly spin: Float64Array;
  private readonly lateral: Float64Array;
  private readonly random: () => number;
  /** A stream of its own for the optics (drop sizes, water), so the particles' flight is the same whatever is drawn of them. */
  private readonly optical: () => number;
  /** Scratch for `gather`: a hash of cells (x, y, z, the pass that wrote it) and the cross-section of spray in each, m². */
  private readonly cellKeys = new Int32Array(COLUMN_SLOTS * 4);
  private readonly cellSums = new Float64Array(COLUMN_SLOTS);
  private pass = 0;
  /** The hash's size this pass (a power of two, at least twice the particles, so it stays small and in cache). */
  private slots = 256;
  /** Scratch for `roll`: each roller's sprites, and the rollers by id. */
  private readonly held = new Map<number, number>();
  private readonly rollerById = new Map<number, TubeRoller>();

  constructor(seed: number, readonly capacity = SPRAY_CAPACITY, readonly whitewaterCapacity = Math.round(capacity / 4)) {
    this.random = seededRandom(seed, 0x5b1a54);
    this.optical = seededRandom(seed, 0x0d70b5);
    const total = capacity + whitewaterCapacity;
    const make = () => new Float64Array(total);
    this.x = make(); this.y = make(); this.z = make();
    this.vx = make(); this.vy = make(); this.vz = make();
    this.age = make(); this.life = make(); this.drag = make(); this.size = make();
    this.owner = make(); this.radial = make(); this.spin = make(); this.lateral = make();
    this.kind = new Uint8Array(total);
    this.radius = make(); this.water = make(); this.spread = make(); this.streak = make(); this.around = make(); this.settle = make();
    this.widthNow = make(); this.dropsNow = make(); this.sheetsNow = make();
    this.veilOf = new Uint8Array(total); this.lift = make(); this.liftTime = make();
    this.particles = new Float32Array(total * SPRAY_STRIDE);
  }

  /**
   * Whether there is room for another particle of spray and mist, or of a tube's whitewater. Classic's spray keeps the
   * 4,096 it always had; Rich's has the whole pool but the veil's places, and a newcomer takes the place of its oldest
   * when it is full (`spawn`, `VEIL_ROOM`).
   */
  private room(whitewater: boolean): boolean {
    if (whitewater) return this.whitewaterCount < this.whitewaterCapacity;
    const spray = this.count - this.whitewaterCount;
    if (this.look === 'classic') return spray < Math.min(this.capacity, CLASSIC_SPRAY_CAPACITY);
    return spray < this.capacity || spray - this.veilLipCount - this.veilCrestCount > 0;
  }

  update(scene: SprayScene, dt: number): void {
    if (!(dt > 0)) return;
    this.fly(scene, dt);
    this.roll(scene.rollers ?? [], dt);
    for (const spit of scene.spits ?? []) {
      this.tubeBurst(spit.x, spit.y, spit.z, spit.dirX * spit.speed, 0, spit.dirZ * spit.speed, spit.airRate * dt, SPIT_MIST);
    }
    for (const eruption of scene.eruptions ?? []) {
      this.tubeBurst(eruption.x, eruption.y, eruption.z, 0, eruption.speed, 0, eruption.airRate * dt, ERUPTION_MIST);
    }
    for (const impact of scene.lipImpacts) this.splash(scene, impact);
    for (const stroke of scene.strokes ?? []) this.strokeSplash(scene, stroke);
    this.boreSpray(scene, dt);
    if (this.look === 'rich') this.veil(scene, dt);
    else this.feather(scene, dt);
    this.pack();
  }

  clear(): void {
    this.count = 0;
    this.whitewaterCount = 0;
    this.veilLipCount = 0;
    this.veilCrestCount = 0;
  }

  private fly(scene: SprayScene, dt: number): void {
    const { solver, windSpeed } = scene;
    for (let k = 0; k < this.count; k += 1) {
      if (this.kind[k] === FOAM_BALL) {
        // Rolled into place by its roller (`roll`); once that is gone it drifts on with the crest, and fades.
        this.x[k] += this.vx[k] * dt;
        this.z[k] += this.vz[k] * dt;
        this.age[k] += dt;
        if (this.age[k] > this.life[k]) this.remove(k--);
        continue;
      }
      // Quadratic drag toward the wind (implicit in the drag's size, so light mist cannot overshoot it); the veil's air
      // also rises up the crest's face for a while.
      const updraft = this.lift[k] > 0 ? this.lift[k] * Math.exp(-this.age[k] / this.liftTime[k]) : 0;
      const rx = this.vx[k];
      const ry = this.vy[k] - updraft;
      const rz = this.vz[k] - windSpeed;
      const speed = Math.hypot(rx, ry, rz);
      const damping = 1 / (1 + dt * this.drag[k] * speed);
      this.vx[k] = rx * damping;
      this.vy[k] = ry * damping + updraft - GRAVITY * dt;
      this.vz[k] = rz * damping + windSpeed;
      this.x[k] += this.vx[k] * dt;
      this.y[k] += this.vy[k] * dt;
      this.z[k] += this.vz[k] * dt;
      this.age[k] += dt;
      const cell = solver.cellIndex(this.x[k], this.z[k]);
      const surface = solver.h[cell] + solver.bed[cell];
      const landed = this.vy[k] < 0 && this.y[k] <= surface;
      if (landed || this.age[k] > this.life[k]) this.remove(k--);
    }
  }

  /** Splash-up where a lip parcel lands: drops launched up and on with its momentum, in proportion to its kinetic energy. */
  private splash(scene: SprayScene, impact: LipImpact): void {
    if (this.look === 'classic') {
      this.classicSplash(scene, impact);
      return;
    }
    const speed = Math.hypot(impact.vx, impact.vy, impact.vz);
    const energy = 0.5 * WATER_DENSITY * impact.volume * speed * speed;
    const expected = energy * SPRAY_PER_JOULE;
    let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
    const surface = impact.y ?? this.waterAt(scene, impact);
    for (; spawns > 0 && this.room(false); spawns -= 1) {
      const { up, forward } = splashLaunch(Math.abs(impact.vy), this.random());
      const spread = 1.5;
      const mist = this.random() < 0.2;
      this.spawn(
        mist ? MIST : SPRAY,
        impact.x + (this.random() - 0.5) * 0.8, surface + 0.05, impact.z + (this.random() - 0.5) * 0.8,
        impact.vx * forward + (this.random() - 0.5) * spread, up, impact.vz * forward + (this.random() - 0.5) * spread,
        spread, SPRAY_WATER.splash,
      );
    }
  }

  /**
   * Classic's lip-impact drops, as before G9: from a jet parcel's whole water
   * (Classic draws no splash-up, so a splash-up's landing throws none), in
   * proportion to its kinetic energy, up at 30–80 % of its impact speed and
   * on at 20–60 % of its horizontal speed.
   */
  private classicSplash(scene: SprayScene, impact: LipImpact): void {
    if (impact.kind === 1) return;
    const volume = impact.whole ?? impact.volume;
    const speed = Math.hypot(impact.vx, impact.vy, impact.vz);
    const energy = 0.5 * WATER_DENSITY * volume * speed * speed;
    const expected = energy * SPRAY_PER_JOULE;
    let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
    const surface = impact.y ?? this.waterAt(scene, impact);
    for (; spawns > 0 && this.room(false); spawns -= 1) {
      const up = speed * this.between(CLASSIC_SPLASH_UP);
      const forward = this.between(CLASSIC_SPLASH_FORWARD);
      const spread = 1.5;
      const mist = this.random() < 0.2;
      this.spawn(
        mist ? MIST : SPRAY,
        impact.x + (this.random() - 0.5) * 0.8, surface + 0.05, impact.z + (this.random() - 0.5) * 0.8,
        impact.vx * forward + (this.random() - 0.5) * spread, up, impact.vz * forward + (this.random() - 0.5) * spread,
        spread, SPRAY_WATER.splash,
      );
    }
  }

  /**
   * A paddle stroke's splash: drops in proportion to the work the hand did on
   * the water (its push times its speed through it), at the lip splash's rate
   * per joule, thrown up and back along the water it pushed.
   */
  private strokeSplash(scene: SprayScene, stroke: StrokeSplash): void {
    const push = Math.hypot(stroke.jx, stroke.jz);
    if (!(push > 0) || !(stroke.speed > 0)) return;
    const expected = push * stroke.speed * SPRAY_PER_JOULE;
    let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
    const cell = scene.solver.cellIndex(stroke.x, stroke.z);
    const surface = scene.solver.h[cell] + scene.solver.bed[cell];
    const backX = -stroke.jx / push;
    const backZ = -stroke.jz / push;
    for (; spawns > 0 && this.room(false); spawns -= 1) {
      const up = stroke.speed * this.between(STROKE_UP);
      const back = stroke.speed * this.between(STROKE_BACK);
      const spread = 0.3 * stroke.speed;
      this.spawn(
        SPRAY,
        stroke.x + (this.random() - 0.5) * 0.15, surface + 0.03, stroke.z + (this.random() - 0.5) * 0.15,
        backX * back + (this.random() - 0.5) * spread, up, backZ * back + (this.random() - 0.5) * spread,
        spread, SPRAY_WATER.fizz,
      );
    }
  }

  /**
   * Spray and mist a closing tube's air blows out (G9): the spit out of its
   * mouth, or an eruption up through the lip. SPRAY_PER_AIR particles per m³
   * of the air, carried at its velocity with a fifth either way of variety.
   */
  private tubeBurst(x: number, y: number, z: number, vx: number, vy: number, vz: number, air: number, mistShare: number): void {
    const expected = air * SPRAY_PER_AIR;
    let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
    const spread = 0.1 * Math.hypot(vx, vy, vz);
    for (; spawns > 0 && this.room(true); spawns -= 1) {
      const pace = 0.8 + 0.4 * this.random();
      this.spawn(
        this.random() < mistShare ? TUBE_MIST : TUBE_SPRAY,
        x + (this.random() - 0.5) * 0.3, y + (this.random() - 0.5) * 0.3, z + (this.random() - 0.5) * 0.3,
        vx * pace + (this.random() - 0.5) * spread, vy * pace + (this.random() - 0.5) * spread, vz * pace + (this.random() - 0.5) * spread,
        spread, SPRAY_WATER.spit,
      );
    }
  }

  /**
   * The foam balls (G9): each roller keeps about A·w / FOAM_BALL_VOLUME sprites
   * in its cross-section, spread evenly over it and along its width. They ride
   * with it and tumble as it rolls, its top going forward, at its speed over
   * its radius, and outlive it by FOAM_BALL_LINGER.
   */
  private roll(rollers: readonly TubeRoller[], dt: number): void {
    if (rollers.length === 0) return;
    const held = this.held;
    held.clear();
    for (let k = 0; k < this.count; k += 1) {
      if (this.kind[k] === FOAM_BALL) held.set(this.owner[k], (held.get(this.owner[k]) ?? 0) + 1);
    }
    const byId = this.rollerById;
    byId.clear();
    for (const roller of rollers) {
      const radius = Math.sqrt(roller.area / Math.PI);
      if (!(radius > 0)) continue;
      byId.set(roller.id, roller);
      const wanted = Math.round((roller.area * roller.width) / FOAM_BALL_VOLUME);
      for (let n = held.get(roller.id) ?? 0; n < wanted && this.room(true); n += 1) {
        const k = this.count;
        this.spawn(FOAM_BALL, roller.x, roller.y, roller.z, 0, 0, 0);
        this.owner[k] = roller.id;
        this.radial[k] = radius * Math.sqrt(this.random());
        this.spin[k] = 2 * Math.PI * this.random();
        this.lateral[k] = (this.random() - 0.5) * roller.width;
      }
    }
    for (let k = 0; k < this.count; k += 1) {
      if (this.kind[k] !== FOAM_BALL) continue;
      const roller = byId.get(this.owner[k]);
      if (!roller) continue;
      const radius = Math.sqrt(roller.area / Math.PI);
      this.spin[k] -= (roller.speed / radius) * dt;
      const along = this.radial[k] * Math.cos(this.spin[k]);
      this.x[k] = roller.x + roller.dirX * along - roller.dirZ * this.lateral[k];
      this.y[k] = roller.y + this.radial[k] * Math.sin(this.spin[k]);
      this.z[k] = roller.z + roller.dirZ * along + roller.dirX * this.lateral[k];
      this.vx[k] = roller.dirX * roller.speed;
      this.vy[k] = 0;
      this.vz[k] = roller.dirZ * roller.speed;
      this.life[k] = this.age[k] + FOAM_BALL_LINGER;
    }
  }

  /** Drops thrown up at bore faces, where the foam field sees bores dissipate. */
  private boreSpray(scene: SprayScene, dt: number): void {
    const { solver, foam } = scene;
    const { nx, xCenters, zCenters, dx, dz, h, bed, qx, qz } = solver;
    const source = foam.source;
    const start = Math.floor(this.random() * source.length);
    for (let n = 0; n < source.length && this.room(false); n += 1) {
      const i = (start + n) % source.length;
      if (!(source[i] > 0) || h[i] <= WET) continue;
      const row = Math.floor(i / nx);
      const expected = source[i] * dt * dx * dz[row] * SPRAY_PER_FOAM;
      let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
      const surface = h[i] + bed[i];
      const u = qx[i] / h[i];
      const w = qz[i] / h[i];
      const lift = Math.sqrt(GRAVITY * h[i]) * 0.4;
      for (; spawns > 0 && this.room(false); spawns -= 1) {
        this.spawn(
          this.random() < 0.3 ? MIST : SPRAY,
          xCenters[i - row * nx] + (this.random() - 0.5) * dx, surface + 0.05, zCenters[row] + (this.random() - 0.5) * dz[row],
          u + (this.random() - 0.5), lift * (0.4 + 0.6 * this.random()), w + (this.random() - 0.5),
          1, SPRAY_WATER.fizz,
        );
      }
    }
  }

  /**
   * Offshore wind blowing spray back off steep crests (plan §1.8, Q23): where
   * the wind blows against a face standing high over the depth, a mist streams
   * off its top seaward, more of it the harder the wind blows.
   */
  private feather(scene: SprayScene, dt: number): void {
    const { solver, windSpeed } = scene;
    const excess = -windSpeed - FEATHER_ONSET;
    if (!(windSpeed < 0) || !(excess > 0)) return;
    const { nx, nz, xCenters, zCenters, dx, dz, h, bed, restLevel } = solver;
    for (let row = 1; row < nz - 1 && this.room(false); row += 1) {
      const gap = zCenters[row + 1] - zCenters[row - 1];
      for (let column = 0; column < nx && this.room(false); column += 1) {
        const i = row * nx + column;
        const depth = h[i];
        const still = restLevel - bed[i];
        if (depth <= WET || !(still > WET)) continue;
        const crest = depth + bed[i] - restLevel;
        if (crest < FEATHER_HEIGHT * still) continue;
        // The wind blows toward −z (offshore); the shoreward face of a crest rises toward it.
        const slope = (h[i - nx] + bed[i - nx] - (h[i + nx] + bed[i + nx])) / gap;
        if (slope < FEATHER_SLOPE) continue;
        const expected = FEATHER_RATE * excess * excess * dx * dz[row] * dt;
        let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
        for (; spawns > 0 && this.room(false); spawns -= 1) {
          this.spawn(
            MIST, xCenters[column] + (this.random() - 0.5) * dx, depth + bed[i] + 0.1, zCenters[row],
            (this.random() - 0.5) * 0.5, 0.5 + this.random(), windSpeed * (0.3 + 0.4 * this.random()),
            0.5, SPRAY_WATER.fizz,
          );
        }
      }
    }
  }

  /**
   * The Rich offshore veil (decided 2026-09-29, spray item 4): spume torn off every crest the wind relative to it
   * (`relativeWind`) is over the onset on, at the air's velocity, lifted by the air the wind drives up the crest's face,
   * streaming back with the wind. It comes off a swept barrel's drawn crest where one is drawn, all along it, and off
   * the solver's steep crests elsewhere (the crest feathering found), each in its own room.
   */
  private veil(scene: SprayScene, dt: number): void {
    const { solver, windSpeed } = scene;
    const before = this.veilClock;
    const now = before + dt;
    this.veilClock = now;
    // How many particles the place `key` sheds this step: one every `interval` s, at its own moment in it.
    const sheds = (key: number, interval: number) => {
      const phase = placePhase(key) * interval;
      return Math.floor((now + phase) / interval) - Math.floor((before + phase) / interval);
    };
    const { spacing, interval } = VEIL_DRAW;
    const covered = this.veilCover;
    covered.clear();
    const lips = scene.lipCrests;
    // A room that can take no more (a pool too small to hold any veil) ends its own group's shedding, not the other's.
    stretches: for (let c = 0; lips && c < lips.count; c += 1) {
      const o = c * LIP_CREST_STRIDE;
      const ax = lips.data[o];
      const ay = lips.data[o + 1];
      const az = lips.data[o + 2];
      const bx = lips.data[o + 3];
      const by = lips.data[o + 4];
      const bz = lips.data[o + 5];
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const kx = Math.floor(mx / VEIL_COVER);
      const kz = Math.floor(mz / VEIL_COVER);
      for (let i = -1; i <= 1; i += 1) for (let j = -1; j <= 1; j += 1) covered.add((kx + i) * 65536 + (kz + j));
      const cell = solver.cellIndex(mx, mz);
      const relative = relativeWind(windSpeed, solver.h[cell]);
      const rate = veilRate(relative);
      if (!(rate > 0)) continue;
      const height = Math.max(0, (ay + by) / 2 - solver.restLevel);
      // Its places are every `spacing` m along the level axis it runs nearer to, fixed in the world as the crest moves,
      // each standing for the crest between it and the next (at most two spacings of it, where a stretch rises steeply);
      // each sheds within half a spacing of itself.
      const alongX = Math.abs(bx - ax) >= Math.abs(bz - az);
      const a = alongX ? ax : az;
      const b = alongX ? bx : bz;
      if (!(Math.abs(b - a) > 0)) continue;
      const length = Math.min(2, Math.hypot(bx - ax, by - ay, bz - az) / Math.abs(b - a)) * spacing;
      for (let j = Math.ceil(Math.min(a, b) / spacing); j * spacing < Math.max(a, b); j += 1) {
        for (let n = sheds(4 * j + (alongX ? 0 : 1), interval); n > 0; n -= 1) {
          const u = (j * spacing + (this.random() - 0.5) * spacing - a) / (b - a);
          if (!this.spawnVeil(1, ax + (bx - ax) * u, ay + (by - ay) * u, az + (bz - az) * u, windSpeed, relative, rate, height, length, interval)) break stretches;
        }
      }
    }
    const { nx, nz, xCenters, zCenters, dx, h, bed, restLevel } = solver;
    for (let row = 1; row < nz - 1; row += 1) {
      const gap = zCenters[row + 1] - zCenters[row - 1];
      for (let column = 0; column < nx; column += 1) {
        const i = row * nx + column;
        const depth = h[i];
        const still = restLevel - bed[i];
        if (depth <= WET || !(still > WET)) continue;
        const crest = depth + bed[i] - restLevel;
        if (crest < FEATHER_HEIGHT * still) continue;
        // The wind blows toward −z (offshore); the shoreward face of a crest rises toward it.
        const slope = (h[i - nx] + bed[i - nx] - (h[i + nx] + bed[i + nx])) / gap;
        if (slope < FEATHER_SLOPE) continue;
        if (covered.size > 0 && covered.has(Math.floor(xCenters[column] / VEIL_COVER) * 65536 + Math.floor(zCenters[row] / VEIL_COVER))) continue;
        const relative = relativeWind(windSpeed, depth);
        const rate = veilRate(relative);
        if (!(rate > 0)) continue;
        // Its places are the crest's every `spacing` m along x across the cell, as the lip's are.
        const slow = VEIL_DRAW.coarse * interval;
        const from = xCenters[column] - dx / 2;
        for (let j = Math.ceil(from / spacing); j * spacing < from + dx; j += 1) {
          for (let n = sheds(4 * (j * 65536 + row) + 2, slow); n > 0; n -= 1) {
            const x = j * spacing + (this.random() - 0.5) * spacing;
            if (!this.spawnVeil(2, x, depth + bed[i], zCenters[row], windSpeed, relative, rate, crest, spacing, slow)) return;
          }
        }
      }
    }
  }

  /**
   * One particle of veil, `group` 1 off the drawn lip and 2 off the solver's crests: the water `length` m of crest sheds
   * over `interval` s (`VEIL_DRAW`) at `rate`, m³ per metre a second, in 0.1 mm drops, as wide as that crest, at the
   * air's velocity, lifted by the air rising up a crest standing `height` m over still water. It takes its room's
   * oldest place when its room is full, and the other spray's oldest when the pool is full (`VEIL_ROOM`).
   */
  private spawnVeil(
    group: 1 | 2, x: number, y: number, z: number, windSpeed: number, relative: number, rate: number, height: number, length: number, interval: number,
  ): boolean {
    const room = group === 1 ? VEIL_ROOM.lip : VEIL_ROOM.crest;
    if ((group === 1 ? this.veilLipCount : this.veilCrestCount) >= room * this.capacity && !this.evictOldest(group)) return false;
    if (!this.room(false) && !this.evictOldest(group)) return false;
    const updraft = VEIL_AIR.face * relative;
    this.spawn(MIST, x, y, z, 0, updraft, windSpeed, VEIL_AIR.gust * relative);
    const k = this.count - 1;
    this.veilOf[k] = group;
    if (group === 1) this.veilLipCount += 1;
    else this.veilCrestCount += 1;
    this.lift[k] = updraft;
    this.liftTime[k] = (2 * Math.max(height, 0.1)) / relative;
    this.drag[k] = GRAVITY / (VEIL_FALL * VEIL_FALL);
    this.settle[k] = VEIL_AIR.eddy;
    this.size[k] = length * (VEIL_DRAW.width / VEIL_DRAW.spacing);
    this.radius[k] = VEIL_RADIUS;
    this.water[k] = rate * length * interval;
    this.streak[k] = interval;
    return true;
  }

  /**
   * Takes the place of the oldest particle of `group`: the veil off the drawn lip (1) or off the solver's crests (2), or
   * the other spray and mist (-1, a tube's whitewater aside): the one furthest through its life of the next
   * `VEIL_ROOM.look` of them round the pool from the last one taken, or of the rest if none is there. False if there is
   * none to take.
   */
  private evictOldest(group: -1 | 1 | 2): boolean {
    const count = this.count;
    const veil = this.veilLipCount + this.veilCrestCount;
    if (count === 0 || (group === -1 ? count - this.whitewaterCount - veil : group === 1 ? this.veilLipCount : this.veilCrestCount) === 0) return false;
    let best = -1;
    let oldest = -1;
    for (let looked = 0, k = this.cursor % count; looked < count; looked += 1, k = k + 1 === count ? 0 : k + 1) {
      if (group === -1 ? this.veilOf[k] === 0 && !isWhitewater(this.kind[k]) : this.veilOf[k] === group) {
        const through = this.age[k] / this.life[k];
        if (through > oldest) {
          oldest = through;
          best = k;
        }
      }
      if (looked + 1 >= VEIL_ROOM.look && best >= 0) break;
    }
    if (best < 0) return false;
    this.cursor = best;
    this.remove(best);
    return true;
  }

  /**
   * A particle of `kind`, launched with its emitter's `spread` of speeds, m/s (how its cluster widens, `DISPERSION`),
   * its drops the water share `water` of its volume (`SPRAY_WATER`, mist a fraction of it).
   */
  private spawn(kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number, spread = 0, water = 0): void {
    // A full Rich pool: the newcomer takes the place of the oldest of the spray but the veil (`VEIL_ROOM`).
    if (!isWhitewater(kind) && this.count - this.whitewaterCount >= this.capacity) this.evictOldest(-1);
    const k = this.count;
    this.x[k] = x;
    this.y[k] = y;
    this.z[k] = z;
    this.vx[k] = vx;
    this.vy[k] = vy;
    this.vz[k] = vz;
    this.age[k] = 0;
    this.kind[k] = kind;
    this.spread[k] = spread;
    this.streak[k] = STREAK_EXPOSURE;
    this.around[k] = Number.NaN;
    this.veilOf[k] = 0;
    this.lift[k] = 0;
    this.count += 1;
    if (isWhitewater(kind)) this.whitewaterCount += 1;
    if (kind === FOAM_BALL) {
      this.drag[k] = 0;
      this.life[k] = FOAM_BALL_LINGER;
      this.size[k] = this.between(FOAM_BALL_SIZE);
      this.radius[k] = 1;
      this.water[k] = 0;
      this.settle[k] = 0;
      return;
    }
    const mist = isMist(kind);
    const fall = mist ? this.between(MIST_FALL) : this.between(SPRAY_FALL);
    this.drag[k] = GRAVITY / (fall * fall);
    this.settle[k] = fall / GRAVITY;
    this.life[k] = (mist ? MIST_LIFE : SPRAY_LIFE) * (0.6 + 0.4 * this.random());
    this.size[k] = mist ? 0.35 + 0.45 * this.random() : 0.06 + 0.08 * this.random();
    // Its optics, from a stream of their own: its drops' size by the law, and the water a cluster of its width holds.
    const drops = DROPS[kind];
    this.radius[k] = dropDiameter(this.optical(), drops.smallest, drops.largest) / 2;
    this.water[k] = (water * (mist ? SPRAY_WATER.mist : 1) * Math.PI * this.size[k] ** 3) / 6;
  }

  private remove(k: number): void {
    if (isWhitewater(this.kind[k])) this.whitewaterCount -= 1;
    if (this.veilOf[k] === 1) this.veilLipCount -= 1;
    else if (this.veilOf[k] === 2) this.veilCrestCount -= 1;
    this.count -= 1;
    const last = this.count;
    this.x[k] = this.x[last];
    this.y[k] = this.y[last];
    this.z[k] = this.z[last];
    this.vx[k] = this.vx[last];
    this.vy[k] = this.vy[last];
    this.vz[k] = this.vz[last];
    this.age[k] = this.age[last];
    this.life[k] = this.life[last];
    this.drag[k] = this.drag[last];
    this.size[k] = this.size[last];
    this.kind[k] = this.kind[last];
    this.radius[k] = this.radius[last];
    this.water[k] = this.water[last];
    this.spread[k] = this.spread[last];
    this.streak[k] = this.streak[last];
    this.around[k] = this.around[last];
    this.settle[k] = this.settle[last];
    this.veilOf[k] = this.veilOf[last];
    this.lift[k] = this.lift[last];
    this.liftTime[k] = this.liftTime[last];
    this.owner[k] = this.owner[last];
    this.radial[k] = this.radial[last];
    this.spin[k] = this.spin[last];
    this.lateral[k] = this.lateral[last];
  }

  private pack(): void {
    const rich = this.look === 'rich';
    const { particles } = this;
    // The cross-section of each cluster's drops, gathered into the cells round it for the optical depth of the spray there.
    this.pass += 1;
    this.slots = Math.min(COLUMN_SLOTS, Math.max(256, 2 ** Math.ceil(Math.log2(2 * this.count + 1))));
    for (let k = 0; k < this.count; k += 1) {
      if (this.kind[k] === FOAM_BALL) continue;
      this.optics(k);
      const drops = this.dropsNow[k];
      if (!(drops > 0)) continue;
      const slot = this.cell(Math.floor(this.x[k] / COLUMN_CELL), Math.floor(this.y[k] / COLUMN_CELL), Math.floor(this.z[k] / COLUMN_CELL), true);
      this.cellSums[slot] += opticalDepth(drops, this.radius[k]);
    }
    for (let k = 0; k < this.count; k += 1) {
      const o = k * SPRAY_STRIDE;
      const t = this.age[k] / this.life[k];
      const mist = isMist(this.kind[k]);
      const ball = this.kind[k] === FOAM_BALL;
      const width = ball ? this.size[k] : this.widthNow[k];
      const drops = this.dropsNow[k];
      const sheets = this.sheetsNow[k];
      // A particle of veil stands for what its place shed over its interval: drawn over the way it has come in that
      // time, behind it (since it was shed, while it is younger), not about it.
      const veil = rich && this.veilOf[k] !== 0;
      const trail = veil ? Math.min(this.streak[k], this.age[k]) : this.streak[k];
      const back = veil ? trail / 2 : 0;
      particles[o] = this.x[k] - this.vx[k] * back;
      particles[o + 1] = this.y[k] - this.vy[k] * back;
      particles[o + 2] = this.z[k] - this.vz[k] * back;
      // Classic draws mist growing to twice its width, its spray and mist fading as they age; a foam ball holds until its
      // roller is gone, then fades over the time it lingers (Classic draws none, and gave it the 0.9 it always had; while
      // it holds, Rich draws it as opaque as its own optical depth makes it, `foamBallDepth`).
      const lingering = Math.min(1, (this.life[k] - this.age[k]) / FOAM_BALL_LINGER);
      particles[o + 3] = this.size[k] * (mist ? 1 + t : 1);
      particles[o + 4] = ball ? 0.9 * lingering : (mist ? 0.25 : 0.8) * (1 - t * t);
      particles[o + 5] = this.kind[k];
      particles[o + 6] = this.vx[k] * trail;
      particles[o + 7] = this.vy[k] * trail;
      particles[o + 8] = this.vz[k] * trail;
      // Rich draws each cluster as wide as its drops have spread, and by its optical depth, which thins as its water does.
      particles[o + 12] = width;
      particles[o + 13] = ball ? lingering : 1;
      if (ball) {
        particles[o + 9] = 0;
        particles[o + 10] = 0;
        particles[o + 11] = 0;
        continue;
      }
      const disc = (Math.PI * width * width) / 4;
      particles[o + 9] = opticalDepth(drops / disc, this.radius[k]);
      if (Number.isNaN(this.around[k]) || (k + this.pass) % COLUMN_EVERY === 0) this.around[k] = this.column(this.x[k], this.y[k], this.z[k]);
      particles[o + 10] = this.around[k];
      particles[o + 11] = Math.min(1, (LIGAMENT * sheets) / (disc * 2 * this.radius[k]));
    }
  }

  /**
   * A cluster as the Rich look sees it now: its width, spread by its emitter's speeds till the air takes them
   * (`DISPERSION`), and its water,
   * m³, in drops and still in sheets (`BREAKUP`); its water thins over its life as G6's opacity fades, 1 − t².
   */
  private optics(k: number): void {
    const t = this.age[k] / this.life[k];
    const water = this.water[k] * Math.max(0, 1 - t * t);
    const sheet = Math.exp(-this.age[k] / BREAKUP);
    const settle = this.settle[k];
    const flown = settle > 0 ? DISPERSION * this.spread[k] * settle * (1 - Math.exp(-this.age[k] / settle)) : 0;
    this.widthNow[k] = (this.size[k] + flown) * (isMist(this.kind[k]) ? 1 + t : 1);
    this.dropsNow[k] = water * (1 - sheet);
    this.sheetsNow[k] = water * sheet;
  }

  /** The optical depth of the spray round a point: its drops' cross-section in the cells about it, read trilinearly, over a cell's face. */
  private column(x: number, y: number, z: number): number {
    const u = x / COLUMN_CELL - 0.5;
    const v = y / COLUMN_CELL - 0.5;
    const w = z / COLUMN_CELL - 0.5;
    const i = Math.floor(u);
    const j = Math.floor(v);
    const l = Math.floor(w);
    const fu = u - i;
    const fv = v - j;
    const fw = w - l;
    let sum = 0;
    for (let a = 0; a < 2; a += 1) {
      for (let b = 0; b < 2; b += 1) {
        for (let c = 0; c < 2; c += 1) {
          const slot = this.cell(i + a, j + b, l + c, false);
          if (slot < 0) continue;
          sum += this.cellSums[slot] * (a ? fu : 1 - fu) * (b ? fv : 1 - fv) * (c ? fw : 1 - fw);
        }
      }
    }
    return sum / (COLUMN_CELL * COLUMN_CELL);
  }

  /** The hash slot of cell (i, j, k) for this pass, made if `create`, else −1 where there is none. */
  private cell(i: number, j: number, k: number, create: boolean): number {
    const keys = this.cellKeys;
    const mask = this.slots - 1;
    let slot = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791)) & mask;
    for (;;) {
      const o = slot * 4;
      if (keys[o + 3] !== this.pass) {
        if (!create) return -1;
        keys[o] = i;
        keys[o + 1] = j;
        keys[o + 2] = k;
        keys[o + 3] = this.pass;
        this.cellSums[slot] = 0;
        return slot;
      }
      if (keys[o] === i && keys[o + 1] === j && keys[o + 2] === k) return slot;
      slot = (slot + 1) & mask;
    }
  }

  private between(range: { min: number; max: number }): number {
    return range.min + (range.max - range.min) * this.random();
  }

  /** The water's surface in the cell a lip impact lands in, m. */
  private waterAt(scene: SprayScene, impact: LipImpact): number {
    const cell = scene.solver.cellIndex(impact.x, impact.z);
    return scene.solver.h[cell] + scene.solver.bed[cell];
  }
}
