# C2 step 5j: the foam's brightness from the bubble layers — built, measured, and worse than the constant it replaces (2026-11-15)

Tags: [M] measured here, [C] read in the code, [S] sourced, [R] reasoned, [P] provisional.

Step 5i levelled the foam's albedo to a sourced constant and aged it, and closed 37 % of the gap to the owner's
photograph on the measure its own brief named as the judge. It then said plainly why it stopped there — *"it stops at
1.102 because the sourced cap stops at 0.50"* — and named the principled replacement: reflectance is not a constant
with an age on it but a **count of bubble layers**, N ≈ α·h/d_bubble, through R(N) ≈ 0.55(1 − e^(−0.2N)), on fields
the drawing already carries. This round built that, as a third value of the same switch.

**In one line: the field is built, it is sourced end to end with one new constant, it spans the whole published
reflectance chain where the cap spanned two values — and on every photometric measure it lands further from the
owner's photograph than the cap does, because the deep plumes sit under the thick cover.**

| | |
| --- | --- |
| **The least flattering number first** | on the photograph's own camera and step 5h's own boxes, the within-frame ratio is **1.146** for `bubbles` against **1.102** for step 5i's `on`, **1.310** off and **0.748** in the photograph. As a share of the gap closed that is **29 %** against step 5i's **37 %** [M, n 63 800 / 50 000 px]. It is worse on the other four measures too (§3.1) |
| **Built** | `?foamAlbedo=bubbles`, a **third value** of step 5i's switch. `on` is untouched — same uniform, same GLSL, same program key — and the default is unchanged. The scale on the foam's white is **R(N) = 0.55(1 − e^(−0.2·N))** with **N = α·h/d_bubble + cover**, every term a varying the Rich fragment already has, and one new constant: the bubble's **1 mm** [S, Deane & Stokes 2002] |
| **The control** | the off leg **and** the `on` leg reproduce step 5i's published figures **exactly** — every box mean and sd to four decimals, every ratio to three figures, and every footprint to the pixel (232 564 / 429 392 / 453 855 / 505 127) [M]. The brief asked for 0.1 of 255; this is the same bytes (§2) |
| **The field, read for the first time** | over the **18 450** render nodes carrying drawn foam in that frame, N runs **0.01 to 685** and R(N) **0.001 to 0.550**, against step 5i's two values [M]. **40.1 % of them are under one bubble layer and 22.4 % are past 25** (§4) |
| **Why it is brighter, in one number** | weighting by the cover each node paints lifts the field's mean reflectance from 0.265 to **0.433**; it lifts step 5i's from 0.247 to **0.335** [M, same 18 450 nodes]. **The thick cover sits over the deep plume**, so the field spends its bright end where the white is actually painted and its dark end where almost none is (§4.2) |
| **Refuted** | step 5i §10 item 2's premise that this is "the honest way to move the aged end **if the ride says it is too dark**". It moves the aged end the **wrong way**: the lace that step 5i called its likeliest objection comes back **up**, 208.8 of 255 against `on`'s 205.1 (off: 222.9), because the foam's white is mixed over the water by the cover, so an albedo under the lit water's own brightness makes the pixel brighter (§5.1) [M, n 89 250, a box drawn after looking]. And R(N) cannot grade an aerated plume at all — it is at 90 % of its ceiling by **11.5 layers**, where the drawn field's maximum is **685** and a plume at the physics' own peak void fraction would be 180 (§5.2) |
| **Worth the owner's ride?** | **Ride step 5i's `on` first.** `bubbles` is worth looking at in the same sitting, for one specific question — the lace behind the break — and §6 says how to ask it |

---

## 1. What was built

### 1.1 One formula, one new constant

`?foamAlbedo=bubbles` replaces step 5i's aged scale on the Rich foam's crease with

> **N = α·h / d_bubble + cover**, **R(N) = 0.55·(1 − e^(−0.2·N))**, and the shader multiplies the capped foam colour
> by **R(N) / 0.50**.

Every term is already in the fragment [C]:

| term | where it comes from | what it is |
| --- | --- | --- |
| **α** | `vWaterAir` | the drawn void fraction |
| **h** | `max( 0, min( vWaterPlumeDepth, vWaterDepth ) )` | the plume's depth clamped at the water's — **the same clamp the plume's own whiteness already uses** (`plumeReach`, `richWaterGlsl.ts:111`) [C] |
| **cover** | `clamp( vWaterFoam, 0, 1 )` | the surface mat, counted as **at most one layer** |
| **d_bubble** | **1 mm**, the only new number | the bubbles carrying most of a plume's void fraction have radii above about **0.5 mm** [S, Deane & Stokes 2002, through our own `docs/research/whitewater-sources.md`] |

**Nothing here was fitted.** `0.55` is R(∞), the laboratory ceiling for thick foam, and `0.2` is the per-layer
exponent; together they reproduce the two published anchors the sources table already carries — a single bubble layer
at **0.0997** against its 0.10, and **0.546** past 25 layers against its 0.55 [S, Whitlock et al. 1982 and Stabeno &
Monahan 1986, cited through Dierssen 2019 and Koepke 1984; `foamAlbedo.test.ts` asserts both].

