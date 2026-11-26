# 3.6g question 3: 3.6e's question-1 regression on the picture's own twins

*The fitting seeds' open sets passing over 1.0 s at ≥ 4 m/s (Canyon Big seeds 1–3), the picture's open impulse response at each kick point (frozen), 64 substeps per tick; R_N the board's yaw row less its water, as frame means; 3.6e's 14 rider regressors and weights, OLS, cluster-robust errors by set. Model signs, N·m per unit command; per r in N·m per rad/s, per ṙ in kg·m². κ is the scaled condition number (3.6e reads a coefficient only where κ ≤ 1e3 and its VIF ≤ 30). Kinematic b_kin = 3.6e's "model's coefficients" (modelCoefs); ankle form b_ank (H from the bank row).*

## Compress, P_two (J sourced, feet roll on) (63 sets; substep-integrated samples against the 1/60 s plant: largest relative difference 3.3e-13; in continuous time both forms equal R_N to 9.6e-15 (kinematic) and 2.2e-15 (ankle), relative to the largest |R_N|)

| group (sets, median speed) | R² | κ | phi | theta | r | beta | delta | rdot | betadot | thetaddot | line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **bin [4, 8.7)** (21, 6.0 m/s): regression | 0.9980 | 8.3e+1 | 466.53 ± 25.29 | -304.52 ± 20.03 | 1.90 ± 2.81 | -69.27 ± 22.46 | 414.94 ± 40.47 | -1.61 ± 0.20 | -1.76 ± 2.03 | -0.99 ± 0.45 | **ankle form** |
| kinematic b_kin (residual 0.0171) | | | 175.66 | -175.66 | 110.76 | 0.00 | 175.66 | -5.59 | 113.76 | 9.81 | |
| ankle form b_ank (residual 0.0582) | | | 529.94 | -355.20 | -3.00 | 0.00 | 529.94 | -1.24 | 0.00 | -2.06 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9981; ‖b̂ − b̄‖ / ‖b̄‖ 1.37) | | | 488.57 | -322.69 | 0.65 | -56.75 | 447.77 | -1.45 | -0.87 | -1.27 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 4.3e-12 (PASS); OLS residual 0.0447; VIF max 870 | | | | | | | | | | | |
| **bin [8.7, 10.1)** (20, 9.3 m/s): regression | 0.9988 | 1.2e+2 | 360.08 ± 27.79 | -201.27 ± 20.04 | 3.47 ± 4.61 | -359.45 ± 68.91 | 182.42 ± 44.48 | -2.10 ± 0.14 | -13.09 ± 5.59 | -0.06 ± 0.37 | **neither** |
| kinematic b_kin (residual 0.0266) | | | 159.57 | -159.57 | 163.68 | 0.00 | 159.57 | -5.59 | 166.68 | 9.82 | |
| ankle form b_ank (residual 0.0699) | | | 513.75 | -339.02 | -3.00 | 0.00 | 513.75 | -1.24 | 0.00 | -2.06 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9982; ‖b̂ − b̄‖ / ‖b̄‖ 1.07) | | | 319.82 | -202.54 | 28.03 | -268.38 | 267.84 | -2.05 | 18.60 | 0.27 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.3e-12 (PASS); OLS residual 0.0344; VIF max 2114 | | | | | | | | | | | |
| **bin [10.1, ∞)** (22, 10.5 m/s): regression | 0.9993 | 1.4e+2 | 241.27 ± 29.24 | -145.04 ± 17.09 | 49.72 ± 6.52 | -192.75 ± 49.36 | 181.49 ± 28.65 | -3.09 ± 0.16 | 41.61 ± 3.94 | 2.07 ± 0.32 | **neither** |
| kinematic b_kin (residual 0.0359) | | | 164.36 | -164.36 | 188.44 | 0.00 | 164.36 | -5.59 | 191.44 | 9.79 | |
| ankle form b_ank (residual 0.0649) | | | 519.44 | -344.70 | -3.00 | 0.00 | 519.44 | -1.24 | 0.00 | -2.06 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9987; ‖b̂ − b̄‖ / ‖b̄‖ 0.44) | | | 147.20 | -117.32 | 90.57 | -46.79 | 243.43 | -3.37 | 93.49 | 3.00 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 9.2e-12 (PASS); OLS residual 0.0260; VIF max 1783 | | | | | | | | | | | |
| **all ≥ 4 m/s** (63, 9.3 m/s): regression | 0.9979 | 8.0e+1 | 417.00 ± 15.16 | -261.59 ± 12.91 | 1.71 ± 1.02 | -81.95 ± 13.69 | 383.82 ± 22.72 | -1.67 ± 0.09 | -2.82 ± 1.45 | -1.16 ± 0.15 | **ankle form** |
| kinematic b_kin (residual 0.0268) | | | 166.60 | -166.60 | 154.69 | 0.00 | 166.60 | -5.59 | 157.69 | 9.81 | |
| ankle form b_ank (residual 0.0637) | | | 521.13 | -346.40 | -3.00 | 0.00 | 521.13 | -1.24 | 0.00 | -2.06 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9973; ‖b̂ − b̄‖ / ‖b̄‖ 1.25) | | | 440.44 | -281.86 | 0.81 | -68.90 | 421.78 | -1.50 | -0.65 | -1.45 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 3.1e-13 (PASS); OLS residual 0.0455; VIF max 656 | | | | | | | | | | | |

