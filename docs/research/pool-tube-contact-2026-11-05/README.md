# The Wave Pool Barrel's surfable tube: step 7 follow-up, the contact's nearest surface (2026-11-05)

The step 7 follow-up of the surfable-tube plan: build the water-physics advisor's second ruling
(`docs/research/pool-tube-wall-2026-11-04/advisor-ruling-2.md`) on a38 at the Wave Pool's straight Barrel, and measure it.
Branch `claude/pool-tube-contact` from main 108d97c3. No rider sessions, catch reports or autopilot checks were run, and no
browser pane or dev server: the bodies in the bars are placed on the water by the probe with no input.

## Where it stands

- **The owner's calls (2026-11-05), both the advisor's way:**
  1. Call 4 extended: a passive body anywhere on the steepening face above the anchor that is drawn up and pitched counts
     as correct, not only one high at the throw.
  2. The jets stay: the throw at the throw depth and its 46–79 % more jets; the jet-count bar is retired (information); the
     meter stays within ±5 % of main; `?tubeThrow=break` stays the A/B.
- **Built (pool only, each piece behind its own switch):**
  1. the contact's nearest surface (on; `?tubeContact=old`);
  2. the anchor's cap at 0.45 C, and a long miss run on at C (on; `?tubeCap=old`);
  3. the holes: the join beside a front's end and the drop rule (on; `?tubeMerge=old`);
  4. the retire guard by the case's open time, the paced points' breaks, and the unbroken jet returned to its crest
     (**opt-in**, `?tubeGuard=on`: the coordinator's call, 2026-11-05, as on it raised the meter 8.1 % at a38 1.5 m).
  With the first three old the build is main's byte for byte (the pin check, below). Online rooms pin the defaults.
- **Re-measured first:** the probe measures the re-ruled bars on main's build and the branch's alike (the "main" columns):
  bar 2 along the nearest surface's normal, before each body's own touchdown; 2b's three outcomes; bar 3 one-sided; 4b's
  jitter, own pace, single steps and cap engagement; the ledger; holes at weight ≥ 0.5. Main's own figures change a lot under
  the new measure (2a p99 0.62–0.69 m at a38 against 0.78–0.96 m vertically; 2b passes on main with the pool's cases).
- **Passes** (the default, on all four of a38 and the pool's cases at 1.5 and 1.8 m):
  - **the meter within ±5 % of main** on all four: 1.559 / 1.882 m at a38 (main 1.560 / 1.883), 1.601 / 1.928 m on the
    pool's cases (main 1.604 / 1.920): −0.1 %, −0.1 %, −0.2 %, +0.4 %;
  - bar 1 (never under the solver); bar 4a (p99 0.006–0.011 m a step); bar 7 and formation (97–98 %);
  - bar 4b's single steps over 0.1 m: 0 on all four, the largest 0.095–0.100 m (main: 0 / 78 / 0 / 49, up to 1.9 m, from the
    `stood` misses); its fallbacks (0), pre-throw clock (100 %) and weight (1/18);
  - the ledger's one throw per crest and starved volume (0.2–3.5 %);
  - bar 8 at weight ≥ 0.5 (0 holes; main 0 too), and holes ≤ 0.01 a build at a38 1.5 m (0.002; main 0.028);
  - the pin check.
- **Fails:**
  - **bar 2a:** 0.40 / 0.44 m at a38 (main 0.62 / 0.69), 0.32 / 0.55 m on the pool's cases (main 0.39 / 0.42), against 0.15 m;
    40–71 bodies a run over 0.15 m for more than 0.1 s.
  - **bar 2b:** overrun 31 / 44 % at a38 (main 44 / 54 %) and 25 / 40 % on the pool's cases, where main passes (8 / 17 %),
    against ≤ 20 %. Most of the overruns are lone boards placed at the throw.
  - **the risks the ruling named came:** the hull force turns past 90° in a step on 3.9–4.4 % of the lone boards' steps at a38
    (main 1.8–2.0 %) and 4.6–6.9 % on the pool's cases (main 0.6–0.9 %), from the contact (2.2–2.8 % at a38 without it, with
    the guard on). Boards flung more than 0.3 m clear before touchdown: 33 / 43 at a38 (main 22 / 31), 31 / 43 on the pool's
    cases (main 26 / 35).
  - **bar 3's max:** 0.16–0.20 H_s against 0.1 (main 0.03–0.18); its p95 is at the bar at a38 (0.051 / 0.045) and passes on
    the pool's cases.
  - **bar 4b's jitter** (p99 0.120–0.121 m against 0.005; main 0.082–0.084), **own pace** (p99 0.33–0.36 m against 0.01) and
    **cap engagement** (51–55 % against 10 %; main 69–75 %).
  - **the ledger, with the guard off as main:** thrown points unbroken at touchdown pour their jets (427 / 458 / 443 / 475 a
    run; main 433 / 445 / 455 / 481); **bar 6 per jet** 55–76 % within ±0.5 H_s and 57–80 % within ±1 H_s (main 54–75 /
    55–81 %), against ≥ 85 / ≥ 90 %. `?tubeGuard=on` fixes the first (0 poured) and lifts bar 6 per jet to 74–83 / 77–88 %,
    but raises the meter at a38 1.5 m to +8.1 %.
  - **holes** at a38 1.8 m (0.032) and on the pool's cases (0.011 / 0.075; main 0.011 / 0.035). The hole count moves up to
    10× between runs whose builds differ by one or two jets (the guard-on pool runs before and after the foreseen-path fix:
    0.0014 → 0.016, 0.026 → 0.069), so 12 periods do not resolve it to 0.01.
- **Not measured:** the M4 Pro's cost; ride-camera strips (they need the page's renderer).

