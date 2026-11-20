# Step 3.5k — the twist's end stop bounded by the feet's own grip (`?twistGrip=feet`)

**Status:** opt-in dev switch, off by default, pinned off in online rooms. Nothing merged, nothing ridden by the
owner yet. `TWIST_BODY_RANGE` is **not** touched.

---

## 1. The defect, stated once

`src/physics/AttachedRider.ts` gives the rider's torso **one** degree of freedom twisting against the board
(`twistBody`, step 3.2e). **Two** torques act on it. Both cross the **same** foot contact — the two soles on the
deck, the only connection between rider and board. They obey different rules.

The **active** torque, `predictiveBank`:

```ts
const grip = FOOT_FRICTION * Math.max(0, this.legLoad) * TWIST_GRIP_SPAN;
const u = this.predictor.tick(…, { ankle: range, twist: Math.min(TWIST_BODY_TORQUE, grip) }, rail, faceTilt);
…
tb.active += (this.heldTwist - tb.active) * (1 - Math.exp(-h / MOTOR_LAG));
```

Bounded by the grip **and** by the hips' strength, then slewed through the muscles' lag.

The **passive end stop**, `coupleYaw`:

```ts
const over = Math.abs(tb.angle) - TWIST_BODY_RANGE;
const stiffness = this.twistStiffness + (over > 0 ? TWIST_STOP : 0);
const damping   = this.twistDamping   + (over > 0 ? TWIST_STOP_DAMPING : 0);
tb.spring = tb.active + this.twistStiffness * tb.angle + (over > 0 ? TWIST_STOP * Math.sign(tb.angle) * over : 0);
```

Bounded by nothing, lagged by nothing, and it reaches the board's angular rows through the same `kick`.

**It is the only unbounded one of six.** The same file writes `FOOT_FRICTION ×` a load at `predictiveBank` (the active
twist), `twistStep` (the old rotor), `legDriveStep`, `legsStep` and `project`, and the back foot's own note states
the rule with its own record of the alternative:

> an unloaded foot pushes nothing: unbounded, a body weight threw the board from under every rider in 0.2 s.

