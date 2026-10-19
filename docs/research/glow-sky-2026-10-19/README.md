# The glow's sky and memory — 2026-10-19

Two follow-ups to the glow and colour grade (bloom + AgX, PR #117; notes in
`docs/research/bloom-agx-2026-10-17/`). Branch `claude/glow-sky`.

## 1. The sky was graded twice — fixed

The sky photo's JPEG background is already tone-mapped (Poly Haven's), and the
canvas shows it as shot: three draws an sRGB background without tone mapping.
Under the glow it went into the HDR target as it was and AgX graded it again,
so dawn and sunset lost their orange and every sky came out paler.

**The fix (`src/scene/GlowSky.ts`).** While the glow runs, the photo is drawn
by `GlowSky` in place of three's background (`scene.background` is set aside
for the glow's draw and put back after). For each pixel it reads the photo
(three's equirect mapping and turn), looks the sRGB colour up in a 25³ table of
its AgX preimage, stored in AgX's log encoding (`agxPreimageTable`), and decodes
it (`AGX_DECODE`, the exposure). The composite then grades it back to the
photo's own colour. The table is built once a page (about 80 ms, 125 KB on the
GPU), from the grade's look as it stands when the glow starts, like the
underwater fog's preimage. Over every pixel of the three sky photos the table
lands within 0.75 of a step of 255 of the photo (0.1 on average).

- **Bloom.** The sky writes alpha 0, and the bloom's prefilter weighs each tap
  by alpha. The photo's clouds, which the preimage turns into light up to 7,
  do not glow. The sun disc drawn over the sky, spray in front of it, and
  everything else still glow as before. Read back from the HDR target, water,
  foam and the shore write alpha 1. Only 0.1 % of pixels fall between 0 and 1:
  the horizon's MSAA edge and the disc's rim.
- **Negative light.** A saturated sunset yellow's preimage is negative in blue
  (255, 240, 100 needs −0.58). Clamped, it grades 70 steps paler, so the
  composite keeps negative light where alpha is 0 and still drops it
  everywhere else (`rgb − a·min(rgb, 0)`).
- **Haze.** Under the grade the water's haze is mixed before AgX, so it now
  heads for the horizon ring's preimage (`agxPreimageRing`): fully hazed water
  grades to the sky's horizon colour, as on the canvas. At the horizon, from
  the beach, the step between sky and far water is the same size off and on
  (crops: no new edge).
- **Sharpness.** Three samples the photo through a cube map it makes from it,
  which comes out about ¾ of a mip softer. GlowSky samples the photo itself
  and softens its lookup by the same amount (`SOFTEN`). At midday, pixels more
  than 3 steps off (cloud edges) fall from 0.7 % to 0.15 %.
- **Off is untouched.** GlowSky is created only with the glow. With the glow
  off, all six Beach shots are byte-identical to the original code's stills.
  The first shot after the sheet differs a little from any later one, on
  either code; a repeat of it matches.

**Sky, off against on** (mean |Δ| of the top 300 rows, of 255; the composite's
dither alone gives 0.5):

| shot | before | after | pixels > 3 off, after |
|---|---|---|---|
| Beach dawn lineup | 5.46 | 0.50 | 0 |
| Beach dawn, from the beach | 4.38 | 0.50 | 0 |
| Beach midday lineup | 6.65 | 0.57 | 0.19 % (cloud edges) |
| Beach midday, from the beach | 8.90 | 0.56 | 0.14 % |
| Beach sunset lineup (sun in frame) | 19.22 | 0.75 | 3.0 % (the disc and its halo) |
| Beach sunset, from the beach | 6.45 | 0.50 | 0 |
| Canyon dawn lineup / from the beach | | 0.50 / 0.50 | 0 / 0 |
| Canyon midday lineup / from the beach | | 0.57 / 0.56 | 0.19 / 0.15 % |
| Canyon sunset lineup / from the beach | | 0.76 / 0.50 | 3.1 % / 0 |

The water still goes through AgX, as before: paler sand, softer whites.

## 2. Memory

**What the fix frees.** The bigger cost was not the glow's. To draw an equirect
background, three turns the 4096 × 2048 photo into a cube map with 2048² faces
(RGBA8 with mips) and gives each face its own depth renderbuffer. That costs
134 + 101 = **235 MB**, on top of the photo's own 45 MB
(`photoBackgroundMemory`). GlowSky samples the photo directly, so with the
glow on the cube is never made. Turning the glow on mid-game frees it
(`texture.dispose()`; the photo uploads again on its next draw, and three
rebuilds the cube if the glow is turned off).

| drawing buffer | glow targets (unchanged, RGBA16F) | cube not made | net, glow on vs off |
|---|---|---|---|
| 1280 × 800 | +64.2 MB | −234.9 MB | **−170.7 MB** |
| 2048 × 1280 | +164.3 MB | −234.9 MB | **−70.6 MB** |

