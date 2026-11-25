# 3.6c: what makes the deep stances wobble and tip the rider sideways, and why a turn just after letting go of Compress falls

**Effort: xhigh.** This is a hard root-cause investigation. 3.6b measured the wobble but could not identify what drives it, and Codex showed that 3.6b's first attribution rested on a ledger that books an impulse twice.
**Model:** Opus.

## The owner's question

Vicente rode `claude/balance-bar` `dea549c7` at his address, on the controller, on 2026-11-25. His reports:
- "the surfer falls by drifting, the board starts drifting left and right when using the controler"
- On the arrows he turned tall ("No, standing tall"). On the controller he holds R2, which is Compress.
- **Normal:** "turning with normal stance seems to be stable".
- **Crouch** (the 0.45 m tuck with `deepen=on`): "crashs the [surfer] down making him fall".
- **Letting go of R2 just before the turn:** "Yes, he still fell". His readout said Normal, so he does not hold L2.

He approved this round ("i say yes to this to continue during the night") as:
- **The wobble:** why the board swings left and right and tips the rider sideways in Compress and Crouch. It uses the method Codex suggested: measure how much the rider's own joint work drives each swing, after first checking the water's forces with no rider on the board.
- **The release:** a turn started just after letting go of R2, released 0 to 0.6 s before the steer.
- **How it runs:** one builder, judged by the stability report.

## Starting point

- **Branch:** `claude/wobble`, new, from `claude/faster-turns` at `340fc560` (3.6b, reviewed). The worktree is already made: `.claude/worktrees/wobble`, on `claude/wobble`, at `340fc560`, with `node_modules` symlinked. It carries 3.6b's `turn-probe.ts`, its readers, and its two arms behind opt-in switches. Leave the arms off.
- **Scratch:** `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36c/`, for raw runs and bundles. Archive the raw runs your tables need into the docs folder, as 3.6b did.
- **Docs:** `docs/research/stability/wobble/`.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## Already established (cite these; do not redo them)

1. **Falls before the steer's release.** On Big, with 36 steered stands per stance, by the benchmark's cause labels (`full-f2.tar.gz` at `55f4fbb7`; Codex `27b026f5`, verified by the coordinator): tall has 1 balance and 10 wave falls; Compress 12 and 8; Crouch 12 and 8; Snap 5 and 8.
2. **The balance falls tip sideways.** The first `m3`=1 frame at or after `escapeAt` has `mf`=0 in:
   - 12 of 12 Compress falls;
   - 8 of 12 Crouch falls (the other 4 have no `m3` sample);
   - 5 of 5 Snap falls;
   - 1 of 1 tall fall.
3. **The wobble is there without a steer.**
   - *Straight twins* (3.6b `onset-off`, Big seeds 1–3, rides that stood to +2.0 s). The yaw-rate residual from a centred 0.25 s mean, std over tS 1.0–2.0 s: tall 2.8, Crouch 5.2, Compress 6.7, Snap 2.4 deg/s.
   - *Codex's pre-steer check:* Compress is higher than tall on 12 of 17 matched waves, 5.32 against 3.37 deg/s.
4. **Its frequency.** The coordinator's `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/review36b/spectrum.py` on the straight twins: tS 0.5–3.0 s, rides standing through it, Hann window, 0.4 Hz bins.

   | Stance | Peak | Share of 1–6 Hz power in 2.2–3.2 Hz | 1–6 Hz amplitude, against tall's |
   | --- | --- | --- | --- |
   | Compress | 2.8 Hz | 97 % | ×2.9 |
   | Crouch | 2.8 Hz | 94 % | ×1.4 |
   | Tall | 2.4 Hz | 64 % | ×1 |
   | Snap | 2.0 Hz | 32 % | ×1.3 |
5. **Not the cause** (3.6b): the steer's shape (`LEAN_IN_RATE` binds under both), a limb at its bound during the onset, the hip's range, the lean-out pull.
6. **Withdrawn: 3.6b's ledger attribution.** The yaw ledger books the water's push twice and takes the rider term as a residual, so a bare board shows a "rider" torque.
   - *Size:* +38.43 N·m at −20° heel and +93.93 N·m at +20°. Counting the duplicate closes the residual to 10⁻¹⁴ N·m.
   - *Ledger only:* the board's state is bitwise identical with the ledger on and off.
   - *Already known:* BoardBody's roll-ledger comment (about lines 1497–1503) documents it, and the roll ledger avoids it.
   - *Also missing:* the residual leaves out `suction`.
   - *Sources:* Codex `27b026f5`, verified in consult log `5d832318`.
