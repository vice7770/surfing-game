# 3.6k brief: a rail that holds

*From the Claude coordinator (Opus 5.5), surfer track, 2026-11-27.*

> **Status:** planned and approved, then **stopped before any build.** The water-physics advisor found that the rail cannot be designed from sources, and that a rail force is not the lever ([ADVISOR.md](ADVISOR.md)). By the plan, the coordinator took that back to Vicente. No builder was dispatched.

## The owner's question, his plan and his approval

**His words:**
- 2026-11-25: "The turn is too slow in Compress and Crouch".
- 2026-11-27, after riding 3.6i's combination: "compress is back to have a nudge while turning stoping the surfer to fully turn at will. This system is not correctly implemented".
- 2026-11-27: "I dont want a nudge in the middle of the turning".

**How this round came about.**
- 3.6j (consult log `7e0d00fd`) found that the turn as it ships comes from the balance's aim. Without that aim the body barely leans, the board barely goes on rail (Compress 4°), and the board comes round 16–55° less.
- The coordinator recommended a round on the board's own turn in the water.
- Reading the earlier studies reframed it. The water already turns the board about right for its rail (roll-plant, ruling 29e). What falls short is the rail: 17–20° in full-stick turns, against about 50° in a real bottom turn. And the board loses its sideways grip past about 18° of rail (rail-dig, ruling 29s).
- He planned it in two rounds of questions (2026-11-27, about 19:00–19:25 UTC). He took every recommendation ("Use all recommended", twice), then said **"Yes, start 3.6k"**.

**His decisions:**
- **Q1, the target.** A deep rail that holds: why a full-stick turn stops at 17–20°, and what it takes to carve at 40–50° without sliding out. That covers the rail's grip, the body's lean, and the balance's picture above 12°.
- **Q2, the rail's grip.** The water-physics advisor designs, from sources, a rail that holds:
  - the immersed face grows with heel and draft;
  - the buried rail carries buoyancy;
  - the edge holds.

  A builder then builds it behind an opt-in switch. `?hull=rail` is retested as it is, as a comparison.
- **Q3, the yardstick.** The sourced bottom turn (99° in 0.96 s, about 50° of rail; Forsyth et al. 2024, as `COMPRESS_PULL` cites it), the advisor's figures for this board at 6–8 m/s, and the existing clip reads (Q8). His ride is the final judge.
- **Q4, the balance.** As it ships, because its aim makes today's turn. 3.6j's "no aim" version (`?turnFirst=aim`, with the diagnostic slip override) gives a second reading.
- **Q5.** Design, build and test in one round, behind a switch.
- **Q6, what waits.** The quicker rider, Crouch's knee strength, Codex's A2, the falls after the steer, and `?hull=rail` as the default.
- **Q7, the pass lines** (below).
- **Q8, the footage.** The existing reads:
  - video 12's bottom turn shows the board at about 45°;
  - videos 10 and 11 time the rail's bite against the rear arm's lead.

  A new frame-by-frame read happens only if he sends a clip filmed from in front of or behind the rider on the face.
- **Q9, who.** The water-physics advisor first (Opus, xhigh). Then one builder (Opus, high: an implementation whose cause is still open). The advisor reports before the builder starts.
- **Q10, the start.** `claude/turn-first` at `7e4e149d`. The branch is `claude/rail-hold`, worktree `.claude/worktrees/rail-hold`.
- **Q11, the switch.**
  - `?railHold=on` changes only the forces on the board's hull and rails. Off by default, pinned off online.
  - The wave solver is untouched. The board's reaction on the water follows its forces, as now.
  - `?hull=rail` is tested as it is.
  - The balance, the rider and every bound stay as they ship.
- **Q12, his feel ride.**
  - A passing arm is served on port 5177.
  - If none passes, serve the closest arm that meets line 4 and line 3's no-nudge part, labelled as failing.
  - If none meets them, nothing is served.
  - The plan goes in the consult log for Codex.

**His standing rules:** "The turn is not to be limited." No hidden motors. No bound widened: a binding bound goes to him as a finding. The bots ride his way.

## The pass lines (switch off is the control)

1. **Regressions:** at most 1, by the standing rule (`scripts/stability-report.ts`, `baseline-full.json`), each explained. Name `big:s2:w16:crouch:left` as on the edge.
2. **Falls no worse than today** in each of three places, with the split during and after the steer reported. Straight deep rides (`compress|crouch:straight`, today 2 of 36) are no worse either. Halving is reported, not required.
   - the 80 deep steer rides: 47;
   - his way on Big (`hisway:left|right`): 19 of 36;
   - R2 let go as the steer starts (`release0:left|right`): 22 of 36.
