# 3.6f accounting (the probe's `m`, `mprone` and `bare` rows)

## The momentum accounting per standing substep and frame (game signs: world up, + nose left; N·m per frame mean, N·m·s per substep)

| ride | stance | standing frames (substeps) | R_s per substep, largest abs / largest rel | R_s per frame, RMS | linear residual per substep, largest abs (rel) | R_O per frame: RMS, largest | jumps between substeps, largest | RMS lever lev (levL, levF) | RMS rotors (lower, upper) | RMS m V x_f r | infeasible / apart / bed / rotor re-sets / agile / drives (substeps) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| glide | Compress | 301 (4832) | 2.33e-14 / 9.02e-12 | 2.35e-13 | 3.27e-13 (2.11e-13) | 20.351, 175.777 | 0.000 | 2.547 (5.424, 3.926) | 4.482, 7.084 | 17.536 | 311 / 311 / 0 / 1 / 0 / 0 |
| glide | tall | 288 (4624) | 1.01e-14 / 1.91e-11 | 1.80e-13 | 3.24e-13 (2.12e-13) | 3.174, 53.864 | 0.000 | 2.550 (2.103, 0.747) | 2.717, 5.119 | 17.457 | 89 / 89 / 0 / 1 / 0 / 0 |
| glide | tuck | 251 (4032) | 8.46e-15 / 8.09e-12 | 2.30e-13 | 3.33e-13 (2.11e-13) | 4.697, 53.864 | 0.000 | 6.978 (11.227, 4.769) | 3.082, 5.837 | 19.907 | 315 / 315 / 0 / 1 / 0 / 0 |
| Big s1 | Compress | 1383 (22224) | 5.05e-14 / 2.98e-07 | 8.15e-13 | 4.37e-13 (4.43e-13) | 3.382, 75.565 | 0.000 | 8.693 (16.081, 8.515) | 6.512, 9.946 | 55.439 | 466 / 466 / 0 / 6 / 0 / 0 |
| Big s1 | tall | 1387 (22288) | 6.72e-14 / 2.98e-07 | 1.05e-12 | 4.09e-13 (4.43e-13) | 2.417, 64.744 | 0.000 | 6.646 (15.567, 10.061) | 3.932, 6.769 | 29.068 | 62 / 62 / 0 / 6 / 0 / 0 |
| Big s1 | tuck | 1385 (22256) | 4.68e-14 / 2.98e-07 | 7.03e-13 | 4.48e-13 (4.43e-13) | 5.186, 126.389 | 0.000 | 8.249 (12.814, 6.167) | 2.700, 4.455 | 26.564 | 964 / 964 / 0 / 6 / 0 / 0 |

**R_O split (amendments 1-2)**, N·m per frame. Feasible frames (no apart substep, no rotor start): RMS of roF, of axis + gyF, of the rest roF − axis − gyF, and its largest. Frames with apart substeps: their number, RMS of roA, of hipA + gyA + axisA, of the rest, and its largest. The rotor-start frames (`rst` > 0, the stand): their R_O. Flight substeps.

| ride | stance | feasible frames: n; RMS roF; RMS (axis + gyF); RMS rest; largest rest | apart frames: n; RMS roA; RMS (hipA + gyA + axisA); RMS hipA; RMS gyA; RMS rest; largest rest | rotor-start frames: R_O | flight substeps |
| --- | --- | --- | --- | --- | --- |
| glide | Compress | 280; 0.203; 0.203; 4.49e-10; 1.45e-09 | 20; 78.021; 78.021; 82.262; 0.013; 7.15e-11; 1.45e-10 | 53.864 | 1 |
| glide | tall | 281; 0.018; 0.018; 4.27e-10; 1.70e-09 | 6; 0.083; 0.083; 0.000; 1.00e-04; 2.68e-11; 4.68e-11 | 53.864 | 1 |
| glide | tuck | 229; 0.397; 0.397; 4.58e-10; 1.48e-09 | 21; 11.109; 11.109; 0.003; 0.012; 1.06e-10; 2.30e-10 | 53.864 | 1 |
| Big s1 | Compress | 1346; 0.464; 0.464; 6.22e-10; 2.50e-09 | 31; 15.977; 15.977; 2.61e-05; 0.010; 2.79e-10; 7.14e-10 | -2.191, -18.644, -64.744, -11.240, 15.823, 50.728 | 6 |
| Big s1 | tall | 1377; 0.632; 0.632; 6.10e-10; 2.23e-09 | 4; 2.796; 2.796; 0.000; 0.006; 2.81e-10; 4.87e-10 | -2.191, -18.644, -64.744, -11.240, 15.823, 50.728 | 6 |
| Big s1 | tuck | 1312; 0.318; 0.318; 6.11e-10; 2.53e-09 | 67; 20.994; 20.994; 1.395; 0.021; 6.18e-10; 2.69e-09 | -2.191, -18.644, -64.744, -11.240, 15.823, 50.728 | 6 |

