import { Vector3 } from 'three';
import type { InteractiveWaterField } from '../wave/WaveModel';

/** Independent post-wipeout body. The moving surface supplies buoyancy and drag. */
export class RiderFall {
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  readonly rotation = new Vector3();
  active = false;
  submersion = 0;

  start(boardPosition: Vector3, boardVelocity: Vector3, boardRoll: number): void {
    const side = Math.sign(boardRoll || 1);
    this.position.copy(boardPosition).add(new Vector3(side * 0.15, 0.95, 0));
    this.velocity.copy(boardVelocity).add(new Vector3(side * 1.2, 1.15, -0.35));
    this.rotation.set(0, 0, boardRoll);
    this.submersion = 0;
    this.active = true;
  }

  step(dt: number, wave: InteractiveWaterField): void {
    if (!this.active) return;
    const water = wave.sample(this.position.x, this.position.z);
    const radius = 0.3;
    this.submersion = Math.max(0, Math.min(1,
      (water.height - this.position.y + radius) / (2 * radius),
    ));
    const relative = this.velocity.clone().sub(water.velocity);
    const drag = this.submersion * 2.8 + 0.08;
    this.velocity.x -= relative.x * drag * dt;
    this.velocity.z -= relative.z * drag * dt;
    this.velocity.y += (-9.81 + this.submersion * 23 - relative.y * (this.submersion * 5 + 0.08)) * dt;
    this.position.addScaledVector(this.velocity, dt);
    const floor = wave.heightAt(this.position.x, this.position.z) - 0.42;
    if (this.position.y < floor) {
      this.position.y = floor;
      this.velocity.y = Math.max(0, this.velocity.y) * 0.25;
    }
    this.rotation.z += (Math.sign(this.velocity.x || 1) * 1.3 - this.rotation.z)
      * Math.min(1, dt * (this.submersion > 0 ? 1.2 : 2.5));
    this.rotation.x += (Math.PI * 0.42 - this.rotation.x) * Math.min(1, dt * 1.8);
  }

  reset(): void {
    this.active = false;
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.submersion = 0;
  }
}