**Measured** (#455's committed Canyon table, `results/35j/35j-ride-canyon.txt`, 54 rows): not one row has zero ticks
past the stop; peak twist 50.26 / 53.49 / 56.76° (min/median/max) against `TWIST_BODY_RANGE` = 0.87 rad = 49.85°;
median 11.3 % of each ride's ticks past it; the stop's **requested** peak torque 14.5 / 127.3 / 241.4 N·m against the
active bound's 100 N·m, exceeded in **32 of 54**.

⚠️ Those medians are the mean of the two middle values of 54. Taking the **upper** middle instead gives 53.64° and
132.4 N·m, which is where the slightly different pair quoted elsewhere comes from. Everything else — 54 of 54 rows
past the stop, 32 of 54 past 100 N·m, and both extremes — is the same either way, and was recomputed from
`results/35j/35j-ride-canyon.txt` column 7 rather than restated.

---

## 2. `legLoad` is BOTH feet, not one — and that fixes the bound's size

`AttachedRider.ts`:

```ts
this.legLoad = this.mass * Math.max(0, this.specificForce.dot(this.up));
```

`this.mass` is `options.mass ?? REFERENCE_RIDER.mass` — **73 kg, the whole rider** (Shormann & in het Panhuis 2020).
So `legLoad` is the **total** load the body puts along the leg line, through **both** soles. At one body weight it is
`m g` = **716 N**, which is exactly the number `LEAN_IN_RATE`'s own note already uses for the feet's moment
(*"m g d = 716 N × 0.13 m = 93 N·m"*). It is not one leg's load, and there is no second leg's load anywhere in the
class.

So the grip bound is

```
FOOT_FRICTION × legLoad × TWIST_GRIP_SPAN = 0.9 × 716 N × 0.315 m = 203 N·m   at 1 g
```

**and the ~200 N·m estimate is right, but for the wrong reason**: it is 203 N·m for the **pair**, not for "a fully
loaded leg". A single fully loaded leg would give half of it. Measured live on the real Canyon over 108 cells
(§8.1), each run's median bound ran **110.55 / 208.62 / 270.93 N·m** (min / median / max) as the load rises and
falls through a turn — the median sitting on the 203 N·m the arithmetic above gives, which is this reading's own
positive control.

**Is `μ N d` the right couple for two feet?** Yes, and it is self-consistent. Two feet at ±`TWIST_GRIP_SPAN` along the
board, one pushing across the deck one way and the other the other way, make a couple about the deck's normal of
`F_front × span + F_rear × span`. With the load split evenly each foot carries `legLoad / 2` and can push
`μ legLoad / 2`, so the couple is `2 × (μ legLoad / 2) × span = μ × legLoad × span` — the expression in the code,
exactly. One honest looseness: when the load is **not** split evenly the couple is set by the **weaker** foot
(`2 × μ min(F) × span`, which is what the agile-legs note says — *"the couple is at most the feet's span times the
weaker foot's push"*), and that is strictly less than `μ legLoad span`. So the bound as written is the
**even-loading** bound and is generous under a fore-aft weight shift. It is kept as written because it is the
identical expression the active torque already obeys, and this step's whole point is that the two torques obey the
*same* rule.

---

## 3. The two lever arms are two MODELS, not two couples

| constant | value | where | what it is |
|---|---|---|---|
| `TWIST_GRIP_SPAN` | 0.315 m | `predictiveBank`, the new surfer's twist DOF | **half the feet's spacing along the board** — the arm of a two-foot couple |
| `TWIST_GRIP_RADIUS` | 0.15 m | `twistStep`, with `TWIST_TORQUE` = 120 | the **old** rider's upper-body twist rotor (`TWIST_INERTIA`, `TWIST_RANGE`), pre-3.2e |

**They are never both live.** `twistStep` opens with

```ts
if (this.freeBody) {
  this.twistAsked = …;
  this.twistTorque = 0;
  return;
}
```

and `freeBody` is `newRider && upright && phase === 'standing'`. So under `?rider=new` — the rider all of this work is
about — the 0.15 m path sets its torque to **zero** and returns before the bound is ever computed. 0.315 m belongs to
step 3.2e's body degree of freedom; 0.15 m belongs to the rotor 3.2e replaced. **Not an inconsistency on one
contact: two mutually exclusive models.**

That said, the two numbers *do* disagree about the same geometry, and it is worth saying which is which: 0.315 m is a
**couple** arm (two feet, opposite forces, half-stance 0.63 m); 0.15 m reads as a **torsional-friction radius** about
a single foot. A single-foot torsional radius is the more conservative reading, and if the new surfer's twist ever
has to be bounded about **one** planted foot rather than as a couple across two, 0.15 m is the number to reach for.
That is not this step's change.

---

## 4. `TWIST_STOP_DAMPING` is inside the same bound — the argument

**It is inside. Reasons, in order of weight:**

1. **Coulomb bounds the contact, not the constitutive term.** There is no connection between rider and board but the
   two soles. Every torque the twist joint puts on the board — active, spring, damper or stop — is transmitted by the
   same tangential traction at the same contact. A friction bound is a bound on the **total**. A bound that let the
   damper through would not be a friction bound at all: the feet would be allowed to transmit `B + c θ̇`, unbounded
   in `θ̇`.
2. **It is where most of the leak is.** `TWIST_STOP_DAMPING` = 50 N·m·s/rad. At a twist rate of 2 rad/s that is
   100 N·m on its own — the **whole** of the active bound — and a stop is struck hardest exactly when the rate is
   highest. Bounding only the spring term would leave the loudest half of the problem in place.
3. **Dissipative does not mean harmless.** The tempting objection is that a damper can only oppose motion, so it
   cannot "throw the board". It can. The dissipation is in the **joint's** coordinate; the torque on the **board** is
   a real torque that turns it, and `finish`'s own `twistWork` books the board's share both ways. A damper drives the
   board whenever it is the board's turn that is changing.

**The counter-case, honestly:** the damper and the stop are not separable at a real joint, so bounding them together
is also simply the only coherent option — the alternative is to invent a split between "spring traction" and "damper
traction" at one sole, which has no physical referent. There is no residual argument for leaving it out.

**What is NOT inside this bound,** and is named so it is not mistaken for a claim: the **base** joint,
`TWIST_STIFFNESS` = 20 N·m/rad and `TWIST_DAMPING` = 3 N·m·s/rad, is still unbounded, as is the sum of the active
torque and the stop (each is separately bounded by the grip, so the pair can reach twice it). At the stop the base
spring is `20 × 0.87` = 17.4 N·m and the base damper at 3 rad/s is 9 N·m — small beside 203, which is why this step
leaves them and says so rather than quietly widening its scope. The project's own convention across the other five
sites is **per-force**, not a shared budget; a shared budget across active + base + stop would be stricter, would
change the active path's behaviour too, and is a separate question for the peer reviewer.

---

## 5. The torque or the stiffness? — the solver-consistency question, and what was done

**The risk, stated.** `coupleYaw` is an **implicit** solve. The stop's stiffness and damping appear in **two** places:

```ts
const alpha = h * (stiffness * h + damping);      // the SYSTEM MATRIX, via beta = I_U alpha / (I_U + alpha)
tb.spring = tb.active + k θ + stopTerm;           // the RIGHT-HAND SIDE
```

and the torque the joint actually delivers, booked in `finish`, is

```
tb.torque = (I_U (upper_before − upper_after)) / h  =  tb.spring + alpha · θ̇_new / h
```

So **clamping `tb.spring` alone would not clamp the delivered torque.** The matrix would still carry
`TWIST_STOP h + TWIST_STOP_DAMPING` against the new rate, the implicit term would still deliver whatever that
stiffness demands, and `alpha`/`beta` would be describing a joint law the right-hand side no longer applies — the
solve would be internally inconsistent *and* still leaking. Clamping `tb.spring` is the wrong answer to this task.

**What was done instead: a stick/slip projection, which is what a friction contact actually is.**

```ts
const stop = over > 0 ? TWIST_STOP * Math.sign(tb.angle) * over : 0;
const ask  = over > 0 ? stop + (TWIST_STOP * h + TWIST_STOP_DAMPING) * tb.rate : 0;
const bound = FOOT_FRICTION * Math.max(0, this.legLoad) * TWIST_GRIP_SPAN;
const slipping = this.twistGrip === 'feet' && over > 0 && Math.abs(ask) > bound;
const stiffness = this.twistStiffness + (over > 0 && !slipping ? TWIST_STOP : 0);
const damping   = this.twistDamping   + (over > 0 && !slipping ? TWIST_STOP_DAMPING : 0);
const held = slipping ? bound * Math.sign(ask) : stop;
…
tb.spring = tb.active + this.twistStiffness * tb.angle + held;
```

- **Stick** (`|ask| ≤ bound`): nothing changes. `stiffness`, `damping`, `alpha`, `beta` and `tb.spring` are the
  shipped ones, to the bit.
- **Slip** (`|ask| > bound`): the feet are sliding. A sliding Coulomb contact transmits a **constant** torque at the
  limit — it has no stiffness and no damping, because the surfaces are moving relative to one another. So
  `TWIST_STOP` leaves `stiffness`, `TWIST_STOP_DAMPING` leaves `damping`, **and** `tb.spring` carries
  `bound × sign(ask)` as an explicit saturation torque. A constant torque belongs on the right-hand side and nowhere
  else, so `alpha` and `beta` are now exactly the base joint's — which is the law being applied.

**The matrix and the applied law are therefore the same law in both branches.** That is testable to the digit, and
is tested: with `NEW_STANDING_SUBSTEPS` = 16, `h` = 1/960 s, so

| branch | `alpha` must be |
|---|---|
| past the stop, sticking (and every frame off the switch) | `h((20 + 2000)h + 3 + 50)` = 0.0574010… |
| past the stop, slipping | `h(20 h + 3)` = 0.0031467… |

`src/physics/twistGrip.test.ts` asserts both to twelve decimals over a ridden population, and asserts the delivered
`tb.torque` on slipping frames against `bound + min(TWIST_BODY_TORQUE, bound) + (base spring and damper)` — the only
terms that can be in it once the stop has left the matrix.

**The stick test is one explicit Newton step.** `ask` needs `θ̇_new`, which the solve has not produced yet, so it is
taken at the substep's **incoming** rate `tb.rate`, as a semi-implicit friction solver takes it. The **test** is
O(h) in the rate; the **law applied** is exact either way (stick = the shipped law, slip = exactly `bound`). The
measured consequence is reported, not assumed: over every ridden population the delivered `got` was **never** above
`bound` (0 ticks of ~tens of thousands), so the O(h) test did not in practice let a substep through at the wrong
branch. ⚠️ It could in principle, on a substep where the rate reverses hard; the guard against that is the measured
column, and it should be re-read if the substep count ever drops.

**No force is added anywhere.** `held` is either the shipped stop or a *smaller* magnitude; `stiffness` and `damping`
are either the shipped ones or *smaller*. When the stop demands more than the feet hold, the feet slip and the twist
goes — which is what a sole on a wet deck does. There is no new torque, no new authority, and no kinematic
prescription: the switch's whole content is the **removal** of an unpaired force.

---

## 6. The pose — and the rig's own ±45° clamp, which decides the answer

The torso's twist **is** drawn, and the chain is five hops of its own, all of them checked in the source:

```
AttachedRider.drawnTwist  (= twist.angle, = tb.angle for the new surfer; + hip.angle only with the agile legs)
  -> SurfZoneRunner.ts:196      out[RIDER_SNAPSHOT.twist] = session.rider.drawnTwist
  -> riderVisualState.ts:150    out.twist = rider[RIDER_SNAPSHOT.twist]
  -> HumanoidRig.ts:997/1000    chestTurn / hipsTurn
  -> HumanoidRig.ts:2555        the head's look
```

**But the rig clamps it.** `RIG_DETAIL.cascade.twistMost = 45` (degrees):

```ts
const chestTurn = Math.max(-most, Math.min(most, toNose * blend * (cascade.chest * state.yawRate + state.twist)));
const hipsTurn  = Math.max(-most, Math.min(most, toNose * blend * (cascade.hips  * state.yawRate + hipsTwist * state.twist)));
```

`TWIST_BODY_RANGE` is 0.87 rad = **49.85°**. So **the rider's chest and hips are already at the rig's clamp before
the end stop is reached at all**, and every degree of twist past the stop — in either arm — is invisible *in the
chest and the hips*. That is a finding about the shipped rider and not about this switch: the physics routinely
drives 50–60° of twist into a rig that cannot draw the chest past 45°.

**The head is not clamped the same way.** The look at `:2555` takes the whole of `state.twist` and is then held only
within `RIG_DETAIL.neckTurn` = **90°** of the chest's aim, so at 60° or 90° of twist the limit is not reached and the
**gaze turns with all of it**. So the drawn pose does change where the clamp bites — in where the rider is looking,
not in how far the torso is wound.

**The consequence for this step**, stated plainly: the physics quantity moves (see the `drawn` columns in
`results/35k/`), the chest and hips cannot show it past 45°, and the head can. Cells that never reach the stop are
frame-for-frame identical in both arms — asserted in `twistGrip.test.ts`.

---

## 7. What was measured

See `results/35k/`:

| file | what it is |
|---|---|
| `35k-switch-chain.txt` | the search string through all five hops, and the live `AttachedRider.twistStopBounded` of the rider a `RideSession` built |
| `35k-byte-check.txt` | off the switch, 730 lines of a twelve-decimal trace, diffed against the base checkout: **0 differing lines** |
| `35k-ride-fixture.txt` | Canyon B's calibrated face, `AttachedRider` built directly |
| `35k-ride-session.txt` | the same face through `RideSession`, from the owner's own search string |
| `35k-ride-canyon.txt` | **the real Canyon B solver**, his own address, 4 seeds × 3 trials × 3 stances × 3 steers per arm |

The ledger every one of them reads, `AttachedRider.twistStopLedger`, is written on **every coupled substep of both
arms**, so an unmoved number is evidence: `ask` (the stop's **requested** torque), `got` (**delivered**), `bound`,
the slip count, and `peakTorque` (the **whole** joint torque the solve delivered, booked in `finish`). Off the switch
`got` is `ask` by construction and `slips` is 0 — both asserted as negative controls on every run, in every mode.

⚠️ **What `ask` and `got` are exactly, and where they are estimates.** `ask` is the stop's demand evaluated at the
substep's **incoming** rate, so in the **slip** branch `got` = `bound` is exact (a constant torque is applied
exactly), while in the **stick** branch — and on every substep off the switch — `got` = `|ask|` is the stop's demand
at the incoming rate and is therefore an O(h) estimate of the stop's share of the delivered torque, because the
implicit term resolves against the **new** rate. The exactly-known quantity is `peakTorque`, the whole joint torque,
which is read off `tb.torque` after the solve. Both are reported. Nothing in the physics depends on `ask` except the
stick/slip test itself.

⚠️ **A per-frame read catches one substep in 16** (`NEW_STANDING_SUBSTEPS`). The `peak*` fields run over every
coupled substep and are the headline numbers; the per-substep `ask`/`got`/`bound`/`slips` fields are a sample, used
for the tick-by-tick controls only.

---

## 8. The result, on his own spot

`results/35k/35k-ride-canyon.txt`, the **real Canyon B solver** (`?canyonWaves=true`, 400 × 451 = 180 400 cells,
spun up on the CPU per seed), riders placed through `RideSession` at the break point. **Population: 108 matched
cells per arm** — 4 seeds × 3 trials × 3 stances (tall/crouch/compress) × 3 steers (0/+1/−1), each pair placed on
the **same frame at the same point of the same sea**, so the two arms differ in the switch and in nothing else.
216 runs. **180 of 216 reached the stop at all**; the 36 that did not say nothing about it either way.

Controls, all three clean: off the switch, `got` differed from `ask` on **0** ticks and **0** runs slipped; on the
switch, **0** ticks delivered past the bound.

### 8.1 The torque removed — requested versus delivered

Quantiles over the **108 cells of each arm**, N·m about the board's up axis, peaks over **every** coupled substep:

| quantity | arm | min | median | mean | max |
|---|---|---|---|---|---|
| stop **REQUESTED** peak | off | 0 | **232.65** | 232.01 | **632.48** |
| | feet | 0 | 245.69 | 328.56 | 1615.91 |
| stop **DELIVERED** peak | off | 0 | **232.65** | 232.01 | **632.48** |
| | feet | 0 | **172.50** | 149.32 | **278.78** |
| **REMOVED** peak (`ask − got`) | off | 0 | 0 | 0 | 0 |
| | feet | 0 | **36.89** | 197.55 | **1492.42** |
| whole joint torque peak (`tb.torque`) | off | 14.22 | **203.52** | 226.51 | **552.01** |
| | feet | 14.22 | **153.38** | 165.56 | **324.15** |
| …of it, on slipping substeps | feet | 0 | 90.49 | 108.32 | 324.15 |
| grip bound (each run's median) | off | 110.55 | 208.62 | 205.83 | 270.93 |
| slip share of coupled substeps, % | feet | 0 | **0.93** | 3.63 | **26.06** |

**Read it this way.** Within the switched-on arm, the stop **asked** the feet for a peak of 245.69 N·m at the median
and 1615.91 N·m at worst, and **delivered** 172.50 and 278.78 — so the clamp removed a peak of **36.89 N·m at the
median and 1492.42 N·m at worst**, over 108 cells. The feet slipped on **0.93 % of coupled substeps at the median**
and 26.06 % at worst. And the number that settles the solver question: the **whole joint torque** fell from a peak of
203.52 → 153.38 N·m at the median and **552.01 → 324.15 N·m at the extreme**, which is what a clamp on `tb.spring`
alone would have left where it was.

⚠️ The `off` and `feet` **requested** columns are *not* a clean before/after of one trajectory: once the clamp bites
the two rides diverge, and the switched-on rider gets further out of range (§8.3), so its stop asks for more. The
honest statement of what the clamp removes is the **within-arm** `ask` → `got` comparison above, not `off`'s `ask`
against `feet`'s `got`. The 1615.91 N·m worst case belongs to a rider that the clamp let twist to 92°.

### 8.2 The fall — it does NOT move

**108 matched pairs. Both arms fell in 108 of 108** (no censoring: no rider was still on at the horizon in either arm,
so the medians below are over the whole population and not over survivors).

| | min | median | mean | max |
|---|---|---|---|---|
| fall s, switch **off** | 0.550 | **1.292** | 1.297 | 2.300 |
| fall s, switch **on** | 0.550 | **1.308** | 1.315 | 2.700 |
| **Δfall s (on − off)**, all 108 pairs | −0.133 | **0.000** | **+0.018** | +1.267 |
| Δfall s, the 35 pairs that moved at all | −0.133 | −0.017 | +0.057 | +1.267 |

**The fall did not move, and that is the result.** 73 of 108 pairs fell on the **same frame**. Of the 35 that moved,
**18 were earlier and 17 later** — a coin flip. The median Δ is **exactly 0.000 s**. The whole of the +0.018 s mean
is one outlier (a `tall` cell, +1.267 s); by stance the means are `tall` +0.059, `crouch` −0.000, `compress` −0.003 s,
and `crouch` and `compress` are zero to the third decimal over 36 pairs each.

⚠️ **This is an honest null and it is reported as one.** The clamp is right on the physics — the stop was the only
one of six foot-borne forces not asked what the feet hold, and after this it is — but **it does not make the owner's
rider stay on the wave.** Whatever ends these rides at a median 1.3 s, an unbounded twist stop is not it. The
eighth such result in this thread; it is not dressed up as a win.

### 8.3 The pose — it moves, and mostly where the rig cannot show it

`drawnTwist` is the rig's own quantity (§6), and it equals `tb.angle` exactly for the new surfer (asserted).

| | min | median | mean | max |
|---|---|---|---|---|
| \|peak drawn\| °, off | 8.40 | 53.15 | 51.17 | **60.69** |
| \|peak drawn\| °, on | 8.40 | 53.32 | 54.71 | **92.04** |
| Δ\|peak drawn\| °, all 108 pairs | −0.015 | **+0.085** | +3.54 | **+35.96** |
| Δ\|peak drawn\| °, the 54 that moved > 0.1° | +0.119 | +3.67 | +7.08 | +35.96 |

**54 of 108 pairs** changed their peak drawn twist by more than 0.1°, and **all 54 went further out, none less far**
— which is the expected sign: a stop the feet can slip past is a weaker stop, so the torso winds further. The
extreme is **92°** of twist on a ±49.85° joint.

**But the rig clamps the chest and the hips at 45°** (§6), which the stop's own 49.85° already exceeds, so none of
that extra winding is drawn in the torso. It shows only in the **head's look**, which takes the whole twist and is
limited to 90° from the chest's aim. So: the pose changes, in the gaze, in half the population — and the torso looks
the same because the rig was already saturated before the stop in **both** arms.

⚠️ **That last fact is a finding against the current rider, not against this switch**, and it belongs to whoever owns
the open `TWIST_BODY_RANGE` question: the physics routinely drives 50–60° of twist (92° with this clamp) into a rig
that cannot draw the chest past 45°. It is a reason to look at the range, and a reason **not** to read the pose
columns as "no visible change".

---

## 9. What remains uncertain

1. **The range, not the bound.** The clamp lets the twist reach 92° where the shipped stop held it to 60.7°. If
   `TWIST_BODY_RANGE` = 0.87 rad is right, 92° of hip-and-knee twist is anatomically wrong, and this switch makes
   that worse even as it makes the *torque* right. **The two changes may have to land together**, and the range is
   the peer reviewer's open question, not this step's.
2. **The bound is per-force, not a shared budget.** The active torque and the stop each get the whole grip, so the
   pair can reach twice it, and the base joint (`TWIST_STIFFNESS`, `TWIST_DAMPING`) is still outside any bound (§4).
   A single Coulomb budget across all three would be stricter and is defensible; it would also change the active
   path, which this step deliberately does not.
3. **Even loading.** `FOOT_FRICTION × legLoad × span` is the couple two **evenly loaded** feet make. Under a
   fore-aft weight shift the real bound is set by the weaker foot and is smaller (§2).
4. **The stick test is O(h) in the rate** (§5). It held on every substep measured, but it is a test and not an
   identity.
5. **Nobody has ridden it.** Every number here is a placed rider on a crest under a held stick, not the owner
   playing. He judges feel.
