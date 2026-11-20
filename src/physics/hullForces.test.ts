import { describe, expect, it } from 'vitest';
import { PRESSURE_COEFFICIENT, WATER, createPatchForce, ittcFriction, patchForce, planingScales, savitskyLift, wettedShare, type WorldPatch } from './hullForces';
import { createWaterSample } from './SurfWater';

const still = () => ({ ...createWaterSample(), surfaceY: 0, stillDepth: 3, waterDepth: 3, wet: true, regime: 'profile' as const });

/**
 * A flat plate of beam b trimmed bow-up by τ, moving at V along +z, with λb of
 * its length wetted: the trailing edge sits λ b sin τ deep. Its pressure follows
 * the spray-root distribution unless `uniform`.
 */
function towedPlate(trimDegrees: number, lambda: number, speedCoefficient: number, { beam = 0.4, uniform = false } = {}) {
  const trim = (trimDegrees * Math.PI) / 180;
  const speed = speedCoefficient * Math.sqrt(WATER.gravity * beam);
  const length = 6 * beam;
  const segments = 240;
  const segment = length / segments;
  const patches: WorldPatch[] = [];
  for (let k = 0; k < segments; k += 1) {
    const along = (k + 0.5) * segment;
    patches.push({
      position: { x: 0, y: -lambda * beam * Math.sin(trim) + along * Math.sin(trim), z: along * Math.cos(trim) },
      normal: { x: 0, y: -Math.cos(trim), z: Math.sin(trim) },
      area: segment * beam,
      thickness: 0.05,
    });
  }
  // Leading edge first: the flow meets the plate's raised forward end. The trailing edge is at z = 0.
  const leading = [...patches].reverse();
  const scales = new Float64Array(segments).fill(1);
  if (!uniform) {
    planingScales(leading.map((patch) => wettedShare(-patch.position.y)), segment, leading.map(() => beam), Math.cos(trim) ** 2, scales);
  }
  let lift = 0;
  let drag = 0;
  let wetted = 0;
  let moment = 0;
  const out = createPatchForce();
  leading.forEach((patch, i) => {
    patchForce(patch, still(), { x: 0, y: 0, z: speed }, length, out, scales[i]);
    lift += out.pressure.y;
    drag -= out.pressure.z;
    wetted += out.wettedArea;
    moment += out.pressure.y * patch.position.z;
  });
  const dynamicPressure = 0.5 * WATER.density * speed * speed * beam * beam;
  return {
    lift, drag, wetted,
    /** Centre of pressure ahead of the trailing edge, as a share of the wetted length. */
    centre: moment / lift / (lambda * beam * Math.cos(trim)),
    savitsky: savitskyLift(trimDegrees, lambda, speedCoefficient).dynamic * dynamicPressure,
  };
}

