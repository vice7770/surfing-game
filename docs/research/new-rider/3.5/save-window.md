# The save window: the palm goes down, it carries the whole hand cap — and the stance is already 0.33 m gone when it lands

> **Built, opt-in, proven byte-identical off (`?saveHands=deck`), and it does not save him.** The palm reaches the dry
> deck, loads to **286.45 N of a 286.5 N cap — 107× the published water-reach median of 2.66 N** — and the support it
> adds is used in full. It **does** hold the contact's clamp open: `saveCleared`, the engine's own per-substep test,
> fires on **14 of 176 palm-down frames in 8 of 16 runs.** **But `tip` still binds in 90 of 90 runs, 52.0 % → 52.1 %
> of frames, and 90 of 90 riders still fall.** The reason is one number: **when the palm lands the demand is a median
> 0.327 m outside the feet, and the whole deck can offer 0.102 m.** Rides: **9 of 90 longer (+0.017 to +0.117 s), 3
> shorter, 78 identical**, median delta 0.000 s, causes unchanged.

**The owner asked for this in so many words — *"go build the save window"* — so it is built and it is his to ride.
What this document mostly reports is why it is the right mechanism on the wrong surface.**

---

## 0. The five answers the brief asked for, each with its population

| asked | answer |
|---|---|
| **Does `tip` clear when a hand loads?** | ⚠️ **Sometimes, and not nearly enough.** The palm holds the clamp open — the demand outside the FEET's box and inside the palm's — on **14 of 176 palm-down frames (8.0 %), in 8 of 16 runs that put a palm down.** But over the bench **`tip` binds in 90 of 90 runs either way**, on **3 745 of 7 208 (52.0 %)** frames shipped against **3 770 of 7 233 (52.1 %)** switched. ⚠️ Read off the **`tip` flag and `limitTime`**, never off the exposed centre-of-pressure column (§6.1) |
| **How long is the window, and how often does a rider recover?** | **22 windows in 16 of 90 runs**, median **0.093 s** and longest **0.441 s**, **176 frames of 7 233 (2.4 %) — 2.93 s of palm-down time over 90 rides.** **Recoveries: 2 of 22** windows ended with the demand back inside the feet and the rider still riding. **90 of 90 still fall.** Against clip 20's **0.93 ± 0.06 s lost → tall with 0.65 s of hands-on**: ⚠️ **one instance, no third, and a different event** (§7) |
| **What force does the hand carry?** | **Median 73.08 N over the 111 palm-down frames that carry anything, and the maximum is 286.45 N against a cap of 286.5 N** — the bound is reached on 11 frames, and it is **structural, not lucky**: `press ≤ HAND_FORCE_LIMIT × m g` follows from the extension's own definition (§4.3). Against the compress water reach's **2.66 N** median (PR #418): **27× at the median, 107× at the peak** |
| **The discarded residual moment with loaded hands (row 19)** | ⭐ **A null, and it closes the question rather than opening it: the hand-water force is BIT-IDENTICAL on both arms — 522 frames, median 6.97415 N, max 63.4862 N, the same digits.** A dry palm carries deck load with **zero** water reaction, so **engine-target row 19 stays exactly where PR #418 left it: shelved.** And the dry palm's own moment about the body — median **8.4 N·m**, max **102.2 N·m** on an approximate 0.377 m lever — **is not discarded at all**: it travels inside the one contact pair (§4.4) |
| **The default-unchanged proof** | ⭐ **428 422 values over 84 shared columns and 7 298 matched rows, 0 differences**, and **90 of 90 run outcomes identical** in `(fellAt, cause, frames)` — the `miss` arm against the shipped rider. Every one of the 7 677 differences in the full 494 284-value comparison is in a column the switch itself writes and no physics reads (§6.2) |

### ⭐ And the two findings worth more than the feature

1. **THE DECK IS THE WRONG SURFACE FOR THIS FALL, and the numbers say so without ambiguity.** A palm's patch edge
   cannot pass the rail, so the across support can grow by **0.232 − 0.130 = 0.102 m** and no more (measured ceiling
   **0.10194 m** over 176 palm-down frames). **When the palm lands the demand is a median 0.327 m outside the feet
   — 0.457 m from the stringer, about twice the board's own half-width — and it is past what the palm covers on 159
   of 176 palm-down frames.** **No hand on any deck can reach that. A hand in the WATER can** — the water surface
   does not end at the rail — **and that is the path PR #418 measured as broken** (`waveSide` returns before the
   compress reach when the hand key is held; the reach that does run is clamped to a tenth of the hand and carries
   2.66 N). §8 is the stage plan that follows.
