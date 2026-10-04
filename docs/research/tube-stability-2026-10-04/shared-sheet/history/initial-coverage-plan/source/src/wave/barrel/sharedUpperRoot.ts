import type { BoundedCMetadata } from './boundedCProfile';

export interface SharedUpperRoot {
  top: [40, 48];
  underside: [80, 88];
  /** ND piecewise-linear roof-envelope change; not material-index displacement. */
  maximumRoofEnvelopeChange: number;
  coalescedStations: number;
}

/** Height of the original forward polygon, explicitly completing a quantized vertical facet with its highest endpoint. */
function roofHeight(profile: Float32Array, x: number): number {
  let y = -Infinity;
  for (let i = 32; i < 60; i += 1) {
    const a = profile[2 * i], b = profile[2 * (i + 1)];
    if (b < a) throw new Error('shared upper-root backward roof domain');
    if (x < a || x > b) continue;
    const ay = profile[2 * i + 1], by = profile[2 * (i + 1) + 1];
    y = Math.max(y, a === b ? Math.max(ay, by) : ay + (by - ay) * ((x - a) / (b - a)));
  }
  if (!Number.isFinite(y)) throw new Error('shared upper-root missing roof crossing');
  return y;
}

/**
 * New sampling authority for the upper-root seam, not a change to v4's controls.
 * Unsupported actual domains fail explicitly. Only outer33..59 is resampled.
 */
export function pairUpperRoot(profile: Float32Array, meta: BoundedCMetadata): SharedUpperRoot | undefined {
  if (!meta.sheetExists) return undefined;
  const original = profile.slice();
  const left = original[176], right = original[160];
  const a = original[64], k = original[120];
  if (!(a <= left && left <= right && right <= k)) throw new Error('shared upper-root lacks complete outer roof domain');
  for (let i = 80; i < 88; i += 1) {
    if (original[2 * i] < original[2 * (i + 1)]) throw new Error('shared upper-root backward return domain');
  }
  const sample = (i: number, x: number) => {
    // Match the stored return X exactly before any later metric/world transform.
    profile[2 * i] = x;
    profile[2 * i + 1] = roofHeight(original, profile[2 * i]);
  };
  for (let i = 33; i < 40; i += 1) sample(i, a + (left - a) * ((i - 32) / 8));
  let coalescedStations = 0;
  for (let i = 40; i <= 48; i += 1) {
    const j = 128 - i;
    sample(i, original[2 * j]);
    if (profile[2 * i + 1] < original[2 * j + 1]) throw new Error('shared upper-root negative paired separation');
    if (i > 40 && profile[2 * i] === profile[2 * (i - 1)]) coalescedStations += 1;
  }
  for (let i = 49; i < 60; i += 1) sample(i, right + (k - right) * ((i - 48) / 12));
  let maximumRoofEnvelopeChange = 0;
  for (const p of [original, profile]) for (let i = 32; i <= 60; i += 1) {
    const x = p[2 * i];
    maximumRoofEnvelopeChange = Math.max(maximumRoofEnvelopeChange, Math.abs(roofHeight(original, x) - roofHeight(profile, x)));
  }
  return { top: [40, 48], underside: [80, 88], maximumRoofEnvelopeChange, coalescedStations };
}
