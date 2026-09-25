# Board and surfer physics plan

- Status: **Requirements agreed; implementation proposed**, 2026-09-25. The decisions in §0 were confirmed in a 23-question grilling session. This is a companion to the [wave formation plan](wave-formation-plan.md), especially its §1.10, §3.2 and P4. It does not change the wave solver proposal.
- Goal: make catching, trimming, carving, popping up and wiping out consequences of board–rider forces in the same moving water that is rendered. The game should remain controllable with the existing paddle, pop-up and steer inputs.
- Evidence: the three user-supplied papers and additional primary work are assessed in [board and surfer physics sources](board-surfer-physics-sources.md). A measured value is identified as such below; all coefficients and control mappings without measured support are calibration parameters, not claims about real surfing.
- Integration: the [board–water handoff](board-water-integration-handoff.md) records the active P2a solver's available fields, unresolved sampling and momentum interfaces, and the checkpoint before board code begins.
- Acceptance: the [validation protocol](board-surfer-validation-protocol.md) defines observable catch, turn, pop-up and fall events, fixed-seed practice acceptance, and natural-wave reports.
- Gameplay reference: the [video brief](gameplay-video-reference.md) records the user-supplied clip's ride sequence and camera cues separately from physical measurements.

## 0. Agreed experience and scope

The first playable target is **one configurable shortboard and rider**, with regular and goofy stance. Record the reference board's dimensions, mass, rocker and fin layout before tuning; do not silently treat one CFD board as that reference. The board is rigid in this milestone. A controlled center-of-mass rider with hand, knee and foot contacts rides it; a buoyant independent body takes over after separation. Board flex, individual fin settings and full anatomical articulation wait for a demonstrated handling gap.

There are two modes using **the same water and board force laws**:

| Mode | Behavior | Acceptance role |
|---|---|---|
| **Practice**, the startup default | Controlled incoming waves keep a rideable face available continuously. The rider can restart immediately after a wipeout; the separated board and rider still simulate until reset, and the wave does not stop for the reset. | On a fixed seed, default board and controls, complete a **30-second ride on one face with a bottom turn and a top turn**. Record the same scenario with assists off. |
| **Natural sets**, one clear selection away | SeaState and spot bathymetry form variable sets, lulls, peeling sections and closeouts. No wave or board behavior is guaranteed per attempt. | Report catch fraction, ride duration and maneuver success across seeded suitable waves and spots. Establish final percentage thresholds from the first measured solver baseline. |

The current paddle, manual pop-up and one-axis steer inputs remain the default. Left/right means the same desired travel direction for both stances; body contacts are mirrored internally. A subtle cue indicates the physically determined pop-up opportunity, but the player decides when to stand. Timing errors can recover while hands or knees still support the rider; the attempt ends when the wave passes or contact is lost. Later advanced controls may split fore/aft trim and crouch.

Assists may smooth inputs and guide the rider toward a recoverable posture for a modest balance window. They **cannot add board speed, grip, buoyancy or a wave lock**. Board forces are identical with assists on and off. All assist interventions are logged in diagnostics, and an assists-off mode is mandatory for validation. This is how the game stays approachable without hiding a force that invalidates physics tests.

## 1. Current baseline and limits

`BoardPhysics` samples four board contacts from `InteractiveWaterField`. It has immersion, drag relative to water, simplified planing lift and a lateral rail/fin response. These already give a playable connection to the wave. The board and rider are effectively one translating mass, while steering directly changes yaw and `balance` decays as a game variable. Catch and ride states use timers and thresholds. `RiderFall` becomes a separate body after a wipeout, then ends after a fixed interval. The water plan replaces the current field with a surf-zone solver, so the next board model must attach to a *water sampling interface*, not to either solver's internal arrays.

The aim is a reduced-order simulator, not a full fluid–structure or anatomical simulation. Board lift, fins, rider posture and control are resolved only as far as they change visible ride outcomes. The field solver remains the authority for water height and flow. The render mesh never supplies collision heights.

## 2. What the evidence can support

