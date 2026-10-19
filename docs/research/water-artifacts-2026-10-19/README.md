# Two water artifacts: the lone NaN pixel and the pale stripes — 2026-10-19

Branch `claude/water-artifacts`, from `claude/wave-pool` at 18bfbe9f. Drawing fixes only: the water and physics
are untouched.

Reproduced on the water sheet, CPU sea, the glow branch's held state:
`?inpage&waterSheet&spot=beach&graphics=high&diagnostics` (the GPU sea, `&compute=gpu`, settles to a different
sea where neither shows). All measurements on this machine, an M1 MacBook Air, in a hidden browser pane.

## 1. The lone NaN pixel (Rich): fixed in c65787ff

**Seen:** from the Beach's sand at midday (`{ eye: [0, 2, 4], target: [0, 0.3, -101.5] }`), a float render target
held one pixel (1016, 398) of (NaN, NaN, 1.6e19). The 8-bit canvas writes the NaN as 0 into one of the pixel's four
samples, so it never showed there.

**Root cause, traced in a 4× MSAA float target with probes on each lighting term:**

1. The pixel is one MSAA sample of a sliver triangle of the dense patch, seen at grazing. The fragment is shaded at
   the pixel centre, outside the triangle (three interpolates at the centre, not the centroid), so every varying is
   extrapolated far out of range: `vWaterDepth` −25.6 m, `vWaterPlumeDepth` −28.9 m, `vWaterAir` −0.66,
   `vWaterFoam` −38.6, `vWaterWorld` (374, −47, −682).
2. `RICH_FOAM` (`src/scene/water/richWaterGlsl.ts`): the plume's path `0.5 · min(plumeDepth, depth) / cos` went
   negative and `exp(−waterAttenuation · path)` reached e^47, so `diffuseColor` = (9e22, 2.4e20, 8e19).
3. three 0.186's `RE_IndirectSpecular_Physical` runs `computeMultiscattering` for the metallic path with
   `diffuseColor` as F0 even at metalness 0: `FssEss · Favg` overflowed to inf in red and green, and
   `mix(dielectric, metallic, 0.0)` turned that into NaN. Blue stayed finite: the huge diffuse × irradiance, 6.4e19.
   (Probes: `indirectSpecular` non-finite; `radiance`, irradiance, roughness, normal, diffuse, emissive finite.)

**Fix:** the plume's reach is held at ≥ 0 and its exponent at ≤ 0 (two clamps; CPU twins `plumeReach`,
`plumeWhiteness`, tested). Over any triangle every input is already ≥ 0, so drawn water is unchanged: in a float
target every pixel that differs by more than 1e-4 has an extrapolated sample (checked against a mask of fragments
with negative plume inputs, four shots); the rest differ by a few ULPs (the compiled code changed). After the fix no
pixel is non-finite or above 1e4 in 36 shots (both looks, dawn/midday/sunset, six views). Classic never had the
plume. Cost: none measurable.

Still open: the sliver samples themselves still shade with out-of-range varyings (foam −38 makes the crest light's
`1 − foam` 39×), bounded now but not meaningful. `centroid` varyings would fix that class but change every edge pixel.

## 2. The two pale stripes (both looks): fixed in 4d887e4c

**Seen:** the Beach sunset lineup (`lineup` shot), two pale parallel bands from the lower left toward the horizon;
glow off or on. `beach-sunset-lineup-rich-before.jpg`.

**Root cause:** they are the crest light (`waterBodyFragment`'s `crest`, `src/scene/waterOptics.ts`), not the patch,
caustics, chop, edge band or foam: hiding each other object and painting the patch, skirt and coarse mesh changed
nothing, and of the lighting terms only `totalEmissiveRadiance` holds them (`…-crest-light-before.jpg`, ×4). They lie
along a swell trough’s floor (about z −128.7 and −128.2, the trough's bottom between rows −128 and −127, its floor falling
~3 mm/m toward the sun).

`waterCrestThickness` marches level toward the sun and compares the **bilinear** field ahead with the ray's height,
but the ray started at the **drawn** point, which sits off that field: Rich draws the Catmull-Rom surface (at the
patch's 0.5 m vertices, interpolated between), which on a concave trough floor lies about a millimetre under the
bilinear one; Classic draws the mesh's triangles, off it by the bilinear twist. From 1 mm under, the first sample
(0.25 m) reads "in water" and the next (1 m) out of it: a 0.3 m "crest", lit at e^(−2.2 · 0.3) ≈ 0.5. The offset peaks
between patch rows, likely why Rich shows two bands per row; Classic showed one pale polygon
(`beach-sunset-lineup-classic-before.jpg`, at the centre).

**Fix:** the march starts on its own surface under the origin (`origin.y += waterCrestGap( origin )`), the same
`float gap = … - p.y` line the Rich carve and the edge band's far-sea blend rewrite, so the base reads the surface the
samples read; the CPU twin `crestThickness` does the same (tested on a trough and a ridge).

- Sunset lineup: the stripes and Classic's polygon are gone (`…-after.jpg`, `…-crest-light-after.jpg`).
- Classic: 8-bit diff 0 wherever the crest light is dark before and after (lineup sunset/midday, face sunset, bore
  dawn). Where it is lit, false glows go and real crests shift by 1–8 levels (bore dawn: 1 483 pixels).
- Rich, bore dawn: fainter stripes of the same kind go (`beach-dawn-bore-rich-diff.jpg`, red = was brighter).
- Edge band (backlit view past the +x edge): compiles, no new artifacts.
- Cost: one more height lookup (and, in Rich, `waterCarve`, early-out without tubes) per backlit fragment. GPU timer,
  backlit sunset lineup, Rich, interleaved A/B, p10 of 96 frames: 6.04 ms before, 6.26 ms after (+0.2 ms; the
  plume clamps alone +0.01). Hidden-pane timings are noisy (medians wandered 11–15 ms): check on a shown pane.

Still open: a short thin line remains where the trough's floor is flattest (`beach-sunset-lineup-classic-after-crop.png`,
both looks, about 70 × 2 px): the march now reads one surface, but a level ray on a floor that rises and falls by a
tenth of a millimetre still finds a "crest". Gating the light by how far the crest stands above the ray would remove
it but dims real crest tops; left for the owner.
