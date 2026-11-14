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

## 3. The measurement: the water against the foam — **the water is not too bright**

Ruling 38 named the measurement to take if the look turned out to be Rich all along: "the water's own luminance
against the foam's in the rendered frame". Here it is, and it does not say what ruling 38 expected.

`waterSheetFoamAgainstWater` (§5), three passes from each shot's own camera in the same held sea at t 72 s: as drawn,
with the foam colour set magenta, and with the sea's surface mesh hidden. A pixel is **water** where hiding the mesh
changed it; its foam share is how far the magenta pass pulled its green down. **foam** is a pull of 120 or more (the
foam colour dominates the pixel), **clear** is under 10 (no foam in it at all), and the band between is in neither, so
neither figure is diluted by the other. Linear relative luminance.

| shot | foam px (share of frame) | foam p50 | clear water px | clear p50 | clear p90 | **foam p50 / clear p90** |
| --- | --- | --- | --- | --- | --- | --- |
| `curl-ride` | 6 893 (0.75 %) | 0.787 | 15 425 | 0.443 | 0.486 | **1.62** |
| `curl-front` | 108 286 (11.8 %) | 0.772 | 1 974 | 0.361 | 0.473 | **1.63** |
| `curl-channel` | 4 813 (0.52 %) | 0.814 | 155 036 | 0.349 | 0.465 | **1.75** |
| `curl-inside` | 2 (0.00 %) | 0.863 | 125 489 | 0.166 | 0.516 | **1.67** |
| `curl-close` | 7 491 (0.81 %) | 0.802 | 15 535 | 0.443 | 0.486 | **1.65** |
| `curl-behind` | 22 584 (2.45 %) | 0.833 | 371 147 | 0.495 | 0.527 | **1.58** |

**The foam's median stands 1.58–1.75× above the clear water's 90th percentile, in every view.** The game's own target
for a white that reads, written into `waterSheetLipContrast` for the Canyon lip, is **1.5–2×**. The foam is inside it
everywhere. Nothing is blown out either (`blown` 0 in all six).

The colours say the same: the foam's mean is (0.61, 0.83, 0.84), a cyan-white close to the foam colour itself
(0.687, 0.888, 0.815), against clear water at (0.17, 0.50, 0.78), a blue. The foam is not being swallowed.

> **So the five rounds were not spent drawing white on white.** The white that gets drawn reads as white. There is
> just **almost none of it**: half a per cent to one per cent of the frame in four of the six views, and two pixels in
> `curl-inside`. The owner's reference photo has a white pile, a torn edge, streaks and lines over a large part of the
> wave; this wave has thin hard-edged lines.

This reopens what ruling 38 closed. "Stop drawing foam until the water is right" rested on the water being wrong, and
it is not. **Extent and placement are the fault, not contrast**, and that is a different next step from repainting.

### What the ruling read as a bright water sheet

Ruling 38 read `before-front-midday` as "a bright near-white turquoise with heavy caustics ... brighter than any foam
drawn on it could be". The caustics part is right and the conclusion is not. In `curl-front` only **1 974 pixels of
the frame are water with no foam in them at all** (0.2 %), against 277 570 water pixels in all — the pale foreground
is mostly already carrying foam colour, so reading it as bare water and calling it brighter than foam compares foam
with foam. Where there is real bare water to compare against — `curl-channel` with 155 036 clear pixels, `curl-behind`
with 371 147 — it sits at p90 0.465 and 0.527 against foam at 0.814 and 0.833.

What **is** true is that the frame's bright top decile is the caustic lattice, and the caustics are not something #282
touched: it cut the Rich body gain and raised the display exposure, which lifts the caustics and the foam by the same
factor and changes neither's standing against the other. A caustics A/B would settle how much of the pale look is
theirs. It cannot be driven from the probe — `drawPhysical` re-renders and re-enables the map on every `renderView`
(`main.ts:1069`) — so it wants a hook, and it is a lead for the next ruling, not this round's work.

---

## 4. The stills

Seven shots, the owner's own ride address, the look forced Rich, at t 72 s: `curl-ride`, `curl-front`, `curl-channel`,
`curl-inside`, `curl-close`, `curl-behind` at midday and `curl-front` at sunset. Two legs — the branch as it stands,
and the same with the bore's foam switched off in the code (`NOFOAM`, not merged). Kept in `c2-step5c-stills/`, with
three crops at 2–3× in `crops/`.

### What they show

1. **The white that is there reads as white.** In the `curl-ride` crop a hard white line runs along the trough and
   stands out cleanly against the face beside it. The measurement in §3 is what the eye sees.
2. **There is very little of it, and the wave's own face has none.** Both the face and the back of the wave are bare.
   Looking out from inside the tube (`curl-inside`) there are **two** foam-dominated pixels in the whole frame.
3. **Where the pile should be, the frame shows a grey-brown smear.** In `curl-ride`, down the line, the broad region
   behind the breaking crest is a streaky desaturated grey-brown, not white. It is the single ugliest thing in these
   shots and it sits exactly where the owner's reference photo has its white pile.
4. **The lane terraces** (ruling 33's polish item, logged again by ruling 38) are plain on the face in `curl-ride` and
   `curl-channel` — horizontal ledges stepping down the wall, clearest from down the line.
5. **The dither stipple** is much worse at 3× than it looks at full size: regular Bayer-like dot grids in patches
   along the edges of the drawn sheets (the `curl-front` crop). That is the signature of screen-door transparency on a
   sheet fading in or out, not of the water. Ruling 38 logged it as "cause unknown" and present with the foam off;
   that is confirmed here, and the pattern names the mechanism to look at.
6. **The tube's mouth is a flat white blob** in `curl-front`, with no structure in it.

Items 3, 5 and 6 are new and none is this round's to fix.

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
