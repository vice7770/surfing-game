# Advisor ruling 18: after `?tubeForm=early` (step 5, main 67d2b2f2)

Tags: [M] measured by me this session, [M5] measured in step 5's README, [C] read in code, [R] reasoned, [P] provisional.
Runs (probe only, no game code changed; scratch copies `r18-probe.ts`, `r18-probe2.ts`, made by `r18-patch.py`):
- `r18-form-early.txt`: regular feed, 300 s, `&wallBody=stream&tubeForm=early`.
- `r18-regular-150.txt`: same, 150 s, with the shift and fold readings.
- `r18-t3-feed2.txt`: the same build on a two-train sea, 300 s (plan test T3).
- `r18-crop-early-front.jpg`, `r18-crop-base-front.jpg`: crops of step 5's stills.

## Short answers

1. The ribs are not the clock. The clock along the crest is smooth. The ribs are creases in the case's surface at slice lines. Two causes, in order: the kept anchor shift is rough from point to point, and the profile's lip mark slides along the face before the throw.
2. The rise is the case's own growth. It is not the solver's breaking model. Carry it (ruling 7). My "wall 1.5-1.6 m" bar was wrong in kind; replace it.
3. The dark crease at the mouth is a fold of the mesh where a slice just before the throw meets one just after. Measured. Same fix family as the ribs' second cause.
4. T3 ran. Result: 0.0 % of thrown points were first seen later than 1 s before the throw, on both seas. T3 passes for this feed.
5. The ranking does not change. The join in time works. The join in shape has three named faults, all in the drawing, none in the method.

## 1. The ribs

What I measured (regular sea; the two-train sea gives the same within 10 %):
- Slice clock, middle of three off the line: 0.002 s at 90 % for slices 0.5 m apart, 0.010-0.016 s at 1 m, 0.05 s at 2 m [M]. That is smooth.
- So J5's "share step over 0.2 in 28.6 % of pairs" is not roughness. It is the ramp itself: clock slope 0.154 s/m over a 1.13 s course gives 0.14 per metre [M, C]. That bar was mine (ruling 17) and it was badly defined. Drop it.
- The sea alone off the line: 0.005 m median, 0.012 m at 90 % at 1 m [M]. Smooth.
- The kept anchor shift off the line, share whole, before the throw: 0.016 / 0.048 / 0.111 m (median / 90 % / 99 %) at 1 m; 0.041 / 0.121 / 0.260 m at 2 m; 0.000 / 0.010 / 0.029 m at 0.5 m [M]. Small at 0.5 m and large at 1-2 m means: straight lines between records, kinks at the records (records are about 1.25 m apart along the crest) [R].
- On a 64 deg face a 0.05 m kink in place is a 0.10 m kink in height, an 11 deg crease across 1 m [R]. The drawn height off the line at the face (2.5-3 m ahead of the front point) is 0.10-0.11 m at 90 % at 1 m [M]. It matches.
- The angle between the drawn quads on a slice's two sides, largest per profile segment (median / 90 %) [M]:
  - clock -1.7 to -1.0 s: upper face 7 / 16 deg, lower face 3 / 10 deg.
  - -1.0 to -0.5 s: 18 / 54 and 8 / 36 deg.
  - -0.5 to -0.15 s: 44 / 74 and 38 / 74 deg. Over 45 deg on 47 % and 41 % of slices.
  - open tube, +0.15 to +0.9 s: 5-6 / 8-10 deg. The back and the front are 2-9 deg at all clocks.
  - A surface that is smooth along the crest would give about 3-5 deg here [R].

Why [C + R]:
- `crashCurve.ts:prepareAnchors` smooths the raw places along the crest (`smoothPlaces`), and only then `continueAnchor` (`faceAnchor.ts:311`) caps, holds and eases each point on its own history. Points hop 1 m cells at different times. The per-point step puts roughness back after the smoothing.
- `sweptLoft.ts:recordLerp` (:1728) then joins the records with straight lines. Shift, clock and foot height all get a corner at each record.
- Before the throw the profile's lip mark is not a material point: it slides along the steep face (`sweptLoft.ts:210`, `:1196`). Two slices 0.08 s apart in clock put the same vertex index at different places on the bend. Quads joined index to index then pleat. The pleat angle is about (slide) / (bend radius), so a few centimetres on a 0.1 m bend give tens of degrees [R]. This is why the creases grow toward the throw and vanish once the lip is a real jet.
- I cannot split the two causes without the build. Build 1 will show it: if the fold angles stay, the rest is the lip mark.

