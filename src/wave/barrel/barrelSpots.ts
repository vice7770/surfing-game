import { PADANG, REEF, type SpotName } from '../Bathymetry';
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
 * - **The throw:** proportional to the foot crest, d = (1.928 / 2.127) η_foot: reef42's face goes vertical in 1.93 m of
 *   still water for its 2.13 m foot crest, and bigger waves break deeper (a constant would throw Big too late and
 *   Practice too early; the advisor). Its k is fitted again through the origin once the second Reef case (A0 0.35 at
 *   16 s; its level-9 scout read 0.87) lands. No shallower than the reef's top at the tide (its floor): a wave too small
 *   to go vertical on the ledge face plunges as it crosses onto the top, where the step has drained the water (a 0.9 m
 *   wave sees 1.0–1.2 m there, H/h ≈ 0.75–0.9; the advisor, 2026-10-01). Without the floor the Practice sea's crests
 *   (0.8–0.9 m at the foot, throws at 0.73–0.81 m) never reached their throw depth over the 1.5 m top.
 */
const REEF_ONSET: OnsetTables = {
  h0: 10,
  band: [60 / 7, 50 / 7],
  join: [
    { period: 14, rows: [[0.9, 3.69], [1.67, 4.17], [2.41, 4.88], [3.14, 5.83]] },
    { period: 15, rows: [[0.89, 4.17], [1.63, 5.12], [2.26, 5.6]] },
    { period: 16, rows: [[0.9, 4.17], [1.68, 5.12], [2.27, 2.02], [2.83, 2.98]] },
    { period: 17, rows: [[0.89, 4.17], [1.72, 5.36], [2.46, 2.02], [2.92, 3.21]] },
  ],
  throwDepth: { intercept: 0, slope: 1.928 / 2.127, heights: [0, Infinity] },
  get floor() { return REEF.crestDepth; },
};

/**
 * Every spot's barrel transect, where its cases are in the library. Padang Padang's is round 6's (the owner's 1:19 along
 * the path from the wedge's 7 m foot, read live for the design sweep); the Reef's, its shelf's 10 m and the ledge along
 * the swell's path. The Reef's fine zone starts at the shelf's edge, so its front follows crests from there.
 */
export const BARREL_SPOTS: Partial<Record<SpotName, BarrelSpot>> = {
  padang: { slope: 1 / 19, get footDepth() { return PADANG.baseDepth; }, onset: PADANG_ONSET, frontFrom: 'fine' },
  reef: { slope: 0.238095, get footDepth() { return REEF.shelfDepth; }, onset: REEF_ONSET, frontFrom: 'fine' },
};
