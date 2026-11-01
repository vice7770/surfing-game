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
 * The foam a drawn curl carries on its lifted water (T3; the water-physics advisor's rulings, 2026-11-01, amending the
 * owner's option (a); docs/research/pool-barrel-drawing-2026-11-01):
 * - `cap`: before touchdown the lip's sheet carries at most this much foam, eased in by its weight as a sheet from the
 *   crest and the throat. Lips are laminar until touchdown (Mostert et al. 2022): they carry only the foam their crest
 *   had, stretched into streaks that read near 0.10 against fresh foam's 0.41 (Koepke 1984, the knowledge base's foam
 *   notes), so the lip stays translucent and backlit (the bright edge): its sheet light and glow keep at least 70 %;
 * - `flash`, s: after touchdown the tip turns white within this (the flash the owner approved), and the white sweeps back
 *   up the lip to the crest, and down its underside to the throat, over the tube's collapse √(2W/g) [inferred];
 * - `edge`: the sweep's soft edge, as a share of the run from the tip [inferred].
 */
export const LIP_FOAM = { cap: 0.3, flash: 0.15, edge: 0.15 } as const;

const ramp = (value: number) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

/**
 * The foam on one lifted profile point of a drawn slice, 0–1 (T3, `LIP_FOAM`): its crest's foam (`outer`) on the lip's
 * outer surface from the crest to the tip, its face's (`face`) on the underside from the tip to the throat, both thinned
 * by the surface's stretch since the throw (`stretch`, L(0)/L(τ) ≤ 1) and capped as a sheet (`sheetWeight`) until
 * touchdown; the face's own on the back wall (throat to toe), neither thinned nor capped; behind the crest its crest's.
 * From touchdown (`after` s, the collapse `collapse` s) the white of the landing sweeps over the lip and its underside
 * from the tip. `point` is the profile's index (`LANDMARK`).
 */
export function lipFoamAt(
  point: number, outer: number, face: number, stretch: number, sheetWeight: number, after: number, collapse: number,
): number {
  if (point < LANDMARK.crest) return outer;
  if (point > LANDMARK.throat) return face;
  const onLip = point <= LANDMARK.lip;
  const carried = (onLip ? outer : face) * stretch;
  if (!(after > 0)) return carried + sheetWeight * (Math.min(carried, LIP_FOAM.cap) - carried);
  // The run from the tip: 0 at the tip, 1 at the crest (the outer surface) or the throat (the underside).
  const run = onLip ? (LANDMARK.lip - point) / (LANDMARK.lip - LANDMARK.crest) : (point - LANDMARK.lip) / (LANDMARK.throat - LANDMARK.lip);
  const reach = collapse > 0 ? after / collapse : 1;
  const white = ramp(after / LIP_FOAM.flash) * (1 - ramp((run - reach) / LIP_FOAM.edge));
  return Math.max(carried, white);
}

/**
 * Each drawn slice's share of the solver's foam kept on its lifted water (`BROKEN_CREST`), drawing only; and the foam
 * its lip carries (T3, `lipFoamAt`): the share times the foam its crest (`outer`) and its face (`face`) held when the slice
 * was first drawn, or less if it holds less now (latched: the solver's onset whitewater, which leads the lip by up to 2 s,
 * is not a laminar lip's; the advisor, 2026-11-01). Clean crests carry none.
 *
 * Before its touchdown a slice reads its crest and face now; after it, it keeps the last reading its place along its
 * front had, by front and metre of crest x (the front's points sit a column apart, so a slice's x stays put while its σ
 * may shift). A slice first seen past its touchdown (a front renumbered, or the page joining late) reads them now.
 * Places no slice drew this time are forgotten, their latches with them.
 */
export class BrokenCrests {
  /** Per slice, the share kept; as many as the loft has slices. */
  weights = new Float32Array(0);
  /** Per slice, the foam its lip's outer surface carries (its crest's), and its underside and back wall (its face's). */
  outer = new Float32Array(0);
  face = new Float32Array(0);
  private held = new Map<number, Map<number, Reading>>();
  private next = new Map<number, Map<number, Reading>>();

  update(loft: LoftResult, foamAt: (x: number, z: number) => number): Float32Array {
    const { sliceCount } = loft;
    if (this.weights.length < sliceCount) {
      const size = Math.max(sliceCount, 2 * this.weights.length);
      this.weights = new Float32Array(size);
      this.outer = new Float32Array(size);
      this.face = new Float32Array(size);
    }
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
      const was = this.held.get(front)?.get(place);
      const after = loft.slicePhase[s] === AFTER_TOUCHDOWN && was !== undefined;
      const crestFoam = foamAt(x, z);
      const faceFoam = foamAt(faceX, faceZ);
      const weight = after ? was.weight : brokenWeight(Math.min(crestFoam, faceFoam));
      const latchedCrest = was?.crest ?? crestFoam;
      const latchedFace = was?.faceFoam ?? faceFoam;
      const outer = after ? was.outer : weight * Math.min(latchedCrest, crestFoam);
      const faceCarried = after ? was.face : weight * Math.min(latchedFace, faceFoam);
      this.weights[s] = weight;
      this.outer[s] = outer;
      this.face[s] = faceCarried;
      let places = next.get(front);
      if (!places) next.set(front, (places = new Map()));
      // Two slices sharing a metre: it holds the whiter, and the first latch.
      const shared = places.get(place);
      places.set(place, shared ? {
        weight: Math.max(shared.weight, weight), outer: Math.max(shared.outer, outer), face: Math.max(shared.face, faceCarried),
        crest: shared.crest, faceFoam: shared.faceFoam,
      } : { weight, outer, face: faceCarried, crest: latchedCrest, faceFoam: latchedFace });
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

/** A place's reading: the share kept and the lip's foam (held after touchdown), and the foam latched when first drawn. */
interface Reading {
  weight: number;
  outer: number;
  face: number;
  crest: number;
  faceFoam: number;
}
