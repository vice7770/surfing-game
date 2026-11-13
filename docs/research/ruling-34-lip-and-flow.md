# Ruling 34: the M4's two overnight sets (2026-11-13)

Advisor: this session. Read: `pool-lip-and-flow-2026-11-13.md` and its tools. No run.

## The findings are accepted

1. **The thin-lip run gave a thinner lip.** At matched moments of the throw, Bo 4000 at level 14 is the same for the
   first 0.3 s, then 20–45 % thinner, thrown 12–24 % further, with a void 1.5–2.8× bigger.
2. **The crest water's share does not move at level 14.** The knee cases give 0.60 → 0.75 and 0.62 → 0.81 to the throw,
   within 0.05 of the level-13 values. **C2 step 4's ramp bar (0.6 → 0.8) stands unchanged.** The data behind it is
   better: the wave's speed now fits one line to 3.5 and 6.4 cm, against 35 cm before.
3. **The C2 library's lip spread is half the measure and half the bed.** At one stage of the throw it is 3.2×, not
   6.8×, and the bed drives it (S1 0.036 → 0.105), not A0.
4. **The spread does not make the lane steps.** Lane to lane the drawn lip changes 3 mm at the median. It bites only at
   lanes 6/7, where the keys themselves jump: 0.045 H, about 9 cm at a 2 m wave.

## Three corrections to the record

- **`plunge_measure.py`'s `lip_m` is not a cross-run measure.** It is the jet's area divided by the void's diameter,
  and it is read at whatever instant each run last has a clear jet. Those instants were 0.025 τ and 0.100 τ before
  touchdown, so the scalar said "1.6× thicker" where the geometry says 20–45 % thinner.
  - **The advisor was misled by it and told the owner the run came back thicker. That was wrong.**
  - From now on, lips are compared with `pool-lip-and-flow-2026-11-13/tools/lip_lib.py` at a matched stage. `lip_m`
    stays what it was written for: a resolution check within one run.
- **The lip's first sheet is not set by surface tension.** At 0.1 s it is 0.116 m at Bo 1000 and 0.121 at Bo 4000:
  unchanged. The lip-look study's "floor of one capillary length" holds later in the throw, not at the start.
- **The lip-look rank-3 bars were written on the lip's first 0.1 s**, the one part the Bond number does not touch. They
  are restated from 0.3 s on, where the sheet is capillary and a change can show.

## Why the lip is thick, in one line

The simulated water is stickier than real water. At Bo 1000 and h0 = 5 m its capillary length is 15.8 cm; real sea
water's is 2.7 mm, about 58 times smaller. The renderer paints white under 4 cm and nothing over 15 cm, so at Bo 1000
the whole lip sits inside that band. Bo 4000 halves the stickiness (7.9 cm) and thins the sheet 20–45 %. It does not
make a film: that would need a Bond number the grid cannot carry.

## Decisions

1. **C2 step 4 is unaffected.** Its ramp bar stands. No message to that agent.
2. **The lane steps' fix is unchanged:** step 3b §7 point 1, smoothing the lanes' slope key and the throw time along the
   crest.
   - **A second, cheaper lever for step 5:** the fray's white band (white under 4 cm, none over 15 cm) turns a 9 cm step
     into nearly-white against half-white. Widening or softening that band hides what the keys cannot.
3. **Two cases are re-run at level 13, Bo 1000:** `b1_a2` (2.4 cells) and `b3_a1` (4.4), which break the pipeline's own
   rule of about 6 cells. About 17 core-hours. **Queued on the M1 only after ruling 31's ten runs finish**; nothing is
   queued while they hold three cores.
   - It also gives the level-against-Bond control that is missing today: `b1_a2` at level 12 and 13 with one Bond
     number.
4. **Whether to re-run the library at Bo 4000 is the owner's call** (section below). Until they answer, the library
   stays at Bo 1000, and step 5 works on the look.
5. **No other re-runs.** A finer level alone will not thin the lip at Bo 1000: the capillary length is the whole white
   band, and only the Bond number moves it.

## For the owner

Nine C2 cases at Bo 4000 and level 14 cost about 13 hours a case, so one to two days of their M4. It buys a lip 20–45 %
thinner after 0.3 s, thrown further, with a bigger void. It is also closer to real water, though still far from it.

The advisor's recommendation: **one case first** (`b2_a2`, the thickest, 0.504 lip per H by the old scalar), about 13
hours, so the owner sees the new lip measured against its own twin before spending the rest. A single Bo 4000 case must
not ship inside a Bo 1000 family: neighbouring lanes would blend lips made of different water, which is the lane-step
problem again. So it is a measurement, not a half-way build.
