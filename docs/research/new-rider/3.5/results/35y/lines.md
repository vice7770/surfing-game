Seeds with Y: [1, 2, 3]. Paired by stand; censored at the hold; later/sooner = |diff| >= 0.25 s. "A -> Y" reads base -> Y.

### Main line: turns his way (cueCL, cueCR), Y - A
- **Y - A, his way:** n 26; later 0 / sooner 6 / same 20; median +0.000 s; worse by >= 0.5 s: 3
  - most moved: s2w2 cueCL 4.80 -> 3.98 (-0.82); s1w10 cueCR 4.13 -> 3.53 (-0.60); s2w1 cueCR 3.62 -> 3.07 (-0.55); s2w10 cueCL 1.48 -> 1.03 (-0.45); s2w6 cueCR 3.70 -> 3.27 (-0.43); s2w6 cueCL 3.32 -> 2.97 (-0.35)
  - verdict: FAIL (pass: median >= +0.10, later > sooner, <= 2 worse by >= 0.5; fail: median < 0 or sooner > later)

### Turns his way, Y - B, and B's in-window turn-caused falls
- **Y - B, his way:** n 26; later 15 / sooner 5 / same 6; median +0.367 s; worse by >= 0.5 s: 3
  - most moved: s3w6 cueCL 1.07 -> 5.00 (+3.93); s3w6 cueCR 1.37 -> 5.00 (+3.63); s1w6 cueCL 1.38 -> 5.00 (+3.62); s3w12 cueCR 1.60 -> 5.00 (+3.40); s2w1 cueCL 1.17 -> 3.87 (+2.70); s1w10 cueCL 1.58 -> 4.15 (+2.57)
  - s1w6 cueCL: B final escape 1.18 s (sched 7.502), fell 1.3833; Y: held 5 s -> out of the window
  - s1w10 cueCL: B final escape 0.87 s (sched 6.321), fell 1.5833; Y: fell 4.15, final escape 3.95 s (sched 2.759) -> out of the window
  - s1w10 cueCR: B final escape 0.90 s (sched 6.181), fell 1.0667; Y: fell 3.5333, final escape 3.20 s (sched 0.499) -> out of the window
  - s2w1 cueCL: B final escape 1.10 s (sched 6.438), fell 1.1667; Y: fell 3.8667, final escape 3.50 s (sched 1.926) -> out of the window
  - s2w5 cueCL: B final escape 1.05 s (sched 4.666), fell 1.3; Y: fell 1.7333, final escape 1.72 s (sched 4.525) -> out of the window
  - s2w5 cueCR: B final escape 1.15 s (sched 4.419), fell 1.4333; Y: fell 1.9333, final escape 1.82 s (sched 2.978) -> out of the window
  - s2w6 cueCR: B final escape 0.68 s (sched 5.211), fell 0.9167; Y: fell 3.2667, final escape 3.00 s (sched 1.153) -> out of the window
  - s2w10 cueCL: B final escape 0.95 s (sched 2.039), fell 1.0333; Y: fell 1.0333, final escape 0.95 s (sched 2.042) -> still in the window
  - s3w6 cueCL: B final escape 0.83 s (sched 4.827), fell 1.0667; Y: held 5 s -> out of the window
  - s3w6 cueCR: B final escape 0.88 s (sched 4.999), fell 1.3667; Y: held 5 s -> out of the window
  - s3w12 cueCR: B final escape 1.12 s (sched 5.886), fell 1.6; Y: held 5 s -> out of the window
  - 10 of 11 moved out; verdict: PASS

### Turns steer only (cueL, cueR): reported, no line
- **Y - A, steer only:** n 26; later 1 / sooner 3 / same 22; median +0.000 s; worse by >= 0.5 s: 1
  - most moved: s2w6 cueR 3.28 -> 2.45 (-0.83); s3w9 cueR 0.90 -> 1.43 (+0.53); s2w1 cueL 2.55 -> 2.30 (-0.25); s3w6 cueL 2.47 -> 2.22 (-0.25); s2w6 cueL 3.03 -> 3.27 (+0.23); s2w5 cueL 2.15 -> 2.32 (+0.17)
