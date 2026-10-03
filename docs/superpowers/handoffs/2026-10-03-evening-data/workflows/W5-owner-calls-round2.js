export const meta = {
  name: 'owner-calls-round2',
  description: "Follow-ups on the owner's calls: the Reef's landing length (1.35 H) built and the ten seas re-measured against the advisor's bars; the S1 recordings' wrap regressions, docs and history cleaned for a draft PR; each reviewed on Opus",
  phases: [
    { title: 'Reef', detail: 'landing length 1.35 H, ten seas re-measured, history and ROADMAP, PR draft' },
    { title: 'Sound', detail: 'wrap regressions, docs accuracy, engine review, history, PR draft' },
    { title: 'Verify', detail: 'Opus review; one more attempt on blocking issues' },
    { title: 'Advisor', detail: 'Opus ruling on the Reef bars' },
  ],
}

const SP = '<SCRATCH>'
const WT = '<WORKTREES>'
const ADV = WT + '/advisor'
const CLOG = ADV + '/docs/research/water-physics/consult-log.md'
const W4 = SP + '/w4'

const RULES = (dir, branch, scratch) => `Project: the Breakline surf game, repo vice7770/surfing-game (public). You work ONLY in the git worktree ${dir} (branch ${branch}, from main, unpushed). Never touch <OWNER_CHECKOUT> or any other worktree under ${WT}.
The owner's hard rules: never merge, push, or open/edit PRs (local commits only; the main session verifies and pushes); unpushed commits on your branch may be reworded, squashed or re-authored when the task says so; no downloads; the repo is public (no local paths or user names in committed files or messages); every value sourced or marked provisional; Classic stays byte-identical except where the swept barrel is drawn; scratch files in ${scratch}/ (create it), never in the repo; commits authored with the machine's git identity (git config user.name / user.email, don't pass -c or --author) and ending with exactly: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>; checks are npx tsc --noEmit, npm run build and npx vitest run <specific files>, never the whole suite; commands over about 9 minutes run with nohup in the background and are polled; every reported number comes from the final raw output of the final commit.`
const REPORT = { type: 'object', properties: {
  summary: { type: 'string' }, commits: { type: 'array', items: { type: 'string' } },
  results: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, values: { type: 'string' } }, required: ['name', 'values'] } },
  files: { type: 'array', items: { type: 'string' } }, flags: { type: 'array', items: { type: 'string' } }, problems: { type: 'string' },
}, required: ['summary', 'commits', 'results', 'flags'] }
const VERIFY = { type: 'object', properties: { ok: { type: 'boolean' }, blocking: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } }, evidence: { type: 'string' } }, required: ['ok', 'blocking', 'issues', 'evidence'] }
const VERIFY_NOTE = `Set blocking=true ONLY for defects in code, tests, rules or history (identity/footer), runs that didn't use the stated commit or settings, or numbers that materially misstate a result. Reporting nits are issues with blocking=false. ok=true only with no issues at all.`

async function step({ label, phase, prompt, verifyPrompt, model }) {
  let result = await agent(prompt, { model: model || 'opus', schema: REPORT, label, phase })
  let verdict = result ? await agent(verifyPrompt(result), { model: 'opus', schema: VERIFY, label: `verify ${label}`, phase: 'Verify' }) : { ok: false, blocking: true, issues: ['the agent died'], evidence: '' }
  if (verdict && verdict.blocking) {
    log(`${label}: blocking review issues, one more attempt`)
    result = await agent(`${prompt}\n\nA previous attempt had blocking review issues. Its report: ${JSON.stringify(result).slice(0, 8000)}\nThe review: ${JSON.stringify(verdict).slice(0, 6000)}\nFix them.`, { model: 'opus', schema: REPORT, label: `${label} (2)`, phase })
    verdict = result ? await agent(verifyPrompt(result), { model: 'opus', schema: VERIFY, label: `re-verify ${label}`, phase: 'Verify' }) : { ok: false, blocking: true, issues: ['the agent died'], evidence: '' }
  }
  return { result, verdict }
}

