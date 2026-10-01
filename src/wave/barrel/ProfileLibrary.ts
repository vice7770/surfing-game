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
  /** Per frame, the lip tip's velocity (along x, up) in √(g h0), a local line over ±4 frames; absent in a BRL1 file (zero). */
  tipVelocity?: Float32Array;
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
  /** The lip tip's velocity, m/s: along the profile's x (the slice's shoreward ray) and up (the advisor's ruling 1). */
  tipAlong: number;
  tipUp: number;
  /**
   * The last clear τ, s: the earlier of the two blended cases' held frames (`heldFrame`), where the jet stands off the
   * face and the void is open, so the contact holds its geometry there after touchdown, never self-crossing.
   */
  clearSeconds: number;
  /**
   * How long the slice's tube takes to collapse after touchdown, s: the roof's free fall through the held frame's void,
   * √(2W/g) (`PlungingLip`'s collapse, G9's mechanism, provisional), W blended by the cases' weights and scaled by h0.
   * The drawing and the contact fade over it together (the advisor, 2026-09-30).
   */
  collapseSeconds: number;
}

/**
 * The contact's held frame (the advisor, 2026-09-30): the jet off the face and the void open, each by `gap`, h0: 2 cells
 * at level 12 on the runs' 48 h0 domain (tools/basilisk/run_padang.sh; the periodic run's cells are 64/4096 h0).
 */
export const CLEAR = { gap: (2 * 48) / 4096 } as const;

/** A case's held frame: its τ (√(h0/g)), its void's height (h0), and whether it passed `CLEAR`'s tests. */
export interface HeldFrame {
  tau: number;
  voidHeight: number;
  clear: boolean;
}

const FLOATS = 2 * PROFILE_POINTS;
/** A slice whose slope is this far (relative) from every case's is outside the library. */
const SLOPE_TOLERANCE = 0.2;

/**
 * The highest point of frame f's lower surface (the face and on, from the throat to the front end) under (x, y), h0;
 * NaN where none lies under it.
 */
function surfaceBeneath(frames: Float32Array, f: number, x: number, y: number): number {
  const o = f * FLOATS;
  let best = Number.NaN;
  for (let i = LANDMARK.throat; i < LANDMARK.front; i += 1) {
    const x0 = frames[o + 2 * i];
    const x1 = frames[o + 2 * i + 2];
    if (x0 === x1 || (x0 - x) * (x1 - x) > 0) continue;
    const y0 = frames[o + 2 * i + 1];
    const under = y0 + ((x - x0) / (x1 - x0)) * (frames[o + 2 * i + 3] - y0);
    if (under < y && !(under <= best)) best = under;
  }
  return best;
}

/** Frame f's void height, h0: the most its underside (tip to throat) stands over the lower surface beneath it. */
function voidHeightAt(frames: Float32Array, f: number): number {
  const o = f * FLOATS;
  let height = 0;
  for (let i = LANDMARK.lip; i <= LANDMARK.throat; i += 1) {
    const y = frames[o + 2 * i + 1];
    const gap = y - surfaceBeneath(frames, f, frames[o + 2 * i], y);
    if (gap > height) height = gap;
  }
  return height;
}

/**
 * A case's held frame (the advisor, 2026-09-30): the last frame, at or before one frame before touchdown, whose tip
 * stands `CLEAR.gap` over the lower surface beneath it (the jet off the face) and `CLEAR.gap` ahead of its throat (the
 * void open, not collapsed onto the face as pad19-a30-l12's last two frames are); its void's height there. With none
 * such, the frame before touchdown, unclear.
 */
export function heldFrame(c: BarrelCase): HeldFrame {
  const count = c.frames.length / FLOATS;
  const last = Math.min(count - 1, Math.floor((c.touchdown - c.tauStart) / c.tauStep + 1e-6) - 1);
  for (let f = last; f >= 0; f -= 1) {
    const o = f * FLOATS;
    const tipX = c.frames[o + 2 * LANDMARK.lip];
    const tipY = c.frames[o + 2 * LANDMARK.lip + 1];
    if (tipX - c.frames[o + 2 * LANDMARK.throat] < CLEAR.gap) continue;
    if (!(tipY - surfaceBeneath(c.frames, f, tipX, tipY) >= CLEAR.gap)) continue;
    return { tau: c.tauStart + f * c.tauStep, voidHeight: voidHeightAt(c.frames, f), clear: true };
  }
  const f = Math.max(0, last);
  return { tau: c.tauStart + f * c.tauStep, voidHeight: voidHeightAt(c.frames, f), clear: false };
}

/** The cases a slice blends and by how much (its A0 between theirs), its scale h0 (m), and whether it fell outside them. */
export interface CaseBlend {
  lower: BarrelCase;
  upper: BarrelCase;
  weight: number;
  scale: number;
  clamped: boolean;
}

export class ProfileLibrary {
  private readonly bySlope: BarrelCase[][];
  private readonly held = new Map<BarrelCase, HeldFrame>();
  private readonly scratch = new Float32Array(FLOATS);
  private readonly tipLower = new Float64Array(2);
  private readonly tipUpper = new Float64Array(2);

