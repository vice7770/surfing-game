import { PADANG } from '../src/wave/Bathymetry';

/** Reshape Padang Padang for a report run (its shape is read when a spot is built): `--padang angle=40,platformDepth=9`. */
export function applyPadangShape(spec: string | undefined): void {
  if (!spec) return;
  for (const pair of spec.split(',')) {
    const [key, value] = pair.split('=');
    if (!(key in PADANG)) throw new Error(`No Padang Padang parameter ${key}`);
    (PADANG as Record<string, number>)[key] = Number(value);
  }
}
