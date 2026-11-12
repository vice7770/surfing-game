# Step 13: foam streaks round the curl (ruling 25 part (a)), built once

2026-11-12. Render only. On only in Rich with `?lipLook=fray`; no new URL parameter.

**Result: the bars miss. The streaks do not read as foam in the stills.** F1 and F2 miss; by the stop rule the work stops here. The code is on `claude/pool-foam` (commit 4204b10b). **Held, not merged:** the branch is on origin; main holds only this write-up, the stills and the pixel reader.

## What changed

- `src/scene/barrel/lipLook.ts`: `LIP_STREAK` (the ruling's numbers), `lipStreakCover`, `lipStreakClock`, the GLSL pieces, `withLipStreaks`.
- `src/scene/barrel/SweptBarrelMesh.ts`: one new vertex attribute, `sweptStreak` = (u, s − 3 m/s · τ, cover, clock). It is made only at the first update in Rich with `lipLook=fray`. The fragment adds a two-layer value noise (cells 0.25 × 2.0 m and 0.7 × 3.5 m, the second at half weight) over the cover's threshold. The foam the body reads becomes max(the water's foam, 0.85 · streak).
- No new mesh, pass, particles, texture or time uniform. Geometry, contact, the sea, the throws, `tubeLook=merge` and the wall's shading are not touched.
- With `lipLook` off, and in Classic, the program text and the vertex data are as before (tested).

## Where the build differs from the ruling

1. **u is a world axis, not the front's σ.** u is the slice's crest's world x where its ray runs mostly along z, else its world z. A front's σ starts where the front starts, and that place moves. A world axis keeps the streaks still along the crest.
2. **A streak is lit as the fray's white whatever the sheet's thickness.** The first try fed only the lit foam. The streaks then drew grey: the lip's faces turn from a high sun, and `LIP_FRAY_VOLUME` only lights thin water. The frayed share is now max(thin share, streak).
3. **Far away** the pattern goes to its mean and the threshold's edge widens with the pixel's footprint along u. The streak does not go to zero.
4. **The clock** uses the slice's τ (0 at or before the throw, eased over 0.15 s) and its time since touchdown (faded over 0.2 s). The ruling's cover table is used as written.

## Bars

Read on fixed rectangles of the 1280 × 720 `curl-front` still at 90 s (`px13.mjs`). "White" means every channel ≥ 200.

| Bar | Target | After | Lip at full cover (test still) | Verdict |
| --- | --- | --- | --- | --- |
| F1 white share, outer face | 20 to 40 % | 1 % (mean rgb 158, 217, 240) | 1 % (176, 219, 236) | **miss** |
| F2 streaks per metre, uneven gaps | 0.7 to 2 | no countable streaks | n/a | **miss** |
| F3 tip third ≥ 2 × crest third | ≥ 2 | 2 % against 0 % (too few pixels to mean much) | n/a | not shown |
| F4 roof white share | 10 to 25 % | none seen from inside | n/a | **miss** |
| F5 two stills 0.1 s apart | n/a | not run | n/a | not run |
| F6 `lipLook` off pixel-equal, fps | n/a | program text equal by test; pixels and fps not run | n/a | part |

No before still was made with this build. For the eye, use `../step12/still-before-front-midday-90s.jpg`.

## What the stills show

- **Front (`still-after-front-midday-90s.jpg`, `crop-after-front-lip-3x.jpg`).** The lip's outer face carries a few broad, soft, paler patches that reach from the lip's edge toward the crest. They do not read as foam streaks. They are not a barcode and not noise; they read as faint paint.
- **Why, part 1: foam on this face is not white.** A test still with the streak at full cover everywhere (`crop-full-cover-front-lip-3x.jpg`) draws the whole face pale blue (176, 219, 236), 1 % white. The clean lip is already light, so foam adds little contrast. No cover number can meet F1. The same test still shows the inner face and the back wall grey: foam in the tube's shade.
- **Why, part 2: the cells are near one pixel.** At this camera a 0.25 m cell along the crest is about one to two pixels. The fine layer averages out. What shows is the 0.7 m layer at half weight.
- **Inside (`still-after-inside-midday-90s.jpg`).** No streaks are seen. The wall a rider sees is mostly profile points 85 to 100, where the cover is 0.2 falling to 0. The rider's view is not hidden.
- **The wall ahead of the tube** is not whitened: the clock is zero at or before the throw, and the cover is zero outside points 32 to 100.

## Not run

- F5 (two stills 0.1 s apart), the fps trace, a `lipLook` off pixel diff.
- The cover retune the stop rule allows. It would not help: F1 misses at full cover.
- No rider session, no browser pane.

## For the advisor

1. The foam's colour on the lip: at foam 0.85 the outer face draws (176, 219, 236) at midday. The streaks need a whiter foam, or a darker lip, to show.
2. The streak cell along the crest (0.25 m) is at the pixel's size in `curl-front`. A wider cell, or a closer bar still, is needed for F2 to be countable.
3. In the tube's shade foam draws grey. Streaks on the inner face and the roof would be grey lines, not white.
