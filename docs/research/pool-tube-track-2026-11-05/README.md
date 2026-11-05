# The Wave Pool Barrel's surfable tube: ruling 3, a smooth tracked wall (2026-11-05)

Ruling 3 of the surfable-tube plan's step 7 follow-up: the water-physics advisor's answer to the five open questions
(`docs/research/pool-tube-contact-2026-11-05/advisor-ruling-3.md`), built at the Wave Pool's straight Barrel and measured.
Branch `claude/pool-tube-track` from main 9c3ed56b. No rider sessions, catch reports or autopilot checks were run, and no
browser pane or dev server: the bodies in the bars are placed on the water by the probe with no input.

## Where it stands

- **Built, each piece behind its own switch:**
  1. the smooth wall: the solver's trough read where it is, W tracked by an α–β filter with the cap as its gate, the wall
     water's speed from the tracker, the wall water blended into the solver's flow (**opt-in**, `?tubeTrack=on`);
  2. the probe's placement: lone boards at rest draft along the nearest normal, with their water (measurement only; the old
     placement runs beside it and both are reported);
  3. the water's acceleration on the hull's added mass, in the case's wall water only (**on**; `?tubeInertia=old`);
  4. no retire of contour-thrown lips (**on**; `?tubeRetire=old`);
  5. the buoyancy along the true normal past the clamp (**opt-in**, `?tubeBuoy=on`);
  6. the drop rule: the lighter strip gives way (**opt-in**, `?tubeDrop=on`). The clock-split join was not trialled.
- **Why three are opt-in** (the owner's rule: a piece that makes the bars worse is left off):
  - **the smooth wall** does what it was for on the wall water and the anchor, on all four: the water a body meets in the
    wall changes p50 0.08–0.15 against 0.34–0.72 m/s a step and p90 1.1–1.9 against 1.6–3.2; crossing into the wall p99
    0.05–1.2 against 3.4–5.8 m/s (the bar, ≤ 1, met on three of four); W's jitter p99 0.028 against 0.12 m; the gate engaged
    on 3–10 % of steps against the cap's 52–55 %; board force flips 1.2–4.5 % against 4.3–5.3 %. But **bar 2a doubles on all
    four** (0.60–0.77 against 0.29–0.52 m), **2b at a38 1.5 m goes from 15 % to 50 %** (lone boards placed 0.3 s down the
    line overrun 12 of 12), and bar 3's case-over-solver goes from p95 0.01–0.05 to 0.08–0.10 H_s;
  - **the buoyancy past the clamp**: 2a, 2b and flips moved within a run's spread on both case lists ("small", as ruled);
  - **the drop rule** raised the holes: 0.013 → 0.022 a build at pool 1.5 m (visible 24 → 38), 0.007 → 0.010 at a38 1.5 m
    (visible 0 → 11).
- **The default** (the inertia and no retire on; the rest off), against main:
  - **the meter within ±5 % of main on all four** (the owner's rule): 1.581 / 1.901 m at a38 1.5 / 1.8 m (main 1.559 /
    1.882), 1.594 / 1.913 m on the pool's cases (main 1.601 / 1.928): +1.4 %, +1.0 %, −0.4 %, −0.8 %;
  - **2b passes at a38**: 10.4 % against 14.6 % at 1.5 m and 31.3 % at 1.8 m (the old placement 10.4 % against 31.3 /
    43.8 %); flings fewer on all four (59–78 % against 88–100 %); holes at a38 1.5 m 0.0007 a build against 0.0024, at pool 1.8 m
    0.009 against 0.075;
  - but on the pool's cases 2b 29.2 / 31.3 % against 16.7 / 20.8 %, 2a p99 0.40 against 0.29 m at 1.5 m, board force
    flips 5.4 % against 4.9 %, and the holes at pool 1.5 m and a38 1.8 m 0.021 / 0.043 against 0.011 / 0.032 a build;
  - bar 6 per column at weight ≥ 0.5 falls from 96–100 % to 55–78 %: the lips the solver has not broken now land at full
    weight, as ruled (bar 6 per jet after the pour 57–81 % against 62–83 %);
  - the anchor and the wall water as main's (the smooth wall is off).
- **Fails, on every build including main:** bar 2a (0.15 m), the wall-water step's p99 (≤ 1 m/s), flings (≤ 10 %), bar 4b's
  jitter (0.005 m) and own pace (0.01 m), the raw target's step (p90 ≤ 0.02 m), bar 6 per jet after the pour (≥ 85 %:
  57–81 %).
