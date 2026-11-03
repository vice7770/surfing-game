# The water-physics advisor's step 3 ruling: the pool tube made rideable (2026-11-03)

Read on origin/main 4eee1e5f and claude/pool-tube-hole 33e6a371. The advisor edited no game code. Its scripts are in
/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/:
`scripts/align3.py` and `align4.py` (the anchor, the hole, the wall, the air), `scripts/union2.py` (the saddle),
`scripts/kin.py` and `tipfall.py` (kinematics), and `data/` (copies of the case libraries and step 2's section).

## The ruling in short

The hole comes from where the piece is placed. It is not a size limit or a physics limit.

- **The fix:** anchor each case on the solver's **lower face** instead of its crest, and let the case only **add**
  water on top of the solver's water, never replace it.
- **What that gives:**
  - The board rides the solver's own face. Below about 0.4 H the solver's face and the case's lower face are the same
    surface to within centimetres.
  - The case's steep wall and lip stand above the solver's water, about 2 m ahead of the solver's crest, and the void
    opens over the board.
- **The solver's crest cannot throw a roof on its own,** at any measured jet speed.

## Evidence (measured unless marked inferred)

### 1. The solver's crest can't launch a jet

- **The condition:** a free jet leaves a convex crest only if u_rel² > g·R, where R is the crest's radius of curvature.
- **The solver's crest:** it falls 0.15 m in the first 1 m (0.14 m at 1.8 m). So R = x²/(2Δy) ≈ 3.3–3.6 m, which
  needs u_rel ≥ √(gR) = 5.7–6.2 m/s.
- **Measured tips** leave only 0.16–0.35 C faster than the crest:
  - Erinin 2023: 1.16–1.35 C at impact;
  - our cases: 1.25 C (pool) and 1.31 C (a38).

  That is 0.8–1.9 m/s, 3–7× too slow.

### 2. The case and the solver agree on the lower face

- **The test:** shift the case along the ray so its face crossing at 0.3 H above the trough sits on the solver's crossing
  at 0.3 H_s.
- **The result at 1.5 m,** from τ −1.7 s through life 0.6:
  - over 0.05–0.4 H_s the two faces differ by 0.003–0.06 m (p50);
  - the case's floor lies at most 0.03 m under the solver's in front of the wall.
- **The offset:** that shift puts the case's crest 1.9–2.2 m (1.5 m) and 2.1–2.5 m (1.8 m) ahead of the solver's crest.
  This matches step 2's mid-face offset.
- **Caveats:** one dumped section (s 55), held steady. The 1.8 m figures are self-similar scaling (inferred).
- **Why (inferred):** an eddy viscosity smears a steep front into a slope centred on the true front, as a viscous Burgers
  shock is a tanh centred on the inviscid one. The solver's crest is the rounded, lagging top.
- **So** `sweptLoft.ts:1122` (`ax = s.x − crest·nx`) hangs the wall about 2 m behind where the case puts it, and the
  solver's face water fills the void.

### 3. In Navier–Stokes the tube's floor is a moderate face

The case's face under the lip:

| Height above the trough | Face angle |
| --- | --- |
| below 0.3 H | 16–24° |
| to 0.45 H | about 35° |
| to the throat, about 0.7 H | about 50° |

Only the top is vertical. So riding the solver's ~23° lower face under the case's wall and lip is the honest barrel for
this wave.

## Answers

### 1. Riding the solver's face under a roof

Yes, it is honest, with one condition: **support = max(solver surface, case floor); water = the union of the two.**

- **Below about 0.4 H:** the board rides the solver's surface.
- **Higher up:** the board meets the case's steeper face and wall, above the solver's water. So the support never drops
  below the solver's surface.
- **Continuity:** the lower face never moves. The upper face rises as the wall grows from the case's own frames, at
  ≤ about 1 m/s.
- **A rider above about half height when the wave throws** is lifted into the wall and pitched: the honest over the falls.

### 2. A roof from the solver's lip

The solver's crest gives none. What the solver supplies:
- H and C;
- when and where the wave breaks (the join and the throw);
- the face;
- the jets' water and momentum: the ledger, unchanged (`SweptCrash.ts:359`).

The roof's shape comes from the case, placed on that face:

| | Tip leaves | Tip falls | Lip thickness | Landing ahead of the drawn crest |
| --- | --- | --- | --- | --- |
| Pool case | 1.25 C, near horizontal | ~0.75 m/s (0.07 g) | 0.30 H | 0.9–1.45 H |
| a38 | 1.31 C | 0.73 g | 0.15–0.19 H | — |
| Measured (Erinin 2023; Drazen 2008) | — | 0.75–0.82 g | — | 0.68–0.90 H_i; Surf Ranch ≈ 0.9–1.0 H |

The hollow's height follows H through the existing Froude foot-crest scale: ×1.29 from 1.5 to 1.8 m.

### 3. The M4 cases as detail only

- **Frame:** the lower face (the crossing at 0.3 H), scaled by H through the existing foot-crest Froude key. **Not by
  face width.**
- **Carry over** everything above the anchor:
  - the upper face and wall, the crest, and the lip's thickness, curl and tip;
  - their motion relative to the lower face. The case's crest outruns its own lower face by 0.2–0.3 C, which opens the
    void;
  - the timing: open 1.24 / 1.40 s for the pool case, 0.70 / 0.79 s for a38; collapse 0.21 / 0.24 s.
- **Don't carry over:**
  - the case's lower face and trough;
  - the forward rest (`sweptLoft.ts:1141, 1354–1388`): it should end at once, so keep it only as a guard;
  - the crest anchor;
  - the case's back slope where it lies under the solver's crest.

### 4. The lip as an impact

- **Key it on the drawn lip** (one water). Keep today's drag rule: curl water drags and doesn't float, and the lip's flow
  ramps to the tip's velocity (`PhysicalSurfWater.ts:623`, `AttachedRider.ts:2310`).
- **The catch-up clock:** keep 2× before the throw; after the throw, cap it at 1.25× (`sliceClock.ts:188`).
- **Trace why the pool sits at the cap:** 1.76–2.03× with the crash on, 1.23× with it off. Inferred: a feedback in which
  the crash's pace (`SweptCrash.ts:238`, z = jetBase + jetPace·τ) feeds τ back into the point's position and moves the
  fitted throw.
- **Correction:** step 2's "about 4 g" is wrong for the pool case, whose tip falls at 0.07 g. The 2× clock's real damage
  is that it doubles the lip's speeds and halves the open tube (1.24 → 0.62 s).

### 5. The transition

- **Start each slice at the case's earliest frame,** τ = −3 √(h0/g): 1.69 s before the throw at 1.5 m and 1.91 s at
  1.8 m. The wall grows from ≤ 0.07–0.10 m to 0.76 / 1.02 m at the throw, while the lower face never moves.
- **This needs a lagged throw at the pool:**
  - join the crest Δd = |τ_e|·C·S_ray ≈ 0.45 / 0.50 m deeper than its throw depth, instead of at the white;
  - the throw stays at the later of the throw-depth crossing and the solver's break;
  - this reopens the 2026-11-01 zero-lag ruling.
- **Guard:** a slice whose crest the solver hasn't broken by its foreseen throw + 0.3 s retires over 0.5 s (provisional).
- **Fallback,** if the earlier join misbehaves: a formation weight ramping 0 → 1 over 0.85 / 0.96 s from the join
  (provisional).

## The design

Pool only: a `faceAnchor` flag on the pool's `BarrelSpot`. Every other spot stays byte-identical.

### 1. The anchor

In `sweptLoft.ts:1122`, in both the drawn and the contact builds: a = x_s(f) − x_c(f) along the ray, with f = 0.3
(provisional; 0.2–0.4 keeps δ within ±0.1 m before the throw).

- **x_s:** the first point ahead of the solver's crest where heightAt = trough_s + f·H_s. trough_s is the lowest level
  within 3 H ahead, read every 0.25 m and interpolated linearly.
- **x_c:** the case's lowest crossing at trough_c + f·H_c. Search from `LANDMARK.crest` before the throw and from
  `LANDMARK.throat` after it.
- **From life 0.5,** extrapolate x_c at its mean speed over life 0.3–0.5. The lower face moves steadily at 3.9–4.4 m/s,
  but the f-crossing jumps 0.2–1 m as the jet nears the face.
- **Smooth a along σ** with the clock's 2 m biweight.
- **No clean crossing on the solver's face:** fall back to the crest anchor and count it.
- **The anchor's velocity** (`:1131`, used for the lip's flow) comes from successive anchors.

