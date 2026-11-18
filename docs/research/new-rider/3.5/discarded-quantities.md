# The two discarded quantities, measured: the hip clamp's impulse and the hand's residual moment

**A measurement round. No behaviour changed, no constant tuned, no switch added, nothing paired.** No byte under
`src/` or `server/` is touched — the instrument is a read-only wrapper installed on two prototypes from
`3.5/discarded.ts`, and the same bench was run with the wrapper off so the two dumps could be compared value by
value. **Both quantities had never been measured.** One of them turns out to be **exactly zero**, and saying so
retires an owner decision instead of adding one.

---

## The two sentences the owner can rule on

> **A — the hip clamp's discarded angular impulse is EXACTLY ZERO where the owner rides: 0 N.m.s over 83 216
> live substeps of 72 rides on the real Canyon B (24 input cells, seed 1, medium, stage 2, `rider:'new'
> feltFrame:'deck' riderBody:'two'`) and over a further 4 544 substeps of three single-rider controls, because
> the clamp never fires — the trunk rotor's angle never exceeds 7.76° of a range that is never tighter than
> 21.1°, and the rotor is away from rest on only 237 of those 83 216 substeps (0.28 %). Against references:
> had the clamp fired at the rotor's own peak angular momentum it would have discarded 11.74 N.m.s — 0.29 % of
> the pitch ankle's 4 086 N.m.s torque impulse over the same window, but **2.7× the body's own median angular
> momentum about that same axis (4.32 N.m.s)**, so this is a zero of frequency and not of size. The probe
> recovers 15.93 N.m.s of a known 16.00 when a discard is forced, so the zero is an instrument reading and not
> a silent filter. RULING: there is nothing to pair. The unpaired impulse is REAL IN THE SOURCE and WORTH NOTHING IN
> PRACTICE — leave it as a comment.**

> **B — the hand's discarded residual moment is small against balance, large against its own feature, and
> one-signed only in pitch: the dropped x/z part of `cross(hand − CoM, F_hand)` has a median of 2.01 N.m and a
> maximum of 23.68 N.m over 2 830 loaded substeps in 12 of 72 rides — 3.4 % of the pitch ankle's own torque
> (median 71.85 N.m), 0.7 % of the body's weight moment about its feet (median 246.40 N.m), and 1.9× the
> moment that same force DOES put on the board. It loads in the Compress stance only: 3.40 % of live substeps
> pooled over all four input arms and three stances, but 25.7–33 % of a lone Compress rider's. Its PITCH
> component is one-signed within a ride (11 of 12 bench rides; 911 of 922 single-rider substeps); its ROLL
> component is not (one-signed on 12 of 12 bench rides, but 234 + against 419 − inside one lone rider). And it
> is small only because the hand is barely loaded — median force 2.66 N, maximum 38.4 N, against the engine's
> own 286 N cap — so at a properly loaded hand it would scale to about 180–260 N.m, 2.5–3.6× the ankle.
> Pairing it is a force-class change and its price is measured: **0.05–0.24 % of a ride's own water work, but
> 0.8–11× the work the retained yaw component already does, one-signed within a ride and of either sign across
> rides.** RULING: negligible as the engine stands; NOT negligible if the hand is ever made to carry weight.**

**And the one sentence that closes the reviewer's objection.** Row 19 reads *"two omitted components say nothing
about the fraction of torque lost — its magnitude and effect on a ride are unknown."* **It is now known: the
omitted share of the hand's own moment about the body's reference is 63 % — Σ|dropped x,z| 7 520 N.m against
Σ|kept y| 4 347 N.m over the same 2 830 substeps, i.e. 7 520 / (7 520 + 4 347), summed magnitudes and not a vector
ratio — and the effect on a ride is 3.4 % of the ankle's torque on 3.4 % of the substeps of one stance in three,
worth +3.33 J of work over 72 rides if it were paired.** Both halves are needed: the fraction is large, the effect is
small, and quoting either alone misleads.

---

## 0. The instrument, and the controls that let its zeros fail

**A metric that cannot fail is worth nothing, and this round has one exact zero to defend.** So, per quantity:

| | what a zero would mean | the positive control, and what it recovered |
|---|---|---|
| **A** | either the `braking` backstop always wins and the limit is never reached, **or the probe is blind** | `INJECT=hip`: the wrapper puts the rotor **at** its limit with a known **2 rad/s** before one call, so a clamp must fire. **Measured discard 15.9277 N.m.s against the arithmetic's 16.000** (`I x rate` = 8 x 2); the 0.07 deficit is the return spring's own torque over that substep. **2 firings in 2 runs, one each, as designed.** The same arm also gives the identity check its teeth: **2 011 unclamped substeps with the rotor up to 68.1° reproduced bit for bit, and 901 clamped substeps whose clamped angle matched `sign(anglePre) x range` exactly, 0 mismatches.** |
| **B** | either the hand never loads, or its moment is exactly along world Y, **or the probe is blind** | `INJECT=hand`: a known force **(3, −5, 7) N** at a known lever **(0.11, −0.23, 0.37) m** is added after the engine's own, so the differenced channel must report the engine's moment **plus** `cross(INJARM, INJF)` = **(0.24, 0.34, 0.14) N.m** exactly. **Recovered with a worst error of 2.2e−14 N.m over 142 substeps.** |

**`SELFTEST=1`** additionally puts known vectors through the same reduction arithmetic (the drop keeps x and z and
zeroes y; the board-frame projection of `(3, −7, 11)` on an identity orientation reads roll 11, pitch 3, yaw −7; a
hand-checked cross product). **All pass.**

**And the live window, which cost an earlier round 64–93 % of its frames.** `AttachedRider.separate`
[R, `AttachedRider.ts:5227–5232`, **not `:4586` as the brief has it — that line is `coupleYaw`**] sets `attached`/`climbing`/`inContact`/`separation` and **never `phase` or `upright`**,
and `freeBody` does not read `attached` — so the wrapper keeps being called on a dead rider. **Every figure above is
a per-frame delta of the accumulators, added only on frames with `attached && upright && phase === 'standing'`:
5 201 live frames kept, 72 frozen frames dropped** (one a run: the fall frame itself), **83 216 live substeps.**

### 0.1 The read-only proof

**The same bench, probe on and probe off, agreed on every value.**

| | |
|---|---|
| state rows emitted by each pass | **5 273** |
| rows matched by (trial, arm, stance, entry, frame) | **5 273**, 0 missing |
| shared columns compared | **56** |
| **values compared** | **295 288** — **400 748** counting the 21 part coordinates of each row's `parts` array separately |
| **differences** | **0** |

The columns are emitted **unrounded**, so this is a bit-for-bit test and not a rounded one: the board's position,
orientation, velocity and spin, the rider's position, velocity and spin, the hip's angle, rate and torque, the
ankle's angle, rate, torque, rest and reference, the leg's rest, extension and force, the bank, the swing, both
hand loads, the seven part coordinates, the substep count, and the rider's own gravity and water work.

### 0.2 The sea, and why no byte hash is quoted

**The probe cannot reach the game's sea and does not need the seatbelt.** Nothing under `src/` is modified, nothing
imports this file, and the wrappers only read rider state after the original call has run. The bench builds its own
Canyon the way the switch does — `physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm',
time: 'midday' }, { stage: 2 })`, `surfZoneConfigFor(settings, 1, true)` and then **`canyonBed: 'b'`, which is
exactly what `?canyonWaves=true` resolves to** [R, `PhysicalMode.ts:1500–1502`] — so it never reads
`globalThis.location` at all and the object-versus-string trap cannot apply. **The grid was read and printed:
`400 x 451 = 180400`, Canyon B's published reference grid**, and so was the spin-up (**22.0 s of sea in 67–84 s of
wall**, a fresh spin-up for every pass).

**What stands in for the hash is stronger here.** The board and the rider push back on the water
(`water.addReaction`, [R, `BoardBody.ts:898`, `AttachedRider.ts:3350`]), so the sea in this bench is downstream of
the riders: if the wrapper had changed a rider by one bit, the water would have moved and §0.1's 295 288 values
could not have matched. **The hash tests one sea for one path; §0.1 tests this sea against these riders on 5 273
frames.**

---

## 1. A — the hip clamp's discarded angular impulse

### 1.1 The mechanism, verified by reading

`standingBody.ts`'s `hipStep` [R, `:295–311`]:

```
this.hip.torque = burst - back * I * w * (w * angle + 2 * rate);   // the torque couple() pairs
this.hip.rate  += h * this.hip.torque / I;
this.hip.angle += h * this.hip.rate;
if (Math.abs(this.hip.angle) > range) {
  this.hip.angle = Math.sign(this.hip.angle) * range;
  if (this.hip.rate * this.hip.angle > 0) this.hip.rate = 0;       // <- I x rate vanishes
}
```

