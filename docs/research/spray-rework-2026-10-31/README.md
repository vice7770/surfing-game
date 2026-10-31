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
  - **GPU:** see Measured.
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
