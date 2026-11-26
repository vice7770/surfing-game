# 3.6e fit, tall (fitting set: big_s1.jsonl, big_s2.jsonl, big_s3.jsonl)

- open sets passing over 1.0 s: 61 (19 ankle, 42 twist); below 4 m/s, excluded: 2
- the bins (terciles of the kick-tick speeds, m/s): [4, 9.2): 19 sets (3 ankle), median 8.38 m/s, depth 0.000 m; [9.2, 10.4): 20 sets (7 ankle), median 10.11 m/s, depth 0.000 m; [10.4, ∞): 20 sets (8 ankle), median 11.09 m/s, depth 0.000 m
- rails at the kick ticks: largest |rail| 0.0000 rad

## Controls of the frame alignment (README §0.1)

- the frame-end yaw rate OmE[m] against the tick's Om[m + 1] (per unit, 3481 frames): largest difference 0.295 against the largest |Om| 17.112
- the ledger's total against the change of the frame-end rate, slope per set (the own inertia): yaw median 0.4398 kg·m² [0.2248, 0.4824], roll median 0.0243 [0.0215, 0.0261] (the bookkeeping uses yaw 0.449, roll 0.026)

## Question 2: the grey-box fits (in-sample)

### tall, bin [4, 9.2) (19 sets; median 8.38 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 0.865 → 0.479 | 44 | 4268.2 | 0.377 / 0.875 | 19 of 19 |
| (b) | 14 | 0.479 → 0.473 | 22 | 43.2 | 0.370 / 0.875 | 19 of 19 |
| (c) | 18 | 0.496 → 0.430 | 32 | 53.4 | 0.342 / 0.875 | 19 of 19 |
| (d) exploratory | 21 | 0.430 → 0.415 | 45 | 50.2 | 0.326 / 0.875 | 19 of 19 |
| (e) exploratory | 20 | 0.430 → 0.430 | 1 | 121.2 | 0.342 / 0.875 | 19 of 19 |
| FIR (bin mean) | — | | | | 0.446 | |
| free rows (one-step LS) | 80 | | | | 35.883 | |
| blended design at the kick tick | — | | | | 0.876 | |
| shipped, speed-following | — | | | | 0.852 | |

- (a) multipliers [5–95 % bootstrap]: rollN -0.300 [-0.46, 0.10]; rollY 1.637 [1.36, 1.88]; rollK -4.93e+5 [-7.32e+7, 4.36e+6]; slipN 0.238 [-0.35, 0.90]; slipY 0.520 [0.18, 0.91]; slipK -1.21e+6 [-1.80e+8, 1.06e+7]; yawN -1.269 [-1.98, -0.32]; yawY 0.598 [-0.11, 1.36]; yawK -9.43e+5 [-1.40e+8, 8.47e+6]; rateN -5.179 [-8.30, -3.77]; rateY -1.231 [-3.17, -0.39]; rateK 8.12e+6 [-7.19e+7, 1.21e+9]
  - weakest directions: σ 6.42e-4: rollK -0.76, slipK -0.48, yawK -0.36, rateK 0.27 | σ 0.0557: rollY -0.71, slipY 0.46, yawY 0.40, rateY 0.29
- (b) multipliers [5–95 % bootstrap]: rollN -0.292 [-0.48, 0.10]; rollY 1.640 [1.46, 2.15]; rollK -4.94e+5 [-7.90e+5, -4.46e+5]; slipN 0.259 [-0.49, 0.90]; slipY 0.538 [-0.29, 0.65]; slipK -1.24e+6 [-1.88e+6, -1.03e+6]; yawN -1.342 [-1.72, -0.34]; yawY 0.538 [0.16, 1.24]; yawK -9.18e+5 [-1.58e+6, -8.97e+5]; rateN -5.296 [-8.55, -4.12]; rateY -1.149 [-3.24, -0.48]; rateK 8.19e+6 [8.81e+6, 1.46e+7]; Ix 1.34e-5 [1.08e-7, 8.06]; Iz 2.086 [0.45, 1.68]
  - weakest directions: σ 0.0633: rollY 0.64, rollN -0.50, slipY -0.40, slipN -0.32 | σ 0.0732: rollN -0.61, rateY 0.49, rollY -0.42, yawY 0.32
