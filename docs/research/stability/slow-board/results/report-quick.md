# Stability quick: build `&cueLater=on&plantFloor=6`

26 rides from 27 processes, 10.4 min with 4 at once. Times are seconds after the first standing frame; reserve is `balanceReserve` (red below 0.3); vW is the speed through the water, horizontal, m/s.

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

## Against the baseline (quick, build `&cueLater=on&plantFloor=6`, 2026-11-25T13:37:35.497Z)

| group | balance falls (now / baseline) | wave | whitewater | lasted 5 s |
| --- | --- | --- | --- | --- |
| tw-catch | 11 / 11 | 0 / 0 | 0 / 0 | 2 / 2 |
| tw-ride | 13 / 13 | 0 / 0 | 0 / 0 | 0 / 0 |

**Regressions: 0.**

**Improvements: 0** (not written into the baseline without `--update-baseline`).
