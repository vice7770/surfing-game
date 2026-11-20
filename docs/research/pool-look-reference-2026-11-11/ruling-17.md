# Ruling 17: the white line, the longer tube, the fold, `?tubeForm=early`, the case (2026-11-12)
Tags: [M] measured (three probe runs on main 981a0a69, ref 311, 300 s, CPU; files in `ruling-17-runs/`; or step4/),
[C] code, [KB], [R] reasoned, [U] recalled, [P] provisional. No game code was changed.

## 1. Main finding
**Bar B does not measure the peel. It trips on a second white patch.** On two waves in three, white already stands
at u 155-180, 8-21 m seaward of the reef line, while the peel is still at u 125-148. The probe then follows the patch
and calls the line ended [M]. The lip plays no part: with the lip thrown to s 194 the count is the same (6 of 21, end
u 134; before 7 of 22, u 134) [M]. The same patch is what stops a longer tube near s 150-160. The fold is a different
thing: the whole tube shape is switched on across about 3.7 m of crest, on clocks that sit on 1 m cells [M].
`?tubeForm=early` is the right cure for the fold, but it cannot make the wall taller or steeper 20-30 m ahead.

## 2. Answers
**Q1. Bar B and the white line.**
- The tracked line is the sea's own breaking (`sim.breaking.strength` over 0.3), not thrown water [C]. Run A proves it [M].
- In each run 11 of the 15 short lines end the same way: at +13.8 to +16.3 s the longest white run jumps from u 126-148 to u 167-192
  (`r17-reach194.txt`, `r17-base-seam.txt`, last line) [M].
- At those moments there is no white on u 130-150, and white on u 155-180 at n +8 (once +15 to +21), a band parallel
  to the reef (`r17-white-dump.txt`) [M]. A peeling crest cannot give 25 m at one n; it meets the reef at 68 degrees [R].
- White stands within 10 m of the reef line in 54-65 % of frames at u 155-175, against 20-38 % at u 65-145 [M].
  The reef top drains to 0.11 m at u 161, and the foot crest is lowest at s 166-180 (0.83 m) [M].
- What the patch is: not settled. First suspect [R]: water running back off the drained reef top meets the next wave
  on the ramp. It may also be the solver's breaking staying on in thin water.
- Why the count fell with builds 1 and 2 [R]: build 1 leaves more water in each crest (ask 794 m3, before 1806), so
  more goes over the reef. Build 2 moved the flat's end to s 194, so the patch now sits inside the bar's stretch.
- **Restate B.** B1: pace on u 72-117, 6.3-7.2 m/s from 18 of 20 waves (now 6.42 m/s, 20 of 22: pass). B2: lips thrown
  per 10 m of u at least 75 % up to the lip reach's end (now 80-100 % to u 110: pass). B3, report only: frames with
  white standing by the reef, no 10 m piece over 40 % (now 65 %: miss). Keep the old count as a report.

