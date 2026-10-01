# The Wave Pool's bed: design and sweep

This is the bed of the Wave Pool (`src/wave/pool.ts`, the [movement-flow spec](../superpowers/specs/2026-09-30-movement-flow-wave-pool.md)). The pool is an A-frame that breaks at its tip first and peels both ways, the same wave every 10 s, for faces of 1.0, 1.25 and 1.5 m. It was designed with the water-physics advisor on 2026-10-01; their consult log keeps their reasoning and sources.

The probe is `src/wave/probes/pool.probe.test.ts`, run with `PROBE=1 LOG=… npx vitest run …`. It works like this:
- **Onsets:** it logs each column's breaking onset near the crest line, once per wave.
- **Chains:** it chains each break at the tip outward along both arms.
- **Speeds:** the break point's speed along its line is the speed a surfer needs, V = C_b / sin α (Hutt et al. 2001), with C_b ≈ √(2 g H_b).
- **X:** Mead & Black's X is measured along each break's ray, its flux direction.
- **Peak ratio:** the peak's face is compared with the arm's 20 m away.
- **Dump:** `DUMP=1` prints every column's breaks.

## Design, round by round

1. **Provisional bed:** a 4.5 m machine floor, a V reef at 50°, a face of 1:16 along +z, the crest at 1.0 m.
   - It was stable, and ran at 1.3× real time on the M1.
   - The tip broke every 10.8 s with faces of 0.9–1.0 m from H 0.9 m.
   - The break moved at 9–12 m/s, too fast to ride.
   - The advisor: a linear input in 4.5 m sits at Ursell 41 and sheds free harmonics; feed at 9 m (Ursell 8). Refraction eats the reef's angle, so the arms must be at 70–75°. A gradient of 1:16 tubes; 1:28 gives Mead & Black's 2.6–2.8, which throws without a tube.
2. **The advisor's layout:** a 9 m feed with a zone of 1.75 wavelengths, a square 1:9 ramp, a terrace, a finger with a hyperbolic tip, and a lagoon draining through the tapered arms.
   - The first build set 1:28 along +z by mistake. The gradient belongs along the ray at breaking, which comes to about 1:18 square to the crest line.
3. **1:18 square to the crest line, 2.75 m terrace, H 0.9 m:**

   | Arms | V | α_b | Faces | X | Rides |
   | --- | --- | --- | --- | --- | --- |
   | 56° | 7.2–10 m/s | 28–40° | about 1.1 m | 19–22 | |
   | 61° | 7–10 m/s | 26–42° | about 1.1 m | 20–22 | 70–110 m of break line per side in 7–16 s |

   The tip broke every 10.0 s at the same z.
4. **H 1.0 m, judged after 105–120 s:**
   - **66°:** symmetric within 1–2 %. A close-out of about ±36–40 m at 13–15 m/s; tip faces 1.1–1.3 m.
   - **71°:** the tip closes out across |x| ≤ 28 (the whole section within 0.6 s, in 1.4–1.65 m of water). There's no break at |x| 32–36. The arms at 40–56 break in order at about 6.4 m/s along the arm (α ≈ 47°, inside Scarfe's 46–55°) but small and more than once a wave. Nothing breaks past |x| 56.
   - The advisor's reading: the convex finger focuses the straight crest onto its ridge. The shoal is about ±25 m wide where the wave breaks, so it closes out across it and starves the flank beside it.
