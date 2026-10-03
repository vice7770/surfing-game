export const meta = {
  name: 'padang-partb-builder',
  description: 'Padang Part B builder lane: #102 four-case measurement and catch check, the front-split clock link built and measured, Medium fast-front data, advisor rulings; heavy runs one at a time',
  phases: [
    { title: 'Crash', detail: '#102: four cases + catch check (heavy slot)' },
    { title: 'Front build', detail: 'clock link behind a FrontOptions switch, unit tests' },
    { title: 'Front measure', detail: 'padangFrontGap Small/Medium/Big off+on, fast-front dump (heavy slot)' },
    { title: 'Verify', detail: 'Opus adversarial review; failures re-run on Opus' },
    { title: 'Advisor', detail: 'Opus advisor rulings and consult-log drafts' },
  ],
}

const SP = '<SCRATCH>'
const WT = '<WORKTREES>'
const ADV = WT + '/advisor'
const HANDOFF = ADV + '/docs/superpowers/handoffs/2026-10-03-all-pending-work.md'
const CLOG = ADV + '/docs/research/water-physics/consult-log.md'

const RULES = (dir, branch, scratch) => `Project: the Breakline surf game, repo vice7770/surfing-game (public). You work ONLY in the git worktree ${dir} (branch ${branch}). Never touch <OWNER_CHECKOUT> (the owner's checkout, a dev server runs there) or any other worktree under ${WT}.
Context: the handoff ${HANDOFF} (read the sections your task names) and the consult log ${CLOG} (newest rows first; the rulings you build from are rows there). Both are read-only for you.
The owner's hard rules:
- Never merge (no gh pr merge), never push, never open or edit PRs: commit locally on your branch only. The main session verifies and pushes.
- No downloads of papers, datasets or textures.
- The repo is public: no local absolute paths or user names in committed files, commit messages or PR text; quote sources only in short attributed phrases.
- Every value is sourced (a measurement, a simulation or a paper) or marked provisional in a comment. No hand-authored shapes.
- Classic stays byte-identical except where the swept barrel is drawn; new visuals go to Rich.
- Don't change any rule, threshold or default that the consult log ruled unless your task says so; when numbers suggest a change, report them instead: the advisor rules.
- Scratch files (logs, dumps, temporary scripts) go in ${scratch}/ (create it), never in the repo.
- Commits: a conventional prefix like the branch's own history (fix(barrel): ..., test(probe): ..., feat(barrel): ..., docs: ...), a plain-prose subject, a short body when useful, and this last line: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
- Checks: npx tsc --noEmit, and npx vitest run <specific files or folders>. Never the whole suite. Probes run as PROBE=1 npx vitest run src/wave/probes/<name>.probe.test.ts with the env vars the probe reads.
- Long commands: if a command may take more than about 9 minutes, start it with nohup in the background, writing a log under ${scratch}/, and poll it (kill -0 / tail) until done. Record wall time and the load average (sysctl -n vm.loadavg) at the start of every probe run.`

const HEAVY = `You hold the machine's single heavy-run slot: run probes one at a time, never two at once, and run nothing heavy in the background when you finish.`

const VERIFY = { type: 'object', properties: { ok: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } }, evidence: { type: 'string' } }, required: ['ok', 'issues', 'evidence'] }
const REPORT = { type: 'object', properties: {
  summary: { type: 'string' },
  commits: { type: 'array', items: { type: 'string' } },
  commands: { type: 'array', items: { type: 'string' } },
  results: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, values: { type: 'string' } }, required: ['name', 'values'] } },
  rawFiles: { type: 'array', items: { type: 'string' } },
  flags: { type: 'array', items: { type: 'string' } },
  problems: { type: 'string' },
}, required: ['summary', 'commits', 'results', 'flags'] }
const RULING = { type: 'object', properties: {
  ruling: { type: 'string' },
  decisions: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, decision: { type: 'string' }, reason: { type: 'string' } }, required: ['item', 'decision', 'reason'] } },
  proceed: { type: 'boolean' },
  needsOwner: { type: 'array', items: { type: 'string' } },
  consultRow: { type: 'object', properties: { session: { type: 'string' }, question: { type: 'string' }, advice: { type: 'string' } }, required: ['session', 'question', 'advice'] },
  prText: { type: 'string' },
  nextBuild: { type: 'string' },
}, required: ['ruling', 'decisions', 'proceed', 'needsOwner', 'consultRow'] }

