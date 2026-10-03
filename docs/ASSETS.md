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

Every file is AAC (`.m4a`, a 128 kb/s target, mono, 44.1 kHz), 1.7 MB for the fourteen. The manifest picks one candidate per sound and sets a gain. Both are **provisional**: they come from measurements and spectrograms, not from listening, and the sound check (Wave Lab, ♪ Sound) and the listening playtest are where they get settled. A gain matches the picked recording's loudness to the synthesised sound it replaces: integrated loudness for a loop, the loudest 400 ms for a one-shot.

**Second pass.** The first set was reviewed the same day and rebuilt where it failed. The review found the roar and distant loops Gaussian at the fine scale, statistically like the synthesised noise they replace (detrended kurtosis 2.9–3.3), with `roar-1`'s spectrum nearly flat and `distant-2`'s close to `roar-1`'s; the generator's lines left in the quiet takes; a loop marker at a join and a single-pitched 2 kHz whistle in the underwater loops; and clipped source takes and stray clicks in some one-shots. The six loops and four one-shots below were rebuilt from 119 new takes (37 used); `lipJet-2`, `lipRoller-1`, `lipRoller-2` and `paddle-1` are the first pass's files, unchanged.

**Loops** (16.00 s = 705,472 samples, −23.0 LUFS). Each is a ring of four 5 s takes, because the tool makes at most 5 s at a time, and five prompts make them:

| Prompt | Text |
| --- | --- |
| A, surf bed | Close field recording at the water's edge of heavy surf on a shallow sandbar: continuous churning white-water with dense crackling, popping foam and spray droplets pattering, a deep rolling surge underneath, sand hissing in the backwash. Real ocean, no music, no tones. |
| B, reef bed | Large ocean waves breaking on an outer reef, heard from the water a hundred metres away: a heavy continuous roar, deep and powerful, with crackling foam and fizzing white-water clearly audible on top of the roar, no distinct crashes, even and relentless. Natural field recording. No music, no voices, no birds, no synthetic tones. |
| C, foam crackle | close-up sea foam fizzing and crackling on wet sand, countless tiny bubbles bursting |
| D, distant surf | Surf breaking on a beach about 500 m away, heard across open sand: a soft continuous low rumble, each wave set slowly surging and receding, no hiss, no close splashes. Natural, no music, no tones. |
| E, bubble cloud | Underwater recording right inside a dense cloud of bubbles just after a wave has crashed overhead: hundreds of bubbles of every size bursting and popping around the microphone at once, a constant rich bubbling and fizzing from deep soft glugs to bright small pops, over a low muffled rumble. Enclosed underwater ambience, no splashes. No music, no voices, no synthetic tones. |

| File | Built from | Picked | Gain |
| --- | --- | --- | --- |
| `roar-1.m4a` | Four takes of A, the close, bright-ish bed (spectral centroid 0.9 kHz), with four takes of C mixed in at −16 dB | yes | 1.14 |
| `roar-2.m4a` | Four takes of B, the heavy outer-reef bed (centroid 0.5 kHz), with four other takes of C at −17 dB | | |
| `distant-1.m4a` | Four takes of D, shaped to a far-off spectrum (centroid 0.2 kHz) | yes | 1.32 |
| `distant-2.m4a` | Four other takes of D, shaped the same way | | |
| `bubbles-1.m4a` | Four takes of E, the brighter ones, with four takes of C at −20 dB as a fine fizz above them | | |
| `bubbles-2.m4a` | Four other takes of E, the deep ones, with the four brighter takes of `bubbles-1` mixed in at −20 dB above 500 Hz | yes | 1.57 |

The first attempt at `roar-2` (its first-pass prompt with "crackling foam and fizzing white-water clearly audible on top of the rumble" in place of "a soft hiss of white-water on top") returned a sub-bass rumble in all four takes: a spectral centroid of 26–44 Hz, and 45–53 dB less energy above 1 kHz than in the whole take. Prompt B replaced it.

**One-shots** (peak −1.0 dBFS once decoded; one take each):