- (c) multipliers [5–95 % bootstrap]: rollN 0.006 [-0.19, 0.29]; rollY 1.718 [1.55, 1.92]; rollK -4.29e+5 [-4.55e+5, -2.40e+5]; slipN 0.425 [0.10, 0.49]; slipY 0.514 [0.15, 0.55]; slipK -9.16e+5 [-1.14e+6, -6.51e+5]; yawN -0.907 [-1.34, -0.28]; yawY 0.031 [-0.42, 0.46]; yawK -9.43e+5 [-9.83e+5, -4.58e+5]; rateN -4.093 [-5.74, -2.31]; rateY -1.086 [-1.72, -0.30]; rateK 8.32e+6 [3.94e+6, 1.08e+7]; Ix at its bound (0); J 0.276 [0.18, 0.39]; kt 0.854 [0.73, 0.88]; ct 1.543 [1.36, 1.76]; lower 1.451 [1.22, 1.87]; upper 0.705 [0.65, 0.82]
  - weakest directions: σ 0.0543: rollN 0.76, rollY -0.46, yawN 0.27, slipN 0.26 | σ 0.0805: rollY 0.54, slipY -0.53, rateN 0.46, rollN 0.28
- (d) multipliers [5–95 % bootstrap]: rollN -9.58e-4 [-0.16, 0.34]; rollY 1.741 [1.56, 2.01]; rollK -4.01e+5 [-5.46e+5, -3.55e+5]; slipN 0.590 [-0.05, 0.71]; slipY 0.384 [0.10, 0.44]; slipK -8.87e+5 [-1.26e+6, -8.18e+5]; yawN -1.003 [-1.75, -0.46]; yawY 0.047 [-0.34, 0.58]; yawK -7.13e+5 [-9.29e+5, -5.48e+5]; rateN -4.870 [-7.81, -4.42]; rateY -0.914 [-2.42, -0.48]; rateK 8.79e+6 [8.68e+6, 1.79e+7]; Ix at its bound (0); J 0.314 [0.33, 0.74]; kt 0.865 [0.81, 0.99]; ct 1.307 [1.05, 1.42]; lower 1.368 [1.03, 1.33]; upper 0.819 [0.81, 0.97]; h 1.237 [1.08, 1.37]; ka 1.220 [0.99, 1.57]; ca 0.830 [0.66, 1.08]
  - weakest directions: σ 0.0591: rollN -0.79, rollY 0.44, rateY 0.32, slipN -0.16 | σ 0.0699: rollY 0.57, rateY -0.57, yawY -0.50, rollN 0.19
- (e) multipliers [5–95 % bootstrap]: rollN 0.006 [-0.80, 1.06]; rollY 1.718 [1.47, 2.17]; rollK -4.29e+5 [-5.34e+5, -2.51e+5]; slipN 0.425 [-0.22, 0.42]; slipY 0.514 [-0.02, 0.56]; slipK -9.16e+5 [-1.18e+6, -6.38e+5]; yawN -0.907 [-1.38, -0.32]; yawY 0.031 [-0.93, 0.67]; yawK -9.43e+5 [-1.09e+6, -5.18e+5]; rateN -4.093 [-6.72, -1.30]; rateY -1.086 [-2.00, -0.25]; rateK 8.32e+6 [3.96e+6, 1.17e+7]; Ix at its bound (0); J 0.276 [0.16, 0.41]; kt 0.854 [0.76, 0.88]; ct 1.543 [1.35, 1.75]; lower 1.451 [1.09, 2.13]; upper 0.705 [0.66, 0.83]; xf 1.000 [0.39, 1.45]; zd 1.000 [0.91, 1.52]
  - weakest directions: σ 0.0251: rollN -0.77, xf 0.58, rollY -0.14, rateN -0.13 | σ 0.0547: rollY -0.71, rollN 0.37, yawY 0.34, xf 0.26

