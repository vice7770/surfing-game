# C2: the whole breaking wave from the Basilisk library, the plan

Written 2026-11-12 by a planning agent (Opus, effort high, read-only), at commit 7f37d471. Tags: [C] read in the code or the docs; [R] inferred. The advisor's decisions on this plan are in `ruling-28-c2-plan.md`.

## 0. What exists today [C]

- **The sea:** Boussinesq, 1 m cells in the surf zone, stretched to 4 m offshore (`src/wave/SurfZoneSimulation.ts`), on the GPU or the CPU in the worker. Kennedy breaking, foam, aeration, rollers.
- **The swept tube:**
  - `BreakingFront` follows the crests; `sliceClock` gives each point its clock τ, smoothed along the crest with a 2 m biweight.
  - `ProfileLibrary` holds 128-point frames with landmarks at fixed indices. It blends the two bracketing A0 cases, takes the *nearest* slope, and scales by Froude from the foot crest.
  - `SweptLoft` is built in the worker for the contact (`SweptContact`) and on the page for the drawing (`src/scene/barrel/SweptBarrel.ts`): one water.
  - `SweptCrash` pours the lip's water into the solver.
- **The rider** reads `SurfWater.sampleAt` and `surfaceAt` (`src/physics/SurfWater.ts`, `PhysicalSurfWater.ts`). The tube enters through `ContactHit` (`floorY`, `wallAlong`/`wallUp`, `ceilingY`, `seam`, `dug`).
- **Velocity:** VELOUT files exist for the three pool-tube cases (`docs/research/pool-tube-flow/data/*_velocity.json`, 5 depths, down to 0.1 h0). Nothing in `src/` reads them yet.
- **The case format** (`profileFormat.ts`, BRL2) stores the surface and the tip's speed only: no flow, no bore, no air.
- **Online:** each client runs its own sea from the room's seed and clock. A late joiner gets a donor's `SurfZoneState` (`server/Room.ts` `needSea`, `src/wave/surfZoneState.ts`). Rooms pin URL switches to their defaults.
- **Budget (M1):**
  - the pool worker step is 8.3–8.7 ms without the tube work and 10.7–11.5 ms with it (the perf fixes then took 1.6–2.0 ms off);
  - the page's barrel work is 2.5–2.9 ms;
  - Canyon at 400 m is 15.6–18 ms a step, already at the 16.7 ms limit.

## 1. The architecture

**The live sea**
- Offshore of the handover line it is the wave, as today.
- Inside the zone it keeps running underneath, hidden. It supplies the mean level (set-up), the mean currents, the backwash and the beach's own break. Its wave-scale surface is not drawn or felt there [R].
- The pool keeps its 1 m sea everywhere. The Canyon coarsens the zone to 2 m only if the budget needs it [R].

**The handover**
- A depth contour per spot, about 5 s before the throw. In the pool that is about 30–35 m seaward of the throw line, where faces are 11–15° [C/R].
- A slice hands over when the sea's crest along its ray crosses that contour. The crossing time t_h(σ) is fitted along the front with the 2 m biweight, not taken cell by cell (the lesson of `crestLine=top` and the smooth clock) [R].

**The blend**
- Over 1.2 s, in each crest's own frame, not as a height crossfade [R]:
  - y(ξ) = (1−α)·y_sea(ξ) + α·y_case(ξ), with ξ measured from each one's own crest;
  - the crest place is (1−α)·x_sea + α·x_case;
  - the water speed is blended the same way.
- This avoids a doubled crest, since the sea's crest runs at 6.8 m/s and the case's at 6.0.
- The case stands on the local mean level: a one-period running mean of the sea at the slice.