**Counting the surface mat as at most one layer is the one judgement call**, and it is anchored: "a single bubble
layer ≈ 0.10" is a measurement of exactly that object. Below the curve's knee R is very nearly linear in N, so a cover
of c reads as the area-average of a one-layer foam over a fraction c — which is what a cover fraction means [R, and
the test pins R(0.5)/R(1) = 0.52]. Foam above 1, which a Canyon lip's landing writes, is clamped rather than counted
as a second layer; **in the measured frame the drawn cover never exceeds 1.00, so the clamp never bites here** [M].

### 1.2 A third value, not a replacement

The owner has not ridden `?foamAlbedo=on`. So `on` is left exactly as step 5i shipped it and `bubbles` sits beside it:

- the **uniform is the same 0.50 under both values** — so the roller front, the spilling curl, the swept lip's white
  and the far ocean, none of which has a layer count of its own, draw the same thing under either, and the only
  difference between the two legs is the per-pixel scale;
- the program cache key is `-foam-albedo` for `on` and `-foam-albedo-bubbles` for `bubbles`, and **`''` with the switch
  off**, so today's program is reused;
- `foamAlbedo.test.ts` compiles one Rich material off → `bubbles` → `on` → off and asserts the first and last are
  `toEqual`, and that `on`'s program is byte for byte what it was before `bubbles` existed.

No second parameter was added, as the brief asked.

---

## 2. The control: both legs reproduce step 5i exactly

Rule 3 of the brief asks for step 5i's off leg to be reproduced the same way it reproduced step 5h's. It reproduces
**better than asked**: running step 5i's own `within_frame.py`, unmodified, on this round's off and `on` legs
(`c2-step5i-runs/within_frame.py`, the recipe in its header) gives **every figure of `c2-step5i-runs/within-frame.txt`
to all four printed decimals**, on all four cameras, including the three box means, the three sds, both ratios, and
the footprint's **exact pixel count** on every camera — 232 564, 429 392, 453 855, 505 127 [M].

| | this round [M] | step 5i published | step 5h published |
| --- | --- | --- | --- |
| the photograph, broken / glassy | **0.748** (n 101 760 / 60 000) | 0.748 | 0.75 |
| ours, **off**, `side` | **1.310** (n 63 800 / 50 000) | 1.310 | 1.31 |
| ours, **`on`**, `side` | **1.102** | 1.102 | — |

