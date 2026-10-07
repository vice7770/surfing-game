# Crest angles before and after the square, narrow swells (2026-10-05)

**The question.** Do crests stay parallel over a 10-minute session on every spot? That is the owner's criterion (2026-10-05) for the "sideways waves" fix.

**The fix.** The Beach, Point, Reef and Canyon now take their swells square to the beach (0°) and narrow: the cos-2s exponent is s = 150 (`REFRACTED_SPREADING`, `src/game/PhysicalMode.ts`), as Padang Padang and the Wave Pool already had. Before 2026-10-05:

- the shared swells (Beach, Point, Canyon) came from 10° at s = 14.0, which is `spreadingFor(0.3)`;
- the Reef's came from 20° at s = 16.8, which is `spreadingFor(0.2)`.

**The owner's sharper rule (2026-10-06).** Waves must form straight to the beach. Their timing may be irregular, but waves must never come from more than one side, and never at the same time. So each spot below is read for three things:

- whether its crests stay within the straight reference's spread over the 10 minutes;
- whether they bend or swing beyond it;
- whether a crest ever runs two ways at once.

The Canyon's numbers are **the corner-canyon bed, being replaced for straight crests (owner, 2026-10-06)**.

## How it was measured

`scripts/crest-angle-report.ts` runs one surf zone on the CPU from the session's own start (the set run, as Surf builds it). Every run here uses the Medium swell, seed 1, 600 s and the GPU tier's 64 components.

**Two lines across shore are watched:**

- **the edge**, 5 m inside where the fine grid starts. This is what the tank's edge sends in, after the bed between the relaxation zone and the fine grid has refracted it;
- **the take-off line**, 30 m seaward of the take-off. This is what a rider waiting there sees coming.

**Each crest is fitted with a straight line.** A crest counts when it passes a line at the take-off's x: it peaks in time there and stands 0.2 Hs above still water. The probe then follows it along shore, column by column, within 3 m of where it was. It stops where the crest falls below 35 % of its height there, or 20 m from the window's open edges. A straight line z(x) is fitted to what was followed:

- the angle is that line's: **0° runs parallel to the beach**, and positive rises shoreward toward +x;
- a crest followed over less than half the watched width gives no angle (it is counted as "short");
- straightness is the RMS distance of the crest from its line, m;
- each crest's two halves along shore are also fitted on their own. Their difference, |right − left|, is the crest's **bend**: a crest that runs two ways at once has halves leaning opposite ways.

**Before and after.** "Before" overrides each spot's swell with the old one; "after" is each spot's default. Padang Padang and the Wave Pool were already square, so they have an "after" only. The Canyon's "before" runs on its new bed, so it isolates the swell's effect; the old bed's peel numbers are in the Canyon note (`docs/research/canyon-spilling-2026-10-05/README.md`).

```sh
npx rolldown scripts/crest-angle-report.ts -o dist/scripts/crest-angle-report.mjs --format esm --platform node
# after: each spot's own swell
node dist/scripts/crest-angle-report.mjs --spot <spot> --swell medium --seed 1 --seconds 600 --quiet --json <spot>-after.json
# before: the old shared swell (beach, point, canyon) and the Reef's
node dist/scripts/crest-angle-report.mjs --spot <spot> --swell medium --seed 1 --seconds 600 --quiet --direction 10 --spreading 14.0 --json <spot>-before.json
node dist/scripts/crest-angle-report.mjs --spot reef --swell medium --seed 1 --seconds 600 --quiet --direction 20 --spreading 16.8 --json reef-before.json
# the tables below
npx rolldown scripts/crest-angle-compare.ts -o dist/scripts/crest-angle-compare.mjs --format esm --platform node
node dist/scripts/crest-angle-compare.mjs --reference beach-after.json <every run's json>
```

On an 8 GB M1, running two at a time, each run took 6–7 min, and longer where the tank and window are larger:

| Spot | Grid (columns × rows) | Run time |
|---|---|---|
| Beach, Point, Canyon | 160 × 233 | 6–7 min |
| Reef | 160 × 266 | about 20 min |
| Wave Pool | 280 × 359 | 23 min |
| Padang Padang | 320 × 617 | 94 min |

The Reef's and Padang Padang's tanks are also 30 m and 25 m deep at the edge.

## The reference for straight

The Beach on the new swell is the reference: no ledge, canyon or reef turns its crests, so they show the swell's spread alone, plus its rips' bending, which stays (the owner, 2026-10-05). On its edge line, 90 % of its crests lie within these bounds:

