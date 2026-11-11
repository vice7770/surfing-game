# Step 3: the lip count on the game's own path (ruling 15's step 1)

2026-11-11. Probe only. No game code was changed.

## What was run

- A new probe, `crash-probe.ts`. It builds the pool Barrel the way the game does: `physicalSettingsFor`, then `surfZoneConfigFor`, then the sea **with the tube profile library**.
- Two seas: **today** (the default Barrel) and **ref 311** (`?poolSize=ref`: period 10.5 s, 1.47 m at the feed, 311 m window, tube case `big`).
- Each ran 300 s on the solver's clock, read from 27 s, on the CPU, one at a time. No rider, no browser.
- Wall time on the M1: today 575 s, ref 311 809 s.
- The main window is 60 to 270 s (21 waves today, 20 for ref). The files also hold 60 to 180 s.
- Raw outputs: `today.txt`, `ref-311.txt`.

## Did ruling 15's claim hold? Yes.

- With the library, `sim.crash` exists for both seas.
- The solver's own lip (`throwLip`) threw **0** times in both runs. Every lip jet came from the swept crash (today 1637 of 1637, ref 1561 of 1561).
- The code agrees: `throwLip` starts with `if (this.crash) { this.crash.counts.onsets += 1; return; }` (`SurfZoneSimulation.ts`, about line 2367).
- So step 2's bar D (55.6 % for ref) was read on a path the game does not use. On the game's path ref throws **more** often than today, not less.
- The probe's own tally was checked against `sim.crash.counts`: throws, asked, thrown and starved agree exactly.

## The bars (60 to 270 s)

| Bar | Aim (ref) | Today | Ref 311 | Ref passes? | Step 2, no library (today / ref) |
|---|---|---|---|---|---|
| A, reef's largest onset face, median | 2.0 ± 0.1 m | 1.87 m (21 waves) | **2.23 m** (20 waves, 2.07 to 2.45) | **Miss** by 0.13 m | 1.68 / 2.13 |
| B, peel pace u 65 to 145, median | 6.5 to 7.2 m/s, from 15 of 21 waves | 6.25 m/s, 18 of 21 | **6.63 m/s, 12 of 20** | Pace in range, **wave count misses** (12, needs 15) | u 65–175: 6.33 (5 waves) / 6.78 (9 waves) |
| D, points that reached their throw on s 20 to 100: share that threw | ≥ 90 % | 93.1 % (1158 of 1244) | **94.0 %** (1112 of 1183) | Pass | 87.1 % / 55.6 % (other path) |
| D, thrown / asked (water) | ≥ 0.9 | 0.974 | **0.860** | **Miss** | not read |
| F, fastest water within 60 m of the reef line | ≤ 8.02 m/s, finite | 5.31 m/s | **7.60 m/s** (at 68 s), finite | Pass | 6.56 / 8.01 |

Report only:

| | Today | Ref 311 | Step 2 (today / ref) |
|---|---|---|---|
| C, first break depth | 1.63 m (u 25) | 1.78 m (u 30); aim 2.03 ± 0.15, so 0.10 m too shallow | 1.83 / 1.85 |
| Foot crest, median over the barrel | 0.92 m | 1.02 m | 1.03 / 1.14 |
| B apart: pace u 40 to 65 | 8.15 m/s | 9.15 m/s | 10.6 / 9.7 |
| B apart: halves u 65–105 / 105–145 | 5.50 / 7.41 m/s | 6.82 / 5.88 m/s | (other stretch) 5.1, 8.9 / 8.9, 5.1 |
| White line's end, median | u 152 | u 184 (10th part u 128) | u 151 / u 148 |
| E, wall 10 / 20 / 30 m ahead | 1.41 / 1.38 / 1.34 m | 1.53 / 1.49 / 1.50 m | 1.34, 1.33, 1.30 / 1.55, 1.50, 1.47 |
| E, share of bar A's face | 0.75 / 0.74 / 0.72 | 0.68 / 0.67 / 0.67 | 0.80, 0.79, 0.78 / 0.73, 0.71, 0.69 |
| E, steepest slope | 14° / 11° / 9° | 14° / 11° / 9° | 12, 10, 8 / 14, 10, 9 |
| Swash (elsewhere), fastest | 6.66 m/s | 7.58 m/s (beach, x 96, z −4, 0.44 m deep) | whole run 7.00 / 8.12 |
| Swash per 100 s | 6.66, 6.58, 6.21 | 7.54, 7.35, 7.58 (not growing) | |
| Reef water per 100 s | 5.55, 5.19, 4.95 | 7.60, 6.24, 5.69 | |
| Least water on the reef top | 0.09 m | 0.12 m | 0.14 / 0.14 |
| Along-reef current | −0.05 m/s (blocks −0.04, −0.04) | −0.14 m/s (blocks −0.08, −0.15) | −0.05 / −0.11 |
| Height on the platform, s 65 / 120 / 175 | 1.83 / 2.12 / 1.85 m | 2.04 / 2.05 / 2.06 m | 1.86, 2.11, 1.92 / 2.01, 2.06, 1.97 |
| Drawn tube's height at the throw (trough to lip) | 2.03 m (1.86 to 2.25) | 1.92 m (1.69 to 2.24) | not read |
| Touchdown after the throw | 0.78 s | 0.85 s | |
| Second-line onsets, u 40 to 110 | 324 | 599 | 118 / 343 |