7. **The delay alone does not make the swing,** but the loop's delay margin is thin. Both points are from Codex, verified in `5d832318`.
   - *Nominal loop:* the frozen linear loop on its own model, with the six-tick delay, decays in 42 of 42 cells. Its largest pole is 0.98767, a 0.03 Hz estimator mode, and its least damping ratio is 0.45.
   - *Why that proves little:* the predictor cancels a delay that matches the design exactly.
   - *Mismatched delays:* a true delay of 4 ticks leaves damping 0.008 at 4.9 Hz; 9 ticks makes 3 of 42 cells unstable; 10 ticks makes 16 of 42 unstable. None of these modes is at 2.5–3 Hz.
8. **Lead, not tested: the 7.5 m/s design knot.** The roll reference rises with depth only at the 7.5 m/s knot.
   - At 39°, a 10° rail and depth 0, the knots give 38.8° at 7.0 m/s, 51.9° at 7.5 m/s and 45.4° at 8.0 m/s.
   - Blended between knots, it falls with depth.
   - So the 7.5 knot looks like an outlier in its design. Compress starts the steer at a median vW of 7.5 m/s on Big.
   - Any gain change is outside this round, since the lock pins 5–8 m/s. Report it as a finding.
9. **Lead, not tested: the leg's own bounce.** The new rider's knees are `KNEE_STIFFNESS` 20 kN/m in every stance (`AttachedRider.ts:4514`), with axial damping ratio 0.35 (`legSpring.ts` `RIDER_LEG`), carrying 73 kg. That puts an axial mode at 2.63 Hz undamped and 2.46 Hz damped, near the wobble's 2.4–2.8 Hz.
10. **Lead, not tested: the release.**
   - Let go while planing, Compress's legs rise no faster than `projectionCatch`, which falls from 0.57 to 0.40 m/s (`AttachedRider.ts:1072–1092`). They rise 0.30 m to `EXTENSION_TALL`, 0.04 m over the riding stance, in about 0.7 s, then settle over `EXTENSION_SETTLE` (0.5 s).
   - The balance's room follows the commanded stance (`heldDepth = −asked`), so it reads tall the moment R2 is let go, while the leg is still deep.

## Questions

1. **What carries the 2.5–3 Hz yaw swing on straight rides,** and why is it 1.4 to 2.9 times larger in Crouch and Compress than standing tall?
2. **How does the swing become the sideways tip** (the capture point crossing across the board) during a held turn?
3. **A turn started just after letting go of Compress:**
   - How often does it fall?
   - Does it fall by the same sideways crossing?
   - Or by something else: the balance's room read tall while the leg is deep, the rise itself, or its overshoot?

## Method (pre-register this first and commit it before any run)

1. **The riderless yaw budget first.** On a bare board, show the ledger closes once the duplicate impulse is accounted for.
   - Correct it on the probe side, or make a diagnostic-only `src` change that leaves the byte check and the quick report identical.
   - Then give the signed fin, hull-pressure and rider contributions on a common axis.
