import { LibraryLoft } from '../../wave/library/libraryLoft';
import type { LoftResult } from '../../wave/barrel/sweptLoft';
import { rasterizeBarrelMask } from '../barrel/barrelMask';
import { BarrelWater } from '../barrel/barrelWater';
import { SweptBarrelMesh } from '../barrel/SweptBarrelMesh';
import { sampleCubicHeight } from '../water/cubicSurface';
import type { WaterLook } from '../water/waterLook';
import { sampleSurfaceHeight, type WaterSurface } from '../WaterSurface';

/**
 * C2 step 3 (`?wave=library`; docs/research/wave-strategy-alternatives/c2-step3.md): the library wave's overturn on the
 * page. Its single-valued part is already in the water's own heights (the worker wrote it into the render nodes); here
 * the snapshot's curves (`ZoneSurface.curves`) are lofted over the water as drawn (`LibraryLoft`, the same build the
 * worker's contact makes over the same nodes), masked out of the water where the loft lifts off it, and drawn by the
 * swept barrel's own mesh and look.
 */
export class LibraryZone {
  readonly mesh: SweptBarrelMesh;
  lastLoft: LoftResult | undefined;
  private readonly loft = new LibraryLoft(undefined, true);
  private mask = new Uint8Array(0);
  private look?: WaterLook;
  private readonly cameraWater = new BarrelWater('fast');
  private revision = 0;
  /** The last build's cost on the page, ms (loft, mask and mesh). */
  lastMs = 0;

  constructor(private readonly water: WaterSurface) {
    this.mesh = new SweptBarrelMesh(water.materialUniforms);
  }

  /** Loft the snapshot's curves over the water as drawn this frame (none: nothing drawn, nothing masked). */
  draw(curves: Float32Array, count: number): void {
    const start = performance.now();
    const { water } = this;
    if (count === 0) {
      this.mesh.update(undefined);
      water.setBarrelMask(null);
      this.cameraWater.prepare(undefined, undefined);
      this.lastLoft = undefined;
      this.lastMs = performance.now() - start;
      return;
    }
    const { grid, surfaceData } = water;
    const look = water.drawnLook;
    const heightAt = look === 'rich' ? (x: number, z: number) => sampleCubicHeight(surfaceData, grid, x, z) : (x: number, z: number) => sampleSurfaceHeight(surfaceData, grid, x, z);
    const loft = this.loft.build(curves, count, heightAt);
    const maskGrid = water.barrelMaskGrid;
    if (this.mask.length !== maskGrid.nx * maskGrid.nz) this.mask = new Uint8Array(maskGrid.nx * maskGrid.nz);
    const set = rasterizeBarrelMask(loft, maskGrid, this.mask);
    water.setBarrelMask(set > 0 ? this.mask : null);
    if (look !== this.look) {
      this.look = look;
      this.mesh.setLook(look);
    }
    this.mesh.update(loft);
    this.lastLoft = loft;
    this.cameraWater.prepare(loft, ++this.revision);
    this.lastMs = performance.now() - start;
  }

  /** Water or air in the drawn overturn; undefined where the ordinary water answers. */
  waterAt(x: number, y: number, z: number, margin = 0): boolean | undefined {
    return this.cameraWater.query(x, y, z, margin);
  }

  dispose(): void {
    this.mesh.mesh.geometry.dispose();
    this.mesh.mesh.material.dispose();
  }
}
