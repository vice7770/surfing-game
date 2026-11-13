# B: the wall water's added mass from the water's own acceleration (2026-11-13)

Step 2 of the surfer track (`docs/superpowers/specs/2026-11-12-surfer-physics-redesign.md`), ruling 27's B and ruling
27a (`../ruling-27.md`). All numbers here are from probes on analytic water. No ride, no game page, no Basilisk case.

**Short answer:** the new rule works as meant. A board crossing a still flow step gets no push (B2), and real water
acceleration is kept at the right size (B4). But **B1 misses**, and the formula is not the cause. In the probe's
"rising" water the flow jumps from 0 to 2 m/s in one instant, everywhere at once. That is a true acceleration of the
water, so both rules read it the same, to the byte. Per the stop rule, this is handed back with the trace.

## 1. The formula, before and after

`src/physics/BoardBody.ts`:

- **Before (the path rule, `wallInertia`, 1665–).** Each wall patch keeps the flow of its last sample. Each substep,
  Du/Dt ≈ (u(x, t) − u(x − v h, t − h)) / h. The patch moved with the board, so this is ∂u/∂t + (v_board·∇)u.
- **After (following the water, `wallFollowing`, 1696–).** Each wall patch also keeps its last place, x_last. The water
  that was there has moved to x_last + u_last·h. The board samples the flow there now (one more sample per wall patch
  per substep) and takes Du/Dt ≈ (u(x_last + u_last h, t) − u_last) / h. That is ∂u/∂t + (u·∇)u. The board's speed is
  not in it.
- Both rules keep the same smoothing (3/60 s) and the same 5 g cap (`WATER_INERTIA`, 133). The push is the same:
  added mass × (Du/Dt · ν) along the surface normal (1166).
- h for the new rule is the span since the last sample (`lastSpan`, 933). Today's rule divides by the current
  substep's span. They differ only when the substep is split (`entering`); the old rule is left as it was.
- If the moved-to point is outside the wall water, its flow is the sea's. That is still the water the board feels.

The flag rides on the sample: `WaterSample.wallFollow` (`src/physics/SurfWater.ts`), set by `PhysicalSurfWater` with
`sweptFollow` (565, 665; `forSimulation` 512), from `TubeFace.follow` (`src/wave/barrel/faceAnchor.ts` 290).

## 2. Switches

- `?tubeInertia=old`: unchanged. No water acceleration on the added mass at all.
- With `?wallBody=stream` (and `tubeSeam=blend`, which `wallBody` needs): the new rule, by default.
- `?tubeInertia=path`: today's path rule, also with `?wallBody=stream`. For A/B.
- Without `?wallBody=stream`: the path rule, as before. No sample is marked; the build is the same.
- Online rooms already pin `tubeInertia` and `wallBody` to the default (`src/main.ts` 538), so rooms keep the path rule.

## 3. Bars

`bars.probe.ts`, standing rider gliding at 7.4 m/s on flat water, every sample marked as wall water. Spike = the
board's peak vertical water force over the 0.25 s before, in body weights. Push = the wall push alone, peak, in body
weights. Results: `results/bars.jsonl`, `results/trace.jsonl`.

| Row | Path: spike / push / fell | Follow: spike / push / fell |
|---|---|---|
| Rises 5 cm at 1 m/s | +1.36 / 2.37 / no | +1.36 / 2.37 / no |
| Rises 5 cm at 2 m/s (B1 as written) | +2.31 / 5.12 / no | +2.31 / 5.12 / no |
| Rises 5 cm at 4 m/s | +2.59 / 6.90 / yes, 0.18 s | the same |
| Rises 20 cm at 1 m/s | +1.36 / 2.37 / no | the same |
| Rises 20 cm at 2 m/s (the study's row) | +2.76 / 5.12 / yes, 0.23 s | the same |
| Rises 20 cm at 4 m/s | +2.92 / 6.40 / yes, 0.20 s | the same |
| Still flow step 0 → 1 m/s over 10 cm (B2) | +0.56 / 0.77 / no | +0.32 / **0** / no |
| Still flow step 0 → 2 m/s over 10 cm (B2) | +1.39 / 1.34 / no | +0.88 / **0** / no |
| Accelerating 3 m/s² (B4) | push 368 N, hand 371 N, ratio 0.992 | the same |
| Accelerating 3 m/s² + still step 1 m/s (B4) | push 82 N, hand 74 N, ratio 1.106 | push 99 N, hand 101 N, ratio **0.986** |

- **B1: miss (not the formula).** The rising rows are byte-identical under both rules. In `Rising` the flow is the
  same at every point, so (v_board·∇)u and (u·∇)u are both zero; only ∂u/∂t is left, and it is real. The trace
  (20 cm at 2 m/s): at 0.517 s the flow jumps 0 → 2 m/s; the smoothed acceleration reads 29 m/s², the push 5.1 body
  weights, the foot load 4.0. At 0.6 s the flow jumps back 2 → 0; the push turns to −4.0 body weights (down), the
  load falls to 0 at 0.633 s, and the board is lost at 0.733 s. So the fall comes from the stop as much as the start.
  The study's "+1.5" is the same row with no inertia at all (+1.46, `../results/bumps.jsonl`). It assumed the push in
  this row was spurious. In this water it is not: the water truly changes speed in an instant.
- **B2: pass.** Following the water, the push is 0 across the step. Along the path it reads the step (up to
  1.34 body weights here; the unit test reads over 10 m/s² of smoothed acceleration).
- **B3:** printed above (1 and 4 m/s rows).
- **B4: pass.** Hand: ρ·C_a·V·Du/Dt = Σ over the wet patches of their added mass (ρ·π/8·b·wetted area) × 3 m/s².
  The push matches it to 1 % (0.992). With a still step on top, the new rule still gives the water's 3 m/s² (0.986);
  the path rule adds the crossing (1.106).
- **B5: pass.** The six study probes (`../*.probe.ts`) print the same bytes as `../results/*.jsonl`, and A-lite's
  `normal.probe.ts` the same as `../a-lite/results/normal-off.jsonl` and, with `LEG_POWER=cap`, `normal-on.jsonl`.
  Glide, carve, paddling and pop-up never touch wall water.
- **B6: pass, in part.** `../bumps.probe.ts`'s wall rows (the path rule, no `wallFollow`) print the same bytes as
  before. The switch test: with `?tubeInertia=path`, the tube face equals today's under `wallBody=stream`
  (`tubeTrack.test.ts`), so no sample is marked. The Canyon byte check was not run (see section 4).

## 4. What was not run

- The full suite, the Canyon byte check (`wallin`) and the fps trace: not run, because B1 missed and the stop rule
  says hand back. `tsc` (app and server) passes. The touched folders (`src/physics`, `src/wave/barrel`, `PhysicalMode.test.ts`) pass: 105 files, 1178 tests. `poolBarrelPerf.test.ts` timed out once under load and passes alone.
- No ride in the pool. No probe on the pool's real wall water (the case's flow at the throw).

## 5. How the owner rides it (once accepted)

Menu → Wave Pool → Waves: Barrel, with the pool switches, for example
`?physical&poolSize=ref&wallBody=stream&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug&legPower=cap`.
Add `&tubeInertia=path` for today's rule. What to look for: no kick when the board runs from the sea onto the tube's
wall at speed.

## Files

- `bars.probe.ts`: B1–B4 and the trace. `OUT=/tmp/out.jsonl npx vitest run --config docs/research/board-in-water/b-wall/vitest.probe.config.ts bars`.
- `results/bars.jsonl`, `results/trace.jsonl`.
