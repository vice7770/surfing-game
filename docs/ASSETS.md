# Third-party assets

Every image, model and texture the game ships, with its source and licence. Nothing here needs in-game attribution: all of it is CC0. An in-game credits screen becomes necessary only if a CC-BY asset comes in.

## Skies (G7)

Photographed "pure sky" HDRIs from Poly Haven, one per time of day. The download script moves each sun out of its HDR into a measured directional light (`scripts/assets/skyMath.ts`), so the environment lights the shade and the light casts the shadows without counting the sun twice. The visible sky is Poly Haven's tonemapped JPEG, resized to 4096 × 2048.

| Time of day | Asset | Author | Licence | Files | Size |
| --- | --- | --- | --- | --- | --- |
| Dawn | [qwantani_sunrise_puresky](https://polyhaven.com/a/qwantani_sunrise_puresky) | Greg Zaal, Jarod Guest | CC0 | `public/assets/skies/qwantani_sunrise_puresky_1k.hdr`, `.jpg` | 2.1 MB + 0.3 MB |
| Midday | [kloofendal_48d_partly_cloudy_puresky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) | Greg Zaal, Jarod Guest | CC0 | `public/assets/skies/kloofendal_48d_partly_cloudy_puresky_1k.hdr`, `.jpg` | 2.1 MB + 0.7 MB |
| Sunset | [qwantani_sunset_puresky](https://polyhaven.com/a/qwantani_sunset_puresky) | Greg Zaal, Jarod Guest | CC0 | `public/assets/skies/qwantani_sunset_puresky_1k.hdr`, `.jpg` | 2.1 MB + 0.4 MB |

Measured suns: dawn 2.1° up (weak and red, the sky dominates), midday 47.9°, sunset 6.1°.

## Surfers (G7)

Four bodies built from MakeHuman's base mesh with [MPFB 2](https://static.makehumancommunity.org/mpfb.html) in headless Blender (`scripts/assets/build_surfers.py`, recipes in `scripts/assets/surfers.json`). They share MPFB's Mixamo-compatible skeleton (52 bones), so Mixamo clips can be retargeted onto them later. Each GLB holds:
- the full body (`LOD0`, about 14.5k vertices);
- a low-poly proxy body (`LOD1`, about 1.9k);
- eyes, eyebrows, eyelashes and hair.

Geometry is meshopt-compressed. Textures are WebP at most 2048 px.

The skin, eye, eyebrow, eyelash, hair and proxy assets come from the [MakeHuman system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html), which lists every item as CC0 by the MakeHuman team. MakeHuman's licence FAQ states that models exported from MakeHuman/MPFB are CC0; MPFB itself is GPL tooling and does not ship in the game.

| Surfer | Body | Skin | Hair | Brows / lashes | LOD1 proxy | Height | File size |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `surfer1` | woman | young_african_female | braid01 | eyebrow010 / eyelashes01 | female1605 | 1.65 m | 1.0 MB |
| `surfer2` | woman | young_caucasian_female | ponytail01 | eyebrow001 / eyelashes02 | female1605 | 1.66 m | 1.6 MB |
| `surfer3` | man | young_african_male | short02 | eyebrow002 / eyelashes01 | male1591 | 1.74 m | 1.2 MB |
| `surfer4` | man | young_asian_male | short04 | eyebrow006 / eyelashes01 | male1591 | 1.72 m | 1.2 MB |

The eyes are MakeHuman's `high-poly` eyes with their default brown material.

## How to rebuild

- **Skies:** `npm run assets:skies`. It needs the network and macOS `sips`, and downloads into `scripts/assets/.cache/` (git-ignored).
- **Surfers:** `npm run assets:surfers`.
  - It needs Blender 5.2 at `/Applications/Blender.app` with the MPFB extension enabled (`Blender --online-mode --command extension install --enable mpfb`).
  - The first run downloads the 267 MB CC0 asset pack into `scripts/assets/.cache/` and installs it into MPFB's user data.
  - Rebuild some surfers only with `Blender --background --python scripts/assets/build_surfers.py -- surfer1 surfer2`, then `node scripts/assets/pack-surfers.mjs`.
  - The npm gltfpack has no texture codecs, so Blender writes the WebP textures and gltfpack compresses only the geometry.
