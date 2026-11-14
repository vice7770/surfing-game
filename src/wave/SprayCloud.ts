import { GRAVITY } from './dispersion';
import { PARTICLE_BUDGETS, particleBudget, poolSize, type ParticleBudget, type ParticleLevel } from './particleBudget';
import { seededRandom } from './random';
import { firstSourceCell, type ParticleSources } from './particleSources';
import { SPLASH_UP, type TubeEruption, type TubeRoller, type TubeSpit } from './PlungingLip';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from './SpillingRoller';
import { BAND_LOOK_FIELD, BAND_LOOK_STRIDE } from './SpillingCurl';

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
  /**
   * The height of the wave the parcel fell from, m (C2 step 5g): the veil's own ruler — how far back over the water it
   * spreads, how far up the air carries it, and how wide its patch of air reaches, are all in wave heights.
   */
  height?: number;
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

/**
 * The roller front's toe line (the Canyon roller front, docs/research/roller-front-2026-10-22), drawn only: the roller's
 * drawn table (`ROLLER_FIELD`, slot-major, `columns` a slot) and its look beside it (`BAND_LOOK_FIELD`), the first
 * column's centre x and the columns' width, m.
 */
export interface RollerToes {
  readonly table: ArrayLike<number>;
  readonly look: ArrayLike<number>;
  readonly columns: number;
  readonly column0: number;
  readonly width: number;
}

/**
 * The roller front's toe spray (the water-physics advisor, 2026-10-22): a sparse fringe of 2.5–3 mm drops thrown forward
 * off the toe at `speed` × the bore's celerity c, `angle` (rad) above level, rising 0.3–1.5 m; such drops fall at
 * 7.3–8.1 m/s (`fall`; Gunn & Kinzer 1949). Thrown where the band is drawn (scale over `minScale`) once its curl has
 * landed, `rate` drops per metre of toe a second while young, `oldShare` of it once landed `young` s and more (P), from
 * `at` of its length down the face (the band's toe, its coverage half gone) at `lift` H over the water (the nose's top).
 */
export const TOE_SPRAY = {
  speed: 1.5, angle: [Math.PI / 6, Math.PI / 4] as const, fall: [7.3, 8.1] as const, rate: 2.5, oldShare: 0.3, young: 2,
  minScale: 0.5, at: 0.9, lift: 0.13,
} as const;

/**
 * A planing board's spray sheet this step (board-spray, 2026-10-29; `hullSpraySheets` in `physics/boardSpray.ts`): where
 * the water leaves the hull, as a line from (x, y, z) `length` m along (alongX, alongZ); the sheet's launch velocity,
 * m/s (world); the water it throws, kg/s; the spread of its drops' velocities, m/s; their fall speed, m/s; and the share
 * drawn as mist. Drawn only.
 */
