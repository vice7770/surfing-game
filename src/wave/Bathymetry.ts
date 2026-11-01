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
 * The Point's breaking onset by depth (point-onset, 2026-10-28, step 3b of the all-spots survey;
 * docs/research/point-onset-2026-10-28): Kennedy's onset is `shallow` √(g h) in still water `shallowDepth` m deep or
 * less, easing to the spot's own (0.65) by `deepDepth` m. The survey (docs/research/all-spots-breaking-2026-10-28) found
 * the Point's faces the steepest of any spot where they start to break (their steepest metre 22–25°) on its 1:25 shelf.
 * The onset is a calibration, set per bed region and keyed by depth, not by slope or ξ (the water-physics advisor,
 * 2026-10-23: Kennedy et al. 2000's 0.65 on a plane beach, FUNWAVE's 0.45 on Vincent & Briggs's shoal; the face at onset
 * about 27–31° at 0.65 and 20–22° at 0.45). A flat 0.45 broke Big's sets 3 m and more deep, all along the window at once
 * (9 of 9 waves 109 m wide 2 s in); keyed by depth, Big's deeper breaks keep 0.65.
 */
export const POINT_ONSET = { shallow: 0.45, shallowDepth: 3, deepDepth: 4.5 };

/** The Point's onset in still water `depth` m deep (`POINT_ONSET`), given the spot's own `onset`. */
export function pointOnset(depth: number, onset: number, p = POINT_ONSET): number {
  return p.shallow + (onset - p.shallow) * smoothstep(p.shallowDepth, p.deepDepth, depth);
}
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
 * long wave or steep wave." On the fan the peak's hump closed out at the arm's upcoast end, and the 55° deep face down
 * the line broke in sections (a fast run across it, a re-break by the beach later), and ended in the taper 90 m from the
 * beach: half of Medium's crests peeled rideably for 1.4 s or less (3 seeds × 14 periods). On a planar face running into
 * the beach they peel down the arm for 9.5 s at the median (21 of 43 for 10 s or more, against 13 of 40), Big's for
 * 9.7 s (1.8 s), plunging all along (ξb 0.4–0.65), the readout saying "closes out" a quarter of the time (39–46 % on the
 * fan), with the same beach and starts. The arm is moved 7 m upcoast and the window widened to 240 m, so its footprint,
 * 15 m longer, keeps open water either side (`alongShore`).
 *
 * The wave peels slower and longer without a new bed (canyon-wave-r2, 2026-10-22, docs/research/canyon-wave-r2-2026-10-22).
 * The breaking age the solver hands on through the diagonal cells behind a face ran along the crest beside the peak's
 * break, so the shoulder broke on gentle faces at 0.4–0.6 of its depth (the water-physics advisor); now it passes only to
 * water already rising steeply (`ageJoin`), and each part of the crest breaks nearer its own threshold. Medium rides
 * 15 s at the median (9.5 s), the readout says "closes out" 7 % of the time (25 %), Big closes out off the beach face 0
 * times in 45 crests (3 in 52), and the sets stand 22–32 % taller 60–90 m down the line. Bends of the arm downcoast (a 1:15
 * or 1:27 face, the line at 66° or 75°) moved neither the faces down the line nor the peel beyond one seed's noise, and
 * would have put the down-the-line tube on a slope its Basilisk cases never climbed: the arm stays planar. The window
 * widens to 260 m for the −x side's chevron (`alongShore`).
 *
 * A beach break either side of the reef (canyon-beach-break, 2026-10-23, docs/research/canyon-beach-break-2026-10-23). The
 * owner: "the waves only collapse on the reef and don't continue along the rest of the wave. I want the waves to be stable
 * across the playable map. Spilling waves are supposed to be the default for the Canyon." Either side of the reef a
 * sandbar peak (`beach`, `canyonBars`) on a 5 m floor makes a spilling A-frame that peels both ways, and the beach breaks
 * by the Beach's rules, earlier than the reef and passing its breaking age along its crests (`barOnset`, `barJoin`). The
 * reef, its transect and its breaking are unchanged. Riders start at the upcoast peak. The window widens to 400 m: two
 * A-frames with 40–60 m arms, a rip each side of the reef and the open edges' bands need it (transverse bars stand
 * 150–300 m apart, NIWA; the advisor).
 * Mutable for the design sweep (`scripts/canyon-size-report.ts --canyon key=value,...`).
 */
