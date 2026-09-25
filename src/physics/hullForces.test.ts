import { describe, expect, it } from 'vitest';
import { WATER, createPatchForce, ittcFriction, patchForce, savitskyLift, type WorldPatch } from './hullForces';
import { createWaterSample } from './SurfWater';

const still = () => ({ ...createWaterSample(), surfaceY: 0, stillDepth: 3, waterDepth: 3, wet: true, regime: 'profile' as const });

/**
 * A flat plate of beam b trimmed bow-up by τ, moving at V along +z, with λb of
 * its length wetted: the trailing edge sits λ b sin τ deep.
 */
function towedPlate(trimDegrees: number, lambda: number, speedCoefficient: number, beam = 0.4) {
  const trim = (trimDegrees * Math.PI) / 180;
  const speed = speedCoefficient * Math.sqrt(WATER.gravity * beam);
  const length = 6 * beam;
  const segments = 240;
  const patches: WorldPatch[] = [];
  for (let k = 0; k < segments; k += 1) {
    const along = ((k + 0.5) / segments) * length;
    patches.push({
      position: { x: 0, y: -lambda * beam * Math.sin(trim) + along * Math.sin(trim), z: along * Math.cos(trim) },
      normal: { x: 0, y: -Math.cos(trim), z: Math.sin(trim) },
      area: (length / segments) * beam,
      thickness: 0.05,
    });
  }
  let lift = 0;
  let drag = 0;
  let wetted = 0;
  const out = createPatchForce();
  for (const patch of patches) {
    patchForce(patch, still(), { x: 0, y: 0, z: speed }, length, out);
    lift += out.pressure.y;
    drag -= out.pressure.z;
    wetted += out.wettedArea;
  }
  const dynamicPressure = 0.5 * WATER.density * speed * speed * beam * beam;
  return { lift, drag, wetted, savitsky: savitskyLift(trimDegrees, lambda, speedCoefficient).dynamic * dynamicPressure };
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

  // Uniform patch pressure cannot follow Savitsky's √λ growth exactly; over a surfboard's
  // planing range (τ 3–7°, λ 2–4, about 4–8 m/s with a rider) one coefficient stays within ±25 %.
  it('stays within a quarter of Savitsky’s lift over the planing range, rising with trim', () => {
    let previous = 0;
    for (const trim of [3, 5, 7]) {
      for (const lambda of [2, 4]) {
        const { lift, savitsky } = towedPlate(trim, lambda, 5);
        expect(lift / savitsky, `τ ${trim}°, λ ${lambda}`).toBeGreaterThan(0.75);
        expect(lift / savitsky, `τ ${trim}°, λ ${lambda}`).toBeLessThan(1.25);
      }
      const { lift } = towedPlate(trim, 3, 5);
      expect(lift).toBeGreaterThan(previous);
      previous = lift;
    }
    expect(towedPlate(6, 3, 5).drag).toBeCloseTo(towedPlate(6, 3, 5).lift * Math.tan((6 * Math.PI) / 180), 6);
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
});