## Compress, P_0 (J = 0, feet roll on) (63 sets; substep-integrated samples against the 1/60 s plant: largest relative difference 4.5e-13; in continuous time both forms equal R_N to 4.1e-14 (kinematic) and 2.9e-15 (ankle), relative to the largest |R_N|)

| group (sets, median speed) | R² | κ | phi | theta | r | beta | delta | rdot | betadot | thetaddot | line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **bin [4, 8.7)** (21, 6.0 m/s): regression | 0.9991 | 1.2e+2 | 535.68 ± 15.61 | -362.20 ± 11.75 | -1.04 ± 1.70 | -29.41 ± 13.55 | 501.24 ± 27.56 | -1.21 ± 0.15 | -1.83 ± 0.65 | 0.08 ± 0.10 | **ankle form** |
| kinematic b_kin (residual 0.0162) | | | 175.66 | -175.66 | 110.76 | 0.00 | 175.66 | -5.59 | 113.76 | 9.81 | |
| ankle form b_ank (residual 0.0510) | | | 529.94 | -355.20 | -3.00 | 0.00 | 529.94 | -1.24 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9992; ‖b̂ − b̄‖ / ‖b̄‖ 1.66) | | | 550.19 | -373.84 | -1.78 | -23.82 | 520.57 | -1.07 | -1.51 | 0.03 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 3.3e-12 (PASS); OLS residual 0.0295; VIF max 1499 | | | | | | | | | | | |
| **bin [8.7, 10.1)** (20, 9.3 m/s): regression | 0.9997 | 2.2e+2 | 479.07 ± 12.57 | -305.38 ± 9.71 | 0.24 ± 1.62 | -95.83 ± 31.79 | 413.33 ± 25.12 | -1.46 ± 0.06 | -6.28 ± 1.33 | 0.08 ± 0.07 | **ankle form** |
| kinematic b_kin (residual 0.0277) | | | 159.57 | -159.57 | 163.68 | 0.00 | 159.57 | -5.59 | 166.68 | 9.82 | |
| ankle form b_ank (residual 0.0488) | | | 513.75 | -339.02 | -3.00 | 0.00 | 513.75 | -1.24 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9992; ‖b̂ − b̄‖ / ‖b̄‖ 1.51) | | | 485.69 | -325.76 | 7.48 | -51.40 | 491.67 | -1.07 | 3.19 | 0.41 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.3e-11 (PASS); OLS residual 0.0169; VIF max 3320 | | | | | | | | | | | |
| **bin [10.1, ∞)** (22, 10.5 m/s): regression | 0.9998 | 2.5e+2 | 456.90 ± 16.02 | -298.35 ± 10.41 | 8.77 ± 3.36 | -99.66 ± 17.79 | 424.70 ± 16.25 | -1.47 ± 0.07 | 0.36 ± 2.51 | 0.45 ± 0.13 | **ankle form** |
| kinematic b_kin (residual 0.0336) | | | 164.36 | -164.36 | 188.44 | 0.00 | 164.36 | -5.59 | 191.44 | 9.79 | |
| ankle form b_ank (residual 0.0473) | | | 519.44 | -344.70 | -3.00 | 0.00 | 519.44 | -1.24 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9993; ‖b̂ − b̄‖ / ‖b̄‖ 1.31) | | | 439.79 | -301.98 | 18.27 | -79.61 | 478.10 | -1.11 | 10.36 | 0.75 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.3e-11 (PASS); OLS residual 0.0140; VIF max 3788 | | | | | | | | | | | |
| **all ≥ 4 m/s** (63, 9.3 m/s): regression | 0.9989 | 1.2e+2 | 501.48 ± 8.93 | -332.49 ± 7.16 | -1.96 ± 0.54 | -24.68 ± 7.11 | 498.41 ± 11.69 | -1.19 ± 0.06 | -2.13 ± 0.28 | 0.02 ± 0.02 | **ankle form** |
| kinematic b_kin (residual 0.0252) | | | 166.60 | -166.60 | 154.69 | 0.00 | 166.60 | -5.59 | 157.69 | 9.81 | |
| ankle form b_ank (residual 0.0494) | | | 521.13 | -346.40 | -3.00 | 0.00 | 521.13 | -1.24 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9987; ‖b̂ − b̄‖ / ‖b̄‖ 1.61) | | | 522.35 | -349.05 | -3.12 | -14.33 | 526.97 | -1.00 | -2.01 | -0.05 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 2.6e-12 (PASS); OLS residual 0.0331; VIF max 1079 | | | | | | | | | | | |

