# Ruling 5: what throws the rider off the forming wave body, and the blend that stops it (2026-11-11)

The water-physics advisor read the worktree at main fabb0bc0 and made no repo edits. The owner's ride, 2026-11-11: the surfer falls on contact with the wave; the wave and the tube body do not match. Goal: from the default start, paddle, catch, pop up, stand and ride the face without falling until the tube.

**Method.** An instrumented scratch copy of `src/wave/probes/proneSeam.probe.test.ts` (deleted afterwards; `git status` clean). It adds a solver-only water beside the game's, logs every felt-water jump over 0.2 m/s a step with the answering source, the slice clock τ, the case's height over the solver's surface (hc) and the arc position, and names each jump's cause by swapping one group of the wall water's inputs at a time (`wallWaterFlow`, `PhysicalSurfWater.ts:1042–1084`). A wrapper prototypes blends without touching game code. 8 runs, pool cases, H 1.05 ("1.5 m"), 4 waves, 32 passive boards and 24 scripted rides each, about 4 min a run. Logs: `scratchpad/ruling-5/runs/r1…r8`, `profile.txt`.

Marks: **[measured]** this probe; **[sourced]** a paper opened; **[inferred]** reasoned.

## In short

- **The falls are the case's water and shape arriving about 1 s too early, not the seam alone.** From τ ≈ −1.5 s a bump 6 cm high carries a flow 3.3 m/s different from the solver's under it [measured]. Real water on a face that is not yet vertical moves slower than 0.85 of the crest speed [sourced]; the game sets 0.85 from the case's first step (`sweptLoft.ts:1362`).
- **Most jumps are at the seam; most falls are in the wall.** 73 % of jumps happen where the case is not above the solver at all. But of the 22 hold releases that have jumps, 15 (68 %) are inside the wall, and 18 (82 %) are in formation, τ −1.6 to −0.1 s [measured].
- **Rank 2 as written is not enough.** A height band alone (flow and surface, 0.25 m, no τ course) left 12 passive falls and 15 of 22 failed pop-ups. A τ course alone (τ −0.5 → 0 s, flow and surface) gave 7 and 8 of 22, with 14 stood: the pre-tube's pop-up numbers [measured].
- **Flow and surface must both follow the course.** Gating only the flow fixed the passive falls (15 → 6) but not the pop-ups (18 of 22 still fail, 12 by "lost board" with no flow jump at all) [measured].
- **Build next:** rank 2 with a τ course, one weight for the drawn surface, the collided surface and the flow. Rank 3 stays behind it. The throw's time and place do not move.
- **Not reached by any prototype:** felt p99 ≤ 0.2 m/s in the case (best 1.8). The rest sits in the last 0.5 s and after the throw; that is rank 3's.

## 1. The runs (measured, this probe)

