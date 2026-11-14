import { REFERENCE_BOARD } from './boardReference';

type Point = readonly [number, number];
interface Vec { x: number; y: number; z: number }

/**
 * Monotone piecewise cubic (Fritsch–Carlson PCHIP) through `points`, clamped at
 * the ends: it never overshoots its points, so a stated widest or thickest
 * point stays the widest or thickest.
 */
export function monotoneCurve(points: readonly Point[]): (s: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    h.push(xs[i + 1] - xs[i]);
    d.push((ys[i + 1] - ys[i]) / h[i]);
  }
  const m = new Array<number>(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (d[i - 1] * d[i] <= 0) continue;
    const w1 = 2 * h[i] + h[i - 1];
    const w2 = h[i] + 2 * h[i - 1];
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return (s: number) => {
    const x = Math.min(xs[n - 1], Math.max(xs[0], s));
    let k = 0;
    while (k < n - 2 && x > xs[k + 1]) k += 1;
    const t = (x - xs[k]) / h[k];
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h[k] * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h[k] * m[k + 1];
  };
}

/** One bottom patch of the hull, in the board frame: x across, y up (lowest bottom point at 0), z toward the nose (mid-length at 0). */
export interface HullPatch {
  /** Centre of the patch on the bottom surface, m. */
  position: Vec;
  /** Outward (downward) bottom normal. */
  normal: Vec;
  /** Planform area, m². */
  area: number;
  /** Deck above bottom here, m. */
  thickness: number;
  volume: number;
  /** Patch size along the board, m. */
  length: number;
  /**
   * The rail band (`section: 'rail'`, step 3.2u), absent on a flat-bottomed board:
   * - `turn`, the facet's own turn angle around the band, rad, **unsigned, datum the flat bottom's own tangent**;
   * - `sweep`, the band's whole angular sweep at this station, rad;
   * - `side`, +1 for the board's +x rail and −1 for the −x one;
   * - `faceArea`, the facet's **true** wetted area, m², which is `area`/cos(turn) and is what the pressure, the friction
   *   and the suction are taken over. `area` stays the **planform**, because `BoardBody`'s station beam is Σ area/length
   *   and its added mass, radiation and `planingScales` all hang off that beam (the advisor's trap 2);
   * - `up`, the station's own deck direction (its flat bottom's −normal), because the deck of a near-vertical band facet
   *   cannot be found along that facet's own normal (the advisor's trap 1, `hullForces.ts`'s `deckY`).
   */
  band?: { turn: number; sweep: number; side: number; faceArea: number; up: Vec };
}

export interface BoardShape {
  length: number;
  maxWidth: number;
  /** Width, bottom height (rocker) and stringer thickness, m, at fraction s of the length from the tail. */
  curves: { width: (s: number) => number; rocker: (s: number) => number; thickness: (s: number) => number };
  /** Rail taper a: thickness across the width is t(s)(1 − a |u|^p) at u ∈ [−1, 1], p = 2 flat and 1 for the rail section. */
  taper: number;
  /** `'flat'` as the board has always been, `'rail'` with the cross-section and its band (`RAIL_BAND`). */
  section: BoardSection;
  patches: HullPatch[];
  volume: number;
  planformArea: number;
  mass: number;
  centerOfMass: Vec;
  /** About the centre of mass, board frame, row-major 3 × 3 (kg·m²). */
  inertia: number[];
}

/**
 * Shortboard shape as fractions of length from tail (0) to nose (1). These are
 * modelling values typical of a thruster shortboard, not measurements: a squash
 * tail, a wide point just behind mid-length, 3.5 cm tail and 12.5 cm nose rocker,
 * and a thickness that peaks at the stringer. Widths and thicknesses are scaled to
 * the reference board.
 */
const OUTLINE: Point[] = [[0, 0.56], [0.17, 0.71], [0.47, 1], [0.83, 0.625], [0.95, 0.32], [1, 0]];
const ROCKER: Point[] = [[0, 0.035], [0.3, 0.004], [0.45, 0], [0.7, 0.02], [0.9, 0.08], [1, 0.125]];
const THICKNESS: Point[] = [[0, 0.5], [0.2, 0.9], [0.45, 1], [0.7, 0.93], [0.9, 0.55], [1, 0.2]];

