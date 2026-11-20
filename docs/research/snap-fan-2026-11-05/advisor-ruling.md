# Snap tail fan: advisor ruling (2026-11-05)

Read-only consult against main 0b515dff, with no edits.

**How the numbers were made.** No rider sessions were run. Synthetic poses went through the game's own hull code: `BoardBody` with no rider, then `hullSpraySheets`. The poses (speed, bank, nose, yaw rate) come from round 2's traced Snap and Compress states. The drift is solved to match the traced centre-fin attack, and the height is set so the hull carries 741 N (board plus rider). The scratch scripts were outside the repo (`scratchpad/snap-fan/src/probe.ts`, `stations.ts`).

**What they can't show.** These are steady states: no pitch or roll rates, and none of the rider's dynamics. Treat them as modelled. The builder's headless rig run (§3d) is the check.

## Verdict

- **Same physics as a carve.** A snap's fan comes from the carve's mechanism: the jet off the outside rail near the tail (Wagner; Savitsky). It goes higher because the tail sweeps into the water faster. `boardSpray.ts` already does this, station by station, with each station's own velocity v + ω×r (`BoardBody.ts:617-619`). That is the standard 2D+t method for drifting and yawing hulls (Marleaux et al. 2024, eq. 1).
- **Today's Snap moves like a carve, so it throws a carve's fan.**
  - The fins hold (attack 7° or less, against a stall at 18°, `finForces.ts:37`).
  - The bottom move peaks at only 89–147°/s.
  - The 16° nose-up trim buries the last 0.37 m of the tail, so the fan leaves 0.2–0.8 m ahead of the tail.
- **With a real snap's motion, the unchanged code throws a big fan.** That means 300°/s with the fins slipping 20–30°. It gives 2.1–2.7 m (vacuum) at 7 m/s and 3.9 m at 9 m/s, all from the last 0.15 m of the tail.
- **Ruling.**
  - Don't boost the spray. The 2026-10-31 ruling stands: drift makes the height, load makes the mass, nothing hand-authored.
  - Build one spray fix: other players' boards need their spin.
  - The bigger fan has to come from the Snap's motion. That is the owner's call, because it reopens round 2's fix that keeps the fins holding.

## 1. A real snap's fan

**Mechanism**
- At the lip the rider stamps the back foot and turns the shoulders. The tail breaks through the lip and slides: "The fins momentarily lose grip, the tail slides through the turn, and water sprays off in a fan" (Rapture).
- The tail's bottom faces out of the turn. Sweeping outward drives it into the water at a speed W, and the water runs up the bottom to the high rail and leaves as a sheet.
- Measured on yawed plates: yaw makes the spray off the leading chine "more severe". With yaw added to roll, the effective trim rises (NACA TN 4187, trim 6–30°, roll up to ±15°, yaw 0–20°). In a snap the leading chine is the high, outside rail.
- The main spray is "a cone whose apex is in the vicinity of the stagnation line intersection with the chine". It starts from a short stretch of chine (Savitsky & Morabito 2010, in USNA EN486 ch. 7).
- **Low rail:** at small yaw it holds the cross-flow and throws nothing (TN 4187). With more yaw the flow leaves it cleanly. In a slide it is the trailing rail, so it throws little.
- **Tail edge:** in a skid it moves along its own length, so its flow is left behind as wake, not spray.
- **Fins:** they sit under the bottom and don't throw the fan. Their release matters only because it lets the tail slide (inferred).

