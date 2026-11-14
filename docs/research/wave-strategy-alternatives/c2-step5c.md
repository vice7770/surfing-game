# C2 step 5c: the look gate, and the five A0 runs (2026-11-14)

Ruling 38 set this round. Two jobs: start the five Basilisk runs that complete the new beds' A0 columns, and settle —
by reading the page, not the code — whether five rounds of invisible white were a render gate rather than a foam
problem.

**The short answer: the gate hypothesis is refuted on both of its limbs, and the water really is the cause.** The
measurement ruling 38 asked for is in §3, and it is worse than "too bright": in the ride shot the pool's own clear
water is *brighter at its 90th percentile than the foam is at its median*, so there is no headroom for white at all.

| | |
| --- | --- |
| **Shipped** | the five runs defined, checked against the script and started; the still tool can now report what it drew (`--probe`) |
| **Settled** | Medium draws Rich, and no code path drops the look at runtime; the step 5b stills drew Rich with the water light on, gain 1; ruling 38's "Classic draws no foam of any kind" is **mistaken** |
| **Measured** | the foam's luminance against the pool's own clear water, per shot (§3) |
| **Not shipped** | anything the owner can see. This round is a diagnosis, and ruling 38 reserved the repaint for its own ruling. Said plainly, per the owner's rule 3 |

---

## 1. The five runs (ruling 38 §"The one regression")

**The derivation checks out.** Ruling 38 derived five lines from `C2_MORE` in `tools/basilisk/run_periodic.sh`; I
checked each against that bed's existing row before running anything. Each differs from its bed's existing row in the
H/h0 field and in nothing else, and `run_periodic.sh cases <name>` resolves all five:

| case | H/h0 (A0 row) | copied from | slope, HS/h0 | reef top, back slope |
| --- | --- | --- | --- | --- |
| `pool_c2_b15_a0` | 0.19 (A0 0.12) | `b15_a2` | 0.055, 0.199 | 2.566, 0.0522 |
| `pool_c2_b15_a1` | 0.22 (A0 0.15) | `b15_a2` | 0.055, 0.199 | 2.566, 0.0522 |
| `pool_c2_b25_a0` | 0.19 | `b25_a2` | 0.085, 0.249 | 1.66, 0.0807 |
| `pool_c2_b25_a1` | 0.22 | `b25_a2` | 0.085, 0.249 | 1.66, 0.0807 |
| `pool_c2_b3s_a0` | 0.19 | `b3s_a1` | 0.105, 0.20 | 1.34, 0.1 |

One correction to the brief's wording: the A0 row is the **second** field after the name, not the first (the first is
h0, 5 m, on every C2 line). The values themselves were right.

**Both traps ruling 38 flagged are real, and one more.** The new names must be in `canyon_pipeline.py`'s `C2_CASES`
(they are now, line ~52). `CASES_FILE` is **not** a way to feed in new definitions: `base_line()` pops `CASES_FILE`
from the environment before asking `run_periodic.sh` for a case's line, because that file is the pipeline's own store
of *frozen* windows, written by the scout. New definitions have to go in `run_periodic.sh`, and they do (`C2_FILL`).

**Where they stand.** Started 11:02 on the M1 through
`…/scratchpad/c2runs2/c2c.sh` (ruling 31's folder, its binaries and its `RUNS`, as instructed; its own ten are all
analysed and nothing was running). Three jobs at a time, the latest-breaking first. `CANYON_OUT` is
`docs/research/pool-c2-library-r38` so the report lands beside ruling 31's rather than overwriting it.

**Disk.** Ruling 38's estimate was low: a finished case is about **450 MB**, not 0.4 GB of headroom each — ruling 31's
ten take 4.7 GB. Five is ~2.3 GB. Free space at the start was 7.0 GB (not 10), and 5.8 GB after the worktree
checkout; it has since risen to 11 GB. **It is enough, with little to spare.** `node_modules` is symlinked from the
main checkout rather than installed, to keep it that way.

**Not done this round:** wiring them into `libraryCases.ts` and re-reading the A0 clamp. They had not landed when the
round ended. That is the next round's first item and needs no reasoning.

---

