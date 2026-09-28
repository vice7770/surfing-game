import { GRAVITY } from './dispersion';

/**
 * The overturn a plunging wave draws, carried over from Pick & Feddersen
 * (2026, J. Fluid Mech. 1040 A8): fully nonlinear potential-flow runs of
 * shoaling solitary waves on planar slopes s = 1/100…1/10 with H0/h0 =
 * 0.2…0.6. Their parameter ψ0 = s / (H0/h0)^(1/4) collapses the overturn's
 * size, shape and tilt at jet impact. The depth-averaged surf zone cannot
 * overturn, so a plunging break takes its overturn from these fits.
 */

/** The fitted ψ0 span: overturn areas 0.04–0.43 H² (their figures 8–9). */
export const PSI_RANGE = { min: 0.0156, max: 0.0889 } as const;

/** Area of Longuet-Higgins's (1982) overturn curve, as a fraction of its width times its length. */
export const LH82_AREA = (2 * Math.sqrt(3)) / 5;

export interface OverturnShape {
  /** The void under the jet, A_O / H² (their 3.7). */
  area: number;
  /** The jet itself, A_J / H² (their 3.8): the water thrown. */
  jetArea: number;
  /** The void's width over its length, W_O / L_O (their 3.9). */
  aspect: number;
  /** The void's long axis below the horizontal, rad (their 3.10). */
  tilt: number;
}

/** ψ0 = s / (H0/h0)^(1/4) from the bed slope and the incoming wave's height over the offshore depth. */
export function overturnParameter(slope: number, nonlinearity: number): number {
  return slope / Math.pow(nonlinearity, 0.25);
}

/** The overturn at ψ0, held to the fitted span. */
export function overturn(psi: number): OverturnShape {
  const p = Math.min(PSI_RANGE.max, Math.max(PSI_RANGE.min, psi));
  return {
    area: 5.319 * p - 0.043,
    jetArea: 37.072 * p * p - 0.587 * p + 0.02,
    aspect: 1.661 * p + 0.298,
    tilt: ((-5746.4 * p * p + 225.2 * p + 48.4) * Math.PI) / 180,
  };
}

/**
 * A reef break's overturn (the Teahupo'o Reef spec, Part B; docs/research/teahupoo-reef-sources.md): the
 * tube's width over its length is 1 / Mead & Black's (2001) vortex ratio for the gradient the wave climbs,
 * held within the ratios they measured at surfed breaks, 1.42 (Shark Island, their steepest bed) to 3.43.
 * The fit has no data beyond them, and nothing says a break over a submerged crest collapses (collapse and
 * surge are for slopes that reach the shore), so a steeper bed throws the roundest tube measured and a
 * gentler one breaks as a plane slope does. Inside Pick & Feddersen's fits (ψ0 within their range, slopes to
 * about 1:10) their void area, jet and tilt are sourced, and only the roundness is Mead & Black's. Beyond them,
 * where Teahupo'o's ledge lies, the lip is `lipThickness` of the wave's height thick (Shand 2024) over the
 * void's length, and the void's area and tilt are Pick & Feddersen's at their steepest fit (provisional). The
 * gradient is averaged `band` m above and below the breaking depth: Mead & Black's stated 2–3 m band absorbs
 * height and tide errors, and 2.5 m is the game's pick within it.
 */
export const REEF_OVERTURN = {
  area: 0.43, lipThickness: 0.5, tiltDegrees: 23, roundestRatio: 1.42, gentlestRatio: 3.43, band: 2.5,
  /**
   * The wind over celerity Mead & Black's ratios were measured in: surf-magazine photos, almost surely offshore
   * days, taken as a moderate offshore wind where its rounding saturates (provisional, the shape advisor's).
   */
  windOverCelerity: -0.4,
};

/** Mead & Black's (2001) vortex ratio, the tube's length over its width, for an orthogonal gradient (rise over run). */
export function vortexRatio(orthogonalGradient: number): number {
  return 0.065 * (1 / orthogonalGradient) + 0.821;
}

/**
 * A reef break's overturn for the gradient it climbs, under a sea `nonlinearity` (H0/h0) high, or undefined
 * where it is gentler than any measured.
 */
export function reefOverturn(orthogonalGradient: number, nonlinearity: number): OverturnShape | undefined {
  if (!(orthogonalGradient > 0)) return undefined;
  const fit = vortexRatio(orthogonalGradient);
  if (fit > REEF_OVERTURN.gentlestRatio) return undefined;
  const aspect = 1 / Math.max(REEF_OVERTURN.roundestRatio, fit);
  const psi = overturnParameter(orthogonalGradient, nonlinearity);
  if (psi <= PSI_RANGE.max) return { ...overturn(psi), aspect };
  const lengthOverHeight = Math.sqrt(REEF_OVERTURN.area / (LH82_AREA * aspect));
  return {
    area: REEF_OVERTURN.area,
    jetArea: REEF_OVERTURN.lipThickness * lengthOverHeight,
    aspect,
    tilt: (REEF_OVERTURN.tiltDegrees * Math.PI) / 180,
  };
}