/**
 * The rail band (step 3.2u, `buildBoardShape(..., 'rail')`; the water-physics advisor's design of 2026-11-14, logged in
 * `docs/research/water-physics/consult-log.md`). Until this, every bottom patch carried the one flat-bottom normal
 * `{ x: 0, … }`, so rolled on its rail the board had no surface left pointing down (Part 17 §1) and the hull could only
 * ever *push*, never grip.
 *
 * The section: a flat bottom out to the band's start, then a circular band tangent to it, turning through `SWEEP` by the
 * mid-length and `FACETS` facets wide, spaced by **equal turn angle** (the advisor: ≥ 4 facets inside the band, spaced
 * by turn, not evenly across the beam — four patches across the whole beam cannot see a band at all). The band occupies
 * the **outer** part of the station's own half-beam, so the board's planform, its beam and its maximum width are
 * unchanged to the bit.
 *
 * **The band forced one other change, and it is the interesting part of the geometry.** A band of radius R turns the
 * bottom over to an apex R above it, so a coherent section needs the local rail at least 2R thick. Today's thickness
 * across the beam is `t(1 − a u²)` with a solved at **0.925** to hold 25.75 L — that is the section-area coefficient
 * **0.692 of w × t** the advisor said must stay, and with a *squared* taper 0.692 forces a 5 mm knife edge at the rail
 * (Part 17 §3 item 2 measured it: the buried rail's deck edge sits 1–3 mm above its bottom edge). A 12–25 mm radius
 * cannot live in a 5 mm rail. But the exponent is nobody's measurement: with the taper **linear** across the beam,
 * `t(1 − a|u|)`, the same 0.692 coefficient gives a = 0.616 and a **26 mm rail**, which carries a 13 mm band. Same
 * volume, same maximum thickness, same beam, same planform, same area coefficient — a different distribution of the
 * thickness across the beam, and the one that can hold a rail. So `'rail'` is a linear taper plus the band, and
 * `RAIL_BAND.power` is the one number in it that is a modelling choice rather than a measurement [I].
 *
 * The radius is then **half the local rail thickness where the band starts**, capped by the advisor's own millimetres —
 * 7 mm at the tail, 13–14 mm from mid-length forward, inside the 12–25 mm it asked for at the thin end. Its own caveat
 * was that every millimetre of its section was [I], with no measured shortboard cross-section behind it.
 *
 * **The rail side-face foils go with it** (`BoardBody.buildFoils`). They were a bluff stand-in for exactly the surface
 * the band now carries, so keeping both would count the rail twice; dropping them also means `shape.taper` no longer
 * reaches anything that could move (the advisor's trap 3), and the fins never used it.
 */
const RAIL_RADIUS: Point[] = [[0, 0.012], [0.45, 0.018], [0.7, 0.025], [1, 0.025]];
const RAIL_SWEEP: Point[] = [[0, 30], [0.12, 30], [0.45, 90], [1, 90]];
export const RAIL_BAND = { facets: 4, fill: 1, minSlab: 0.002, power: 1 } as const;

/** A board's bottom: `'flat'` as it has always been, one normal a station; `'rail'` with a real cross-section (`RAIL_RADIUS`). */
export type BoardSection = 'flat' | 'rail';

/**
 * The reference shortboard as bottom patches (12 along × 4 across by default).
 * Rails taper the thickness across the width as t(1 − a u²), with a solved so
 * the patches hold exactly the reference volume; the shell's mass is spread in
 * proportion to volume.
 */
/** A board's main dimensions: length, width, thickness (m), volume (m³) and shell mass (kg), as `REFERENCE_BOARD` gives them. */
export interface BoardDimensions {
  readonly length: number;
  readonly width: number;
  readonly thickness: number;
  readonly volume: number;
  readonly mass: number;
}