### 2. The support

In `sweptLoft.ts:1292–1304`, `sweptContact.ts:342/459` and `PhysicalSurfWater.ts:428–431, 489, 595`:
- floor vertices (the back slope before the crest, the face from the throat on, the extensions) become
  y = max(y, heightAt);
- a point is water if it lies below the solver's surface or inside the loft;
- floorAt = max(loft floor, solver);
- lip vertices are unchanged; the lip lands where it meets max(floor, solver).

### 3. The clock

After the throw, τ runs at 1–1.25× real time.

### 4. The lag

In `barrelSpots.ts:257–280` (`POOL_JOIN`, `POOL_ONSET`) and the pool entry at `:321`.

### 5. Thrown front ends

They now carry a 0.8–1.0 m wall. Blend them over max(1 m, 1 H), keeping the seam under about 30° (inferred).

### Cost (estimate; measure it)

- **The reads:** the anchor takes about 20 heightAt reads per slice; the clamp, one per floor vertex.
- **The time:** +0.5–1 ms per build on the M1 (page and worker each), about 0.2–0.4 ms on the M4 Pro (inferred).

### What stays

- the solver and its breaking, the front and σ;
- the pool cases and their Froude key (a38 behind `?poolTubeCase=a38`);
- the crash ledger;
- the contact's parity and layers, and the curl-water rules;
- the T3 foam and the 2026-11-01 drawing rulings;
- Classic;
- every other spot.

