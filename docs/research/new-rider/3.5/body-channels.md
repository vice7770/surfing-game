# The body's channels, checked against the code: does the game have one number for the body, or four?

**A read-only survey round.** No `src/` or `server/` file was changed, nothing was built, nothing was ridden, and no
constant is proposed. Every row below is a reading of `main` at `e8e5ef1e`. Marks: **[R]** read directly in the file
cited, **[I]** an inference of mine with the model stated.

The claim under test, asserted from the video documents and quoted in eight briefs since:

> *"The game has ONE number for the body (leg depth) where the footage has at least FOUR."*

**The claim is wrong in both directions, and the way it is wrong is the useful part.** The game has more than one
number — it has six that answer to the five channels — and almost none of them is *independently driven*. The
footage's four channels are not four missing features; they are **three disconnections and one genuine absence.**

---

## 0. The table, first

| # | Channel | Does a quantity exist? | Independent, or slaved to leg depth? | Can the player reach it? | Does physics see it, or only the drawing? | **Geometry or force to fix?** |
|---|---|---|---|---|---|---|
| **1** | **Leg depth** | **Yes** — `leg.rest` (commanded) / `leg.extension` (achieved), m. **One scalar for both legs.** | It *is* the independent variable; everything else is keyed off it | **Yes** — crouch key, Compress, Snap, the deepen button | **Physics**, fully: a real spring in the board's N×N solve, and the key to four inertia tables | — |
| **2** | **Trunk fold** (sagittal, from vertical) | **Three separate things, none of them one trunk fold.** Default rider: **no quantity at all.** `?rider=new`: `StandingBody.hip.angle`. Drawing: `HumanoidRig.hingeAngle` | **Drawing: SLAVED, explicitly** — `hinge = tall + (deep − tall) × depth`, a straight line in leg depth. **`?rider=new`: the angle is independent, the RANGE is slaved** (`hipRange(depth)`) | **No.** Only through leg depth and through which stage the stage reader picks | **Split.** The new rider's hip makes a **paired torque** the board feels — but **the mass model never folds**, so the body's CoM, inertia and pendulum length are all read as if the trunk were upright. The drawn hinge is drawing only | **Geometry** for the cheap fix (unslave the drawn hinge; move `parts` with `hip.angle`). **Force** only if the player is to command it |
| **3** | **Arm carriage** (height, spread) | **Yes, one scalar** — `HumanBalance.arms`, 0–1, `?rider=new` only. No height, no spread, no left/right | **SLAVED twice:** its cap is `stanceRoom(depth).arms`, and its trigger is the *same expression* that drops the knees | **Only on/off, and indirectly:** the `hand` input puts one hand in the face, but the game picks which hand | **Physics really** — but as **inertia only** (`swingInertia` 6→10 kg·m², `riderYawInertia` +0.85, `stanceAt.upper` +0.87). Where the arms *are* reaches nothing. Drawing has a rich arm map, driven by stage × depth | **Geometry** for position; the inertia side is already force-honest |
| **4** | **Arm timing** (the arm leads) | **No — and worse than absent: the sign is backwards.** The arms and knees share one trigger, and the knees' time constant is 0.05 s against the arms' 0.15 s | n/a — simultaneous by construction | No | n/a | **Geometry/sequencing**: reordering two existing time constants. Owner should see it, but no new force |
| **5** | **Fore-aft hip axis** | **Yes, but as a rigid translation** — `TRIM_SHIFT = 0.25 m` moves pelvis, torso, head **and both arms together**. A hips-aft/shoulders-forward differential is **not expressible** | Independent of leg depth (W/S is its own axis) | **Yes** — W/S, and the pad trigger | **Physics**, both riders: default moves the mass (kinematically); `?rider=new` routes it through the pitch ankle's rest as a paired force | **Force** — and it is **downstream of channel 2**: a differential needs a trunk joint first |

**And the sub-question that was asked separately: one leg spring, or two?** **One.**
`readonly leg = { extension, rate, rest, force, height }` — `src/physics/AttachedRider.ts:2084` [R]. One rest length,
one stiffness, one damping, one row (index 6) in the board's solve. Video 8 measured the two legs 10–12 points apart
in the same frame (97/86 at t = 14.40, 88/76 at t = 13.30). **That is not expressible, and a second spring is a force
change, so it is the owner's ruling, not a cheap fix.** The *drawing* already has two legs, with separate targets
(`kneeFront` 115–150° against `kneeRear` 110–145° in Trim, `src/scene/rig/stanceMap.ts:423–424` [R]) — they come out
different only because the two feet sit at different places on the deck and the IK solves each from the one pelvis
point.