So the three rounds are looking at the same frame of the same water, and — because the `on` leg reproduces its box
figures to four decimals and its footprints to the exact pixel count — **this round has not moved `?foamAlbedo=on` in
anything this instrument can see**, which is the thing the brief most wanted protected. (A footprint count is not a
byte comparison of two images; what it is, is 232 564 pixels differing from off in this round's `on` leg and 232 564
in step 5i's, on the same camera.)

**The encoding, restated because rule 1 says it must be.** Every frame here is sRGB-encoded: the renderer's output
transfer is sRGB (`main.ts:262`) [C] and the owner's reference is an sRGB webp. Each channel goes through the **sRGB
inverse EOTF**, the pixel's luminance is Rec. 709 of the three, and a box's figure is the **mean over its pixels of
that luminance**. The sRGB code values in §3.1 and §5.1 are labelled as code values and no ratio is taken on them.

**And step 5i's tone-map caveat, carried.** `NeutralToneMapping` runs *before* the sRGB encode at `DISPLAY_EXPOSURE`
(`main.ts:264`) [C], so "display-linear" here is after a compressive curve, not scene radiance. The within-frame ratio
is still exposure-free, but **an albedo change does not move a bright pixel in proportion**, which is why no number in
this file is split into a diffuse and a specular share.

---

## 3. What it does, measured

Three legs, the same held sea at **t 72 s** of the 2 m pool, `--compute=gpu`, the owner's own ride address with
`?wave=library`, differing only by `&foamAlbedo=`. The boxes are step 5i's, which are step 5h's, drawn on the off leg
before any switched leg was looked at. Commands in §8.

### 3.1 The headline, on the photograph's own geometry — five measures, and the field loses all five

`side` is "along the crest, 14 m out — the geometry of the owner's own photograph" (step 5h's stills README).

| `side`, step 5h's boxes | **off** | **`on`** (5i) | **`bubbles`** (5j) | the photograph |
| --- | --- | --- | --- | --- |
| broken mass, display-linear (n 63 800) | 0.7975 | **0.6627** | 0.6901 | 0.5672 (n 101 760) |
| flat foreground (n 50 000) | 0.6089 | 0.6012 | 0.6022 | 0.7582 (n 60 000) |
| **within-frame ratio** | 1.310 | **1.102** | **1.146** | **0.748** |
| **ratio against the clean teal face** (n 72 200) | 3.622 | **3.009** | 3.134 | 2.547 (n 50 000) |
| **near-white share**, sRGB code values over 220 | 83.5 % | **18.7 %** | 21.9 % | **14.6 %** |
| **local sd**, 8 px tiles, sRGB code values | 2.98 | **4.93** | 2.92 | **5.05** |
| **contrast inside the region**, sd / mean, display-linear | 0.093 | **0.129** | 0.111 | **0.248** |

As a share of the gap between the off leg and the photograph:

| measure | `on` closes | **`bubbles` closes** |
| --- | --- | --- |
| within-frame ratio (the brief's judge) | **37.0 %** | **29.2 %** |
| ratio against the clean face | 57.0 % | 45.4 % |
| near-white share | 94.0 % | 89.4 % |
| local relief over 8 px tiles | 94.2 % | **−2.9 %** |
| contrast inside the region | 23.2 % | 11.6 % |

**The relief row is the sharpest of the five and the one I did not expect.** Step 5i got the small-scale relief for
free when the mean came off the white point, and `bubbles` gives it all back: **2.92 against the off leg's 2.98**, as
if the switch had never been thrown. §5.3 says why, and it is structural rather than a bug.

### 3.2 All four cameras

Each camera's flat box is step 5i's, drawn on the off leg. **Only `side` is comparable with the photograph** — the
others' flat boxes are unbroken face water rather than a glassy foreground.

| camera | broken n | flat n | off | **`on`** | **`bubbles`** |
| --- | --- | --- | --- | --- | --- |
| `side` | 63 800 | 50 000 | 1.310 | **1.102** | **1.146** |
| `front` | 33 750 | 23 400 | 1.861 | **1.682** | **1.718** |
| `above` | 41 400 | 39 600 | 1.616 | **1.316** | **1.352** |
| `bore-face` | 108 000 | 40 000 | 1.358 | **1.021** | **1.105** |

**`bubbles` is brighter than `on` on all four — its ratio is 2.1 to 8.2 % higher (side 4.0 %, front 2.1 %, above
2.7 %, `bore-face` 8.2 %) — and on none of them does it beat the cap** [M]. The one frame that came within 2 % of
parity with the water beside it under `on` — `bore-face`, at 1.021 — goes back to 1.105.

### 3.3 The switch's footprint, and where the two legs differ from each other

| camera | `bubbles` footprint against off | leg / off | **`bubbles` against `on`** | `bubbles` / `on` |
| --- | --- | --- | --- | --- |
| `side` | 232 721 px, **25.25 %** of the frame | 0.870 | 124 743 px, **13.54 %** | **1.054** |
| `front` | 429 478 px, 46.60 % | 0.920 | 259 352 px, 28.14 % | 1.043 |
| `above` | 453 957 px, 49.26 % | 0.899 | 275 757 px, **29.92 %** | 1.056 |
| `bore-face` | 505 584 px, 54.86 % | 0.854 | 354 012 px, **38.41 %** | 1.062 |

The footprint against off is 86 to 457 pixels **larger** than `on`'s on every camera — a tenth of a per cent of each
footprint, and the likeliest reason is that the field's dark end goes near zero and so moves a few more pixels at the
lace's thin edge [R, not measured]. And the two switched legs differ on **an eighth to two fifths** of the frame —
this is not a tweak of `on`, it is a different picture of the same water.

**One control worth having, again: the clean teal face is byte-identical across all three legs** — 113.0 of 255,
sd 31.2, local sd 2.74 on each (n 72 200) [M]. Nothing but foam moved.

---

## 4. The field, read for the first time

Step 5i's recommendation rests on a claim about two channels — *"`AerationField` already carries the void fraction
**and** the plume depth, so N is arithmetic on fields that exist"* — and **nobody had read what is in them.**
`c2-step5j-probe.js` reads them in the very frame the stills come from, over the **18 450 render nodes** whose drawn
foam cover is above 0.01, of 159 432 nodes on the grid.

**Two caveats on the population.** (1) These are **render nodes, not pixels** — the shader interpolates them
bilinearly and a node near the camera covers many more pixels than one far away, which is why §4.2 weights by cover
rather than counting nodes. (2) The probe's water depth is the node's own `surface − bed`, where the vertex shader
uses the Catmull-Rom carved height at the vertex; at a node centre those agree, between nodes they need not.

### 4.1 What is in the channels

| per node, n 18 450 | p5 | p25 | median | p75 | p95 | max | mean |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **α**, the drawn void fraction | 0 | 0.0003 | **0.0026** | 0.0188 | 0.0737 | 0.3421 | 0.0166 |
| **plume depth**, m, the drawn channel | 0.124 | 0.534 | **0.933** | 1.660 | 1.660 | **2.000** | 1.002 |
| the water's own depth, m | 0.130 | 0.599 | 1.372 | 2.667 | 4.337 | 6.058 | 1.727 |
| **h = min(plume, depth)**, m | 0.124 | 0.534 | **0.910** | 1.660 | 1.660 | 2.000 | 0.995 |
| the drawn cover | 0.014 | 0.044 | 0.135 | 0.266 | 0.701 | **1.000** | 0.200 |
| **N = α·h/d + cover** | 0.026 | 0.271 | **2.47** | 20.5 | 90.7 | **685.1** | 20.4 |
| **R(N)** | 0.0028 | 0.0291 | **0.2147** | 0.5408 | **0.5500** | 0.5500 | 0.2652 |
| step 5i's value at the same node | 0.180 | 0.180 | **0.180** | 0.2621 | 0.5000 | 0.5000 | 0.2470 |

[M, all of it, read in the `bubbles` leg's own frame. The field is the same in all three legs — the change is a
fragment shader and a program key, with no write into any field [C], and §8.1's byte check takes that from the bytes —
but **the probe was run on one leg only**, so that is read and reasoned, not measured.]

| the layer count | nodes | share |
| --- | --- | --- |
| **N < 1**, less than one bubble layer | 7 400 | **40.1 %** |
| N 1–2, a film (R 0.10–0.18) | 1 418 | 7.7 % |
| N 2–5 | 1 926 | 10.4 % |
| N 5–12 — step 5i's **whole** range, 0.18 to 0.50 | 1 792 | 9.7 % |
| N 12–25 | 1 783 | 9.7 % |
| **N ≥ 25**, saturated at R ≥ 0.546 | 4 131 | **22.4 %** |

So the field is **not** the graded brightness step 5i's item 2 describes. It is close to bimodal: **two fifths** of
the foamy nodes are below a single bubble layer and **nearly a quarter** are past the curve's ceiling, with about a
fifth (N 2–12) in the range the cap covered. From the other side: **at least half the nodes sit at step 5i's aged
0.18 exactly** — its min, p25 and median are all 0.180 and its p75 is 0.262 — so the cap is nearly as bimodal in this
frame as the field is, just with narrower ends.

### 4.2 Why it is brighter, and it is not the ceiling

The field's unweighted mean reflectance over those nodes is **0.265**, slightly **above** step 5i's **0.247** — but a
node with a cover of 0.01 paints a hundredth as much white as one with a cover of 1, so the unweighted mean is not
what the pixels see. Weighted by the cover each node paints:

| cover-weighted mean reflectance, n 18 450 | |
| --- | --- |
| **R(N)**, this round | **0.433** |
| step 5i's aged cap | **0.335** |

**29 % brighter where the white is actually painted** [M] — which is the §3 result, in the field alone. The
cover-weighted mean is computed by the probe script, which was written before any leg was rendered, and its output was
read before §3's pixels were measured; it gets the sign and roughly the size of §3 right from the field and nothing
else. The cause is a correlation nobody had looked for: **the deep plume is under the thick
cover.** Weighting by cover lifts the field's mean by 63 % (0.265 → 0.433) and step 5i's by only 36 %
(0.247 → 0.335), so the field is the more strongly correlated of the two, and it is correlated the wrong way for this
target.

**It is not the asymptote.** R(N) is linear in its ceiling, so running the whole curve at **0.50** — Dierssen's field
whitecap, the number step 5i capped at — instead of the laboratory's 0.55 multiplies every value by 0.909 and the
cover-weighted mean by the same: **0.394, still 18 % above step 5i's 0.335** [M, exact arithmetic on the same nodes].
Lowering the ceiling would take back about a third of the brightening and no more.

---

## 5. What I am refuting, with the measurement

### 5.1 Step 5i §10 item 2: this is not the lever for the aged end, and it moves it the other way

Item 2 offers the bubble layers as *"the honest way to move the aged end **if the ride says it is too dark**"* — the
aged lace behind the break reading "as a sandy or dirty stain" being step 5i's own named likeliest objection.

At the lace, α is at or near zero and the cover is a few per cent, so N is a few hundredths of a layer and R(N) is
**0.001 to 0.03** [M, §4.1] — an albedo of effectively nothing, where step 5i puts 0.18. Item 2's premise is that
this is how you make the stain darker. **It makes it lighter.**

| the lace foreground on `bore-face`, x 760–1270 y 540–715, n 89 250, sRGB **code values** | off | `on` | **`bubbles`** |
| --- | --- | --- | --- |
| mean of 255 | 222.9 | **205.1** | **208.8** |
| 8 px local sd (its network) | 1.99 | 1.89 | **1.41** |
| share over 220 | 79.9 % | 0.1 % | 8.2 % |

[M; and on `side`'s far lace, x 960–1270 y 500–700, n 62 000: 204.0 → 197.4 → **198.5**, local sd 3.24 → 2.00 →
**1.87**. **Both boxes were drawn after the legs were looked at**, to put a number on an impression from the stills,
so they are **not** a judge and nothing in §3 uses them; `c2-step5j-runs/lace-boxes.txt` says so too. Each is a plain
rectangle of the drawn foreground, called "lace" for what dominates it **by eye** — there is no segmentation behind
the name.]

**The reason is in the composition, and it is the useful finding of this section.** The foam's white is mixed over
the water *by the cover*: `diffuseColor = mix( waterUnder, waterFoamColor * waterCrease, waterCover )` [C]. So once
the foam's albedo falls below the lit water's own brightness, **taking it lower makes the pixel brighter, not
darker**, because what shows through is the water. **The aged end has a floor, and the floor is the water under it** —
which is a thing step 5i's §10 item 2 could not have known and which applies just as much to moving
`FOAM_REFLECTANCE.aged` (§9 item 2) as to this field. The lace's network also flattens by **26 %** at 8 px, because
the field varies on the render grid's 1 m spacing rather than per pixel (§5.3).

**What I over-read before measuring it.** From the two stills alone the far lace looked *gone* under `bubbles`. It is
not gone: it is 1.8 % brighter than under `on` and its network is a quarter flatter. The boxes are in this file
because the stills were not enough, and the first version of this paragraph said "removes the material", which the
numbers do not support.

### 5.2 Step 5h §5.3's framing: the layer count cannot grade a surf-zone plume

5h introduces N as the fix for a wrong driving variable: *"reflectance is set by the number of bubble layers along the
path … not by a coverage fraction."* True as physics, and measured here as an argument that defeats itself in a
renderer.

**R(N) reaches 90 % of its ceiling at N = 11.5 layers, which is α·h = 11.5 mm.** With the drawn h at a median of
**0.91 m**, that is **α = 1.3 %**. The drawn α is above 1.3 % at a quarter of the foamy nodes [M, p75 = 0.0188], and
the physics puts a plunging surf-zone plume's peak void fraction at **20 %** (`AERATION.peak`) [C, S, Blenkinsopp &
Chaplin 2007 — sourced, unlike the plume depth beside it, which its own file marks provisional]. So
in any water that has actually been aerated, **N is tens to hundreds and R is pinned at the ceiling**: the curve's
graded part lives between α·h of about 1 mm and 25 mm, and the drawn field's **maximum is 685 layers** (685 mm of
α·h) [M], while a plume at the physics' own peak void fraction in the drawn median depth — 0.20 × 0.91 m — would be
**180**. That is **one to two orders of magnitude past the knee**, not three; an earlier draft of this paragraph said
three and the arithmetic does not support it.

**The layer count is therefore a step function in disguise**, and all of the grading the drawn field shows comes from
α running to zero in the lace, not from the plume's thickness. That is a statement about the physics and the fields
together, and it would be true of a correct `AerationField` as well as of this one.

### 5.3 Why the relief went back to the off leg's value

Step 5i's 2.98 → 4.93 at 8 px tiles came from an albedo that varies **with the churn and foam pattern**, which are
computed per pixel. The layer count varies with **α and h**, which are render-node fields sampled at the grid's **1 m
spacing** [M, probe: spacing 1.000] and interpolated bilinearly. At these cameras 1 m is far wider than an 8 px tile,
so the field adds shading at a scale the relief measure cannot see and removes the per-pixel variation the cap had.
The region's own contrast falls too (0.129 → 0.111), so **it did not buy large-scale contrast with the small-scale
relief it spent** — which also closes step 5i §10 item 5's hope that this would help there.

### 5.4 The plume-depth channel is not always a plume depth

Worth recording even though it is not the cause. Under `?wave=library` the bore writes its own aeration, and its
depth is `BORE_FOAM.plume = 2` m, documented in its own file as *"how deep the white is seen through, m (the consult's
'about 2 m of water')"* — an **optical path for the white-through-water tint**, not a bubble plume's depth [C,
`src/wave/library/boreFoam.ts`]. The probe sees it: the drawn depth's p75 and p95 are both exactly **1.6595 m** and
its max is exactly **2.000 m** [M]. **I did not trace why so many nodes share 1.6595**, and I am not claiming the
mechanism.

