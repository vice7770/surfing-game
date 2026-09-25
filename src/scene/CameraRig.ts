import { PerspectiveCamera, Vector3 } from 'three';
import type { BoardPhysics } from '../physics/BoardPhysics';
import type { InteractiveWaterField } from '../wave/WaveModel';

export class CameraRig {
  readonly camera = new PerspectiveCamera(48, 1, 0.1, 180);
  profile = false;
  underwater = false;
  private readonly desired = new Vector3();
  private readonly lookTarget = new Vector3();

  update(board: BoardPhysics, wave: InteractiveWaterField, dt: number): void {
    if (this.underwater) {
      const x = board.position.x + 2.6;
      const z = board.position.z + 2.9;
      this.desired.set(x, Math.min(board.position.y - 0.8, wave.heightAt(x, z) - 0.45), z);
      this.lookTarget.set(board.position.x, board.position.y - 0.35, board.position.z - 0.5);
    } else if (this.profile) {
      this.desired.set(board.position.x + 9, board.position.y + 2.7, board.position.z + 2.5);
      this.lookTarget.set(board.position.x, board.position.y + 0.6, board.position.z);
    } else if (this.camera.aspect < 0.8) {
      this.desired.set(board.position.x + 0.6, board.position.y + 4.3, board.position.z + 9);
      this.lookTarget.set(board.position.x, board.position.y + 0.45, board.position.z - 2);
    } else {
      this.desired.set(board.position.x + 2.2, board.position.y + 3.6, board.position.z + 6);
      this.lookTarget.set(board.position.x, board.position.y + 0.55, board.position.z - 2.5);
    }
    this.camera.position.lerp(this.desired, 1 - Math.exp(-2.6 * dt));
    this.camera.lookAt(this.lookTarget);
  }
}
