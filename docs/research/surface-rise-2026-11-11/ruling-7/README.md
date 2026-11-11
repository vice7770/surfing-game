# Ruling 7: the water must carry the surface's rise, but the surface must rise smoothly first

Water-physics advisor, 2026-11-11. Wave Pool Barrel, "1.5 m" (H = 1.05 at the feed), `tubeSeam=blend,wallBody=stream`, main at b872a11e.
Every claim is marked *measured* (my runs m1–m3, beside this file), *sourced*, or *inferred*.

## The short answer

1. **Yes, the water must carry the surface's rise.** That is the free-surface rule, ∂η/∂t + u·∇η = v (*sourced*). Carrying it works: with the rise in the flow, a standing board stays at the surface (0.08 m under at the median, against 0.30 m) (*measured*, m3).
2. **But not on today's surface.** Today's rise is jerky, and the jerks go straight into the felt water: felt p99 0.55 → 2.05 m/s, jumps 0.33 % → 0.67 % (*measured*, m3). Two of ruling 6's bars break.
3. **The tail is not the height band and not mainly the clock.** It is the hand-over share jumping at a place, because the front points that carry the clock sit on 1 m cell centres and hop a whole cell in one step (*measured*).
4. **It will not move the fall counts much.** Only 3 falls before the throw belong to the tube, all on wave 1. Carrying the rise left the counts unchanged (*measured*, m3). The gain is a board that rides on the face instead of sinking into it.
5. **Order of work:** smooth the surface's hand-over at the source, then carry its rise.

## 1. What the tail is made of (*measured*, run m1)

I split the surface's own rise R, at a point carried with the wave, into exact parts (the leftover is 0.00):

R = sea part + hand-over rate + height-band rate + case's shape change + anchor slip

| Part | What it is | Size p50 | p95 | max (m/s) |
|---|---|---|---|---|
| R, the whole | | 1.10 | 3.50 | 4.72 |
| Sea part | the solver's own rise | 0.02 | 0.14 | 0.35 |
| **Hand-over rate** | the share's time course × the case's height over the sea (α̇_τ · δ) | **0.85** | **3.15** | **5.78** |
| Height-band rate | the band α_h changing | 0.00 | 0.27 | 1.33 |
| Shape change | the case's own frames, seen from its anchor | 0.23 | 2.04 | 5.11 |
| **Anchor slip** | the case sliding forward through the wave × its slope | 0.40 | 2.29 | 3.22 |

124 samples in the case, τ −1 to 0 s. In the tail (|R| > 2 m/s, 36 samples) the largest part is the hand-over rate in 31 and the slip in 5.

| Suspect in the brief | Verdict | Evidence |
|---|---|---|
| Height band α_h | No | p95 0.27 m/s (*measured*) |
| The sea | No | p95 0.14 m/s (*measured*) |
| Mesh facets, nearest-surface pick | Not seen | the split closes exactly with no such term (*measured*) |
| Clock's rate bounds | Partly | 84 % of steps sit on a bound; the rise tops out near 4.5 /s × 0.7 m ≈ 3.2 m/s (*measured*) |
| The case's frame-to-frame change | Small part | p50 0.23, a few spikes of 3–5 m/s (*measured*) |
| **Front points hopping a cell** | **Main cause of the falls of −3 to −12 m/s** | below |
| **Anchor running ahead of the wave** | Second cause, late | below |

### The share falls at a place (*measured*)

- The share α should only rise before the throw. At a point carried with the wave it **fell on 15 of 99 steps** (m1) and 16 of 107 (m2).
- The clock implied by the share at that place ran from −3.1 to +1.7 (m1). The front point's own clock ran 0.5 to 1.5.
- **The smooth clock does not cure it.** With `formClock=c1` the point clock is steady (1.14–1.30, spread 0.04), yet the share still fell, by up to 0.25 in one step. The tail got worse: R p99 3.96 → 12.3 m/s (m2). This explains k5.
- Cause: τ changes by 0.16 s per metre along the crest at the median (0.25 at p95). So the share goes from 0 to 1 across about 2–3 m of crest. The front points sit on cell centres (x 80.5, 81.5 …; z −199.5, −198.5) and hop one cell at a time. A hop moves a point's place along the crest by 0.4 m in one step (σ 6.83 → 7.24 at t 69.750; 5.41 → 5.83 at t 69.983). The whole ramp shifts with it.
- 14 of the 18 steps where the share fell had a front point hopping that step. On the other steps the rate is 48 of 112. (*measured* link; the mechanism is *inferred* from it.)
- Size check: a 0.4 m shift × 0.16–0.25 s/m × a slope of up to 3 /s gives a share jump of 0.2. Times 0.7 m of height, in 1/60 s, that is 8 m/s. Matches. (*inferred*)

