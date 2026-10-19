# Foam freshness (web-ocean plan, item 7) · 2026-10-19

Branch `claude/foam-fresh`, from `claude/playtest-2026-10-19` at 953b86b8 (the main line `claude/wave-pool` with #118
and #119). Rich only, drawn only. Ideas taken from web-ocean (MIT licence, © 2026 Maksymilian Dendura,
`js/wgsl/sim.js` and `js/wgsl/ocean.js`) and rewritten for our foam network; the GLSL that adapts them credits it.

Nothing under `src/wave`, `src/game` or `src/physics` changed: the water, the breaking, the felt whitewater, the air,
the foam field, its stencil and the snapshot are byte for byte as before, so #119's replay hashes stand untouched.
Classic is unchanged (its programs are the same text; tested). `?foamFresh=off` compiles today's Rich foam.

## What existed

- **The foam field** (`src/wave/FoamField.ts`) carries dense whitewater (e-folding 3 s) that decays into a residual
  lace (6–20 s by spot; the Canyon lip's drawn lace 6 s). That split is an age in the physics, but the snapshot draws
  only the sum (the surface texture is RG: height, foam).
- **The Rich foam** (`RICH_FOAM`) already had a freshness channel: the plume's void fraction (G9). Where it is high
  the lace gives way to the Worley churn, with relief and crease, and the plume whitens the water. The lace itself is
  a Voronoi network thresholded so that its cover equals the foam value, carried by a two-phase flow map. Streaks
  showed only up steep faces.

## The decision: no new channel

The void fraction empties as bubbles rise out of the plume, in 1–4 s under a bore. That is web-ocean's freshness
(0.6 s) at our scale, and physically it marks the end of a whitecap's bright, bubbly stage (Callaghan et al. 2013,
stage A to B). Carrying the dense share instead would mean one more float per render node in the snapshot's field
pass, which #119 brought to 2 ms for 112,000 nodes. It would also change the snapshot stream's hash and widen a
texture. So youth here is the void fraction, or foam held near saturation (only a source holds it there).
Everything happens in the Rich fragment.

## What it draws (`src/scene/water/foamFreshness.ts`)

- **The threshold** is softened by the pixel's footprint, so distant lace stops crawling, and a little more as foam
  ages. Dense foam's threshold rises by the extra softness, so it opens no holes (`foamRise`, tested).
- **Aged foam gathers into streaks.** The lace keeps its crisp network. Its patches turn into patches stretched 3×
  along the waves' travel (+z, shore-normal) and 1.6× narrower, read from the lace's own tile in both flow-map
  phases, and gather 2.5× as hard as fresh foam's. The result is lace in bands, with clearer water between.
- **Thin aged foam is a film**, at opacity 0.8, rising to 1 as it thickens or is young (web-ocean uses 0.68).
- **Young foam's bubbles tint the water** under and between its lace, 0.15 of the way to the foam's colour.
- **Young foam at a fine footprint draws as before**, to rounding (tested against `foamCover`). Drawn foam above 1
  (the Canyon landing reads 1.15–1.37) keeps its excess in the distance, as the old lace did.
- **The local foam value is one multiply-add** a phase, `x + y·v + z·s` (`freshLace`), against the old patch formula.
- **The streaks follow the Sea detail** (`setFoamStreaksForGraphics`): Low and Medium draw them. High and Ultra,
  whose tank already carries the glitter, gather aged lace into its round patches instead (see the cost).
  `?foamStreaks=on|off` forces them either way.

No new samplers or varyings. The texture-unit guard passes unchanged (the edge band stays at 16).

## Cost (GPU timer, M1, pane hidden, `?inpage&waterSheet&spot=canyon&compute=gpu`)

Each arm was interleaved in one page over 15–36 rounds, with the order rotating each round, and each round's value is
the median of 10–12 frames. A second "off" arm of the same program measured the noise. The shared machine was busy:
other agents' tabs drew on the same GPU. Figures are the median per-round difference against "off", in ms, with the
ratio in brackets.

| Shot | Medium off | Medium, as shipped (streaks) | Medium noise (off vs off) | High off | High, as shipped (no streaks) | High with streaks |
| --- | --- | --- | --- | --- | --- | --- |
| lineup | 13.2 | +0.04 (1.003) | +0.03 | 15.2 | −0.04 to +0.6 (the top in the noisiest run) | −0.14 to +0.5 |
| face | 15.2 | −0.32 to +0.09 (0.98–1.01) | +0.01 | 19.7 | 0 to +0.45 (≤1.02) | +0.1 to +0.5 |
| bore | 22.0 | +0.03 to +0.14 (1.00–1.01) | −0.43 | 29–30 | +0.3 (median of 9 runs; 1.01) | +0.9 (median of 11 runs, −0.35 to +1.5; 1.03) |