let heavyTail = Promise.resolve()
function heavy(fn) { const run = heavyTail.then(fn); heavyTail = run.then(() => undefined, () => undefined); return run }

async function laddered({ label, phase, prompt, verifyPrompt, heavySlot }) {
  const run = (model, extra) => {
    const call = () => agent(prompt + (extra || ''), { model, schema: REPORT, label: `${label} [${model}]`, phase })
    return heavySlot ? heavy(call) : call()
  }
  let result = await run('sonnet')
  let verdict = result
    ? await agent(verifyPrompt(result), { model: 'opus', schema: VERIFY, label: `verify ${label}`, phase: 'Verify' })
    : { ok: false, issues: ['the agent died'], evidence: '' }
  if (verdict && verdict.ok) return { result, verdict, model: 'sonnet' }
  log(`${label}: Sonnet attempt failed review, escalating to Opus. ${((verdict && verdict.issues) || []).slice(0, 3).join(' | ')}`)
  const extra = `\n\nA previous attempt (Sonnet) failed review. Its report:\n${JSON.stringify(result).slice(0, 8000)}\nThe reviewer's issues:\n${JSON.stringify((verdict && verdict.issues) || [])}\nFix them, building on its commits where they are sound (fix forward with new commits).`
  result = await run('opus', extra)
  verdict = result
    ? await agent(verifyPrompt(result), { model: 'opus', schema: VERIFY, label: `re-verify ${label}`, phase: 'Verify' })
    : { ok: false, issues: ['the agent died'], evidence: '' }
  return { result, verdict, model: 'opus' }
}

const ADVISOR = (task) => `You are "Water physics research", the wave-shape advisor for the Breakline surfing game. You rule on what the builders bring. Work read-only in ${ADV} (branch claude/water-physics-advisor-local). First read .claude/agents/water-physics.md (your role and method), docs/research/water-physics/ONBOARDING.md, docs/research/water-physics/README.md (the owner's standing decisions), the newest 25 rows of docs/research/water-physics/consult-log.md, and ${HANDOFF}. You may read code in any worktree under ${WT} and the files named below. Do not edit any file, merge, push or download anything.
Your rulings respect every earlier ruling in the consult log unless the new numbers reopen one (then say so and why). Give numbers with units, say what the player will see, and mark anything reasoned rather than sourced as inferred or provisional. If a decision belongs to the owner, say so instead of choosing.

${task}

Return your ruling in the consult log's own voice (short, plain), the per-item decisions, whether the builder may proceed, any owner decisions needed, a draft consult-log row in the newest rows' style (session, question with the numbers, advice and outcome), any PR-description text to add, and the next build step if any.`

