import { SEAWATER_DENSITY } from './PhysicalSurfWater';
import type { WaterSample } from './SurfWater';

interface Vec { x: number; y: number; z: number }

/** Seawater at about 15 °C: density kg/m³, gravity m/s², kinematic viscosity m²/s. */
export const WATER = { density: SEAWATER_DENSITY, gravity: 9.81, viscosity: 1.19e-6 };

/**
 * Savitsky's (1964) flat-plate planing lift coefficient, split into its dynamic
 * and buoyant terms: C_L0 = τ^1.1 [0.012 λ^0.5 + 0.0055 λ^2.5 / C_V²], with τ the
 * trim in degrees, λ the mean wetted length/beam and C_V = V/√(g b); lift is
 * ½ρV²b²C_L0. Valid for 0.6 ≤ C_V ≤ 13, λ ≤ 4 and 2° ≤ τ ≤ 15°.
 */
export function savitskyLift(trimDegrees: number, lambda: number, speedCoefficient: number): { dynamic: number; buoyant: number; total: number } {
  const trim = trimDegrees ** 1.1;
  const dynamic = trim * 0.012 * Math.sqrt(lambda);
  const buoyant = (trim * 0.0055 * lambda ** 2.5) / (speedCoefficient * speedCoefficient);
  return { dynamic, buoyant, total: dynamic + buoyant };
}

/** ITTC 1957 friction line, C_F = 0.075/(log₁₀ Re − 2)²; Re is held at 10⁵ or more (the line is not valid below). */
export function ittcFriction(reynolds: number): number {
  const log = Math.log10(Math.max(1e5, reynolds)) - 2;
  return 0.075 / (log * log);
}

/**
 * Normal-pressure coefficient of a hull patch, p = ½ρ C_n |v_rel| max(0, v_rel·n).
 * On a flat plate every wetted patch meets the flow at V sin τ, so the plate's
 * dynamic lift is ½ρ C_n V² sin τ cos τ λ b². C_n is fixed so this equals Savitsky's
 * dynamic lift at τ = 4°, λ = 3 (about 0.46). Over a surfboard's planing range (τ 3–7°,
 * λ 2–4) it stays within ±25 %: it lifts too little on short wetted lengths and too
 * much on long ones, because real planing pressure peaks at the spray root.
 */
export const PRESSURE_COEFFICIENT = (() => {
  const trim = (4 * Math.PI) / 180;
  return savitskyLift(4, 3, 5).dynamic / (3 * Math.sin(trim) * Math.cos(trim));
})();

/**
 * Depth over which a patch's bottom goes from dry to fully wetted, m. The ramp is
 * centred on the waterline, so it smooths the force as the waterline crosses a
 * patch without shortening the wetted length of a sloping hull.
 */
const WET_RAMP = 0.01;

/** A hull patch placed in the world: bottom centre, outward (downward) normal, planform area and thickness. */
export interface WorldPatch {
  position: Vec;
  normal: Vec;
  area: number;
  thickness: number;
}

export interface PatchForce {
  /** Hydrostatic support, N, acting at `buoyancyPoint`. */
  buoyancy: Vec;
  buoyancyPoint: Vec;
  /** Planing and impact pressure on the wetted bottom, N, acting at the patch. */
  pressure: Vec;
  /** Skin friction, N, acting at the patch. */
  friction: Vec;
  wettedArea: number;
  /** Share of the patch's volume under water. */
  submerged: number;
}

export function createPatchForce(): PatchForce {
  return {
    buoyancy: { x: 0, y: 0, z: 0 }, buoyancyPoint: { x: 0, y: 0, z: 0 }, pressure: { x: 0, y: 0, z: 0 },
    friction: { x: 0, y: 0, z: 0 }, wettedArea: 0, submerged: 0,
  };
}

function zero(v: Vec): void {
  v.x = 0;
  v.y = 0;
  v.z = 0;
}

/**
 * The water's force on one hull patch: buoyancy from the displaced column, a
 * pressure where the hull meets the water, and ITTC skin friction on the
 * tangential flow. `relative` is the patch's velocity minus the water's;
 * `wettedLength` sets the Reynolds number.
 */
export function patchForce(patch: WorldPatch, water: WaterSample, relative: Vec, wettedLength: number, out: PatchForce): PatchForce {
  zero(out.buoyancy);
  zero(out.pressure);
  zero(out.friction);
  out.wettedArea = 0;
  out.submerged = 0;
  const depth = water.surfaceY - patch.position.y;
  out.buoyancyPoint.x = patch.position.x;
  out.buoyancyPoint.y = patch.position.y;
  out.buoyancyPoint.z = patch.position.z;
  if (!water.wet || water.outsideDomain || !(depth > -WET_RAMP / 2)) return out;
  const immersed = Math.min(Math.max(depth, 0), patch.thickness);
  out.submerged = immersed / patch.thickness;
  out.buoyancy.y = WATER.density * WATER.gravity * patch.area * immersed;
  out.buoyancyPoint.y = patch.position.y + immersed / 2;
  const wetted = patch.area * Math.min(1, 0.5 + depth / WET_RAMP);
  out.wettedArea = wetted;
  const { normal } = patch;
  const speed = Math.hypot(relative.x, relative.y, relative.z);
  if (!(speed > 0)) return out;
  const normalSpeed = relative.x * normal.x + relative.y * normal.y + relative.z * normal.z;
  if (normalSpeed > 0) {
    const pressure = 0.5 * WATER.density * PRESSURE_COEFFICIENT * speed * normalSpeed * wetted;
    out.pressure.x = -pressure * normal.x;
    out.pressure.y = -pressure * normal.y;
    out.pressure.z = -pressure * normal.z;
  }
  const tx = relative.x - normalSpeed * normal.x;
  const ty = relative.y - normalSpeed * normal.y;
  const tz = relative.z - normalSpeed * normal.z;
  const tangential = Math.hypot(tx, ty, tz);
  if (tangential > 0) {
    const friction = 0.5 * WATER.density * ittcFriction((speed * wettedLength) / WATER.viscosity) * tangential * wetted;
    out.friction.x = -friction * tx;
    out.friction.y = -friction * ty;
    out.friction.z = -friction * tz;
  }
  return out;
}
