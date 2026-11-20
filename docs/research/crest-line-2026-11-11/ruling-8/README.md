# Ruling 8: what step 1 measured, and the next step

Water-physics advisor, 2026-11-11. Wave Pool Barrel, `tubeSeam=blend,wallBody=stream`, branch `claude/crest-line`.
Read from the step 1 logs only (no new runs). Scripts: `tools/a1.py`–`a6.py` (they read the step 1 logs in `../runs`; paths inside point at the session scratch folder they were run from).
Every number is *measured* (by me, file named), *sourced*, or *reasoned*. No outside source was needed; nothing is cited.

## Short answers

1. **Bar B: the geometric reading is right. Replace the bar; do not re-lay the share.**
2. **Crest place: `top` is the right one for a front point. Stop building on `sub`.** `top`'s late throw needs a sized offset.
3. **Next step: (a), the anchor.** Then the throw offset for `top`, then carry the rise. (c) is not a separate step.

## 1. Bar B

- The share is a field τ(x, t) laid on slices. A place moving through it sees Dτ/Dt = ∂τ/∂t + v·∇τ. That is kinematics, not a model choice (*reasoned*).
- A place riding the wave moves along the ray at c. The ray is 25–28° off the columns, so it crosses columns at c·sin(angle) toward later-throwing ones. The step 1 arithmetic is correct (*reasoned*, checked against `barb.py`).
- It is also the physical clock. A piece of crest travels along its ray and breaks where its own ray meets the throw depth. That is later than the column it stands on now (*reasoned*).
- So the hand-over lasts longer at a place than at a column: 0.5 s of τ takes about 0.65 s at 0.75, against 0.40 s at 1.25 (*reasoned* from the measured rates).

**Do not lay the share along the peel direction.** It would make a wave-riding place see the column's rate, about 1.6× faster (own 1.19–1.31 against geometric 0.72–0.82, *measured*, `a5.py`). The hand-over part of the rise would go from p95 1.4–1.8 to about 2.2–2.9 m/s (*reasoned*) and bar C would fail everywhere. The slices would also stop being 2D profiles in the wave's travel plane, which is the settled tube build.

**Bar B, restated (B′):**

| | |
|---|---|
| Against | the geometric rate: the point's own rate less c·sin(angle)·∂τ/∂x (as `barb.py`) |
| Read over | 0.1 s windows (6 steps) of a carried place, τ −0.5 to 0, share between 0.001 and 0.999 |
| Pass | window mean within ±20 % on at least 90 % of windows, and the median ratio 0.9–1.1 |
| Today (*measured*, `a5.py`) | `sub` (d3) 12 of 15, median 0.89; `top` (n5) 8 of 19, 0.82; `top`+c1 (n6) 11 of 13, 0.91; 1.8 m `top`+c1 (h6) 26 of 31, 0.89 |

- Why windows: one step of the inverse smoothstep turns a 0.005 share error into about 13 % of the rate (*reasoned*). Per step, only 50–57 of 97–129 are within 20 % (*measured*).
- B′ is a gate for carrying the rise (step 3), not for step 1. It checks that the rate the rule carries is the rate the surface has.
- A steady 10 % shortfall is left (medians 0.82–0.91). Cause not traced.

**A consequence for step 3.** Ruling 7's first term must use the place's rate, not the point's `tauRate`. With `tauRate` the carried rise is about 1.6× too large. My m3 prototype used `tauRate`; part of its worse miss (p95 3.90 → 6.55) is likely this (*inferred*).

Bar C's premise also moves: 0.7 m in about 0.65 s is a mean of 1.1 m/s, peak about 1.6 (*reasoned*). Keep 2.0 as the bar; it is now generous, not tight.

## 2. Which crest place

A front point's place does three jobs before the throw: the clock (distance to the throw contour over the pace), the place along the crest, and the join. It does not place the case; the face anchor does. So the place must be continuous and move at the wave's pace.

| Place (column x 83.5, last 0.15 s before the throw, *measured*, `a6.py` on `d3.dump.txt`, `n5.dump.txt`) | Step a frame (m) | Against the pace (0.10 m) |
|---|---|---|
| Parabola's top (`sub`) | 0.09–0.13, then 0.34 and 0.47 | leaps |
| Centre of the top quarter (`top`) | 0.06–0.14 | at the pace |
| Front face crossing, 0.25 H under the crest | 0.10–0.16 (mean 0.13) | 1.25× the pace |
| Steepest point of the front face | sticks to a cell edge, one 0.5 m hop | unusable |

- **`top` is right.** The solver's crest is a plateau: three 1 m cells within 2 cm. The top of a parabola is undefined as its curvature goes to zero, so `sub` reads noise there (*reasoned*; the leaps are *measured*).
- A real crest near breaking is sharp, so "the highest point" is well defined in nature. It is not in a one-height solver holding a 17° face. The crest's body is what the solver resolves.
- The front face crossing is as smooth but runs 1.25× the pace. It would speed the clock up. Not worth a third value.
- **`sub` should be dropped as the direction.** Its bar C pass at 1.5 m is not the parabola's merit: without the anchor-slip part, `sub`+c1 and `top`+c1 are equal (p95 2.00 against 1.95 at 1.5 m; 2.04 against 2.05 at 1.8 m, *measured*, `a1.py`). Keep the switch value until `top` passes C, then remove it.
- **`top`'s late throw must be sized out.** The lag is 0.29–0.36 m at 1.5 m and 0.42 m at 1.8 m, about 0.3 H (0.28–0.34 H) (*measured*, from the step 1 tables, against each base). Subtract 0.3 H from the distance to the contour under `top` (*provisional*). Bar: the throw's typical distance within ±0.1 m of the base run, 95 % within 1 m, meter ±5 %.