---

## 1. What the physics body actually is, in one paragraph, because everything else follows from it

The physics rider is **seven point masses** — pelvis, torso, head, two arms, two legs, 20/23/5/5/5/7.5/7.5 kg of 73 —
placed at **fixed heights above the deck in a single hard-coded standing posture** (`src/physics/riderPosture.ts:93–102`
[R]; the file's own comment at :83–87 says these heights *"are illustrative, not measured"*). Standing, the whole set
is moved by exactly **two** things:

1. **one scalar vertical shift**, the leg's extension (`AttachedRider.ts:2709`, `fromParts[i*3+1] += this.leg.extension`
   on the way out of standing; the standing CoM is `postureCenter(this.parts, …)` at :5519) [R];
2. **one rigid horizontal translation** of five of the seven parts — `parts[i*3] += balance.x + lean.x + armsGive`,
   `parts[i*3+2] += balance.z + lean.z`, applied to every part for which `shifts(i)` is true, and
   `shifts()` excludes **only the two legs** while upright (`AttachedRider.ts:5514–5518`, `5544–5546`) [R].

**Nothing else moves the mass.** No part is ever rotated about another. So in the physics' own mass model the body has
**one posture, two offsets, and no joints at all** — which is why `stance-frame.md` §1 could say *"our physics body is
a point mass on one spring leg and has no knee at all"* and be exactly right.

That is the frame to hold while reading everything below: **every channel that "exists" below exists as a torque, an
inertia, or a drawn bone — never as a change in where the mass is.**

### 1.1 The frame conversion, so no number here is in the wrong units

Named, because this track has mis-framed twenty-five numbers and three of its own documents compared a video hip
fraction against a centre-of-mass height:

- **`riderPosture.ts:100`'s 0.78 m** is the **pelvis part's placed height above the deck**, standing. [R]
- **`STANCE_TABLE`'s 0.84 / 0.65 / 0.55** (`predictiveBalance.ts:554–558`) are the **whole body's centre of mass above
  the feet** — the inverted pendulum's length. [R] A different quantity, parallel to the pelvis and 0.06–0.07 m above it.
- **`leg.rest`'s 0 / 0.195 / 0.30 / 0.45** are the **leg spring's rest-length shortening**. [R]
- **`kneeStrength(d) = 2·KNEE_TORQUE / d`** (`standingBody.ts:113–117`) is a **force**, N — the most the two knees may
  push along the leg at a hip–ankle distance `d`. **It is not a depth limit** and must not be read as one. [R]
- **`stanceRoom().kneeTravel`** is a **length**, m — the knees' travel left. `hipRange` is an **angle**, rad. `arms` is
  **dimensionless**, 0–1. All three are functions of one argument: `depth`. [R]