| Observation | How it informs the game | Limit |
|---|---|---|
| A laboratory simulated pop-up study found a mean duration of **1.20 ± 0.19 s** across 23 male surfers; about 60% was push and 40% landing, with peak landing force **1.63 ± 0.18 bodyweights** and a reported front/rear split of **72/28** at landing. [Borgonovo-Santos et al., 2021](https://doi.org/10.3390/s21051783) | An initial timing and load-transfer envelope for the pop-up animation and board response. | Laboratory task, small male cohort and no moving wave. These are comparison targets, not fixed success thresholds or loads throughout a ride. |
| A recent scoping review surveys surfing biomechanics and emphasizes limited field evidence and differences among methods. [Biomechanical Perspectives on Surfing Performance, 2026](https://www.mdpi.com/2673-7078/6/2/36) | Locate primary studies and identify measurement gaps. | Secondary evidence. Do not use pooled claims as board force coefficients. |
| The supplied Griffith paper reviews prone paddling technique and neuromuscular control. [Volschenk et al., 2021](https://doi.org/10.25035/ijare.13.02.03) | Identify stroke and posture studies worth testing against the game's prone phase. | Narrative review; its suggested link between sprint paddling and wave entry is not a universal catch-speed measurement. |
| A numerical takeoff study found that entering a wave depends on enough horizontal speed relative to the advancing peak **and** a suitable position on the face. [Kimura and Kakinuma, 2015](https://doi.org/10.2208/kaigan.71.I_61) | Define catch observables using crest-relative motion and face position. | A model result for studied spilling/plunging cases, not a threshold for every wave. |
| Real surfing fin pressure measurements and planing-board CFD show that fins and the wetted hull create speed-dependent force and turning moments. [Fin pressure study, 2025](https://www.nature.com/articles/s41598-025-94834-0); [planing board CFD, 2020](https://www.mdpi.com/2504-3900/49/1/68) | Choose force directions and a center-of-pressure model; benchmark qualitative trends. | Specific board, fins, conditions and approximations cannot provide a universal game coefficient set. |

Further primary studies, including rocker effects, three-fin CFD, instrumented foot loads and bottom-turn video, are indexed in the accompanying source note. If a paper studies training, posture or paddling on a stationary apparatus, it informs a rider input or initial range only; it does not validate a hydrodynamic force law.

## 3. Simulation seam and state

### 3.1 One water authority

Both the legacy field and the new solver implement a small `SurfWater` sampling interface. The interface returns the field at a **world position, depth and simulation step**; the caller does not know whether it came from an analytic field, a CPU grid or a GPU readback patch. Batch sampling or caller-owned output objects should avoid allocations in the worker loop.

```ts
interface SurfWater {
  sampleAt(worldX: number, worldY: number, worldZ: number,
           step: number, out: WaterSample): void;
  addReaction(worldX: number, worldZ: number,
              impulseX: number, impulseZ: number): void;
}

interface WaterSample {
  surfaceY: number;
  depth: number;                  // local still-water depth; wet/dry is explicit
  wet: boolean;
  normalX: number; normalY: number; normalZ: number;
  flowX: number; flowY: number; flowZ: number; // at worldY, m/s
  breaking: number;              // solver's onset/dissipation signal
}
```

The exact TypeScript names can change. The contract cannot: x is alongshore, z is cross-shore, y is up, units are SI, and a sample and the force applied from it belong to the same fixed 1/60 s step. Sampling below the free surface reconstructs the orbital profile from the wave plan's §1.10; it must be finite and bounded near wet/dry cells. The new solver can replace this approximation when it has a better vertical profile. The legacy adapter preserves current behavior until the solver is accepted. The renderer and body contacts interpolate the same snapshots, with interpolation excluded from force integration. For the WebGPU tier, the plan's one-step-old patch and correction apply through this seam; measured lag must be surfaced in diagnostics. `addReaction` covers the horizontal impulses that a depth-averaged water solver can represent; vertical hull pressure is accounted for as support but must not be falsely reported as a resolved vertical water impulse.

Board and rider belong in the water worker described in wave-plan §3.2. Forces and water reactions are accumulated once per fixed step. The returned snapshot contains board and rider transforms, contact state, and diagnostic values; the main thread only displays them. The seam is justified by two real implementations: legacy and new surf-zone water.

### 3.2 Explicit bodies

Use a **rigid shortboard** body with position, quaternion orientation, linear and angular velocity, **board mass and inertia from the recorded reference geometry**. Represent the attached rider separately with mass, center of mass, stance and a few contact points (hands, knees and feet according to phase). During riding, a controlled torso/pelvis body plus leg constraints is enough; a full articulated skeleton is not required. The board is no longer assigned the rider's mass merely to hide missing contact forces. Mass, geometry and stance remain configurable even though one setup is tuned first.

Foot and hand contacts pass forces to the board at their actual lever arms. The board pushes back on the rider. If this coupled system is too stiff for an explicit step, use a small fixed number of constraint iterations, recorded in replay configuration. Regular and goofy stance mirror the contact coordinates; they should produce mirrored results under symmetric waves and input.

## 4. Board forces

Forces at each wetted hull patch use its relative velocity `v_rel = v_board + ω × r − u_water(r)`. The patch contributes buoyancy from displaced volume, pressure/planing support, tangential drag and water reaction. Sum `F` and `r × F` into linear and angular motion; integrate orientation as a quaternion. A shape description supplies patches, normals, area and center of pressure. It can start with the existing four contacts, then grow only if convergence and visual behavior require it.

Planing support is a bounded function of wetted area, angle of attack and dynamic pressure `q = ½ρ|v_rel|²`. It should move its center of pressure with immersion and trim, so nose dive, stall and tail release can occur. Hydrostatic buoyancy alone keeps a resting board afloat; planing support rises with speed. Do not add a constant lift or force along the wave direction. The current `tanh` rail force becomes a calibratable force curve, checked for continuity at zero speed.

Fins and immersed rails generate lateral force from local water-relative flow and yaw/sideslip. Start with a lumped rear-fin/rail contact; extend to individual fins only if the different lever arms measurably improve turns. Lift depends on dynamic pressure and a bounded lift curve `C_L(α)` that stalls at high attack angle. Drag rises during a hard turn. Immersion and ventilation reduce fin and rail grip toward zero as they leave water. Their force application points create yaw, roll and pitch moments. The 2025 measured fin pressure paper can validate force direction and change with a turn, while CFD informs qualitative lift/drag sensitivity; neither supplies a universal `C_L` for this game. Practice mode uses the same forces and coefficients as natural sets; it changes the incoming water conditions, not board grip or propulsion.

The board receives paddle impulse only through the rider's hands in a prone phase. Its continuous drag, slope-aligned gravity, flow and planing forces then determine whether a wave carries it. A catch is a sustained state of wave-assisted motion and hull support near the face, not a countdown. Kimura and Kakinuma's takeoff model motivates checking both horizontal speed relative to the crest and position on the face. The wave plan's `sqrt(2gΔh)` is an ideal gravity-only reference before drag and additional work from moving water; the drop test should check an energy budget rather than require equality or treat it as a strict bound when the wave adds energy. Crossing angle is an outcome distribution, not a hard-coded 50°.

## 5. Rider, input and pop-up

The existing steer input requests a rider **weight shift and rear-foot load**, not a direct board yaw velocity. A controlled posture target moves the rider center of mass over a finite response time. Foot contact forces create board roll and pitch, which change rail and fin forces, which turn the board. This gives players a responsive one-axis control while preserving the physical causal chain. Cap lean and load transfer by stance geometry; expose a few calibration values separately from physical constants. The input's requested travel direction is invariant across regular and goofy stance; mirroring happens in the posture/contact mapping. Input smoothing and limited posture recovery may be enabled as assists, with each intervention reported. An assists-off setting removes them without changing hydrodynamic forces.

The prone-to-standing transition has `prone → hand push → feet landing → standing` phases, initiated by the player. A subtle opportunity cue derives from face position, crest-relative motion and support; it does not trigger the transition. The simulated pop-up paper gives an initial **1.20 s** envelope and a push/landing ratio, but the animation should adapt to actual board motion and support. During push, hands and chest support the rider; during landing, load transfers to feet, initially front-foot biased. A successful standing state requires both feet to land within their board contact zones, enough board support and a recoverable center of mass. An early or late attempt can return to prone while hands or knees still have support; it becomes a miss or fall only when the wave passes or contact is lost. Standing should not be forced by an elapsed timer. Record landing forces and duration as diagnostics, then tune against the study as a range, accounting for its laboratory limits.

Paddling applies alternating hand strokes against the local water velocity and board/rider drag. The wave plan's 1.5–2 m/s sustainable-speed figure remains **provisional** until a field or instrumented paddling study justifies it. Calibrate with measured displacement speed where available, and preserve “no flat-water catch from paddling alone.” Remove paddle thrust as soon as hands commit to the pop-up.

## 6. Wipeout and water entry

Wipeout occurs when the rider cannot maintain valid foot support or recover a center of mass over the board: excess roll/pitch/yaw rate, rail/fin release, foot slip, lip collision or a board/rider impact. A displayed balance meter may summarize margin, but it is not the underlying cause. Define friction, contact and recoverable-lean bounds in one place so outcomes are traceable.

At separation, copy the rider's world position and velocity, including `ω × r` from the board, into an independent rider body. Keep the board active and floating; do not teleport either object. Use a capsule or a few linked masses for the rider's buoyancy, drag, angular damping and lip impact. Every submerged sample uses the depth-specific orbital velocity through `SurfWater`. Shoreline and wet/dry cells constrain contact. A fall settles when motion and collision energy have diminished or the rider leaves the simulation domain; no fixed three-second freeze. The rider's body must not contribute an extra board mass after separation. In practice mode, a restart input may replace the falling bodies with a new attempt immediately, while the underlying fall remains physically simulated until that input. Leash forces are a later scoped option and should be energy bounded if added.

## 7. Delivery aligned with the wave plan

| Board phase | Dependency and implementation | Exit gate |
|---|---|
| **B0: seam and baseline** | After P2c's worker and water sampler settle: add `SurfWater` adapter over legacy and new water; log current rides, turning, pop-up and fall traces. Record the reference shortboard and rider parameters. No gameplay retune yet. | Renderer, board and fall sample the same field in world coordinates; replay matches existing baseline. |
| **B1: board body** | After P2 worker and bathymetry: separate board/rider mass, integrate board angular motion, buoyancy, drag and bounded planing from local-depth samples. | Static float and drop tests pass across spots; fixed-step and worker replay deterministic. |
| **B2: rider contacts** | Add stance, COM transfer, physical foot/hand loads and pop-up phases. Replace direct yaw with weight-shift steering. | Mirrored stance test; pop-up force/timing diagnostics; turns follow load and wetted forces. |
| **B3: fins, rails and breaking** | After P3 lip and dissipation signal: speed-dependent lateral force, stall, ventilation and impact response. | Trim and carve across a peeling face; controlled loss of grip; closeouts and lip impacts can cause wipeouts. |
| **B4: full fall and calibration** | Complete P4 board consequences: orbital flow at body depth, independent rider/board aftermath, paddling and catch calibration. Add practice-wave forcing and restart around the shared solver; retain natural sets. | Wave-plan §1.10 gates plus the 30-second practice scenario and seeded natural-wave report pass. |
| **B5: advanced controls (optional)** | Fore/aft trim and crouch only after B4 proves one-axis control. | Adds maneuver range without changing catch or force law. |

This extends wave-plan P4; it does not move wave P1–P3 implementation into the board work. The handoff and baseline design can proceed while P2b/P2c is active. B0 code waits for P2c's worker and water sampler, and B1–B4 use that field to avoid implementing board physics twice.

## 8. Validation and tuning

1. **Units, conservation and numerics.** Static board+rider rests at a stable waterline; no force produces energy from a dry contact; drag dissipates relative motion; equal/opposite **horizontal** reaction impulses are recorded when coupled into the depth-averaged water field. Convergence is checked at 1/60 and 1/120 s and at two hull patch densities. All states stay finite at wet/dry boundaries.
2. **Force shape.** Fin/rail force approaches zero with zero speed or no immersion, changes sign with sideslip, rises roughly with dynamic pressure before stall, and loses grip smoothly when ventilated. Board center of pressure shifts sensibly with trim. These are model tests, not measurements of a particular commercial board.
3. **Catch and drop.** A flat-water paddle cannot enter ride state. On a seeded breaking wave, wave-assisted paddling and slope gravity create a catch window; changing approach angle affects likelihood. An unpowered drop's energy ledger records gravity, moving-water work and drag separately; no source of speed is hidden in a catch-state transition.
4. **Pop-up and riding.** Compare duration, contact sequence and landing load with Borgonovo-Santos et al. as a plausibility envelope. Run regular/goofy mirror cases and verify that directional input retains its meaning. Test early and late pop-up recovery while support remains. Execute controlled trim, small carve, hard carve and stalled turn on identical seeds; report path, speed, roll, contact loss and outcome rather than tuning only to visual feel. The cue must reflect the same face and motion criteria used by the physical transition.
5. **Wipeout continuity.** Separation preserves position and momentum to solver tolerance. Rider enters the moving water, tumbles and settles without deep tunneling or an arbitrary freeze. Board remains an independent floating object. Lips impart finite momentum and mass only through the shared physics step.
6. **Practice and natural rideability.** With default assists on, the fixed-seed practice scenario must support a 30-second continuous ride on one face with a bottom turn and a top turn, without direct board speed/grip injection. Count the turns from the board's path, heading change and position on the face, not from a maneuver label alone. Record the same run with assists off; a failed assists-off run is reported and investigated rather than concealed. After a wipeout, restart immediately on request without changing wave or board physics. For each natural spot and a seeded set suite, report catch fraction, ride duration/distance, wipeout cause and successful face-crossing maneuvers. Establish final natural-wave percentage gates after the first solver baseline; do not guarantee every wave. Use the source video as a qualitative camera/gameplay reference, not a calibrated physical dataset.
7. **Assists.** Compare on/off runs with the same wave seed. Log input smoothing, posture correction, contact margin and recovery duration. The board's buoyancy, lift, drag, fin/rail grip and water reactions must match for identical physical states regardless of the assist setting; only the rider's requested posture may differ.
8. **Performance and determinism.** Body/contact work must fit within the wave plan's **4 ms total CPU worker step** gate on the reference laptop. This is a target, not measured headroom: P2a alone was measured near **7.5 ms** at 33.6k cells on the concurrent wave branch, so P2b/P2c optimization and a fresh end-to-end benchmark are prerequisites. Profile contact sampling, solver reactions and constraints separately. If the gate is missed, first reduce redundant hull patches or rider joints, then measure the resulting handling difference; preserve the shared water field, correct force directions and fall continuity. Same-build CPU replays are bit-exact; render interpolation cannot alter the physics replay.

## 9. Decisions and unresolved calibration

- **Adopt now:** one water sampling seam, separate board and rider mass, force-applied steering, depth-specific flow, continuous fall, practice and natural modes on the same force laws, seeded scenario diagnostics and an assists-off validation switch.
- **Measure during B0/B1:** confirm the documented measured shortboard/rider reference against the visible model, then record its actual rendered/physical geometry, mass distribution, stance range, legacy force response and worker contact budget. Do not assign universal hydrodynamic coefficients from a single CFD geometry.
- **Calibrate during B3/B4:** planing/fin lift and stall curves, paddle force and stroke timing, foot friction and recovery limits. Each calibration record should state the source, wave/board conditions and whether it came from a measured study, a numerical study or playtesting.
- **Defer:** detailed board flex, aero forces, leash dynamics, individual finger/hand water contacts and full anatomical ragdoll. Add them only if a demonstrated gameplay or validation gap requires them.
