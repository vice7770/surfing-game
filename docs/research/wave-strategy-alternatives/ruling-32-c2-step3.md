# Ruling 32: C2 step 3, the library wave on the 2 m pool (2026-11-13)

Advisor: this session (Opus 5.5, max effort). Read: `c2-step3.md`, its bars runs in `c2-step3-runs/`, and the five
stills in `c2-step3-stills/`. No run.

## Decision: merge step 3 as opt-in work in progress

- It is behind `?wave=library`, off by default, and pinned off in rooms.
- Off is unchanged:
  - the 2 m pool's hash is 0545d279d79bafe7 on both trees;
  - both Canyons keep main's hashes;
  - `tsc` and the suite pass;
  - the headless fps is 60.5 both ways.
- The owner should not judge it yet. The tube draws as a block, and the flow is still the sea's until step 4.
- The nine runs' C2 files are kept in `docs/research/pool-c2-library/`. The run folder lives in the scratchpad, which a
  reboot can clear.

## What passes, and stands

- **The hand-over does not show.** There is no rib, slit or edge where the sea becomes the library, in the stills or the
  numbers. This was the plan's main risk, and the owner's question: "would the transition be ok".
- At 90 %, these pass: the crest gap (p90 0.187 m), the mean step under a board (p90 0.018 m), J1 and J3. The surface's
  rise under a board (median 0.01 m/s) and J5 pass outright.
- **The 2.4 s blend is accepted.** On this reef the hand-over line sweeps along the crest at about 3.7 m/s, so a 1.2 s
  blend stepped the share 0.34 per metre.
  - For later spots, the rule: the share may step at most 0.15 per metre along the crest.
  - Step 8 (Canyon) reads J5 again with its own sweep.
- **The builder's own choices stand until a bar says otherwise:**
  - the lanes as Snell-traced chords, with 1.5 m added in the celerity;
  - the toe clock's 10 m fade into H/d matching;
  - the loft's lift band of 35° to 50°.

## What misses, and why (the causes are accepted)

- **The height at the hand-over** (median 1.07): the keys clamp in 962 of 1,264 slices. Without a clamp, the median is
  0.987 and 84 % are inside the bar. Ruling 31's ten runs are the fix. They started at 08:05 and take about 10 hours.
  Read this bar again when they land.
- **The loft's box ends and pleats, and J1's and J2's worst.** Three causes:
  - neighbouring slices stand at different clocks, because of outlier raws in the fit and perhaps the A0 segment switch;
  - the bridge switches on at 50° while the lift eases in from 35°;
  - a run of lifted slices ends with no taper.
- **Drawn = felt off the mask:** the contact answers on strips whose flat triangles leave the water's surface.
- **The stipple:** the mask's texture is partial at a run's end.
- **The faceted bore:** the cases' bore has small folds, and they were lofted as facets.

## Decision: step 3b, one round, before step 4

A fresh agent, effort **high**: the causes are named and the fixes are local.

1. A robust fit for the raw hand-overs: reject raws far off the local line. One wave had lanes at H/d 0.11 between
   neighbours at 0.27–0.37.
2. Check the A0 polyline's segment choice between neighbouring lanes. If it jumps, make the weights continuous across
   segments.
3. Weigh the bridge in by the loft's own lift: node = (1 − L) × the curve + L × the bridge.
4. Taper a run's ends along the crest over a few metres, like the old loft's `endBlend`, not over one lane.
5. The contact answers only where its triangle's seam mask is on. The water's nodes answer everywhere else.
6. Put two unlifted lanes with a whole mask before the fading lane, and a 2 m pad along the curve.
7. Lift only the tube, up to touchdown plus its collapse.
   - After that the bore is drawn and felt by the nodes, with its small folds bridged.
   - The bore's roller belongs to step 5's foam. The water-physics advisor is consulted there on how the roller looks.
8. **Bars:**
   - all of step 3's bars, on the nine cases;
   - stills with no box end, no pleats, no stipple and no faceted bore.
   - Read the height bar on the slices without a clamp until ruling 31's runs land.
9. **Stop rule:** one round, then hand back with the stills.

## Then step 4 (the flow)

Step 4 moves where the rider feels the wave break. Before it starts, the owner is asked the swell call from ruling 31
again: a bigger pool swell to keep the 2 m wave breaking where it did. The advisor recommends yes.

## Cost, for step 7

- The page's library draw takes 5.2 ms on the M1. Today's barrel takes 2.5–2.9 ms.
- The worker takes 2–2.5 ms on top of the sea's step. The plan's budget is 1 ms.
