import { poolSpot } from './pool';
import { seededRandom } from './random';

export type SpotName = 'beach' | 'point' | 'reef' | 'canyon' | 'padang' | 'pool';

/**
 * Still-water depth below datum, m; negative on dry land. +x runs along shore,
 * +z toward the beach, and z = 0 is the shoreline at x = 0.
 */
/** What a bed is made of, for contact (the Teahupo'o Reef, Part C). */
export type BedMaterial = 'sand' | 'reef';

export interface SurfSpot {
  readonly name: SpotName;
  depthAt(x: number, z: number): number;
  /** What the bed is made of; absent, sand everywhere. */
  materialAt?(x: number, z: number): BedMaterial;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Dean (1991) equilibrium profile h = A s^(2/3) at offshore distance s, capped, with a planar foreshore on land. */
export function deanDepth(offshore: number, a = 0.12, maxDepth = 12, landSlope = 0.06): number {
  if (offshore <= 0) return offshore * landSlope;
  return Math.min(maxDepth, a * Math.pow(offshore, 2 / 3));
}

export const BEACH_BAR = { offshore: 90, height: 0.9, width: 18, ripSpacing: 110, ripWidth: 22, ripJitter: 25 };
export const POINT_HEADLAND = { center: 0, halfWidth: 150, protrusion: 120, slope: 0.04, maxDepth: 12 };
/**
 * The Beach's outer bar and shelf (the wave-sizes spec; docs/research/outer-profiles.md): a Gaussian bar 2 m
 * high 450 m out (crest 5 m deep, inside Duck's 300–600 m and 3–8 m), 80 m long so its tail leaves the inner
 * bed alone, on Dean's profile continued to 30 m.
 */
export const BEACH_OUTER = { barOffshore: 450, barHeight: 2, barWidth: 80, maxDepth: 30 };
/** The Point's shelf past its 12 m: a gentler 1:67 slope to 30 m (an assumption; see the research doc). */
export const POINT_OUTER = { slope: 0.015, maxDepth: 30 };
/**
 * The Teahupo'o Reef (the Teahupo'o Reef spec): a left slab. The tank's deep water rises up a
 * 1:2.29 forereef (Rodríguez-Burguette et al. 2025, a model of Teahupo'o's reef) to a shelf
 * about 10 m deep (Shand 2024), where the wave stands up before the reef rises again to its
 * crest, about 1.5 m under the surface (WSL). The ledge rises from the shelf, its foot meeting
 * the shelf's edge at the peak (x = crestX), and runs at `angle` degrees to the shoreline,
 * furthest out toward −x, so each wave breaks there first and peels toward +x (a left) at the
 * shelf's celerity over the sine of the crest's angle to it (`ledgePeel`). A pass runs along the
 * window's +x open edge, level across it like the Canyon's axis, where the left ends. A planar
 * beach face caps it all. Sources and provisional values: docs/research/teahupoo-reef-sources.md.
 * Mutable for the design sweep (`scripts/reefShape.ts`).
 */
export const REEF = {
  deep: 30, foreSlope: 1 / 2.29, shelfEdge: -150, shelfDepth: 10,
  ledgeSlope: 1 / 2.29, crestDepth: 1.5, crestX: -80, crestZ: -120, angle: 45,
  passX: 80, passHalfWidth: 25, passDepth: 12, takeOffX: -50,
  // Shoreward of the crest (Part C): a reef flat, a lagoon, and the Teahupo'o model's 1:9.64 inland slope
  // (zenodo 11392175). The flat's width and the lagoon's depth are provisional until its profile is read.
  flatWidth: 20, lagoonDepth: 2.5, inlandSlope: 1 / 9.64,
};

/** Where the Reef's crest line (the top of its ledge) crosses along-shore position x. */
export function reefCrestZ(x: number): number {
  return REEF.crestZ + (x - REEF.crestX) * Math.tan((REEF.angle * Math.PI) / 180);
}

/**
 * Whether the Reef's ledge is ridden at along-shore position x: out of the pass (beyond two of its
 * half-widths from its axis) and where the crest still lies seaward of the inland slope's crest depth.
 * Past it, waves break on the beach face in the pass and the lagoon: not the Reef's wave.
 */
export function reefLedgeAt(x: number): boolean {
  return x < REEF.passX - 2 * REEF.passHalfWidth && reefCrestZ(x) < -REEF.crestDepth / REEF.inlandSlope;
}

/** Distance seaward of the Reef's crest line, m, measured across it (negative shoreward of it). */
export function reefSeaward(x: number, z: number): number {
  return (reefCrestZ(x) - z) * Math.cos((REEF.angle * Math.PI) / 180);
}

/**
 * Padang Padang (the Padang Padang spec): a left over a coral reef on the west coast of Bali's Bukit, built from Mead's
 * components for it (ramp, focus, wedge, pinnacle; no platform: Mead 2000, table 4.1), as Mead & Black's idealised
 * Bingin beds (1999; Mead 2000, ch. 5). The swell arrives square to the tank in water `deep` deep (the tank's edge,
 * where its linear sea is near-linear; the Bukit's terrace has already wrapped it), climbs a shore-parallel forereef
 * at `foreSlope` to a knee `kneeDepth` deep, then Mead's ramp at `rampSlope`, level along shore. From the ramp rises
 * the wedge to a reef flat `crestDepth` deep that nearly dries at the lowest spring tides. The wave climbs it at Mead &
 * Black's orthogonal gradient along its own path, inferred from the measured vortex ratios of its tubes (about 1:19;
 * Mead & Black 2001), so `wedgeSlope`, measured across the crest line, is steeper by the path's angle to it (the
 * owner's decision, 2026-09-29: docs/research/water-physics/basilisk-profiles.md). The wedge's top
 * edge (the crest line) runs at `angle` degrees to the ramp's contours from the peak (x = peakX, where the wedge's base
 * is `baseDepth` deep), so each wave breaks there first and peels toward +x (a left) at the celerity over the wedge's
 * base over the sine of that angle (phase matching). A spur on the swell's line through the peak (Mead's focus) draws
 * the waves' energy onto it, so it breaks first. Upcoast of the peak the wedge fades out over `endWidth` m, so the
 * bed is the bare ramp, level along shore, at the window's −x open edge (an open edge copies its neighbours: a bed
 * sloping across it ran the Reef's Big swell to NaN); a channel runs along the +x open edge, level across its axis,
 * where the left ends, `kneeDepth` deep shoreward of `channelFrom`. A planar beach face caps it all. The window is
 * `alongShore` m wide, so the peak stands well inside the −x open side. Sources and provisional values: docs/research/padang-padang-sources.md.
 * Mutable for the design sweep (`scripts/padangShape.ts`).
 */
export const PADANG = {
  deep: 25, foreSlope: 1 / 20, foreRounding: 10, kneeDepth: 12, rampSlope: 1 / 80,
  /**
   * The wedge's slope across its crest line: 1:19 along the swell's path, which crosses the 40° line obliquely (1:14.6
   * as the swell arrives square, about 1:15.8 once refraction turns it toward the wedge's normal). At 1:19 across the line
   * the swell climbed 1:24.8: in Basilisk (level 11) the peak's face went vertical 16 m before the flat and threw a tube
   * of 0.125 H²; at 1:19 along the path, 3.6 m before it, the lip landing on the flat and the tube 0.208 H², 1.7 × larger.
   */
  wedgeSlope: 1 / 15,
  baseDepth: 7, crestDepth: 1.25, peakX: -60, peakZ: -170, angle: 40, endWidth: 20,
  alongShore: 320, channelX: 160, channelHalfWidth: 45, shoreSlope: 0.2, takeOffX: -50,
  /** How far the channel is deepened from the ramp toward the knee's depth: its crests ran ahead over it and tilted the reef's down-reef crests (the design sweep's). */
  channelDeepening: 1,
  /**
   * How far seaward the channel is deepened, z (−Infinity: from the knee). Held at the knee's depth all the way out, its
   * crests ran ahead and tilted the down-reef crests about 11° before the wedge (the advisor, 2026-09-29), a peel of
   * 15.9 m/s against 10.7 without it. Deepened only shoreward of where the ramp is about 5 m deep (the wedge base's depth
   * at the ride's end), the crests offshore of it cross the bare ramp as they do along the reef: 22 clean waves at 11.3
   * m/s, the two halves of each alike (docs/research/padang-padang-report.md). The line is the sweep's, provisional.
   */
  channelFrom: -138,
  /**
   * Mead's focus: a spur along the incoming swell through the peak, `focusRelief` m above the bed where it meets the
   * wedge's base, tapering (cos²) to nothing `focusLength` m seaward and `focusInset` m up the wedge, `focusHalfWidth` m
   * to either side of the peak. The advisor's ruling (2026-09-29, from Mead 2000, figs 5.1–5.2): about a wavelength
   * across (a narrower shoal diffracts rather than focuses), its crest deepening seaward at 1:20–1:40 inside Mead's
   * focus gradients (1:10–1:80). All provisional.
   */
  focusRelief: 2, focusLength: 150, focusInset: 80, focusHalfWidth: 70,
};

/** Where Padang Padang's wedge rises from the ramp at its peak: `baseDepth` deep, (baseDepth − crestDepth) / wedgeSlope across the crest line. */
export function padangBaseZ(): number {
  const { peakZ, baseDepth, crestDepth, wedgeSlope, angle } = PADANG;
  return peakZ - (baseDepth - crestDepth) / wedgeSlope / Math.cos((angle * Math.PI) / 180);
}

/** Where Padang Padang's forereef meets its ramp (the knee's centre): the ramp climbs from kneeDepth there to baseDepth at the peak's base. */
export function padangKneeZ(): number {
  return padangBaseZ() - (PADANG.kneeDepth - PADANG.baseDepth) / PADANG.rampSlope;
}

/** Where Padang Padang's forereef rises from deep water (its foot's centre). */
export function padangForeFootZ(): number {
  return padangKneeZ() - (PADANG.deep - PADANG.kneeDepth) / PADANG.foreSlope;
}

/** Where Padang Padang's crest line (the top of its wedge) crosses along-shore position x. */
export function padangCrestZ(x: number): number {
  return PADANG.peakZ + (x - PADANG.peakX) * Math.tan((PADANG.angle * Math.PI) / 180);
}

/** Distance seaward of Padang Padang's crest line, m, measured across it (negative shoreward of it). */
export function padangSeaward(x: number, z: number): number {
  return (padangCrestZ(x) - z) * Math.cos((PADANG.angle * Math.PI) / 180);
}

/** max(0, d), rounded quadratically (C¹) over ±r: a ramp's knee without a slope break. */
function rounded(d: number, r: number): number {
  if (d <= -r) return 0;
  if (d >= r) return d;
  return ((d + r) * (d + r)) / (4 * r);
}

/** Whether Padang Padang's reef is ridden at along-shore position x: from its peak to where the channel begins (two half-widths from its axis). */
export function padangReefAt(x: number): boolean {
  return x >= PADANG.peakX && x < PADANG.channelX - 2 * PADANG.channelHalfWidth;
}

/**
 * The Canyon (the straight-crest bed, docs/research/canyon-spilling-2026-10-05 §1): a spilling wave that peels left to
 * right seen from the beach (toward +x) along one oblique break line, which straight crests square to the beach meet,
 * as at the Wave Pool (`POOL`).
 *
 * The simulated bed has no canyon any more. The canyon that ran along the −x open edge turned the crests on its flank,
 * so they wrapped in from that corner (the owner, 2026-10-06). Seaward of the arm the bed is level along shore, so the
 * crests stay straight up to it.
 *
 * Every size breaks on the arm (the canyon-big redesign, 2026-10-09). On a 3.6 m shelf Big's waves broke on the shelf
 * and the blend before they reached the arm, closing out across the window or breaking toward −x: a platform caps the
 * waves a spot can take (Mead 2000). So the tank's edge is `edgeDepth` deep (3.3 Big Hs, the wave-sizes spec's rule),
 * its sizes given at the old 5 m edge (`CANYON_SWELL_DEPTH`), and a blend `blendLength` m long takes the bed to a level
 * sand platform `shelfDepth` deep, where Big stands as Medium did on 3.6 m (Hs/h about 0.4). The solver's 1 m cells
 * start at the relaxation zone (`zoneInner`), so the shoaling waves are resolved (on 4 m cells they lost a third of
 * their height unbroken).
 *
 * On the platform stands a terrace, the arm, `crestDepth` deep. Its seaward edge, the break line, runs at `angle` degrees
 * to the shore from its peak (peakX, peakZ) toward +x and the beach, where it ends on the beach face. Its face climbs at
 * `pathSlope` along the waves' path, steep enough that the waves breaking on it plunge weakly, as the owner's reference
 * reel does (the reef bed, 2026-10-22: Iribarren numbers at breaking about 0.4–0.6). The face is planar (`fan` 0) since
 * canyon-long-wave: its contours, where every size breaks, run parallel to the line all the way to the beach, and the
 * deep face runs on past the line's end on the beach face until its foot meets the beach face's (`runOn`), so each
 * wave's break runs down the whole arm into the beach. Until then it was a fan, its deep contours 15° less oblique than
 * the line, tapering past the line's end (below). Upcoast of the peak the arm ends in
 * a face along +z that falls at `endSlope` across x, so every depth's contour is furthest out at the peak and each wave
 * starts breaking there. That end stays clear of the −x open edge's levelling (`OPEN_EDGE_RAMP`), so the edge copies
 * plain platform. Behind the line the top is level for `flatWidth` m, then falls to a trough `lagoonDepth` deep, so
 * bores that crossed the line do not re-break along shore all at once; past the reef's end on the beach face the terrace
 * tapers into the platform (`endTaper`), so the +x open edge copies plain beach face. A planar beach face caps it all.
 *
 * The layout is a short reef near a visible beach (canyon-layout, 2026-10-22; the owner approved the water-physics
 * advisor's design C with a 1:15 beach, docs/research/canyon-layout-2026-10-22). The owner's playtest: "canyon has a
 * strange wave formation, should be straight. The beach is to far from the waves its unrealistic. And the starts in the
 * far conor of the map isolating him from the beach." Until then the 70° line ran across the whole 160 m window, from
 * x −38 to 64, which took it 280 m across shore: the peak stood 305 m out on a 1:25 beach face and the riders started
 * 345 m out, 29 m from the −x bound. Every crest ran ahead in the deep water either side of the arm and lagged over it,
 * so it bent inshore of the peak, and the edge band mirrored that lean into a symmetric V (`CANYON_OLD`, the
 * `?canyonBed=old` dev switch). Now the peak stands 120 m out, the arm crosses about 38 m of shore (112 m along its
 * line, to its end on the steeper 1:15 beach face), and the window is `alongShore` m wide with the arm's footprint (its
 * upcoast end to its taper) about centred in it, so open water, square crests, stands either side of the reef. Past
 * the arm the crests close out on the beach either side, after the peak's ride, as on a real reef's flanks.
 *
 * The wave runs the length of the arm (canyon-long-wave, 2026-10-22, docs/research/canyon-long-wave-2026-10-22). The
 * owner's playtest of the short arm: "the wave has small progress; the wave itself is not long. A lot of foam, but no
 * long wave or steep wave." On the fan the sets broke as a patch at the arm's upcoast end and the peak, and the 55° deep
 * face down the line, its waves spread by its obliqueness, rarely carried the break on: half of Medium's crests broke
 * over less than 1.4 s (3 seeds × 14 periods), and the deep face ended in the taper 90 m from the beach. On a planar face
 * running into the beach Medium's crests break down the arm for 13 s at the median (24 of 37 for 10 s or more, against
 * 13 of 40), at a 50° peel by the readout (34° on the fan), the same footprint, window, beach and starts. The arm is
 * moved 12 m upcoast so its footprint, 15 m longer, stays centred.
 * Mutable for the design sweep (`scripts/canyon-size-report.ts --canyon key=value,...`).
 */
export const CANYON = {
  /**
   * The platform, m deep; the beach face's slope (1:15, provisional until the full runs; 1:25 until canyon-layout, whose
   * 150 m face put the peak 305 m out); the arm's top, m deep.
   */
  shelfDepth: 6, shoreSlope: 1 / 15, crestDepth: 1,
  /**
   * The arm's face along the waves' path (+z) below the fan's hinge, and its upcoast end across x. The face was 1:30 until
   * the reef bed (2026-10-22, docs/research/canyon-reef-bed-2026-10-22): every size spilled there, and more softly down the
   * line, where the fan's shallow face took over. The owner's reference reel is a weak-to-moderate plunging left on about
   * 1:22–1:30 reef (the water-physics advisor, 2026-10-22), who advised 1:23–1:25 below a 2.0–2.2 m hinge; the sweep kept
   * the steepest, whose fan above the hinge is also the least gentle downcoast.
   */
  pathSlope: 1 / 23, endSlope: 1 / 4,
  /**
   * The peak and the line's angle to the shore, degrees. The peak stands 120 m out (305 m until canyon-layout), 22 m
   * upcoast of the window's centre (10 m until canyon-long-wave), so the arm's footprint from its upcoast end (x −42) to
   * the end of its taper (x 43) is centred.
   */
  peakX: -22, peakZ: -120, angle: 70,
  /** Where riders wait along shore, m: on the arm just downcoast of its peak, where each wave starts breaking (8 m, as before). */
  takeOffX: -14,
  /**
   * The tank: the relaxation zone's inner edge, where the 1 m cells start, and the blend onto the platform, m. The blend
   * ends 40 m seaward of the arm's furthest foot (z −290), as it did at −575 before canyon-layout (foot −475).
   */
  zoneInner: -390, blendLength: 60,
  /** The tank's edge under the relaxation zone, m deep, and the zone's length, m (at least 0.75 of Big's wavelength there). */
  edgeDepth: 7.9, zoneLength: 90,
  /**
   * The fan: below its hinge, `hingeDepth` deep, the arm's face runs `fan` degrees less oblique than its crest line. The
   * face climbs at `pathSlope` along the waves' path to a hinge line at `angle − fan` degrees through the point where
   * a single face would be `hingeDepth` deep below the peak; between the hinge line and the crest line the depth runs
   * linearly, so downcoast, where the two lines part, the shallow face is gentler and its contours more oblique than the
   * deep ones. Upcoast of the peak the hinge line runs parallel to the crest line. The hinge is rounded over
   * ±`hingeRounding` m across shore. `fan` 0: one planar face, the hinge line parallel to the crest line.
   * - 0 since canyon-long-wave (2026-10-22): on the 15° fan (canyon-layout's short arm, `CANYON_OLD`) the sets broke
   *   on the arm's upcoast end and the peak and seldom carried on down the 55° deep face, whose obliqueness spread their
   *   waves (the advisor's rays: K 0.64 at Medium). On the planar face the break runs down the arm to the beach (the
   *   sweep, 1 seed × 12 periods at Medium: rides 11 s at the median on the planar 70° face, 9 s at 65°, 2 s at 60°, 5 s
   *   on an 8° fan, 2 s on the 15° fan running on to the beach at 55°).
   * - The planar face was rejected on the long arm (2026-10-09, 15 of 54 crests starting mid-arm); on the short arm 39 of
   *   40 Medium crests start on the arm's end and face, 37 within 10 m of their median (3 seeds × 14 periods).
   * - The hinge was 2.8 m deep until the reef bed (2026-10-22); on a planar face it only places the hinge line.
   */
  fan: 0, hingeDepth: 2.2, hingeRounding: 8,
  /** Past the reef's end on the beach face (`canyonReefEndX`) the terrace tapers into the platform over this many metres along shore, m. */
  endTaper: 12,
  /**
   * Behind the break line the terrace's top is `crestDepth` deep for `flatWidth` m, then deepens at `pathSlope` toward
   * the beach to a trough `lagoonDepth` deep, which the beach face closes (`lagoonDepth` = `crestDepth`: a level top, as
   * before 2026-10-09). On a level 1 m top, wider behind a 70° line, bores re-broke along shore all at once: Small's readout
   * read toward −x (as the Wave Pool's reef, `POOL.flatWidth` and `lagoonDepth`).
   */
  flatWidth: 10, lagoonDepth: 2,
  /**
   * The window's width along shore, m (`alongShoreOf`): 220 m (160 m until canyon-layout), so 67–68 m of open water
   * (70–90 m on the short arm), where the crests stay square, stands between the arm's footprint and each open side,
   * whose edge band mirrors it (the advisor's P2w: the mirror's chevrons within the Beach's spread).
   */
  alongShore: 220,
  /**
   * How far inshore of the break line a column's new break still counts toward the peel the readout measures, m: the arm's
   * flat top (`flatWidth`), so the face, the end and the top count, and not the lagoon's bores or the shore break on the
   * beach face behind the arm (`SurfZoneSimulation`'s peel). On the short arm (canyon-layout) the beach face lies 60–120 m
   * behind the line: its shore break upcoast of the peak, seconds after the arm's breaks, read as "a right" 8 % of the time
   * at Medium (3 seeds × 14 periods; 3 % on the old layout, whose beach lay 280 m behind the peak). Infinity: every break.
   */
  peelReach: 10,
  /**
   * 1: the arm's deep face runs on past its end on the beach face, along its hinge line, until its foot meets the beach
   * face's `shelfDepth` contour (`canyonReefEndX`), where it tapers into the platform; 0: it tapers past the end of its
   * crest line on the beach face (`canyonArmEndX`), as canyon-layout's short arm did. 1 since canyon-long-wave
   * (2026-10-22): the waves' break runs down the arm's face into the beach face, not into the taper's corner (the advisor:
   * on the fan the deep face ended there 90 m from the beach; on the planar face 15 m further along shore).
   */
  runOn: 1,
};

/**
 * Which Canyon layout a sea runs (`SurfZoneConfig.canyonBed`, the `?canyonBed=old` dev switch): 'reef', today's (the
 * planar arm running into the beach, canyon-long-wave), or 'old', the layout before canyon-long-wave (`CANYON_OLD`:
 * canyon-layout's short arm on its fan).
 */
export type CanyonBed = 'reef' | 'old';

/** The Canyon's shape: `CANYON`, or the layout before it (`canyonShape`). */
export type CanyonShape = typeof CANYON;

/**
 * The Canyon's whole layout before canyon-long-wave (2026-10-22), main's at bff9a874: canyon-layout's short arm, the
 * reef bed's 1:23 face below a 2.2 m hinge on the 15° fan, its 70° line from a peak 120 m out at x −10, tapering past the
 * line's end on the 1:15 beach face, in the 220 m window, its tank's zone from z −390 and its take-off at x −2. Kept for
 * the `?canyonBed=old` dev switch, so the owner can ride the two side by side, with that layout's take-off
 * (`CANYON_TAKE_OFF_DEPTH_OLD`) and starts (`CANYON_RIDE_LINEUP_OLD`). Frozen: the design sweeps reshape `CANYON` alone.
 * The long arm before canyon-layout, which this switch rode until canyon-long-wave, is no longer reachable: it is
 * `CANYON_OLD` at main's bff9a874.
 */
export const CANYON_OLD: CanyonShape = Object.freeze({
  shelfDepth: 6, shoreSlope: 1 / 15, crestDepth: 1,
  pathSlope: 1 / 23, endSlope: 1 / 4,
  peakX: -10, peakZ: -120, angle: 70,
  takeOffX: -2,
  zoneInner: -390, blendLength: 60,
  edgeDepth: 7.9, zoneLength: 90,
  fan: 15, hingeDepth: 2.2, hingeRounding: 8,
  endTaper: 12,
  flatWidth: 10, lagoonDepth: 2,
  alongShore: 220, peelReach: 10, runOn: 0,
});

/** The Canyon's shape for a layout: `CANYON` itself by default (so the design sweeps' changes hold), else `CANYON_OLD`. */
export function canyonShape(bed: CanyonBed = 'reef'): CanyonShape {
  return bed === 'old' ? CANYON_OLD : CANYON;
}

/** Where the Canyon's break line (the terrace's seaward edge) crosses along-shore position x. */
export function canyonBreakLineZ(x: number, c: CanyonShape = CANYON): number {
  return c.peakZ + (x - c.peakX) * Math.tan((c.angle * Math.PI) / 180);
}

/** Where the Canyon's break line runs onto the beach face (its crest depth on the beach face), along shore, m. */
export function canyonArmEndX(c: CanyonShape = CANYON): number {
  return c.peakX + (-c.crestDepth / c.shoreSlope - c.peakZ) / Math.tan((c.angle * Math.PI) / 180);
}

/**
 * Where the Canyon's reef ends along shore, m: its crest line's end on the beach face (`canyonArmEndX`), or, when its deep
 * face runs on (`runOn`), where that face's foot, `shelfDepth` deep below the hinge line, meets the beach face's own
 * `shelfDepth` contour. Past it the terrace tapers into the platform over `endTaper` m.
 */
export function canyonReefEndX(c: CanyonShape = CANYON): number {
  if (!c.runOn) return canyonArmEndX(c);
  const footBelowHinge = (c.shelfDepth - c.hingeDepth) / c.pathSlope;
  return c.peakX + (-c.shelfDepth / c.shoreSlope + footBelowHinge - canyonHingeZ(c.peakX, c)) / Math.tan(((c.angle - c.fan) * Math.PI) / 180);
}

/** Whether the Canyon's arm is ridden at along-shore position x: from its peak (and the end beside it) to where its reef ends on the beach face. */
export function canyonArmAt(x: number, c: CanyonShape = CANYON): boolean {
  return x >= c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope && x <= canyonReefEndX(c);
}

/**
 * Whether a break at (x, z) counts toward the Canyon's peel: on the arm, no further inshore of its break line than
 * `peelReach`; where the deep face runs on past the crest line's end (`runOn`), only where the reef, not the beach face,
 * makes the bed (the shore break behind it is not its wave).
 */
export function canyonPeelAt(x: number, z: number, c: CanyonShape = CANYON): boolean {
  if (!canyonArmAt(x, c) || !(z < canyonBreakLineZ(x, c) + c.peelReach)) return false;
  return !c.runOn || canyonTerraceDepth(x, z, c) < Math.min(c.shelfDepth, -z * c.shoreSlope) - 0.05;
}

/**
 * The Canyon's terrace at (x, z), m deep: its fan face climbing to the break line (at `pathSlope` along the waves' path
 * below the hinge, linearly from the hinge line to the break line above it), its top behind the line (level, then down to
 * the trough), and its upcoast end falling at `endSlope` across x upcoast of the peak, so every depth's contour is
 * furthest out where it turns from the line into the end; past the arm's end it tapers into the platform over `endTaper` m.
 */
export function canyonTerraceDepth(x: number, z: number, c: CanyonShape = CANYON): number {
  const line = canyonBreakLineZ(x, c);
  const seaward = Math.max(0, line - z);
  // The fan's shallow face from the crest line to the hinge line, then pathSlope below the hinge (one face when fan is 0).
  const width = line - canyonHingeZ(x, c);
  const shallow = (c.hingeDepth - c.crestDepth) / width;
  // Behind the line, the top: level for flatWidth, then down to the trough.
  const top = Math.min(c.lagoonDepth, c.crestDepth + Math.max(0, z - line - c.flatWidth) * c.pathSlope);
  const face = z > line ? Math.max(c.crestDepth, top)
    : c.crestDepth + shallow * seaward + (c.pathSlope - shallow) * rounded(seaward - width, c.hingeRounding);
  const end = c.crestDepth + Math.max(0, c.peakX - x) * c.endSlope;
  // Past the arm's end the fan's gentle downcoast face would run on as a shoal across the +x open edge: it tapers away,
  // so the edge copies plain beach face.
  const terrace = Math.max(face, end);
  const reefEnd = canyonReefEndX(c);
  return terrace + (c.shelfDepth - terrace) * smoothstep(reefEnd, reefEnd + c.endTaper, x);
}

/** Where the Canyon's hinge line (the fan's, `hingeDepth` deep) crosses along-shore position x. */
export function canyonHingeZ(x: number, c: CanyonShape = CANYON): number {
  const atPeak = c.peakZ - (c.hingeDepth - c.crestDepth) / c.pathSlope;
  const angle = x >= c.peakX ? c.angle - c.fan : c.angle;
  return atPeak + (x - c.peakX) * Math.tan((angle * Math.PI) / 180);
}

/**
 * The Canyon's arm's furthest foot seaward, z: where its face reaches the shelf at the bottom of its end, upcoast of the
 * peak (the hinge's rounding aside).
 */
export function canyonFootZ(c: CanyonShape = CANYON): number {
  const x = c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope;
  return c.shelfDepth > c.hingeDepth
    ? canyonHingeZ(x, c) - (c.shelfDepth - c.hingeDepth) / c.pathSlope
    : canyonBreakLineZ(x, c) - (c.shelfDepth - c.crestDepth) / c.pathSlope;
}

function beach(seed: number): SurfSpot {
  const random = seededRandom(seed, 0xbeac4);
  const rips: number[] = [];
  for (let k = -8; k <= 8; k += 1) rips.push(k * BEACH_BAR.ripSpacing + (random() * 2 - 1) * BEACH_BAR.ripJitter);
  return {
    name: 'beach',
    depthAt(x, z) {
      const offshore = -z;
      let gap = 0;
      for (const rip of rips) gap = Math.max(gap, Math.exp(-(((x - rip) / BEACH_BAR.ripWidth) ** 2)));
      const bar = BEACH_BAR.height * Math.exp(-(((offshore - BEACH_BAR.offshore) / BEACH_BAR.width) ** 2)) * (1 - gap);
      const outerBar = BEACH_OUTER.barHeight * Math.exp(-(((offshore - BEACH_OUTER.barOffshore) / BEACH_OUTER.barWidth) ** 2));
      return deanDepth(offshore, 0.12, BEACH_OUTER.maxDepth) - bar - outerBar;
    },
  };
}

function point(): SurfSpot {
  const { center, halfWidth, protrusion, slope, maxDepth } = POINT_HEADLAND;
  return {
    name: 'point',
    depthAt(x, z) {
      // The shoreline steps offshore across the headland; its flank sets the contour angle.
      const shoreline = -protrusion * smoothstep(center + halfWidth, center - halfWidth, x);
      const offshore = shoreline - z;
      if (offshore <= 0) return offshore * 0.06;
      const shelf = maxDepth / slope;
      return offshore <= shelf ? slope * offshore : Math.min(POINT_OUTER.maxDepth, maxDepth + POINT_OUTER.slope * (offshore - shelf));
    },
  };
}

/** The Reef's bed in its parts: the pass's weight, the reef's own depth, how far inside its crest, and the shore's. */
function reefTerms(x: number, z: number): { pass: number; onReef: number; fore: number; inside: number; beachFace: number } {
  const r = REEF;
  // The shore-parallel forereef up to the shelf; on the shelf, the ledge rising from it to the crest.
  // The crest line keeps the ledge's foot shoreward of the shelf's edge (at the peak they meet), so the bed has no cliff.
  const fore = z >= r.shelfEdge ? r.shelfDepth : Math.min(r.deep, r.shelfDepth + (r.shelfEdge - z) * r.foreSlope);
  const seaward = reefSeaward(x, z);
  const ledge = r.crestDepth + Math.max(0, seaward) * r.ledgeSlope;
  // Shoreward of the crest: the reef flat at the crest's depth, then its inner edge falling to the lagoon, no steeper than the ledge.
  const inside = Math.max(0, -seaward);
  const lagoon = Math.min(r.lagoonDepth, r.crestDepth + Math.max(0, inside - r.flatWidth) * r.ledgeSlope);
  const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, seaward >= 0 ? ledge : lagoon) : fore;
  // The pass: no reef, the shelf deepened to passDepth; flat across its axis at the window's edge.
  const pass = Math.exp(-(((x - r.passX) / r.passHalfWidth) ** 2));
  // The inland slope up to the shore, and dry land shoreward of z = 0. It rises from the shelf, not under the forereef:
  // at the shelf's edge the plane is still deeper than the shelf, so it ends there without a step.
  const beachFace = z >= 0 ? -z * 0.06 : z >= r.shelfEdge ? -z * r.inlandSlope : Infinity;
  return { pass, onReef, fore, inside, beachFace };
}

