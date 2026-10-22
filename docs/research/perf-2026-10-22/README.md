# Performance on the M1 · 2026-10-22

Branch `claude/perf-2026-10-22`, from `main` at `9192b3bf`. Several merges of 2026-10-21/22 might have moved the cost: the Canyon's 240 m window, the rock-bed cover, the glow's 2× MSAA and its setting, the camera swing, the sprint paddle and the paddle-balance physics, and Padang's curl foam. This study measures today's main against the commit before #141, `ca1dd350` (`a246523d^1`). It also measures against `a246523d` (canyon-layout's 220 m window), to separate today's window growth. It also answers the performance study's two open items from 2026-09-27: what the menus cost, and what Auto picks on the M1.

**In short:**

- **Nothing regressed.** The worker's CPU stages, its WebGPU step and the GPU's frame are the same at Padang and the Wave Pool, within noise. At the Canyon:
  - the 240 m window costs +0.57 ms of CPU stages per step against canyon-layout's 220 m;
  - the CPU solver (the Fast tier) gets 7–9 % slower;
  - the GPU water's step grows by 0.4 ms at High.

  Against `ca1dd350`'s older layout, the Canyon's total is even (−0.1 ms) or cheaper.
- **Today's features each cost under 0.2 ms, or save time:**
  - the rock bed: ≤ 0.15 ms of GPU, and no shader cliff;
  - the curl foam: ≤ 0.1 ms of main thread per snapshot;
  - the paddle physics: ≤ 0.02 ms per step;
  - the glow's 2× MSAA: it saves 2.0–2.3 ms (1280×720) and 3.4–3.6 ms (High's 1.75 density) against 4×, and it draws slightly cheaper than the glow off.
- **The biggest M1 cost found is not new:** Padang's page lofts the swept barrel on the main thread. That is 10–11 ms per snapshot (14 ms for the whole `drawBarrel`), measured on a loaded M1.
- **Auto on this M1 is predicted to pick Medium or Low, never High.** Which one depends on the spot the menu happens to show. The benchmark could not run here (see below).
- **The menus:**
  - the menu's cinematic view costs 10–25 % more GPU than a ride view at the same spot;
  - its riderless sea costs 5.5–14.5 ms of worker per step, less than a ride's;
  - the blurred panels' compositing could not be measured in a hidden pane.
- **No game code changed.** The only code change is a dev option in `scripts/m1-cpu-ab.ts` (`--base-state`). The paired-page tools are in [tools/](tools/).

## Machine and conditions

| | |
|---|---|
| Machine | MacBook Air, Apple M1 (4P + 4E cores, 8-core GPU), 8 GB, on AC |
| OS, browser | macOS 15.7.4; the Claude desktop app's browser pane (Chromium, ANGLE Metal, WebGPU) |
| Pane | Hidden throughout. `requestAnimationFrame` did not fire at all (0 per second), so no live frame rate could be taken (see Auto) |
| Load | 12–16 in the first hour: another session's Canyon size reports, bot tracks, a `tsc` and a vitest run. Then 1.4–6. Each table says which |
| Trees | today `9192b3bf`; baseline `ca1dd350`; for the Canyon also `a246523d` (220 m window) |

Every comparison is paired: the two trees run in one process or one page, in turn, so a busy spell falls on both.

## How it was measured

