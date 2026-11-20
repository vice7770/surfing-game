# Step 7 ruling from the water-physics advisor: the wall, and the bigger tube (2026-11-04)

This is step 7 of the Wave Pool's surfable-tube plan (`docs/superpowers/plans/2026-11-03-pool-surfable-tube.md`). It was read on `claude/playtest-1104c` at c4bbb823 (main plus the tube face, merged as PR #190). The advisor edited no game code.

**The advisor's scratch work:**
- Scripts: `cases.py`, `span.py` (case gaps and usable clearance), `gap.py`, `gap2.py`, `strip.py`.
- Runs: 8 level-10 scouts and 9 level-11 phase-2 runs with the local Basilisk, about 45 min of wall time.
- Figures: `figures/`.

## The ruling in short

**Q1, the wall.**
- **The wall itself is physical.** A plunging wave's upper face is near vertical at the throw, and standing 0.8–1.0 m over the solver's 23° slope is about the case's own height.
- **Three things are not physical:**
  - **No time continuity.** The anchor is recomputed each build. 2.6–5.9 % of slices fall back to the crest anchor, a 1.9–2.7 m jump.
  - **It does not grow.** It fades in over the last ~1 s, already near its throw shape.
  - **Its water does not behave like a wave face.** It carries the solver's flow, so it can neither lift nor carry a board.
- **Fix, in order:**
  1. anchor continuity;
  2. formation keyed on the distance to the throw, from the case's earliest frame, with no hold;
  3. the wall's water given the case's kinematics.

**Q2, the bigger tube.**
- **"2–3 s per arm" is already met.** It means time in the tube along the arm, and the reef plunges for 5–7 s. A single point's open time is set by gravity: 0.7–1.3 s at these faces, never 2–3 s.
- **"1–1.2 m" is 0.67 of the face height,** above every measured tube at 1.5–1.8 m faces, Surf Ranch's included. No floor change reaches it in game under the "never under the solver" union.
- **The only floor in our own data that roughly doubles the usable tube** is a Reef-type ledge: about 1:4.5 along the ray, from the platform to the 0.9 m crest.
- **Next: an M4 batch** of 4 cases (6 with the optional pair). The floor changes only if the ledge wins.

**Q3, order.**
1. Q1 first, built and measured on a38.
2. The M4 batch in parallel (it is 2D only).
3. Then the floor and the new cases.

**Q4, bars:**
- Bar 4 at fixed points is ill-posed under a wall: it becomes continuity conditions.
- Bar 2's solver-only reference is unphysical: it becomes mechanism tests.
- Bar 3 drops the band above the anchor.
- Bar 6 drops to 85 %.
- Bar 8 is tighter on holes.
- Bar 5 counts a vertical wall under a slight overhang as air: it becomes usable clearance.

## Evidence

Measured unless marked inferred.

### 1. The wall

**The clock** (a38 1.5 m; the other three runs agree within 0.05 s).
- Each point's first clock is −0.38 / −0.29 / −0.17 s (p10 / p50 / p90). From first seen to its throw is 0.75 / 1.00 / 1.60 s of solver time, so each slice holds near τ = 0⁻ for about 0.7 s.
- Before the throw, τ jumps freely: `sliceClock.ts:221` sets `τ = shown` with no rate cap.
- An unbroken lag holds at −0.001 (`:216`, `:254`).
- The fit along σ clamps a new point to its neighbours' throws (`:260–291`).
- The weight ramps 0 → 1 over 0.85 / 0.96 s from the join (`:208`, `barrelSpots.ts:321`), on a nearly frozen near-vertical frame.

