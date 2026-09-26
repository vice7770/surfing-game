# G7 Part A: Characters and Sky — Design Record

> Built test-first on `claude/g7-characters`, based on PR #7 (`claude/paddler-hold`), as P8 and P9 are. The implementation plan this record replaces is in the history of this file (`a836e39`). Requirements: [G7 spec](../specs/2026-09-26-g7-characters-and-sky.md). Assets and licences: [ASSETS.md](../../ASSETS.md).

**Goal:** Replace the primitive surfer with semi-realistic, textured, physics-driven surfers, dress the board, and light the scene from photographed skies. This part also adds shadows and paddle splashes.

## Design

### Skies

- **Download:** `scripts/assets/fetch-skies.ts` downloads three Poly Haven pure-sky HDRIs, one per P8 time of day:
  - dawn is `qwantani_sunrise_puresky`, sun 2.1° up;
  - midday is `kloofendal_48d_partly_cloudy_puresky`, 47.9°;
  - sunset is `qwantani_sunset_puresky`, 6.1°.
- **Sun extraction** (`scripts/assets/skyMath.ts`): the sun is found as the connected region brighter than 8× the 99th-percentile luminance and 2 % of the peak. It is replaced by the sky just around it, and its energy is kept as the sun's irradiance and direction. The environment then lights the shade and the directional light carries the sun, with nothing counted twice. The visible sky is Poly Haven's tonemapped JPEG at 4096 × 2048.
- **`PhotoSky`:**
  - builds a PMREM from the 1k HDR;
  - turns the photo about +y so its sun sits at the game's azimuth (a turn θ adds θ to atan2(x, z), as three's `backgroundRotation` and `envMapRotation` do);
  - gives the directional light the photo's sun.
- **Exposure:** each photo is scaled to a horizontal light of `REFERENCE_LIGHT` · (0.4 + 0.6 √sin e). The environment and sun share the scale, so each photo keeps its own sun-to-sky balance. The sun's colour is its irradiance over the brightest channel, and its intensity that channel.
- **Controls:** the Wave Lab slider maps to 0–60° and snaps to the nearest photo.
- **Rendering:** neutral tone mapping, exposure 1.05. The ambient and fill lights go to zero once the photo loads, and the painted sky stays until then or if loading fails.

### Surfers

