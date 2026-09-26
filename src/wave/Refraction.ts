import { waveNumber } from './dispersion';

/** A swell's rays: its peak period, s, and travel direction, rad from shore-normal +z, positive toward +x. */
export interface RaySwell {
  period: number;
  direction: number;
}

/** Still-water depth of a bed, m, at (x, z). */
export type BedDepth = (x: number, z: number) => number;

/** Spacing of the launched rays along x, m. */
const RAY_SPACING = 0.25;
/** Step along a ray, m, and the spacing of the celerity grid it reads. */
const RAY_STEP = 1;
/** Shallowest water a ray's celerity is taken at, m. */
const MIN_DEPTH = 0.05;

/**
 * Where a straight-crested swell's rays cross z = toZ, launched evenly spaced
 * along z = fromZ and refracted by the bed: linear geometric optics, in which
 * a ray turns toward slower water at the rate |∇c across the ray| / c (Snell's
 * law on a varying bed; ray theory in Mei, Stiassnie & Yue 2005). Rays that
 * turn back offshore, or wander past the traced strip, are dropped. Sorted.
 */
function crossings(depthAt: BedDepth, swell: RaySwell, fromZ: number, toZ: number, xMin: number, xMax: number): Float64Array {
  const run = toZ - fromZ;
  const reach = run * (1 + Math.abs(Math.tan(swell.direction)));
  const left = xMin - 2 * reach;
  const nx = Math.ceil((xMax - xMin + 4 * reach) / RAY_STEP) + 1;
  const nz = Math.ceil(run / RAY_STEP) + 1;
  const omega = (2 * Math.PI) / swell.period;
  const celerity = new Float64Array(nx * nz);
  for (let iz = 0; iz < nz; iz += 1) {
    for (let ix = 0; ix < nx; ix += 1) {
      const depth = Math.max(MIN_DEPTH, depthAt(left + ix * RAY_STEP, fromZ + iz * RAY_STEP));
      celerity[iz * nx + ix] = omega / waveNumber(omega, depth);
    }
  }
  const sample = (x: number, z: number) => {
    const gx = Math.min(nx - 1.000001, Math.max(0, (x - left) / RAY_STEP));
    const gz = Math.min(nz - 1.000001, Math.max(0, (z - fromZ) / RAY_STEP));
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const tx = gx - ix;
    const tz = gz - iz;
    const i = iz * nx + ix;
    return (celerity[i] * (1 - tx) + celerity[i + 1] * tx) * (1 - tz) + (celerity[i + nx] * (1 - tx) + celerity[i + nx + 1] * tx) * tz;
  };
  // Turning rate of a ray heading (dx, dz) at (x, z): −(∇c − (∇c·d) d) / c.
  const turn = (x: number, z: number, dx: number, dz: number, out: number[]) => {
    const c = sample(x, z);
    const cx = (sample(x + RAY_STEP, z) - sample(x - RAY_STEP, z)) / (2 * RAY_STEP);
    const cz = (sample(x, z + RAY_STEP) - sample(x, z - RAY_STEP)) / (2 * RAY_STEP);
    const along = cx * dx + cz * dz;
    out[0] = -(cx - along * dx) / c;
    out[1] = -(cz - along * dz) / c;
  };
  const hits: number[] = [];
  const k1 = [0, 0];
  const k2 = [0, 0];
  const h = RAY_STEP;
  for (let x0 = xMin - reach; x0 <= xMax + reach; x0 += RAY_SPACING) {
    let x = x0;
    let z = fromZ;
    let dx = Math.sin(swell.direction);
    let dz = Math.cos(swell.direction);
    for (let step = 0; step < 4 * nz; step += 1) {
      // Midpoint (RK2) step of position and heading.
      turn(x, z, dx, dz, k1);
      let mx = dx + 0.5 * h * k1[0];
      let mz = dz + 0.5 * h * k1[1];
      const midLength = Math.hypot(mx, mz);
      mx /= midLength;
      mz /= midLength;
      turn(x + 0.5 * h * dx, z + 0.5 * h * dz, mx, mz, k2);
      const nextX = x + h * mx;
      const nextZ = z + h * mz;
      dx += h * k2[0];
      dz += h * k2[1];
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      if (nextZ >= toZ) {
        hits.push(x + ((toZ - z) / (nextZ - z)) * (nextX - x));
        break;
      }
      x = nextX;
      z = nextZ;
      if (z < fromZ || x < left || x > left + (nx - 1) * RAY_STEP) break;
    }
  }
  return Float64Array.from(hits).sort();
}

/** How many sorted values lie below `value`. */
function countBelow(sorted: Float64Array, value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function concentrationAt(hits: Float64Array, x: number, width: number): number {
  return ((countBelow(hits, x + width / 2) - countBelow(hits, x - width / 2)) * RAY_SPACING) / width;
}

/**
 * Ray concentration along z = toZ at each x, averaged over `width` m: the
 * density of the swell's rays there against their density where they were
 * launched along z = fromZ. It is 1 where the bed neither gathers nor spreads
 * the swell, and wave height goes as its square root (energy flux between rays).
 */
export function rayConcentration(depthAt: BedDepth, swell: RaySwell, fromZ: number, toZ: number, xs: readonly number[], width: number): number[] {
  const hits = crossings(depthAt, swell, fromZ, toZ, Math.min(...xs) - width / 2, Math.max(...xs) + width / 2);
  return xs.map((x) => concentrationAt(hits, x, width));
}

/**
 * Where along z = toZ, between xMin and xMax, the bed gathers most of the
 * swell, averaged over half a local wavelength: rays resolve nothing finer,
 * and diffraction smooths the caustics they draw. Against the Boussinesq
 * surf zone at the Canyon, this lands where its waves are 89–96 % of their
 * largest height along the lineup; averaged over a whole wavelength it fell
 * 30–40 m off the peak of 12–14 s swells. Ties go to the smaller x.
 */
export function focusX(depthAt: BedDepth, swell: RaySwell, fromZ: number, toZ: number, xMin: number, xMax: number): number {
  const omega = (2 * Math.PI) / swell.period;
  const middle = (xMin + xMax) / 2;
  const width = Math.PI / waveNumber(omega, Math.max(MIN_DEPTH, depthAt(middle, toZ)));
  const hits = crossings(depthAt, swell, fromZ, toZ, xMin - width / 2, xMax + width / 2);
  let best = xMin;
  let most = -Infinity;
  for (let x = xMin; x <= xMax; x += RAY_STEP) {
    const here = concentrationAt(hits, x, width);
    if (here > most) {
      most = here;
      best = x;
    }
  }
  return best;
}
