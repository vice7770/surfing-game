# Duck-dive on L3, and the duck-dive measured again (duck-dive-l3, 2026-10-31)

The owner's queued job: "press down the wave, the mechanics of going below a wave".

This work was done on the M1 Air, on branch `claude/duck-dive-l3` from main at 3e47f09a. The runs were headless probes and the duck-dive report; no SurfZoneRunner rider sessions ran in tests.

## In short

- **Controls (built).**
  - The duck-dive is on L3 and the D-pad down. LT crouches only, standing.
  - The online left and right calls are on keys 1 and 2 only, and can be rebound to any button. The Bindings code and the Settings screen take an action with no default pad button, shown as "—".
  - Saves migrate once to pad layout 3, the way C1's did. A save still holding the old defaults (duck-dive LT and D-pad down, the calls on L3 and R3) moves them together, unless that would leave a button doing two things at once. A save from before C1 takes both layouts' moves.
- **The duck-dive on today's main still capsizes.** Since September, #147, #164, #165, #166 and #167 changed the prone balance, the stroke, the surface, the swim and the froth. None of them changed the dive's root cause:
  - On flat water the press still tips the board nose-up, from 9° to 13°. The deck goes 0.42 m down (the spec wants 0.5–1 m).
  - From paddling speed the pair rolls over 1.1 s into the dive (1.5 s in September).
  - Every 3 s hold loses the board while ducking.
- **So no physics was built.** `two-body-plan.md` is the plan for the two-body ducking rider, for the owner to see first: the body follows the board under, joined at the hands, with the knee and hips on the deck. It covers the sources, the plan of work, the risks and the tests.

## 1. Controls

- **`src/game/Bindings.ts`:**
  - `duckDive` on [10, 13] (L3, D-pad down);
  - `callLeft` and `callRight` on [] (keys 1 and 2 only);
  - `crouch` stays on LT (6).
- **`src/game/Settings.ts`:**
  - `padLayout` is now 3;
  - `LEGACY_PAD_DEFAULTS` lists each layout's moves, and the save is walked through every layout it predates;
  - the clash check now respects the actions' contexts. Under the old context-blind check, trim back's D-pad down, which the duck-dive shares lying down, would have blocked every move.
- **Text:** the help, the hints and the Surf School's duck-dive lesson name the duck-dive through its binding (`{keys}`), so they now show L3. The Steam Controller layout doesn't name these buttons. The wipeout spec's line on LT carries a dated note.
- **Tests:**
  - `Bindings.test.ts`: the calls on keys, and the left and right calls have no pad button;
  - `Controls.test.ts`: L3 duck-dives fully lying down, and LT doesn't, crouching standing;
  - `Settings.test.ts`: the layout-3 move, once, as one layout; kept when the player put something else on L3; a pre-C1 save takes both moves; a layout-3 save is kept as saved;
  - `settingsModel.test.ts`: L3 and "—" shown, and a button bound into the calls' empty slots.

## 2. The duck-dive measured

### Flat water (`duck-probe.ts`; output in `duck-probe-output.txt`)

The rigid rider on the reference board, `PlaneWater`.

| Case | Deck deepest | Nose deepest | Pitch at rest, at 0.3 s | Largest roll | Rider |
| --- | --- | --- | --- | --- | --- |
| 1.5 s press from rest | 0.42 m | 0.28 m | 9.2°, 13.1° nose-up | 6° | stays on, surfaces |
| 3 s press from rest | 0.42 m | 0.34 m | 9.2°, 13.1° | 85° | off at 4.65 s (in the rise) |
| 1.5 s press from paddling (1.62 m/s) | 0.23 m | 0.23 m | 11.4°, 15.6° | 79° | off at 1.08 s |
| 3 s press from paddling | 0.23 m | 0.23 m | 11.4°, 15.6° | 79° | off at 1.08 s |

