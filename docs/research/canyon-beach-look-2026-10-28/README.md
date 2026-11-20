# The Canyon's beach peaks drawn and felt as the reef (canyon-beach-look, 2026-10-28)

The ask (the coordinator, after #159): the sandbar peaks from #158 drew and felt only the solver's own whitewater. Give
them what the reef has: the drawn spilling lip and curl on their breaking line, both arms, sized by the local H (a
crumbling lip, pitch then pour, small at ξb 0.21–0.26), white that travels with the line ("don't reintroduce patches"),
the tumbling roller front and foam look, the roller lenses and the push they carry, with the reef's onset bookkeeping
(#159) checked for the beach's rule A and onset 0.40. What stays: the beach peaks' bed and breaking fields, the reef, its
tube off, the beach peaks' solver lines identical to main, every other spot byte-identical, online rooms on the default.

**Result.** With the look on (the default; `?canyonBeachLook=off` for the A/B), each beach peak's onsets feed the
spilling front, one group of waves per arm, each group peeling away from its tip. The curl, the drawn white and its
frayed edges, the roller lenses, the roller front and the foam now follow each arm's line as they follow the reef's.
Medium, 3 seeds × 14 periods: the drawn line is typically 44 m at the up peak (39 m on main) and 47 m at the down peak
(44 m), the solver's own lines being 43 m and 44 m; the longest lines are unchanged (75 / 73 m, 76 / 73 m on main); the
foam's line grows from 30 m to 40 m and 35 m. Patches beside the line rise by 4 points per wave (up peak 20 → 24 %, down
17 → 21 %; over all frames 25.7 → 27.0 % and 24.2 → 24.7 %), and a few fewer waves' ends travel 40 m down an arm as one
line. At Big (seed 1) the up peak's typical line is 58 m (49 m) and its patches 39 % (42 %). The solver's lines at both
peaks and the reef's (solver and drawn) are identical to main's to the digit in every seed and at Big. The cost on this
machine, the M1 Air (corrected 2026-10-29, canyon-perf: these notes first named it an M4 Pro): 0.8 ms (Medium) to 1.0 ms
(Big) more CPU per 1/30 s step; on the GPU, the curl and roller-front meshes cost nothing measurable (under 0.1 ms) and
the roller look in the water shader about 0.9 ms from the start camera.

## The change

- **The front's groups** (`SpillingFront`, `SpillingFrontOptions.groups`): waves now belong to a group, each with its own
  direction, peel-angle cap, upcoast gate, lifetime and along-shore span. An onset joins only its own group's waves; the
  ids, the per-group wave limit and the export carry the group. Group 0 is the spot's own (the reef's), with the options'
  values, so a front without groups is the old one.
- **The beach peaks' four groups** (`SurfZoneSimulation`, `CANYON_BEACH_LOOK`): per bar (`canyonBars`), a −x arm from the
  bar's end to its tip and a +x arm from the tip to its other end, each with:
  - a 20° cap (c_b / sin 20° ≈ 2.9 c_b): the bars already peel at a visible 50–60°, and a front held to 40° or 55°
    withheld sections the solver broke ahead of it, which the frames read as patches;
  - no upcoast gate: upcoast of an arm is its tip and the other arm, whose own group draws it; counted from an arm's first
    onset, the reef's 6 m left a gap at the tip, where an A-frame's first section breaks both ways at once;
  - a 20 s lifetime, not the reef's 45 s: an arm starts a wave every 3–4 s and its break has run its arm in 10–15 s, so
    at 45 s the front kept some 60–77 beach waves live, each seeding roller lenses in its bores.
  `observeFront` routes each onset: on the reef to group 0; on a beach peak's bar (`canyonBarAt`) to its arm's group (the
  −x arm left of the tip, the +x arm right of it); elsewhere none, as on main.
- **The beach peaks' onsets counted in sequence** (the reef's #159 bookkeeping, `reefOnsets`): each bar's columns (its tip
  ± reach + taper) are a zone of their own, with the reef's bore hold (1 s) and its wait for the column's last break on its
  own bar (`canyonBarAt`), not for any break in the column. Without it the beach's re-breaking bores and shore break held
  the next crest's onsets back, and its cells became strays of the old wave (drawn as none). The beach's rule A and onset
  0.40 are the breaking field's, untouched: the bookkeeping only counts the onsets that field makes. The crest gap
  (20 m: a break that far seaward inside the wait goes to the front alone) applies on the bars as on the reef.
