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

*(filled in after the arms ran)*
