/**
 * The roller lens (the Canyon roller lens, S3: docs/superpowers/plans/2026-10-06-canyon-roller-s3.md §2, after the
 * advisor's build recipe, docs/research/water-physics/notes/round3-whitewater-build/roller-build.md, "R3"): at a
 * spilling spot each wave's broken face carries a light lens of aerated water from its crest to its toe. The rider
 * meets it through the water sample (its top, its air and its flow) and both looks draw it.
 *
 * It reads the solver's surface and breaking and the spilling front, and never writes either (R3 §3.4): the water
 * never feels it. Per column it keeps up to two lenses, one per wave in a row (the slot is the front wave's id mod 2):
 * - a lens is seeded where its wave first breaks in the column (`SpillingFront.crestAt`), reached by the front or
 *   not, then follows its own crest, so it outlives the front's band;
 * - each step a section along the column gives the crest, the trough, the toe, H and the bore's Froude number;
 * - its life follows the solver: born where B ≥ 0.3 and Fr₁ ≥ 1.45, grown over 6.5 breaker depths of travel, shed
 *   once Fr₁ < 1.3, B < 0.1 or a lost crest has held 0.2 s, and cut to the water in the swash;
 * - the front's mask decides where it is drawn and felt (Q1): behind the visible front, grown from S2's line.
 *
 * Its decision paths (thresholds, states and geometry) use only + − × ÷, √, floor, min and max (R3 §3.4), so every
 * client keeps the same lenses. Its table (`ROLLER_FIELD`) is what is drawn and felt, per slot and column.
 */
import { AERATION } from './AerationField';
import { GRAVITY } from './dispersion';
import { OPEN_EDGE_REACH } from './ShallowWaterSolver';
import type { SpillingFront } from './SpillingFront';

/** Lenses per column: two waves in a row (the plan's §2). */
export const ROLLER_SLOTS = 2;
/** Values per slot and column in the table: two RGBA texels. */
export const ROLLER_STRIDE = 8;
/** Where each value sits in a table entry. An entry with no scale (0) is empty. */
export const ROLLER_FIELD = {
  /** The crest across shore, z_c, m. */
  crest: 0,
  /** The lens's extent across shore from its crest to its toe, L_eff / n̂_z, m. */
  length: 1,
  /** Its drawn-and-felt scale g_eff, 0–1. */
  scale: 2,
  /** Its thickness at the crest at full scale, t_c, m. */
  thickness: 3,
  /** Its water's velocity, c·n̂, m/s. */
  flowX: 4,
  flowZ: 5,
  /** The trough's depth ahead of it, h₁, m, and its toe's roughness d′max, m (the look's, §4). */
  troughDepth: 6,
  roughness: 7,
} as const;

/** The solver fields the roller reads: its cell centres (row-major, iz * nx + ix; z toward the beach), depth and bed. */
export interface RollerGrid {
  readonly nx: number;
  readonly nz: number;
  readonly dx: number;
  readonly xCenters: ArrayLike<number>;
  readonly zCenters: ArrayLike<number>;
  readonly h: ArrayLike<number>;
  readonly bed: ArrayLike<number>;
  readonly restLevel: number;
}

export interface RollerOptions {
  /** Born where the solver's breaking on the face reaches this, B (R3 §1.4: the game's shared breaking line). */
  birthStrength: number;
  /** Shed where it falls below this: the solver has stopped dissipating (R3 §1.4). */
  shedStrength: number;
  /** Born from F = Fr₁² ≥ this: Fr₁ 1.45 (Tissier et al. 2012, after Chanson 2008). */
  birthFroude2: number;
  /** Shed below this: Fr₁ 1.3 (Tissier et al. 2012). */
  shedFroude2: number;
  /** A shedding condition must hold this long, s (R3 §1.4). */
  shedHold: number;
  /** It grows over this many breaker depths of travel (5–8, Svendsen 1984; 6.5 is P). */
  growthDepths: number;
  /** The stage's face slope: tan 25° at birth, tan 18.5° developed (Martins et al. 2018: 25° → 18–19°; the ramp is P). */
  tanBirth: number;
  tanDeveloped: number;
  /** Its water, K·H² (Martins et al. 2018: 0.33–0.36; the middle is P). */
  area: number;
  /** Its mean void fraction ᾱ (the owner, 2026-09-29; R3 §2.1). */
  voidMean: number;
  /** Behind the crest it tapers over this share of its length (Duncan's wake; P). */
  rearTaper: number;
  /** Its speed and length relax over this, s (R3 §1.1). */
  relax: number;
  /** Gaps under this between a wave's runs along the crest are closed, and runs under it dropped, m (R3 §1.6). */
  gap: number;
  /** Its scale changes by at most this per metre along the crest (R3 §1.6: 0.1 per 0.5 m slice). */
  shoulderSlope: number;
  /**
   * One crest: neighbouring columns' crests further apart than this, m, are not one crest's, so a normal's fit and a gap's
   * fill stop there (P: about a lens length, as the front's `crestReach`; the next crest lies a wavelength away).
   */
  crestJump: number;
  /** A tracked crest is the nearest maximum within this of where it should have moved, m (P). */
  trackWindow: number;
  /** The swash: a trough shallower than this, m, or a dry toe (P, R3 §1.4). */
  swashDepth: number;
  /** In the swash it sheds once its crest is slower than this, m/s (P, R3 §1.4). */
  stallSpeed: number;
  /** Shedding thins it with an e-folding time t_c / w_b: w_b, the bubbles' rise speed (`AERATION.riseSpeed`). */
  riseSpeed: number;
  /** A shedding lens is gone below this scale (P). */
  minG: number;
  /** No lens in this many columns at each open along-shore edge (`OPEN_EDGE_REACH`, the solver's stencils). */
  edgeColumns: number;
  /** Where it is drawn and felt: behind the visible front ('front', the advisor's Q1), or wherever the solver breaks. */
  mask: 'front' | 'solver';
}

