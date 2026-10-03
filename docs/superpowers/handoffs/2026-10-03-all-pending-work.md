# Handoff: all pending work (2026-10-03)

For continuing on another computer. It covers every open branch and PR, what is left on each, the owner's merges and decisions, and the two sessions to start there: **Water physics research** (the wave-shape advisor) and the **Movement mapping prototype**. A third, optional session builds the rest of Padang Padang Part B.

Everything is pushed to GitHub as of 2026-10-03. The previous machine's memory doesn't travel, so this page, [ONBOARDING.md](../../research/water-physics/ONBOARDING.md) and the movement spec carry what the sessions need.

Run data that existed only on the old machine is copied into [2026-10-03-data/](2026-10-03-data/).

## Start here

1. Clone `vice7770/surfing-game` (or `git fetch --all` in an existing clone).
2. Run `npm ci` in each checkout you work in.
3. Start the sessions with the prompts at the end of this page.
4. Merge in the order below. The sessions can't merge for you (see "Merging").

## The owner's to-do

### Merge order

Stacked PRs don't retarget themselves. Before merging each one, change its base to `main` (the PR's Edit button, next to its title). If GitHub then shows a conflict, ask a session to merge `main` into that branch first.

| Order | PR | Branch | Base now | State |
|---|---|---|---|---|
| 1 | #82 | `claude/water-physics-advisor-local` | main | ready: the advisor's notes, this handoff, the Basilisk toolkit |
| 2 | #94 | `claude/particle-settings` | main | ready: Graphics › Advanced › Particles (Low / Medium / High) |
| 3 | #100 | `claude/compress-ladder` | main | ready: movement step 1, Compress |
| 4 | #106 | `claude/wave-pool` | `claude/compress-ladder` | ready: movement step 2, the Wave Pool |
| 5 | #91 | `claude/padang-clock` | `claude/padang-barrel` (#90, merged) | ready: the breaking front and slice clock |
| 6 | #92 | `claude/padang-mesh` | `claude/padang-clock` | ready: the drawn barrel |
| 7 | #95 | `claude/padang-contact` | `claude/padang-mesh` | ready: the rider's contact (PR 4) |
| 8 | #103 | `claude/padang-curl-colour` | `claude/padang-contact` | ready: the curl's colour |
| 9 | #104 | `claude/padang-rich-shading` | `claude/padang-curl-colour` | ready: Rich lip glow and dark throat (PR 6) |
| 10 | #105 | `claude/padang-peak-sizing` | `claude/padang-contact` | nearly: two test files to run unloaded, and its description (below) |
| 11 | #102 | `claude/padang-crash` | `claude/padang-contact` | draft: PR 5, measurements owed (below) |
| 12 | #107 | `claude/padang-every-spot` | `claude/padang-peak-sizing` | draft: PR 7, waits for your look at Padang Padang |

### Merging

The auto-mode check refuses Claude's `gh pr merge`, even after review and your instruction in the same turn. Merge on GitHub yourself, or allow it for a project by adding this to its `.claude/settings.local.json`:

```json
{ "permissions": { "allow": ["Bash(gh pr merge:*)"] } }
```

### Decisions and checks waiting for you

- **A look at Padang Padang's finished barrel**, with the browser pane shown (a hidden pane runs the game at about 1.5 fps). This gates PR 7's switch of the other spots. While there:
  - ride a tube by hand;
  - take #92's screenshots.
- **The Reef session's agreement** before the Reef switches to the swept barrel.
- **The Reef's lip jet:** raise the ask from 0.47 H² to about 0.55–0.6 H² (the periodic Basilisk runs), and the jet source's cap to about 0.3 on the Reef. Your call.
- **Downloads** (each needs your OK):
  - the Blenkinsopp thesis (about 9 MB);
  - the Teahupo'o lab dataset (Zenodo 11392175), which is restricted: request access with your own account;
  - the CC0 sound recordings (the S1 sound work).
- **#94's recommendations:** Medium particles for Auto's Medium result, and no spray stepping while Spray and mist is off.
- **Wave Lab max's one-cell troughs (from 20°):** numerical. Trace them or leave them.
- **Your playtest** of the movement flow once steps 3–5 are in.

## Padang Padang Part B: what's left

