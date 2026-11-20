# The new surfer: design for steps 3.1 to 3.6 (`?rider=new`)

Written 2026-11-13 by a design agent (Opus, effort high, read-only) at commit c7e6e2e6, for the spec `docs/superpowers/specs/2026-11-12-surfer-physics-redesign.md`. Tags: [R] read in code or docs; [M] measured in an existing study; [I] inference or estimate. The advisor's decisions are in `ruling-29.md` beside this file.

## 0. Today [R]

- **The standing rider is a point mass carried by the board,** inside an 8×8 implicit solve: the board's 6 unknowns, the leg's rate along `up`, and the bank's rate across (`coupleStanding`, `AttachedRider.ts` 3213–3297; `BoardBody.ts` 1224–1243).
- **Along the board the body is rigid.** It moves only through kinematic drives:
  - `uprightVelocity` (3654–3659) counter-rotates it against the board;
  - a correction drive pulls it to the posture (2420–2425);
  - the balance shifts and sway (2415–2417).
- **The body frame is heading × bank** (`frame`, 3636), so the body is plumb in pitch.
- **Falls:** posture error over 0.25 m with a limit bound (3591), sway past recovery (3590), or flight over 0.4 s (3589). `MAX_LOAD` = 4 (31).
- **Unpaired rule forces act on the body only:** `COMPRESS_PULL`, `CARVE_CARRY`, `LEAN_OUT_PULL` (`compressAssist`, 2612–2643).
- **The lean is capped by `TURN_RADIUS`,** atan(v²/gR) (2491): a checked table in all but name.
- **`STANDING_SUBSTEPS`** = 32 (`BoardBody.ts` 169), because of the upright drive's one-substep lag (Mode A).

## 1. Bodies and connections

- **Board:** `BoardBody` with its water forces and the B-wall rule, unchanged.
- **Upper body:**
  - One point mass (73 kg) with **three free velocity unknowns**, so the solve is 9×9.
  - Angular momentum from the existing rotors: the swing (`SWING_*`, 453–458, the hip across); the trunk's pitch (`TRUNK_*`, 827–829); the twist and hips (`TWIST_*`, `HIP_*`).
  - The arms are part of the swing's inertia: "arms out" takes it from about 6 to 10 kg·m² [I].
  - No rigid trunk with its own orientation: it would add 3 unknowns and the Mode A/B risk for little gain [I].
- **Legs:** two massless legs, solved as one equivalent leg along the line from the centre of pressure (CoP) to the centre of mass. The spring and damper are implicit (`legSpring.addLeg`, as used for 9×9). The muscle force is explicit and bounded. The front/back split is the CoP along the board, which sets each foot's load (as `legDriveStep` 2646 and `legsStep` 2709 use it).
- **Knees:**
  - Travel: the crouch ladder as today (`CROUCH_DEPTH` 0.3, `CROUCH_SHARE` 0.65, tuck 0.45, `LEG_EXTENSION` +0.10).
  - Stiffness: softer, about 15–25 kN/m bent [I] (today 44 kN/m; the knees take only 1–6 cm [M]). The damping ratio stays 0.35.
  - Strength: the force along the leg is capped at 2·τ_knee/d, with τ_knee about 300 N·m per leg and d the knee's offset from the hip–ankle line (0.45 m bones: 0.28 m standing, 0.37 crouched, 0.40 Compress, 0.43 tuck). That gives **3.0 / 2.25 / 2.1 / 1.9 body weights**.
  - Past the cap the knees yield and spend travel; at the end of the travel it is an impact fall. This replaces `MAX_LOAD`.
- **Joints:**
  - Ankle, across (toes and heels) and along (the weight split): passive stiffness and damping, instant (today 800 N·m/rad and 80 across, about 1.3 m·g·h tall), plus active rest torques from the balance.
  - Hip rotors: torque 200 N·m, with a range set by the stance.
  - Spine twist: ±45°, 120 N·m (existing).
