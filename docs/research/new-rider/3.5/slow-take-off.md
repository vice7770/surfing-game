# 3.5t: the slow take-off falls (Group A, with lead B)

*Surfer-track builder, Claude Opus 5.5, high effort, 2026-11-23. Branch `claude/slow-take-off` from `claude/hold-line`
`6e8bdc2d`. Measurement only: nothing under `src/` changed, no arm built. `faceTrim` and `holdLine` stay off (shipped).*

The owner's question: *"The surfer cannot stand up."* His Group A: slow (12–22 km/h), standing 0.5–1.2 s, the tail
sinks or the nose lifts, and he folds or drops in feet first, with R2 held from 0.1–0.3 s after standing.

## 0. How it was measured

- **Probe:** `slow-take-off.ts` (one file, nothing under `src/`). **Reader:** `slow-take-off.py`. **Data:** `results/35t/`
  (`catch/`, `organic/`, the two generated table files, and the controls).
- **Catch mode:** `?testWave=catch` on the owner's address, on the game's own `SurfZoneRunner`. The sea is restored
  from the start's state, the rider is placed prone, paddles from `run × 0.1 s` and pops at the HUD's cue. **One run per
  process**, runs 0–9, three scripts:
  - `cue`: stick at zero, nothing pressed;
  - `cueC`: Compress held from 0.2 s after the stand;
  - `paddle`: never pops, keeps paddling.
- **Organic:** 3.5o's take-off drive (`sharp-steer.ts`) on the owner's address, Canyon B, Medium, seeds 1–3, 12 periods
  each. Scripts `cue` and `cueC` as above. One seed per process.
- **Per frame:**
  - speed over the ground (`vG`) and through the water (`vW`, the latch's own measure: horizontal |v − flow| at the
    board);
  - the latch, the lean cap and the lean asked;
  - leg load (bw), both feet's depth under the surface, wetted area, submerged volume;
  - the hull's vertical forces as a share of the pair's weight W = 741 N (`Fp` dynamic pressure, `Fb` buoyancy, `Fam`
    added mass);
  - deck pitch (+ nose up) and the bottom's immersion at nose and tail;
  - fore/aft: the demanded CoP along (`copZ`) and its headroom, the capture point along/across (`capZ`, `capX`) and
    their pasts, the pitch ankle (angle, reference, rest), the pitch hip, the leg's rest, Compress;
  - lateral headroom `headX`.
- **A fore/aft ledger:** `bankLedger` is switched on and its partition of `b` mirrored. Each standing 9×9 solve is
  re-solved per source on the game's own `A`. Per frame this books the body's along-speed change and the board's
  pitch-rate change by source. Closure: worst |Σ sources − solve| is 0 to 9 decimals.
- **Times** are seconds after the stand (the first `standing` frame), and the reference frame is the board's. Groups:
  - **short:** fell ≤ 1.2 s;
  - **mid:** 1.2–3 s;
  - **carried:** ≥ 3 s, censored, printed `>=`.

  One organic stand (seed 3, wave 5) is censored by the trial clock at ≥ 1.333 s and is counted as carried. Medians are
  plain medians.

### Controls

| control | result |
| --- | --- |
| Ledger inert, organic seed 1, `LEDGER=off` | 24 of 24 summaries identical; 0 of 1 743 frame rows differ |
| Ledger inert, catch runs 2, 3, 5, `LEDGER=off` | 0 of 505 frame rows differ; fall times identical |
| Organic riders independent: seed 1, `cueC` alone vs beside `cue` | 12 of 12 summaries and 0 of 859 rows differ |
| Catch, one run per process | Each process restores the same start; run 0 reproduces `test-wave-probe`'s first run exactly (cue 3.25 s, stand 4.47 s, 4.27 m/s, censored) |

