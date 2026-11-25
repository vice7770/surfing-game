# Stability full: build `&cueLater=on&plantFloor=6`

227 rides from 33 processes, 29.3 min with 4 at once. Times are seconds after the first standing frame; reserve is `balanceReserve` (red below 0.3); vW is the speed through the water, horizontal, m/s.

### The test wave, lying down (`testWave=catch`)

13 rides; 2 lasted 5 s; 11 fell (balance 11, wave 0, whitewater 0), 3 within 3 s.

| ride | stand vW (m/s) | fell at (s) | cause | twin vW +0.7 (m/s) | froth min (W) | lowest reserve | red (s) | warning (s) | recovery (s) | course +0.5 / +1.0 (deg, toward the steer) | peak yaw (deg/s, toward) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tw-catch:none:straight | 5.21 | 4.80 | balance | 6.06 | 0.00 | 0.000 | 0.18 | 0.18 |  |  |  |
| tw-catch:none:left | 5.21 | 3.50 | balance | 6.06 | 0.00 | 0.000 | 0.67 | 0.37 | 0.05 | 0.1 / 33.6 | 135.4 |
| tw-catch:none:right | 5.21 | 3.78 | balance | 6.06 | 0.00 | 0.000 | 0.48 | 0.25 | 0.03 | 0.3 / 32.8 | 123.9 |
| tw-catch:crouch:straight | 5.21 | 4.18 | balance | 6.06 | 0.00 | 0.038 | 0.32 | 0.00 |  |  |  |
| tw-catch:crouch:left | 5.21 | 1.80 | balance | 6.06 | 0.00 | 0.000 | 0.45 | 0.17 | fell | -5.5 / — | 278.2 |
| tw-catch:crouch:right | 5.21 | 3.30 | balance | 6.06 | 0.00 | 0.021 | 0.40 | 0.10 | 0.00 | 0.3 / 15.7 | 71.5 |
| tw-catch:compress:straight | 5.21 | > 5 |  | 6.06 |  | 0.000 | 0.48 |  |  |  |  |
| tw-catch:compress:left | 5.21 | 3.65 | balance | 6.06 | 0.00 | 0.000 | 0.70 | 0.33 | 0.00 | 0.3 / 6.3 | 163.6 |
| tw-catch:compress:right | 5.21 | 3.10 | balance | 6.06 | 0.00 | 0.000 | 0.53 | 0.12 | 0.02 | -3.9 / 2.0 | 172.0 |
| tw-catch:snap:straight | 5.21 | 3.67 | balance | 6.06 | 0.00 | 0.000 | 0.12 | 0.12 |  |  |  |
| tw-catch:snap:left | 5.21 | 1.90 | balance | 6.06 | 0.00 | 0.000 | 0.27 | 0.27 | fell | 12.4 / — | 148.6 |
| tw-catch:snap:right | 5.21 | 2.38 | balance | 6.06 | 0.00 | 0.192 | 0.12 | 0.12 | 0.00 | 3.5 / 0.5 | 129.1 |
| tw-catch:hisway | 5.21 | > 5 |  | 6.06 |  | 0.000 | 0.48 |  |  |  |  |

### The test wave, standing (`testWave=ride`)

13 rides; 0 lasted 5 s; 13 fell (balance 13, wave 0, whitewater 0).

| ride | stand vW (m/s) | fell at (s) | cause | twin vW +0.7 (m/s) | froth min (W) | lowest reserve | red (s) | warning (s) | recovery (s) | course +0.5 / +1.0 (deg, toward the steer) | peak yaw (deg/s, toward) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tw-ride:none:straight | 7.53 | 2.48 | balance | — | 0.00 | 0.000 | 0.40 | 0.23 |  |  |  |
| tw-ride:none:left | 7.53 | 3.67 | balance | — | 0.00 | 0.000 | 0.93 | 0.48 | 0.00 | -13.1 / -11.4 | 95.1 |
| tw-ride:none:right | 7.53 | 4.57 | balance | — | 0.00 | 0.000 | 1.02 | 0.22 | 0.00 | 8.9 / 23.3 | 128.5 |
| tw-ride:crouch:straight | 7.53 | 4.50 | balance | — | 0.00 | 0.000 | 0.38 | 0.15 |  |  |  |
| tw-ride:crouch:left | 7.53 | 1.67 | balance | — | 0.00 | 0.000 | 0.23 | 0.08 | fell | -3.7 / — | 116.7 |
| tw-ride:crouch:right | 7.53 | 1.92 | balance | — | 0.00 | 0.000 | 0.23 | 0.08 | fell | 1.8 / — | 179.3 |
| tw-ride:compress:straight | 7.53 | 4.82 | balance | — | 0.00 | 0.000 | 0.62 | 0.00 |  |  |  |
| tw-ride:compress:left | 7.53 | 1.70 | balance | — | 0.00 | 0.000 | 0.27 | 0.12 | fell | 0.6 / — | 93.8 |
| tw-ride:compress:right | 7.53 | 1.48 | balance | — | 0.00 | 0.000 | 0.25 | 0.10 | fell | — / — | 52.6 |
| tw-ride:snap:straight | 7.53 | 1.35 | balance | — | 0.00 | 0.000 | 0.47 | 0.25 |  |  |  |
| tw-ride:snap:left | 7.53 | 1.37 | balance | — | 0.00 | 0.000 | 0.42 | 0.20 | fell | — / — | 13.7 |
| tw-ride:snap:right | 7.53 | 1.25 | balance | — | 0.00 | 0.000 | 0.30 | 0.08 | fell | — / — | 30.6 |
| tw-ride:hisway | 7.53 | 4.82 | balance | — | 0.00 | 0.000 | 0.62 | 0.00 |  |  |  |

