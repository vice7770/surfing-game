# Step 2: the 311 m window for `?poolSize=ref` (built 2026-11-11, opt-in)

> **Read `../ruling-15.md` with this page.** It re-reads the misses below: the lip count (bar D), the white line past u 60 and the swash speed were measured on the probe's fallback lip, which the game does not run in the pool. The face (bar A) is within scatter. The pace bar is restated to u 65 to 145.

Ruling 14's first choice, its step 1 only (`../ruling-14.md`). Read that page with this one.

**In short.** Under `?poolSize=ref` the pool's wrapped window is now 311 m wide, not 280 m. Nothing else changed: period 10.5 s, feed 1.47 m, the floor, the reef's lengths. The default pool and every other spot are untouched. The wider window did what the ruling said for the wave's height: it is now even along the reef (2.01, 2.06, 1.97 m) and the sea leaves the machine at 36.8°. But three of the bars are not met, so the 600 s run was **not** done:

- **A (size): 2.13 m.** The bar is 2.0 ± 0.1 m. It misses by 0.03 m (too big).
- **B (pace): 6.78 m/s.** Inside the bar's 6.5 to 7.2 m/s. But only 9 waves gave a reading, and the bar asks for 20.
- **D (plunge): 55.6 %.** The bar is 90 %. This is a real miss, and it has a new cause (see "Bar D" below). Today's pool reads 87.1 % by the same count, so today's pool misses too.

Nothing was tuned to hit a bar (no feed, factor or direction change).

## What was built

- `?poolSize=ref` on the straight Barrel floor: the window is 311 m (280 × 1.11). The grid is 311 columns of 1 m.
- `?poolWindow=<metres>` (dev switch, 240 to 400): another width, read only together with `?poolSize=ref`. `?poolSize=ref&poolWindow=280` is the first build again.
- The sea's direction is not set by hand. It follows from the width: 36.8° at the feed (the probe's first line shows it).
- `POOL.alongShore` is still 280. `SurfMeter.ts` is not touched. The 10 s join row is not touched. Online rooms stay on the default (they pin `poolSize`; the width is not a new config field of its own under the switch, so no new pin was needed).

## The bars

Solver only. No riders. No tube library in the probe. Each run is 300 s on the solver's clock. The bars are read on the waves from 60 to 180 s. "Today" is the default pool's 1.8 m Barrel with no switch. "Ref 280" is `?poolSize=ref&poolWindow=280` (the first build).

| Bar | Target | Today | Ref 280 | Ref 311 | Ref 311 result |
|---|---|---|---|---|---|
| Sea's direction at the feed | 36.8° (follows) | 39.1° | 41.8° | 36.8° | as the ruling said |
| A. The reef's own largest face per wave, median | 2.0 ± 0.1 m | 1.68 m | 2.00 m | **2.13 m** (1.91 to 2.33; 12 waves) | **miss** by 0.03 m |
| A. The surf meter (report only) | none | 1.76 m | 2.25 m | 2.23 m | reported |
| B. Peel, u 65 to 175, median (waves from 60 to 270 s) | 6.5 to 7.2 m/s, at least 20 waves | 6.33 (5 waves) | 6.21 (15 waves) | **6.78** (9 waves) | speed inside; **wave count misses** |
| B. The same, waves of 60 to 180 s only | | 6.33 (5) | 6.23 (10) | 6.68 (4) | reported |
| B. Peel, u 40 to 65 (apart) | none | 10.6 | 10.3 | 9.7 | reported |
| B. Peel, u 65 to 120 / u 120 to 175 | none | 5.1 / 8.9 | 6.5 / 6.5 | 8.9 / 5.1 | reported (uneven) |
| C. Foot crest at the knee, as read | 1.20 m ± 5 % | 1.03 m | 1.11 m | 1.14 m (about 1.21 with the probe's 6 %) | **pass** (see note 1) |
| C. First break's depth | 2.1 ± 0.15 m | 1.83 m | 1.97 m | **1.85 m** | **miss** by 0.10 m (shallow) |
| D. Lip thrown at the reef, per column per wave, u 40 to 110 | at least 90 % | 87.1 % (548 of 629) | 67.7 % (409 of 604) | **55.6 %** (341 of 613) | **miss** |
| D. Second break line near the beach, onsets on u 40 to 110 (apart) | none | 118 (0.19 per reef wave), z -10 | 367 (0.61), z -11 | 343 (0.56), z -12 | reported |
| E. Wall 10 / 20 / 30 m ahead, height | none | 1.34 / 1.33 / 1.30 m | 1.46 / 1.39 / 1.31 m | 1.55 / 1.50 / 1.47 m | reported |
| E. The same as a share of bar A's face | none | 0.80 / 0.79 / 0.78 | 0.73 / 0.70 / 0.66 | 0.73 / 0.71 / 0.69 | reported |
| E. Steepest slope 10 / 20 / 30 m ahead | none | 12° / 10° / 8° | 13° / 10° / 8° | 14° / 10° / 9° | reported |
| F. Finite | yes | yes | yes | yes | **pass** |
| F. Fastest water, waves of 60 to 180 s | at most 8.02 m/s | 6.56 | 7.15 | **8.01** | **pass, at the limit** |
| F. Fastest water, whole run (27 to 300 s) | (the same limit) | 7.00 | 7.15 | **8.12** | over the limit (see note 2) |
| F. Least water on the reef top | report | 0.14 m | 0.09 m | 0.14 m | reported |
| F. Along-reef current behind the reef, 60 to 180 s | report | -0.05 m/s | -0.12 | -0.11 | reported |
| F. The same, 27 to 127 s, then 127 to 227 s | report | -0.04, -0.01 | -0.11, -0.15 | -0.08, -0.16 | reported (it grows) |
| Height on the platform at s 65 / 120 / 175 | even | 1.86 / 2.11 / 1.92 m | 2.42 / 2.04 / 1.84 m | 2.01 / 2.06 / 1.97 m | even, as the ruling said |
| Drift, 480 to 600 s against 60 to 180 s | within 10 % | | | **not run** | skipped: A, B, D do not all pass |

Notes.

1. **The foot crest.** The probe reads about 6 % under the game's own tracks (step 1's note). As read, 1.14 m is the bar's lower edge. With the 6 % it is 1.21 m. Along the reef it is not even: 1.25, 1.28, 1.14, 1.10, 1.04 m at s 65, 90, 120, 150, 175.
2. **The fastest water.** In the window of the bars it is 8.01 m/s at 67.4 s, at x 65 (u 65), z -169. That is 11 m shoreward of the reef line, where the floor is 1.14 m deep. This is the same 8.01 the advisor's short run read. Later in the run there is one faster reading: 8.12 m/s at 294.6 s, at x 103, z -4. That is the beach's swash (0.44 m deep), not the reef. The limit was written from today's 6.97 m/s; this probe reads today at 7.00 over the whole run, which would make the limit 8.05. Either way 8.12 is over it. It needs the owner's or the advisor's word (ruling 14, the owner's call 4).
3. **Bar B's wave count.** 21 waves started between 60 and 270 s. All 21 lines reached u 65, 19 reached u 120, 11 reached u 150 and only 9 reached u 175. The white line's end has its median at u 148. So the bar's stretch (to u 175) is longer than most lines. The two halves also disagree (8.9 m/s on u 65 to 120, 5.1 m/s on u 120 to 175). At 280 m the line ran farther (median end u 181, 15 readings).
4. **The peel is read at a 1/30 s frame** (every solver step), as the ruling asked.
5. **Bar A.** Under 311 m all 12 of the meter's waves had their largest face at the reef. Under 280 m 4 of 12 came from the beach's line (z -16 to -19), as ruling 14 found.

