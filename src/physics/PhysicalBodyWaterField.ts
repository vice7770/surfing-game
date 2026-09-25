import type { Vector3 } from 'three';
import type { BodyWaterField, BodyWaterSample } from './DetachedSurfer';
import { TANK, type SurfZoneSimulation } from '../wave/SurfZoneSimulation';

const MIN_WET_DEPTH = 0.01;
const MAX_HORIZONTAL_SPEED = 12;
const MAX_PROFILE_GAIN = 1.5;

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
    // The shallow-water solver has no resolved vertical velocity. This is a
    // bounded horizontal reconstruction, not a 3D flow solution.
    const qx = solver.sampleCentered(solver.qx, x, z);
    const qz = solver.sampleCentered(solver.qz, x, z);
    out.flow.set(qx / depth * gain, 0, qz / depth * gain);
    const speed = out.flow.length();
    if (speed > MAX_HORIZONTAL_SPEED) out.flow.multiplyScalar(MAX_HORIZONTAL_SPEED / speed);
    out.flowModel = 'reconstructed';
  }
}