/** The Canyon's roller: the plan's §2 with the advisor's rulings (§9). */
export const ROLLER_DEFAULTS: RollerOptions = {
  birthStrength: 0.3,
  shedStrength: 0.1,
  birthFroude2: 1.45 * 1.45,
  shedFroude2: 1.3 * 1.3,
  shedHold: 0.2,
  growthDepths: 6.5,
  tanBirth: 0.4663,
  tanDeveloped: 0.3346,
  area: 0.345,
  voidMean: 0.25,
  rearTaper: 0.3,
  relax: 0.3,
  gap: 4,
  shoulderSlope: 0.2,
  crestJump: 10,
  trackWindow: 2,
  swashDepth: 0.1,
  stallSpeed: 0.5,
  riseSpeed: AERATION.riseSpeed,
  minG: 0.01,
  edgeColumns: OPEN_EDGE_REACH,
  mask: 'front',
};

/** The lens at a point: what the rider's water reads (`PhysicalSurfWater`). */
export interface LensPoint {
  /** Its thickness there, t, m: the top stands ᾱ·t over the solver's surface, the underside (1 − ᾱ)·t under it. */
  thickness: number;
  /** ᾱ·t, m. */
  rise: number;
  /** Its scale there, g_eff. */
  g: number;
  /** Its water's velocity, c·n̂, m/s. */
  flowX: number;
  flowZ: number;
}

export function createLensPoint(): LensPoint {
  return { thickness: 0, rise: 0, g: 0, flowX: 0, flowZ: 0 };
}

/** What the rider's water reads from a roller (`PhysicalSurfWater`'s `roller` option). */
export interface RollerLens {
  readonly options: Pick<RollerOptions, 'voidMean'>;
  /** The drawn-and-felt lens at (x, z), the thickest of the slots; false where there is none. */
  lensAt(x: number, z: number, out: LensPoint): boolean;
  /** ᾱ·t there: how far its top stands over the solver's surface, m. */
  riseAt(x: number, z: number): number;
}

/** One lens's state, for tests and reports. */
export interface RollerLensState {
  state: 'active' | 'shedding';
  /** Its front wave's id. */
  wave: number;
  /** When it was born, s, and how far its crest has travelled since, along its normal, m. */
  birth: number;
  travel: number;
  /** How long a shedding condition has held, s. */
  hold: number;
  /** Its scale g, speed c (m/s, along its normal), length L_r (m) and crest z_c. */
  g: number;
  c: number;
  length: number;
  crest: number;
  /** Its section's latest H (m), trough depth h₁ (m) and F = Fr₁². */
  height: number;
  troughDepth: number;
  froude2: number;
}

/** A lens starting to shed (the advisor's Q3: Fr₁ and B are reported at every shedding). */
export interface RollerShed {
  time: number;
  column: number;
  slot: number;
  wave: number;
  froude2: number;
  /** B_front, NaN with the crest lost. */
  strength: number;
  reason: 'froude' | 'strength' | 'lost' | 'stall';
}

/** Sections are sampled every SAMPLE m along the column, linear between rows (R3 §1.1's "lite" analysis). */
const SAMPLE = 0.5;
/** A section reaches max(SECTION_REACH, 4 H) behind the crest and max(SECTION_REACH, 6 H) ahead, m (R3 §1.1). */
const SECTION_REACH = 10;
const BACK_HEIGHTS = 4;
const AHEAD_HEIGHTS = 6;
/** The toe: where −∂η/∂z has fallen to this share of its peak past the steepest point (Martins et al. 2018). */
const TOE_SHARE = 0.2;
/** A roller measured shorter than 4 Δx = 4 m is under-resolved: its length blends toward the stage's (R3 §1.3). */
const RESOLVED_LENGTH = 4;
/** Water shallower than this is dry, m: the renderer's convention (`PhysicalSurfWater`). */
const DRY = 0.01;
/** A hold within this of shedHold has held, s: a sum of steps' dt rounds just below it. */
const HOLD_SLACK = 1e-9;
/** The crest's normal fits the crests of up to this many columns each side. */
const NORMAL_REACH = 2;
/**
 * The toe's roughness d′max over h₁ (the look's, §4): 0.155 at Fr₁ 1.5 and 0.35 at 1.9, linear between, held within
 * 0.13–0.4 (Wang, Leng & Chanson 2017's mid-ranges; the owner ruled mid-range).
 */
const ROUGHNESS = { froudeLow: 1.5, low: 0.155, froudeHigh: 1.9, high: 0.35, min: 0.13, max: 0.4 } as const;

const NONE = 0;
const ACTIVE = 1;
const SHEDDING = 2;

/** The table's offsets, as plain numbers for the per-point reads. */
const CREST = ROLLER_FIELD.crest;
const LENGTH = ROLLER_FIELD.length;
const SCALE = ROLLER_FIELD.scale;
const THICKNESS = ROLLER_FIELD.thickness;
const FLOW_X = ROLLER_FIELD.flowX;
const FLOW_Z = ROLLER_FIELD.flowZ;

/** The lens's development φ: its travel over growthDepths breaker depths, at most 1 (Svendsen 1984). */
export function development(travel: number, breakerDepth: number, options: Pick<RollerOptions, 'growthDepths'>): number {
  const span = options.growthDepths * breakerDepth;
  if (!(span > 0)) return 1;
  return Math.min(1, Math.max(0, travel / span));
}

/** The stage's face slope tan θ_s: from tanBirth to tanDeveloped, linear in φ. */
export function stageSlope(phi: number, options: Pick<RollerOptions, 'tanBirth' | 'tanDeveloped'>): number {
  return options.tanBirth + (options.tanDeveloped - options.tanBirth) * phi;
}

/**
 * The roller's length L_r: the measured length L_m, blended toward the stage relation H / tan θ_s with weight
 * w = min(1, L_m / 4 m), Bacigaluppi's guard for under-resolved bores (R3 §1.3).
 */
export function rollerLength(measured: number, height: number, phi: number, options: Pick<RollerOptions, 'tanBirth' | 'tanDeveloped'>): number {
  const w = Math.min(1, Math.max(0, measured / RESOLVED_LENGTH));
  return w * measured + (1 - w) * (height / stageSlope(phi, options));
}

/** The crest thickness t_c = 4K·H² / [π(1 − ᾱ)·L_r]: the quarter ellipse then holds K·H² of water (R3 §2.1). */
export function crestThickness(height: number, length: number, options: Pick<RollerOptions, 'area' | 'voidMean'>): number {
  if (!(height > 0 && length > 0)) return 0;
  return (4 * options.area * height * height) / (Math.PI * (1 - options.voidMean) * length);
}