## Bar D: the beach's break takes the reef's throw

This is the main new finding. It needs the advisor.

- The game throws a lip at most once per column per 0.7 of a period (`throwLip` in `src/wave/SurfZoneSimulation.ts`). The rule keeps one wave from throwing twice.
- The pool has a second break line: the beach's own break, near z -10 to -17, about 150 m shoreward of the reef line. It throws lips too.
- A wave reaches the beach in a column a little before the next wave reaches the reef in the same column. So the beach's throw takes the column's turn, and the reef's wave in that column cannot throw.
- Ruling 14 counted "jets per bin" by u only. That count is still full here: 611 jets on u 40 to 110 for 613 reef waves. But 270 of the 611 were thrown at the beach line, not the reef (today: 75 of 623; ref 280: 194 of 603).
- Counted as the ruling's bar says (reef onsets and reef throws only), ref 311 reads 100 % on u 40 to 60, then 60, 39, 26, 27, 33 % on the 10 m bins from u 60 to u 110.
- Today's pool has the same thing farther along: 100 % to u 90, then 69 % and 41 % on u 90 to 110, and 6 to 33 % on u 110 to 180.
- The wave at the reef did not get weaker. The onset faces on u 60 to 110 are 1.60 to 1.65 m, as on u 40 to 60. Where the reef does throw, the throw height is 1.53 to 1.86 m.

What this means for the player was not measured here (no tube library in the probe, no rider). Nothing was changed to fix it. Ruling 14 says not to hand-fix the inside break.

## The stills

Two stills each, on the GPU, the same camera (`curl-front`, Rich, midday), at 91 s and 151 s of stepping. The tool holds at its own moment, so the stills are not at the same instant of the wave, and the line's end was not placed at u 100.

- `still-today-91s.jpg`, `still-today-151s.jpg`: a long clean tube. The sea ahead of it is flat and pale.
- `still-ref-311-91s.jpg`, `still-ref-311-151s.jpg`: a tube of about the same length, a little taller on screen. Its leading end is folded and creased in both stills. The sea ahead is flat and pale. No dark wall shows.
- Both status files say **"water on the GPU"** (`still-ref-311-status.txt`, `still-today-status.txt`). So the GPU's wrapped path runs a grid 311 columns wide (an odd number). It was not refused and it did not fall back to the CPU.

## What changed, file by file

