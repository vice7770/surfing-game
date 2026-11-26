# 3.6e question 2: the held-out prediction (big_s4.jsonl, big_s5.jsonl; first opened 2026-11-26T13:25:06.615Z)

## Compress: 24 held-out open sets (10 ankle; 0 below 4 m/s excluded); bins [8.7,10.1]

| model | median e | median e / e_shipped [25–75 %] | e < e_shipped | predicts (≥ 75 % and median ratio ≤ 0.5) | senses waveform error, median |
| --- | --- | --- | --- | --- | --- |
| shipped (plantAt, every multiplier 1) | 1.061 | 1 | — | — | 0.914 |
| (a) water | 0.608 | 0.543 [0.452, 0.642] | 24 of 24 | no | 0.495 |
| (b) + inertias | 0.615 | 0.563 [0.461, 0.664] | 24 of 24 | no | 0.505 |
| (c) + body | 0.587 | 0.514 [0.443, 0.636] | 24 of 24 | no | 0.471 |
| (d) exploratory | 0.581 | 0.524 [0.400, 0.623] | 24 of 24 | no (reference) | 0.455 |
| (e) exploratory (feet) | 0.573 | 0.526 [0.434, 0.639] | 24 of 24 | no (reference) | 0.428 |
| blended design at the kick tick | 1.060 | 1.000 [0.999, 1.000] | 18 of 24 | no (reference) |  |
| FIR (bin mean) | 0.541 | 0.483 [0.420, 0.673] | 24 of 24 | yes (reference) |  |
| free rows | 1.349 | 1.225 [0.867, 7.159] | 8 of 24 | no (reference) |  |

**The speed-following fits** (amendment 3), against the shipped model following the speed (median e 0.987):

| model | median e | median e / e_shipped,speed-following [25–75 %] | better | predicts | median e / e_shipped (held at the kick tick) | senses waveform error, median |
| --- | --- | --- | --- | --- | --- | --- |
| (a) speed-following | 0.574 | 0.573 [0.509, 0.676] | 23 of 24 | no | 0.549 | 0.522 |
| (b) speed-following | 0.541 | 0.542 [0.458, 0.671] | 24 of 24 | no | 0.528 | 0.502 |
| (c) speed-following | 0.563 | 0.540 [0.465, 0.673] | 24 of 24 | no | 0.532 | 0.509 |
| (d) speed-following (exploratory) | 0.577 | 0.541 [0.466, 0.674] | 24 of 24 | no (exploratory) | 0.516 | 0.509 |
| (e) speed-following (exploratory) | 0.563 | 0.550 [0.463, 0.677] | 24 of 24 | no (exploratory) | 0.518 | 0.507 |

| bin | sets | median e_shipped | median ratio (a) / (b) / (c) / (d) / (e) | FIR |
| --- | --- | --- | --- | --- |
| [4, 8.7) | 12 | 1.181 | 0.520 / 0.554 / 0.482 / 0.504 / 0.518 | 0.545 |
| [8.7, 10.1) | 6 | 1.044 | 0.571 / 0.570 / 0.559 / 0.570 / 0.561 | 0.548 |
| [10.1, ∞) | 6 | 0.902 | 0.571 / 0.579 / 0.580 / 0.570 / 0.572 | 0.431 |

## tuck: 24 held-out open sets (11 ankle; 0 below 4 m/s excluded); bins [8.5,10]

| model | median e | median e / e_shipped [25–75 %] | e < e_shipped | predicts (≥ 75 % and median ratio ≤ 0.5) | senses waveform error, median |
| --- | --- | --- | --- | --- | --- |
| shipped (plantAt, every multiplier 1) | 1.140 | 1 | — | — | 1.025 |
| (a) water | 0.575 | 0.523 [0.353, 0.668] | 24 of 24 | no | 0.510 |
| (b) + inertias | 0.587 | 0.530 [0.373, 0.668] | 23 of 24 | no | 0.537 |
| (c) + body | 0.605 | 0.545 [0.361, 0.659] | 22 of 24 | no | 0.520 |
| (d) exploratory | 0.600 | 0.535 [0.380, 0.650] | 22 of 24 | no (reference) | 0.538 |
| (e) exploratory (feet) | 0.583 | 0.475 [0.361, 0.644] | 22 of 24 | yes (reference) | 0.500 |
| blended design at the kick tick | 1.138 | 1.000 [0.998, 1.000] | 19 of 24 | no (reference) |  |
| FIR (bin mean) | 0.510 | 0.401 [0.321, 0.508] | 24 of 24 | yes (reference) |  |
| free rows | 1.050 | 0.764 [0.575, 2.211] | 14 of 24 | no (reference) |  |

**The speed-following fits** (amendment 3), against the shipped model following the speed (median e 1.073):

