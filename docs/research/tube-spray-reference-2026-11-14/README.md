# The tube's spray — the owner's reference and what it asks for (2026-11-14)

`owner-abu-dhabi-side-on.webp` is the owner's own reference, given on 2026-11-14 with these words:

> **"For the waves — I want a big part to be foam and particles to complement the wave contact with the water. the real picture I shared or the video really shows the foam side on the water in the tube hitting the water. I would like to have foam particles for realism."**

and, sending the picture:

> **"here is a picture of the Abu Dhabi, on the side so you understand the wave size and the particles from the tube explosion"**

It is a side-on photograph of Surf Abu Dhabi — the same pool the 2 m Barrel is matched to (see `../pool-wave-reference` in memory, and `../pool-look-reference-2026-11-11/`). The owner chose a side-on frame deliberately, so **the wave's size and the spray's size are readable against each other in one picture**. That is the whole point of this reference: it is a scale drawing, not a mood board.

**This file is the target. Measure against it; do not redecorate from it.**

## What the picture shows

Read off the frame, with the trough-to-lip face as the ruler. These are the coordinator's reading at 1280 × 720, to be re-measured properly by the round that builds this — they are `[I]` until then.

1. **The wave.** A clean teal barrel, surfer crouched inside with the lip pitching over his head. Trough to lip is about 230 px; taking the pool's own 2 m gives roughly **115 px per metre**. Consistent with the 2 m Barrel we already build.

2. **The spray veil — this is the ask.** A dense, **fine**, **translucent** mist is thrown up and back off the breaking lip. It rises about **180 px above the lip, ≈ 0.8 of a wave height**, so it reaches roughly **twice the wave height above the trough**; and it trails back over the broken section for most of the frame's width — tens of metres, not a puff at the impact point. **The pier's verticals are clearly visible through it.** So it must draw as many small translucent things, not as white geometry: anything opaque will read as a wall and anything coarse will read as the blue-holed blob step 5d already produced.

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

**So the likely question is not "build a particle system" but "why does the one we have not reach the screen on this wave".** `?wave=library` replaces the whole breaking zone with library slices, so the sea's own plunging-lip impacts may never fire there at all — and step 5d has already shown once that a field which demonstrably changes can reach 57 pixels of one camera. Settle which it is with a read before building.

## The owner's own stills, for the contrast

`../pool-look-reference-2026-11-11/owner-build-sheet.jpg` is the owner photographing their screen. The lip meets the water and **nothing is thrown at all** — no drops, no mist, no spray line, just a smooth white edge. That is the gap this reference is meant to close.
