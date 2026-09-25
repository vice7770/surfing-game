import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';

export class WaterSurface {
  readonly mesh: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  readonly lipMesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly geometry: PlaneGeometry;
  private readonly positions: BufferAttribute;
  private readonly colors: Float32Array;
  private readonly baseColor = new Color('#0c8f9d');
  private readonly crestColor = new Color('#4fc1b5');
  private readonly foamColor = new Color('#d8f2e9');
  private readonly resolutionX = 96;
  private readonly resolutionZ = 160;
  private readonly lipSegments = 96;
  private readonly lipRows = 5;
  private readonly lipPositions: BufferAttribute;
  private readonly lipColors: BufferAttribute;
  private readonly foamMemory: Float32Array;
  private lastWaveTime = 0;

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
    const lipGeometry = new BufferGeometry();
    this.lipPositions = new BufferAttribute(new Float32Array((this.lipSegments + 1) * this.lipRows * 3), 3);
    this.lipColors = new BufferAttribute(new Float32Array((this.lipSegments + 1) * this.lipRows * 4), 4);
    lipGeometry.setAttribute('position', this.lipPositions);
    lipGeometry.setAttribute('color', this.lipColors);
    const indices: number[] = [];
    for (let i = 0; i < this.lipSegments; i += 1) {
      for (let row = 0; row < this.lipRows - 1; row += 1) {
        const a = i * this.lipRows + row;
        const b = (i + 1) * this.lipRows + row;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    lipGeometry.setIndex(indices);
    this.lipMesh = new Mesh(lipGeometry, new MeshStandardMaterial({
      color: '#eaf8ef', vertexColors: true, roughness: 0.82, transparent: true, opacity: 0.88,
      side: DoubleSide, depthWrite: false,
    }));
    this.lipMesh.frustumCulled = false;
    this.update();
  }

  update(): void {
    const color = this.baseColor.clone();
    const crestZ = this.wave.crestZ();
    const elapsed = Math.max(0, this.wave.time - this.lastWaveTime);
    this.lastWaveTime = this.wave.time;
    const foamDecay = Math.exp(-elapsed / 2.2);
    for (let i = 0; i < this.positions.count; i += 1) {
      const x = this.positions.getX(i);
      const z = this.positions.getZ(i);
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
    this.updateLip(crestZ);
  }

  private updateLip(crestZ: number): void {
    const strengths: number[] = [];
    const bases: number[] = [];
    const crests: number[] = [];
    const localCrests: number[] = [];
    for (let i = 0; i <= this.lipSegments; i += 1) {
      const x = this.wave.xMin + i * this.wave.spacing;
      const localCrest = this.wave.crestZAt(x, crestZ);
      const probeZ = localCrest + Math.min(1.1, this.wave.packetWidth * 0.5);
      strengths.push(this.wave.breakingAt(x, probeZ, this.wave.slopeMagnitude(x, probeZ), crestZ));
      bases.push(this.wave.heightAt(x, localCrest));
      crests.push(this.wave.heightAt(x, localCrest + 0.25));
      localCrests.push(localCrest);
    }
    const smooth = (values: number[], i: number): number => {
      let sum = 0;
      let weightSum = 0;
      for (let offset = -2; offset <= 2; offset += 1) {
        const index = Math.max(0, Math.min(this.lipSegments, i + offset));
        const weight = 3 - Math.abs(offset);
        sum += values[index] * weight;
        weightSum += weight;
      }
      return sum / weightSum;
    };
    for (let i = 0; i <= this.lipSegments; i += 1) {
      const x = this.wave.xMin + i * this.wave.spacing;
      const strength = Math.min(0.8, smooth(strengths, i));
      const baseY = smooth(bases, i);
      const crestY = smooth(crests, i);
      const localCrest = localCrests[i];
      const row = i * this.lipRows;
      this.lipPositions.setXYZ(row, x, baseY + 0.02, localCrest);
      this.lipPositions.setXYZ(row + 1, x, crestY + strength * 0.42, localCrest + strength * 0.06);
      this.lipPositions.setXYZ(row + 2, x, crestY + strength * 0.67, localCrest + strength * 0.3);
      this.lipPositions.setXYZ(row + 3, x, crestY + strength * 0.54, localCrest + strength * 0.7);
      this.lipPositions.setXYZ(row + 4, x, crestY + strength * 0.1, localCrest + strength * 1.1);
      for (let layer = 0; layer < this.lipRows; layer += 1) {
        const alpha = strength * [0.38, 0.76, 1, 0.86, 0.42][layer];
        this.lipColors.setXYZW(row + layer, 1, 1, 1, alpha);
      }
    }
    this.lipPositions.needsUpdate = true;
    this.lipColors.needsUpdate = true;
    this.lipMesh.geometry.computeVertexNormals();
  }

  setWave(wave: InteractiveWaterField): void {
    this.wave = wave;
    this.foamMemory.fill(0);
    this.lastWaveTime = 0;
  }

  dispose(): void {
    this.geometry.dispose();
    this.mesh.material.dispose();
    this.lipMesh.geometry.dispose();
    this.lipMesh.material.dispose();
  }
}
