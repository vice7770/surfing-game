import { GRAVITY } from '../dispersion';

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

/**
 * The early course (`?tubeForm=early`; the water-physics advisor's ruling 17, Q4,
 * docs/research/pool-look-reference-2026-11-11/ruling-17.md): the share's course in √(h0/g), h0 the slice's foot depth.
 * On at −2.3 √(h0/g) and whole at −0.7 √(h0/g) before the throw (−1.62 s to −0.49 s at the reference pool's 4.88 m foot).
 * *Measured* (ruling 17): the case and the sea under it agree best 1 to 1.6 s before the throw (crest 0.17–0.21 m over
 * the sea's, height 1.03–1.07 of it, face 24–31° on 13–18°; in the last 0.25 s: 0.42 m, 1.15, 64°), and points join the
 * front at −1.64 s, so the hand-over is laid there. The times scale as the cases' own clock does (Froude: √(h0/g)).
 */
export const TUBE_FORM_EARLY = [-2.3, -0.7] as const;

/**
 * The seam blend's settings (`TubeFace.seam`): the τ course's start and end, s, and the band at `TUBE_SEAM.height`, m.
 * With `depth` (`TUBE_FORM_EARLY`) the course's ends are `depth` × √(h0/g) at each slice in place of `tau`.
 */
export interface TubeSeam {
  tau: readonly [number, number];
  band: number;
  depth?: readonly [number, number];
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

/**
 * α_τ at a slice of foot depth `footDepth` (m) under a seam's settings: by `seam.tau` (s), or with `seam.depth` by
 * `depth` × √(footDepth / g) (`TUBE_FORM_EARLY`). Without `depth` it is `seamTauWeight(tau, seam.tau[0], seam.tau[1])`.
 */
export function seamCourseWeight(tau: number, seam: TubeSeam, footDepth: number): number {
  if (!seam.depth) return seamTauWeight(tau, seam.tau[0], seam.tau[1]);
  const scale = Math.sqrt(Math.max(0, footDepth) / GRAVITY);
  return seamTauWeight(tau, seam.depth[0] * scale, seam.depth[1] * scale);
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
