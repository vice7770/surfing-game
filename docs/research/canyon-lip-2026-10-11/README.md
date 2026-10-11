# The Canyon's spilling lip, 2026-10-11

The owner's playtest of 2026-10-11, at the Canyon: "I don't want the wave to become white then have the spilling; spilling should be like a tube animation but as a separator that the wave is breaking."

What was built, on `claude/canyon-lip` (four passes: the first build, the coordinator's look pass, round 2 after the water-physics advisor's review, and round 3 for the shoulder at Big):

- **A small rolling lip.** At each wave's spilling front the crest sharpens and its tip is thrown out and falls down the face. It runs along the crest at the S2 front's pace (the 55° peel), just behind the front's tip. Each column goes through the break's own sequence as the peel passes it.
- **A clean shoulder ahead of it.** No whitewater is drawn ahead of the front. The drawn foam drifts shoreward and its lace lasts 6 s rather than 15 s. On each wave's unbroken shoulder ahead of its front, the drawn lace is held back (round 3), so the shoulder is clean green water at Medium and Big.
- **White that trails the break.** No white is drawn on a column's face until its curl lands. A bright patch then shows where it lands, with a splash of drops. The white grows down the face and reaches the face's foot 2 s later.

It is **look only**. The water, the solver's breaking strength, the S2 whitewater (which feeds the air and the roar), the breaking the rider feels, the roller table (`writeTable`: push, froth drag, water entry, lens top), the aeration the rider floats in (`aerateBores` → `voidFraction`) and its turbulence, the bores the air reads, and the lip impacts (the sound and the reports) are byte for byte the same with the lip on and off. A test checks this every step over 5 s of Canyon Medium, the foam's drift and the curl's splash included. The curl collides with nothing. `heightAt` and the drawn heights are unchanged. Only the Canyon has the lip; every other spot draws exactly as before, in both looks.

## The stills

Canyon, Medium swell (Hs 1.4 m, Tp 11 s, 0°, s = 150), seed 1, in the page, at sea time 133.47 s: a set wave about 2 m high peeling toward +x at the take-off. They were shot from the dev water sheet (`?inpage&waterSheet&spot=canyon&swell=medium&direction=0&spreading=150`, with `&spillingCurl=0` for the before), midday, in the Rich look unless noted. The before and after show the same wave at the same moment, from the same cameras, because the switch changes nothing felt. The after stills are round 3's. The Medium motion strip is round 2's: round 3 changed only the lace on the shoulder, which was faint at Medium.

| | Before (`spillingCurl` off) | After |
| --- | --- | --- |
| From the lineup, looking along the crest | ![](before-lineup.jpg) | ![](after-lineup.jpg) |
| Up close, beside the curl as it passes | ![](before-beside.jpg) | ![](after-beside.jpg) |

