# Swept barrel: how to build it

This page is advice for the sessions building the swept surface you chose on 2026-09-28. It covers where the 2D profiles should come from, and how to turn them into one drawn and collided barrel in real time.

## Where the profiles come from

**Nothing published is ready to use.** No paper offers downloadable profile sequences that run from a vertical face through impact, splash-up and roller on slopes or reefs. The best source, [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf), shares its code and some output. But its runs stop at jet impact and cover only solitary waves on 1:100–1:10 slopes. Other papers give a few curves in figures, or only sizes and angles. No source gives shapes for the Reef's 1:2.3 forereef.

| Route | What it covers | Effort (estimate) | Catch |
| --- | --- | --- | --- |
| Digitise published figures | 20–40 curves, 1:100–1:10, up to impact | About 1 week | Too few frames per breaker for a smooth clock; no reef ledge; gaps filled by hand |
| Reuse Pick's code and output ([surftank](https://github.com/KelvinHamster/surftank), [Zenodo](https://zenodo.org/records/20725076)) | 1:100–1:10, dense in time | Days, needs MATLAB | Stops at impact; solitary waves only |
| Our own 2D runs in Basilisk | Whole sequence through splash-up, on the game's own beds, any slope, reef crest or swell period | 1–2 weeks of setup, then days to weeks of unattended compute | Run time not yet benchmarked; 2D after impact; lab-scale surface tension |

**Basilisk** is a free water-and-air fluid solver. Every recent 2D study of waves breaking on slopes used it, and its setups are public ([Mostert & Deike's shallow.c](https://basilisk.fr/sandbox/wmostert/shallow.c), [Feddersen's shoal file](http://basilisk.fr/sandbox/ffeddersen/shoal_RE0_BO4000.c)). On the M4 Pro it runs on the CPU only. **The library stays small:** one dimensionless run serves every wave size from 1 to 6 m. About 60–120 runs would span the game (my estimate). Padang Padang's 1:18–1:20 slope sits inside Pick's fits. The Reef is keyed on water depth over the reef crest instead.

**Recommendation: run our own 2D simulations in Basilisk, on the game's own bed transects.** Only this route covers the lip after impact and the Reef's ledge, and it matches how [Mihalef et al. 2004](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf) and [True Surf](https://www.meta.com/blog/true-surf-launch/) built their libraries. Include some periodic swell runs, since one trend reverses between solitary and periodic waves. Start by rerunning the two public setups on the M4 Pro to time them; downloading Basilisk needs your approval. Keep Pick's fits and published measurements for checking the library, not filling it. Digitised curves are fine for a first prototype of the sweep.

## How to build it in real time

The swept surface is cheap: at most about 38k vertices, lofted on the GPU from about 10 KB of new data per frame. The hard parts are a smooth clock, the seam and collision.

- **Front line.** Track the breaking front as one line in the simulation, as [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf) did on a height field. Flag cells that are steep and face forward, trace a line through them, move each point every step, and add or merge points to keep about 1 m spacing. Each point keeps a fixed ID and σ, its distance in metres along the crest, through merges and splits. Textures keyed on σ then stay put. Find each slice's crest with the same 1D peak search `crestTracker.ts` already does. Seed lines deterministically, not randomly, so online players agree.
- **Smooth clock.** Each point carries τ, the time since its face went vertical. Smooth τ along the crest and clamp it so neighbours stay within one library stage (Mihalef's rule). That clamp removes the teeth. It also avoids the collapsed shapes [Surf's Up](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf) saw where time changed fast between neighbours. On a steady peel the open curl should span about 1.3–3.5 H/tan α of crest; the Surf Ranch lidar shows 2.7–3.6 m at H ≈ 2 m ([Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)). Force τ to zero over the last few metres of each end, so slices appear and vanish unseen.
- **Lofting.** Each frame, resample the line every 0.5 m. Look up each slice's profile at its τ, stand it upright along the line's smoothed normal, and join the slices into one grid. Offline, give every profile the same 128 points, with crest, lip tip, throat and toe at fixed indices, so blends match tip to tip. The tube then opens and closes by shape alone: at τ = 0 the lip has zero length. With 64 or more stages, a plain blend of two neighbouring stages is smooth enough. A vertex shader can do it from a profile texture, in both WebGL2 and WebGPU. It replaces today's `LipSheetMesh.ts`.
- **The seam.** Keep two surfaces and cut a hole, as Surf's Up did. Pin the last 4–8 samples of each profile to the height field, sampled exactly as the water mesh draws it. Extend the swept surface 1–2 m past each edge. Each frame, draw its footprint from above into a mask; the water shader skips pixels inside it. In the overlap band, both surfaces use matching dither, so each pixel shows exactly one. Without the hole, the height field's hump fills the tube. Keep the swept surface opaque; use transparency only for spray.
- **Rider collision.** Turn the board's contact points (nose, tail, rails) into wave coordinates: along the crest, across it and up. Rebuild the profile at that point exactly as drawn, close it down to the seabed, and take the signed distance to it. Push the board out along its gradient, and test the rider's head against the lip's underside for wipeouts. After touchdown the library must trim the jet where it meets the face, or inside and outside flip. Board-to-lip speeds reach 15–20 m/s, so check contacts 4 times per step (estimate). Run this in plain float64 TypeScript without `Math.sin` and similar functions, and never read back from the GPU. Every machine then gets the same answer ([Box2D on determinism](https://box2d.org/posts/2024/08/determinism/)).

| Per frame | Size | Cost |
| --- | --- | --- |
| Front line | A few hundred points | Tens of µs (estimate) |
| GPU loft | Up to 38.5k vertices for 150 m of crest | 5–10 KB upload; under 0.1 ms (estimate) |
| CPU loft, fallback | Same | 0.19–0.93 ms on an M1 (measured in Node) |
| Collision | 16 queries per rider | About 50 µs per rider (from a measured 3 µs per query) |
| Seam mask | One small top-down draw | Cheap (estimate) |

No browser upload or GPU times were measured, so time them in the running game before committing.
