# GPU tier parity report

Does the GPU (WebGPU) tier throw the CPU tier's lips, tubes and whitewater, stay stable with lips landing, and could it go silent unnoticed again? Numbers are reported, not gated.

**Why now.** Until 33fae37 a device step never read back η_t (`FIELD.RATEH`). A lip's crest motion needs it, so on the GPU `throwLip` returned before every throw: no lips, tubes, splash-ups or lip crashes at any spot. The M4 runs compute 'auto', so that is the tier the user plays. Every lip, tube, whitewater, plunge-zone (#58) and Teahupo'o Reef (#57, #60) change since was measured on the CPU only: the Node reports, the water-sheet dev view and the GPU check page (which compared only the water fields).

## How it is measured

- **Parity** (`/gpu-check.html?mode=lips`): the same surf zone on both tiers, each in its own worker, built as the game builds it (the GPU tier warm, spun up on its device; the CPU tier spun up on the CPU). Same seed, swell and sea: the GPU tier's 64 components on both. The game's runner steps 1/60 s with its spray and bubbles, no rider, for 60 s after the spin-up. Every step records lip throws and rollers, jet and splash-up landings, the flying tubes, the particles in the air by kind, and the plunge zone's held cells (`src/dev/tierParity.ts`).
- **Flags:** a metric one tier shows and the other never does is **silent**; one more than twice as busy on one tier (once the busier makes 10 a minute), **diverging**. A GPU tier that falls back to the CPU is flagged too: a failing device is dropped without a word.
- **Stability** (`?mode=probes`): the Reef's CI probes (40 m window, 60 m for the oblique and lagoon ones, 12 components, seed 3, 1/30 s steps for 45 s) and its Big swell at game size, on both tiers. The fastest water deeper than 5 cm, where and when; any water not finite or below zero.
- **The data flow** (`src/wave/gpu/GpuBoussinesq.test.ts`): a second solver, stepped on the CPU, stands in for the device's memory, and each frame exchanges exactly the fields `GpuBoussinesq` sends and reads back. A surf zone on it steps bit for bit as on the CPU, lips and all. Without η_t it throws nothing, as the GPU tier did.

The two tiers are not expected to match wave for wave: the device steps in 32-bit floats and breaking is chaotic. Their activity per minute should match.

## Results

In progress: the runs are on SwiftShader's WebGPU (the same WGSL in 32-bit floats, in software), so only activity and stability carry over to the M4, not timings.
