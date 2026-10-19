# The patch seam (playtest 2026-10-21)

The owner's clip v3 (M4, Ultra, Rich, sunset, the Wave Pool lineup, side view toward the sun): a hard-edged, lighter,
flatter region with L-shaped corners in the near water at 3.7–4.0 s, a faint straight line at 4.4–4.7 s.

## What it was: the crest light, not the patch

- **Reproduced** in the real game path (PhysicalMode with the worker, GPU tier, Ultra with the glow, Rich, sunset, the
  pool lineup, side view toward the sun). It comes back every 10 s wave cycle, about 0.4–0.9 s into it.
- **Mesh toggles** (`before-mesh-toggles.jpg`): with the lip, spray, bubbles or the coarse water hidden the region stays;
  only hiding the patch removes it (with everything else). With the patch tinted red it lies inside the patch. So it is
  the patch's own shading, not a hole between the patch and the coarse water.
- **Shading toggles**: shadows off and the tube carve off change nothing; the caustic map has no edge there. The crest
  light off (`totalEmissiveRadiance` from `waterCrestThickness`) removes it (`before-pool-sunset-crest-light.jpg`:
  rendered, crest light off, the march's thickness).
- **Why** (`src/scene/waterOptics.ts`, the march and its call in `waterBodyFragment`): toward a low sun the march runs
  almost level along calm water. Where the bilinear field rises toward the sun by millimetres and falls back within 6 m
  it lit a "crest" at e^(−c·t), near 1 in the pool's clear water; where the first step (0.25 m) fell instead it returned
  OPAQUE, no light. The first step's sign flips along the 1 m node lines (the bilinear slope is constant along a cell),
  so the light stepped from full to none in axis-aligned, L-cornered edges, and came and went as the swell passed.
  Every lit point within 30 m of the camera rose under 3 cm above the ray (CPU mirror on the live field).
- Classic shares the march and showed the same region (`classic-old-fixed-off.jpg`).

## The fix (f19e208c)

The march also reports the crest's rise above the ray, and the light fades in with the crest's steepness, rise over
thickness, from 1 % to 5 % (`CREST_STEEPNESS`). Continuous where the first step leaves the water; calm water's slivers
stay dark; crests rising 30 cm or more light as before. Over the whole pool tank with the sun behind the waves: 100 % of
the light kept for rises of 30 cm and more, 68 % at 10–30 cm, 11 % at 3–10 cm, 0.3 % under 3 cm.

Cost (`waterSheetGpuAB`, the pool's `lineup` shot toward the sunset sun, Rich, Ultra, arms frame by frame, 30 cycles,
this machine with the pane hidden): the fixed program against the old, median per-cycle difference −0.005 ms; the old
against itself −0.008 ms. Within the noise; the frames ran 74–82 ms here, so an M1 check in a shown pane is still open.

Stills: `after-pool-sunset-crest-light.jpg` (same phase, the march still finds the regions, nothing drawn);
`rich-backlit-old-fixed-off.jpg` (sun behind the waves: old, fixed, off).

## The patch itself

- Placement and discard were checked in every render of the game (a hook on both meshes and on `renderer.render`):
  the pool lineup in the front and side views, the Wave Lab at Padang Padang (Hs 4 m, Tp 10 and 12 s, 10°, s 8,
  sunset) in its overview and free camera, and sweeps of 72–180 camera poses around the break and around the barrel's
  mask, over 7,000 coarse-water draws. None drew the coarse water with the discard on without the patch drawn over
  exactly that rectangle, and the seabed (painted magenta) never showed below the horizon.
- Guard (965d9572): the discard is now on only when the patch draws for that camera (Rich, shown, in its layers), set
  in the same per-draw hook as the placement. Tests pin the placement for a Lab-sized tank across camera jumps, both
  draw orders, and no discard where no patch draws.

## Still open: the tan plane in v4, v4-wall and v5

Not reproduced. The look (the seabed as a flat tan plane with straight edges, a wave's cut edge standing as a wall)
matches a patch hole, but no render here drew one. Leads:
- A drained flat: Padang Padang's wedge top is 1.25 m deep along a straight 40° line, and the Canyon's terrace has a
  level top behind a straight break line; a 4.4 m set's trough draws more than that, which the renderer would draw as
  dry sand (dry nodes sit 5 cm under the bed). In these runs the reef dried at most about 200 m² (Tp 10 s), none at
  Tp 12 s. Check: in the clip's sea, count `surface <= bed` nodes where the bed is under datum while the plane shows.
- The swept barrel's mask at Padang Padang discards the water where the loft draws; a loft not drawn under an active
  mask would show the reef. The sweeps around the mask found none.
