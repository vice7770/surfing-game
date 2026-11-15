# C2 step 5j: three legs on one wave — off, step 5i's cap, step 5j's bubble layers (2026-11-15)

The four cameras steps 5g, 5h and 5i used, the same held frame — **t 72 s** of the 2 m pool Barrel, `--compute=gpu`,
the owner's own ride address with `?wave=library` — in **three** legs that differ only by `&foamAlbedo=`:

| | |
| --- | --- |
| `foam-off-*` | today's default: the foam colour `#d8f2e9` used straight as a diffuse albedo, **0.840** in linear light |
| `foam-on-*` | **step 5i**, `?foamAlbedo=on`: that colour levelled to a sourced active whitecap's **0.50** and aged to **0.18** over the plume's void fraction. Unchanged by step 5j — these frames reproduce step 5i's published figures to all four printed decimals and its footprints to the exact pixel count |
| `foam-bubbles-*` | **step 5j**, `?foamAlbedo=bubbles`: the same reflectance taken from the **number of bubble layers** under the pixel, N = α·h/d_bubble + cover, R(N) = 0.55(1 − e^(−0.2N)) |

**The numbers say the cap wins.** On `side`, which is the geometry of the owner's own photograph:

| `side`, same boxes (n 63 800 / 50 000) | off | **`on`** | **`bubbles`** | the photograph |
| --- | --- | --- | --- | --- |
| broken water / flat water, display-linear | 1.310 | **1.102** | 1.146 | **0.748** |
| broken water / clean teal face | 3.622 | **3.009** | 3.134 | **2.547** |
| near-white share, sRGB code values over 220 | 83.5 % | **18.7 %** | 21.9 % | **14.6 %** |
| local relief, sd over 8 px tiles | 2.98 | **4.93** | 2.92 | **5.05** |

`bubbles` is brighter than `on` on all four cameras (its ratio 2–8 % higher) and gives back all of the small-scale
relief. **Ride `on` first.** `../c2-step5j.md` §3 has the full tables and §5 why.

## What to look at, and the one question `bubbles` is worth a look for

**The difference between `on` and `bubbles` is almost entirely the aged lace behind the break, not the pile.**

| | |
| --- | --- |
| `foam-on-bore-face.jpg` vs `foam-bubbles-bore-face.jpg` | **the whole foreground, and the clearest pair of the four.** The old foam behind the break is step 5i's own predicted objection. Under `bubbles` it is **lighter and flatter**, not darker: 208.8 of 255 against `on`'s 205.1 and the off leg's 222.9, with its 8 px network a quarter flatter (n 89 250). The reason is in `../c2-step5j.md` §5.1 and it is the useful finding of the round — once the foam's albedo drops below the lit water under it, taking it lower makes the pixel **brighter** |
| `foam-on-side.jpg` vs `foam-bubbles-side.jpg` | the same thing at the right-hand third, smaller: 198.5 against 197.4 and 204.0 (n 62 000) |
| the live pile, in every pair | almost the same under the two switched legs — 0.55 where the layer count saturates against the cap's 0.50 — and plainly different from off in both |
| `foam-*-front.jpg`, `foam-*-above.jpg` | the pool wall behind the wave, and the peel from above |

### The within-frame ratio beside every still

Broken water against the flat water **in the same frame**, display-linear, step 5i's boxes unchanged. **Only `side` is
comparable with the photograph** — the other three cameras' flat boxes are unbroken face water, not a glassy
foreground, so read those rows across the legs and not across the cameras.

| the stills | broken n | flat n | `foam-off-*` | `foam-on-*` | `foam-bubbles-*` |
| --- | --- | --- | --- | --- | --- |
| `*-side.jpg` (the photograph's own geometry; it reads **0.748**) | 63 800 | 50 000 | 1.310 | **1.102** | 1.146 |
| `*-bore-face.jpg` | 108 000 | 40 000 | 1.358 | **1.021** | 1.105 |
| `*-front.jpg` | 33 750 | 23 400 | 1.861 | **1.682** | 1.718 |
| `*-above.jpg` | 41 400 | 39 600 | 1.616 | **1.316** | 1.352 |

**Both lace boxes above were drawn after the three legs were looked at**, to put a number on an impression. They are
not a judge and nothing in §3 of the write-up uses them.

So the question a ride can answer, and the measurements cannot: **was the lace the thing that looked wrong?** If it
was, the answer is not this field — it is the aged end of step 5i's two constants, which is one number and costs
nothing (`../c2-step5j.md` §9 item 2), and which has a floor the same section prices.

## Read this before judging any of them

**They will look dirty at first glance, and that reaction is correct.** Real whitewater is not white: an active
whitecap reflects about **0.50**, thin foam **0.18**, and never more than about 0.55–0.60 even in a laboratory
(Dierssen 2019; Koepke 1984), where ours is a diffuse albedo of **0.840**. In a side-on view whitewater is the
**darker** thing in the frame.

**So judge foam against water inside one picture, never the foam on its own.** Absolute brightness depends on an
exposure nobody knows; the ratio inside one frame does not.

**Not shown here:** motion. Every frame is one held still, and how the lace reads as it drifts is exactly what a still
cannot say.
