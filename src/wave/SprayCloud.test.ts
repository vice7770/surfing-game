import { describe, expect, it } from 'vitest';
import { SPRAY_STRIDE, SprayCloud, type LipImpact, type SprayScene } from './SprayCloud';

/** Flat water 2 m deep over 10 m × 40 m (1 m cells), still, with no bores; `crest` raises a steep shoreward-facing step. */
function flatScene(windSpeed = 0, lipImpacts: LipImpact[] = [], crest = false): SprayScene {
  const nx = 10;
  const nz = 40;
  const h = new Float64Array(nx * nz).fill(2);
  if (crest) {
    for (let row = 18; row <= 20; row += 1) for (let column = 0; column < nx; column += 1) h[row * nx + column] = row === 20 ? 2.9 : 2 + 0.9 * (row - 17) / 3;
  }
  const bed = new Float64Array(nx * nz).fill(-2);
  return {
    solver: {
      nx, nz, dx: 1, restLevel: 0,
      xCenters: Array.from({ length: nx }, (_, i) => i + 0.5),
      zCenters: Array.from({ length: nz }, (_, i) => i + 0.5),
      dz: new Float64Array(nz).fill(1),
      h, bed, qx: new Float64Array(nx * nz), qz: new Float64Array(nx * nz),
      cellIndex: (x, z) => Math.min(nz - 1, Math.max(0, Math.floor(z))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(x))),
    },
    foam: { source: new Float64Array(nx * nz) },
    lipImpacts,
    windSpeed,
  };
}

const impact = (volume: number, speed = 5): LipImpact => ({ x: 5, z: 20, volume, vx: 0, vy: -speed, vz: speed });

function meanVelocityZ(cloud: SprayCloud, scene: SprayScene, seconds: number): number {
  const start = new Float64Array(cloud.count);
  for (let k = 0; k < cloud.count; k += 1) start[k] = cloud.particles[k * SPRAY_STRIDE + 2];
  const count = cloud.count;
  cloud.update({ ...scene, lipImpacts: [] }, seconds);
  let drift = 0;
  for (let k = 0; k < Math.min(count, cloud.count); k += 1) drift += cloud.particles[k * SPRAY_STRIDE + 2] - start[k];
  return drift / Math.max(1, Math.min(count, cloud.count)) / seconds;
}

describe('spray and mist', () => {
  it('splashes drops up from a lip impact in proportion to its energy, which fall back into the water', () => {
    const small = new SprayCloud(3);
    small.update(flatScene(0, [impact(0.05)]), 1 / 60);
    const large = new SprayCloud(3);
    large.update(flatScene(0, [impact(0.2)]), 1 / 60);
    expect(small.count).toBeGreaterThan(5);
    expect(large.count).toBeGreaterThan(3 * small.count);
    let highest = 0;
    for (let frame = 0; frame < 300 && large.count > 0; frame += 1) {
      large.update(flatScene(), 1 / 60);
      for (let k = 0; k < large.count; k += 1) highest = Math.max(highest, large.particles[k * SPRAY_STRIDE + 1]);
    }
    expect(highest).toBeGreaterThan(0.3);
    expect(large.count).toBe(0);
  });

  it('carries drops downwind', () => {
    const calm = new SprayCloud(9);
    calm.update(flatScene(0, [impact(0.2)]), 1 / 60);
    const blown = new SprayCloud(9);
    blown.update(flatScene(8, [impact(0.2)]), 1 / 60);
    expect(meanVelocityZ(blown, flatScene(8), 0.2)).toBeGreaterThan(meanVelocityZ(calm, flatScene(0), 0.2) + 0.5);
  });

  it('feathers mist seaward off a steep crest in offshore wind, and not in calm air', () => {
    const offshore = new SprayCloud(5);
    const calm = new SprayCloud(5);
    for (let frame = 0; frame < 120; frame += 1) {
      offshore.update(flatScene(-9, [], true), 1 / 60);
      calm.update(flatScene(0, [], true), 1 / 60);
    }
    expect(calm.count).toBe(0);
    expect(offshore.count).toBeGreaterThan(10);
    expect(meanVelocityZ(offshore, flatScene(-9, [], true), 0.1)).toBeLessThan(-1);
  });

  it('stays within its pool and replays a seed exactly', () => {
    const a = new SprayCloud(11, 64);
    const b = new SprayCloud(11, 64);
    for (let frame = 0; frame < 30; frame += 1) {
      a.update(flatScene(3, [impact(0.4)]), 1 / 60);
      b.update(flatScene(3, [impact(0.4)]), 1 / 60);
    }
    expect(a.count).toBeLessThanOrEqual(64);
    expect(Array.from(a.particles.subarray(0, a.count * SPRAY_STRIDE))).toEqual(Array.from(b.particles.subarray(0, b.count * SPRAY_STRIDE)));
  });
});
