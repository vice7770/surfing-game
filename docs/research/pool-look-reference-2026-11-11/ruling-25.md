# Advisor ruling 25: foam on the 2 m pool tube

Water-physics advisor, 2026-11-12. Text only; no tool run, no file written by the advisor. The advisor has not seen the owner's photo, only the session's list (a) to (e). All numbers below are [P] unless tagged. Step 12's figures are the session's.

Tags: [S] sourced; [R] reasoned; [P] provisional.

**Why it was asked.** Step 12 (ruling 24) missed. The same evening the owner sent a photo of a real pool tube seen from the front, the surfer crouched inside, and said: "I was looking more for a wave like this" and "Im fine keeping our wave as long as its placed with foam to make the wave more realistic, as the liquid itself is not enough to be a wave". The photo is someone else's and is not in the repo. It shows: (a) a light turquoise see-through lip and roof with white foam streaks running round the curl; (b) a torn, white, frothy lip edge; (c) spray off the crest; (d) a tall white pile behind the tube; (e) white foam lines and sparkle on the face.

## Correction first

Ruling 24 aimed the lip at "dark as the wall". The owner's reference has a light lip. The aim was wrong, not only the build.

## 1. First build and the order

**First: (a) white streaks round the curl, growing whiter toward the tip.** It is one shader term on a mesh already drawn, with no new pass and no geometry. It also gives a white edge, so it covers part of (b).

Then:

1. **(b) the torn edge** (ruling 9 part 2: a toothed tip by alpha).
2. **(d) the pile:** check `afterTube=roller`'s height and whiteness against the photo.
3. **(e) foam lines on the face,** from the sea's foam field.
4. **(c) crest spray,** last: it needs particles, which is where the fps fell.

## 2. Build spec for (a)

1. **Where:** the tube mesh, Rich look, under `lipLook=fray`. No new URL parameter. Region: the outer face from the crest (point 32) to the tip (64), the inner face from the tip to the throat (88), and on along the roof, fading to zero by point 100.
2. **Coordinates:** u = the along-crest coordinate in metres. s = arc length round the profile in metres. s' = s − V·τ, with V = 3 m/s (the lip water's speed along the sheet, about √(2g·drop) for a 0.2 to 0.67 m drop [R]).
3. **Pattern:** p = a smooth 2D value noise of (u / 0.25 m, s' / 2.0 m), plus a second layer at (u / 0.7 m, s' / 3.5 m) with half the weight. Streaks are then narrow along the crest and long round the curl. Use the sea's own pattern sampler in `src/scene/foamPattern.ts` if it takes two coordinates.
4. **Cover:** c rises round the profile: 0 at the crest, 0.3 at mid-lip, 0.8 at the tip; on the inner face from 0.8 at the tip down to 0.2 at the throat. streak = smoothstep(1 − c − 0.08, 1 − c + 0.08, p).
5. **Clock:** zero at or before the throw; eased in over τ = 0 to 0.15 s; after touchdown it fades over 0.2 s as the roller's white takes over.
6. **Strength:** foam = max(vWaterFoam, 0.85 · streak). It feeds the existing lit foam and `LIP_FRAY_VOLUME`, so it is lit as the fray's white is.
7. **Far away:** fade the streak by the pixel footprint of u (fwidth), so it does not shimmer.

**How it moves.** The pattern is a fixed function of (u, s − V·τ). At one place the streaks stay put along the crest and slide round the curl with the water. There is no free time variable. The "no noise in time" must-not is lifted for this form only.

**Not touched:** geometry, contact, the sea, the sea's foam field, the throws, Classic. With `lipLook` off the shader text is byte-equal.

## 3. Step 12's weight

**Drop `sweptLipW`.** Go back to main's sheet: light and see-through, as the photo. Step 12 made the face patchy and added a seam, and its aim is withdrawn. Do not merge `claude/pool-lip-face`.

## 4. Bars (print today's value first)

- **F1, `curl-front`:** white share of the lip's outer face 20 to 40 %.
- **F2, `curl-front`:** along a line at mid-lip, 0.7 to 2 streaks per metre of crest. The gaps must be uneven: their spread over their mean at least 0.3 (no barcode).
- **F3:** white share in the tip third at least twice that in the crest third.
- **F4, `curl-inside`:** white share on the roof 10 to 25 %. Nowhere outside the tip band over 60 %.
- **F5, two stills 0.1 s apart:** the streaks' shift along the crest is 0 ± 1 px; round the curl at most 0.3 m.
- **F6:** `lipLook` off pixel-equal; the fps trace equal.

**Must-nots:**

- No new mesh, pass or particles.
- No free time noise.
- Do not whiten the wall ahead of the tube.
- Do not hide the rider from inside.
- Do not touch `tubeLook=merge`.

**Stop rule:** one build. One retune of the cover is allowed if F1 or F4 misses. If F2 (barcode) or F5 (swim) misses, hand back.

## 5. What each white stands for

- **Streaks round the curl:** the falling sheet thins and stretches; its rim breaks into fingers, and aerated crest water is drawn out along the flow [S: Watanabe and Ingram 2015, as cited in the lip-look ruling].
- **Torn edge:** the fingers stretch and break into drops [S, same].
- **Crest spray:** drops torn from the crest and the fingers by the air moving over and out of the tube [R].
- **Pile:** the splash-up and the aerated roller where the lip lands [S: the roller page].
- **Lines on the face:** foam left by the wave before, drawn up and stretched by the face's flow; the sparkle is sun on small ripples [R].

The spacings (0.25 m, 0.7 m) are not sourced. Watanabe's fingers are a lab-scale measure; ours are set for the still's distance.
