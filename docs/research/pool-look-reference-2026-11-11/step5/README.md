# Step 5: the join probe, the longer tube, `?tubeForm=early`

2026-11-12. Ruling 17's builds. Branch `claude/pool-tube-early`. **Not merged yet.**
Everything is behind a URL switch. The default Barrel is unchanged. Online rooms stay on the default.

## The short answer

- **`?poolReach=long` works with the crest line on.** With `&crestLine=top` (or `?tubeForm=early`, which turns it on) every bar on s 111 to 150 passes. Without the crest line the last 10 m piece misses two bars by a little.
- **`?tubeForm=early` fails its own bars.** The wall 5 m ahead of the throw now stands 45° (before 15°), and the height step along the crest passes at 90 %. But the surface's rise is 0.61 m/s (bar 0.4) and 2.17 m/s at 95 % (bar 1.0). And J5 misses: neighbours 1 m apart differ in share by more than 0.2 in 28.6 % of pairs (bar 5 %).
- **Can you see where the pre-made part starts and the live sea ends? Yes.** The pre-made wall has ribs every few metres that the live sea ahead of it does not have, and a dark crease stays where the open tube begins. Only the far end of the pre-made wall fades into the sea without a sharp line.
- `&crestLine=top` alone removes the step half way along the tube. It does not remove the fold at the leading end.

## What was built

