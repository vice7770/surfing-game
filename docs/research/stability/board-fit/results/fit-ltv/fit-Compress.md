# 3.6e fit, Compress (fitting set: big_s1.jsonl, big_s2.jsonl, big_s3.jsonl)

- open sets passing over 1.0 s: 65 (30 ankle, 35 twist); below 4 m/s, excluded: 2
- the bins (terciles of the kick-tick speeds, m/s): [4, 8.7): 21 sets (9 ankle), median 5.97 m/s, depth 0.300 m; [8.7, 10.1): 20 sets (10 ankle), median 9.28 m/s, depth 0.300 m; [10.1, ∞): 22 sets (10 ankle), median 10.50 m/s, depth 0.300 m
- rails at the kick ticks: largest |rail| 0.0000 rad

## Controls of the frame alignment (README §0.1)

- the frame-end yaw rate OmE[m] against the tick's Om[m + 1] (per unit, 3717 frames): largest difference 0.095 against the largest |Om| 3.935
- the ledger's total against the change of the frame-end rate, slope per set (the own inertia): yaw median 0.4444 kg·m² [0.2893, 0.4666], roll median 0.0248 [0.0220, 0.0272] (the bookkeeping uses yaw 0.449, roll 0.026)

## Question 2: the grey-box fits (in-sample)

### Compress, bin [4, 8.7) (21 sets; median 5.97 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 0.990 → 0.592 | 32 | 113.4 | 0.582 / 1.122 | 19 of 21 |
| (b) | 14 | 0.592 → 0.547 | 27 | 69.1 | 0.550 / 1.122 | 19 of 21 |
| (c) | 18 | 0.565 → 0.530 | 31 | 61.2 | 0.534 / 1.122 | 19 of 21 |
| (d) exploratory | 21 | 0.530 → 0.528 | 27 | 77.3 | 0.523 / 1.122 | 19 of 21 |
| (e) exploratory | 20 | 0.530 → 0.525 | 27 | 137.0 | 0.552 / 1.122 | 19 of 21 |
| FIR (bin mean) | — | | | | 0.754 | |
| free rows (one-step LS) | 80 | | | | 8.786 | |
| blended design at the kick tick | — | | | | 1.122 | |
| shipped, speed-following | — | | | | 1.052 | |

- (a) multipliers [5–95 % bootstrap]: rollN -1.156 [-1.66, -0.08]; rollY 1.472 [1.03, 1.90]; rollK -1.078 [-1.80, 0.04]; slipN 3.210 [1.46, 4.72]; slipY 0.935 [0.21, 1.76]; slipK 1.905 [0.43, 4.10]; yawN 9.510 [1.76, 14.73]; yawY 5.925 [1.96, 8.27]; yawK 1.329 [-1.26, 3.83]; rateN 6.064 [0.41, 8.31]; rateY 8.282 [5.55, 9.58]; rateK -16.166 [-24.36, -1.28]
  - weakest directions: σ 0.0208: slipY 0.57, slipN 0.55, yawN 0.39, yawY 0.38 | σ 0.0490: rollY -0.69, rateY 0.48, yawY 0.35, yawN 0.27
- (b) multipliers [5–95 % bootstrap]: rollN -0.355 [-0.69, 0.26]; rollY 1.301 [1.03, 1.67]; rollK -2.890 [-8.13, 0.10]; slipN 2.727 [0.60, 3.94]; slipY 0.613 [-0.27, 1.46]; slipK 4.949 [-0.50, 12.60]; yawN 3.229 [1.81, 4.73]; yawY 2.168 [1.34, 2.95]; yawK -15.532 [-36.24, 9.12]; rateN 1.725 [-0.65, 4.27]; rateY 3.778 [1.89, 5.40]; rateK 70.182 [-60.07, 237.53]; Ix 60.172 [13.67, 181.59]; Iz at its bound (0)
  - weakest directions: σ 0.0357: yawK 0.50, Ix -0.43, slipY 0.42, slipN 0.37 | σ 0.0402: slipY 0.52, Ix 0.38, slipN 0.35, rollK -0.33
