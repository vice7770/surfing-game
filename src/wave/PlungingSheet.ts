import { Vector3 } from 'three';
import type { InteractiveWaterField } from './WaveModel';

export interface SheetImpact {
  impulse: Vector3;
  normal: Vector3;
  penetration: number;
}

/**
 * A bounded 3D sheet of ballistic water parcels born from the height-field
 * break. It owns the same parcel positions used for rendering and collision.
 * This models the plunging lip only; the height field still owns bulk water.
 */
export class PlungingSheet {
  readonly columns = 97;
  readonly layers = 8;
  readonly particleRadius = 0.32;
  readonly reachZ = 0.95;
  readonly dropY = 0.13;
  private readonly positions = new Float32Array(this.columns * this.layers * 3);
  private readonly velocities = new Float32Array(this.columns * this.layers * 3);
  private readonly strengths = new Float32Array(this.columns * this.layers);
  private readonly ages = new Float32Array(this.columns * this.layers);
  private readonly active = new Uint8Array(this.columns * this.layers);
  private spawnClock = 0;
  private head = -1;

  constructor(private readonly wave: InteractiveWaterField) {}

  step(dt: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    for (let i = 0; i < this.active.length; i += 1) {
      if (!this.active[i]) continue;
      const base = i * 3;
      this.velocities[base + 1] -= 9.81 * dt;
      this.positions[base] += this.velocities[base] * dt;
      this.positions[base + 1] += this.velocities[base + 1] * dt;
      this.positions[base + 2] += this.velocities[base + 2] * dt;
      this.ages[i] += dt;
      if (this.ages[i] > 1.1 || (this.ages[i] > 0.09
        && this.positions[base + 1] <= this.wave.heightAt(this.positions[base], this.positions[base + 2]) + 0.02)) {
        this.active[i] = 0;
      }
    }
    this.spawnClock += dt;
    while (this.spawnClock >= 0.09) {
      this.spawnClock -= 0.09;
      this.spawnLayer();
    }
  }

  /** Contact a sphere against the closest parcel's forward plunging span. */
  resolveSphere(center: Vector3, radius: number, bodyVelocity: Vector3): SheetImpact | undefined {
    if (!(radius > 0)) return undefined;
    let closest = -1;
    let closestDistanceSquared = Infinity;
    const reach = radius + this.particleRadius;
    for (let i = 0; i < this.active.length; i += 1) {
      if (!this.active[i]) continue;
      const base = i * 3;
      const dx = center.x - this.positions[base];
      const initialY = center.y - this.positions[base + 1];
      const initialZ = center.z - this.positions[base + 2];
      const progress = Math.max(0, Math.min(1,
        (initialZ * this.reachZ - initialY * this.dropY)
        / (this.reachZ * this.reachZ + this.dropY * this.dropY)));
      const dy = initialY + progress * this.dropY;
      const dz = initialZ - progress * this.reachZ;
      if (Math.abs(dx) > reach || Math.abs(dy) > reach || Math.abs(dz) > reach) continue;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared < closestDistanceSquared && distanceSquared < reach * reach) {
        closest = i;
        closestDistanceSquared = distanceSquared;
      }
    }
    if (closest < 0) return undefined;
    const base = closest * 3;
    const initialY = center.y - this.positions[base + 1];
    const initialZ = center.z - this.positions[base + 2];
    const progress = Math.max(0, Math.min(1,
      (initialZ * this.reachZ - initialY * this.dropY)
      / (this.reachZ * this.reachZ + this.dropY * this.dropY)));
    const normal = new Vector3(
      center.x - this.positions[base],
      initialY + progress * this.dropY,
      initialZ - progress * this.reachZ,
    );
    const distance = normal.length();
    if (distance > 1e-6) normal.multiplyScalar(1 / distance);
    else normal.set(0, 1, 0);
    const penetration = reach - distance;
    const closingSpeed = Math.max(0,
      (this.velocities[base] - bodyVelocity.x) * normal.x
      + (this.velocities[base + 1] - bodyVelocity.y) * normal.y
      + (this.velocities[base + 2] - bodyVelocity.z) * normal.z,
    );
    const strength = this.strengths[closest];
    const impulse = normal.clone().multiplyScalar(Math.min(42, (closingSpeed * 0.7 + penetration * 9) * 4 * strength));
    // The parcel receives the opposite impulse; this is a small packet model,
    // not a calibrated sheet mass or a full fluid pressure solve.
    this.velocities[base] -= impulse.x / 4;
    this.velocities[base + 1] -= impulse.y / 4;
    this.velocities[base + 2] -= impulse.z / 4;
    return { impulse, normal, penetration };
  }

  /** Logical rows run from newest to oldest, independent of ring-buffer layout. */
  forEachActive(visit: (index: number, x: number, y: number, z: number, strength: number) => void): void {
    if (this.head < 0) return;
    for (let row = 0; row < this.layers; row += 1) {
      const storedRow = (this.head - row + this.layers) % this.layers;
      for (let column = 0; column < this.columns; column += 1) {
        const source = storedRow * this.columns + column;
        if (!this.active[source]) continue;
        const base = source * 3;
        visit(row * this.columns + column,
          this.positions[base], this.positions[base + 1], this.positions[base + 2], this.strengths[source]);
      }
    }
  }

  reset(): void {
    this.positions.fill(0);
    this.velocities.fill(0);
    this.strengths.fill(0);
    this.ages.fill(0);
    this.active.fill(0);
    this.spawnClock = 0;
    this.head = -1;
  }

  private spawnLayer(): void {
    this.head = (this.head + 1) % this.layers;
    const offset = this.head * this.columns;
    this.active.fill(0, offset, offset + this.columns);
    const centerCrest = this.wave.crestZ();
    for (let column = 0; column < this.columns; column += 1) {
      const x = this.wave.xMin + column * this.wave.spacing;
      const crestZ = this.wave.crestZAt(x, centerCrest);
      if (crestZ < this.wave.zMin + 2 || crestZ > this.wave.zMin + (this.wave.nz - 3) * this.wave.spacing) continue;
      // The falling tip forms ahead of the dissipative peel front. Giving it
      // time to travel forward makes contact with a rider crossing the crest
      // possible, while the source still follows the field's local slope.
      const probeZ = crestZ + 0.35;
      const strength = this.wave.breakingAt(x - 1.8, probeZ,
        this.wave.slopeMagnitude(x, probeZ), centerCrest);
      if (strength < 0.13) continue;
      const sample = this.wave.sample(x, crestZ);
      const index = offset + column;
      const base = index * 3;
      this.positions[base] = x;
      this.positions[base + 1] = sample.height + 0.12;
      this.positions[base + 2] = crestZ + 0.05;
      this.velocities[base] = sample.velocity.x * 0.2;
      this.velocities[base + 1] = 1.8 + strength * 0.7;
      this.velocities[base + 2] = Math.max(0.4, sample.velocity.z) + this.wave.settings.speed * 0.5 + strength * 0.9;
      this.strengths[index] = strength;
      this.ages[index] = 0;
      this.active[index] = 1;
    }
  }
}