export interface BoardSpraySheet {
  x: number;
  y: number;
  z: number;
  alongX: number;
  alongZ: number;
  length: number;
  vx: number;
  vy: number;
  vz: number;
  flux: number;
  spread: number;
  fall: number;
  mist: number;
  /**
   * The sheet as a curtain of water (spray-sheet, 2026-10-30): the hull's velocity where it leaves (world, m/s), its
   * thickness there (m), the half-angle it fans out at (rad), and how long it flies before it tears into drops (s; 0:
   * drops at once). With the curtain drawn, its drops are thrown from where it tears.
   */
  boardX: number;
  boardY: number;
  boardZ: number;
  thickness: number;
  fan: number;
  breakup: number;
  /**
   * When it first sheds drops (s, turbulent: before it tears), which side of its board it leaves (−1 its −x side, +1
   * its +x), and whose board (0 the player's, else another player's id + 1); where it tears (the tear line from (tearX,
   * tearY, tearZ), tearLength m along (tearAlongX, tearAlongZ)) and its water's velocity there (world).
   */
  onset: number;
  side: number;
  source: number;
  tearX: number;
  tearY: number;
  tearZ: number;
  tearAlongX: number;
  tearAlongZ: number;
  tearLength: number;
  tearVX: number;
  tearVY: number;
  tearVZ: number;
  /**
   * Its launch along the root (spray-rework, 2026-10-31; the water-physics advisor: the per-side mean hides the tail's
   * faster jet): the water-weighted straight-line fit of each station's launch velocity against its place along the
   * root, at the root's aft end and its fore end (world, m/s); and where along the root its water leaves on average, as a
   * share of the root from its aft end (0.5 when even).
   */
  aftVX: number;
  aftVY: number;
  aftVZ: number;
  foreVX: number;
  foreVY: number;
  foreVZ: number;
  fluxMean: number;
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
  readonly foam: ParticleSources;
  readonly lipImpacts: readonly LipImpact[];
  /**
   * Splashes drawn only (the Canyon spilling lip's touchdowns): thrown as lip impacts are, in the look's way (Classic
   * throws none from a splash-up), but kept apart from `lipImpacts`, which the sound and the reports read.
   */
  readonly drawnImpacts?: readonly LipImpact[];
  /** The roller front's toe line, drawn only (Rich; none without it): asked for once a step. */
  readonly rollerToes?: () => RollerToes | undefined;
  /** Local wind at crest height, m/s: positive onshore (+z). */
  readonly windSpeed: number;
  /** The rider's hands pulling through the water this step. */
  readonly strokes?: readonly StrokeSplash[];
  /** The boards' spray sheets this step (board-spray): the local board's, and other players' from their poses. */
  readonly boardSheets?: readonly BoardSpraySheet[];
  /** This step's spits, eruptions and foam balls from closing tubes (G9). */
  readonly spits?: readonly TubeSpit[];
  readonly eruptions?: readonly TubeEruption[];
  readonly rollers?: readonly TubeRoller[];
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
/**
 * Drawn particles per kilogram of water a board's sheet throws (board-spray; the water-physics advisor, 2026-10-29: 6–8
 * keeps a hard Compress bottom turn's fan to a few hundred live), and its drops' fall speeds either way of the sheet's.
 */
export const BOARD_SPRAY_PER_KG = 7;
const BOARD_FALL_SPREAD = 1;
/**
 * The curtain's water (spray-sheet; the water-physics advisor, 2026-10-30): a fifth to a quarter of it sheds as finer
 * drops before it tears, with more mist; the tear's drops are about 5 mm and more, falling at 9 m/s (Gunn & Kinzer),
 * where the air lets drops so large (12σ/ρ_a U² over 5 mm: up to about 12 m/s).
 */
const BOARD_SHED = 0.22;
const BOARD_SHED_MIST = 0.1;
const TEAR_FALL = 9;
const TEAR_LARGE_SPEED = 12;
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

/**
 * A plunging lip's veil (C2 step 5g, `?lipVeil=on`, opt-in; the water-physics advisor, 2026-11-14). Erinin, Liu, Wang,
 * Liu & Duncan 2023 (*JFM* 967 A36) measured **every droplet d ≥ 100 µm** crossing a plane above the crest of three
 * laboratory plungers (λ₀ = 1.18 m, H ≈ 0.09 m, still air), and found every one of them made **after** the jet lands:
 *
 * - **region I-A**, the closure of the indentation between the jet and the splash it throws, at the curl: **32 %** of
 *   the count, mean direction **81°** from horizontal; and **region I-B**, the bursting of the large bubbles entrapped
 *   at impact and the splashing over the turbulent zone behind it: **46 %** at **56°**. Both means lie 9° and 34°
 *   *downstream* of vertical, along the jet's own run. (Their region II, the foam wake's small bursting bubbles,
 *   "does not travel vertically more than a few centimetres" and is the bore spray `boreSpray` already draws.)
 * - their speed is **0.32–0.44 of the jet's impact speed** on the mean, with a tail to twice it; Mostert, Popinet &
 *   Deike 2022 (*JFM* 942 A27) find the same in DNS — most droplets at one phase speed, the fastest at three or four —
 *   and fit a skewed law. Drawn here from an exponential with that mean, which gives the mean and a tail that passes
 *   twice the impact speed about one time in two hundred. `SPLASH_UP.vertical` throws every drop at 0.6 of it: about
 *   1.5 times the measured mean, and with no tail at all.
 * - the drawn classes take their shares of the droplets' **optical area**, not of their count, because a drawn sprite
 *   stands for a patch of veil and not for one drop. Integrating Erinin's measured spectrum (N ∝ d^−2.1 below
 *   d_i = 1.14 mm, d^−5.8 above) puts **8 %** of the optical area under 0.2 mm, **57 %** in 0.2–1 mm and **35 %** over
 *   1 mm. The middle band is the veil, and the game had no class for it: `SPRAY_FALL` is 1–3 mm drops and `MIST_FALL`
 *   0.1–0.2 mm.
 */
export const LIP_VEIL = {
  /** Region I-A's share of the two regions' count (32 of 32 + 46), and the two mean directions from horizontal, rad. */
  curlShare: 32 / 78,
  curlAngle: (81 * Math.PI) / 180,
  wakeAngle: (56 * Math.PI) / 180,
  /** The spread either way of the mean direction, rad (the measured distributions are broad; this is a render value). */
  spread: Math.PI / 6,
  /** The speed law over the jet's impact speed: an exponential of this mean, floored and capped. */
  speedMean: 0.38,
  speedFloor: 0.1,
  speedMax: 2.2,
  /** How far back over the water the jet has just hit region I-B is spread, in wave heights. */
  wakeReach: 0.5,
  /** The classes by their share of the droplets' optical area: over 1 mm, under 0.2 mm, and the 0.2–1 mm veil between. */
  sprayShare: 0.35,
  mistShare: 0.1,
  /** The veil class: 0.2–1 mm drops fall at these terminal speeds (Gunn & Kinzer 1949), drawn this wide, m. */
  veilFall: { min: 0.8, max: 2.5 },
  veilSize: { min: 0.3, max: 0.55 },
} as const;

/**
 * The air that carries the veil (C2 step 5g, `?lipVeil=on`). **Provisional and calibrated, not sourced** — a
 * mechanism with its scale fitted to the owner's own photograph, and nothing more.
 *
 * Thrown drops cannot reach the veil's measured top: a 0.45 mm drop launched at even twice the jet's impact speed
 * rises 0.67 m against quadratic drag, where the owner's side-on photograph of Surf Abu Dhabi
 * (`docs/research/tube-spray-reference-2026-11-14/`) puts the veil's top **0.55–0.70 of a wave height above the
 * crest**, about 1.1–1.4 m of air over a 2 m wave. Erinin's own still-air back-tracking of their measured droplets
 * placed 40 % of 2158 of them on the smooth water ahead of the breaker, which they call nonphysical and "an
 * indication of the need for including the temporally evolving breaker-generated air flow field". So the air is the
 * carrier — and **nobody has measured that field over a plunging breaker's crest** (the wind-wave-tank work is a
 * different flow). What stands behind the numbers here is a mechanism (the peel pumps the tube's air out at about
 * A_void × V_peel, and in the wave's frame the air separates over the breaking crest) and the photograph's geometry.
 *
 * A patch of it is seeded where a jet lands, and it lifts a drop in proportion to how light the drop is: the quadratic
 * drag carries a 0.2 mm mist almost at the air's own speed, a 0.45 mm veil drop at the difference, and a millimetre
 * drop not at all, so the big drops stay ballistic without a rule saying so.
 */
export const VEIL_AIR = {
  /** The updraft at the water, as a share of √(gH): 0.9 gives 4.0 m/s on a 2 m wave, in the advisor's 3–5 m/s band. */
  speed: 0.9,
  /** Its patch's radius, in wave heights (Gaussian in the distance, cut off at twice it). */
  reach: 2,
  /**
   * It does not start until this long after the landing, s. Erinin's first droplets cross their plane 110.8 ms after
   * impact and were made 25–70 ms earlier; Froude-scaled to a 2 m wave that is 0.19–0.52 s. It is also the guard that
   * keeps the veil 1–4 m **behind** the curl's tip at a peeling 7 m/s, so it never fogs the barrel's mouth.
   */
  onset: 0.25,
  /** How long it blows, s, counted from the landing (so it lofts for `life − onset`). */
  life: 1.4,
  /**
   * How far over the landing's own water it still blows, in **the breaking wave's own height** (`waveHeight`, what
   * the lip reports, not the crest's stand over still water): it falls linearly to nothing there, so a drop stops
   * where the air no longer beats its fall speed and no class can climb a chimney. The figure is a ceiling, not the
   * veil's top — the drops stop well under it — and it was set to put the veil's body in the band the reference's
   * ratio asks for, which c2-step5g.md §5.1 measures it doing (2.40 m against 2.2–2.4 m).
   */
  lift: 1.6,
  /** A landing within this share of a patch's radius refreshes it instead of adding one, and this many are kept. */
  merge: 0.5,
  patches: 32,
} as const;
const WET = 0.05;
const WATER_DENSITY = 1025;
/**
 * Floats per particle in `particles`: x, y, z, size (m), opacity, and kind:
 * 0 spray, 1 mist, and a closing tube's whitewater (G9, drawn in Rich only):
 * 2 foam ball, 3 the spit's and eruption's spray, 4 their mist.
 */
export const SPRAY_STRIDE = 6;
/** The worker's pools: spray and mist, and a closing tube's whitewater beside them, so neither crowds the other out. */
export const SPRAY_CAPACITY = 4096;
export const WHITEWATER_CAPACITY = 1024;
/** The boards' spray has a pool of its own beside them (board-spray): the sea's spray fills its pool on busy Reef steps. */
export const BOARD_SPRAY_CAPACITY = 512;

type Kind = 0 | 1 | 2 | 3 | 4;
const SPRAY: Kind = 0;
const MIST: Kind = 1;
const FOAM_BALL: Kind = 2;
const TUBE_SPRAY: Kind = 3;
const TUBE_MIST: Kind = 4;
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
 * The Particles setting (`setLevel`) spawns a share of them into a share of
 * the pools. Visual only, with no rendering dependency, so it runs in the
 * worker beside the water; `SprayPoints` draws it.
 */
export class SprayCloud {
  /** Per live particle: x, y, z, size, opacity, kind (`SPRAY_STRIDE`), packed at the front. */
  private readonly packedParticles: Float32Array;
  private particlesDirty = false;
  /** Width follows the last update, even if a setting changes before the next read. */
  private packedMistSize = 1;
  count = 0;
  /** How many of them are a closing tube's whitewater. */
  whitewaterCount = 0;
  /** How many of them are the boards' spray, and how many the boards' sheets have spawned so far (board-spray). */
  boardCount = 0;
  boardSpawns = 0;
  /** The look the spray is drawn in: Classic's lip-impact drops are as they were before G9. */
  look: SprayLook = 'rich';
  /**
   * C2 step 5g (`?lipVeil=on`, opt-in): a plunging lip throws Erinin's two post-impact regions in three size classes
   * (`LIP_VEIL`), and the air it drives carries them (`VEIL_AIR`). Off, every landing throws the splash-up's drops as
   * before and no air blows, so the default game is untouched.
   */
  veil = false;
  /** The Particles setting (`setLevel`): High is the spray as it always was. */
  private particleLevel: ParticleLevel = 'high';
  private budget: Readonly<ParticleBudget> = PARTICLE_BUDGETS.high;
  /** The pools in use at that budget: spray and mist, and a tube's whitewater. */
  private sprayRoom: number;
  private whitewaterRoom: number;
  private boardRoom: number;
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
  /** Whether a particle is a board's spray (its own pool). */
  private readonly fromBoard: Uint8Array;
  /** A foam-ball sprite's roller, and where it sits in it: its distance from the axis, angle round it, and offset along it. */
  private readonly owner: Float64Array;
  private readonly radial: Float64Array;
  private readonly spin: Float64Array;
  private readonly lateral: Float64Array;
  private readonly random: () => number;
  /** The roller front's toe spray draws on its own stream, so every other drop's stays as it was. */
  private readonly toeRandom: () => number;
  /** So does the boards' spray (board-spray). */
  private readonly boardRandom: () => number;
  /** Scratch for `roll`: each roller's sprites, and the rollers by id. */
  private readonly held = new Map<number, number>();
  private readonly rollerById = new Map<number, TubeRoller>();
  /**
   * The veil's patches of breaker-driven air (`VEIL_AIR`), one per jet landing: where it blows from (x, z and the
   * water's own surface there), the wave's height, its speed at the water and its age. Only live with `veil` on.
   */
  private readonly airX = new Float64Array(VEIL_AIR.patches);
  private readonly airY = new Float64Array(VEIL_AIR.patches);
  private readonly airZ = new Float64Array(VEIL_AIR.patches);
  private readonly airHeight = new Float64Array(VEIL_AIR.patches);
  private readonly airSpeed = new Float64Array(VEIL_AIR.patches);
  private readonly airAge = new Float64Array(VEIL_AIR.patches);
  private airCount = 0;

