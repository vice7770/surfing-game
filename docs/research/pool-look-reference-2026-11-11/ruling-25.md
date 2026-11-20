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

---

# Advisor ruling 25b: the streaks after step 14

Advisor: this session ("Water physics research", Opus 5.5 at max effort; from 2026-11-12 the owner made this session the advisor and orchestrator). Read: `step14/README.md` and the builder's hand-back, step 14's five-row crop (looked at by eye), `src/scene/foamPattern.ts`, `src/scene/water/foamFreshness.ts`. No run.

Tags: [M14] step 14's prints; [R] reasoned; [P] provisional.

## In short

1. **Keep step 14's light.** Foam on the tube is now lit as the sea's foam would be in the same place. The full-cover row matches the white pile [M14].
2. **Withdraw ruling 25's F1 test "white = every channel ≥ 200".** In these views the sun is behind the wave. The lip's outer face gets about half the pile's light (N·L about 0.13 against 0.74) [M14]. Foam on a face turned from the sun is grey-white, on the sea too. The eye reads foam by two things: it is neutral against the saturated water, and it has the shape of foam [R].
3. **The fault left is the shape.** Step 14 draws soft round clouds, not lines round the curl (seen in the crop). Two causes [M14]:
   - a plain value noise has a narrow spread, so "cover" is not an area share and the ±0.08 edge is wide;
   - the 2.0 m and 3.5 m cells round the curl are as long as the whole outer face.
4. **Use the sea's own foam lace, stretched round the curl.** Not a new noise.

## Why the sea's lace

- **Physics.** The lip's white is aerated crest water: the same foam the sea draws, pulled out round the curl by the lip's stretching flow. So: the same lace, stretched along the flow [R].
- **Cover is an area share by construction.** `FOAM_THRESHOLDS` in `foamPattern.ts` are set so that the covered fraction equals the foam value.
- **Sharp edges.** The lace has its own narrow edge (`FOAM_EDGE`, 0.04 cell).
- **One look.** Where the lip's foam meets the sea's foam they match. That serves the owner's wish that the two parts read as one wave.
- **Cost.** One fetch of the tile the sea already reads (`waterFoamTile`). The sea already stretches this lace for aged foam (`AGED_STREAKS` in `foamFreshness.ts`); follow that code.

## Build spec

1. **Pattern.** Sample the sea's lace (its own GLSL helper from `foamPatternPars`, with the same thresholds and patch value) at:
   - across the crest: u / 0.30 m;
   - round the curl: (s − 3 m/s · τ) / 1.2 m.
   This gives lace cells about 4 times longer round the curl than across [P]. No flow-map phases and no time: the motion is carried by s − 3τ alone.
2. **Texture.** If the tube's material does not bind `waterFoamTile`, bind the same texture object. No new texture data, no new pass.
3. **Cover table** (now a true area share):
   - outer face: 0 at the crest (point 32), 0.3 at mid-lip (48), 0.8 at the tip (64), as in ruling 25;
   - **inner face: 0.5 at the tip, 0.1 at the throat (88), 0 by point 96** (was 0.8 to 0.2 to 0 by 100). The photo's roof is mostly see-through; the old numbers would whiten about half the roof once cover is an area share [R].
