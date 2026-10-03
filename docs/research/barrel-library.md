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

**The Reef's case** (PR 7): `periodic-reef42-l12`, the advisor's periodic run on the Reef's ledge at 1:4.2 along the swell's path (the slope the Teahupo'o Reef report measured along the path), from its 10 m shelf to a 1.5 m flat (0.15 h0), H/h0 0.3 at 14 s, A0 0.2127 (the train's crest over the shelf), level 12, re-traced by the advisor so its torn frames are whole (64 of 65 open frames clean). Its face goes vertical in 1.93 m of still water, 0.43 m above the ledge top; touchdown 1.6 s later; 189 KB. Its ψ0 (0.35) lies past Pick & Feddersen's fits, so [barrel-cases.md](barrel-cases.md) shows no fit for it. The 1:6 run (reef60) waits for per-slice slopes. A second Reef case (A0 0.35 at 16 s) is running.

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

**Fitted within one regime** (the advisor's ruling, PR 7, 2026-10-01). The lip landmark is the face's steepest point until the face overturns for good, and the jet's tip after, so a ±4-frame line across the switch is meaningless. On the Reef's 1:4.2 ledge the landmark jumps 0.78 h0 forward just before τ 0; its frames were refilled linearly and the fit read 3–5 √(g h0) through τ −0.18…+0.03. Padang Padang's own cases spiked the same way just before τ 0 (by up to 1.7–3.2 √(g h0)), outside the table's open-time window. Now:
- only the sustained overturn feeds a fit: the last run of frames before touchdown with the landmark ahead of the throat (on a stepped face it flickers before the face goes vertical);
- refilled frames never feed it, and the fit is one-sided at the run's ends;
- the velocity is zero before the overturn (no lip there for the contact) and holds the run's last fit after it.

Padang Padang's four cases keep their frames byte-identical; only their tip floats change, refitted from their own frames (`--keep`; a frame copied from the one before counts as refilled). That changes the lip the game holds after touchdown (the advisor decoded the files before and after, 2026-10-01): outside the sustained overturn the tip's velocity is now zero, inside it only the window's ends change, and at the held frames (touchdown − 1, a30's − 2), in √(g h0), along and up: a20 0.83 → 0.96 and −0.54 → −0.61; a30 1.06 → 1.18 and −0.69 → −0.72; a45 1.22 → 1.42 and −0.64 → −0.76; periodic padang19s 0.66 → 0.81 and −0.46 → −0.31: the held along-speed rises 11–23 %, read by PR 4's contact after touchdown and by PR 5's held jets (#102). The sustained overturn starts at τ 0.024, 0.109, 0.119 and 0.200 (A0 0.2, 0.3, 0.45, the Small swell's case) and 0.125 on reef42. Over it the medians read 0.94, 1.18, 1.42 and 0.80 √(g h0) (were 0.94, 1.17, 1.42 and 0.77 over the open time), the largest speeds 1.14, 1.43, 1.62 and 0.91, and reef42's 1.12 (was 3.39) [measured, model]. The table below is the advisor's, over the open time, before the change.

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
- **Lost points:** a point lost while its jet is held pours where and when it was foreseen at the throw, and its void closes as its pour begins. One alone on its front at its touchdown, or past its collapse, crashes as foreseen (`foreseen`). Until its crash the front keeps a jet's point on its crest over the throw's window (below).

**The whitewater waits for the touchdown** (ruling 9). Kennedy's onset leads the lip by up to about 2 s and 20 m on the wedge. So while a point's clock is before touchdown, in its column over the drawn curl's footprint (profile samples 6–121), the solver's breaking is withheld from the whitewater:
- the foam's bore source, and so the bore spray and the bubbles, which read it;
- the bore's air and turbulence: an open tube's face is clear water, and the rider in it feels it (physics);
- the roar.

The foam field is shared, so **Classic's foam at Padang Padang changes too**, around the barrel and downstream of it: the change stays inside the swept spot, and follows the one-water rule (the owner's to look at). **A known inconsistency:** the rider's roller push keeps the solver's own breaking (Part D's to change: it moves the catch and ride reports), so in an open curl before touchdown a rider can still feel the early Kennedy bore's push.

**The splash-up sheet** (ruling 10) is drawn at Padang Padang as at every spot (Rich's splash-up strips; Classic draws none). The barrel draws the jet, so the jet's strips stay hidden there. PR 7 must keep a splash-up renderer when it deletes `LipSheetMesh.ts` and `richLip.ts`.

**Sound:** lip hits come from the pour's landings, so the crash sounds along the crash curve as the peel runs.

**Measured before and after** (the advisor's condition on ruling 2; the `padangCrash` probe, 2026-10-01) [measured]. Padang Padang at 1 m cells, 120 s of sea after the spin-up, with Kennedy's lip (before PR 5) and with the crash. It ran on the M1 Air under other sessions' load (load averages 8–38), so the times read high; the crash's cost is its share of the same run's step.

| Swell, seed | Small 1 | Small 2 | Medium 1 | Medium 2 |
|---|---|---|---|---|
| Fastest water, m/s | 6.6 → 6.6 | 6.3 → 6.1 | 7.1 → 7.1 | 8.5 → 7.3 |
| The fine zone's highest water, m: median, 90 %, top | 1.72, 2.34, 3.18 → 1.72, 2.34, 2.67 | 1.84, 2.28, 3.29 → 1.84, 2.29, 2.69 | 2.42, 2.93, 3.79 → 2.40, 2.89, 3.19 | 2.79, 3.16, 3.85 → 2.79, 3.08, 3.37 |
| The front's crests past the throw, m: median, 90 %, top | 0.80, 1.14, 1.72 → 0.81, 1.21, 1.85 | 0.73, 1.12, 1.86 → 0.76, 1.20, 1.93 | 1.02, 1.48, 2.53 → 1.03, 1.53, 2.60 | 1.12, 1.71, 2.56 → 1.07, 1.64, 2.63 |
| Peel, the last wave | 24.9°, 12.1 m/s → 23.7°, 12.7 m/s | 0.9° (r² 0.04) → 18.2°, 16.4 m/s | 32.1°, 12.3 m/s → 36.2°, 11.1 m/s | 25.2°, 15.4 m/s → 30.3°, 13.0 m/s |
| Surf readout, typical / sets, m | 3.21 / 3.48 → 3.37 / 3.49 | 3.30 / 3.50 → 3.31 / 3.51 | 3.69 / 3.81 → 3.70 / 3.74 | 3.59 / 3.68 → 3.59 / 3.65 |
| Jets | 939 → 178 | 1605 → 365 | 1116 → 659 | 1475 → 1097 |
| Water thrown (asked), m³ | 765 (826) → 76 (76) | 1328 (1420) → 131 (131) | 854 (877) → 386 (388) | 1810 (1928) → 792 (795) |
| Starved: jets, water (m³) | 308, 61.4 → 11, 0.003 | 501, 92.0 → 16, 0 | 139, 23.6 → 38, 2.0 | 273, 118.0 → 58, 2.9 |
| Unplaced momentum: jets, m⁴/s | 123, 134 → 14, 7 | 95, 110 → 27, 24 | 142, 339 → 63, 72 | 124, 305 → 180, 422 |
| Jet impacts, m/s: median, 90 %, top | 8.8, 11.4, 16.2 → 7.1, 7.9, 8.1 | 9.0, 11.1, 14.2 → 6.2, 7.8, 8.6 | 9.5, 12.0, 15.1 → 8.2, 9.6, 10.8 | 9.9, 11.8, 15.0 → 8.3, 10.8, 12.2 |
| Crashes / jets; covered points | 69 / 178; 74 | 153 / 365; 94 | 242 / 659; 278 | 392 / 1097; 430 |
| The crash's update / the step, ms | 5.42 / 2351 | 1.41 / 982 | 11.36 / 3060 | 1.23 / 644 |

- **Stable** in all eight seas, and the water no faster: the same fastest water on the two seas where it came early (t 22 s), and 0.2 and 1.2 m/s slower on the two where it came later.
- **The crests don't stand taller without Kennedy's lip.** The fine zone's highest water is the same to 0.04 m at its median and 90th percentile. Only its top falls, by 0.5–0.6 m: most likely Kennedy's landings heaping water [inferred]. The front's crests past the throw stand 0.05–0.08 m taller at the 90th percentile on three seas and 0.07 m lower on the fourth: Kennedy's lip took its water up to 2 s before τ = 0, and the barrel takes it at τ = 0.
- **The peel** meter reads the last wave of the 120 s, and the two seas part after the first throw, so its changes are the waves' spread. Small seed 2's last wave had no clean front before (r² 0.04).
- **The surf readout** holds: typical heights within 0.16 m, sets within 0.07 m.
- **The ledger moves less water:** 10 % of Kennedy's on Small and 45 % on Medium, in a fifth to three quarters as many jets. They are rarely starved: 2–6 % of the jets, at most 3 m³ against Kennedy's 24–118 m³. Their momentum is placed better on three seas. On Medium seed 2, 180 jets left 422 m⁴/s unplaced, against Kennedy's 124 and 305: the held lip leaves faster than the solver's water there [inferred].
- **The join count on Small is held down** by Padang Padang's unsized peak (`claude/padang-peak-sizing`, daf6681), which hadn't landed when these ran.
- **The pour lands at the held lip's speed,** 5–12 m/s, where Kennedy's lips hit at up to 14–16 m/s.
- **The cost:** the crash's update is 0.14–0.37 % of the step.

**The jets crash on their own point** (the advisor's rule (a), 2026-10-01) [measured]. As first built, only 36–42 % of the jets crashed on their point: the other points left the front before their touchdown. Their water poured where and when it was foreseen, so the ledger balanced, but their void's air was never trapped, and the loft stopped drawing their slices mid-tube.
- **Why:** the throw takes the jet from the crest's upper half within 2 H of it (#86's window). The flattened crest's highest cell then jumps past the front's match reach (2 m plus a cell) in one step. A scratch probe followed every point at 1 m cells (Small seed 1, 110 s): with the crash, 99 of 140 thrown points (71 %) left before touchdown, 84 of them that way. Without the crash, 27 of 181 points past τ = 0 (15 %) left, early (a median 0.24 of the open time) and in fronts of 1–2 points.
- **The rule:** a front point holding an uncrashed jet keeps its column's nearest crest within the match reach plus the throw's window (`jetWindow`, 2 H), at most TRACK_REACH (10 m), until its crash (`BreakingFront.keptCrests`). Each such point picks its crest before the samples are matched, and gets it only where no point matches within the match reach as before. Points without jets match as before, and none hold one without the crash. With the crest jumps' rule (#105, Padang Padang's), a crest a jet-holding point keeps is never a sized crest's continuation: the held jets claim first, then the sized crests take the furthest crest ahead of them among those left (`BreakingFront.leadingCrests`).
- **Every void closes.** A jet whose point is alone on its front at its touchdown, with no ray to draw it by, or past its collapse, crashes as foreseen at its throw (`foreseen`). A jet whose point left the front closes its void as its pour begins. Both trap the void's own air.

Measured with both (seed 1, 120 s of sea after the spin-up; the M1 at load 2–22):

| Cells, swell | Jets | Crashed on their own point | Slices dropped mid-tube | Voids closed: own point / alone at touchdown / point lost | Void air, m³ | The kept crests' jumps, m |
|---|---:|---:|---:|---|---:|---|
| 2 m, Small | 92 | 89 (98.9 %) | 1 | 89 / 0 / 1 | 41.5 | 4 to 6 (28 jumps) |
| 2 m, Medium | 386 | 342 (89.3 %) | 56 | 342 / 14 / 27 | 328.1 | −4 to 8 (186) |
| 1 m, Small | 188 | 165 (88.2 %) | 12 | 165 / 17 / 5 | 38.2 | −3 to 6 (111) |
| 1 m, Medium | 672 | 554 (82.8 %) | 48 | 554 / 84 / 31 | 253.9 | −5 to 8 (378) |

- **No kept crest was another wave's.** None had another point within 10 m in its column, and the jumps stayed within 8 m: Padang Padang's waves stand about 100 m apart.
- **Short of the advisor's target** (at least about 90 % on their own point, no slice dropped) on Medium and at 1 m. Three causes:
  - **Alone at touchdown** (84 on Medium at 1 m): the kept point's z jumps 3–8 m with its crest, past the 3 rows its front links over, so it stands alone or splits its front. A point alone isn't drawn either: "slices dropped" counts only points that left the front.
  - **The crest past the window** (38 on Medium at 1 m, 56 at 2 m): the nearest crest was a median 7 m away at 1 m, just past the match reach plus 2 H. At 2 m it was 16–152 m away: gone, at any point of the open time (10 %, 50 % and 90 % at 0.04, 0.50 and 0.88).
  - Another point took the crest, or it stopped breaking (10).
- **Options, for the advisor:** link a jet's point over the same window, or keep its z on its own pace while it holds the jet; widen the window to the 10 m cap; or the progressive take, the jet leaving as A_J(τ) grows (the fallback named).

**The catch report before and after** (seeds 1–2, 2 min each, 30 ghost bots riding the swept contact; `--barrel --no-crash` against `--barrel`, built at 19bdee6, before the front's rule (a)) [measured]:

| Swell | | Attempts | Cue lit | Stood | Rides ≥ 3 s | Longest, s | Top speed, m/s | No cue |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Small | Kennedy's lip | 535 | 24 | 8 | 0 | 1.5 | 12.7 | 468 |
| Small | The crash | 517 | 11 | 4 | 1 | 3.2 | 13.4 | 483 |
| Medium | Kennedy's lip | 645 | 53 | 20 | 4 | 12.6 | 14.0 | 554 |
| Medium | The crash | 623 | 49 | 29 | 3 | 10.8 | 13.3 | 552 |

- The bots barely catch either way, so these are small numbers.
- On Small the cue lit half as often with the crash, on both seeds (12 → 6 and 12 → 5). On Medium it lit about as often (53 → 49), and more boards stood (20 → 29).
- Top speeds of 13–14 m/s come either way; they aren't the crash's.

**Where the landing falls on the profile** (for the adaptive forward rest; the cases at touchdown, foot heights 1–4 m over 3–5 m) [measured]: at samples 99–111.5, mostly 111.5, 0.03–0.09 m before the toe (landmark 112), and up to 0.8 m before it at h0 5 m with a 1 m foot. So the landing sits where the drawing lifts the profile fully, at the edge of the forward rest. Its height takes the end weight and the seam's pin, as the loft did before `REST`. The crash test holds the tip and crest to the loft's vertices, not the landing.

## The lip's colour

The drawn curl as shaded (Part B, after the owner's clip of PR 3 on the M4 Pro: a navy, almost black curl beside a pale cyan, foamy face; the advisor's `docs/research/water-physics/tube-colour-fix.md`, on their branch `main-sshdns`, and their rulings of 2026-10-01). `src/wave/barrel/sweptLoft.ts` (`sheetAcross`, `tubeSkyView`) and `src/scene/barrel/SweptBarrelMesh.ts` (`SWEPT_SHEET_BODY`).

**Why it was navy: the winding first.** The tube review drew the curl by its slices' phase and front (`?barrelView=phase|front`) and found two causes:
- **The winding** (the main one). The loft winds each quad so its front face looks along −n: 12,178 of a toy tube's 12,236 triangles faced against their own vertex normals. The curl's material is double-sided, so from outside every face was a back face and three turned its normal into the water. The view cosine came out negative, the body fell to R∞ with no bed and no caustics, and the sun and sky lit the water's inside: the whole lofted block, about 15 m along a front and 23 m across it, lay navy-black on the water and its foam. The mesh now draws each triangle facing its vertices' normals; the cells at the lip's fold and the throat, whose vertex normals lean across the fold, keep the loft's order so the material turns them back out. The loft and the contact are unchanged by it.
- **The column shading of the lip** (the advisor's diagnosis): its depth was its height above the bed, so a lip 3–5 m over the reef took the colour of 3–5 m of water over coral at 8 %, between Padang Padang's navy R∞ and its dark bed. The crest light was off, and the caustics looked for the reef through air.

**The tongues and the slab.** Each drawn front was one such block, lifted (lift 1 on points 6–121) and foam-free: the back, the face, the toe and the library's flat ahead, not only the lip. Separate tongues were separate fronts side by side (the `padangCurl` probe, below); the slab at the end of the owner's clip was the block itself, close and seen from above.

**Resting on the water** (the advisor's ruling, 2026-10-01; the spec's item 13.4). The library is the authority only where the solver can't overturn. Each profile is now lifted fully from 0.1 H behind its crest to its toe and eased (smoothstep) down to the solver's water over 0.5 H beyond each, H the crest over the lower of the water at the toe and at the front end [provisional]. Past the ramps a vertex rests on the water with its height and foam, the mask lets the water draw itself a band (1 m) beyond them, and the contact follows the same loft. Overlapping fronts are judged on these lifted spans: a strip resting wholly on the water gives way to any strip over it, and where two fronts only rest nothing conflicts.

**The forward rest** (the advisor's ruling, 2026-10-01, on the trench found at Medium in PR 6) [provisional].
- **Why.** The solver's depth-averaged breaking smooths its front broad. At Medium's first held curl its water stood 1.86 m at the crest and still 1.1–1.7 m 4–10 m ahead, while the library's face (the true shape near the break) drops to its toe at −0.38 m 2.6 m ahead. The plain 0.5 H ease from the toe then climbed about 2 m in 2 m: a trench that hid the tube from the front, and a channel camera low enough to look in was under the solver's water.
- **The rule.** Ahead of the toe the drawn trough holds at the profile's own front level until the solver's water along the ray comes down to within 0.1 H of it, read every 0.5 m from the toe and taken where the line between two readings crosses. Then it eases onto the water over 0.5 H, as behind.
  - The ease ends within 3 H of the toe and within the profile's own samples: its front end and extension, less the mask's band. Where the water hasn't come down by then, it eases over what is left.
  - Where the water at the toe is already within 0.1 H of the level, it is the plain rest.
  - It is computed from the drawn slice in both modes, so the contact, the mask and the overlaps' lifted spans follow. The behind-the-crest rest is unchanged.
  - The forward end's pin gives way to it: its ease always ends within the samples.
  - The held trough takes no foam: it is the trough ahead of an open tube (the advisor: acceptable).
- **Measured** (2026-10-01, the water sheet's held curls and a few 1.5 s steps on, GPU tier, load average 22–37; per open slice of weight at least 0.5; median / 90th percentile / max) [measured]:

| swell | open slices (frames) | held / to the cap | the ease ends past the toe | the climb where the ease starts: before (at the toe) → after | deepest under the solver's water ahead of the toe: before → after |
|---|---|---|---|---|---|
| Practice | 66 (4) | 100 % / 79 % | 4.3 / 4.4 / 4.5 m | 1.02 / 1.14 / 1.16 → 0.35 / 0.56 / 0.81 m | 0.91 / 1.05 / 1.09 → 0.95 / 1.11 / 1.14 m |
| Medium | 208 (7) | 98 % / 23 % | 4.4 / 6.8 / 7.6 m | 1.33 / 1.50 / 2.43 → 0.27 / 0.90 / 1.77 m | 1.10 / 1.38 / 2.34 → 1.11 / 1.41 / 2.38 m |
| Big | 251 (5) | 88 % / 9 % | 4.6 / 7.5 / 7.6 m | 1.33 / 2.69 / 3.32 → 0.37 / 0.56 / 1.48 m | 0.96 / 2.08 / 3.06 → 0.96 / 2.10 / 3.09 m |

  - The wall the ease climbs drops to a third, 3.5–5.5 m further ahead. The trough's deepest point under the solver's water is the toe's, as before; the held trough hides the water above it.
  - In H (the crest over the toe) the ease ends 3.2 (Practice), 2.6 (Medium) and 1.3 (Big) past the toe at the median.
  - **From curl-close the tube shows, the camera above both waters.** Practice: 0.49 m over the solver's water and 1.19 m over the drawn trough, 6,537 px of the back wall a formed lip covers (3,592 px before; PR 6's region view). Medium, 7.5 s on: 0.31 m and 1.38 m, 6,807 px. Big: 2.8 m and 5.2 m, 211,541 px.
  - **The face water in the luminance check changes.** At curl-close the held trough now covers the water around the curl. The solver's own pixels left in view are about 300 distant, sky-bright ones at the far edge (0.69–0.80 at 48°), so lip ÷ face water drops (Practice, Rich: backlit 48° 0.62×, backlit 6° 1.12×). The lip itself is unchanged (0.429 and 0.630). Against the curl's own held trough (0.21–0.22) the backlit lip at 48° is 1.9×.
  - Overlaps: 0–4 a frame at Big (none open), 0–2 at Medium, none at Practice.
  - The forward readings: 250–310 a frame at Practice, 510–870 at Medium, 830–1,750 at Big.
- **Cost:** the loft's worst case (a 140 m front all open, 287 slices, plain node, 200 builds in turn, load 34–37): 13.5–16.0 ms a build with the water on the trough (279 readings), 14.4–14.8 ms under a front 2 m over it everywhere (the hold to its cap, 3,906 readings). The readings are lost in the run-to-run noise.

**The sheet** (both looks, the curl's program only; every other program is byte-identical):
- **Thickness.** The loft measures the lip across, per profile point from the crest to the throat: from the crest to the tip, the distance to the underside's run (tip back to the throat); from the tip back, to the outer run's; 0 at the tip, where they meet. Two attributes carry it and its weight: 1 from point 36 to 84, ramped over 3 points next to the crest and the throat, × the vertex's lift, 0 on the extensions.
- **Only once the underside has formed.** The library folds the underside onto the tip until the cavity forms: all four cases until τ/T ≈ 0.07–0.21, and the periodic case again at its touchdown frame. With no air behind it the lip is column water, so the weight comes in with the underside's length over 0.035 h0 (0.25 m at h0 7 m) [provisional].
- **Shading.** The view ray crosses the sheet over t = thickness / the refracted cosine (at least 0.2). The sheet's own backscatter, R∞ (1 − e^{−2ct}), is the albedo, lit from the front as the body is. The light behind it comes through as emitted radiance, e^{−ct} · E_back / π, with no body gain (it is radiance, like the sun's specular).
- **What lies behind.** E_back = F · E_sky(−n) + (1 − F) · E_wall. F is the far side's view of the sky through the tube's opening: from the outer face, the 2D view factor ½ (sin θ2 − sin θ1) of the window from the still water's horizon ahead up to the tip, seen from the underside point the thickness step found (exact for an extruded tube; no rays). From the underside, the open sky (1). E_sky is the environment's irradiance at −n, plus the ambient; E_wall is R∞ of it [both provisional].
- **The sun** behind the lip adds the water's crest light, CREST_SCATTER · pow(−V·L, 4), over its own path through the sheet, t / |n·L| (at least 0.2). The height field's crest-light march never runs on the curl: the height field under a lip is the hump, not the lip. So the curl's weight-0 parts (the back, the face, the back wall) keep no crest light, while the height-field face beside the curl does: a seam in contrast the luminance check watches. A follow-up could give the curl's crest points the profile's own chord through the water as their path.
- **Caustics** stay in the column's body; the sheet's mix weighs them once by 1 − the weight.

**Measured** (2026-10-01, the M1 Air under other sessions' load, load average 23–42; the water sheet's held curl on the GPU tier, 64 components, Practice swell; `waterSheetCurlLuma`) [measured]:
- **The tongues** (the `padangCurl` probe on the owner's build, Small swell, 150 s at 1 m cells): tongues in 1,560 of 4,500 frames, one a frame at the median and up to 4. Neighbouring tongues within 12 m: 272 pairs, all on two fronts, 265 of them end to end along the crest (median 5.35 m apart) and 7 one behind the other; none on one front. Tongues after touchdown only: 49 of 2,070. 29 % of the open and post slices drawn were after touchdown, 5,382 of them part-faded.
- **The lip against the face's water** (its own pixels beside the curl, foam left out) and the back wall, linear luminance, from 7 m down the line (`curl-close`). The photographed skies set the sun: the slider's 0.1 (and 0.25) snaps to the sunset sky, an orange sun 6° up, and 0.5 to the midday sky, a white sun 48° up. Behind the lip, the back wall as drawn (the advisor's option 2):

| sun | look | lip (hue) | water (hue) | back wall | lip ÷ water | lip ÷ wall |
|---|---|---|---|---|---|---|
| behind, 6° | Classic | 0.557 (22°, amber) | 0.286 (112°) | 0.096 | 1.95 | 5.8 |
| behind, 6° | Rich | 0.634 (22°, amber) | 0.451 (33°) | 0.173 | 1.41 | 3.7 |
| in front, 6° | Classic | 0.235 | 0.173 | 0.131 | 1.36 | 1.8 |
| in front, 6° | Rich | 0.288 | 0.233 | 0.185 | 1.24 | 1.56 |
| behind, 48° | Classic | 0.284 (198°) | 0.312 (158°) | 0.093 | 0.91 | 3.1 |
| behind, 48° | Rich | 0.292 (199°) | 0.302 (160°) | 0.100 | 0.97 | 2.9 |
| in front, 48° | Classic | 0.101 | 0.231 | 0.122 | 0.44 | 0.83 |
| in front, 48° | Rich | 0.118 | 0.296 | 0.157 | 0.40 | 0.75 |

  - **Against the advisor's criteria** (2026-10-01): backlit, the lip is at least 0.8× the face's water at the high sun and at least 1× at the low one; front-lit, at least 0.8× the back wall it covers. All hold but the front-lit pair at the high sun, which the advisor accepted for now: the drawn back wall there mirrors the open sky that a tube's inside can't see, so PR 6's dark throat, which dims that reflection, re-checks it. Re-checked ("The Rich throat and glow"): on the wall a formed lip covers, the lip is 1.01× it in Rich and 0.98× in Classic.
  - **The water's absorption, not the hue** (the advisor's check at a low sun): the lip's red over green against the sun's own. Sunset sun: 0.62× (Classic) and 0.56× (Rich); midday sun: 0.81× and 0.77×, against "at most about 0.8×". Amber at a low sun is right: 0.3–0.5 m of water barely filters an orange sun.
  - Before the fixes, at the high sun: with the sheet off (the fixed winding) the lip read 0.07–0.08; with R∞ of the sky behind it, 0.06 front-lit; as the owner saw it (the old winding, no sheet), 0.013–0.044, hue 228°.
  - A white sun near 15–25° up, where the classic green glow belongs, isn't among the photographed skies, so it wasn't measured.
- **The loft's cost**: the sheet's worst case, a 140 m front all open (287 slices, 279 sheets; `padangLoft`'s second test, 200 builds each, in turn). The first build searched every segment of the other run: 54.0 ms a build with the sheet against 33.3 ms without (load 25–28). The search now starts from the last point's foot and skips blocks and segments that can't even tie (exactly the same answers; a pure walk missed 713 of 8,470 library points): 49.8 against 32.5 ms in the probe (load 23–29), and 31.5–34.3 against 18.3–18.8 ms in plain node. PR 6 keeps each library frame's thickness and view factor in tables ("The Rich throat and glow", below).

## The Rich throat and glow

The spec's item 16 (Part B's PR 6), Rich only; the advisor's rulings of 2026-10-01. `src/wave/barrel/lipSheet.ts` (`throatViews` and the sheet's tables) and `src/scene/barrel/SweptBarrelMesh.ts` (`RICH_LIP_GLOW`, `RICH_THROAT`). Classic's compiled programs (plain, phase and region views) are byte-identical to the colour fix's, uniforms and cache keys included.

**The glow.** Sunlight that enters the lip's far side scatters through it and leaves toward the viewer:
- weight · (1 − foam) · (1 − F) · max(0, −n·L) · E_sun · e^{−a k d} / π, on top of the forward crest light;
- a is the water's own absorption (Pope & Fry, `WATER_ABSORPTION`), not the beam attenuation: k stands for the scattering, so c would count it twice;
- k = 8 [provisional, within the spec's 5–20; to tune by eye against backlit lips].
- It lights only where the sun is on the sheet's far side. With the sun down the crest line, the slices' normals are square to it and the glow adds nothing; with the sun higher, the underside glows.

**The dark throat.** On the inner face (points 64–112) of slices whose underside has formed, × the lift:
- **Sky and ambient light:** F_w · E + F_l · e^{−c t} · (E_sky(up) + max(0, L_y) · E_sun) + (1 − F_w − F_l) · R∞ · E.
  - F_w is the sky through the opening (the 2D view factor from the horizon up to the tip, as the sheet's). F_l is the lip's underside, from the face only: the arc from the tip round to the throat. Both are exact for an extruded tube (`throatViews`).
  - t is the lip's mean thickness over points 40–60. The rest is the tube's own water [the magnitudes provisional].
- **Reflections** only where the mirrored ray leaves the tube:
  - through the opening in the slice's plane; or
  - along the crest out of the tube's mouth before it meets the wall: |along| / |across| > L_mouth / d_wall. L_mouth is the distance along the front to the nearest slice without an underside, or the run's end; the tip's distance stands for d_wall.
- **The sun**, where its direction doesn't leave the tube by the same test: its direct light reaches the face through the lip on the slant path t / max(0.2, |n_lip · L|), e^{−c path} per channel, so red goes first (the green room); no glint.
  - n_lip is the chord over points 40–60, turned out of the water.
  - A low sun down the crest and out of the mouth is unchanged: the light down the tube.
  - With the old sky's fill light, the fill is shadowed with it. The path is provisional.
- The 2D factors underestimate the sky near the mouth, where the tube ends along the crest (the advisor: acceptable).

**The sheet's tables.** Each library frame's lip thickness, far-side view and formation are kept per case, built at first use, and blended as the profile is (`ProfileLibrary.frameBlend`).
- Over 321 blends of the library's open frames, against the exact search: the red channel's transmission through the sheet differs by 1.2 % at the 99th percentile and 1.9 % at most; the far side's view by 0.04 and 0.12 (a test holds them).
- The inner face's views move faster with the shape (0.26 at worst blended), and cost little, so the loft takes them exactly.

**Measured** (2026-10-01, the M1 Air at load average 21–29; the water sheet on the GPU tier, 64 components; `waterSheetCurlLuma` from `curl-close`) [measured]:
- **The colour fix's held curl** (Practice). Rich now, against Rich before PR 6; Classic measures as before (its program is unchanged):

| sun | lip (hue) | before | face water | lip ÷ water | back wall (all open slices) | lip ÷ wall |
|---|---|---|---|---|---|---|
| behind, 6° | 0.630 (23°) | 0.634 | 0.451 | 1.40 | 0.170 | 3.7 |
| in front, 6° | 0.269 | 0.288 | 0.233 | 1.15 | 0.182 | 1.48 |
| behind, 48° | 0.429 (190°) | 0.292 (199°) | 0.302 | 1.42 | 0.100 | 4.3 |
| in front, 48° | 0.132 | 0.118 | 0.296 | 0.45 | 0.156 | 0.85 |

  - The glow lifts the backlit lip at 48° by half, from the underside. At 6° the sun lies down the crest line and the glow adds nothing.
  - **The back wall a lip covers.** The region view used to count every open slice's throat to toe as the back wall. At this curl only 7 of its 18 open slices have a formed underside (τ 0.13–0.21 s), so most of that was the face below a throwing crest, lit as a face. It now counts only the throat to toe under a formed lip:
    - in front, 48°: lip 0.132 against wall 0.131 (1.01×) in Rich, 0.101 against 0.103 (0.98×) in Classic;
    - behind, 48°: 0.429 against 0.107 (4.0×) in Rich, 0.283 against 0.085 (3.4×) in Classic.
  - So the front-lit lip at the high sun is no longer darker than the wall it covers (Rich), and the colour fix's re-check closes on the corrected region.
- **The throat itself barely shows on these curls.** Zeroing its weight moves the wall under the lip by 0.3–3 %:
  - At Practice the curl is about 1 m high, and the tip stands almost straight above the wall. The formed slices' walls see 0.67–0.92 of their sky through the opening, the lip 0.02–0.07, and the mouth is 0.5–1.5 m away.
  - On the Medium swell (`&swell=medium`, the first held curl at 30 s: 21 open slices, all formed, τ 0.32 s, about 2 m high), the front-lit sun at 48° reaches 296 of the wall's 350 vertices through the opening, 3 out of the mouth, and is blocked at 51. The walls' sky views are 0.40/0.84/0.91 (10th/50th/90th percentile). Wall under the lip, lip ÷ wall: in front 1.04× in Rich (0.96× Classic), behind 2.8× (2.0×).
  - Young, open curls see their sky, so a dark throat waits for a lip that has come down toward the water: judge it on a Big or Reef tube (the advisor).
- **The drawn tube sat in a trench at Medium**, found here. Along that curl's middle slice the solver's water stood 1.9 m at the crest and still 1.1–1.7 m 4–10 m ahead, while the drawn face plunged to its toe at −0.38 m 2.6 m ahead, and the 0.5 H rest climbed 1.8 m back up to the solver's water by 6.3 m. The advisor ruled the forward rest for it ("Resting on the water", above), built in the colour fix's branch and merged here.

**Cost** [measured]:
- **The loft** with the sheet's tables, in its worst case (a 140 m front all open, 287 slices, plain node): 30.2 ms a build against 22.4–23.7 ms without the sheet (load 27–28). The tables take about 1.5 ms of it, the exact throat views about 1.3 ms.
- **The mesh's update**, same worst case (38,458 vertices, plain node, 400 each in turn): Classic 5.2–5.6 ms, Rich 5.8–6.3 ms (load 21–24). Rich fills three more attributes.
- **Upload:** Rich adds 12 floats a vertex (the throat's views, the tip and mouth, the ray and the lip's normal): 1.85 MB a frame at that worst case, about 110 MB/s at 60 fps on the M1.
  - The follow-up is half floats, or computing the views in the vertex shader; either would roughly halve it (the advisor).

## Every spot

The swept barrel's rollout (Part B, PR 7; the plan is `docs/superpowers/plans/2026-10-01-padang-padang-part-b-pr7.md`). A spot draws and rides the swept barrel when it is in `SWEPT_BARREL` (the owner's switch, still `['padang']`) and has a barrel transect in `BARREL_SPOTS` (`src/wave/barrel/barrelSpots.ts`): its runs' slope along the wave's path, their foot depth, its onset tables (`sliceClock.ts`) and the row its front follows crests from. Each case in the index names its spot, and a spot loads only its own.

**The Reef** [measured in the model unless said; all provisional]:
- **The join:** the game's own solver on the Reef's transect (the `spotOnset` probe: the periodicOnset method on any transect, its Kennedy onset 0.65; 10 m flat, 1:4.2, 1.5 m flat), regular waves at 14–17 s, each wave's highest over the band (8.6–7.1 m, Padang Padang's 6–5 m at 7 m, scaled) against the still depth under its crest where the fresh test first fired, the median of 12 waves:

  | Period | Band crest → onset depth (m) |
  |---|---|
  | 14 s | 0.90 → 3.69, 1.67 → 4.17, 2.41 → 4.88, 3.14 → 5.83 |
  | 15 s | 0.89 → 4.17, 1.63 → 5.12, 2.26 → 5.60 |
  | 16 s | 0.90 → 4.17, 1.68 → 5.12, 2.27 → 2.02, 2.83 → 2.98 |
  | 17 s | 0.89 → 4.17, 1.72 → 5.36, 2.46 → 2.02, 2.92 → 3.21 |

  - Drives that broke before the ledge, their onsets outnumbering their waves by more than two, are left out: the 5.5 m drive at every period and the 4.5 m drive at 15 s (25–98 onsets for 12 waves). Big Reef sets breaking before the ledge sit outside the ledge's library: a Reef behaviour question for the Reef session (the advisor).
  - At 16–17 s the 3.5 m drive first breaks at 2.0 m, against 4.9–5.6 m at 14–15 s: longer periods shoal longer before breaking.
  - The probe reproduces Padang Padang's table exactly on its transect (16 s: 1.19 → 2.61 m and 1.60 → 3.18 m).
- **The throw:** the line through the two runs, foot crest against the still depth where the face goes vertical: reef42's 2.13 m at 1.93 m (at the top's edge) and reef42_a35's 3.50 m at 5.16 m (15 m seaward of the top on the ledge's face; H/d ≈ 0.95 at the vertical in both), so d = 2.35 η − 3.07 (the advisor, 2026-10-01; provisional; a third case near A0 0.28 would test whether it is linear). No shallower than the reef's top at the tide (1.5 m + tide), which the line meets at η ≈ 1.95 m. reef42_a35 itself stays out of the index: even the advisor's `robust` trace leaves 13 of its 77 open frames flagged and its tip fit up to 6 √(g h0). A wave too small to go vertical on the ledge face plunges as it crosses onto the top, where the step has drained it (the advisor: a 0.9 m wave sees 1.0–1.2 m there, H/h ≈ 0.75–0.9). Without the floor the Practice sea's crests (0.8–0.9 m at the foot, throws at 0.73–0.81 m) never reached their throw depth over the 1.5 m top.
  The floor sits a centimetre over the top (`FLOOR_MARGIN`): the pass's Gaussian tail lifts the flat's still depth by up to 0.4 mm, so a floor at exactly the top's depth was never crossed. **Refined** after the front check below (the advisor): the floor stands for crests the solver breaks near the edge. The smallest waves cross the edge unbroken (H/h ≈ 0.4 there) and break where the inner flat shoals to about 0.73 m (H/h ≈ 0.85): depth-limited breaking on the flat, which the ledge's library would draw wrongly, so they spill as the solver's bores.
- **The front's two rules** (`BarrelSpot.front`; the advisor, 2026-10-01). The Reef takes both; Padang Padang takes the crest jumps too (#105), since its maxima jump as often:
  - **The crest jumps** (`jumpReach` 10 m). As a crest's face steepens over the ledge, its highest cell jumps forward to the ledge's edge, and the crest ahead had started a track of its own, unsized, which never joined. With the rule off, on the Practice sea at 2 m cells over 180 s: 200 jumps, 4/4/10 m ahead (10/50/90 %), 2.8/5.7/10.8 of the wave's heights. 1.5 H would catch none and 10 m catches 192, so a sized crest continues as the furthest crest within 10 m ahead of it in its column.
  - **The join past the edge** (`joinPast` 1.5 H). A sized crest past its throw depth that the solver hasn't broken may still join while it runs 1.5 of its wave heights past that depth, its lip throwing where the solver breaks it.
- **With the switch on in a test** (the Practice sea, 1.0 m at 14 s from 20°):

  | Front | Grid, window, sea | Joined (late) | Lost | Crossed unbroken | Thrown points a minute (today's lip jets on that sea) | Throws: still depth; across the crest line (+ seaward), 10/50/90 % |
  |---|---|---|---|---|---|---|
  | The floor only | 2 m cells, 40 m, 12 components, 180 s | 31 | 139 | 44 | 3.7 (11.3) | 1.51 m; −5.7/0.0/0.0 m |
  | Both rules | 2 m cells, 40 m, 12 components, 180 s | 49 (11) | 23 | 146 | 9.7 (11.3) | 1.50/1.51/1.51 m; −4.3/0.0/0.0 m |
  | The floor at exactly 1.5 m (before its margin) | 1 m cells, 160 m, 24 components, 150 s | 157 | 1685 | 0 (never crossed) | 3.2 (352.4) | 1.50 m; −53.8/−7.1/38.2 m |
  | Both rules | 1 m cells, 160 m, 24 components, 150 s | 892 (173) | 1608 | 212 | 147.6 (352.4) | 1.50/1.50/1.51 m; −4.2/−0.7/9.2 m |

  With no limit on the join's reach (a diagnostic, 2 m cells), the solver breaks 94 of the crests that cross unbroken, 4.2/26.9/35.4 m inside the crest line (10/50/90 %), 0.62 m crests in 0.73 m of still water: well onto the top, not at its edge.

  On the game's grid the jump rule raises the joins from 157 to 892. The losses stay near 1,600–1,700, but they change: without the rule they are waves lost on the ledge's lower face after 2.3 s; with it, maxima seen for 0.1 s that a crest briefly splits into (their foot crests match the joined ones'). Each sized crest was followed to its end, 150 s of sea.
- **Owed:** a small Reef case at about A0 0.09 (Practice and Small) at level 13 on the M4 Pro: its lip would be about 0.45 m, under 4 cells at level 12. Until then small waves scale the 0.21 case down, as Padang Padang's Small did before its own case. It runs over a transect that includes the shoaling inner flat, so it also shows where and how those waves break; if they curl there, they get a flat case of their own later.

**The Point** [measured in the model; all provisional]: its record in `BARREL_SPOTS`, built from three level-12 periodic cases, stand-ins until the level-13 runs owed on the M4 Pro.
- **The transect:** the 7 m foot, 1:21.5 along the contours' normal (31° off the shoreline there) to a 0.35 m flat; the front follows crests from the relaxation zone's edge (its fine zone starts 3.1–4.1 m deep).
- **The join:** the `spotOnset` probe on that transect at 9, 11, 12 and 14 s, each wave's first fresh onset (the bigger drives fire 4–8 times a wave), the median of 12 waves; the band 6–5 m.
- **The throw:** the least-squares line through the four runs, d = 1.55 + 0.95 η_foot, clamped to their 0.56–2.10 m foot crests (residuals −0.23/+0.16/+0.36/−0.30 m). a30's 14 s wave shoals further before going vertical (H/d 1.23), so the line isn't monotonic in the runs; a fit in the period too barely helps, and the game's Point grows its period with its size.
- **The cases:** A0 0.15, 0.23 and 0.30 (`periodic-point21-a15/a23/a30-l12`). Their lips are 4–6 cells at level 12, and their jets and tubes run well under Pick & Feddersen's fits (a15's jet 0.04 H² against 0.36): resolution, and small waves making small tubes, as on Padang Padang's wedge.
- **a08 is out** (A0 0.08, 9 s, the Point's Small): its face overturns and its lip falls to the water, but no tube closes through the run's end, at level 9 or 12. The Point's Small scales a15 down.
- **On its own sea** (the Practice swell at the edge, 180 s, a 40 m window): on 2 m cells the solver breaks its crests only at the shore, and today's lip throws none; on the game's 1 m cells the front joined 78 crests and threw them at 1.67–2.57 m of still depth, with 232 crossing their throw depth unbroken. Its maxima jump too (175 counted), but its record has no front rules yet.

**The Canyon:** unswept (the advisor): at ξ ≈ 0.2 and Mead & Black's 1:48–1:61 it spills, and its lip is under 2 cells even at level 13, too thin for a run to resolve. A swept barrel would need level 14 on the M4 Pro: owed, not planned. It keeps today's lip (Pick & Feddersen's jets and parcels) and, since its Big carves near-rider-sized voids, today's carve (the owner's rule: tubes wherever the physics plunges).

**The Beach:** its bar (Practice and Medium, 1:32 to the 1.6 m bar crest) goes swept, its cases owed at level 13 on the M4 Pro (1.4–1.7 cells across the lip at level 12 is unusable); Small (1:77) and Big (1:66) spill like the Canyon and stay unswept, with today's lip.

**Today's lip at the unswept spots** [measured: the `everySpot` probe's `PART=throws`, each Surf-screen swell's 180 s at mid tide, seed 1; voids and the opening under the flying lip at the median / 90th percentile / largest]:

| Spot | Swell (Hs, Tp) | Lip jets a minute | Rollers a minute | Jet heights (10/50/90 %) | Void, length × width | Opening under the lip | Wall |
|---|---|---|---|---|---|---|---|
| Beach | Practice (1.4 m, 12 s) | 426.3 | 311.3 | 1.15/1.35/1.49 m | 1.50/1.65/1.71 × 0.63/0.71/0.73 m | 0.80/1.02/1.19 m | 1273 s |
| Beach | Small (0.9 m, 9 s) | 27.7 | 207.3 | 0.34/0.41/0.47 m | 0.36/0.42/0.46 × 0.14/0.16/0.17 m | 0.01/0.02/0.23 m | 1237 s |
| Beach | Medium (1.4 m, 11 s) | 182.7 | 468.3 | 1.06/1.21/1.43 m | 1.21/1.57/1.72 × 0.49/0.66/0.72 m | 0.72/0.95/1.28 m | 1682 s |
| Beach | Big (2.4 m, 14 s) | 65.0 | 476.7 | 1.31/1.52/1.95 m | 1.60/1.96/2.01 × 0.66/0.79/0.82 m | 0.95/1.20/1.33 m | 3509 s |
| Canyon | Practice (1.4 m, 12 s) | 51.7 | 523.7 | 0.54/0.81/1.01 m | 0.64/0.77/1.33 × 0.23/0.27/0.52 m | 0.12/0.41/0.85 m | 1326 s |
| Canyon | Small (0.9 m, 9 s) | 16.3 | 27.0 | 0.36/0.50/0.77 m | 0.45/0.68/0.71 × 0.17/0.26/0.27 m | 0.05/0.31/0.56 m | 930 s |
| Canyon | Medium (1.4 m, 11 s) | 30.7 | 226.7 | 0.46/0.77/1.02 m | 0.61/0.81/0.89 × 0.22/0.29/0.32 m | 0.08/0.43/0.77 m | 1435 s |
| Canyon | Big (2.4 m, 14 s) | 80.0 | 452.7 | 1.26/1.65/2.07 m | 1.58/1.98/2.45 × 0.58/0.77/0.92 m | 0.84/1.43/1.81 m | 1520 s |

Each sea's wall time is for 180 s of sea, two probes at once, at a load of 16–39 (`uptime` before and after). The Canyon's Big and the Beach's Practice, Medium and Big carve voids near a rider's size.
