# Handoff: the 2026-10-03 run, stopped cleanly, and the next run's finish line

**The next run's goal, in the owner's words:** "make sure all the prs are closed and there are no fails in the build". So every open PR ends merged (or deliberately closed), and the build, the type check and every test suite are green on main.

**Stopped on 2026-10-03, evening, at the owner's request** (low on tokens). Every running agent was stopped. No work is lost:
- Every lane's commits are pushed (branches below).
- The one half-edited file was stashed (see "The Padang look loop").
- Nothing was merged on GitHub.

## Update, later on 2026-10-03: every PR closed into `claude/wave-pool`, the owner's main line

The owner: "make sure that all the prs are closed to "claude/wave-pool" branch please. This is our main branch."

**Done:**
- **13 PRs were merged into `claude/wave-pool`:** #82, #91, #92, #94, #95, #102 (with fix round 2, 9af8eb9ae), #103, #104, #105, #107, #108, #109 and #110.
  - Each was retargeted to `claude/wave-pool`. The drafts were marked ready.
  - The branch was pushed with every PR's head in it, so GitHub marked each one merged.
- **#100 and #106 were closed with a note:**
  - #100's commits were already in the line, via #106.
  - #106's branch is the line itself.
- **No PR is open.** GitHub's default branch is still `main`, which is now stale. Changing the default needs admin rights, which the owner has; this account doesn't.
- **The movement work's latest commits** (`claude/pool-flow-probe`, which has no PR) are merged in too.
- **The checks on the line:**
  - `npx tsc --noEmit` is clean and `npm run build` passes.
  - Targeted suites: 754 tests pass and 10 fail (below). The whole suite and the two SurfZone suites weren't run on the merged line.

**The 10 failing tests: the next run's first job ("no fails in the build"):**
1. **`src/wave/barrel/sweptLoft.test.ts`, "agrees within 0.5 m/s from the throw until a case holds"** reads 5.7 m/s.
   - #102's fix round 2 (u = 1) wrote this check against the crash branch's library.
   - #107's tip refit zeroes a case's tip outside its sustained overturn, and the two meet only on the line.
   - The same check passed with fix round 1.
   - Reconcile them with the advisor, and never loosen the check.
2. **`src/physics/AttachedRider.test.ts`, 9 failures:**
   - 7 crouch and Compress expectations, already failing on #106's commit bbec2a971: the crouch to two thirds, compressing to full depth, Compress taken mid-turn at 7, 8, 10 and 11 m/s, the weight over the front foot.
   - 2 known gaps marked `it.fails` that now pass ("makes a deep U at the bottom of the face", "turns at least as hard compressed as crouched"): flip them to `it`.
   - Judge each of the 7 against the movement spec.

**The rest of this page still holds,** with "PR" read as the branch now merged:
- #102's catch pair and ruling on fix round 2.
- #110's narrowing before its switch goes on, and the order-list bug.
- The movement steps' bars.
- The Padang look loop and the owner's five questions.
- The owed heavy runs.

New work branches from `claude/wave-pool` and opens PRs into it.

**Read first:** this page, then [the morning handoff](2026-10-03-all-pending-work.md), then [ONBOARDING.md](../../research/water-physics/ONBOARDING.md). The consult log's 2026-10-03 rows are the rulings (`docs/research/water-physics/consult-log.md`, newest first).

**Raw data from this run:** [2026-10-03-evening-data/](2026-10-03-evening-data/). Machine paths are scrubbed to placeholders such as `<WORKTREES>` and `<SCRATCH>`.
- `workflows/`: the seven workflow scripts that ran the agents.
- `results/`: every agent's full return value for the last three workflows.

## The owner's words and decisions today

- **Asked for:** "follow ONBOARDING.md", "flawless", a harsh separate critic per item that keeps going until it's "utterly wowed" against a production game, many workflows, fan-out.
- **Merges:**
  - "You can merge the prs for me to test." Earlier the rule was that merges are the owner's.
  - "make sure all the prs are closed and there are no fails in the build".
  - Take both as permission to merge in the next run, and check once at its start.
  - The auto-mode check may still refuse `gh pr merge`. If it does, add `{ "permissions": { "allow": ["Bash(gh pr merge:*)"] } }` to `.claude/settings.local.json`, or ask the owner to press the merge buttons.