⚠️ **`scripts/test-wave-probe.ts runs` carries state between its in-process restarts.** On this branch its 10-run catch
sample (`results/35t/test-wave-probe-inprocess-catch.txt`) matches the fresh-process run on **run 1 only**. Runs 2–10
cue, stand and fall at other times than the same runs in fresh processes. Examples:
- run 2: 4.02 m/s in-process, 4.10 fresh;
- one in-process run never stands;
- in-process stands drop to 2.78 m/s.

So the 2026-11-21 catch numbers are not clean measurements: 9 of 10 stood, 3.71 m/s, planing 4 of 9, median 0.95 s.
**Fresh-process truth on this branch (`cue`, 10 runs):**
- stood 10 of 10;
- through the water at the stand, median 3.92 m/s (3.47–4.27);
- planing 9 of 10;
- 6 falls at 0.717–1.317 s, and 4 censored at ≥ 3 s;
- median 1.15 s, with the censored runs at their floor.

The carry-over source was not isolated. This is the same class of fault 3.5s found in `straight-fall.ts GRID=1`.

## 1. What separates the stands that last from those that fall within 1.2 s

### Organic, owner's address, seeds 1–3, `cue` (20 stands: 11 short, 4 mid, 5 carried)

Per-stand rows and full medians are in `results/35t/organic-tables.md`.

**At the cue:** all 20 boards are at about 3.0 m/s through the water (short 0.37–3.14, carried 2.88–3.47), latch off,
`Fp` ≈ 0.30 W. Speed does not separate them yet (AUC 0.33). Where the board sits on the wave half-separates them:

| at the cue | short | carried | AUC |
| --- | --- | --- | --- |
| face fraction | 0.79 | 0.72 | 0.88 |
| ahead of the crest, m | 2.38 | 2.60 | 0.10 |
| slope ahead, deg | 13.9 | 16.6 | 0.25 |
| deck pitch, deg | −7.6 | −11.0 | 0.80 |

**At the stand (1.2 s after the press):**

| at the stand | short (median, range) | carried (median, range) | AUC (both scripts) |
| --- | --- | --- | --- |
| **through the water, m/s** | **3.72 (2.36–4.26)** | **4.51 (4.40–5.14)** | **0.00** |
| submerged volume, L | 14.1 (7.8–24.3) | 4.3 (0.1–7.4) | 1.00 |
| buoyancy, W | 0.19 | 0.06 | 0.98 |
| deck pitch, deg (+ nose up) | +5.4 | −12.0 | 0.97 |
| tail immersion, m | 0.19 | 0.03 | 0.97 |
| rear foot under the surface, m | 0.10 | −0.04 | 0.98 |
| face fraction | 0.91 | 0.68 | 0.94 |
| slope ahead, deg | 11.7 | 17.4 | 0.03 |
| pitch ankle, deg | 11.3 | −5.4 | 0.97 |

**The earliest clean separator is the speed through the water at the stand.** Every carried stand is at ≥ 4.40 m/s,
and every short one at ≤ 4.26. The precursor, already visible at the cue, is a board higher on the face, on a
flatter slope and less nose-down. The pop-up then costs it about 0.4 m/s (§5) and stands nose-up on a wet tail.

### Catch mode (10 fresh runs per script)

`results/35t/catch-tables.md`. Here **speed does not separate them**:

| at the stand | short | carried |
| --- | --- | --- |
| through the water, m/s | 3.78–4.21 | 3.86–4.27 |
| latch | on in all but run 9 | on |
| dynamic pressure `Fp`, W | 0.44–0.52 | 0.37–0.41 |

The columns that separate cleanly at the stand (AUC 1.00 or 0.00) are `Fp`, wetted area, `copZ`, `capZ` and the
margin. At +0.25 s the lateral headroom splits: 0.45–0.69 short against 0.93–0.98 carried. **All 6 catch falls are
lateral**: roll 15–25° by +0.5 s, ask 0, planing at 3.1–5.4 m/s. That is not Group A's fore/aft picture. The catch
start is a planing lateral collapse, closer to 3.5p's spiral than to the owner's slow fall.

## 2. The mechanism of the Group A fall

