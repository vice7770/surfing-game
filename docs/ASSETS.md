# Third-party assets

Every image, model, texture and sound the game ships, with its source and licence. Nothing here is known to need in-game attribution: all of it is CC0 except the generated sounds, which are used under the owner's ElevenLabs plan (see Sounds). The one ported piece of code, under Code, is zlib-licensed, which asks for no in-game credit either. An in-game credits screen becomes necessary only if a CC-BY asset comes in, or if the ElevenLabs plan's terms ask for credit.

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

The skin, eye, eyebrow, eyelash, hair and proxy assets come from the [MakeHuman system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html), which lists every item as CC0 by the MakeHuman team. [MakeHuman's licence FAQ](https://static.makehumancommunity.org/makehuman/faq/can_i_sell_models_created_with_makehuman.html) states that exported models are CC0; MPFB itself is GPL tooling and does not ship in the game.

| Surfer | Body | Skin | Hair | Brows / lashes | LOD1 proxy | Height | File size |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `surfer1` | woman | young_african_female | braid01 | eyebrow010 / eyelashes01 | female1605 | 1.65 m | 1.0 MB |
| `surfer2` | woman | young_caucasian_female | ponytail01 | eyebrow001 / eyelashes02 | female1605 | 1.66 m | 1.6 MB |
| `surfer3` | man | young_african_male | short01 | eyebrow002 / eyelashes01 | male1591 | 1.73 m | 1.5 MB |
| `surfer4` | man | young_asian_male | short04 | eyebrow006 / eyelashes01 | male1591 | 1.72 m | 1.2 MB |

The eyes are MakeHuman's `high-poly` eyes with their default brown material.

The men also carry MPFB shape targets on top of their macros (the recipe's `targets`, applied before the rig is fitted): a V-shaped torso, a little more shoulder width, lats, chest, shoulder and arm muscle, a thicker neck and a squarer jaw, so they read as surfers rather than slim boys.

## Sounds (S1)

Fourteen recordings, two candidates for each of seven sounds (roar, distant surf, bubbles, the two lip crashes, the paddle splash and the plunge), **generated with ElevenLabs Sound Effects on 2026-10-03**. The owner chose generated recordings over CC0 downloads that day. They are not CC0: they are used under the owner's ElevenLabs plan, and `public/assets/audio/sounds.json` records them with the licence `generated`. The plan's tier and terms are not written down here: confirm they cover a shipped game, and whether they ask for credit, before release.

Wind, rush, rail, the pop-up, the click, the chime, the leash snap, the knock and the duck-dive stay synthesised. Every sound keeps its synthesised fallback (`src/audio/synth.ts`), used until its recording loads or if it fails.

Every file is AAC (`.m4a`, a 128 kb/s target, mono, 44.1 kHz). The manifest picks one candidate per sound and sets a gain. Both are **provisional**: they come from measurements and spectrograms, not from listening, and the sound check (Wave Lab, ♪ Sound) and the listening playtest are where they get settled. A gain matches the picked recording's loudness to the synthesised sound it replaces: integrated loudness for a loop, the loudest 400 ms for a one-shot.

**Loops** (8.10 s, normalised to −23.0 LUFS; each joins two 5 s takes of its prompt, because the tool makes at most 5 s at a time):

| File | Prompt | Picked | Gain |
| --- | --- | --- | --- |
| `roar-1.m4a` | Close field recording of powerful ocean waves breaking on a shallow sandbar: a sustained wall of white-water noise, a heavy surging rumble with fizzy foam hiss, relentless and even, no single crash standing out. Natural unprocessed surf. No music, no voices, no birds, no synthetic tones. | yes | 1.14 |
| `roar-2.m4a` | Deep thundering roar of large ocean waves breaking on an outer reef, heard from the water a hundred metres away: a continuous heavy low rumble with a soft hiss of white-water on top, no distinct crashes, even and relentless. Natural field recording. No music, no voices, no birds, no synthetic tones. | | |
| `distant-1.m4a` | Field recording of distant ocean surf heard from far down the coast: a soft, low, muffled rumble of waves breaking far away, slow gentle swells of volume breathing in and out, no individual splashes, no close water sounds, no wind noise, steady and even. Natural open-air ambience. No music, no voices, no birds, no synthetic tones. | yes | 1.32 |
| `distant-2.m4a` | Faraway surf on a quiet coast, recorded from a long way off: a faint, deep, continuous murmur of waves breaking on a distant reef, smooth and low, slowly rising and falling, with no close sounds, no wind. Natural unprocessed ambience. No music, no voices, no birds, no synthetic tones. | | |
| `bubbles-1.m4a` | Underwater recording just below the surface of the sea, as heard by a hydrophone after a wave has broken overhead: a dense fizzing and crackling of air bubbles rising and popping, over a deep muffled rumble of surf above, steady and enclosed. No air sounds, no splashes. No music, no voices, no synthetic tones. | | |
| `bubbles-2.m4a` | Underwater recording in the surf zone after a wipeout: big air bubbles gurgling and glugging upward past the microphone, deep low-pitched bubbling, with a heavy muffled rumble of waves overhead. Enclosed underwater sound, continuous and even, no splashes. No music, no voices, no synthetic tones. | yes | 1.57 |

**One-shots** (peak −1.0 dBFS once decoded; one take each):

| File | Length | Prompt | Picked | Gain |
| --- | --- | --- | --- | --- |
| `lipJet-1.m4a` | 2.20 s | Close field recording of a heavy ocean wave's thick lip throwing out and plunging onto the water in front of a surf barrel: a deep powerful boom as the lip slams into the water, then an explosion of white-water and a hissing wash fading away. A single impact. Natural. No music, no voices, no synthetic tones. | yes | 0.95 |
| `lipJet-2.m4a` | 2.32 s | Powerful ocean wave crashing down onto a reef pool, recorded from a few metres away: a heavy slap and low thud, a burst of splashing spray and rolling white-water that tails off into foam. A single big crash. Natural ocean field recording. No music, no voices, no synthetic tones. | | |
| `lipRoller-1.m4a` | 1.55 s | Field recording of a small ocean wave rolling over and crashing softly in shallow water: a short tumbling whoosh and splash, light foam fizz fading away. A single small wave crash. Natural. No music, no voices, no synthetic tones. | yes | 0.99 |
| `lipRoller-2.m4a` | 1.62 s | A small wave breaking softly on a sandy shore, recorded close: a gentle rolling crash that spills into hissing foam and a soft wash up the sand, quick decay. A single small crash. Natural ocean field recording. No music, no voices, no synthetic tones. | | |
| `paddle-1.m4a` | 0.77 s | Close recording of a surfer's hand paddling a surfboard in the sea: one cupped-hand pull through the water, a quick soft splash and a swish of water, a few droplets after. A single stroke only. Natural. No music, no voices, no synthetic tones. | yes | 1.22 |
| `paddle-2.m4a` | 0.58 s | Single arm paddle stroke on a surfboard in the ocean, close microphone: the hand enters the water with a small splash, pulls with a smooth water swish, droplets patter back. One stroke only. No music, no voices, no synthetic tones. | | |
| `plunge-1.m4a` | 2.81 s | Heavy splash of a person falling into the ocean from a surfboard: a dull body impact on the water, a rush of white-water, then bubbling and a muffled underwater rumble. A single event, close microphone. No voices, no screams, no music, no synthetic tones. | yes | 1.40 |
| `plunge-2.m4a` | 1.72 s | The same prompt as `plunge-1.m4a`, another take. | | |

How they were made (nothing in the repo rebuilds them: the tool has no seed, so a prompt gives a different take each time, and the raw takes are not committed):
- **Generation.** The ElevenLabs Sound Effects tool, 16-bit 44.1 kHz PCM out. Loops are 5 s takes with the model's `loop` option on; one-shots are 1–3 s without it. 33 takes were generated and 20 used; the rest were set aside for a dropout, heavy clipping, hiss with no body, a sweep instead of a steady bed, or because a closer match was already in hand.
- **Every take.** Folded to mono, then high-passed at 30 Hz (28 Hz for one-shots) and low-passed (15 kHz, 16 kHz for one-shots; 5 kHz for `distant-1`, 6 kHz for `bubbles-1`, 3.5 kHz for `bubbles-2`) with zero-phase filters: the generator's output carries sub-20 Hz drift and a few faint artefact lines far above the sound.
- **Loops.** The first and last 0.25 s of each take are cut, because the model fades them. Each frequency band (split at 120, 500, 2000 and 6000 Hz) has its slow swell flattened, so hiss and rumble stay level together. The two takes' average spectra are moved half-way towards each other (6 dB at most) and the levels either side of each join are matched. The takes are joined end to end and end to start with equal-power crossfades (0.45 s; 0.6 s for `distant-2`). The loop is set to −23.0 LUFS (EBU R128 integrated loudness, measured with ffmpeg's `ebur128`); `bubbles-1` has isolated pops that would have held the whole loop 1.3 LU under that target, so a lookahead limiter takes them down by 1.6 dB. AAC reconstructs a file's first and last samples with a little extra error, so the loop, which is circular, is finally rotated to the start whose decoded wrap is the smoothest.
- **One-shots.** The head is trimmed to the onset (4 ms before it, 2 ms fade-in) and the tail where its 25 ms level falls 38 dB under the peak, then faded out over 150 ms. The gain is set so the decoded file peaks at −1.0 dBFS (within 0.05 dB: AAC moves the peak by a few tenths).
- **AAC.** `afconvert -f m4af -d aac -b 128000`. It reports 2112 priming frames and pads the last frame; ffmpeg-based decoders keep that padding (620 extra samples on a 5 s test file), which would be a gap at a loop's wrap. Every file is therefore 1024 k + 960 samples long, which leaves no end padding: CoreAudio and ffmpeg both decode each file to exactly its source length, with the same samples (they differ by less than 1e-6).

Measured on the decoded `.m4a` files. A wrap or join step is the difference between the 250 ms either side of it, in 1/3-octave bands that carry sound; the baseline is the same step between neighbouring windows elsewhere in the loop, so a step inside the baseline is no seam:

| Loop | Loudness range | True peak | Wrap level step | Wrap spectral step (baseline median / max) | Joins' spectral steps | Swell (5th–95th percentile of 100 ms levels) |
| --- | --- | --- | --- | --- | --- | --- |
| `roar-1` | 2.0 LU | −9.2 dBTP | +0.3 dB | 1.7 dB (2.3 / 3.4) | 2.4, 2.0 dB | 3.6 dB |
| `roar-2` | 1.1 LU | −6.0 dBTP | −0.3 dB | 2.5 dB (2.1 / 3.6) | 2.9, 2.7 dB | 4.7 dB |
| `distant-1` | 1.8 LU | −9.6 dBTP | −0.2 dB | 2.5 dB (2.4 / 3.8) | 2.4, 2.3 dB | 5.6 dB |
| `distant-2` | 1.1 LU | −9.0 dBTP | −0.6 dB | 2.3 dB (2.1 / 4.0) | 2.3, 3.8 dB | 3.4 dB |
| `bubbles-1` | 1.5 LU | −1.3 dBTP | +1.1 dB | 4.6 dB (5.6 / 9.1) | 7.5, 5.9 dB | 8.8 dB |
| `bubbles-2` | 0.5 LU | −4.0 dBTP | +2.9 dB | 6.8 dB (5.9 / 12.7) | 5.3, 9.3 dB | 7.0 dB |

The bubbles are crackle and gurgle, so their windows differ more from one another anywhere in the file (a baseline median of 5.6–5.9 dB against 2.1–2.4 for the roar and distant loops). The largest jump between neighbouring samples within 3 ms of each wrap is beaten by 34–88 % of the file's other 6 ms windows, so the wrap is never the sharpest spot in its file: no click.

Known limits:
- **Nothing was heard.** The picks, the gains and the claims above come from spectrograms and numbers. The sound check lets the owner hear both candidates of each sound.
- **A loop repeats every 8.10 s** and joins only two takes. If the repeat is audible, join more takes (the tool makes at most 5 s per take).
- **Bubbles underwater.** The game's underwater muffle (400 Hz) removes most of what is above 500 Hz, so `bubbles-1`'s crackle (0.5–4 kHz) is heard only in the sound check; `bubbles-2`, whose energy is all below 500 Hz, was picked for that reason.
- **Clipped source.** The generator clipped a few samples of three used takes at full scale before processing: 27 in `roar-2`, 14 in `lipJet-1`, 42 in `plunge-2`.
- **Mono.** The positional sounds are down-mixed to mono by their panners anyway; `distant` and `bubbles` play centred, as their synthesised versions do.

## Code (C1)

- **The Steam Controller decoder** (`src/game/steam/tritonProtocol.ts`) is a port of SDL's driver for the 2026 Steam Controller. It covers the state report's layout, the button bits, the report IDs and the lizard-mode command.
  - Source: [SDL](https://github.com/libsdl-org/SDL) `src/joystick/hidapi/SDL_hidapi_steam_triton.c` and `src/joystick/hidapi/steam/controller_structs.h`.
  - Copyright Sam Lantinga and Valve, **zlib licence**. The licence asks only that the origin is not misrepresented and that altered versions are marked as such; the port says both in its header.
- **Report notes** from [SteamlessController](https://github.com/ddeverill/SteamlessController) (`src/steam/SteamController.h`) confirmed the View and Menu bits, the product IDs and the fallback mapping commands. No code was copied from it.

## How to rebuild

- **Skies:** `npm run assets:skies`. It needs the network and macOS `sips`, and downloads into `scripts/assets/.cache/` (git-ignored).
- **Surfers:** `npm run assets:surfers`.
  - It needs Blender 5.2 at `/Applications/Blender.app` with the MPFB extension enabled (`Blender --online-mode --command extension install --enable mpfb`).
  - The first run downloads the 267 MB CC0 asset pack into `scripts/assets/.cache/` and installs it into MPFB's user data.
  - Rebuild some surfers only with `Blender --background --python scripts/assets/build_surfers.py -- surfer1 surfer2`, then `node scripts/assets/pack-surfers.mjs`.
  - The npm gltfpack has no texture codecs, so Blender writes the WebP textures and gltfpack compresses only the geometry.
- **Sounds:** nothing rebuilds them (see Sounds). To add or replace one, generate takes the same way, process them as described there, put the `.m4a` in `public/assets/audio/`, and list it in `sounds.json` and in this file. `npx vitest run src/audio` fails if the manifest lists a missing file, ships an unlisted one, or names a licence the game would drop.