2. **THE RIDER CANNOT BEND, SO HE CAN BARELY REACH HIS OWN DECK.** The shoulder sits a median **0.829 m** above the
   deck against an `ARM_LENGTH` of **0.700 m**, so on the shipped rider the deck is reachable on **0 of 2 481 tall
   frames, 1 382 of 2 314 crouch (59.7 %) and 25 of 2 413 compress (1.0 %)** — **1 407 of 7 208 overall (19.5 %), in
   33 of 90 runs — and every one of the 22 windows in 90 rides was a crouch window.** Clip 20's rider gets his hands
   to the deck by **folding his trunk until his hips are above his shoulders**, and that fold is `?trunk=mass`
   (PR #411, open, not merged) and the two-body rider. **So this feature's reach is gated on another PR's geometry**,
   and that is a measured dependency rather than an opinion.

---

## 1. What was built

**One switch, `?saveHands=deck`, and its control `?saveHands=miss`. No force, no torque, no drive, no clock and no
constant of its own.** Two geometry changes on a contact that already exists:

1. **`AttachedRider.project`** — while a palm is on the deck, the box the contact impulse's line of action may meet
   the deck inside grows to that palm's own patch edge, **and only as far as the palm's own strength allows at that
   substep's load**: `extension = span × min(1, cap/N)` with `cap = HAND_FORCE_LIMIT × m g × h`, the engine's own
   hand cap. Off the switch both spans are 0 and the two clamp lines are the shipped ones, value for value.
2. **`AttachedRider.captureStep`** — the same distance is credited to `HumanBalance.capture`'s `reachAcross` /
   `reachAlong`, the parameter that already carries the hip rotor's own angular impulse the same way. ⚠️ **Without
   this the window could not exist at all:** measured on the shipped rider, **68 of 90 falls on the owner's address
   are the capture test (`human.fallen`) and 22 of 90 the contact's posture exit** (0 sway, 0 flight), so the
   contact's box alone would leave three falls in four untouched. **It is the same palm counted once**, the same
   metres in both places.

**The palm has to get there.** It lands at the nearest point of the **deck** under the shoulder — `HAND_TORSO` at
`HAND_TORSO_ANGLE` from the hips, which is `standingHand`'s own construction, on the body's own axes because the body
is banked — with its patch kept on the deck (`|x| ≤ halfWidth(z) − HAND_RADIUS`). **Two distances decide whether it
arrives, and they are different quantities:** the **reach** is from the SHOULDER, because an arm cannot touch a point
further than `ARM_LENGTH` away whatever it does; the **travel** is from where the hand is actually CARRIED, which is
`standingHand`'s own carriage — `ARM_LENGTH` from the shoulder, down and out at `ARM_ANGLE`. It travels at
`SAVE_ARM_SPEED = ARM_LENGTH / ARMS_TIME` = **4.67 m/s**, the engine's own arm length over the balance's own arm
time. It lifts the moment the demand comes back inside the feet. **Nothing holds it down for a set time**, so the
window's length is the solve's answer.

> ☠️ **The first build used the SHOULDER for both distances, which is wrong rather than conservative — and §4.6
> measures the whole bench both ways, because the correction was made AFTER the first build's numbers showed the palm
> landing late, and a change made in that order has to be shown with what it changed.** It roughly doubles the
> palm-down time (90 → 176 frames) and takes `saveCleared` from 1 frame to 14, **and it does not move the verdict:
> `tip` 90 of 90 either way, 90 of 90 falls either way.**

**The trigger is the mechanism's own condition and not a new threshold:** the raw demand (`desiredCop`, the free line
of action's meeting point — the quantity whose leaving the support is what sets `limit = 'tip'`) is outside the feet,
and the side is the side it is escaping toward. ⚠️ One honest lag: `desiredCop` is written by the previous substep's
`project`, so the trigger reads a demand **1/32 of a frame (≈0.5 ms)** old.

**And the palm is drawn where the physics put it** (`renderPoint`), so the hand the rider saves himself with is a
hand he can see. Nothing is drawn off the switch.

### 1.1 Which base, and what was deliberately not touched

**Built BESIDE PR #421, on unchanged `main` at `1a29a6c7`** — not on `claude/body-banks`. So the two PRs are
independent and can be read against each other; the owner's address gains `&saveHands=deck` on top of whatever he
rides.

- **The broken hand path was not used, and not fixed.** PR #418 measured that `waveSide` (`:5719–5732`) *returns
  before the compress reach is considered when the hand key is held*, so holding the key switches the reach off (163
  of 41 328 key-held substeps, 0.39 %, 28 of them dry), and that the reach which does run clamps the hand to
  `REACH_DIP` 0.03 m of a 0.08 m hand and carries a median 2.66 N. **None of that is touched here.** The save's hand
  is a **dry deck contact** built through the support machinery the feet already use, which is why it carries 73 N at
  its median instead of 2.66 N. **`waveSide`'s early return remains a live bug for the hand-drag feature** and it is
  not this PR's to fix — but §8 argues it is now on the critical path.
- **The exposed centre-of-pressure column is not used as the mechanism test** (§6.1), and **#421's reporting fault
  in it was not silently corrected** — it does not exist on this base (§6.1), and correcting it would make the two
  PRs disagree.

---

## 2. The bench, and the seatbelts

**The owner's own address on his own spot.** `rider: 'new'`, `feltFrame: 'deck'`, `riderBody: 'two'`,
`stanceReach: 'keep'`, `deepen: 'on'`; the real Canyon as `?canyonWaves=true` builds it —
`physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2 })`,
`surfZoneConfigFor(settings, 1, true)`, `canyonBed: 'b'`, `compute: 'cpu'` — riders placed on the face 0.75 m inside
the break point at **45° off the fall line**, entry speeds **2, 3, 4, 5, 6, 7, 8, 9, 10, 12 m/s** × three stances ×
three trials = **90 runs an arm**, stick hard over, 4 s horizon.

| seatbelt | reading |
|---|---|
| the wrapper prepends an **OBJECT**, never a bare string | `globalThis.location = { search: '?canyonWaves=true' }`, printed on the first line as `search: ?canyonWaves=true` |
| the grid, read off the solver | **`400x451 = 180400`** — Canyon B's published reference grid (the default Canyon is 400 × 507 = 202 800) |
| the CPU spin-up | **56.35 s** of wall on the first pass, printed per pass |
| the break point | `focusX −112.000, focusZ −125.000` |
| ⚠️ **`SINK=0.06` on every bench** | the flush placement starts the hull dry and the leg unloaded; **frame 1 loaded in 90 of 90 runs here** |
| the frozen window | `separate` (`:5227–5232`) never clears `phase` or `upright`, so **every run is cut at its first `attached == 0`, that frame emitted and nothing after it read.** **7 208 / 7 208 / 7 233 live frames kept** on ships / miss / deck, **90 summaries each** |
| ⭐ **determinism, across two separate builds of the probe** | the shipped arm was run twice, from two bundles built hours apart: **487 076 values over 103 columns, 7 298 rows, 0 differences**, and 90 of 90 outcomes identical |

## 3. ☠️ What a broken result would look like, and the controls that caught two

Named before anything was run, and two of them fired:

| control | what a failure would mean | what happened |
|---|---|---|
| ⭐ **`miss` — the clear-deck control** | the whole reach runs (trigger, travel, geometry, every read-out) with the deck treated as absent. **A difference in any physics column means the gate leaks** | **0 differences in 428 422 values**; the palm went down on 126 frames in 15 runs, in 21 windows, and changed nothing. **This is both the control and the default-unchanged proof** |
| **`tTip` zero on the shipped arm** | the detector is broken (PR #419 read `tip` in 90 of 90) | **90 of 90 runs, and 3 745 of 7 208 frames = 51.96 %.** ⭐ **PR #421 published 52.0 % of frames pinned for the shipped rider on this same address — reproduced to the digit here, on a different instrument and a different base** |
| **`press` non-zero with no palm down** | the palm's load is being read where no palm is | **0 of 7 208 on ships, 0 of 126 palm-down frames on miss**; and the unit test asserts it per frame |
| ☠️ **a filter emptied by a comparison against `undefined`** | a count that cannot fail | ⚠️ **IT FIRED.** This probe's first build counted `press !== 0` without a finiteness guard and read **40 of 40 frames pressed on the shipped arm**, where the field does not exist. Every switch read-out is now `Number.isFinite(x) && …` first, and the fault is recorded rather than smoothed |
| ☠️ **the board's width read unhalved** | a span 2× too wide | ⚠️ **IT FIRED TOO.** `shape.curves.width` is the **full** width (0.464 m), and the probe's first build used it as a half-beam, reading a 0.254 m across span where the deck allows 0.102 m. **Caught by the arithmetic not matching the brief's own prediction**, fixed, and every figure here is from the re-run |
| **the probe is inert** | a read-out that changes a ride | **20 shared columns, 109 470 values, 0 differences** between `PROBE=on` and `PROBE=off`, and **90 of 90 outcomes identical** |
| **the identity test cannot be re-derived after the step** | a confident wrong "pairing is broken" | ⚠️ A first version of the unit test checked the impulse's collinearity with the centre of pressure **on the post-step position** and missed by **1.6 %** — `finish` advances `position` after the solve. The test now checks the **bound the identity implies** instead, which is observable from outside (§4.4) |
| **the escape is only across** | a feature aimed at the wrong axis | measured, and it **is** mostly across: **983 frames only-across, 157 only-along, 92 both** (§4.1). The switch extends both anyway, and the along half is where the room is |

---

## 4. The measurements

### 4.1 Where the demand escapes, and what the deck can offer

| | |
|---|---|
| frames whose raw demand is outside the feet **across** | **1 075 of 7 208 (14.9 %)** |
| … **along** | **249 of 7 208 (3.5 %)** |
| only across / only along / both | **983 / 157 / 92** |
| the demand's excursion past the feet on escaping frames | median **0.0891 m**, and **0.0071 m on the first escaping frame of a run** |
| ⭐ **what a palm's patch edge can add across** | **0.102 m** by arithmetic (`halfWidth 0.232 − feet 0.130`); **0.10194 m measured as the maximum over 176 palm-down frames** |
| … along | **0.178 m measured**, far short of the board's own 0.788 m of room, because the palm lands under the shoulder and the shoulder is over the stance |
| ⭐ **the demand's excursion at the frame the palm LANDS** | **median 0.327 m** — 0.457 m from the stringer, about **2× the board's half-width** |
| `outX > extX` (the escape past what the palm covers) | **159 of 176 palm-down frames** — so on **17** the palm does cover it |
| frames from the **first** demand-outside-the-feet to the fall | median **20 frames = 0.333 s**; **under the arm's own 8-frame travel in 10 of 83 runs** |
| frames from the first `tip` bind to the fall | median **24 frames = 0.400 s**; under 8 in 13 of 90 |

> **The escape an arm can be on time for is a blip too small to matter; the escape big enough to matter is already
> three times past a palm's reach by the time the palm arrives.** The first escaping frame of a run carries a median
> **0.0071 m** and 8 frames later — the arm's own travel — the median is **0.000 m**, the blip gone. The sustained
> asks that actually complete the travel are the ones already running away.

### 4.2 When the palm is down, and for how long

| | |
|---|---|
| palm-down frames | **176 of 7 233 (2.4 %)**, in **16 of 90 runs** |
| by stance | **crouch 176 of 2 339 (7.5 %); tall 0 of 2 481; compress 0 of 2 413** |
| the deck reachable at all (shoulder within `ARM_LENGTH`) | **1 407 of 7 208 (19.5 %)** shipped, **1 443 of 7 233 (20.0 %)** switched — **tall 0 of 2 481, crouch 59.7 %, compress 1.0 %** |
| the shoulder's own height over the deck | median **0.8286 m** over all frames — **0.9958 tall, 0.6700 crouch, 0.7896 compress** — and **0.6246 m** on palm-down frames, against `ARM_LENGTH` **0.700 m** |
| the shoulder-to-deck reach | median **0.8165 m** over all frames, **0.6504 m** on palm-down frames, minimum **0.4054 m** |
| the hand's own travel to the deck | median **0.6559 m** over all frames, **0.6410 m** on reachable frames → **0.137 s** at `SAVE_ARM_SPEED` |
| windows | **22**, in 16 runs (one to three a run) |
| the window's length | median **0.093 s**, longest **0.441 s**; **2.93 s of palm-down time over 90 rides** |
| ⭐ **windows that ended with the demand back inside the feet and the rider still riding** | **2 of 22** |

### 4.3 What the palm carries — and against what

| | |
|---|---|
| palm-down frames carrying load | **111 of 176 (63 %)** |
| **the palm's own normal load** (a **lower** bound: the feet's resultant placed at their own outer edge asks the least of the palm) | median of the loaded frames **73.08 N**; **maximum 286.45 N**, and the cap is reached on **11 frames** |
| the engine's own hand cap, `HAND_FORCE_LIMIT × m g` | **286.5 N** — **the bound is structural**: `pastX ≤ min(1, cap/N)` by the extension's own definition, so `press ≤ cap/h` identically, which is why no frame exceeds it |
| the compress water reach's own force (PR #418, 2 830 loaded substeps) | median **2.66 N**, max 38.4 N |
| the water hand on **this** bench (an independent read) | **522 of 7 233 frames**, median **6.97 N**, max **63.49 N** |
| **the dry palm against the water hand** | **27× at the median, 107× against PR #418's median, 4.5× against this bench's own peak** |
| the statics share actually used, `extX / spanX` | **1.000** — ⭐ the strength bound **never binds on the extension**, because the feet have gone light where the demand escapes; what the cap bounds is the **load** the palm is then read as carrying |

> ⚠️ **And that last row needs its frame stated, because two load columns disagree by 10× here and neither is wrong.**
> On palm-down frames `contact.load` — the step's peak impulse **along the body's own up** — is a median **0.062 body
> weights**, while the substep's **deck-normal** impulse reaches the 286.5 N cap. They are different projections of
> the same contact on a body banked far over, and this document quotes the deck normal for the palm because that is
> what a palm presses along. The leg's own load on those frames is a median **522 N**.

### 4.4 The pairing, and why row 19 is a null

`project` returns the contact impulse on the rider and `pushBoard` applies **its exact negative** to the board at the
rider's own lever, `cross(arm, j)`. That is identically the moment of the same impulse **at the centre of pressure**,
because `project` builds the tangential so the line of action passes through both: `tx = (local.x − cop.x)·N/height`
inverted is `cop.x = local.x − height·tx/N`, which is the next line in the source. **So the palm's share of the load
reaches the board with its full moment through the one pair the engine already has, and there is nothing to pair.**

**The dry palm's own moment about the body**, for scale: median **8.41 N·m**, max **102.2 N·m**, on an approximate
lever of median **0.377 m** (reconstructed from the logged columns, so ±). Against the pitch ankle's median
**71.85 N·m** (PR #418) the peak is 1.4× — **and it is carried, not discarded.**

**The hand-water force is bit-identical on both arms: 522 frames, median 6.97415 N, max 63.4862 N, the same
digits.** ⭐ **And the one hand is never in two places: the palm and the water reach load on the SAME frame 0 times
in 7 233** — the water reach needs Compress and `|bank| ≥ REACH_LEAN` while every palm that went down went down in a
crouch. ⚠️ **That is a measurement on this bench and not a structural guarantee**: `renderPoint` gives the deck palm
priority over the water hand's draw, and nothing in `project` would stop both loading if a sea put them together.

⭐ **A dry palm produces no hydrodynamic hand force at all, so this feature does not make engine-target row 19 live.
Row 19 stays shelved, exactly where PR #418 left it.** The two forces have different normals, frames and
denominators and are never summed here.

### 4.5 What it did to the rides

| | ships | deck |
|---|---|---|
| fell | **90 of 90** | **90 of 90** |
| causes | 89 `balance`, 1 `lost board` | **89 `balance`, 1 `lost board` — unchanged** |
| median ride | **1.3333 s** | **1.3333 s** |
| longest / shortest | 2.7667 / 0.1167 s | 2.7667 / 0.1167 s |
| runs with `tip` | **90 of 90** | **90 of 90** |
| frames with `tip` | **3 745 of 7 208 (52.0 %)** | **3 770 of 7 233 (52.1 %)** |
| the exit that fired | **68 `human.fallen`, 22 posture, 0 sway, 0 flight** | **68 / 22 / 0 / 0 — unchanged** |
| paired cells whose ride moved | — | **9 longer (+0.017 to +0.117 s), 3 shorter (−0.017 to −0.100 s), 78 identical; median delta 0.000 s** |

**All twelve cells that moved are crouch cells — the only stance that can reach the deck.** The largest gain is
**+0.117 s** on `(trial 1, entry 3, crouch)`, 85 → 92 frames; the largest loss **−0.100 s** on `(1, 2, crouch)`,
85 → 79.

> ⚠️ **Do not read the 9 of 90 as a direction.** It is 9 cells of 90 on one spot, one seed, one swell and one stick
> arm, three cells went the other way, and the median delta is exactly zero. **Ruling F rejects survival as a metric
> anyway**, and this round agrees: the quantity that decides the feature is §4.1's 0.327 m against 0.102 m, not the
> ride length.

### 4.6 ⭐ The travel correction, measured both ways — and it does not move the verdict

The first build took the arm's travel from the **shoulder**; the shipped one takes it from where the hand is
**carried**. The shoulder is simply the wrong point — the hand is not there — so the change is a correctness fix with
no free parameter. **It was made after the first build's numbers, so here is the whole bench both ways:**

| | shoulder start (first build) | carried-hand start (shipped) |
|---|---|---|
| the travel distance, reachable frames | median **0.6379 m** | median **0.6410 m** — ⭐ **a ratio of 1.0014, 0.137 s either way** |
| palm-down frames | **90 of 7 230 (1.2 %)** | **176 of 7 233 (2.4 %)** |
| runs with a palm down | **14 of 90** | **16 of 90** |
| windows / cleared | **14 / 0** | **22 / 2** |
| longest window | **0.288 s** | **0.441 s** |
| `saveCleared` frames | **1 of 90 (1.1 %)** | **14 of 176 (8.0 %)** |
| palm load, median of loaded / max | **67.88 / 255.02 N** | **73.08 / 286.45 N** |
| demand at the landing frame | median **0.683 m** | median **0.327 m** |
| **`tip` runs** | **90 of 90** | **90 of 90** |
| **falls** | **90 of 90** | **90 of 90** |
| rides moved | 6 longer, 1 shorter | 9 longer, 3 shorter |

> ⚠️ **Read the first row before the rest: the two travel distances are the same to 0.3 %, because the carried hand
> hangs OUT on the escaping side and has to come back in.** The downstream differences are therefore **not** a
> consequence of a shorter travel; they are the ordinary sensitivity of a chaotic bench to a 3 mm change in when a
> substep's palm arrives. **Which is itself the finding to carry: 90 of 90 falls and 90 of 90 `tip` runs on both
> sides, so the verdict does not rest on the travel model at all.**

---

## 5. ⛔ What this does NOT do, stated plainly

- **It does not stand the rider up, and nothing in it tries to.** There is no clock, no drive, no torque and no
  prescription. `uprightVelocity` was exactly that and step 3.2y retired its whole benchmark; PR #215 was rejected
  for inventing a moment with no limb behind it.
- **It does not give the game a state between riding and wiped out.** The engine has two; clip 20's rider spends
  0.95 s in a third. **This switch does not add one** — it keeps the existing contact alive through a pin that would
  otherwise end the ride. **A re-stand from chest-down is not in this PR and would need the trunk fold first.**
- **It does not touch the hand in the water**, `waveSide`, `REACH_DIP`, `handLoad`, `waterMoment` or any force.
- **It does not change the default.** §6.2.

## 6. Two things about columns

### 6.1 ⚠️ The exposed centre of pressure cannot be the mechanism test — on this base for a *different* reason

A reviewer found that in **PR #421** `freeX` and `tx` include the hip rotor's angular impulse while
`contact.centreOfPressure.x` is reconstructed without it, so the exposed value is the clamped point **plus
`moment/N`** (a constructed example gave 0.14 / 0.13 / 0.18 m). **That fault does not exist on this base**, which was
verified by reading both copies: `main`'s `project` has no `moment` term at all and #421's has it on four lines.

**But the column is still unusable as an unpinning test here, for an arithmetic reason that is worth recording:** on
`main`, `tx = (local.x − copX)·N/height` and then `cx = local.x − height·tx/N`, so **`cx ≡ copX` identically** short
of friction saturation. **The exposed centre of pressure IS the clipped point. Off this switch it can never report an
unpinned demand, so a test built on it cannot fail.** Under saturation it is instead the **post-friction effective
line**'s own intersection — a fourth quantity again. (With the switch on, the clipped point is the *extended* box's,
which is why the exposed column leaving the feet is a sound unit-test assertion and a useless bench metric.)

**This document keeps the four apart everywhere:** the **raw demand** (`wantX/wantZ`, `desiredCop`), the **clipped
support** point (recomputed in the probe), the **post-friction effective line** (`copX`, the exposed column) and the
**actual load** (`load`, `legLoad`, `press`). **The mechanism test is the `tip` flag through `limitTime`, and the
palm's own `saveCleared`.**

### 6.2 The default-unchanged proof

**The `miss` arm against the shipped rider, the same bench, value by value:**

| | |
|---|---|
| matched rows (frames + summaries) | **7 298**, 0 missing |
| shared columns compared | **84** |
| **values compared** | **428 422** |
| **differences** | **0** |
| run outcomes compared on `(fellAt, cause, frames)` | **90**, **0 differences** |

The columns are the unrounded physics: the board's speed and roll, the body's bank and mismatch, the limit and all
four limit timers, the raw demand across and along, the clipped point, the exposed centre of pressure, the load, the
leg load, the capture load, the whole capture state (`across`, `along`, `past`, `beyond`, `weightPast`, `margin`,
`reach`, `fallen`), the sway, the posture error, the flight time, the shoulder and travel geometry, the water hand
and the contact flag.

**Comparing the same two dumps with nothing excluded gives 494 284 values and 7 677 differences, and every one of
them is in a column the switch itself writes** — `down`, `gap`, `engSpanX`, `engSpanZ`, `window`, `cleared` and the
summary counters — **and no physics reads any of them.** `extX`, `extZ`, `press` and `clearedNow` show **no**
differences, because `miss` never extends, presses or clears: that is the control working.

And at unit level, `src/physics/saveHands.test.ts` asserts the same thing on a `PlaneWater` carve: with the palm
going down on the `miss` arm, the position, the orientation, the separation and the centre-of-pressure column are
**equal frame for frame** to the default's.

## 7. ⚠️ The footage, and the line not to blur

Clip 20 is **one instance**, read on 27 consecutive native frames: stance lost ≈4.97, chest-down with the hips above
the shoulders 5.4186, **hands off the deck 5.70 ± 0.05**, standing and riding 5.9022 — **hands-off → tall 0.20 ±
0.06 s, lowest → tall 0.48 ± 0.04 s, lost → tall 0.93 ± 0.06 s** — and **neither hand ever reaches his own shoulder
line** in five gridded frames (−87 to −185 px). Clip 19 is the one instance on the other side: the board passes his
head and he throws both arms **up and out**. **One each, no third.**

**This round's numbers are not a hit or a miss against the 0.93 s, because they are not the same event.**

- **Clip 20 is an assisted recovery from a lost stance in a whitewater section** — a pitch collapse, hips over
  shoulders, mid-ride. **That is distinct from carrying speed through a clean bottom turn**, and it is distinct again
  from the owner's own complaint, which is about falling a second after standing. **Clip 20 has no take-off at all.**
- **The engine's fall on this bench is a ROLL tip** (PR #419: the deck banks past 20° in 0.68 s, the body does not
  bank with it, the 0.260 m support allows 10.9° of mismatch), and §4.1 measures the escape as across on 983 frames
  of 1 075. **The deck is the narrow direction for a roll and the wide one for a pitch.** The footage's save is on
  the axis where a deck palm has room; the engine's fall is on the axis where it has 0.102 m.
