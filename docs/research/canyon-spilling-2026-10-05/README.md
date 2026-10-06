# The Canyon as a spilling wave (prototype S2), 2026-10-05

The Canyon (`canyon`) is now a spilling-wave prototype: the crest crumbles from the top and the whitewater spills down the face, while the green shoulder ahead stays clean. Each break peels **left to right as seen from the beach looking out to sea (toward +x)**.

Three things were built:

- a new bed;
- no lip and no tube at the Canyon;
- a **spilling front** that holds the whitewater back ahead of each wave's peel.

Branch `claude/canyon-spilling-wip`.

## Direction convention

`+z` points toward the beach and `+x` runs along shore (`src/wave/Bathymetry.ts`). The game's cameras use world coordinates directly. The beach-side views (`SpectatorCamera` front, overview and cinematic views) look toward −z with +y up, so **+x is screen-right**.

For a surfer facing the beach, +x is on their left: the Reef and Padang Padang, which are lefts, also peel toward +x. The Canyon's peel toward +x is therefore what the owner asked for: left to right from the beach. The overhead shots below put the sea at the top, so +x is on the right there too.

## What was built

### 1. The bed (`src/wave/Bathymetry.ts`, `CANYON`, `canyon()`, `canyonBreakLineZ()`)

**Measured first.** The old Canyon had its canyon axis on the +x edge (x = 80) and a Dean beach. Under the owner's swell it did not peel one way. That swell is direction 0°, spreading s = 150 (`PADANG_SPREADING`), Medium (Hs 1.4 m at the edge, Tp 11 s), measured over 3 seeds × 14 periods:

- a median peel angle of 17°;
- 12 of 25 clean waves toward +x and 13 toward −x;
- a median peel speed of 15.8 m/s;
- 235 lip jets.

The canyon's flank focus makes an A-frame whose arms take turns. Moving the canyon alone to the other edge was also mixed: 1 seed, with clean waves both ways.

**What failed, and why.** A square swell meeting an oblique break line peels at sin α = (c_b / c_shelf) · sin φ by phase matching (`ledgePeel.ts`). Here c_b is the breaker celerity, c_shelf the crest speed on the shelf where the crest meets the line, and φ the line's angle to the crest.

- On a deep shelf the angle stays small.
- A long shallow bar acts as a lens. The crests wrap onto it and the break runs along it at 20–30 m/s.

Sweeps with these designs (the bar at 55–75°, shelves 2.4–3.5 m) gave medians of 8–15° with both directions. Removing the canyon outright twice ran the sea flat by about 45 s, probably unstable; that was not chased.

**What works.** The final design has three parts:

- **The canyon on the −x open edge** (`axisX: −80`). It is level across the boundary, as before. The swell runs ahead over the canyon's axis, so on its flank the crests turn toward +x. They reach the break already angled, which is the "oblique swell" a real point break gets from its wrap.
- **A level sand shelf**, `shelfDepth` 2.4 m, then a planar beach face at 1:25.
- **An oblique terrace** on the shelf, `crestDepth` 1.3 m deep. Its seaward edge is the break line. It runs at `angle` 62° to the shore from its peak (`peakX` −40, `peakZ` −140) toward +x and the beach. It rises from the shelf at `edgeSlope` 1:20 across the line, which is 1:43 along the waves' path, so the breakers spill: the readout's Iribarren number is 0.25 at the take-off. Upcoast of the peak the terrace fades out over `fadeWidth` 25 m, so the bed is level along shore at both open edges.

All the values are in `CANYON` and can be changed for the sweep (`scripts/canyon-peel-report.ts --canyon key=value,...`).

**After**, under the same swell and seeds (`canyon-peel-report`, 3 seeds × 14 periods):

| | Before (old bed, lip on) | After (new bed, no lip, front on) |
| --- | --- | --- |
| Clean waves (onset fit r² ≥ 0.3) | 25 | 34 |
| Toward +x / toward −x | 12 / 13 | **31 / 3** |
| Median peel angle (PeelTracker, sin α = c_b·\|dt/dx\|/stretch) | 17° | **45°** (seed 1 alone: 51°, 10 of 10 toward +x) |
| Median peel speed along the break line | 15.8 m/s | **6.6 m/s** |
| Lip jets thrown | 235 | **0** |
| Breaker readout at the take-off | spilling, ξ 0.20 | spilling, ξ 0.25 |