/**
 * The thickness at ξ (0 at the crest, 1 at the toe): g·t_c·√(1 − ξ²), a quarter ellipse, thickest at the crest
 * (provisional in R3 §2.1; the advisor's Q2 ruling); behind the crest g·t_c·(1 − (ξ/ξ_b)²) (Duncan's wake; P).
 */
export function lensThickness(xi: number, crest: number, g: number, rearTaper: number): number {
  if (xi >= 0) return xi < 1 ? g * crest * Math.sqrt(1 - xi * xi) : 0;
  if (!(xi > -rearTaper)) return 0;
  const r = xi / rearTaper;
  return g * crest * (1 - r * r);
}

/** The toe's roughness d′max, m, for F = Fr₁² and trough depth h₁. */
export function toeRoughness(froude2: number, troughDepth: number): number {
  const froude = Math.sqrt(froude2 > 0 ? froude2 : 0);
  const share = ROUGHNESS.low + ((ROUGHNESS.high - ROUGHNESS.low) * (froude - ROUGHNESS.froudeLow)) / (ROUGHNESS.froudeHigh - ROUGHNESS.froudeLow);
  return Math.min(ROUGHNESS.max, Math.max(ROUGHNESS.min, share)) * (troughDepth > 0 ? troughDepth : 0);
}

/** A section of the solver's surface along one column (R3 §1.1). */
export interface RollerSection {
  /** The crest, the steepest point, the toe and the trough across shore, z, m. */
  crest: number;
  steepest: number;
  toe: number;
  trough: number;
  /** η at the crest and at the trough, m, and H, their difference. */
  crestLevel: number;
  troughLevel: number;
  height: number;
  /** The depth at the crest (h₂) and at the trough (h₁), m, and F = r(r + 1)/2 = Fr₁² with r = h₂/h₁. */
  crestDepth: number;
  troughDepth: number;
  froude2: number;
  /** B_front: the solver's largest breaking from the crest to the toe, ungated. */
  strength: number;
  /** Whether the toe lies in water shallower than the renderer's dry depth. */
  dryToe: boolean;
}

export function createSection(): RollerSection {
  return {
    crest: Number.NaN, steepest: Number.NaN, toe: Number.NaN, trough: Number.NaN, crestLevel: Number.NaN, troughLevel: Number.NaN,
    height: Number.NaN, crestDepth: Number.NaN, troughDepth: Number.NaN, froude2: Number.NaN, strength: 0, dryToe: false,
  };
}

/** Largest row whose centre is at or below z, clamped to [0, nz − 2] (the solver's `rowBelow`). */
function rowBelow(zCenters: ArrayLike<number>, nz: number, z: number): number {
  let low = 0;
  let high = nz - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (zCenters[middle] <= z) low = middle;
    else high = middle;
  }
  return Math.min(low, nz - 2);
}

/** A cell field along one column at z, linear between rows. */
function columnValue(grid: RollerGrid, field: ArrayLike<number>, column: number, z: number): number {
  const { nx, nz, zCenters } = grid;
  const r = rowBelow(zCenters, nz, z);
  const t = Math.min(1, Math.max(0, (z - zCenters[r]) / (zCenters[r + 1] - zCenters[r])));
  return field[r * nx + column] * (1 - t) + field[(r + 1) * nx + column] * t;
}

/**
 * Reads sections of the solver's surface along a column (R3 §1.1, "lite"): η and h every 0.5 m, linear between rows;
 * the crest and the trough are the nearest extremes behind and ahead of the steepest point (Tissier et al. 2012), each
 * refined by a parabola through its three rows; the toe is where −∂η/∂z falls to 0.2 of its peak (Martins et al. 2018).
 */
export class SectionReader {
  private eta = new Float64Array(0);
  private depth = new Float64Array(0);
  private slope = new Float64Array(0);
  private row = new Int32Array(0);
  private weight = new Float64Array(0);
  private first = 0;
  private refinedZ = 0;
  private refinedLevel = 0;

