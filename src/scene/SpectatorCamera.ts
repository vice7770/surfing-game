import { PerspectiveCamera, Vector3 } from 'three';

export type SpectatorView = 'overview' | 'profile' | 'below' | 'ride';

/** What the ride view follows: the board's position and heading (radians from +z toward +x). */
export interface FollowTarget {
  position: { x: number; y: number; z: number };
  heading: number;
}

export interface SpectatorScene {
  heightAt(x: number, z: number): number;
  bedAt(x: number, z: number): number;
}

/** Camera for the physical surf zone: cliff overview, water-line profile, underwater, or following the ride. */
export class SpectatorCamera {
  readonly camera = new PerspectiveCamera(52, 1, 0.1, 3000);
  private currentView: SpectatorView = 'overview';
  private readonly desired = new Vector3();
  private readonly target = new Vector3();
  private settled = false;

  get view(): SpectatorView {
    return this.currentView;
  }

  /** Change view and cut straight to it, so the camera never drifts through the surface. */
  setView(view: SpectatorView): void {
    this.currentView = view;
    this.settled = false;
  }

  update(scene: SpectatorScene, focus: { x: number; z: number }, dt: number, follow?: FollowTarget): void {
    if (this.currentView === 'ride' && follow) {
      // Behind and a little above the board, looking past the rider toward where it is heading.
      const forwardX = Math.sin(follow.heading);
      const forwardZ = Math.cos(follow.heading);
      const x = follow.position.x - forwardX * 6.5;
      const z = follow.position.z - forwardZ * 6.5;
      this.desired.set(x, Math.max(scene.heightAt(x, z) + 1.2, follow.position.y + 2.6), z);
      this.target.set(follow.position.x + forwardX * 4, follow.position.y + 0.6, follow.position.z + forwardZ * 4);
    } else if (this.currentView === 'overview' || this.currentView === 'ride') {
      this.desired.set(focus.x + 70, 16, focus.z + 95);
      this.target.set(focus.x, 0, focus.z - 40);
    } else if (this.currentView === 'profile') {
      const x = focus.x + 40;
      this.desired.set(x, scene.heightAt(x, focus.z) + 1.2, focus.z);
      this.target.set(focus.x, 0.6, focus.z);
    } else {
      const z = focus.z - 12;
      const bed = scene.bedAt(focus.x, z);
      const surface = scene.heightAt(focus.x, z);
      this.desired.set(focus.x, Math.max(bed + 0.4, Math.min(surface - 0.8, bed + 1.2)), z);
      this.target.set(focus.x, surface - 0.2, focus.z - 60);
    }
    this.camera.position.lerp(this.desired, this.settled ? 1 - Math.exp(-3 * dt) : 1);
    this.settled = true;
    this.camera.lookAt(this.target);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
