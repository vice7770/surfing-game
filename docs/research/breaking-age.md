# How breaking's age travels in 2D (2026-09-29)

Kennedy et al. (2000) breaking lowers a cell's onset threshold with "the age of the breaking event": it eases from the onset (0.35–0.65 √(gh)) to 0.15 √(gh) over T\* = 5 √(h/g), so a bore keeps breaking as it runs. In 2D the age has to travel with the wave. This note records why the way it travelled was wrong, what replaces it, and what changed.

## The problem: a fuse along the crest

Each cell took the oldest age of **any** breaking neighbour (±x and ±z), in the CPU solver (`BoussinesqSolver.breakingTerms`), its WGSL (`gpu/boussinesqWgsl.ts`, K7) and the stage 1 model (`Breaking.ts`).

**How it misbehaved:**
- An age could hop one cell per substep in any direction, along the crest too: a grid speed, about 60 m/s at 1 m and 1/60 s.
- After T\* the threshold is 0.15 √(gh), so a face of only about 8° breaks.
- Whole sections of a crest therefore broke at once, wherever they were steep enough for the lowered threshold.

**Found at Padang Padang** (the Padang Padang spec; probes on `claude/padang-padang`, `src/wave/probes/`):
- A new bed peeled at 2–5 times phase matching, whatever its shape.
- The waves broke in 30–50 m sections within about 0.5 s, at the same z but depths from 2.8 to 4.4 m.
- An onset classifier (`padangFuse.probe.test.ts`) found that only 1–3 % of the reef cells that started breaking would have broken on their own (rise ≥ 0.65 √(gh)).
- About 90 % started only because a breaking neighbour's inherited age had lowered their threshold. Most columns' first break of each wave was inherited from the neighbour beside it along the crest.

## The rule: carry the age from behind the front face

The water-physics advisor's rule A (`src/wave/breakingAge.ts`):
- A rising cell takes the oldest age of its breaking **parents**. It keeps its own age if it is already breaking.
- **The parents** are the cell up the surface's slope along the slope's main axis, and that cell's two diagonals.
- **The direction** comes from the face's downslope, −∇η. It points the way the wave runs wherever the surface rises (η_t = −c n·∇η).
- **No face, no parent:** where |∇η| ≤ 10⁻⁴, a cell takes no age.
- **Never beside it:** the cells along the crest never pass their age on.

**What it changes:**
- A long straight bore is unchanged, since its neighbours all carry one age.
- Breaking spreads sideways at most one cell per cell the face advances, the wave's own speed.
- No new state is carried, so the sea handover, the window shift and the device's field list stay as they were.

**Sources:**
- The −∇η direction is FUNWAVE-TVD's: `breaker.F`, `ANGLE=ATAN2(-ETAy,-ETAx)` ([source](https://github.com/fengyanshi/FUNWAVE-TVD/blob/b4c322e7582035ee19df8e6409a3dfedaff1cb96/src/breaker.F)).
- The stencil of the cell behind and its two diagonals is Celeris WebGPU's `Pass_Breaking.wgsl` ([source](https://github.com/plynett/plynett.github.io/blob/ebca435d02b258768e0352fbaf27404f2f135799/shaders/Pass_Breaking.wgsl)).
- The age of the breaking event is Kennedy's definition (FUNWAVE 1.0 manual, p. 17).
- Chen et al. 2000 (2D) could not be read (paywalled), so their exact 2D rule is unverified.
- **The combination is inferred.**

**Rejected:**
- **Taking the upstream neighbour by the flux:** tried as a probe on Padang Padang. The first breaks then followed the wedge's line, but the run blew up at about 115 s. The flux runs seaward on a breaking face and in backwash, so a bore lost its age.
- **Semi-Lagrangian advection of the age:** it smears the age at more cost.
- **Capping a side neighbour's age by its travel time:** it caps nothing, since a side neighbour's travel time toward the cell is about 0.

## Checks