export const CANYON = {
  /**
   * The platform, m deep; the beach face's slope; the arm's top, m deep. The beach face is 1:15 (1:25 until
   * canyon-layout, whose 150 m face put the peak 305 m out), kept by canyon-wave-r2 (2026-10-22) on the water-physics
   * advisor's sources: a coarse or rock-perched cove beach beside a reef (Dean's A about 0.30 for its mean slope to 6 m;
   * Hacking 1998: exposed beach faces 1:13.5 for coarse sand to 1:45 for fine). A sandy equilibrium profile (A 0.10–0.21,
   * 1:25–1:77 to 6 m) would put 4–5 m of water beside the peak, where Big breaks on the flanks. The flanks' shore break,
   * 46–70 % of all onsets, is their width (two thirds of the window) and is physical.
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
   * The peak and the line's angle to the shore, degrees. The peak stands 120 m out (305 m until canyon-layout), 17 m
   * upcoast of the window's centre (10 m until canyon-long-wave), so the arm's footprint from its upcoast end (x −37) to
   * the end of its taper (x 48) leaves 83 m of open water to the −x side and 72 m to the +x side (80 m and 70 m on the
   * short arm).
   */
  peakX: -17, peakZ: -120, angle: 70,
  /**
   * Where riders wait along shore, m: since canyon-beach-break at the upcoast beach peak's tip (`upPeakX`), the beach peak
   * nearest the reef's take-off (the owner's decision 5); on the reef until then (`reefTakeOffX`).
   */
  takeOffX: -112,
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
   * - The planar face was rejected on the long arm (2026-10-09, 15 of 54 crests starting mid-arm); on this short arm all 44
   *   Medium crests start on the arm's end and face, 39 within 10 m of their median (3 seeds × 14 periods).
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
   * The window's width along shore, m (`alongShoreOf`): 400 m since canyon-beach-break (below); 260 m from canyon-wave-r2 (240 m from canyon-long-wave, 220 m on
   * canyon-layout's short arm, 160 m before), so 82–93 m of open water, where the crests stay square, stands between the
   * arm's footprint and each open side, whose edge band mirrors it (the advisor's P2w: the mirror's chevrons within the
   * Beach's spread). In the 240 m window the crests wrapping round the arm's upcoast end still leaned at the −x side inshore
   * (edge chevron p90 14.7° at Medium and 17.3° at Big inside the take-off, the Beach's 10.4°). In the
   * 220 m window the planar arm's footprint, 15 m longer than the short arm's, left 67–68 m either side, and the crests
   * wrapping round its upcoast end came back from the −x side's mirror as a chevron inshore (Big: p90 24° inside the
   * take-off, against the Beach's 10° and the short arm's 16°; 13 two-sided crests of 188 near the beach).
   */
  // 400 m since canyon-beach-break: the reef's footprint (85 m) in the middle, a beach peak each side with its arms
  // (134 m and 114 m with their tapers), the rips beside the reef and the open edges' 20 m bands.
  alongShore: 400,
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
  /**
   * The solver's breaking age passes to a cell from the diagonal parents behind its face only where the cell's own surface
   * rises at least `ageJoin` √(g h) (`KennedyOptions.diagonalJoin`; 0: always, rule A as at every other spot). 0.5 since
   * canyon-wave-r2 (2026-10-22, docs/research/canyon-wave-r2-2026-10-22): down the 70° line the aged threshold, which
   * falls from 0.65 to 0.15 √(g h), ran along the crest through the diagonals at up to the crest's speed, so unbroken water
   * beside the break broke on faces of 7–12° and 0.4–0.6 of its depth (the water-physics advisor; a plunger on 1:23 breaks
   * near 0.9). Gated, each part of the crest breaks nearer its own fresh threshold, as in nature (Dally 1990; Goda's
   * sideways spread, 0–C_b). The sweep (Medium, 1 seed × 8 periods): the readout's "closes out" 34 → 9 / 3 / 0 % at 0.35 /
   * 0.5 / 0.65, the crests' own fits 45 → 52 / 54 / 49°, the median ride 6.9 → 8.5 / 16.0 / 10.7 s.
   */
  ageJoin: 0.5,
  /**
   * The beach either side of the reef (canyon-beach-break, 2026-10-23, docs/research/canyon-beach-break-2026-10-23): 1, a
   * sandbar peak each side, spilling A-frames that peel both ways on a shallow floor; 0, the plain 6 m platform and 1:15
   * beach face of the layouts before (`CANYON_OLD`), where the flanks' crests rolled through unbroken and dumped on the
   * beach. The owner (2026-10-23): "the waves only collapse on the reef and don't continue along the rest of the wave. I
   * want the waves to be stable across the playable map."
   */
  beach: 1,
  /**
   * Where riders wait on the reef, along shore, m: the reef's own take-off (`takeOffX` until the beach, where riders now
   * start at a beach peak). The reef's readout reads its breaker there (`canyonReefTakeOff`).
   */
  reefTakeOffX: -9,
  /**
   * The beach sections' floor, m deep: the shallow rips beside and between the bars (the owner's "shallow rip channel",
   * the advisor's floor, 2026-10-23). Over a 6 m platform the bars' crests turned 16–18° at breaking; over 5 m about 10°,
   * the Beach's spread. Its seaward edge `floorEdge` (z), below which it ramps down to the platform at `floorRamp`; along
   * shore it blends back to the platform over the `floorBlend` m beside the reef's footprint, so the reef keeps its own
   * 6 m surround (no deep slot beside it, the old V's cause).
   */
  floorDepth: 5, floorEdge: -230, floorRamp: 1 / 30, floorBlend: 4,
  /**
   * The bars (the advisor's transverse bars, Wright & Short 1984; NIWA): each a V of contours from its tip, attached to
   * the beach with no trough inside (the owner: one bar, spilling all the way in). On its axis its depth climbs from the
   * floor to the waterline at the peak's `slope` along +z, planar (its top, from `crestDepth` at `crestZ` in, as steep as
   * its face; `barKnee` rounds a knee where they differ); its contours run back from the tip at `barAngle` to the shore,
   * rounded over the peak's `rounding` m (a hyperbola), so the break contour of every size is a V and each wave breaks
   * first at the tip and peels both ways. Past each arm's `reach` along shore the bar fades into the floor and the 1:15 face
   * over `barTaper` m: the rips, where the arms end.
   * - Planar since the frame-by-frame bars (2026-10-23): a knee 2 m deep, which pulled the break out to 140–160 m from the
   *   waterline at the solver's γ ≈ 1, broke the arms in patches: down an arm the swell is lower (refraction gathers it on
   *   the tip), so its break crossed the knee onto the gentle top and stalled. With the beach's earlier onset (`barOnset`)
   *   the sets break deeper, further out, on the plain slope.
   * - 40°, not the advisor's Snell-calibrated 60°: on the bars the arms' swell falls to 0.65–0.75 of the tip's 30 m down
   *   each arm, which slows the break along it on its own; at 60–65° the arms peeled at 60–70° to the crest, visibly, and
   *   their white stalled 10–20 m from the tip. At 40° the arms' ends run 40–46 m from the peak at a visible 50–56°
   *   (Medium, 1 seed × 12 periods; `frame-probe.ts`).
   * Along the waves' rays (Mead & Black's orthogonal gradient) a bar climbs cos α / cos θ faster than along +z: about
   * 1:40–1:45 at 1:44–1:50, where the sets' ξb reads 0.2–0.3, spilling with a face (Battjes 1974).
   */
  barAngle: 40, barTaper: 12, barKnee: 15,
  /**
   * The upcoast (−x) peak, the default start's (the owner's decision 5: the beach peak nearest the reef's take-off): the
   * mellower and longer of the two (decision 13), its bar gentler, so its tip stands further out and its arms run longer.
   */
  upPeakX: -112, upSlope: 1 / 50, upRounding: 12, upReach: 55, upCrestZ: -130, upCrestDepth: 2.6,
  /**
   * The beach's breaking onset (owner, 2026-10-23: "a less steep wave body on the beach, the wave body forming and
   * breaking"), as a fraction of √(g h) (`canyonOnset`): Kennedy et al.'s onset is a calibration of a depth-averaged model,
   * 0.65 for their plunging cases and lower where waves spill (FUNWAVE's Vincent & Briggs shoal, irregular waves over a
   * submerged mound like a bar: 0.45); the Beach spot's barred beach runs 0.35 (`BREAKING_ONSET`). At 0.65 a face reaches
   * about 27–31° before it breaks, at 0.45 about 20–22° (the water-physics advisor, 2026-10-23). The reef keeps the
   * spot's 0.65 exactly over its footprint and `onsetPin` m beside it at every depth; the beach's onset blends in over
   * `onsetBlend` m along shore, inside the rips where nothing should break, and only where the bed is `onsetShallow` m deep
   * or shallower, easing back to the spot's at `onsetDeep` m, so Big's biggest sets do not break across the floor.
   */
  barOnset: 0.4, onsetPin: 3, onsetBlend: 8, onsetShallow: 3, onsetDeep: 4.5,
  /**
   * The beach's breaking-age join (`canyonJoin`; the reef's is `ageJoin`): 0, rule A as at every other spot, the Beach's
   * included. The owner's top bar (2026-10-23: "the white break interrupts and the wave never fully breaks, making a long
   * ride impossible"): with the reef's gate on the bars each part of a crest had to reach its own fresh threshold, and the
   * arms, lower than the peak (refraction draws the swell onto the tip), broke in patches; with rule A a broken crest's age
   * passes along it, as a spilling break spreads sideways (Goda's lateral spread, 0–C_b), and the white runs on down the
   * arms. Medium, 1 seed × 12 periods, frame by frame (frame-probe.ts): the beach peaks' typical white line 21–33 m → 32–51
   * m, its longest 39–58 m → 71–77 m at the median, the arms' ends reaching the bars' ends 0–3 → 2–8 of 13–16 waves.
   */
  barJoin: 0,
  /**
   * The reef's onsets in sequence (canyon-reef-sequence, 2026-10-27, docs/research/canyon-reef-sequence-2026-10-27;
   * `SurfZoneSimulation`'s onsets): how long a reef column's break may drop out and still count as the same bore, s. A new
   * wave starts breaking in a column when its outermost breaking cell jumps more than 5 m seaward, and the column then
   * waits 0.7 Tp for its next. On the reef that read three other breaks as new waves: a bore crossing its 1 m top, which
   * breaks at about the strength (0.3) that marks it, dropping under it for a frame or a few and coming back about 1 m on
   * (25 of the 155 onsets in its columns, Medium, seed 1, 100 s); the bores re-breaking in its lagoon; and each wave's
   * shore break on the beach face behind, which comes some 3 s before the next crest but one reaches the reef. Each wait
   * then kept a crest's onset on the reef out, so the spilling front, whose waves join by onsets, drew its white as the old
   * wave's stray (none) across metres of the peak, wave after wave: the reef's drawn line ran half the solver's. Within this
   * hold a column's break counts from where it was last seen (a next crest breaks a wavelength seaward), and a break on the
   * reef (`peelReach`) waits only for the column's last break on the reef. 0: as before (`CANYON_OLD`; the
   * `?canyonReefSeq=off` dev switch). The reef's water and breaking are untouched: at a spilling spot an onset throws no lip.
   */
  reefBoreHold: 1,
  /**
   * …and a break on the reef more than this many metres seaward of where its column last broke is the next crest, m: a
   * random sea's crests can follow 3–4 s apart, inside the 0.7 Tp wait (Medium, seed 2, 62–65 s: a crest at z −145 met the
   * last one's onsets at −110 in seven columns, whose white stayed undrawn for 9 s). No bore runs back seaward, and the
   * next crest breaks about a wavelength out (28–60 m on the reef from Small to Big). Inside the wait it goes to the
   * spilling front alone, which draws its white; the readout's tracker still reads one onset a column a period (counted as
   * onsets too, such crests read "closes out" 11 % of the time at Medium, seed 1, against 3 %, and the peel 49° for 72°).
   */
  reefCrestGap: 20,
  /** The downcoast (+x) peak: a little steeper and shorter. */
  downPeakX: 121, downSlope: 1 / 44, downRounding: 12, downReach: 45, downCrestZ: -121, downCrestDepth: 2.75,
  /**
   * Version B (canyon-b, 2026-11-01, docs/research/canyon-b-2026-11-01; the owner: "the wave starts from the centre, is
   * surfable into the reef area and forms a tube … the most consistent, requires only wave work"). `reef` 1: the reef's
   * terrace, its arm 120 m out at x −17 (version A, `CANYON_BEACH`, the `?canyonBed=old` dev switch); 0: none. `bowl` 1:
   * the upcoast bar's +x arm runs on, with no rip, into a reef bowl where its waves stand up and pitch, then backs off
   * into a channel (the plain 5 m floor) before the downcoast bar.
   */
  reef: 0, bowl: 1,
  /**
   * The bowl along the upcoast bar's +x arm, m from its tip (u; the water-physics advisor, 2026-11-01): the arm as it was
   * to `bowlFrom`; the bowl ramping in over `bowlRamp`; whole to `bowlEnd`; its crest deepening to `bowlBackCrest` over
   * `bowlBackOff`, so the wave backs off; then bar and bowl fade into the floor over `bowlFade` (the arm's taper). Its
   * breaking is the reef's (the spot's 0.65 onset and the age gate, `ageJoin`) from `bowlFrom`, the beach's blending in
   * over `bowlRulesBlend` m on the arm's side.
   */
  bowlFrom: 50, bowlRamp: 10, bowlEnd: 75, bowlBackOff: 8, bowlBackCrest: 2, bowlFade: 15, bowlRulesBlend: 5,
  /**
   * The bowl's transect, along +z (the advisor's, after Mead & Black's surfing-reef components: a platform just deeper
   * than where the waves break, then a ridge, a wedge's steep face, Mead 2000): seaward, the bar's own slope down to
   * `bowlPlatform` m; level there (up to 0.35 m deeper than the bar beside it) to a knee rounded ±`bowlKnee` m; a face
   * climbing at `bowlFace` to a crest `bowlCrest` m deep on the bar's `bowlCrestContour` m contour (so its contours run
   * with the arm's, at `barAngle`); a top level for `bowlTop` m, then down at `bowlBack` to meet the bar, no lagoon.
   * ξb about 0.53–0.58 along +z at Medium and Big (the advisor's arithmetic, γ ≈ 1).
   */
  bowlCrestContour: 1.9, bowlCrest: 1.2, bowlPlatform: 3, bowlFace: 1 / 21, bowlKnee: 4, bowlTop: 9, bowlBack: 1 / 30,
};