- **The engine has no "lost stance" state to recover from.** Whatever this switch does, it does to a rider who is
  still standing.

**The only comparison this round will make:** clip 20's rider has his hands down about **0.10 s** after his stance
goes and holds them **0.65 s**; this build's palm lands after a **0.137 s** travel (derived, not fitted) and the
window it holds is a median **0.093 s** and at most **0.441 s**. ⚠️ **One instance against 22 windows, on different
events.**

## 8. The stages that follow, in the order the measurements put them

**Nothing below is built, and the owner rules.**

1. ⭐ **THE HAND IN THE WATER, not on the deck — and fixing the path PR #418 found broken.** §4.1's 0.327 m at the
   landing frame is 0.457 m from the stringer, outside the board, and **water is there.** A loaded hand on the water
   extends no support polygon, but it carries a real force at a real lever — which is why **`waveSide`'s early return
   is now on the critical path**: with the key held the compress reach is switched off and the wave-side test it
   substitutes passed on 0.39 % of substeps. **Fixing that is one PR and it is the one this round's own failure
   points at.** ⚠️ And it is the force class the owner must rule on, because at a loaded water hand engine-target
   row 19's discarded moment **does** become live — 180–260 N·m by PR #418's own extrapolation. **That ruling is
   needed for the water hand and NOT for this one.**
