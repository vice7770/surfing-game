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