/**
 * Which Canyon layout a sea runs (`SurfZoneConfig.canyonBed`, the `?canyonBed=old` dev switch): 'reef', today's (version
 * B, canyon-b: the upcoast bar's +x arm runs into a reef bowl), or 'old', the layout before it (`CANYON_BEACH`: version A,
 * the reef 120 m out with a beach peak either side, main's at 376d9cd4).
 */
export type CanyonBed = 'reef' | 'old';

/** The Canyon's shape: `CANYON`, or the layout before it (`canyonShape`). */
export type CanyonShape = typeof CANYON;

/**
 * The Canyon's whole layout before canyon-b (2026-11-01), main's at 376d9cd4 (#158 canyon-beach-break and the work on it
 * since): the reef's planar 1:23 arm at 70° from its peak 120 m out at x −17, a sandbar A-frame either side with a rip
 * between each and the reef, in the 400 m window, riders starting at the upcoast peak. Kept for the `?canyonBed=old` dev
 * switch, so the owner can ride the two side by side: today's values with the reef's terrace on and no bowl, taken when
 * the module loads, so the design sweeps' changes to `CANYON` leave it as it is.
 */
export const CANYON_BEACH: CanyonShape = Object.freeze({ ...CANYON, reef: 1, bowl: 0 });

/** The Canyon's shape for a layout: `CANYON` itself by default (so the design sweeps' changes hold), else `CANYON_BEACH`. */
export function canyonShape(bed: CanyonBed = 'reef'): CanyonShape {
  return bed === 'old' ? CANYON_BEACH : CANYON;
}