3. **Turns no slower, and no nudge.**
   - `course05` and `course10` paired means over the 80 deep steer rides are at least 0.
   - Each stance on its own (tall, Compress, Crouch; Big seeds 1–3), on rides standing in both:
     - the heading change toward the steer from tS 1.0 to 2.5 is at least off's;
     - the largest change to tS 3.0 is at least off's.
4. **The rail holds:**
   - in the flat-water roll-plant lab, the settled side force per sideslip stays positive from 0 to 40° of rail at 7 m/s (rail-dig's measure; today it crosses zero at about 18°);
   - in the game, the paired mean rail in full-stick turns (tS 1.5–2.0) is deeper than off's, per stance.
5. **His ride.**

## What is known

- **Today's full-stick turns** (switch off; Big seeds 1–3; tS 1.5–2.0; rides standing at tS 2.5; the coordinator's measurement):

  | stance | rail | body's bank | heading rate | turn per degree of rail |
  | --- | --- | --- | --- | --- |
  | tall | 19.5° | 22.1° | 31.9 deg/s | 1.64 deg/s |
  | Compress | 17.0° | 20.9° | 22.9 deg/s | 1.35 deg/s |
  | Crouch | 14.5° | 18.2° | 17.8 deg/s | 1.23 deg/s |

  With 3.6j's "no aim" diagnostic, the same rides reach −3.7°, 4.4° and 9.2° of rail.
- **The roll-plant study** (`docs/research/new-rider/roll-plant/README.md`, 29e): 0.017–0.029 rad/s per degree of rail at 5–9 m/s with a rigid rider. G is 0.83–0.93 of a coordinated turn.
- **The rail-dig study** (`docs/research/new-rider/rail-dig/README.md`, 29s):
  - At 7 m/s the settled side force per sideslip is +1409, +937, +407, −186, −739 and −476 N/rad at 0, 10, 15, 20, 30 and 40°. The flip comes from the board sinking.
  - The rails give +58–96 N/rad. Holding 40° needs about +500 N/rad more: a rail with a body.
- **`?hull=rail`** (step 3.2u): round 3.3 (`docs/research/new-rider/3.3/README.md`) found it lowered the bank gain and the lateral acceleration, raised the deficit, and brought the fall forward. That was under an older balance.
- **The advisor's roll-stiffness consult** (`docs/research/water-physics/board-roll-stiffness.md`).
- **The rail's bite** (`RAIL_BITE` 48°, then bogging). **The balance's schedule** is trusted only to 12° of rail (`SCHEDULE_RAIL_CAP`).
- **The living doc** [How the Surfer Moves](../../new-rider/how-the-surfer-moves.html) on `claude/ride-everything`, which `CLAUDE.md`'s "Living docs" rule covers:
  - the builder lists the edits it needs in the hand-back;
  - the coordinator applies them on `claude/ride-everything`.

## The advisor's design

**No design.** The advisor's note is [ADVISOR.md](ADVISOR.md), 2026-11-27, about 20:15 UTC.
- **No rail law that holds a 40–50° carve at 6–8 m/s can be designed from sources.** There is no measurement past 15° of heel or near C_V 3, and no measured surfboard rail.
- **A rail force is not the lever.**
  - With the rail held in the roll-plant lab, the shipped board already carves steadily at 30–40° at 7 m/s: G 0.82, 1.39 deg/s per degree, yaw-rate p-p 0.08 rad/s.
  - Where it fails at depth (6 m/s at 40°; 8–9 m/s from 30°) it is a ~1.4 Hz yaw, skid and heave oscillation.
  - Every sourced or bracketed rail law makes that mode worse or trips the board.
- **So, as the plan says, the build stops.** No builder was dispatched, and the coordinator returned to Vicente with the advisor's three decisions:
  - (a) stop the rail build;
  - (b) re-aim the round at (i) the rider, meaning why the rail stops at 17–20°, and/or (ii) the water's deep-rail mode (a diagnosis; the candidate is the added mass acting along the water's surface normal instead of the plate's);
  - (c) replace lab line 4a with a free-motion line.
- The coordinator's checks are in the consult log.

## Logistics

- Commit with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push with `git push origin "HEAD:refs/heads/claude/rail-hold"` and check with `git ls-remote`.
- Stage only your own paths:
  - never `git add -A`, never commit `node_modules`, never run the whole vitest suite, and never use a bare `git stash`;
  - never open a PR and never merge.
- At most 8 game processes at once.
- At 80 % of the 5-hour window, stop at a clean pushed commit and hand back.