- (c) multipliers [5–95 % bootstrap]: rollN 0.238 [-0.11, 0.50]; rollY 1.045 [0.92, 1.39]; rollK -1.727 [-4.36, 0.96]; slipN 1.061 [0.35, 1.88]; slipY 0.058 [-0.33, 0.65]; slipK 1.894 [-0.64, 4.46]; yawN 2.775 [0.74, 4.06]; yawY 1.349 [-0.04, 2.06]; yawK -15.586 [-32.22, 7.56]; rateN 2.108 [0.11, 4.03]; rateY 3.953 [1.88, 5.44]; rateK 71.222 [-57.83, 177.43]; Ix 53.917 [12.84, 124.21]; J at its bound (0); kt 0.829 [0.74, 0.91]; ct 1.359 [1.17, 1.60]; lower 0.726 [0.52, 1.08]; upper 0.906 [0.83, 0.99]
  - weakest directions: σ 0.0421: yawK 0.60, Ix -0.50, rollK 0.43, rateK -0.25 | σ 0.0509: yawY -0.53, slipY -0.48, yawN -0.42, slipN -0.35
- (d) multipliers [5–95 % bootstrap]: rollN 0.107 [-0.28, 0.44]; rollY 1.029 [0.91, 1.51]; rollK -1.827 [-5.52, 1.37]; slipN 1.023 [0.27, 1.68]; slipY -0.019 [-0.34, 0.54]; slipK 1.286 [-1.06, 4.69]; yawN 1.945 [-0.54, 3.27]; yawY 0.911 [-0.74, 1.66]; yawK -18.026 [-43.89, 7.13]; rateN 1.044 [-0.99, 3.10]; rateY 4.780 [1.99, 7.46]; rateK 46.102 [-60.39, 164.02]; Ix 57.531 [14.22, 196.80]; J at its bound (0); kt 0.841 [0.78, 0.93]; ct 1.373 [1.20, 1.54]; lower 0.884 [0.60, 1.47]; upper 0.902 [0.84, 0.98]; h 1.139 [0.95, 1.84]; ka 1.459 [0.82, 3.79]; ca 1.928 [1.03, 5.92]
  - weakest directions: σ 0.0346: yawK 0.66, Ix -0.58, rollK 0.39, rateK -0.16 | σ 0.0463: slipY -0.63, yawY -0.46, slipN -0.38, yawN -0.33
- (e) multipliers [5–95 % bootstrap]: rollN -1.201 [-2.68, 0.12]; rollY 1.210 [1.05, 1.59]; rollK -3.686 [-10.14, 7.35]; slipN 0.737 [-0.20, 1.33]; slipY -0.063 [-0.32, 0.12]; slipK 1.903 [-4.20, 5.93]; yawN 1.319 [-0.91, 3.07]; yawY -0.212 [-0.83, 0.29]; yawK -34.721 [-76.95, 45.47]; rateN 0.558 [-1.37, 3.44]; rateY 0.752 [0.09, 1.98]; rateK 213.969 [-303.28, 519.13]; Ix 98.154 [8.76, 379.83]; J at its bound (0); kt 0.818 [0.75, 0.89]; ct 1.436 [1.23, 1.59]; lower 0.346 [0.10, 6.63]; upper 0.888 [0.82, 0.96]; xf 2.452 [1.54, 3.44]; zd -3.756 [-7.86, 1.51]
  - weakest directions: σ 0.0211: yawK -0.63, Ix 0.56, rollK -0.42, rateK 0.27 | σ 0.0267: xf 0.71, rollN -0.56, yawY -0.28, rateY -0.26

### Compress, bin [8.7, 10.1) (20 sets; median 9.28 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 0.705 → 0.475 | 40 | 1.06e+4 | 0.422 / 0.969 | 19 of 20 |
| (b) | 14 | 0.475 → 0.474 | 18 | 1.82e+4 | 0.421 / 0.969 | 19 of 20 |
| (c) | 18 | 0.475 → 0.469 | 22 | 1.07e+4 | 0.416 / 0.969 | 19 of 20 |
| (d) exploratory | 21 | 0.469 → 0.448 | 32 | 1.28e+4 | 0.397 / 0.969 | 20 of 20 |
| (e) exploratory | 20 | 0.469 → 0.453 | 19 | 2981.8 | 0.419 / 0.969 | 20 of 20 |
| FIR (bin mean) | — | | | | 0.525 | |
| free rows (one-step LS) | 80 | | | | 1.875 | |
| blended design at the kick tick | — | | | | 0.969 | |
| shipped, speed-following | — | | | | 0.939 | |

