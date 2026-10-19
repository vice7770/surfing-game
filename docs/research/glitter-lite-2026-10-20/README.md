# A cheap sun road on Medium (web-ocean plan, step 7 follow-up) · 2026-10-20

Branch `claude/glitter-lite`, from `claude/playtest-2026-10-20` at 3064e25f (the main line with #120 and the foam
freshness). Drawn only, Rich only, Medium only. Nothing under `src/wave`, `src/game` or `src/physics` changed.
Classic, High and Ultra draw as before. The tank's sampler count does not change: the edge band stays at 16, and
`textureUnits.test.ts` now also builds every program with the lite road and with the glitter off.

## What Medium drew, and what it draws now

**Before.** Three's GGX for the sun, at the Rich gloss (roughness 0.08), widened only by the ripples' variance
(`richRoughness`). That gave a thin, short road at sunset and a small blot on the face at midday. High's glitter adds
about 0.0024–0.006 of unresolved slope variance per axis, plus the chop's spread. That is about a hundred times the
gloss, so its road is wider and longer, and it breaks into glints toward the camera.

**Now (`RICH_SUN_LITE_LIGHTS`, `src/scene/water/glitter.ts`).** The sun's specular on the tank, the edge band and the
far ocean is a **Beckmann lobe**: the isotropic Gaussian of slopes about the drawn normal. Its α² (= 2σ²) is the
glitter's own spread (`liteSunAlpha2`) without the screen-space term, made isotropic:

- the floor (gloss and sun disc);
- the foam's matte;
- the unresolved slopes (0.0024, growing by 0.0035 from 30 to 500 m);
- the chop's spread by distance;
- the ripples' unresolved variance (`waterRippleVariance`, already sampled).

How it is built:

- **The spread** is computed once per pixel at the end of the water's body, in one float (`waterGlitterLite`).
- **The lights.** Three's direct lights take the lobe with no branch. The sun gets this α², and the fill (dark under
  the photographed sky) keeps its material's. Masking is three's height-correlated Smith, taken from α² directly.
- **What it adds:** no samplers, no varyings, no moment fetches and no screen-space derivatives.
- **Sheets** (lip, curl, swept barrel) keep three's GGX on Medium, as before.

What High has that this leaves out:

- the anisotropy: the chop's and the ripples' per-axis moments;
- the screen-space term;
- the slope-space frame (Beckmann sits about the drawn normal);
- the Gaussian's own Smith;
- the footprint-filtered chop mean.

**Switches:** `?glitter=lite` forces the lite road, `?glitter=off` draws today's Medium (three's GGX), and
`?glitter=on` forces High's glitter. In a page, `waterGlitter({ on: false, lite: true | false })`.

## What was tried

The variants were timed on the Canyon on Medium, against `?glitter=off`, as described under "Cost" below. The
figures are lineup / face / horizon, in ms.

| Variant | Look | Cost |
| --- | --- | --- |
| Three's GGX, α² widened by the same spread | The road widens, but GGX's long tails spread it into a broad, dim peach glow toward the camera. That is not High's look (`explore-ggx-tails.jpg`, row 2). | +0.1 / +0.1–0.4 / −0.2 to +0.4 |
| Beckmann, with a branch per light (the glitter's arrangement: `if` not the sun, three's light) | As the next row | +0.3 / +1.5 / +1.5 (12 rounds) |
| Beckmann, branch-free, the spread added to the material's roughness | The road matches the glitter forced on Medium. The face's highlight washes out, because the material's roughness carries twice the ripple variance and three's geometry roughness. | +0.15–0.2 / +0.2 / +0.2–0.6 |
| Beckmann, branch-free, the glitter's own spread, three's GGX kept for the fill | The closest to the glitter, road and face | +0.18–0.23 / +0.24 / +0.53 |
| **As shipped:** the same, the fill also Beckmann at its own α² | The same | see below |

## Cost (GPU timer, M1, pane hidden)

The page was `?inpage&waterSheet&spot=canyon&compute=gpu&graphics=medium`, with `waterSheetGpuTime(shot, 'rich', n)`.

- **Arms:** `off`, `off2` (the same program again, which measures the noise) and `lite`. They were interleaved in one
  page, with the order rotating and reversing each round.
- **Each value** is the median of the per-round differences against `off`, with the interquartile range in brackets.
  Each round's value is the median of 12–16 frames.
- **The machine was shared.** Another agent's High page drew on the same GPU, and a test suite ran in another
  worktree. Today's Medium face and horizon ran at 21–70 ms and 29–96 ms, against 13 and 22 ms in the chop-glitter
  pass. Only the lineup was steady. Rounds taken under that contention scale every arm, including the difference.

| Run | lineup | face | horizon |
| --- | --- | --- | --- |
| Run A, 50 rounds | +0.17 [0.08, 0.25] (base 12.8) | **−3.29** [−5.70, −1.69] (base 25.2) | **−0.67** [−2.42, 0.69] (base 48.6) |
| Run A, noise (off2) | +0.01 | +0.18 | +0.06 |
| Run B, 40 rounds | +0.25 (base 18.2) | **−3.82** [−5.04, −1.14] (base 31.2) | **−0.26** [−2.36, 1.80] (base 61.0) |
| Run B, noise | −0.31 | +0.08 | +0.91 |
| Run C, 40 rounds | +0.25 (base 17.2) | **−3.49** [−6.71, −0.39] (base 36.6) | **−3.11** [−6.35, 2.86] (base 63.8) |
| Run C, noise | −0.03 | +0.33 | −0.32 |
| Run D, 50 rounds | +0.02 [−0.14, 0.13] (base 16.2) | (base 70: unusable) | (base 96: unusable) |
| Run E, 50 rounds | – | **−0.27** [−1.04, 0.86] (base 34.5) | **−0.54** [−5.98, 2.58] (base 70.4) |
| Run E, noise | – | −0.00 | −0.47 |

