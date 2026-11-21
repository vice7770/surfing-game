# 3.5q — `?waterHeel` re-tested, matched, with the row-'4' phantom removed: no arm gives him a trim across the face

Branch `claude/straight-line-fall`, on top of 3.5p (`8ccb7b2b`). Written 2026-11-21 by the surfer-track builder
(Claude, Opus 5.5). **Measurement only: nothing under `src/` changed and no switch was added.** The coordinator's
decision on 3.5p §10 reopened `?waterHeel` for one decisive, matched measurement, because its closure (3.4 README
Part 5 on `claude/the-record`) was measured on a low-speed cell that 3.5o has since shown runs on plant row '4''s
phantom reference, and its gain was "on the glide".

The only probe edits: `3.5/straight-fall.ts` and `3.5/sharp-steer.ts` now print `weights.waterHeel` beside
`weights.plantFloor` in their `built` rows. The closure's cell is ridden with `3.3/plant.ts`, unchanged.

## The arms, and what the host built

`?waterHeel=tilt` is the datum in both places (the model's forward prediction and its reference); the rider maps it to
`DesignWeights.waterHeel = 'both'` (`AttachedRider.ts:2713`). Every arm was printed back from the live
`AttachedRider.predictor.weights` of a session built on the game's own config path (`surfZoneConfigFor` under the
page's address, then `SurfZoneRunner` for the test wave and `RideSession` for 3.5o's drive). The organic B arm is
3.5o's own population, built through that probe's `EXTRA` route; its `built` rows read `plantFloor 4.5`:

| arm | address added to the owner's | built `plantFloor` | built `waterHeel` |
|---|---|---|---|
| A | — | null | null |
| B | `&plantFloor=4.5` | 4.5 | null |
| C | `&plantFloor=4.5&waterHeel=tilt` | 4.5 | `both` |
| D | `&plantFloor=4.5&waterHeel=predict` | 4.5 | `predict` |
| E | `&plantFloor=4.5&waterHeel=ref` | 4.5 | `ref` |
| F | `&waterHeel=tilt` | null | `both` |

## 1. The test wave's 27-cell plumb ride grid, no input

Matched per cell (deterministic per cell, so the population is the grid). "Plumb share" is the share of the ride's
attached frames with the body within 3° of plumb; the old rider stays within −2.3 to +3.0° for its whole ride and is up
at ≥ 6 s in 24 of 27 (3.5p).

| arm | fell | median (range), s | paired against A | axis at the separation | rail at the last attached frame | plumb share |
|---|---|---|---|---|---|---|
| A shipped | 27 / 27 | 2.533 (2.050–3.550) | — | across, toward the downhill rail, 27 / 27 | −84.5° (−92.6 to −43.5) | 9.3 % (7.1–12.8) |
| B floor | 27 / 27 | 2.533 (2.050–3.550) | same frame 27 / 27 | the same | the same | the same |
| C floor + tilt | 27 / 27 | **0.183 (0.167–0.300)** | **sooner 27 / 27**, −2.350 (−3.350 to −1.883) | across, toward the **uphill** rail, 27 / 27 | +9.4° (+6.0 to +22.4) | 30.0 % (17.6–33.3) of a 0.18 s ride |
| D floor + predict | 27 / 27 | **1.750 (1.333–2.433)** | **sooner 23 / later 4**, −0.950 (−1.533 to +0.317) | across, toward the **uphill** rail, 27 / 27 | +88.3° (+33.5 to +98.0) | 4.8 % (3.4–6.3) |
| E floor + ref | 27 / 27 | **0.683 (0.317–0.767)** | **sooner 27 / 27**, −1.933 (−2.867 to −1.433) | across, toward the **uphill** rail, 27 / 27 | +78.1° (+23.7 to +101.4) | 10.0 % (8.9–22.2) |
| F tilt alone | 27 / 27 | 0.183 (0.167–0.300) | sooner 27 / 27, −2.350; **identical to C in 27 / 27 cells** | as C | as C | as C |

**No arm holds the line, and every datum arm reverses the fall's side.** Shipped, he spirals down the face onto the
downhill rail. With the datum in the reference (C, E, F) the reference's own ankle rest is the mounted ankle angle
(`u_ref` −12.4° in the model's sign on the first tick; `φ_ref` = the face's tilt, the board flush), the command
overshoots it to the ±14.3° range at once, and the ankle throws the plumb body toward the face: C and F are down in
0.18 s with the body at +17.6° (+14.1 to +31.8) and the board barely moved; E rolls the board onto its uphill rail.
With the datum in the prediction only (D), the body leans into the face (+18.8° at 1.0 s, +10.2 to +43.0) and the
board turns **up** the face (heading +75°, +24 to +102) and rolls over onto its uphill rail. The floor changes nothing
on this ride (B = A, C = F): the speed through the water never falls to 4.5 m/s.

## 2. Organic rides on the owner's address (3.5o's drive, steer only, seeds 1–3)