Build 1, switch `?anchorLine=smooth` (opt-in, default off):
- In `crashCurve.ts:prepareAnchors`, after the per-point loop, smooth the kept places once more along the crest with the same `smoothPlaces` kernel. Write the result to a new field (for example `FrontPoint.anchorDrawn` and the records' `anchor`). Do not write it back to `anchorShift`: the cap must keep working on its own state, or the smoothing feeds back and the shift drifts.
- Everything that draws or collides reads the new field: the loft (`sweptLoft.ts:recordShifts`), the contact, the crash's slices, the wall's water, and the online record. One water.
- In `sweptLoft.ts`, with the switch on, join records with a C1 curve (Catmull-Rom on shift, clock and foot height; clamp the clock so it stays monotone between two records) instead of `recordLerp`'s straight line.
- Physics name: the crest of one wave is one continuous line; the 1 m cell hops are the grid's, not the wave's.

Bars for build 1 (probe `r18-probe2`, 60-270 s, regular feed):
- R1: kept shift off the line, share whole, before the throw: at most 0.010 m at 90 % and 0.03 m at 99 % at 1 m (now 0.048 / 0.111); at most 0.03 m at 90 % at 2 m (now 0.121).
- R2: fold angle at clock -0.5 to -0.15 s, upper and lower face: report. Target after builds 1 and 2: median at most 10 deg, 90 % at most 20 deg, none over 90 deg.
- R3 replaces J5a. J5b (off the line over 0.5 m) stays.
- Must not change: D number for number (jets, asked, thrown, starved); the throw's place and time (the shift moves only the drawn and collided case, not the front's clock: every throw within 0.01 m and the same step); F; J3; J4 within 0.02 m.
- Must not add a step in time: the drawn crest's largest move in one step, in the wave's frame, no larger than today's.

Build 2, switch `?loftMesh=arc` (after build 1 is measured):
- Before the throw, space the profile's vertices by arc length between marks that exist at every clock (back foot, crest, toe, front foot). Let the lip and throat marks enter only once the lip is a material jet, with a segment that opens from zero length at the crest side.
- This changes vertex places on the same curve only. The curve, the contact and the collision must be the same to 0.005 m.
- Bar: R2 as above, and J2 "where the share ends" 90 % under 10 deg (now 85 [M5]).

## 2. The rise and the 1.87 m wall

By the clock, regular sea, medians [M]:

| clock s | case crest | case height | sea crest | sea height | sea steepest | breaking on |
|---|---|---|---|---|---|---|
| -1.25 to -0.75 | 1.45 | 1.88 | 1.29 | 1.79 | 18 deg | 3 % |
| -0.75 to -0.5 | 1.47 | 1.89 | 1.30 | 1.79 | 19 deg | 5 % |
| -0.5 to -0.25 | 1.59 | 1.99 | 1.28 | 1.78 | 20 deg | 7 % |
| -0.25 to 0 | 1.64 | 2.04 | 1.24 | 1.77 | 21 deg | 14 % |
| 0 to +0.3 | 1.65 | 2.07 | 1.12 | 1.70 | 21 deg | 25 % |

(metres; crest over rest; "breaking on" = share of points with the breaking strength over 0.3.)

- The case grows 0.15 m in height and 0.17 m at the crest in the last 0.5 s, and its face goes from about 41 to 63 deg and then vertical [M]. The sea stays put. So the rise is the case's own growth.
- The breaking model is not flattening the sea before the throw: it is on at 3-14 % of points [M]. After the throw it is (crest -0.12 m).
- There is a standing gap through the whole course: case crest +0.16 m, height x1.05-1.06 [M]. The 1 m weakly nonlinear sea does not peak the crest as the Basilisk case does [R]. It is inside J4's bar (0.20 m against 0.25; 0.23 m on the two-train sea).
- At 5 m ahead the share is 0.97 and the clock -0.61 s [M5]. The case there is truly 1.89 m [M]. The 1.87 m wall is the case, drawn right. My bar "1.5-1.6 m" asked the pre-made wall to be lower than its own case. A 1.9 m wall beside a 2.0 m tube is also what the owner's reference shows.

Faithful fix: carry the rise (ruling 7). Where the share is whole, the felt water's vertical speed at the surface is the case's surface speed; between, by the share. Then the surface no longer moves through the felt water. Do it after build 1, because ribs give the carried speed 1 m steps along the crest.
New bars:
- W1 replaces "wall 1.5-1.6 m": drawn wall height 5 m ahead within 0.05 m of the case's own height at that clock.
- W2 replaces "rise 0.4 / 1.0 m/s": the slip of the surface through the felt water, median under 0.4 m/s, 95 % under 1.0 m/s. The rise itself (0.68 / 2.59 m/s) is only reported.
Cheats, do not do: raise the feed or `SOURCE_SHARE`; scale the case's height apart from its length; slow the case's clock near the throw; low-pass the flow or the height in time; add a hidden lift to the sea; shorten the course to hide the gap.

## 3. The dark crease at the mouth

