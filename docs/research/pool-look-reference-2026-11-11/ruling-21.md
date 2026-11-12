# Advisor ruling 21: the bright line at the foot of the pre-made wall

Water-physics advisor, 2026-11-12. Docs only. No run made, no game code.
Tags: [M8] measured in `step8/README.md` and `step8/arc-foot.txt`, [M] read by me from the committed library file, [C] read in code, [S] sourced, [R] reasoned, [P] provisional.

## Short answers

1. **No longer blend on the face.** There is no room for one: the case stands only about 0.5 m over the sea there. The long, gentle join belongs ahead of the toe, on the flat trough. Its lengths are in wave heights.
2. **Yes: the join stands lower. Not by lifting or moving the case. By drawing the case's own lower face, under the sea's.** The case's dug trough is the truer water. The sea's fuller face is the solver's smear.
3. **Yes.** Points on one place share one normal until the lip opens. Render only, a second small switch.
4. **The wander goes with this fix.** It is the corner's own. No separate work.
5. **The corner itself must go.** The Classic look's soft edge is not the target. The fix is in the shape. No shading change is honest here, except answer 3.
6. **This fix first.** Then the second library, then the lip's normal, then `?wallRise=carry`.
7. See "For the owner" below.

**This reopens a settled call.** On 2026-11-03 I ruled "the support is never below the solver's surface" (`docs/research/pool-tube-face-2026-11-03/advisor-ruling.md`), and the owner took it. This ruling asks to lift that rule on the front of the wave, behind a switch. Making it the default is the owner's call.

Two corrections of my own:
- Ruling 19 guessed the line sat at the case's toe. Wrong. It is at mid-face [M8].
- The 11-03 ruling measured the case's lower face within 0.03 m of the sea's (the 1.5 m pool, one section). On the ref pool with `big` it is 0.3 to 0.4 m under, 1.14 m most [M8]. That agreement does not hold here.

## Why the line is there

- The seam draws `sea + α·δ`, with δ the case over the sea, and nothing where δ is under 0 (`sweptLoft.ts:2205`, `seamY`; the floor rule `:1560`) [C].
- The case crosses the sea at 0.4 to 0.5 of the wall's height [M8]. That is where the face anchor puts it: it lays the case's face on the sea's face at the anchor's level [C].
- Above the crossing the case stands only about 0.45 m of steep wall [M8]. Below it the drawn face is the sea's 17 to 19° face. So the "2 m wall" before the throw is a 0.45 m strip on a gentle slope, with a 31 to 33° corner under it [M8].
- Which is right? The case. An eddy-viscosity solver smears a steep front into a slope centred on the true front [R, the 11-03 ruling; the same as a viscous shock]. That predicts both things the probes found: the sea's crest 0.2 m low behind the front, and the sea 0.3 to 0.4 m high ahead of it. The case is the Navier-Stokes answer on this bed [S: our Basilisk runs].
- The case's own trough stands at the sea's trough level: its toe is 0.19 to 0.26 m over it [M8], and the profile falls 0.18 m more past the toe mark and is flat from about 2.6 m past it [M, `big`, 0.11 of the crest-to-toe height]. The two waves are the same height. The case reaches the trough in about 3 m. The sea takes 12 to 14.5 m [M8].

## 1 and 2. The fix: `?wallFoot=dug`

**What it does.** On the front of the wave the drawn surface is the case's, also where the case lies under the sea. The return to the sea is made ahead of the toe, on the flat trough, where the slopes differ by a few degrees.

Why not the other ways:
- **A longer blend on the face:** the case is at most 0.5 to 0.6 m over the sea there [M8, R]. A blend longer than today's eats the wall. The wall is already too short.
- **Lift the case:** by 0.35 to 0.5 m. Then the crest stands 0.55 to 0.7 m over the sea's. Worse, and against ruling 17.
- **Move the case shoreward** until its foot is on the sea: about 3 m [R]. It moves the anchor, so the throw leaves the throw depth. A must-not.
- **Shading:** the rider would still hit the corner.

