# Step 3.5b — the crouch collision, diagnosed: Compress reaches its depth in full, and it is the TALL stance that moved

Written 2026-11-17 by a diagnosis round (Opus 5) on branch `claude/crouch-collision-diag`, cut from `main` at
**6273f2ea**. **Read-only: nothing under `src/` or `server/` is touched, nothing was built into the game and nothing
was ridden.** Step 3.5a is editing the rider's stance and bank handling in the main checkout at the same time, so this
round ran in a separate worktree and adds this document, one probe (`3.5/depth.ts`) and its outputs
(`3.5/results/`) — nothing else. **A fix, if the owner wants one, belongs to a later round once 3.5a has merged.**

Tags as in 3.2–3.5: **[M]** measured by this round's probe; **[R]** read in the code, with file and line; **[S]** from
a source; **[I]** inferred from a model that is stated.

---

## 0. The answer in eight sentences

1. **Problem A is not an achievement bug, and the brief's premise is refuted.** On `?rider=new`, Compress's commanded
   depth is **0.300 m** of leg shortening and the leg reaches **0.300–0.333 m** at the median in **6 of 6 runs**, with
   the body's own centre of mass at **0.300–0.329 m** and the spring's deflection (`rest − got`) at **0.000–0.003 m**
   [M]. **The new rider achieves 100–111 % of what it is told, not a fraction of it.**
2. **The mechanism, in the brief's own three categories, is a fourth one: the command arrives, is followed, and the
   datum moved.** Compress's hips sit at **0.451–0.480 m over the deck on `?rider=new` against 0.481–0.482 m on the
   default rider** — the same stance to within 0.031 m [M]. What differs is **tall**: **0.518–0.777 m on the new rider
   against 0.780–0.781 m on the default**, because the balance's own knee drop has already crouched it [M].
3. **The cause is one line of the design's table, and it is a read, not an inference.** `stanceRoom(0).kneeTravel` is
   **0.30 m, which *is* `CROUCH_DEPTH`** [R, `humanBalance.ts:160`, `AttachedRider.ts:1014`], and `prepareLeg` adds
   the correction's share on top of the command: `asked = Math.min(asked, -(heldDepth + human.knees × travel))`
   [R, `AttachedRider.ts:4088`]. So a **standing** rider at `knees` = 1 is asked for Compress's whole depth with
   nothing pressed, and pressing Compress then adds only `knees × stanceRoom(0.30).kneeTravel` = **0.05 m**.
   **This is step 3.3f's finding, independently reproduced here on a probe written from scratch** (§2).
4. **Step 3.3e's published figures reproduce exactly — and only on its own dead-frame window.** On the identical cell,
   with the frames after the rider has come off included as 3.3e included them, the tall → Compress drop is
   **0.025 / 0.045 / 0.047 / 0.115 / 0.188 / 0.250 m**, i.e. **0.025–0.115 m in 4 of 6**, which is 3.3e's published
   band to the thousandth at both ends; and the default rider's is **0.300–0.332 m in 6 of 6** against its published
   0.300–0.336 [M]. **Dropping the dead frames — 0.64–0.93 of that window on the new rider — gives 0.066–0.297 m in
   6 of 6** [M]. **3.3e's arithmetic was right and its window was wrong**, exactly as 3.3f said.
5. **Nothing in the chain clamps, scales, filters or rate-limits the depth downward.** The feet-only-push `slack`
   clamp (`AttachedRider.ts:4137`) binds in **0.00 of live ticks in all three stances** on the new rider [M]; the
   descent is **faster** on the new rider than the default (commanded depth reached at **0.600–0.717 s against
   0.767–0.817 s**) [M]; and once reached it is never lost (the deepest shortfall after first arrival is **0.005 m**,
   in 1–11 ticks of 31–164) [M]. **`stanceAt`'s 0.30 m clamp is a ceiling and, as the brief says, cannot under-deliver
   a depth** — but it is **already being hit today** (§3.4).
6. **One new measured fact, which the brief did not ask for and which bears on Problem B's cost:** on the shipped
   `?rider=new`, the leg's **achieved** depth is past `stanceAt`'s 0.30 m ceiling in **0.28–0.95 of Compress's live
   ticks in 6 of 6 runs**, and 0.006–0.417 of Crouch's [M], because the knee drop adds up to 0.044 m on top of
   Compress. **The fourth-`STANCE_TABLE`-row question is live today**, not only if a new deep rung is built.
