import type { SpotName } from '../../wave/Bathymetry';
import { loadBarrelLibrary } from '../../wave/barrel/barrelLibrary';
import type { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { BARREL_SLOPE, SweptLoft, type LoftResult } from '../../wave/barrel/sweptLoft';
import { sampleCubicSurface } from '../water/cubicSurface';
import type { WaterLook } from '../water/waterLook';
import { sampleSurfaceHeight, type WaterSurface } from '../WaterSurface';
import { rasterizeBarrelMask } from './barrelMask';
import { SweptBarrelMesh } from './SweptBarrelMesh';

/**
 * The swept barrel at a spot (the Padang Padang spec, Part B, PR 3). It loads the profile library once, and each frame,
 * after the water has uploaded its heights, lofts the snapshot's fronts over the water as it is drawn (the Rich look's
 * cubic surface, or the Classic's bilinear one), masks their footprint in the water and draws the mesh. At a spot
 * without the swept barrel it is off, and the water's program is exactly as before.
 */
export class SweptBarrel {
  readonly mesh: SweptBarrelMesh;
  /** Resolves once the library has loaded, after the first spot that turns the barrel on. */
  readonly ready: Promise<void>;
  lastLoft: LoftResult | undefined;
  private library?: ProfileLibrary;
  private loft?: SweptLoft;
  private slope?: number;
  private loading = false;
  private resolveReady!: () => void;
  private mask = new Uint8Array(0);
  private look?: WaterLook;

  constructor(private readonly water: WaterSurface, private readonly load: () => Promise<ProfileLibrary> = () => loadBarrelLibrary()) {
    this.mesh = new SweptBarrelMesh(water.materialUniforms);
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  /** On at a spot the barrel is drawn at (`BARREL_SLOPE`), off at any other or none. */
  setSpot(spot: SpotName | undefined): void {
    this.slope = spot === undefined ? undefined : BARREL_SLOPE[spot];
    const on = this.slope !== undefined;
    this.water.setBarrelEnabled(on);
    this.loft = on && this.library ? new SweptLoft(this.library, this.slope!) : undefined;
    if (!on) {
      this.lastLoft = undefined;
      this.mesh.update(undefined);
      return;
    }
    if (this.loading) return;
    this.loading = true;
    this.load().then((library) => {
      this.library = library;
      if (this.slope !== undefined) this.loft = new SweptLoft(library, this.slope);
      this.resolveReady();
    }, (error: unknown) => console.warn('The barrel library did not load; the swept barrel stays off.', error));
  }

  /** Loft `count` front records (`FRONT_STRIDE` each) over the water as drawn, mask them into it, and draw them. */
  draw(front: Float32Array, count: number, stillLevel: number): void {
    if (!this.loft) {
      this.water.setBarrelMask(null);
      this.mesh.update(undefined);
      this.lastLoft = undefined;
      return;
    }
    const { water } = this;
    const { grid, surfaceData } = water;
    const look = water.drawnLook;
    const heightAt = look === 'rich'
      ? (x: number, z: number) => sampleCubicSurface(surfaceData, grid, x, z).height
      : (x: number, z: number) => sampleSurfaceHeight(surfaceData, grid, x, z);
    const loft = this.loft.build(front, count, stillLevel, heightAt);
    if (this.mask.length !== grid.nx * grid.nz) this.mask = new Uint8Array(grid.nx * grid.nz);
    const set = rasterizeBarrelMask(loft, grid, this.mask);
    water.setBarrelMask(set > 0 ? this.mask : null);
    if (look !== this.look) {
      this.look = look;
      this.mesh.setLook(look);
    }
    this.mesh.update(loft);
    this.lastLoft = loft;
  }

  dispose(): void {
    this.mesh.mesh.geometry.dispose();
    this.mesh.mesh.material.dispose();
  }
}