- `src/wave/pool.ts`: `POOL_REF.alongShore: 311`. `poolStraightRefDepth` and `poolSpot` take the window's width as an optional last value. Only the wrap's wall reads it, and that wall is off by default.
- `src/wave/SurfZoneSimulation.ts`: `alongShoreOf` returns `POOL_REF.alongShore` when ref is on. For every other config it returns what it returned before. The three `createSpot` calls pass the width on.
- `src/wave/Bathymetry.ts`: `createSpot` passes the width to `poolSpot`. Only the `'pool'` case reads it.
- `src/game/PhysicalMode.ts`: `poolWindowSwitch` (the dev switch) and `poolRefConfig(config, window)`. The width is set only when ref is on. One `createSpot` call passes the width on.
- Tests: `src/wave/poolRef.test.ts`, `src/game/PhysicalMode.test.ts`.
- Tools (not the game): `scripts/browser/headless-shot.mjs` gained `--advance=<s>,<s>` and `--first=skip`, for stills later than 31 s. `src/dev/waterSheet.ts` (the water sheet dev view) now also tells the tool how many seconds it stepped. One line.

**Why no other spot can change.** Every new branch asks `poolRefOn(config)`: true only for the pool, Barrel waves, straight floor, with `poolSize` 'ref'. `?poolWindow` is read only inside `poolRefConfig`, after that test. The unit tests hold it: without the switch, the training pool, the A-frame, an online room and a Canyon config come out the same with and without `?poolWindow`.

**What follows the width by itself** (all read `alongShoreOf`): the grid's columns (311), the machine's direction (`poolStraightDirection`), the wrap, the side reach of the lineup and of the take-off point, the scene's extents and the seabed (`PhysicalMode.start` builds them from the solver's window).

**Checked, and needs no change:**

- The floor across the wrap. A unit test reads the floor at both window edges for every row: the largest jump is 0 for the default (280), ref (311), ref with 280, and ref with the inside shelf. The reef and its slopes span x -66 to 118, so the wrap column is plain platform at any width from 240 to 400.
- `PoolScenery` (the pool's walls and hall): built from the solver's window.
- The A-frame's crest table (`crestTableFor`): the training and A-frame floors only.
- `Breaking.ts`, `PlungingLip.ts`: no window width in them.
- The GPU solve: wraps by `(ix + nx) % nx`, refuses only under 3 columns. Confirmed by the stills' status.
- `src/dev/poolStart.ts` (the training arm's tool): does not know the switch, as before.

## Known flaws

- Bars A, B (wave count) and D miss, and the first break is 0.10 m shallow. See above.
- The fastest water is at the limit in the window, and over it once late in the run.
- The along-reef current grows (-0.08 then -0.16 m/s). At 280 m it grows the same way. The drift bar was not run.
- The reef's along-line lengths are not scaled (ruling 14's second step, not asked for here). The tube's folded leading end in the stills may come from that. Not traced.
- The join table still has only its 10 s row, used as it is.
- The Surf screen still names the sizes 1.5 m and 1.8 m.

## Not measured

- The 600 s drift bar (skipped: the 60 to 180 s bars do not all pass).
- The drawn tube's height at the throw (needs the tube library).
- Anything with a rider. The owner rides.
- Frame rate at 311 columns.
- `poolFloor=inside` together with the 311 m window in the solver (the floor's unit test only).
- The Canyon byte check and fps trace (the coordinator runs them on the branch).

## For the advisor and the owner

1. Bar D: the beach's break takes the per-column throw. Is the bar still the right one, and what is the physical remedy (not a hand fix)? Today's pool has it too from u 90 on.
2. Bar A reads 2.13 m at 311 m, and 2.00 m at 280 m. The factor was not touched.
3. Bar B: most white lines end near u 148, so few waves give a reading to u 175. A shorter stretch, or more waves?
4. The fastest water: 8.01 m/s at the reef (at the limit), 8.12 m/s once at the beach's swash.
5. The first break is at 1.85 m, under the 2.1 ± 0.15 m aim. At 280 m it was 1.97 m.

## Re-run

```
npx rolldown docs/research/pool-look-reference-2026-11-11/step2/window-probe.ts -o dist/scripts/window-probe.mjs --format esm --platform node
node dist/scripts/window-probe.mjs --until 300                      # today.txt (about 9 min on the M1)
node dist/scripts/window-probe.mjs --ref --width 280 --until 300    # ref-280.txt (about 10 min)
node dist/scripts/window-probe.mjs --ref --until 300                # ref-311.txt (about 12 min)
node dist/scripts/window-probe.mjs --ref --until 600                # adds the 480 to 600 s window (not run)
npx vitest run src/wave/poolRef.test.ts src/game/PhysicalMode.test.ts
```

The stills (about 3 min each on the M1; add `&poolSize=ref` for ref):

```
node scripts/browser/headless-shot.mjs sheet --serve=<worktree> --port=5199 --out=<dir> --compute=gpu \
  --spot="pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller" \
  --shots=curl-front:rich:midday --advance=60,60 --first=skip
```

To ride it (the owner): `?spot=pool&waves=barrel&tubeSeam=blend&wallBody=stream&poolSize=ref`. The first build again: add `&poolWindow=280`.
