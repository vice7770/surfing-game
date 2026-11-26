# 3.6c M6: the sideways tip in the held turn (med), balance falls with the escape inside the steer

Changes from +1.0 s to the escape, m, in the direction the capture point crossed. Felt: −height·feltAcross. Medians; counts in brackets.

| drive | falls | sideways at the first beyond frame | inside / outside | Δ across | Δ offset | Δ felt | Δ speed | felt term the largest | corr(felt, V·dχ/dt) | last 2 half-cycles > first 2 | swing std: fall / tall same wave / straight same wave (deg/s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hisway | 1 | 1 of 1 | 0 / 1 | +0.109 | +0.036 | -0.058 | +0.132 | 0 of 1 | -0.53 (1) | 1 of 1 | 17.1 / 10.4 (1) / 4.1 (1) |
| release0 | 1 | 1 of 1 | 1 / 0 | +0.463 | +0.086 | +0.034 | +0.343 | 0 of 1 | +nan (0) | 1 of 1 | nan / 9.9 (1) / 4.1 (1) |
| release0.2 | 2 | 0 of 2 | 2 / 0 | +0.139 | +0.013 | +0.008 | +0.117 | 0 of 2 | +0.45 (2) | 0 of 0 | 7.8 / 4.5 (2) / 2.7 (2) |
| release0.6 | 1 | 1 of 1 | 1 / 0 | +0.237 | -0.033 | +0.065 | +0.205 | 0 of 1 | +0.38 (1) | 0 of 1 | 13.7 / 15.2 (1) / 7.2 (1) |

*Not pre-registered (a description added after the table above was read):* the speed term against the yaw swing, the best correlation of speedAcross_alt (lagged 0–8 frames) with −Ω_alt from 0.12 s before the steer to the escape, and the slope there (m/s per rad/s).

| drive | falls with the series | best lag, median (frames) | correlation, median | slope, median (m/s per rad/s) |
| --- | --- | --- | --- | --- |
| hisway | 1 | 3 | +0.67 | +0.362 |
| release0 | 1 | 2 | +0.98 | +0.565 |
| release0.2 | 2 | 5.0 | +0.85 | +0.319 |
| release0.6 | 1 | 2 | +0.96 | +0.270 |

Per fall:

| ride | escape | side | Δ across / offset / felt / speed | corr | half-cycles (peak |Ω_alt|, deg/s) |
| --- | --- | --- | --- | --- | --- |
| med:s1:w6:release0:left | 1.583 | inside | +0.463 / +0.086 / +0.034 / +0.343 | None | [7.5, 21.4, 31.6, 28.5] |
| med:s2:w5:release0.6:right | 1.967 | inside | +0.237 / -0.033 / +0.065 / +0.205 | 0.378 | [27.6, 25.5, 19.3, 14.4, 12.9, 19.6, 2.4] |
| med:s2:w6:release0.2:left | 1.267 | inside (fore-aft) | +0.214 / +0.032 / +0.008 / +0.174 | 0.665 | [10.0, 11.7, 0.0] |
| med:s2:w6:release0.2:right | 1.250 | inside (fore-aft) | +0.063 / -0.006 / +0.008 / +0.061 | 0.227 | [4.4, 4.9] |
| med:s3:w6:hisway:left | 1.950 | outside | +0.109 / +0.036 / -0.058 / +0.132 | -0.529 | [9.6, 13.5, 14.5, 15.6, 33.3, 31.8] |