- within 9.2° of its mean angle (+0.8°);
- with halves within 11.9° of each other, and each half within ±10.6°;
- each 100 s's mean within 3.5° of the 10 minutes' mean.

On the take-off line the bounds are 9.1°, 14.8° and ±11.6°, with each 100 s's mean within 3.2°.

Its linear sea at the zone already bends that much at times (bend p90 9.2°, at most 19.1°; `crest-angle-linear.ts`). With any directional spread, crests are finite in length: they end, split and join where the wave groups' envelope vanishes (wave-train dislocations; Nye & Berry 1974, *Proc. R. Soc. Lond. A* 336, 165–190).

A spot whose crests are as straight as the reference's has about 10 % of them past each bound. Past them in a larger share, they spread, bend or swing beyond the swell's own spread.

## The tables

From `crest-angle-compare.ts`, against the Beach after the change. Each run is named spot-before or spot-after. The angles are degrees, and the straightness is metres. Straightness grows with the window's width: the Beach, Point, Reef and Canyon follow crests over 120 m, the Wave Pool over 240 m and Padang Padang over 280 m, so their metres do not compare directly.

### The edge line

Reference beach-after: mean 0.8°; 90th percentiles |angle − mean| 9.2°, |right − left| 11.9°, |half| 10.6°; largest |100 s mean − mean| 3.5°.

| Run | Swell | Crests (short) | Mean ° | Mean \|angle\| ° | Max \|angle\| ° | Std ° | First 3 \|angle\| ° | Later \|angle\| ° | \|angle\| per 100 s ° | Mean per 100 s ° | Straightness m | Bend mean / max ° |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| beach-before | 10°, s 14 | 52 (0) | 0.9 | 7.2 | 22.6 | 8.4 | 6.5 | 7.2 | 7.2 · 7.6 · 6.0 · 8.0 · 4.7 · 9.6 | 2.5 · -5.4 · 3.1 · 2.9 · -0.5 · 3.4 | 2.22 | 10.9 / 42.1 |
| beach-after | 0°, s 150 | 50 (0) | 0.8 | 4.3 | 19.2 | 5.8 | 4.9 | 4.3 | 3.2 · 9.3 · 3.8 · 3.6 · 1.8 · 5.3 | 2.9 · -2.7 · 2.5 · 0.1 · 0.7 · 0.4 | 0.97 | 4.9 / 19.1 |
| point-before | 10°, s 14 | 48 (0) | 5.7 | 7.4 | 22.6 | 7.2 | 9.5 | 7.2 | 7.8 · 6.4 · 7.6 · 10.5 · 5.9 · 6.2 | 4.8 · 5.5 · 7.6 · 7.2 · 5.4 · 3.2 | 1.86 | 10.4 / 32.1 |
| point-after | 0°, s 150 | 51 (0) | 6.1 | 6.3 | 13.9 | 3.8 | 9.5 | 6.1 | 7.4 · 3.8 · 7.6 · 5.1 · 6.5 · 6.8 | 7.4 · 3.1 · 7.6 · 4.7 · 6.5 · 6.6 | 0.79 | 3.7 / 25.1 |
| reef-before | 20°, s 17 | 32 (0) | -7.7 | 11.2 | 32.1 | 10.4 | 8.3 | 11.5 | 11.7 · 10.8 · 12.4 · 11.5 · 9.4 · 10.5 | -8.5 · -10.8 · -6.5 · -2.8 · -9.4 · -8.5 | 3.51 | 10.8 / 32.6 |
| reef-after | 0°, s 150 | 32 (0) | -0.0 | 5.1 | 23.9 | 7.6 | 5.1 | 5.1 | 5.0 · 8.6 · 4.0 · 0.9 · 5.5 · 6.6 | 2.6 · -4.6 · 4.0 · 0.3 · -2.1 · -1.4 | 3.01 | 8.7 / 25.3 |
| canyon-before | 10°, s 14 | 37 (12) | -16.7 | 17.8 | 43.1 | 14.1 | 12.8 | 18.2 | 11.0 · 28.3 · 10.3 · 18.7 · 11.8 · 19.1 | -9.2 · -28.3 · -7.9 · -15.6 · -11.8 · -19.1 | 3.71 | 17.5 / 51.1 |
| canyon-after | 0°, s 150 | 44 (4) | -20.0 | 20.0 | 40.2 | 11.2 | 5.0 | 21.1 | 13.7 · 30.3 · 18.8 · 25.7 · 18.1 · 13.6 | -13.7 · -30.3 · -18.8 · -25.7 · -18.1 · -13.6 | 4.31 | 23.9 / 46.3 |
| padang-after | 0°, s 150 | 33 (0) | 0.0 | 3.2 | 15.9 | 4.6 | 1.2 | 3.4 | 1.2 · 4.1 · 4.1 · 2.5 · 2.7 · 4.8 | 0.5 · -1.2 · -0.7 · 2.2 · 0.6 · -2.0 | 3.15 | 4.7 / 13.4 |
| pool-after | 0°, s 24 | 60 (0) | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.0 | 3.50 | 11.4 / 12.6 |

