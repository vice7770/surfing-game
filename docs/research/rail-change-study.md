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

## The rule: the feet never roll the board away from the lean asked for

**The trace.** An 8 m/s top turn, step by step:
- The contact carries nothing from 0.33 s. The body falls into the new lean at 2.9 rad/s and lifts off its feet, and the unloaded board stops (7.6 → 2.8 m/s).
- It falls in because the board first turned the wrong way at 1.75 rad/s, and that turn's centripetal pull threw the body in.
- The hull turns hard on a small roll. A held board at 7 m/s rolled 8° turns at 0.84 rad/s, and at 15° at 1.86 rad/s. So the feet's counter-roll at a lean-in (the ankle's rest saturated at 0.25 rad) is the wrong-way turn.
- The contact's own yaw moment is small (≤ 17 N·m).

**The rule** (the user's first direction for the study: the upper body starts the new lean):
- While the rider steers, the feet never roll the board away from the bank asked for. The upper body's swing throws the body into a lean, and the feet only catch it.
- Unsteered, the heading hold, the hand and a shove keep the feet's whole range.
- It is keyed on the eased reference, not the steer. Keyed on the steer, rail changes at 6 and 8 m/s fell: early in a change, the old turn's tightening is what lifts the body. Keyed on the reference always, the heading hold, the hand and the balance margin failed on their small references.
- Allowing the counter-roll up to the body's own lean toward the reference ("flatten only") turns the same, but brings the crouch's mid-turn wobble back (2.66 rad/s at 11 m/s against 1.78).

| | Committed | The rule |
|---|---|---|
| Rail changes from a carve, flat water, 6/8/10 m/s | on / fell / fell | on, on, on (kept 0.40–0.71) |
| Top turns from a climb, 6/8 m/s, 1.2 s | fell / fell | 59° / 74°, on; past across by 1.5 s |
| Top turn at 8 m/s, 2.5 s | — | 137° by 2.0 s, then stalls at 1.3 m/s and falls at 2.2 s |
| A carve up the face, then the change | fell | fell (6, 8 m/s) |
| Hard turn (7 m/s down the face, 1.2 s) | 61°, yaw rate 0.5–2.35 rad/s | 52°, 0.6–1.4 rad/s |
| Compress over the crouch (carve lab) | fell at 1.9 s | on |
| Bottom turns at the face's base, 1.2 s | standing 75°, crouch 69°, Compress 62° | 71°, 66°, 60° |
| Mid-turn swing at 11 m/s (held / Compress / Shift crouch) | 0.99 / 0.87 / 2.52 rad/s | 0.00 / 0.69 / 1.78 rad/s |

**Reading:**
- The committed hard turn's extra 9° rode the feet's pumping. Their rest swung between its limits at about 3 Hz, and the rail rolled about 4° past the body on average.
- The body's lean is the same either way (45–46° at 1.2 s). It nears the lean asked for with the balance's 0.5 s time constant (BANK_GAIN over BANK_RATE_GAIN), which is the deep U's shortfall. Speeding it up is a redesign of the balance on the roll model, not part of this rule.
- In a steady carve the swing now holds the lean it threw (0.27 rad in a frontside Compress turn), so the drawn chest turns 5° out of the turn. The rig's reaching hand falls 6.9 cm short of the physics' hand in the water (2.8 cm before).

Pinned, not tuned:
- the hard turn's 60°;
- Compress's mid-turn swing at 11 m/s against a held turn that no longer swings;
- the frontside reaching hand's 5 cm.