**Q2. The longer tube.** Run A threw the lip to s 194.3 (the flat's end). Per 10 m of s [M]:
| s | points that threw | jets per column per period | water share | drawn tube | foot crest |
|---|---|---|---|---|---|
| 40-100 | 94-99 % | 0.83-1.19 | 0.93-1.00 | 2.00-2.14 m | 1.24-1.33 m |
| 100-120 | 96 % | 0.72-0.77 | 0.99 | 1.85-1.90 m | 1.14-1.18 m |
| 120-150 | 80-84 % | 0.56-0.72 | 0.98-1.00 | 1.70-1.84 m | 1.04-1.13 m |
| 150-160 | 76 % | 0.52 | 1.00 | 1.66 m | 1.03 m |
| 160-200 | 40-71 % | 0.05-0.13 | 1.00 | 1.55-1.75 m | 0.94-1.08 m |
- **The tube can run to about s 150 today** (128 m, now 89 m). It tapers from 2.1 m to 1.7 m, and from s 120 on it
  is thrown by about 6 waves in 10 in each column.
- What limits it, in order: (1) the patch: 255 front points left before their throw at s 150-170, and lips fall to
  6-12 % at u 170-190 [M]; (2) the foot crest falls 1.30 to 1.04 m by s 150 (tube = 1.62 x foot crest) [M].
- Not limits: water (share 0.98-1.00), pace (`paceFast` 2.4 %), F (6.66 m/s), the beach break (no lip there; second
  line unchanged at z -11.5), the 311 m wrap (A1 1.96 m, A2 2.13 m, C 1.79 m unchanged) [M].
- The old note at `barrelSpots.ts` ("0.17-0.33 of the waves at s 120-180") is from the solver's own plunge test. On the
  game's path it is 62-76 % at u 120-160 [M]. The note should be corrected with build 2.
- An even 2 m tube past s 120 needs a higher foot crest there. That is a generator or floor question. I do not rule a
  floor change now: trace the patch first (build 3). Sideways spreading alone predicts 0.8 of the height at s 133-194 [R].

**Q3. The fold and the step.**
- The fold [M + C]: the case's share goes 0 to 1 over tau -0.5 to 0 s (`tubeSeam.ts:16`; `sweptLoft.ts:1376`). The clock
  changes 0.135 s per metre of crest (0.081-0.199), so that is 3.7 m. Points 1 m apart differ in share by 0.315
  (median); 71 % of pairs by over 0.2, 33 % by over 0.4. There the case's face is 51-64 degrees and its crest 0.32-0.42 m
  over the sea's; the sea's face is 18 degrees. So each metre of crest is a different mix of two very different shapes:
  pleats. The young end's own blend (`endBlendLength`, `sweptLoft.ts:65`, about 2 m) adds to it.
- The step half way along [M + R]: in the open tube the clock is smooth (0.117 s/m; steps over 0.3 s/m 0.9 %). The
  place is not: the middle of three neighbours stands 0.47 m off their line (median), over 0.5 m in 46 %, over 1 m
  in 9 %. Each column throws from its own 1 m cell and then runs on its own pace (`SweptCrash.ts:499-524`); pace steps
  over 1 m/s are 2.1 % of pairs. Two fronts touching is not the cause (1 pair in 900 frames).
- Proof without a rider: stills and one probe run with `&crestLine=top` (ruling 8's sub-cell crest; it sets each
  point's z, `BreakingFront.ts:467, 521, 536`). The four stills did not have it. Then stills with `&seamTau=-1.64,-0.5`.
- If the step stays with `crestLine=top`: fit each column's throw place and pace along the front with the clock's own
  2 m fit (`CLOCK.smoothing`). This reopens my advice of 2026-10-03 (each column on its own pace). It is a fit of a
  1 m reading, not a low-pass of the flow. Opt-in, after the test [P].

**Q4. `?tubeForm=early`.**
- What exists [M]: points join the front at tau -1.64 s (-1.81 to -1.44), not at -2.1. A thrown front carries
  13.0 m of formed wall ahead of its throw (8.3-16.4). The seam blend hides all of it until -0.5 s.
- The case against the sea under it [M]: at tau -1.75 to -0.75 s the case's crest is 0.17-0.21 m over the sea's and
  its height is 1.03-1.07 of the sea's wave; its face is 24-31 degrees (sea 13-18). At -0.25 to 0 s: 0.42 m, 1.15, 64 degrees.
  **So the two shapes agree best 1-1.6 s before the throw. That is where the hand-over belongs.**
- The build: under `?tubeForm=early` (with `tubeSeam=blend` and `crestLine=top`) the share's course is
  **on = -2.3 sqrt(h0/g), full = -0.7 sqrt(h0/g)** (ref: -1.64 s to -0.5 s), h0 the point's foot depth [P]. Same case
  (`big`), same frames, same clock and rates. Place: `tubeFaceOf` (`faceAnchor.ts`) fills `seam.tau`; parse beside
  `tubeForm=old` (`PhysicalMode.ts:715`). Tonight, with no build: `&crestLine=top&seamTau=-1.64,-0.5`.
- Continuity: the share is a smoothstep in tau, so height and slope are continuous at both ends along the crest; across
  the crest the band rule (`seamY`, `sweptLoft.ts:2075`) already leaves the sea with its own height and slope [C].
  The course is then 8.4 m long, not 3.7 m, and the shapes differ by about a third as much [R].
- Flow: unchanged in this build. The felt water follows the same share (`WallWater.seam`), B stays `seamB`. The case's
  surface now rises through the felt water at about 0.3-0.4 m/s at most (now 1.1 median, 3.9 at 95 %; the sea 0.17 /
  0.42) [R]. The B ramp 0.6 to 0.85 before the throw is the next change, alone.
- Must not change: the throw (place, depth, time), the crash's water and pace, the clock's rates, the case, the look.
- **The join bar** (probe, 60-270 s) [P]: J1 height step between slices 0.5 m apart, from the case's share: 0.05 m at
  90 %, 0.10 m at most. J2 slope change along the crest between such slices: 2 degrees at 90 %, 4 at most, at both ends
  of the course. J3 across the crest at the band's two edges: height step 0.01 m, slope step 2 degrees. J4 where the share
  is 0.05: case crest within 0.25 m of the sea's, height 0.9-1.15 of it. J5 neighbours 1 m apart: share step over 0.2
  in under 5 % of pairs (now 71 %); place off the line over 0.5 m in under 10 % (now 46 %). J6 stills at 90 s and 150 s,
  `curl-front` and one view along the crest with a low sun: no line a reader can point to.
  "Cannot be seen" [P]: 0.05 m is 3 % of the wall and under the 1 m cells' own ripple; 2 degrees is under the sea's
  own scatter between neighbours (E: 5 degrees from median to 90 %).
- Other bars (E's measure): 5 m ahead steepest at least 35 degrees; 10 m ahead 13 to about 15 degrees; 20 and 30 m
  ahead unchanged (10 and 9 degrees); wall height stays 1.5-1.6 m. Rise of the surface through the felt water (probe
  of #245): median 0.4 m/s, 95 % 1.0 m/s. D, F and A1 unchanged. Frame cost: not measured; the slices exist already
  from -1.64 s, so expect little; read `?perfLog=on` on the M1, no gate.
- Fails if: J1 or J5 miss with `crestLine=top`; or the wall 5 m ahead stays under 25 degrees; or the rise bar misses.
- **The owner's test, plainly.** With this method the join can be hidden where three things hold: the crest is seen
  1.5 s or more before it throws; the sea's wave is within about 15 % of a case's height there; the clocks are
  sub-cell. The pool meets the first two [M]; the third is build 1. But the method cannot give a tall, steep wall
  20-30 m ahead: no case stands there, and where it starts it is 20 degrees and 1.05 of the sea's height. The 2 m in
  the tube comes in the last half second (trough down, crest up). On a beach it will show where a crest is first
  seen late (sections, close-outs, crossing peaks): there the shape must grow in time at one place (0.5 s), and that
  is a pop. To remove the two parts fully the sea's own face must steepen: 0.5 m cells in the surf zone (about 4 x
  the cost there) or a face model inside the solver [R]. That is a strategy call, not a build for tonight.
- Carries to a beach: the course in sqrt(h0/g), the band in foot height, the clock by distance to the local throw
  depth. Pool-only: one case, `frontAt` in s, the reach.

**Q5. The case at 2 m.** `big`: tube 2.03 m, water 0.986, least piece 0.925, all bars pass. a38: 2.45 m (bar 2.0 +/- 0.1:
miss), asks 1.03 m3 a jet where the crest gives 0.87-1.06, share 0.902, least piece 0.752 [M]. a38 at 2.0 m would
need a foot crest of 1.02 m, so a 1.7 m reef wave, or a case scaled apart from its wave (must not, ruling 13) [R].
On a longer tube a38 asks 1.75 x the water where the crest is lower. Third choice: a new Basilisk run on the pool's
own ramp with a rounder void; days, not tonight. **I recommend `big`; a38 stays the opt-in.** The owner decides.

## 3. Builds in order (one at a time; ref only; default byte-identical)
| # | Build | Numbers and places | Bars |
|---|---|---|---|
| 0 | No code: stills + one probe run | `&crestLine=top`, then `&crestLine=top&seamTau=-1.64,-0.5`; probe `r17-probe2.ts` with the same switches in its `extra` string (line 77 of step4's probe) | J5; the fold and the step by eye |
| 1 | `?tubeForm=early` | section Q4; `faceAnchor.ts` (`tubeFaceOf`), `PhysicalMode.ts:715` | J1-J6, E, rise, D, F |
| 2 | `?poolReach=long` | `POOL_REF_FRONT_REACH.to` 111 to **150** as the ref spot's second `frontAt` (`barrelSpots.ts:298-368`); switch beside `poolReef` | s 111-150: each 10 m piece threw 80 %, jets per column per period 0.5, share 0.95 whole and 0.90 least, tube 1.70 m; A1, F, `paceFast` 5 %, no lip past 30 m |
| 3 | Probe only: trace the patch | at u 165, n -5 to +25: water depth, speed across the reef line and its Froude number, breaking strength, each step for 4 periods | names the patch; then the foot-crest question |
| 4 | Only if the step stays after 0 | throw place and pace fitted along the front (2 m) | J5's place bar |
Build 2 stop: if any piece in the reach reads share under 0.90 or under 0.5 jets, pull `to` back to that piece's start.

## 4. Must not
- All standing must-nots hold (`SOURCE_SHARE`, scale, feed, direction, `SurfMeter.ts`, `POOL.alongShore`, lip defaults,
  no low-pass of the flow, the throw at the throw depth, one change at a time, no 600 s run yet, no library-less runs).
- Do not stretch the case in time or along the crest to fill 20-30 m. Do not scale its height apart from its length.
- Do not move `to` past 150 before build 3. Do not hide the patch by raising the probe's white threshold.
- Ruling 16's "do not move the reach past 111 by hand" is lifted for build 2 only: it is measured now and opt-in.

## 5. Not settled
- What the white patch at u 155-180 is, and whether a player sees it as white water. Why the foot crest falls along
  the reef and dips at s 166-180. Whether these two are one cause.
- Whether `crestLine=top` removes the 0.5 m place steps (not run: my three runs were used).
- The join bar's numbers are reasoned, not from a visibility test. The rider's pop-up with the early course is untested.
- My probe's "move per frame" line and the "nEnd" in the wave list are wrong measures; ignore them.

## 6. The owner's calls
1. **A tube that tapers.** To s 150 the tube shrinks from 2.1 m to 1.7 m and some waves leave gaps. Take that as the
   longer tube for now? I recommend yes, as an opt-in, while the patch is traced.
2. **The wall ahead.** `tubeForm=early` smooths the last 8 m before the lip. It will not give a 2 m wall 20-30 m ahead.
   For that the sea itself must change (finer cells or a face model). Do you want that studied as the next strategy step?
3. **The case.** `big` (2.03 m, passes) or a38 (2.45 m, short of water)? I recommend `big`.