| Property | Value and conditions | Status |
|---|---|---|
| Where it leaves | The outside rail over the last 0.15–0.7 m and the tail. Water-weighted mean within 0.4 m of the tail. | Modelled (2D+t, sourced kinematics) |
| Direction | 20–45° outside the path (46–57° from the heading). Never behind the path in the water's frame. | Modelled |
| Elevation | The bottom's tilt to horizontal plus 6–12° (measured blisters, Savitsky & Breslin). About 43–46° on flat water. Near vertical on a 60–80° lip (Rapture's approach; Forsyth's top-turn rail angle 75 ± 3°). | Measured tilt; geometry inferred |
| Launch speed | U = κ·2V·sin α, with tan α = k·tan τ_e / tan β_e and tan τ_e = W/V. At small α, U ≈ 2κkW / tan β_e, so the tail's speed into the water sets it. The ceiling is 2κV = 1.6 V (11 m/s at 7 m/s, 14 m/s at 9 m/s). | Modelled; κ measured |
| Height (vacuum) | 2.1–3.1 m at 7 m/s and 3.9 m at 9 m/s on flat water, for 300°/s with 20–45° of slip at the fins. Drawn 2–4 mm drops lose 25–55 % of that to drag at 8–13 m/s. | Modelled |
| Plan-view spread | The heading change while the tail throws: 200–300°/s over 0.2–0.4 s gives 60–120°. | Inferred |
| Sheet and drops | 1–8 cm thick at the rail; it tears within 0.01–0.03 s at these speeds (Squire), so drops form almost at once. Size knee 1 mm; largest min(6 mm, 12σ/ρ_a U²), which is 4.3 mm at 13 m/s. | Modelled (earlier rulings) |
| Water | 54–91 kg/s for 0.2–0.4 s, about 15–30 kg per snap. Never measured (Payne 1986). | Modelled |
| Duration | Thrown over 0.2–0.4 s; drops in the air 1.1–1.6 s; mist 1.5–3 s. | Inferred |

**How it scales**
- **Sweep rate:** W at the tail grows with ω·r·sin(bank), with r about 0.8–0.9 m.
- **Skid angle:** W also grows with V·sin(slip)·sin(bank).
- **Speed:** sets the ceiling (1.6 V) and the mass.
- **Rail angle:** a steeper bank (bigger β_e) means a slower jet but a deeper rail and more water.
- **Face:** water rising toward the bottom adds straight to W.

No measured spray height exists for surfboard, ski or wakeboard turns; none was found.

## 2. What our model throws in a Snap today

Synthetic poses on flat still water, at each move's hardest frame (round 2's `flat.json` traces). "Leaves from" is measured from the tail.

| Case | kg/s | Tail apex (vacuum) | Leaves from | Off the heading / off the path | Elevation |
|---|---|---|---|---|---|
| Snap, 7 m/s entry (5.8 m/s, bank 32°, nose 16°, 123°/s, fin 7°) | 46 | 0.83 m | 0.5–0.8 m. Stations 0–2 are buried: high rail 1–9 cm under | 46° / 44° | 42° |
| Snap, 9 m/s (7.7, 29°, 13°, 89°/s, fin 4°) | 55 | 1.31 m | 0.2–0.7 m | 49° / 47° | 38° |
| Compress, 7 m/s (7.2, 44°, 7°, 143°/s, as traced) | 120 | 1.38 m | 0.1–0.7 m | 59° / 60° | 50° |
| Compress, 9 m/s (8.6, 33°, 9°, 77°/s, fin 2°) | 82 | 1.07 m | 0.1–0.7 m | 61° / 61° | 41° |
| Sourced snap, 7 m/s, 300°/s, fin slip 20° / 30° / 45° | 91 / 86 / 54 | 2.10 / 2.65 / 3.08 m | Last 0.07–0.15 m | 46–54° / 21–41° | 43–45° |
| Sourced snap, 9 m/s, 300°/s, fin slip 30° | 71 | 3.89 m | Last 0.15 m | 50° / 29° | 43° |
| The 7 m/s sourced snap, board flattened to a 15° bank | 20 (both rails) | 1.22 m | — | — | — |
| The game's Snap with 2 m/s of water moving into the bottom (a face rising), 7 / 9 m/s | 65 / 68 | 1.54 / 2.05 m | Tail | 27–36° | 43–48° |

**What this means:** today's Snap fan is about as high as a carve's (0.55 m lower to 0.25 m higher) and carries a third to three-fifths less water. It also leaves from the middle of the board, not the tail.

