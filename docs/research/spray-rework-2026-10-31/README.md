# Spray rework (spray-rework, 2026-10-31)

**The owner's reference:** Mikey February carving a CI Mid (YouTube cOHc2TSvCI8, the first 30 s). It shows a tall, feathery fan, 2–3 m, combed outward from the rail like fur. The fan is see-through and misty at its top and outer edges, and dense white at the rail. A white foam line on the water traces the turn.

**Ours (#171):** round 150 g blobs, a clear glass sheet that barely showed, nothing on the water, and a fan under a metre tall.

This work was done on the M1 Air (8 GB), branch `claude/spray-rework` from main at 60c7a91f, with main's 3e47f09a merged in before the last test run. It used the in-page strip tool and headless benches. No SurfZoneRunner rider sessions ran in tests.

## In short

- **The board's water is now drawn as a fan of fine, streaked drops**, about 80 per kilogram at High. Each is a soft stroke along its flight over a 1/60 s exposure, drawn with hairlines.
  - Its opacity is the optical depth of the drops it stands for, spread as they disperse.
  - So it is opaque white where it leaves the rail and see-through a couple of metres out.
  - Fine mist puffs form where the fan frays: about 4% of the water, 0.2 mm drops. They hang 1.5–3 s and glow when backlit.
  - The water thrown is #170's, unchanged.
- **The carve's foam line:** a white aerated line on the water along the rail's path. It is denser and wider where the turn throws more water per metre. It stays dense white for 0.4–1 s, then a lace for up to 8 s. It is drawn only, as a ribbon on the surface, so the water is untouched.
- **The white root:** the curtain's root smears white over the exposure when the sheet is fast, and the fan's first drops are opaque. #171's clock and geometry are kept, and N_t stays 2.5 (the advisor).
- **Height:** each sheet's launch is now fitted along its root, so the tail's faster jet is thrown from the tail. Before, it was averaged into the side's mean. The water is the same.
  - The tail's apex in the hard turns rose from 1.0–1.5 m to 1.7–2.0 m (vacuum vy²/2g; drag takes about a fifth off 2–3 mm drops).
  - **What's left is the riding.** The game's turns peak at 75–147°/s; a pro's snap passes 200°/s and a cutback 300°/s (the advisor, US 9697743). The fan's last metre needs a harder turn, not a faked spray. That is the owner's call.
- **Cost (M1):**
  - **Page CPU:** 91 µs a frame at High for a sustained hard carve (80 kg/s), 52 at Medium, 32 at Low, scaled by the Particles setting.
  - **Worker:** no longer spawns or steps the board drops.
  - **GPU:** 0.13–0.39 ms at 720p in a hard turn's busiest frame (2900–3500 streaks), against 28–30 ms frames.
- **Who throws it:** every board, other players' too, from the sheets their poses give (page-side; nothing more is sent).
- **Classic** draws the same fan in plain white without the sun's forward scatter.
- **A/B:** `?boardSpray=old` restores #171's spray (the worker's round drops and the clear curtain). Online rooms use the default.

## The model

The water-physics advisor ruled on all five parts the same day (consult log, 2026-10-31).

### What leaves the rail (`src/physics/boardSpray.ts`)

#170's sheets are unchanged: Wagner's 2D+t jet off the high rail, the flat blister, the water k/(4 cos β)·ρ·W·D. #171's curtain clock and tear are unchanged too. New:
- **The launch along the root.** Each side's sheet carries a water-weighted straight-line fit of its stations' launch velocities against their place along the rail. It is packed as the velocity at the root's aft end and at its fore end, plus where the water leaves on average (`aftV*`, `foreV*`, `fluxMean`).
  - The tail's stations sweep wider with the yaw (ω×r), so they throw faster.
  - The per-side mean hid that, and with it the fan's top (the advisor's first fix).
  - The fan throws each drop from a place along the root, drawn so its mean is the water's, at that place's launch.
  - Torn sheets carry the difference on through their tear.
  - The water is unchanged.
- **Why the fan is still short of 2–3 m.** A 2 m top needs vy ≈ 8 m/s for 2–3 mm drops (quadratic drag). κ 0.8, the 8° tilt, the root angle and the water's own rise are sound (the advisor read them all).
  - The rest is the riding. The jet's speed follows the tail's sweep into the water.
  - The game's hardest turns peak at 75–147°/s. An instrumented pro ride passed 200°/s in a snap and 300°/s in a cutback at 9 m/s (US 9697743, via the advisor).
  - So the last metre needs harder turns, not a faked spray. That is the owner's call, below.