## Bars for step 6

Frame by frame at 1.5 and 1.8 m, with the pool cases and a38, using the step 2 probe.

1. **Support:** support − solver ≥ −0.02 m on 100 % of face reads (0.05–1.0 H_s).
2. **Boards and riders:** no lone board drops more than 0.1 m. Prone riders still on at 3 s are within 1 of the
   solver-only A/B, with lip hits counted separately.
3. **The lower face:** the gap over 0.05–0.4 H_s through life 0.6 has p50 ≤ 0.05 H_s and p95 ≤ 0.15 H_s.
4. **Rise:** the support under a point fixed in the wave's frame rises ≤ 0.02 m per step and is never below the solver.
5. **Air under the lip** (over max(floor, solver)):
   - > 0 on ≥ 90 % of slices at life 0.1–0.8;
   - p50 within ±30 % of the case's own air gap;
   - the 1.8 / 1.5 m ratio 1.1–1.45.
6. **Touchdown:** the tip first touches down where the solver's breaking strength is ≥ 0.3, within ±0.5 H_s, on ≥ 90 %
   of slices, and 0.6–1.5 H ahead of the drawn crest.
7. **The clock** after the throw: p50 0.95–1.05×, p95 ≤ 1.25×. Open 1.24 / 1.40 s ±15 % in solver time.
8. **Geometry:**
   - no holes or folds; ray advance ≥ 0;
   - |da/dσ| p95 ≤ 0.3;
   - the saddle between the solver's crest and the drawn crest ≤ 0.1 H_s (now about 0.02–0.13 m for the pool case and
     0.03–0.2 m for a38).
9. **Lip hits:** every placement whose head or torso the lip's water reaches before touchdown is recorded, and ≥ 90 % of
   those fall within 0.5 s.
10. **The ledger:** jets thrown and poured, and the SurfMeter H, within ±5 % of main.
11. **Byte identity:** the pin check is identical for every other spot, and two pool runs are identical.
12. **Cost** on the M1 and the M4 Pro.
13. **Ride-camera strips** at the throw, mid-open and touchdown.

## URL switches

