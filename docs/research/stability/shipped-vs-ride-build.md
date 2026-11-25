# Stability quick: build `&cueLater=on`

26 rides from 27 processes, 10.3 min with 4 at once. Times are seconds after the first standing frame; reserve is `balanceReserve` (red below 0.3); vW is the speed through the water, horizontal, m/s.

### The test wave, lying down (`testWave=catch`)

13 rides; 1 lasted 5 s; 12 fell (balance 12, wave 0, whitewater 0), 3 within 3 s.

| ride | stand vW (m/s) | fell at (s) | cause | twin vW +0.7 (m/s) | froth min (W) | lowest reserve | red (s) | warning (s) | recovery (s) | course +0.5 / +1.0 (deg, toward the steer) | peak yaw (deg/s, toward) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tw-catch:none:straight | 5.21 | > 5 |  | 6.06 |  | 0.000 | 0.40 |  |  |  |  |
| tw-catch:none:left | 5.21 | 3.77 | balance | 6.06 | 0.00 | 0.000 | 0.58 | 0.07 | 0.05 | 0.1 / 33.5 | 134.7 |
| tw-catch:none:right | 5.21 | 3.75 | balance | 6.06 | 0.00 | 0.134 | 0.27 | 0.03 | 0.03 | 0.3 / 33.0 | 124.0 |
| tw-catch:crouch:straight | 5.21 | 4.53 | balance | 6.06 | 0.00 | 0.000 | 0.68 | 0.00 |  |  |  |
| tw-catch:crouch:left | 5.21 | 1.82 | balance | 6.06 | 0.00 | 0.000 | 0.45 | 0.18 | fell | -5.1 / — | 271.6 |
| tw-catch:crouch:right | 5.21 | 3.38 | balance | 6.06 | 0.00 | 0.066 | 0.43 | 0.00 | 0.00 | -0.0 / 16.9 | 144.2 |
| tw-catch:compress:straight | 5.21 | 4.90 | balance | 6.06 | 0.00 | 0.000 | 0.37 | 0.37 |  |  |  |
| tw-catch:compress:left | 5.21 | 3.93 | balance | 6.06 | 0.00 | 0.000 | 0.60 | 0.18 | 0.00 | 0.5 / 4.5 | 170.8 |
| tw-catch:compress:right | 5.21 | 3.22 | balance | 6.06 | 0.00 | 0.000 | 0.47 | 0.10 | 0.00 | -4.1 / 3.5 | 170.5 |
| tw-catch:snap:straight | 5.21 | 3.97 | balance | 6.06 | 0.00 | 0.037 | 0.33 | 0.33 |  |  |  |
| tw-catch:snap:left | 5.21 | 1.92 | balance | 6.06 | 0.00 | 0.000 | 0.28 | 0.28 | fell | 12.3 / — | 147.0 |
| tw-catch:snap:right | 5.21 | 2.37 | balance | 6.06 | 0.00 | 0.243 | 0.22 | 0.22 | 0.00 | 4.4 / 0.9 | 125.2 |
| tw-catch:hisway | 5.21 | 4.90 | balance | 6.06 | 0.00 | 0.000 | 0.37 | 0.37 |  |  |  |

### The test wave, standing (`testWave=ride`)

13 rides; 0 lasted 5 s; 13 fell (balance 13, wave 0, whitewater 0).

| ride | stand vW (m/s) | fell at (s) | cause | twin vW +0.7 (m/s) | froth min (W) | lowest reserve | red (s) | warning (s) | recovery (s) | course +0.5 / +1.0 (deg, toward the steer) | peak yaw (deg/s, toward) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tw-ride:none:straight | 7.53 | 2.48 | balance | — | 0.00 | 0.000 | 0.40 | 0.23 |  |  |  |
| tw-ride:none:left | 7.53 | 3.98 | balance | — | 0.00 | 0.037 | 0.72 | 0.27 | 0.00 | -13.1 / -11.4 | 95.1 |
| tw-ride:none:right | 7.53 | 4.73 | balance | — | 0.00 | 0.000 | 0.88 | 0.08 | 0.00 | 8.9 / 23.3 | 128.5 |
| tw-ride:crouch:straight | 7.53 | 4.67 | balance | — | 0.00 | 0.000 | 0.43 | 0.17 |  |  |  |
| tw-ride:crouch:left | 7.53 | 1.67 | balance | — | 0.00 | 0.000 | 0.23 | 0.08 | fell | -3.7 / — | 116.7 |
| tw-ride:crouch:right | 7.53 | 1.92 | balance | — | 0.00 | 0.000 | 0.23 | 0.08 | fell | 1.8 / — | 179.3 |
| tw-ride:compress:straight | 7.53 | 4.83 | balance | — | 0.00 | 0.000 | 0.40 | 0.05 |  |  |  |
| tw-ride:compress:left | 7.53 | 1.70 | balance | — | 0.00 | 0.000 | 0.27 | 0.12 | fell | 0.6 / — | 93.8 |
| tw-ride:compress:right | 7.53 | 1.48 | balance | — | 0.00 | 0.000 | 0.25 | 0.10 | fell | — / — | 52.6 |
| tw-ride:snap:straight | 7.53 | 1.35 | balance | — | 0.00 | 0.000 | 0.47 | 0.25 |  |  |  |
| tw-ride:snap:left | 7.53 | 1.37 | balance | — | 0.00 | 0.000 | 0.42 | 0.20 | fell | — / — | 13.7 |
| tw-ride:snap:right | 7.53 | 1.25 | balance | — | 0.00 | 0.000 | 0.30 | 0.08 | fell | — / — | 30.6 |
| tw-ride:hisway | 7.53 | 4.83 | balance | — | 0.00 | 0.000 | 0.40 | 0.05 |  |  |  |

## Against the baseline (quick, build `&cueLater=on&plantFloor=6`, 2026-11-25T13:37:35.497Z)

**This run's build is `&cueLater=on`, not the baseline's.**

| group | balance falls (now / baseline) | wave | whitewater | lasted 5 s |
| --- | --- | --- | --- | --- |
| tw-catch | 12 / 11 | 0 / 0 | 0 / 0 | 1 / 2 |
| tw-ride | 13 / 13 | 0 / 0 | 0 / 0 | 0 / 0 |

**Regressions: 2.**
- FAIL tw-catch:compress:straight: lasted 5 s in the baseline, now falls at +4.90 s (balance)
- FAIL tw-catch:hisway: lasted 5 s in the baseline, now falls at +4.90 s (balance)

**Improvements: 7** (not written into the baseline without `--update-baseline`).
- tw-catch:none:straight: fell at +4.80 s in the baseline, now lasts 5 s
- tw-catch:none:left: falls later, +3.77 s against +3.50 s
- tw-catch:none:right: lowest reserve 0.134, baseline 0.000
- tw-catch:crouch:straight: falls later, +4.53 s against +4.18 s
- tw-catch:compress:left: falls later, +3.93 s against +3.65 s
- tw-catch:snap:straight: falls later, +3.97 s against +3.67 s
- tw-ride:none:left: falls later, +3.98 s against +3.67 s
