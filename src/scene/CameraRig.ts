import { PerspectiveCamera, Vector3 } from 'three';
import type { BoardPhysics } from '../physics/BoardPhysics';

export class CameraRig {
  readonly camera = new PerspectiveCamera(48, 1, 0.1, 180);
  profile = false;
  private readonly desired = new Vector3();
  private readonly lookTarget = new Vector3();

  update(board: BoardPhysics, dt: number): void {
    if (this.profile) {
      this.desired.set(board.position.x + 16, board.position.y + 3, board.position.z + 2);
      this.lookTarget.set(board.position.x, board.position.y + 0.6, board.position.z - 4);
    } else {
      this.desired.set(board.position.x + 8, board.position.y + 4.1, board.position.z + 7);
      this.lookTarget.set(board.position.x, board.position.y + 0.45, board.position.z - 6);
    }
    this.camera.position.lerp(this.desired, 1 - Math.exp(-2.6 * dt));
    this.camera.lookAt(this.lookTarget);
  }
}