/**
 * Mead & Black's (2001) orthogonal gradient, rise over run: the bed's average gradient along the wave's path
 * from `REEF_OVERTURN.band` shallower (no shallower than the shoreline) to as much deeper than its breaking
 * depth. `depthAhead(s)` is the still depth s m ahead of the break along its travel (behind it for s < 0),
 * NaN off the water it is sampled from, taken every `step` m out to `reach` m each way; a path that runs out
 * first ends where it does.
 */
export function orthogonalGradient(depthAhead: (s: number) => number, breakingDepth: number, step: number, reach: number): number {
  const shallow = Math.max(0, breakingDepth - REEF_OVERTURN.band);
  const deep = breakingDepth + REEF_OVERTURN.band;
  const ahead = contour(depthAhead, 1, shallow, step, reach);
  const behind = contour(depthAhead, -1, deep, step, reach);
  const run = ahead.distance + behind.distance;
  return run > 0 ? (behind.depth - ahead.depth) / run : 0;
}

/** Where the path, walked `direction`, first reaches the `target` depth (shallower ahead, deeper behind): between samples, or at its reach. */
function contour(depthAhead: (s: number) => number, direction: 1 | -1, target: number, step: number, reach: number): { distance: number; depth: number } {
  const reached = (depth: number) => (direction > 0 ? depth <= target : depth >= target);
  let previous = depthAhead(0);
  if (reached(previous)) return { distance: 0, depth: previous };
  for (let k = 1; k * step <= reach; k += 1) {
    const depth = depthAhead(direction * k * step);
    if (!Number.isFinite(depth)) return { distance: (k - 1) * step, depth: previous };
    if (reached(depth)) return { distance: (k - 1 + (target - previous) / (depth - previous)) * step, depth: target };
    previous = depth;
  }
  return { distance: reach, depth: depthAhead(direction * reach) };
}

/** The void's length along its long axis and its width across it, m, under a wave H m high. */
export function overturnSize(shape: OverturnShape, height: number): { length: number; width: number } {
  const length = height * Math.sqrt(shape.area / (LH82_AREA * shape.aspect));
  return { length, width: shape.aspect * length };
}

/** The void in its crest's frame: length and width, m, and its long axis's tilt below the horizontal, rad. */
export interface TubeGeometry {
  length: number;
  width: number;
  tilt: number;
}

/**
 * The void under a wave H m high. Its pointed back sits half its width
 * under the crest, where the face has gone vertical, and its long axis runs
 * forward and down to the round front end where the jet lands.
 */
export function tubeGeometry(shape: OverturnShape, height: number): TubeGeometry {
  return { ...overturnSize(shape, height), tilt: shape.tilt };
}

/**
 * How fast, relative to its crest, a ballistic jet leaves the crest level to
 * land at the void's front end: it covers L cos θ while it falls W/2 + L sin θ,
 * m/s. Added to the crest's speed, this spans 1.2–1.6 times it over the fitted
 * range, as measured jets leave: 1.15–1.18 (Erinin et al. 2023), 1.3 (Perlin
 * et al. 1996), 1.68 (Chang & Liu 1998) and 1.73 (Kjeldsen 1984).
 */
export function jetRelativeSpeed(shape: OverturnShape, height: number): number {
  const { length, tilt } = tubeGeometry(shape, height);
  return (length * Math.cos(tilt)) / jetFlightTime(shape, height);
}

/**
 * How long the jet takes from the crest top to the void's front end, s. The jet
 * keeps pouring from its crest over this long: measured jets take 1.5–1.6 √(H/g)
 * from forming to impact (Erinin et al. 2023).
 */
export function jetFlightTime(shape: OverturnShape, height: number): number {
  const { length, width, tilt } = tubeGeometry(shape, height);
  return Math.sqrt((2 * (width / 2 + length * Math.sin(tilt))) / GRAVITY);
}

/** The half-width of Longuet-Higgins's curve across its axis at u = x′/L along it, as a fraction of W. */
function halfWidth(u: number): number {
  return ((3 * Math.sqrt(3)) / 4) * u * Math.sqrt(Math.max(0, 1 - u));
}

/**
 * How far below its crest the void's floor lies, m, `ahead` m ahead of the
 * crest along its travel; NaN outside the void. The floor is the lower half
 * of Longuet-Higgins's curve, tilted down by θ: the face the rider meets
 * inside a tube.
 */
export function tubeFloorDepth(tube: TubeGeometry, ahead: number): number {
  const { length, width, tilt } = tube;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  if (!(ahead >= 0 && ahead <= length * cos)) return Number.NaN;
  // Along the floor, the distance ahead grows with u (the tilt never turns it back): bisect for u.
  const aheadAt = (u: number) => length * u * cos - width * halfWidth(u) * sin;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 40; step += 1) {
    const middle = (low + high) / 2;
    if (aheadAt(middle) < ahead) low = middle;
    else high = middle;
  }
  const u = (low + high) / 2;
  return width / 2 + length * u * sin + width * halfWidth(u) * cos;
}
