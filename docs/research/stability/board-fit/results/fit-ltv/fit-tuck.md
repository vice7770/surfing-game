# 3.6e fit, tuck (fitting set: big_s1.jsonl, big_s2.jsonl, big_s3.jsonl)

- open sets passing over 1.0 s: 69 (31 ankle, 38 twist); below 4 m/s, excluded: 0
- the bins (terciles of the kick-tick speeds, m/s): [4, 8.5): 24 sets (10 ankle), median 7.22 m/s, depth 0.448 m; [8.5, 10): 23 sets (11 ankle), median 9.56 m/s, depth 0.450 m; [10, ∞): 22 sets (10 ankle), median 10.90 m/s, depth 0.450 m
- rails at the kick ticks: largest |rail| 0.0000 rad

## Controls of the frame alignment (README §0.1)

- the frame-end yaw rate OmE[m] against the tick's Om[m + 1] (per unit, 4071 frames): largest difference 0.162 against the largest |Om| 1.450
- the ledger's total against the change of the frame-end rate, slope per set (the own inertia): yaw median 0.4416 kg·m² [0.3561, 0.5055], roll median 0.0240 [0.0216, 0.0265] (the bookkeeping uses yaw 0.449, roll 0.026)

## Question 2: the grey-box fits (in-sample)

### tuck, bin [4, 8.5) (24 sets; median 7.22 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 0.616 → 0.536 | 36 | 706.9 | 0.471 / 1.225 | 24 of 24 |
| (b) | 14 | 0.619 → 0.535 | 106 | 790.3 | 0.475 / 1.225 | 24 of 24 |
| (c) | 18 | 0.542 → 0.523 | 35 | 604.6 | 0.467 / 1.225 | 24 of 24 |
| (d) exploratory | 21 | 0.523 → 0.509 | 21 | 845.8 | 0.454 / 1.225 | 24 of 24 |
| (e) exploratory | 20 | 0.523 → 0.509 | 39 | 1550.6 | 0.416 / 1.225 | 24 of 24 |
| FIR (bin mean) | — | | | | 0.610 | |
| free rows (one-step LS) | 80 | | | | 2.441 | |
| blended design at the kick tick | — | | | | 1.224 | |
| shipped, speed-following | — | | | | 1.113 | |

- (a) multipliers [5–95 % bootstrap]: rollN -1.975 [-2.74, -1.47]; rollY 3.896 [3.19, 4.95]; rollK -0.260 [-1.01, 0.28]; slipN 17.917 [-3.56, 34.41]; slipY 12.416 [-2.30, 22.99]; slipK 3.908 [-3.45, 8.66]; yawN 13.685 [2.79, 24.50]; yawY 10.186 [3.36, 16.73]; yawK 0.290 [-2.41, 1.96]; rateN 1.466 [-0.84, 3.83]; rateY 3.327 [2.82, 3.93]; rateK 2.065 [-3.46, 9.66]
  - weakest directions: σ 0.0039: slipY 0.59, slipN 0.56, yawY 0.42, yawN 0.39 | σ 0.0177: yawY -0.60, yawN -0.55, slipY 0.41, slipN 0.40
- (b) multipliers [5–95 % bootstrap]: rollN -1.958 [-2.79, -1.36]; rollY 3.824 [3.13, 4.73]; rollK -0.263 [-1.00, 0.10]; slipN 19.085 [-3.68, 38.50]; slipY 13.146 [-1.76, 25.19]; slipK 5.460 [-2.58, 12.19]; yawN 15.430 [2.88, 29.14]; yawY 11.372 [3.96, 20.14]; yawK 1.615 [-1.12, 5.23]; rateN 1.045 [-2.34, 4.09]; rateY 2.783 [1.49, 4.37]; rateK 2.221 [-3.55, 9.75]; Ix 0.557 [0.42, 0.71]; Iz 0.541 [0.08, 3.66]
  - weakest directions: σ 0.0036: slipY 0.59, slipN 0.54, yawY 0.43, yawN 0.40 | σ 0.0153: yawY -0.61, yawN -0.49, slipN 0.44, slipY 0.41
