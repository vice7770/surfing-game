# How the board meets the water (2026-11-12)

This is a measurement. It is not a fix. No game code changed.

The owner said: "the wave and water are treated more as a floor rather than a sinkable fluid". He also said the surfer
"falls when touching the wave tube part", and that 45 km/h is too fast.

I drove the real `BoardBody` and `AttachedRider` on analytic water: flat water, planar faces, a step, a rising
surface, and the test-only moving face `FaceWater`. I did not run a ride session, a catch report or an autopilot ride.

Labels: **measured** = printed by a probe here. **sourced** = from a paper, with a link. **inferred** = my own
calculation or my own reading.

## Short answer

1. **The board does sink in.** It is a planing hull, not a floor. Gliding straight, it sits 21 cm deep at 5 m/s,
   11 cm at 7, 6 cm at 9 and 2 cm at 12 (deepest point, the tail). That matches Savitsky's planing equations for this
   board and rider within a few cm (inferred). In a held carve the low rail goes 26–41 cm under the surface.
2. **The "floor" feel and the tube falls have a different main cause: the standing rider breaks on steep water.**
   When the water under the board is steeper than about 26° (riding up it) or about 30–38° (riding down it), the
   contact between the feet and the board starts to make energy. The legs then do 4–23 kW. A strong human does about
   1–2 kW at most (inferred). The board is thrown at 13–58 g and the rider falls in 0.05–0.2 s (measured). The
   case's wall in the tube part is steeper than this. So a board that touches it can throw the rider at once.
3. **The body does not tilt forward or back with the face.** It stands plumb in pitch (`AttachedRider.ts`
   3453–3454: the body frame is the heading and the bank only). On a 20° drop the board then runs nose-high at
   15–18° to the flow and gains speed slowly (measured). This is close to the owner's point that "the surfer will be
   more straight".