## tuck, P_two (J sourced, feet roll on) (69 sets; substep-integrated samples against the 1/60 s plant: largest relative difference 3.2e-13; in continuous time both forms equal R_N to 6.4e-15 (kinematic) and 4.0e-15 (ankle), relative to the largest |R_N|)

| group (sets, median speed) | R² | κ | phi | theta | r | beta | delta | rdot | betadot | thetaddot | line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **bin [4, 8.5)** (24, 7.2 m/s): regression | 0.9987 | 8.7e+1 | 414.65 ± 34.19 | -268.78 ± 28.05 | 10.67 ± 1.94 | -157.31 ± 18.93 | 299.20 ± 44.52 | -1.68 ± 0.12 | 1.91 ± 1.49 | 0.21 ± 0.32 | **neither** |
| kinematic b_kin (residual 0.0233) | | | 170.65 | -170.65 | 121.76 | 0.00 | 170.65 | -5.21 | 124.76 | 7.16 | |
| ankle form b_ank (residual 0.0648) | | | 656.45 | -481.71 | -3.00 | 0.00 | 656.45 | -0.86 | 0.00 | -1.87 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9981; ‖b̂ − b̄‖ / ‖b̄‖ 1.23) | | | 454.81 | -304.94 | 9.46 | -136.78 | 356.53 | -1.56 | 3.52 | -0.06 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.2e-13 (PASS); OLS residual 0.0359; VIF max 793 | | | | | | | | | | | |
| **bin [8.5, 10)** (23, 9.6 m/s): regression | 0.9994 | 1.0e+2 | 349.37 ± 33.29 | -190.91 ± 25.05 | 16.32 ± 2.66 | -267.11 ± 41.53 | 166.00 ± 38.91 | -2.08 ± 0.07 | 5.26 ± 3.12 | 0.92 ± 0.29 | **neither** |
| kinematic b_kin (residual 0.0374) | | | 159.90 | -159.90 | 164.73 | 0.00 | 159.90 | -5.20 | 167.73 | 7.14 | |
| ankle form b_ank (residual 0.0654) | | | 647.16 | -472.42 | -3.00 | 0.00 | 647.16 | -0.86 | 0.00 | -1.87 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9982; ‖b̂ − b̄‖ / ‖b̄‖ 0.89) | | | 329.37 | -232.10 | 54.72 | -170.70 | 288.83 | -2.48 | 50.43 | 1.58 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.1e-12 (PASS); OLS residual 0.0254; VIF max 871 | | | | | | | | | | | |
| **bin [10, ∞)** (22, 10.9 m/s): regression | 0.9997 | 1.2e+2 | 246.79 ± 24.93 | -134.86 ± 17.92 | 43.98 ± 3.70 | -206.14 ± 24.62 | 133.93 ± 26.03 | -2.71 ± 0.09 | 35.61 ± 2.21 | 1.71 ± 0.18 | **neither** |
| kinematic b_kin (residual 0.0482) | | | 164.88 | -164.88 | 191.01 | 0.00 | 164.88 | -5.20 | 194.01 | 7.12 | |
| ankle form b_ank (residual 0.0635) | | | 652.87 | -478.13 | -3.00 | 0.00 | 652.87 | -0.86 | 0.00 | -1.87 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9988; ‖b̂ − b̄‖ / ‖b̄‖ 0.52) | | | 112.61 | -131.27 | 116.66 | -139.05 | 245.15 | -3.25 | 111.55 | 2.71 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 6.2e-12 (PASS); OLS residual 0.0182; VIF max 1029 | | | | | | | | | | | |
| **all ≥ 4 m/s** (69, 9.4 m/s): regression | 0.9987 | 8.5e+1 | 409.47 ± 21.46 | -265.75 ± 18.39 | 8.67 ± 1.67 | -129.98 ± 10.69 | 345.11 ± 26.36 | -1.62 ± 0.09 | 2.27 ± 1.75 | -0.34 ± 0.14 | **neither** |
| kinematic b_kin (residual 0.0378) | | | 165.23 | -165.23 | 158.16 | 0.00 | 165.23 | -5.21 | 161.16 | 7.14 | |
| ankle form b_ank (residual 0.0645) | | | 652.21 | -477.47 | -3.00 | 0.00 | 652.21 | -0.86 | 0.00 | -1.87 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9971; ‖b̂ − b̄‖ / ‖b̄‖ 1.33) | | | 462.92 | -316.75 | 8.51 | -101.64 | 426.11 | -1.46 | 6.61 | -0.67 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 9.7e-13 (PASS); OLS residual 0.0362; VIF max 646 | | | | | | | | | | | |