and `couple()` [R, `:379–384`] pairs **`this.hip.torque`**, computed **before** that clamp. **So the review's
finding is correct in the source: zeroing `hip.rate` removes `HIP_PITCH_INERTIA x rate` of angular momentum with no
reaction anywhere.** The code's own backstop is `braking = (rate.|rate|.I) / (2.TORQUE)`, the stopping distance,
which sets `burst = 0` while still short of the limit — so the clamp is meant to be unreachable.

### 1.2 It is unreachable. The measurement

**Population: 72 runs, 24 cells (4 input arms x 3 stances x 2 entries), 3 placements, 5 201 live frames,
83 216 live substeps.** `rider:'new' feltFrame:'deck' riderBody:'two'`, real Canyon B, seed 1, medium, stage 2,
the rider placed on the face 6 m inside the break point at 45° off the fall line, entries 2 and 5 m/s.

| | |
|---|---|
| **clamp firings** (`\|anglePre\| > range`) | **0** |
| **rate zeroings** (the discard) | **0** |
| **angular momentum discarded** | **0 N.m.s** — not small, **zero** |
| of which by a **driven** rotor / by a **shrinking** range | **0 / 0** |
| runs with any firing | **0 of 72** |
| the rotor's largest angle, any run | **4.33°** on this bench; **7.76°** in the single-rider control (§3) |
| the range on those rides | **68.75° at the tall stance; the tightest any run reached is 21.1°** (per-run minima 21.1–67.7°) |
| **the rotor's own peak angular momentum**, max \|I·rate\| over runs | **11.74 N.m.s** — what a firing at that instant would have cost |
| **the body's own angular momentum about the same axis**, \|I_across·ω_across\| off the game's seven point masses | **median 4.32 N.m.s, max 36.66 N.m.s** over the 5 201 live frames (its pitch inertia about that axis: median **8.17 kg.m²**, within 2 % of `HIP_PITCH_INERTIA`'s 8) |
| substeps with the rotor away from rest | **237 of 83 216 (0.28 %)** |
| substeps with a non-zero hip demand | **1 232 of 83 216 (1.48 %)** |
| the hip's own torque impulse, Σ h·\|τ\| | **16.0 N.m.s** |
| **the ankle's torque impulse over the same window**, Σ h·\|τ\| | **4 086 N.m.s** (signed 705) |
| the reconstruction identity, unclamped substeps | **83 216 of 83 216 exact, worst error 0** |
| frames whose hip torque is non-zero **at the frame's end** | **17 of 5 201**, in **5 of 72** runs |
| **where in the ride those frames are** | **at 91.0–99.9 % of it, median 99.3 %** — the last tenth |

⚠️ **And read the references the right way round: the zero is NOT because the amount would be small.** The rotor's
own peak momentum, 11.74 N.m.s, is **2.7× the body's own median angular momentum about the same axis (4.32
N.m.s)** — so a firing at that instant would be a real impulse to lose. **It is zero because the event never
happens, not because it would not matter.** That is the honest form of the ruling, and it is also why the probe
stays in the tree: if a later round makes the trunk rotor actually work, this is the counter to re-run.

**The rotor reaches 4.33° here and 7.76° alone, of a limit never closer than 21.1°, so the stop is not approached at all** — the
clamp is not a rare event on these rides, it is an absent one. And the reason is upstream of the backstop: **the
rotor is barely driven.** Its demand is the ankle loop's own torque past `HIP_PITCH_SHARE = 0.8` of the feet's
reach [R, `standingBody.ts:274–275`], which is non-zero on 1.48 % of substeps and in spikes — the ankle's torque
reaches **18.9× its own threshold** at worst, but its median is **0.154** of it — and `HIP_PITCH_RETURN`'s
critically damped spring unwinds the rotor between spikes.

**So the rotor never accumulates travel** — and the measurement says *when* it tries: **the hip's torque is
non-zero at a frame's end on 17 of 5 201 frames, in 5 of 72 runs, and the earliest of those frames sits at
91.0–99.9 % of its own ride (median 99.3 %).** **The rotor only ever stirs inside the last tenth of a ride, which
is the fall itself** — the ankle's excess is a symptom of the collapse, it arrives `PITCH_DELAY` = 0.1 s later, and
the ride is over. **So it is not only the clamp that never runs where the owner rides: the trunk rotor barely runs
either**, which is engine-target row 1's own caveat (*"making the fold possible and making it appear are different
questions"*) measured on the real spot rather than on a bench.

Measured against the saturated case: at `HIP_PITCH_TORQUE = 200 N.m` on `HIP_PITCH_INERTIA = 8 kg.m²` the rotor
accelerates at 25 rad/s², so from rest it needs **0.17 s of uninterrupted saturated drive to reach the tightest
range seen (21.1°) and 0.31 s to reach the tall stance's 68.75°**. It never gets either.

