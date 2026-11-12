# Step 4: ruling 16's three builds for `?poolSize=ref`

2026-11-12. Three small builds, one at a time, each measured. All of them act only with `?poolSize=ref`.
The default Barrel is unchanged. Online rooms stay on the default.

## What was built

| Build | What it does | Switch back |
|---|---|---|
| 1 | The tube case `big` is held one frame earlier (frame 175, not 176). The old test read the air under the lip as part of the lip, so the crash asked for too much water. | `?poolSize=ref&poolHeld=old` |
| 2 | The reef is 1.11 times longer along its line, like its depths already were. Knots at s 0, 33.3, 72.2, 194.3, 227.6, 260.9. Start x 127.7 (z −221 kept). Take-off at s 44.4. Lip reach s 22.2 to 111, to 33.3 m behind. | `?poolSize=ref&poolReef=short` |
| 3 | A tube case named in the URL wins over `big`. Without a name it is still `big`. | `?poolSize=ref&poolTubeCase=a38` or `=pool`; leave it out for `big` |

Notes on the code:

- Build 1 is a rule in the config (`heldRule: 'jet-step'`), set only by `?poolSize=ref`. No other sea uses it.
- The rule was tested on every case in the library. Only `big` moves (176 to 175). All other cases keep their frame.
- `big` is also used by `?poolTubeCase=pool` on the default pool. There the old rule still runs, so it keeps frame 176.
- Build 2: the reef's end is now at x −72, z −53. Before it was x −65, z −70. So the end is 17 m nearer the beach.
- Build 2: the long reef needs a window of about 270 m or more. `?poolWindow` still takes 240 to 400. Under 270 m, add `?poolReef=short`.

## The bars (ref 311, 300 s, window 60 to 270 s)

| Bar (ruling 16, section 4) | Aim | Today | Ref before (step 3) | After build 1 | After build 2 | Build 2 passes? |
|---|---|---|---|---|---|---|
| A1, drawn tube at the throw | 2.0 ± 0.1 m | 2.03 m (a38) | 1.92 m | 1.92 m (1.70 to 2.23) | **2.03 m** (1.80 to 2.33) | Pass |
| A2, take-off face, median | 2.08 ± 0.10 m | 1.87 m | 2.23 m | 2.19 m | **2.15 m** (22 waves) | Pass |
| B, pace on the bar's stretch | 6.3 to 7.2 m/s | 6.25 m/s | 6.63 m/s | 6.42 m/s | **6.64 m/s** | Pace in range |
| B, waves that hold one line over the stretch | 15 of 20 | 18 of 21 | 12 of 20 | 9 of 20 | **7 of 22** | **Miss** |
| B, the white line's end, median | u 160 or more | u 152 | u 184 | u 145 | **u 134** | **Miss** |
| C, first break depth | 1.81 ± 0.15 m | 1.63 m | 1.78 m | 1.78 m | **1.79 m** | Pass |
| D, points that threw | 90 % or more | 93.1 % | 94.0 % | 96.0 % | **93.7 %** (1210 of 1292) | Pass |
| D, water thrown / asked | 0.95 or more | 0.974 | 0.860 | 0.993 | **0.986** | Pass |
| D, least 10 m piece, thrown / asked | 0.90 or more | 0.95 | 0.75 | 0.972 | **0.925** (s 80 to 90) | Pass |
| D, `paceFast` | under 5 % | 0 | 23 (1.9 %) | 3 (0.3 %) | **15 (1.2 %)** | Pass |
| F, fastest water within 60 m of the reef | 8.02 m/s or less, finite | 5.31 m/s | 7.60 m/s | **8.04 m/s** (miss by 0.02) | **6.68 m/s**, finite | Pass |

- B's stretch is u 65 to 145 for today, ref before and build 1. It is u 72 to 161 for build 2 (the same place on the longer reef).
- F per 100 s: before 7.60 / 6.24 / 5.69. Build 1: 8.04 / 6.18 / 5.43. Build 2: 6.68 / 5.50 / 5.51. Ruling 16 asked to set them beside 5.85 / 5.47 / 5.22.
- The beach's swash (not part of F): build 2 reads 7.60 / 7.34 / 7.48 m/s. It does not grow.

## What changed, in words