### tall, bin [9.2, 10.4) (20 sets; median 10.11 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 0.463 → 0.397 | 24 | 733.9 | 0.387 / 0.755 | 20 of 20 |
| (b) | 14 | 0.397 → 0.394 | 19 | 606.0 | 0.379 / 0.755 | 20 of 20 |
| (c) | 18 | 0.410 → 0.393 | 15 | 624.8 | 0.384 / 0.755 | 20 of 20 |
| (d) exploratory | 21 | 0.393 → 0.383 | 57 | 701.8 | 0.355 / 0.755 | 20 of 20 |
| (e) exploratory | 20 | 0.393 → 0.387 | 40 | 753.0 | 0.369 / 0.755 | 20 of 20 |
| FIR (bin mean) | — | | | | 0.360 | |
| free rows (one-step LS) | 80 | | | | 2.338 | |
| blended design at the kick tick | — | | | | 0.755 | |
| shipped, speed-following | — | | | | 0.736 | |

- (a) multipliers [5–95 % bootstrap]: rollN -1.403 [-1.93, 0.43]; rollY 2.548 [1.70, 2.88]; rollK 1.862 [-0.04, 2.72]; slipN 68.966 [3.70, 138.31]; slipY 28.882 [-2.93, 57.28]; slipK -76.560 [-206.47, 29.00]; yawN 4.937 [1.96, 8.55]; yawY 3.032 [1.70, 4.85]; yawK -4.624 [-9.37, -0.50]; rateN -11.326 [-14.55, 0.71]; rateY -4.287 [-5.79, -0.22]; rateK -12.790 [-22.59, 9.84]
  - weakest directions: σ 0.0035: slipN 0.71, slipY 0.68, slipK -0.14, yawN 0.08 | σ 0.0103: yawN -0.70, yawY -0.68, yawK 0.16, slipN 0.10
- (b) multipliers [5–95 % bootstrap]: rollN -1.269 [-1.72, 0.44]; rollY 2.494 [1.66, 2.81]; rollK 1.938 [0.11, 2.74]; slipN 51.565 [14.24, 90.52]; slipY 22.198 [3.27, 38.70]; slipK -51.801 [-133.20, 15.79]; yawN 5.377 [2.26, 9.03]; yawY 3.296 [1.88, 5.10]; yawK -4.039 [-8.26, 0.06]; rateN -10.779 [-14.00, 0.80]; rateY -4.278 [-5.76, -0.31]; rateK -11.437 [-21.43, 10.82]; Ix 0.158 [1.51e-4, 2964.86]; Iz at its bound (0)
  - weakest directions: σ 0.0043: slipN 0.70, slipY 0.68, yawY 0.14, yawN 0.14 | σ 0.0107: yawN -0.69, yawY -0.68, slipN 0.16, yawK 0.15
- (c) multipliers [5–95 % bootstrap]: rollN -1.305 [-1.79, 0.39]; rollY 2.605 [1.73, 2.83]; rollK 2.218 [0.25, 3.08]; slipN 44.184 [17.30, 75.44]; slipY 18.971 [6.73, 33.91]; slipK -47.367 [-100.14, -1.34]; yawN 5.374 [2.40, 9.69]; yawY 2.802 [1.28, 5.02]; yawK -3.996 [-7.81, -0.50]; rateN -10.214 [-14.52, 1.86]; rateY -4.209 [-5.71, -0.41]; rateK -11.223 [-20.10, 9.50]; Ix 0.209 [6.39e-4, 216.82]; J 0.519 [0.14, 1.49]; kt 1.005 [0.92, 1.07]; ct 0.992 [0.85, 1.22]; lower 0.491 [0.37, 0.82]; upper 1.040 [0.94, 1.12]
  - weakest directions: σ 0.0046: slipN 0.69, slipY 0.66, yawY 0.20, yawN 0.17 | σ 0.0106: yawY -0.71, yawN -0.62, slipN 0.23, slipY 0.14