7. **Problem B is a different problem wearing the same name, and the two do not merge.** Problem A is a **collapsed and
   non-deterministic** ladder (the measured rungs on the owner's own rider are tall **59–88 %**, Crouch **56–66 %**,
   Compress **51–55 %** of the game's straight leg, overlapping) [M]; Problem B is **where the four nominal rungs
   should sit** against the footage's three bands. **Fixing A does not choose B, and choosing B does not fix A** —
   whichever depths are picked, they will be ridden on a rider whose tall stance wanders over 90 % of Compress's travel
   until A is settled.
8. **Four options for B are laid out in §4 with what each costs and what each breaks. No recommendation is picked, and
   none should be read into the ordering.** The one thing §4 settles rather than opens is that `kneeStrength` already
   weakens with depth on geometry alone (3.0 / 2.25 / 2.1 / 1.9 body weights) [R], so **every option inherits a
   self-releasing deep rung for free, with no stamina or fatigue system anywhere** — the owner cancelled that, and
   nothing here proposes it.

---

## 1. The three quantities, named once, so no number below is in the wrong frame

This track has had twenty-one frame errors, the latest being `STANCE_TABLE`'s centre-of-mass height used as a hip
height in three documents. Every column in this round is one of these four, and each is named at every use.

| # | Quantity | Where | Values | What it actually is |
|---|---|---|---|---|
| 1 | **the commanded depth** (`cmd`) | `AttachedRider.ts:4074`, `heldDepth` at `:4078` | 0 / 0.195 / **0.300** / 0.45 m | The **leg spring's rest-length shortening the player's button asks for**, m. `prepareLeg`'s `held × CROUCH_DEPTH`. `heldDepth` is private, so this probe recomputes it from the same inputs, and the recomputation is checked against the default rider's own `leg.rest`, which is **0.300 m flat in 6 of 6** Compress runs [M]. |
| 2 | **the asked depth** (`target`) | `AttachedRider.ts:4088` | 0.300–0.344 m in Compress [M] | Quantity 1 **plus the balance's own knee drop**: `heldDepth + human.knees × stanceRoom(heldDepth).kneeTravel`. Still a rest length, not a position. |
| 3 | **the held rest** (`rest`) | `AttachedRider.leg.rest` (`:2026`, public) | 0.300–0.333 m in Compress [M] | The **rest length the leg actually holds**, after the acceleration limit, the speed limit, the `tallest`/`deepest` window and the feet-only-push `slack` clamp. |
| 4 | **the achieved depth** (`got`) and **the hips** | `AttachedRider.leg.extension`; `riderPosture.ts:100` + `AttachedRider.ts:3852` | `got` 0.300–0.329 m; hips 0.451–0.480 m [M] | `got` is **where the body's centre of mass actually is along the leg**, m below the riding stance — the one quantity with a position in it. The **hips** are `0.78 + leg.extension`: the pelvis above the deck, 0.78 m being `riderPosture`'s placed standing pelvis, which `AttachedRider.legDrive` itself reads as `parts[1] − base.y` and which is a **constant** (the crouch never rewrites `parts`). |

**And the two this round does *not* use as depths**, because they are different physical quantities:
`STANCE_TABLE[].height` (0.84 / 0.65 / 0.55 m, `predictiveBalance.ts:554–557`) is the **whole body's centre of mass
above the feet** and the balance plant's **pendulum length**; `leg.height + leg.extension` is that same CoM height
measured live. Neither is a hip height, and neither is a depth. `3.5/stance-frame.md` §1 has the full ledger.

---

## 2. Problem A, measured: the whole chain, link by link

### 2.1 The cell, which is step 3.3e's own

The **Canyon-matched** `FaceWater` — 1.4 m, 2.6 m deep, 16°, 5.7 m/s, PR #223's fit to Canyon B's arm, **a fit to
Canyon, not Canyon** — the board placed 0.75 face lengths onshore of the crest 45° off the fall line, the stance held
and the stick over from the first frame until the board is 85° round, then centred. **Three entry speeds (0, 1.5,
3 m/s over the face's own) × two sticks (0.5, 1) = six runs a stance a rider**, 9 s each, columns from 0.5 s to clear
the mount transient. Stances: tall (`crouch` 0, `compress` 0), Crouch (`crouch` 1), Compress (`crouch` 0.6,
`compress` 1) — 3.3e's own inputs.

**The fall test is corrected.** `AttachedRider.separate` (`:5117–5126`) sets `attached`/`separation` and **never
`phase` or `upright`**, so 3.3e's `!upright || phase !== 'standing'` never fires for a balance fall and every rider
column freezes [R, and 3.3f §1]. This probe breaks on **`!rider.attached`**, and reports **both** windows so the
artefact can be read instead of argued about. **Every run falls: 6 of 6 on `?rider=new` at 1.12–3.60 s and 6 of 6 on
the default rider at 2.47–6.38 s** [M].

### 2.2 The chain, on `?rider=new` (live frames; 6 runs a stance; all depths in metres of leg shortening)

| stance | `cmd` | `stanceRoom` knee travel | `knees` (median per run) | `target` | **`rest`** | **`got`** | **hips, m** | `rest − got` | on the `slack` clamp | past `stanceAt`'s 0.30 | fell, s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tall | 0.000 | 0.300 | 0.01–1.00 | 0.003–0.299 | 0.003–0.270 | 0.003–0.262 | **0.518–0.777** | −0.001–0.018 | 0.00 | 0.00 | 1.20–3.18 (6/6) |
| Crouch | 0.195 | 0.150 | 0.01–0.87 | 0.197–0.325 | 0.197–0.289 | 0.196–0.287 | **0.493–0.584** | 0.001–0.010 | 0.00 | 0.006–0.417 | 1.32–3.60 (6/6) |
| Compress | 0.300 | 0.050 | 0.01–0.88 | 0.300–0.344 | **0.300–0.333** | **0.300–0.329** | **0.451–0.480** | 0.000–0.003 | 0.00 | **0.28–0.95** | 1.12–3.35 (6/6) |

### 2.3 The same chain on the default rider, which is the control

| stance | `cmd` | `knees` | `target` | `rest` | `got` | **hips, m** | on the `slack` clamp | past 0.30 |
|---|---|---|---|---|---|---|---|---|
| tall | 0.000 | **0.00** | 0.000 | 0.000 | −0.001–0.000 | **0.780–0.781** | 0.00–0.10 | 0.00 |
| Crouch | 0.195 | 0.00 | 0.195 | 0.195 | 0.193–0.195 | **0.585–0.588** | 0.00 | 0.00 |
| Compress | 0.300 | 0.00 | 0.300 | 0.300 | 0.298–0.299 | **0.481–0.482** | 0.00 | 0.00 |

**Read the two tables against each other and the answer is in one row.** Compress's **hips are the same stance on both
riders** — 0.451–0.480 against 0.481–0.482 m, a difference of **0.001–0.031 m**, which is a tenth of the button's
travel. **Tall is not**: 0.518–0.777 against 0.780–0.781 m. **The button delivers; the datum it is measured from
moved.**

### 2.4 The brief's three bugs, each answered with a column rather than an inference

**(a) A command that never arrives? No.** `cmd` is **0.300 m on every live tick of every Compress run** on both
riders, and on the default rider — which has no knee drop, so nothing else can touch the rest — `leg.rest` is
**0.300 m flat, 6 of 6**. The recomputation of the private `heldDepth` is therefore validated against the code's own
output, not assumed [M].

**(b) A command that arrives and is not followed? No — it is followed and exceeded, and sooner than on the default
rider.** The per-tick dump of the worst cell (entry 3 m/s, full stick; `results/35b-ticks-compress-3-1.tsv`):

```
t       knees   cmd     target  rest    got     hips    sag     slack   slackBind  legLoad(BW)  attached
0.0167  0.000   0.300   0.300   0.001   -0.001  0.781   0.002   -0.030  0          0.86         1
0.2167  0.000   0.300   0.300   0.088   0.057   0.723   0.031   -0.089  0          0.90         1
0.4167  0.223   0.300   0.311   0.227   0.196   0.584   0.031   -0.231  0          0.98         1
0.6167  0.562   0.300   0.328   0.301   0.299   0.481   0.002   -0.337  0          1.04         1
0.8167  0.791   0.300   0.340   0.329   0.327   0.453   0.002   -0.375  0          1.35         1
1.0167  0.709   0.300   0.335   0.336   0.335   0.445   0.002   -0.389  0          1.53         1
```

`rest` crosses the commanded 0.300 m at **0.600–0.717 s** in 6 of 6 and the body (`got`) follows within 0.05 s, against
the **default** rider's **0.767–0.817 s** [M]. **The new rider's legs are not slower, they are faster** — the rate limits are the same on
both riders (`CROUCH_SPEED`, `CROUCH_ACCELERATION`), and what moves the crossing earlier is that the new rider's ramp
is heading for a **deeper** target (0.300 → 0.344 m) and so passes 0.300 on the way [I, the model stated].

**(c) A depth that is reached and then lost? No, to within 5 mm.** After the first frame at or past 0.295 m, the
minimum `rest` over the rest of the live window is **0.295–0.298 m**, with **1–11 ticks of 31–164** anywhere under
0.300 [M]. Nothing lets the depth go.

**(d) So the fourth category, which the brief did not list: the datum moved.** The tall stance's own `target` reaches
**0.003–0.299 m** — i.e. up to `CROUCH_DEPTH` exactly — with nothing pressed, and its hips reach **0.518 m**, which is
0.067 m from Compress's own. The per-tick dump of the tall run in the same cell
(`results/35b-ticks-tall-3-1.tsv`) shows it arriving:

```
t       knees   cmd     target  rest    got     hips
0.2167  0.000   0.000   0.000   0.000   0.002   0.778
0.6167  0.579   0.000   0.174   0.099   0.083   0.697
1.0167  0.939   0.000   0.282   0.277   0.276   0.504
1.4167  1.000   0.000   0.300   0.295   0.280   0.500
```

**With nothing pressed, the standing rider descends to 0.295 m of leg shortening in 1.4 s** — 98 % of Compress's whole
commanded travel — because `stanceRoom(0).kneeTravel` **is** `CROUCH_DEPTH` [R].

### 2.5 Whether 3.3e's figures reproduce: **yes, and only on its own window**

| window | new rider, tall → Compress Δ hips | default rider | dead share of the window |
|---|---|---|---|
| **3.3e's** (0.5 s → 9 s, frozen frames in) | 0.025 / 0.045 / 0.047 / 0.115 / 0.188 / 0.250 m — **0.025–0.115 in 4 of 6** | **0.300–0.332 in 6 of 6** | 0.64–0.93 (new), 0.31–0.42 (default, its Compress runs) |
| **live** (0.5 s → the frame before the rider comes off) | **0.066–0.297 m in 6 of 6** | **0.299–0.300 m in 6 of 6** | — |
| 3.3e as published | *"0.025–0.115 m in 4 of 6"* | *"0.300–0.336 m in 6 of 6"* | not reported |
| 3.3f as published (12 cells) | 0.067–0.299 m in 12 of 12 | 0.296–0.300 m in 12 of 12 | 0.571–0.927 |

**Both of 3.3e's published columns reproduce on its own window, to the thousandth at both ends of the new rider's band
and to 0.004 m on the default rider's.** [M] So the figure in the brief is **not wrong arithmetic on a wrong
instrument — it is right arithmetic on a window that is 64–93 % frozen frames.** On the honest window the same cell
gives 0.066–0.297 m, which reproduces 3.3f's 0.067–0.299 m on an independently written probe. **This round adds no new
defect to A; it confirms 3.3f's and removes the brief's framing of it.**

### 2.6 The switch that already exists, measured again

`?kneeRoom=achieved` reads the knees' travel at `max(commanded, the leg's own depth)` [R, `AttachedRider.ts:4086–4087`].
On the same six cells: tall hips come back up from 0.518–0.777 to **0.615–0.777 m**, Compress is unmoved
(0.451–0.480 → **0.455–0.480 m**, every cell within 0.005 m), and the Δ's floor goes from **0.066 to 0.157 m** —
22 % → 52 % of the designed 0.30 m [M]. That reproduces 3.3f's own A/B (0.156–0.299) on a fresh probe. **It is
shipped, opt-in, and off by default**, so the rider the owner rides today is the one in §2.2.

---

## 3. What else is in the chain, read before anything is said about it

### 3.1 Which depth each consumer is fed — and the asymmetry that is the whole of Problem A

| consumer | what it sets | fed which depth | line |
|---|---|---|---|
| `stanceRoom(...).kneeTravel` | **how far the balance may drop the knees** | **the commanded depth** (`stanceDepth` = `heldDepth`), unless `kneeRoom: 'achieved'` | `AttachedRider.ts:4079, 4086–4087` [R] |
| `stanceRoom(...).hipRange`, `.arms` | the hip's **credit and stop** across, the arms' rotor | **the commanded depth**, always | `AttachedRider.ts:3523, 3637, 5098` [R] |
| `stanceAt(depth)` → the plant's `height`, `riderYawInertia`, twist inertia, (opt-in) bank limit | the **balance plant** | **the achieved depth** (`yawDepth` = `−leg.rest`), **clamped to 0.30 m** | `AttachedRider.ts:3622, 4497`; `predictiveBalance.ts:607, 663, 679, 1050` [R] |
| `hipRange(depth)` in `StandingBody` | the hip's range **in pitch** | **the achieved depth** (`−leg.rest`) | `AttachedRider.ts:3391`; `standingBody.ts:245, 287` [R] |
| `kneeStrength(hipToAnkle)` | the legs' strength along the leg | the **live geometry**, continuous, no table | `standingBody.ts:113–117` [R] |

**So the plant is *not* designing the knee-dropped tall stance on a tall pendulum — it reads the real depth.** That
worry is cleared. The asymmetry is the other way: **the knees' own travel is granted at the commanded depth while the
plant is solved at the achieved one**, which is precisely the licence a saturated correction uses to reach
`CROUCH_DEPTH` for free. `?kneeRoom=achieved` closes the knee-travel half of it; **the hip's range and the arms are
still read at the commanded depth by design** (3.3f left them there on purpose, so its switch moved one quantity).

### 3.2 The feet-only-push `slack` clamp: present, correct, and not the cause

`prepareLeg:4130–4140` lifts the rest to `min(0, leg.extension − legLoad / legStiffness)` whenever the leg is being
asked for more depth than the body is actually falling into, because *"a foot on a deck has nothing to pull against"*
[R]. Reconstructed exactly from the leg's own force balance (`legLoad = leg.force + k(ext − rest) + c·rate`, with
`k` = `KNEE_STIFFNESS` = 20 000 N/m and `c = 2 × 0.35 × √(k m)`), it sits at **−0.03 to −0.39 m** through these runs —
far below any commanded rest — and **binds in 0.00 of live ticks in all three new-rider stances** [M]. On the default
rider's tall runs it binds in 0.00–0.10. **It is a real limiter and it is not limiting anything here.**

### 3.3 The rate limits, for completeness

`CROUCH_SPEED` = 1.5 m/s and an acceleration limit of `max(CROUCH_ACCELERATION, legLoad/m − COMPRESS_KEEP·g)`
(6 m/s² or the load's own, whichever is larger) [R, `:1053–1054, 4111–4112`]. Measured consequence: 0.300 m of travel
in **0.60–0.72 s**, so the limiter is live during the descent and is *not* why the stance is where it ends up. The
`hold` term (`CROUCH_HOLD`, the crouch holding rather than dropping while the feet brake the bank) applies only when
`!compressing`, so it never touches Compress [R, `:4117–4118`].

### 3.4 `stanceAt`'s 0.30 m clamp: a ceiling, not a cause — and already hit today

The brief is right that a ceiling cannot explain under-achievement, and §2 shows there is no under-achievement to
explain. But the clamp's **own** consequence is now measured on the shipped rider: the leg's **achieved** depth is past
0.30 m in **0.28–0.95 of Compress's live ticks in 6 of 6 runs** and 0.006–0.417 of Crouch's [M], because the knee drop
adds up to 0.044 m on top of the button. In those ticks the plant is solving a stance **0.03–0.04 m shallower** than
the body is. **How much that costs today: little.** The table's own slope between its second and third rows is
(0.55 − 0.65)/0.105 = **0.952 m of CoM height per m of depth**, so 0.044 m past the ceiling is **≈0.042 m of pendulum
length** (0.55 against ≈0.508 m), which is **4 % in ω₀ = √(g/h)** [I, the model stated]. **It is reported because it
is the same clamp Problem B's options would hit, where the same arithmetic gives about four times the error in ω₀ and
1.9× in the inertia** (§4.5), not because it is a defect worth a round of its own.

---

## 4. Problem B — the options, their costs, and what each breaks. **No option is picked here.**

### 4.1 The two ladders, because they are not the same ladder

| rung | **nominal** depth, m [R] | nominal hips, m | nominal % of 0.88 m | **measured hips on `?rider=new`, m** [M] | **measured %** |
|---|---|---|---|---|---|
| Tall | 0 | 0.78 | 89 % | **0.518–0.777** | **59–88 %** |
| Crouch | 0.195 | 0.585 | 66 % | **0.493–0.584** | **56–66 %** |
| Compress | 0.300 | 0.48 | 55 % | **0.451–0.480** | **51–55 %** |
| tube tuck / `?snapDepth=deep` | 0.45 | 0.33 | 38 % | not run this round | — |

**The footage's three bands** (`3.5/stance-frame.md` §3.1, from four clips, at least seven riders, each ±10 points):
resting **75–95 %**, a sustained holdable crouch **55–65 %**, 0.25–0.7 s spikes at **35–50 %**.

**Two things follow before any option is weighed.** First, **the measured ladder already overlaps**: tall reaches into
Crouch's band and past it, and the three rungs cover 51–88 % with no gaps and no stable rungs. Second, **the measured
Crouch already reaches 56–66 %**, inside the footage's holdable band, in the cells where the balance's knees go down —
so "Crouch is in a band no clip shows" is true of the **constant** and only sometimes true of the **rider**. **Any
option below will be ridden on the §4.1 right-hand column, not the left one, until Problem A is settled.** That is a
cost shared by all four options and it is stated once here rather than four times below.

### 4.2 Option 1 — Crouch deeper into 55–65 %, Compress down into the spike band 35–50 %

**Constants that change:** `CROUCH_SHARE` 0.65 → **0.90–1.00** (`AttachedRider.ts:1015`), and Compress's own depth
0.30 → **0.34–0.45 m**. Compress's depth **is** `CROUCH_DEPTH` (`:1014`), and that constant is the **unit the rest of
the ladder is quoted in**: `SNAP_DEPTH × CROUCH_DEPTH` (`:894`), `SNAP_DEPTH_DEEP = MANUAL_CROUCH_DEPTH / CROUCH_DEPTH`
(`:1029`), `CARVE_FLEX × CROUCH_DEPTH` (`:3994`), `SNAP_DRIVE_DEPTH` (`:4005`), `manualCrouchShare`'s tuck blend
(`:1040–1041`), the `deepest = max(−leg.rest, CROUCH_DEPTH, −rest)` travel window (`:4124`) and the **default
rider's** leg softening `CROUCH_SOFTENING × min(CROUCH_DEPTH, …) / CROUCH_DEPTH` (`:4146`) [R].
**So raising `CROUCH_DEPTH` moves Snap, the carve's flex, Snap's drive, the tuck's blend and the default rider's leg
stiffness with it** — one constant, six behaviours, including the rider the owner does **not** ride. A new constant for
Compress alone avoids that and is the cheaper shape of the same option.

**`stanceAt`'s clamp and a fourth `STANCE_TABLE` row: required.** Compress at 0.34–0.45 m is **past the clamp in every
tick**, so without a fourth row the plant would solve the deepest stance on Compress's own pendulum (0.55 m), Compress's
`riderYawInertia` (`lower` 1.24) and twist inertia (`upper` 1.96), and — with `riderCost`'s `feetReach` on — Compress's
bank limit, which is `stateScale[2] × STANCE_TABLE[0].height / height` [R, `predictiveBalance.ts:1050`].
`BODY_FRONTAL_SHARE` (`:595`) needs a fourth entry at the same depth.
**`stanceRoom` already has a 0.45 row** (`humanBalance.ts:163`) and **`hipRange` already covers 0.30–0.45**
(`standingBody.ts:102`), so those two need **nothing** — the brief's worry about them is half unfounded [R].

**What it breaks, in order of size:**
1. **Crouch and Compress end up 0.04–0.18 m apart.** At the deep end of Crouch's band (0.30) and the shallow end of
   Compress's (0.34) they are **0.04 m apart — the same 0.05 m separation that produced the owner's "not down enough"
   in the first place** (§2.4d). **This option is only safe at the wide end of both bands.**
2. **The balance's knee drop loses its travel in both deep stances.** `stanceRoom(0.30).kneeTravel` = 0.05 m and
   `stanceRoom(0.34–0.45)` = **0.036–0 m** [R], so the correction's knee strategy is nearly or wholly disabled in the
   two stances a rider turns hardest in. 3.3f priced that drop as a **dynamic margin** term twice over (the capture
   point's lever and ω₀), so removing its room is a real loss, not a tidy-up.
3. **Every balance number measured in 3.2–3.4 at Compress's 0.30 m is re-based**, including the plant's own
   sign-turnover sensitivities and the fall mix. The 48- and 96-run populations do not carry over.

### 4.3 Option 2 — Compress stays at 0.30, Crouch takes the 55–65 % slot, Tall absorbs the gap

**Constants that change:** **`CROUCH_SHARE` alone**, 0.65 → 0.90–1.00. Nothing else. **No fourth `STANCE_TABLE` row,
no `BODY_FRONTAL_SHARE` entry, no plant re-basing** — the cheapest option in the code by a wide margin, and the only
one that moves a single number. (`stanceAt`'s clamp is not newly *required*, but a Crouch at 0.30 m would hit it as
Compress already does, §3.4: the knee drop would push the achieved depth to 0.35 m there too.)

**What it breaks:**
1. **Crouch becomes Compress.** At `CROUCH_SHARE` = 1.0 they are **identical** (0.300 m each), and at 0.90 they are
   **0.03 m apart**. Two of the player's three buttons would then command the same stance, which is the collapse of
   §2.4 arriving by design instead of by accident.
2. **"Tall absorbing the gap" has nowhere to go.** Tall is depth 0 and the leg's only travel upward is
   `LEG_EXTENSION` = 0.10 m, of which `EXTENSION_TALL` = 0.04 m is a **transient** the projection uses on release
   (`:1118, 4106`) [R]. So the 66–89 % gap cannot be filled from above; **the thing that is already filling it is the
   balance's knee drop, 0.003–0.270 m of uncommanded depth** [M]. **Option 2 therefore hands the middle rung to a
   correction the player does not control** — which is Problem A again, now load-bearing instead of incidental.
3. It leaves the footage's spike band (35–50 %) covered only by the tube tuck, which today is reachable **only under a
   curl** (`covered`, `:4063`) or via `?snapDepth=deep` [R]. On the open face there is no 35–50 % stance at all.

### 4.4 Option 3 — leave the ladder alone, put the dip entirely on the new button

**Constants that change:** **none of the four depths.** The dip needs a depth (0.34–0.47 m) and a ~0.5 s clock; the
depth already exists twice — `MANUAL_CROUCH_DEPTH` = 0.45 m and `SNAP_DEPTH_DEEP` = 1.5 × `CROUCH_DEPTH`
(`:1016, 1029`) [R] — so the build is an **input and a clock**, not a new depth.

**`stanceAt`'s clamp and a fourth `STANCE_TABLE` row: required**, for exactly the same reason as Option 1 and with
exactly the same consequences if skipped (§4.5). `BODY_FRONTAL_SHARE` likewise. `stanceRoom` and `hipRange` again need
nothing.

**What it breaks:**
1. **Crouch keeps 66 %, which no clip shows**, and the footage's holdable crouch stays covered by **Compress** (55 %).
   The ladder then reads: a rung with no referent (Crouch), a rung doing the footage's crouch under the wrong name
   (Compress), and a new button for the dip. **That is a naming problem, not a physics one** — and it is the owner's to
   accept or refuse.
2. **It is the lowest-risk option for the balance**, because no existing stance's pendulum, room, strength or
   measured population moves. Four rounds of tuning at 0 / 0.195 / 0.30 keep their meaning.
3. The dip's **release** needs no new mechanism: §4.6.

### 4.5 What a missing fourth row would actually cost, in numbers

If a rung lands at **0.45 m** and `stanceAt` is left as it is, the plant is handed **0.55 m** of pendulum where
`design.md`'s own table says **0.40 m** (`design.md:63–69`, header *"Centre of mass height"*) [R]:

- **pendulum length**: 0.55 against 0.40 m → **37 % high**, and ω₀ = √(g/h) **15 % low**;
- **inertia**: the plant's `m h²` is **1.9× too large**, and `BODY_FRONTAL_SHARE` would freeze at Compress's 0.2099;
- **rider yaw and twist inertia**: frozen at `lower` 1.24 and `upper` 1.96 kg·m², which 3.2b measured **for three
  postures only**;
- **bank limit** (with `riderCost`'s `feetReach`): `0.84/height` frozen at Compress's ratio, so the deepest stance
  would be given Compress's own lean cost rather than its larger one.

**And the fourth row is measurable, not a guess.** `3.2/inertia.probe.ts` builds `height`, `lower`, `upper` and the
`BODY_FRONTAL_SHARE` entry from de Leva's (1996) segments posed in the game's own stances — **one posture line and a
run of an existing probe** [R, S]. Against today's clamp-hitting Compress the same arithmetic gives 0.042 m of
pendulum error and 4 % in ω₀ (§3.4), against 0.15 m and 15 % here: **about four times as much in the rate and 1.9× in
the inertia**, which is why §3.4 is a note and this is a blocker.

### 4.6 The one thing that is already settled, carried forward because it removes a worry

`kneeStrength` (`standingBody.ts:113–117`, `KNEE_TORQUE` = 300 N·m a knee) gives **3.0 / 2.25 / 2.1 / 1.9 body
weights** at tall / Crouch / Compress / tuck [R], from **geometry alone** — two knees at a moment arm
`d = √(b² − (hipToAnkle/2)²)` — with **no table, no stance index and no time constant in it**. It matches Zöger et al.
2025 (n = 28: 5461 ± 1131 N at a 140° knee against 2920 ± 633 N at 100°) and Lynch et al. 2021 (n = 59: 1.92 BW at
120° against 1.26 at 90°) [S, via 3.3e].

**So it is a static strength curve, it survives the owner's infinite-stamina ruling intact, and every option above
inherits it for free**: a deep rung is a place a rider **cannot hold a hard turn's load**, which is the mechanical
reason a dip springs back. **No stamina and no fatigue system is designed, proposed or needed here, and the owner
cancelled that explicitly.**

### 4.7 A fourth option, because the reading points at it — stated as an option, not a recommendation

**Option 4 — settle the ladder's *determinism* before its *values*.** The measured rungs in §4.1 are not the
constants' rungs, and the spread is **0.26 m on tall** — 86 % of Compress's whole travel — depending on nothing the
player does. `?kneeRoom=achieved` narrows tall to 0.615–0.777 m hips and restores the Δ floor to 0.157 m [M], at the
cost of 43 % of the correction's travel, with the fall time moving 2.63 → 2.59 s at the median over 24 runs (3.3f's own
A/B, which I reproduced here on the Δ column but did not re-measure for falls).
**Its cost is that it answers none of Problem B**: the four nominal depths would still be 0 / 0.195 / 0.30 / 0.45 and
Crouch would still sit at 66 %. **Its benefit is that whatever B picks would then be the stance the rider is actually
in.** It is listed because three of the four options above are judged by riding, and today the thing being ridden is
not the thing being set.

---

## 5. What I refuted

- **The brief's Problem A premise — *"the new rider is achieving a fraction of what it is told to do"*.** It achieves
  **100–111 % of the commanded 0.300 m** in 6 of 6 runs, with the body's own CoM within 0.003 m of the leg's rest [M].
  The shortfall is in the **contrast with tall**, and tall is the rung that moved.
- **That the loss might be a clamp, a scale, a filter or a rate limit on the way down.** The `slack` clamp binds in
  0.00 of live ticks; the descent is faster than the default rider's; the depth is never lost once reached [M].
- **That the plant might be solving the knee-dropped tall stance on a tall pendulum.** It is fed the **achieved**
  depth (`yawDepth`), not the commanded one [R, `AttachedRider.ts:3622, 4497`].
- **Half of the brief's fourth-row worry.** `stanceRoom` already has a 0.45 m row and `hipRange` already covers
  0.30–0.45 m; only `STANCE_TABLE`/`stanceAt` and `BODY_FRONTAL_SHARE` are keyed on three depths alone [R].
- **That Problem A and Problem B might be the same thing.** They are not: A is a collapsed, non-deterministic ladder on
  the rider the owner rides; B is where four nominal rungs should sit. **But they are coupled in one direction** —
  B cannot be *judged by riding* until A is settled (§4.1).

## 6. What I will not claim

- **I will not claim Compress is deep enough.** This round measures that it reaches what it is **told**; whether
  0.300 m is the right thing to tell it is Problem B, and the owner's.
- **I will not re-promote 3.3f's fall-time A/B.** I reproduced its depth columns, not its fall columns.
- **I will not tune to the centimetre.** Every band in §4 carries `3.5/stance-frame.md`'s **±0.1 m** on a 0.45 m
  ladder, and the knee-angle cross-check still disagrees with the percentage route by 0.1 m, unresolved.
- **One trace is not a number.** Every figure above says its population: **six runs a stance a rider on one cell**, and
  that cell is **a fit to Canyon, not Canyon**. The per-tick dumps in `results/` are **one run each** and are quoted as
  illustrations of a column, never as the column.
- **I did not ride anything, build the game, or run the full test suite** (`src/wave/SurfZoneSimulation.test.ts`
  declares 644.5 minutes of per-test timeout and cannot gate anything anyway).
- **Nothing under `src/` or `server/` is touched**, so the game is unchanged by construction, and **the θ_max ask-cap
  step 3.5a is building was not read for its content and not touched**.

## 7. Files

- `docs/research/new-rider/3.5/depth.ts` — this round's probe. `RIDER=new|old`, `STANCES`, `EXTRAS`, `STEERS`,
  `KNEEROOM=achieved`, `REACH=keep`, `TICKS=1` (the per-tick TSV), `KEEP=1` (3.3e's window, the frozen frames in),
  `OUT`. Build with `./node_modules/.bin/rolldown docs/research/new-rider/3.5/depth.ts -o <scratch>/d.mjs --format esm
  --platform node` — **never `npx tsc` in a worktree**.
- `docs/research/new-rider/3.5/results/35b-new-shipped.jsonl` — 18 runs, `?rider=new` as it ships (§2.2).
- `docs/research/new-rider/3.5/results/35b-old-default.jsonl` — 18 runs, the default rider (§2.3).
- `docs/research/new-rider/3.5/results/35b-new-kneeroom-achieved.jsonl` — 18 runs, `?kneeRoom=achieved` (§2.6).
- `docs/research/new-rider/3.5/results/35b-new-33e-window.jsonl` — 18 runs, 3.3e's own window (§2.5).
- `docs/research/new-rider/3.5/results/35b-ticks-{tall,compress}-3-1.tsv` — the two per-tick dumps quoted in §2.4.

## 8. For the owner, in plain words

**The surfer does go down when you press Compress.** It goes down 0.30 m, which is exactly what the button is set to,
and it ends up with its hips 0.45–0.48 m over the board — the same place the old surfer ends up. We measured the whole
chain from the button to the hips and nothing is lost anywhere along it.

**What is wrong is that the new surfer is already crouching before you press anything.** Its balance lowers the knees
to keep its feet under it, and the amount it is allowed to lower them is *the same 0.30 m the Compress button asks
for*. So in a hard turn the surfer has already spent the whole crouch on its own, and your button adds five
centimetres. That is why it "isn't down enough": **not a shallow crouch — a crouch that has already happened.** There
is a switch that half-fixes it, `?kneeRoom=achieved`, which is already in the game and off by default; with it on, the
standing surfer stands back up (hips 0.62–0.78 m instead of 0.52–0.78) and the button's own drop goes back to
roughly half of its designed travel.

**And the separate question — where the four crouches should sit — is yours, not ours.** §4 lays out four ways to do it
and what each one costs. The short version: making Crouch deeper is one number and nearly free, but it makes Crouch and
Compress the same stance; making Compress deeper covers the footage's deep dips but drags Snap and the carve with it
and needs a new row in the balance's own table; and leaving all four alone and putting the dip on a new button is the
safest for everything already tuned, at the price of keeping a Crouch depth no video shows. **We are not picking. A
shot list is not offered either, because nothing in this round changed the game.**