The swept barrel: Basilisk 2D overturn profiles, swept along a breaking front that follows the solver's crests, drawn as one surface, with the rider's contact, the crash, and Rich shading. Plans: `docs/superpowers/plans/2026-09-29-padang-padang-part-b.md` (on main), and `2026-09-30-padang-padang-part-b-pr3.md`, `2026-09-30-padang-padang-part-b-pr4.md` and `2026-10-01-padang-padang-part-b-pr7.md` (on the Padang branches; all three are on `claude/padang-every-spot`). The earlier handoff of the Padang Padang session is `docs/superpowers/handoffs/2026-09-30-padang-padang-part-b.md` on the same branches. Every ruling is a row in `docs/research/water-physics/consult-log.md`.

The agents building it stopped at about 21:10 on 2026-10-01, mid-run. Each item below starts from its last pushed commit.

### #105: the peak sized at the foot, and the crest-jump rule

`claude/padang-peak-sizing` at 45a2f72.

- **Built:**
  - Padang Padang's crests are sized at the 7 m foot (the peak's throws on Small went from 2 to 78);
  - the front follows a crest whose maximum jumps up to 10 m forward;
  - an optional `FrontOptions.ownOnset` (off): a jumped crest joins only on its own fresh onset.
- **The fast fronts check.** With the jump rule, Small's 90th-percentile peel by throws is 22.8 m/s, against 8.5 m/s before it. `ownOnset` was measured on Small, seed 1, 120 s ([own-onset-small.txt](2026-10-03-data/own-onset-small.txt)):

  | | Throws | From jumped tracks | Joins | Peel by throws (median / 90 %) | Peel by the solver's onsets | Fast fronts (15 m/s or more) | The other fronts' throws |
  |---|---|---|---|---|---|---|---|
  | off | 626 | 276 | 860 | 8.3 / 22.8 m/s | 5.4 / 20.3 m/s | 4 | 293 |
  | on | 538 | 188 | 699 | 8.3 / 23.6 m/s | 5.4 / 13.9 m/s | 2 | 235 |

- **Ruling (the advisor, 2026-10-03): leave `ownOnset` off, and #105 is complete as it is.**
  - It removes 20 % of the ordinary fronts' throws, against a ±5 % bar, and only half the fast fronts.
  - The two fast fronts it keeps are fresh onsets (100 %) at x 123–146, by the channel. The solver itself breaks fast there: one of them by its own onsets at 13.9 m/s.
  - Without the switch, the 90th-percentile peel by throws (22.8 m/s) matches the solver's own onsets (20.3 m/s). The barrel follows the solver's fast sections, and the median peel is unchanged.
  - If you see close-outs at the channel's edge or the −x edge in play, the fix is a spatial one, not the onset test.