- **Each arm's look peels its own way:** the curl's shoulder clearing (`SpillingCurl.clearShoulder`) takes each wave's own
  direction and stops at its group's span (a beach arm's clearing had reached into the reef: its drawn white moved by a few
  frames in 14 periods); the drawn edges' young peel-side fray (`drawnEdges`, `PeelEnd.directions`) takes each column's
  owner's direction (`SpillingCurl.bandDirection`).
- **Curl capacity 56 → 72 slices** (`CURL_CAPACITY`): with both peaks breaking, Medium writes p50 24 / p90 49 slices a frame
  (3 / 7 on main) and was at 56 in 5 % of frames (13 % at Big). The ribbon's 72 + 8 cap slices × 18 points = 1440 vertices,
  inside the 1.5 k budget; the mesh's draw range is what it fills, so other spots draw what they drew.
- **The switch:** `?canyonBeachLook=off` (`canyonBeachLookSwitch`, the Canyon only) brings back main's beach peaks: no
  groups, no beach zones in the onset record; online rooms run the default (`canyonBeachLook: undefined` in main.ts's
  overrides).

Nothing the water does changes. A spilling spot's onset throws no lip, the bed and the breaking fields are untouched, and
the reef's solver line and drawn line are identical (below). What changes at the beach peaks: the drawn white and the
foam and air it feeds, the curl, the roller lenses (the rider's felt push there: on main the Canyon's roller replaced the
P11 push everywhere, but its lenses were seeded only by front waves, so the beach peaks carried no roller push at all;
born lenses 288 → 1866 at Medium), the felt breaking ahead of a front (none ahead of an arm's front, the solver's
behind), the beach peaks' peel readout (below) and the sea's handover state (the groups' waves and counters). Other
spots run none of this: the spilling front, its curl and the onset record are the Canyon's alone (`SPILLING_SPOTS`); the
curl mesh's buffers, built for the slices' capacity, hold 288 more vertices and draw what they drew.

## Frame bars (`frame-probe.ts`, `frame-pool.mjs`; per wave, pooled)

Per wave: its typical (median) and longest line along shore, m; the share of its frames with a patch beside the line; its
line 2 s after it starts; how many waves' ends travel 40 m or more from the tip as one line, each arm. Frames every 0.25 s.

**Medium, 3 seeds × 14 periods:**

| | waves | typical | longest | patches | line 2 s in | −x arm ≥ 40 m | +x arm ≥ 40 m |
|---|---|---|---|---|---|---|---|
| up peak (x −112), solver | 51 | 43 | 77 | 17 % | 49 | 34 / 51 | 28 / 51 |
| up peak, drawn, main | 51 | 39 | 76 | 20 % | 46 | 32 / 51 | 27 / 51 |
| **up peak, drawn, this branch** | 50 | **44** | **75** | **24 %** | **48** | **29 / 50** | **23 / 50** |
| up peak, foam, main | 50 | 30 | 73 | 27 % | 37 | 29 / 50 | 25 / 50 |
| **up peak, foam, this branch** | 50 | **40** | **72** | **28 %** | **47** | **27 / 50** | **24 / 50** |
| down peak (x 121), solver | 50 | 44 | 76 | 15 % | 48 | 26 / 50 | 25 / 50 |
| down peak, drawn, main | 52 | 44 | 73 | 17 % | 43 | 25 / 52 | 25 / 52 |
| **down peak, drawn, this branch** | 52 | **47** | **73** | **21 %** | **47** | **22 / 52** | **23 / 52** |
| down peak, foam, main | 49 | 30 | 66 | 25 % | 37 | 19 / 49 | 17 / 49 |
| **down peak, foam, this branch** | 48 | **35** | **68** | **20 %** | **43** | **21 / 48** | **18 / 48** |

Over all frames (not per wave), the share with a patch: up peak 25.7 → 27.0 %, down peak 24.2 → 24.7 %.

**Big, seed 1 × 10 periods:**

| | waves | typical | longest | patches | line 2 s in | −x arm ≥ 40 m | +x arm ≥ 40 m |
|---|---|---|---|---|---|---|---|
| up peak, solver | 13 | 52 | 124 | 39 % | 63 | 10 / 13 | 11 / 13 |
| up peak, drawn, main | 13 | 49 | 122 | 42 % | 57 | 11 / 13 | 11 / 13 |
| **up peak, drawn, this branch** | 14 | **58** | **118** | **39 %** | **66** | **11 / 14** | **11 / 14** |
| down peak, solver | 14 | 69 | 104 | 26 % | 67 | 10 / 14 | 11 / 14 |
| down peak, drawn, main | 14 | 66 | 103 | 30 % | 59 | 10 / 14 | 10 / 14 |
| **down peak, drawn, this branch** | 14 | **66** | **102** | **28 %** | **60** | **8 / 14** | **11 / 14** |

**Pins.** The solver's lines at both beach peaks and the reef's solver, drawn and foam lines are identical, look on and
off, to the digit, in all three Medium seeds and at Big.

**Where the drawn white misses the solver's crest** (`why-probe.ts`, down peak, Medium seed 1, every crest column-frame
where the solver breaks at the column's outermost cell, 30 713 of them): drawn 61.5 % with the look (64.9 % on main). On
main the rest was the solver's white past `crestReach` with no wave to own it (35.1 %); with the look, 1.1 % has no owner
and the rest is the look's own shape: the frayed back and toe of old white (18.2 %), the young peel-side end while its curl
lands and grows (13.7 %; 0.6 √H s and then 2 s down the face), ahead of its own front (4.8 %) and strays (0.6 %).

## The patches

The patches rise by about 4 points per wave at Medium (not at Big). Screens on Medium seed 2 (up peak / down peak, frames
with a patch per wave; main 13 % / 12 %):

- the first version (a 40° cap): 21 % / 19 %, its line 2 s in 32 m / 39 m (main 43 / 50);
- on it, the beach's curl share and ramp off (the drawn white whole as soon as the front reaches it): 23 % / 20 %; the
  drawn white aged from its front's reach instead of the wave's join (`fab802fa`, reverted): 20 % / 19 %;
- the 20° cap, kept: 16 % / 19 %, 37 m / 50 m; on it, the beach arms' shoulder clearing off: 18 % / 19 %.

So the extra patches are not the curl's landing or the shoulder: they are the front's ownership. A cell the solver breaks
seaward of its owner's crest by more than `crestReach` (a weak next crest before its onset), or one ahead of its own
front, is drawn as none, as on the reef; on main nothing owned the beach's cells, so the solver's white was drawn
wherever it broke. A faster cap leaves fewer cells ahead of a front; the 20° cap is the one change that helped.

## Cost

**CPU** (`look-load.ts`, Medium and Big seed 1, 12 periods; ms per 1/30 s step on this machine):

| | breaking + onsets + front | roller + curl | foam | whole step |
|---|---|---|---|---|
| Medium, main | 1.01 | 0.14 | 2.62 | 80.95 |
| Medium, this branch | 1.15 | 0.67 | 2.71 | 84.37 |
| Big, main | 1.02 | 0.15 | 3.16 | 149.36 |
| Big, this branch | 1.30 | 0.84 | 3.24 | 150.05 |

(The whole step is dominated by the solver, CPU here; the game runs it on the GPU.) The front's live waves: p50 41, max
60 (13 / 17 on main) at Medium; 41 / 57 (7 / 9) at Big. Curl slices: Medium p50 24, p90 49 (at the old cap of 56 in 71 of
1320 frames); Big p50 33, p90 56 (212 of 1680 frames at 56); now 72.

**The roller:** lenses born 288 → 1866 (Medium), 333 → 2566 (Big). Lens-steps with no free slot in their column
(`counts.crowded`, `ROLLER_SLOTS` 4, undrawn and unfelt that step): 7016 at Medium, 597 at Big, against none on main;
overflows (a lens yielding its slot to a newer wave's) 40 and 45.

**GPU** (`waterSheetGpuAB`, Rich, midday, `graphics=ultra`, 60 timed frames; this machine, the M1 Air; ms per frame,
median):

Between page loads the medians cannot tell the look's cost: the same page timed twice in a row moved from 34.7 to
57.7 ms, as the GPU's clock or another app's work changed (the Browser pane was hidden):

| page load, in order | start camera | from above |
|---|---|---|
| Medium, main | 32.05 | 51.29 |
| Medium, look | 34.38 | 53.12 |
| Big, look | 32.25 | 51.00 |
| Big, main | 30.88 | 47.78 |
| Medium, look, timed twice | 34.65, 57.68 | 64.65, 82.54 |

So the look's parts were timed within one page, their arms alternating frame by frame (the median of each cycle's
difference from the first arm; `waterSheetGpuAB`, 60–80 cycles):

| page, sea | arm | start camera | from above |
|---|---|---|---|
| Big, look, 48 s (the peak's line in view) | curl mesh hidden | −0.05 | −0.01 |
| | roller front hidden | −0.01 | +0.08 |
| | both hidden | −0.04 | +0.05 |
| Big, main, 48 s | both hidden | +0.02 | −0.09 |
| Medium, look, 74 s | the water shader's roller look off (`waterRollerColumns` 0) | −0.92 | +0.03 |

The meshes cost nothing measurable. The roller look's per-pixel work (`rollerGlsl.ts`: each of a column's 4 slots,
skipped where a column has no lens) now runs over the beach peaks' bores: about 0.9 ms of a 60 ms frame from the start
camera, which looks along the up peak's bores, and none from above. On main the beach peaks had no lenses.

No texture unit or uniform is added: the curl and the roller front are meshes whose draw ranges grow with what they hold,
and the roller's table is the same fixed size; the Rich water shader is untouched, so its cliff and the 16 units are where
they were.

## The readout

Each arm's peel tracker fits the onsets the bookkeeping counts, so the beach peaks' readout can move. The readout the game
gives at each tip (`peelEstimate(bar.x)`), every second (`readout-probe.ts`, Medium, seed 1, 12 periods, 133 samples):

| | both arms | one arm | mixed peaks | closes out | none | left (+x) arm, median | right (−x) arm, median |
|---|---|---|---|---|---|---|---|
| up peak, main | 2 % | 39 % | 11 % | 46 % | 3 % | 60° (28) | 36° (28) |
| up peak, this branch | 2 % | 44 % | 11 % | 44 % | 1 % | 57° (27) | 37° (35) |
| down peak, main and this branch | 8 % | 57 % | 0 % | 35 % | 0 % | 38° (84) | 36° (12) |

The down peak reads the same to the sample; the up peak reads one clean arm a little more often. The "closes out" shares
are main's own (the trackers fit both arms' first sections as they are).