export function buildBoardShape(reference: BoardDimensions = REFERENCE_BOARD, stations = 12, across = 4, section: BoardSection = 'flat'): BoardShape {
  const outline = monotoneCurve(OUTLINE.map(([s, w]) => [s, w * reference.width] as const));
  const rocker = monotoneCurve(ROCKER);
  const thickness = monotoneCurve(THICKNESS.map(([s, t]) => [s, t * reference.thickness] as const));
  const radiusAsked = monotoneCurve(RAIL_RADIUS);
  const sweepAt = monotoneCurve(RAIL_SWEEP);
  const length = reference.length;
  const stationLength = length / stations;
  type Draft = Omit<HullPatch, 'thickness' | 'volume'> & { stringer: number; u: number; drop: number };
  /**
   * The patches at a given rail radius (0 on every station for the flat board). `drop` is how much the band's turn-over
   * takes off the local slab, so the volume is linear in the taper and can be solved in one line below.
   */
  const build = (radiusOf: (s: number) => number): Draft[] => {
    const draft: Draft[] = [];
    for (let k = 0; k < stations; k += 1) {
      const s = (k + 0.5) / stations;
      const halfWidth = outline(s) / 2;
      const slope = (rocker(Math.min(1, s + 1e-4)) - rocker(Math.max(0, s - 1e-4))) / (2e-4 * length);
      const norm = Math.hypot(1, slope);
      const z = -length / 2 + s * length;
      const stringer = thickness(s);
      const radius = radiusOf(s);
      const sweep = (sweepAt(s) * Math.PI) / 180;
      // The band takes the outer `radius · sin sweep` of the half-beam, so the planform and the beam are unchanged.
      const bandWidth = radius * Math.sin(sweep);
      const flatHalf = halfWidth - bandWidth;
      const up = { x: 0, y: 1 / norm, z: -slope / norm };
      for (let j = 0; j < across; j += 1) {
        const u = (-1 + ((j + 0.5) * 2) / across) * (flatHalf / halfWidth);
        draft.push({
          position: { x: u * halfWidth, y: rocker(s), z },
          normal: { x: 0, y: -1 / norm, z: slope / norm },
          area: stationLength * ((2 * flatHalf) / across),
          length: stationLength,
          stringer,
          u,
          drop: 0,
        });
      }
      if (!(bandWidth > 0)) continue;
      const edge = flatHalf / halfWidth;
      for (const side of [-1, 1]) {
        for (let j = 0; j < RAIL_BAND.facets; j += 1) {
          const from = (sweep * j) / RAIL_BAND.facets;
          const to = (sweep * (j + 1)) / RAIL_BAND.facets;
          const turn = (from + to) / 2;
          draft.push({
            // On the circle tangent to the flat bottom at the band's start, its centre `radius` directly above it.
            position: { x: side * (flatHalf + radius * Math.sin(turn)), y: rocker(s) + radius * (1 - Math.cos(turn)), z },
            // The flat bottom's normal turned about the board's long axis: the first normal in this model with any x at
            // all. Turning about the board's z rather than about the rocker-tilted rail tangent leaves z alone and is
            // off by order `slope · sin turn` (≤ 0.07 at the nose, 0.004 mid-board) [I].
            normal: { x: side * Math.sin(turn) / norm, y: -Math.cos(turn) / norm, z: slope / norm },
            area: stationLength * radius * (Math.sin(to) - Math.sin(from)),
            length: stationLength,
            stringer,
            // The band's slab hangs off the rail's thickness where the band starts, not off the facet's own x.
            u: edge,
            drop: 2 * radius * (1 - Math.cos(turn)),
            band: { turn, sweep, side, faceArea: stationLength * radius * (to - from), up },
          });
        }
      }
    }
    return draft;
  };
  /**
   * The thickness across the beam, `stringer(1 − a |u|^p) − drop`: squared (p = 2) as it has always been, linear for
   * the rail section. Either way the volume is linear in a, so the taper that holds the reference volume is one line.
   */
  const squared = section !== 'rail';
  /**
   * `u * u` rather than `Math.abs(u) ** 2` on the flat path, and `area * stringer * u * u` in that order below: the
   * expressions must stay **bit for bit** what they were, because the taper they solve sets every patch's thickness and
   * a last-bit drift there walks through the whole sim. It cost one red test to find that out (`duckTwoBody`, a 3 s
   * dive, which flipped on a taper that differed in its last bits and nothing else).
   */
  const slabOf = (stringer: number, u: number, taper: number, drop: number) => (squared
    ? stringer * (1 - taper * u * u)
    : stringer * (1 - taper * Math.abs(u) ** RAIL_BAND.power) - drop);
  const solve = (draft: readonly Draft[]): number => {
    let plain = 0;
    let tapered = 0;
    let dropped = 0;
    for (const patch of draft) {
      plain += patch.area * patch.stringer;
      tapered += squared ? patch.area * patch.stringer * patch.u * patch.u : patch.area * patch.stringer * Math.abs(patch.u) ** RAIL_BAND.power;
      dropped += patch.area * patch.drop;
    }
    return squared ? (plain - reference.volume) / tapered : (plain - dropped - reference.volume) / tapered;
  };
  const bare = build(() => 0);
  let draft = bare;
  let taper = solve(bare);
  if (section === 'rail') {
    // Half the rail's own thickness where the band starts, capped by the advisor's millimetres; one fixed-point step
    // places the band's start at the asked radius, which is within a millimetre of where the solved radius puts it.
    const radiusOf = (s: number) => {
      const halfWidth = outline(s) / 2;
      const sweep = (sweepAt(s) * Math.PI) / 180;
      const asked = radiusAsked(s);
      const edge = (halfWidth - asked * Math.sin(sweep)) / halfWidth;
      return Math.min(asked, (RAIL_BAND.fill * slabOf(thickness(s), edge, taper, 0)) / 2);
    };
    draft = build(radiusOf);
    taper = solve(draft);
  }
  if (!(taper >= 0 && taper < 1)) throw new RangeError(`The outline cannot hold ${reference.volume} m³ with tapering rails (a = ${taper})`);
  const patches: HullPatch[] = draft.map(({ stringer, u, drop, ...patch }) => {
    const slab = slabOf(stringer, u, taper, drop);
    const local = squared ? slab : Math.max(RAIL_BAND.minSlab, slab);
    return { ...patch, thickness: local, volume: patch.area * local };
  });
  const volume = patches.reduce((sum, patch) => sum + patch.volume, 0);
  const planformArea = patches.reduce((sum, patch) => sum + patch.area, 0);
  const mass = reference.mass;
  const center = { x: 0, y: 0, z: 0 };
  for (const patch of patches) {
    const share = (mass * patch.volume) / volume;
    center.x += share * patch.position.x;
    center.y += share * (patch.position.y + patch.thickness / 2);
    center.z += share * patch.position.z;
  }
  for (const key of ['x', 'y', 'z'] as const) center[key] /= mass;
  center.x = 0;
  const inertia = new Array<number>(9).fill(0);
  for (const patch of patches) {
    const m = (mass * patch.volume) / volume;
    const r = { x: patch.position.x, y: patch.position.y + patch.thickness / 2 - center.y, z: patch.position.z - center.z };
    const a = patch.area / patch.length;
    const b = patch.thickness;
    const c = patch.length;
    // Point mass plus the patch's own box (a across, b thick, c long).
    const own = [(m * (b * b + c * c)) / 12, (m * (a * a + c * c)) / 12, (m * (a * a + b * b)) / 12];
    const rr = [r.x, r.y, r.z];
    const r2 = r.x * r.x + r.y * r.y + r.z * r.z;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) inertia[i * 3 + j] += m * ((i === j ? r2 : 0) - rr[i] * rr[j]) + (i === j ? own[i] : 0);
    }
  }
  let maxWidth = 0;
  for (let s = 0; s <= 1; s += 0.001) maxWidth = Math.max(maxWidth, outline(s));
  return { length, maxWidth, curves: { width: outline, rocker, thickness }, taper, section, patches, volume, planformArea, mass, centerOfMass: center, inertia };
}
