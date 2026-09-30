import { madsenSorensenCelerity } from './BoussinesqSolver';
import { GRAVITY } from './dispersion';

/** A reef's design: a shore-parallel forereef up to a shelf, and an oblique ledge rising from the shelf to the crest. */
export interface LedgePeelInput {
  /** Swell period, s. */
  period: number;
  /** Still depth the swell arrives in (the tank's edge), m. */
  deepDepth: number;
  /** The shelf's still depth, m. */
  shelfDepth: number;
  /** Still depth where the wave breaks on the ledge, m. */
  breakDepth: number;
  /** The swell's direction from shore-normal, degrees, positive toward +x. */
  swellDegrees: number;
  /** The ledge's angle to the shoreline, degrees, reaching shoreward toward +x. */
  ledgeDegrees: number;
  /** The crest's speed at breaking, m/s, for the peel angle; the meter's √(g h_b) when absent. */
  breakerCelerity?: number;
}

export interface LedgePeel {
  /** The swell's direction on the shelf, degrees from shore-normal. */
  shelfDegrees: number;
  /** The crest's angle to the ledge over the shelf, degrees. */
  crestToLedgeDegrees: number;
  /** How fast the break point runs along the ledge, m/s. */
  peelSpeed: number;
  /** The peel angle α with sin α = c_b / peelSpeed (Walker 1974; Hutt, Black & Mead 2001), c_b the breakerCelerity or the peel meter's √(g h_b), degrees. */
  angleDegrees: number;
}

/**
 * The peel a straight ledge makes, by phase matching. The along-ledge wave number
 * is conserved wherever the bed is uniform along the ledge, so the break point
 * runs along it at c_shelf / sin φ whatever the ledge's steepness. Across the
 * shore-parallel forereef, the along-shore wave number is conserved (Snell).
 * Linear and in the solver's own dispersion: a guide for choosing the bed, which
 * the sweep then checks in the solver.
 */
export function ledgePeel(input: LedgePeelInput): LedgePeel {
  const omega = (2 * Math.PI) / input.period;
  const deep = madsenSorensenCelerity(omega, input.deepDepth);
  const shelf = madsenSorensenCelerity(omega, input.shelfDepth);
  const shelfAngle = Math.asin((Math.sin((input.swellDegrees * Math.PI) / 180) * shelf) / deep);
  const crest = shelfAngle + (input.ledgeDegrees * Math.PI) / 180;
  const sine = Math.abs(Math.sin(crest));
  const peelSpeed = sine < 1e-9 ? Infinity : shelf / sine;
  const breaker = input.breakerCelerity ?? Math.sqrt(GRAVITY * input.breakDepth);
  return {
    shelfDegrees: (shelfAngle * 180) / Math.PI,
    crestToLedgeDegrees: (crest * 180) / Math.PI,
    peelSpeed,
    angleDegrees: peelSpeed === Infinity ? 0 : (Math.asin(Math.min(1, breaker / peelSpeed)) * 180) / Math.PI,
  };
}

/**
 * The ray's angle to the edge's normal where the still depth is `depth` on the ramp, degrees: the along-edge wave
 * number is conserved, so sin β / c(depth) = sin φ / c_shelf (Snell along the edge). Mead & Black's gradient is
 * the bed's slope along this ray: the ramp's steepest slope times cos β.
 */
export function rayAngleAt(input: LedgePeelInput, depth: number): number {
  const omega = (2 * Math.PI) / input.period;
  const { crestToLedgeDegrees } = ledgePeel(input);
  const sine = (Math.sin((crestToLedgeDegrees * Math.PI) / 180) * madsenSorensenCelerity(omega, depth)) / madsenSorensenCelerity(omega, input.shelfDepth);
  return (Math.asin(Math.min(1, Math.abs(sine))) * 180) / Math.PI;
}