**What's missing, ranked**
1. **The Snap's motion** (rider physics, not spray).
   - Real top turns average 2.2–3.2 rad/s (126–183°/s, rising with skill; Shormann & in het Panhuis 2020).
   - They turn 152 ± 3° in 0.96 s (Forsyth et al. 2024, 214 waves).
   - One instrumented snap peaked "over 200 degrees/second" at 9.13 m/s, and a cutback "over 300" (US 9697743).
   - Ours peaks at 89–147°/s on the bottom move (round 2, R2.4) and turns 43–89° in 1 s on the top move. The fins never release.
2. **The buried tail.** `boardSpray.ts:379` skips stations whose high rail is under water. That matches steady planing, where the chine-wetted afterbody sheds cleanly and the spray starts at the root–chine meeting (USNA ch. 7). A buried, swept tail pushes water out at roughly W (2.3 m/s), which is a low splash, not a fan. So the gate is right. The tail only rises out of the water (more lift) once it sweeps faster, as the sourced rows show.
3. **The face.** The solver's face holds near 17° (`breaking.md`), so no Snap gets the steep launch a 60–80° lip gives. The face's rising water is already in the sample: the depth-averaged profile at `PhysicalSurfWater.ts:341-345` and the lip's own velocity in `lipFlow` (`:711`).
4. **Other players.** `remoteSpray.ts:78-80` gives every patch the same velocity and ignores spin. A remote snap loses its tail's sweep, which is 3–4.5 m/s at 200–300°/s.
5. **"Nothing is thrown backward over the water"** (`boardSpray.ts:25`): keep it. In the water's frame every jet leaves along its root's normal, ahead of the path by α. A snap's fan only looks thrown back over the lip because the board turns 60–150° while the drops fly.

## 3. What to change

**a. Spray: build only the remote spin** (`src/net/remoteSpray.ts`)
- **Change:**
  - Take ω from the two poses already sampled 0.05 s apart: ω ≈ (2/Δt)·vec(q_now·q_before⁻¹), with the sign chosen so w ≥ 0.
  - Set each patch's velocity to v + ω×(R·local).
- **Physics:** each station's own velocity, the same 2D+t as the local board. It needs no protocol change, because `RemoteState` already carries the quaternion.
- **Payoff:** other players' carves and snaps get the tail's faster jet. The tail's apex is about 1.3–2× the mean in hard turns (spray-rework table).
- **Cost:** under 0.5 µs per remote board per frame on an M4 Pro (inferred; `RemoteSpray.add` measured 5.4 µs on the M1). The local board's cost doesn't change.
- **Switch:** `?snapFan=old` restores today's spray. Online rooms run the default.

**b. Don't add a Snap-keyed multiplier or a hand-shaped fan.** It would break the realism rule and the 2026-10-31 ruling.