On High's bore, the noise between two arms of the same program was ±0.4–0.8 ms. Runs of the same arms gave from −0.5
to +1.5 ms. The streaks' reads cost High about +0.6 ms above the shipped arm in most runs, and analytic streaks (no
texture read) cost the same. Hence the gating.

**What did not work, and why it matters for the next one.**

- **Handing the lace's terms over from the vertex** in new varyings: youth, opacity, tint and the streak value
  (5 floats). This cost High +0.9 to +3.6 ms, +0.3 ms of it in the vertex stage alone (seen looking at the sky).
- **The streak value alone, as one varying read per vertex:** High +7.3 ms (1.23).
- **The first cut, which read the stretched network per pixel:** Medium's bore +1.1 ms, and it blurred thin lace.

The Rich tank prefers more arithmetic in the pixel over anything carried in from the vertex.

## The stills (Rich, Medium preset; before above, after below, same held sea)

- **`canyon-medium-strip-midday.jpg`** (Canyon, medium swell): the lip's landing aging over 7.5 s, before and after
  in alternate rows. The landing and its first lace are the same. From about 3 s, the old lace thins into a
  translucent film. By 4.5–7.5 s it lies in bands along the waves' travel, where before it stayed one even net.
- **`canyon-medium-face-midday.jpg`, `canyon-medium-landing-midday.jpg`, `canyon-medium-bore-midday.jpg`** (beside the
  break): the landing's white mat is the same. In the bore's mat region, the mean is 190.8 of 255 in both, at most
  11 levels apart. The lace fringe at the toe is softer.
- **`canyon-medium-lineup-landing-midday.jpg`, `-sunset.jpg`** (from the lineup, looking in): the back of the wave
  and the landing's lace. The distant lace is softened instead of crawling.
- **`canyon-medium-innerbore-midday.jpg`, `canyon-medium-aged-midday.jpg`:** the young mat is unchanged. The lace
  behind it takes the faint bubble tint. The old lace beyond shows longer holes, in bands.
- **`beach-bore-midday.jpg`, `beach-bore-sunset.jpg`, `beach-seaward-midday.jpg`:** at this hold the Beach's foam is
  almost all aged (10,053 of 10,568 foamy nodes). It goes from an even honeycomb to a sparser lace in bands, the
  thin parts a little translucent.
- **`padang-whitewater-midday.jpg`, `-sunset.jpg`, `padang-whitewater-wide-midday.jpg`:** Padang's even honeycomb
  becomes uneven, with denser bands and sparser gaps. The young whitewater's holes are tinted milky, and the far
  lace is softened.

## Tests

- **`src/scene/water/foamFreshness.test.ts` (12 tests).** Youth. Young foam drawing as before, to rounding. Cover
  and film. Streak anisotropy (a variogram of the metre-square cover: aged z/x < 0.7, young about 1). Advection with
  no jump at the flow map's turnover. Soft edges that do not move the threshold. Dense foam opening no holes. The
  distance mean and the landing's excess. The tint. GLSL hygiene: no varyings or uniforms, and no GLSL ES 3.00
  reserved words, since `patch` once broke the program. Classic programs unchanged, and Rich switched by its key.
  The graphics gating.
- **Run alongside:**
  - the texture-unit guard;
  - `FoamField`, the checkpoint oracle (`scripts/field-fusion-report.test.ts`) and the spilling-lip felt identity
    (`SpillingCurl`);
  - `WaterSurface`, `EdgeBand`, `waterLooks`, `waterOptics`, `foamPattern`, `streaks`, `churnTexture` and
    `rollerLook`.

  All 13 files, 149 tests, pass on the final commit. `tsc --noEmit` is clean.

## Dev tools added

- `waterSheetPair(view, look, time, arms, file)`: before/after pairs from one held sea.
- `waterSheetStrip(view, look, time, frames, seconds, file, columns, scale, arms)`: a view as the sea steps on,
  under each arm.
- `waterSheetGpuTime` now also returns p10 and the fastest frame.
- `window.waterFoamFresh(on | { on, streaks })`.

## Still open

- **The High budget.** The figures above are from a hidden pane on a busy machine. The owner's shown-pane timing,
  `?graphics=high&foamStreaks=on` against `off`, decides whether High can have the streaks back.
- **The streaks' axis is global** (+z, shore-normal), not the local current: they do not turn with a longshore
  current or a rip. A local axis costs the four-anchor scheme `streaks.ts` uses on faces.
- **The second age.** The dense share (3–8 s) is not drawn. If the owner wants foam that is young without air to
  look young, it needs a snapshot channel, at the CPU cost noted above.
- **Values tuned by eye on three spots,** for the owner to playtest:
  - the youth thresholds (air 0.004–0.05, cover 0.7–0.98);
  - the streaks (3× by 1.6×, gather 1.5);
  - the film (0.8);
  - the tint (0.15).