**Picking the case: state matching** [R]
- Each case is tabulated along its own path: crest depth d̂(τ), Ĥ/d̂, crest speed and face angle against τ.
- At the handover, each slice measures H/d_h, T·√(g/d_h) (the period from the front's crest interval) and the bed along its ray.
- In each bracketing case the library finds τ_h where Ĥ/d̂ matches, sets h0 = d_h / d̂(τ_h), and blends multilinearly. When the sea and the case agree, this reduces to today's foot-crest pick.
- **Bed keys are continuous numbers:** the slope along the ray and the reef crest's depth HS/h0 (plus a second slope where the ray bends). Neighbour slices therefore blend and never switch case. `ProfileLibrary`'s *nearest* slope must become bracketing.
- **The wave direction enters twice:**
  - the ray (the crest's normal at the handover) sets the slope along it, which is the contour slope × cos(angle);
  - the crossing times t_h(σ) set the peel.
- Keys are smoothed along σ over 5–10 m. Each slice is then a pure function of time: τ(t) = τ_h + (t − t_h)/√(h0/g).

**Joining slices without ribs or folds** (rulings 17–22) [C/R]
- Smooth clocks and keys along σ.
- **Arc-length frame joins:** every stored frame is respaced by arc between the landmarks before any blend, in time or across cases. This is ruling 19/20's `frameJoin=arc`, built into the new library.
- `loftMesh=arc` vertices.
- No straight-line anchor joins: the place follows the case's own crest track from the smoothed handover anchor.
- **A hybrid surface.** Where the case is single-valued (the wall, the trough, the bore's top), its height is written into the water's render nodes in the zone, so the sea's own mesh, light and foam draw it with no edge. Only the overturned part (the lip and the tube, from where the face is too steep for 1 m nodes until the collapse) is the loft. Both read the same blended curve, so the join is exact by construction [R].

**The peel** comes from the beach and the wave direction; it is not a parameter [R].
- Each slice's throw time is t_h(σ) plus the case's own time from τ_h to the throw.
- The pool uses straight rays. The Canyon traces rays through the smoothed bed with Snell's law, and detects crossing rays (caustics in the bowl) by the ray map's Jacobian.
- Bar: the throw line must agree with today's `sliceClock` prediction.

**The coarse sea and the coupling** [R]
- **One-way in the zone:** the library reads the mean level and the mean current Ū; the case's flow is added to Ū.
- **Two-way only in a hand-back band:** from touchdown + 3 s to + 5 s, the sea under the case's bore is relaxed toward the case's column volume and flux (τ_relax about 0.3–0.5 s). The sea's own bore then inherits the library bore and carries it to the beach.
- `SweptCrash`'s pour is off under the switch, so mass is not counted twice.
- This needs a new Basilisk output, **QOUT**: column volume, ∫u dz and the air share per column, per fine frame.

**The rider** [R]
- `LibraryWater` (or a `library` option in `PhysicalSurfWater`) returns the same `WaterSample`:
  - surface, normal and slope from the library in the zone;
  - flow from VELOUT at the sample depth, plus Ū;
  - `breaking`, `voidFraction` and `turbulence` from the case's phase and air share;
  - the tube fields through `ContactHit`, as today;
  - bed and depth from the sea.
- **One change for the surfer track:** a new optional field `flowAccelX/Y/Z`, the water's own acceleration from frame differences. Ruling 27's B needs it.

**Foam and white water** [C/R]
- In the zone, foam and aeration sources come from the library (the touchdown line, the bore's air share). The sea's own breaking sources are withheld there, as `SweptCrash` does today over open curls.
- Foam moves with the library's flow, then with the sea after the hand-back.
- The bore's top is stored as one height per point plus an air share.

**A train of waves**
- Each crest hands over on its own; a case already breaks into the trough of the wave before it [C].
- Along one ray, ownership is split at the trough: wave n's bore ahead, wave n+1's wall behind [R].

**Online** [R]
- Every decision uses only + − × ÷ √, as `ProfileLibrary` already does.
- Slice records (σ, origin, ray, t_h, τ_h, keys, h0, mean level) go into `SurfZoneState` as `library?`, so a late joiner gets them.
- Continuous keys mean that small differences between clients' seas give small differences in shape, never a different case. Rooms pin `wave` to the default until step 10.

**Frame budget** [R]
- The library adds about 0.5–1 ms per step on the M1 (about 600 slices × 4 cases, plus writing about 28k zone nodes).
- It saves the zone's loft-over-sea union, the crash and the roller and curl work.
- The Canyon needs 2 m zone cells or a vertex-shader blend (frames in a data texture) to stay at or under 15 ms on the M1.

## 2. Steps (each behind `?wave=library`, off by default, rooms pinned)

1. **The C2 case format and library; no game look.**
   - **Files:** `tools/basilisk/periodic.c` (QOUT); `tools/basilisk/analysis/c2_library.py` (arc-spaced frames from −8 to touchdown + 8 √(h0/g), the path table, velocity at 2 depths as float16, the bore envelope); `scripts/barrel-library.ts --format brl3`; `src/wave/library/caseFormat.ts`; `src/wave/library/WaveLibrary.ts` (multilinear keys, arc joins, state matching).
   - **Bars:** stored frames reproduced within 0.005 m; leave-one-out error 0.02 m at 90 %; the path table monotone near the break; T5 against today's library, H within 2 % and the crest place within 0.5 m; QOUT mass constant within 0.1 % per frame; BRL2 unchanged byte for byte.
   - **Runs:** a level-9 QOUT smoke run on the M1 (minutes); T5 at L13 as the first case.
2. **The pool library runs.**
   - 9 cases: A0 at 3 values (0.355 ± 15 %), T 10.5 s, 3 beds on a continuous (slope, HS/h0) line. Leads 10/8, tmax = touchdown + 8, window to about 58 h0, with VELOUT and QOUT.
   - **Cost:** L12 first, 2–4 h on the M4 (8 at once) or about 1 day on the M1; then L13, 16–40 h on the M4 with VELOUT.
   - **Bars:** every pool slice at the handover falls inside the cases (clamped under 2 %); every case throws; files 15 MB or less in total.
3. **Handover and slices on the pool, drawn and felt (surface only).**
   - **Files:** `src/wave/library/Handover.ts`, `SliceField.ts`, `meanLevel.ts`, `zoneSurface.ts`, `LibraryWater.ts`; the loft reused for the overturn only; the switch in `PhysicalMode.ts`; wiring in `SurfZoneSimulation.ts`; `src/scene/library/LibraryZone.ts`.
   - **Bars:**
     - at the handover: crest within 0.25 m, height 0.95–1.05 of the sea's, mean step under a board ≤ 0.03 m, rise ≤ 0.4 m/s median;
     - ruling 17's J1–J3 and J5 (σ-step 0.05 m at 90 %);
     - no quad over 90°;
     - drawn = felt within 0.005 m;
     - stills with no rib, no slit and no edge at the handover.
   - **The owner rides** the library's wave shape, after A-lite.
4. **The water's speed from the library.**
   - **Bars:** within 2 % of VELOUT at the stored points; no jump over 0.3 m/s within 0.1 s under a board at the handover; the crest water's share following the measured 0.6 → 0.84 → 1.
   - **The owner rides** with the wave's real push.
5. **The hand-back, the set-up and the foam.**
   - **Files:** `handBack.ts` with a GPU forcing pass, the foam and aeration sources, the crash pour off.
   - **Bars:**
     - at the hand-back, the bore's place jumps under 0.3 m and its height under 0.05 m;
     - mean-level drift under 1 cm in 600 s;
     - set-up within 30 % of today's;
     - backwash and rips still there (correlation ≥ 0.8);
     - foam on the bore in stills.
6. **The train, the direction and the peel on the pool.**
   - **Bars:**
     - the throw line within 0.2 s and 1 m of the sea's prediction;
     - the peel within 10 % of 6.4–6.8 m/s;
     - no ownership fold between waves;
     - stable over 600 s.
7. **The pool's budget.**
   - **Bars:** M1 worker ≤ main + 1.0 ms; page ≤ 2.5 ms; the owner's M4 holds 60 fps at High.
   - The vertex-shader blend comes only if a bar misses.
8. **The Canyon library.**
   - 32–64 runs: L12 everywhere (4–16 h on the M4); L13 only for the tube cases (1–3.5 days).
   - Two-slope beds where rays bend.
9. **Canyon wiring.**
   - Traced rays with the caustic guard, A-frames peeling both ways, close-outs, and 2 m zone cells if needed.
   - **Bars:** as in steps 3–7, plus the Canyon hashes unchanged with the switch off, and ≤ 15 ms on the M1.
10. **Online.**
    - Two runners with the same seed give byte-equal slice records.
    - A late joiner's state equals the donor's.

## 3. Risks, ranked

1. **The 17 % gap.** A break picked from the sea's own wave is about 0.83 × smaller unless the pool's swell is larger. That is the owner's design call.
2. **The rider on steeper water.** A-lite (`?legPower=cap`) must come first.
3. **The library's cost and coverage at the Canyon.** VELOUT doubles the run hours.
4. **The coupling:** one-way plus a hand-back band, τ_relax, and whether the hand-back comes at 3 s or 5 s.
5. **The limits of 2D cases:** bowls, crossing crests, flow along an oblique crest, and rays converging (a √(b0/b) height correction?).
6. **The Canyon's budget on the M1.**
7. **The bore's look:** one height per point plus an air share may read as a lump.
8. **Online divergence** of handover decisions.

Also open: Bo 1000 or 4000 for the library; the long reach's low sea; where the handover contour sits per spot.

## 4. Before step 1

- T5's L13 data has landed, with ruling 26's table at Δ 4.5, 5 and 5.4 s, and its overlap with today's library passes.
- The advisor has decided state matching and continuous bed keys, and the QOUT patch and the longer runs.
- The owner's M4 is free for about 2 days, or the M1 runs L12.
- The surfer track agrees to the `flowAccel` field, and A-lite is merged before the owner rides step 3.

**Critical files:** `src/wave/barrel/ProfileLibrary.ts`, `src/wave/barrel/sweptLoft.ts`, `src/physics/PhysicalSurfWater.ts`, `src/wave/SurfZoneSimulation.ts`, `tools/basilisk/periodic.c`.
