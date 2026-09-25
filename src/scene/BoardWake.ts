import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  Points,
  PointsMaterial,
} from 'three';
import type { BoardPhysics } from '../physics/BoardPhysics';
import type { InteractiveWaterField } from '../wave/WaveModel';

interface WakeMark { x: number; z: number; heading: number; age: number }
interface SprayParticle { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number }

/** Visual traces of the physical board path; all heights come from the shared field. */
export class BoardWake {
  readonly trail: LineSegments;
  readonly spray: Points;
  private readonly marks: WakeMark[] = [];
  private readonly particles: SprayParticle[] = [];
  private readonly trailPositions: BufferAttribute;
  private readonly trailColors: BufferAttribute;
  private readonly sprayPositions: BufferAttribute;
  private markClock = 0;
  private particleIndex = 0;
  private readonly maxMarks = 26;
  private readonly maxParticles = 96;

  constructor() {
    const trailGeometry = new BufferGeometry();
    this.trailPositions = new BufferAttribute(new Float32Array((this.maxMarks - 1) * 4 * 3), 3);
    this.trailColors = new BufferAttribute(new Float32Array((this.maxMarks - 1) * 4 * 3), 3);
    trailGeometry.setAttribute('position', this.trailPositions);
    trailGeometry.setAttribute('color', this.trailColors);
    trailGeometry.setDrawRange(0, 0);
    this.trail = new LineSegments(trailGeometry, new LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false,
    }));
    this.trail.frustumCulled = false;

    const sprayGeometry = new BufferGeometry();
    this.sprayPositions = new BufferAttribute(new Float32Array(this.maxParticles * 3), 3);
    sprayGeometry.setAttribute('position', this.sprayPositions);
    sprayGeometry.setDrawRange(0, 0);
    this.spray = new Points(sprayGeometry, new PointsMaterial({
      color: '#f6fff4', size: 0.075, transparent: true, opacity: 0.82,
      depthWrite: false, sizeAttenuation: true,
    }));
    this.spray.frustumCulled = false;
  }

  update(board: BoardPhysics, wave: InteractiveWaterField, dt: number): void {
    const riding = board.state === 'catching' || board.state === 'riding';
    const speed = board.velocity.length();
    for (const mark of this.marks) mark.age += dt;
    while (this.marks.length && this.marks[0].age > 2.1) this.marks.shift();
    this.markClock += dt;
    if (riding && speed > 0.3 && this.markClock > 0.055) {
      this.markClock = 0;
      this.marks.push({ x: board.position.x, z: board.position.z - 0.8, heading: board.rotation.y, age: 0 });
      if (this.marks.length > this.maxMarks) this.marks.shift();
    }
    this.updateTrail(wave);

    const turnStrength = riding ? Math.min(1, Math.abs(board.diagnostics().lateralSpeed) * 1.3
      + Math.abs(board.rotation.z) * 0.25) : 0;
    if (turnStrength > 0.12 && speed > 0.55) this.emitSpray(board, wave, turnStrength);
    for (const particle of this.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vy -= 5.5 * dt;
    }
    while (this.particles.length && this.particles[0].age > 0.75) this.particles.shift();
    this.updateSprayGeometry();
  }

  reset(): void {
    this.marks.length = 0;
    this.particles.length = 0;
    this.markClock = 0;
    this.particleIndex = 0;
    this.trail.geometry.setDrawRange(0, 0);
    this.spray.geometry.setDrawRange(0, 0);
  }

  private updateTrail(wave: InteractiveWaterField): void {
    let vertex = 0;
    for (let i = 1; i < this.marks.length; i += 1) {
      const a = this.marks[i - 1];
      const b = this.marks[i];
      for (const rail of [-1, 1]) {
        for (const mark of [a, b]) {
          const x = mark.x + Math.cos(mark.heading) * rail * 0.24;
          const z = mark.z - Math.sin(mark.heading) * rail * 0.24;
          this.trailPositions.setXYZ(vertex, x, wave.heightAt(x, z) + 0.025, z);
          const fade = Math.max(0.1, 1 - mark.age / 2.1);
          this.trailColors.setXYZ(vertex, fade, fade, fade * 0.94);
          vertex += 1;
        }
      }
    }
    this.trail.geometry.setDrawRange(0, vertex);
    this.trailPositions.needsUpdate = true;
    this.trailColors.needsUpdate = true;
  }

  private emitSpray(board: BoardPhysics, wave: InteractiveWaterField, strength: number): void {
    const side = Math.sign(board.diagnostics().lateralSpeed) || Math.sign(board.rotation.z) || 1;
    const heading = board.rotation.y;
    for (let i = 0; i < 2; i += 1) {
      const n = this.particleIndex++;
      const spread = Math.sin(n * 2.39996);
      const x = board.position.x + Math.cos(heading) * side * 0.25;
      const z = board.position.z - 0.85 - Math.sin(heading) * side * 0.25;
      this.particles.push({
        x, y: wave.heightAt(x, z) + 0.08, z,
        vx: Math.cos(heading) * side * (0.45 + strength * 1.5) + spread * 0.35,
        vy: 0.7 + strength * 1.6 + (spread + 1) * 0.3,
        vz: -Math.sin(heading) * side * (0.45 + strength * 1.5) - board.velocity.z * 0.15,
        age: 0,
      });
    }
    while (this.particles.length > this.maxParticles) this.particles.shift();
  }

  private updateSprayGeometry(): void {
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      this.sprayPositions.setXYZ(i, p.x, p.y, p.z);
    }
    this.spray.geometry.setDrawRange(0, this.particles.length);
    this.sprayPositions.needsUpdate = true;
  }
}