**An independent corroboration worth more than agreement usually is.** PR #411 (`?trunk=mass`, open, not merged)
measured the rotor's **travel** on a different bench (`FaceWater`, Canyon-matched 1.4 m / 16° / 5.7 m/s) with a
different instrument and got **0.05–4.49° on 18 of 18 switched arms**, plus *"the rotor is INERT on 42 of 60
arms."* **This round, on the real Canyon, reads a maximum ANGLE of 4.33° on the bench and 7.76° alone, and the
rotor away from rest on 0.28 % of substeps.** Two benches, two instruments, the same couple of degrees — **and
that is the number that decides A, because a stop at 21.1° cannot be reached from 7.76°.**

### 1.3 ⚠️ The brief's warning about the moving limit, corrected and then answered

The brief asks that the momentum removed by the stop be separated from *"the momentum changed because the inertia
changed"*, on the grounds that `HIP_PITCH_INERTIA` is not constant across a depth change.

**It is constant: `export const HIP_PITCH_INERTIA = 8` [R, `standingBody.ts:93`], a module constant with no depth
argument anywhere.** What moves with depth is the **range**: `hipRange(depth)` with `depth = -leg.rest`
[R, `AttachedRider.ts:3482`], which the leg follower moves continuously. **So there is no inertia-bookkeeping term
to separate at all** — the warning is right in substance (a firing can mean the stop moved onto a rotor that was
not moving) and wrong in its letter.

**Answered anyway, because it costs one counter:** every firing is classified by whether the range **shrank** since
the previous substep. **Both classes read zero, and they must: with the angle never past 7.76° and the range never
under 21.1°, no amount of shrinking reaches it.** The classes are in the probe and will separate the two the moment
a firing ever happens.

**And both branches of the classifier are exercised, so neither zero is an untested one.** The first control arm
injects in **Compress**, where the leg is still bending, so its 2 firings land in **shrink** (`shrink 2, driven 0`).
A second arm injects in **Tall**, where `depth` is 0 and the range is a constant 68.75°, and its firing lands in
**driven** (`driven 1, drivenDiscard 15.9275 N.m.s, shrink 0`) — same arithmetic, same recovery of a known 16.00,
**1 416 unclamped substeps with the rotor at the tall limit reproduced bit for bit, 376 clamped ones exact.**

### 1.4 What would change this answer

Stated so the zero is not over-read:

1. **One spot, one seed, one swell size.** Canyon B, seed 1, medium, stage 2. A bigger sea, a steeper face or
   Teahupo'o's slab puts more torque on the ankle, and the demand is the ankle's excess.
2. **Rides of 0.85–2.47 s, all 72 ending `detached`** (as every round on this rider does: 51–148 frames). A rotor
   needs 0.17–0.31 s of uninterrupted saturated drive; a longer ride has more chances at one. **And the drive arrives
   `PITCH_DELAY` = 0.1 s late** (192 substeps at 32 a frame), which is consistent with 1 232 excess substeps
   producing only 237 moving ones: a spike inside the last 0.1 s of a ride never reaches the rotor.