  /**
   * The section of `column` from `from − back` to `from + ahead`. A 'seed' starts from a breaking cell on the face:
   * the steepest point in reach, the crest behind it. A 'track' starts from where a crest should be: the nearest
   * maximum within `window` of it, the steepest point ahead of that. False when there is no crest or no face.
   */
  read(grid: RollerGrid, column: number, from: number, mode: 'seed' | 'track', back: number, ahead: number, window: number,
    strength: ArrayLike<number>, out: RollerSection): boolean {
    const { nx, nz, zCenters, h, bed } = grid;
    if (nz < 4 || !(from === from)) return false;
    const lo = Math.max(zCenters[0], from - back);
    const hi = Math.min(zCenters[nz - 1], from + ahead);
    const first = -Math.floor(-lo / SAMPLE);
    const count = Math.floor(hi / SAMPLE) - first + 1;
    if (count < 5) return false;
    this.reserve(count);
    this.first = first;
    const { eta, depth, slope, row, weight } = this;
    let r = rowBelow(zCenters, nz, first * SAMPLE);
    for (let k = 0; k < count; k += 1) {
      const z = (first + k) * SAMPLE;
      while (r < nz - 2 && zCenters[r + 1] <= z) r += 1;
      const t = Math.min(1, Math.max(0, (z - zCenters[r]) / (zCenters[r + 1] - zCenters[r])));
      const i = r * nx + column;
      const j = i + nx;
      depth[k] = h[i] * (1 - t) + h[j] * t;
      eta[k] = (h[i] + bed[i]) * (1 - t) + (h[j] + bed[j]) * t;
      row[k] = r;
      weight[k] = t;
    }
    // −∂η/∂z: positive down a face toward the beach.
    for (let k = 1; k < count - 1; k += 1) slope[k] = (eta[k - 1] - eta[k + 1]) / (2 * SAMPLE);
    slope[0] = (eta[0] - eta[1]) / SAMPLE;
    slope[count - 1] = (eta[count - 2] - eta[count - 1]) / SAMPLE;
    let crestAt = -1;
    if (mode === 'track') {
      let nearest = Number.POSITIVE_INFINITY;
      for (let k = 1; k < count - 1; k += 1) {
        if (!(eta[k] > eta[k - 1] && eta[k] >= eta[k + 1])) continue;
        this.refine(grid, column, k, true);
        const offset = this.refinedZ - from;
        const distance = offset < 0 ? -offset : offset;
        if (distance <= window && distance < nearest) {
          nearest = distance;
          crestAt = k;
          out.crest = this.refinedZ;
          out.crestLevel = this.refinedLevel;
        }
      }
    } else {
      let steepest = 1;
      for (let k = 2; k < count - 1; k += 1) if (slope[k] > slope[steepest]) steepest = k;
      if (!(slope[steepest] > 0)) return false;
      for (let k = steepest - 1; k >= 1 && crestAt < 0; k -= 1) if (eta[k] > eta[k - 1] && eta[k] >= eta[k + 1]) crestAt = k;
      if (crestAt >= 0) {
        this.refine(grid, column, crestAt, true);
        out.crest = this.refinedZ;
        out.crestLevel = this.refinedLevel;
      }
    }
    if (crestAt < 0 || crestAt >= count - 2) return false;
    // The face: its steepest point ahead of the crest, the nearest trough ahead of that, the toe between them.
    let steepest = crestAt + 1;
    for (let k = crestAt + 2; k < count; k += 1) if (slope[k] > slope[steepest]) steepest = k;
    const peak = slope[steepest];
    if (!(peak > 0)) return false;
    let troughAt = count - 1;
    for (let k = steepest + 1; k < count - 1; k += 1) {
      if (eta[k] < eta[k - 1] && eta[k] <= eta[k + 1]) {
        troughAt = k;
        break;
      }
    }
    if (troughAt < count - 1) {
      this.refine(grid, column, troughAt, false);
      out.trough = this.refinedZ;
      out.troughLevel = this.refinedLevel;
    } else {
      out.trough = (first + troughAt) * SAMPLE;
      out.troughLevel = eta[troughAt];
    }
    const threshold = TOE_SHARE * peak;
    let toe = out.trough;
    for (let k = steepest + 1; k <= troughAt; k += 1) {
      if (slope[k] <= threshold) {
        toe = (first + k - 1) * SAMPLE + (SAMPLE * (slope[k - 1] - threshold)) / (slope[k - 1] - slope[k]);
        break;
      }
    }
    if (toe > out.trough) toe = out.trough;
    out.steepest = (first + steepest) * SAMPLE;
    out.toe = toe;
    out.height = out.crestLevel - out.troughLevel;
    out.crestDepth = columnValue(grid, h, column, out.crest);
    out.troughDepth = columnValue(grid, h, column, out.trough);
    const ratio = out.troughDepth > 0 ? out.crestDepth / out.troughDepth : Number.POSITIVE_INFINITY;
    out.froude2 = (ratio * (ratio + 1)) / 2;
    // B_front: the solver's largest breaking from the crest's row to the toe's (ungated).
    let b = 0;
    for (let rr = rowBelow(zCenters, nz, out.crest); rr < nz; rr += 1) {
      const value = strength[rr * nx + column];
      if (value > b) b = value;
      if (zCenters[rr] >= toe) break;
    }
    out.strength = b;
    out.dryToe = !(columnValue(grid, h, column, toe) > DRY);
    return out.height > 0;
  }

  /** Grow the sample buffers to hold `count` samples. */
  private reserve(count: number): void {
    if (this.eta.length >= count) return;
    const size = Math.max(count, 2 * this.eta.length);
    this.eta = new Float64Array(size);
    this.depth = new Float64Array(size);
    this.slope = new Float64Array(size);
    this.row = new Int32Array(size);
    this.weight = new Float64Array(size);
  }

  /** The extreme near sample k: the vertex of the parabola through the nearest row and its neighbours, where they bracket one. */
  private refine(grid: RollerGrid, column: number, k: number, isMax: boolean): void {
    const { nx, nz, zCenters, h, bed } = grid;
    const level = (r: number) => h[r * nx + column] + bed[r * nx + column];
    this.refinedZ = (this.first + k) * SAMPLE;
    this.refinedLevel = this.eta[k];
    let r = this.row[k];
    if (this.weight[k] > 0 && (isMax ? level(r + 1) > level(r) : level(r + 1) < level(r))) r += 1;
    if (r < 1 || r > nz - 2) return;
    const za = zCenters[r - 1];
    const zb = zCenters[r];
    const zc = zCenters[r + 1];
    const ya = level(r - 1);
    const yb = level(r);
    const yc = level(r + 1);
    if (isMax ? !(yb >= ya && yb >= yc) : !(yb <= ya && yb <= yc)) return;
    const da = zb - za;
    const dc = zb - zc;
    const denominator = da * (yb - yc) - dc * (yb - ya);
    if (denominator === 0) {
      this.refinedZ = zb;
      this.refinedLevel = yb;
      return;
    }
    let z = zb - (0.5 * (da * da * (yb - yc) - dc * dc * (yb - ya))) / denominator;
    if (z < za) z = za;
    if (z > zc) z = zc;
    this.refinedZ = z;
    this.refinedLevel = (ya * (z - zb) * (z - zc)) / ((za - zb) * (za - zc)) + (yb * (z - za) * (z - zc)) / ((zb - za) * (zb - zc))
      + (yc * (z - za) * (z - zb)) / ((zc - za) * (zc - zb));
  }
}

/**
 * Along the crest, one slot's entries from `offset` in `table`, with each column's wave (−1: empty), in place (R3 §1.6):
 * - two waves' lenses never touch: at a seam the older wave's column is emptied, so nothing between columns mixes them;
 * - gaps under `gap` between runs of one wave are closed from the runs' ends where their crests lie within crestJump,
 *   and runs under `gap` are dropped;
 * - the scale changes by at most shoulderSlope per metre, from 0 outside the runs, so every run fades in at its ends.
 */
