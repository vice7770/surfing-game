# Ruling 39: C2 step 5c — ruling 38's diagnosis is refuted, and the question narrows (2026-11-14)

Advisor: this session. Read: `c2-step5c.md`, its runs, its stills and crops. The advisor checked the one claim in the
agent's report it could falsify cheaply (whether any test imports `waterSheet.ts`) and read the dynamic-import site
itself.

## Decision: merge

And before anything else: **ruling 38's central diagnosis was wrong, the agent refuted it in one cheap round, and the
parts of 38 built on it are struck below.** That is the round working as intended — 38 filed it as a hypothesis and
asked for reads before builds, and reads are what killed it — but the error was mine and it would have steered the
next round into repainting water that is already right.

## Struck from ruling 38

1. **"The water light is Rich only, and the owner's M4 drops Ultra → Medium next to the tube, so the foam vanishes
   where it matters."** Refuted on both limbs:
   - `Graphics.ts:7` — **`low` is the only preset that draws Classic.** Medium draws Rich.
   - **There is no adaptive downgrade anywhere in `src`.** `AutoBenchmark` runs **once in the menu** (6 s on Medium,
     then a 6 s trial on High), stores its verdict and never re-runs during a ride. The owner's "Ultra → Medium" was
     that start-up verdict. Nothing drops mid-ride, so nothing can switch the water light or the foam off by the tube.
   - And the stills themselves drew Rich **with the water light on**: read from the page in the frame the shots came
     from, all six views report look `rich`, source cubic, source writing aeration, **body gain 1** — which is Rich
     *with* #282 (3 is Classic, 4 is Rich without it).
2. **"In the Classic look no foam of any kind is drawn."** Simply wrong, and the sharper half of my claim. The surface
   source is interleaved **(height, foam)** (`WaterSurface.ts:218`); `waterFoamAt` / `vWaterFoam` live in the **base**
   shader (`:151–200`), and the Classic branch of the material (`:439–448`) splices them in and runs its body through
   `classicRollerFoam`. What is Rich-gated at `:543` is the **aeration** texture — air fraction and plume depth, the
   milky tint of white seen *through* water, in `richWaterGlsl.ts` alone. **Classic loses that tint, not the foam.**
3. **"Stop drawing foam until the water is right."** Withdrawn. The water is right.

## What the measurement actually says

`waterSheetFoamAgainstWater`, three passes a shot (as drawn / foam forced magenta / sea mesh hidden), classifying a
pixel as water where hiding the mesh changed it:

| | foam p50 ÷ **clear** water p90 | ÷ **all** water p90 | foam, share of frame |
| --- | --- | --- | --- |
| `curl-ride` | 1.62 | 1.11 | 0.75 % |
| `curl-front` | 1.63 | 0.96 | 11.8 % |
| `curl-channel` | 1.75 | 1.16 | 0.52 % |
| `curl-close` | 1.65 | 1.13 | 0.81 % |
| `curl-behind` | 1.58 | 1.09 | 2.45 % |

**Against water with no foam in it the drawn white stands 1.58–1.75×, inside the game's own 1.5–2× target for a white
that reads** (`waterSheetLipContrast`), with nothing clipped. Against *all* water it is 0.96–1.16 — which is the flat
look I read off the stills — **but that water is itself foam-coloured**: in `curl-front` only 1,974 of 277,570 water
pixels have no foam in them.

So the correct sentence is not "white on white". It is: **the white that gets drawn reads; there is almost none of
it**, and the wave's own face and the view from inside the tube have essentially none. Five rounds were not wasted on
a brightness problem. They were drawing too little, not too dim.

## The finding this round actually produces

**Six of seven stills are byte-identical with the bore foam switched off, and the seventh differs by 57 pixels of
22,584.** The leg carries its own control (`curl-behind` and the water sheet *did* change, so the edit was live), and
this reproduces step 5b's result with the look now **proven** Rich.

Step 5b measured that foam changing the field by **+0.45 of cover on about 200 render nodes a wave**. That field
reaches at most 57 pixels of one view.

> **The question is no longer "why does the foam not read". It is "why does a field that is demonstrably different not
> reach the screen".**

That is a much better question than the one ruling 38 asked, and it has exactly two candidate answers: the cameras
miss the patch, or something drops it between the field and the draw. **They are separated by a read** — project the
changed nodes into each camera's frustum — not by a build. First item of the next round.

## Accepted, and corrections to my own briefing

- **The seatbelt by construction, not by hash.** The byte check did not finish (the machine is saturated by this
  round's Basilisk batch; load average 19.6). It is not needed here: the only `.ts` in the diff is
  `src/dev/waterSheet.ts`, reached solely through `void import('./dev/waterSheet')` behind `waterSheetRequested`
  (`main.ts:1323`), with **no static import anywhere in `src`** and no test importing it — the one test that names it,
  `ScreenStack.test.ts:22`, does so in a comment. The rest is a `.mjs` tool, two Basilisk files and docs. The default
  game cannot change, which is a stronger guarantee than a matching hash.
- **My case lines were right, my field count was not:** the A0 row is the **second** field after the name, not the
  first (the first is h0, 5 m).
- **`CASES_FILE` is not a channel for new definitions** — `base_line()` pops it from the environment, because that
  file is the pipeline's store of *frozen scout windows*. New definitions go in `run_periodic.sh` (`C2_FILL`) and the
  names in `canyon_pipeline.py`'s `C2_CASES`. Worth writing down; it is the second time this folder's plumbing has
  cost a detour.
- **My estimates were optimistic on both axes.** The five runs are **7–10 h**, not about an hour each (scouts 23 min,
  phase 2 reads 3–4.5 h a case), and disk was 7.0 GB at the start, not 10. A case is ~450 MB. **It wants watching.**
- **`--testTimeout` does not rescue a test that carries its own timeout in its `it()` call**, which overrides the
  command line. `uniformSnapshot`'s Canyon-bytes test is one (`180_000`). This belongs in the standing merge advice.
- **`pool_c2_b3s_a0` scouted with no touchdown.** Both cases in ruling 31's set that scouted that way came back no
  tube, so expect a no-tube row. That is data about where the tube region ends, and the A0 column is complete with it
  in — which is the point of the rule in ruling 38.

## Logged for the next round, not fixed

1. **A grey-brown smear exactly where the owner's reference photo has its white pile** (`curl-ride`), and grey veils
   again inside the tube. It survives the foam being switched off. The agent's untested lead is good and I accept it
   as the first thing to measure: it may be ruling 37's fray lip ("dark translucent water with a pale rim") with many
   sheets stacking along the crest at once. **One measured look before anyone repaints.**
2. **The dither stipple now has a named mechanism:** regular Bayer-like dot grids along the drawn sheets' edges, far
   worse at 3× than at full size — the signature of **screen-door transparency on a sheet fading in or out**. Ruling
   38 had this as "cause unknown".
3. The tube's mouth draws as a flat white blob with no structure.
4. The lane terraces, again (ruling 33's polish round).

## Next, in order

1. **Project the changed foam nodes into each camera's frustum.** Settle whether the cameras miss the patch or
   something drops it between field and draw. A read.
2. **Measure the grey smear** against lead 1 above, before any repaint.
3. The five runs land (7–10 h); wire them; read the A0 clamp and the hand-over height bar again.
4. The pay-back's course (ruling 38 carried item 1).

**Nothing here is for the owner to ride.** The agent said so plainly and it was right to: this round is a diagnosis
and produced nothing visible. What it buys is that the next round aims at the right thing.
