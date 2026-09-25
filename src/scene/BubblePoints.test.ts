import { describe, expect, it } from 'vitest';
import { BubblePoints } from './BubblePoints';

describe('BubblePoints', () => {
  it('draws exactly the bubbles it is given, within its pool', () => {
    const points = new BubblePoints(4);
    points.update({ positions: Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]), count: 2 });
    expect(points.mesh.geometry.drawRange.count).toBe(2);
    const position = points.mesh.geometry.getAttribute('position');
    expect([position.getX(1), position.getY(1), position.getZ(1)]).toEqual([4, 5, 6]);
    points.update({ positions: new Float32Array(30), count: 10 });
    expect(points.mesh.geometry.drawRange.count).toBe(4);
    points.update({ positions: new Float32Array(0), count: 0 });
    expect(points.mesh.geometry.drawRange.count).toBe(0);
  });
});
