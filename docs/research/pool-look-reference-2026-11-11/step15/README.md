# Step 15: the sea's foam lace on the lip (ruling 25b)

> **Held, not merged.** The code is on the branch `claude/pool-foam-3` on origin (cb296d69, 6277ff40). Main holds this write-up, the stills and the tools. Ruling 25c (end of `ruling-25.md`) explains what went wrong and what to build next.

> **Held, not merged.** The code is on the local branch `claude/pool-foam-3` (on top of step 13 and step 14's code). F2, F4 and F7 miss, and the stills do not read as foam lines. By the stop rule the work stops here.

2026-11-12. Render only. On only in Rich with `?lipLook=fray`; no new URL parameter.

## 1. What changed

`src/scene/barrel/lipLook.ts` (tests in `SweptBarrelMesh.test.ts`):

1. **Pattern.** Step 13's value noise is gone. A streak is now the sea's own foam lace: `foamPhaseCover` from `foamPatternPars`. It uses the same baked tile, the same thresholds (so the cover is an area share) and the same patches. It is read at (u / 0.30 m, (s − 3 m/s · τ) / 1.2 m) lace cells. No flow-map phases, no time. Far away it fades to its mean, as the sea's lace does.
2. **Texture.** Nothing new was bound. The tube's program already gets the water's uniforms, so `waterFoamTile` is the sea's own texture object (a test checks this).
3. **Cover.** Outer face as ruling 25b: 0 / 0.3 / 0.8 (points 32 / 48 / 64).
   - First build, inner face as 25b: 0.5 at the tip, 0.1 at the throat (88), 0 by 96.
   - **The one retune** (F4 missed): 0.8 at the tip, 0.15 at the throat, 0 by point 90. It is in the code now.
4. **Light.** Step 14's light is kept. Where the sheet's fray share is above 0, the light through the sheet is the clean lip's, so a streak only adds there.
   - First build: a ramp over the thin share. It still left 2067 thin pixels darker by more than 2 levels (up to 107).
   - Now: a gate (`thin > 0`), as the ruling words it. This is a fix to my own build of item 5, not a retune.
5. **Clock.** Unchanged (ruling 25).

With `lipLook` off, and in Classic, the program text and the vertex data are unchanged (tests). The pixels are equal to main (F6 below).

## 2. Bars

The same frame at 90 s, read against the same frame with the streak forced off. The frames repeat exactly. My off frames equal step 14's "zero" frames (0 to 2 pixels differ, by at most 2).

**Regions** come from masks drawn by the shader. A new mask gives the profile point (`jobs/03-point-gate-retune.js`): outer face is points 32–64, underside 64–88, back wall 88–112.

**Changed** means luma by 6 levels or more, or saturation by 0.06 or more.

**Before** is step 14's still at the same frame (`claude/pool-foam-2`).

| Bar | Target | Before (step 14) | Step 15, first build | Step 15, final (gate + retune) | Verdict |
| --- | --- | --- | --- | --- | --- |
| F1 changed share, outer face, `curl-lip` midday | 20 to 40 % | 27.8 % | 17.9 % | 19.2 % | **miss** (just) |
| F1, `curl-front` midday | 20 to 40 % | 34.1 % | 22.4 % | 24.1 % | pass |
| F1n saturation, changed ÷ off, `curl-lip` | ≤ 0.6 | 0.60 | 0.60 | 0.63 | **miss** (just) |
| F1n luma, changed vs off, `curl-lip` | not lower | 204 vs 198 | 202 vs 195 | 205 vs 196 | pass |
| F1n darker by > 8 levels | ≤ 5 % | 4.6 % | 4.5 % | 4.0 % | pass |
| F2 median piece, round the curl ÷ along the crest, `curl-lip` | ≥ 2.5 | 0.93 (3 pieces) | 3.30 (9 pieces) | 1.91 (8 pieces) | **miss** |
| F2, `curl-front` | ≥ 2.5 | 1.12 | 2.95 | 1.69 | **miss** |
| F2 crossings per m at mid-lip, `curl-lip` | 0.7 to 3 | 1.49 | 3.74 | 3.74 | **miss** (too many) |
| F2 crossings per m, `curl-front` | 0.7 to 3 | 0.71 | 1.65 | 1.65 | pass |
| F2 gaps' spread ÷ mean, `curl-lip` / `curl-front` | ≥ 0.3 | 1.11 / 0.88 | 0.81 / 0.50 | 0.81 / 0.50 | pass |
| F3 tip third vs crest third, `curl-lip` | ≥ 2 × | 46.1 vs 0.2 % | 26.1 vs 2.8 % | 28.3 vs 2.8 % | pass |
| F4 underside (64–88), `curl-inside` | 15 to 35 % | 32.9 % | 9.3 % | 11.2 % | **miss** |
| F4 back wall (88–112), `curl-inside` | ≤ 3 % | 0.0 % | 5.1 % | 1.8 % | pass after the retune |
| F4 rider's pixels | equal | — | — | no rider in these stills; outside the tube 68 px differ by ≤ 3 at the tube's edge | not tested |
| F5 drift in u, 0.1 s apart (`f5w`) | 0 | 0 cm | — | 0 cm (cover 0.5), −1 cm (0.7) | pass |
| F6 `lipLook` off, pixels vs main | equal | — | — | `curl-lip` and `curl-inside`: 0 px differ | pass |
| F6 fps, pool, with vs without `lipLook=fray` | within 1 | — | — | 60.6 vs 60.5 (lowest 60 / 60) | pass (capped at 60) |
| F7 thin sheet, px darker by > 2 levels, `curl-lip` | 0 | 6419 of 45024 (up to 113) | 2067 (up to 107) | 45 (up to 75) | **miss** (small) |
| F7, `curl-inside` | 0 | 4765 of 10411 | 376 | 0 | pass |

Notes on the bars:

- **F2 is a weak bar here.** The lace's walls join, so each "piece" is a net that spans many cells. Only 8 or 9 pieces have 30 pixels or more. With the gate on, the bright tip joins pieces together, so the ratio drops from 3.3 to 1.9 while the pattern stays the same.
- **The mid-lip count depends on the line.** Read by cover (as step 14 did), `curl-lip` gives 2.80 per metre. Read by profile point (as here), it gives 3.74.
- **F4 in `curl-inside`.** The lip shows only in the top right corner, about 20 000 pixels. Most of it is the underside near the throat, where the cover is low.
- **F7's 45 pixels** lie along one thin line on the underside just inside the tip (points 68 to 79), where the thin share is small. Cause not traced.

**Canyon fps** (main route): mean 60.6, lowest second 60, from 10 s on. Main: 60.4 / 59.

## 3. What the stills show

- `crop-lip-midday-3-rows.jpg` (`curl-lip`, midday), from top: no streak; step 14; step 15.
  - Step 15 draws the lace's net, blown up. Pale grey-white walls make a cell pattern over the lip. The cells are large, clean and cyan, with hard edges.
  - Near the crest the walls lean round the curl, like chevrons. Lower on the face they read as a cracked or giraffe pattern.
  - It reads as paint or a net, **not as foam lines round the curl**. It is not soft clouds any more (step 14), but it is not the photo's streaks either.
  - The colour is grey-white (mean 164, 213, 238 on changed pixels, against 125, 212, 246 clean), not white.
- **Spikes under the lip.** On the left, where the lip has just thrown, grey spikes hang down from the lip's edge. This is the inner face near the tip, seen from below, now at cover 0.8. They read as icicles or drips.
- `crop-lip-sunset-before-after.jpg`: at sunset the net takes the sun's peach colour, like the pile. Same pattern, same spikes.
- `still-after-front-midday.jpg`: from further away the net reads as a striped, tiger-like band on the lip.
- `still-after-inside-midday.jpg`: the inside is clear. Only the lip's edge in the top corner carries the pattern.
- **The rim** (the tip's thin sheet) is no longer darker than the clean lip, except 45 pixels along one line just inside the tip.
- The wall ahead of the tube is not whitened. The cover starts at the crest, and the clock did not change.

## 4. Why it looks like a net (for the advisor)

- **The lace's foam is the cell walls.** At 0.3 to 0.8 cover the walls are thick, and the cells between are clean.
- **The cells are large on screen.** One cell is 0.30 m across and 1.2 m round the curl. In `curl-lip` (185 px per metre) that is about 55 × 220 pixels. On the sea, the same lace at 0.7 m is seen from far away and through a flow map, so it reads as fine foam.
- **Stretching does not make lines.** A stretched Voronoi net still has walls in every direction: the long walls become diagonals and the short walls stay. That gives chevrons and a net, not parallel lines.
- **What the sea does for streaks.** `AGED_STREAKS` reads the tile's smooth patch channel (`.g`), stretched, and lets it gather the lace. The lace itself keeps its own small cells. So the streak's shape comes from the stretched patch value, and the fine texture comes from the lace.
- **A route the advisor may weigh** (not built; outside this step's one retune):
  - lace at its own cell size, or finer (bubbles of a few cm);
  - its local foam value raised along stretched patch lines read from `.g` at (u / 0.3, s′ / 1.2), as `freshLace` does with `gather`;
  - the inner face's cover near the tip kept low, so the spikes do not show.

## 5. Not run

- No rider session, no ride, no browser pane.
- The merge checks: tsc, the full suite and the Canyon byte check. They were not run because the bars did not pass.
- Dawn and Classic stills.
- Fps on the M1 is capped at 60 in these headless traces, so a small cost would not show.

## Files

- `bars15.mjs`: the bar reader (F1, F1n, F2, F3, F4, F7) on the mask stills. It reads PNGs with `../step12/px.mjs`.
- `jobs/`: run with `../step14/hold.mjs` (the same command as step 14, with the ride address of the brief).
  - `00-setup.js`: step 14's setup, plus `__off`, which forces the streak to 0.
  - `01-stills.js`: the stills, each paired with its off frame, and the masks.
  - `02-f5w.js`: F5. Read it with `../step14/f5w.mjs`.
  - `03-point-gate-retune.js`: the profile-point mask, the gate and the retune, run in the page on the same frame.
  - `06-mainlip.js`: the `curl-lip` camera on main, for F6.
