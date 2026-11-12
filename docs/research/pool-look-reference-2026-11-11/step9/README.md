# Step 9: `?wallFoot=dug` (2026-11-12, opt-in, branch `claude/pool-wall-foot`, not pushed, not merged)

Ruling 21's build. One build, one 300 s run with the switch on. Nothing was tuned.

## What failed or is in doubt (read this first)

- **K7 misses at the extreme.** The drawn surface must never be under 0.3 m over the bed. The least in the run is **0.287 m** (13 mm short), after the throw (clock 0.3 to 1 s). Before the throw the least is 0.39 m. Medians are 0.6 to 1.8 m. I did not find the cause and did not tune.
- **K6 passes at the median and at 90 %, not at the tail.** The contact's surface is within 0.005 m of the drawn dug face at 90 % in every bin. At 99 % it is up to 0.009 m; the worst single point is 0.162 m (once, clock −0.9 to −0.5 s). The contact does follow the dig, so the stop rule did not fire.
- **K5's normal is at the bar, not under it.** The mesh's end lies on the sea (0.000 m). Its normal against the sea's: median 0.2 to 0.4°, 90 % 0.5 to 1.1° (bar 1°). Base: 0.5 to 1.1° too, but in other bins.
- **One folded strip.** The loft's least advance between neighbouring slices is **−0.042 m** with the switch on (base +0.027 m). Under 0 means two slices cross somewhere, at least once in the run. The probe prints only the worst value, not how often. The mesh now reaches about 9 m farther ahead, so the rays have more room to cross.
- **The vertex spacing ahead of the toe is wider than the spec's 0.5 m:** median 0.57 to 0.62 m, 90 % 0.65 to 0.71 m, most 0.86 m. The loft has 18 forward vertices and I did not add vertices.
- **Three must-not lines moved** (J1, J2, J3; see below). J3 and J1's bar readings still pass. J2 "where the share starts" got worse at the tail.
- **The stills are mixed.** The thin white line under the wall is gone in the front view. But the Rich look now shows broken white patches lower down, in the hollow of the foot. The pale curved line in the along view is still there and runs farther down. See "The stills".
- **The dig is deeper than the ruling expected** at the extreme: median 0.3 to 0.4 m as expected, but up to 1.15 m.

## What was built

The switch `?wallFoot=dug`. It acts only with `tubeSeam=blend`, only at the pool's Barrel. Online rooms are pinned to the default. Default: off.

With the switch on, on the front of the wave (from the crest forward):

- **The drawn surface is the case's own**, also where it lies under the solver's sea. Today the seam draws the higher of the two.
- **The return to the sea is ahead of the toe.** The forward vertices now stand evenly from the toe to 5 wave heights + the band past it, on the case's own profile. The share falls by ruling 21's rule: hold until the sea is within 0.05 H of the case, ease over 2 H, give up at 5 H. H is the drawn wave height.
- **Just past the crest the dig comes in over the first 8 profile points**, so the crest itself is unchanged. This ramp is mine; the ruling did not give one. It is why the back slope, the crest and the lip are identical on and off.
- **Before the throw the dig grows with the share** (the same clock course as the seam). No new clock.
- **The contact follows.** Where the face is dug, the rider's water surface is the contact's floor alone, not the higher of floor and sea. So the dig is not drawn-only.

Not changed: the face anchor, the clocks, the share's course, the crash, the solver, the back slope, the library, `SurfMeter.ts`, `POOL.alongShore`, `throwLip`, `newBreaker`. The case is not scaled or moved. No low-pass.

Files: `src/wave/barrel/wallFoot.ts` (new), `sweptLoft.ts`, `sweptContact.ts`, `faceAnchor.ts`, `src/physics/PhysicalSurfWater.ts`, `src/wave/SurfZoneSimulation.ts`, `src/game/PhysicalMode.ts`, `src/main.ts`. Tests: `wallFoot.test.ts` (new, 9 tests), one new case in `PhysicalMode.test.ts`.

## The runs

All on the ref pool, 300 s, with `&wallBody=stream&tubeForm=early&loftMesh=arc` (as step 8).