- Seen: a thin dark blue sliver from crest to trough exactly where the white lip starts (crops). It is the surface's other side.
- Measured: at clock -0.15 to +0.15 s the quads on a slice's two sides differ by 29 deg median, 89 deg at 90 %, and by more than 90 deg on 9.8 % of slices (upper face); 4.4 % on the lower face [M]. Over 90 deg is a quad turned to show its back. From +0.15 s on it is 0.0 %.
- Step 5's J2 at the share's end (median 30, 90 % 85 deg) is the same thing [M5].
- Cause [C + R]: the lip-throat segment has zero length before the throw and opens at the throw. Slices on its two sides carry their vertices at different places along the profile; quads joined by index fold. With `tubeLook=merge` the back side is drawn dark.
- Fix: build 2. If a sliver stays after build 2, add slices by clock step (no two neighbours more than 0.04 s apart between -0.2 and +0.2 s). No probe is needed first; the fold reading in `r18-probe2` is the probe.
- Not a fix: drawing both sides the same colour. It hides the fold and the rider still hits it.

## 4. Plan test T3

- No game code was needed. The probe swaps the boundary's sea for two trains that both fit the 311 m window: the main (T 10.5 s, -36.8 deg, a 0.704 m) and a second (T 9 s, -14.6 deg, a 0.211 m). Same energy as the regular feed [C, M].
- The sea is truly uneven: onset faces 1.45-2.64 m (regular: 1.81-2.50), sea height 1.34-2.32 m at 10-90 % [M].
- Result [M]: 1296 points reached the throw, 1264 threw. First seen at -1.76 s (10-90 %: -1.94 to -1.48). Later than -1 s: 0.0 %. Later than -0.5 s: 0.0 %. Every 20 m of the reef: 0 %. Regular feed: -1.77 s, 0.0 %.
- D holds on this sea: 97.7 % jets, thrown/asked 1.000, 0 missed [M]. Join bars are the same as on the regular sea.
- Limits [P]: two trains 22 deg apart, not a full spectrum; one reef with a fixed break depth. On an open beach with shifting peaks the first sight can come later. For that test a game switch is needed: `?poolFeed=<r,T,n>[;...]` in `pool.ts:poolSea` / `SurfZoneSimulation.ts:surfZoneSea`, adding wrapped trains (k sin(theta) = 2 pi n / W, n whole), energy kept. Or run T3 on Canyon B, which needs no switch.
- 10 % of points are first seen after -1.48 s, which is inside the early course (it starts at -1.62 s). Their share starts at about 0.04, not 0 [R]. Small; watch it on a beach.

## 5. Does the ranking change? For the owner

No. B, then C2, stays first; D1 and D4 stay behind; A stays the fallback.
Plainly: yes, the two parts can be hidden on the pool with this method, but they are not hidden yet. What step 5 proved: the wave tells us 1.7 s ahead where it will throw, on a regular and on an uneven sea, so the drawn wave can be brought in early everywhere, with no pop. What still shows the join: (1) ribs on the pre-made wall, (2) a dark fold where the lip starts, (3) the surface rising through the water the rider feels. All three are faults of how the shape is drawn and carried, each with a named cause and a bar; none says the sea and the drawn wave disagree about where or when. It takes builds 1 to 3 below, then the owner's ride. One honest limit stays: the drawn wave is about 0.2 m taller at the crest than the sea under it. It comes in over 1.1 s and 7 m of crest, so it should read as the wave standing up. If it still reads as two parts after builds 1-3, that is the case for C2 (the drawn wave's zone also owns the felt water), not for a new method.

## Build order

One change at a time. Each opt-in; the default stays byte-identical; Canyon hash check before each merge. All bars on 60-270 s, regular feed, `?poolSize=ref&tubeForm=early&wallBody=stream`, then the same on the two-train feed (probe flag `--feed2 0.3,9,1`).

1. `?anchorLine=smooth` (section 1). Bars R1, R2 reported, J5b. Must not: D, throws' place (0.01 m) and step, F, J3, J4 (0.02 m), no new step in time. Take new stills at 150 s, front and along.
2. `?loftMesh=arc` (sections 1 and 3). Bars R2, J2 end 90 % under 10 deg, no quad over 90 deg at the mouth. Must not: the curve, contact and collision (0.005 m); D; F.
3. Carry the rise (ruling 7), on top of 1 and 2. Bars W1, W2. Must not: D, F, the fastest water at the reef (6.66 m/s now), no low-pass.
4. Then the owner rides it. Colour, pile and lip look come after.
5. Only if the 0.2 m gap still shows: C2 on the pool. Not D1.

Standing must-nots hold: no hidden motors; do not raise `SOURCE_SHARE`, the feed or the scale; no changes to `SurfMeter.ts`, `POOL.alongShore`, `throwLip` / `newBreaker` defaults; the throw stays at the throw depth; no 600 s bars before these pass; no library-less runs.

Correction to ruling 17: bar J5a (share step) and the bar "wall 5 m ahead 1.5-1.6 m" were wrongly defined by me. Replace them with R1 and W1.
