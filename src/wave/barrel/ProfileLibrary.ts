import { GRAVITY } from '../dispersion';

/**
 * The swept barrel's profile library (the Padang Padang spec, Part B): simulated 2D breakers (Basilisk, the advisor's
 * tools/basilisk) resampled to 128 points with crest, lip tip, throat and toe at fixed indices, so profiles blend
 * point by point (docs/research/water-physics/swept-barrel-build.md). Each case holds its frames in h0 (the depth at
 * the slope's foot) and τ in √(h0/g) from the face going vertical. A slice picks the nearest slope's cases, blends
 * the two bracketing its H0/h0 (its foot crest over its foot depth), and scales them by Froude to the slice's foot
 * crest (h0 = η_foot / A0, the advisor 2026-09-30): its foot depth inside the cases, the nearest case's own A0 outside.
 * It never extrapolates: outside the cases it clamps and says so. Only + − × ÷ and √, for online determinism.
 */
export const PROFILE_POINTS = 128;
export const LANDMARK = { back: 0, crest: 32, lip: 64, throat: 88, toe: 112, front: 127 } as const;

export interface BarrelCase {
  id: string;
  /** The bed's slope along the wave's path. */
  slope: number;
  /** H0/h0: the wave's height at the slope's foot over the depth there. */
  nonlinearity: number;
  /** The flat's depth beyond the slope, in h0. */
  flatDepth: number;
  /** H_I, the crest's height at touchdown, in h0. */
  breakerHeight: number;
  /** τ between frames, and at the first, in √(h0/g). */
  tauStep: number;
  tauStart: number;
  /** τ at touchdown. */
  touchdown: number;
  /** Per frame, PROFILE_POINTS (x, y) pairs in h0: x forward from the crest at τ = 0, y up from still water. */
  frames: Float32Array;
}

export interface ProfileQuery {
  slope: number;
  /** The slice's crest height at the slope's foot, m, and the still depth there, m: H0/h0 is their ratio. */
  footHeight: number;
  footDepth: number;
  /** τ, s. */
  seconds: number;
}

export interface ProfileLookup {
  caseId: string;
  /** The query fell outside the library's cases, so the nearest was used. */
  clamped: boolean;
  /** h0, m: the length the case's units scale to. */
  scale: number;
  phase: 'pre' | 'open' | 'post';
  /** τ at touchdown, and between two frames, s. */
  touchdownSeconds: number;
  frameSeconds: number;
}

const FLOATS = 2 * PROFILE_POINTS;
/** A slice whose slope is this far (relative) from every case's is outside the library. */
const SLOPE_TOLERANCE = 0.2;

export class ProfileLibrary {
  private readonly bySlope: BarrelCase[][];
  private readonly scratch = new Float32Array(FLOATS);

  constructor(cases: readonly BarrelCase[]) {
    const groups = new Map<number, BarrelCase[]>();
    for (const c of cases) groups.set(c.slope, [...(groups.get(c.slope) ?? []), c]);
    this.bySlope = [...groups.values()].map((group) => [...group].sort((a, b) => a.nonlinearity - b.nonlinearity));
  }

  /** The profile for a slice, in metres, into `out` (PROFILE_POINTS (x, y) pairs). */
  profileAt(query: ProfileQuery, out: Float32Array): ProfileLookup {
    let group = this.bySlope[0];
    for (const candidate of this.bySlope) {
      if (Math.abs(candidate[0].slope - query.slope) < Math.abs(group[0].slope - query.slope)) group = candidate;
    }
    let clamped = Math.abs(group[0].slope - query.slope) > SLOPE_TOLERANCE * query.slope;
    const a0 = query.footHeight / query.footDepth;
    let lower = group[0];
    let upper = group[group.length - 1];
    let weight = 0;
    if (a0 <= lower.nonlinearity) {
      clamped ||= a0 < lower.nonlinearity;
      upper = lower;
    } else if (a0 >= upper.nonlinearity) {
      clamped ||= a0 > upper.nonlinearity;
      lower = upper;
    } else {
      for (let k = 0; k + 1 < group.length; k += 1) {
        if (group[k].nonlinearity <= a0 && a0 <= group[k + 1].nonlinearity) {
          lower = group[k];
          upper = group[k + 1];
          weight = (a0 - lower.nonlinearity) / (upper.nonlinearity - lower.nonlinearity);
          break;
        }
      }
    }
    // One case: the slice's foot crest is its; a blend: A0 is the slice's own, so h0 is its foot depth.
    const scale = lower === upper ? query.footHeight / lower.nonlinearity : query.footDepth;
    const unit = Math.sqrt(scale / GRAVITY);
    const tau = query.seconds / unit;
    this.frameAt(lower, tau, out);
    if (upper !== lower) {
      this.frameAt(upper, tau, this.scratch);
      for (let i = 0; i < FLOATS; i += 1) out[i] += weight * (this.scratch[i] - out[i]);
    }
    for (let i = 0; i < FLOATS; i += 1) out[i] *= scale;
    const touchdown = lower.touchdown + weight * (upper.touchdown - lower.touchdown);
    const phase = tau < 0 ? 'pre' : tau <= touchdown ? 'open' : 'post';
    const frameStep = lower.tauStep + weight * (upper.tauStep - lower.tauStep);
    return { caseId: weight < 0.5 ? lower.id : upper.id, clamped, scale, phase, touchdownSeconds: touchdown * unit, frameSeconds: frameStep * unit };
  }

  /** One case's profile at τ (√(h0/g)), linear between its two nearest frames, clamped to its first and last. */
  private frameAt(c: BarrelCase, tau: number, out: Float32Array): void {
    const count = c.frames.length / FLOATS;
    const position = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
    const f = Math.floor(position);
    const next = Math.min(count - 1, f + 1);
    const t = position - f;
    for (let i = 0; i < FLOATS; i += 1) {
      const a = c.frames[f * FLOATS + i];
      out[i] = a + t * (c.frames[next * FLOATS + i] - a);
    }
  }
}