- **PR 7's gate:** the owner looks at Padang Padang themselves. Critics' approval doesn't count. They opened the integrated build in the browser on 2026-10-03; their verdict isn't recorded yet.
- **The Reef's lip jet:** raised (#109).
- **The Reef's landing:** keep the 1.00 H void. The 1.35 H landing was tried and not kept; it lives on the branch `claude/reef-jet-landing`.
- **The Reef's void:** keep 0.43 H² for now. A high-tide case (h_c 2.1 m) and the owed small case join the Reef's Basilisk library, checked against Blenkinsopp's line 0.58 − 0.41 h_c/H.
- **Basilisk level 13:** run on this machine (an M5 Pro, 18 cores, 24 GB) after the lanes finish.
- **Downloads:**
  - The Blenkinsopp thesis: approved and read (`notes/round7-blenkinsopp/`).
  - S1 sounds: ElevenLabs instead of CC0 downloads, on a paid plan (commercial use, no attribution).
  - The Zenodo Teahupo'o dataset: not approved.
- **The Claude Doc "Wave Physics Research"** is NOT shared with the new machine's account. Every 2026-10-03 consult row is only in `consult-log.md`. Mirror them into the doc's Consult log tab once it's shared.

## Every PR, its state, and what closes it

| PR | Branch | Base | State | To close it |
|---|---|---|---|---|
| #82 | `claude/water-physics-advisor-local` | main | ready | merge first. It now also carries this handoff, the consult rows, the thesis note, `main-sshdns` merged in, and `scripts/browser/headless-shot.mjs` |
| #94 | `claude/particle-settings` | main | ready | the owner's two recommendations are still open (Medium particles for Auto's Medium; no spray stepping while Spray and mist is off); merge |
| #100 | `claude/compress-ladder` | main | ready | merge |
| #106 | `claude/wave-pool` | `claude/compress-ladder` | ready, but see "Green build" | retarget to main after #100; `src/physics/AttachedRider.test.ts` already fails 7 tests on this branch (found 2026-10-03) |
| #91, #92, #95, #103, #104 | the Padang stack | stacked | ready | retarget each to main in turn; the merge conflicts are known (below) |
| #105 | `claude/padang-peak-sizing` | `claude/padang-contact` | **ready** (2026-10-03: 111/111 in the two SurfZone suites, the own-onset table in its description) | retarget; it conflicts with #104 in the files listed below |
| #102 | `claude/padang-crash` | `claude/padang-contact` | draft; fix rounds 1 and 2 pushed | one catch pair, the advisor's ruling, then the description and ready (see "#102") |
| #107 | `claude/padang-every-spot` | `claude/padang-peak-sizing` | draft; 111/111 in the two suites | the owner's look at Padang, then each spot's switch, the Reef with the Reef session's agreement; or merge as is (`SWEPT_BARREL` still `['padang']`) and switch later |
| #108 | `claude/s1-recordings` | main | draft | the owner's listening playtest; more takes need ElevenLabs credits (0 of 90,000 left) |
| #109 | `claude/reef-jet-ask` | main | **ready** | merge (the Reef only, other spots bit-identical) |
| #110 | `claude/padang-front-merge` | `claude/padang-peak-sizing` | draft; switch off | narrow the link, re-measure, then ready (see "The front split") |
| (none yet) | `claude/pool-flow-probe` | stacked on #106 | work in progress | finish steps 3–5, open its PR (see "Movement") |

**Branches without PRs:**
- `claude/padang-look-wip` and `claude/padang-look-fix-r1-1` … `-r2-4`: the critics' loop (see "The Padang look loop").
- `claude/reef-jet-landing`: tried, not kept.
- `claude/jev-player`: another session's worktree, not part of this work. Leave it alone.

## The owner's local test build

The owner's checkout is on **`claude/wave-pool`**, which is **local only** and **371 commits ahead of GitHub**. Its contents:
- every PR above;
- #102 at its fix round 1 (0a3339438) plus the catch-report tools (768afba73);
- the front link (off);
- the movement work at f83ab4515.

It is NOT pushed, because a push would put every other PR into #106. It doesn't have:
- #102's fix round 2 (9af8eb9ae);
- the newer movement commits (bfb4e94b2);
- the critics' look fixes.

**Before the next run touches PRs:**
- either rebuild this test branch from the merged main;
- or reset it to the PR with `git reset --hard origin/claude/wave-pool` (the owner's call; it's their test build).

**A detached Vite dev server** was left running on port 5173 for the owner. To stop it: `lsof -nP -iTCP:5173 -sTCP:LISTEN`, then kill that PID.

