# The tube's spray — the owner's reference and what it asks for (2026-11-14)

`owner-abu-dhabi-side-on.webp` is the owner's own reference, given on 2026-11-14 with these words:

> **"For the waves — I want a big part to be foam and particles to complement the wave contact with the water. the real picture I shared or the video really shows the foam side on the water in the tube hitting the water. I would like to have foam particles for realism."**

and, sending the picture:

> **"here is a picture of the Abu Dhabi, on the side so you understand the wave size and the particles from the tube explosion"**

It is a side-on photograph of Surf Abu Dhabi — the same pool the 2 m Barrel is matched to (see `../pool-wave-reference` in memory, and `../pool-look-reference-2026-11-11/`). The owner chose a side-on frame deliberately, so **the wave's size and the spray's size are readable against each other in one picture**. That is the whole point of this reference: it is a scale drawing, not a mood board.

**This file is the target. Measure against it; do not redecorate from it.**

## What the picture shows

Read off the frame, with the trough-to-lip face as the ruler. Items 1 and 2 were the coordinator's reading by eye and were **re-measured from the pixels by step 5g** (`../wave-strategy-alternatives/c2-step5g-runs/reference.txt`, scripts beside it): the figures below are now `[M]`, and **both of the coordinator's were wrong in the same direction**. Items 3–5 are still read by eye, `[I]`.

**Step 5h has since withdrawn one of 5g's two `[M]` figures in item 2** — the optical depth. The height stands; the τ does not. Item 2 says what replaced it, and item 6 is new: what this frame can and cannot be held to.

1. **The wave.** A clean teal barrel, surfer crouched inside with the lip pitching over his head. Trough to lip is **274 px**, so the pool's own 2 m gives **137 px per metre**. (The coordinator's eye said 230 px / 115 px per metre — 19 % small, and it propagated into item 2, because every height here is quoted as a share of this ruler.)

2. **The spray veil — this is the ask.** A dense, **fine**, **translucent** mist is thrown up and back off the breaking lip. Over the barrel its top stands **142–159 px above the teal crest = 0.52–0.58 H**, and that depends on where you put the edge: at a threshold of 70 of 255 it reads **0.69 H**, at 100 it reads **0.55 H**. So the honest figure is **0.55–0.70 H above the crest**, not the 0.8 H the coordinator wrote. That part stands. The veil does trail back over the broken section, but **how far cannot be measured from this frame** — the coordinator's "tens of metres" is withdrawn.

   **Translucent — but not with the number 5g gave it, and this frame cannot give a better one.** 5g read the veil as optically thin (τ ≈ 0.1–0.25, transmission ≳ 0.9) because, across the pier band, it lifts the background's mean from 41 to 131 of 255 **while leaving its absolute variation apparently intact** (sd 23.5 → 29.4). Step 5h withdrew that: those are *sRGB code values*, and transmission is linear in **radiance**. Converted through the sRGB inverse EOTF the same two bands read **sd 0.0356 → 0.1146, a factor 3.2 up** [M, 5h]. **Attenuation cannot raise a background's variation.** What the sd under the veil measures is the veil's **own patchiness**, so it bounds τ in neither direction, and the argument that gave 0.1–0.25 does not hold. The periodic-amplitude route fails too: the pier's railing has no single pitch across the frame, and two halves of the *clear* pier already differ in amplitude by 1.7× [M, 5h].

   What is left is the radiance balance, I = I_bg·T + L_veil·(1 − T), in linear light. It gives a **bracket, not a number**, because L_veil — the veil's own in-scattered radiance — is not in the frame:

   | L_veil assumed (linear) | T | τ |
   | --- | --- | --- |
   | 0.333, the thickest veil's own reading | 0.29 | **1.23** |
   | 0.543, the photograph's broken foam | 0.58 | **0.54** |
   | 0.750, the glassy foreground, the frame's brightest extended surface | 0.70 | **0.35** |
   | 1.000, a clipped white | 0.78 | 0.25 |

   **So: τ ≈ 0.35–1.2 along the ray, centre about 0.5, and the assumption behind it is named.** That is three to five times 5g's figure, and it is still a bracket. **Do not design to a single value of it.** What the frame does say without any assumption is the thing the ask is really about: it is **translucent — the pier is readable through it** — and it is **not a white mass at a fixed alpha**.

3. **Where it comes from, and where it is not.** The veil sits **over and behind the breaking lip and the broken section**. There is **none over the clean face ahead of the curl** — that water is smooth, unbroken blue. This matters, because the owner's earlier complaint about the wave was the opposite fault: *"the body of the wave itself is quite thin in some waves a lot of it is foam."* The reference shows the discipline — **spray and foam only where the water has actually broken, and a great deal of it there.**

4. **The broken foam itself is lumpy and shadowed**, with a defined edge against the blue and visible relief on top — not a flat white band, and not a field with holes in it. **Step 5h measured it, and this item now has numbers** [M]; they are in `../wave-strategy-alternatives/c2-step5h.md` §5 and they are the sharpest thing in the whole file:

   | over the broken region | n | mean of 255 | sd | over 220 | **linear, against the flat water in the SAME frame** |
   | --- | --- | --- | --- | --- | --- |
   | this photograph | 101 760 px | 194.6 | 26.2 | 14.6 % | **0.75 — the foam is DARKER than the flat water** |
   | our render, the same camera geometry | 63 800 px | 229.9 | 10.0 | 83.5 % | **1.31 — ours is BRIGHTER** |

   **A factor of 1.75, and the sign of the contrast reverses.** Because both are each frame's own ratio, no exposure or grading difference can explain it. The shading contrast inside the region (sd/mean in linear light) is **0.248 here against 0.093 in ours**. The cause is sourced: an active breaker's whitewater reflects **≈ 0.50 at its whitest, 0.18 thin, 0.03–0.10 after ten seconds, and never above about 0.55–0.60** (Dierssen 2019; Koepke 1984), where our `waterFoamColor` is a diffuse albedo of **0.840**. **Real whitewater is not white**, and in a side-on view it is the darker thing in the frame.

