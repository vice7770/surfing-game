import { CANYON } from '../src/wave/Bathymetry';

/** Reshape the Canyon for a report's run: `--canyon edgeSlope=0.08,angle=60` (the canyon spilling prototype's sweep). */
export function applyCanyonShape(spec: string | undefined): void {
  for (const pair of spec?.split(',') ?? []) {
    const [key, value] = pair.split('=');
    if (!(key in CANYON)) throw new Error(`--canyon: no such parameter ${key}`);
    (CANYON as Record<string, number>)[key] = Number(value);
  }
}
