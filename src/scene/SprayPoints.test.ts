import { BufferAttribute, DynamicDrawUsage } from 'three';
import { describe, expect, it } from 'vitest';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { SprayPoints } from './SprayPoints';

describe('SprayPoints uploads', () => {
  it('can omit foam balls while retaining ordinary spray, mist and tube bursts', () => {
    const points = new SprayPoints(8);
    points.setLook('rich');
    const particles = Float32Array.from([
      1, 2, 3, 0.1, 0.8, 0,
      4, 5, 6, 0.6, 0.9, 2,
      7, 8, 9, 0.4, 0.25, 1,
      10, 11, 12, 0.2, 0.8, 3,
      13, 14, 15, 0.5, 0.25, 4,
    ]);
    points.update({ particles, count: 5 }, false);
    const kinds = points.mesh.geometry.getAttribute('kind') as BufferAttribute;
    const positions = points.mesh.geometry.getAttribute('position') as BufferAttribute;
    expect(points.mesh.geometry.drawRange.count).toBe(4);
    expect(Array.from(kinds.array.slice(0, 4))).toEqual([0, 1, 3, 4]);
    expect(Array.from(positions.array.slice(0, 12))).toEqual([1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    points.update({ particles, count: 5 });
    expect(points.mesh.geometry.drawRange.count).toBe(5);
    expect(Array.from(kinds.array.slice(0, 5))).toEqual([0, 2, 1, 3, 4]);
  });

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