- (d) multipliers [5–95 % bootstrap]: rollN -2.195 [-3.55, -0.33]; rollY 3.113 [2.00, 3.66]; rollK 4.001 [0.59, 5.60]; slipN 43.800 [16.96, 88.76]; slipY 21.797 [7.07, 46.12]; slipK -61.269 [-134.97, 8.39]; yawN 3.209 [0.37, 7.73]; yawY 1.402 [-0.27, 3.81]; yawK -4.112 [-10.29, 0.54]; rateN -5.763 [-10.53, 7.30]; rateY -2.973 [-4.70, 2.30]; rateK -6.073 [-25.70, 35.89]; Ix 1.715 [0.94, 2.67]; J at its bound (0); kt 0.966 [0.90, 1.02]; ct 1.081 [0.99, 1.24]; lower 0.572 [0.38, 0.93]; upper 0.957 [0.90, 1.01]; h 1.209 [1.13, 1.31]; ka 1.963 [1.43, 2.87]; ca 1.669 [1.25, 3.12]
  - weakest directions: σ 0.0047: slipN 0.72, slipY 0.65, yawN 0.14, slipK -0.14 | σ 0.0106: yawN 0.69, yawY 0.65, slipN -0.19, rollN 0.18
- (e) multipliers [5–95 % bootstrap]: rollN -1.246 [-1.76, 0.06]; rollY 4.454 [1.43, 7.88]; rollK 2.102 [0.20, 3.17]; slipN 42.612 [11.39, 93.41]; slipY 32.820 [-9.76, 103.22]; slipK -36.578 [-98.46, -12.42]; yawN 5.571 [1.80, 11.10]; yawY 3.971 [-0.57, 10.64]; yawK -2.850 [-7.74, 0.78]; rateN -4.529 [-7.64, 4.25]; rateY -3.694 [-5.27, 3.82]; rateK -3.412 [-8.78, 13.08]; Ix at its bound (0); J 7.47e-5 [3.16e-187, 6.09e+237]; kt 0.975 [0.90, 0.99]; ct 1.029 [0.98, 1.22]; lower 0.583 [0.38, 1.30]; upper 1.017 [0.93, 1.06]; xf 0.125 [-0.74, 0.94]; zd 5.812 [1.24, 9.78]
  - weakest directions: σ 0.0039: slipY 0.75, slipN 0.54, yawY 0.28, rollY 0.17 | σ 0.0095: yawY -0.65, slipN 0.53, yawN -0.41, rollY -0.28

### tall, bin [10.4, ∞) (20 sets; median 11.09 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 0.456 → 0.422 | 48 | 277.9 | 0.408 / 0.731 | 20 of 20 |
| (b) | 14 | 0.422 → 0.420 | 18 | 293.8 | 0.408 / 0.731 | 20 of 20 |
| (c) | 18 | 0.438 → 0.414 | 37 | 350.6 | 0.398 / 0.731 | 20 of 20 |
| (d) exploratory | 21 | 0.414 → 0.413 | 55 | 454.1 | 0.390 / 0.731 | 20 of 20 |
| (e) exploratory | 20 | 0.414 → 0.405 | 61 | 178.9 | 0.374 / 0.731 | 20 of 20 |
| FIR (bin mean) | — | | | | 0.372 | |
| free rows (one-step LS) | 80 | | | | 3.467 | |
| blended design at the kick tick | — | | | | 0.731 | |
| shipped, speed-following | — | | | | 0.773 | |

- (a) multipliers [5–95 % bootstrap]: rollN 0.577 [-0.24, 1.60]; rollY 1.548 [0.99, 1.97]; rollK 0.821 [0.36, 1.05]; slipN 12.261 [0.29, 20.82]; slipY 5.685 [-0.44, 10.08]; slipK 1.299 [-4.21, 5.29]; yawN 2.426 [0.14, 4.64]; yawY 2.116 [1.00, 3.26]; yawK -0.135 [-1.19, 0.72]; rateN 9.975 [-0.96, 17.54]; rateY 4.099 [-0.49, 7.34]; rateK 4.645 [-2.36, 14.76]
  - weakest directions: σ 0.0091: slipN 0.49, slipY 0.48, yawY 0.42, yawN 0.41 | σ 0.0216: yawN 0.50, yawY 0.50, slipN -0.49, slipY -0.48
