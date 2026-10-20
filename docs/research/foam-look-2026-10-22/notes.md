# The foam's look (playtest 2026-10-21, items 3 and 4)

Branch `claude/foam-look`, from `claude/playtest-2026-10-22` at da250ee1. The owner's clips (M4, sunset, max settings,
Rich): v2, Padang Padang on High, aged lace as a big regular honeycomb; v1 and v5, and the review frames f12, f16, e
and g (the Canyon, the Wave Lab's Hs 4 m, Tp 12 s), the white at sunset as flat pink sheets and blocks with hard
straight fronts. Drawn only. The felt whitewater, the breaking, the water, the air and the felt roller table are
bit for bit as before. Classic's programs are unchanged.

Dev switch: `?foamLook=off` compiles today's Rich programs (byte for byte) and draws the Canyon's white with square
edges. `?foamLook=lace|dense|light` keeps one shading part. In a page, `waterFoamLook(on)` or
`waterFoamLook({ on, lace, dense, light })` switches the shading. The drawn edges are a sea setting
(`SurfZoneConfig.drawnEdges`), so they need a page of their own.

## Item 3: High's honeycomb (`src/scene/water/foamLook.ts`, `foamFreshness.ts`)

**Why High was a honeycomb.** Without the streaks (High, Ultra), `setFoamStreaksForGraphics` meant aged foam to
gather into its round patches. The lace's local value is `x + y·v + z·s`, with the streak `s` held at 0.5. For fully
aged foam, `y` is 0, so the local value was the foam value itself everywhere: one even threshold over the Voronoi
network, a perfectly regular honeycomb. The test only checked that the result was isotropic.

**What changed (Rich lace, every preset; no texture reads, varyings or uniforms added):**
- **Round patches on High.** Without the streaks, aged foam reads `s` from the green channel of the read it already
  makes, so it gathers into the 5.6 m patches: dense white in places, broken filaments between. Over metre squares of
  aged lace, the spread of the cover is more than twice what it was, for about the same mean (tested).
- **Varied cells.** The network is read through a slow warp: two sines of two sines, 7–14 m long, 0.38 m in
  amplitude. Cells range from about two thirds to nearly twice their size, and change shape with it, never folding
  (tested: the Jacobian stays between 0.3 and 2.2). It also breaks the tile's 44.8 m repeat.
- **Drawn along the flow.** Each flow-map phase's carried point is read 1.35× longer along +z, so the lace still moves
  with the current.
- **Smaller cells.** Is the cell too large for v2's camera? Yes. The ride's front view is 3.5 m up with the rider
  10 m off. There, the 0.7 m cell spanned 40–60 px of a 1280-px frame and read as tiles; surf lace holes run from
  centimetres to about half a metre. The Rich lace is now 0.75× the network's cell: 0.53 m across, 0.71 m along.
  Its detail fades to the mean as much nearer. Classic keeps 0.7 m.
- Medium keeps its streaks (now read through the same warp and scale).

Stills: `padang-high-game-*.jpg` (the ride's front view), `padang-high-wide-*.jpg` (9 m up, v2's look),
`padang-medium-wide-midday.jpg`. Read: the even net becomes patchy, with dense white patches, open stretches where the
lace breaks into filaments, and cells of mixed size drawn along the waves. Up close it is still a network, but no longer
a mosaic of equal tiles.

## Item 4a: hard fronts and ends (`src/wave/drawnEdges.ts`, `SpillingFront.ts`)

The reviewer's reading holds: the drawn white is gated per column and per wave, so a straight crest drew a rectangle.
f12 and f16 show the blocks.

**The drawn copy alone** (`drawnEdges`, on for the Canyon's front, off by default) now frays:
- **The ends along the crest.** Each row's run of drawn white gives up 0–4 m at either end, by a noise over the row's z
  and time, and fades in over 2 m. Runs closer than 3 m count as one, and a short run's middle is always left whole.
- **The toe.** Each column's run gives up to 0.3 of its depth at the shoreward end, by a noise along x. A zero cut
  keeps the last row.
- **The roller band's drawn table.** Its `scale` fades in over 1–6 columns from each end of a slot's run.

Arithmetic and integer hashing only, keyed on the sea's time, so two clients draw the same edges.

**Checks:**
- Felt: the front's `out` and `felt` are `Object.is`-equal with and without the edges (`drawnEdges.test.ts`). In a
  Node replay of the Canyon (seed 3, Hs 1.4 m, 1200 steps after 20 s), the whitewater strength and `h` were bit for
  bit equal throughout.
- The spilling lip's felt-identity test passes unchanged: the edges are off in its front.
- CPU (front stage, Node, M1): 0.67 against 0.58 ms median a step. The first cut scanned every row: +0.25.
- The Canyon draws about 17 % less foam in all (the frayed ends).

**Drawn bytes that change (the Canyon only):** `foam.dense` and `foam.residual`, so the snapshot's foam channel; the
bubble and spray sources that read `foam.source`; the curl's drawn air share; and the roller table's drawn copy. #119's
replay hashes change in those arrays and the snapshot digests at the Canyon only. Every other spot's sea is untouched.

## Item 4b: the flat pink sheets (`foamLook.ts`)

**Measured, not guessed** (`canyon-bore-terms-sunset.jpg`, taken at the first cut, before the light part: as drawn,
three's sun off, the water's own sun terms off, the environment off). The pink was not three's sun: with it off the sheet stayed pink. It was the water's own sun terms, which paint
foam the sun's colour (4.95, 1.70, 0.11 at sunset) whichever way it faces:
- the fresh foam's backlit glow;
- the roller band's wrapped sun, (N·L + 1)/2.

Toward a low sun, the wrap lit the face at half the sun's full beam, where level water beside it took a tenth. Front-lit,
it more than doubled the face's N·L, which also halved its relief's shading. The churn's lumps were there (seen with
the terms off) but washed out. Dense foam without air had no churn at all.

**What changed (Rich only):**
- **Dense foam churns.** Foam held at 0.8–1 takes the churn's clumps, creases and relief whatever its air.
- **The glow.** It stays on thin fresh foam, as its comment always said; a dense mat keeps a quarter.
- **The band's wrap.**
  - It shines through only near the crest (`waterRollerFresh`²) of a face the sun is behind (N·L under 0–0.3).
  - Elsewhere it is held to the light level water takes (the sun's height) or the face's own N·L.
  - Under a high sun nothing changes.

The light through foam reaches faces turned from the sun only near a backlit crest; elsewhere they take the sky.

**Foam pixels in a view** (`waterSheetFoamLight`: linear luminance p10/p50/p90, mean red over blue). Canyon High, the
same held sea:

| View | Before | After |
| --- | --- | --- |
| Front-lit band, sunset (`canyon-band.jpg`) | 0.41 / 0.67 / 0.69, R/B 1.33 | 0.38 / 0.49 / 0.60, R/B 0.79 |
| Backlit close, sunset | 0.39 / 0.59 / 0.70, R/B 1.15 | 0.38 / 0.53 / 0.65, R/B 0.89 |
| Band, midday | 0.73 / 0.81 / 0.84, R/B 0.77 | 0.71 / 0.78 / 0.81, R/B 0.75 |

The top half of the sunset band was one plateau (p50 to p90 within 0.03); it now spans 0.11. It is warm at the crest
and turns lavender-white down the face. Midday is within 0.03.

Stills (before | after, sunset above midday):
- `canyon-band.jpg`, `canyon-close.jpg`, `canyon-bore.jpg` (the white landing and the face);
- `canyon-wide.jpg`, `canyon-over.jpg` (from above: the frayed ends);
- `canyon-strip-sunset.jpg` (the white spreading over 5 s; before above, after below);
- `beach-*.jpg`.

**The Beach after a fall.** v5's view was not reproduced there: its whitewater at this hold is aged lace. The sunset
pair changes little (R/B 0.65 → 0.65). The pool's walls rule it out as v5's spot; the sheets' 55° diagonal ends match
the Canyon's peel.

## Item 4c: the tan sawtooth

**Not reproduced in this base**, so not changed. It shows in review frame e at 10.1 s: tan teeth along the crests of
the Wave Lab's Canyon (Hs 4 m, Tp 12 s), at sunset.

Checked on the water sheet's Canyon with the same buoy sea, at sunset (the sun 6° up, toward +x):
- **Looking toward the sun along a breaking crest** (`canyon-hs4-crests-sunward-sunset.jpg`) and **looking seaward over
  the crests** (`canyon-hs4-crests-seaward-sunset.jpg`), each with the foam look off, on, and on without the water's
  own sun terms (which carry the crest light).
- The crest tops glow smoothly, with no teeth, in every arm.

The crest light's steepness fade (f19e208c, `CREST_STEEPNESS`) is in this base. What it leaves lit is a crest standing
30 cm and more above the march, lit as before.

If the owner still sees the teeth, the lead is that the march reads the bilinear field (`waterHeightAt`), which
stair-steps along an oblique crest, while Rich draws the Catmull-Rom surface. The clip's exact sun (the Lab's
direction slider) is the setting to try.

## Cost

M1 (this machine, shared, pane hidden), `waterSheetGpuAB`, arms frame by frame: off, off again (the control), on. The
figures are the median per-cycle difference against off, in ms, then the control's, then the base frame.

| Spot, preset | Shot | On | Control | Base |
| --- | --- | --- | --- | --- |
| Canyon High (50 cycles) | bore | +0.24 | +0.06 | 23.0 |
| | face | +0.06 | −0.09 | 32.3 |
| | lineup | −0.02 | −0.18 | 13.7 |
| | band (foam-filled) | −0.01 | −0.13 | 49.7 |
| Canyon Medium (60) | bore | −0.09 | +0.09 | 18.7 |
| | face | −0.31 | +0.40 | 19.6 |
| | lineup | +0.06 | +0.04 | 13.3 |
| | wide | +0.06 | +0.05 | 29.7 |
| Padang High (60) | lineup | +0.19 | 0.00 | 16.4 |
| | curl-behind | −0.38 | +0.53 | 29.9 |
| | lace, ride view | +0.13 | +0.02 | 29.6 |
| | lace, 9 m up | −0.48 | +0.97 | 49.6 |
| Padang Medium (60–80) | lineup | +0.04 | +0.04 | 13.1 |
| | curl-behind | −0.69 | −0.08 | 15.7 |
| | lace, ride view | −0.15 | −0.13 | 19.0 |
| | lace, 9 m up | −0.62 (80) | −0.10 | 15.8 |

Everything is within +0.25 ms; Padang's foam views time at or below today's. The program sits at the cliff the earlier
passes describe (foam-fresh, glitter-lite): treat the savings as luck and recheck after any change to the tank's
program. The drawn edges cost no GPU time (data only) and +0.08 ms a step of the worker's CPU.

## Tests

- `foamLook.test.ts` (11): the warp's bounds, young foam through the warp as before, High's patches, the smaller
  cells' fade, no reads/varyings/uniforms, dense churn, the glow, the band's cap, the line rewrites, and the switch
  (Classic unchanged, off compiles today's Rich, a key per part).
- `drawnEdges.test.ts` (7): the noise; the row, toe and band frays; felt identity against a square front.
- `waterLooks.test.ts`: the Rich composition's assertions now name the dense churn's line.

Run: the foam, FoamField, the oracle (`field-fusion-report`), SpillingFront, SpillingCurl (the felt identity),
WaterSurface, EdgeBand, waterLooks, textureUnits (16 units, unchanged), rollerLook, churnTexture, streaks, foamPattern,
SpillingCurlMesh, devTools: 17 files, 192 tests pass. `surfZoneState` (the Canyon's handover, bit for bit with the
edges on) passes too. `tsc --noEmit` is clean apart from the known `zzProfile` errors.

## Halfway warmer (the owner's call, 2026-10-22; branch `claude/foam-warm`)

The owner wants front-lit sunset foam halfway warmer: a soft peach-white between the old pink (R/B 1.33) and the
capped lavender (0.79), with the relief kept.

**The dial.** `BAND_WRAP_KEPT = 0.55`: the share of the band's wrap the cap leaves in everywhere. It lifts a face's N·L
by 0.55·(1 − N·L)/2 and keeps 72 % of its relief's shading. Under a high sun the cap leaves the wrap alone, so midday
cannot move. The GLSL's mix weight becomes `max( 0.55, … )`; it is a constant, and `warmth: 0` compiles the same
instruction.

Swept on the same held sea (warmth 0 → 0.35 → 0.45 → 0.55 → 0.65): on the front-lit band at sunset, R/B ran
0.79 → 0.95 → 1.00 → 1.06 → 1.11. At 0.65 the top half started to flatten again (p50 to p90 within 0.07). 0.55 is the
halfway mark, (0.79 + 1.33)/2 = 1.06.

Foam pixels (`waterSheetFoamLight`, linear luminance p10 / p50 / p90, R/B), Canyon High, before = 2026-10-21's look
(`warmth: 0`), after = 0.55:

| View | Sunset before | Sunset after | Dawn before → after | Midday before → after |
| --- | --- | --- | --- | --- |
| Front-lit band (35 s) | 0.38 / 0.49 / 0.60, 0.79 | 0.39 / 0.59 / 0.68, 1.06 | 0.33 / 0.415 / 0.450, 0.553 → 0.33 / 0.416 / 0.452, 0.563 | 0.708 / 0.780 / 0.813, 0.749 → 0.711 / 0.791 / 0.820, 0.752 |
| Backlit close (30 s) | 0.38 / 0.53 / 0.65, 0.89 | 0.38 / 0.57 / 0.70, 1.05 | 0.362 / 0.437 / 0.508, 0.611 → 0.362 / 0.438 / 0.509, 0.617 | 0.418 / 0.594 / 0.748, 0.676 → 0.418 / 0.596 / 0.757, 0.677 |

- **The relief stays:** p10 to p90 spans 0.29 on the band (0.22 before) and 0.32 on the close (0.27).
- **Brighter:** the foam is about 0.1 brighter in its middle at sunset.
- **Dawn and midday:** within 0.011 in luminance and 0.01 in R/B. At dawn the sun lies away from these faces, so the
  band takes little of the wrap.
- **Cost:** `waterSheetGpuAB` on Canyon High, warmth 0 / 0 again / 0.55, 50 cycles, against the same program: band
  −0.08 ms (control −0.06), bore +0.06 (control +0.07).

Stills (before above, after below):
- `warm-canyon-band-sunset.jpg`: the front-lit band, now peach-white with its lumps;
- `warm-canyon-close-sunset.jpg`: the backlit face;
- `warm-canyon-band-dawn.jpg`, `warm-canyon-close-dawn.jpg`;
- `warm-canyon-bore-midday.jpg`: no visible change.

Dev: `waterFoamLook({ warmth })` sets the share in a page (it compiles a program per value).

## Still open

- **The owner's eye.** Front-lit sunset foam is now peach-white (R/B 1.06), warm at a backlit crest. The dial is
  `BAND_WRAP_KEPT`.
- **Straight fronts elsewhere.** The fray needs a drawn copy, which only the spilling spot has. A spot whose solver
  breaks along a straight line (the pool's arms, the Beach) still draws straight fronts. A drawn copy there would cost
  a full-grid pass in the worker.
- **The M4 and a shown pane.** These timings are the M1's, hidden; the earlier passes' caveats apply.
