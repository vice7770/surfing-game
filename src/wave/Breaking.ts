import { GRAVITY } from './dispersion';
import type { ShallowWaterSolver } from './ShallowWaterSolver';
import { BREAKER_INDEX } from './SwellReadout';

export interface BreakingOptions {
  /** Onset threshold on the surface rise rate, as a fraction of √(gh) (Kennedy et al. 2000: 0.35–0.65). */
  onset: number;
  /** Threshold once breaking is established, as a fraction of √(gh). */
  end?: number;
  /** Onset-to-end transition time T* in units of √(h/g). */
  transition?: number;
}

const MIN_DEPTH = 0.05;

function ramp(value: number, from: number, to: number): number {
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}

/**
 * Stage 1 bore criterion. The shallow-water solver smears a bore over 2–3 cells,
 * so the Kennedy rise rate depends on resolution: the peak measured on the reef
 * was 0.33 √(gh) with 2 m cells and 0.70 √(gh) with 1 m cells, against a 0.65
 * onset. A rising front counts as breaking when it is both steep (slope 0.10 →
 * 0.25) and depth-limited (η/h 0.15 → 0.30, scaled by the wind). The second
 * condition keeps the solver's non-dispersive steepening offshore from reading as
 * surf.
 */
export function boreStrength(slope: number, relativeHeight: number, scale = 1): number {
  return ramp(slope, 0.1, 0.25) * ramp(relativeHeight, 0.15 * scale, 0.3 * scale);
}

/**
 * Breaking indicator on the stage 1 solver (plan §1.8, Q27): the larger of the
 * Kennedy et al. (2000) rise-rate test and the stage 1 bore criterion
 * (`boreStrength`). A cell breaks when its surface rises faster than η_t*; η_t* starts at
 * the onset fraction of √(gh) and ramps to the end fraction over T* = 5√(h/g).
 * A cell inherits the breaking age of breaking neighbours, so a travelling
 * bore keeps its age. In stage 1 this is an indicator for rendering, readouts
 * and the lip only; the shock-capturing solver already dissipates the bore.
 */
export class BreakingModel {
  /** Breaking strength B in [0, 1] per cell. */
  readonly strength: Float64Array;
  /** Seconds since breaking began for the bore that covers each cell. */
  readonly age: Float64Array;
  /** Multiplies the onset threshold; the local wind shifts it (plan Q23). */
  onsetScale = 1;
  private readonly previousSurface: Float64Array;
  private readonly nextStrength: Float64Array;
  private readonly nextAge: Float64Array;
  private primed = false;

  constructor(private readonly solver: ShallowWaterSolver, readonly options: BreakingOptions) {
    const size = solver.nx * solver.nz;
    this.strength = new Float64Array(size);
    this.age = new Float64Array(size);
    this.previousSurface = new Float64Array(size);
    this.nextStrength = new Float64Array(size);
    this.nextAge = new Float64Array(size);
  }

  update(dt: number): void {
    const { nx, nz, h, bed, dx, zCenters, restLevel } = this.solver;
    if (!this.primed || !(dt > 0)) {
      for (let i = 0; i < h.length; i += 1) this.previousSurface[i] = h[i] + bed[i];
      this.primed = true;
      return;
    }
    const onset = this.options.onset * this.onsetScale;
    const end = this.options.end ?? 0.15;
    const transition = this.options.transition ?? 5;
    for (let iz = 0; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const surface = h[i] + bed[i];
        const rise = (surface - this.previousSurface[i]) / dt;
        this.previousSurface[i] = surface;
        const depth = h[i];
        if (depth <= MIN_DEPTH) {
          this.nextStrength[i] = 0;
          this.nextAge[i] = 0;
          continue;
        }
        let inherited = this.strength[i] > 0 ? this.age[i] : 0;
        if (ix > 0 && this.strength[i - 1] > 0) inherited = Math.max(inherited, this.age[i - 1]);
        if (ix < nx - 1 && this.strength[i + 1] > 0) inherited = Math.max(inherited, this.age[i + 1]);
        if (iz > 0 && this.strength[i - nx] > 0) inherited = Math.max(inherited, this.age[i - nx]);
        if (iz < nz - 1 && this.strength[i + nx] > 0) inherited = Math.max(inherited, this.age[i + nx]);
        const ramp = Math.min(1, inherited / (transition * Math.sqrt(depth / GRAVITY)));
        const threshold = Math.sqrt(GRAVITY * depth) * (onset + (end - onset) * ramp);
        let breaking = Math.min(1, Math.max(0, rise / threshold - 1));
        const stillDepth = restLevel - bed[i];
        if (rise > 0 && stillDepth > 0.1 && ix > 0 && ix < nx - 1 && iz > 0 && iz < nz - 1) {
          const slopeX = (h[i + 1] + bed[i + 1] - h[i - 1] - bed[i - 1]) / (2 * dx);
          const slopeZ = (h[i + nx] + bed[i + nx] - h[i - nx] - bed[i - nx]) / (zCenters[iz + 1] - zCenters[iz - 1]);
          breaking = Math.max(breaking, boreStrength(Math.hypot(slopeX, slopeZ), (surface - restLevel) / stillDepth, this.onsetScale));
        }
        this.nextStrength[i] = breaking;
        this.nextAge[i] = breaking > 0 ? inherited + dt : 0;
      }
    }
    this.strength.set(this.nextStrength);
    this.age.set(this.nextAge);
  }
}