### Canyon B Medium, organic seeds 1–3

39 rides; 8 lasted 5 s; 31 fell (balance 14, wave 14, whitewater 3), 17 within 3 s.

| ride | stand vW (m/s) | fell at (s) | cause | twin vW +0.7 (m/s) | froth min (W) | lowest reserve | red (s) | warning (s) | recovery (s) | course +0.5 / +1.0 (deg, toward the steer) | peak yaw (deg/s, toward) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| med:s1:w6:hisway | 4.90 | > 5 |  | 6.21 |  | 0.000 | 0.42 |  |  |  |  |
| med:s1:w6:none:left | 4.90 | 3.55 | balance | 6.21 | 0.00 | 0.000 | 0.65 | 0.30 | 0.05 | 0.3 / 28.6 | 130.3 |
| med:s1:w6:none:right | 4.90 | 3.72 | balance | 6.21 | 0.00 | 0.000 | 0.50 | 0.22 | 0.07 | 1.3 / 26.0 | 124.9 |
| med:s1:w8:hisway | 3.76 | 1.13 | wave | 0.97 | -0.10 | 0.000 | 0.35 | 0.35 |  |  |  |
| med:s1:w8:none:left | 3.76 | 0.90 | wave | 0.97 | -0.10 | 0.000 | 0.22 | 0.22 | fell | — / — | — |
| med:s1:w8:none:right | 3.76 | 0.90 | wave | 0.97 | -0.10 | 0.000 | 0.22 | 0.22 | fell | — / — | — |
| med:s1:w10:hisway | 4.47 | > 5 |  | 5.07 |  | 0.377 | 0.00 |  |  |  |  |
| med:s1:w10:none:left | 4.47 | 3.88 | balance | 5.07 | -0.03 | 0.000 | 0.68 | 0.52 | 0.07 | 1.3 / 24.4 | 124.8 |
| med:s1:w10:none:right | 4.47 | 4.62 | balance | 5.07 | -0.01 | 0.000 | 0.48 | 0.48 | 0.00 | -0.6 / 18.0 | 102.3 |
| med:s2:w1:hisway | 4.83 | 3.63 | wave | 1.95 | -0.09 | 0.000 | 0.28 | 0.28 |  |  |  |
| med:s2:w1:none:left | 4.83 | 2.75 | wave | 1.95 | -0.10 | 0.000 | 0.27 | 0.08 | 0.02 | 5.2 / 4.7 | 207.6 |
| med:s2:w1:none:right | 4.83 | 2.62 | wave | 1.95 | -0.10 | 0.024 | 0.18 | 0.07 | 0.10 | 4.5 / 2.9 | 152.8 |
| med:s2:w2:hisway | 6.20 | > 5 |  | 6.51 |  | 0.149 | 0.05 |  |  |  |  |
| med:s2:w2:none:left | 6.20 | 3.18 | balance | 6.51 | -0.00 | 0.000 | 0.55 | 0.30 | 0.15 | 0.9 / 23.5 | 106.9 |
| med:s2:w2:none:right | 6.20 | 3.12 | balance | 6.51 | 0.00 | 0.000 | 0.73 | 0.43 | 0.23 | 1.2 / 23.9 | 109.9 |
| med:s2:w5:hisway | 4.10 | 2.68 | whitewater | 3.92 | -0.12 | 0.031 | 0.12 | 0.12 |  |  |  |
| med:s2:w5:none:left | 4.10 | 2.42 | balance | 3.92 | -0.10 | 0.000 | 0.37 | 0.37 | 0.00 | -13.9 / -6.6 | 61.9 |
| med:s2:w5:none:right | 4.10 | 2.28 | balance | 3.92 | -0.04 | 0.000 | 0.48 | 0.48 | fell | 4.9 / 8.5 | 53.5 |
| med:s2:w6:hisway | 5.21 | > 5 |  | 4.05 |  | 0.000 | 0.37 |  |  |  |  |
| med:s2:w6:none:left | 5.21 | 3.18 | whitewater | 4.05 | -0.14 | 0.000 | 0.68 | 0.27 | 0.00 | 0.8 / 6.7 | 169.3 |
| med:s2:w6:none:right | 5.21 | 3.97 | whitewater | 4.05 | -0.15 | 0.000 | 0.63 | 0.43 | 0.00 | 3.0 / 13.6 | 106.8 |
| med:s2:w10:hisway | 4.32 | 0.95 | wave | 0.92 | -0.36 | 0.030 | 0.10 | 0.08 |  |  |  |
| med:s2:w10:none:left | 4.32 | 0.72 | wave | 0.92 | -0.25 | 0.000 | 0.17 | 0.17 | fell | — / — | — |
| med:s2:w10:none:right | 4.32 | 0.72 | wave | 0.92 | -0.25 | 0.000 | 0.17 | 0.17 | fell | — / — | — |
| med:s2:w11:hisway | 6.23 | > 5 |  | 6.72 |  | 0.000 | 0.48 |  |  |  |  |
| med:s2:w11:none:left | 6.23 | 3.00 | balance | 6.72 | 0.00 | 0.000 | 0.75 | 0.35 | 0.20 | 0.5 / 28.0 | 142.1 |
| med:s2:w11:none:right | 6.23 | 2.98 | balance | 6.72 | 0.00 | 0.000 | 0.70 | 0.33 | 0.20 | 0.7 / 28.3 | 145.8 |
| med:s3:w5:hisway | 5.48 | > 5 |  | — |  | 0.000 | 0.45 |  |  |  |  |
| med:s3:w5:none:left | 5.48 | 2.98 | wave | — | 0.00 | 0.000 | 0.38 | 0.12 | 0.18 | 1.6 / 32.5 | 180.8 |
| med:s3:w5:none:right | 5.48 | 3.03 | wave | — | 0.00 | 0.000 | 0.35 | 0.13 | 0.15 | 1.3 / 32.3 | 157.2 |
| med:s3:w6:hisway | 4.36 | > 5 |  | 4.68 |  | 0.443 | 0.00 |  |  |  |  |
| med:s3:w6:none:left | 4.36 | 3.90 | balance | 4.68 | 0.00 | 0.000 | 0.45 | 0.22 | 0.18 | -2.9 / 21.9 | 152.6 |
| med:s3:w6:none:right | 4.36 | 4.27 | balance | 4.68 | 0.00 | 0.000 | 0.53 | 0.27 | 0.23 | -2.8 / 21.3 | 151.3 |
| med:s3:w9:hisway | 4.34 | 0.92 | wave | 2.91 | -0.16 | 0.000 | 0.15 | 0.15 |  |  |  |
| med:s3:w9:none:left | 4.34 | 0.92 | wave | 2.91 | -0.16 | 0.000 | 0.18 | 0.18 | fell | — / — | — |
| med:s3:w9:none:right | 4.34 | 0.92 | wave | 2.91 | -0.16 | 0.000 | 0.18 | 0.18 | fell | — / — | — |
| med:s3:w12:hisway | 4.45 | > 5 |  | 5.33 |  | 0.363 | 0.00 |  |  |  |  |
| med:s3:w12:none:left | 4.45 | 4.02 | balance | 5.33 | -0.04 | 0.000 | 0.65 | 0.40 | 0.23 | -0.8 / 15.4 | 86.8 |
| med:s3:w12:none:right | 4.45 | 4.02 | balance | 5.33 | -0.01 | 0.000 | 0.43 | 0.10 | 0.20 | -1.0 / 16.7 | 138.1 |

