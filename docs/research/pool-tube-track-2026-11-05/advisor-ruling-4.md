# Ruling 4: why the wave body throws riders, and what makes it one surfable wave (2026-11-06)

The water-physics advisor read main at 3753dfb5 (after PR #203) and made no repo edits. The owner's ride, 2026-11-06:

> The body of the wave is not surfable: it falls from the board as soon as it moves onto it.

The owner's goal for this round: a smooth merge into the existing wave first, then paddle in, stand and ride the face up to the tube. Riding inside the tube comes later.

**Method.** Scratch copies of the probe (`proneSeam.probe.test.ts`) build the game's water as the runner does. They place `RideSession` riders at the straight Barrel with scripted inputs only. Headless, CPU, 4 waves a run, about 40 runs. Files: `scratchpad/tube-ruling-4/` (`m3/src/wave/probes/proneSeam.probe.test.ts`, `job3.sh`, `queue3.sh`, `tools/ride.py`, `tools/sum.py`, and the run logs in `runs/`).

## In short

- **The wave body has a body.** At the fall the board sits on it, at its normal prone depth (0.2–0.45 m under the drawn surface, 85–100 % submerged). Its buoyancy is 220–259 N, as when prone on the solver. The wall stands 0.1–1.0 m over the solver's surface there. It is not a void: the body is there, and it lurches.
- **Riders are thrown by the pre-throw formation clock.**
  - As the case forms, its clock jerks between its rate bounds, and the board is torn from the rider ("lost board").
  - With `?tubeForm=old`, scripted pop-ups at 1.5 m failed 0 of 16 on a38 and 2 of 16 on the pool's cases. Pre-tube failed 2 of 16; the default failed 6 of 16 (a38) and 10 of 16 (pool).
- **Not settled headless:**
  - The scripted pop-up at 1.8 m fails even pre-tube.
  - Scripted standers (no balance input) fall in every build.

  Both are the owner's ride to judge.

## 1. Where riders fall, and which piece does it (measured)

**Passive prone riders** (no input): 8 spots a wave (s 40, 55 and 70; 0–18 m seaward of the break line), a38 1.5 m unless noted.

| Build | Fell (of 32) | Where |
|---|---|---|
| Default | 12 | All "lost board", in the case's wall water |
| Pre-tube (`tubeFace=old&tubeFrom=piece`) | 2 | Solver's water |
| `wallFlow=old` | 1 | |
| `tubeInertia=old` | 6 | Wall |
| `tubeContact=old` | 5 | 3 in the solver's water |
| Pool cases | 12 | 10 in the wall |
| a38 1.8 m | 18 | All in the wall |

**Scripted ride.** Paddle straight from the game's start (18 m out) and from 15 and 12 m. Pop up at the rider's own cue, or after 0.2 s above 3.5 m/s shoreward. Then hold steer at 0 or −0.5 (toward the shoulder). 24 rides a build; 16 pop up at 1.5 m.

| Build, 1.5 m | Pop-ups failed (of 16) | Stood |
|---|---|---|
| Pre-tube | 2 | 10 |
| Default a38 | 6 (all "lost board" in the wall) | 6 |
| Default pool | 10 | 2 |
| **`tubeForm=old`** | **0** | **12** |
| **`tubeForm=old`, pool** | **2** | **10** |
| `tubeForm=old&tubeInertia=old` | 0 | 12 |
| `tubeInertia=old` / `wallFlow=old` / `tubeContact=old` | 4 / 4 / 4 | 8 / 8 / 8 |
| `tubeFace=old` / `tubeThrow=break` / `tubeCap=old` / `tubeMerge=old` | 6 each | 6 each |
| `tubeRetire=old` | 8 | 4 |
| `tubeAnchor=old` | 10 | 2 |

**At 1.8 m:**
- Pre-tube: 18 of 24 pop-ups fail, in the solver's water ("lost board" and "foot slip").
- Default: 18 of 18 pop-ups fail, plus 6 falls while prone, all in the wall.
- `tubeForm=old`: 16 of 20 fail.

The scripted pop-up fails at 1.8 m without the tube too, so this size is inconclusive.

**After standing:** every scripted stander fell 0.2–1.4 s later, in every build, by "balance". Pre-tube standers fell with the board in the air at the drop. With no balance input this stage cannot be judged headless; it is the owner's.

**What tears the board off:**
- **The felt water in the last 0.3 s before a "lost board" on the body** jumps 0.5–23 m/s (p50 0.5–3.3). The hull's added-mass force reaches 620–2,460 N.
- **Pre-tube and `tubeForm=old` falls** show 0.02–0.03 m/s (at most 0.48) and 400–740 N. That is the hull's ordinary added mass.
- **The limit that gives way** is the prone hold's "flight" limit. The board pulls away from the rider by more than `PRONE_GRIP`, 0.6 body weights, for more than `MAX_FLIGHT`, 0.4 s (`AttachedRider.ts:30–32`, `:2943–2972`).
- **On the body**, the board's acceleration p99 is 30 m/s², against 10 m/s² in the pre-tube's water. The hold sits at its flight limit on 4.6 % of steps, against 1.2 %. Roll, pitch and yaw rates are the same in both builds (roll p99 about 190 °/s).
- **Moving onto the body is not the problem.** In the 0.3 s after a paddling board's middle first crosses onto the case's water (37 crossings):
  - the felt flow changes by p90 0.12 m/s a step;
  - the hold never reaches its flight limit;
  - 1 of 37 fell within 1 s.

  The falls come later, as the body forms under the board.

**Cause (the A/B is measured; the path is inferred).** The pre-throw "formation by distance" clock does it (`sliceClock.ts:323–352`).
- The clock sets τ = −D/C_p, clamped to 0.5–1.5× real time.
- D comes from the crest cells' centres, which step in 1 m rows (`:336`).
- The rate sits on one bound or the other on 5 % of steps each (pool 1.5 m, the PR #199 build session's measurement), switching between them.
- The case's shape relative to its crest moves at τ̇ times its speed. So a switch moves the lower face and the lip by about 1 × several m/s in one step. The drawn body lurches, and its water with it: the wall water reads the one-step rate (`crashCurve.ts:458–463`; it is smoothed only under `?tubeTrack=on`).
- To check the path: log τ̇ at the board's slice in the 0.3 s before each fall.

## 2. The seam (measured, slice near s 45, scan every 0.05 m)

| τ | Case's lower edge on the solver's face | Height step p90 | Slope jump p50 / p90 | Flow jump across 0.25 m, p50 / p90 |
|---|---|---|---|---|
| −1 to −0.5 s | 0.14 H (1.5 m), 0.37 H (1.8 m) | 0.045 / 0.10 m | 2–3 / 10° | 0.3–0.4 / 1.4–1.5 m/s |
| −0.5 to 0 s | 0.06–0.08 H | 0.035–0.047 m | 4.5–9.5 / 7–12° | 0.4–0.8 / 0.7–1.3 m/s |
| 0 to 0.5 s | 0.04–0.10 H | 0.056 m (1.8 m), **0.48 m** (1.5 m) | 7–10 / 9–48° | 0.5–0.7 / 0.9–1.7 m/s |

- **How much water each carries.** Near the throw the case carries 0.4–0.8 m² (1.5 m) and 0.6–1.6 m² (1.8 m) per metre of crest over the solver's surface. The solver carries 3.3–6.4 m² above its own trough. So the solver holds 70–90 % of the wave's water, and the steep wall is the case's alone.
- **The ends.** Along the crest, a 0.3–1 m wall is lerped down over max(1 m, H) (`sweptLoft.ts:64–92`). That gives 17–30° lateral slopes. One passive board slid along the crest at 4 m/s on such a slope; the normal's along-crest component was 0.33–0.46.

## 3. Ruling

**(a) One surface.** A gravity wave's free surface is smooth.
- In the frame moving with the wave it is a streamline, with ½|q|² + gη = const.
- Its only possible corner is the 120° crest of the limiting wave (Stokes 1880, in Crew & Trinh 2016).
- So a 10–48° crease, or a 0.5 m step at the wall's foot, has no counterpart in real water.

Coupled wave models join two solutions with a relaxation zone. Velocity and surface are blended with one weight, φ = α φ_computed + (1 − α) φ_target (waves2Foam's coupling zones, Zhuang et al. 2018).

Build the same:
- Within the case's footprint, y = y_s + α(y_c − y_s) and u = u_s + α(u_c − u_s).
- α is C1 in the profile's arc length (0 where the case meets the solver, 1 by about 0.5 H above the anchor).
- α is C1 along σ at the ends, over the clock gradient's length, not just H.
- α is C1 in τ.
- The union (max) stays only where the case overturns, with air under it.

**(b) What a prone rider, then a standing rider, needs.** The water the board feels must move as real water does.
- Real accelerations are about 1 g on the face. They reach (4.3, −2.0) g only at an overturning crest (Peregrine, Cokelet & McIver 1980). The jet enters at 1.1 g (Chang & Liu 1998).
- Floats on the forward face are carried, "surfing", at 1.1 c when they catch the breaker (Deike, Pizzo & Melville 2017).
- The hold gives way at 0.6 body weights. With 100–180 kg of added mass that allows about 0.2 m/s of felt-flow change a step. **This re-rules ruling 3's bar of 1 m/s a step.**
- Standing on the steep face, support is the hull's planing law (Savitsky, `hullForces.ts:10–37`) on the flow climbing the face. That needs the same continuity.

**(c) Pieces of #190–#199:**
- **Keep:**
  - the face anchor, lag, clock rate and thrown ends (#190);
  - the continuity and the contour throw (#191);
  - the cap and the merge (#198);
  - no retire (#199).
- **Change:**
  - the formation clock (#191): rank 1;
  - the lower-face union and the end blends (#190, `sweptLoft.ts:1462`, `PhysicalSurfWater.ts:775`): rank 2;
  - the wall water and the nearest surface's switch between two answers (#191, `PhysicalSurfWater.ts:902/1040`; #198, `sweptContact.ts:145/530`): rank 3.
- **Opt-in, until ranks 1 and 3 pass:** the inertia (`faceAnchor.ts:176`).
- **Leave as they are:** the smooth wall, the buoyancy and the drop rule stay opt-in.

## 4. Fixes, ranked by what lets the owner paddle in, stand and ride the face

| Rank | Fix | Code | Switch | Bars |
|---|---|---|---|---|
| 1 | A C1 formation clock. τ_{n+1} = τ_n + τ̇ Δt. τ̇ follows −D/C_p critically damped, within 0.5–1.5×, with \|τ̈\| ≤ 1 s⁻¹ (inferred: 0.5 g on a 5 m/s shape speed). D from a sub-cell crest (parabola along the column). The drawn shape and its water use the same τ and τ̇, committed one step ahead. | `sliceClock.ts:323–352`, `crashCurve.ts:458–463` | `?formClock=old` | On a bound ≤ 1 % of steps; \|Δτ̇\| p99 ≤ 0.02 a step; felt water on the body p99 ≤ 0.2 m/s a step; failed pop-ups at 1.5 m ≤ pre-tube's 2 of 16 (a38 and pool); passive prone falls ≤ 3 of 32; formation bar 7 and the contour throw kept; meter ±5 % |
| 2 | The seam as a relaxation band, per 3(a); the ends blended over the clock gradient. | `sweptLoft.ts:1462` and `:64–92`; `PhysicalSurfWater.unionContact` | `?tubeSeam=old` | Height step ≤ 0.01 m, slope jump ≤ 3°, flow jump ≤ 0.2 m/s across 0.25 m at every τ; lateral slope at the ends ≤ 10° (provisional); visible holes 0; meter ±5 % |
| 3 | One interior flow. The wall water fades over the wall's own thickness, not 0.3–0.6 m, from one surface (weighted by distance where two answer). The climb is a wave-frame tangential speed along the surface (q² = 2g(y_s − y), the streamline), not an along-ray target divided by n_y. This takes in questions 1 and 2. | `PhysicalSurfWater.ts:837/902/1040`, `sweptContact.ts:530` | `?wallBody=old` | Board acceleration attached on the body p99 ≤ 10 m/s²; prone-hold flight steps ≤ 1.5 %; plus rank 1's felt-water bar |
| 4 | The inertia opt-in now (`?tubeInertia=on`); re-measure after ranks 1 and 3. | `faceAnchor.ts:176` | — | Passive prone falls (12 → 6 of 32 when off) |

**The owner's calls:**
1. **What to ride now.** `?tubeForm=old` can be ridden without a build. It also brings back the old throw (lips wait for the solver's break, and unbroken ones retire).
2. **Store the Basilisk runs' interior velocities** in the library. That gives a sourced flow for rank 3, at the cost of a library rebuild.
3. **The standing verdict.** Scripted standers fall in every build, so only the owner's ride can judge it.
4. **Not recommended:** having the solver carry the face. A depth-averaged solver cannot hold it, and it changes the sea and the meter.

**Shot list (Barrel, 1.5 m, dev build).** Ride the default, `?tubeForm=old`, `?tubeForm=old&tubeInertia=old`, and pre-tube. Paddle from the start, catch, pop up and ride the face. Note whether you fall at the pop-up, and how the face feels.

**The eight questions** (`README.md`, "For the advisor"):
- **1 and 2** are folded into rank 3.
- **5:** yes, smooth the clock itself. It is now rank 1.
- **4:** don't extend the profiles. Rank 2's band makes the 0.3 H crossing less critical. Use the per-frame trough that `periodic_library.py` already writes (`trough`, `H_trough`) if a match is needed.
- **7:** main's 2b passes on the pool's cases were measured on lips fully retired by touchdown (retire 1.00 at p10–p90). Also, 2b counts flung boards ("pitched off the surface") as passes. Flings outside the lip's water should count as failures.
- **3, 6 and 8** are deferred.

## Sources (all opened)

- Crew & Trinh 2016, arXiv:1510.04254: https://arxiv.org/pdf/1510.04254
- Zhuang, Wan, Bouscasse & Ferrant 2018, OpenFOAM Workshop 13: https://dcwan.sjtu.edu.cn/userfiles/OFW13-8-102.pdf
- Deike, Pizzo & Melville 2017, JFM 829: https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2017_Deike_Pizzo_Melville-Journal_of_Fluid_Mechanics_vol_829.pdf
- Chang & Liu 1998, abstract: https://doi.org/10.1063/1.869544
- Peregrine, Cokelet & McIver 1980 (opened for ruling 3): https://icce-ojs-tamu.tdl.org/icce/article/download/3455/3135/14703