- (c) multipliers [5–95 % bootstrap]: rollN -1.521 [-2.21, -0.92]; rollY 3.783 [3.00, 4.98]; rollK -0.974 [-1.58, 0.30]; slipN 12.453 [-0.78, 25.96]; slipY 11.705 [-1.54, 24.01]; slipK 5.450 [-1.04, 11.20]; yawN 8.329 [4.11, 16.44]; yawY 10.244 [5.05, 16.52]; yawK -0.202 [-1.70, 2.97]; rateN 0.460 [-1.98, 2.90]; rateY 4.429 [2.07, 7.07]; rateK 7.898 [-1.00, 12.50]; Ix 2.266 [0.98, 3.09]; J 1.977 [1.16, 2.24]; kt 0.780 [0.66, 0.94]; ct 1.769 [1.52, 1.99]; lower 0.456 [0.09, 1.38]; upper 0.777 [0.73, 0.86]
  - weakest directions: σ 0.0045: slipN 0.60, slipY 0.59, yawN 0.37, yawY 0.37 | σ 0.0211: yawY 0.64, yawN 0.54, slipN -0.46, slipY -0.28
- (d) multipliers [5–95 % bootstrap]: rollN -1.355 [-1.95, -0.97]; rollY 3.838 [2.96, 4.78]; rollK -1.230 [-2.02, 0.65]; slipN 25.745 [-5.30, 47.01]; slipY 24.585 [-8.11, 45.02]; slipK 12.660 [-14.44, 28.93]; yawN 15.595 [4.46, 29.67]; yawY 16.288 [3.44, 28.38]; yawK -0.297 [-9.05, 6.83]; rateN -0.906 [-2.53, 2.25]; rateY 2.742 [0.81, 4.71]; rateK 12.849 [0.93, 27.23]; Ix 5.265 [3.15, 6.60]; J 2.676 [1.56, 3.45]; kt 0.868 [0.73, 1.05]; ct 1.465 [1.18, 1.72]; lower 0.248 [0.02, 0.92]; upper 0.835 [0.81, 0.91]; h 1.222 [0.97, 1.41]; ka 2.949 [1.69, 4.07]; ca 2.308 [1.41, 3.24]
  - weakest directions: σ 0.0035: slipN 0.60, slipY 0.59, yawN 0.39, yawY 0.38 | σ 0.0107: yawY -0.63, yawN -0.53, slipN 0.44, slipY 0.33
- (e) multipliers [5–95 % bootstrap]: rollN -0.499 [-1.11, 0.14]; rollY 11.970 [-1.96, 31.60]; rollK -0.270 [-1.09, 0.50]; slipN 22.851 [-13.76, 57.40]; slipY 80.545 [-89.86, 285.72]; slipK 6.018 [-7.11, 16.56]; yawN 11.703 [3.17, 27.10]; yawY 46.946 [-17.37, 124.51]; yawK 0.689 [-1.87, 4.80]; rateN 1.847 [-0.72, 4.62]; rateY 14.767 [-7.60, 41.39]; rateK 5.967 [-3.67, 13.72]; Ix 0.441 [0.34, 0.90]; J 1.261 [0.86, 1.36]; kt 0.889 [0.70, 1.05]; ct 1.275 [1.05, 1.76]; lower at its bound (0); upper 0.894 [0.80, 0.97]; xf 0.079 [-0.55, 0.58]; zd -0.133 [-3.04, 2.11]
  - weakest directions: σ 0.0021: slipY 0.79, yawY 0.53, rollY 0.21, slipN 0.20 | σ 0.0062: slipN 0.80, yawN 0.46, rollY -0.27, yawY -0.20

### tuck, bin [8.5, 10) (23 sets; median 9.56 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 5.317 → 0.665 | 95 | 20.5 | 0.607 / 1.018 | 20 of 23 |
| (b) | 14 | 0.665 → 0.655 | 24 | 31.5 | 0.608 / 1.018 | 20 of 23 |
| (c) | 18 | 0.675 → 0.648 | 40 | 54.2 | 0.577 / 1.018 | 20 of 23 |
| (d) exploratory | 21 | 0.648 → 0.643 | 36 | 75.9 | 0.586 / 1.018 | 20 of 23 |
| (e) exploratory | 20 | 0.648 → 0.638 | 29 | 64.4 | 0.589 / 1.018 | 20 of 23 |
| FIR (bin mean) | — | | | | 0.588 | |
| free rows (one-step LS) | 80 | | | | 3.403 | |
| blended design at the kick tick | — | | | | 1.018 | |
| shipped, speed-following | — | | | | 1.040 | |