/**
 * Version B's bowl crest line's distance seaward of its bar's waterline V, m (`canyonBarDepth`'s d): where the bar is
 * `bowlCrestContour` m deep.
 */
function bowlCrestD(c: CanyonShape): number {
  return c.bowlCrestContour / c.upSlope;
}

/** How far a point along shore is from the upcoast bar's waterline V's tip, along its run, m (`canyonBarDepth`'s run). */
function upBarRun(x: number, c: CanyonShape): number {
  const u = x - c.upPeakX;
  return Math.sqrt(u * u + c.upRounding * c.upRounding) - c.upRounding;
}

/** Version B's bowl along shore, m: from where it ramps in to where its bar fades into the floor. */
function bowlSpan(c: CanyonShape): { from: number; end: number; to: number } {
  return { from: c.upPeakX + c.bowlFrom, end: c.upPeakX + c.bowlEnd + c.bowlBackOff, to: c.upPeakX + c.bowlEnd + c.bowlBackOff + c.bowlFade };
}

/** Where the Canyon's break line (the terrace's seaward edge) crosses along-shore position x. */
export function canyonBreakLineZ(x: number, c: CanyonShape = CANYON): number {
  // Version B: the bowl's crest line, on its bar's `bowlCrestContour` m contour.
  if (!c.reef) return upBarRun(x, c) * Math.tan((c.barAngle * Math.PI) / 180) - bowlCrestD(c);
  return c.peakZ + (x - c.peakX) * Math.tan((c.angle * Math.PI) / 180);
}