The footage's leg-chain fraction has already been converted into the game's units, with the denominator argued rather
than assumed: **`stance-frame.md` §3** puts the game's Tall at **89 %** of its own straight leg (0.88 m), Crouch at
**66 %**, Compress at **55 %**, the tuck at **38 %**. I take those as given and do not re-derive them. Read against
video 8's readable population — **6 of 6 frames between 76 % and 99 %** (`video-ref-8-malibu-montage.md` §0.5) — only
the game's **Tall** rung is inside the clip's band at all, and **every other rung in the game is below every readable
frame in it.** [I, the model being §3's calibration]

---

## 2. Channel 2, the trunk fold, in full — this is the round's centre

The footage's claim is specific: video 8's legs moved 23 points while its trunk swung **~17° → ~76° from vertical**,
and its deepest-*looking* frame was **95 % leg under a 76° trunk** (§0.2). Video 7 found **three of four "crouches"
were 75–85 % leg with the depth in the trunk** (§0.4), and that coming out of a tube **the legs lead the trunk by
about half a second** — *"for roughly 0.5 s she is standing on nearly-extended legs with a trunk still folded 50–60°
forward"* (§0.3). That last sentence is a statement that the two channels have **independent clocks**.

The game holds three different things under this heading. They are not variants of one quantity.

### 2.1 The default rider: there is no trunk-fold quantity

`StandingBody` is reached only through `AttachedRider.freeBody`, and `freeBody` is
`this.newRider && this.upright && this.phase === 'standing'` (`AttachedRider.ts:2610–2612`) [R]. **`newRider` is the
`?rider=new` opt-in**, merged as PR #314 and off by default. On the shipped rider there is **no hip angle, no trunk
angle and no fold** in the physics — only §1's one shift and one translation. The trunk is rigid with the pelvis, the
head and both arms.

**So on what the owner actually rides, the four-channel claim's strongest form is right:** the physics body has one
number.

### 2.2 `?rider=new`: a real trunk rotor, independently driven, whose range is slaved — and which the mass model cannot see

`StandingBody.hip` (`standingBody.ts:158`, stepped in `hipStep` at :294–311) [R] is the trunk, head and arms as a
rotor about the hips' pitch axis:

- inertia `HIP_PITCH_INERTIA = 8` kg·m², torque `HIP_PITCH_TORQUE = 200` N·m (:93–94);
- **driven independently of leg depth**: by `excess`, the share of the *ankle's own torque* that asks past
  `HIP_PITCH_SHARE = 0.8` of the feet's reach to the toe or heel (`standingBody.ts:274–275`), sensed through the same
  `PITCH_DELAY = 0.1 s` and `PITCH_MOTOR_LAG = 0.05 s` as the ankle. **This is a second clock, and it is the thing
  video 7 §0.3 says a body must have.** [R]
- **its range is slaved**: `hipRange(depth)` — 1.2 rad at depth 0, 0.8 at 0.195, 0.4 at 0.30, floored at 0.3 beyond
  (`standingBody.ts:98–103`), and the angle is hard-clamped to it at :307–310. [R] `?stanceReach=keep` (the owner's ruling of
  2026-11-16) pins the range at the tall stance's 1.2 rad whatever the depth (`humanBalance.ts:164–167`). [R]
- **physics sees the torque, and it is paired**: `rhs[8] += … − h·(torque + hip.torque)/length` pushes the body along
  its forward axis, and `rhs[3..5] -= h·hip.torque·across` puts the couple on the board — the trunk outside the solve
  takes the opposite (`standingBody.ts:379–384`, with a comment saying exactly that). [R] Its power is booked at
  `AttachedRider.ts:5076–5078`. **No hidden motor here.**

**And here is the disconnection.** `standingBody.hip.angle` is read in exactly three places (`AttachedRider.ts:4186`,
`5209`, and inside `StandingBody` itself) — as the knee strategy's trigger and as the fall test's remaining-range
credit. [R] **It never moves `this.parts`.** So when the new rider's trunk folds 60°, the physics still computes its
centre of mass, its frontal inertia (`bodyInertiaAt`), its yaw inertia (`riderYawInertia`) and its pendulum length
(`stanceAt().height`) from the **unfolded** posture. A 23 kg torso and a 5 kg head swinging through 60° about a hip
0.78 m up moves the body's CoM by order 0.1 m, and the model does not know. [I, the model being §1's `parts` pipeline
plus the part masses at `riderPosture.ts:10`]

**That is the cheapest honest thing this survey found.** Making `parts` rotate with `hip.angle` adds no force and no
constant — it only states where the mass already is, for a torque that is already paired. It is **geometry**, and the
owner's "no hidden motors" rule is not in play, because it removes an inconsistency rather than adding a drive.

### 2.3 The drawing: the trunk fold is leg depth, by a one-line formula

This is the finding that explains "every stance reads as a pose", and it is explicit in the code, not inferred.

`HumanoidRig.hinge()` (`src/scene/rig/HumanoidRig.ts:1378–1389`) [R]:

```
const tall = this.tallFollower.follow(this.pose.hinge.tall, state.clock);
const deep = this.deepFollower.follow(this.pose.hinge.deep, state.clock);
let wanted = ((tall + (deep - tall) * depth) * Math.PI) / 180;
```