- **Noted:** the fresh test (rise ≥ 0.65 in the crest's segment) never fired for 80 % of the ordinary joins. Don't use it as a gate anywhere without first checking what it measures.
- **Before merging:**
  - run `src/wave/SurfZoneSimulation.test.ts` and `src/wave/SurfZoneRunner.test.ts` on an unloaded machine (on the M1, 6 of 166 timed out at a load of 15–28);
  - add the `ownOnset` result to #105's description.

### #102: PR 5, the crash curve, the pour and the sound

`claude/padang-crash` at 822a8a5, a draft.

- **Built:**
  - the crash curve on the face point nearest the tip;
  - the jet held from its throw and poured over the collapse;
  - the void released into the G9 tube;
  - the whitewater gated until touchdown;
  - the sound.
- **Its front rules:**
  - **(a):** a point holding an uncrashed jet keeps its crest until its crash;
  - **lost or alone:** a jet whose point is lost, or alone on its front at touchdown, crashes where it was foreseen;
  - **the pace:** from the throw to its crash, a jet-holding point moves at a pace fixed at the throw, along its column at c_n / n_z. Its links use that z, and it still claims its crest so no second point forms;
  - **the handover blend:** that z blends to the claimed crest on the loft's own handover window, from 0.8 of the open time over 0.3 s. It runs on past the crash until done.
- **Measured before the last fix** (seed 1, 120 s):

  | Rule | 2 m Small | 2 m Medium | 1 m Small | 1 m Medium |
  |---|---|---|---|---|
  | (a): jets on their own point | 98.9 % | 89.3 % | 88.2 % | 82.8 % |
  | the pace, without n_z: jets on their own point | 97.8 %, none dropped | — | — | — |

  With the pace on 2 m Small, the gap at touchdown (the solver's crest − the paced z) was −0.75 / +0.66 / +2.15 m (10 / 50 / 90 %), and 28 of 89 jets were over 1 H. That's why the n_z fix and the blend came next.
- **Not measured yet:** 822a8a5, the n_z fix and the blend. The agent's scratch probe was lost with its worktree. `src/wave/probes/padangCrash.probe.test.ts` is the committed base to extend.
- **Next:**
  1. **The four cases:** 2 m and 1 m cells, Small and Medium, seed 1, 120 s. Report:
     - own point, alone at touchdown, dropped before the crash, coasted;
     - the gap at the blend's start, in m and in H;
     - the anchor's extra speed during the handover: the 90th percentile in m/s and as a share of the crest speed C. Over about 0.5 C, ask the advisor: the curl would surge as it lands;
     - clamp hits.
  2. **The catch check: one Small seed-1 catch run.**
     - On the merged build 19bdee6 the take-off cue lit half as often as before PR 5: 24 → 11 over two seeds, and stood 8 → 4. Medium: 53 → 49 and 20 → 29.
     - The lead suspect is the drawn face vanishing under the riders, as points left the front mid-tube (58–71 % then), which the pace rule stops.
     - If the cues come back to about 12 a seed, that was it. If not, separate the swept contact from the whitewater gate with switches (`--no-contact`, `--no-gate`). The scratch build that had them was lost.
  3. **#102's description:** add "PR 7 (#107) refits the held tip velocity (+11–23 % along); these jets read it once both are merged." Then mark it ready.

### #107: PR 7, every spot (draft)

`claude/padang-every-spot` at ae69d73.

- **Built:**
  - each spot's barrel record: transect, foot, onset tables, front rules;
  - the Reef's and the Point's level-12 cases and throw lines:
    - Reef: d = 2.35 η − 3.07, floored at the ledge top plus the tide;
    - Point: d = 1.55 + 0.95 η, clamped to η 0.56–2.10 m;
  - the switch mechanics (`SWEPT_BARREL` stays `['padang']`);
  - tests that switch spots on only inside themselves;
  - the deletion map (plan §5).
- **The one Padang Padang change in it:** every case's lip-tip velocity is refitted over its sustained overturn. The held lip is 11–23 % faster along.
- **Next:**
  1. Run the SurfZoneSimulation and SurfZoneRunner tests unloaded.
  2. After your look at Padang Padang: add each spot to `SWEPT_BARREL`, comparing its catch and ride reports before and after. The Reef also needs the Reef session's agreement.
  3. After PR 5 and the last switch: the deletion.
     - Keep and slim `PlungingLip.ts`, `LipSheetMesh.ts` and `richLip.ts` (the splash-up strips and PR 5's parcels).
     - Keep the carve for unswept spots with rider-sized voids (the Canyon's Big, the Beach's Big).

### The front splits

`claude/padang-front-merge` at d05e452: the `padangFrontGap` probe, no PR.

- **The problem:** one breaking crest drawn as two fronts lying end to end.
- **The counts on #105's base** (seed 3, 1 m cells; Big never ran): [front-splits-on-105.txt](2026-10-03-data/front-splits-on-105.txt).

  | | Pairs | Biggest causes | True splits (the 1 s/m rule) |
  |---|---|---|---|
  | Small | 1262 | restarted after a jump 638, adjacent-reach 190, never sized 170 | 4 |
  | Medium | 3071 | restarted point 1109, flicker 321, never sized 309 | 364 |

- **The clock link** joins facing ends within 10 m when |Δjoin| ≤ 0.166 s/m × the gap. It would link:
  - on Small: 352 of 638 restarted-jump pairs, 183 of 190 adjacent-reach, 90 of 97 front-lost and 73 of 79 flicker;
  - on Medium: 342 of 1109 restarted-point pairs, 242 of 295 adjacent-reach and 246 of 321 flicker;
  - only 0 of 4 true splits on Small, and 2 of 364 on Medium;
  - widening the neighbour reach for clock-compatible ends would link 2813 (Small) and 3143 (Medium) unlinked neighbour pair-steps, none over 1 s/m.
- **Ruling (the advisor, 2026-10-03): build it, behind a `FrontOptions` switch.**
  1. Link facing ends within 10 m when |Δjoin| ≤ 0.166 s/m × the gap.
  2. Bridge one-column gaps when that link passes.
  3. Leave the 1 s/m split alone.
  - **Measure** Small, Medium and Big with the probe: fronts per wave, drawn fronts a frame, pairs by cause, true splits linked (must stay near zero; over about 1 % → stop and ask), throws and peel.
  - **Open a PR** into `claude/padang-peak-sizing`, or into main once #105 is in.
- **Open for the advisor: Medium's fast throw fronts.**
  - 11 of 44 fronts throw at 20 m/s or more. Examples: 62 throws over 61 m at 104 m/s, and 65 over 64 m at 134 m/s.
  - In 6 of the 11, the joins peel at only 4–17 m/s while the throws go 28–134 m/s. Most of the 11 aren't jumped.
  - So the throws fire together although the joins peel: a different cause from #105's jumps.
  - **Hypothesis:** between the join (the solver's fresh onset, deeper) and the throw (the Navier–Stokes vertical depth, d = 1.56 + 0.56 η, shallower), the crests refract toward the contours and reach the throw depth together. If so, a throw should follow its join by the library's own lag, in time, not at a depth.
  - **Before ruling:** compare each fast front's throw times with its joins and with η along it.

### Part B follow-ups (ruled, not yet assigned)

- residual lace on the curl's lifted face: a face-aligned foam mapping;
- whitening at the lip's leading edge: with the spray look;
- the library's underside wiggles: a light smoothing in the converter;
- the curl's crest light at weight 0: the profile's own chord, if the seam shows;
- Rich's upload size: half floats.

### Owed on the M4 Pro (heavy runs)

- **Basilisk level 13** (`tools/basilisk/`, see its README):
  - Padang Padang's A0 0.3 (`run_padang.sh`, 8–35 h on one core, or 3–8 h with libomp, untested);
  - the Point's four cases: `LEVEL2=13 tools/basilisk/run_periodic.sh run point21_a08 point21_a15 point21_a23 point21_a30` (a08 closed no tube at level 12, so it may stay out);
  - the Beach's bar cases `beach32_a17` and `beach32_a26`: their parameters are in the PR 7 plan's table, and their `run_periodic.sh` lines still need writing;
  - a small Reef case near A0 0.09, over a transect that includes the inner flat;
  - optionally the Canyon at level 14.
- **PR 4's 180 s contact probe**, and the realistic cost checks.

## The Movement mapping prototype

The goal: a playable prototype where real surf technique works, on a steady wave to practise it.
- Spec: `docs/superpowers/specs/2026-09-30-movement-flow-wave-pool.md` (the 2026-09-30 grilling, Q1–Q26).
- Plan for step 1: `docs/superpowers/plans/2026-09-30-compress-ladder.md`.
- Order: Compress → Wave Pool → pumping → bottom turn and projection → cutback → the owner's playtest.

- **Step 1, Compress: #100** (`claude/compress-ladder`), ready.
  - The height ladder: normal → Crouch → Compress.
  - The weight on W/S.
  - The pad's right stick rotates the upper body.
  - A HUD stance readout.
  - A compressed-turn pull: a gameplay assist, 90° in about 1 s.
- **Step 2, the Wave Pool: #106** (`claude/wave-pool`, stacked on #100), ready.
  - A sixth spot, `pool`, first in the list and the default: an A-frame every 10 s at 1.0 / 1.25 / 1.5 m.
  - **The bed** (designed with the advisor): a finger reef, its arms at 71° easing to 65°, a ramped crest, a 2.5 m terrace.
    - The approach as built (the finger's faces running on seaward) is kept as Mead's "focus" (consult log, 2026-10-01).
  - **Rides:** 18–21 s a side, peeling about 5.7 m/s.
  - **Surf School** is on the pool.
- **Steps 3–5, pumping, bottom turn and projection, cutback:** `claude/pool-flow-probe` at d6a7c55, stacked on `claude/wave-pool`, no PR yet.
  - **Built:**
    - a `flow` autopilot style: bottom turn → projection → cutback → rebound;
    - the pool flow probe, `src/wave/probes/poolFlow.probe.test.ts`. It runs with `PROBE=1`, and takes `START=trough` and `SIZE=small|medium|big`;
    - the carve's carry: a compressed bottom turn keeps 0.9 of its speed at 90° (CARVE_CARRY 0.4, a gameplay rule in its own ledger).
  - **Found:**
    - the body stays leaned about 0.5 s after the steer is released;
    - cutbacks bled below planing and fell;
    - projections begun while the body was still banked 11–41° made every cutback fall within 0.2 s, or carve up the face to a stall.
  - **Work in progress, committed 2026-10-03 (d6a7c55):**
    - the projection now ends once the body is within 12° of upright, or at the face's top;
    - the runner reports the rider's bank.
    - `Autopilot.test.ts` passes (26) and `tsc` is clean. The probe has not been rerun on this change.
  - **Next:**
    1. Rerun the pool flow probe with the new projection end.
    2. Finish the cutback: change rails from near upright and keep planing speed.
    3. Pumping, with real physics only.
    4. Open the steps 3–5 PR, stacked on #106, for the owner's playtest.
- **The session's rules** (from the grilling):
  - **Controls:** the pad is the design target (analog), and the keyboard approximates it.
  - **No move recognition,** names or scores.
  - **Physics first:** real physics for pumping, and an assist only where a short still-water probe misses the bar.
  - **Checks:** no ride reports, autopilot sweeps or slow physics suites. Use:
    - fast unit tests for new logic;
    - the typecheck and the build;
    - one quick browser look;
    - short probes only for the Compress bar.
    - Update old tests only in the files you touch.
  - **Delivery:** the owner does the gameplay testing. One PR per step, stacked; the owner merges.
- **Wave-shape questions** go to the advisor ("Water physics research"), and are logged in its consult log.

## The water physics research role

- **Read, in order:**
  1. `docs/research/water-physics/ONBOARDING.md`: the role, the standing rules, the tools, and the Claude Doc's ids;
  2. that folder's `README.md`;
  3. the newest rows of `consult-log.md`.
- **The live doc:** the Claude Doc "Wave Physics Research". Every consult is logged twice: in the file, and in the doc's Consult log tab.
- **Open threads besides Part B:**
  - the library's jet speed: recheck it on the level-13 runs;
  - the Wave Lab troughs: the owner's call.

## Branches pushed only for safety (not pending)

On 2026-10-03, three old local branches had commits on no remote. They are pushed as they were, and are probably superseded by later merges. Check them before reviving anything:
- `claude/side-feed`: 7 commits from 2026-09-28;
- `claude/edge-first-order`: 2 commits from 2026-09-28;
- `claude/wave-and-turns`: 2 commits and a revert, from 2026-09-26.

Left behind on the old machine, deliberately: untracked scratch scripts and tests in older worktrees, and the agents' git-ignored working folders. The results worth keeping are in [2026-10-03-data/](2026-10-03-data/).

## Prompts for the other computer

### Water physics research

```text
You are "Water physics research", the wave-shape advisor for the Breakline surfing game (repo vice7770/surfing-game). Name this session "Water physics research" so other sessions can find it.

Fetch, then check out claude/water-physics-advisor-local (PR #82), or main if #82 is merged. Read in order: docs/superpowers/handoffs/2026-10-03-all-pending-work.md, docs/research/water-physics/ONBOARDING.md, then the newest rows of docs/research/water-physics/consult-log.md.

You research and advise: sourced values, or values marked provisional. You don't edit game code and you don't merge. Log every consult twice: in consult-log.md and in the Claude Doc "Wave Physics Research".

The owner wants Padang Padang Part B finished. Have its code built by a builder session or agents, one heavy run at a time. Rule on what they bring: the front-split link, Medium's fast throw fronts, and PR 5's measurements. Answer the Movement mapping prototype session's consults.

Start by telling me where each item in the handoff stands and what you'll do first.
```

### Movement mapping prototype

```text
You are the "Movement mapping prototype" session for the Breakline surfing game (repo vice7770/surfing-game).

Fetch, then check out claude/pool-flow-probe. It's stacked on claude/wave-pool (PR #106), which is stacked on claude/compress-ladder (PR #100). Run npm ci.

Read the section "The Movement mapping prototype" in docs/superpowers/handoffs/2026-10-03-all-pending-work.md. Read it with: git show origin/claude/water-physics-advisor-local:docs/superpowers/handoffs/2026-10-03-all-pending-work.md (or from main once #82 is merged). Then read the spec, docs/superpowers/specs/2026-09-30-movement-flow-wave-pool.md.

Continue steps 3–5 (pumping, bottom turn and projection, cutback) from the work-in-progress commit d6a7c55. Follow the spec's check rules: no slow suites. One PR per step, stacked; the owner merges.

Send wave-shape questions to the "Water physics research" session (ListAgents, then SendMessage).

Start by telling me the state and your next step.
```

### Padang Padang Part B builder (optional)

```text
You build the rest of Padang Padang Part B, the swept barrel, for the Breakline surfing game (repo vice7770/surfing-game).

Read "Padang Padang Part B: what's left" in docs/superpowers/handoffs/2026-10-03-all-pending-work.md. It's on branch claude/water-physics-advisor-local, or on main once #82 is merged. The rulings you build from are rows in docs/research/water-physics/consult-log.md.

In order:
1. #102 (claude/padang-crash): the four-case measurement and the catch check.
2. #105 (claude/padang-peak-sizing): the unloaded tests and its description.
3. The front-split link on claude/padang-front-merge, built behind a switch and measured.
4. #107's unloaded tests.

Run heavy probes one at a time. Before changing a rule, send the numbers to the "Water physics research" session and wait for its ruling. Don't merge: the owner does.

Start by telling me the state of each and your first step.
```
