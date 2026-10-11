# The Canyon's spilling lip, 2026-10-11

The owner's playtest of 2026-10-11, at the Canyon: "I don't want the wave to become white then have the spilling; spilling should be like a tube animation but as a separator that the wave is breaking."

What was built, on `claude/canyon-lip`:

- **A small rolling lip.** At each wave's spilling front the top of the crest tips forward as a small curl and falls down the face. It runs along the crest at the S2 front's pace (the 55° peel), just behind the front's tip.
- **A clean shoulder ahead of it.** No whitewater is drawn ahead of the front.
- **White that trails the break.** No white is drawn on a column's face until its curl lands. The white then grows down the face from the landing line and reaches the face's foot 2 s later.

It is **look only**. The water, the solver's breaking strength, the S2 whitewater (which feeds the air and the roar), the breaking the rider feels, the roller table (`writeTable`: push, froth drag, water entry, lens top), and the aeration the rider floats in (`aerateBores` → `voidFraction`) are byte for byte the same with the lip on and off. A test checks this every step over 5 s of Canyon Medium. The curl collides with nothing. `heightAt` and the drawn heights are unchanged. Only the Canyon has the lip; every other spot draws exactly as before.

## The stills

Canyon, Medium swell (Hs 1.4 m, Tp 11 s, 0°, s = 150), seed 1, in the page, at sea time 133.47 s: a set wave about 2 m high peeling toward +x at the take-off. They were shot from the dev water sheet (`?inpage&waterSheet&spot=canyon&swell=medium&direction=0&spreading=150`, with `&spillingCurl=0` for the before), midday, in the Rich look unless noted. The before and after show the same wave at the same moment: the switch changes nothing felt.

| | Before (`spillingCurl` off) | After |
| --- | --- | --- |
| From the lineup, looking along the crest | ![](before-lineup.jpg) | ![](after-lineup.jpg) |
| Up close, beside the curl as it passes | ![](before-beside.jpg) | ![](after-beside.jpg) |

- **From the beach** (after): ![](after-beach.jpg)
- **Beside the curl, Classic look** (after): ![](after-beside-classic.jpg)

**My read of the stills.**

- **Before:** the face is white (S2's lace) right up to the front. There is no curl.
- **After:**
  - **The ordering reads.** Along the crest there is a clean green shoulder, then a small curl that grows from nothing at the front, then white behind it. The white starts where the curl has landed and spreads down the face.
  - **The curl looks glassy.** It is smooth and translucent turquoise in Rich and matte teal in Classic, and reads more like a glass roll lying on the crest than a pouring lip.
  - **From the beach it is small.** It sits on top of a gentle, solver-smooth face.
  - **Old lace remains everywhere.** The residual lace from earlier waves' bores (the Canyon's lace lasts 15 s) still covers the water around the break. That lace predates this work and is not touched.

## The numbers and their sources

