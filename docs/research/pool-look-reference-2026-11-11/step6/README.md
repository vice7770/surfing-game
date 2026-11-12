# Step 6: `?anchorLine=smooth` and `?loftMesh=arc`

2026-11-12. Ruling 18's builds 1 and 2. Branch `claude/pool-anchor-line`. **Not merged yet.**
Everything is behind a URL switch. The default Barrel is unchanged. Online rooms stay on the default.
Build 3 of the ruling (carry the rise) was **not** built, as asked.

## The short answer

- **`?loftMesh=arc` removes the ribs in the stills.** The pre-made wall is now one smooth sheet. The black slit at the tube's mouth is gone; a soft shade stays there.
- **But it misses its number bars.** The folds are much smaller (crest to lip, median 44° → 12°, 90 % 74° → 37°), not as small as asked (10° and 20°). At the mouth the lower face still folds over 90° on 2 % of slices (bar: none).
- **`?anchorLine=smooth` alone changes little.** The crest line is a bit smoother (0.051 → 0.039 m off its line at 1 m), far from its bar (0.010 m). In the stills the ribs look the same as before.
- **`?anchorLine=smooth` breaks one must-not.** The drawn crest's largest move in one step grew: 0.35 → 0.63 m before the throw (two trains: 0.39 → 1.03 m). The typical move is a little smaller. I did not tune it.
- **Can you still point to where the pre-made part starts? Yes, but less.** With both switches it no longer has ribs or a black slit. You still see it as a wall that stands up from the flat sea, with a rounded far end and a bright line at its foot.
- The throw and the crash are untouched: the list of all 1722 jets (time, place, water) is byte-equal in the three runs.

## What was built

| Build | What it does | Switch |
|---|---|---|
| 1 | The drawn crest reads a smoothed line of the kept anchor shifts along the crest. The kept shift itself is not changed. | `&anchorLine=smooth` |
| 2 | Before the throw, the loft's vertices between the crest and the toe stand by arc length, not by the sliding lip mark. Same curve, other vertex places. | `&loftMesh=arc` |

Both act only where the tube case is drawn with a front (the pool Barrel). Use them with `?tubeForm=early`.

Notes on the code:

- Build 1: at the end of `prepareAnchors` (`src/wave/barrel/crashCurve.ts`) the kept shifts are smoothed once more along the crest with the same kernel, into a new field `anchorDrawn`. The records (drawing, contact, wall water, the online record) carry it. `anchorShift` is never written from it.
- **Build 1, one change from the ruling.** The ruling said the crash's slices read the smoothed line too. I built that first and ran it (`smooth-crash-on-line.txt`): each jet's asked water changed by about 0.4 % (first jet 0.42022 → 0.41861 m³; 1722 → 1721 jets), and every later number drifted. That breaks "D number for number". So the crash's slices stay on the kept places. Only the drawn surface, the contact and the wall water use the smoothed line.
- Build 2: `src/wave/barrel/arcMesh.ts` (new). Before the throw the profile's lip mark is "the face's steepest point". It is not a point of the water: it slides along the face from frame to frame. Vertices joined by index then pleat. Now the lip's vertices stand at the share of the crest-to-toe arc that the lip holds at the throw itself, and the others are spread evenly on each side. From the throw on nothing changes (no vertex moves at clock 0).
- Build 2 does not change the profile. Each vertex stays on the profile's own polyline. The wall water is read at the same new places.
- Online rooms pin both switches off (`src/main.ts`).
- Unit tests: `anchorLine.test.ts` (14), `arcMesh.test.ts` (10), two more in `PhysicalMode.test.ts`.

## The bars (ref 311, 300 s, waves of 60 to 270 s)

All runs carry `poolSize=ref`, `wallBody=stream`, `tubeForm=early`, long reef, case `big`.
Columns: **base** = `tubeForm=early` alone; **smooth** = + `anchorLine=smooth`; **both** = + `anchorLine=smooth&loftMesh=arc`; **two trains** = smooth on the two-train sea (`--feed2 0.3,9,1`), with ruling 18's two-train base in brackets.
Values are median / 90 % / 99 % unless said.