**The anchor.**
- The shift is computed per build from the instantaneous solver surface, and smoothed only along σ (`faceAnchor.ts:173–229, 237–255`; `sweptLoft.ts:1537–1541`).
- A miss falls back to the crest anchor, `along0 = −crest` (`sweptLoft.ts:1158`). Slices on the crest anchor: 3.0 / 4.1 / 2.6 / 5.9 % (a38 1.5 / 1.8 m, the pool's cases 1.5 / 1.8 m).

**The wall's water.**
- Points in the case's water above the solver's surface get the solver's column flow.
- The lip flow applies only where there is a water floor below, i.e. in the overhang (`sweptContact.ts:330–339`, `PhysicalSurfWater.ts:645–700`).

**The 40 largest rises per run** (from `runs/face-*.txt` of step 6):
- single-step jump size: p50 0.53–0.63 m;
- at weight ≥ 0.9: 25–36 of 40;
- after the throw: 18–28 of 40;
- from the solver's own surface the step before: 8–25 of 40;
- within 5.3 m of the front's start: 9–19 of 40.

**Bodies.**
- Bodies placed ahead of the curl (0.3 s before the throw) fare as badly as those at the throw. Boards under the support: 7 of 8, 11 of 12, 7 of 8, 10 of 11. So the forming wall overruns them, not only the throw.
- Bodies at 0.6 H_s end up under the solver's surface by p90 0.5–1.6 m, driven by the curl's non-buoyant water (`AttachedRider.ts:2404–2405`).
- Bodies at 0.3 H_s mostly sit under the case's water but stay near the solver's surface.

**Real crests at the throw.**
- The crest water moves at B = U/C ≈ 0.85 when a vertical tangent appears on the face, and passes 1 shortly after (Derakhti et al. 2020, §4; LES and BEM).
- In the wave's frame, surface water streams up the face toward the crest. A passive float slower than C is carried up and thrown with the lip (inferred: steady-wave streamline).

### 2. The bigger tube

**Usable clearance against the probe's metric.**
- The max gap is step 3's largest vertical gap (bar 5).
- The usable clearance is the clearance held over a 0.3 m depth along the ray (a crouched body), at life 0.5–0.9.
- Both are the case's own, at game scale.

| Case | H at vertical | Max gap, p50 life 0.1–0.8 | Usable (0.3 m) |
| --- | --- | --- | --- |
| a38 at 1.5 m | 1.60 m | 0.69 m (0.43 H) | 0.43–0.52 m (0.27–0.33 H) |
| a38 at 1.8 m | 2.06 m | 0.90 m (0.43 H) | 0.60–0.68 m |
| Pool small (M4, L13) at 1.5 m | 1.65 m | 0.40 m (0.24 H) | none: no clear cavity |
| Pool big (M4) at 1.8 m | 1.75 m | 0.70 m | best 0.46 m |
| reef42 (a 1:4.2 ledge, L12), drawn at h0 4.5 m | 1.31 m | 1.12 m (0.86 H) | 0.46–0.79 m (up to 0.60 H) |

- The max gap counts the full height of a vertical wall under a few centimetres of overhang. reef42 at life 0.4 shows it: 1.27 m of "gap" with no room under it (`figures/reef42_zoom.png`).
- reef42 is nondimensionally almost the pool on a ledge (`periodic.c` runs in h0 = g = 1 with fixed Re and Bo):

  | | H/h0 | T√(g/h0) | Ledge | Flat |
  | --- | --- | --- | --- | --- |
  | reef42 | 0.30 | 13.9 | 1:4.2 | 0.15 |
  | The pool would be | 0.32 / 0.37 | 14.8 | 1:4.5 | 0.2 |

**Field and lab checks.**
- **Surf Ranch** (Feddersen et al. 2023, §§2.1, 3.4, 4.3):
  - H ≈ 2.25 m on a 0.95 m bar, about 1:15 along the soliton's path;
  - A/H² 0.2–0.42, W/L 0.26–0.50; an example overturn is L 2.32 m × W 1.07 m, so W ≈ 0.48 H;
  - offshore wind roughly doubles A;
  - scaled to 1.5 / 1.8 m faces: W ≈ 0.71 / 0.86 m.
- **Blenkinsopp's 1:10 lab reef:** A/H² ≈ 0.58 − 0.41 h_c/H, so 0.33 / 0.375 at our h_c/H of 0.6 / 0.5, giving W ≈ 0.52–0.56 H (knowledge base, `notes/round7-blenkinsopp/`).

**The advisor's scouts** (level 11 in the break window; A0 0.19 / 0.245, the game's knee crest):