**The arm** (the body's centre from the board's, heading frame, median over standing frames [5 %, 95 %] along): glide Compress: along -0.267 [-0.472, -0.117] m, across -0.001 m, up 0.539 m; lower 1.240 kg·m², twist β 0.0031; glide tall: along -0.317 [-0.689, -0.102] m, across 0.001 m, up 0.817 m; lower 1.370 kg·m², twist β 0.0031; glide tuck: along -0.245 [-0.348, -0.119] m, across 0.010 m, up 0.397 m; lower 0.857 kg·m², twist β 0.0031; Big s1 Compress: along -0.258 [-0.377, -0.083] m, across 0.003 m, up 0.557 m; lower 1.240 kg·m², twist β 0.0031; Big s1 tall: along -0.298 [-0.502, -0.032] m, across 8.36e-04 m, up 0.826 m; lower 1.370 kg·m², twist β 0.0031; Big s1 tuck: along -0.245 [-0.341, -0.110] m, across -3.24e-04 m, up 0.409 m; lower 0.857 kg·m², twist β 0.0031

## C2, the rider prone (carried rigidly, `couple`), all prone substeps before the stand

| ride | stance | prone substeps (feasible) | R_s largest abs (N·m·s) / largest rel | linear residual largest abs (rel) | R_O largest per substep |
| --- | --- | --- | --- | --- | --- |
| glide | Compress | 1163 (1150) | 4.64e-15 / 4.22e-05 | 1.34e-13 (4.17e-14) | 3.77e-04 |
| glide | tall | 1163 (1150) | 4.64e-15 / 4.22e-05 | 1.34e-13 (4.17e-14) | 3.77e-04 |
| glide | tuck | 1163 (1150) | 4.64e-15 / 4.22e-05 | 1.34e-13 (4.17e-14) | 3.77e-04 |
| Big s1 | Compress | 27128 (27014) | 1.21e-14 / 1.08e-04 | 1.39e-13 (5.88e-14) | 0.001 |
| Big s1 | tall | 27128 (27014) | 1.21e-14 / 1.08e-04 | 1.39e-13 (5.88e-14) | 0.001 |
| Big s1 | tuck | 27128 (27014) | 1.21e-14 / 1.08e-04 | 1.39e-13 (5.88e-14) | 0.001 |

## C1, the bare board on the Canyon face (3.6c's copy of the tall ride's board at tS 0.5 s, 120 steps each)

- 720 frames on 6 boards (median ground speed 6.941 m/s, wetted area 0.053 m²): the closed ledger's residual |rider| per frame, largest **3.85e-15 N·m** (RMS of the water's yaw sum 0.416 N·m; the shipped ledger's duplicate RMS 0.640 N·m); the linear residual per substep, largest 1.36e-14 N·s (rel 8.20e-14); R_O per frame RMS 0.007 N·m, largest 0.111 N·m

## Q3, the unit reads on the substep's own system (inertias, kg·m²: 1 / the board's yaw-rate answer to a unit yaw impulse about the body's up; medians over frames)

| ride, frames | stance | (A) board + water | (B) + the yaw rotors | (C) the full standing system | (D) the body rigid | (K) the known answer | C3: (D) − (B) against (K) − (B) | (C) against `bankLedger.yawPer` (largest rel) | I_board + legs + m x_f² | side impulse at the feet: yaw-rate answer (C) / (D), rad/s per N·s | sway (C) / (D), m/s per N·s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| glide, 60–299 (240) | Compress | 0.501 | 1.745 | 1.768 | 1.878 | 1.878 | 2.18e-08 | 0.000 | 6.088 | -0.0871 / -0.0141 | 0.3275 / 0.1585 |
| glide, 60–299 (228) | tall | 0.506 | 1.879 | 1.893 | 2.001 | 2.001 | 1.50e-08 | 0.000 | 6.222 | -0.0884 / -0.0285 | 0.3493 / 0.2298 |
| glide, 60–299 (191) | tuck | 0.497 | 1.358 | 1.391 | 1.499 | 1.499 | 3.83e-08 | 0.000 | 5.700 | -0.1030 / 6.91e-04 | 0.3023 / 0.1159 |
| Big s1, the kick windows (677) | Compress | 0.551 | 1.795 | 1.806 | 1.856 | 1.856 | 5.04e-08 | — | 6.137 | -0.0757 / -0.0271 | 0.3130 / 0.1664 |
| Big s1, the kick windows (673) | tall | 0.552 | 1.925 | 1.933 | 1.975 | 1.975 | 6.26e-08 | — | 6.268 | -0.0754 / -0.0399 | 0.3304 / 0.2320 |
| Big s1, the kick windows (682) | tuck | 0.552 | 1.412 | 1.430 | 1.481 | 1.481 | 4.44e-08 | — | 5.755 | -0.0879 / -0.0198 | 0.2898 / 0.1236 |

