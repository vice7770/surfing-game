# P4e Fins, Rails and Breaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The P4d board gets fins and gripping rails, so it holds a heading, carves when the rider loads a rail, and loses grip by stalling or ventilating instead of by rule (board plan §4, B3; the [maneuver note](../../research/surfing-maneuver-forces.md)'s carve row). The prone paddler steers by stroking harder on one side. A plunging lip can strike the rider off.

**Architecture:**
- **Fins (`hullForces.ts`, `finForce`).** Each fin is a foil in the board's x–z plane, loaded by the water flowing past it at its own depth:
  - lift C_L(α) rises with its angle to that flow (C_Lα from Helmbold's low-aspect-ratio slope) and blends smoothly into post-stall flat-plate lift above α_s;
  - drag is C_D0 + C_L²/(π AR e), rising to flat-plate drag after the stall;
  - its area scales with how much of the fin is in the water.

  `BoardBody` carries three fins (a thruster). Their sideways force enters the implicit solve along each fin's normal, like the hull pressure, so a light board stays stable at speed.
- **Rails (`railForce`).** Each rail station is a side face with an outward normal. It resists sideways motion into the water with the planing pressure law, one-sided, while immersed. A rolled board then bites with its low rail.
- **Prone steering.** The steer input weakens the stroke on the side to turn toward and strengthens the other, which yaws the board.
- **Leg wake.** Parts behind the tail sit in the board's wake: their drag along the body is sheltered further.
- **Lip.** `PlungingLip` parcels expose velocity. A swept parcel–part test exchanges impulse with the rider through the contact (attached) or `DetachedSurfer.resolveLipContact` (fallen), and the parcel keeps its changed momentum.

**Tech Stack:** TypeScript, three.js math, Vitest.

## Sources and modelling choices

- **Fin geometry:** a thruster of typical modern fins, modelling values rather than measurements:
  - about 0.0095 m² each, 0.115 m deep, aspect ratio about 1.4;
  - side fins 0.28 m ahead of the tail, 3 cm in from the rails, toed 3° in;
  - centre fin 0.09 m ahead of the tail.
- **Lift slope:** Helmbold, C_Lα = 2π AR / (2 + √(AR² + 4)), about 2.0 per radian.
- **Stall:** Falk et al. 2019 found separation above about 20° on a simplified three-fin setup, which they state is not a universal stall angle. α_s = 18° is a modelling choice.
- **Direction:** Kniesburges et al. 2025 measured the fin pressure difference and its outward lateral lift in a real turn. That checks direction, not magnitude.
- **Post-stall:** flat-plate C_L ≈ sin 2α and C_D ≈ 1.3 sin² α.

## Findings so far (2026-09-26, for whoever picks this up)

- **Status:**
  - Task 1 (fin forces, `finForces.ts`) is done and committed (`9e63eb8`).
  - Task 2 starts in `BoardBody.substep`. Resolve each fin's root from the shape (z = −L/2 + fromTail, x = side × (half width − fromRail), y = rocker), and sample the water at the fin's immersed mid-span.
  - Add the fin force and torque, and put each fin's `damping` on the system as a rank-one term along its world normal, as for `pressureDamping`, with the matching correction impulse after the solve.
  - Give fins and rails their own reaction slots, a `work.fins` and `work.rails` ledger entry, and `forces.fins` and `forces.rails`.
- **Why catching fails today** (probes in the session scratchpad, all reproducible from `SurfZoneRunner` with `{ rider: true }`):
  - **Prone drag on a tow:** 21 N at 1 m/s, 72 at 2, 124 at 3, 161 at 4 and 184 at 5 m/s. At 4 m/s the two legs trailing past the tail make 71 N of the body's 93 N (Task 3's leg-wake shelter). Moving the legs onto the tail broke the prone float instead.
  - **Front-face steepness at the break**, over 60 s: Beach up to 23° (rarely above 20°), Point up to 30° (594 samples above 20°), Reef up to 48°. Catches are physically possible on the Point and Reef.
  - **A catch bot on the Point:** it waits 3 m outside the break line, paddles when a face arrives and pops up on the cue. It reached 5.4 m/s and lit the cue twice in 3 minutes, but never stood. Without fins the board yaws on the drop.
  - After fins, rerun the bot on each spot and record catch and ride-time distributions (P4f).