**c. The bigger fan: the Snap's motion (the owner's call; it reopens round 2)**
- The targets:
  - a peak yaw of 200–300°/s;
  - a mean of 2.2–3.2 rad/s over the turn;
  - the centre-fin slip past 18° for part of the turn, then back under it (Rapture's "momentarily");
  - a bank of at least 20° against the water during the slide.
- **The conflict:** round 2 kept the fins holding because round 1's stall-spin (fins at 45–85°, the speed down to 0.2 m/s) fell in 2–3 of 4 top moves.
- **The physical route:** round 2's option (c), the body's own yaw. It is also the route to fixing the two moves done back to back.
- The advisor doesn't choose; this needs the owner's decision.

**d. Bars for the headless measurement**
- **Setup:** round 2's rig, with no visual rides.
- **Cases:**
  - still water at 7 and 9 m/s: steer, Compress and Snap, each with full steer for 0.6 s;
  - the top move on the 15° plane, from 120° and 150°;
  - the moving 1.2 m face (`FaceWater`) at 7–9 m/s.
- **Log every frame:**
  - from `BoardBody.spraySheets`: kg/s, the aft, mean and fore launch, `fluxMean`, and how far the root's aft end sits from the tail;
  - from the rig: yaw rate, bank against the water, nose, and the centre fin's attack.
- **Report:**
  - kg thrown over the move;
  - the aft launch's vacuum apex, and the drawn apex (95th percentile from `throwFan`'s flight);
  - the direction off the heading and the path, and the elevation;
  - the plan-view spread (10–90 % of the water's launch directions over the throw);
  - how long it stays at 10 kg/s or more.
- **Today, expect the table above to within ±30 %.** If the rig's tail isn't buried, the diagnosis is wrong.
- **Target after a motion change, on still water:**
  - tail apex at least 2.0 m (7 m/s) and 3.0 m (9 m/s) in vacuum, at least 1.3 / 1.8 m drawn;
  - at least 0.7 m above the Compress apex at the same entry speed;
  - 15–30 kg per snap;
  - root's aft end within 0.15 m of the tail, water's mean within 0.4 m;
  - launched 20–45° outside the path, at the bank plus 6–12°;
  - plan-view spread 60–120°;
  - a throw lasting 0.2–0.4 s.
- **Remote spin:** replaying the local board's poses at 20 Hz must land within 15 % of its aft apex and within 0.1 of its `fluxMean`. `?snapFan=old` must reproduce today's sheets bit for bit.

## 4. What the rider code doesn't expose

The fan reads everything it needs from the hull: the depth of each patch, its velocity including ω×r, and the water's flow. It needs no Snap flag and shouldn't get one. Two gaps:
- **Remote boards have no ω.** It can be derived from the pose pair, as in 3a.
- **`hullSpraySheets` doesn't say which stations were skipped** (buried or dry). A probe can copy the station loop, as `stations.ts` does.

## Risks

- A faster, heavier sheet can read as a white cloud. The mass is the lever, and it is unmeasured.
- If a slide flattens the board under about 15° against the water, the code blends into the unyawed flat blister. The synthetic fan then drops from 86 to 20 kg/s and from 2.65 to 1.22 m. That blister is measured only without yaw, and TN 4187 found yaw makes the leading chine's spray stronger. If a motion change produces flat slides, this branch needs a sourced fix before anyone judges the look. Open; no numbers were found.
- **Correction to 2026-10-31:** drag takes 25–55 % off 2–4 mm drops launched at 8–13 m/s, not "about a fifth". The game's linear drag and quadratic drag agree within 10 %. So tables of vacuum apex overstate the height the player sees.

## Shots for the owner

1. Snap against Compress at the same speed on the open face, chase camera. Expect about equal heights today.
2. A Snap at the lip. Expect a higher fan.
3. Another player's Snap online, with `?snapFan=old` for comparison.

## Sources

- NACA TN 4187 (Savitsky, Prowse & Lueders 1958), measured yawed and rolled plates: https://ntrs.nasa.gov/citations/19930085133
- USNA EN486 ch. 7, Spray (Savitsky & Morabito 2010; Savitsky & Breslin 1958): https://www.usna.edu/NAOE/_files/documents/Courses/EN486/07_-_Spray.pdf
- Marleaux, Simonis & Abdel-Maksoud 2024, 35th Symposium on Naval Hydrodynamics, 2D+t for drifting and yawing planing hulls: https://tore.tuhh.de/bitstreams/4b5e100d-1de4-404f-9b5c-62144d7f028f/download
- US 9697743 B2 (Catapult), instrumented snap and cutback: https://patents.google.com/patent/US9697743
- Forsyth et al. 2024, Sci. Rep. 14:8734: https://www.nature.com/articles/s41598-024-58387-y
- Shormann & in het Panhuis 2020, PLOS ONE 15(5): e0232035: https://pmc.ncbi.nlm.nih.gov/articles/PMC7173857/
- Rapture, Snap: https://www.rapturecamps.com/learn-to-surf/surf-maneuvers/snap
- κ, the pile-up factor k, the drops, Squire's tear and Gunn & Kinzer's fall speeds come from the earlier rulings: `docs/research/board-spray-2026-10-29/`, `spray-sheet-2026-10-30/` and `spray-rework-2026-10-31/`.

## Note from the coordinator (2026-11-05)

The owner dropped option (c), the body's own yaw, on 2026-11-05: the lean swinging round with the board "is correct behavior it should not change". It was built opt-in as `?bodyYaw=on` on `claude/snap-body-yaw` and parked (`docs/research/snap-body-yaw-2026-11-05/README.md` on that branch). So §3c's route goes back to the owner with that in mind.
