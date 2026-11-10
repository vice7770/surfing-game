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

## Stage 2a: the rail grab (2026-11-09)

**Asked (the owner):** Snap held with the hand button (E / LB) grabs the rail. Backside, the pigdog: the back knee low, the trailing hand on the outside rail pulling up, levering the inside rail into the face for a tighter, more vertical pivot. Frontside, a squat with the hand on the rail between the feet, holding the board to the body through a slide. The easier, controlled move: a mistake bogs a rail, it does not throw the rider, and that has to come out of the physics.

**Result in one line:** the hand holds the board through a launch that stage 1 could not survive and the yaw rate reaches 200°/s or more on six of eight climbs (to 316°/s), but the board then sits past stall for most of a second, the speed is spent, and one climb in four ends in a fall. The bars are not met. Behind `?agile=on` only.

### As built

In `src/physics/AttachedRider.ts`, with `agile: 'on'`, Snap held and the hand button (`grabAsked`; without Snap the button is today's water hand, and with the grab asked there is no water hand):

- **Reach (`grabStep`).** The rail point is the toes' rail beside the body's centre of mass, between the feet. The shoulder is 0.55 m from the hips along an upper body bent 75° toward the rail (the hand in the face uses 60°; 60° needs the full tuck). The hand holds only when the 0.7 m arm reaches. The legs go down to the tube tuck's depth (the existing crouch, no new posture); the arm reaches about 0.34 m down, **0.55 to 0.65 s after the press** at the legs' own pace. The drawn hand sets off 0.12 m before reach and waits short of the rail, so it arrives as the body does. Out of reach, or the button let go: the hand is off and gives nothing.
- **The hold (`projectGrab`).** The projection of the contact's impulse now has a third contact. What the feet cannot give (a push across past their grip, a line of force outside the support, a pull toward the board) the hand gives, up to its grip, in any direction that does not push the body off the deck. A board held by a hand is not lost when a foot's load reaches zero.
- **The grip: 450 N.** A man's one-handed grip on a dynamometer averages about 460 N (Mathiowetz et al. 1985, by age 400 to 540 N; a woman's about 280 N). Recalled, not fetched again; a wet 6 cm rail likely allows less.
- **The lever.** Turning to the heels' side (backside), the arm pulls the rail up along itself by 0.6 of the grip at full stick (270 N). The body takes the opposite: pulled down onto its feet, and rolled the other way about the board's length through the bank's row, exactly as the ankles' torque enters. The rest of the hand's moment about the body's line goes into the ledger with its reaction on the hips and the trunk rotors. Frontside the toes' rail is the inside one and the hand only holds.
- **The launch.** A full steer's launch waits for the hand, then winds the hips 25° and the trunk 14° (stage 1: 15° and 10°).
- **Drawing.** `renderPoint` puts the grabbing hand on the rail point whenever the grab acts (backside the trailing hand, frontside the leading one). `HumanoidRig.snapHands` leaves a hand within 3 cm of the rail there (Snap's reach toward the water fades in over 0.25 m). No snapshot or wire change.

### What it measured

Probe: `probes/zz-grab.test.ts` with `probes/run-grab.sh` (`HAND=1 HOLD=1.2 REL=0.3`: Snap and the hand held with a full steer from 0.2 s, let go 0.3 s after the launch, as stage 1's Snap is). Static 15° plane, stage 1's four climbs. Backside is Regular turning left; frontside is Goofy turning left. Agile Snap is stage 1 as merged (it rides the same in either stance). "Today" is in stage 1's table above.

| Climb | | launch after the press | turn by 1.1 s after the press | turn 0.8 s from its own launch | peak yaw rate | speed kept at 1 s | fin's most attack | past stall, from the launch | falls |
|---|---|---|---|---|---|---|---|---|---|
| 150°, 6.7 m/s | agile Snap | 0.30 s | 87° | 93° | 174°/s | 0.33 | 33° | 0.75 to 0.92 s | on |
| | grab, backside | 0.57 s | 97° | 70° | 283°/s | 0.20 | 90° | 0.38 s to past 1 s | **falls** 1.05 s after the launch |
| | grab, frontside | 0.65 s | 97° | 70° | 316°/s | 0.38 | 90° | 0.38 to 0.90 s | **falls** 0.98 s after the launch |
| 150°, 8 m/s | agile Snap | 0.30 s | 69° | 71° | 144°/s | 0.50 | 7° | never | on |
| | grab, backside | 0.62 s | 88° | 65° | 296°/s | 0.37 | 66° | 0.28 s to past 1 s | on |
| | grab, frontside | 0.58 s | 81° | 74° | 248°/s | 0.39 | 42° | 0.70 s to 1.0 s | on |
| 120°, 6.7 m/s | agile Snap | 0.30 s | 72° | 81° | 178°/s | 0.48 | 13° | never | on |
| | grab, backside | 0.62 s | 81° | 58° | 239°/s | 0.42 | 48° | 0.16 s to past 1 s | on |
| | grab, frontside | 0.55 s | 58° | 62° | 189°/s | 0.39 | 24° | 0.42 to 0.63 s | on |
| 120°, 8 m/s | agile Snap | 0.30 s | 48° | 53° | 161°/s | 0.56 | 9° | never | on |
| | grab, backside | 0.65 s | 52° | 33° | 147°/s | 0.54 | 15° | never | on |
| | grab, frontside | 0.57 s | 38° | 70° | 200°/s | 0.51 | 22° | 0.36 to 0.50 s | on |

Flat water (same script): 7 m/s backside 73° by 1.1 s, 204°/s, speed kept 0.44, falls 1.2 s after the launch (agile Snap 65°, 103°/s, 0.63, on for 2 s); 9 m/s backside 55°, 143°/s, 0.61, falls 0.68 s after the launch (agile Snap 38°, 86°/s, 0.70, on for 1.6 s). Frontside 62° and 41°, one fall inside 1.3 s.

### The bars

| Bar | Result | |
|---|---|---|
| falls no more than agile Snap's (0 of 4) | 1 of 4 backside, 1 of 4 frontside (the slowest climb, about 1 s after the launch, the board down to 1.2 to 2 m/s); flat 2 of 2 backside, 1 of 2 frontside | **fail** |
| turn in 0.8 s more than agile Snap's 48 to 87°, against 120° | by stage 1's window (1.1 s after the press): backside 52 to 97°, more on every climb (+4 to +19°); frontside 38 to 97°, more on two, less on two. From its own, later launch: 33 to 74°, less than agile Snap's 53 to 93° on six of eight. Nowhere near 120° | **fail** (backside more than agile Snap only because the rail turn before the launch is longer) |
| peak yaw rate 200 to 300°/s | backside 147 to 296°/s (three of four in the band); frontside 189 to 316°/s | partly met |
| fins pass stall and re-grip within 0.5 s | they pass stall on seven of eight; they re-grip within 0.5 s on the two frontside 120° climbs (0.21 and 0.14 s) and nowhere else: the rest are still past stall 1 s after the launch | **fail** |
| speed kept at 1 s | backside 0.20 to 0.54, frontside 0.38 to 0.51 (agile Snap 0.33 to 0.56) | reported |
| too much pull | the pull cannot pass the grip. At the whole grip (450 N, backside): turns 92, 94, 112, 62° and peaks to 318°/s, but three of four fall, two of them with the board gone from under the feet at 0.03 to 0.23 of the entry speed. It bogs and loses the speed, and then it also throws | not what the owner expects |
| free-body momentum | linear: conserved to 1e-9 through a pull and a launch in the air (a test). Angular (board, rider and the four rotors, about their common centre): **not closed** in the air, 12 kg m²/s adrift after 0.3 s with the hand and 39 without it (stage 1's own: with no load on the feet the rotors still turn, with nothing given to the board) | linear pass, angular **fail** |
| `?agile=on` without the hand button: stage 1 | the four climbs' turns equal stage 1's to the last bit (pinned from main 0e54ef4a) | pass |
| switch off: byte identical | `scriptedRide` hash unchanged | pass |

### The three rounds

1. **The brief's launch (hips 40°, trunk 20°), waiting for the hand, the hand setting off only once in reach** (held 0.7 s after the press): peaks 257 to 353°/s backside and 165 to 262°/s frontside, the fin at 90° on six of eight (the board sideways or backward), falls 3 of 4 backside and 2 of 4 frontside. Smaller launches in the same round (25°/14°, 16°/12°) fell 2 to 3 of 4 too: by 0.7 s on a climb the board is too slow for any launch.
2. **The hand on its way as the body goes down** (held 0.55 to 0.65 s after the press) **and 25°/14°:** 1 of 4 falls each side (the table). 40°/20° again: peaks 195 to 368°/s, falls 3 of 4 backside (all with the board gone) and 2 of 4 frontside.
3. **The lever's pull, backside, at 0, 0.6 and 1.0 of the grip:** turns by 1.1 s of 97, 86, 59, 46° / 97, 88, 81, 52° / 92, 94, 112, 62°; peaks to 271 / 296 / 318°/s; falls 1 / 1 / 3. The lever does set the rail and tighten the turn (the 120° climb at 6.7 m/s: 59° with no pull, 81° at 0.6, 112° at the whole grip), and past 0.6 of the grip it costs the board.

### Reading

- **The hand does what stage 1 lacked, for the first half second.** With 40°/20°, stage 1 lost every rider within 0.7 s of the launch; with the hand holding, nobody is thrown at the launch. The falls now come about a second later, off a board that has stopped.
- **But the board spins out, it does not pivot.** A yaw rate in the band still means the fins far past stall (42 to 90°), and they do not come back: the board has no speed left to re-grip with, because the grab takes 0.55 to 0.65 s to set and a climb gives that time away (2.5 m/s² of slope, plus the rail turn's drag). Stage 1's reading stands: the centre of mass is nailed over the stance, so a tail slide takes the whole rider's path with it.
- **Frontside is the calmer one, as asked,** but for a plain reason: no lever. It re-grips on the 120° climbs and keeps more speed. Backside turns further before the launch and pays for it.
- **The character the owner asked for is half there.** Too much pull does bog the rail and spend the speed; it then also loses the board, which a held rail should make harder, not easier. The hold is bounded by the grip in size, but forces that size fling a board this light.
- **Getting low is the real cost.** Pressed at the same instant as the full stick, the grab is late on a climb; held from before the turn it would not be, but a straight lead on these climbs spends the speed too (both the grab and agile Snap fell with a 0.5 s lead), so that needs a wave, and the owner's ride.

### What is weaker than asked, and not verified

- The drawing has not been seen (no browser run): the physics' hand point is on the rail (a test), and the rig's Snap arms leave it there by a distance rule that has no rig test.
- "Back knee low" is the existing tuck, the same both ways; the back knee is not lower than the front.
- The hold's own moment about the body's line is taken from the solve before (one substep late).
- Angular momentum is not closed in flight (the bars' table); stage 1's rotors have the same gap. A rider with rotors standing in for a body cannot close it while the projection can clip the feet's forces after the rotors took their reaction.
- Goofy is measured only as the frontside mirror (left turns). Moving faces, sessions and rides were not run (by instruction).
- The grip's source is recalled, not re-fetched.

### For stage 2b (the layback)

- `projectGrab` is the pattern for any load-bearing hand: a third contact in the projection that can pull. The water anchor can enter the same way with its own bound (the palm's planing force) in place of the grip.
- The pigdog uses the trailing hand, and so will the layback's plant: one hand, one job. `grabAsked` already switches the water hand off.
- A launch needs speed more than range. The later the launch came on a climb, the more it spun the board out, at any range (16°/12° to 40°/20°). The layback's launch on Snap's release comes later still than the grab's.
- The legs take 0.55 s to come down 0.34 m. Any move that needs the body low first should be reachable from a Snap already held, not start with the press.
- The launch's wait (`stampStep`: armed, full steer, 0.3 s held, and the hand if asked) is the one place the triggers meet; the release trigger can join it there.
- The angular gap in flight will matter more for a body that leaves the stance: the board moving under the centre of mass needs the reaction of a clipped foot force taken back from the rotors.

## The four stages

Triggers (the owner, 2026-11-09): **Snap held with a full stick** is the sharp snap, the body staying low (stage 1; nothing new is attached to Snap's release). **Letting go of Snap with the stick still at full** (at or past 0.8) launches the layback (stage 2): the legs extend, the back leg pushes the board away, the body stretches and lays back, the trailing hand plants; **pressing Snap or Compress again** is its recovery, the front leg pulling the board back under the body, on the player's timing. Letting go with the stick eased stays today's exit (the recentre). **Snap with the hand button (E / LB)** is the rail grab (stage 2, built before the layback).

1. **Two legs (this PR).** The feet's couple, the legs' split, their limits and reactions, Snap's launch and recovery, the drawn legs.
2. **Load-bearing hands.**
   - **(a) On the water, the anchor.** The trailing palm planes: its force is the dynamic pressure x palm area x a planing coefficient, at the hand's point (today `standingHand` only drags). It enters as an external force on the rider with its moment about the centre of mass taken by the swing and trunk rotors, so the body can lay back onto it and push off it. Limits: arm reach (shoulder to palm), shoulder and elbow strength, the palm's area and the water's speed. Sourced later.
   - **(b) On the rail, the grab: built as stage 2a (above), bars not met.** (the owner, 2026-11-09: backside pigdog, the back knee low, the trailing hand pulling up on the outside rail to lever the inside rail in; frontside slob or mute between the feet, holding the board to the feet through a fins-free slide; a low ball in chop and wind). A third body-to-board contact in the limb ledger, at the rail point the hand reaches. Unlike the feet it carries tension: up to the hand's grip strength (about 400 to 500 N one-handed for an adult man, to be sourced), within the arm's reach from a crouch. Its roll moment on the board has its reaction on the body (the bank's row and the swing rotor); its pull lets the feet's couple act with the board unloaded. Same no-hidden-motors rule.
3. **Arms and upper body as balance mass.** The arms as their own rotors (their inertia is the hips rotor's reach today), pushing off the anchor hand.
4. **The same quick legs in ordinary riding.** W/S pressure through the legs' split first and the posture after; unweighting through turns.
