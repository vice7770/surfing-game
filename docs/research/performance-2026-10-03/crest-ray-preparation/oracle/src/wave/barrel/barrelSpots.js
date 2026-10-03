"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BARREL_SPOTS = exports.PADANG_FRONT = exports.FLOOR_MARGIN = void 0;
const Bathymetry_1 = require("../Bathymetry");
const sliceClock_1 = require("./sliceClock");
/**
 * How far over a reef's top its throw's floor sits, m: the pass's Gaussian tail lifts the flat's still depth by up to
 * 0.4 mm across the window, so a floor at exactly the top's depth was never crossed there (a numerical margin, not a
 * physical one; the advisor kept it, 2026-10-01).
 */
exports.FLOOR_MARGIN = 0.01;
/**
 * Padang Padang's front rules (the advisor, 2026-10-01; the peak PR): as a crest's face steepens, its highest cell jumps
 * forward, and the crest ahead started a track of its own, unsized, which never joined (163 jumps in 180 s of its Small
 * sea, against 23 joins and 199 lost, with the rule off: as often as the Reef's). So a sized crest continues as the
 * furthest crest within 10 m ahead of it in its column, as the Reef's does. Its join past the throw depth is the Reef's alone.
 */
exports.PADANG_FRONT = { jumpReach: 10 };
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
 * - **Its cases:** reef42 (A0 0.21) alone. reef60 (1:6) waits for per-slice slopes. reef42_a35 (A0 0.35) sets the throw
 *   line but is out of the index: its lip landmark flickers between the curl's top and the jet's tip, so even the
 *   advisor's robust trace leaves 13 of its 77 open frames flagged and its tip fit up to 6 √(g h0) (the bar: about 90 %
 *   clean, at most about 1.5). The small case (A0 ≈ 0.09, over the inner flat) is owed at level 13.
 */
const REEF_THROW_SLOPE = (5.159 - 1.928) / (3.503 - 2.127);
const REEF_ONSET = {
    h0: 10,
    band: [60 / 7, 50 / 7],
    join: [
        { period: 14, rows: [[0.9, 3.69], [1.67, 4.17], [2.41, 4.88], [3.14, 5.83]] },
        { period: 15, rows: [[0.89, 4.17], [1.63, 5.12], [2.26, 5.6]] },
        { period: 16, rows: [[0.9, 4.17], [1.68, 5.12], [2.27, 2.02], [2.83, 2.98]] },
        { period: 17, rows: [[0.89, 4.17], [1.72, 5.36], [2.46, 2.02], [2.92, 3.21]] },
    ],
    throwDepth: { intercept: 1.928 - 2.127 * REEF_THROW_SLOPE, slope: REEF_THROW_SLOPE, heights: [0, Infinity] },
    get floor() { return Bathymetry_1.REEF.crestDepth + exports.FLOOR_MARGIN; },
};
/**
 * The Point's transect (Part B, PR 7; the advisor's rulings, 2026-10-01): its headland's flank at 1:21.5 along the
 * contours' normal (they run 31° off the shoreline there; O'Dea's slope over half a wavelength offshore, every swell)
 * from the 7 m foot, seaward of every set's break, to a 0.35 m flat. All provisional.
 * - **The join:** the game's solver's fresh onset on that transect (the spotOnset probe, 2026-10-01: regular waves driven
 *   in 7 m at the Point's 9, 11, 12 and 14 s, each wave's highest over the band against the still depth under its crest
 *   where Kennedy's fresh test first fired for that wave, the median of 12 waves; the first onset per wave, since the
 *   bigger drives fire 4–8 times a wave). The 0.5 m drives never broke on it.
 * - **The band:** Padang Padang's 6–5 m at its 7 m foot.
 * - **The throw:** a least-squares line through the four level-12 runs, foot crest against the still depth where the
 *   face goes vertical (`plunge_measure.py`): 0.56 m → 1.85 m (9 s), 1.05 → 2.71 (11 s), 1.61 → 3.44 (12 s) and
 *   2.10 → 3.24 (14 s), clamped to those crests. Residuals −0.23/+0.16/+0.36/−0.30 m: a 0.3 m residual moves the throw
 *   about 6 m along a 1:21.5 ray, as Padang Padang's do. Not monotonic: point21_a30's 14 s wave shoals further before
 *   going vertical (H/d 1.23 there, against 0.82–0.96). A fit in the period too barely helps (±0.26 m), and in the game
 *   the Point's period rises with its size, so η alone carries the period's trend. The level-13 cases owed refit it.
 * - **Its cases:** point21_a15, a23 and a30 (A0 0.15, 0.23, 0.30), level-12 stand-ins (lips of 4–6 cells; jets and tubes
 *   well under Pick & Feddersen's). point21_a08 (A0 0.08, 9 s) sets the throw line's shallow end but is out of the
 *   index: its lip falls to the water without enclosing air, at level 9 or 12, so it has no tube to draw (the Point's
 *   Small scales a15 down). Its level-13 run is owed and may close one.
 */
const POINT_ONSET = {
    h0: 7,
    band: [6, 5],
    join: [
        { period: 9, rows: [[0.62, 1.58], [1.01, 2.14], [1.37, 2.65], [1.73, 3.16], [1.99, 3.67]] },
        { period: 11, rows: [[0.6, 1.72], [0.91, 2.33], [1.19, 2.88], [1.33, 3.44], [1.68, 4.05]] },
        { period: 12, rows: [[0.69, 1.67], [1.08, 2.19], [1.4, 2.7], [1.75, 3.12], [2.12, 3.49]] },
        { period: 14, rows: [[0.77, 1.67], [1.22, 2.14], [1.78, 2.6], [2.4, 3.12], [2.88, 3.49]] },
    ],
    throwDepth: { intercept: 1.551, slope: 0.946, heights: [0.558, 2.099] },
};
/** The Point's foot, m (the advisor, 2026-10-01): seaward of its sets' breaks (4.2 m at most), in the solver's free water. */
const POINT_FOOT = 7;
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
exports.BARREL_SPOTS = {
    padang: { slope: 1 / 19, get footDepth() { return Bathymetry_1.PADANG.baseDepth; }, onset: sliceClock_1.PADANG_ONSET, frontFrom: 'zone', front: exports.PADANG_FRONT },
    point: { slope: 0.0465116, footDepth: POINT_FOOT, onset: POINT_ONSET, frontFrom: 'zone' },
    reef: {
        slope: 0.238095, get footDepth() { return Bathymetry_1.REEF.shelfDepth; }, onset: REEF_ONSET, frontFrom: 'fine',
        front: { jumpReach: 10, joinPast: 1.5 },
    },
};
