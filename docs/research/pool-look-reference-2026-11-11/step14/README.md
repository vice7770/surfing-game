# Step 14: why the streaks drew pale blue, the fix, and a closer still

> **Held, not merged.** The code is on the branch `claude/pool-foam-2` on origin (step 13 4b02801c, step 14 2bbc1b02). Main holds this write-up, the stills and the tools. Ruling 25b (in `ruling-25.md`) keeps this step's light and replaces the noise with the sea's own foam lace, stretched round the curl.

2026-11-12. Render only. On only in Rich with `?lipLook=fray`; no new URL parameter. Built on step 13's code (4204b10b, cherry-picked).

**Result.** The cause of the pale blue is found and fixed: a streak took the light from behind the sheet, which is the water's colour. The foam now draws grey-white like the sea's own foam under the same light. **But the streaks still do not read as white foam at midday**, and F1, F2 and F4 miss. By the stop rule the work stops here. There are two more causes, and the ruling's numbers decide them, not the colour.

## 1. The cause of the blue

All values are from one held frame at 90 s, in the new close front still (`curl-lip`), on the lip's outer face, with the streak forced to full cover. "Linear" means the light before tone mapping.

| Part of the light (linear r, g, b) | Value |
| --- | --- |
| Whole pixel | 0.46, 1.04, 1.33 |
| Fray's light from behind the sheet (`0.5 · sweptBack`) | **0.09, 0.42, 0.60** |
| Fray's sun | 0.17, 0.17, 0.16 |
| Sheet's light through the foam (the 15 % left) | 0.03, 0.15, 0.21 |
| Sky on the foam (indirect diffuse) | 0.11, 0.19, 0.26 |
| Sun on the foam (direct diffuse, N·L about 0.13) | 0.07, 0.11, 0.10 |

- **The main fault is step 13's difference 2.** `withLipStreaks` gave every streak the fray's whole light: `LIP_STREAK_FRAY_SHARE = max( LIP_FRAY_SHARE, sweptStreakOwn )` (step 13, `src/scene/barrel/lipLook.ts` lines 128 and 135). The fray's light (`LIP_FRAY_VOLUME`, `lipLook.ts` line 48: `+ 0.500 * sweptBack`) passes half of what lies behind the sheet. That is the back wall's water colour and the sky through the mouth (`SweptBarrelMesh.ts` lines 224 and 241). It is right for the thin tip only. On the thick sheet it painted each streak with the water's colour. It is the biggest blue term in the table.
- **Second: the albedo.** The lit foam used the foam colour (mint, 0.69, 0.89, 0.81). The sea's freshest foam, the roller band's crest, uses a flat white (`BAND_ALBEDO` in `rollerGlsl.ts`).
- **Proof.** With that one term off (`jobs/04-emission-split.js`), the full-cover face goes from (149, 205, 228) to (152, 192, 210). After the whole fix it is (177, 210, 229): grey-white, not cyan. See rows 4 and 5 of `crop-lip-midday-5-rows.jpg`.
- Not the cause: tone mapping, the haze (zero nearer than 25 m), the sheet's alpha (the mesh is opaque), the Fresnel sky (0.02).

## 2. What changed

`src/scene/barrel/lipLook.ts` (`withLipStreaks`, `LIP_STREAK_VOLUME`, `LIP_STREAK_ALBEDO`), Rich with `lipLook=fray` only:

1. The fray's share is again its thin share, but it reads the streaked foam. So a streak takes the light from behind only where the sheet is thin (the tip), as the fray rule says.
2. On the thick sheet, the rest of a streak takes the light of the sea's roller band (`BAND_VOLUME`): the sun wrapped round the face, (N·L + 1)/2 − max(0, N·L). There is no light from behind.
3. A streak's share of the cover takes fresh whitewater's flat albedo, as the band's crest.
4. On the inner face, a streak gets only the sun that `RICH_THROAT` lets reach the face: all of it where the sun leaves the tube, otherwise through the lip. No new glow.

