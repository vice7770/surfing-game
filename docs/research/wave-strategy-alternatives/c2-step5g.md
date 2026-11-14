# C2 step 5g: the spray does fire, it is just a metre too low (2026-11-14)

Tags: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.

The brief put two candidates on the table — the spray **never fires**, or it **fires and does not reach the screen** —
and said to settle which before planning anything.

**Neither. In one line: the spray fires, and it reaches every camera; its fault is that it is a metre too low, too
coarse and too opaque, because nothing in the game lifts a drop after it is thrown.**

Over 600 frames (20 s) of the 2 m pool Barrel, the sea's own `PlungingLip` reported **1234 landings in 517 of them**,
and the cloud carried a median of **1525 live particles**, of which **1385 of 1390** were inside `curl-behind`'s
frustum in the frame step 5d used [M]. What it does not do is rise: the **highest spray or mist particle in any of
those 600 frames was 2.05 m, median 1.62 m**, on a wave whose crest stands **1.41 m** over the still water [M]. The
owner's reference puts the veil's top **0.55–0.70 of a crest height above the crest** [M, re-measured below], which
on our wave is 2.2–2.4 m. Our spray never gets above the lip at all.

| | |
| --- | --- |
| **Answered** | it fires and it draws (§1). The brief's premise, and the reference README's, are both wrong, and so is `?wave=library` as a suspect: the library leg and the default leg report **the same 1234 landings and the same 37.26 m³** [M] |
| **Re-measured** | the owner's photograph, from the pixels (§2). The coordinator's `[I]` reading is corrected: the wave is **274 px**, not 230, so the veil's **0.8 H becomes 0.55–0.70 H**; and the translucency now has a number — the veil lifts the pier's mean luminance 41 → 131 of 255 while **leaving its absolute variation intact** (sd 23.5 → 29.4) |
| **Asked** | the water-physics advisor, who opened Erinin et al. 2023 and Mostert et al. 2022 and answered: **the veil is not ballistic** — no measured launch speed can throw a drop that can hang there (§3). Logged in `docs/research/water-physics/consult-log.md` |
| **Built** | `?lipVeil=on` (§4), opt-in: Erinin's two post-impact droplet regions at their measured shares, angles and speed law, a third size class for the 0.2–1 mm band that carries most of the veil's optical area, and the breaker's own updraft, which is the part that is provisional and calibrated |
| **Moved** | the veil's **body** from 1.58 m to **2.40 m**, into the 2.2–2.4 m band the reference's own ratio asks of our 1.41 m crest; its **tail** overshoots at 3.5–4.7 m; and the cloud moved onto the break, its median distance to a landed slice 19.8 → 9.4 m (§5) |
| **Shown** | §6: stills, veil on against veil off, on the same held frame — and the plain reading that the height and the place are right and **the material is not** |
| **Default** | **unchanged.** The switch is off by default and nothing outside it moved; the Canyon byte check is in §6 |

---

## 1. The read: it fires, and it reaches the cameras

### 1.1 One frame first, and why one frame was nearly a fifth wasted round

The first probe read the single held frame step 5d's stills came from (t 72 s, `--compute=gpu`, the owner's ride
address with `?wave=library`), and reported **1390 live particles and `0` sea lip landings**. Taken on its own that
reads as "the library's wave throws nothing and the sea under it does not plunge" — a clean, wrong, publishable
sentence. **1234 landings in 517 of the next 600 frames say the zero was a frame between landings** [M]. The series
probe (`c2-step5g-series.js`) exists because of that, and every count below is a population.

### 1.2 The population

`c2-step5g-series.js` steps the held sea 600 times at 1/30 s and samples the page's own snapshot each step: the live
spray by kind, the sea's lip landings in that step (`snapshot.lipHits`, which the sound already carries), and the
highest particle. Two legs, the owner's ride address with and without `?wave=library`:

| over 600 frames (20 s) | `?wave=library` | the default sea |
| --- | --- | --- |
| sea lip landings | **1234**, in 517 frames | **1258**, in 524 frames |
| the water they landed with | 37.26 m³ | 38.86 m³ |
| live particles, median | **1525** | 1602 |
| mean per frame: spray / mist / foam ball / tube spray / tube mist | 1225 / 153 / 106 / 4 / 7 | 1278 / 156 / 111 / 5 / 8 |
| **highest spray or mist, median per frame** | **1.62 m** | 1.65 m |
| the same, 90 % / max over the 600 | 1.81 / **2.04 m** | 1.85 / 2.05 m |

