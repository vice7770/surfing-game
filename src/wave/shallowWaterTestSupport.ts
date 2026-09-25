import { GRAVITY } from './dispersion';
import type { WaterTarget } from './ShallowWaterSolver';

/** Linear long wave η = a cos(k·x − ωt) with shallow-water flux q = c η along its direction. */
export function longWaveTarget(amplitude: number, period: number, depth: number, angle = 0) {
  const omega = (2 * Math.PI) / period;
  const c = Math.sqrt(GRAVITY * depth);
  const kx = (omega / c) * Math.sin(angle);
  const kz = (omega / c) * Math.cos(angle);
  return (x: number, z: number, t: number, out: WaterTarget): void => {
    const eta = amplitude * Math.cos(kx * x + kz * z - omega * t);
    out.eta = eta;
    out.qx = c * eta * Math.sin(angle);
    out.qz = c * eta * Math.cos(angle);
  };
}

export function calmTarget(_x: number, _z: number, _t: number, out: WaterTarget): void {
  out.eta = 0;
  out.qx = 0;
  out.qz = 0;
}

/** Linearly interpolated times of zero up-crossings. */
export function upCrossings(times: number[], values: number[]): number[] {
  const crossings: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] < 0 && values[i] >= 0) {
      crossings.push(times[i - 1] + ((times[i] - times[i - 1]) * -values[i - 1]) / (values[i] - values[i - 1]));
    }
  }
  return crossings;
}

/** Mean delay from each leading crossing to the next lagging crossing (the lag must be under one period). */
export function meanLag(leading: number[], lagging: number[]): number {
  let total = 0;
  let count = 0;
  for (const time of leading) {
    const next = lagging.find((value) => value > time);
    if (next === undefined) continue;
    total += next - time;
    count += 1;
  }
  return total / count;
}