## The bars (the advisor's re-ruled bars), the default against main

12 periods after 50 s, CPU, 1/60 s steps, reef columns s 30–95, bodies at s 55. Each cell is **the default** (the guard off;
main: the follow-up's switches old, byte for byte main's build, re-measured with the same probe). Runs: `runs/default-*.txt`,
`runs/main-*.txt`. The guard-off default at a38 reproduces, number for number, the earlier runs with the guard switched old
(`runs/guardOnSwitchedOld-*.txt`): the build is deterministic.

| Bar | a38 1.5 m | a38 1.8 m | pool 1.5 m | pool 1.8 m |
| --- | --- | --- | --- | --- |
| 2a. Along the nearest normal, before the body's σ touchdown, outside the lip's water: p99 ≤ 0.15 m | **0.400** (0.615) | **0.440** (0.689) | **0.317** (0.391) | **0.547** (0.421) |
| 2a. Bodies over 0.15 m for more than 0.1 s (0) | **52 of 216** (72 of 216) | **71 of 222** (97 of 222) | **40 of 216** (47 of 216) | **54 of 234** (40 of 228) |
| 2a. (Information) after touchdown, p99 m | **0.196** (0.348) | **0.324** (0.437) | **0.048** (0.321) | **0.184** (0.204) |
| 2b. Passive boards and prone riders at 0.3 H_s, ahead and at the throw: overrun ≤ 20 % | **31.3 %** (43.8 %) | **43.8 %** (54.2 %) | **25.0 %** (8.3 %) | **39.6 %** (16.7 %) |
| 2b. Carried / pitched / overrun (pitched into the lip's water) | **4/29/15 of 48 (lip 1)** (2/25/21 of 48 (lip 0)) | **1/26/21 of 48 (lip 1)** (1/21/26 of 48 (lip 0)) | **13/23/12 of 48 (lip 2)** (20/24/4 of 48 (lip 2)) | **5/24/19 of 48 (lip 6)** (16/24/8 of 48 (lip 0)) |
| 2c. (Information) 0.6 H_s bodies, carried / pitched / overrun | **1/68/39 of 108** (1/65/42 of 108) | **0/71/40 of 111** (1/59/51 of 111) | **2/72/34 of 108** (6/66/36 of 108) | **3/78/36 of 117** (9/73/32 of 114) |
| Risk: lone boards more than 0.3 m clear of the water before touchdown | **33 of 72** (22 of 72) | **43 of 74** (31 of 74) | **31 of 72** (26 of 72) | **43 of 78** (35 of 76) |
| Risk: the hull force turning past 90° in a step, board · prone · rider (flips / steps) | **360/8156 · 112/2536 · 36/2132** (146/7230 · 46/1834 · 33/2418) | **292/7474 · 69/2346 · 59/2098** (129/7303 · 23/2142 · 38/2128) | **757/10941 · 38/4750 · 42/2642** (90/10037 · 5/6463 · 2/2174) | **512/11061 · 58/3935 · 37/1792** (60/10465 · 8/6621 · 2/1507) |
| 3. One-sided: the case over the solver at 0.05–0.25 H_s, p95 ≤ 0.05 / max ≤ 0.1 H_s | **0.051 / 0.194** (0.034 / 0.178) | **0.045 / 0.201** (0.028 / 0.154) | **0.010 / 0.158** (0.000 / 0.103) | **0.001 / 0.164** (0.000 / 0.026) |
| 4b. Jitter p99 ≤ 0.005 / max ≤ 0.02 m | **0.1208 / 0.204** (0.0830 / 0.173) | **0.1213 / 0.226** (0.0843 / 2.000) | **0.1203 / 0.199** (0.0817 / 0.163) | **0.1200 / 0.234** (0.0841 / 1.658) |
| 4b. Against the case's own pace p99 ≤ 0.01 m | **0.3644** (0.3668) | **0.3271** (0.3784) | **0.3382** (0.3611) | **0.3552** (0.3625) |
| 4b. Single steps \|ΔW − C Δt\| over 0.1 m (0), consecutive steps (max m) | **0 (0.095)** (0 (0.067)) | **0 (0.100)** (78 (1.891)) | **0 (0.096)** (0 (0.066)) | **0 (0.099)** (49 (1.554)) |
| 4b. (Not one step) reads across unread steps over 0.1 m (max m) | **32 (1.592)** (40 (2.252)) | **33 (1.911)** (38 (1.778)) | **31 (3.188)** (24 (1.104)) | **59 (2.214)** (64 (3.771)) |
| 4b. The cap engaged ≤ 10 % of steps | **51.6 %** (68.8 %) | **51.3 %** (71.8 %) | **54.3 %** (72.1 %) | **54.6 %** (74.9 %) |
| 4b. (Information) \|ΔW − C Δt\| p99 m | **0.0718** (0.0502) | **0.0729** (0.0526) | **0.0705** (0.0493) | **0.0729** (0.0514) |
| 4b. (Information) the target's own step \|ΔW* − C Δt\| p50/p99 m, inside · within 3 points of the ends | **0.0281/0.2013 · 0.0456/0.5438** (0.0286/0.2035 · 0.0448/0.5310) | **0.0272/0.2443 · 0.0442/0.4784** (0.0268/0.2422 · 0.0450/0.5262) | **0.0222/0.2448 · 0.0364/0.5268** (0.0211/0.2442 · 0.0371/0.5290) | **0.0205/0.2821 · 0.0367/0.5500** (0.0203/0.2763 · 0.0382/0.5430) |
| 4b. Crest-anchor fallbacks after a first face anchor (0) | **0** (0) | **0** (0) | **0** (0) | **0** (0) |
| 4b. The pre-throw clock within 0.5–1.5× | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) |
| 4b. The weight's change, max ≤ 1/18 | **0.0556** (0.0556) | **0.0556** (0.0556) | **0.0556** (0.0556) | **0.0556** (0.0556) |
| Ledger: crests thrown more than once (0) | **0 of 673** (0 of 671) | **0 of 716** (0 of 714) | **0 of 677** (0 of 677) | **0 of 719** (0 of 721) |
| Ledger: thrown points unbroken at touchdown (their jets poured: 0) | **458 of 673 (427)** (458 of 672 (433)) | **476 of 717 (458)** (466 of 715 (445)) | **470 of 672 (443)** (477 of 672 (455)) | **494 of 718 (475)** (493 of 719 (481)) |
| Ledger: jets returned to their crests (the guard) | **—** (—) | **—** (—) | **—** (—) | **—** (—) |
| Ledger: starved ≤ 5 % of asked | **3.51 %** (3.36 %) | **3.54 %** (3.44 %) | **0.22 %** (0.25 %) | **0.67 %** (0.61 %) |
| Ledger: bar 6 per jet, on the solver's breaking within ±0.5 / ±1 H_s | **55.3 % / 57.1 % of 629** (53.5 % / 55.1 % of 635) | **64.6 % / 65.9 % of 684** (66.0 % / 66.8 % of 677) | **66.2 % / 70.2 % of 625** (64.8 % / 69.5 % of 633) | **75.8 % / 79.7 % of 681** (74.7 % / 80.7 % of 693) |
| (Bar 6 per column, slices at weight ≥ 0.5, within ±0.5 H_s) | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) | **100.0 %** (97.0 %) | **96.3 %** (94.3 %) |
| Ledger: the meter (typical, m), within ±5 % of main | **1.559** (1.560) | **1.882** (1.883) | **1.601** (1.604) | **1.928** (1.920) |
| Ledger: (information) jets thrown / crashed | **629/628** (634/634) | **681/682** (675/676) | **635/625** (643/634) | **681/678** (693/690) |
| 8. Holes ≤ 0.01 a build / at weight ≥ 0.5 (0) / folds (information) | **0.0024 / 0 / 0.212** (0.0283 / 0 / 0.337) | **0.0319 / 0 / 0.403** (0.0221 / 0 / 0.255) | **0.0107 / 0 / 0.383** (0.0114 / 0 / 0.133) | **0.0753 / 0 / 0.406** (0.0351 / 0 / 0.187) |
| 1. Support ≥ solver − 0.02 m | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) | **100.0 %** (100.0 %) |
| 4a. Below the anchor, rise p99 ≤ 0.02 m a step | **0.0092** (0.0066) | **0.0108** (0.0086) | **0.0056** (0.0006) | **0.0056** (0.0004) |
| 7. The clock after the throw, p50 / p95 | **1.000/1.250** (1.000/1.250) | **1.000/1.250** (1.000/1.250) | **1.000/1.054** (1.000/1.057) | **1.000/1.039** (1.000/1.042) |
| 7. Formation within 0.1 s of τ_e | **98.3 %** (98.3 %) | **97.4 %** (97.4 %) | **97.9 %** (97.9 %) | **96.9 %** (97.1 %) |
| 5. (Information) usable clearance p50, m | **0.29** (0.29) | **0.42** (0.42) | **0.00** (0.00) | **0.02** (0.01) |

