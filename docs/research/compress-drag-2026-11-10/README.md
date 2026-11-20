# Where the crouched turn's drag goes (2026-11-10)

A measurement, flat water, no shipped source changed. Compress held, `CARVE_CARRY` forced to 0, leg drive off.

## Result

**The 0.6 g is two things: the hull running nose-high (about half) and the rider's legs counted as dragging in the water (about 40 %).**
Numbers for entry 7.5 m/s, full stick, mean of the three steps from 1.0 to 1.4 s (72° to 111° of the turn), measured:

| Source | Drag, g | Share |
|---|---|---|
| Hull bottom pressure (the planing lift's backward part) | 0.27 | 49 % |
| Rider's legs in the water | 0.22 | 41 % |
| Hull friction, bottom | 0.022 | 4 % |
| Hull friction, deck (the deck is counted wet) | 0.020 | 4 % |
| Fins, all three (almost all profile drag) | 0.006 | 1 % |
| Hands | 0.003 | 0.5 % |
| Rails, wave-making, rule forces | under 0.002 | 0 |
| **Total measured** | **0.54** (peak step 0.59) | |

- The ledger closes. The sum of all the sources equals the measured loss of the system's momentum along the path to three decimals in every step. Nothing is left over.
- **The flat-water row reproduces**: stick on at 7.36 m/s, 90° at 4.38 m/s (the carve-carry README has 4.4 to 4.5).
- **Crouch against standing**: the hull pays the same for the same turning force. The crouch's extra cost is the legs term only. Standing, the legs stay dry until the turn has almost died.
- **Game hull against a clean plane** (my calculation): at the angle the game's hull runs, Savitsky's plate costs about the same (0.24 against 0.29 g). At its best trim the plate costs half (0.11 to 0.14 g). The game's hull runs at 11° to 18° to the flow. The plate's best is about 4°.
- **Largest avoidable term: the legs.** 0.13 to 0.28 g at 7.5 m/s, up to 0.32 g at 6 m/s. It has no physical cause. The banked board sits 0.1 to 0.3 m under the still-water level on its inside, and the game judges "wet" against that still level, so the deck and the lower legs count as under water. A planing board at these speeds leaves an open hollow; a surfer in a hard turn does not drag the knees.
- **Second: the nose-high hull.** 0.15 to 0.20 g above the best-trim plate. It has a physical cause (weight behind the middle, the speed falling), and a real surfer answers it by moving weight forward.
- **What-ifs** (scratch only): legs and deck kept dry while planing lifts the speed kept at 90° from 0.59 to 0.72. Weight forward alone makes it worse (the front leg goes in). Both together give 0.74. **No run completes 180°. Every run still ends in a fall**, as the board runs out of speed on flat water.

## Set-up

- Probe: `ledger.test.ts.txt` (scripted rider on `PlaneWater`, depth 3 m). 0.2 s to settle, then the stick held. Steps of 0.2 s from stick-on.
- Scratch edits: `scratch-ledger.diff.txt`. Counters only, plus the `CARRY` override and the two what-if switches. Reverted before the commit.
- 24 arcs in all: 4 Compress, 4 standing, 16 what-if.
- Rider and board: 75.5 kg. "g" means force / (75.5 kg × 9.81).
- "Along the path" is the level direction of the system's mean velocity in each physics step. "Turning" is level and square to it, toward the turn's centre.
- Measured: every force, state and speed in the tables. Calculated: the plate comparison. My reading: the causes named in "What the numbers say".

## All runs

Measured. "Kept" is board speed over the speed at stick-on.

| Run | Entry | Stick | Speed at stick-on | Kept at 90° | Kept at 120° | 180° done? | End |
|---|---|---|---|---|---|---|---|
| Compress | 6 | 0.5 | 5.90 | 0.40 (2.36 m/s, 1.35 s) | — | no, 96° | fall |
| Compress | 6 | 1 | 5.90 | 0.48 (2.81 m/s, 1.08 s) | — | no, 111° | fall |
| Compress | 7.5 | 0.5 | 7.36 | 0.60 (4.45 m/s, 1.57 s) | 0.39 | no, 135° | fall |
| Compress | 7.5 | 1 | 7.36 | 0.59 (4.38 m/s, 1.18 s) | 0.31 | no, 147° | fall |
| Standing | 6 | 0.5 | 5.88 | 0.38 (2.24 m/s, 1.72 s) | — | no, 92° | fall |
| Standing | 6 | 1 | 5.88 | 0.48 (2.85 m/s, 1.47 s) | — | no, 108° | fall |
| Standing | 7.5 | 0.5 | 7.32 | 0.48 (3.51 m/s, 2.00 s) | 0.29 | no, 122° | fall |
| Standing | 7.5 | 1 | 7.32 | 0.63 (4.61 m/s, 1.42 s) | 0.39 | no, 137° | fall |

## Which forces have a reaction

| Force | In the ledger as | Reaction? | Size along the path |
|---|---|---|---|
| Hull pressure, friction, buoyancy, wave-making, rails | hull columns | Yes, the water | see tables |
| Fins | fin columns | Yes, the water | under 0.015 g |
| Rider's parts in the water (legs, hands, body) | legs, hands, rest of body | Yes, the water | up to 0.32 g |
| `COMPRESS_PULL` (0.5) | rule forces | **No.** A level push on the body toward the turn's centre | 0 along the path (−0.03 to +0.02 g); **0.25 to 0.30 g of the turning** for the first 0.8 s, then 0 |
| `CARVE_CARRY` | rule forces | No | forced to 0 here |
| `LEAN_OUT_PULL` | rule forces | No | 0 in every step (the body never leans against the stick) |
| Leg drive | — | Yes | off |

Work ledgers agree with the force ledger. To 90° at 7.5 m/s, full stick, Compress: hull pressure −945 J, hull friction −369 J (both faces), rider in the water −267 J, fins −73 J, wave-making −14 J, rails −11 J, `COMPRESS_PULL` +40 J.

## Ledger and state, Compress

Measured. Rows stop when the board drops off the plane or the rider is going in; every step of every run is in `results.txt`.
Columns: "rails + waves" is rails, radiation, added mass and buoyancy along the path. "Not explained" is measured minus the sum.
"Deck at rear foot" and "inside rail" are heights against the still-water level (negative = below). "Pressure centre" and "body behind mid" are along the board from mid-length.
"Load" is the feet's push on the deck in body weights. "Fin slip" is each fin's angle of attack.
### compress: compress 6 0.5 (stick on at 5.9 m/s; 90°: 2.36 m/s (0.399) at 1.35 s; 120°: not reached; 180°: not reached; ends fall (lost board) at 96°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 2° | **0.124** | 0.073 | 0.034 | 0.020 | 0.002 | 0.008 | -0.000 | -0.000 | 0.000 | 0.000 | -0.012 | -0.000 |
| 0.4 | 10° | **0.198** | 0.143 | 0.028 | 0.022 | 0.000 | 0.007 | -0.000 | -0.000 | 0.000 | 0.001 | -0.003 | -0.000 |
| 0.6 | 24° | **0.249** | 0.193 | 0.025 | 0.021 | -0.002 | 0.006 | 0.000 | -0.000 | 0.000 | 0.001 | 0.004 | -0.000 |
| 0.8 | 38° | **0.274** | 0.200 | 0.020 | 0.018 | -0.001 | 0.005 | 0.027 | -0.000 | 0.000 | 0.001 | 0.004 | -0.000 |
| 1.0 | 58° | **0.305** | 0.173 | 0.018 | 0.015 | -0.002 | 0.004 | 0.088 | 0.000 | -0.000 | 0.001 | 0.008 | -0.000 |
| 1.2 | 78° | **0.398** | 0.187 | 0.013 | 0.012 | -0.001 | 0.003 | 0.178 | 0.003 | -0.000 | 0.000 | 0.004 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 5.77 | 0.19 | 0.03 | 0.00 | 0.16 | 15 | 3° | 2° | 5.5° | 6.4° | 0.97 | 0.66 | 0.21 | -0.03 | 1.19 | 0.45 | 0.27 | -0.02 | -0.03 | 0.72 | +3° / -3° / +0° |
| 0.4 | 5.56 | 0.42 | 0.20 | 0.01 | 0.22 | 59 | 10° | 13° | 10.4° | 10.1° | 1.24 | 0.67 | 0.17 | -0.10 | 1.22 | 0.42 | 0.32 | -0.08 | -0.09 | 0.56 | +3° / -3° / -1° |
| 0.6 | 5.19 | 0.54 | 0.30 | 0.02 | 0.23 | 73 | 15° | 19° | 12.5° | 12.4° | 1.21 | 0.68 | 0.16 | -0.10 | 1.33 | 0.43 | 0.37 | -0.13 | -0.14 | 0.47 | +2° / -4° / -3° |
| 0.8 | 4.70 | 0.53 | 0.34 | 0.01 | 0.19 | 69 | 19° | 25° | 14.9° | 13.5° | 1.09 | 0.69 | 0.14 | -0.11 | 1.33 | 0.43 | 0.38 | -0.17 | -0.17 | 0.43 | +3° / -3° / -2° |
| 1.0 | 4.27 | 0.51 | 0.37 | 0.01 | 0.14 | 96 | 21° | 34° | 15.2° | 13.4° | 1.02 | 0.66 | 0.14 | -0.12 | 1.38 | 0.44 | 0.39 | -0.19 | -0.21 | 0.40 | +3° / -3° / -4° |
| 1.2 | 3.56 | 0.37 | 0.33 | 0.02 | 0.04 | 102 | 22° | 37° | 15.6° | 16.2° | 0.96 | 0.63 | 0.14 | -0.14 | 1.48 | 0.48 | 0.44 | -0.23 | -0.25 | 0.37 | +1° / -5° / -6° |

Work from stick-on to 90°, J: hull pressure -782, hull friction -191, fins -31, rails -7, wave-making -36, rider in the water -221, COMPRESS_PULL 1, carry 0; kinetic energy -1142, height -358.

### compress: compress 6 1 (stick on at 5.9 m/s; 90°: 2.81 m/s (0.476) at 1.08 s; 120°: not reached; 180°: not reached; ends fall (balance) at 111°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 3° | **0.111** | 0.072 | 0.034 | 0.019 | 0.002 | 0.008 | -0.000 | -0.000 | 0.000 | 0.000 | -0.024 | -0.000 |
| 0.4 | 13° | **0.161** | 0.109 | 0.029 | 0.022 | 0.001 | 0.008 | -0.000 | -0.000 | 0.000 | 0.003 | -0.011 | -0.000 |
| 0.6 | 36° | **0.213** | 0.131 | 0.030 | 0.025 | -0.004 | 0.007 | 0.011 | -0.000 | 0.000 | 0.002 | 0.009 | -0.000 |
| 0.8 | 60° | **0.427** | 0.177 | 0.026 | 0.023 | -0.002 | 0.006 | 0.175 | 0.003 | 0.000 | 0.001 | 0.018 | -0.000 |
| 1.0 | 83° | **0.568** | 0.195 | 0.017 | 0.016 | -0.000 | 0.004 | 0.322 | 0.005 | 0.000 | 0.001 | 0.008 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 5.76 | 0.26 | 0.03 | 0.01 | 0.22 | 18 | 3° | 3° | 5.5° | 6.4° | 0.96 | 0.67 | 0.21 | -0.03 | 1.19 | 0.45 | 0.26 | -0.02 | -0.03 | 0.72 | +3° / -3° / +0° |
| 0.4 | 5.71 | 0.60 | 0.26 | -0.00 | 0.35 | 79 | 14° | 19° | 10.3° | 8.7° | 1.20 | 0.66 | 0.17 | -0.11 | 1.27 | 0.41 | 0.32 | -0.08 | -0.11 | 0.56 | +4° / -2° / -1° |
| 0.6 | 5.61 | 0.81 | 0.45 | 0.03 | 0.35 | 118 | 22° | 33° | 10.7° | 9.3° | 1.19 | 0.65 | 0.18 | -0.11 | 1.44 | 0.44 | 0.38 | -0.12 | -0.19 | 0.45 | +2° / -3° / -4° |
| 0.8 | 5.04 | 0.80 | 0.50 | 0.02 | 0.29 | 118 | 27° | 39° | 12.4° | 11.1° | 1.12 | 0.65 | 0.17 | -0.13 | 1.48 | 0.47 | 0.43 | -0.18 | -0.24 | 0.38 | +3° / -3° / -3° |
| 1.0 | 3.99 | 0.47 | 0.41 | 0.01 | 0.08 | 115 | 28° | 43° | 14.7° | 14.1° | 0.97 | 0.62 | 0.15 | -0.15 | 1.48 | 0.49 | 0.46 | -0.23 | -0.29 | 0.34 | +4° / -3° / -3° |

Work from stick-on to 90°, J: hull pressure -603, hull friction -198, fins -33, rails -11, wave-making -39, rider in the water -356, COMPRESS_PULL 6, carry 0; kinetic energy -1086, height -370.

### compress: compress 7.5 0.5 (stick on at 7.36 m/s; 90°: 4.45 m/s (0.605) at 1.57 s; 120°: 2.87 m/s (0.39) at 1.87 s; 180°: not reached; ends fall (lost board) at 135°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 2° | **0.161** | 0.086 | 0.046 | 0.023 | 0.002 | 0.012 | -0.000 | -0.000 | 0.000 | 0.000 | -0.009 | -0.000 |
| 0.4 | 8° | **0.214** | 0.139 | 0.039 | 0.026 | 0.001 | 0.011 | -0.000 | -0.000 | 0.000 | 0.001 | -0.003 | -0.000 |
| 0.6 | 17° | **0.227** | 0.156 | 0.035 | 0.025 | 0.000 | 0.010 | -0.000 | -0.000 | 0.000 | 0.000 | -0.001 | -0.000 |
| 0.8 | 28° | **0.211** | 0.145 | 0.030 | 0.024 | 0.000 | 0.009 | -0.000 | -0.000 | 0.000 | 0.001 | 0.002 | -0.000 |
| 1.0 | 42° | **0.204** | 0.140 | 0.029 | 0.022 | -0.001 | 0.008 | -0.000 | -0.000 | 0.000 | 0.001 | 0.006 | -0.000 |
| 1.2 | 56° | **0.214** | 0.153 | 0.026 | 0.021 | -0.001 | 0.007 | -0.000 | -0.000 | 0.000 | 0.001 | 0.008 | -0.000 |
| 1.4 | 73° | **0.220** | 0.158 | 0.023 | 0.019 | -0.001 | 0.006 | 0.003 | -0.000 | 0.000 | 0.001 | 0.012 | -0.000 |
| 1.6 | 94° | **0.313** | 0.180 | 0.021 | 0.018 | -0.002 | 0.005 | 0.075 | 0.000 | 0.000 | 0.001 | 0.015 | -0.000 |
| 1.8 | 114° | **0.467** | 0.213 | 0.015 | 0.014 | -0.000 | 0.003 | 0.213 | 0.004 | -0.000 | 0.000 | 0.006 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 7.19 | 0.20 | 0.03 | 0.00 | 0.16 | 15 | 3° | 2° | 5.4° | 5.6° | 1.01 | 0.70 | 0.21 | -0.06 | 1.19 | 0.41 | 0.21 | -0.01 | -0.02 | 0.73 | +3° / -3° / +0° |
| 0.4 | 6.89 | 0.41 | 0.18 | 0.01 | 0.22 | 46 | 10° | 11° | 8.4° | 8.2° | 1.24 | 0.68 | 0.19 | -0.11 | 1.19 | 0.38 | 0.26 | -0.04 | -0.05 | 0.59 | +3° / -3° / -1° |
| 0.6 | 6.50 | 0.49 | 0.26 | 0.02 | 0.23 | 48 | 15° | 16° | 9.5° | 9.0° | 1.19 | 0.67 | 0.19 | -0.11 | 1.19 | 0.38 | 0.27 | -0.06 | -0.08 | 0.52 | +3° / -3° / -1° |
| 0.8 | 6.11 | 0.52 | 0.30 | 0.01 | 0.23 | 53 | 19° | 21° | 10.3° | 9.2° | 1.07 | 0.67 | 0.18 | -0.12 | 1.25 | 0.38 | 0.29 | -0.07 | -0.10 | 0.51 | +3° / -3° / -1° |
| 1.0 | 5.78 | 0.58 | 0.33 | 0.03 | 0.23 | 68 | 21° | 25° | 10.0° | 9.2° | 1.05 | 0.66 | 0.18 | -0.11 | 1.33 | 0.40 | 0.30 | -0.07 | -0.12 | 0.49 | +2° / -4° / -3° |
| 1.2 | 5.40 | 0.61 | 0.38 | 0.02 | 0.23 | 71 | 23° | 29° | 11.0° | 10.2° | 1.07 | 0.66 | 0.18 | -0.12 | 1.33 | 0.41 | 0.33 | -0.10 | -0.15 | 0.47 | +2° / -4° / -3° |
| 1.4 | 5.05 | 0.65 | 0.42 | 0.02 | 0.22 | 85 | 24° | 34° | 11.7° | 11.0° | 1.06 | 0.65 | 0.17 | -0.13 | 1.38 | 0.42 | 0.35 | -0.12 | -0.18 | 0.44 | +2° / -3° / -3° |
| 1.6 | 4.62 | 0.63 | 0.44 | 0.03 | 0.18 | 105 | 25° | 39° | 12.5° | 12.2° | 1.05 | 0.64 | 0.17 | -0.14 | 1.48 | 0.45 | 0.40 | -0.16 | -0.23 | 0.40 | +2° / -4° / -4° |
| 1.8 | 3.78 | 0.44 | 0.39 | 0.02 | 0.05 | 102 | 25° | 41° | 14.7° | 16.2° | 1.00 | 0.63 | 0.15 | -0.15 | 1.48 | 0.48 | 0.44 | -0.22 | -0.27 | 0.36 | +2° / -4° / -5° |

Work from stick-on to 90°, J: hull pressure -1010, hull friction -385, fins -74, rails -7, wave-making -14, rider in the water -35, COMPRESS_PULL -16, carry 0; kinetic energy -1449, height -306.

### compress: compress 7.5 1 (stick on at 7.36 m/s; 90°: 4.38 m/s (0.595) at 1.18 s; 120°: 2.29 m/s (0.312) at 1.52 s; 180°: not reached; ends fall (balance) at 147°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 3° | **0.142** | 0.084 | 0.046 | 0.023 | 0.003 | 0.012 | -0.000 | -0.000 | 0.000 | 0.000 | -0.026 | -0.000 |
| 0.4 | 10° | **0.162** | 0.098 | 0.039 | 0.026 | 0.002 | 0.012 | -0.000 | -0.000 | 0.000 | 0.002 | -0.016 | -0.000 |
| 0.6 | 28° | **0.186** | 0.107 | 0.039 | 0.030 | -0.003 | 0.012 | -0.000 | -0.000 | 0.000 | 0.002 | -0.001 | -0.000 |
| 0.8 | 50° | **0.276** | 0.178 | 0.039 | 0.032 | -0.002 | 0.011 | 0.011 | -0.000 | 0.000 | 0.001 | 0.007 | -0.000 |
| 1.0 | 72° | **0.465** | 0.263 | 0.032 | 0.028 | -0.001 | 0.009 | 0.133 | 0.000 | 0.000 | 0.001 | 0.001 | -0.000 |
| 1.2 | 92° | **0.591** | 0.285 | 0.022 | 0.020 | 0.000 | 0.006 | 0.254 | 0.005 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.4 | 111° | **0.566** | 0.251 | 0.012 | 0.012 | 0.000 | 0.003 | 0.284 | 0.004 | -0.000 | -0.000 | -0.000 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 7.18 | 0.31 | 0.04 | 0.01 | 0.25 | 18 | 4° | 3° | 5.5° | 5.6° | 0.99 | 0.70 | 0.21 | -0.07 | 1.19 | 0.40 | 0.21 | -0.01 | -0.02 | 0.73 | +3° / -3° / +0° |
| 0.4 | 7.09 | 0.56 | 0.28 | -0.00 | 0.30 | 65 | 17° | 19° | 8.4° | 7.0° | 1.18 | 0.67 | 0.19 | -0.12 | 1.23 | 0.36 | 0.25 | -0.04 | -0.08 | 0.58 | +4° / -2° / -1° |
| 0.6 | 7.00 | 0.79 | 0.48 | 0.04 | 0.28 | 92 | 28° | 32° | 7.9° | 7.1° | 1.20 | 0.65 | 0.21 | -0.11 | 1.41 | 0.39 | 0.30 | -0.06 | -0.15 | 0.48 | +2° / -4° / -3° |
| 0.8 | 6.73 | 0.93 | 0.69 | 0.03 | 0.23 | 109 | 35° | 42° | 9.4° | 8.4° | 1.27 | 0.65 | 0.20 | -0.14 | 1.48 | 0.41 | 0.34 | -0.10 | -0.20 | 0.41 | +2° / -4° / -3° |
| 1.0 | 6.01 | 0.80 | 0.77 | 0.02 | 0.03 | 109 | 38° | 47° | 10.9° | 11.2° | 1.31 | 0.64 | 0.19 | -0.16 | 1.48 | 0.42 | 0.38 | -0.13 | -0.23 | 0.36 | +2° / -4° / -3° |
| 1.2 | 4.86 | 0.63 | 0.65 | 0.01 | 0.00 | 103 | 38° | 49° | 12.4° | 14.1° | 1.18 | 0.62 | 0.18 | -0.17 | 1.48 | 0.44 | 0.40 | -0.17 | -0.26 | 0.33 | +3° / -3° / -2° |
| 1.4 | 3.55 | 0.38 | 0.42 | -0.00 | 0.00 | 93 | 35° | 48° | 14.9° | 17.8° | 0.95 | 0.59 | 0.16 | -0.17 | 1.48 | 0.47 | 0.44 | -0.23 | -0.29 | 0.31 | +4° / -2° / -2° |

Work from stick-on to 90°, J: hull pressure -945, hull friction -369, fins -73, rails -11, wave-making -19, rider in the water -267, COMPRESS_PULL 40, carry 0; kinetic energy -1493, height -355.


## Ledger and state, standing (no Compress, no carry)

Measured, same columns.
### stand: stand 6 0.5 (stick on at 5.88 m/s; 90°: 2.24 m/s (0.38) at 1.72 s; 120°: not reached; 180°: not reached; ends fall (balance) at 92°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 4° | **0.167** | 0.100 | 0.034 | 0.024 | 0.001 | 0.008 | -0.000 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |
| 0.4 | 0° | **0.220** | 0.162 | 0.027 | 0.022 | 0.002 | 0.007 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 0.6 | 9° | **0.191** | 0.141 | 0.025 | 0.021 | -0.001 | 0.006 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 0.8 | 20° | **0.184** | 0.138 | 0.023 | 0.019 | -0.002 | 0.005 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.0 | 34° | **0.213** | 0.172 | 0.021 | 0.018 | -0.002 | 0.005 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.2 | 49° | **0.237** | 0.201 | 0.017 | 0.016 | -0.001 | 0.004 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.4 | 67° | **0.257** | 0.226 | 0.015 | 0.014 | -0.000 | 0.003 | -0.000 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |
| 1.6 | 83° | **0.267** | 0.234 | 0.010 | 0.009 | 0.000 | 0.002 | 0.012 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 5.70 | 0.05 | 0.03 | 0.01 | 0.00 | 23 | 3° | 2° | 6.6° | 7.8° | 1.04 | 0.72 | 0.18 | -0.03 | 1.19 | 0.46 | 0.33 | -0.05 | -0.04 | 0.83 | +2° / -4° / +0° |
| 0.4 | 5.35 | 0.17 | 0.18 | -0.01 | 0.00 | 22 | 10° | 11° | 11.1° | 10.9° | 1.08 | 0.80 | 0.11 | -0.06 | 1.23 | 0.43 | 0.35 | -0.10 | -0.09 | 0.79 | +4° / -2° / -0° |
| 0.6 | 5.08 | 0.26 | 0.24 | 0.02 | 0.00 | 47 | 15° | 19° | 10.9° | 10.6° | 1.04 | 0.76 | 0.12 | -0.04 | 1.33 | 0.43 | 0.36 | -0.11 | -0.13 | 0.76 | +2° / -4° / -2° |
| 0.8 | 4.81 | 0.32 | 0.30 | 0.03 | 0.00 | 55 | 19° | 25° | 11.0° | 10.9° | 1.04 | 0.74 | 0.12 | -0.05 | 1.37 | 0.45 | 0.38 | -0.12 | -0.16 | 0.74 | +1° / -4° / -3° |
| 1.0 | 4.53 | 0.38 | 0.36 | 0.04 | 0.00 | 71 | 21° | 30° | 11.8° | 12.6° | 1.07 | 0.73 | 0.11 | -0.06 | 1.48 | 0.47 | 0.40 | -0.15 | -0.20 | 0.70 | +1° / -5° / -5° |
| 1.2 | 4.12 | 0.40 | 0.38 | 0.03 | 0.00 | 76 | 23° | 35° | 13.5° | 14.7° | 1.07 | 0.73 | 0.09 | -0.07 | 1.48 | 0.48 | 0.44 | -0.20 | -0.24 | 0.66 | +1° / -5° / -4° |
| 1.4 | 3.68 | 0.37 | 0.36 | 0.02 | 0.00 | 90 | 23° | 38° | 15.1° | 17.1° | 1.04 | 0.72 | 0.07 | -0.08 | 1.48 | 0.51 | 0.47 | -0.25 | -0.28 | 0.61 | +1° / -4° / -5° |
| 1.6 | 3.02 | 0.27 | 0.28 | 0.01 | 0.00 | 78 | 21° | 37° | 17.7° | 21.5° | 1.01 | 0.69 | 0.03 | -0.08 | 1.48 | 0.53 | 0.50 | -0.32 | -0.33 | 0.57 | +4° / -2° / -3° |

Work from stick-on to 90°, J: hull pressure -967, hull friction -228, fins -36, rails -5, wave-making -44, rider in the water -18, COMPRESS_PULL 0, carry 0; kinetic energy -1128, height -248.

### stand: stand 6 1 (stick on at 5.88 m/s; 90°: 2.85 m/s (0.485) at 1.47 s; 120°: not reached; 180°: not reached; ends fall (balance) at 108°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 6° | **0.165** | 0.099 | 0.033 | 0.024 | 0.001 | 0.008 | -0.000 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |
| 0.4 | 0° | **0.201** | 0.141 | 0.027 | 0.022 | 0.003 | 0.007 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 0.6 | 13° | **0.173** | 0.119 | 0.027 | 0.022 | -0.003 | 0.007 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 0.8 | 29° | **0.198** | 0.146 | 0.026 | 0.022 | -0.004 | 0.006 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 1.0 | 46° | **0.243** | 0.195 | 0.023 | 0.020 | -0.001 | 0.005 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.2 | 67° | **0.282** | 0.241 | 0.019 | 0.018 | -0.000 | 0.004 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.4 | 85° | **0.309** | 0.272 | 0.014 | 0.013 | 0.000 | 0.003 | 0.008 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 5.68 | 0.06 | 0.04 | 0.02 | 0.00 | 31 | 3° | 2° | 6.6° | 7.8° | 1.02 | 0.73 | 0.18 | -0.03 | 1.19 | 0.46 | 0.33 | -0.05 | -0.05 | 0.83 | +2° / -4° / +0° |
| 0.4 | 5.40 | 0.21 | 0.23 | -0.01 | 0.00 | 31 | 13° | 15° | 11.1° | 10.5° | 1.07 | 0.79 | 0.11 | -0.07 | 1.26 | 0.43 | 0.34 | -0.10 | -0.10 | 0.78 | +4° / -2° / +0° |
| 0.6 | 5.31 | 0.35 | 0.33 | 0.03 | 0.00 | 67 | 20° | 26° | 10.3° | 9.5° | 1.05 | 0.75 | 0.13 | -0.04 | 1.38 | 0.44 | 0.37 | -0.11 | -0.16 | 0.74 | +2° / -4° / -3° |
| 0.8 | 5.11 | 0.45 | 0.42 | 0.04 | 0.00 | 81 | 25° | 34° | 10.3° | 10.3° | 1.09 | 0.72 | 0.14 | -0.06 | 1.48 | 0.46 | 0.40 | -0.13 | -0.20 | 0.70 | +1° / -5° / -4° |
| 1.0 | 4.75 | 0.50 | 0.48 | 0.03 | 0.00 | 87 | 27° | 40° | 11.6° | 12.4° | 1.12 | 0.72 | 0.12 | -0.09 | 1.48 | 0.47 | 0.42 | -0.17 | -0.24 | 0.65 | +2° / -4° / -4° |
| 1.2 | 4.29 | 0.48 | 0.48 | 0.02 | 0.00 | 100 | 27° | 43° | 13.0° | 14.7° | 1.10 | 0.71 | 0.10 | -0.09 | 1.59 | 0.51 | 0.46 | -0.22 | -0.29 | 0.60 | +2° / -4° / -4° |
| 1.4 | 3.57 | 0.38 | 0.39 | 0.01 | 0.00 | 93 | 26° | 43° | 15.8° | 19.0° | 1.05 | 0.71 | 0.07 | -0.09 | 1.63 | 0.53 | 0.50 | -0.29 | -0.33 | 0.56 | +3° / -3° / -3° |

Work from stick-on to 90°, J: hull pressure -901, hull friction -237, fins -38, rails -8, wave-making -36, rider in the water -10, COMPRESS_PULL 0, carry 0; kinetic energy -1051, height -243.

### stand: stand 7.5 0.5 (stick on at 7.32 m/s; 90°: 3.51 m/s (0.479) at 2 s; 120°: 2.14 m/s (0.292) at 2.43 s; 180°: not reached; ends fall (balance) at 122°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 4° | **0.222** | 0.133 | 0.046 | 0.029 | 0.002 | 0.012 | -0.000 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |
| 0.4 | 0° | **0.211** | 0.134 | 0.038 | 0.026 | 0.002 | 0.010 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 0.6 | 6° | **0.152** | 0.085 | 0.035 | 0.022 | -0.000 | 0.010 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 0.8 | 13° | **0.168** | 0.103 | 0.034 | 0.023 | -0.000 | 0.009 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.0 | 22° | **0.193** | 0.130 | 0.031 | 0.025 | -0.000 | 0.008 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.2 | 33° | **0.218** | 0.159 | 0.029 | 0.023 | -0.001 | 0.007 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.4 | 43° | **0.242** | 0.190 | 0.025 | 0.021 | -0.000 | 0.006 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.6 | 58° | **0.244** | 0.199 | 0.022 | 0.019 | -0.001 | 0.005 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.8 | 73° | **0.251** | 0.212 | 0.018 | 0.017 | -0.001 | 0.004 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 2.0 | 91° | **0.268** | 0.235 | 0.015 | 0.014 | 0.000 | 0.003 | -0.000 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |
| 2.2 | 107° | **0.276** | 0.244 | 0.010 | 0.010 | 0.000 | 0.002 | 0.010 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 7.08 | 0.05 | 0.04 | 0.01 | 0.00 | 21 | 3° | 2° | 7.0° | 7.1° | 1.10 | 0.78 | 0.17 | -0.06 | 1.19 | 0.42 | 0.27 | -0.03 | -0.03 | 0.85 | +3° / -3° / +0° |
| 0.4 | 6.68 | 0.14 | 0.15 | -0.00 | 0.00 | 19 | 10° | 9° | 8.4° | 7.9° | 1.04 | 0.79 | 0.15 | -0.07 | 1.19 | 0.39 | 0.27 | -0.04 | -0.05 | 0.84 | +3° / -3° / -0° |
| 0.6 | 6.42 | 0.21 | 0.19 | 0.02 | 0.00 | 32 | 15° | 16° | 6.7° | 6.5° | 0.97 | 0.72 | 0.18 | -0.03 | 1.30 | 0.39 | 0.25 | -0.03 | -0.08 | 0.83 | +2° / -4° / -2° |
| 0.8 | 6.17 | 0.30 | 0.27 | 0.03 | 0.00 | 36 | 19° | 21° | 7.2° | 7.6° | 1.05 | 0.72 | 0.17 | -0.06 | 1.33 | 0.41 | 0.28 | -0.04 | -0.11 | 0.80 | +2° / -4° / -2° |
| 1.0 | 5.86 | 0.36 | 0.34 | 0.03 | 0.00 | 43 | 21° | 25° | 8.4° | 8.9° | 1.08 | 0.73 | 0.16 | -0.07 | 1.33 | 0.41 | 0.33 | -0.07 | -0.14 | 0.76 | +2° / -4° / -2° |
| 1.2 | 5.54 | 0.41 | 0.38 | 0.04 | 0.00 | 55 | 23° | 28° | 9.4° | 9.9° | 1.11 | 0.74 | 0.15 | -0.06 | 1.46 | 0.43 | 0.35 | -0.10 | -0.16 | 0.73 | +2° / -4° / -3° |
| 1.4 | 5.06 | 0.42 | 0.40 | 0.03 | 0.00 | 50 | 24° | 30° | 11.2° | 11.9° | 1.11 | 0.75 | 0.12 | -0.06 | 1.46 | 0.45 | 0.38 | -0.13 | -0.18 | 0.71 | +2° / -4° / -3° |
| 1.6 | 4.75 | 0.46 | 0.44 | 0.03 | 0.00 | 74 | 25° | 36° | 12.4° | 12.6° | 1.10 | 0.74 | 0.11 | -0.07 | 1.48 | 0.46 | 0.40 | -0.15 | -0.21 | 0.68 | +2° / -4° / -4° |
| 1.8 | 4.27 | 0.44 | 0.42 | 0.03 | 0.00 | 78 | 25° | 37° | 12.7° | 14.4° | 1.08 | 0.72 | 0.10 | -0.08 | 1.48 | 0.47 | 0.44 | -0.19 | -0.24 | 0.65 | +1° / -5° / -5° |
| 2.0 | 3.80 | 0.40 | 0.39 | 0.02 | 0.00 | 90 | 25° | 40° | 14.4° | 16.6° | 1.05 | 0.71 | 0.08 | -0.08 | 1.48 | 0.51 | 0.47 | -0.24 | -0.29 | 0.61 | +2° / -4° / -5° |
| 2.2 | 3.12 | 0.30 | 0.31 | 0.00 | 0.00 | 79 | 23° | 39° | 17.2° | 21.0° | 1.01 | 0.69 | 0.04 | -0.09 | 1.48 | 0.53 | 0.50 | -0.31 | -0.33 | 0.56 | +4° / -2° / -3° |

Work from stick-on to 90°, J: hull pressure -1261, hull friction -446, fins -81, rails -5, wave-making -21, rider in the water 0, COMPRESS_PULL 0, carry 0; kinetic energy -1666, height -197.

### stand: stand 7.5 1 (stick on at 7.32 m/s; 90°: 4.61 m/s (0.63) at 1.42 s; 120°: 2.83 m/s (0.387) at 1.83 s; 180°: not reached; ends fall (balance) at 137°)

Drag along the path, g:

| t, s | turned | total | hull pressure | bottom friction | deck friction | fins, induced | fins, profile | legs | hands | rest of body | rails + waves | rule forces | not explained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 7° | **0.218** | 0.130 | 0.046 | 0.029 | 0.002 | 0.012 | -0.000 | -0.000 | 0.000 | -0.000 | -0.000 | -0.000 |
| 0.4 | 3° | **0.178** | 0.101 | 0.035 | 0.025 | 0.005 | 0.010 | -0.000 | -0.000 | 0.000 | 0.002 | -0.000 | -0.000 |
| 0.6 | 10° | **0.124** | 0.056 | 0.035 | 0.024 | -0.004 | 0.011 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 0.8 | 27° | **0.199** | 0.121 | 0.038 | 0.031 | -0.002 | 0.011 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 1.0 | 46° | **0.289** | 0.207 | 0.038 | 0.033 | -0.000 | 0.010 | -0.000 | -0.000 | 0.000 | 0.001 | -0.000 | -0.000 |
| 1.2 | 68° | **0.366** | 0.291 | 0.034 | 0.031 | 0.000 | 0.008 | -0.000 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.4 | 89° | **0.390** | 0.328 | 0.027 | 0.024 | 0.001 | 0.006 | 0.004 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.6 | 107° | **0.430** | 0.336 | 0.018 | 0.017 | -0.001 | 0.004 | 0.055 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |
| 1.8 | 119° | **0.366** | 0.211 | 0.011 | 0.011 | -0.006 | 0.002 | 0.137 | -0.000 | 0.000 | 0.000 | -0.000 | -0.000 |

Turning force (toward the centre), g, and the state:

| t, s | speed | turning, total | by hull | by fins | by COMPRESS_PULL | yaw rate, °/s | body bank | rail (board roll) | trim (nose up) | attack to the path | load, bw | front-foot share | body behind mid, m | pressure centre, m | wetted length, m | wetted bottom, m² | wetted deck, m² | deck at rear foot, m | inside rail, m | pelvis above water, m | fin slip L / R / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 7.05 | 0.08 | 0.05 | 0.02 | 0.00 | 34 | 4° | 3° | 7.0° | 7.1° | 1.06 | 0.79 | 0.17 | -0.07 | 1.19 | 0.42 | 0.27 | -0.03 | -0.03 | 0.85 | +2° / -4° / +0° |
| 0.4 | 6.73 | 0.20 | 0.22 | -0.02 | 0.00 | 25 | 16° | 16° | 8.7° | 7.5° | 0.97 | 0.79 | 0.15 | -0.07 | 1.22 | 0.36 | 0.25 | -0.04 | -0.07 | 0.82 | +4° / -2° / +0° |
| 0.6 | 6.84 | 0.38 | 0.34 | 0.04 | 0.00 | 65 | 27° | 31° | 6.3° | 5.7° | 0.98 | 0.71 | 0.19 | -0.04 | 1.41 | 0.36 | 0.25 | -0.03 | -0.13 | 0.76 | +2° / -4° / -3° |
| 0.8 | 6.78 | 0.63 | 0.60 | 0.04 | 0.00 | 82 | 34° | 41° | 6.7° | 7.6° | 1.21 | 0.70 | 0.19 | -0.09 | 1.48 | 0.40 | 0.32 | -0.06 | -0.19 | 0.68 | +2° / -4° / -3° |
| 1.0 | 6.51 | 0.78 | 0.78 | 0.02 | 0.00 | 99 | 38° | 48° | 8.4° | 9.2° | 1.32 | 0.71 | 0.18 | -0.11 | 1.59 | 0.44 | 0.38 | -0.11 | -0.24 | 0.60 | +3° / -3° / -2° |
| 1.2 | 5.94 | 0.80 | 0.81 | 0.01 | 0.00 | 108 | 40° | 50° | 9.9° | 11.3° | 1.35 | 0.71 | 0.16 | -0.11 | 1.63 | 0.48 | 0.43 | -0.16 | -0.28 | 0.54 | +3° / -3° / -2° |
| 1.4 | 5.09 | 0.67 | 0.70 | -0.01 | 0.00 | 102 | 40° | 50° | 12.6° | 13.7° | 1.25 | 0.71 | 0.13 | -0.10 | 1.63 | 0.50 | 0.46 | -0.22 | -0.30 | 0.50 | +4° / -2° / -1° |
| 1.6 | 4.22 | 0.59 | 0.60 | 0.01 | 0.00 | 92 | 39° | 50° | 15.2° | 18.0° | 1.05 | 0.78 | 0.10 | -0.08 | 1.63 | 0.52 | 0.47 | -0.27 | -0.33 | 0.47 | +2° / -4° / -3° |
| 1.8 | 3.35 | 0.58 | 0.54 | 0.02 | 0.00 | 59 | 50° | 55° | 17.0° | 22.2° | 0.79 | 0.75 | 0.12 | -0.09 | 1.52 | 0.49 | 0.46 | -0.28 | -0.33 | 0.35 | -1° / -7° / -6° |

Work from stick-on to 90°, J: hull pressure -1150, hull friction -440, fins -82, rails -10, wave-making -23, rider in the water -4, COMPRESS_PULL 0, carry 0; kinetic energy -1478, height -270.

## Crouch against standing

Entry 7.5 m/s, full stick, measured.

| | Compress | Standing |
|---|---|---|
| Time to 90° | 1.18 s | 1.42 s |
| Speed kept at 90° | 0.59 | 0.63 |
| Peak turning force | 0.93 g at 0.8 s (0.69 hull + 0.23 `COMPRESS_PULL`) | 0.80 g at 1.2 s (all hull) |
| Hull pressure drag at about 0.78 g of hull turning | 0.26 g (1.0 s, attack 11.2°) | 0.21 to 0.29 g (1.0 to 1.2 s, attack 9.2° to 11.3°) |
| Legs' drag at that point | 0.13 g, rising to 0.28 g | 0 |
| Peak total drag | 0.59 g | 0.43 g (late, 107°) |
| Pelvis above the water at that point | 0.36 m | 0.60 m |
| Front-foot share | 0.64 | 0.71 |

- The hull term is the same in both stances for the same turning force.
- The crouch costs more through one term: the legs. The body is 0.25 m lower, the knees are folded down toward the deck, and the deck is 0.1 to 0.2 m under the still-water level.
- Standing, the legs' drag starts only at 1.6 s (107°), when the deck is 0.27 m under.
- The crouch turns faster early because `COMPRESS_PULL` adds 0.25 to 0.30 g of turning with no reaction and no drag.
- At 6 m/s the crouch's legs go in sooner (0.8 s) and reach 0.32 g, more than the hull's 0.20 g.

## Clean-plane reference (my calculation, not a measurement)

Savitsky's flat plate (1964), no deadrise:

- `C_L0 = τ^1.1 (0.012 λ^0.5 + 0.0055 λ^2.5 / C_V²)`, τ in degrees, λ = wetted length / beam, `C_V = V / √(g b)`.
- Lift = `½ ρ V² b² C_L0`. Drag = lift × tan τ + friction, friction = `½ ρ V² (λ b² / cos τ) C_f`, `C_f = 0.075 / (log10 Re − 2)²` (ITTC 1957).
- Beam b = 0.464 m (the board's widest). λ held to the board's length (1.778 m, λ ≤ 3.83). ρ = 1025, ν = 1.19e-6.
- For each step: the lift is the whole force the game's bottom pressure carries, the speed is the board's. "Best trim" is the τ with the least drag.
- Script `savitsky.py.txt`, all runs in `savitsky-results.txt`.

**compress 7.5 1**

| t, s | speed | load on the bottom, bw | game: attack | game: pressure drag + bottom friction, g | game lift/drag | plate, best trim | its wetted length / beam | plate drag (induced + friction), g | plate lift/drag | plate at the game's attack, g |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 7.18 | 0.81 | 5.6° | 0.084 + 0.046 = **0.130** | 6.2 | 4.2° | 2.25 | 0.059 + 0.056 = **0.116** | 7.0 | 0.119 |
| 0.4 | 7.09 | 0.87 | 7.0° | 0.098 + 0.039 = **0.136** | 6.4 | 3.9° | 2.75 | 0.060 + 0.065 = **0.124** | 7.0 | 0.140 |
| 0.6 | 7.00 | 0.92 | 7.1° | 0.107 + 0.039 = **0.147** | 6.3 | 3.6° | 3.20 | 0.058 + 0.072 = **0.129** | 7.1 | 0.148 |
| 0.8 | 6.73 | 1.05 | 8.4° | 0.178 + 0.039 = **0.217** | 4.9 | 3.6° | 3.74 | 0.066 + 0.076 = **0.142** | 7.4 | 0.189 |
| 1.0 | 6.01 | 1.10 | 11.2° | 0.263 + 0.032 = **0.294** | 3.7 | 4.1° | 3.83 | 0.079 + 0.063 = **0.142** | 7.8 | 0.243 |
| 1.2 | 4.86 | 0.93 | 14.1° | 0.285 + 0.022 = **0.307** | 3.0 | 4.3° | 3.79 | 0.070 + 0.043 = **0.112** | 8.3 | 0.249 |
| 1.4 | 3.55 | 0.65 | 17.8° | 0.251 + 0.012 = **0.264** | 2.5 | 3.8° | 3.80 | 0.043 + 0.024 = **0.067** | 9.7 | 0.216 |

**stand 7.5 1**

| t, s | speed | load on the bottom, bw | game: attack | game: pressure drag + bottom friction, g | game lift/drag | plate, best trim | its wetted length / beam | plate drag (induced + friction), g | plate lift/drag | plate at the game's attack, g |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 7.05 | 1.00 | 7.1° | 0.130 + 0.046 = **0.176** | 5.6 | 3.5° | 3.49 | 0.061 + 0.078 = **0.139** | 7.2 | 0.162 |
| 0.4 | 6.73 | 0.82 | 7.5° | 0.101 + 0.035 = **0.136** | 6.0 | 3.7° | 2.95 | 0.053 + 0.063 = **0.116** | 7.1 | 0.136 |
| 0.6 | 6.84 | 0.66 | 5.7° | 0.056 + 0.035 = **0.092** | 7.2 | 4.4° | 1.84 | 0.051 + 0.044 = **0.095** | 7.0 | 0.098 |
| 0.8 | 6.78 | 0.93 | 7.6° | 0.121 + 0.038 = **0.159** | 5.8 | 3.4° | 3.53 | 0.055 + 0.074 = **0.129** | 7.2 | 0.156 |
| 1.0 | 6.51 | 1.08 | 9.2° | 0.207 + 0.038 = **0.245** | 4.4 | 3.8° | 3.76 | 0.072 + 0.072 = **0.144** | 7.5 | 0.207 |
| 1.2 | 5.94 | 1.12 | 11.3° | 0.291 + 0.034 = **0.325** | 3.4 | 4.2° | 3.83 | 0.082 + 0.062 = **0.144** | 7.8 | 0.249 |
| 1.4 | 5.09 | 1.00 | 13.7° | 0.328 + 0.027 = **0.354** | 2.8 | 4.4° | 3.81 | 0.077 + 0.047 = **0.124** | 8.1 | 0.263 |
| 1.6 | 4.22 | 0.89 | 18.0° | 0.336 + 0.018 = **0.355** | 2.5 | 4.6° | 3.79 | 0.072 + 0.033 = **0.105** | 8.5 | 0.302 |
| 1.8 | 3.35 | 0.70 | 22.2° | 0.211 + 0.011 = **0.223** | 3.2 | 4.2° | 3.82 | 0.052 + 0.022 = **0.073** | 9.6 | 0.294 |

**compress 6 1**

| t, s | speed | load on the bottom, bw | game: attack | game: pressure drag + bottom friction, g | game lift/drag | plate, best trim | its wetted length / beam | plate drag (induced + friction), g | plate lift/drag | plate at the game's attack, g |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.2 | 5.76 | 0.64 | 6.4° | 0.072 + 0.034 = **0.106** | 6.1 | 3.1° | 3.35 | 0.035 + 0.052 = **0.087** | 7.4 | 0.100 |
| 0.4 | 5.71 | 0.79 | 8.7° | 0.109 + 0.029 = **0.138** | 5.7 | 3.2° | 3.81 | 0.044 + 0.057 = **0.101** | 7.8 | 0.144 |
| 0.6 | 5.61 | 0.84 | 9.3° | 0.131 + 0.030 = **0.161** | 5.2 | 3.5° | 3.76 | 0.051 + 0.055 = **0.106** | 7.9 | 0.161 |
| 0.8 | 5.04 | 0.82 | 11.1° | 0.177 + 0.026 = **0.202** | 4.1 | 3.7° | 3.82 | 0.053 + 0.046 = **0.099** | 8.3 | 0.180 |
| 1.0 | 3.99 | 0.65 | 14.1° | 0.195 + 0.017 = **0.212** | 3.1 | 3.6° | 3.79 | 0.041 + 0.030 = **0.071** | 9.2 | 0.176 |

- At the angle the game's hull runs, the plate costs 80 % to 100 % of what the game pays. The game's pressure law is not far from Savitsky.
- At its best trim the plate has lift/drag 7 to 8. The game's hull falls from 6 (straight) to 3 (mid-turn). The gap is 0.15 to 0.20 g at 1.0 to 1.4 s.
- The cause is the angle. Hull pressure drag is close to load × tan(attack). The attack goes 5.6° → 8° → 11° → 14° → 18° as the speed falls 7.2 → 3.6 m/s. Less speed needs more angle for the same load, more angle costs more speed.
- Limits of this reference. The plate is flat, level across and has no rocker. The best-trim case wets the whole length (λ 3.8), which a rockered board on its rail cannot do. A narrower plate (b = 0.32 m, the wetted bottom's mean width) gives almost the same best drag. So "half" is the floor, not a target.

## What the numbers say (my reading)

1. **Legs (and deck) under water: no physical cause.** Wetness is judged against the undisturbed water level. In the turn the board rolls 42° to 49° and is pressed down by 1.3 body weights. Its tail is 0.17 to 0.33 m under, the inside rail 0.20 to 0.29 m under, the deck at the rear foot 0.10 to 0.23 m under. The game then wets 0.34 to 0.44 m² of deck and both leg spheres (wet share about 0.25 each). At 5 to 7 m/s the flow leaves the rail and tail and the hollow behind stays open (depth Froude number 3 to 5). Even riding straight in Compress the deck at the rear foot is 8 mm under and the deck friction is 0.023 g.
2. **Nose-high hull: physical, and partly the rider's to fix.** The body sits 0.19 m behind mid-length and the pressure centre 0.14 to 0.17 m behind. Trim goes 8° → 15° nose up.
3. **Fins, hands, rails are small.** Fin slip stays 1° to 6°, far from the 18° stall. All three fins are fully under water throughout.
4. **A deck counted wet also raises the pressure term a little.** Where both faces of a patch are wet, `patchForce` adds a cross-flow plate drag (`SUBMERGED.normalDrag` 1.18) on top of the planing law. I could not split that part out of "hull pressure". With the deck kept dry (what-if 1) hull pressure did not fall, so it is not large.

## What-ifs (scratch only, nothing built)

1. **Dry above the hull while planing.** Cause: the open hollow behind a planing hull. Lever: the leg parts feel no water while the rider's `planing` flag is on (`DRYLEGS=1`), and a hull patch's deck face is dry while the water passes it faster than 3 m/s (`DRYDECK=1`). Buoyancy unchanged.
2. **Weight forward.** Cause: a surfer drives a turn off the front foot. Lever: none in source; the existing trim input held fully forward (`TRIM=1`) from stick-on.

Measured, Compress, carry 0:

| What-if | Entry | Stick | Kept at 90° | Kept at 120° | 180° done? | End |
|---|---|---|---|---|---|---|
| none | 6 / 6 / 7.5 / 7.5 | 0.5 / 1 / 0.5 / 1 | 0.40 / 0.48 / 0.60 / 0.59 | — / — / 0.39 / 0.31 | no (96° / 111° / 135° / 147°) | 4 falls of 4 |
| 1, legs only | same | same | 0.55 / 0.72 / 0.62 / 0.69 | — / 0.47 / 0.49 / 0.51 | no (103° / 129° / 143° / 171°) | 4 falls of 4 |
| 1, legs and deck | same | same | 0.57 / 0.72 / 0.64 / 0.72 | 0.25 / 0.53 / 0.54 / 0.55 | no (107° / 133° / 152° / 178°) | 4 falls of 4 |
| 2, weight forward | same | same | — / — / 0.45 / — | — | no (84° / 80° / 115° / 84°) | 4 falls of 4 |
| 1 and 2 together | same | same | 0.68 / 0.76 / 0.69 / 0.74 | 0.48 / 0.39 / 0.60 / 0.50 | no (134° / 129° / 176° / 127°) | 4 falls of 4 |

- What-if 1 at 7.5 m/s, full stick: peak drag 0.59 → 0.39 g, all of it hull pressure (0.35 g at attack 14° to 16°). Turning force holds at 0.83 g to 91°. The legs come back at 150° when the board drops off the plane.
- What-if 2 alone: hull pressure drag halves (0.09 to 0.12 g, attack 4° to 6°, front-foot share 0.9). But the body moves over the front of the board and the legs' drag reaches 0.57 to 0.70 g. Total peak 0.92 g. Worse.
- Both together at 7.5 m/s, full stick: drag 0.20 to 0.33 g for 0.7 to 0.8 g of turning between 44° and 112°. Then the bank runs to the 70° cap and the rider falls at 127°.
- No arc completes 180° in any case. The remaining hull drag (0.25 to 0.35 g) still takes the board under 2 m/s by 130° to 180°, and the body falls in.
- Step tables for the four what-if sets: `whatif-tables.md`.

## Not measured

- Waves. Flat water only. No `FaceWater` run, no rider sessions.
- The cross-flow part of the hull pressure where the deck is wet (item 4 above).
- Hull pressure split into "lift's backward part" and anything else. It is one force in the game.
- Induced against profile drag per fin beyond the totals; the per-fin numbers are in `results.txt`, all under 0.01 g.
- Whether a real board's deck or a real surfer's legs are dry at these depths. The claim rests on the Froude number and on what is seen in surfing, not on a source I checked today.
- What the best trim of a rockered, banked board is. The plate has neither.
- Leg drive on, carry on, other boards, other rider weights.
- Why every arc ends in a fall. The falls come under 2 m/s with the bank at its 70° cap; the cause was outside this brief.

## Files

- `ledger.test.ts.txt` — the probe. `scratch-ledger.diff.txt` — the scratch edits it needs (and the what-if switches).
- `run.sh.txt` — the commands. Needs `docs/research/face-hold-2026-11-10/r2Lab.ts.txt` as `zz-r2Lab.ts`.
- `results.txt` — every step of all 24 arcs (`tab.py.txt`). `whatif-tables.md` — the what-ifs as tables (`mdtab.py.txt`).
- `savitsky.py.txt`, `savitsky-results.txt` — the plate calculation.