**The lengths, in wave heights** (H = the slice's case height, crest over toe; 1.6 to 1.7 m on the ref pool):

| Length | Today (`REST`, `sweptLoft.ts:51`) | Under the switch | Ref pool |
|---|---|---|---|
| Hold the trough until the sea is within | 0.1 H | 0.05 H | 0.085 m |
| Then ease onto the sea over | 0.5 H | 2 H | 3.4 m |
| Give up and ease at | 3 H past the toe | 5 H | 8.5 m |

- Rule behind them [R]: easing an offset Δ over a length L adds a slope of 1.5 Δ / L. For 0.05 H over 2 H that is 2°. Today's 0.1 H over 0.5 H would add 17°: a new corner.
- All [P]. They scale with H, so a 4 m wave eases over 8 m and gives up at 20 m.
- The extension ahead of the profile must reach 5 H (today 1.5 m, `LOFT.extension`). Samples no wider than 0.5 m.

**Build spec.** One switch, `?wallFoot=dug`, acting only with `tubeSeam=blend` (so with `tubeForm=early`). Default off.

1. **Step 0, probe only.** In step 8's probe print, per clock bin: the sea less the raw case at 0, 1, 2, 3, 5, 7, 10 m past the toe mark; the raw case's own largest turn between crest and toe (0.4 m each side); the raw case's steep height (the stretch steeper than 35°). These set the bars' targets below. No build.
2. **The seam** (`src/wave/barrel/sweptLoft.ts`, `seamY`, and both callers `:1568` and `:2232`): a vertex of profile index over `LANDMARK.crest` (the face, the trough, the forward extension) takes α = α_τ alone, with δ signed. That is what the lip's vertices already do. Vertices at and behind the crest keep today's rule.
   - If the crest then shows a step between index 32 and 33 before the throw, ramp α_h from today's value to 1 over the first quarter of the crest-to-lip arc. Say so.
3. **The forward rest** (`REST`, the `i > LANDMARK.toe` branch `:1486` and the extension branch `:1506`): the three lengths above, under the switch only.
4. **The contact and the water** (`SweptContact`, `TubeFace.contact`, `WallWater.seam`): where the loft's front lies under the solver's surface and α is over 0, a body's water surface is the loft's. Immersion, the normal and the flow weight α are read from it. There is no solver water above it. This is the part that needs care: a body that still reads the solver's height there would float 0.4 m over the drawn face.
5. **The sea's mesh** is already cut out under the loft's mask [C, `barrelMaskGlsl`]. Check that no sea shows over the dug stretch.
6. **Not touched:** the face anchor, the clocks, the share's course, the crash, the solver, the back slope, the library.

**Bars** (step 8's probe, the same run and address plus `&wallFoot=dug`; base = `step8/arc-foot.txt`). Each cell: median / 90 %.

| Bar | What | Today [M8] | Pass |
|---|---|---|---|
| K1, hard | The drawn turn at the old corner's place, less the raw case's own turn there, by clock: −0.9 to −0.5, −0.5 to −0.2, −0.2 to 0, 0 to 0.3 s | 12.4 / 28; 24.5 / 31; 19.2 / 29; 11.5 / 21 ° (about) | 3 / 8 ° in every bin |
| K2, hard | The same by distance ahead of the leading thrown slice: 0 to 2.5, 2.5 to 7.5, 7.5 to 15 m | 33.2 / 41.4; 15.4 / 33.0; 2.8 / 11.7 ° (whole corner) | 3 / 8 ° over the raw case's own |
| K3, hard | Largest turn of the drawn surface from the toe mark to the mesh's end | 1 to 2 ° | 6 / 10 ° |
| K4, hard | Drawn less the raw case, crest to toe, share 1 | to 0.4 m | 0.01 / 0.03 m |
| K5, hard | At the mesh's seaward end: drawn less the sea; normal against the sea's | 0.000 m; 0.3 ° | 0.000 m; 1 ° |
| K6, hard | Contact's surface less the drawn, on the dug stretch | not read | 0.005 m at most |
| K7, hard | Drawn surface over the bed | — | never under 0.3 m |
| K8, report | The drawn wall's steep height (over 35°), −0.5 to 0 s | about 0.45 m | step 0's raw value ± 0.05 m (I expect near 1 m [R]) |
| K9, report | The whole corner by clock (step 8's table again); share over 20° | 0.9 | the raw case's own (14 to 18° near the throw) |
| K10, report | The toe mark's line: off its neighbours at 1 m, from −0.5 s | 0.06 / 0.13 m | not worse |
| K11, report | The deepest dig: drawn less the sea | 0 | expect −0.3 to −0.5 m median |

**Must-nots.**
- The throws' list byte-equal to the base (`step6/arc.txt`). The anchor and the crash are not touched, so any change is a bug. Find the reader. Do not accept a new list here.
- Lines A to F, J3, J4, the crest's largest step (0.355 m): unchanged.
- Felt water not worse: the surface's rise through the felt water (step 5's measure) no more than the base + 10 %; F no more than the base + 0.1 m/s.
- The default byte-identical. Online rooms on the default. Canyon hash check and fps trace.
- No low-pass of the flow. No change to the anchor, the clock or the case's size. One change at a time: the lip's normal is a later build.

**Stop rule.** One build, one 300 s run. If K6 cannot pass (the contact cannot follow the dug face), stop and hand back: do not merge a drawn-only dig. That would be two waters. If K3 misses, one more run with the ease at 3 H. Nothing else is tuned. If K1 or K2 miss after that, stop.

**Stills.** The six of step 8, same frames (90 s, 150 s): `base-front`, `view-front`, `classic-front`, `base-along`, `view-along`, side by side with step 8's. Add one from the channel side, low, looking into the foot. What to look for: the lower white line gone in Rich; one dark face from the crest to the trough; no trench line 5 to 8 m ahead of the wall; no sea showing over the foot.

**What could go wrong.**
- The rider meets a taller, steeper face (50° over about 1 m, not 0.45 m). More sudden falls are possible. Only the owner's ride tells.
- A trench look ahead of the wall. The forward rest was made because a short ramp "dug a trench that hid the tube" [C, `sweptLoft.ts:44`]. That is why the ease is 2 H and K3 is hard.
- After the throw the tube's floor is the case's, lower than today. The tube reads bigger at its foot. Truer, but new.
- Foam, spray and other riders' wakes ahead of the wall are placed on the solver's sea. Over the dug stretch they could float. Report if seen.

## 3. The lip's points on one place: `?lipEdge=one`

- Before the throw 25 points lie on one point. Triangles of no area have no normal. The 56 to 67° spread [M8] is an accident of the mesh, not water.
- Rule: where two neighbour vertices along a slice are under 0.02 m apart, they take one normal: the mean of the nearest vertex each side that is not on the point. Blend back to each vertex's own normal as the gap opens from 0.02 to 0.10 m.
- Where: the loft's normals (`sweptLoft.ts`, the normals routine near `:2275`). The drawn normal only. Positions, the contact and the flow are not touched.
- Bars: the spread among points on one place 2° at most (today 56.6 to 66.9° median). Report the turn from the crest mark to the lip mark: it should fall toward the raw case's own shoulder, 16 to 29° [M8]. That shoulder is real and stays.
- The throws' list byte-equal. A later, separate build.

## 4. The wander

- The corner sits where the case dives under the sea. That place moves with the share, and with every bump of the sea. So it wanders: 0.4 m off its neighbours at 1 m, 0.8 m at 2 m [M8].
- With the dig there is no crossing on the face. The join moves to the flat trough, where a wander of 0.4 m changes the height by under 0.02 m [R].
- What is left is the toe mark's own line (0.37 m off at −0.9 to −0.5 s, 0.06 m later [M8]). That one is the frames' and the clock's: ruling 20's second library. K10 watches it.

## 5. The look

- Classic's soft edge is the same corner with less contrast. The rider still crosses a 30° bend. Not a target.
- The Rich look is right to show a line there. A 30° turn inside 0.4 m does go from dark body to bright sky. Do not dim it.
- Sun or sky: it does not matter for this fix. Leave it.

## 6. The order

1. `?wallFoot=dug`: step 0 (probe), then the build. It is what the eye sees. It does not depend on the library: the rule reads whatever curve is stored. The throws' list stays.
2. The second library and the anchor on it (ruling 20, `claude/pool-frame-join`). New base list. Run K1 to K5 again after it: the lower face may move by up to 0.3 m at the stand-in frames.
3. `?lipEdge=one` (render only).
4. `?wallRise=carry` (ruling 19's spec, G along the normal). Its formula is already signed, so it carries the dig's sinking too.
5. The owner rides.
6. Remove `anchorLine=smooth`. C2 on the pool (the owner's call).

Why the dig before the library: it changes more of what is seen, it leaves the list alone, and a miss in it is cheap to read. Why before the carry: the carry must know the surface the rider is on.

## 7. For the owner

After the dig, the second library and the carried rise, what of "the two parts" still shows on the pool:
- **The wall only reaches about 15 m ahead of the breaking point.** Further along, the wave is the sea's gentle 17° face. The steep wall grows in over about one second. You see it rise.
- **The crest of the wall stands about 0.2 m over the sea's crest behind it.** A low step on the back, seen from behind or above.
- **The dug trough ends 5 to 8 m ahead of the wall.** Past that the water is the sea's, a little fuller. It should read as a gentle swell, not a line. If a line shows there, that is the new join.
- **Foam and spray ahead of the wall sit on the sea's level.**

What should be gone: the bright line under the wall, the streak down the face, the hard top edge before the throw, the short 0.45 m wall.

On a large beach the same things show, larger:
- The wall still reaches only about 1 to 1.6 s ahead of the break. On a 4 m wave peeling at 10 m/s that is 10 to 16 m of wall. A tall wall 20 to 30 m ahead is not possible this way.
- The crest step and the dig scale with the height: about 0.5 m and 0.8 m on a 4 m wave.
- On a long beach many crests break at once, each with its own short piece of wall.

Only the sea's own face becoming steep removes these. That is route C2 in the strategy plan.

## Owner's calls

- Lifting "never below the solver's surface" on the wave's front, as the default (after riding it).
- Whether a taller, steeper face that makes more falls is wanted now, or after the rider work.