- (b) multipliers [5–95 % bootstrap]: rollN 0.653 [-0.10, 1.59]; rollY 1.516 [1.00, 1.95]; rollK 0.975 [0.47, 1.23]; slipN 12.059 [0.38, 20.82]; slipY 5.635 [-0.40, 10.19]; slipK 1.641 [-3.52, 5.53]; yawN 2.757 [0.22, 5.07]; yawY 2.271 [1.02, 3.60]; yawK 0.123 [-1.11, 0.98]; rateN 9.754 [-0.70, 16.85]; rateY 3.904 [-0.57, 6.98]; rateK 4.000 [-2.28, 13.42]; Ix 2.144 [1.45, 3.95]; Iz at its bound (0)
  - weakest directions: σ 0.0090: slipN 0.49, slipY 0.48, yawY 0.44, yawN 0.43 | σ 0.0221: slipN -0.50, slipY -0.48, yawY 0.48, yawN 0.48
- (c) multipliers [5–95 % bootstrap]: rollN 0.599 [-0.22, 1.52]; rollY 1.788 [1.18, 2.34]; rollK 1.264 [0.58, 1.48]; slipN 12.058 [1.93, 20.10]; slipY 6.191 [0.54, 10.67]; slipK 1.016 [-2.68, 3.89]; yawN 3.387 [0.98, 5.81]; yawY 1.644 [0.34, 3.15]; yawK 0.251 [-1.27, 1.06]; rateN 12.764 [1.39, 19.84]; rateY 5.262 [0.03, 8.54]; rateK 3.938 [-0.95, 12.54]; Ix 1.723 [1.11, 3.93]; J 1.38e-8 [0.00, —]; kt 0.973 [0.94, 1.04]; ct 1.000 [0.84, 1.12]; lower 0.710 [0.43, 1.35]; upper 1.039 [0.96, 1.13]
  - weakest directions: σ 0.0083: slipN 0.49, slipY 0.48, yawN 0.42, yawY 0.40 | σ 0.0195: yawY 0.63, yawN 0.49, slipY -0.32, slipN -0.30
- (d) multipliers [5–95 % bootstrap]: rollN -0.159 [-1.16, 1.23]; rollY 1.958 [1.30, 2.40]; rollK 1.526 [0.23, 2.33]; slipN 16.717 [6.54, 26.69]; slipY 8.459 [3.21, 12.34]; slipK -0.386 [-3.44, 3.67]; yawN 2.933 [0.15, 6.20]; yawY 1.453 [-0.12, 3.07]; yawK -0.252 [-0.76, 0.25]; rateN 16.849 [4.25, 25.79]; rateY 6.860 [1.25, 10.32]; rateK 10.847 [-0.93, 15.04]; Ix 2.692 [1.75, 3.70]; J at its bound (0); kt 0.961 [0.92, 1.02]; ct 1.021 [0.89, 1.14]; lower 0.853 [0.70, 1.21]; upper 1.018 [0.97, 1.10]; h 1.044 [0.94, 1.13]; ka 1.423 [0.79, 2.01]; ca 1.352 [0.77, 2.29]
  - weakest directions: σ 0.0073: slipN 0.52, slipY 0.49, yawN 0.40, yawY 0.39 | σ 0.0106: yawN 0.53, yawY 0.52, slipN -0.41, slipY -0.39
- (e) multipliers [5–95 % bootstrap]: rollN 0.841 [0.32, 1.31]; rollY 1.036 [0.80, 1.24]; rollK 1.251 [0.90, 1.55]; slipN 3.330 [2.69, 4.31]; slipY 1.078 [0.87, 1.26]; slipK 2.131 [1.24, 3.04]; yawN 3.310 [1.93, 4.83]; yawY 1.946 [1.61, 2.32]; yawK -0.584 [-1.17, -0.05]; rateN 2.057 [1.12, 2.98]; rateY 0.299 [0.04, 0.54]; rateK -0.215 [-2.65, 2.54]; Ix 1.683 [0.81, 3.13]; J 1.099 [0.92, 1.34]; kt 1.028 [0.97, 1.10]; ct 0.937 [0.78, 1.06]; lower 0.672 [0.49, 0.85]; upper 1.067 [1.00, 1.15]; xf 1.916 [1.45, 2.25]; zd -7.005 [-8.69, -5.23]
  - weakest directions: σ 0.0171: yawY 0.63, yawN 0.58, rollY -0.30, slipN 0.20 | σ 0.0357: xf 0.53, yawY -0.48, yawN 0.45, J -0.44
