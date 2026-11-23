# 3.5w phase 3: steering (sharp-steer.ts, 3.5o drives), paired by rider

Printed-back builds (plantFloor, plantSpeed) per arm: {'face-c0': ["(None, 'face')"], 'face-c1': ["(None, 'face')"], 'pf6-c0': ['(6, None)'], 'pf6-c1': ['(6, None)'], 'ship-c0': ['(None, None)'], 'ship-c1': ['(None, None)'], 'taper-c0': ["(None, 'taper')"], 'taper-c1': ["(None, 'taper')"]} 

Reproduction: this round's shipped arm against 3.5o's shipped arm: 435 of 435 riders with the identical fall time (435 in 3.5o's file).

## Steer only (seeds 1-9): the sharp-steer collapses (n = 10)

| rider | shipped (3.5o) | shipped | plantFloor=4.5 (3.5o) | plantFloor=6 | face | taper |
| --- | --- | --- | --- | --- | --- | --- |
| s2w1 cueL | 0.700 | 0.700 | 3.983 | 4.033 | 2.367 | 3.933 |
| s2w1 cueR | 0.717 | 0.717 | 3.717 | 3.817 | 2.617 | 1.017 |
| s3w9 cueR | 0.467 | 0.467 | 1.500 | 1.500 | 1.783 | 1.817 |
| s3w12 cueL | 0.983 | 0.983 | 2.867 | 2.817 | 1.833 | 2.500 |
| s3w12 cueR | 0.700 | 0.700 | 3.783 | 2.683 | 1.683 | 2.167 |
| s4w6 cueL | 0.583 | 0.583 | 1.050 | 0.917 | 0.867 | 0.867 |
| s8w2 cueL | 0.733 | 0.733 | 1.833 | >=5.00 | 2.450 | 1.450 |
| s8w2 cueR | 0.717 | 0.717 | 1.717 | 3.150 | 2.450 | 1.400 |
| s8w5 cueL | 0.950 | 0.950 | 4.333 | 2.733 | 2.067 | 2.417 |
| s8w5 cueR | 0.983 | 0.983 | 3.267 | 2.983 | 2.017 | 1.483 |

- **pf45** - ship35o: later 10 / sooner 0 / same 0, median +2.083, worse by >= 0.25 s: 0; median fall 3.067; carried past +1.5 s 8
- **pf6** - ship: later 10 / sooner 0 / same 0, median +1.992, worse by >= 0.25 s: 0; median fall 2.900; carried past +1.5 s 8
- **face** - ship: later 10 / sooner 0 / same 0, median +1.217, worse by >= 0.25 s: 0; median fall 2.042; carried past +1.5 s 9
- **taper** - ship: later 10 / sooner 0 / same 0, median +1.033, worse by >= 0.25 s: 0; median fall 1.650; carried past +1.5 s 5
- shipped: median fall 0.717

### neutral riders (script `cue`, stood on shipped; n = 59)

- pf6 - shipped: later 25 / sooner 20 / same 14, median +0.000, worse by >= 0.25 s: 9
- face - shipped: later 25 / sooner 21 / same 13, median +0.000, worse by >= 0.25 s: 11
- taper - shipped: later 24 / sooner 20 / same 15, median +0.000, worse by >= 0.25 s: 10

### every steered rider that stood (n = 118)

- pf6 - shipped: later 69 / sooner 42 / same 7, median +0.050, worse by >= 0.25 s: 22
- face - shipped: later 63 / sooner 49 / same 6, median +0.033, worse by >= 0.25 s: 32
- taper - shipped: later 66 / sooner 41 / same 11, median +0.050, worse by >= 0.25 s: 22
- face, the six largest losses: s3w5 cueL 5.00 -> 0.97, s3w5 cueR 5.00 -> 0.97, s1w6 cueR 5.00 -> 0.98, s4w3 cueL 4.38 -> 1.03, s2w2 cueL 3.70 -> 0.90, s9w1 cueL 3.95 -> 1.25
- taper, the six largest losses: s1w6 cueR 5.00 -> 2.53, s4w3 cueL 4.38 -> 2.53, s9w1 cueR 2.87 -> 1.60, s2w6 cueR 1.80 -> 0.98, s1w6 cueL 3.42 -> 2.62, s9w5 cueL 1.33 -> 0.75

## Steer + Compress (seeds 1-3): the sharp-steer collapses (n = 6)

| rider | shipped (3.5o) | shipped | plantFloor=4.5 (3.5o) | plantFloor=6 | face | taper |
| --- | --- | --- | --- | --- | --- | --- |
| s2w1 cueL | 0.717 | 0.717 | 1.717 | 1.950 | 0.950 | 0.933 |
| s2w1 cueR | 1.000 | 1.000 | 1.317 | 3.950 | 2.567 | 1.000 |
| s2w6 cueL | 1.183 | 1.183 | 2.050 | 1.817 | 2.233 | 0.933 |
| s2w6 cueR | 0.967 | 0.967 | 1.683 | 3.350 | 2.017 | 1.483 |
| s3w9 cueL | 0.450 | 0.450 | 1.583 | 1.467 | 1.683 | 1.533 |
| s3w9 cueR | 0.450 | 0.450 | 2.267 | 1.417 | 1.600 | 1.700 |

- **pf45** - ship35o: later 6 / sooner 0 / same 0, median +0.933, worse by >= 0.25 s: 0; median fall 1.700; carried past +1.5 s 5
- **pf6** - ship: later 6 / sooner 0 / same 0, median +1.125, worse by >= 0.25 s: 0; median fall 1.883; carried past +1.5 s 4
- **face** - ship: later 6 / sooner 0 / same 0, median +1.100, worse by >= 0.25 s: 0; median fall 1.850; carried past +1.5 s 5
- **taper** - ship: later 4 / sooner 1 / same 1, median +0.367, worse by >= 0.25 s: 1; median fall 1.242; carried past +1.5 s 2
- shipped: median fall 0.842

### neutral riders (script `cue`, stood on shipped; n = 20)

- pf6 - shipped: later 10 / sooner 5 / same 5, median +0.017, worse by >= 0.25 s: 2
- face - shipped: later 8 / sooner 7 / same 5, median +0.000, worse by >= 0.25 s: 3
- taper - shipped: later 8 / sooner 6 / same 6, median +0.000, worse by >= 0.25 s: 2

### every steered rider that stood (n = 40)

- pf6 - shipped: later 27 / sooner 9 / same 4, median +0.300, worse by >= 0.25 s: 4
- face - shipped: later 23 / sooner 15 / same 2, median +0.150, worse by >= 0.25 s: 11
- taper - shipped: later 24 / sooner 11 / same 5, median +0.150, worse by >= 0.25 s: 6
- face, the six largest losses: s3w5 cueR 5.00 -> 1.20, s3w5 cueL 5.00 -> 1.22, s2w11 cueR 4.78 -> 1.27, s2w2 cueL 4.65 -> 1.22, s2w2 cueR 3.93 -> 1.28, s2w11 cueL 3.72 -> 1.25
- taper, the six largest losses: s2w2 cueR 3.93 -> 1.72, s3w12 cueR 1.97 -> 1.27, s3w10 cueL 1.17 -> 0.55, s3w10 cueR 1.17 -> 0.55, s2w11 cueR 4.78 -> 4.43, s2w6 cueL 1.18 -> 0.93

## The seed-2 wave-2 left turn's climb (3.5o: 0.50 m at +2.067 s, 4.24 m/s, 48.6°; 0.90 m at +2.783 s, 3.31 m/s, 46.4°)

- ship: fall 3.700; 0.50 m: +2.067 s, 4.24 m/s through the water (4.82 over the ground), course 48.6°; 0.90 m: +2.783 s, 3.31 m/s through the water (5.01 over the ground), course 46.4°
- pf6: fall 2.717; 0.50 m: +2.100 s, 4.62 m/s through the water (5.26 over the ground), course 43.4°; 0.90 m: not reached
- face: fall 0.900; 0.50 m: +0.883 s, 7.96 m/s through the water (9.03 over the ground), course -2.1°; 0.90 m: not reached
- taper: fall 3.633; 0.50 m: +2.250 s, 5.86 m/s through the water (6.53 over the ground), course 49.9°; 0.90 m: not reached
