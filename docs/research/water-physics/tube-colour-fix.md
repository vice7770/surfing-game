# Fixing the curl's navy colour (Padang Padang, PR #92)

Written 2026-09-30 by the water-physics advisor after the owner's clip of `claude/padang-mesh` on the M4 Pro. It is for the Padang Padang build session, or whoever applies it. The advisor doesn't edit game code.

## What the owner saw

The drawn curl is dark navy, almost black, while the face beside it is pale cyan and covered in white foam. It reads as dark tongues lying on the whitewater, not as a hollow tube, and close up as a flat dark slab. The lip should do the opposite: it is the thinnest water on the wave, so it is the lightest and greenest part when light comes through it.

## Why: the curl is shaded as a deep column of water over the reef

`SweptBarrelMesh.ts` reuses the water's shading (`waterBodyFragment` in `waterOptics.ts`). That shading assumes a column of water standing on the seabed. Three parts of it are wrong for a lip:

1. **Depth is the height above the bed.** In `sweptBeginNormal`, `vWaterDepth = position.y − waterBedAt(xz)`, and `waterBodyReflectance` fades from the bed's albedo toward the deep-water reflectance R∞ over twice that depth. Two things follow:
   - A lip 3–5 m above the reef gets the colour of 3–5 m of water over the bed. In reality it is a sheet about 0.1–0.5 H thick with air on both sides.
   - Both ends of that fade are dark at Padang Padang. R∞ in clear water is navy, and the bed is live coral at albedo (0.08, 0.08, 0.025) (`SPOT_OPTICS.padang`). So the lip comes out navy-black whatever its depth.

   The flat water hides this with its grazing sky reflection and its foam. The lip's front faces the camera, so its Fresnel reflection is small (about 2 %) and the dark body shows.
2. **The crest light is off.** `waterBodyFragment(false, …)` drops the see-through light term (`CREST_SCATTER`, sunlight crossing a thin crest). That was deliberate: its thickness march reads the height field, which under a lip is the hump, not the lip. The face beside the curl keeps the term and glows, so the contrast grows.
3. **Caustics look for the reef through air.** `caustics = true` projects the view ray to a "bed" `vWaterDepth` below the lip and lights that spot with the caustic map.

The curl's missing foam, `vWaterFoam = (1 − sweptLift) × foam`, makes the contrast worse, but it's a separate item: PR 5 plans the tube's own foam.

## The fix: shade the lip as a thin sheet lit from behind

The idea is to give each curl vertex its **sheet thickness**, the distance across the lip to its other surface, and to shade the lip as that thin sheet with sky and sun behind it, not as a column over the reef. The face and the throat's back wall stay as they are: they really are thick water.

### 1. Work out the lip's thickness in the loft (CPU, `sweptLoft.ts`)

Each slice's profile is a 2D polyline of 128 points. Per `LANDMARK` in `ProfileLibrary.ts`:
- points 32–64 run from the crest to the lip's tip along its outer surface;
- points 64–88 run from the tip back under the lip to the throat.

These two runs are the lip's two sides, in metres, after scaling.

- For each point i from 33 to 87: `sheet[i]` = the shortest distance from point i to the other run's polyline segments.
  - That's 55 points × about 25 segments per slice, about 1,400 distance tests. At most about 290 slices (15.6k vertices ÷ 134) come to about 0.4 M tests a frame. Plain + − × ÷ √, so the worker can run it too. Provisional cost: well under 1 ms.
- `sheetWeight[i]`: 1 from point 36 to point 84, ramping to 0 over the 3 points next to the crest and the throat. Multiply by the vertex's existing `lift` (e), so the seam and the fades carry through, and 0 on the extensions.
- Add `sheet` and `sheetWeight` to `LoftResult`, and two attributes (`sweptSheet`, `sweptSheetWeight`) to `SweptBarrelMesh`, copied like `lift`.

Use two attributes, not a sentinel value: a varying interpolates, so a sentinel would smear across the lip-to-face edge.

### 2. Shade the sheet (both looks, curl only)

In the curl's fragment code, blend between the existing column body and a sheet body by `vSweptSheetWeight`:

```glsl
// t: the view ray's path through the sheet, m (a normal thickness lengthened by the refracted angle)
float t = vSweptSheet / max( 0.2, waterRefractedCosine( waterViewCos ) );
vec3 sheetReach = exp( -waterAttenuation * t );                  // Beer–Lambert on the water's own absorption and scattering
vec3 sheetBack  = sheetBehindRadiance;                           // the sky and sun on the lip's far side, below
vec3 sheetBody  = waterDeepReflectance * ( 1.0 - sheetReach * sheetReach ) + sheetBack * sheetReach;
waterBody = mix( waterBody, sheetBody, vSweptSheetWeight );
```

- **This is the two-flux thin-layer form.** The water's own R∞ builds up with thickness, and the light behind is attenuated through it, in place of R∞ plus the bed. Pope & Fry's absorption, already in `WATER_ABSORPTION`, takes red out fastest, so thin water turns cyan-green and thicker water deeper green, which is what backlit lips look like.
- **`sheetBehindRadiance`, the light behind the lip:** the sky's irradiance (the scene's hemisphere or ambient term). Add the crest light where the sun is behind the lip: `CREST_SCATTER · waterBehind · (1 − Fresnel) · waterSunRadiance`.
  - This is exactly the current crest-light term. The only change is that its thickness is `t`, not `waterCrestThickness(...)`, so switch that march off where `vSweptSheetWeight > 0`.
  - Which sky uniform to use is the build session's choice (provisional).
- **Caustics:** multiply the caustic lookup's contribution by `(1 − vSweptSheetWeight)`. No reef is seen through a lip.
- **Classic:** the change touches only the curl's own program. `waterLooks` snapshots of the other spots stay byte-identical, as the owner's rule requires.

### 3. What PR 6 keeps

The spec's PR 6 lip glow (exp(−σ·k·d), k ≈ 5–20) and dark throat (sky light dimmed by how much sky each vertex sees) stay Rich extras layered on this. Step 2 is the base colour both looks need. Without it, PR 6 would be adding glow to navy.

## How to check it

- **Unit test** (`sweptLoft`): a synthetic plunging profile with a lip of known uniform thickness. The measured `sheet` is within 5 % of it on points 36–84, and `sheetWeight` is 0 on the face, the back and the extensions.
- **Shader test:** the curl's program contains the sheet branch. Every other spot's water program is unchanged (the existing snapshots).
- **By eye, and measured,** at Padang Padang in both looks, on the channel view of the owner's clip:
  - with the sun behind the lip, the lip's mean luminance is at least the face's, and its hue is at least as green as the face's;
  - lit from the front, the lip is at least 0.8× the face's luminance;
  - the lip is never darker than the throat's back wall.

  These thresholds are provisional, from the look of backlit lips, not a measurement.
- **Cost:** time `SweptLoft` before and after with the `padangLoft` probe (it was 0.50 ms a frame). The shader should get cheaper, since it drops the crest-light march on the lip.

## Not solved by this

- **The ribbons, and the slab at the end of the clip:** the curl shows as two or three separate tongues, and at the end as a flat slab close to the camera. They may be slices that live on after touchdown, or several fronts side by side. To find out, draw the curl coloured by `slicePhase` (0 before vertical, 1 open, 2 after touchdown) in a dev view before changing any shape. The tube review covers this.
- **Foam:** the tube's own foam comes with PR 5's crash curve.
