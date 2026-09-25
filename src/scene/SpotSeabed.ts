import { BufferAttribute, Color, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';

/** Static seabed of a physical spot, shaded from pale sand in the shallows to deep blue-green. */
export class SpotSeabed {
  readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly shallow = new Color('#d6c69c');
  private readonly deep = new Color('#2f5f66');

  constructor() {
    this.mesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ vertexColors: true, fog: true }));
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
  }

  /** Rebuild over a rectangle from a depth function (positive below datum, m). */
  setDepth(depthAt: (x: number, z: number) => number, xMin: number, zMin: number, width: number, length: number, spacing = 2): void {
    const geometry = new PlaneGeometry(width, length, Math.max(1, Math.round(width / spacing)), Math.max(1, Math.round(length / spacing)));
    geometry.rotateX(-Math.PI / 2);
    const centerX = xMin + width / 2;
    const centerZ = zMin + length / 2;
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const color = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const depth = depthAt(positions.getX(i) + centerX, positions.getZ(i) + centerZ);
      positions.setY(i, -depth);
      color.copy(this.shallow).lerp(this.deep, Math.min(1, Math.max(0, depth / 12)));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.position.set(centerX, 0, centerZ);
    this.mesh.visible = true;
  }
}