| Bed along the ray | Goes vertical at (still depth) | H at vertical | Shape |
| --- | --- | --- | --- |
| Today's floor, 1:18.7 to the 0.9 m crest | 1.71 / 1.98 m | 1.90 / 2.17 m | a plunging curl |
| One face at 1:9 | about 1.3 / 1.6 m, the upper face | 1.79 / 1.94 m | a curl near the crest edge |
| 1:18.7 to 2.7 m, then 1:6 | the crest edge, 0.9 m | about 2.15 m (the 1.8 m case) | a standing wall, then a thick lip |
| 1:18.7 to 2.7 m, then 1:4 | the crest edge | 1.82 m (the 1.8 m case) | a standing wall, then a thick lip |

- **The cavity calibration failed.** The M4 small case's own parameters at level 11 gave a 0.40 H gap, against 0.24 H at level 13. Level 11 can place the break but cannot size the cavity; only the M4 can.
- **The 2D waves shoal more than the game's.** At the game's knee crest, today's floor gives H_v 1.90 / 2.17 m in 2D, against the meter's 1.52 / 1.79 m (+25 %).

## Answers

### 1. Why the wall overruns the bodies

**1. Is it physical?**
- The wall's height and steepness are. At τ −0.5…−0.1 s it stands 0.50 / 0.60 m over the solver's slope, and 0.83 / 1.01 m at the throw. That is the case's own growth; step 3 foresaw 0.76 / 1.02 m at the throw.
- The artefacts:
  - it does not exist from τ_e (−1.69 / −1.91 s);
  - it is held near vertical for about 0.7 s;
  - it jumps when the anchor jitters or falls back;
  - its water cannot move a board.

**2. What the board should meet:** one surface, carried by its water.
- Below the anchor's 0.3 H, the solver's face, as now.
- Above it, the case's face, rising under the board as the wave steepens, with the face's flow carrying the board up it. It is neither a barrier nor water the board sinks into.

**3. What a real board does** (inferred from B ≈ 0.85–1 at the crest and the surface streamline):
- With no input on a steepening face, it is drawn up toward the crest and goes over the falls with the lip.
- A rider trimming at about C along the ray holds height.
- Low in the pit, under the lip, the rider is covered or hit.
- So no-input bodies at 0.6 H_s at the throw *should* mostly fall. The solver-only A/B, which never pitches, is the wrong reference.

**4. The change, ranked by payoff over cost.**

1. **Anchor continuity** (`faceAnchor.ts`; `sweptLoft.ts:1158, 1537–1541`). Moves bars 4b, 8 and 2.
   - Per front point, cap the smoothed shift's change at 0.3 C·Δt + 0.005 m a step (about 0.03 m). 0.3 C is the case's own crest outrunning its lower face (step 3).
   - On a miss, keep the last shift, advanced at its last rate, for up to 0.5 s.
   - Never return to the crest anchor once a point has had a face anchor. A point with none eases from crest to face over 0.3 s.
   - Blend the life-0.5 extrapolation switch over life 0.45–0.55.
2. **Formation by distance** (`sliceClock.ts:198–225`, `BreakingFront.ts:405–425`, `barrelSpots.ts:306–326`). Moves bar 2 (the "ahead" and "throw" placements), bar 4a and formation.
   - **The clock:** before its throw, a point's clock is τ = −D/C_p.
     - D is the distance along its ray from its crest to its throw contour (still depth = its throw depth), smoothed along σ with the 2 m biweight.
     - C_p is its crest's measured pace along the ray.
     - τ is clamped to [τ_e, 0), never falling, at 0.5–1.5× real time.
   - **The join:** a point joins when D ≤ |τ_e|·C_p. On a plane face this equals the 0.45 / 0.50 m lead, and on a ledge it stays correct.
   - **The throw:** it throws when τ reaches 0. There is no "later of the crossing and the solver's break": the solver's white is only 0.03–0.08 m (0.1–0.3 s) shallower. Keep the retire guard.
   - **The weight:** it ramps over the case's first 0.3 s of τ (those frames sit within 0.07–0.10 m of the solver), not over 0.85–0.96 s from the join.
   - **Result:** the wall grows from ≤ 0.1 m at τ_e to 0.8 / 1.0 m at the throw over 1.7 / 1.9 s, about 0.008 m a step.