Measured in the browser's GPU process (`footprint`, IOAccelerator graphics),
Beach, High, 1280 × 720, glow toggled twice in one page: off 1113 MB, on
854–858 MB, so **−257 MB**. The count for this size is −177 MB; the driver
probably pads some of these buffers.

**R11G11B10F: tried, not kept.** The format works with 4× MSAA on the M1. It
needs `format: RGBFormat`; with RGBA, three's `texImage2D` fails and the frame
is black. It would save 21.9 MB at 1280 × 800 and 55.9 MB at 2048 × 1280. The
sky's gradients do not band visibly: at ×10 contrast the photo's own 8-bit
JPEG blocks dominate (`band-sunset-beach-{off,on,r11}-x10.png`). Neighbour
steps of 4 or more cover 0.26–0.52 % of sky pixels, against 0.03–0.61 % for
RGBA16F. But the format has no alpha and no sign:

- the bloom cannot tell the sky from the rest, so clouds glow;
- the yellow round the sun cannot hold its negative blue and goes paler.
  Near the sun, 40 % of pixels end up more than 3 steps off, against 13 % for
  RGBA16F, which are the disc's halo
  (`sun-sunset-lineup-{off,on,r11}.jpg`).

Recovering both would need a resolved depth mask and a sky correction in the
composite. That is not worth 22–56 MB when the cube already frees 235.

**The canvas's own 4× buffers.** These are real memory on the M1, not
in-tile. A 2048 × 1280 test context took +93 MB antialiased and +18 MB without
antialiasing, a 75 MB difference, or 28 B a pixel: about 29 MB at 1280 × 800.
Dropping them while the glow runs would need the context made without
antialias at load, so changing the setting needs a reload. Until that reload,
Classic, Low or turning the glow off would draw with no antialiasing at all.
Not worth it now: with the cube gone, the glow already uses less memory than
no glow.

## GPU cost

`waterSheetGpuTime`, Canyon, 1280 × 720, median of 60 frames, glow off and on
alternated in one page:

| preset | lineup off | lineup on | added |
|---|---|---|---|
| High | 13.67, 13.40, 13.40 ms | 16.24, 16.14, 16.24 ms | **+2.8 ms** |
| Medium | 11.81, 11.71, 11.71, 11.82 ms | 14.52, 14.54, 14.45, 14.51 ms | **+2.75 ms** |

The face shot drifted from 20 to 35 ms across both runs whether the glow was on
or off, so it gives no usable difference.

Where the time goes (Medium lineup):

| glow setting | ms |
|---|---|
| off | 11.8 |
| 4× MSAA HDR target | 14.64 |
| 2× MSAA HDR target | 12.56 |
| no MSAA HDR target | 10.40 |
| one bloom level instead of five | 14.25 |

So the 4× MSAA HDR target (its stores and the resolve's read-back) is most of
the cost, and the bloom chain is about 0.4 ms. The canvas's own 4× is cheaper:
without MSAA, the glow runs 1.4 ms faster than having no glow at all. The NaN
guard stays; it adds no pass.

## Stills (1280 × 720)

The Beach's held sea is the same in every load, so its before and after stills
show the same frame.

- `beach-{sunset-lineup,dawn-lineup,midday-beach,sunset-beach}-{off,on-before,on}.jpg`:
  - off is the original code, glow off;
  - on-before is the original glow;
  - on is the fix.
  At sunset, the yellow and orange round the sun come back, and the HDR sun
  disc and its halo stay.
- `canyon-{dawn-lineup,midday-beach,sunset-lineup,sunset-beach}-{off,on}.jpg`:
  the fix.
- `band-sunset-beach-{off,on,r11}-x10.png`: the sunset sky from the beach, at
  ×10 contrast and ×3 zoom. No bands in any of them; the photo's 8-bit blocks
  show in all three.
- `sun-sunset-lineup-{off,on,r11}.jpg`: the sky round the sun.

"From the beach" is the eye at (0, 1.7, 5) looking at (0, 1.2, −100) on the
Beach, and (−30, 1.7, −150) looking at (−30, 1.2, −500) on the Canyon.

## Still open

- **Off, three's cube costs 235 MB for every player.** Drawing the photo the
  GlowSky way with the glow off too (the identity in place of the table) would
  free it. That changes the off path: about 0.2 % of the sky's pixels, at cloud
  edges, move by more than 3 steps. It is a separate decision.
- **The glow's +2.8 ms on the M1 is mostly the 4× MSAA HDR target.** At 2× it
  would cost +0.75 ms and use 25 MB less at 1280 × 800 (63 MB less at
  2048 × 1280), with softer edges than the canvas's 4×. That is for the owner
  to judge.
- **Translucent things in front of the sky** (spray, mist) now blend over the
  sky's preimage in scene light rather than over the photo in display light.
  They look the same in these stills, but have not been checked in play.
- **The painted fallback sky** shown before the photo loads is still graded
  twice.
- **Tuning the grade live** (`breaklineDiagnostics.glow().settings`) leaves the
  sky's table and the haze's ring on the old look until the glow is turned off
  and on again.
- **The owner's playtest**, with the glow on at dawn and sunset.