The organic slow stands (through the water < 3.6 m/s at the stand, `cue`, n 7) come in two kinds.

**(a) The wave leaves him: a stall over the crest.** Four stands: s1w12, s2w8, s3w7, s3w10.

- **At the stand:**
  - 2.34–2.76 m/s through the water;
  - face fraction 0.99–1.00;
  - already 14.7–18.1° nose up, with the tail 0.31–0.38 m under;
  - refusal *feet under water* in all four.
- **Sequence:**
  1. The slope ahead of the nose goes ≤ 0 at +0.05 to +0.48 s: the crest passes under him.
  2. The speed decays to 0.75–1.18 m/s.
  3. The pitch climbs past 20° by +0.07 to +0.18 s and reaches **42–57° nose up**, with the tail **0.65–0.77 m under**.
  4. `Fp` falls to −0.00–0.13 W while buoyancy holds 0.20–0.28 W.
  5. The capture point drifts to the tail (`capZ` < −0.2 m at +0.43 to +0.53 s in 3 of the 4), the lateral headroom
     goes negative (+0.28 to +0.80 s), and he separates at 0.55–1.28 s.
- **Reading:** this is *"the tail sinks or the nose lifts and he drops in feet first"*. The engine's test calls the
  separation across, but the CoM had already gone 0.2–0.4 m toward the tail over a board sinking tail-first.

**(b) Mid-face at 3.3–3.7 m/s: lateral first.** Three stands: s1w7, s1w8, s3w2 (and s1w11, s2w5 at 3.72–3.73).
- The lateral headroom goes negative first, at +0.33 to +0.48 s.
- The pitch is still rising from about 8° toward 20°.
- The roll runs away and he falls at 0.75–1.73 s.
- The capture point along stays inside ±0.2 m.

**The fore/aft ledger** (last 0.5 s before each fall ≤ 1.2 s, summed Δ per source, median over stands; along in m/s,
+ toward the nose; board pitch in rad/s, + nose down):
- `cue` along: leg spring −20.1, hull pressure +14.1, pitch ankle and hip +6.4, swing −3.2.
- `cue` pitch: leg +4.1, swing +3.1, pitch ankle and hip −2.7. The water's own entries are small (pressure −0.27,
  buoyancy < 0.7), because added mass and damping sit in `A`, not `b`.

So the along motion is a tug between the leg row's coupling and the hull's pressure, and the rider's pitch commands
are a secondary term. ⚠️ These are pooled over both kinds and over windows of different lengths. They name the large
terms; they do not establish a cause.

**Lead B is not the slow fall.**

- **Compress, paired against the same stand without it:**
  - organic: 10 later, 4 sooner, 6 same, median +0.009 s (−0.70 to +0.70);
  - catch: 2 later, 4 sooner, 4 same, median 0.000 s.
- **Fall axis:** of 22 organic falls, the engine's capture state at the last attached frame is fore/aft in 2. Both are
  `cue`, with no Compress, planing at 4.18–4.35 m/s (s2w6 at 2.30 s, s2w10 at 0.93 s). The other 20 are across.
- None of the 7 slow stands is a fore/aft detachment by the engine's own test, with or without Compress.

## 3. Is the stand's regime right? (the latch and the lean cap)

The hull's vertical support against the latch, every standing frame, binned by `vW`:

| `vW`, m/s | frames | latch on | `Fp` / W (dynamic) | `Fb` / W (buoyancy) | pitch, deg |
| --- | --- | --- | --- | --- | --- |
| 0–2 | 408 | 0.00 | 0.12 | 0.25 | +40.4 |
| 2–3 | 417 | 0.00 | **0.35** | 0.23 | +18.7 |
| 3–3.5 | 263 | 0.30 | **0.56** | 0.19 | +8.4 |
| 3.5–4 | 301 | 0.64 | **0.56** | 0.17 | +3.0 |
| 4–4.5 | 242 | 1.00 | 0.55 | 0.13 | −4.4 |
| 5–6 | 446 | 1.00 | 0.64 | 0.11 | −9.6 |

