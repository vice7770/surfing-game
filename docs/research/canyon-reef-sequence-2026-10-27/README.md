# The Canyon's reef breaking in sequence (canyon-reef-sequence, 2026-10-27)

The ask (the coordinator, after #158): the reef's visible breaking line should travel down the reef from the peak like the
beach peaks' lines, not stay a 6 m patch at the peak. What stays: the reef's bed and its take-off transect point for
point, its plunging break (ray ξb 0.63–0.85), the tube off by default, and the beach peaks as they are. Measured as the
player sees it, frame by frame (`frame-probe.ts` in canyon-beach-break, now with `--foam` and the distance down the reef).

**Result.** The drawn white on the reef was half of what the solver breaks: the game's wave onsets lost most crests in the
reef's columns, so the spilling front left their white undrawn at the peak. Counting the reef's onsets in sequence
(`CANYON.reefBoreHold`, `reefCrestGap`; `?canyonReefSeq=off` for the A/B) draws the line the solver breaks: over 3 seeds
× 14 periods at Medium the drawn line, wave by wave, is typically 10 m long (6 m on main) and at most 16 m (11 m), and its
end travels as one line 19 m along shore from the peak at the median (13 m), 54 m down the reef's 70° line (37 m), 40 m or
more down it in 31 of 47 waves (22 of 50); patches beside it halve (5 % of frames, 10 %). The solver breaks 11 / 18 / 24 m.
The solver's own line, which nothing here changes, is as long as this reef makes it: its 70° line peels along shore at
about a third of the crest's speed, each column breaks for about 5 s before its bore reaches the lagoon, and the arm bends
the swell onto its peak, so the shoulder 20–35 m along shore is too small to break on the 1 m top. A longer line takes a
new bed.

## Why the drawn line was short

`front-probe.ts` (every 0.5 s, per reef column: the solver's outermost breaking cell, the drawn white's, the spilling
front's waves, every onset). In the set at 24–34 s (Medium, seed 1) the solver broke a straight crest from x −21.5 to −12.5
and on down the reef; the drawn white left x −18.5 and −16.5 to −14.5 blank for 10 s, as on every set.

A new wave starts breaking in a column when its outermost breaking cell jumps more than 5 m seaward, and the column then
waits 0.7 Tp for its next (`SurfZoneSimulation.markBreakingOnsets`, `newBreaker`). In the reef's columns that wait held a
crest's onset up behind other breaks:

- **the bore on the reef's top flickers.** Crossing the 1 m top it breaks at about B 0.3, the strength that marks it,
  drops under it for a frame or a few and comes back about 1 m on (`--flicker`: of the 155 onsets in the reef's columns in
  100 s, 25 came back within 0.1 s, 1 m shoreward of where the bore was);
- **its bores re-break in the lagoon** after a pause (e.g. x −15.5 at z −69.5, 47 m behind the line);
- **each wave's shore break** on the beach face behind the lagoon, some 19 s after it broke on the reef: some 3 s before
  the next crest but one reaches the reef (x −18.5: the shore break at z −15.5, then the crest at −137.5 3.3 s later was
  no onset).
- **and the crest before it.** A random sea's crests can follow 3–4 s apart, inside the 0.7 Tp (7.7 s) wait: seed 2 at
  62–65 s, a crest at z −145 met the last one's onsets at −110 in seven columns, whose white stayed blank for 9 s.

Each wait kept the next crest's onset out. The spilling front's waves join by onsets (`SpillingFront.observeOnset`), so
that crest's cells in those columns stayed with the old wave, whose crest had moved 100 m inshore: a cell more than
`crestReach` seaward of its owner's crest is a stray, drawn as none. A blocked crest's own flicker later counted, and kept
the next one out in turn.

**The change** (`CANYON.reefBoreHold` 1 s, `CANYON.reefCrestGap` 20 m; the reef's columns only, from its upcoast end to its
taper): a column's break that dropped out for under 1 s counts its jump from where it was last seen, not from none; a break
on the reef (within `peelReach` of the line, `canyonPeelAt`) waits 0.7 Tp only for the column's last break on the reef; and
one more than 20 m seaward of where its column last broke, inside that wait, goes to the spilling front alone, which draws
its white, while the readout's tracker still reads one onset a column a period. The physical reason: one bore is one wave, no
bore runs back seaward, and a crest breaking on the reef is a new wave whatever the bores and the shore break behind it do;
the next crest breaks about a wavelength seaward (28–60 m on the reef from Small to Big), far beyond 5 m or 20 m. With
`--flicker` again (the bore hold and the wait on the reef): 88 onsets in the reef's columns, none a bore coming back where
it was. Nothing the water does changes: at a spilling spot an onset throws no lip, so the solver's
breaking, the beach peaks and every other spot are byte-identical (the frame bars' solver lines and all the beach peaks'
lines, identical to the digit). What changes: the reef's drawn white and the foam and air it feeds, the spilling front's
waves on the reef (the roller's lenses, the rider's felt breaking ahead of a front), the reef's peel readout and the surf
report's breaks, which now count the crests that break on the reef and not their flickers. The record is handed over with
the sea (`reefOnsets.*`), and `?canyonReefSeq=off`, the old bed and every other spot carry none.

**The readout** (`canyon-size-report.ts`, Medium, seed 1, 12 periods; the tracker replayed every second as the game reads
it): main reads the reef 70 times, "closes out" 1 %, a left at 67° (median); this branch 94 times, "closes out" 3 %, a
left at 72°, nearer the 75° the frames show; crests closing out (40 m within 2 s) 2 → 1. Counting the following crests
as onsets too read "closes out" 11 % and a left at 49°: the tracker fits one wave a period, so they go to the front alone.

## Why the solver's line is short

`column-probe.ts`:

- **The peel.** The break line runs at 70° to the shore, so where a shore-parallel crest meets it moves along shore at
  c / tan 70° ≈ 0.36 c, 1.5–2 m/s (the frame probe's visible peel, 75°). The beach peaks' 40° bars peel at about 1.2 c.
- **Each column breaks for about 5 s** (`--band`: at x −10 from the line, z −96, h 1.0, to the lagoon, z −68), until its
  bore reaches the 2 m lagoon 33 m behind the line: 12 m along shore at 70°. So the white along a crest is about the peel
  speed times 5 s, 8–15 m.
- **The shoulder is too small to break.** `--hs` (Medium, seed 1, 120 s; Hs = 4σ):

  | m from the line (depth) | x −24 | −16 | −8 | 0 | 4 | 8 | 12 | 16 | 20 |
  |---|---|---|---|---|---|---|---|---|---|
  | −90 (5 m) | 1.33 | 1.32 | 1.21 | 1.03 | 0.95 | 0.88 | 0.81 | 0.77 | 0.70 |
  | −40 (2.8 m) | 1.61 | 1.57 | 1.31 | 0.93 | 0.79 | 0.68 | 0.62 | 0.56 | 0.52 |
  | 0 (1.1 m; 2.6 m at x −24, upcoast of the peak) | 1.68 | 1.79 | 1.35 | 1.13 | 0.91 | 0.87 | 0.77 | 0.69 | 0.67 |

  The waves halve down the reef already 40–90 m seaward of the line, where nothing breaks: the arm's face, whose contours
  run 20° off the waves' path and fall 1:8 along shore, bends the swell onto the peak (rays curve at about 1/(2h) times the
  along-shore slope, a 50 m radius at 3 m). One by one (zero up-crossings, 180 s, on the line and 10 m behind it): H1/3
  1.1–1.4 m at x −16 (11–12 of 26–30 waves over 0.78 h), 0.63–0.65 m at x 4 (1–2 of 34), 0.49–0.54 m at x 12 (none). A
  reef flat holds waves up to about 0.55 h and breaks them past about 0.78 h (Gourlay 1994; McCowan): the shoulder's waves
  cross the 1 m top unbroken, as the solver has them (it breaks 0–4 % of the time there). The solver's peel ends 24 m
  along shore from the peak at the median (90th 47), 69 m down the line (3 seeds × 14 periods).

## The levers tried (Medium, seed 1, 8 periods; typical / longest line, m; the end's reach from the peak along shore, m)

| | solver | drawn | |
|---|---|---|---|
| main | 8 / 15 / 16 | 5 / 10 / 8 | |
| the onsets in sequence, without the crest gap | 8 / 15 / 16 | 7 / 12 / 16 | the drawn line follows the solver's on this seed |
| + age gate 0 (rule A) | 12 / 20 / 12 | 8 / 13 / 12 | patches in 19–21 % of frames (10 %); the spread canyon-wave-r2 removed: unbroken water breaking on 7–12° faces |
| + age gate 0.35 | 9 / 13 / 18 | 9 / 13 / 13 | within one seed's noise; canyon-wave-r2's sweep: "closes out" 3 → 9 % |
| + onset 0.3 on the top behind the line | 8 / 13 / 16 | 6 / 12 / 10 | the shoulder's rise peaks at 0.18–0.28 √(g h) |
| + onset 0.2 on the top | 7 / 15 / 13 | 5 / 13 / 13 | more patches, no longer |
| main + the beach's rules behind the line (onset 0.4, rule A) | 8 / 16 | 5 / 9–10 | |
| main + Kennedy's end 0.10 / 0.07 everywhere | 8 / 14, 11 / 17 | 7 / 13, 8 / 14 | longer bores across the whole Canyon, the beach peaks too: no physical reason |

The foam drawn (dense + residual over 0.3) is the drawn line within a metre or two: the Canyon's lace lasts 6 s with its
spilling lip, as the owner asked (2026-10-11, a clean shoulder). None of the levers is a shape or a threshold taken, so the
advisor was not asked; the threshold screens are logged here.

## Frame bars (Medium, 3 seeds × 14 periods, pooled; `frame-pool.mjs`)

Per wave: its typical (median) and longest line along shore, m (90th percentiles in brackets); the share of its frames with
a patch beside the line; its end's reach from the peak while it travels as one line (no vanishing, no jump past 6 m), along
shore and down the reef's 70° line (along shore ÷ cos 70°), m; how many waves reach 40 m down it.

| | waves | typical | longest | patches | end along shore | end down the reef | ≥ 40 m down |
|---|---|---|---|---|---|---|---|
| drawn, main (`?canyonReefSeq=off`) | 50 | 6 (14) | 11 (24) | 10 % | 13 (37) | 37 (107) | 22 |
| **drawn, this branch** | 47 | **10 (15)** | **16 (23)** | **5 %** | **19 (39)** | **54 (113)** | **31** |
| foam drawn, main | 49 | 9 (15) | 15 (24) | 14 % | 16 (39) | 45 (113) | 27 |
| **foam drawn, this branch** | 48 | **11 (16)** | **18 (24)** | **5 %** | **23 (41)** | **66 (118)** | **35** |
| solver, both | 48 | 11 (16) | 18 (26) | 6 % | 24 (47) | 69 (136) | 39 |

Along shore, 40 m from the peak is past the reef's end on the beach face (38 m): 2 of 47 drawn lines get there (2 of 50 on
main), 10 of 48 of the solver's. No wave's line is 40 m wide 2 s after it starts (no close-out at the peak), either way.
The first fix alone (the bore hold and the wait on the reef, without the crest gap) gave 8 / 14 / 16 m drawn and 26 of 48
waves 40 m down the reef.

The beach peaks are unchanged: every one of their lines, solver, drawn and foam, is identical to the digit in all three
seeds (drawn: −x typical 39 m, longest 76 m; +x 44 m and 73 m), and so is the reef's solver line.

Where the drawn end still falls short of the solver's (13 of 48 waves by more than 6 m), its tip trails by the curl's
landing (0.6 √H s after the front reaches a column, then the white grows down the face over 2 s: 2–4 m at the reef's 2 m/s
peel), and a frame where the tip's newest column has no white yet ends the probe's one travelling line there.

## Frames

- **`reef-stills-s2-before-after.png`:** the set the wait hit, from above, seaward up (Medium, seed 2, 66–75 s, one frame
  a second; x −28 to 8, z −150 to −60, 3 px a metre; the bed's 1 m contours in brown). Top row, the solver's white: the
  crest breaks at the peak and its white grows to about 17 m along the crest as it peels down the reef. Middle row, the
  drawn white on main (`?canyonReefSeq=off`): a 1–2 m dot at the peak for 9 s. Bottom row, this branch: the solver's
  line, its newest metres at the tip still landing (`frame-probe.ts --stills`, `stills-rows.mjs`).
- **`main-medium-reef-strip.jpg`, `medium-reef-strip.jpg`:** the game's look (Rich, midday, the GPU tier, the water sheet
  `?inpage&waterSheet&spot=canyon&compute=gpu&graphics=ultra&swell=medium`), 10 frames 1 s apart from 110 m above the
  reef, a set from 221 s, main and this branch. The GPU's sea is its own; this set's onsets were never held up, and the two
  strips draw the same: the reef's white is a short line at the crest, 5–8 m, travelling down the reef at its slow peel
  while the beach peaks either side draw their long ^ (an earlier set, from 108.5 s, drew the same both ways too). The
  reef's line is as short as the reef makes it (above), and this branch draws it on the sets where main lost it.

## Risks

- **The reef's line stays short.** It is drawn as long as the solver breaks it, which is as long as this reef makes it:
  typically 10 m, 16 m at most, its end 19 m along shore from the peak, against the beach peaks' 39–44 m and 73–76 m. A
  line of tens of metres down the reef takes a new bed (a faster peel than 70°, or less of the swell bent onto the peak),
  which this task ruled out; the water-physics advisor should look at that before anyone tries it.
- **More of the reef is drawn, felt and read.** Its crests now join the spilling front, so their white, foam and air and
  the roller's lenses follow every crest, and the breaking a rider feels there follows the crest's front (the solver's
  behind it, none ahead; the front keeps up with the solver's tip up to its 55° cap). On main those columns were the last
  wave's, felt as the solver broke them. Riding there is the owner's to try.
- **The readout** reads the reef more often and a little slower (72°, 67°), "closes out" 3 % against 1 % (seed 1).
- **Bigger and smaller swells** were not measured frame by frame; the change is bookkeeping by the bed's own length scales
  (1 s, 20 m), but the following-crest gap assumes crests 28 m or more apart on the reef.
- **The GPU's sea** draws its own sets; the two in-game sets shot were not ones the wait held up, so the strips there
  match. The frames that show the change are the solver's (top-down stills).

## Tests

- `npx tsc --noEmit -p .`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude SurfZoneSimulation --exclude SurfZoneRunner`): TESTS_MAIN.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Cc]anyon|[Bb]arrel|[Tt]ube|…|[Ss]wim"`: TESTS_SZS.
- New: `counts the Canyon reef's onsets in sequence…` (SurfZoneSimulation: the bore's return, the shore break and a
  following crest, with and without `canyonReefSeq`, and the record handed over at the Canyon only) and
  `counts the Canyon reef's onsets as main did with ?canyonReefSeq=off…` (PhysicalMode: the switch, other spots, online
  rooms). No rider sessions.

## Tools

- `front-probe.ts`: per reef column, the solver's and the drawn white's outermost cell, B, the spilling front's waves and
  every onset; `--flicker`: every break coming back after a pause, how long and where.
- `column-probe.ts`: per column, breaking runs with depth and rise (default); `--band`: the steepest rise on the reef's face
  and top per frame; `--hs`: Hs and the waves one by one along the reef.
- `stills-rows.mjs`: the frame probe's stills of two runs as three rows (the solver's white, the drawn before, the drawn
  after), cropped and scaled.
- The frame probe (`../canyon-beach-break-2026-10-23/frame-probe.ts`) gained `--foam` and the reef's distance down its line;
  `frame-pool.mjs` pools both.

Build each with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.
