# Board–water integration handoff

Status: **planning only**, 2026-09-25. No gameplay or solver code is changed by this note. It complements the [board and surfer physics plan](board-surfer-physics-plan.md). Its observations describe the concurrent wave branch at `a5fb915` (`feat/wave-formation-p1-sea-state`), so the API inventory must be checked again after P2c is merged.

## Current dependency boundary

P2a has a standalone, validated finite-volume shallow-water solver and four spot bathymetries. P2b is planned to add sea-state boundaries, warm start, a sliding window and performance work. P2c is planned to integrate the solver, renderer and worker with the game. **Board implementation should wait for P2c's stable worker and water sampling interface.** Read-only baseline analysis and this contract can proceed now.

| Board need | P2a observation | Handoff requirement after P2c |
|---|---|---|
| Free surface at arbitrary hull and rider points | `ShallowWaterSolver` stores cell-centered total depth `h` and bed elevation `bed`; `surfaceAt(i) = h[i] + bed[i]`. | One continuous world-space sampler that matches the render surface. Specify the interpolation kernel and demonstrate render/contact agreement, including stretched z cells. |
| Local water motion | It stores depth-integrated `qx`, `qz` in m²/s. Wet-cell depth-averaged speed is `q/h`. It has no public 3D velocity sampler. | Return horizontal flow at the queried body depth with the wave plan's vertical-profile approximation where valid. Define a bounded behavior for bores, shallow cells and dry cells. Vertical flow, if returned, must be identified as a reconstruction rather than solver state. |
| Shoreline and domain | `h` can become dry; `bed` and `zEdges` vary by spot; `cellIndex(x,z)` clamps x and z to a cell. | Expose `wet`, water depth and `outsideDomain` separately. Board/rider contacts outside the moving window must not silently reuse an edge cell. Wet/dry interpolation must remain finite and not manufacture lift on land. |
| Breaker and lip | P2a captures bores as shallow-water shocks but has no board-facing breaking/lip sample yet. | P3's breaking signal and lip collision state should use the same simulation step as water height/flow. Do not infer collision from foam or rendered spray. |
| Two-way coupling | No external board reaction source is exposed in P2a. | Add a horizontal momentum source or an explicit documented one-way mode. For a cell of area `A = dx × dz`, a board impulse `J` distributed to that cell corresponds to `Δq = −J/(ρA)` in the matching horizontal component. Distribution weights and sign must be tested for unequal z-cell areas. Depth-averaged water cannot receive a resolved vertical hull impulse; report that limitation honestly. |
| Step ownership | `ShallowWaterSolver.step(dt)` may substep internally to obey CFL and advances its own time. | The worker owns one fixed gameplay step index and records water substeps. Board sampling, body integration, reactions and snapshot emission need a fixed, documented order so replay and force accounting refer to the same step. Rendering may interpolate snapshots but cannot feed back into body forces. |

The proposal's `SurfWater` interface is a **consumer contract**, not an instruction to expose solver arrays directly. It can use caller-owned output objects or batches to avoid allocations at each contact. The legacy field and the new solver are separate adapters until legacy retirement. The new adapter must not use `cellIndex` clamping alone to answer out-of-domain queries.

## Baseline record before changing forces

### Candidate reference setup

