import { BufferAttribute, Color, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';

/** Decorative seabed bands follow the authoritative wave slopes; they do not affect water forces. */
export class Seabed {
  readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly colors: BufferAttribute;
  private readonly sand = new Color('#487e7a');
  private readonly light = new Color('#9bc2ae');
  private lastWave?: InteractiveWaterField;

  constructor() {
    const geometry = new PlaneGeometry(48, 80, 32, 50);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -3.6, 8);
    this.colors = new BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3);
    geometry.setAttribute('color', this.colors);
    this.mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, fog: true }));
    this.mesh.frustumCulled = false;
  }

  update(wave: InteractiveWaterField): void {
    const positions = this.mesh.geometry.getAttribute('position');
    if (this.lastWave !== wave) {
      for (let i = 0; i < positions.count; i += 1) {
        positions.setY(i, -wave.depthAt(positions.getX(i), positions.getZ(i)));
      }
      positions.needsUpdate = true;
      this.mesh.geometry.computeVertexNormals();
      this.lastWave = wave;
    }
    const color = this.sand.clone();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const slope = wave.slopeMagnitude(x, z);
      const phase = x * 1.4 + z * 0.8 - wave.time * 1.1 + slope * 4;
      const band = Math.pow(Math.max(0, Math.sin(phase) * Math.sin(phase * 0.63 + 1.4)), 4);
      const strength = Math.min(0.75, band * 0.55 + slope * 0.07);
      color.copy(this.sand).lerp(this.light, strength);
      this.colors.setXYZ(i, color.r, color.g, color.b);
    }
    this.colors.needsUpdate = true;
  }
}