All go in `SurfZoneConfig`, read by page and worker alike; online rooms pin the defaults.
- `?tubeFace=old`: no clamp (the support is the loft's floor wherever the loft is).
- `?tubeFrom=piece`: the crest anchor plus the forward rest. Together with `?tubeFace=old` it gives today's build byte
  for byte.
- `?tubeLag=0`: join at the white, with zero lag.
- `?tubeClock=old`: the 2× catch-up after the throw.

## What the owner will see (estimates from one section)

- **The build-up:** the top of the wave stands up over about 1.7–1.9 s into a wall about 0.75–0.9 m (1.5 m) or
  1.0–1.2 m (1.8 m) above today's slope, about 2 m further forward than today's crest. It then throws. The board stays on
  the same lower face and never drops.
- **The tube at each size:**

  | | Air under the lip | Reach in | Open |
  | --- | --- | --- | --- |
  | Pool case, 1.5 m | 0.2–0.45 m (a curl, no room to crouch) | 0.1–0.3 m | 1.24 s (today about 0.62 s) |
  | Pool case, 1.8 m | 0.4–0.6 m | 0.1–0.4 m | 1.40 s |
  | a38, 1.5 m | 0.5–0.7 m (a deep crouch only just fits) | 0.9–1.2 m by touchdown | 0.70 s |
  | a38, 1.8 m | 0.7–0.9 m (a deep crouch fits) | 0.9–1.2 m by touchdown | 0.79 s |

- **Surf Ranch for comparison** (Feddersen 2023): Froude-scaled, W ≈ 0.45–0.8 / 0.55–1.0 m. Neither case reaches the
  owner's 1–1.2 m for 2–3 s; that is the parked size work.

## The owner's calls

1. "Never below the solver's surface" instead of "always the solver's surface". Recommended yes.
2. Which case draws the tube until the size work: the pool's own, or a38.
3. Lip hits: today's drag rule, or a hard wipeout when the lip's water reaches the head or torso.
4. Un-park the tube size right after this (a bigger-tube reef; runs sized by the game's crest, A0 about 0.19 / 0.245).
5. The small saddle behind the drawn crest: keep or fill.
6. Later: the same anchor at Padang and the Canyon.

## Rulings reopened

- **2026-11-01, zero lag at the pool:** reopened.
- **2026-10-22, 2× catch-up after the throw:** capped at 1.25× at the pool.
- **Step 2's "4 g":** wrong.
- **The forward rest's premise:** a symptom of the crest anchor.

## Consult-log row (paste at the top of docs/research/water-physics/consult-log.md)

| 2026-11-03 | Pool surfable tube, step 3 (the advisor's design; plan docs/superpowers/plans/2026-11-03-pool-surfable-tube.md; step 2 on claude/pool-tube-hole 33e6a371) | The owner: the tube is "a hole that the surfer falls into"; direction: ride the wave's own water, the tube from its lip, the M4 cases detail only, the lip landing is the wipeout. Step 2: the loft hangs the case from the solver's crest, its 77–84° face 1.8–2.4 m behind the solver's 23–24° face, the support 0.3–1.1 m under the face, the void in the solver's water, zero lag, the clock at its 2× cap. Rule on: riding the solver's face under a roof; a roof from the solver's lip; what of the cases carries over; the impact and the catch-up; the transition; the bars | **Cause: placement.** The case and the solver agree on the lower face (0.05–0.4 H_s within 0.003–0.06 m p50 once the case's 0.3 H face crossing sits on the solver's; one dumped section held steady, life ≤ 0.6); that shift puts the case's crest 1.9–2.5 m ahead of the solver's (step 2's mid-face offset). Inferred why: an eddy viscosity smears a steep front into a slope centred on it (a viscous Burgers shock is centred on the inviscid one); the solver's crest is the rounded, lagging top. **The solver's crest gives no roof:** a jet leaves a crest of radius R only if u_rel² > gR; R 3.3–3.6 m needs 5.7–6.2 m/s, while measured jets leave 0.16–0.35 C faster (Erinin 2023; cases 1.25 / 1.31 C). **Design, pool only:** anchor at the lower face (a = x_s(0.3 H_s) − x_c(0.3 H_c), 2 m biweight along σ, x_c extrapolated from life 0.5); support = max(case floor, solver), water = union; the lip lands where it meets max(floor, solver); slices from the case's earliest frame (join 0.45 / 0.50 m deeper than the throw, reopening 11-01's zero lag; fallback a 0.85 / 0.96 s weight ramp); post-throw clock ≤ 1.25× (was 2×; trace the crash pace's τ feedback); thrown ends blend over max(1 m, 1 H). Impact on the drawn lip, today's drag rule. Carry the case above 0.3 H (wall, crest, lip thickness, curl, tip, its crest outrunning its lower face by 0.2–0.3 C, timing), Froude-scaled by the foot crest; not its lower face, trough, forward rest, back slope under the solver, or the crest anchor. Switches ?tubeFace=old and ?tubeFrom=piece (together = today), ?tubeLag=0, ?tubeClock=old. Bars: support ≥ solver − 0.02 m, no lone-board drops, lower faces p50 ≤ 0.05 H_s, rise ≤ 0.02 m a step, air > 0 on ≥ 90 % of open slices and ±30 % of the case's own, landing where the solver's strength ≥ 0.3, clock 0.95–1.05, no holes or folds, saddle ≤ 0.1 H_s, lip on head or torso → fall ≥ 90 %, ledger ±5 %, pin identical. Expected: wall 0.75–0.9 / 1.0–1.2 m over today's slope; air 0.2–0.45 / 0.4–0.6 m (pool cases), 0.5–0.7 / 0.7–0.9 m (a38); open 1.24 / 1.40 s (a38 0.70 / 0.79); Surf Ranch scaled W 0.45–0.8 / 0.55–1.0 m. Corrected: step 2's "4 g" (the pool tip barely accelerates, 0.07 g; 2× doubles its speeds and halves the open time). Owner's calls: never-below vs always-the-solver's, which case until the size work, a hard lip trigger, un-parking the size work, the saddle. Outcome: pending (steps 4–6). |

## Sources (all opened by the advisor)

- Erinin et al. 2023, Part 1: https://arxiv.org/pdf/2210.01925 (table 2).
- Drazen, Melville & Lenain 2008:
  https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2008_Drazen_Melville_Lenain-Journal_of_Fluid_Mechanics_vol_611.pdf
- Feddersen et al. 2023: https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf
- Cameron, Notes on Burgers's equation: https://www.math.umd.edu/~mariakc/burgers.pdf
