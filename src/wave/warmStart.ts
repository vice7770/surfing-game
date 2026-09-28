import { GRAVITY, groupSpeed } from './dispersion';
import type { SeaState } from './SeaState';
import type { ShallowWaterSolver } from './ShallowWaterSolver';

export interface WarmStartOptions {
  /** Cross-shore line where the sea state is specified (the relaxation zone's inner edge), m. */
  referenceZ: number;
  /** Sea time the solver state should represent, s. */
  seaTime: number;
  /** Depth-limited cap on local Hs as a fraction of depth (McCowan γ). */
  breakerIndex?: number;
}

const MIN_DEPTH = 0.05;

/** One cell of a column's transformed sea: its still depth, the local Hs before the cap, and each component there. */
export interface TransformedRow {
  depth: number;
  /** Local Hs of the shoaled components, m, before the depth-limited cap. */
  hs: number;
  /** The depth-limited cap on every component (1 below γh). */
  scale: number;
  /** Per component: amplitude (0 once it has died out), phase at sea time 0, and flux speed across and along shore. */
  amplitude: Float64Array;
  phase: Float64Array;
  speedX: Float64Array;
  speedZ: Float64Array;
}

/**
 * The linear sea shoaled and refracted along column `ix` (WKB), row by row from
 * offshore: contours are treated as straight within a column, kx is conserved,
 * kz comes from the local depth with the sea's own dispersion, and amplitude
 * follows conserved cross-shore energy flux, a² c_g cosθ = const. Local Hs is
 * capped at γh. `visit` gets each row; its arrays are reused between rows.
 * Offshore of `referenceZ` the bed matches the sea's reference depth.
 */
export function transformedSea(
  solver: ShallowWaterSolver, sea: SeaState, referenceZ: number, ix: number, gamma: number, visit: (iz: number, row: TransformedRow) => void,
): void {
  const components = sea.components;
  const count = components.length;
  const referenceFlux = components.map((c) => groupSpeed(sea.waveNumberAt, c.omega, sea.depth) * (c.kz / c.k));
  const phase = new Float64Array(count);
  const alive = new Uint8Array(count);
  const row: TransformedRow = {
    depth: 0, hs: 0, scale: 1,
    amplitude: new Float64Array(count), phase: new Float64Array(count), speedX: new Float64Array(count), speedZ: new Float64Array(count),
  };
  const { nx, nz } = solver;
  const x = solver.xCenters[ix];
  let previousZ = referenceZ;
  let previousKz = components.map((c) => c.kz);
  for (let c = 0; c < count; c += 1) {
    phase[c] = components[c].kx * x + components[c].kz * referenceZ + components[c].phase;
    // A component spread past 90° from shore-normal travels offshore: it never reaches the columns inshore.
    alive[c] = components[c].kz > 0 ? 1 : 0;
  }
  for (let iz = 0; iz < nz; iz += 1) {
    const i = iz * nx + ix;
    const z = solver.zCenters[iz];
    const depth = solver.restLevel - solver.bed[i];
    let hs = 0;
    const localKz = new Array<number>(count);
    for (let c = 0; c < count; c += 1) {
      const component = components[c];
      if (z <= referenceZ) {
        row.amplitude[c] = component.amplitude;
        row.speedX[c] = (component.omega / component.k) * (component.kx / component.k);
        row.speedZ[c] = (component.omega / component.k) * (component.kz / component.k);
        row.phase[c] = component.kx * x + component.kz * z + component.phase;
        localKz[c] = component.kz;
        continue;
      }
      if (!alive[c] || depth <= MIN_DEPTH) { alive[c] = 0; row.amplitude[c] = 0; localKz[c] = 0; continue; }
      const k = sea.waveNumberAt(component.omega, depth);
      if (k <= Math.abs(component.kx)) { alive[c] = 0; row.amplitude[c] = 0; localKz[c] = 0; continue; }
      const kz = Math.sqrt(k * k - component.kx * component.kx);
      localKz[c] = kz;
      phase[c] += 0.5 * (previousKz[c] + kz) * (z - previousZ);
      const flux = groupSpeed(sea.waveNumberAt, component.omega, depth) * (kz / k);
      row.amplitude[c] = component.amplitude * Math.sqrt(referenceFlux[c] / flux);
      row.speedX[c] = (component.omega / k) * (component.kx / k);
      row.speedZ[c] = (component.omega / k) * (kz / k);
      row.phase[c] = phase[c];
      hs += 0.5 * row.amplitude[c] * row.amplitude[c];
    }
    if (z > referenceZ) {
      previousZ = z;
      previousKz = localKz;
    }
    hs = 4 * Math.sqrt(hs);
    row.depth = depth;
    row.hs = hs;
    row.scale = depth > MIN_DEPTH && hs > gamma * depth ? (gamma * depth) / hs : 1;
    visit(iz, row);
  }
}

