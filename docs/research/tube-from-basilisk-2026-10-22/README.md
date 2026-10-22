# The tube from our own Basilisk runs (2026-10-22)

**The owner (2026-10-22):** "Fix the tube drawing first: start Padang's tube fix now and draw tubes from our own simulations, not the thin hand-made shape. Then wire the Canyon's tubes in the same pass. The Canyon keeps today's curl and tumbling white until then."

Branch `claude/tube-from-basilisk` (step 1, Padang); the Canyon's wiring is step 2, stacked on it (`claude/canyon-tube-wiring`). The diagnosis is the advisor's T1 and T2 in `docs/superpowers/plans/2026-10-22-padang-foam-and-tube-todo.md`; T3–T5 and F1–F5 are left for the owner.

## Step 1: what changed

### T1: the tube is each case's own frames

- **The library.** Since bc0b489f (2026-10-05) every shipped case drew through the authored `bounded-C`, which takes only the crest, toe and their tangents from a case. The game now draws and collides each case's own frames, blended and scaled by Froude as before (`libraryFromBytes`, `TubeShape` `'basilisk'`).
  - The drawing and the contact both hold each case at its last clear frame (`hold: 'contact'`, e92b73e1): nothing past the jet touching the face is drawn, and the 2026-10-04 late-evolution fin (−1.37 m between neighbours) stays fixed.
  - The crash keeps the raw path it had before 10-05: its held overturn reads the same clear frames.
  - The bounded-C stays for A/Bs only: `?tubeShape=c` (`SurfZoneConfig.tubeShape`) draws and feels it in page and worker alike, and online rooms always run the default. On a held water sheet, `waterSheetTubeShape('bounded-C' | 'basilisk')` swaps the drawn shape without touching the sea.
- **Small loops closed (the advisor's rule).** The level-12 cases resolve the lip with 2–4 cells, and their 128-point resampling left cm-wide folds at the tip (points 59–74) or the throat (86–88) in a few open frames (padang19s 4, pad19-a20 2). Where segment i–i+1 crosses segment j–j+1 with j − i ≤ 10, the points between move to the crossing, keeping every index (`removeLoops`). It runs once on the frames at load, and on blended profiles from the tip to the throat (two loop-free frames can still blend into a fold). Crossed profiles in 6,085 Padang queries (foot 0.5–4 m, before the throw to the collapse): 52 before, 0 after.
- **Nothing is scaled or enlarged** (the advisor's ruling). The level-12 void runs under Pick & Feddersen's fit, which the advisor now calls a check, not the target: the Canyon's level-13 runs, with 9–13 cells across the lip, still sit at 0.03–0.17 H² against fits of 0.24–0.27. The area is judged after the owner's level-13 reruns (T4), padang19s and a20 first. The mouth is not enlarged either: from A0 0.3 up the raw tube already has Mead & Black's Padang proportions.
- **The dev tube guide** (`approachNear`, the `tube` autopilot) was C-only; it now finds the cases' own mature mouths.

### T2: the shards

- **Ends.** A front's ends, and the ends that cuts leave (`sealRuns`), blend into the water over **1 m**, not 2.5 m: the loft, the contact and the crash curve alike (`LOFT.endBlend`). This is the only distance blend, where a run meets water that isn't on its front. The leading end needs no taper of its own: each slice draws its own clock's frame, the steepening face before the throw and the lip growing after it. Close-outs throw and land together along their length, so a 5.7 m section draws 3.7 m of full curl and two 1 m ends. No minimum run length.
- **The narrowed clock link** (ruled 2026-10-03, built now): an end is a candidate only within the 3-row reach in z per column between the ends, 3 m beside it and 6 m across an empty column. Since the 3-row rule already links neighbours within 3 m, the link now only bridges one-column holes stepping under 6 m. `CLOCK_SLOPE` 0.166 s/m, `CLOCK_REACH` 10 m and the 1 s/m split are unchanged, and so is the 2 T order fix.
  - Tests: a 3.5 m neighbour step stays two fronts; a hole stepping 5.9 m links and 6.1 m doesn't; the nearer end wins when it is listed second; with the switch on, a 1.01 s/m pair stays split.
  - Switched on at Padang only if the front-gap probe's bars pass: see "The front-gap probe" below.

## The probe: before and after

The advisor's probe (`advisor-probe/`, and `src/wave/barrel/tubeShape.test.ts` now pins it): Padang's cases at a 7 m foot, foot crest 0.9–3.1 m, at 0.5, 0.8 and 0.95 of touchdown, as the drawing holds them.

| | Bounded-C (main) | Basilisk (this branch) | Target |
|---|---|---|---|
| Lip thickness, median | 0.014–0.021 H (3–7 cm) | 0.11–0.22 H (0.3–0.65 m) | 0.1–0.2 H |
| Lip tip | 0.009–0.014 H | 0.03–0.16 H; late in flight median 0.10 H | about 0.07 H (0.03–0.16 accepted at level 12) |
| Void (points 64–112) | 0.48–0.69 H² | 0.09–0.23 H² | after T4; Pick & Feddersen 0.25–0.38 is a check |
| Void L/W, tilt (A0 0.3–0.45, clear frame) | — | 2.0–2.1, 43–44° | Mead & Black, Padang: 1.97–2.14, 29–41° |
| Crossed profiles (6,085 queries) | — | 52 → 0 after the loop removal | 0 |

Vertical air gap (the advisor, clear hold): 0.43–0.78 m at foot 0.9–1.4 m, 1.17–1.49 m at 2.1 m (A0 0.30), 1.72–2.08 m at 3.1 m (A0 0.44). A crouched rider's head is about 1.19 m over the deck (2026-10-04), so a rider fits from about A0 0.3 up, not at Small.

## Stills

`stills/`, each a grid: rows are the views, columns before (the bounded-C) and after (the cases' own frames) at midday and sunset. Every before/after pair is one held sea (`waterSheetTubeShape`), Padang's own swells, GPU tier, 64 components.
- Views, built from the held curl's middle slice: `ride` (a rider's eye on the face 8 m down the line toward the shoulder, 1.8 m over the toe, looking into the mouth), `side` (12 m in front of the crest), `beach` (70 m shoreward), `inside` (in the void at a third of the way from the back wall to the mouth, looking toward the shoulder).
- `main-big-tubeShape-c-*.jpg`: main's own Padang Big (the `?tubeShape=c` A/B in full: its crash and contact too), for reference.
- `views-medium-sheet-phase.jpg`: `?barrelView=sheet` (the lip's thickness, white thin to blue 1 m) and `phase` (blue before vertical, green open, red after touchdown).

PENDING

## Cost

PENDING

## Risks

PENDING

## The front-gap probe

PENDING

## Tests

PENDING
