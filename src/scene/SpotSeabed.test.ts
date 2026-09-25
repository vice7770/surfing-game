import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { SpotSeabed } from './SpotSeabed';

describe('SpotSeabed', () => {
  it('places every vertex on the spot bed', () => {
    const depthAt = (x: number, z: number) => 3 + 0.02 * x - 0.03 * z;
    const seabed = new SpotSeabed();
    seabed.setDepth(depthAt, -40, -120, 80, 150, 5);
    const positions = seabed.mesh.geometry.getAttribute('position');
    const world = new Vector3();
    for (let i = 0; i < positions.count; i += 37) {
      world.fromBufferAttribute(positions, i).add(seabed.mesh.position);
      // Vertex positions are 32-bit floats.
      expect(world.y).toBeCloseTo(-depthAt(world.x, world.z), 5);
    }
    expect(seabed.mesh.visible).toBe(true);
  });
});