But this is **not** why the field brightens. The sea's own plume is the same order: `AERATION.plungeDepth` is 0.8 of
the breaker's height — **its own file marks that provisional** [C, P] — so on a pool wave of a metre and a bit it is
of order a metre, which is what the drawn median h of **0.91 m** is. **I did not measure this frame's own breaker
height**, so that is an order, not a figure. §5.2 holds at either depth, and at anything within a factor of ten of
either.

---

## 6. What the owner would see, and what to ask

**Ride `?foamAlbedo=on` first.** It is the one with the better numbers on every measure here and it is the one step 5i
shipped for a ride.

If `bubbles` is worth a look in the same sitting, it is for exactly one question, and the stills say where:

- **the aged lace behind the break**, step 5i's own predicted objection. `bubbles` makes it **lighter and flatter**
  than `on` — 208.8 of 255 against 205.1 against the off leg's 222.9, with its network a quarter flatter (§5.1) —
  **not darker**, which is the opposite of what step 5i expected this lever to do. Look at `foam-on-bore-face.jpg`
  against `foam-bubbles-bore-face.jpg` across the whole foreground, and the same pair on `side` at the right-hand
  third;
- **the live pile** is slightly brighter under `bubbles` than under `on` (0.55 against 0.50 where it saturates) and
  the two are hard to tell apart there;
