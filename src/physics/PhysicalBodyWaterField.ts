import type { Vector3 } from 'three';
import type { BodyWaterField, BodyWaterSample } from './DetachedSurfer';
import { TANK, type SurfZoneSimulation } from '../wave/SurfZoneSimulation';

const MIN_WET_DEPTH = 0.01;
const MAX_HORIZONTAL_SPEED = 12;
const MAX_PROFILE_GAIN = 1.5;
const MAX_VERTICAL_SPEED = 3;

/** Airy horizontal profile normalized to the depth mean. Kept bounded in a bore. */
export function horizontalProfileGain(kh: number, heightAboveBed: number, depth: number, breaking: number): number {
  if (kh < 1e-3) return 1;
  const vertical = Math.min(1, Math.max(0, heightAboveBed / depth));
  const airy = kh * Math.cosh(kh * vertical) / Math.sinh(kh);
  return 1 + (Math.min(MAX_PROFILE_GAIN, airy) - 1) * (1 - breaking);
}

/** Read-only body samples from the current physical-wave step. */
export class PhysicalBodyWaterField implements BodyWaterField {
  constructor(private readonly simulation: SurfZoneSimulation) {}

  private meanFlowAt(x: number, z: number): { x: number; z: number } {
    const { solver } = this.simulation;
    const depth = solver.sampleCentered(solver.h, x, z);
    if (depth <= MIN_WET_DEPTH) return { x: 0, z: 0 };
    return {
      x: solver.sampleCentered(solver.qx, x, z) / depth,
      z: solver.sampleCentered(solver.qz, x, z) / depth,
    };
  }

  sampleAt(position: Readonly<Vector3>, out: BodyWaterSample): void {
    const { solver, breaking, config, sea } = this.simulation;
    const { x, y, z } = position;
    const xMin = this.simulation.windowXMin;
    const outside = !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)
      || x < xMin || x > xMin + solver.nx * solver.dx
      || z < TANK.offshore || z > TANK.shore;
    out.outsideDomain = outside;
    out.flow.set(0, 0, 0);
    out.breaking = 0;
    out.wet = false;
    if (outside) {
      out.surfaceY = 0;
      out.bedY = -Infinity;
      out.flowModel = 'outside';
      return;
    }

    const depth = Math.max(0, solver.sampleCentered(solver.h, x, z));
    out.bedY = this.simulation.bedAt(x, z);
    out.surfaceY = out.bedY + depth;
    out.wet = depth > MIN_WET_DEPTH;
    if (!out.wet) {
      out.flowModel = 'dry';
      return;
    }

    out.breaking = Math.min(1, Math.max(0, solver.sampleCentered(breaking.strength, x, z)));
    const omega = 2 * Math.PI / config.peakPeriod;
    const kh = sea.waveNumberAt(omega, depth) * depth;
    const gain = horizontalProfileGain(kh, y - out.bedY, depth, out.breaking);
    // The shallow-water solver has no resolved vertical velocity. Horizontal
    // shear uses a bounded Airy profile; vertical flow below is a bounded
    // continuity reconstruction from the depth-mean field, not a 3D solution.
    const qx = solver.sampleCentered(solver.qx, x, z);
    const qz = solver.sampleCentered(solver.qz, x, z);
    out.flow.set(qx / depth * gain, 0, qz / depth * gain);
    const speed = out.flow.length();
    if (speed > MAX_HORIZONTAL_SPEED) out.flow.multiplyScalar(MAX_HORIZONTAL_SPEED / speed);
    const row = Math.floor(solver.cellIndex(x, z) / solver.nx);
    const horizontalStep = solver.dx;
    const crossStep = solver.dz[row];
    const left = Math.max(xMin, x - horizontalStep);
    const right = Math.min(xMin + solver.nx * solver.dx, x + horizontalStep);
    const seaward = Math.max(TANK.offshore, z - crossStep);
    const shoreward = Math.min(TANK.shore, z + crossStep);
    const flowLeft = this.meanFlowAt(left, z);
    const flowRight = this.meanFlowAt(right, z);
    const flowSeaward = this.meanFlowAt(x, seaward);
    const flowShoreward = this.meanFlowAt(x, shoreward);
    const bedSlopeX = (this.simulation.bedAt(right, z) - this.simulation.bedAt(left, z)) / (right - left);
    const bedSlopeZ = (this.simulation.bedAt(x, shoreward) - this.simulation.bedAt(x, seaward)) / (shoreward - seaward);
    const divergence = (flowRight.x - flowLeft.x) / (right - left)
      + (flowShoreward.z - flowSeaward.z) / (shoreward - seaward);
    const heightAboveBed = Math.min(depth, Math.max(0, y - out.bedY));
    const vertical = out.flow.x * bedSlopeX + out.flow.z * bedSlopeZ - heightAboveBed * divergence;
    out.flow.y = Math.max(-MAX_VERTICAL_SPEED, Math.min(MAX_VERTICAL_SPEED, vertical));
    out.flowModel = 'reconstructed';
  }
}
