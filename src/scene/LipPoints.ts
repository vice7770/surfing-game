import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';

/** What the renderer needs from `PlungingLip`. */
export interface RenderableLip {
  forEachActive(visit: (x: number, y: number, z: number, volume: number) => void): void;
}

/**
 * Renders the physical mode's airborne lip parcels as points (plan Q12). Each
 * parcel carries about a quarter of a metre-wide throw, so the points are
 * drawn about a metre across.
 */
export class LipPoints {
  readonly mesh: Points<BufferGeometry, PointsMaterial>;
  private readonly positions: BufferAttribute;

  constructor(readonly capacity = 4096) {
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(capacity * 3), 3);
    geometry.setAttribute('position', this.positions);
    geometry.setDrawRange(0, 0);
    this.mesh = new Points(geometry, new PointsMaterial({
      color: '#e6faf5', size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false,
    }));
    this.mesh.frustumCulled = false;
  }

  update(lip: RenderableLip): void {
    let count = 0;
    lip.forEachActive((x, y, z) => {
      if (count >= this.capacity) return;
      this.positions.setXYZ(count, x, y, z);
      count += 1;
    });
    this.positions.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, count);
  }
}
