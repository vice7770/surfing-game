import { PADANG, type SpotName } from '../Bathymetry';
import { PADANG_ONSET, type OnsetTables } from './sliceClock';

/**
 * What a spot needs for the swept barrel (Padang Padang Part B, PR 7): the Navier–Stokes transect its library cases
 * were run on, and where its breaking front follows crests from. A spot draws and rides the swept barrel only when it
 * is in SWEPT_BARREL (src/wave/SurfZoneSimulation.ts, the owner's switch) and has an entry here; switching one on is
 * adding it to SWEPT_BARREL.
 */
export interface BarrelSpot {
  /**
   * The library runs' bed slope along the wave's path (O'Dea et al. 2021's predictor: over half a wavelength offshore
   * of the break): the loft and the contact take the nearest slope's cases.
   */
  slope: number;
  /** The runs' foot: its still depth at mid tide, m (the cases' h0). The front follows and sizes crests from there. */
  footDepth: number;
  /** The transect's join and throw tables (sliceClock). */
  onset: OnsetTables;
  /**
   * Where the front follows crests from: the fine zone's first row (Padang Padang), or the relaxation zone's inner edge,
   * for a spot whose foot lies seaward of its fine zone, in the 4 m cells.
   */
  frontFrom: 'fine' | 'zone';
}

/**
 * Every spot's barrel transect, where its cases are in the library. Padang Padang's is round 6's (the owner's 1:19 along
 * the path from the wedge's 7 m foot, read live for the design sweep).
 */
export const BARREL_SPOTS: Partial<Record<SpotName, BarrelSpot>> = {
  padang: { slope: 1 / 19, get footDepth() { return PADANG.baseDepth; }, onset: PADANG_ONSET, frontFrom: 'fine' },
};