**Unit tests** (`BoussinesqSolver.test.ts`):
- A white-box test. On a face running +z, the cells ahead and diagonally ahead inherit; those beside it and behind it do not. The same holds in backwash, and with the face running −x. With no face, only the breaking cell carries on. The old rule fails this test.
- An endless oblique crest at 20° and 40°, on the 1:40 plane beach, breaks where its height reaches 0.6–1.0 of the depth, as the head-on one does.

**Full suite**, on main with the Froude switch (390bf72): 1,671 pass, 13 expected fail. The Reef's stability probes hold under main's 20 m/s guard.

Before main's Froude switch, one of them had broken its then 30 m/s guard, on seed 3:
- the Reef's Big-swell probe spiked one cell to 32.9 m/s for a single frame (0.31 m of water over 2.43 m), then 20.4, then under 20;
- the other seeds ran as on main (13.0 / 14.4 / 7.9 / 8.9 / 11.6 m/s against 13.0 / 14.7 / 8.3 / 8.6 / 12.5).

The switch, which turns supercritical water into shallow water, holds that thin backwash.

**GPU parity** (`/gpu-check.html`, WebGPU on the M1, 1/60 s frames):

| Case | Max \|Δh\| | rms Δh / rms η | Breaking disagrees | GPU ms / frame |
|---|---:|---:|---:|---:|
| Point, Hs 1.4 m, 10 s, 10 s run | 6.2e-5 m | 3.6e-5 | 0.00 % | 3.5 |
| Reef, Big (Hs 3 m, 17 s), plunge zones, 20 s run, before the Froude switch: main | 0.27 m (shallow-water cells) | 0.7–1.9e-3 | 0.00–0.02 % | 4.3 |
| The same, before the Froude switch: face rule | 0.33 m (shallow-water cells) | 1.2–2.4e-3 | 0.00–0.01 % | 4.3 |
| The same, with the Froude switch: face rule | 0.032 m | 0.4–9.5e-4 | 0.00–0.01 % | 4.1 |

The rule costs nothing measurable on the device.

## Before and after, every spot

The rideability report (`npm run report:rideability -- --seeds 2 --periods 12`), run on the same seeds at the Wave Lab defaults (Hs 1.4 m, Tp 10 s, 10°, s 12). It was bundled once from main (390bf72, with the Froude switch) and once from this change. The peel angles are the meter's, which uses √(g h_b), so they read low (see Open).

| Spot | Close-out | Makeable by a pro | Median α | Median peel speed | Lip throws / min | Periods with a break |
|---|---|---|---|---|---|---|
| Beach | 46 % → 29 % | 17 % → 42 % | 14° → 34° | 20.0 → 8.7 m/s | 156 → 98 | 24 → 24 |
| Point | 88 % → 61 % | 13 % → 35 % | 11° → 22° | 25.5 → 13.3 m/s | 703 → 564 | 24 → 23 |
| Reef | 70 % → 28 % | 17 % → 72 % | 17° → 34° | 18.0 → 9.7 m/s | 479 → 305 | 23 → 18 |
| Canyon | 64 % → 31 % | 7 % → 31 % | 9° → 25° | 29.1 → 12.1 m/s | 10 → 2 | 14 → 13 |

Against main before its Froude switch (e513af9) the change was the same: close-outs fell from 46 / 88 / 61 / 57 % to 29 / 61 / 31 / 31 %.

**What it shows:**
- The fuse roughly doubled every spot's peel speed. Part of what the Point's close-outs were blamed on was the fuse; its bed and refraction remain the main cause.
- Lips come fewer, as the advisor predicted: an inherited section no longer throws from a gentle face.

## Open

- **The peel meter** turns speed into angle with √(g h_b). The skill ladder's angles are geometric, and surf-zone crests run 1.2–1.27 times faster than that (Tissier et al. 2013). So the meter reads 5–7° low at every spot. This is a separate change, put to the user.
- **Not re-measured here:** the catch report, foam coverage and the whitewater report. Lip counts, and with them the aeration and spray budgets, have moved.
- **Padang Padang:** its break now follows its wedge's contours at a steady depth. It still peels faster than phase matching predicts, which is the spot's own design work (`claude/padang-padang`).
