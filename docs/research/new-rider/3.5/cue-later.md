# 3.5u: the cue waits until the board can carry a stand (`?cueLater=on`)

*Surfer-track builder, Claude Opus 5.5, medium effort, 2026-11-23. Branch `claude/cue-later` from `claude/slow-take-off`
`21d4352d`. The owner's ruling (2026-11-23), asked "Should the take-off cue wait until the board can carry him
standing?": **"Yes, cue later."** Built as an opt-in switch, measured against today's cue.*

## 1. The condition (fixed before any arm ran)

Derived from 3.5t's committed catch data (`results/35t/catch/`, the test wave's catch start on the owner's address,
`cue` and `paddle` scripts, runs 0–9, one fresh process each). Script: `cue-later-threshold.py`, run from `results/35t`.

**The aim:** a pop at the cue lands at **≥ 4.4 m/s through the water** at the stand (the first `standing` frame). That
is 3.5t's separator (organic: every stand carried ≥ 3 s was at 4.40–5.14, every stand fallen ≤ 1.2 s at 2.36–4.26) and
it is the planing latch's own measure: horizontal |v_board − flow| at the board's position, `vW` in 3.5t's rows.

**The measure: speed through the water, not support.** 3.5t §3: the hull's dynamic support `Fp` is flat at 0.55–0.56 W
from 3 to 4.5 m/s on standing frames, and on the prone `paddle` frames it reads 0.34–0.49 W at every crossing from 3.4
to 4.0 m/s, against 0.29–0.33 W at 3.0 (no step that a threshold could sit on). It cannot tell a board that will land at 4.4 from one that will not.

**The arithmetic.**

1. The pop-up takes exactly 1.200 s from the press to the first standing frame (10 of 10 catch `cue` runs), and the
   pop lands one step (1/60 s) after the cue lights.
2. The pop-up's own cost, per run: the paddler's `vW` at the stand's instant minus the `cue` run's `vW` at its stand
   (same run index, same start): 0.38, 0.26, 0.27, 0.35, 0.48, 0.57, 0.52, 0.09, 0.18, 0.38 m/s for runs 0–9
   (median 0.36, range 0.09–0.57; 3.5t §5's figures).
3. For a candidate threshold X, in each `paddle` run: t_X = the first frame after today's cue with `vW` ≥ X while
   today's cue is lit; the stand would be at t_X + 1/60 + 1.2 s. Predicted stand speed = paddler's `vW` there − that
   run's own cost.

| X, m/s | cue later than today's by, s (median, range) | predicted stand `vW`, min / median | runs ≥ 4.4 of 10 | with the worst cost (0.57) |
| --- | --- | --- | --- | --- |
| 3.3 | 0.33 (0.22–0.48) | 3.99 / 4.43 | 5 | 2 |
| 3.4 | 0.42 (0.23–0.50) | 4.01 / 4.52 | 6 | 4 |
| 3.5 | 0.49 (0.27–0.53) | 4.06 / 4.57 | 9 | 6 |
| **3.6** | **0.58 (0.42–0.95)** | **4.50 / 4.80** | **10** | 9 (min 4.33) |
| 3.7 | 0.65 (0.57–0.98) | 4.54 / 4.98 | 10 | 9 |
| 3.8 | 0.80 (0.68–1.02) | 4.58 / 5.09 | 10 | 10 (min 4.43) |

**Chosen: `vW` ≥ 3.6 m/s**, the lowest 0.1 m/s step at which every run's own-cost prediction lands at ≥ 4.4
(min 4.50). It adds a median 0.58 s to the cue. 3.8 would also meet the aim at the worst cost of any run, at a further
0.2 s; it is the fallback if the arms land short. Run 9's paddler reaches only 4.89 at +1.2 s past the 3.6 crossing, so
it is the run to watch.

**Composition: a plain AND, no latch.** In all 10 `paddle` runs today's cue is lit at the first frame with `vW` ≥ 3.0,
3.2, … 4.0 (it stays lit 4.3–8.5 s after it lights, one run flickering dark for one frame at +0.07 s). It never drops
before the board reaches the threshold on this wave, so the player's cue is:

    playerCue = todayCue AND vW >= 3.6 m/s      (with ?cueLater=on; otherwise playerCue = todayCue)

where todayCue is the runner's cue as shipped (prone AND (rider's `popUpCue` OR `inTakeOffWindow`)). No state is kept,
so nothing needs resetting. If the organic arms show today's cue going dark before the board reaches 3.6 on waves that
would carry, that is reported, not patched here.

**What does not move.** The rider's own `popUpCue` (the paddle sprint reads it in `advanceStroke`) and the snapshot's
cue bit (the drawn body's on-wave blend in `stageBlend.ts`) stay on today's rule. Only the status's `ride.cue` (the HUD
prompt, the "POP UP NOW" label, the school's prompt hiding, `main.ts`'s rider view, the Autopilot and the jev recorder)
moves.

