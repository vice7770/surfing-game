# 3.6d known-plant control (the design at 7 m/s, 0.3 m, rail 0, his weights; 4 disturbed rides × 50 twins)

## Controls

```
{
 "compress:straight": {
  "basesStanding": 4,
  "zeroTwinsBitForBit": 4,
  "open": {
   "sets": 32,
   "complete": 32,
   "pre": 32,
   "held": 32,
   "noClamp": 32,
   "stand60": 32,
   "stand90": 32,
   "lin60Of": 32,
   "lin60Pass": 32,
   "lin90Of": 32,
   "lin90Pass": 32,
   "linWorstPassing60": {
    "sym": 4.202547005961742e-13,
    "two": 2.9655017085639976e-13
   },
   "linWorstPassing90": {
    "sym": 4.832078571363226e-13,
    "two": 3.037067660049472e-13
   },
   "linMedianOf60": {
    "sym": 1.5490569619346445e-13,
    "two": 1.1153696311489356e-13
   },
   "maskReasons": {
    "1": 0,
    "2": 0,
    "4": 0,
    "8": 0,
    "16": 0,
    "32": 0,
    "64": 0
   }
  },
  "closed": {
   "sets": 32,
   "complete": 32,
   "pre": 32,
   "held": 32,
   "noClamp": 32,
   "stand60": 32,
   "stand90": 32,
   "lin60Of": 32,
   "lin60Pass": 32,
   "lin90Of": 32,
   "lin90Pass": 32,
   "linWorstPassing60": {
    "sym": 1.4148399053094547e-12,
    "two": 1.2038646902303699e-12
   },
   "linWorstPassing90": {
    "sym": 1.9156510296722824e-12,
    "two": 2.0260785649451723e-12
   },
   "linMedianOf60": {
    "sym": 6.699773114394446e-13,
    "two": 5.022664545822375e-13
   },
   "maskReasons": {
    "1": 0,
    "2": 0,
    "4": 0,
    "8": 0,
    "16": 0,
    "32": 0,
    "64": 0
   }
  },
  "argMaxPerUnitKick": {
   "speed": 0,
   "depth": 0,
   "rail": 0,
   "bank": 0,
   "twist": 0,
   "limA": 0,
   "limT": 0,
   "vf": 0
  }
 }
}
```

## Stage table, Compress (open twins, 60 ticks, at 2.67 Hz; measured / model)

| entry | sets | gain ratio, median [25–75 %] | phase difference, deg, median [25–75 %] | delay Δt, s | same side of 1 / same sign of phase | departs (README §0.6) |
| --- | --- | --- | --- | --- | --- | --- |
| (i) ankle command -> delta | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.56 / 0.56 | no |
| (i) ankle command -> hip torque (N m per unit; no model state) | 16 | 0.000 (abs) [0.00, 0.00] |  |  | 1.00 / 1.00 |  |
| (ii) delta -> phi (y0 - y5) | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.56 / 0.56 | no |
| (ii) delta -> theta (y0) | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.69 / 0.63 | no |
| (ii) delta -> r (y2 - y4) | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.63 / 0.56 | no |
| (ii) delta -> beta | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.69 / 0.69 | no |
| (ii) delta -> theta_t (y3) | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.56 / 0.50 | no |
| (ii) delta -> omega_u (y2) | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.56 / 0.50 | no |
| (iii) ankle: sensed r (y2 - y4) / -Omega | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.63 / 0.69 | no |
| (iii) ankle: sensed phi-dot (y1 - y6) / p | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.56 / 0.56 | no |
| all: ankle command -> y0 | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.69 / 0.63 | no |
| all: ankle command -> y1 | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.69 / 0.69 | no |
| all: ankle command -> y2 | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.56 / 0.56 | no |
| all: ankle command -> y3 | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.56 / 0.50 | no |
| all: ankle command -> y4 | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.56 / 0.56 | no |
| all: ankle command -> y5 | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.50 / 0.56 | no |
| all: ankle command -> y6 | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.50 / 0.50 | no |
| all: ankle command -> Omega | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.63 / 0.56 | no |
| (i) twist command -> tau_a | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.69 / 0.63 | no |
| (i) twist command -> hip torque (N m per unit; no model state) | 16 | 0.000 (abs) [0.00, 0.00] |  |  | 1.00 / 1.00 |  |
| (ii) tau_a -> phi (y0 - y5) | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.69 / 0.56 | no |
| (ii) tau_a -> theta (y0) | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.69 / 0.50 | no |
| (ii) tau_a -> r (y2 - y4) | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.50 / 0.63 | no |
| (ii) tau_a -> beta | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.63 / 0.63 | no |
| (ii) tau_a -> theta_t (y3) | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.50 / 0.56 | no |
| (ii) tau_a -> omega_u (y2) | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.56 / 0.63 | no |
| (iii) twist: sensed r (y2 - y4) / -Omega | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.50 / 0.50 | no |
| (iii) twist: sensed phi-dot (y1 - y6) / p | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.63 / 0.50 | no |
| all: twist command -> y0 | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.69 / 0.56 | no |
| all: twist command -> y1 | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.50 / 0.75 | no |
| all: twist command -> y2 | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.56 / 0.63 | no |
| all: twist command -> y3 | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.56 / 0.50 | no |
| all: twist command -> y4 | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.50 / 0.56 | no |
| all: twist command -> y5 | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.63 / 0.63 | no |
| all: twist command -> y6 | 16 | 1.00 [1.00, 1.00] | 0.0 [-0.0, 0.0] | -0.000 | 0.63 / 0.63 | no |
| all: twist command -> Omega | 16 | 1.00 [1.00, 1.00] | -0.0 [-0.0, 0.0] | 0.000 | 0.50 / 0.63 | no |

