# The small chop and the sun glitter (web-ocean plan, items 4 and 5), 2026-10-17

Branch `claude/chop-glitter`, from `claude/wave-pool` at 18bfbe9f. Ideas taken from web-ocean (MIT licence, © 2026
Maksymilian Dendura) and rewritten in our TypeScript/GLSL. The source files that adapt its shader code credit it.

The surf-zone solver is untouched. The chop is drawn only, and every cascade stays shorter than `LONGEST_CHOP` (6 m).
Classic is unchanged except that its transform is faster. Its stills on the GPU tier are byte-identical JPEGs before
and after (`pair-beach-sunset-classic.jpg`).

## Item 4: the chop

**Packing and passes.** The inverse FFT now runs radix-4 Stockham passes. Each RGBA texel carries two complex fields,
and the first pass builds the time-evolved slope spectrum itself, so the spectrum needs no pass of its own. That makes
8 passes where radix 2 needed 17. Radix 16 (4 passes) is still supported, but on the M1 it timed slower: 0.83 ms
against 0.41 ms, because its sixteen-tap passes cost more than the four passes they save.

**Classic** keeps one 64 m patch of waves 0.5–6 m. Its spectrum is checked by hash (`chopSpectrum`), and its
frequencies are exact. The second field in each texel is left empty.

**Rich** draws the same wind sea as two cascades inside the one transform:

| Cascade | Patch | Waves | Share of slope variance (wind 6 m/s) |
| --- | --- | --- | --- |
| Coarse | 64 m | longer than about 2 m (crossover 1.6–2.5 m), up to 6 m | 51 % |
| Fine | 12.25 m (64 × 49/256) | 0.5 m to about 2 m | 49 % (79 % in calm air) |

- The two repeats line up only every 3136 m.
- The two shares add up to the full spectrum, and the total is scaled to the procedural chop's rms slope.
- The coarse patch reuses the Classic patch's random draws.
- Frequencies are rounded to a 600 s loop, and the clock wraps on that loop, so phases never lose float precision and
  nothing pops.

**Slope moments.** The last pass writes each cascade's (sx, sz, sx², sz²) and both cascades' cross term sx·sz into
the three layers of one immutable RGBA16F texture array, with mip levels 0–4. One array means one sampler: see
"Texture units" below.

- **Mip levels.** Four raw-GL box-filter passes draw levels 1–4. On the M1, `glGenerateMipmap` on three textures cost
  0.7–1.3 ms, against about 0.2 ms for these passes.
- **Past level 4** the shaders blend to each cascade's whole-patch covariance (from the spectrum, mean zero) and stop
  sampling the textures.
- **Why the cross term is kept.** At mip levels 1–4 the correlation |ρ| between sx and sz averages 0.22–0.59
  (`fftChopMath.slopeMomentLevels`). Without it, oblique facets would lose their orientation.

**Fade.** The distance fade, exp(−d/80), stays on the mean slope. What it removes is added to the glitter's
covariance, so the chop turns into sheen instead of vanishing. The existing chop has no other fades to keep: the foam's
matte finish now also applies to the glitter. Off the GPU tier, Rich takes the same statistics from the six analytic
waves, each filtered by the pixel's footprint.

**Caustics** now add the fine cascade, so Rich caustics keep their short waves. Classic adds nothing here.

### Passes and memory (256²)

| | Passes per new sea time | Texture memory |
| --- | --- | --- |
| Before (both looks) | 17 (1 spectrum + 16 radix-2) | 3.5 MiB: ping and pong RGBA32F (2), slope map RGBA16F (0.5), h̃0 RGBA32F (1) |
| After, Classic | 8 | 3.5 MiB, the same targets |
| After, Rich | 8 + 4 mip levels | about 6.0 MiB: ping and pong (2), h̃0 for both patches 256×512 RGBA32F (2), the moment array, 3 layers with levels (2.0) |

