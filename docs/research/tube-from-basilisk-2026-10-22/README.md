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

## Step 2: the Canyon's tubes

Branch `claude/canyon-tube-wiring`, stacked on step 1 (merged in, with `origin/main`). The advisor's rulings: the consult log's rows of 2026-10-22, from the wiring to the fifth (the clocks and the loft's refinement). The last two change Padang Padang too ("The clock after the throw", below).

### What changed

- **Cases.** `canyon23_a38` (Big's typical wave, a tube), `canyon23_a49` (Big's sets: a fold at the crest) and `canyon23_a29` (Medium's sets: a curl, under-resolved at 1.6 cells, a lower bound, provisional) are in the game's index (`barrelLibraryIndex.ts`, `docs/research/barrel-cases.md`). `canyon23f74_a38` is not staged.
  - The Canyon's library holds **a38 alone**: a49 and a29 are kept in the index but not drawn (`BARREL_CASE_NOTES`, labelled), because a tube case never blends with a curl or a fold. In A0 order the tube (0.31) sits between the curl (0.21) and the fold (0.42), so an A0 blend would turn Big's smaller waves toward a curl and Medium's sets toward a tube, both the wrong way (the advisor: the runs order by Battjes's ξ_b, curl 0.36–0.38, tube 0.40–0.42). So the A0-only key's a29/a38 blend across period never happens: every tube-regime wave draws a38, scaled by Froude.
  - **The owner's reruns:** `npm run barrels:canyon` (after `tools/basilisk/run_canyon.sh` and its `analyse`) rewrites the index, the three cases' files and the validation table from `docs/research/canyon-tube-runs/data`, taking each case's finest level (a level-14 rerun replaces the level-13 file), its A0 from its `_case.json`, and keeping every other shipped case byte for byte. `npm run barrels:canyon -- DIR` reads another folder. The notes match a case by its name less its level, so a rerun keeps them.
- **The transect** (`BARREL_SPOTS.canyon`): slope 1:23 (`CANYON.pathSlope`), the 6 m platform as the foot, fronts followed from the relaxation zone.
  - **The throw:** d = 0.342 + 1.289 η_foot − 0.270 (T − 14) m, exact through the three runs (computed from them in code); f74 lies 0.013 m off it. Clamped to 1.27–2.52 m and 11–14 s. `OnsetTables.throwDepth` takes an optional period term.
  - **The join:** the solver's fresh onset on the transect (`spotOnset`, `spot-onset-canyon.txt`: H0 6, 1:23 to a 1 m flat, 9–14 s, 1–4 m drives), each wave's first onset against its highest over the band, rows as the advisor chose them. At 9–12 s the solver's onset sits at or shallower than the throw line (at 11 s within 0.12 m of a29's vertical, zero lag): `joinPast` 1.5 H lets such a crest join and throw where the solver breaks it rather than being dropped as unbroken. The 12 s rows are flagged (0.5–1 m shallower than 11 and 14 s for the same band crest).
  - **Small crests** (the third ruling): drives of 1–1.4 m give a row only where at least 6 of their 12 waves fresh-break on the slope: 11 s from a band crest of 0.81 m (→ 1.93 m) and 0.91 m, 12 s from 0.94 m (6 waves, flagged) and 1.07 m, 14 s from 0.89, 1.03 and 1.17 m. At 9 s every such drive broke one wave: no row. Under each period's lowest row the clamp stays, so such a crest joins only if the solver breaks it there; otherwise the curl draws it. For these rows the throw is the join (zero lag).