- **the wave's body** reads thicker under both than under off, which is the owner's standing complaint.

**Judge it by foam against water inside one picture, never by the foam alone** — the exposure is unknown, the ratio
within a frame is not.

If the answer is "the lace is the thing that looks wrong", the finding is **not** that `bubbles` is right; it is that
the lace's *own* albedo wants moving while the pile's stays at 0.50 — and §9 item 2 is the cheap way to do that
without a field, together with the floor §5.1 found under it.

---

## 7. What I will not claim

- **That `bubbles` is better than `on`.** It is worse on all five measures in §3.1, and the brief's named judge is the
  one it does worst on relative to the others.
- **That it is worse to look at.** Every number here is photometric and every photometric measure is against **one
  photograph through an unknown camera curve**. The flatter, lighter lace is a real difference the owner may prefer,
  and §6 is written so a ride can say so.
- **That lowering the asymptote to 0.50 would fix it.** §4.2 gives the exact arithmetic for the cover-weighted mean —
  0.394 against step 5i's 0.335 — and that is a statement about the **field**, not about the pixels. I did not render
  that leg, and §2's tone-map caveat says a mean albedo does not map to a mean pixel.
- **That the within-frame ratio should be 0.748.** Rule 4 of the brief and step 5i's own discipline: nothing here was
  re-fitted to it, and nothing should be.