- **Y - B, steer only:** n 26; later 2 / sooner 11 / same 13; median -0.100 s; worse by >= 0.5 s: 7
  - most moved: s3w6 cueL 5.00 -> 2.22 (-2.78); s3w6 cueR 5.00 -> 2.48 (-2.52); s1w10 cueL 4.12 -> 2.23 (-1.88); s3w12 cueL 3.87 -> 1.98 (-1.88); s3w12 cueR 4.55 -> 2.82 (-1.73); s2w6 cueR 0.87 -> 2.45 (+1.58)
- **B - A, steer only (3.5x: +0.275):** n 26; later 14 / sooner 2 / same 10; median +0.275 s; worse by >= 0.5 s: 2
  - most moved: s3w6 cueL 2.47 -> 5.00 (+2.53); s3w6 cueR 2.50 -> 5.00 (+2.50); s2w6 cueR 3.28 -> 0.87 (-2.42); s3w12 cueL 2.03 -> 3.87 (+1.83); s3w12 cueR 2.72 -> 4.55 (+1.83); s1w10 cueL 2.37 -> 4.12 (+1.75)

### Take-offs (cue, cueC, 3 s hold)
- **Y - A, cue:** n 13; later 1 / sooner 1 / same 11; median +0.000 s; worse by >= 0.5 s: 0
  - most moved: s2w5 cue 2.15 -> 1.72 (-0.43); s3w9 cue 0.92 -> 1.35 (+0.43); s1w8 cue 0.90 -> 0.95 (+0.05); s1w6 cue 3.00 -> 3.00 (+0.00); s1w10 cue 3.00 -> 3.00 (+0.00); s2w1 cue 3.00 -> 3.00 (+0.00)
- **Y - A, cueC:** n 13; later 0 / sooner 0 / same 13; median +0.000 s; worse by >= 0.5 s: 0
  - most moved: s2w10 cueC 1.52 -> 1.70 (+0.18); s1w8 cueC 1.10 -> 1.27 (+0.17); s2w5 cueC 2.47 -> 2.37 (-0.10); s3w9 cueC 0.90 -> 0.97 (+0.07); s1w6 cueC 3.00 -> 3.00 (+0.00); s1w10 cueC 3.00 -> 3.00 (+0.00)
  - both scripts: median +0.000 s; stands A carries 3 s: 17; lost under Y: 0 []; verdict: PASS

### Neutral riders (cue, cueC as the turn twins, ridden 5 s)
- **Y - A, neutral, 5 s:** n 26; later 1 / sooner 1 / same 24; median +0.000 s; worse by >= 0.5 s: 0
  - most moved: s2w5 cue 2.15 -> 1.72 (-0.43); s3w9 cue 0.92 -> 1.35 (+0.43); s2w10 cueC 1.52 -> 1.70 (+0.18); s1w8 cueC 1.10 -> 1.27 (+0.17); s2w5 cueC 2.47 -> 2.37 (-0.10); s2w1 cueC 3.63 -> 3.72 (+0.08)
  - verdict: PASS (median within +-0.1 s)

### Y beside R
- **Y - R, turn, steer only:** n 26; later 14 / sooner 1 / same 11; median +0.550 s; worse by >= 0.5 s: 1
  - most moved: s2w6 cueL 0.93 -> 3.27 (+2.33); s1w6 cueL 5.00 -> 3.02 (-1.98); s2w6 cueR 0.70 -> 2.45 (+1.75); s2w1 cueL 0.72 -> 2.30 (+1.58); s2w1 cueR 0.72 -> 2.27 (+1.55); s3w6 cueL 0.73 -> 2.22 (+1.48)
- **Y - R, turn, his way:** n 26; later 16 / sooner 2 / same 8; median +0.450 s; worse by >= 0.5 s: 2
  - most moved: s3w6 cueCR 0.95 -> 5.00 (+4.05); s3w6 cueCL 1.07 -> 5.00 (+3.93); s2w1 cueCL 1.15 -> 3.87 (+2.72); s2w6 cueCR 1.18 -> 3.27 (+2.08); s3w12 cueCR 3.20 -> 5.00 (+1.80); s2w1 cueCR 1.55 -> 3.07 (+1.52)
