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
  private readonly foamMemory: Float32Array;
  private lastWaveTime = 0;
  private lastZMin = -32;

  constructor(private wave: InteractiveWaterField) {
    this.geometry = new PlaneGeometry(48, 80, this.resolutionX, this.resolutionZ);
    this.geometry.rotateX(-Math.PI / 2);
    this.geometry.translate(0, 0, 8);
    this.positions = this.geometry.getAttribute('position') as BufferAttribute;
    this.colors = new Float32Array(this.positions.count * 3);
    this.foamMemory = new Float32Array(this.positions.count);
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.mesh = new Mesh(
      this.geometry,
      new MeshPhysicalMaterial({
        vertexColors: true,
        color: '#ffffff',
        roughness: 0.62,
        metalness: 0.01,
        clearcoat: 0.12,
        clearcoatRoughness: 0.55,
        side: DoubleSide,
        flatShading: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.update();
  }

  update(): void {
    if (this.wave.zMin !== this.lastZMin) {
      const rows = Math.round((this.wave.zMin - this.lastZMin) / (80 / this.resolutionZ));
      const cells = rows * (this.resolutionX + 1);
      this.foamMemory.copyWithin(0, cells);
      this.foamMemory.fill(0, this.foamMemory.length - cells);
      this.lastZMin = this.wave.zMin;
    }
    this.mesh.position.z = this.wave.zMin + 32;
    const color = this.baseColor.clone();
    const crestZ = this.wave.crestZ();
    const elapsed = Math.max(0, this.wave.time - this.lastWaveTime);
    this.lastWaveTime = this.wave.time;
    const foamDecay = Math.exp(-elapsed / 2.2);
    for (let i = 0; i < this.positions.count; i += 1) {
      const x = this.positions.getX(i);
      const z = this.positions.getZ(i) + this.mesh.position.z;
      const height = this.wave.heightAt(x, z);
      this.positions.setY(i, height);
      const slope = this.wave.slopeMagnitude(x, z);
      const crest = Math.max(0, Math.min(0.6, height / Math.max(this.wave.settings.height, 0.01) * 0.6));
      const crestDistance = (z - this.wave.crestZAt(x, crestZ)) / 1.15;
      const narrowFoam = Math.exp(-0.5 * crestDistance * crestDistance);
      const activeFoam = Math.max(
        Math.max(0, Math.min(0.12, (slope - 0.12) * 0.5)),
        this.wave.breakingAt(x, z, slope, crestZ) * narrowFoam * 0.88,
      );
      this.foamMemory[i] = Math.max(activeFoam, this.foamMemory[i] * foamDecay);
      const foam = Math.max(activeFoam, this.foamMemory[i] * 0.65);
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
    this.foamMemory.fill(0);
    this.lastWaveTime = 0;
    this.lastZMin = wave.zMin;
    this.mesh.position.z = wave.zMin + 32;
  }

  dispose(): void {
    this.geometry.dispose();
    this.mesh.material.dispose();
  }
}
