# G4 Advected Foam: Design Record

> Built test-first on `claude/charming-sanderson-d9a2c0` after G3. The implementation plan this record replaces is in the history of this file (`c1805bf`). Test code lives in the files listed.

**Goal:** Carry foam on the physical surf zone's solver grid, sourced by bore dissipation and lip splashes, moved by the solver's currents and decaying per spot. Render it as foam that drifts with the flow, with bubbles under the bores ([plan](../../research/wave-formation-plan.md) §2.4, G4).

## Sources (checked 2026-09-25)

- **Bore dissipation:** hydraulic-jump head loss ΔH = (h₂ − h₁)³/(4 h₁ h₂) and bore speed c = √(g h₂ (h₁ + h₂)/(2 h₁)), from standard open-channel hydraulics (e.g. Chow 1959). The dissipation per unit crest length, divided by ρ, is g q ΔH with q = c h₁.
- **Whitecap foam decay** (Callaghan, Deane & Stokes 2012, *JGR Oceans*):
  - individual events decay in 0.2–10.4 s;
  - the effective (area-weighted) decay time is 1.4–4.8 s.
- **Two decay regimes**, bubble-plume controlled and surfactant stabilised: Callaghan et al. 2013 (*JPO*) and 2017. Laboratory and field foam evolve in similar patterns but last different absolute times (Callaghan et al. 2024).
- **Pattern hash:** PCG2D, from Jarzynski & Olano 2020, "Hash Functions for GPU Rendering".
- **Bubble rise speed:** millimetre bubbles rise near 0.25 m/s at terminal velocity (Clift, Grace & Weber 1978).

## Design

### `src/wave/FoamField.ts`

Foam F on the solver grid, obeying ∂F/∂t + u·∇F = S − F/τ. F is the fraction of the surface covered by foam, and the foam never feeds back into the water.

- **Two regimes.** Dense whitewater decays with τ_dense. As it decays, 30 % becomes a residual lace that decays with τ_residual. Both decays are exact exponentials.
- **Per-spot decay (`FOAM_DECAY`).** τ_dense is 3 s everywhere, inside Callaghan's effective 1.4–4.8 s. τ_residual is a game value per spot, longest in sandy surf:

  | Spot | τ_residual |
  |---|---:|
  | Beach | 20 s |
  | Canyon | 15 s |
  | Point | 12 s |
  | Reef | 8 s |

  `SurfZoneConfig.foamDecay` overrides these.
- **Source.** Each cell gains B × 4 s⁻¹ × (its bore dissipation ÷ that of a 0.25 m bore on 1 m of still water). A roller is white, so a modest bore covers its cell in a quarter second. Weaker bores make less foam, in proportion to their head loss.
- **Lip splashes.** Every landing parcel (`PlungingLip.onLand`) saturates its cell once 5 cm of water has landed.
- **Transport.** Each update advects both regimes semi-Lagrangian, using the solver's depth-averaged velocity: one backtrace, bilinear weights shared by both fields, and rows found by a local search on the stretched grid.
- **Housekeeping.** Dry cells hold no foam. Traces under 1e-6 are flushed. The field shifts with the solver window when it slides.
- **Bubble source.** `source` exposes each cell's foam production rate for the bubbles.

### Surf zone and render path

- `SurfZoneSimulation` owns the field and steps it after the lip.
- The render foam channel is the field's covered fraction. That replaces the breaking-strength foam, the slope tint and `PhysicalSurfaceSource`'s per-node memory.
- `writeUniformFlow` gives the renderer the depth-averaged current per render node, and `WaterSurface` uploads it as an RG float texture every other frame.

### `src/scene/foamPattern.ts`

- **The network.** Foam covers the surface within a threshold of the Voronoi cell walls (F2 − F1) between jittered feature points in 0.7 m cells, so thin foam leaves connected lace.
- **Calibrated threshold.** The threshold for each foam value is measured once from the pattern's own distance distribution. That makes the covered fraction equal F.
- **Patches.** A 5.6 m value noise v gathers lace into patches: the local value is F·(1 + (2v − 1)(1 − F)). Its mean is F, it never exceeds 1, and fresh foam stays solid.
- **Baked tile.** The network and patches are baked into a seamless 512 × 512 RG8 tile repeating every 44.8 m. The shader reads it twice (two flow-map phases); the TypeScript mirror samples the same texels.
- **Flow map.** A two-phase flow map (2 s period) carries the network with the current. The second phase is offset only as far as the current moves the pattern, so still water keeps one static network.
- **Antialiasing.** The network fades to its mean F where a pixel spans a lace cell (`fwidth`).
- **Material.** Foam is matte: roughness 0.9 under foam.
- **Which water uses it.** The physical tank and the far field draw the network. The legacy field keeps its soft tint (`waterFoamPattern` 0), because its foam is a tint strength, not a covered fraction.