export function alongCrest(table: Float64Array, offset: number, waves: Int32Array, nx: number, dx: number,
  options: Pick<RollerOptions, 'gap' | 'shoulderSlope' | 'crestJump'>): void {
  const stride = ROLLER_STRIDE;
  const clear = (column: number) => {
    waves[column] = -1;
    table.fill(0, offset + column * stride, offset + (column + 1) * stride);
  };
  for (let column = 0; column + 1 < nx; column += 1) {
    const a = waves[column];
    const b = waves[column + 1];
    if (a < 0 || b < 0 || a === b) continue;
    clear(a < b ? column : column + 1);
  }
  let end = -1;
  for (let column = 0; column < nx; column += 1) {
    if (waves[column] < 0) continue;
    const jump = end >= 0 ? table[offset + column * stride + ROLLER_FIELD.crest] - table[offset + end * stride + ROLLER_FIELD.crest] : 0;
    if (end >= 0 && column - end > 1 && waves[column] === waves[end] && (column - end - 1) * dx < options.gap
      && jump <= options.crestJump && -jump <= options.crestJump) {
      for (let m = end + 1; m < column; m += 1) {
        const t = (m - end) / (column - end);
        for (let f = 0; f < stride; f += 1) {
          table[offset + m * stride + f] = table[offset + end * stride + f] * (1 - t) + table[offset + column * stride + f] * t;
        }
        waves[m] = waves[column];
      }
    }
    end = column;
  }
  for (let column = 0; column < nx;) {
    if (waves[column] < 0) {
      column += 1;
      continue;
    }
    let last = column;
    while (last + 1 < nx && waves[last + 1] === waves[column]) last += 1;
    if ((last - column + 1) * dx < options.gap) for (let m = column; m <= last; m += 1) clear(m);
    column = last + 1;
  }
  const rise = options.shoulderSlope * dx;
  const at = (column: number) => offset + column * stride + ROLLER_FIELD.scale;
  let previous = 0;
  for (let column = 0; column < nx; column += 1) {
    if (waves[column] < 0) {
      previous = 0;
      continue;
    }
    if (table[at(column)] > previous + rise) table[at(column)] = previous + rise;
    previous = table[at(column)];
  }
  previous = 0;
  for (let column = nx - 1; column >= 0; column -= 1) {
    if (waves[column] < 0) {
      previous = 0;
      continue;
    }
    if (table[at(column)] > previous + rise) table[at(column)] = previous + rise;
    previous = table[at(column)];
  }
}

/** The roller lenses of a spilling spot's waves (see the module's comment). */
export class SpillingRoller implements RollerLens {
  readonly options: RollerOptions;
  /** What is drawn and felt: ROLLER_SLOTS × nx entries of ROLLER_STRIDE values (`ROLLER_FIELD`), slot-major. */
  readonly table: Float64Array;
  /**
   * Since the start: lenses born, lenses starting to shed, lenses that yielded their slot to a newer wave's, lens-steps
   * the front's mask held back, and sections where the solver's breaking and the bore's Froude number disagree on
   * breaking (R3 §1.5; outside the swash).
   */
  readonly counts = { born: 0, shed: 0, overflow: 0, masked: 0, disagree: 0 };
  /** Called as each lens starts to shed (the advisor's Q3). */
  onShed?: (event: RollerShed) => void;

  // Each lens's state, by slot * nx + column.
  private readonly state: Uint8Array;
  private readonly wave: Int32Array;
  private readonly birth: Float64Array;
  private readonly travel: Float64Array;
  private readonly hold: Float64Array;
  private readonly scale: Float64Array;
  private readonly speed: Float64Array;
  private readonly length: Float64Array;
  private readonly crest: Float64Array;
  private readonly height: Float64Array;
  private readonly troughDepth: Float64Array;
  private readonly froude2: Float64Array;
  // This step's sections and normals.
  private readonly found: Uint8Array;
  private readonly fresh: Uint8Array;
  private readonly nextCrest: Float64Array;
  private readonly toe: Float64Array;
  private readonly strength: Float64Array;
  private readonly dryToe: Uint8Array;
  private readonly normalX: Float64Array;
  private readonly normalZ: Float64Array;
  /** The table's wave per slot and column (−1: empty). */
  private readonly tableWaves: Int32Array;
  private readonly reader = new SectionReader();
  private readonly section = createSection();
  /** The lens `thicknessAt` picked: its scale and its water's velocity. */
  private pickG = 0;
  private pickFlowX = 0;
  private pickFlowZ = 0;

  constructor(private readonly grid: RollerGrid, options: Partial<RollerOptions> = {}) {
    this.options = { ...ROLLER_DEFAULTS, ...options };
    const size = ROLLER_SLOTS * grid.nx;
    this.table = new Float64Array(size * ROLLER_STRIDE);
    this.state = new Uint8Array(size);
    this.wave = new Int32Array(size).fill(-1);
    this.birth = new Float64Array(size);
    this.travel = new Float64Array(size);
    this.hold = new Float64Array(size);
    this.scale = new Float64Array(size);
    this.speed = new Float64Array(size);
    this.length = new Float64Array(size);
    this.crest = new Float64Array(size);
    this.height = new Float64Array(size);
    this.troughDepth = new Float64Array(size);
    this.froude2 = new Float64Array(size);
    this.found = new Uint8Array(size);
    this.fresh = new Uint8Array(size);
    this.nextCrest = new Float64Array(size);
    this.toe = new Float64Array(size);
    this.strength = new Float64Array(size);
    this.dryToe = new Uint8Array(size);
    this.normalX = new Float64Array(size);
    this.normalZ = new Float64Array(size).fill(1);
    this.tableWaves = new Int32Array(size).fill(-1);
  }

