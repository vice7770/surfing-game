# Step 7 follow-up, ruling 3: the five open questions (2026-11-05)

The water-physics advisor read main at 9c3ed56b (PR #198 merged). It made no game edits.

**What was run** (scratch copies of `poolTubeFace.probe.test.ts`, nothing in the repo; BODIES_ONLY, CPU, mostly 12 periods, the anchor diagnostic 6):
- **The unchanged copy:** at pool 1.5 m it reproduces the README's numbers exactly (2a 0.317 m, 2b 25.0 %, board flips 757 / 10,941), so the A/Bs compare like with like.
- **A/B 1:** the wall's buoyancy as a static incline (g·n_y along the normal), by mocking `patchForce`.
- **A/B 2:** lone boards placed at rest draft (5 mm) with their water's vertical velocity, at pool and a38, 1.5 m.
- **Traces:** lone boards at 0.3 H_s, step by step (forces, water, the contact's blend).
- **Anchor diagnostic:** the raw shift split per point and step into the solver's crossing and the case's part (pool 1.5 m, 6 periods).
- **A 1D heave model** of a lone board.

Scratch files: `scratchpad/tube-ruling-3/` (`isobar-pool-1.05.txt` A/B 1, `draft-pool-1.05.txt` and `draft-a38-1.05.txt` A/B 2, `diag-pool-1.05.txt` the anchor split, the patched probe copies, the `.bodies` traces and the parsers in `tools/`).

## Ranked changes (boards carried up, not flung or flipped)

| Rank | Change | Q | Switch | Expected (inferred) |
| --- | --- | --- | --- | --- |
| 1 | A smooth wall: read the solver's real trough; track the anchor with an α–β filter; take the wall water's speed from the tracked rate; blend the wall water into the solver's flow | 3, 1 | `?tubeTrack=old` | Water at a body ≤ 1 m/s change a step; fewer flings, and so fewer flips; 4b passes |
| 2 | The water's acceleration on the hull's added mass, in the wall water | 1, 2 | `?tubeInertia=old` | Boards ride up with the face; 2b ≤ 15 %, 2a p99 0.15–0.25 m |
| 3 | The probe places lone boards at rest draft with their water's velocity | 2 | (measure only) | 2b no longer counts its own placement |
| 4 | Contour-thrown lips are not retired for being "unbroken"; the guard stays off | 4 | `?tubeRetire=old` | Lips at full weight to touchdown; meter unchanged |
| 5 | The clamped buoyancy along the true normal (correct sign under overhangs), after 2 | 1 | `?tubeBuoy=old` | Small |
| 6 | In overlaps the lighter strip gives way; holes counted by how visible they are | 5 | `?tubeDrop=old` | Visible holes 0 |

Build 1 before 2. Rank 2 puts the water's acceleration onto 100–180 kg of added mass, so any noise left in the wall water would throw boards.

## 1. The flips

**The cause is not the clamp.**
- I replaced the wall's buoyancy with the static incline, ρgV·n_y along the normal (at most ρgV, about 0 on a vertical face). Every bar got worse: board flips 757 → 1,036 (6.9 → 9.8 %), 2a p99 0.317 → 0.397 m, 2b overrun 25.0 → 29.2 %. Flings were unchanged (31 of 72).
- The physics agrees. At every surface point the pressure gradient is normal to the surface and points inwards (Peregrine, Cokelet & McIver 1980, computed). So the Froude–Krylov force on a body there is ρV·g_n along the outward normal, with g_n = n·(a + g ŷ) ≥ 0.
  - On the steep front just below the crest, the water accelerates faster than g, mostly horizontally: trough water is "accelerated in a relatively short time" to the crest's speed. Accelerations up to (4.3, −2.0) g were reliably computed (deep-water, pressure-forced waves). So there g_n is about 1–4 g.
  - In the falling jet g_n is about 0: the measured jet enters the water at 1.1 g, 88° below horizontal (Chang & Liu 1998, PIV; H 14.5 cm, λ 121 cm, h 20 cm).
  - The as-built ρgV/max(n_y, 0.5) gives 1–2 g along the normal, inside that range. Keep it (provisional).

**The measured causes.**
1. **The wall's water jumps between steps.** At a traced board in the wall, the water's velocity changes by p50 0.3–0.9, p90 1.0–4.0 and p99 3.7–10.8 m/s a step (three runs). In the solver's water the same figures are 0.02–0.03, 0.04–0.11 and 0.3–2.5 m/s. Crossing between the solver's water and the wall's, p90 is 2.9–6.0 m/s.
   - A p90 jump of 2 m/s a step is 12 g, about 2–10× the largest computed accelerations in overturning faces (about 4.7 g).
   - The likely path (inferred from the code and matching sizes): `crashCurve.ts:441` sets `p.wallSpeed = p.anchorRate`, the per-step rate of W. That feeds `wallCarry` and `wall.speed` (`sweptLoft.ts:1166–1167, 1329, 1406`), and from there B·C, the kinematic normal and the climb's bound (`PhysicalSurfWater.ts:929, 940, 949`).
   - 4b's jitter of p99 0.12 m a step is a 7.2 m/s change in that rate.
2. **Most flips happen after a fling.** In the pool 1.5 m traces, 99 of 140 flips came from boards already thrown out of the wall and tumbling rail-down on the solver's surface. At the median they were 17 % submerged with their centre 0.11 m above the surface. All of these were swings of the planing pressure, and a third reversed again the next step. 39 flips touched the wall water.
   - A float pressed by g_n > 0 leaves a face only where the water is in free fall, so flings outside the lip's water are not physical. They come from the jumps in cause 1.

**What the hull should follow:** the water's acceleration plus g, along the nearest surface's normal.
- **Buoyancy:** along that normal, as built, with the clamp's magnitude as a provisional stand-in.
- **Planing pressure:** the hull's own normal and the relative flow, unchanged.
- **The missing part:** the added mass's share of the same acceleration. BoardBody gives "the water's own acceleration … to the hydrostatic slope force" (`BoardBody.ts:89–96`), which covers only the displaced mass. For a flat board the added mass dominates (rank 2).
- Rank 5, after rank 2: past the clamp, point the force along the true normal instead of a fixed 60°. Under an overhang the water accelerates downward faster than g, so the force points down and out, not up. Provisional.

**The fix (rank 1, `?tubeTrack=old`).** See section 3, plus:
- the wall water's carry speed from the tracker's rate, not `anchorRate`;
- the wall water blended into the solver's flow across the solver's surface, so a body crossing between them sees one continuous flow.

**Bars:**
- New: the water at a body in the wall, and crossing in or out of it, changes by ≤ 1 m/s a step at p99 (6 g).
- Flings (lone boards > 0.1 m clear before touchdown, outside the lip's water) become a bar at ≤ 10 % (provisional).
- Force flips become information.

**Owner's call:** none.

## 2. No climb at the anchor

**Not physical, but the water does climb.**
- Traced at the throw at 0.3 H_s (pool 1.5 m), the water at the board rises at 2.0 → 3.2 m/s over 0.2 s. As built (the trough's along-ray flow plus the kinematic rise), it matches Peregrine et al.: trough water accelerating up the steep front.
- The board does not follow it, for two reasons.

1. **The probe's placement.**
   - It puts lone boards 5 cm under the support (`poolTubeFace.probe.test.ts:524–532`). That is 24.9 of the board's 25.75 L under water, against a rest draft of about 5 mm.
   - It takes their vertical speed from the surface, not their water: 0.49 against 2.04 m/s up.
   - The board keeps a deficit of about 1.5 m/s and is overrun within 0.20 s (normal depth 0.033 → 0.129 m).
   - Placed at rest draft with the water's vertical speed:

     | | pool 1.5 m | a38 1.5 m |
     | --- | --- | --- |
     | Throw boards overrun | 7 → 1 of 12 | 8 → 5 of 12 |
     | 2b overrun | 25.0 → 16.7 % (passes) | 31.3 → 25.0 % |
     | 2a board p99 | 0.272 → 0.217 m | 0.342 → 0.300 m |
     | Flings (> 0.3 m clear) | 31 → 37 of 72 | 33 → 40 of 72 |

   - Flings did not improve, which confirms they come from section 1's jumps.
2. **The missing inertia.**
   - The board's added mass is 100–180 kg against its own 2.54 kg. It resists only the board's own acceleration, not the water's. In a fluid that is accelerating, the body also feels that acceleration acting on its added mass (Maxey & Riley 1983; Auton, Hunt & Prud'homme 1988). BoardBody omits that term.
   - In a 1D heave model (inferred: 0.5 m², the strip's ρπb²/8, BoardBody's radiation damping at ζ 0.5), a surface rising at 1 g for 0.4 s buries the board by 0.33 m (0.85 m/s lag); at 0.3 g by 0.07 m. With the term it stays at its 5 mm draft. The wall water accelerates at 1–4 g.

**The fix (rank 2, `?tubeInertia=old`).**
- In `BoardBody.substep` (added mass along ν, `:1043–1094`), add the added mass's share of the water's acceleration along ν: m_a·Δu_ν over the substep, plus the submerged plate's other side (`plateInertia`).
- Δu_ν is the change in the sampled water velocity along each patch's path, smoothed over about 3 steps and capped at 5 g (provisional, just above Peregrine's computed maximum).
- Only in the case's wall water, behind the switch, after rank 1. Only + − × ÷ and √.
- Rank 3: place lone boards at rest draft along the nearest normal with their water's velocity (passive). Keep prone riders as now.

**Bars:** 2b as ruled. Predicted ≤ 15 % on both case lists and sizes, with more boards pitched (call 4 extended).

**Owner's call:** none inside the wall. Extending the term to the whole sea changes the hull law riders are tuned on, so that would be the owner's call. The model says ≤ 0.07 m difference at the ≤ 0.3 g of ordinary faces.

## 3. The noisy 4b target

**Cause (measured, pool 1.5 m, 133,354 reads).** The solver's trough is not inside the read window.
- `solverCrossing` reads 1 m behind to 3 H ahead of the stepping point, every 0.25 m (`faceAnchor.ts:19, 426–458`). On 98.8 % of reads the lowest read is the window's last one.
- So the 0.3 H level rides on the window's end. That end moves through the wave between the point's 1 m row steps and jumps at each step. The level moves p50 0.011 m a step; at the crossing the solver's face slope is about 0.28 (p50).

| Per step | p50 | p90 | p99 |
| --- | --- | --- | --- |
| Solver crossing's place against C Δt, between row steps | 0.042 m | 0.093 m | 0.118 m |
| The same, at row steps (7 % of steps) | 0.51 m | | |
| The case's part (crest over crossing) | 0.007 m | 0.031 m | 0.075 m |

- So the target's p90 of 0.10 m is the read, not the wave. A rate cap cannot fix it.

**What is physical.** The anchor is the wave's lower face, which moves smoothly. Lower faces move at 3.9–4.4 m/s (`faceAnchor.ts:14`). On the 1:9.5 face, shoaling alone changes speed by about (g/2)·(1/9.5) ≈ 0.5 m/s² (inferred).

**The fix (rank 1, `?tubeTrack=old`):**
1. **Read the solver's trough where it is:** the lowest water within half a wavelength ahead, √(g d)·T/2. That is the meter's own definition (`SurfZoneSimulation.ts:2108–2124`).
   - Measure in the wave's frame, from the solver's crest, not from the stepping point.
   - Read coarse then fine (1 m beyond 3 H, 0.25 m near the minimum), or once per front.
   - Check the case's trough the same way.
2. **Track W with an α–β filter.** This is a steady-state Kalman filter (λ = σ_w T²/σ_v; Kalata's tracking index).
   - σ_w = 0.3–1 m/s² (provisional); σ_v measured after step 1.
   - Keep the 0.45 C cap as a gate: a reading outside it is held as a miss.
   - From a quick simulation: with σ_v 0.01 m, σ_w 0.5–1 m/s² gives a jitter p99 of 0.006–0.008 m. So 0.005 m is reachable only once the read's noise is at or below about 0.01 m. Do step 1 first.
3. **Feed the wall water** the tracker's rate (section 1).

**Bars.**
- Jitter p99 ≤ 0.005 m stays. At 60 Hz that is 18 m/s², several times the lower face's own acceleration.
- Own pace is re-ruled against the tracker's rate: |ΔW − v̂Δt| ≤ 0.01 m p99. It cannot be met against a noisy target.
- New: the raw target's step inside a front, p90 ≤ 0.02 m (now 0.10).
- Cap engaged ≤ 10 % stays. Single steps, fallbacks, clock and weight bars stay.
- Cost (inferred): about 30 reads a point coarse-to-fine, against about 19 now. Negligible per front.

**Owner's call:** none.

## 4. The guard against the meter

**Pouring where foreseen is physical; returning the jet is not.**
- The case throws at its contour, after the face goes vertical. B passes 0.85 near the time a vertical tangent appears, and every crest that passes 0.85 also reaches B = 1 and breaks, from deep to shallow water (Derakhti et al. 2020; LES and BEM).
- So under call 5 the lip plunges, whatever the solver's Kennedy onset (which lags) says. This reverses the return advised in ruling 2.
- The default still retires "unbroken" lips. With the guard off, main's retire fade (0.3 s + 0.5 s, `sliceClock.ts:366–370`) fades 427–475 lips a run to 0.06–0.3 by touchdown, a third of them on stale flags, while their jets pour.

**Fix (rank 4, `?tubeRetire=old`):**
- Under the contour throw, a thrown point is never retired for being unbroken. Keep that retire only under `?tubeThrow=break`.
- Pour where foreseen, as now. The guard stays off.
- The pour's own landing should start the solver's breaking (inferred): about 0.05 m³ per parcel into a 1 m² cell is about 3 m/s of rise, above 0.65√(g d) ≈ 2.5 m/s.

**The meter.**
- Keep ±5 % of main. It is the owner's size readout, and none of these changes moves the solver's water.
- With the guard on, the meter read the return wrong:
  - `returnJet` puts each held jet's whole volume into one 1 m² cell at the crest in a single step (`PlungingLip.ts:878–899, 1284–1300`). At a38 1.5 m that is 0.42 m³, a 0.42 m spike.
  - The meter takes the crest as the highest surface up to 4 cells seaward of the breaking cell (`SurfZoneSimulation.ts:2112–2118`).
  - So the +8 % is inferred to be that spike. Check by logging meter faces within 4 cells and 0.5 s of a return.
- If the guard is ever kept, return the water over `drawFromCrest`'s own window and over the retire time, not as a lump.

**Bars.**
- Bar 6 per jet: the solver's breaking ≥ 0.3 within ±0.5 H_s within 0.2 s after the pour starts, at least 85 %.
- Bar 6 per column: at all weights.
- Retire the ledger's "no thrown point unbroken at touchdown".

**Owner's call:** none. It follows calls 4 and 5 and "tubes wherever the physics plunges", but the owner should ride the lips that are now full to touchdown.

## 5. The drop rule and the join

**Cause (the logs).** Every hole is a strip that has faded.
- The dropped strip's weight is 0.00–0.05 (pool and a38, 1.5 m), 0.08–0.13 (pool 1.8 m), and 0.15–0.22 at a38 1.8 m. In that last case an unthrown strip at 0.02 was kept over a thrown one at 0.2.
- None is at weight ≥ 0.5. The visible gap is roughly weight × lift: mostly under 5 cm, up to about 0.2 m (inferred).
- At the pool, two waves are never within the link reach: 3 cells (`BreakingFront.ts:390`) against about 60 m between crests. So the join split (1 s/m, `:766–771`) only ever parts one crest. Late-sized joiners start at τ_e (`:515`), and their join times part them.

**Physics.** A continuously breaking crest has one surface. Where two descriptions overlap, the more developed one is the water (inferred).

**Rule (rank 6, `?tubeDrop=old`):**
- In `dropOverlaps` (`sweptLoft.ts:1856–1874`), the lighter strip gives way whatever its phase or front; on a tie, the first front.
- Optional and provisional: at the pool, split by clocks (|Δτ| > 1 s/m·d) and start a joiner beside a front's end at its distance clock, within 1 s/m of the end's. Join-time merges already failed in trials (holes 9×, folds 0.75–0.99), so this needs its own trial.

**Bars.** Visible holes = 0: the dropped strip outweighs the kept one by more than 0.1, or its weight × lift exceeds 0.1 m. Holes at weight ≥ 0.5 stay at 0. The raw count becomes information.

**Owner's call:** none.

## Reopened
- Ruling 2 on BoardBody: "no change to BoardBody". The hull law's "water's acceleration left to the hydrostatic slope force" holds only for hydrostatic water.
- Ruling 2's guard and its return to the crest, and the ledger's "unbroken at touchdown" bar.
- The step-7 retire guard, now kept only under `?tubeThrow=break`.
- The drop rule.
- The README's √3 inference, which A/B 1 disproved.

## Sources
- Peregrine, Cokelet & McIver 1980, Coastal Engineering 1980, ch. 32 (opened; computed): https://icce-ojs-tamu.tdl.org/icce/article/download/3455/3135/14703
- Chang & Liu 1998, Phys. Fluids 10, 327 (abstract read via Crossref; PIV): https://doi.org/10.1063/1.869544
- Derakhti, Kirby, Banner, Grilli & Thomson 2020 (§4 and §5, opened): https://arxiv.org/pdf/1911.06896
- Maxey & Riley 1983 (abstract): https://doi.org/10.1063/1.864230
- Auton, Hunt & Prud'homme 1988 (abstract): https://doi.org/10.1017/S0022112088003246
- The α–β filter's gains (opened) and Kalata 1983: https://en.wikipedia.org/wiki/Alpha_beta_filter ; https://doi.org/10.1109/CDC.1983.269580
- Peregrine 1983 and New, McIver & Peregrine 1985 could not be opened (403), so neither is cited.