// ---------- Lane A: #102 ----------
const CRASH = `${RULES(WT + '/crash', 'claude/padang-crash', SP + '/crash')}
${HEAVY}

Task: #102 (Padang Padang Part B, PR 5: the crash curve, the pour and the sound), branch claude/padang-crash at 822a8a5, a draft PR. Read the handoff's section "#102: PR 5, the crash curve, the pour and the sound" and the consult-log rows about PR 5 (rule (a), the pace c_n / n_z, the handover blend).
822a8a5 (the n_z fix and the blend) has not been measured. The previous agent's scratch probe was lost; src/wave/probes/padangCrash.probe.test.ts is the committed base to extend. Read it, the branch's recent commits (git log --stat -10), src/wave/barrel/BreakingFront.ts and the crash code first.
1. Extend the probe (PROBE=1-gated like the others) so one run reports, for a case (cell size, swell, seed 1, 120 s):
   - jets thrown; jets crashing on their own point (count and %); alone on their front at touchdown; dropped before the crash; coasted;
   - the gap at the blend's start (the solver's crest z minus the paced z): 10 / 50 / 90 %, in m and in H, and how many exceed 1 H;
   - the anchor's extra speed during the handover (its speed above the crest's own): the 90th percentile in m/s and as a share of the crest speed C;
   - clamp hits (the 0.5-1.5 sqrt(g(h + eta)) clamp on c_n), and slices dropped mid-tube;
   - wall time and the load average at the start.
   Make sure each number measures exactly what its name says (read the code paths).
2. Run the four cases, one at a time: 2 m and 1 m cells, Small and Medium, seed 1, 120 s. Save each raw log under ${SP}/crash/.
3. Commit the extended probe (test(probe): ...). Change no rule or default.
In results, give one entry per case with every number above. If the anchor's extra speed exceeds about 0.5 C anywhere, put it in flags (the advisor must rule: the curl would surge as it lands).`

const CATCH = `${RULES(WT + '/crash', 'claude/padang-crash', SP + '/crash')}
${HEAVY}

Task: the catch check for #102 (branch claude/padang-crash). Background from the handoff: on the merged build 19bdee6 the take-off cue lit half as often as before PR 5: Small 24 -> 11 over two seeds, and stood 8 -> 4; Medium 53 -> 49 and 20 -> 29. The lead suspect is the drawn face vanishing under the riders as points left the front mid-tube (58-71 % then), which the pace rule (now on this branch) stops.
1. Find how that two-seed catch report was run (the branch's docs commit about "the two-seed catch report", scripts/catch-report.ts, npm run report:catch) and run ONE Small, seed-1 catch run on this branch as it is.
2. If Small seed 1's cues come back to about 12 (half of 24 over two seeds), that was it: report. If not, add two dev-only switches to the catch report, --no-contact (the swept contact off) and --no-gate (the whitewater gate off), which change nothing by default, and run Small seed 1 with each, one at a time, to separate the two causes. Commit the switches if you add them.
In results give cues lit, stood and the report's other columns for each run, beside the baselines.`

const crashVerify = (what) => (r) => `You are a skeptical reviewer for the Breakline surf game. Default to ok=false unless you can confirm every point yourself. Work read-only in ${WT}/crash (branch claude/padang-crash; its last pushed commit is 822a8a5).
The builder's report on ${what}:
${JSON.stringify(r).slice(0, 12000)}
Check: (1) git log 822a8a5..HEAD and the diff: only probe/test/dev-report files changed, no rule, default or game behaviour; commit messages carry the footer line and contain no local paths. (2) The probe or report measures exactly what each reported number's name says (read the code: e.g. own point, alone at touchdown, dropped, coasted, the gap at the blend's start as the solver's crest minus the paced z, the anchor's extra speed against C, clamp hits). (3) The reported numbers match the raw logs (open them). (4) The runs used the stated settings (cells, swell, seed, duration). (5) npx tsc --noEmit is clean. List every issue precisely.`

const crashLane = (async () => {
  const measured = await laddered({ label: '#102 four cases', phase: 'Crash', prompt: CRASH, verifyPrompt: crashVerify('the four-case measurement'), heavySlot: true })
  const caught = await laddered({ label: '#102 catch check', phase: 'Crash', prompt: CATCH, verifyPrompt: crashVerify('the catch check'), heavySlot: true })
  const ruling = await agent(ADVISOR(`Rule on #102 (PR 5) from its measurements on 822a8a5 (the n_z fix and the handover blend) and the catch check. The handoff's bars: jets on their own point (earlier target about 90 %, no slices dropped mid-tube); report the gap at the blend's start; if the anchor's extra speed during the handover exceeds about 0.5 C, the curl would surge as it lands; the catch cues should come back to about 12 a seed on Small if the vanishing face was the cause.
The four-case report (reviewed: ${JSON.stringify(measured.verdict)}):
${JSON.stringify(measured.result).slice(0, 12000)}
The catch report (reviewed: ${JSON.stringify(caught.verdict)}):
${JSON.stringify(caught.result).slice(0, 8000)}
Say whether #102 can be marked ready, and draft the text to add to #102's description (the handoff asks for: "PR 7 (#107) refits the held tip velocity (+11-23 % along); these jets read it once both are merged." plus the measured results).`), { model: 'opus', schema: RULING, label: 'advisor: #102', phase: 'Advisor' })
  return { measured, caught, ruling }
})()

