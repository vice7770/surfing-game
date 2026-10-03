import { LOFT_SAMPLES, type LoftResult } from '../wave/barrel/sweptLoft';

/**
 * What the camera test reads of the swept barrel's loft: the triangles the page draws (and `rasterizeBarrelMask` walks),
 * their vertices and the counts of both, and no other field, so any indexed triangle list laid out as the loft's
 * (`LOFT_SAMPLES` vertices a slice, each strip's quads joining a slice to the next) stands in for it.
 */
export type DrawnLoft = Pick<LoftResult, 'positions' | 'indices' | 'indexCount' | 'vertexCount'>;

/** The box a drawn loft's vertices span: its footprint in xz, and its highest point, m. */
export interface DrawnLoftBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  top: number;
}

/**
 * The box of the loft's vertices (its first `vertexCount`, the ones its triangles use), for the camera test's early
 * outs: no triangle covers a point outside the footprint, and none lies above a point over the top. One pass over the
 * vertices in memory order, a few per cent of the triangle scan's cost (each triangle's corners are read through its
 * indices). Empty (an inverted box) for a loft with no vertices.
 */
export function drawnLoftBounds(loft: DrawnLoft, out: DrawnLoftBounds = { xMin: 0, xMax: 0, zMin: 0, zMax: 0, top: 0 }): DrawnLoftBounds {
  const { positions: p } = loft;
  let xMin = Infinity;
  let xMax = -Infinity;
  let zMin = Infinity;
  let zMax = -Infinity;
  let top = -Infinity;
  for (let k = 0, end = 3 * loft.vertexCount; k < end; k += 3) {
    const x = p[k];
    const y = p[k + 1];
    const z = p[k + 2];
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y > top) top = y;
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  out.xMin = xMin;
  out.xMax = xMax;
  out.zMin = zMin;
  out.zMax = zMax;
  out.top = top;
  return out;
}

/**
 * Whether a point is in the water the page draws, where the swept barrel's loft is drawn over it (the owner's one-water
 * rule: the camera is in whatever is drawn at its position, and the rider in the same water). The solver's water height,
 * which the camera was compared with, is the hump the tube is cut from under a swept lip, so a camera inside the drawn
 * tube counted as under water and the scene turned to its underwater fog and sound (the critics' flat teal in every
 * curl-inside tile).
 *
 * The rider's contact decides as `SweptContact.query` does, on the drawn triangles: of the strips (a slice's quads to
 * the next) whose triangles cross the vertical through the point, the first one (the lowest slice: the first front's,
 * as its `strip` takes it), and in it, an odd number of crossings above the point is water. Where one front's strips
 * overlap in plan (its rays cross where the crest curves) or two fronts' do, that one strip alone answers, as it does for
 * the rider; summing every strip's crossings disagreed with the contact at 11 % of such points at Padang Padang's Medium
 * swell. A strip whose crossings all lie above the point with an even count is not closed there (a fold at its edge), and,
 * as for the contact, the water answers. The point counts as in water when it is more than `margin` m under its top
 * surface: in the water at the point and at the point raised by `margin`, as `y < height − margin` has been for the
 * solver's single surface.
 *
 * Returns undefined where no triangle lies over the point (the loft does not cover it, and the solver's water is what is
 * drawn) or where the strip is open. A point exactly on an edge two triangles share is counted in one of them
 * (SweptContact.triangle's rule), so the answer does not flicker on a seam. Only + − × ÷ over the loft's triangles; a
 * scan with a box test first, a fraction of a millisecond for a full loft (`LOFT.budget`). `drawnLoftBounds` lets a
 * caller skip it where the answer is known.
 */
export function pointInDrawnWater(loft: DrawnLoft, x: number, y: number, z: number, margin = 0): boolean | undefined {
  const { positions: p, indices, indexCount } = loft;
  const raised = y + margin;
  let strip = -1;
  let below = 0;
  let above = 0;
  let aboveRaised = 0;
  for (let t = 0; t + 2 < indexCount; t += 3) {
    const a = indices[t];
    const b = indices[t + 1];
    const c = indices[t + 2];
    const ax = p[3 * a];
    const bx = p[3 * b];
    const cx = p[3 * c];
    // The box test first: most triangles are metres from the point.
    if (x < ax && x < bx && x < cx) continue;
    if (x > ax && x > bx && x > cx) continue;
    const az = p[3 * a + 2];
    const bz = p[3 * b + 2];
    const cz = p[3 * c + 2];
    if (z < az && z < bz && z < cz) continue;
    if (z > az && z > bz && z > cz) continue;
    const area = edge(p, a, b, cx, cz);
    if (area === 0) continue;
    const sign = area > 0 ? 1 : -1;
    const wa = edge(p, b, c, x, z);
    if (!inside(wa, b, c, sign)) continue;
    const wb = edge(p, c, a, x, z);
    if (!inside(wb, c, a, sign)) continue;
    const wc = edge(p, a, b, x, z);
    if (!inside(wc, a, b, sign)) continue;
    // The triangle's strip: its lowest vertex's slice. A later strip than one that already crosses has no say.
    const own = ((a < b ? (a < c ? a : c) : b < c ? b : c) / LOFT_SAMPLES) | 0;
    if (strip >= 0 && own > strip) continue;
    if (own !== strip) {
      strip = own;
      below = 0;
      above = 0;
      aboveRaised = 0;
    }
    const crossing = (wa * p[3 * a + 1] + wb * p[3 * b + 1] + wc * p[3 * c + 1]) / area;
    if (crossing > y) above += 1;
    else below += 1;
    if (crossing > raised) aboveRaised += 1;
  }
  if (strip < 0) return undefined;
  if ((above & 1) === 0 && below === 0) return undefined;
  return (above & 1) === 1 && (aboveRaised & 1) === 1;
}

/**
 * (v − u) × (point − u) in xz, computed from the lower-numbered vertex so (u, v) and (v, u) differ only in sign:
 * neighbours sharing an edge see exactly opposite values (as `SweptContact.edge`).
 */
function edge(p: Float32Array, u: number, v: number, x: number, z: number): number {
  const lo = u < v ? u : v;
  const hi = u < v ? v : u;
  const value = (p[3 * hi] - p[3 * lo]) * (z - p[3 * lo + 2]) - (p[3 * hi + 2] - p[3 * lo + 2]) * (x - p[3 * lo]);
  return u < v ? value : -value;
}

/** A zero counts for the triangle whose winding runs the edge from its lower vertex when its area is positive (from its higher when negative), so a shared edge counts once. */
function inside(value: number, u: number, v: number, sign: number): boolean {
  return value * sign > 0 || (value === 0 && (sign > 0) === (u < v));
}