Against the reference:

| Run | Tilt (mean) ° | Std ° (reference 5.8) | Further from its mean than 9.2° | Largest swing, \|100 s mean − mean\| ° (reference 3.5) | Bend past 11.9° | Two ways at once (halves past ±10.6°) |
|---|---|---|---|---|---|---|
| beach-before | 0.9 | 8.4 | 31 % (16/52) | 6.3 | 35 % (18/52) | 0 |
| beach-after | 0.8 | 5.8 | 8 % (4/50) | 3.5 | 8 % (4/50) | 0 |
| point-before | 5.7 | 7.2 | 21 % (10/48) | 2.4 | 42 % (20/48) | 0 |
| point-after | 6.1 | 3.8 | 0 % (0/51) | 3.1 | 4 % (2/51) | 0 |
| reef-before | -7.7 | 10.4 | 25 % (8/32) | 4.8 | 41 % (13/32) | 0 |
| reef-after | -0.0 | 7.6 | 13 % (4/32) | 4.6 | 25 % (8/32) | 1 (450 s: -10.9° / 11.7°) |
| canyon-before | -16.7 | 14.1 | 68 % (25/37) | 11.6 | 57 % (21/37) | 2 (124 s: -17.3° / 11.8°; 411 s: -31.5° / 11.4°) |
| canyon-after | -20.0 | 11.2 | 50 % (22/44) | 10.3 | 80 % (35/44) | 1 (497 s: -33.5° / 12.8°) |
| padang-after | 0.0 | 4.6 | 6 % (2/33) | 2.2 | 6 % (2/33) | 0 |
| pool-after | 0.0 | 0.0 | 0 % (0/60) | 0.0 | 15 % (9/60) | 0 |

### The take-off line

Reference beach-after: mean 0.8°; 90th percentiles |angle − mean| 9.1°, |right − left| 14.8°, |half| 11.6°; largest |100 s mean − mean| 3.2°.

