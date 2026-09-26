# G7 · Characters and sky

Agreed in a grilling session on 2026-09-26 (18 questions over three rounds; every recommendation accepted). This is the requirements record. Part A's plan is [G7 Part A](../plans/2026-09-26-g7a-characters-and-sky.md).

## Goal

Replace the primitive surfer (capsules and spheres in flat colours) with semi-realistic, textured surfers, give the board real materials, and light the scene from photographed skies, so the rider fits the physically based water. The physics stays the authority over the body.

## Starting point

- **Rider** (`src/scene/Surfer.ts`): about 20 primitives in flat colours, no textures or skeleton. The physical mode draws it from the worker snapshot's seven points (`RIDER_SNAPSHOT`: pelvis, torso and head centres; hand and foot tips while attached, arm and leg centres once fallen), the phase and the heading.
- **Board** (`src/scene/BoardMesh.ts`): built from the physics `BoardShape`, vertex colours, no UVs, no fins drawn.
- **Sky** (`src/scene/Environment.ts`): a two-colour gradient sphere, a sun sphere and two flat coastline cards. The water's reflection is a 128 px cube capture of that scene, prefiltered with PMREM.
- **Lights:** an ambient light, a warm sun and a cool fill. No shadows anywhere.
- **Renderer:** `WebGLRenderer`; WebGPU is used only for the P6 compute tier.
- **Assets:** none. The repository holds no images or models and has no LICENSE file.

## Decisions

### Scope

- **In:** the surfer character, the board, photographed-sky lighting, shadows, the wet look and paddle splashes.
- **Later passes (Backlog):** the beach, sand and coastline; water texture detail (foam and spray); a replay or photo mode; dripping water; a full character creator; motion capture to refine the paddle and pop-up; moving to the WebGPU renderer.

### Look

- **Semi-realistic:** real proportions and simpler textures (the Riders Republic or Skate range), not photoreal and not toon.
- **Close-up:** the surfer must hold up at 1.5 m from the camera for a menu preview and a later replay or photo mode. Gameplay levels of detail target the chase distance.
- **Renderer:** stays `WebGLRenderer`. Skinning, IK, retargeting and HDRI lighting all work there, and the water's GLSL is not ported to TSL.

### Licences

- **Allowed:** CC0, CC-BY and Mixamo. Paid assets stay an option; no AI-generated main character.
- **Recorded:** `docs/ASSETS.md` lists every asset's source, author and licence. MakeHuman, Poly Haven and Mixamo need no attribution, so an in-game credits screen is only needed if a CC-BY asset ever comes in.

### Surfers

- **Four bodies:** two women and two men, with different builds and skin tones, sharing one skeleton. They are built from MakeHuman's CC0 base mesh in Blender with the MPFB2 add-on, by a script that runs Blender headless (`scripts/assets/`), so every body can be regenerated.
- **Hair:** short or tied back, with a wet look; long loose hair would need hair physics.
- **Outfits** are a separate choice from the body:
  - full 3/2 wetsuit (the default);
  - spring suit;
  - boardshorts (men) or bikini (women), with a rash vest.

  Wetsuits are skin-tight, so an outfit is a mask on the body's own texture, not separate cloth. A swappable accent colour styles the suit.
- **Physics body:** in Part A the four bodies are visual only. They all ride the physics reference rider (73 kg), and their heights stay within about ±5 % of the reference posture, which the rig absorbs. Feeding a preset's mass and height into the physics waits for P9's flexible rider (Backlog).
- **Growth:** the presets are built so they can grow into a customizer (body, skin tone, hair, outfit, board) for the multiplayer beach.

### Motion

- **Physics owns the body:** where it is, its contact and its falls. The skeleton is solved each frame from the physics points by IK:
  - the pelvis, chest and head follow the trunk points;
  - the hands and feet reach their tip points with two-bone IK (fall points are limb centres, which are extended to tips);
  - feet stay flat on the deck while standing.
