# Step 7: `?frameJoin=arc`

2026-11-12. Ruling 19's step 1. Branch `claude/pool-frame-join`. **Not pushed, not merged.**
The switch is opt-in. The default Barrel is unchanged. Online rooms stay on the default.

## The short answer

- **The switch is built and it misses four hard bars.** Nothing was tuned. The causes are named below, each with a measurement.
- **A1 and A2 miss on the ref pool's case (`big`).** The cause is in the stored library, not in the join: 30 of its 120 frames before the throw (11 of the last 40) are not real frames. The library's builder replaced them with the point-by-point join of their neighbours. On the frames the run really gave, the arc join meets A2 (0.094 → 0.014 m). The advisor's 0.097 → 0.016 m was read on the default pool's case (`a38`), which has only 2 such frames in the last 0.6 s.
- **A4 misses, but is better.** Lower-face quads over 90° at the mouth: 2.1 % → 1.2 % (bar: none).
- **The throws' list is NOT byte-equal.** 995 of 1722 lines differ, most in the last digit of the asked water. The reader is the **face anchor**: it reads where the curve comes down through the anchor's level, and the arc join moves that crossing between frames. With the face anchor alone handed today's join, the list is byte-equal and lines A to F are identical. I did not accept the drift and did not build the second read: that is the advisor's call.
- **A3 passes:** from the throw on no vertex moves (0.000000 m).
- **The mixed-frame fallback never happens:** 0 of 120 frame pairs before the throw, in both cases.
- **The stills look the same as step 6's.** No rib, no slit, nothing new. I cannot see a gain either. The pre-made part can still be pointed to.

## What was built