| Run | File | What |
|---|---|---|
| Step 0, before any code | `base.txt` | Step 8's probe with the new prints. Every shared line equals `step8/arc-foot.txt` (only the wall time and one path differ). Throws' list byte-equal to `step6/arc.throws`. |
| Switch on | `dug.txt` | The build with `&wallFoot=dug`. |
| Switch off, after the build | (scratch) | Equal to `base.txt` line for line (only the wall time and the throws' path differ). Throws' list byte-equal. |

**The throws' list with the switch ON is byte-equal to base** (1722 jets). Lines A to F are equal.

## The bars (base → dug; median / 90 %)

| Bar | Base | Dug | Result |
|---|---|---|---|
| **K1** drawn turn at the old corner less the raw case's own (pass 3° / 8°), clock −0.9 to −0.5 s | 8.0 / 16.1° | 0.2 / 0.9° | pass |
| K1, −0.5 to −0.2 s | 13.8 / 23.5° | 0.0 / 0.0° | pass |
| K1, −0.2 to 0 s | 9.3 / 21.7° | 0.0 / 0.0° | pass |
| K1, 0 to 0.3 s | 5.0 / 15.6° | 0.0 / 0.0° | pass |
| **K2** the same, 0 to 2.5 m ahead of the throw | 11.4 / 21.8° | 0.0 / 0.0° | pass |
| K2, 2.5 to 7.5 m | 5.4 / 17.2° | 0.2 / 1.1° | pass |
| K2, 7.5 to 15 m | 1.7 / 8.3° | 0.9 / 2.1° | pass |
| **K3** largest drawn turn, toe to mesh end (pass 6° / 10°) | 3.5 to 5.3 / 4.9 to 7.7° | 3.8 to 5.5 / 5.0 to 6.1° | pass (largest once 11.8°) |
| **K4** drawn less the raw case, crest to toe, share 1 (pass 0.01 / 0.03 m) | 0.14 to 0.21 / 0.40 to 0.44 m | 0.000 / 0.000 m | pass |
| **K5** mesh end: drawn less the sea; normal against the sea's (0.000 m; 1°) | 0.000 m; 0.1 to 0.3 / 0.5 to 1.1° | 0.000 m; 0.2 to 0.4 / 0.5 to 1.1° | height passes; normal at the bar |
| **K6** contact's surface less the drawn on the dug stretch (0.005 m) | no dug stretch | 0.001 to 0.003 / 0.001 to 0.005 m; 99 % to 0.009; most 0.162 | pass at median and 90 %; tail over |
| **K7** drawn over the bed, least (never under 0.3 m) | least 0.325 m | least **0.287 m** | **miss** (by 13 mm, once, after the throw) |
| K8 steep height (over 35°), −0.5 to −0.2 s (report) | 0.6 / 0.9 m | 1.0 / 1.2 m | the raw case's is 1.0 / 1.2 |
| K8, −0.2 to 0 s | 0.8 / 1.1 m | 1.1 / 1.3 m | the raw case's is 1.1 / 1.3 |
| K9 share of slices with a corner over 20°, by clock from −0.9 s (report) | 0.4, 0.9, 0.9, 0.8, 0.7 | 0.5, 0.9, 0.6, 0.3, 0.2 | see the note |
| K10 toe line off its neighbours at 1 m (report) | 0.06 / 0.13 m (−0.5 to 0 s) | the same | unchanged |
| K11 deepest dig, drawn less the sea (report) | 0 | median −0.41 m (−0.9 to −0.2 s), −0.30 (−0.2 to 0), −0.26 (0 to 0.3), −0.19 (0.3 to 1); deepest −1.15 m | deeper than expected at the extreme |

Notes:

- **K4 before the throw.** While the share is under 1 the drawn face is between the sea and the case, as designed: 0.000 / 0.000 m at −0.2 to 0 s, 0.000 / 0.043 m at −0.5 to −0.2 s, 0.064 / 0.130 m at −0.9 to −0.5 s.
- **K9.** A corner over 20° still shows on 9 of 10 slices at −0.5 to −0.2 s. K1 says the drawn turn there is the raw case's own (0.0°). So what is left is the case's own curve, not the join. After the throw the share falls from 0.8 to 0.3.
- **K1's rare largest values:** 6.6 to 8.3° (once each).
- **The return to the sea:** the hold runs to 1.9 to 5.4 m past the toe (median), and the surface is on the sea at 6.1 to 9.1 m (90 %: about 11 m). Base: 1.7 to 3.8 m.

## The must-nots

| Line | Base | Dug |
|---|---|---|
| Throws' list | — | byte-equal |
| A to F (F: fastest water 6.66 m/s) | — | equal, line for line |
| J4, J5 | — | equal |
| Crest's largest step | 0.3547 m | 0.3547 m |
| J3 height over the sea at the band's edges (bar 0.01 m) | 90 % 0.001, most 0.030 m | 90 % 0.004, most 0.035 m (**moved**, bar still met at 90 %) |
| J1 share step (the bar's reading) | median 0.004 m | median 0.009 m (**moved**); the whole step 0.024 → 0.050 m |
| J2 where the share starts | 90 % 0.99°, most 4.8° | 90 % 1.67°, most 12.2° (**moved, worse**) |
| J2 at the crest alone | — | unchanged |
| Rise of the surface, rider-free, in the course | 0.61 median, 2.17 at 95 % | 0.59, 2.23 (+3 %, inside the +10 % bar) |
| Rise, last 0.5 s | 0.68 / 2.59 | 0.70 / 2.40 |

J1, J2 and J3 are read on the front face, where the surface now drops under the sea. So some change is the dig itself. I did not split the dig from a side effect.

## The stills

Twelve JPEGs in this folder, at 90 s and 150 s, with the ride switches + `poolSize=ref&tubeForm=early&loftMesh=arc&wallFoot=dug`. Compare with `step8/still-*.jpg`.

| Still | What I see |
|---|---|
| `still-dug-front-*.jpg` (Rich, midday) | **The thin white line under the dark wall is gone.** The wall is taller and runs down into the trough with no edge. **New:** broken white patches lower down, in the hollow of the foot (at 90 s one bright patch, at 150 s a row of four). They are not in the Classic still of the same frame, so I read them as the sun's highlight in the hollow, not foam. I cannot prove it. |
| `still-dug-view-front-*.jpg` (`barrelView=front`, normals only) | No sharp change of shade at the old corner. The face is one smooth shade from crest to trough. The loft now covers the whole foreground. Its far end has a dotted edge (the mask fading), at the right. |
| `still-dug-classic-front-*.jpg` | Clean. A dark wall that fades down into pale water. No line. |
| `still-dug-along-*.jpg` (Rich, sunset) | **The pale curved line is still there**, and now runs farther: from the crest down the face and on along the trough toward the tube's foot. At 150 s there is also a blue stripe with a dotted edge across the sun's reflection, ahead of the tube's foot. Base does not have that stripe. I think it is the far end of the longer loft. |
| `still-dug-view-along-*.jpg` | A crease on the same curve. So the along-view line is geometry, and the dig did not remove it. It follows the front along the wall (the place where the share starts), not the old corner. |
| `still-dug-low-channel-*.jpg` (`curl-close`, low, from the channel side) | A deep dark hollow at the foot, smooth. No white line. At 150 s a darker fold runs down the face at the tube's leading end (the known fold). |

The four questions:

- **Is the lower white line gone?** Yes, in the front view. But white patches appear lower down in the Rich look.
- **A trench line 5 to 8 m ahead?** I see none in the front and low views. The along view at 150 s shows a blue stripe with a dotted edge that may be the loft's end.
- **Sea showing over the foot?** I see none (no speckle or second surface inside the face).
- **Foam floating over the dig?** I see none in these frames. There is little foam ahead of the throw in them, so this is not a real test.

## Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- Suite, run once at the end: 344 files passed, 37 skipped; 3341 tests passed (baseline 343 files, 3331 tests; +1 file, +10 tests). No `zz-*` files in `src/`.
- New tests cover: the rest lengths, the crest ramp, the share's rule, the placing of the forward vertices, the switch (only with the seam blend; off = today's face), the loft on a toy lip (off = on or over the sea; on = the case's own level, even spacing, mesh end on the sea; back slope, crest and lip identical), the contact and the water's surface on the dug floor.

## Not run

- No rider sessions, catch reports or autopilot rides. No browser pane.
- No second run (K3 passed, so no 3 H ease).
- The default pool, Canyon, the Canyon byte check, the fps trace.
- `?lipEdge=one` is not built.

## Surprises and open points

- **The along-view line is not the old corner.** K1 and K2 say the corner is gone, yet the sunset still keeps a pale line. The normals view shows a crease along it. J2 "where the share starts" got worse (most 4.8° → 12.2°). My reading: along the wall, the dig starts where the share starts, so the step between a dug slice and its not-yet-dug neighbour is now larger. That is a question for the advisor.
- **The white patches** in the Rich front still: the hollow now faces the sun. Whether this is right (a real trough glints) or a new fault, the owner and the advisor should judge.
- **K7:** the mesh ends about 9 m farther ahead, in shallower water, and the dig takes up to 1.15 m. One of the two makes the 0.287 m. Not located.
- **Not lengthened:** the crest ray's plan reach and `nearestSurface`'s plain test. They read as before.
- **Foam and spray** stay on the solver's sea. Over a dug stretch they may float up to the dig's depth over the drawn water. Not seen in the stills; not measured.
- **The fold** (−0.042 m): see the first lines.