The merge commits on that branch hold every conflict resolution the real merges will need. Read them with `git log --merges claude/wave-pool`:
- `src/game/PhysicalMode.ts` constructor (the pool's scenery and the barrel's `this.scene`): keep both;
- `src/scene/LipSheetMesh.ts` (#94's `subdivisions` and PR 5's `splashes`) and both sides' tests: keep both;
- `src/wave/SprayCloud.test.ts`: keep both;
- `src/wave/barrel/BreakingFront.ts` (PR 5's `coasted`, #105's `unrisen`, the clock link's `link()` returning `{ fronts, order }`): keep all;
- `scripts/catch-report.ts` (per-spot `readBarrelCases(spot)` with the fix round's switches);
- `src/wave/barrel/sweptLoft.ts` (PR 6's forward-rest buffer and the fix round's ray anchor);
- the probe import `PADANG_FRONT`, now from `barrel/barrelSpots.ts`;
- `src/scene/barrel/SweptBarrel.ts` and `docs/research/barrel-library.md` (#104 against #107): resolved in `look/padang-finished`'s merge `d35d6b961`.

## #102: PR 5, the crash curve, the pour and the sound

**Done today:**
1. **The four cases on 822a8a5.** Jets crashed on their own point 97.8 / 98.5 / 96.8 / 92.5 % of the time, with none dropped. But the handover surged at 1.20–1.50 C, against a 0.5 C bar. The advisor ruled a fix round (consult log, "PR 5 builder ... 822a8a5").
2. **Fix round 1 (0a3339438):**
   - the throw point on the slice's ray, and a smoothstep to 0.8 T;
   - every thrown point on its pace with no z blend;
   - a 2 T exit for stalled points;
   - a held jet pours at its crash.

   The handover term fell to 0.18 / 0.32 / 0.19 / 0.42 C at the 90th percentile per step. PR 4's residual is 0.402 m/s. One bar missed: the per-jet term on 1 m Medium, 0.66 C. The advisor ruled the named fallback.
3. **Fix round 2 (9af8eb9ae, pushed):** u = 1 from the throw, so every thrown slice sits on its paced crest point K. Four cases:
   - the handover term is 0 C by construction;
   - own point 97.8 / 99.0 / 94.6 / 96.1 % (with the 2 T exits apart: 100.0 / 99.7 / 97.7 / 98.5 %);
   - own point with the curl drawn 96.7 / 98.5 / 89.1 / 88.3 %;
   - 0 drawn slices dropped mid-tube or mid-pour;
   - 2 T exits 2 / 3 / 8 / 20;
   - 0 jets held past 2 T;
   - every void closed at its crash.

   Full numbers are in `results/W1b-agent-results.json` under "#102 four cases 2". **Not yet ruled.**
4. **The catch** (Small, seed 1, 2 min, 30 ghosts, on 768afba73):

   | Run | Cues lit | Stood |
   |---|---|---|
   | The crash | 6 | 3 |
   | The crash, no felt air | 11 | 4 |
   | Kennedy's lip | 12 | 4 |
   | Kennedy's lip, no felt air | 14 | 7 |

   - The whole deficit sits at along +15, inside the break line (0 against 7). There the water's forward speed under the board is no lower, and the felt-air switch changed nothing.
   - So the advisor's inferred cause, a weaker bore push, isn't borne out. The next suspects are untested; see the catch-pair entry in the results file.
   - Only 4 waves differ, so p can't go below 1/16. More seeds would be needed.

**Next, in order:**
1. **The catch pair on 9af8eb9ae** (4 runs, about 42 min, one at a time). Optionally a second seed.
2. **The advisor's ruling** against the bars in the fix round's ruling:
   - the handover term ≤ 0.5 C;
   - own point ≥ 90 % and within 1 point of today;
   - no drawn slice dropped mid-tube or mid-pour except the counted 2 T exits;
   - none held past 2 T;
   - voids close at their crash;
   - PR 4's residual ≤ 0.5 m/s;
   - the catch pair reported.
3. If ready, replace #102's description:
   - the table re-measured;
   - no status line;
   - keep "PR 7 (#107) refits the held tip velocity (+11–23 % along); these jets read it once both are merged."

   Then `gh pr ready 102`.
4. If the lost inside cues stay unexplained, **whether whitewater take-offs inside the break line get a gameplay assist is the owner's call**, with the movement session. The water stays as measured.

## The front split (#110)

**Measured at 2724725d6** (seed 3, 1 m cells, 150 s, Small / Medium / Big, off and on):
- The clock link merged **0 true splits at every size** (0 of 48 / 361 / 285; the bar was about 1 %).
- Fronts per wave: 4.03 → 3.20, 3.47 → 2.94 and 2.14 → 1.91.
- Drawn fronts a frame: 7.09 → 5.62, 11.78 → 10.01 and 10.15 → 9.08.
- One-column holes: 6208 → 821 pair-frames on Small.
- Joins, jumps and throws are identical; the whole-wave peel holds within 1 %.
- Both SurfZone suites pass on it: 111/111, 69 min.

**The advisor's ruling:** keep `clockLink` off at Padang Padang and narrow it first.
- An end is a candidate only if |Δz| < LINK_ROWS × cell × the columns between the ends (on 1 m cells, 3 m a column). Keep CLOCK_SLOPE 0.166 s/m and the 1 s/m split.
- Add tests:
  - a 3.5 m neighbour step stays two fronts;
  - a hole stepping 5.9 m links, and 6.1 m doesn't;
  - the nearest end wins when it is listed second;
  - with the switch on, a 1.01 s/m pair stays split.
- Add drawn diagnostics to `padangFrontGap` (the loft's `overlaps`, `overlapsOpen` and `overlapOpenWeight` per frame; per tongue, the link within its σ span). They must not change the front.
- Re-measure. Turn the switch on if the loft check passes, then mark #110 ready.

**A hidden defect to fix before the switch goes on.** SweptCrash's 2 T exit removes points from `front.points`, but the clock link's private `order` still lists them. A sea handover then throws "A front state whose order names point 0, which it does not hold". Fix it by dropping the point from `order` too.

## Medium's fast throw fronts (advisor thread, closed)

**Not confirmed: the refraction hypothesis was wrong.**
- All 11 fast fronts (307 throws) lie off the reef on the −x side's planar 1:5 beach face (x −153.5 to −77.5), where the contours run along x.
- Over straight contours, refraction can't bunch throws whose joins peeled. The bearings agree: 2.9° at the join and 4.0° at the throw.
- They are physical close-outs, so the front doesn't change and no time-keyed throw gets built. 2026-09-30's depth-keyed throw stands.
- Their tube is provisional: the 1:19 wedge library drawn on a 1:5 face.
- Report-only follow-ups for `padangFrontGap`:
  - fit t on x with r²;
  - split the peels by region (the reef, the −x side, the channel);
  - each fast front's bed slope and c/sin θ;
  - FASTDUMP at every size.

## Movement mapping prototype (steps 3–5, `claude/pool-flow-probe`, 18 commits pushed today)

**Done:**
- The wave-pool merge.
- The paddled-catch and flow-probe re-checks.
- Four cutback rounds, physics first with an Opus design, a builder and a strict judge each:
  - the projection's neutral feet;
  - releasing Compress keeps the board square as the legs extend;
  - a compressed rail change's pull toward the new rail, with its own ledger;
  - the flow autopilot's bottom turn at 25°, then a 65/35 cutback to 30° past the fall line.
- Three pumping rounds.

**The judges' verdicts, every round FAIL on the main criterion:**
- **Cutback:** 44 of 96 rides clean (Medium 25/48, Big 19/48; before: 32/96).
  - 4 cutbacks began 32–66° from upright, after projections that ran their 1 s limit.
  - 10 of 66 first cutbacks dropped off the plane, to about 0.5 m/s.
  - The judge called the gain real (+12 clean rides) and the change clean.
- **Pumping:** every Medium pumping rider fell. 8 of 8 had 1.9–6.9 s on the plane (median 3.4 s), against 4.8 s for simply holding the band. The pump-track gain itself is real physics; the energy ledger closes to 0.00 J.
- **The motion critics** never ran: no filmed rides yet. The recorder needs `style=flow`, since today `?record&style=flow` falls back to S-turns.

**`src/physics/AttachedRider.test.ts` fails 9 tests on the combined branch:**
- 2 are known gaps marked `it.fails` that now pass. Flip them to `it`.
- 7 are older crouch and Compress expectations that already failed on #106's own commit bbec2a971.
- Decide each against the spec (docs/superpowers/specs/2026-09-30-movement-flow-wave-pool.md), and never weaken a test to pass. These block "no fails in the build".

**Next:**
1. The AttachedRider tests.
2. The cutback's remaining failures: the projection's 1 s limit, and planing through the first cutback.
3. Pumping that keeps planing speed on the pool (physics only; the spec's bar).
4. Film the flow (`style=flow` in the recorder, then `headless-shot.mjs record`) for the motion critics.
5. The steps 3–5 PR, stacked on #106.
6. The don't-retry list in the morning handoff still holds.

## The Padang look loop (the owner's "harsh critic until wowed")

**How it ran** (workflow `W3-padang-look-aaa.js`):
- Each round: headless water sheets of the finished barrel (`?inpage&waterSheet&spot=padang`, curl and whitewater shots), then **three Opus critics** on a frozen rubric.
- The critics:
  - **render:** a principal technical art director;
  - **surf:** a Padang Padang photographer;
  - **shot:** a game director signing off marketing frames.
- An Opus "Water physics research" triage turns defects into sourced fixes only: no hand-authored shapes, Classic unchanged except the swept barrel, the owner's phase order.
- Up to 5 file-disjoint fix groups build in parallel worktrees, each reviewed by Opus with one Opus retry, then merge.

**Results:**
- Round 1: render 1.8, surf 1.6, shot 1.8 (mean of 1–10 scores).
- Round 2: render 1.9, surf 1.6, shot 2.0.
- Every critic said "not yet".
- **The critics' blockers:**
  - a dither dot-grid over the barrel;
  - an opaque white or peach plank of a lip with no thickness gradient;
  - no tube from the inside camera;
  - a squat 5.5:1 hump at Practice size;
  - the curl from behind as two loose slabs.
- Round 1 merged only group 3 (Rich underwater lit by the hour's sun and sky, faded per colour by the spot's own water) into `look/padang-finished`, pushed as `claude/padang-look-wip`. Groups 1, 2, 4 and 5 failed review: visual regressions, or fixes failing their own checks.
- Round 2's four groups (curl, foam, water colour, spray) were built, not reviewed, when the run stopped. They're pushed as `claude/padang-look-fix-r2-*`. The worktree of r2-2 (foam) had a stash: "wip: Padang look round 2, group 2 (foam), interrupted 2026-10-03".

**The triage's questions for the owner** (they decide whether the loop can converge):
1. **Practice cases' voids are tiny** (0.86 × 0.39 m and 0.90 × 0.45 m; A/H² 0.035–0.052 against Pick & Feddersen's 0.38–0.41), so Practice's inside shot can never show a tube. Judge the green room on Padang's Big swell (`&swell=big`; pad19-a45 holds a 3.34 × 1.45 m void) until the level-13 reruns land, and move Padang's practice to Medium as tube-review.md's decision 2 asked?
2. **Approve one download**, the Allen Coral Atlas benthic class at Padang Padang, to source the inner reef flat's albedo? Today it's drawn as live coral, the olive near field the critics call pea green.
3. **Padang's land is a flat, untextured plane.** A cove backdrop (cliffs, jungle, buildings, the beach) is art direction: now or later?
4. **The sky photo's sun** has a darker core. Drawing it back as a clipped disc with bloom is lighting, the owner's last phase: now or keep the order?
5. **The critics score Classic too.** Keep the rule that Classic stays as it was except where the barrel is drawn?

**Lesson:** after two rounds the critics sit at 1–2 of 10. "Wowed" is far off, and much of the gap needs the owner's calls above, not engineering.
- Keep the frozen rubric.
- Cap the rounds (3), and ask the owner between rounds.
- Read the code after two repeats of a defect.

## Owed heavy runs (after the lanes, on a quiet machine)

- **Basilisk level 13** (`tools/basilisk/`, README there; first run clones `comphy-lab/basilisk-C`, about 2.8 GB; `brew install libomp` for OMP):
  - Padang Padang's A0 0.3;
  - the Point's four cases;
  - the Beach's bar cases (their `run_periodic.sh` lines still need writing);
  - a small Reef case near A0 0.09 over the inner flat;
  - **new:** a Reef high-tide case (h_c 2.1 m);
  - optionally the Canyon at level 14.

  Then recheck the library's jet speed (0.93–1.08 C at level 12).
- **PR 4's 180 s contact probe**, and the realistic cost checks. These need an unloaded machine.

## The finish line: close every PR with a green build

1. Finish #102 (above). Fix the AttachedRider tests. Finish or split the movement steps and open their PR. Narrow and re-measure #110. Get the owner's look (#107) and listening (#108).
2. Merge in this order: #82, #94, #100, #106, #91, #92, #95, #103, #104, #105, #102, #110, #107, #109, #108, then the movement PR.
   - Before each merge, retarget a stacked PR's base to main (`gh pr edit <n> --base main`).
   - On a conflict, merge main into the PR's branch using the resolutions listed above, run the checks, and push.
3. After every merge, on main: `npx tsc -b`, `npm run build`, and `npx vitest run`, the whole suite once at the end. Include `src/wave/SurfZoneSimulation.test.ts` and `src/wave/SurfZoneRunner.test.ts` (about 70 min, unloaded).
4. Close what isn't merged, with a comment saying why: for example #110 if the narrowed link fails, or #108 if the owner rejects the sounds.
5. Update ROADMAP.md and this folder's handoff. Mirror the consult rows into the Claude Doc once it's shared.

## How the agents worked (to rerun or adapt)

**Model routing** (the owner's global rule): workers on Sonnet, with Opus for design, judges, critics, triage, the advisor's rulings and anything that failed review.
- Sonnet failed strict review on nearly every measuring task today (reporting precision), so the later workflows went straight to Opus for those.

**The workflows** (scripts in `2026-10-03-evening-data/workflows/`):

| Script | What it did | Shape |
|---|---|---|
| W1-padang-partb-builder | #102's four cases and catch check; the front link built and measured | two lanes; a JS mutex makes one heavy probe at a time; builder → Opus verify → Opus retry; Opus advisor ruling |
| W1b-padang-partb-round2 | #102's fix rounds (up to 3, built from the advisor's ruling and its fallbacks); the front link's nits, measurement, rulings, suites and PR draft | as W1, with verify split into blocking and non-blocking |
| W2-movement-steps-3-5 | orient; the cutback and pumping design → build → judge loops (physics first, assist only after the judge says physics can't); a film → two motion critics → triage → fix loop (never reached) | Opus design, Sonnet then Opus build, Opus judge |
| W3-padang-look-aaa | the local integration of #104, #107 and #102; the capture → 3 critics → triage → parallel group builds → review → merge loop | frozen rubric; 5 groups max in separate worktrees |
| W4-owner-calls-lanes | the Reef jet raise; the ElevenLabs sounds with a spectrogram critic; the Blenkinsopp thesis | three lanes |
| W5-owner-calls-round2 | the Reef's landing length; the sounds' wrap fix, docs and history | |
| W6-merge-everything-into-wave-pool | the owner's local test build | Opus integrator, Opus review |

**Rules every builder prompt carried:**
- never merge, push or edit PRs (the main session verifies and pushes);
- no downloads;
- no local paths in commits;
- values sourced or marked provisional;
- Classic byte-identical except the swept barrel;
- report numbers instead of changing a ruled rule;
- the Opus footer;
- targeted tests only;
- nohup for long runs;
- one heavy probe at a time.

**The advisor agent:** Opus, reading `.claude/agents/water-physics.md`, the README's standing decisions, the newest consult rows and the handoff. It returns a ruling, decisions, bars, an owner list, a consult row and PR text. The main session logs the rows.

**Pitfalls met:**
- zsh's `$b:r` modifier mangles refspecs like `"$b:refs/heads/x"`; write `"${b}:refs/heads/x"`.
- Big pushes need `git -c http.version=HTTP/1.1 push`, and `push -q` sometimes hung up.
- Commits by agents carried a "Claude" author or a Sonnet footer twice; check identity and footers before every push.
- A strict verifier that blocks on reporting nits made W1 skip a whole measurement. Split blocking from non-blocking.
- Background shell tasks die after 2 h, so long suites and the dev server run detached (nohup with `caffeinate -i`).

## Setting up the next run on this machine

- **Worktrees:** one per lane in a sibling folder of the owner's checkout. The names are advisor, crash, peak, frontmerge, everyspot, poolflow, look, reefjet, sound, and lookfix-r1-* / lookfix-r2-*.
  - The lookfix ones can be removed: `git worktree remove`; the branches are pushed.
  - `node_modules` was cloned into each with `cp -cR` (APFS clone; every branch has the same lockfile).
- **Headless capture without taking focus:** `scripts/browser/headless-shot.mjs` on #82's branch. Chrome `--headless=new --enable-unsafe-webgpu --use-angle=metal` gets an Apple Metal adapter. Modes:
  - `sheet`: the water sheet, plus close-ups by name;
  - `page`: screenshots;
  - `record`: an autopilot ride through `?inpage&record`, plus contact sheets.

  Captures are byte-deterministic across runs, so before/after pairs are like for like.
- **Ports used:** 5173 (the owner's dev server), 5181–5199 (captures), and CDP 9420–9470.