`depth` is `this.blend.depth`, and `stanceBlend()` sets it to
`(STANDING_PELVIS − pelvisOverDeck(state)) / CROUCH_DEPTH` (`src/scene/rig/stanceBlend.ts:75`) [R] — **the drawn leg
depth, nothing else.** `hinge.tall` / `hinge.deep` are per-key-pose constants in `stagePoses.ts`, thirteen poses in all
(`STAGE_POSES`, :394): trim frontside **16 → 50°** (:155), trim backside **44 → 50°** (:189), the drop **21 → 44°**
(:205), the bottom turn frontside **30 → 40°** (:229) and backside **30 → 30°** (:248), the top turn frontside
**22 → 40°** (:269) and backside **26 → 44°** (:283), the cutback **20 → 42°** / **24 → 44°** (:300, :311), the tube
**30 → 45°** / **34 → 56°** (:328, :346), the landing **21 → 40°** (:384). [R] (There is no Snap pose of its own —
Snap draws from the top-turn and tube poses.)

**So within one stage, the drawn trunk fold is an affine function of the drawn leg depth and cannot differ from it.**
The only second input is **which key pose** is active, chosen by the stage reader from physics state. Video 8's
headline — *"one channel moves by 23 points; the other by 60 degrees"* — is precisely the behaviour this formula
forbids: at the backside bottom turn the drawn trunk cannot move at all with depth (30 → 30°), and at trim frontside
23 points of leg buys 23 % of 34°, about **8°** — against the footage's **60°**.

Two mitigations exist and are both opt-in and drawn-only: `?turnTrunk=lean` makes the hinge come down toward
`RIG_DETAIL.turnBody.hinge = 12°` by the turn's weight and keeps the drawn trunk within 10° of the **physics' lean
line** (`HumanoidRig.ts:1386–1389`, `RIG_DETAIL.turnBody` at :415) [R] — the one place a drawn trunk angle is read
from a physics quantity other than depth. And `hingeRate = 4` rad/s plus `trunkFollow.hingeSwing = 5` give the hinge
its own smoothing, which is a lag, not a clock.

### 2.4 `?agile=on`'s trunk: a paired pitch rotor, but ±10° and only inside a stamp

`AttachedRider`'s own `this.trunk` (stepped at :4046–4053) [R] is a second trunk-pitch rotor: `TRUNK_INERTIA = 8`
kg·m², `TRUNK_TORQUE = 150` N·m, `TRUNK_RANGE = 10°` (:991–993). It is paired honestly — its reaction **splits the two
feet's loads** (`front = load × (share − trunkTorque/(span·load))`, :4056) and nothing unmet is added. But:

- it only moves while a Snap **stamp launch** is running (`launching`, :4029–4032);
- it is drawn by `turned()` (:3071–3077), which — like `swung()` — rotates **drawn** points about the pelvis and
  **leaves `this.parts` alone**;
- **its range is 10°** against the footage's 60°, and the range is deliberate: the file records that *"the hips' 40°
  with the trunk's 20° reached 219–309°/s and threw every rider"* (:984–986). [R]

### 2.5 The lateral trunk swing is not this channel, and should not be mistaken for it

`AttachedRider.swing` (`:2319`, `SWING_RANGE = 1.2` rad, `SWING_TORQUE = 200` N·m, `SWING_INERTIA = 10` kg·m²,
:520–523) [R] is the trunk's **roll** about the forward axis — the body leaning across the board. It exists on both
riders, is driven by what the balance asks past the feet's reach (`SWING_SERIES`), is paired, and is **drawn at only
`SWING_DRAWN_CHEST = 0.35` of its angle** (:828, :3004, :3033). [R] It does not fold the trunk forward and cannot
produce video 8's silhouette.

---

## 3. Channel 3, the arms: one number, and it is the knees' number

`HumanBalance.arms` (`humanBalance.ts:306`) is the only arm quantity in the physics, and it exists on `?rider=new`
only. It is set in one place, `strategies()` (`humanBalance.ts:423–431`) [R]:

```
const hip     = … (|hipAngle| / room.hipRange − KNEE_SHARE) / (1 − KNEE_SHARE) …
const capture = … this.sensedCapturePast / KNEE_PAST_FULL …
const asked = room.kneeTravel > 0 ? Math.max(hip, capture) : 0;
this.knees += (asked − this.knees) * (1 − exp(−h / (asked > this.knees ? MOTOR_LAG : KNEE_RETURN_TIME)));
const arms = Math.max(hip, capture) > 0 ? room.arms : 0;
this.arms  += (arms − this.arms) * (1 − exp(−h / ARMS_TIME));
```

