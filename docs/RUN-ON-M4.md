# What to run on the M4

Written 2026-11-12. Two things: the thin-lip simulation, and how to ride the 2 m pool.
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

Open the address it prints (usually `http://localhost:5173/`) and add this to the end:

```
?spot=pool&waves=barrel&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug
```

What to look at:

1. The join between the two parts of the wave, from the side and from the front. Does it read as one wave?
2. The wall under the lip: you now ride on the pre-made shape's own lower face. Does the board feel right there?
3. The lip: its thickness and colour as it falls.
4. The speed of the break along the reef: can you keep up?

To compare with Canyon (it must feel as before):

```
?canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on
```

If the frame rate drops, add `&perfLog=on` to the address, ride, press `F9`, and send Claude the file it saves.