**`?wave=library` is not the suspect.** It changes the landings by 2 % and the spray by 5 %, which is the two legs
being different runs of the same sea, not a mechanism. This is as the code says it should be: `WaveZone`'s own header
is *"The sea runs on underneath, unchanged: nothing here writes the solver"* [C], and `SprayCloud` is fed the sea's
solver, the sea's foam field and the sea's lip impacts — so the library neither adds a source nor takes one away.

### 1.3 And it is not the cameras either

Projecting the 1390 particles of the held frame into each of the stills' own cameras (`c2-step5g-project.mjs`, the
same lookAt/fov/frustum arithmetic step 5d checked against its stills), with each sprite's projected disc summed as an
**upper bound** on what it can paint (no allowance for overlap):

| shot | in front | inside the frustum | nearest, m | covered px, upper bound | % of the frame |
| --- | --- | --- | --- | --- | --- |
| `curl-behind` | 1390 | **1385** | 9.3 | 18 198 | 1.97 % |
| `bore-face` | 1124 | **842** | 9.9 | 11 772 | 1.28 % |
| `curl-close` | 338 | **174** | 4.5 | 28 717 | 3.12 % |
| `curl-ride` | 338 | **174** | 5.8 | 20 813 | 2.26 % |
| `curl-front` | 174 | **174** | 8.7 | 16 383 | 1.78 % |
| `curl-inside` | 1061 | **14** | 1.8 | 38 314 | 4.16 % |
| `curl-channel` | 338 | **174** | 12.2 | 7 089 | 0.77 % |
| `bore-line` / `bore-above` | 776 / 435 | 18 / 18 | 6.0 / 7.8 | 2 213 / 1 749 | 0.24 / 0.19 % |
| `lineup`, `horizon`, `below` | 332 / 10 / 0 | **0** | — | 0 | 0.00 % |

Step 5d's answer for the bore foam was "the cameras miss it". **For the spray it is the opposite**: eight of twelve
cameras hold the cloud, one of them nearly all of it, and the cloud still paints at most 1–4 % of a frame. The
question this round had to answer was therefore never "does it reach the screen" but "why does what reaches it not
look like the photograph", and the answer is in the one number that is not about counting: **the median top is
1.62 m on a wave whose crest stands 1.41 m, where the reference's own ratio asks for 2.2–2.4 m** (§5.1 sets that
ruler out properly — it is a ratio to the crest, and reading it as metres off the photograph is the frame error this
round came closest to publishing).

---

## 2. The reference, re-measured

The brief asked for the coordinator's `[I]` reading of `docs/research/tube-spray-reference-2026-11-14/` to be
re-measured and corrected. It was, from the pixels: `sips` to PNG, then step 5d's own pure-Python PNG reader, scanning
columns for the teal water's top edge and for the glassy foreground. The scripts are in this round's run folder.

**1. The ruler. The wave is 274 px, not 230.** On the clean unbroken right-hand side (x 1080–1260, where no veil and
no crest foam confuse the edge) the teal water's top is y ≈ 311 and the glassy foreground begins at y ≈ 582–589, so
the face is **270–278 px, 274 on the mean** [M]. Taking the pool's 2 m face, that is **137 px per metre**, against the
coordinator's 115.

**2. The veil's top is 0.55–0.70 H above the crest, not 0.8.** Searching up each column from 20 px above the teal
edge for the highest row whose 9-row running mean still beats a luminance threshold the bare pier never reaches:

| threshold (of 255) | the veil's top over the crest, median over x 400–700 | max |
| --- | --- | --- |
| 70 | 0.69 H | 0.74 H |
| 85 | 0.58 H | 0.62 H |
| 100 | 0.55 H | 0.58 H |
| 120 | 0.48 H | 0.57 H |
| 140 | 0.31 H | 0.51 H |

So the figure is not threshold-driven across the range that separates veil from bare pier: **0.55–0.70 H** [M]. The
coordinator's **180 px** is close to the measured **142–159 px**; it is the H that was wrong, and it carries the ratio
from 0.8 down to about 0.6. Above the flat water the top is therefore about **1.6–1.7 H**, not "roughly twice".