  constructor(
    seed: number, readonly capacity = SPRAY_CAPACITY, readonly whitewaterCapacity = Math.round(capacity / 4), readonly boardCapacity = 0,
  ) {
    this.random = seededRandom(seed, 0x5b1a54);
    this.toeRandom = seededRandom(seed, 0x70e5f7);
    this.boardRandom = seededRandom(seed, 0xb0a5d5);
    const total = capacity + whitewaterCapacity + boardCapacity;
    const make = () => new Float64Array(total);
    this.x = make(); this.y = make(); this.z = make();
    this.vx = make(); this.vy = make(); this.vz = make();
    this.age = make(); this.life = make(); this.drag = make(); this.size = make();
    this.owner = make(); this.radial = make(); this.spin = make(); this.lateral = make();
    this.kind = new Uint8Array(total);
    this.fromBoard = new Uint8Array(total);
    this.packedParticles = new Float32Array(total * SPRAY_STRIDE);
    this.sprayRoom = capacity;
    this.whitewaterRoom = whitewaterCapacity;
    this.boardRoom = boardCapacity;
  }

  /**
   * The Particles setting (graphics): a lower level spawns a share of each source's particles into a share of the
   * pools, and draws the mist narrower. Particles already in the air live out their time.
   */
  setLevel(level: ParticleLevel): void {
    this.particleLevel = level;
    this.budget = particleBudget(level);
    this.sprayRoom = poolSize(this.capacity, this.budget);
    this.whitewaterRoom = poolSize(this.whitewaterCapacity, this.budget);
    this.boardRoom = poolSize(this.boardCapacity, this.budget);
  }

