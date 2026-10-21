import { LANDMARK } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, type LoftResult } from '../../wave/barrel/sweptLoft';

/**
 * Where a drawn curl keeps the solver's foam (the owner's option (a), 2026-10-22; docs/research/open-decisions-2026-10-22/):
 * on a crest that was already white before its barrel's front started. A spilling or broken crest's curl stays white,
 * so a short run on a close-out no longer stands as a clean block in the whitewater; a clean crest's curl takes no foam,
 * as before.
 *
 * The signal is the solver's foam on the slice's crest and on its face, where a broken crest's whitewater spills: the
 * lesser of the two, read on the water under the crest landmark and halfway from it to the toe's. Lace riding on a
 * clean face's crest is not a broken crest, nor is old foam on the face below a clean crest. From a front point's join
 * to its touchdown the crash withholds the solver's breaking over the drawn curl from the foam (`SweptCrash`, the gate),
 * so before its touchdown the foam under a slice is old: the solver's own onset whitewater, which leads the lip by up to
 * 2 s and fades as the curl opens (on Padang Padang's Big the crest and face read 0.83–0.91 in the half second before the
 * throw, 0.26–0.28 half a second after), or whitewater made before the front started, which lasts. The reading is
 * taken as the slice is now, so the curl shows the foam its water holds, and held through the collapse, when the
 * crash's own foam arrives (`BrokenCrests`).
 * White is the solver's whitewater, not the lace a crest rides through: from `clean` (no foam kept) to `white` (all of
 * it), smoothstep. Padang Padang's Big's lace reads about 0.5 (docs/research/open-decisions-2026-10-22/) [provisional].
 */
export const BROKEN_CREST = { clean: 0.55, white: 0.8 } as const;

/** How much of the solver's foam a crest reading this much keeps on its curl, 0–1 (`BROKEN_CREST`). */
export function brokenWeight(foam: number): number {
  const t = Math.min(1, Math.max(0, (foam - BROKEN_CREST.clean) / (BROKEN_CREST.white - BROKEN_CREST.clean)));
  return t * t * (3 - 2 * t);
}

/** The loft's post-touchdown phase (`LoftResult.slicePhase`). */
const AFTER_TOUCHDOWN = 2;

/**
 * Each drawn slice's share of the solver's foam kept on its lifted water (`BROKEN_CREST`), drawing only.
 *
 * Before its touchdown a slice reads its crest and face now; after it, it keeps the last reading its place along its
 * front had, by front and metre of crest x (the front's points sit a column apart, so a slice's x stays put while its σ
 * may shift). A slice first seen past its touchdown (a front renumbered, or the page joining late) reads them now.
 * Places no slice drew this time are forgotten.
 */
export class BrokenCrests {
  /** Per slice, the share kept; as many as the loft has slices. */
  weights = new Float32Array(0);
  private held = new Map<number, Map<number, number>>();
  private next = new Map<number, Map<number, number>>();

  update(loft: LoftResult, foamAt: (x: number, z: number) => number): Float32Array {
    const { sliceCount } = loft;
    if (this.weights.length < sliceCount) this.weights = new Float32Array(Math.max(sliceCount, 2 * this.weights.length));
    const next = this.next;
    for (const places of next.values()) places.clear();
    for (let s = 0; s < sliceCount; s += 1) {
      const profile = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples);
      const x = loft.positions[profile + 3 * LANDMARK.crest];
      const z = loft.positions[profile + 3 * LANDMARK.crest + 2];
      const faceX = 0.5 * (x + loft.positions[profile + 3 * LANDMARK.toe]);
      const faceZ = 0.5 * (z + loft.positions[profile + 3 * LANDMARK.toe + 2]);
      const front = loft.sliceFront[s];
      const place = Math.round(x);
      const had = loft.slicePhase[s] === AFTER_TOUCHDOWN ? this.held.get(front)?.get(place) : undefined;
      const weight = had ?? brokenWeight(Math.min(foamAt(x, z), foamAt(faceX, faceZ)));
      this.weights[s] = weight;
      let places = next.get(front);
      if (!places) next.set(front, (places = new Map()));
      // Two slices sharing a metre: it holds the whiter.
      places.set(place, Math.max(places.get(place) ?? 0, weight));
    }
    for (const [front, places] of next) if (places.size === 0) next.delete(front);
    this.next = this.held;
    this.held = next;
    return this.weights;
  }

  /** Forget every held reading (a new spot, or the sea restarted). */
  clear(): void {
    this.held.clear();
    this.next.clear();
  }
}