- **The pin check passes:** with the inertia and no retire old (the other three off, their default), the build is main's byte
  for byte at every spot and line, including the lone boards stepped on the Beach's and the Barrel's water. The 1.5 m
  default matches main too (neither of its pieces acts within the pin's 8 s there); the 1.8 m default and the line with
  every piece on differ, and the default runs twice identically.
- **Not measured:** the M4 Pro's cost; ride-camera strips.

## The bars, the default against main

12 periods after 50 s, CPU, 1/60 s steps, reef columns s 30–95, bodies at s 55, the probe as the follow-up's with ruling 3's
measures added (below). Each cell is **the default** (the inertia and no retire on, the smooth wall, the buoyancy and the
drop rule off) with main in brackets (the two default switches old: byte for byte main's build, the pin check; main's numbers
reproduce the follow-up's README where both measure). Runs: `runs/c-ir-*.txt` (the default), `runs/main-*.txt`. The bars
the ruling set: the wall-water step's p99 ≤ 1 m/s in the wall and crossing it; flings ≤ 10 % (provisional); 2a p99 ≤ 0.15 m
and 2b overrun ≤ 20 % with both placements; force flips as information; 4b's jitter p99 ≤ 0.005 m, own pace against the
tracker p99 ≤ 0.01 m, the raw target's step inside a front p90 ≤ 0.02 m, the cap engaged ≤ 10 %, no single step over
0.1 m; bar 6 per jet after the pour ≥ 85 %; the meter within ±5 % of main; visible holes 0.

| Bar | a38 1.5 m | a38 1.8 m | pool 1.5 m | pool 1.8 m |
| --- | --- | --- | --- | --- |
| wall-water step in the wall p50/p90/p99 (m/s) | **0.691 / 2.831 / 8.951** (0.720 / 3.122 / 8.504) | **0.690 / 3.800 / 9.679** (0.627 / 3.186 / 9.474) | **0.674 / 2.754 / 7.467** (0.343 / 1.589 / 5.459) | **0.614 / 2.916 / 9.628** (0.417 / 2.165 / 8.115) |
| wall-water step crossing p50/p90/p99 | **0.669 / 2.023 / 3.503** (0.604 / 2.038 / 3.419) | **1.232 / 2.491 / 3.783** (0.753 / 1.949 / 5.785) | **1.016 / 2.145 / 2.860** (0.826 / 2.808 / 3.897) | **1.363 / 2.473 / 3.286** (0.691 / 2.457 / 5.035) |
| wall-water step, the solver's (info) | **0.021 / 0.046 / 0.311** (0.024 / 0.060 / 0.140) | **0.029 / 0.084 / 0.307** (0.030 / 0.056 / 0.267) | **0.026 / 0.063 / 0.290** (0.023 / 0.064 / 0.251) | **0.024 / 0.054 / 0.261** (0.021 / 0.039 / 0.097) |
| 2a p99 (default placement) | **0.389** (0.366) | **0.456** (0.473) | **0.402** (0.294) | **0.473** (0.517) |
| 2a over 0.15 m >0.1 s (default placement) | **45 of 216** (49 of 216) | **47 of 222** (59 of 222) | **44 of 216** (31 of 216) | **60 of 234** (32 of 234) |
| 2b overrun (default placement) | **10.4 %** (14.6 %) | **10.4 %** (31.3 %) | **29.2 %** (16.7 %) | **31.3 %** (20.8 %) |
| 2b c/p/o (default placement) | **3/40/5 of 48** (5/36/7 of 48) | **0/43/5 of 48** (1/32/15 of 48) | **5/29/14 of 48** (12/28/8 of 48) | **4/29/15 of 48** (6/32/10 of 48) |
| 2b boards at throw overrun (default placement) | **1 of 12** (1 of 12) | **1 of 12** (6 of 12) | **5 of 12** (1 of 12) | **6 of 12** (3 of 12) |
| flings >0.1 m (default placement) | **46 of 72 (63.9 %)** (69 of 72 (95.8 %)) | **47 of 74 (63.5 %)** (65 of 74 (87.8 %)) | **56 of 72 (77.8 %)** (72 of 72 (100.0 %)) | **46 of 78 (59.0 %)** (73 of 78 (93.6 %)) |
| board force flips (default placement) | **420/9259 (4.5 %)** (466/8789 (5.3 %)) | **436/8244 (5.3 %)** (343/8045 (4.3 %)) | **653/12179 (5.4 %)** (556/11311 (4.9 %)) | **657/12108 (5.4 %)** (550/11210 (4.9 %)) |
| 2a p99 (old placement) | **0.463** (0.400) | **0.434** (0.440) | **0.912** (0.317) | **0.734** (0.547) |
| 2a over 0.15 m >0.1 s (old placement) | **42 of 216** (52 of 216) | **49 of 222** (71 of 222) | **46 of 216** (40 of 216) | **63 of 234** (54 of 234) |
| 2b overrun (old placement) | **10.4 %** (31.3 %) | **10.4 %** (43.8 %) | **31.3 %** (25.0 %) | **33.3 %** (39.6 %) |
| 2b c/p/o (old placement) | **5/38/5 of 48** (4/29/15 of 48) | **0/43/5 of 48** (1/26/21 of 48) | **5/28/15 of 48** (13/23/12 of 48) | **2/30/16 of 48** (5/24/19 of 48) |
| 2b boards at throw overrun (old placement) | **0 of 12** (8 of 12) | **1 of 12** (11 of 12) | **6 of 12** (7 of 12) | **7 of 12** (11 of 12) |
| flings >0.1 m (old placement) | **43 of 72 (59.7 %)** (62 of 72 (86.1 %)) | **48 of 74 (64.9 %)** (63 of 74 (85.1 %)) | **47 of 72 (65.3 %)** (65 of 72 (90.3 %)) | **44 of 78 (56.4 %)** (74 of 78 (94.9 %)) |
| board force flips (old placement) | **436/8735 (5.0 %)** (360/8156 (4.4 %)) | **467/8258 (5.7 %)** (292/7474 (3.9 %)) | **742/11656 (6.4 %)** (757/10941 (6.9 %)) | **548/11810 (4.6 %)** (512/11061 (4.6 %)) |
| 4b jitter p99/max | **0.1282 / 0.208** (0.1208 / 0.204) | **0.1261 / 0.215** (0.1213 / 0.226) | **0.1281 / 0.229** (0.1203 / 0.199) | **0.1251 / 0.220** (0.1200 / 0.234) |
| 4b own pace vs tracker p99 | **0.1282** (0.1208) | **0.1261** (0.1213) | **0.1281** (0.1203) | **0.1251** (0.1200) |
| 4b raw target step p50/p90/p99 | **0.0345 / 0.1026 / 0.2154** (0.0281 / 0.0974 / 0.2013) | **0.0303 / 0.1036 / 0.2890** (0.0272 / 0.0991 / 0.2443) | **0.0306 / 0.1049 / 0.2480** (0.0222 / 0.0987 / 0.2448) | **0.0234 / 0.1015 / 0.2993** (0.0205 / 0.0961 / 0.2821) |
| 4b single steps >0.1 (max) | **4 (0.112)** (0 (0.095)) | **0 (0.100)** (0 (0.100)) | **1 (0.103)** (0 (0.096)) | **6 (0.119)** (0 (0.099)) |
| 4b cap/gate engaged | **52.6 %** (51.6 %) | **52.5 %** (51.3 %) | **55.4 %** (54.3 %) | **56.2 %** (54.6 %) |
| σ_v (rms/√6) | **0.0412** (0.0385) | **0.0489** (0.0440) | **0.0429** (0.0393) | **0.0468** (0.0411) |
| raw target vs tracker p50/p90/p99 | **0.0456 / 0.1276 / 0.2540** (0.0427 / 0.1189 / 0.2329) | **0.0410 / 0.1223 / 0.3125** (0.0387 / 0.1147 / 0.2718) | **0.0413 / 0.1274 / 0.2663** (0.0360 / 0.1143 / 0.2471) | **0.0350 / 0.1165 / 0.2969** (0.0324 / 0.1062 / 0.2760) |
| read: trough at end / case trough at end | **0.0 % / 29.0 %** (0.0 % / 41.1 %) | **0.0 % / 31.3 %** (0.0 % / 43.6 %) | **0.0 % / 24.3 %** (0.0 % / 33.6 %) | **0.0 % / 27.6 %** (0.0 % / 35.4 %) |
| bar 6 per jet after the pour | **57.3 % of 633** (62.2 % of 629) | **70.7 % of 676** (69.5 % of 683) | **72.1 % of 627** (74.4 % of 624) | **80.5 % of 683** (82.8 % of 679) |
| bar 6 per jet at the crash | **53.2 %** (55.3 %) | **65.3 %** (64.6 %) | **65.1 %** (66.2 %) | **72.9 %** (75.8 %) |
| bar 6 per column, all weights | **56.5 % of 292** (58.2 % of 292) | **70.6 % of 357** (68.9 % of 315) | **68.5 % of 279** (100.0 % of 89) | **76.8 % of 319** (98.2 % of 109) |
| bar 6 per column (weight ≥ 0.5) | **55.3 %** (100.0 %) | **69.2 %** (100.0 %) | **72.9 %** (100.0 %) | **78.4 %** (96.3 %) |
| visible holes / heavy / raw | **0 / 0 / 5** (0 / 0 / 17) | **137 / 0 / 312** (31 / 0 / 230) | **31 / 0 / 153** (23 / 0 / 77) | **2 / 0 / 62** (160 / 0 / 542) |
| holes a build (raw) / folds | **0.0007 / 0.234** (0.0024 / 0.212) | **0.0433 / 0.540** (0.0319 / 0.403) | **0.0213 / 0.504** (0.0107 / 0.383) | **0.0086 / 0.291** (0.0753 / 0.406) |
| meter (typical m) | **1.581** (1.559) | **1.901** (1.882) | **1.594** (1.601) | **1.913** (1.928) |
| unbroken at touchdown (poured) | **464 of 675 (436)** (458 of 673 (427)) | **463 of 714 (443)** (476 of 717 (458)) | **476 of 672 (447)** (470 of 672 (443)) | **496 of 717 (476)** (494 of 718 (475)) |
| retire at touchdown p10/p50/p90 | **0.00 / 0.00 / 0.00** (0.72 / 0.81 / 0.93) | **0.00 / 0.00 / 0.00** (0.88 / 0.96 / 1.00) | **0.00 / 0.00 / 0.00** (1.00 / 1.00 / 1.00) | **0.00 / 0.00 / 0.00** (1.00 / 1.00 / 1.00) |
| jets thrown/crashed | **636/632** (629/628) | **675/675** (681/682) | **636/628** (635/625) | **681/680** (681/678) |
| starved | **2.91 %** (3.51 %) | **3.90 %** (3.54 %) | **0.30 %** (0.22 %) | **0.71 %** (0.67 %) |
| bar 3 one-sided p95/max | **0.050 / 0.195** (0.051 / 0.194) | **0.047 / 0.241** (0.045 / 0.201) | **0.013 / 0.170** (0.010 / 0.158) | **0.001 / 0.191** (0.001 / 0.164) |
| bar 1 | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) |
| bar 4a p99 | **0.0091** (0.0092) | **0.0111** (0.0108) | **0.0060** (0.0056) | **0.0058** (0.0056) |
| bar 7 clock p50/p95 | **1.000/1.250** (1.000/1.250) | **1.000/1.250** (1.000/1.250) | **1.000/1.145** (1.000/1.054) | **1.000/1.084** (1.000/1.039) |
| bar 7 formation | **96.8 %** (98.3 %) | **95.0 %** (97.4 %) | **96.2 %** (97.9 %) | **94.8 %** (96.9 %) |
| crests thrown twice | **0 of 678** (0 of 673) | **0 of 714** (0 of 716) | **0 of 676** (0 of 677) | **0 of 717** (0 of 719) |

- **The wall-water step** is main's: the smooth wall is off in the default (its own numbers are in the next table).
- **4b** (no tracker in the default): "own pace against the tracker" is W's own rate last step, so it equals the jitter.
- **Bar 6 per column** reads more column-waves now (273–357 against 89–315): with no retire the unbroken lips stay on the
  front to their touchdown, at full weight, and land where the solver has not broken yet.
- **Visible holes** (a dropped open strip heavier than the kept one by over 0.1, or drawn more than 0.1 m off the solver's
  surface): 0 at a38 1.5 m (main 0), 2 at pool 1.8 m (main 160), 31 / 137 at pool 1.5 / a38 1.8 m (main 23 / 31). None at
  weight ≥ 0.5 anywhere.

## Each piece alone

### The default's pieces and the smooth wall (pool 1.5 m; a38 1.5 m)

Each cell is pool 1.5 m; a38 1.5 m, 12 periods. "All five on" is the build as first made (every piece on); the last column
is the default plus the smooth wall (`?tubeTrack=on`). The buoyancy and the drop rule are off in the middle three.

| Bar (pool 1.5 m; a38 1.5 m) | Main | No retire alone | No retire and the inertia (the default) | All five on | The smooth wall, the inertia and no retire |
| --- | --- | --- | --- | --- | --- |
| wall-water step in the wall p50/p90/p99 (m/s) | 0.343 / 1.589 / 5.459; 0.720 / 3.122 / 8.504 | 0.442 / 1.994 / 7.522; 0.710 / 2.927 / 9.355 | 0.674 / 2.754 / 7.467; 0.691 / 2.831 / 8.951 | 0.082 / 1.138 / 6.923; 0.118 / 1.698 / 5.771 | 0.082 / 1.086 / 7.431; 0.112 / 1.623 / 5.893 |
| wall-water step crossing p50/p90/p99 | 0.826 / 2.808 / 3.897; 0.604 / 2.038 / 3.419 | 0.974 / 1.936 / 2.909; 0.872 / 2.002 / 2.876 | 1.016 / 2.145 / 2.860; 0.669 / 2.023 / 3.503 | 0.022 / 0.032 / 0.209; 0.022 / 0.044 / 0.086 | 0.022 / 0.032 / 0.209; 0.022 / 0.043 / 0.086 |
| 2a p99 (default placement) | 0.294; 0.366 | 0.445; 0.392 | 0.402; 0.389 | 0.619; 0.758 | 0.598; 0.755 |
| 2b overrun (default placement) | 16.7 %; 14.6 % | 29.2 %; 12.5 % | 29.2 %; 10.4 % | 20.8 %; 52.1 % | 22.9 %; 50.0 % |
| flings >0.1 m (default placement) | 72 of 72 (100.0 %); 69 of 72 (95.8 %) | 53 of 72 (73.6 %); 53 of 72 (73.6 %) | 56 of 72 (77.8 %); 46 of 72 (63.9 %) | 71 of 72 (98.6 %); 55 of 72 (76.4 %) | 72 of 72 (100.0 %); 59 of 72 (81.9 %) |
| board force flips (default placement) | 556/11311 (4.9 %); 466/8789 (5.3 %) | 871/11686 (7.5 %); 454/8713 (5.2 %) | 653/12179 (5.4 %); 420/9259 (4.5 %) | 431/11260 (3.8 %); 90/7675 (1.2 %) | 386/11367 (3.4 %); 93/7943 (1.2 %) |
| 2a p99 (old placement) | 0.317; 0.400 | 0.448; 0.448 | 0.912; 0.463 | 0.655; 0.761 | 0.636; 0.756 |
| 2b overrun (old placement) | 25.0 %; 31.3 % | 31.3 %; 29.2 % | 31.3 %; 10.4 % | 20.8 %; 47.9 % | 20.8 %; 47.9 % |
| 4b jitter p99/max | 0.1203 / 0.199; 0.1208 / 0.204 | 0.1281 / 0.229; 0.1282 / 0.208 | 0.1281 / 0.229; 0.1282 / 0.208 | 0.0279 / 0.160; 0.0283 / 0.106 | 0.0279 / 0.160; 0.0283 / 0.106 |
| bar 6 per jet after the pour | 74.4 % of 624; 62.2 % of 629 | 72.1 % of 627; 57.3 % of 633 | 72.1 % of 627; 57.3 % of 633 | 72.9 % of 635; 60.2 % of 631 | 72.9 % of 635; 60.2 % of 631 |
| bar 6 per column (weight ≥ 0.5) | 100.0 %; 100.0 % | 72.9 %; 55.3 % | 72.9 %; 55.3 % | 68.5 %; 57.6 % | 68.5 %; 57.6 % |
| visible holes / heavy / raw | 23 / 0 / 77; 0 / 0 / 17 | 31 / 0 / 153; 0 / 0 / 5 | 31 / 0 / 153; 0 / 0 / 5 | 38 / 0 / 155; 11 / 0 / 74 | 24 / 0 / 96; 0 / 0 / 52 |
| holes a build (raw) / folds | 0.0107 / 0.383; 0.0024 / 0.212 | 0.0213 / 0.504; 0.0007 / 0.234 | 0.0213 / 0.504; 0.0007 / 0.234 | 0.0215 / 0.190; 0.0103 / 0.090 | 0.0133 / 0.302; 0.0072 / 0.229 |
| meter (typical m) | 1.601; 1.559 | 1.594; 1.581 | 1.594; 1.581 | 1.592; 1.558 | 1.592; 1.558 |
| bar 3 one-sided p95/max | 0.010 / 0.158; 0.051 / 0.194 | 0.013 / 0.170; 0.050 / 0.195 | 0.013 / 0.170; 0.050 / 0.195 | 0.084 / 0.845; 0.101 / 0.361 | 0.084 / 0.845; 0.101 / 0.361 |
| bar 4a p99 | 0.0056; 0.0092 | 0.0060; 0.0091 | 0.0060; 0.0091 | 0.0112; 0.0144 | 0.0112; 0.0144 |

- **No retire alone** (against main): 2b at a38 12.5 % against 14.6 %, but at the pool 29.2 % against 16.7 % and board flips
  7.5 % against 4.9 %; holes at a38 0.0007 against 0.0024 a build, at the pool 0.021 against 0.011.
- **The inertia** (no retire and the inertia, against no retire alone): 2b at a38 10.4 % against 12.5 %, board flips 5.4 /
  4.5 % against 7.5 / 5.2 %, 2a 0.40 / 0.39 against 0.45 / 0.39 m. It touches only bodies: the sea, the anchor and the
  ledger are the same run for run.
- **The smooth wall** (the last column against the middle): the wall-water step in the wall p50 0.08 / 0.11 against
  0.67 / 0.69 m/s, crossing p99 0.21 / 0.09 against 2.9 / 3.5 m/s; W's jitter 0.028 against 0.128 m; flips 3.4 / 1.2 %
  against 5.4 / 4.5 %; but 2a 0.60 / 0.76 against 0.40 / 0.39 m, 2b at a38 50 % against 10 %, bar 3's max 0.85 / 0.36
  against 0.17 / 0.20 H_s.

### Each switch alone from all five on (pool 1.5 m; a38 1.5 m)

The leave-one-out the task asked for, measured from the build as first made (all five on). `runs/default-*.txt` is that
build; `runs/<piece>Old-*.txt` turns one piece off.

| Bar (pool 1.5 m; a38 1.5 m) | All five on (as first built) | `?tubeTrack=old` | `?tubeInertia=old` | `?tubeRetire=old` | The buoyancy off | The drop rule off | Main (all off) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| wall-water step in the wall p50/p90/p99 (m/s) | 0.082 / 1.138 / 6.923; 0.118 / 1.698 / 5.771 | 0.648 / 2.768 / 8.067; 0.747 / 2.836 / 8.402 | 0.098 / 1.281 / 6.459; 0.147 / 1.679 / 5.665 | 0.052 / 0.700 / 4.791; 0.139 / 1.799 / 6.235 | 0.082 / 1.086 / 7.431; 0.112 / 1.623 / 5.893 | 0.082 / 1.138 / 6.923; 0.118 / 1.698 / 5.771 | 0.343 / 1.589 / 5.459; 0.720 / 3.122 / 8.504 |
| wall-water step crossing p50/p90/p99 | 0.022 / 0.032 / 0.209; 0.022 / 0.044 / 0.086 | 1.085 / 2.280 / 3.547; 0.669 / 2.087 / 3.503 | 0.022 / 0.034 / 0.457; 0.022 / 0.052 / 0.085 | 0.020 / 0.042 / 0.285; 0.021 / 0.048 / 0.084 | 0.022 / 0.032 / 0.209; 0.022 / 0.043 / 0.086 | 0.022 / 0.032 / 0.209; 0.022 / 0.044 / 0.086 | 0.826 / 2.808 / 3.897; 0.604 / 2.038 / 3.419 |
| 2a p99 (default placement) | 0.619; 0.758 | 0.444; 0.392 | 0.614; 0.588 | 1.098; 0.467 | 0.598; 0.755 | 0.619; 0.758 | 0.294; 0.366 |
| 2b overrun (default placement) | 20.8 %; 52.1 % | 31.3 %; 18.8 % | 41.7 %; 72.9 % | 20.8 %; 60.4 % | 22.9 %; 50.0 % | 20.8 %; 52.1 % | 16.7 %; 14.6 % |
| flings >0.1 m (default placement) | 71 of 72 (98.6 %); 55 of 72 (76.4 %) | 51 of 72 (70.8 %); 45 of 72 (62.5 %) | 72 of 72 (100.0 %); 58 of 72 (80.6 %) | 71 of 72 (98.6 %); 69 of 72 (95.8 %) | 72 of 72 (100.0 %); 59 of 72 (81.9 %) | 71 of 72 (98.6 %); 55 of 72 (76.4 %) | 72 of 72 (100.0 %); 69 of 72 (95.8 %) |
| board force flips (default placement) | 431/11260 (3.8 %); 90/7675 (1.2 %) | 654/12190 (5.4 %); 523/9287 (5.6 %) | 320/11171 (2.9 %); 81/7605 (1.1 %) | 310/11014 (2.8 %); 139/7945 (1.7 %) | 386/11367 (3.4 %); 93/7943 (1.2 %) | 431/11260 (3.8 %); 90/7675 (1.2 %) | 556/11311 (4.9 %); 466/8789 (5.3 %) |
| 2a p99 (old placement) | 0.655; 0.761 | 0.995; 0.468 | 0.634; 0.614 | 1.133; 0.488 | 0.636; 0.756 | 0.655; 0.761 | 0.317; 0.400 |
| 2b overrun (old placement) | 20.8 %; 47.9 % | 39.6 %; 22.9 % | 39.6 %; 70.8 % | 16.7 %; 54.2 % | 20.8 %; 47.9 % | 20.8 %; 47.9 % | 25.0 %; 31.3 % |
| 4b jitter p99/max | 0.0279 / 0.160; 0.0283 / 0.106 | 0.1281 / 0.229; 0.1282 / 0.208 | 0.0279 / 0.160; 0.0283 / 0.106 | 0.0298 / 0.136; 0.0304 / 0.117 | 0.0279 / 0.160; 0.0283 / 0.106 | 0.0279 / 0.160; 0.0283 / 0.106 | 0.1203 / 0.199; 0.1208 / 0.204 |
| 4b own pace vs tracker p99 | 0.0396; 0.0341 | 0.1281; 0.1282 | 0.0396; 0.0341 | 0.0398; 0.0361 | 0.0396; 0.0341 | 0.0396; 0.0341 | 0.1203; 0.1208 |
| 4b raw target step p50/p90/p99 | 0.0217 / 0.0668 / 0.1571; 0.0286 / 0.0806 / 0.1809 | 0.0306 / 0.1049 / 0.2480; 0.0345 / 0.1026 / 0.2154 | 0.0217 / 0.0668 / 0.1571; 0.0286 / 0.0806 / 0.1809 | 0.0193 / 0.0594 / 0.1336; 0.0252 / 0.0742 / 0.1725 | 0.0217 / 0.0668 / 0.1571; 0.0286 / 0.0806 / 0.1809 | 0.0217 / 0.0668 / 0.1571; 0.0286 / 0.0806 / 0.1809 | 0.0222 / 0.0987 / 0.2448; 0.0281 / 0.0974 / 0.2013 |
| 4b cap/gate engaged | 10.0 %; 3.0 % | 55.4 %; 52.6 % | 10.0 %; 3.0 % | 13.0 %; 4.1 % | 10.0 %; 3.0 % | 10.0 %; 3.0 % | 54.3 %; 51.6 % |
| bar 6 per jet after the pour | 72.9 % of 635; 60.2 % of 631 | 72.1 % of 627; 57.3 % of 633 | 72.9 % of 635; 60.2 % of 631 | 74.6 % of 627; 60.6 % of 632 | 72.9 % of 635; 60.2 % of 631 | 72.9 % of 635; 60.2 % of 631 | 74.4 % of 624; 62.2 % of 629 |
| bar 6 per column (weight ≥ 0.5) | 68.5 %; 57.6 % | 72.9 %; 55.3 % | 68.5 %; 57.6 % | 98.6 %; 100.0 % | 68.5 %; 57.6 % | 68.5 %; 57.6 % | 100.0 %; 100.0 % |
| visible holes / heavy / raw | 38 / 0 / 155; 11 / 0 / 74 | 149 / 0 / 337; 34 / 0 / 63 | 38 / 0 / 155; 11 / 0 / 74 | 99 / 0 / 223; 62 / 0 / 161 | 38 / 0 / 155; 11 / 0 / 74 | 24 / 0 / 96; 0 / 0 / 52 | 23 / 0 / 77; 0 / 0 / 17 |
| holes a build (raw) / folds | 0.0215 / 0.190; 0.0103 / 0.090 | 0.0468 / 0.282; 0.0088 / 0.115 | 0.0215 / 0.190; 0.0103 / 0.090 | 0.0310 / 0.229; 0.0224 / 0.127 | 0.0215 / 0.190; 0.0103 / 0.090 | 0.0133 / 0.302; 0.0072 / 0.229 | 0.0107 / 0.383; 0.0024 / 0.212 |
| meter (typical m) | 1.592; 1.558 | 1.594; 1.581 | 1.592; 1.558 | 1.591; 1.566 | 1.592; 1.558 | 1.592; 1.558 | 1.601; 1.559 |
| bar 3 one-sided p95/max | 0.084 / 0.845; 0.101 / 0.361 | 0.013 / 0.170; 0.050 / 0.195 | 0.084 / 0.845; 0.101 / 0.361 | 0.077 / 0.938; 0.103 / 0.626 | 0.084 / 0.845; 0.101 / 0.361 | 0.084 / 0.845; 0.101 / 0.361 | 0.010 / 0.158; 0.051 / 0.194 |
| bar 4a p99 | 0.0112; 0.0144 | 0.0060; 0.0091 | 0.0112; 0.0144 | 0.0113; 0.0167 | 0.0112; 0.0144 | 0.0112; 0.0144 | 0.0056; 0.0092 |
| bar 7 formation | 96.3 %; 96.8 % | 96.2 %; 96.8 % | 96.3 %; 96.8 % | 97.9 %; 98.3 % | 96.3 %; 96.8 % | 96.3 %; 96.8 % | 97.9 %; 98.3 % |

- **The smooth wall** off: the wall water and 4b go back to main's; 2a and 2b at a38 get better (0.39 m, 18.8 %), the pool's
  2b worse (31.3 %).
- **The inertia** off: 2b worse on both (41.7 / 72.9 % against 20.8 / 52.1 %), 2a about the same, flips fewer at the pool.
- **No retire** off (the retire back): bar 6 per column back to 99–100 %; 2a at the pool 1.10 m against 0.62, 2b at a38
  60.4 % against 52.1 %; holes up (0.031 / 0.022 against 0.022 / 0.010).
- **The buoyancy** off: within a run's spread (2b 22.9 / 50.0 % against 20.8 / 52.1 %, flips 3.4 / 1.2 % against 3.8 / 1.2 %).
- **The drop rule** off: holes down (0.013 / 0.007 against 0.022 / 0.010; visible 24 / 0 against 38 / 11); nothing else
  moves.

### The smooth wall's parts at a38 1.5 m (trials, 12 periods)

Which part of the smooth wall overruns a38's boards. Each trial is all five on with one part changed (the first, second, fifth
and sixth columns with the buoyancy and the drop rule on; the third and fourth with them off, so their holes differ).

