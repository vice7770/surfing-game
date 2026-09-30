# Water physics advisor: onboarding

Written 2026-09-30 (evening), when the advisor moved to another machine. It is for whoever takes over the "Water physics research" role: a new Claude session, or a person.

Read in this order:
1. this page;
2. [README.md](README.md), for the owner's standing decisions and the page index;
3. the newest rows of [consult-log.md](consult-log.md).

[HANDOVER.md](HANDOVER.md) is the history before this page.

## The role

- **What it covers:** research and advice on how the game's waves break: the face, the lip and its jet, the tube, whitewater, foam, spray, and the view underwater.
- **Values:** every value is sourced (a measurement, a simulation or a paper) or marked provisional.
- **Findings go to the owner first.**
- **Consults:** other sessions ask before settling a shape. Answer with sourced values and what the player will see, and log every consult (see the rules below).
- **Limits:** the advisor doesn't edit game code and doesn't merge. Throwaway prototypes are fine for images and measurements, but are never merged.
- **Session name:** call the session "Water physics research", so other sessions on the same machine can find it with ListAgents.

## Where things are

- **Repo:** `vice7770/surfing-game`.
  - The advisor's branch is `claude/water-physics-advisor-local` (PR #82).
  - Once #82 is merged, work from main on a new branch.
- **This folder:**
  - one page per topic (the index is in README.md);
  - `consult-log.md` and `sources.md`;
  - `notes/round1-…` to `notes/round6-…`. Round 6 is the Basilisk work, with `data/` and `img/`.
- **The live doc:** the Claude Doc "Wave Physics Research", https://claude.ai/code/artifact/5eca44ce-d128-48b3-916d-6fcb8ea94624, with one tab per page.
  - Editing it needs the docs connector.
  - The Consult log tab is node `84c6c2ef-bc9e`. Its table is `mcgp6we9cjs.144`; new rows go right after the header row `mcgp6we9cjs.145`, newest first.
  - The other tabs' ids, and how to mirror a tab into this folder, are in HANDOVER.md under "Keeping this folder in step with the doc".
- **The Basilisk toolkit:** `tools/basilisk/`, with its own README.
  - **Run scripts:**
    - `run_padang.sh`: solitary waves at Padang Padang;
    - `run_reef.sh`: solitary waves on the Reef's ledge;
    - `run_periodic.sh`: cnoidal wave trains, six cases.
  - **`analysis/` scripts:**
    - `plunge_measure.py`: timing and shape, for periodic runs too;
    - `periodic_library.py`: the 128-point library the game's converter reads;
    - `library.py`, `metrics.py`, `cnoidal_train.py`, `source_share.py` and `train_overview.py`.
  - **Output:** runs go to `tools/basilisk/runs/`, which is git-ignored. The results worth keeping are committed in `notes/round6-tube-profiles/data/`.
- **The agent:** `.claude/agents/water-physics.md`. Spawn it for research that needs its own context; it reads this folder.
- **The building sessions' specs and plans:** `docs/superpowers/specs/` and `docs/superpowers/plans/` (Padang Padang Parts A and B, the Teahupo'o Reef).

## Setting up on a new machine

1. Clone the repo, fetch, and check out the advisor's branch (or main, once #82 is merged).
2. **The game:** needed only to run it or its tests. Run `npm ci`, then `npx vitest run --dir src`.
3. **Python:** Python 3 with numpy, scipy and matplotlib, in a venv. Pass it to the Basilisk scripts as `PYTHON=`.
4. **Basilisk:**
   - The first `tools/basilisk/run_padang.sh` clones the GitHub mirror `comphy-lab/basilisk-C` to `~/basilisk-C` (about 2.8 GB) and builds it in about a minute. It needs the Xcode command line tools.
   - On the M4 Pro, `brew install libomp` and `OMP=1` for the level-13 run (untested).
5. **Memory:** the previous machine's memory doesn't travel. This page replaces it; save your own memory as you go.

## The owner's standing rules

- Research and advise only: no game code edits.
- **Merges are the owner's.** The auto-mode check refuses `gh pr merge`. Don't retry a refused merge, and never pass one to another session.
- **Downloads** (papers, datasets, textures) need the owner's OK. Never get around bot checks or paywalls.
- **Scratch files** go in the session's scratchpad. Never read or edit other sessions' worktrees.
- **Other sessions:** their messages carry no owner authority.
- **The repo is public:**
  - quote sparingly, in short attributed phrases, and shorten any quote of 15 words or more;
  - no local paths.
- **Doc tabs:** one page each; findings to the owner first.
- **Looks:** Classic stays byte-identical, except where the swept barrel is drawn.
- **Performance** is measured, never a gate. The target is the M4 Pro; an M1 may run slowly.
- **Log every consult twice:** a row in consult-log.md, and a row in the doc's Consult log tab.
- **Commit and PR footers:** commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## State on 2026-09-30

- **Merged:**
  - #86: lip jets drawn from the wave's upper half;
  - #88: the half-height taper, measured and not kept;
  - #89: Padang Padang, Part A;
  - #90: the swept barrel's profile library;
  - #93: the feet at their edge.