/** Where the Canyon's break line runs onto the beach face (its crest depth on the beach face), along shore, m. */
export function canyonArmEndX(c: CanyonShape = CANYON): number {
  if (!c.reef) return bowlSpan(c).end;
  return c.peakX + (-c.crestDepth / c.shoreSlope - c.peakZ) / Math.tan((c.angle * Math.PI) / 180);
}

/**
 * Where the Canyon's reef ends along shore, m: its crest line's end on the beach face (`canyonArmEndX`), or, when its deep
 * face runs on (`runOn`), where that face's foot, `shelfDepth` deep below the hinge line, meets the beach face's own
 * `shelfDepth` contour. Past it the terrace tapers into the platform over `endTaper` m.
 */
export function canyonReefEndX(c: CanyonShape = CANYON): number {
  if (!c.reef || !c.runOn) return canyonArmEndX(c);
  const footBelowHinge = (c.shelfDepth - c.hingeDepth) / c.pathSlope;
  return c.peakX + (-c.shelfDepth / c.shoreSlope + footBelowHinge - canyonHingeZ(c.peakX, c)) / Math.tan(((c.angle - c.fan) * Math.PI) / 180);
}

/** Whether the Canyon's arm is ridden at along-shore position x: from its peak (and the end beside it) to where its reef ends on the beach face. */
export function canyonArmAt(x: number, c: CanyonShape = CANYON): boolean {
  // Version B: the bowl, from where it ramps in to where its crest has backed off.
  if (!c.reef) return x >= bowlSpan(c).from && x <= bowlSpan(c).end;
  return x >= c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope && x <= canyonReefEndX(c);
}

