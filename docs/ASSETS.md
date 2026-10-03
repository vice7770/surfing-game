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

Fourteen recordings, two candidates for each of seven sounds (roar, distant surf, bubbles, the two lip crashes, the paddle splash and the plunge), **generated with ElevenLabs Sound Effects on 2026-10-03**. The owner chose generated recordings over CC0 downloads that day. They are not CC0: they are used under the owner's ElevenLabs plan, and `public/assets/audio/sounds.json` records them with the licence `generated`. The plan's tier and terms are not written down here: confirm they cover a shipped game, and whether they ask for credit, before release. (The only hint of the tier is that the generator served 44.1 kHz PCM, which the tool's documentation reserves for the Pro tier and above.)

Wind, rush, rail, the pop-up, the click, the chime, the leash snap, the knock and the duck-dive stay synthesised. Every sound keeps its synthesised fallback (`src/audio/synth.ts`), used until its recording loads or if it fails.

Every file is AAC (`.m4a`, a 128 kb/s target, mono, 44.1 kHz), 2.0 MB for the fourteen. The manifest picks one candidate per sound and sets a gain, and a candidate may carry a `level` of its own (below). All three are **provisional**: they come from measurements and spectrograms, not from listening, and the sound check (Wave Lab, ♪ Sound) and the listening playtest are where they get settled. A gain matches the picked recording's loudness to the synthesised sound it replaces: integrated loudness for a loop, the loudest 400 ms for a one-shot.

**Second pass.** The first set was reviewed the same day and rebuilt where it failed. The review found the roar and distant loops Gaussian at the fine scale, statistically like the synthesised noise they replace (detrended kurtosis 2.9–3.3), with `roar-1`'s spectrum nearly flat and `distant-2`'s close to `roar-1`'s; the generator's lines left in the quiet takes; a loop marker at a join and a single-pitched 2 kHz whistle in the underwater loops; and clipped source takes and stray clicks in some one-shots. The six loops and four one-shots were rebuilt from 119 new takes (37 used); `lipJet-2`, `lipRoller-1`, `lipRoller-2` and `paddle-1` are the first pass's files, unchanged.

**Third pass.** A second review of the rebuilt set found:
- the roars still Gaussian below 4 kHz (1–4 kHz kurtosis 3.04 and 3.26, 10 ms micro-variation 1.13 and 1.17 dB, where white noise reads about 0.8), with the picked roar's 63 Hz octave 22 dB under its 500 Hz octave;
- every loop a ring of four 4.5 s chunks, because the tool stops at 5 s, so the surge pattern repeats every 16 s;
- a 3.4 kHz whistle and a brick-wall low-pass in `bubbles-1`, a 7 dB hole, pings and a brick-wall low-pass in `bubbles-2`, and the two `distant` loops almost the same sound, mono, played centred;
- in the one-shots, a ring and a tick in `lipJet-1`, bodies that arrive 0.3–0.4 s late in `lipJet-2`, `lipRoller-1` and `lipRoller-2`, bloops in both paddles, a sub-kick in `plunge-1`, and truncated heads in `paddle-2` and `plunge-2`;
- one file per sound, replayed as often as every 0.18 s (lip jets), 0.25 s (rollers) or 0.45 s (strokes), and the two candidates of a one-shot 2.2–3.8 dB apart in loudness.

It asked for single 30 s takes made through the API, pools of short one-shots played in turn, the bubbles kept out of the underwater muffle, and a treble roll-off with distance. **This pass did the two roars and the code, and nothing else.** After 132 takes (33,289 credits by the API's own per-request cost) the API refused the next 34 requests with `quota_exceeded` (a quota of 90,000 credits, none left), so the other twelve files are the second pass's, unchanged. Their regeneration is outstanding (see Known limits).

What changed in the engine the same day (`src/audio` and the sound check):
- **Pools.** A candidate may list `variants`, more recordings of the same sound. `SoundBank` loads every file of the chosen candidate and hands them out in turn, shuffled, never the same one twice running; each shot also gets a little pitch and level jitter, up to ±1 semitone and ±1.5 dB for `lipJet`, ±1 semitone for `lipRoller`, ±1.5 semitones and ±1.5 dB for `paddle` (the review's figures, provisional). No candidate is a pool yet.
- **Candidate level.** The four second candidates are matched to the first on the loudest 400 ms (EBU R128 momentary maximum, measured with ffmpeg): `lipJet-2` −3.42 dB (level 0.67), `lipRoller-2` +2.15 dB (1.28), `paddle-2` +3.19 dB (1.44), `plunge-2` +3.79 dB (1.55). The sound check plays a candidate at its sound's gain times its level, so its A/B no longer favours the louder file.
- **Bubbles outside the muffle.** The bubbles are made under water, so they reach Master by a path at the Sea level that skips the 400 Hz low-pass; the muffle colours only what the camera hears through the surface.
- **Air.** Every positional sound passes a 12 dB/octave low-pass whose cutoff falls with its distance from the camera: 18 kHz within 8 m, 4.5 kHz at 100 m, 2.4 kHz at 300 m, 1.2 kHz at 1 km, never below 900 Hz. The shape follows air absorption (ISO 9613-1: of the order of 5 dB/km at 1 kHz and 25 dB/km at 4 kHz in mild, humid air); the constants are provisional.
- **Chrome.** Chrome 154 (headless) decodes all fourteen files to exactly their lengths (`decodeAudioData`: 1,146,816 and 1,058,752 samples for the roars, 705,472 for the other loops, 29,632–109,504 for the one-shots), with the same RMS and peak as ffmpeg to 0.01 dB. Firefox was not available to try.

**Loops** (−23.0 LUFS integrated, measured on the decoded file). `roar-1` is 26.00 s = 1,146,816 samples and `roar-2` 24.01 s = 1,058,752, each one 30 s take; the distant and bubbles loops are still the second pass's 16.00 s = 705,472 samples, each a ring of four 5 s takes. Prompts:

| Prompt | Text |
| --- | --- |
| C, foam crackle (`bubbles-1`'s layer) | close-up sea foam fizzing and crackling on wet sand, countless tiny bubbles bursting |
| D, distant surf | Surf breaking on a beach about 500 m away, heard across open sand: a soft continuous low rumble, each wave set slowly surging and receding, no hiss, no close splashes. Natural, no music, no tones. |
| E, bubble cloud | Underwater recording right inside a dense cloud of bubbles just after a wave has crashed overhead: hundreds of bubbles of every size bursting and popping around the microphone at once, a constant rich bubbling and fizzing from deep soft glugs to bright small pops, over a low muffled rumble. Enclosed underwater ambience, no splashes. No music, no voices, no synthetic tones. |
| F, shore-break roar (`roar-1`) | Waves collapsing in the shore break all around me, a continuous roar of heavy white-water with water slapping, splashing and sloshing against my legs, foam crackling, and a deep rumbling thump under it all. Continuous, no single crash louder than the rest. Real ocean field recording, no music, no tones. |
| G, outer-reef roar (`roar-2`) | Large waves breaking on an outer reef heard from the water about 100 m away: deep heavy thunder of each wave collapsing, a constant low sub-bass rumble felt in the chest, rolling into a long churning roar with white-water slapping, splashing and fizzing clearly in the mids, continuous, no single crash louder than the rest. Real ocean field recording, no music, no tones. |

| File | Built from | Picked | Gain |
| --- | --- | --- | --- |
| `roar-1.m4a` | One take of F, the third of ten at `prompt_influence` 0.85: 27.0 s of it, from 1.75 s in, as a 26.00 s ring (spectral centroid 1.27 kHz) | yes | 1.14 |
| `roar-2.m4a` | One take of G, the first of four at 0.85: 25.0 s of it, from 0.25 s in, as a 24.01 s ring (centroid 0.71 kHz) | | |
| `distant-1.m4a` | Four takes of D, shaped to a far-off spectrum (centroid 0.2 kHz) | yes | 1.32 |
| `distant-2.m4a` | Four other takes of D, shaped the same way | | |
| `bubbles-1.m4a` | Four takes of E, the brighter ones, with four takes of C at −20 dB as a fine fizz above them | | |
| `bubbles-2.m4a` | Four other takes of E, the deep ones, with the four brighter takes of `bubbles-1` mixed in at −20 dB above 500 Hz | yes | 1.57 |

The roars keep the previous roars' gain: both are −23.0 LUFS, like the files they replace.

**One-shots** (peak −1.0 dBFS once decoded; one take each; a second candidate's level is its loudness match to the first, above):

| File | Length | Prompt | Picked | Gain | Level |
| --- | --- | --- | --- | --- | --- |
| `lipJet-1.m4a` | 2.48 s | Close field recording of a heavy ocean wave's thick lip throwing out and plunging onto the water in front of a surf barrel: a deep powerful boom as the lip slams into the water, then an explosion of white-water and a hissing wash fading away. A single impact. Natural. No music, no voices, no synthetic tones. | yes | 1.32 | |
| `lipJet-2.m4a` | 2.32 s | Powerful ocean wave crashing down onto a reef pool, recorded from a few metres away: a heavy slap and low thud, a burst of splashing spray and rolling white-water that tails off into foam. A single big crash. Natural ocean field recording. No music, no voices, no synthetic tones. | | | 0.67 |
| `lipRoller-1.m4a` | 1.55 s | Field recording of a small ocean wave rolling over and crashing softly in shallow water: a short tumbling whoosh and splash, light foam fizz fading away. A single small wave crash. Natural. No music, no voices, no synthetic tones. | yes | 0.99 | |
| `lipRoller-2.m4a` | 1.62 s | A small wave breaking softly on a sandy shore, recorded close: a gentle rolling crash that spills into hissing foam and a soft wash up the sand, quick decay. A single small crash. Natural ocean field recording. No music, no voices, no synthetic tones. | | | 1.28 |
| `paddle-1.m4a` | 0.76 s | Close recording of a surfer's hand paddling a surfboard in the sea: one cupped-hand pull through the water, a quick soft splash and a swish of water, a few droplets after. A single stroke only. Natural. No music, no voices, no synthetic tones. | yes | 1.22 | |
| `paddle-2.m4a` | 0.67 s | Single arm paddle stroke on a surfboard in the ocean, close microphone: the hand enters the water with a small splash, pulls with a smooth water swish, droplets patter back. One stroke only. No music, no voices, no synthetic tones. | | | 1.44 |
| `plunge-1.m4a` | 1.41 s | Heavy splash of a person falling into the ocean from a surfboard: a dull body impact on the water, a rush of white-water, then bubbling and a muffled underwater rumble. A single event, close microphone. No voices, no screams, no music, no synthetic tones. | yes | 1.48 | |
| `plunge-2.m4a` | 1.25 s | The same prompt as `plunge-1.m4a`, another take. | | | 1.55 |

How they were made (nothing in the repo rebuilds them: the API has no seed, so a prompt gives a different take each time, and the raw takes are not committed):
- **Generation.** The first two passes used the ElevenLabs Sound Effects tool: 16-bit 44.1 kHz PCM out, loops as 5 s takes with the model's `loop` option on, one-shots of 1–3 s without it. 152 takes were generated in them (33, then 119) for the 41 takes used (37 new, and four first-pass takes behind the unchanged one-shots). Takes were set aside for a sample at or above −0.1 dBFS (no take used has one), the model changing state inside the take (a 25 dB cliff, a bright 8–14 kHz shelf, a long gap), a persistent whistle, no foam crackle where the prompt asked for it, or because a cleaner take for the same job was in hand. The third pass called the API directly (`POST /v1/sound-generation`, model `eleven_text_to_sound_v2`, `loop` on, `pcm_44100`): the tool has no model, influence or length control past 5 s. It generated 132 takes: 96 of 30 s for the roars over 14 wordings of the two roar prompts at `prompt_influence` 0.6 and 0.85, one 30 s distant take, 34 of 12 s to try wordings, and one 1.2 s lip crash. The API's cost header reads 301 credits for a 30 s take and 12 for 1.2 s (about 10 credits a second); the 132 takes cost 33,289. The key cannot read the plan's credit balance (the subscription call is refused for lack of the `user_read` permission).
- **The two channels.** The model returns two channels. Of the 96 roar takes of 30 s, 63 are dual mono (left/right correlation above 0.99) and 33 differ (correlation 0.32–0.96). The ones that differ come from two kinds of wording: an outer reef heard from a distance (25 of its 46 takes) and a "wide, relentless" unbroken surf zone (all 8); none of the other 42, which put the listener in the surf, does. The two roars are dual mono (0.996 and 0.998), folded to one channel by averaging.
- **Roars.** Each is one 30 s take with a 1.0 s equal-power crossfade of its last second into its first, a 30 Hz high-pass (second order, run forwards and backwards: 24 dB/octave, −6 dB at 30 Hz) and a rotation that puts the wrap at the median level (the wrap sits +0.6 dB and +0.8 dB re the median of the 0.5 s levels, and −0.1 dB and −5.7 dB re the median of the 2–6 kHz against 100–500 Hz balance, the review's two checks of a wrap); there is no layer, no band-passed level ride and no spectrum shaping, and the gain is set only to −23.0 LUFS on the decoded file. The review's own prompts (a stereo recording standing waist-deep in heavy surf, and an outer reef 100 m away, both at influence 0.6) failed its texture gates in all twelve tries: 1–4 kHz kurtosis 3.05–3.42 and micro-variation 1.11–1.54 dB, and for the reef prompt a 63 Hz octave 12–35 dB under the loudest. So the roars come from rewordings (prompts F and G, above, at influence 0.85), picked by the review's gates, measured on the finished ring: 1–4 kHz kurtosis of at least 3.6 and micro-variation of at least 1.8 dB, the 63 Hz octave within 10 dB (`roar-1`) or 4 dB (`roar-2`) of the loudest octave. The gates alone do not make a roar. Of the 96 takes, 26 pass the two texture gates, and 16 of those have the 63 Hz octave within 10 dB; but eight of the 26 are sub-bass drones (spectral centroid 59–100 Hz; the wordings that asked for "a constant sub-bass rumble"), two are a 4 kHz hiss over a rumble, four (an "unbroken" wording) are sub-heavy with sparse splashes (centroid 224–701 Hz; the spectrogram of one shows a sub-bass slab with patches of splashes above 800 Hz and a hole between), and one changed scene three times in 26 s. The other eleven are shore-break takes, and only one of them, the pick for `roar-1`, has the weight (another reads 10.3 dB). The spectrograms found all that. `roar-2` is the closest take to its gates that looks and measures like surf: as a whole the take reads 1.76 dB of micro-variation against the gate's 1.8, and the 24 s ring cut from it reads 1.88 (the 26 s ring first tried read 1.81, too close to the gate to trust).
- **Every distant and bubbles bed take.** Folded to mono, DC removed, high-passed at 40 Hz (4th order, zero-phase: the output carries a lot of energy below 30 Hz) and low-passed (5 kHz for `bubbles-1`, 3.5 kHz for `bubbles-2`, and for the distant loops a single-pass 2nd-order low-pass at 2.5 kHz). The generator leaves a forest of narrow lines above 1 kHz, near multiples of 50–200 Hz, strongest in the quiet underwater takes (a comb score of +4.8 to +9.4 dB in the bubble takes used, under +1 dB in the other takes used), and a dotted line near 2 kHz. Every bed take has each bin of its time-averaged spectrum between 600 Hz and 12 kHz that stands more than 3.5 dB over the median of its neighbours (±80 Hz) cut back to within 1.5 dB of it, by a zero-phase curve at the 2.7 Hz bin spacing.
- **Distant and bubbles loops.** Four cores of 4.449 s are cut from four takes, at start offsets of 0–0.55 s, and the ring order and offsets are searched to make the four joins meet: level and spectrum over 1 s and 0.25 s windows, a lull inside the blend, an event beside it. Four frequency bands (split at 250, 1000 and 4000 Hz) each have their slow swell reduced by a level ride, its strength per band tuned in a closed loop towards 7.5 dB of 0.5 s-trend surge (7.6 dB for the distant loops). In place of the review's flat 0.4, the strengths came out at 0.47–0.77 in the distant loops, 0–0.95 in `bubbles-1` and 0 in every band of `bubbles-2`. The distant loops land at 7.3–8.0 dB; `bubbles-1`'s two upper bands stay at 8.8–8.9 dB, and `bubbles-2` keeps 5.9–6.3 dB in the bands that carry sound (the table below). The cores' average spectra are moved up to 6 dB towards each other; the distant loops are moved onto a distance profile (−13 dB at 1 kHz, −25 dB at 2.5 kHz and −32 dB at 4 kHz under its 100–160 Hz top, anchored at 500–630 Hz). Join levels are matched band by band over 1 s and 0.25 s windows by a slow tilt across each core: at most 5.7 dB at either end of a core. The cores are joined end to start with 0.45 s equal-power crossfades, which makes a loop with no seam of its own.
- **Layers.** The review suggested a separate crackle loop of another length under the bed, which would need a second sound in the engine. The crackle (C) in `bubbles-1` and the brighter bubbles in `bubbles-2` are instead a second ring built the same way (its join tilts at most 5.7 dB in `bubbles-1`, 9.4 dB in `bubbles-2`), rotated 2.0 s so its joins fall between the bed's, band-passed (0.5–5 kHz in `bubbles-1`, 0.5–3.5 kHz in `bubbles-2`) and mixed into the same file at −20 dB. The third pass's review traced `bubbles-1`'s 3.4 kHz whistle to this layer.
- **Near the joins (distant and bubbles).** Within 1 s of a bed blend, a lull (a 100 ms level more than 3 dB under its 1 s neighbourhood) is lifted by a smooth gain bump of at most 4.5 dB. Within 0.6 s of one, a peak more than 12.8 dB over its 300 ms RMS is pulled down towards that limit; the decoded files measure 12.9–13.8 dB within 0.5 s of a bed blend (the table below).
- **Wrap and loudness.** A loop is circular, so it starts where the 250 ms windows either side already match in level and spectrum, away from every join, and the distant and bubbles loops' start is nudged for the smoothest *decoded* AAC wrap. Loudness is set to −23.0 LUFS (EBU R128 integrated loudness, measured with ffmpeg's `ebur128`) and corrected on the decoded `.m4a` for what AAC moves.
- **One-shots.** One take each, high-passed at 28 Hz and low-passed at 16 kHz (4th order, zero-phase). The head rule (start 4 ms before the 2 ms level first comes within 46 dB of its loudest) trimmed nothing: every take is that loud from its first sample, and three of the second pass's takes start mid-attack (the first sample of `plunge-1`, `plunge-2` and `paddle-2` is 18, 8 and 11 dB under the take's peak). A short fade-in keeps a file from starting on a step: 2 ms in the first pass, 3 ms in the second (6 ms for `plunge-2`). The first pass ends a file 50 ms after the last 25 ms level within 38 dB of the loudest and fades it over 150 ms. The second ends it 60 ms after the 25 ms level first drops 36 dB under the loudest and stays there for 250 ms (38 dB for `paddle-2`) and fades it over 200 ms (150 ms for `paddle-2`); `lipJet-1`'s take ends 0.24 s after its level first drops that far, so the file keeps all of it. The gain is set so the decoded file peaks at −1.0 dBFS (within 0.06 dB: AAC moves the peak by a few tenths). Of the first pass's versions, `lipJet-1` and `plunge-2` came from clipped takes (14 and 42 samples at full scale, in that pass's count), and `plunge-1` and `paddle-2` carried isolated HF spikes (one and two). The four replacements come from takes with no sample at or above −0.1 dBFS, and none of the eight files has an isolated HF spike (above 6 kHz, a sample more than 18 dB over the RMS of the 20 ms around it).
- **AAC.** `afconvert -f m4af -d aac -b 128000`. It reports 2112 priming frames and pads the last frame; ffmpeg-based decoders keep that padding (620 extra samples on a 5 s test file), which would be a gap at a loop's wrap. Every file is therefore 1024 k + 960 samples long, which leaves no end padding: CoreAudio and ffmpeg both decode each file to exactly its source length, with samples that differ by less than 1e-6. They are not bit-identical: rounded to 16 bits, up to a few hundred samples a file differ by one step. `roar-1` is 1024 × 1119 + 960 = 1,146,816 samples, `roar-2` 1024 × 1033 + 960 = 1,058,752.

**The roars**, measured on the decoded `.m4a` files with the review's own functions. A wrap step is the difference between the 250 ms either side of the wrap; the baseline is the same step between neighbouring windows elsewhere in the loop (95th percentile / largest for level, median / largest for spectrum). The click rank is the share of the file's other 6 ms windows whose largest jump between neighbouring samples is bigger than the wrap's.

| Roar | Length | Loudness / range / true peak | 1–4 kHz kurtosis, micro-variation | 4–10 kHz kurtosis | 63 Hz octave under the loudest | Octaves 125 Hz / 4 kHz / 8 kHz under the loudest |
| --- | --- | --- | --- | --- | --- | --- |
| `roar-1` | 26.00 s | −23.0 LUFS / 6.0 LU / −6.9 dBTP | 4.43, 2.16 dB | 4.63 | 8.9 dB | 2.2 / 7.6 / 7.3 dB |
| `roar-2` | 24.01 s | −23.0 LUFS / 18.3 LU / −5.5 dBTP | 3.97, 1.88 dB | 3.65 | 2.7 dB | 1.1 / 9.0 / 12.4 dB |

| Roar | Wrap level vs the median of the 0.5 s levels | Wrap level step (baseline 95th / largest) | Wrap spectral step (baseline median / largest) | Click rank | Deepest 0.5 s level | Time more than 4 dB under the median |
| --- | --- | --- | --- | --- | --- | --- |
| `roar-1` | +0.6 dB | −2.6 dB (8.5 / 12.6) | 3.8 dB (4.1 / 15.7) | 44.4 % | −16.3 dB | 8.9 s of 26 |
| `roar-2` | +0.8 dB | −0.4 dB (5.9 / 18.3) | 2.0 dB (3.0 / 19.9) | 45.2 % | −14.9 dB | 9.4 s of 24 |

- **Lines.** Above 400 Hz the roars have about as many 8 dB lines of at least 150 ms as phase-randomised copies of themselves: 193 against 139 and a longest of 406 ms against 418 ms in `roar-1`; 161 against 124 and 383 ms against 418 ms in `roar-2`. Between 50 and 400 Hz they have several times as many (49 and 46 against 8 and 17); the longest are 418 ms at 101 Hz (+19 dB) and 685 ms at 95 Hz (+17 dB): the sub-bass thumps are partly tonal. By the letter of the review's gate (no 8 dB line over 150 ms) the roars fail, and so do their phase-randomised copies (124–139 lines), so the comparison with the copies is the one that means something.
- **Surge.** The 0.5 s level trend spans 20.5–25.2 dB (`roar-1`) and 25.2–30.5 dB (`roar-2`) between its 5th and 95th percentiles in each of the four bands (60–250, 250–1000, 1–4 kHz, 4–10 kHz), against 7–8 dB in the second pass. A wave collapses about every 4.5 s in `roar-1` and about every 8 s in `roar-2`, with a lull between (the spectrogram and loop-twice images). The takes that passed the texture gates were the ones that surged; the steady ones (a trend within 10 dB) were Gaussian (kurtosis 3.0–3.4) or were the drones, the hiss and the sub-bass slabs described above.
- **Events.** 57 and 28 peaks stand more than 12 dB over the 300 ms RMS, the highest 18.4 dB and 17.0 dB.
- **Small speakers and the muffle.** Through a small-speaker model (250 Hz high-pass, 12 kHz low-pass) they lose 1.7 and 1.9 dB of integrated loudness (the second pass's roars lost 0.8 and 3.3 dB); through the 400 Hz underwater muffle, 4.2 and 3.6 dB.

The distant and bubbles loops were built to these limits, taken from the second review and measured on the decoded files:
- **Distant surf:** comb score (mean prominence of the lines at multiples of 200 Hz over that at the midpoints, 1–7 kHz) at most +1 dB; the 4 kHz octave at least 20 dB under the loudest; 6–8 dB of surge per band.
- **Bubbles:** no 100 ms dip deeper than 4 dB within 0.3 s of a blend of the bed; no event more than 14 dB over its 300 ms RMS within 0.5 s of one; the 1 kHz octave within 25 dB of the loudest; comb score at most +1 dB.
- **All four:** every join's spectral and level step inside the largest step found between neighbouring windows elsewhere in the same file.

A wrap or join step is the difference between the 250 ms either side of it, in 1/3-octave bands that carry sound; the baseline is the same step between neighbouring windows elsewhere in the loop (median / largest), so a step inside the baseline is no seam. The surge is the 5th–95th percentile range of the 0.5 s trend of 10 ms levels in each band. n/m: not meaningful, the band holds only the noise floor.

| Loop | Loudness range | True peak | Wrap level step | Wrap spectral step (baseline median / max) | Joins' spectral steps | Surge: 60–250 / 250–1000 / 1–4k / 4–10k Hz |
| --- | --- | --- | --- | --- | --- | --- |
| `distant-1` | 4.9 LU | −5.1 dBTP | +0.2 dB | 1.5 dB (2.7 / 4.0) | 2.8, 3.8, 2.7, 3.2 dB | 7.5 / 7.8 / 7.5 / 7.6 dB |
| `distant-2` | 4.8 LU | −6.6 dBTP | +1.2 dB | 1.9 dB (2.8 / 4.9) | 2.3, 4.2, 1.8, 2.5 dB | 8.0 / 7.3 / 7.6 / 7.5 dB |
| `bubbles-1` | 4.6 LU | −3.3 dBTP | −0.2 dB | 2.6 dB (4.3 / 7.3) | 4.4, 5.2, 4.1, 5.8 dB | 6.9 / 7.4 / 8.8 / 8.9 dB |
| `bubbles-2` | 1.6 LU | −4.1 dBTP | +1.7 dB | 2.8 dB (4.9 / 8.7) | 3.1, 4.1, 5.2, 3.7 dB | 5.9 / 6.3 / 6.1 / n/m |

Octave levels, kurtosis and the gates near the joins:

| Loop | 4 kHz octave under the loudest | 1 kHz octave under the loudest | 4–10 kHz kurtosis | Comb score | Deepest 100 ms dip | Worst dip within 0.3 s of a bed blend | Highest event within 0.5 s of a bed blend |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `distant-1` | 30.8 dB | 12.7 dB | 3.1 | +0.3 dB | −3.3 dB | −3.1 dB | 13.4 dB |
| `distant-2` | 30.4 dB | 12.2 dB | 3.1 | +0.2 dB | −2.9 dB | −2.6 dB | 12.9 dB |
| `bubbles-1` | 18.5 dB | 16.2 dB | 7.2 | +0.3 dB | −4.8 dB | −3.2 dB | 13.8 dB |
| `bubbles-2` | 64.7 dB | 23.1 dB | n/m | +0.3 dB | −6.6 dB | −3.7 dB | 12.9 dB |

The gates count the bed's blends. A layer's own blends, 16–20 dB down, sit about midway between them, in the stretches that were not levelled, and the bubbles' deepest dips (−4.8 and −6.6 dB) happen to fall within 0.3 s of them.

The tonal check (peaks over the ±60 Hz median in a 16 s average) finds none above 4 dB on `distant-1`, `distant-2` and `bubbles-2`, and one on `bubbles-1`: 5.0 dB at 3.4 kHz in the 16 s average, up to 10 dB in 1 s windows over about 2.5 s, the line itself 25 dB under the top of the spectrum. The largest jump between neighbouring samples within 3 ms of each wrap is beaten by 81–99 % of the file's other 6 ms windows in the four second-pass loops, so the wrap is never the sharpest spot in its file: no click. (The roars' ranks are in their table.) The wrap gets a lull repair and a peak tamer like a blend's: within 0.3 s of it the worst dip is −3.2 to −1.7 dB, and within 0.5 s the highest event is 10.9–13.2 dB over its 300 ms RMS.

Known limits:
- **Nothing was heard.** The picks, the gains, the levels and the claims above come from spectrograms and numbers. The sound check lets the owner hear both candidates of each sound.
- **The roars pump.** The review's gates are met, but not the review's "continuous, no single crash louder than the rest": `roar-1` has a 6.0 LU loudness range and `roar-2` 18.3 LU (the second pass's roars 3.3 and 3.6), with lulls of 15–16 dB. The game plays a roar as eight sectors at random start points, which should steady the sum; that was not measured. A steadier heavy bed exists among the raw takes (an outer-reef take, as a ring: texture 4.20 and 1.82 dB, a level trend spanning 18–24 dB per band instead of 25–31, a loudness range of 13.8 LU, no lull deeper than 10.5 dB), but its 63 Hz octave is 7.4 dB under the loudest, not within 4.
- **A roar repeats every 26.00 s (`roar-1`) or 24.01 s (`roar-2`),** the other loops every 16.00 s. If a repeat is audible, the distant and bubbles loops can join more takes; a roar cannot be longer than the API's 30 s, so it would need two takes joined.
- **Outstanding from the second review, for want of credits:** the two `distant` loops as single 30 s stereo takes (the second a different character: a reef a kilometre off at night), with left/right correlation 0.2–0.6 and a mono fold-down within 1.5 dB; the two `bubbles` loops as single 30 s takes with no foam layer and a 12 dB/octave low-pass at 6 kHz (`bubbles-1`, its wrap within ±1 dB of the median level) or 4 kHz (`bubbles-2`, no 0.5 s window more than 4 dB under the median); pools of eight 1.0–1.3 s variants for `lipJet`, `lipRoller` and `paddle` (and a different second candidate for each); and six 3 s takes for the two `plunge` candidates. The rejection gates are the review's: a line above +8 dB lasting over 50 ms (lip crashes), above +10 dB over 60 ms (plunge) or 40 ms (paddle, 200 Hz–4 kHz), a first 250 ms dominated by 20–150 Hz, and a head not preceded by silence. None of the 29 earlier one-shot takes in hand passes them all (most start mid-event, many clip, most have lines), and neither does the one new 1.2 s lip-crash take, whose first sample is 18 dB under its peak.
- **The layers are mixed into the files** of `bubbles-1` and `bubbles-2`. The crackle and the fizz cannot be balanced against the bed at run time; changing them means rebuilding the loop.
- **`bubbles-2` has the least surge** (5.9–6.3 dB per band that carries sound; its 4–10 kHz cell, 4.3 dB by the same method, measures only the noise floor), with its level ride off in every band. The bubbles no longer pass the game's underwater muffle (a 400 Hz low-pass: −15 dB at 1 kHz, −28 dB at 2 kHz), so the fizz and the brighter takes are no longer filtered away.
- **The bubbles keep their gaps.** Between glugs a 100 ms level can fall 4.8 dB (`bubbles-1`) or 6.6 dB (`bubbles-2`) under its surroundings; only the zones around the bed's blends and the wrap were levelled.
- **Mono.** The positional sounds are down-mixed to mono by their panners anyway; `distant` and `bubbles` play centred, as their synthesised versions do. The review asked for `distant` in stereo: most of the generator's takes are dual mono (above), so a stereo `distant` needs takes whose channels differ.

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
- **Sounds:** nothing rebuilds them (see Sounds). To add or replace one, generate takes the same way, process them as described there, put the `.m4a` in `public/assets/audio/`, and list it in `sounds.json` and in this file; a one-shot may list `variants` (a pool played in turn) and a `level`. `npx vitest run src/audio` fails if the manifest lists a missing file (a pool's too), ships an unlisted one, or names a licence the game would drop.
