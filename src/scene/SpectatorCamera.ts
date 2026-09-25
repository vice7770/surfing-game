import { PerspectiveCamera, Vector3 } from 'three';

export type SpectatorView = 'overview' | 'profile' | 'below';

export interface SpectatorScene {
  heightAt(x: number, z: number): number;
  bedAt(x: number, z: number): number;
}

/** View-only camera for the physical surf zone: cliff overview, water-line profile, or underwater. */
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

  update(scene: SpectatorScene, focus: { x: number; z: number }, dt: number): void {
    if (this.currentView === 'overview') {
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
