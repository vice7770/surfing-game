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

The opt-in probe `src/wave/probes/everySpot.probe.test.ts` runs each spot's Surf-screen swells at mid tide in calm air (seed 1), as `PhysicalMode.start` builds them [measured in the model]:
- `PART=geometry` reads the bed at the take-off (the peak): its still depth; the slope over half a wavelength offshore along the contours' normal, O'Dea et al. (2021)'s predictor (and cross-shore, for comparison); Mead & Black's orthogonal gradient over the breaking depth ± 2.5 m along the same path (the game's `orthogonalGradient`); and the local gradient.
- `PART=crests` runs 150 s of each sea after its spin-up and records every crest passing candidate foot depths on the take-off transect (zero up-crossings, five columns 20 m apart), as A0 = crest above still water / depth.
- `PART=throws` counts today's lip throws per minute, with each jet's void and the opening under its flying lip (the advisor's question for the unswept spots).

`src/wave/probes/spotOnset.probe.test.ts` measures a transect's join table: the periodicOnset probe's method on any spot's transect, with each wave's first onset (it reproduces Padang Padang's table exactly).

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
- **The Canyon:** no swept barrel and no runs. At ξ ≈ 0.2, with Mead & Black's X at 1:48–1:61 (Y ≈ 4–4.8), it spills, and its lip is under 2 cells even at level 13, so a run would draw a curl the solver can't resolve. First count its lip throws per minute today on each swell: if about none, it stays unswept and the deletion costs it nothing; if it throws, the numbers go to the advisor. **Counted (§5):** it throws on every swell, and its Big carves near-rider-sized voids, so it keeps today's lip and carve. A swept barrel for it needs its thin lip resolved, at level 14 on the M4 Pro: owed, not planned.
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

### The runs

Each case is scouted at level 9: one phase on the whole domain, outputs every 0.05 from 12 time units before the estimated break, a scratch driver (not committed). From its second crest's vertical face and touchdown (`plunge_measure.py`, from just before its break) its `run_periodic.sh` line follows the advisor's spacing:
- the switch to level 12 at 4.5 time units before the vertical, so the library's first frame (3 before) is in the fine output;
- the end at 3.5 after touchdown;
- the fine window from 9 h0 behind the vertical crest to 10 h0 ahead of it.

These lines are for PR #82's `tools/basilisk/run_periodic.sh`; this branch doesn't commit the toolkit.

```
point21_a08:7:0.141:9:0.0465116:0.05:52:31:44:27:47
point21_a15:7:0.229:11:0.0465116:0.05:60:31:41.5:29:49
point21_a23:7:0.318:12:0.0465116:0.05:60:28:37.5:29:49
point21_a30:7:0.38:14:0.0465116:0.05:68:26:39:34:54
reef42_a35:10:0.439:16:0.238095:0.15:64:18.5:28:24:44
```

| Case | Scout: vertical (t), still depth there, H at the vertical; touchdown | Scout wall | Level 12 |
|---|---|---|---|
| `point21_a08` | 38.7, 1.46 m, 1.07 m; not closed at level 9 | 20.5 min | restarted with the switch at 31 (below); running |
| `point21_a15` | 35.7, 2.25 m, 2.43 m; 37.8 | stopped once measured | done: phase 1 (level 10) 31 min, phase 2 4.3 h |
| `point21_a23` | 32.8, 2.93 m, 3.29 m; 33.9 | stopped once measured | done: phase 1 31 min, phase 2 4.3 h |
| `point21_a30` | 33.5, 3.11 m, 3.50 m; 35.35 | 15.1 min | restarted with the switch at 26 (below); running |
| `reef42_a35` | 23.0, 3.04 m (0.65 h0 before the ledge top), 3.72 m; 24.4 | 15.8 min | done: phase 1 16.6 min, phase 2 3.6 h |

**The level-12 runs** [measured: `plunge_measure.py` from the fine output's start, the vertical's still depth at its crest; `periodic_library.py` with A0 the train's crest and the first frame 3 time units before the vertical, or the fine output's first]:

| Case | Vertical (t), still depth there (× the foot crest), H there; touchdown | Lip just before touchdown (cells); tube L × W | Library: frames (τ span); clean pre / open / post |
|---|---|---|---|
| `point21_a15` | 32.775, 2.71 m (2.58 × 1.05 m), 2.56 m; 33.575 | 0.41 m (4.0); 1.02 × 0.50 m | 420 (−1.75…8.7); 70/70, 32/32, 175/318 |
| `point21_a23` | 30.225, 3.44 m (2.13 × 1.61 m), 3.30 m; 31.1 | 0.38 m (3.7); 1.25 × 0.48 m | 380 (−2.2…7.3); 85/88, 35/35, 187/257 |
| `reef42_a35` | 22.15, 5.16 m (1.47 × 3.50 m), 4.91 m; 24.075 | 1.66 m (10.6); 4.30 × 1.61 m | 355 (−3.0…5.85); 70/120, 58/77, 107/158 |

- **Level 12 goes vertical earlier and deeper than its level-9 scout:** by 2.9 (a15) and 2.6 (a23) time units on the Point, 0.85 on the Reef. The Point's waves go vertical at H/d 0.94–0.96.
- **So the Point's switch came late:** its fine output starts only 1.75 and 2.2 before the vertical, and the a15 and a23 libraries begin at τ −1.75 and −2.2, not −3. **Accepted** (the advisor): the lookup holds a case's first frame for earlier τ, where the shoulder's weight is low, and the level-13 runs owed on the M4 Pro start earlier anyway. `point21_a30` and `point21_a08` were restarted (2026-10-01 11:18) with their switch 3 earlier, at 26 and 31, so theirs start by −3 even with the same offset.
- **The Reef's second case** goes vertical on the ledge's face, 15 m seaward of the top, in 5.16 m of still water: its throw depth over its foot crest is 1.47, against reef42's 0.906 (its level-9 scout read 0.87). Its lip landmark flickers: before the vertical it jumps to the drained step ahead, and in the open tube it alternates between the curl's top and the jet's tip 0.6–0.9 h0 ahead, so the converter refilled 70 of its 198 frames and the tip fit reads up to 12 √(g h0). Its throw sets the Reef's throw line (§3, ruling 11). Its landmarks were traced again with the advisor's opt-in `robust` option (`periodic_library.py … robust`, `origin/claude/water-physics-advisor-local` 05d8e48: the jet's tip past small undulations on a big curl's top, the pre-vertical lip only in the face's upper 60 %): clean frames pre 97/120, open 64/77 (83 %), post 107/158; 37 of 198 frames refilled; the tip's median 1.10 √(g h0) but its largest 6.0, over the sustained overturn from τ 0.825. That misses the advisor's bar for the index (open frames about 90 % clean, the tip at most about 1.5 √(g h0)), so **the case stays out of the index**; the Reef keeps reef42 alone.

- The scouts ran three at once at a load of 28–66 (`uptime`).
- Each scout's measure starts just before its second crest's break. From the start of the fine output, the toolkit's crest search caught the leading crest's break: a23 at t 24.7, and the Reef's bore on its flat at t 14.0. At level 9, a30 read a steep face as vertical at t 26.85 in 5.2 m of water, with touchdown 8.5 later; that is not one plunge.
- Level-12 fine phases ran at 0.9–2.6 time units an hour at a load of 15–39, three at once.

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
4. **A second Reef case:** A0 ≈ 0.35 at 1:4.2, 16 s, periodic, level 12 here (the Reef's lip is 0.4–0.5 H, over 10 cells at level 12). Then fit the throw through both cases, through the origin (its level-9 scout read 0.87, reef42 0.906: about 0.89 expected).
5. **The throw's floor** (2026-10-01, after the Practice sea threw nothing): d_throw = max(k η_foot, the reef top's depth + tide), an optional field of a transect's tables; Padang Padang has none. A small wave can't go vertical on the ledge face but plunges as it crosses onto the top, where the step has drained the water (a 0.9 m wave sees 1.0–1.2 m at the 1.5 m top: H/h ≈ 0.75–0.9). A 1.93 m minimum would throw small waves on the face before they stand up; leaving them unthrown would remove the Reef's small barrels.
   **Refined** (2026-10-01, after the front check below): the floor stands for crests the solver breaks near the edge. The smallest waves cross the edge unbroken: there H/h ≈ 0.62 / 1.5 ≈ 0.4, well under breaking, and the step's drawdown for them is smaller than assumed. They break where the inner flat shoals to about 0.73 m (H/h ≈ 0.85): depth-limited breaking on the flat, not the ledge's plunge.
6. **Owed:** a small Reef case at about A0 0.09 (Practice and Small) at level 13 on the M4 Pro: its lip would be about 0.45 m, under 4 cells at level 12. Until then small waves scale the 0.21 case down. It runs over a transect that includes the shoaling inner flat, so that it also shows where and how those waves break; if they curl there, they get a flat case of their own later.
7. **The join table:** dropping the drives that break before the ledge is fine (provisional). Big Reef sets breaking before the ledge sit outside the ledge's library: a Reef behaviour question for the Reef session. The 16 s, 3.5 m drive first breaks at 2.0 m, against 4.9–5.6 m at 14–15 s: longer periods shoal longer before breaking.

8. **The throw floor's margin:** 1 cm over the top, kept as a named constant (`FLOOR_MARGIN`). The pass's Gaussian tail lifts the flat's still depth by up to 0.4 mm, so a floor at exactly 1.5 m was never crossed there.
9. **The crest jumps** (approved, gated to the Reef, Padang Padang unchanged). As a crest's face steepens over the ledge, its highest cell jumps forward to the ledge's edge, and the crest ahead started a track of its own, unsized, which never joined: 80–90 % of the Reef's sized crests were lost before joining. A sized crest now continues as the furthest crest ahead of it in its column within the reach, so the tracker follows the wave, not its maximum. The ruling's reach was about 1.5 H or 10 m, whichever is smaller, with both recorded. Measured on the Practice sea [2 m cells, 180 s, the rule off]: 200 jumps, 4/4/10 m ahead (10/50/90 %), 2.8/5.7/10.8 wave heights; 1.5 H catches none of them and 10 m catches 192. So the reach is 10 m (`FrontOptions.jumpReach`), and the front counts the jumps within 1.5 H beside it (`waveJumps`). The advisor confirmed 10 m: min(1.5 H, 10 m) was wrong for small waves, whose jumps are 3–11 H. It reaches ahead only, for tracks seen within the last 0.5 s (`HOLD`), as built.
10. **The join past the edge** (approved, gated). A sized crest past its throw depth that the solver has not broken may still join while it runs about 1.5 of its wave heights past that depth (`FrontOptions.joinPast`), its lip throwing where the solver breaks it. **Kept at 1.5 H** after the diagnostic below: only crests the solver breaks within about 1.5 H of the edge take the ledge's barrel. The rest spill as the solver's bores, which is consistent with the rider's water; the ledge's library would draw the wrong shape where they break.
11. **The throw, refit with reef42_a35** (2026-10-01): the line through the two runs, d = 2.35 η − 3.07, floored at the top plus the tide (1.51 m at mid tide), provisional. It passes both runs (1.93 m and 5.16 m), meets the floor where the floor takes over (η ≈ 1.95 m) and reaches about 6.3 m down the face for a 4 m crest; H/d ≈ 0.95 at the vertical in both runs supports it. Through the origin (1.32) is out: it throws reef42's own wave 0.9 m too deep. A third case near A0 0.28 would test whether it is linear: owed, optional.
12. **reef42_a35's landmarks:** the index takes it only if the advisor's `robust` trace leaves its open frames about 90 % clean and its tip at most about 1.5 √(g h0); otherwise the throw line stands and the case stays out (it did: §2).

**Built:** the Reef's record in `BARREL_SPOTS` (§4), its join table from the `spotOnset` probe ([barrel-library.md](../../research/barrel-library.md), "Every spot"), and its front rules (rulings 9 and 10). With the switch on in a test, on the Practice sea (1.0 m at 14 s from 20°) [measured in the model]:

| Front | Grid, window, sea | Joined (late) | Lost | Crossed unbroken | Thrown points a minute (today's lip jets on that sea) | Throws: still depth; across the crest line (+ seaward), 10/50/90 % | Wall |
|---|---|---|---|---|---|---|---|
| The floor only | 2 m cells, 40 m, 12 components, 180 s | 31 | 139 | 44 | 3.7 (11.3) | 1.51 m; −5.7/0.0/0.0 m | — |
| With rulings 9 and 10 | 2 m cells, 40 m, 12 components, 180 s | 49 (11) | 23 | 146 | 9.7 (11.3) | 1.50/1.51/1.51 m; −4.3/0.0/0.0 m | 135 s, load 29–31 |
| The floor at exactly 1.5 m (before its margin) | 1 m cells, 160 m, 24 components, 150 s | 157 | 1685 | 0 (never crossed) | 3.2 (352.4) | 1.50 m; −53.8/−7.1/38.2 m | 2649 s, load 30–34 |
| With rulings 9 and 10 | 1 m cells, 160 m, 24 components, 150 s | 892 (173) | 1608 | 212 | 147.6 (352.4) | 1.50/1.50/1.51 m; −4.2/−0.7/9.2 m | 3179 s, load 27–28 |

- **The game's grid** (1 m cells, its 160 m window and 24 components) is the one that counts; the 2 m runs are a quick check. The comparison is with today's lip on the same sea, which throws far more jets on the finer grid.
- **The jumps followed:** 269 in 180 s on the 2 m grid, none within 1.5 H; 5,688 in 150 s on the 1 m grid, 47 within 1.5 H.
- **What the game's grid loses** [1 m cells, 160 m, 24 components, 150 s; each sized crest followed to its end, the jump rule off and then on, its join reach kept; 2321 and 918 s wall at load 22–39]:
  - Rule off: 157 joined and 1,685 lost, none reaching its throw depth. Of the lost, 1,007 went on the shelf (followed 0.7 s, median) and 678 on the ledge's lower face at 5.2/7.4/8.8 m of still depth, followed 2.3 s: waves whose highest cell jumped ahead. It counts 1,245 jumps it doesn't follow.
  - Rule on: 892 joined (5.7 times as many), 1,608 lost and 212 crossed unbroken. Of the lost, 384 went on the shelf and 1,221 at 6.4/8.4/8.7 m, seen only 0.1 s: maxima a crest briefly splits into as the rule hands its track the furthest one. Their foot crests match the joined ones' (median 0.50 against 0.60 m), so they are duplicates of real crests, not waves of their own.
  - On the same sea at 2 m cells: 265 joined, 92 lost, 506 crossed unbroken.
  - With the rule off the counts equal the run before the floor's margin exactly (157 joined, 1,685 lost): without the rule no sized crest reached the top's edge, so neither the margin nor the join reach came into play.
- **Where the solver breaks the rest** [2 m cells, 180 s, a diagnostic with no limit on the join's reach]: 132 joins, 94 of them late, 75 lost and none unbroken. The late joins sit 4.2/26.9/35.4 m inside the crest line (10/50/90 %), at 0.62 m crests in 0.73 m of still water. So the game's solver breaks the Reef's small crests well onto the top, not at its edge as the Navier–Stokes ledge does, and 1.5 H catches only those it breaks near the edge (ruling 10).
- **At Padang Padang, with the rule off** [2 m cells, a 40 m window, its Small sea, the front from the relaxation zone's edge, 180 s; 2620 s wall at load 16–24]: 163 jumps, none within 1.5 H; 23 joins, 199 lost, 86 crossed unbroken. Its maxima jump about as often as the Reef's did with the rule off (200 in 180 s). (With its fine-zone rows every crest in that window went unsized: the peak's defect, §6.)

**Converted:** `periodic-reef42-l12` (189 KB, 187 frames, 16 refilled: 15 before the face goes vertical, where the lip landmark jumps, and 1 open; [barrel-cases.md](../../research/barrel-cases.md)). Its ψ0 (0.35) lies past Pick & Feddersen's fitted span, so the validation table shows no fit for it rather than extrapolating.

**A tip-velocity artefact** (ruled: every case's tip is now fitted only over its sustained overturn; [barrel-library.md](../../research/barrel-library.md), "Fitted within one regime") [measured, from the case]: before the face goes vertical the lip landmark is the face's steepest point, and on the 1:4.2 ledge it jumps 0.78 h0 forward between τ −0.125 and −0.025. Those frames are refilled linearly, so the ±4-frame tip fit reads 3–5 √(g h0) through τ −0.18…+0.03 (3.4 at τ 0); after that the tip runs a steady 0.55–1.0 √(g h0). The contact takes the lip's flow only in the curl's water, which is barely there at τ ≈ 0, but the first open frames' flow is wrong.

## 4. The switch mechanics (built in this PR)

What a spot needs before the owner can switch it on, and where each piece lives:

| Piece | Where | At Padang Padang |
|---|---|---|
| The runs' slope along the wave's path (`slope`), their foot depth h0 at mid tide (`footDepth`), the transect's onset tables (`onset`), the row the front follows crests from (`frontFrom`), and the front's own rules (`front`: the crest jumps' reach, the join's reach past the throw depth) | `BARREL_SPOTS[spot]`, `src/wave/barrel/barrelSpots.ts`; `FrontOptions`, `src/wave/barrel/BreakingFront.ts` | 1:19; `PADANG.baseDepth` (7 m, read live); `PADANG_ONSET`; the relaxation zone's edge and the crest jumps' 10 m reach (`PADANG_FRONT`), from the peak PR (#105); the Reef's rules are 10 m and 1.5 H (§3) |
| The join (the solver's fresh onset by crest height over a band, per period) and the throw (the Navier–Stokes vertical depth, a line in the foot crest) | `OnsetTables`; `onsetTiming(h0, period, lagged, tables)`, `src/wave/barrel/sliceClock.ts` | today's `SWELL_ONSET` and `THROW_DEPTH`, scaled from 7 m as before |
| The cases | the generated index, each entry with its `spot`; `barrelCasesFor(spot)`, `readBarrelCases(spot)` | the four cases, unchanged bytes |
| The loft's and the contact's slope | `BARREL_SLOPE`, now derived from `BARREL_SPOTS` | 1:19 |
| The page's files and library | `barrelCaseBytes(spot)` (one fetch per spot), `SweptBarrel` (one library per spot; `setSpot(spot, swept)`) | the same four files, fetched once |
| The switch | `SWEPT_BARREL` in `src/wave/SurfZoneSimulation.ts`; `sweptBarrelOn` needs the switch (or a config's `sweptBarrel` in a test) and a `BARREL_SPOTS` entry | `['padang']`, unchanged |

- **The front's rows.** Padang Padang's front follows crests from the relaxation zone's inner edge since the peak PR (#105, §6). The Canyon, Point and Beach have their fine zones start 3.4–3.6 m deep, shallower than any foot that lies seaward of their sets' breaks. So their records say `frontFrom: 'zone'`: the front follows crests from the relaxation zone's inner edge, over the 4 m cells. A crest is sized only once its still depth is within 1 m of the foot, so this changes nothing about where it is sized.
- **One line.** Once a spot has its record and its cases, switching it on is adding it to `SWEPT_BARREL`. Every other switch keys on `sweptBarrelOn(config)`: the front, the loft, the mask, the carve and the lip strips going off, the contact, the handover.
- **The generator** (`npm run barrels`) takes `--spot`, and `--flat` and `--a0` per case (`NAME=VALUE`). `--keep ID` keeps a committed case as it is: its `.bin` untouched, and its rows carried over from `barrel-cases.md`. Padang Padang's three solitary runs live only on another worktree, so they are kept, not reconverted. Past Pick & Feddersen's fitted ψ0 (the Reef) the validation table shows no fit rather than an extrapolated one.
- **Behaviour.** No spot's sea changes beyond the peak PR's (#105), which this branch carries: Padang Padang's onset timing, front, loft and contact read the same numbers as on that branch, its four case files are byte-identical, and the page fetches only them. A spot without a record can't be switched on, even by a test. `config.barrelFrontFrom` and `config.barrelFront` override a spot's rows and rules, for probes.

## 5. The deletion map

The six files PR 7 was to delete, every reference to them, and what each becomes once every spot is swept. A PR 5 ruling (relayed 2026-10-01) changes two of them from delete to **keep and slim**:
- the splash-up strips (PlungingLip kind 1) are drawn at swept spots, exactly as at the other spots; only the jet strips (kind 0) are hidden there;
- PR 5 launches PlungingLip's parcels for the pour, the splash-up and the spray from the crash curve.

So `PlungingLip.ts`, `LipSheetMesh.ts` and `richLip.ts` are kept and slimmed.

**Unswept spots keep today's lip, and its carve where the lip makes rider-sized voids** (the advisor, 2026-10-01). The Canyon, and the Beach's Small and Big, stay unswept, and they throw. So "unswept" means keeping today's Pick & Feddersen lip, jets and parcels, not having none. Today's lip on each Surf-screen swell [measured: `PART=throws`, 180 s of sea at mid tide, seed 1; voids and openings at the median / 90th percentile / largest]:

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

The Canyon's Big carves near-rider-sized voids, and so does the Beach's Big, so (the advisor):
- **The carve stays** (`tubeTable.ts`, `tubeCarve.ts`, and `Overturn.ts`'s void and jet sizing) for unswept spots whose lips make rider-sized voids: the Canyon's Big and the Beach's Big keep their tubes. That is the owner's rule: tubes wherever the physics plunges.
- **PR 7's deletion removes only what no spot uses any more.**
- **The Canyon gets a swept barrel only if its thin lip can be resolved**, which needs level 14 on the M4 Pro: owed, not planned.
- **The Beach's bar** (Practice and Medium; its voids about like the Canyon's Big) goes swept, its level-13 cases owed as ruled.
- `orthogonalGradient` and `vortexRatio` move to a bed-gradient module, and the gradient's walk takes a flat tolerance (|dh| under about 1 mm), or it reads the Reef's flat as still climbing (§1).

The deletion waits for PR 5 and for every spot that will be swept to be switched; until then the unswept spots use all six.

### `src/wave/PlungingLip.ts` (1178 lines): keep and slim

| Reference | What it uses | After the flip |
|---|---|---|
| `src/wave/SurfZoneSimulation.ts` | `PlungingLip` (`this.lip`, its `onLand`: foam, `lipImpacts`, aeration, `holdPlunge`; `onAir`; `step`); `lipThrow` in `throwLip` (the solver-onset throw); `writeTubes`, `carve`, `carveGrid(… this.lip.tubeTable …)`; `exportState`/`importState`; the `lipLaunches`/`lipVolume`/`lipJets`/`lipRollers` counters | Keep the parcels and `onLand`/`onAir`: PR 5's crash-curve parcels at swept spots, today's throw (`throwLip`/`lipThrow`) at unswept ones. The tube table and the carve stay for the unswept spots' rider-sized voids (the Canyon's and the Beach's Big); the handover keeps the parcels in flight |
| `src/wave/SurfZoneRunner.ts` | `STRIP_PARCELS` (the crash's pitch); `lip.spits/eruptions/rollers` (the spray scene); `session.strike(lip)` (already off at swept spots); `lip.writeTubes`; `forEachActiveParcel` (the lip buffer); `airborneVolume` | Strikes and tubes stay for unswept spots only; the parcels, their buffer and the spray scene stay, fed by the crash curve at swept spots (PR 5) |
| `src/wave/SprayCloud.ts` (+ test) | `SPLASH_UP`, `TubeEruption`, `TubeRoller`, `TubeSpit` (G9's collapse) | Fed by the swept barrel's collapse (PR 5) |
| `src/wave/surfZoneState.ts` | `LipState` (the handover) | Slimmed with the lip |
| `src/scene/LipSheetMesh.ts`, `src/scene/water/richLip.ts` | `LINK_TIME` | Kept for the splash-up strips |
| `scripts/whitewater-report.ts` | `ROLLER_AREA`, `SPLASH_UP`, `TUBE_AIR` | Kept with the collapse's constants |
| `scripts/tube-report.ts` | `lip.onLand`, `forEachActiveParcel`, `lipJets`/`lipRollers` | Replaced by a loft-based tube report |
| `scripts/ride-report.ts`, `catch-report.ts`, `duck-dive-report.ts`, `holddown-report.ts` | `simulation.lip.forEachContactNear` (strikes) | The contact's lip water (PR 4) |
| `src/wave/Rideability.ts`, `src/dev/tierParity.ts` | `lipLaunches`; `lipImpacts`, `lip.tubeCount` | Counts from the crash curve at swept spots; `tubeCount` stays for unswept ones |
| Tests | `PlungingLip.test.ts`, `SprayCloud.test.ts`, `SurfZoneSimulation.test.ts` (`JET_RELEASE_TIME`) | Slimmed with the module |

### `src/wave/Overturn.ts` (203 lines): keep the jet's sizing and the void for unswept spots; the Reef's slab goes

| Reference | What it uses | After the flip |
|---|---|---|
| `src/wave/SurfZoneSimulation.ts` | `orthogonalGradient`, `reefOverturn`, `tubeGeometry`, `jetFlightTime` (the solver-onset throw) | Kept for unswept spots' throws and voids (the jet's sizing, `tubeGeometry`); `reefOverturn` goes once the Reef is swept |
| `src/wave/PlungingLip.ts` | `overturn`, `overturnParameter`, `reefOverturn`, `jetRelativeSpeed`, `LH82_AREA`, `REEF_OVERTURN` (in `lipThrow`) | The jet's sizing stays for unswept spots; the Reef's slab constants go once it is swept |
| `src/wave/tubeTable.ts` | `tubeFloorDepth` | Kept with the carve |
| `src/dev/waterSheet.ts` | `tubeFloorDepth` (the dev tool's tube probe) | Kept for unswept spots; the contact's `floorAt` at swept ones |
| `scripts/tube-report.ts` | `REEF_OVERTURN`, `vortexRatio` | The library's validation (`barrel-cases.md`) for the Reef |
| `src/wave/probes/everySpot.probe.test.ts` (this PR) | `orthogonalGradient` | Move `orthogonalGradient` and `vortexRatio` to a bed-gradient module; they measure beds, not lips |
| Tests | `Overturn.test.ts`, `PlungingLip.test.ts`, `SurfZoneSimulation.test.ts` (`REEF_OVERTURN`), `tubeTable.test.ts`, `tubeCarve.test.ts` | The Reef's slab cases go; the rest stay |

### `src/wave/tubeTable.ts` (142 lines): keep for unswept spots' rider-sized voids

| Reference | What it uses | After the flip |
|---|---|---|
| `src/wave/SurfZoneSimulation.ts` | `TUBE_CAPACITY` (`writeTubes`), `carveGrid` (the uniform surface's carve) | At swept spots the loft's mask replaces the carve (already so at Padang Padang); unswept spots keep it |
| `src/wave/SurfZoneRunner.ts` | `TUBE_CAPACITY`, `TUBE_STRIDE` (the snapshot's `tubes`) | Kept; empty at swept spots |
| `src/game/SurfZoneHost.ts` | `carveAt` (the page's physics), `carveGrid`, `TUBE_STRIDE` (`writeTubes`) | Kept for unswept spots; the contact (PR 4) at swept ones |
| `src/game/WorkerSurfZone.ts`, `src/game/SurfZoneWorkerCore.ts` | the `tubes`/`tubeCount` buffers and their transfer | Kept |
| `src/scene/WaterSurface.ts`, `src/scene/PhysicalSurfaceSource.ts` | `TUBE_CAPACITY`, `TUBE_STRIDE`; `writeTubes` (the Rich water's own carve) | Kept for unswept spots; the barrel mask (`waterBarrelMaskPars`) and the swept mesh at swept ones |
| `src/dev/waterSheet.ts` | `TUBE_STRIDE` | Kept |
| `src/wave/PlungingLip.ts`, `src/scene/water/tubeCarve.ts` | `TUBE_STRIDE`, `carveAt`; the layout constants | Kept |
| Tests | `tubeTable.test.ts`, `tubeCarve.test.ts`, `SurfZoneHost.test.ts`, `PlungingLip.test.ts` | Kept |

### `src/scene/water/tubeCarve.ts` (174 lines): keep with `tubeTable.ts`

| Reference | What it uses | After the flip |
|---|---|---|
| `src/scene/WaterSurface.ts` | `packTubeTextures`, `tubeColumnCount`, `waterTubePars` (the Rich water's GPU carve) | Kept for unswept spots; the barrel mask and the swept mesh at swept ones |
| `src/scene/water/richSpray.ts` | `waterTubeCarvePars` (spray hidden in the void) | Kept; the swept mesh's mask at swept spots |
| Tests | `tubeCarve.test.ts` | Kept |

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

## 6. A finding at Padang Padang (fixed in its own PR, #105)

Padang Padang's fine zone starts at one z across the window, but its 7 m contour bends seaward at the peak, over the focus spur. So on Practice and Small, the fine zone's first row at the peak's columns (x −80 to −40 on Small, to −20 on Practice) is 3.7–6.0 m deep, shallower than the foot band (6–7 m) [measured: `tankLayout` and the bed, both swells at mid tide]. A crest first seen shallower than the band is never sized (`BreakingFront.unsized`), so it never joins a front, and the peak draws no barrel on those swells. The advisor ruled it a defect (it breaks the owner's rule of tubes wherever the physics plunges), to be fixed in its own PR, not in this one: `claude/padang-peak-sizing` from `claude/padang-contact`, switching Padang Padang to `frontFrom: 'zone'` or widening its sizing band, whichever reaches the peak with less change, with before and after on Small and Practice (unsized crests, throws, peel, barrels at the peak), flagged as a Padang Padang behaviour change.

**Fixed** in #105 (`claude/padang-peak-sizing`), with the crest jumps' rule turned on for Padang Padang too (the advisor's ruling (d), 2026-10-01: its maxima jump as often as the Reef's). On Small the peak now throws (2 → 78 throws there in 120 s); on Practice its peak crests are sized but cross their throw depth unbroken. This branch carries that PR's commits, so it merges after it.

## 7. The owner's follow-ups

- [ ] **The flip, per spot:** add the spot to `SWEPT_BARREL` after looking at Padang Padang's finished barrel (the Reef after the Reef session agrees). Before each, compare its catch and ride reports with today's (spec, Judging Part B 6).
- [ ] **The deletion:** after PR 5 and the last flip, as mapped in §5: only what no spot uses any more. The unswept spots keep today's lip and, where it makes rider-sized voids (the Canyon's and the Beach's Big), its carve.
- [ ] **The owed runs** (§2, §3), on the M4 Pro:
  - the Point's four cases at level 13 (level 12 stands in);
  - the Beach's bar, Practice and Medium (`beach32_a17`, `beach32_a26`), at level 13;
  - the Reef's small case, A0 ≈ 0.09, at level 13, over a transect that includes the shoaling inner flat;
  - optionally, a third Reef case near A0 0.28, to test whether the throw line is linear;
  - the Canyon at level 14, only if a swept barrel is wanted there (owed, not planned).
  Running here: `point21_a30` and `point21_a08` at level 12 (restarted 2026-10-01 11:18 with the earlier switch); the Point's record and its four cases follow them.