### The guard (`?tubeGuard=on`), against the default

Each cell is the default (the guard off), with the guard on in brackets (`runs/guardOn-*.txt`: the default before it became
opt-in).

| Bar | a38 1.5 m | a38 1.8 m | pool 1.5 m | pool 1.8 m |
| --- | --- | --- | --- | --- |
| Meter (m) | 1.559 (on: 1.686) | 1.882 (on: 1.895) | 1.601 (on: 1.599) | 1.928 (on: 1.918) |
| Unbroken at touchdown (poured) | 458 of 673 (427) (on: 223 of 669 (0)) | 476 of 717 (458) (on: 84 of 714 (0)) | 470 of 672 (443) (on: 144 of 671 (0)) | 494 of 718 (475) (on: 104 of 713 (0)) |
| Jets returned | — (on: 206) | — (on: 73) | — (on: 124) | — (on: 94) |
| Bar 6 per jet ±0.5 / ±1 H_s | 55.3 % / 57.1 % of 629 (on: 78.6 % / 80.2 % of 425) | 64.6 % / 65.9 % of 684 (on: 73.9 % / 76.7 % of 605) | 66.2 % / 70.2 % of 625 (on: 80.6 % / 85.7 % of 510) | 75.8 % / 79.7 % of 681 (on: 83.2 % / 88.3 % of 579) |
| Bar 6 per column | 100.0 % (on: 79.5 %) | 100.0 % (on: 75.7 %) | 100.0 % (on: 88.5 %) | 96.3 % (on: 84.2 %) |
| 2a p99 (m) | 0.400 (on: 0.367) | 0.440 (on: 0.447) | 0.317 (on: 0.382) | 0.547 (on: 0.463) |
| 2b overrun | 31.3 % (on: 29.2 %) | 43.8 % (on: 37.5 %) | 25.0 % (on: 25.0 %) | 39.6 % (on: 35.4 %) |
| Force flips, board (flips / steps) | 360/8156 (on: 412/8266) | 292/7474 (on: 346/7466) | 757/10941 (on: 814/11317) | 512/11061 (on: 587/10736) |
| Holes / at ≥ 0.5 / folds | 0.0024 / 0 / 0.212 (on: 0.0093 / 0 / 0.224) | 0.0319 / 0 / 0.403 (on: 0.0165 / 0 / 0.368) | 0.0107 / 0 / 0.383 (on: 0.0161 / 0 / 0.341) | 0.0753 / 0 / 0.406 (on: 0.0692 / 0 / 0.463) |
| Formation | 98.3 % (on: 96.7 %) | 97.4 % (on: 95.2 %) | 97.9 % (on: 96.2 %) | 96.9 % (on: 94.7 %) |