- (a) multipliers [5–95 % bootstrap]: rollN -6.278 [-7.77, -1.21]; rollY 3.278 [2.21, 3.74]; rollK 7.059 [3.97, 8.93]; slipN 2.59e+6 [-1.22e+7, 1.67e+8]; slipY 7.39e+5 [-3.45e+6, 4.74e+7]; slipK -3.59e+6 [-2.29e+8, 1.64e+7]; yawN -10.326 [-17.10, -4.39]; yawY -1.548 [-3.00, -0.40]; yawK 11.979 [6.94, 17.91]; rateN -0.173 [-6.84, 5.74]; rateY -0.161 [-1.89, 1.79]; rateK 13.923 [0.22, 30.96]
  - weakest directions: σ 2.33e-4: slipN 0.81, slipY 0.44, slipK -0.39, rollN 0.00 | σ 0.0076: yawN 0.79, yawY 0.42, yawK -0.38, rollN 0.19
- (b) multipliers [5–95 % bootstrap]: rollN -6.315 [-8.36, -1.76]; rollY 3.251 [2.25, 3.73]; rollK 6.897 [4.02, 8.94]; slipN 2.61e+6 [-1.29e+8, 8.93e+7]; slipY 7.35e+5 [-3.65e+7, 2.54e+7]; slipK -3.50e+6 [-1.21e+8, 1.74e+8]; yawN -10.420 [-16.54, -2.64]; yawY -1.518 [-2.78, 0.24]; yawK 11.587 [5.71, 17.30]; rateN 0.251 [-7.17, 5.57]; rateY -0.041 [-2.00, 1.67]; rateK 14.065 [0.05, 27.83]; Ix 2.159 [1.15, 6.28]; Iz 0.830 [0.36, 1.49]
  - weakest directions: σ 1.45e-4: slipN 0.81, slipY 0.44, slipK -0.39, yawN -0.00 | σ 0.0075: yawN 0.79, yawY 0.42, yawK -0.38, rollN 0.19
- (c) multipliers [5–95 % bootstrap]: rollN -6.572 [-8.02, -2.19]; rollY 2.873 [1.82, 3.16]; rollK 7.250 [4.37, 8.18]; slipN 2.52e+6 [-1.70e+8, -2.91e+7]; slipY 5.99e+5 [-4.02e+7, -6.80e+6]; slipK -3.59e+6 [4.11e+7, 2.41e+8]; yawN -8.643 [-12.84, -2.13]; yawY 0.308 [-1.06, 1.94]; yawK 9.720 [3.54, 12.90]; rateN 1.058 [-5.35, 7.20]; rateY 0.215 [-1.22, 1.95]; rateK 16.933 [5.90, 35.23]; Ix 3.254 [2.01, 6.21]; J 2.142 [1.42, 2.66]; kt 0.968 [0.93, 1.06]; ct 0.970 [0.74, 1.12]; lower 0.864 [0.56, 1.11]; upper 1.054 [0.99, 1.15]
  - weakest directions: σ 2.62e-4: slipN 0.81, slipY 0.43, slipK -0.40, yawN -0.00 | σ 0.0070: yawN 0.76, yawY 0.50, yawK -0.35, rollN 0.16
