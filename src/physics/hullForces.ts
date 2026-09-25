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
 * Normal-pressure coefficient of a hull patch, p = ½ρ C_n |v_rel| max(0, v_rel·n)
 * for pressure spread evenly. On a flat plate every wetted patch meets the flow at
 * V sin τ, so the plate's dynamic lift is ½ρ C_n V² sin τ cos τ λ b². C_n is fixed
 * so this equals Savitsky's dynamic lift at τ = 4°, λ = 3 (about 0.46). The
 * spray-root distribution (`planingScales`) keeps that mean at λ = 3.
 */
export const PRESSURE_COEFFICIENT = (() => {
  const trim = (4 * Math.PI) / 180;
  return savitskyLift(4, 3, 5).dynamic / (3 * Math.sin(trim) * Math.cos(trim));
})();

/**
 * Planing pressure concentrates behind the spray root. Taking p ∝ 1/√x at a
 * distance x behind it gives lift ∝ √λ, as in Savitsky's dynamic term, and a
 * centre of pressure two thirds of the wetted length ahead of the trailing edge
 * (Savitsky: 0.75 at high speed). Fills `out` with each patch's pressure scale
 * for one strip of patches ordered from the leading end (where the flow meets
 * the hull) to the trailing end:
 * - `shares` are the patches' wetted bottom shares and `beams` their local beams;
 *   each patch, `stationLength` long, covers the wetted length its share adds;
 * - the mean scale over a wetted length of 3 beams is 1, matching `PRESSURE_COEFFICIENT`;
 * - `alongShare` is the squared share of the relative flow along the strip. Flow
 *   meeting the hull head-on (0), as in a drop, spreads the pressure evenly.
 */
export function planingScales(shares: ArrayLike<number>, stationLength: number, beams: ArrayLike<number>, alongShare: number, out: Float64Array): Float64Array {
  const count = shares.length;
  out.fill(1, 0, count);
  if (!(alongShare > 0)) return out;
  // Distance behind the root counts wetted length only: each patch covers the
  // stretch its wetted share adds, so the waterline ramp does not blunt the peak.
  let wetted = 0;
  for (let i = 0; i < count; i += 1) {
    if (!(shares[i] > 0)) continue;
    const low = wetted;
    const high = wetted + shares[i] * stationLength;
    wetted = high;
    // Mean of √(b/x) over the stretch, normalized by its mean 2/√3 over three beams.
    const mean = (2 * Math.sqrt(beams[i]) * (Math.sqrt(high) - Math.sqrt(low))) / (high - low);
    out[i] = 1 + alongShare * ((mean * Math.sqrt(3)) / 2 - 1);
  }
  return out;
}

/**
 * Depth over which a patch face goes from dry to fully wetted, m. The ramp is
 * centred on the waterline, so it smooths the force as the waterline crosses a
 * patch without shortening the wetted length of a sloping hull.
 */
export const WET_RAMP = 0.01;

/** Wetted share of a patch face whose centre lies `depth` below the surface. */
export function wettedShare(depth: number): number {
  return Math.min(1, Math.max(0, 0.5 + depth / WET_RAMP));
}

/** A hull patch placed in the world: bottom centre, outward (downward) normal, planform area and thickness. */
export interface WorldPatch {
  position: Vec;
  normal: Vec;
  area: number;
  thickness: number;
}

export interface PatchForce {
  /** Hydrostatic support, N, acting at `buoyancyPoint`: normal to the local water surface. */
  buoyancy: Vec;
  buoyancyPoint: Vec;
  /** Planing and impact pressure on the wetted face meeting the flow, N, acting at the patch. */
  pressure: Vec;
  /**
   * −∂(pressure · n)/∂(v · n), N·s/m: how fast the pressure grows with the speed
   * into the water, for an implicit integrator.
   */
  pressureDamping: number;
  /** Skin friction on both wetted faces, N, acting at the patch. */
  friction: Vec;
  /** Wetted bottom and deck areas, m². */
  wettedArea: number;
  deckWettedArea: number;
  /** Share of the patch's volume under water. */
  submerged: number;
}