Other sizes, 1 seed each:

- **Big** (Hs 2.4 m, Tp 14 s): 8 of 9 clean waves toward +x, a median of 37°, 9.6 m/s.
- **Small** (Hs 0.9 m, Tp 9 s): few onsets. Most waves are too small to break on the 1.3 m terrace and break at the shore instead, so the peel is unmeasured.

The solver's own peel is 45° at the median. That is below the owner's 50–60°, but it now runs one way and is slow enough to ride. The visible peel is held at 55° by the spilling front (§3).

**Take-off.** `TAKE_OFF.canyon` stays `'focus'`. On a 0° swell, the rays from the −x canyon gather at x ≈ 11, z ≈ −82, just downstream of where the breaks start (x ≈ −20…20) and on the +x line of the peel. If the swell's direction changes, re-check it.

### 2. No lip, no tube at the Canyon (`src/wave/SurfZoneSimulation.ts`)

`SPILLING_SPOTS = ['canyon']`. In `throwLip`, a spilling spot counts the break as a roller (`lipRollers`) and returns before any jet is shaped, at every size. Nothing else changes, at the Canyon or anywhere else:

- other spots go through the same path;
- the solver's breaking and dissipation are untouched;
- the swept barrel's code (`src/wave/barrel/*`) is not touched.

A test checks this at Hs 1.4 m and 3 m: no jets, no launches and no landings.

### 3. The spilling front (`src/wave/SpillingFront.ts`)

**It reads the solver, it never writes it.** The breaking strength, the dissipation and the rider's water (`PhysicalBodyWaterField` reads `breaking.strength`) are unchanged. Like the swept barrel's gate (`SweptCrash.gate`), the front only lowers the whitewater strength that feeds three things:

- the foam field;
- the aeration's stirring;
- the roar.

Spray and bubbles come from the foam's sources, so they follow the front too.

**Each onset starts or extends a wave.** The simulation's onsets (`markBreakingOnsets`: a column's outermost breaking cell jumps seaward) call `observeOnset`. An onset joins the wave whose broken extent it touches, within `joinReach` = 6 m, if that wave has not broken there yet. Otherwise it starts a wave of its own, with the front at its peak. A column that breaks again a period later starts the next wave, so each crest gets its own front. Up to 8 waves are tracked. A wave is dropped 45 s after its first onset.

**Each step, the front advances and the whitewater is gated:**

- **The front advances** along shore toward the wave's solver tip (the furthest column it has broken), at no more than `speedCap = c_b / sin(peelAngleDegrees)`. With `peelAngleDegrees` 55° that is about 5.7 m/s at Medium (c_b = √(g·h_b) ≈ 4.7 m/s, the PeelTracker's own celerity). So the visible peel is 55° by the same measure, and never faster.
- **The front never passes the solver's tip.** The front follows the solver; it never invents a break.
- **Each breaking cell's owner** is decided by where it lies across shore. It belongs to the newest wave that has broken in its column whose band holds it. The band runs from `crestMargin` = 6 m seaward of where that wave started breaking there to `bandWidth` = 20 m shoreward of where its crest has since run at c_b. An older wave's bore lies about a wavelength inshore, so it is outside the band and is left as the solver has it.
  - A first version owned cells by their breaking age instead. That failed: the solver's age is inherited along the crest as well as across it, so almost no cell had an owner and nothing was gated (`scripts/canyon-gate-probe.ts`).
- **Ahead of the owner's front** the whitewater is 0: the green shoulder stays clean.
- **Behind it**, during the first `rampSeconds` = 1.5 s after the front reached the column, the foam starts as a thin line at the crest: `lineWidth` 1.5 m down the face at `lineShare` 35 % strength. It grows down the face at `growth` 5 m/s while its strength ramps to full. After that the solver's own strength passes through, and the existing foam field (spreading, lace and decay) takes over.

**Parameters and where they live:**

- `SPILLING_FRONT_DEFAULTS` in `SpillingFront.ts`;
- per spot, `SPILLING_FRONT.canyon = { direction: 1, peelAngleDegrees: 55 }` in `SurfZoneSimulation.ts`;
- the config switch `spillingFront: false` turns it off, and so does `&spillingFront=0` in the water sheet.

The cost is one pass over the grid per step, with at most 8 waves per breaking cell.

### Tools