- **Task 2 partly done** (`feat: carve on fins and rails`):
  - The board carries the thruster and a side face on each rail station, all implicit sideways.
  - A sideslipping board straightens within 1.5 s; a finless one slides on.
  - Steering now asks for an edge angle (up to 30°) rather than a fixed weight on the rail. The board rolls onto the rail and turns, 14–30° of heading in the first second.
  - **Superseded, then fixed:** an edge-angle controller (roll feedback through the centre of pressure) made the roll ring, growing until the rider tipped off after about a second.
    - Steering is now a direct lean: the upper body shifts up to 0.2 m toward the rail, smoothed.
    - Standing balance acts only when the centre of pressure leaves ±0.06 m across the feet (±0.2 m along).
    - On a 15° static face, half steer carves steadily at a 5° roll, turning about 12° in 2.5 s at 7–8 m/s.
    - Full steer holds a 9–10° roll and turns 21° in 2 s.
  - **Found and fixed** (`fix: carry the standing rider symmetrically in the solve`): the full-steer fall after about 2.3 s was the coupled solve going singular, not a force.
    - The standing rider was carried at the stance point on the deck (v + ω × b) but pushed through its centre of mass 0.9 m above (torque a × J). That makes the coupled 6 × 6 system non-symmetric.
    - As the carve turned, its smallest eigenvalue fell smoothly from 0.21 to 0.007. The one-step map's dominant eigenvalue went from 1.005 (3.5 s) to 3.5 and then 11. The board's spin then grew about 1.4× per substep, ending in a 2.9 BW spike, flight and 'lost board'.
    - Physically, a light board rolls out from under a rider held upright by arbitrarily strong ankles.
    - The fix: the solve carries the centre of mass rigidly (v + ω × a, symmetric and positive definite). A drive term, −(ω_roll/pitch × offset), keeps the body upright as the board rolls and pitches under the feet.
    - Result: full steer on the 15° face now holds for 2.85 s, up from 2.28 s, and ends in 'balance' instead. Three-quarter and half steer hold for 4 s.
    - Method, for similar bugs: clone the board and rider (a prototype-preserving deep clone), perturb consistently, and take the eigenvalues of the step map and of the coupled matrix (`sing.ts`, `jac.ts` and `eig.ts` in the session scratchpad).
  - **Diagnosed, still open** (`it.fails` in `AttachedRider.test.ts`): after about 2.8 s at full steer, a roll oscillation throws the rider ('balance').
    - A linearization of the one-frame map (block power iteration on cloned board and rider states, `lin.ts` in the session scratchpad) finds two modes:
      - A 13–16 Hz roll mode whose growth per frame goes from 0.94 (2.5 s) to 1.26–1.42 (from 2.9 s). Its frequency rises as the substep shrinks (15 Hz at 1/960 s, 44 Hz at 1/3840 s), so it is numerical. The upright drive, −(ω × offset), uses the board's spin from the previous substep while the solve carries a 73 kg body 0.9 m up rigidly (a lever inertia of about 66 kg·m²). The lag adds a jerk term, m·o²·h·θ‴, which destabilizes the roll when m·o²·h·k exceeds the board's roll inertia times its roll damping. This is the infinitely strong ankle again; its implicit, non-symmetric form goes singular at the same state.
      - A 3–4 Hz roll–yaw swing (the Dutch roll) that sits at 1.00–1.02 per frame, at the edge of stability, at every steer level.
    - At ¾ and full steer both runs fail when the heading reaches about 33° across the 15° face. Trimming at 60° across it fails at once: a rider held world-vertical stands 13° off a board lying on the face.
    - Three rewrites of the standing coupling were tried and rejected:
      1. A body that leans with the board and rights itself over τ = 0.002–0.2 s. The Dutch roll goes unstable at every τ.
      2. A balanced rider carried and pushing at the deck point under its centre of mass, leaning along the force that supports it:
         - taken from its own contact, the lean feeds back through its height with a gain of about o/(gτh) ≈ 900 and explodes in two frames;
         - from an outside reference (the surface normal plus the turn), the true centre of pressure pins at the feet's edges.
      3. A leg-line inverted pendulum: a rank-one symmetric push along the line from a controlled centre of pressure through the centre of mass, with divergent-component balance. It chatters between the load cap and flight, because a freely swaying body cannot follow the light board's surges.
    - The fix this points to is a finite-impedance rider: ankle and leg stiffness and damping in a coupled 9-DOF solve, with slow active balance. It is deferred until P4f shows whether real waves need it.
    - Meanwhile a standing rider steps at 16 substeps (1/960 s), where the lag holds for the tested carves (`STANDING_SUBSTEPS`). Before this, that step came about by accident from the entry refinement (below).
  - **Rider yaw inertia (tried, left out):** the standing body yaws with the board, so its own yaw inertia (about 3.7 kg·m² from the posture parts) belongs in the solve. Added (the [4][4] entry plus a yaw-impulse ledger), it turns a growing roll–yaw swing of about 2.3 Hz unstable even at half steer. That is likely physical (a Dutch roll) that the open-loop lean does not damp. It needs roll-rate feedback in the balance or lean, then the inertia can go back in.
  - **Fixed:** `entering(h)` was true throughout the carve, because it compared vertical speed with the water instead of speed into the sloping surface. Gliding down a face now refines nothing; a drop still does.
  - A faster standing balance loop (0.06–0.12 s) oscillates even without steering.
  - Probes: `carve.ts` to `carve11.ts` and `tcarve.ts` in the session scratchpad.
