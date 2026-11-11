# Step 1: `?poolSize=ref` (built 2026-11-11, opt-in, not merged)

Ruling 13's first step (`../ruling-13.md`). The Wave Pool's straight Barrel, made 1.11 times larger. The aim was 2 m faces.

**In short:** the switch is built and the default is unchanged. The bigger pool runs 600 s without a blow-up. But it misses most of the ruling's bars. The faces come out too big at the take-off (2.3 to 2.7 m, not 2.0). The break does not speed up (6.2 m/s, not 7 to 8). The lip throws on fewer waves (56 to 60 %, against 90 to 96 % today). The wall ahead of the tube is no taller than today's. The likely cause is named below: the longer period turns the machine's wave by 2.7°. This needs the advisor before the owner rides it.

## What was built

The switch works only on the Wave Pool, Barrel waves, straight floor. Everywhere else it is ignored. Online rooms never take it.

- **Floor** (`POOL_REF` in `src/wave/pool.ts`): platform 5.0 m deep; reef crest 1.0 m deep on the barrel section; top 6.7 m wide; knee rounded over 3.3 m. The face's slope (1 in 9.5) and the back slope (1 in 10) are unchanged. The reef's lengths along its line are unchanged.
- **The knee** now sits 41.3 m seaward of the crest line. It still lies on the level platform, more than 5 m inside the platform's seaward edge, all along the reef (a unit test checks this).
- **Machine:** period 10.5 s; feed wave 1.47 m; feed depth 9 m and the tank unchanged. The period took about 10 lines to carry, so 10.5 s was kept (not the 10 s fallback).
- **Size:** the reference size replaces the Small and Big choice. Both give the same wave.
- **Take-off and start:** the first-break depth is 1.11 × the 1.8 m Barrel's (2.12 m). The rider's start is 1.11 × farther out (15.0 m).
- **Tube:** the 1.8 m case alone (`pool_straight_big`). The library scales a case by the wave's foot crest (its crest height at the foot of the face). So a foot crest 1.11 × higher draws the case 1.11 × larger and √1.11 (1.054) slower. No library data was edited. Nothing was stretched or hand-shaped.
- **Tube's transect:** foot depth 4.884 m (1.11 × 4.4). The join and throw depths scale with it. The lagged join's depths × 1.11, its ramp × 1.054.
- **`poolFloor=inside`** combines: its shelf is scaled × 1.11. **`poolFloor=ledge`** is ignored under the switch.

### What was tuned

- **Feed:** not changed from the ruling's 1.47 m. Two tuning runs were spent (1.35 m at 10.5 s; 1.47 m at 10 s). Neither was better across the bars, so the ruling's number stayed. See "The tuning runs".
- **Clock:** only the Froude factor (× 1.054), which comes by itself from the foot crest. Nothing else.
- **Fit:** the break-depth fit and the start are the big size's × 1.11. Nothing re-fitted.

## The bars

Solver only. No riders. No tube library in the probe. Settled sea from 27 s. "Today" is the 1.8 m Barrel (Big) through the same probe.

| Bar | Target | Today (1.8 m) | Ref, 174 s | Ref, 600 s | Result |
|---|---|---|---|---|---|
| A. Meter's face at the take-off | 2.0 m ± 0.1 | 1.76 m (1.67 at 600 s) | 2.32 m | 2.69 m | **miss** (too big) |
| B. Peel, u 65 to 175, median | 7.0 to 8.0 m/s | 6.45 | 6.16 | 6.25 | **miss** (slower than today) |
| B. Peel, u 40 to 65 (reported apart) | expected 9 to 11 | 10.4 | 10.4 | 8.5 | no bar |
| C. Foot crest at the knee | 1.20 m ± 5 % | 1.02 (the game reads 1.08) | 1.105 | 1.083 | **miss** as read; see note 1 |
| C. First break's depth | 2.1 m ± 0.15 | 1.62 | 1.92 | 1.84 | **miss** (0.03 to 0.11 m shallow) |
| C. No onset deeper than 3 m | none | 66 of 2488 on u 40 to 175 | 175 of 2738 | 557 of 9982 | **miss** (today misses too) |
| D. Lip jets on onsets, u 40 to 90 | at least 90 % | 96 % (90 % at 600 s) | 60 % | 56 % | **miss** |
| E. Wall 10 m ahead, share of the face | at least 0.85 | 0.77 (1.35 m) | 0.63 (1.46 m) | 0.55 (1.47 m) | **miss** |
| E. Wall 20 m ahead | at least 0.75 | 0.76 (1.34 m) | 0.60 (1.39 m) | 0.53 (1.42 m) | **miss** |
| E. Wall 30 m ahead | at least 0.65 | 0.75 (1.31 m) | 0.58 (1.36 m) | 0.49 (1.31 m) | **miss** |
| E. Steepest slope 10 / 20 / 30 m ahead | no bar | 13° / 10° / 9° | 13° / 10° / 8° | 12° / 10° / 8° | reported |
| F. 600 s without a blow-up | finite | finite | | finite | **pass** |
| F. Fastest water | at most 1.15 × today's | 6.97 m/s | 7.12 | 7.72 (1.11 ×) | **pass** |
| F. Water on the reef top in troughs | at least 0.2 m | 0.10 m | 0.09 | 0.08 | **miss** (today misses too) |
| F. Default's uniform snapshot | unchanged | | | | **pass** (the suite's snapshot tests pass untouched) |

