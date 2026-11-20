# The water-physics advisor's ruling: Canyon C, one oblique bank peeling from +x into the reef (2026-11-03)

Read from origin/main 4eee1e5f. The advisor's scripts are in
/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/calc/
(geo.py, layout2.py, rays2.py, wander.py).

## The owner's decisions

**The ask, 2026-11-03.** "It start half of the map where the surfer is staying, I dont like that. I want the waves to be
random on their placement and area of first breakage. Right now big wave break to both sides making it impossible for
the surfer to ride it. Also ugly because the rider stands up and sees a scripted wave breakage."

They asked for a beach that breaks evenly from one side to the other: not always in the same place or at the same
distance from shore, but peeling along until it sometimes reaches the reef.

**Scope.** "I dont want a tube hole yet in canyon leave the wave shape itself as now … The work for the tube should be
developed in the pool wave and then migrated to the other beaches." So:
- no tube work;
- the bars' wave is kept (spilling with a face, the 0.40 onset, the bars' look).

**Answers:**
- **Direction:** the wave starts on the side opposite the reef (+x) and peels into it. The reef is the last stage; its
  tube and complex wave come later.
- **Randomness:** from the sea only: one long, even bar, the same every session.
  - Future: "a random wave current to match real life cycle", meaning the sea changing over time. Not now.
- **Start:** down the line, about a third of the way along.
- **Past the reef:** a channel.
- **Bank angle:** 45°. The owner accepted the further-out start and a tank 40 m bigger.
- **The bowl:** flip its outline. The same reef (same transect, rock and breaking rules, still no tube), with its planform
  mirrored along shore about x −39.5, so it peels −x with the bank instead of meeting it head-on.
- **Default kept:** one start a third along for every size.

## 1. Bank angle and swell

**The sea stays as it is:** square to the beach, s = 150, JONSWAP (`PhysicalMode.ts:107`, `SurfConditions.ts:77`). The
obliqueness goes into one straight bank.

**An oblique swell is rejected.**
- Over a straight bar, Snell caps the breaking angle at asin(c_b / c_deep): 17–22° at Medium, even for a swell nearly
  parallel to the shore. That is a close-out, below the 20–30° floor (Hutt et al. 2001; Scarfe).
