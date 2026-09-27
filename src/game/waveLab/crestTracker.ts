/** The water the tracker reads (the snapshot's surface): height and foam at (x, z). */
export interface SurfaceField {
  height(x: number, z: number): number;
  foam(x: number, z: number): number;
}

export interface CrestPoint {
  x: number;
  y: number;
  z: number;
}

/** Foam this dense on the crest counts as breaking. */
export const FOAM_BREAKING = 0.35;
/** A crest stands at least this far above the lowest water around it, m. */
const PROMINENCE = 0.1;
const SCAN_STEP = 0.5;
/** Each frame the crest is looked for again this far either side of where it should be, m. */
const REFIND = 4;
/** Along the crest, how far the breaking edge is looked for, m, and how fast the point may slide to it, m/s. */
const EDGE_REACH = 30;
const EDGE_SPEED = 20;

/**
 * The crest (a local surface maximum along z, the waves' travel) nearest z within
 * ±reach, m, or none. A first search asks for PROMINENCE; following a crest
 * already found asks for none, since a few metres either side of a long wave's
 * crest the water barely falls.
 */
export function findCrest(field: SurfaceField, x: number, z: number, reach = 30, prominence = PROMINENCE): CrestPoint | undefined {
  const count = Math.floor((2 * reach) / SCAN_STEP) + 1;
  const heights = new Float64Array(count);
  let lowest = Infinity;
  for (let i = 0; i < count; i += 1) {
    heights[i] = field.height(x, z - reach + i * SCAN_STEP);
    lowest = Math.min(lowest, heights[i]);
  }
  let best: CrestPoint | undefined;
  for (let i = 1; i < count - 1; i += 1) {
    const h = heights[i];
    if (!(h > heights[i - 1] && h >= heights[i + 1] && h - lowest >= prominence)) continue;
    // A parabola through the three samples places the crest between them.
    const curve = heights[i - 1] - 2 * h + heights[i + 1];
    const offset = curve < 0 ? (0.5 * (heights[i - 1] - heights[i + 1])) / curve : 0;
    const at = z - reach + (i + offset) * SCAN_STEP;
    if (!best || Math.abs(at - z) < Math.abs(best.z - z)) best = { x, y: field.height(x, at), z: at };
  }
  return best;
}

/**
 * Follows one crest for the lab's Follow (spec L1): each frame it looks for the
 * crest again where it should have moved, then slides along it toward the
 * breaking edge (where foam starts along the crest). Lost, it holds still.
 */
export class CrestTracker {
  point?: CrestPoint;
  lost = false;
  /** The crest's shoreward speed, m/s, smoothed from frame to frame. */
  private speed = 0;

  start(field: SurfaceField, x: number, z: number): boolean {
    const crest = findCrest(field, x, z);
    this.point = crest ?? { x, y: field.height(x, z), z };
    this.lost = crest === undefined;
    this.speed = 0;
    return !this.lost;
  }

  update(field: SurfaceField, dt: number): { dx: number; dy: number; dz: number } {
    const still = { dx: 0, dy: 0, dz: 0 };
    const point = this.point;
    if (!point || !(dt > 0)) return still;
    const crest = findCrest(field, point.x, point.z + this.speed * dt, REFIND, 0);
    if (!crest) {
      this.lost = true;
      return still;
    }
    this.lost = false;
    const measured = (crest.z - point.z) / dt;
    this.speed += (measured - this.speed) * Math.min(1, dt / 0.25);
    const x = point.x + this.slide(field, crest, dt);
    const along = findCrest(field, x, crest.z, REFIND, 0) ?? crest;
    const next = { x, y: along.y, z: along.z };
    const delta = { dx: next.x - point.x, dy: next.y - point.y, dz: next.z - point.z };
    this.point = next;
    return delta;
  }

  /** How far to move along the crest this frame: toward the nearest place its foam crosses FOAM_BREAKING. */
  private slide(field: SurfaceField, crest: CrestPoint, dt: number): number {
    const breaking = (x: number) => field.foam(x, findCrest(field, x, crest.z, REFIND, 0)?.z ?? crest.z) >= FOAM_BREAKING;
    const here = breaking(crest.x);
    for (let d = 1; d <= EDGE_REACH; d += 1) {
      for (const side of [1, -1]) {
        if (breaking(crest.x + side * d) !== here) {
          // The edge lies between d − 1 and d; stop on its unbroken side.
          const target = side * (here ? d : d - 1);
          const limit = EDGE_SPEED * dt;
          return Math.max(-limit, Math.min(limit, target));
        }
      }
    }
    return 0;
  }
}