Where there is no streak, the lip draws as before. The after still against the same program with the streak forced to 0 differs on 7 to 33 tube pixels, by at most 1 level, all at edges. With `lipLook` off, and in Classic, the program text and the vertex data are unchanged (step 13's tests, updated, plus one new test for the new piece). Step 13's differences 1 (u is a world axis) and 3 (far away the pattern goes to its mean) are kept.

`src/dev/waterSheet.ts`: a new shot, `curl-lip`. It is `curl-front`'s line of sight at 0.4 of its distance, so the tube fills about half the frame (185 px per metre of crest, against 69 in `curl-front`).

## 3. Cause 3 of step 13 (foam in the tube's shade is grey)

The sea's foam has no shade of its own. Turned from the sun, it takes the sky's light and the band's wrapped sun, and it reads soft blue-grey. In the tube, foam now takes the same light, but the sky is cut by the tube (the `RICH_THROAT` irradiance) and the sun is what reaches the face. So in the tube's shade it stays grey. That is the match; no glow was added. The tube's rim (the tip's underside, cover over 0.6) is a little darker than before: (184, 200, 208) became (167, 184, 192), against (180, 200, 210) with no streaks. There the foam stops the bright light through the thin sheet and is lit as the water there is.

## 4. Why the streaks still do not show as white at midday

- **The face is turned from the sun.** At midday the sun is high, (−0.17, 0.74, −0.65), and behind the wave in these front stills. The lip's outer face has N·L of about 0.13. The sea's white pile lies flat (N·L about 0.74). Lit like the sea's foam, the lip's foam gets about half the pile's light. Its brightness is close to the clean lip's own glow: luma 208 on streak pixels, against 204 for the same pixels with no streak. So foam shows only as grey against cyan, never as white. Full cover gives 10 % white; no cover number can reach F1's 20 %. At sunset, with the sun low and to the side, the streaks read white-peach like the pile: (231, 225, 232). See `crop-lip-sunset-before-after.jpg`.
- **The pattern makes few, wide streaks.** At mid-lip (cover 0.3) the noise passes the threshold in only 2 places over 4.3 m of crest (0.47 per metre). The two-layer value noise, (n1 + 0.5·n2)/1.5, has a narrow spread, so the cover is not the share of area: mid-lip is nearly bare, and the tip third is 75 % covered. The 2.0 m and 3.5 m cell lengths round the curl are about as long as the whole outer face, so a streak never shows its length. What shows are soft, wide patches, mostly from the 0.7 m layer.
- **Inside, the roof has almost no streaks.** The cover there is 0.2 falling to 0. The pattern covers 2.6 % of the roof in `curl-inside`.

## 5. Bars

Regions come from mask stills of the same frame (`px14.mjs`: the tube's own pixels, the cover and the inner face's weight, drawn by the shader in flat colours). These are not fixed rectangles. "White" means every channel ≥ 200. Before = step 13 at the same frame; the frame repeats exactly (the real code's stills equal the in-page prototype's, 0 pixels differ).

| Bar | Target | Before (step 13) | After (step 14) | Verdict |
| --- | --- | --- | --- | --- |
| F1 white share, outer face, `curl-lip` midday | 20 to 40 % | 0.0 % | 1.0 % (full cover: 0.0 → 10.1 %) | **miss** |
| F1, `curl-front` midday | 20 to 40 % | 0.0 % | 0.9 % | **miss** |
| F1, `curl-lip` sunset | 20 to 40 % | 32.5 % | 36.5 % (the clean lip is partly white too) | in range, weak bar |
| Streak pixels' colour, outer face, midday | white | 163, 224, 248 | 170, 216, 238 (clean lip there: 140, 219, 249) | greyer, not white |
| F2 streaks per metre at mid-lip, uneven gaps | 0.7 to 2, spread ≥ 0.3 | pattern 0.47 /m, 0 white | pattern 0.47 /m, 0 white | **miss** (too few, not a barcode) |
| F3 tip third ≥ 2 × crest third | ≥ 2 × | pattern 75 % vs 0 %; white 0 vs 0 | pattern 75 % vs 0 %; white 1.0 % vs 0 % | pattern passes; white too small to mean much |
| F4 roof white share, `curl-inside` | 10 to 25 % | 0 % (pattern 2.6 %) | 0 % (pattern 2.6 %) | **miss** |
| F5 along the crest, two stills 0.1 s apart | 0 ± 1 px | n/a | 0 cm in u; 3 cm against world x (about 6 px) | see below |
| F6 `lipLook` off equal | equal | text equal (tests) | text equal (tests); pixels and fps not run | part |