  get level(): ParticleLevel {
    return this.particleLevel;
  }

  /** Packed presentation data is needed only when a snapshot or tool reads it. */
  get particles(): Float32Array {
    if (this.particlesDirty) {
      this.pack();
      this.particlesDirty = false;
    }
    return this.packedParticles;
  }

  /** Whether there is room for another particle of spray and mist, or of a tube's whitewater. */
  private room(whitewater: boolean): boolean {
    return whitewater ? this.whitewaterCount < this.whitewaterRoom : this.count - this.whitewaterCount - this.boardCount < this.sprayRoom;
  }

  update(scene: SprayScene, dt: number): void {
    if (!(dt > 0)) return;
    if (this.veil) this.ageAir(dt);
    this.fly(scene, dt);
    this.roll(scene.rollers ?? [], dt);
    for (const spit of scene.spits ?? []) {
      this.tubeBurst(spit.x, spit.y, spit.z, spit.dirX * spit.speed, 0, spit.dirZ * spit.speed, spit.airRate * dt, SPIT_MIST);
    }
    for (const eruption of scene.eruptions ?? []) {
      this.tubeBurst(eruption.x, eruption.y, eruption.z, 0, eruption.speed, 0, eruption.airRate * dt, ERUPTION_MIST);
    }
    for (const impact of scene.lipImpacts) this.splash(scene, impact);
    for (const impact of scene.drawnImpacts ?? []) this.splash(scene, impact);
    for (const stroke of scene.strokes ?? []) this.strokeSplash(scene, stroke);
    for (const sheet of scene.boardSheets ?? []) this.boardSpray(sheet, dt);
    this.boreSpray(scene, dt);
    this.toeSpray(scene, dt);
    this.feather(scene, dt);
    this.packedMistSize = this.budget.mistSize;
    this.particlesDirty = true;
  }

  clear(): void {
    this.count = 0;
    this.whitewaterCount = 0;
    this.boardCount = 0;
    this.airCount = 0;
    this.particlesDirty = false;
  }