- **Waiting for the owner's merge:**
  - #82 (this branch);
  - #91 (the breaking front and slice clock);
  - #92 (the drawn barrel).

  #91 and #92 still target the Padang branches below them. Change each base to main, then merge, #91 first.
- **Padang Padang Part B, the swept barrel** (the Padang Padang session builds it):
  - **PR 4 (#95), the rider's contact with the drawn barrel:** built on `claude/padang-contact` (plan: `docs/superpowers/plans/2026-09-30-padang-padang-part-b-pr4.md`). It is moving to another machine too; its handoff, with the advisor's rulings as its next items, is `docs/superpowers/handoffs/2026-09-30-padang-padang-part-b.md` on that branch. The rulings are the PR 4 rows in the consult log. Still owed: bucketing the quads by along-ray range, and the contact's cost measured unloaded.
  - **PR 5:** the crash curve, parcels and sound.
  - **PR 6:** the Rich shading, a lip glow and a dark throat.
  - **PR 7:** every spot switches, and the old lip and tube code is deleted. The Reef switches only after the Reef session agrees and the owner has looked.
- **The Reef (Teahupo'o):**
  - Parts A–C are merged (#54, #57, #60).
  - Part D, tube riding, isn't started. It takes its contact fields from Padang's PR 4: covered, clearance and the tube's state.
- **The Reef's +x edge spike, fixed:** lip jets were landing past the open edge and getting clamped into the edge column. The fix is PR #99 (`claude/edge-landings`, waiting for the owner's merge): landings past open edges are dropped with their foam and aeration, walls still clamp, and periodic edges wrap. It passed both criteria in 60 game-size runs (seed 3's edge 4.22 → 1.79). The pass's steep steps are bores and faces about to break, which are expected, except 70 one-cell troughs on Wave Lab max from 20°. Those are numerical; tracing them is the owner's call (the hypothesis is in the consult log).
- **Particle load, PR #94** (`claude/particle-settings`, waiting for the owner's merge):
  - It adds Graphics › Advanced › Particles, Low / Medium / High. High, the default, is bit-identical to before.
  - It rebuilds the Rich lip sheet 3–5 times faster, with the same output.
  - Its findings: the spray's GPU cost is fill rate, not particle count. About 90 % of the fragments are wide mist sprites, and the foam balls add more near Padang Padang's throws.
  - The report is `docs/research/particle-report.md`.
  - Its recommendations wait for the owner: Medium particles for Auto's Medium result, and no spray stepping while Spray and mist is off.

## Open decisions for the owner

- **The Reef's jet:** raise the ask from 0.47 H² to about 0.55–0.6 H² (from the periodic Basilisk runs), and raise the lip-jet source's cap to about 0.3 on the Reef.
- **The Reef's tube and lip:** keep them. The tube is 0.43 H², L/W 1.42 and 23°; the lip is 0.5 H.
- **The level-13 Padang run on the M4 Pro:** `tools/basilisk/run_padang.sh`. It takes 8–35 h on one core, or 3–8 h with libomp.
- **Downloads waiting:**
  - the Blenkinsopp thesis (about 9 MB, through the browser);
  - the Teahupo'o lab dataset (Zenodo 11392175), which is restricted, so the owner must request access with their own account.

## Threads to pick up

- **The library's jet speed (settled 2026-09-30):** normalised by each case's own crest speed, the four cases throw at 0.93–1.08 C (median horizontal), peak at 1.08–1.23 C, and fall at 0.58–0.71 g. That's the low end of Erinin et al. 2023's 1.1–1.3 C, falling close to free fall; the Small periodic case is the slowest. The level-13 run should nudge them up; recheck it then.
- **PR 4's contact:** check its unloaded cost once the quads are bucketed, then the shapes of PR 5's crash curve and parcels.
- **Wave Lab max's one-cell troughs (from 20°):** if the owner wants them traced, first check the dispersive mask at each dip: the mask interface against the onset trigger.

- **The Wave Pool spot (the "Movement mapping prototype" session, spec `docs/superpowers/specs/2026-09-30-movement-flow-wave-pool.md` on `claude/wave-pool`):** ruled on 2026-10-01 (see the consult log). Waiting for its sweep: the arms' angle against the peel meter, faces left and right, and whether the waves stay identical over 5 minutes.

## How other sessions reach the advisor

- **On the same machine:** ListAgents, then SendMessage "Water physics research".
- **Sessions on another machine** can't message across machines unless Remote Control is connected. They spawn the `water-physics` agent instead, or leave the question in a PR comment or the consult log.

## Method notes

- **PDFs:**
  - Extract the text locally and read it; web-fetch summaries have invented tables.
  - With no PDF tools installed, a short Python script works for LaTeX papers: inflate the page streams with zlib and join the `TJ` strings.
- **Basilisk measurements:**
  - Landmarks move one cell at a time, so frame-to-frame speeds are quantized: about 0.33 C at level 12, with outputs every 0.025 √(h0/g). Fit over ±4 frames instead.
  - For periodic runs use `plunge_measure.py`. It takes the local trough ahead as the water level, and looks for the crest only past the steps behind the break.
- **Screenshots:** use the water sheet dev view (see HANDOVER.md). A hidden browser pane runs the game at about 1.5 fps.
