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

- **Ends.** A front's ends, and the ends that cuts leave (`sealRuns`), blend into the water over **1 m where the end slice has thrown**, not 2.5 m: the loft, the contact and the crash curve alike (`LOFT.endBlend`, `endBlendLength`, `endWeight`). This is the only distance blend, where a run meets water that isn't on its front. The leading end needs no clock taper of its own: each slice draws its own clock's frame, the steepening face before the throw and the lip growing after it. Close-outs throw and land together along their length, so a 5.7 m section draws 3.7 m of full curl and two 1 m ends. No minimum run length.
- **Young ends** (the advisor's follow-up). A front's young end, whose end slice has not thrown, has no lip inside its blend, but the library's earliest frames already stand 0.8–1.0 of the held height on a 14–28° face, about 0.37 H over the solver's own unbroken crest beside them (Padang Medium). Over 1 m that was a cliff; such an end now blends over max(1 m, H), keeping the seam no steeper than about 20°, the face's own slope.
- **The narrowed clock link** (ruled 2026-10-03, built now): an end is a candidate only within the 3-row reach in z per column between the ends, 3 m beside it and 6 m across an empty column. Since the 3-row rule already links neighbours within 3 m, the link now only bridges one-column holes stepping under 6 m. `CLOCK_SLOPE` 0.166 s/m, `CLOCK_REACH` 10 m and the 1 s/m split are unchanged, and so is the 2 T order fix.
  - Tests: a 3.5 m neighbour step stays two fronts; a hole stepping 5.9 m links and 6.1 m doesn't; the nearer end wins when it is listed second; with the switch on, a 1.01 s/m pair stays split.
  - Left off at Padang: the front-gap probe's bar on holes and folds failed (see "The front-gap probe" below).

## The probe: before and after

The advisor's probe (`advisor-probe/`, and `src/wave/barrel/tubeShape.test.ts` now pins it): Padang's cases at a 7 m foot, foot crest 0.9–3.1 m, at 0.5, 0.8 and 0.95 of touchdown, as the drawing holds them.

| | Bounded-C (main) | Basilisk (this branch) | Target |
|---|---|---|---|
| Lip thickness, median | 0.014–0.021 H (3–7 cm) | 0.12–0.22 H (0.3–0.65 m) | 0.1–0.2 H |
| Lip tip | 0.009–0.014 H | 0.03–0.16 H; late in flight median 0.10 H | about 0.07 H (0.03–0.16 accepted at level 12) |
| Void (points 64–112) | 0.48–0.69 H² | 0.09–0.22 H² | after T4; Pick & Feddersen 0.25–0.38 is a check |
| Void L/W, tilt (A0 0.3–0.45, clear frame) | — | 2.0–2.1, 43–44° | Mead & Black, Padang: 1.97–2.14, 29–41° |
| Crossed profiles (6,085 queries) | — | 52 → 0 after the loop removal | 0 |

Vertical air gap (the advisor, clear hold): 0.43–0.78 m at foot 0.9–1.4 m, 1.17–1.49 m at 2.1 m (A0 0.30), 1.72–2.08 m at 3.1 m (A0 0.44). A crouched rider's head is about 1.19 m over the deck (2026-10-04), so a rider fits from about A0 0.3 up, not at Small.

## Stills

`stills/`, each a grid: rows are the views, columns before (the bounded-C) and after (the cases' own frames) at midday and sunset, Rich and Classic in separate files. Every before/after pair is one held sea (`waterSheetTubeShape`), Padang's own Small (1.2 m, 16 s), Medium (2.2 m, 17 s) and Big (3.8 m, 18 s), GPU tier, 64 components, the held curl on the reef 35–60 m inside the take-off.
- Views, built from the held curl's middle slice: `ride` (a rider's eye on the face 8 m down the line toward the shoulder, 1.8 m over the toe, looking into the mouth), `side` (12 m in front of the crest, at the lip's height), `beach` (70 m shoreward and 25 m along), `inside` (in the void, a third of the way from the back wall to the mouth, looking toward the shoulder).
- `ab-small-*`, `ab-medium-*`, `ab-big-*`: before and after.
- `main-big-tubeShape-c-*.jpg`: main's own Padang Big in full (`?tubeShape=c`: its crash and contact too), on its own sea.
- `views-medium-sheet-phase.jpg`, `views-big-sheet-phase.jpg`: `?barrelView=sheet` (the lip's thickness, white thin to blue 1 m: the C's lip is white, the cases' runs white to pale blue) and `phase` (blue before vertical, green open, red after touchdown).
- `small-side-sheet-region.jpg`, `small-lip-close-sheet-on-off.jpg`: the bright lip edge at Small, with the sheet's shading on and off and the `region` view (red the lip, blue the back wall).

What they show: the C drew a squared shelf or a small lumpy dome with a membrane roof, and an inside of flat walls and stripes. The cases' own frames draw a green face, a lip with body throwing forward and a round void; from inside, the lip curls overhead. At Small the tube is small, as the runs are (see Risks).

## Cost

The drawn loft on the page's main thread, Padang Big, the same held sea and fronts, each shape's loft built alternately 100 times (warm caches), on this loaded M1 (load 7–20, other sessions' Node runs): **the cases' frames 2.8 ms p50 (9.8 p90), the bounded-C 5.8 ms (28.9 p90)**, 56–59 slices. The raw profile is a lerp of two frames; the C built each contour with its cap refinement (about 400 `cRefineCap` calls a build, `docs/research/perf-2026-10-22`).

So the loft gets cheaper, not dearer: the perf study's 10–11 ms a snapshot on the M1 (`SweptLoft.build` 10.1 ms p50, 21.6 p90, at Padang Medium) was the C's construction; on the same fronts the cases' frames take about half the C's time. The worker's contact reads the same profiles; it was not timed separately.

The loop closing adds a pass over the tip-to-throat points of blended profiles only (about 1 µs a query). The young-end blend adds two profile lookups a front. No shader change in step 1.

## Risks

- **The lip reads bright.** The sheet's shading lets the sky through the lip over its own thickness; through 0.3–0.65 m of clear water little is absorbed, so from in front, level with it, the lip's edge draws as a pale band (Small, Medium and Big stills; `small-lip-close-sheet-on-off.jpg`: off, the band is the lip's dark underside). Shading, not shape: no shader change in this pass (the M1 cost cliff). A question for the advisor and the owner, beside T3.
- **Small tubes are small.** The level-12 cases' void is 0.09–0.23 H², and the vertical air gap is 0.43–0.78 m at foot crests 0.9–1.4 m: a crouched rider (head about 1.19 m over the deck) fits from about A0 0.3 up, Medium's sets and Big. Honest until T4 (the advisor: no enlargement without the owner's say, as a gameplay assist).
- **The curl painted white (T3) shows more.** The raw curl stands taller, so where it stands over the inside's whitewater (the −x side's shorebreak close-outs the sheet held first) #142's kept foam paints a tall white wall with green streaks. T3 is the owner's.
- **bc0b489f's old problems:**
  - *Fins:* the clear hold keeps them away (the −1.37 m pair is +0.02 m).
  - *Crossings:* closed at load and in blends (52 → 0 in 6,085 queries).
  - *The seam and the stippling:* the raw path's mask is the pre-10-05 one, a dithered band, without the C's retirement rows and fade-weighted mask. No new seam showed in the stills; the dithered band's stippling at the mask's edge is as it was before 10-05.
  - *The grey band:* not seen in the stills (it was seen with both shapes on 10-05 and never traced); not specifically probed.
  - *Tube entry:* the rider's contact uses the same profiles as the drawing (clear hold); the dev tube guide works on them again. Ordinary entry, crouch and exit are the owner's to ride.
- **Young ends.** The library's earliest frames stand 0.3–0.55 H over the solver's unbroken crest beside a front's young end (Medium 0.29–0.35 H, Big 0.50–0.55 H at the median, 1 m blend). They now blend over max(1 m, H).

  With the final code at Padang Medium (60 s, seed 3, link off): 1,308 young ends; their step over the blend 0.04 / 0.18 / 0.47 H (p10 / p50 / p90, max 0.70), against a median of 0.29–0.35 H with the 1 m blend; the seam's slope 0.04 / 0.17 / 0.47 (tan 20° is 0.36, so the steepest tenth is still steeper than the face); a lip inside the blend 21 times. Thrown ends step 0.02 / 0.08 / 0.40 H over their 1 m. Over the same run, strips dropped as folds 0.20 a frame, holes 0.007, self-folds 0. Big's young ends were not rerun with the final code.
- **Short close-outs draw blunt.** A 5 m section draws 3 m of full curl and two 1 m ends, as ruled; with the drawn crest standing over the solver's, a section's thrown ends step down to the water over 1 m.

## The front-gap probe: the narrowed link stays off

`src/wave/probes/padangFrontGap.probe.test.ts`, seed 3, 1 m cells, link off against on (narrowed), Padang's own Medium (100 s) and Big (60 s; the run was stopped at 97 s once the bar had failed at Medium too):

| | Medium off | Medium on | Big off | Big on |
|---|---|---|---|---|
| True splits linked by the clock | 0 of 123 | 0 of 123 (0 %) | 0 of 282 | 0 of 360 (0 %) |
| Strips dropped as overlaps (folds), a frame | 0.45 | 0.46 | 0.37 | 0.39 |
| Of them holding an open tube (holes), a frame | 0.024 | 0.032 | 0.150 | 0.158 |
| Self-folds | 0 | 0 | 0 | 0 |
| Frames with two curls on two fronts within 12 m | 1128 | 1022 | 355 | 313 |
| Open curl, p10 / p50 / p90, m | 0.25 / 4.50 / 10.49 | 0.25 / 4.71 / 10.96 | 0.24 / 4.95 / 10.98 | 0.00 / 4.98 / 11.14 |
| Fronts a wave | 2.64 | 2.46 | 2.22 | 2.03 |

The link bridges one-column holes (4,341 bridge-steps at Medium, 0.4 % of them across two crest lines), merges no true split and leaves fewer split curls, but holes plus folds rise (Medium 0.47 → 0.49, Big 0.52 → 0.55). The advisor's bar (holes plus folds no more than off) fails, so `PADANG_FRONT` stays `{ jumpReach: 10 }`: "If folds still rise after narrowing, keep it off; the loft's normal is then the suspect." The narrowed link is built and tested behind its switch. The open curl's median, 4.5–5.0 m, sits at the low end of 2.6 H/tan α (about 4–10 m at H 2–3 m and 35–40°).

## Tests

On 8e40ebb6 (every later commit of this step is docs), on this M1 under other sessions' load:
- `npx tsc --noEmit -p .`: clean.
- The main suite (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation` and `SurfZoneRunner`): 302 files passed, 27 skipped; 2,860 tests passed, 18 expected failures, 31 skipped.
- `SurfZoneSimulation.test.ts -t "[Pp]adang|[Cc]anyon|[Bb]arrel|[Tt]ube"`: 36 passed (2 h 6 min).
- `SurfZoneSimulation.test.ts -t "[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`: 11 passed.
- No `SurfZoneRunner` rider sessions were run: the owner rides.

## Shot list for the owner

Rich, then Classic; midday and sunset. Record the ride camera unless a shot says otherwise.

**Padang Padang, its own swells:**
1. **Big (3.8 m, 18 s):** take off at the peak and drive down the line; look back and up at the curl. Look for a lip with body, green and thick, not a pale membrane; a round void; blunt section ends, not shards.
2. **Medium (2.2 m, 17 s):** the same, then crouch under a throwing lip. Does a crouched rider fit? It should from about A0 0.3, Medium's sets.
3. **Small (1.2 m, 16 s):** tubes are small and a rider should not fit (level-12 cases, T4 owed). Watch the ends of short sections, and the young ends of a front, which now ease over about the wave's height.
4. **Big from the beach:** sections peeling and closing out; ends blunt; any seam, grey band or stippling along the mask's edge.
5. **Inside, if you get barrelled:** the walls, the lip overhead, and how bright its edge reads against the sky.
6. **A/B:** the same size with `?tubeShape=c` (the old authored shape) for comparison.
