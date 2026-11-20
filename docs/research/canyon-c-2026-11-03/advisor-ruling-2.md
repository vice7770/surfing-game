# The water-physics advisor's second ruling: why Canyon C's breaking line stalls (2026-11-04)

This is a follow-up to `advisor-ruling.md`, read on `claude/canyon-c` at cebcc995. The advisor made no game edits.

**Method.** 10 headless solver runs, each a Medium (or Small / Big) seed 1 for 92 s, about 32 min of wall time in all.
- Each run dumped η and the breaking strength over the bank every 0.267 s.
- An offline port of `frame-probe.ts`'s `record` scored the dumps. It reproduces the frame probe's waves to within 0.5 m, so every variant was compared on the same waves.
- The scripts were kept in the coordinator's scratchpad (`cc2/`: `fields.ts`, `offprobe.mjs`, `analyze.mjs`, `hsmap.mjs`). The dumps were deleted; a rerun takes 4–9 min.

**Bottom line.**
- No small physical change reaches "one line to the bowl on ≥ 70 % of Medium sets". The best measured pair got 1 of 4 sets in 92 s.
- Two of the 2026-11-03 calls were wrong (§1.6).

## 1. Why the line stalls

**The cause.** Mostly physical. The first break is always a focused peak, and the shoulder down the line is lower. On a 1:44 face the shoulder reaches its own breaking depth only 3–9 s later, and by then the peak's white has died.

### 1.1 The take-off zone focuses energy onto the bank's edge

Base run, x 85–130:

| Where | Hs |
| --- | --- |
| On the face, 1 m deeper than the edge | 1.02–1.14 m |
| At the edge | 1.25–1.49 m |
| 25 m inside the edge | 1.38–1.63 m |

- Green's law between those depths gives only ×1.07–1.10.
- The focus stays with a level inside (bankBack 0): edge Hs 1.26–1.41 m. So the cause is the ramp's along-shore depth gradient, not the 0.5 m drop behind the edge (inferred).
- Every Medium break at x 60–105 began on or behind the edge: 1 to 17 m inside it, 1.85–3.06 m deep. None began on the face. The frame probe agrees: x 70–160 had no face onsets.

### 1.2 So the peak crawls along the edge line

- The edge line runs at atan(1 + r/s) = 63° to the shore, with r 0.022 m/m and s 1/44.
- The expected speed along shore is c·cot 63° ≈ 0.5 × 4.9 ≈ 2.5 m/s. Measured: 1.6–2.8 m/s. The x* 108 set moved 24 m in 15 s.
- The same waves peel at 4–7.4 m/s on the 1.2 m edge.

### 1.3 The handover fails

- The shoulder breaks Δh = 0.3–1.0 m shallower than the peak. On this face that takes 44·Δh/c = 2.7–9 s.
- Behind the edge, bores over the inside (2 m and deeper) decay toward a stable 0.4–0.5 h within about h/K ≈ 12–20 m (K 0.15–0.17; Dally & Dean 1986), roughly 3–4 s.
- So the white dies, and the shoulder then breaks on its own wherever the face is shallow enough (x < ~50), 10–40 m ahead. That is the jump.
- Example, the wave first breaking at x 77:
  - At the edge, H fell 1.73 → 1.15 → 0.67 m (H/h 0.79 → 0.45) between x 77 and x 45.
  - Its white died at x 37–45.
  - The face line restarted at x ≤ 33, 10–23 m seaward of the edge.

### 1.4 The ramp is not the root cause

With no ramp (a 1.2 m edge all the way to the tip, same seed):
- Every first break was at the tip, x 127–139. The tip focus gave Hs 1.33–1.52 m, against 1.07–1.29 m down the line.
- The line still crawled at 1.6–3.2 m/s, in 19–34 m sections, with the −x end travelling p50 25 m.

### 1.5 The candidates

| Candidate | Verdict |
| --- | --- |
| The edge ramp | Contributes: it pins Medium to the 63° edge line and focuses energy there. Not the root. |
| The gate's age latch | Contributes, and partly an artefact (§1.6). |
| The 0.40 → 0.65 onset easing | Not involved at Medium: every Medium break is shallower than 3 m. At Big's tip (3.3–3.9 m deep) the onset is 0.44–0.56, and Big's sets still break on the face at γ 0.80–0.85 and run. |
| The crest falling as it breaks | Yes: the focus decays down the line and the bores die over the inside. The typical white is 21–26 m long, against B's 50–63 m on bars attached to the beach. |
| s = 150 | Not the cause. s = 300 on the same seed: travel 16 m, no gain. |
| The probe | Big's stall is mostly the probe. Its jump limit is 6 m per frame, about 22.5 m/s along shore, and Big's sets run tip → bowl with 8–40 m sections. With a 25 m limit, 8 of 12 sets reach the bowl's end, against 0 at 6 m. Medium's stall is real: 0 of 15 sets reach the bowl even with a 40 m limit. The probe's frame is 8 steps = 0.267 s, not the 0.25 s its label says (`frame-probe.ts:375`). |

