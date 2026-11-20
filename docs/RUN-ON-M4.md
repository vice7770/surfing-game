# What to run on the M4

Written 2026-11-12. Three things: the thin-lip simulation, how to ride the 2 m pool, and the T5 simulation
(section 3, added later on 2026-11-12).
Run every command from the repo folder, in the Terminal.

## 1. The thin-lip simulation

**What it is:** the 2 m pool wave, simulated again with weaker surface tension (Bond number 4000) and finer detail
(level 14). Today's lip is thick because the old runs used strong surface tension. This run should give a thinner lip.

**How long:** about one day. It may take longer. The Mac is kept awake by the script. You can use the Mac meanwhile.

### Step 1. Get the latest code

```bash
git pull
```

### Step 2. Check the tools

```bash
npm run barrels:pool -- check
```

If it says something is missing, install it (this downloads Basilisk and some Python packages), then check again:

```bash
npm run barrels:pool -- setup
```

### Step 3. Start the run

This is one line. Copy all of it.

```bash
RUNS="$PWD/tools/basilisk/runs/bo4k" BO=4000 LEVEL2=14 POOL_CASES="pool_straight_big" CANYON_OUT=docs/research/pool-tube-runs-bo4k npm run barrels:pool
```

It starts in the background and shows the log. `Ctrl-C` stops the log only. The run goes on.

### Step 4. See how far it is (any time)

```bash
RUNS="$PWD/tools/basilisk/runs/bo4k" npm run barrels:pool -- status
```

### To stop it and go on later

Stop:

```bash
RUNS="$PWD/tools/basilisk/runs/bo4k" npm run barrels:pool -- stop
```

Go on: run the line of step 3 again. It saves every 10 minutes, so little is lost. The same after a crash or a restart.

### Step 5. When it has finished, send the result

```bash
git add docs/research/pool-tube-runs-bo4k
```

```bash
git commit -m "data(pool): the pool's tube at Bo 4000, level 14"
```

```bash
git push
```

Then tell Claude it is pushed. Claude measures the new lip and puts it in the game only if it is thinner and the tube
is not smaller.

### Good to know

- The run writes in its own folder (`tools/basilisk/runs/bo4k`). Your earlier runs are not touched.
- Nothing goes into the game's files (`public/barrels`, `src`). After step 5, `git status` should show nothing there.
- Faster, if you want: `brew install libomp` once, then put `OMP=1 ` at the very start of the step 3 line. The run then
  uses all the fast cores. How much time that saves is not measured.
- This run was not tried on the M1 (it has no Basilisk). If it fails at the start, send Claude the error text.
- The long version: `tools/basilisk/README.md`, section "The Wave Pool's thin-lip run".

## 2. Ride the 2 m pool

Start the game:

```bash
npm run dev
```

Open the address it prints (usually `http://localhost:5173/`). **In the menu pick Wave Pool, then Waves: Barrel** —
the address does not choose the spot. Then add this to the end of the address:

```
?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library
```

**This is the one to use** (2026-11-13). `&wave=library` is the new wave: its shape and now its water both come from
the simulated breaking wave, not from the live sea. At the crest just before the lip throws, the water runs about
5 m/s along the wave where the live sea gave 2 m/s.

What to look at:

1. **The push.** Does the wave carry you? Does the face pull you down into it when you drop in?
2. **The join.** Riding up the line, from live sea into the made wave: does anything jolt or step?
3. **The shoulder in front**, from the side and from the front: does it read as one wave?
4. **The speed of the break along the reef:** can you keep up?

Known and not worth reporting yet: small steps along the lip's white edge, the falling lip looking like a flat sheet
from inside the tube, and no foam. Those are the next piece of work.

About the switches: `poolSize=ref` is needed (the library is built only on the 2 m pool). `tubeLook=merge` and
`lipLook=fray` still shape how the lip looks. `afterTube=roller` draws the water behind the tube. `wallBody=stream`
and `poolReach=long` now only shape the sea underneath. The old `tubeForm`, `loftMesh`, `wallFoot` and `crestLine`
belong to the older hand-placed tube, which `wave=library` replaces, so they are gone from this address.

To ride the older hand-placed tube instead, drop `&wave=library` and add
`&tubeForm=early&loftMesh=arc&wallFoot=dug`.

To compare with Canyon (it must feel as before):

```
?canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on
```

If the frame rate drops, add `&perfLog=on` to the address, ride, press `F9`, and send Claude the file it saves.

## 3. The T5 simulation: the 2 m pool wave from twice as far out

**What it is:** the same 2 m pool wave as today's tube case (`pool_straight_big`), simulated again with the same
settings. Only one thing changes: the detailed part starts twice as far from the break. Today it starts about 3.5 s
before the lip is thrown. This run starts about 7 s before. So we get the wave's shape 2 to 5 s before the throw,
which today's case does not have. Claude compares that with the live sea. It decides if the new wave method (the whole
breaking wave from the library) can start far out without a visible join.

**How long:** about 3.5 to 6 hours (an estimate). The Mac is kept awake by the script. You can use the Mac meanwhile.

**With the thin-lip simulation:** you can run both at the same time. They use different folders. The T5 run uses one
core. If the thin-lip run uses `OMP=1` (all fast cores), it may become a little slower while T5 runs.

