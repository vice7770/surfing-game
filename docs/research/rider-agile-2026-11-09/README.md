# Rider movement upgrade, stage 1: two legs (2026-11-09)

Branch `claude/rider-agile`, from main daa50a2d. Opt-in: `?agile=on`. The default is today's rider, byte for byte.

## The owner's ask

- 2026-11-08: "surfers have incredible agility and balance and stretching abilities, right now the playable surfer is a bit static."
- 2026-11-09: pick up "the movement work that allows for snap". The layback snap's four beats are the blueprint (set-up, launch, yo-yo recovery, exit).

## Checkpoint A: the mechanism, read against the code

### What the standing rider is today

- A point mass carried rigidly with the board's spin, on ONE leg along the body's up (unknown 6 of the 8 x 8 solve) and a bank across (unknown 7).
- The contact is one line of action through the centre of mass. Where it meets the deck is the centre of pressure; the feet's split is only that point's place between them.
- Two rotors already take reactions the point mass cannot: the swing (upper-body roll) and the twist (trunk yaw, 120 N·m, through a 0.15 m grip radius). Both enter the solve as right-hand-side couples only.

### Correction to the brief's mechanism

- Two legs as **central** forces (each from its foot toward the centre of mass) are exactly today's model: their resultant is the one line of action, and they make no yaw about the body. Nothing new comes from splitting the line in two.
- What two legs add is the **non-central** part: the couples the feet make between them. Each couple's reaction is a moment on the body about its own centre, so it needs a body rotor to take it. That is how the twist and the swing already work.
- So the reaction of the feet's yaw couple is the hips turning the other way (angular), not the body pushed sideways (linear). A sideways push at the back foot alone, with the body over it, turns nothing: the fins sit under that foot (0.28 m and 0.30 m from the tail).
- The fan study's poke agrees on the size: a bare 40 N·m couple on the board reached 218°/s and slid the tail. The feet can give that. The limit is what the body can react, and whether the fins are loaded when it pushes and when it comes back.

### The forces (stage 1)

Each is a pair of forces at the two feet (`feet.front`, `feet.rear`, 0.63 m apart), summed to no net force, with the opposite moment on a body rotor.

| Pair | On the board | Reaction | Bounded by |
|---|---|---|---|
| **The feet's couple** (yaw) | back foot pushes the tail across the deck, front foot pulls the other way; couple = F x 0.63 m about the deck's normal | the hips rotor turns the other way (pelvis and everything above it) | each foot's grip, FOOT_FRICTION x that foot's load; the leg's sideways strength; the hips' range |
| **The legs' split** (pitch) | one leg presses harder, the other eases by the same; couple = ΔN x 0.63 m about the deck's across axis; the pressure moves between the feet at once | the trunk rotor pitches the other way (pressure forward = torso back) | neither foot's load under zero; the trunk's range |