### The measure (the probe, `src/wave/probes/poolTubeFace.probe.test.ts`)

- **Along the nearest normal** (`signedNormal`): a body's bottom's signed distance to the game's water's surface (the union:
  under the solver's surface, or in the swept surface's water), searched in the ray–vertical plane along 24 directions every
  0.025 m and bisected to 1.6 mm, out to the vertical distance to the support. Probe-only (its own contact hit), so it reads
  main's build and the branch's alike.
- **Before the body's σ touchdown:** the contact's life at the body's own place reaching 1, latched (off the loft, its
  placement slice's touchdown); outside the lip's water (no water floor under it).
- **2b's outcomes,** to touchdown, the first that happens: *pitched* into the lip's water, or off the surface (a prone rider
  separating within 0.1 m of where it started along the normal; a lone board more than 0.1 m clear of the water); *overrun*
  more than 0.1 m deeper along the normal than it started; else *carried*. A lone board "off the surface" includes boards
  flung out through the face: they left it at p50 0.6–2.4 m/s up and 3.8–5.0 m/s shoreward (the probe's information line),
  so 2b's "pitched" for boards is not all over the falls. Lip hits on a prone rider's head or torso are counted apart (none).
- **4b:** W is the case's crest's place along each point's ray (as step 7); its jitter |ΔW_n − ΔW_(n−1)|, its change against
  the smoothed target's (ΔW*, the case's own pace) and against C Δt, over consecutive steps only (a step across reads the probe
  missed is listed apart); the cap's engagement from `continueAnchor`'s outcomes over the run.
- **The ledger:** throws per crest (`SweptCrash.paced`, by point); each point's touchdown (its clock crossing its case's),
  flagged unbroken or not, and whether its jet then poured; bar 6 per jet at each pouring jet's crash (its slice's lip tip,
  the solver's breaking within ±0.5 / ±1 H_s).
- **Holes at weight ≥ 0.5:** counted in `dropOverlaps` (`LoftResult.overlapsOpenHeavy`), with each hole's two fronts logged.

### What each piece does (a38, its switch alone)

