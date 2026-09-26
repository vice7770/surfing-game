# Frame-rate survey data

One JSON file per survey run, named `<date>-<machine>-<pass>.json`. The [frame-rate report](../fps-report.md) is generated from every file here, so a new machine is one more run and one more section.

## Adding a machine

```bash
npm run build && npm run preview
npm run survey:fps -- docs/research/fps/<date>-<machine>-1-presets.json --commit=$(git rev-parse --short HEAD)
npm run survey:fps -- docs/research/fps/<date>-<machine>-2-settings.json --features --spot=Beach --commit=$(git rev-parse --short HEAD)
npm run report:fps
```

Close other GPU-heavy windows first, and plug the laptop in: below 20 % battery Chrome's Energy Saver caps every page at 30 fps. Each row records the power source and charge; the file records Low Power Mode and the load average, but not what else was drawing.

## What a file holds

- **`machine`:** model, chip, CPU and GPU cores, memory, displays, macOS, power source and Low Power Mode, from `system_profiler` and `pmset`. Serial numbers and hardware UUIDs are left out.
- **`browser`:** Chrome's version, the WebGL renderer, the WebGPU adapter, the page size and pixel ratio, and the display's measured refresh.
- **`frameCap`, `window`, `commit`, `build`, `loadAverage`, `date`:** the conditions of the run.
- **`results`:** one entry per setting and screen, with the frame statistics (FPS, 1 % low, frame-time percentiles, GPU time per frame, main-thread time, draw calls, triangles), the canvas size, the solver's tier and step time through the window, the JS heap, and the power source and charge when it was measured. A step that failed carries `error` and the screen the page was on instead.

## Findings · 2026-09-26, MacBook Pro M4 Pro (`aa1afc9`)

From [the report](../fps-report.md), on AC power at a 1280 × 720 page:

- **Every screen holds the display's 120 fps at every preset,** with 1 % lows of 97–109 fps. The frame rate says nothing more on this machine; the GPU time does.
- **The Surf screen is the heaviest screen in the game:** 8.6 ms of GPU per frame on High and 9.0 ms on Ultra (95th percentile 10.7–10.8 ms), over the 8.3 ms a 120 Hz frame has. It costs about 4 ms more than the title on the same preset, which points at the surfer preview (it adds 12 draw calls and its own WebGL context). Rendering the preview only when it changes, or at a lower pixel ratio, is the first optimisation to try.
- **The menus draw the whole surf zone behind their panels:** 4.5–5.4 ms on High for the title, Settings and Logbook, although the panels cover most of it. Low shows a still frame there (0 ms).
- **A ride's GPU time barely follows the resolution:** a quarter of the pixels (render scale 0.5) saves 0.7 ms of 4.6 ms, and Ultra's 1.56× the pixels of High adds 0.2–0.6 ms. A ride frame submits about 0.9 M triangles at Medium and above whatever the resolution, so geometry and fixed-size passes dominate.
- **One setting at a time, the ride's toggles are within noise** (±0.3 ms): caustics, spray mist, ocean view, foam, water look and sea detail. Only the render scale moves it clearly.
- **"Water simulation: Fast" is slower here:** it moves the solver to the CPU at 7.1 ms a step, against 3.0–3.5 ms for stage 2 on the GPU. On a machine with WebGPU, Fast only saves 17 draw calls.
- **Main-thread work is small:** 0.4–0.9 ms a frame in the physical scenes; the Wave Lab's legacy wave uses 1.7–1.9 ms.
- **One outlier:** High · Ride · Point measured a 9.2 ms median GPU time (95th percentile 21 ms) while the other spots and Ultra's Point measured 4.7–5.4 ms; the frame rate held 120. It is kept as measured.
- **On battery below 20 %, Chrome caps every page at 30 fps (Energy Saver).** An earlier run, discarded, went from 120 to exactly 30 fps on every screen when the battery crossed 20 %.
