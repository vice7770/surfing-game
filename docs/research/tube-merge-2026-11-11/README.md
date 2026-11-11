# Ruling 10: how the Barrel's tube and the rest of the wave merge (2026-11-11)

Advice only. No game code was changed. Checkout read: `snap-arms-gate/wt` at 5f32b2a1.
Every number is marked **measured** (by me, file named), **sourced** (link) or **reasoned**.
Stills: `stills/` here (the six close-ups as JPEG, for looking only: the bars need fresh PNG stills; the phase and region views were not kept).
Tools: `tools/px.py`, `dark.py`, `count.py`, `stripes.py`.

## Short answer

The join the owner sees is mostly not a colour join and not a mask join.
Where the case and the sea meet, their body colour already agrees (measured, below).
The tube reads as a separate object for five reasons, in order of weight:

1. **Navy outline lines.** The shader falls back to the deep-water colour wherever the shading normal faces away from the eye. That draws a dark line along every silhouette, lip tip and dither edge.
2. **A white lip.** The lip's back light treats both ends of the tube as open sky, so the lip glows grey-white from the mouth side.
3. **Stripes on the wall.** The ripple normal is laid on in world x-z, so it is squeezed into bands on a steep wall.
4. **Hard ends.** The lip appears at full size within about 0.3 m of crest, and the roof stops at touchdown with nothing drawn after it.
5. **Different surface detail.** The sea has plume, lace, streaks and flow ripples. The case has none of them.

Items 1 to 3 are shader fixes with no frame cost. Build them first, behind `?tubeLook=merge`.

## 1. What a real pool barrel's joins look like

**The lip grows out of the face along the crest.** Sourced: Feddersen et al. 2023, Surf Ranch lidar
(https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf, read as text: `merge-look/pdf/fed23.txt`).
Bins are 0.9 m of crest apart. The face is not yet vertical at -1.7 m, vertical at -2.6 m, a jet has formed at -3.5 m,
the jet is falling at -4.4 m, and it nearly touches down at -5.3 m, having fallen about 1.5 m. Along-crest speed 3.19 m/s; H about 2 to 2.25 m.
- So vertical face to touchdown is 2.7 m of crest, or 0.85 s. Sourced numbers, my arithmetic.
- The lip goes from nothing to a formed jet over the first 0.9 m, or 0.28 s: one third of the throw.
- Ours: touchdown at 0.70 s (measured in ruling 9), so one third is about 0.23 s. Our peel runs along the crest at about 9 m/s
  (reasoned: c 4.9 m/s over tan 28 degrees). So the lip should grow from nothing over about **2 m of crest, 1.3 H**. Reasoned from the sourced timing.
- The game shows it at full size within about 0.3 m (measured in pixels, scale reasoned; see join 3).

**The open length is right.** KB formula 2.6 H / tan(alpha) gives 7.8 m at H 1.6 m and 28 degrees (`docs/research/water-physics/along-the-crest.md`).
The open zone in the front phase still spans x 447 to 916 px, about 8 to 9 m (measured pixels, scale reasoned). Do not change it.