  /** The veil's air (`VEIL_AIR`): every patch a step older, and the ones past their life dropped. */
  private ageAir(dt: number): void {
    for (let p = 0; p < this.airCount; p += 1) {
      this.airAge[p] += dt;
      if (this.airAge[p] <= VEIL_AIR.life) continue;
      this.airCount -= 1;
      const last = this.airCount;
      this.airX[p] = this.airX[last];
      this.airY[p] = this.airY[last];
      this.airZ[p] = this.airZ[last];
      this.airHeight[p] = this.airHeight[last];
      this.airSpeed[p] = this.airSpeed[last];
      this.airAge[p] = this.airAge[last];
      p -= 1;
    }
  }

  /**
   * A patch of the veil's air where a jet has landed (`VEIL_AIR`): a landing inside a live patch refreshes it, so a
   * peeling crest keeps one patch moving along it rather than a hundred stacked on it. Past the cap the oldest goes.
   */
  private seedAir(impact: LipImpact, surface: number): void {
    const height = impact.height && impact.height > 0 ? impact.height : 1;
    const reach = VEIL_AIR.merge * VEIL_AIR.reach * height;
    for (let p = 0; p < this.airCount; p += 1) {
      const dx = impact.x - this.airX[p];
      const dz = impact.z - this.airZ[p];
      if (dx * dx + dz * dz < reach * reach) {
        this.airAge[p] = 0;
        return;
      }
    }
    let p = this.airCount;
    if (p < VEIL_AIR.patches) this.airCount += 1;
    else {
      p = 0;
      for (let q = 1; q < this.airCount; q += 1) if (this.airAge[q] > this.airAge[p]) p = q;
    }
    this.airX[p] = impact.x;
    this.airY[p] = surface;
    this.airZ[p] = impact.z;
    this.airHeight[p] = height;
    this.airSpeed[p] = VEIL_AIR.speed * Math.sqrt(GRAVITY * height);
    this.airAge[p] = 0;
  }