## The crash's counts (60 to 270 s)

| | Today | Ref 311 |
|---|---|---|
| throws | 1159 | 1112 |
| asked / thrown, m³ | 823.0 / 801.5 | 1310.0 / 1126.0 |
| starved (jets that got less than asked) | 161 | 470 |
| missed | 0 | 0 |
| covered | 18 | 6 |
| lost | 0 | 0 |
| exits, fade exits | 0, 0 | 0, 0 |
| paceFast | 0 | 23 |

Per 10 m of s, ref 311 (share that threw; thrown / asked):

| s | 20–30 | 30–40 | 40–50 | 50–60 | 60–70 | 70–80 | 80–90 | 90–100 |
|---|---|---|---|---|---|---|---|---|
| threw | 21 % (4 of 19) | 81 % | 96.5 % | 97 % | 99 % | 100 % | 100 % | 90 % |
| thrown / asked | 1.00 | 0.97 | 0.99 | 0.94 | 0.83 | 0.76 | 0.75 | 0.79 |

Today, the same: threw 61 %, 95 %, 97 %, 95 %, 95 %, 99 %, 95 %, 87 %; thrown / asked 0.98, 0.98, 0.99, 0.99, 0.97, 0.98, 0.95, 0.95.

- Points that did not throw are almost all "no water": the crash asked for zero volume there (the end of a run of points, end weight 0). They are at the two ends of the reach, s 20 to 40 and s 90 to 100.
- About 120 points per run left the front before their clock reached the throw. Nearly all were first seen at s 90 to 100, the far edge of the reach.
- The crash throws only on s 20 to 100 (`POOL_FRONT_REACH`). Past u 110 no lip is thrown in either sea. That is by design, not a fault.

## What is still missed for ref 311

1. **A: the face is 2.23 m, 0.13 m over the band.** With the library the faces read larger than without it (today 1.87 against 1.68).
2. **B: only 12 of 20 waves hold one line to u 145.** The pace of those is good (6.63 m/s). Ten of the lines run on to u 175, so the line breaks between u 120 and u 145 for the others. Today holds 18 of 21.
3. **D, water: 0.860 of the asked water is thrown.** The crest runs short on s 60 to 100 (0.75 to 0.83). The jets ask 1.6 times more water than today's; the crest gives 1.4 times more.

D's count (94 %) and F (7.60 m/s) pass.

## Not run

- The 600 s drift run. It was to run only if A, B, D and F all passed for ref. A, B and D's water share miss, so it was skipped.

## Notes for the reader

- Today's sea here is not step 2's "today". Step 2 built it by hand (spreading 1000). This probe uses the game's config (spreading 24, seed 1). The numbers differ a little for that reason too.
- Today's tube case is Canyon's `periodic-canyon23-a38-l13` (the pool's default). Ref uses `periodic-pool-straight-big-l13`.
- The "per 100 s" line prints a last block "300–400 s". It is the single last step at 300 s. Ignore it.
- "Second-line onsets" are the probe's own onsets farther than 30 m from the reef line. No lip is thrown there in either run.

## Run it again

From the repo's root (the library is read from `public/`):

```
npx rolldown docs/research/pool-look-reference-2026-11-11/step3/crash-probe.ts -o dist/scripts/crash-probe.mjs --format esm --platform node
node dist/scripts/crash-probe.mjs --until 300 > docs/research/pool-look-reference-2026-11-11/step3/today.txt
node dist/scripts/crash-probe.mjs --ref --until 300 > docs/research/pool-look-reference-2026-11-11/step3/ref-311.txt
```

Options: `--ref`, `--until <s>`, `--settle <s>` (27), `--no-library` (the path step 2 read). One run at a time on the M1.