- (a) multipliers [5–95 % bootstrap]: rollN 1.366 [1.16, 1.87]; rollY 0.189 [-0.53, 0.56]; rollK 1.201 [0.88, 1.85]; slipN 1.115 [0.80, 1.60]; slipY 0.668 [0.23, 1.40]; slipK 0.835 [-0.05, 2.08]; yawN 1.325 [0.82, 1.90]; yawY 2.285 [1.73, 2.96]; yawK 0.804 [0.09, 1.42]; rateN -0.482 [-2.34, 0.76]; rateY 2.253 [-0.33, 3.22]; rateK -2.565 [-6.36, 5.16]
  - weakest directions: σ 0.1023: yawY 0.69, yawN 0.53, rollY -0.29, yawK 0.26 | σ 0.1244: slipY -0.71, slipK -0.51, slipN -0.32, yawN 0.21
- (b) multipliers [5–95 % bootstrap]: rollN 1.609 [1.47, 1.98]; rollY -0.019 [-0.58, 0.26]; rollK 1.524 [1.13, 2.09]; slipN 1.765 [1.49, 2.15]; slipY 1.573 [1.20, 2.02]; slipK 2.937 [1.97, 3.61]; yawN 1.449 [1.01, 1.99]; yawY 2.498 [1.83, 3.10]; yawK 0.286 [-0.93, 1.29]; rateN 0.242 [-2.05, 1.33]; rateY 1.611 [-1.56, 3.06]; rateK -1.464 [-6.74, 9.77]; Ix 6.174 [3.54, 8.64]; Iz at its bound (0)
  - weakest directions: σ 0.0754: yawY 0.74, yawK 0.35, slipY 0.33, yawN 0.33 | σ 0.0821: slipY -0.65, slipK -0.48, yawK 0.31, yawY 0.30
- (c) multipliers [5–95 % bootstrap]: rollN 1.335 [1.25, 1.64]; rollY 0.214 [-0.29, 0.44]; rollK 1.247 [0.99, 1.75]; slipN 1.331 [1.14, 1.49]; slipY 1.360 [0.92, 1.55]; slipK 2.190 [1.15, 2.99]; yawN 1.351 [0.93, 2.03]; yawY 1.891 [1.24, 2.51]; yawK 0.121 [-0.95, 1.39]; rateN 0.421 [-1.33, 1.44]; rateY 1.683 [-1.36, 2.95]; rateK -0.734 [-4.82, 8.83]; Ix 6.244 [3.43, 8.85]; J 0.370 [0.22, 0.61]; kt 0.767 [0.72, 0.94]; ct 1.451 [1.16, 1.56]; lower 0.489 [0.19, 0.83]; upper 0.868 [0.82, 0.97]
  - weakest directions: σ 0.0491: yawY 0.78, yawK 0.30, slipY 0.26, yawN 0.25 | σ 0.0675: slipY 0.64, slipK 0.48, yawK -0.33, yawY -0.28
- (d) multipliers [5–95 % bootstrap]: rollN 0.949 [0.77, 1.19]; rollY 0.046 [-0.28, 0.37]; rollK 0.447 [0.19, 0.93]; slipN 0.958 [0.69, 1.20]; slipY 0.816 [0.40, 1.43]; slipK 0.501 [-0.31, 1.52]; yawN 1.492 [0.91, 2.10]; yawY 4.121 [2.31, 5.14]; yawK 1.181 [0.80, 1.60]; rateN 0.466 [-0.72, 1.50]; rateY 2.342 [-0.62, 3.62]; rateK 0.235 [-2.03, 4.04]; Ix 1.330 [0.63, 2.92]; J 0.415 [0.21, 0.81]; kt 0.777 [0.73, 0.89]; ct 1.445 [1.18, 1.53]; lower 0.420 [0.16, 0.75]; upper 0.872 [0.80, 0.97]; h 0.513 [0.34, 0.98]; ka 2.529 [1.16, 6.86]; ca 2.362 [1.14, 6.53]
  - weakest directions: σ 0.0373: h 0.62, rollK 0.48, yawY -0.34, slipK 0.31 | σ 0.0604: yawY 0.79, yawK 0.39, rollY -0.31, J 0.19
