# Glow and colour grade (bloom + AgX) — 2026-10-17

Item 6 of the web-ocean plan: a light bloom of the brightest light and an AgX
grade, behind one switch, **Settings → Graphics → Glow and colour grade**, off by
default, so the owner can compare. Branch `claude/bloom-agx`.

## The switch

- `graphics.glow` (saved), off for new and older saves. No preset sets it and
  choosing a preset keeps it, so it can be A/B'd on any preset without turning
  the preset to Custom.
- It runs only on the **Rich** water look: the row shows under Water look only
  when Rich is chosen, and Low (Classic) never runs it. The Wave Lab's own look
  switch is followed too.
- `?glow=1` / `?glow=0` (dev) turns it on or off without touching the save,
  still on Rich only.
- Off, the game draws exactly as before: the pass is never constructed, no
  target or program exists, `renderer.toneMapping` stays Neutral at 1.05.
  Turning it off disposes everything it made.

## What it draws (src/scene/GlowPass.ts, src/scene/glowMath.ts)

Per frame, with it on:

| pass | size | notes |
|---|---|---|
| scene | full, 4× MSAA, RGBA16F | replaces today's draw to the canvas; same depth-stencil (the barrel's screen fallback) |
| MSAA resolve | full | three's blit at the end of the scene render |
| downsample 1 (prefilter) | ½ | 13 taps of the full-res scene, Karis average, soft threshold |
| downsamples 2–5 | ¼ … 1/32 | 13-tap filter |
| upsamples 1–4 | 1/16 … ½ | 3×3 tent, added onto the mip above |
| composite | full, onto the canvas | scene + bloom, AgX + look, sRGB, triangular dither |

Only the scene, its resolve and the composite touch full resolution; the
composite is the only extra full-resolution draw. Filters after Jimenez,
*Next Generation Post Processing in Call of Duty: Advanced Warfare* (2014),
the scheme web-ocean also uses; the code is written anew.

GPU memory it adds (`glowMemory`, as three 0.186 allocates: MSAA colour
8 B × 4, MSAA depth-stencil 4 B × 4, resolved colour 8 B, a depth-stencil on the
resolve framebuffer 4 B, plus the mips):

| drawing buffer | MSAA scene | resolve | bloom mips | total |
|---|---|---|---|---|
| 1280 × 800 | 49.2 MB | 12.3 MB | 2.7 MB | **64.2 MB** |
| 2048 × 1280 | 125.8 MB | 31.5 MB | 7.0 MB | **164.3 MB** |

The canvas keeps its own 4× MSAA buffers either way (antialias is fixed when
the context is made). Chrome on the M1 exposes no
`WEBGL_multisampled_render_to_texture`, so three uses explicit MSAA
renderbuffers and a blit.

## The grade

AgX as three's `AgXToneMapping` computes it (Filament's matrices, Wrensch's
sigmoid fit) plus the AgX look (power, then saturation), done in the composite
rather than by `renderer.toneMapping`, so the scene's programs are the only
ones that change. Tuned on the Beach's held sea against today's frames:
**exposure 2.4, look power 1.5, saturation 1.5**. Plain AgX at a matched mean
is visibly flat and grey on this scene; the firmer look restores most of the
contrast. AgX cannot match Neutral both ways here: its shoulder starts lower,
so the mid-tones sit a little higher and whites roll off later.

Mean frame luminance, off → on (relative luminance of the canvas):

| shot | off | on |
|---|---|---|
| Beach midday lineup | 0.354 | 0.351 |
| Beach sunset lineup (sun in frame) | 0.522 | 0.463 |
| Beach dawn bore (sun in frame) | 0.430 | 0.403 |
| Beach midday from the beach | 0.648 | 0.530 |
| Canyon midday face (whitewater) | 0.536 | 0.470 |
| Canyon sunset from the beach | 0.550 | 0.470 |
| Canyon dawn lineup | 0.310 | 0.322 |

The underwater fog is mixed before the grade now (on the canvas it is mixed
after tone mapping), so fog and background take **AgX's preimage** of today's
`#367e83` (`agxPreimage`, tested to round-trip to 1e-4): the far water keeps its
colour under the grade.

## The bloom

Soft threshold 1.0 on the brightest channel (knee 0.5), in scene units before
exposure; a tenth of what passes is added back (`strength` 0.1, over the five
levels). With exposure 2.4 that is light AgX already shows near white: glints,
the sun and its glitter path, backlit spray, the brightest foam. The Karis
average stops one glint from flashing a whole mip.

The sky photo's sun is a clipped white blob (its light lives in the
DirectionalLight), which AgX would grade grey and the bloom would ignore, so
with the glow on an **HDR sun disc** (src/scene/SunDisc.ts) is drawn over it at
the photo's sun: true angular size, the photo's sun colour, radiance 1500 × the
sun's intensity (a tenth of the true sun's, to keep the halo light).

## Findings

- **A lone NaN pixel from the Rich water.** From the Beach's sand at midday the
  Rich water shader writes one pixel of NaN (red, green) and 1.6e19 (blue). The
  canvas never shows it (UNORM output turns it to 0 before blending, and it is
  covered); a float target keeps it, and the first prefilter spread it into a
  bright blob. The bloom now drops non-finite taps and the composite gives such
  a pixel its neighbour's colour. The water shader itself is not fixed here.
- **The sky photo is graded twice.** The background JPEG is already tone-mapped
  by Poly Haven; Neutral leaves it nearly as shot, AgX regrades it, so the
  sunset and dawn skies lose some of their orange. The reflections (from the
  HDR) take the same grade, so sky and water stay consistent. Keeping the
  photo as shot would need a preimage LUT on the background and a mask so its
  clouds do not bloom; not done.
- **Timing.** Hidden-pane GPU-timer readings around whole frames on this busy
  M1 were contradictory (glow on read 2–6 ms slower in one run and 8–15 ms
  faster in the next); the off path draws to the canvas, whose timer interval
  seems to include waiting on the drawable. They are not evidence.

## Stills (1280 × 720, `*-off.jpg` / `*-on.jpg`)

The same held sea in each pair, High preset, Rich water.

- `beach-midday-lineup`: within 1 % in mean; whites slightly softer.
- `beach-sunset-lineup`: the sun becomes a white disc with a light halo, the
  glitter path glows; nothing blown (0.6 % of pixels at 250+ against 0.3 %, all
  in the sun's disc and its glitter path); the orange sky is paler.
- `beach-dawn-bore`: the sun's disc reads as the sun instead of a grey blob with
  a dark dot; the whitewater is a little greyer.
- `beach-midday-from-beach`: shallow water over bright sand; the sand is cream on
  today's grade and a paler, greyer white under AgX (mean −18 %).
- `beach-midday-below`: underwater; the fog band keeps its colour, the surface
  overhead is a touch bluer.
- `canyon-midday-face`: close to whitewater and glints; glints get a soft
  glow, foam is greyer, contrast lower (p90 0.72 → 0.56).
- `canyon-sunset-from-beach`: the bright sand through shallow water clips on
  today's grade and rolls off smoothly under AgX.
- `canyon-dawn-lineup`: near-identical.

## Checking it

`?inpage&waterSheet&spot=beach&graphics=high&diagnostics` then in the console:
`waterSheetGlow(true|false)`, `waterSheetShot(name|{eye,target}, 'rich', time, 'x.jpg')`,
`waterSheetLuma(...)` (mean and percentiles), `waterSheetGpuTime(name, 'rich')`,
and `breaklineDiagnostics.glow().settings` to tune live (the fog preimage is
taken when the glow turns on).
