import { describe, expect, it } from 'vitest';
import { LipPoints, type RenderableLip } from './LipPoints';

describe('LipPoints', () => {
  it('draws exactly the airborne lip parcels', () => {
    const parcels = [[1, 2, 3, 0.2], [4, 5, 6, 0.1]];
    const lip: RenderableLip = { forEachActive: (visit) => parcels.forEach(([x, y, z, v]) => visit(x, y, z, v)) };
    const points = new LipPoints(8);
    points.update(lip);
    expect(points.mesh.geometry.drawRange.count).toBe(2);
    const position = points.mesh.geometry.getAttribute('position');
    expect([position.getX(1), position.getY(1), position.getZ(1)]).toEqual([4, 5, 6]);
    parcels.length = 0;
    points.update(lip);
    expect(points.mesh.geometry.drawRange.count).toBe(0);
  });

  it('never draws more parcels than it holds', () => {
    const lip: RenderableLip = { forEachActive: (visit) => { for (let i = 0; i < 20; i += 1) visit(i, 0, 0, 0.1); } };
    const points = new LipPoints(8);
    points.update(lip);
    expect(points.mesh.geometry.drawRange.count).toBe(8);
  });
});
