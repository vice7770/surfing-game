# GPU tier parity report

Does the GPU (WebGPU) tier throw the CPU tier's lips, tubes and whitewater, stay stable with lips landing, and could it go silent unnoticed again? Numbers are reported, not gated.

**Why now.** Until 33fae37 a device step never read back η_t (`FIELD.RATEH`). A lip's crest motion needs it, so on the GPU `throwLip` returned before every throw: no lips, tubes, splash-ups or lip crashes at any spot. The M4 runs compute 'auto', so that is the tier the user plays. Every lip, tube, whitewater, plunge-zone (#58) and Teahupo'o Reef (#57, #60) change since was measured on the CPU only: the Node reports, the water-sheet dev view and the GPU check page (which compared only the water fields).

## How it is measured

- **Parity** (`/gpu-check.html?mode=lips`): the same surf zone on both tiers, each in its own worker, built as the game builds it (the GPU tier warm, spun up on its device; the CPU tier spun up on the CPU). Same seed, swell and sea: the GPU tier's 64 components on both. The game's runner steps 1/60 s with its spray and bubbles, no rider, for 60 s after the spin-up. Every step records lip throws and rollers, jet and splash-up landings, the flying tubes, the particles in the air by kind, and the plunge zone's held cells (`src/dev/tierParity.ts`).
- **Flags:** a metric one tier shows and the other never does is **silent**; one more than twice as busy on one tier (once the busier makes 10 a minute), **diverging**. A GPU tier that falls back to the CPU is flagged too: a failing device is dropped without a word.
- **Stability** (`?mode=probes`): the Reef's CI probes (40 m window, 60 m for the oblique and lagoon ones, 12 components, seed 3, 1/30 s steps for 45 s) and its Big swell at game size, on both tiers. The fastest water deeper than 5 cm, where and when; any water not finite or below zero.
- **The data flow** (`src/wave/gpu/GpuBoussinesq.test.ts`): a second solver, stepped on the CPU, stands in for the device's memory, and each frame exchanges exactly the fields `GpuBoussinesq` sends and reads back. A surf zone on it steps bit for bit as on the CPU, lips and all. Without η_t it throws nothing, as the GPU tier did.

The two tiers are not expected to match wave for wave: the device steps in 32-bit floats and breaking is chaotic. Their activity per minute should match.

## Where it ran

On SwiftShader's WebGPU in headless Chromium, in a cloud container with no GPU: the same WGSL kernels, readbacks and 32-bit floats as the M4's Metal adapter, run in software. Activity and stability carry over; the wall times do not (the GPU tier ran 3–5× slower than the CPU here, where the M4 runs it several times faster).

## Parity: lips, tubes and whitewater (`?mode=lips`)

60 s after the spin-up per spot, seed 1, the GPU tier's 64-component sea on both tiers, the game's runner at 1/60 s. Per minute (tubes, particles and plunge cells: the mean in flight, and the peak).

| Spot | Tier | Throws | Rollers | Jet landings | Splash-ups | Tubes | Spray | Mist | Tube spray | Foam balls | Plunge cells | Fastest, m/s |
|---|---|---:|---:|---:|---:|---|---:|---:|---:|---|---|---:|
| Beach | CPU | 110 | 637 | 880 | 865 | 2.0 · 43 | 251 | 59 | 5.3 | 10.1 · 228 | 34.6 · 344 | 3.5 |
| | GPU | 110 | 634 | 880 | 860 | 2.0 · 43 | 249 | 62 | 5.4 | 10.5 · 232 | 34.3 · 338 | 3.6 |
| Point | CPU | 555 | 23 | 4415 | 4382 | 10.1 · 113 | 755 | 197 | 16.1 | 72.8 · 981 | 164 · 1152 | 3.2 |
| | GPU | 555 | 23 | 4415 | 4377 | 10.1 · 113 | 756 | 194 | 16.7 | 73.0 · 975 | 163 · 1143 | 3.2 |
| Reef | CPU | 277 | 94 | 2193 | 2185 | 5.3 · 55 | 478 | 93 | 15.3 | 43.2 · 730 | 73.5 · 525 | 4.0 |
| | GPU | 277 | 94 | 2195 | 2188 | 5.3 · 55 | 476 | 93 | 15.5 | 42.4 · 730 | 73.8 · 526 | 4.0 |
| Canyon | CPU | 8 | 642 | 64 | 47 | 0.1 · 3 | 137 | 26 | 0.0 | 0.0 · 2 | 1.7 · 25 | 3.3 |
| | GPU | 8 | 642 | 64 | 47 | 0.1 · 3 | 137 | 26 | 0.0 | 0.0 · 2 | 1.7 · 25 | 3.3 |
| Reef Practice | CPU | 328 | 160 | 2624 | 2617 | 6.6 · 63 | 680 | 132 | 13.4 | 26.2 · 433 | 102 · 615 | 4.8 |
| | GPU | 328 | 161 | 2624 | 2616 | 6.6 · 63 | 677 | 132 | 13.1 | 26.4 · 443 | 102 · 613 | 4.8 |
| Reef Big | CPU | 486 | 0 | 3858 | 3528 | 11.4 · 91 | 3334 | 592 | 22.4 | 119 · 1024 | 401 · 1690 | 18.9 |
| | GPU | 486 | 1 | 3858 | 3561 | 11.7 · 102 | 3328 | 626 | 30.2 | 115 · 1024 | 418 · 1816 | 17.7 |

(The four spots at the Wave Lab's default swell, Hs 1.4 m, Tp 10 s, from 10°; the Reef's Practice and Big swells as the Surf screen picks them, mid tide, calm.)

**The GPU tier matches.** At every spot it throws the CPU tier's lips to the event (the two stay close wave for wave: at the Beach, Point, Canyon and Reef their fastest water falls on the same cell at the same moment), and its tubes, splash-ups, spray, mist, foam balls and plunge zone agree within a few percent. The Reef's Big swell, the most chaotic, parts furthest: its tube spray is 35 % busier on the GPU, 22 against 30 particles in flight, beside the same 486 throws a minute. Nothing is silent.

**One flag, a false alarm.** The Reef's Big swell spilled one roller on the GPU and none on the CPU, and the page called the CPU silent. A tier is now silent only when the other makes at least 3 a minute of something (`SILENT_FLOOR` in `src/dev/tierParity.ts`); the GPU's missing lips were hundreds a minute.

**After merging main's predictor gate** (#61: the dispersive predictor added only where a cell disperses, on both tiers), a 30 s rerun still matches. Reef Big: 540 against 538 throws a minute, tubes 13.1 against 13.6, the same fastest water (9.6 m/s, same cell). Beach: 142 against 142 throws, tubes 2.5 · 42 on both. No findings.

## Stability with lips thrown (`?mode=probes`)

The Reef's CI probes (40 m window, 60 m for the oblique and lagoon ones, 12 components, seed 3, 1/30 s steps, 45 s) and its Big swell at game size (160 m window, 64 components, seed 3, the game's runner, 45 s). The fastest water deeper than 5 cm; "broken" counts steps that left water not finite or below zero.

