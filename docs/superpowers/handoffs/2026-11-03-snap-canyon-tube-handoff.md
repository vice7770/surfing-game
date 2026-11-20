# Handoff, 2026-11-03: Snap round 2, Canyon C, the pool tube's face

The owner stopped all work on 2026-11-03: "stop all work, continue with only snap stance, continue Canyon C's after the
usage is refresh", then "stop snap also until usage restarts". Nothing is running. Each piece is saved and pushed on its
own branch.

When usage resets, resume **one agent at a time**, in this order:

1. Snap round 2
2. Canyon C
3. The pool tube's face

The standing rules, the merge flow and the M4 commands are in `2026-11-01-pool-barrel-handoff.md` and still apply.

## Main

Main is at 60451f1e. Merged today:

| PR | What | Notes | Switch |
| --- | --- | --- | --- |
| #184 | Plan: a surfable tube in the Wave Pool | `docs/superpowers/plans/2026-11-03-pool-surfable-tube.md` | — |
| #185 | The pool tube from the owner's own M4 cases (step 1) | `docs/research/pool-tube-cases-2026-11-03/README.md` | `?poolTubeCase=a38` |
| #186 | Snap, round 1: a fourth stance on Q / RB (R1), camera to R3 | `docs/research/snap-stance-2026-11-03/README.md` | `?snap=off` |

## 1. Snap round 2 (first when usage resets)

**Branch:** `claude/snap-load` at b0888561, in the `.claude/worktrees/canyon-beach-break` worktree.

**The owner rode round 1:** "the move is not ok, doest even turn or move deeply. just stays standing and the board moves
by itself. The rider falls after. The the rider should load itself ready for the movement like the other stances. Right
now it doesnt just stands". They tried both moves, one after the other.

**What they want:** a stance (loading the tail), not a trick, for a sharp turn anywhere on the wave at the cost of speed.
Their reference is youtube.com/shorts/xTgYU5ShueI ("Snap In The Lip Over Shallow Reef"), which shows two moves:
1. At the bottom: take the stance and turn sharply up to the top.
2. At the top: take it again and turn sharply back down.

They prefer that we review the problem and they test the solution; no video is needed.

**Done so far:**
- d49c1c87: Snap loads as deep and as fast as Compress and lets go as it does; the shoulders are wound toward where the
  turn ends and unwind as the board comes round.
- b0888561: the saved round-2 probes and data (`probes/round2/`: `zz-r2Load`, `zz-r2Two`, `zz-r2Film`, plus
  `two-moves.json`, `loading-drawn.tsv`).
- The notes have no "Round 2" section yet.

**Left to do:**
1. **Diagnose with numbers:**
   - the crouch depth, physics against drawn;
   - the board's yaw against the body's (the board spinning under a passive body);
   - the falls (the deep-U root, the body left behind, or the stall).
2. **Redesign** (physics only):
   - a visible deep load the moment it's held;
   - the body leads the turn;
   - both moves back to back;
   - the bottom-into-top fall solved, or explained physically.
3. **Measure** headless on the static face and a moving face.
4. **Tests:** tsc, the main suite, the SZS subset.
5. **Hand back** with a two-move shot list.

**Rules for this job:**
- Don't open the browser pane or start a dev server; the owner stopped a run that did. Show the pose with numbers instead
  of stills.
- The don't-retry list is in memory `p4e-carve-root-cause` and `bottom-turn-check`.

## 2. Canyon C (after Snap)

**Branch:** `claude/canyon-c` at cebcc995, in the `.claude/worktrees/canyon-xl` worktree. Notes:
`docs/research/canyon-c-2026-11-03/README.md`. The advisor's ruling is in `advisor-ruling.md`, and its consult-log row
is on the branch.

**The owner's ask:**
- the A-frame peaks are out: they broke in the same place beside the waiting rider and both ways at Big;
- one long, even sandbank from the +x side (the right, looking out to sea) peeling into the reef;
- the first break varying from the sea itself;
- the start a third of the way along;
- a channel past the reef.

**Scope:** no tube work at the Canyon (the tube is developed in the pool first). The waves' spilling shape stays.

**The owner's choices:**
- a 45° bank: peel about 39° at about 10 m/s at Medium, with starts 154 / 182 / 224 m out;
- the reef bowl's outline flipped about x −39.5, keeping its transect, rock and rules.

**Built:**
- the bank, with its tip at x +140 and a 1.2 → 3.6 m edge ramp over x +31..+140;
- the flipped bowl;
- the channel;
- the tank 40 m further out;
- `?canyonBed=b` for version B (`old` stays version A);
- B's tests moved onto `canyonBed: 'b'`;
- the take-off-zone age gate. The advisor's condition triggered it: rule A ran white up the line on 64–69 % of waves.

**Left to do:**
- finish the bars at Small, Medium and Big over 3 seeds: one direction, first-break spread, continuity, peel angle,
  bowl meetings, crests, the current at 600 / 1200 / 1800 s, health, the catch, the cost;
- the stills (headless only);
- the tests: tsc, the main suite, `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Cc]anyon"`;
- the hand-back with the owner's shot list.

## 3. The pool tube's face (after the Canyon)

**Branch:** `claude/pool-tube-face` at fdf5bae8, in the `.claude/worktrees/canyon-tube-runs` worktree. Notes:
`docs/research/pool-tube-face-2026-11-03/README.md`. The advisor's step-3 ruling is in `advisor-ruling.md`.

**Step 2's cause** (`claude/pool-tube-hole` 33e6a371): the swept loft hangs the case from the solver's crest. Its steep
face sits about 2 m behind the solver's gentle face, so the board stands on the loft's floor 0.3–1.1 m below the wave's
surface and free-falls.

**The ruling:**
- anchor the case on the solver's lower face (its 0.3 H crossing);
- support = max(case floor, solver), and water = the union of the two;
- a lagged join from the case's earliest frame;
- the post-throw clock capped at 1.25×;
- switches `?tubeFace=old`, `?tubeFrom=piece`, `?tubeLag=0`, `?tubeClock=old`.

**Built:** the switches, the crossing, the smoothing, the clock cap, the lagged join and the water union, with tests. The
pin check against main is identical except the pool's default, and the old-switch runs are in.

**Left to do:** the 13 bars at 1.5 and 1.8 m with both cases, the ride-camera strips (headless), the tests, the
hand-back.

**The owner's calls** (asked; still unanswered):
- the pool's own case or a38 until the size work;
- a hard lip-hit wipeout, or today's drag rule;
- un-park the tube size work next.

## Owner's notes for later

- **"A random wave current to match real life cycle":** the sea changing over time like real swell cycles, "for
  introducing to players". Not started.