## The model against the measured, Compress

- open loop, max |measured − model| / max |model| on the senses over 1.5 s: median 0.000 (32 sets)
- the closed twins against the model's closed loop, the same: median 0.000 (32 sets)
- the blend against plantAt at the exact speed, depth and rail (open loop, senses): median 0.0000, largest 0.0000 (16)
- check: S1 (the FIR loop on the model's response) against closedLoop: largest 4.54e-15

## Closings, Compress (the design frozen at the kick tick; Ω's response to a unit kick on either channel, 1.5 s)

| closing | responses (with a mode in band) | pooled peak, Hz | Prony f, median | ζ, median [25–75 %] | q₂, median | the fit's f / ζ, median (no rule) |
| --- | --- | --- | --- | --- | --- | --- |
| S0 measured | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| S1 model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| (i) actuators model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| (ii) mechanics model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| (iii) senses of the board's own rates | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| ankle column model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| twist column model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| ankle -> roll model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| ankle -> yaw model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| twist -> roll model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| twist -> yaw model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| roll rows model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| yaw rows model | 32 (32) | 1.71 | 2.46 | 0.752 [0.743, 0.762] | 0.000 | 1.56 / 0.071 |
| predict designDelay 4 | 32 (32) | 1.67 | 2.40 | 0.754 [0.740, 0.768] | 0.000 | 1.52 / 0.128 |
| predict designDelay 8 | 32 (32) | 1.84 | 2.45 | 0.754 [0.735, 0.774] | 0.000 | 1.63 / 0.041 |
| predict senseShift -2 | 32 (32) | 4.67 | 3.71 | 0.420 [0.126, 0.715] | 0.101 | 3.04 / 0.157 |
| predict senseShift +2 | 32 (32) | 1.52 | 2.98 | 0.415 [0.268, 0.565] | 0.015 | 1.62 / -0.056 |

- the measured response makes the ring (S0 ζ < 0.15, its peak within ±0.3 Hz of 2.67, S1 ζ ≥ 0.25): **no** (S0 0.752, S1 0.752)
  - (i) actuators model: ζ 0.752, share of the way from S0 to S1 -0.07
  - (ii) mechanics model: ζ 0.752, share of the way from S0 to S1 -0.43
  - (iii) senses of the board's own rates: ζ 0.752, share of the way from S0 to S1 -0.51
  - ankle column model: ζ 0.752, share of the way from S0 to S1 -0.52
  - twist column model: ζ 0.752, share of the way from S0 to S1 -0.19
  - ankle -> roll model: ζ 0.752, share of the way from S0 to S1 -0.07
  - ankle -> yaw model: ζ 0.752, share of the way from S0 to S1 -0.45
  - twist -> roll model: ζ 0.752, share of the way from S0 to S1 0.06
  - twist -> yaw model: ζ 0.752, share of the way from S0 to S1 -0.45
  - roll rows model: ζ 0.752, share of the way from S0 to S1 0.12
  - yaw rows model: ζ 0.752, share of the way from S0 to S1 -0.11

## Reproduction of the closed twins, Compress (Ω, 1.5 s)

| | sets | pooled peak, Hz | Prony f, median | ζ, median | q₂, median | waveform error Ω / senses, median |
| --- | --- | --- | --- | --- | --- | --- |
| closed twins | 32 | 1.71 | 2.46 | 0.752 | 0.000 | |
| reproduction (A's args per tick) | 32 | 1.71 | 2.46 | 0.752 | 0.000 | 0.000 / 0.000 |
| reproduction (frozen) | 32 | 1.71 | 2.46 | 0.752 | 0.000 | |

- reproduces (pooled peak within ±0.15 Hz, median q₂ within ±25 %, ≥ 75 % of sets pass both): **yes** (32 of 32 sets pass)

## Known plant

```
{
 "zeroTwinsLargestDiff": 0,
 "openRecoveryLargestRelError": 1.677713876184782e-13,
 "closedRecoveryLargestRelError": 7.731973655025951e-13,
 "s1AgainstClosedLoopLargest": 4.5414773423597475e-15,
 "reproductionLargestWaveErrorOmega": 1.6610703126874159e-12,
 "reproductionLargestWaveErrorSenses": 1.4849177157986066e-12,
 "setsOpenPass90": 32,
 "setsClosedPass90": 32
}
```
