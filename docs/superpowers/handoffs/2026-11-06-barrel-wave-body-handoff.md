# Handoff, 2026-11-06: the Barrel's wave body, Snap, and what is next

This was written at 87 % of the weekly usage (resets 2026-11-10 14:00 UTC), so the next session can pick up from here. Main is at 3753dfb5.

## The owner's current problem (top priority)

The Wave Pool Barrel now runs at full speed on the M4 Pro (below), but the owner rode it and reported (2026-11-06):

> Right now the body of the wave is unsurfable, the surfer falls instantly laying down. The wave body needs to somehow smooth merge to the existing wave and also the surfer needs to surf the wave body in the tube.

- "The wave body" is the tube's case surface: the swept loft built from the Basilisk cases, its wall water, and the contact's union and nearest surface (PRs #190, #191, #198, #199). "The existing wave" is the solver's sea.
- **The owner's choice:** diagnose and get the advisor's ruling now, and build after the weekly reset.
- **In progress at the time of writing:** the water-physics advisor's ruling 4, to be saved as `docs/research/pool-tube-track-2026-11-05/advisor-ruling-4.md` with a consult-log row. It:
  1. reproduces the instant prone fall with passive prone riders (no input) at the take-off and along the reef, against the pre-tube Barrel and each tube switch;
  2. maps the seam between the case surface and the solver's surface, in space and in time;
  3. rules on (a) a continuous merge of height, slope and flow, (b) what a prone and then a standing rider need to surf the face and the tube's wall, and (c) which pieces of #190–#199 to keep, change or drop;
  4. ranks the fixes, with code pointers, switches and bars.
- **Next:** if the ruling isn't on main, find it in the session's scratchpad or rerun it. Build its ranked fixes behind switches, then the owner rides. The rules: no bot riding (passive probes only), physics with sources, every change behind a URL switch, online rooms pinned to the default, the meter within ±5 % of main.

## Done today (2026-11-05 and 06), all merged

- **Snap:**
  - #194: the keys' deepest-stance hand-over.
  - #195: the full-effort set-up (shoulders 0.35 s, weight 0.42 s).
  - #196: the tail fan's ruling, the remote boards' spin, a steep jet's exit.
  - #197: `?snapPivot=lean`, the 70° lean, opt-in.
  - (c) body yaw was dropped by the owner; it is parked on `claude/snap-body-yaw`.
  - Open, all waiting on the owner's ride:
    - whether the lean holds its speed on a face;
    - the two moves back to back;
    - the first 0.3 s twitch;
    - a Snap lesson.
- **The pool tube:**
  - #198: the contact's nearest surface, the cap, the merge, and the guard made opt-in.
  - #199, ruling 3: inertia in the wall water and no retire on; the smooth wall, buoyancy and drop rule opt-in.
  - The bars and questions are in `docs/research/pool-tube-track-2026-11-05/README.md`.
- **The Barrel's speed:**
  - #200: CPU speed-ups, output-identical.
  - #201 and #202: `npm run survey:barrel` and `docs/research/pool-barrel-perf-2026-11-06/M4-RUN.md`.
  - **#203: the periodic sea on the GPU.** The owner's M4 run (3753dfb5) confirms the solver at 4.0 ms a step, the worker at 7.5 ms and the sea at 1.00×, against the CPU's 36.7 ms and 0.45×.
  - Why it was slow: the GPU refused the straight Barrel's periodic sides. The notes are in `docs/research/barrel-gpu-2026-11-06/README.md` and `pool-barrel-perf-2026-11-06/gpu-refusal-handoff.md`.
  - The read-back (5.3 ms, 3.6 MB a step) is the next lever, if a slower machine needs it.
- **Stale runner tests:** the owner started the task for `SurfZoneRunner.test.ts`'s 4 failures that predate this work; its branch is `claude/runner-test-stale`.

## Waiting on a decision

- **The bigger tube (the ledge).**
  - The owner's M4 batch at level 13 is on `claude/pool-tube-runs-2` (7e327af3; `docs/research/pool-tube-runs-2/report.md`). At equal faces, the ledge's tube area/H² is 0.12–0.14 against the knee's 0.001–0.007, and it stays open 2.7–2.8 s against 1.6–1.8 s.
  - The rule isn't applied yet: the ledge is adopted if its usable clearance per face height is at least 1.3× the face-matched knee's, and its lip lands within 0.6–1.6 H.
  - The level-14 reruns of the big knee cases never reached GitHub, and no run is going on the M4. The coordinator decided to apply the rule on the level-13 results, noting that the big knee case is a little under-resolved (3.9 cells across its lip); the gap is far too large for a rerun to flip it.
  - If it wins: the floor change in `POOL_STRAIGHT` (gradient about 1/2.0, kneeRounding 1), its probes, then the cases into the game. Best done together with the wave-body fixes, since both change the tube's shape.
- **The Canyon:** C is the default, judged "too scattered" by the owner. `?canyonWaves=true` gives version B's waves. A future-work item.

## Process notes

- **One agent at a time:** the owner's credit limit, with exceptions only when the owner asks.
- **The merge flow:** in a worktree, branch from `origin/main`, merge, run tsc for the app and the server, then the main suite with `--maxWorkers=3`, excluding SurfZoneSimulation and SurfZoneRunner. Run the SurfZoneSimulation subset when the sea's step changes. Then `gh pr create`, push to main fast-forward, and fast-forward the main checkout.
- **Tests:** never run rider sessions, catch reports or autopilot rides. Passive probe bodies are fine.

## Update 2026-11-08 (91 % of the week)

**Merged since:**
- #205: Snap recentres after release.
- #206: Snap's arms follow the turn; the deep load is opt-in as `?snapDepth=deep`.
- Ruling 4 is on main (`docs/research/pool-tube-track-2026-11-05/advisor-ruling-4.md`). The cause: the formation clock's rate switching lurches the wave body and tears the board from a prone rider. `?tubeForm=old` can be ridden now.

**The owner on Snap:** the balance and the release are better, but no stance turns sharply enough to break the top of the wave. The owner's model, agreed: the stick sets the sharpness.
- Partial stick: a rail carve, with the fins holding.
- Full stick: a short stamp on the tail (about 0.2–0.3 s), the tail slides, the board pivots sharply, then the recentre (#205) re-grips.
- It costs speed, so measure it on moving faces.
- Round 3's "stamp" lever (`docs/research/snap-fan-2026-11-05/README.md`) is the starting point: 305°/s off a climb, but it stalled.

**Keep in mind for all wave work (the owner):** the reference tricks happen on 60–80° lips, and the solver holds faces at about 15–20°.

**After the reset (11-10), the owner's order:**
1. Snap round 4: stick-proportional sharpness and the balance through it.
2. The wave-body build: ruling 4's ranks 1–3.

Agents run at `effort: "medium"` when near the limit.

## Update 2026-11-08, later: the ledge rule applied

The step-7 rule on the M4's level-13 batch (`docs/research/pool-tube-runs-2/decision.md`):
- **1.8 m faces: passes.** The ledge has 2.3× the knee's usable clearance (0.56 m against 0.24 m; the bar is 1.3×), and its lip lands at 0.66 H.
- **1.5 m faces: fails on the landing only.** The clearance is 2.0×, but the lip lands at 0.54 H, under the 0.6 H bar. That may be within the estimate's error, since the landing is read from the profiles and not from the jet's tip.
- **Open for the owner, with the advisor:** whether the 1.5 m shortfall blocks the floor change. If it doesn't, the floor change goes in together with ruling 4's wave-body build.
- **The owner's call (2026-11-08): adopt the ledge anyway.** The building started at 95 % of the week, on branch `claude/pool-ledge-floor`:
  - `?poolFloor=ledge`, opt-in: `POOL_STRAIGHT` `gradient` about 1/2.0 square to the reef and `kneeRounding` 1, per the step-7 ruling's §2;
  - its passive probes.
  If the branch isn't merged, its README says where it stopped. Next after it: the re-probes the ruling lists, then the ledge cases into the tube, together with ruling 4.

## Update 2026-11-09: small rider changes (all merged)

- **#211:** the Canyon start moved 10 m screen-left (−x); `?canyonStart=old`. The online spawn band doesn't follow the shift yet.
- **#212–#214:** a faster still prone turn, built with a hidden yaw moment and a hidden brake. The owner judged it "a motor", so #215 replaced it.
- **#215:** the still turn now comes only from a drawn pivot stroke: the outside arm strokes aft and the inside arm back-paddles. The stick sets the cadence (1.6 → 0.8 s) and the reach. A drawn check stroke stops the board on release.
  - **Rates:** 17 / 30 / 66°/s at ¼ / ½ / full stick. A tap turns 6.5°, and a full spin stops 0.4 s after release.
  - **Waiting on the owner's ride:** small sticks are faster than #213's (17°/s against 8°/s at a quarter); slow them down via `STILL_REACH_SHORT` / `STILL_CYCLE_SLOW`.
  - **The owner's rule:** no hidden motors; motion only from visible limbs, with the speed from the movement's intensity.