- **That the cover weighting in §4.2 is a weighting by drawn pixels.** It weights render nodes by their cover, not by
  the screen area each node covers, which varies by a large factor across these frames (§4). It predicts the sign and
  roughly the size of the §3 result and it is not a derivation of it.
- **That the correlation in §4.2 is causal in the physics.** It is a measured correlation on one frame of one spot:
  thick cover and deep plume both come from a live breaker, which is unsurprising, but 18 450 nodes of one frame is
  not a population of waves.
- **That the plateau at 1.6595 m is understood.** §5.4 reports it and traces it no further.
- **That d_bubble = 1 mm is our foam's bubble size.** It is the scale of the bubbles carrying most of the void
  fraction in a real breaker [S]. Our `AerationField` has no bubble-size distribution at all.
- **That `cover` is a layer count.** §1.1 says what the identification rests on and what it does not.
- **Anything about the other spots, Classic, the worker path, or the owner's machine.** Everything here is the 2 m
  pool Barrel, Rich, midday, in-page, on this machine.
- **Anything about cost.** §8.1's Canyon legs bound the simulation's cost at zero because nothing in the simulation
  changed. The fragment's extra work under `bubbles` — a `min`, a `clamp`, a divide and an `exp` per covered pixel,
  against `on`'s two `smoothstep`s and a `mix` — was **not timed**, here or anywhere.
- **Anything about motion.** One held frame per camera.
- **That `bubbles` removes the aged lace.** It does not, and I wrote that it did before I measured it. §5.1 carries
  both the correction and the numbers.
- **That the two lace boxes in §5.1 are evidence for or against either leg.** They were drawn after the legs were
  looked at. They quantify an observation; they do not judge one.
- **That N = 685 is a plume anyone has measured.** It is this drawing's field at one node of one frame, and §5.4
  says the depth channel that produced it is not always a plume depth.
- **That the owner will like either of them.**

---

## 8. Seatbelts

| | |
| --- | --- |
| `npx tsc --noEmit -p .` and `npx tsc --noEmit -p server/tsconfig.json` | **exit 0 each**, read on their own line (`c2-step5j-runs/tsc.txt`) |
| the suites | **374 of 374** over 14 files (`c2-step5j-runs/suite.txt`): step 5i's own thirteen — `waterLooks.test.ts` (the **shader snapshots**), `water/foamAlbedo` (now 23 tests), `water/foamLook`, `water/foamFreshness`, `water/rollerLook`, `water/skyReflection`, `water/specular`, `RollerFrontMesh`, `barrel/brokenCrest`, `barrel/SweptBarrelMesh`, `SprayCloud`, `PlungingLip`, `PhysicalMode` — plus `EdgeBand.test.ts`, which pins the one other place that rewrites `vWaterAir` in the Rich vertex, the varying this round's layer count reads |
| **the shader snapshots** | **unchanged, and they passed unmodified.** `src/scene/__snapshots__/waterLooks.test.ts.snap` is **not in `git status`** after the run, and `git diff --stat origin/main HEAD` does not list it. They could not have changed: with the switch off `foamAlbedoPars()` is never called and `withFoamAlbedo` is never reached |
| **the default, byte for byte** | five ways. (1) The **off leg's pixels** reproduce step 5i's published off-leg figures to four decimals and its footprints to the pixel (§2) — and step 5i's off leg reproduced step 5h's. (2) `foamAlbedo.test.ts` compiles one Rich material off → `bubbles` → `on` → off and asserts the first and last are `toEqual`. (3) `foamAlbedoProgramKey()` is `''` with the switch off, so the program cache key is unchanged. (4) The shader snapshots, above. (5) The Canyon byte check, §8.1 |
| **`?foamAlbedo=on` unmoved** | the `on` leg reproduces step 5i's published `on` figures to four decimals on all four cameras and to the pixel in all four footprints (§2), and the test asserts `on`'s compiled program is identical before and after a round trip through `bubbles` |
| **the Canyon byte check, both protocols, with leg C** | §8.1 |
| **the deletions column** | §8.2 |
| `src/wave/SurfZoneSimulation.test.ts` | **not run, and closed by reading**, as `c2-step5g.md` §7.3 and `c2-step5i.md` §8.3 do. §8.3 |

