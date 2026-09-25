# Board–water integration handoff

Status: **planning only**, updated 2026-09-25. No gameplay or solver code is changed by this note. It complements the [board and surfer physics plan](board-surfer-physics-plan.md) and the [surfer P4 plan](surfer-physics-p4-plan.md). The table below preserves the P2a observation at `a5fb915` for history. The active wave branch was rechecked at `c3fce46` (`feat/wave-formation-p1-sea-state`); recheck again at the actual P4 implementation handoff.

## Current dependency boundary

P2a–P2c and P3a–P3b have since landed on the active wave branch. P2c deliberately shipped a **view-only** physical mode; the legacy wave remains playable. The physical solver now has sea-state boundaries, warm start, a sliding window method, breaker strength and mass-conserving lip parcels. It still has no runtime body sampler, lip-body collision, board/rider coupling or Web Worker. **The body-sampling and worker dependency moved to P4.** Board and surfer force code should wait for that stable contract; read-only baselines and planning can proceed now.

| Board need | P2a observation (historical) | P4 handoff requirement |
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

The recommended **provisional B0 reference** combines two clearly identified measurements:

| Parameter | Initial value and source | Boundary |
|---|---|---|
| Rider mass | **73 kg**, a participant in [Shormann and in het Panhuis's ocean-wave study (2020)](https://doi.org/10.1371/journal.pone.0232035). | The current code's 74 kg rider is already close; rider posture and distribution still need modeling. |
| Board shell | **1.778 m × 0.464 m × 0.0667 m**, **25.75 L**, **2.54 kg**, PU/stringer shortboard DP-1 with three fin boxes, measured in [Connellan et al. (2026), Table 1](https://doi.org/10.1002/adem.71000). | The study measured this physical board for structural response, not surfing forces. Removable fin mass and installed-fin center of mass are not specified by this value. |
| Fin configuration | Three-fin thruster, as ridden in the [2020 field study](https://doi.org/10.1371/journal.pone.0232035). | Use one combined fin/rail force first; individual fins come later only if they improve handling. Fin areas and locations are B3 calibration inputs. |

The field study's 73 kg participant rode a different but very similar **1.78 × 0.47 × 0.06 m, 25.9 L** shortboard. Thus the combined reference is a **modeling choice from two studies**, not one measured board-and-rider system. It is a defensible starting point close to the selected shortboard style, not a claim about the exact board visible in the [user's video](gameplay-video-reference.md). The field study's measured board yaw, pitch, roll, speed and turn duration can later provide plausibility checks, with wave and skill differences noted.

The game currently renders a 2.65 m board and uses `boardMass = 80` in `BoardPhysics`, alongside `riderMass = 74`. The 80 kg value acts as an effective simulation mass and must not be relabeled as the physical shortboard mass. Reconcile visible geometry, physics contact positions, volume, board shell/fin mass and inertia as **one configuration** when B0 begins; changing just the mesh length would not do so. Compute inertia from that geometry and mass distribution, then check convergence and turn response. Do not import the field study's combined board-and-surfer moment of inertia as the board's inertia.

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

## Integration risks to resolve at the P4 checkpoint

1. **Performance headroom.** The active wave branch records P2b-2 at about **4.05 ms per 36.2k-cell step** in bundled Node and P2c at **5.7–7.6 ms per step in browser on the main thread**, before board and rider contacts. The proposed **4 ms total CPU worker** gate is not yet met end to end. P4 must measure the coupled worker rather than infer headroom from the solver-only benchmark. If the gate is missed, profile and simplify redundant hull contacts or rider joint detail, then measure the effect; keep the shared water field and force directions.
2. **Board scale.** The current render geometry spans **2.65 m** length and roughly **0.6 m** maximum width, while the provisional measured reference is a 1.778 m shortboard. Its four physics contacts reach `z = ±1.05 m`. Before mass, inertia or wetted-area calibration, confirm or revise the provisional reference and apply one coherent geometry to both rendered hull and physical contacts. The current visual dimensions are a code observation, not a researched shortboard standard.
3. **Surface/flow consistency.** P2a's cell-centered `h`, `qx`, `qz` differ from the legacy node field. The board, fall body and renderer need the same world-coordinate convention and interpolation policy. Tests should cover cells near the wet/dry edge and the moving window boundary.
4. **Velocity profile limits.** The wave plan's linear depth profile is suitable as a controlled approximation before breaking; it is not a resolved vertical flow in bores. Bound it and flag the regime in diagnostics so tuning does not hide a large extrapolation.
5. **Practice-wave forcing.** The agreed endless practice mode must use the same physical solver and board forces as natural mode. P4 should expose a controlled incoming-wave configuration suitable for that mode; no direct speed or grip injection belongs in the board adapter.
6. **Lip-body contact and moving window.** P3b's `PlungingLip` exposes positions and volumes for rendering but no swept collision or public contact momentum. `shiftAlongShore` exists but has no runtime caller. P4 needs collision impulse accounting and explicit domain status while the simulation follows the board before a fall and the surfer after one. See the [surfer P4 plan](surfer-physics-p4-plan.md).

## Release sequence

1. **While P4 is being prepared:** keep the board and surfer plans current without editing the active water branch. Preserve the provisional measured board/rider reference above and record any revision with its reason.
2. **At the P4 handoff:** check the worker snapshot, depth-flow sampler, interpolation, wet/dry and outside-domain behavior, lip contact data, window shifting and measured coupled step cost against the table above. Resolve missing contract fields before tuning board or surfer forces.
3. **Then B0/S0:** implement the adapter and baseline telemetry in an isolated branch, keeping gameplay behavior unchanged. Only after those gates pass should B1/S1 replace legacy board and rider dynamics.