- **`scripts/canyon-peel-report.ts`** prints the peel per period and the front's state, and sweeps `CANYON`:
  - Build and run: `rolldown scripts/canyon-peel-report.ts -o dist/scripts/canyon-peel-report.mjs --format esm --platform node && node dist/scripts/canyon-peel-report.mjs --hs 1.4 --tp 11 --seeds 3 --periods 14 [--verbose] [--canyon angle=60,...]`.
- **`scripts/browser/canyon-peel-shots.mjs`** drives the water sheet and shoots a sequence, one second apart, from the beach, a cliff and overhead. Start `npx vite --port 5199` first.
  - Run: `CHROME=/opt/pw-browsers/chromium node scripts/browser/canyon-peel-shots.mjs <dir> --frames=30 --headless`.
  - It runs its own upload receiver on port 5299.
- **The water sheet** (`src/dev/waterSheet.ts`):
  - takes `&spot=canyon`, `&direction=`, `&spreading=` and `&spillingFront=0`;
  - exposes `waterSheetStep(seconds)`, which steps exactly that long with no hold.
- **`--spreading <s>`** was added to `scripts/catch-report.ts` and `scripts/ride-report.ts`.

## Screenshots

These are headless Chromium shots (SwiftShader), Rich look, at midday: Medium, 0°, s = 150, CPU solver, one second apart. Run 1 starts 45 s into the sea. SwiftShader washes the colours out compared with a GPU.

**Overhead** (sea at the top, +x to the right, the 160 m window), frames 47, 50, 53, 56 and 59 s:

![overhead strip](img/run1-overhead-strip.jpg)

Each wave's whitewater starts at its peak, left of centre, as a thin streak on the crest. It grows into a white wedge whose leading edge moves right along the crest, while the crest ahead of it stays green. Two waves are peeling at once, each with its own front. The single frames are `img/run1-overhead-14.jpg` … `-28.jpg`, at 45 … 59 s.

RUN2_PLACEHOLDER

## Rideability

CATCH_PLACEHOLDER

## Tests

TESTS_PLACEHOLDER

## Known issues

- **The solver peels at 45°, not 55°.** The front holds the visible peel at 55°. On waves where the solver breaks faster than the front, the water just ahead of the visible front is already breaking in the solver. The rider feels `breaking.strength` there (bore push, the wipeout's checks) while the foam is still hidden. On the slow waves (about half of them, at 47–60°) the two agree. On the fast ones (15–30°) the lag can reach tens of metres.
- **Some waves still go the other way.** 3 of 34 clean waves peeled toward −x (seed 2), and some periods mix two peaks. The front only acts toward +x, so foam on a −x arm shows as the solver has it.
- **The front's waves are not handed over online.** A late joiner's sea (`SurfZoneState`) carries the foam but not the front's waves. Until the next onsets its whitewater is the solver's, ungated, for about a period.
- **Small days barely break on the terrace** (1.3 m deep). The surf moves to the shore break.
- **Without the canyon, the bed ran flat or unstable** in two sweeps. The canyon on the −x edge is load-bearing.
- **The spot's descriptions still say "median 58°".** That is `SurfConditions.ts`, which the parallel agent owns. The Canyon's swell itself (0°, s = 150) is also theirs; these measurements override the config to it.

## Next step: S3, a roller lens the rider hits

Build the roller (`docs/research/water-physics/roller.md`, `roller-build.md`) **standalone**, as a lens riding on the spilling front's broken crest, not on the barrel's loft:

- **Birth and shape.** Born where the front has reached a column and B ≥ 0.3 with bore Froude number Fr₁ ≥ 1.45 (shed below 1.3). It is about 2.1 H long at onset, growing to 2.5–3.5 H over 5–8 breaker depths, and 0.25–0.5 H thick at the crest, tapering to the toe. It holds 0.33–0.36 H² of water at a void fraction of 0.25.
- **What it does to the rider.** It changes only what the water sample returns (its top, its air and its flow), so a board bogs in its top and is pushed at about 330·H Pa. It replaces the P11 `ROLLER_SHARE` push.
- **How it is drawn.** As its own white band from crest to toe, with a fingered toe, brightest at the crest; the foam field takes over behind it.
- **Where it starts.** The spilling front's crest rows per column (`crestZ`) and its local age (`time − reached`) already give where and how old each roller slice is, so S3 can start from `SpillingFront`'s state.
