import type { SpotName } from '../../wave/Bathymetry';
import { barrelCasesFor, loadBarrelLibrary } from '../../wave/barrel/barrelLibrary';
import type { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { BARREL_SLOPE, SweptLoft, type LoftResult } from '../../wave/barrel/sweptLoft';
import { SWEPT_BARREL } from '../../wave/SurfZoneSimulation';
import { sampleCubicSurface } from '../water/cubicSurface';
import type { WaterLook } from '../water/waterLook';
import { sampleSurfaceHeight, type WaterSurface } from '../WaterSurface';
import { rasterizeBarrelMask } from './barrelMask';
import { SweptBarrelMesh, type SweptBarrelView } from './SweptBarrelMesh';

/**
 * The swept barrel at a spot (the Padang Padang spec, Part B, PR 3). It loads a spot's profile library once (its own
 * transect's cases, PR 7), and each frame, after the water has uploaded its heights, lofts the snapshot's fronts over the
 * water as it is drawn (the Rich look's cubic surface, or the Classic's bilinear one), masks their footprint in the
 * water and draws the mesh. At a spot without the swept barrel it is off, and the water's program is exactly as before.
 */
export class SweptBarrel {
  readonly mesh: SweptBarrelMesh;
  /** Resolves once a library has loaded, after the first spot that turns the barrel on. */
  readonly ready: Promise<void>;
  lastLoft: LoftResult | undefined;
  private readonly libraries = new Map<SpotName, ProfileLibrary>();
  private readonly loading = new Set<SpotName>();
  private loft?: SweptLoft;
  private spot?: SpotName;
  private resolveReady!: () => void;
  private mask = new Uint8Array(0);
  private look?: WaterLook;

  /** `view`: a dev view of the curl in place of its shading (`SweptBarrelView`). */
  constructor(
    private readonly water: WaterSurface,
    private readonly load: (spot: SpotName) => Promise<ProfileLibrary> = (spot) => loadBarrelLibrary(barrelCasesFor(spot)),
    view?: SweptBarrelView,
  ) {
    this.mesh = new SweptBarrelMesh(water.materialUniforms, view);
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  /**
   * On at a swept spot with a barrel transect (`BARREL_SLOPE`), off at any other or none. `swept` is the spot's switch:
   * SWEPT_BARREL's say unless the caller (the surf zone's config) says otherwise.
   */
  setSpot(spot: SpotName | undefined, swept = spot !== undefined && SWEPT_BARREL.includes(spot)): void {
    const on = spot !== undefined && swept && BARREL_SLOPE[spot] !== undefined;
    this.spot = on ? spot : undefined;
    this.water.setBarrelEnabled(on);
    const library = on ? this.libraries.get(spot) : undefined;
    this.loft = on && library ? new SweptLoft(library, BARREL_SLOPE[spot]!) : undefined;
    if (!on) {
      this.lastLoft = undefined;
      this.mesh.update(undefined);
      return;
    }
    if (library || this.loading.has(spot)) return;
    this.loading.add(spot);
    // As before PR 7, a spot whose library failed to load stays off (it stays in `loading`).
    this.load(spot).then((loaded) => {
      this.libraries.set(spot, loaded);
      this.loading.delete(spot);
      if (this.spot === spot) this.loft = new SweptLoft(loaded, BARREL_SLOPE[spot]!);
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
