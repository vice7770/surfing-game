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

/**
 * Fill the solver with the linear sea shoaled and refracted along each column.
 * Contours are treated as straight within a column (WKB): kx is conserved, kz
 * comes from the local depth with the sea's own dispersion, and amplitude
 * follows conserved cross-shore energy flux, a² c_g cosθ = const. Local Hs is
 * capped at γh, so the spin-up only has to settle the nonlinear shape.
 */
export function warmStart(solver: ShallowWaterSolver, sea: SeaState, options: WarmStartOptions): void {
  const { referenceZ, seaTime } = options;
  const gamma = options.breakerIndex ?? 0.78;
  const components = sea.components;
  const count = components.length;
  const referenceFlux = components.map((c) => groupSpeed(sea, c.omega, sea.depth) * (c.kz / c.k));
  const phase = new Float64Array(count);
  const alive = new Uint8Array(count);
  const amplitude = new Float64Array(count);
  const kxOverK = new Float64Array(count);
  const kzOverK = new Float64Array(count);
  const speed = new Float64Array(count);
  const { nx, nz } = solver;
  for (let ix = 0; ix < nx; ix += 1) {
    const x = solver.xCenters[ix];
    let previousZ = referenceZ;
    let previousKz = components.map((c) => c.kz);
    for (let c = 0; c < count; c += 1) {
      phase[c] = components[c].kx * x + components[c].kz * referenceZ + components[c].phase;
      alive[c] = 1;
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
          // Offshore of the reference line the bed matches the sea's reference depth.
          amplitude[c] = component.amplitude;
          kxOverK[c] = component.kx / component.k;
          kzOverK[c] = component.kz / component.k;
          speed[c] = component.omega / component.k;
          localKz[c] = component.kz;
          continue;
        }
        if (!alive[c] || depth <= MIN_DEPTH) { alive[c] = 0; amplitude[c] = 0; localKz[c] = 0; continue; }
        const k = sea.waveNumberAt(component.omega, depth);
        if (k <= Math.abs(component.kx)) { alive[c] = 0; amplitude[c] = 0; localKz[c] = 0; continue; }
        const kz = Math.sqrt(k * k - component.kx * component.kx);
        localKz[c] = kz;
        phase[c] += 0.5 * (previousKz[c] + kz) * (z - previousZ);
        const flux = groupSpeed(sea, component.omega, depth) * (kz / k);
        amplitude[c] = component.amplitude * Math.sqrt(referenceFlux[c] / flux);
        kxOverK[c] = component.kx / k;
        kzOverK[c] = kz / k;
        speed[c] = component.omega / k;
        hs += 0.5 * amplitude[c] * amplitude[c];
      }
      if (z > referenceZ) {
        previousZ = z;
        previousKz = localKz;
      }
      hs = 4 * Math.sqrt(hs);
      const scale = depth > MIN_DEPTH && hs > gamma * depth ? (gamma * depth) / hs : 1;
      let eta = 0;
      let qx = 0;
      let qz = 0;
      for (let c = 0; c < count; c += 1) {
        if (amplitude[c] === 0) continue;
        const psi = z <= referenceZ
          ? components[c].kx * x + components[c].kz * z + components[c].phase - components[c].omega * seaTime
          : phase[c] - components[c].omega * seaTime;
        const value = scale * amplitude[c] * Math.cos(psi);
        eta += value;
        qx += speed[c] * kxOverK[c] * value;
        qz += speed[c] * kzOverK[c] * value;
      }
      const total = Math.max(0, solver.restLevel + eta - solver.bed[i]);
      const wet = total > 1e-4;
      solver.h[i] = total;
      solver.qx[i] = wet ? qx : 0;
      solver.qz[i] = wet ? qz : 0;
    }
  }
}

/** Group speed dω/dk for the sea's dispersion, by central difference. */
function groupSpeed(sea: SeaState, omega: number, depth: number): number {
  const step = omega * 1e-4;
  return (2 * step) / (sea.waveNumberAt(omega + step, depth) - sea.waveNumberAt(omega - step, depth));
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