## 2. Results

Data: `results/35u/` (`catch/`, `organic/`, `school.jsonl`, the two generated table files). Reader: `cue-later.py`.
One run per process. "Off" is the switch-off build of this branch; "on" adds `&cueLater=on`. Speeds are horizontal
|v_board − flow| at the board (m/s, world frame), times are seconds (after the placement, or after the first `standing`
frame for time standing, censored at 3 s).

### 2.1 The off arm reproduces 3.5t exactly

- Catch `cue` run 0, off: 260 of 260 frame rows and the summary identical to 3.5t's committed row (every field).
- Organic seeds 1, 2, 3, off (`cue`, `cueC`, beside the new `never` rider): 24/24, 22/22, 24/24 summaries and
  1 743, 2 754, 2 140 frame rows identical to 3.5t's. The `never` rider changes nothing for the others.
- So the catch off arm is 3.5t's committed data (`catch/c-<script>-off-<run>` link to `35t/catch/`); the organic off
  arm was re-run to get the `never` rider.

### 2.2 The test wave's catch start (owner's address + `&testWave=catch`, runs 0–9 from `run × 0.1 s` paddling)

| arm | stood | `vW` at the stand, median (range) | stands ≥ 4.4 | time standing, median | ≥ 3 s | crest stalls |
| --- | --- | --- | --- | --- | --- | --- |
| `cue` off | 10 / 10 | 3.92 (3.47–4.27) | 0 | 1.15 | 4 | 0 |
| `cue` **on** | 9 / 10 | **5.05 (4.76–5.21)** | **9** | **≥ 3.00** | **9** | 0 |
| `cueC` off | 10 / 10 | 3.92 (3.47–4.27) | 0 | 1.03 | 4 | 0 |
| `cueC` **on** | 9 / 10 | **5.05 (4.76–5.21)** | **9** | **≥ 3.00** | **9** | 0 |

- **The cue lights later by 0.41–0.93 s** (on 3.58–4.15 s after the placement against 3.10–3.27 today), at
  `vW` 3.62–3.70. The prediction (§1) was 0.42–0.95 s.
- **Every stand landed above the aim**, 4.76–5.21 against the predicted 4.50–5.09 (median 4.80): the pop-up from a faster
  board costs less than 3.5t's 0.36.
- ⚠️ **Run 3 never stood** (both scripts): popped at 3.75 s (`vW` 3.67), separated by `balance` at 4.57 s, 0.82 s into
  the pop-up. Off, run 3 stood at 4.05 m/s and fell at 0.72 s.
- `paddle`: the player's cue lights at 3.58–4.15 s; paddling on from there reaches 4.4 m/s in 0.57–0.78 s (off: 1.08–1.73
  s). The crest never passes inside the logged window in either arm, so the window here is ≥ 4 s, as in 3.5t.

### 2.3 Organic (owner's address, Canyon B Medium, seeds 1–3, 12 periods: 35 waves)