### 1.6 The advisor's two errors on 2026-11-03

- **"The line bends rather than gaps".** That assumed every wave peels along its own breaking-depth contour at a constant height. In fact the first break is a focused peak and the shoulder is lower.
- **The gate was not scaled to the bank.**
  - In the take-off zone, J 0.5 sits above the bank's 0.40 onset (`Bathymetry.ts:365, 422, 1131–1139`). It passes the breaking age only to cells that would break anyway, so there is no sideways spread at all.
  - The reef's ratio is 0.5/0.65 = 0.77 of its onset.
  - Scaling J down to 0.31 helped little (travel 16 → 22 m): the shoulder is not near enough to breaking for a gate near the threshold to matter.

## 2. The change

### (a) Recommended: key the bank's age join to the bed

**The rule:**
- Rule A (J 0) on the bank's face, seaward of its edge line.
- The gate (J 0.5) on its top, back and inside.
- The bowl as built.

Breaking then spreads sideways into water still shoaling toward its break, but not into water past its shallowest point (inferred: Goda's lateral spread, from the knowledge base, and Dally's reforming waves). Up the line, the crest is already shoreward of its own edge when the first break happens, so it sits on gated cells.

**How to build it:**
- `canyonJoin` (`Bathymetry.ts:1131`) gains a z argument. The edge line is `canyonBreakLineZ(x) − (canyonBankEdge(x) − bowlCrestContour)/bankFace`, the probe's edgeZ. This retires `bankGateFrom` (`:532`).
- Pass z in the wiring at `SurfZoneSimulation.ts:1190–1191`. The solver already fills a per-cell field from `joinAt(x, z)` (`BoussinesqSolver.ts:572–577`), and WGSL reads it per cell (`boussinesqWgsl.ts:424`), so the solver needs no change.
- Guard it with `canyonBankOn`, so B and A keep their pins.
- The advisor tested a hard switch at the edge line; a 2–4 m blend should be fine (inferred).

**Measured,** seed 1, 92 s. Travel is the −x end's p50 with the 6 m / 15 m jump limit; the last column is any white ≤ 10 m up the line.

| Size | Run | Travel | To the join | To the bowl's end | Frames with a patch | Up the line ≤ 10 m |
| --- | --- | --- | --- | --- | --- | --- |
| Medium | base | 16 / 19 m | 3 of 10 | 1 | 48 % | 2 of 10 |
| Medium | (a) | 26 / 46 m | 3 of 10 | 2 | 40 % | 5 of 10 |
| Big | base | 75 m | 1 of 9 | 1 | — | — |
| Big | (a) | 115 m | 4 of 9 | 2 past x −55 | 16 % | — |
| Small | base | 41 m | 4 of 10 | 0 | — | — |
| Small | (a) | 31 m | 3 of 11 | 0 | — | — |

- Big with (a): the typical white is 69 m long.
- Small gains nothing: its sets still stall at x 8–16.

### (b) Optional, the owner's call: halve the edge ramp

The change: `bankEdgeTip` 3.6 → 2.4 m, 0.011 m/m (`Bathymetry.ts:522`).
- The edge line moves to 56°.
- The edge focus weakens: edge Hs at x 60–90 is 1.02–1.21 m, against 1.19–1.45 m.
- Medium breaks move back onto the face at 2.26–2.62 m deep, 3–49 m seaward of the edge, from x −20 all the way to 130.

**Measured with (a),** Medium seed 1:

| | (a) + (b) | Base |
| --- | --- | --- |
| −x travel p50 (6 m / 15 m) | 30 / 42 m | 16 / 19 m |
| To the join | 5 of 12 (sets 1 of 4) | 3 of 10 |
| Frames with a patch | 7 % | 48 % |
| Typical / longest white | 39 / 67 m | 26 / 55 m |
| Up the line ≤ 10 m | 10 of 12 | 2 of 10 |

The cost: the sets' first breaks cluster at x 120–132 (p10–p90 about 12 m, from only 4 sets), and Big all breaks at the tip.

### Rejected

| Change | Result |
| --- | --- |
| s = 300 | No gain (measured). |
| J 0.31 | Travel 22 m (measured). |
| A level inside | Travel 17 m (measured). |
| A level inside + J 0.31 | Travel 17 / 27 m, join 6 of 14 (measured). |
| No ramp | Kills the variation and still stalls (measured). |
| An edge shoaling toward the bowl | Helps only marginal Small waves (inferred). The bowl's fixed 1.2 m crest at γ ≈ 1 breaks only Small sets (H ≥ 1.2 m) anyway. |
| A fuse running −x only | Not physical. |