// ---------- Lane B: the front split ----------
const FRONT_BUILD = `${RULES(WT + '/frontmerge', 'claude/padang-front-merge', SP + '/front')}

Task: the front-split link (handoff section "The front splits"). Branch claude/padang-front-merge at d05e452 holds the padangFrontGap probe, no PR. It must sit on #105's current tip: first merge origin/claude/padang-peak-sizing into it (it is 11 commits behind), resolving any conflict in favour of #105's rules, and run npx vitest run src/wave/barrel/BreakingFront.test.ts after the merge.
The ruling (the advisor, 2026-10-03; the consult log's newest row): build it behind a FrontOptions switch, default off, so nothing changes unless it is on:
 1. Link facing ends within 10 m when |delta join| <= 0.166 s/m x the gap (the two ends' join times; the gap in m).
 2. Bridge one-column gaps when that link passes.
 3. Leave the 1 s/m split alone.
Read src/wave/barrel/BreakingFront.ts (fronts, links, joins, jumpReach), src/wave/probes/padangFrontGap.probe.test.ts (its pair causes: restarted after a jump, adjacent-reach, never sized, flicker, front-lost, true splits by the 1 s/m rule) and the counts in ${ADV}/docs/superpowers/handoffs/2026-10-03-data/front-splits-on-105.txt.
Add fast unit tests (src/wave/barrel/BreakingFront.test.ts): a clock-compatible facing pair within 10 m links; an incompatible one doesn't; a gap over 10 m doesn't; a one-column gap bridges only when the link passes; a 1 s/m true split stays split; with the switch off the fronts are exactly as before. Make the probe able to run with the switch on (an env var such as LINK=1) and report: fronts per wave, drawn fronts a frame, pairs by cause, true splits linked, throws and peel (median / 90 %). Also give the probe an env-gated dump (e.g. FASTDUMP=<file>) that writes, for every front whose throws peel at 20 m/s or more: its throws (t, x, z), its joins (t, x, z), eta and the still depth d at each, and the crest's bearing if available.
Typecheck, run the BreakingFront tests and src/wave/barrel, and commit (feat(barrel): ..., test(probe): ...). Do NOT run the probe itself: the heavy slot runs it next.`

const FRONT_MEASURE = `${RULES(WT + '/frontmerge', 'claude/padang-front-merge', SP + '/front')}
${HEAVY}

Task: measure the front-split link (built on this branch behind a FrontOptions switch; read git log -8 and the probe first). Run src/wave/probes/padangFrontGap.probe.test.ts at Small, Medium and Big (seed 3, 1 m cells, as the committed counts; Big never ran before), first with the switch off, then on: six runs, one at a time. For each size and switch report: fronts per wave, drawn fronts a frame, pairs by cause, true splits and how many were linked (count and % of true splits), throws, and the peel by throws (median / 90 %). Compare 'off' against ${ADV}/docs/superpowers/handoffs/2026-10-03-data/front-splits-on-105.txt and say why any count differs (this branch now has #105's latest commits).
On the Medium switch-off run, also write the fast-front dump (the probe's env-gated dump) to ${SP}/front/fast-medium.json (or .csv) and say how many fronts it holds.
Stop rule from the ruling: if the true splits linked exceed about 1 % at any size, put it first in flags (the advisor must rule) — still finish the runs.`