- It needs a side feed. Padang's feed lagged the crests by 15–28 m and made crests that ran two ways.
- Wrapped sides would need a 13.4° direction step at 400 m, and they build a current (the Pool's).
- Stepped bars are rejected too.

**The peel.** The angle at breaking is ≈ asin(0.885·sin β), calibrated on the solver's own refraction (inferred):

| β | Peel | Speed at Medium |
| --- | --- | --- |
| 40° | about 35° | 11.1 m/s |
| 45° | about 39° | 10.1 m/s |
| 50° | about 43° | 9.3 m/s |

The cost is distance from the beach: the bank spans about L·tan β across shore, about 196 m at 45°.

**The bank, at 45° (the owner's pick):**
- **Line:** one straight bank from a tip at x +140 to the bowl. Its 1.9 m contour (the bowl's crest contour) passes
  through the bowl's join point.
  - Before the flip that point was the bowl's +x end (−24, −47). After the flip, re-derive the join so the bank's 1.9 m
    contour meets the flipped bowl's seaward end; that end is now its +x end.
- **Face:** 1:44 along +z (the down-coast bar's slope), planar, no knee. ξb 0.25–0.29.
- **Edge:** the top of the face, 1.2 m deep along the wall from the reef up to x +31.
- **Inside:** max(2 m, edge depth + 0.5 m) behind the edge, then the 1:15 beach. Not the 5 m floor: a 5 m trough behind
  the take-off focused rays onto the wall's top (density up to 3.4 near x 0–20).
- **Fade:** the tip fades into the floor over x 140–165, clear of the 20 m open-edge band (`ShallowWaterSolver.ts:93`).
- **Ray trace:** linear rays are uniform at 0.89–0.94 along the 1.9 / 2.5 / 3.0 / 3.5 m contours at 9, 11 and 14 s. No
  stall; a mild 1.25 focus at the tip's fade, where Big's sets start.

## 2. The first break varying

**The mechanism: a ramp on the edge only.**
- The edge deepens 1.2 → 3.6 m over x +31..+140 (0.022 m per m). The face contours stay straight and end where the edge
  reaches their depth.
- Each wave first breaks where the edge depth equals its own breaking depth: x* ≈ 31 + 45·(h_b − 1.2), with h_b from the
  take-off fit 0.95 + 1.11·Hs (`SurfZoneSimulation.ts:774`).
- Up the line of x*, the crest passes over deeper water unbroken, so the white runs one way.
- Heights are Rayleigh (Thornton & Guza 1983); about 14 % of waves exceed Hs.

**Targets (inferred):**

| Size | Mean wave at x | Hs wave at x | H1/10 wave at x | Across-shore spread |
| --- | --- | --- | --- | --- |
| Small | +31 | +65 | +88 | 45 m |
| Medium | +47 | +90 | +121 | 58 m |
| Big | +79 | tip | tip | 39 m |

Bigger waves break further up the line and further out. Avoid any convex tip: a focus fixes the start (Mead 2000, Bingin).

**Spreading:** keep s = 150. A Medium wave's height correlation along its crest is 0.86 at 50 m, 0.54 at 100 m and 0.09
at 200 m. With a 1.2 m edge, sections down to about half the take-off height still break, so the line bends rather than
gaps. s = 300 is the owner's call, only if the line sections.

**The rule-A risk:**
- Build with rule A (the breaking age passed along the crest) first.
- If white runs more than 10 m up the line (+x of the first break) on more than 10 % of waves, put the existing age gate
  (`ageJoin` 0.5) on the take-off zone only, x > +31. It is per cell on CPU and GPU (`canyonJoin`, `Bathymetry.ts:937`).

## 3. Sizes, take-off, channel, edges

**Starts and peel speed:**

| Size | Start, m from the waterline (B today) | Peel speed |
| --- | --- | --- |
| Small | 154 (103) | 8.9 m/s |
| Medium | 182 (134) | 10.1 m/s |
| Big | 224 (183.5) | 12.1 m/s |

- Big's sets break at the tip, about 286 m out.
- The peel angle is the same at every size, and ξb is 0.25–0.29 at every size.
- Big closes out only when sets break on the 5 m floor (B: 0–1 of 14).

**Take-off:**
- At x +75, a third along. Re-fit `CANYON_TAKE_OFF_DEPTH` and `CANYON_RIDE_LINEUP` there (`SurfZoneSimulation.ts:774`,
  `:823`).
- Small's sets break at the rider, Medium's 15–45 m up the line, Big's about 65 m up.
- It is a right-hander, about 20 s to the reef.

**Channel:**
- The 5 m floor from x −72 to the −x edge. Never deeper than the floor, and not shallower than about 4.5 m (Big's sets
  would break across it).
- Keep the part of the up-coast bar under the bowl, faded into the floor (before the flip: over x −72 to −57). Mirror
  that too, so the bowl keeps its own values.
- Remove the rest of both A-frames.

**Edges:**
- The sea stays square, so no side feed (`SIDE_FEED_SPOTS` stays empty).
- The bed is level across both edges.
- The window stays 400 m wide.
- The tank moves about 40 m seaward (`zoneInner` −390 → about −430), so the tip's 5 m foot (z −347) sits inside the
  blend. That is about 9 % more cells; measure it.

## 4. The bowl (the owner chose the flip)

**Why it needs flipping.** As built, the bowl's crest line runs at 32° with its seaward end at its −x end (x −57, z −67),
20 m further out than its +x end (x −24, z −47). So it peels toward +x on its own: crests square to the beach reach its
−x end 3–4 s first. B measured it breaking by itself on 8–11 of 15 Medium waves and on nearly every Big one. Left as it
was, it would meet the bank's line head-on.

**The flip.**
- Mirror the bowl's planform along shore about x −39.5, keeping its +z transect (the platform, knee, 1:18 face, 1.2 m
  crest, top and back), its rock, its breaking rules (the 0.65 onset, the age gate) and its curl. The tube stays off.
- Its seaward end is now its +x end, so the bank's line arrives there first and the bowl peels −x with it.
- Its ramp-in and back-off swap ends: it ramps in from the +x side and backs off toward −x.
- Measure:
  - whether it still breaks by itself ahead of the bank's line;
  - the bank's line running into it;
  - head-on meetings, which should be about none.

## 5. Bars

Frame by frame, using canyon-b's frame-probe definitions; 3 seeds × 12–14 periods a size.

1. **One direction:** the line's end moves −x; white spreads ≤ 10 m +x of the first break on ≥ 90 % of waves.
2. **First break:** per wave, its x and its distance out against H.
   - Medium sets centred near x +90, with p10–p90 ≥ 30 m.
   - Rank correlation of x* with H ≥ 0.5.
   - ≤ 25 % within 10 m of the tip.
3. **Continuity:** one line from the first break to the bowl's end on ≥ 70 % of Medium sets. Median frames with a patch
   ≤ 15 % (B: 14–39 %).
4. **Peel:** Hutt's angle with the crest's own speed, median 35–47° on the wall; no 20 m stretch below 30°.
5. **The bowl:** its own runs and head-on meetings counted; with the flip, its runs go −x and meetings are about none.
6. **Crests:** two-sided crests per band and edge chevrons no worse than B's.
7. **Current:** mean speed along the bank and in the channel at 600 / 1200 / 1800 s.
   - It should settle by 1200 s; Komar's bound is about 1.9 m/s at Medium (Coastal Wiki), 0.5–1.5 m/s inferred.
   - Take-off H drifts ≤ 10 %.
8. **Health, catch and cost:** water finite, Froude caps, volume; catch ≥ B's 35 of 52 sets; step time against B's.

## 6. Switch, files, what stays

**Switch:**
- The default becomes C.
- `?canyonBed=b` gives B byte for byte: freeze `CANYON_B` like `CANYON_BEACH`, and add 'b' to `CanyonBed`.
- `?canyonBed=old` stays A (pin hash 110c2d83). `PhysicalMode.ts:651` reads the switch.

**Files:**
- `Bathymetry.ts`: the bank keys in `CANYON` (lines 259–491); the bank's break-line, arm, span and onset functions; the
  bars removed except the bowl's base; the flipped bowl.
- `SurfZoneSimulation.ts`:
  - `SPILLING_FRONT.canyon.direction` 1 → −1 (line 322);
  - one beach-look group (line 1275);
  - the start at x +75, with the take-off and lineup re-fits;
  - the tank via `zoneInner`.
- `waveInfo.ts:38`: the readout reads "spilling bank into a plunging reef bowl, right …°".

**What stays:**
- the solver and the swells;
- the bank's 0.40 onset, easing to 0.65 by 4.5 m;
- rule A on the wall;
- the bowl's transect, rules, rock and curl, with the tube off;
- the look.

## 7. What the owner will see

- **The lineup:** at Medium they sit about 180 m out (B: 134), a third of the way along a long straight sandbank. It runs
  from far out on their right (looking out to sea) to the reef's dark rock near the beach on their left.
- **The first break:** sets throw their first white 15–45 m up the line and further out, and smaller waves start beside
  them. Every wave starts somewhere different.
- **The ride:** one-way white toward the reef over a spilling 14–20° face, a right-hander of about 20 s. The flipped reef
  then stands up as the line arrives. Past the reef the crest rolls into the channel and dumps on the beach.

## 8. Calls still open (only if the measurement triggers them)

- The age gate on the take-off zone.
- s = 300.
- The current along the bank, which is physical; tell the owner its size.

## Consult-log row (paste at the top of docs/research/water-physics/consult-log.md)

| 2026-11-03 | Canyon C (coordinator; owner: one long even bar from +x into the reef, random first breaks from the sea, channel past; scope narrowed: no tube, bowl's transect untouched, bars' wave kept) | Peel angle against geometry; swell or bar; first-break wander and spreading; every size; take-off; channel; edges | Square swell (s 150) over one straight oblique bank: peel ≈ asin(0.885 sin β) (solver-calibrated): 45° → ~39°; an oblique swell onto a straight bar caps at 17–22° (Snell), and needs the side feed (Padang lag-wakes) or wrapped sides (13.4° direction step at 400 m, the Pool's current): rejected; stepped bars rejected. Bank: tip x +140 (fade to +165), 1.9 m contour through the bowl's join, 1:44 face along +z (ξb 0.25–0.29), 1.2 m edge, inside max(2, edge + 0.5) (a 5 m trough focused rays up to 3.4 behind the line); edge ramp 1.2 → 3.6 m over x +31..+140 so first breaks move about 45 m along shore per metre of breaking depth (Medium mean/Hs/H1/10 at x +47/+90/+121; Rayleigh, Thornton & Guza 1983); linear rays uniform at 0.89–0.94 along the face. Keep s 150 (height correlation along the crest 0.54 at 100 m: the line bends, not gaps); rule A, with the age gate on the take-off zone only if white runs > 10 m up the line on > 10 % of waves. Starts 154/182/224 m out (B 103/134/183.5); tank +40 m seaward; channel the 5 m floor (never deeper; ≥ 4.5 m). Bowl as built peels +x (its −x end 20 m further out) and would meet the bank head-on; the owner chose to mirror its planform about x −39.5 (transect, rock, rules kept). Sources: Coastal Wiki (Komar), Thornton & Guza 1983, Mead 2000, Hutt 2001 / Scarfe (sources.md). Outcome: pending (owner: 45°, flip the bowl). |

## Sources

- Coastal Wiki, longshore current (Komar): https://coastalwiki.org/wiki/Longshore_current
- Thornton & Guza 1983, JGR: https://marineinfo.org/doc/publication/123040
- Mead 2000 thesis (Bingin): https://researchcommons.waikato.ac.nz/handle/10289/13967
- Hutt, Black & Mead 2001; Scarfe 2002 / 2009: `docs/research/water-physics/sources.md`.