### The case slides through the wave (*measured*)

- Before the throw the case's anchor is on its speed cap on every sample (124 of 124). It runs 2.5–2.95 m/s faster than the wave.
- So for the whole half second the case is drawn while still catching up. Late on, the board sits where the case slopes up toward shore, and the sliding shape drops the surface by 1.7–3.2 m/s there.
- After the throw the anchor is "kept" on 51 of 61 samples and the tail is gone (R p95 1.00).

### At 1.8 m

Not run. The rise scales with the case's height over the sea, so expect the same pattern about 1.25× larger (*inferred*).

## 2. The rule

**The form: (d), the hand-over's own rate, carried along the surface's normal.** Not (a) as written, not (b), not (c).

Add to ruling 6's stream flow, after its blend:

Δu = R_c · n_y · n̂  (so up-flow gains R_c·n_y², along-ray flow gains R_c·n_y·n_a)

R_c = α̇_place · δ  −  α · (v_a − c) · s

| Symbol | Meaning | Where in code | Status |
|---|---|---|---|
| α̇_place · δ | hand-over rate: S′(u)/(0.5 s) × clock rate × α_h × δ | `seamTauWeight`, `seamHeightWeight` in `src/wave/barrel/tubeSeam.ts`; δ in `seamY`, `src/wave/barrel/sweptLoft.ts:2081`; clock rate `FRONT_FIELD.tauRate` | prototyped (*measured*, m3) |
| α | the share | `WallWater.seam`, `ContactHit.seam` | built |
| v_a − c | the anchor's speed less the wave's | `p.anchorRate`, `celerity` in `src/wave/barrel/crashCurve.ts` (`prepareAnchors`) | *inferred*, not prototyped |
| s | the case's slope along the ray, n_a/n_y sign-corrected | `ContactHit.normal*` | *inferred*, not prototyped |
| n̂ = (n_a, n_y) | the surface's unit normal in the ray–vertical plane | as in `streamWallFlow`, `src/physics/PhysicalSurfWater.ts:1091` | built |

- Why the normal form: the free-surface rule fixes only the water's speed across the surface (*sourced*). Adding along the normal invents no slip along the face (*inferred*).
- No fade with depth, as ruling 6 found (*measured* there). Theory says the up-speed falls linearly to zero at the bed (*inferred* from the Boussinesq expansion, *sourced*); at 0.1–0.3 m under in this depth the loss is small.
- **Why not (a) exactly:** it is this rule's first term only, and it uses the point's clock. On today's surface the place's share does not follow that clock, so the carried rate and the real rise disagree (m3: miss p95 3.90 → 6.55).
- **Why not (b):** differencing at the point carries every hop: −5 to −12 m/s for one step (*measured* sizes; effect *inferred*).
- **Why not (c):** a longer course lowers the mean rise but not the hops. Run b5 (−0.75 to 0) was already worse on felt water (*measured*, ruling 5's table).
- **The shape-change part is left out.** It is small at the median (0.23 m/s) and noisy (p95 2.0). Ruling 6 dropped frame differencing for that reason. A bar below watches what is left.

### What the prototype did (*measured*, m3 against m1)

Only the first term, normal form, on today's surface.

| | m1 (today) | m3 (rise carried) |
|---|---|---|
| Standing board's depth under the surface, p50 / max (m) | 0.30 / 0.62 | **0.08 / 0.19** |
| Prone board's depth, p50 / max (m) | 0.33 / 0.77 | 0.24 / 0.55 |
| Miss before the throw, p50 / p95 (m/s) | 1.14 / 3.90 | 0.88 / 6.55 |
| Felt water in the case, p99 (m/s a step) | 0.55 | **2.05** |
| Jumps over 0.2 m/s | 0.33 % | **0.67 %** |
| Board acceleration, p99 (m/s²) | 33 | 43 |
| Steps on the flight limit | 29 | 45 |
| Passive falls (before the throw) | 5 (1) | 5 (1) |
| Failed pop-ups / stood | 8 of 22 / 14 | 8 of 22 / 14 |
| The two standing "lost board" falls on wave 1 | 5.47 s, 5.55 s | 5.85 s, 5.92 s |

Reading: the water now lifts the board with the face. But the lift is jerky, because the surface is.

## 3. Smooth the surface first (the tail must not be carried)

The water should not carry the hops. A real surface cannot drop 10 cm in one step. Carrying them would put 3–12 m/s jolts into the felt water. A low-pass on the flow is ruled out by the owner. So fix the source:

| Rank | Change | What it removes | Status |
|---|---|---|---|
| 1 | Lay σ and the clock's spread along the crest from continuous positions (the anchors, or the crest's sub-cell place), not from cell centres | the share falling at a place; the −3 to −12 m/s drops | *inferred* fix for a *measured* cause |
| 2 | Turn on `formClock=c1` with it | the 0.5×/1.5× flip (spread 0.46 → 0.04, *measured*) | built, opt-in |
| 3 | Carry R_c as above | the board sinking into the face | first term prototyped |
| 4 | Find why the anchor is capped for the whole half second; either finish the catch-up before τ = −0.5 or keep it and carry the slip | the late −2 to −3 m/s | cause not traced |

