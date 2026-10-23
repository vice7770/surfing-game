# The Canyon's beach break (2026-10-23)

Branch `claude/canyon-beach-break`, from `main` at `b11d63ef`. Wave only, no riders (the owner rides), on the 8 GB M1.

## In short

- **The beach peaks break in one long, travelling line.** Medium, 3 seeds × 14 periods, read frame by frame off the water:
  the white line along a wave's crest is a typical **43–44 m** (its median over the frames it breaks), its longest
  **76–77 m** at the median (97–118 m in one wave in ten). In **50–67 %** of the waves one unbroken line travels **40 m or
  more down each arm** from the peak (the owner's 40–60 m), its end reaching 41–48 m at the median, at a visible 45–57°
  on most arms. Big runs longer (longest 105–110 m; 67–82 % of the arms past 40 m).
- **Today's main, measured the same way, breaks in a patch:** the reef's drawn white is a typical **6 m** (longest 8 m at
  the median), and one wave in 17 travels 40 m. The owner's "a couple of metres" is right. The recorded rides of 10–16 s
  and 44–84 m (#149, #156) were onset statistics joined across pauses and gaps: they measured where breaking started, not a
  line that breaks.
- **A gentler wave body:** the beach's faces start breaking at a steepest metre of **18–20°** and front/back steepness
  **1.3–2.3**, against the reef's 22–24° and 2.5–2.8 (today's main 23°, 2.8): a lower breaking onset on the bars only
  (0.40 √(gh), the reef's 0.65 pinned exactly), CPU, GPU and stage 1.
- **The cost of the long line is a wide peak:** in about seven waves in ten the line is already 40 m wide 2 s after it
  starts (the tip breaks over ±20 m before the arms peel). The screens could trade it for continuity, not have both.
- **Spilling at every size** (ξb 0.21–0.26 at the first breaks; 84–98 % under 0.4), on two planar sandbars (1:50 and 1:44,
  V contours at 40° from a tip 12 m round) on a 5 m floor, in a 400 m window (+54 % cells). The reef, its transect, its
  onset, its gate and its bars are unchanged. Its tube is off by default (`?canyonTube=on`).
- **Starts** at the upcoast beach peak: 103, 134 and 183.5 m from the waterline at Small, Medium and Big (the catch model
  catches 80–90 % of the sets there). **The bars read turquoise-green**, not white: the Canyon's sand under the water is wet
  sand (0.24/0.20/0.13), the beach above it unchanged, the rock on the reef alone.

## What the owner asked, and what changed in the brief

"Let's focus on the Canyon beach. The reef is OK; the beach itself can have a hard area where the reef is. But we also need
the rest of the beach to have stable waves. Right now the waves only collapse on the reef and don't continue along the rest
of the wave. I really don't want the Canyon to have a tube; spilling waves are supposed to be the default." His 13
decisions (sandbar A-frames peeling both ways, spilling at ξb about 0.25–0.35 on a gentle slope, the reef as it is, its tube
off by default, the beach both sides, the start at the beach peak nearest the reef, one bar, a shallow rip each side of the
reef, pale turquoise-green bars, a readout per peak, a 45–55° peel, two slightly different peaks) are the brief.

Three more asks came while the work ran, and reshaped it:

1. **A gentler wave body** ("the wave body forming and breaking; all waves look the same shape"): the breaking onset is now
   a field over the bed, the beach breaking earlier than the reef (below).
2. **The full wave must break in sequence** ("the white break interrupts and the wave never fully breaks, making a long
   ride impossible"): the main bar is now whether one breaking line travels from the peak down each arm without a gap.
3. **Measure what the player sees** ("Never, the waves are not continuous; they break on the reef and that is that. The
   breaking line is not long, maybe a couple of metres"): every acceptance bar below is read frame by frame off the water,
   not off the onset tracker.

## Today's main, as the player sees it: the old bars were misleading

`frame-probe.ts` reads, every 0.25 s, the line that is white right now along each crest: the solver's breaking (strength
over 0.3) and the white drawn (the spilling front's `drawnWhitewater`, which holds the white back ahead of the peel and
under the curl). On main (`?canyonBed=old&canyonTube=on`, b11d63ef exactly), Medium, seed 1, 14 periods:

| The reef's breaking line, today's main | Solver | Drawn (what the player sees) |
| --- | --- | --- |
| Typical line per wave (median over its frames), along shore | 10 m | **6 m** |
| Longest line per wave, median (90th) | 16 m (23 m) | **8 m (20 m)** |
| Waves whose one line travels 40 m from the peak | 3 of 15 | **1 of 17** |
| How far the line's end gets from the peak, median (90th) | 26 m (56 m) | **12 m (35 m)** |

The owner is right: the white he sees on the reef is a patch of 5–10 m. The bars recorded by #149 and #156 (rides of 10–16 s
and 44–84 m "along the breaks", the readout's "a left" 93 % of the time) were **onset statistics**: when each column first
broke, joined into one "ride" across pauses of seconds and gaps of metres. They measured where breaking starts, not a line
that breaks. Those ride numbers, the "along its breaks" metres and the per-crest peel fits should not be read as what the
player sees. The new bars (below) replace them.

**Does #156's age gate interrupt the reef?** Partly. With rule A on the reef too (`?canyonAgeJoin=0`; screens D2, E2, E4,
Medium, seed 1), its solver line runs a typical 11–13 m against 8–9 m with the gate, and its end gets 19–20 m from the peak
against 16–18 m: the gate shortens the reef's white by a third, as the coordinator suspected, but the reef's line is short
either way. The reef is the owner's to leave as it is; `?canyonAgeJoin=0` is there to ride it.

## The advisor's view (two consults, logged in `water-physics/consult-log.md`)

**First consult (the shape).** The geometry holds, with four corrections:

- **ξb along the wave's ray**, Mead & Black's orthogonal gradient: on an arm the bed climbs cos α / cos θ faster along the
  ray than along +z. Read that way the owner's 1:40–1:60 slope and his ξb 0.25–0.35 describe the same bed; the reef reads
  0.63–0.85 on the ray (plunging, as it should).
- **A gentle slope costs no extra refraction** on straight contours (Snell: only c_break / c_floor counts); the depth the
  bar rises from does. So the "shallow rip" is a 5 m floor under the beach sections (a crest turn of about 10° at
  breaking, against 16–18° from the 6 m platform; calibrated on the reef: 70° gives 48.8° against the measured fits' 48°).
- **A transverse bar and rip** (Wright & Short 1984; NIWA: bars attached to the beach, rips 150–300 m apart, surf zone
  50–150 m), not a crescentic bar (its trough would be the inner bar the owner ruled out). Tip rounded over 0.2–0.3 of a
  wavelength; never a wavelength (a round tip closes out across it).
- **260 m cannot hold two A-frames** with 45–55 m arms, two rips and the edge bands: about 400 m (340 m with 35–40 m arms).
- Also: vary only the bar's slope between the two peaks; wet sand at about 0.55 of the dry albedo (Lekner & Dorf 1988;
  Zhang & Voss 2006), switched at the run-up line, not faded in; feed the spilling front only the reef's onsets; gate the
  barrel's front to the reef; a peel tracker per arm.

**Second consult (the onset).** Per cell by bed region, not by slope or ξ (no source ties η_t^(I) to slope; it is a
calibration: Kennedy 0.65/0.15; FUNWAVE's Vincent & Briggs shoal 0.45/0.35). The face at onset: about 27–31° at 0.65,
24–27° at 0.55, 20–22° at 0.45, 16–18° at 0.35 (inferred). Start at 0.45, sweep 0.35 (0.35 risks a mushy break). Breaking
earlier, deeper, also straightens the crests (the ^ bend: 20° per side at 2 m, 12° at 3 m). Pin the reef exactly; blend
inside the rips; key the low onset by depth so Big does not close out across the floor.

**Where the build departs from the advice, measured:** θ 40° (advised 60–62°) and rule A on the beach (not advised): on the
bars the arms' swell is lower than the tip's (0.65–0.75 of it 30 m down each arm), which slows their break on its own; at
60–65°, with the reef's gate, the arms' white stalled 10–20 m from the tip. Rounding 12 m (advised 15–20). Onset 0.40,
between the advised 0.45 and the coordinator's 0.35.

## The design

Everything is the Canyon's alone; every other spot is unchanged (below).

**The bed** (`src/wave/Bathymetry.ts`, `CANYON`; `canyonSeaDepth`):

- **The reef is untouched:** its terrace, its 1:23 take-off transect from the 6 m foot at x −9, its footprint (x −37…48)
  and the 6 m platform under it, point for point (`Bathymetry.test.ts`, the old layout's pin).
- **A 5 m floor under each beach section** (`floorDepth`): the advisor's "shallow rip", which keeps the crests' turn at
  breaking near 10° where a 6 m platform gave 16–18°. It ramps down to the platform at 1:30 seaward of z −230 and back to
  6 m over the 4 m beside the reef's footprint.
- **A sandbar peak each side** (`canyonBars`): a transverse bar attached to the beach (Wright & Short 1984; NIWA), no
  trough inside (the owner's single bar). Planar on its axis from the floor to the waterline; its contours run back from
  its tip at 40° to the shore over a hyperbola rounded 12 m wide; past each arm's reach it fades over 12 m into the floor
  and the 1:15 face, the rips where the arms end.
  - **Upcoast (−x), the default start's:** tip at x −112, 1:50, arms 55 m each way: the mellower, longer one.
  - **Downcoast (+x):** tip at x 121, 1:44, arms 45 m: a little steeper and shorter (decision 13).
- **The window widens to 400 m** (`alongShore`; 260 m before). Two A-frames with 40–60 m arms, a rip either side of the
  reef and the open edges' 20 m bands need about 400 m (the advisor; transverse bars stand 150–300 m apart). Each bar ends
  clear of its edge's levelling.

**The breaking** (`canyonOnset`, `canyonJoin`; `KennedyOptions.onsetAt` and `joinAt` in `BoussinesqSolver.ts`, mirrored in
WGSL and the stage 1 indicator):

- **The beach breaks earlier** (`barOnset` 0.40 √(g h), the reef's 0.65): a lower Kennedy onset breaks a wave before its
  face steepens as far, the owner's "less steep wave body". Sourced as a calibration, not a slope law (the advisor: Kennedy
  et al. 2000 used 0.65; FUNWAVE's Vincent & Briggs shoal, a bar-like mound, 0.45; the Beach spot runs 0.35). Only where
  the bed is 3 m deep or shallower, easing back to 0.65 at 4.5 m, so Big's sets do not break across the floor.
- **The beach passes its breaking age along its crests** (`barJoin` 0: rule A, as the Beach and every other spot). The
  reef keeps #156's gate (`ageJoin` 0.5). With the gate on the bars, each part of a crest had to reach its own fresh
  threshold; the arms, lower than the tip, broke in patches.
- **The reef's onset and join are pinned exactly** over its footprint and 3 m beside it, at every depth; both fields blend
  over 8 m inside the rips. A cell where a field equals the spot's value computes exactly as before (`× 1`).
- Each field is one float per cell, uploaded with the bed (after a window shift), in the GPU's packed field buffer
  (`FIELD.ONSET`, `FIELD.JOIN`) with two flag words in the Params (no new binding).

**The look and the readout** (logic only):

- The spilling front (one direction, its upcoast gate) and the swept barrel's front now see only the reef's columns. The
  beach peaks' white and the breaking the rider feels are the solver's own, as at the Beach: the front would have withheld
  the −x arm of each A-frame.
- **The tube is off by default** (`SWEPT_BARREL` is Padang Padang's alone): the reef's curl and white are back as before
  #155. `?canyonTube=on` brings the swept tube back, on the reef's columns only. Online rooms run the default.
- **The readout follows the nearest peak** (`peelEstimate(x)`, `breakerNear(x)`, `readoutPeaks()`): on the reef its
  tracker and breaker as before; at a beach peak one tracker per arm, read as one peak when both arms peel cleanly:
  "Spilling peak, left 52° and right 47°" (`aFrameEstimate`, `lab.peel.peak`). The rider's x picks the peak in the game,
  the view's in the Wave Lab (`status.peaks`).
- **`?canyonBed=old`** is main's Canyon at b11d63ef, pinned value for value (bed, window, tank, bounds, take-offs, starts,
  curl, readout, join); with `?canyonTube=on` it is main's default exactly.

## The bars

Each size's own swell (`SWELLS`: Small Hs 0.9 m and Tp 9 s, Medium 1.4 m and 11 s, Big 2.4 m and 14 s), square, s = 150,
mid tide, calm, stage 2 on the CPU. The finalist ran 3 seeds × 14 periods a size (Big's frames 2 seeds); the screens 1 seed
× 8–12 periods. Tools: `frame-probe.ts` (the visible bars), `scripts/canyon-size-report.ts --raw` with `beach-report.ts`
(starts, ξb, the face's shape, the take-off's column), `frame-pool.mjs` (seeds pooled).

### 1. Breaking in sequence (the owner's main bar), frame by frame

"One travelling line" is a line of white that has been there every 0.25 s since the wave started breaking and whose end
never jumped ahead by more than 6 m in a frame (a jump is a patch ahead joining it), after the peak's first 1.5 s. Solver's
white; the drawn white reads the same at the beach peaks, which draw the solver's own (above).

| Medium (Hs 1.4 m, 11 s) | Today's main, the reef (drawn) | The reef now (solver / drawn) | Upcoast peak | Downcoast peak |
| --- | --- | --- | --- | --- |
| Waves | 17 | 48 / 50 | 51 | 50 |
| Breaking line per wave, typical (median over its frames) | **6 m** | 11 m / 6 m | **43 m** (90th 81) | **44 m** (90th 68) |
| Longest line per wave, median (90th) | **8 m** (20) | 18 m (26) / 11 m (24) | **77 m** (118) | **76 m** (97) |
| One line reaching 40 m from the peak, −x arm | — | — | **34 of 51 (67 %)** | **26 of 50 (52 %)** |
| …the +x arm (on the reef: down the line) | 1 of 17 | 10 of 48 / 2 of 50 | **28 of 51 (55 %)** | **25 of 50 (50 %)** |
| How far the line's end got from the peak, median (90th), −x / +x | — / 12 m (35) | — / 24 m (47) | 48 m (67) / 43 m (60) | 41 m (57) / 41 m (58) |
| Frames with a patch beside the line, median per wave | 0 % | 6 % | 17 % | 15 % |
| Its line 2 s after it starts, median; 40 m or more (closing out at the peak) | 5 m; 0 | 8 m; 0 of 47 | **49 m; 36 of 50 (72 %)** | **48 m; 35 of 49 (71 %)** |
| The arms' visible peel (the end's speed against the crest's), median by seed | 75–77° | 72–74° | −x 53–57°, +x 37–47° | −x 43–67°, +x 49–51° |

| Big (Hs 2.4 m, 14 s), 2 seeds | The reef now (solver / drawn) | Upcoast peak | Downcoast peak |
| --- | --- | --- | --- |
| Waves | 40 / 44 | 42 | 38 |
| Typical line; longest, median (90th) | 19 m; 28 m (52) / 8 m; 18 m (36) | **48 m; 110 m** (128) | **60 m; 105 m** (114) |
| One line reaching 40 m from the peak, −x / +x | — / 16 of 40 | **31 of 42 / 28 of 42** | **28 of 38 / 28 of 38** |
| Its line 2 s in, median; 40 m or more | 11 m; 0 | 63 m; 28 of 41 | 65 m; 31 of 36 |

What they say:

- **The beach peaks break in one long line**: a typical 43–44 m at Medium (the reef's drawn white: 6 m), its longest
  76–77 m at the median, 100–118 m in one wave in ten. Half to two thirds of the waves run one unbroken line 40 m or more
  down each arm (the owner's 40–60 m); the rest stop short of 40 m or break into a patch on the way.
- **The cost is the peak:** in seven waves in ten the line is already 40 m or more wide 2 s after it starts, about 20 m
  each side of the tip: the peak breaks over a wide section before the arms peel at about 45–57° (one arm of each peak
  reads slower, 60–67°, in some seeds). The screens could trade one for the other, not have both (below).
- **Big** runs longer still (longest 105–110 m, 67–82 % of the arms past 40 m), and breaks wider at the peak.
- **Which arms are weaker:** the inner arms, toward the reef (the upcoast peak's +x, 55 %; the downcoast peak's −x, 52 %),
  end in the rips beside the reef and the blend of the two breaking rules there.

**The screens** (Medium, 1 seed × 12 periods; one line ≥ 40 m from the peak, the four arms pooled; the line 2 s in ≥ 40 m):

| Candidate | Arms past 40 m | Peak 40 m wide at 2 s | Typical / longest line |
| --- | --- | --- | --- |
| The knee bars at θ 62°, reef's gate on the beach (C1), onset 0.45 | the ends got 9–22 m from where they started | — | 20–31 / 32–44 m |
| Planar bars, θ 62°, reef's gate (D1) | 0–1 of 15–16 per arm reached the bar's end | — | 18–21 / 39–40 m |
| …rule A on the beach (D2) | 0–5 of 15–16 per arm reached the bar's end | — | 27–33 / 57 m |
| θ 62°, rounding 6, rule A (G4) | 12 of 58 (21 %) | 7 of 28 (25 %) | 29–34 / 52–53 m |
| θ 55°, rounding 8, join 0.25 (H1) | 20 of 60 (33 %) | 7 of 28 (25 %) | 30–37 / 48–57 m |
| θ 50°, rounding 8, join 0.15 (H2) | 29 of 62 (47 %) | 17 of 30 (57 %) | 31–41 / 65–67 m |
| **θ 40°, rounding 12, rule A (H3, built)** | **32 of 62 (52 %)** | **19 of 29 (66 %)** | **34–42 / 71–72 m** |

### 2. The wave's shape as it starts breaking (the owner's gentler body)

The face's steepest metre and its front/back steepness ratio (the front's drop over its run against the back's: 1
symmetric, more pitched forward), at each crest's first breaks (within 5 m and 1.5 s of its start), every break measured
as it starts (`--raw`):

| | Small | Medium | Big |
| --- | --- | --- | --- |
| Today's main, the reef (seed 1) | — | 23°; 2.77 | — |
| The reef now | 22°; 2.46 | 23°; 2.67 | 24°; 2.60 |
| Upcoast peak | **18°; 1.75** | **18°; 1.83** | **20°; 1.32** |
| Downcoast peak | **18°; 2.26** | **19°; 2.04** | **19°; 1.63** |

- **The beach's faces start breaking 4–5° gentler** than the reef's, and less pitched forward (front/back 1.3–2.3 against
  2.5–2.8): the earlier onset breaks them before they stand up. 77–99 % of the beach's first breaks come on faces under
  20°, against 11–27 % of the reef's.
- The screens: 0.45 gave 20–22° (C1), 0.35 gave 17–18° (C2), with the same continuity (F against F35). 0.40 is between the
  advisor's 0.45 and the Beach's 0.35.

### 3. Breaker type, starts, steadiness

| Per peak (up / down) | Small | Medium | Big |
| --- | --- | --- | --- |
| ξb at the first breaks, along the ray (+z) | 0.22 (0.21) / 0.24 (0.24) | 0.24 (0.23) / 0.25 (0.25) | 0.23 (0.23) / 0.26 (0.25) |
| Spilling (ray ξb < 0.4, Battjes 1974) | 88 % / 84 % | 84 % / 87 % | 98 % / 92 % |
| Crests breaking on the bar (of the window's) | 85 % / 93 % | 88 % / 88 % | 93 % / 89 % |
| …starting within ±15 m of the tip | 59 % / 62 % | 50 % / 61 % | 63 % / 69 % |
| The tip's column: 90th-percentile start depth; one wave in ten breaks seaward of | 1.87 m; z −97 / 2.04 m; z −93 | 2.61 m; z −135 / 2.66 m; z −118 | 3.57 m; z −183 / 3.40 m; z −154 |

- **Spilling at every size**, ξb 0.21–0.26 at the first breaks: at the low edge of the owner's 0.25–0.35 (the bars are
  1:44–1:50; ξb rises down the arms, where the ray climbs the bar obliquely, to a median of 0.4–0.5 over all breaks).
- **The bars break steadily:** 85–93 % of the window's crests break on each bar at every size.
- Big breaks on the 5 m floor now and then: 3.9 % of the beach sections' breaks at 4.3 m or deeper (none at Small or
  Medium).

### 4. The reef, unchanged

| The reef's own breaks (`canyonPeelAt`), 3 × 14 | Small | Medium | Big |
| --- | --- | --- | --- |
| Starts, median x; within ±10 m | −18; 68 % | −19; 95 % | −22; 100 % |
| Close-outs (≥ 40 m within 2 s) | 0 | 0 | 0 |
| Readout: "closes out" / "a left" (r2: 13/87, 7/93, 10/90 %) | 10 / 90 % | 2 / 98 % | 8 / 92 % |
| Tracker's median angle (r2: 50°, 55°, 56°) | 57° | 57° | 58° |
| The face as it starts breaking | 22°; 2.46 | 23°; 2.67 | 24°; 2.60 |

The reef's bed, transect, onset and join are pinned and its numbers sit where canyon-wave-r2's did, within one window's
change of sea (the 400 m window samples the directional sea differently). Its visible line is the same with the beach
beside it as without (Medium, seed 1, the same 400 m window: typical 11 m and 7 m drawn with no beach; 11 m and 6 m with).


## Frames

Rich, midday, the GPU tier, held seas in the water sheet (`?inpage&waterSheet&spot=canyon&compute=gpu&graphics=ultra`),
10 frames 0.5 s apart along one set:

- **`main-medium-start-strip.jpg`, `main-medium-above-strip.jpg`:** today's main (`?canyonBed=old&canyonTube=on`), Medium,
  from the start camera (the spectator's overview, 70 m beside and 95 m behind the take-off, 16 m up) and from above. The
  reef's white is a patch of a few metres at the peak in every frame, and the tube's small pod.
- **`medium-start-strip.jpg`, `medium-above-strip.jpg`:** this build, Medium, the same cameras on the upcoast beach peak.
  From above the peak's white is a ^ along the crest, growing from about 25 m to 60 m across the frames, the last wave's
  white a 100 m ^ inside it down both arms; the bar between the rips reads pale turquoise, the rips darker.
- **`big-above-strip.jpg`:** Big from above: the next set's white appears at the tip (10 m) and grows to about 45 m in 4 s,
  the last one's 100 m ^ inside.
- **`medium-views-wet-dry.jpg`:** Medium, one held sea: the start view, from the start along the peak, from above and from
  the beach, with the wet sand (now, left) and the dry sand (before, right).
- **`big-views.jpg`:** Big, the same four views.

The top-down solver frames behind the frame bars (the white over η, every 0.25 s) are `frame-probe.ts --stills`.

## Crests

__CRESTS__

## The start and the catch

**The take-off** (`CANYON_TAKE_OFF_DEPTH`, refitted at the upcoast peak's tip, x −112): 0.95 + 1.11 Hs, through the depth
by which nine in ten waves had started breaking in the tip's column (1.87, 2.61 and 3.57 m measured; 1.94, 2.50 and 3.61 m
fitted). On the bar's 1:50 the take-offs lie 97, 125 and 180.5 m from the waterline. The reef keeps its own (canyon-wave-r2's
1.67 + 0.75 Hs at x −9) for its readout (`canyonReefTakeOff`).

**The starts** (`CANYON_RIDE_LINEUP`; the catch model, `catch-model.mjs`, on the tip's column, 2 seeds × 12 periods): as
far in as the sets are caught best, seaward of where one wave in ten starts breaking.

| | Small | Medium | Big |
| --- | --- | --- | --- |
| One wave in ten starts breaking | 4.5 m seaward of the take-off | 3.5 m inside it | 5 m inside it |
| Sets caught (best timing) / breaking on the paddler, at the start | 90 % / 10 % | 80 % / 0 | 86 % / 0 |
| Start, m seaward of the take-off; its depth | **6 m; 2.06 m** | **9 m; 2.68 m** | **3 m; 3.67 m** |
| Start to the waterline (main: 138, 149, 166 m) | **103 m** | **134 m** | **183.5 m** |

- The bars' sets are kinder to catch than the reef's were (33, 44 and 50 % at its starts): their faces are gentler and they
  break later on the bar.
- **The 140–180 m rule:** Medium sits 6 m inside it, Small 37 m, Big 3.5 m outside. A spilling bar breaks small waves near
  the beach and big ones far out (decision 6); holding Small at 140 m would need a steeper bar (higher ξb) or a terrace whose
  slope break made the arms stall (the knee, above).
- The rider's bounds widen with the window (x ±179). Online spawns follow the start.

## Colour and rock

- **The bars read pale turquoise-green and never glow white** (`medium-views-wet-dry.jpg`): the Canyon's sand under the
  water is wet sand, 0.24/0.20/0.13 (`SPOT_OPTICS.canyon.bedAlbedo`; dry 0.42/0.36/0.24), the advisor's Lekner & Dorf
  (1988) darkening (×0.60/0.57/0.50), with Zhang & Voss (2006) on sand seen under water. With the dry sand the same bars glow
  a pale cyan-white, the old white wedge again. It switches at the waterline, not faded in (the advisor: a fade would draw a
  white fringe). One uniform changes; no shader, texture or varying is added (no cost; the edge band keeps its 16 units).
- **The beach itself keeps its colour:** the dry sand is the seabed mesh's, not the water's albedo.
- **The rock stays on the reef:** the rock cover now reads the sand bed with the floor and the bars in it
  (`canyonSandDepth`), so relief over a bar is never rock (`rockBed.test.ts`). On the old layout the arithmetic is main's.
- Every other spot's optics are unchanged (the wet-sand physics holds anywhere: the owner's call to widen it).

## Health and cost

**Health** (the size reports' `--stability`, 3 seeds × 14 periods a size): fastest water 4.2–6.0 m/s (Small), 5.3–7.0 m/s
(Medium), 8.1–8.5 m/s (Big); Froude caps 0, 0, and 11/0/1 at Big (none in water); volumes within 0.03–0.39 %, Big's 0.45,
0.48 and 1.60 % (its seed 3, as canyon-wave-r2's 1.22 %); finite throughout. The 600 s crest runs: below.

**Cost** (`step-bench.ts`, the game's sea, 64 components, stage 2 on the CPU, 150 steps after spin-up, Medium; `cost.txt`).
Measured with five other simulations running on the M1, so the absolute times are 4× a quiet machine's; the ratios hold:

| | Cells | Step p50 (mean) | Per cell, p50 |
| --- | --- | --- | --- |
| Today's main (`?canyonBed=old&canyonTube=on`) | 117,260 | 226 ms (215) | 1.93 µs |
| This build | 180,400 (+54 %) | 363 ms (317) | 2.01 µs |
| This build without its onset and join fields | 180,400 | 379 ms (358) | 2.10 µs |

- **The cost is the window:** +54 % cells, +47 % on the mean step; per cell within the load's noise.
- **The fields cost nothing measurable** (one read per cell each, in the breaking pass).
- On the quiet M1, canyon-wave-r2 measured Medium at 53 ms: expect about 80 ms now on the CPU tier, and the GPU tier's
  solver work up by about the cells' share. Spin-up 67 → 137 s here (loaded).
- Drawing: one uniform's value changed; no shader instruction, varying or texture unit added.

## Risks

- **The peak breaks wide.** In about seven Medium waves in ten (and more at Big) the line is 40 m or more wide 2 s after
  it starts: the tip's section breaks before the arms peel. The screens traded it against the arms' continuity (θ 55°, a
  0.25 join: a quarter of the waves wide at the peak, a third of the arms past 40 m). The owner chose continuity first; if
  the wide peak reads as a close-out, `barAngle` 50 with `barJoin` 0.15 is the middle (H2).
- **The arms do not all run 40 m:** half to two thirds do at Medium; the inner arms (toward the reef) less often.
- **A per-cell onset and join in the solver** (CPU, WGSL, stage 1): a cell where a field equals the spot's value computes
  exactly as before (the reef, every other spot: unchanged, tested). The WGSL mirrors the CPU line for line; no WebGPU
  device ran it here (the owner's M4 is the first): check the Canyon on the GPU tier against `compute=cpu` once.
- **Rule A on the beach** reopens the sideways age spread the reef's gate closed (the owner's 2026-10-07 "rule A left
  alone" holds at every other spot; the Beach runs it). On the beach it is what carries the white down the arms.
- **The window is 400 m** (+54 % cells): the cost below.
- **The starts move with the size** (below): Small's start is about 110 m from the waterline, Big's about 190 m, outside
  the 140–180 m rule; a spilling beach breaks further out as the swell grows (decision 6).
- **Big breaks on the 5 m floor now and then** (3.9 % of the beach's breaks at 4.3 m or deeper).
- **ξb sits at the low edge** of the owner's 0.25–0.35 at the first breaks (0.21–0.26): steeper bars would raise it and
  the start's distance would fall.
- **The beach peaks have no roller lens, curl or roller front:** the spilling front cannot follow an A-frame (one direction,
  its upcoast gate), so they draw and feel the solver's own whitewater, as the Beach does; and with the roller on at the
  spot, the P11 roller push is off there too. The rider feels the bore's flow and the solver's breaking.
- **The crests bend over the bars** (a shallow ^ seaward of the break, the refraction that makes the peak): measured
  against the Beach below.
- **Seed noise:** the screens ran 1 seed; 15 waves an arm move a share by about 7 points a wave.
- **Not re-measured:** `SURF_FORECAST.canyon` and `PRACTICE_SURF.canyon` (the take-off moved to a beach peak); the dev bots'
  track (`server/bots/canyon-medium.bin`).

## Tests

__TESTS__

## What to ride (the owner)

Ride the Canyon, mid tide, calm, midday, Rich, recorded. Then the same with `?canyonBed=old&canyonTube=on` (main's Canyon).

1. **Medium from the start** (the upcoast peak, 134 m from the beach). Sprint about 2 s before the crest.
   - Watch the white from the take-off: does one line run down the arm you ride, 40 m or more, without gaps?
   - Go left once and right once. Is the peak a wide section (the first 2 s) before the arm peels?
   - The readout should say "Spilling peak, left … and right …".
2. **The downcoast peak** (x 121): the steeper, shorter one. Paddle there or use the Wave Lab.
3. **Big from the start** (183.5 m out). Does it spill, and does the peak close out too wide? Watch for sets breaking on
   the floor between the bars.
4. **Small from the start** (103 m out): does it spill and peel, or mush?
5. **The reef** (paddle to x −9): it should break and read as before; tube off. Then `?canyonTube=on` for the tube.
6. **The colour**: from the start and from the beach, the bars turquoise-green, no white glow; the reef grey rock.
7. **The crests** either side of the reef: square to the beach seaward, a shallow ^ over each bar near the break.
8. **The GPU tier**: the same sets with `compute=cpu` and on the GPU: the beach's white should look the same (the new
   per-cell onset and join run on both).
