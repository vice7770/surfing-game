import { Vector3 } from 'three';
import { FlyCamera, type FlyBounds, type FlyControl } from '../../scene/FlyCamera';
import type { SpectatorCamera, SpectatorView } from '../../scene/SpectatorCamera';
import { sampleSurfaceFoam } from '../../scene/WaterSurface';
import type { SurfWords } from '../../ui/surfHeight';
import type { Units } from '../../ui/units';
import type { SurfZoneStatus } from '../../wave/SurfZoneRunner';
import type { SurfZoneInit } from '../SurfZoneHost';
import { CrestTracker, type SurfaceField } from './crestTracker';
import type { JumpPoint } from './FlyInput';
import { LabClock } from './labClock';
import { measureFace, waterUnderView } from './viewProbe';
import { waveInfo, type WaveInfo } from './waveInfo';

/** What the lab needs of the running sea (`PhysicalMode` is one). */
export interface LabSea {
  readonly host?: {
    readonly init: SurfZoneInit;
    readonly snapshot: { readonly surface: Float32Array; readonly status: SurfZoneStatus };
    heightAt(x: number, z: number): number;
    bedAt(x: number, z: number): number;
  };
  readonly camera: SpectatorCamera;
  readonly focus: { x: number; z: number };
  idleView: SpectatorView;
  readonly config?: { readonly peakPeriod: number };
  readonly practice: boolean;
}

/** How far past the simulated window the camera may fly, m: to the sides, and up the beach (the overview stands there). */
const SIDE_MARGIN = 80;
const BEACH_MARGIN = 100;
const CEILING = 120;
const JUMP_VIEWS: Record<Exclude<JumpPoint, 4>, SpectatorView> = { 1: 'overview', 2: 'profile', 3: 'below' };

/**
 * The Wave Lab's camera and time (spec L1): a free-flying camera that can follow
 * a breaking crest or jump to the preset views, the lab's clock, and the info
 * card's reading of the wave under the view. No rider, nothing to play.
 */
export class WaveLab {
  readonly clock = new LabClock();
  readonly fly = new FlyCamera();
  following = false;
  /** The lab is the scene now (the game's frame hands it the camera and the clock). */
  active = false;
  private readonly tracker = new CrestTracker();
  private cinematic = false;
  private readonly direction = new Vector3();
  private readonly target = new Vector3();

  /** A new sea: fly from the overview, the sea running at full speed. */
  begin(sea: LabSea): void {
    sea.idleView = 'free';
    this.clock.paused = false;
    this.clock.scale = 1;
    this.following = false;
    this.jump(sea, 1);
  }

  end(sea: LabSea): void {
    this.following = false;
    this.cinematic = false;
    this.clock.paused = false;
    this.clock.scale = 1;
    sea.idleView = 'overview';
  }

  /** Cut to a jump point and fly on from there; the cinematic sweep plays until the player moves. */
  jump(sea: LabSea, point: JumpPoint): void {
    this.following = false;
    const { host } = sea;
    if (!host) return;
    if (point === 4) {
      sea.camera.setView('cinematic');
      this.cinematic = true;
      return;
    }
    this.cinematic = false;
    sea.camera.setView(JUMP_VIEWS[point]);
    sea.camera.update(host, sea.focus, 0);
    this.takePose(sea);
  }

  /** One frame: fly (or keep sweeping), follow the crest, and return the sea's seconds for this frame. */
  frame(sea: LabSea, elapsed: number, control: FlyControl): number {
    const sim = this.clock.advance(elapsed);
    const { host } = sea;
    if (!host) return sim;
    if (this.cinematic) {
      const moving = control.strafe !== 0 || control.forward !== 0 || control.rise !== 0 || control.yaw !== 0 || control.pitch !== 0;
      if (!moving) return sim;
      this.cinematic = false;
      this.takePose(sea);
    }
    this.fly.update(elapsed, control, this.bounds(host));
    if (this.following) {
      const moved = this.tracker.update(this.field(host), sim);
      this.fly.translate(moved.dx, moved.dy, moved.dz);
    }
    this.fly.applyTo(sea.camera.camera);
    return sim;
  }

  /** F: follow the crest under the view, or let it go. Returns whether it now follows. */
  toggleFollow(sea: LabSea): boolean {
    const { host } = sea;
    if (this.following || !host) {
      this.following = false;
      return false;
    }
    if (this.cinematic) {
      this.cinematic = false;
      this.takePose(sea);
    }
    const point = this.underView(sea);
    this.following = this.tracker.start(this.field(host), point.x, point.z);
    return this.following;
  }

  /** The info card for the wave under the view. */
  info(sea: LabSea, units: Units, words?: Omit<SurfWords, 'units'>): WaveInfo | undefined {
    const { host, config } = sea;
    if (!host || !config) return undefined;
    const point = this.underView(sea);
    const { status } = host.snapshot;
    return waveInfo({
      face: measureFace((x, z) => host.heightAt(x, z), point.x, point.z),
      period: config.peakPeriod,
      breaker: status.breaker.type,
      peel: status.peel,
      breakingFraction: status.breakingFraction,
      timeToSet: status.timeToSet,
      steady: sea.practice,
      surf: status.surf,
    }, units, words);
  }

  private underView(sea: LabSea): { x: number; z: number } {
    const { camera } = sea.camera;
    const host = sea.host!;
    camera.updateMatrixWorld();
    return waterUnderView(camera.position, camera.getWorldDirection(this.direction), (x, z) => host.heightAt(x, z));
  }

  /** Fly on from where the spectator camera stands now. */
  private takePose(sea: LabSea): void {
    const { camera } = sea.camera;
    camera.updateMatrixWorld();
    this.fly.lookAt(camera.position, this.target.copy(camera.position).add(camera.getWorldDirection(this.direction)));
    sea.camera.setView('free');
  }

  private bounds(host: NonNullable<LabSea['host']>): FlyBounds {
    const { grid, windowXMin } = host.init;
    return {
      xMin: windowXMin - SIDE_MARGIN,
      xMax: windowXMin + (grid.nx - 1) * grid.spacing + SIDE_MARGIN,
      // The render grid spans the whole tank, which grows with the swell (the wave-sizes spec).
      zMin: grid.zMin,
      zMax: grid.zMin + (grid.nz - 1) * grid.spacing + BEACH_MARGIN,
      yMax: CEILING,
      floor: (x, z) => host.bedAt(x, z),
    };
  }

  private field(host: NonNullable<LabSea['host']>): SurfaceField {
    return {
      height: (x, z) => host.heightAt(x, z),
      foam: (x, z) => sampleSurfaceFoam(host.snapshot.surface, host.init.grid, x, z),
    };
  }
}