- **Foot contact:**
  - The CoP stays inside the feet: across ±0.13 m; along from −0.06 behind the rear foot to +0.06 past the front foot (`riderPosture.ts` 95).
  - Friction μ 0.9 (`FOOT_FRICTION`), on the total and per foot.
  - The leg only pushes.
  - **Tip is a state, not a separation:** the CoP clamps at the edge and the body tips under its own gravity.
  - After the solve, a broken CoP or friction cone turns that ankle term explicit at its bound and solves once more (at most two passes).
- **A-lite carries over:** with the body free there is no rigid constraint, so the contact is exactly the legs' and ankles' own forces and cannot leak (Rule 1 is automatic). Rule 2, the power cap, bounds the muscles' active work, using the window already built (`preparePower`, `recordPower`, 3347–3381). `pushCapped` stays for the old rider only.
- **Reuse:**
  - From `AttachedRider`: everything not standing (prone, push, landing, paddling, duck-dive, climb); the crouch ladder and `prepareLeg` (2809–2899); the bank law from `prepareBank` (2473–2517); the rotors (2540–2576); leg drive; the power window; `waterForces`; `renderPoint` (2071, with the body frame from the leg line in pitch too); `handoffState`.
  - From `duckingBody.ts`: internal forces with their reaction on the board at a named point (`shove` 222, the press 153–159); a bounded muscle as spring and damper (`shiftForce` 204); a grip with a slip timer (166); minimum-jerk tracks.
- **New files:** `src/physics/standingBody.ts` (bodies, solve rows) and `src/physics/humanBalance.ts` (the controller). `AttachedRider` delegates to them when `rider: 'new'` and standing. No new rider class: 27 files read `AttachedRider`'s API.

## 2. The balance controller, as a human