## Strips

The game's look (the water sheet, `?inpage&waterSheet&spot=canyon&compute=gpu&graphics=ultra&swell=<size>`, Rich, midday),
10 frames 1 s apart; main is the same page with `&canyonBeachLook=off`. Each from above the up peak (170 m up, seaward at
the top) and from the start camera (16 m up, 95 m shoreward of the tip and 70 m to its +x side, looking out past it). The
GPU's sea is its own and both pages run the same sea, shot at the same time (from 74 s at Medium, 37 s at Big).

- `canyon-off-medium-above-strip.jpg`, `canyon-on-medium-above-strip.jpg`: the up peak breaks at its tip at +3 s and
  peels both ways. With the look its white starts as a small lip that pours and grows (+3–5 s), not main's white
  triangle; the earlier wave's bore inshore carries the roller front's crisp toe. At +0–1 s that bore shows a step at the
  tip where each arm's white ends (a few metres; main's runs through with a kink).
- `tip-bore-medium-main.jpg`, `tip-bore-medium-look.jpg`: that bore at the tip, the above strip's first frame cropped
  and doubled (about 150 m × 65 m, seaward up, the tip near the middle). Main's white bends round the tip as one. The
  look's breaks into three blocks with square ends: the −x arm's ends at the tip, the +x arm's sits some 5–10 m shoreward
  of it, and a short block between them a few metres seaward. Each arm's roller front draws its own run with a crisp toe
  and a square end, so where the solver's bore kinks at the tip the look shows a step.