- **Build:** `scripts/assets/build_surfers.py` runs headless Blender 5.2 with MPFB 2 (build 20260722). It builds four MakeHuman bodies from `surfers.json` on MPFB's Mixamo skeleton (52 bones) with GAMEENGINE skins, high-poly eyes, brows, lashes and hair. A low-poly proxy body (`female1605` or `male1591`, about 1.9k vertices) is `LOD1` beside the full body `LOD0` (about 14.5k). Macros are baked and textures written as WebP at most 2048 px.
- **Packing:** `pack-surfers.mjs` meshopt-compresses the geometry.
- **Result:** heights 1.65, 1.66, 1.74 and 1.72 m; files 1.0–1.6 MB.
- **`HumanoidRig`** poses the skeleton from `RiderVisualState`, which is the snapshot's seven points, phase and heading, plus the board's pose. It only sets rotations (and the hips' place), so no bone stretches.
  - **Body frame:** up runs from the pelvis point to the torso point. The chest faces left × up while upright (left from the rear foot to the front foot), down to the deck while lying, and along the heading once fallen.
  - **Hips:** at the pelvis point, lowered by an exact quadratic drop when the legs cannot reach their feet.
  - **Spine:** blends from up to the torso→head line, turning toward the nose.
  - **Head:** upright and looking where the board goes when standing, lifted and looking ahead when prone.
  - **Limbs:** two-bone IK. Fallen limb centres are extended to 0.92 of the limb's reach. Standing feet keep their rest pitch, so the sole lies flat, the ankle sits above the foot point by the sole height and behind it by half the foot, and the front foot turns 20° toward the nose.
  - **`RIG_DETAIL`** holds the art direction: hips 10° and chest 25° toward the nose, elbow drop and back, rear knee in, finger curl 12° relaxed and 32° stroking.
- **Outfits** (`outfits.ts`):
  - per-vertex signed distances, in metres, to each garment's edge on the vertex's limb chain. Edges are planes across bones, or bands along the hips→neck line.
  - The shader draws them crisp to ±4 mm, with no textures.
  - The full suit, spring suit, rash vest with boardshorts, and rash vest with bikini each have garment A, garment B and an accent yoke. The colours are uniforms.
- **Materials and loading:** `SkinnedSurfer` makes skin wet (roughness 0.45, clearcoat 0.35) and cuts hair cards out by alpha, darkened. It never frustum-culls the skinned meshes, whose bind-pose bounds stay at the origin, and switches to `LOD1` beyond 8 m.
- **`SurferView`** falls back to the primitive surfer while loading or on failure. `?surfer=surfer2…4` is a dev flag until Part B.

### Board

- **Hull:** `createBoardMesh(shape, design)` keeps the physics hull and adds UVs and three material groups: a waxed deck (roughness map 0.55–0.85 over 12–72 % of the length), a glossy bottom and glossy rails.
- **Designs:** five unbranded, painted into `DataTexture`s with the stringer and rail blend.
- **Pad:** a grooved traction pad with a tail kick.
- **Fins:** the three `THRUSTER` fins, swept trapezoids as deep as the physics fins, with the base chord solved so their areas match. They are toed in toward the stringer, with no cant (the physics has none).

### Shadows

`ShadowRig` has four levels, picked with `?shadows=` until P8's presets do:

| Level | What it draws |
| --- | --- |
| `blob` | A soft ellipse under the board. |
| `rider` | PCF 1024 on the rider and board. |
| `surfaces` (default) | PCF 2048, with the water, far field and seabed receiving. |
| `soft` | PCSS on the basic depth path. |

- **Following:** the ±4 m orthographic shadow camera follows the board, snapped to whole texels across the light.
- **Why PCSS on the basic path:** three r186's PCF path compares in hardware and cannot read depths for a blocker search. PCSS patches the chunk's last `getShadow( sampler2D …` (built chunks have no comments). Its penumbra is 0.02 m per metre from caster to receiver, four times the real sun's.

### Paddle splashes

- **Recording:** `AttachedRider` records each pulling hand per step as `strokes`: where it was, the impulse the water gave it, and its speed through the water.
- **Spray:** `SprayScene.strokes` carries them into `SprayCloud`. Each stroke throws drops in proportion to its work on the water (push × speed) at the lip splash's existing `SPRAY_PER_JOULE`, up and back along the water it pushed. Only an attached paddler splashes.

## Deviations from the plan

- **Textures:** WebP written by Blender's glTF exporter instead of KTX2, because npm gltfpack has no BasisU or WebP codecs. So no Basis transcoder ships, and the textures cost about 4× the GPU memory of KTX2 (one surfer is loaded).
- **Dawn sky:** `qwantani_sunrise_puresky` instead of `qwantani_dawn_puresky`, whose photo was taken before sunrise and has no sun disc.
- **Heights:** the women's height macros were retuned (0.55 and 0.62) to stand within 5 % of 1.72 m. The eyes keep the default brown.
- **Asset test:** it lives in `scripts/assets/`, since it reads files with Node and `src` has no Node types.
- **Splashes:** they come from the stroke's work at the existing spray rate, with no new constant.
- **Screenshot sheet:** it was built during Task 7 as the inspection tool for the later tasks.

## Verification

- **Tests:** 17 files added or extended.
  - sky maths (8);
  - photo sky (5);
  - two-bone IK and orientation (7);
  - rider state and posture points (4);
  - the humanoid rig (8): feet on the deck, knees toward the toe side, elbows down, no stretch, regular/goofy mirror, short legs, prone, fallen, degenerate frames;
  - outfits (8);
  - materials against three's real shaders (4);
  - skinned surfer (3): no culling, dressing, LOD, pose far from the origin;
  - committed assets (5);
  - board designs (5), fins (4) and board mesh (6);
  - paddle strokes (2 spray, 2 rider);
  - shadows (5).
- **Browser:**
  - The screenshot sheet (`character-sheet.html`) shows all four surfers prone, standing and fallen, at chase distance and 1.5 m, under the three skies. Close-ups hold up, with crisp outfit edges and a visible wet sheen.
  - The sun check shows the photo's sun and the light's glint on one vertical line.
  - The game runs the skinned surfer with no console errors; a missing model gives one warning and the simple surfer.
  - Frame rate at `surfaces` is 60 fps (display-capped, median 16.7 ms, p90 17.6 ms). `soft` was not timed because the browser pane was hidden and throttled.
- **Not checked:** the paddle splashes were not singled out in the browser, where breaking-wave spray dominates the count; the tests cover the path from rider to spray.

## Open for Part B and the playtest

- Part B: the Surfer card and picker on P8's Surf screen, Time of day picking the sky, and presets picking shadows, LOD and texture sizes.
- Playtest items:
  - the standing arms are held out as the physics posture says;
  - the fallen pose comes from physics limb centres and can look splayed;
  - MakeHuman faces read slightly doll-like at 1.5 m.