| Run | Swell | Crests (short) | Mean ° | Mean \|angle\| ° | Max \|angle\| ° | Std ° | First 3 \|angle\| ° | Later \|angle\| ° | \|angle\| per 100 s ° | Mean per 100 s ° | Straightness m | Bend mean / max ° |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| beach-before | 10°, s 14 | 52 (0) | 1.1 | 7.0 | 21.8 | 8.2 | 6.3 | 7.0 | 7.1 · 7.4 · 6.0 · 8.0 · 4.0 · 9.5 | 2.7 · -5.1 · 3.0 · 2.9 · 0.1 · 3.3 | 2.13 | 10.6 / 40.0 |
| beach-after | 0°, s 150 | 52 (0) | 0.8 | 4.4 | 18.7 | 5.8 | 5.1 | 4.3 | 3.5 · 8.7 · 3.4 · 3.7 · 1.8 · 5.0 | 3.2 · -2.5 · 1.9 · 0.3 · 0.8 · 0.8 | 1.06 | 5.5 / 19.4 |
| point-before | 10°, s 14 | 46 (0) | 5.3 | 7.5 | 21.7 | 7.6 | 11.8 | 7.2 | 9.1 · 6.0 · 8.4 · 10.5 · 5.6 · 6.4 | 5.3 · 4.4 · 8.4 · 6.7 · 4.7 · 2.6 | 1.96 | 10.9 / 32.6 |
| point-after | 0°, s 150 | 48 (0) | 5.4 | 5.6 | 13.5 | 3.6 | 8.7 | 5.4 | 6.8 · 3.9 · 6.2 · 4.8 · 6.1 · 5.2 | 6.8 · 2.3 · 6.2 · 4.8 · 6.1 · 5.0 | 0.86 | 4.2 / 21.7 |
| reef-before | 20°, s 17 | 28 (3) | -6.4 | 9.0 | 22.0 | 8.7 | 5.4 | 9.5 | 5.8 · 6.5 · 12.6 · 9.3 · 9.9 · 10.9 | -4.5 · -5.5 · -12.6 · 1.7 · -4.8 · -10.9 | 3.14 | 10.4 / 27.6 |
| reef-after | 0°, s 150 | 34 (0) | 0.6 | 3.7 | 14.8 | 5.4 | 5.6 | 3.5 | 4.7 · 5.5 · 3.9 · 2.7 · 3.9 · 1.7 | 4.7 · -3.7 · 3.7 · -1.4 · -2.6 · 1.7 | 2.78 | 8.5 / 34.8 |
| canyon-before | 10°, s 14 | 42 (10) | -16.8 | 17.6 | 40.5 | 12.2 | 26.8 | 16.9 | 13.9 · 20.4 · 13.9 · 18.4 · 16.5 · 21.0 | -11.8 · -18.9 · -13.9 · -17.8 · -16.5 · -21.0 | 2.32 | 12.8 / 41.2 |
| canyon-after | 0°, s 150 | 44 (9) | -19.8 | 20.1 | 38.8 | 10.9 | 4.3 | 21.2 | 13.6 · 27.6 · 18.3 · 26.1 · 19.9 · 16.0 | -11.9 · -27.6 · -18.3 · -26.1 · -19.9 · -16.0 | 2.26 | 13.2 / 32.3 |
| padang-after | 0°, s 150 | 34 (5) | 1.2 | 5.2 | 34.7 | 8.6 | 3.4 | 5.4 | 1.9 · 7.7 · 5.4 · 4.6 · 2.3 · 8.7 | 1.6 · 7.7 · -2.1 · 4.6 · 2.3 · -6.3 | 4.89 | 9.3 / 60.6 |
| pool-after | 0°, s 24 | 60 (0) | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.0 | 0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.0 | 2.92 | 9.5 / 10.7 |

Against the reference:

| Run | Tilt (mean) ° | Std ° (reference 5.8) | Further from its mean than 9.1° | Largest swing, \|100 s mean − mean\| ° (reference 3.2) | Bend past 14.8° | Two ways at once (halves past ±11.6°) |
|---|---|---|---|---|---|---|
| beach-before | 1.1 | 8.2 | 35 % (18/52) | 6.2 | 25 % (13/52) | 0 |
| beach-after | 0.8 | 5.8 | 10 % (5/52) | 3.2 | 10 % (5/52) | 0 |
| point-before | 5.3 | 7.6 | 24 % (11/46) | 3.1 | 28 % (13/46) | 0 |
| point-after | 5.4 | 3.6 | 0 % (0/48) | 3.0 | 4 % (2/48) | 0 |
| reef-before | -6.4 | 8.7 | 18 % (5/28) | 8.1 | 36 % (10/28) | 0 |
| reef-after | 0.6 | 5.4 | 15 % (5/34) | 4.2 | 18 % (6/34) | 0 |
| canyon-before | -16.8 | 12.2 | 50 % (21/42) | 5.0 | 31 % (13/42) | 1 (186 s: -21.8° / 19.4°) |
| canyon-after | -19.8 | 10.9 | 45 % (20/44) | 7.9 | 41 % (18/44) | 0 |
| padang-after | 1.2 | 8.6 | 18 % (6/34) | 7.5 | 12 % (4/34) | 3 (424 s: -30.1° / 24.4°; 459 s: -20.9° / 28.3°; 755 s: -31.8° / 28.8°) |
| pool-after | 0.0 | 0.0 | 0 % (0/60) | 0.0 | 0 % (0/60) | 0 |

## Reading: do crests stay parallel over 10 minutes?

**The new swells did what they were for.** Every spot that changed swells has a narrower spread now. On the edge line, the share of crests past the reference's 9.2° fell:

- at the Beach, from 31 % to 8 % (std 8.4° → 5.8°);
- at the Point, from 21 % to 0 % (std 7.2° → 3.8°);
- at the Reef, from 25 % to 13 % (std 10.4° → 7.6°);
- at the Canyon, from 68 % to 50 %.

The Reef's tilt from its old 20° swell is gone: its mean went from −7.7° (every 100 s between −2.8° and −10.8°) to −0.0°.