- `canyon-off-medium-start-strip.jpg`, `canyon-on-medium-start-strip.jpg`: the look's white has a sharp front edge and the
  roller front's toe; main's is softer.
- `canyon-off-big-above-strip.jpg`, `canyon-on-big-above-strip.jpg`: at Big the peak's white comes about a second later
  with the look (the lip pitches before it pours: at +1–2 s main already shows a white mound, the look a fleck), then one
  ^ spreading both ways with a crisp front.
- `canyon-off-big-start-strip.jpg`, `canyon-on-big-start-strip.jpg`: the same delay at the tip (+3 s: main's white is
  there, the look's not yet); the bright streak on the face both show is the sun on the glassy face.

## Risks

- **Patches.** Per wave they rise about 4 points at Medium (20 → 24 %, 17 → 21 %), little over all frames, not at Big; and
  a few fewer waves travel 40 m down an arm as one line (29 / 23 of 50 against 32 / 27 at the up peak). The cause is the
  front's ownership (above); loosening it (`crestReach`, the ramp) would change the reef's look too, which this task kept.
- **A step at an A-frame's tip** in the bores behind the line: each arm's white and roller front end at the tip on their
  own, with square ends, so where the solver's bore kinks there the look shows a step and a short loose block
  (`tip-bore-medium-look.jpg`; seen from above, 40–50 m behind the breaking line). The frame bars measure the breaking line,
  not the bores behind it, so they do not count it. Joining the two arms' runs at the tip (one roller run across both
  groups, or tapered ends) is the obvious follow-up; not done here.