| a38 1.5 m, 12 periods | All five on | The old read | No blend | Index-difference surface speed | σ_w 1 | The smooth wall off | Main |
| --- | --- | --- | --- | --- | --- | --- | --- |
| wall-water step in the wall p50/p90/p99 (m/s) | 0.118 / 1.698 / 5.771 | 0.138 / 1.787 / 6.643 | 0.134 / 1.674 / 5.674 | 0.151 / 2.236 / 7.493 | 0.099 / 1.489 / 6.113 | 0.747 / 2.836 / 8.402 | 0.720 / 3.122 / 8.504 |
| wall-water step crossing p50/p90/p99 | 0.022 / 0.044 / 0.086 | 0.024 / 0.058 / 0.178 | 1.280 / 2.784 / 3.987 | 0.023 / 0.033 / 0.133 | 0.021 / 0.038 / 0.255 | 0.669 / 2.087 / 3.503 | 0.604 / 2.038 / 3.419 |
| 2a p99 (default placement) | 0.758 | 0.525 | 0.567 | 0.687 | 0.691 | 0.392 | 0.366 |
| 2b overrun (default placement) | 52.1 % | 52.1 % | 39.6 % | 39.6 % | 54.2 % | 18.8 % | 14.6 % |
| flings >0.1 m (default placement) | 55 of 72 (76.4 %) | 65 of 72 (90.3 %) | 58 of 72 (80.6 %) | 53 of 72 (73.6 %) | 57 of 72 (79.2 %) | 45 of 72 (62.5 %) | 69 of 72 (95.8 %) |
| board force flips (default placement) | 90/7675 (1.2 %) | 133/7506 (1.8 %) | 107/7879 (1.4 %) | 169/8691 (1.9 %) | 83/7980 (1.0 %) | 523/9287 (5.6 %) | 466/8789 (5.3 %) |
| 4b jitter p99/max | 0.0283 / 0.106 | 0.0289 / 0.176 | 0.0283 / 0.106 | 0.0283 / 0.106 | 0.0408 / 0.131 | 0.1282 / 0.208 | 0.1208 / 0.204 |
| visible holes / heavy / raw | 11 / 0 / 74 | 21 / 0 / 86 | 0 / 0 / 52 | 0 / 0 / 52 | 0 / 0 / 41 | 34 / 0 / 63 | 0 / 0 / 17 |
| bar 3 one-sided p95/max | 0.101 / 0.361 | 0.044 / 0.461 | 0.101 / 0.361 | 0.101 / 0.361 | 0.094 / 0.338 | 0.050 / 0.195 | 0.051 / 0.194 |