- **Build 1 fixed the water share.** The crash now asks for less water (794 m³ in the whole run, before 1806 m³) and gets almost all of it.
- **Build 1 alone made F miss by 0.02 m/s.** Build 2 brought it down to 6.68 m/s.
- **Build 2 fixed the face (2.15 m) and the drawn tube (2.03 m).**
- **B got worse with each build.** The pace of the waves that hold a line is good. But only 7 of 22 waves hold one line to u 161. All 22 reach u 72, 20 reach u 111, 15 reach u 133, 7 reach u 161.
- The white line's end is at u 134 (median). The lip is thrown only to s 111 by design. Past that the line must carry itself, and on most waves it does not.
- The window 60 to 270 s now holds 22 waves, not 20. I did not look into why.

## The second break line (asked for build 2)

- The probe counts every break farther than 30 m from the reef line as "second line".
- With build 2 all of them are at the beach: z −11.5 (−14.5 to −8.5), 1.4 m deep. None is between the reef and the beach.
- Near the reef's new end (u 200 to 281): 1013 in 210 s, all at z −10.5 (−12.5 to −8.5), 1.3 m deep. That is 43 m shoreward of the reef's end (z −53).
- No lip is thrown there. The count on u 44 to 122 is 791 (build 1, on u 40 to 110: 608; before: 599).

## The stills

- `still-ref-held-91s.jpg`, `still-ref-held-151s.jpg`: after build 1.
- `still-ref-reef-90s.jpg`, `still-ref-reef-150s.jpg`: after build 2.
- **The folded, creased leading end of the tube is still there in all four.** Build 1 did not remove it. Build 2 did not remove it.
- The 150 s still of build 2 also shows a step half way along the tube.
- The water ran on the GPU in all of them.

## Build 3: ref with the Canyon's case (a38)

One run, `--ref --case a38`, on the long reef.

| | `big` (build 2) | a38 | Ruling 16 expected for a38 |
|---|---|---|---|
| Drawn tube at the throw | 2.03 m | **2.45 m** (2.13 to 2.81) | 2.25 m |
| Water asked per jet | 0.59 m³ | **1.03 m³** | 0.9 m³ |
| Points that threw | 93.7 % | 94.1 % | |
| Water thrown / asked | 0.986 | **0.902** (bar 0.95: miss) | |
| Least 10 m piece | 0.925 | **0.752** (s 80 to 90) | |
| `paceFast` | 15 | 29 (2.2 %) | |
| Take-off face | 2.15 m | 2.13 m | |
| B | 6.64 m/s, 7 of 22, end u 134 | 6.63 m/s, 9 of 21, end u 135 | |
| F | 6.68 m/s | 6.15 m/s | |

- a38 draws a taller tube than expected (2.45 m, not 2.25 m) and asks more water than the crest gives on s 70 to 110.
- a38 keeps its own held frame under the new rule.

## What still misses

1. **B, the count: 7 of 22 waves (needs 15).** And the line's end at u 134 (needs u 160).
2. **The fold at the tube's leading end.** Neither build removed it.
3. With a38: the water share (0.902) and the tube's height (2.45 m).

## Not run

- **The 600 s drift run.** It was to run only if A1, A2, B, D and F all passed. B misses, so it was skipped.
- No rider, no browser pane, no Canyon check.
- `?poolSize=ref&poolReef=short` and `?poolHeld=old` were not probed again after build 2. Build 1's run is the short reef with the new rule. Step 3's run is the short reef with the old rule.

## Today's sea, run again at the end

`today.txt` here is the default Barrel run with this branch's code. It prints the same numbers as `step3/today.txt`, line for line. Only the wall time differs.

## Files

- `ref-311-held.txt`: after build 1. `ref-311-reef.txt`: after build 2. `ref-311-a38.txt`: build 3's run. `today.txt`: the default.
- `still-ref-*-status.txt`: what the still tool printed.

## Run it again

From the repo's root, one run at a time on the M1 (each takes about 13 minutes):

```
npx rolldown docs/research/pool-look-reference-2026-11-11/step4/crash-probe.ts -o dist/scripts/crash-probe.mjs --format esm --platform node
node dist/scripts/crash-probe.mjs --until 300 > docs/research/pool-look-reference-2026-11-11/step4/today.txt
node dist/scripts/crash-probe.mjs --ref --until 300 > docs/research/pool-look-reference-2026-11-11/step4/ref-311-reef.txt
node dist/scripts/crash-probe.mjs --ref --until 300 --case a38 > docs/research/pool-look-reference-2026-11-11/step4/ref-311-a38.txt
```

More options: `--held old` (build 1 off), `--reef short` (build 2 off), `--case pool`. `ref-311-held.txt` was made before build 2; today it is `--ref --reef short`.

The stills (starts and stops its own server on port 5199):

```
node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5199 --out=<a scratch folder> --compute=gpu --spot="pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolSize=ref" --shots=curl-front:rich:midday --advance=60,60 --first=skip
```