- **The roller is crowded** in some columns (7016 lens-steps at Medium with no slot): there the bore is drawn and felt
  without a lens for that step. More slots means a bigger table to the GPU; not done.
- **The young end trails.** The white at the peel-side end waits for its curl to land, as on the reef, so the newest
  2–4 m of each arm's line show no white for about a second (13.7 % of crest column-frames at the down peak).
- **The rider's feel at the beach peaks changes:** roller lenses where there were none (their push and aeration, and
  their tops in the surface the board meets, `PhysicalSurfWater`), and no breaking felt ahead of an arm's front (a short
  moment at the 20° cap: 4.8 % of crest column-frames). Riding them is the owner's.
- **The cost is the M1 Air's** (these notes first said the M1 was not measured; it was the machine measured): the look
  adds 0.8–1.0 ms of CPU a step and about 0.9 ms of GPU where the camera looks along the beach peaks' bores (the roller
  look's per-pixel work; the meshes nothing). The Canyon's frame rate on the M1 is canyon-perf's (2026-10-29).

## Shot list (the owner rides; each shot once with the default and once with `?canyonBeachLook=off`)

1. **The take-off at the up peak, Medium, watched from the start camera:** three sets breaking at the tip. Does the lip
   pitch and pour small (a crumbling lip, not a throw), about a second before the white, and does the white then travel
   down both arms as one line?
2. **A right on the −x arm and a left on the +x arm, Medium:** does the white stay with the line behind you, and is the
   shoulder ahead clean, with no blocks of white breaking off ahead or beside the line?
3. **Caught inside at the up peak:** sit or fall where the whitewater lands. Can you feel the push of the roller now?
   With the look off the beach peaks carried none.
4. **The bore at the tip:** ride or float the whitewater in near the tip, and look down from the dev camera if you can.
   Is there a step or a loose block where the two arms' bores meet (`tip-bore-medium-look.jpg`)?
5. **Big at the up peak:** the same take-off. Is the lip still small for a spilling bar, and does the line hold together
   past 40 m each way?
6. **The down peak (x 121), Medium:** one left and one right, the same questions as 2.

## Tests

- `npx tsc --noEmit -p .`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 303 files passed (30 skipped), 2898 tests passed (18 expected fail, 36 skipped). The
  bare `--exclude SurfZoneRunner` the reef's README gives did not exclude either file here: that run also ran
  `SurfZoneRunner.test.ts`, 41 passed and 2 failed (`starts the rider just outside the break line…`: 11 m, not 6;
  `reads each ride from its trace…`: still depth 0.61 m, not under 0.5). Both are Beach unit tests and fail the same on
  main's source (e9a2444b), so they predate this branch.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Cc]anyon|[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`:
  21 tests, 20 passed and 1 failed, 25 min: the reef-sequence test expected no onset record with `canyonReefSeq: false`,
  and the beach peaks' bars now keep one. Fixed (`23514b46`: the record stays with either sequence on, none with both
  off, the old bed or another spot) and the two onset-record tests rerun: passed.
- New tests: the front's groups (`SpillingFront.test.ts`: an A-frame's two arms, their ids and directions, each front
  peeling away from the tip, white withheld ahead of it, group 0 as before, the 20 s lifetime, the export and import);
  the beach peaks' breaks routed to their arms' groups, and none with the look off (`SurfZoneSimulation.test.ts`); the
  `?canyonBeachLook=off` switch (`PhysicalMode.test.ts`). No rider sessions.

## Tools

- `readout-probe.ts` (here): the readout the game gives at each beach peak's tip every second, look on or off.
- `../canyon-reef-sequence-2026-10-27/why-probe.ts`: per column-frame where the solver breaks at its crest, whether the
  drawn white is there and if not why (no owner, stray, ahead of its front, young, old fray); `--x`, `--every`, `--trace`,
  `--beach-look off`.
- `../canyon-reef-sequence-2026-10-27/look-load.ts`: per frame the curl slices, the front's live waves, the roller's
  counts, the CPU per stage and each group's onsets; `--beach-look off`.
- The frame probe (`../canyon-beach-break-2026-10-23/frame-probe.ts`) gained `--beach-look off`.

Build each with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.