- **Code-driven detail** adds what the physics does not model: knee and elbow directions, head look along the travel direction, chest twist toward the nose, hand shape (cupped while stroking, open while riding) and the flutter kick while swimming. Both stances (regular and goofy) work from the start.
- **Clips:** Mixamo supplies only generic clips (swim, tread water, and later beach idle and walk for multiplayer). Downloading them needs the user's Adobe login, so they arrive when the user downloads them; nothing in Part A depends on them.
- **Interface:** the rig reads a "rider visual state": the seven points, the phase, the heading and the board's pose, which is today's `RIDER_SNAPSHOT` plus the board pose. P9's flexible rider plugs in unchanged as long as `renderPoint` keeps its meaning.

### Board

- **Geometry:** exactly the physics `BoardShape`, as now.
- **Materials:** glossy resin, a wax texture on the deck, a traction pad with real grooves, a stringer, and modelled fins.
- **Designs:** 4–6 unbranded designs (resin tints, sprays, stringer colours).
- **Leash:** drawn only once P11 adds it to the physics, so the picture never shows a tether the physics doesn't have.

### Sky and lighting

- **Three Poly Haven "pure sky" HDRIs** (no ground), one each for P8's Dawn, Midday and Sunset:
  - a 1k HDR lights the scene and the water's reflections;
  - a 4096 × 2048 JPEG is the visible sky.
- **Sun:** the sun's direction in each photo is measured when it is downloaded. The directional light matches it, the sun-direction control rotates the sky, and the Wave Lab's sun-height slider snaps to the photo whose sun elevation is nearest.
- **Replaced:** the gradient sphere, the sun sphere and the cube capture give way to the photo sky. The legacy coastline cards stay for the legacy wave.

### Shadows (by P8 graphics preset)

- **Low:** a soft blob under the board.
- **Medium:** the rider shadows itself and the deck.
- **High:** the shadow also falls on the water (showing mostly on foam) and on the seabed.
- **Ultra:** soft, contact-hardening shadows (PCSS, after `webgl_shadowmap_pcss`).

Part A builds all four levels. Part B maps them to P8's presets.

### Wet look and splashes

- **Wet sheen** on skin, hair and suit is always on.
- **Paddle splashes** come from the physics stroke: drops are thrown into G6's spray cloud where a hand enters and pulls through the water, in proportion to the stroke's push, so the picture never splashes more than the physics pushes.

### Assets

- **Location:** `public/assets/`, committed to plain git (no LFS).
- **Formats:** meshopt-compressed glTF with compressed textures (KTX2 where the toolchain allows it, otherwise WebP). Each sky is a small HDR plus a JPEG.
- **Loading:** only the chosen surfer and the current sky load. Download sizes are measured and recorded, never a gate.
- **Regeneration:** a Blender script rebuilds the surfers, and a Poly Haven script re-downloads the skies.
- **Fallback:** the primitive surfer stays as the fallback while assets load and if they fail, and is removed from the choices.

## Parts

- **Part A (now, in parallel with P8 and P9):**
  - the asset scripts, the four surfers and three skies;
  - the skinned rider and its IK;
  - the board's materials and fins;
  - the photo sky and its sun;
  - the shadow levels, the wet look and paddle splashes;
  - a dev screenshot sheet.

  It stays out of P8's files: `Controls.ts`, `index.html`, `style.css`, `src/ui/`, and `main.ts`'s page wiring. Scene wiring in `main.ts` is kept to a few lines.
- **Part B (after P8 merges):**
  - a **Surfer** card on P8's Surf screen: a slowly rotating preview under the chosen time-of-day sky, with pickers for body, outfit, wetsuit colour and board design, saved in P8's settings store;
  - P8's Time of day picks the sky;
  - P8's Low–Ultra presets pick the shadow level, the level of detail and the texture sizes.

## Done when

- **Tests** cover the rig:
  - feet stay on the deck;
  - knees and elbows bend the right way;
  - no bone stretches;
  - regular and goofy mirror each other;
  - the committed surfers carry every bone the rig needs.
- **A screenshot sheet** shows each body at chase distance and at 1.5 m, under Dawn, Midday and Sunset, prone, standing and fallen, and the user reviews it.
- **A playtest with the user.** "Done" is judged together through play, as for the other phases.
