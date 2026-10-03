import { GRAVITY } from './dispersion';
import { seededRandom } from './random';
import { SPLASH_UP, type TubeEruption, type TubeRoller, type TubeSpit } from './PlungingLip';

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
/** The worker's pools: spray and mist, and a closing tube's whitewater beside them, so neither crowds the other out. */
export const SPRAY_CAPACITY = 4096;
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
  /** Per particle, how long the air takes to take its drops' speeds, v_t / g, s (`DISPERSION`). */
  private readonly settle: Float64Array;
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
    this.particles = new Float32Array(total * SPRAY_STRIDE);
  }

  /** Whether there is room for another particle of spray and mist, or of a tube's whitewater. */
  private room(whitewater: boolean): boolean {
    return whitewater ? this.whitewaterCount < this.whitewaterCapacity : this.count - this.whitewaterCount < this.capacity;
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
    this.feather(scene, dt);
    this.pack();
  }

  clear(): void {
    this.count = 0;
    this.whitewaterCount = 0;
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
      // Quadratic drag toward the wind (implicit in the drag's size, so light mist cannot overshoot it).
      const rx = this.vx[k];
      const ry = this.vy[k];
      const rz = this.vz[k] - windSpeed;
      const speed = Math.hypot(rx, ry, rz);
      const damping = 1 / (1 + dt * this.drag[k] * speed);
      this.vx[k] = rx * damping;
      this.vy[k] = ry * damping - GRAVITY * dt;
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
   * A particle of `kind`, launched with its emitter's `spread` of speeds, m/s (how its cluster widens, `DISPERSION`),
   * its drops the water share `water` of its volume (`SPRAY_WATER`, mist a fraction of it).
   */
  private spawn(kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number, spread = 0, water = 0): void {
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
    this.owner[k] = this.owner[last];
    this.radial[k] = this.radial[last];
    this.spin[k] = this.spin[last];
    this.lateral[k] = this.lateral[last];
  }

  private pack(): void {
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
      particles[o] = this.x[k];
      particles[o + 1] = this.y[k];
      particles[o + 2] = this.z[k];
      // Classic draws mist growing to twice its width, its spray and mist fading as they age; a foam ball holds until its
      // roller is gone, then fades over the time it lingers (Classic draws none, and gave it the 0.9 it always had; while
      // it holds, Rich draws it as opaque as its own optical depth makes it, `foamBallDepth`).
      const lingering = Math.min(1, (this.life[k] - this.age[k]) / FOAM_BALL_LINGER);
      particles[o + 3] = this.size[k] * (mist ? 1 + t : 1);
      particles[o + 4] = ball ? 0.9 * lingering : (mist ? 0.25 : 0.8) * (1 - t * t);
      particles[o + 5] = this.kind[k];
      particles[o + 6] = this.vx[k] * this.streak[k];
      particles[o + 7] = this.vy[k] * this.streak[k];
      particles[o + 8] = this.vz[k] * this.streak[k];
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