4. **Fast water under the board kicks hard.** A surface that rises at 2 m/s with its water gives +1.2 to +1.5 body
   weights; at 4 m/s +2 to +2.8, and the rider falls. The tube wall's added-mass rule (on by default with the wall
   water) makes this about twice as hard: the rider falls at 2 m/s already (measured). The pool's case surface rises
   at 1.1 m/s median and 3.9 m/s at the 95th percentile (#245).
5. **Speed:** the hull's drag in a straight glide is 0.18–0.24 g. At 12 m/s that equals Savitsky's planing plate
   (inferred), so the hull is not too slippery. At 7 m/s it is about 1.5 times the plate (nose-high trim). In a
   Compress carve the hidden `CARVE_CARRY` push is 0.11–0.20 g. That is as large as all the hull's drag, so a Compress
   carve loses no speed (measured). Fast rides come from that, and from waves that peel at 12.5 m/s.

## 1. What the game does (code)

- **The hull is a planing body.** `src/physics/hullForces.ts` `patchForce` (line 167): buoyancy from each patch's
  volume under the surface, along the local slope (196–208); planing pressure ½ρ C_n |v| (v·n) on the wetted face
  (Savitsky's lift fixes C_n, line 35); ITTC friction. Wetting goes 0 → 1 over 1 cm of depth (`WET_RAMP`, 77).
- **48 patches** (12 along × 4 across), flat across (no vee or concave). Each station has a vertical rail face with a
  bluff pressure coefficient of 1 (`RAIL_PRESSURE`, `BoardBody.ts` 84; `buildFoils` 524). Three fins (`finForces.ts` `THRUSTER`):
  lift by Helmbold's slope, stall from 18°.
- **Water inertia:** added mass ρπb/8 per area against motion into the surface, von Kármán entry, radiation damping
  (`BoardBody.ts` 98–142, applied in `substep` 1092–1135).
- **One-way coupling.** The board hands the sea only its horizontal impulse. `PhysicalSurfWater.addReaction` (689)
  stores the vertical part in `unappliedVerticalImpulse` and never uses it. `push` (722) adds momentum to `qx`, `qz`.
  So the sea never dents under the board. The sea's cells are 1 m (2 m at Padang). A 0.46 m board cannot cut a
  groove on that grid even if the weight were applied.
- **The standing rider** is one body carried by the board. Its velocity is the board's at a carried point, plus the
  leg along `up`, the bank across, and kinematic "drives" (`AttachedRider.ts` `prepare` 2342–2395): one keeps the
  body's bank as the board pitches and rolls (`uprightVelocity` 3471), one moves the weight (balance), one corrects
  toward the posture. The body's `up` is the heading turned by the bank only (`frame` 3453–3454). It never pitches.
  When the push the coupled solve needs is outside what feet on a deck can give (`project`, 3494–; foot friction
  0.9), the two bodies are solved apart and the board takes the clipped push (`BoardBody.ts` 1214–1235, `finish`
  3328–3335).

## 2. How deep the board sits (probe 1: `draft.probe.ts`)

Rider 73 kg, board 2.54 kg (system 75.5 kg). Draft = the deepest bottom point under the surface, along the surface's
normal. Rail = the low rail's bottom edge. Pitch = board axis to the surface. Attack = bottom to the flow.

### Flat water

| State | Speed m/s | Draft cm | Wetted length m | Wetted area m² | Pitch ° | Roll ° | Rail cm | Slip ° |
|---|---|---|---|---|---|---|---|---|
| Board alone, floating | 0 | 1.1 | 0.74 | 0.32 | −0.7 | 0 | 1.1 | — |
| Lying still | 0 | 26 | 1.74 | 0.61 | 6.6 | 0 | 26 | — |
| Paddling (steady) | 1.6 | 27 | 1.47 | 0.54 | 10.9 | −1.7 | 27 | −1.2 |
| Pop-up from 5 m/s: first standing step | 2.2 | 38 | 1.33 | 0.52 | 16.5 | 0 | 38 | 0 |
| Pop-up from 5 m/s: 0.5 s later | 1.3 | 68 | 1.48 | 0.56 | 28 | 0 | 68 | 0 |
| Standing at rest, 0.5 s | 0.5 | 33 | 1.48 | 0.56 | 13 | 0 | 33 | — |
| Standing at rest | — | sinks to 1.2 m, falls at 1.5 s | | | | | | |
| Glide 5 m/s | 5.0 | 20.8 | 1.19 | 0.46 | 12.2 | 0 | 20.8 | 0 |
| Glide 7 m/s | 7.0 | 10.8 | 1.04 | 0.40 | 7.8 | 0 | 10.8 | 0 |
| Glide 9 m/s | 9.0 | 5.7 | 0.89 | 0.35 | 5.6 | 0 | 5.7 | 0 |
| Glide 12 m/s | 12.0 | 1.7 | 0.89 | 0.34 | 2.5 | 0 | 1.7 | 0 |
| Held carve, standing, 45–90° in | 5.7 | 33 | 1.63 | 0.48 | 11 | −48 | 35 (deepest 41) | −6 |
| Held carve, Compress, 45–90° in | 7.3 | 23 | 1.38 | 0.36 | 11 | −43 | 26 (deepest 30) | −5 |

- On flat water every pop-up sinks, because nothing pushes the board (no wave). Standing still sinks: 25.75 L
  cannot float 75 kg. Both are physical. Sitting on the board is not a state in the game (phases: prone, push,
  landing, standing).
- In a straight glide the decay is 0.21–0.22 g at every speed (measured).

### Planar faces (still water, the surface a tilted plane)

| Face | Line | Speed | Draft cm | Wet length m | Roll ° | Rail cm | Slip ° | Result |
|---|---|---|---|---|---|---|---|---|
| 20° | 45° off the fall line | 7.2 | 12 | 0.94 | −13 | 13 | 0.6 | holds 1.5 s, speeds up |
| 35° | 45° off | 8.0 | 12 | 1.04 | −49 | 15 | −3 to +5 | holds 1.5 s |
| 50° | 45° off | 7.4 | 0.2 | 0.44 | −4 | 0.6 | 3 | falls in 0.55 s |
| 20° | across (tilted in over 1.5 s) | 3.4 | 32 | 1.45 | −27 | 34 | 5.7 | holds, slows (no gravity along an across line) |
| 35° | across (tilted in) | 3.7 | 28 | 1.48 | −43 | 30 | 8.1 | holds, slows |
| 50° | across (tilted in) | 4.8 | 17 | 1.29 | −51 | 20 | 6.4 | holds, slows |
| 20° | straight down, from 4 m/s | 5.0 | 20 | 0.74 | 0 | 20 | 0 | pitch 18° to the face; only 5.7 m/s after 2.5 s |
| 35° | straight down | — | | | | | | legs 12 kW, falls at 0.08 s |
| 50° | straight down | — | | | | | | legs 20 kW, falls at 0.07 s |

Placed across a static face at once (no tilt-in), the rider fell at 20°, 35° and 50° within 0.5 s. That is a start
problem (the body must bank first), so the tilt-in rows are the fair ones.

### Steep water: where the legs make energy (`steep.probe.ts`, `drive.probe.ts`)

Standing, 6 m/s, placed on a planar face. "Legs" = the contact's net work on the pair (board + body), its peak.

| Face | Straight down | 20° off | 45° off | 135° (up) | Straight up |
|---|---|---|---|---|---|
| 25° | 0.5 kW, holds | 0.4 kW, holds | 0.4 kW, holds | 0.2 kW, falls 0.55 s | **4.2 kW, falls 0.18 s** |
| 28° | 1.0 kW, holds | 0.6 kW | 0.5 kW | 0.2 kW, 0.53 s | **9.5 kW, 0.12 s** |
| 30° | 1.3 kW, holds (board 13 g) | 1.8 kW | 0.5 kW | 0.3 kW, 0.52 s | **12.6 kW, 0.10 s** |
| 32° | **15.7 kW, falls 1.2 s** | 1.9 kW | 0.6 kW | 0.3 kW, 0.48 s | **14 kW, 0.08 s** |
| 35° | **12.2 kW, 0.10 s** | 2.7 kW | 0.7 kW | 0.3 kW, 0.45 s | **13 kW, 0.07 s** |
| 40° | **20.8 kW, 0.07 s** | **4.2 kW, 0.13 s** | 0.8 kW, 0.67 s | 0.3 kW, 0.42 s | **23 kW, 0.05 s** |
| 45° | **19.5 kW, 0.07 s** | **5.1 kW, 0.10 s** | 0.7 kW, 0.48 s | 0.3 kW, 0.42 s | **22 kW, 0.05 s** |

With the face tilted in under a gliding rider (no jolt at the start): down the fall line the rider falls at 38–40°
with 13–16 kW; straight up it falls at 26–27° with 5–8 kW. At 20° straight up the board just stalls (88 W, a normal
stop).

Step by step at 35° straight down (measured): the contact is "not feasible" from the first step. The leg's rate
grows 0.3 → 1.2 → 3.2 → 5.2 m/s in four steps. The board spins up 1.7 → 5.8 rad/s. The "keep upright" drive grows
with it (1.5 → 5.7 m/s). The legs' power goes 0.16 → 1.6 → 5.8 → 12 kW. At 25° the contact becomes feasible after
two steps and nothing grows.

My reading (inferred): the body's push is vertical in pitch (it never leans with the face). On a steep face that
push is far from the deck's normal, so the coupled solution is clipped. Then the two are solved apart: the light board
alone takes a push sized for the whole pair, and the kinematic drives keep feeding it. This is an energy leak in the
contact, not a water force.

## 3. Grip (from the tables above)

- Across a 35° face, 45° off the fall line, the slip is −3° to +5°. The fins give 0.004 to 0.10 body weights sideways,
  the rail faces under 0.01. What holds the board is the **bottom itself**, rolled 25–49° to the face: its planing
  pressure points sideways (0.7–0.8 weights along the face's normal, measured).
- In a held carve on flat water the slip is 5–7°. Fins give 0.005–0.07 weights, rail faces 0.013–0.017. The banked
  bottom again carries the turn.
- At 6° slip and 5.7 m/s the fin model alone would give about 0.13 weights (inferred from `finForces.ts`). The fins
  report less in the carve. The board's yaw rate changes the flow at the tail, so the fins see less slip than the
  centre (inferred, not checked).

## 4. Bumps (probe 3: `bumps.probe.ts`)

Standing glide at 7 m/s on flat water. Force = the board's vertical water force in body weights (base 1.08).
Load = the peak foot load in body weights (the rule cap is 4). Knees = the most the leg shortened.

| Event | Force spike | Peak load | Pitch range ° | Knees cm | Fell? |
|---|---|---|---|---|---|
| Nothing (control) | — | 1.04 | 7–12 | 0 | no |
| 5 cm step over 50 cm | +0.08 | 1.22 | 4–13 | 0.1 | no |
| 5 cm step down over 5 cm | +0.03 | 1.09 | 2.5–12 | 0.1 | no |
| 5 cm step up over 5 cm (a 45° wall) | slam | 4.0 | −37 (nose pushed down) | 6 | yes, 0.03 s |
| Surface rises 5 cm at 0.4 m/s, water moving with it | +0.24 | 1.34 | 5–13 | 0.2 | no |
| ... at 1 m/s | +0.68 | 1.81 | 4–13 | 0.5 | no |
| ... at 2 m/s | +1.19 | 2.48 | 3–13 | 0.8 | no |
| ... at 4 m/s | +2.04 | 3.54 | 2–15 | 1.2 | no |
| Rises 20 cm at 2 m/s | +1.46 | 2.62 | 0–19 | 1.2 | no |
| Rises 20 cm at 4 m/s | +2.81 | 4.0 | 10–23 | 2.6 | yes, 0.27 s |
| Rises 20 cm at 1–4 m/s through still water (no upward flow) | +0.04 to +0.05 | 1.2 | 8–22 | 0.1 | no |
| Wall water (added-mass inertia on), rises 20 cm at 1 m/s | +1.36 | 2.51 | 1–20 | 1.1 | no |
| ... at 2 m/s | +2.76 | 3.98 | 9–18 | 2.3 | yes, 0.23 s |
| ... at 4 m/s | +2.92 (added mass alone 5.5) | 4.0 | 10–23 | 6.1 | yes, 0.20 s |

- What hits is the water's **upward speed**, not the height. A surface that rises without its water moving gives
  almost nothing.
- The legs give only 1–6 cm. A surfer's knees take 20–30 cm (inferred). The rider's leg is a stiff spring
  (`LEG_STIFFNESS` 44 kN/m, `AttachedRider.ts` 663).

## 5. The tube contact

`sweptContact.ts` does not touch the board. It answers geometry: inside or outside the swept surface, the crossing
above and below, the normal, the lip's and the wall's speed (`ContactHit`, lines 65–138). `PhysicalSurfWater.sampleAt`
(553–658) turns that into a `WaterSample`. The board then uses **the same** `patchForce` on it (`BoardBody.ts` 993).
So there is no hard floor and no clamp on the board.

But the samples in the tube part differ from the sea's in four ways. Each can kick:

1. **Steep surfaces.** The case's wall gives normals past 60°. Only the buoyancy's slope is clamped
   (`MIN_NORMAL_Y` 0.5, `PhysicalSurfWater.ts` 36–42, `fromContact` 782–806). The rider's contact breaks from about
   26–38° (section 2). This is my first suspect for "falls when touching the tube part".
2. **The wall water moves with the case's surface.** Its normal part is the surface's own speed (`wallFlow` 962–988,
   `streamWallFlow`, `wallWaterFlow` 1127–1180). So the board meets the "rising with its water" row of section 4,
   at the case's 1.1 m/s median and 3.9 m/s at the 95th percentile (#245).
3. **The water's acceleration on the added mass** (`WATER_INERTIA`, `BoardBody.ts` 133; `wallInertia` 1627–1651),
   on by default with the wall water (`faceAnchor.ts` 276, `?tubeInertia=old` turns it off). It can reach 5 g on
   100–180 kg of added mass, up to 5.5 body weights in the probe. It also takes the change of the water **along the
   board's path**, not the water's own acceleration. A fast board crossing from sea water into wall water (a jump of
   metres per second over a short distance) reads that as acceleration (inferred from the code, not measured).
4. **Switches between surfaces.** `unionContact` (814–) picks the solver's surface or the case's, point by point, and
   `nearestSurface` (895–927) moves the reported surface to `y + depth`. Where these change between neighbour
   patches, the surface the hull feels can step (inferred, not measured here).

The rider's body also gets lip drag where it reaches the curl's underside (`AttachedRider.ts` 3035–3043). That is
expected, and only under the curl.

## 6. Speed budget (probe 5: `budget.probe.ts`)

Each term is its power over (M g v): "g along the path". Positive pushes, negative brakes. Still water, so the ground
frame is the water's frame. The terms add up to the change of kinetic energy (the ledger closes).

| Case | Speed | Gravity | Hull pressure | Hull friction | Fins | Rider in water | Legs | Rules (`CARVE_CARRY`) | Net |
|---|---|---|---|---|---|---|---|---|---|
| Flat, straight | 4.6 | +0.06 (settling) | −0.17 | −0.04 | −0.006 | 0 | −0.02 | 0 | −0.18 |
| Flat, straight | 6.4 | 0 | −0.17 | −0.07 | −0.011 | 0 | 0 | 0 | −0.24 |
| Flat, straight | 8.3 | 0 | −0.13 | −0.09 | −0.019 | 0 | 0 | 0 | −0.24 |
| Flat, straight | 11.2 | 0 | −0.05 | −0.10 | −0.034 | 0 | 0 | 0 | −0.19 |
| 20° face, 45° off | 5.3 | +0.25 | −0.29 | −0.04 | −0.008 | 0 | 0 | 0 | −0.08 |
| 20° face, 45° off | 7.2 | +0.23 | −0.18 | −0.05 | −0.014 | 0 | 0 | 0 | −0.02 |
| 20° face, 45° off | 9.2 | +0.24 | −0.09 | −0.06 | −0.023 | 0 | 0 | 0 | +0.06 |
| 20° face, 45° off | 12.2 | +0.24 | −0.07 | −0.07 | −0.039 | 0 | 0 | 0 | +0.06 |
| Flat, carve, standing | 6.3 | +0.05 | −0.12 | −0.06 | −0.012 | 0 | 0 | 0 | −0.14 |
| Flat, carve, Compress | 4.9 | +0.14 | −0.17 | −0.04 | −0.007 | −0.034 | −0.10 | **+0.11** | −0.12 |
| Flat, carve, Compress | 7.1 | +0.11 | −0.12 | −0.07 | −0.015 | −0.003 | −0.06 | **+0.18** | +0.01 |
| Flat, carve, Compress | 8.8 | +0.09 | −0.13 | −0.08 | −0.021 | 0 | −0.06 | **+0.20** | −0.01 |

- In the Compress carve, "gravity" and "legs" are the body sinking into the crouch; they nearly cancel.
- Spray drag is not a term in the game (the spray is drawn only).
- On a 20° planar face 45° off the fall line the rider speeds up without end: 6 → 12.2 m/s in 10 s, still +0.9 m/s
  each second. On 16° and 10° the same line slows and stops. A real wave is not an endless plane: the height limits
  the drop, and the face moves.

**Against real numbers (inferred, from Savitsky 1964's equations, which the game's own lift uses):** a 0.45 m beam
carrying 75.5 kg runs at about 11° trim and 30 cm transom depth at 5 m/s (hardly planing), 4.7° and about 10 cm at
7 m/s, 3° and about 3 cm at 12 m/s. Its drag is about 0.16 g at 7 m/s and 0.18 g at 12 m/s with the fins' profile
drag. The game: 0.24 g and 0.18 g. So the game's glide is a fair planing hull at speed and a bit draggy at 7 m/s
(the nose-high trim the drag ledger #229 found).

## 7. Real numbers (sources)

| Quantity | Number | Kind | Source |
|---|---|---|---|
| Competitive surfers' top speed per heat | 33.4 ± 6.5 km/h, highest 45 km/h | measured (GPS) | Farley, Harris & Kilding 2012, *J Strength Cond Res* 26(7):1887–96, PMID 21986691 ([Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=farley%20surfing%20physiological%20demands%20competitive%20GPS%202012&resultType=core&format=json)) |
| Average maximal speed in later heats | 24.8 km/h | measured (GPS) | Farley et al. 2018, *J Strength Cond Res* 32(10):2939–48, PMID 29912078 ([Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:29912078&resultType=core&format=json)). Note: the 33.4 and 45 km/h are the 2012 paper's, not this one's. |
| GPS speed is over the ground, not through the water | — | method note | [Swaylocks forum thread](https://forum.swaylocks.com/t/surfer-wave-speed-measurement-and-technical-considerations/46859?page=4) (not a paper) |
| Surfboard "cruising" speed used in CFD | 8 m/s (paddling 4 m/s); wetted area at rest 0.18 m² | modelling choice | Oggiano & Pierella 2018, *Proceedings* 2, 309 ([MDPI](https://mdpi-res.com/d_attachment/proceedings/proceedings-02-00309/article_deploy/proceedings-02-00309.pdf)) |
| Planing shortboard at 6 m/s: centre of pressure about 40 % of the chord from the nose; a 70 kgf rider is in equilibrium 0.74–1.25 m from the nose | — | CFD (VOF) | D'Ambrosio 2020, *Proceedings* 49, 68, "Hydrodynamic Characterization of Planing Surfboards Using CFD" ([PDF](https://pdfs.semanticscholar.org/f0e6/f889c6dfd8d1398ed2bacb323ed53c02d196.pdf)) |
| Towed surfboards: drag coefficient 0.1 at low speed to 0.05 at high speed; planing drag mostly friction | — | measured (towing), reference area not given in the abstract | Lahlou 2019, MSc thesis, Florida Institute of Technology ([repository](https://repository.fit.edu/etd/1164/)) |
| Thruster fins at 5 m/s, 0–45° attack: lift peaks in a band; unsteady separation above about 20° | — | CFD (RANS/URANS) | Falk et al. 2019, *J Fluids Struct* 90:297–314, doi 10.1016/j.jfluidstructs.2019.07.006 ([Semantic Scholar](https://api.semanticscholar.org/graph/v1/paper/DOI:10.1016/j.jfluidstructs.2019.07.006?fields=title,abstract,authors,year)) |
| Fin forces in cutbacks from field motion data | forces reported in the paper; I could not open it | CFD from field data | Shormann, Oggiano & in het Panhuis 2020, *Proceedings* 49, 132 and 158 ([abstract](https://api.semanticscholar.org/graph/v1/paper/DOI:10.3390/proceedings2020049132?fields=title,abstract,authors,year)) |
| Bottom turn from photos: about 6 m/s, peak forces near 35° roll and 45° yaw | — | CFD from photos | R. Benjamin 2026, MS thesis, UC Santa Cruz ([Santa Cruz Works article](https://www.santacruzworks.org/news/the-physics-of-feel-a-ucsc-thesis-puts-numbers-to-a-surfboards-soul)) |
| Planing lift and drag of a flat plate | equations | sourced method | Savitsky 1964 (as coded in `hullForces.ts` 10–21) |

Not found: a measured draft or wetted length of a planing shortboard with a rider, a measured rail depth in a turn,
and fin side forces in newtons on a real wave. The draft numbers above are inferred from Savitsky.

## 8. The causes of the "floor" feel, ranked

1. **The standing rider's contact breaks on steep water (largest; explains the tube falls).** From 26° (riding up)
   or 30–38° (riding down) the legs make 4–23 kW and the rider falls in 0.05–0.2 s (section 2). The tube wall is
   steeper. On a real board the rider sinks the rail and leans with the face; here the body cannot lean in pitch,
   and the solve leaks energy instead.
2. **Upward-moving water gives large, fast kicks, doubled in the wall water.** +0.7 weights per m/s of rise, and the
   added-mass rule adds about as much again; falls from 2 m/s of rise in the wall water (section 4). The legs give
   1–6 cm. A real rider sinks and the knees take it. Here it reaches the feet as a hard push: this is the "floor".
3. **The body stands plumb in pitch.** Down a 20° face the board runs 15–18° nose-high to the face and gains only
   1.7 m/s in 2.5 s (section 2). A real surfer leans forward and drives the front foot. This is a part of "the
   surfer will be more straight".
4. **The one-way coupling (smallest for feel).** The water never dents. But the hull's depth is already close to a
   real planing board's, measured from the undisturbed surface. A dent would change the look (a wake, a groove) more
   than the forces. On 1 m cells it cannot make a groove anyway.

Speed is a separate matter: `CARVE_CARRY` (0.11–0.20 g in Compress carves) and the 12.5 m/s peel.

## 9. Three physics-only proposals

All three use visible limbs and real water forces. None adds a hidden motor.

### A. A two-body standing rider: the body leans with the face and pushes through the legs, power-limited

- **Cause:** 1 and 3 (and part of 2).
- **What:** the body (above the hips) as its own body joined to the board by the two legs as springs and dampers
  along their own lines, with a muscle force limit (about 2 kW per rider, a few body weights). Pitch and roll follow
  from the legs, not from kinematic drives. A foot can only push, inside its friction cone.
- **Expected in the probes:** in `steep.probe.ts` the legs' peak power stays under about 2 kW at every angle; the
  falls straight up 25–45° and straight down 32–45° become slow stalls or slides, not 0.05–0.2 s throws. Down a 20°
  face the pitch to the face falls from 15–18° toward 5–8°, and the speed gain over 2.5 s goes from 1.7 m/s toward
  4–5 m/s. In `bumps.probe.ts` the knees take 5–20 cm and the peak load at 4 m/s of rise falls from 3.5–4 toward
  2–2.5 weights.
- **Cost:** large. The 8 × 8 standing solve, the balance and the poses are built on the carried body. All stance
  tests need new numbers. About 2–4 weeks.
- **Risk:** multiplayer: the rider's state grows (a second body's pose and rates), but only the owner simulates it,
  so the network message grows by a few numbers. fps: a few more unknowns in the solve; the 32 substeps standing may
  be fewer if the drives go (the drives are why there are 32). Riding feel changes everywhere: the owner must ride it.
- **A smaller first step (cheaper, partial):** keep the carried body, but cap the contact's power and do not hand the
  board the coupled solve's push when the contact is not feasible. That stops the energy leak (cause 1) only.
  About 2–4 days. Expected: the kW rows go under 2 kW; the rider still stands plumb.

### B. The wall water's added-mass push from the water's own acceleration, not the change along the board's path

- **Cause:** 2 (in the tube part).
- **What:** in `wallInertia`, use the water's material acceleration (sample the flow at the same point a moment
  earlier, plus u·∇u from the sample's own gradient) in place of the change along the board's path; keep the 5 g cap.
- **Expected:** in the wall-water rows the extra push from the inertia shrinks toward the pure "rising" rows: at
  2 m/s of rise the spike from +2.76 toward +1.5 weights, and no fall at 2 m/s. A board crossing from sea water into
  wall water at speed gets no kick from the crossing itself.
- **Cost:** small, about 1–2 days, plus a probe that crosses a flow step. `?tubeInertia=old` already exists to A/B
  it.
- **Risk:** only the pool Barrel uses the wall water. Multiplayer: none (local forces). fps: one more flow sample
  per wet patch in the wall, under 0.1 ms.

### C. Two-way coupling: the board's weight into the sea as a surface pressure

- **Cause:** 4.
- **What:** apply the board's vertical impulse (now `unappliedVerticalImpulse`) as a pressure patch in the solver's
  momentum equations, spread over the cells under the board.
- **Expected:** little change in the probes' forces. The draft is already measured from the undisturbed surface and
  close to Savitsky's. On 1 m cells the dent would be wide and shallow (a few cm), so no groove for the rail. It
  would add a wake and a small surface drop under and behind the board.
- **Cost:** medium, about 1 week; the Boussinesq solver needs a pressure term and the GPU and CPU paths both.
- **Risk:** multiplayer: every player's board would change the shared sea, so it must be sent and applied for remote
  boards too (today only a horizontal push is). fps: small on the CPU, needs care on the GPU. Stability: a 75 kg
  point load on 1 m cells can ring. I would do this last, for the look, not for the feel.

## 10. What was not run, and what I am unsure of

- No ride session, no catch report, no autopilot ride, no game page. No real wave and no Basilisk case was sampled.
  The tube findings are from the code and from analytic water.
- I did not measure the slopes a board actually meets in the pool's tube part. The "steeper than 26–38°" claim
  rests on the case's wall being near vertical in earlier studies (the steep wall, the 60° clamp). A probe that
  samples the real case's normals under a board, or a ride with a log of `contact.feasible` and the legs' power, would
  confirm it.
- The mechanism of the energy leak (section 2) is my reading of the code and the step-by-step numbers. I did not
  change the code to prove it.
- The moving-face probe (`face.probe.ts`, `FaceWater`, start 0.75 face length ahead of the crest, 7.5 m/s through
  the water): trim holds at 16° (both lines) and at 25° on the 45° line. From 25° on the 70° line, and at 30–55°,
  the rider falls in 0.2–1 s with only 0.1–0.3 kW in the legs. These are start falls (the body is not banked in
  time). I did not separate them from a real limit.
- The fins' small share in the carve (section 3) is not explained. I did not trace the fins' own attack angles.
- Rider "falls" use the game's own rules (`balance`, `lost board`, `impact`).

## Files

- `lab.ts`: the analytic waters (`Slope`, `Tilting`, `Step`, `Rising`) and the state print.
- `draft.probe.ts`, `steep.probe.ts`, `drive.probe.ts`, `face.probe.ts`, `bumps.probe.ts`, `budget.probe.ts`: the
  probes. `results/*.jsonl`: their output.
- Run one, from the repo root (the suite does not include docs):
  `OUT=/tmp/out.jsonl npx vitest run --config docs/research/board-in-water/vitest.probe.config.ts draft`