3. **`?trunk=mass` (PR #411, open, not merged) does not change the rotor's dynamics** — it rotates the mass parts
   **by** `hip.angle` — but it changes the ride, and the ride is what feeds the ankle. **This round measured the
   rider as it ships, not with #411.**
4. **The hip rotor across (`swing`) is a different rotor with its own clamp** and was not measured here.
5. **The bench places 24 riders at one point and they all push the same water** (`addReaction`), as `3.5/foam.ts`
   and 3.5d's rig do. **The single-rider controls in §3 are the check: 0 firings in 4 544 further substeps, and the
   rotor's angle reaches FURTHER alone (7.76°) than in company (4.33°)** — so the crowd is not what is holding the
   rotor down, and the figure quoted above is the conservative one.

**None of those is a reason to pair anything today.** The honest position: **the unpaired impulse is real in the
source, measured at zero where the owner rides, and should be left as a comment rather than a ruling.**

---

## 2. B — the hand's discarded residual moment (engine-target row 19)

### 2.1 The sites, and one correction to the expression

`wetForce` [R, `AttachedRider.ts:4488–4490`] sums the hand's force into `waterForce` and adds
`cross(partWorld - position, force)` into `waterMoment` — **the full moment at the hand's own lever, about the
rider's own centre of mass.** Standing, only the world-Y component survives: `handYaw = this.waterMoment.y -
moment` [R, `:4346`], and `rhs[4] += torque.y + h * this.handYaw` [R, `:4726`] is the only place it is used. The
full moment reaches the board **only in the prone branch**, `if (!this.upright)` [R, `:4541–4544`].

**Two readings that complete the picture, both verified here:**

- **Upright, the rider has no rotational freedom of its own in the solve.** `couple`'s inertia block is
  `+ (this.upright ? 0 : I[i * 3 + j])` [R, `:4527`] — the standing body's own inertia is not coupled, so a moment
  about its centre of mass can only act through the board's angular rows. **Dropping x and z means the moment acts
  nowhere at all.**
- **The energy book is already consistent with the drop.** The full `waterMoment`'s work is booked only
  `if (!this.upright)` [R, `:5092–5098`]; standing, only `handYaw`'s is [R, `:5088–5090`]. **So today's drop is not
  a leak — it is a force that does no work and is booked as doing none. Pairing it would ADD work**, which is
  exactly why the review reclassified row 19 as force-class, and **§2.5 measures how much.**

**And a correction to the brief's expression.** The residual is **not** `cross(hand − a, F_hand)`: `a` is where the
rider's whole force reaches the board (a vector from the board's centre of mass), not a point in space, so
`hand − a` is not a lever. **The quantity the engine computes and drops is `cross(hand − CoM, F_hand)` less its
world-Y component**, and that is what is measured. `cross(a, F_hand)` is the separate reference §2.3 calls
**deliver**.

### 2.2 ⭐ FIRST: how often does the hand load at all — and the answer refutes the feature

**The hand loaded on 2 830 of 83 216 live substeps (3.40 %), in 12 of 72 runs** — and **25.7 % and 33 % of the
substeps of the two single-rider Compress controls**, which is the per-ride figure and the one to quote when asking
whether a rider feels it. So row 19 is **not** moot: the hand loads far more often in the game than in the footage
(*"one plausible contact in sixteen clips"*). **But where it loads is the finding:**

| arm | `rider.hand` | runs | runs that loaded | loaded substeps |
|---|---|---|---|---|
| **plain** (no key, no stick) | false | 18 | **6** | 1 802 |
| **stick** (full stick) | false | 18 | **5** | 893 |
| **hand** (the KeyE hand-drag) | **true** | 18 | **0** | **0** |
| **handstick** (the key and full stick) | **true** | 18 | **1** | 135 |

**and the ask behind it** — `standingHand` runs only with `upright && handSide !== 0` [R, `:4296`], so an ask is a
substep on which the engine placed a hand at all:

| | asks | of those, came back DRY | runs with any ask |
|---|---|---|---|
| **all 72 runs** | **4 356** | **1 526 (35 %)** | **14** |
| the 36 runs with the hand key held | **163** of 41 328 substeps (0.39 %) | 28 | **2** |
| the 36 runs without it | **4 193** | 1 498 | 12 |

**and by stance:**

| stance | runs | runs that loaded | loaded substeps |
|---|---|---|---|
| **tall** | 24 | **0** | **0** |
| **crouch** | 24 | **0** | **0** |
| **compress** | 24 | **12** | **2 830** |

> **⚠️ So the loaded hand in this game is the COMPRESS REACH, not the hand-drag feature row 19 is about. With the
> player's own hand key held for 36 runs, the hand loaded in 1 of them.**

**So holding the key makes the hand load LESS, not more**, and the mechanism is in the source and explains both
halves. `waveSide` [R, `:5719–5732`] gives two different
placements:

- **with the key** (`this.hand`), the branch **returns before the compress reach is considered at all** — so
  holding the key **switches the reach off** — and the side becomes the wave's, which needs the water to stand
  `WAVE_SIDE_MIN` = 0.05 m higher 0.6 m to one side of the board. **On this spot that test passed on 163 of
  41 328 substeps (0.39 %)**, and on that branch there is no surface clamp either, so 28 of those 163 were dry;
- **without the key**, the hand reaches only when `compressAsked >= REACH_FROM` (0.5) **and** `|bank.angle| >=
  REACH_LEAN` (10°) — which is why only Compress ever loads — and that branch **clamps the hand to the surface**,
  `hand.y = max(hand.y, surfaceAt + HAND_RADIUS - REACH_DIP)` [R, `:4336`], so a sliver of it is always wet.

`REACH_DIP` is **0.03 m** of a **0.08 m** hand radius: **the reach dips about a tenth of the hand**, which is why
the force is what §2.3 measures.

### 2.3 The residual itself, against its three references

**Population: 2 830 loaded substeps, 12 runs, all Compress.** Medians are plain medians; this track's `qt(v, 0.5)`
is the **upper middle element**, and for `|residual|` the two agree to 0.001 N.m (2.008 against 2.009), so nothing
here turns on which is used.

| | median | max | Σ over the window |
|---|---|---|---|
| **\|residual\|** — the dropped x/z of the hand's moment about the body | **2.01 N.m** | **23.68 N.m** | 7 520 N.m |
| the **kept** world-Y component (`handYaw`) | — | — | 4 347 N.m |
| **deliver** — `\|cross(a, F_hand)\|`, what the force does put on the board [R, `:4724`] | **0.94 N.m** | — | 5 115 N.m |
| **ankle** — `\|standingBody.torque\|`, the pitch ankle's own | **71.85 N.m** | — | 226 865 N.m |
| **gravity** — `\|cross(CoM − feet, m g)\|`, the weight's moment about the stance point | **246.40 N.m** | — | 702 430 N.m |
| the hand's **force** | **2.66 N** | **38.37 N** | — |
| the hand's **lever** from the body's centre of mass | **0.90 m** | — | — |

**The ratios, per substep:**

| | median | max | the aggregate (Σ/Σ) |
|---|---|---|---|
| **residual / deliver** | **1.91** | 5.88 | **1.47** |
| **residual / ankle** | **0.0345** | 54.4 (a denominator going to zero) | **0.033** |
| **residual / gravity** | **0.0072** | 0.065 | **0.011** |
| **residual / kept** | — | — | **1.73** |

> **Read together: the dropped part is 1.9× the moment the board gets from the same force and 1.7× the yaw
> component the engine keeps — but 3.4 % of the ankle's own torque and 0.7 % of the weight moment the balance works
> against. It is a large fraction of a small thing.**

**Why it is small is measurable and matters for the ruling: the hand is barely loaded.** Median force **2.66 N**,
maximum **38.37 N**, against the engine's own cap of `HAND_FORCE_LIMIT x m g` = **0.4 x 73 x 9.81 = 286 N** (the default rider's mass; the bench passes none)
[R, `:203`, `:4475–4480`]. The residual is linear in the force, so **at a hand carrying the cap on the measured
0.90 m lever the residual would be about 180–260 N.m — 2.5–3.6× the ankle's median torque.** That is the
conditional half of the ruling and it should not be dropped: **negligible at today's forces, decisive at a loaded
hand.**

### 2.4 The sign biases in pitch; in roll it is NOT robust

| | |
|---|---|
| **pitch** (about the board's beam), one-signed **within a run** | **11 of 12 bench runs** (the twelfth 0.548); **911 of 922** single-rider substeps (642 of 653 and 269 of 269) |
| **roll** (about the board's long axis), one-signed within a run | **12 of 12 bench runs** (share 1.000 each) — **but the single-rider control splits 234 + against 419 −** |
| pooled bench counts | pitch **− on 2 769 of 2 830**; roll **+ on 2 695 of 2 830** |
| pooled signed sums, against Σ\|residual\| 7 520 N.m | pitch **−2 270**, roll **+727** |

> **So the pitch component biases and the roll component's bias does not survive the control.** With the board's
> local +x as its left [R, `BoardBody.buildFoils`], the one-signed pitch component is a **nose-up** moment on the
> body. **A term that alternated would matter far less than one that biases; this one biases in one component of
> two** — and the round found that out by running the control that could have refuted it, which is why the roll
> half of the claim is withdrawn rather than published.

### 2.5 And the energy, which is what makes it force-class

Pairing the residual would add work of `residual · ω` per substep — the exact objection that moved row 19 from
"lever correction" to "force-class". **Measured over the same 2 830 substeps**, with the rider's own angular
velocity as the engine holds it at that point in the substep:

| | over all 72 rides | per ride that loaded (12) |
|---|---|---|
| the work pairing it would add, **signed** | **+3.33 J** | **+0.28 J** |
| the same, Σ\|·\| | **9.42 J** | 0.79 J |
| the work the **retained** yaw component already does, Σ\|·\| | **4.36 J** | 0.36 J |
| the rides' own water work at their last live frame, Σ | **−7 098 J** | — |
| the two single-rider controls, signed / absolute / kept / ride | **−1.375 / 1.439 / 0.125 / −585 J** and **−0.197 / 0.197 / 0.106 / −83 J** | — |

> **So pairing it would move the bench's energy budget by 0.047 % (signed) or 0.13 % (absolute) — 0.24 % in the
> single-rider control — and would at least double the work the hand's moment does to the body, because the part
> that is kept does 4.36 J and the part that is dropped would add 3.33 J.** Both readings are true and the second
> is the one a force-class ruling is about: **the residual is negligible as a share of the ride and comparable to
> or larger than the feature it belongs to.**

⚠️ **And the energy's SIGN is a ride's property, not the term's** — the second thing the single-rider control
refuted. Pooled over the bench the term is **+3.33 J net of 9.42 J absolute (35 % net)**; the lone Compress rider
gives **−1.38 J net of 1.44 J absolute (96 % net)**. **So within a ride it is strongly one-signed, and across rides
it changes sign.** Pairing it would bias a given ride's energy, not systematically add to it. **The same control
also stretches the comparison with the retained component: 3.33 J against the kept 4.36 J pooled (0.76×), but
1.44 J against a kept 0.12 J in the lone ride (11.5×).** Quote the range, not either end.

## 3. Controls, in one place

| control | result |
|---|---|
| **read-only, probe on vs off** | **5 273 rows, 56 columns, 295 288 values (400 748 with array elements), 0 differences** |
| **positive, A (shrink class)** | injected 2 rad/s at the limit, Compress → **15.9277 N.m.s recovered of an arithmetic 16.000**, 2 firings in 2 runs, classified `shrink` |
| **positive, A (driven class)** | the same injection in **Tall**, where the range is a constant 68.75° → **15.9275 N.m.s**, classified `driven`, `shrink 0`; **1 416 unclamped substeps and 376 clamped ones exact** |
| **positive, B** | injected `cross((0.11,−0.23,0.37), (3,−5,7))` = (0.24, 0.34, 0.14) N.m → **recovered, worst error 2.2e−14 N.m over 142 substeps** |
| **identity, A** | **83 216 of 83 216** unclamped substeps reproduce the post-call state **exactly** (worst error 0); in the injected arm **2 011 moving-rotor substeps** and **901 clamped** ones also exact |
| **identity, B** | the differenced moment equals `cross(hand − CoM, F)` on **2 830 of 2 830** substeps, worst error 0 at the tolerance; the differenced force equals `partForce` on **2 830 of 2 830** |
| **self-test** | the reduction arithmetic on known vectors: all pass |
| **single rider** (the cross-talk check) | Three runs placed **alone** on the sea — **one rider each BY DESIGN** (one cell plus `TRIALS=1`, not a word-split `ARMS`: `zsh` does not split an unquoted variable, and the bench's own passes report 72 runs), because the bench puts 24 riders at one point and they all push the same water (`addReaction`). **A: 0 firings in 4 544 further substeps**, angle max **7.76 / 0 / 0.0004°**. **B: the hand loads on 653 of 2 544 and 269 of 816 substeps** — far more often per ride than the pooled 3.40 % — **and the residual is the same size** (median 1.60 and 1.87 N.m against the bench's 2.01). **It refuted this round's own roll-sign and energy-sign claims** (§2.4, §2.5). Figures: live 159 / 51 / 74 frames, residual median 1.599 / 1.872 N.m, max 3.995 / 6.471, residual/ankle 0.0083 / 0.0243, energy −1.375 / −0.197 J against kept 0.125 / 0.106 J and ride water work −585 / −83 J |
| **determinism** | the whole bench was run **three times across three builds** (the later two adding read-only columns); **every figure in §1, §2.2, §2.3 and §2.4 reproduced to the digit**, and the probe-off pass of each build matched its probe-on pass value by value |

**⚠️ One honesty note on the B identities.** They are **not** exact tests and cannot be: `waterForce` and
`waterMoment` are running accumulators, so `(W + f) − W` is not `f` to the bit. The tolerance is relative to the
accumulator's own size and the worst error is printed either way (it came out 0 at double precision here). **The
round's first build asserted exact equality and read "140 of 142 bad" — which was the instrument, not the
engine.** Recorded because the same trap will catch the next round that differences an accumulator.

---

## 4. What refutes this brief, or an earlier round

1. **`HIP_PITCH_INERTIA` is a constant**, so A's warning about separating an inertia change has nothing to
   separate (§1.3). The range is what moves, and that split is counted and also zero.
2. **The residual is not `cross(hand − a, F_hand)`** (§2.1): `a` is not a point. The engine's own expression is
   `cross(hand − CoM, F_hand)`.
3. **⭐ The loaded hand in the game is not the hand-drag feature.** With the player's own hand key held for 36
   runs the hand loaded in 1; every other loaded substep came from the Compress reach, which the key's own branch
   turns off (§2.2). **Row 19's evidence column — "a layback, a hand-drag stall, a hand set in the face" — is
   about a feature that does not load in practice.**
4. **Row 19 and the status blocks the brief points at are NOT on `main`.** `docs/research/new-rider/3.5/
   engine-target.md` on `main` (`1a29a6c7`) has **18 rows and no status blocks**; row 19 and the PR #411/#413/#414
   status blocks are on **`origin/claude/hand-moment-row`**, 20 commits ahead of `main` and unmerged. This round
   read them there. **Anyone quoting "row 19" should say which branch they mean.**
5. **The force/moment identities cannot be exact** (§3), and the first build's "140 of 142 bad" was that mistake.
6. **⭐ This round refuted its own draft headline TWICE, both times with the same control.** Its first pass wrote
   *"the sign does not average out: the roll component is one-signed within 12 of 12 rides"* — and the
   single-rider control, run afterwards, split **234 + against 419 −** inside one ride, so **the roll half is
   withdrawn and only the pitch half is published** (§2.4). Its second pass wrote *"pairing it would ADD energy on
   balance"* off the bench's +3.33 J — and the same control gives **−1.38 J**, so **the energy's sign is a ride's
   property, not the term's** (§2.5). **Both 12-of-12s were real and were artefacts of the cells.**
7. **Neither quantity is "unknown in magnitude" nor "unknown in effect on a ride" any more** — the two sentences
   the round existed to retire. **A: 0 N.m.s, and 11.74 N.m.s if it ever fired. B: 2.01 N.m median, 63 % of the
   hand's own moment, 3.4 % of the ankle, +3.33 J if paired.** But the answers point opposite ways: **A is zero
   and retires a decision; B is small, one-signed in pitch, and conditional on a force the engine does not
   currently apply, so it narrows a decision rather than retiring it.**

---

## 5. What this round did not do

- **No file under `src/` or `server/` was touched.** No constant, no switch, no pairing, no behaviour.
- **No fall, survival rate or ride time is quoted as a result.** 72 of 72 fell, as they do on every round on this
  rider; Ruling F rejects it as a metric and nothing here rests on it.
- **The swing rotor's own clamp across the board was not measured** — only the hip in pitch.
- **`?trunk=mass` (PR #411) was not used**, so A is measured on the rider as it ships.
- **One spot, one seed, one swell size, one placement, 45° off the fall line, entries 2 and 5 m/s.**
- **The hand's residual was not measured at a loaded hand**, because the engine never loads it: the 180–260 N.m
  figure in §2.3 is a **linear extrapolation to the engine's own cap, not a measurement.**
- **No footage number appears anywhere.** Row 19 has none (contact is unmeasurable in sixteen clips), and nothing
  here was built to a footage target.

---

## 6. Reproduce

```
./node_modules/.bin/rolldown docs/research/new-rider/3.5/discarded.ts -o /tmp/d.mjs --format esm --platform node
SELFTEST=1 node /tmp/d.mjs
PROBE=on  OUT=/tmp/on.jsonl  node /tmp/d.mjs
PROBE=off OUT=/tmp/off.jsonl node /tmp/d.mjs
MODE=compare A=/tmp/on.jsonl B=/tmp/off.jsonl node /tmp/d.mjs
INJECT=hip  TRIALS=1 STANCES=compress ENTRIES=5 ARMS=plain,handstick SECONDS=2 OUT=/tmp/ih.jsonl node /tmp/d.mjs
INJECT=hip INJSUB=600 TRIALS=1 ARMS=plain STANCES=tall ENTRIES=5 SECONDS=3 OUT=/tmp/dr.jsonl node /tmp/d.mjs
INJECT=hand TRIALS=1 STANCES=compress ENTRIES=5 ARMS=plain,handstick SECONDS=2 OUT=/tmp/ia.jsonl node /tmp/d.mjs
TRIALS=1 ARMS=plain STANCES=compress ENTRIES=5 OUT=/tmp/solo.jsonl node /tmp/d.mjs
```

**`OUT` appends**, so every pass needs a fresh path or the reader sees two runs in one file.

The `sum` row carries every figure quoted here with its population; the `cells` array inside it carries the
per-(arm x stance x entry) breakdown; the `run` rows carry one line per ride. **Each pass spins the Canyon up
fresh (22.0 s of sea, 67–84 s of wall; 630 sim frames) and the whole set is about 20 minutes on the M1.**