function reef(): SurfSpot {
  return {
    name: 'reef',
    depthAt(x, z) {
      const { pass, onReef, fore, beachFace } = reefTerms(x, z);
      const depth = onReef + (Math.max(fore, REEF.passDepth) - onReef) * pass;
      return Math.min(depth, beachFace);
    },
    // Rock where the reef builds the bed (Part C): out of the pass, seaward of the shore, down to the lagoon's floor.
    materialAt(x, z) {
      const r = REEF;
      const { pass, onReef, inside, beachFace } = reefTerms(x, z);
      const reefWall = r.flatWidth + (r.lagoonDepth - r.crestDepth) / r.ledgeSlope;
      return pass < 0.5 && onReef < beachFace && inside < reefWall ? 'reef' : 'sand';
    },
  };
}

/** cos²(π/2 · d/reach) inside ±reach, 0 beyond: a bump's profile, C¹ at its centre and its edge. */
function bump(d: number, reach: number): number {
  return Math.abs(d) >= reach ? 0 : Math.cos((Math.PI / 2) * (d / reach)) ** 2;
}

/** Padang Padang's focus, 0–1: 1 on the swell's line through the peak where it crosses the wedge's base. */
export function padangFocusShape(x: number, z: number): number {
  const p = PADANG;
  const seaward = padangBaseZ() - z;
  return bump(x - p.peakX, p.focusHalfWidth) * bump(seaward, seaward >= 0 ? p.focusLength : p.focusInset);
}