- **The regime.** A front point draws and is felt as a tube only where ξ_f = S / √(η_foot / L0) ≥ 0.54 (`BarrelSpot.tubeFrom`, `tubeFootMax`): foot crests up to 0.82, 1.22, 1.46 and 1.98 m at 9, 11, 12 and 14 s. a38 (1.86 m at 14 s) is a tube; a49 (2.52 m) and a29 (1.27 m at 11 s) are not. The front's records leave the rest out, and a front's piece after a gap is written as a front of its own (`writeFrontRecords`'s `footMax`, `FRONT_PIECE`), so the loft never bridges a gap. The clamp flag is not used for the regime.
- **The crash is off** at the Canyon (`BarrelSpot.crash`, `sweptCrashOn`): no jet leaves or lands, its water is exactly as before (a test steps the Canyon's Big with and without its tubes and compares the water and the felt whitewater bit for bit), and its spilling front, roller, drawn edges, curl, 6 s lace (`spillingCurlOn`) and foam balls stay.
- **The curl gives way to the tube.** Each step the simulation marks the columns where a tube-regime point stands on a wave's crest (within 5 m of the curl's crest there), with the solver time its tube touches down (`markTubeColumns`). There the spilling curl draws nothing and makes no splash, and its white and its roller band wait for that touchdown (`SpillingCurl.update`'s `tube`). Never both on the same metre of crest.
- **The pods guard** (the fourth ruling; inferred, provisional): a tube-regime piece of a front draws its tube, is felt and takes the curl's columns only once its span along the crest reaches one wave height H (the library's drawn height at the throw of its highest foot crest; `BarrelSpot.tubeSpan` 1), and from then on (`FrontPoint.tubeSpan`, carried in the sea handover), so a shrinking tube never pops out (`latchTubeSpans`, `SurfZoneSimulation.writeTubeRecords`). A minimum front width, not a minimum open run.
- **`?canyonTube=off`** (`canyonTubeSwitch`): the Canyon as before its tubes (no front, no tube, the curl everywhere). Online rooms always run the default. The Canyon's old layout (`?canyonBed=old`) never draws tubes (its arm is not the runs' 1:23).
- **The water program.** With the barrel's mask the Canyon's Rich edge band would take 17 texture units (roller, rock bed, mask), past the M1's 16. A water drawing the swept barrel never carves its surface, so its program now leaves the carve out and takes neither tube texture: the Canyon's edge band takes 15, its water 14; Padang Padang's lose the same two (14, 13), with no visual change.

### The clock after the throw, and the loft's refinement (both spots)

The hold check the advisor asked for at the Canyon's Big found lips hanging in mid-flight; `src/wave/probes/tubeClock.probe.test.ts` found the same at Padang Padang. `advanceClocks` held a slice's τ whenever its fitted throw time slid later, as neighbours joined or as unthrown neighbours' foreseen throws drifted.

- **The clock** (`sliceClock.ts`, the fourth and fifth rulings): a point whose own crest has thrown fits its throw time over its thrown neighbours only; once its lip is drawn thrown (τ ≥ 0) its clock runs between one and two steps a step, so it never hangs and a catch-up plays as a 2× speed-up, not a jump; a face that its fit throws reaches τ = 0 and runs on from there. Before the throw a face may still wait for its crest.
- **The loft** (`sweptLoft.ts`, the fifth ruling): where neighbouring slices' drawn clocks (held at touchdown, as the drawing holds its frame) differ by more than 3 library frames it halves the interval again while they still do, up to three levels (0.25, 0.125, 0.0625 m), taking the most levels the 298-slice budget allows (`LoftResult.refineLevels`). The Canyon's slow peel is real (1.8–2.8 m/s along the crest at Medium): one level left a quarter of its crest stepping 3–10 frames between slices.

The tube clock probe, 60 s, seed 3, 1 m cells, every front point every step; the loft as the page builds it. The clock lines: main's clock (as at 70f6bdc8) → the final code; the Canyon's Medium was not run on main's clock (its † cells are the clock fix alone, 4e103ad5, before the catch-up cap). The loft lines: the old loft (4e103ad5) → the final code:

| | Padang Small | Padang Medium | Padang Big | Canyon Medium | Canyon Big |
|---|---|---|---|---|---|
| Thrown clock-steps that held (ran less than a step) | 52.9 % → 0 | 33.9 % → 0 | 25.5 % → 0 | — → 0 | 35.7 % → 0 |
| Thrown points held over 0.3 s in all | 83.7 % → 0 | 61.3 % → 0 | 43.2 % → 0 | — → 0 | 40.4 % → 0 |
| Catch-ups, p95 beyond the step (max), s | 0.05 (0.50) → 0.033 (0.033) | 0.07 (1.17) → 0.033 (0.033) | 0.20 (1.45) → 0.033 (0.033) | 0.20 (0.40)† → 0.033 (0.033) | 0.11 (6.84) → 0.033 (0.033) |
| Drawn slice pairs stepping over 3 frames, share of the crest | 7.0 % → 1.7 % | 4.1 % → 1.3 % | 5.6 % → 3.2 % | 26.9 % → 1.3 % | 15.8 % → 4.1 % |
| The same, p95 by crest length, frames | 3.13 → 2.93 | 2.95 → 2.82 | 3.17 → 2.91 | 10.0 → 2.79 | 6.86 → 2.93 |
| Builds the budget clamped (fewer than 3 levels; with none, main's loft left them unrefined too) | 0 | 2.1 % (0.9 % none, 0.9 % one, 0.3 % two) | 7.4 % (5.0 % none, 2.1 % one, 0.4 % two) | 0 | 11.7 % (1.7 % none, 6.2 % one, 3.7 % two) |
| Loft ms a build, p50 / p90 (Node, loaded M1) | 0.90 / 3.08 → 0.76 / 3.35 | 5.6 / 10.7 → 6.4 / 12.1 | 4.9 / 8.2 → 5.5 / 8.6 | 0.77 / 1.80 → 1.13 / 2.66 | 3.2 / 11.9 → 4.4 / 13.5 |

- Every white in the Canyon's tube columns starts on the point it waited for, at that point's own drawn touchdown (lag 0 by construction: it reads the same τ); after the throw no clock held (Big: 106 whites; Medium: 69). Twenty of Big's whites waited over 0.3 s longer than first foreseen: all of it before the throw, the face waiting for its crest.
- Neighbouring thrown points' |dτ/dσ| p95 moved 0.158 → 0.189 s/m at Small, 0.166 → 0.242 at Medium, 0.262 → 0.237 at Big and stayed 0.433 → 0.446 at the Canyon's Big: a lip already thrown when its neighbours throw later keeps running, so grouped onsets keep part of their step. The deeper refinement covers it in the drawing.
- Grouped onsets in the unit test (groups 0.5 s apart) now keep a step under 0.3 s at each group's edge (under 0.2 s when held).

### The Canyon's probe

`src/wave/probes/canyonTube.probe.test.ts`, the Canyon's own swells, seed 3, 60 s after a period's spin-up, 1 m cells, the a38 library. First wiring → final code (the small-drive rows, the clocks, the pods guard and the refinement):

| | Medium (1.4 m, 11 s) | Big (2.4 m, 14 s) |
|---|---|---|
| Tube regime (foot crest at most) | 1.22 m | 1.98 m |
| Joins (late, past the throw depth) | 147 (10) → 184 (10) | 1066 (59) → 1061 (63) |
| Unbroken, of the crests that reached their throw depth (the advisor's bar about 20 %) | 86.8 % → 82.3 % | 15.9 % → 15.1 % |
| The same, only sizes with a join row (band crest at least 0.81 m at 11 s, 0.89 m at 14 s) | 71.3 % (54 joins, 134 unbroken) | 14.7 % (873, 150) |
| Front points a frame, in the tube regime and drawn | 24.0, 97 % → 25.8, 97 % | 148.2, 88 % → 142.6, 86 % |
| Foot crests, p10 / p50 / p90 | 0.32 / 0.76 / 0.94 m | 0.56 / 1.22 / 2.03 m → 0.58 / 1.23 / 2.03 m |
| Curl slices a frame; columns the tube takes from it | 10.9; 3.6 → 10.9; 3.7 | 10.8; 9.0 → 11.1; 8.6 |
| The tube's white later than the curl's own landing, p10 / p50 / p90 | −0.70 / −0.12 / 1.39 s → −0.69 / 0.06 / 2.02 s | −0.62 / 1.13 / 3.22 s → −0.60 / 1.16 / 3.21 s |
| Open tube runs a frame (open, standing, one front), p10 / p50 / p90 | 0.18 / 0.37 / 2.0 m | 0.37 / 2.0 / 19.4 m |
| Each wave's longest open run, p10 / p50 / p90, in its drawn H (the band 0.84–2.64 H: 1.3–3.5 H / tan α at the arm's 53–57°) | 0.33 / 1.06 / 12.1 H; inside 50 %, under 33 %, over 17 % (24 waves) | 0.44 / 1.22 / 13.1 H; inside 33 %, under 32 %, over 36 % (95 waves) |

- **Medium stays mostly a curl, now measured.** The small-drive rows join more of Medium's crests (147 → 184), but the game's spread, irregular sea breaks only about 29 % of the tube-sized crests that reach their join depth before their throw depth, and most of Medium's crests (band crest median 0.61–0.71 m) sit under the lowest row anyway. No tube is thrown off water the solver hasn't broken (the 2026-09-30 gate). In 2D, 10 of 12 such waves break fresh; the gap is unexplained (the advisor: a later, report-only rerun with spreading off).
- **What Medium shows.** Its smaller waves down the arm draw small, slow-peeling tubes, about 0.7–0.9 m high, too small to ride inside: each column's lip throws as its crest joins (zero lag), and the waves shrink down the arm, so the tube runs down the line at 1.8–2.8 m/s. Its sets, and every crest the sea doesn't break first, keep today's curl.
- **The pods guard** keeps 95 of Big's 102 waves' longest open runs to the millimetre and drops the 7 whose longest was 0 m (5 of them), 1.25 m and 2.0 m (at most 0.58 H): the per-wave sum 995.9 → 992.6 m (−0.3 %; the bar was 5 %). At Medium it changes nothing: two adjacent columns already span Medium's 0.7–0.9 m H, and its short open runs are the slow peel's short open stretch, not short fronts. Kept, provisional (the fifth ruling).
- **Big per wave:** 36 % of its waves' longest runs are over 2.64 H: close-out sections, which throw and land together, as ruled for T2.

### Stills

`stills/canyon-*`: the Canyon's own Big (2.4 m, 14 s) and Medium (1.4 m, 11 s), GPU tier, 64 components, views from the start (the rider's lineup, 18 m seaward of the take-off, 1.6 m up, looking at the held tube), the ride camera (`ride`, as at Padang), `side` and `beach`. `canyon-big-*`: Big's typical wave on the arm 35 m seaward of the peak, a 5.4 m open run of a38's tube: from the ride camera a green face with a lip throwing, beside the spilling curl's white on the next section; from the start and the beach a short tube in the line of white. The lip's edge is bright as at Padang, and a short section's two blended ends give its lip a V from in front. `canyon-medium-rich.jpg`: Medium, the curl and its white as before: over about 90 s of held sea at Medium no open tube run was longer than 0.5 m. The stills predate the small-drive rows, the clocks, the pods guard and the deeper refinement; on held frames the last three change little, and the rows add Medium's small, slow-peeling tubes (see the probe). `canyon-medium-final-rich.jpg`: the final code at Medium, Rich, midday and sunset: a 2.5 m open run of one such tube on a smaller wave down the arm, its crest about 1.1 m over still water: from the ride camera and the side a small lip throwing over a shallow void, too small to ride; from the start and the beach barely visible. `padang-big-final-rich.jpg`: Padang Padang's Big on the final code (the clocks and the deeper refinement): a 7.9 m open run on the reef 78 m inside the take-off, a green face and a lip throwing; no seam, hole or grey band, the lip's edge bright as before.