**The arms and the knees are driven by the same expression, `Math.max(hip, capture)`.** The arms are then gated by
`room.arms = stanceRoom(depth).arms`, which is 1 up to depth 0.195, falls linearly to 0 at 0.30, and is 0 beyond
(`humanBalance.ts:159–163`) [R] — unless `?stanceReach=keep`, which pins it at 1. So:

- **slaved to leg depth** through the cap, and
- **slaved to the knees** through the trigger.

What physics sees is real, and it is an **inertia, not a position**: `swingInertia` goes 6 → 10 kg·m²
(`humanBalance.ts:434–436`), `riderYawInertia` gains `RIDER_YAW_ARMS_OUT = 0.85` kg·m² (:71, :86), and the twist
rotor's upper share gains `TWIST_BODY_ARMS = 0.87` (`AttachedRider.ts:4604`). [R] `stanceRoom`'s own note says it
plainly: *"the arms are a rotor, not a decoration."* **But there is no arm position anywhere in the physics**, so
video 7's four distinct carriages inside one stance band have nothing to map onto.

**The one arm position the player can reach** is the hand in the face: the `hand` input sets `handSide`, the upper body
bends `HAND_BEND = 0.5` of the full lean that way, and the hand gets a real flat-plate drag (C_dA = 1.1 × 0.013 m²,
Berger et al. 1995) whose moment turns the board through the feet (`AttachedRider.ts:1187–1200`, `4296`, `4325–4344`,
`5638`). [R] It is **on/off**, and **the game chooses which hand** — `handSide` comes from the bank's sign or from
which side the water stands higher (`:5720–5732`). [R]

On the drawing side the arms are genuinely rich — `stanceMap`'s `leadArm` / `trailArm` bands per stance with cited
sources, `snapArms`, and `ArmSwing` as a passive mass-damper driven by the shoulder's own velocity
(`src/scene/rig/armSwing.ts:68–75`). [R] All of it is selected by **stage × depth × turn**; none of it is a channel a
player or a force can address.

---

## 4. Channel 4, arm timing: absent, and the one orderable pair runs the wrong way round

Video 8 §0.3: in **3 of the 4 readable direction changes** the rear arm is above the head *before or at* the start of
the leg extension and **stays up through the manoeuvre** — at t = 5.20 *"the body is still at its lowest in the bottom
turn … and the rear arm is already above the shoulder."*

The game has no arm pose to lead with, so strictly this channel does not exist. But the one place the game *does*
order the arms against the legs, it orders them backwards:

| | time constant | source |
|---|---|---|
| knees going **down** | `MOTOR_LAG` = **0.05 s** | `humanBalance.ts:29`, :428 [R] |
| knees coming **back** | `KNEE_RETURN_TIME` = **0.6 s** | :91, :428 [R] |
| arms, **both ways** | `ARMS_TIME` = **0.15 s** | :89, :430 [R] |

**The knees reach their drop three times faster than the arms reach their spread, and the arms come back four times
faster than the knees.** The footage has the arm first and *held*. This is one of the few findings here that is a
pure sequencing change: re-ordering two existing constants, no new force, no new constant. The owner should still see
it, because it changes what a rider does.

---

## 5. Channel 5, the fore-aft hip axis: it exists, but hips and shoulders are welded together

Video 7 §0.2 and §5: the hips travel **aft while the shoulders go forward**, the feet planted, **0 steps in 13 s**,
confirmed on three riders.

**The feet part the game gets right and it is worth saying so.** Standing, the feet are at fixed deck positions —
rear 0.30 m from the tail, front 0.63 m ahead of it (`riderPosture.ts:59–62`, the measured pop-up spacing from
Borgonovo-Santos et al. 2021) — and nothing moves them while upright (`AttachedRider.ts:3035–3038`). [R] **Zero steps,
by construction.**

The hip axis itself exists in two forms:

1. **Default rider — a rigid translation.** `TRIM_SHIFT = 0.25 m` (`:858`), driven by W/S through
   `leanAxis('z', level, h)` at `:5639–5646`, lands in `lean.z`, which `:5517` adds to **every part for which
   `shifts(i)` is true — pelvis, torso, head and both arms, together.** [R] The CoM moves, so the pitching moment on
   the board changes and the physics does see it; but **the hips and the shoulders translate by the same 0.25 m in the
   same direction.** Video 7's differential is not expressible.
