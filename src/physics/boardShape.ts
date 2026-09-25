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
}

export interface BoardShape {
  length: number;
  maxWidth: number;
  /** Width, bottom height (rocker) and stringer thickness, m, at fraction s of the length from the tail. */
  curves: { width: (s: number) => number; rocker: (s: number) => number; thickness: (s: number) => number };
  /** Rail taper a: thickness across the width is t(s)(1 − a u²) at u ∈ [−1, 1]. */
  taper: number;
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
 * The reference shortboard as bottom patches (12 along × 4 across by default).
 * Rails taper the thickness across the width as t(1 − a u²), with a solved so
 * the patches hold exactly the reference volume; the shell's mass is spread in
 * proportion to volume.
 */
export function buildBoardShape(reference: typeof REFERENCE_BOARD = REFERENCE_BOARD, stations = 12, across = 4): BoardShape {
  const outline = monotoneCurve(OUTLINE.map(([s, w]) => [s, w * reference.width] as const));
  const rocker = monotoneCurve(ROCKER);
  const thickness = monotoneCurve(THICKNESS.map(([s, t]) => [s, t * reference.thickness] as const));
  const length = reference.length;
  const stationLength = length / stations;
  const draft: Array<Omit<HullPatch, 'thickness' | 'volume'> & { stringer: number; u: number }> = [];
  for (let k = 0; k < stations; k += 1) {
    const s = (k + 0.5) / stations;
    const halfWidth = outline(s) / 2;
    const slope = (rocker(Math.min(1, s + 1e-4)) - rocker(Math.max(0, s - 1e-4))) / (2e-4 * length);
    const norm = Math.hypot(1, slope);
    for (let j = 0; j < across; j += 1) {
      const u = -1 + ((j + 0.5) * 2) / across;
      draft.push({
        position: { x: u * halfWidth, y: rocker(s), z: -length / 2 + s * length },
        normal: { x: 0, y: -1 / norm, z: slope / norm },
        area: stationLength * ((2 * halfWidth) / across),
        length: stationLength,
        stringer: thickness(s),
        u,
      });
    }
  }
  let plain = 0;
  let tapered = 0;
  for (const patch of draft) {
    plain += patch.area * patch.stringer;
    tapered += patch.area * patch.stringer * patch.u * patch.u;
  }
  const taper = (plain - reference.volume) / tapered;
  if (!(taper >= 0 && taper < 1)) throw new RangeError(`The outline cannot hold ${reference.volume} m³ with tapering rails (a = ${taper})`);
  const patches: HullPatch[] = draft.map(({ stringer, u, ...patch }) => {
    const local = stringer * (1 - taper * u * u);
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
  return { length, maxWidth, curves: { width: outline, rocker, thickness }, taper, patches, volume, planformArea, mass, centerOfMass: center, inertia };
}
