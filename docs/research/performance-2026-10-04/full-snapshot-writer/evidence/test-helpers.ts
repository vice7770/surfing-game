import { SurfZoneSimulation as Baseline } from './qa/baseline';
import { SurfZoneSimulation as Candidate } from './qa/candidate';
import type { SurfZoneConfig, RenderGrid } from '/Users/regina/Desktop/Projects/surfing-game/src/wave/SurfZoneSimulation';

export { Baseline, Candidate };
export type Scene = InstanceType<typeof Baseline> | InstanceType<typeof Candidate>;
export type Outputs = [Float32Array, Float32Array, Float32Array];
export const config: SurfZoneConfig = {
  spot: 'padang', stage: 1, seed: 7, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10,
  spreading: 12, tide: 0, componentCount: 12, alongShore: 16, dx: 2, fineSpacing: 4,
  coarseSpacing: 8, spinUpPeriods: 0,
};

export function fresh(Arm: typeof Baseline | typeof Candidate): Scene {
  const scene = new Arm(config, 'warm');
  const { solver, foam, aeration } = scene;
  const heights = [0, 0.00999999999999, 0.01, 0.01000000000001, 0.3, 1.2, -0, 2.7];
  for (let i = 0; i < solver.h.length; i++) {
    solver.h[i] = heights[i % heights.length];
    solver.bed[i] = -0.5 - (i % 23) / 7;
    solver.qx[i] = i % 11 === 0 ? -0 : ((i % 19) - 9) / 3;
    solver.qz[i] = i % 13 === 0 ? 0 : ((i % 17) - 8) / 5;
    foam.dense[i] = (i % 7) / 10;
    foam.residual[i] = (i % 3) / 20;
    aeration.depth[i] = (i % 5) / 10;
    aeration.air[i] = aeration.depth[i] * (i % 13) / 10;
  }
  return scene;
}

export function outputs(grid: RenderGrid): Outputs {
  const n = grid.nx * grid.nz * 2;
  return [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
}

export function exact(a: ArrayBufferView, b: ArrayBufferView, label: string): void {
  const aa = Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  const bb = Buffer.from(b.buffer, b.byteOffset, b.byteLength);
  if (aa.length !== bb.length || !aa.equals(bb)) {
    let i = 0;
    while (i < Math.min(aa.length, bb.length) && aa[i] === bb[i]) i++;
    throw Error('Exact byte mismatch: ' + label + '@' + i);
  }
}

export function exactOutputs(a: Outputs, b: Outputs): void {
  for (let i = 0; i < 3; i++) exact(a[i], b[i], 'snapshot channel ' + i);
}

export interface Scratch { velocityX?: Float64Array; velocityZ?: Float64Array; voidFractions?: Float64Array }
export const scratch = (scene: Scene): Scratch => scene as unknown as Scratch;

export function exactInputs(a: Scene, b: Scene): void {
  for (const key of ['h', 'bed', 'qx', 'qz', 'xCenters', 'zCenters', 'dz'] as const) exact(a.solver[key], b.solver[key], key);
  for (const key of ['dense', 'residual'] as const) exact(a.foam[key], b.foam[key], 'foam.' + key);
  for (const key of ['air', 'depth', 'turbulence'] as const) exact(a.aeration[key], b.aeration[key], 'air.' + key);
  for (const key of ['velocityX', 'velocityZ', 'voidFractions'] as const) {
    const av = scratch(a)[key], bv = scratch(b)[key];
    if (!av || !bv) throw Error('Required scratch absent: ' + key);
    exact(av, bv, key);
  }
}