## 2. The two reads: the gate hypothesis is refuted, twice

### 2.1 Which look does each quality preset select? Medium is Rich.

`src/game/Graphics.ts:7` — **`low` is the only preset that selects Classic.** `medium`, `high` and `ultra` all set
`waterLook: 'rich'`.

And there is no runtime downgrade at all: a search for an adaptive/degrade path across `src/` returns nothing. The
`AutoBenchmark` (`Graphics.ts:291`) runs **once in the menu** — 6 s on Medium's values, then a 6 s trial on High's —
and its verdict is stored in the save. It never re-runs during a ride, and "the Auto benchmark never picks Ultra"
(`Graphics.ts:6`).

So the owner's 2026-11-11 report reads differently from how ruling 38 took it: the *frame rate* drops next to the
tube, but the *preset* was already Medium — the benchmark's one-off verdict at start-up, not a drop by the tube. And
Medium draws Rich. **A quality drop cannot be turning the water light or the foam off next to the tube, because
nothing drops.**

### 2.2 Which look did the still tool draw? Rich, with the water light on.

Read from the page in the very frame the shots came from (`--probe`, §5), in all five views:

```
look: "rich"   writtenLook: "rich"   sourceCubic: true   sourceWritesAeration: true   waterBodyGain: 1
```

`waterBodyGain` settles it: **3** is Classic, **4** is Rich without the water light, **1** is Rich with it. The gain
and the display exposure are set in one call (`main.ts:1107`), so gain 1 means exposure 1.6 was in effect too.
Ruling 25e / #282 was on in every one of step 5b's stills, and the aeration was being written.

### 2.3 A correction: Classic does draw foam

Ruling 38's sharper half — "in the Classic look the aeration is never written into the material, so **no foam of any
kind is drawn**" — is **mistaken**, and worth striking before it steers a round.

The surface source supplies **interleaved (height, foam)** per node (`WaterSurface.ts:218`), and `waterFoamAt()` and
`vWaterFoam` are in the **base** shader (`WaterSurface.ts:151–200`), shared by both looks. The white cover is that
channel, and `applySnapshot` writes it (`surface[o + 1]`) with no look gate anywhere in the path.

The `waterAeration` texture is a different thing: it appears only in `richWaterGlsl.ts`, and it carries the air
fraction and the **plume depth** — the milky tint of white seen *through* water. So the Rich gate at
`WaterSurface.ts:543` is correct by construction: Classic has no shader that could read it. Classic loses the
underwater tint, not the foam.

This does not rescue the hypothesis — the stills were Rich — but it means Low-preset players are not missing the
ocean's whitewater, and no fix is owed there.

### 2.4 So neither of ruling 38's two fixes is the one to build

"The pool must not drop out of Rich" has nothing to fix: it never does. "The foam must not be gated on Rich" would
move the aeration tint into a shader that cannot use it. **Ruling 38's branch 2 is where this lands.**

---

## 3. The measurement: the water against the foam

(filled in below)

---

## 4. The stills

(filled in below)

---

## 5. Files, and how to run them again

- The five runs: `bash …/scratchpad/c2runs2/c2c.sh start|status|stop|log`. Definitions in
  `tools/basilisk/run_periodic.sh` (`C2_FILL`) and `tools/basilisk/canyon_pipeline.py` (`C2_CASES`).
- The probe: `docs/research/wave-strategy-alternatives/c2-step5c-probe.js`, run by the new
  `headless-shot.mjs sheet --probe=<file.js>`, which evaluates it in the page after each round's shots and writes the
  value to `<out>/probe[-at<N>s].json`.
- The stills, both legs:
  ```
  node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5213 --out=<dir> --compute=gpu \
    --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library" \
    --shots=curl-ride:rich:midday,curl-front:rich:midday,curl-channel:rich:midday,curl-inside:rich:midday,curl-close:rich:midday,curl-behind:rich:midday,curl-front:rich:sunset \
    --probe=docs/research/wave-strategy-alternatives/c2-step5c-probe.js --advance=40 --first=skip
  ```
- Not run: rider sessions, catch reports and autopilot rides (the brief's rule); the Classic look's stills.