**3. It falls away back along the peel.** At threshold 100, over the crest: 0.52–0.58 H across x 440–680 (the barrel),
0.44 H at x 720, 0.34–0.37 H at x 760–840, 0.19–0.22 H at x 880–920, and **nothing at all beyond x ≈ 940** [M].

**4. It is genuinely translucent, and now there is a number for it.** In the pier band (rows 200–300):

| band | mean luminance | sd | RMS contrast (sd/mean) |
| --- | --- | --- | --- |
| clear pier, x 1150–1270 | 41.2 | 23.5 | **0.569** |
| the veil's edge, x 900–1050 | 73.2 | 28.5 | 0.389 |
| under the veil, x 600–900 | 131.2 | 29.4 | 0.225 |
| under its thickest, x 420–600 | 153.5 | 23.2 | 0.151 |

**The veil lifts the background's mean by about +90 of 255 and leaves its absolute variation untouched** (sd 23.5 →
29.4) [M]. That is the signature of an optically thin cloud of many small scatterers, and it is the opposite of what
white geometry does, which drives the sd toward nothing. It is the single most useful number in the picture, because
it is a target a renderer can be held to.

**5. The clean face stays clean, confirmed.** Beyond x ≈ 940 no column has anything over the crest, and the face
below the crest from x 700 to the right edge reads r = 0–3 of 255 — unbroken teal with nothing over it [M].

**6. What could not be measured.** The coordinator's "tens of metres" of trailing veil **cannot be converted from this
frame**: the wave recedes from the camera, so the frame's horizontal scale is not the 137 px/m the vertical has, and
nothing in the picture fixes the camera. What can be said is that the veil covers about **73 % of the frame's width**
(x 0 to ≈ 940 of 1280) and the whole of the broken section that is visible [M]. The metre figure is not ours to quote.

---

## 3. The consult: the veil is not ballistic

The brief's rule sends a shape question to the water-physics advisor before it is settled. The question put was
narrow — *what physically lofts that veil to 0.55–0.70 H above the lip on a windless pool wave, and how big is it?* —
with §1's and §2's numbers supplied so it was not re-derived. The full row is in
`docs/research/water-physics/consult-log.md`; what the round is built on is this.

