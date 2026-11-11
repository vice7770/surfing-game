# Ruling 14: `?poolSize=ref` after its first build (2026-11-11)

Tags: [M] measured here or by the builder's probe, [KB] knowledge base, [R] reasoned, [U] recalled, [P] provisional.
Runs: two short probe runs on the M1 (14 periods each), from scratch copies of the builder's probe with two additions
(`--width`, and a log of the meter's onsets). Nothing in the game was edited. Third run not used.

## 1. The cause, in one paragraph

The build is not a Froude copy, because the wrapped window stayed 280 m. Two wavelengths across 280 m fix the along-shore
wavenumber, so at 10.5 s the sea turned (feed 39.1° to 41.8° [M]; on the platform 27.4° to 30.6° [R]) and the 1.47 m feed
delivered 0.966 of the copy's amplitude [R]. That explains the uneven platform height (2.42 / 2.04 / 1.92 m [M]).
It does NOT explain a lost plunge, because the plunge was not lost, and two of the missed bars are reading artefacts:
- **Bar D (jets):** jets on u 40-90 are 597 of about 640 column-waves (93 %), today 608 [M]. Every column throws once per
  wave. The probe's denominator doubled: 609 repeat onsets on u 40-110, whose median place is 163 m shoreward of the first
  (10th -176 m, 90th +1 m) [M]. Most are a second break line in the same columns (the inside break near z -17 [R]); a
  minority are a true stutter at the reef. The copy even throws farther along (u 90-150: 123, 112, 93, 58, 46, 70 against
  today's 123, 90, 70, 41, 33, 24 [M]).
- **Bar A (meter 2.32 m):** the meter's band is x = take-off +/- 10 m at ANY z. In 5 of 16 waves its largest face came
  from z -16 to -19 (faces 2.16-2.42 m), not the reef (z -201 to -210); 4 of the 5 faces that make H1/3 are those [M].
  At the reef the best faces are 1.82-2.11 m, median 1.97 m (11 waves) [M]. The x 1.11 did not overshoot.
- **Bar B (pace):** linear Snell with V = c_p / sin(theta_p + phi) gives today 6.98, as built 7.20 m/s [R]: the turn
  predicts FASTER. Measured 6.45 and 6.16 m/s [M], but the probe's frame is 0.267 s, so 110 m reads in steps of 1.5 %
  and only 10 waves reached u 175. The 4 % gap is at the edge of what this probe can show. Not settled.

## 2. First choice: (b) keep 10.5 s and widen the window to 311 m, for ref only

| Number | Value | Why |
|---|---|---|
| Window width | **311 m** (280 x 1.11), nx 311 | copies the PLATFORM direction (27.4°) [R]. The builder's 296 m copies only the feed's (platform 28.8°) |
| Where | `alongShore: 311` in `poolRefConfig` (`src/game/PhysicalMode.ts:399`); read by `alongShoreOf` (`SurfZoneSimulation.ts:686`) | no other spot reads it |
| Period, feed | 10.5 s, 1.47 m | at 311 m the feed is the copy's within 0.3 % [R] |
| Sea direction at the feed | 36.8° [M] | follows from the width; do not set it by hand |
| Floor | ruling 13 section 4, unchanged | |
| Join table | today's 10 s row, times x 1.054, lengths x 1.11 | exact under a true copy [R] |
| Absorbing zone | unchanged | 1.33 wavelengths against today's 1.36 [R] |

Measured with it (run 1) [M]: platform H 2.01 / 2.06 / 2.09 m; foot crest median 1.10 m (mean 1.14; the probe reads about
6 % under the game's tracks, aim 1.20); throw height u 40-90 1.87, 1.74, 1.70, 1.72, 1.70 m (as built 1.81, 1.76, 1.71,
1.46, 1.46); jets 128, 112, 127, 128, 112 on u 40-90 and 128, 128 to u 110; peel u 65-175 6.65 m/s (5 waves);
first break u 30 at 1.82 m; line's end median u 148; fastest water 8.01 m/s (today 6.97 x 1.15 = 8.02: AT the limit);
least water on the reef top 0.14 m; current -0.08 then -0.14 m/s.

Check before trusting it: the GPU periodic path accepts nx 311; the scene's extents and seam bands follow the width;
the Canyon hash check and fps trace, as before every pool merge.

**Second step, only if step 1's bars hold:** the reef's along-line lengths x 1.11 (knots 0, 33.3, 72.2, 194.3, 227.6,
260.9; startX 127.7; takeOffS 44.4) [R]. Run 1 did not scale them, so the copy is still not exact along the line.
It brings the reef's end 17 m nearer the beach: measure the clearance first.

Ranking of the rest: (a) ref floor at 10 s is the no-cost fallback (even platform, peel 6.45 m/s, but 5 % off the case
and a tall start, throw 1.87-2.07 m at u 30-50 [M]). (c) a smaller factor is rejected: the overshoot was the meter.
(d) nothing else is needed for size.

## 3. The bars, re-stated

- **A, size.** The meter stays as a report only. The bar: the reef's own largest onset face per wave (onsets within
  30 m of the reef line, x = take-off +/- 10 m), median over the waves from 60 to 180 s: **2.0 +/- 0.1 m**. As built
  reads 1.97 m [M, 11 waves]. Do the filtering in the probe, not in `SurfMeter.ts` (other spots use it).
  What the player sees is a different number: the drawn tube is the case scaled by the foot crest (1.596 m case foot
  drawn at about 1.1 m), so the drawn trough-to-lip height at the throw is unmeasured. Report it once [P].
- **B, pace.** u 65-175 median **6.5-7.2 m/s** (today x 1.054 +/- 5 %), over at least 20 waves, probe frame 1/30 s on
  this reading. Report u 40-65 apart: it is 8.5-10.4 m/s in every run [M] and is where the rider waits (takeOffS 40).
  The reference's pace is recalled, not measured [U].
- **D, plunge.** Jets per column per wave on u 40-110: **at least 90 %**. Count only onsets within 30 m of the reef line.
- **E, wall.** The wall 10 m ahead grew x 1.08 (1.55 m at 311 m [M]); its slope stays 14° / 11° / 9° at 10 / 20 / 30 m.
  Froude scaling cannot steepen a wall (slopes are scale-free), so ruling 13's lever (a) gives height only. Restate E as
  a height share against bar A's new measure; steepness belongs to `?tubeForm=early` or a new case at higher H/h.
- **New, drift.** The same readings from 480 to 600 s within +/- 10 % of 60 to 180 s.

## 4. Drift and the along-reef current

Oblique breaking on a wrapped window drives an along-shore flow that only bed friction opposes [R; KB 2026-11-01: -0.33 m/s
by 600 s, faces 7 % lower]. Under ref the throw height at u 50-80 rose 15-20 % over 600 s while u 80+ did not [M]:
real, and its cause is not settled (the mean flow, or scattered waves the wrap cannot let out [R]). For a 1-2 min ride it
is small; over a session it is not. Pauses between sets would not clear it (friction time is of order an hour [R]).
The only physical remedy built is the wrap wall (`POOL_STRAIGHT.wrapWallWidth`): it held the flow under 0.15 m/s but ended
the line at u 136 and raised the fastest water to 11 m/s [KB]. Read every bar on the fixed window 60-180 s meanwhile.

## 5. The stills

Both are near 30 s (settle ends at 27 s) and at different instants of the wave: weak evidence. The torn leading end under
ref fits the unscaled along-line lengths and seam bands [R]. Neither shows a wall ahead, which agrees with section 3 E.
Ask for stills at 90 s and 150 s with the line's end at u 100 in both.

## 6. Must not

- Do not shrink the scale factor, raise the feed, or tune the direction by hand to hit the meter.
- Do not change `SurfMeter.ts`, `POOL.alongShore`, or the 10 s join row for today's pool: ref only.
- Do not low-pass the flow, move the throw off its depth, or hand-shape a case to fix the inside break or the stutter.
- Do not judge D from the probe's onsets, or A from the meter, again.
- Do not run 600 s bars until the 60-180 s bars pass.

## 7. Not settled

- The drawn tube's height at the throw (needs the tube library in a headless run).
- Whether the second break line near z -17 is the beach's own break and why ref wakes it (deeper water, larger wave [R]).
- The true stutter at the reef on u 50-110 (about 1.5-1.9 m deep): its share and cause.
- Throw height at 311 m is x 1.2 of today's, not x 1.11: unexplained.
- The pace gap of 4 % at 280 m, and the reference's real pace.
- The drift's cause.

## 8. The owner's calls

1. If the drawn tube at the throw reads well under 2 m with bar A met, is "2 m" the face the meter family reads or the
   tube the player sees? The second needs a larger factor than 1.11.
2. The wrap wall (shorter line, faster water) against a slow drift over a session.
3. Where the rider waits: u 40 on the fast start, or about u 70 where the pace is the surfer's.
4. Fastest water sits at the 1.15 limit at 311 m: accept it at the limit, or ask for margin.