## 3. Predicted bars

Inferred from one seed; the targets are 3 seeds × 12 periods.

**(a) at Medium:**
1. **One direction:** the line's own +x end stays ≤ 10 m on ≥ 90 % of waves; any white ≤ 10 m up the line on about 50 %.
2. **First break:** unchanged. Sets at x p50 ~105, p10–p90 ~45 m, Spearman ~0.85, 0 within 10 m of the tip.
3. **Continuity:**
   - −x end p50 ~25 / ~45 m.
   - To the join ~30 %. To the bowl's end 5–15 % of waves (sets 0–15 %): this still fails the bar.
   - Frames with a patch ~40 %.
4. **Peel:** x 60–110 still crawls (Hutt 60–70°). The 1.2 m edge peels at 40–50°, and Big at 33–40°. Check that no 20 m stretch drops below 30°.
5. **The bowl:** its own breaks fall at Big and stay about the same at Medium.

**(a) at Big:** −x end ~110 m; join ~45 %; bowl's end 20–40 %; frames with a patch ~15 %.

**(a) at Small:** unchanged; join 30–40 %; bowl's end ~0.

**(a) + (b) at Medium:**
- −x end ~30 / ~42 m; join ~40 % (sets ~25 %); bowl's end 15–25 %.
- Frames with a patch 7–15 %; typical white ~40 m; any white ≤ 10 m up the line ~80 %.
- The sets' first breaks at x 115–135, about 25 % within 10 m of the tip: this fails bar 2.

## 4. The take-off at x +75

**With (a):** it still sits right, since the bed is unchanged.
- Sets break 15–50 m up the line and crawl past x 75. The start depth's p50 is 2.25 m, against a 2.19 m edge.
- From x 75, though, the rider meets a back-off at x 60–75 before the 1.2 m edge's section runs at 5–7 m/s from x ~50.
- Keep the fits provisional.

**With (b):**
- Breaks at x 75 move onto the face, about 27 m seaward of the edge at ~2.3 m deep, so the lineup moves about 25 m seaward.
- Sets break 45–57 m up the line.
- Re-fit `CANYON_BANK_TAKE_OFF_DEPTH` (`SurfZoneSimulation.ts:808`) and `CANYON_BANK_RIDE_LINEUP` (`:858`).

## 5. Risks

- **Breaking too deep:** rule A on the face can break the shoulder deeper than its own threshold (canyon-wave-r2's 0.4–0.6 h). Check that the median onset face angle stays ≥ 14° and ξb stays 0.25–0.3.
- **Big's peel:** it may run faster than its natural line once its sections are bridged.
- **Drift:** the join's edge line must stay in step with any change to the planform.
- **Parity:** check CPU/GPU parity and the pins for B and A.
- **Noise:** each figure is one seed over 92 s.

## 6. What stays

- The planform, the 45° angle, the 1:44 face, and the 1.2 m edge for x < 31.
- The bowl: transect, rules, rock and curl.
- The channel, the square sea at s 150, and the 0.40 → 0.65 onset.
- The bank's look and the switches.
- The ramp, unless (b) is chosen.

## 7. Calls for the owner

1. **Medium's ideal is out of reach without a non-physical rule.** At Medium, a set's outside section backs off, and the inside section runs to the bowl on about 1 in 4–10 sets. That is real behaviour on a gentle spilling bank. The alternative is a steeper face (1:25–1:30, ξb ~0.35–0.45, toward plunging); the advisor advises against it given "spilling stays".
2. **(b):** cleaner, longer lines, but the sets start near the tip.
3. **The continuity bar:** count sections ≤ 15 m (about 1.5 s for a rider at 10 m/s) as continuous, and report the 6 m figure alongside.
4. **Small** will not reach the bowl's end while the bowl's crest stays at 1.2 m.

## Sources

- Dally & Dean 1986, Coastal Engineering 1986, ch. 9 (K 0.15–0.17; Γ 0.4–0.5; waves reform in troughs): https://icce-ojs-tamu.tdl.org/icce/article/download/4009/3692/16926
- Baum & Basco 1986, Coastal Engineering 1986, ch. 73 (breaking stops at a stable height of 0.4 h, K 0.17): https://icce-ojs-tamu.tdl.org/icce/article/download/4074/3756/17184
- FUNWAVE-TVD's wave-breaking documentation (Kennedy et al. 2000: 0.65 / 0.15 √(gh), δ_b 1.2): https://fengyanshi.github.io/build/html/wavebreaking.html
- Hutt, Black & Mead 2001 (the peel angle) and the earlier Goda lateral-spread citation: `docs/research/water-physics/sources.md` and the canyon-wave-r2 consult.
