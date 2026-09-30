# Leaning in on a braking curve: a design study

On the user's go-ahead (2026-09-30) for a design study after the lean-in study (`lean-in-study.md`). That study found that a body leaning faster than its turn pulls falls in: the feet press their inside edge, the rail rolls past its bite, and the board capsizes. The question here: how quickly can the balance lean the body in, given what it can brake with?

## The plant, measured

From the carve lab (`carve-lab.md`, "The plant"), at 7 m/s:
- The rail reaches 63% of a step in 0.05 s.
- The turn's yaw follows the rail about 0.03 s later.
- The planing hull rights the board about the rider's load line at about 850 N·m/rad.

So the pull catches up with the rail quickly. In the failed tries it was the rail that lagged the body, because the feet's rest held it back to throw the lean.

## A reduced model

A model of the lean-in built from those numbers (angles toward the turn), kept in the session's scratchpad as `leanmodel/`:

- **The body:** an inverted pendulum 0.9 m tall (crouched). It leans on by g / h times how far it is past its force line, plus the ankle's and the swing's torques over m h².
- **The ankle and the hull in series:** a rest δ rolls the rail 0.48 δ behind the body, and pushes the body in with 413 δ N·m. The push is capped where the feet's pressure reaches their edge, 0.13 m of the load.
- **The rail** follows in 0.05 s and **the pull** follows the rail in 0.04 s. Past the bite (48°) the board bogs.
- **The swing:** 10 kg·m², 200 N·m, ±1.2 rad. It bursts only while it could still be braked within its range.
- **The balance, as the game has it:** δ = 7.4 (reference − bank) − 3.6 bank rate. The swing takes what the feet cannot give. Steering into a lean it lags, the feet never throw it.

The model reproduces the game:

| | Model | Game (the deep U) |
|---|---|---|
| today's lean to 38° | 90% at 1.2 s | about 30° at 0.9 s, 34° at 1.0 s (the entry study) |
| rate gain 2.8 | quicker, on | quicker, on |
| rate gain 2.2 and below | falls | 2.2 on; 1.8 falls at 1.17 s |

## Where today's lean spends its time

The balance asks for a lean rate of 7.4 / 3.6 = 2.06 per second of the error left, a straight line. So it starts braking early: in the model, at 14° of 38°.

A lean that brakes only as hard as the plant can could follow √(2 A × error), with A the braking it has. That is much faster in the middle of the lean. Braking comes from:
- the rail leading the body, by at most 0.48 × the rest range (7°), and no further than the bite;
- the feet's push;
- the swing.

## The design: a braking curve past `near`

The lean's rate asked for is the balance's line within `near` of the reference: exactly today's balance, where the wobble and a held carve live. Past `near` it is the larger of that line and a braking curve, √(2 A (|error| − near)) + 2.06 × near. The feet and the swing then give BANK_RATE_GAIN × (the rate asked − the bank's rate), gated as today.

In the model:

| | Lean-in 0 → 38° | Rail change −30° → +30° |
|---|---|---|
| today | 90% at 1.21 s, rail max 37° | 90% at 0.94 s, overshoot 2° |
| A 1.5 rad/s², near 5° | 90% at 0.74 s, overshoot 1°, rail max 45°, the feet never at their edge | 0.89 s, overshoot 7° |
| A 1.5, near 10° | 0.72 s, overshoot 3°, rail max 47° | 0.86 s, overshoot 12°, rail 49° |
| A 2.0 and more | overshoots past the bite, falls | falls |

About 1.5 rad/s² is the braking the plant has. More and the body gets ahead of its pull, as in the lean-in study.

## In the game's solve

The curve as an experiment in `prepareBank`. The deep U, turned and speed kept from the steer:

| Crouched | 0.3 s | 0.6 s | 1.0 s | 1.2 s | 99° at |
|---|---:|---:|---:|---:|---:|
| today | 4°, 86% | 13°, 82% | 46°, 73% | 66°, 63% | 1.55 s |
| A 1.0, near 5° | 3°, 86% | 13°, 84% | 54°, 75% | 78°, 56% | 1.47 s |
| A 1.5, near 5° | 4°, 86% | 16°, 87% | 61°, 72% | 83°, 49% | 1.42 s |
| A 2.0, near 5° | 4°, 87% | 19°, 89% | 65°, 67% | 86°, 45% | 1.42 s |
| A 1.5, near 10° | 4°, 86% | 17°, 87% | 62°, 70% | 83°, 51% | 1.40 s |

