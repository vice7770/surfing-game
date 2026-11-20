# Snap round 3: the sharper pivot and the tail's fan (2026-11-05)

Branch `claude/snap-fan`, from main 0b515dff plus the advisor's ruling (9808fc75). Worktree `.claude/worktrees/canyon-beach-break`.

## Where it stands

- **The owner's pick (2026-11-05): option 2, built opt-in as `?snapPivot=lean`** (`claude/snap-lean`; `SNAP_RAIL_RANGE` in `AttachedRider.ts`). Under Snap a full steer asks for up to 70° of bank (MAX_BANK) in place of the steer's 50°, still no more than Snap's 2.2 m turn holds at the board's speed. The default is unchanged (the hash test). `snapStance.test.ts`, "Snap leaning for its own turn": still water at 7 m/s, instant input, it leans 47° against 36° and turns 93° by 1 s at up to 236°/s, against 50° at 199°/s. The owner rides it on waves, where the face feeds the speed back; on still water it falls at the stall in 7 of 12 (2 by default).
- **The sharper pivot: not built.** Every physical lever measured either adds little or trades the rider's balance for the pivot (the tables below). The owner's rule applies: "If the sharper pivot can't be had without falls, don't force it." The options are in **Options for the owner**. Snap is #195's, unchanged.
- **Built (default on, `?snapFan=old` restores today's spray bit for bit):**
  1. **Other players' boards spin** (the advisor's §3a, `src/net/remoteSpray.ts`). ω comes from the two poses already sampled 0.05 s apart, and each patch moves at v + ω × (R·local). Replaying the local board's poses at 20 Hz now lands within 11–12 % of its aft apex (19–31 % before) and 0.005–0.007 of its `fluxMean` (0.03–0.05 before), by the median over the throw.
  2. **A steep jet's exit, a bug found while measuring the fan** (`src/physics/boardSpray.ts`, `EXIT_ACROSS`). Past 45° off its path (2α ≥ 90°), a jet's run over the dry bottom went through a negative tan(2α), and its exit was placed 1–220 m to the side of the board. That happens in Snap's nose-up trim over the flat stations ahead of the tail, and in a moderately banked carve with the low rail sunk 8–15 cm. The sheet's root, its drawn drops and its curtain's timing came from that point. Now such a jet leaves at the high rail of its own station. Jets under 45° are unchanged, bit for bit.
