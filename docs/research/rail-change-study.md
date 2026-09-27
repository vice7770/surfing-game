# Rail changes and the top turn: a study

The top-turn plan (`docs/superpowers/plans/2026-09-27-top-turn.md`), on the user's choice of a rail-switch study with the Compress speed bleed folded in. Measured on the 15° plane face and flat water with the live rider, the carve lab's "Rail changes" and "Depth and speed" sections, and single-variable sweeps.

## What fails

- **Top turns** (climbing 150° from the fall line, full steer back down) fall within 0.4–1.1 s having turned 6–51°. Climbing without steer holds.
- **Rail changes on flat water:**
  - From riding flat, the board first yaws 8–12° the wrong way, then turns, and the rider stays on.
  - From a carve the other way (a true edge change), the old turn goes on 41–67° and the rider falls at 8 and 10 m/s within 0.6 s.
- **The hull is not the cause.** Held at a bank, the board turns toward the rail it is rolled onto at every heading, climbing included.

## The mechanism

- **The ankle runs flat out.** The balance sets the ankle's rest at 7.4 × (reference − bank). The rest's ±0.25 rad range saturates at about 2° of error, so any lean asked of it drives the feet to their edge, and the upper body's swing takes the rest.
- **The counter-steer is physical.** To throw the body out of one lean, the feet roll the board further onto the old rail and the old turn tightens, as a bicycle steers into its lean to stand up.
- **It is slow and costly.** Saturated, the body takes about 0.45 s to reach upright from a 33° lean. The tightening old turn bleeds the speed from 7.4 to about 4.5 m/s.
- **At the top of the face,** the same counter-steer points the board straight up as it slows. It stalls nose-up (10–15°), sinks 0.4 m and loses the grip to reverse, and the rider falls into the turn.
- **The legs pulling is a symptom.** Making legs in tension go slack removes the pull, not the fall.

## Single-variable sweeps (8 m/s unless noted)

| Change | Rail changes | Top turns | Hard turn (61°) | Depth bleed (crouch 1 + weight forward, speed kept 0.56) |
|---|---|---|---|---|
| Extend (crouch 1 → 0) at the switch | falls as before | falls | — | — |
| Ankle rest range ×2 | worse | falls | — | — |
| Swing torque ×2 | as before | falls | — | — |
| Leg softening off | as before | falls | — | 0.56 (not the cause) |
| Reference rate 5 → 2.5 rad/s | all on | all on (66–69°) | 47° | 0.61 |
| Reference within 10° of the body | all on, 9–25° wrong way | all on (42–48°) | 15° | 0.72 |
| Reference within 20° of the body | all on | all on (68–80°) | 39° | 0.66 |
| Reference within 30° of the body | all on | fall | 56° | 0.57 |

**Reading:**
- The falls, the old turn's long run-on and much of Compress's speed bleed share one root: a bank reference far ahead of the body drives the saturated ankle into a counter-steer that digs the rail.
- A fixed limit on the reference trades bottom turns (the hard turn) for top turns. That would be tuning, not design.

## Design options

1. **A reference governor**, designed on the roll model like the turn redesign's balance.
   - The bank reference is shaped each step so the balance's predicted demand stays within what the ankle's range and the upper body's swing can deliver at the current speed and leg length. That is a standard control technique for constrained loops.
   - The lean-in stays as quick as the body can follow. A lagging body is never driven into the counter-steer blow-up.
   - Risk: bottom-turn onsets may slow where they now rely on saturation.
2. **A cross-under: the legs push the board across under the body.**
   - This is closer to how surfers and skiers change edges: the board swings under a body that travels on, and the old turn need not tighten.
   - It is a new lateral actuator between body and board in the 8×8 solve, a larger change near the memory's don't-retry list (the capture-point reflex and soft-ankle variants fed the roll–yaw wobble).
3. **Both:** the governor first, since it is smaller and measured, then the cross-under if rail changes are still slow.

## The governor, tried (the user chose "governor, then cross-under")

- **A governor at the actuators' capacity changes nothing.** It caps the balance's demand at the ankle's range plus the swing's torque, 0.72 rad of rest. But with a large error the demand stays saturated at that capacity either way, so the actuation is identical to before.
- **What the fixed limits did was cap the body's bank rate on large changes.** The rate term can only brake once the demand falls below capacity: about 0.36 rad/s at a 10° margin, 1.1 rad/s at 30°.
- **Limiting only the rising, when the body must come up or cross over, spares bottom turns** (the hard turn stays at 61°). But rail changes then never finish crossing within 1.2 s, and top turns still fall.
- **The top-turn fall is not a rising problem.** It is the lean-in from flat on a slowing, climbing board: the counter-steer that starts any lean points the board up the face, where it stalls.
- **In an S-turn the board must keep turning the old way to pass under the body.** That is the cross-under's geometry. The losses come from how the balance does it: the old rail digs, and the lean is started by pushing the board away.

**Conclusion:** no principled governor fixes top turns without costing bottom turns. The next step is the cross-under: the way a lean is actuated.