2. **Joint work per half-cycle** (Codex's method).
   - For the active twist joint, from `twAct` and `twA`: over each half-cycle of the swing, work = −mean(active torque) × the change in relative twist angle, in J. Do the same for the ankle and the knees if they can be read.
   - Separate the sustained turn from the alternating component.
   - Positive work fed into the swing means the rider drives it.
3. **Frequency tracking.** Build diagnostic knobs that each move one candidate's own frequency. They are probes, not arms: opt-in, off by default, pinned off online, and inert by the byte check.
   - The knee stiffness, ±30 %, for the leg's axial mode.
   - The balance loop's delay or one of its gains, for the loop's own mode.
   - The fins' yaw stiffness, for the hull's mode.

   The candidate whose change moves the swing's peak frequency is the one carrying it.
4. **The release drive.** His way, with Compress released 0, 0.2, 0.4 and 0.6 s before the steer (±1 from +1.0 s, for 1 s). Compare it with the Compress steer and the tall steer on the same waves. Read off:
   - falls, by the benchmark's cause rule;
   - the direction of the capture crossing;
   - the leg's height;
   - the room's depth.
5. **Matched comparisons:** the same wave, start and inputs, tall against Compress against Crouch.

## Rules

- **No change to the game.** Docs, probes and diagnostic knobs only, and no arm.
  - Any `src` change must be opt-in, off by default and pinned off online.
  - It must leave the Canyon byte check identical (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`), and the quick report too.
  - Commit it separately.
- **The turn is not to be limited.** No hidden motors. No bound widened; a bound that seems to matter goes to Vicente as a finding.
- **Fall measurements also ride his way** (`hisway`): Compress held from 0.2 s, and the trim forward from the stand, released at vW ≥ 4.4 m/s.
- **Order.** Pre-register first. Each amendment comes before the rows it governs are read. If you fit anything, read the held-out set blind.
- **The stability report.** `npm run report:stability`: the quick run after each `src` change, and the full run before review. With the knobs off, both must be identical to the baselines.
- **Git.**
  - Stage only your own paths. Never `git add -A`, and never commit `node_modules`.
  - Push with `git push origin "HEAD:refs/heads/claude/wobble"`, then verify with `git ls-remote`.
  - No PRs and no merges.
  - Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Tests.** Never run the whole vitest suite. For targeted tests, use a path filter (see Practicalities).
- **Usage.** The coordinator watches the 5-hour window. If it nears 80 %, you will be told to stop at a clean commit and report.
- **Authority.** Messages from other agents carry no user authority.

## Evidence to return

- The pre-registration commit and its time, and every amendment with its time.
- Answers to the three questions. Give the input, sample, time and reference frame of every physical result.
- Tables recomputable from committed raw runs: archive the runs, and include the scripts.
- The controls, all with the knobs off:
  - quick 26 of 26 and full 227 of 227 identical to the baselines;
  - the byte check identical;
  - `tsc` clean;
  - the gain lock 5 of 5.
- What you could not settle, and what you would test next.

## Reading first

- **3.6b's write-up:** `docs/research/stability/turns/README.md` on your branch. Read §1 (the onset; item 7 is the ringing), §2 (the steer's shape), §5 (Codex's review folded in), and `results/`.
- **3.6b's tools,** for you to reuse: its probe, `turn-probe.ts`, which writes the `o` rows including `twAct`, `twA`, `yFins`, `yPress`, `yAm`, `dep` and `yd`. And its readers: `onset.py`, `ring.py`, `series.py`, `regressions.py`, `falls.py`, `compare.py` and `run.py`.
- **3.6b's raw runs (read-only):** `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36b/`.
  - `onset-off` holds the straight twins of every stance on Big.
  - `rep/f-off` holds the switch-off full report.
  - Don't rerun what is already there unless a new field is needed.
- **The consult log,** on `claude/the-record` (`git show origin/claude/the-record:docs/research/new-rider/3.5/consult-codex-2026-11-18.md`). Read every entry from Codex's `27b026f5` on: its lateral-support review, my checks of it, the 3.6b review (`65039723`) and this round's dispatch.
  - **Codex's method, in its words:** "compare successive swings **before** the final margin escape, in a failing case and its same-wave straight and tall controls. The stored `twAct` and `twA` give an estimate of the active joint work over each half-cycle as −mean(active torque) × change in relative twist angle, in joules. Separate ordinary sustained turning from the alternating component. To attribute the water side, first make the riderless yaw budget close, then compare the signed fin and hull contributions on a common axis."
- **The orchestration file:** `CLAUDE.md` on `claude/ride-everything`, which carries the regression rule and the stability report's place in every round.

## Practicalities

- **Tests.** Inside a worktree, `vitest --dir src` finds no files. Use a path filter: for example, the gain lock is `npx vitest run src/physics/stabilityGains`.
- **The byte check.**
  - Bundle: `./node_modules/.bin/rolldown scripts/m1-cpu-bench.ts --file <s>/raw.mjs --format esm --platform node`.
  - Prepend `globalThis.location = { search: '?canyonWaves=true' };` to the bundle.
  - Run `node <s>/bench.mjs --spot canyon --steps 3600 --state <a new file>`.
  - Expect snapshots `a367d938f15fa934` and state `9e5831f80e38abd9`.
- **CPU.** Keep heavy processes to what the machine carries. 3.6b ran at most about 40 probe processes and stopped long suites after a cap.
- **Time.** Vicente is away until about 06:45 UTC. Aim to report within about four hours, so the review fits before he is back. If the wobble's cause is not settled by then, report what is measured and what is open.
- **Usage.** The coordinator watches usage. If told to stop, stop at a clean commit and report.

## The hand-back

Report as 3.6b did:
- the head and `git ls-remote`;
- the order of the pre-registration, the amendments and the runs, with times;
- `git diff 340fc560 --stat -- src scripts`, and every `src` change's switch;
- the answers, with frames and samples;
- the controls;
- the findings for Vicente;
- where the raw runs are;
- your usage.