- (e) multipliers [5–95 % bootstrap]: rollN 1.681 [1.24, 2.02]; rollY 0.035 [-0.58, 0.67]; rollK 0.793 [0.31, 1.65]; slipN -0.071 [-0.66, 0.36]; slipY 1.292 [0.66, 1.60]; slipK 1.790 [0.22, 2.30]; yawN -0.774 [-2.26, 0.40]; yawY 2.695 [1.44, 3.90]; yawK 0.057 [-0.89, 1.18]; rateN -1.923 [-4.89, 1.49]; rateY 3.986 [0.01, 5.80]; rateK -1.395 [-4.93, 8.95]; Ix 5.559 [3.13, 7.68]; J 0.553 [0.29, 0.93]; kt 0.657 [0.63, 0.82]; ct 1.676 [1.42, 1.75]; lower at its bound (0); upper 0.842 [0.77, 0.97]; xf -0.174 [-0.81, 0.24]; zd 0.922 [-3.11, 3.25]
  - weakest directions: σ 0.0424: yawN 0.68, xf 0.54, rateN 0.38, slipN 0.31 | σ 0.0764: zd -0.55, rollK 0.38, yawY 0.32, xf 0.31

### tuck, bin [10, ∞) (22 sets; median 10.90 m/s)

| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |
| --- | --- | --- | --- | --- | --- | --- |
| (a) | 12 | 0.504 → 0.457 | 105 | 125.5 | 0.451 / 1.034 | 21 of 22 |
| (b) | 14 | 0.457 → 0.452 | 40 | 183.5 | 0.427 / 1.034 | 21 of 22 |
| (c) | 18 | 0.522 → 0.441 | 141 | 277.5 | 0.394 / 1.034 | 21 of 22 |
| (d) exploratory | 21 | 0.441 → 0.437 | 21 | 237.4 | 0.401 / 1.034 | 21 of 22 |
| (e) exploratory | 20 | 0.441 → 0.441 | 32 | 287.0 | 0.401 / 1.034 | 21 of 22 |
| FIR (bin mean) | — | | | | 0.349 | |
| free rows (one-step LS) | 80 | | | | 0.662 | |
| blended design at the kick tick | — | | | | 1.033 | |
| shipped, speed-following | — | | | | 1.056 | |

- (a) multipliers [5–95 % bootstrap]: rollN 0.697 [0.09, 1.26]; rollY 2.288 [1.64, 3.59]; rollK 0.344 [0.04, 0.73]; slipN 2.187 [1.03, 3.70]; slipY 2.305 [0.53, 4.57]; slipK 0.502 [-1.46, 1.83]; yawN 1.153 [0.42, 2.05]; yawY 1.770 [0.82, 2.97]; yawK -0.808 [-1.38, -0.25]; rateN 0.268 [-1.39, 2.25]; rateY 2.222 [0.12, 4.66]; rateK 1.397 [-1.51, 5.33]
  - weakest directions: σ 0.0213: slipN 0.50, slipY 0.46, yawN 0.46, yawY 0.43 | σ 0.0558: rollN -0.52, rollY 0.43, yawN -0.39, yawY -0.39