- No part alone brings 2b back: without the wall water's blend 39.6 %, with the case's surface speed from its points' index
  differences 39.6 %, with the old read 52.1 %, at σ_w 1 54.2 %; the whole smooth wall off 18.8 %.
- The blend is what carries a body across into the wall smoothly (crossing p99 4.0 m/s without it).

## The measure (the probe, `src/wave/probes/poolTubeFace.probe.test.ts`)

Under "# Ruling 3's bars", beside the follow-up's:
- **The wall-water step:** the water at a body's bottom (2 cm up from it) step to step, before its touchdown, with its bottom
  in the water both steps: in the case's wall both steps, crossing in or out, the solver's, or the lip's water; lone boards
  apart. The 12 largest steps in the wall are listed with what the contact answered (its surface's speed, the normal, the
  depth, the blend's inputs).
- **The placement:** the default places lone boards at rest draft (5 mm) along the nearest surface's normal, moving with
  their water along it and in trim; the old placement (5 cm under, the surface's vertical speed) runs beside it on the game's
  water (`placement: 'old'`). 2a, 2b, flings and flips are reported for each; every other bar reads the default placement.
- **Flings:** lone boards more than 0.1 m clear of the water (the signed normal distance) before touchdown, at a step outside
  the lip's water with no lip over them; more than 0.3 m apart.
- **4b:** own pace against the tracker |ΔW − v̂ Δt|, v̂ W's rate the step before; the raw target's step inside a front
  |ΔW* − C Δt| as a bar; σ_v as the raw target's second difference inside a front, rms/√6 (and its |Δ²| p50, for a robust
  σ_v); the gate's engagement counted with the cap's; the read's trough at its window's end and the case's at its profile's
  last point.
- **Bar 6 per jet after the pour:** the solver's strongest breaking within ±0.5 H_s of each jet's tip at its crash, over the
  0.2 s after it; per column at all weights: each column-wave's nearest joined slice of any weight, at its first read past
  life 1.
- **Visible holes:** each open strip `dropOverlaps` drops, its weight against the kept one's and its drawn height off the
  solver's surface (its vertices are lerped to the water by its weight, so the height is weight × lift).
- **The cost:** a body's step on the game's water (mean, µs), and `COST=1 COST_ARMS=track`.

## Cost (this M1, Node, under the probes' load)

`COST=1 COST_ARMS=track` at a38: the smooth wall, the inertia and no retire on against all three off (main), 600 steps each in
alternating blocks of 25 (`runs/cost-a38-*.txt`; p50 ms):

| | a38, 1.5 m | a38, 1.8 m |
| --- | --- | --- |
| The sea's step (the read of the solver's trough is in it) | 115.45 against 115.44 | 112.82 against 112.27 |
| The contact's update (the worker: the surface's normal speed, the crest's motion over ±4 frames) | 9.62 against 6.79 (+2.8, +42 %) | 10.05 against 7.30 (+2.8, +38 %) |
| The drawing's loft build (the page) | 6.01 against 5.81 | 6.08 against 6.06 |
| The bodies' water, ms per 1000 samples | 4.56 against 4.60 | 3.86 against 4.15 |

