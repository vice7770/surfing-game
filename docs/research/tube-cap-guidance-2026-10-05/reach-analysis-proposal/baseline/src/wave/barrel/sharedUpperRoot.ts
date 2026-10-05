import type { BoundedCMetadata } from './boundedCProfile';

export interface SharedSheet {
  top: [38, 58];
  underside: [68, 88];
  /** ND piecewise-linear roof-envelope change; not material-index displacement. */
  maximumRoofEnvelopeChange: number;
  coalescedStations: number;
}

/** Height of the original forward polygon, explicitly completing a quantized vertical facet with its highest endpoint. */
export function roofHeight(profile: Float32Array, x: number): number {
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

/** Exact vertical graph difference on the overlapping domain, at the union of both polygons' breakpoints. */
export function roofEnvelopeDifference(a: Float32Array, b: Float32Array): number {
  const left = Math.max(a[64], b[64]), right = Math.min(a[120], b[120]);
  if (left > right) throw new Error('roof envelope lacks common domain');
  let maximum = 0;
  const xs = [left, right];
  for (const p of [a, b]) for (let i = 32; i <= 60; i += 1) if (p[2 * i] >= left && p[2 * i] <= right) xs.push(p[2 * i]);
  for (const x of xs) maximum = Math.max(maximum, Math.abs(roofHeight(a, x) - roofHeight(b, x)));
  return maximum;
}

/**
 * New sampling authority for the complete inner-sheet seam, not a change to v4's controls.
 * Unsupported actual domains fail explicitly. Only outer33..59 is resampled, in both resolved and collapsed states so the precision gate cannot switch sampling authorities.
 */
export function pairInnerSheet(profile: Float32Array, _meta: BoundedCMetadata): SharedSheet {
  const original = profile.slice();
  const left = original[176], right = original[136];
  const a = original[64], k = original[120];
  if (!(a <= left && left <= right && right <= k)) throw new Error('shared upper-root lacks complete outer roof domain');
  for (let i = 68; i < 88; i += 1) {
    if (original[2 * i] < original[2 * (i + 1)]) throw new Error('shared upper-root backward return domain');
  }
  const sample = (i: number, x: number) => {
    // Match the stored return X exactly before any later metric/world transform.
    profile[2 * i] = x;
    profile[2 * i + 1] = roofHeight(original, profile[2 * i]);
  };
  for (let i = 33; i < 38; i += 1) sample(i, a + (left - a) * ((i - 32) / 6));
  let coalescedStations = 0;
  for (let i = 38; i <= 58; i += 1) {
    const j = 126 - i;
    sample(i, original[2 * j]);
    if (profile[2 * i + 1] < original[2 * j + 1]) throw new Error('shared upper-root negative paired separation');
    if (i > 38 && profile[2 * i] === profile[2 * (i - 1)]) coalescedStations += 1;
  }
  sample(59, right + (k - right) / 2);
  const maximumRoofEnvelopeChange = roofEnvelopeDifference(original, profile);
  return { top: [38, 58], underside: [68, 88], maximumRoofEnvelopeChange, coalescedStations };
}