### Step 1. Get the latest code

```bash
git pull
```

### Step 2. Check the tools

```bash
npm run barrels:pool -- check
```

If something is missing: `npm run barrels:pool -- setup`, then check again (as in section 1).

### Step 3. Start the run

This is one line. Copy all of it.

```bash
RUNS="$PWD/tools/basilisk/runs/t5" POOL_CASES="pool_far_big" CANYON_OUT=docs/research/pool-tube-runs-t5 npm run barrels:pool
```

It starts in the background and shows the log. `Ctrl-C` stops the log only. The run goes on.

### Step 4. See how far it is (any time)

```bash
RUNS="$PWD/tools/basilisk/runs/t5" npm run barrels:pool -- status
```

### To stop it and go on later

Stop (this stops only the T5 run; the thin-lip run goes on):

```bash
RUNS="$PWD/tools/basilisk/runs/t5" POOL_PREFIX=pool_far npm run barrels:pool -- stop
```

Go on: run the line of step 3 again. It saves every 10 minutes, so little is lost. The same after a crash or a restart.

**Careful:** the thin-lip run's stop line (section 1) stops every pool simulation, this one too. If you use it, start
this run again with the line of step 3.

### Step 5. When it has finished, send the result

```bash
git add docs/research/pool-tube-runs-t5
```

```bash
git commit -m "data(pool): the T5 run, the 2 m pool's case from twice as far out"
```

```bash
git push
```

Then tell Claude it is pushed.

### Good to know

- The run writes in its own folder (`tools/basilisk/runs/t5`). Your earlier runs are not touched.
- Nothing goes into the game's files (`public/barrels`, `src`). After step 5, `git status` should show nothing there.
- The run was tried on the M1 at a coarse level (it works from start to report). The full run was not tried.
  If it fails, send Claude the error text and the file `tools/basilisk/runs/t5/pool/logs/latest/pool_far_big.log`.
- The long version: `tools/basilisk/README.md`, section "The T5 run".

---

## 4. The library wave's lip: one case at Bo 4000 (2026-11-13) — DO NOT RUN THIS YET

> **Hold off.** On 2026-11-13 the water-physics side answered the owner's point about foam, and this run is no
> longer the way to a thinner-looking lip. Our lip's water is already in the measured range; it reads thick
> because of how it is shaded. The fix is free, in the drawing. See `docs/research/ruling-36-lip-and-foam.md`.
>
> There is one other reason someone might still want this run, and it is the owner's call: the new water makes
> the tube's hole 1.5 to 2.8 times bigger, which may help the surfer not fall when he touches the tube. That is
> about riding, not about looks. The commands below still work if that is wanted.

**What it is.** Section 1's run worked: at the same moment of the throw, its lip is 20 to 45 % thinner than the old
one, thrown further, with a bigger hole. (The first reading said "thicker". That was the measuring tool, not the wave;
`plunge_measure.py`'s `lip_m` compares two runs at different instants and must not be used that way. The full reading
is `docs/research/pool-lip-and-flow-2026-11-13.md`.)

**Why one more.** The game's wave now comes from nine library cases, and those are still the old, stickier water. The
thickest of them is `pool_c2_b2_a2`. This runs that one case with the new water, so its new lip can be measured against
its own twin before you spend one to two days on all nine.

**A single new case cannot go in the game on its own.** Neighbouring strips of the wave blend neighbouring cases, so
one case made of different water would put a step back in the lip. This run is a measurement that decides the rest.

**How long:** about 13 hours. The Mac is kept awake. You can use it meanwhile.

### Step 1. Get the latest code

```bash
git pull
```

### Step 2. Start the run

One line. Copy all of it.

```bash
RUNS="$PWD/tools/basilisk/runs/c2bo4k" BO=4000 LEVEL2=14 POOL_PREFIX=pool_c2 POOL_CASES="pool_c2_b2_a2" CANYON_OUT=docs/research/pool-c2-bo4k npm run barrels:pool
```

### Step 3. See how far it is (any time)

```bash
RUNS="$PWD/tools/basilisk/runs/c2bo4k" LEVEL2=14 POOL_PREFIX=pool_c2 POOL_CASES="pool_c2_b2_a2" npm run barrels:pool -- status
```

### To stop it and go on later

```bash
RUNS="$PWD/tools/basilisk/runs/c2bo4k" POOL_PREFIX=pool_c2 npm run barrels:pool -- stop
```

Go on: run step 2's line again. It saves every 10 minutes.

### Step 4. When it has finished, send the result

```bash
git add docs/research/pool-c2-bo4k
```

```bash
git commit -m "data(c2): the library case b2_a2 at Bo 4000, level 14"
```

```bash
git push
```

Then tell Claude it is pushed.

### Good to know

- It writes to its own folders (`tools/basilisk/runs/c2bo4k`, `docs/research/pool-c2-bo4k`). The committed nine-case
  library is not touched.
- Level 14 is needed, not a choice: at Bo 4000 the water's sticky length is about 8 cm, and level 14 gives about 4
  cells across it. Coarser and the lip tears instead of thinning.
- Nothing goes into the game's files. After step 4, `git status` should show nothing in `src` or `public`.
- `OMP=1 ` at the start of step 2's line uses all the fast cores, if `brew install libomp` was run once.
