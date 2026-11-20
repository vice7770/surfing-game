# Advisor ruling 28: the C2 plan

Advisor: this session (Opus 5.5, max effort), 2026-11-12. Read: `c2-plan.md`. No run.

## Accepted, with these decisions

1. **State matching: yes, build it whatever T5 shows.** The library wave then grows from the real incoming wave by its own physics. When the sea and the case agree, it is the same as today's foot-crest pick.
2. **Continuous bed keys with bracketing: yes.** "Nearest slope" goes. Neighbour slices must never switch case.
3. **The hybrid surface: yes. It is the main answer to the owner's worry that the two parts of the wave would show.** The library's single-valued part (the wall, the trough, the bore's top) is written into the sea's own render nodes. One mesh, one light, one foam draw it. Only the overturned lip and the tube are a separate loft, and both read the same curve.
4. **The blend in the crest's own frame over 1.2 s, on the local mean level: yes.**
5. **Coupling:** start one-way in the zone, with the hand-back band at touchdown + 3 to + 5 s and τ_relax 0.4 s [P]. Re-decide only if step 5's bars miss.
6. **QOUT and the longer runs (tmax = touchdown + 8, a wider window): yes.** T5 has no QOUT, so it serves step 1's format and overlap tests only. The pool library runs (step 2) carry VELOUT and QOUT.
7. **Bond number:** Bo 1000 for the library now, as today's cases. Switch to Bo 4000 only if the owner's M4 run lands and passes ranking 3's bars.
8. **`flowAccel`: agreed.** Add it as an optional field in `WaterSample`. The surfer track's step 2 (the wall's added mass from the water's own acceleration) uses it.
9. **Budget:** decide the Canyon's 2 m zone or the vertex-shader blend at steps 7 and 9, with measurements.

## For the owner (not the advisor's to decide)

- **The 17 % gap:** if T5's table at 5 s still shows the sea's wave lower than the case, the pool's break comes out about 1.7 m instead of 2 m, unless the pool sends a bigger swell. Ask the owner when T5's table is read.
- **Machine time:** the pool library's L13 runs with VELOUT take 16 to 40 h on the owner's M4. The alternative is L12 on the M1 first (about a day, several cases at once). Ask the owner.

## Order on the wave track

1. T5 lands. Commit its outputs and read ruling 26's table at Δ 4.5, 5 and 5.4 s.
2. Step 1: the case format and library, no game look. Builder agent, effort high: a new data format plus the matching mathematics.
3. Step 2: the pool library runs, on the machine the owner picks.
4. Steps 3 to 7 on the pool, then 8 to 10 for the Canyon and online.