Against September (`src/physics/duckDive.test.ts`'s open checks):
- **The depth:** 0.43 m then, 0.42 m now. The spec asks for 0.5–1 m: not met.
- **The pitch:** the press still tips the board 9° to 13° nose-up: "the arms sink the nose first" is not met.
- **From paddling speed:** it rolled over about 1.5 s in then, 1.08 s now. It is sooner now; why was not investigated, since the cause is the same.

### The test bore (`duck-probe.ts`)

A 1.2 m broken wave, `RideSession`, from five starts 0.3 m apart. The setback is how much further shoreward the board is 4 s after the front than on still water. "On" means the rider is still on the board at the end.

| Depth | Case | Mean setback | On | Set back with it on | Came off (after the front) |
| --- | --- | --- | --- | --- | --- |
| 2.5 m | on top | 5.7 m | 3/5 | 4.5 m | at the front |
| 2.5 m | early (9 m) | 2.5 m | 0/5 | — | 0–0.3 s: rolled over before or as it came |
| 2.5 m | on time (2.5 m) | 1.2 m | 5/5 | 1.2 m | — |
| 2.5 m | late (0.3 m) | 2.8 m | 1/5 | 1.7 m | 0.7–2.5 s |
| 2.5 m | on time, 3 s hold | 2.4 m | 0/5 | — | 2.9–3.7 s (in the hold's end and the rise) |
| 1.2 m | on top | 10.4 m | 0/5 | — | 0–3.4 s |
| 1.2 m | early | 4.5 m | 0/5 | — | at the front |
| 1.2 m | on time | 7.3 m | 0/5 | — | 0.6–1.1 s |
| 1.2 m | late | 9.1 m | 0/5 | — | 3.0–3.9 s |
| 1.2 m | on time, 3 s hold | 7.4 m | 0/5 | — | 0.6–1.1 s |

- **On time at 2.5 m works:** it is set back a fifth as far as on top, with every rider on. It met in September too.
- **Early dives capsize** before the wave arrives, the flat-water roll-over. Late dives mostly lose the board.
- **A 3 s hold** loses the board in every start.
- **Inside (1.2 m deep),** nothing keeps the board, on top included.

### The Canyon's real whitewater (`scripts/duck-dive-report.ts`)

Ghost paddlers start 25 m inside the Canyon's break point on the practice swell (Hs 1.4 m, Tp 12 s), one per way of meeting the broken water, side by side. A dive is a 1.5 s press. The setback is how much further shoreward the board is 4 s after the broken water reached it than on still water.
- **Sample:** seeds 2–4, 3 simulated minutes each, run side by side (`--seed-from`, `--json`; pooled by `canyon/pool.mjs`). That gave 14 episodes; 8 were abandoned with no broken water within 40 s. The runs took about 19 minutes.
- **Seed 1 alone:** `canyon/seed1-hold1.5.md` and `canyon/seed1-hold3.md`, 1–3 meetings per case.

| Way of meeting it | n | Median setback (Sept) | Still on the board (Sept) | Median depth diving | Came off |
| --- | --- | --- | --- | --- | --- |
| on top | 15 | 15.0 m (12.1) | 20 % (28 %) | — | 12 lost the board on top, median 0.9 s after it reached them |
| dive on time (2.5 m) | 16 | 6.6 m (6.5) | 6 % (6 %) | 0.64 m | 6 lost it ducking, 9 after the dive; median 2.0 s |
| dive early (9 m) | 16 | 5.8 m (5.5) | 13 % (38 %) | 0.55 m | 6 ducking, 8 after; median 0.4 s |
| dive late (0.3 m) | 16 | 11.6 m (7.3) | 0 % (0 %) | 0.42 m | 13 ducking, 3 after; median 1.1 s |
| on top, 15 m inside | 19 | 10.9 m (10.9) | 63 % (79 %) | — | 7 on top; median 1.6 s |
| dive on time, 15 m inside | 19 | 11.1 m (8.3) | 5 % (11 %) | 0.69 m | 10 ducking, 8 after; median 0.1 s |

Against the survey (§5):

| Check | Expectation | Today | September |
| --- | --- | --- | --- |
| on time against on top | under half | 6.6 against 15.0 m: met | 6.5 against 12.1 m: not met |
| early and late against on time | both worse | early 5.8, late 11.6, on time 6.6 m: not met (early better) | not met |
| 15 m inside | weaker | ratio 1.02 against 0.44: met | met |

- **Setback:** the dive's has hardly moved since September. On top is pushed further today (15.0 m against 12.1 m). The sea, the stroke and the froth have changed since (#164–#167), but not the dive; that was not investigated.
- **The board:** divers still lose it, 6 % kept on time against 20 % on top. Two fifths to four fifths of the losses come while ducking: the capsize, and the hold in the whitewater.
- **The 3 s hold** (seed 1) lost the board while ducking in every dive, 1.5–2.4 s after the broken water reached them.

## 3. Why no fix was built

The coordinator's rule: small physical fixes if it now mostly works; a plan if it still capsizes. It still capsizes:
- from paddling speed on flat water, in 1.1 s;
- in every early dive under the bore;
- in every 3 s hold, under the bore and in the Canyon.

The cause is the September one: a rigid rider perched on a fully submerged board, which the press tips nose-up. Since then,
- the eased stages (#51) kept the body on the deck through the press;
- the prone balance (#147) and the moving surface (#165) changed the paddling;
- the swim and climb (#166) and the froth (#167) changed what happens after the fall.

None of them changed the dive. September's attempts at posture, momentum, an upward-dog press and a low knee are on record as failing (the memory, `duckDive.test.ts`). `two-body-plan.md` is the plan instead.

## Tests

- **tsc:** clean.
- **Main suite** (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`): 2964 passed, 18 expected fail, 36 skipped. Among the expected fails are the duck-dive's open checks: the 0.5–1 m depth, the 50 L board, the nose first, and keeping hold from paddling speed.
- **SZS filter** (`-t "[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`): 11 passed (93 skipped by the filter).
- **The probes:**
  - `npx rolldown docs/research/duck-dive-2026-10-31/duck-probe.ts -o dist/scripts/duck-probe.mjs --format esm --platform node && node dist/scripts/duck-probe.mjs` (10 s);
  - `npm run report:duckdive -- --seeds 1 --seed-from N --minutes 3 --json <path>` (about 19 minutes a seed).