The advisor opened **Erinin, Liu, Wang, Liu & Duncan 2023** (*JFM* 967 A36, "Plunging breakers. Part 2. Droplet
generation", and Part 1, A35) and **Mostert, Popinet & Deike 2022** (*JFM* 942 A27) and read them, and the answer is
flat: **do not model the veil as ballistic particles.**

**Why it cannot be thrown.** Erinin measured every droplet d ≥ 100 µm crossing a plane above the crest of three
laboratory plungers (λ₀ = 1.18 m, H ≈ 0.09 m, still air): mean droplet speed **0.32–0.44 of the jet's impact speed**,
with a tail to twice it; Mostert's DNS agrees (most at one phase speed, the fastest at three or four) [S]. On our
wave the jet lands at about 6.3 m/s, so the mean is 2.0–2.8 m/s and the tail 12–13 m/s. Carried through quadratic drag
at Gunn & Kinzer terminal speeds, a drop launched at even the tail's 12.6 m/s rises 0.15 m at 0.2 mm, **0.67 m at
0.45 mm**, 1.97 m at 1 mm — against the **1.1–1.4 m** §2 measures. Only millimetre drops can reach it, and they are
2.8 % of the count. And the photograph's own decay (0.62 H at the barrel to 0.20 H some 3.3 m back, 0.47 s at a 7 m/s
peel) implies the **visible** mass falls at about 1.8 m/s — 0.4–0.5 mm drops, which cannot be thrown there at any
measured speed [R from §2's M].

**The decisive evidence is Erinin's own.** They ran their measured droplets *backwards* through gravity and still-air
drag and landed 40 % of 2158 of them on the smooth water ahead of the breaking zone, which they call nonphysical and
"an indication of the need for including the temporally evolving breaker-generated air flow field" [S]. A still-air
ballistic model of exactly this veil has been tried in the literature and it failed.

**What the sources do give, and what they do not.**

| | | |
| --- | --- | --- |
| the two source regions, their count shares and mean directions | I-A at the curl, **32 %** at **81°** from horizontal; I-B over the turbulent zone behind, **46 %** at **56°**, both leaning downstream | [S] Erinin 2023 |
| their region II, the foam wake's bursting bubbles | travels "no more than a few centimetres" vertically — this is the bore spray `boreSpray` already draws | [S] |
| the launch speed | mean **0.32–0.44** of the impact speed, tail to **2 ×** | [S] |
| the size spectrum | N ∝ d^−1.9…−2.4 below d_i = 0.82–1.48 mm, d^−5.4…−6.1 above | [S] |
| integrated to **optical area** — what a sprite stands for | **8 %** under 0.2 mm, **57 %** in 0.2–1 mm, **35 %** over 1 mm | [R] on [S] |
| when the first droplets appear | 110.8 ms after impact, made 25–70 ms earlier; Froude-scaled to a 2 m wave, **0.19–0.52 s**, i.e. 1–4 m behind the curl's tip | [S] + [R] |
| how far forward they may go | mean directions 9–34° downstream of vertical; cap the forward reach near 1.25 H | [S] |
| **the air field over a breaking crest** | **nobody has measured it.** The wind-wave-tank work is a different flow | [S] — a gap, and it is named as one |

**So the air is the carrier and its scale is ours to fit, not to cite.** The advisor's own estimate from the
photograph's geometry is an updraft of **3–5 m/s over a 1–2 m band behind the crest, decaying over about 1 H**, and
two mechanisms of that order: in the wave's frame the air approaches at the crest speed and separates over the
breaking crest, and the peel pumps the tube's air out continuously at roughly A_void × V_peel ≈ 2.8 m³/s. Both are
mechanisms, not measurements. **Everything about the air in §4 is therefore [P], calibrated against §2's own numbers,
and it is labelled that way in the code.** The advisor also offered the honest alternative: our Basilisk runs are
two-phase and already carry the gas velocity, so a rerun saving it would make the number ours. That is a cost call,
and it is the owner's.

**On budget the advisor's answer was the useful surprise**: §2's transmission of ≳ 0.9 makes the veil optically thin,
τ ≈ 0.1–0.25, so a 1.3 m × 25 m veil needs only **3–8 m² of unit-opacity coverage — 200–400 half-metre sprites at
α ≈ 0.25**, and the cloud already carries 153 mist live in a 4096 pool. **Do not raise the particle count**; what is
wrong is the height, the fall speeds and the opacity.

---

## 4. What was built: `?lipVeil=on`

Opt-in, off by default, visual only, and it follows the advisor's build order as far as this round goes. Items 4 and
5 of that order (opacity from an optical depth, and a swept veil band in place of most of the sprites) are **not**
built; §7 says why and what they would cost.

### 4.1 The drops (`LIP_VEIL`, `src/wave/SprayCloud.ts`)

`splash()` gains a third path, taken only with the switch on. Everything in it is Erinin's measurement:

- **two regions, not one.** A share `32 / (32 + 46)` of the drops leave at **81°** from horizontal, at the curl; the
  rest at **56°**, spread back over up to **0.5 H** of the turbulent zone the jet has just ploughed. Both lean
  downstream, along the jet's own horizontal run, so nothing is thrown over water the lip has not hit.
- **the measured speed law, with its tail.** `SPLASH_UP.vertical` threw every drop at 0.6 of the impact speed, ±20 %:
  about 1.5 times the measured mean, and with no tail at all. The veil draws its ratio from an **exponential of mean
  0.38**, floored at 0.1 and capped at 2.2 — which reproduces both the measured mean and a tail that passes twice the
  impact speed about one drop in two hundred.
- **a third size class.** The classes take their share of the droplets' **optical area**, because a drawn sprite
  stands for a patch of veil and not for one drop: **35 %** over 1 mm (the existing `SPRAY_FALL`, 3–7 m/s), **10 %**
  under 0.2 mm (the existing `MIST_FALL`, 0.3–0.6 m/s), and **55 %** in the **0.2–1 mm** band that carries most of it
  and that the game had no class for — drawn as mist is, since that is already the soft translucent sprite, but
  falling at **0.8–2.5 m/s** and **0.3–0.55 m** wide.

The **count** law is untouched (`SPRAY_PER_JOULE` per joule of the landing's kinetic energy). That is deliberate and
it is the advisor's call: the reference's veil is optically thin, so the fault was never the number of sprites.

### 4.2 The air (`VEIL_AIR`) — the provisional part, and it is labelled so in the code

A jet landing seeds a patch of breaker-driven air where it lands. A later landing inside a live patch **refreshes**
it rather than adding one, so a peeling crest carries one patch along it instead of stacking a hundred on it; 32 are
kept and the oldest goes first.

| | | why |
| --- | --- | --- |
| speed at the water | **0.9 √(gH)** — 4.0 m/s on a 2 m wave | the advisor's 3–5 m/s band, written as a scaling so it follows the wave |
| radius | **2 H**, Gaussian, cut at twice it | the advisor's "1–2 m band" on a 2 m wave |
| onset | **0.25 s** after the landing | Erinin's first droplets, Froude-scaled; and it is the guard that keeps the veil **1–4 m behind the curl's tip** at a 7 m/s peel, so it never fogs the barrel's mouth |
| life | 1.4 s from the landing | so it lofts for about a second |
| ceiling | falls linearly to nothing **1.6 × the breaking wave's own height** over the water it was seeded on | a ceiling, not a top — the drops stop well under it, where the air stops beating their fall. Set to put the veil's **body** in the band §2's ratio asks for, which §5.1 measures it doing. Note the unit is `waveHeight` as the lip reports it, **not** the crest's stand over still water |

In `fly()` the patch's updraft joins the wind in the quadratic drag, exactly as the wind already does along z: the
relative velocity is taken against the air, damped, and the air's own velocity added back. **Nothing says "big drops
stay ballistic" — the drag says it.** A drop rises until the air no longer beats its fall speed, so with a 4.0 m/s
updraft falling off to nothing at 3.2 m on a 2 m wave: a 0.2 mm mist drop climbs most of the way to that ceiling, a
0.45 mm veil drop about two thirds of it, and a millimetre-plus drop, whose terminal speed is 3–7 m/s, is barely
moved at all. The linear falloff is also what
makes a chimney impossible: there is a height at which every class stops.

### 4.3 Where it is wired

`SurfZoneConfig.lipVeil` ('on'), set by `lipVeilSwitch()` in `PhysicalMode` from `?lipVeil=on`, read once in
`SurfZoneRunner`'s constructor onto `SprayCloud.veil`. `main.ts`'s online overrides carry `lipVeil: undefined`, so an
online room runs the default whatever a client's address says — the same rule every other look switch follows.

One change reaches outside the switch: a lip impact now carries the **height of the wave it fell from**
(`LipImpact.height`, from the flight's own `waveHeight`, with its fall as the fallback the plunge hold already uses).
Nothing but the veil reads it.

---

## 5. What it does, measured

Both legs are the same held sea at **t 72 s** of the 2 m pool, `--compute=gpu`, the owner's own ride address
(`?spot=pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library`),
one with `&lipVeil=on` and one without. **The leg carries a hard control**: the two legs' seas are identical —
**1234 lip landings in 517 of 600 frames and 37.259 m³ of water in both** [M]. The switch moves the drawn spray and
nothing else.

### 5.1 The height, which is what the round is about

**First, the ruler, because this is where the round nearly published a right number in a wrong frame.** §2's veil
height is a **ratio** to the reference wave's crest-over-still-water, and it is only a ratio — the metres in it come
from assigning the pool's advertised 2 m to that face. **Our pool Barrel's crest is not 2 m.** Read off the library's
own drawn slices in the held frame, the nineteen that have thrown but not yet landed stand at **1.33–1.58 m, median
1.41 m**, over a still water the landing spray spawns on at y ≈ 0 [M]. So the reference's own rule, applied to the
wave we actually draw, asks for a veil top at **(1 + 0.55–0.70) × 1.41 m = 2.2–2.4 m** over the still water, not the
3.2 m a careless reading of §2's metres gives. Everything below is against that.

| | veil off | **`?lipVeil=on`** | what the reference's ratio asks of *our* wave |
| --- | --- | --- | --- |
| highest particle, median frame | 1.62 m | **3.51 m** | — |
| the same, 90 % of frames below | 1.81 m | **4.37 m** | — |
| the same, highest in 600 frames | 2.04 m | **4.72 m** | — |
| **the height 95 % of its drawn optical area sits below**, High, median of 60 frames | 1.58 m | **2.40 m** | **2.2–2.4 m** |

The last row is the one to read. One highest particle out of two thousand is an extreme value, not a veil; a
photograph's visible top is where there is enough optical density to beat the background, which is a high quantile of
the **area** and not of the count. By that measure the veil's **body** rises from 1.58 m to **2.40 m** and lands on
the band the reference asks for, where before it sat half a metre under it.

**What overshoots is the tail.** The highest particle goes to 3.51 m on the median frame and 4.72 m at worst, which
is 2.5–3.3 crest heights and higher than anything in the photograph. Those are the millimetre drops on the
exponential's tail, thrown rather than carried, and they are few — which is why they move the extreme and not the
95 % — but they are visible as the stray dots high in `veil-on-side.jpg`. §8 item 2 has the fix.

**And one caution on the target itself.** §2's 0.55–0.70 H is measured in a projection where the crest and the
foreground water line sit at different distances from the camera, so the 274 px over-reads the crest a little and the
ratio under-reads the veil. The band above is therefore a **floor**, not a centre: 2.2–2.4 m is the least the
reference asks for.

### 5.2 It is now over the break, and no longer over the whole pool

Distance from each live particle to the nearest **landed** library slice's crest, in the held frame:

| | veil off | `?lipVeil=on` |
| --- | --- | --- |
| median | 19.8 m | **9.4 m** |
| 10 % / 90 % | 3.3 m / 168.5 m | **1.9 m / 30.6 m** |

The off leg's cloud is the sea's bore spray, strewn over 300 m of pool wherever anything is dissipating; **90 % of it
is further from a break than any of the veil's is** [M]. This is the owner's own rule — a great deal of it where the
water has broken and none where it has not — read off the geometry rather than off a picture.

### 5.3 On the screen

Projected into the stills' own cameras, the covered pixels as an upper bound (no allowance for overlap):

| shot | veil off | `?lipVeil=on` |
| --- | --- | --- |
| `curl-behind` | 1.97 % of the frame | **7.93 %** |
| `bore-face` | 1.28 % | **3.57 %** |
| `curl-close` | 3.12 % | 1.38 % |
| `curl-ride` | 2.26 % | 1.04 % |
| `curl-inside` | 4.16 % | **0.94 %** |

**Four times the cover on the two cameras that see the break from outside, and a quarter of it on the camera inside
the tube.** That second half is not a loss: `curl-inside` sits in the mouth looking out, and the drops that used to
sit in front of it are now thrown up and back behind the curl, which is the advisor's own gameplay guard (a veil born
at the tip fogs the barrel). The same reading explains `curl-close` and `curl-ride`, both within 6 m of the curl.

### 5.4 The Particles budget, and the bar this round hit

Every level sampled over 60 frames after an 8 s settle at that level, so nothing of the level before is still in the
air. `spray + mist` is the pool that can saturate (a tube's whitewater and a board's have their own):

| | veil off: live (spray+mist / pool) | `?lipVeil=on`: live (spray+mist / pool) |
| --- | --- | --- |
| High | 2522 (**2405** / 4096) | 4211 (**4096 / 4096** — pinned) |
| **Medium** (what the owner's machine picks) | 1104 (**1048** / 2048) | 2121 (**2048 / 2048** — pinned) |
| Low | 457 (**421** / 1024) | 1062 (**1024 / 1024** — pinned) |

**The veil pins the spray-and-mist pool at every level** [M]. The cause is the physics and not a bug: a veil sprite
is four to nine times as wide as a drop sprite and, with a tenth of the fall speed and the air under it, it stays up
several times as long, so the **standing** population roughly doubles at the same spawn rate. The advisor's
instruction was *"do not raise the particle count"*, and the spawn rate is indeed untouched — but the population it
sustains is not.

**It is shipped pinned, and the reason is the order `update` does its work in.** A full pool is a bounded cost, since
the pool is the cap and it is the cost the game already budgets for; what a full pool changes is **which** source
goes without. `update` throws a landing's drops (`splash`) **before** it fills what is left from the bore faces
(`boreSpray`) [C], so the break's own spray always gets first claim and what is squeezed is the low strewn bore
haze — which is the trade the owner asked for in the same breath as the spray (*"a lot of it is foam"*). The boards'
spray is untouched: it has a pool of its own.

**The alternative was tried and measured and is not worth its cost.** Drawing one of a landing's drops where the old
path drew three (a 0.35 rate) frees Medium to **1942 of 2048** and leaves the veil's **body exactly where it was** —
95 % of its drawn area below **1.75 m against 1.74 m** [M], because the body's height is set by the air and not by
the count. What it takes away is the plume: Medium's top falls 2.96 → 2.01 m, which is an extreme over sixty frames
and so is mostly a sample-size artefact, but the stills are not ambiguous — at a third of the rate the thing the
owner asked to see is a handful of scattered dots. So the rate stays, and §8 carries the proper fix, which is to stop
spending sprites on the veil's body at all.

---

## 6. The stills, and how honestly they compare with the owner's photograph

`c2-step5g-stills/` holds four shots in both legs, same held frame. Three of them are **new cameras placed from the
probe's own data** — step 5d's trap was aiming at the curl when what it was looking for was 72–207 m behind, so these
were built from the breaking front the particles are actually on, at (x 41, z −153), with the crest line read off the
library's own landed slices.

- **`veil-side`** (eye 27.4, 2.8, −150.6 → 40.8, 1.5, −153.1): along the crest, 14 m out, the geometry of the
  owner's photograph. This is the pair to look at first.
- **`veil-front`** (eye 44.7, 3.5, −134.6 → 40.8, 1.5, −153.1): in front of the wave with **the pool's own wall
  behind it**, which stands in for the reference's pier — the one place a veil's translucency can be judged in our
  own frame. The two legs differ over **2.15 % of this frame** [M], all of it in a box from the lip up and back.
- **`veil-above`** (eye 39.0, 7.0, −133.0) and **`bore-face`**, step 5d's own landed-bore camera.

**What is right.** The spray now leaves the lip and goes **up and back**, over the broken water and over the wall
behind it, where before it sat as a tight knot of white on the foam and nothing crossed the lip line. Its place is
right: §5.2's geometry says it is on the break and no longer strewn over 300 m of pool, and it stays off the clean
face and out of the tube's mouth. Its height is the right order at last — metres, not centimetres.

**What is not right, and it is the texture.** At this rate it reads as **a scatter of separate round blobs**, not as
a fine veil. The reference's veil is a continuous translucent wash that lifts its background's luminance by about +90
of 255 **while leaving the background's own detail readable through it**; ours is a few hundred discrete discs with
clear sky between them. That is exactly the advisor's third fault — *"the fixed opacity of 6–14 cm discs, which is
locally τ → ∞ and reads as dots"* — and this round fixed the first two faults (the height and the fall speeds) and
not the third. **It would be wrong to tell the owner this is their photograph. It is the spray arriving in the right
place at the right height, in the wrong material.**


---

## 7. Seatbelts

**The default game does not change.** `?lipVeil=on` is off by default, and the only line that runs without it is a
lip impact carrying the height of the wave it fell from, which nothing but the veil reads.

| | |
| --- | --- |
| **the Canyon byte check** | the default Canyon, medium, 3600 steps on a shared spun-up sea: **snapshots `ea3d57a4d49f4b48`, state `a1a2555739210f96`** — byte for byte the figures step 5f published for main, and 691cac46 ("step 3.2t's Canyon byte check") says those are still main's own [M]. The spray is in the snapshot hash, so a drop out of place would have moved it |
| `npx tsc --noEmit -p .` | clean, **exit 0** — and the check was proved able to fail: a deliberate `const __proof: number = 'not a number'` in `SprayCloud.ts` gave `error TS2322` and a non-zero exit, and the file was restored (the brief's worktree trap) |
| `src/wave/SprayCloud.test.ts` | **39 of 39**, six of them new: the switch is off until asked for and leaves every landing's bytes as they were; the two regions' angles; the speed law's mean and its tail; **nothing thrown over water the lip has not hit**; the air carrying the light drops over the lip where thrown drops cannot reach; and the air not blowing before its onset |
| `src/wave/PlungingLip.test.ts` | 71 of 71 |
| `src/game/PhysicalMode.test.ts` | 92 of 92 |
| `src/wave/SurfZoneSimulation.test.ts` | run on its own, as the brief asks (the full suite under load returns timeouts only) |
| **the deletion check** | `git diff --stat origin/main HEAD` first read **1581 deletions**, every one of them `docs/research/new-rider/3.2/`, `AttachedRider.ts` and `legDrive.test.ts` — not a revert but `origin/main` moving to 691cac46 under a branch cut from 009a9c51. **Rebased onto it**; the branch is now **+1429 / −7**, and the seven are lines of my own that I replaced |

The one thing outside this branch: the advisor wrote its consult row into the **main checkout's** working tree, which
already had another session's uncommitted files in it. The row is carried here as a commit; `docs/research/water-physics/consult-log.md`
in the main checkout still has it as a local modification and can be dropped once this merges.
---

## 8. Next, in order

1. **Opacity from an optical depth, not a constant** (the advisor's item 4, and §6's own finding). §2 gives the
   target as a number nobody has had before: **+90 of 255 on the background's mean with its absolute variation
   intact**, i.e. transmission ≳ 0.9 and τ ≈ 0.1–0.25 along the ray. A sprite's alpha should follow the water it
   stands for, not sit at a constant, and the same reading says the spray class's 0.8 on a 6–14 cm disc is the one
   that reads as a dot. This is the change that turns §6's blobs into a veil, and it is small.
2. **The tail, now that the body is right** (§5.1). The body lands in the band; the highest particles go half as
   high again as the photograph ever shows. They are the millimetre drops on the exponential's tail, and Erinin caps
   that tail at twice the impact speed on a laboratory breaker — our cap is 2.2, so it is not obviously too generous,
   and the honest next move is to read the tail's **share** against their spectrum rather than to trim the cap by eye.
   While that is open, the air's own geometry is worth the same look: a patch is a **disc at a landing** with a 2 H
   radius, and a drop launched at 2–3 m/s horizontally leaves it inside a second, so the air is doing less for the
   body than its numbers suggest. Making it a **band along the crest that travels with the peel** is both the fix and
   what the physics says it is, since the pump is the peel.
3. **The swept veil band** (the advisor's item 5), a participating medium on the barrel loft we already build, with
   τ(height over the crest, distance behind the curl, slice age) — zero ahead of the tip, top at 0.55–0.70 H, falling
   at 1.8 m/s behind. It would replace most of the sprites and cost a shader. Worth doing **after** 1 and 2, because
   1 and 2 are what tell us whether sprites can carry it at all.
4. **Measure the air instead of fitting it** — the owner's call. Our Basilisk runs are two-phase and already carry
   the gas velocity; a rerun that saves it would turn `VEIL_AIR`'s [P] into our own [M]. Nobody in the literature has
   this number, so it would be ours.
5. **The other spots, and Classic.** Everything above is **the 2 m pool Barrel and nothing else** [M]. The veil
   draws in both looks as written (it is the mist sprite, which Classic already draws) and it fires at every spot the
   switch is on at, including the Canyon's drawn spilling touchdowns — which carry no wave height, so they fall back
   to a 1 m ruler and would throw a 1 m veil. Neither has been looked at. One pair of stills each would settle them,
   and the Canyon's fallback height is the one line that may want changing when they are.
6. **The pool** (§5.4). The veil fills it at every level. Item 3 is the real answer — a band draws the body in a
   shader and hands the pool back — but if it slips, the cheap half-measure is a pool of its own for the veil, as the
   boards' spray and a tube's whitewater already have, so a full veil cannot squeeze the bore haze at all.

---

## 9. Files, and how to run them again

- The switch: `?lipVeil=on`. `LIP_VEIL` and `VEIL_AIR` in `src/wave/SprayCloud.ts` carry the sources and the
  provisional marks in their own comments; `lipVeilSwitch()` in `src/game/PhysicalMode.ts`;
  `SurfZoneConfig.lipVeil` in `src/wave/SurfZoneSimulation.ts`; six tests in `src/wave/SprayCloud.test.ts`.
- The probes: `c2-step5g-series.js` (600 frames of counts, landings and heights — **the one that stopped a one-frame
  zero becoming a finding**), `c2-step5g-probe.js` (one frame's particles and cameras, then the Particles levels),
  `c2-step5g-project.mjs` (the frustum and covered-pixel projection). The reference measurement scripts are in
  `c2-step5g-runs/`.
- Both legs, from the repository's root:
  ```
  node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5247 --out=<dir> --compute=gpu \
    --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library&lipVeil=on" \
    --shots='bore-face:rich:midday;view@27.4,2.8,-150.6@40.8,1.5,-153.1:rich:midday;view@44.7,3.5,-134.6@40.8,1.5,-153.1:rich:midday' \
    --probe=docs/research/wave-strategy-alternatives/c2-step5g-probe.js --advance=40 --first=skip
  ```
  The off leg is the same address without `&lipVeil=on`.
- Not run: rider sessions, catch reports and autopilot rides (the brief's rule); the Classic look; the A0 clamp and
  the hand-over bars, which this branch does not touch.