| Bar | Aim | base | smooth | both | two trains: smooth (base) |
|---|---|---|---|---|---|
| R1, drawn shift off its line at 1 m, share whole, before the throw (90 % / 99 %) | 0.010 / 0.03 m | 0.051 / 0.116 | **0.039 / 0.080** miss | 0.039 / 0.080 miss | **0.038 / 0.075** miss (0.050 / 0.132) |
| R1 at 2 m (90 %) | 0.03 m | 0.127 | **0.101** miss | 0.101 miss | **0.091** miss (0.126) |
| R1 at 0.5 m (90 % / 99 %), report | — | 0.010 / 0.034 | 0.008 / 0.024 | 0.008 / 0.024 | 0.007 / 0.021 (0.010 / 0.032) |
| R2, fold at clock −0.5 to −0.15 s, crest to lip | build 2: 10° median, 20° at 90 % | 44 / 74 / 107° | 44 / 74 / 107° | **12 / 37 / 55°** miss | 44 / 73 / 104° (44 / 74 / 104) |
| R2, the same, lower face (throat to toe) | the same | 40 / 73 / 106° | 40 / 74 / 105° | **12 / 30 / 50°** miss | 41 / 73 / 104° (41 / 73 / 105) |
| Fold at clock −1 to −0.5 s, crest to lip / lower face | report | 21 / 57 / 96°; 11 / 45 / 79° | 21 / 57 / 96°; 11 / 44 / 79° | 6 / 16 / 31°; 7 / 45 / 69° | — |
| Fold at the mouth (−0.15 to +0.15 s), crest to lip, share over 90° | none | 11.1 % | 11.4 % | **0 %** pass | 9.7 % (9.7 %) |
| Fold at the mouth, lower face, share over 90° | none | 4.9 % | 4.6 % | **2.0 %** miss | 4.9 % (5.2 %) |
| J2, slope change where the share ends, 90 % (median) | under 10° | 84.9° (29.9) | 83.9° (30.3) | **42.2°** (6.1) miss | 88.1° (87.6) |
| J2, where the share starts, 90 % | 2° | 2.54° | 2.74° | 1.03° | 3.73° (3.37) |
| J1, height step from the share, 90 % / most | 0.05 / 0.10 m | 0.036 / 0.114 | 0.037 / 0.143 | 0.037 / 0.144 | 0.037 / 0.121 (0.036 / 0.102) |
| J1, whole height step (share and shape), 90 % | report | 0.379 m | 0.381 m | 0.127 m | 0.412 m (0.401) |
| J3, band edge over the sea, 90 % / most | must not change (0.02 m) | 0.001 / 0.030 | 0.001 / 0.030 | 0.002 / 0.030 | 0.001 / 0.022 (0.001 / 0.021) |
| J4, case crest over the sea's crest; height ratio | must not change (0.02 m) | 0.20 m; 1.06 | 0.20 m; 1.06 | 0.20 m; 1.06 | 0.23 m; 1.10 (the same) |
| J5b, open tube off its line over 0.5 m | under 10 % | 0.2 % | 0.2 % pass | 0.2 % pass | 1.0 % pass (1.0 %) |
| The surface's rise, median / 95 % | 0.4 / 1.0 m/s (build 3, not built) | 0.61 / 2.17 | 0.59 / 2.03 | 0.59 / 2.03 | 0.57 / 2.04 (0.60 / 2.20) |
| **Step in time**: drawn crest's move in one step, before the throw, median / 99 % / largest | largest no larger than today | 0.085 / 0.144 / 0.355 m | 0.079 / 0.194 / **0.631** miss | the same as smooth | 0.075 / 0.220 / **1.034** miss (0.081 / 0.164 / 0.389) |
| Step in time, from the throw, 99.9 % / largest | the same | 0.205 / 5.594 m | 0.527 / **5.664** miss | the same as smooth | 0.764 / 5.140 (0.250 / 5.386) |
| D, the throws' list (time, place, water of every jet) | number for number | 1722 jets | **byte-equal** | **byte-equal** | the crash's counts equal the base's (1264 throws, 552.891 m³ asked, 552.804 thrown) |
| A, B, C, D, E, F lines of the run | must not change | — | equal line for line | equal line for line | F 6.31 m/s (6.31) |
| F, fastest water within 60 m of the reef | 8.02 m/s or less | 6.66 | 6.66 | 6.66 | 6.31 |
| Build 2, the curve: new vertices off the old polyline, 99 % / largest | 0.005 m | — | — | 0.0044 / **0.0102 m** (over 0.005 on 0.46 % of slices) | — |
| Build 2, from the throw on, and outside crest to toe: largest vertex move | 0 | — | — | 0.000000 m | — |

How to read the misses:

- **R1 (build 1) misses.** The line is 20 to 30 % smoother, not 5 times. One more pass with the same kernel is what the ruling named; I did not widen it to reach the bar.
- **Step in time (build 1) misses, a must-not.** For the two-train column, "today" is the kept shift's own move in the same run (it is unchanged by the switch). The typical move is smaller, the rare large ones are larger. Likely cause: a neighbour's hop now also moves this point's drawn place. Not traced, not tuned.
- **The fold bars (build 2) miss**, but the folds are 2 to 3.5 times smaller, and none is over 90° above the lip.
- **The curve bar (build 2) misses on 0.46 % of slices** (largest 0.010 m). The other way round (the old vertices off the new polyline) is 0.0047 m at 90 % and 0.034 m at most: the new vertices cut the corners of the old ones a little where the old ones were bunched.
- The rise is not addressed here (build 3).
- `&loftMesh=arc` without `&anchorLine=smooth` was **not run**.

## Why the folds do not go to the bar: the frame join

`frame-blend.ts` here, output `frame-blend.txt` (no game run; the pool's case at the pool's scale).

