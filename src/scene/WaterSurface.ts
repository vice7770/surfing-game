import {
  BufferAttribute,
  Color,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
} from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';

export class WaterSurface {
  readonly mesh: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  private readonly geometry: PlaneGeometry;
  private readonly positions: BufferAttribute;
  private readonly colors: Float32Array;
  private readonly baseColor = new Color('#0c8f9d');
  private readonly crestColor = new Color('#4fc1b5');
  private readonly foamColor = new Color('#d8f2e9');
  private readonly resolutionX = 96;
  private readonly resolutionZ = 160;

  constructor(private wave: InteractiveWaterField) {
    this.geometry = new PlaneGeometry(48, 80, this.resolutionX, this.resolutionZ);
    this.geometry.rotateX(-Math.PI / 2);
    this.geometry.translate(0, 0, 8);
    this.positions = this.geometry.getAttribute('position') as BufferAttribute;
    this.colors = new Float32Array(this.positions.count * 3);
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.mesh = new Mesh(
      this.geometry,
      new MeshPhysicalMaterial({
        vertexColors: true,
        color: '#ffffff',
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 0.72,
        clearcoatRoughness: 0.16,
        side: DoubleSide,
        flatShading: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.update();
  }

  update(): void {
    const color = this.baseColor.clone();
    for (let i = 0; i < this.positions.count; i += 1) {
      const x = this.positions.getX(i);
      const z = this.positions.getZ(i);
      const height = this.wave.heightAt(x, z);
      this.positions.setY(i, height);
      const slope = this.wave.slopeMagnitude(x, z);
      const crest = Math.max(0, Math.min(0.6, height / Math.max(this.wave.settings.height, 0.01) * 0.6));
      const foam = Math.max(0, Math.min(1, (slope - 0.12) * 2.4));
      color.copy(this.baseColor).lerp(this.crestColor, crest).lerp(this.foamColor, foam);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
    this.positions.needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  setWave(wave: InteractiveWaterField): void {
    this.wave = wave;
  }

  dispose(): void {
    this.geometry.dispose();
    this.mesh.material.dispose();
  }
}
