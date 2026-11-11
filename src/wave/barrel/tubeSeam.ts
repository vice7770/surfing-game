/**
 * Ruling 5's seam blend (the water-physics advisor's advisor-ruling-5.md §4, docs/research/tube-seam-2026-11-11;
 * `TubeFace.seam`, `?tubeSeam=blend`): one weight α = α_h · α_τ for the case's drawn loft, its collided surface and its
 * water's flow over the solver's, y = y_s + α (y_c − y_s) and u = u_s + α (u_c − u_s). Pure pieces, only + − × ÷.
 *
 * - `tau`, s: the course in formation, α_τ = S((τ − on) / (full − on)); 0 until 0.5 s before the throw, whole at it
 *   (*measured*, the ruling's r3, r7, r8; *sourced in kind*: the crest water reaches 0.85 of the crest's speed as the
 *   face goes vertical, Derakhti et al. 2020, which our profiles put at τ ≈ 0).
 * - `band`, m at a slice whose foot height is `height`: the height band, α_h = S(δ / b) with δ the case's height over the
 *   solver's surface, b = band × footHeight / height. The ruling gives 0.25 m at the "1.5 m" Barrel
 *   (1.05 m at the feed), whose slices' foot height is 0.85 m at the median (*measured*, probe proneSeam), so b is 0.29 of
 *   the foot height (*measured* in kind, the ruling's r5–r7: the nearest-surface blend's own length).
 * - `thrown`, s: after the throw the crest water's share of the crest's speed goes 0.85 → 1 over this long, C1
 *   (`seamB`; 0.85 and "shortly after" *sourced*, Derakhti et al. 2020; the 0.2 s *inferred*).
 */
export const TUBE_SEAM = { tau: [-0.5, 0], band: 0.25, height: 0.85, thrown: 0.2 } as const;

/** The seam blend's settings (`TubeFace.seam`): the τ course's start and end, s, and the band at `TUBE_SEAM.height`, m. */
export interface TubeSeam {
  tau: readonly [number, number];
  band: number;
}

/** Smoothstep: 0 at u ≤ 0, 1 at u ≥ 1, C1 between. */
export function smoothstep(u: number): number {
  if (!(u > 0)) return 0;
  if (u >= 1) return 1;
  return u * u * (3 - 2 * u);
}

/** α_τ: the case's share by its slice clock τ (s), 0 to `on`, 1 from `full`; a step at `on` where full ≤ on. */
export function seamTauWeight(tau: number, on: number, full: number): number {
  if (!(full > on)) return tau >= on ? 1 : 0;
  return smoothstep((tau - on) / (full - on));
}

/** α_h: the case's share by its height δ (m) over the solver's surface, 0 at δ ≤ 0, 1 from the band b (m). */
export function seamHeightWeight(delta: number, band: number): number {
  if (!(delta > 0)) return 0;
  if (!(band > 0)) return 1;
  return smoothstep(delta / band);
}

/** The band b (m) at a slice of foot height `footHeight` (m): `band` at `TUBE_SEAM.height`, in proportion elsewhere. */
export function seamBand(band: number, footHeight: number): number {
  return footHeight > 0 ? (band * footHeight) / TUBE_SEAM.height : band;
}

/**
 * The crest water's share B of the crest's speed (`WallWater.b`) under the blend: `before` to the throw (τ ≤ 0), then
 * to `thrown` over `TUBE_SEAM.thrown` seconds by a smoothstep: C1 at both ends, no step at τ = 0.
 */
export function seamB(tau: number, before: number, thrown: number): number {
  return before + (thrown - before) * smoothstep(tau / TUBE_SEAM.thrown);
}

/** `?seamTau=on,full` (seconds, on < full): the τ course's ends; undefined where it is not two such numbers. */
export function parseSeamTau(text: string | undefined): [number, number] | undefined {
  if (text === undefined) return undefined;
  const parts = text.split(',');
  if (parts.length !== 2 || parts[0].trim() === '' || parts[1].trim() === '') return undefined;
  const on = Number(parts[0]);
  const full = Number(parts[1]);
  return Number.isFinite(on) && Number.isFinite(full) && on < full ? [on, full] : undefined;
}

/** `?seamBand=m` (0 < m ≤ 2): the height band at `TUBE_SEAM.height`; undefined otherwise. */
export function parseSeamBand(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined;
  const band = Number(text);
  return Number.isFinite(band) && band > 0 && band <= 2 ? band : undefined;
}
