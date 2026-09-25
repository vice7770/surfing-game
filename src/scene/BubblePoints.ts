import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';

/** What the renderer needs from a bubble cloud: packed (x, y, z) positions and how many are live. */
export interface RenderableBubbles {
  readonly positions: Float32Array;
  readonly count: number;
}

/** Draws a `BubbleCloud` (or a snapshot of one) as small soft points, seen from under the surface. */
export class BubblePoints {
  readonly mesh: Points<BufferGeometry, PointsMaterial>;
  private readonly positions: BufferAttribute;

  constructor(readonly capacity = 4096) {
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(capacity * 3), 3);
    geometry.setAttribute('position', this.positions);
    geometry.setDrawRange(0, 0);
    this.mesh = new Points(geometry, new PointsMaterial({
      color: '#f2fbff', size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    this.mesh.frustumCulled = false;
  }

  update(bubbles: RenderableBubbles): void {
    const count = Math.min(this.capacity, bubbles.count);
    (this.positions.array as Float32Array).set(bubbles.positions.subarray(0, count * 3));
    this.positions.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, count);
  }
}