| File | Length | Prompt | Picked | Gain |
| --- | --- | --- | --- | --- |
| `lipJet-1.m4a` | 2.48 s | Close field recording of a heavy ocean wave's thick lip throwing out and plunging onto the water in front of a surf barrel: a deep powerful boom as the lip slams into the water, then an explosion of white-water and a hissing wash fading away. A single impact. Natural. No music, no voices, no synthetic tones. | yes | 1.32 |
| `lipJet-2.m4a` | 2.32 s | Powerful ocean wave crashing down onto a reef pool, recorded from a few metres away: a heavy slap and low thud, a burst of splashing spray and rolling white-water that tails off into foam. A single big crash. Natural ocean field recording. No music, no voices, no synthetic tones. | | |
| `lipRoller-1.m4a` | 1.55 s | Field recording of a small ocean wave rolling over and crashing softly in shallow water: a short tumbling whoosh and splash, light foam fizz fading away. A single small wave crash. Natural. No music, no voices, no synthetic tones. | yes | 0.99 |
| `lipRoller-2.m4a` | 1.62 s | A small wave breaking softly on a sandy shore, recorded close: a gentle rolling crash that spills into hissing foam and a soft wash up the sand, quick decay. A single small crash. Natural ocean field recording. No music, no voices, no synthetic tones. | | |
| `paddle-1.m4a` | 0.76 s | Close recording of a surfer's hand paddling a surfboard in the sea: one cupped-hand pull through the water, a quick soft splash and a swish of water, a few droplets after. A single stroke only. Natural. No music, no voices, no synthetic tones. | yes | 1.22 |
| `paddle-2.m4a` | 0.67 s | Single arm paddle stroke on a surfboard in the ocean, close microphone: the hand enters the water with a small splash, pulls with a smooth water swish, droplets patter back. One stroke only. No music, no voices, no synthetic tones. | | |
| `plunge-1.m4a` | 1.41 s | Heavy splash of a person falling into the ocean from a surfboard: a dull body impact on the water, a rush of white-water, then bubbling and a muffled underwater rumble. A single event, close microphone. No voices, no screams, no music, no synthetic tones. | yes | 1.48 |
| `plunge-2.m4a` | 1.25 s | The same prompt as `plunge-1.m4a`, another take. | | |

