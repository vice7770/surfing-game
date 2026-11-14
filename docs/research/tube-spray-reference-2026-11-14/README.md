# The tube's spray — the owner's reference and what it asks for (2026-11-14)

`owner-abu-dhabi-side-on.webp` is the owner's own reference, given on 2026-11-14 with these words:

> **"For the waves — I want a big part to be foam and particles to complement the wave contact with the water. the real picture I shared or the video really shows the foam side on the water in the tube hitting the water. I would like to have foam particles for realism."**

and, sending the picture:

> **"here is a picture of the Abu Dhabi, on the side so you understand the wave size and the particles from the tube explosion"**

It is a side-on photograph of Surf Abu Dhabi — the same pool the 2 m Barrel is matched to (see `../pool-wave-reference` in memory, and `../pool-look-reference-2026-11-11/`). The owner chose a side-on frame deliberately, so **the wave's size and the spray's size are readable against each other in one picture**. That is the whole point of this reference: it is a scale drawing, not a mood board.

**This file is the target. Measure against it; do not redecorate from it.**

## What the picture shows

Read off the frame, with the trough-to-lip face as the ruler. Items 1 and 2 were the coordinator's reading by eye and were **re-measured from the pixels by step 5g** (`../wave-strategy-alternatives/c2-step5g-runs/reference.txt`, scripts beside it): the figures below are now `[M]`, and **both of the coordinator's were wrong in the same direction**. Items 3–5 are still read by eye, `[I]`.

1. **The wave.** A clean teal barrel, surfer crouched inside with the lip pitching over his head. Trough to lip is **274 px**, so the pool's own 2 m gives **137 px per metre**. (The coordinator's eye said 230 px / 115 px per metre — 19 % small, and it propagated into item 2, because every height here is quoted as a share of this ruler.)

2. **The spray veil — this is the ask.** A dense, **fine**, **translucent** mist is thrown up and back off the breaking lip. Over the barrel its top stands **142–159 px above the teal crest = 0.52–0.58 H**, and that depends on where you put the edge: at a threshold of 70 of 255 it reads **0.69 H**, at 100 it reads **0.55 H**. So the honest figure is **0.55–0.70 H above the crest**, not the 0.8 H the coordinator wrote. **Translucent, with a number:** across the pier band the veil lifts the background's mean from **41 to 131 of 255 while leaving its absolute variation intact** (sd 23.5 → 29.4), so RMS contrast falls 0.57 → 0.22 — an optically thin cloud of small scatterers, **τ ≈ 0.1–0.25** along the ray, not a white mass at a fixed alpha. That is a target a renderer can be held to, and it is the one number in this file worth more than the rest. The veil does trail back over the broken section, but **how far cannot be measured from this frame** — the coordinator's "tens of metres" is withdrawn.

3. **Where it comes from, and where it is not.** The veil sits **over and behind the breaking lip and the broken section**. There is **none over the clean face ahead of the curl** — that water is smooth, unbroken blue. This matters, because the owner's earlier complaint about the wave was the opposite fault: *"the body of the wave itself is quite thin in some waves a lot of it is foam."* The reference shows the discipline — **spray and foam only where the water has actually broken, and a great deal of it there.**

4. **The broken foam itself is lumpy and shadowed**, with a defined edge against the blue and visible relief on top — not a flat white band, and not a field with holes in it. Compare `../wave-strategy-alternatives/c2-step5d-stills/foam-on-bore-face.jpg`, where the same region draws as a flat pale mass with blue holes punched through it and a hard dithered rectangular edge.

5. **The flat water in front is glassy** — long soft mirror reflections, very little surface texture. Ours draws a strong caustic web over the same water. Not this round's job; logged because it is the clearest look difference in the frame after the spray.

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