const frontVerify = (what) => (r) => `You are a skeptical reviewer for the Breakline surf game. Default to ok=false unless you can confirm every point yourself. Work read-only in ${WT}/frontmerge (branch claude/padang-front-merge; its last pushed commit is d05e452).
The builder's report on ${what}:
${JSON.stringify(r).slice(0, 12000)}
The ruling it implements: behind a FrontOptions switch, default off: (1) link facing ends within 10 m when |delta join| <= 0.166 s/m x the gap; (2) bridge one-column gaps when that link passes; (3) leave the 1 s/m split alone.
Check: (1) origin/claude/padang-peak-sizing is an ancestor of HEAD and the merge kept #105's rules. (2) The code implements the ruling exactly (units, the inequality, facing ends only, the 10 m reach, bridging only on a passing link, the 1 s/m rule untouched) and with the switch off behaviour is identical (read the diff line by line). (3) The unit tests test those things and pass (run npx vitest run src/wave/barrel/BreakingFront.test.ts). (4) npx tsc --noEmit is clean. (5) If numbers are reported: they match the raw logs and the runs used the stated settings. (6) Commit messages have the footer line and no local paths. List every issue precisely.`

const frontLane = (async () => {
  const built = await laddered({ label: 'front link build', phase: 'Front build', prompt: FRONT_BUILD, verifyPrompt: frontVerify('the link build'), heavySlot: false })
  if (!built.verdict || !built.verdict.ok) { log('front link build failed review twice; skipping its measurement'); return { built } }
  const measured = await laddered({ label: 'front link measure', phase: 'Front measure', prompt: FRONT_MEASURE, verifyPrompt: frontVerify('the measurement'), heavySlot: true })
  const both = await parallel([
    () => agent(ADVISOR(`Rule on the front-split link from its measurements. The ruling's bar: true splits linked must stay near zero; over about 1 % -> stop and ask. Also judge fronts per wave, drawn fronts a frame, pairs by cause, throws and peel against the switch-off runs, and say whether to turn the switch on for Padang Padang (a behaviour change) or keep it off, and what PR to open (into claude/padang-peak-sizing, #105).
The build (reviewed: ${JSON.stringify(built.verdict)}):
${JSON.stringify(built.result).slice(0, 6000)}
The measurement (reviewed: ${JSON.stringify(measured.verdict)}):
${JSON.stringify(measured.result).slice(0, 12000)}`), { model: 'opus', schema: RULING, label: 'advisor: front link', phase: 'Advisor' }),
    () => agent(ADVISOR(`The open thread "Medium's fast throw fronts". On #105's base, 11 of 44 Medium fronts threw at 20 m/s or more; in 6 of them the joins peel at only 4-17 m/s while the throws go 28-134 m/s, mostly without jumps. Hypothesis: between the join (the solver's fresh onset, deeper) and the throw (the Navier-Stokes vertical depth, d = 1.56 + 0.56 eta, shallower), the crests refract toward the contours and reach the throw depth together; if so, a throw should follow its join by the library's own lag, in time, not at a depth.
The builder dumped every fast front's throws and joins with eta, d and bearing (see the measurement report's rawFiles and ${SP}/front/). Read the dump and compare each fast front's throw times with its joins and with eta along it. Test the hypothesis quantitatively: per column, the join-to-throw delay against the library's own lag (find where the profile library's throw timing is defined in code under ${WT}/frontmerge/src/wave/barrel/ and in the library docs), whether the throws' simultaneity comes from the depth crossing, and whether the crests' bearings turn toward the contours between join and throw. Rule: confirmed or not; if confirmed, what the builder should build behind a FrontOptions switch and measure, with bars.
The measurement report:
${JSON.stringify(measured.result).slice(0, 12000)}`), { model: 'opus', schema: RULING, label: 'advisor: fast fronts', phase: 'Advisor' }),
  ])
  return { built, measured, ruling: both[0], fastFronts: both[1] }
})()

const [crash, front] = await Promise.all([crashLane, frontLane])
return { crash, front }