### The fan (`src/wave/boardFan.ts`, `src/scene/BoardFanMesh.ts`)

- **On the page, flown on the GPU.** The worker no longer spawns board drops (unless `?boardSpray=old`).
  - Each frame the page throws drops from the snapshot's sheets and other players' (the same packed sheets the curtains use).
  - Each is one spawn record: where, when and how fast it left, and its drag time τ = v_t/g.
  - The vertex shader flies it under linear drag toward its terminal velocity (`fanPosition`; the advisor: within about 10% of quadratic drag). It lands at a time solved on throwing.
  - So the page's per-frame work is the new drops alone. Each is thrown at a moment within the frame from where the hull was then, so there are no bursts at any frame rate.
- **The drops.**
  - By number N(d) ∝ d⁻² up to a knee, d⁻⁶ past it (Erinin et al. 2023's splash spectrum).
  - The knee is 1 mm off fast sheets (7 m/s and more through the air) and 2 mm off slow, thick ones. The largest is min(6 mm, 12σ/ρ_a U²).
  - By volume, half is under the knee. Under 0.3 mm is mist.
  - Fall speeds are Gunn & Kinzer's. The drops shed before the tear are under the knee.
- **The streaks.**
  - 80 a kilogram at High, each standing for 12.5 g. A lower setting draws fewer, each standing for more, so the fan's optical depth is the same.
  - Each is drawn over a 1/60 s exposure (the 180° shutter at 30 fps) as a soft stroke with hairlines.
  - Its opacity is its bundle's optical depth, τ = 1.5 m/(ρ A r), over the area its drops cover. The bundle spreads 0.15 U a second either side, and along its flight as their paces differ by a fifth.
  - So it is opaque at the rail and see-through a couple of metres out.
  - It is at most 24 px wide, fades within 2 m of the camera, and fades into the water (Rich).
- **The mist.**
  - 4% of the water, 0.2 mm drops (drag time 0.07 s), each puff standing for 6 g at High.
  - Each forms 0.1–0.3 s along a drop's flight, where ligaments and big drops break up. It hangs 1.5–3 s, growing from 0.2–0.4 m to 1 m.
  - Its opacity is its own optical depth, thinning as it spreads.
  - Rich lights it with water drops' forward scattering (Henyey–Greenstein g 0.86), so it glows when backlit. The drops get a milder lobe (g 0.5).
- **The white root.** The advisor: white at the rail comes from the torn cloud's optical depth once the jet is fast, plus the exposure smearing the rough sheet's glints into white (inferred). It is not aeration on a green face.
  - The fan's first streaks are opaque.
  - The curtain's root whitens over its first 85% by how far it moves in the exposure: full at 0.1 m, so about 6 m/s off the hull, at most 0.6.
  - N_t stays 2.5. Slow trough turns still show a clear curtain 1–2 m long, which is physical.
  - In whitewater the root's water would be aerated (AerationField's void fraction): not built.
- **The carve's foam line.**
  - Points along each rail's aftmost exit, every 0.25 m.
  - Its strength is the water thrown per metre of path, ṁ/V (full at 10 kg/m; the air a turn entrains follows the energy it spends).
  - It is 0.3–0.5 m wide with its strength, doubling as it ages.
  - It is dense white while its bubbles rise from the rail's depth (0.4–1 s, longer the harder the turn), then a 15% lace to 8 s.
  - It is drawn as a ribbon laid on the water's surface each frame, with soft edges and the churn texture's lace. It never touches the solver.
  - A board that jumps (a retry or a placed start) or stops throwing starts a new line; the old one fades in place.

## Measured

### Strips (`strips/`)

All are Medium, Rich, stepped in the page by the strip tool. Before is #171 (`?boardSpray=old`). The rides are the same in both: they are deterministic, and the spray is drawn only.

| Spot | Cases | Before (chase, side) | After (chase, side, close) |
| --- | --- | --- | --- |
| Wave Pool | trim, hard carve on the face (steer + Compress), bottom turn, compressed bottom turn | `pool-<case>-before.jpg` | `pool-<case>-after.jpg` |
| Canyon Medium | carve, bottom turn, compressed turn, trim | `canyon-<case>-before.jpg` | `canyon-<case>-after.jpg` |

