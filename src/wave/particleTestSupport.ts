import type { SprayScene } from './SprayCloud';

/**
 * Tests only: 24 m × 40 m of water (1 m cells) with every source of particles
 * at once, changing frame by frame: bores making foam across six rows, a
 * jet's and a splash-up's lip impacts every third frame, a paddle stroke every
 * tenth, a steep crest feathering in a 9 m/s offshore wind, a spit for the
 * first 90 frames, eruptions, and a roller for the first 200.
 */
export function busyWhitewater(frame: number): SprayScene {
  const nx = 24;
  const nz = 40;
  const h = new Float64Array(nx * nz).fill(2);
  for (let row = 18; row <= 20; row += 1) for (let column = 0; column < nx; column += 1) h[row * nx + column] = row === 20 ? 2.9 : 2 + 0.9 * (row - 17) / 3;
  const bed = new Float64Array(nx * nz).fill(-2);
  const qx = new Float64Array(nx * nz).fill(0.3);
  const qz = new Float64Array(nx * nz).fill(1.2);
  const source = new Float64Array(nx * nz);
  for (let row = 24; row < 30; row += 1) for (let column = 0; column < nx; column += 1) source[row * nx + column] = 2 + ((row * 7 + column * 3 + frame) % 5);
  return {
    solver: {
      nx, nz, dx: 1, restLevel: 0,
      xCenters: Array.from({ length: nx }, (_, i) => i + 0.5),
      zCenters: Array.from({ length: nz }, (_, i) => i + 0.5),
      dz: new Float64Array(nz).fill(1),
      h, bed, qx, qz,
      cellIndex: (x: number, z: number) => Math.min(nz - 1, Math.max(0, Math.floor(z))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(x))),
    },
    foam: { source },
    lipImpacts: frame % 3 === 0 ? [{ x: 6, z: 20, volume: 0.3, vx: 0.5, vy: -5, vz: 4, whole: 0.5, kind: 0 }, { x: 9, z: 21, volume: 0.1, vx: 0, vy: -3, vz: 3, kind: 1 }] : [],
    windSpeed: -9,
    strokes: frame % 10 === 0 ? [{ x: 5, y: 0, z: 30, jx: 0, jy: 0, jz: 40, speed: 4 }] : [],
    spits: frame < 90 ? [{ x: 8, y: 1.2, z: 20, dirX: 1, dirZ: 0.2, speed: 9, airRate: 6 }] : [],
    eruptions: frame % 20 < 3 ? [{ x: 12, y: 1, z: 19, airRate: 4, speed: 5 }] : [],
    rollers: frame < 200 ? [{ id: 7, x: 10, y: 0.8, z: 20 + frame * 0.05, dirX: 0, dirZ: 1, speed: 5, area: 2.5, width: 3 }] : [],
  };
}
