# Is the lip thin water in a coat of foam? (2026-11-13)

The owner's claim, from video and photographs: *"the body of the wave itself is quite thin; in some waves a lot of it
is foam. That foam gives the appearance that the wave is thicker than it is. The game engine should not generate a
thick tube."*

**Short answer: the owner is right about what we draw, and half right about why.** Where a wave is white, the stuff is
60–99 % air by volume and the water in it is a film; and a real sheet of water 0.2 m thick is *see-through*, not pale.
But a plunging lip before it lands is not foam: it is clear water, and its total water is not small. Our lip is wrong
because the water is in the wrong **shape** (short and fat instead of long and thin) and is **shaded as a solid**, not
because the wave carries less water than we give it.

Marks: **[M]** measured in a source opened here; **[S]** sourced but read through a review, an abstract or our own
earlier note; **[R]** reasoned; **[P]** provisional.

---

## 1. The water in a plunging lip, from the throw to touchdown

| Quantity | Value | Source |
|---|---|---|
| Water area in the overturning jet at touchdown | **A_J/H² = 0.012–0.266**, rising steeply with bed slope | [M] [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf), fig. 9a and eq. 3.8 |
| What that model contains | Fully nonlinear potential flow. **Surface tension neglected; no air phase** ("Field-scale surface gravity waves have very large Bond numbers … so we neglect surface tension") | [M] same, §2 |
| Our own library at touchdown | 0.158 H² (Bo 4000, L14); 0.185 H² (Bo 1000, L13) | [M] `pool-lip-and-flow-2026-11-13.md` §1.4 |
| Mean thickness over the jet's arc | A_J divided by an arc of about 1.0–1.3 H → **0.01–0.22 H**. The 0.05 / 0.12 / 0.2–0.27 H figures on `correct-shape.md` are this conversion, **inferred, not measured**, and they are a *mean over the arc including the thick root* | [R] |
| Thickness at the tip, 0.1 s after the throw | 0.040–0.041 m = **0.045–0.046 H**, the same at Bo 1000 and Bo 4000 | [M] `pool-lip-and-flow-2026-11-13.md` §1.4 |
| Lab deep-water plungers: the whole crest pocket under the jet at impact | Q_i = 2222–4134 mm² on H_i = 84–91 mm → **0.31–0.50 H²** (jet *and* void together) | [M] [Erinin et al. 2023, JFM 967 A35](https://arxiv.org/pdf/2210.01925), table 2 |
| Air inside the falling jet, before touchdown | **essentially none.** Entrainment happens *at* impact: the cavity under the jet holds 62–74 % of all the air the wave entrains | [S] Blenkinsopp 2007 thesis, our [round-7 note](notes/round7-blenkinsopp/blenkinsopp-thesis.md) |
| After touchdown: plume peak mean void fraction | **17.5 %** plunging, 13 % spilling | [S] same |
| After touchdown: above the water, in the whitecap itself | **void fraction 60–99 %**, so the liquid is 1–40 % of the volume | [M] [Dierssen 2019, Front. Earth Sci. 7:14](https://www.frontiersin.org/articles/10.3389/feart.2019.00014), §"Bubble clouds", citing Melville 1996 and Blenkinsopp & Chaplin 2007/2011 |
| What the eye takes for "the surface" of a breaking wave | the **50 % void-fraction contour**, because there is no free surface in an aerated flow | [M] Dierssen 2019, fig. 6 caption (Blenkinsopp & Chaplin's probe data) |

**So, separating the two things the owner joined:**

- **The falling curtain of a first break is clear water.** Its water *area* is real and is not small (0.01–0.27 H²). A
  surfer looking up through a clean barrel's curtain sees the sky through it — that is water, not foam.
- **Everything the lip has already landed on is mostly air.** Behind the open curl, the ceiling, the pile, the roller
  and the splash curtain are 60–99 % air above the water line, dropping to ~17 % mean in the plume below. On a peeling
  wave the lip a few metres down the line is fed partly by this material, so for most of a real wave's length the
  owner's "a lot of it is foam" is simply correct.

## 2. Is the apparent thickness mostly air? And why a thin white layer looks solid

If we draw a lip 0.2 H across (0.4 m at H = 2 m):

- As the **clear falling curtain**: the water really is ~0.4 m of water, void fraction ~0. Drawing it as water is right.
  But a 0.4 m sheet of water is almost transparent. Pure water's absorption is a = 0.0092 m⁻¹ at 450 nm,
  **0.0565 m⁻¹ at 550 nm** and 0.340 m⁻¹ at 650 nm [M, [Pope & Fry 1997](https://omlc.org/spectra/water/abs/pope97.html),
  data file read]. Over 0.20 m that is **99.8 % / 98.9 % / 93.4 %** transmitted; over 0.40 m, 99.6 % / 97.8 % / 87.3 %
  [M, arithmetic]. **A real 20–40 cm lip is glass with a green bias.** Our drawn lip is 0.21 m across (ruling 23b) and
  reads as a pale slab, so the fault is the shading, not the thickness.
- As **whitecap**: the water in it would be 1–40 % by volume [M, Dierssen], i.e. 4–160 mm of water spread through
  0.4 m — up to two orders of magnitude less water than a solid slab.
- **How little foam reads opaque.** Dense foam reflects ~55 % in the visible; **one bubble layer reflects ~10 %**, and
  a stack of **more than 25 uniform bubble layers** already gives the full ~55 % [M,
  [Koepke 1984](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf) §III, after
  Whitlock et al. 1982]. With whitecap bubbles 0.16–1 mm across [M, Dierssen], 25 layers is **4–25 mm** [R]. Dierssen's
  fit of real whitecap spectra needs an equivalent water film of only **0.099 mm** to make the whole white signal [M].
  Independently: at void fraction 0.2 with 1 mm bubbles the scattering mean free path is ~1.7 mm and the transport mean
  free path ~1 cm, so a few centimetres is optically saturated [R].

**Reading:** a foam layer **about 2 cm thick is already fully opaque white**, and clean water 20–40 cm thick is nearly
clear. That is exactly the illusion the owner describes: in a photograph a 2 cm skin of bubbles reads as a solid body,
while the real body of water next to it reads as air. We have been fixing the wrong quantity.

## 3. How it should be drawn

By landmark on the drawn profile (`LANDMARK` in `src/scene/barrel/brokenCrest.ts`), and by the slice's age.

| Where | What it is | How to draw it |
|---|---|---|
| Outer (sky) face, crest → tip | unbroken water | **No white coat.** Sky reflection plus transmission; tint from the 550/650 nm absorption above, so a 0.2 m sheet loses ~1 % green and ~7 % red. White only as (a) the crest's feather line above the lip, (b) wind streaks |
| The tip's fringe, last 10–25 % of the arc | ligaments and drops, not a surface | Albedo **0.36–0.55** (Dierssen's field fit 0.36; Koepke's fresh dense foam 0.55), lit from both faces — `LIP_FRAY_VOLUME` already does this. Ligaments spaced **10πσ/(ρ_a U²) ≈ 2–4 cm** at a lip speed of 7–10 m/s through the air [R, the Squire relation our board spray already uses]. Drops ahead of the tip |
| Underside, tip → throat | thin backlit water | Translucent green-cyan, brightest just behind the tip (light through the thin part), darkening into the throat. Streaks only |
| Ceiling behind the open curl | already landed: 60–99 % air | **Opaque** diffuse white, not translucent water: above 70 % air it is a closely packed scattering medium, not a liquid [M, Dierssen/Kokhanovsky]. Reflectance 0.55 fresh → 0.41 mean over 1 s → 0.16 by 10 s [M, Koepke] |
| Aerated but not white: pile flanks, splash curtain, roller body | void fraction 0.13–0.4 | Milky turquoise, brighter and greener than clean water, white only where the surface foam is dense ([roller-build.md](roller-build.md)) |
| White layer thickness, anywhere | — | **2 cm is enough.** Never build a thick white shell |

**Where water ends and foam begins:** not at a thickness, but at a **time**. A slice is clear until its own touchdown,
then white from the impact outwards. Along the crest that puts the clear curtain over the open curl — about
2.6 H/tan α of crest ([along-the-crest.md](along-the-crest.md)) — and white behind it. This is the biggest real
contrast inside a barrel and we do not draw it.

**Throw → touchdown:** τ = 0, tip 0.045 H, clear, white only at the feather [M]. τ = 0–0.5, the sheet stretches, the
torn fringe grows from the tip (Erinin's LIF shows transverse instabilities of the falling jet; run-to-run tip scatter
3 mm on a 9 cm wave, against ≤1 mm everywhere else [M]). Touchdown: spray burst inside 0.4 s (Chanson 2002), the
cavity takes 62–74 % of the wave's air [S], the slice turns white.

**One consequence for the code:** `LIP_FRAY` keys white on the sheet's **thickness** (full white under 4 cm, none over
15 cm; `src/scene/barrel/brokenCrest.ts:53`, flagged provisional there). Physically white belongs to **stretch, tearing
and age**, not to thickness — and keying it on thickness is why the white edge steps lane to lane (ruling 34: a 9 cm
thickness step at lanes 6/7 becomes near-white against half-white). `lipFoamAt` already takes `stretch` and `after`.

## 4. The Bond-number rerun: **no**

Not worth a day of the owner's M4 for the lip's look. Five reasons:

1. **It cannot reach real water.** Mostert, Popinet & Deike give the capillary excess in the overturn explicitly: the
   cavity's major axis is p ≃ 3^¼(h − π l_c), i.e. the jet steals about **π l_c** of width, and they state plainly that
   at moderate Bond number "the jet at impact appears thinner" only as Bo rises and that moderate Bo "leads to a jet
   thicker than observed in the laboratory" [M, [arXiv 2103.05851](https://arxiv.org/pdf/2103.05851) §4]. Their Bo is
   ours (`f.sigma = 1/BO`, h0 = g = ρ = 1, `tools/basilisk/periodic.c:124`), so at h0 = 5 m: **π l_c = 0.50 m at
   Bo 1000, 0.25 m at Bo 4000, and 8.5 mm for real sea water** (Bo ≈ 3.4 million) [M, arithmetic]. Bo 4000 removes half
   of a 58× error.
2. **The geometry is not what the owner is seeing.** Our own ruling 23b measured the drawn lip at 0.21 m and found what
   reads thick is the pale **outer face**; and §2 above says a 0.2 m sheet of water should be see-through. Taking
   20–45 % off the mid sheet while the shading stays opaque will not answer "too thick for the size of the wave".
3. **The foam work is needed either way**, and the recipe in §3 is the same over a 0.22 m core as over a 0.37 m one.
4. **Cost and side effects:** ~13 h a case, so 1–2 days of the M4 for nine; a single Bo 4000 case cannot ship inside a
   Bo 1000 family (ruling 34); fragments per frame rise 27 → 49, which the renderer must then carry [M].
5. **The free version of the same correction exists.** Rank 4 of the lip-look study (`?lipCap=off-underside`: take up
   to one capillary length off the underside, floor 2 cm) is now better justified than when it was written — Mostert's
   π l_c says the excess is 0.50 m, so removing 0.158 m is **conservative**, it costs no compute, and it grows the void.

**The one thing that would reopen it** is not the look: Bo 4000 opened a void **1.5–2.8× bigger** at matched stage [M].
That is a rideability lever (tube mouth, ceiling height) against the owner's "the surfer falls when touching the wave
tube part". If the orchestrator wants it for that reason, ruling 34's plan stands: one case first (`b2_a2`), measured
against its own twin. **Priority between look and void is the owner's call, not mine.**

## 5. What we would get wrong by coating today's lip in foam

1. **It stays opaque.** Real lips are see-through at these thicknesses (99 % of green over 0.2 m). A white coat on a
   solid core kills the cue surfers read first: the shoulder and the sky seen *through* the curtain.
2. **The tube goes dark.** A barrel's inside light comes through the curtain. Paint the curtain and the rider is in a
   cave; our navy-throat problem returns by another route.
3. **The white sits in the wrong place and has the wrong edge.** Keyed on thickness it lands wherever the mesh happens
   to be thin and steps lane to lane. A surfer reads a lip's edge as *torn*: a ragged fringe with ligaments a few
   centimetres apart and drops thrown ahead of it, never a smooth ruled band.
4. **No feather and no spit.** The only white on a real lip *before* it lands is the wind-blown feather above the crest
   line and, inside a barrel, the spit out of the mouth. A coat on the sheet gives neither.
5. **The size cue breaks.** Lip thickness is how a surfer judges a wave's weight. 0.4 m of lip at H = 2 m says "heavy
   4–6 m reef slab" while the period and speed say 2 m. That mismatch is precisely the owner's complaint.
6. **One white for three materials.** Clean water, aerated water (void 0.13–0.4, milky turquoise) and dense foam
   (opaque, ageing 0.55 → 0.16 in 10 s) are three looks. One flat white is the "foam reads as paint" problem again.
7. **The best contrast in a barrel is lost.** Clear over the open curl, white behind it. Coat everything and the fresh
   curtain and the week-old ceiling look alike.

## What I could not open

- **Blenkinsopp & Chaplin 2007** (Proc. R. Soc. A 463, 3151) and the **2007 thesis** PDF: Southampton's ePrints now
  serves a challenge page (403). Their numbers here come through our own [round-7 note](notes/round7-blenkinsopp/blenkinsopp-thesis.md)
  (read in full on 2026-10-03) and through Dierssen 2019, which reproduces their probe cross-section. [S]
- **Lim et al. 2015** and **Na et al. 2016** (JGR Oceans, void fraction with bubble image velocimetry in a deep-water
  plunger): Wiley and the mirror both refuse. Their crest-phase void fractions (reported second-hand as 0.8–0.99 at the
  crest, 0.2–0.3 at the trough for deep-water breakers, against ~0.2 maximum at still-water level in the surf zone)
  are **not used** in §1 for that reason.
- **Kiger & Duncan 2012** (Annu. Rev. Fluid Mech. 44, 563): the only full text found is behind the same mirror. Not
  cited.
- No source was found that measures the **water** thickness of a *field-scale* lip. Everything above is lab scale
  (H ≈ 0.1 m), FNPF, or DNS; the scaling to a 2 m wave is [R].

## Sources opened for this page

- [Pick & Feddersen 2026, JFM 1040 A8](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf) — overturn and
  jet areas, FNPF, surface tension neglected.
- [Mostert, Popinet & Deike 2022, JFM 942 A27](https://arxiv.org/pdf/2103.05851) — the capillary thickening of the jet,
  p ≃ 3^¼(h − π l_c).
- [Erinin, Liu, Wang & Duncan 2023, JFM 967 A35](https://arxiv.org/pdf/2210.01925) — LIF profiles of three lab
  plungers, table 2, tip repeatability.
- [Dierssen 2019, Front. Earth Sci. 7:14](https://www.frontiersin.org/articles/10.3389/feart.2019.00014) — whitecap
  reflectance, the 60–99 % above-water void fraction, the 0.099 mm equivalent water film, the 50 % void contour as the
  apparent surface.
- [Koepke 1984, Appl. Opt. 23, 1816](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf) —
  55 % dense foam, 10 % for one bubble layer, >25 layers to saturate, the ageing curve.
- [Pope & Fry 1997, Appl. Opt. 36, 8710](https://omlc.org/spectra/water/abs/pope97.html) — pure-water absorption
  spectrum (data file read, values per cm).
