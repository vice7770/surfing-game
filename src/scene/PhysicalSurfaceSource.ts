import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** What the render source needs from a physical surf zone (a `SurfZoneSimulation`). */
export interface RenderableSurfZone {
  readonly windowXMin: number;
  readonly seaTime: number;
  readonly config: { readonly significantHeight: number };
  renderGrid(spacing: number): SurfaceGrid;
  writeUniformSurface(data: Float32Array, grid: SurfaceGrid): void;
}

/** Whitewater fades over this many seconds once the break has passed (a game constant; see Callaghan et al. 2024). */
const FOAM_DECAY = 3;

/**
 * The physical surf zone resampled onto a uniform render grid that follows the
 * sliding window, with a per-node whitewater memory so foam lingers and fades
 * after a bore passes (G4 later replaces this with foam carried by the flow).
 */
export class PhysicalSurfaceSource implements SurfaceSource {
  readonly grid: SurfaceGrid;
  private memory: Float32Array;
  private lastTime = Number.NaN;
  private lastXMin = Number.NaN;

  constructor(private readonly simulation: RenderableSurfZone, spacing = 1) {
    this.grid = simulation.renderGrid(spacing);
    this.memory = new Float32Array(this.grid.nx * this.grid.nz);
  }

  get waveHeight(): number {
    return this.simulation.config.significantHeight;
  }

  get time(): number {
    return this.simulation.seaTime;
  }

  write(data: Float32Array): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformSurface(data, this.grid);
    const nodes = this.grid.nx * this.grid.nz;
    if (this.memory.length !== nodes || this.grid.xMin !== this.lastXMin) {
      this.memory = new Float32Array(nodes);
      this.lastXMin = this.grid.xMin;
    }
    const time = this.simulation.seaTime;
    const elapsed = Number.isNaN(this.lastTime) ? 0 : Math.max(0, time - this.lastTime);
    this.lastTime = time;
    const decay = Math.exp(-elapsed / FOAM_DECAY);
    for (let k = 0; k < nodes; k += 1) {
      const active = data[k * 2 + 1];
      this.memory[k] = Math.max(active, this.memory[k] * decay);
      data[k * 2 + 1] = Math.max(active, 0.85 * this.memory[k]);
    }
  }
}