- (b) multipliers [5–95 % bootstrap]: rollN -0.065 [-1.09, 0.59]; rollY 2.589 [2.00, 3.76]; rollK 0.465 [0.03, 0.92]; slipN 4.016 [2.24, 6.77]; slipY 3.393 [1.63, 6.07]; slipK 1.419 [-0.75, 3.05]; yawN 1.646 [0.79, 2.84]; yawY 2.252 [1.54, 3.37]; yawK -0.641 [-1.41, 0.25]; rateN 1.620 [-1.03, 5.03]; rateY 2.502 [0.34, 5.39]; rateK 1.498 [-0.99, 4.49]; Ix 3.818 [2.59, 6.12]; Iz at its bound (0)
  - weakest directions: σ 0.0162: slipN 0.55, slipY 0.49, yawN 0.38, yawY 0.35 | σ 0.0393: yawY 0.56, rollN 0.44, yawN 0.44, rollY -0.29
- (c) multipliers [5–95 % bootstrap]: rollN 0.233 [-1.27, 0.97]; rollY 2.409 [1.70, 4.07]; rollK 0.791 [0.52, 1.21]; slipN 3.451 [0.89, 7.29]; slipY 3.297 [1.24, 6.95]; slipK 1.175 [-0.19, 2.29]; yawN 2.259 [0.61, 4.23]; yawY 1.793 [0.38, 3.62]; yawK 0.148 [-0.28, 0.83]; rateN 3.348 [-0.88, 9.46]; rateY 2.926 [-0.35, 8.01]; rateK 1.493 [-0.80, 3.89]; Ix 1.858 [1.05, 2.62]; J 0.091 [0.00, 0.34]; kt 0.954 [0.92, 1.01]; ct 1.032 [0.96, 1.09]; lower 0.214 [0.08, 0.78]; upper 0.969 [0.94, 1.00]
  - weakest directions: σ 0.0114: slipN 0.52, slipY 0.49, yawY 0.44, yawN 0.40 | σ 0.0358: yawY -0.62, rateN 0.39, rateY 0.32, rollN -0.26
- (d) multipliers [5–95 % bootstrap]: rollN -0.196 [-1.33, 0.59]; rollY 2.180 [1.69, 3.15]; rollK 0.375 [0.22, 0.55]; slipN 3.226 [0.96, 6.41]; slipY 2.978 [1.72, 5.14]; slipK 1.705 [0.72, 2.80]; yawN 1.904 [0.33, 4.16]; yawY 2.134 [0.91, 4.11]; yawK -0.134 [-0.91, 0.58]; rateN 3.208 [-1.64, 10.48]; rateY 2.495 [-0.15, 6.94]; rateK 2.667 [1.15, 4.50]; Ix 2.492 [1.81, 4.60]; J 0.436 [0.27, 0.71]; kt 0.957 [0.93, 0.99]; ct 1.058 [1.00, 1.14]; lower 0.141 [7.91e-4, 14.82]; upper 0.950 [0.92, 0.98]; h 0.807 [0.69, 0.87]; ka 1.472 [1.12, 1.89]; ca 1.263 [0.85, 1.64]
  - weakest directions: σ 0.0136: slipN 0.50, slipY 0.48, yawY 0.44, yawN 0.34 | σ 0.0256: slipK 0.57, slipY 0.43, rateY -0.37, rateN -0.32
- (e) multipliers [5–95 % bootstrap]: rollN 0.253 [-1.12, 0.83]; rollY 2.269 [1.39, 3.85]; rollK 0.851 [0.56, 1.30]; slipN 3.384 [1.23, 7.01]; slipY 3.127 [1.06, 6.63]; slipK 1.130 [-0.10, 2.08]; yawN 2.501 [0.98, 4.86]; yawY 1.926 [0.28, 4.14]; yawK 0.068 [-0.30, 0.68]; rateN 3.750 [-0.20, 10.58]; rateY 3.093 [-0.61, 8.99]; rateK 1.362 [-1.01, 3.57]; Ix 2.001 [1.18, 2.74]; J 0.120 [0.02, 0.35]; kt 0.952 [0.92, 1.00]; ct 1.038 [0.96, 1.09]; lower 0.193 [0.06, 0.87]; upper 0.968 [0.94, 1.00]; xf 1.119 [0.85, 1.30]; zd -0.487 [-2.89, 1.07]
  - weakest directions: σ 0.0110: slipN 0.50, yawY 0.46, yawN 0.45, slipY 0.42 | σ 0.0300: yawN 0.55, slipY -0.45, rateY -0.43, rollY -0.42