- **Columns** are 0.6, 0.9, 1.2 and 1.5 s after the placement. The turn starts at 0.3 s.
- **What they show:**
  - Before: round blobs.
  - After: a fan of fine combed streaks, white at the tail, see-through outward, with mist where it frays. A lacy white line on the water follows the turn.
  - The clearest frames are `canyon-carve-after.jpg` (side 1.2 s, close 0.9 s) and `pool-compress-after.jpg` (close 1.2 s).
- **Reference against ours:** the owner's frame next to three of ours is at `/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/reference-compare.png`. It is not committed: the repository is public and the frame is a video still.
- **Known flaw:** in the Canyon carve's close-up, the camera went under the face at 1.2 and 1.5 s. The tool now keeps it 0.4 m over the water; the strips were not re-run.

### The fan's height

Each sheet's launch, as the height its water would reach in a vacuum (vy²/2g), for the mean and for the root's aft end (the tail), at the hardest frame of each turn. The board's yaw rate is about the vertical.

| Spot, case | Speed | Roll | Yaw rate | Water | Mean | Tail |
| --- | --- | --- | --- | --- | --- | --- |
| Pool, carve, 0.9 s | 9.4 m/s | 43° | 147°/s | 122 kg/s | 1.01 m | 2.02 m |
| Pool, compressed turn, 1.2 s | 5.8 m/s | 39° | 68°/s | 70 kg/s | 0.61 m | 0.75 m |
| Pool, bottom turn, 1.2 s | 5.2 m/s | 47° | 114°/s | 56 kg/s | 0.20 m | 0.09 m |
| Canyon, carve, 1.2 s | 10.2 m/s | 32° | 75°/s | 88 kg/s | 1.49 m | 1.88 m |
| Canyon, bottom turn, 1.2 s | 9.5 m/s | 43° | 112°/s | 121 kg/s | 1.20 m | 1.71 m |
| Canyon, compressed turn, 0.9 s | 9.2 m/s | 33° | 101°/s | 90 kg/s | 0.95 m | 1.43 m |
| Canyon, trim | 5.2–6.1 m/s | 5–9° | ~0 | 11–17 kg/s (both rails) | 0.36–0.49 m | the same |

- **Drag:** it takes about a fifth off the 2–3 mm drops (the advisor). The fine ones stop within half a metre, as they should.
- **Where the fit helps:** where the tail throws the water. The Pool's bottom turn throws from forward of the tail (86% of its water fore of the middle), so its tail is no higher.
- **Turn rates:** the game's turns peak at 68–147°/s. A pro's pass 200–300°/s (Open, item 1).

### CPU (idle M1)

- **The page.** `fan-bench.ts`: `BoardFanMesh.update` for a board throwing a sustained hard carve (80 kg/s, turning).
  - 92 µs a frame at High (5700 streaks and 890 puffs live, 6100 thrown a second);
  - 52 µs at Medium;
  - 33 µs at Low.
  - It covers throwing the new drops and laying the carve line. The GPU flies them, so nothing walks the live drops.
