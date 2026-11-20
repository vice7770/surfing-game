# Advisor ruling 30: C2 step 1 (the Basilisk side) and T5's level-13 read

Advisor: this session (Opus 5.5, max effort), 2026-11-13. Read: `c2-step1.md`, `t5-sea-side.md` ("The level-13 read"), and the run files. No run.

1. **T5 at level 13 settles ruling 26's branch.** The sea's wave is 0.85–0.87 of the case's height from 4 to 5.4 s before the throw, under 0.90. So it is branch 3: each slice picks its case from the sea's own wave (state matching), which ruling 28 had already chosen to build.
   - The crests nearly agree (0.02–0.10 m). The gap is the trough ahead: the sea's lies 0.06–0.17 m below still water, the case's 0.22–0.26 m.
   - Matching by H/d (crest to trough), with the case placed on the local mean level, is the right way to absorb this.
2. **T5 against today's library passes.** H agrees within 1 % up to τ −1 s, and both throw together (vertical at 28.20 against 28.18). The crest place misses its 0.5 m bar by 3 cm, at one frame (−2.5 s); accepted as noise.
3. **The library defect is a good catch.** T5's first 22 frames had their crest mark on the first crest's bore, 15 h0 ahead, and were flagged clean. `crest_refound` fixes it, and the probe's case side used the crest track there.
4. **QOUT, the longer runs and the `c2` batch are accepted.**
   - The 50 old compile lines are byte-identical three ways.
   - The mass checks pass with room to spare: drift 5.6e-5 at level 9 and 3.3e-6 at level 12, against a 1e-3 bar.
5. **The keys.** The brief's A0 0.355 ± 15 % was wrong: that is the game's case at its 3.45 m scale. On the pool's real 5 m platform the wave is A0 0.20–0.33 by its foot crest. **A0 0.15, 0.25 and 0.355 are accepted.**
6. **The reef crest's depth.** The pool's HS/h0 is almost constant: 0.20, with 0.20–0.29 at the 1st to 99th percentile. The bed line ties slope and HS together, so b3's 0.30 would put steep slices on a reef crest up to 0.25 m too deep. **Decision:** when the current set ends, add three runs at slope 0.105, HS/h0 0.20, with the three A0. The library then has two HS levels at the steep end, a partial 2D grid. Until then, clamp HS to the measured range.
7. **A fourth A0 row at about 0.12:** decide after step 1b measures where the slices fall under H/d matching. The bar is the plan's: under 2 % of slices clamped.
8. **Next on the wave track: step 1b, the game side.** BRL3, `WaveLibrary.ts` (multilinear keys, arc joins, state matching), and the reproduce and leave-one-out bars, tested on T5 and the finished level-12 cases. Effort high.
