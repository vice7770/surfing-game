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
  - **Still open:** at full steer, about 2.1 s in (heading about 22°), the rider's drive velocity jumps by about 0.16 m/s in one step. A 2.9 BW contact spike, then flight and 'lost board', follow. The failure is the same at 8 substeps, so it is not the step size.
    - Suspects: the heading-velocity term, or the correction term, as the board traverses the slope.
    - `(board as any).entering(h)` is true throughout the carve, so the entry refinement runs every substep. That is costly; check its criterion.
    - Ruled out: the lateral deadband. The result is identical with `LATERAL_FREEDOM` at 0.2 instead of 0.06, and the balance loop never engages.
    - Ruled out: the step size (same at 8 substeps).
    - In the failing step (about 2.13 s), the board decelerates by about 15 m/s² (7.62 → 7.36 m/s), while the step-mean fin, rail and hull forces stay small.
    - Next: log each substep's rider impulse (`settle`/`pushBoard`) and the board's velocity change, to find which impulse grabs the board.
  - A faster standing balance loop (0.06–0.12 s) oscillates even without steering.
  - Probes: `carve.ts` and `carve2.ts` in the session scratchpad.
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
