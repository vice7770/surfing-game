# `?trunk=mass` and the DRAWN trunk — the thing both benches could not see

**Measurement only. No behaviour, constant or switch was changed by this round.**

The owner rode `?trunk=mass` and said:

> *"trunk=mass messes up the balance completely and the surfer just falls imediatly after starting the ride."*

Two benches then said the switch does not change the fall. PR #426 (placed riders): `tip` 90/90 either way,
ride and roll peak unchanged to every decimal. PR #429 (a real take-off, two seeds): fall times identical run for
run. **Both are right, and so is he.** They measured the physics. The switch is a *drawing* change, and it is a
very large one.

---

## 1. The source claim — CONFIRMED, with one correction

On `claude/ride-all-three`, `src/scene/rig/HumanoidRig.ts`:

- `:1417–1418` — `this.physicsTrunk = RIG_SWITCHES.trunk === 'mass' && state.phase === 'standing';`
  followed by `if (this.physicsTrunk) wanted = 0;`
- `:1979` — `const back = angle <= 0 || this.physicsTrunk ? 0 : this.backForMass(state, angle);`

So on **every standing frame** the switch sets the key pose's hinge target to zero and stands `backForMass` down.
Read live off the running rig (`breaklinePhysical.surfer.skinnedSurfer.body.rig`) on the owner's own address:

| arm | standing frames | `physicsTrunk` | `hingeAngle` (°) |
|---|---|---|---|
| without `&trunk=mass` | 3 | `false` on 3 of 3 | 32.1 → 36.7, **rising** with the stand |
| with `&trunk=mass` | 24 | `true` on 24 of 24 | 31.1 → **0.91**, falling to zero as the stand completes |

**The correction to the brief.** `wanted = 0` does *not* instantly delete the fold. `hingeAngle` is followed and
rate-limited, so the fold the landing carried in walks out smoothly over roughly 0.4–0.6 s of standing — exactly as
the code comment at `:1405–1409` says it will. The end state is the same (0.9–2.2° once `standingBlend` reaches 1),
but "DELETE" overstates the first few frames.

## 2. The drawn trunk, live, on the owner's address

Branch `claude/ride-all-three`. Address
`?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&armCarry=on`,
once with and once without `&trunk=mass`, nothing else changed.

**The metric is independent of the code path under test.** It is computed from the posed bones' world matrices
(`mixamorigHips`, `mixamorigSpine`, `mixamorigNeck`, `mixamorigLeft/RightShoulder`) and the board's quaternion.
It never reads `wanted`, `hingeAngle` or `physicsTrunk`. Positive = leaning toward the toes, negative = onto the
heels, both from the world's vertical.

*A broken measurement would read constant, NaN, or would not move with the pose.* It varies over 24° within the
OFF arm alone and tracks `standingBlend` monotonically in the ON arm, so it is live and it can fail.

Fully-stood frames only (`standingBlend ≥ 0.9`), gathered over **four take-offs per arm**:

| arm | frames | take-offs | spine→neck, ° | shoulders→hips, ° | range (spine) |
|---|---|---|---|---|---|
| **without** `&trunk=mass` | 7 | 4 | **+39.8** | **+41.6** | +28.7 … +52.3 |
| **with** `&trunk=mass` | 14 | 4 | **−0.4** | **+2.5** | −5.2 … +3.7 |

**The two populations do not overlap anywhere.** The gap is about 40°, against a within-arm spread of 24° (OFF)
and 9° (ON).

The walk-out, frame by frame, with the switch on (one take-off, drawn shoulders→hips):

```
sb 0.58  13.3°   sb 0.80   9.4°   sb 1.00   2.5°   sb 1.00   0.5°   sb 1.00  −0.3°
```

He stands up and then slowly unfolds to plumb. Without the switch the same stand goes the other way — the drawn
fold *deepens* as the stand completes (35.7° → 43.3° over one take-off).

## 3. The headless sweep — exactly matched, 22 ride poses

The live arms are two populations, not paired frames (see §5). This sweep is exactly matched: the same drawn
state, the real rig and the real `STANCE_RECIPES`, with `RIG_SWITCHES.trunk` as the **only** difference. Drawn
shoulders→hips from the world's vertical, toward the toes (+) or heels (−). Regular and Goofy gave identical
magnitudes, so one row each. Two folds were handed to the rig: none, and 5.5° — the hip rotor's measured live
standing range from PR #429.