Each cell is 1.5 m; 1.8 m. Measured while the guard was still on by default: the first column is the guard on, and each next
column turns one piece off from there (the guard-off column is today's default); main is all the follow-up off.

| Bar (a38, 1.5 m / 1.8 m) | The guard on (then the default) | `?tubeContact=old` | `?tubeCap=old` | `?tubeMerge=old` | The guard off (today's default) | Main (all old) |
| --- | --- | --- | --- | --- | --- | --- |
| 2a p99 (m) | 0.367; 0.447 | 0.570; 0.580 | 0.383; 0.398 | 0.367; 0.447 | 0.400; 0.440 | 0.615; 0.689 |
| 2a bodies over 0.15 m for over 0.1 s | 64 of 216; 65 of 228 | 80 of 216; 83 of 228 | 53 of 216; 69 of 228 | 64 of 216; 65 of 228 | 52 of 216; 71 of 222 | 72 of 216; 97 of 222 |
| 2b overrun | 29.2 %; 37.5 % | 54.2 %; 50.0 % | 33.3 %; 41.7 % | 29.2 %; 37.5 % | 31.3 %; 43.8 % | 43.8 %; 54.2 % |
| Flung more than 0.3 m (lone boards) | 28 of 72; 36 of 76 | 26 of 72; 28 of 76 | 27 of 72; 32 of 76 | 28 of 72; 36 of 76 | 33 of 72; 43 of 74 | 22 of 72; 31 of 74 |
| Force flips, board (flips / steps) | 412/8266; 346/7466 | 212/7538; 155/7017 | 273/7744; 274/7791 | 410/8267; 346/7466 | 360/8156; 292/7474 | 146/7230; 129/7303 |
| 4b jitter p99 / max (m) | 0.1280 / 0.223; 0.1258 / 0.213 | 0.1280 / 0.223; 0.1258 / 0.213 | 0.0867 / 1.883; 0.0864 / 1.940 | 0.1280 / 0.223; 0.1258 / 0.213 | 0.1208 / 0.204; 0.1213 / 0.226 | 0.0830 / 0.173; 0.0843 / 2.000 |
| 4b single steps over 0.1 m (max) | 4 (0.148); 0 (0.099) | 4 (0.148); 0 (0.099) | 140 (1.768); 66 (1.832) | 4 (0.148); 0 (0.099) | 0 (0.095); 0 (0.100) | 0 (0.067); 78 (1.891) |
| 4b cap engaged | 51.7 %; 51.7 % | 51.7 %; 51.7 % | 68.6 %; 70.8 % | 51.7 %; 51.7 % | 51.6 %; 51.3 % | 68.8 %; 71.8 % |
| 4b \|ΔW − C Δt\| p99 (m) | 0.0758; 0.0766 | 0.0758; 0.0766 | 0.0537; 0.0534 | 0.0758; 0.0766 | 0.0718; 0.0729 | 0.0502; 0.0526 |
| Unbroken at touchdown (poured) | 223 of 669 (0); 84 of 714 (0) | 223 of 669 (0); 84 of 714 (0) | 229 of 672 (0); 99 of 720 (0) | 223 of 669 (0); 84 of 714 (0) | 458 of 673 (427); 476 of 717 (458) | 458 of 672 (433); 466 of 715 (445) |
| Bar 6 per jet ±0.5 / ±1 H_s | 78.6 % / 80.2 % of 425; 73.9 % / 76.7 % of 605 | 78.6 % / 80.2 % of 425; 73.9 % / 76.7 % of 605 | 81.4 % / 82.4 % of 425; 76.2 % / 77.2 % of 596 | 78.6 % / 80.2 % of 425; 73.9 % / 76.7 % of 605 | 55.3 % / 57.1 % of 629; 64.6 % / 65.9 % of 684 | 53.5 % / 55.1 % of 635; 66.0 % / 66.8 % of 677 |
| Meter (m) | 1.686; 1.895 | 1.686; 1.895 | 1.677; 1.886 | 1.686; 1.895 | 1.559; 1.882 | 1.560; 1.883 |
| Jets thrown / crashed | 635/425; 677/603 | 635/425; 677/603 | 631/425; 681/594 | 635/425; 677/603 | 629/628; 681/682 | 634/634; 675/676 |
| Holes / at ≥ 0.5 / folds | 0.0093 / 0 / 0.224; 0.0165 / 0 / 0.368 | 0.0093 / 0 / 0.224; 0.0165 / 0 / 0.368 | 0.0131 / 0 / 0.268; 0.0590 / 0 / 0.487 | 0.0093 / 0 / 0.219; 0.0165 / 0 / 0.356 | 0.0024 / 0 / 0.212; 0.0319 / 0 / 0.403 | 0.0283 / 0 / 0.337; 0.0221 / 0 / 0.255 |
| Joined beside a front's end | 0; 0 | 0; 0 | 0; 0 | 0; 0 | 0; 0 | 0; 0 |
| Formation | 96.7 %; 95.2 % | 96.7 %; 95.2 % | 96.7 %; 95.0 % | 96.7 %; 95.2 % | 98.3 %; 97.4 % | 98.3 %; 97.4 % |

- **The contact** (with the guard on) carries the bodies at a38: without it, 2a's p99 is 0.57–0.58 m and 2b overruns 50–54 %; with it 0.37–0.45 m
  and 29–38 %. It also brings the risk the ruling named: the hull force turning past 90° in a step on 5.0 / 4.6 % of the lone
  boards' steps (2.8 / 2.2 % without it; main 2.0 / 1.8 %), and a few more boards flung clear. It changes nothing in the sea or
  the drawing (the probe applies no body reactions).
- **The cap** (0.45 C and the run-on miss) carries 4b's single steps (140 / 66 over 0.1 m, up to 1.8 m, without it; 4 / 0, at
  most 0.15 m, with it) and halves the holes at 1.8 m (0.059 → 0.017). It engages on 52 % of steps (69–71 % at 0.3 C), not
  under 10 %, and lets more of the target's noise through: jitter p99 0.087 → 0.128 m.
- **The merge** changed nothing measurable: no join beside a front's end met the split's condition (0 merges), and no open
  strip at weight ≥ 0.5 was about to be dropped (main has none either).
- **The guard** carries the ledger (unbroken jets poured: 427 / 458 without it, 0 with it; bar 6 per jet 55–65 % → 74–79 %)
  and raises the meter at a38 1.5 m by 8 % (1.559 → 1.686 m; at 1.8 m +0.7 %). It returns 206 / 73 jets to their crests.
  So it is opt-in (`?tubeGuard=on`).

## Cost (this M1, Node, under the probes' load)

The `COST=1 COST_ARMS=followUp` A/B (measured while the guard was on by default; the cast is the cost, the guard's own
work is per point, not per sample): the default against main's build on the same a38 sea, 600 steps each in alternating blocks
of 25 (`runs/cost-a38-*.txt`). Values are p50.

| | a38, 1.5 m | a38, 1.8 m |
| --- | --- | --- |
| The bodies' water, 64 samples through the middle standing slice's wave (ms per 1000 samples) | 2.87 against 2.01 (+0.85 µs a sample, +42 %) | 2.42 against 1.75 (+0.67 µs, +39 %) |
| The contact's update (the worker) | 3.82 against 3.90 | 4.05 against 3.86 |
| The drawing's loft build (the page) | 3.49 against 3.48 | 3.65 against 3.41 |
| The sea's step | 59.97 against 60.03 | 59.83 against 59.15 |

- **Per body:** a body step samples the water about 720–800 times (lone boards, prone riders and riders together; the probe
  counts them). If every one were in the wave, the cast would add about 0.5–0.7 ms a body a step on this M1; only the
  samples in the case's wall cast, so it is less (not split out). The ruling estimated 0.05–0.2 ms.
- The contact's update, the drawing and the sea's step do not change beyond the run-to-run spread (the cast is per sample).
- The M4 Pro was not measured.

## For the advisor

1. **Bodies on the pool's cases are worse with the nearest surface** (2b overrun 8 / 17 % → 25 / 35 %; 2a about the same;
   flips 0.6–0.9 % → 5.5–7.2 % of the boards' steps), while at a38 they are better (2b 44 / 54 % → 29 / 38 %, 2a 0.62 / 0.69 →
   0.37 / 0.45 m). The flips and flings are the ruling's own risk: at a near-vertical nearest surface the clamped hydrostatic
   slope (√3) pushes a submerged hull out through the face at 1.73× its buoyancy; a board leaving the wall then meets it again.
   (Inferred: the face's true pressure gradient is the water's acceleration plus g, Froude–Krylov, not ρg times the clamped
   slope.) What should the hull's buoyancy follow at the nearest surface: its normal, the clamp, or the water's acceleration?