- **The worker.**
  - `hullSpraySheets` with the fit along the root: 3.9 µs a call (#170 3.2, #171 3.6).
  - It no longer steps the board drops: −0.027 ms a step at High in a hard turn (#170's spray-bench).
- **Other players:** `RemoteSpray.add` takes 5.4 µs per player per frame (38 floats a sheet). Their fans are thrown on the page like the player's.

### GPU (in-page A/B, 720p, chase camera, the compressed turn's busiest frame, Rich)

The arms alternate frame by frame over 60 cycles, and the median of the per-cycle difference is taken.

| Spot | Frame | Fan cost | Fan live | Curtain cost |
| --- | --- | --- | --- | --- |
| Wave Pool | 28.6–29.2 ms | 0.13–0.14 ms | 2900 streaks, 170 puffs | noise (±0.05) |
| Canyon Medium | 28.0–30.2 ms | 0.35–0.39 ms | 3470 streaks, 184 puffs | noise (≤ 0.1) |

- The fan is two instanced draws (streaks and mist) plus the carve line's ribbon.
- It uses no textures beyond the water's height and the churn tile, so the water's shader and its 16 units are untouched.
- The Particles setting scales both the drops thrown and the pools drawn.

### Tests (after merging main at 3e47f09a)

- **tsc:** clean.
- **Main suite** (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`): 2963 passed, 18 expected fail, 36 skipped.
- **SZS filter** (`-t "[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`): 11 passed (93 skipped by the filter), 10 min.
- **New:**
  - `boardFan.test.ts`:
    - Gunn & Kinzer's fall speeds;
    - the GPU's flight formula against a finely stepped linear drag;
    - landing back on the water after the apex;
    - FAN.perKg a kilogram at the setting's share, each streak's water;
    - the mist's water share, born later on the flights;
    - a torn sheet's drops from its tear, the larger there;
    - the spectrum: half under the knee by volume, none past the cap, the knee and cap with speed;
    - the ring's front at a lower setting.
  - `boardSpray.test.ts`: the fit along the root (the tail, swept by the yaw, throws faster; the fit passes through the mean).
  - `BoardFanMesh.test.ts`:
    - drops thrown as the sea's time runs and none when it stands;
    - fewer at Low;
    - the carve line laid on the water;
    - a new line where the board jumps, never joined visibly;
    - none for a light trim;
    - the line's fade.
  - `PhysicalMode.test.ts`: `?boardSpray=old`.

## Open (the owner's calls)

1. **The riding: the fan's last metre.**
   - The tail's apex is 1.7–2.0 m in the hard turns (1.4–1.6 m with drag). The reference is 2–3 m.
   - The rest needs harder turns: 200–300°/s against the game's 68–147°/s, with the tail released.
   - That raises the jet speed and the water thrown together. Nothing in the spray fakes it.
2. **The spray's mass.**
   - In hard turns the fan reads white almost throughout. Its optical depth follows #170's water: 80–120 kg/s, from 2D+t with the rail buried 0.2–0.25 m, never measured at these rolls.
   - If it reads too white or too heavy against footage, that mass is the lever, not the opacity (the advisor).
3. **Slow turns** (the Pool's trough) still show #171's clear curtain 1–2 m long. That is physical (N_t 2.5); whether to show it is a look call.
4. **Not built:**
   - the root's milkiness in whitewater (AerationField's void at the root);
   - the horizon haze on distant players' fans.
5. **Classic** draws the same fan, its mist and the line in plain white, without the sun's forward scatter.

## Shot list for the owner

Rich, then Classic. The same moves with `?boardSpray=old` to compare.

1. **Canyon Medium: a hard bottom turn and a carve on the open face, from the chase camera.** Does the fan read as fine water combed off the tail, white at the rail and misty at its edge? Or as a white plastic fan or a cloud?
2. **The same, from the side or a replay angle, against the reference.** Check its height and arc. Then try the hardest turn the controls allow (full steer and Compress, and a release of the tail if you can) and see how high it gets.
3. **A cutback or a snap at speed.** This is the yaw rate test. If the fan stays low, it is the turn rate (Open, item 1).
4. **The Wave Pool's compressed turn in the trough.** The fan is lower and the clear curtain longer there.
5. **A straight trim.** Light blister drops off both rails and no carve line (under 4 kg/s).
6. **Into the sun (sunset).** The mist and the drops should glow, backlit.
7. **The carve line.** Look back after a hard turn: dense white for under a second, then a lace that fades over about 8 s.
8. **Online, with a second player:** their turns throw the fan and leave the line too.
9. **Particles Low against High:** the same look, fewer streaks; frame rate on the M1.

## Tools

- `?boardSpray=old`: #171's spray (the worker's round drops and the clear curtain). `?boardSpray=off`: none. Online rooms use the default.
- **The strip tool** (`?inpage&boardSprayStrip`). New:
  - `&cases=…carve`;
  - `&spot=canyon` (each case on the next wave to break at the take-off);
  - `&boardSpray=old`;
  - roll, drift, yaw rate, and each sheet's launch and its ends' heights in the log;
  - the fan's GPU arm.
- **`fan-bench.ts`:** the page's cost by Particles setting.
- **The fan's numbers** are in `FAN` (`src/wave/boardFan.ts`) and `CARVE_LINE` (`src/scene/BoardFanMesh.ts`).

## Sources

All via the water-physics advisor (consult log, 2026-10-31):
- Erinin et al. 2023: the splash drops' spectrum (the knowledge base's `spray-and-mist.md`).
- Gunn & Kinzer 1949: terminal fall speeds.
- Optical depth τ = 1.5 h/r (`spray-and-mist.md`).
- Henyey–Greenstein g 0.86 for water drops.
- Blenkinsopp & Chaplin 2007: the air entrained against the energy spent.
- Bubble rise 0.25 m/s (`whitewater-sources.md`).
- US 9697743 B2: instrumented turn rates.
- Dai, Hsiang & Faeth 1997; Kooij et al. 2018; Gaillard et al. 2021 (#171's curtain).