| What | Where | Switch |
|---|---|---|
| Before the throw, both stored frames are spaced by arc (crest to toe, the lip and the throat at the throw's share), then joined. From the throw on: today's join. | `ProfileLibrary.profileAt` and `pointAt` (`src/wave/barrel/ProfileLibrary.ts`) | `&frameJoin=arc` |

Notes on the code:

- The stored bytes are not changed. The spaced frames are made once per case, on first use, and kept beside the stored ones.
- "Before the throw" means both frames have no jet (`jetLength` 0). If one frame has a jet and the other not, today's join is used. That never happens in the two cases: the first frame with an underside is 6 frames (`big`) and 5 frames (`a38`) after the throw.
- The landmarks (`pointAt`) go through the same join, so the wall water, the contact and the crash read one curve (they differ by under 1e-6 m).
- The threading: URL → `tubeFaceSwitches` (`PhysicalMode.ts`) → `SurfZoneConfig.frameJoin` → `libraryFromBytes` → `new ProfileLibrary(cases, { frameJoin: 'arc' })`.
- Online rooms pin it off (`src/main.ts`).
- `loftMesh=arc` stays on with it. It finds the vertices already in place: it moves them by 0.0013 m at 90 % (largest 0.021 m).
- Unit tests: `frameJoin.test.ts` (9), one more in `PhysicalMode.test.ts`.

## The bars (ref 311, 300 s, waves of 60 to 270 s)

Both runs carry `poolSize=ref`, `wallBody=stream`, `tubeForm=early`, `loftMesh=arc`, long reef, case `big`.
**base** = step 6's `arc.txt`. **join** = + `frameJoin=arc` (`join.txt`). **join, anchor on today's** = the same switch with the face anchor alone handed today's join (`join-anchor-today.txt`; a trace, not a build).
Values are median / 90 % / 99 % unless said.

| Bar | Aim | base | join | join, anchor on today's |
|---|---|---|---|---|
| A1, at each stored frame's own time, the curve off the raw frame (library probe, `big`) | 0.005 m | 0 | before −0.6 s: most 0.0036 m, pass. Last 0.6 s: 90 % 0.0046, most **0.0128 m, miss** (3 of 40 frames) | the same |
| A2, leave-one-out, last 0.6 s, 90 % (`big`) | 0.02 m | 0.128 m | **0.137 m, miss** | the same |
| A2, only frames the run gave (18 of 40) | — | 0.094 m | 0.014 m | the same |
| A2, a frame or a neighbour refilled (22 of 40) | — | 0.128 m | 0.137 m | the same |
| A2 on the default pool's case (`a38`), not the bar's case | — | 0.098 m | 0.016 m | the same |
| A3, from the throw on, largest vertex move (in the game) | 0.000000 m | — | **0.000000 m, pass** | 0.000000 m |
| A4, mouth (−0.15 to +0.15 s), crest to lip, quads over 90° | none | 0.0 % | **0.0 %, pass** | 0.0 % |
| A4, mouth, lower face, quads over 90° | none | 2.1 % | **1.2 %, miss** | 1.0 % |
| A5, fold at −0.5 to −0.15 s, crest to lip | report | 12 / 37 / 54° | 12 / 34 / 51° | 12 / 34 / 51° |
| A5, the same, lower face | report | 12 / 30 / 50° | 11 / 26 / 43° | 11 / 26 / 43° |
| Fold at the mouth, crest to lip; lower face | report | 22 / 45 / 59°; 22 / 57 / 100° | 16 / 35 / 54°; 17 / 46 / 93° | 15 / 35 / 54°; 17 / 45 / 90° |
| Fold at −1 to −0.5 s, crest to lip | report | 6 / 17 / 31° | 5 / 13 / 29° | 5 / 13 / 29° |
| A5, J2 where the share ends, median / 90 % | report | 6.1 / 41.4° | 4.0 / 41.0° | 4.0 / 41.0° |
| A6, the stills | no rib, no slit, nothing new | — | **pass** (no change seen) | not taken |
| The throws' list | byte for byte | 1722 jets | **not equal, miss** (995 lines differ) | **byte-equal** |
| Lines A to F | the same | — | **drift, miss**: A 2.17 → 2.16 m; D onsets 3897 → 3890, throws 1293 → 1294, asked 602.595 → 603.081 m³; B, C, F equal | **identical** |
| J3, band edge over the sea, most | 0.030 m | 0.030 | 0.030, pass | 0.030 |
| J4, case crest over the sea's; height ratio | 0.20 m; 1.06 | 0.20 (−0.04–0.45); 1.06 (0.87–1.40) | 0.20 (−0.04–0.46); 1.06 (0.87–1.41): the ends move 0.01 | the base's, digit for digit |
| Drawn crest's largest move in one step, before the throw | 0.3547 m | 0.3547 | **0.3547, pass** | 0.3547 |
| The same, from the throw (not a bar) | — | 5.594 m | 5.180 m | 5.594 m |
| The surface's rise, median / 95 % (report) | — | 0.61 / 2.17 m/s | 0.61 / 2.13 | 0.61 / 2.12 |
| The default pool | line for line with `step5/today.txt` | — | see "The default run again" | — |

How far the curve itself moved, in the game, before the throw (per slice the largest): 0.0006 m median, 0.021 m at 90 %, 0.097 m at 99 %, 0.24 m at most. In the last 0.6 s: 0.006 / 0.038 / 0.146 m.

One small thing, not a bar: just before clock 0 the arc join's vertices stand 0.0011 m (along the curve) from where they stand at clock 0. The curve itself steps by 0.0002 m there.

## What failed, and why

### 1. A1 and A2: refilled frames in the stored library

The library's builder (`src/wave/barrel/caseFromLibrary.ts`) flags frames it does not trust and stores, in their place, the point-by-point join of the clean frames around them. I call these "refilled".

- `big` (the ref pool's case): 30 of 120 frames before the throw are refilled, 11 of the last 40.
- `a38` (the default pool's case): 38 of 120, but only 2 of the last 37.

A refilled frame already holds the chord-cut curve that the arc join was meant to avoid. The join reads stored frames. It cannot repair one.

- **A2.** On `big`, in the last 0.6 s: with the frame and both neighbours as the run gave them (18 frames), today 0.094 m → arc 0.014 m at 90 %. With a refilled frame involved (22 frames): 0.128 → 0.137 m. Together: 0.128 → 0.137 m. So the bar misses because of the 22, not the 18.
- **A1.** The three frames over 0.005 m (frames 104, 113, 117; 0.0070, 0.0124, 0.0128 m) are all refilled. I did not trace why these round more than clean frames; a likely reason is a kink where the neighbours' lip marks stood, which spacing by arc cuts across.
- The advisor's figure (0.097 → 0.016 m) is `a38`'s. I read it again: 0.0975 → 0.0164 m. The ref pool uses `big`.

Ways on (not built; they need the advisor):
- re-make the refilled frames at load, by arc, from the clean frames around them (stored bytes unchanged); or
- do the refill by arc in the builder (changes the stored bytes).

### 2. The throws' list: the face anchor reads the curve before the throw

I asked which reader of the curve before the throw feeds the crash. The probe wraps the library before the sea is built and hands today's join to one named reader at a time (`--today`), on a run to 32 s (71 throws):

| Today's join handed to | The throws' list |
|---|---|
| nobody (the switch as built) | differs from the base |
| `CrashCurve.slice` (the jet's tip and landing) | differs, the same as the switch as built: no effect |
| `endBlendLength` (the tube's ends) | no effect |
| **the face anchor** (`FaceAnchor.caseFace`, `blendedFace`, `crossingAt` in `src/wave/barrel/faceAnchor.ts`) | **equal to the base** |
| all three | equal to the base |

Then the full 300 s run with the face anchor alone on today's join: the list is byte-equal to `step6/arc.throws`, and lines A to F, J3 and J4 are the base's.

What the face anchor reads: where the case's curve, from the crest on, comes down through the anchor's level, and how fast that crossing moves (over ±4 frames). It uses this to place the case on the sea's face. The place sets where each jet starts. The arc join moves the crossing between frames:

- arc join against today's: 0.0012 m median, 0.0106 m at 90 %, 0.21 m at most (`big`);
- at the stored frames' own times it is within 0.0029 m of the raw frame;
- its move per 0.003 s is steadier with the arc join: most 0.061 m, today's 0.206 m.

So the drift is not a bug in the join. The anchor reads the truer curve and places the case a few millimetres off. The jets follow: 55 of 1722 lines differ in time or place, the rest in the asked water (largest 0.287 m³ on one jet; the window's sum 602.595 → 603.081 m³).

Ways on (not built; the advisor's call):
- keep the face anchor on today's join (a second read of the library; the throws stay byte-equal; the drawn curve and the anchor then disagree by the numbers above); or
- let the anchor read the truer curve and take the new list as the base.

### 3. A4: the lower face at the mouth

Quads over 90° on the lower face at the mouth fell from 2.1 % to 1.2 %, not to none. I did not trace this further. The window (−0.15 to +0.15 s) is half after the throw, where this switch changes nothing by design (A3).

## The stills

`still-join-{front,along}-{90,150}s.jpg`, against `step6/still-arc-*.jpg`. Same camera, same times.

- **I see no difference between the two sets.** At 90 s and at 150 s, front and along, the wave, the lip's grey band, the white water and the sea's ripples are in the same places. The changes the numbers show (a few centimetres, for a fraction of a second) are below what these four stills show.
- No rib. No black slit at the mouth. Nothing new.
- **The pre-made part can still be pointed to,** as in step 6: the wall stands up out of the flat sea, with a rounded far end (left in the front view) and a bright line at its foot. In the front view at 150 s the face still shows soft vertical bands of shade; they are in step 6's still too.
- Stills do not show motion. If the join's wobble shows, it shows in motion. That is for the owner's ride.

## What was checked

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The merge suite (without `SurfZoneSimulation.test.ts` and `SurfZoneRunner.test.ts`): 344 files passed, 37 skipped; 3341 tests passed (main: 343 files, 3331 tests; the 10 more are this step's).
- The default pool: equal line for line, see below.

## What was not run

- No rider sessions, catch reports or autopilot rides (the owner rides).
- No two-train run. No 600 s run.
- No stills for the trace run (the anchor on today's join).
- A4's remainder was not traced.
- Neither "way on" was built.

## Files

- `frame-join.ts`, `frame-join.txt`: the library probe (A1, A2, A3, the mixed pairs, the anchor's crossing), on `big` and `a38`.
- `crash-probe.ts`: step 6's probe plus the step 7 lines, `--readers` (which readers got another curve) and `--today <reader>` (hand today's join to one reader).
- `join.txt`, `join.throws`: the switch as built.
- `join-anchor-today.txt`, `join-anchor-today.throws`: the trace, the face anchor on today's join.
- `today.txt`: the default pool again.
- `still-join-*.jpg`: the four stills.

## Run it again

```
npx rolldown docs/research/pool-look-reference-2026-11-11/step7/crash-probe.ts -o dist/scripts/crash-probe7.mjs --format esm --platform node
node dist/scripts/crash-probe7.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&loftMesh=arc&frameJoin=arc" --throws join.throws > join.txt
node dist/scripts/crash-probe7.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&loftMesh=arc&frameJoin=arc" --today anchor --throws join-anchor-today.throws > join-anchor-today.txt
npx rolldown docs/research/pool-look-reference-2026-11-11/step7/frame-join.ts -o dist/scripts/frame-join7.mjs --format esm --platform node
node dist/scripts/frame-join7.mjs > frame-join.txt
```

## The default run again

Step 3's probe on today's default pool, 300 s, on this branch: `today.txt`. Against `step5/today.txt` it is equal line for line. Only the wall time on line 1 differs (555 s, 559 s).

```
npx rolldown docs/research/pool-look-reference-2026-11-11/step3/crash-probe.ts -o dist/scripts/crash-probe.mjs --format esm --platform node
node dist/scripts/crash-probe.mjs --until 300 > today.txt
```
