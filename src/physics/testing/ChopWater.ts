import { SwellWater } from '../SwellWater';
import { createWaterSample, type SurfWater, type WaterSample } from '../SurfWater';

/**
 * A short-crested wind chop for body tests (the paddle-balance fix, 2026-10-22): six linear wave trains
 * (`SwellWater`, 6 m deep), each 0.12–0.24 m × `scale` high with a 2.2–4.2 s period, running within ±108° of +z,
 * from seeded random phases, summed. At scale 1 the sea is about 0.65–0.8 m significant height, its surface sloped
 * 3–5° at the median and 8–12° at the 99th percentile (a choppy sea of short waves); at 1.6, 1.0–1.25 m and up to
 * 23°, steeper than linear waves stand without breaking. Each train's flow is read at its depth under the summed
 * surface. It takes no reactions. Test-only.
 */
export class ChopWater implements SurfWater {
  private readonly trains: SwellWater[] = [];
  private readonly scratch = createWaterSample();

  constructor(scale = 1, seed = 1) {
    let state = seed * 7919;
    const random = () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
    for (let i = 0; i < 6; i += 1) {
      const period = 2.2 + 2 * random();
      const height = scale * (0.12 + 0.12 * random());
      const direction = (random() - 0.5) * Math.PI * 1.2;
      const train = new SwellWater({ height, period, direction, depth: 6 });
      train.time = random() * 10;
      this.trains.push(train);
    }
  }

  advance(dt: number): void {
    for (const train of this.trains) train.advance(dt);
  }

  surfaceAt(x: number, z: number): number {
    let surface = 0;
    for (const train of this.trains) surface += train.surfaceAt(x, z);
    return surface;
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const surface = this.surfaceAt(x, z);
    let slopeX = 0;
    let slopeZ = 0;
    let flowX = 0;
    let flowY = 0;
    let flowZ = 0;
    for (const train of this.trains) {
      const own = train.surfaceAt(x, z);
      const sample = train.sampleAt(x, Math.min(y, surface) - surface + own, z, this.scratch);
      slopeX += sample.slopeX;
      slopeZ += sample.slopeZ;
      flowX += sample.flowX;
      flowY += sample.flowY;
      flowZ += sample.flowZ;
    }
    this.trains[0].sampleAt(x, y, z, out);
    const norm = Math.hypot(slopeX, 1, slopeZ);
    Object.assign(out, {
      surfaceY: surface, slopeX, slopeZ, normalX: -slopeX / norm, normalY: 1 / norm, normalZ: -slopeZ / norm, flowX, flowY, flowZ,
    });
    return out;
  }

  addReaction(): void {}
}
