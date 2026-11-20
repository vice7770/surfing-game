# Step 16: the lace gathered into streaks (ruling 25c)

> **Held, not merged; part (a) parked.** The code is on the branch `claude/pool-foam-4` on origin (c25a76e1). Main holds this write-up, the stills and the tools. Ruling 25d (end of `ruling-25.md`) parks the streaks and asks first why foam is no brighter than the water.

> **Held, not merged.** The code is on the local branch `claude/pool-foam-3` (on top of steps 13 to 15). The stills read as a net, not as foam streaks round the curl, and a net hangs under the lip. By ruling 25c's stop rule, part (a) is parked.

2026-11-12. Render only. On only in Rich with `?lipLook=fray`; no new URL parameter.

## 1. What changed

`src/scene/barrel/lipLook.ts` (tests in `SweptBarrelMesh.test.ts` and the new `lipStreakPattern.test.ts`):

1. **Lace (the bubbles).** The sea's own lace, read on the sea's tile, the same cell both ways. Ruling 25c: 0.25 m. The one retune: **0.15 m** (see below). It is in the code now.
2. **Streak (where the foam gathers).** The tile's smooth patch value `.g`, read so one patch spacing (8 tile cells) is 0.6 m along the crest and 3.0 m round the curl (s − 3 m/s · τ). It is offset as the sea's `AGED_OFFSET` (now exported; the sea is unchanged).
3. **Gathering.** F′ = clamp(F + F(1 − F)(2v − 1)(1 + 1.5), 0, 1): the sea's aged-foam rule (`freshLace` at youth 0). The lace is drawn at F′ with the sea's own `foamCoverage` and thresholds. Two reads of the sea's tile; nothing new is bound.
4. **Cover.** Outer face 0 / 0.3 / 0.8 (points 32 / 48 / 64), as before. **Inner face: 0.3 at the tip, 0.1 at the throat (88), 0 by 96.** So the cover steps down at the tip.
5. **Light.** Step 15's, unchanged (the hard thin-sheet gate). See F7 for the trace.
6. A CPU mirror (`lipStreakLace`) reads the same texels as the GPU. The F2 test uses it.

With `lipLook` off, and in Classic, the program and the vertex data are unchanged (tests), and the pixels equal main (F6).

**The one retune.** At 0.25 m, one lace cell is almost as wide as one streak (a streak is about 0.3 m wide at a 0.6 m spacing). So the lace cannot gather into lines; it shows as a net. I took the lace cell down to 0.15 m (the low end of its range), so a streak holds two cells across. It did not change the look much (section 3).

## 2. Bars

The same frame at 90 s, read against the same frame with the streak forced off. My off frames equal step 15's off frames (497 pixels differ, by at most 2). Regions come from shader-drawn masks, as in step 15 (`jobs/02-maskP.js`: outer face 32–64, underside 64–88, back wall 88–112).

"Build" is ruling 25c's numbers (lace 0.25 m). "Final" is after the retune (lace 0.15 m), as the code is now.

| Bar | Target | Step 15 (final) | Step 16 build | Step 16 final | Verdict |
| --- | --- | --- | --- | --- | --- |
| F1 changed share, outer face, `curl-lip` midday | 20 to 40 % | 19.2 % | 18.0 % | 17.2 % | **miss** |
| F1, `curl-front` midday | 20 to 40 % | 24.1 % | 23.6 % | 23.4 % | pass |
| F1, `curl-lip` sunset | 20 to 40 % | — | 20.2 % | 19.6 % | miss (just) |
| F1n saturation ratio, `curl-lip` midday | ≤ 0.65 | 0.63 | 0.57 | 0.58 | pass |
| F1n luma, changed vs off | not lower | 205 vs 196 | 206.6 vs 191.7 | 205.9 vs 190.3 | pass |
| F1n darker by > 8 | ≤ 5 % | 4.0 % | 2.3 % | 1.3 % | pass |
| F2 on the pattern: correlation length round ÷ along (4 m × 2 m, 1 cm, cover 0.3) | ≥ 2.5 | — | raw mask 1.00; local share 3.33 | raw mask 1.00; local share 3.23 | see note |
| F2 pieces in `curl-lip` (as step 15 read them) | — | 1.91 | 1.40 | 1.00 | (eye decides) |
| F3 tip third vs crest third, `curl-lip` | ≥ 2 × | 28.3 vs 2.8 % | 26.8 vs 1.2 % | 25.0 vs 2.0 % | pass |
| F4 underside (64–88), `curl-inside` | 10 to 25 % | 11.2 % | 3.2 % | 8.3 % | **miss** |
| F4 back wall (88–112), `curl-inside` | ≤ 3 % | 1.8 % | 8.6 % | 8.7 % | **miss** |
| F5 drift in u, 0.1 s apart | 0 | 0 cm | — | not read (note) | not tested |
| F6 `lipLook` off, pixels vs main (`curl-lip`, `curl-inside`) | equal | 0 px | — | 0 px | pass |
| F6 fps, pool with vs without `lipLook=fray` | within 1 | 60.6 vs 60.5 | — | 59.5 vs 60.3 (60.6 without one 2.5 s stall) | pass (note) |
| F7 thin sheet, every sample thin, `curl-lip` midday | 0 px darker by > 2 | 45 (all thin px) | 0 of 36 941 | 0 of 36 941 | pass |
| F7, `curl-lip` sunset, every sample thin | 0 | — | 765 (worst 6.3) | 723 (worst 5.7) | **miss** (tone map, note) |
| F8 nothing hangs under the lip (eye) | none | icicles | a net | a net | **miss** |
| Eye check: foam streaks round the curl | yes | no | no | no | **miss** |

