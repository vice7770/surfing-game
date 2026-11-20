# Step 7 follow-up ruling: what still fails after the wall fix (2026-11-05)

The water-physics advisor read main at 57dde674, with the wall build at 85c8292f (PR #191), and made no game edits.

**The probe:** one bodies-only run with the board trace on (a38, 1.5 m, 4 periods).
- It reproduced the build's numbers: 2a p99 0.751 m; 2b 40 % of 15; 4b p99 0.049 m, max 1.03 m; folds 0.130 a build.
- It took 7.6 h of wall time, against a 40 min budget: the machine slept overnight, and other vitest processes were running.

## 1. Bodies

**The cause.** The builder's diagnosis is right in mechanism. The contact answers each point from the vertical line through it. Three things follow, and one does not.

1. **The wrong surface.**
   - The contact takes the nearest crossing above (`sweptContact.ts:315–330`). Once a body's vertical line passes behind the steep part of the wall, that crossing is the crest top.
   - Traced, a lone board on an 80° face, with the wall's water climbing at 7.8 m/s up and 4.9 m/s shoreward:
     - in one step its sampled normal flipped from 80° to 33°, and the support rose 0.41 m;
     - it then sat 0.6 m under a near-flat top (normal 2°), with a vertical flow of 0.01 m/s and no forward push.
   - The kinematic condition was applied at the crest top, not at the face touching the board (`PhysicalSurfWater.ts:847–880`).
2. **The wrong immersion.**
   - The board's depth is that vertical depth (`hullForces.ts:166–230`; `WET_RAMP` 0.01 m on a 0.067 m board).
   - On a face at angle θ, the vertical depth is the normal depth ÷ cos θ: 2× at 60°, 5.8× at 80°.
   - So a rail just touching a steep face reads its deck as wet, and the free board takes plate cross-flow drag and skin friction on both faces.
3. **A trap under the solver's surface.** The wall's water is never applied below the solver's surface: `unionContact` returns at `PhysicalSurfWater.ts:675–686`, before `inWall` is set (`:691`). A body pushed under the solver's surface beneath the case's wall gets the solver's flow and cannot be lifted back.
4. **Not a cause: the lone boards' loss of along-line speed is physical.**
   - The shell is 2.54 kg (`boardReference.ts`), and ITTC skin friction on the bottom alone takes it from 6.7 m/s to 3.9 m/s in 0.3 s (traced: 3.2 m/s).
   - A riderless board becomes a passive float almost at once. Prone riders lose little this way.

**It is not a limit of the single-valued support.** The swept contact already holds every crossing of a vertical line. What is missing is the horizontal direction. Each slice is a 2D profile in the ray–vertical plane, so a nearest-point query there is cheap.

**What a board should sample:** the surface normal's flow, at the nearest point of the drawn surface in the ray–vertical plane.
- Its immersion is the signed distance d_n along that point's normal.
- It takes that point's normal.
- It takes that point's own normal speed (the kinematic condition), plus the along-ray ramp as built.

Not the face ahead along the heading: a board heading down the line has its rail toward the face whatever its heading. And no new multi-valued support: we already have one.

**The physics.**
- Surface particles on the forward face near the crest "accelerate and surf the underlying wave" (Deike, Pizzo & Melville 2017, DNS, §2.3, after Pizzo 2017). Tracers caught by the break move 0.36 λ, one almost 1 λ, against 0.06–0.2 λ elsewhere. These are modelled, in deep water, with massless tracers.
- With crest water at B = 0.85–1 (Derakhti et al. 2020), a light passive float is carried up and over, and never overrun before touchdown outside the lip's water. This is inferred for boards: no measured data on passive boards on plunging faces was found.

**The change, the smallest, in two places:**
1. **`SweptContact.query`** (`sweptContact.ts:293–377`):
   - For a point in the case's water with no water floor (the wall), also cast a horizontal ray shoreward along the slice's ray, up to 1 m, through the strip's existing 0.5 m buckets, at the point's height.
   - Take the first crossing ahead, and return whichever surface is nearer along its own normal: d_v·|n_y| above, or d_h·|n_a| ahead.
   - Return the chosen surface's normal and its `wallAlong` / `wallUp` from that triangle's barycentrics, and a new `normalDepth` field.
   - Blend the two answers where their distances are within 0.05 m, so the force does not flip.
2. **`PhysicalSurfWater.unionContact`** (`:659–704`):
   - When the face ahead answers, set `surfaceY = y + normalDepth`, with the face's normal and the existing slope clamp (`MIN_NORMAL_Y` 0.5), and set `inWall`. `BoardBody` then reads the true immersion unchanged.
   - Also set `inWall` in the `y < plainY` branch (`:676–679`), wherever the case's surface stands over the solver's.
   - Fade the kinematic normal part to the solver's flow between 0.3 and 0.6 m of `normalDepth` (inferred). This keeps it off bodies deep under the crest.
3. **No change to `BoardBody`.** The contact uses only + − × ÷ and √, so online stays deterministic.

**The cost** (inferred): one horizontal cast per wall sample, about the same as a vertical query. That is roughly +0.05–0.2 ms per body per step on the M1 worker, and about half that on the M4 Pro.

**Bar 2's measure is also wrong.** Measure first, then build.
- 2a and 2b take the vertical gap under the lowest crossing (`poolTubeFace.probe.test.ts:494, 513, 518`). That inflates penetration on steep faces by 1/cos θ, and makes it jump by tan θ times the face's horizontal motion.
- 2a also counts the time after touchdown, when burial under the collapsing tube is a real wipeout.
- In the trace, 69 of the 74 rows deeper than 0.15 m sit under a gentle surface above. So most burials are real, but how much of it is the metric stays unknown until it is measured along the normal.

## 2. Bar 3: harmless, don't lift

- The early case frames sit 0.11–0.13 m under the solver's lower face, at 0.2–0.25 H_s before τ −1 s.
- The union and the loft's floor clamp hide this from both the rider and the drawing, and bar 4a passes (0.0004–0.009 m). The only effect is that the case comes out of the solver a little higher up the face, at a slightly sharper kink.
- A time-varying anchor fraction would move the case's crest by about 0.5 m over the first second. That spends the continuity cap and risks 4b and the formation, for nothing the rider feels. Don't build it.

## 3. Bar 4b: the 0.03 m bar measures the wave's own speed-up, not jitter

- The case's crest runs at 0.64 / 1.24–1.35 / 1.37 of the wave's advance (p5 / p50 / p95).
- The cap's ceiling, 1.3 C + 0.3 m/s, is about 1.35 C at 6–8 m/s, so it shapes the wall on about 65 % of steps.
- **The change:** `ANCHOR_CONTINUITY.crest` from 0.3 to 0.45 (`faceAnchor.ts:122`, used at `:200`). The ceiling becomes about 1.5 C and the floor about 0.5 C, outside the case's p5–p95, so the cap catches only jumps. This reopens the advisor's own step-7 number.
- **Separately, trace the max.** The single-step |ΔW − C Δt| reaches 1.1–3.8 m in every run (p99.9 0.058–0.092 m), and these jumps are visible. Candidate causes include `stood` (the shift standing with a point that steps 1 m rows) and changes of front piece.

## 4. Jets: physical, not a double count

**No double count:**
- Each point throws once: `jetStrip` is set once (`SweptCrash.ts:272`).
- The solver's own lip throws nothing at a swept spot (`SweptCrash.ts:44`).
- Kennedy onsets are unchanged: 2,370 against 2,413.
- Crashes equal throws: 852 of 853.
- The volume per jet is unchanged: 0.424 against 0.441 m³ at a38 1.5 m, and −4 to −7 % across the four runs.

**Physical:**
- Step 7's touchdowns land on the solver's breaking within ±0.5 H_s on 100 % at a38, against step 6's 87–89 %.
- Step 6's break rule was retiring about a third of the plunges, wherever Kennedy's onset lagged the contour by more than 0.3 s.

**A gap to close:** the retire guard (0.3 s plus a 0.5 s fade) outlasts a38's open time (0.70–0.79 s). A point the solver never breaks still pours. It is rare here, but on other beds it would land jets on clear water.

**The bar:** ±5 % of main is no longer the right bar for jets under the owner's call 5 (the throw at the throw depth). Keep the meter at ±5 %.

## 5. Holes and folds: a build artefact the builder can close

- These are not strips crossing themselves. They are overlaps between fronts or front pieces, dropped in `SweptLoft.dropOverlaps` (`sweptLoft.ts:1755–1840`). A hole is a drop of an open, thrown strip with weight above 0.
- They come with the contour throw and the continuity together:
  - 0.000–0.005 a build with `?tubeThrow=break`;
  - 0.000–0.004 with `?tubeAnchor=old`;
  - 0.022–0.028 with both on.
- Two thrown pieces of the same wave each keep their own anchor track, so their walls part and their footprints overlap.

**The fixes:**
1. Assign a crest that joins by distance next to an existing front's end to that front: within 1.5 slice spacings along the crest and within 0.3 s of its τ (where joined points get `front`, `BreakingFront.ts:468` on).
2. In the drop rule (`:1816–1840`):
   - never drop an open strip at weight ≥ 0.5;
   - between two thrown strips, keep the earlier-thrown one, and blend the other's end over max(1 m, 1 H).

## Re-ruled bars

- **2a:** penetration along the nearest surface's normal, before the body's σ touchdown, outside the lip's water: p99 ≤ 0.15 m, and never over 0.15 m for more than 0.1 s. After touchdown is reported as information (wipeouts).
- **2b:** passive lone boards and prone riders at 0.3 H_s, ahead and at the throw, each with one of three outcomes to touchdown:
  - carried: within 0.1 m along the normal;
  - pitched: entered the lip's water, or separated while on the surface;
  - overrun.

  It passes with overrun ≤ 20 % (carried + pitched ≥ 80 %), with lip hits kept apart. Keep it passive, since it tests the water's carrying; trim input is riding, and that is the owner's to judge.
- **2c:** information, as now.
- **3:** one-sided, below the anchor (0.05–0.25 H_s):
  - the case over the solver (a felt bump): p95 ≤ 0.05 H_s, max ≤ 0.1 H_s;
  - the case under the solver: information, split by τ.
- **4b:**
  - jitter: |ΔW_n − ΔW_(n−1)| ≤ 0.005 m at p99, and ≤ 0.02 m max;
  - against the case's own pace: |ΔW − V_case Δt| ≤ 0.01 m at p99;
  - no single step with |ΔW − C Δt| over 0.1 m;
  - the cap engaged on ≤ 10 % of steps;
  - the fallbacks, clock and weight bars stay;
  - |ΔW − C Δt| itself becomes information.
- **The ledger:**
  - each joined crest throws at most once;
  - no thrown point is unbroken at touchdown;
  - the starved volume is ≤ 5 % of what was asked (now 0.5–2.7 %);
  - bar 6 is counted per jet;
  - the meter stays within ±5 % of main;
  - the jet count against main becomes information.
- **8:** holes ≤ 0.01 a build, and 0 at weight ≥ 0.5. Folds become information: only drops of thrown strips are visible.

## Predicted bars (all inferred)

| | Re-measure only | After the contact change |
| --- | --- | --- |
| 2a p99, along the normal | 0.3–0.6 m | 0.10–0.20 m for boards, ≤ 0.25 m for prone riders |
| 2b carried + pitched | 40–90 % | ≥ 80 % on both case lists, at both sizes |
| 2c pitched | as now | 10–30 % |

- **4b with crest 0.45:** the cap engages on under 5 % of steps; |ΔW − C Δt| p99 reads 0.06–0.07 m, as information.
- **Holes after fixes 1 and 2:** ≤ 0.005 a build.
- **Unchanged:** bars 1, 3, 4a, 6 and 7, and the meter.

## Risks

- Boards high on a near-vertical wall get pushed shoreward at up to C. More riders are pitched, and a rider tight under the lip may feel shoved off the wall. The owner rides it.
- The clamped hydrostatic slope on a steep face pushes a submerged board outward at up to 1.73× its buoyancy. Watch for lone boards flung off the wall.
- If the choice between the surface above and the face ahead is not blended, the force flips direction.
- Widening the cap lets more anchor noise through. 4a is unaffected.

## Calls for the owner

1. **Extend call 4:** passive bodies anywhere on the steepening face above the anchor, not only high at the throw, being drawn up and pitched counts as correct.
2. **The jets:** accept about 46–79 % more sections throwing under call 5, each landing on the solver's breaking, and retire the jet-count bar. `?tubeThrow=break` stays the A/B.

## Reopened

- The step-7 cap: 0.3 C becomes 0.45 C.
- Bar 2's vertical measure, and bars 3, 4b, 8 and the ledger, as above.

## Sources

- Deike, Pizzo & Melville 2017, JFM 829, §2.3 and §4: https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2017_Deike_Pizzo_Melville-Journal_of_Fluid_Mechanics_vol_829.pdf (doi https://doi.org/10.1017/jfm.2017.548)
- Derakhti et al. 2020, §4 (the step-7 ruling): https://arxiv.org/pdf/1911.06896
- A search for experiments on floating bodies in plunging breakers found none.