3.5o's drive (`sharp-steer.ts`, `MODE=takeoff`), seeds 1–3, 12 periods, scripts neutral / full stick left / right held
0.3–1.2 s after the stand, `STAND_HOLD=5`, 60 riders who stood. **This tree's arm A reproduces 3.5o's published shipped
population for these seeds exactly: 60 of 60 riders on the same frame**, so 3.5o's own floor population is a matched
arm B (`results/35q/organic-A-reproduction.txt`). D is the better of D and E on the test wave (§1), so it is the one
ridden here. Buckets by 3.5o's rule on arm A (`sharp-steer.md` §8); fall times in seconds after the stand; a median
counts a censored ride at its floor.

| bucket (n) | A shipped | B floor | C floor + tilt | D floor + predict |
|---|---|---|---|---|
| **sharp-steer collapse** (5) | 0.700 (0.467–0.983) | 3.717 (1.500–3.983); vs A later 5 / 5, +3.000 | 1.583 (1.000–3.767); vs A later 5 / 5, +0.883; **vs B sooner 4 / 5**, −1.867 | 2.417 (1.650–4.067); vs A later 5 / 5, +1.433; **vs B sooner 3 / 5**, −0.450 |
| slow take-offs: turn window, neutral falls too (23) | 0.750 (0.500–1.283) | 0.933; vs A 11 later / 7 sooner / 5 same, +0.000 | 0.900; 13 / 8 / 2, +0.100 | 0.900; 12 / 9 / 2, +0.017 |
| outside the turn window (9) | 2.517 (1.733–3.700) | 2.617; 4 / 5 / 0, −0.017 | 2.167; **3 / 6 / 0, −0.200** | 2.750; **4 / 5 / 0, −0.267** |
| censored on shipped (3) | 0 of 3 fell (≥ 1.333 to ≥ 3.983) | 1 of 3 fell | 1 of 3 fell (1.817 s) | 0 of 3 fell |
| neutral (20) | 16 of 20 fell, 1.108 (0.550–≥ 5.000) | 1.342; 6 / 6 / 8, +0.000 | 1.308; 6 / 8 / 6, +0.000 | 1.358; 7 / 7 / 6, +0.000 |

The riders the coordinator named:

| rider | A | B | C | D |
|---|---|---|---|---|
| seed 2 wave 1, left (collapse) | 0.700 | 3.983 | 3.767 | 4.067 |
| seed 2 wave 1, right (collapse) | 0.717 | 3.717 | **1.317** | **1.750** |
| seed 2 wave 1, neutral | 3.900 | 3.683 | 2.967 | 4.383 |
| seed 2 wave 2, left (post-turn) | 3.700 | 3.683 | 3.883 | 3.000 |
| seed 2 wave 2, right (post-turn) | 3.133 | 4.033 | 2.267 | 2.750 |

On these drives the board heads down the fall line, so the face is barely tilted across it and the datum has little
to correct. What the datum arms do here is take back part of the floor's rescue of the sharp-steer collapses (the
right turn of seed 2 wave 1 is no longer rescued), and move the post-turn falls slightly sooner. They neither help
nor harm the slow take-offs or the neutrals.

## 3. The closure's own cell (3.4 Part 5's "owner's own low cell", 18 runs)