- **Task 3 done** (`feat: keep the paddler's line and shelter trailing legs`):
  - `SwellWater` is a linear-wave test fixture: elevation, slope and Wheeler-stretched orbital flow.
  - With fins alone, a paddler still veered about 16–20° on flat water and settled 40° off course in 0.8 m, 8 s swell at 45°. The first pull is one arm from rest, before the fins can grip.
  - The paddler now keeps its line only through its strokes: with no steer, the arms pull unevenly against the heading error (full at 10°) and the yaw rate (0.5 s). Steering sets a new line. Under way it holds within about 3° over 20 s; the first pull still yaws it about 14°.
  - Legs trailing past the tail sit in the board's wake: along the body they meet half the sheltered drag. Prone tow drag is 19, 64, 106, 133 and 148 N at 1–5 m/s, down from 21, 72, 124, 161 and 184 N.
- **Task 4 done** (`feat: strike the rider with the plunging lip`):
  - `PlungingLip.forEachContact` offers each airborne parcel as a sphere of its own volume, with a stable id and its position before and after the step. A velocity the visitor changes stays with the parcel, so it lands with its momentum after the strike.
  - The attached rider sweeps each part against the parcel over the step, as the fallen surfer does (`LIP_CONTACT`: 5 % of the parcel's mass engages, at most 8 m/s of change), and books the strike's work.
    - Standing, the push's share along the deck sways the body off its feet as an inverted pendulum. Balance moves the centre of pressure within the support to catch it (the push-recovery capture point, 0.15 s).
    - A push that puts the capture point beyond the feet topples the rider: 'balance' past 0.25 m of sway. A 0.2 m³ parcel at 8 m/s through the torso throws it; a 0.01 m³ splash is ridden out.
    - Without the sway, the light board simply slid sideways with the rider.
  - `RideSession.strike` hands the lip to the rider on the board or to the fallen surfer, and the runner calls it every step after the board and body move.
- **Task 5 done (the record):**
  - `npm run report:catch` runs a bot surfer on each spot. It waits prone a few metres outside the break line, paddles when a crest rises behind it, pops up on the cue and rides straight until it falls or the wave leaves it.
  - On the stage 1 solver (2 seeds × 3 minutes per spot, the Wave Lab defaults) it made 135 attempts: 11 cues, 11 pop-ups, none stood. By spot, attempts and cues:

    | Spot | Attempts | Cues |
    |---|---:|---:|
    | Beach | 27 | 1 |
    | Point | 39 | 1 |
    | Reef | 69 | 9 |
    | Canyon | 0 | 0 |

    Top speeds were 3.1–4.8 m/s. Most attempts ended with the prone rider lifted off the board by the bore ('lost board'); every pop-up ended 'no support'. The Canyon never raised a crest over the bot's trigger.
  - A sweep of the wait (3–25 m outside the break) and the trigger distance (14 or 30 m) found no catch.
  - Stage 1's non-dispersive waves arrive at the break line as bores. The face passes the board in about half a second while backwash runs seaward at up to 1.2 m/s. So P5 (the Boussinesq solver) comes before P4f's catch calibration.
- **User requests queued:**
  - play the swimmer after a fall and choose to swim back and remount (ROADMAP);
  - the camera views front, behind, side and overview, now done (`8d145db`).

## Tasks

### Task 1: Fin forces
- `finForce`.
- Tests:
  - lift reverses with sideslip;
  - it rises about linearly, peaks near α_s, then falls;
  - drag rises with α;
  - a dry fin gives nothing, and a half-immersed fin about half;
  - the reported lateral damping matches the finite difference.
- Commit `feat: add fin lift, drag, stall and ventilation`.

### Task 2: A board with fins and rails
- `BoardBody` fins and rails, with an energy ledger entry and water reactions.
- Tests:
  - a riderless board sliding sideways at 5 m/s straightens into its heading;
  - with a standing rider on a face, steering turns the board toward the loaded rail by more than 20° in 2 s, and it keeps planing without spinning out;
  - opposite steering turns the other way, and released it tracks straight;
  - 1/60 and 1/120 s steps agree.
- Commit `feat: carve on fins and rails`.

### Task 3: Prone steering and leg wake
- Tests:
  - prone paddling holds its heading within 10° over 20 s in oblique swell;
  - steering while paddling turns the board the requested way.
- Commit `feat: steer while paddling`.

### Task 4: Lip strikes
- `PlungingLip` parcel velocity and a swept contact against the rider.
- Tests: a parcel through a standing rider knocks it off (impact or balance), with the impulse equal and opposite on the parcel, and a parcel passing clear does nothing.
- Commit `feat: strike the rider with the plunging lip`.

### Task 5: Record
- Record the catch bot's results on each spot. Update the ROADMAP. Commit `docs: record P4e fins and rails`.