  /**
   * One step, after the front's (`SpillingFront.update`, whose waves, crests and reach it reads): each lens follows its
   * crest, each wave seeds lenses where it breaks, then each lens's speed, life and shape, and the table.
   * `strength` is the solver's breaking (ungated); `breakerDepth` is h_b, m.
   */
  update(time: number, dt: number, front: SpillingFront, strength: ArrayLike<number>, breakerDepth: number): void {
    const { grid, options, section, reader } = this;
    const { nx } = grid;
    const first = Math.min(nx, Math.max(0, options.edgeColumns));
    const last = nx - first;
    const step = dt > 0 ? dt : 0;
    this.found.fill(0);
    this.fresh.fill(0);
    // Each lens follows its own crest: the nearest maximum within trackWindow of where it should have moved.
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      for (let column = first; column < last; column += 1) {
        const lens = slot * nx + column;
        if (this.state[lens] === NONE) continue;
        const height = this.height[lens] > 0 ? this.height[lens] : 0;
        const back = Math.max(SECTION_REACH, BACK_HEIGHTS * height) + options.trackWindow;
        const ahead = Math.max(SECTION_REACH, AHEAD_HEIGHTS * height) + options.trackWindow;
        const from = this.crest[lens] + this.speed[lens] * step;
        if (reader.read(grid, column, from, 'track', back, ahead, options.trackWindow, strength, section)) this.take(lens);
      }
    }
    // Each of the front's waves seeds a lens where it breaks in a column it has none in: born where the solver's
    // breaking and the bore's Froude number both say the bore breaks (R3 §1.4–1.5), in the wave's slot.
    const reach = SECTION_REACH + options.trackWindow;
    for (let k = 0; k < front.waves.length; k += 1) {
      const id = front.waves[k].id;
      const slot = id % ROLLER_SLOTS;
      for (let column = first; column < last; column += 1) {
        const seed = front.crestAt(k, column);
        if (!(seed === seed)) continue;
        const lens = slot * nx + column;
        if (this.has(column, id)) continue;
        // A newer wave's lens keeps the slot: the oldest yields.
        if (this.state[lens] !== NONE && this.wave[lens] > id) continue;
        if (!reader.read(grid, column, seed, 'seed', reach, reach, options.trackWindow, strength, section)) continue;
        const swash = section.troughDepth < options.swashDepth || section.dryToe;
        const kennedy = section.strength >= options.birthStrength;
        const froude = swash || section.froude2 >= options.birthFroude2;
        if (!swash && kennedy !== froude) this.counts.disagree += 1;
        if (!(kennedy && froude)) continue;
        if (this.state[lens] !== NONE) {
          this.counts.overflow += 1;
          this.clearLens(lens);
        }
        this.state[lens] = ACTIVE;
        this.wave[lens] = id;
        this.birth[lens] = time;
        this.travel[lens] = 0;
        this.hold[lens] = 0;
        this.scale[lens] = 0;
        this.speed[lens] = Math.sqrt(GRAVITY * (breakerDepth > 0 ? breakerDepth : 0));
        this.length[lens] = Number.NaN;
        this.crest[lens] = section.crest;
        this.take(lens);
        this.fresh[lens] = 1;
        this.counts.born += 1;
      }
    }
    // A lost crest coasts at its speed.
    for (let lens = 0; lens < this.state.length; lens += 1) {
      if (this.state[lens] !== NONE && this.found[lens] === 0) this.nextCrest[lens] = this.crest[lens] + this.speed[lens] * step;
    }
    // Every normal from this step's crests first, so no lens's fate this step turns its neighbours'.
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      for (let column = first; column < last; column += 1) if (this.state[slot * nx + column] !== NONE) this.normal(slot, column, first, last);
    }
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      for (let column = first; column < last; column += 1) {
        const lens = slot * nx + column;
        if (this.state[lens] === NONE) continue;
        if (this.advance(lens, column, slot, time, step, breakerDepth)) this.shape(lens, step, breakerDepth);
      }
    }
    this.writeTable(time, front, first, last);
  }

  /**
   * No lenses and an empty table: a sea taken over without the roller's state starts it afresh (the plan's §5: a donor
   * without it leaves no lenses; they come back with the next onsets). The counts run on.
   */
  reset(): void {
    for (let lens = 0; lens < this.state.length; lens += 1) this.clearLens(lens);
    this.table.fill(0);
    this.tableWaves.fill(-1);
  }

  /** The drawn-and-felt lens at (x, z): the thickest of the slots, cut to half the water's depth (the swash's rule). */
  lensAt(x: number, z: number, out: LensPoint): boolean {
    const thickness = this.thicknessAt(x, z, true);
    if (!(thickness > 0)) {
      out.thickness = 0;
      out.rise = 0;
      out.g = 0;
      out.flowX = 0;
      out.flowZ = 0;
      return false;
    }
    out.thickness = thickness;
    out.rise = this.options.voidMean * thickness;
    out.g = this.pickG;
    out.flowX = this.pickFlowX;
    out.flowZ = this.pickFlowZ;
    return true;
  }

  riseAt(x: number, z: number): number {
    const thickness = this.thicknessAt(x, z, false);
    return thickness > 0 ? this.options.voidMean * thickness : 0;
  }

  /** The lens in `column`'s `slot`, or none. */
  lens(column: number, slot: number): RollerLensState | undefined {
    if (!(column >= 0 && column < this.grid.nx && slot >= 0 && slot < ROLLER_SLOTS)) return undefined;
    const lens = slot * this.grid.nx + column;
    if (this.state[lens] === NONE) return undefined;
    return {
      state: this.state[lens] === ACTIVE ? 'active' : 'shedding', wave: this.wave[lens], birth: this.birth[lens],
      travel: this.travel[lens], hold: this.hold[lens], g: this.scale[lens], c: this.speed[lens], length: this.length[lens],
      crest: this.crest[lens], height: this.height[lens], troughDepth: this.troughDepth[lens], froude2: this.froude2[lens],
    };
  }

  /**
   * The table's lenses' reach across shore, z from `low` to `high` (empty: low +∞, high −∞): no lens lies outside it,
   * between columns or at them, so a pass over many points (the render nodes) can skip the rows beyond it.
   */
  extentZ(out: { low: number; high: number }): { low: number; high: number } {
    const { table, options } = this;
    out.low = Number.POSITIVE_INFINITY;
    out.high = Number.NEGATIVE_INFINITY;
    for (let o = 0; o < table.length; o += ROLLER_STRIDE) {
      if (!(table[o + ROLLER_FIELD.scale] > 0)) continue;
      const crest = table[o + ROLLER_FIELD.crest];
      const length = table[o + ROLLER_FIELD.length];
      out.low = Math.min(out.low, crest - options.rearTaper * length);
      out.high = Math.max(out.high, crest + length);
    }
    return out;
  }

  /** The wave whose lens the table holds in `column`'s `slot`, or −1. */
  tableWave(column: number, slot: number): number {
    if (!(column >= 0 && column < this.grid.nx && slot >= 0 && slot < ROLLER_SLOTS)) return -1;
    return this.tableWaves[slot * this.grid.nx + column];
  }

  /** Whether wave `id` has a lens in `column`, in either slot. */
  private has(column: number, id: number): boolean {
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      const lens = slot * this.grid.nx + column;
      if (this.state[lens] !== NONE && this.wave[lens] === id) return true;
    }
    return false;
  }

  /** This step's section, for `lens`. */
  private take(lens: number): void {
    const { section } = this;
    this.found[lens] = 1;
    this.nextCrest[lens] = section.crest;
    this.toe[lens] = section.toe;
    this.strength[lens] = section.strength;
    this.dryToe[lens] = section.dryToe ? 1 : 0;
    this.height[lens] = section.height;
    this.troughDepth[lens] = section.troughDepth;
    this.froude2[lens] = section.froude2;
  }

  private clearLens(lens: number): void {
    this.state[lens] = NONE;
    this.wave[lens] = -1;
    this.birth[lens] = 0;
    this.travel[lens] = 0;
    this.hold[lens] = 0;
    this.scale[lens] = 0;
    this.speed[lens] = 0;
    this.length[lens] = 0;
    this.crest[lens] = 0;
    this.height[lens] = 0;
    this.troughDepth[lens] = 0;
    this.froude2[lens] = 0;
  }

  /**
   * The crest's normal n̂ (toward the beach) from this step's crests of the same wave in up to NORMAL_REACH columns
   * each side, as far as they run on without a jump over crestJump: the least-squares slope of z_c along x, so one
   * column's crest error barely turns it.
   */
  private normal(slot: number, column: number, first: number, last: number): void {
    const { nx, dx } = this.grid;
    const lens = slot * nx + column;
    const id = this.wave[lens];
    const crestJump = this.options.crestJump;
    // Whether the lens beside `inner` (one column further out) is the same wave's, on the same crest.
    const joins = (inner: number, outer: number) => {
      const jump = this.nextCrest[outer] - this.nextCrest[inner];
      return this.state[outer] !== NONE && this.wave[outer] === id && jump <= crestJump && -jump <= crestJump;
    };
    let from = column;
    let to = column;
    while (from > first && column - from < NORMAL_REACH && joins(lens - (column - from), lens - (column - from) - 1)) from -= 1;
    while (to < last - 1 && to - column < NORMAL_REACH && joins(lens + (to - column), lens + (to - column) + 1)) to += 1;
    let slope = 0;
    if (to > from) {
      const count = to - from + 1;
      let meanX = 0;
      let meanZ = 0;
      for (let c = from; c <= to; c += 1) {
        meanX += c * dx;
        meanZ += this.nextCrest[slot * nx + c];
      }
      meanX /= count;
      meanZ /= count;
      let across = 0;
      let spread = 0;
      for (let c = from; c <= to; c += 1) {
        const x = c * dx - meanX;
        across += x * (this.nextCrest[slot * nx + c] - meanZ);
        spread += x * x;
      }
      slope = across / spread;
    }
    const nz = 1 / Math.sqrt(1 + slope * slope);
    this.normalZ[lens] = nz;
    this.normalX[lens] = -slope * nz;
  }

  /** The lens's speed and life this step (R3 §1.4); false once it is gone. */
  private advance(lens: number, column: number, slot: number, time: number, step: number, breakerDepth: number): boolean {
    const { options } = this;
    const found = this.found[lens] === 1;
    const fresh = this.fresh[lens] === 1;
    const nz = this.normalZ[lens];
    if (!fresh && found && step > 0) {
      const measured = ((this.nextCrest[lens] - this.crest[lens]) / step) * nz;
      this.speed[lens] += ((measured - this.speed[lens]) * step) / (options.relax + step);
    }
    this.crest[lens] = this.nextCrest[lens];
    if (fresh) return true;
    const swash = this.troughDepth[lens] < options.swashDepth || (found && this.dryToe[lens] === 1);
    const froude2 = this.froude2[lens];
    const strength = this.strength[lens];
    if (found && !swash && (strength >= options.birthStrength) !== (froude2 >= options.birthFroude2)) this.counts.disagree += 1;
    const stall = swash && this.speed[lens] < options.stallSpeed;
    const reason: RollerShed['reason'] | undefined = stall ? 'stall' : !found ? 'lost'
      : !swash && froude2 < options.shedFroude2 ? 'froude' : strength < options.shedStrength ? 'strength' : undefined;
    if (this.state[lens] === ACTIVE) {
      if (stall) {
        this.startShedding(lens, column, slot, time, 'stall');
      } else if (reason) {
        this.hold[lens] += step;
        if (this.hold[lens] >= options.shedHold - HOLD_SLACK) this.startShedding(lens, column, slot, time, reason);
      } else {
        this.hold[lens] = 0;
      }
    } else if (found && !stall && strength >= options.birthStrength && (swash || froude2 >= options.birthFroude2)) {
      // Breaking again (R3 §1.4): it grows on from the scale it kept.
      this.state[lens] = ACTIVE;
      this.hold[lens] = 0;
      this.travel[lens] = this.scale[lens] * options.growthDepths * breakerDepth;
    }
    this.travel[lens] += this.speed[lens] * step;
    if (this.state[lens] === ACTIVE) {
      this.scale[lens] = development(this.travel[lens], breakerDepth, options);
      return true;
    }
    const thickness = crestThickness(this.height[lens], this.length[lens], options);
    const keep = thickness > 0 ? 1 - (step * options.riseSpeed) / thickness : 0;
    this.scale[lens] *= keep > 0 ? keep : 0;
    if (this.scale[lens] < options.minG) {
      this.clearLens(lens);
      return false;
    }
    return true;
  }

  private startShedding(lens: number, column: number, slot: number, time: number, reason: RollerShed['reason']): void {
    this.state[lens] = SHEDDING;
    this.hold[lens] = 0;
    this.counts.shed += 1;
    this.onShed?.({
      time, column, slot, wave: this.wave[lens], froude2: this.froude2[lens], strength: this.found[lens] === 1 ? this.strength[lens] : Number.NaN, reason,
    });
  }

  /** Its length L_r from this step's section, relaxed over `relax` (R3 §1.1, §1.3). */
  private shape(lens: number, step: number, breakerDepth: number): void {
    if (this.found[lens] !== 1) return;
    const { options } = this;
    const measured = (this.toe[lens] - this.crest[lens]) * this.normalZ[lens];
    const phi = development(this.travel[lens], breakerDepth, options);
    const target = rollerLength(measured > 0 ? measured : 0, this.height[lens], phi, options);
    const length = this.length[lens];
    this.length[lens] = this.fresh[lens] === 1 || !(length > 0) ? target : length + ((target - length) * step) / (options.relax + step);
  }

  /** The table: each lens behind its front (or anywhere, with the solver's mask), smoothed along the crest. */
  private writeTable(time: number, front: SpillingFront, first: number, last: number): void {
    const { grid, options, table } = this;
    const { nx } = grid;
    table.fill(0);
    this.tableWaves.fill(-1);
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      for (let column = first; column < last; column += 1) {
        const lens = slot * nx + column;
        if (this.state[lens] === NONE || !(this.length[lens] > 0)) continue;
        let g = this.scale[lens];
        let length = this.length[lens];
        if (options.mask === 'front') {
          // The lens's wave: a dropped one counts as reached, long ago.
          let wave = -1;
          for (let k = 0; k < front.waves.length; k += 1) if (front.waves[k].id === this.wave[lens]) wave = k;
          if (wave >= 0) {
            const { reached: reachedAt, joinedAt } = front.waves[wave];
            const reached = reachedAt[column];
            if (!(reached === reached)) {
              this.counts.masked += 1;
              continue;
            }
            const joined = joinedAt[column];
            const age = time - (joined === joined ? Math.max(reached, joined) : reached);
            const { rampSeconds, lineWidth, growth, lineShare } = front.options;
            if (age < rampSeconds) {
              // S2's ramp: the band grows down the face from its thin crest line, with the foam.
              const a = age > 0 ? age : 0;
              length = Math.min(length, lineWidth + growth * a);
              g *= lineShare + ((1 - lineShare) * a) / rampSeconds;
            }
          }
        }
        const o = lens * ROLLER_STRIDE;
        const speed = this.speed[lens];
        table[o + ROLLER_FIELD.crest] = this.crest[lens];
        table[o + ROLLER_FIELD.length] = length / this.normalZ[lens];
        table[o + ROLLER_FIELD.scale] = g;
        table[o + ROLLER_FIELD.thickness] = crestThickness(this.height[lens], this.length[lens], options);
        table[o + ROLLER_FIELD.flowX] = speed * this.normalX[lens];
        table[o + ROLLER_FIELD.flowZ] = speed * this.normalZ[lens];
        table[o + ROLLER_FIELD.troughDepth] = this.troughDepth[lens];
        table[o + ROLLER_FIELD.roughness] = toeRoughness(this.froude2[lens], this.troughDepth[lens]);
        this.tableWaves[lens] = this.wave[lens];
      }
    }
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      alongCrest(table, slot * nx * ROLLER_STRIDE, this.tableWaves.subarray(slot * nx, (slot + 1) * nx), nx, grid.dx, options);
    }
  }

  /**
   * The thickest slot's lens at (x, z), cut to half the depth; its scale in pickG and, with `flow`, its water's velocity
   * in pickFlow. A point outside a lens's crest-to-toe span leaves after reading its crest and length.
   */
  private thicknessAt(x: number, z: number, flow: boolean): number {
    const { grid, table } = this;
    const { nx, dx } = grid;
    const gx = (x - grid.xCenters[0]) / dx;
    if (!(gx >= 0 && gx <= nx - 1) || nx < 2) return 0;
    const i0 = Math.min(nx - 2, Math.floor(gx));
    const tx = gx - i0;
    const taper = this.options.rearTaper;
    let best = 0;
    let picked = -1;
    let pickedW0 = 0;
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      const o0 = (slot * nx + i0) * ROLLER_STRIDE;
      const o1 = o0 + ROLLER_STRIDE;
      const g0 = table[o0 + SCALE];
      const g1 = table[o1 + SCALE];
      const live0 = g0 > 0;
      const live1 = g1 > 0;
      if (!live0 && !live1) continue;
      // An empty neighbour gives no scale and the live column's geometry.
      const w0 = live0 ? (live1 ? 1 - tx : 1) : 0;
      const w1 = 1 - w0;
      const length = w0 * table[o0 + LENGTH] + w1 * table[o1 + LENGTH];
      if (!(length > 0)) continue;
      const xi = (z - (w0 * table[o0 + CREST] + w1 * table[o1 + CREST])) / length;
      if (!(xi > -taper && xi < 1)) continue;
      const g = (1 - tx) * (live0 ? g0 : 0) + tx * (live1 ? g1 : 0);
      const thickness = lensThickness(xi, w0 * table[o0 + THICKNESS] + w1 * table[o1 + THICKNESS], g, taper);
      if (thickness > best) {
        best = thickness;
        picked = o0;
        pickedW0 = w0;
        this.pickG = g;
      }
    }
    if (!(best > 0)) return 0;
    if (flow) {
      const o1 = picked + ROLLER_STRIDE;
      this.pickFlowX = pickedW0 * table[picked + FLOW_X] + (1 - pickedW0) * table[o1 + FLOW_X];
      this.pickFlowZ = pickedW0 * table[picked + FLOW_Z] + (1 - pickedW0) * table[o1 + FLOW_Z];
    }
    const half = 0.5 * this.depthAt(x, z);
    return best > half ? (half > 0 ? half : 0) : best;
  }

  /** The water's depth at (x, z): the solver's depth, bilinear between cell centres. */
  private depthAt(x: number, z: number): number {
    const { nx, nz, dx, xCenters, zCenters, h } = this.grid;
    const gx = Math.min(nx - 1, Math.max(0, (x - xCenters[0]) / dx));
    const ix = Math.min(nx - 2, Math.floor(gx));
    const tx = gx - ix;
    const iz = rowBelow(zCenters, nz, z);
    const tz = Math.min(1, Math.max(0, (z - zCenters[iz]) / (zCenters[iz + 1] - zCenters[iz])));
    const i = iz * nx + ix;
    return (h[i] * (1 - tx) + h[i + 1] * tx) * (1 - tz) + (h[i + nx] * (1 - tx) + h[i + nx + 1] * tx) * tz;
  }
}