/** The least share of its still depth a warm-started cell keeps under a trough (wave sizes). */
const WARM_DEPTH_FLOOR = 0.5;

/**
 * Fill the solver with the linear sea shoaled and refracted along each column
 * (`transformedSea`), capped at γh, so the spin-up only has to settle the nonlinear shape.
 */
export function warmStart(solver: ShallowWaterSolver, sea: SeaState, options: WarmStartOptions): void {
  const { referenceZ, seaTime } = options;
  const gamma = options.breakerIndex ?? 0.78;
  const components = sea.components;
  const count = components.length;
  const { nx } = solver;
  for (let ix = 0; ix < nx; ix += 1) {
    transformedSea(solver, sea, referenceZ, ix, gamma, (iz, row) => {
      const i = iz * nx + ix;
      let eta = 0;
      let qx = 0;
      let qz = 0;
      for (let c = 0; c < count; c += 1) {
        if (row.amplitude[c] === 0) continue;
        const value = row.scale * row.amplitude[c] * Math.cos(row.phase[c] - components[c].omega * seaTime);
        eta += value;
        qx += row.speedX[c] * value;
        qz += row.speedZ[c] * value;
      }
      const still = solver.restLevel - solver.bed[i];
      let total = Math.max(0, solver.restLevel + eta - solver.bed[i]);
      if (still > 0) {
        // A linear sea capped only in Hs still has troughs that nearly empty a cell, with fluxes too fast for the
        // water left (a long swell's tank blew up in its first seconds): each cell keeps WARM_DEPTH_FLOOR of its still
        // depth, and its flow stays below the local long-wave speed. The spin-up settles the difference.
        total = Math.max(total, WARM_DEPTH_FLOOR * still);
        const speed = Math.hypot(qx, qz) / total;
        const limit = Math.sqrt(GRAVITY * total);
        if (speed > limit) {
          qx *= limit / speed;
          qz *= limit / speed;
        }
      }
      const wet = total > 1e-4;
      solver.h[i] = total;
      solver.qx[i] = wet ? qx : 0;
      solver.qz[i] = wet ? qz : 0;
    });
  }
}

export interface SetRunPlan {
  warmStartSeaTime: number;
  handOverSeaTime: number;
  setPeakSeaTime: number;
}

/**
 * Pick sea times so the player takes control `lead` seconds before the next
 * set peaks at (x, referenceZ), after a `spinUp` of simulated settling.
 */
export function planSetRun(
  sea: SeaState, x: number, referenceZ: number, fromSeaTime: number, lead: number, spinUp: number, horizon = 600,
): SetRunPlan {
  const setPeakSeaTime = sea.nextSetPeak(x, referenceZ, fromSeaTime + lead + spinUp, horizon);
  const handOverSeaTime = setPeakSeaTime - lead;
  return { warmStartSeaTime: handOverSeaTime - spinUp, handOverSeaTime, setPeakSeaTime };
}
