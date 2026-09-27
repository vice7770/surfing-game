import { GRAVITY, depthClass, waveKinematics, type DepthClass } from './dispersion';

/** McCowan depth-limited breaker index H_b/h_b; Sandwell's d_b = 1.28 H_b is 1/0.78. */
export const BREAKER_INDEX = 0.78;

export type BreakerType = 'spilling' | 'plunging' | 'surging' | 'none';

export interface SwellConditions {
  /** Breaking wave height, m. */
  height: number;
  /** Period, s. */
  period: number;
  /** Still-water depth where speed and wavelength are reported, m. */
  depth: number;
  /** Steepest bed slope tanβ; 0 means a flat bed. */
  bedSlope: number;
}

export interface SwellReadout {
  deepWavelength: number;
  wavelength: number;
  phaseSpeed: number;
  groupSpeed: number;
  depthRatio: number;
  depthClass: DepthClass;
  breakerDepth: number;
  breakerSpeed: number;
  iribarren: number;
  breakerType: BreakerType;
}

export interface ReadoutRow {
  label: string;
  value: string;
}

export function describeSwell({ height, period, depth, bedSlope }: SwellConditions): SwellReadout {
  const kinematics = waveKinematics(period, depth);
  const deepWavelength = (GRAVITY * period * period) / (2 * Math.PI);
  const breakerDepth = height / BREAKER_INDEX;
  const slope = Math.max(0, bedSlope);
  const iribarren = slope > 0 && height > 0 ? slope / Math.sqrt(height / deepWavelength) : 0;
  // Battjes breaker-point thresholds for ξ_b.
  const breakerType: BreakerType = iribarren <= 0 ? 'none'
    : iribarren < 0.4 ? 'spilling'
      : iribarren <= 2 ? 'plunging' : 'surging';
  return {
    deepWavelength,
    wavelength: kinematics.wavelength,
    phaseSpeed: kinematics.phaseSpeed,
    groupSpeed: kinematics.groupSpeed,
    depthRatio: depth / kinematics.wavelength,
    depthClass: depthClass(depth, kinematics.wavelength),
    breakerDepth,
    breakerSpeed: Math.sqrt(GRAVITY * breakerDepth),
    iribarren,
    breakerType,
  };
}
