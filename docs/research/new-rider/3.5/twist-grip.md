# Step 3.5k — the twist's end stop bounded by the feet's own grip (`?twistGrip=feet`)

**Status:** opt-in dev switch, off by default, pinned off in online rooms. Nothing merged, nothing ridden by the
owner yet. `TWIST_BODY_RANGE` is **not** touched.

---

## 1. The defect, stated once

`src/physics/AttachedRider.ts` gives the rider's torso **one** degree of freedom twisting against the board
(`twistBody`, step 3.2e). **Two** torques act on it. Both cross the **same** foot contact — the two soles on the
deck, the only connection between rider and board. They obey different rules.

The **active** torque, `controlStep`:

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

**It is the only unbounded one of six.** The same file writes `FOOT_FRICTION ×` a load at `controlStep` (the active
twist), `twistStep` (the old rotor), `hipStep`, `agileStep`, and `footFriction`, and the back foot's own note states
the rule with its own record of the alternative:

> an unloaded foot pushes nothing: unbounded, a body weight threw the board from under every rider in 0.2 s.

**Measured** (#455's committed Canyon table, `results/35j/35j-ride-canyon.txt`, 54 rows): not one row has zero ticks
past the stop; peak twist 50.26 / 53.64 / 56.76° (min/median/max) against `TWIST_BODY_RANGE` = 0.87 rad = 49.85°;
median 11.3 % of each ride's ticks past it; the stop's **requested** peak torque 14.5 / 132.4 / 241.4 N·m against the
active bound's 100 N·m, exceeded in **32 of 54**.

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
loaded leg". A single fully loaded leg would give half of it. Measured live on the Canyon this bound runs roughly
100–410 N·m as the load rises and falls through a turn (see §6).

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
| `TWIST_GRIP_SPAN` | 0.315 m | `controlStep`, the new surfer's twist DOF | **half the feet's spacing along the board** — the arm of a two-foot couple |
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

## 6. What was measured

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
and the slip count. Off the switch `got` is `ask` by construction and `slips` is 0 — both asserted as negative
controls on every run, in every mode.
