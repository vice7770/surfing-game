# Step 12: the lip's outer face (ruling 24)

2026-11-12, branch `claude/pool-lip-face`. Render only. One build, nothing tuned.

> **Held, not merged.** The code (abcb8e87) and its test are on the branch `claude/pool-lip-face` on origin only; main holds this write-up, the stills and the pixel reader. The owner's foam reference photo (same day) asks for a light lip with white foam, so this darker, patchy outer face goes the wrong way; foam comes first (see the handoff).

**Short answer: the pale band is about half gone at midday. P1 still misses (1.37, aim 0.85 to 1.15). P2 and P3 miss by their numbers. Handed back under the stop rule.**

## What changed

- `src/scene/barrel/SweptBarrelMesh.ts`, Rich look, only with `?lipLook=fray` (and the default `lipBack`). No new URL parameter.
- Two new lines in the fragment (`LIP_FACE_WEIGHT`):
  - `float sweptThin = 1.0 - smoothstep( 0.06, 0.20, vSweptSheet );`
  - `float sweptLipW = vSweptSheetWeight * mix( sweptThin, 1.0, clamp( vSweptThroat.w, 0.0, 1.0 ) );`
- `sweptLipW` stands in place of `vSweptSheetWeight` in four places (`lipFaceWeighed`): the `waterBody` mix, the back-light line, the gated glow, the mean-normal mix.
- Not changed: `LIP_FRAY_VOLUME` (it keeps `vSweptSheetWeight`), `vWaterFoam`, the vertex shader, the geometry, the contact, the sea, the throws, `tubeLook=merge`, Classic.
- With `lipLook` off the program text is the same as before (test in `SweptBarrelMesh.test.ts`). With `lipLook=fray&lipBack=old` it is also unchanged (my choice: the ruling names the gated glow only).

## The two varyings, checked in the code

- `vSweptSheet`: yes, the lip's thickness across at the vertex, in metres (`sheetAcross` in `src/wave/barrel/lipSheet.ts`; written in `sweptLoft.ts` as `r.sheet[v]`). It is 0 outside the crest-to-throat run.
- `vSweptThroat.w`: yes, the inner face's weight (`r.throat[4 v + 3] = inner * e` in `sweptLoft.ts`). It is set on profile points 64 to 112: from the lip's tip, along the underside, down the back wall to the toe. It is 0 on the outer run (points 32 to 64).

## How it was measured

- The tool's `curl-front` view, Rich, midday and sunset, at 90 s, with the ride address of step 10 (`lipLook=fray` on). GPU sea.
- Before = the same branch with the change stashed. Two before runs gave the same pictures, pixel for pixel (0 pixels differ). So the frame is repeatable.
- **No mask render** (it would be more than a few lines). P1 is read the simple way, with `px.mjs` in this folder (a small PNG reader, no installs), on fixed rectangles of the 1280 × 720 still:
  - the lip's outer face: x 690 to 730, y 348 to 366;
  - the clean wall ahead of the tube, same height: x 480 to 540, y 348 to 366.
- Brightness = Rec. 709 luma of the stored pixel values (0 to 255).

## The bars

| Bar | Aim | Before | After | Result |
|---|---|---|---|---|
| P1 midday (lip face / wall) | 0.85 to 1.15 | 204.1 / 119.9 = **1.70** | 163.7 / 119.9 = **1.37** | **miss** |
| P1 sunset | 0.85 to 1.15 | 194.8 / 192.0 = 1.01 | 186.8 / 192.0 = 0.97 | pass (it passed before too) |
| P2 edge over lip face, midday | at least 1.5 | 217 / 204 = 1.06 | 217 / 164 = 1.33 | **miss** |
| P2 edge over lip face, sunset | at least 1.5 | 236 / 195 = 1.21 | 236 / 187 = 1.26 | **miss** |
| P2 edge width | 2 to 8 px | about 6 px | about 6 px (same pixels) | pass |
| P3 inside view (`curl-inside`, midday) | pixel-equal | | 399 pixels differ, at most 6 of 255, at x 930 to 960, y 0 to 113 | **small miss** |
| P4 `lipLook` off | pixel-equal to step 10 | | not shot; the program text is unchanged (test) | pass by the test |
| P5 fps | no change | | not run (the parent runs it) | not run |

- **P2:** the white edge did not change (its rows are equal before and after). It reads 217 of 255, so it cannot be 1.5 times a face of 164. The bar asks for a darker face or a whiter edge.
- **P3:** the pixels that moved are on the left edge of the pale lip patch at the top of the inside view. Too small to see by eye. I did not find which vertices they are; most likely where the inner face's weight is under 1 next to the tip.

## The stop rule: what is left

P1 is over 1.15 at midday, so nothing was tuned. One extra still was taken with `sweptThin` forced to 0 (all four terms off on the whole outer face), then the code was put back:

| Midday, lip face / wall | Ratio |
|---|---|
| Before | 1.70 |
| This build | 1.37 |
| All four sheet terms off on the outer face | 1.21 |

- **About half of what is left (1.37 → 1.21) is the four sheet terms, still partly on.** In the middle of the face the build reads 167 to 180 and the forced still 128 to 134 (the wall is 120). So in this frame much of the visible face is thinner than 0.20 m, and keeps part of the sheet's weight. The 0.21 to 0.25 m of step 11 does not hold over the whole face at 90 s.
- **The other half (1.21) is not one of the four terms.** With all four off, the top third of the face, next to the crest, still reads 166 to 190. The sheet's weight is already 0 at the crest, so this is the surface's own shading there (it faces the sky more than the wall does).
- One still cannot split the four terms from each other.

## What the stills show

`still-before-front-midday-90s.jpg`, `still-face-front-midday-90s.jpg`, `still-before-front-sunset-90s.jpg`, `still-face-front-sunset-90s.jpg`.

- **Midday:** the lip's face is now mid-blue, close to the wave's top, not the flat pale slab. It is still lighter than the dark wall ahead of the tube. So the band is weaker, not gone.
- **It ends in a pale strip, then the old grey-white edge.** Just above the edge a pale strip stays (the thin water, as the ruling wants). The edge itself is the same grey-white line as before; it is not a clean thin white edge.
- **Worse: the face is now patchy.** There are darker and lighter blotches on it, and a dark seam low on the face near the touchdown end (reads 133, the face around it 165 to 180). Before, the face was one flat tone. The blotches are where the thickness crosses 0.06 to 0.20 m.
- **Sunset:** almost no change to the eye (the face was already close to the wall's tone). The orange edge is as before.
- No lost glow seen in these two views. No hard line at the crest.

## Against the owner's reference picture (not copied here)

- The picture looks into the tube from the open end. Its lip and roof are light turquoise and see-through, with white foam streaks, a torn white edge, spray off the crest and a white pile behind.
- The light roof in the picture is the lip's inner face. This build does not touch the inner face. On the outer face the build goes darker, toward the wall. That is right for a view from the front, but it does not bring the picture's look closer: the picture's lip is light, ours is now darker from outside.
- Still missing against it: white streaks on the lip and roof, a torn white edge (ours is a smooth grey line), spray off the crest, the tall white pile behind, foam lines on the face.

## Not run

- Rider sessions, catch reports (never).
- The mask render for P1 (rectangles used, see above).
- P4 as stills, P5 (fps), the Canyon hashes.
- The whole test suite. Run: `npx tsc --noEmit -p .`, `npx tsc -p server/tsconfig.json --noEmit`, `npx vitest run src/scene/barrel/SweptBarrelMesh.test.ts` (19 pass).