3. **The wall's water** (`PhysicalSurfWater.ts:645–700`, `sweptContact.ts:330–339`). Moves bar 2: carried, not overrun. In the case's water above the solver's surface, with no water floor:
   - the flow's component normal to the case surface equals that surface's own normal speed, from the slice's frames at its clock rate plus the anchor's motion (the kinematic condition);
   - the along-ray component ramps from the solver's at the anchor height to B·C at the crest landmark: B 0.85 before the throw and 1.0 from it (Derakhti et al. 2020). The ramp itself is inferred.

**5. What the player sees.**
- The top of the face stands up over about 1.7 s, instead of a wall fading in during the last second.
- No flicker or steps in the wall.
- A rider on the shoulder rides up the steepening face.
- A rider too high at the throw is pitched over the falls; a low rider stays under the lip.

**6. Formation and rise are related only in part.**
- The formation shortfall gives the many moderate rises: 17–20 % of steps over 0.02 m.
- The p99 single-step jumps of 0.4–0.9 m are mostly at full weight, and half come after the throw. They are a near-vertical surface shifting horizontally against a fixed point: anchor jitter and fallbacks, plus the real overturn, where a vertical back wall passing at 1.0–1.7 m/s crosses a point in one step.

### 2. The bigger tube

**1. What the target means.**
- **2–3 s per arm** is the time a rider holding the peel stays in the barrel section. The straight reef already plunges over about u 40–90 at 6.5–7 m/s: 5–7 s, so it is met. Step 6's "2–3 s is about 3× a38's open time" is a misreading.
- **A point's open time** is 1.7–3.0 √(H/g) across our cases: 0.7–1.3 s at 1.5–1.8 m.
- **1–1.2 m tall** is 0.67 H. The measured usable maximum is about 0.5–0.6 H (Surf Ranch 0.48 H, Blenkinsopp 0.52–0.56 H, reef42 ≤ 0.60 H), and the union keeps about 0.72 of the case's air in game.
- **So at 1.5 m the target is beyond physics, and at 1.8 m it is at the edge.**

**2. The floor change** (only if the M4 batch says so).
- **The candidate:** the reef42-type ledge, one face from the 4.5 m platform to the 0.9 m crest at about 1:4.5 along the ray.
- **In `POOL_STRAIGHT` (`pool.ts:422–427`):**
  - `gradient` from 1/9.5 to about 1/2.0 square to the reef. The square gradient is the slope along the ray × cos α, with cos α about 0.4–0.5 (inferred). Iterate once until the frame probe's X reads 4–5.
  - `kneeRounding` from 3 to 1.
  - Keep the crest profile, `flatWidth` 6 and `backSlope` 1/10.
  - The Reef already runs a 1:2.29 ledge.