/** Padang Padang's bed in its parts: the channel's weight, the depth beneath the beach face, and the beach face's. */
function padangTerms(x: number, z: number): { channel: number; depth: number; beachFace: number } {
  const p = PADANG;
  const knee = padangKneeZ();
  const r = p.foreRounding;
  // Shore-parallel: the forereef from deep water up to the knee, rounded (C¹) at its foot and at the knee so its slope breaks
  // scatter no spurious harmonics; the channel keeps the knee's depth shoreward, the reef has Mead's ramp.
  const fore = p.kneeDepth + (rounded(knee - z, r) - rounded(padangForeFootZ() - z, r)) * p.foreSlope;
  const ramp = fore - rounded(z - knee, r) * p.rampSlope;
  // The wedge, where it is shallower than the ramp, faded out upcoast of the peak.
  const wedge = p.crestDepth + Math.max(0, padangSeaward(x, z)) * p.wedgeSlope;
  const bare = ramp - Math.max(0, ramp - wedge) * smoothstep(p.peakX - p.endWidth, p.peakX, x);
  const reef = bare - p.focusRelief * padangFocusShape(x, z);
  // The channel: no reef, level across its axis at the window's edge, over the ramp deepened toward the knee's depth by
  // `channelDeepening` (1: the knee's depth to the shore; 0: the bare ramp), shoreward of `channelFrom` (rounded over
  // twice the forereef's rounding, so its seaward end is no cliff; −Infinity: from the knee).
  const channel = Math.exp(-(((x - p.channelX) / p.channelHalfWidth) ** 2));
  const inshore = p.channelFrom === -Infinity ? 1 : smoothstep(p.channelFrom - 2 * r, p.channelFrom + 2 * r, z);
  const floor = ramp + (fore - ramp) * p.channelDeepening * inshore;
  // A beach face, and dry land shoreward of z = 0.
  return { channel, depth: reef + (floor - reef) * channel, beachFace: z < 0 ? -z * p.shoreSlope : -z * 0.06 };
}