### `src/scene/BubblePoints.ts`

- Pooled (4,096), seeded points, spawned 0.3–1.2 m under cells where bores make foam, at 1.5 bubbles per unit of foam per square metre.
- Each frame's scan starts at a random cell, so a full pool is shared across the surf zone.
- Bubbles drift with the local current, rise at 0.25 m/s, and vanish at the surface or after 3 s.
- They are shown in the physical mode and hidden from the reflection capture.

## Verification

**Tests: 192 in the suite, and the build passes.**

- **`FoamField.test.ts` (7):**
  - a uniform 1 m/s current carries a blob 5 m in 5 s (to 0.2 m), conserving it to 5 %;
  - the same holds across stretched rows;
  - dense foam decays to e^{−t/3} (to 1e-12), and the lace then decays by e^{−1/τ_residual} per second;
  - bore dissipation matches the head-loss formula;
  - the source scales with dissipation, reports its rate, and leaves no foam on dry sand;
  - a splash saturates its cell only;
  - a window slide keeps foam at the same world x.
- **`SurfZoneSimulation.test.ts`:**
  - after 20 s of breaking on the Point, foam and lace cover more than 50 cells and none lie more than 10 m offshore of the outermost break;
  - the per-spot decays hold, and the override works;
  - a landing lip parcel makes foam;
  - the render foam and flow equal the resampled field and current, and are 0 on dry nodes.
- **`foamPattern.test.ts` (6):**
  - the covered area equals F to 0.05 over 150 m, with patches;
  - coverage rises monotonically with F;
  - the pattern moves with the flow;
  - still water does not pulse;
  - the network fades to its mean at large pixel footprints;
  - the baked tile matches the exact distances (mean error under 0.02 cells) and repeats seamlessly.
- **`BubblePoints.test.ts` (3):**
  - bubbles appear only under the breaking cell, below the surface;
  - they rise at 0.25 m/s and are gone after reaching the surface;
  - runs replay exactly per seed and stay within the pool.
- **Shader patches** (`WaterSurface`, `FarFieldOcean`):
  - the flow texture, tile and pattern switch are bound;
  - the legacy source keeps the tint;
  - the physical source uploads its current.

**Browser (local dev server, 1114 × 1510 px):**

- No console errors.
- **Beach, from 45 m up:** the lace gathers in patches behind the bores, bore fronts read as white lines, and distant foam is a soft band without shimmer.
- **Legacy ride:** unchanged, with its soft tint.
- **Bubbles:** a Beach set keeps about 1,360 bubbles alive (peak 2,778).
- **Main-thread cost per frame:**

  | Work | Time |
  |---|---:|
  | Foam update | 0.41–0.59 ms (0.50 ms in bundled Node, 37k cells) |
  | `water.update()` with the flow every other frame | 0.49 ms (budget 0.5 ms) |
  | Bubbles | 0.09 ms |

- **GPU cost of the pattern:** about 0.1 ms (median 2.86 ms per frame against 2.72 ms with foam cleared, from timer queries). The first procedural version cost 2.6 ms.

## Deviations from the plan text

- **Roller:** there is no displaced roller mesh, because it would break the agreement between the rendered surface and the physics. The fresh dense foam on the bore front is the roller, drawn solid white and matte.
- **Lacework stretching:** the flow map moves and distorts the network with the current. There is no separate stretching term from the velocity gradient.
- **Two regimes:** dense foam and residual lace, where the plan had one field with one τ.
- **Legacy mode:** the foam is not advected and not drawn as the network, since the legacy field has no solver currents and its foam is a tint strength.
- **Numerical diffusion:** bilinear semi-Lagrangian advection slightly blurs foam over several seconds, and 3–4 m offshore cells blur more. Foam lives in the 1 m surf zone.
- **Bubbles:** bubbles are points without light shafts; per-channel underwater fog stays with §2.7.