### 8.1 The Canyon byte check

Run from `scripts/m1-cpu-bench.ts`, bundled with rolldown, **four** legs, in `c2-step5j-runs/canyon-bytes.txt` — step
5i's three plus a fourth, `?foamAlbedo=on`, so this tree's `on` is checked from the bytes as well as from the pixels.
Legs C and B set `location.search` through a two-line wrapper. The module **is** in the bundle and **so are this round's own
constants** — it contains `src/scene/water/foamAlbedo.ts`, `devParam("foamAlbedo")` and three occurrences of
`BUBBLE_DIAMETER` [M] — so leg C is a real test of the new value and not of an absent file.

**Both hashes had to be main's on every leg, and were.** This change writes nothing into the snapshot: it is a
fragment shader and a program key, entirely downstream of it. A moved snapshot hash would have been a bug, not a pass.

| | snapshots | state | |
| --- | --- | --- | --- |
| main's published figures, unchanged 5f → 5i | `ea3d57a4d49f4b48` | `a1a2555739210f96` | fresh spin-up |
| **leg A**, switch off, fresh spin-up | **`ea3d57a4d49f4b48`** | **`a1a2555739210f96`** | main's, byte for byte |
| main's published figures | `a8ac71b70eac2add` | `6319ed883e54b32e` | cache read |
| **leg D**, switch off, cache read | **`a8ac71b70eac2add`** | **`6319ed883e54b32e`** | main's, byte for byte |
| **leg C**, `?foamAlbedo=bubbles`, cache read | **`a8ac71b70eac2add`** | **`6319ed883e54b32e`** | **both unmoved** |
| **leg B**, `?foamAlbedo=on`, cache read | **`a8ac71b70eac2add`** | **`6319ed883e54b32e`** | **both unmoved** |

[M, 3 600 steps each, exit 0 on all four]. **The switch touches no water, no foam, no air, no snapshot and nothing a
rider feels, at either of its values.** Leg B is step 5i's own leg C re-run on this tree, which is the byte-level half
of §2's claim that `?foamAlbedo=on` has not moved.

**The timings in that file are not a claim and nothing here quotes them**: the legs ran while this machine was also
running typechecks, a vitest suite and the image measurements, so their ms rows are not comparable with step 5i's.
What the legs bound is the **simulation's** cost, at zero, from the bytes rather than from a clock.

### 8.2 The deletions column

`origin/main` moved under the branch while this round was running, from **`9c1acb9f`** to **`726473a0`** (steps 3.2x
and 3.2y, the surfer track). The branch was **rebased** before the column was read, and
`git diff --name-only 9c1acb9f origin/main -- src/ scripts/ server/` is **empty** — all of main's new commits are
under `docs/` [M] — so §8.1's legs, bundled before the rebase, are the rebased tree's code byte for byte and did not
need re-running.

Read after the rebase, the column is **25 deletions** — the half that cannot go stale, so it is the half quoted here
— and `c2-step5j-runs/deletions.txt` prints **all twenty-five in full**, grouped by file, with what replaced each.
**Every one is a line this round rewrote in place**: one row of `docs/research/whitewater-sources.md`, five lines of
`WaterSurface.ts` (an import, two comments, the pars line and the hook call), two of the test's import list, and
seventeen of `foamAlbedo.ts` (its header's Dev paragraph, `withFoamAlbedo`'s comment, signature and body, the mode's
comment and literal, `foamAlbedoOn`'s body, `setFoamAlbedo`'s signature and body, and the program key's comment and
body).