- **Without Snap held, every ride is unchanged.** No physics changed; `snapStance.test.ts`'s hash test passes.
- **Online:** the worker's half of `?snapFan` (the exit) is pinned to the default in online rooms, as every spray switch is. The page's half (other players' spin) reads the switch online too. It is drawn only on that player's page and changes nothing the room shares, and it is the advisor's shot 3.
- **Tests:** tsc clean (both); the main suite 3,074 passed, 23 expected fails, 0 failed (**Tests**).

## The diagnosis: what limits the pivot

Headless only (round 2's rig: `AttachedRider` on `BoardBody`, keys' 0.2 s ramp unless marked pad). Probes in `probes/`, data in `data/`.

### The yaw-moment budget

A probe-only ledger in `BoardBody` (`probes/yawLedger.patch`) books each part's yaw moment about the composite centre (board plus rider) every substep: the hull's pressure ahead of and behind that centre, the rails' faces, each fin, buoyancy, friction, the water's inertia, and the rider's twist. The ledger closes: its sum matches the change of the composite's angular momentum. Full steer from 0.2 s; Snap or Compress held 0.6 s. Moments are N·m, + into the turn.

| Case | Yaw inertia (kg·m²) | First 0.25 s: twist / fins / yaw rate | Through the turn: hull ahead / hull behind / fins / rails / twist / net | Lateral centre of pressure | Peak yaw at bank, speed | The rider's path then |
|---|---|---|---|---|---|---|
| Flat 7 m/s, steer | 1.0 | 0 / −3 / 26°/s out | +78 / −37 / −14 / −4 / 0 / +3 | 0.9 cm ahead | 112°/s at 35°, 5.9 m/s | 82°/s |
| Flat 7, Compress | 0.8 | 0 / 0 / 18 out | +97 / −57 / −16 / −6 / 0 / +2 | 1.7 cm ahead | 147°/s at 35°, 7.1 | 111°/s (its gameplay pull) |
| Flat 7, Snap | 1.1 | **−16 / +12** / 36 out | +56 / −41 / −10 / −3 / +8 / −7 | 1.9 cm behind | 151°/s at 37°, 5.7 | 98°/s |
| Flat 9, Snap | 1.0 | −16 / +12 / 28 out | +57 / −39 / −17 / −2 / +10 / −11 | 2.6 cm behind | 93°/s at 34°, 7.7 | 64°/s |
| Climb 150°, 6.7, Snap | 1.1 | −16 / +12 / 53 out | +52 / −31 / −3 / −7 / +6 / −3 | 0.7 cm behind | 237°/s at 36°, 4.1 | 106°/s |
| Climb 150°, 8, Snap | 1.1 | −16 / +12 / 43 out | +50 / −29 / −5 / −4 / +7 / −7 | 1.8 cm behind | 178°/s at 37°, 5.1 | 99°/s |

What it shows:
- **The board stores no spin.** The board with the rider carried on it has 0.8–1.2 kg·m² of yaw inertia about its centre. So the yaw rate is wherever the water's moments balance, from frame to frame.
- **The hull turns the board and the hull holds it.** The hull's lateral force ahead of the centre drives the turn (+50 to +100). The hull behind, the fins and the rails resist (−35 to −80). The net stays within ±11 N·m, and the lateral centre of pressure within 3 cm of the centre.
- **The heading follows the rider's path, and the path is lean-limited.** The rider's centre of mass turns no faster than its lean holds it: about g·tan(bank)/V, 1.1–1.9 rad/s here. The peaks come only once the body leans 34–37°, 0.7–1.0 s after the press (the balance's lean-in, the don't-retry wall). The heading's lead over the path is small and closes again.
- **The first 0.25 s go the wrong way.** Snap's twist reaction (−16 N·m: the shoulders winding into the turn push the board out) is held by the fins (+12 N·m). The board meanwhile yaws out at 28–53°/s, on top of the lean-in's counter-steer.
- **The fins hold because the rider stands over them.** With the hips over the back foot, the centre of mass sits over the side fins (0.28 m from the tail, the back foot 0.30 m). The board pivots about its fins, and the centre fin's attack stays under 10° (FIN_STALL 18°).

### Diagnostic pokes (not physical levers)

Flat water, 7 m/s, Snap held 0.6 s, the steer held on:

| Poke | By 1 s | Peak | Rider |
|---|---|---|---|
| None (#195) | 61° | 151°/s | on |
| A pure yaw couple on the board, 10 / 20 N·m into the turn during the hold | 47° / 38° | 131 / 143°/s | on |
| The same, 40 N·m | — | 218°/s | **thrown out of the turn at 1.07 s**: the drift ran to 45°, the speed fell from 7 to 2 m/s, and the bank went from −19° to +68° |
| The fins at half their area | 58° | 124°/s | on |
| No centre fin | — | — | falls at 0.42 s |

- A yaw couple doesn't buy a pivot: up to 20 N·m the board realigns with its path, and beyond it the board slides out from under the rider. The skid's sideways force trips the feet before the lean can follow.
- The fins are the board's weathervane. Take them away and nothing keeps the heading on the rider's path.

**So the limit is the rider's lean, not the board's ability to pivot.** For the heading to run 20–30° ahead of the path, the tail has to slide. The skid's force then has to be met by a lean the body doesn't yet have, and the slide has to close before the fins swing the board back to its path. The tail can only slide (the centre fin past 18°) if the board pivots well ahead of the fins, with the tail swinging out. But the weight is over the fins.

## Options measured (the physical levers)

Each lever is a probe-only change to `AttachedRider` (`probes/snapLevers.patch`, read through the `PROBE` JSON). It is measured with the full turn and fan probe (`probes/zz-fanPivot.test.ts`). Each cell gives the turn by 1 s from the press and the peak.
- **Flat water:** 7 / 9 m/s, Snap held 0.6 s, the steer held on.
- **Climbs:** round 2's static 15° plane, from 150° and 120°, at 6.7 / 8 m/s, runs of 1.6 s.
- **Falls on flat water** are out of 12: round 2's protocol of 7 and 9 m/s, the steer held, eased to half or let go with Snap, keys or pad.
- **Falls on the climbs** are out of 4. All of them come at the stall near the static face's apex, 1.2–1.6 s in, as round 2's apex stalls do. The face gives nothing back.

| Option | Flat 7 / 9 | Climb 150°, 6.7 / 8 | Climb 120°, 6.7 / 8 | Centre fin, most; time past 18° | Falls, flat (pad) | Falls, climbs | Fan apex, flat 7 / 9 (vacuum; drawn) |
|---|---|---|---|---|---|---|---|
| **#195's Snap (today)** | 61°, 151 / 31°, 160 | 105°, 237 / 70°, 178 | 58°, 155 / 39°, 209 | 10° / 0 s | 2 (2) | 0 | 1.06; 0.90 / 1.44; 1.07 m |
| Hips 0.075 m further back (a third of round 1's lean) | 49, 139 / 32, 150 | 122, 289 / 53, 127 | 61, 172 / 40, 224 | 14° / 0 | 5 (4) | 1 | 1.10; 0.89 / 1.48; 1.12 |
| Round 1's lean back, held | 51, 153 / 32, 153 | **174, 422** / 130, 262 | 134, 271 / 60, 147 | 90° / 0.37 s | 6 (3) | **4** | 1.22; 0.86 / 1.72; 1.24 |
| The stamp: round 1's lean for 0.3 s, then the hips back over the back foot | 43, 133 / 32, 152 | 130, 305 / 52, 174 | 78, 219 / 43, 145 | 90° / 0.32 s | 2 (2) | 1 | 1.07; 0.84 / 1.36; 1.12 |
| The shoulders wound away from the turn (counter-rotation) | 60, 124 / 32, 153 | falls 1.18 s / 87, 225 | 70, 193 / 45, 108 | 17° / 0 | **0** | 1 | 1.05; 0.89 / 1.36; 1.04 |
| No twist | 49, 158 / 31, 156 | 76, 182 / 83, 204 | 66, 169 / 46, 129 | 15° / 0 | 0 | 1 | 1.15; 0.88 / 1.41; 1.06 |
| The shoulders wound 0.4 s, then the hips bring the board round under them | 90, 256 / 36, 191 | 37, 206 / 32, 193 (spins back) | 16, 236 / 47, 203 | 57° / 0.28 s | 3 (1) | 1 | 1.44; 0.90 / 2.00; 1.20 |
| Snap leans as its 2.2 m turn holds, up to 55° (today 50°, the steer's cap) | 74, 192 / 35, 166 | 98, 222 / 80, 195 | 72, 194 / 44, 209 | 11° / 0 | 4 (4) | 0 | 1.33; 0.98 / 1.54; 1.11 |
| **The same, up to 70°** (MAX_BANK) | **92, 215 / 62, 192** | 97, 217 / **103, 239** | 79, 222 / 67, 212 | 13° / 0 | **7 (5)** | 0 | **2.28; 1.01 / 2.34; 1.33** |

- **Turn rates over the turn** (onset at 1 rad/s to the end), the 150° climb at 6.7 m/s: today 2.65 rad/s, the deeper lean 2.54, the stamp 3.34, round 1's lean 4.3. Measured from the turn's onset, today's Snap off the 150° climb turns 145° in 1 s, the deeper lean 142°, and round 1's lean 228° (with a fall).
- **The two moves back to back** (`zz-r2Diag` CASE=two; Snap, steer or Compress up, then Snap down; plus steer then steer). Across round 2's eight waters (the static plane, the moving 1.2 m face, the 0.85 m face), riders on: 0 of 8 for every pair. That holds today, with the 55° lean and with the 70° lean. These falls are R2.3's deep U (the rail change), not the pivot.
- **The fins never slip in a turn the rider stays on at speed.** They slip (11 slides in the table) only when the weight goes behind the back foot (round 1's stall-spin, as a hold or a stamp) or the hips throw the board round.
  - 5 of the 11 grip again, but then the board stalls (the least speed 0.2–2 m/s), the rider falls, or the heading swings back to the path (the hips' throw).
  - The rail against the water falls to 0–29° in the slides, under 20° in 8 of 11: the board flattens as it slides, where the advisor's risk note says the flat blister takes over.
- **Why the deeper lean falls on flat water.** Past the rail's bite (48° against the water) the board bogs. From 7 m/s it is under 3 m/s by 1.2 s, the body still leaning 40–47°, and below planing the body cannot stand back up. On still water nothing feeds the speed back. On a wave the face would, but that is unmeasured here.

### Against the owner's targets

| Target | Today (#195) | Best physical option on that target |
|---|---|---|
| Peak yaw 200–300°/s | 151–160 flat; 155–237 climbs | 70° lean: 192–239 everywhere |
| Mean 2.2–3.2 rad/s over the turn | 1.05–1.97, 2.65 on the 150° climb at 6.7 | 70° lean: 2.0–2.6 |
| About 150° in about 1 s, the top move | 105° from the press, 145° from the turn's onset (150°, 6.7 m/s); 70° at 8 m/s | 70° lean: 103° at 8 m/s; round 1's lean 174° but falls |
| The centre fin past 18°, then gripping again | never (≤ 10°) | only with the weight behind the back foot or the hips' throw; 5 of 11 slides grip again, then the board stalls or the rider falls |
| A bank of 20° or more against the water in the slide | no slide | the rail falls to 0–29° in the slides, under 20° in 8 of 11 |
| The speed shed | kept 0.31–0.57 by 1 s | every option sheds more |
| The rider stays on | 2 of 12 flat (pad), 0 of 4 climbs | only counter-rotation and no twist keep 0 of 12, with less turn |

## Options for the owner

1. **Keep #195's Snap** (recommended for now). Ride it at a real lip with this round's spray fixes. The tail's fins lose grip in the physics when it leaves solid water: the fins grip with their immersed share. The headless rigs have no lip.
2. **Snap leans for its own turn** (the 70° row; one line in `prepareBank`). Sourced: Forsyth et al. 2024 measured cutbacks and top turns on a 75 ± 3° rail, against 42 ± 3° in bottom turns. On the measures:
   - every turn is sharper, at 192–239°/s;
   - the flat fan's vacuum apex doubles, to 2.3 m;
   - the fins still hold;
   - on still water the board bogs at its rail and the rider falls at the stall in 7 of 12 (today 2).
   It could be built opt-in (`?snapPivot=lean`) for the owner to ride on waves, where the face feeds the speed.
3. **The stamp**: the weight slammed behind the back foot for 0.3 s, then back over it. This is the coaching's "slam the weight onto the tail, then centre it".
   - It gives the slide: the fins past 18° for up to 0.32 s, and on the climb 130° by 1 s at up to 305°/s.
   - It is round 1's stall-spin in a short form: the board stalls (keeping 0.07 of its speed off the 150° climb), the rail goes nearly flat in the slide (0–12°), and flat-water turns get shorter (43° by 1 s against 61°).
4. **The body's own yaw:** rejected by the owner on 2026-11-05, so not offered again.
5. **Nothing physical left untried here** on still water and the static face: the nose unweighted (the load can only move back by moving the centre of mass, which is levers 2–3), the fins' load (fully immersed either way), and the back foot's push. With the body's yaw carried with the board, the push is a couple inside the rider and board. Its only physical outlet is the upper body's twist, which rows 5–7 cover.

## The fan (today's Snap, with the fixes)

The board spray off `BoardBody.spraySheets` during the throw, from the press to 0.4 s after Snap is let go:
- the kg thrown;
- the aft launch's vacuum apex (most), and the drawn apex (95th percentile of `throwFan`'s drops, with the air's drag, over the water);
- where the root's aft end and the water's mean leave, from the tail;
- the direction, as the water-weighted median off the heading and off the path, outward;
- the elevation;
- the plan-view spread (10–90 % of the water's directions over the ground);
- how long the flux stays at 10 kg/s or more.

| Flat water | kg | Aft apex (vacuum) | Drawn p95 | Root's aft end / mean from the tail | Off heading / path | Elevation | Spread | ≥ 10 kg/s |
|---|---|---|---|---|---|---|---|---|
| 7 m/s, steer | 39 | 0.71 m | 0.48 m | 0.08 / 0.59 m | 63° / 61° | 46° | 37° | 0.83 s |
| 7, Compress | 48 | 3.16 m (one frame as Compress lets go; 1.0–1.4 otherwise) | 0.77 m | −0.03 / 0.75 m | 59° / 53° | 49° | 69° | 0.72 s |
| 7, **Snap** | 36 | **1.06 m** | **0.90 m** | **0.43** / 0.56 m | 41° / 36° | 44° | 70° | 0.73 s |
| 9, steer | 48 | 0.74 m | 0.67 m | 0.20 / 0.41 m | 67° / 65° | 45° | 32° | 0.68 s |
| 9, Compress | 46 | 1.08 m | 0.86 m | 0.45 / 0.61 m | 63° / 62° | 42° | 34° | 0.68 s |
| 9, **Snap** | 39 | **1.44 m** | **1.07 m** | **0.32** / 0.51 m | 48° / 42° | 39° | 38° | 0.70 s |

- **The advisor's diagnosis holds.** Today's Snap throws a carve-sized fan from 0.3–0.45 m ahead of the tail (the tail buried). Its vacuum apex is within +28 % (7 m/s) and +10 % (9 m/s) of the advisor's synthetic 0.83 / 1.31 m.
- **Against the advisor's bars for a snap's motion:**
  - the apex reaches about half of 2.0 / 3.0 m vacuum and 1.3 / 1.8 m drawn;
  - the kg are over the 15–30 bar because on still water the carve throws on after the snap;
  - the throw is longer than 0.2–0.4 s for the same reason;
  - the spread is 38–70° (the bar is 60–120°);
  - the root is 0.3–0.45 m from the tail (the bar is within 0.15).
- **With the 70° lean** (option 2) the vacuum apex reaches 2.28 / 2.34 m, and the drawn apex 1.01 / 1.33 m.
- **On the static climbs** the fan is small (6–17 kg, apex 0.0–1.0 m): the board slows toward its stall.
- **The exit fix changes no flux or velocity.** It moves the root and the curtain's run: today's Snap at 7 m/s had its root drawn 2.3 m from the tail at the throw's top.

### The remote spin (`remoteSpray.test.ts`)

The local board's Snap (pad, 7 m/s, still water) is replayed through `RemoteSurfers` at 20 Hz and compared frame by frame while it throws 10 kg/s or more.

| | Aft apex error, median | `fluxMean` error, median | The throw's top |
|---|---|---|---|
| With the spin (default) | 12 % (9 m/s run: 11 %) | 0.007 (0.005) | 1.31 m against the board's 1.20 m |
| `?snapFan=old` | 19 % (31 %) | 0.05 (0.03) | 0.97 m |

- The remaining error is the poses' 0.05 s span: v and ω are its means, 25 ms behind the pose.
- A remote board's g-load is not on the wire, so its flat blister holds 1 g.
- A board circling at 4 rad/s throws its aft jet more than 1.2 times as fast up with the spin. Running straight, it throws exactly as before.

## Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- New:
  - `boardSpray.test.ts`:
    - a jet steeper than 45° leaves on the board, while `exits: 'old'` puts it 10 m to the side;
    - `exits: 'old'` is main's, bit for bit (`BEFORE_SNAP_FAN`, a 96-pose sweep);
    - carves whose jets run under 45° are unchanged.
  - `remoteSpray.test.ts`:
    - the replayed Snap lands within 15 % and 0.1, and the spin's error is under the old's;
    - `snapFan: 'old'` is main's, bit for bit (a circling board);
    - the spin raises a circling tail's jet;
    - a straight run is unchanged.
  - `PhysicalMode.test.ts`: `?snapFan=old` reaches every spot's config, other values do nothing, and an online room pins the default.
- The main suite (`--maxWorkers=3`, without `SurfZoneSimulation` and `SurfZoneRunner`): **318 files passed (34 skipped); 3,074 tests passed, 23 expected fails, 40 skipped, 0 failed** (907 s, beside another session's run).
- The Wave Pool subset of `SurfZoneSimulation.test.ts`: not run. No ride's physics changed, and the spray is drawn only.

## Shot list for the owner

1. **A Snap on the Wave Pool's open face, chase camera,** then the same with `?snapFan=old`.
   - *See:* with the fix, no spray appears metres to the side of the board in the hardest part of the Snap; with `=old` you may catch stray drops off to the side.
   - Snap against Compress at the same speed: about equal fan heights today (the advisor's shot 1).
2. **A Snap at the lip** (the steepest wave you can find; the Canyon's or the Reef's).
   - *Tell us* whether the tail slides when it goes over the lip (the fins leaving solid water), and whether the fan rises there (the advisor's shot 2).
3. **Online, another player's Snap** (two browsers or a friend), chased.
   - *See:* their tail throws higher in their hard turns.
   - With `?snapFan=old` in your own address bar, their spray is as before (the advisor's shot 3). Your own board's spray stays the room's default online.
4. **Your call on the pivot:** options 1–3 above (and whether to build option 2 opt-in to ride it).

## Probes (`probes/`)

Copy the `zz-*` files into `src/physics/` (`zz-remoteSpin.test.ts` into `src/net/`) with round 2's `zz-r2Lab.ts` (`../snap-stance-2026-11-03/probes/round2/`). Delete them afterwards: `zz-r2Lab.ts` is not git-excluded.
- `zz-yawBudget.test.ts` (with `git apply probes/yawLedger.patch` on `BoardBody.ts`): the yaw-moment ledger.
  - `CASE=flat|climb`, `MOVES`, `SPEEDS`, `ACROSS`, `DUR`.
  - The pokes: `COUPLE` (with `COUPLE_FOR`), `FINSCALE=l,r,c`, `NOTWIST=1`, `ROTATE`.
- `zz-fanPivot.test.ts`: the turn and the fan; `levers.py` prints the options table from `data/levers/`.
  - `CASE=flat|climb`, `MOVES`, `SPEEDS`, `ACROSS`, `HOLD`, `RAMP` (0 for the pad), `AFTER` (the steer after Snap), `DUR`, `EXITS=old`, `TRACE=1`.
  - The levers through `PROBE='{"back":…,"stamp":…,"rail":…}'` (with `git apply probes/snapLevers.patch` on `AttachedRider.ts`), and `ROT_PLAN=wind,after[,until]` (the pad's rotation).
- `zz-r2Diag-probe.test.ts`: round 2's diagnosis probe reading `PROBE` (CASE=two for the two moves).
- `zz-remoteSpin.test.ts`: the replay, frame by frame.
- Revert both patches before committing: `git checkout src/physics/BoardBody.ts src/physics/AttachedRider.ts`.

## Sources

- The water-physics advisor's ruling: `advisor-ruling.md` (here), and its sources.
- Forsyth et al. 2024, *Sci. Rep.* 14:8734, Table 2: cutbacks and top turns 152 ± 3° in 0.96 s at 3.0 rad/s on a 75 ± 3° rail; bottom turns on 42 ± 3°.
- Rapture's snap (the fins "momentarily lose grip"; centre the weight and re-engage the fins); the owner's coaching research (snap-quick).
- Round 1 and round 2: `../snap-stance-2026-11-03/README.md`; snap-quick: `../snap-quick-2026-11-05/README.md`.