2. **Boards placed at the throw at 0.3 H_s are overrun 9–12 of 12** on main and the default. They sit at the anchor's height,
   where the wall water's along-ray ramp starts (r = 0: the solver's flow), so they get the face's normal speed but no climb
   (inferred from the code; not traced).
3. **4b's target is noisy, not fast.** The smoothed anchor's own place moves against the wave by p50 0.02–0.03 m, p90 0.10 m and
   p99 0.21–0.29 m a step inside a front (0.5 m at the ends), so a rate cap engages on half the steps whatever its width, and
   the jitter (0.005 m) and own-pace (0.01 m) bars cannot be met by a cap. Inferred: the noise is the raw shift read each step
   (the solver's 0.3 H crossing along the ray, read every 0.25 m). The 0.45 C cap let more of it through (jitter 0.087 → 0.128 m).
4. **The guard raises the meter at a38 1.5 m by 8 %,** so it is opt-in (`?tubeGuard=on`) and the default pours, as main, the
   jets of 427–475 points a run the solver never broke by their touchdown. On, it returns 206 jets (a third) to their crests
   instead. Inferred: those pours lowered the faces the meter reads (crest to the trough ahead). Is a return right, should a
   retired point's jet pour where it was foreseen, or is the meter's ±5 % of main the bar to keep?
5. **The ruling's two drop-rule words and its join, measured:** keeping the earlier-thrown strip raised the holes 9×; the join
   beside a front's end, literal, merges nothing once limited to where the split would part the two (and taking the end's join
   on every join chained whole peels). The holes the probe logs are two fronts whose end points are 1.0–1.5 m apart in
   neighbouring columns, their clocks 0.2–0.5 s apart, parted by the split's 1 s/m on their joins (inferred: a crest sized late joins late however near
   its contour it is).

## What was built

The ruling's changes, at the Wave Pool's straight Barrel only (`BarrelSpot.faceAnchor`), each piece behind its own switch,
all on by default. Where the ruling left something open, or a measurement showed its words needed a frame, the choice is
marked *(built so)* with its cause. Only + − × ÷ and √ throughout (online determinism); `BoardBody` is unchanged.

### 1. The contact's nearest surface (`?tubeContact=old` turns it off)

- **The cast** (`SweptContact.nearestSurface`, `src/wave/barrel/sweptContact.ts:423`, called at `:410`): at a point in the
  case's water with no water floor (the wall), a horizontal ray shoreward along the strip's interpolated ray, at the point's
  height, within `NEAREST.reach` 1 m (`:143`), through the strip's existing 0.5 m buckets (Möller–Trumbore on each quad's two
  triangles). The first crossing ahead gives its normal (the loft's vertex normals by its barycentrics), its surface's
  velocity along the ray and up (`wall.along`/`wall.up` by the same weights) and its place.
- **The choice** (`:508`): the crossing above's depth along its own normal, d_v |n_y| (`verticalDepth`), against the face
  ahead's, d_h |n_a| (`aheadDepth`); the face ahead's share `aheadWeight` is a smoothstep over ±`NEAREST.blend` 0.05 m of their
  difference, and `normalDepth` the blend.
  - *(Built so)* the crossing above also answers along its normal (d_v |n_y|), not vertically: on a plane face the two are
    the same distance, and a vertical d_v blended with d_h |n_a| would read 1.5× the true depth at a 60° plane.
  - *(Built so)* the face ahead also fades out over the cast's last 0.1 m (`NEAREST.fade`), so its answer never steps where
    the face leaves the reach (a body more than about 0.9 m inside the wall).
  - The vertical answer's own fields (`surfaceY`, the normal, `wallAlong`/`wallUp`) are left as they were; the new fields sit
    beside them (`ContactHit.normalDepth`, `.aheadWeight`, `.ahead…`, `:113–136`).
- **The water** (`PhysicalSurfWater.nearestSurface`, `src/physics/PhysicalSurfWater.ts:733`; `sweptNearest`, `:158`, set at
  `:400`): in the wall over the solver's surface (`:710`), and under it where the case's surface stands over it (`:688–696`,
  where `inWall` is now set too), the face ahead's share is kept only where the solver's surface at the face ahead stands under
  the point's height (faded over 0.05 m: else the solver's water goes on past that face), then the two answers are blended:
  `surfaceY = y + depth` along the normal, the blended normal with the existing slope clamp (`MIN_NORMAL_Y` 0.5), and the
  blended surface velocity for the wall's water. The cell weights the flow reads are restored after (`:470`).
- **The kinematic fade** (`wallWaterFlow`, `WALL_WATER.fade`, `:916`, applied at `:944`): the wall water's normal component
  goes linearly from the case's surface's own normal speed at 0.3 m along the normal to the solver's at 0.6 m (inferred, as
  the ruling).

### 2. The anchor's cap (`?tubeCap=old` turns it off)

- `ANCHOR_CONTINUITY.crestWide` 0.45 (`src/wave/barrel/faceAnchor.ts:154`), passed by `CrashCurve.prepareAnchors`
  (`src/wave/barrel/crashCurve.ts:400, 439`) into `continueAnchor`'s new `crestShare` (`faceAnchor.ts:192`).
- **The 1.1–3.8 m single steps, traced** (the probe now lists each with what the anchor did, its point's row step and how many
  steps it spans): two causes, neither the cap.
  1. **A measure artefact, most of them:** the probe compared W's change across 3–43 steps in which it could not read the
     point (its records unread) against one step's C Δt. Counted over consecutive steps only, main's largest single step is
     0.067 m at a38 1.5 m.
  2. **A build artefact at 1.8 m:** after a miss held past 0.5 s the shift "stood with the point", and once its pace has ended
     a point is its crest cell's centre, stepping 1–2 m rows: the drawn crest stepped with it (traced on main: 0.6–1.9 m single
     steps, all `stood`, at τ 2.8–3.4 s). Fixed under the same switch: past the hold a miss runs on at the wave's own advance C
     along the ray (`faceAnchor.ts:223`), in the wave's frame as the cap holds it.