  /**
   * The veil's updraft at a point, m/s (`VEIL_AIR`): the strongest patch covering it, Gaussian in the distance and
   * falling linearly to nothing `lift` wave heights over the water it was seeded on. The strongest, not the sum, so a
   * crest with a dozen landings on it blows no harder than one.
   */
  private airAt(x: number, y: number, z: number): number {
    let best = 0;
    for (let p = 0; p < this.airCount; p += 1) {
      if (this.airAge[p] < VEIL_AIR.onset) continue;
      const height = this.airHeight[p];
      const over = y - this.airY[p];
      const lift = VEIL_AIR.lift * height;
      if (over > lift) continue;
      const reach = VEIL_AIR.reach * height;
      const dx = x - this.airX[p];
      const dz = z - this.airZ[p];
      const r2 = (dx * dx + dz * dz) / (reach * reach);
      if (r2 > 4) continue;
      const w = this.airSpeed[p] * Math.exp(-r2) * (over <= 0 ? 1 : 1 - over / lift);
      if (w > best) best = w;
    }
    return best;
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
      // Quadratic drag toward the air (implicit in the drag's size, so light mist cannot overshoot it): the wind along
      // z as ever, and with `?lipVeil=on` the breaker's own updraft where a lip has just landed (`VEIL_AIR`). A drop
      // follows it in proportion to how light it is, so the millimetre drops stay ballistic on their own.
      const lift = this.veil ? this.airAt(this.x[k], this.y[k], this.z[k]) : 0;
      const rx = this.vx[k];
      const ry = this.vy[k] - lift;
      const rz = this.vz[k] - windSpeed;
      const speed = Math.hypot(rx, ry, rz);
      const damping = 1 / (1 + dt * this.drag[k] * speed);
      this.vx[k] = rx * damping;
      this.vy[k] = ry * damping - GRAVITY * dt + lift;
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
    if (this.veil) {
      this.veilSplash(scene, impact);
      return;
    }
    if (this.look === 'classic') {
      this.classicSplash(scene, impact);
      return;
    }
    const speed = Math.hypot(impact.vx, impact.vy, impact.vz);
    const energy = 0.5 * WATER_DENSITY * impact.volume * speed * speed;
    const expected = energy * SPRAY_PER_JOULE * this.budget.spawn;
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
      );
    }
  }

  /**
   * A plunging lip's veil (C2 step 5g, `?lipVeil=on`): the drops of Erinin's two post-impact regions, at their
   * measured shares and mean directions, with the measured speed law and in the three size classes (`LIP_VEIL`), all
   * of them over the water the jet has just hit. A jet landing also seeds the patch of air that carries them
   * (`VEIL_AIR`); a splash-up's own landing throws drops but seeds no air, since the air comes from the jet.
   *
   * It keeps the count law it replaces (`SPRAY_PER_JOULE` per joule of the landing's kinetic energy): the advisor's
   * reading of the reference photograph is that the veil there is optically thin, so what the game was missing was
   * the height, the fall speeds and the opacity, not the number of sprites. The veil's drops do nonetheless fill the
   * spray pool, because the air holds them up several times as long (c2-step5g.md §5.4). That is bounded by the pool
   * itself, and `update` throws a landing's drops **before** `boreSpray` fills what is left, so what a full pool
   * costs is the strewn bore haze and not the break's own spray.
   */
  private veilSplash(scene: SprayScene, impact: LipImpact): void {
    const speed = Math.hypot(impact.vx, impact.vy, impact.vz);
    if (!(speed > 0)) return;
    const energy = 0.5 * WATER_DENSITY * impact.volume * speed * speed;
    const expected = energy * SPRAY_PER_JOULE * this.budget.spawn;
    let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
    const surface = impact.y ?? this.waterAt(scene, impact);
    if ((impact.kind ?? 0) === 0) this.seedAir(impact, surface);
    // Downstream is along the jet's own horizontal run; the regions lean that way and region I-B lies back along it.
    const run = Math.hypot(impact.vx, impact.vz);
    const runX = run > 0 ? impact.vx / run : 0;
    const runZ = run > 0 ? impact.vz / run : 0;
    const height = impact.height && impact.height > 0 ? impact.height : 1;
    for (; spawns > 0 && this.room(false); spawns -= 1) {
      const curl = this.random() < LIP_VEIL.curlShare;
      const angle = (curl ? LIP_VEIL.curlAngle : LIP_VEIL.wakeAngle) + (this.random() - 0.5) * LIP_VEIL.spread;
      // An exponential of the measured mean: the mean is 0.38 of the impact's speed and about one drop in two
      // hundred passes twice it, which is the measured tail.
      const launch = speed * Math.min(LIP_VEIL.speedMax, Math.max(LIP_VEIL.speedFloor, -LIP_VEIL.speedMean * Math.log(1 - this.random())));
      const forward = launch * Math.cos(angle);
      const up = launch * Math.sin(angle);
      // Region I-A sits at the curl; region I-B is spread back over the turbulent zone the jet has just ploughed.
      const back = curl ? 0 : LIP_VEIL.wakeReach * height * this.random();
      const across = (this.random() - 0.5) * 0.4 * height;
      const k = this.count;
      const pick = this.random();
      this.spawn(
        pick < LIP_VEIL.sprayShare ? SPRAY : MIST,
        impact.x - runX * back - runZ * across, surface + 0.05, impact.z - runZ * back + runX * across,
        runX * forward, up, runZ * forward,
      );
      // The 0.2–1 mm band, which carries most of the veil's optical area and which the game had no class for: drawn
      // as mist is, since that is the soft translucent sprite, but falling at its own drops' speed.
      if (pick >= LIP_VEIL.sprayShare + LIP_VEIL.mistShare) {
        const fall = this.between(LIP_VEIL.veilFall);
        this.drag[k] = GRAVITY / (fall * fall);
        this.size[k] = this.between(LIP_VEIL.veilSize);
      }
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
    const expected = energy * SPRAY_PER_JOULE * this.budget.spawn;
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
    const expected = push * stroke.speed * SPRAY_PER_JOULE * this.budget.spawn;
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
      );
    }
  }

  /**
   * A board's spray sheet (board-spray, 2026-10-29): BOARD_SPRAY_PER_KG drawn particles per kilogram of the water it
   * throws, from along its root, at its launch velocity a fifth either way and its spread, BOARD_MIST of them mist. On
   * its own random stream, so every other source's drops stay as they were.
   */
  private boardSpray(sheet: BoardSpraySheet, dt: number): void {
    if (!(sheet.flux > 0)) return;
    const random = this.boardRandom;
    const expected = sheet.flux * dt * BOARD_SPRAY_PER_KG * this.budget.spawn;
    let spawns = Math.floor(expected) + (random() < expected - Math.floor(expected) ? 1 : 0);
    const torn = sheet.breakup > 0;
    for (; spawns > 0 && this.boardCount < this.boardRoom; spawns -= 1) {
      const across = random();
      const pace = 0.8 + 0.4 * random();
      const k = this.count;
      if (!torn) {
        // As drops at once, from along the root (board-spray; the spray-sheet's `?spraySheet=off`).
        this.spawn(
          random() < sheet.mist ? MIST : SPRAY,
          sheet.x + sheet.alongX * across * sheet.length, sheet.y, sheet.z + sheet.alongZ * across * sheet.length,
          sheet.vx * pace + (random() - 0.5) * 2 * sheet.spread, sheet.vy * pace + (random() - 0.5) * 2 * sheet.spread,
          sheet.vz * pace + (random() - 0.5) * 2 * sheet.spread,
          random,
        );
        this.boardDrops(k, sheet.fall, random);
        continue;
      }
      // The curtain's water (spray-sheet): BOARD_SHED of it shed as finer drops along the sheet between its first drops
      // (`onset`) and its tear, the rest from the ragged tear line, a sixth of the flight either side of it.
      const rootX = sheet.x + sheet.alongX * across * sheet.length;
      const rootZ = sheet.z + sheet.alongZ * across * sheet.length;
      const tearX = sheet.tearX + sheet.tearAlongX * across * sheet.tearLength;
      const tearZ = sheet.tearZ + sheet.tearAlongZ * across * sheet.tearLength;
      if (random() < BOARD_SHED) {
        const age = sheet.onset + (sheet.breakup - sheet.onset) * random();
        const f = age / sheet.breakup;
        // On the chord from the root to the tear, lifted by gravity's bulge between them.
        const bulge = 0.5 * GRAVITY * age * (sheet.breakup - age);
        this.spawn(
          random() < Math.min(1, sheet.mist + BOARD_SHED_MIST) ? MIST : SPRAY,
          rootX + (tearX - rootX) * f, sheet.y + (sheet.tearY - sheet.y) * f + bulge, rootZ + (tearZ - rootZ) * f,
          (sheet.vx + (sheet.tearVX - sheet.vx) * f) * pace + (random() - 0.5) * 2 * sheet.spread,
          (sheet.vy + (sheet.tearVY - sheet.vy) * f) * pace + (random() - 0.5) * 2 * sheet.spread,
          (sheet.vz + (sheet.tearVZ - sheet.vz) * f) * pace + (random() - 0.5) * 2 * sheet.spread,
          random,
        );
        this.boardDrops(k, sheet.fall - 1, random);
        continue;
      }
      const ragged = (random() - 0.5) * 0.3 * sheet.breakup;
      this.spawn(
        random() < sheet.mist ? MIST : SPRAY,
        tearX + sheet.tearVX * ragged, sheet.tearY + sheet.tearVY * ragged, tearZ + sheet.tearVZ * ragged,
        sheet.tearVX * pace + (random() - 0.5) * 2 * sheet.spread, sheet.tearVY * pace + (random() - 0.5) * 2 * sheet.spread,
        sheet.tearVZ * pace + (random() - 0.5) * 2 * sheet.spread,
        random,
      );
      // The tear's drops are the bigger: about 5 mm and more, falling at 9 m/s, where the air lets them be so large.
      this.boardDrops(k, Math.hypot(sheet.tearVX, sheet.tearVY, sheet.tearVZ) <= TEAR_LARGE_SPEED ? TEAR_FALL : sheet.fall, random);
    }
  }

  /** A board's drop just spawned at `k`: its own pool, and its fall speed (`fall` a metre either way; the mist as mist). */
  private boardDrops(k: number, fall: number, random: () => number): void {
    if (this.kind[k] === SPRAY) {
      const speed = Math.max(1, fall + (random() - 0.5) * 2 * BOARD_FALL_SPREAD);
      this.drag[k] = GRAVITY / (speed * speed);
    }
    this.fromBoard[k] = 1;
    this.boardCount += 1;
    this.boardSpawns += 1;
  }

  /**
   * Spray and mist a closing tube's air blows out (G9): the spit out of its
   * mouth, or an eruption up through the lip. SPRAY_PER_AIR particles per m³
   * of the air, carried at its velocity with a fifth either way of variety.
   */
  private tubeBurst(x: number, y: number, z: number, vx: number, vy: number, vz: number, air: number, mistShare: number): void {
    const expected = air * SPRAY_PER_AIR * this.budget.spawn;
    let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
    const spread = 0.1 * Math.hypot(vx, vy, vz);
    for (; spawns > 0 && this.room(true); spawns -= 1) {
      const pace = 0.8 + 0.4 * this.random();
      this.spawn(
        this.random() < mistShare ? TUBE_MIST : TUBE_SPRAY,
        x + (this.random() - 0.5) * 0.3, y + (this.random() - 0.5) * 0.3, z + (this.random() - 0.5) * 0.3,
        vx * pace + (this.random() - 0.5) * spread, vy * pace + (this.random() - 0.5) * spread, vz * pace + (this.random() - 0.5) * spread,
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
      const wanted = Math.round(((roller.area * roller.width) / FOAM_BALL_VOLUME) * this.budget.foamBall);
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
    const cells = foam.sourceCells;
    const count = cells ? (foam.sourceCount ?? cells.length) : source.length;
    let cursor = cells ? firstSourceCell(cells, count, start) : start;
    for (let n = 0; n < count && this.room(false); n += 1) {
      const i = cells ? cells[cursor] : cursor;
      if (++cursor === count) cursor = 0;
      if (!(source[i] > 0) || h[i] <= WET) continue;
      const row = Math.floor(i / nx);
      const expected = source[i] * dt * dx * dz[row] * SPRAY_PER_FOAM * this.budget.spawn;
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
        );
      }
    }
  }

  /**
   * The roller front's toe spray (`TOE_SPRAY`; Rich only, as the front is drawn): drops thrown forward off each drawn
   * band's toe line, along its water's velocity c·n̂ at 1.5 c and 30–45° up, a sparse fringe. Drawn only.
   */
  private toeSpray(scene: SprayScene, dt: number): void {
    if (this.look === 'classic') return;
    const toes = scene.rollerToes?.();
    if (!toes) return;
    const { table, look, columns, column0, width } = toes;
    const { solver } = scene;
    const random = this.toeRandom;
    for (let slot = 0; slot < ROLLER_SLOTS && this.room(false); slot += 1) {
      for (let column = 0; column < columns && this.room(false); column += 1) {
        const o = (slot * columns + column) * ROLLER_STRIDE;
        const g = table[o + ROLLER_FIELD.scale];
        if (!(g >= TOE_SPRAY.minScale)) continue;
        const l = (slot * columns + column) * BAND_LOOK_STRIDE;
        const since = look[l + BAND_LOOK_FIELD.since];
        if (!(since >= 0)) continue;
        const fx = table[o + ROLLER_FIELD.flowX];
        const fz = table[o + ROLLER_FIELD.flowZ];
        const c = Math.hypot(fx, fz);
        if (!(c > 0.5)) continue;
        const young = since < TOE_SPRAY.young ? 1 : TOE_SPRAY.oldShare;
        const expected = TOE_SPRAY.rate * young * g * width * dt * this.budget.spawn;
        let spawns = Math.floor(expected) + (random() < expected - Math.floor(expected) ? 1 : 0);
        if (spawns === 0) continue;
        const crest = table[o + ROLLER_FIELD.crest];
        const length = table[o + ROLLER_FIELD.length];
        const roughness = table[o + ROLLER_FIELD.roughness];
        const height = look[l + BAND_LOOK_FIELD.height];
        for (; spawns > 0 && this.room(false); spawns -= 1) {
          const x = column0 + (column + random() - 0.5) * width;
          const z = crest + TOE_SPRAY.at * length + (random() - 0.5) * roughness;
          const cell = solver.cellIndex(x, z);
          if (!(solver.h[cell] > WET)) continue;
          const angle = TOE_SPRAY.angle[0] + (TOE_SPRAY.angle[1] - TOE_SPRAY.angle[0]) * random();
          const speed = TOE_SPRAY.speed * c * (0.9 + 0.2 * random());
          const across = (random() - 0.5) * 0.15 * speed;
          const forward = speed * Math.cos(angle);
          const k = this.count;
          this.spawn(SPRAY, x, solver.h[cell] + solver.bed[cell] + TOE_SPRAY.lift * height, z,
            (fx / c) * forward - (fz / c) * across, speed * Math.sin(angle), (fz / c) * forward + (fx / c) * across);
          const fall = TOE_SPRAY.fall[0] + (TOE_SPRAY.fall[1] - TOE_SPRAY.fall[0]) * random();
          this.drag[k] = GRAVITY / (fall * fall);
        }
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
        const expected = FEATHER_RATE * excess * excess * dx * dz[row] * dt * this.budget.spawn;
        let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
        for (; spawns > 0 && this.room(false); spawns -= 1) {
          this.spawn(
            MIST, xCenters[column] + (this.random() - 0.5) * dx, depth + bed[i] + 0.1, zCenters[row],
            (this.random() - 0.5) * 0.5, 0.5 + this.random(), windSpeed * (0.3 + 0.4 * this.random()),
          );
        }
      }
    }
  }

  private spawn(kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number, random = this.random): void {
    const k = this.count;
    this.x[k] = x;
    this.y[k] = y;
    this.z[k] = z;
    this.vx[k] = vx;
    this.vy[k] = vy;
    this.vz[k] = vz;
    this.age[k] = 0;
    this.kind[k] = kind;
    this.fromBoard[k] = 0;
    this.count += 1;
    if (isWhitewater(kind)) this.whitewaterCount += 1;
    if (kind === FOAM_BALL) {
      this.drag[k] = 0;
      this.life[k] = FOAM_BALL_LINGER;
      this.size[k] = this.between(FOAM_BALL_SIZE, random);
      return;
    }
    const mist = isMist(kind);
    const fall = mist ? this.between(MIST_FALL, random) : this.between(SPRAY_FALL, random);
    this.drag[k] = GRAVITY / (fall * fall);
    this.life[k] = (mist ? MIST_LIFE : SPRAY_LIFE) * (0.6 + 0.4 * random());
    this.size[k] = mist ? 0.35 + 0.45 * random() : 0.06 + 0.08 * random();
  }

  private remove(k: number): void {
    if (isWhitewater(this.kind[k])) this.whitewaterCount -= 1;
    if (this.fromBoard[k]) this.boardCount -= 1;
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
    this.fromBoard[k] = this.fromBoard[last];
    this.owner[k] = this.owner[last];
    this.radial[k] = this.radial[last];
    this.spin[k] = this.spin[last];
    this.lateral[k] = this.lateral[last];
  }

  private pack(): void {
    const mistSize = this.packedMistSize;
    const particles = this.packedParticles;
    for (let k = 0; k < this.count; k += 1) {
      const o = k * SPRAY_STRIDE;
      const t = this.age[k] / this.life[k];
      const mist = isMist(this.kind[k]);
      particles[o] = this.x[k];
      particles[o + 1] = this.y[k];
      particles[o + 2] = this.z[k];
      particles[o + 3] = this.size[k] * (mist ? (1 + t) * mistSize : 1);
      // A foam ball holds until its roller is gone, then fades over the time it lingers.
      particles[o + 4] = this.kind[k] === FOAM_BALL
        ? 0.9 * Math.min(1, (this.life[k] - this.age[k]) / FOAM_BALL_LINGER)
        : (mist ? 0.25 : 0.8) * (1 - t * t);
      particles[o + 5] = this.kind[k];
    }
  }

  private between(range: { min: number; max: number }, random = this.random): number {
    return range.min + (range.max - range.min) * random();
  }

  /** The water's surface in the cell a lip impact lands in, m. */
  private waterAt(scene: SprayScene, impact: LipImpact): number {
    const cell = scene.solver.cellIndex(impact.x, impact.z);
    return scene.solver.h[cell] + scene.solver.bed[cell];
  }
}
