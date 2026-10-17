# The horizon: haze, the far ocean's seam and the far sky mirror (2026-10-17)

Item 3 of the owner's web-ocean-inspired plan, on `claude/horizon-haze` (from `claude/wave-pool` at 18bfbe9f).
Rich only: Classic's programs are byte for byte as before (their snapshot tests pass). Nothing the rider feels
changes: every change is in the water's shaders and in what `PhotoSky` measures when a sky loads.

## What changed

- **Aerial-perspective haze** (`src/scene/water/horizonHaze.ts`). The water keeps T = e^(−βd) of its own colour and
  takes 1 − T of the sky's colour at the horizon in the direction it lies. β = 3.912 / 12 km (Koschmieder, a 12 km
  coastal visibility): the tank's width (300 m) keeps 91 %, the far ocean's rim (1.5 km) 61 %. The colour is a ring of
  32 azimuth bins read once per sky from the background photo's ±1° horizon band (what the player sees, linear),
  turned with the photo. Per vertex (one varying; no new sampler: the tank's program is at 16 of 16 texture units);
  mixed after tone mapping, because the sRGB background is drawn untone-mapped, so water hazed all the way equals
  the background pixel. Off under water and before a photo sky loads.
- **The far ocean's seam** (`FarFieldOcean.ts`). Over its fade the far ocean's colour goes the rest of the way to the
  horizon's (the fade stands for the sea between its 1.5 km rim and the true horizon, 4–14 km out), and it turns
  see-through only over the second half. The fade also runs within its width of the mesh's open edges: offshore the
  mesh ends at a fixed z (−1500), only 1.19 km beyond the Canyon's break, where the old radial fade left a 70 %-opaque
  edge on the horizon (the dark line in the Padang and Canyon "before" stills).
- **The sky mirror** (`src/scene/water/skyReflection.ts`, adapted from web-ocean's `ocean.js`, MIT,
  © 2026 Maksymilian Dendura): the PMREM blur from the slope variance a pixel leaves unresolved (its footprint's slope
  derivatives, the filtered ripples, the chop faded out with distance), the grazing tilt of the visible facets toward
  the viewer, reflections below the horizon folded up, and Schlick's Fresnel from a normal blended 45 % toward up.
  three's split-sum DFG gave a grazing view of 0.3-rough water a tenth of the sky (the main reason the far sea read
  dark); it is now Schlick's, so the far sea mirrors its sky.
- **The grazing mirror's balance.** The Rich look's 0.5 mirror (tuned looking down into the water) holds there and
  gives way as the view grazes (half-way at 7° above the water). There it is dimmed to the sky the player sees: the
  HDR environment is exposed apart from the JPEG background, 2.7× brighter at the horizon at sunset and 1.7× at
  dawn (0.8× at midday, left as is). Both rings are read at load (`horizonGain`, `mirrorGain`).
- The sun's glitter (direct specular, `richRoughness`) is untouched. The tank, its edge band (which builds on the
  tank's program) and the far ocean share every new function and uniform object, so their seams match.
- Dev: `?horizon=off` draws the Rich water exactly as before (tested; its stills match the old code within 0.07/255).

## Stills

`pair-*.jpg`: before on top, after below, 1280×720 each, from the dev water sheet (`?inpage&waterSheet&spot=…`, CPU
sea, Rich look). Beach before stills are from the original code; Canyon's too; Padang's from `&horizon=off`.

| still | read |
| --- | --- |
| `pair-beach-overview-sunset.jpg` | The flat grey-blue band under a hard horizon becomes a sea that greys into the horizon haze. |
| `pair-beach-lineup-dawn.jpg` | From 1.6 m above the water: the far sea takes the dawn haze's mauve; the sand far along the shore is not hazed (open). |
| `pair-beach-beach-midday.jpg` | The saturated teal line on the horizon becomes a pale sky-blue far sea. |
| `pair-beach-seam-midday.jpg` | 30 m up past the side edge: tank, band and far ocean shade alike; the far swell lines now mirror sky. |
| `pair-canyon-lineup-midday.jpg` | From the lineup the far water is sky-blue at the horizon instead of turquoise; the near water is unchanged. |
| `pair-canyon-beach-sunset.jpg` | Mid-water mirrors the sunset sky at its shown brightness; the crest lines stay. |
| `pair-canyon-overview-dawn.jpg` | The far swell reads with sky in it, melting into the dawn horizon band. |
| `pair-canyon-seam-sunset.jpg` | The offshore edge no longer sits on the horizon as a hard line. |
| `pair-padang-overview-midday.jpg` | The navy line on the horizon (the far ocean's edge) is gone. |
| `pair-padang-seam-dawn.jpg` | From 30 m up the sea fades into the dawn haze with no horizon line, as 12 km of air would hide one 20 km out. |
| `pair-padang-lineup-sunset.jpg` | Little change near the sun path; the horizon softens. |
| `pair-padang-beach-dawn.jpg` | The dark band under the horizon becomes hazy water. |

## Cost

Hidden-pane GPU timer (`EXT_disjoint_timer_query_webgl2`, M1, 1280×720, pixel ratio 1, CPU sea; another agent's GPU
page was open, so treat as rough), median ms per frame, `&horizon=off` → on:

| view | Canyon | Padang Padang |
| --- | --- | --- |
| lineup | 6.31 → 6.92 | 6.57 → 7.25 |
| overview | 10.12 → 10.74 | 8.26 → 9.30 |
| beach | 7.28 → 8.21 | 6.58 → 7.01 |
| edge-band seam | 6.99 → 7.89 | 6.97 → 7.80 |

About +0.4 to +1.0 ms (6–13 %) at 720p. ALU: per water pixel, ~70 operations and no texture fetch more (one PMREM
lookup, as before; the first version sampled it twice, +1.4–1.8 ms); per vertex, an atan, an exp and two uniform-array
reads for the haze. The far ocean adds its share function in both stages.

## How to look again

`http://localhost:<port>/?inpage&waterSheet&spot=canyon` (and `&horizon=off` for the old look); the sheet's
`waterSheetShot({ eye, target }, 'rich', 'dawn'|'midday'|'sunset')` from the console. The views used: lineup (the
sheet's own), beach (12 m beside the focus, 2.5 m above the sand, 4 m up the beach), overview (the game's: focus
+70 m, 16 m up, +95 m shoreward), seam (30 m past the +x edge, 30 m up, 60 m shoreward of the focus, looking
offshore).

## Open

- Dry land (the seabed mesh above water) and the lip, barrel and spray are not hazed: at 1 km the water beside a
  beach takes 28 % haze and its sand none.
- The far ocean's body stays turquoise-bright at grazing under a high sun: three's direct diffuse is weighted by the
  sun's Fresnel, not the view's. A view-angle transmission for the body would need the foam kept apart from it.
- The horizon is a melt from every camera; a crisper sea horizon from the lineup would need the far ocean's mesh
  (or a ring beyond it) out toward the true horizon.
- Visibility is one constant (12 km); it could follow the time of day or the wind.
