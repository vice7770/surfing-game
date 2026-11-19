# Step 3.5h: the trunk's fold moves the body's mass — rows 1 and 2 of the engine target, built

**One change, behind `?trunk=mass`, with the default path proved identical.** Probe:
`docs/research/new-rider/3.5/trunk.ts`. Test at the skinned pose: `src/scene/rig/trunkMass.test.ts`.

**Every number below is `RIDER=new FELT=deck BODY=two` on one synthetic `FaceWater` bench** (the Canyon-matched face
of PR #223: 1.4 m, 16°, 5.7 m/s, water 2.6 m), **60 paired arms** — 2 stances × 2 crouches × 5 entry speeds ×
3 steers — with one option changed per pair. **6 576 live frames on the default arm and 6 484 on the switched one.**
No sea, no owner's ride, no render: the owner rides the feel.

---

## 0. ⚠️ The footage angle is NOT the acceptance number, and this round does not use one

Row 2 of `engine-target.md` quotes **≥ 60°** and the video-12 read quotes **80°**. **Neither appears anywhere in the
code, the probe or the test, and neither should be quoted as a target again until it has a frame.** Three findings
landed while this was being built and they compound:

1. **It is an image-plane angle, not a rotor angle.** A projected trunk span and a hip rotor's angle are different
   quantities and nobody has reconciled them.
2. **It is ungated.** Video 13 found the trunk angle has an admissibility gate of its own — projected
   shoulder→waistband ÷ head length near 1.6–1.8 — and in **six attempts the two that passed were both vertical
   trunks. No visibly folded frame has ever passed it, in thirteen clips.**
3. **It is not even a lower bound.** Foreshortening can only shrink a *single* angle from vertical under a level
   camera at fixed yaw. **A trunk "span" is the difference of two projected angles**, and video 12's two frames sit
   2.4 s apart inside a turn, so the yaw moved between them — a fixed lean swivelled from facing the lens to side-on
   changes its apparent angle with **zero anatomical flexion.**

> **So after thirteen clips the series has no gated measurement of trunk angular travel anywhere in it.** Not 80°,
> not 60°, not a rate.

**The reason to build these rows is structural and sits in the code, where no camera is involved** (§1). The range
reached is reported below as **a fact about the engine**, with no footage figure beside it.

---

## 1. The defect, stated more narrowly than the brief stated it

The brief said `HumanoidRig.ts:1383–1385` makes the drawn trunk "a function of leg depth". **That is too strong, and
the correction is worth keeping:** the line is affine in `this.blend.depth` *within one stage*, but the stage itself
changes, `tallFollower`/`deepFollower` move `tall` and `deep` as the stages swing, and `?turnTrunk=lean`'s `leanIn`
bends the result. **The drawn trunk can move at a fixed depth today.**

**What it has never had is a channel of its own that is coupled to the body's mass.** Every input to the drawn fold
is a drawn quantity, and **none of them moves `AttachedRider.parts`** — so a convincing crouch sits over mass that
never folded. On the physics side the same gap, from the other end: `StandingBody.hip.angle` is read in three places
(`AttachedRider.ts:4186`, `:5209`, and inside `StandingBody`) and **never moves `this.parts`**, so the centre of
mass, the inertia tensor, the per-part water forces and the drawn body are all computed from an **unfolded** trunk
while the trunk folds.

**That is one defect with two faces, and it is why rows 1 and 2 are one change.**

---

## 2. What was built

**`?trunk=mass`, opt-in, `?rider=new` only** (there is no hip rotor anywhere else), pinned off in online rooms.

**Physics** — `AttachedRider.foldTrunk`, called from `updatePosture` after the posture's own translation:

- the **hip rotor's own parts** — the torso, the head and both arms, which is what `HIP_PITCH_INERTIA`'s 8 kg·m² is a
  model of — turn about the **physical pelvis** (part 0) by `StandingBody.hip.angle`;
- **the axis is local `+x`, and that is `across` by construction.** `this.parts` are coordinates in a frame whose
  rotation into the world is `this.orientation`, and upright `orientation` **is** `bodyFrame` [R, `:5146`] while
  `across` is `X` turned by `bodyFrame` [R, `:5278`]. So local `+x` is the very axis `StandingBody.couple` puts the
  rotor's couple on (`rhs[3..5] -= h · hip.torque · across`) — **in every stance and at every bank, with no frame
  correction, because the bank lives in `bodyFrame` and not in `parts`.**
- **the sign is stated, not inferred.** Right-handed about `+x` takes `+y` to `+z`, and `+z` is the heading, so a
  **positive** `hip.angle` pitches the trunk toward the **nose** — the sense `hip.angle` is written in (`pitchOf` is
  `atan2(local.z, local.y)`, forward +) and the sense that pairs: the same positive torque subtracts from `rhs[8]`,
  pushing the rest of the body **aft** along `forward`.
- **`postureRate` is deliberately left at 0.** The fold's own centre-of-mass motion arrives through the pair; feeding
  it to `this.drive` would be a hidden kinematic motor.

**Drawing** — `HumanoidRig.hinge`: standing, `wanted = 0` and `physicsTrunk` stands `poseHinge`'s `backForMass`
down. The rig already builds `up` from `points[torso] − points[pelvis]` (`:905–907`) and `chestUp` from
`points[head] − points[torso]` (`:1071–1073`), so **the folded trunk arrives in the drawing with no new plumbing at
all.** `RIG_SWITCHES.trunk` is read **off the effective config, not off the URL**, because an online room's
`overrides` clear `rider` and `trunk`: taken from the address, joining a room from `?rider=new&trunk=mass` would have
stood the drawn hinge down on riders whose physics had no fold — the exact disagreement this change removes.

**Geometry, not force.** No torque, no drive, no constant, no new quantity. The rotor's torque was already paired
(`standingBody.ts:379–384`) and its power already booked (`:5076–5078`).

---

## 3. The numbers

### 3.1 Row 1 — the mass model's trunk against the rotor's own angle

| column | default arm | `?trunk=mass` |
|---|---|---|
| `foldGap` — the fold the parts carry against `trunkFold`, the angle they were folded by | **0.000000°** | **0.000000°** |
| `lagGap` — the same against `hip.angle` read at the **end of the frame**, one substep later | **up to 55.07°** | **up to 0.30°** |
| `comMoved` — how far the fold has moved the body's centre of mass, m | **0.0000** | **0.0043–0.1067** |

`foldGap` is an identity and is exactly 0 on both. **`lagGap` is row 1's finding:** on the default path the trunk the
mass model carries differs from the rotor's angle by **the rotor's whole angle, up to 55.07°**, because `parts` never
folds at all. With the switch it is **0.30°**, and that residue is **sampling lag, not disagreement**: `foldTrunk`
runs inside `updatePosture`, which `prepare()` calls **before** `preparePitch` advances the rotor, so the parts carry
the rotor's angle as of the previous substep. **Compare matching time levels or this column reads as a fault.**

**The mass really moves: up to 0.107 m of centre-of-mass travel**, which is `engine-target.md` row 1's "of order
0.1 m" inference, now measured.

### 3.2 ⚠️ The acceptance check that was thrown away, and the one that replaced it

The first version of this probe differenced two centres of mass after re-applying its own rotation to `parts`.
**That number is zero by construction at matched angles, however wrong the part set, the pivot or the axis.** A
metric that reads correct whatever the code does is not evidence, and it is the error family that has cost this track
the most. It was deleted.

`foldCheck` replaced it: the reference is the **neutral posture** (`riderPose(shape, 'standing', stance).parts`,
which the probe builds and never touches), the comparison is **per part**, the torso and the head are checked **in
the world** off `renderPoint` with the drawn swing undone, and the axis is taken as `X · rider.orientation` — a
different route from the implementation's local `+x`. The pelvis's own height and both legs whole must be **the
neutral ones**, so a pelvis moved twice shows up.

| | real check | wrong **pivot** (the torso) | wrong **axis** (the body's forward) | wrong **sign** |
|---|---|---|---|---|
| `errWorld`, m | **0.000000** | **0.270000** | **0.499539** | **0.706455** |

`errArms` and `errStill` are **0.000000 m** on all 60 arms. **Regular and goofy agree on every column of every arm,
to the last bit** — standing, every part of the posture sits on the stringer and the goofy mirror only swaps parts
across it.

### 3.3 Rows 2 and 3 — the capability, which is what these rows actually ask for

**The rotor is inert on 42 of 60 arms.** It moved more than 0.5° on **18 of 60**, and those are the only arms where
the switch can do anything: the rotor's drive is the share of the pitch ankle's own torque asking past
`HIP_PITCH_SHARE = 0.8` of the feet's reach, and on gentler entries that is 0. **On the 18 active arms:**

| | default arm | `?trunk=mass` |
|---|---|---|
| trunk travel over the run (the fold on the legs) | **0.00°, every arm** | **1.57–60.21°**, upper middle **12.77°** |
| trunk travel while the **drawn pelvis** holds within 2 mm | **0.00°** | **0.05–5.35°**, upper middle **2.02°**, > 0 on **18 of 18** |
| trunk travel while the **leg spring's own compression** holds within 2 mm | **0.00°** | **0.05–4.49°**, upper middle **1.21°**, > 0 on **18 of 18** |
| **row 3** — frames where the trunk and the drawn depth move in **opposite** directions | **no moving frames at all** (the channel is identically 0 on 54 of 60 arms; 6 fell inside 0.5 s) | **754 of 1 734 moving frames, 43.5 %**, on 18 of 60 arms |

> **Row 3's answer is yes.** It was **impossible** — the mass model's trunk has a span of exactly 0.00° in 6 576 live
> frames — and it is now possible. **`qt(v, 0.5)` is the upper middle element, not a plain median, and "upper middle"
> says so every time it is used.**
>
> **And the footage does not ask for it often.** Across clips 11, 12 and 13 there are **18 resolved transitions,
> three riders, and not one instance** of the two channels moving in opposite directions. The ask is that the engine
> not make it impossible.

### 3.4 Does it fall sooner? Mixed, and ride time is not the metric

**60 of 60 fell on both arms**, as they have for twenty-eight rounds. Over the 60 paired arms the time to the fall
is **unchanged on 46, shorter on 10, longer on 4**, range **−0.817 s to +0.500 s**, **upper middle 0.000 s**. The
longest ride in the sweep got **longer** (5.733 → 6.233 s) and the worst single loss was 0.817 s. **One synthetic
bench; no direction.** Ruling F rejects survival and ride time as this work's metric, and they are reported here only
because the brief asked whether the change makes things worse.

### 3.5 The drawing, read at the skinned pose

The probe above reads `parts` and the points the rig is handed. **Neither is the drawn body** — they stop upstream of
the bones — so `src/scene/rig/trunkMass.test.ts` runs the real rig (`createTestHumanoid` + `PosedBody`) and reads
`StanceGauge.joints()`, the posed bones' world positions. The physics is not involved: one standing state is taken
from the default rider and a second is made by folding **only** its torso and head points about its pelvis.

- **The drawn trunk follows the fold**, monotonically, at 0.3–1.2× of it (the rig lerps `up` into `chestUp`, so it is
  not 1:1).
- **The rig's own pelvis shift is gone: 0.0729 m** at the skinned hips on a plain trim — `backForMass` plus the
  drop-to-reach the shifted hips then need. That is the second owner, removed. **The guarantee is the guard, not a
  timing bound:** `physicsTrunk` holds for every standing frame, carried-in angle or not, so exactly one owner
  applies the pelvis translation, and two compensations that cannot both be applied cannot stack however long any
  blend takes.
- ⚠️ **The visual cost, measured: the drawn trunk is 17.34° from vertical with the switch off and 6.18° with it on,
  at zero physics fold.** The rig's pose-table hinge is real and the switch gives it up. **Under `?trunk=mass` the
  rider stands straighter than today unless the rotor fires — and §3.3 says it fires on 18 of 60 arms.** This is the
  honest trade and the owner's eye settles it.

---

## 4. ⚠️ Refutations and limits — the part worth more than the rest

1. **The brief's own justification was too strong** (§1). The drawn trunk is not a pure function of leg depth; the
   defect is the missing mass-coupled channel.
2. **The footage number is not a target, not a lower bound, and does not exist in a known frame** (§0).
3. **The first acceptance metric was a tautology and was deleted** (§3.2). Three negative controls now prove the
   replacement is sensitive.
4. **The rotor is inert on 42 of 60 arms.** Rows 1–3 are unblocked, but **what makes the fold happen is the ankle's
   excess past 0.8 of the feet's reach, and on gentle water that is 0.** Making the fold *possible* and making it
   *appear* are different questions, and only the first is done.
5. ⭐ **A new coupling, found by the skinned test and pinned rather than fixed.** `HumanoidRig` builds `this.up` as
   `points[torso] − points[pelvis]` and uses it for **two** things: the trunk's direction, and the axis the drawn
   hips are lifted along above the physics' pelvis (`standingLift`). Once the physics folds the trunk those stop
   being the same vector, so **the drawn hips travel about 55 mm per radian of fold — 0.0530 m at 0.9 rad.** It is
   **not** introduced by standing the rig's hinge down (0.0499 m with the switch off, within 3 mm): it arrives with
   the physics folding the points at all, which is row 1 itself. It has **one owner**, so it is not the
   double-pelvis hazard. **What the drawn hips' lift axis ought to be, once the trunk is a channel of its own, is a
   rig question for the owner's eye and is left open.**
6. **No claim is made about drag or work, and here is why.** `waterForces` samples the water at the **folded** part
   position but computes only the rigid-body velocity `v + ω × offset` — it has **neither the relative hinge motion
   nor the local-centre-of-mass recentre term**. So what the fold does to drag or to the energy ledger **cannot be
   said from this code as it stands**, and nothing here says it.
7. **Nothing was added to make the fold behave.** No torque, no drive, no constant. If it turns out to need any, that
   is a finding and a separate decision for the owner.
8. **One bench.** `FaceWater` writes `breaking: 0, voidFraction: 0` and no foam, so none of §3 has seen a real sea.

---

## 5. The default path, proved rather than claimed

**The probe, bundled from the merge base (`1a29a6c7`) and from this branch, run on the identical bench with the
switch off, printed identical rows on every column:**

| arm | runs | result |
|---|---|---|
| `RIDER=new` (the switch's own rider, switch off) | **60** | **identical** |
| `RIDER=old` (the **shipped** rider) | **60** | **identical** |

On the drawing side `RIG_SWITCHES.trunk` is undefined by default, so `physicsTrunk` is always false, `wanted` is
untouched and `back` is `backForMass` as before; the first case of `trunkMass.test.ts` pins the default's determinism
and that its drawn trunk is real.

**The Canyon byte check does not apply and is skipped, as the brief allows.** `config.trunk` reaches exactly one
place: `new RideSession({...})` inside `SurfZoneRunner`, created only when `options.rider` is set, and from there
only `AttachedRiderOptions`. It never reaches the solver, the grid, the spin-up or the water, and the coupling is
one-way — the riders read the water and never push it. **The change cannot reach the sea.**

---

## 6. What the owner can ride

```
?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&trunk=mass
```

Their own address with the one option added. **The shot to look for is the trunk folding while the legs hold still**
— §3.3 says it is reachable now and was not before — and **the thing to judge against today is that the rider stands
straighter in plain trim** (§3.5): the drawn fold is now the physical one, and in trim the physical one is small.
Riding `?rider=new` without `&trunk=mass` is the unchanged comparison.
