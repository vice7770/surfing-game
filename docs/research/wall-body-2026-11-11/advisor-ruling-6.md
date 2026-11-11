# Ruling 6: what is left inside the wave body after the seam blend, and rank 3 made buildable (2026-11-11)

The water-physics advisor worked in the `claude/wall-body` worktree at main 4806cb86. Nothing is committed or pushed. The prototype edits are left in place, uncommitted (listed at the end).

**Method.** A scratch copy of `src/wave/probes/proneSeam.probe.test.ts` (`ruling6.probe.test.ts`, copy in `runs/`). It adds:
- a re-computation of the felt water from its parts, checked against the game's own sample (off by more than 0.02 m/s on 0 steps in every run);
- for each jump over 0.2 m/s a step, the one part whose change explains most of it (each part swapped alone between the two steps);
- the jump split in the wave's own frame: the **field** part (the same point of the wave one step later) and the **move** part (the board moving through the field);
- the wave speed c the wall water reads, and the board's acceleration.

Six runs, 4–5 min each, one at a time. Logs: `runs/a1` … `runs/a6`. All with `tubeSeam=blend`, pool cases.

Marks: **[measured]** this probe; **[sourced]** a paper opened; **[inferred]** reasoned.

## In short

- **Rank 3 as I wrote it in ruling 4 is aimed at the wrong parts.** The fade length, the nearest-surface switch, the climb term and the 0.85 → 1 ramp explain none of the jumps that are left. [measured]
- **What is left is two noisy inputs.** (1) The case surface's own speed, taken by differencing profile points between frames: 51 % of the jumps in the case and 65 % of their size at 1.5 m, 69 % of their size at 1.8 m. (2) The wave speed c the wall water reads: it is the drawn crest's anchor rate, 7.5–8.8 m/s before the throw on a wave that travels at about 5 m/s, and it changes by up to 0.8 m/s in one step. [measured]
- **The fix is a formula with no differencing.** Water on the face follows the surface (a streamline in the wave's frame), with its speed from the height below the crest. With c taken from the wave's own advance, the felt p99 in the case falls from 2.12 to 0.55 m/s at 1.5 m and from 11.2 to 2.47 at 1.8 m. Jumps fall from 0.71 % to 0.33 % of steps (the 0.6 % bar is met) and from 1.38 % to 0.73 % at 1.8 m. [measured]
- **It does not change one fall.** Passive falls, failed pop-ups and riders stood are the same in every prototype. So the falls that remain are not caused by flow jumps. [measured]
- **0.2 m/s in the case is not reachable by the flow alone.** What remains (0.55) is the flow turning with the surface as the face forms in the last 0.5 s. That is the surface's own motion, not the flow rule. The bar is restated below.
- **Rank 2 (the ends) is dropped** from this queue: the slice weight explains 0 jumps at 1.5 m and 3 of 274 at 1.8 m. [measured]

## 1. The runs (measured)

| Run | Wave | Build | Felt p99 in case (max), m/s | Jumps > 0.2 | Field p99 in case, before / after the throw | c read, before / after (change a step p99) | Board accel p99 in case, m/s² | Passive falls /32 (before / after) | Pop-ups failed, stood |
|---|---|---|---|---|---|---|---|---|---|
| a1 | 1.5 m | blend (main) | 2.12 (3.66) | 0.71 % | 2.18 (both) | as a2 (same code path; logged there) | not logged | 5 (1 / 4) | 8 of 22, 14 |
| a2 | 1.5 m | streamline, c as today | 0.90 (1.19) | 0.49 % | 0.92 (both) | 7.87 / 5.24 (p95 0.80) | 54.3 | 5 (1 / 4) | 8 of 22, 14 |
| a3 | 1.5 m | **streamline, c = the wave's advance** | **0.55 (0.76)** | **0.33 %** | 0.50 / 0.15 | 5.27 / 5.03 (0.20) | 36.0 | 5 (1 / 4) | 8 of 22, 14 |
| a4 | 1.5 m | a3 + `formClock=c1` | 1.04 (1.17) | 0.39 % | 0.98 / 0.11 | 5.29 / 5.11 (0.22) | 41.6 | 5 (1 / 4) | 6 of 20, 14 |
| a5 | 1.8 m | blend (main) | 11.24 (17.3) | 1.38 % | 6.55 / 10.1 | 7.38 / 4.89 (2.10) | 87.5 | 11 (2 / 9) | 4 of 24, 20 |
| a6 | 1.8 m | a3's build | 2.47 (6.25) | 0.73 % | 1.39 / 4.97 | 4.89 / 5.01 (0.20) | 55.5 | 11 (2 / 9) | 4 of 24, 20 |

Unchanged by the prototype, in every pair [measured]:
- the throw: p50 −0.06 m, 95.63 % of 252 within 1 m (1.5 m); p50 −0.12 m, 89.03 % of 319 (1.8 m);
- the surf meter: 1.597 m and 1.935 m, identical to the digit;
- felt p99 for τ < −0.5 s: 0.054–0.061 (bar 0.1).

For reference, the README's blend + c1 without the prototype: felt p99 2.97, jumps 0.72 %. So a4 is 2.97 → 1.04: the switch composes with `formClock=c1`, but c1 is not better here than the default clock.

## 2. What is left, by cause (a1: 142 jumps in the case, sum 96 m/s)

| Part of the wall water | Jumps it explains | Sum, m/s | Verdict |
|---|---|---|---|
| **The surface's own speed** (profile points differenced between frames, times the clock's rate) | 73 (51 %) | 62.3 (65 %) | **The main cause.** Single values swing between +25 and −20 m/s at a small share. |
| The seam share α | 30 | 13.7 | A multiplier of the above: it scales a wrong target. 1 jump left once the target is right (a3). |
| The normal turning | 29 | 12.0 | Stays. It is all that is left in a3 (43 of 50). |
| The wave speed c | 5 | 2.2 | Small as a jump, large as a bias: 7.9 m/s where the wave does 5. |
| The sea's own flow | 3 | 2.0 | Not the case's. |
| The ramp's height share r | 2 | 4.0 | The 3.66 max: the sample point steps 0.5 m up as the lip's edge lands. Also in the pre-tube build. |
| **Nearest-surface weight** | **0** | 0 | Not a cause. (1 jump in a6.) |
| **Depth fade (0.3–0.6 m)** | **0** | 0 | Not reached: the board sits 0.05 m under the surface on every step. |
| **The climb term (÷ n_y)** | **0** | 0 | n_y p50 0.92, p5 0.67: it amplifies by 1.5 at most and never clips. |
| **The 0.85 → 1 ramp (B)** | **0** | 0 | Not a cause. |
| **The lip branch** | **0** | 0 | No board was ever in it: all 208 steps in the case use the wall branch. |