- (d) multipliers [5–95 % bootstrap]: rollN -8.657 [-10.46, -3.63]; rollY 2.363 [1.36, 2.88]; rollK 3.270 [0.40, 4.58]; slipN 2.97e+6 [4.01e+6, 8.45e+7]; slipY 5.00e+5 [6.55e+5, 1.43e+7]; slipK -1.57e+6 [-4.45e+7, -1.60e+6]; yawN -9.798 [-13.84, -3.07]; yawY 2.270 [0.44, 4.23]; yawK 3.434 [-1.30, 5.71]; rateN 0.982 [-5.44, 9.20]; rateY 0.019 [-1.21, 1.47]; rateK 8.876 [1.21, 14.70]; Ix 2.481 [1.97, 3.29]; J 2.105 [1.73, 2.55]; kt 0.963 [0.94, 1.06]; ct 1.034 [0.78, 1.17]; lower 1.289 [0.88, 1.65]; upper 1.036 [0.98, 1.13]; h 0.602 [0.49, 0.86]; ka 0.863 [0.63, 1.57]; ca 0.628 [0.41, 1.29]
  - weakest directions: σ 2.34e-4: slipN 0.81, slipY 0.44, slipK -0.38, yawN 0.01 | σ 0.0060: yawN -0.64, yawY -0.56, yawK 0.39, rollK 0.21
- (e) multipliers [5–95 % bootstrap]: rollN -6.472 [-7.99, -2.19]; rollY 3.166 [2.51, 3.60]; rollK 6.043 [3.73, 7.15]; slipN 2.99e+6 [-3.11e+7, 2.05e+7]; slipY 7.87e+5 [-8.16e+6, 5.52e+6]; slipK -3.61e+6 [-2.59e+7, 3.78e+7]; yawN -6.560 [-9.84, -1.45]; yawY 1.275 [0.09, 2.72]; yawK 4.700 [-0.13, 7.79]; rateN 2.805 [-4.22, 8.14]; rateY 0.966 [-0.58, 2.57]; rateK 19.232 [3.94, 35.56]; Ix 1.205 [1.02, 4.24]; J 2.492 [1.88, 2.81]; kt 0.937 [0.90, 1.04]; ct 1.048 [0.79, 1.19]; lower at its bound (0); upper 1.054 [0.98, 1.15]; xf 0.546 [0.33, 0.65]; zd -0.818 [-1.11, -0.26]
  - weakest directions: σ 0.0010: slipN 0.81, slipY 0.44, slipK -0.38, yawN -0.03 | σ 0.0074: yawN 0.79, yawY 0.45, yawK -0.35, rollN 0.19

### Compress, bin [10.1, ∞) (22 sets; median 10.50 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 1.107 → 0.365 | 23 | 383.9 | 0.325 / 1.020 | 22 of 22 |
| (b) | 14 | 0.365 → 0.363 | 18 | 409.9 | 0.320 / 1.020 | 22 of 22 |
| (c) | 18 | 0.428 → 0.351 | 22 | 425.6 | 0.303 / 1.020 | 22 of 22 |
| (d) exploratory | 21 | 0.351 → 0.351 | 1 | — | 0.303 / 1.020 | 22 of 22 |
| (e) exploratory | 20 | 0.351 → 0.351 | 1 | — | 0.303 / 1.020 | 22 of 22 |
| FIR (bin mean) | — | | | | 0.340 | |
| free rows (one-step LS) | 80 | | | | 0.704 | |
| blended design at the kick tick | — | | | | 1.019 | |
| shipped, speed-following | — | | | | 1.023 | |

- (a) multipliers [5–95 % bootstrap]: rollN -1.313 [-1.99, -0.17]; rollY 3.442 [2.60, 4.11]; rollK 0.213 [-0.27, 0.68]; slipN 11.930 [5.09, 21.00]; slipY 8.619 [3.69, 15.51]; slipK -0.755 [-6.02, 5.23]; yawN 4.852 [1.27, 9.78]; yawY 4.429 [1.80, 7.70]; yawK -1.463 [-3.69, 0.35]; rateN 6.413 [-0.72, 23.35]; rateY 5.382 [0.76, 16.40]; rateK 6.011 [-1.29, 15.98]
  - weakest directions: σ 0.0070: slipN 0.57, slipY 0.53, yawN 0.45, yawY 0.42 | σ 0.0178: yawN 0.54, yawY 0.50, slipY -0.46, slipN -0.43
