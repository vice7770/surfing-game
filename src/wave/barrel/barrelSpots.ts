import { PADANG, REEF, type SpotName } from '../Bathymetry';
import type { FrontOptions } from './BreakingFront';
import { PADANG_ONSET, type OnsetTables } from './sliceClock';

/**
 * How far over a reef's top its throw's floor sits, m: the pass's Gaussian tail lifts the flat's still depth by up to
 * 0.4 mm across the window, so a floor at exactly the top's depth was never crossed there (a numerical margin, not a
 * physical one; the advisor kept it, 2026-10-01).
 */
export const FLOOR_MARGIN = 0.01;

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
  /** The front's rules beyond Padang Padang's (BreakingFront's `FrontOptions`); none: Padang Padang's. */
  front?: FrontOptions;
}

/**
 * The Reef's transect (Part B, PR 7; the advisor's rulings, 2026-10-01): its 10 m shelf, the ledge at 1:4.2 along the
 * swell's path (the slope the Teahupo'o Reef report measured along the path, and the advisor's periodic_reef42 run) to
 * the 1.5 m reef crest. All provisional.
 * - **The join:** the game's solver's fresh onset on that transect (the spotOnset probe, 2026-10-01: regular waves
 *   driven in 10 m, each wave's highest over the band, the median still depth under its crest where Kennedy's fresh test
 *   first fired, 12 waves a row). Drives that broke before the ledge, whose onsets outnumbered their waves by more than
 *   two (the 5.5 m drive at every period, the 4.5 m at 15 s), are left out: big Reef sets breaking before the ledge sit
 *   outside the ledge's library, a Reef behaviour question for the Reef session. At 16–17 s the 3.5 m drive first breaks
 *   at 2.0 m, against 4.9–5.6 m at 14–15 s: longer periods shoal longer before breaking.
 * - **The band:** Padang Padang's 6–5 m at 7 m, scaled to the 10 m foot (the probe read the same band).
 * - **The throw:** the line through the two runs, foot crest against the still depth where the face goes vertical
 *   (`plunge_measure.py`): reef42's 2.127 m crest at 1.928 m, at the top's edge, and reef42_a35's 3.503 m at 5.159 m,
 *   15 m seaward of the top on the ledge's face, H/d ≈ 0.95 at the vertical in both. So d = 2.35 η − 3.07 (the advisor,
 *   2026-10-01; provisional: a third case near A0 0.28 would test whether it is linear). Through the origin it would
 *   throw reef42's own wave 0.9 m too deep. Bigger waves break deeper: a 4 m crest throws about 6.3 m down the face.
 * - **The floor:** no shallower than the reef's top at the tide, which the line meets at η ≈ 1.95 m. It stands for crests
 *   the solver breaks near the edge (the advisor, refined after the front's check): the smallest waves cross the edge
 *   unbroken (H/h ≈ 0.4 there) and break depth-limited where the inner flat shoals to about 0.73 m, which the ledge's
 *   cases would draw wrongly, so the front's join reach (1.5 H past the throw depth) lets them go as the solver's bores.
 */
const REEF_THROW_SLOPE = (5.159 - 1.928) / (3.503 - 2.127);
const REEF_ONSET: OnsetTables = {
  h0: 10,
  band: [60 / 7, 50 / 7],
  join: [
    { period: 14, rows: [[0.9, 3.69], [1.67, 4.17], [2.41, 4.88], [3.14, 5.83]] },
    { period: 15, rows: [[0.89, 4.17], [1.63, 5.12], [2.26, 5.6]] },
    { period: 16, rows: [[0.9, 4.17], [1.68, 5.12], [2.27, 2.02], [2.83, 2.98]] },
    { period: 17, rows: [[0.89, 4.17], [1.72, 5.36], [2.46, 2.02], [2.92, 3.21]] },
  ],
  throwDepth: { intercept: 1.928 - 2.127 * REEF_THROW_SLOPE, slope: REEF_THROW_SLOPE, heights: [0, Infinity] },
  get floor() { return REEF.crestDepth + FLOOR_MARGIN; },
};

/**
 * Every spot's barrel transect, where its cases are in the library. Padang Padang's is round 6's (the owner's 1:19 along
 * the path from the wedge's 7 m foot, read live for the design sweep); the Reef's, its shelf's 10 m and the ledge along
 * the swell's path. The Reef's fine zone starts at the shelf's edge, so its front follows crests from there.
 *
 * The Reef's front (the advisor's rulings, 2026-10-01; provisional): its crests' highest cells jump forward to the
 * ledge's edge as their faces steepen, so a sized crest follows the furthest crest within 10 m ahead (the advisor's
 * 1.5 H would catch none of the jumps measured); and its small waves break only as they cross onto the top, so a crest
 * may join up to 1.5 of its wave heights past its throw depth.
 */
export const BARREL_SPOTS: Partial<Record<SpotName, BarrelSpot>> = {
  padang: { slope: 1 / 19, get footDepth() { return PADANG.baseDepth; }, onset: PADANG_ONSET, frontFrom: 'fine' },
  reef: {
    slope: 0.238095, get footDepth() { return REEF.shelfDepth; }, onset: REEF_ONSET, frontFrom: 'fine',
    front: { jumpReach: 10, joinPast: 1.5 },
  },
};