In every usable run, the shipped lite road timed at or below today's Medium on the face (−0.3 to −3.8 ms) and the
horizon (−0.3 to −3.1 ms), and within +0.25 ms on the lineup. All three shots are within the +0.5 ms budget. The
size of the saving varies from run to run more than the noise arm does.

**The program sits at a cliff, so treat the saving as luck.** Run C also timed the same lite road with the chop's
spread taken from its own exp(−d/40), instead of from the fade the normal chunk already computes. That one change cost
**+1.64 ms on the face and +2.61 ms on the horizon** against `off` (+0.14 on the lineup). Before the fade was reused,
two runs of the lite road gave:

- face +0.60 and +1.05;
- horizon +2.10 and +0.95, at bases of 32–67 ms.

The arrangement as shipped lands below the cliff on this M1's compiler. A later change to the tank's program could
move it back. The owner's shown-pane check below decides.

## Stills (`*.jpg`)

Each still has three rows: Medium before (`?glitter=off`), Medium after (the lite road), and High. All are 1280×720
per row, from the same held sea (High's rows come from a `graphics=high` page, with the FFT chop).

- **`canyon-sunset-road.jpg`, `beach-sunset-road.jpg`.** The road is wider, with a brighter core, and runs further
  toward the camera, breaking into glints as High's does. In the road's region, the pixels above 0.8
  linear luminance are:
  - Canyon: before 5.0 %, lite 5.5 %, High 5.6 %;
  - Beach: before 4.8 %, lite 5.8 %, High 6.2 %.

  Above 0.95 (the core): Canyon 1.9 / 2.3 / 2.4 %, Beach 1.9 / 2.3 / 2.7 %. High's road reaches a little further in
  front, from its finer FFT chop.
- **`canyon-dawn-road.jpg`, `beach-dawn-road.jpg`.** The sun is 2° up, so the road is faint and red. The lite road
  reaches further toward the camera in broken glints, like High's. Before, it stopped short.
- **`canyon-face-midday.jpg`.** GGX's small blot becomes High's long, broken highlight down the face. Pixels above 0.8
  are 5.7 % before, 15.7 % lite and 15.5 % High; above 0.95, 1.7 / 2.6 / 2.9 %.
- **`beach-face-midday.jpg`.** Before, nothing; lite and High show the same scatter of glints. The bright triangular
  facets near the camera show in High as well. They are the mesh's facets catching the sun, not this change.
- **`explore-ggx-tails.jpg`** (Canyon sunset, 960×540 rows):
  1. today;
  2. GGX widened, which became a glow;
  3. an early Beckmann cut;
  4. the glitter forced on Medium.

## Tests

- **`glitter.test.ts`** checks the following:
  - Beckmann at α² equals the glitter's Gaussian, isotropic, in the normal's frame (200 cases, to 6 digits).
  - `liteSunAlpha2` is the glitter's covariance without the screen-space term: its two axes summed.
  - The GLSL matches its twins, has no branch, keeps the fill on its material's spread, and reuses the normal chunk's
    fade.
  - Medium gets the lite road, `off` gets three's lighting, and sheets keep three's.
- **`textureUnits.test.ts`** builds every program with the lite road and with the glitter off. The units hold,
  every name is declared, and only Rich tank, edge-band and far-ocean programs carry `WATER_SUN_LITE`.
- **`FftChop.test.ts`** checks the lite GLSL against reserved words.

Run alongside: `specular`, `waterOptics`, `WaterSurface`, `EdgeBand`, `FarFieldOcean` and the rest of
`src/scene/water`. `tsc --noEmit` is clean, apart from the known `zzProfile` errors.

## For the owner (pane shown, M1)

1. **The game on Medium:** `http://localhost:<port>/?graphics=medium` (the lite road) against
   `?graphics=medium&glitter=off` (today), at the Canyon and the Beach at sunset and dawn. `?graphics=high` is the
   reference.
2. **The frame time:** open `http://localhost:<port>/?inpage&waterSheet&spot=canyon&compute=gpu&graphics=medium` with
   the pane shown. Once `waterSheetReady` is true, alternate in the console
   `waterGlitter({ on: false, lite: false })` and `waterGlitter({ on: false, lite: true })`, and between them run
   `await waterSheetGpuTime('lineup' | 'face' | 'horizon', 'rich', 60)`.

## Still open

- **The cliff.** The saving on the face and horizon depends on the compiler's choices. Recheck after any change to the
  tank's program.
- **The road keeps no anisotropy.** At grazing, High's chop moments stretch the glints along the waves, and the lite
  road cannot.
- **The fill under the painted sky** (the fallback when the photographed sky fails) is now drawn as Beckmann at its
  own roughness, not GGX. That narrows its tails a little. Under the photographed sky the fill is dark.
