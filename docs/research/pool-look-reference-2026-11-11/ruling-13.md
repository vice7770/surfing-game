# Ruling 13: re-size the Wave Pool Barrel to the reference (2026-11-11)

Answered from the code, the knowledge base and recall. No web, no new runs. Tags: [M] measured earlier, [KB] knowledge base, [R] reasoned, [U] recalled (unchecked), [P] provisional.

## 1. The pace

- The code's relation: V_reef = c_p / sin(θ_p + φ) (`src/wave/pool.ts:400-402`). Along a reef that is uniform along its length this speed is fixed by Snell at the platform. [KB]
- Today: c_p ≈ 6.4 m/s (10 s, 4.5 m, linear) [R]; θ_p + φ ≈ 68–70°. So V ≈ 6.9–7.45 m/s advised, **6.45 / 7.1 m/s measured over u 65–175** (the barrel section). [M, consult log 2026-11-01]
- The 8.5–10.4 m/s is the **convex start, u 40–65** [M]. There the crest eases 1.6 → 0.9 m along the reef, so the breaking-depth contour is not parallel to the reef and the break sweeps it fast. Riders wait at `takeOffS` 40, inside that fast part. [R]
- So the barrel section already runs at the owner's 7 to 8 m/s. The "tunnel reaches the surfer fast" is (a) the fast start where the rider waits and (b) the gentle wall. [R]
- 9 m/s is 32 km/h: mid-range of the owner's own clip (27–42 km/h). It is not too fast for a real 2 m wall. It is too fast for a 17° wall: gravity along the face is 2.9 m/s² at 17° against 6.9 at 45°. [R]
- The floor of the pace: V cannot go below c_p (sin = 1). With a 2 m wave c_p is about 6.7–7.0 m/s, so 7 to 8 m/s means θ_p + φ of 60–75°. **Keep `reefAngle` 40.** [R]
- **2 m faces: Froude-scale today's 1.8 m Barrel by λ = 1.11.** Depths × 1.11, times and speeds × 1.054, slopes unchanged: platform 5.0 m, crest 1.0 m, period 10.5 s, feed wave about 1.47 m, peel 7.1 → about 7.5 m/s. [R]
- The reference [U, low confidence]: a Kelly Slater Wave Co. pool pulls a hydrofoil along a track at roughly 30 km/h (about 8 m/s); faces about 2 m; the wave is one solitary-type hump on still water, and the break is locked to the foil's speed. Depths are not public as far as I know. Time the clip's break past a fixed mark before trusting any of this.

## 2. The wall ahead of the tube

- A point s metres ahead of the break along the reef is the same crest s / V seconds before it breaks, farther out on deeper water. 30 m ahead at 7.5 m/s is 4 s, about 20 m back along the ray, about 1.0–1.4 m deeper. [R]
- By Green's law the height there is already about 0.85–0.9 of the breaking height [R]. So the wall's **height** ahead is there in the solver. The meter's bars below test it.
- What is missing is **steepness**. A crest's face slope grows with H / h: about 7° for 1.5 m on 4.5 m, about 11° at H / h 0.43, about 15° at 0.53 (solitary-wave shape) [R]. The solver can hold these (its limit is 15–20°).
- A 15–20° face 2 m tall already reads dark from a low shore camera: it reflects less sky and shows the water body. It needs a dark body colour (gap 2, render). [R]
- Honest levers, in order: (a) the bigger wave (this step); (b) start the case's forming profile at the library's first frame, **3 √(h0/g) before vertical, about 2.1 s** [KB, pool-tube-runs-2], against 0.5 today: at 7.5 m/s that is about 16 m of formed wall ahead in place of 2.7 m [R]; (c) a higher H / h on the platform (shallower platform), which needs a new Basilisk run. At 3.25 m the waves broke at the knee [KB], so not below about 3.8 m × λ.
- The library cannot give "tens of metres": 16 m is its limit. Beyond that the wall is the solver's own wave. [R]
- **Must not:** stretch a case in time or along the crest to lengthen the wall; scale a case's height apart from its length; tilt normals or paint a dark band where the surface is gentle; draw a wall the rider does not hit; low-pass the flow; move the throw off the throw depth.

