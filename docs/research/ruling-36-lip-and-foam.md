# Ruling 36: the lip's thickness and the foam (2026-11-13)

Advisor: this session. Read: `water-physics/lip-thickness-and-foam-2026-11-13.md`. No run.

Asked because the owner said: *"the body of the wave itself is quite thin in some waves a lot of it is foam. That foam
gives the appearance that the wave is thicker than it is. The game engine should not generate a thick tube."*

## The answer: the owner is right about the drawing, and the cause is not the one we assumed

- **A real falling lip is clear water, and there is a lot of it.** Air comes in at impact, not before. Our jet's area
  (0.158 H²) sits inside the measured range (0.012–0.266 H², Pick & Feddersen 2026, a model that neglects surface
  tension and air entirely). **So our lip's water is not too thick.**
- **Clean water that thick is see-through.** Over 0.20 m it transmits 98.9 % of green light. A real 20–40 cm lip is
  glass with a green bias.
- **Where a wave is white it is 60–99 % air**, and the whole white signal is matched by an equivalent water film of
  **0.099 mm**. About **2 cm of foam is already fully opaque**. So the owner's reading is right: the white is thin and
  it is what makes the wave look thick.
- **Therefore our lip reads thick because of how it is shaded, and because its sheet is short and fat — not because of
  its water.** The complaint is a rendering fault, which is good news: it is free to fix.

## Decisions

1. **No Bo 4000 run for the look.** The capillary excess is π·l_c: 0.50 m at Bo 1000, 0.25 m at Bo 4000, and 8.5 mm for
   real sea water. A day of the owner's M4 buys half of a 58× error while the complaint is shading, the foam work is
   needed anyway, and a lone Bo 4000 case cannot ship inside a Bo 1000 family. **Ruling 34's one-case plan is
   withdrawn for this purpose, and `docs/RUN-ON-M4.md` §4 is marked not to run.**
2. **One reason to revisit it remains, and it is the owner's,** on a different ground: Bo 4000's void is 1.5–2.8×
   bigger, which is a **rideability** lever against the owner's own 2026-11-12 complaint that the surfer falls when
   touching the tube. If they want that, ruling 34's one case first still applies. It is not a look question and must
   not be sold as one.
3. **Water turns white at a time, not at a thickness.** The slice's own touchdown is the key. `LIP_FRAY`'s
   white-under-4-cm rule is the wrong key physically, **and it is the cause of the lane-to-lane steps in the lip's
   white edge** that step 3b could not remove. One change answers the owner and a standing bug.
4. **The drawing recipe is accepted as written** (§3 of the consult): no white coat on the outer sky face; a torn
   fringe over the last 10–25 % of the arc, growing from nothing at the throw, albedo 0.36–0.55, ligaments 2–4 cm
   apart; a translucent green-cyan underside, brightest behind the tip; opaque white only behind the open curl, ageing
   0.55 → 0.41 over 1 s → 0.16 by 10 s; milky turquoise for aerated-but-not-foam; and **no white layer thicker than
   about 2 cm anywhere**.
5. **A correction to our own record:** `correct-shape.md`'s "mean thickness 0.05 / 0.12 / 0.2–0.27 H" is inferred from
   an area divided by an arc, not measured, and it averages in the thick root. The falling curtain is thinner than
   that mean. Marked there.
6. **The free geometry lever stays available:** the underside cut, one capillary length (0.158 m), which Mostert's
   formula now justifies rather than the hand-waving ruling 23 used. It is not needed for the look and is not ordered.

## Decision: step 5a, the lip and the curl's look (a fresh agent; effort high)

Render only. No change to the solver, the library, the flow or the rider.

1. Replace the thickness key with the time key, and check the lane steps against step 3b's own stills.
2. Build the recipe's five materials, each with its own look, and never one white for three of them.
3. **Bars:** the owner's size cue reads right (a 2 m wave's lip must not read as a 4–6 m slab); you can see the
   shoulder and the sky through the curtain; the tube does not go dark; the white edge is torn, not ruled; no white
   layer over about 2 cm; the lane-to-lane steps in the white edge are gone; `?wave=library` off is byte-identical;
   the page's draw cost does not grow by more than 1 ms.
4. Stills before and after, the same shots as step 3b, plus one from inside.

Step 5b keeps the hand-back, the set-up and the bore's own foam.
