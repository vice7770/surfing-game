import { BufferAttribute, BufferGeometry, CanvasTexture, Points, PointsMaterial } from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';

/** Bounded, deterministic spray born from the shared breaking crest. */
export class BreakSpray {
  readonly points: Points<BufferGeometry, PointsMaterial>;
  private readonly count = 160;
  private readonly positions: BufferAttribute;
  private readonly texture: CanvasTexture;

  constructor() {
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(this.count * 3), 3);
    geometry.setAttribute('position', this.positions);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is required for spray particles');
    const glow = context.createRadialGradient(16, 16, 1, 16, 16, 16);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.45, 'rgba(255,255,255,0.8)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 32, 32);
    this.texture = new CanvasTexture(canvas);
    this.points = new Points(geometry, new PointsMaterial({
      color: '#f4fff2', map: this.texture, size: 0.16, transparent: true, opacity: 0.6,
      depthWrite: false, sizeAttenuation: true, alphaTest: 0.02,
    }));
    this.points.frustumCulled = false;
  }

  update(wave: InteractiveWaterField): void {
    const front = wave.breakingFrontX;
    for (let i = 0; i < this.count; i += 1) {
      const age = ((wave.time * 0.72 + i * 0.61803398875) % 1) * 1.5;
      const x = front - 0.7 - (i % 16) * 0.3;
      const crestZ = wave.crestZAt(x);
      const strength = wave.breakingAt(x, crestZ + 0.35);
      if (strength < 0.12 || x < wave.xMin + 1 || x > wave.xMin + (wave.nx - 1) * wave.spacing - 1) {
        this.positions.setXYZ(i, 0, -100, 0);
        continue;
      }
      const jitter = Math.sin(i * 12.9898) * 0.23;
      const launch = 0.45 + (i % 7) * 0.07;
      this.positions.setXYZ(
        i,
        x + jitter - age * (0.18 + (i % 3) * 0.06),
        wave.heightAt(x, crestZ) + 0.15 + strength * 0.22 + age * launch - age * age * 0.45,
        crestZ + age * (0.35 + (i % 5) * 0.07),
      );
    }
    this.positions.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.texture.dispose();
  }
}