### Canyon B at the Big swell (Hs 2.4 m, Tp 14 s), organic seeds 1–3

162 rides; 27 lasted 5 s; 135 fell (balance 77, wave 54, whitewater 4), 108 within 3 s.

| ride | stand vW (m/s) | fell at (s) | cause | twin vW +0.7 (m/s) | froth min (W) | lowest reserve | red (s) | warning (s) | recovery (s) | course +0.5 / +1.0 (deg, toward the steer) | peak yaw (deg/s, toward) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| big:s1:w5:hisway | 5.86 | > 5 |  | 7.13 |  | 0.391 | 0.00 |  |  |  |  |
| big:s1:w5:none:left | 5.86 | 2.17 | balance | 7.13 | 0.00 | 0.000 | 0.63 | 0.30 | fell | -3.1 / 21.1 | 161.0 |
| big:s1:w5:none:right | 5.86 | 1.88 | balance | 7.13 | 0.00 | 0.000 | 0.33 | 0.15 | fell | 3.2 / — | 81.9 |
| big:s1:w5:crouch:left | 5.86 | 1.97 | balance | 7.13 | 0.00 | 0.076 | 0.23 | 0.02 | fell | -3.2 / — | 73.3 |
| big:s1:w5:crouch:right | 5.86 | 1.88 | balance | 7.13 | 0.00 | 0.076 | 0.25 | 0.03 | fell | 2.0 / — | 83.0 |
| big:s1:w5:compress:left | 5.86 | 1.52 | balance | 7.13 | 0.00 | 0.000 | 0.07 | 0.07 | fell | -13.2 / — | 84.4 |
| big:s1:w5:compress:right | 5.86 | 1.78 | balance | 7.13 | 0.00 | 0.000 | 0.28 | 0.10 | fell | 8.2 / — | 121.5 |
| big:s1:w5:snap:left | 5.86 | 2.07 | balance | 7.13 | 0.00 | 0.102 | 0.13 | 0.03 | 0.00 | -6.8 / 8.4 | 55.0 |
| big:s1:w5:snap:right | 5.86 | 1.92 | balance | 7.13 | 0.00 | 0.000 | 0.33 | 0.23 | fell | -0.1 / — | 95.0 |
| big:s1:w6:hisway | 5.13 | 4.70 | balance | 6.15 | 0.00 | 0.000 | 0.15 | 0.15 |  |  |  |
| big:s1:w6:none:left | 5.13 | 3.15 | balance | 6.15 | 0.00 | 0.000 | 0.80 | 0.22 | 0.25 | 1.2 / 19.3 | 138.1 |
| big:s1:w6:none:right | 5.13 | 4.32 | balance | 6.15 | 0.00 | 0.000 | 0.97 | 0.43 | 0.00 | 1.6 / 16.6 | 103.8 |
| big:s1:w6:crouch:left | 5.13 | 4.87 | balance | 6.15 | 0.00 | 0.000 | 0.70 | 0.25 | 0.00 | -1.2 / 11.0 | 126.0 |
| big:s1:w6:crouch:right | 5.13 | 2.28 | balance | 6.15 | 0.00 | 0.076 | 0.42 | 0.03 | 0.02 | 1.0 / 7.7 | 123.6 |
| big:s1:w6:compress:left | 5.13 | 4.77 | balance | 6.15 | 0.00 | 0.027 | 0.40 | 0.10 | 0.03 | 1.2 / 12.6 | 123.6 |
| big:s1:w6:compress:right | 5.13 | 4.65 | balance | 6.15 | 0.00 | 0.000 | 0.30 | 0.08 | 0.13 | 0.3 / 13.5 | 90.7 |
| big:s1:w6:snap:left | 5.13 | 2.25 | balance | 6.15 | 0.00 | 0.026 | 0.22 | 0.22 | 0.00 | 3.0 / 4.1 | 151.0 |
| big:s1:w6:snap:right | 5.13 | 1.87 | balance | 6.15 | 0.00 | 0.000 | 0.30 | 0.32 | fell | 6.4 / — | 109.8 |
| big:s1:w8:hisway | 3.96 | 1.75 | wave | 3.07 | 0.00 | 0.019 | 0.38 | 0.38 |  |  |  |
| big:s1:w8:none:left | 3.96 | 1.70 | wave | 3.07 | 0.00 | 0.000 | 0.13 | 0.13 | fell | -3.0 / — | 68.9 |
| big:s1:w8:none:right | 3.96 | 1.70 | wave | 3.07 | 0.00 | 0.000 | 0.13 | 0.13 | fell | 3.0 / — | -1.9 |
| big:s1:w8:crouch:left | 3.96 | 1.82 | wave | 3.07 | 0.00 | 0.000 | 0.17 | 0.18 | fell | -13.3 / — | 61.9 |
| big:s1:w8:crouch:right | 3.96 | 1.82 | wave | 3.07 | 0.00 | 0.000 | 0.17 | 0.18 | fell | 13.3 / — | 82.8 |
| big:s1:w8:compress:left | 3.96 | 1.72 | wave | 3.07 | 0.00 | 0.021 | 0.35 | 0.35 | fell | -5.9 / — | 13.6 |
| big:s1:w8:compress:right | 3.96 | 1.72 | wave | 3.07 | 0.00 | 0.021 | 0.35 | 0.35 | fell | 5.9 / — | 205.0 |
| big:s1:w8:snap:left | 3.96 | 1.90 | wave | 3.07 | 0.00 | 0.000 | 0.17 | 0.00 | fell | 1.0 / — | 146.3 |
| big:s1:w8:snap:right | 3.96 | 1.60 | wave | 3.07 | 0.00 | 0.112 | 0.27 | 0.27 | fell | -10.7 / — | 30.3 |
| big:s1:w9:hisway | 6.39 | > 5 |  | 7.32 |  | 0.251 | 0.07 |  |  |  |  |
| big:s1:w9:none:left | 6.39 | 2.95 | balance | 7.32 | 0.00 | 0.000 | 0.95 | 0.17 | 0.00 | -0.8 / 12.7 | 176.7 |
| big:s1:w9:none:right | 6.39 | 3.48 | balance | 7.32 | 0.00 | 0.000 | 1.38 | 0.13 | 0.00 | 1.1 / 8.6 | 133.2 |
| big:s1:w9:crouch:left | 6.39 | 1.87 | balance | 7.32 | 0.00 | 0.000 | 0.28 | 0.07 | fell | -4.4 / — | 135.2 |
| big:s1:w9:crouch:right | 6.39 | 1.90 | balance | 7.32 | 0.00 | 0.000 | 0.38 | 0.17 | fell | 2.1 / — | 180.6 |
| big:s1:w9:compress:left | 6.39 | 1.55 | balance | 7.32 | 0.00 | 0.000 | 0.07 | 0.07 | fell | -10.8 / — | 79.4 |
| big:s1:w9:compress:right | 6.39 | 1.95 | balance | 7.32 | 0.00 | 0.000 | 0.23 | 0.15 | fell | 6.6 / — | 194.7 |
| big:s1:w9:snap:left | 6.39 | 2.22 | balance | 7.32 | 0.00 | 0.016 | 0.45 | 0.45 | fell | -5.6 / 14.7 | 118.2 |
| big:s1:w9:snap:right | 6.39 | 2.95 | balance | 7.32 | 0.00 | 0.000 | 0.90 | 0.57 | 0.00 | -0.6 / 14.1 | 142.3 |
| big:s1:w11:hisway | 5.85 | > 5 |  | 6.90 |  | 0.330 | 0.00 |  |  |  |  |
| big:s1:w11:none:left | 5.85 | 3.60 | balance | 6.90 | 0.00 | 0.000 | 0.73 | 0.15 | 0.00 | 1.9 / 19.9 | 128.5 |
| big:s1:w11:none:right | 5.85 | 3.77 | balance | 6.90 | 0.00 | 0.000 | 0.90 | 0.23 | 0.00 | 2.2 / 19.9 | 120.2 |
| big:s1:w11:crouch:left | 5.85 | > 5 |  | 6.90 |  | 0.043 | 0.40 |  | 0.00 | 0.8 / 7.8 | 98.2 |
| big:s1:w11:crouch:right | 5.85 | 4.68 | balance | 6.90 | 0.00 | 0.039 | 0.63 | 0.03 | 0.00 | 1.1 / 6.9 | 125.5 |
| big:s1:w11:compress:left | 5.85 | 3.77 | balance | 6.90 | 0.00 | 0.000 | 0.58 | 0.08 | 0.07 | -1.9 / 12.4 | 154.7 |
| big:s1:w11:compress:right | 5.85 | > 5 |  | 6.90 |  | 0.242 | 0.18 |  | 0.13 | 2.4 / 14.4 | 82.6 |
| big:s1:w11:snap:left | 5.85 | 1.85 | balance | 6.90 | 0.00 | 0.000 | 0.33 | 0.33 | fell | 8.5 / — | 111.3 |
| big:s1:w11:snap:right | 5.85 | 2.27 | balance | 6.90 | 0.00 | 0.013 | 0.20 | 0.20 | 0.00 | 3.3 / 3.0 | 277.6 |
| big:s1:w13:hisway | 4.04 | 1.63 | wave | 3.38 | 0.00 | 0.000 | 0.32 | 0.32 |  |  |  |
| big:s1:w13:none:left | 4.04 | 1.52 | wave | 3.38 | 0.00 | 0.000 | 0.33 | 0.33 | fell | -0.9 / — | 22.1 |
| big:s1:w13:none:right | 4.04 | 1.52 | wave | 3.38 | 0.00 | 0.000 | 0.33 | 0.33 | fell | 0.9 / — | 64.0 |
| big:s1:w13:crouch:left | 4.04 | 1.57 | wave | 3.38 | 0.00 | 0.041 | 0.20 | 0.20 | fell | 9.5 / — | 25.4 |
| big:s1:w13:crouch:right | 4.04 | 1.60 | wave | 3.38 | 0.00 | 0.022 | 0.23 | 0.23 | fell | -8.8 / — | 61.7 |
| big:s1:w13:compress:left | 4.04 | 1.45 | wave | 3.38 | 0.00 | 0.000 | 0.17 | 0.17 | fell | — / — | 56.1 |
| big:s1:w13:compress:right | 4.04 | 1.50 | wave | 3.38 | 0.00 | 0.000 | 0.20 | 0.20 | fell | — / — | 59.0 |
| big:s1:w13:snap:left | 4.04 | 1.63 | wave | 3.38 | 0.00 | 0.000 | 0.33 | 0.33 | fell | 0.2 / — | 152.8 |
| big:s1:w13:snap:right | 4.04 | 1.63 | wave | 3.38 | 0.00 | 0.000 | 0.35 | 0.35 | fell | 13.7 / — | 192.4 |
| big:s2:w5:hisway | 3.78 | 1.50 | wave | — | -0.20 | 0.000 | 0.25 | 0.25 |  |  |  |
| big:s2:w5:none:left | 3.78 | 1.48 | wave | — | -0.19 | 0.000 | 0.50 | 0.50 | fell | — / — | 44.4 |
| big:s2:w5:none:right | 3.78 | 1.48 | wave | — | -0.19 | 0.000 | 0.50 | 0.50 | fell | — / — | 29.3 |
| big:s2:w5:crouch:left | 3.78 | 1.35 | wave | — | -0.20 | 0.074 | 0.03 | 0.03 | fell | — / — | -36.5 |
| big:s2:w5:crouch:right | 3.78 | 1.35 | wave | — | -0.20 | 0.074 | 0.03 | 0.03 | fell | — / — | 79.0 |
| big:s2:w5:compress:left | 3.78 | 1.60 | wave | — | -0.19 | 0.000 | 0.43 | 0.43 | fell | -7.4 / — | 51.0 |
| big:s2:w5:compress:right | 3.78 | 1.60 | wave | — | -0.19 | 0.000 | 0.43 | 0.43 | fell | 7.4 / — | 49.9 |
| big:s2:w5:snap:left | 3.78 | 1.25 | wave | — | -0.19 | 0.000 | 0.30 | 0.30 | fell | — / — | 42.2 |
| big:s2:w5:snap:right | 3.78 | 1.25 | wave | — | -0.19 | 0.000 | 0.30 | 0.30 | fell | — / — | 28.3 |
| big:s2:w6:hisway | 5.66 | > 5 |  | 6.42 |  | 0.365 | 0.00 |  |  |  |  |
| big:s2:w6:none:left | 5.66 | 3.05 | balance | 6.42 | 0.00 | 0.000 | 0.68 | 0.12 | 0.00 | 2.0 / 17.2 | 124.0 |
| big:s2:w6:none:right | 5.66 | 3.67 | balance | 6.42 | 0.00 | 0.000 | 0.80 | 0.25 | 0.27 | 1.0 / 17.4 | 126.1 |
| big:s2:w6:crouch:left | 5.66 | 2.15 | balance | 6.42 | 0.00 | 0.000 | 0.30 | 0.02 | 0.00 | -1.6 / 4.5 | 111.5 |
| big:s2:w6:crouch:right | 5.66 | > 5 |  | 6.42 |  | 0.000 | 0.45 |  | 0.05 | 1.8 / 11.6 | 118.1 |
| big:s2:w6:compress:left | 5.66 | 4.28 | balance | 6.42 | 0.00 | 0.000 | 0.77 | 0.32 | 0.03 | 0.1 / 9.7 | 157.4 |
| big:s2:w6:compress:right | 5.66 | > 5 |  | 6.42 |  | 0.265 | 0.17 |  | 0.08 | 0.2 / 11.2 | 74.7 |
| big:s2:w6:snap:left | 5.66 | 1.87 | balance | 6.42 | 0.00 | 0.000 | 0.23 | 0.13 | fell | 6.5 / — | 87.7 |
| big:s2:w6:snap:right | 5.66 | 2.15 | balance | 6.42 | 0.00 | 0.020 | 0.17 | 0.17 | fell | 1.2 / 1.8 | 140.7 |
| big:s2:w10:hisway | 5.75 | > 5 |  | 6.08 |  | 0.283 | 0.03 |  |  |  |  |
| big:s2:w10:none:left | 5.75 | 2.48 | balance | 6.08 | 0.00 | 0.000 | 0.63 | 0.30 | 0.05 | 1.2 / 12.4 | 177.0 |
| big:s2:w10:none:right | 5.75 | 2.18 | balance | 6.08 | 0.00 | 0.000 | 0.50 | 0.28 | fell | -0.8 / 14.4 | 106.4 |
| big:s2:w10:crouch:left | 5.75 | 1.55 | balance | 6.08 | 0.00 | 0.000 | 0.28 | 0.05 | fell | -11.3 / — | 63.8 |
| big:s2:w10:crouch:right | 5.75 | 2.13 | balance | 6.08 | 0.00 | 0.000 | 0.43 | 0.25 | 0.03 | 2.4 / 6.2 | 116.2 |
| big:s2:w10:compress:left | 5.75 | 1.58 | balance | 6.08 | 0.00 | 0.000 | 0.05 | 0.05 | fell | -4.3 / — | 110.9 |
| big:s2:w10:compress:right | 5.75 | 1.88 | balance | 6.08 | 0.00 | 0.000 | 0.25 | 0.12 | fell | -1.0 / — | 122.8 |
| big:s2:w10:snap:left | 5.75 | 2.00 | balance | 6.08 | 0.00 | 0.000 | 0.18 | 0.18 | fell | 1.0 / — | 51.1 |
| big:s2:w10:snap:right | 5.75 | 2.07 | balance | 6.08 | 0.00 | 0.000 | 0.38 | 0.38 | fell | 4.7 / 1.9 | 500.1 |
| big:s2:w12:hisway | 5.66 | 2.12 | wave | 3.27 | -0.38 | 0.005 | 0.20 | 0.20 |  |  |  |
| big:s2:w12:none:left | 5.66 | 0.93 | wave | 3.27 | -0.13 | 0.000 | 0.35 | 0.35 | fell | — / — | — |
| big:s2:w12:none:right | 5.66 | 0.93 | wave | 3.27 | -0.13 | 0.000 | 0.35 | 0.35 | fell | — / — | — |
| big:s2:w12:crouch:left | 5.66 | 2.87 | wave | 3.27 | -0.36 | 0.128 | 0.45 | 0.28 | 0.00 | -1.0 / -0.6 | 88.6 |
| big:s2:w12:crouch:right | 5.66 | 3.00 | wave | 3.27 | -0.35 | 0.000 | 0.67 | 0.50 | 0.00 | 1.5 / 15.9 | 115.0 |
| big:s2:w12:compress:left | 5.66 | 2.83 | wave | 3.27 | -0.38 | 0.010 | 0.08 | 0.08 | 0.00 | -3.2 / 5.8 | 95.9 |
| big:s2:w12:compress:right | 5.66 | 3.23 | wave | 3.27 | -0.37 | 0.015 | 0.27 | 0.27 | 0.00 | 3.4 / 15.9 | 67.7 |
| big:s2:w12:snap:left | 5.66 | 2.55 | wave | 3.27 | -0.28 | 0.000 | 0.30 | 0.30 | 0.00 | -1.5 / 15.1 | 90.6 |
| big:s2:w12:snap:right | 5.66 | 2.55 | wave | 3.27 | -0.28 | 0.000 | 0.35 | 0.35 | 0.00 | 1.0 / 18.4 | 101.3 |
| big:s2:w15:hisway | 5.75 | > 5 |  | 5.74 |  | 0.305 | 0.00 |  |  |  |  |
| big:s2:w15:none:left | 5.75 | > 5 |  | 5.74 |  | 0.078 | 0.18 |  | 0.03 | -0.1 / 9.3 | 108.6 |
| big:s2:w15:none:right | 5.75 | > 5 |  | 5.74 |  | 0.077 | 0.37 |  | 0.20 | -0.1 / 13.5 | 106.4 |
| big:s2:w15:crouch:left | 5.75 | 2.02 | balance | 5.74 | 0.00 | 0.007 | 0.32 | 0.10 | fell | -2.7 / -3.0 | 99.9 |
| big:s2:w15:crouch:right | 5.75 | 1.67 | balance | 5.74 | 0.00 | 0.047 | 0.33 | 0.18 | fell | -9.6 / — | 112.2 |
| big:s2:w15:compress:left | 5.75 | 2.55 | balance | 5.74 | 0.00 | 0.044 | 0.10 | 0.05 | 0.00 | -5.1 / 4.5 | 102.0 |
| big:s2:w15:compress:right | 5.75 | > 5 |  | 5.74 |  | 0.187 | 0.27 |  | 0.00 | -3.0 / 10.0 | 112.9 |
| big:s2:w15:snap:left | 5.75 | 2.28 | balance | 5.74 | 0.00 | 0.000 | 0.38 | 0.38 | fell | 2.4 / -7.3 | 134.6 |
| big:s2:w15:snap:right | 5.75 | 2.98 | balance | 5.74 | 0.00 | 0.095 | 0.28 | 0.05 | 0.17 | 2.5 / 18.1 | 234.3 |
| big:s2:w16:hisway | 4.94 | 3.93 | wave | 2.59 | -0.05 | 0.000 | 0.13 | 0.13 |  |  |  |
| big:s2:w16:none:left | 4.94 | 3.65 | wave | 2.59 | -0.05 | 0.000 | 0.43 | 0.43 | 0.00 | 4.0 / 6.6 | 94.0 |
| big:s2:w16:none:right | 4.94 | 3.60 | wave | 2.59 | -0.05 | 0.000 | 0.48 | 0.42 | 0.00 | 3.1 / 4.8 | 118.7 |
| big:s2:w16:crouch:left | 4.94 | 3.87 | wave | 2.59 | -0.05 | 0.160 | 0.35 | 0.30 | 0.00 | 0.6 / 5.4 | 31.8 |
| big:s2:w16:crouch:right | 4.94 | 3.78 | wave | 2.59 | -0.05 | 0.034 | 0.28 | 0.00 | 0.00 | -0.1 / 4.8 | 42.3 |
| big:s2:w16:compress:left | 4.94 | 3.73 | wave | 2.59 | -0.05 | 0.000 | 0.25 | 0.25 | 0.00 | 1.1 / 1.1 | 100.6 |
| big:s2:w16:compress:right | 4.94 | 4.02 | wave | 2.59 | -0.05 | 0.000 | 0.28 | 0.28 | 0.00 | 1.2 / 1.4 | 91.9 |
| big:s2:w16:snap:left | 4.94 | 2.62 | wave | 2.59 | -0.04 | 0.000 | 0.47 | 0.47 | 0.00 | 4.1 / 1.8 | 78.7 |
| big:s2:w16:snap:right | 4.94 | 2.92 | wave | 2.59 | -0.04 | 0.043 | 0.10 | 0.10 | 0.00 | 3.1 / 12.3 | 81.3 |
| big:s3:w3:hisway | 5.07 | > 5 |  | 3.80 |  | 0.350 | 0.00 |  |  |  |  |
| big:s3:w3:none:left | 5.07 | 4.17 | whitewater | 3.80 | -0.27 | 0.000 | 0.42 | 0.42 | 0.00 | -3.6 / 6.3 | 50.1 |
| big:s3:w3:none:right | 5.07 | 3.67 | whitewater | 3.80 | -0.24 | 0.000 | 0.78 | 0.43 | 0.00 | 2.5 / 13.5 | 90.4 |
| big:s3:w3:crouch:left | 5.07 | > 5 |  | 3.80 |  | 0.236 | 0.10 |  | 0.00 | -2.2 / 6.0 | 53.0 |
| big:s3:w3:crouch:right | 5.07 | > 5 |  | 3.80 |  | 0.236 | 0.10 |  | 0.00 | 1.5 / 8.7 | 27.1 |
| big:s3:w3:compress:left | 5.07 | > 5 |  | 3.80 |  | 0.350 | 0.00 |  | 0.00 | -2.1 / 8.1 | 53.7 |
| big:s3:w3:compress:right | 5.07 | > 5 |  | 3.80 |  | 0.350 | 0.00 |  | 0.00 | 0.6 / 11.6 | 36.8 |
| big:s3:w3:snap:left | 5.07 | 3.15 | whitewater | 3.80 | -0.11 | 0.000 | 0.52 | 0.20 | 0.00 | 0.5 / 13.7 | 90.5 |
| big:s3:w3:snap:right | 5.07 | 3.50 | whitewater | 3.80 | -0.12 | 0.035 | 0.28 | 0.17 | 0.00 | 3.2 / 18.9 | 77.4 |
| big:s3:w6:hisway | 4.50 | > 5 |  | 4.30 |  | 0.394 | 0.00 |  |  |  |  |
| big:s3:w6:none:left | 4.50 | > 5 |  | 4.30 |  | 0.038 | 0.22 |  | 0.00 | -1.0 / 11.5 | 141.8 |
| big:s3:w6:none:right | 4.50 | 2.83 | balance | 4.30 | 0.00 | 0.000 | 0.43 | 0.13 | 0.00 | -2.6 / 6.8 | 206.3 |
| big:s3:w6:crouch:left | 4.50 | 2.53 | balance | 4.30 | 0.00 | 0.000 | 0.08 | 0.08 | 0.00 | 0.3 / 3.3 | 172.6 |
| big:s3:w6:crouch:right | 4.50 | 2.22 | balance | 4.30 | 0.00 | 0.000 | 0.12 | 0.12 | 0.00 | -0.8 / 3.4 | 196.4 |
| big:s3:w6:compress:left | 4.50 | 2.65 | balance | 4.30 | 0.00 | 0.000 | 0.15 | 0.15 | 0.00 | -1.6 / 6.2 | 157.9 |
| big:s3:w6:compress:right | 4.50 | 2.65 | balance | 4.30 | 0.00 | 0.000 | 0.28 | 0.23 | 0.00 | -0.7 / 2.6 | 212.3 |
| big:s3:w6:snap:left | 4.50 | 2.37 | balance | 4.30 | 0.00 | 0.000 | 0.05 | 0.05 | 0.00 | 0.9 / 22.1 | 217.3 |
| big:s3:w6:snap:right | 4.50 | 2.37 | balance | 4.30 | 0.00 | 0.000 | 0.07 | 0.07 | 0.00 | -0.3 / 13.6 | 267.4 |
| big:s3:w7:hisway | 4.65 | > 5 |  | 4.92 |  | 0.362 | 0.00 |  |  |  |  |
| big:s3:w7:none:left | 4.65 | > 5 |  | 4.92 |  | 0.082 | 0.48 |  | 0.17 | 1.9 / 14.9 | 115.2 |
| big:s3:w7:none:right | 4.65 | > 5 |  | 4.92 |  | 0.084 | 0.27 |  | 0.12 | -2.6 / 6.9 | 77.7 |
| big:s3:w7:crouch:left | 4.65 | 1.72 | balance | 4.92 | 0.00 | 0.000 | 0.38 | 0.22 | fell | -14.3 / — | 94.6 |
| big:s3:w7:crouch:right | 4.65 | 1.85 | balance | 4.92 | 0.00 | 0.000 | 0.25 | 0.08 | fell | -4.0 / — | 108.8 |
| big:s3:w7:compress:left | 4.65 | 1.83 | balance | 4.92 | 0.00 | 0.000 | 0.27 | 0.27 | fell | 5.3 / — | 129.7 |
| big:s3:w7:compress:right | 4.65 | 1.55 | balance | 4.92 | 0.00 | 0.000 | 0.12 | 0.12 | fell | -13.6 / — | 49.6 |
| big:s3:w7:snap:left | 4.65 | 2.07 | balance | 4.92 | 0.00 | 0.089 | 0.25 | 0.02 | 0.00 | 2.8 / 17.3 | 138.4 |
| big:s3:w7:snap:right | 4.65 | 2.22 | balance | 4.92 | 0.00 | 0.000 | 0.38 | 0.38 | fell | 2.7 / -5.8 | 175.5 |
| big:s3:w9:hisway | 6.09 | > 5 |  | 5.99 |  | 0.322 | 0.00 |  |  |  |  |
| big:s3:w9:none:left | 6.09 | > 5 |  | 5.99 |  | 0.138 | 0.38 |  | 0.22 | 1.4 / 14.7 | 104.8 |
| big:s3:w9:none:right | 6.09 | > 5 |  | 5.99 |  | 0.000 | 0.13 |  | 0.00 | -0.8 / 6.2 | 112.9 |
| big:s3:w9:crouch:left | 6.09 | 1.75 | balance | 5.99 | 0.00 | 0.000 | 0.42 | 0.22 | fell | -7.6 / — | 104.5 |
| big:s3:w9:crouch:right | 6.09 | 1.52 | balance | 5.99 | 0.00 | 0.000 | 0.30 | 0.10 | fell | -9.8 / — | 53.1 |
| big:s3:w9:compress:left | 6.09 | 1.55 | balance | 5.99 | 0.00 | 0.000 | 0.07 | 0.07 | fell | -11.5 / — | 67.6 |
| big:s3:w9:compress:right | 6.09 | 1.83 | balance | 5.99 | 0.00 | 0.000 | 0.23 | 0.23 | fell | 2.9 / — | 88.8 |
| big:s3:w9:snap:left | 6.09 | 3.68 | balance | 5.99 | 0.00 | 0.000 | 0.67 | 0.32 | 0.00 | 5.5 / 15.9 | 155.9 |
| big:s3:w9:snap:right | 6.09 | 2.17 | balance | 5.99 | 0.00 | 0.000 | 0.28 | 0.28 | fell | 3.2 / -5.6 | 101.7 |
| big:s3:w10:hisway | 3.23 | 1.28 | wave | 0.87 | -0.36 | 0.000 | 0.23 | 0.23 |  |  |  |
| big:s3:w10:none:left | 3.23 | 1.33 | wave | 0.87 | -0.37 | 0.000 | 0.42 | 0.42 | fell | — / — | 52.2 |
| big:s3:w10:none:right | 3.23 | 1.33 | wave | 0.87 | -0.37 | 0.000 | 0.42 | 0.42 | fell | — / — | -9.2 |
| big:s3:w10:crouch:left | 3.23 | 1.22 | wave | 0.87 | -0.36 | 0.027 | 0.17 | 0.17 | fell | — / — | -6.8 |
| big:s3:w10:crouch:right | 3.23 | 1.22 | wave | 0.87 | -0.36 | 0.027 | 0.17 | 0.17 | fell | — / — | 59.2 |
| big:s3:w10:compress:left | 3.23 | 1.23 | wave | 0.87 | -0.36 | 0.000 | 0.25 | 0.25 | fell | — / — | 56.4 |
| big:s3:w10:compress:right | 3.23 | 1.23 | wave | 0.87 | -0.36 | 0.000 | 0.25 | 0.25 | fell | — / — | 2.8 |
| big:s3:w10:snap:left | 3.23 | 1.07 | wave | 0.87 | -0.37 | 0.040 | 0.13 | 0.13 | fell | — / — | -60.4 |
| big:s3:w10:snap:right | 3.23 | 1.08 | wave | 0.87 | -0.37 | 0.003 | 0.15 | 0.15 | fell | — / — | 77.2 |
| big:s3:w13:hisway | 5.30 | > 5 |  | 5.95 |  | 0.325 | 0.00 |  |  |  |  |
| big:s3:w13:none:left | 5.30 | 2.32 | balance | 5.95 | 0.00 | 0.000 | 0.38 | 0.02 | 0.17 | -0.5 / 13.3 | 86.6 |
| big:s3:w13:none:right | 5.30 | 2.35 | balance | 5.95 | 0.00 | 0.000 | 0.53 | 0.03 | 0.20 | 0.8 / 15.2 | 101.7 |
| big:s3:w13:crouch:left | 5.30 | 1.90 | balance | 5.95 | 0.00 | 0.000 | 0.35 | 0.10 | fell | -2.9 / — | 88.3 |
| big:s3:w13:crouch:right | 5.30 | 1.62 | balance | 5.95 | 0.00 | 0.000 | 0.23 | 0.07 | fell | -5.8 / — | 58.8 |
| big:s3:w13:compress:left | 5.30 | 1.58 | balance | 5.95 | 0.00 | 0.000 | 0.05 | 0.05 | fell | -6.1 / — | 121.9 |
| big:s3:w13:compress:right | 5.30 | 1.90 | balance | 5.95 | 0.00 | 0.000 | 0.32 | 0.12 | fell | 1.2 / — | 140.9 |
| big:s3:w13:snap:left | 5.30 | 2.03 | balance | 5.95 | 0.00 | 0.000 | 0.15 | 0.15 | fell | 3.0 / -2.8 | 67.7 |
| big:s3:w13:snap:right | 5.30 | 1.88 | balance | 5.95 | 0.00 | 0.000 | 0.18 | 0.18 | fell | 4.8 / — | 112.9 |

## Against the baseline (full, build `&cueLater=on&plantFloor=6`, 2026-11-25T14:16:30.940Z)

| group | balance falls (now / baseline) | wave | whitewater | lasted 5 s |
| --- | --- | --- | --- | --- |
| tw-catch | 11 / 11 | 0 / 0 | 0 / 0 | 2 / 2 |
| tw-ride | 13 / 13 | 0 / 0 | 0 / 0 | 0 / 0 |
| med | 14 / 14 | 14 / 14 | 3 / 3 | 8 / 8 |
| big | 77 / 77 | 54 / 54 | 4 / 4 | 27 / 27 |

**Regressions: 0.**

**Improvements: 0** (not written into the baseline without `--update-baseline`).