Spot by spot, after the change (edge line first, take-off line in brackets):

- **Beach (the reference): parallel.** The crests stay within the swell's own spread for the 10 minutes:
  - a mean of +0.8° (+0.8°), std 5.8° (5.8°);
  - no 100 s mean further than 3.5° (3.2°) from the mean;
  - no crest running two ways at once.

  Its opening tilt does not last (below).
- **Point: parallel, at a steady tilt.** The crests run +6.1° (+5.4°) to the beach's x axis, all session long: every 100 s's mean is +3.1° to +7.6°. About that tilt they are more parallel to each other than the reference's:
  - std 3.8° (3.6°);
  - none further than 9.2° from the mean;
  - a swing of 3.1° (3.0°);
  - 4 % (4 %) bent past the reference;
  - no crest running two ways at once.

  The tilt is the bed's. The Point's linear sea at the zone averages +0.59°. The headland's shoreline steps 120 m seaward across 300 m along shore (`POINT_HEADLAND`, a smoothstep). Across the followed width its contours run at 27–31° to the beach: 31.0° at x = 0 and 26.7° at x = ±60 m. They turn every crest the same way before the watched lines. That is the point's wrap, not drift.
- **Reef: no tilt or drift, but its crests bend.**
  - The mean is −0.0° (+0.6°), and the spread is near the reference's: std 7.6° (5.4°), 13 % (15 %) past 9.2°, a swing of 4.6° (4.2°).
  - But the crests are three times less straight than the Beach's: 3.01 m (2.78 m), against 0.97 m (1.06 m).
  - 25 % (18 %) of them bend past the reference. Their halves (−x / +x) lean, for example, −10° / +11°, +12° / −7° and −25° / 0° on the edge line, and −6° / +28° and +7° / −22° on the take-off line.
  - One edge crest of 32 ran two ways at once past the reference's halves: −10.9° / +11.7°, at sea time 450 s.

  The bending is made between the zone and the edge line. The Reef's linear sea there is very straight: 0.35 m, with a bend p90 of 1.5°, and 0.13 m at its take-off x. Its old 20° swell's crests bent as much or more: straightness 3.51 m and a mean bend of 10.8°, against 3.01 m and 8.7° now. Which of its features does it was not isolated: the 45° ledge, the pass at +x, or the steep forereef reflecting 16 s waves.
- **Canyon (the corner-canyon bed, being replaced for straight crests; owner, 2026-10-06): not parallel.**
  - The crests run −20.0° (−19.8°) and swing: each 100 s's mean is −13.6° to −30.3°, so the largest swing is 10.3° (7.9°) against the reference's 3.5°.
  - They have a corner. Across the edge line, the canyon's −x half averages −30.7° and the +x half −7.0°. 80 % (41 %) of crests bend past the reference, at most 46.3°, with straightness 4.31 m.
  - One edge crest ran two ways at once: −33.5° / +12.8°, at sea time 497 s.
  - The first three crests fit at −0.5°, −9.6° and −4.9°, but the corner is there from the second: its halves lean −35° / +8°, and the third's −24° / +5°. From the fourth crest, 31 s into the session (−36.7°, halves −43° / −15°), the whole crest turns: the later crests' mean |angle| is 21.1°.

  The linear sea at its zone is straight: +0.71° and 0.72 m. The old swell gave much the same (−16.7°, bend 17.5°). The swell is not the cause; the bed is. This is the shape the owner saw.