4. **Clock.** As ruling 25 (zero at or before the throw, eased in over 0.15 s, fading 0.2 s after touchdown).
5. **Light.** Step 14's model, kept. One addition: **where the sheet is thin (fray share above 0), a streak never darkens the pixel.** Take the brighter of the fray-lit colour and the foam-lit colour, by luma. The thin tip is already aerated white (ruling 9). Bubbles added there cannot take light away. Step 14 darkened the rim by about 8 % [M14].
6. **Kept from steps 13 and 14:** u as a world axis; the pattern going to its mean far away (use the sea's own way of fading the lace with distance).

## Bars

Read each bar still against the same frame with the streak forced off (the frames repeat exactly [M14]). Use masks drawn by the shader, as step 14 did.

- **F1 (area).** `curl-lip` at midday. Share of the lip's outer face changed by the streak (luma by 6 levels or more, or saturation by 0.06 or more): 20 to 40 %.
- **F1n (reads as foam, not shadow).** On the changed pixels: mean saturation at most 0.6 times the same pixels without the streak; mean luma not lower than without it; at most 5 % of them darker by more than 8 levels.
- **F2 (lines, not clouds).** On the change mask on the outer face: the median piece is at least 2.5 times longer round the curl than it is wide along the crest. Along the mid-lip line: 0.7 to 3 crossings per metre of crest, with uneven gaps (their spread over their mean at least 0.3).
- **F3.** Tip third at least twice the crest third (as before).
- **F4.** `curl-inside`: on the lip's underside (points 64 to 88) 15 to 35 %; on the back wall (88 to 112) at most 3 %; the rider's pixels equal.
- **F5.** No drift in u between stills 0.1 s apart (as step 14 read it).
- **F6.** With `lipLook` off, pixel-equal to main; program text equal (tests). The 2 m pool's headless fps trace with and without `lipLook=fray`: mean within 1 fps.
- **F7 (rim).** On the thin sheet, no pixel darker than without the streak by more than 2 levels.
- **Eye check** by the orchestrator on `curl-lip` at midday and sunset and on `curl-inside`: foam lines drawn round the curl, not clouds, paint or a barcode.

## Stop rule and merge rule

- One build. One retune is allowed: the stretch (1.2 m round the curl, between 0.8 and 2.0 m) or the inner cover, if F2's length ratio or F4 misses.
- If F1n misses (the foam reads darker or greyer than the clean lip), hand back with the light terms. Do not add a glow.
- If F1, F1n, F2, F4, F6, F7 and the eye check pass, merge it on under `lipLook=fray`. It is in the owner's ride address, so the owner sees it on the next ride.

## Must-nots

Ruling 25's must-nots stand: no new mesh, pass or particles; no free time; do not whiten the wall ahead of the tube; do not hide the rider; do not touch `tubeLook=merge`. Also: do not change the sea's foam or its tile; Classic and `lipLook` off unchanged.

## Order after this

As ruling 25: (b) the torn edge (ruling 9 part 2), (d) check the pile against the photo, (e) foam lines on the face (the sea's own field), (c) crest spray last.

---

# Advisor ruling 25c: the streaks after step 15

Advisor: this session (Opus 5.5, max effort), 2026-11-12. Read: step 15's hand-back and `crop-lip-midday-3-rows.jpg` (looked at by eye), `src/scene/water/foamFreshness.ts`. No run.

## What went wrong in 25b

- **My error.** 25b drew the streak from the lace itself, blown up to 0.30 × 1.2 m cells. In the sea's lace the foam is the cell walls. Stretched, a Voronoi net gives diagonals and chevrons, not lines. In the still it reads as tiger stripes and cracked paint [M15].
- **Icicles.** The inner face near the tip at cover 0.8 (the retune) hangs grey spikes under the lip.
- The sea itself does not make streaks that way. Its lace keeps its own small cells. A smooth patch value, stretched along the flow, **gathers** the lace into streaks (`freshLace`, `AGED_STREAKS` in `foamFreshness.ts`) [code].

## The physics

Two scales, two causes [R]:

- **The lace** is the bubbles: small, fresh and fine at the crest.
- **The streaks** are where the stretching flow gathers that foam into lines round the curl.

So the streak must come from a smooth field stretched round the curl. The lace only gives the texture inside it.

## Build spec (on top of step 15's branch, `claude/pool-foam-3`)

1. **Lace (texture).** The sea's lace at a 0.25 m cell, the same both ways (young crest foam is finer than the sea's 0.7 m surf-zone lace) [P].
2. **Streak (where the foam gathers).** The tile's smooth patch value `.g`, read so that one patch spacing (8 tile cells) is **0.6 m along the crest and 3.0 m round the curl**. That is the sea's aged-streak shape (about 5 to 1), set to the lip's size. Coordinates: u and s − 3 m/s · τ, as before. Offset it from the lace's own read, as `AGED_OFFSET` does.
3. **Gathering.** Local foam value F′ = clamp(F + F(1 − F)(2v − 1)(1 + 1.5), 0, 1), where F is the cover and v the streak value. This is the sea's aged-foam rule with `gather` 1.5. Then draw the lace at F′ with the sea's thresholds. Reuse the sea's GLSL for this; do not write a new rule.
4. **Cover.** Outer face as before: 0 at the crest, 0.3 at mid-lip, 0.8 at the tip. **Inner face: 0.3 at the tip, 0.1 at the throat, 0 by point 96.** No icicles.
5. **Light.** As step 15, including the hard thin-sheet gate. Trace and fix the 45 darker pixels on the underside just inside the tip (points 68 to 79). F7 must pass.
6. Everything else as 25b: no time, no new pass, Rich with `lipLook=fray` only, Classic and `lipLook` off unchanged.

## Bars

As 25b (pair difference against the streak forced off), with these changes:

- **F1n:** saturation ratio at most 0.65 (0.6 was not sourced; foam turned from the sun under a blue sky is bluish-white).
- **F2, read on the pattern itself.** A TypeScript mirror on a (u, s) grid, 4 m by 2 m at 1 cm steps, cover 0.3 (`sampleFoamTile` reads the same texels as the GPU). The mask's correlation length round the curl at least 2.5 times the length along the crest. In the stills, the eye check decides.
- **F4:** underside (points 64 to 88) 10 to 25 %; back wall at most 3 %.
- **F8, no icicles:** by eye, nothing hangs under the lip in `curl-lip` or `curl-front`.
- F1, F3, F5, F6, F7 as 25b.

## Stop rule, and what happens if this fails

- One build. One retune: the streak spacing along the crest (0.4 to 0.9 m) or the lace cell (0.15 to 0.35 m).
- If the eye check fails again, **park part (a)**. Go to (b), the torn white edge, and (d), the white pile. Show the owner the stills of steps 13 to 16 and let the owner say which, if any, reads as foam.
- If it passes, merge it on under `lipLook=fray`.

---

# Advisor ruling 25d: park the streaks; first find why foam does not stand out

Advisor: this session (Opus 5.5, max effort), 2026-11-12. Read: step 16's hand-back and `step16/crop-lip-midday-3-rows.jpg` (looked at by eye); the brightness readings of steps 13 to 16; the lip-look ruling, section 4. No run.

Tags: [M13] to [M16] the steps' prints; [L] the lip-look ruling's measurement; [R] reasoned; [P] provisional.

## Step 16

- It draws a honeycomb net on the lip, and a net hangs under it. The eye check fails. By 25c's stop rule, **part (a), the streaks, is parked.** Code held on `claude/pool-foam-4`.
- The builder's point stands: to gather lace into lines, a streak must be 5 to 10 lace cells wide, as on the sea. On this lip that means a lace of a few centimetres, finer than the stills resolve [M16].

## What steps 13 to 16 have in common

**The foam is no brighter than the clean lip it sits on.**

- Step 14: streak pixels luma 208 against 204 for the same pixels without the streak; full cover (177, 210, 229) against the clean lip (140, 219, 249) [M14].
- Step 16: 205.9 against 190.3 [M16].
- Only the colour differs: grey-white against cyan. So every pattern reads as paint. Soft shapes read as clouds; hard shapes read as stripes or nets.
- The game's fully lit sea foam reads only about (190, 205, 195) at midday [L]. "White" is a pale grey here.

In the real world, sunlit foam is the brightest thing in the water. Fresh foam reflects a large share of light; clear water sends back a few percent plus what comes up from the floor [R; to be sourced in the diagnosis]. A light pool floor makes the water bright, but the owner's photo still shows the foam far whiter than the water.

**My order was wrong.** I asked for patterns before checking that foam can stand out at all. No foam shape (streaks, torn edge, lines on the face) can read as foam while foam and water have the same brightness.

## Next: a diagnosis, no game change

1. **One held frame.** 90 s; midday and sunset; `curl-lip` and `curl-front`. Use `hold.mjs` (step 14). Read the linear light, before the tone map, and the display value after it, for:
   - a cloud;
   - the sunlit white pile;
   - sea foam on a slope turned from the sun;
   - the clean lip at mid-lip;
   - the flat pool water in front;
   - the back wall inside the tube.
2. **Split the clean lip's light into its terms,** as step 14 did: sky reflection, light through the sheet, the fray's light from behind, the water's own colour and scatter, specular. Name the largest.
3. **Read the foam's light:** its albedo, the sun and sky terms, the tone map's curve and the exposure.
4. **Compare** the ratios foam : water : cloud with real ones. Open the sources and cite them: fresh foam's reflectance; clear shallow water over a light floor; the Fresnel share.
5. **Name where the game departs:** water too bright (which term), foam too dim (albedo, missing sky light, the tone map squeezing the top), or both.
6. **Propose at most two changes.** For each, give its physical cause, the expected ratio after it, and its reach. A change to all water (every spot) needs an A/B switch and the owner's ride. A change to the tube only can go under `lipLook=fray`.

No code change in this task; measuring tools go in the docs folder.

## After the diagnosis

1. The change it names.
2. Then foam shapes again, in ruling 25's order:
   - (b) the torn edge. Its cut-outs draw up to 0.10 m less water at the tip than the rider hits; that is the owner's call.
   - (d) the white pile.
   - (e) foam lines on the face.
   - (c) spray, last.
3. If streaks come back, draw them as explicit soft lines, not by thresholding a pattern: a few per metre of crest, at hashed places, wandering slowly round the curl, a few centimetres wide with soft sides [P]. Thresholded patterns gave clouds, stripes and nets.
4. The owner's ask: foam that follows the conditions (bigger or harder-breaking waves, more foam; fresh pool water fading faster than sea water).

---

# Advisor ruling 25e: the pool's water light

Advisor: this session (Opus 5.5, max effort), 2026-11-12. Read: `foam-light/README.md` (the diagnosis, Opus agent, effort high) and its three-row crops (looked at by eye). No run.

## The diagnosis, accepted

- **The pool water out-shines its foam.** Flat water, linear: (0.71, 1.83, 2.34). The white pile: (0.62, 0.73, 0.74). On screen both read luma 217.
- **Cause:** `RICH_WATER.bodyGain = 4` (`src/scene/water/richWaterGlsl.ts:148`). It was tuned by eye on 2026-09-26 against ocean reference stills (G8). Over the pool's pale floor the water's body colour is (0.18, 0.55, 0.66), so a gain of 4 lifts the water's albedo above 1. A reflectance cannot be above 1.
- Real foam is about 1.4 to 3.7 times as bright as clear pool water (the diagnosis's sources: Dierssen 2019; Maritorena, Morel and Gentili 1994; Mobley; the ratio is partly inference).
- **The clean lip** is 99 % the back wall seen through the sheet, so it follows the same gain.
- **The tone map hides the overshoot; it does not cause it.** Exposure alone does not separate foam from water.
- By eye, with the gain at 1 the white crest and the pile stand out from a deeper blue face. With the exposure raised too, the water is a lively turquoise and the foam is white. That is the closest of all our stills to the owner's photo.

## Decision: build proposal 2 for the pool, as one "water light" change

1. **Rich body gain 4 → 1,** in every water mesh that reads it: the sea, the far field, the lip and spray sheets, the roller and the tube. One value everywhere, so there is no seam (the diagnosis showed a tube-only change leaves one).
2. **Display exposure 1.05 → 1.6:** a camera exposing for the darker water.
3. **Reach.** On in the 2 m pool (`poolSize=ref`), the owner's pool ride; no new parameter is needed there. A switch `?waterLight=on|off` turns it on in any other spot or off in the pool, for A/B. Everywhere else the default stays byte-identical; online rooms stay on the default.
   - Why not every spot now: gain 4 was tuned on the ocean spots by eye. In deep water the body colour is darker, and the overshoot may not happen there. The owner judges the other spots with `?waterLight=on`.

## Bars

- **W1, contrast.** Pile over flat-water luminance (as the diagnosis read it): at least 1.3 in `curl-lip` and in `curl-front` at midday (expected 1.50 and 1.33). At sunset the pile is at least as bright as the flat water.
- **W2, no seam.** Across the join of the tube's back wall and the sea in `curl-front`, the step is no larger than with the switch off.
- **W3, no clipping.** The rider and the pool's deck and scenery: under 2 % of their pixels at 255 in any channel, and at most 1.5 times the share with the switch off. If the stills cannot show a rider, say "not read".
- **W4, other spots** with `?waterLight=on`: one midday still each for Canyon (default and B) and one other ocean spot. For the owner to judge; report the foam-to-water ratio, no bar.
- **W5, off is unchanged.** Pixel-equal stills with the switch off away from the 2 m pool; program text equal (tests); the Canyon hashes; the fps trace.

## Stop rule and merge rule

- One build. One retune of the exposure (1.3 to 1.8) if W3 misses. The gain stays 1.
- Merge if W1, W2, W3 and W5 pass and the eye check is good. The owner then rides the 2 m pool and looks at Canyon with `?waterLight=on`. Making it the default everywhere is the owner's call.

## Not now

- The half-sky reflection (`RICH_WATER.reflection 0.5`), a possible second, smaller departure: test later.

## After this

1. Look again at step 14's soft streaks under the new light (a held-frame still, cheap): with darker water they may read.
2. Then the foam shapes: (d) the white pile, (b) the torn edge (its cut-outs are the owner's call), (e) foam lines on the face, (c) spray.
3. Then the owner's ask: foam that follows the conditions.