- (b) multipliers [5–95 % bootstrap]: rollN -1.343 [-2.00, -0.30]; rollY 3.406 [2.63, 4.12]; rollK 0.427 [-0.11, 1.08]; slipN 11.845 [5.00, 20.33]; slipY 8.506 [3.73, 14.05]; slipK 0.282 [-5.45, 6.26]; yawN 5.052 [1.51, 9.81]; yawY 4.603 [2.03, 7.63]; yawK -0.764 [-3.11, 1.08]; rateN 5.534 [-1.14, 19.78]; rateY 4.497 [0.23, 13.36]; rateK 4.975 [-1.58, 12.61]; Ix 1.596 [0.92, 3.41]; Iz at its bound (0)
  - weakest directions: σ 0.0069: slipN 0.57, slipY 0.54, yawN 0.44, yawY 0.42 | σ 0.0180: yawN 0.54, yawY 0.51, slipY -0.44, slipN -0.42
- (c) multipliers [5–95 % bootstrap]: rollN -1.482 [-2.19, -0.62]; rollY 3.702 [3.00, 4.42]; rollK 0.704 [0.27, 1.21]; slipN 9.655 [4.80, 16.70]; slipY 7.081 [3.56, 12.21]; slipK 0.466 [-2.23, 3.07]; yawN 4.763 [1.71, 9.60]; yawY 3.237 [0.89, 6.51]; yawK -0.334 [-1.63, 0.59]; rateN 8.425 [0.98, 24.23]; rateY 5.762 [0.93, 15.80]; rateK 4.398 [-0.33, 9.48]; Ix 1.132 [0.52, 2.67]; J at its bound (0); kt 1.007 [0.96, 1.06]; ct 0.983 [0.91, 1.08]; lower 0.935 [0.67, 1.23]; upper 1.021 [0.99, 1.05]
  - weakest directions: σ 0.0070: slipN 0.54, slipY 0.52, yawN 0.44, yawY 0.43 | σ 0.0198: rateN -0.58, rateY -0.57, yawY 0.39, yawN 0.37
- (d) multipliers [5–95 % bootstrap]: rollN -1.482 [-2.48, -0.93]; rollY 3.702 [3.00, 4.39]; rollK 0.704 [0.13, 1.34]; slipN 9.655 [4.68, 16.65]; slipY 7.081 [2.94, 12.05]; slipK 0.466 [-2.07, 3.83]; yawN 4.763 [1.29, 9.23]; yawY 3.237 [0.31, 6.16]; yawK -0.334 [-1.25, 0.65]; rateN 8.425 [1.33, 25.39]; rateY 5.762 [0.43, 16.14]; rateK 4.398 [-0.56, 8.95]; Ix 1.132 [0.83, 1.78]; J 0.000 [—, —]; kt 1.007 [0.96, 1.06]; ct 0.983 [0.91, 1.07]; lower 0.935 [0.69, 1.23]; upper 1.021 [0.99, 1.04]; h 1.000 [0.88, 1.01]; ka 1.000 [0.74, 1.52]; ca 1.000 [0.63, 1.63]
  - weakest directions: σ —: rollN —, rollY —, rollK —, slipN — | σ —: rollN —, rollY —, rollK —, slipN —
- (e) multipliers [5–95 % bootstrap]: rollN -1.482 [-2.34, -0.66]; rollY 3.702 [2.91, 5.12]; rollK 0.704 [0.24, 1.30]; slipN 9.655 [4.71, 16.99]; slipY 7.081 [3.18, 13.74]; slipK 0.466 [-2.40, 3.20]; yawN 4.763 [1.67, 9.34]; yawY 3.237 [0.87, 6.85]; yawK -0.334 [-1.56, 0.50]; rateN 8.425 [0.85, 26.12]; rateY 5.762 [0.78, 18.08]; rateK 4.398 [-0.60, 10.06]; Ix 1.132 [0.61, 2.48]; J 0.000 [—, —]; kt 1.007 [0.96, 1.06]; ct 0.983 [0.90, 1.10]; lower 0.935 [0.70, 1.31]; upper 1.021 [0.99, 1.05]; xf 1.000 [0.69, 1.32]; zd 1.000 [-2.36, 2.12]
  - weakest directions: σ —: rollN —, rollY —, rollK —, slipN — | σ —: rollN —, rollY —, rollK —, slipN —
