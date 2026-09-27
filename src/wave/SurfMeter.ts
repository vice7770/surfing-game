/** A wave measured as it starts to break (the wave-sizes spec): when, where, and its face (crest to the trough ahead), m. */
export interface BreakingWave {
  time: number;
  x: number;
  z: number;
  face: number;
}

/** The surf over a window, as forecasts give it: the typical face (H1/3), the sets (H1/10), m, and how many waves they come from. */
export interface SurfReading {
  typical: number;
  sets: number;
  waves: number;
}

/** Forecasts read the surf over the last 2 minutes, s. */
export const SURF_WINDOW = 120;
/** Fewer waves than this still read as measuring. */
export const MIN_SURF_WAVES = 3;
/** The take-off's band: columns this far either side of it along shore, m. */
export const TAKE_OFF_BAND = 10;

/** Mean of the highest `fraction` of the values, at least one: H1/3 with 1/3, H1/10 with 1/10. */
export function highestMean(values: readonly number[], fraction: number): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => b - a);
  const count = Math.max(1, Math.ceil(sorted.length * fraction));
  let sum = 0;
  for (let i = 0; i < count; i += 1) sum += sorted[i];
  return sum / count;
}

/**
 * Measures the waves breaking in along-shore bands. The onsets in a band
 * within half a period of a wave's first onset are that wave; its face is the
 * largest of theirs, and it is placed where that face was.
 */
export class SurfMeter {
  private readonly bands: { xMin: number; xMax: number; waves: BreakingWave[] }[];

  constructor(bands: readonly { xMin: number; xMax: number }[], private readonly period: number, private readonly keep = SURF_WINDOW) {
    this.bands = bands.map(({ xMin, xMax }) => ({ xMin, xMax, waves: [] }));
  }

  add(wave: BreakingWave): void {
    const band = this.bands.find(({ xMin, xMax }) => wave.x >= xMin && wave.x <= xMax);
    if (!band) return;
    const last = band.waves.at(-1);
    if (last && wave.time - last.time < 0.5 * this.period) {
      if (wave.face > last.face) Object.assign(last, { x: wave.x, z: wave.z, face: wave.face });
      return;
    }
    band.waves.push({ ...wave });
    while (band.waves.length && band.waves[0].time < wave.time - this.keep) band.waves.shift();
  }

  /** Every band's waves that started breaking at or after `since`. */
  waves(since = -Infinity): BreakingWave[] {
    return this.bands.flatMap((band) => band.waves.filter((wave) => wave.time >= since));
  }

  /** The surf over the last `window` seconds, or undefined while fewer than MIN_SURF_WAVES have broken. */
  reading(now: number, window = SURF_WINDOW): SurfReading | undefined {
    const faces = this.waves(now - window).map((wave) => wave.face);
    if (faces.length < MIN_SURF_WAVES) return undefined;
    return { typical: highestMean(faces, 1 / 3), sets: highestMean(faces, 1 / 10), waves: faces.length };
  }
}