/** Depth where Green's-law shoaling from the tank depth first reaches H = γh: h_b = (Hs·D^¼/γ)^⅘, m. */
export function breakerDepthFor(significantHeight: number, tankDepth: number, gamma = BREAKER_INDEX): number {
  return Math.pow((significantHeight * Math.pow(tankDepth, 0.25)) / gamma, 0.8);
}

export interface PeelEstimate {
  /** Peel angle α between the whitewater trail and the unbroken crest, degrees; 0 is a close-out. */
  angleDegrees: number;
  /** +1 when the break peels toward +x, −1 toward −x, 0 when it closes out. */
  direction: number;
  /** Along-shore speed of the break point, m/s. */
  peelSpeed: number;
  columns: number;
  /** r² of the onset-time fit; low values mean several peaks at once. */
  fit: number;
}

export type PeelSkill = 'beginner' | 'intermediate' | 'advanced' | 'professional' | 'closeout';

/**
 * Minimum makeable peel angles by skill (Hutt, Black & Mead 2001, from secondary
 * copies): 60° beginner, 40° intermediate, 29° top amateur, 27° professional.
 */
export function skillForPeel(angleDegrees: number): PeelSkill {
  if (angleDegrees >= 60) return 'beginner';
  if (angleDegrees >= 40) return 'intermediate';
  if (angleDegrees >= 29) return 'advanced';
  if (angleDegrees >= 27) return 'professional';
  return 'closeout';
}

/**
 * Measures peel from when each along-shore column starts breaking. The break
 * point runs along the crest at V = 1 / |dt_onset/dx|, and sin α = c_b / V
 * (Walker 1974; Hutt et al. 2001), so a close-out that breaks everywhere at
 * once gives α ≈ 0.
 */
export class PeelTracker {
  private readonly lastBreaking: Float64Array;
  private readonly onset: Float64Array;

  constructor(private readonly xs: ArrayLike<number>, private readonly window: number, private readonly quiet = 0.8) {
    this.lastBreaking = new Float64Array(xs.length).fill(-Infinity);
    this.onset = new Float64Array(xs.length).fill(Number.NaN);
  }

  /** Note which columns are breaking at `time`; a column restarting after `quiet` seconds starts a new onset. */
  record(time: number, isBreaking: (column: number) => boolean): void {
    for (let column = 0; column < this.xs.length; column += 1) {
      if (!isBreaking(column)) continue;
      if (time - this.lastBreaking[column] > this.quiet) this.onset[column] = time;
      this.lastBreaking[column] = time;
    }
  }

  /** Fit onset time against x over recent onsets, leaving out `margin` of the columns at each open edge. */
  estimate(time: number, celerity: number, margin = 0.1): PeelEstimate | undefined {
    const first = Math.floor(this.xs.length * margin);
    const last = this.xs.length - first;
    let count = 0;
    let sumX = 0;
    let sumT = 0;
    for (let column = first; column < last; column += 1) {
      const onset = this.onset[column];
      if (!(onset >= time - this.window && onset <= time)) continue;
      count += 1;
      sumX += this.xs[column];
      sumT += onset;
    }
    if (count < 8) return undefined;
    const meanX = sumX / count;
    const meanT = sumT / count;
    let sxx = 0;
    let sxt = 0;
    let stt = 0;
    for (let column = first; column < last; column += 1) {
      const onset = this.onset[column];
      if (!(onset >= time - this.window && onset <= time)) continue;
      const dx = this.xs[column] - meanX;
      const dt = onset - meanT;
      sxx += dx * dx;
      sxt += dx * dt;
      stt += dt * dt;
    }
    const slope = sxx > 0 ? sxt / sxx : 0;
    const sine = Math.min(1, celerity * Math.abs(slope));
    return {
      angleDegrees: (Math.asin(sine) * 180) / Math.PI,
      direction: slope > 1e-9 ? 1 : slope < -1e-9 ? -1 : 0,
      peelSpeed: Math.abs(slope) > 0 ? 1 / Math.abs(slope) : Infinity,
      columns: count,
      fit: sxx > 0 && stt > 0 ? (sxt * sxt) / (sxx * stt) : 0,
    };
  }
}