- The library stores frames 0.016 s apart and joins two frames **point by point**.
- Before the throw the lip mark jumps from frame to frame (its share of the crest-to-toe arc goes 0.05 ↔ 0.4).
- So the curve half way between two frames is not the curve either frame draws. It lies off the join of the same two frames spaced by arc first by 0.016 m (median), 0.085 m (90 %), 0.098 m (most).
- Slices along the crest read this wobble at different phases. That is what is left of the folds.
- Build 2 only moves vertices on the curve it is given ("same curve, 0.005 m"). It cannot remove the wobble.
- **The named next fix, not built:** space each frame by arc *before* joining the two frames (in the library's `profileAt` before the throw). It would change the curve by up to about 0.10 m, so it needs the advisor's yes: it breaks this build's "the curve itself must not change".

## The stills (150 s and 90 s, front and along the crest)

Compare with `../step5/still-form-early-*.jpg` (the base).

| Stills | Ribs on the pre-made wall | Dark crease at the tube's mouth | Can you point to where the pre-made part starts? |
|---|---|---|---|
| `../step5/still-form-early-*` (base) | Yes, sharp pleats every few metres. | Yes, a black slit. | Yes. |
| `still-smooth-*` (`anchorLine=smooth`) | **Not weaker.** The same pleats, in slightly other places. | Yes, the same. | Yes, the same. |
| `still-both-*` (both switches) | **Gone.** The wall is one smooth sheet with soft, wide bumps. | **The black slit is gone.** A soft shade stays where the open tube begins. | **Yes, still, but less.** No ribs, no slit. The wall still stands up out of the flat sea with a rounded far end and a bright line along its foot. The live sea ahead of it is lower and flatter. |

- Front, 150 s: `still-both-front-150s.jpg` against `../step5/still-form-early-front-150s.jpg`.
- Along the crest, 150 s: `still-both-along-150s.jpg`. The wall ahead of the tube reads as one face; the light streak on the lower face stays.
- The stills are two frames of one sea. They do not show motion (the step in time above is not visible in them).

## What was checked, and what was not run

- `tsc` for the game and the server: clean before each commit.
- `?tubeForm=early` alone, run again on the final code: see the last section.
- The merge suite and the default re-run: see the last section.
- **Not run:** any rider session, catch report or ride. `&loftMesh=arc` alone. A two-train run for build 2. A 600 s run. The #245 rise probe.
- **Not built:** ruling 18's build 3 (carry the rise). The frame-join fix above.

## Files

- Runs: `form-early.txt` (base), `smooth.txt`, `both.txt`, `smooth-feed2.txt` (two trains), `smooth-crash-on-line.txt` (the rejected variant of build 1).
- The throws' lists: `form-early.throws`, `smooth.throws`, `both.throws` (equal byte for byte).
- Stills: `still-smooth-*`, `still-both-*` (front and along, 90 s and 150 s).
- Probe: `crash-probe.ts` (step 5's, plus the throws' list, the crest's move per step, build 2's curve check). `frame-blend.ts`, `frame-blend.txt`.

## Run it again

From the repo's root, one run at a time on the M1 (each takes about 13 minutes):

```
npx rolldown docs/research/pool-look-reference-2026-11-11/step6/crash-probe.ts -o dist/scripts/crash-probe6.mjs --format esm --platform node
node dist/scripts/crash-probe6.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early" --throws form-early.throws > form-early.txt
node dist/scripts/crash-probe6.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&anchorLine=smooth" --throws smooth.throws > smooth.txt
node dist/scripts/crash-probe6.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&anchorLine=smooth&loftMesh=arc" --throws both.throws > both.txt
node dist/scripts/crash-probe6.mjs --ref --until 300 --feed2 0.3,9,1 --extra "&wallBody=stream&tubeForm=early&anchorLine=smooth" > smooth-feed2.txt
```

The stills (starts and stops its own server on port 5199):

```
node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5199 --out=<dir> --compute=gpu \
  --spot="pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolSize=ref&tubeForm=early&anchorLine=smooth&loftMesh=arc" \
  --shots=curl-front:rich:midday,curl-channel:rich:sunset --advance=60,60 --first=skip
```

To ride it: `?spot=pool&waves=barrel&poolSize=ref&wallBody=stream&tubeForm=early&poolReach=long&anchorLine=smooth&loftMesh=arc` (add the look switches as wanted). To judge build 2 without build 1's step in time, drop `&anchorLine=smooth`.

## The default, run again at the end

- Shared code was touched (`crashCurve.ts`, `frontRecords.ts`, `BreakingFront.ts`, `sweptLoft.ts`, `faceAnchor.ts`, `SurfZoneSimulation.ts`). So today's default pool was run again with the final code, with step 3's probe: `today.txt` here.
- **It equals `../step5/today.txt` line for line.** Only the wall time differs (554 s, before 555 s).
- **`?tubeForm=early` alone, run again on the final code, equals `form-early.txt` line for line** (wall time apart), and its throws' list is byte-equal. `form-early.txt` itself equals step 5's `form-early.txt` on every line step 5 printed.
- The merge suite on the final code: 343 files passed, 37 skipped; 3331 tests passed (before 3305; the 26 new ones are this step's).
- No `zz-*` file is in `src/` or here. Nothing was left on port 5199.
