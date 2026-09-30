# The body's lean in turns: a study

On the user's choice (2026-09-30), after the angulation study closed. That study's wave probe read the body at 25° over a 32° rail in hard turns, while the path's pull (0.91 g) would balance a 40° lean. That looked like the ankle holding the body upright with more torque than feet on a deck can give: about 270 N·m, against about 140 N·m from a centre of pressure 0.13 m out under the load.

The question: does the ankle hold the body off its pull, and do the feet stay within what they can give?

## How the model limits the feet

- The ankle's torque, τ = k (θ − φ − δ) + (k h + c)(θ̇ − φ̇), has no cap of its own. The balance's rest δ is held within ANKLE_REST_RANGE (0.25 rad), which `rollModel`'s `bankAuthority` sizes so the feet's pressure reaches their edges under one body weight.
- **The contact caps it.** The rider pushes the board along a line through its centre of mass. `project()` clamps where that line meets the deck (the centre of pressure) to the feet's support, ±0.13 m across (`riderPosture`), and marks the contact `tip`.
- Then the step is infeasible. The board takes only the impulse feet can give, and the rider moves on its own. Across the leg nothing pulls it back: the posture's correction acts only along the board while banking, so the body tips.
- So the model cannot hold the body with more than feet can give. What remains is where the body leans against its own force line, and how often the feet reach their edge.

## Still water: the deep U

`FaceToFlat`, crouched down the 15° face at 7.3 m/s, full lean and Compress 1 m before the flat. The body's bank and its specific force's line are both read from the vertical across the heading. The line is where a body in balance leans, from the rider's own acceleration.

Steer −1, crouch 0.6, Compress 1 (angles toward the turn):

| t s | Body | Its force line | Rail | Line − body | Centre of pressure across | Ankle τ / load | Load | Held | Speed m/s |
|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| 0.3 | 14° | 9° | 14° | −5° | 0.05 m | 0.03 m | 1.22 BW | yes | 5.9 |
| 0.6 | 25° | 21° | 27° | −4° | 0.04 m | 0.03 m | 1.06 BW | yes | 5.6 |
| 0.9 | 30° | 30° | 41° | 0° | 0.01 m | 0.00 m | 1.12 BW | yes | 5.1 |
| 1.2 | 29° | 27° | 45° | −2° | 0.05 m | 0.04 m | 0.98 BW | yes | 3.9 |
| 1.4 | 26° | 16° | 42° | −10° | 0.13 m | 0.06 m | 0.81 BW | no | 2.7 |

Without Compress the same: the body within 0–5° of its line to 1.4 s, the centre of pressure within 0.06 m, the contact held throughout.