## tuck, P_0 (J = 0, feet roll on) (69 sets; substep-integrated samples against the 1/60 s plant: largest relative difference 2.1e-13; in continuous time both forms equal R_N to 4.7e-14 (kinematic) and 2.9e-15 (ankle), relative to the largest |R_N|)

| group (sets, median speed) | R² | κ | phi | theta | r | beta | delta | rdot | betadot | thetaddot | line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **bin [4, 8.5)** (24, 7.2 m/s): regression | 0.9995 | 1.5e+2 | 567.47 ± 19.49 | -403.42 ± 16.64 | 2.36 ± 1.03 | -73.84 ± 10.56 | 519.85 ± 28.46 | -1.05 ± 0.08 | -0.52 ± 0.30 | 0.18 ± 0.04 | **ankle form** |
| kinematic b_kin (residual 0.0247) | | | 170.65 | -170.65 | 121.76 | 0.00 | 170.65 | -5.21 | 124.76 | 7.16 | |
| ankle form b_ank (residual 0.0467) | | | 656.45 | -481.71 | -3.00 | 0.00 | 656.45 | -0.86 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9991; ‖b̂ − b̄‖ / ‖b̄‖ 2.00) | | | 611.23 | -441.45 | 0.04 | -54.37 | 581.19 | -0.84 | -0.55 | 0.08 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 3.8e-12 (PASS); OLS residual 0.0217; VIF max 2048 | | | | | | | | | | | |
| **bin [8.5, 10)** (23, 9.6 m/s): regression | 0.9997 | 2.1e+2 | 498.93 ± 22.02 | -330.53 ± 19.37 | 6.19 ± 1.71 | -139.38 ± 24.08 | 403.51 ± 35.06 | -1.41 ± 0.08 | 0.57 ± 0.72 | 0.33 ± 0.04 | **neither** |
| kinematic b_kin (residual 0.0397) | | | 159.90 | -159.90 | 164.73 | 0.00 | 159.90 | -5.20 | 167.73 | 7.14 | |
| ankle form b_ank (residual 0.0465) | | | 647.16 | -472.42 | -3.00 | 0.00 | 647.16 | -0.86 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9987; ‖b̂ − b̄‖ / ‖b̄‖ 1.81) | | | 552.10 | -408.57 | 17.53 | -105.17 | 560.55 | -1.02 | 14.71 | 0.64 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 4.2e-12 (PASS); OLS residual 0.0165; VIF max 3140 | | | | | | | | | | | |
| **bin [10, ∞)** (22, 10.9 m/s): regression | 0.9998 | 2.4e+2 | 462.87 ± 21.91 | -308.45 ± 19.02 | 12.59 ± 2.53 | -137.33 ± 23.84 | 387.25 ± 31.37 | -1.57 ± 0.09 | 5.53 ± 1.04 | 0.54 ± 0.06 | **neither** |
| kinematic b_kin (residual 0.0492) | | | 164.88 | -164.88 | 191.01 | 0.00 | 164.88 | -5.20 | 194.01 | 7.12 | |
| ankle form b_ank (residual 0.0447) | | | 652.87 | -478.13 | -3.00 | 0.00 | 652.87 | -0.86 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9985; ‖b̂ − b̄‖ / ‖b̄‖ 1.88) | | | 544.58 | -445.61 | 34.00 | -128.91 | 668.58 | -0.67 | 25.89 | 0.87 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.4e-11 (PASS); OLS residual 0.0132; VIF max 3850 | | | | | | | | | | | |
| **all ≥ 4 m/s** (69, 9.4 m/s): regression | 0.9996 | 1.4e+2 | 552.88 ± 10.44 | -391.43 ± 9.15 | 2.10 ± 0.57 | -65.18 ± 5.19 | 526.51 ± 13.30 | -1.11 ± 0.04 | -0.41 ± 0.22 | 0.19 ± 0.02 | **ankle form** |
| kinematic b_kin (residual 0.0392) | | | 165.23 | -165.23 | 158.16 | 0.00 | 165.23 | -5.21 | 161.16 | 7.14 | |
| ankle form b_ank (residual 0.0460) | | | 652.21 | -477.47 | -3.00 | 0.00 | 652.21 | -0.86 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9985; ‖b̂ − b̄‖ / ‖b̄‖ 2.17) | | | 652.17 | -477.28 | -2.43 | -20.14 | 653.41 | -0.72 | -0.61 | 0.04 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 9.9e-12 (PASS); OLS residual 0.0212; VIF max 1373 | | | | | | | | | | | |