- **Hips rotor:** inertia 2.5 kg·m² (the body above the knees about its long axis, arms held out: de Leva 1996's segments; standing arms down is about 1.2). Range ±40° (hip rotation with the feet planted: internal 35°, external 45°, Neumann). A torque-limited servo like the twist's. **As built:** no coil in the set-up (it would change a partial steer, which must stay as it is); the hips whip against the turn at the launch, 15° (40° threw every rider: see the results), and come home in the recovery.
- **Leg's sideways strength:** 0.35 of body weight per foot (hip abduction by hand-held dynamometer, about 30 to 40 % of body weight in young adults: Bohannon 1997). To be re-sourced if it ever binds; the front foot's grip binds first.
- **Trunk rotor:** inertia 8 kg·m² (the body about its centre, crouched), range ±20°. **As built:** 10° (20° stalled two of the four climbs), torque at most 150 N·m (to be sourced) and never more than takes one foot's load to nothing.
- **The reaction is bounded and comes back.** Both rotors return to rest, so over a launch and recovery the feet give the board no net angular impulse. Any heading gained is the water's: the push comes while the tail is light and the pull while the fins are loaded.
- **No persistent decoupling.** The body's frame, lean and bank still turn with the board. The rotors only add a bounded offset to the drawn upper body.

### The Snap launch and recovery (`?agile=on`, replaces the stamp, never both)

1. **Set-up** (Snap held, as today): weight to the tail, shoulders wound. New: the hips coil into the turn.
2. **Launch** (steer past 0.8, Snap held 0.3 s, once per press-and-turn; depth = the stick's remaining throw): the front leg presses (pressure toward 60/40, the torso pitching back), the hips move forward off the back foot at Snap's quick pace (back leg long, front knee closed), and the feet's couple throws the tail out while the hips whip the other way.
3. **Recovery:** the couple reverses as the hips come home (the front foot pulling the board back under the body), the pressure goes back over the fins.
4. **Exit:** today's recentre.

### How it enters the solve

- Beside the 8 x 8, on the right-hand side only, like `twistTorque`: `rhs[3..5] += h x (limb torque about the rider's line)`. No new unknown, no change to the matrix.
- The limb forces go through one small ledger (`limb`: a point on the board, a force), which sums the force and the torque on the board. A net force is carried to rows 6 and 7 (the rider's own) with the opposite sign. The two feet's pairs sum to no net force today; **a hand on the rail (stage 2b) is a third entry in the same ledger**, and it may pull.
- With the switch off none of it runs: byte identity, pinned by the scripted ride's hash.
- No rewrite of the standing solve is needed.

### Approximation to own up to

- The couple's grip is checked per foot against that foot's load, but not against the grip the carve's own sideways push already uses in `project`. In a banked carve that push is mostly along the leg, so the overlap is small; noted, not modelled.

## Checkpoint B: as built, and what it measured

Built in `src/physics/AttachedRider.ts` behind `agile: 'on'` (`?agile=on`): `legsStep` (the two rotors and the limbs' ledger), the ledger's terms in `coupleStanding`, the launch on the stamp's clock (`stampStep`), the drawn points turned with the hips and the trunk (`turned`), and the hips' turn added to the twist the rig draws (`drawnTwist`, the snapshot's existing `twist` field; no new field). The rotors' axes are the body's up squared to the board's length, and the axis across the body.

Probe: `probes/zz-agile.test.ts` with `probes/run.sh` (the snap-stamp probe plus the bars' two measures). Snap held 0.6 s with a full steer from 0.2 s; the launch starts 0.3 s after the press. Static 15° plane, the four climbs.

| Climb | | turn 0.8 s after launch | peak yaw rate | speed kept at 1 s | fin's most attack | falls |
|---|---|---|---|---|---|---|
| 150°, 6.7 m/s | today | 84° | 174°/s | 0.37 | 9° | falls (1.77 s) |
| | stamp | 95° | 237°/s | 0.22 | 9° | on |
| | **agile** | **87°** | **174°/s** | **0.33** | 9° | **on** |
| 150°, 8 m/s | today | 53° | 182°/s | 0.36 | 19° | on |
| | stamp | 41° | 245°/s | 0.30 | 38° | on |
| | **agile** | **69°** | **144°/s** | **0.50** | 7° | on |
| 120°, 6.7 m/s | today | 45° | 205°/s | 0.38 | 34° | on |
| | stamp | 57° | 260°/s | 0.33 | 33° | on |
| | **agile** | **72°** | **178°/s** | **0.48** | 13° | on |
| 120°, 8 m/s | today | 39° | 149°/s | 0.54 | 19° | on |
| | stamp | 23° | 185°/s | 0.38 | 36° | on |
| | **agile** | **48°** | **161°/s** | **0.56** | 9° | on |

Flat water: 7 m/s 45° by 1 s at 102°/s, falls at 1.83 s (today 36°, 189°/s, falls at 1.78 s); 9 m/s 39° at 133°/s, on (today 28°, 126°/s, on).

### The bars

| Bar | Result | |
|---|---|---|
| peak yaw rate 200 to 300°/s | 144 to 178°/s | **fail** |
| 120° or more within 0.8 s of the launch | 48 to 87° (today 39 to 84°) | **fail** |
| fins pass stall and re-grip, within 30° of the path 0.5 s after the recovery | the fins never pass stall (7 to 13°, stall 18°); 6 to 33° off the path at that time | **fail** (no slide to recover from) |
| falls no more than today's | 0 of 4 (today 1 of 4); flat 1 of 2 (today 1 of 2) | pass |
| speed kept | 0.33 to 0.56 (today 0.36 to 0.54) | reported |
| partial stick (0.5) within 3 % | identical on all four climbs (bit for bit in the tests at 0.6 and 0.75) | pass |
| switch off: byte identical | `scriptedRide` hash unchanged with the switch on and no Snap; default rider's code paths untouched | pass |
| moving faces | fall 5 of 5, as every variant does (two of them a few tenths later or earlier) | unchanged |

### The three rounds

1. **As designed** (hips 40°, trunk 20°): peaks 219 to 309°/s, but all four climbs fell within 0.7 s of the launch and three turned the wrong way. Each part alone: the hips' whip (peaks 210 to 278°/s) threw all four (the fin at 22 to 51°, then the board gone from under the feet); the trunk's pitch alone gave the highest peaks (237 to 346°/s) and lost two of four; the pressure's move to 60/40 alone changed nothing measurable in the turn.
2. **Smaller ranges, one part at a time:** hips 10° turned every climb further than today with more speed kept and no stall, at lower peaks (131 to 231°/s); trunk 10° alone still stalled two climbs. Slower rotors (8 rad/s) turned less.
3. **Together:** hips 15° with trunk 10° kept every rider on with the furthest turns of the combinations that did (the table). Hips 10 to 15° with trunk 20° reached 244 to 302°/s on two climbs, with the fin at 45 to 50° and falls on two.

### Reading

- **The feet's couple is real but nets to nothing.** The hips start and end square, so over a launch and its recovery the feet give the board no net angular impulse (pinned by a test). What it buys is timing: the board is turned early, before the lean has built, and the water does the rest. That is worth 3 to 27° on these climbs and a rider who stays on, not a snap.
- **A yaw rate over 200°/s here is a skid, and the rider cannot stand on a skid.** Every setting that reached the band did it with the fins well past stall, and the rider then fell exactly as the 2026-11-05 pokes did: the board's sideways force goes through the feet before the lean can follow. The point-mass body is carried on one line of force through its centre; it has no way to let the board go out from under it and take it back.
- **So the missing piece is the body, not the push.** A snap's tail slide needs the board's far end to move while the centre of mass keeps its path: the legs must lengthen and shorten independently (the board yawing and sliding under hips that do not follow), which this rider's single leg and rigid carry cannot do. Stage 1's rotors give the reactions somewhere to go, but the centre of mass is still nailed over the stance.
- **The trunk's pitch is the stronger lever** (it unloads the fins for a moment, which is what the stamp does with the lean), and the more dangerous one.

### What was skipped or is weaker than asked

- The 60/40 pressure move is kept (it shows in the drawn legs: the pelvis about 4 cm forward at the launch's end) but did nothing measurable to the turn.
- "Back leg long, front knee closed" shows only mildly in the points (back leg about 1 cm longer, front about 3 cm shorter than today's Snap at the same moment); the head goes back about 9 cm over the pelvis and the hands swing about 15° against the turn. Pinned by a points test, not a rig test.
- The feet's grip for the couple is not checked against the carve's own use of it in `project` (the approximation above).
- The leg's sideways strength and the trunk's torque are to be re-sourced.

## The four stages

Triggers (the owner, 2026-11-09): **Snap held with a full stick** is the sharp snap, the body staying low (stage 1; nothing new is attached to Snap's release). **Letting go of Snap with the stick still at full** (at or past 0.8) launches the layback (stage 2): the legs extend, the back leg pushes the board away, the body stretches and lays back, the trailing hand plants; **pressing Snap or Compress again** is its recovery, the front leg pulling the board back under the body, on the player's timing. Letting go with the stick eased stays today's exit (the recentre). **Snap with the hand button (E / LB)** is the rail grab (stage 2, built before the layback).

1. **Two legs (this PR).** The feet's couple, the legs' split, their limits and reactions, Snap's launch and recovery, the drawn legs.
2. **Load-bearing hands.**
   - **(a) On the water, the anchor.** The trailing palm planes: its force is the dynamic pressure x palm area x a planing coefficient, at the hand's point (today `standingHand` only drags). It enters as an external force on the rider with its moment about the centre of mass taken by the swing and trunk rotors, so the body can lay back onto it and push off it. Limits: arm reach (shoulder to palm), shoulder and elbow strength, the palm's area and the water's speed. Sourced later.
   - **(b) On the rail, the grab** (the owner, 2026-11-09: backside pigdog, the back knee low, the trailing hand pulling up on the outside rail to lever the inside rail in; frontside slob or mute between the feet, holding the board to the feet through a fins-free slide; a low ball in chop and wind). A third body-to-board contact in the limb ledger, at the rail point the hand reaches. Unlike the feet it carries tension: up to the hand's grip strength (about 400 to 500 N one-handed for an adult man, to be sourced), within the arm's reach from a crouch. Its roll moment on the board has its reaction on the body (the bank's row and the swing rotor); its pull lets the feet's couple act with the board unloaded. Same no-hidden-motors rule.
3. **Arms and upper body as balance mass.** The arms as their own rotors (their inertia is the hips rotor's reach today), pushing off the anchor hand.
4. **The same quick legs in ordinary riding.** W/S pressure through the legs' split first and the posture after; unweighting through turns.
