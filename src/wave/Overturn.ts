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

/** The void's length along its long axis and its width across it, m, under a wave H m high. */
export function overturnSize(shape: OverturnShape, height: number): { length: number; width: number } {
  const length = height * Math.sqrt(shape.area / (LH82_AREA * shape.aspect));
  return { length, width: shape.aspect * length };
}

/**
 * How fast, relative to its crest, a ballistic jet leaves level to fly the
 * void's long axis: it covers L cos θ while it falls L sin θ, m/s. Added to
 * the crest's speed, this spans 1.2–1.75 times it over the fitted range, as
 * measured jets do: 1.15–1.18 (Erinin et al. 2023), 1.3 (Perlin et al. 1996),
 * 1.68 (Chang & Liu 1998) and 1.73 (Kjeldsen 1984).
 */
export function jetRelativeSpeed(shape: OverturnShape, height: number): number {
  const { length } = overturnSize(shape, height);
  const flight = Math.sqrt((2 * length * Math.sin(shape.tilt)) / GRAVITY);
  return (length * Math.cos(shape.tilt)) / flight;
}
