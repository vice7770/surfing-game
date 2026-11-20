# Does the drawn chest clip at `twistMost`? — the measurement

Reader: `docs/research/new-rider/3.5/twistclip.ts`. Gathered 2026-11-20 on branch
`claude/draw-the-twist` off `claude/ride-everything` (`178207c0`). Raw arm outputs beside this file.

## The claim this replaces

It was published that `RIG_DETAIL.cascade.twistMost = 45` (`HumanoidRig.ts:315`) "clamps the drawn chest
and hips to 45° of twist", so during ordinary riding "the drawn torso sits saturated" while the physics
twists past 50°. **That mechanism is wrong, and three independent things say so:**

1. **The arithmetic.** At `HumanoidRig.ts:990–1002` the chest starts at the key pose's own `this.pose.chest`
   and the clamped turn is *added* to it (`chest += chestTurn`). `twistMost` bounds the **turn
   contribution**, never the final drawn chest.
2. **An existing test.** `src/scene/rig/stanceTurns.test.ts:145–152` asserts the drawn `chestTwist` is
   **70–110°** in the frontside top turn. The final pose already exceeds 45° by design.
3. **This measurement.** The final drawn chest off the board's nose runs to ±169° (table below).

The whole block is also inside `if (state.phase === 'standing')`, with `chest = upright ? this.pose.chest : 0`
above it, so it says nothing about a prone or landing pose and cannot explain a prone gaze.

**So a gap between the physics twist and 45° is not a rendering error, and this folder does not treat it as
one.** The question the reader actually asks is narrower and is the only one worth asking: *does the clamp
clip the final drawn chest — after the key-pose sum, after `chestFollower` and `aimFollower` — during a ride?*

## How it is measured