export function createPatchForce(): PatchForce {
  return {
    buoyancy: { x: 0, y: 0, z: 0 }, buoyancyPoint: { x: 0, y: 0, z: 0 }, pressure: { x: 0, y: 0, z: 0 },
    pressureDamping: 0, friction: { x: 0, y: 0, z: 0 }, wettedArea: 0, deckWettedArea: 0, submerged: 0,
  };
}

function zero(v: Vec): void {
  v.x = 0;
  v.y = 0;
  v.z = 0;
}

/**
 * The water's force on one hull patch, a slab from its bottom face to its deck:
 * - buoyancy from the part of the slab under the surface, pushed by the
 *   hydrostatic pressure gradient ρg(−∂η/∂x, 1, −∂η/∂z), so down a sloping face;
 * - pressure where a wetted face meets the flow (the bottom, or the deck of a
 *   capsized board), never suction;
 * - ITTC skin friction on the tangential flow over both wetted faces.
 * `relative` is the patch's velocity minus the water's; `wettedLength` sets the
 * Reynolds number, and `pressureScale` places the patch in the pressure
 * distribution (`planingScales`).
 */
export function patchForce(patch: WorldPatch, water: WaterSample, relative: Vec, wettedLength: number, out: PatchForce, pressureScale = 1): PatchForce {
  zero(out.buoyancy);
  zero(out.pressure);
  zero(out.friction);
  out.pressureDamping = 0;
  out.wettedArea = 0;
  out.deckWettedArea = 0;
  out.submerged = 0;
  const { position, normal, thickness, area } = patch;
  out.buoyancyPoint.x = position.x;
  out.buoyancyPoint.y = position.y;
  out.buoyancyPoint.z = position.z;
  if (!water.wet || water.outsideDomain) return out;
  const deckY = position.y - normal.y * thickness;
  const bottom = wettedShare(water.surfaceY - position.y);
  const deck = wettedShare(water.surfaceY - deckY);
  if (bottom === 0 && deck === 0) return out;

  const bottomLow = position.y <= deckY;
  const low = bottomLow ? position.y : deckY;
  const span = Math.abs(deckY - position.y);
  const submerged = span > 1e-9 ? Math.min(1, Math.max(0, (water.surfaceY - low) / span)) : water.surfaceY > low ? 1 : 0;
  out.submerged = submerged;
  const support = WATER.density * WATER.gravity * area * thickness * submerged;
  out.buoyancy.x = -support * water.slopeX;
  out.buoyancy.y = support;
  out.buoyancy.z = -support * water.slopeZ;
  // Halfway up the immersed part, measured from the bottom face toward the deck.
  const centroid = bottomLow ? (thickness * submerged) / 2 : thickness * (1 - submerged / 2);
  out.buoyancyPoint.x = position.x - normal.x * centroid;
  out.buoyancyPoint.y = position.y - normal.y * centroid;
  out.buoyancyPoint.z = position.z - normal.z * centroid;

  out.wettedArea = area * bottom;
  out.deckWettedArea = area * deck;
  const speed = Math.hypot(relative.x, relative.y, relative.z);
  if (!(speed > 0)) return out;
  const normalSpeed = relative.x * normal.x + relative.y * normal.y + relative.z * normal.z;
  const face = normalSpeed > 0 ? bottom : deck;
  if (normalSpeed !== 0 && face > 0) {
    const k = 0.5 * WATER.density * PRESSURE_COEFFICIENT * pressureScale * face * area;
    const pressure = k * speed * normalSpeed;
    out.pressure.x = -pressure * normal.x;
    out.pressure.y = -pressure * normal.y;
    out.pressure.z = -pressure * normal.z;
    out.pressureDamping = k * (speed + (normalSpeed * normalSpeed) / speed);
  }
  const tx = relative.x - normalSpeed * normal.x;
  const ty = relative.y - normalSpeed * normal.y;
  const tz = relative.z - normalSpeed * normal.z;
  const tangential = Math.hypot(tx, ty, tz);
  if (tangential > 0) {
    const friction = 0.5 * WATER.density * ittcFriction((speed * wettedLength) / WATER.viscosity) * tangential * (bottom + deck) * area;
    out.friction.x = -friction * tx;
    out.friction.y = -friction * ty;
    out.friction.z = -friction * tz;
  }
  return out;
}
