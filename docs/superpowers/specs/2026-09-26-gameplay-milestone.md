# Gameplay milestone (P8–P11): specification

Status: **agreed** in a grilling session with the user on 2026-09-26. This is the spec the P8–P11 plans argue from. Each decision below was put to the user with a recommendation and confirmed. The surf-science evidence behind the numbers is in the [gameplay research survey](../../research/surf-gameplay-research.md).

## Principles

1. **Physical inputs, not scripted moves.** Every mechanic is a rider input into the physics: where the rider wants its centre of pressure, how long its legs are, whether a hand is in the water, how hard it paddles. There are no scripted manoeuvres, no speed bonuses, and no forces added to make a manoeuvre happen.
2. **The player gives intent; the rider's reflexes balance.** The player sets lean, fore/aft weight, crouch and hand. A slow, human-like active balance keeps the rider up within physical limits. Falls come from asking for more than the physics allows (friction, the support under the feet, impacts), so a player who turns in the wrong place or too hard falls. Tuning that balance for good play is ongoing gameplay work, not a one-off.
3. **Study numbers are split.**
   - **Outcomes become validation checks:** ride speeds, turn kinematics, tube proportions, set statistics, hold-down durations. Reports and tests compare the simulation with the measured ranges.
   - **Body limits become tunable design parameters:** leg stiffness, reflex delays, stamina, breath. They start from study values, cite them in doc comments, and are marked provisional.
   - A check that fails is investigated, never tuned into passing.
4. **Every tier runs every mechanic.** This includes the CPU tier with the flexible rider; no simplified rider is kept for weaker machines. Performance is measured and recorded, never a gate. The reference machine is an M4 Pro (48 GB); an M1 Air (8 GB) running poorly is acceptable.
5. **Reliability is a judgement.** "Catching is reliable" (which retires `legacy`) and "a layer is done" are decided by the user and Claude together, from the reports and from play. There is no numeric pass rate.

## Layers and order

| Phase | Layer | Contents |
|---|---|---|
| **P8** | Riding | Phase 0 (speed and position against the wave, camera, line-holding autopilot), the flexible rider, trim, stall, crouch, pumping, turns, heading hold, ride report and optional score, balance feedback |
| **P9** | Take-off | Paddle recalibration, sprint, stamina, angled take-off, late take-off and air drop |
| **P10** | Tube | Pulling in and racing out, rail grab and hand drag in the tube, crouch clearance, the Regular/Goofy setting, the tube camera. Merges with P7 (barrels) |
| **P11** | Lineup | Sliding window, reading sets, duck-dive, surface roller and aeration, hold-downs and breath, leash, Next set |

