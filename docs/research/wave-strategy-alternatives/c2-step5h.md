# C2 step 5h: the veil's opacity, and the thing beside it that is louder (2026-11-15)

Tags: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.

The brief gave two jobs and an order. **Job 1: opacity from an optical depth, not a constant** — 5g §8 item 1, which
5g called small. **Job 2: measure the flat white mass right of the curl the same way, and if it is a different fault
and it is large, say so and stop rather than building both.**

**In one line: job 1 is built and measured, and the answer to job 2 is that it is a different fault, in a different
file, it is large, and I did not build it.**

| | |
| --- | --- |
| **Built** | the veil's alpha now comes from the water each sprite stands for (§3): a conserved extinction cross-section **A_x = Q·1.5·w/d₃₂**, drawn at **α = 1 − e^(−τ)**, τ = A_x/(πD²/4). Still `?lipVeil=on`; **no new parameter**, and the default is byte-identical |
| **Measured** | the same held sea, the same frame, with and without the switch — an exact control the photograph could never give. Over the veil's own footprint the drawn veil now has **τ = 0.26–0.40** across four cameras, and it **lifts its background while attenuating it** (sd ratio 0.77–0.92) where 5g's **added structure to it** (1.01–1.04, and 2.03 over the pool wall against this round's 1.31). 5g's constant alpha over the **same particles** paints 2.4 times the ink and three times the near-opaque pixels (§4.1, §4.3) |
| **Kept, and checked because it was at risk** | 5g's height. Over 60 frames the body (95 % of drawn optical area) sits at **2.43 m** against 5g's 2.40, with the off leg reproducing 5g's 1.58 m to the centimetre — and **5g §8 item 2's tail is gone**, the highest particle falling from 3.51 to 2.67 m on the median frame (§4.2) |
| **Refuted — in my own brief, and twice over** | the brief's target, "transmission ≳ 0.9, τ ≈ 0.1–0.25", **does not follow from the measurement it was drawn from** (§2). 5g read the veil as thin because the pier's sd survived it; in **linear** light that sd *rises* **3.2×**, which attenuation cannot do. The photograph does not pin τ at all; the honest bracket is **0.35–1.2** |
| **Corrected** | three of the inputs 5g built on, all from the advisor (§3.1): the drop diameters must be **Sauter means** 150 / 590 / 1500 µm; the class shares were integrated from a **mixed** spectrum triple and are **54 / 5 / 42**, not 35 / 10 / 55; and **Q_eff is 1, not 2**, for a camera against an extended background |
| **Job 2 — measured and NOT built** | the flat white mass is **not** the veil and **not** the constant-alpha fault: the switch moves it by **0.2 of 255**. It is the water surface's own foam shading, and its fault is a number: `waterFoamColor` is a diffuse albedo of **0.840** against a sourced ceiling of **0.50–0.55** for the whitest foam ever measured (§5). In linear light our broken water is **1.31×** the flat water beside it where the photograph's is **0.75×** — a **1.75× sign flip, within each frame**, so it is not an exposure difference |
| **My recommendation** | **job 2 is worth the owner's ride more than job 1 is**, and the fix is a handful of constants (§5.4). Job 1 is worth shipping with it, not instead of it |

---

## 1. What the round did not have to re-establish

5g settled the things this round would otherwise have spent itself on, and none of them moved: the spray fires
(1234 landings in 517 of 600 frames), it reaches the cameras (1385 of 1390 inside `curl-behind`'s frustum), and
`?wave=library` does not write the solver. **The off leg of this round reproduces 5g's held frame exactly — 1390 live
particles, the same number 5g §1.3 published** [M], which is the control saying the two rounds are looking at the
same water.

---

## 2. The target I was given is not a measurement, and here is the measurement

The brief states the target as **"transmission ≳ 0.9, τ ≈ 0.1–0.25"**, from 5g §2 item 4 and from the reference
README. **It does not hold.** This is the round's first finding and it had to come before any build, because it is the
number the build would have been aimed at.

**5g's argument.** Across the photograph's pier band the veil lifts the mean from 41 to 131 of 255 *while leaving its
absolute variation intact* — sd 23.5 → 29.4. A cloud that raises the mean without flattening the detail is optically
thin; a white mass drives the sd toward nothing. The reasoning is right. The quantity is not.

**Those are sRGB code values, and transmission is linear in radiance.** Put the same two bands through the sRGB
inverse EOTF (`c2-step5h-runs/transmission2.py`, over the same 100 rows × 120 and × 300 px 5g used):

| the pier band, rows 200–300 | sRGB mean | sRGB sd | **linear** mean | **linear sd** |
| --- | --- | --- | --- | --- |
| clear pier, x 1150–1270 | 41.2 | 23.5 | 0.0303 | **0.0356** |
| under the veil, x 600–900 | 131.2 | 29.4 | 0.2443 | **0.1146** |

**The background's variation does not survive the veil; it is multiplied by 3.2** [M]. Attenuation cannot do that.
What the sd under the veil measures is **the veil's own patchiness**, which sits on top of whatever the pier
contributes, so the sd bounds τ in neither direction and the 0.1–0.25 has nothing holding it up.

**The obvious repair does not work either.** The pier's railing is periodic, and the veil's patchiness is not, so the
amplitude at the railing's own spatial frequency should give a clean exposure-free transmission. It does not: each
band finds a *different* best period (20, 25, 30, 16 px), because the pier's structure changes across the frame — and
**two halves of the same clear pier already differ in amplitude by 1.7×** [M], which is larger than the effect being
looked for. Two of the three bands come back with T > 1. The method is sound; this photograph cannot carry it.

**What is left is the radiance balance, and it gives a bracket.** With I = I_bg·T + L_veil·(1 − T) in linear light:

| L_veil assumed | T | τ |
| --- | --- | --- |
| 0.333 — the thickest veil's own reading | 0.29 | **1.23** |
| 0.543 — the photograph's own broken foam | 0.58 | **0.54** |
| 0.750 — the glassy foreground, the frame's brightest extended surface | 0.70 | **0.35** |
| 1.000 — a clipped white | 0.78 | 0.25 |

**τ ≈ 0.35–1.2, centre about 0.5, and the assumption is named with it** [M + R]. That is three to five times the
figure in the brief. `../tube-spray-reference-2026-11-14/README.md` item 2 now carries this, and says in terms that
**nothing should be designed to a single value of it**.

What the photograph *does* say without any assumption is the thing the owner's ask is about, and it survives all of
the above: **it is translucent — the pier is readable through it — and it is not a white mass at a fixed alpha.**

---

## 3. What was built

### 3.1 The advisor's three corrections, which came first

The consult row is in `docs/research/water-physics/consult-log.md`. Three of 5g's inputs were wrong, and all three
are in the code now:

| | 5g | **5h** | why |
| --- | --- | --- | --- |
| the diameter in A_x = 1.5 w/d | — (there was no A_x) | the **Sauter mean** d₃₂ = Σd³/Σd², **150 / 590 / 1500 µm** | A_x = 1.5 w/d is exact *iff* d is the Sauter mean, which is identically the cross-section-weighted mean. The count-mean of the 0.2–1 mm band is 411 µm against 590, so using it would lose **45 % of the cross-section** [S] |
| the class shares (of optical area) | 35 / 10 / 55 | **54 / 5 / 42** (over 1 mm / under 0.2 mm / the 0.2–1 mm band) | 5g integrated Erinin's spectrum on a **mixed** triple — the moderate breaker's exponents with the strong breaker's d_max. Each of the three breakers on its own consistent fit gives 6 / 17 / 77, 31 / 9 / 60 and **54 / 5 / 42**. A 2 m pool plunger is the strong column [S] |
| Q_ext | (not used) | **1.0**, and 1.5 for the finest class | Mie gives 2.00 flat at these sizes, but half of it is forward diffraction into a cone of **0.8–1.6 px** of our frame. Against an extended background that light is replaced by its neighbour's, which is similarity (δ-) scaling, dτ̃ = (1 − ω₀f)dτ with f = 0.5 [S: Stephens AT721 §8.1.1; Joseph, Wiscombe & Weinman 1976] |

The over-1 mm band is the weakest link in the chain and the advisor named it as such: it takes three quarters of the
water and half of the area, and its d₃₂ rests on d_max alone, inside the dashed part of Erinin's own fit.

### 3.2 The law

Each veil sprite is given, at birth, the **water it stands for**: the landing's airborne droplet water divided among
the sprites the count law asked for, times its class's share. From that, its **effective extinction cross-section**

> **A_x = Q_eff · 1.5 · w / d₃₂**, and its drawn alpha is **α = 1 − e^(−τ)** with **τ = A_x / (πD²/4)**

where D is the sprite's own drawn diameter in metres. Three properties follow, and they are the point of the round:

- **alpha blending now composites as physics.** Π(1 − αᵢ) = e^(−Στᵢ), so sprites that overlap **add optical depth**
  instead of stacking opaque discs. A veil is made of overlap; a dot field is not.
- **A_x is conserved as a sprite spreads**, so τ falls as 1/D². That *is* the fade, and it is dilution rather than a
  curve. The old `(1 − t²)` is gone from the veil's path.
- **the drawn optical depth stops following the sprite count.** A class's total A_x is its water divided by its d₃₂,
  with the sprite count cancelling — so Low draws fewer, denser sprites to the same optical depth. There is a test for
  it: Low draws under 60 % of High's sprites and within 25 % of its cross-section [M, `SprayCloud.test.ts`].

### 3.3 Fallout, which the corrected shares forced

With the over-1 mm band at 54 % of the sprites rather than 35 %, the speed law's tail puts far more millimetre drops
in the air, and they are exactly the stray high dots 5g §5.1 measured overshooting to 3.5–4.7 m. At a d₃₂ = 1.5 mm
drop's Gunn & Kinzer terminal speed of 4.9 m/s that band clears the veil's own 1.2 m depth in **a quarter of a
second**, so it is now drawn for **0.25–0.45 s** and tapers out [S + R]. This is the advisor's §3.4 and it also owns
5g §8 item 2.

**It broke one of 5g's own tests, and the test was wrong rather than the code.** 5g's onset test read *the highest
particle of any class* before and after the air starts; with 54 % heavy drops the ballistic tail swamps it. Rewritten
to read the two light bands — which are the ones the air carries, and which is what the test is about — it reads
**0.70 m before the onset against 1.93 m after** [M]. 5g §5.1 makes the same argument for the body against the top.

### 3.4 φ, the one fitted number, and how far it is from its floor

φ is the share of the splash-up's water that leaves as airborne droplets, and **it is the only number in the chain
that is a fit.** Its sourced floor is real work and it is in the code beside it: Erinin's absolute counts and their
spectrum **can** be integrated to a volume, nobody has published one, and the integration gives 13.1 / 44.3 /
142.9 mm³ per metre of crest per event over their three breakers — **φ_sourced ≈ 3 × 10⁻⁴ of the splash-up, good to
one order and no better**, since the volume lives in the large-diameter tail where their own fit is dashed [S + R].

**It ships at 0.012, forty times that**, set so the veil's standing airborne water lands near the ~2 × 10⁻⁴ m³ per
metre of breaking crest that the photograph's own optical depth asks for at d₃₂ = 590 µm. So **the shape of this law
is sourced and its level is not**, exactly as `VEIL_AIR` was in 5g, and it is labelled that way in the file. If the
veil reads thin or thick on a ride, φ is the number to move, and the distance to its floor is the honest measure of
how far the only published droplet measurement sits from the owner's photograph.

**I did not then re-fit φ to the measurement in §4**, although §4 puts the veil at the bracket's lower end and a
1.5× would centre it. §2 is the reason: the bracket is not a number, and tuning a constant to the middle of a range I
have just said nobody can pin would be the round's own error dressed as a result.

---

## 4. What it does, measured

Both legs are the same held sea at **t 72 s** of the 2 m pool, `--compute=gpu`, the owner's own ride address with
`?wave=library`, one with `&lipVeil=on` and one without. The off leg carries the hard control: **1390 live particles,
5g's own held-frame figure to the particle** [M].

### 4.1 The headline: the owner's own test, with a control the photograph could not give

The reference asks whether the veil **lifts its background while leaving the background readable through it**. In the
photograph that had to be judged across two different pieces of pier (§2, and it failed). Here the control is exact —
the same frame, the same camera, the same sea, with and without the switch — so the veil's **footprint** is simply
the pixels the two legs differ on, and inside it the pair (ON, OFF) is available per pixel. A veil that attenuates and
adds its own radiance satisfies ON = T·OFF + L(1 − T), so **a straight-line fit of ON against OFF gives T as its
slope** with no assumption about L at all. `c2-step5h-runs/footprint.py`; the numbers are in `footprint.txt`.

| leg | footprint | OFF in it: mean / sd (linear) | ON in it: mean / sd | lift | **sd ratio** | **T** | **τ** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **5h** `front` | 18 077 px, 1.96 % | 0.6306 / 0.1051 | 0.6545 / 0.0966 | +0.024 | **0.92** | 0.670 | **0.40** |
| **5h** `side` | 7 576 px, 0.82 % | 0.8133 / 0.1567 | 0.8216 / 0.1200 | +0.008 | **0.77** | 0.686 | **0.38** |
| **5h** `above` | 10 808 px, 1.17 % | 0.6483 / 0.1337 | 0.6626 / 0.1193 | +0.014 | **0.89** | 0.755 | **0.28** |
| **5h** `bore-face` | 2 022 px, 0.22 % | 0.6890 / 0.2367 | 0.7009 / 0.1933 | +0.012 | **0.82** | 0.770 | **0.26** |
| 5g `front` | 24 952 px, 2.71 % | 0.6322 / 0.1233 | 0.7164 / 0.1287 | +0.084 | **1.04** | 0.795 | 0.23 |
| 5g `side` | 24 876 px, 2.70 % | 0.6298 / 0.2914 | 0.6491 / 0.2929 | +0.019 | **1.01** | 0.997 | 0.00 |

**Read the sd ratio column.** A cloud attenuates what is behind it, so its sd ratio is **under 1**. Discrete objects
add structure of their own, so theirs is **1 or above**. 5h is 0.77–0.92 on all four cameras; 5g is 1.01 and 1.04.
That is the difference between a veil and a dot field, in a number, on the same wave.

**And the sharpest version of it is the upper half of the `front` frame**, which is the veil over the pool's wall —
our own stand-in for the photograph's pier, and the one place in our frames where translucency can be judged against
a flat dark background:

| the `front` footprint's upper half | lift (linear) | **sd ratio** |
| --- | --- | --- |
| 5g, constant alpha | +0.093 | **2.03** |
| **5h** | +0.041 | **1.31** |

**5g's blobs more than doubled the background's own variation. 5h's veil adds 44 % of that light for 31 % of that
added structure** [M, 8 784 and 12 390 px]. The 5g figures are from its published JPEGs, which carry compression
noise the PNG legs do not; the effect is tens of times larger than that noise, but it is why the 5g rows are marked.

### 4.2 5g's height result survives, and its tail is gone

The probe carries 5g's own height measure — 60 frames per Particles level, after an 8 s settle, with the height
**95 % of the drawn optical area sits below**. So this round's legs can be put straight beside 5g's figures:

| High, median of 60 frames | veil off | **`?lipVeil=on`** | 5g's own figures |
| --- | --- | --- | --- |
| **95 % of drawn optical area below** | **1.58 m** | **2.43 m** | 1.58 m off, **2.40 m** on |
| highest particle, median frame | 1.81 m | **2.67 m** | 3.51 m on |
| the same, 90 % of frames below | 2.02 m | **3.28 m** | 4.37 m on |
| the same, highest in the 60 | 2.03 m | **3.57 m** | 4.72 m on |
| drawn optical area, Σ size²·α | 44.6 | **104.9** | — |

**The off leg reproduces 5g's 1.58 m to the centimetre, and the on leg's body is 2.43 m against 5g's 2.40** [M] —
so **the opacity change did not cost 5g's height**, which was the thing most at risk from making every sprite fainter
and from retiring the heavy class early. The band the reference's own ratio asks of our 1.41 m crest is 2.2–2.4 m.

**And the tail that 5g §8 item 2 left open is gone**: the highest particle falls from 3.51 to **2.67 m** on the
median frame and from 4.72 to **3.57 m** at worst — about 1.2 m off every quantile, for the physical reason in §3.3.
The stray dots high in 5g's sky were the millimetre drops, and they now leave the veil when their own fall speed says
they do.

**One trap avoided, and it is worth naming.** The single *held* frame — the one the stills are taken from — gives a
body of 1.63 m on the on leg, which read as a collapse of 5g's result. It is not: the held frame is not the settled
state the 60-frame sample measures, and one frame is not a population. The table above is 60 frames per cell.

### 4.3 The same cloud, drawn two ways

The probe carries every sprite, so both alpha rules can be run over the **identical** particles and nothing else can
differ. Rasterised into `curl-behind`, 5g's own headline camera (`c2-step5h-optics.mjs`; per-pixel τ summed as
−ln(1 − α·profile), with the shader's own radial profile):

| `curl-behind`, 2 076 sprites | painted px | the **ink** (unit-opacity px) | px over τ 2.3 (transmission < 10 %) |
| --- | --- | --- | --- |
| **drawn** | 64 521, 7.00 % | 14 627, **1.59 %** | **1 173** |
| 5g's constant 0.8 / 0.25 | 64 521, 7.00 % | 34 850, **3.78 %** | **3 263** |

**The same footprint, 42 % of the ink, 36 % of the near-opaque pixels** [M]. On `bore-face` it is 0.68 % against
1.62 %. And the alphas themselves: over 2 076 drawn sprites the veil now takes **365 distinct values** (p25 0.040,
median 0.093) where the constant rule gives **two** [M]. The p75 of 0.795 is the bore spray, which is outside the
veil and keeps the alpha it always had.

### 4.4 Where it is thick, and where it runs out

Splitting each footprint at its own median row:

| | upper half τ | lower half τ |
| --- | --- | --- |
| `side` | **0.03** | **0.49** |
| `front` | 0.17 | 0.38 |
| `above` | 0.04 | 0.31 |

**Near the lip the veil is in the photograph's bracket. The body standing over the crest is not — it is ten times too
thin to read.** This is not a tuning miss and φ will not fix it: translucency means each sprite is faint, so a veil
needs many sprites overlapping along the ray, and the pool is already **pinned at every Particles level** (High
4096/4096, Medium 2048/2048, Low 1024/1024 — unchanged by this round, since the opacity touches no count) [M]. **The
sprite route cannot carry an optically-thin veil 1.3 m deep.** That is 5g §8 item 3's whole argument, now with a
measurement under it rather than an opinion.

### 4.5 The honest look

`c2-step5h-stills/` has both legs at the four cameras 5g used, and its README says what to look at. The stray dots
high in 5g's sky are gone; what is left reads as a burst of spray at the lip with a wash behind it rather than a
polka-dot field. **It is also fainter than 5g's**, and its footprint is 28 % smaller — the fallout of §3.3 plus the
corrected class shares. If the owner's reaction is "I can barely see it", that reaction is correct and §4.4 is why.

**And one risk a still cannot show.** The over-1 mm band is 54 % of the sprites and now lives 0.25–0.45 s, tapering
out over the last quarter of that — 60 to 110 ms. On a held frame that is invisible; **in motion it may read as
flicker at the lip**, and no measurement here would catch it. It is the first thing to look for on a ride, and if
it is there the fix is to let the band fall out by thinning rather than by expiring.

---

## 5. Job 2: the flat white mass. A different fault, and a large one

The brief asked me to measure the broken section the same way and to say whether it is the same constant-alpha fault.

**It is not, and the first number settles it: with the veil on and off, the region's mean moves by 0.2 of 255**
(229.9 → 229.7 over 63 800 px) [M]. Nothing the veil does touches it. It is not sprites at all — magnified, it is a
smooth pale wash with soft streaks and no discs in it. It is the **water surface's own foam shading**, in
`waterOptics.ts` / `richWaterGlsl.ts` / `rollerGlsl.ts`, a different file and a different pass from `SprayCloud`.

### 5.1 Measured the same way as the veil

Same boxes method as 5g §2, on our `side` still and on the owner's photograph, both 1280 × 720
(`c2-step5h-runs/broken-section.txt`):

| | n | mean of 255 | sd | p5–p95 | over 220 |
| --- | --- | --- | --- | --- | --- |
| the photograph's broken foam | 101 760 | **194.6** | **26.2** | 143–228 | **14.6 %** |
| ours, the mass right of the curl | 63 800 | **229.9** | **10.0** | 214–243 | **83.5 %** |

**Ours is 35 of 255 brighter with a third of the range, and five sixths of it is already near-white.** Relief cannot
survive that: there is no room left under the white point for a lump to be lighter than its neighbour.

### 5.2 The sign flip, which no exposure difference can explain

Comparing two photographs' absolute brightness is worth little. Comparing each frame's broken water **to its own flat
water** is worth a great deal, and in linear light it is exposure-free:

| | broken foam | flat water in the same frame | **ratio** |
| --- | --- | --- | --- |
| the photograph | 0.567 | 0.758 | **0.75** |
| our render | 0.798 | 0.609 | **1.31** |

**A factor of 1.75, and the sign of the contrast reverses** [M]. In the photograph the whitewater is the *darker*
thing; in ours it is the *brighter* thing. And the shading contrast inside the region, sd/mean in linear light, is
**0.248 in the photograph against 0.093 in ours** — a third of the relief, at the same physical scale once the two
frames' metres-per-pixel are matched.

### 5.3 The cause, with a number and a source

`waterFoamColor` is `#d8f2e9` (`src/scene/WaterSurface.ts`), and `richWaterGlsl.ts` uses it **directly as the diffuse
albedo** where foam covers: `diffuseColor.rgb = mix( waterUnder, waterFoamColor * waterCrease, waterCover )` [C]. Its
linear luminance is **0.840** [M].

Against the measurements of what foam actually reflects [S, via the advisor: Dierssen 2019 field hyperspectral;
Koepke 1984]:

| | visible reflectance |
| --- | --- |
| **an active Stage A whitecap — the brightest, freshest thing there is** | **≈ 0.50** |
| bright thick foam | ≈ 0.40 |
| thin foam and residual plume | ≈ 0.18 |
| a single bubble layer | ≈ 0.10 |
| after 10 s | 0.03–0.10 |
| the laboratory ceiling for thick foam | 0.55–0.60 |
| **ours** | **0.840** |

**We are 1.5–1.7× brighter than the whitest foam ever measured, before any lighting.** And the driving variable is
wrong as well as the value: reflectance is set by the **number of bubble layers** along the path, N ≈ α·h/d_bubble,
through R(N) ≈ 0.55(1 − e^(−0.2N)) — 0.10 at one layer, 0.47 at ten — not by a coverage fraction. A 99 %-void foam one
bubble thick is 0.10; the same void fraction 10 cm thick is 0.55. `FoamField` and `AerationField` already carry the
air and the plume depth, so N is arithmetic on fields that exist.

The other half of the 1.75 is that **our flat water is too dark in a grazing view**: unpolarised Fresnel for n = 1.34
is 0.021 at normal incidence but 0.135 at 70° and 0.350 at 80°, and what it mirrors at those angles is the bright sky
near the horizon. **Real whitewater is darker than glassy water in a side-on view and brighter from above** — so the
sign of §5.2 is a property of the camera angle, and a renderer only gets it right if the flat water carries its
grazing Fresnel sky.

### 5.4 Why I stopped, and what I would do

The brief said to stop rather than build both if job 2 was different and large. It is different (another pass,
another file), it is large (a 1.75× within-frame ratio over a region covering more of the side frame than the veil's
whole footprint), and **it is the owner's own standing complaint** — *"the body of the wave itself is quite thin, in
some waves a lot of it is foam"*. So it is written up and not built.

In order, if the coordinator wants it:

1. **Cap the fresh foam albedo at 0.50–0.55 and age it to 0.18, then 0.03–0.10 by 10 s.** One constant and one curve.
   No new fields, no new pass, no measurable cost. Judge it by the within-frame ratio against the photograph's 0.75,
   never by looking at the foam on its own — it will look dirty at first glance and it is supposed to.
2. **Give the flat water its grazing Fresnel sky**, or 1 alone will leave the broken section too dark against a
   water that is itself too dark. These two together are the whole sign flip.
3. Then drive the fresh end from the bubble layers rather than coverage, and only then go after the relief — which
   the existing churn normals give for free once the mean is off the white point.

**Is it worth more than the veil? I think so, and I will say why and not pretend it is a measurement.** The veil is
1–3 % of a frame and its own target is uncertain by a factor of four (§2). The broken section is a large, always-lit
part of every frame; its fault is a factor of 1.75 in a quantity with no free parameters in it; and the owner has
already complained about it in their own words. But it will change how every spot looks, and that is the owner's call
and not mine.

---

## 6. Seatbelts

| | |
| --- | --- |
| `npx tsc --noEmit -p .` and `npx tsc --noEmit -p server/tsconfig.json` | **exit 0 each**, checked on their own line on the finished tree (`c2-step5h-runs/tsc.txt`) |
| `src/wave/SprayCloud.test.ts` | **43 of 43**, four of them new: the alpha is no longer a constant (365 distinct values against the off leg's two) and the 0.2–1 mm band draws under 0.1; a sprite's cross-section is conserved as it spreads and its τ falls exactly as 1/D²; the drawn optical depth is the same at Low as at High; and the veil scales with the landing's own water, with φ's sourced floor asserted beside it |
| `src/wave/PlungingLip.test.ts` and `src/game/PhysicalMode.test.ts` | 71 of 71 and 93 of 93 — **207 of 207** across the three files on the rebased tree (`c2-step5h-runs/suite.txt`) |
| **the rebase** | the branch was cut from `main` at 47ac8719 and `origin/main` moved to **30b2accb** (the surfer track's step 3.2u) while it ran. Rebased onto it, and **everything above was re-run on the rebased tree** — including the Canyon byte check and the slow suite, both of which had to be restarted because the rebase changed files under them. `git diff --numstat origin/main HEAD` totals **17 deletions**, and all seventeen are lines of my own that I replaced |
| `src/wave/SurfZoneSimulation.test.ts` | see `c2-step5h-runs/surfzone.txt` — started on its own early, as the brief asks, and run once on the committed tree |
| **the Canyon byte check, on both protocols, with 5g's leg C** | `c2-step5h-runs/canyon-bytes.txt` |
| **the default game** | unchanged. Every particle outside the veil's path keeps the constant alpha it had; `cross` is zero on all of them and the packing branch is `cross > 0` |

---

## 7. What I will not claim

- **That this is the photograph.** It is not. §4.4 says the veil's body over the crest is too thin to read where it matters,
  and §4.5 says the stills are fainter than 5g's.
- **That τ is pinned anywhere** — not in the photograph (§2) and not as a target. Every τ in §4.1 and §4.4 is a footprint
  average from a slope fit, which is a real quantity, but it is not the same quantity as "the veil's optical depth"
  and it should not be compared with the photograph's bracket to two figures.
- **That φ is measured.** It is a fit at 40× its own sourced floor, and the floor itself is good to one order.
- **That the fallout life of 0.25–0.45 s is physics.** The drops do not vanish; they fall out of a 1.2 m band in that
  time at their terminal speed, and the sprite is retired for it. It is a render decision with a sourced reason.
- **That Q_eff = 1 is measured.** It is similarity scaling applied to our own pixel scale, with the diffraction cone
  arithmetic behind it; the uncertainty the advisor gives is 0.6–1.3.
- **Anything about the other spots, the Classic look, the worker path, or the owner's machine.** Everything here is
  the 2 m pool Barrel, in-page, on this machine. The worker path is sound by reading only, as 5g said.
- **That §5's fix will work.** Nothing was built and nothing was measured after a change. §5 is a diagnosis with
  sources and a ranked plan, and the first ride of it may well say something I have not thought of.
- **That the broken section is the only thing left wrong with that frame.** The reference README's items 4 and 5 are
  still open, and nothing here touched them.

---

## 8. Next, in order

1. **The broken section (§5).** Items 1 and 2 of §5.4 together, measured by the within-frame ratio, nothing else
   moving. This is the recommendation.
2. **The swept veil band** (5g §8 item 3), now with §4.4 as its argument rather than a guess: the sprite route is
   measured to be unable to carry the veil's body, because translucency and sprite count pull against each other and
   the pool is pinned. A participating medium on the barrel loft would draw the body in a shader and hand the pool
   back.
3. **The air as a band along the peel** rather than a disc at a landing (5g §8 item 2, the half this round did not
   take). Untouched, and still right.
4. **Measure the air instead of fitting it, and φ with it.** Our Basilisk runs are two-phase and carry the gas
   velocity; a rerun that saved it would turn both `VEIL_AIR` and `VEIL_OPTICS.airborne` from [P] into our own [M],
   and nobody in the literature has either number. The owner's cost call, and it is now two numbers rather than one.
5. **The other spots and Classic**, unchanged from 5g §8 item 5. The Canyon's drawn touchdowns carry no wave height
   and fall back to a 1 m ruler.

---

## 9. Files, and how to run them again

- The switch: **`?lipVeil=on`, unchanged — no new parameter and no new mode on the old one.** The brief allowed
  extending `?lipVeil` if a second leg were needed; none was, because the probe carries every sprite's alpha, so
  5g's constant rule can be run over the **identical** particles offline (§4.3). A switch would have given a worse
  comparison than that, since the two legs would then be different runs. `VEIL_OPTICS` and `VEIL_CROSS` in
  `src/wave/SprayCloud.ts` carry the sources and the provisional marks; the alpha is written in `pack()`.
- The stills and their README: `c2-step5h-stills/`, both legs at the four cameras 5g used.
- The measurements, all in `c2-step5h-runs/`: `footprint.py` (the on/off footprint test — the headline), `height-and-levels.txt` (5g’s own height measure, 60 frames per Particles level, both legs),
  `transmission2.py` (the reference's τ, three ways), `foam-relief.py` + `boxes.py` (the broken section),
  `colour.py`, `scan.py`, `wall.py`, and `png.py`, step 5d's pure-Python PNG reader that all of them use.
  `c2-step5h-optics.mjs` beside this file rasterises the probe's own particles into the shot cameras.
- Both legs, from the repository's root — 5g's command with the fourth camera added:
  ```
  node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5311 --out=<dir> --compute=gpu \
    --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library&lipVeil=on" \
    --shots='bore-face:rich:midday;view@27.4,2.8,-150.6@40.8,1.5,-153.1:rich:midday;view@44.7,3.5,-134.6@40.8,1.5,-153.1:rich:midday;view@39.0,7.0,-133.0@40.8,1.5,-153.1:rich:midday' \
    --probe=docs/research/wave-strategy-alternatives/c2-step5g-probe.js --advance=40 --first=skip
  ```
  The off leg is the same address without `&lipVeil=on`. **The probe's own output is `<out>/probe-at72s.json` and
  its particles are under `spray.particles`, not at the top level** — one of this round's ten wasted minutes.
- Not run: rider sessions, catch reports and autopilot rides (the brief's rule); Classic; the other spots; the worker
  path; and anything in §5, which is diagnosed and not built.