  constructor(readonly cases: readonly BarrelCase[]) {
    const groups = new Map<number, BarrelCase[]>();
    for (const c of cases) groups.set(c.slope, [...(groups.get(c.slope) ?? []), c]);
    this.bySlope = [...groups.values()].map((group) => [...group].sort((a, b) => a.nonlinearity - b.nonlinearity));
    for (const c of cases) this.held.set(c, heldFrame(c));
  }

  /** The profile for a slice, in metres, into `out` (PROFILE_POINTS (x, y) pairs). */
  profileAt(query: ProfileQuery, out: Float32Array): ProfileLookup {
    const b = this.bracket(query);
    const tau = query.seconds / b.unit;
    this.frameAt(b.lower, tau, out);
    if (b.upper !== b.lower) {
      this.frameAt(b.upper, tau, this.scratch);
      for (let i = 0; i < FLOATS; i += 1) out[i] += b.weight * (this.scratch[i] - out[i]);
    }
    for (let i = 0; i < FLOATS; i += 1) out[i] *= b.scale;
    const tip = this.tipLower;
    this.tipAt(b.lower, tau, tip);
    if (b.upper !== b.lower) {
      this.tipAt(b.upper, tau, this.tipUpper);
      tip[0] += b.weight * (this.tipUpper[0] - tip[0]);
      tip[1] += b.weight * (this.tipUpper[1] - tip[1]);
    }
    // √(g h0), the cases' velocity unit.
    const speed = b.scale / b.unit;
    const phase = tau < 0 ? 'pre' : tau <= b.touchdown ? 'open' : 'post';
    return {
      caseId: b.weight < 0.5 ? b.lower.id : b.upper.id, clamped: b.clamped, scale: b.scale, phase,
      touchdownSeconds: b.touchdown * b.unit, frameSeconds: b.frameStep * b.unit,
      tipAlong: tip[0] * speed, tipUp: tip[1] * speed, clearSeconds: b.clear * b.unit, collapseSeconds: b.collapse,
    };
  }

  /** A slice's scale and times, s, as `profileAt` finds them, without building its profile (the loft's refinement and budget). */
  profileTimes(query: Omit<ProfileQuery, 'seconds'>): {
    scale: number; clamped: boolean; touchdownSeconds: number; frameSeconds: number; clearSeconds: number; collapseSeconds: number;
  } {
    const b = this.bracket(query);
    return {
      scale: b.scale, clamped: b.clamped, touchdownSeconds: b.touchdown * b.unit, frameSeconds: b.frameStep * b.unit, clearSeconds: b.clear * b.unit,
      collapseSeconds: b.collapse,
    };
  }

  /** A case's held frame, as the library measured it when it loaded. */
  heldFrameOf(c: BarrelCase): HeldFrame {
    return this.held.get(c) ?? heldFrame(c);
  }

  /** The cases a slice blends and by how much, and its scale, as `profileAt` blends and scales them (the crash's held overturn, PR 5). */
  caseBlend(query: Omit<ProfileQuery, 'seconds'>): CaseBlend {
    const b = this.bracket(query);
    return { lower: b.lower, upper: b.upper, weight: b.weight, scale: b.scale, clamped: b.clamped };
  }

  /** The cases a slice blends (the nearest slope's two bracketing its A0), its scale (h0, m) and τ's unit, s. */
  private bracket(query: Omit<ProfileQuery, 'seconds'>) {
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
    const heldLower = this.heldFrameOf(lower);
    const heldUpper = this.heldFrameOf(upper);
    // The void's height, m: the held frames' blended by the cases' weights, scaled by h0.
    const voidHeight = (heldLower.voidHeight + weight * (heldUpper.voidHeight - heldLower.voidHeight)) * scale;
    return {
      lower, upper, weight, clamped, scale, unit: Math.sqrt(scale / GRAVITY),
      touchdown: lower.touchdown + weight * (upper.touchdown - lower.touchdown),
      frameStep: lower.tauStep + weight * (upper.tauStep - lower.tauStep),
      clear: Math.min(heldLower.tau, heldUpper.tau),
      collapse: Math.sqrt((2 * voidHeight) / GRAVITY),
    };
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

  /** One case's tip velocity at τ, √(g h0), linear between frames as `frameAt` (zero for a BRL1 case). */
  private tipAt(c: BarrelCase, tau: number, into: Float64Array): void {
    into[0] = 0;
    into[1] = 0;
    if (!c.tipVelocity) return;
    const count = c.tipVelocity.length / 2;
    const position = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
    const f = Math.floor(position);
    const next = Math.min(count - 1, f + 1);
    const t = position - f;
    into[0] = c.tipVelocity[2 * f] + t * (c.tipVelocity[2 * next] - c.tipVelocity[2 * f]);
    into[1] = c.tipVelocity[2 * f + 1] + t * (c.tipVelocity[2 * next + 1] - c.tipVelocity[2 * f + 1]);
  }
}