- **Senses, each through a delay:** vestibular (the body's lean and lean rate, low-passed); soles (CoP and load); proprioception (ankle angles, knee load); vision (the face's normal ahead, `waterUp`).
- **Feedback rule.** Banking by the felt stance force exploded before (the don't-retry list). So the fast loop reads only the body's own lean and rate. The CoP is only a slow trim and an edge sense.
- **Moves, in the human order** (ankle, hip, then step; Horak and Nashner 1986):
  1. ankle: the CoP across and along, within the feet;
  2. hip: the rotors take the rest past about 80 % of the CoP's half-width;
  3. knees lower: past about 70 % of the hip's range, or when the capture point leaves the feet, the leg rest drops at the crouch's pace, as far as the stance has travel;
  4. arms out, with step 3.
  Nothing pushes the board straight. Every move is a CoP, a rotor torque or a leg length.
- **Human limits** [I, provisional]:
  - active-loop delay 0.10 s (leg postural responses start at about 90–100 ms; Nashner 1977); the passive ankle impedance carries the fast part with no delay;
  - motor lag 0.05 s; the player's own inputs get only that lag.
- **Stance room** [I]:

| Stance | Centre of mass height | Knee travel left | Hip range | Arms |
|---|---|---|---|---|
| Tall (today's standing) | 0.85 m | 0.30 m | ±1.2 rad | free |
| Pumping crouch | 0.65 m | 0.15 m | ±0.8 rad | free |
| Compress / Snap | 0.55 m | about 0.05 m | ±0.4 rad | committed |
| Tube tuck | 0.40 m | 0 | ±0.3 rad | — |

- **The save window is the body's own tipping time,** τ = √(h/g_eff):
  - upright: tall 0.29 s, crouch 0.26 s, Compress 0.24 s;
  - at each stance's own limit: 0.27, 0.21 and 0.17 s.
  Shorter in Compress, as the spec wants. In a hard Compress turn the window (0.17 s) is barely longer than the delay (0.10 s).
- **The hold is the least of three bounds** [I]:
  1. **The balance margin** (what the room catches of the turn's own disturbances within the delay): about 0.41 / 0.50 / 0.61 g from the CoP; the hip adds 0.36 / 0.45 / 0.58 g while it has range.
  2. **The knees:** a leg load of 1/cosθ under the strength gives about 2.8 g tall, 2.0 g crouched, 1.8 g in Compress.
  3. **Grip:** G·tan(48°) = 1.1 g from the hull; up to about 1.6 g with the fins loaded by the twist (1.2–1.5 measured with a 20–40 N·m twist [M]).
- **First estimate:** tall 0.6–0.9 g; crouch 0.9–1.1 g; Compress 1.2–1.8 g.
- **Caveat:** the lever arms scale about as 1/h, so physics gives a tall-to-Compress ratio near 1.5–2, not the spec's 2.8. Smooth analytic water has no disturbances, so the probes need chop.
- **The owner's example falls by itself.** A full steer slammed from tall rolls the rail in about 0.05 s. A tall body takes about 0.5 s to change rails [M]. So the feet are pulled out from under it before the knees can drop. The same steer taken gently is saved by the automatic crouch.

## 3. Inputs on the body (no new buttons)

- **Lean:** the lean asked for, through the bank law kept from `prepareBank`. In 3.3 the `TURN_RADIUS` and `SNAP_RADIUS` caps go, and the balance carries out the lean only as far as its room allows.
- **Trim (W/S):** the CoP target along the board (`TRIM_PRESSURE`).
- **Crouch, Compress, tuck:** the leg's rest length (`manualCrouchShare`). Each also sets the stance room.
- **Snap:** the CoP to the tail (`SNAP_PRESSURE`), the twist wound, Compress's room.
- **Hand:** drag and a yaw moment through the feet as today, plus a weak support toward the wave side up to `HAND_FORCE_LIMIT` while the hand is in the water (3.2).
- **Manual pumping:** the crouch pressed and released in rhythm, with small leans from rail to rail.
  - Net leg work ∫F dL: extending while a turn loads the leg (1.2–1.4 body weights) and folding through the rail change (0.6–0.9) gives about 55 J a cycle on flat water; on a face, 90–220 J a turn [M].
  - Mistimed pumps cost speed for real reasons: folding under load absorbs energy; extending into no load throws the body up and the landing absorbs it; the deeper board drags more.

## 4. The pop-up as a skill

- **Bodies:**
  - the board;
  - the body's centre of mass, free from the start of the push;
  - the hands as a support (the 'push' region, `riderPosture.ts` 114, gripped with `PRONE_GRIP`);
  - the arms' press, up to about 1.2 body weights, reacting on the board at the hands, power-capped;
  - the legs' swing as a minimum-jerk practised motion (`PUSH_TIME`, `LANDING_TIME` kept);
  - the landing place shifted by the trim held, about ±0.1 m.
- **Success is decided by physics:**
  1. **support:** a board not yet planing sinks under the press and falls behind, so the wave leaves you;
  2. **attitude:** late or steep, the nose goes under and brakes, and the centre of mass passes the front foot: a pearl;
  3. **placement:** too far forward lands over the nose; too far back sinks the tail and stalls.
- `standRefusal` today only reports, and the rider "stands anyway" (1866–1868). That goes, and `popUpReport` gains the outcome 'fell'.

## 5. Speed

- `CARVE_CARRY` goes (566, 2635).
- The same "no hidden motors" rule covers `COMPRESS_PULL` (507, 2631) and `LEAN_OUT_PULL` (588, 2640), which have no reaction on the board. Proposed: `LEAN_OUT_PULL` out in 3.2 (the leg drive, #225, does its job); `COMPRESS_PULL` out in 3.3.
- **Budget:**
  - real top speeds 7–9.7 m/s, 12.5 rare;
  - today the trim drag at 7 m/s is 0.24 g against Savitsky's 0.16 g, because the plumb body keeps the nose high [M];
  - the Canyon-matched wave holds trim at 7.3–7.5 m/s whatever the carry [M];
  - the Compress turn sheds about 0.6 g on flat water [M].
  3.1's pitch should lower the trim drag, which is what lets 3.5 remove the carry. Canyon B's 12.5 m/s peel is the wave track's to fix.

## 6. The meter

- `balanceReserve` (2029–2032) becomes the least of:
  - the capture point's distance to the feet's edge, over the edge plus the remaining room's reach;
  - 1 − the friction used;
  - 1 − the knee strength used.
- 0 means a fall is now physical. It is computed from 3.2 on.
- 3.6 is the HUD only:
  - the default is 'always' under `?rider=new`;
  - red below 0.3: today `.is-low` uses the coral `--accent` `#ef805e`, not red;
  - no flashing.

## 7. Sub-steps, each behind `?rider=new` (the old rider stays the default)

**Every step:**
- `?rider=old` stays byte-identical: the study's `results/*.jsonl`, the Canyon hashes and the suite;
- rooms stay pinned to old (`main.ts` 538);
- add `RIDER=new` to `docs/research/board-in-water/lab.ts`;
- probes go in `docs/research/new-rider/3.x/`.

### 3.1 The body leans with the face, and the knees

**Build:**
- the body's along-board rate becomes the 9th unknown;
- the pitch ankle (passive impedance, plus a rest from the trim's CoP target) acts on it;
- the pitch half of `uprightVelocity` and the along-board correction drive go;
- the frame becomes heading × pitch × bank from the leg line;
- the pitch reference is the low-passed board specific force (`prepareLeg` 2820–2823), with the face's normal as feed-forward;
- the knees: softer, the strength cap replacing `MAX_LOAD`, the active force power-capped;
- the bank law, the roll drive and 32 substeps are kept.

**Files:** `src/physics/standingBody.ts` (new), `AttachedRider.ts` (option `rider`, delegation), `BoardBody.ts` (a 9×9 branch at 1224), `RideSession.ts`, `PhysicalMode.ts` (`riderSwitch`), `SurfZoneSimulation.ts`, `SurfZoneRunner.ts`, `src/main.ts`.

**Bars** (the `steep`, `drive`, `bars`, `draft`, `bumps` and `budget` probes):
- **N1:** the legs' net peak power under about 2 kW per frame at every row (25–50°, the five lines, placed and tilted); at most 1.46 kW over any 0.5 s.
- **N2:** 20° straight down from 4 m/s: pitch to the face 5–8° (today 15–18°); speed gain over 2.5 s at least 3.5 m/s (today 1.7).
- **N3:** a surface rising 20 cm at 4 m/s: the knees take 5–20 cm, peak load 2–2.5 body weights (today 3.5–4), no fall; no fall at 2 m/s.
- **N4:** placed starts on 25–50° decks, up and down: no fall within 0.5 s, each a hold or a slide; the board under 5 g from the contact; tilted 40° down holds or slides.
- **N5:** flat glide at 5, 7, 9 and 12 m/s within ±2 cm draft (report the drag, which should fall at 7 m/s); held carves, standing and in Compress, hold 3 s; the 4 s full carve on the 15° plane holds.

**The owner rides:** the body leans into drops, the knees soak bumps and the wall, and turns feel as today.

### 3.2 Balance moves and stance room

**Build:**
- remove the roll drive, the shifts and the sway: a free-centre-of-mass 9×9 with `addLeg` tensors;
- `humanBalance.ts`: the 0.1 s delay line, the ankle → hip → knees → arms order, the room table, a capture-point fall test replacing `RECOVERABLE_ERROR`, and the new reserve;
- `LEAN_OUT_PULL` out;
- a chop water in `lab.ts`;
- try 16 and 8 substeps.

**Bars:**
- push recovery on a 7 m/s glide is ordered tall > crouch > Compress;
- the first corrective CoP move comes 0.08–0.12 s after a shove;
- save window: tall 0.25–0.35 s, Compress 0.15–0.25 s;
- the turn-pair probe's Compress-held set B makes one pair in at least 12 of 16;
- the wobble probe's yaw sign flips are no more than today;
- 3.1's bars still pass;
- keep the fewest substeps that pass.

### 3.3 The stance limits

**Build:**
- the `TURN_RADIUS` and `SNAP_RADIUS` caps and `COMPRESS_PULL` go;
- tune only physical numbers in sourced ranges: delay 80–150 ms; passive ankle 0.7–1.2 m·g·h; hip 150–250 N·m; knee 2.5–3.5 N·m/kg per leg; centre of mass heights ±3 cm; the twist's fin load.

**Bars** (an edge sweep on flat water, chop and `FaceWater`; at 6, 7 and 9 m/s; the steer ramped slowly; each stance):
- the lateral g and lean at the fall within ±25 % of 0.6 / 1.0 / 1.7 g and ±8° of 30 / 45 / 60°;
- the order tall < crouch < Compress, with Snap about equal to Compress;
- every fall's cause logged as physical;
- the owner's case: a sharp full steer from tall at 7 m/s falls; the same steer in Compress holds.

### 3.4 The pop-up as a skill

**Bars:**
- a `FaceWater` timing sweep (10 places from 1.2 face lengths ahead to the crest) shows three bands: early, left behind; good, at least 3 places stand and ride 3 s; late or steep, a nose-dig fall;
- a trim sweep at a good timing: ±1 falls or stalls; 0 and ±0.5 stand;
- the pop-up lasts 1.2 ± 0.2 s;
- the arms' power stays within the cap.

### 3.5 Manual pumping, and `CARVE_CARRY` removed

**Bars:**
- the budget ledger closes with a rules column of 0;
- on the Canyon-matched wave, an in-phase pump gains at least +0.3 m/s each second over no pump, and an anti-phase pump loses;
- leg power within the caps;
- the bottom turn keeps at least 0.85 of its speed at 90° (Forsyth 0.88–0.95);
- set C makes two pairs in at least 5 of 8;
- through-water speed at most 9.7 m/s at the 95th percentile, and at most 12.5 m/s at the peak.

### 3.6 The meter

**Bars:**
- the reserve is under 0.3 for at least 0.1 s before at least 80 % of the probes' falls;
- it is over 0.3 in at least 95 % of the frames of held rides;
- unit tests for the 'always' default and the red class.

## 8. Cost

- **Substeps:** 32 while standing today. Their reason (Mode A) goes in 3.2. Target 8–16, chosen by the bars.
- **Water samples are the cost:** a standing rider in the tube is 2,656 samples, about 2.1 ms a step at 32 substeps [M]. 16 substeps would save about half.
- **The 9×9 solve and the delay ring are tiny.**
- **The M1 gate is water plus board at a median of 15 ms or less.** Measure each step (`pipelineMs.board`, the fps trace).
- **Online:** remote players see 7 render points plus the board's pose (76 bytes at 20 Hz, `poseCodec.ts`). The new lean and knees show with no protocol change. Rooms are pinned to old until the owner says yes.

## 9. Risks, ranked

1. **The limits may not reach 0.6 / 1 / 1.7 g with one human parameter set:** physics gives a ratio near 1.5–2, the knees cap Compress near 1.8 g, and smooth water has no disturbances.
2. **Modes A and B can return** (the 13–16 Hz roll; the 3–4 Hz roll–yaw wobble) once the drives go and a 0.1 s delay comes in. Use passive impedance for the fast part, and extend `rollModel.ts` with a delay to choose the gains before building.
3. **Speed death without the carry** (0.6 g shed in a Compress turn).
4. **Feeding back the felt force exploded before;** the fast loop reads only the body's lean and rate.
5. **More falls in 3.3–3.5, and a pop-up that can fail:** that is the point; `?rider=old` stays to compare.
6. **The rig reads crouch depth from the pelvis over the deck** (`stanceBlend.ts` 71), so a body leaning back on a braking board reads as deeper.
7. **Fewer substeps may fail the bars.**
8. **Removing `COMPRESS_PULL` and `LEAN_OUT_PULL`** needs the advisor's yes.
9. **The hand as a support** needs the advisor's yes.

**Critical files:** `src/physics/AttachedRider.ts`, `src/physics/BoardBody.ts`, `src/physics/legSpring.ts`, `src/physics/duckingBody.ts`, `docs/research/board-in-water/lab.ts`.