An [ocean-wave field study by Shormann and in het Panhuis (2020)](https://doi.org/10.1371/journal.pone.0232035) records a coherent shortboard/rider pair: **73 kg surfer**, **1.78 m length**, **0.47 m width**, **0.06 m thickness**, **25.9 L board volume**, and a three-fin thruster setup. This is a provisional B0 reference because it is an observed setup close to the current code's 74 kg rider value. It is not a prescribed board for all surfers or proof that the game's reference video used those dimensions. The paper does not supply the board's mass, so mass must be chosen and documented separately before inertia is calibrated. The study's measured board yaw, pitch, roll, speed and turn duration can later provide plausibility checks, with wave and skill differences noted.

The game currently renders a 2.65 m board and uses `boardMass = 80` in `BoardPhysics`, alongside `riderMass = 74`. The 80 kg value acts as an effective simulation mass and must not be relabeled as the physical shortboard mass. Reconcile visible geometry, physics contact positions, volume, board mass and inertia as **one configuration** when B0 begins; changing just the mesh length would not do so.

Preserve enough information to compare the new board model with the current game without treating legacy behavior as a physical target:

| Record | Minimum fields |
|---|---|
| Scenario | source commit, seed, mode, spot, wave settings, board/rider parameters, assist setting, fixed step, exact input sequence |
| Water near bodies | surface height, surface normal, local flow, wet/dry status, breaking/lip state, sample coordinates and step index |
| Board | position/orientation, linear/angular velocity, hull/fin/rail immersion, force and torque totals by source, planing center of pressure |
| Rider | prone/push/landing/standing/falling phase, hand/knee/foot support, center of mass, contact loads, separation cause |
| Outcome | catch/miss/wipeout transition, ride duration/distance, turn path and heading, fall settling or restart, frame and worker timings |

The existing `BoardPhysics` diagnostics already provide speed, waterline, submersion, catch progress, local flow, breaking, turn rate, balance and outcome reason. They do **not** yet give force components, torque, true contact loads or a separate rider mass. Those new observables belong to the later board implementation, not to the water agent's P2a work.

Existing `BoardPhysics.test.ts` asserts a catch for every seed 1–12 and a complete ride of at least 20 m in under 20 s under the legacy packet. Keep those as a baseline while that field remains available. When the new solver becomes authoritative, replace them with the agreed fixed-seed 30-second practice ride and seeded natural-wave distributions; a guaranteed catch on every natural wave would contradict the wave formation plan.

## Integration risks to resolve at the P2c checkpoint

1. **Performance headroom.** The concurrent wave plan records P2a at about **7.5 ms per 33.6k-cell step** in Node, above the proposed **4 ms total CPU worker** gate before board contacts are added. P2b optimization and P2c measurement must establish a real board budget. Do not claim the board fits until measured. If a budget is missed later, simplify redundant hull contacts and rider joint detail first, then measure handling changes; keep the shared water field and force directions.
2. **Board scale.** The current render geometry spans **2.65 m** length and roughly **0.6 m** maximum width, while the selected reference is a shortboard. Its four physics contacts reach `z = ±1.05 m`. Before mass, inertia or wetted-area calibration, choose and record one coherent geometry for both rendered hull and physical contacts. The current visual dimensions are a code observation, not a researched shortboard standard.
3. **Surface/flow consistency.** P2a's cell-centered `h`, `qx`, `qz` differ from the legacy node field. The board, fall body and renderer need the same world-coordinate convention and interpolation policy. Tests should cover cells near the wet/dry edge and the moving window boundary.
4. **Velocity profile limits.** The wave plan's linear depth profile is suitable as a controlled approximation before breaking; it is not a resolved vertical flow in bores. Bound it and flag the regime in diagnostics so tuning does not hide a large extrapolation.
5. **Practice-wave forcing.** The agreed endless practice mode must use the same P2c solver and board forces as natural mode. P2b/P2c should expose a controlled incoming-wave configuration suitable for that mode; no direct speed or grip injection belongs in the board adapter.

## Release sequence

1. **While P2b/P2c is active:** keep this handoff and the board proposal current; do not edit shared water or board code. Record the chosen reference board and rider parameters once a coherent target is selected.
2. **At P2c merge:** recheck the actual worker snapshot, water sampler, interpolation, domain handling and measured step cost against the table above. Resolve any missing contract with the water implementation before B0 code begins.
3. **Then B0:** implement the adapter and baseline telemetry in an isolated branch, keeping gameplay behavior unchanged. Only after the B0 gates pass should B1 replace board dynamics.