| pose | OFF, ° | ON, ° | change |
|---|---|---|---|
| trim | +16.2 | +1.0 | −15.2 |
| trim-forward | +17.2 | +1.0 | −16.2 |
| trim-back | +15.6 | +1.0 | −14.6 |
| trim-frontside | +27.7 | +13.0 | −14.7 |
| **trim-backside** | **+4.6** | **−12.4** | **−17.0, through plumb onto the heels** |
| drop | +37.5 | +1.7 | −35.8 |
| compress-frontside | +76.4 | +61.6 | −14.8 |
| compress-backside | −56.1 | −56.1 | 0.0 |
| extension-frontside | +59.5 | +35.6 | −23.9 |
| extension-backside | −26.5 | −32.5 | −6.0 |
| **top-turn-frontside** | **−14.1** | **−36.0** | **−21.9, further onto the heels** |
| top-turn-backside | +63.4 | +37.0 | −26.4 |
| **snap-frontside** | **−8.4** | **−30.1** | **−21.8** |
| snap-backside | +57.7 | +31.3 | −26.4 |
| **cutback-frontside** | **−7.8** | **−34.1** | **−26.4** |
| cutback-backside | +64.0 | +33.2 | −30.8 |
| pump-compression | +34.2 | +1.6 | −32.6 |
| pump-extension | +20.4 | +1.3 | −19.1 |
| hand-in-face | +81.5 | +51.2 | −30.3 |
| tube-frontside | +48.8 | −3.0 | −51.8 |
| tube-backside | +48.8 | +0.2 | −48.6 |
| kick-out | +16.0 | +1.4 | −14.6 |

The drawn hips also move 0.02–0.18 m between the arms — that is `backForMass` standing down, the second owner of
the pelvis being removed, as intended.

## 4. What this actually is — and it is not "upright"

**The headline the brief expected was too kind, and the sweep refutes it.** `?trunk=mass` does not make the rider
stand upright. It welds the drawn trunk to **the body's own axis**, which is the board's. The signature is in the
turn rows: with the switch on, `top-turn-frontside` and `top-turn-backside` land on −36.0° and +37.0°, and
`snap`/`cutback` likewise come out as near mirror images. Those are the same number with opposite signs because
the drawn trunk is no longer folding over the toes at all — it is simply standing normal to a rolled deck, so it
reports whatever the board's roll is.

So there are two different wrong-looking riders in one switch:

1. **On a flat or lightly rolled board** — trim, drop, pumping, the tube tuck — the 16–49° fold is gone and he
   stands bolt upright. That is the brief's hypothesis, and it holds.
2. **On a rolled board** — every frontside turn — he does not straighten, he *falls back onto his heels*, by 30–36°
   where before he was within 8–14° of plumb. `trim-backside` crosses plumb entirely, +4.6° → −12.4°.

Either one reads as "the balance is messed up". The second is the uglier of the two and nobody had looked for it.

## 5. What this does not show, and what could still refute it

- **The screenshot pair asked for could not be taken.** At the default camera the rider is about 25 px tall, and a
  stand lasts well under a second of simulated time; with the browser pane throttled the screenshot round-trip
  missed the standing window every time. The drawn points are the quantity and a picture was only the convenient
  way to see it, so this fell back to reading them, as the brief directs. **Nobody has yet seen these two riders
  side by side in a picture** — the owner's eye is still the open check.
- **The live arms are not matched run for run.** Four take-offs each, same spot, same address, same scripted input,
  but a different sea clock, and the fully-stood frames differ in speed (0.18–0.94 m/s OFF against 1.86–2.44 m/s
  ON) and in climb. They are two populations, not paired frames. The 40° gap is far larger than either spread, and
  the exactly-matched sweep in §3 gives the same answer across 22 poses, but a matched-frame live comparison has
  not been made.
- **The fall itself is untouched here.** Standing windows were short in *both* arms (2–8 frames per take-off),
  which is consistent with PR #429 and with the owner falling quickly either way. **This round measured the drawing
  and says nothing new about why he falls.** If his "falls immediately" is a *separate* complaint from "messes up
  the balance", this finding does not explain it.
- **The population is small where it is live.** Seven OFF and fourteen ON fully-stood frames. The sweep carries the
  weight; the live arms show the mechanism is real on his own address.

## 6. How it was measured

Live: `?physical` exposes `globalThis.breaklinePhysical`. A `requestAnimationFrame` hook read the posed bones'
world matrices and `riderState` on every frame with `phase === 'standing'`, and the rides were driven by synthetic
key events. Nothing in the game was modified. Note that `AttachedRider.separate` never clears `phase`, so only live
frames were taken — every sample above has `phase === 'standing'` read on the frame it was drawn.

Headless: the rig was driven exactly as `src/scene/rig/trunkMass.test.ts` drives it — `createTestHumanoid` +
`PosedBody` + `StanceGauge.joints()` over `STANCE_RECIPES` — with `RIG_SWITCHES.trunk` the only variable.

The browser pane must be **shown and the tab fronted**, or the game does not advance at all: with the pane hidden
the simulation clock measured **0.00 s of advance in 2 s of wall time**, and even fronted it ran about 22× slower
than real time. That is sharper than the standing note that a hidden pane runs at ~1.5 fps — hidden, it does not
run.