2. ⭐ **The trunk fold, so the hand can reach the deck at all.** The shoulder is 0.829 m up and the arm is 0.700 m;
   `?trunk=mass` (PR #411, open) is what lets the chest come down over the deck. **Until something folds, this
   feature lives in a crouch** — 0 of 2 481 tall frames could reach the deck.
3. **The palm earlier, on the escape's RATE rather than its value.** The sustained ask that completes a 0.137 s
   travel is already 0.327 m gone; an anticipatory brace is what clips 14 and 16 both reproduced (*"the brace is
   anticipation, not a reaction after contact"*). ⚠️ **This is where a save would stop being geometry and start
   being a predictor, so it needs a design and probably a ruling.**
4. **Both hands.** Clip 20 uses two. This build uses one, on the escaping side.
5. **The rail, which can PULL.** A hand hooked under the rail can carry a force the deck cannot — `PRONE_GRIP`
   already models exactly that for the prone contact. **That is a new force on the standing rider and is the
   owner's.**
6. **A third rider state.** Clip 20's 0.95 s chest-down passage has no representation in the engine at all.

## 9. Files

| file | what it is |
|---|---|
| `src/physics/AttachedRider.ts` | the switch: `saveHands` (the option's own doc carries the derivation), `saveStep`, two clamp lines in `project`, two guarded arguments in `captureStep`, one drawn palm in `renderPoint` |
| `src/physics/saveHands.test.ts` | six tests: nothing by default, `miss` bit-identical with the reach running, the deck's own ceiling, the strength bound, the centre of pressure past the feet only with a palm down, and the option's values |
| `src/game/PhysicalMode.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`, `src/physics/RideSession.ts`, `src/main.ts` | the `?saveHands=deck|miss` plumbing, pinned to the default in an online room |
| `docs/research/new-rider/3.5/save.ts` | the probe: the arms, the four meanings kept apart, the controls, `MODE=cmp` |
| this file | the round |

**To ride it:**
`?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&saveHands=deck`
— and **the palm will only appear in a crouch**, which is §0's second finding and not a bug.
