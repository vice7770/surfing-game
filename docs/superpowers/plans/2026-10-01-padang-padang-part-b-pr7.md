# Padang Padang Part B, PR 7 (every spot, prepared) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the swept barrel for every spot, with no change in behaviour:
- each spot's transect (its slope, its foot, its onset tables) and its library cases;
- the switch mechanics, so that switching a spot on is one line in `SWEPT_BARREL`;
- tests that run each spot's barrel with the switch on inside the test only;
- the map of what becomes of the old lip and tube code.

The flip and the deletion are the owner's follow-ups (below).

**Architecture:** A spot's barrel data lives in one record, `BARREL_SPOTS[spot]` (`src/wave/barrel/barrelSpots.ts`): the runs' slope along the wave's path, their foot depth h0, the transect's onset tables (the join and the throw, `sliceClock.ts`), and the row the front follows crests from. `sweptBarrelOn` needs both the switch (`SWEPT_BARREL`, or a config's `sweptBarrel` in a test) and that record. Each case in the generated index names its spot, and a spot loads only its own cases. Padang Padang's record holds today's constants, so its front, loft and contact run exactly as before.

**Spec:** `docs/superpowers/specs/2026-09-28-padang-padang.md`, items 13–17 (17: "The other spots switch, the Reef included, once Padang Padang passes its checks and the user's look. The old lip, void and carve code is deleted in that last PR.").

**Gates (the owner's):**
- The other spots switch only after the owner has looked at Padang Padang's finished barrel.
- The Reef switches only after the Reef session agrees.
- The deletion needs PR 5 first: its crash-curve parcels replace the lip's parcels.

## Global Constraints

- "every value is sourced or marked provisional, and nothing is hand-shaped"; the advisor rules on cases, slopes and levels before any run.
- Other spots behave and look exactly as today: `waterLooks` snapshots unchanged, `SWEPT_BARREL = ['padang']`.
- Performance is measured, never a gate; every timing is reported with `uptime`'s load.
- Level-13 runs (gentle beaches) belong on the owner's M4 Pro; they are listed as owed, not run here. This M1 is shared: at most 2–3 Basilisk runs at once, one core each.
- The advisor's toolkit (`tools/basilisk/periodic.c`, `run_periodic.sh`, `analysis/periodic_library.py` and its helpers) comes with PR #82; it is checked out here to run, not committed.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## 1. The inventory (measured 2026-10-01)

Two opt-in probes in `src/wave/probes/everySpot.probe.test.ts`, on each spot's Surf-screen swells at mid tide in calm air (seed 1), as `PhysicalMode.start` builds them [measured in the model]:
- `PART=geometry` reads the bed at the take-off (the peak): its still depth; the slope over half a wavelength offshore along the contours' normal, O'Dea et al. (2021)'s predictor (and cross-shore, for comparison); Mead & Black's orthogonal gradient over the breaking depth ± 2.5 m along the same path (the game's `orthogonalGradient`); and the local gradient.
- `PART=crests` runs 150 s of each sea after its spin-up and records every crest passing candidate foot depths on the take-off transect (zero up-crossings, five columns 20 m apart), as A0 = crest above still water / depth.

### Slopes

| Spot | Swell (Hs, Tp) | Take-off depth | O'Dea, contours' normal | O'Dea, cross-shore | Mead & Black | Local |
|---|---|---|---|---|---|---|
| Canyon | Practice (1.4 m, 12 s, at the edge) | 2.20 m | 1:55.9 | 1:55.9 | 1:48.2 | 1:53.2 |
| Canyon | Small (0.9 m, 9 s) | 1.54 m | 1:47.3 | 1:47.3 | 1:47.7 | 1:44.8 |
| Canyon | Medium (1.4 m, 11 s) | 2.20 m | 1:55.5 | 1:55.5 | 1:48.2 | 1:53.1 |
| Canyon | Big (2.4 m, 14 s) | 3.39 m | 1:66.9 | 1:69.0 | 1:61.2 | 1:65.2 |
| Point | Practice | 2.42 m | 1:21.5 | 1:25.0 | 1:21.5 | 1:21.4 |
| Point | Small | 1.66 m | 1:21.4 | 1:25.0 | 1:21.5 | 1:21.4 |
| Point | Medium | 2.52 m | 1:21.5 | 1:25.0 | 1:21.5 | 1:21.4 |
| Point | Big | 4.18 m | 1:20.4 | 1:21.5 | 1:20.7 | 1:21.4 |
| Beach | Practice | 2.18 m | 1:32.3 | 1:31.4 | 1:48.8 | 1:19.7 |
| Beach | Small | 1.62 m | 1:76.7 | 1:77.0 | 1:36.7 | 1:48.6 |
| Beach | Medium | 2.46 m | 1:39.7 | 1:39.1 | 1:50.7 | 1:22.2 |
| Beach | Big | 3.10 m | 1:66.1 | 1:66.1 | 1:67.6 | 1:60.4 |
| Reef | Practice (1.0 m, 14 s, from 20°) | 2.27 m | 1:4.2 | 1:4.2 | 1:2.4 | 1:2.3 |
| Reef | Small (1.3 m, 15 s) | 2.74 m | 1:5.3 | 1:5.3 | 1:2.3 | 1:2.3 |
| Reef | Medium (1.9 m, 16 s) | 3.82 m | 1:7.8 | 1:7.8 | 1:2.3 | 1:2.3 |
| Reef | Big (3.0 m, 17 s) | 5.67 m | 1:14.4 | 1:5.5 | 1:2.3 | 1:2.3 |

- **The Canyon** is Dean's profile (h = 0.12 s^⅔) at its focus: 1:47–1:67 through the breaking zone, a gentle beach. Its Iribarren number at the break is about 0.2: by Battjes it spills, and today it throws few lips.
- **The Point** climbs its headland's flank: 1:25 straight out, 1:21.5 along the contours' normal (they run 31° off the shoreline there), for every size.
- **The Beach** has two regimes. Practice and Medium break on the inner bar's seaward flank (1:32–1:40 over half a wavelength, 1:20 at the flank itself; bar crest 1.6 m at mid tide). Small passes over the bar and breaks inside it (1:77); Big breaks seaward of it, on Dean's profile (1:66).
- **The Reef's** slope along its ledge's normal is 1:2.3; along the swell's path, which crosses the ledge about 57° off its normal (the Teahupo'o Reef report), it is about 1:4.2. Its two runs are at 1:4.2 (the steepest crossing) and 1:6 (near the game's median reading).
- **A quirk in `orthogonalGradient`** [measured]: the Reef's pass adds a Gaussian tail of about 1e-11 m to its flat, which the walk reads as the bed still climbing, so it ran on to the flat's far end and read the ledge as 1:8.4. The probe rounds depths to the micrometre (the table's 1:2.3–2.4). It changes nothing today (both values clamp to Mead & Black's roundest ratio), but the function should take a tolerance when it moves out of `Overturn.ts` (§5).

### The foot, and each swell as A0

The foot is where the front follows and sizes crests, and the runs' h0. It must lie seaward of every set's break, in the solver's free water, not in the relaxation zone, where the sea is the forced linear one: at the Point's 8 m edge the crests read 20–25 % lower than 25 m further in. Proposed: **Canyon 4.5 m, Point 7 m, Beach 4.5 m, Reef 10 m** (its runs'). Their sets break at most 2.9 m (Canyon), 4.2 m (Point) and 3.5 m (Beach) deep (the size report).

Crests above still water at the proposed foot, as A0 (median / mean of the highest tenth / largest):

| Spot (foot) | Small | Medium | Practice | Big |
|---|---|---|---|---|
| Canyon (4.5 m) | 0.045 / 0.098 / 0.131 | 0.072 / 0.171 / 0.214 | 0.179 / 0.263 / 0.277 | 0.181 / 0.284 / 0.307 |
| Point (7 m) | 0.036 / 0.075 / 0.089 | 0.073 / 0.139 / 0.156 | 0.135 / 0.225 / 0.236 | 0.133 / 0.293 / 0.305 |
| Beach (4.5 m) | 0.054 / 0.108 / 0.144 | 0.093 / 0.196 / 0.236 | 0.185 / 0.261 / 0.269 | PENDING |
| Reef (10 m) | PENDING | PENDING | PENDING | PENDING |

Each probe sea took 276–927 s of wall time for 150 s of sea, three at once, at a load of 13–31 (`uptime` before and after each).

## 2. The cases and the runs

**The advisor's rulings (2026-10-01):**
- **The feet:** approved: Canyon 4.5 m, Point 7 m, Beach 4.5 m, Reef 10 m.
- **The Point:** approved: 1:21.5, foot 7 m, flat 0.05, cases A0 0.08 at 9 s, 0.15 at 11 s, 0.23 at 12 s and 0.30 at 14 s. Each is scouted at level 9, then run at level 12 here as a provisional stand-in (3.2–3.6 cells across the lip, about what Padang Padang's level-12 cases had; they threw at a sane 1.0–1.1 C). Level 13 is owed on the M4 Pro.
- **The Canyon:** no swept barrel and no runs. At ξ ≈ 0.2, with Mead & Black's X at 1:48–1:61 (Y ≈ 4–4.8), it spills, and its lip is under 2 cells even at level 13, so a run would draw a curl the solver can't resolve. First count its lip throws per minute today on each swell: if about none, it stays unswept and the deletion costs it nothing; if it throws, the numbers go to the advisor.
- **The Beach:** its bar regime (Practice and Medium, 1:32 to the 1.6 m bar crest) is owed at level 13 on the M4 Pro, with no level-12 stand-ins (1.4–1.7 cells is unusable). Small (1:77) and Big (1:66) spill like the Canyon: unswept; count their lip throws too.
- **The Reef:** see §3.
- **The join tables, the throw lines, the scouting and the mechanics:** approved as planned, with no change in behaviour. The `'zone'` fronts for the Canyon, Point and Beach are fine. Padang Padang's CLOCK, SPLIT, FRONT_MIN_HEIGHT, LOFT and CONTACT stay at every spot (provisional) until a spot's probes show a need.

**As proposed.** Periodic runs (`run_periodic.sh`, the second crest of a cnoidal train, which carries the trough and the step), one slope along the path from the foot to a flat, as the toolkit's case lines have it. A case's A0 is its measured foot crest over h0, given to the converter with `--a0`; the train's H/h0 is the one whose first-order cnoidal crest is that A0.

| Case | h0 | Slope | Flat (h0) | A0 (foot crest) | Period | Train H/h0 | Domain (h0) | Cell at L12 / L13 | Lip, Pick & Feddersen's fits, in cells at L12 / L13 |
|---|---|---|---|---|---|---|---|---|---|
| `point21_a08` | 7 m | 1:21.5 | 0.05 | 0.08 (0.56 m) | 9 s | 0.141 | 52 | 8.9 / 4.4 cm | 3.6 / 7.3 (0.215 H at H 1.5 m) |
| `point21_a15` | 7 m | 1:21.5 | 0.05 | 0.15 (1.05 m) | 11 s | 0.229 | 60 | 10.3 / 5.1 cm | 3.2 / 6.5 (0.166 H at 2.0 m) |
| `point21_a23` | 7 m | 1:21.5 | 0.05 | 0.23 (1.61 m) | 12 s | 0.318 | 60 | 10.3 / 5.1 cm | 3.3 / 6.6 (0.140 H at 2.4 m) |
| `point21_a30` | 7 m | 1:21.5 | 0.05 | 0.30 (2.10 m) | 14 s | 0.380 | 68 | 11.6 / 5.8 cm | 3.3 / 6.5 (0.127 H at 3.0 m) |
| `canyon55_a10` | 4.5 m | 1:55 | 0.05 | 0.10 | 9 s | 0.162 | 92 | 10.1 / 5.1 cm | 0.7 / 1.4 (0.055 H at 1.3 m) |
| `canyon55_a17` | 4.5 m | 1:55 | 0.05 | 0.17 | 11 s | 0.236 | 96 | 10.5 / 5.3 cm | 0.9 / 1.8 (0.049 H at 1.9 m) |
| `canyon55_a26` | 4.5 m | 1:55 | 0.05 | 0.26 | 12 s | 0.331 | 100 | 11.0 / 5.5 cm | 1.0 / 2.0 (0.046 H at 2.4 m) |
| `beach32_a17` | 4.5 m | 1:32 | 0.356 (the bar's crest, 1.6 m) | 0.17 | 11 s | 0.236 | 64 | 7.0 / 3.5 cm | 1.7 / 3.5 (0.087 H at 1.4 m) |
| `beach32_a26` | 4.5 m | 1:32 | 0.356 | 0.26 | 12 s | 0.331 | 72 | 7.9 / 4.0 cm | 1.4 / 2.9 (0.076 H at 1.5 m) |

- **The grid rule** (at least about 6 cells across the thrown lip) is met only by the Point at level 13. The gentle Canyon would need level 14–15, because a 1:55 slope throws a lip about 0.05 H thick.
- **Proposed:** the Point's cases at level 12 here, provisional, as Padang Padang's level 12 stands in for its owed level 13; the level-13 runs owed on the M4 Pro, for every spot. Whether the Canyon and the Beach get level-12 stand-ins here is the advisor's call.
- **Each case** is scouted at level 9 first (minutes) for its switch time and fine window, as the advisor did for the Reef and Padang Padang.
- **The join tables:** the game's own solver on each spot's transect, by `src/wave/probes/spotOnset.probe.test.ts` (the periodicOnset probe's method on any transect, with the spot's Kennedy onset), at the spot's periods (9, 11, 12 and 14 s; the Reef's 14–17 s), heights spanning its foot crests. The band a crest is sized over is then set just seaward of the spot's deepest join, as Padang Padang's 6–5 m was.
- **The throw lines:** each spot's runs, the still depth where the face goes vertical against the foot crest (`plunge_measure.py`'s `at_vertical`).

## 3. The Reef's libraries

Built by the advisor (`periodic-runs.md` §9): `periodic_reef42_L12` (1:4.2) and `periodic_reef60_L12` (1:6), both A0 0.2127 (the train's crest over the 10 m shelf), 14 s, level 12, flat 0.15 h0.

- **reef60's torn frames** [measured, from the library]: 14 early open frames (τ 0.05–0.48) are flagged `surface_torn_in_window`. Their landmarks trace another piece of the surface: the crest 1 h0 behind the true one, H 0.12–0.17 h0 against 0.25–0.39 around them, the water level ahead above still water. So their profiles are not the lip, and they can't be re-traced without the run's facets. Seven frames between them are flagged only for jumping, against the torn trace; they match their clean neighbours.
- **Proposed:** refill the torn frames from their good neighbours, and keep the frames flagged only for jumping after a torn one.
- **The slope:** `BARREL_SLOPE` is one slope a spot, so only one of the two cases would ever be read: 1:6 (near the game's median crossing) or 1:4.2. Using both would need the slope measured per slice, a later change.
- **The throw** [measured, from the runs' `at_vertical` and their transect]: the face goes vertical in 1.93 m of still water on 1:4.2 and 2.08 m on 1:6, for a 2.13 m foot crest.

**The advisor's rulings (2026-10-01):**
1. **The torn frames: not refilled.** The advisor re-traced them from the run's facets: `periodic_library.py` now stitches a torn frame's larger surface pieces left to right, within 0.2 h0 (the drained ledge's water meeting the bed had split the surface, and the widest piece, the back of the wave, had been taken for the whole). Stitched frames carry `"stitched": true`, and previously clean frames are unchanged. Open-tube clean frames: reef60 49 → 67 of 70, reef42 62 → 64 of 65 (`origin/claude/water-physics-advisor-local`, bdff16f). They are used as they are: the converter's usual refill takes the few still flagged.
2. **`BARREL_SLOPE` 1:4.2 (reef42):** the slope along the swell's path, and the cleanest library. reef60 waits for per-slice slopes, so it is not in the index.
3. **The throw, proportional:** d = (1.93 / 2.13) η_foot ≈ 0.91 η_foot, provisional. Bigger waves break deeper: a constant would throw Big too late and Practice too early, since the Reef's foot crests span about 1–4 m.
4. **A second Reef case:** A0 ≈ 0.35 at 1:4.2, 16 s, periodic, level 12 here (the Reef's lip is 0.4–0.5 H, over 10 cells at level 12). Then fit the throw through both cases.

**Converted:** `periodic-reef42-l12` (189 KB, 187 frames, 16 refilled: 15 before the face goes vertical, where the lip landmark jumps, and 1 open; [barrel-cases.md](../../research/barrel-cases.md)). Its ψ0 (0.35) lies past Pick & Feddersen's fitted span, so the validation table shows no fit for it rather than extrapolating.

**A tip-velocity artefact, for the advisor** [measured, from the case]: before the face goes vertical the lip landmark is the face's steepest point, and on the 1:4.2 ledge it jumps 0.78 h0 forward between τ −0.125 and −0.025. Those frames are refilled linearly, so the ±4-frame tip fit reads 3–5 √(g h0) through τ −0.18…+0.03 (3.4 at τ 0); after that the tip runs a steady 0.55–1.0 √(g h0). The contact takes the lip's flow only in the curl's water, which is barely there at τ ≈ 0, but the first open frames' flow is wrong.

## 4. The switch mechanics (built in this PR)

What a spot needs before the owner can switch it on, and where each piece lives:

| Piece | Where | At Padang Padang |
|---|---|---|
| The runs' slope along the wave's path (`slope`), their foot depth h0 at mid tide (`footDepth`), the transect's onset tables (`onset`), and the row the front follows crests from (`frontFrom`) | `BARREL_SPOTS[spot]`, `src/wave/barrel/barrelSpots.ts` | 1:19; `PADANG.baseDepth` (7 m, read live); `PADANG_ONSET`; the fine zone |
| The join (the solver's fresh onset by crest height over a band, per period) and the throw (the Navier–Stokes vertical depth, a line in the foot crest) | `OnsetTables`; `onsetTiming(h0, period, lagged, tables)`, `src/wave/barrel/sliceClock.ts` | today's `SWELL_ONSET` and `THROW_DEPTH`, scaled from 7 m as before |
| The cases | the generated index, each entry with its `spot`; `barrelCasesFor(spot)`, `readBarrelCases(spot)` | the four cases, unchanged bytes |
| The loft's and the contact's slope | `BARREL_SLOPE`, now derived from `BARREL_SPOTS` | 1:19 |
| The page's files and library | `barrelCaseBytes(spot)` (one fetch per spot), `SweptBarrel` (one library per spot; `setSpot(spot, swept)`) | the same four files, fetched once |
| The switch | `SWEPT_BARREL` in `src/wave/SurfZoneSimulation.ts`; `sweptBarrelOn` needs the switch (or a config's `sweptBarrel` in a test) and a `BARREL_SPOTS` entry | `['padang']`, unchanged |

- **The front's rows.** At Padang Padang the front follows crests from the fine zone's first row, as before. The Canyon, Point and Beach have their fine zones start 3.4–3.6 m deep, shallower than any foot that lies seaward of their sets' breaks. So their records say `frontFrom: 'zone'`: the front follows crests from the relaxation zone's inner edge, over the 4 m cells. A crest is sized only once its still depth is within 1 m of the foot, so this changes nothing about where it is sized.
- **One line.** Once a spot has its record and its cases, switching it on is adding it to `SWEPT_BARREL`. Every other switch keys on `sweptBarrelOn(config)`: the front, the loft, the mask, the carve and the lip strips going off, the contact, the handover.
- **The generator** (`npm run barrels`) takes `--spot`, and `--flat` and `--a0` per case (`NAME=VALUE`). `--keep ID` keeps a committed case as it is: its `.bin` untouched, and its rows carried over from `barrel-cases.md`. Padang Padang's three solitary runs live only on another worktree, so they are kept, not reconverted. Past Pick & Feddersen's fitted ψ0 (the Reef) the validation table shows no fit rather than an extrapolated one.
- **Behaviour.** No spot's sea changes. Padang Padang's onset timing, front, loft and contact read the same numbers as before, its four case files are byte-identical, and the page fetches only them. A spot without a record can't be switched on, even by a test.

## 5. The deletion map

The six files PR 7 was to delete, every reference to them, and what each becomes once every spot is swept. A PR 5 ruling (relayed 2026-10-01) changes two of them from delete to **keep and slim**:
- the splash-up strips (PlungingLip kind 1) are drawn at swept spots, exactly as at the other spots; only the jet strips (kind 0) are hidden there;
- PR 5 launches PlungingLip's parcels for the pour, the splash-up and the spray from the crash curve.

So `PlungingLip.ts`, `LipSheetMesh.ts` and `richLip.ts` are kept and slimmed, and `Overturn.ts`, `tubeTable.ts` and `tubeCarve.ts` are deleted. The deletion waits for PR 5 and for every spot to be switched; until then the non-swept spots use all six.

### `src/wave/PlungingLip.ts` (1178 lines): keep and slim

| Reference | What it uses | After the flip |
|---|---|---|
| `src/wave/SurfZoneSimulation.ts` | `PlungingLip` (`this.lip`, its `onLand`: foam, `lipImpacts`, aeration, `holdPlunge`; `onAir`; `step`); `lipThrow` in `throwLip` (the solver-onset throw); `writeTubes`, `carve`, `carveGrid(… this.lip.tubeTable …)`; `exportState`/`importState`; the `lipLaunches`/`lipVolume`/`lipJets`/`lipRollers` counters | Keep the parcels and `onLand`/`onAir` for PR 5's crash-curve parcels; drop `throwLip`/`lipThrow`, the tube table and the carve (the loft and the contact replace them); the handover keeps the parcels in flight |
| `src/wave/SurfZoneRunner.ts` | `STRIP_PARCELS` (the crash's pitch); `lip.spits/eruptions/rollers` (the spray scene); `session.strike(lip)` (already off at swept spots); `lip.writeTubes`; `forEachActiveParcel` (the lip buffer); `airborneVolume` | Strikes and tubes go; the parcels, their buffer and the spray scene stay, fed by the crash curve (PR 5) |
| `src/wave/SprayCloud.ts` (+ test) | `SPLASH_UP`, `TubeEruption`, `TubeRoller`, `TubeSpit` (G9's collapse) | Fed by the swept barrel's collapse (PR 5) |
| `src/wave/surfZoneState.ts` | `LipState` (the handover) | Slimmed with the lip |
| `src/scene/LipSheetMesh.ts`, `src/scene/water/richLip.ts` | `LINK_TIME` | Kept for the splash-up strips |
| `scripts/whitewater-report.ts` | `ROLLER_AREA`, `SPLASH_UP`, `TUBE_AIR` | Kept with the collapse's constants |
| `scripts/tube-report.ts` | `lip.onLand`, `forEachActiveParcel`, `lipJets`/`lipRollers` | Replaced by a loft-based tube report |
| `scripts/ride-report.ts`, `catch-report.ts`, `duck-dive-report.ts`, `holddown-report.ts` | `simulation.lip.forEachContactNear` (strikes) | The contact's lip water (PR 4) |
| `src/wave/Rideability.ts`, `src/dev/tierParity.ts` | `lipLaunches`; `lipImpacts`, `lip.tubeCount` | Counts from the crash curve; `tubeCount` goes |
| Tests | `PlungingLip.test.ts`, `SprayCloud.test.ts`, `SurfZoneSimulation.test.ts` (`JET_RELEASE_TIME`) | Slimmed with the module |

### `src/wave/Overturn.ts` (203 lines): delete

| Reference | What it uses | After the flip |
|---|---|---|
| `src/wave/SurfZoneSimulation.ts` | `orthogonalGradient`, `reefOverturn`, `tubeGeometry`, `jetFlightTime` (the solver-onset throw) | Gone with `throwLip` |
| `src/wave/PlungingLip.ts` | `overturn`, `overturnParameter`, `reefOverturn`, `jetRelativeSpeed`, `LH82_AREA`, `REEF_OVERTURN` (in `lipThrow`) | Gone with `lipThrow` |
| `src/wave/tubeTable.ts` | `tubeFloorDepth` | Deleted |
| `src/dev/waterSheet.ts` | `tubeFloorDepth` (the dev tool's tube probe) | The contact's `floorAt` |
| `scripts/tube-report.ts` | `REEF_OVERTURN`, `vortexRatio` | The library's validation (`barrel-cases.md`) |
| `src/wave/probes/everySpot.probe.test.ts` (this PR) | `orthogonalGradient` | Move `orthogonalGradient` and `vortexRatio` to a bed-gradient module first; they measure beds, not lips |
| Tests | `Overturn.test.ts`, `PlungingLip.test.ts`, `SurfZoneSimulation.test.ts` (`REEF_OVERTURN`), `tubeTable.test.ts`, `tubeCarve.test.ts` | Deleted or moved with the two functions |

### `src/wave/tubeTable.ts` (142 lines): delete

| Reference | What it uses | After the flip |
|---|---|---|
| `src/wave/SurfZoneSimulation.ts` | `TUBE_CAPACITY` (`writeTubes`), `carveGrid` (the uniform surface's carve) | Gone: the loft's mask replaces the carve |
| `src/wave/SurfZoneRunner.ts` | `TUBE_CAPACITY`, `TUBE_STRIDE` (the snapshot's `tubes`) | The buffer goes; the front records carry the barrel |
| `src/game/SurfZoneHost.ts` | `carveAt` (the page's physics), `carveGrid`, `TUBE_STRIDE` (`writeTubes`) | The contact (PR 4) |
| `src/game/WorkerSurfZone.ts`, `src/game/SurfZoneWorkerCore.ts` | the `tubes`/`tubeCount` buffers and their transfer | Dropped from the snapshot |
| `src/scene/WaterSurface.ts`, `src/scene/PhysicalSurfaceSource.ts` | `TUBE_CAPACITY`, `TUBE_STRIDE`; `writeTubes` (the Rich water's own carve) | The barrel mask (`waterBarrelMaskPars`) and the swept mesh |
| `src/dev/waterSheet.ts` | `TUBE_STRIDE` | The front records |
| `src/wave/PlungingLip.ts`, `src/scene/water/tubeCarve.ts` | `TUBE_STRIDE`, `carveAt`; the layout constants | Slimmed / deleted |
| Tests | `tubeTable.test.ts`, `tubeCarve.test.ts`, `SurfZoneHost.test.ts`, `PlungingLip.test.ts` | Deleted or rewritten |

### `src/scene/water/tubeCarve.ts` (174 lines): delete

| Reference | What it uses | After the flip |
|---|---|---|
| `src/scene/WaterSurface.ts` | `packTubeTextures`, `tubeColumnCount`, `waterTubePars` (the Rich water's GPU carve) | The barrel mask and the swept mesh |
| `src/scene/water/richSpray.ts` | `waterTubeCarvePars` (spray hidden in the void) | The swept mesh's mask |
| Tests | `tubeCarve.test.ts` | Deleted |

### `src/scene/LipSheetMesh.ts` (245 lines): keep and slim

| Reference | What it uses | After the flip |
|---|---|---|
| `src/game/PhysicalMode.ts` | `lipSheet` (built, added to the scene, hidden at swept spots, its optics, `update` from the snapshot's parcels) | Kept for the splash-up strips (kind 1) at every spot; jet strips (kind 0) are not drawn |
| `src/main.ts` | `lipSheet.setLook`, `richMaterial`, `setSun`, the depth list | Unchanged |
| `src/scene/waterLooks.test.ts` | the look snapshots | Rerun after slimming |
| Tests | `LipSheetMesh.test.ts` | Slimmed |

### `src/scene/water/richLip.ts` (285 lines): keep and slim

| Reference | What it uses | After the flip |
|---|---|---|
| `src/scene/LipSheetMesh.ts` | `RICH_LIP_REFLECTION`, `buildRichLipSheet`, its shader chunks | The splash-up strips' Rich sheet |
| Tests | `richLip.test.ts`, `LipSheetMesh.test.ts` | Slimmed |

## 6. A finding at Padang Padang (not changed here)

Padang Padang's fine zone starts at one z across the window, but its 7 m contour bends seaward at the peak, over the focus spur. So on Practice and Small, the fine zone's first row at the peak's columns (x −80 to −40 on Small, to −20 on Practice) is 3.7–6.0 m deep, shallower than the foot band (6–7 m) [measured: `tankLayout` and the bed, both swells at mid tide]. A crest first seen shallower than the band is never sized (`BreakingFront.unsized`), so it never joins a front, and the peak draws no barrel on those swells. The advisor ruled it a defect (it breaks the owner's rule of tubes wherever the physics plunges), to be fixed in its own PR, not in this one: `claude/padang-peak-sizing` from `claude/padang-contact`, switching Padang Padang to `frontFrom: 'zone'` or widening its sizing band, whichever reaches the peak with less change, with before and after on Small and Practice (unsized crests, throws, peel, barrels at the peak), flagged as a Padang Padang behaviour change.

## 7. The owner's follow-ups

- [ ] **The flip, per spot:** add the spot to `SWEPT_BARREL` after looking at Padang Padang's finished barrel (the Reef after the Reef session agrees). Before each, compare its catch and ride reports with today's (spec, Judging Part B 6).
- [ ] **The deletion:** after PR 5 and the last flip, as mapped in §5.
- [ ] **The owed runs** (§2).