(Organic, all stands. Catch gives `Fp` 0.44 / 0.49 / 0.50 at 3–3.5 / 3.5–4 / 4–4.5.)

- **The latch contradicts the hull's own forces.** Dynamic pressure exceeds buoyancy from about 2.5 m/s, and it carries
  the same 0.55–0.56 W at 3–4.5 m/s as just above the latch line. Nothing in the hull forces changes at 4 m/s.
- The game's own cue already calls a board planing at `Fp` ≥ 0.35 W (`CUE_SUPPORT`) and 2 m/s. So the cue and the
  latch disagree by construction: the cue lights at about 3.0 m/s, and the latch waits for 4.
- ⭐ **But with the stick centred, neither the latch nor the zero cap acts on this fall.** The lean asked was **0 in
  3 671 of 3 671 standing frames**: the stick is its only source while `holdLine` is off.
- The latch's other gates (`projecting`, the compressed turn, the tall rise after Compress) need a steer or a Compress
  release. The controller's gain schedule reads speed, not the latch.
- A rider standing at 3.7 m/s with the stick centred is therefore governed by the speed schedule and the water, not by
  the latch or the cap. Both matter once he steers (Group B), which is not this question.

## 4. Can a slow stand be saved within the balance's authority?

**Buoyancy:** 25.75 L × 1025 kg/m³ × g = 259 N = **0.35 W**. Fully sunk, the board floats a third of the pair. In the
stalls the measured buoyancy peaks at 0.20–0.28 W, and once `Fp` is gone the pair's water support is about 0.3–0.4 W.

- **Kind (a), the crest stalls (4 of 7):** they are lift-limited. The wave has passed (slope ahead ≤ 0), so nothing
  propels the board, and below about 1.2 m/s no fore/aft weight, Compress or ankle can make the 0.6 W the board lacks.
  The balance can only choose how he goes down. **Not savable within the balance's authority.**
- **Kind (b), mid-face at 3.3–3.7 m/s:** the hull still carries 0.56 W and the failure is lateral first. That is not
  buoyancy-limited, but it is not a fore/aft fault either. 3.5o found that below 4.5 m/s the shipped command overflows
  the ankle on 67 % of ticks even at < 10° of lean (row `'4'`'s gains), and `plantFloor=4.5` moved the slow bucket
  +0.017 s. Whether a lateral change inside the existing authority saves these stands was not measured here.
- **So no arm was built.** The diagnosis does not point to a fore/aft fix inside the authority:
  - the fore/aft predicates fire in 2 of 22 falls;
  - Compress is neutral, median +0.009 s;
  - the dominant slow fall is a stall after the crest passes.

## 5. The take-off's timing (catch mode, `paddle` script, 10 fresh runs)

| | value (median, range) |
| --- | --- |
| cue lights at | 3.08–3.25 s after the placement |
| through the water at the cue | 2.81–2.93 m/s, latch **off** in 10 of 10 |
| paddling on, first `vW` ≥ 4.4 m/s | +1.23 s (+1.08 to +1.73) after the cue |
| paddling on, latch on | +0.99 s (+0.77 to +1.33) |
| top speed through the water | 6.46–6.68 m/s at +2.8 to +3.9 s, `Fp` 0.45–0.62 W |
| crest passes (ahead < −1.5 m) | not within the logged window in any run (≥ 4 s after the cue) |

- **On this wave, paddling on past the cue does bring him to ≥ 4.4 m/s and planing**, about 1.0–1.7 s after the cue,
  with the crest not yet past.
- **Does the cue light before the board can carry him standing? Yes.** It lights at 2.8–2.9 m/s, where the stands
  that last are ≥ 4.4 m/s (organic) and the hull's `Fp` is about 0.30 W.
- The 1.2 s pop-up ends almost exactly when a paddler would reach 4.4 m/s. The pop-up itself costs margin: against
  the same run paddling on, at the same instant, the stand is **0.09–0.57 m/s slower through the water (median 0.36)**
  and **2–10° more nose-up (median 5°)**. The landing loads 1.43 bw, 0.70 of it on the front foot.
- Organic agrees: the cue lights at about 3.0 m/s on every wave, and whether the stand reaches 4.4 m/s depends on where
  the wave has the board, which is set at the cue (§1).

## 6. Candidates for Vicente's decision (not built)

1. **The cue's timing.**
   - *Evidence:* the organic stands that last are all ≥ 4.40 m/s through the water at the stand, and the short ones
     ≤ 4.26. The cue lights at 2.8–3.0 m/s. A paddler reaches 4.4 m/s 1.1–1.7 s after the cue on the test wave.
   - *Candidate:* light the cue on dynamic support the stand can use, for example `vW` ≥ about 3.5 m/s or `Fp` ≥ about
     0.5 W (the pop-up then lands at ≥ 4.4), or keep the cue and show a second "now" cue later.
   - Not measured here: the organic seeds with a later pop. The paddle data are the test wave only.
2. **The pop-up's speed cost.** The pop-up loses a median 0.36 m/s and adds about 5° of nose-up against paddling on (catch,
   10 of 10).
   - *Candidate:* a landing that loads the front foot less, or a shorter push, is a pop-up sequence decision.