5. **The flat water in front is glassy** — long soft mirror reflections, very little surface texture. Ours draws a strong caustic web over the same water. Logged as a look difference; step 5h adds the half of it that matters for item 4: a grazing view of water is a **mirror**, and unpolarised Fresnel for n = 1.34 runs 0.021 at normal incidence, 0.135 at 70° and 0.350 at 80°, reflecting the bright sky near the horizon. Our flat water is 0.77× this photograph's in linear light, so item 4 cannot be fixed by darkening the foam alone.

6. **What this frame cannot be held to.** Three things, so no later round spends itself on them: the veil's **optical depth** (item 2 — a bracket, not a number, and the sd route and the periodic-amplitude route both fail on it); **how far the veil trails back**, since the wave recedes from the camera so the horizontal scale is not the vertical's 137 px/m and nothing in the frame fixes the camera; and **anything absolute about brightness**, since the exposure and the grading are unknown — which is why every brightness claim above is a ratio taken **within one frame**.

## What we already have, before anyone builds anything

Found by reading the code on 2026-11-14, so the round that takes this starts from a read and not a blank file:

- `src/wave/SprayCloud.ts` already launches spray **from lip impacts** — a splash-up carrying the landing parcel's own momentum — and from bore faces, and off steep crests.
- `src/wave/BubbleCloud.ts`, `src/scene/SprayPoints.ts`, `src/scene/SpraySheetMesh.ts`, `src/scene/BubblePoints.ts`, `src/scene/water/richSpray.ts` and `src/scene/water/mist.ts` exist.
- `src/wave/PlungingLip.ts` carries `SPLASH_UP`, `TubeEruption`, `TubeSpit` and `TubeRoller` — the tube's own blow-out is modelled.
- `src/wave/particleBudget.ts` has three levels (`low`/`medium`/`high`) and a pool cap.
- `docs/research/whitewater-sources.md` is sourced, and already carries the number for this: the **splash-up takes σ ≈ 0.3 of the landing jet's volume** (Peregrine 1983; Kiger & Duncan 2012), along with the air-entrainment share, the plume depths and the bubble rise speed.

The coordinator guessed from this that **"the question is not 'build a particle system' but 'why does the one we have not reach the screen'"**, and offered two suspects: the sea's lip impacts never firing under `?wave=library`, or firing and not reaching a camera. **Step 5g read it, and neither holds.** Over 600 frames of the 2 m Barrel the sea's own `PlungingLip` reported **1234 landings in 517 of them**, the cloud carried a median of **1525 live particles**, and **1385 of 1390 were inside the frustum** of the very camera step 5d used; the library leg and the default leg report the same sea twice (1234 vs 1258 landings, 37.26 vs 38.86 m³), because `?wave=library` draws over the sea without writing to it.

**The fault is height.** The highest spray or mist particle in any of those 600 frames was **2.05 m, median 1.62 m**, on a wave whose crest stands **1.41 m** — against the 0.55–0.70 H above the crest this reference asks for. Nothing in the game lifted a drop after it was thrown. `?lipVeil=on` (step 5g) is the first answer to that; what it does **not** yet fix is item 2's translucency, which is the next round's first job.

## The owner's own stills, for the contrast

`../pool-look-reference-2026-11-11/owner-build-sheet.jpg` is the owner photographing their screen. The lip meets the water and **nothing is thrown at all** — no drops, no mist, no spray line, just a smooth white edge. That is the gap this reference is meant to close.

## Where the two rounds since have got to

- **5g** (`../wave-strategy-alternatives/c2-step5g.md`) fixed the **height and the place**: `?lipVeil=on`, opt-in, put 95 % of the veil's drawn optical area below 2.40 m against the 2.2–2.4 m this file's ratio asks of our 1.41 m crest, and moved the cloud onto the break. It left the **material** wrong — a scatter of opaque dots.
- **5h** (`../wave-strategy-alternatives/c2-step5h.md`) fixed the **material**: each sprite's alpha now comes from the water it stands for, so sprites that overlap add optical depth instead of stacking discs. Measured against a perfect control (the same frame with and without the switch), the veil now **attenuates** its background where 5g's **added structure to it** — sd ratio 0.77–0.92 against 1.01–1.04, and 1.31 against 2.03 over the pool wall. It also says plainly what is still wrong: **the veil's body standing over the crest is about ten times too thin to read**, and no constant fixes that, because translucency and sprite count pull against each other.
- **5i** (`../wave-strategy-alternatives/c2-step5i.md`) took **item 4**, which 5h measured and recommended over both
  of them: `?foamAlbedo=on`, opt-in, levels the foam's albedo to the sourced **0.50** of an active whitecap and ages
  it to **0.18**. On this frame's own geometry the near-white share of the broken region falls from **83.5 % to
  18.7 %** against this photograph's **14.6 %**, and the within-frame ratio from **1.310 to 1.102** against its
  **0.748** [M]. Item 4's relief partly follows: the local variation over 8 px tiles goes 2.98 → **4.93** against
  **5.05** here, while the region's large-scale contrast is still about half. **Item 5 is still open**, and 5i
  refutes half of 5h's reading of it — our flat water does carry a grazing Fresnel sky (`skyReflection.ts`); it is
  0.80× this photograph's for some other reason, untested.
