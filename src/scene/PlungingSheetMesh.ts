import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshStandardMaterial } from 'three';
import type { PlungingSheet } from '../wave/PlungingSheet';

/** Renders exactly the parcels owned by the 3D lip collision model. */
export class PlungingSheetMesh {
  readonly mesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly positions: BufferAttribute;
  private readonly colors: BufferAttribute;
  private readonly indices: BufferAttribute;
  private readonly occupied: Uint8Array;
  private readonly columns: number;
  private readonly layers: number;

  constructor(sheet: PlungingSheet) {
    this.columns = sheet.columns;
    this.layers = sheet.layers;
    const count = this.columns * this.layers;
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(count * 2 * 3), 3);
    this.colors = new BufferAttribute(new Float32Array(count * 2 * 3), 3);
    this.indices = new BufferAttribute(new Uint16Array((this.columns - 1) * (this.layers - 1) * 36), 1);
    this.occupied = new Uint8Array(count);
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('color', this.colors);
    geometry.setIndex(this.indices);
    geometry.setDrawRange(0, 0);
    this.mesh = new Mesh(geometry, new MeshStandardMaterial({
      color: '#d7f4ef', vertexColors: true, roughness: 0.62, metalness: 0,
      side: DoubleSide, transparent: true, opacity: 0.76, depthWrite: false,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  update(sheet: PlungingSheet): void {
    if (sheet.columns !== this.columns || sheet.layers !== this.layers) {
      throw new Error('Plunging sheet dimensions changed; create a matching renderer');
    }
    this.occupied.fill(0);
    sheet.forEachActive((index, x, y, z, strength) => {
      this.occupied[index] = 1;
      this.positions.setXYZ(index, x, y, z);
      this.positions.setXYZ(index + this.occupied.length, x, y - sheet.dropY, z + sheet.reachZ);
      const tint = Math.min(1, 0.42 + strength * 0.5);
      this.colors.setXYZ(index, tint * 0.77, tint * 0.97, tint);
      this.colors.setXYZ(index + this.occupied.length, tint * 0.44, tint * 0.8, tint * 0.88);
    });
    let count = 0;
    const output = this.indices.array as Uint16Array;
    const backOffset = this.occupied.length;
    const triangle = (a: number, b: number, c: number): void => {
      output[count++] = a;
      output[count++] = b;
      output[count++] = c;
    };
    const rim = (a: number, b: number): void => {
      triangle(a, b, a + backOffset);
      triangle(b, b + backOffset, a + backOffset);
    };
    for (let row = 0; row < this.layers - 1; row += 1) {
      for (let column = 0; column < this.columns - 1; column += 1) {
        const a: number = row * this.columns + column;
        const b: number = a + 1;
        const c: number = a + this.columns;
        const d: number = c + 1;
        if (!this.occupied[a] || !this.occupied[b] || !this.occupied[c] || !this.occupied[d]) continue;
        triangle(a, c, b);
        triangle(b, c, d);
        triangle(a + backOffset, b + backOffset, c + backOffset);
        triangle(b + backOffset, d + backOffset, c + backOffset);
        if (row === 0 || !this.occupied[a - this.columns] || !this.occupied[b - this.columns]) rim(a, b);
        if (row === this.layers - 2 || !this.occupied[c + this.columns] || !this.occupied[d + this.columns]) rim(d, c);
        if (column === 0 || !this.occupied[a - 1] || !this.occupied[c - 1]) rim(c, a);
        if (column === this.columns - 2 || !this.occupied[b + 1] || !this.occupied[d + 1]) rim(b, d);
      }
    }
    output.fill(0, count);
    this.mesh.geometry.setDrawRange(0, count);
    this.mesh.visible = count > 0;
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.indices.needsUpdate = true;
    if (count > 0) this.mesh.geometry.computeVertexNormals();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