| model | median e | median e / e_shipped,speed-following [25–75 %] | better | predicts | median e / e_shipped (held at the kick tick) | senses waveform error, median |
| --- | --- | --- | --- | --- | --- | --- |
| (a) speed-following | 0.510 | 0.456 [0.323, 0.548] | 24 of 24 | **yes** | 0.398 | 0.426 |
| (b) speed-following | 0.505 | 0.444 [0.297, 0.555] | 24 of 24 | **yes** | 0.395 | 0.409 |
| (c) speed-following | 0.513 | 0.443 [0.319, 0.548] | 24 of 24 | **yes** | 0.399 | 0.428 |
| (d) speed-following (exploratory) | 0.516 | 0.424 [0.277, 0.567] | 24 of 24 | yes (exploratory) | 0.381 | 0.444 |
| (e) speed-following (exploratory) | 0.477 | 0.426 [0.298, 0.523] | 24 of 24 | yes (exploratory) | 0.389 | 0.402 |

| bin | sets | median e_shipped | median ratio (a) / (b) / (c) / (d) / (e) | FIR |
| --- | --- | --- | --- | --- |
| [4, 8.5) | 11 | 1.404 | 0.646 / 0.618 / 0.644 / 0.593 / 0.552 | 0.416 |
| [8.5, 10) | 7 | 1.122 | 0.493 / 0.534 / 0.542 / 0.548 / 0.475 | 0.345 |
| [10, ∞) | 6 | 1.076 | 0.291 / 0.286 / 0.257 / 0.257 / 0.253 | 0.234 |

## tall: 31 held-out open sets (8 ankle; 0 below 4 m/s excluded); bins [9.2,10.4]

| model | median e | median e / e_shipped [25–75 %] | e < e_shipped | predicts (≥ 75 % and median ratio ≤ 0.5) | senses waveform error, median |
| --- | --- | --- | --- | --- | --- |
| shipped (plantAt, every multiplier 1) | 0.802 | 1 | — | — | 0.521 |
| (a) water | 0.378 | 0.416 [0.334, 0.570] | 31 of 31 | **yes** | 0.237 |
| (b) + inertias | 0.375 | 0.393 [0.328, 0.568] | 31 of 31 | **yes** | 0.239 |
| (c) + body | 0.366 | 0.411 [0.314, 0.565] | 30 of 31 | **yes** | 0.240 |
| (d) exploratory | 0.374 | 0.433 [0.320, 0.570] | 30 of 31 | yes (reference) | 0.276 |
| (e) exploratory (feet) | 0.363 | 0.470 [0.324, 0.611] | 30 of 31 | yes (reference) | 0.314 |
| blended design at the kick tick | 0.802 | 1.000 [1.000, 1.000] | 16 of 31 | no (reference) |  |
| FIR (bin mean) | 0.381 | 0.404 [0.316, 0.558] | 29 of 31 | yes (reference) |  |
| free rows | 4.048 | 5.940 [2.695, 34.557] | 6 of 31 | no (reference) |  |

**The speed-following fits** (amendment 3), against the shipped model following the speed (median e 0.754):

| model | median e | median e / e_shipped,speed-following [25–75 %] | better | predicts | median e / e_shipped (held at the kick tick) | senses waveform error, median |
| --- | --- | --- | --- | --- | --- | --- |
| (a) speed-following | 0.371 | 0.478 [0.342, 0.620] | 29 of 31 | **yes** | 0.453 | 0.250 |
| (b) speed-following | 0.356 | 0.466 [0.338, 0.604] | 29 of 31 | **yes** | 0.446 | 0.242 |
| (c) speed-following | 0.354 | 0.474 [0.349, 0.616] | 29 of 31 | **yes** | 0.450 | 0.265 |
| (d) speed-following (exploratory) | 0.341 | 0.462 [0.360, 0.588] | 28 of 31 | yes (exploratory) | 0.425 | 0.257 |
| (e) speed-following (exploratory) | 0.354 | 0.472 [0.354, 0.613] | 29 of 31 | yes (exploratory) | 0.442 | 0.265 |

| bin | sets | median e_shipped | median ratio (a) / (b) / (c) / (d) / (e) | FIR |
| --- | --- | --- | --- | --- |
| [4, 9.2) | 16 | 0.944 | 0.570 / 0.568 / 0.565 / 0.570 / 0.611 | 0.558 |
| [9.2, 10.4) | 10 | 0.751 | 0.334 / 0.328 / 0.297 / 0.298 / 0.299 | 0.300 |
| [10.4, ∞) | 5 | 0.735 | 0.416 / 0.392 / 0.411 / 0.401 / 0.405 | 0.404 |

**Question 2, the registered fit (Compress decides):** no nested set predicts; its set of the lowest held-out median ratio is (c), labelled as having failed question 2.

**Question 2, the speed-following fit (amendment 3; Compress decides):** no nested set predicts; its set of the lowest held-out median ratio is (c), labelled as having failed question 2. Question 3's primary run uses the speed-following fit's set (c); the registered fit's set (c) is closed beside it.