### 3. The holes (`?tubeMerge=old` turns it off)

- **The join beside a front's end** (`BreakingFront.endBeside`, `src/wave/barrel/BreakingFront.ts:668`, used at `:507`;
  `MERGE`, `:15`): a crest joining by distance beside a front's end point (a neighbouring column whose front has no point in
  the crest's), within 1.5 slice spacings (the front's, a column: 1.5 m) and 0.3 s of its clock (τ_e as it joins), takes that
  end's join time, so the split by joins (1 s/m) never parts them.
  - *(Built so)* only where the split would part the two: taking the end's join on every join beside one (903 of 1,000 at
    a38 1.5 m) carried the first join down the whole peel, so the split never parted two waves (folds 0.34 → 0.75 a build).
  - *(Built so, tried)* by the joiner's distance clock (−D/C_p) instead of τ_e: 930 of 1,000 joins merged, holes 0.157 and
    folds 0.99 a build, formation 67 %. Not kept.
- **The drop rule** (`SweptLoft.dropOverlaps`, `src/wave/barrel/sweptLoft.ts:1826–1860`): an open strip at weight ≥ 0.5 is
  never dropped; two such overlapping both stay (a fold, which the contact's first front answers; counted
  `overlapsKept`). A thrown cut end now blends over max(1 m, H) as a front's own thrown end does (`sealRuns`, `:1567`).
  - *(Built so)* between two thrown strips the lighter still gives way, as before. Keeping the earlier-thrown one instead
    (the ruling's words) raised the holes 9× at a38 1.5 m in 12 periods (0.009 → 0.083 a build): in the holes logged, the
    earlier-thrown piece was mostly a short one already faded (weight 0.00–0.02) beside a live one.

### 4. The retire guard (opt-in: `?tubeGuard=on` turns it on)

*Off by default since the coordinator's call (2026-11-05): on, it raised the meter 8.1 % at a38 1.5 m, past the owner's ±5 %
of main. Its stale-flag clear (`paceBreak`) stays under the same switch: with the guard off, the guard is main's, stale flags
and all, and the clear alone was not measured (it would keep about 155 more slices at full weight to their touchdown).*

The measured gap was not rare: on main, 458 of 672 thrown points (a38 1.5 m, 12 periods) were still flagged unbroken at
their touchdown and 433 of them poured their jets; per jet, only 53.5 % landed on the solver's breaking within ±0.5 H_s.
(Bar 6 per column read 100 % because it reads only slices at weight ≥ 0.5, and these had retired to 0.06–0.3.) Two causes:

1. **A stale flag** (a build artefact): a point thrown before the solver broke it runs on its pace and claims its crest apart
   (`keptCrests`), and that branch never cleared `unbroken` when the claimed crest broke. 154–156 of the flagged points stood
   on the solver's breaking at their touchdown and were retired all the same. Now (`FrontOptions.paceBreak`,
   `BreakingFront.ts:126`, at `:422`) the flag clears when the claimed crest's strength is over 0, as it does off the pace, and
   its retirement recovers at the weight's rate (`sliceClock.ts:372`).
2. **The guard outlasting the open time:** 0.3 s + 0.5 s against a38's 0.70–0.79 s. *(Chosen)* The guard keeps its own
   proportions (3 : 5) and is scaled to each point's case's open time T (`GUARD`, `src/wave/barrel/sliceClock.ts:156`;
   `OnsetTiming.distance.openTime`, `:147`, set at `src/wave/SurfZoneSimulation.ts:1394`): it retires from 0.375 T over
   0.625 T, whole at its touchdown. A point still unbroken at its touchdown then returns its held jet to the crest it left
   (`SweptCrash.ts:364`; `PlungingLip.returnJet`, `src/wave/PlungingLip.ts:878`): its water and the momentum `drawFromCrest`
   took with it (kept on the strip, `taken`, `:298`, and carried by the sea handover) go back to the solver at the point's
   crest, nothing lands and no air is trapped. Cause: the solver never broke that crest, so its lip never plunged; the drawn
   lip has faded back into the wave, and its water with it.


## The switches

- `TubeFace` (`src/wave/barrel/faceAnchor.ts:35`) gains `contact`, `cap`, `merge` and `guard` (`tubeFaceOf`, `:125–128`):
  `contact` needs the union (`?tubeFace=old` turns it off with it), `cap` the continuity (`?tubeAnchor=old`), `guard` the
  contour throw (`?tubeForm=old` or `?tubeThrow=break` keep it off even with `?tubeGuard=on`).
- The first three are on by default (`?tubeContact=old`, `?tubeCap=old`, `?tubeMerge=old` turn each off); the guard is
  opt-in (`?tubeGuard=on`; `=old` or anything else leaves it off).
- `SurfZoneConfig.tubeContact`, `.tubeCap`, `.tubeMerge`, `.tubeGuard` (`src/wave/SurfZoneSimulation.ts:339`); the URL
  reader `tubeFaceSwitches` (`src/game/PhysicalMode.ts:533`); online rooms pin all four to the defaults (`src/main.ts:528`):
  the first three on, the guard off.
- The first three old (the guard off, its default): main's build byte for byte (the pin check, below). The existing switches (`?tubeAnchor`, `?tubeForm`,
  `?wallFlow`, `?tubeThrow`, `?tubeFace`, `?tubeFrom`, `?poolTubeCase`) work as before.


## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **Tests:**
  - `src/wave/barrel/tubeContact.test.ts`: the cast against a 1 mm march, the choice and its blend, the answer's continuity
    through the blend and the reach's fade, the vertical answer's fields untouched and nothing computed with `?tubeContact=old`,
    the water's surface at the depth along the normal with the slope clamp, the kinematic fade;
  - `src/wave/barrel/tubeFollowUp.test.ts`: the guard by the open time (whole at touchdown, at most 1/18 a step) and the old
    guard, the recovery once broken, `paceBreak`, `returnJet` (water and momentum kept, nothing lands, no air), the crash
    returning an unbroken point's jet with the guard and pouring it without, the join beside a front's end, the drop rule;
  - `src/wave/barrel/faceAnchor.test.ts`: each of the four switches alone and all four old, the 0.45 C cap and the run-on miss
    against `?tubeCap=old`;
  - `src/game/PhysicalMode.test.ts`: the URL switches and the online pin;
  - then the main suite and the SZS subset.
  - **This head (the guard opt-in):** both type checks clean; the main suite: 320 files passed, 34 skipped; 3,078 tests
    passed, 23 expected fails, 40 skipped (676 s). The SZS subset (37 passed, 70 filtered out, 6,594 s) ran with the guard on
    by default, before it became opt-in, and was not re-run: no SurfZoneSimulation test steps the pool's straight Barrel (its
    three lines only build one), and the guard acts nowhere else. (The first main-suite run caught the
    clear-roof drawing test comparing the loft's new plain-array diagnostic, `openDrops`, by identity; it now compares plain
    arrays by value.)
- **The bars:** `PROBE=1 H=1.05 CASE=a38 LOG=runs/default-a38-1.05.txt npx vitest run src/wave/probes/poolTubeFace.probe.test.ts --maxWorkers=2`
  - `H=1.32`; `CASE=pool`;
  - `SWITCHES=tubeContact=old,tubeCap=old,tubeMerge=old` for main's build (the re-measure only; before the guard became
    opt-in, the main runs also passed `tubeGuard=old`, the same build);
  - `SWITCHES=tubeContact=old` (and `tubeCap=old`, `tubeMerge=old`) for each piece alone, `SWITCHES=tubeGuard=on` for the guard;
  - `COST=1 COST_ARMS=followUp` for the cost A/B against main's build (measured with the guard on);
  - `TRACE_BODIES=1` writes the first lone boards step by step beside the log.
  - 11–13 min a run on this M1, two at a time (12 periods).
- **The pin check:** `pin-contact.ts` (its header has the command). Bundle it against main (a `git archive` of 108d97c3's
  `src` with `node_modules` and `public` linked in) and against the branch, then compare: every line matches but the
  Barrel's defaults (`runs/pin-main.txt`, `runs/pin-branch.txt`, the branch's re-run after the guard became opt-in): every other
  spot; the Barrel with the three switches old (the guard off, its default), and with step 7's three old too, on both case
  lists at both sizes, including the water the bodies feel (`sampleAt` on a grid through the waves: its surface, normal,
  slope, flow and layers). The branch's default runs twice identically. Its `?tubeGuard=on` line hashes as its default over the
  pin's 8 s (no jet returned yet, `returned: 0` in its ledger: the guard is on but has not acted that soon).
## The owner's shot list

Wave Pool → Waves: **Barrel**, at **1.5 m** and at **1.8 m**, dev build (the URL switches are read). Record each. The probe's
bodies have no input, so everything about riding is the owner's to judge.

1. **The default.**
   - **A board on the steep face carried up rather than buried:** take off low on the shoulder and let the face stand up
     under you, then stop paddling. With the nearest surface the board takes the face just ahead of it, not the crest's top
     above it, so it should ride up the wall with its water rather than sink into it. Say whether you rise with the face or
     the face runs over you, and where on the face it happened.
   - **Pitched when high:** sit above about half the face as it throws. Expected (call 4, extended): drawn up and pitched
     over the falls with the lip, anywhere on the steepening face above the anchor. Say whether it reads as fair.
   - **No flips or flings:** watch a board you let go on the face (and your own when you fall). Look for a board shoved out
     through the face shoreward or bouncing off the wall, or a board twitching between two pushes. The probe saw more of both
     than main (below): say how often and where.
   - **No holes in the tube:** ride the tube side-on and from inside. Look for a gap where you see through the barrel, or two
     walls crossing where two sections meet.
   - **Sections the solver never breaks** (the guard off, as main): their lips still land, some on water the solver has not
     broken. Say if a lip lands where there is no whitewater.
2. **`?tubeContact=old`:** the water from the vertical line through the board, as main. Compare whether a board low on the
   steep face is buried, and whether the flings and flips are fewer.
3. **`?tubeCap=old`:** the anchor's cap at 0.3 C, as main. Compare the wall's motion (hops, a wall that lags its frames)
   just after the throw and late in the collapse.
4. **`?tubeMerge=old`:** joins and drops as main. Compare holes where two sections meet.
5. **`?tubeGuard=on`** (opt-in, an A/B to try): the guard by the case's open time; the lip of a section the solver never
   breaks fades back into the wave and its water goes back to its crest, instead of pouring on clear water. Compare where the
   lips land, whether a lip vanishes where you expected it to land, and whether the waves feel bigger (the meter reads 8 %
   higher at 1.5 m with it on).
6. **`?poolTubeCase=pool`:** the pool's own runs with the default; the same checks.
7. **`?tubeContact=old&tubeCap=old&tubeMerge=old`:** main's build, for the A/B.
8. For each: where you fell and why, how the face felt under the board, any fling, flip, hole or vanishing lip.