F5 was measured from 91.1 to 91.3 s with one fixed camera (`f5w.mjs`). Along the crest the pattern holds in u: the best shift is 0 cm. Against the pixel's own world x it moves 3 cm in 0.1 s. That is the lip water moving along its ray, which runs 10 to 15° off the crest's normal, so the streak moves with the water, not over it. On screen the lip itself moves 7 to 146 px at a fixed u in 0.1 s (it throws and peels), so a pixel bar cannot be read straight from the stills. Round the curl the slide is 0.3 m by construction.

**Stop rule.** F1 missed after the colour fix. One cover retune is allowed, but full cover gives only 10 % white, so no cover can pass F1; it was not tried. F2 missed (too few streaks). So the work stops here.

## 6. What the stills show

- `crop-lip-midday-5-rows.jpg` (the close front view, crop), from top: no streak; step 13; step 14; step 13 at full cover; step 14 at full cover. In step 14 the streaks are soft grey-white patches on the cyan lip. They read as foam colour, but as wide cloudy patches, not as streaks round the curl and not as a barcode. At full cover, step 14 reads as a grey-white foam sheet like the pile; step 13 reads as pale cyan.
- `still-before-lip-midday-90s.jpg`, `still-after-lip-midday-90s.jpg`: the whole close front view. The clean lip is still light and see-through where there is no streak. The tip's rim is a slightly darker grey.
- `crop-lip-sunset-before-after.jpg`: at sunset the streaks take the sun's colour, as the pile beside them does.
- `still-after-inside-midday-90s.jpg`: the inside view is clear. Streaks show only at the lip's edge; the rider's view is not hidden.
- The wall ahead of the tube is not whitened (the clock and the cover did not change).

## 7. For the advisor (numbers not changed here)

1. F1's "white" (every channel ≥ 200) cannot be met at midday from in front when the sun is behind the wave: lit like the sea's foam, the lip's foam is grey there. Either read F1 on a sunlit still, or measure the foam against the clean lip by colour (saturation) instead of by white.
2. The cover table is not an area share with this noise. Mid-lip (cover 0.3) gets 0.47 streaks per metre, the tip third 75 %. To get 0.7 to 2 per metre, either flatten the noise's spread (for example a rank map) or change the mid cover.
3. The cell lengths round the curl (2.0 m and 3.5 m) are about as long as the lip's outer face, so streaks show as patches, not lines round the curl. Shorter lengths round the curl, or a stretch ratio set by the face's arc length, would show the streak's shape.
4. F4 (roof 10 to 25 %) does not fit the cover table (0.2 at the throat, 0 by point 100): the pattern covers 2.6 % of the roof.

## Not run

- No rider session, no ride, no browser pane.
- The full test suite, the Canyon guards, the fps trace, a `lipLook` off pixel diff against main, Classic stills, dawn.
- The cover retune (see the stop rule).

## Files

- `px14.mjs`: the bar reader on mask stills. `terms.mjs`: the lit terms on the face. `f5w.mjs`: F5 against u and world x. All read PNGs with `../step12/px.mjs`.
- `hold.mjs` and `jobs/`: hold one stepped sea in headless Chrome and run shader variants against it (the debug terms, the emission split).