5. **A narrower tip (b = 15):**
   - **66°:** a ±24 m close-out, peak faces 1.4–1.5 m against about 1.2 on the arm, and a gap at 28–32.
   - **71° on a 2.5 m terrace:** a ±16 m close-out, peak faces 1.3–1.5 against about 1.0 (a ratio of about 1.4, over the advisor's 1.2), and a gap at 20–24.
   - A narrower tip narrows the close-out but strengthens the focus.
6. **A ramped crest** (the advisor's lever): the crest 1.0 m deep at the tip, shallowing along each arm to 0.5 m at its end. It weakens the tip's focus and keeps the arms breaking in order. Arms 71°, a 2.5 m terrace, b = 25, H 1.0 m, after 105 s:
   - **Identical waves:** tip faces 1.33 / 1.35 / 1.33 m.
   - **Symmetric:** left and right match.
   - **Order:** the break runs continuously from the tip to |x| 32 in 2.7–3.0 s, at about 8.9 m/s along the arm (α 32–34°).
   - **X:** 30–32, Mead & Black's 2.6–2.8 class.
   - **Peak/arm:** 1.13–1.20.
   - **Close-out:** ±16–20 m.
   - **Outer arm:** it doesn't break at |x| 36–40. From 44 to 52 it breaks once a wave at about 6 m/s along the arm (about 50°). Past 56, where the arms taper, nothing breaks.
   - **Ride:** about 9 s per side.
   - **With the tip at 1.2 m:** the close-out is still ±16 m and the peak/arm ratio rises to 1.37–1.48, so it's worse.
   - Kept: 71°, a 2.5 m terrace, the crest 1.0 → 0.5 m.
7. **Longer arms, bent from 71° to 65°** (the advisor: easing over 14 m about |x| 40 keeps the outer arm in the tank at about 46°). Arms to |x| 82, tapering to 107, in a 280 m window.
   - **b = 10:** the tip closes out ±16 m with 1.3–1.5 m faces. At 24–32 the break peels cleanly at about 6 m/s along the arm (about 50°).
   - **b = 15:** a ±20 m close-out (peak/20 m 1.07, X 34).
   - **Both:** past |x| 36 each x-column logs several onsets a wave. With arms this steep the break line crosses a column along tens of metres of z, so column onsets no longer show the peel.
   - The probe gained a break-line mode (`LINE=1`): it samples the arm's face where it is 1.5 m deep and times each wave's arrival there by arc length from the tip.
8. **Along the break line** (H 1.0 m, after 95–105 s; arrivals unwrapped wave by wave):

   | Tip b | Close-out (within 1 s) | Along the line, x 0–30 | Steady peel past it | Reaches | Ride per side |
   | --- | --- | --- | --- | --- | --- |
   | 25 | ±6–24 m (varies) | 12–17 m/s | 6.0–6.5 m/s from \|x\| 27 | \|x\| 75–84 | 18–21 s |
   | **15** | **±18 m** | **10.4 m/s** | **5.6–5.8 m/s** | **\|x\| 63–69** | **18–21 s** |
   | 10 | ±15 m | 8.3 m/s | 5.4–6.2 m/s | \|x\| 60–63 | about 20 s |

   - **Peel:** at 5.7 m/s against C_b ≈ 4.7 m/s, the steady peel is about 55°: Scarfe's intermediate band, toward its gentle end.
   - **Repeatability:** the waves repeat to about 0.1 s along the arm (b = 15: arrival at |x| 45 at 11.8 / 11.7 / 11.6 s after the tip).
   - **b = 10's peak:** faces were about 1.4 times the arm's in the column runs, past the advisor's 1.25.
   - **Kept: b = 15.** Riders wait at x 27, just past the tip's fast section, where the arm is about 1.5 times the wave's height deep.

## The bed as built, against the design

Mapped after the sweep: seaward of the terrace's edge, the finger's faces run on at their 1:18 normal gradient instead of stopping at the terrace. In front of the finger (|x| under about 90 m) the approach is therefore gentler than the 1:9 ramp. At |x| 20 it runs at about 1:40 along the waves' path, and the zone's inner edge is 4–8 m deep instead of 9 m; the tank blends it into the feed over 10 m. Clear of the finger the ramp and terrace are as designed.

Every measurement above was made on this bed:
- the waves repeat to 0.1 s along the arm;
- the arms match;
- the runs stay stable.

So it is kept, as found. The advisor ruled on 2026-10-01 to keep it:
- **The bed:** it is Mead's "focus" (two ridges aligned with the approach, inside Mead 2000's ranges), closer to natural breaks than the steep ramp first designed.
- **The step:** the 10 m blend reflects at most about 0.17 in amplitude (about 3 % of the energy) into the zone, which relaxes it out.
- **If the zone or the feed ever moves:** recheck the step.
- **If a secondary crest ever rides the faces:** widen the blend to 30 m first.
- **If a size ever breaks on the arms before the tip:** look at the deeper axis first.

## Cost

The pool's tank (a 250 m window, the fine grid from the terrace, a 9 m feed) runs at about 0.3× real time on the M1's CPU alone, and 0.08–0.13× with other runs beside it. The game steps stage 2 on the GPU where WebGPU allows.
