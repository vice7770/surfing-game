# Step 3.4d — every prediction as written BEFORE its read, with its own falsification

Written on branch `claude/rider-two-body-d` before any arm of this round ran. The brief is step 3.4c's step-four
item 1: *"the glide's first second — 6–11× there, 1.0–2.4× after, same runs, nothing explains it … instrument the
placement, not the plant."*

The only reads taken before these were written are (a) the by-age split of **34c's own per-tick dumps**, which are
last round's data and are quoted in §1 of the Part as the reason the round is shaped this way, and (b) code reads of
the mount. Everything measured by a **new** arm is predicted here first.

---

**P1 — the exact split of the age profile.** `gm_i(|m−g|/|g|) = gm_i(|m−g|)/gm_i(|g|)` identically, so the
6–11×/1.0–2.4× profile is the product of a numerator profile and a denominator profile. **I predict the denominator
carries at least a third of it in log terms on the unsteered glide** — i.e. the game's own roll row is quieter in the
first second than after 1.5 s by at least 1.6×. *Falsified if the denominator's ratio is under 1.3× or over the whole
profile.*

**P2 — the mount's own time constants are all shorter than a quarter second.** Every initialisation the mount makes
(`resetBalance`: the estimate zeroed and the senses cleared; `pairFresh`: the felt vertical set to the world's
gravity, low-passed over `SPECIFIC_FORCE_TIME = 0.1 s`; `MOTOR_LAG = 0.05 s`; the delay line, which returns its first
sample until `BALANCE_DELAY = 0.1 s` of history exists) settles inside **0.25 s**, measured as the time the quantity
is within 10 % of its own later value. **So no stated mount transient has a one-second scale, and the first second is
not one of them.** *Falsified if any of the four is still outside 10 % at 0.25 s.*

**P3 — what IS different about the first second is the board's own heel against the water.** The mount places the
board flush with the face (`board.place` builds its up axis from the water's normal [R]), so at frame 1 the heel is
~0 while the face's tilt under it is 8–10°. **I predict the ratio `|tilt| / |roll − tilt|` falls by at least ten
times from the first 0.4 s to 1.0–1.5 s on the unsteered glide**, and that the crossover (the board's own heel
exceeding the tilt) is at **0.5–1.0 s**. *Falsified if the ratio falls less than 3×, or the crossover is before 0.3 s
or after 1.5 s.*

**P4 — the phantom heel's size, by age.** The model's water terms are read at `φ`, the roll from the **world's**
level, while every derivative was measured per radian of heel against the free surface [R, 3.3p §6]. The phantom is
exactly one column of the plant: `rollAccFull − rollAccTilt`, the probe's own tilt plant, `heelColumn` imported from
`predictiveBalance`. **I predict the phantom's geometric mean is over 2 000 °/s² in the first 0.4 s of the unsteered
glide — larger than the whole net error there (864 °/s²) — and still over 300 °/s² after 3 s**, i.e. still of the
order of the late net error (248 °/s²). **So I predict it is NOT a transient: only its share changes.** *Falsified if
it is under 1 000 early, or under 100 after 3 s.*

**P5 — and removing the phantom alone does not repair the first second.** 3.4c measured the water's gap and the
model's remainder at 2–4× the net each with opposite signs in 86–99 % of glide ticks. **So I predict that subtracting
the phantom from the model's row makes the first second's ABSOLUTE error larger, not smaller, in the majority of
first-second ticks** — the cancellation overshoots. *Falsified if it helps in over half of them.* (3.3p's pooled
per-run medians went 10.050 → 11.640, which is the same direction at a tenth of the size; this is the by-age read
nobody has taken.)

**P6 — the positive control, predicted before it runs: `PLACE=level`.** The same cell with one thing changed in the
**mount** — the board placed level to the **world** (its up axis the world's vertical) instead of flush with the
water, so `roll = 0` and the real heel is `−tilt` at frame 1. Nothing else differs: the same water, the same
heading, the same entry speed, the same rider. **If the first second's error is the mount's own geometry, then on
this arm the model's roll row at frame 1 must be SMALL (its φ is 0, so the phantom is 0) and the game's own roll row
LARGE (the board now has 8–10° of real heel).** I predict: the first 0.4 s of `PLACE=level` has
**gm |model's row| under 300 °/s²** (against 825 flush) and **gm |game's row| over 400 °/s²** (against 128 flush),
and **the sign of the error flips** — the model now under-predicts in the majority of first-second ticks (flush: it
over-predicts, `rollSignFull`/sign of `m−g` positive). *Falsified if either row moves less than 2× or the signs do
not move.* **I also predict the rider falls sooner on it** (median under 1.0 s against 1.183/1.450 s), and that is an
instrument, not a result.

**P7 — the reference, which the mount does not set but the face does.** The controller's reference is the plant's own
steady turn for the lean asked, **on flat water** unless `waterHeel: 'both'` [R, `predictiveBalance.ts:1425–1434`].
**I predict `|φ_ref|` stays under 1° for the whole ride on the unsteered glide while the face's tilt under the board
is 8–10° at the mount and 1.9–3.6° late** — so the trim the loop is holding is level with the **world** and not with
the **face**, for every tick of every run and not only at the mount. *Falsified if `|φ_ref|` tracks the tilt at all
(correlation over 0.3), or exceeds 2° anywhere on the unsteered arm.*

**P8 — the control that must hold: with every new switch off, the arms are 3.4c's.** `PLACE` unset and `MOUNT` unset
must reproduce 3.4c's and Part 2's published per-run medians to the digit on the same cells, and `git diff` under
`src/` and `server/` must be empty. *Falsified by any digit.*

**P9 — the owner's bar.** I predict **no arm of this round meets it** and that the `PLACE=level` arm is worse; the
round builds nothing. *Falsified if any arm's Compress runs reach nine seconds.*