| Probe | Throws /min, CPU · GPU | Plunge cells peak, CPU · GPU | Fastest, CPU · GPU, m/s | Where (GPU) | Broken |
|---|---|---|---|---|---|
| CI Big, mid tide | 104 · 108 | 604 · 654 | 20.9 · 15.6 | x 5.5, z −37.5 | none |
| CI low tide (−0.6 m), the backwash | 129 · 124 | 613 · 590 | 15.0 · 13.2 | x 15.5, z −27.5 | none |
| CI from −25°, 60 m | 212 · 215 | 951 · 800 | 12.3 · 11.4 | x 13.5, z −28.5 | none |
| CI from +25°, 60 m | 188 · 169 | 803 · 744 | 14.4 · 13.7 | x 5.5, z −36.5 | none |
| CI lagoon (−1 m), 60 m | 183 · 185 | 861 · 906 | 14.9 · 14.6 | x 19.5, z −24.5 | none |
| CI edge columns (+25°, 40 m) | 105 · 103 | 668 · 613 | 17.1 · 16.6 | x 8.5, z −34.5 | none |
| Game Big, mid tide | 425 · 415 | 1665 · 1853 | 10.6 · 10.6 | x 9.5, z −32.5 | none |
| Game Big, −0.6 m | 365 · 356 | 1810 · 1851 | 10.7 · 10.6 | x 6.5, z −36.5 | none |
| Game Big, −1 m | 296 · 301 | 1626 · 1650 | 10.8 · 10.6 | x 2.5, z −40.5 | none |
| Game Big, from −25° | 475 · 480 | 712 · 769 | 13.1 · 12.8 | x −25.5, z −67.5 | none |
| Game Big, from +25° | 425 · 421 | 1894 · 2021 | 9.6 · 9.5 | x 8.5, z −33.5 | none |
| Edge offshore (below) | 185 · 189 | 1070 · 1062 | 1873 · 647 | x −75.5, z −136.5 | both, from t ≈ 80 s |

**The GPU tier holds wherever the CPU does.** This is the first run of the plunge zone's GPU path (HOLD in the WGSL mask) under real landings: up to 2,000 cells held at once on the Big swell. No water breaks, the GPU's fastest water is at or below the CPU's in every probe, and its smallest stable step matches the CPU's to within 7 %.