`3.3/plant.ts` with `RIDER=new FELT=deck BODY=two ENTRIES=1,2,3,4,5,6` (three stances × six absolute entries, 9 s),
exactly as Part 5 rode it; `FLOOR=4.5` and `WHEEL=tilt` are the probe's own routes to `plantFloor` and `waterHeel`
(this probe builds the rider from options, as the closure did, so its printback is the probe's label and the host
printback above is the switch's proof). Arm A reproduces Part 5's `l-off` in 16 of 18 entries to the frame (the two
others, Compress 4 and 5, differ by 0.03 and 0.02 s on today's tree).

| arm | fell | median (range), s | three slowest entries (1–3 m/s), median | paired |
|---|---|---|---|---|
| A shipped | 18 / 18 | 1.017 (0.500–6.233) | 0.617 | — |
| B floor | 18 / 18 | 1.000 (0.533–1.417) | 0.633 | vs A: later 4 / sooner 6 / same 8, +0.000 (−4.816 to +0.033) |
| C floor + tilt | 18 / 18 | **0.433 (0.133–1.083)** | 0.133 | vs A: **sooner 18 / 18**, −0.484 (−5.533 to −0.117); vs B: **sooner 18 / 18**, −0.492 (−0.817 to −0.117) |
| F tilt alone | 18 / 18 | **0.300 (0.133–1.083)** | 0.150 | vs A: **sooner 18 / 18**, −0.475 (−5.500 to −0.117) |

**The closure's verdict survives the floor.** With the row-'4' phantom removed, `waterHeel=tilt` still more than
halves his ride on this cell (1.000 → 0.433 s, sooner in 18 of 18), as it did without the floor (Part 5: 1.033 →
0.433; today 1.017 → 0.300).

## 4. The wave-2 survivor's turn (seed 2 wave 2 left, steer alone)

Seed 2 wave 2, left, the stick alone. The turn's peak is the largest body bank 0.3–2.0 s after the stand; the climb
is the wave frame's face height times its face fraction, as 3.5o read it.

| arm | turn peak bank | at 0.50 m of climb | at 0.90 m of climb | fall |
|---|---|---|---|---|
| A shipped | **42.83° at +1.367 s** | +2.067 s, 4.24 m/s, course 48.6° | **+2.783 s, 3.31 m/s, course 46.4°** | +3.700 s |
| B floor (3.5o §8) | 42.83° at +1.367 s, identical through 1.95 s | 4.26 m/s, 49.9° | 3.03 m/s, 40.8° | +3.683 s |
| C floor + tilt | **24.21° at +1.383 s** | **never climbs to 0.50 m** (0.31 m at most after the turn) | — | +3.883 s |
| D floor + predict | 42.48° at +1.433 s | +2.200 s, 4.92 m/s, 49.4° | +2.917 s, 5.05 m/s, **course 74.5°** | **+3.000 s** |

C cuts the survivor's turn to 24° and he never climbs back up the face; D keeps the turn and carries more speed up the
face, but its line swings 28° further round by 0.90 m and he falls 0.7 s sooner.

## 5. Verdict

**No. No arm gives the new rider a straight trim across the face.** On the test wave every datum arm falls sooner
than shipped: C and F in 0.183 s (27 of 27 sooner), E in 0.683 s (27 of 27), and D, the best of them, in 1.750 s
(23 of 27 sooner, the other 4 later by at most 0.317 s), against 2.533 s shipped. All of them move the fall to the
face's side: shipped, he spirals down the face onto the downhill rail; with the datum, he is thrown at the face or turns
up it onto the uphill rail. The body is no nearer plumb (D 4.8 % of the ride within 3°, against 9.3 % shipped). The
floor is inert on this ride, so B equals A and C equals F to the frame.

**The closure's verdict survives the row-'4' fix.** On the owner's own low cell `tilt` still more than halves his ride
with the floor in (1.000 → 0.433 s, sooner in 18 of 18).

**And it costs the organic rides and the survivor's turn.** With the floor in, adding the datum takes back part of the
floor's rescue of the sharp-steer collapses (C sooner than B in 4 of 5, D in 3 of 5), moves the post-turn falls
slightly sooner (median −0.200 s and −0.267 s against shipped), cuts the survivor's turn to 24° (C) or swings its line
and drops him 0.7 s sooner (D).

So `?waterHeel` as built is not the repair for the straight-line fall, and its closure stands. **3.5p's mechanism still
stands as measured:** the balance has no trim across a face. The datum as built corrects the model's water by the
face's tilt through the heel derivatives' column; on this ride that overcorrects. A different face model was not part
of this decision.

## 6. What remains uncertain

- **Why Part 5's glide gain does not transfer.** Part 5's glide is `FaceWater` (an analytic 1.4 m, 16° face), the board
  45° off the fall line with the body placed square to the deck; this start is the Boussinesq wave with the body
  placed plumb. I did not separate which difference reverses the result.
- **One datum, as built.** Every arm here is 3.3p/3.4e's datum: the face's tilt fed through the three heel derivatives'
  column (`heelColumn`) into the prediction over the delay, the reference, or both. The filter's own model never gets
  the tilt, and the support's own tilt (the pair's weight across the face) is not part of that column. A face model
  built differently was not measured; building one would be a new switch, outside this decision.
- **The closure cell's printback** is `plant.ts`'s own label: that probe builds the rider from options, as Part 5 did.
  The switches' route to the host is proved on the game's config path by the test wave and the organic arms.
- **Feel.** A bot ride is not evidence of feel.
- **The organic population** is seeds 1–3 only; the buckets are small, and the steered arms are the full stick held
  0.3–1.2 s after the stand, never a partial one.

## 7. Reproduce

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/straight-fall.ts -o <s>/sf.mjs --format esm --platform node
    env GRID=1 EXTRA='&plantFloor=4.5&waterHeel=tilt' OUT=<s>/q-C.jsonl node --max-old-space-size=3200 <s>/sf.mjs   # D: predict, E: ref, F: tilt alone
    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sharp-steer.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/ss.mjs && cat <s>/raw.mjs >> <s>/ss.mjs
    env ADDRESS='?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&plantFloor=4.5&waterHeel=tilt' SEED=2 PERIODS=12 TURN_STEER=1 TURN_COMPRESS=0 STAND_HOLD=5 SUB_FROM=99 SUB_TO=99 OUT=<s>/o-C-s2.jsonl node --max-old-space-size=3200 <s>/ss.mjs
    ./node_modules/.bin/rolldown docs/research/new-rider/3.3/plant.ts -o <s>/pl.mjs --format esm --platform node
    env RIDER=new FELT=deck BODY=two ENTRIES=1,2,3,4,5,6 FLOOR=4.5 WHEEL=tilt OUT=<s>/l-C.jsonl node --max-old-space-size=3200 <s>/pl.mjs