describe('hull patch forces', () => {
  // Savitsky 1964: C_L0 = τ^1.1 [0.012 λ^0.5 + 0.0055 λ^2.5 / C_V²], L = ½ρV²b²C_L0.
  it('matches Savitsky’s dynamic planing lift at the calibration point', () => {
    const { lift, savitsky } = towedPlate(4, 3, 5);
    expect(lift / savitsky).toBeGreaterThan(0.9);
    expect(lift / savitsky).toBeLessThan(1.1);
    expect(savitskyLift(4, 3, 5).dynamic).toBeCloseTo(4 ** 1.1 * 0.012 * Math.sqrt(3), 12);
    expect(savitskyLift(4, 3, 5).buoyant).toBeCloseTo((4 ** 1.1 * 0.0055 * 3 ** 2.5) / 25, 12);
  });

  // The waterline ramp smooths the force as it crosses a patch without shortening the wetted length.
  it('wets the calm-water length of a trimmed plate', () => {
    for (const [trim, lambda] of [[3, 2], [4, 3], [7, 4]]) {
      expect(towedPlate(trim, lambda, 5).wetted / (lambda * 0.4 * 0.4), `τ ${trim}°, λ ${lambda}`).toBeCloseTo(1, 2);
    }
  });

  // Uniform pressure scales with λ where Savitsky's lift scales with √λ; one coefficient holds only
  // over a surfboard's planing range (τ 3–7°, λ 2–4, about 4–8 m/s with a rider) to ±25 %.
  it('keeps uniform pressure within a quarter of Savitsky’s lift over the surfboard planing range', () => {
    for (const trim of [3, 5, 7]) {
      for (const lambda of [2, 4]) {
        const { lift, savitsky } = towedPlate(trim, lambda, 5, { uniform: true });
        expect(lift / savitsky, `τ ${trim}°, λ ${lambda}`).toBeGreaterThan(0.75);
        expect(lift / savitsky, `τ ${trim}°, λ ${lambda}`).toBeLessThan(1.25);
      }
    }
  });

  // Planing pressure peaks at the spray root; p ∝ 1/√x behind it gives lift ∝ √λ and a centre of
  // pressure two thirds of the wetted length ahead of the trailing edge (Savitsky: 0.75 at high speed).
  it('concentrates the pressure behind the spray root, following Savitsky over the whole planing range', () => {
    let previous = 0;
    for (const trim of [3, 6, 10]) {
      for (const lambda of [2, 3, 4]) {
        const { lift, savitsky, centre } = towedPlate(trim, lambda, 5);
        expect(lift / savitsky, `τ ${trim}°, λ ${lambda}`).toBeGreaterThan(0.85);
        expect(lift / savitsky, `τ ${trim}°, λ ${lambda}`).toBeLessThan(1.15);
        expect(centre, `τ ${trim}°, λ ${lambda}`).toBeGreaterThan(0.62);
        expect(centre, `τ ${trim}°, λ ${lambda}`).toBeLessThan(0.72);
      }
      const { lift } = towedPlate(trim, 3, 5);
      expect(lift).toBeGreaterThan(previous);
      previous = lift;
    }
    expect(towedPlate(6, 3, 5).drag).toBeCloseTo(towedPlate(6, 3, 5).lift * Math.tan((6 * Math.PI) / 180), 6);
  });

  it('spreads pressure evenly when the flow meets the hull head-on', () => {
    const scales = new Float64Array(6);
    planingScales([0, 0.5, 1, 1, 1, 1], 0.15, [0.4, 0.4, 0.4, 0.4, 0.4, 0.4], 0, scales);
    expect([...scales]).toEqual([1, 1, 1, 1, 1, 1]);
    planingScales([0, 0.5, 1, 1, 1, 1], 0.15, [0.4, 0.4, 0.4, 0.4, 0.4, 0.4], 1, scales);
    for (let i = 2; i < 6; i += 1) expect(scales[i]).toBeLessThan(scales[i - 1]);
  });

  it('drags the wetted bottom with the ITTC 1957 friction line', () => {
    expect(ittcFriction(1e7)).toBeCloseTo(0.075 / 25, 12);
    const out = createPatchForce();
    const patch: WorldPatch = { position: { x: 0, y: -0.02, z: 0 }, normal: { x: 0, y: -1, z: 0 }, area: 0.1, thickness: 0.05 };
    patchForce(patch, still(), { x: 0, y: 0, z: 5 }, 1.5, out);
    const reynolds = (5 * 1.5) / WATER.viscosity;
    expect(out.friction.z).toBeCloseTo(-0.5 * WATER.density * ittcFriction(reynolds) * 25 * 0.1, 9);
    expect(out.pressure.y).toBe(0);
  });

  it('floats a patch by the water it displaces, and does nothing where there is no water', () => {
    const out = createPatchForce();
    const patch: WorldPatch = { position: { x: 0, y: -0.025, z: 0 }, normal: { x: 0, y: -1, z: 0 }, area: 0.1, thickness: 0.05 };
    patchForce(patch, still(), { x: 0, y: 0, z: 0 }, 1.5, out);
    expect(out.buoyancy.y).toBeCloseTo(WATER.density * WATER.gravity * 0.1 * 0.025, 9);
    patchForce({ ...patch, position: { x: 0, y: -0.2, z: 0 } }, still(), { x: 0, y: 0, z: 0 }, 1.5, out);
    expect(out.buoyancy.y).toBeCloseTo(WATER.density * WATER.gravity * 0.1 * 0.05, 9);
    for (const sample of [{ ...still(), wet: false }, { ...still(), outsideDomain: true }]) {
      patchForce(patch, sample, { x: 1, y: -1, z: 3 }, 1.5, out);
      expect([out.buoyancy.y, out.pressure.y, out.friction.z]).toEqual([0, 0, 0]);
    }
    // Rising out of the water: no suction.
    patchForce(patch, still(), { x: 0, y: 2, z: 0 }, 1.5, out);
    expect(out.pressure.y).toBe(0);
  });

  // Hydrostatic pressure p = ρg(η − y) pushes a displaced volume V by ρgV(−∂η/∂x, 1, −∂η/∂z): down a wave face.
  it('pushes a floating patch down the slope of the water surface, normal to it', () => {
    const out = createPatchForce();
    const patch: WorldPatch = { position: { x: 0, y: -0.025, z: 0 }, normal: { x: 0, y: -1, z: 0 }, area: 0.1, thickness: 0.05 };
    patchForce(patch, { ...still(), slopeX: -0.1, slopeZ: 0.3 }, { x: 0, y: 0, z: 0 }, 1.5, out);
    const weight = WATER.density * WATER.gravity * 0.1 * 0.025;
    expect(out.buoyancy.y).toBeCloseTo(weight, 9);
    expect(out.buoyancy.x).toBeCloseTo(0.1 * weight, 9);
    expect(out.buoyancy.z).toBeCloseTo(-0.3 * weight, 9);
  });

  it('floats a capsized patch on its deck and resists it being pushed down deck first', () => {
    const out = createPatchForce();
    // Upside down: the bottom faces up at y = 0.03 and the deck is 2 cm under water.
    const patch: WorldPatch = { position: { x: 0, y: 0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, area: 0.1, thickness: 0.05 };
    patchForce(patch, still(), { x: 0, y: -1, z: 0 }, 1.5, out);
    expect(out.buoyancy.y).toBeCloseTo(WATER.density * WATER.gravity * 0.1 * 0.02, 9);
    expect(out.buoyancyPoint.y).toBeCloseTo(-0.01, 12);
    expect(out.pressure.y).toBeCloseTo(0.5 * WATER.density * PRESSURE_COEFFICIENT * 0.1, 9);
    expect(out.wettedArea).toBe(0);
    expect(out.deckWettedArea).toBeCloseTo(0.1, 12);
  });

  // The integrator treats pressure implicitly along the normal; its coefficient must be the true derivative.
  it('reports the derivative of its pressure along the normal', () => {
    const out = createPatchForce();
    const patch: WorldPatch = { position: { x: 0, y: -0.02, z: 0 }, normal: { x: 0, y: -Math.cos(0.1), z: Math.sin(0.1) }, area: 0.1, thickness: 0.05 };
    const pressureAlongNormal = (push: number) => {
      const { normal } = patch;
      patchForce(patch, still(), { x: 0.3 + push * normal.x, y: push * normal.y, z: 4 + push * normal.z }, 1.5, out);
      return out.pressure.x * normal.x + out.pressure.y * normal.y + out.pressure.z * normal.z;
    };
    const step = 1e-6;
    const derivative = -(pressureAlongNormal(step) - pressureAlongNormal(-step)) / (2 * step);
    pressureAlongNormal(0);
    expect(out.pressureDamping).toBeCloseTo(derivative, 3);
    expect(out.pressureDamping).toBeGreaterThan(0);
  });
});

/**
 * Step 3.3d, `buoyFrame: 'hull'` (`?buoyFrame=hull`), opt-in and off by default: the hydrostatic support resolved along
 * the **hull** normal where the deck is dry and the patch planes, blending back to the water-surface normal as it
 * floats or submerges. Savitsky's own convention for a bottom wetted on one side (`HULL_BUOYANCY`'s note).
 */
describe('a hull patch whose hydrostatic support points along the hull', () => {
  /** A patch rolled and trimmed off the vertical, 0.1 m² and 5 cm thick, its bottom face at `y`. */
  const slant = Math.hypot(0.3, 0.9, 0.3);
  const tilted = (y: number): WorldPatch => ({
    position: { x: 0, y, z: 0 }, normal: { x: -0.3 / slant, y: -0.9 / slant, z: 0.3 / slant }, area: 0.1, thickness: 0.05,
  });
  const planing = { x: 0, y: 0, z: 7.5 };
  const magnitude = (f: { x: number; y: number; z: number }) => Math.hypot(f.x, f.y, f.z);
  const offHull = (patch: WorldPatch, f: { x: number; y: number; z: number }) => {
    const cos = (f.x * -patch.normal.x + f.y * -patch.normal.y + f.z * -patch.normal.z) / magnitude(f);
    return (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
  };

  it('leaves the default alone, bit for bit, and reports no hull share', () => {
    const patch = tilted(-0.02);
    const shipped = patchForce(patch, still(), planing, 1.5, createPatchForce());
    const off = patchForce(patch, still(), planing, 1.5, createPatchForce(), 1, 0, 1, 0);
    expect([off.buoyancy.x, off.buoyancy.y, off.buoyancy.z]).toEqual([shipped.buoyancy.x, shipped.buoyancy.y, shipped.buoyancy.z]);
    expect([shipped.hullShare, off.hullShare]).toEqual([0, 0]);
    // The shipped direction is the water's — straight up on flat water, whatever the hull is doing.
    expect([Math.abs(shipped.buoyancy.x), Math.abs(shipped.buoyancy.z)]).toEqual([0, 0]);
  });

  it('turns the support onto the hull normal while the deck is dry and it planes, at the same magnitude', () => {
    const patch = tilted(-0.02);
    const mag = magnitude(patchForce(patch, still(), planing, 1.5, createPatchForce()).buoyancy);
    // Far past planing, so the blend's Froude term is 1 to within 1e-12 and the limit is exact.
    const hull = patchForce(patch, still(), { x: 0, y: 0, z: 1e5 }, 1.5, createPatchForce(), 1, 0, 1, 1);
    expect(hull.hullShare).toBeCloseTo(1, 9);
    expect(magnitude(hull.buoyancy)).toBeCloseTo(mag, 9);
    expect(hull.buoyancy.x).toBeCloseTo(-patch.normal.x * mag, 7);
    expect(hull.buoyancy.y).toBeCloseTo(-patch.normal.y * mag, 7);
    expect(hull.buoyancy.z).toBeCloseTo(-patch.normal.z * mag, 7);
    // At the ride's own speed it is all but there: the Froude term is 0.9965 at 7.5 m/s and 2 cm of immersion.
    const ride = patchForce(patch, still(), planing, 1.5, createPatchForce(), 1, 0, 1, 1);
    expect(ride.hullShare).toBeCloseTo(56.25 / (56.25 + WATER.gravity * 0.02), 9);
    expect(offHull(patch, ride.buoyancy)).toBeLessThan(0.2);
    expect(magnitude(ride.buoyancy)).toBeCloseTo(mag, 9);
  });

  it('keeps the water-surface normal where the board floats rather than planes', () => {
    const patch = tilted(-0.02);
    const shipped = patchForce(patch, still(), { x: 0, y: 0, z: 0 }, 1.5, createPatchForce());
    const hull = patchForce(patch, still(), { x: 0, y: 0, z: 0 }, 1.5, createPatchForce(), 1, 0, 1, 1);
    expect(hull.hullShare).toBe(0);
    expect([hull.buoyancy.x, hull.buoyancy.y, hull.buoyancy.z]).toEqual([shipped.buoyancy.x, shipped.buoyancy.y, shipped.buoyancy.z]);
  });

  it('keeps the water-surface normal under a wetted deck, so a capsized patch is never pushed under by its own buoyancy', () => {
    // Upside down: the bottom faces up at y = 0.03 and the deck is 2 cm under, so the slab is closed above and the
    // hull's own normal points straight DOWN. The switch must not follow it.
    const patch: WorldPatch = { position: { x: 0, y: 0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, area: 0.1, thickness: 0.05 };
    const hull = patchForce(patch, still(), { x: 0, y: -1, z: 6 }, 1.5, createPatchForce(), 1, 0, 1, 1);
    expect(hull.hullShare).toBe(0);
    expect(hull.buoyancy.y).toBeCloseTo(WATER.density * WATER.gravity * 0.1 * 0.02, 9);
  });

  it('blends by the deck\'s own dry share, and never changes the magnitude on the way', () => {
    // The deck exactly on the surface line, so `wettedShare` reads 0.5 and the blend is half the planing share.
    const deep = (0.9 / slant) * 0.05;
    const patch = tilted(-deep);
    const shipped = patchForce(patch, still(), planing, 1.5, createPatchForce());
    const mag = magnitude(shipped.buoyancy);
    const offShipped = offHull(patch, shipped.buoyancy);
    const half = patchForce(patch, still(), planing, 1.5, createPatchForce(), 1, 0, 1, 1);
    expect(half.hullShare).toBeCloseTo(0.5 * (56.25 / (56.25 + WATER.gravity * deep)), 9);
    expect(magnitude(half.buoyancy)).toBeCloseTo(mag, 9);
    // Half way over: off the water's normal, not yet onto the hull's.
    expect(offHull(patch, half.buoyancy)).toBeGreaterThan(5);
    expect(offHull(patch, half.buoyancy)).toBeLessThan(offShipped);
  });
});

// The wipeout spec, Part B: a hull in aerated water floats and drags in a lighter mixture.
describe('a hull patch in aerated water', () => {
  it('scales its buoyancy, pressure and friction by the share of the water that is water', () => {
    const patch: WorldPatch = { position: { x: 0, y: -0.02, z: 0 }, normal: { x: 0, y: -0.99, z: 0.14 }, area: 0.05, thickness: 0.05 };
    const clear = patchForce(patch, still(), { x: 0, y: -0.5, z: 3 }, 1, createPatchForce());
    const clearValues = [clear.buoyancy.y, clear.pressure.y, clear.friction.z];
    const aerated = patchForce(patch, { ...still(), voidFraction: 0.2 }, { x: 0, y: -0.5, z: 3 }, 1, createPatchForce());
    [aerated.buoyancy.y, aerated.pressure.y, aerated.friction.z].forEach((value, i) => expect(value).toBeCloseTo(0.8 * clearValues[i], 9));
  });
});
