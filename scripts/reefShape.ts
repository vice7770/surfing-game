import { REEF } from '../src/wave/Bathymetry';

/** Reshape the Reef for a report run (its shape is read when a spot is built): `--reef angle=50,crestZ=-125`. */
export function applyReefShape(spec: string | undefined): void {
  if (!spec) return;
  for (const pair of spec.split(',')) {
    const [key, value] = pair.split('=');
    if (!(key in REEF)) throw new Error(`No reef parameter ${key}`);
    (REEF as Record<string, number>)[key] = Number(value);
  }
}