| Build | What it does | Switch |
|---|---|---|
| 0 | No game code. A new probe (`crash-probe.ts` here) reads the join on the drawn surface. Four runs and three sets of stills. | none |
| 1 | The lip is thrown to s 150 along the reef, not s 111. Only with `?poolSize=ref` on the long reef. | `?poolSize=ref&poolReach=long` |
| 2 | The tube case starts to show 1.6 s before the throw and is whole 0.5 s before it (−2.3 to −0.7 √(h0/g), read at each point's foot depth). Before: −0.5 s to 0 s. | `?tubeForm=early` |

Notes on the code:

- Build 1: `POOL_REF_FRONT_REACH_LONG` in `src/wave/barrel/barrelSpots.ts` is the reach with `to: 150`. Nothing else in the record changes. With `?poolReef=short` or without `?poolSize=ref` the switch does nothing.
- Build 2: `?tubeForm=early` turns `tubeSeam=blend` and `crestLine=top` on by itself. `&crestLine=sub` is kept if given. `&seamTau=a,b` given with it wins over the early course.
- Build 2: `wallBody=stream` stays its own switch. Add it to the URL.
- Build 2 changes only the share's course (`seamCourseWeight` in `src/wave/barrel/tubeSeam.ts`, used in `sweptLoft.ts`). The throw (place, depth, time), the crash's water and pace, the clock's rates and the case are untouched. The crash's counts in `form-early.txt` are the same as in `top.txt`, number for number.
- Online rooms already pin `tubeForm`, `tubeSeam`, `crestLine` and `poolSize`. So a room cannot get either build.

## What the probe reads, and what it cannot

- It builds the game's own drawn tube surface (the loft) in node over the solver's water, every frame from 60 to 270 s. No rider, no browser.
- **J1** (height step between slices 0.5 m apart, from the share's step): read. Also printed: the whole step (share and shape together).
- **J2** (slope change along the crest): read two ways. "Worst place on the face" is not a fair reading near the full end: the face's points slide along the ray as the face steepens, so it reads 97° on the base. **I use "at the crest alone"**, where the place is well defined.
- **J3** (across the crest at the band's edges): the probe can only read it at the loft's own vertices. It is a bound, not a step. The surface is continuous there by how it is built.
- **J4** (where the share is 0.05): read on points with a share of 0.02 to 0.10.
- **J5** (neighbours 1 m apart): read. Both halves: the share's step, and the place off the line.
- **J6** is the stills.
- **The surface's rise** is a rider-free stand-in: how fast the case's height over the sea changes at places that travel with the wave, 0 to 3 m ahead of the crest point. It is **not** the #245 probe (that needs a board). On the base it reads 1.12 / 3.45 m/s; #245 read 1.10 / 3.9. So the two agree on the base.
- The wall ahead: steepest slope and height of the drawn surface 5, 10, 20, 30 m ahead of each front's leading thrown point.

## The bars (ref 311, 300 s, waves of 60 to 270 s)

All runs carry `poolSize=ref`, `tubeSeam=blend`, `wallBody=stream`, long reef, case `big`.
Columns: **base**; **top** = `&crestLine=top`; **tau early** = top + `&seamTau=-1.64,-0.5`; **T2** = top + `&seamTau=-1.64,-1.4`; **long** = `&poolReach=long`; **early** = `&tubeForm=early`; **both** = early + long.

| Bar | Aim | base | top | tau early | T2 | long | early | both |
|---|---|---|---|---|---|---|---|---|
| A1, drawn tube at the throw | 2.0 ± 0.1 m | 2.03 | 2.04 | 2.04 | 2.04 | 1.98 | 2.04 | 1.99 |
| A2, take-off face | 2.08 ± 0.10 m | 2.15 | 2.17 | 2.17 | 2.17 | 2.10 | 2.17 | 2.15 |
| B1, pace on u 72 to 117 | 6.3 to 7.2 m/s, 18 of 20 waves | 6.46 (20 of 22) | 6.62 (20 of 21) | 6.62 | 6.62 | 6.52 (20 of 22) | 6.62 (20 of 21) | 6.78 (20 of 22) |
| B2, lips thrown per 10 m, least column up to the reach's end | 75 % or more | 89 % | 98 % | 98 % | 98 % | **61 %** (u 130) | 98 % | **64 %** (u 120) |
| B3, standing white near the reef, most (report only) | no piece over 40 % | 65 % (u 165) | 66 % | 66 % | 66 % | 67 % | 66 % | 66 % |
| C, first break depth | 1.81 ± 0.15 m | 1.79 | 1.79 | 1.79 | 1.79 | 1.79 | 1.79 | 1.78 |
| D, points that threw | 90 % or more | 93.7 % | 97.5 % | 97.5 % | 97.5 % | 92.4 % | 97.5 % | 95.4 % |
| D, water thrown / asked | 0.95 or more | 0.986 | 0.999 | 0.999 | 0.999 | 0.986 | 0.999 | 0.999 |
| D, least 10 m piece | 0.90 or more | 0.925 | 0.991 | 0.991 | 0.991 | 0.943 | 0.991 | 0.990 |
| D, `paceFast` | under 5 % | 15 (1.2 %) | 10 (0.8 %) | 10 | 10 | 27 (1.7 %) | 10 (0.8 %) | 24 (1.4 %) |
| D, lips past 30 m behind the reef line | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| F, fastest water within 60 m of the reef | 8.02 m/s or less | 6.68 | 6.66 | 6.66 | 6.66 | 6.76 | 6.66 | 6.83 |
| J1, height step, 90 % / most | 0.05 / 0.10 m | **0.152 / 0.394** | **0.174 / 0.439** | 0.035 / **0.113** | **0.081 / 0.356** | **0.152 / 0.391** | 0.036 / **0.114** | 0.035 / **0.123** |
| J2 at the crest, where the share starts, 90 % / most | 2° / 4° | **4.2 / 12.8** | **4.7 / 13.4** | 0.65 / **4.8** | **6.0 / 19.1** | **4.2 / 18.7** | 0.63 / **4.5** | 0.75 / **11.1** |
| J2 at the crest, where the share ends, 90 % / most | 2° / 4° | **5.6 / 25.2** | **4.5 / 23.3** | **3.4 / 22.7** | **9.9 / 26.9** | **5.0 / 28.3** | **3.4 / 22.7** | **3.7 / 24.5** |
| J3, height at the band's edge, 95 % / most | 0.01 m | 0.001 / 0.019 | 0.001 / 0.023 | 0.001 / 0.030 | 0.002 / 0.030 | 0.001 / 0.018 | 0.001 / 0.030 | 0.002 / 0.034 |
| J3, slope at the band's edge, 90 % / most | 2° | 0.3 / 22 | 0.3 / 66 | 0.3 / 66 | 0.4 / 66 | 0.4 / 59 | 0.3 / 66 | 0.5 / 62 |
| J4, case crest over the sea's, median (10 to 90 %) | within 0.25 m | **0.31** (0.01 to 0.56) | **0.29** | 0.20 (−0.04 to 0.46) | 0.19 (−0.04 to 0.44) | **0.34** | 0.20 (−0.04 to 0.45) | 0.23 (−0.02 to 0.45) |
| J4, case height / sea's height, median | 0.9 to 1.15 | 1.09 | 1.09 | 1.06 | 1.06 | 1.12 | 1.06 | 1.08 |
| J5, share step over 0.2, pairs 1 m apart | under 5 % | **70.8 %** | **68.8 %** | **27.9 %** | **82.8 %** | **67.2 %** | **28.6 %** | **28.7 %** |
| J5, open tube off its line by over 0.5 m | under 10 % | **46.5 %** | 0.2 % | 0.2 % | 0.2 % | **47.8 %** | 0.2 % | 1.7 % |
| Wall 5 m ahead, steepest | 35° or more (fail under 25°) | 15° | 16° | 45° | 46° | 14° | 45° | 43° |
| Wall 10 m ahead, steepest | 13 to 15° | 13° | 13° | 14° | 15° | 11° | 14° | 13° |
| Wall 20 m / 30 m ahead, steepest | unchanged | 11° / 9° | 11° / 9° | 11° / 9° | 11° / 9° | 9° / 8° | 11° / 9° | 10° / 8° |
| Wall height 5 m ahead | 1.5 to 1.6 m | 1.63 | 1.64 | **1.87** | **1.88** | 1.56 | **1.87** | **1.82** |
| Surface rise in the course, median / 95 % | 0.4 / 1.0 m/s | **1.12 / 3.45** | **1.08 / 3.17** | **0.61 / 2.18** | **0.61 / 2.59** | **1.05 / 3.29** | **0.61 / 2.17** | **0.59 / 2.17** |
| Surface rise in the last 0.5 s before the throw | (report) | 1.12 / 3.45 | 1.08 / 3.17 | 0.68 / 2.59 | 0.68 / 2.59 | 1.05 / 3.29 | 0.68 / 2.59 | 0.68 / 2.72 |

Bold = misses its bar. Notes:

- B2 is read on columns u 40 to 100 for the short reach and u 40 to 140 for the long one. It counts lips against waves that broke at the reef, so it is a harder count than D's.
- B3 is over 40 % on u 155 to 185 in every run. That is ruling 17's second white patch. Nothing here was meant to change it.
- J3's "most" is one vertex in 20 000 to 80 000. At 95 % the slope is under 1° in every run.
- J4's median passes with the early course. One point in ten still stands 0.45 m over the sea's crest.
- The wall 20 and 30 m ahead reads 11° and 9° on the base with this probe (the brief's 10° and 9° came from the white line's end, a different start point). The early course does not change them.

## Build 1, `?poolReach=long`: the new stretch s 111 to 150

| 10 m piece | Aim | long: threw | jets per column per period | water share | drawn tube | both: threw | jets | share | tube |
|---|---|---|---|---|---|---|---|---|---|
| s 110 to 120 | 80 %, 0.5, 0.90, 1.70 m | 93.3 % | 0.72 | 0.996 | 1.86 m | 92.7 % | 0.66 | 1.000 | 1.85 m |
| s 120 to 130 | | 83.3 % | 0.55 | 0.999 | 1.82 m | 85.8 % | 0.59 | 1.000 | 1.83 m |
| s 130 to 140 | | 85.4 % | 0.72 | 0.968 | 1.81 m | 86.2 % | 0.73 | 1.000 | 1.78 m |
| s 140 to 150 | | **77.1 %** | 0.59 | 0.993 | **1.67 m** | 88.6 % | 0.66 | 1.000 | 1.70 m |

- Water share over the whole new stretch: 0.988 (long), 1.000 (both). Bar 0.95: pass.
- **`long` alone misses two bars on the last piece:** 77.1 % threw (bar 80 %) and the tube is 1.67 m (bar 1.70 m).
- **With the crest line on (`both`) all four pieces pass.** The last piece's tube is 1.70 m, right on the bar.
- The stop rule (a piece under 0.90 share or under 0.5 jets) did not trip. So `to` stays at 150 and no second run was made.
- A1, A2, B1, C, D, F all still pass with the long reach. B2 misses on the new stretch (61 to 68 % at u 120 and u 130).
- In `both`, 3 points reached their throw just past s 150 and 1 threw (s 150 to 160, 1.68 m). I did not look into it.

## Build 2, `?tubeForm=early`: pass or fail

By the brief's rule it **fails**: the rise bar misses, and J5 misses.

| | Result |
|---|---|
| J1 | 90 % passes (0.036 m). The largest step is 0.114 m (bar 0.10). |
| J2 | The start passes at 90 % (0.63°); its largest is 4.5° (bar 4°). The end misses (3.4° at 90 %). |
| J3 | Passes at 95 %. |
| J4 | Median passes (0.20 m, ratio 1.06). |
| J5 | **Misses.** Share step over 0.2 in 28.6 % of pairs. The place half passes (0.2 %). |
| J6, the stills | **Misses.** The pre-made wall shows ribs. |
| Wall 5 m ahead | Passes: 45°. |
| Wall 10 m ahead | Passes: 14°. |
| Wall height | Misses: 1.87 m at 5 m ahead (bar 1.5 to 1.6). The case stands 0.24 m over the sea there. |
| Surface rise | **Misses:** 0.61 m/s median, 2.17 m/s at 95 %. |
| D, F, A1 | Unchanged from `top`. |

Why the two misses, as measured (no number was tuned):

- **J5.** Points 1 m apart along the crest differ in clock by 0.135 s (0.08 to 0.20). The early course is 1.13 s long. So neighbours differ in share by 0.15 at the median, and by more than 0.2 on a quarter of the pairs. On the old 0.5 s course it was 0.32. These are the ribs in the stills.
- **The rise.** In the last 0.5 s before the throw the share is already whole, and the rise is still 0.68 m/s (2.59 at 95 %). That is the case's own shape growing over the sea: its crest goes from 0.20 m to 0.42 m over the sea's crest and its face from 42° to 64°. The share's course cannot change that. So this bar cannot pass by moving the course alone.
- T2 (the share whole by −1.4 s) is worse on the join: J1 0.081 m at 90 %, J5 82.8 %, and the rise is the same 0.61 m/s.

## The stills (J6)

All at 90 s and 150 s, water on the GPU, with `tubeLook=merge&lipLook=fray&afterTube=roller`. `front` = from the beach side at midday; `along` = along the crest at sunset.

| Set | Fold at the leading end | Step half way along | A line where the case starts |
|---|---|---|---|
| `still-base-*` | Yes, clear pleats. | Yes at 150 s. | Yes. The tube stands out of the flat sea like a wall. |
| `still-top-*` (`crestLine=top`) | Yes (a dark crease and pleats). | **Gone.** The lip is one smooth line. | Yes, the same abrupt start. |
| `still-tau-early-*` | The dark crease at the tube's mouth stays. | Gone. | The wall now runs on ahead of the tube. It has ribs every few metres. Its far end fades into the sea. |
| `still-reach-long-*` | Yes. | Yes, smaller. | Yes, as base. |
| `still-form-early-*` | The crease stays. | Gone. | As tau early: ribs on the pre-made wall, the crease at the tube's mouth. |
| `still-form-early-reach-long-*` | The crease stays. | Gone. | The same. |

- The stills look at the wave before s 111. So they do not show the extra stretch of `poolReach=long`.
- The ribs are J5 seen with the eye. The crease is where the open tube's air begins.

## What was checked, and what was not run

- `tsc` for the game and the server: clean. Unit tests for both switches were added (`tubeSeam.test.ts`, `poolRef.test.ts`, `PhysicalMode.test.ts`).
- The merge suite and the default re-run pass: see the last section.
- **Not run:** any rider session, catch report or ride. The #245 rise probe (needs a board). A 600 s run. A second `poolReach` run (the stop rule did not trip).
- **Not built:** ruling 17's builds 3 and 4 (the white patch trace, the fit of the throw place).

## Files

- Runs: `base.txt`, `top.txt`, `tau-early.txt`, `t2.txt`, `reach-long.txt`, `form-early.txt`, `form-early-reach-long.txt`.
- Stills: `still-<set>-front-90s.jpg`, `-front-150s.jpg`, `-along-90s.jpg`, `-along-150s.jpg`.
- Probe: `crash-probe.ts`. Step 4's probe is untouched.

## Run it again

From the repo's root, one run at a time on the M1 (each takes about 13 minutes):

```
npx rolldown docs/research/pool-look-reference-2026-11-11/step5/crash-probe.ts -o dist/scripts/crash-probe5.mjs --format esm --platform node
node dist/scripts/crash-probe5.mjs --ref --until 300 --extra "&tubeSeam=blend&wallBody=stream" > base.txt
node dist/scripts/crash-probe5.mjs --ref --until 300 --extra "&tubeSeam=blend&wallBody=stream&crestLine=top" > top.txt
node dist/scripts/crash-probe5.mjs --ref --until 300 --extra "&tubeSeam=blend&wallBody=stream&crestLine=top&seamTau=-1.64,-0.5" > tau-early.txt
node dist/scripts/crash-probe5.mjs --ref --until 300 --extra "&tubeSeam=blend&wallBody=stream&crestLine=top&seamTau=-1.64,-1.4" > t2.txt
node dist/scripts/crash-probe5.mjs --ref --until 300 --extra "&tubeSeam=blend&wallBody=stream&poolReach=long" --reach-to 150 > reach-long.txt
node dist/scripts/crash-probe5.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early" > form-early.txt
node dist/scripts/crash-probe5.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&poolReach=long" --reach-to 150 > form-early-reach-long.txt
```

The stills (starts and stops its own server on port 5199; add the switches to `--spot`):

```
node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5199 --out=<dir> --compute=gpu \
  --spot="pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolSize=ref&tubeForm=early" \
  --shots=curl-front:rich:midday,curl-channel:rich:sunset --advance=60,60 --first=skip
```

To ride it: `?spot=pool&waves=barrel&poolSize=ref&wallBody=stream&tubeForm=early&poolReach=long` (add the look switches as wanted).

## The default, run again at the end

- Shared code was touched (`sweptLoft.ts`, `faceAnchor.ts`, `barrelSpots.ts`, `tubeSeam.ts`). So today's default pool was run again with the final code, with step 3's probe: `today.txt` here.
- **It equals `step3/today.txt` line for line.** Only the wall time differs (555 s, before 575 s).
- The merge suite on the final code: 341 files passed, 37 skipped; 3305 tests passed (before 3298; the 7 new ones are the switches' tests).
- No `zz-*` file is in `src/`. Nothing was left on port 5199.