The cache holds a sea for repeated display frames. It is keyed by renderer, spectrum (wind, seed and look) and sea
time. A change of look rebuilds the spectrum, and the tests cover that, along with the allocation order: the
constructor still makes 72 `Math.random` draws, so the menus' sea seed is unchanged, and Rich's resources are made on
its first transform.

**GPU timer, M1, pane hidden** (`gpu-check.html?mode=chop`, the median of 120 transforms):

| | Before | After |
| --- | --- | --- |
| Classic | 0.92–1.00 ms | 0.38–0.47 ms |
| Rich | (same as Classic) | 0.62–0.63 ms |

The page also compares the GPU against the TypeScript reference:

- **Classic:** largest error 2.4e-4, 0.19 % of the rms, the same as before. This is half-float rounding.
- **Rich, every moment level 0–4:** 3.4e-4 in slope (0.37 %), 9e-5 in squares and 3e-5 in sx·sz.

### Texture units (follow-up, 2026-10-17)

The merged playtest build showed the Canyon's Rich water asking for 17 texture units, and its edge band for 18, of
the M1's 16; the program would not run. The moments first went to three textures, two more samplers than the one
Classic map. They now share one `sampler2DArray`, so the Rich programs take no more units than before this branch.
In Rich the Classic map is not drawn: `waterChopSlope` falls back to the analytic waves for any Classic program, and
the caustics read the array.

`src/scene/textureUnits.test.ts` builds every water program variant: the tank and its edge band in both looks, with
the plain, cubic, tube and roller sources, the curl's seam and the vertex-normal path. It also builds the far ocean
(with and without the rim), the tube, the Rich lip and the caustics. It counts the samplers each program's `main`
reaches in either stage. Three's own `envMap`, `dfgLUT` and the sun's shadow map sit in chunks left as `#include`, so
they are counted by rule: 3 for each physical material. On the code before this fix the test matches the playtest's
count (Canyon tank 17, edge band 18).

| Program | Before the fix | After |
| --- | --- | --- |
| Rich tank, Canyon (roller) | 17 | 15 |
| Rich edge band, Canyon | 18 | 16 |
| Rich tank, Padang Padang (curl seam) | 17 | 15 |
| Rich edge band, Padang Padang | 18 | 16 |
| Rich far ocean | 10 | 8 |
| Rich tube | 13 | 11 |
| Every Classic program | unchanged, 7–12 | unchanged |

The edge bands sit exactly at 16, as they did before this branch.

## Item 5: the glitter (Rich only)

