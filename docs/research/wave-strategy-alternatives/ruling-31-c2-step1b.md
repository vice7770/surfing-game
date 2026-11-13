# Advisor ruling 31: C2 step 1b (the library in game code)

Advisor: this session (Opus 5.5, max effort), 2026-11-13. Read: `c2-step1b.md` and its bars run. No run.

1. **Merge it.**
   - L1, L3, L5 and L6 pass. BRL2 is byte-identical, and the encoding is deterministic.
   - The merge checks are clean: suite 348 files, 3373 tests; the Canyon hashes equal.
   - Nothing in the game uses the new code yet.
2. **L4 is close enough.** The 0.527 m crest place before the throw and H about 2 % after it are differences between two runs: T5 against today's case. They are not errors of the new format, which matches T5's own file within 1.3 % and 0.12 m.
3. **L2 misses, because the bed slopes are too far apart for blending.**
   - Predicting b2 from b1 and b3: p90 18–41 cm with the crests aligned at the throw, and H 10–13 %.
   - The pool's slopes sit mostly at 0.055–0.090. **Add slopes 0.055 and 0.085** for the A0 rows 0.25 and 0.355.
   - Linear blending's error falls about with the square of the spacing, so expect about 5–10 cm. **The L2 bar becomes 5 cm at p90.** On a 2 m wave that is about 2.5 %. Neighbour slices still blend smoothly, because the keys change smoothly along the crest.
   - Also test blending in the surf similarity number ξ = slope / √(H/L₀) instead of the raw slope. It tracks the breaker's type more directly [R].
4. **Coverage.** Use the cases' own trough window everywhere: 3 h0, 15 m. With it, 5.6 % of slices fall under the A0 0.15 row. **Add the A0 0.12 row** at the existing slopes. That leaves about 0.6 % under, inside the 2 % bar.
5. **The platform plateau.** On the flat 5 m platform H/d does not change, so it cannot place the clock: 26 % of slices stand there 5 s before their throw.
   - **Each slice hands over at the later of two moments:** 5 s before its predicted throw, or when its crest crosses the reef toe.
   - On the platform, the phase comes from the travel time to the toe, not from H/d.
6. **The late break.**
   - Matched from the sea's own (15–17 % smaller) wave, the cases throw about 1 s later than the sea predicts: about 6 m further in. That is the physical consequence of the smaller incoming wave.
   - Step 6's throw-line bar is measured against the library's own physics, not the sea's prediction.
   - Whether the pool sends a bigger swell, to keep the break where it was and the wave at 2 m, is the owner's call.
7. **Cost (1.5–1.6 ms for 600 slices) and size (17 MB, half of it velocity) are accepted for now.** Step 7 handles them: only the slices near the camera and the riders, a vertex-shader blend, compressed velocity.
8. **The runs to add, on the M1 after the current set** (as the owner chose, level 12):
   - the A0 0.12 row: 3 runs;
   - slopes 0.055 and 0.085 at A0 0.25 and 0.355: 4 runs;
   - ruling 30's three runs at slope 0.105 with HS/h0 0.20.
   That is 10 runs, about 10 h at 3 at once.
9. **Next on the wave track: step 3,** the handover and slices on the pool, drawn and felt. Effort xhigh. It builds on what is here, and refines as the runs land.