function padang(): SurfSpot {
  return {
    name: 'padang',
    depthAt(x, z) {
      const { depth, beachFace } = padangTerms(x, z);
      return Math.min(depth, beachFace);
    },
    // Coral where the reef builds the bed, as the Reef's rock: out of the channel (unmapped by the coral atlas) and off the sand beach.
    materialAt(x, z) {
      const { channel, depth, beachFace } = padangTerms(x, z);
      return channel < 0.5 && depth < beachFace ? 'reef' : 'sand';
    },
  };
}

function canyon(c: CanyonShape): SurfSpot {
  return {
    name: 'canyon',
    depthAt(x, z) {
      const offshore = -z;
      if (offshore <= 0) return offshore * 0.06;
      // The shelf and the beach face, the terrace on them where it is shallower.
      return Math.min(c.shelfDepth, offshore * c.shoreSlope, canyonTerraceDepth(x, z, c));
    },
  };
}

/** A spot's bed; `canyonBed` picks the Canyon's (the reef bed unless 'old'), and every other spot ignores it. */
export function createSpot(name: SpotName, seed: number, options: { canyonBed?: CanyonBed } = {}): SurfSpot {
  switch (name) {
    case 'beach': return beach(seed);
    case 'point': return point();
    case 'reef': return reef();
    case 'canyon': return canyon(canyonShape(options.canyonBed));
    case 'padang': return padang();
    case 'pool': return poolSpot();
  }
}