| Compressed | 0.3 s | 0.6 s | 1.0 s | 1.2 s |
|---|---:|---:|---:|---:|
| today | 2°, 85% | 13°, 80% | 42°, 69% | 61°, 55% |
| A 1.5, near 5° | 3°, 86% | 17°, 83% | 55°, 62% | 74°, 41% |

- Every variant stays on.
- **Crouched, A 1.5 turns 15° more by 1.0 s for the same speed kept (72% against 73%),** and reaches 99° 0.13 s sooner.
- The body leans 29° by 0.5 s (about 23° today), and the rail holds at its bite, 45–49°.
- Compressed turns more but keeps less: the compressed board sinks as it slows (the entry study).

## The test suites

The physics, dev and game suites (754 tests) with the curve on, against today's (741 pass, 13 expected fails):

| Variant | Real regressions | Pinned tests it now passes |
|---|---|---|
| A 1.5, near 5° | 10: rail changes at 6 and 8 m/s, the rail past its bite at full steer, mid-turn Compress at 7, 8 and 11 m/s, the held rider settling, three drawn-body tests | 2 |
| A 1.5, near 10° (rider tests) | 7, the same kinds | 2 |
| A 1.0, near 10° (rider tests) | 4: rail changes at 6 and 8 m/s, mid-turn Compress at 11 m/s, the held rider | 2 |
| **A 1.5, near 15°** | **6: the rail change from a carve at 8 m/s (falls), the held rider settling (0.32 against 0.15), and four drawn-body, online-body and HUD checks** | **2** |
| A 1.5, near 20° (rider tests) | 2: the rail change at 6 m/s (turns 18°, not 30°), mid-turn Compress at 11 m/s (0.99 against 0.87 rad/s) | 2 |
| A 2.0, near 15–20° (rider tests) | 5–8: rail changes, the crouched turn at 11 m/s, top turns at 8 m/s | 2 |
| A 1.5, near 5°, only leaning further to the same side (rider tests) | 8 | 2 |

The two pinned tests the curve passes are the hard turn ("turns hard with a full lean and a crouch, keeping most of its speed") and Compress taken mid-turn at 11 m/s.

With near 15°, the deep U keeps most of the gain: crouched 56° by 1.0 s (72% of speed), 99° at 1.43 s; compressed 51° (64%).

## On waves

The Canyon's practice sea (the ride report's turn settings), seeds 1 + 2 × 3 minutes, A 1.5 near 15° against today on the same code:

| | Today | The curve |
|---|---:|---:|
| Attempts, stands, rides ≥ 3 s | 216, 36, 18 | 215, 35, 14 |
| Falls, all causes | 75 | 72 |
| Bottom turns (seed 1; seed 2) | 14: 82°, 9.5 → 5.5 m/s; 8: 69°, 6.5 → 4.1 m/s | 9: 86°, 9.3 → 5.3 m/s; 12: 68°, 8.3 → 5.4 m/s |
| Speed kept into the top turn | 0.28 (5 pairs); 0.11 (1) | 0.48 (3 pairs); — |

**On waves nothing measurable changes.** The bottom turns are as long and keep as much speed, the falls are as many, and fewer rides pass 3 s (within these small samples). The wave turns' rate, pull and rail already matched Forsyth's (the angulation study). Their lean was not what held them back.

## Reading

1. **A braking curve leans the body in quicker where the plant allows it.** Past `near` of error, the lean's rate follows √(2 A (|e| − near)); within it, today's balance is unchanged. About 1.5 rad/s² is the braking the feet, the rail and the swing have. More, and the body outruns its pull (the lean-in study).
2. **On still water it pays:** crouched, 10° more by 1.0 s for the same speed, 99° 0.12 s sooner. It also passes two pinned tests (the hard turn, and Compress mid-turn at 11 m/s).
3. **It costs a rail change and the held rider's settling**, the same family of tests every quicker lean has broken, plus four drawn-body and HUD checks.
4. **On waves it changes nothing measurable.** The falls and the lost speed on waves come from the turn's drag and the wave catching a slowed rider (the body-lean study), not from how quickly the body leans in.
5. So **not built.** The recommendation is to close the bottom turn here. What is left is the wave's energy (a steeper, peeling practice face; the wave sessions) or accepting a physics that is right.

The model is a scratchpad folder (`leanmodel/`: `model.py`, `design.py`). The experiment is `braking-curve-experiment.patch`, with a `LEAN_CURVE=A,near` environment switch, and the deep U probe is `zz-lean-in.test.ts`.