Notes:

- **F2.** The raw mask's correlation length is the lace's own wall (4 to 6 cm both ways), because the lace is the same both ways, as the ruling asks. So the raw ratio is 1.0. The streak shows one level up: the mask's local share over one lace cell has a correlation length of 0.31 m along the crest and over 1 m round the curl (capped at half the grid). At lags of 0.3 to 1 m, the raw mask still correlates 0.19 round the curl and −0.02 along the crest. The unit test holds the 2.5 on the local share. In the stills the streak does not show (section 3).
- **F4 back wall.** The ruling's inner cover (0.1 at the throat, 0 by 96) puts foam on points 88 to 96. The gathering lifts F′ there to about 0.3, and the lace walls show against the dark water.
- **F5.** The code for u is step 15's (0 cm there). Step 14's tool reads the drawn foam along a line. Now the fine lace moves 0.3 m round the curl in 0.1 s, so the two stills do not match anywhere (best |diff| 0.24). Its "best shift" of −44 cm is noise, not drift.
- **F6 fps.** Headless, M1, 60 s, capped at 60. Pool with `lipLook=fray`: mean 59.5, one 2.5 s stall at 17 s (likely a program compile), 60.6 without it. Pool without: 60.3. Canyon (`spot=canyon&canyonWaves=true`): 59.9, one 1.4 s stall at 13 s. In these traces no rider was in the water (unlike step 15's idle rider).
- **F7, traced.** Step 15's 45 pixels (40 here) are edge pixels. The renderer takes 4 samples per pixel. At these pixels only 1 of the 4 samples is on the thin sheet (`jobs/05-gate.js` draws the gate: 64 of 255). The other 3 are the thick underside just inside the tip (points 69–78). There the streak cuts the light through the sheet, as on any thick sheet. Roughness is not the cause (`jobs/03-f7-roughness.js`: no change). On pixels where every sample is thin, midday has 0 darker pixels. I did not change the light for this.
- **F7 at sunset.** On fully thin pixels near the tip (points 63–67) the light rises in every channel with the streak (`jobs/04-terms.js`: diffuse + emission + specular, none lower). The display luma still drops by up to 6 levels: the streak turns the near-white tip peach, and the tone map moves light from green to red. This is the tone map, not a shadow.

## 3. What the stills show

- `crop-lip-midday-3-rows.jpg` (`curl-lip`, midday), from top: no streak; step 15; step 16 (final).
  - Step 16 draws the lace as a fine **honeycomb net** over the lip. The cells are clean cyan, with grey-white walls.
  - I do not see lines round the curl. The gathering only makes the net denser in some places and thinner in others. The patches are about as long as they are wide on screen.
  - **A net hangs under the lip** on the left, where the lip has just thrown. These are points 84 to 96 (the throat and the top of the back wall), at cover 0.1 or less. It reads as a fishing net, not as icicles, but it still hangs.
  - The colour is grey-white (167, 215, 239 on changed pixels, against 117, 209, 245 clean).
- `crop-lip-sunset-off-after.jpg`: at sunset the net takes the sun's peach colour. Same pattern.
- `still-after-front-midday.jpg`: from further away the net still shows as a net under the lip.
- `still-after-inside-midday.jpg`: the inside view.
- At 0.25 m (the build) the cells were larger: the same net, coarser.

**My honest read: it does not read as foam streaks drawn round the curl.** It reads as a net, or as paint with a cell pattern. Step 15 read as tiger stripes; step 16 reads as a honeycomb.

## 4. Why, and what I would change (not built)

- The streak is 0.6 m apart along the crest, so about 0.3 m wide. A lace cell of 0.15 to 0.25 m is too large to gather into a line that narrow. On the sea, the same rule works because aged streaks are 5 to 10 lace cells wide.
- For lines to show, the lace would need to be much finer than the streak (a few cm), or the streak much wider. Neither fits in this step's one retune.
- The inner cover: with gathering, 0.1 at the throat draws a visible net under the lip. I would end the inner cover by point 80, before the throat.
- F2 on the raw mask cannot pass with a lace that is the same both ways. The local-share reading measures the streak.

## 5. Not run

- The merge checks (tsc, the full suite, the Canyon byte check): the eye check failed.
- No rider session, no ride, no browser pane.
- Dawn and Classic stills.

## Files

- `jobs/`: run with `../step14/hold.mjs` and step 15's `00-setup.js` and `01-stills.js`, with the ride address of step 15.
  - `02-maskP.js`: the profile-point mask.
  - `03-f7-roughness.js`: F7 trace, roughness from the cover without the streak (no change).
  - `04-terms.js`: the lit terms with and without the streak.
  - `05-gate.js`: the gate per pixel (shows the 4-sample edge pixels).
  - `06-retune.js`: the retune (lace 0.15 m) on the same frame.
- `f7full.mjs`: F7 on pixels where every sample is thin, and on edge pixels.
- `where.mjs`: the profile points of the changed pixels in a box.
- Bars: step 15's `bars15.mjs`.