| arm | popped | stood | `vW` at the stand, median (range) | stands ≥ 4.4 | time standing, median | ≥ 3 s | crest stalls (kind a) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cue` off | 21 | 20 | 4.04 (2.34–5.14) | 5 | 1.11 | 5 | 4 |
| `cue` **on** | 14 | 13 | 4.47 (3.76–6.23) | 8 | ≥ 3.00 | 7 | **0** |
| `cueC` off | 21 | 20 | 4.04 (2.34–5.14) | 5 | 1.08 | 6 | 4 |
| `cueC` **on** | 14 | 13 | 4.47 (3.76–6.23) | 8 | ≥ 3.00 | 8 | **0** |

(Kind a here: a stand under 3.6 m/s, the slope ahead ≤ 0 within 0.5 s, a fall within 3 s; it picks 3.5t's four, s1w12,
s2w8, s3w7, s3w10, and no other.)

- **Seven waves lose their cue entirely** (s1w7, s1w11, s1w12, s2w8, s3w3, s3w7, s3w10; per-wave table in
  `organic-tables.md`): on all of them the crest later passes the paddler, and while today's cue was lit the board
  never reached 3.6 m/s through the water (max 0.28–3.39). Off, six of them stood and fell by 1.73 s (four were the
  crest stalls) and s3w3 lost the board in the pop-up. **No stand that lasted ≥ 3 s off lost its cue.**
- **On the 13 waves where both arms stood**, the cue lit 0.13–1.02 s later on 11 and 2.78–4.73 s later on s1w8 and
  s3w9; stand `vW` rose on every one (e.g. s1w10 4.26 → 4.47, 0.70 → ≥ 3 s; s3w12 4.09 → 4.45, 1.73 → ≥ 3 s).
- Still short with the switch on: s1w8 (3.76, 0.78 s), s2w5 (4.10, 1.05), s2w10 (4.32, 0.72), s3w6 (4.36, 1.00),
  s3w9 (4.34, 0.80), and `cue` s2w6 (5.21, 1.78; `cueC` ≥ 3 s). Four of these land under 4.4: the organic waves do
  not all accelerate as the test wave does after the cue.
- ⚠️ **s3w2 on: lost the board in the pop-up** (pop at 9.83 s, 2.78 s after today's cue; separated `lost board` at 10.48 s).
  Off it stood at 3.31 and fell at 1.13 s. (Off, s3w3 lost the board in the pop-up the same way: 1 of 21 pops off, 1 of 14 on.)
- Compress (`cueC`) is neutral, as in 3.5t: the same stand speeds; time standing differs on s2w6 only.

**The reaction window (`never` rider: paddles and sprints, never pops, logged until the crest passes):**

| arm | today's cue lit | player cue lit | crest passed the paddler | player cue lit before the crest passed | window: player cue → crest passed, s | player cue lit for before it passed, s | crest never passed in the trial, cue lit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| off | 21 / 35 | 21 | 19 | 7 | median 3.25 (2.25–7.98) | median 0.63 | 14 |
| on | 21 / 35 | 14 | 19 | **0** | — | — | 14 |

- Off, the 7 waves on which the crest passes after the cue are exactly the waves the switch takes the cue from: the cue
  lit 2.25–7.98 s before the crest passed, but only for a median 0.63 s of that.
- On, the cue lights only on waves that carry the paddler: the crest does not pass within the 19 s trial on any of the
  14, so the window there is censored, ≥ 1.40–12.37 s (median ≥ 10.9 s). The on cue lights a median 0.54 s
  (0.13–4.73) after today's on those waves.

### 2.4 The Surf School (`cue-later-school.ts`: the school's recorded pool wave, built as `enterSchool` builds it, owner's address)

| lesson | input | arm | prompt shows at, s after placement (today's cue at) | `vW` there | pop → stand `vW`, time standing |
| --- | --- | --- | --- | --- | --- |
| `popUp` (caught start) | no paddle | off | 0.03 (0.03) | 1.60 | 2.80, 0.87 s |
| `popUp` | no paddle | on | **1.93** (0.03) | 3.78 | 5.73, 1.43 s |
| `catch` (waiting start) | paddle | off | 6.47 (6.47) | 2.87 | 4.89, 2.00 s |
| `catch` | paddle | on | **7.27** (6.47) | 3.62 | 5.04, 0.78 s |

- Never-pop: the prompt is lit 2.68 s in the `popUp` lesson off and 0.80 s on; in `catch` 1.83 s off and 1.32 s on (12 s
  logged).
- With the switch off the school's targeted tests pass (`src/game/school`, 5 files) and the prompt shows exactly when
  today's cue does (the off rows above): the lessons are unchanged.
- One run each: the `catch` lesson's single on run stood faster and fell sooner; not a population.

### 2.5 The HUD

`results/35u/hud-cue-later-on.jpg`: the `breakline-balance` preview (5175), owner's address + `&testWave=catch&cueLater=on`,
Canyon Medium from the menu, R (the test wave's restart), Space held (dispatched as a key-down from the page) until the
prompt showed. "Pop up now – Enter" appeared 3.42 s of wall time after the restart, at sea time 61.82 (start 58.00), the
ride status reading `cue: true`, prone, 5.33 m/s over the ground.

## 3. Checks

- `npx tsc -b`: clean.
- `src/physics/takeOffCue.test.ts` (new: `playerCue` off = today exactly; on dark below 3.6 and lit from 3.6 while today
  is lit; `speedThroughWater`), `src/ui/ridePrompt`, `src/dev/TubePilot`, `src/wave/barrel/tubeApproach`, `src/game/school`:
  pass. `PhysicalMode.test.ts -t "cueLater|holdLine|faceTrim"` (new switch test, pinned online) and
  `SurfZoneRunner.test.ts -t "cues the pop-up|holds the status"` (new: the status's cue held back, the snapshot's bit
  not): pass.
- Canyon byte check (Medium, 3600 steps, fresh spin-ups), before (`21d4352d`) and after: snapshots `a367d938f15fa934`,
  state `9e5831f80e38abd9`, both.

## 4. Not done / limits

- One threshold measured (3.6). 3.8 (§1) was not run.
- The run-3 catch and s3w2 organic pop-up failures (a separation during the pop-up from a board at 3.6–3.7 m/s) were not
  diagnosed.
- The organic waves that still fall short with the switch on (5 stands at 3.76–4.36) show the 3.6 trigger does not
  guarantee 4.4 off the test wave.
- The HUD screenshot's input was a synthetic key-down, not a held key.