## 3. The Basilisk case

- **`pool_straight_big` scaled by 1.11 (h0 5.0 m).** Exact Froude similarity if the floor is scaled with it (same H/h0 0.437, same crest 0.2 h0, same slopes). No new run. Its velocity data scales too (speeds × 1.054). [R]
- Not the Canyon case: a different bed (6 m foot, 1:23) [KB].
- A new run (about 4.5 h, M4, level 13, with `run_velocity.sh`) is needed only if the transect's ratios change. It needs: h0 = the new platform depth; crest depth / h0; the face's slope along the ray; H/h0 scouted at level 10 until the foot crest matches the solver's at the knee; 64 h0 domain; frames from 3 before vertical. [KB]

## 4. First step: `?poolSize=ref` (Barrel, straight floor only; default byte-identical)

Numbers to try first [P]:
- `platformDepth` 5.0; `crestProfile` [[0, 5.0], [30, 1.78], [65, 1.0], [175, 1.0], [205, 2.2], [235, 5.0]]; `gradient` 1/9.5 and `backSlope` 1/10 unchanged; `flatWidth` 6.7; `kneeRounding` 3.3.
- Period 10.5 s. Feed wave 1.47 m, then tuned so the foot crest at the knee is 1.20 m (1.11 × the big's measured 1.08 m). Feed depth 9 m kept (the machine is unchanged).
- The tube case: `pool_straight_big` with lengths × 1.11 and its clock × 1.054. Break-depth fit and `startOut` × 1.11.
- Check the knee (now about 42 m from the crest line) still clears `platformLead` and the ramp foot.

Bars (solver probes and headless stills only):
- A. The meter's face at the take-off: 2.0 m ± 0.1.
- B. Peel: median 7.0–8.0 m/s over u 65–175. Report u 40–65 apart (expected 9–11).
- C. Foot crest at the knee 1.20 m ± 5 %; first break 2.1 m ± 0.15 deep; no onset deeper than 3 m.
- D. Lip jets on at least 90 % of onsets over u 40–90, as today.
- E. The wall ahead: the solver's wave height 10 / 20 / 30 m ahead of the break along the reef at least 0.85 / 0.75 / 0.65 of the face; report its steepest slope at each (no bar yet).
- F. 600 s without a blow-up; fastest water at most 1.15 × today's; water on the reef top at least 0.2 m in the troughs; the default's uniform snapshot unchanged.
- One still from the shore side at the reference's angle, beside today's.

Must-nots: no change to the default sizes or their meter; no hand-tuned case shape; no change to the reef angle or the machine's direction in this step; no rider runs as evidence.

Next, ranked:
1. **`?tubeForm=early`:** the forming profile from 3 √(h0/g) before vertical, its share eased in, in ruling 7's order (continuous crest clock first). Bars: formed wall at least 12 m ahead of the throw; the surface's rise through the felt water no higher than today's.
2. **Pool colour (gap 2, render only):** a deeper, bluer body. Then, if the wall is still too gentle, a shallower-platform transect with its own Basilisk run.

## 5. The owner's calls

- Where the rider waits: inside the steady section (s about 70) rather than the fast start, or keep s 40.
- 2 m as a third Barrel size, or in place of 1.5 / 1.8.
- Period 10.5 s for this size (exact scaling), or keep 10 s and accept a 5 % mismatch with the case.
- One wave on still water, as the foil pool makes, or the 10 s train.
- Whether a 15–19° wall, 2 m tall and dark, is enough ahead of the tube, or to spend an M4 run (4.5 h) on a shallower platform.
- Size alone will likely not make the catch easy: the wall stays near 17° outside the case. Expect the gain from the rider's place and the earlier forming profile.