None of these is a filter or a hidden force. The throw depth and the surf meter are not touched by 1–3 (*inferred*; bar 10 checks it).

## 4. Will it save the falls?

**Plainly: a little, at most three.**

- The pre-tube baseline already has 8 of 22 failed pop-ups and 14 stood (run b0, *measured* in ruling 5's table). Those 8 fall outside the case.
- The tube adds, before the throw: 1 passive prone and 2 standing "lost board", all on wave 1 (*measured*).
- What happens in those three (*measured*, m1 per-step log):
  - The surface climbs 0.4–0.5 m over the board in 0.25–0.4 s (standing 0.04 → 0.54 m under; prone 0.36 → 0.77 m).
  - The surface at the board's place rises at 2 to 7.5 m/s. The up-flow at the board goes the other way: +1.2…1.6 down to −1.3…−1.6 m/s.
  - The board is fully under (25.8 L, 259 N of lift at most). The water's inertia pulls it down by 430–650 N.
  - The limit is "flight": the board leaves the rider. The posture error reaches 0.25 m, and the fall is "lost board".
- So it is both. **The surface's motion alone lifts nothing**: buoyancy is spent once the board is under, and every other force on the board comes from the flow (`src/physics/hullForces.ts`, `src/physics/BoardBody.ts`). The flow has the wrong sign. For the prone rider, the body's own buoyancy does follow the surface (`src/physics/AttachedRider.ts:3024`), so the body floats up off the board (*inferred* from the code and the "flight" limit).
- Force scale (*inferred*, my estimate): ½·ρ·C_n·area·|v|·v_n with C_n ≈ 0.46 and 0.55 m² gives about 650 N for 1 m/s of slip at 5 m/s, and 2700 N for 3.5 m/s at 6 m/s. A 76 kg pair feels 8 to 35 m/s². That matches the measured 33–36 m/s² p99.
- With the rise carried but jerky (m3), the counts did not move. The two standers lasted 0.4 s longer.
- The 4 passive falls on the break line come after the throw (τ 0.08–0.53). This rule does not reach them.

## 5. Bars for the build

Ruling 6's bars, kept or changed:

| # | Bar | Keep? |
|---|---|---|
| 1 | c change ≤ 0.2 a step, ±20 % | keep |
| 2 | jumps over 0.2 m/s ≤ 0.6 % | keep (m3 misses: 0.67 %) |
| 3 | no jump at the source switch | keep (m3 misses: 8) |
| 4 | field part after the throw p99 ≤ 0.2 | keep |
| 5 | field part before the throw p99 ≤ 0.33 | replace by new bar C |
| 6 | total felt p99 ≤ 0.6 | keep (m3 misses: 2.05) |
| 7 | felt p99 ≤ 0.1 for τ < −0.5 | keep |
| 8 | seam flow across 0.25 m ≤ sea + 0.1 | keep |
| 9 | passive falls before the throw ≤ 3; failed ≤ 8 of 22; stood ≥ 14 | keep, as a "no worse" bar |
| 10 | throw and meter identical | keep |
| 11 | board acceleration p99 ≤ 10 m/s² | keep as the goal; pass mark for this build: below today's 33 |

New bars (all read by `ruling7.probe.test.ts`):

| | Bar | Today (m1) |
|---|---|---|
| A | The share never falls at a point carried with the wave before the throw: 0 steps with a drop over 0.005 | 15 of 99 |
| B | The place's implied clock rate within ±20 % of the point's clock | −3.1 to +1.7 against 0.5–1.5 |
| C | The surface's own rise, τ −0.5 to 0: size p95 ≤ 2.0 m/s, max ≤ 3.5 (0.7 m in about 0.4 s, peak 1.5× the mean) | p95 3.50, max 4.72 |
| D | The miss before the throw: p50 ≤ 0.3, p95 ≤ 1.0 m/s. The sea's control is p50 0.16, p95 0.46 | 1.14 / 3.90 |
| E | Standing board's depth under the surface before the throw: p50 ≤ 0.10, max ≤ 0.20 m | 0.30 / 0.62 (m3: 0.08 / 0.19) |
| F | Steps on the flight limit in the case before the throw: fewer than today | 29 |

Do A and B first, without the carried rise. If A and B pass and C does not, the anchor slip is next.

## 6. What the Basilisk velocity data should confirm

When the owner runs `tools/basilisk/run_velocity.sh`:

1. **The real rise.** In the wave's frame, how fast does the face rise at a fixed distance ahead of the crest over the last 0.5 s? Bar C's 2.0 m/s is my estimate. The run gives the true number for this case.
2. **The rule itself.** At the surface, v·n̂ should equal the surface's normal speed to within a few percent. If it does, the game's miss is all ours.
3. **The crest's speed against the wave's** before the throw. The game has the case 2.5–2.95 m/s ahead of c. If Basilisk shows the crest near c, the anchor's catch-up is an artefact to remove, not to carry.
4. **Depth.** The up-speed at 0.1, 0.3 and 0.6 m under the face, to settle fade or no fade.
5. **B before the throw** (crest water's share of crest speed), against the 0.85 in use.

## What I changed (nothing committed)

Shared worktree, branch `claude/surface-rise`, still at b872a11e:

- New, untracked: `src/wave/probes/ruling7.probe.test.ts` (the split, the per-step rider log, the front-point log). Copy beside this file.
- Prototype, uncommitted, off unless the probe is run with `RISE=normal` (or `RISE=up`): `src/wave/barrel/sweptLoft.ts` (per-vertex `wall.rise`), `src/wave/barrel/sweptContact.ts` (`ContactHit.seamRise`), `src/physics/PhysicalSurfWater.ts` (`STREAM_RISE`, the added flow in `streamWallFlow`). The full diff is `prototype-rise.diff` beside this file.
- Not for merge as it stands: `STREAM_RISE` is a module switch for the probe only.

Runs: m1 (today), m2 (`formClock=c1`), m3 (`RISE=normal`), in `runs/`. Each is 4 waves and about 125 in-case samples before the throw. Small numbers: treat p99 and max as single events.

## Sources

- Kinematic free-surface condition and the vertical velocity vanishing at the bed: https://en.wikipedia.org/wiki/Boussinesq_approximation_(water_waves) (opened today; the linear fall of the up-speed with depth is my derivation from its expansion).
- Crest water at 0.85 of crest speed as the face goes vertical: Derakhti et al. 2020, as already cited in `tubeSeam.ts` and ruling 5 (not re-opened today).

## The owner's calls

1. **Smooth the hand-over at its source before carrying the rise?** I recommend yes. The alternative, carrying today's rise, breaks the felt-water bars.
2. **Is a board that sinks 0.3–0.6 m into the forming face worth fixing if the fall counts stay the same?** It is a "one water" fault, not a falls fault.
3. **The anchor's catch-up during the half second:** remove it (case shown only once caught up) or keep it and carry it. Wait for Basilisk item 3 if unsure.
4. **`formClock=c1` on by default** with this build. It is needed for a smooth rise, and alone it makes today's tail worse.
5. **Bar 11 (10 m/s²):** keep as the goal, or accept "below today's 33" for this step.
6. **Run the Basilisk velocity tools** on the M4, so bar C's number is sourced rather than estimated.
