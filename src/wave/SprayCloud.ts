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
  /** A swept barrel's open slices, where their crests are drawn (Padang Padang, Part B): the offshore veil comes off these. */
  readonly lipCrests?: LipCrests;
}

/** Floats per drawn crest in `LipCrests`: its apex's x, y and z, and the metres of crest it stands for. */
export const LIP_CREST_STRIDE = 4;

/** A swept barrel's open slices, as their drawn crests: `count` records of `LIP_CREST_STRIDE` floats in `data`. */
export interface LipCrests {
  data: Float32Array;
  count: number;
}

export function createLipCrests(capacity = 1024): LipCrests {
  return { data: new Float32Array(capacity * LIP_CREST_STRIDE), count: 0 };
}

/**
 * The drawn crests of a swept barrel's open slices (phase open, weight at least a half: the curl the page draws), into
 * `out`: where each slice's crest apex stands in the world and the crest it stands for, half the way to its neighbours
 * along its front. As many as fit.
 */
export function writeLipCrests(loft: Pick<LoftResult, 'positions' | 'sliceCount' | 'slicePhase' | 'sliceWeight' | 'sliceFront' | 'sliceSigma'>, out: LipCrests): LipCrests {
  const capacity = Math.floor(out.data.length / LIP_CREST_STRIDE);
  const apex = LOFT.extensionSamples + LANDMARK.crest;
  let count = 0;
  for (let s = 0; s < loft.sliceCount && count < capacity; s += 1) {
    if (loft.slicePhase[s] !== 1 || !(loft.sliceWeight[s] >= 0.5)) continue;
    const here = loft.sliceSigma[s];
    const before = s > 0 && loft.sliceFront[s - 1] === loft.sliceFront[s] ? loft.sliceSigma[s - 1] : here;
    const after = s + 1 < loft.sliceCount && loft.sliceFront[s + 1] === loft.sliceFront[s] ? loft.sliceSigma[s + 1] : here;
    const reach = Math.abs(after - before) / (before === here || after === here ? 1 : 2);
    const v = 3 * (s * LOFT_SAMPLES + apex);
    const o = count * LIP_CREST_STRIDE;
    out.data[o] = loft.positions[v];
    out.data[o + 1] = loft.positions[v + 1];
    out.data[o + 2] = loft.positions[v + 2];
    out.data[o + 3] = Math.min(2, Math.max(0.1, reach));
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
 * The Rich offshore veil (decided 2026-09-29, item 4; docs/research/water-physics/notes/round4-spray-mist/spray-mist.md
 * §2c): spume is torn off a crest once the wind relative to it passes 7–11 m/s (Veron 2015; Troitskaya et al. 2017), the
 * offshore wind plus the crest's own speed √(g d), which a surf break's waves bring (Veron: "the phase speed of the
 * wave may be sufficient"). Its strength rises through that range, and nothing comes off below it.
 */
export const VEIL_ONSET = { low: 7, high: 11 } as const;
/** The veil's drops are 0.1 mm in radius, the spume's peak (Veron 2015). */
export const VEIL_RADIUS = 1e-4;
/**
 * The water the veil sheds, in clusters of mist's water (`OPTICS`) a metre of crest sheds a second at 9 m/s of relative
 * wind were its strength 1, and the square law on the wind about it, as feathering had. The amount is unmeasured at a
 * surf break: provisional, set so that at Padang Padang's wind over a medium swell the veil reads as a haze over the
 * crest, not a cloud.
 */
const VEIL_RATE = 4;
/**
 * Each cluster of that water is cut into this many veil particles. A cluster of mist is a puff (τ about 2 at its
 * centre); a veil is a haze, so its water is spread over many faint particles that overlap: finely along the drawn lip,
 * which the eye is next to (a particle off half the open slices every step), and in three on the solver's crests, which
 * are far off. The same water per metre of crest either way [provisional, set by eye on the water sheet].
 */
export const VEIL_SPLIT = { lip: 30, crest: 3 } as const;
/**
 * The veil has a room of its own in the spray pool, so that it neither breathes with the impacts nor crowds them out: at
 * most this share of the pool is veil, however the impacts are doing, and an impact's spray keeps the rest (four fifths
 * of the decided 16k, over three times the pool it had). The solver's crests take no more than the second share of it,
 * so the drawn lip, which the player is beside, always has room. It eases off over the last `VEIL_EASE` of its room, so it
 * thins evenly along a crest instead of leaving the last cells the loop reaches bare [provisional].
 */
const VEIL_POOL = 0.2;
const VEIL_POOL_CRESTS = 0.1;
const VEIL_EASE = 0.25;
/**
 * The air the wind drives up the front of a crest lifts the veil: its updraft is this share of the relative wind (the
 * face's slope, about 0.45) and dies off in this long, s, as the flow separates at the crest and streams back
 * (Feddersen et al. 2024's flow pattern; the updraft itself is inferred) [provisional].
 */
const VEIL_LIFT = 0.45;
const VEIL_LIFT_TIME = 0.7;
/** Solver crest cells within this many metres of a drawn lip crest leave the veil to it. */
const VEIL_COVER = 3;

/** The wind relative to a crest over `depth` of water, m/s, positive when the air flows seaward past it: the offshore wind plus the crest's own speed √(g d). */
export function relativeWind(windSpeed: number, depth: number): number {
  return -windSpeed + Math.sqrt(GRAVITY * Math.max(0, depth));
}

/** How much of the veil's strength a relative wind has, 0–1: none under 7 m/s, all from 11. */
export function veilStrength(relative: number): number {
  const t = Math.min(1, Math.max(0, (relative - VEIL_ONSET.low) / (VEIL_ONSET.high - VEIL_ONSET.low)));
  return t * t * (3 - 2 * t);
}

/** Clusters of mist's water a metre of crest sheds as veil a second at this relative wind: its strength times the square law on the wind, zero under the onset. */
export function veilRate(relative: number): number {
  return VEIL_RATE * veilStrength(relative) * (relative / 9) ** 2;
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
 * 2 foam ball, 3 the spit's and eruption's spray, 4 their mist. Then, for the
 * Rich look, appended after the kind so every older reader keeps its offsets
 * (written only while the cloud's `look` is Rich): the particle's velocity
 * (m/s), which streaks it, and `tau`, the optical depth across its cluster's
 * centre, which sets its opacity and whiteness.
 */
export const SPRAY_STRIDE = 10;
/**
 * The worker's pools: spray and mist, and a closing tube's whitewater beside them, so neither crowds the other out. The
 * spray pool is the decided 16k (2026-09-29, spray-and-mist.md: the 4,096 it was is full a fifth of the Reef's steps and
 * clips its biggest impacts): the Rich look uses all of it, Classic only the 4,096 it always had.
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
 * The law of spray drop sizes (Erinin et al. 2023, fitted to a plunging breaker's splash;
 * docs/research/water-physics/notes/round4-spray-mist/spray-mist.md §2a): the count of drops falls
 * as d^-2 below the knee and d^-6 above it, which sits at 0.8–1.5 mm.
 */
export const DROP_LAW = { knee: 1e-3, below: -2, above: -6 } as const;

/**
 * A representative drop diameter, m, for a cluster of spray: a drop picked by the water it holds, not by count. A
 * cluster's optical depth is set by its water and its drops' Sauter radius (τ = 1.5 w / r₃₂, Bohren 1987), and a
 * cluster of equal water drawn from the law by volume weight, d³ × d^-2 = d below the knee and d³ × d^-6 = d^-3 above
 * it, has exactly that mean extinction. `u` in [0, 1) walks the volume-weighted distribution between `smallest` and
 * `largest`.
 */
export function dropDiameter(u: number, smallest: number, largest: number): number {
  const knee = DROP_LAW.knee;
  // The volume weight is d below the knee and, to join it there, knee⁴ · d^-3 above: their integrals are d²/2 and knee⁴ · (−d^-2/2).
  const below = smallest < knee ? (Math.min(largest, knee) ** 2 - smallest ** 2) / 2 : 0;
  const start = Math.max(smallest, knee);
  const above = largest > knee ? (knee ** 4 * (start ** -2 - largest ** -2)) / 2 : 0;
  const target = u * (below + above);
  if (target < below) return Math.sqrt(smallest ** 2 + 2 * target);
  return (start ** -2 - (2 * (target - below)) / knee ** 4) ** -0.5;
}

/** The optical depth, across a cluster's centre, of drops of radius `radius` holding a water path `water` (a depth, m): Bohren 1987, τ = 1.5 w / r. */
export function opticalDepth(water: number, radius: number): number {
  return (1.5 * water) / radius;
}

/**
 * What each kind of drawn particle holds, for its optical depth: its drops' diameters, m, by the law of drop sizes
 * between `smallest` and `largest` (splash drops 0.3–3 mm, Erinin et al.; spume 0.1–0.5 mm, its peak a radius of
 * 0.1 mm, Veron 2015; a spit's spray in between), and `liquid`, the water share of its cluster's volume at birth, so
 * that the water path across its centre is `liquid` times its width. Render values, provisional: a splash cluster
 * starts at 1 % (Chanson et al. 2002 measured under 2 % in a splash), dense enough that an impact's clusters read white
 * together (τ of a few each), and thins to see-through (τ near 1) as it spreads and its drops fall out. Mist starts a
 * fortieth as dense, in clusters five times as wide: a veil, τ about a half at its densest.
 */
const OPTICS = [
  { smallest: 0.3e-3, largest: 3e-3, liquid: 1e-2 },
  { smallest: 0.1e-3, largest: 0.5e-3, liquid: 2.5e-4 },
  { smallest: 1e-3, largest: 1e-3, liquid: 0 },
  { smallest: 0.1e-3, largest: 0.6e-3, liquid: 4e-3 },
  { smallest: 0.1e-3, largest: 0.4e-3, liquid: 3e-4 },
] as const;
/** A cluster of spray spreads as it flies, the Rich look drawing it this much wider by the end of its life (mist already does, 1 + t) [provisional]. */
const SPRAY_SPREAD = 1;
/**
 * A cluster's water tears into drops over this time, s: clear when young, as a sheet or ligament is until it
 * fragments, then white (Surf's Up went from "clear refractive water to a white aerated appearance", SIGGRAPH 2007
 * course notes) [provisional].
 */
const BREAKUP = 0.15;

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
  /** How many are the offshore veil, which has a room of its own in the pool (`VEIL_POOL`). */
  veilCount = 0;
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
  /** Per particle, its drops' radius, m, and its cluster's water path across the centre at birth, m (`OPTICS`). */
  private readonly radius: Float64Array;
  private readonly water: Float64Array;
  /** Per veil particle, the updraft the wind drives up the crest's face carries it with at birth, m/s (0 for every other). */
  private readonly lift: Float64Array;
  /** A foam-ball sprite's roller, and where it sits in it: its distance from the axis, angle round it, and offset along it. */
  private readonly owner: Float64Array;
  private readonly radial: Float64Array;
  private readonly spin: Float64Array;
  private readonly lateral: Float64Array;
  private readonly random: () => number;
  /** A stream of its own for the optics (drop sizes, water), so the particles' flight is the same whatever is drawn of them. */
  private readonly optical: () => number;
  /** Scratch for `roll`: each roller's sprites, and the rollers by id. */
  private readonly held = new Map<number, number>();
  private readonly rollerById = new Map<number, TubeRoller>();
  /** Scratch for `veil`: the coarse cells a drawn lip crest covers, so the solver's crest cells there leave the veil to it. */
  private readonly veilCover = new Set<number>();

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
    this.radius = make(); this.water = make(); this.lift = make();
    this.particles = new Float32Array(total * SPRAY_STRIDE);
  }

  /** Whether there is room for another particle of spray and mist, or of a tube's whitewater. */
  private room(whitewater: boolean): boolean {
    if (whitewater) return this.whitewaterCount < this.whitewaterCapacity;
    return this.count - this.whitewaterCount < (this.look === 'classic' ? Math.min(this.capacity, CLASSIC_SPRAY_CAPACITY) : this.capacity);
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
    this.veilCount = 0;
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
      // A veil particle rides the air up the crest's face: drag is against that air, which rises at its updraft.
      const up = this.lift[k] > 0 ? this.lift[k] * Math.exp(-this.age[k] / VEIL_LIFT_TIME) : 0;
      const ry = up > 0 ? this.vy[k] - up : this.vy[k];
      const rz = this.vz[k] - windSpeed;
      const speed = Math.hypot(rx, ry, rz);
      const damping = 1 / (1 + dt * this.drag[k] * speed);
      this.vx[k] = rx * damping;
      this.vy[k] = up > 0 ? ry * damping + up - GRAVITY * dt : ry * damping - GRAVITY * dt;
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
          );
        }
      }
    }
  }

  /**
   * The Rich offshore veil (decided 2026-09-29, item 4): a fine spray of 0.1 mm drops torn off every crest the wind
   * relative to it (`relativeWind`) reaches the onset on, launched seaward and up off the crest's top, within what is
   * left of the pool after the impacts. It comes off a swept barrel's drawn crest where one is drawn, and off the
   * solver's steep crests elsewhere.
   */
  private veil(scene: SprayScene, dt: number): void {
    const { solver, windSpeed } = scene;
    if (!(windSpeed < 0)) return;
    const lips = scene.lipCrests;
    const covered = this.veilCover;
    covered.clear();
    const easeLips = this.veilEase(VEIL_POOL);
    for (let c = 0; lips && c < lips.count && this.veilRoom(VEIL_POOL); c += 1) {
      const o = c * LIP_CREST_STRIDE;
      const x = lips.data[o];
      const y = lips.data[o + 1];
      const z = lips.data[o + 2];
      const reach = lips.data[o + 3];
      const kx = Math.floor(x / VEIL_COVER);
      const kz = Math.floor(z / VEIL_COVER);
      for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) covered.add((kx + dx) * 65536 + (kz + dz));
      const relative = relativeWind(windSpeed, solver.h[solver.cellIndex(x, z)]);
      const rate = veilRate(relative) * VEIL_SPLIT.lip * easeLips;
      if (!(rate > 0)) continue;
      const expected = rate * reach * dt;
      let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
      for (; spawns > 0 && this.veilRoom(VEIL_POOL); spawns -= 1) {
        this.spawnVeil(scene, x + (this.random() - 0.5) * 0.4, y + 0.05 + 0.1 * this.random(), z + (this.random() - 0.5) * 0.4, relative, VEIL_SPLIT.lip);
      }
    }
    const easeCrest = this.veilEase(VEIL_POOL_CRESTS);
    if (!(easeCrest > 0)) return;
    const { nx, nz, xCenters, zCenters, dx, h, bed, restLevel } = solver;
    for (let row = 1; row < nz - 1 && this.veilRoom(VEIL_POOL_CRESTS); row += 1) {
      const gap = zCenters[row + 1] - zCenters[row - 1];
      for (let column = 0; column < nx && this.veilRoom(VEIL_POOL_CRESTS); column += 1) {
        const i = row * nx + column;
        const depth = h[i];
        const still = restLevel - bed[i];
        if (depth <= WET || !(still > WET)) continue;
        const crest = depth + bed[i] - restLevel;
        if (crest < FEATHER_HEIGHT * still) continue;
        // The wind blows toward −z (offshore); the shoreward face of a crest rises toward it.
        const slope = (h[i - nx] + bed[i - nx] - (h[i + nx] + bed[i + nx])) / gap;
        if (slope < FEATHER_SLOPE) continue;
        const relative = relativeWind(windSpeed, depth);
        const rate = veilRate(relative) * VEIL_SPLIT.crest * easeCrest;
        if (!(rate > 0)) continue;
        if (covered.size > 0 && covered.has(Math.floor(xCenters[column] / VEIL_COVER) * 65536 + Math.floor(zCenters[row] / VEIL_COVER))) continue;
        const expected = rate * dx * dt;
        let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
        for (; spawns > 0 && this.veilRoom(VEIL_POOL_CRESTS); spawns -= 1) {
          this.spawnVeil(scene, xCenters[column] + (this.random() - 0.5) * dx, depth + bed[i] + 0.1, zCenters[row], relative, VEIL_SPLIT.crest);
        }
      }
    }
  }

  /** Whether the veil may take another place: while it is under `limit` of the pool, and the pool has one. */
  private veilRoom(limit: number): boolean {
    return this.veilCount < limit * this.capacity && this.count - this.whitewaterCount < this.capacity;
  }

  /** How much of its rate the veil sheds with its room as full as it is: all of it until the last `VEIL_EASE` of `limit` of the pool, none at `limit`, a straight ramp between. */
  private veilEase(limit: number): number {
    return Math.min(1, Math.max(0, (1 - this.veilCount / (limit * this.capacity)) / VEIL_EASE));
  }

  /** One veil particle: a `split`th of a cluster of mist's water, as 0.1 mm drops, seaward at the wind's pace and up, riding the air up the crest's face. */
  private spawnVeil(scene: SprayScene, x: number, y: number, z: number, relative: number, split: number): void {
    this.spawn(
      MIST, x, y, z,
      (this.random() - 0.5) * 0.5, 0.5 + this.random(), scene.windSpeed * (0.5 + 0.7 * this.random()),
    );
    const k = this.count - 1;
    this.radius[k] = VEIL_RADIUS * (0.7 + 0.6 * this.optical());
    this.water[k] /= split;
    this.lift[k] = VEIL_LIFT * relative * (0.6 + 0.8 * this.random());
    this.veilCount += 1;
  }

  private spawn(kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number): void {
    const k = this.count;
    this.x[k] = x;
    this.y[k] = y;
    this.z[k] = z;
    this.vx[k] = vx;
    this.vy[k] = vy;
    this.vz[k] = vz;
    this.age[k] = 0;
    this.kind[k] = kind;
    this.lift[k] = 0;
    this.count += 1;
    if (isWhitewater(kind)) this.whitewaterCount += 1;
    if (kind === FOAM_BALL) {
      this.drag[k] = 0;
      this.life[k] = FOAM_BALL_LINGER;
      this.size[k] = this.between(FOAM_BALL_SIZE);
      this.radius[k] = 1;
      this.water[k] = 0;
      return;
    }
    const mist = isMist(kind);
    const fall = mist ? this.between(MIST_FALL) : this.between(SPRAY_FALL);
    this.drag[k] = GRAVITY / (fall * fall);
    this.life[k] = (mist ? MIST_LIFE : SPRAY_LIFE) * (0.6 + 0.4 * this.random());
    this.size[k] = mist ? 0.35 + 0.45 * this.random() : 0.06 + 0.08 * this.random();
    const optics = OPTICS[kind];
    this.radius[k] = dropDiameter(this.optical(), optics.smallest, optics.largest) / 2;
    this.water[k] = optics.liquid * this.size[k] * (0.7 + 0.6 * this.optical());
  }

  private remove(k: number): void {
    if (isWhitewater(this.kind[k])) this.whitewaterCount -= 1;
    if (this.lift[k] > 0) this.veilCount -= 1;
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
    this.lift[k] = this.lift[last];
    this.owner[k] = this.owner[last];
    this.radial[k] = this.radial[last];
    this.spin[k] = this.spin[last];
    this.lateral[k] = this.lateral[last];
  }

  private pack(): void {
    const rich = this.look === 'rich';
    for (let k = 0; k < this.count; k += 1) {
      const o = k * SPRAY_STRIDE;
      const t = this.age[k] / this.life[k];
      const mist = isMist(this.kind[k]);
      // Classic draws mist growing to twice its width; the Rich look draws a spray cluster spreading too (not a foam ball).
      const grown = mist ? 1 + t : rich && this.kind[k] !== FOAM_BALL ? 1 + SPRAY_SPREAD * t : 1;
      this.particles[o] = this.x[k];
      this.particles[o + 1] = this.y[k];
      this.particles[o + 2] = this.z[k];
      this.particles[o + 3] = this.size[k] * grown;
      // A foam ball holds until its roller is gone, then fades over the time it lingers.
      this.particles[o + 4] = this.kind[k] === FOAM_BALL
        ? 0.9 * Math.min(1, (this.life[k] - this.age[k]) / FOAM_BALL_LINGER)
        : (mist ? 0.25 : 0.8) * (1 - t * t);
      this.particles[o + 5] = this.kind[k];
      // Only the Rich look reads the rest.
      if (!rich) continue;
      this.particles[o + 6] = this.vx[k];
      this.particles[o + 7] = this.vy[k];
      this.particles[o + 8] = this.vz[k];
      // The cluster's optical depth: clear while its water is still a sheet, then thinning as the cluster spreads
      // and its drops fall out. (After eight time constants the sheet is drops, to a part in 3,000: no exponential.)
      const drops = this.age[k] < 8 * BREAKUP ? 1 - Math.exp(-this.age[k] / BREAKUP) : 1;
      this.particles[o + 9] = this.kind[k] === FOAM_BALL
        ? 0
        : (opticalDepth(this.water[k], this.radius[k]) * drops * Math.max(0, 1 - t * t)) / (grown * grown);
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
