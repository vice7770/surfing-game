# Step 3.4g — the predictions, written before the arms that test them

Committed before any Canyon arm of this round ran. Parts **F** (the test face, analytic) and **B** (the face the
board meets, read out of step 3.4f's kept dumps) had already been run when these were written, and both are named
here as **given**, not predicted — the ten below are all about part **C**, Canyon B's own water, which had not been
measured in this window by anybody.

**Given, not predicted** (so nobody can score them as hits): part F — the test `FaceWater` reads **local 16.0°,
turn 16.0°, upper80 13.1°, chord2 15.6°, chord1 15.9°** at `FACE=1.4,16,5.7`, with its steepest point at 0.50 of H.
Part B — the board sits at `faceFrac` **0.16** at frame 1 and meets **12.1–12.3°** along the face and **8.8–9.0°**
across its own deck there.

## The ten

1. **P1.** The clean ridable faces near the take-off (H ≥ 1.0 m, nothing breaking, crest within 25 m of z −125) read
   **`local` 13–18° median** — that is, they reproduce PR #223's own 15.5° (13.5–16.6) at x −112, whose population
   was per-wave medians over the 3.0–0.4 s before breaking.
2. **P2.** Step 5e's own read on the **same sea at the same instants** — the single tallest crest in z −200 … −110 —
   comes out **under 8° median**, so the disagreement between the two published Canyon numbers (15.5° and 5.4°) is
   the **window**, not the metric.
3. **P3.** On those clean faces `local` and `turn` agree to within **1°** (the trough is nearly flat), as they are
   identical on `FaceWater` by construction.
4. **P4.** `upper80` sits **2–4° below `local`** on them, as it does on `FaceWater` (13.1 against 16.0) and in 5e's
   Canyon row (4.2 against 5.4).
5. **P5.** The slope at **0.16 of H** — where the board actually sits — is **0.6–0.8 ×** those faces' own `local`,
   so **9–13°**, and the test wave's 12.3° at the board sits inside the spot's own range at the same place.
6. **P6.** `breaking > 0` appears somewhere on at least **2 %** of the faces over the long window. This is the
   control that the field is not identically zero by construction; the 10 s probe window found 0 of 644.
7. **P7.** The steepest point sits at **0.55–0.70 of H** (#223 measured 0.60–0.65), **higher** than `FaceWater`'s
   0.50.
8. **P8.** The clean H ≥ 1.0 m faces' median height is **1.1–1.5 m**, bracketing `FaceWater`'s 1.4 m.
9. **P9.** The breaking faces' `local` is **at or above** the clean ones' (#223: 15–18.5° while breaking against
   15.5° before).
10. **P10.** **No face reaches 30°** in the corrected window either, so nothing in this round moves step 5e's ruling
    that Canyon B cannot present the 30–45° a bottom turn wants.

## The controls, named before they ran

- **C1.** The spot is Canyon **B** and not the default Canyon, read off the built config and the solver's own grid
  (B is 400 × 451 = 180 400) rather than off the URL.
- **C2.** The projection the chain rests on — `|tilt| = |atan(tan(slope) · sin ψ)|` at the board's own `faceFrac`
  and heading — checked against step 3.4f's dumped `tilt` column on every frame of every arm read.
- **C3.** This probe's copy of step 5e's `faceOf` / `feltFace` reproduces step 5e's own published Canyon row on
  step 5e's own configuration (medium swell, seed 1, tide mid, its columns, its window, 60–120 s).
- **C4.** The swell is the owner's own default, `DEFAULT_CONDITIONS.swell = 'practice'` [R,
  `src/game/SurfConditions.ts`] — step 5e's Canyon row ran `medium`, and both are printed.
- **C5.** Nothing under `src/` or `server/` changes in this round, so no ride of the game can move; the diff is the
  read, and it is stronger than any hash.