## tall, P_two (J sourced, feet roll on) (59 sets; substep-integrated samples against the 1/60 s plant: largest relative difference 4.7e-13; in continuous time both forms equal R_N to 1.1e-14 (kinematic) and 3.5e-15 (ankle), relative to the largest |R_N|)

| group (sets, median speed) | R² | κ | phi | theta | r | beta | delta | rdot | betadot | thetaddot | line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **bin [4, 9.2)** (19, 8.4 m/s): regression | 0.9995 | 8.7e+1 | 405.53 ± 16.58 | -228.45 ± 14.51 | -7.99 ± 0.95 | -44.85 ± 14.12 | 402.85 ± 14.80 | -0.89 ± 0.14 | -7.58 ± 2.65 | -3.30 ± 0.16 | **ankle form** |
| kinematic b_kin (residual 0.0191) | | | 166.63 | -166.63 | 133.88 | 0.00 | 166.63 | -5.72 | 136.88 | 14.78 | |
| ankle form b_ank (residual 0.0200) | | | 402.08 | -227.34 | -3.00 | 0.00 | 402.08 | -1.37 | 0.00 | -2.51 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9991; ‖b̂ − b̄‖ / ‖b̄‖ 1.23) | | | 420.34 | -240.04 | -9.11 | -38.96 | 433.50 | -0.69 | -4.55 | -3.72 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.6e-12 (PASS); OLS residual 0.0221; VIF max 845 | | | | | | | | | | | |
| **bin [9.2, 10.4)** (20, 10.1 m/s): regression | 0.9994 | 3.3e+2 | 151.17 ± 59.71 | -54.47 ± 39.25 | 19.38 ± 7.43 | -79.72 ± 34.79 | 304.24 ± 21.50 | -1.01 ± 0.26 | 16.87 ± 4.35 | -2.75 ± 0.44 | **neither** |
| kinematic b_kin (residual 0.0278) | | | 161.49 | -161.49 | 174.50 | 0.00 | 161.49 | -5.72 | 177.50 | 14.96 | |
| ankle form b_ank (residual 0.0380) | | | 393.87 | -219.14 | -3.00 | 0.00 | 393.87 | -1.37 | 0.00 | -2.52 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9993; ‖b̂ − b̄‖ / ‖b̄‖ 1.38) | | | -153.28 | 149.32 | 43.43 | -83.80 | 326.13 | 0.80 | 39.76 | -5.71 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 2.5e-11 (PASS); OLS residual 0.0238; VIF max 14741 | | | | | | | | | | | |
| **bin [10.4, ∞)** (20, 11.1 m/s): regression | 0.9994 | 1.4e+2 | 247.65 ± 41.24 | -139.58 ± 26.97 | 32.59 ± 7.49 | -264.29 ± 81.28 | 248.61 ± 33.21 | -2.00 ± 0.15 | 23.40 ± 3.31 | 0.19 ± 0.48 | **neither** |
| kinematic b_kin (residual 0.0357) | | | 165.64 | -165.64 | 194.73 | 0.00 | 165.64 | -5.72 | 197.73 | 14.96 | |
| ankle form b_ank (residual 0.0447) | | | 398.02 | -223.28 | -3.00 | 0.00 | 398.02 | -1.37 | 0.00 | -2.52 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9987; ‖b̂ − b̄‖ / ‖b̄‖ 0.69) | | | 194.70 | -117.59 | 60.47 | -172.82 | 258.07 | -2.40 | 65.59 | 1.77 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 4.3e-12 (PASS); OLS residual 0.0252; VIF max 2367 | | | | | | | | | | | |
| **all ≥ 4 m/s** (59, 10.1 m/s): regression | 0.9992 | 6.8e+1 | 377.84 ± 8.32 | -207.99 ± 6.10 | -1.98 ± 1.81 | -20.86 ± 14.24 | 368.43 ± 12.64 | -1.56 ± 0.17 | 0.97 ± 2.97 | -2.14 ± 0.31 | **ankle form** |
| kinematic b_kin (residual 0.0271) | | | 164.55 | -164.55 | 168.28 | 0.00 | 164.55 | -5.72 | 171.28 | 14.90 | |
| ankle form b_ank (residual 0.0339) | | | 397.92 | -223.18 | -3.00 | 0.00 | 397.92 | -1.37 | 0.00 | -2.52 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9984; ‖b̂ − b̄‖ / ‖b̄‖ 1.09) | | | 389.56 | -217.67 | -2.49 | -11.09 | 399.32 | -1.36 | 6.28 | -2.60 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.7e-12 (PASS); OLS residual 0.0284; VIF max 536 | | | | | | | | | | | |