- **Padang Padang: parallel at its edge; over the reef, a few crests bend into a chevron.**
  - On the edge line (z = −360, 7.0–8.0 m deep, shallowest off the reef's peak) the crests are as parallel as the reference's: a mean of 0.0°, std 4.6°, 6 % past 9.2°, a swing of 2.2°, 6 % bent past the reference, and none running two ways.
  - On the take-off line, 30 m seaward of the take-off, they spread and swing more:
    - a mean of +1.2°, std 8.6°;
    - 18 % past 9.1°;
    - each 100 s's mean ranging from −6.3° to +7.7°, a swing of 7.5° against the reference's 3.2°;
    - 5 crests too short to fit.
  - On average their halves lean −3.3° / +3.3°: a slight chevron, its middle behind its arms.
  - Three crests of 34 bend far past the reference and run two ways at once:
    - −30.1° / +24.4° at sea time 424 s;
    - −20.9° / +28.3° at 459 s;
    - −31.8° / +28.8° at 755 s, the largest bend, 60.6°.

  The take-off line (z = −248) crosses the reef's peak. It is 4.0 m deep at x = −60, beneath the peak at (−60, −170), against 6.6 m away from it. Whether the chevrons are crests refracting over that shoal or the bigger sets breaking on it was not isolated.
- **Wave Pool: the same wave every time.** All 60 crests on both lines fit at 0.0°, ten seconds apart. Each is the machine's A-frame: a chevron whose halves lean −6.2° / +6.2° on the edge line (−5.3° / +5.3° on the take-off line), its middle seaward of its arms. Its bend, 11.4° (9.5°), sits at the reference's 90th percentile. Its halves stay inside the reference's ±10.6°, so no crest counts as running two ways at once. It is one wave with two arms, by design (`src/wave/pool.ts`).

**Does every spot meet the criterion?**

- **Yes, within the swell's own spread:** the Beach, the Point (at its steady wrap) and the Wave Pool.
- **Mostly:** the Reef and Padang Padang.
  - The Reef has no tilt and no lasting swing, but its crests bend more than the reference's, and one crest in 32 ran two ways at once.
  - Padang Padang is parallel on its edge line, but over its reef's peak 3 crests of 34 bent into a chevron.
- **No:** the Canyon's corner-canyon bed, which is being replaced.

**Two crest directions at once,** by the halves test (opposite halves, each past the reference's 90th percentile), after the change:

- on the edge line, one of 32 crests at the Reef and one of 44 at the Canyon, and none elsewhere;
- on the take-off line, three of 34 at Padang Padang, and none elsewhere.

Before the change, the Canyon's old-swell run had two on the edge line and one on the take-off line. The other spots' old-swell runs had none.

**The old swell's own tilt never reached the Beach's lines.** The old 10° swell's linear sea leaned −3.15° at the Beach's zone (19 of 53 crests positive). Its crests on the Beach's edge line averaged +0.9° instead, with 31 of 52 positive. So the old swell's mean obliquity did not reach the edge line. What reached it was the spread: crests from −22.6° to +16.8° (−21.8° to +16.2° on the take-off line). Why the obliquity was lost between the zone and the edge line was not chased, since the old swell is gone.

## The Beach's opening tilt (+4.9°) does not persist

A 30 s Beach run on the new swell had shown a mean of +4.9°, with |angle| 4.9° over the three opening crests: a one-signed tilt from a 0° swell. The 600 s run starts the same, since the runs are deterministic: its first three edge crests are +8.6°, +4.4° and +1.7°. After that the tilt does not hold:

- 29 of the 50 edge crests lean positive;
- the crests swing in groups of one sign: for example −19.2°, −11.8°, −4.8°, −3.8°, then +15.4°, +7.6°, +8.6°, +6.6°;
- each 100 s's mean is +2.9°, −2.7°, +2.5°, +0.1°, +0.7° and +0.4°;
- the mean over the 10 minutes is +0.8°.

**The +0.8° that remains comes from the swell's own draw, not from the tank.** The 64 components' directions are drawn at random from the cos-2s law (`SeaState.fromSpectrum`). For seed 1 they average −0.99° (their summed wave-number vector points at −1.18°). A crest lies across its wave's travel, so components travelling at −1.18° make crests that rise +1.18° toward +x.

The tank's own linear sea shows the same crests with no solver, relaxation zone, bed or window. `scripts/crest-angle-linear.ts` evaluates `surfZoneSea(config)` and follows its crests with the probe's rules at the zone's inner edge (z = −270), over the same 620 s. It gives:

- a mean of +0.78°, with 43 of 56 crests positive;
- opening crests of +5.4°, +4.2° and +0.7°.

So the opening set's tilt and the small mean are already in what the zone is fed. Seed 3's draw leans the other way: its components' summed wave number points at +0.60°, and its linear sea's crests average −0.98°.

The tank and bed widen the spread a little: the edge line's mean |angle| is 4.3° against the linear sea's 2.85°. They do not tilt it. The window and the zone did not need checking further.

```sh
npx rolldown scripts/crest-angle-linear.ts -o dist/scripts/crest-angle-linear.mjs --format esm --platform node
node dist/scripts/crest-angle-linear.mjs --spot beach --seed 1 --probe beach-after.json
node dist/scripts/crest-angle-linear.mjs --spot beach --seed 3 --from 170
```