The ride is run once and **every drawn frame is recorded**, then replayed through two independent real rigs
(`PosedBody` on `createTestHumanoid()`, read by `StanceGauge` — the project's own instrument): one at the
shipped `twistMost = 45`, one with the clamp lifted to 100 000° so it cannot bind. Nothing is subtracted from
45; the two arms differ in exactly one constant, and **the difference between their final drawn chests is the
clipping**, after the followers rather than argued before them. The lifted arm is an instrument reference, not
a proposed behaviour.

Rides are the folder's own sea placement (as `bank.ts MODE=sea`): the real Canyon bed B as
`?canyonWaves=true` builds it (seed 1, medium swell, mid tide, calm, midday; solver grid **400 × 451 =
180 400 cells**, which is the Canyon B seatbelt — the default Canyon is 400 × 507), rider placed standing
0.75 m ahead of the break point at side −45°, 3 s a run, the stance and the stick held. Entries 4/6/8/10 m/s
× sticks 0/0.5/1 × stances tall/crouch/compress × 2 trials = **72 runs an arm**.

## Arm 1 — the old rider (the shipped default): a clean null

`RIDER=old`, raw in `old-rider-control.txt`.

| quantity | n | result |
| --- | --- | --- |
| runs | 72 | 38 of 72 fell inside 3 s |
| standing frames | 11 442 | — |
| `\|state.twist\|` (the physics twist the rig is handed) | 11 442 | **median 0.00°, range 0.00–0.00°** |
| frames with `\|twist\|` past 45° | 11 442 | **0** |
| `\|lifted − shipped\|` drawn chest | 11 442 | **median 0.00°, range 0.00–0.00°** |
| frames clipped by more than 0.5° | 11 442 | **0 (0 %)** |
| `\|lifted − shipped\|` hips, head | 11 442 | **0.00–0.00°** both |

**"Clean null" means exactly this: on 11 442 standing frames over 72 runs, lifting the clamp changed the drawn
chest, hips and head by 0.00°.** The clamp cannot bind on this arm in this population, and the reason is in
the physics, not the drawing: off the rotation stick the old twist rotor rests at 0 (`AttachedRider.twistStep`,
`:4022` — `rotate` is `NaN`, so `asked` is 0), and the yaw-rate anticipation term never reached the clamp either
(`|blend · 0.3 · yawRate|` median 7.04°, **peak 38.89°**, against the 45° clamp).

⚠️ **This null is for a rider who touches neither the rotation stick nor Snap.** It is not a statement about
all old-rider play: `rotate` at full deflection asks for `TWIST_RANGE = 45°` exactly
(`AttachedRider.ts:557`, hard-clamped at `:4039–4041`), and `snapAim()` winds the shoulders to
`SNAP_DRIVE_TURN = TWIST_RANGE = 45°` (`:1197`, `:4068`). At either of those the drawn clamp sits exactly on
the physical range and **any** yaw rate of the same sign puts the sum over it. The reader takes `SNAP=` and
`ROTATE=` for those arms; **they have not been run.**

## Arm 2 — the new rider at the owner's address

`RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on`, i.e.
`?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`. Raw in
`new-owner-address.txt`.

| quantity | n | result |
| --- | --- | --- |
| runs | 72 | **61 of 72 fell inside 3 s** |
| standing frames | 7 956 | — |
| `\|state.twist\|` | 7 956 | median **17.06°**, range 0.00–**58.23°** (q1 6.14, q3 36.61) |
| frames with `\|twist\|` past 45° | 7 956 | 1 380 |
| drawn chest, shipped | 7 956 | median −37.70°, range **−169.25 … +119.50°** |
| drawn chest, clamp lifted | 7 956 | median −37.53°, range −169.25 … +122.82° |
| `\|lifted − shipped\|` (the clipping) | 7 956 | median **0.00°**, range 0.00–**18.88°** (q3 0.00) |
| frames clipped by more than 0.5° | 7 956 | **1 297 (16.3 %)** |
| …the clipping on those frames | 1 297 | median **2.94°**, range 0.50–18.88° (q1 1.42, q3 6.31) |

**The ordinary-riding split, which is the headline.** 61 of 72 runs end in a fall inside 3 s, and the frames
just before one carry board roll past any rail and yaw rates no rider asks for — a clip that only happens
while the rider is already going over is not a riding defect. Restricting to `|board roll| ≤ 45°` **and** an
unclamped turn `≤ 60°` leaves **7 062 of 7 956** standing frames, and the clip survives the filter:

| quantity | n | result |
| --- | --- | --- |
| frames clipped by more than 0.5° | 7 062 | **825 (11.7 %)** |
| …the clipping on those frames | 825 | **median 2.36°, range 0.51–16.15°** (q1 1.26, q3 5.23) |
| …`\|twist\|` on those frames | 825 | median 48.67°, range 0.79–56.68° |
| …of those, where the **physics twist alone** is already past 45° | 825 | **509 (61.7 %)** |
| `\|board roll\|` over all standing frames | 7 956 | median 5.2°, range 0.0–89.6° (q1 1.9, q3 20.2) |

**So: the final drawn chest tracks the physics twist exactly on 88.3 % of ordinary riding frames, and on the
other 11.7 % it falls short by a median 2.36° and at worst 16.15°.** On about three fifths of the clipped
frames the term that goes over the clamp is the solver's own twist, not the yaw-rate anticipation the clamp
was written to bound (`|blend · 0.3 · yawRate|` median 2.60°, `|blend · twist|` median 17.03°). Whether
2.36° is visible is the owner's call, by eye; this folder does not claim it is.

**Side effects of lifting the clamp**, same frames: the hips move by 0.00–**7.27°** (median 0.00°) and the head
by 0.00–**19.53°** (median 0.00°). The head is not incidental — `HumanoidRig.ts:2555` holds the look within
`neckTurn` 90° of *where the chest is turning to*, so the head currently absorbs part of the surplus and would
stop having to. Any change here has to be judged on the head as well as the torso.

**Determinism check:** this arm was run twice (the first raw file was lost to an overwrite). Every number
shared by the two runs reproduced to the printed precision.

## Why the two arms differ at all

The constant and the physics it was matched to came apart under step 3.2e, and this is the whole history:

| when | what | `twistMost` | the physics twist's range |
| --- | --- | --- | --- |
| `864bb7f0` 2026-09-27 | born as a cap on `twistGain (0.25 s) · yawRate` — the **anticipation lead** alone; `state.twist` did not exist in the expression | 35 | — |
| `7e3b83a8` 2026-09-30 | the pad's twist added **into the same capped expression** | 35 | `TWIST_RANGE` = 45° (hard clamp) |
| `bac168c9` 2026-10-20 | the anticipation cascade; its comment says it "replaces … the snap's extra 45°" | **45** | `TWIST_RANGE` = 45° (hard clamp) |
| step 3.2e (the new rider) | the twist becomes a solved body degree of freedom; `tb.angle` is copied into `this.twist.angle` **with no clamp** (`AttachedRider.ts:5208`) | 45 (untouched) | `TWIST_BODY_RANGE` = 0.87 rad = **49.85°**, and only a **soft** end stop (`TWIST_STOP`) past it |

**45 is not a mesh limit.** `twistMost` appears in exactly three places in the repo, all in `HumanoidRig.ts`
(`:302`, `:315`, `:994`); no comment, commit message or document anywhere ties it to mesh deformation. It is
an animation bound on how far the drawn body may lead the board, which `bac168c9` happened to set equal to the
old rider's hard physical twist range — which is why it was a clean null — and the new rider moved that range
out from under it.

## Reproducing

```sh
SP=<scratch>
./node_modules/.bin/rolldown docs/research/new-rider/3.5/twistclip.ts -o "$SP/tc.mjs" --format esm --platform node
RIDER=old                                        SECONDS=3 TRIALS=2 node "$SP/tc.mjs"   # arm 1
RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on SECONDS=3 TRIALS=2 node "$SP/tc.mjs"  # arm 2
```

Seatbelts for the branch: `tsc -b` exit 0; `tsc -p tsconfig.reader.json --noEmit` exit 0 (the project's own
`tsconfig.json` includes only `src`, so a reader under `docs/` is otherwise never type-checked);
`vitest run src/scene/rig --reporter=tap-flat` exit 0, **263 ok / 0 not ok** (`seatbelt-vitest-rig.txt`).
Every exit code above was read directly from the command, never through a pipe. The full suite was **not**
attempted: `npm test` includes `src/wave/SurfZoneSimulation.test.ts` and will not finish.

Nothing in `src/` is changed by this branch. The reader mutates `RIG_DETAIL.cascade.twistMost` in process and
restores it in a `finally`.

## What is NOT established here

- **No pictures.** Nothing in this folder says whether the mesh still looks like a person with the clamp
  lifted, and nothing says whether 2.36° is visible. Both are judged by eye and neither was attempted.
- **No old-rider Snap or rotation-stick arm**, so arm 1's null covers only a rider using neither.
- **No paddle-and-pop-up ride.** The rider is placed standing, as this folder's sea arms place one, with the
  stance and the stick held for the run. 61 of 72 runs fall inside 3 s, so the population is short rides.
- **One seed, one swell, one spot.** Seed 1, medium, Canyon bed B.
- **A proposed fix is not a measured one.** If the clip is to be closed, the smallest change consistent with
  the history above is to clamp the **anticipation term only** (`cascade.chest · yawRate`) and let
  `state.twist` through, which is what `864bb7f0` wrote the constant for. Two things argue against doing that
  blind: `tb.angle` has only a **soft** end stop, so the drawing would have no hard bound (the peak measured
  here is 58.23°, not a guarantee), and the head moves with it. Neither is settled by this folder.