| Run | Build | Passive falls /32 | Pop-ups failed /22 | Stood | Felt p99 in case, m/s | Jumps > 0.2 (share of steps) |
|---|---|---|---|---|---|---|
| README | Pre-tube | 2 | 8 | 14 | 0.06 | — |
| README | `tubeForm=old` | 5 | 8 | 14 | 1.50 | — |
| r2 | **Default** (reproduces the README's 15, 18, 3.82) | 15 | 18 (12 lost board, 6 balance) | 4 | 3.82 | 1152 (4.99 %) |
| r5 | Flow only, height band 0.25 m | 12 | 16 | 6 | 3.57 | 394 (1.63 %) |
| r7 | Flow + surface, height band 0.25 m | 12 | 15 | 7 | 4.55 | 378 (1.56 %) |
| r4 | Flow only, τ course −0.5 → 0 s | 7 | 18 (12 lost board, none with a jump) | 4 | 1.83 | 546 (2.25 %) |
| r6 | Flow only, τ course × band | 6 | 18 (12 lost board, none with a jump) | 4 | 1.77 | 132 (0.53 %) |
| r8 | Flow + surface, τ course −1.0 → −0.25 s | 11 | 10 | 12 | 3.04 | 857 (3.53 %) |
| r3 | **Flow + surface, τ course −0.5 → 0 s** | **7** | **8** | **14** | 2.31 | 722 (2.88 %) |
| r1 | As r3, but `surfaceAt` left as today | 7 | 8 | 14 | 2.42 | 730 (2.91 %) |

Not run (8-run limit): flow + surface with τ course × band together; the a38 case; 1.8 m; `formClock=c1` under the blend. The overturned part (air under it) was left as the union in every prototype.

## 2. Where the default's jumps come from (r2, n 1152, sum 1145 m/s)

| Class | Share of jumps | Share of summed size | Where |
|---|---|---|---|
| **(a) Seam: the case not above the solver (hc ≤ 0.02 m)** | **73 %** | **76 %** | |
| – answering source switches solver ↔ wall | 23 % | 43 % | p50 1.6, p90 3.8, max 5.7 m/s; τ −1.6 / −1.0 / −0.3 s (p10/p50/p90); arc 0.13 / 0.52 / 0.81; 5 m behind to 3 m ahead of the crest |
| – wall water applied on the solver's own surface: surface speed | 30.5 % | 20.5 % | τ −1.65 / −1.24 / −0.62 s |
| – same: crest speed | 13.7 % | 12.4 % | Back slope, 1.5–5.4 m behind the crest |
| – same: slice weight, normal turning | 6.2 % | 2.8 % | |
| **(b) Inside the wall (hc > 0.02 m)** | **26 %** | **24 %** | |
| – the surface's own motion (kinematic speed) | 12.2 % | 9.2 % | hc 0.04 / 0.18 / 0.31 m; 0.4–3.3 m ahead of the crest |
| – nearest-surface switch | 5.0 % | 6.7 % | max 21.1 m/s |
| – slice weight, normal turning, crest speed, ramp height | 8.7 % | about 8 % | |
| **(d) The solver itself** | 0.6 % | under 1 % | |

**(c) By stage** (cuts across the rows above): forming over a wave the solver has not broken 76 % of jumps (80 % of size); forming, solver broken 13 % (15 %); thrown 9 % (5 %); no slice 2 %.

**Why the seam flickers.** The loft clamps every vertex under the solver's surface up onto it (`sweptLoft.ts:1459–1470`). The two surfaces then coincide over the whole lower face and back, and the test `hit.surfaceY >= plainY` (`PhysicalSurfWater.ts:793`) flips step to step. When it says "wall", the wall water applies at full weight (`:902–907`; the 0.25 m band at `:911–916` runs only under `sweptBlend`).

**The case against the solver under the board** (steps with hc > 0.02 m):

| τ, s | hc p50 / p90, m | \|case flow − solver flow\| p50 / p90, m/s | Case slope p50 / p90 | Solver slope p50 / p90 |
|---|---|---|---|---|
| under −1.5 | 0.05 / 0.19 | 0.96 / 2.38 | 11 / 21° | 3 / 10° |
| −1.5 to −1 | 0.06 / 0.25 | 3.33 / 4.00 | 6 / 20° | 2 / 9° |
| −1 to −0.75 | 0.13 / 0.37 | 3.70 / 4.05 | 13 / 38° | 6 / 17° |
| −0.75 to −0.5 | 0.25 / 0.41 | 3.82 / 4.43 | 33 / 41° | 16 / 19° |
| −0.5 to −0.25 | 0.30 / 0.63 | 3.90 / 4.67 | 33 / 55° | 17 / 20° |
| −0.25 to 0 | 0.18 / 0.78 | 2.37 / 4.92 | 16 / 45° | 13 / 15° |
| 0 to 0.25 | 0.08 / 0.19 | 0.38 / 0.92 | | |

59–86 % of these steps before the throw carry a jump over 0.2 m/s. The case's surface moves against the solver's at p90 1.4–3.8 m/s.

**Hold releases, default: 27 "lost board"** (15 passive, 12 rides).
- 5 have no jump: the probe's own (a placement at 0.22 s; rides from 12 m that also fail pre-tube).
- Of the 22 with jumps: 18 in formation (τ −1.6 to −0.1 s, solver slope 2–20°); 4 at the break line after the throw (s 55, τ +0.2 to +0.4 s, case 40–50°, solver 21–25°). Those 4 stay in every prototype.
- By dominant class: in-wall surface speed 10, nearest-surface switch 2, slice weight 2, in-wall crest speed 1 (15 in the wall); source switch 6, crest speed on the solver's surface 1 (7 at the seam).

## 3. Ruling on the cause

**(a) Rank 2 is the right family, but it needs a course in τ, and the band's zero must be the solver's surface.** Three things come first inside it:
1. The wall water gets zero weight wherever the case's surface is the solver's. That removes the source switch: 73 % of jumps, 7 of 22 falls [measured].
2. The case's flow may not exceed the solver's until the face nears vertical [sourced, below; measured: r4, r6].
3. The case's surface under the rider follows the same course [measured: r3 against r4; r7 shows the band alone does not do it].

Rank 3 (one streamline flow, one nearest surface) stays behind this; it owns what is left in the last 0.5 s and after the throw.

**(b) What a prone board feels on a steepening unbroken face** in the last 1–1.5 s:
- **Water speed.** The crest's surface water moves at B = U/C of the crest speed. B reaches 0.85 "close to a time at which a vertical tangent appears" on the front face (solitary waves on slopes), and passes 1 shortly after [sourced: Derakhti et al. 2020]. Below the crest the water is slower still. So before the face is vertical no water on it runs at 0.85 C. The game applies B = 0.85 for every τ < 0 (`sweptLoft.ts:272`, `:1362`), up to 1.6 s early.
- **How fast B rises.** dB/dt at the threshold, times the wave's period, is 0.45–1.62 [sourced: Derakhti, Banner & Kirby 2018, focused packets, deep and intermediate water]. That puts 0.85 → 1 in 0.09–0.33 periods there; for our shoaling cases the figure is [inferred].
- **Accelerations.** In steep unbroken waves a water particle's acceleration lies between −0.39 g and +0.32 g [sourced: Longuet-Higgins 1986, abstract]. At 60 steps a second that is at most 0.064 m/s a step for the water itself. The 0.2 m/s bar on the felt water (ruling 4) stands.
- **Our own profiles** [measured, `profile.txt`; τ in √(h0/g), one unit ≈ 0.5–0.6 s]: steepest face 20–21° at −3.0, 28° at −2.0, 41–44° at −1.0, 56° at −0.5, 60–73° at −0.25, vertical at −0.03 to −0.10, 95–106° at 0. So the vertical tangent is at the throw, where the source puts B ≈ 0.85.
- **Gravity along the face** g sin θ: 4.6 m/s² at 28°, 6.4 at 41°, 8.1 at 56° [inferred from those slopes]. This, and the solver's own flow, is all a board should feel before the last half second.
- **Surface against flow.** In the wave's frame the surface is a streamline, so Δq ≈ g δ / q. Where the surfaces differ by δ = 0.06 m at q ≈ 4 m/s, the flows may differ by about 0.15 m/s, not 3.3 [inferred].

**(c) How early may the case differ?** No source sets a time. The physical limits are B < 0.85 until the vertical tangent and the acceleration bounds above. The measured answer for this build: a course starting at −1.0 s (r8: 11 passive falls, 10 of 22) is worse than one starting at −0.5 s (r3: 7, 8 of 22).

**Not separated:** why the early *shape* fails pop-ups with the flow already quiet (r4, r6: lost in the push at τ −1.47 to −0.83 s, hc 0–0.29 m, case slope 7–29° against the solver's 2–12°). A real 20–40° unbroken face is ridable, so I read this as the case's surface moving against the solver's (p90 1.4–3.8 m/s), not as the slope [inferred]. The −0.5 s onset is therefore a provisional bound for the build, to be moved earlier once the surface's vertical acceleration at the board stays inside −0.39 to +0.32 g.

## 4. The blend, buildable

One weight α for three things: the drawn loft, the collided surface and the flow. One weight for surface and velocity is how coupled wave models do it [sourced: relaxation zones, Jacobsen et al. 2012 as given in Higuera 2018; their zone weight is a smooth exponential with exponent 3.5].

y = y_s + α (y_c − y_s), u = u_s + α (u_c − u_s), α = α_h · α_σ · α_τ, with S the smoothstep.

| Factor | Form | Value | Mark |
|---|---|---|---|
| α_h, up the face | S(δ / b), δ = y_c − y_s at the point; 0 for δ ≤ 0 | b = 0.25 m at H 1.05; scale as 0.25 H | [measured] r5–r7 cut jumps 1152 → 378–394, and 546 → 132 under the τ course. The H scaling is [inferred]. The Bernoulli line above is the reason. |
| | Replaces the clamp `max(still + above, heightAt)` and the flag at `:793`. δ·S(δ/b) is smooth at δ = 0, so the back slope and the foot need no special case. Arc length from the anchor gives the same thing on the face but not on the back; use δ. | | |
| α_σ, at the ends | S over a length L_σ from each end | L_σ = max(H, 6 × the wall's height at the end, the crest length the throw sweeps in 0.5 s) | [inferred]: 6 × is ruling 4's 10° lateral bar. Not measured this round. |
| α_τ, in formation | S((τ − τ_on) / (τ_full − τ_on)) | τ_on = −0.5 s, τ_full = 0 | [measured] r3, r8, r7. [sourced] in kind: B = 0.85 at the vertical tangent, which our profiles put at τ ≈ 0. |
| The flow's target | Before: 0.85 C at full α, so the crest reads 0.85 C exactly at τ = 0. After: 0.85 → 1 over 0.2 s, C1, not a step. | `WALL_FLOW.before / thrown` | 0.85 and "shortly after" [sourced]; 0.2 s [inferred]. Today's step at τ = 0 is 0.15 C ≈ 0.7 m/s. |

- **τ is the C1 clock's.** With `formClock=c1`, α_τ is C1 in time. Under the old clock it inherits the jerks.
- **The existing formation weight** already ramps the slice in over 0.3 s from its first step (`sliceClock.ts:208`, `:401–404`). The smallest build re-times that ramp to end at τ = 0 and makes the wall water read it. Check that it scales the loft and the flow alike [inferred from the code read; not run].
- **Where the plain union (max) must stay:** only where the case has air under it (a floor and a ceiling answer: the lip past the vertical tangent, the tube's roof and the falling sheet), which is τ ≥ about 0. There α = 1 and the surfaces are two real surfaces. The prototypes kept it so.
- **What the player sees.** The drawn face stays the solver's (about 17–20°) until half a second before the throw, then stands up to vertical in that half second and throws at the same place and time as today. Less early wall, more sudden jacking.

## 5. Build, ranked

| Rank | Build | Code | Switch | Bars |
|---|---|---|---|---|
| 1 | The blend of §4: α_h on δ, α_τ −0.5 → 0, one α for loft, contact and flow; B ramp after the throw | `sweptLoft.ts:1459–1470`, `:272`, `:1362`; `PhysicalSurfWater.ts:775–813`, `:902–916`, `:1040–1084`; `sliceClock.ts:208`, `:401–404` | `?tubeSeam=blend` (opt-in), with `seamTau=on,full` and `seamBand=m` for tuning | Below |
| 2 | The ends over L_σ | `sweptLoft.ts:64–92` | same | Lateral slope ≤ 10° (provisional) |
| 3 | Ruling 4's rank 3: one nearest surface, streamline flow | `PhysicalSurfWater.ts:837`, `sweptContact.ts:145`, `:528` | `?wallBody=…` | Felt p99 in the case ≤ 0.2 m/s; no jump over 5 m/s |

**Rank 1's bars** (this probe, pool cases, H 1.05, 4 waves; run with the default clock and with `formClock=c1`):
- Pop-ups failed ≤ 8 of 22 and stood ≥ 14 (the pre-tube's and `tubeForm=old`'s; the prototype met both).
- "Lost board" in the push with no jump over 0.2 m/s: no more than the pre-tube's.
- Passive prone falls before τ = 0: ≤ 3 of 32 (pre-tube 2; the prototype had 3). Falls at the break line after the throw are listed apart (prototype 4; `tubeForm=old` has 5 in all).
- Source switches where hc ≤ 0.02 m: 0. Jumps over 0.2 m/s: ≤ 0.6 % of steps (r6: 0.53 %); for τ < −0.5 s the felt p99 ≤ 0.1 m/s (the gate gave 0.04–0.09).
- Seam: height step ≤ 0.01 m, slope jump ≤ 3°, flow jump ≤ 0.2 m/s across 0.25 m, at every τ (ruling 4's, kept).
- Unchanged: the contour throw's place and time (within 1 m, 0.1 s), meter ±5 %, visible holes 0.
- **Formation bar 7 restated:** the clock still starts within 0.1 s of τ_e; the body's weight starts at τ_on.
- Felt p99 ≤ 0.2 in the case is **not** a bar for rank 1; report it (prototype 1.8–2.3). It is rank 3's.

## 6. The form-clock README's questions 3 and 4

- **3, resting on the slow bound.** A clock that sits on 0.5× smoothly is within the bar's intent; the harm was switching between bounds. Restate the bar as "no switching": |Δτ̇| p99 ≤ 0.02 a step, and report time on a bound without failing on it [judgement].
- **4, the throw about 0.1 m late.** Accept it. It is a tenth of the 1 m crest cell and of the contour bar's 1 m. Do not add a lead to hide it [judgement].

## The owner's calls

1. **The look.** The blend keeps the gentle solver face until 0.5 s before the throw, then the wall stands up fast. One water rules out drawing the early wall while colliding the gentle one. If the early wall matters more, the onset can move earlier only as far as the acceleration bound in §3(c) allows; that needs measuring after the build.
2. **The 4 passive falls at the break line just after the throw** (τ +0.2 to +0.4 s). They look like "over the falls", which the owner has called correct. Confirm they are not counted against the build.
3. **Standing.** Scripted standers still fall by balance within about 1.5 s in every build, the pre-tube included. Only the owner's ride judges the face after the pop-up.

## Sources (all opened; PDFs read as text)

- Derakhti, Kirby, Banner, Grilli & Thomson 2020, "A unified breaking onset criterion for surface gravity water waves in arbitrary depth": https://arxiv.org/pdf/1911.06896
- Derakhti, Banner & Kirby 2018, "Predicting the breaking strength of gravity water waves": https://arxiv.org/pdf/1802.03586
- Higuera 2018, "Enhancing active wave absorption in RANS models" (relaxation zones; the Jacobsen et al. 2012 weight): https://arxiv.org/pdf/1810.03492
- Longuet-Higgins 1986, "Eulerian and Lagrangian aspects of surface waves", JFM 173 (abstract only): https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/eulerian-and-lagrangian-aspects-of-surface-waves/85E5162ADEE39B8E315656DA2F3B6541
- Ruling 4 and its sources: `docs/research/pool-tube-track-2026-11-05/advisor-ruling-4.md`
