# GPU tier parity report

Does the GPU (WebGPU) tier throw the CPU tier's lips, tubes and whitewater, stay stable with lips landing, and could it go silent unnoticed again? Numbers are reported, not gated. **Status: in progress** (see [what is left](#status-and-what-is-left)).

**Why now.** Until 33fae37 a device step never read back η_t (`FIELD.RATEH`). A lip's crest motion needs it, so on the GPU `throwLip` returned before every throw: no lips, tubes, splash-ups or lip crashes at any spot. The M4 runs compute 'auto', so that is the tier the user plays. Every lip, tube, whitewater, plunge-zone (#58) and Teahupo'o Reef (#57, #60) change since was measured on the CPU only: the Node reports, the water-sheet dev view and the GPU check page (which compared only the water fields).

## How it is measured

- **Parity** (`/gpu-check.html?mode=lips`): the same surf zone on both tiers, each in its own worker, built as the game builds it (the GPU tier warm, spun up on its device; the CPU tier spun up on the CPU). Same seed, swell and sea: the GPU tier's 64 components on both. The game's runner steps 1/60 s with its spray and bubbles, no rider, for 60 s after the spin-up. Every step records lip throws and rollers, jet and splash-up landings, the flying tubes, the particles in the air by kind, and the plunge zone's held cells (`src/dev/tierParity.ts`).
- **Flags:** a metric one tier shows and the other never does is **silent**; one more than twice as busy on one tier (once the busier makes 10 a minute), **diverging**. A GPU tier that falls back to the CPU is flagged too: a failing device is dropped without a word.
- **Stability** (`?mode=probes`): the Reef's CI probes (40 m window, 60 m for the oblique and lagoon ones, 12 components, seed 3, 1/30 s steps for 45 s) and its Big swell at game size, on both tiers. The fastest water deeper than 5 cm, where and when; any water not finite or below zero.
- **The data flow** (`src/wave/gpu/GpuBoussinesq.test.ts`): a second solver, stepped on the CPU, stands in for the device's memory, and each frame exchanges exactly the fields `GpuBoussinesq` sends and reads back. A surf zone on it steps bit for bit as on the CPU, lips and all. Without η_t it throws nothing, as the GPU tier did.

The two tiers are not expected to match wave for wave: the device steps in 32-bit floats and breaking is chaotic. Their activity per minute should match.

Runs: the M1 Air (8 GB), 2026-09-28/29, loaded by other sessions (load 17–41). Main at 2cb54a2 plus this branch's dev tools.

## Parity: lips, tubes and whitewater

Each spot at the Wave Lab's default swell (buoy Hs 1.4 m, Tp 10 s, from 10°, s 11.7), and the Reef's Practice (1 m at the edge, 14 s, from 20°, s 40, band 0.08) and Big (3 m, 17 s, from 20°, s 18.3) swells; seed 1, 64 components, mid tide, calm. Per minute, CPU / GPU; populations are the mean in the air (· the peak).

| Case | Throws | Rollers | Jet landings | Splash-up landings | Tubes open | Spray | Mist | Tube spray + mist | Foam balls | Plunge cells |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Beach | 110 / 114 | 637 / 629 | 880 / 912 | 865 / 889 | 2.0 · 43 / 2.1 · 42 | 251 / 250 | 59.0 / 61.6 | 5.2 / 5.3 | 10.2 · 228 / 10.6 · 229 | 34.5 · 344 / 35.6 · 329 |
| Point | 555 / 555 | 23 / 23 | 4415 / 4415 | 4374 / 4375 | 10.1 · 113 / 10.1 · 113 | 754 / 753 | 197 / 196 | 16.4 / 16.4 | 73.1 · 980 / 72.3 · 965 | 163 · 1143 / 163 · 1143 |
| Reef | 277 / 280 | 94 / 94 | 2193 / 2221 | 2185 / 2213 | 5.3 · 55 / 5.4 · 55 | 477 / 477 | 96.1 / 96.2 | 15.2 / 15.3 | 43.0 · 730 / 43.4 · 736 | 73.8 · 525 / 74.1 · 521 |
| Canyon | 8 / 8 | 642 / 642 | 64 / 64 | 47 / 47 | 0.1 · 3 / 0.1 · 3 | 137 / 138 | 26.3 / 26.1 | 0 / 0 | 0.0 · 2 / 0.0 · 2 | 1.7 · 25 / 1.7 · 25 |
| Reef Practice | 328 / 330 | 160 / 158 | 2624 / 2640 | 2617 / 2634 | 6.6 · 63 / 6.6 · 63 | 681 / 685 | 133 / 133 | 13.0 / 13.2 | 26.5 · 433 / 26.3 · 436 | 102 · 615 / 103 · 615 |
| Reef Big | *to rerun* | | | | | | | | | |

- **No tier is silent and nothing diverges.** Every metric agrees within 5 % at the Beach (its mist, 59.0 against 61.6, and mean tubes open, 2.0 against 2.1, differ most) and within 2 % everywhere else. The Point's throws and jet landings, and all of the Canyon's, match exactly.
- **The plunge zone's GPU path meets real landings for the first time here,** and holds the same cells: within 4 % on average, with the same peaks at the Point, the Canyon and on the Reef's Practice swell.
- **Stable:** no broken water on either tier. The fastest water is the same, 3.2–4.8 m/s, in or next to the same cell at the same moment.
- **Reef Big:** both workers failed to load when the dev server stopped mid-run; to rerun.
- **Wall time** for 60 s of sea (not a gate): the GPU tier took 56–76 s, the CPU tier 154–213 s, on the loaded M1.

## Stability with lips thrown

The Reef's CI probes (`SurfZoneSimulation.test.ts`, "the steep Reef holds") on both tiers. The fastest water deeper than 5 cm, m/s, with where (x, z) and when (solver time, s):

| Probe | CPU | GPU | Its guard | CPU in the Reef report |
|---|---:|---:|---:|---:|
| Big, 20°, 40 m | 19.6 (4.5, −38.5, 42.8) | 19.3 (6.5, −37.5, 42.0) | 30 | 22.0 |
| Low tide −0.6 m, 40 m | 14.3 (12.5, −30.5, 42.9) | 17.3 (14.5, −28.5, 43.8) | 30 | 22.7 (Part A) |
| −25°, 60 m | 11.8 (17.5, −24.5, 57.6) | 11.9 (13.5, −28.5, 57.4) | 20 | 11.7 |
| +25°, 60 m | 14.8 (14.5, −27.5, 43.6) | 15.9 (−0.5, −42.5, 39.9) | 20 | 12.2 |
| Lagoon, tide −1.0 m, 60 m | 14.6 (18.5, −25.5, 43.9) | 13.8 (19.5, −24.5, 44.9) | 30 | — |
| Edge, +25°, 40 m | 22.4 (10.5, −32.5, 41.6) | 16.4 (5.5, −37.5, 40.2) | 30 | 28.7 |

- **The GPU stays finite and bounded in every probe,** with lips landing all through: 108–212 throws a minute, within 7 % of the CPU's. No water broke on either tier.
- **The fastest water is the same kind of event on both:** thin backwash (0.29–0.42 m deep) on the ledge, 2–4 m seaward of its crest line, at 40–58 s of solver time (the spin-up is 17 s). The GPU's peaks sit within 3 m/s of the CPU's, except at the edge probe, where the CPU flashes 22.4 m/s and the GPU peaks at 16.4. These are one-second flashes whose size depends on the realization; the report's own CPU numbers for the same probes vary as much (22.0 and 28.7 there, 19.6 and 22.4 here).
- **The plunge zone holds as much on both:** its peak is 587–902 cells on the CPU and 628–888 on the GPU.
- **Why the CPU numbers differ from the report's:** the same code (the lagoon merge, c22ef15) ran these probes in Node for the report and in Chrome's worker here. Checking whether Chrome's and Node's V8 round the same way is on the list below; either way, these are realizations of the same flash.
- **At game size** (the 160 m window, the Big swell on 64 components, 45 s, at mid tide, −0.6 m, −1.0 m, −25° and +25°, and the far-offshore edge case): *to run*.

## The water sheet on both tiers

`?inpage&waterSheet&spot=reef&compute=gpu` steps the sheet's sea in the game's worker on the GPU. It defaults to the GPU tier's 64-component sea: the rich sea comes with the High and Ultra presets, so the pane's own preset (Medium on this M1) would have given the GPU 24 components.

- **The Reef tube sheet (Practice), on the same sea, is the same picture on both tiers.**
  - On the page's 24-component sea both held on a tube 30 s in, face slope 0.48. 1.65 % of pixels differ by more than 8/255, at most 6.8 % in a tile, inside the tube, where the camera is closest to the water.
  - On the 64-component sea both held 32 s in, face slope 0.49. 4.4 % of pixels differ, 1.6–14 % in the tube tiles: the splash-up's spray falls in different places; the lip, the void and the water match.
- **The whitewater sheet on the 64-component sea** held on both tiers 32 s in, with 15 foam-ball sprites and face slope 0.50. On the 24-component sea the GPU held 31 s in with 19 sprites (the CPU's is still to shoot).
- **The 64-component sea throws a far bigger lip than the page's 24-component one:** it is the M4's sea, not the tier, that shows it.

## Divergence and cause

None found that needs a fix. Every difference is the size expected of 32-bit floats in chaotic breaking: counts within 4 %, the same peaks and the same flashes at the same places, one probe's one-second flash apart.

The class of bug that made the GPU tier silent (a field the lip, foam or breaking read that the device did not return) is now caught in Node by the data-flow test, with no GPU needed. A GPU-only bug in the kernels themselves would still need the browser: `?mode=lips` shows it in a few minutes.

## Status and what is left

Done, on branch `claude/gpu-tier-parity`:
- the data-flow test (`src/wave/gpu/GpuBoussinesq.test.ts`) and the exported device field sets;
- `?mode=lips` and `?mode=probes` on the GPU check page (`src/dev/tierParity*.ts`, cases in `src/dev/tierCases.ts`), posting each case to `&receiver=` as it finishes, and their CPU half in Node (`npm run report:tier-cpu`);
- the water sheet's `&compute=gpu|cpu|auto` (and `&components=`);
- the parity runs above for five of six cases, the CI probes on both tiers, and the tube and whitewater sheets.

Left:
- **Needs a browser with WebGPU** (the M1 here or the M4; not a cloud box):
  - rerun `?mode=lips&cases=reef-big`;
  - run `?mode=probes&cases=game-big,game-low,game-lower,game-minus,game-plus,edge-offshore` (both tiers; the CPU half is slow on the M1);
  - shoot `?inpage&waterSheet&whitewater&spot=reef` on the CPU (the 24-component pair), and compare the whitewater pairs pixel by pixel as the tube pairs were.
- **Runs anywhere (Node):** `npm run report:tier-cpu` runs the same cases' CPU half, recorded the same way (`scripts/tier-cpu.ts`).
  - the CI probes' CPU numbers in Node (`-- --mode probes --cases ci-big,ci-low,ci-minus,ci-plus,ci-lagoon,ci-edge`), to set against the browser's (19.6 and 22.4 m/s here, 22.0 and 28.7 in the Reef report);
  - the game-size probes' and the Reef Big parity case's CPU half (`-- --mode probes --cases game-big,…` and `-- --mode lips --cases reef-big`), to pair with the GPU halves above (the browser's `&tiers=gpu` runs only those);
  - the full test suite (`npx vitest run --dir src`);
  - finish this report, add a line to the ROADMAP's P6 section, and open the PR (the user merges).

## Commands

- Serve the worktree: `npx vite --port <port> --strictPort --host localhost`. Long runs need a server without HMR, or any source edit reloads the page and restarts them: a scratch config with `server: { hmr: false }` and the repo's `define: { __BUILD_ID__: '"dev"' }`, passed with `--config`.
- `http://localhost:<port>/gpu-check.html?mode=lips` (all six cases; `&cases=`, `&seconds=`, `&seed=`, `&components=`, `&tiers=gpu|cpu`, `&receiver=http://localhost:<receiver port>`)
- `http://localhost:<port>/gpu-check.html?mode=probes&cases=ci-big,ci-low,ci-minus,ci-plus,ci-lagoon,ci-edge`
- `http://localhost:<port>/?inpage&waterSheet&spot=reef&compute=gpu` and without `&compute` (add `&whitewater` for the whitewater sheet, `&components=64` for the CPU on the M4's sea, `&receiver=` for the PNG)
- `npm run report:tier-cpu -- --mode probes|lips [--cases …] [--seconds …] [--seed …] [--components …] [--out file.json]`
- `npx vitest run --dir src src/wave/gpu src/dev/tierParity.test.ts`