- **The body leans on its force line**, within 0–5° all through the turn: a balanced inverted pendulum.
- The feet's centre of pressure stays within 0.08 m of the middle (their edge is 0.13 m), and the ankle's torque within 0.06 m of the load. The contact holds, except for one step at 1.4 s as the board stalls.
- The rail sits 14–16° past the body. That is the board, not the ankle: rolled to 44–45°, near its bite, the slowing board pulls only as much as a 30° lean (the angulation study's reverse lean).

## Waves: the Canyon

The Canyon's practice sea with the ride report's turn settings (turns, the pocket reflex, ghosts), 1 seed × 3 minutes, on main after #86. Every standing step turning faster than 1 rad/s above 4 m/s: 809 steps, in 12 rides of 3 s or more, 14 bottom turns (9.5 → 5.5 m/s, a 9 m path at 0.83 g, a 50° peak rail).

| Hard-turn steps on waves | |
|---|---|
| The body's bank / its force line | 32.7° / 29.7° |
| Line − body | mean −3.1°; p10 −10.6°, p90 +8.6° |
| Rail − body | +4.2° |
| The feet's centre of pressure across | mean 0.072 m; p90 0.130 m (the edge); past 0.10 m on 30% of steps |
| The ankle's torque over the load | mean 0.077 m; p90 0.102 m |
| The contact held / at the feet's edge (`tip`) | 71% / 13% of steps |
| Load | 1.29 body weights |
| The upper body's swing | 33° on average, of its 69° |

- **The body leans on its force line on waves too**, 3° past it on average, swinging about ±10° as the water moves under it.
- The angulation study's "25° over a 32° rail, where 0.91 g balances 40°" compared the body with the board's path. The body sways on its feet, so its own acceleration is not the board's. Against its own force line it is balanced. (That run was also before #76; this one reads the body at 33°.)
- **In wave turns the feet work at their edge.** A third of the hard-turn steps put the centre of pressure past 0.10 m of its 0.13 m. One in eight is at the edge, tipping. The contact fails on 29%, and the swing does much of the balancing. On still water the deep U never goes past 0.08 m.
- The same run's attempts ended in 13 balance falls and 27 lost boards (of 119 attempts, 19 stands).

## Reading

1. **The ankle does not hold the body off its pull.** The contact caps it at what feet on a deck can give. Measured against its own force line, the body leans where it should: within 0–5° on still water, and 3° past it on average (±10°) on waves.
2. **The angulation study's lean gap was a comparison between different things**: the body against the board's path. That note is corrected there.
3. **In turns on waves, balance is marginal.** The feet sit near or at their edge on a third of the steps, and the upper body's swing carries much of it. That is where the rider's hold on the board is thin. It is a lead for the falls: the ride report counts falls by cause but not where in a turn they start.
4. The feet's reach, ±0.13 m, is half a foot's length across the board, heel to toe: a surf stance's.
5. Still open for the user:
   - where the wave turns' feet go to their edge: the water moving under the board, rail changes, or the landing of a turn;
   - whether that is the falls' cause.

The probes: `src/dev/zz-body-lean.test.ts` (the deep U; `leanReading` reads a step) and a patch on `scripts/ride-report.ts` (`ride-report-body-lean-probe.patch`), both kept in the session's scratchpad and not committed.

## Where the feet reach their edge, and the falls (2026-09-30)

On "continue" after the reading above. The Canyon's practice sea with the same settings, seeds 1 and 2 × 3 minutes, on main at dacd4e4. Every standing step is tagged with what the autopilot was doing. Each fall from standing is read over its last 0.5 s. The feet are "at their edge" with the centre of pressure 0.12 m or more across, of their 0.13 m.

| What the rider was doing | Seconds (seed 1 + 2) | At the edge | Of those, on the lean's side | Tipping | Contact failing |
|---|---:|---:|---:|---:|---:|
| Bottom turn, compressed | 29.1 + 11.8 | 13% / 7% | 77% / 96% | 9% / 9% | 29% / 25% |
| Dropping, crouched | 19.1 + 12.4 | 5% / 6% | 94% / 49% | 8% / 10% | 55% / 32% |
| Cutback | 7.1 + 2.9 | 31% / 40% | 61% / 75% | 22% / 30% | 37% / 42% |
| Climbing, extended | 3.0 + 2.0 | 19% / 16% | 59% / 40% | 19% / 20% | 38% / 33% |
| Top turn | 1.1 + 1.1 | 23% / 63% | 100% / 100% | 24% / 17% | 50% / 66% |

- The feet reach their edge most in the turns back down the face (cutbacks and top turns), and least in the drop.
- It is the lean's side: the body falling into its turn, not flung out of it. A rail change within 0.4 s is rare (0–17% of the steps).

**The 28 falls from standing** (20 `balance`, 8 `lost board`; the attempts' other `lost board` falls came before the rider stood):

- **The board had slowed below planing.** 25 of 28 fell below 4 m/s and 18 below 3 m/s; the median was 2.7 m/s. At the fall the feet carried almost nothing (0.00–0.2 body weights in most).
- **16 had the feet at their edge** in the last 0.5 s, 14 of them on the lean's side. The body, still banked, fell into a turn the slowing board no longer pulled. They ended bottom turns (6), top turns and cutbacks (6), drops and climbs (4).
- **About 10 tipped with the feet well inside across,** so at their ends along the board. The body pitched over a stopping board, mostly in drops (at 0.8–2.8 m/s, still loaded 0.5–0.7).
- The board's heave in the last 0.5 s stayed mostly within −0.6 to +0.6 g. The water was not throwing the rider.

### Reading

1. **The feet at their edge are the symptom; the stall is the cause.** Nearly every standing fall comes after the board has dropped off the plane (4 m/s on, 3 m/s off). The body is still banked for a pull that is gone, or pitching over a board that has stopped.
2. This is the riding memory's old lead ("standing falls at ±70° bank at 1.4–2.3 m/s over ground"), now counted. Its root is the turns' lost speed: the long, wide bottom turns on the flats (the carve-drag study) and the climbs they end in.
3. Two ways at it, for the user:
   - **the autopilot's technique:** ease the steer and stand up as the board slows below planing, rather than hold a hard turn into a stall (a dev-tool change, measured with the ride report);
   - **the rider's recovery:** how a banked body stands back up as its board drops off the plane. It already stands back on its ankles before the upright carry takes over. An immediate carry is on the don't-retry list: it tipped the slowing board.

The probe is a patch on `scripts/ride-report.ts` (`ride-report-feet-edge-probe.patch`, with a `--first-seed` flag to run seeds in parallel), kept in the session's scratchpad.
