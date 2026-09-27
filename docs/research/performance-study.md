# Performance study

2026-09-27. It starts from the M4 Pro frame-rate survey (branch `claude/session-recording-fps`: [fps-report.md](https://github.com/vice7770/surfing-game/blob/claude/session-recording-fps/docs/research/fps-report.md) and its data in `docs/research/fps/`). The same survey was re-run on the M1 Air, with the GPU timing corrected (below). The CPU was profiled, load times were measured, and the start-up that the survey found hanging was traced. Measured and recorded, never a gate.

## Summary

- **The M4 Pro runs everything at its 120 Hz display.** At High, a ride uses 4.7–5.4 ms of GPU a frame, of the 8.3 ms a 120 Hz frame has. The one screen over budget, Surf, is a timing artifact (below).
- **Found and fixed: a start-up that never finished.** At High, the menu's first Reef never came up, and its worker kept a CPU core busy. This is also why the survey stopped at High on the M1. Fixed in PR #32.
- **Found and fixed: the camera jumped as waves passed a waiting rider.** Fixed in PR #28.
- **Fixed here: the pause menu redrew a still picture every frame** (4.9 ms of GPU at 120 Hz on the M4 at High; 7.8 ms at 60 Hz on the M1 at Medium). It now draws only when the view changes.
- **The largest cost left is load time, not frame rate.** Each surf zone spins up 24 s of sea on the CPU before the GPU takes over: 11–28 s on the M1 Air, 6 s on the M4 Pro. Spinning up on the GPU is the first recommendation.

## Update, later the same day

Three of the recommendations below are done:
- **1, spin up on the GPU (PR #39):** the worker attaches its device first and steps the spin-up on it, one stable substep a call. Every substep waits for the GPU, so the page also stops drawing and stepping the sea it replaces:
  - behind the loading card;
  - while the menu's new waves spin up on its gradient.

  On the M1 Air, measured against main after the merge:

  | | Before (CPU spin-up) | After |
  |---|---:|---:|
  | Menu's waves after launch | 38–44 s | 3.8–7.2 s |
  | Paddle out to riding | 19–27 s | 2.6–5.8 s |
  | Quit to the menu's new waves | 26–27 s | 2.2–4.5 s |

  All 24 spin-ups of the stability scan came up finite on the GPU, in 2.3–5.3 s.
- **4, guard the GPU step (PR #39):** the GPU step now also stops with an error on diverged water.
- **5, fix the survey (PR #41):** only the game's context is timed; the surfer preview's timer is reported apart. On ANGLE Metal a timer spans the GPU's timeline, including overlapping work from other contexts and processes, so contexts cannot be separated exactly. The survey no longer counts a frame twice.

Recommendations 2 (what the menus may cost) and 3 (Auto on the M1) stay open.

## Machines

| | M4 Pro (the user's survey) | M1 Air (this study) |
|---|---|---|
| Machine | MacBook Pro, M4 Pro, 20-core GPU, 48 GB | MacBook Air, M1, 8-core GPU, 8 GB |
| Display | 120 Hz | 60 Hz |
| Build | `aa1afc9` | `193b3f5` (main), then PR #32's build |
| Load average | 4–6 | 5–9 while measuring; other sessions later pushed it to 15–40 (runs marked) |
| Browser | Chrome 153, ANGLE Metal, WebGPU | Chrome 153, ANGLE Metal, WebGPU |

## Corrections to the survey's method

1. **The GPU time was counted once per WebGL context.** The survey opens a GPU timer on every context around every frame callback, and adds them up. A timer measures the GPU's timeline, so each context's timer also counts the other context's work. A test page on the M1 showed this:
   - one heavy context read 7.7 ms a frame;
   - a second context that only clears a 200 × 200 canvas raised the reading to 16.4 ms;
   - two equal heavy contexts read 98 ms where about 64 ms is expected.

   The Surf screen has two contexts: the game, and the surfer preview. Its reading is about twice the title's at every preset (5.4 vs 2.9 ms at Medium, 8.6 vs 4.5 at High, 9.0 vs 4.7 at Ultra). At Low, where the game shows a still frame, it reads 0.54 ms. So **the surfer preview costs about 0.5 ms, not 4 ms**, and the Surf screen is not the heaviest screen. The M1 runs below time one context only.
2. **Small GPU times overstate cost.** Apple GPUs clock down when lightly loaded. On the test page, doubling the shader work from 150 to 300 iterations moved the reading only from 7.7 to 8.2 ms; the reading scales properly from about 600 iterations up (11 → 54 → 119 ms). A 4 ms reading at 120 fps is headroom at a low clock, not 4 ms of full-speed work. Compare readings on the same screen, before and after a change.
3. **The water solver's GPU time is not counted.** It runs on WebGPU in a worker. So "Water simulation: Fast is slower" is half the story. Fast moves about 3 ms a step of GPU work onto 7 ms a step of a worker's CPU core. On a GPU-bound machine that can be the faster choice (the M1 below).
4. **A timed-out step is not a slow machine.** The M1 survey stopped at High because its menu never loaded. That was the divergence fixed in PR #32, not the M1's speed.

## M1 Air measurements

### Frame rate (60 Hz display, load 5–7)

GPU ms per frame, median, with the corrected timing. FPS was 60 on every screen at Low and Medium (1 % lows 56–57).

| Screen | Low | Medium |
|---|---:|---:|
| Title menu | still frame | 9.0 |
| Settings, Logbook | still frame | 8.9–9.0 |
| Surf (pick a break) | — | 11.8 |
| Ride · Beach | 6.4 | 7.7 |
| Ride · Point | 5.4 | 8.7 |
| Pause menu (a still picture) | 6.4 | 7.8 |
| Wave Lab | 3.3 | 3.1 |

- **The menus cost more than the rides:** 9.0 ms against 7.7 ms at Medium. The menu's cinematic camera stands 11 m up and sees more of the tank than a ride does.
- **The main thread is not the limit:** a CPU profile of a ride (Beach, Medium) puts it at 1.1 ms a frame, nearly all of it WebGL submission; the survey's own callback timer read 3.9 ms. Either way it is far under the 16.7 ms frame. The water's per-frame rewrite and upload take 0.1 ms.

### High on the M1 (inconclusive)

High draws 2240 × 1260 on the Air's display (1.75 × density), with the 64-component GPU sea. It was measured after the fix, while another session was loading the GPU. A control run of Medium at that time gave 31–33 fps, against 60 fps earlier. Only the comparisons within these runs hold:

| Ride · Beach, High with | FPS | GPU ms | Solver ms a step |
|---|---:|---:|---:|
| nothing changed | 13.8 | 74 | 341–385 |
| render scale 0.5 | 32.3 | 33 | 145–188 |
| sea detail standard | 18.7 | 44 | 247–342 |
| water simulation fast (CPU solver) | 20.9 | 41 | 29–38 |

The GPU solver's step waits behind the frame's rendering: a quarter of the pixels halves it. P8 recorded Auto choosing High on this machine; that was before the Rich water (G8) and the barrels (G9). **Re-measure High on the M1 with no other session running.** If it holds under 60 fps, Auto should weigh High's resolution before choosing it.

### Load times (PR #32's build, load 6–9)

| | Menu's waves appear | Beach ride ready | Reef ride ready |
|---|---:|---:|---:|
| Medium | 28.2 s | 11.1 s | 15.4 s |
| High | 21.9 s | 25.8 s | 22.1 s |
| M4 Pro, High (the survey's film log) | 8.4 s after launch | 6.2 s | — |

The spin-up alone, in Node on the M1, took 7–53 s one run at a time (the four spots, 24 and 64 components, seed 1). With two runs at once it took 19–98 s (the same, with seeds 1–3).

## What was fixed

| Change | Where | Effect |
|---|---|---|
| The front camera's lean toward the crest fades and eases | PR #28 | Sitting still at the Beach: 16 jumps over 0.5° in 60 s, the worst 10.2°, down to none (worst 0.23°) |
| The spin-up checks stability every substep; diverged water throws | PR #32 | The High Reef menu comes up (33 s on the M1), where it never did; it no longer holds a CPU core |
| A paused game draws only when its view changes | This branch | 15 of 481 paused frames draw, against every frame; the camera no longer glides after pausing |

## Recommendations, most useful first

1. **Spin up on the GPU where there is one.** The worker builds the whole surf zone, spin-up included, on the CPU. Only then does it attach the WebGPU device. Attaching the device first and stepping the spin-up on it could cut the load from 11–28 s to a few seconds on the M1, and from 6 s to about 2 s on the M4. These are estimates: P9 measured the GPU stepping real time about 3× faster than the CPU on the M1. The spin-up must step one CFL substep per call, as PR #32 now does on the CPU, so it reads the water back every substep. The work:
   - split `SurfZoneSimulation`'s constructor into a build and a spin-up;
   - move the post-spin-up setup (breaking model, peel tracker, lip, foam) after it;
   - let `SurfZoneWorkerCore` spin up once the device exists.

   Online seas are unaffected: a joining player imports the donor's state.
2. **Decide how much the menus should cost.** On the M4, the waves behind the menus cost 4.5–5.4 ms of GPU at 120 fps. On the M1, they cost more than a ride. Each option changes what shows, so this is the user's call:
   - cap the menu's waves at 60 fps on faster displays: half the menus' GPU on the M4, nothing changes on 60 Hz screens;
   - draw them at 0.75 render scale behind the panels;
   - hold them still behind Settings and the Logbook, as Low does everywhere.
3. **Re-check Auto on the M1** once the machine is quiet (above).
4. **Guard the GPU step as the CPU step now is.** `GpuBoussinesq.step` sizes its substeps from the same stability bound. Diverged water there would queue trillions of dispatches, so it should throw too.
5. **Fix the survey before the next machine** (branch `claude/session-recording-fps`):
   - time one context per frame (or attribute each timer to its own context's callbacks);
   - record the solver's step as the survey already does, and the load times above;
   - discard runs with another GPU-heavy process running.
6. **Small, only if a machine needs them:**
   - skip the FFT chop and caustics on frames with no new snapshot: at 120 Hz, half the frames re-render an unchanged sea, but the chop costs at most 0.3 ms on the M4;
   - cap the surfer preview at 30 fps: about 0.5 ms;
   - grade the Rich patch's spacing with distance: it holds 295 k triangles, but the Rich look costs 0.2 ms on the M4.
