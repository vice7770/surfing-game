import { LANDMARK } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, type LoftResult } from '../../wave/barrel/sweptLoft';

/**
 * Where a drawn curl keeps the solver's foam (the owner's option (a), 2026-10-22; docs/research/open-decisions-2026-10-22/):
 * on a crest that was already white before its barrel's front started. A spilling or broken crest's curl stays white,
 * so a short run on a close-out no longer stands as a clean block in the whitewater; a clean crest's curl takes no foam,
 * as before.
 *
 * The signal is the solver's foam on the slice's crest (its crest landmark, on the water). From a front point's join to
 * its touchdown the crash withholds the solver's breaking over the drawn curl from the foam (`SweptCrash`, the gate), so
 * while a slice is before its touchdown the foam on its crest is the foam made before its front started, drifting and
 * fading, or the whitewater lying where the crest runs in. Its whitest reading then is held through the slice's
 * collapse, when the crash's own foam arrives (`BrokenCrests`).
 * White is the solver's whitewater, not the lace a crest rides through: from `clean` (no foam kept) to `white` (all of
 * it), smoothstep. On Padang Padang's Big the lace behind and around the crests reads about 0.5 and its drawn crests'
 * median about 0.35; a close-out's broken crests read 0.7–0.8 with as much on the face ahead [provisional].
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
 * Its place along its front, by front and metre of crest x (the front's points sit a column apart, so a slice's x stays
 * put while its σ may shift), keeps its whitest reading: before its touchdown a slice reads its crest's foam now, and
 * never keeps less than its place had, so a curl on a broken crest stays white as the old foam under it fades; after its
 * touchdown it keeps what its place had. A slice first seen past its touchdown (a front renumbered, or the page joining
 * late) reads its crest now. Places no slice drew this time are forgotten.
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
      const v = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
      const x = loft.positions[v];
      const z = loft.positions[v + 2];
      const front = loft.sliceFront[s];
      const place = Math.round(x);
      const had = this.held.get(front)?.get(place);
      const weight = loft.slicePhase[s] === AFTER_TOUCHDOWN && had !== undefined
        ? had
        : Math.max(had ?? 0, brokenWeight(foamAt(x, z)));
      this.weights[s] = weight;
      let places = next.get(front);
      if (!places) next.set(front, (places = new Map()));
      // Two slices share a metre: it keeps the whiter.
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
