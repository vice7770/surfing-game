import { describe, it } from 'vitest';
import { SPRAY_STRIDE, SprayCloud, type LipImpact, type SprayScene } from '../../src/wave/SprayCloud';
function flatScene(lipImpacts: LipImpact[] = []): SprayScene {
  const nx = 10, nz = 40;
  const h = new Float64Array(nx * nz).fill(2);
  const bed = new Float64Array(nx * nz).fill(-2);
  return {
    solver: { nx, nz, dx: 1, restLevel: 0,
      xCenters: Array.from({ length: nx }, (_, i) => i + 0.5),
      zCenters: Array.from({ length: nz }, (_, i) => i + 0.5),
      dz: new Float64Array(nz).fill(1), h, bed, qx: new Float64Array(nx*nz), qz: new Float64Array(nx*nz),
      cellIndex: (x, z) => Math.min(nz-1, Math.max(0, Math.floor(z)))*nx + Math.min(nx-1, Math.max(0, Math.floor(x))) },
    foam: { source: new Float64Array(nx * nz) }, lipImpacts, windSpeed: 0,
  };
}
const jet = (): LipImpact => ({ x: 5, z: 14, volume: 0.4, vx: 0, vy: -6.3, vz: 4, kind: 0, height: 2 });
describe('probe', () => {
  it('heights', () => {
    for (const seconds of [0.24, 1.4]) {
      const cloud = new SprayCloud(15); cloud.veil = true;
      const scene = flatScene([jet()]);
      cloud.update(scene, 1/60);
      let maxAll = -Infinity, maxLight = -Infinity; const tops: number[] = [];
      for (let step = 0; step < Math.round(seconds*60); step += 1) {
        cloud.update({ ...scene, lipImpacts: [] }, 1/60);
        const hs: number[] = [];
        for (let k = 0; k < cloud.count; k += 1) {
          const y = cloud.particles[k*SPRAY_STRIDE+1]; hs.push(y);
          maxAll = Math.max(maxAll, y);
          if (cloud.particles[k*SPRAY_STRIDE+3] > 0.25) maxLight = Math.max(maxLight, y);
        }
        hs.sort((a,b)=>a-b);
        if (hs.length) tops.push(hs[Math.floor(0.95*hs.length)]);
      }
      tops.sort((a,b)=>a-b);
      console.log(seconds, 'maxAll', maxAll.toFixed(2), 'maxLight', maxLight.toFixed(2), 'median p95 height', tops[Math.floor(tops.length/2)]?.toFixed(2), 'count', cloud.count);
    }
  });
});