- **From the beach** (after): ![](after-beach.jpg)
- **Beside the curl, Classic look** (after): ![](after-beside-classic.jpg)
- **Big** (`&swell=big`, sea time 201.89 s; this wave is 1.5–1.6 m high, Big's sets reach 2.5 m), beside and from the lineup: ![](after-big-beside.jpg) ![](after-big-lineup.jpg)

**Motion strips.** 8 frames, 0.15 s apart, read left to right then down. Each is from a fixed camera beside the take-off column (x −30) as a curl passes:

- **Medium,** from about 10 m, sea time 132.87–133.92 s: ![](motion-medium.jpg)
- **Big,** from 10 m, sea time 201.29–202.34 s: ![](motion-big.jpg)

**My read.**

- **Before:** the face is white (S2's foam) right up to the front. There is no curl.
- **After, Medium:**
  - The ordering reads: a clean shoulder, then a small lip just behind the front, then a bright white patch at the crest where it has landed, with drops thrown up. The white spreads down the face. The lace that covered the face and shoulder in the earlier stills is gone.
  - Beside it, the lip now reads as a translucent sheet arching off the crest and down the face. It is longer where it is older and short at the front, with lighter streaks across it and a darker band under it.
  - The strip shows the sequence: the white patch spreading along the crest frame by frame, with the lip reaching out and down ahead of it.
- **What is still off:**
  - **Glassy.** The lip is still smooth and a little glassy, more a clear awning over the crest than water pouring. The streaks' downward motion can only be judged in motion, not in stills.
  - **The tip.** The ragged tip is too small on screen to see at these distances.
  - **From the beach.** The curl is subtle: a thin lip on the crest beside the white.
  - **Classic.** It reads darker teal, with its inner side showing through.
- **After, Big (round 3):**
  - The lace network that covered the face and the water ahead of the front in round 2 is gone. The shoulder reads as clean green water: smooth, with the face's own ripples and shading, and the lip and the white patch behind the front.
  - Behind the front, the white patch, its lace trail and the whitewater inshore are as they were.
  - The strip shows the shoulder staying clean as the white patch spreads along the crest. It doesn't flicker or pop.
  - The bright blotches low on the right of the strip are the sun's glints on the near water. The snapshot's drawn foam there is 0.
  - The curl is still small beside the white patch.
  - The dark dashes in the Big stills are in the water without the curl too, so they are not the curl's.
- **After, Medium (round 3):** nothing regressed. The lip, the landing white and the trail behind are unchanged. The few faint lace flecks left on the shoulder in round 2 are gone.

## The numbers and their sources

| What | Value | Source |
| --- | --- | --- |
| Touchdown after the front reaches a column | τ_i = 0.6 √H s (0.84–0.86 s for the 2 m wave in the stills; 0.95 s at 2.5 m) | The barrel clock (along-the-crest.md); advisor 0.35–0.7 s at Medium (inferred) |
| The tip's flight | Out at a steady pace to the landing at τ_i (0.2–0.3 C), falling as t² from a peak at most 0.1 H over the crest, sharpened over the first third | The advisor, round 2 (the jet leaves nearly level and falls ballistically; Mostert, Popinet & Deike 2022: laminar until touchdown) |
| The void fills, the curl whitening from its tip | 0.5 s | along-the-crest.md (collapse from T to T + 0.5 s) |
| The white's toe reaches the face's foot | 2 s after touchdown | The owner (2026-10-11); advisor's sourced 2–3.5 s (Svendsen 1984, 5–8 h_b) |
| Overturn shape | Pick & Feddersen (2026) fits (`Overturn.ts`), ψ0 from each column's Mead & Black gradient at h_b | The advisor; provisional |
| ψ0 range | Held to 1:50–1:30 at H0/h0 0.28: void 0.10–0.20 H², W/L 0.35–0.37, 47–50°, curl 0.23–0.33 H high (0.58–0.83 m at H 2.5 m) | The advisor's span for the fan face. Downcoast the fan grows gentler (1:60–1:95), and the arm's end and the beach face are steeper (1:25) |
| Landing | 0.60 H ahead: Pick & Feddersen's far end (1.5 m at H 2.5 m) | The coordinator's ruling, round 2 (the contrast route) |
| Lip thickness | A_J·H² / (L + W), no less than 0.052 H: 0.13–0.15 m at H 2.5 m | Advisor: about 0.05 H; 0.13–0.15 m at Big |
| The splash | At touchdown, per column: 0.3 of the jet (`SPLASH_UP.share`), on at the breaker celerity, down at 3.2 m/s | The advisor, round 2 (about 1.0 C forward, 2.5–4 m/s down) |
| Surface drift of the drawn foam | Q_s = 0.18 H_b² m²/s over the still depth, at most 0.4 m/s, where the still depth is under 1.3 h_b (Q_s 1.3 m²/s at Big) | Hansen & Svendsen 1984; the advisor's Q_s ≈ 1.2–1.5 m²/s at Big and 0.3–0.4 m/s |
| Drawn lace | 6 s (the Canyon's was 15 s) | The coordinator's ruling, round 2 |
| The shoulder held back | Along each wave's crest line, up to 30 m ahead of its front, faded in over 3 m from the front. Across shore, from 2 m behind the crest to 12 m or 5 H_b ahead of it, whichever is more, faded over 3 m at both ends. The lace fades with a 0.1 s e-folding time | The coordinator's ruling, round 3; extents set by eye and by the measurement below |
| Streaks | Two flow-map layers half a 0.45 s period apart; scrolled along the lip at 0.4 m/s near the crest to 3.2 m/s at the tip; 0.3 m apart in world x, 1.2 m long | Surf's Up course notes p. 80; Vlachos 2010; the advisor (2–4 lip thicknesses apart, 4:1) |
| Ragged tip | Fingers cut from the tip's last fifth, 0.45 m period in world x; the tip's froth varied with the same noise | Surf's Up's lip trains; the advisor (0.3–0.6 m) |
| Along the crest (the stills' wave) | 0.17 s per metre (a 5.7 m/s front), curl standing over about 7 columns, the face's foot (the lens's toe) 7 m | Measured. Advisor: 0.175 s/m; 2–4 m of open curl, then about 3 m collapsing |

**How it is drawn:**

- **The curl** (`src/wave/SpillingCurl.ts`, `src/scene/SpillingCurlMesh.ts`):
  - **The slices.** A ribbon is lofted along each wave's crest from the snapshot's slices: up to 56 slices of 13 floats, 2.9 KB, carried through the snapshot so solo, worker and online clients all draw it. Each slice carries its column's curl at full size and its age. The ribbon builds the column's stage of the break from that age, so the curl doesn't inflate as one shape.
  - **The sequence per column:**
    - the crest sharpens to a peak at most 0.1 H over the drawn crest;
    - the tip goes out first, nearly level, and falls as t² onto the drawn face at the landing, 0.6 H ahead, at touchdown;
    - the void under it opens in the last third of the flight;
    - after touchdown the lip settles onto the face over 0.5 s, whitens from its tip, bulks into a white mass and fades out into its landing patch.
  - **The contrast route.** The drawn face is gentler than an overturning one, so the void a real curl has, 0.15–0.2 H more, is drawn as contrast, not geometry. The lip's underside and a veil on the face under it are darkened for the sky the lip hides. That darkening is 45 % on the underside and 60 % on the face under it, at 75 % opacity, as the void opens.
  - **Shading.** It is shaded on the water's own uniforms, with the face's column of water as its body, so it takes the face's colour. Its falling outer half is the swept barrel's thin backlit sheet: translucent, letting 30 % of the water behind show through, brightest toward its tip.
  - **Streaks and tip.** Its falling half carries the streaks, and its tip the ragged fingers and froth, both fixed in world x. As the peel passes, they stay put while each column runs through its sequence.
  - **Rim and sheen.** Its view cosine is held off grazing, which removes the dark rim. Its Rich roughness is 0.25, which removes the plastic sheen.
  - **Fades.** It is blended: it fades into the crest where it attaches and out as it collapses, with no end cap. Classic draws it too, with Classic shading.
- **The drawn white:**
  - **S2's drawn whitewater.** S2 writes a drawn whitewater beside the felt one. It is zero before touchdown, then runs from the landing line (the void filling up to the crest) down to a toe that reaches the foot 2 s later. It also holds back the next crest's weak breaking before its onset joins it. The foam field takes its foam and source from this drawn whitewater; its bore measurement for the air is unchanged.
  - **The band.** The roller band's drawn copy (`writeRoller`) waits and grows the same way. Once its curl has landed, it is drawn at full scale within 0.15 s: a bright white patch where the lip lands (fresh foam averages about 41 % reflectance over its first second; the advisor), brightest at the crest and fading toward the toe.
  - **The drawn air.** Rich's churn and plume show only under drawn foam, and only in columns whose curl is still young. A developed bore draws its air as before.
- **The splash.** Each touchdown pushes a `LipImpact` (kind 1, a splash-up) into `drawnImpacts`, which only the drawn spray reads. It never enters `lipImpacts`, so the water, the foam's air, the sound and the reports never see it. Classic throws no drops from a splash-up, the rule Classic's spray has kept since G9, so the splash shows in Rich only.
- **The foam's drift.** The foam field takes the drift on top of the current for its own departure points only. The advection stencil it records, which the aeration reuses, stays the current's: a test checks the stencils are identical with and without the drift.
- **The shoulder** (round 3; `SpillingCurl.clearShoulder`, called each step before the foam's own step):
  - **Where.** For each wave, it finds the crest at the front, then follows the crest line column by column ahead of the front, taking the highest water within 2 m of the last column's crest. It stops where the water stands less than 0.3 of the front's crest height above still water: there is no shoulder there.
  - **What it holds back.** On a band along that line, it fades the drawn foam (`dense` and `residual`) with a 0.1 s e-folding time, and zeroes the drawn whitewater, the foam's source. That source is the solver's weak breaking ahead of a front, which no onset has joined to a wave yet.
  - **Edges.** Every edge of the band is smoothstepped over 3 m, and the fade is a decay rather than a cut, so nothing pops or flickers as the band moves.
  - **What it leaves.** Behind each front nothing changes, so the whitewater and its lace trail are as they were.
  - **Felt.** Nothing felt changes. The foam is drawn only, and the bores the air reads come from the felt whitewater. The felt-identity test passes with it on.
  - **Measured.** At the take-off, the mean drawn foam on the shoulder 3–15 m ahead of each front, from 1 m behind its crest to 8 m ahead:
    - **Medium:** 0.0000 over 83 samples, max 0.00001;
    - **Big:** 0.0000 over 24 samples, max 0.0000;
    - **Without the lip:** 0.22 at Medium and 0.17 at Big.
    - The samples span 30 s of sea, taken every 8 frames.
    - A test holds each sample at or under 0.02 at both sizes.
- **The crest tracker** (Wave Lab Follow, `crestTracker.ts`) reads the drawn foam from the snapshot. With the lip, the breaking edge it slides to is the white's edge, a few metres behind the curl, rather than S2's early foam. The shoulder's clearing is ahead of the front, so it doesn't move that edge. Its tests pass unchanged after round 3.

**Cost** (node timings on this M1 Air):

- The look's step and splash: about 0.01 ms per step.
- The snapshot's slices: about 0.03 ms (worker).
- The foam's drift: +0.2 ms per step on the foam stage (2.26–2.30 → 2.47–2.48 ms in the page's CPU run).
- The shoulder's clearing (round 3): 0.035 ms per step at Medium and 0.026 ms at Big.
- Building the ribbon on the page: 0.063 ms for 20 slices and 0.164 ms at the 56-slice maximum, cheaper than the look pass (0.082 and 0.225 ms) because each slice samples the face fewer times. The ribbon is rebuilt once per snapshot, not per frame.
- The GPU draws one mesh of at most 1,152 vertices with the water's sheet shading, plus two value-noise layers for the streaks and one for the tip. GPU cost was not measured; I estimate it as small.

## Sources

- Pick & Feddersen 2026 (J. Fluid Mech. 1040 A8): the overturn's fits (`Overturn.ts`).
- Mostert, Popinet & Deike 2022: breaking jets are laminar until they touch down.
- Watanabe, Saeki & Hosking 2005: fingers and drops form on the splash.
- Saruwatari et al. 2008: the splash-up and its jets.
- Surf's Up, SIGGRAPH 2007 course notes, pp. 80–82: the falling face's texture shifted for downward motion; lip trains.
- Vlachos 2010, "Water Flow in Portal 2": two-layer flow maps.
- Hansen & Svendsen 1984: the breakers' shoreward surface mass flux.
- Deike, Melville & Popinet 2015: surf-scale spillers overturn.
- Svendsen 1984: the roller's development over 5–8 h_b.
- Mead & Black 2001: the orthogonal gradient.

## What is provisional

- **The shape.** Pick & Feddersen's potential-flow fits stand in for the Canyon's own break until the high-resolution Basilisk level-15 run.
- **The void.** The drawn void is as high as the gentle face allows under a lip at most 0.1 H over the crest, so it is drawn as darkness rather than its full 0.23–0.33 H. The 0.2–0.35 H test holds for the overturn's size W, not for the drawn void.
- **The look's game values.** These were set by eye on these stills:
  - the sharpening (0.1 H over the first third);
  - the light behind the lip (`SKY_BEHIND` 0.1, up to 0.5 more toward the tip);
  - its translucency (`THIN_SHOWS` 0.3) and its fades;
  - the darkening (`UNDER_SHADE`, `FLOOR_SHADE`, `FLOOR_ALPHA`);
  - the streaks and the ragged tip (`STREAKS`, `RAGGED`);
  - its Rich roughness (0.25);
  - the landing flash (0.15 s);
  - the splash's share (0.3) and fall speed (3.2 m/s).
- **The foam's drift and lace.** The drift's flux constant (0.18) and reach (1.3 h_b), and the 6 s lace.
- **The shoulder's band** (round 3). Its reach (30 m), its extent across shore (2 m behind the crest, 12 m or 5 H_b ahead, whichever is more), its 3 m fades, its 0.1 s e-folding time, and the 0.3 crest height where the shoulder ends.
- **The curl's direction and the air rule.** The curl's direction is held within 30° of the shore's normal. The drawn air reaches full strength under foam 0.5 thick.

## Open checks for the owner (no rider tests were run)

- **Does it read as water spilling and rolling?** It should read as a small lip thrown off the crest just behind the front, a white landing behind it, and a clean shoulder ahead, rather than a glassy awning or a shape sliding along. The motion needs judging in motion: the streaks' fall and each column's sequence can't be read from stills.
- **The shoulder** (round 3). It is now clean at Medium and Big. Check in play that the band's far edge (12 m or 5 H_b seaward of the crest, whichever is more) never shows as a line in the lace on the water beyond, and that the shoulder looks right at the Canyon's other sizes.
- **The white's pace.** Is 2 s from touchdown to the face's foot right, and is the landing white bright enough?
- **Classic, light and tiers.** Classic's darker teal lip, dawn and sunset light, Small, and the GPU tier.
- **Nothing felt changed**, so the ride itself should feel exactly as before. Worth confirming on the board, since the white now arrives later than the push.