Other facts [measured]:
- Source switches where the case is not above the sea: 35. With a jump: 0 in a3, a4 and a6 (1 in the README's blend run, 5 at 1.8 m in a5).
- The sea itself jumps: 36–44 jumps on the sea at 1.5 m (max 1.5 m/s), 60 at 1.8 m (max 3.2), most in the 0.5 s after the throw. No flow rule for the case can remove these.
- At 1.8 m the same table holds: the surface's own speed explains 142 of 274 jumps in the case and 237 of 343 m/s.

## 3. Ruling on the cause

1. **The wall water takes the surface's speed from the drawn mesh.** `sweptLoft.ts:1461–1464` differences profile points between two frames and multiplies by the clock's rate. The profiles' points slide along the surface, and the clock's rate is not smooth. The result is noise of ±20 m/s. The blend hides it at small α and shows it as α rises in the last 0.5 s. [measured]
2. **The wall water reads the wrong wave speed.** `crashCurve.ts:474` sets `wallSpeed` to the anchor's rate (how fast the drawn crest point moves), not the wave's advance (`celerity`, line 456). Before the throw the anchor runs at 7.5–8.8 m/s. Real water at the crest moves at 0.85 of the wave's speed when the face is vertical [sourced: Derakhti et al. 2020]. 0.85 × 7.9 = 6.7 m/s is a third too fast. [measured + sourced]
3. **The falls that remain are the surface, not the flow.** [measured, then inferred]
   - After the throw (4 of 5 at 1.5 m): every one is the board placed on the break line ("s 55, 0 m out"), τ +0.1 to +0.6 s, as the lip throws over it. That is a passive body going over the falls. The owner's rule calls this correct.
   - Before the throw (1 passive, 2 standing "lost board", all on wave 1, 3–12 m out, τ −0.26 to −0.12): the surface rises 0.4–0.7 m under the board in the last 0.5 s. The board's acceleration in the case is p99 36 m/s² against 8 on the sea, with the flow already quiet. The α course lifts the surface faster than a real face rises. [inferred: not isolated by a run]
   - At 1.8 m, 4 of the 9 after-throw falls are a probe artefact: "s 70, 3 m out" is placed onto a 1 m wall already thrown (τ +0.6 to +0.9) and falls 0.5–0.7 s after placement. [measured]
4. **A real face is not this unsteady, but it is not still either.** Away from the jet the water accelerates at −0.39 g to +0.32 g [sourced: Longuet-Higgins 1986], about 0.06 m/s a step. On the front face under the forming lip accelerations exceed g [sourced: Chang & Liu 1998 report the jet entering at 1.1 g; New, McIver & Peregrine 1985 compute "five or six times" gravity under the crest, which I saw only in a search excerpt of the paper, not on the page I opened]. 2 g is 0.33 m/s a step. So a 0.2 m/s bar on the total felt change inside the last 0.5 s is tighter than real water. [inferred]
5. **A board overtaken by the wave crosses a real gradient.** The flow goes from about −0.5 m/s in the trough to 0.85 c at the crest over 1–3 m. A passive board moving 2–4 m/s against the wave feels 0.08–0.25 m/s a step from that alone. The bar must be on the field part, not the total. [inferred]

## 4. Rank 3, buildable: the streamline wall water

**Switch:** `?wallBody=stream`, opt-in. It needs `tubeSeam=blend` (it uses the seam share). It composes with `formClock=c1` (run a4). Without the switch the build is bit-identical.

**The rule.** In the frame moving with the wave at c the forming face is nearly steady, so the surface is a streamline and the speed along it follows the height [sourced: the steady free-surface form, Crew & Trinh 2016; inferred: applied to a forming, not steady, wave].

In the plane of the ray r̂ and up, with the surface's unit normal (n_a along the ray, n_y up):

- speed along the surface in the wave's frame: **q = √(q_c² + 2 g (y_top − y_s))**
- at the crest: **q_c = (1 − B) c**
- felt water in the lab frame: **along the ray = c − q n_y**, **up = q n_a**
- the across-ray flow stays the sea's.
- the change is weighted: **flow = sea + w (target − sea)**, **w = slice weight × seam share α**.

| Symbol | Value | Mark |
|---|---|---|
| c | The wave's own advance along the ray: `celerity` (`crashCurve.ts:456`), not `anchorRate`. Read as 4.9–5.3 m/s here, changing ≤ 0.20 m/s a step at p99. | measured; the choice is inferred |
| B | `seamB`: 0.85 before the throw, ramp to 1 over 0.2 s after it (`sweptLoft.ts:1373`, `tubeSeam.ts:53`). Kept as it is. | 0.85 sourced (Derakhti et al. 2020, at the vertical tangent); the 0.2 s ramp inferred |
| y_top | The slice's crest height, `wallTop` (`sweptContact.ts:429–433`). | built |
| y_s | The surface the rider touches at this sample (`out.surfaceY`), so flow and contact stay one water. | built |
| g | 9.81 m/s² | — |
| n | The normal of the nearest surface, as `wallFlow` reads it today (`this.hit`). | built |
| w | `wallWeight` × the seam share (`hit.seam`, `sweptContact.ts:424–428`). | built (ruling 5) |
| Depth fade | Keep 0.3–0.6 m (`WALL_WATER.fade`, `PhysicalSurfWater.ts:1065`). Never reached by a board in these runs. | provisional |
| Nearest-surface blend | Keep `NEAREST` (`sweptContact.ts:151`) as it is. Measured: not a cause. | measured |

**What the numbers give** (c = 5 m/s) [inferred from the formula]:
- at the crest before the throw: 4.25 m/s forward; after it: 5 m/s;
- half way down a 45° face, 0.5 m under the crest: 2.8 m/s forward and 2.2 m/s up;
- at the foot (flat, 1.5 m under the crest): about −0.4 m/s, the trough's back-flow, which is what the sea already has there. The seam share is 0 there anyway.

**Under the lip and in the falling sheet.**
- Under the roof the nearest surface's normal points down (n_y < 0). The same formula then gives water moving forward faster than c and falling. No special case.
- The thrown sheet itself keeps `lipFlow` (`PhysicalSurfWater.ts:905–913`): the ballistic lip's own velocity. A real jet tip outruns the wave [sourced: Chang & Liu 1998], which the streamline rule with q_c = 0 does not give. Do not replace `lipFlow`.
- No board entered the lip branch in any run. This part is untested. [measured: 0 steps]

**What a rider feels at the break line after the throw.** B = 1, so the crest water moves with the wave (5 m/s), and the face under it draws up and back toward the lip at √(2 g × drop). Measured in a3 after the throw: field p99 0.15 m/s a step (quiet), move p99 0.34. A board left on the break line is still lifted and thrown: that is the surface, and it is correct.

**The smallest build** (two edits and a switch):
1. `src/physics/PhysicalSurfWater.ts:921–942` (`wallFlow`): behind the switch, call the streamline rule in place of `wallWaterFlow`, before the `sweptBlend` test at line 930. The prototype's `streamWallFlow` is in the worktree and in `runs/prototype.diff`. Add the depth fade to it.
2. `src/wave/barrel/crashCurve.ts:474`: behind the switch, `p.wallSpeed = celerity`. Check with the pin-track identity that nothing changes with the switch off. With it on, the throw and the meter were identical in a3 and a6.
3. Parse the switch beside `tubeSeam` (`src/game/PhysicalMode.ts:617–640`) and pass it as an option like `sweptBlend` (`PhysicalSurfWater.ts:489`).
4. With the switch on, `wall.along` / `wall.up` (`sweptLoft.ts:1453–1467`) are no longer read by the rider's water. Leave them for the default.
5. Unit tests: crest value (0.85 c and c), the 45° face value above, a flat foot, w = 0 returns the sea, a downward normal.

**What it does not do.** It does not remove one fall (section 1). It does not reach 0.2 m/s in the case. If the owner's ride shows no difference, the build is still worth keeping for 1.8 m (11.2 → 2.5) and because it removes the two noisy inputs, but it is not the fix for falling.

**What would fix what is left** (ranked, none built):
1. **The surface's rise in the last 0.5 s.** The α course lifts the surface by up to α̇ × (case − sea) ≈ 1–2.4 m/s and the flow does not carry that rise [inferred]. First measure it: log the surface's vertical speed at the board against the flow's. Then either add the rise to the up-flow (one water: the flow must match the surface it is on) or lengthen the course. This is the best lead for the 3 pre-throw falls.
2. **The normal's turning** (43 of 50 jumps left in a3, 35 of them in the last 0.5 s, mostly the field part). Two possible causes, not split here: the mesh's facet normals, or the clock stepping the profile (one logged step shows the case's height dropping 8 cm at a fixed point). Log the normal at a fixed point of the wave to tell them apart. Do not low-pass the flow: that would be a hidden filter.
3. **At 1.8 m after the throw**: the height drop itself jumps (33 jumps, max 2.3 m/s) as `wallTop` and the sample's surface step under the landing lip. Same family as the 0.5 m surface step in section 2.

## 5. The bars, restated

"Case" means the board is in the case's water (hc > 0.02 m). 1.5 m, pool cases, `tubeSeam=blend` with the new switch.

| # | Bar | Blend today (a1) | Streamline (a3) | Verdict |
|---|---|---|---|---|
| 1 | The wall water's c changes ≤ 0.2 m/s a step (p99) and stays within ±20 % of the wave's advance | p95 0.80; 7.9 vs 5 | 0.20; 5.0–5.3 | **Pass** |
| 2 | Jumps over 0.2 m/s ≤ 0.6 % of steps | 0.71 % | 0.33 % | **Pass** |
| 3 | No jump over 0.2 m/s at a source switch (was "switches: 0") | 1 of 35 | 0 of 35 | **Pass** |
| 4 | Field part in the wave's frame, in the case, after the throw: p99 ≤ 0.2 m/s | 2.18 (both) | 0.15 | **Pass** |
| 5 | Field part, in the case, before the throw: p99 ≤ 0.33 m/s (2 g) | 2.18 (both) | 0.50 | **Miss** (the normal's turning; section 4, what is left 2) |
| 6 | Total felt p99 in the case ≤ 0.6 m/s (was 0.2; a regression bar, not a physical one) | 2.12 | 0.55 | **Pass** |
| 7 | Felt p99 ≤ 0.1 m/s for τ < −0.5 s | 0.058 | 0.054 | **Pass** |
| 8 | Seam flow across 0.25 m for τ −1 to −0.5 s: no more than the same reading for τ < −1 s plus 0.1 m/s | p90 0.29 vs 0.23; max 0.69 vs 0.25 (miss at the max) | p90 0.28, max 0.30 vs 0.23, 0.25 | **Pass** |
| 9 | Passive falls before the throw ≤ 3 of 32; pop-ups failed ≤ 8 of 22; stood ≥ 14 | 1; 8; 14 | 1; 8; 14 | **Pass** (unchanged) |
| 10 | Throw's place and time, and the surf meter, identical | — | identical | **Pass** |
| 11 | Board's acceleration in the case p99 ≤ 10 m/s² (ruling 4's) | not logged | 36 | **Miss.** Not rank 3's: it is the surface's rise (section 4, what is left 1). |

Falls after the throw on the break line are listed, not barred.

## 6. The README's open questions

1. **"Source switches: 0".** It means no jump at a switch. A count of switches is how a blend works. Bar 3 above. Met: 0 of 35.
2. **The 0.2 m/s seam-flow bar.** It sits at the sea's own level (0.16–0.25 m/s for τ < −1 s, where the case is absent). Restated as bar 8: the sea's own reading plus 0.1.
3. **The pop-up script's 8 of 22.** Not the tube's water. 6 are "balance" falls on the sea (hc 0) with no flow jump in their last 0.4 s; 4 of those are "balance (landing)" at 18 m out at the same instant on two waves. The other 2 are "lost board (push)" at τ −1.46 s, on the sea, no jump. The pre-tube build has the same 8. Whether it is the script or the rider is outside the water's scope. Keep "no worse than the pre-tube build" as the bar. [measured; the script-or-rider part is not judged]
4. **Own bars for 1.8 m.** Yes, reported apart and not gating 1.5 m. Drop the "s 70, 3 m out" placement from the passive count (4 falls, placed onto a thrown wall: a probe artefact), or place it 1 s earlier. Then 1.8 m reads 7 of 28 (2 before, 5 after the throw on the break line). Use bars 1, 3, 7, 9, 10 as they are; for bars 2 and 6 record a6's 0.73 % and 2.47 m/s as the level to beat. [measured + inferred]
5. **The default flip.** The owner's call, after riding. My advice: `tubeSeam=blend` is ready to be the default once ridden (every measure is better or equal, the throw and meter identical). `wallBody=stream` stays opt-in until it is ridden too.

## 7. Rank 2 (the ends, α_σ)

**Dropped from this queue.** The slice weight is the dominant part of 0 jumps at 1.5 m and 3 of 274 at 1.8 m (sum 0.8 of 343 m/s) [measured]. `wallWeight` already fades the ends. Reopen only if the owner sees a step in the drawn tube at its ends: that would be a looks item, not the rider's.

## 8. What the Basilisk velocity data is for

When the owner has run `tools/basilisk/run_velocity.sh` (u, v at five depths under each of 128 profile points, per frame; `docs/research/pool-tube-flow/README.md`):

| Check | Confirms or replaces |
|---|---|
| Surface speed at the crest over the wave's speed, by frame | B: 0.85 at the vertical tangent, and the time it takes to reach 1. Replaces the inferred 0.2 s ramp. |
| Speed along the face against the height under the crest, in the wave's frame | q² = q_c² + 2 g × drop. If it misses by more than 20 %, replace the formula by a table per frame (q over c against drop over H). |
| The wave's own advance in the run against √(g h) | c: confirms `celerity` and the 20 % band of bar 1. |
| Speed at 1.5 cells, 0.01, 0.02, 0.05, 0.1 h0 under the surface | The depth fade (0.3–0.6 m today, provisional). Replaces it with the measured decay. |
| Velocity in the jet and under the roof | The roof's flow, and `lipFlow`'s speed against the ballistic value. The jet tip should outrun c. |
| The surface's acceleration frame to frame on the front face | Bar 5's 2 g (0.33 m/s a step). |
| The surface's rise speed against the flow's up part at the same point | Whether "what is left 1" is right: in the simulation they agree by construction; in the game they should too. |

## The owner's calls

1. Flip `tubeSeam=blend` to the default? Ride it first (question 5).
2. Are passive boards thrown at the break line after the throw "over the falls, correct"? I read the standing rule as yes and have listed them apart.
3. Accept bar 6 (0.6 m/s total) and bar 5 (2 g on the field part) in place of the old 0.2 m/s in the case?
4. Build rank 3 now, knowing it cleans the water but saves no fall, or go first to the surface's rise in the last 0.5 s?

## State of the worktree

Branch `claude/wall-body` at 4806cb86. Nothing committed, nothing pushed. Uncommitted, left in place as the start of the build (scratch quality; marked "RULING-6 … not for commit"):

- `src/physics/PhysicalSurfWater.ts` (+57 lines): `streamWallFlow` and its call in `wallFlow` behind the environment variable `R6=stream`; a `debug` record the probe reads.
- `src/wave/barrel/crashCurve.ts` (1 line): `wallSpeed = celerity` behind `R6C=pace`.
- `src/wave/probes/ruling6.probe.test.ts` (untracked): the attribution probe.

With neither variable set the game's water is as on main (run a1 reproduces the README's blend numbers: 5 falls, 8 of 22, 14 stood, 0.71 %, 2.12). To clean: `git checkout -- src/physics/PhysicalSurfWater.ts src/wave/barrel/crashCurve.ts && rm src/wave/probes/ruling6.probe.test.ts`. The diff and the probe are also saved in `runs/`.

Rerun: `R6=stream R6C=pace PROBE=1 H=1.05 CASE=pool SWITCHES=tubeSeam=blend LOG=<file> npx vitest run src/wave/probes/ruling6.probe.test.ts`

## Sources (opened unless marked)

- Derakhti, Kirby, Banner, Grilli & Thomson 2020, "A unified breaking onset criterion for surface gravity water waves in arbitrary depth", https://arxiv.org/abs/1911.06896 (B = 0.85).
- Longuet-Higgins 1986, "Eulerian and Lagrangian aspects of surface waves", JFM 173 (accelerations −0.39 g to +0.32 g; from the earlier rulings' notes).
- Chang & Liu 1998, "Velocity, acceleration and vorticity under a breaking wave", Phys. Fluids 10, abstract at https://researchoutput.ncku.edu.tw/zh/publications/velocity-acceleration-and-vorticity-under-a-breaking-wave/ (jet enters at 1.1 g, 88° down; the tip outruns the phase speed).
- Crew & Trinh 2016, "New singularities for Stokes waves", JFM 798 (the steady surface as a streamline with Bernoulli's condition).
- New, McIver & Peregrine 1985, "Computations of overturning waves", JFM 150, https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/computations-of-overturning-waves/1C114232AF35590F75E52775F7B41044 (abstract opened; the "five or six times gravity" line seen only in a search excerpt).
