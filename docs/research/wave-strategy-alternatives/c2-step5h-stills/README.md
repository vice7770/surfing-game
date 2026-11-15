# C2 step 5h: the veil's opacity, on against off (2026-11-15)

The four cameras step 5g used, the same held frame — **t 72 s** of the 2 m pool Barrel, `--compute=gpu`, the owner's
own ride address with `?wave=library` — in two legs that differ by `&lipVeil=on` and nothing else. The off leg is the
control twice over: it carries **1390 live particles, step 5g's own held-frame figure to the particle**, so these and
`../c2-step5g-stills/` are looking at the same water.

| | |
| --- | --- |
| `veil-on-front.jpg` / `veil-off-front.jpg` | **look at these first**, and at 5g's pair beside them. The pool's wall stands behind the wave here, which is our own stand-in for the photograph's pier and the one place in our frames where translucency can be judged against a flat dark background |
| `veil-on-side.jpg` / `veil-off-side.jpg` | along the crest, 14 m out — the geometry of the owner's own photograph. Also the frame §5 of `../c2-step5h.md` measures the broken section in |
| `veil-on-above.jpg` / `veil-off-above.jpg` | raised, looking down the peel |
| `veil-on-bore-face.jpg` / `veil-off-bore-face.jpg` | step 5d's landed-bore camera, for continuity |

## What the numbers say, so the eye is not asked to do it alone

Because both legs are the same frame of the same sea, the veil's **footprint** is exactly the set of pixels they
differ on, and inside it every pixel has a before and an after. In linear light (`../c2-step5h-runs/footprint.py`):

| | lift of the background | **sd ratio** | τ |
| --- | --- | --- | --- |
| 5g, constant alpha, `front` | +0.084 | **1.04** | 0.23 |
| **5h**, `front` | +0.024 | **0.92** | 0.40 |
| 5g, constant alpha, the upper half of `front` — the veil over the wall | +0.093 | **2.03** | — |
| **5h**, the same | +0.041 | **1.31** | 0.17 |

**A cloud attenuates what is behind it, so its sd ratio is under 1; discrete objects add structure of their own, so
theirs is 1 or above.** 5g's blobs more than doubled the wall's own variation. This round's veil adds 44 % of that
light for 31 % of that added structure, and attenuates rather than adding on all four cameras.

## What to look for, and what not to claim

**Right:** the alpha follows the water now, so the veil is translucent where it is thin and the background reads
through it; the stray white dots high in 5g's sky are gone, because the millimetre drops fall out of the veil in a
quarter of a second as they do in the water; and near the lip the optical depth is 0.38–0.49, which is inside the
bracket the owner's photograph supports.

**Not right, and it is the honest half:** **it is fainter than 5g's and its footprint is 28 % smaller.** The veil's
body standing over the crest measures τ 0.03–0.17, about a tenth of what it should be, and no value of φ fixes that —
translucency means each sprite is faint, so the body needs many sprites overlapping, and the pool is already pinned at
every Particles level. `../c2-step5h.md` §4.3 measures it and §8 item 2 says what does fix it. **If the first
reaction is "I can barely see it", that reaction is right.**

And the loudest thing in `veil-on-side.jpg` is not the veil at all: the broken section right of the curl is a flat
white mass that the switch moves by 0.2 of 255. `../c2-step5h.md` §5 measures it and recommends it over this.
