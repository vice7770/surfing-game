/**
 * C2 step 5b: the bore's own foam (docs/research/wave-strategy-alternatives/c2-step5b.md; the water-physics consult
 * `docs/research/water-physics/lip-thickness-and-foam-2026-11-13.md` §3, the two materials step 5a did not use).
 *
 * Behind the open curl the water has already landed, and above the water line it is **60–99 % air** [Dierssen 2019,
 * after Melville 1996 and Blenkinsopp & Chaplin]: over 70 % air it is a closely packed scattering medium, not a liquid,
 * so it is drawn as **opaque** diffuse white and not as translucent water. Its white then ages: Koepke 1984's dense
 * foam reflects 0.55 fresh, 0.41 averaged over the first second and 0.16 by ten seconds. **Those are used as ratios**
 * (1 → 0.745 → 0.291), not as absolutes, because the sea's own foam colour sets the absolute and an absolute here would
 * put a seam exactly where the library's bore meets the sea's own whitewater (step 5a, ruling 37; the absolute is
 * ruling 25e's job). The ratio is the foam cover the render nodes carry, which is what the water's own look multiplies
 * its foam colour by, so the library's fresh white and the sea's densest foam are the same white.
 *
 * On the pile's flanks and in the roller the stuff is **aerated but not foam**: void fraction 0.13–0.4, drawn as milky
 * turquoise, which the water's look already makes from the void fraction and the plume's depth (the white carried up
 * through about 2 m of water, so red goes first) [consult §3; Pope & Fry 1997 for the attenuation].
 *
 * **Nothing here builds a layer.** The cover, the void fraction and the plume's depth are three numbers on the render
 * node the sea already draws: no geometry is added or moved, so the "no white layer over 2 cm" rule holds by
 * construction, as it did in step 5a.
 *
 * Arithmetic: only + − × ÷ (and min/max), as the rest of the library, so every client writes the same nodes.
 */

/** Koepke's ageing as ratios of the first instant, at 0, 1, 2 … 10 s (`whiteAge`'s curve on a table: no powers here). */
export const WHITE_AGE = [1, 0.7455, 0.6715, 0.6051, 0.5450, 0.4909, 0.4421, 0.3983, 0.3587, 0.3231, 0.2909] as const;

export const BORE_FOAM = {
  /**
   * The broken stretch along the lane, from the slice's own profile: the pile runs from its crest landmark to its toe,
   * white over all of it; `back` m behind the crest and `ahead` m past the toe the cover tapers out, and those two
   * bands are the aerated flanks [reasoned: the consult gives the materials, not their width].
   */
  back: 0.5,
  ahead: 1.5,
  /** The void fraction of the aerated water: fresh at the landing, old once the white has aged out (the consult's band). */
  air: [0.13, 0.4],
  /** How deep the white is seen through, m (the consult's "about 2 m of water"; the look caps it at the water's depth). */
  plume: 2,
} as const;

const ramp = (value: number) => {
  const t = value <= 0 ? 0 : value >= 1 ? 1 : value;
  return t * t * (3 - 2 * t);
};

/** How bright the landing's white is `age` s after a slice's own touchdown, against its first instant (`WHITE_AGE`). */
export function boreWhite(age: number): number {
  if (!(age > 0)) return 1;
  const last = WHITE_AGE.length - 1;
  if (age >= last) return WHITE_AGE[last];
  const k = Math.floor(age);
  return WHITE_AGE[k] + (age - k) * (WHITE_AGE[k + 1] - WHITE_AGE[k]);
}

/**
 * The void fraction of a slice's aerated water at `age` s past its touchdown: the consult's band, fresh at the landing
 * and old by the time the white has aged ten seconds (the air rises out as the foam dulls, on the same clock).
 */
export function boreAir(age: number): number {
  const [old, fresh] = BORE_FOAM.air;
  const last = WHITE_AGE[WHITE_AGE.length - 1];
  const u = (boreWhite(age) - last) / (1 - last);
  return old + (fresh - old) * (u <= 0 ? 0 : u >= 1 ? 1 : u);
}

/**
 * How much of the broken stretch covers the station `s` m along the lane, 0–1: 1 from the pile's back (its crest) to
 * its front (its toe), tapering out over `BORE_FOAM.back` behind and `BORE_FOAM.ahead` ahead. `from` and `to` are the
 * crest's and the toe's places along the lane, either way round.
 */
export function boreShape(s: number, from: number, to: number): number {
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  return ramp((s - (a - BORE_FOAM.back)) / BORE_FOAM.back) * (1 - ramp((s - b) / BORE_FOAM.ahead));
}