- The default (the smooth wall off) costs nothing in the worker or the page: no retire is a branch, and the inertia is about
  thirty flops a wetted patch in the wall water (a body's step 3.6–4.0 ms with it and 3.6–4.0 ms without, under the
  probes' load, within the run-to-run spread).
- The smooth wall, opt-in, costs about 2.8 ms a step in the worker's contact update on this M1 (mostly
  `SweptLoft.normalSpeed`'s segment search and the crest's motion's two extra profile lookups a slice).
- The M4 Pro was not measured.

## What was built

Ruling 3's pieces at the Wave Pool's straight Barrel (`BarrelSpot.faceAnchor`), each behind its own switch: the inertia and
no retire on by default, the smooth wall, the buoyancy and the drop rule opt-in (the bars above). Where the ruling left something open, or a measurement showed its words needed a frame,
the choice is marked *(built so)* with its cause. Only + − × ÷ and √ in everything the sea, the contact and the drawing run.

### 1. A smooth wall (opt-in: `?tubeTrack=on`)

- **The solver's trough where it is** (`FaceAnchor.troughCrossing`, `src/wave/barrel/faceAnchor.ts:654`; `TROUGH`, `:27`):
  - the crest: the highest of the 0.25 m reads from 1 m behind the point to 3 H ahead, read on behind while the water still
    rises (a paced point runs ahead of the solver's crest), refined by the parabola;
  - the trough: past the fine reads, a read every 1 m to the window's end, in the wave's frame (from the crest's refined
    place, not on the point's lattice), each averaged over ±0.5 m; the lowest read again every 0.25 m over ±1 m and refined
    by the parabola;
  - the window's end: the crest plus half a wavelength, √(g d) T/2 at the still depth under the crest (the meter's own
    measure; `TroughWave`, `:351`, from the crash's sea, `SweptCrash.troughWave`, `src/wave/barrel/SweptCrash.ts:193`);
  - *(built so)* no further than the case's own profile reaches ahead of its crest (`FaceAnchor.reach`, `:529`). The case's
    trough is its profile's lowest point and lies on its last point on 23–29 % of reads ("check the case's trough the same
    way"): the two heights the 0.3 crossings are matched at must be measured alike. Against the solver's trough at half a
    wavelength alone, the case's own lower face stood off the solver's by p95 0.44–0.49 H_s, max 2 H_s (main 0.03 / 0.16),
    and bar 4a rose to 0.13–0.17 m a step (pool 1.5 m, 3 periods). Capped at the case's reach: 0.11 / 0.60 H_s and 0.011 m.
  - *(built so, tried)* the ±0.5 m average and the wave-frame lattice: the lowest water moved up to 0.2 m in a step where
    a jet landed in the trough; neither changed the trough's own jitter much (p90 0.010 m a step).
- **W tracked by an α–β filter** (`trackAnchor`, `:379`; `ANCHOR_TRACK`, `:345`; `trackGains`, `:357`), called by
  `CrashCurve.prepareAnchors` (`src/wave/barrel/crashCurve.ts:466`):
  - the steady-state Kalman filter of a constant-velocity target (Kalata's tracking index λ = σ_w T²/σ_v);
  - σ_v measured after the read's fix: the raw target's second difference inside a front, |Δ²| p50 0.022 m, so σ_v ≈
    0.022/(0.674 √6) ≈ 0.014 m (the rms is 0.026–0.044 m, from heavy tails); σ_w 0.3 m/s², the advisor's lower end (1 m/s²
    measured too: jitter p99 0.037 against 0.028 m, the wall water's step p99 8.3 against 12.5 m/s at the time; at a38 1.5 m, 12 periods, 2b 54 % against 52 %);
  - *(built so)* σ_v grows as the face flattens (`readNoise`, `:367`): σ_v (0.2/slope) under a slope of 0.2. The crossing
    of a level moves by the level's error over the slope; the read's noise measured p90 0.04 m a step on slopes over 0.15
    and 0.11 m under, with tails to 0.6 m (collapsed and forming faces);
  - the cap kept as the gate: W's rate within (0.45 C + 0.3 m/s) of C, and a reading that would move W further from C Δt
    in a step held as a miss; once nothing has been let in for 0.5 s the readings are taken again, W moving toward them at
    most at the cap's rate (the track never locks out: a first gate on the reading's own change locked 91 % of steps out);
  - *(built so, tried)* W tracked whole, its reading the anchors smoothed along σ plus each point's own case's crest over
    its crossing. Tracking the anchor alone and adding the case part as it is left the case's frame-to-frame steps in W
    (jitter p99 0.092 against 0.031 m; a 3-step mean of the case part 0.045 m).
- **The wall water's speed from the tracker's rate** (`p.wallSpeed = p.anchorRate`, the tracker's v̂, `crashCurve.ts:466`),
  and, measured as the next causes of the wall water's steps once that was smooth:
  - *(built so)* the case's surface's own normal speed (`SweptLoft.normalSpeed`, `src/wave/barrel/sweptLoft.ts:1804`):
    its displacement along its normal to the next frame, not its profile point's (the points slide along the surface from
    frame to frame; before the lip forms its 64–88 points all lie at one place, whose index differences moved up to
    31 m/s). Searched within 6 segments past a run of points at one place and within 10 m/s (`NORMAL_REACH`,
    `NORMAL_SPEED`, `:297–300`; a reach of 12 found other parts of the folded lip, 35 m/s off);
  - *(built so)* the case's crest's own motion for the anchor's carry over ±4 frames (`CREST_SPAN`, `:302`, at `:1178`):
    over one frame its landmark slid along a flat top at over 12 m/s on 5 % of the wall's slices, carrying every vertex's
    wall water with it;
  - *(built so)* the clock's rate the wall's shape moves at smoothed over 0.2 s (`WALL_CLOCK`, `crashCurve.ts:14`, at
    `:463`): before the throw the clock sits on its 0.5× or 1.5× bound on 5 % of steps each.
- **The wall water blended into the solver's flow across the solver's surface** (`PhysicalSurfWaterOptions.sweptBlend`,
  `src/physics/PhysicalSurfWater.ts:166`, at `:837`; `WALL_WATER.blend`, `.facing`, `:968`): its share is the smoothstep of
  the wall's height over the solver's surface in that column over 0.25 m, so a body crossing where the case's surface meets
  the solver's (about the anchor's height) sees one flow; *(built so)* and the smoothstep of the case's surface's normal's
  part in the wave's own plane (the ray and up) from 0.5 to 0.8: the largest steps left (10–19 m/s) were at nearest normals
  60–80° out of that plane (a strip's side), the climb's bound swinging the flow from −C to +C between steps.

### 2. The probe's placement (measurement only)

- Lone boards are placed at rest draft, 5 mm along the nearest surface's normal there, moving with their water along that
  normal and in trim along it (`poolTubeFace.probe.test.ts`, the `place` helper). Prone riders as before.
- The old placement (5 cm under the support, the surface's vertical speed) runs beside it in every run on the game's water
  (`placement: 'old'`), and both are reported.

### 3. The water's acceleration on the added mass, in the wall water only (on; `?tubeInertia=old` turns it off)

- `WATER_INERTIA` (`src/physics/BoardBody.ts:126`), applied at `:1128` (`BoardBody.wallInertia`, `:1542`): each wetted patch
  whose sample is in the case's wall water (`WaterSample.wallWater`, `src/physics/SurfWater.ts:93`, set by
  `PhysicalSurfWater`, `:553`, only with `sweptInertia`) takes m_a (Du/Dt · ν) ν, m_a the strip's added mass already in the
  solve; Du/Dt the change of its sampled water along its path, smoothed over 3/60 s (an exponential mean) and capped at 5 g.
  The submerged plate's other side takes the same along the board's normal from its station's patches (`plateInertia`).
  The impulse goes into the solve and the water's reaction, and the added-mass ledger.
- Never outside the wall water (extending it to the whole sea is the owner's call; not made).

### 4. No retire of contour-thrown lips (on; `?tubeRetire=old` turns it off)

- `OnsetTiming.distance.keepThrown` (`src/wave/barrel/sliceClock.ts:155`, at `:374`; set at
  `src/wave/SurfZoneSimulation.ts:1441`): under the contour throw a thrown point is never retired for being unbroken. With
  `?tubeThrow=break` (no contour) the retire stays; with the opt-in guard (`?tubeGuard=on`) the guard's own retire stays.

### 5. Buoyancy along the true normal past the clamp (opt-in: `?tubeBuoy=on`)

- `WaterSample.buoyancyNormal` (`SurfWater.ts:98`, set at `PhysicalSurfWater.ts:554` with `sweptBuoy`): in the wall water,
  where the surface's normal is steeper than the slope clamp (n_y < 0.5) or overhangs, `patchForce`
  (`src/physics/hullForces.ts:194`) pushes along that normal at the clamp's size, ρgV/0.5, instead of along the clamped
  slope's fixed 60°. Under an overhang it points down and out.

### 6. The drop rule (opt-in: `?tubeDrop=on`)

- `SweptLoft.dropOverlaps` (`sweptLoft.ts:1949`): where two fronts' strips overlap the lighter gives way, whatever its phase
  or front; on a tie the first front's stays. Two open strips at weight ≥ 0.5 both stay under the follow-up's merge, before
  the rule. The clock-split join (optional) was not trialled.

## The switches

- `TubeFace` (`src/wave/barrel/faceAnchor.ts:110–114`) gains `track`, `inertia`, `retire`, `buoy` and `drop` (`tubeFaceOf`,
  `:175–179`): `track` needs the continuity (`?tubeAnchor=old` turns it off), `inertia` and `buoy` the wall water
  (`?wallFlow=old`), `retire` the contour throw (`?tubeThrow=break`), `drop` the anchor (`?tubeFrom=piece`).
- `SurfZoneConfig.tubeTrack`, `.tubeInertia`, `.tubeRetire`, `.tubeBuoy`, `.tubeDrop` (`src/wave/SurfZoneSimulation.ts:387`);
  the URL reader `tubeFaceSwitches` (`src/game/PhysicalMode.ts:561`); online rooms pin all five to the defaults
  (`src/main.ts:531`): the inertia and no retire on, the rest off.
- `?tubeInertia=old&tubeRetire=old` (the other three off, their default): main's build byte for byte (the pin check).
- The existing switches (`?tubeContact`, `?tubeCap`, `?tubeMerge`, `?tubeGuard`, `?tubeAnchor`, `?tubeForm`, `?wallFlow`,
  `?tubeThrow`, `?tubeFace`, `?tubeFrom`, `?poolTubeCase`) work as before.

## Tests

- `src/wave/barrel/tubeTrack.test.ts` (new, 15 tests): the switches (the defaults, each alone, the two old giving the build
  before, each with what it builds on); Kalata's gains (λ² = β²/(1 − α), β = 2(2 − α) − 4√(1 − α)); the tracker through a
  point's 1 m row steps (jitter p99 under 0.008 m at σ_v 0.01 m, its rate the wave's), the gate holding a 0.5 m jump as a
  miss and taking the reads again after the hold without locking out, a miss running on at the rate, never back to the
  crest anchor, the read's noise by slope; the trough read in the wave's frame (on a moving wave the crossing stands still
  as the point steps rows; the old read's moves with them) and capped at the case's reach; the wall water's blend
  (`share`), whole where the wall stands 0.25 m over the solver's surface and between the two below; the hull's marks only
  in the wall water and nothing without the switches; the added mass carried up a sea rising at 1 g only in the wall water
  (its acceleration smoothed over three steps and capped at 5 g); the buoyancy along the true normal under an overhang; no
  retire under the contour, the retire under `?tubeThrow=break` and the guard's; the drop rule (as before between thrown
  strips, the lighter whatever its phase); the case surface's normal speed on a growing circle whose points slide along it.
- `src/wave/barrel/faceAnchor.test.ts`, `tubeContact.test.ts`, `tubeFollowUp.test.ts`: `TubeFace` with the five new keys.
- `src/game/PhysicalMode.test.ts`: the URL switches (the two `=old`, the three opt-in `=on`) and the online pin.
- **This head:** both type checks clean; the new and changed files above pass (96 tests); the main suite: 321 files passed,
  34 skipped; 3,108 tests passed, 23 expected fails, 40 skipped (551 s). SZSLINE

## For the advisor

1. **The smooth wall carries the wall water but not the boards.** All five on against main, on all four: the water at a body
   in the wall changes p50 0.08–0.15 against 0.34–0.72 m/s a step and p90 1.1–1.9 against 1.6–3.2; crossing into the wall
   p99 0.05–1.2 against 3.4–5.8 m/s; W's jitter p99 0.028 against 0.12 m; board force flips 1.2–4.5 % against 4.3–5.3 %.
   But bar 2a doubles (0.62–0.77 against 0.29–0.52 m), and at a38 1.5 m the lone boards placed 0.3 s down the line from the
   throw overrun 12 of 12 (2b 50–52 % against 15 %). Trials there (12 periods), each part changed alone: without the wall
   water's blend 2b 39.6 %; with the case surface's speed from its points' index differences 39.6 %; with the old read
   52.1 %; σ_w 1 54.2 %; the whole wall off 18.8 %. Inferred, not traced: before the lip forms the case's profile points
   64–88 sit at one place whose index differences moved up to 31 m/s, so main's wall water rose fast there and floated the
   boards; the true normal speed is slower. What should carry a board low on the face just before the throw? The smooth wall
   is opt-in (`?tubeTrack=on`) until then.
2. **The wall water's p99 step stays 5.8–8.1 m/s** with the smooth wall (bar ≤ 1). The largest steps traced: the nearest
   surface's normal swinging 60–80° between steps near a strip's side or the lip, and the climb's bound at ±C flipping on
   near-vertical and overhanging normals (n_y < 0.2: the along-ray target cannot be met). Fading the wall water by its
   normal's part in the wave's plane cut p99 9.5 → 7.8 m/s (pool 1.5 m, 3 periods). What should the wall water be where its
   nearest surface overhangs or faces along the crest?
3. **The raw target's step bar (p90 ≤ 0.02 m against C Δt) includes the case's own crest over its crossing,** which moves
   p90 0.03 m a step by itself (your table; measured up to 0.19 m a step as the wave forms, τ < −0.5 s): it cannot be met
   even with a perfect read. The read's part improved (p90 0.067–0.081 against 0.097–0.099 m). Should the bar be the solver's
   part alone, or the target against the tracker's pace (p90 0.063–0.073 against 0.11–0.12 m)?
4. **The case's trough is its profile's last point on 24–44 % of reads:** the cases' profiles end before their troughs.
   Matched against the solver's true trough (half a wavelength), the case's own lower face stood off the solver's by p95
   0.44–0.49 H_s, max 2 H_s (pool 1.5 m, 3 periods), so the solver's read is capped at the case's reach. Should the cases be
   extended to their troughs, or matched on another measure?
5. **The pre-throw clock sits on its 0.5× or 1.5× bound on 5 % of steps each** (pool 1.5 m), which jerks the case's shape
   step to step; the smooth wall moves the wall water's shape at the clock's rate smoothed over 0.2 s. Should the clock
   itself be smoothed?
6. **With no retire, bar 6 per column at weight ≥ 0.5 falls from 96–100 % to 55–78 %:** the unbroken lips now land at full
   weight, as ruled. Bar 6 per jet after the pour is 57–81 % (main 62–83 %), against ≥ 85 %: the pour's landing does not start
   the solver's breaking within ±0.5 H_s and 0.2 s on a fifth to two fifths of the jets.
7. **The default on the pool's cases:** 2b 29.2 / 31.3 % against main's 16.7 / 20.8 %. No retire alone did it at 1.5 m
   (29.2 %, with board flips 7.5 % against 4.9 %); the inertia cut the flips (5.4 %) but not 2b. At a38 the same pair
   passes 2b (10.4 % at both sizes against 14.6 / 31.3 %). Inferred: the full-weight walls to touchdown stand over boards
   that main's fading walls let float, on the pool's own (thicker) cases.
8. **The buoyancy past the clamp and the drop rule measured no help,** and are opt-in: the buoyancy moved 2a, 2b and flips
   within a run's spread on both case lists; the drop rule raised the holes (0.013 → 0.022 a build at pool 1.5 m, 0.007 →
   0.010 at a38). The clock-split join was not trialled.

## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **Tests:** the files above, then `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"` and `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t
  "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"` (`BoardBody` changed).
- **The bars:** `PROBE=1 H=1.05 CASE=pool LOG=… npx vitest run src/wave/probes/poolTubeFace.probe.test.ts --maxWorkers=2`
  - `H=1.32`; `CASE=a38`;
  - `SWITCHES=tubeInertia=old,tubeRetire=old` for main's build (the re-measure);
  - `SWITCHES=tubeTrack=on` (or `tubeBuoy=on`, `tubeDrop=on`, `tubeInertia=old`, `tubeRetire=old`) for each piece;
  - `COST=1 COST_ARMS=track` for the cost A/B (the smooth wall, the inertia and no retire on, against main's build);
  - ruling 3's bars are the last block of each log ("# Ruling 3's bars"); 15–25 min a run on this M1, three or four at a
    time.
- **The pin check:** `pin-track.ts` (its header has the command). Bundle it against main (a `git archive` of 9c3ed56b's `src`
  with `node_modules` and `public` linked in) and against the branch, and compare the lines (`runs/pin-main.txt`,
  `runs/pin-branch.txt`): every line matches but the 1.8 m default and "every ruling 3 piece on".
- The runs: `runs/` (the 12-period logs named by build and case; `c-ir-*` is the default, `main-*` main, `default-*` all five
  on as first built, `<piece>Old-*` each piece off from that, `final-*` the smooth wall on the default, the trials
  `oldread-*`, `noblend-*`, `idxspeed-*`, `sw1-*`, and `t*-*` the 3-period development runs).

## The owner's shot list

Wave Pool → Waves: **Barrel**, at **1.5 m** and at **1.8 m**, dev build (the URL switches are read). Record each. The probe's
bodies have no input, so everything about riding is the owner's to judge.

1. **The default** (the inertia and no retire on).
   - **Low on the face as it stands up:** take off low on the shoulder, just down the line from where the lip is about to
     throw, and stop paddling. Say whether the face carries you up with it or runs over you, and where.
   - **A board you let go:** after a fall, watch your board on the face. Say whether it rides up the face, is thrown off it,
     or tumbles rail over rail.
   - **Lips to the end:** every lip now lands at full strength, also where the pool's own wave has not broken yet (they used
     to fade in their last half second). Say if a lip lands on water with no whitewater, and whether it looks wrong.
   - **Holes:** ride the tube side-on and from inside. Look for a gap you can see through, or two walls crossing where two
     sections meet.
2. **`?tubeTrack=on`** (the smooth wall, opt-in): the wall's water under the board should be steadier, with no jolt as you
   cross from the flat water into the steep part, and the wall itself should not hop or shiver step to step. Compare the
   take-off low on the shoulder: the probe saw boards there run over by the face at a38 1.5 m.
3. **`?tubeInertia=old`:** no water acceleration on the board's added mass. Compare whether a board low on the face rides up
   with it or is buried.
4. **`?tubeRetire=old`:** lips the pool's wave has not broken fade before they land, as before. Compare where lips land.
5. **`?tubeBuoy=on`** (opt-in): the push of the water on a board on the steepest or overhanging wall along the wall's own
   normal. Compare boards high on the wall.
6. **`?tubeDrop=on`** (opt-in): the lighter of two overlapping sections gives way. Compare holes where two sections meet.
7. **`?poolTubeCase=pool`:** the pool's own runs with the default; the same checks (the probe saw more overruns there than
   main: 29–31 % against 17–21 %).
8. **`?tubeInertia=old&tubeRetire=old`:** main's build, for the A/B.
9. For each: where you fell and why, how the face felt under the board, any jolt, fling, flip, hole or lip on clear water.