3. **The latch's definition.** The hull is dynamically supported from about 2.5 m/s, and the latch says 4.
   - *Candidate:* latch on `Fp` > `Fb`, or on the cue's own `CUE_SUPPORT`.
   - ⚠️ The evidence says it would not change the centred-stick slow fall (ask 0 in 3 671 frames). It would change
     steering on slow boards, which is Group B's territory and a feel question.
4. **Not a candidate: a fore/aft arm.** The crest stalls are lift-limited after the wave passes, and Compress and the
   fore/aft predicates are not involved.
5. **Next diagnosis, if he wants the mid-face slow stands (kind b) and the catch mode's planing collapses:** the
   lateral headroom collapses by +0.25–0.5 s at 3.3–4.3 m/s with the stick at zero. The measurement is a lateral bank
   ledger round (`bankLedger.own` per source) on these stands, beside 3.5o's row-`'4'` overflow and 3.5p's spiral.

## 7. Not done / limits

- No arm built (§4). No changes under `src/`, so `tsc` and the seatbelts are untouched. `npx tsc -b` was not needed for
  docs-only probes; the probe was bundled with rolldown and ran.
- **The owner's own rides were not available.** The organic drive pops at the cue with Compress at +0.2 s, not at his
  timing.
- **Population:**
  - organic: 20 stands per script, on 3 seeds;
  - catch: 10 per script, all on one wave;
  - the "two kinds" split rests on 7 slow organic stands.
- The `paddle` runs never saw the crest pass inside 12 s. The window's end is therefore ≥ 4 s after the cue, and its
  exact length is not observed.
- **The fore/aft ledger is an attribution of the coupled solve's response.** The water's added mass and damping sit in
  `A`, so they appear as no source.
- The in-process carry-over of `test-wave-probe.ts` was found, not isolated.

## 8. Reproduce

    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/slow-take-off.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/sto.mjs && cat <s>/raw.mjs >> <s>/sto.mjs
    env MODE=catch RUN=<0-9> SCRIPT=<cue|cueC|paddle> OUT=<s>/c-<script>-<run>.jsonl node --max-old-space-size=3200 <s>/sto.mjs
    env MODE=organic SEED=<1-3> PERIODS=12 SCRIPTS=cue,cueC OUT=<s>/o-s<seed>.jsonl node --max-old-space-size=3200 <s>/sto.mjs
    python3 docs/research/new-rider/3.5/slow-take-off.py docs/research/new-rider/3.5/results/35t/catch
    python3 docs/research/new-rider/3.5/slow-take-off.py docs/research/new-rider/3.5/results/35t/organic

Each catch process takes about 85 s alone (59 s of spin-up). Each organic seed takes about 700 s with 13 processes
sharing 14 cores.