### Cost

Measured, not a gate (Node on this M1 under other sessions' load, 60 s, final code):
- **The worker** gains the Canyon's front: 2.6 / 3.0 / 4.8 ms a step at Big (p10 / p50 / p90), 2.6 / 3.0 / 5.0 at Medium (Padang Medium's front was 2.5 ms p50 in the 10-19 M1 study); the curl's step with the tube marking 0.71 ms at Big. The rider's contact on the Canyon's tubes was not timed (no rider sessions).
- **The page's loft** at the Canyon: 1.9 / 4.2 / 12.4 ms a frame with records at Big, 0.19 / 1.09 / 2.27 at Medium. The deeper refinement costs about +40 % at the median and +13 % at the p90 at the Canyon's Big, +14 % / +13 % at Padang Medium (table above); the budget caps it at 298 slices.
- **Texture units:** the Canyon's edge band 15, its water 14 (under the M1's 16); Padang Padang's 14 and 13.
- The loft's p90 is worth retiming on the M4 Pro (the advisor).

### Risks

- **Medium stays mostly a curl** (measured; the probe above), with small, slow-peeling tubes on its smaller waves that a rider cannot fit in. The 1D–2D gap in fresh breaking is unexplained.
- **The white edge can step** where a tube section meets a curl section: the tube peels at each crest's own breaking depth (1.8–2.8 m/s at Medium), the whitewater's tracker reads a faster peel (39–50°), partly the inherited-age fuse (the advisor; the per-wave offset between the two landing lines is a diagnostic not built).
- **The pods guard is inferred and provisional**; judge it again after T4 and the playtest.
- **Clock changes reach Padang Padang** (both spots share `sliceClock.ts` and the loft): no lip hangs, catch-ups run at 2×, and a lip already thrown when its neighbours throw later keeps part of the grouped onsets' step (the refinement draws it smooth). Padang's crash runs on the same clock, so its jets leave and land without the old pauses. Its stills predate this.
- **The loft's budget** (298 slices) clamped the refinement in 12 % of the Canyon's Big builds; there some slices still step 3–10 frames.
- **A tube section beside a curl section** along one crest (the Big stills): the tube regime is per point, so a crest can change from tube to curl where its foot crest crosses the regime's height.
- **The two clocks.** In tube columns the white waits for the tube's own touchdown: at Big 1.2 s later than the curl's own landing at the median, up to 3.2 s (p90), and sometimes earlier (p10 −0.6 s). The advisor: expected (the throw waits for the Navier–Stokes depth, and a38's tube stays open 1.04 s).
- **a29's curl may be partly resolution** (1.6 cells): a level-14 rerun could lower the 0.54 threshold. The 12 s join rows are flagged until checked on 2D seeds.
- **Felt tubes at the Canyon.** The rider's contact now has the Canyon's tubes: riding changes there; the owner rides.
- **The water program** at both swept spots lost the carve (two samplers and their code): no visual change, and fewer instructions, but not timed in a shown pane (the M1 cost cliff).
- **`?tubeShape=c` at the Canyon** draws the cases' own frames: the bounded-C was never evaluated on the Canyon's cases.

### Tests

On 6ae5e310 (the step's final code; later commits are docs and the three test fixes below), with `origin/main` (578202fd) merged in, on this M1 under other sessions' load:
- `npx tsc --noEmit -p .`: clean.
- The main suite (`npx vitest run src --maxWorkers=2`, without `SurfZoneSimulation` and `SurfZoneRunner`): 302 files passed, 29 skipped; 2,879 tests passed, 18 expected failures, 33 skipped.
- `SurfZoneSimulation.test.ts -t "[Pp]adang|[Cc]anyon|[Bb]arrel|[Tt]ube"`: 34 passed, 3 failed, all three stale tests, fixed in the next commit and passing there: two crash-pacing fixtures encoded the old pause (a thrown clock held at τ 0.1 through a step; it now runs a step on, so their crests moved 1/60 s of pace further), and "runs on Padang Padang only" predated the Canyon's wiring (`SWEPT_BARREL` is `['padang', 'canyon']`).
- `SurfZoneSimulation.test.ts -t "[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`: 11 passed.
- Probes (opt-in, `PROBE=1`): `canyonTube`, `tubeClock`, `spotOnset` (the small drives), as quoted above.
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

**The Canyon, its sizes:**
7. **Big (2.4 m, 14 s):** typical waves draw a tube on the arm. Watch where a crest changes from tube to the spilling curl, and that its white comes only after the lip lands.
8. **Big sets:** still the curl and the tumbling white, no tube.
9. **Medium (1.4 m, 11 s):** the curl and white on its sets; on its smaller waves down the arm, small, slow-peeling tubes (too small to ride inside). Where a tube section meets a curl section, does the white edge step?
10. **From the start (the lineup):** can you read the tube from where you wait?
11. **A/B:** `?canyonTube=off` at Big, the Canyon as before its tubes.

**Both spots, the clocks:**
12. **Watch a lip in flight:** it should fall without stopping in mid-air, and a lagging lip should speed up rather than jump.