// ---------- Reef ----------
const REEF_DIR = WT + '/reefjet'
const reefLane = (async () => {
  const built = await step({ label: 'Reef landing length', phase: 'Reef', verifyPrompt: (r) => `Skeptical reviewer, read-only in ${REEF_DIR} (branch claude/reef-jet-ask, from main 078e88d). ${VERIFY_NOTE}
The advisor's ruling: ${W4}/reef-ruling.md (section 2: the Reef's LIP_JET entry gets a landing length of 1.35 H, the two periodic runs' median, provisional, read ONLY by the thickness in land(); the void, carve, trapped air and jet speed unchanged; re-measure the ten seas). Report: ${JSON.stringify(r).slice(0, 12000)}
Check: the diff does exactly that and nothing else at other spots (bit-identical: the hashes); the ten seas used the stated settings and the numbers match the raw logs; tests pass (run the lip tests); tsc clean; history: e0447aab3's message reworded to match the code, all commits with the machine identity and the Opus footer, no local paths; ROADMAP's Open list updated as ruled.`, prompt: `${RULES(REEF_DIR, 'claude/reef-jet-ask', SP + '/reefjet')}

Task: the Reef jet's landing fix, ruled by the advisor (read ${W4}/reef-ruling.md in full, and ${W4}/reef-change.json for what was built and how it was measured; the branch has e0447aab3, 79dae6999 and ec4a43a59).
1. Give the Reef's LIP_JET entry a landing length of 1.35 H (the two periodic runs' median: 1.198 and 1.500 H, from their plunge data files; provisional), read ONLY by the thickness in land(). The void, the carve, the trapped air and the jet speed stay as they are. Unit test it (the Reef's landed sheet about 0.43 H; other spots unchanged).
2. Re-measure the same ten seas as before (110 s each, one at a time; reuse the earlier runner and its settings). Pass bars: the thrown sheet 0.41-0.46 H; the Small swell's steepest step at or under Medium's (1.46-1.55), and no bigger sea's above main's; momentum not placed and the surf readout unchanged from the raise; the other spots bit-identical (hashes). Tabulate main / raise / landing.
3. History: reword e0447aab3's message so it matches the code (no 'the 0.5 H lip is kept', no 'steepest steps within the seeds' spread').
4. ROADMAP Open list: drop 'a run on a steeper ledge'; add the momentum watch (parcel jets at about 1.95 C against the library's about 1 C) and the optional cap probe.
5. Draft the PR description (claude/reef-jet-ask into main) in the style of recent PRs (gh pr view 99 --repo vice7770/surfing-game): the owner's decision, the values and sources, the measured table, the tests, and that PR 7's swept barrel replaces the Reef's parcel sheet and carve (the look is judged there). No local paths; end with: 🤖 Generated with [Claude Code](https://claude.com/claude-code). Write it to ${SP}/reefjet/pr-body.md; title in summary.` })
  const ruling = await agent(`You are "Water physics research", the wave-shape advisor (read ${ADV}/.claude/agents/water-physics.md and the newest 20 rows of ${CLOG}; read-only). Your ruling of earlier today: ${W4}/reef-ruling.md. Check the landing fix against its bars: the thrown sheet 0.41-0.46 H; the Small swell's steepest step at or under Medium's (1.46-1.55), no bigger sea's above main's; momentum and readout unchanged; other spots bit-identical. The builder's report (review: ${JSON.stringify(built.verdict).slice(0, 3000)}): ${JSON.stringify(built.result).slice(0, 12000)}
Say pass or fail per bar, whether the PR can open, any owner decision, and draft one consult-log row in the newest rows' style.`, { model: 'opus', label: 'advisor: Reef landing', phase: 'Advisor' })
  return { built, ruling }
})()

// ---------- Sound ----------
const SND_DIR = WT + '/sound'
const soundLane = step({ label: 'S1 recordings clean-up', phase: 'Sound', verifyPrompt: (r) => `Skeptical reviewer, read-only in ${SND_DIR} (branch claude/s1-recordings, from main 078e88d). ${VERIFY_NOTE}
Report: ${JSON.stringify(r).slice(0, 12000)}
Check: every loop's wrap measured per channel on the decoded files has no step or burst above the file's own 95th-percentile window (method stated); one-shots start and end clean; sounds.json, parseManifest and its tests consistent (run npx vitest run src/audio); the engine changes are physical, tested and documented, with provisional values marked, and every sound still plays on its synthesised fallback; docs/ASSETS.md and ROADMAP are accurate (the Sound check button's real name; the full list of still-synthesised ids; per-channel wrap claims) with no local paths; history: every commit on the branch authored with the machine identity, each ending with the Opus footer, no stale claims in messages; tsc clean; npm run build passes.`, prompt: `${RULES(SND_DIR, 'claude/s1-recordings', SP + '/sound')}

Task: get the S1 recordings branch ready for a DRAFT PR (the owner's listening playtest decides taste). Read ${W4}/sound-rounds.json (three rounds: what was made, the reviews and the critic's notes) and git log origin/main..HEAD. ElevenLabs credits are exhausted (quota_exceeded): generate nothing; work with the files and takes already in hand under ${SP}/sound/.
1. Fix the wrap regressions the last review found: the new distant loops (a step at their wrap, on a whitened view) and bubbles-1 (a treble burst at the wrap). Measure per channel on decoded output (as a browser would decode the .m4a, including AAC priming/edit lists) and fix the cause (e.g. how the loop is rotated, padded or encoded). If a file can't be fixed without new takes, fall back to the previous version of that file that measured clean, and say so.
2. Docs accuracy: docs/ASSETS.md and ROADMAP.md (the Sound check button's real name, not '♪ Sound'; the still-synthesised list includes leashSnap, knock and duckDive; per-channel wrap claims; anything else the reviews flagged).
3. Review your branch's engine changes (src/audio: AudioEngine, SoundBank, soundMapping, variants, SoundCheck) against the S1 plan's constraints (docs/superpowers/plans/2026-09-26-s1-sound.md: nothing scripted; levels from measured quantities, marked provisional; always playable on the synthesised fallbacks; P8 files change only to add). Fix anything that breaks them; list what changed and why in the report.
4. History: rewrite the branch (unpushed) so every commit is authored and committed with the machine identity and ends with 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>' (several end with Sonnet 5.5 or carry another author). Squash or reword 4d74369f8 so no message carries a claim a later commit corrected. Keep trees identical except for your fixes.
5. Run npx vitest run src/audio, npx tsc --noEmit, npm run build.
6. Draft the PR description (a draft PR, claude/s1-recordings into main) in the style of recent PRs: the owner's decision (ElevenLabs-generated recordings instead of CC0 downloads), what each sound is, the engine changes, the critic's remaining defects per sound (scores out of 10), that credits ran out, the licence note (used under the owner's ElevenLabs plan; whether attribution is needed depends on the plan's tier, still to confirm with the owner), and what the owner should listen for. No local paths; end with: 🤖 Generated with [Claude Code](https://claude.com/claude-code). Write it to ${SP}/sound/pr-body.md; title in summary.` })

const [reef, sound] = await Promise.all([reefLane, soundLane])
return { reef, sound }