**The roof ends into a collapsing tube, not a cut.** Sourced through the KB (O'Dea et al. 2021; not re-opened this session):
after touchdown the air ring lasts about 0.5 s, stretches to length over width near 5, and fills with splash-up.
At 9 m/s along the crest that is about 4.5 m of crest where a real wave shows a shrinking, whitening tube (reasoned from the sourced 0.5 s).
The game draws none: red (post-touchdown) pixels are 0 in all four phase stills (measured, `count.py` on `adv-phase/*.png`).

**The back of a plunging wave.** Not sourced this session beyond one line: Feddersen 2023 reports spray shed off the back of the wave in offshore wind.
Reasoned: the back is the same unbroken water as the sea behind it, smooth and convex, with no line where the steep part starts.
Anything that marks the back as a second surface (a ridge, a line, a different texture) is wrong.

**Why wall and face are one colour gradient.** Reasoned from the optics the game already uses (`src/scene/waterOptics.ts`):
one water body, so colour changes only with the view angle (less sky reflection where you look straight at the wall)
and with the light path through the water. Both change smoothly along a real face. A step in colour means a step in normal or in formula, never in water.
Pool photographs (Wavegarden, URBNSURF, Surf Ranch) were not opened this session; nothing here rests on them.

## 2. What the stills measure

All from `merge-look/ride/`, with `px.py` (5x5 mean) unless noted.

| What | Where | Value (R,G,B) | Reading |
|---|---|---|---|
| Shoulder face | curl-close (300,360) | (43,157,216) | |
| Tube wall | curl-close (500,395) | (52,153,199) | within 17 of the face: same body colour |
| Wall down to trough | curl-close x=500, y 370 to 450 | (38,142,187) to (150,225,250) | smooth, no step |
| Across the lip's shoulder end | curl-close row y=330, x near 422 | (28,140,196) to (155,208,240) in about 12 px | hard edge |
| Lip roll | curl-close (500,335) | (200,216,224) | grey-white, B-R = 24 |
| Case back vs sea behind | curl-behind (700,360) vs (700,400) | (143,217,243) vs (157,227,252) | within 14: not a colour join |
| Darkest pixels | curl-behind crest line | (10,44,117) | navy |
| Darkest pixels | curl-close lip tip (716,331) | (17,44,111) | navy |
| Navy pixels (R<60 and G<90) | behind / inside / close / front | 34 / 56 / 157 / 159 | `dark.py` |
| Wall stripe contrast | curl-inside columns x=900,1000,1100, y 150 to 420 | rms luma residual 7.7 / 6.9 / 4.0 | `stripes.py`; flat sea column gives 0.6 |

The phase view shows the whole steep face, shoulder included, is the case surface. The dither band between case and sea is metres wide.
It is invisible in the normal render wherever both sides shade alike. It shows only where one side has gone navy.

## 3. The seven joins: cause and fix

Ranked by visual payoff against cost and risk. **R** = render only. **S** = changes the collided shape.
No fix here touches the rider's water or forces.

### Rank 1. Navy lines: joins 4 (dark seam from behind), 5 (hard edge against the sky), 6 (dashed lines on the sea). R, zero cost.

Cause: `waterBodyFragment` in `src/scene/waterOptics.ts` computes the body colour only `if ( waterViewCos > 0.0 )`.
Otherwise it sets `waterBody = waterDeepReflectance`, the deep-water limit, which in the pool is navy.
On the case the shading normal is the vertex normal plus chop and ripple slopes (`SweptBarrelMesh.ts`, `richFarNormal + RICH_SHEET_GLITTER`).
At a silhouette, at the lip tip and on grazing sea near the join, that perturbed normal tips past the eye, so single pixels and thin lines go navy.
The dither then scatters them into dashes. This is the same fault as the "cobalt dashes" in the consult log row of 2026-10-03.
The "normal guard" planned then was never built (no guard found in `src/scene/water`).

Fix: a normal guard. Where the shading normal faces away from the eye, bend it back to the grazing direction before any lighting:
`n = normalize(n - min(0, dot(n,v)) * v)`, then floor the view cosine at a small value (0.03, provisional). Apply it on the case and on the sea, under the switch.
What the player sees: the dark outline around the tube, the dark line along the lip tip and the dashes on the sea all go. Edges fade to sky reflection, as water does at grazing.
Risk: low. A grazing pixel becomes bright sky instead of navy; check the silhouette does not glare at low sun.

### Rank 2. The white lip roll: join 2. R, zero cost.

Cause, read from code and not yet proved by a still:
- `sweptLeavesAlong` in `SweptBarrelMesh.ts` uses `abs( dot( direction.xz, ... ) )`. It ignores which way along the tube a ray travels.
- `finishRun` in `src/wave/barrel/sweptLoft.ts` sets `sliceMouth` to the distance to the nearest unformed slice **on either side**. The collapsed end counts as an opening.
So a ray through the lip that heads into the broken end is given full sky. From the mouth side the whole lip takes the horizon's grey-white.
The flat lid is the same light on the lip's top face, plus the blunt nose of the a38 stand-in case (ruling 9).

Fix: sign the along test so only rays heading to the shoulder-side mouth leave to the sky. Treat the broken end as closed: return foam-lit water colour there, not sky.
What the player sees: the lip from the mouth side turns the wall's blue-green, brighter and more see-through toward the tip. White then comes only from foam, where ruling 9 puts it.
Risk: low to medium. If the cause is wrong, nothing changes; prove it first with the unit bar below. A tube with both ends really open (a short section) must still get sky from both.

### Rank 3. Stripes on the inside wall: join 5 (staircase ripples). R, zero cost.

Cause: the ripple slope is sampled at world x-z and added as a horizontal tilt (`waterRippleSlopeAt( vWaterWorld.xz, ... )`, added as `vec3(-s.x, 0, -s.y)`).
On a wall at 60 to 90 degrees, a short step in x-z is a long step along the surface, so the pattern is squeezed by 1/cos(slope) into bands.
The bands are wavy, not straight (`merge-look/crops/inside-wall.png`), which points at the ripple texture and not at mesh steps. Reasoned; the bar below settles it.

Fix: scale the ripple and chop slope by the vertex normal's y, squared (1 on flat water, 0 on a vertical wall and under the roof). Provisional weight.
Real walls inside a tube are glassy with fine lines drawn up the face along the flow, so less ripple there is the right direction (reasoned).
What the player sees: a smooth glassy wall. Risk: the wall may look too plain. If so, add flow-aligned streaks later; that is ruling 9's territory, not this one.

### Rank 4. The shoulder end: join 3 (vertical edge and kink where the lip starts). R first, then S only if a test asks for it.

Cause: several things switch within one or two slices of tau = 0.
- The sheet weight is `formed` times a ramp; `SHEET.formed 0.035` makes it pop in 0.05 to 0.10 s (ruling 9), which is 0.5 to 0.9 m of crest.
- The region still shows it: lip and inner regions begin at a near-vertical boundary about 12 px wide (measured, `adv-region/curl-front-rich-midday.png`, x 465 to 478). The crest line also rises about 13 px across it.
- In `seamY`, vertices between crest and throat change rule at the first overturned slice, from the floor rule (alpha_tau times S(delta/b)) to the lip rule (alpha_tau alone). Read from code; size not measured.

Fix, render part: ease the sheet, lip and throat shading weights in over 2 m of crest from tau = 0 (0.23 s on the slice clock; a function of tau only, never of wall time).
This is the same eased `formed` that ruling 9 asks for. Build it once and share it.
Fix, shape part: only if the loft bar below fails. Then blend the two `seamY` rules over the first 0.23 s of tau, so a vertex's lift is continuous along the crest.
The throw stays at tau = 0 and at the throw depth; only how fast the first 2 m of lip leaves the sea surface changes. This changes the collided roof near its start, so it needs its own switch and the online-match check.
What the player sees: the lip peels out of the face as a thin feathering edge that thickens along the crest, instead of a roll that starts at a wall.
Risk: render part low. Shape part medium: the rider's head can meet the first 2 m of lip.

### Rank 5. The broken end: joins 3 (flat grey-green patch) and 7 (flat matt water behind the peel). R now; real volume is the roller.

Cause: the roof ends at touchdown inside a 1 m end blend (`LOFT.endBlend 1`), and `collapseFade` removes a tube without a void at once.
Behind it there is only the solver's flat surface with the sea's foam shader. The case's own foam is a plain tint (`RICH_FAR_FOAM`), the sea's is plume, churn and streaks (`RICH_FOAM`).
So two foams of different make meet at a cut, and neither has height.

Fix, render: (a) give the case's last slices the sea's foam make-up, fed by the same foam field, so one foam crosses the join.
(b) Whiten the roof over the last 0.2 s of tau before touchdown, lip tip first, so the roof arrives at the end already white. Provisional timing, reasoned from splash-up starting at touchdown.
Do not lengthen the end blend: 2.5 m end blends drew shards on short fronts (consult log, 2026-10-22).
What the player sees: the roof dissolves into whitewater instead of stopping at a patch. The whitewater is still flat.
The real fix is the roller as geometry, which the owner has ordered second after face and tube. A drawn collapsing tube for 0.5 s after touchdown would be sourced, but it is new collided shape: owner's call.
Cost: (a) adds the sea's foam lookups on the case's end pixels only; small, measure it. (b) zero.

### Rank 6. Surface detail parity: joins 1 (reads as a separate surface) and 4 (different blue behind). R.

Cause: body colour matches (table), but the sea carries plume whitening, bubble tint, face streaks, flow-advected ripples and the crest-light march. The case carries chop and static ripples only.
The eye reads the change of texture as a change of object, most of all on the back and on the resting skirt ahead of the face.

Fix: where the case is at rest or on the back (lift weight low, normal y high), shade it with the sea's normal and foam path. Fade to the case's own shading as the lift weight rises.
Cost: this is the one fix with a real per-pixel cost: the sea's normal is a 16-tap filter and the crest march adds more. Use it only on low-lift pixels, never on the wall or the lip, and measure it on the M4 before keeping it.
If it costs frames next to the tube, drop it; ranks 1 to 3 carry most of the look.

### Rank 7. The ridge from behind: join 4 (ridge). S. Owner's call; not in this build.

Cause: the case's crest stands above the solver's broader hump, and the lift falls to zero along a line on the back. That is geometry, and it is collided.
With rank 1 done the dark line on it goes, and the ridge reads as a crest. Judge it again then. Reshaping the back changes what a rider paddling over it meets.

### Not a fault: join 1's darker, more saturated face.

The steep face is darker and bluer than the flat sea because it reflects less sky and shows more water. That is real in kind (reasoned from the game's own optics).
The far flat sea at (164,228,250) is pale because the pool floor is pale and shallow. Do not "match" the face to the flat sea.

## 4. Bars, checkable without riding

Stills: the same four shots, same spot string, plus `&tubeLook=merge`.

| Fix | Bar | Now |
|---|---|---|
| 1 guard | Navy pixels (R<60 and G<90, `dark.py`) = 0 in all four stills | 34 / 56 / 157 / 159 (measured) |
| 1 guard | Default build stills byte-identical with the switch off | to check |
| 2 lip light | Unit test: a ray through the lip heading to the broken end returns no sky; heading to the shoulder mouth returns sky | not tested |
| 2 lip light | Lip roll at curl-close (500,335): B-R at least 60, and no brighter than the far sea | B-R = 24 (measured); bar reasoned |
| 3 ripples | `stripes.py` on wall columns of curl-inside: rms residual under 2 | 4.0 to 7.7 (measured; windows may clip the lip edge, fix the window first) |
| 3 ripples | Loft test: second difference of y along a wall profile under 1 cm between neighbours. If it fails, the stripes are mesh, not ripples | not run |
| 4 shoulder | Loft test: largest lift step between neighbouring slices at one profile index, per 0.5 m of crest, under 5 cm from tau -0.5 to +0.3 | not run; bar reasoned |
| 4 shoulder | Front region still: the lip's sheet weight rises from 0 to 1 over at least 1.5 m of crest | about 0.3 m (measured pixels, scale reasoned) |
| 5 broken end | Row across the broken end in curl-close: no colour step over 30 per channel within 12 px | not measured |
| 6 parity | Row across the back join in curl-behind: luma residual rms on the case within a factor 2 of the sea's | not measured |
| all | Frame time next to the tube with `?perfLog=on`: no worse than the switch off | owner's M4 |

## 5. Must not

- No time low-pass of flow or shape. Every easing above is a function of the slice clock tau or of place, never of wall time.
- No hidden forces on the rider. Nothing above touches the rider's water.
- The throw stays at tau = 0 and at the throw depth.
- The default build stays byte-identical. Everything sits behind a switch.
- No extra sheets, no soft particles, no second pass near the tube. No temporal pass on the dither.
- Do not lengthen `LOFT.endBlend` (shards, 2026-10-22).
- Do not recolour the face to match the flat sea.
- Do not widen or narrow the dither band to hide a join. Fix the shading on both sides; then the band cannot be seen.
- Do not ship rank 2 on reading alone. Prove the cause with the unit test first.

## 6. The owner's calls

- Whether to draw a collapsing tube for about 0.5 s after touchdown (sourced, but new collided shape) or wait for the roller.
- Whether the back ridge is reshaped (rank 7).
- Whether rank 4's shape part is wanted if its test fails, since it changes the first 2 m of roof a rider can touch.
- Ruling 9's open calls stand: the lip cut-outs, and replacing the blunt a38 stand-in case with the pool's own.

## 7. How this sits with ruling 9 (`?lipLook=fray`)

Build ranks 1 to 3 of this ruling first. Reasons:
- They cost nothing per frame and carry no shape risk.
- `fray` whitens the lip by thickness. While the lip is already white from the wrong back light (rank 2), that whitening cannot be seen or judged.
- The navy tip line (rank 1) would outline every tooth `fray` cuts.

Then build `fray`, with the eased `formed` shared with rank 4's render part. Then ranks 5 and 6.

Switches:
- `?tubeLook=merge`: all render-only merge fixes (ranks 1, 2, 3, 4 render part, 5, 6). One switch, because they are judged together in one still.
- `?lipLook=fray`: stays separate. It is a look choice; merge is fault repair.
- Any shape change (rank 4 shape part, a drawn collapse) gets its own switch, because it must match online and be collided.

## 8. What I did not check

- Rank 2's cause is read from code. No still isolates it.
- No loft unit probe was run. Step sizes along the crest are read from code and from region stills.
- Pixel-to-metre scales in the front view are reasoned from the camera distance, not calibrated.
- O'Dea 2021, Feddersen 2024 and Mostert 2022 are cited through the KB, not re-opened. Pool photographs were not opened.
- The `sheet` dev-view stills were still being captured when this was written (`merge-look/adv-sheet/`).

## 9. What the build measured (2026-11-11, `?tubeLook=merge`, PR after #248)

Built: ranks 1 and 3, render only, opt-in (`src/scene/water/tubeLook.ts`). Rank 2 was tested before building and is **not** built. Stills: `stills/merge/` (the same four shots and spot string plus `&tubeLook=merge`); the before stills are `stills/`. All numbers below are measured on those 1280×720 stills on the M1, headless, Rich, midday, with the tools in `tools/`.

### Rank 1, the normal guard: works in part

| Still | Navy pixels (R<60 and G<90, whole frame, `dark.py`) before | with the switch |
|---|---|---|
| curl-behind | 34 | **0** |
| curl-inside | 2054 | 1835 |
| curl-close | 184 | 129 |
| curl-front | 159 | 158 |

(Section 4's "now" column counted windows; these are whole frames, so the two sets do not compare.)

- Gone: the dashes on the sea, the navy part of the seam from behind, most of the dark outline along the lip's edge seen from inside, and the wavy bands at the wall's base that flipped dark.
- Left, and **not** the fallback navy (10,44,117): teal pixels (8–28, 75–89, 116–133).
  - A thin dashed line at the lip's tip in curl-close and curl-front (y 364–371, x 560–750). In the `region` dev view it sits on the first pixel row of the region under the lip; with all diffuse light off that row and everything under it go black, so it is lit by diffuse light alone and is darker than the rows below it. Cause not proven. Reading: the under-lip shade (`RICH_THROAT`) or the sheet's thickness at the tip fold. It belongs with the lip's look.
  - A teal line along the lip's edge in curl-inside.
  - From behind, a thin darker line along the ridge is still there: columns of the ridge (x 470–800) with a line darker than both sides by more than 25 luma went 190 → 149 of 330. Its darkest part was the navy; the rest is rank 7's ridge, not a normal fault.
- Guarding three's lighting `normal` as well as the body's `waterN` changed 236–710 pixels by at most 24 levels. Not kept: the guard is the ruling's two lines.
- The bar (0 navy in all four stills) is met in one still of four.

### Rank 2, the white lip roll: the read cause is refuted

Section 3 read the roll as sky wrongly let through the lip's outer run (`sweptLeavesAlong` taking the broken end for a mouth). Tested at the roll's pixel, curl-close (500,335), which is (200,216,224) on the rideable build:

| Change (one at a time) | Pixel |
|---|---|
| No sky through the lip at all (`sweptRayLeaves = 0`) | unchanged |
| The sheet's own light off (the emissive term of `sweptSheetBody`) | (169,174,167) |
| Lip glow off | unchanged |
| Foam off | unchanged |
| Sky mirror off, direct highlight off, all diffuse off | unchanged, each |

- So the roll is not the open-end sky. It is the light through the thin lip as designed: the underside's diffuse sky share (`vSweptSheetBack` by `vSweptThroat.w`) and the lip glow, each alone bright enough to stay white after tone mapping (which is why one knock-out at a time shows nothing).
- **No signed-mouth change was built** and `sliceMouth` is untouched. Section 5's rule held: not shipped on reading alone.
- What reads wrong on the lip is then its shape (a rounded stub) and its flat, textureless white, not a lighting fault. Both go to `?lipLook=fray`: whitening by thickness needs the thick part to stop being white first, so `fray` has to bring the sheet's light down where the sheet is thick. Section 7's reason "the lip is already white from the wrong back light" stands as a fact about the still, with a different cause.

### Rank 3, the wall's ripples: bar not met

`stripes.py`, curl-inside, wall columns, rows 300–430 (rms luma residual; bar under 2):

| Column | Before | With the switch |
|---|---|---|
| 900 | 5.39 | 5.04 |
| 1000 | 5.79 | 5.30 |
| 1100 | 6.06 | 5.43 |
| 1200 | 5.86 | 5.71 |

- The fade is right in kind (a level surface's slope should not be added whole to a wall's normal) and cheap, so it stays in the switch. It moves the stripes by 3–10 %.
- So most of the stripes at the wall's base are not the tube wall's ripple normal. Not tested yet, in the order to test: the sea's own ripples at the foot of the wall seen at grazing (the window may lie on the sea's mesh, not the case's; the `region` view settles that), the bed's light pattern (`causticLightAt`, also laid in x and z), the foam's lace, the loft's own steps (section 4's loft test).

### What this changes in the ranking

1. `?tubeLook=merge` holds ranks 1 and 3 now. Ranks 4 (render part), 5 and 6 join it as they are built.
2. Rank 2 leaves this ruling. The lip's white is ruling 9's.
3. Next for the joins: find the stripes' real source with the `region` view before changing anything else on the wall; then rank 4's eased start with `fray`.
