import type { InteractiveWaterField } from '../wave/WaveModel';
import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** The legacy field's node heights plus its decaying crest-foam memory. */
export class LegacySurfaceSource implements SurfaceSource {
  readonly grid: SurfaceGrid;
  private readonly foamMemory: Float32Array;
  private lastWaveTime = 0;
  private lastZMin: number;

  constructor(private readonly wave: InteractiveWaterField) {
    this.grid = { xMin: wave.xMin, zMin: wave.zMin, spacing: wave.spacing, nx: wave.nx, nz: wave.nz };
    this.foamMemory = new Float32Array(wave.nx * wave.nz);
    this.lastZMin = wave.zMin;
  }

  get waveHeight(): number {
    return this.wave.settings.height;
  }

  get time(): number {
    return this.wave.time;
  }

  write(data: Float32Array): void {
    const wave = this.wave;
    if (wave.zMin !== this.lastZMin) {
      const cells = Math.round((wave.zMin - this.lastZMin) / wave.spacing) * wave.nx;
      this.foamMemory.copyWithin(0, cells);
      this.foamMemory.fill(0, this.foamMemory.length - cells);
      this.lastZMin = wave.zMin;
    }
    const crestZ = wave.crestZ();
    const elapsed = Math.max(0, wave.time - this.lastWaveTime);
    this.lastWaveTime = wave.time;
    const foamDecay = Math.exp(-elapsed / 2.2);
    wave.copyHeights(data, 2, 0);
    for (let iz = 0; iz < wave.nz; iz += 1) {
      const z = wave.zMin + iz * wave.spacing;
      for (let ix = 0; ix < wave.nx; ix += 1) {
        const i = iz * wave.nx + ix;
        const x = wave.xMin + ix * wave.spacing;
        const slope = wave.slopeMagnitude(x, z);
        const crestDistance = (z - wave.crestZAt(x, crestZ)) / 1.15;
        const narrowFoam = Math.exp(-0.5 * crestDistance * crestDistance);
        const activeFoam = Math.max(
          Math.max(0, Math.min(0.12, (slope - 0.12) * 0.5)),
          wave.breakingAt(x, z, slope, crestZ) * narrowFoam * 0.88,
        );
        this.foamMemory[i] = Math.max(activeFoam, this.foamMemory[i] * foamDecay);
        data[i * 2 + 1] = Math.max(activeFoam, this.foamMemory[i] * 0.65);
      }
    }
    this.grid.zMin = wave.zMin;
  }
}