`git diff --name-only origin/main -- src/` lists **three files**: `scene/WaterSurface.ts`,
`scene/water/foamAlbedo.ts` and its test. Two docs change outside this round's own folder: the tube-spray reference's
README (a **pure insertion**, its 5j bullet after 5i's) and `whitewater-sources.md`, which gains **d_bubble = 1 mm**
as a row of its own and has its reflectance row's stale *"not yet changed"* corrected.

**The read that mattered.** Taken before the rebase, the same column read **1 308 deletions over 36 files**, because
the branch was eight commits behind and main's own doc changes came back as a reverse diff. That is not a silent
revert, but it is exactly the shape of one, and it is the reason this column is read against a rebased tree and not a
stale one.

### 8.3 `SurfZoneSimulation.test.ts`, closed by reading

The file declares 644.5 minutes of per-test timeout budget with one test allowed four hours alone, so it cannot gate a
merge; the brief withdraws it and asks for the reading instead.

**What this change can reach.** It touches three files under `src/`: `scene/water/foamAlbedo.ts`,
`scene/water/foamAlbedo.test.ts` and `scene/WaterSurface.ts`. All three are under `src/scene/` — the drawing — and
inside them the change is (1) two new constants and five pure functions, (2) a second GLSL pars string, (3) one extra
argument on the crease hook, (4) a three-way switch value and its program-cache-key part. **No uniform's value
moved**, no solver field, no foam field, no aeration field, no snapshot, no `SurfZoneConfig` key, and nothing in
`src/wave/` at all. `FarFieldOcean.ts`, which step 5i touched, is **not touched** this round.

**Every assertion in that file that touches any of it.** Grepped over its 2 301 lines for `waterFoamColor`,
`foamAlbedo`, `bubbleLayers`, `FOAM_LAYERS`, `BUBBLE_DIAMETER`, `albedo`, `WaterSurface`, `richWaterGlsl` and
`scene/`: **no hits of any kind** [M]. It never imports anything under `src/scene/` and never reads a drawn colour.
§8.1's byte check is the harder version of the same claim, taken from the bytes.

---

## 9. Next, in order

1. **The owner's ride of `?foamAlbedo=on`**, still step 5i's item 1 and still the first thing. `bubbles` is worth a
   second look in the same sitting for the lace question alone (§6). **Everything below waits on that ride**, because
   every number in §3 says the field is not an improvement and only a ride can say whether the lace is.
2. **Split the lace from the pile without a field**, which is what §5.1 and §5.2 together point at. The two ends the
   owner can object to are the **live pile** (step 5i already puts it at the sourced 0.50) and the **residual lace**
   (step 5i puts it at 0.18, a thin-foam number, where the sourced ten-second end is 0.03–0.10). Moving only the aged
   end is one constant in `FOAM_REFLECTANCE`, costs nothing, and does not need a layer count — **and it is the honest
   lever, where step 5i thought this round was.** But §5.1 also prices it: **the aged end has a floor, and it is the
   water under the lace.** At 0.18 the lace reads 205.1 of 255 and at the field's 0.001–0.03 it reads 208.8, so
   **there is a turn somewhere below 0.18 and this round did not find it** — it has two points and not a curve.
   **Measure the turn before choosing a number**: it is a few legs of the same frame at a few values of `aged`, and
   no new code at all.
3. **The ten-second clock** (step 5i item 3), unchanged and now more necessary, not less: §5.2 says the layer count
   cannot grade a plume, so the only drawn quantity that can separate fresh whitewater from ten-second lace is an
   **age**, and `FoamField` carries one in the physics that the snapshot sums away (`SurfZoneSimulation:2950`) [C].
   It still costs a texture channel and a worker pass; it is now the only route on the table.
4. **The flat water** (step 5h §5.4 item 2, step 5i item 4), untouched: ours reads **0.80×** the photograph's
   (0.6022 against 0.7582 on the `bubbles` leg, 0.6012 on `on`, 0.6089 off) and `RICH_WATER.reflection = 0.5` is the
   named suspect, still untested.
5. **The large-scale contrast** (step 5i item 5): §5.3 shows a 1 m field does not buy it, so this needs its own idea.
6. **The swept veil band** (step 5h §8 item 2), unchanged and still right.

---

## 10. Files, and how to run them again

- **The switch: `?foamAlbedo=bubbles`**, a third value of step 5i's `?foamAlbedo`, as the brief asked. `off` and `on`
  are unchanged. `window.waterFoamAlbedo('bubbles')` switches it in a page; the boolean form still means `on`.
- The constants, their sources and the formula: `src/scene/water/foamAlbedo.ts`; 23 tests in
  `src/scene/water/foamAlbedo.test.ts`.
- The three-way stills at step 5i's four cameras: `c2-step5j-stills/`, and its README says what to look at.
- The measurements, in `c2-step5j-runs/`: `within_frame3.py` (step 5i's script with a third leg and nothing else
  changed), `boxes.sh` (step 5h's own `foam-relief.py` on the three legs), `within-frame.txt`, `boxes-srgb.txt`,
  `lace-boxes.txt` (§5.1's two after-the-fact boxes, labelled as such in the file itself), `canyon-bytes.txt`,
  `suite.txt`, `tsc.txt`, `deletions.txt`, and `png.py`.
- The field probe: `c2-step5j-probe.js` and its output in `c2-step5j-runs/field.json` — the first reading of what is
  in the two aeration channels.
- The three legs, from the repository's root — step 5i's command, with the probe added:
  ```
  node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5381 --out=<dir> --compute=gpu \
    --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library" \
    --shots='bore-face:rich:midday;view@27.4,2.8,-150.6@40.8,1.5,-153.1:rich:midday;view@44.7,3.5,-134.6@40.8,1.5,-153.1:rich:midday;view@39.0,7.0,-133.0@40.8,1.5,-153.1:rich:midday' \
    --advance=40 --first=skip --probe=docs/research/wave-strategy-alternatives/c2-step5j-probe.js
  ```
  The other two legs are the same address with `&foamAlbedo=on` and `&foamAlbedo=bubbles`. The four shots come out as
  `bore-face`, then `side`, `front`, `above`. `ref.png` is the owner's webp through `sips -s format png`.
- Not run: `SurfZoneSimulation.test.ts` (§8.3); rider sessions, catch reports and autopilot rides (the brief's rule);
  Classic; the other spots; the worker path; any timing of the fragment; a leg with the asymptote at 0.50; and
  everything in §9.