- P7 (barrels) continues in parallel on `claude/barrels`: its lip sheet is water-side and the flexible rider is rider-side. The two meet in P10.
- The gameplay branch stacks on `claude/paddler-hold` (PR #7), which holds the paddler fixes and the ride recorder.
- Each layer is planned in detail when it is reached; only P8 has a task-by-task plan now.

## Controls

The existing keys keep their meaning. The new keys depend on whether the rider lies on the board or stands:

| Key | Prone (paddling) | Standing |
|---|---|---|
| Space / ↑ | paddle (as now) | ↑ / W: weight forward (trim) |
| ↓ / S | hold: duck-dive (P11) | weight back (stall) |
| ← → / A D | steer (as now) | lean (as now) |
| Shift | hold with paddle: sprint (P9) | hold: crouch; release: extend. A rhythm of presses pumps |
| E | — | wave-side hand in the face (drag, stall) |
| Q | — | grab the rail (P10) |
| Enter / R / C | as now | as now |

- Every key ramps an analog axis over about 0.2 s, so a future analog controller (for example a Steam Controller) maps straight onto the same axes.
- Ctrl is never bound (macOS uses Ctrl + arrows to switch spaces).
- Touch keeps a core subset: paddle, sprint, stand, lean and crouch. Rail grab and fine trim are keyboard or controller only. Physical mode's touch controls must work (today they are hidden).
- The rider carries a stance sign from the flexible rider's first commit (regular by default). The Regular/Goofy setting arrives in P10, when backside and frontside hand play differ.

## P8 · Riding

- **Phase 0 (first):**
  - measure the rider's speed and position relative to the crest: crest speed, the peel's required speed c / sin α, how far ahead of the crest, and how high on the face;
  - make the default ride camera a wide three-quarter view that holds the horizon and does not lag the rider;
  - build an autopilot that holds a line along the face, for recordings and reports.

  The player sees **speed over ground** (horizontal board speed, comparable with GPS studies). Crest-relative values go to the Wave Lab and the reports.
- **The flexible (finite-impedance) rider.** The rider stands on legs with finite stiffness and damping, coupled to the board in one implicit solve, with slow active balance. It replaces the rigidly carried standing rider (the "infinitely strong ankle" behind the full-lock carve failure). Starting values from the research survey:
  - leg stiffness about 22 kN/m in the surf crouch (Matsumoto & Griffin 1998: 2.75 Hz with legs bent);
  - ankle about 600 N·m/rad (Loram & Lakie 2002);
  - damping ratio 0.2–0.5;
  - reflex delay 75–110 ms (Horak & Nashner 1986).

  The legs can push hard enough to jump, so airs can emerge later.
- **Mechanics:**
  - trim fore and aft (weight along the board);
  - stall (weight back, or a hand in the face);
  - crouch (a shorter leg);
  - pumping (crouch and extend in rhythm, working against the real load on the feet);
  - turns (lean);
  - **heading hold:** with no lean asked for, the rider's reflexes hold the current heading on the face, so releasing the keys holds a line.
- **Feedback:**
  - body language always (arms reach, knees drop, the board chatters);
  - an optional balance meter showing the real margin (how close the centre of pressure is to the edge of the feet, and how much of the friction is used). On by default in Practice, off by default in Natural Sets;
  - a **ride report** at the end of each ride: time, distance, top and mean speed over ground, time in the pocket, detected turns with their kinematics;
  - an **optional 0–10 wave score** from a physics rubric, per wave plus a session total of the best two waves.
- **A ride ends on:**
  - a fall;
  - losing the face (the board falls behind the wave and stops being carried);
  - reaching the inside whitewater or the shore;
  - a kick-out (over the back of the wave), detected, not bound to a key.

  The rider stays in the sea, and R relaunches.
- **Done when:**
  - the full-lock carve test passes (its `it.fails` goes);
  - an autopilot's bottom turn and cutback fall inside Forsyth et al. 2024's ranges without falling, keeping about 0.9 of its speed;
  - flat-water pumping gives no sustained planing, while pumping on the face gains speed;
  - ride speeds agree with the peel geometry, c / sin α;
  - the user and Claude play it and agree it feels right.

## P9 · Take-off

- **Paddling recalibrated:** normal paddling cruises at 0.8–1.1 m/s and sprinting reaches 1.5–1.9 m/s after 4–8 s (Nessler et al. 2019). Today's normal paddle (about 1.6 m/s) is really a sprint.
- **Stamina** is a critical-power model. Effort below a sustainable level (cruise) never tires. Sprinting, duck-diving and hard swimming drain a reserve in about 20–30 s, and it refills over minutes. Nothing carries over between rides for the whole session (session-long fatigue is backlog). It shows through body cues (slower, shorter strokes), plus an optional meter.
- Angled take-offs come from prone steering.
- Late take-offs and air drops are judged by the landing physics. Validation: time to stabilise after a 0.5 m drop about 0.7 s (Tran et al. 2015).
- Pop-up attempts can be early or late and are recoverable; the physics decides (the session spec).

## P10 · Tube

- Pulling in and racing out emerge from line, stall and speed.
- Rail grab (Q) adds a hand contact that lowers the centre of mass and adds roll authority. Hand drag (E) holds a line.
- Crouch sets clearance under the lip sheet.
- The Regular/Goofy setting.
- **The tube camera** switches automatically, while the rider is covered, to a low view just behind the rider looking out through the tube's opening, and back when uncovered. C still cycles. A setting turns the auto-switch off. The see-through sheet with the wide camera is the fallback.

## P11 · Lineup

- The solver window slides with the rider as they paddle along the shore.
- Sets are read from the horizon only (far-field ocean, bigger crests); no HUD cue. The Wave Lab keeps a fixed NEXT SET readout for diagnostics.
- Duck-dive (↓/S while prone), about 234 N net push to sink the reference board. The turtle roll is backlog, with a future longboard.
- **Surface roller and aeration:** the flow bodies feel under broken water gets a surface roller layer (Svendsen's roller: thickness from the breaking dissipation, moving at about the wave speed) and aeration that cuts buoyancy (12–18 % void fraction, Blenkinsopp & Chaplin). Duck-dives, hold-downs and tumbling emerge from it. It changes body sampling only, not the solver.
- **Breath:**
  - about 60–70 s at rest, draining faster with effort (Guimard et al. 2021);
  - underwater, Space swims up at a higher breath cost, and releasing it relaxes;
  - running out ends the run with "Held down too long" and a rescue to the lineup.
- **Leash:** an elastic tether that snaps above about 1–1.5 kN, with board recoil. There is no injury system.
- **Next set:** restarts the surf zone just before the predicted set (the warm start, behind a loading card). A hurry-up fast-forward covers shorter waits. Practice's steady swell does not need it.

## Session framework

- Practice (a steady swell) and Natural Sets, as in the [session experience plan](../../research/session-experience-plan.md), with R as Quick retry in both modes. Next set arrives with P11.
- Teaching is a key card plus one-time hints that retire after the player uses the mechanic successfully.
- Rides in slow motion (time-scale below 1) are still scored; the time-scale is noted in the ride report.

## Out of scope (backlog)

- Multiplayer and community judging; a local "watch your last wave" replay (both need a recording format that does not depend on bit-exact re-simulation across browsers).
- Audio.
- Airs (the flexible rider is built so they can emerge later).
- Turtle roll and a longboard.
- Computer-controlled surfers in the lineup.
- Session-long fatigue.