## 3. The next step

### What the logs say about the anchor (*measured*, `a1.py`, `a2.py`, `a5.py`)

- Where the anchor is on its target ("kept"), it runs at c + 1.2 m/s (median; 0.22 c; p95 2.2–2.5). That is the case's crest closing on its face as it steepens. A simple-wave estimate gives 1.3–1.8 m/s (*reasoned*), so this part looks real.
- Where it is capped it runs at c + 2.6 (the cap is 0.45 c + 0.3 = 2.5–2.8). So the cap is a catch-up: the target is ahead, by at least 0.5 m at τ −0.5 (*reasoned* from 0.4 s at 1.4 m/s of closing).
- **In the case's water before the throw the anchor is capped on 97–99 % of samples** (n4 73 of 74; n6 77 of 79; h6 210 of 219). Outside the case it is capped on 42–71 %. So a rider is "in the case" before the throw almost only while the anchor lags.
- Every large slip sample (over 0.5 m/s) is capped. The large ones are negative (median −1.2 to −1.8 m/s) on a surface rising forward at slope 0.7–0.8, late (τ about −0.2).
- Step 1 already helped: all rows kept 27 % (n1) → 54 % (n4), 47 % (n6).

### (c) is not its own step (*measured*, `a3.py`, `a4.py`)

- The carried samples all sit near the riders: x median 83 m, p5–p95 71–85. "Drops at x 82–85" is where the samples are, not a take-off fault.
- No front point hops or jumps near n6's four drops; the nearby clocks all step 0.021–0.022.
- Pooled over n5, n6, h4, h6: 24 of 38 drops sit within 1.5 m of a thrown point (27 % of all samples do) and 33 of 38 come after τ −0.3 (49 % of all).
- So the drops left are at the seam between a forming slice (anchor at c + 2.6) and a thrown one (c + 0.6–0.9). The strip between them shears (*inferred*). Step (a) should move them.

### The order

| # | Step | Bars it should move | Must hold |
|---|---|---|---|
| 1 | **Trace the anchor (log only).** Per point: target less kept shift against τ; when the gap opens; the target's own rate; the case's height over the sea against the gap. Add carried places every 5 m along the crest so bar A is read along the whole line. 1.5 and 1.8 m, both crest lines with c1 | none; it sizes step 2 | default build unchanged |
| 2 | **Close the gap before the share starts.** While the share is zero (τ under −0.5) nothing is drawn, collided or felt, so the anchor may take its target there. Keep the cap from τ −0.5 on (*provisional*, pending the trace) | in-case capped share 97–99 % → under 20 %; slip part p95 under 1.0 (*reasoned*: 0.8 × 1.2 × 0.75); bar C at both sizes (expect near 2.0: not certain); bar A's drops | bars 1–4, 6–8, 10; falls no worse; W's jitter at τ −0.5 |
| 3 | **`top`'s 0.3 H throw offset** | the throw's distance back to the base's | meter ±5 % |
| 4 | **Carry the rise** (ruling 7 step 3), first as a probe run, with the place's rate and the slip term | D, E, F | A = 0, B′, C, bars 2, 3, 6 |

- Gate for step 4: A at 0 drops over 0.005. A 0.005 drop × 0.7 m × 60 is a 0.2 m/s jolt, which is bar 2's own threshold (*reasoned*). Today's largest drops (0.06–0.11) would be 2.5–4.6 m/s jolts.
- Not (b) now: `sub`+c1 still drops on 10 of 94 steps and passes C only at 1.5 m. Carrying that repeats m3.
- If drops remain after step 2, trace the loft strip between a forming and a thrown slice next.

### Must not be done

- No low-pass or smoothing in time of the flow, the share, the target or the anchor.
- Do not raise or remove the cap while the case is shown. It is what holds back the read's single steps (up to 1.8 m without it, per `docs/research/pool-tube-contact-2026-11-05/README.md`).
- No hidden force or motor on the rider.
- The throw stays at the throw depth: step 3 restores it under `top`; nothing else moves it.
- Meter within ±5 %. Default build byte-identical until the owner has ridden it.
- Do not carry the catch-up slip into the water. Carry only what is left once the anchor is on target.

## The owner's calls

1. `top` as the one crest place, with the 0.3 H offset, and `sub` retired once `top` passes bar C.
2. Remove the anchor's catch-up before the share starts (ruling 7's call 3). The logs now favour removing it. The Basilisk velocity run (item 3) would confirm the 1.2 m/s that is left.
3. Bar B replaced by B′, and moved to gate the carried rise.
4. Whether "bar C near 2.0" is good enough to start carrying the rise, or wait for the Basilisk number.

## Limits

- One column and one wave for the place table. Four waves and 74–219 samples a run for the rest; p95 values are a few samples.
- The link between "in the case" and "capped" is an association. The trace in step 1 tests it.
- n1–n4's logs have no place columns, so the drop analysis covers n5, n6, h4, h6 only.