/**
 * Whether a break at (x, z) counts toward the Canyon's peel: on the arm, no further inshore of its break line than
 * `peelReach`; where the deep face runs on past the crest line's end (`runOn`), only where the reef, not the beach face,
 * makes the bed (the shore break behind it is not its wave).
 */
export function canyonPeelAt(x: number, z: number, c: CanyonShape = CANYON): boolean {
  if (!canyonArmAt(x, c) || !(z < canyonBreakLineZ(x, c) + c.peelReach)) return false;
  return !c.reef || !c.runOn || canyonTerraceDepth(x, z, c) < Math.min(c.shelfDepth, -z * c.shoreSlope) - 0.05;
}

/**
 * The Canyon's terrace at (x, z), m deep: its fan face climbing to the break line (at `pathSlope` along the waves' path
 * below the hinge, linearly from the hinge line to the break line above it), its top behind the line (level, then down to
 * the trough), and its upcoast end falling at `endSlope` across x upcoast of the peak, so every depth's contour is
 * furthest out where it turns from the line into the end; past the arm's end it tapers into the platform over `endTaper` m.
 */
export function canyonTerraceDepth(x: number, z: number, c: CanyonShape = CANYON): number {
  // Version B has no terrace: the platform, which the floor and the bars cover.
  if (!c.reef) return c.shelfDepth;
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
  // Version B: the bowl's platform's seaward end where it ramps in (its bar `bowlPlatform` m deep there).
  if (!c.reef) return upBarRun(bowlSpan(c).from, c) * Math.tan((c.barAngle * Math.PI) / 180) - c.bowlPlatform / c.upSlope;
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

/** The Canyon reef's footprint along shore, m: from its upcoast end's foot to the end of its taper past the reef's end. */
export function canyonReefSpan(c: CanyonShape = CANYON): { from: number; to: number } {
  // Version B: the bowl's, from where it ramps in to where its bar has faded into the floor.
  if (!c.reef) return { from: bowlSpan(c).from, to: bowlSpan(c).to };
  return { from: c.peakX - (c.shelfDepth - c.crestDepth) / c.endSlope, to: canyonReefEndX(c) + c.endTaper };
}

/**
 * The beach sections' floor at (x, z), m deep (`CANYON.floorDepth`): the platform's depth seaward of the floor's ramp and
 * over the reef's footprint, the floor's beside it, blended over `floorBlend` m along shore and the ramp across shore.
 * Without the beach, the platform.
 */
export function canyonFloorDepth(x: number, z: number, c: CanyonShape = CANYON): number {
  if (!c.beach || c.floorDepth >= c.shelfDepth) return c.shelfDepth;
  const reef = canyonReefSpan(c);
  // Version B: the floor everywhere, the channel past the bowl included (no 6 m pocket: the advisor, deeper water there
  // would lead the crests round the bowl's end).
  const along = !c.reef ? 1 : Math.max(smoothstep(reef.from, reef.from - c.floorBlend, x), smoothstep(reef.to, reef.to + c.floorBlend, x));
  const rampLength = (c.shelfDepth - c.floorDepth) / c.floorRamp;
  const across = smoothstep(c.floorEdge - rampLength, c.floorEdge, z);
  return c.shelfDepth - (c.shelfDepth - c.floorDepth) * along * across;
}

/**
 * A beach peak's bar (`CANYON.barAngle`): its tip along shore; its face's slope along +z; on its axis the face's top
 * (`crestZ`, `crestDepth` deep), from where its top falls gently to the waterline; its tip's rounding and its arms'
 * reach along shore, m.
 */
export interface CanyonBar {
  readonly x: number; readonly slope: number; readonly crestZ: number; readonly crestDepth: number; readonly rounding: number; readonly reach: number;
  /** Its +x arm's reach and taper, m (version B's upcoast bar runs on into its bowl; else `reach` and `CANYON.barTaper`). */
  readonly plusReach: number; readonly plusTaper: number;
  /** Version B: its +x arm runs into the reef bowl (`canyonBarDepth`). */
  readonly bowl: boolean;
}

/** The Canyon's beach peaks, upcoast (−x) first; none without the beach. */
export function canyonBars(c: CanyonShape = CANYON): CanyonBar[] {
  if (!c.beach) return [];
  const bowl = !c.reef && c.bowl > 0;
  return [
    {
      x: c.upPeakX, slope: c.upSlope, crestZ: c.upCrestZ, crestDepth: c.upCrestDepth, rounding: c.upRounding, reach: c.upReach,
      plusReach: bowl ? c.bowlEnd + c.bowlBackOff : c.upReach, plusTaper: bowl ? c.bowlFade : c.barTaper, bowl,
    },
    {
      x: c.downPeakX, slope: c.downSlope, crestZ: c.downCrestZ, crestDepth: c.downCrestDepth, rounding: c.downRounding, reach: c.downReach,
      plusReach: c.downReach, plusTaper: c.barTaper, bowl: false,
    },
  ];
}

/**
 * A bar's own depth at (x, z), m. Its V: the point lies d = tan θ (√(u² + b²) − b) − z seaward of the V through the
 * waterline (u along shore from the tip, b the tip's rounding, θ `barAngle`), so every contour runs back from the tip at θ
 * to the shore. Along d its profile is the axis's: its top falling gently from `crestDepth` at d = −crestZ to the waterline
 * at d = 0, and seaward of the top its face climbing at `slope`, the knee rounded over ±`barKnee` m (C¹).
 */
export function canyonBarDepth(bar: CanyonBar, x: number, z: number, c: CanyonShape = CANYON, bowl = true): number {
  const u = x - bar.x;
  const run = Math.sqrt(u * u + bar.rounding * bar.rounding) - bar.rounding;
  const d = Math.max(0, run * Math.tan((c.barAngle * Math.PI) / 180) - z);
  const top = bar.crestDepth / -bar.crestZ;
  const plain = top * d + (bar.slope - top) * rounded(d + bar.crestZ, c.barKnee);
  if (!bowl || !bar.bowl || !(u > c.bowlFrom)) return plain;
  // Version B: the reef bowl along its +x arm, ramping in, its crest backing off at its end.
  const share = smoothstep(c.bowlFrom, c.bowlFrom + c.bowlRamp, u);
  const crest = c.bowlCrest + (c.bowlBackCrest - c.bowlCrest) * smoothstep(c.bowlEnd, c.bowlEnd + c.bowlBackOff, u);
  return plain + (bowlProfile(d, plain, crest, bar, c) - plain) * share;
}

/**
 * Version B's bowl's depth `d` m seaward of its bar's waterline V (`canyonBarDepth`), the bar there `plain` m deep, its
 * crest `crest` m deep: seaward of the crest a face at `bowlFace` up from a level platform `bowlPlatform` deep (its knee
 * rounded), the bar's own slope beyond; inshore a top level for `bowlTop`, then down at `bowlBack` to meet the bar.
 */
function bowlProfile(d: number, plain: number, crest: number, bar: CanyonBar, c: CanyonShape): number {
  const crestD = c.bowlCrestContour / bar.slope;
  if (d >= crestD) {
    const knee = crestD + Math.max(0, c.bowlPlatform - crest) / c.bowlFace;
    const face = crest + c.bowlFace * (d - crestD) - c.bowlFace * rounded(d - knee, c.bowlKnee);
    // Seaward of where the bar is the platform's depth, the bar's own slope (the kink rounded over a centimetre's depth).
    return face + rounded(plain - Math.max(crest, c.bowlPlatform), 0.05);
  }
  const back = crest + c.bowlBack * rounded(crestD - c.bowlTop - d, 2);
  return Math.min(back, plain);
}

/** The Canyon's bed beneath its bars at (x, z): the floor, the beach face and the reef, the shallowest (`canyon`). */
function canyonBackground(x: number, z: number, c: CanyonShape): number {
  return Math.min(canyonFloorDepth(x, z, c), -z * c.shoreSlope, canyonTerraceDepth(x, z, c));
}

/**
 * The Canyon's bed at (x, z) where it is water (z < 0): the background (the platform or the beach sections' floor, the
 * 1:15 beach face, the reef's terrace, the shallowest), with each beach peak's bar where it is shallower, faded into the
 * background past its arms' reach over `barTaper` m along shore.
 */
export function canyonSeaDepth(x: number, z: number, c: CanyonShape = CANYON): number {
  return withBars(canyonBackground(x, z, c), x, z, c);
}

/**
 * The Canyon's sand bed at (x, z), z < 0, m deep: its bed without the reef's terrace (the platform or the floor, the beach
 * face and the bars). The rock cover is the terrace where it stands above this (`canyonRockCover`), so the bars, sand
 * themselves, never turn to rock.
 */
export function canyonSandDepth(x: number, z: number, c: CanyonShape = CANYON): number {
  return withBars(Math.min(canyonFloorDepth(x, z, c), -z * c.shoreSlope), x, z, c, false);
}

/**
 * The Canyon's rock at (x, z), m deep, where it stands above the sand (`canyonSandDepth`): its reef's terrace, or version
 * B's bowl (the bed with it, `canyonSeaDepth`).
 */
export function canyonRockDepth(x: number, z: number, c: CanyonShape = CANYON): number {
  return c.reef ? canyonTerraceDepth(x, z, c) : canyonSeaDepth(x, z, c);
}

/** How far along shore a bar's arm on the side of x reaches, and its taper, m. */
function barSide(bar: CanyonBar, x: number, c: CanyonShape): { reach: number; taper: number } {
  return x > bar.x ? { reach: bar.plusReach, taper: bar.plusTaper } : { reach: bar.reach, taper: c.barTaper };
}

/** A bed `depth` deep at (x, z) with each beach peak's bar where it is shallower, faded past its arms' reach (`bowl`: with version B's). */
function withBars(background: number, x: number, z: number, c: CanyonShape, bowl = true): number {
  let depth = background;
  for (const bar of canyonBars(c)) {
    const side = barSide(bar, x, c);
    const fade = smoothstep(side.reach, side.reach + side.taper, Math.abs(x - bar.x));
    if (fade >= 1) continue;
    depth -= Math.max(0, depth - canyonBarDepth(bar, x, z, c, bowl)) * (1 - fade);
  }
  return depth;
}

/** Which beach peak's bar raises the bed at (x, z) (its index in `canyonBars`), or −1: the bed there is not a bar's. */
export function canyonBarAt(x: number, z: number, c: CanyonShape = CANYON): number {
  if (!(z < 0)) return -1;
  const bars = canyonBars(c);
  const background = canyonBackground(x, z, c);
  for (let k = 0; k < bars.length; k += 1) {
    const bar = bars[k];
    const side = barSide(bar, x, c);
    if (Math.abs(x - bar.x) >= side.reach + side.taper) continue;
    if (canyonBarDepth(bar, x, z, c) < background) return k;
  }
  return -1;
}

/**
 * The Canyon's breaking onset at (x, z), as a fraction of √(g h), given the spot's own `onset` (the reef's): the beach's
 * `barOnset` in the beach sections where the bed is `onsetShallow` m deep or shallower, easing back to `onset` at
 * `onsetDeep` m; `onset` itself, exactly, over the reef's footprint and `onsetPin` m beside it, with the beach's blending
 * in over `onsetBlend` m along shore beyond. Without the beach, `onset` everywhere.
 */
export function canyonOnset(x: number, z: number, onset: number, c: CanyonShape = CANYON): number {
  if (!c.beach || c.barOnset === onset) return onset;
  const along = canyonBeachShare(x, c);
  if (!(along > 0) || !(z < 0)) return onset;
  const shallow = smoothstep(c.onsetDeep, c.onsetShallow, canyonSeaDepth(x, z, c));
  return shallow > 0 ? onset + (c.barOnset - onset) * along * shallow : onset;
}

/**
 * How far along-shore position x is the beach's for its breaking rules, 0–1: 0 over the reef's footprint and `onsetPin` m
 * beside it, 1 past the `onsetBlend` m beyond (inside the rips, where nothing should break), smoothly between.
 */
export function canyonBeachShare(x: number, c: CanyonShape = CANYON): number {
  if (!c.beach) return 0;
  const reef = canyonReefSpan(c);
  // Version B: the bowl's rules from where it ramps in, the beach's blending in over `bowlRulesBlend` on the arm's side.
  if (!c.reef) {
    return Math.max(
      smoothstep(reef.from, reef.from - c.bowlRulesBlend, x),
      smoothstep(reef.to + c.onsetPin, reef.to + c.onsetPin + c.onsetBlend, x),
    );
  }
  return Math.max(
    smoothstep(reef.from - c.onsetPin, reef.from - c.onsetPin - c.onsetBlend, x),
    smoothstep(reef.to + c.onsetPin, reef.to + c.onsetPin + c.onsetBlend, x),
  );
}

/**
 * The Canyon's breaking-age join at along-shore position x (`KennedyOptions.joinAt`), given the reef's `join`
 * (`CANYON.ageJoin`): the reef's over its footprint and `onsetPin` m beside it, the beach's `barJoin` past the blend.
 */
export function canyonJoin(x: number, join: number, c: CanyonShape = CANYON): number {
  if (!c.beach || c.barJoin === join) return join;
  const along = canyonBeachShare(x, c);
  return along > 0 ? join + (c.barJoin - join) * along : join;
}

function canyon(c: CanyonShape): SurfSpot {
  return {
    name: 'canyon',
    depthAt(x, z) {
      const offshore = -z;
      if (offshore <= 0) return offshore * 0.06;
      // The shelf (or the beach sections' floor) and the beach face, the terrace and the bars on them where shallower.
      return canyonSeaDepth(x, z, c);
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