How they were made (nothing in the repo rebuilds them: the tool has no seed, so a prompt gives a different take each time, and the raw takes are not committed):
- **Generation.** The ElevenLabs Sound Effects tool, 16-bit 44.1 kHz PCM out: two channels, usually nearly identical, folded to mono by averaging. Loops are 5 s takes with the model's `loop` option on; one-shots are 1–3 s without it. 119 takes were generated in the second pass and 37 used, with the four first-pass takes behind the unchanged one-shots. The rest were set aside for a sample at or above −0.1 dBFS (no take used has one), the model changing state inside the take (a 25 dB cliff, a bright 8–14 kHz shelf, a long gap), a persistent whistle, no foam crackle where the prompt asked for it, or because a cleaner take for the same job was in hand. The API key could not read the plan's credit balance (the subscription call is refused for lack of the `user_read` permission), so the cost is not recorded.
- **Every bed take.** Folded to mono, DC removed, high-passed at 40 Hz (4th order, zero-phase: the output carries a lot of energy below 30 Hz) and low-passed (15 kHz for the roars, 5 kHz for `bubbles-1`, 3.5 kHz for `bubbles-2`, and for the distant loops a single-pass 2nd-order low-pass at 2.5 kHz). The generator leaves a forest of narrow lines above 1 kHz, near multiples of 50–200 Hz, strongest in the quiet underwater takes (a comb score of +4.8 to +9.4 dB in the bubble takes used, under +1 dB in the other takes used), and a dotted line near 2 kHz. Every bed take has each bin of its time-averaged spectrum between 600 Hz and 12 kHz that stands more than 3.5 dB over the median of its neighbours (±80 Hz) cut back to within 1.5 dB of it, by a zero-phase curve at the 2.7 Hz bin spacing.
- **Loops.** Four cores of 4.449 s are cut from four takes, at start offsets of 0–0.55 s, and the ring order and offsets are searched to make the four joins meet: level and spectrum over 1 s and 0.25 s windows, a lull inside the blend, an event beside it. Four frequency bands (split at 250, 1000 and 4000 Hz) each have their slow swell reduced by a level ride, its strength per band tuned in a closed loop towards 7.5 dB of 0.5 s-trend surge (7.6 dB for the distant loops). In place of the review's flat 0.4, the strengths came out at 0–0.32 in the roars, 0.47–0.77 in the distant loops, 0–0.95 in `bubbles-1` and 0 in every band of `bubbles-2`. The roar and distant loops land at 6.6–8.0 dB; `bubbles-1`'s two upper bands stay at 8.8–8.9 dB, and `bubbles-2` keeps 4.3–6.3 dB (the table below). The cores' average spectra are moved up to 6 dB towards each other (8 dB for `roar-2`); the roars get a gentle treble roll-off (−4.5 dB at 4 kHz, −8 dB at 8 kHz for `roar-1`); the distant loops are moved onto a distance profile (−13 dB at 1 kHz, −25 dB at 2.5 kHz and −32 dB at 4 kHz under its 100–160 Hz top, anchored at 500–630 Hz). Join levels are matched band by band over 1 s and 0.25 s windows by a slow tilt across each core: at most 5.7 dB at either end of a core in every bed but `roar-2`'s, whose darker takes needed up to 10 dB in its top bands. The cores are joined end to start with 0.45 s equal-power crossfades, which makes a loop with no seam of its own.
- **Layers.** The review suggested a separate crackle loop of another length under the bed, which would need a second sound in the engine. The crackle (C) and the brighter bubbles are instead a second ring built the same way (its join tilts at most 5.7 dB, but up to 9.4 dB in `bubbles-2`), rotated 2.0–2.2 s so its joins fall between the bed's, band-passed (1.2–11 kHz in `roar-1`, 1.2–9 kHz in `roar-2`, 0.5–5 kHz in `bubbles-1`, 0.5–3.5 kHz in `bubbles-2`) and mixed into the same file at the level in the table. In the roars that level keeps the 4 kHz octave about 10 dB under the loudest; the review's −12 dB would put it 8.0 dB under in `roar-1` and 7.3 dB in `roar-2` (measured before encoding), on and past the 8 dB limit. There the layer's gain also follows the bed's slow level, one dB per dB, so the crackle swells and ebbs with the bed. The bed takes are Gaussian at the fine scale although prompt A asks for crackle: built without the layer, both roar beds measure a detrended kurtosis of 3.0–3.2 in all four bands, and the finished roars stay Gaussian in the three lower bands (3.0–3.3). The crackle layer is what puts non-Gaussian texture into the 4–10 kHz band (8.3 and 8.6).
- **Near the joins.** Within 1 s of a bed blend, a lull (a 100 ms level more than 3 dB under its 1 s neighbourhood) is lifted by a smooth gain bump of at most 4.5 dB. Within 0.6 s of one, a peak more than 12.8 dB over its 300 ms RMS is pulled down towards that limit; the decoded files measure 12.8–13.8 dB within 0.5 s of a bed blend (the table below). In the roars every peak in the file is also pulled down towards 15 dB, which leaves 15.1 dB at most.
- **Wrap and loudness.** The loop is circular, so the file starts where the 250 ms windows either side already match in level and spectrum, away from every join, and the start is nudged for the smoothest *decoded* AAC wrap. Loudness is set to −23.0 LUFS (EBU R128 integrated loudness, measured with ffmpeg's `ebur128`) and corrected on the decoded `.m4a` for what AAC moves.
- **One-shots.** One take each, high-passed at 28 Hz and low-passed at 16 kHz (4th order, zero-phase). The head rule (start 4 ms before the 2 ms level first comes within 46 dB of its loudest) trimmed nothing: every take is that loud from its first sample, and three of the second pass's takes start mid-attack (the first sample of `plunge-1`, `plunge-2` and `paddle-2` is 18, 8 and 11 dB under the take's peak). A short fade-in keeps a file from starting on a step: 2 ms in the first pass, 3 ms in the second (6 ms for `plunge-2`). The first pass ends a file 50 ms after the last 25 ms level within 38 dB of the loudest and fades it over 150 ms. The second ends it 60 ms after the 25 ms level first drops 36 dB under the loudest and stays there for 250 ms (38 dB for `paddle-2`) and fades it over 200 ms (150 ms for `paddle-2`); `lipJet-1`'s take ends 0.24 s after its level first drops that far, so the file keeps all of it. The gain is set so the decoded file peaks at −1.0 dBFS (within 0.05 dB: AAC moves the peak by a few tenths). Of the first pass's versions, `lipJet-1` and `plunge-2` came from clipped takes (14 and 42 samples at full scale, in that pass's count), and `plunge-1` and `paddle-2` carried isolated HF spikes (one and two). The four replacements come from takes with no sample at or above −0.1 dBFS, and none of the eight files has an isolated HF spike (above 6 kHz, a sample more than 18 dB over the RMS of the 20 ms around it).
- **AAC.** `afconvert -f m4af -d aac -b 128000`. It reports 2112 priming frames and pads the last frame; ffmpeg-based decoders keep that padding (620 extra samples on a 5 s test file), which would be a gap at a loop's wrap. Every file is therefore 1024 k + 960 samples long, which leaves no end padding: CoreAudio and ffmpeg both decode each file to exactly its source length, with samples that differ by less than 1e-6. They are not bit-identical: rounded to 16 bits, up to a few hundred samples a file differ by one step.

The loops were built to these limits, taken from the review and measured on the decoded files:
- **Roars:** 4–10 kHz detrended kurtosis of 4 or more; the 4 kHz octave at least 8 dB under the loudest octave; 6–9 dB of surge in each of the four bands (60–250, 250–1000, 1–4 kHz, 4–10 kHz); no 100 ms dip deeper than 4 dB under its 1 s neighbourhood.
- **Distant surf:** comb score (mean prominence of the lines at multiples of 200 Hz over that at the midpoints, 1–7 kHz) at most +1 dB; the 4 kHz octave at least 20 dB under the loudest; 6–8 dB of surge per band.
- **Bubbles:** no 100 ms dip deeper than 4 dB within 0.3 s of a blend of the bed; no event more than 14 dB over its 300 ms RMS within 0.5 s of one; the 1 kHz octave within 25 dB of the loudest; comb score at most +1 dB.
- **All:** every join's spectral and level step inside the largest step found between neighbouring windows elsewhere in the same file.

Measured on the decoded `.m4a` files. A wrap or join step is the difference between the 250 ms either side of it, in 1/3-octave bands that carry sound; the baseline is the same step between neighbouring windows elsewhere in the loop (median / largest), so a step inside the baseline is no seam. The surge is the 5th–95th percentile range of the 0.5 s trend of 10 ms levels in each band.

| Loop | Loudness range | True peak | Wrap level step | Wrap spectral step (baseline median / max) | Joins' spectral steps | Surge: 60–250 / 250–1000 / 1–4k / 4–10k Hz |
| --- | --- | --- | --- | --- | --- | --- |
| `roar-1` | 3.3 LU | −5.9 dBTP | −0.2 dB | 1.4 dB (2.5 / 4.5) | 2.2, 2.7, 1.7, 2.5 dB | 7.0 / 7.1 / 7.7 / 7.2 dB |
| `roar-2` | 3.6 LU | −6.6 dBTP | +0.5 dB | 1.5 dB (2.4 / 4.9) | 2.1, 1.9, 2.1, 3.7 dB | 7.4 / 7.3 / 7.0 / 6.6 dB |
| `distant-1` | 4.9 LU | −5.1 dBTP | +0.2 dB | 1.5 dB (2.7 / 4.0) | 2.8, 3.8, 2.7, 3.2 dB | 7.5 / 7.8 / 7.5 / 7.6 dB |
| `distant-2` | 4.8 LU | −6.6 dBTP | +1.2 dB | 1.9 dB (2.8 / 4.9) | 2.3, 4.2, 1.8, 2.5 dB | 8.0 / 7.3 / 7.6 / 7.5 dB |
| `bubbles-1` | 4.6 LU | −3.3 dBTP | −0.2 dB | 2.6 dB (4.3 / 7.3) | 4.4, 5.2, 4.1, 5.8 dB | 6.9 / 7.4 / 8.8 / 8.9 dB |
| `bubbles-2` | 1.6 LU | −4.1 dBTP | +1.7 dB | 2.8 dB (4.9 / 8.7) | 3.1, 4.1, 5.2, 3.7 dB | 5.9 / 6.3 / 6.1 / 4.3 dB |

Octave levels, kurtosis (n/m: not meaningful, the 4–10 kHz band holds only the noise floor) and the gates near the joins:

| Loop | 4 kHz octave under the loudest | 1 kHz octave under the loudest | 4–10 kHz kurtosis | Comb score | Deepest 100 ms dip | Worst dip within 0.3 s of a bed blend | Highest event within 0.5 s of a bed blend |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `roar-1` | 9.9 dB | 1.0 dB | 8.3 | 0.0 dB | −1.7 dB | −1.4 dB | 12.9 dB |
| `roar-2` | 10.4 dB | 5.2 dB | 8.6 | +0.3 dB | −1.9 dB | −1.8 dB | 12.8 dB |
| `distant-1` | 30.8 dB | 12.7 dB | 3.1 | +0.3 dB | −3.3 dB | −3.1 dB | 13.4 dB |
| `distant-2` | 30.4 dB | 12.2 dB | 3.1 | +0.2 dB | −2.9 dB | −2.6 dB | 12.9 dB |
| `bubbles-1` | 18.5 dB | 16.2 dB | 7.2 | +0.3 dB | −4.8 dB | −3.2 dB | 13.8 dB |
| `bubbles-2` | 64.7 dB | 23.1 dB | n/m | +0.3 dB | −6.6 dB | −3.7 dB | 12.9 dB |

The gates count the bed's blends. A layer's own blends, 16–20 dB down, sit about midway between them, in the stretches that were not levelled, and the bubbles' deepest dips (−4.8 and −6.6 dB) happen to fall within 0.3 s of them.

The tonal check (peaks over the ±60 Hz median in a 16 s average) finds none above 4 dB on five of the six loops, and one on `bubbles-1`: 5.0 dB at 3.4 kHz in the 16 s average, up to 10 dB in 1 s windows over about 2.5 s, the line itself 25 dB under the top of the spectrum. The largest jump between neighbouring samples within 3 ms of each wrap is beaten by 74–99 % of the file's other 6 ms windows, so the wrap is never the sharpest spot in its file: no click. The wrap gets a lull repair and a peak tamer like a blend's: within 0.3 s of it the worst dip is −3.2 to −0.8 dB, and within 0.5 s the highest event is 10.9–13.2 dB over its 300 ms RMS.

Known limits:
- **Nothing was heard.** The picks, the gains and the claims above come from spectrograms and numbers. The sound check lets the owner hear both candidates of each sound.
- **A loop repeats every 16.00 s** and joins four takes. If the repeat is audible, join more takes (the tool makes at most 5 s per take).
- **The layers are mixed into the files.** The crackle and the fizz cannot be balanced against the bed at run time; changing them means rebuilding the loop.
- **`bubbles-2` has the least surge** (4.3–6.3 dB per band), with its level ride off in every band. The game's underwater muffle (a 400 Hz low-pass: −15 dB at 1 kHz, −28 dB at 2 kHz) puts the fizz and the brighter takes of both bubbles loops far down, so they are heard mostly in the sound check.
- **The roar beds are Gaussian** in the three lower bands; only the 4–10 kHz band carries crackle.
- **The bubbles keep their gaps.** Between glugs a 100 ms level can fall 4.8 dB (`bubbles-1`) or 6.6 dB (`bubbles-2`) under its surroundings; only the zones around the bed's blends and the wrap were levelled.
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
