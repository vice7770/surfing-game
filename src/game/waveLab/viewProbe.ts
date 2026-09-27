type Height = (x: number, z: number) => number;
type Point = { x: number; y: number; z: number };

/** How far the ray is marched, m, in steps of MARCH m; looking away from the water, the point this far ahead. */
const MAX_DISTANCE = 400;
const MARCH = 1;
const AHEAD = 40;

/**
 * Where the view meets the water (spec L1's info card): the first crossing of
 * the surface along the ray, from above or from below. With none (looking at the
 * sky, or level), the water AHEAD m ahead along the view's horizontal direction.
 */
export function waterUnderView(origin: Point, direction: Point, height: Height): { x: number; z: number } {
  const side = (t: number) => origin.y + direction.y * t - height(origin.x + direction.x * t, origin.z + direction.z * t);
  const start = Math.sign(side(0)) || 1;
  let previous = 0;
  for (let t = MARCH; t <= MAX_DISTANCE; t += MARCH) {
    if (Math.sign(side(t)) === start) {
      previous = t;
      continue;
    }
    let low = previous;
    let high = t;
    for (let i = 0; i < 20; i += 1) {
      const mid = 0.5 * (low + high);
      if (Math.sign(side(mid)) === start) low = mid;
      else high = mid;
    }
    return { x: origin.x + direction.x * high, z: origin.z + direction.z * high };
  }
  const flat = Math.hypot(direction.x, direction.z);
  const x = flat > 1e-6 ? direction.x / flat : 0;
  const z = flat > 1e-6 ? direction.z / flat : -1;
  return { x: origin.x + x * AHEAD, z: origin.z + z * AHEAD };
}

/** The face at (x, z): the crest nearest it minus the lowest water seaward of that crest, within reach; none under 5 cm. */
export function measureFace(height: Height, x: number, z: number, reach = 40): number | undefined {
  let crestZ = z;
  let crest = -Infinity;
  for (let dz = -reach / 2; dz <= reach / 2; dz += 0.5) {
    const h = height(x, z + dz);
    if (h > crest) {
      crest = h;
      crestZ = z + dz;
    }
  }
  let trough = Infinity;
  for (let dz = 0; dz <= reach; dz += 0.5) trough = Math.min(trough, height(x, crestZ - dz));
  const face = crest - trough;
  return face >= 0.05 ? face : undefined;
}