| What | Value | Source |
| --- | --- | --- |
| Touchdown after the front reaches a column | τ_i = 0.6 √H s (0.84–0.86 s for the 2 m wave in the stills) | The barrel clock (along-the-crest.md); advisor 0.35–0.7 s at Medium (inferred) |
| The void fills, the curl whitening from its tip | 0.5 s | along-the-crest.md (collapse from T to T + 0.5 s) |
| The white's toe reaches the face's foot | 2 s after touchdown | The owner (2026-10-11); advisor's sourced 2–3.5 s (Svendsen 1984, 5–8 h_b) |
| Overturn shape | Pick & Feddersen (2026) fits (`Overturn.ts`), ψ0 from each column's Mead & Black gradient at h_b | The advisor; provisional |
| ψ0 range | Held to 1:50–1:30 at H0/h0 0.28: void 0.10–0.20 H², W/L 0.35–0.37, 47–50°, curl 0.23–0.33 H high, landing 0.42–0.60 H ahead | The advisor's span for the fan face. Downcoast the fan grows gentler (1:60–1:95), and the arm's end and the beach face are steeper (1:25), so the curl would leave the owner's "about ¼ H" there |
| Lip thickness | A_J·H² / (L + W): about 0.06 H at 1:30 | "The jet's thickness comes from its area" (advisor: about 0.05 H) |
| Along the crest (the stills' wave) | 0.17 s per metre (a 5.7 m/s front), curl standing over about 7 columns, landing line 1.2 m below the crest, the face's foot (the lens's toe) 7 m | Measured. Advisor: 0.175 s/m; 2–4 m of open curl, then about 3 m collapsing |

**How it is drawn** (the advisor's recommended build):

- **The curl** (`src/wave/SpillingCurl.ts`, `src/scene/SpillingCurlMesh.ts`):
  - A ribbon is lofted along each wave's crest from the snapshot's slices: up to 56 slices of 13 floats, 2.9 KB, carried through the snapshot so solo, worker and online clients all draw it.
  - Each slice is the curl at its column's age. It grows from nothing at the front to touchdown, then fills and whitens.
  - The lip's outer surface rises from the back of the crest, carries forward over the void, and falls onto the drawn face where Pick & Feddersen's lip lands. The face stands in for the void's lower branch.
  - It is shaded as the swept barrel's thin backlit sheet, in both looks. It stays clear until it lands, then turns white from its tip as it fills.
- **The drawn white:**
  - S2 now writes a drawn whitewater beside the felt one. It is zero before touchdown, then runs from the landing line (the void filling up to the crest) down to a toe that reaches the foot 2 s later. The foam field takes its foam and source from this drawn whitewater; its bore measurement for the air is unchanged.
  - The roller band's drawn copy (`writeRoller`) waits and grows the same way.
  - The drawn air (Rich's churn and plume) shows only under drawn foam.
  - S2's drawn whitewater also holds back the next crest's weak breaking before its onset joins it, which an older wave's band holds meanwhile. Before this change that breaking was drawn white ahead of the front.

**Cost:**

- The look's step: 0.015 ms per step.
- The snapshot's slices: 0.026 ms (worker).
- Building the ribbon on the page: 0.08 ms for 20 slices, 0.22 ms at the 56-slice maximum. These are node timings on this M1 Air. The ribbon is rebuilt once per snapshot, not per frame.
- The GPU draws one mesh of at most 1,400 vertices with the water's sheet shading. GPU cost was not measured; I estimate it as negligible.

## What is provisional

- **The shape.** Pick & Feddersen's potential-flow fits stand in for the Canyon's own break until the high-resolution Basilisk level-15 run.
- **How the curl sits on the solver's face.** The solver's crest is rounder and its face gentler than a breaking crest's. A void W high over that face would stand the lip a third of the wave above the crest. So the lip rises at most 0.2 H over the drawn crest (`RISE`), and its void is as high as the face's drop allows: about 0.2 H on the stills' wave rather than Pick & Feddersen's 0.33 H.
- **The light behind the lip.** It is shaded mostly against the wave's own water (`SKY_BEHIND` 0.1).
- **The curl's direction.** It is held within 30° of the shore's normal.
- **The air rule.** The drawn air reaches full strength under foam 0.5 thick.

## Open feel checks for the owner (no rider tests were run)

- **Does the curl read as a separator?** It should be a small lip, clearly smaller than a tube, running just behind the front, with a clean shoulder ahead. Or does it look like glass sitting on the crest? The knobs are `RISE`, `SKY_BEHIND`, `BACK` and `OVER` in `SpillingCurlMesh.ts`.
- **The white's pace.** Is 2 s from touchdown to the face's foot right, and is the white bright enough where the curl lands?
- **Sizes and light.** Small and Big swells (the ψ0 hold keeps the curl at 0.23–0.33 H of each wave), dawn and sunset light, and the GPU tier.
- **Nothing felt changed**, so the ride itself should feel exactly as before. Worth confirming on the board, since the white now arrives later than the push.