Rich's direct sun specular is no longer three's GGX of a single roughness. `RE_Direct` is replaced by a slope-space
Gaussian lobe (`src/scene/water/glitter.ts`, adapted from web-ocean's `ocean.js`):

- **Mean:** the drawn normal's slope.
- **Covariance (xx, zz, xz):**
  - the chop's moments, plus the part of the mean that the distance fade removes;
  - the ripples' moments, now kept per axis;
  - a screen-space term of the slope's change across the pixel. This is where the tank's own height field comes in,
    and it is capped at 0.03 per axis;
  - a floor equal to the Rich gloss (roughness 0.08) plus the sun's disc;
  - web-ocean's unresolved slopes: 0.0024, growing by up to 0.0035 between 30 and 500 m.
- **Masking and Fresnel:** Smith masking, Schlick Fresnel with F0 0.02.

On a tilted face, the reflected light is divided by the face's own projected area. That makes a still face reflect
the sun exactly as a mirror would, which the tests check numerically along with normalization and anisotropy.

- **Foam** makes the glitter matte.
- **Seen from below,** the water keeps three's GGX.
- **The sky's reflection** keeps its own roughness. The environment reflection belongs to another agent; the chop's
  covariance is available to it as `waterGlitterCov`.
- **Lip and tube sheets** take the same lobe about their own normal, fed only by the screen-space term.

The unresolved term was chosen on the water sheet, comparing none, 0.0008 and 0.0024. Without it, the Beach's calm
sunset road was a thin saturated column.

## The stills (Beach and Canyon; before above, after below)

All stills use the High preset with the FFT chop on and `&compute=gpu`, unless marked Medium. The M1's Auto preset is
Medium, which never runs the FFT chop: `richSea` is off there.

- **`pair-beach-sunset-road.jpg`, `pair-beach-sunset-road-1to1.jpg`:** before, the road was GGX's soft glow around a
  column. After, it is a brighter core whose edges break up into ripple-shaped glints, getting wider toward the camera.
  The near chop is finer and less regular.
- **`pair-beach-dawn-road.jpg`, `pair-canyon-dawn-road.jpg`:** the sun is 2° up, so the road is faint and red in both.
  The pink hook near the horizon is the sky's reflection and does not change. The near water is busier, with the
  64 m patch's tiling broken up by the fine cascade.
- **`pair-canyon-sunset-road.jpg`:** the road is slightly wider and more broken. The white triangles in the foreground
  appear in both images; they are not from this change.
- **`pair-beach-midday-near.jpg`, `pair-canyon-midday-near.jpg`, `pair-canyon-midday-far.jpg`:** the chop texture is
  finer and less repetitive. The far sheen is unchanged, with no sparkle at distance.
- **`pair-beach-sunset-road-medium.jpg`:** the Medium preset, the M1 default. The glitter there is fed by the analytic
  chop's footprint statistics.
- **`strip-beach-sunset.jpg`, `strip-canyon-dawn.jpg`:** four frames 1/30 s apart, shown 1:1. The road and the far
  water are steady from frame to frame, with no shimmer or popping.

## For timing on the M1 (pane shown)

1. `http://localhost:<port>/gpu-check.html?mode=chop`: the transform's GPU time for each look, before against after.
   For the before figures, check out 18bfbe9f; the GPU timer line was added on this branch, so before that commit use
   the "ms per transform" line.
2. The game on the High preset (`?graphics=high`; FFT chop on, Rich look), at the Beach and the Canyon at sunset,
   against 18bfbe9f. The change in frame time is the transform's saving (about 0.5 ms per new sea time) minus Rich's
   extra fragment work. The tank and far-ocean pixels now make 4 trilinear fetches with explicit gradients instead of
   1 bilinear fetch, and the sun's lobe costs about the same as GGX. Far pixels beyond level 4 skip the fetches.
3. The game on the Medium preset (the M1 default): only the analytic statistics and the lobe are new there.

## Still open

- The fine cascade's patch (12.25 m), the split (2 m) and the unresolved term were chosen by eye on two spots. The
  owner should playtest them.
- The ripple map stores no cross moment, so its covariance is diagonal.
- In Rich the Classic map is not drawn, so a Classic-drawn surface inside a Rich session (a bilinear source) shows
  the analytic waves instead of the FFT chop.
- `FftChop` draws the moments' mip levels in raw WebGL2 and resets three's state afterwards. Without WebGL2, Rich
  falls back to the analytic chop.

## The shader-cost pass (2026-10-18)

The owner's rule: no slower on the M1 than today. Timed on the merged playtest build, the Rich water's new shading
cost the M1 +2.9 to +4.0 ms a frame on Medium (the preset Auto picks there). Almost all of it was this glitter, and
almost all of that was the tank's program: the far ocean's copy of the same code cost nothing.

### What changed

- **The sun's lobe is lit once per pixel** (`RICH_SUN_GLITTER`), for the sun, in the world's frame, at the end of
  the water's body where the foam is known, and three's direct lights take it for the sun (`waterGlitterSun`). It was
  lit per light inside three's loop, with its covariance and slope carried from the normal chunk. The other direct
  light (the fill) keeps three's GGX: under a photographed sky its intensity is 0, so nothing drawn changes.
- **Its maths are arranged for the GPU and written out**: no branches, the half vector's slope without normalizing,
  one inverse square root for the Gaussian, both Smith Λs side by side and one division for the masking. `sunGlitter`
  is the CPU twin; a test checks it against `glitter` (the per-light maths) to 6 digits on 400 random cases. The
  same maths as GLSL functions (the lobe and the chop's covariance) timed 15–30 % of the frame slower on the tank,
  so they are written out.
- **The chop's covariance by distance** (`chopCovariance`): its whole patch's covariance (each cascade's, or the six
  analytic waves') times 1 − fade², the part the distance fade takes off the drawn slopes. It replaces the moments'
  mip levels read per pixel, which alone cost the tank as much as the lobe. The moments still give the chop's mean.
- **Medium keeps three's GGX** (`setGlitterForGraphics`): the glitter comes with the Sea detail's rich sea (High and
  Ultra). Even lean, it cost Medium +12 to +17 % (hidden pane), over the +1 ms budget. Medium also draws the chop's
  plain slope (the same statistics at a point) as before the glitter, so its programs take no new texture unit.
- **Dev switches**: `?glitter=off|on` (force it either way), `?glitterScreen=off`, `?glitterRipples=off`,
  `?glitterChop=off`; in a page, `waterGlitter({ on, screen, ripples, chop })` recompiles the Rich programs.

### Cost (GPU timer, M1, pane hidden)

The Canyon, 1280×720, `?inpage&waterSheet&spot=canyon&compute=gpu&graphics=…`, rich look: the median of 7–10 rounds,
each a 12-frame median, the arms alternated in one page (`waterSheetGpuTime`). The hidden pane runs the GPU slower
than a shown one, so read the ratios; the owner's shown-pane timing is the one that counts. "Today" is the Rich
shading before these branches (glitter off, three's sky, no haze).

| Shot | Medium today | Medium as merged | Medium now | High today | High as merged | High now |
| --- | --- | --- | --- | --- | --- | --- |
| lineup | 10.9 ms | 15.8 (+45 %) | 11.6 (+4 to +8 %) | 12.4–12.7 ms | 19.7 (+53 %) | 14.1–14.5 (+15 to +17 %) |
| face | 13.0 ms | 25.5 (+101 %) | ±1 % | 15.1–16.5 ms | 32.7 (+115 %) | 19.1–20.7 (+19 to +23 %) |
| horizon | 21.6 ms | 34.1 (+58 %) | +2 % | 25.9–26.8 ms | 42.6 (+58 %) | 29.5–29.8 (+14 to +17 %) |

Parts, from the switches on the new code (lineup / face / horizon, against today; the parts do not add: the tank's
program sits at a cliff where a few more instructions cost far more than their own count):

| Part | Medium | High |
| --- | --- | --- |
| The horizon look and the moments' mean, no glitter (`?glitter=off`) | +4–8 / ±1 / +2 % | +4 / ±3 / −3 % |
| Glitter, isotropic floor only (`glitterScreen`, `Ripples`, `Chop` off) | – | +11 / +18 / +9 % |
| Glitter without the screen term | – | +15 / +21 / +13 % |
| The whole glitter (High's default) | +17 / +12–14 / +15–17 % (forced on) | +15–17 / +19–23 / +14–17 % |
| As merged: the glitter per light, the moments' covariance | +40 / +90 / +45 % | +55 / +100 / +45 % |

### Stills (`cost-*.jpg`, before above, after below)

- `cost-canyon-sunset-road-high.jpg`, `cost-canyon-face-midday-high.jpg`: High, the glitter as merged against the new
  arrangement. The same to the eye: 0.03 and 0.08 of 255 in mean, no pixel off by more than 16. The far horizon and
  the midday lineup (no sun in view) are byte-identical JPEGs.
- `cost-canyon-sunset-road-medium.jpg`, `cost-canyon-face-midday-medium.jpg`: what Medium gives back. The sunset road
  keeps three's GGX column (thinner and shorter toward the camera, without the broken glints at its edges), and the
  midday sun's highlight on the face is the smaller GGX blot (2.6 of 255 in mean).
