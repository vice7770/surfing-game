import { BufferAttribute, DynamicDrawUsage } from 'three';
import { describe, expect, it } from 'vitest';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { SprayPoints } from './SprayPoints';

describe('SprayPoints uploads', () => {
  it('uploads only the live filtered range, and replaces pending ranges when it shrinks or clears', () => {
    const points = new SprayPoints(8);
    const particles = Float32Array.from([
      1, 2, 3, 0.1, 0.8, 0,
      4, 5, 6, 0.6, 0.9, 2,
      7, 8, 9, 0.4, 0.25, 1,
    ]);
    const attributes = ['position', 'look', 'kind'].map((name) => points.mesh.geometry.getAttribute(name) as BufferAttribute);
    for (const attribute of attributes) expect(attribute.usage).toBe(DynamicDrawUsage);
    points.update({ particles, count: particles.length / SPRAY_STRIDE });
    expect(points.mesh.geometry.drawRange.count).toBe(2);
    for (const attribute of attributes) expect(attribute.updateRanges).toEqual([{ start: 0, count: 2 * attribute.itemSize }]);
    points.setLook('rich');
    points.update({ particles, count: 3 });
    for (const attribute of attributes) expect(attribute.updateRanges).toEqual([{ start: 0, count: 3 * attribute.itemSize }]);
    points.update({ particles, count: 1 });
    for (const attribute of attributes) expect(attribute.updateRanges).toEqual([{ start: 0, count: attribute.itemSize }]);
    const versions = attributes.map((attribute) => attribute.version);
    points.update({ particles, count: 0 });
    expect(points.mesh.geometry.drawRange.count).toBe(0);
    for (const attribute of attributes) expect(attribute.updateRanges).toEqual([]);
    expect(attributes.map((attribute) => attribute.version)).toEqual(versions);
  });
});