## tall, P_0 (J = 0, feet roll on) (59 sets; substep-integrated samples against the 1/60 s plant: largest relative difference 1.1e-12; in continuous time both forms equal R_N to 2.5e-14 (kinematic) and 2.6e-15 (ankle), relative to the largest |R_N|)

| group (sets, median speed) | R² | κ | phi | theta | r | beta | delta | rdot | betadot | thetaddot | line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **bin [4, 9.2)** (19, 8.4 m/s): regression | 0.9994 | 9.6e+1 | 409.58 ± 14.56 | -228.45 ± 13.22 | -6.61 ± 0.88 | 30.31 ± 9.76 | 405.54 ± 10.42 | -1.51 ± 0.05 | -4.51 ± 0.78 | -0.14 ± 0.11 | **ankle form** |
| kinematic b_kin (residual 0.0119) | | | 166.63 | -166.63 | 133.88 | 0.00 | 166.63 | -5.72 | 136.88 | 14.78 | |
| ankle form b_ank (residual 0.0144) | | | 402.08 | -227.34 | -3.00 | 0.00 | 402.08 | -1.37 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9992; ‖b̂ − b̄‖ / ‖b̄‖ 1.18) | | | 415.57 | -232.74 | -7.11 | 29.95 | 413.97 | -1.32 | -4.71 | -0.22 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 2.4e-13 (PASS); OLS residual 0.0236; VIF max 1138 | | | | | | | | | | | |
| **bin [9.2, 10.4)** (20, 10.1 m/s): regression | 0.9999 | 6.5e+2 | 378.94 ± 15.16 | -213.26 ± 10.22 | 2.47 ± 1.45 | -54.35 ± 10.25 | 369.54 ± 3.70 | -1.21 ± 0.09 | -4.37 ± 1.10 | 0.23 ± 0.07 | **ankle form** |
| kinematic b_kin (residual 0.0193) | | | 161.49 | -161.49 | 174.50 | 0.00 | 161.49 | -5.72 | 177.50 | 14.96 | |
| ankle form b_ank (residual 0.0306) | | | 393.87 | -219.14 | -3.00 | 0.00 | 393.87 | -1.37 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9998; ‖b̂ − b̄‖ / ‖b̄‖ 0.90) | | | 220.21 | -107.14 | 14.73 | -104.62 | 362.18 | -0.23 | 3.36 | 0.25 | neither |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.8e-10 (PASS); OLS residual 0.0102; VIF max 53017 | | | | | | | | | | | |
| **bin [10.4, ∞)** (20, 11.1 m/s): regression | 0.9999 | 2.4e+2 | 373.47 ± 7.36 | -215.00 ± 3.56 | 8.06 ± 2.54 | -124.79 ± 15.63 | 359.72 ± 5.77 | -1.22 ± 0.02 | -3.58 ± 1.51 | 0.40 ± 0.13 | **ankle form** |
| kinematic b_kin (residual 0.0273) | | | 165.64 | -165.64 | 194.73 | 0.00 | 165.64 | -5.72 | 197.73 | 14.96 | |
| ankle form b_ank (residual 0.0379) | | | 398.02 | -223.28 | -3.00 | 0.00 | 398.02 | -1.37 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9996; ‖b̂ − b̄‖ / ‖b̄‖ 1.02) | | | 360.49 | -209.17 | 13.88 | -121.93 | 363.44 | -1.07 | 1.30 | 0.75 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 2.3e-11 (PASS); OLS residual 0.0120; VIF max 6303 | | | | | | | | | | | |
| **all ≥ 4 m/s** (59, 10.1 m/s): regression | 0.9994 | 7.6e+1 | 406.86 ± 4.68 | -226.14 ± 3.42 | -5.91 ± 0.85 | 43.10 ± 5.22 | 400.99 ± 5.88 | -1.39 ± 0.04 | -4.07 ± 0.64 | 0.03 ± 0.07 | **ankle form** |
| kinematic b_kin (residual 0.0179) | | | 164.55 | -164.55 | 168.28 | 0.00 | 164.55 | -5.72 | 171.28 | 14.90 | |
| ankle form b_ank (residual 0.0253) | | | 397.92 | -223.18 | -3.00 | 0.00 | 397.92 | -1.37 | 0.00 | 0.00 | |
| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² 0.9992; ‖b̂ − b̄‖ / ‖b̄‖ 1.16) | | | 410.29 | -228.34 | -6.26 | 45.22 | 409.20 | -1.22 | -4.33 | -0.02 | ankle form |
| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ 1.1e-12 (PASS); OLS residual 0.0240; VIF max 658 | | | | | | | | | | | |