2. **`?rider=new` — a force, and no translation at all.** `trim = free ? 0 : …` at `:5642`, with the comment *"The new
   surfer: no shift along the board (the trim is the pitch ankle's rest)."* [R] Instead `copTarget.z` carries W/S
   (`TRIM_PRESSURE = 0.2`, so full W holds 0.60 of the load on the front foot, full S 0.40; `:324`, `:5561–5562`), and
   `StandingBody.prepare` turns it into the ankle's reference lean, `offset = asin(cop / length)` (`standingBody.ts:253`),
   which is a torque with its reaction. [R] **Honest, and one channel, not two.**

**The one place the game separates hips from shoulders** is `STAMP_BACK` under Snap: `trim = level·(1 − snap) −
snap·stamp·STAMP_BACK` (`:5642`), the upper body asked back past hips the pressure has already put over the tail
(`:940–957`, `snapStamp: 'on'`, opt-in). [R] It is a prescribed lean target, not a joint — so it is one rung above the
rigid translation and still not a trunk channel.

**Fixing this properly is a force, and it is downstream of channel 2**: hips-aft-while-shoulders-forward is a hip
*joint*, so §2's trunk fold has to exist in the mass model before this can mean anything.

---

## 6. What the fix would cost, per channel, so the owner knows what needs a ruling

The owner's hardest rule bounds all of this: **motion only from visible limbs, every force paired with its reaction; a
kinematic prescription realised by whatever force it takes is a cheat.** The retired `uprightVelocity` was one, and
3.2y retired its benchmark, so nothing here may be measured against the old rider's "0 of 12".

| Channel | Cheapest honest change | Geometry or force | Needs the owner's ruling? |
|---|---|---|---|
| 2, trunk fold — **mass model** | Rotate the upper `parts` about the pelvis by `standingBody.hip.angle` | **Geometry.** It adds no force; it states where the mass already is, for a torque already paired and already booked | **No** — it removes an inconsistency |
| 2, trunk fold — **drawing** | Give `hinge` a second input that is not `depth` (the new rider's `hip.angle` is sitting there unread; `?turnTrunk=lean` already reads the lean line) | **Geometry**, drawing only | **No**, but it is visible, so show it |
| 2, trunk fold — **default rider** | A hip rotor like `StandingBody`'s, on the shipped rider | **Force** | **Yes** |
| 3, arm carriage | Unslave `arms` from the knees' trigger; give it a position the drawing reads | **Geometry** for the position; the inertia path is already force-honest | **No** for the drawn position; **Yes** if the arms are to move the board by more than their inertia |
| 4, arm timing | Re-order `ARMS_TIME` against `MOTOR_LAG` so the arms lead and hold | **Neither** — two existing time constants | **No**, but behaviour changes, so show it |
| 5, fore-aft differential | Needs channel 2 in the mass model first | **Force** | **Yes**, after 2 |
| **two leg springs** | Split `leg` into a front and a rear spring, each with its own load and reaction at its own foot | **Force** | **Yes** |

---

## 7. What I did not establish, and would not want quoted as settled

- **I did not ride anything and I measured nothing.** Every statement here is a reading of the code and of the two
  video documents. Where a number is a consequence rather than a literal (the CoM error in §2.2, the leg-chain
  comparison in §1.1) it is marked **[I]** with its model.
- **I did not trace the stage reader** that picks which key pose is active, so I cannot say how much *effective*
  independence the drawn trunk fold gets from stage changes. §2.3's claim is bounded correctly — *within one stage*
  the fold is depth — but the across-stage behaviour is unmeasured.
- **I did not check the multiplayer wire.** `riderVisualState.ts` notes that several of these (`steer`, `weight`,
  `snap`, the separation) are local-only, so another player's drawn body reads fewer channels than your own. If any
  channel is ever driven independently, its wire status is a separate question.
- **I did not read `predictiveBalance`'s internal plant** beyond `STANCE_TABLE`, `stanceAt`, `BODY_FRONTAL_SHARE`,
  `STANCE_TUCK` and `bodyInertiaAt`. All four read **one argument, `depth`** [R], which is enough for this survey's
  question, but the predictor may key other things I have not seen.
- **The claim "every stance reads as a pose" is not proven here.** §2.3 gives a mechanism that would produce it and
  shows the formula is real; whether it is *the* cause is an observation the owner has made and I have not measured.
  **One trace is not a number, and one formula is not a cause.**