1. **Worker CPU stages in Node.** `scripts/m1-cpu-ab.ts` (the M1 CPU study's harness). It steps two trees' runners alternately on saved seas, with an idle-then-paddling rider, and fills a snapshot after each step. The water steps on the CPU solver and is left out of "CPU stages".
   - New here: `--base-state <file>` gives the base tree a sea of its own. The Canyon's window differs between the trees, so one saved sea cannot feed both.
   - The base trees are `git archive <sha> src scripts/m1-cpu-bench.ts` into `.m1-cpu-base/` (or `.m1-cpu-mid/`), and each one's sea is saved by its own `m1-cpu-bench`.
2. **The worker in the page.** `gpu-check.html?mode=pipeline&arms=base`: today's worker and the base tree's run on the real WebGPU device, in 2 s turns.
   - Medium is `&tier=0&particles=medium` (24 components); High is the default 64 components with `&particles=high`.
   - Both trees' workers get the same config, and each builds its own spot from it. So the Canyon's layout is each tree's own.
3. **The GPU's frame in the page.** This is new: [tools/ab.html](tools/ab.html) puts both trees' water sheets (`?inpage&waterSheet&diagnostics&compute=gpu&swell=medium`, `&graphics=medium` with `&components=24`, or `&graphics=high`) in two iframes of one page.
   - [tools/perf-page.js](tools/perf-page.js) times each tree's frames from the same held sea, in turn, block by block.
   - **Steady-state cost a frame:** 20 frames drawn back to back with one 1-pixel read at the end, so the GPU keeps its clock. 8 cycles, the order turned every cycle. The tables give each tree's median and the paired median difference.
   - The drawing is 1280 × 720 at pixel ratio 1. That is Medium for a 1280 × 720 window; High there draws 2240 × 1260.
   - Views:
     - the game's own ride camera (`ride`);
     - the sheet's `lineup` (1.6 m up, along the crests);
     - `horizon` (14 m up, out to sea, close to the menu's view);
     - Padang's `curl-channel`.
   - Main-thread submission is the `renderView` call alone.
   - **A/A control** (today in both frames, Pool Medium): Classic 0.00 to +0.03 ms, Rich +0.01 to +0.15 ms. The two frames' seas were byte-identical.
4. **The page's main thread per snapshot.** In each frame, `PhysicalMode.update`, `WaterSurface.update`, `drawBarrel`/`drawCurl` and `SweptLoft.build` were wrapped with timers. The held sea was stepped one step at a time (`waterSheetStep`), alternating the trees.
5. **The menu.** `/?diagnostics&graphics=medium`.
   - The menu's own backdrop was used where it fell on a spot (the Reef, the Canyon). The Pool's was started through the diagnostics hooks with `backdropSettings` and a cinematic idle view, then stepped 10 s.
   - The cinematic camera was placed by rendering 2 s of frames, since the hidden pane runs no frames of its own.
   - The menu's sea alone was timed with `gpu-check.html?mode=pipeline&size=practice&rider=0&tier=0`.

### Pitfalls found on the way (for whoever measures next)

- **The base tree served from `/.m1-cpu-base/` drew no surfer.** It fetches `assets/…` relative to its page, and Vite answers a missing path with `index.html` and a 200. So the base drew the 2,880-index fallback body, and the first single-page comparisons were void. The fix is to link `public/`'s folders into `.m1-cpu-base/`: `assets`, `barrels`, `lessons` and `public` itself (for `../../public/…` imports). Also copy `package.json` there.
- **The water sheet's `waterSheetGpuTime` overstates frames that queue behind each other.** 65 frames ran in 6 ms each, yet the timer read 15–31 ms each. ANGLE's timer spans queued work. Isolate each frame with a read, or use throughput.
- **Isolated light frames read the GPU's clock, not its work.** Classic jumped between about 2.8 and 5.8 ms from block to block. Throughput blocks fixed it.
- **The hidden pane's worker falls into a slow state at times.** The Beach and Point menu seas read 26–27 ms with a single arm, and the Beach read 5.7 ms in the next run. The cause is likely efficiency-core scheduling. Paired arms share it, but absolute numbers need repeating.
- **Short pipeline runs at Padang compare different wave phases.** An 8 s run read 21.8 against 14.4 ms; a 20 s run read 14.0 against 13.8. Use 16–20 s there.
- **Changing a file the page imports from the Vite root reloads the page.** That re-settles the sheets.

## 1. Worker CPU stages (Node, paired)

ms per step, p50/p95, over 300 steps (Padang 240). Canyon Medium, Padang Medium and Wave Pool Medium; 64 components; ridden (idle, then paddling).

**Calm run (load 1.7–5):**

| Spot | Base | Today | Paired difference | Main stage changes |
|---|---|---|---|---|
| Canyon, against `ca1dd350` (160 × 636 cells) | 7.21/8.71 | 7.09/8.17 | **−0.11** | snapshot +0.18, foam −0.17, aeration −0.08 |
| Canyon, against `a246523d` (220 × 451, the 220 m window) | 6.53/7.73 | 7.07/8.17 | **+0.57** | snapshot +0.26, foam +0.11, aeration +0.08, breaking +0.05 |
| Padang | 11.22/13.34 | 11.22/13.21 | +0.01 | each stage within ±0.01 |
| Wave Pool | 8.43/9.61 | 8.26/9.43 | −0.18 | aeration −0.17 |

**Loaded run (load 12–16):** the same picture.

| Spot | Base | Today | Paired difference |
|---|---|---|---|
| Canyon, against `ca1dd350` | 16.16 | 14.76 | −0.58 |
| Canyon, against `a246523d` | 24.75 | 25.19 | +0.70 |
| Padang | 24.82 | 25.26 | +0.86 (no stage over ±0.12) |
| Wave Pool | 17.71 | 18.13 | +0.27 |

**The Canyon's grids:**

| Tree | Window | Solver cells | Render nodes |
|---|---|---|---|
| base | 160 m | 101,760 | 112,056 |
| `a246523d` | 220 m | 99,220 | 112,931 |
| today | 240 m | 108,240 | 123,151 |

**The Canyon's CPU solver step** (the Fast tier's water), Node, ms p50, two runs each:

| Tree | Run 1 | Run 2 |
|---|---|---|
| base | 40.6 | 41.6 |
| `a246523d` (220 m) | 40.5 | 40.6 |
| today (240 m) | 43.5 | 44.2 |

That is +7–9 % for the 240 m window.

The harness's own output for every run, with each stage's p50/p95 and the snapshot and state comparison, is in [data/](data/) (`node-ab-*-calm.txt`, `node-ab-*-loaded.txt`; "old" is the base arm).

**Physics identity.** It is not expected, and not found. Ridden seas differ from the first step at every spot: board, rider and reaction at Padang and the Pool, and the whole layout at the Canyon. The cause is the paddle-balance fix (`521e5c5a`, `cf02f4db`: the prone balance keeps the water's level) and the sprint paddle. In the water sheet, today's two frames held byte-identical seas, while base against today differed by the board's position (35.23 against 35.48 m).

## 2. The worker in the page (WebGPU, paired)

`gpu-check.html?mode=pipeline&arms=base`, ridden (idle), ms per step, p50/p95. Calm run (load about 2). "Real time" is noisy to about ±10 %: the first arm reads low.

| Spot | Preset | Base total | Today total | Base, real time | Today, real time | Notes |
|---|---|---|---|---|---|---|
| Canyon | Medium (24 components) | 11.3/11.6 | **10.4/10.7** | 1.45× | 1.56× | foam −0.4, aeration −0.4; the water map 4.4 in both |
| Canyon | High (64 components) | 15.0/15.6 | 14.8/15.3 | 1.10× | 1.11× | water map 6.0 → **6.4** (+6 % cells), snapshot 5.5 → 5.9, foam −0.3 |
| Padang | Medium | 21.0/29.0 | 21.2/29.2 | 0.74× | 0.73× | contact 5.3, front 2.7–2.8 in both |
| Padang | High | 23.1/35.2 | 24.0/39.0 | 0.68× | 0.64× | contact 4.8 → 5.4 here; the loaded run read 33.0 → 33.3; Node reads it as equal |
| Wave Pool | Medium | 15.8/16.9 | 15.8/16.9 | 1.03× | 0.95× | |
| Wave Pool | High | 15.9/17.2 | 16.0/17.1 | 1.03× | 0.92× | |

The loaded runs (load 12) agree:

| Spot | Preset | Base | Today |
|---|---|---|---|
| Canyon | Medium | 29.6 | 25.7 |
| Canyon | High | 25.3 | 25.2 |
| Padang | Medium | 37.9 | 37.0 |
| Padang | High | 33.0 | 33.3 |
| Wave Pool | Medium | 17.6 | 17.5 |
| Wave Pool | High | 27.3 | 27.0 |

Padang keeps 0.64–0.74× real time on the M1, ridden, with or without today's merges. Its swept contact (5–10 ms) and front (3–5 ms) are the M1 CPU study's open items.

## 3. The GPU's frame (paired in one page)

Steady-state ms a frame at 1280 × 720, base / today. "Diff" is the paired median of today − base, with its range over 8 cycles. The last column is the main thread's submission per frame, base / today.

**Wave Pool, Medium**

| View | Rich, base / today | Diff | Classic, base / today | Diff | Submit |
|---|---|---|---|---|---|
| ride | 10.56 / 10.88 | +0.05 [−0.75, 0.60] | 3.47 / 3.49 | +0.02 [−0.07, 0.05] | 0.7–1.0 / 0.7–1.0 |
| lineup | 8.30 / 8.49 | +0.11 [−0.13, 0.25] | 2.90 / 2.86 | +0.01 | |
| horizon | 12.59 / 12.84 | +0.03 [−0.50, 0.40] | 5.14 / 5.17 | +0.03 | |

**Wave Pool, High**

| View | Rich, base / today | Diff | Classic, base / today | Diff | Submit |
|---|---|---|---|---|---|
| ride | 12.00 / 12.31 | −0.04 | 3.30 / 3.29 | −0.02 | 0.8–1.2 / 0.7–1.1 |
| lineup | 7.94 / 8.06 | +0.01 | 2.46 / 2.44 | −0.02 | |
| horizon | 16.19 / 16.28 | 0.00 | 3.80 / 3.86 | 0.00 | |

**Padang Padang, Medium**

| View | Rich, base / today | Diff | Classic, base / today | Diff | Submit |
|---|---|---|---|---|---|
| ride | 6.86 / 6.83 | −0.01 | 3.94 / 3.96 | +0.01 | 0.6–0.9 / 0.6–0.8 |
| lineup | 5.48 / 5.43 | −0.05 | 3.58 / 3.59 | 0.00 | |
| horizon | 9.66 / 9.85 | 0.00 | 5.15 / 5.23 | +0.08 | |
| curl-channel | 8.09 / 8.12 | +0.04 | 4.91 / 4.94 | +0.02 | |

**Padang Padang, High**

| View | Rich, base / today | Diff | Classic, base / today | Diff | Submit |
|---|---|---|---|---|---|
| ride | 11.62 / 11.94 | −0.07 | 6.15 / 6.17 | −0.04 | 0.8–1.3 / 0.8–1.2 |
| lineup | 10.19 / 10.29 | −0.02 | 5.76 / 5.76 | +0.02 | |
| horizon | 15.46 / 15.91 | +0.35 | 8.32 / 8.61 | +0.09 | |
| curl-channel | 10.89 / 10.97 | +0.03 | 7.27 / 7.35 | 0.00 | |

**The Canyon.** Its scenes differ: the layout moved the take-off, so every camera stands somewhere else over a different bed.

| Preset | View | Rich, base / today | Diff | Classic, base / today | Diff |
|---|---|---|---|---|---|
| Medium | ride | 9.15 / 8.85 | −0.52 | 6.01 / 5.76 | −0.32 |
| Medium | lineup | 8.42 / 8.99 | +0.37 | 4.53 / 4.27 | −0.22 |
| Medium | horizon | 10.64 / 11.06 | **+0.22** | 5.81 / 6.10 | **+0.28** |
| High | ride | 10.39 / 10.16 | −0.24 | 7.12 / 6.71 | −0.50 |
| High | lineup | 10.59 / 10.18 | −0.42 | 6.29 / 5.66 | −0.62 |
| High | horizon | 13.66 / 14.22 | **+0.40** | 7.56 / 6.94 | −0.59 |

From high up, where the wider tank shows (`horizon`, close to the menu's view), today's Canyon costs 0.2–0.4 ms more in Rich. From the ride's own views it costs the same or less. Main-thread submission: 0.6–1.5 ms per frame in both trees.

## 4. Today's features one by one

| Change | How | Measured cost (M1) |
|---|---|---|
| Rock bed (`rockBed.ts`, Canyon only) | `waterRockBed(on/off)` in today's frame, paired throughput blocks | Rock − sand at Medium: Rich −0.06, +0.08, −0.18 (noise ±0.15); Classic +0.09, +0.04, +0.07. At High: Rich +0.12, +0.05, +0.15; Classic +0.05, +0.08, 0.00 (ride, lineup, horizon). **≤ 0.15 ms, no cliff.** Isolated frames (GPU timer): Rich +0.01 to +0.07, Classic up to +0.22. The texture units are unchanged: the bed texture only went R → RG |
| The glow's MSAA (`f3a45f41`, `bff9a874`) | `?glowMsaa=2/4` switched live (`history.replaceState`) with `setGlow`, Canyon, High's values, Rich, ride / horizon | See the table below |
| Curl foam (`brokenCrest.ts`, Padang) | `BrokenCrests.update` timed per snapshot | 0.0 ms median, 0.1 p90 |
| Paddle balance and sprint paddle (`AttachedRider.ts`) | Node A/B board stage | +0.00 to +0.02 ms per step |
| Camera swing (`SpectatorCamera.ts`, `main.ts`) | not timed apart | a few scalar operations per frame; the page's frame and submission are unchanged at the Pool |
| Canyon long wave (the 240 m window) | Node A/B against `a246523d`, pipeline | CPU stages +0.57 ms per step (+8 %), CPU solver +7–9 %, the GPU water map +0.4 ms at High, the snapshot +0.26 ms (+9 % render nodes) |

**The glow's MSAA**, steady-state ms a frame, ride / horizon:

| Resolution | Glow off | Glow at 2× | Glow at 4× |
|---|---|---|---|
| 1280 × 720 | 10.23 / 11.62 | 9.80 / 10.79 (−0.45 / −0.84 against off) | 11.78 / 13.06 (+1.55 / +1.38 against off) |
| 2240 × 1260 (High's density) | 18.66 / 19.93 | 18.42 / 19.59 (−0.26 / −0.32 against off) | 21.85 / 23.22 (+3.19 / +3.34 against off) |

The glow's 2× is a little cheaper than the glow off, because with the glow off the canvas draws at its own 4×.

### The page's main thread per new snapshot (paired, ms p50 (p90), base / today)

| Spot | `PhysicalMode.update` | `WaterSurface.update` | Spot's own drawing |
|---|---|---|---|
| Padang, Medium (loaded) | 0.7 / 0.7 | 0.2 / 0.2 | `drawBarrel` **11.5 (23.2) / 11.8 (21.6)** |
| Padang, High (loaded) | 1.0 / 0.9 | 0.2 / 0.2 | `drawBarrel` **14.2 / 14.2**, of which `SweptLoft.build` 10.5 / 10.7 |
| Canyon, High | 0.4 / 0.5 | 0.2 / 0.2 | `drawCurl` 0.2 / 0.2, roller front 0.0 / 0.0 |

`drawBarrel` today, Padang Medium, broken down:

| Part | ms p50 (p90) |
|---|---|
| `SweptLoft.build` | 10.1 (21.6) |
| `SweptBarrelMesh.update` | 1.3 (3.8) |
| `setBarrelMask` | 0.8 |
| `cameraWater.prepare` | 0.7 |
| `BrokenCrests.update` | 0.0 (0.1) |

Inside the loft, wrapped timers put most of it in the cap refinements (`cRefinements`, about 400 `cRefineCap` calls per build) and in `ProfileLibrary.profileAt`/`analyticShape` (about 70 µs a call). This is not a regression. The same code also runs in the worker's contact, where the M1 CPU study already took the exact wins it found (its "Not built" list puts what is left at about 1 ms).

## 5. The menus (the open item from 2026-09-27)

**The menu's sea** in the worker, on Medium's values (practice swell, riderless, 24 components). Calm machine, hidden pane, ms per step p50/p95:

| Spot | Cells | Today | Base | Real time |
|---|---|---|---|---|
| Reef | 41,440 | 5.5/28.7 | | 1.47× |
| Beach | 37,280 | 5.7/29.2 | 5.4/29.2 | 1.16× (one slow-state run read 27.3) |
| Point | 37,280 | 26.2/31.1 (slow state only) | | 0.62× |
| Padang | 81,600 | 8.1/8.4 (loaded: 14.0/23.6) | loaded: 13.8/22.4 | 1.99× |
| Canyon | 108,240 | 12.9/13.8 (loaded: 13.7) | loaded: 13.9 | 1.25× |
| Wave Pool | 100,520 | **14.4–14.5**/15.2 | 14.3/14.8 | 1.04–1.09× |

The menu's sea costs the same as before today. It costs less than a ride's step at the same spot (the Pool's ridden step was 15.8 ms, the Canyon's 10.4–14.8, Padang's 21–24). Padang's menu also lofts its swept barrel on the main thread at every snapshot, about 10 ms (above), rider or not.

**The menu's drawing.** The cinematic view sweeps 11 m up and 60 m inshore, looking out. It is compared with a ride-like front view and the sheet's views at the same spot, on Medium's values, steady-state ms a frame:

| Spot | Resolution | Look | Menu view | Ride-like | Lineup | Horizon | Menu over ride |
|---|---|---|---|---|---|---|---|
| Reef | 1280 × 720 | Rich | 9.13 | 7.85 | 8.21 | 8.86 | +16 % |
| Reef | 1280 × 720 | Classic | 3.85 | 3.26 | 3.19 | 4.11 | +18 % |
| Canyon | 1280 × 720 | Rich | 9.10 | 7.27 | 6.47 | 8.38 | +25 % |
| Canyon | 1280 × 720 | Classic | 4.15 | 3.79 | 3.43 | 4.53 | +10 % |
| Wave Pool | 1280 × 720 | Rich | 7.89 | 7.13 | 6.84 | 7.43 | +11 % |
| Wave Pool | 1280 × 720 | Classic | 3.02 | 2.66 | 2.31 | 3.05 | +14 % |
| Canyon | 2240 × 1260 | Rich | 15.63 | 13.61 | 12.18 | 14.60 | +15 % |
| Canyon | 2240 × 1260 | Classic | 7.68 | 6.61 | 6.13 | 7.36 | +16 % |
| Reef | 2240 × 1260 | Rich | 21.36 | 22.79 | 24.87 | 22.59 | −6 % (a slower GPU state; not comparable with the Canyon row) |

So the menus cost 0.4–1.8 ms more GPU a frame than a ride at Medium (+10–25 %). At High's density they cost about 2 ms more. The worker costs less than a ride's. Not measured: the panels' `backdrop-filter` blur (14–18 px) over the live canvas. That is the compositor's GPU work every frame the canvas changes, and it needs the visible pane or the survey (`npm run survey:fps`) in a real window. The 2026-09-27 options still stand (the owner's call):

- hold the waves still behind Settings and the Logbook;
- draw them at 0.75 scale behind the panels (about −44 % of the pixels);
- cap them at 60 fps on 120 Hz screens.

## 6. What Auto picks on this M1 (the open item from 2026-09-27)

**It could not be run here.** In the hidden pane `requestAnimationFrame` never fired, and the benchmark counts frame intervals: it ignores any over 250 ms, so it never finishes. What follows is predicted from its rules (`Graphics.ts`: `choosePreset`, `highHolds`) and the parts measured above.

1. **Medium's part (the menu's waves on Medium's values).** Three tests, all needed:
   - at most 5 % of frames late (over 1.5 refreshes, 25 ms at 60 Hz);
   - the sea at 0.9× real time or better;
   - **1.2 × the median worker step ≤ 16.7 ms, i.e. the step ≤ 13.9 ms.**
2. **The worker test depends on the spot the menu shows** (`nextBackdropSpot` picks at random):

   | Menu spot | Worker step, GPU otherwise idle | 1.2 × step | Verdict |
   |---|---|---|---|
   | Wave Pool | 14.4 ms | 17.3 ms | **fails: Low** |
   | Canyon | 12.9 ms | 15.5 ms | passes alone, by 1.2 ms. The menu's own drawing shares the GPU, and the readback study's busy-page runs (`&hop=6`, `&gpuLoad=600`) raised the worker's step by 10 ms and more, so it **probably fails: Low** |
   | Reef, Beach, Padang | 5.5–8.1 ms | | pass with room; Point too in a fast state |

3. **Frames on Medium's values.** Medium draws at pixel ratio 1: 7–9 ms of GPU a frame at a 1280 × 720 window (Rich), about 1.4× that full screen on the Air (1440 × 900). Plus the water's GPU step. On time at 1280 × 720 very likely; full screen it is close.
4. **The High trial** (6 s on High's values): High draws at 1.75 density, 2240 × 1260 for a 1280 × 720 window. Rich at that size measured:
   - Canyon ride 18.7 ms, menu view 15.6 ms;
   - Reef views 21–25 ms.

   Its frames would be late, so **the trial fails: Medium.**

**Prediction: Medium when the menu shows the Reef, Beach, Point or Padang; Low when it shows the Wave Pool, and probably the Canyon. Never High.** Two flaws in the rule, both the owner's call:

- **The verdict depends on the menu's random spot.** Its sea costs from 5.5 ms (the Reef) to 14.5 ms (the Pool), against a 13.9 ms threshold that was set on one spot. A fixed reference spot, or a threshold scaled by the spot's cells, would make it repeatable.
- **The High trial never sees High's sea.** Sea detail waits for the next wave (`NEXT_WAVE_FIELDS`), so the menu keeps its 24-component sea through the trial. High's 64 components add about 0.4 ms of GPU water at the Canyon, on top of more drawing.

**To see the real verdict:** open `/?diagnostics` in a visible window on the M1, choose Settings → Re-detect, and read the console's `Auto benchmark` lines.

## 7. What changed on this branch

- `scripts/m1-cpu-ab.ts`:
  - `--base-state <file>`, the base tree's own saved sea, for a layout whose window differs between the trees;
  - it prints both arms' grids.

  Dev tooling only.
- [tools/ab.html](tools/ab.html) and [tools/perf-page.js](tools/perf-page.js): the two-frame paired GPU timing used above. To use them:
  1. Copy both into `.m1-cpu-base/`, after `git archive <base> src | (mkdir -p .m1-cpu-base && tar -x -C .m1-cpu-base)`.
  2. Add `git archive <base> package.json | tar -x -C .m1-cpu-base`.
  3. Link `assets`, `barrels`, `lessons` and `public` from `../public` into `.m1-cpu-base/`.
  4. Open `/.m1-cpu-base/ab.html?q=<the water sheet's query, URL-encoded>`, with `&trees=new,new` for an A/A control.
  5. In the console: `await treeAB.install()`, then `await treeAB.full(['ride','lineup','horizon'], ['rich'])`.
- No game code changed, so the game's output is unchanged by construction: no source under `src/` was edited.
- Tests:
  - `npx tsc --noEmit -p .` is clean;
  - the main suite (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation` and `SurfZoneRunner`) passes: 301 files, 2,852 tests, 18 expected failures, 30 skipped, in 354 s;
  - no physics code changed, so the rider subset was not needed.

## 8. Savings that change the look or the physics (not built, for the owner)

Ordered by what they would save on the M1:

| Option | Saving (measured here) | What changes |
|---|---|---|
| Loft Padang's drawn barrel off the main thread (a worker), or draw it from the loft the worker's contact already builds | **About 10 ms of main thread per snapshot at Padang** (`SweptLoft.build` 10.1–10.7 ms p50, 15–22 p90; `drawBarrel` 11.5–14.2) | A frame of latency on the curl's shape. Drawing the contact's loft would follow the solver's water, not the drawn (cubic) surface |
| High's pixel density on the M1: cap at 1.25–1.5 instead of 1.75 | Rich ride 18.7 ms at 1.75 (2240 × 1260) against 10.2 at 1.0; about −25 % at 1.5 | Sharpness at High; a preset decision |
| Auto: a spot-independent menu benchmark, and a High trial on High's sea | No ms; a repeatable verdict (today Medium or Low by chance) | Which preset an M1 lands on |
| The canvas's own antialias at 2× when the glow is off | Estimated 0.3–0.8 ms a frame (the glow's 2× path draws 0.3–0.8 ms under the glow off at 4×) | Edge smoothness with the glow off |
| The menus: hold still behind Settings and the Logbook, or 0.75 scale behind panels | The menu view's +10–25 % over a ride; 0.75 scale removes about 44 % of the pixels; plus the panels' blur | What shows behind the menus |
| Back to canyon-layout's 220 m window | −0.57 ms CPU stages per step; the Fast tier's water 44 → 40.6 ms; −0.4 ms GPU water at High; −0.2 to −0.4 ms from high views | Undoes the long wave (its break needs the window) |
| Snapshot fields as f16, or interpolated on the GPU (the M1 CPU study's list) | 1–2 ms of worker per step; the Canyon's snapshot grew 0.2–0.4 ms today | The page's water bytes |
| Rock bed off | ≤ 0.15 ms | The Canyon's white wedge comes back. Not worth it |
