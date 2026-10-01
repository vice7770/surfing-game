# The barrel library

The swept barrel (the Padang Padang spec, Part B) draws its tube from 2D overturn profiles simulated in Navier–Stokes. They are swept along the breaking front, each slice at its own clock (τ, from the throw). This note covers the library's cases, how they check against the published fits and the field, what they cost, and how to add one. The per-case table is generated: [barrel-cases.md](barrel-cases.md).

Tags: **[measured]** in the model, or in the lab or field where said; **[modelled]** from a published simulation or fit; **[inferred]** my reasoning.

## The cases

Four runs of the advisor's Basilisk setup (`tools/basilisk`, GPL-3.0, run apart from the game) on round 6's Padang Padang transect, up a 1:19 slope along the wave's path to a reef flat 1.25 m deep (0.179 h0), at level 12. The game blends them by H0/h0, the crest at the wedge's 7 m foot over the depth there:
- three solitary waves of height A0·h0 at the foot;
- the Small swell's case, below the solitaries' range: the second crest of a 16 s cnoidal train (H/h0 0.195), its crest at the foot 0.99 m, so A0 = 0.141.
  - The advisor ran and analysed it (2026-09-30; `periodic_library.py`, times by `plunge_measure.py` with the local trough as the water level and a crest window past the backwash's steps).
  - Swell breaks on the wedge where a soliton that small would run on to the flat, so a periodic run stands for Small (the advisor).
  - It is built with `--a0 periodic_padang19s_L12=0.1414`, since its own A0 is the train's height.

| Case | H0/h0 | Where it overturns | H_I at h0 = 7 m | Void L × W just before touchdown | Open tube, vertical to touchdown | Frames | Asset |
|---|---|---|---|---|---|---|---|
| `pad19-a20-l12` | 0.2 | on the reef flat, about 1 h0 past its edge | 1.97 m | 0.90 × 0.45 m | 0.59 s | 145 | 145 KB |
| `pad19-a30-l12` | 0.3 (the owner's case) | at the reef flat's edge | 2.58 m | 2.11 × 1.00 m | 1.00 s | 158 | 158 KB |
| `pad19-a45-l12` | 0.45 | on the wedge, about 2.6 h0 before the flat | 3.67 m | 3.34 × 1.45 m | 1.16 s | 163 | 163 KB |
| `periodic-padang19s-l12` | 0.141 (the Small swell's crest) | on the wedge, 14 m before the flat, in 1.99 m | 2.24 m over the trough ahead | 0.86 × 0.39 m | 0.82 s | 176 | 176 KB |

All [measured] in the model. Each case holds 128 points per frame, in h0, from 2.7–2.9 √(h0/g) before its face goes vertical (the clock's earliest frame, −3, clamps to the first) to one frame past touchdown, in the `BRL1` form (`src/wave/barrel/profileFormat.ts`), and loads from `public/barrels/` through `src/wave/barrel/barrelLibraryIndex.ts`.

## Validation

Each case at its last output before touchdown, against Pick & Feddersen's fits in ψ0 = s/(H0/h0)^¼ [modelled], within round 2's tolerances (areas ±0.05, W/L ±0.1, θ ±5°), and against Mead & Black's field survey [measured, field]:

- **The tube's shape matches.** W/L is 0.50, 0.47 and 0.44 against the fits' 0.43, 0.42 and 0.40, all inside. L/W is 2.01, 2.11 and 2.30: the two smaller cases fall inside Padang Padang's own 1.97–2.14, the largest inside the reefs' 1.42–3.43.
- **The tube's size is smaller than the fits'.** A_O/H_I² is 0.05, 0.19 and 0.23 against the fits' 0.38, 0.34 and 0.30. The fits are for plane slopes, where a smaller wave's larger ψ0 gives the rounder tube. On this wedge the tube grows with the wave instead, and a small wave makes a small, steep tube:
  - A0 0.2 overturns over the flat and barely curls.
  - The advisor's periodic 14 s wave (1.22 m foot crest, level 12) broke on the wedge 15 m before the flat, and still made a tube of about 0.04 H² at about 70° [measured, NS].
  - The library's own Small-swell case (16 s, 0.99 m at the foot) went vertical 14 m before the flat. Just before touchdown its tube is 0.035 H² over the trough ahead, W/L 0.45 (fit 0.44, inside), L/W 2.20 and tilt 39°, inside Padang Padang's 29–41° [measured, NS]. Its lip spans only 4.1 cells, under the 6 the grid rule asks for, so its areas may read slightly high; the advisor can rerun its fine phase at level 13.
  - So small tubes are what small waves do here, not only the flat folding a solitary wave [inferred]. The periodic and solitary shapes at Padang agree within about ×2 in area and a few degrees in tilt, so the solitary library serves for the shapes; the periodic runs mattered for timing (the advisor).
  - The direction matches Blenkinsopp & Chaplin's flume reef, a 1:10 wedge dropping to deeper water, where breaking intensified as the crest's submergence fell (their abstract).
  - Pick & Feddersen (2026, §4.1) restate that reef's A_O/H² as 0.05–0.35, rising with H0/h_c, and O'Dea et al.'s field A_O/H² as 0.05–0.3. The three cases sit inside both. Those ranges are as restated; neither original paper was opened [not opened].
  - No plane-slope case was run to show the fits hold here otherwise.
- **The jet.** A_J/H_I² is 0.11, 0.21 and 0.18 against 0.20, 0.17 and 0.14. The larger two are inside the tolerance.
- **The tilt.** θ_O is 57°, 41° and 40° against 31°, 35° and 39°. Only the largest case is inside, but the two larger are inside Padang Padang's 29–41° [measured, field].

**The level-12 impact frame.** `metrics.py` measures at the last overturned frame whose jet stands at least 3 cells off the face. At level 12, the frame before touchdown can hold the jet 2 cells off, and there the landmarks took a sliver for the void: A0 0.3 read 0.001 H_I², against a steady 0.19 over the 0.3 s before.

## Cost

- **Wall time** [measured]: 265, 282 and 298 min for A0 0.2, 0.3 and 0.45. Each ran on one core of the M1 Air, all three at once while the game's probes ran beside them.
- **Analysis:** `analyse` needs Python with numpy, scipy and matplotlib. It takes a few minutes per run.
- **Size in the game:** 145–176 KB per case, 642 KB for the four. They load once, when the spot does.

## Landmark cleanliness

Frames whose landmark checks passed, by phase [measured]:

| Case | Before the face is vertical | Open tube | After touchdown |
|---|---|---|---|
| A0 0.2 | 116 / 117 | 27 / 27 | 48 / 117 |
| A0 0.3 | 106 / 110 | 47 / 47 | 42 / 104 |
| A0 0.45 | 98 / 108 | 54 / 54 | 49 / 99 |
| Small swell (periodic) | 127 / 136 | 39 / 39 | 61 / 226 |

- Every open-tube frame is clean.
- Before the face goes vertical, the only flags are the lip landmark jumping (1, 4, 10 and 9 frames). Those frames are refilled linearly from their clean neighbours.
- After touchdown, the splash-up tears the surface inside the window. A case keeps only one frame past touchdown, so the torn frames never reach the game.

## The level-13 comparison

The owner's level-13 run of A0 0.3 on the M4 Pro (`run_padang.sh` at its defaults) will show whether level 12 has converged. Until it lands, the level-12 values above are provisional.

## Adding a case

1. Scout the case's window at level 10, as in `tools/basilisk/README.md`: set `LEVEL=10` and the amplitude, then find when the lip folds over and touches down.
2. Run it at level 12 with `TOUT0` about 3 s before the fold and `TMAX` 3 s past touchdown. For example: `LEVEL=12 A0=0.3 TOUT0=18.5 TMAX=25 NAME=pad19_a30_L12 tools/basilisk/run_padang.sh`.
3. Analyse it with the same variables and `analyse`.
4. Rebuild the whole library, naming every run each time. The index lists exactly the runs named. For example: `npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --run periodic_padang19s_L12 --a0 periodic_padang19s_L12=0.1414 --flat 0.1785714`.
   - The flat is the reef flat's depth in h0.
   - A periodic run's `--a0` is its crest at the foot over h0, and its metrics are read in `plunge_measure.py`'s form.
   - The advisor's periodic files live on their branch, under `docs/research/water-physics/notes/round6-tube-profiles/data/`; copy them into the runs directory.
5. Commit `public/barrels/*.bin`, the index and `barrel-cases.md`. Record the run in the README's table.

## The front's join and throw

Where each slice's clock starts and when its lip throws (Part B, PR 2; `src/wave/barrel/sliceClock.ts`):

- **The join** is where the game's solver first breaks swell of that size, fresh. The `periodicOnset` probe drove regular waves up one column of the transect, at 14, 16, 17 and 18 s. A crest joins by its highest over the 6–5 m band of still depth, at 2.3–4.6 m [measured in the model].
- **The throw** is where the Navier–Stokes wave's face goes vertical: d = 1.56 + 0.56 η_foot at h0 = 7 m, clamped to foot crests of 0.99–2.50 m and scaled by h0/7 for the tide. It comes from the advisor's periodic Basilisk runs at level 12: 0.99 m → 1.99 m (16 s, the Small case), 1.22 m → 2.45 m (14 s), 1.65 m → 2.38 m (16 s) and 2.50 m → 2.97 m (18 s), residuals within 0.21 m [measured, NS]. The line through them is [inferred]: the runs confound height with period, and period dependence is untested.
- **Why the throw is not a lag after the join.** Kennedy's onset leads a soliton's vertical face by 2.3–2.8 √(h0/g) (`kennedyLag` probe) [measured]. For swell, the three periodic runs read 0.22, 2.30 and 1.60, no function of depth. So a crest joins only if the solver breaks it before it reaches its throw depth.
- **The cost** is 6.0 ms per frame against a 529 ms step, 1.1 %, on Padang Padang's Small swell at 1 m cells (320 × 574) with 203 front points on average. That was on the M1 Air while the three Basilisk runs shared it; the ratio is the number to keep [measured].

## The loft

The swept barrel as drawn (Part B, PR 3; `src/wave/barrel/sweptLoft.ts`). The `padangLoft` probe ran Padang Padang's Small swell (Hs 1.2 m, 16 s) at 1 m cells for 180 s of sea, lofting every front every step over the Classic look's heights [measured]:

- **Cost.** 0.89 ms a frame against the step's 158.8 ms, 0.6 %, in Node on the M1 Air. Up to 39,664 vertices at once, for a 140 m front: the budget was reached at the biggest sets, with 4–15 clock steps clamped then.
- **The open curl** ran 3–9 m along the crest at the median, up to 13 m, against the checklist's 3–10 m.
- **Neighbouring clocks** differed by 1.4–2.8 library frames at the median, 2–3.8 at the 90th percentile, within the 3-frame stage.
  - Spikes of 10–20 frames came now and then, most likely where a front's newest points join beside thrown ones [inferred].
  - The refinement halves such a step but cannot close it, so it stays a tooth until PR 2's fit covers the joining point.
- **The anchored crest against the solver's crest**, over open slices:
  - 0.3–1.0 m at the median and 0.6–2.5 m at the 90th percentile;
  - 928 of 17,082 open slices (5.4 %) sat over 2 m off, the most 4.8 m.

  The advisor asked to hear past about 2 m. The profile throws where the Navier–Stokes wave goes vertical and runs forward as the library's lip does, while the solver's crest moves on its own after it breaks.
- **Every lookup was clamped on this swell** while the library held only the solitaries: its foot crests (A0 about 0.14) stood under the smallest case (0.2), so they scaled that case by their own foot crest, as ruled. The Small swell's own periodic case (A0 0.141, above) now covers them.
- **Slices after touchdown** stay on the front while the solver's bore breaks on. Lofted at zero weight, invisible and unmasked, they filled the budget at the big sets.

The advisor's follow-ups (2026-09-30), rerun on the same sea [measured]:
- **Faded slices are dropped** from the loft and its budget. The loft fell to 0.50 ms a frame, 0.3 % of the step. The most vertices at once was 15,544, and no clock was clamped.
- **The drawn crest's distance from the solver's is soft-capped:** its own up to 1.5 m, then 1.5 + x/(1 + x) with x the excess in metres, so at most 2.5 m. That is the rational twin of the advisor's tanh, since the loft stays + − × ÷ √.
  - 1,809 of 17,773 open slices were capped. Their median life was 0.76 of the open time.
  - By fifths of the open time they fell 78 / 124 / 309 / 505 / 793, so 44 % in the last fifth.
- **So the anchor starts back to the solver's crest at 80 % of the open time,** over the 0.3 s handover, where the lip collapses and the crest landmark is least defined (the advisor's rule).

## The contact

The swept barrel as ridden (Part B, PR 4; `src/wave/barrel/sweptContact.ts`), from the advisor's rulings of 2026-09-30.

**How it answers.** The worker builds the same loft each step from the same front records, in a contact mode, over the physics' own uncarved surface. A point is water or air by the parity of the lofted triangles a vertical line crosses above it.
- **Closed down to the seabed** past the pinned ends by vertical walls, which a vertical line never crosses, so the crossings alone decide (ruling 2).
- **Half-open:** a crossing at or below the point counts as below. A point on an edge two triangles share counts in exactly one; on a fold (the lip's tip), in both or neither. A point exactly on a slice's ray steps a nanometre into its strip, so its own triangles take the ray's edges.
- **Layers.** In water, the surface is the nearest crossing above, and a crossing below is the curl's underside (`waterFloorY`). In air, it is the nearest crossing below, and the two above are the curl's underside and top (`ceilingY`, `ceilingTopY`). `surfaceAt` is the lowest crossing, the face, as the carve returned the void's floor.
- **Normals** are the loft's vertex normals by the crossing's weights. Their slope is held at n_y ≥ 0.5 [provisional]. Buoyancy is support × (−s_x, 1, −s_z), growing as 1/n_y. So past 60° a face's slope is tan 60° = 1.73 along its own direction, at most twice the support. The old n_y ≥ 0.1 let a tube's back wall push a body sideways at 10 × its buoyancy (the advisor, 2026-09-30). The sample keeps the unclamped normal for anything that plans off the face.
- **Overlapping fronts: the first wins, in the drawing and the contact alike** (the advisor, 2026-09-30).
  - The loft drops a later front's strip whose footprint overlaps an earlier front's kept strip: from the drawing, its mask and the contact. The footprint is the convex hull of its slices' drawn reach, the same in both modes.
  - The contact's per-point rule (the first strip in its cell that holds the point) stays as a backstop, and counts what it catches.
  - If drops reach about 1 %, or a dropped strip held an open tube (a hole in a barrel), the advisor would switch to keeping the front whose crest is nearer.
- **Cost** (the advisor, 2026-09-30). The strips are indexed on a 2 m grid, and each strip's quads are bucketed by their range along its ray: 0.5 m buckets, in order.
  - A vertical line tests only its bucket's quads: about 8 through the toy tube, against a strip's 133. A point outside every front's footprint tests none. The answers are exactly the full scan's.
  - The ranges are stored as 32-bit floats, widened by 0.1 mm. Without that, a point exactly on a vertex row (z 2.1 m on the toy face at h0 3 m) rounded outside the quad that holds it. The full scan lost that face crossing too, so the column read as unclosed or found a wrong floor.

**After touchdown** (the advisor, 2026-09-30).
- **The drawing keeps the touchdown frame,** the visual event.
- **The contact holds each blended case at its own held frame from its hold,** so it never self-crosses yet follows the drawing until each case's own hold. The held frame is the last one, at or before a frame before touchdown, whose tip stands 2 cells (0.0234 h0 at level 12) over the face beneath it and 2 cells ahead of its throat. It is measured when the library loads:

  | Case | Held frame | Void W (h0 7 m) | Collapse √(2W/g) |
  |---|---|---|---|
  | `pad19-a20-l12` | 1 before touchdown | 0.48 m | 0.31 s |
  | `pad19-a30-l12` | 2 before | 1.17 m | 0.49 s |
  | `pad19-a45-l12` | 1 before | 1.75 m | 0.60 s |
  | `periodic-padang19s-l12` | 1 before | 0.49 m | 0.32 s |

  - pad19-a30-l12's last two frames have closed onto the face: landmarks 64–112 bunch within 0.03 h0 of (1.46, 0.03) h0, the main surface running over an enclosed cavity. A frame before touchdown, the first rule, held it with no void.
  - pad19-a20-l12's and pad19-a45-l12's last two frames are duplicates, and open. Their "touchdown frame" is really the last open frame, so the drawn lip never visibly lands. The fade does the closing on screen; the crash curve (PR 5) owns the landing's look.
  - The first rule also took the earlier of a blend's two clear times. At A0 0.3, all a30, it froze the contact at 0.57 s against a 1.00 s touchdown.
- **W is the held frame's void height:** the most its underside (tip to throat) stands over the face beneath it, blended by the cases' weights and scaled by h0. It sits within about 20 % of the runs' W_O across the void (0.45, 1.00, 1.45 and 0.39 m) [measured, model].
- **From touchdown both fade into the water over the tube's own collapse,** √(2W/g): `PlungingLip`'s roof free fall, G9's mechanism [provisional]. That is 0.31–0.60 s, in place of the loft's 0.3 s. A faded slice is dropped. The loft gives each slice its collapse time and fade (`sliceCollapse`, `sliceFade`) for the crash curve.
- **The contact's held tip stands at most 0.33 m from the drawn one** (h0 7 m; `sliceTipGap`, `tipGap`).
  - a30's two closed frames carry the drawn tip 0.047 h0 onto the face, and periodic's last carries it 0.031 h0 (0.22 m). It is 0 elsewhere: a20's and a45's last frames are their held ones.
  - It is the touchdown's own approach, the last 1–2 frames (about 0.05 s), which a contact that never self-crosses can't hold. The advisor accepted it, 2026-09-30.

**Following the drawing's weights** (the advisor, 2026-09-30). The contact takes the drawing's weights, with no cut. The lerp toward the same water by the same weight keeps a vertical line's crossings in order, so a partly weighted lip (a front's ends, a collapse) shrinks as drawn. Tested along vertical lines through the tubes:
- **The toy tube,** lerped by the end ramps and the collapse over flat and sloping water: each line meets the face, the underside and the top once.
  - Where a strip's weight is uniform they are in order.
  - In the ends' strips, whose weight changes 0.1–0.35 a slice, two can swap by up to 3.2 mm (h0 7 m): at the throat, or in the last 5–19 % before the tip.
- **The library's cases,** every blend, τ 0.5–1.3 s: every line meets the layers an odd number of times, so parity holds.
  - Swaps are up to 0.05 mm in uniform strips (at the fold), and up to 10.3 mm at the tip in the ends' ramps. A swap of two adjacent crossings only relabels them; the contact doesn't use the labels.
  - About 1 % of lines meet an underside (rarely a top) three times. The cases' own nearly vertical jet undersides wiggle at the cell scale, in the drawing too, each leaving an air sliver millimetres wide inside the lip, too small for a 10 cm body sphere's wet share to notice.
  - Smoothing near-vertical undersides lightly in the converter would remove them: a cleanup for later (the advisor).

**The lip's flow** (ruling 1). The converter stores the tip landmark's velocity per frame: a least-squares line over ±4 frames, in √(g h0) (format BRL2; table in [barrel-cases.md](barrel-cases.md)).

The advisor normalised the tips by each case's own crest speed C: the crest landmark's speed over the last 1.0 τ before vertical, decoded from `public/barrels/*.bin` (2026-09-30). These are the library's values, provisional [measured, model]:

| Case | C (√(g h0)) | Median horizontal | Largest \|v\| | Fall |
|---|---|---|---|---|
| `pad19-a20-l12` | 0.95 | 0.99 C | 1.23 C | 0.68 g |
| `pad19-a30-l12` | 1.11 | 1.06 C | 1.19 C | 0.67 g |
| `pad19-a45-l12` | 1.31 | 1.08 C | 1.21 C | 0.71 g |
| `periodic-padang19s-l12` | 0.83 | 0.93 C | 1.08 C | 0.58 g |

- Against their own crests the solitaries throw at about 1.0–1.1 C and peak near 1.2 C, the low end of Erinin 2023's 1.1–1.3 C [measured, lab]. They look faster with A0 only because C grows.
- They fall at about 2/3 g, not near free fall. Partly the fit spans the whole open time, including the jet's supported start; partly the resolution, about 4 cells across the lip at level 12.
- The Small swell's periodic case is about 10 % slower still: a weak plunger.
- Good enough to drive the contact. The level-13 run should nudge these up.

How the contact uses it:
- **Scale and clock.** The lookup scales it by √(g h0) of the slice. The clock's rate is 1: τ runs with time, and pauses hold it.
- **During a hold.** Each blended case's tip velocity is taken at the slice's τ until touchdown, since the water is still moving through a case's hold. From touchdown it is the held frame's (the advisor, 2026-09-30).
- **The ramp.** In the curl's water, the solver's flow across the crest and up ramps to the lip's by where the curl's top is, from the crest landmark (0) to the tip (1). It also ramps by the slices' weight (their ends, the collapse), as their shape does. Along the crest the solver's flow is kept.
- **The anchor's motion** (the advisor, 2026-09-30). The lip's velocity is the tip's plus the anchor's. The anchor (1 − u) T′ + u C hands over to the crest point C = S − c n, where S is the solver's crest and c the profile's. It follows C as it hands over, and also while the soft cap holds the throw point T′ near C:
  - the capped point moves at 1 − f′ of C's pace along its offset (f′ the cap's slope), and at 1 − its scale across it;
  - Ċ = Ṡ − ċ n.
  - **Ṡ** is the solver crest's mean pace since its throw, along its column: (z − throwZ)/τ. It is blended in over 0.1–0.3 s and held to 0.5–1.5 × √(g d) at the crest [provisional]. It lags a slowing crest by about a tenth late on.
  - **ċ** is the crest landmark's motion over ±4 frames, as the tip's.
- **Checked** against the drawn tip's motion over the tip's own ±4-frame smoothing (A0 0.14 and 0.30, the solver's crest at 4 and 11 m/s):
  - The stored velocity is within 0.33 m/s until a window before a case's hold. Without the anchor's following it was 0.4–3.5 m/s off on tips of 10–16 m/s.
  - In the last window before the hold the tip decelerates into touchdown faster than its ±4-frame line follows: up to 0.53 m/s.
  - Windows reaching the hold see the drawn tip go on to the face: 0.7–0.96 m/s. Both are the touchdown's approach, as the tip gap is (the advisor accepted them, 2026-09-30).

**The rider** (ruling 4).
- No new trigger. At a swept spot the solver's lip parcels no longer strike (their strips are off).
- A body part in the tube's air whose sphere reaches the curl's underside takes its share between the underside and the top, with the curl's water's flow. A part in the curl's water subtracts the air below it, as the deck is.
- **The lip's water floats no one** (the advisor, 2026-09-30). The curl's water is a falling jet, near the air's pressure, so a part's share in it, or reaching it from the tube's air, takes drag only. This replaces the earlier "leave it", which held only while the slope stayed small.
- The pop-up's "feet under water" ignores a foot in the curl's water with air beneath it; it is the attached rider's only submersion rule.

**Part D's fields** on the sample: `covered` (in the curl's air before touchdown), `clearance` (up to the underside), `tube` ('open', 'closing' from 0.8 T_open [provisional], 'closed' from touchdown until the slice goes; none before the throw). The Reef's session has yet to agree them.

**Measured** [measured]. These come from the `padangContact` probe and its scratch twins. They were taken on the M1 Air (8 GB) under other sessions' load, so wall time also counts the waits for a core. CPU time (`process.cpuUsage`) doesn't, so it is given beside.
- **A standing rider samples the water 2,656 times a 1/60 s step:** 32 substeps × its hull points, foils and body parts (ruling 3's count).
- **A query through a tube.** The toy tube is a 40 m front whose strips have the sea's 133 quads each.
  - 2026-09-30, a full scan at load 30–88: 6.4 µs, wall.
  - 2026-10-01, with the buckets, warmed, at load 28: 2.05 µs wall and **0.79 µs CPU**, testing 8.4 quads.
  - Buckets against the full scan in one process: 0.69–0.72 µs against 1.36–1.43 µs CPU. The rest of a query is finding its strip, its few triangles, the normal and the lip's flow.
- **A standing rider wholly inside a tube** costs 2,656 × 0.79 µs = **2.1 ms of CPU a step**: 5.4 ms wall at load 28, where the scan's estimate was 17 ms wall at load 30–88. Per-substep lerping would only save the slice rebuilds, which aren't the cost (the advisor).
- **The update at the loft's budget.** Three 60 m fronts in every phase, 294 slices, 39,664 vertices: about 10 ms CPU a step, against the drawing loft's 7–9 ms. Branch b38a1d2 took 7.4–8.4 ms for 270 slices: it cut the lerped ends. The buckets take 1.3 ms of it.
  - On the Small swell (2026-09-30, 20 s of sea, no tube yet) the update was 0.37 ms a step against the step's 613 ms.
- **The sea rerun (`PROBE=1 SECONDS=180`) is still owed.**
  - Started 2026-10-01 at load 22–38 (median 27.7) with the machine paging (64 MB free), its worker got 13–20 % of a core. It hadn't logged its first 5 s of sea after 29 minutes, so it would have run about 14 h, and it was stopped.
  - The probe now logs CPU time and the load beside each line, so its next run on a quieter machine gives the update and query costs, the dropped strips per 1000 (and any with an open tube), the tip gap on the sea, and the height field's slopes across the breaking faces: the yardstick the slope clamp could take instead of tan 60°.

## The crash

The swept barrel's jets, landing and whitewater (Part B, PR 5; `src/wave/barrel/SweptCrash.ts`, `crashCurve.ts`, `heldOverturn.ts`; the advisor's rulings of 2026-10-01). At a swept spot given the library, the solver stays the mass ledger, but its lips leave and land on the barrel's clock.

**Where the lip lands** (ruling 1). On the drawn touchdown frame (the library's `hold: 'drawing'`), the face's point nearest the tip: the closest point to it on the lower surface, from the throat on, within 2 h0 ahead. That is `metrics.py`'s closing of the void, the gap whose closing is the runs' touchdown. The landing keeps the touchdown frame's own height through the fade, which dissolves the drawing into the water but doesn't move where the lip came down.
- One point per front point, about one per solver column, in the loft's own frame: the ray from the front's tangent over ±2 m, the end weight, the anchor (from 0.8 of the open time handed back to the solver's crest) and PR 4's fade. A test holds the crash's tip and crest to the loft's drawn vertices.
- On the drawn touchdown frames the tip stands 0.035, 0.025, 0.062 and 0 h0 off the face (a20, a30, a45, periodic): at most 0.43 m at h0 = 7 m. In a20 and a45 the last two frames are open duplicates, so the drawn lip never touches the face; the crash curve says where it lands.
- Carrying the tip on at its own velocity to the still face would land it 0.78, 0.34 and 1.04 m further at h0 = 7 m: in the runs the face rises to meet the jet, and the gap closes within a frame [measured, NS].

**The jet and the void** (rulings 3 and 8), each case's held frame (PR 4's `heldFrame`) measured as `metrics.py` measures its metrics frame, on the 128 points [measured, NS]:

| Case | A_J held / metrics (h0²) | A_O held / metrics (h0²) | Void length held / metrics (h0) | Axis held / metrics |
|---|---|---|---|---|
| `pad19-a20-l12` | 0.00918 / 0.00861 | 0.00421 / 0.00411 | 0.141 / 0.129 | 49° / 57° |
| `pad19-a30-l12` | 0.02868 / 0.02871 | 0.02611 / 0.02587 | 0.311 / 0.301 | 40° / 41° |
| `pad19-a45-l12` | 0.04818 / 0.04833 | 0.06344 / 0.06315 | 0.487 / 0.477 | 41° / 40° |
| `periodic-padang19s-l12` | 0.00830 / 0.00787 | 0.00400 / 0.00358 | 0.140 / 0.123 | 55° / 39° |

- The areas agree within 12 %. The two small voids' axes are noisy (0.14 h0 on 24 samples), and only place G9's bubbles and foam ball.
- At h0 = 7 m the jet is 0.41–2.36 m² a metre of crest and the void 0.20–3.11 m².
- Blended by A0 as the frames are, scaled by h0², over the point's share of its front's length (half the σ gap to each neighbour) times the loft's end weight: the jet that is drawn is the water that lands.

**The ledger** (rulings 2, 4–6):
- **The throw:** at the point's τ = 0, all at once, the jet leaves the solver's crest under it by the lip's own source rule (#86). It takes the wave's upper half at most 0.2 of each cell, and its momentum along the held lip's horizontal velocity nearest first, clamped at each cell's own, never reversed; what can't be placed is counted. H is the solver's own wave height there.
- **The hold:** the water waits as a strip of 8 parcels (`PlungingLip.holdJet`): in the sea handover, carving nothing.
- **The crash:** at touchdown its void closes, trapping the held A_O over its share. Its water pours where the lip lands, a parcel every 1/7 of the tube's collapse, √(2W/g) (PR 4's `collapseSeconds`, so the water comes down as the drawing and the contact fade), each released where the landing then stands. It keeps the horizontal velocity it was taken with, and falls at the held lip's (each blended case's at its own held frame: `hold: 'contact'`). The solver's water stands above the drawn face there, so each lands where it is released.
- **Each landing** is a lip parcel's: its water spread over the sheet's thickness along its travel, the plunge zone held, the splash-up (0.3 of it), foam, aeration by the jet's own fall (from the drawn crest at the throw to the landing), spray from the landing's own height, and sound.
- **The tube's air** goes by G9's mechanism with W = PR 4's void height: half as a spit from the chain's open end (the newest thrown point, the tube's mouth), or an eruption where the section closed at once; the rest as bubbles down to 0.8 × the fall; and the foam ball.
- **Waves no front joins** throw no jet: at a swept spot the barrel alone plunges, and Kennedy's onsets there are counted. Spilling breakers make a roller, not a jet.
- **Late points:** a point first seen past touchdown throws and pours in one step. One first seen past its collapse was never drawn, and throws nothing.
- **Overlapping fronts:** the loft draws the first front where two overlap (PR 4). So a later front's point whose drawn footprint (its slice's reach with the extensions, half its share of the front either side) overlaps a live point of an earlier front throws nothing, and its whitewater isn't gated. It is counted (`covered`).
- **Lost points:** a point lost while its jet is held pours where and when it was foreseen at the throw.

**The whitewater waits for the touchdown** (ruling 9). Kennedy's onset leads the lip by up to about 2 s and 20 m on the wedge. So while a point's clock is before touchdown, in its column over the drawn curl's footprint (profile samples 6–121), the solver's breaking is withheld from the whitewater:
- the foam's bore source, and so the bore spray and the bubbles, which read it;
- the bore's air and turbulence: an open tube's face is clear water, and the rider in it feels it (physics);
- the roar.

The foam field is shared, so **Classic's foam at Padang Padang changes too**, around the barrel and downstream of it: the change stays inside the swept spot, and follows the one-water rule (the owner's to look at). **A known inconsistency:** the rider's roller push keeps the solver's own breaking (Part D's to change: it moves the catch and ride reports), so in an open curl before touchdown a rider can still feel the early Kennedy bore's push.

**The splash-up sheet** (ruling 10) is drawn at Padang Padang as at every spot (Rich's splash-up strips; Classic draws none). The barrel draws the jet, so the jet's strips stay hidden there. PR 7 must keep a splash-up renderer when it deletes `LipSheetMesh.ts` and `richLip.ts`.

**Sound:** lip hits come from the pour's landings, so the crash sounds along the crash curve as the peel runs.