Notes.

1. **The foot crest.** The probe reads the highest water each period at one cell where the face is as deep as the tube's foot. For today's wave it reads 1.02 m where the game's own tracks read 1.08 m. So the probe reads about 6 % low. Scaled by that, the ref wave's foot crest is about 1.17 m (174 s) or 1.15 m (600 s). That is inside 1.20 m ± 5 %. As read, it is 1.11 m, which is 8 % low. The ratio to today's is 1.05 to 1.08, against the aim of 1.11. The game's own foot crest was not read (it needs the tube library in the run).
2. **The meter's face** is the largest onset face in a 20 m band at the take-off. It does not follow the feed: 1.35 m at the feed gave 2.26 m, 1.47 m gave 2.32 m. It also grows over a long run (2.69 m in the last 2 minutes of 600 s). So the feed cannot tune bar A.
3. **The wall ahead (bar E)** is the probe's own measure: the highest water in the column 10, 20 or 30 m ahead of the white line's end, less the lowest water in the 25 m shoreward of it. The wall is 1.3 to 1.5 m tall in both builds. The share falls under ref only because the meter's face (the divisor) is bigger. The wall did not grow by 1.11.
4. **The first break** is where each wave's white first shows (u about 28, before the take-off's u 40).

## The likely cause: the wave's direction

The pool's sides wrap, with two wavelengths across the 280 m window. A longer wave must then turn more to fit. At 10 s the machine's wave leaves at 39.1°. At 10.5 s it leaves at 41.8°. The reef lies at 40°. So the wave's angle to the reef changes sign and size, and that angle sets the peel and where the height gathers.

What the runs show:

- At 10.5 s the height on the platform is uneven along the reef: 2.42 m at s 65, 2.04 m at s 120, 1.92 m at s 175 (today: 1.86, 2.11, 1.92).
- With the period put back to 10 s on the ref floor (probe only), the direction is 39.1° again, the peel is today's 6.45 m/s and the jets come back to 83 %. But the meter's face goes to 2.62 m.
- The along-reef current behind the reef grows faster under ref: 0.55 m/s by 600 s, against 0.32 today.

A true Froude copy would also need the window 1.057 × wider (296 m). The window is the machine's own and was left alone, as the ruling asked. This is a question for the advisor.

A second thing to check: the peel. Ruling 13 expected 6.45 to 7.1 m/s today and × 1.054 under ref. This probe reads 6.45 today. Even a perfect Froude copy would give 6.8 m/s, under the 7.0 bar.

## The tuning runs

| Run | Face (A) | Peel u 65 to 175 (B) | Foot crest as read (C) | Jets u 40 to 90 (D) |
|---|---|---|---|---|
| Ref, 1.47 m, 10.5 s (the build) | 2.32 m | 6.16 m/s | 1.105 m | 60 % |
| Ref, 1.35 m, 10.5 s | 2.26 m | 5.89 m/s | 1.006 m | 59 % |
| Ref, 1.47 m, 10 s (probe only) | 2.62 m | 6.45 m/s | 1.104 m | 83 % |

## The stills

One still each, the same camera (`curl-front`, Rich, midday), at about 30 s. The tool picks the moment, so the two are not the same instant of the wave.

- `still-today.jpg`: a long clean tube, about 8 to 12 m of it. Ahead of the tube the sea is flat and pale. No wall shows.
- `still-ref.jpg`: a shorter tube with a torn, spiked end on its leading side. Ahead of it the sea is again flat and pale. No dark 2 m wall shows.