**Against the Reef report** (`teahupoo-reef-report.md`, measured on the CPU on an older bed): the game-size Big probes read 21.2, 26.3, 22.9, 9.3 and 22.5 m/s there, from the run-up on the pass's old beach face. Today they read 9.5–13.1 m/s on both tiers. The CI low-tide backwash, 22.7 m/s there, reads 15.0 (CPU) and 13.2 (GPU). The CI Big probe's 20.9 m/s on the CPU (a thin 0.29 m backwash on the ledge, t 41.6 s) is over the plan's 20 m/s bar but under the 30 m/s that probe guards; the GPU's was 15.6.

**One more flag, minor.** On the game-size Big swell at −0.6 m the GPU spilled 5 rollers in 45 s (6.7 a minute) and the CPU none, beside ~360 throws a minute on each: about 1 break in 50 that sits at the throw-or-spill threshold tips the other way in 32-bit floats. The Big swell at mid tide shows the same (1 against 0), the other probes do not (−25°: 2.7 against 4.0; +25°: 60 against 61).

## Found on the way: the Reef's Big swell at high tide runs away (both tiers, on main)

The edge-offshore probe (Hs 3 m at the edge, Tp 18 s, tide +1 m, 24 components, seed 3, the game's window) went non-finite on **both** tiers around t ≈ 80 s: the CPU at x −79.5, z −124.5 (1,873 m/s, 2.5 m deep, then NaN from 82.3 s), the GPU at x −75.5, z −136.5 (647 m/s, NaN from 80.0 s). The Reef report had it as "a ~21 m/s peak at the −x open edge far offshore… one for the edge treatments".

**A player can reach it.** The Surf screen's Big swell at high tide (+0.6 m), 64 components, seed 3, run on the CPU in Node: 10.2 m/s through the first 40 s of play, 110 m/s at x −68.5, z −103.5 at t 83.9 s, then non-finite water at t 84.1 s (592 broken steps by 60 s). No guard catches non-finite water, so the sea stays broken for the rest of the session.

- **Not the GPU tier's:** the CPU runs away the same way, and this branch changes nothing in the solver.
- **Where:** offshore, 1–12 m inside the open −x edge, 90–135 m seaward of the ledge, the corner of the open edge and the offshore relaxation zone. No lip lands there.
- **The probe:** `?mode=probes&cases=game-high` (60 s) now reruns it on both tiers.
- **The fix is not in this change:** it belongs with the edge treatments (the Reef report's open item), and a follow-up has been raised for it.

## Found on the way: the GPU water sheet ran out of memory

The GPU water sheet's page grew about 150 MB/s once its worker began stepping, until the kernel killed it at 12.6 GB. `breathe()` made a new `MessageChannel` per yield, and `advance()` yields thousands of times a second while it waits for the worker's GPU steps. Each channel held native memory the collector never felt: the page's JS heap stayed under 400 MB. The dev tools now share one channel (`src/dev/devStepping.ts`), and the sheet holds at about 680 MB. The game never used it; only the water sheet's and the recorder's GPU paths did.

## Water sheets and films

- **The sheets** (`?inpage&waterSheet&spot=reef[&whitewater]&compute=gpu|cpu[&components=64]`): the Reef's tube and whitewater sheets on both tiers. On the same 64-component sea, the GPU and CPU sheets hold on the same kind of moment: an open tube with its lip and tube spray, and the same looks under every sky. A CPU sheet on the page's default sea (24 components) holds on a smaller tube, because its sea is another sea.
- **The films** (`?inpage&record&spot=reef&watch=8&compute=gpu&graphics=low|medium|high|ultra`): the Reef's practice tubes filmed from beside the lip, stepped on the GPU tier under each graphics preset. `?graphics=` applies a preset for the page without touching the saved settings. Where the browser has no H.264 encoder (Chromium on Linux), the recorder films VP9.

## Could the GPU tier go silent again?

- **The parity page** (`?mode=lips`) flags any metric one tier shows and the other does not, or runs at more than twice the other's rate, and a GPU tier that fell back to the CPU.
- **The data-flow test** in `GpuBoussinesq.test.ts` runs in CI: without η_t in the readback, it throws nothing, as the GPU tier did.
- **The page itself needs a WebGPU browser,** so it is a manual check. It runs headless on SwiftShader (`--enable-unsafe-webgpu --use-webgpu-adapter=swiftshader --enable-features=Vulkan --use-vulkan=swiftshader`). The six parity cases take about an hour there, and the 13 probes about two.

## Commands

- `/gpu-check.html?mode=lips` (`&cases=`, `&seconds=`, `&seed=`, `&components=`, `&tiers=gpu|cpu`, `&receiver=`)
- `/gpu-check.html?mode=probes` (`&cases=game-high,edge-offshore`, …)
- `/?inpage&waterSheet&spot=reef&compute=gpu`, and `&whitewater`
- `/?inpage&record&spot=reef&watch=8&compute=gpu&graphics=high`, with `npm run record:ride` receiving
