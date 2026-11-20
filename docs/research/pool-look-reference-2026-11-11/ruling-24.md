# Advisor ruling 24: the lip's pale outer face

Water-physics advisor, 2026-11-12. Text only; no run, no file. Seen: `step10/still-cap-front-90s.jpg` and `step10/still-cap-front-sunset-90s.jpg`. Read on origin/main: `src/scene/barrel/SweptBarrelMesh.ts` (`sweptSheetBody`, `RICH_LIP_GLOW`, `RICH_SHEET_BODY_NORMAL`), `lipLook.ts`, `brokenCrest.ts`. The advisor did not open the other stills or the reference sheet.

Tags: [C] code; [V] seen in the stills; [M11] step 11's print; [R] reasoned; [P] provisional.

**Why it was asked.** The owner called the falling lip a "gap" and "too thick for the size of the wave", and asked for foam on the wave. Ruling 23b found the hand cut cannot show, and that what reads as thick from the front is most likely the lip's pale outer face.

## 1. Why the lip reads as a pale slab

- **Cause: the whole outer face is shaded as a thin sheet lit from behind, but it is 0.21 to 0.25 m of water [M11].**
- In `sweptSheetBody`, wherever the sheet weight is 1 [C]:
  - the wall's column colour is replaced by a thin sheet's own backscatter, which is small at this thickness;
  - the light behind the sheet (`sweptBack`: sky or the lit back wall) is added, dimmed only by `exp(−c · thickness)`. Over 0.2 m of clear water that is close to 1 [R].
- So the lip is drawn nearly clear, with a bright backdrop. That is the "gap".
- `RICH_SHEET_BODY_NORMAL` also bends the normal to the slice's mean normal [C]. The band has no shading across it, which makes it a flat slab.
- In the stills [V]:
  - The band is paler than the wall and of one tone from crest to tip.
  - At sunset it stays pale blue while the sky is grey-orange. So it is not a mirror of the sky; it is the light added through the sheet.
  - The thin line on its lower edge turns orange at sunset. That is the fray's white, lit by the sun. The white edge already exists and is thin.
- **How sure:** fairly sure of the term, about 70 %. The terms were not split in a run. The stop rule covers the other 30 %.
- A real lip seen from the front, sun behind the viewer, is dark glass like the wall with a white edge. It only glows when the sun is behind it [R].

## 2. The one change: thick water on the lip is wall, thin water is sheet

Render only, Rich look, under `lipLook=fray`.

1. In the fragment, when fray is on, add:
   `float sweptThin = 1.0 - smoothstep( 0.06, 0.20, vSweptSheet );`
   `float sweptLipW = vSweptSheetWeight * mix( sweptThin, 1.0, clamp( vSweptThroat.w, 0.0, 1.0 ) );`
2. Use `sweptLipW` in place of `vSweptSheetWeight` in four places:
   - the `waterBody` mix in `sweptSheetBody`;
   - the back-light emission line in `sweptSheetBody`;
   - `RICH_LIP_GLOW_GATED`;
   - the mean-normal mix in `RICH_SHEET_BODY_NORMAL`.
3. Leave `LIP_FRAY_VOLUME` and `vWaterFoam` as they are.

- **What it does.** Over 0.20 m across, the outer face takes the wall's own column colour and its own normal: dark glass, as the wall above it. Under 0.06 m it is the lit sheet as today. The fray's white (full under 0.04 m, none over 0.15 m) sits inside that thin part, so the lip ends in a thin white edge.
- **The inner face keeps today's look.** That is what `vSweptThroat.w` is for: the lit lip seen from inside the tube does not change. The builder must confirm that this varying is the inner face's weight; the advisor read it only from the comment at `RICH_LIP_GLOW_GATED`.
- **Numbers.** 0.06 and 0.20 m are [P]. They are chosen so the measured 0.21 to 0.25 m lip is fully wall-like and the fray's white range stays sheet-like.
- **Classic:** not touched in this build.
- **Not touched:** geometry, contact, sea, throws.
- **`lipLook` off:** the shader text is byte-equal; add a test for it.

## 3. Bars, from the same two headless stills as step 10

Use a mask render of the same frame: the lip's outer face = sheet weight ≥ 0.5, foam < 0.2, not the inner face.

- **P1.** Mean brightness of the lip's outer face over the mean brightness of the clean wall just ahead of the tube (same height band, within 3 m). Aim 0.85 to 1.15, at midday and at sunset. Today it is about 1.4 to 1.6 by eye [V]; print today's value first.
- **P2.** The white edge is still there: its brightest row at least 1.5 times the lip face's mean; its width 2 to 8 px at 1280 px wide.
- **P3.** A still from inside the tube (any existing inside view): the lip's inner face is pixel-equal with the change on and off.
- **P4.** With `lipLook` off: stills pixel-equal to step 10's.
- **P5.** Frame cost on the fps trace: no change beyond noise.

**Stop rule:** one build. If P1 still reads over 1.15, do not tune the numbers. Print the lip's mid-band pixel split into body, back light, glow and mirror terms, and hand back.

## 4. Do not

- Do not darken the tip or cap the fray's white.
- Do not touch the inner face.
- No noise in time; no new sheets or particles (the owner's fps fell near the tube).
- Do not change `tubeLook=merge`, the wall's own shading or the sea's.
- Do not make the lip darker than the wall.

## 5. Where this sits

- It is new: a correction to part 1 and to ruling 10's "designed-light lip". It is none of ruling 9's parts 2 to 5.
- Left for "foam on the wave" after it: the toothed tip, the drops off it, the crest's white veil, and the white pile and foam trails after touchdown.
- Which of these the owner means by "foam on the wave" is the owner's to say.