- **Then re-probe:** the sizes, X, the break depth, the plunging section, the peel, the least water on top (≥ 0.1 m), the catch, the treadmill current, and `POOL_JOIN`, `POOL_RUNS`, `POOL_STRAIGHT_BREAK_DEPTH`.
- **Expected effects:**
  - the break moves to the crest edge, at about 0.9–1.2 m still depth;
  - the machine needs waves about 25–35 % taller for the same meter (2D H_v/A0 is about 1.4–1.7 on a ledge, against 2.0–2.3 on today's face);
  - the peel slows about 10–15 % (inferred: less refraction).

**3. The M4 run list.**
- Add these to `CASES_ALL` in `tools/basilisk/run_periodic.sh` (`name:h0:H/h0:T:S1:HS:domain:tsw:tmax:w0:w1`; the scout re-places the windows):
  ```
  pool_knee_small:4.5:0.26:10:0.0535:0.2:64:20:34:24:48
  pool_knee_big:4.5:0.32:10:0.0463:0.2:64:20:34:24:50
  pool_ledge_small:4.5:0.32:10:0.2222:0.2:64:20:34:24:48
  pool_ledge_big:4.5:0.37:10:0.2222:0.2:64:20:34:24:50
  # optional, the trend:
  pool_steep9_small:4.5:0.26:10:0.1111:0.2:64:20:34:24:48
  pool_steep9_big:4.5:0.32:10:0.1111:0.2:64:20:34:24:50
  ```
- **Sizing:** H/h0 0.26 / 0.32 gave A0 0.187–0.191 / 0.242–0.248 in the scouts, the game's knee crest. The ledge is sized for faces at A0 about 0.24 / 0.29. Rerun it if the game's measured knee crest on the new floor differs by more than 10 %.
- **The run:**
  ```
  JOBS=4 POOL_CASES="pool_ledge_big pool_ledge_small pool_knee_big pool_knee_small" CANYON_OUT=docs/research/pool-tube-runs-2 npm run barrels:pool
  ```
  - `JOBS=6` with the optional pair.
  - Keep `LEVEL2` at 13.
  - About 2.5–3 h.
- **Recommended:** a small `periodic.c` option for the reef top and back slope: the crest flat about 2.7 h0 along the ray, then 1:20 down to h0. Today's flat to a closed wall over-drains the ledge.
- **Decision rule:** adopt the ledge if its usable clearance (0.3 m) is at least 1.3× the knee case's at the same face height, and its lip lands within 0.6–1.6 H.

**4. Predicted bars** (inferred).
- "After the union" means after the 0.72 factor.
- "A tight anchor" means bar 3 at p50 ≤ 0.03 H_s, keeping 0.85–0.9 of the air.

| | Usable clearance | Probe air | Open time | Landing | Lip |
| --- | --- | --- | --- | --- | --- |
| **Today's floor at the game's crest** (an a38-sized tube, but the pool's own) | 0.35–0.45 m (1.5 m), 0.45–0.55 m (1.8 m) | 0.57 / 0.67 m | 0.75–1.5 s | 0.9–1.05 H | |
| **The ledge** | after the union: 0.55–0.65 m (1.5 m), 0.65–0.78 m (1.8 m); with a tight anchor: 0.65–0.8 m and 0.75–0.95 m | 0.93 / 1.12 m (looks like the target but counts the wall) | 1.15–1.3 s, an open curl 6–8 m along the line | 1.2–1.5 H | 0.4–0.46 H thick (0.6–0.8 m): a slab |

**1–1.2 m of usable clearance** needs faces of about 2.2–2.8 m.

### 3. Order

1. **Q1 on a38 first, as its own PR:** anchor continuity, then formation, then the wall's flow.
2. **The M4 batch in parallel.** It is 2D only and needs just the case lines.
3. **Then, if the ledge wins, the floor change and its probes,** with a38 as the interim drawn case.
4. **Last, the new cases.**

This is not one build. A bigger wall without Q1 makes bars 2 and 4 worse, and a failing bar could not then be attributed to its cause.

### 4. Bars re-ruled

**Bar 2:** drop "within 1 of the solver-only A/B" (keep it as information).
- (a) **No overrun:** outside the lip's water, a body's bottom is ≤ 0.15 m under the support at p99, and never for more than 0.1 s.
- (b) Lone boards and prone riders at ≤ 0.3 H_s, ahead and at the throw, stay within 0.1 m of the support to touchdown on ≥ 80 %, with lip hits counted apart.
- (c) Information: the share of 0.6 H_s bodies pitched into the lip's water.

**Bar 3:** over 0.05–0.25 H_s only, below the anchor: p50 ≤ 0.05 H_s, p95 ≤ 0.15 H_s. Report 0.3–0.4 H_s, where the case is meant to stand over the solver.

**Bar 4:**
- (a) Below the anchor, at points fixed in the anchor's frame: rise ≤ 0.02 m a step at p99.
- (b) Above it, the vertical rise is not a measure. Instead:
  - the shift changes ≤ 0.03 m a step at p99;
  - no crest-anchor fallbacks after a point's first face anchor;
  - the pre-throw clock runs at 0.5–1.5× real time;
  - the weight changes ≤ 1/18 a step;
  - the 40 largest rises are decomposed by cause.
- (c) Never under the solver, as now.

**Bar 5:** usable clearance over a 0.3 m depth, p50 at life 0.3–0.9. The max vertical gap becomes information.

**Bar 6:** on breaking ≥ 0.3 within ±0.5 H_s on ≥ 85 %, or ≥ 90 % within ±1 H_s. The measure is bimodal, and 87–89 % sits 1–1.5 standard errors under 90 %. The distance, 0.6–1.5 H, stays.

**Bar 7:** extended to before the throw, with no holds over 0.1 s. A new formation bar: the first clock within 0.1 s of τ_e.

**Bar 8:** holes ≤ 0.01 a build, folds ≤ 0.05 a build, saddle p95 ≤ 0.2 H_s. The rest stays.

## Cost

- **Q1:** about 20–40 bed reads per point per step, plus two profile lookups per body sample in the wall's water. About +0.1–0.3 ms a step on the M1 worker, about half that on the M4 Pro (inferred).
- **The bigger tube:** no runtime change.

## Risks

- **Throwing at the throw distance** could land a lip before the solver's white. Watch bar 6.
- **Per-point pre-throw clocks** could bring back teeth. Check |dτ/dσ| against 1/V_peel.
- **The wall's flow** changes the rider's forces on steep faces. More pitch-overs high on the face are physical, but the owner rides it.
- **The ledge in the solver:**
  - drained reef-top cells (the Reef's blow-up history, and still-depth recovery: `solver-stability.md`);
  - late, steep take-offs, which may hurt the catch;
  - the union may eat more than 28 % if the solver drains less than Navier–Stokes does.
- **The 2D closed wall** over-drains the ledge.
- **The level-10/11 scouts** cannot size cavities.

## What stays

- the union ("never under the solver");
- the lower-face anchor at 0.3 H;
- the 1.25× clock cap after the throw;
- the drag rule for lip hits;
- a38 as the default until the new cases;
- the crash ledger;
- Classic and every other spot.

## Calls for the owner

1. **The target:**
   - accept about 0.55–0.8 m (1.5 m) and 0.65–0.95 m (1.8 m) with a slab ledge;
   - raise the Barrel's sizes to about 2.2–2.8 m faces for 1–1.2 m;
   - or keep today's floor with the pool's own case, at about 0.35–0.55 m.
2. **The M4 batch:** 4 cases, or 6 with the 1:9 trend pair.
3. **The slab's character:** a 0.6–0.8 m thick lip, a sudden jack-up, heavier wipeouts and a slower peel.
4. **Bodies:** no-input bodies high at the throw going over the falls counts as correct.
5. **The throw at the throw distance,** without waiting for the solver's break.
6. **The saddle,** still open from step 3.
7. **Offshore wind as a later lever** (sourced, up to about 2× the area). It needs a wind term in `periodic.c`.

## Rulings reopened

- **Step 3 §5:** "the throw at the later of the crossing and the solver's break" becomes the throw at the throw contour (pending call 5).
- **Step 3's bars 2, 3, 4, 5, 6 and 8:** re-ruled above.
- **Step 1's "size by the knee crest":** add a check on the face (2D H_v runs about 25 % over the meter on today's floor).
- **The step-6 README's "2–3 s is about 3× a38's":** wrong. It is per arm, not per point.

## Sources

- Derakhti, Kirby, Banner, Grilli & Thomson 2020, arXiv 1911.06896, §4: https://arxiv.org/pdf/1911.06896
- Feddersen, Fincham & Brodie 2023, JFM 958 A4, §§2.1, 3.4, 4.3: https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf
- Blenkinsopp's thesis via ePrints 466054 (https://eprints.soton.ac.uk/466054/; `notes/round7-blenkinsopp/` in the knowledge base)
- Mead & Black 2001: http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf
- The reef42 run: `docs/research/water-physics/reef-ledge-runs.md`
