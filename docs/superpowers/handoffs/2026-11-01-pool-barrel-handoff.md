# Handoff, 2026-11-01: the Wave Pool Barrel and what comes next

Written when the account's weekly usage reached 96 % (it resets 2026-11-03, 14:00 UTC). A fresh session should be able to
continue from this file alone. Read it top to bottom before starting anything.

## Where main stands

Main is at 9f4a9eb1 (PR #180). Merged today, in order:

| PR | What | Notes | A/B switch |
| --- | --- | --- | --- |
| #175 | Duck-dive on L3 / D-pad down; the calls are keyboard-only | — | — |
| #176 | Duck-dive, two-body rider, steps 1–4 | `docs/research/duck-two-body-*` | `?duckBody=old` |
| #177 | Duck-dive drawn from the swimmer's parts | `src/dev/duckDiveStrip.ts` | `?duckDrawn=old` |
| #178 | Canyon version B: the up-coast peak peels into a reef bowl | `docs/research/canyon-b-2026-11-01/README.md` | `?canyonBed=old` |
| #179 | Wave Pool Barrel mode, step 1: the A-frame floor (superseded by #180) | `docs/research/pool-barrel-2026-11-01/README.md` | — |
| #180 | Wave Pool Barrel: one straight right-hander | `docs/research/pool-barrel-straight-2026-11-01/README.md` | `?poolBarrel=aframe` |

**The Barrel today:**
- The Surf screen's Wave Pool has a Waves row, Training | Barrel. Barrel's sizes are 1.5 m (Small, Medium) and 1.8 m (Big).
- The machine sends its regular wave at 39° onto a straight reef laid at 40° (`POOL_STRAIGHT`, `poolStraightAt` in
  `src/wave/pool.ts`). The reef starts by the +x corner and the wave peels toward −x.
- The side edges are periodic. The GPU refuses periodic sides, so the straight Barrel runs on the CPU.
- Riders start at u 40 (metres along the reef from its start).
- Training is byte-identical to main before #179.

## The owner's standing rules (from memory; they still apply)

- **Merging:** merge each piece as soon as its tests pass, without asking. Tell the owner when it's ready to test, with a short
  shot list.
- **Agents:** run one agent at a time, because of the owner's credit limit. Queue the rest. Do small jobs directly.
- **Physics:** physics-based changes only, each with a named cause and sources. Waves come straight to the beach, never from
  more than one side.
- **Measuring breaking:** measure it as the player sees it, frame by frame. Onset or tracker statistics have misled us before.
- **A/B switches:** every change gets a URL switch to the old behaviour. Online rooms are pinned to the default.
- **Riding tests:** never run SurfZoneRunner rider sessions; the owner rides and gives feedback. Headless RideSession and catch
  probes are fine.
- **Shapes:** before settling a breaking, lip, tube or foam shape, consult the water-physics advisor (the `water-physics`
  agent). Log each consult as a new top row in `docs/research/water-physics/consult-log.md`.
- **Big files:** keep big probe dumps out of git. Commit `.txt` summaries only. Disk is tight, so reuse worktrees.

## In progress: Pool Barrel step 3, the tube drawing

**Update at 98 % usage (2026-11-01 evening): step 3 is built and pushed, but not merged** (`claude/pool-barrel-drawing`,
head 51188fc8 or later).
- **Built:**
  - the straight Barrel's swept tube (the provisional a38 case, its front on the plunging section, the crash on);
  - T3 on every swept spot;
  - the Rich pale-band fix;
  - the A/B switches.
- **Checks so far:**
  - tsc (app and server) clean;
  - the main suite passed (3,008 tests);
  - the SurfZoneSimulation subset was still running at the checkpoint.
- **Next:**
  1. Read the branch's notes ("Where it stands").
  2. Run the merge flow below. Rerun the SurfZoneSimulation subset if its result isn't in the notes.
  3. Merge, then tell the owner with the notes' shot list.
  4. Start queue item 2.

- **Branch:** `claude/pool-barrel-drawing`, worked in `.claude/worktrees/canyon-beach-break`.
- **State:** its notes, `docs/research/pool-barrel-drawing-2026-11-01/README.md`, say where it stands, the next steps and how to
  verify. Read them first. The agent was told to keep them current and to commit and push often.

**What was already on main:**
- T1 (draw each case's own Basilisk frames) has been on main since 566531c0. The bounded-C shape is only behind
  `?tubeShape=c`.
- T2's ends blend over 1 m.

**What step 3 builds:**
1. **The pool wiring.** A `pool` entry in `src/wave/barrel/barrelSpots.ts`, for the straight Barrel only.
   - Until the owner's M4 cases land, it uses a provisional case: the Canyon's `periodic-canyon23-a38-l13`, re-checked for
     the new transect.
   - Swapping in the real cases must be a one-line change.
2. **T3, foam on the lip,** behind `?lipFoam=old`.
   - One foam value per slice, taken from its crest and latched when the slice is first drawn.
   - Thinned by the stretch, capped at 0.3 until touchdown.
   - White within 0.15 s after touchdown, on every swept spot.
3. **The pale lip band** (Rich only), behind its own switch: Rich shows the horizon sky where the view through the lip meets
   the back wall.
4. **Measurements and strips from the ride camera** (not from above).

**Decided (so no need to ask the owner):**
- The crash is on for the straight Barrel, behind a switch.
- White after touchdown is the default, under `?lipFoam=old`.
- "The bright edge" means the lip's backlit translucency, which T3's cap keeps.
- No tube-size levers in this job.

**Tests before merging:**

```
npx tsc --noEmit -p .
npx tsc -p server/tsconfig.json --noEmit
npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"
npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"
```

## Waiting on the owner

### The M4 Basilisk runs (step 2)

The owner was asked to start these on 2026-11-01. They feed the tube drawing.

```
git checkout main && git pull
npm run barrels:pool -- check
npm run barrels:pool -- setup        # only if check asks
npm run barrels:pool                 # pool_straight_small and pool_straight_big, about 2.5–4.5 h
npm run barrels:pool -- status
git checkout -b claude/pool-tube-runs && git add public/barrels/periodic-pool-straight-*.bin docs/research/pool-tube-runs && git commit -m "data(pool): the Wave Pool's straight Barrel tube runs at level 13" && git push -u origin claude/pool-tube-runs
```

When they land:
1. Rerun `npm run barrels` to regenerate the library and index (`docs/research/barrel-library.md`).
2. Swap the provisional case for the pool's own cases. Treat them as one family keyed by wave size (A0), as the advisor
   ruled.

### Playtests (shot lists in each PR's notes)

**Canyon B (#178).**
- Ride at Medium from the start into the bowl: does the white run on into the bowl with no gap?
- Check Big and Small, and compare with `?canyonBed=old`.
- Sit at the start for a few sets: is the catch as easy as before?

Open choices for the owner after riding:
- Medium's stall on the arm (2 waves in 5 reach the bowl): a steeper arm past 25 m, or the bowl moved 10 m seaward.
- About 6–11 % of the crests near the beach read as coming from two sides.
- The Small readout says the bowl is plunging, though it only spills at Small.

**The straight Barrel (#180).**
- Watch the start camera: does each wave start by the right corner and peel left?
- From above: are the crests straight?
- Count catches paddling nose-in, then angled 30–40° toward −x.
- Where does the barrel end?
- Compare with `?poolBarrel=aframe`.

Measured open items:
- The catch is at most 4 of 12 nose-in.
- It barrels for only about 50 m past the take-off.
- The solver's tube is 0.6–0.86 m tall, against a target of 1–1.2 m.
- There is no GPU path.

### Decisions still open from earlier

- Board spray in Classic only or Rich only.
- Froth drag only where the white is drawn.
- Turn rates.
- The compressed turn's skip.
- The beach peaks' wide take-off.
- The parked Beach and Pool arm angle.
- The Point's late cue and the Pool's lip take-off.
- Padang's remaining items (`docs/superpowers/plans/2026-10-22-padang-foam-and-tube-todo.md`).
- The twist's new home.
- The keyboard camera keys.
- The bots.

## Queue (in this order, one agent at a time)

### 1. Finish step 3 (above), merge, and tell the owner

### 2. Barrel current stability (found 2026-11-01, not started)

**The run:** 1800 s at 1.8 m on main 9f4a9eb1, `docs/research/pool-barrel-straight-2026-11-01/runs/health-big-1800s.txt`.

| | 600 s | 30 min |
| --- | --- | --- |
| Current behind the reef, toward −x | −0.33 m/s | −0.62 m/s (−0.49 at 900 s, −0.55 at 1200 s; slowing but not settled) |
| Surf meter | 1.67 m | 2.50 m (sets 2.61) |
| Platform H at s 120 | 2.11 m | 2.39 m |
| Line reaches u 150 | 71 % | 50 % |
| Start's x sd | 5 m | 9.7 m |

Health stayed fine throughout (finite, fastest water 7.84 m/s).

**The cause (inferred):** periodic sides have no end walls, so the wave-driven along-shore current circulates freely. A real
pool's end walls force the water to pile up and return. The returning gyre may also oppose the waves seaward, which would
grow them.

**Fixes already measured:** a land wall on the wrap column (`POOL_STRAIGHT.wrapWallWidth`, off) held the current, but it
shortened the line and raised the fastest water to 11.3 m/s.

**Next:**
1. Consult the advisor.
2. Candidates:
   - the closed basin's own constraint: zero net along-shore volume flux per cross-shore section, a uniform setup gradient
     as in constant-flux periodic channel flow;
   - a return channel;
   - sourced bottom friction.
3. Measure over 1800 s at both sizes. The meter must hold the size, the line must hold, and the catch must not drop.
4. Add an A/B switch.

**The probe:**

```
npx rolldown docs/research/pool-barrel-straight-2026-11-01/frame-probe.ts -o dist/scripts/straight-frame.mjs --format esm --platform node
node dist/scripts/straight-frame.mjs --size big --periods 175 --settle 50
```

This takes about 108 min of wall time on the M1.

### 3. Pool Barrel step 4: tube riding

This comes after the owner rides the drawn tube. The catch should improve first.

### 4. Switch on the Canyon bowl's tube, once the Pool's tube is good

The bowl's transect for new Basilisk cases is in the Canyon B notes.

### 5. Training pool waves

The owner said "Barrel first, Training later". Training keeps its V reef until they have ridden the straight Barrel.

## How to merge (the flow used all along)

Merge in the `.claude/worktrees/playtest6` worktree. Never merge in the owner's main checkout, which only fast-forwards.

```
git -c http.version=HTTP/1.1 fetch -q origin
git checkout -q -b claude/playtest-<date><letter> origin/main
git merge --ff-only -q origin/<branch>            # or --squash when a branch carries big files
npx tsc --noEmit -p . && npx tsc -p server/tsconfig.json --noEmit
# the main suite and the SurfZoneSimulation subset (above)
gh pr create -R vice7770/surfing-game --base main --head <branch> --title "…" --body-file <file>
git merge-base --is-ancestor origin/main HEAD && git -c http.version=HTTP/1.1 push origin HEAD:refs/heads/main
cd /Users/vicentealmeida/Documents/ChatGPT/surfing-game && git merge --ff-only -q origin/main
```

- **Commit messages** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **PR bodies** end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
