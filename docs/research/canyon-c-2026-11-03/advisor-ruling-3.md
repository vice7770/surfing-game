# Canyon C, the advisor's third ruling: why the take-off's waves are soft and hard to catch (2026-11-08)

Read on main 7c3851e9; no game edits. Scratch: `scratchpad/canyon-c-3/` (`takeoff.ts`, `to-*.txt`).
- **The probe:** a new take-off probe. For each crest passing the rider's start it records H (the crest minus the lowest water within ±40 m), the steepest and mean front face, and whether the solver breaks it (strength > 0.3) within 25 m shoreward.
- **The runs:** CPU, seed 1, 8–12 periods. Older data comes from the canyon-c frame probe.
- **Not run:** no riders, no catch reports, no browser.

**The owner (2026-11-08):** "Overlay wave generation good, but the waves are not as sharp and not long. I can't surf any wave."

## 1. Measured at the start (Medium, Hs 1.4 m, Tp 11 s)

| Layout (start depth) | H p50 / p90 | Max face p50 / p90 | Break 5–25 m inside the start | Unbroken, H ≥ 0.8 m, face ≥ 15° |
| --- | --- | --- | --- | --- |
| Pool Training (1.93 m) | 1.34 / 1.37 m | 18.5° / 20.2° | 10 of 10 | 10 of 10 |
| B, upcoast tip x −112 (2.69 m) | 1.32 / 1.75 m | 9.5° / 19.5° | 4 of 11 (at 15.8–20.8°) | 4 of 11 |
| **C, x 75 (2.69 m)** | **0.86 / 1.39 m** | **7.6° / 12.0°** | **2 of 10** | **0 of 10** |

**C at other sizes:**
- Small: H 0.92 m, face 7.8°, 0 of 10 break nearby.
- Big: H 1.74 m, face 12.5° / 18.8°, 6 of 12 break nearby, about B's Medium.

**Sharpness at onset:**
- C's onset faces are 10–16° on the 1:44 bank (ξb 0.26, spilling).
- On 1:27 they are 24°, and on the 1:18 bowl 23°. B's arms were 14–18°.

**Length** (canyon-c README):
- The −x end travels 19 / 39 m (at the 6 m / 15 m jump limits).
- 30–41 % of waves reach the join; 5–11 % reach the bowl's end.
- The peel at Medium is 60–70° at x 60–110.

**Catchability (inferred):**
- The crest runs at 5.2 m/s against a paddler's 1.5–2.1 m/s.
- On a 7.6° face, gravity adds about 3 m/s over the face, which is marginal.
- On the Pool's 18.5° face it adds about 6 m/s, which is ample.

## 2. Diagnosis

1. **No focus at the take-off.** At the same depth and in the same sea, B's V-tip refracts the swell to 1.32 m. C's straight planar bank gathers nothing: 0.86 m is the sea's mean individual wave (Mead & Black's "focus" component).
2. **The typical wave never breaks at x 75.** The edge there is 2.17 m deep (the ramp runs 1.2 m at x 31 to 3.6 m at the tip, `Bathymetry.ts:522`, `canyonBankEdge` :666), so only sets of H ≳ 1.3 m break. The first break's p50 is about 140 m inshore of the start, and half the waves break at the beach.
3. **The 1:44 face caps the sharpness:** onset faces of 10–16° against 21–26° on 1:18–1:27.
4. **The take-off depth's provisional fit** (`CANYON_BANK_TAKE_OFF_DEPTH`, `SurfZoneSimulation.ts:978`) floors the start at 2.5 m.
5. **Not the cause:**
   - the sea's spread (B catches in the same sea);
   - the join;
   - the onset gate (0.55 and 0.65 measured, no gain).

**Rejected, all measured at the start with no gain:**

| Variant | H | Face p50 | Break nearby |
| --- | --- | --- | --- |
| Face 1:28 | 0.88 m | 6.1° | 0 of 10 |
| Face 1:28 + edge tip 2.4 m | 0.80 m | 4.9° | 2 of 11 |
| `?canyonRamp=half` | 0.79 m | 5.3° | 0 of 11 |
| `bankRampFrom` 70 | 0.87 m | 7.2° | 2 of 10 |
| Start at x 35 with the current fit | 0.81 m | 7.4° | 1 of 10 |

## 3. Ruling (ranked)

1. **A take-off peak at x 75 (`?canyonPeak=on`; the owner's call).**
   - **The shape:** a seaward lobe of the bank's crest contour centred on `takeOffX` (:290). It bulges 20–30 m seaward, rounded like B's tip (12–15 m), over ±15–20 m along shore. Its edge is shallowed to 1.5–1.7 m, blending back within ±25 m, with a 1:30 face (ξb 0.3–0.4).
   - **The code:** `bankLineZ` and `bankDepth` (`Bathymetry.ts:657, 684`), with `canyonBankEdgeZ` (:675) kept in step. Guarded by `canyonBankOn`; B and A keep their pins.
   - **The player sees:** a clear peak standing up at the start, a steeper face, then the long left.
   - **Cost:** a bed change only.
   - **Risks:** focus close-outs (keep the peak-to-arm ratio ≤ 1.2–1.3), and a larger handover gap down the line.
   - **Bars, Medium (3 seeds × 12 periods):**
     - at the start, H p50 ≥ 1.2 m;
     - ≥ 40 % of waves break 5–25 m in, at a face ≥ 15°;
     - onset face p50 ≥ 16°;
     - H 20 m down the line ≥ 0.8 of the peak's;
     - the −x end and the join no worse; peel 40–60° over x 30–75;
     - Small ≥ 2 of 10 break nearby; Big has no close-out wider than ±20 m.
2. **Refit the start to the peak** (required with 1): `CANYON_BANK_TAKE_OFF_DEPTH` (:978) and `CANYON_BANK_RIDE_LINEUP` (:1041), with canyon-wave-r2's catch model (wave metrics only). Bars: ≥ 70 % of sets caught from the start, and ≤ 10 % breaking on the paddler.
3. **A steeper face on the lobe only, 1:25–1:28 (`?canyonPeakFace=steep`; the owner's call).** It gives onset faces of about 20–24°, the steep wall tricks want, toward plunging.
4. **If no peak:** start at x 30–40 on the 1.2 m edge, refit about 1.9 m deep. Rides are shorter (about 90 m to the bowl).

**Unchanged:** the sea (its overlay wave generation), the join (a), the bowl, the channel, and Big's peel.

**The line's length:** "one line to the bowl" stays ruling 2's physics (about 1 in 4–10 Medium sets). The peak makes the take-off catchable; it doesn't by itself lengthen the line.

## Sources

- Mead & Black 2001 (J. Coastal Res. SI 29) and Mead 2000: the reef components focus, wedge and ramp.
- Hutt, Black & Mead 2001: peel angles 30–70°.
- Scarfe et al. 2009.
- Battjes 1974: the Iribarren classes.
- FUNWAVE-TVD's breaking documentation: the Kennedy onset.
- The in-game analogues: the canyon-b README, and `docs/research/wave-pool-bed.md` (focus close-outs).

**Caveats:** one seed, 8–12 periods per run, a simple crest tracker. The peak's numbers are inferred until it is built.
