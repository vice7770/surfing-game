import { SEAWATER_DENSITY } from './PhysicalSurfWater';

/**
 * The provisional B0 reference rider and shortboard (board plan's integration
 * handoff). It combines two measured sources, which makes it a modelling choice
 * rather than one measured board-and-rider system. P4c builds the board body from
 * it; the legacy board keeps its own effective values (`LEGACY_BOARD`) until then.
 */
export const REFERENCE_RIDER = {
  /** kg: an intermediate participant in an ocean-wave shortboard field study. */
  mass: 73,
  source: 'Shormann & in het Panhuis 2020, PLOS ONE 15(5): e0232035, Table 1',
} as const;

export const REFERENCE_BOARD = {
  /** m */
  length: 1.778,
  width: 0.464,
  thickness: 0.0667,
  /** m³ (25.75 L) */
  volume: 0.02575,
  /** kg, the finished shell without fins */
  mass: 2.54,
  fins: 'thruster (three fins); areas and positions are P4e calibration inputs',
  source: 'Connellan et al. 2026, Advanced Engineering Materials, Table 1 (DP-1, PU/stringer)',
} as const;

/** What the legacy `BoardPhysics` and board mesh use today: effective game values, not physical ones. */
export const LEGACY_BOARD = {
  renderedLength: 2.65,
  /** kg, an effective mass that stands in for missing rider contact forces */
  simulationMass: 80,
  riderMass: 74,
  /** m, the four hull contacts sit at ±(0.22, 1.05) */
  contactHalfWidth: 0.22,
  contactHalfLength: 1.05,
} as const;

/** How much of the reference rider and board the fully submerged board could float, at rest. */
export function referenceFlotation(): { buoyantMass: number; unsupportedFraction: number } {
  const buoyantMass = REFERENCE_BOARD.volume * SEAWATER_DENSITY;
  const total = REFERENCE_RIDER.mass + REFERENCE_BOARD.mass;
  return { buoyantMass, unsupportedFraction: 1 - buoyantMass / total };
}
