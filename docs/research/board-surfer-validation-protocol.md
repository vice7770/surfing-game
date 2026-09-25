# Board and surfer validation protocol

Status: **pre-implementation acceptance design**, 2026-09-25. This makes the agreed outcomes in the [board and surfer physics plan](board-surfer-physics-plan.md) observable. It introduces no code and does not prescribe the water worker's final API. Recheck its water-dependent measurements at the [P2c handoff](board-water-integration-handoff.md).

## Evidence and test roles

Three kinds of evidence answer different questions:

1. **Physical invariants** answer whether a force model is internally consistent: buoyancy, water-relative drag, dry fin behavior, finite wet/dry sampling, momentum transfer, fall continuity and replay stability. These can be automated with controlled water states.
2. **Field plausibility** compares ranges and motion patterns with surfing measurements. The [2020 ocean-wave shortboard field study](https://doi.org/10.1371/journal.pone.0232035) recorded GPS, board yaw/pitch/roll and bottom-turn/cutback timing; the [2021 laboratory pop-up study](https://doi.org/10.3390/s21051783) recorded pop-up duration and landing loads. Neither gives universal pass thresholds for a different board, rider or wave.
3. **Playable acceptance** asks whether a player can catch, stand and link turns on the selected wave. A captured human-controlled run is replayed deterministically for diagnosis. Automated scenarios check repeatability and invariants, but a scripted controller alone does not prove playability.

Keep these results separate in reports. A visually satisfying run cannot excuse an unaccounted force, and a numerically plausible force curve cannot by itself prove controls are usable.

## Scenario record

Every saved run includes: game commit, water-solver version, spot, mode, water/board/rider seed, board geometry and mass, rider mass and stance, input mapping, assist setting, fixed time step, initial condition, time-stamped input stream, worker timing and whether the run was player-controlled or scripted. Record the wave phase and current state at attempt start so replays do not silently begin on different faces.

Per-step diagnostics needed once B0/B1 implementation begins:

| Group | Fields |
|---|---|
| Water | surface height and normal at each contact, depth-specific flow, wet/dry/outside-domain state, crest position and motion, breaking and lip impulse, sample step |
| Board | position, quaternion, linear/angular velocity, wetted patch area, planing center of pressure, drag/lift/buoyancy/fin/rail forces and moments, horizontal water reaction |
| Rider | posture phase, center of mass, hand/knee/foot contact locations and loads, requested versus achieved lean, assist interventions |
| Outcome | catch/miss/stand/ride/wipeout transitions, face-relative path, ride distance/time, turn evidence, separation and fall settling, restart event |

The current legacy diagnostics cover only part of this set. Missing fields are **future B0/B1 implementation requirements**, not work for the agent building P2 water.

## Event definitions

These definitions set the measurement method. Numerical thresholds such as minimum heading change and event hysteresis are selected from the first P2c/B0 baseline and frozen before B3/B4 tuning; they are not retrofitted after a failed run.

| Event | Required observations | Exclusions |
|---|---|---|
| **Pop-up opportunity** | Board is on an advancing face with adequate water support, suitable crest-relative motion and room for foot placement. Cue uses this same state. | A fixed time since wave spawn or a cue based only on rendered foam. |
| **Recoverable pop-up error** | Player presses early/late, but hands or knees still support the rider and center of mass can return to prone. | Automatic success after a timer, or instant wipeout while valid support remains. |
| **Catch** | After paddle release, board and rider remain supported on the moving face with sustained wave-assisted motion and a viable path toward standing/riding. Report crest-relative velocity, face position and energy inputs. | A timer alone, a world-space z band alone, or injected forward velocity. |
| **Bottom turn** | A descending board reaches the lower face, rolls onto an engaged rail/fin, and changes its *actual path and heading* toward an ascent or traverse. Record face-relative vertical position, roll, yaw, speed and contact forces. | A maneuver label or mesh rotation without a path change. |
| **Top turn / cutback** | After climbing to the upper face, the board changes heading and cross-face direction, with a corresponding roll/contact transition, then remains supported or visibly releases. | A steering-input reversal that does not move the board across the face. |
| **Wipeout** | Foot/hand support is physically unrecoverable or a water/lip impulse separates the rider; record cause, contact loss and board/rider states. | Balance-meter depletion as the sole cause. |
| **Fall settled** | Independent board and rider have completed meaningful impact/tumble motion and reached a stable or out-of-domain state. | Freezing at a fixed elapsed time. |

The field study describes a bottom turn followed by a cutback/top turn and records changes in board rotation, speed and duration. Its particular speeds and turn rates are **comparison envelopes**, not conditions for recognizing a turn in this game. Face position and measured board path are the primary event evidence.

## Acceptance cases

### A. Practice mode: the first playable gate

- Start in practice mode with the selected shortboard/rider reference, fixed seed and default assists. A player can paddle, manually pop up, stay on **one continuously rideable face for 30 seconds**, and execute at least one bottom turn followed by one top turn. The event detector must confirm both from path, heading and face position. No direct board speed, grip, buoyancy or wave lock may be supplied by the mode or assists.
- Capture the player's input stream and replay it on the same build. The CPU physics trace must match exactly under the wave plan's determinism requirement. Report rider and water force budgets through the catch and turns.
- Repeat the same scenario with assists off and record the outcome. A failure is a tuning finding, not a hidden waiver. Assists may alter requested posture and input timing, but the board force law and water field stay identical for identical physical states.
- Force a wipeout. The board and rider continue physically; immediate restart is available on input and does not stop or restart the practice wave.

### B. Natural sets: distributions rather than guarantees

- Use a frozen suite of spot, sea-state and seed combinations established after P2c. Mark waves suitable or unsuitable from the **wave field alone** (face length, breaking/closeout pattern and available approach) before judging board success, to avoid defining suitability by whether the current controller caught them.
- Report catch opportunities, attempts, catches, ride duration and distance, bottom/top turns, miss/wipeout causes and assists state. Show per-spot distributions and the full seed list. Set numerical success percentages only after the first solver baseline, then freeze them before board-force tuning.
- Keep an unsuitable-wave sample in the suite: some waves should close out or pass the rider. This verifies that natural mode has not inherited practice mode's continuous-face guarantee.

### C. Controlled physical cases

- **Float and dry:** board and separate rider support settle without sinking or rising indefinitely; out-of-water fins/rails cannot produce lateral lift; dry ground does not supply water lift.
- **Relative flow:** opposing and following water currents change drag in the expected direction. Contact water velocities come from body depth, not only surface texture motion. Record any capped linear-profile use in a bore.
- **Turn response:** opposite steer inputs produce opposite body-weight shift and lateral board path under mirrored symmetric conditions; regular and goofy controls retain the same travel-direction meaning.
- **Energy and reaction:** during a drop, log gravity work, moving-water work and drag separately. Horizontal reaction impulse on water has the opposite sign to the board's applied water force after area weighting. No state transition adds unexplained kinetic energy.
- **Fall continuity:** at separation, world position and velocity, including the board's angular contribution at the rider contact point, continue without a jump. Fall motion responds to local flow and lip collision and has no fixed three-second cutoff.
- **Time step and domain:** compare 1/60 and 1/120 s traces within a stated convergence tolerance. Wet/dry and sliding-window edge queries remain finite and explicitly report outside-domain state rather than clamping to an unrelated edge cell.

## Gate order and reports

| Gate | What is frozen or checked | Blocking result |
|---|---|---|
| **P2c handoff** | Actual water sampler, coordinate convention, worker step order, rendering agreement and measured budget. | Missing contact water data, mismatched surface or no credible worker budget. |
| **B0** | Reference geometry/mass record, scenario format, baseline traces and deterministic replay. | Inability to reproduce a seeded run or distinguish legacy guarantees from natural-wave results. |
| **B1/B2** | Float, drag, board angular response, stance mirror, manual pop-up and support transitions. | Direct yaw/velocity injection, invalid contact load or unbounded integration. |
| **B3/B4** | Fins/rails, physical wipeout, practice 30-second run and natural-wave distribution. | No linked turns, falls that teleport/freeze, or natural-wave success claimed from a single hand-picked seed. |

Each gate report should include a small table of passed/failed cases, the seed/input artifacts, measured worker time and remaining deviations. A failed physical invariant blocks tuning; a failed playability case calls for diagnosing water opportunity, board forces, rider control and assist intervention separately before changing coefficients.