So the stills agree with bar E: size alone did not put a wall ahead of the tube. The torn end under ref is one frame only. It was not traced.

## Why no other spot can change (file by file)

Every new branch asks `poolRefOn(config)`. That is true only when `poolSize` is `'ref'`, the spot is the pool, and the floor is the straight Barrel's. `poolSize` is set in one place only (`surfZoneConfigFor`), and only when the spot is the pool with Barrel waves. Without `?poolSize=ref` it is never set.

- `src/wave/pool.ts`: new constants and functions. The existing functions gained optional last parameters. Left out, each computes as before. `POOL_STRAIGHT` is not edited.
- `src/wave/Bathymetry.ts`: `createSpot` passes one more option to `poolSpot`. Only the `'pool'` case reads it. The Canyon's, the Reef's and the other spots' cases are untouched lines.
- `src/wave/SurfZoneSimulation.ts`: a new optional config field. Five uses. (1) The pool sea's period: inside the `spot === 'pool'` branch; `poolPeriodOf` returns the pool's 10 s unless ref. (2) `rideLineupOffset`: inside the pool Barrel branch; passes `'ref'` only when ref. (3) `takeOffPoint`: inside `spot === 'pool'`; the old expression is kept as the other arm. (4) Three `createSpot` calls pass the new option (see Bathymetry). (5) The tube's transect: `barrelSpotOf(config)` returns `BARREL_SPOTS[config.spot]`, the same object as before, unless the spot is the pool and ref is on.
- `src/wave/barrel/barrelLibrary.ts`: a new case list and a new value `'big'` of `poolTubeCase`. It is read only inside the `spot === 'pool'` branch of `barrelCasesFor`. `'big'` has no URL switch of its own. Only `poolRefConfig` sets it.
- `src/wave/barrel/barrelSpots.ts`: two new functions appended. `BARREL_SPOTS` itself is not edited.
- `src/game/PhysicalMode.ts`: `surfZoneConfigFor` now ends with `poolRefConfig`, which returns the same object untouched unless ref is on. The switch is read only for the pool with Barrel waves. One `createSpot` call passes the new option.
- `src/main.ts`: online rooms pin `poolSize` to undefined, as they pin `poolFloor`.

Unit tests hold this: `src/wave/poolRef.test.ts` ("leaves the default untouched") and the `?poolSize=ref` test in `src/game/PhysicalMode.test.ts` (training, the A-frame, an online room and a Canyon config all come out as without the switch). The suite's existing snapshot and uniform tests pass with no snapshot updated.

## Not measured

- The game's own foot crest (the front's tracks, with the tube library).
- Anything with a rider. The owner rides.
- The tube's drawn size and clock under ref, beyond the unit tests of the scale factors.
- `poolFloor=inside` with ref in the solver (unit-tested floor only).
- Frame rate.
- The Canyon byte check (the coordinator runs it on the branch).

## Known flaws

- The bars above: A, B, C, D and E miss.
- The machine's absorbing zone is still sized for a 10 s wave (1.75 wavelengths; 1.66 of the 10.5 s wave's). The tank is unchanged on purpose.
- The Surf screen still names the sizes 1.5 m and 1.8 m.
- The tube's other fixed lengths (the seam's bands and the like) are not scaled.
- The join table has only a 10 s row. It is used as it is at 10.5 s.
- `src/dev/poolStart.ts` (the training arm's tool) does not know the switch.

## Re-run

```
rolldown docs/research/pool-look-reference-2026-11-11/step1/ref-probe.ts -o dist/scripts/ref-probe.mjs --format esm --platform node
node dist/scripts/ref-probe.mjs                      # today.txt (about 5 min on the M4)
node dist/scripts/ref-probe.mjs --ref                # ref-147.txt
node dist/scripts/ref-probe.mjs --ref --H 1.35       # ref-135.txt
node dist/scripts/ref-probe.mjs --ref --period 10    # ref-147-10s.txt
node dist/scripts/ref-probe.mjs --periods 58         # today-600s.txt (about 30 min)
node dist/scripts/ref-probe.mjs --ref --periods 55   # ref-600s.txt (about 37 min)
npx vitest run src/wave/poolRef.test.ts src/game/PhysicalMode.test.ts
```

The stills: the headless tool with `--spot="pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller[&poolSize=ref]" --shots=curl-front:rich:midday` (about 3 min each).

To ride it (the owner): `?spot=pool&waves=barrel&tubeSeam=blend&wallBody=stream&poolSize=ref`.
