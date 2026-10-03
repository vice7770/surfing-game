export const meta = {
  name: 'padang-look-aaa',
  description: 'Padang Padang finished barrel: integrate #104+#107+#102 locally, then loop capture -> three harsh Opus critics (frozen rubric) -> advisor triage (sourced fixes only) -> parallel builders -> verify -> merge, until wowed or the round cap',
  phases: [
    { title: 'Integrate', detail: 'local look/padang-finished = #104 + #107 (#105) + #102; conflicts resolved and reviewed' },
    { title: 'Capture', detail: 'headless WebGPU water sheets: curl shots + whitewater' },
    { title: 'Critique', detail: 'three harsh Opus critics vs production games, frozen rubric' },
    { title: 'Triage', detail: 'Opus advisor: sourced fixes, rejections with reasons' },
    { title: 'Build', detail: 'Sonnet builders per file-disjoint group, own worktrees; Opus escalation' },
    { title: 'Verify', detail: 'Opus review per group; Classic invariance' },
    { title: 'Merge', detail: 'verified groups merged into the look branch' },
  ],
}

const SP = '<SCRATCH>'
const WT = '<WORKTREES>'
const LOOK = WT + '/look'
const ADV = WT + '/advisor'
const LS = SP + '/look'
const HARNESS = SP + '/harness/shoot.mjs'
const HANDOFF = ADV + '/docs/superpowers/handoffs/2026-10-03-all-pending-work.md'
const MAX_ROUNDS = 4

const RULES = (dir, branch) => `Project: the Breakline surf game, repo vice7770/surfing-game (public). You work ONLY in the git worktree ${dir} (branch ${branch}). Never touch <OWNER_CHECKOUT> (the owner's checkout; a dev server runs there) or any worktree you were not given.
Context (read-only): the handoff ${HANDOFF}, the advisor's knowledge base ${ADV}/docs/research/water-physics/ (README.md for the owner's standing decisions; consult-log.md, newest first, for every ruling; tube-colour-fix.md, graphics.md, foam-and-whitewater.md, spray-and-mist.md, swept-barrel-build.md).
The owner's hard rules:
- Never merge PRs, never push, never open or edit PRs. Local commits only. The main session verifies and pushes.
- No downloads (papers, datasets, textures). The repo is public: no local paths or user names in committed files or messages.
- Realism: every shape and value is sourced (measurement, simulation or paper) or marked provisional in a comment. Hand-authored shapes don't qualify.
- One water: the rider hits exactly what is drawn; the lip, tube and anything collided match between online players (spray, foam texture and mist may differ).
- Looks: Classic stays byte-identical except where the swept barrel is drawn; new visuals go to Rich. src/scene/waterLooks.test.ts, src/scene/barrel/SweptBarrel.test.ts and SweptBarrelMesh.test.ts pin Classic: they must pass unchanged.
- Performance is measured, never a gate (target M4 Pro): report the cost of render changes when you can.
- Commits: conventional prefix like the history (fix(barrel): ..., feat(water): ..., perf(barrel): ...), plain-prose subject, short body, last line: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>. One fix per commit, touching only its files, so it can be cherry-picked later.
- Checks: npx tsc --noEmit, npm run build, and npx vitest run src/scene/barrel src/wave/barrel src/scene/waterLooks.test.ts plus the tests of every file you touch. Never the whole suite.
- Scratch files go in ${LS}/ (create it), never in the repo.`

const REPORT = { type: 'object', properties: {
  summary: { type: 'string' },
  commits: { type: 'array', items: { type: 'string' } },
  files: { type: 'array', items: { type: 'string' } },
  details: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' } }, required: ['name', 'value'] } },
  problems: { type: 'string' },
}, required: ['summary', 'commits', 'files'] }
const VERIFY = { type: 'object', properties: { ok: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } }, evidence: { type: 'string' } }, required: ['ok', 'issues', 'evidence'] }
const CRITIC = { type: 'object', properties: {
  scores: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, score: { type: 'number' }, evidence: { type: 'string' }, worstDefect: { type: 'string' } }, required: ['item', 'score', 'evidence', 'worstDefect'] } },
  verdict: { type: 'string', enum: ['wowed', 'not-yet'] },
  defects: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, image: { type: 'string' }, region: { type: 'string' }, what: { type: 'string' }, productionBar: { type: 'string' } }, required: ['id', 'severity', 'image', 'region', 'what', 'productionBar'] } },
  improvedSinceLast: { type: 'string' },
}, required: ['scores', 'verdict', 'defects'] }
const TRIAGE = { type: 'object', properties: {
  groups: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' },
    fixes: { type: 'array', items: { type: 'object', properties: { defects: { type: 'array', items: { type: 'string' } }, cause: { type: 'string' }, change: { type: 'string' }, source: { type: 'string' }, look: { type: 'string' }, check: { type: 'string' } }, required: ['defects', 'cause', 'change', 'source', 'look', 'check'] } },
    files: { type: 'array', items: { type: 'string' } },
  }, required: ['id', 'fixes', 'files'] } },
  rejected: { type: 'array', items: { type: 'object', properties: { defect: { type: 'string' }, class: { type: 'string', enum: ['physically-correct', 'needs-owner', 'later-phase', 'needs-new-simulation', 'hand-authored', 'out-of-scope', 'duplicate'] }, reason: { type: 'string' } }, required: ['defect', 'class', 'reason'] } },
  ownerQuestions: { type: 'array', items: { type: 'string' } },
  consultRow: { type: 'string' },
  stalled: { type: 'boolean' },
}, required: ['groups', 'rejected', 'stalled'] }

const LENSES = [
  { name: 'render', who: 'a principal technical art director who shipped water rendering in AAA open-world and racing games', rubric: [
    'Lip and curl translucency: the thin sheet lit from behind',
    'Interior and throat: depth, the darkening gradient, the green room',
    'Surface micro-detail at close range: normals and ripples, no plastic or smeared look',
    'Foam and lace: texture, scale and motion cues, no tiling or cellular-pattern artefacts',
    'Specular, Fresnel and reflections plausible at dawn, midday and sunset',
    'Colour and absorption: water reads as water at each thickness and depth',
    'Artefacts: seams, hard lines, z-fighting, stretching, aliasing, holes, flat-colour regions',
    'Classic as a credible base look, Rich clearly richer',
  ] },
  { name: 'surf', who: 'a big-wave surf photographer who has shot Padang Padang for twenty years and also consulted on a shipped surfing game', rubric: [
    'The curl reads as a plunging tube: lip throw, thickness, curvature, cavity',
    'The lip joins the face as one continuous sheet: no detached slab or floating parts',
    'The peel and progression along the crest',
    'Foam where it belongs (behind the curl, on the flat) and a clean face before touchdown',
    'Scale and proportion against Padang Padang: wave height, tube size, the reef',
    'Continuity along the front: no splits, double fronts or abrupt ends',
    'Spray and mist at the lip and at the crash',
    'The crash and the foam ball',
  ] },
  { name: 'shot', who: 'a game director who shipped flagship AAA titles and signs off their marketing screenshots', rubric: [
    'The tube reads instantly from the channel and front views',
    'The inside shot delivers the in-the-barrel moment',
    'Lighting mood at each time of day',
    'Silhouette, depth and atmospheric perspective',
    'Would this frame sit beside a shipped AAA screenshot without embarrassment',
  ] },
]

// ---------- Integrate ----------
const INTEGRATE = `${RULES(LOOK, 'look/padang-finished')}

Task: build the finished barrel for review. look/padang-finished is a LOCAL branch (never push it) now at claude/padang-rich-shading (#104, which holds #91 -> #92 -> #95 -> #103 -> #104). Merge, in order, origin/claude/padang-every-spot (#107, which holds #105's peak sizing plus PR 7's cases and tip refit) and then origin/claude/padang-crash (#102, PR 5). Expect conflicts in src/scene/barrel/SweptBarrel.ts and docs/research/barrel-library.md, maybe more. Resolve each keeping BOTH sides' intent: read each side's commits touching the file (git log -p) and the consult-log rulings they implement; never drop a ruled behaviour; for generated binaries (public/barrels/*.bin) take #107's refit unless #102 regenerated them for a reason (check). Then npx tsc --noEmit, npm run build, npx vitest run src/wave/barrel src/scene/barrel src/scene/waterLooks.test.ts.
In details, list every conflict: file, the two sides, how you resolved it and why. The owner's merges will meet the same conflicts.`

let integ = await agent(INTEGRATE, { model: 'sonnet', schema: REPORT, label: 'integrate [sonnet]', phase: 'Integrate' })
let integCheck = await agent(`Skeptical reviewer, read-only in ${LOOK} (local branch look/padang-finished). Default to ok=false unless you confirm each point. The integrator merged origin/claude/padang-every-spot and origin/claude/padang-crash into claude/padang-rich-shading. Its report: ${JSON.stringify(integ).slice(0, 10000)}
Check: both merges are in HEAD's history; each conflict resolution keeps both sides' intent (compare git show HEAD^1:<file>, the other parent, and the result; read the rulings in ${ADV}/docs/research/water-physics/consult-log.md that each side implements); no stray conflict markers (git grep -n '<<<<<<<\\|>>>>>>>'); npx tsc --noEmit clean; npx vitest run src/wave/barrel src/scene/barrel src/scene/waterLooks.test.ts passes (run it).`, { model: 'opus', schema: VERIFY, label: 'verify integrate', phase: 'Verify' })
if (!integCheck || !integCheck.ok) {
  log('integration failed review; escalating to Opus')
  integ = await agent(`${INTEGRATE}

A previous attempt failed review. Its report: ${JSON.stringify(integ).slice(0, 6000)}. The issues: ${JSON.stringify(integCheck)}. Fix them (fix forward; if a merge is wrong, redo it: git reset --hard to the branch's starting commit is allowed ONLY on this local branch, since it is never pushed).`, { model: 'opus', schema: REPORT, label: 'integrate [opus]', phase: 'Integrate' })
  integCheck = await agent(`Skeptical reviewer, read-only in ${LOOK}. Re-check the integration exactly as before: merges present, conflict resolutions keep both sides' intent, no conflict markers, typecheck clean, barrel and water-look tests pass (run them). Report: ${JSON.stringify(integ).slice(0, 8000)}`, { model: 'opus', schema: VERIFY, label: 're-verify integrate', phase: 'Verify' })
  if (!integCheck || !integCheck.ok) return { integ, integCheck, stopped: 'integration failed twice' }
}

// ---------- rounds ----------
const rounds = []
for (let r = 1; r <= MAX_ROUNDS; r += 1) {
  const cap = await agent(`${RULES(LOOK, 'look/padang-finished')}

Capture round ${r} of the finished barrel with the headless harness ${HARNESS} (read its header; it never opens a visible window). Run these two commands in parallel (two background processes, different ports), each takes 5-15 minutes:
  node ${HARNESS} sheet --serve=${LOOK} --port=5181 --out=${LS}/r${r}/curl --spot=padang --shots=curl-close:rich:midday,curl-close:rich:sunset,curl-close:rich:dawn,curl-inside:rich:midday,curl-inside:rich:sunset,curl-channel:rich:midday,curl-front:rich:midday,curl-behind:rich:sunset,curl-close:classic:midday,curl-inside:classic:midday,lineup:rich:sunset
  node ${HARNESS} sheet --serve=${LOOK} --port=5183 --out=${LS}/r${r}/ww --spot=padang --whitewater --shots=ww-beside:rich:midday,ww-shoulder:rich:sunset,ww-behind:rich:midday,ww-below:rich:midday
If the whitewater sheet never holds a foam ball at Padang (it times out), say so and skip it. If a shot name is missing, read status.txt for the available names and use the closest. Open the water-sheet.png files and two close-ups yourself to confirm they rendered (not black, the curl visible). Return every PNG path in files (water-sheet.png first) and put each status.txt's text in details.`, { model: 'sonnet', schema: REPORT, label: `capture r${r}`, phase: 'Capture' })
  const pngs = (cap && cap.files ? cap.files : []).filter((f) => /\.png$/.test(f))
  if (!pngs.length) { log(`round ${r}: capture produced nothing; stopping`); rounds.push({ round: r, cap }); break }
  const prev = rounds.length ? rounds[rounds.length - 1] : null
  const critics = await parallel(LENSES.map((lens) => () => agent(`You are ${lens.who}. You are reviewing renders of a breaking barrel at Padang Padang from a WebGPU surfing game. Be brutally harsh. "Good for a browser game" earns nothing: compare directly with the best shipped production games and with real photographs of Padang Padang. Only give the verdict "wowed" if every rubric item scores 9 or more AND the frames would hold up side by side with a shipped AAA title.
Open every image: ${pngs.join(', ')}
(water-sheet.png is a grid: columns classic/rich at dawn, midday, sunset; rows are the named shots, each labelled in its corner. The other files are 1280x720 close-ups named <shot>-<look>-<time>.png.) Capture notes: ${JSON.stringify(cap.details || []).slice(0, 1500)}
Score with this FROZEN rubric, 1-10 per item, the same items every round:
${lens.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n')}
${prev ? `Your lens's scores last round: ${JSON.stringify(((prev.critics || []).find((c) => c.lens === lens.name) || {}).scores || [])}. Changes made since: ${JSON.stringify((prev.merged || []).map((g) => g.summary)).slice(0, 3000)}. Say honestly what improved and what didn't; never move the bar.` : ''}
List every defect: severity, image, region, what is wrong, and what production games or real photos show instead. Be specific enough that an engineer can find it.`, { model: 'opus', schema: CRITIC, label: `${lens.name} critic r${r}`, phase: 'Critique' }).then((c) => (c ? Object.assign(c, { lens: lens.name }) : c))))
  const valid = critics.filter(Boolean)
  const wowed = valid.length === LENSES.length && valid.every((c) => c.verdict === 'wowed')
  const round = { round: r, files: pngs, critics: valid }
  rounds.push(round)
  log(`round ${r}: ${valid.map((c) => `${c.lens} ${c.verdict} min ${Math.min(...c.scores.map((s) => s.score))} mean ${(c.scores.reduce((a, s) => a + s.score, 0) / c.scores.length).toFixed(1)}`).join('; ')}`)
  if (wowed) break
  if (r === MAX_ROUNDS) { log(`round cap (${MAX_ROUNDS}) reached in this run; the main session decides on more`); break }

  const triage = await agent(`You are "Water physics research", the wave-shape advisor for the Breakline surfing game. Read ${ADV}/.claude/agents/water-physics.md (your role), ${ADV}/docs/research/water-physics/README.md (the owner's standing decisions), the newest 30 rows of ${ADV}/docs/research/water-physics/consult-log.md, tube-colour-fix.md, graphics.md, foam-and-whitewater.md and spray-and-mist.md there, and the barrel and water code in ${LOOK} (src/scene/barrel, src/scene/water, src/wave/barrel, scripts/barrel-library.ts). Read-only.
Three harsh critics reviewed renders of the finished barrel (round ${r}). Turn their defects into fixes for builders, under the owner's rules: every change sourced (a measurement, a simulation, a paper, or our own Basilisk data) or marked provisional; no hand-authored shapes; one water (collided geometry identical for everyone); Classic byte-identical except where the swept barrel is drawn, new visuals to Rich; the owner's order (face and tube first, then whitewater with volume, then spray and lighting) — work from later phases is allowed only where the owner already decided it as recommended (see README's decisions), otherwise class later-phase.
The ruled but unassigned Part B follow-ups are yours to assign now when a defect calls for them: residual lace on the curl's lifted face (a face-aligned foam mapping); whitening at the lip's leading edge (with the spray look); the library's underside wiggles (a light smoothing of near-vertical undersides in the converter); the curl's crest light at weight 0 (the profile's own horizontal chord, if the seam's contrast shows); Rich's upload size (half floats).
For each defect: either a fix (its physical or rendering cause found in the code, file:line; the change; its source; what the player will see; how to check it on the next capture) or a rejection with its class and reason. Group fixes so groups touch DISJOINT files (they are built in parallel in separate worktrees). Keep the number of groups at or under 5, most visible payoff first. Questions only the owner can answer go in ownerQuestions. Draft one consult-log row (in the newest rows' style) summarising this round's rulings. Set stalled=true only if no actionable fix remains.
The critics: ${JSON.stringify(valid).slice(0, 30000)}
${rounds.length > 1 ? `Earlier rounds' triage, to avoid repeating a failed fix: ${JSON.stringify(rounds.slice(0, -1).map((x) => ({ round: x.round, groups: x.triage && x.triage.groups, failed: x.failed }))).slice(0, 8000)}` : ''}`, { model: 'opus', schema: TRIAGE, label: `triage r${r}`, phase: 'Triage' })
  round.triage = triage
  if (!triage || triage.stalled || !triage.groups.length) { log(`round ${r}: triage stalled (nothing actionable without the owner or new simulations)`); break }

  const base = `look-r${r}-base`
  const results = await parallel(triage.groups.map((g, gi) => async () => {
    const dir = `${WT}/lookfix-r${r}-${gi + 1}`
    const branch = `look-fix/r${r}-${gi + 1}`
    const prompt = `${RULES(dir, branch)}

Setup (do this first): cd ${LOOK} && git worktree add -b ${branch} ${dir} HEAD && cp -cR ${LOOK}/node_modules ${dir}/node_modules . Work only in ${dir}.
Build this group of fixes for the finished barrel (from the critics, triaged by the advisor):
${JSON.stringify(g)}
For each fix: find the cause in the code first (confirm the advisor's file:line), make the change with its source cited in a comment (or marked provisional), keep Classic byte-identical unless the fix is to the swept barrel's own drawing, add or update unit tests for the new logic, and commit it on its own. Run the checks. You may capture a quick before/after close-up with ${HARNESS} (sheet mode, --serve=${dir}, port ${5190 + gi}) to confirm the change shows; save to ${LS}/r${r}/g${gi + 1}/. Report each commit, what changed visually, and the cost if measurable.`
    let built = await agent(prompt, { model: 'sonnet', schema: REPORT, label: `build r${r} g${gi + 1} [sonnet]`, phase: 'Build' })
    const reviewPrompt = (b) => `Skeptical reviewer for the Breakline surf game, read-only in ${dir} (branch ${branch}, based on look/padang-finished). Default to ok=false unless you confirm each point. The group's fixes: ${JSON.stringify(g)}. The builder's report: ${JSON.stringify(b).slice(0, 8000)}.
Check: (1) each fix is implemented as specified and fixes the named cause (read the diff: git log --oneline look/padang-finished..HEAD, git diff look/padang-finished..HEAD); (2) every new value has a cited source or is marked provisional; no hand-authored shape; (3) Classic unchanged except the swept barrel's own drawing: run npx vitest run src/scene/waterLooks.test.ts src/scene/barrel; (4) no test was weakened or deleted to pass; (5) npx tsc --noEmit clean; (6) commits are one fix each with the footer line and no local paths.`
    let check = built ? await agent(reviewPrompt(built), { model: 'opus', schema: VERIFY, label: `verify r${r} g${gi + 1}`, phase: 'Verify' }) : { ok: false, issues: ['agent died'], evidence: '' }
    if (!check || !check.ok) {
      log(`r${r} g${gi + 1}: Sonnet failed review, escalating to Opus`)
      built = await agent(`${prompt}

A previous attempt failed review (the worktree ${dir} may already exist with its commits: reuse it, fix forward, or git revert wrong commits). Its report: ${JSON.stringify(built).slice(0, 6000)}. The review: ${JSON.stringify(check)}.`, { model: 'opus', schema: REPORT, label: `build r${r} g${gi + 1} [opus]`, phase: 'Build' })
      check = built ? await agent(reviewPrompt(built), { model: 'opus', schema: VERIFY, label: `re-verify r${r} g${gi + 1}`, phase: 'Verify' }) : { ok: false, issues: ['agent died'], evidence: '' }
    }
    return { group: g.id, branch, dir, built, check }
  }))
  const passed = results.filter((x) => x && x.check && x.check.ok)
  round.failed = results.filter((x) => !(x && x.check && x.check.ok)).map((x) => x && { group: x.group, issues: x.check && x.check.issues })
  if (!passed.length) { log(`round ${r}: no group passed review; stopping`); break }
  const merged = await agent(`${RULES(LOOK, 'look/padang-finished')}

Merge these reviewed fix branches into look/padang-finished, one at a time, resolving any conflict by keeping both fixes: ${passed.map((x) => x.branch).join(', ')}. Then npx tsc --noEmit, npm run build, npx vitest run src/wave/barrel src/scene/barrel src/scene/waterLooks.test.ts. Then remove their worktrees (git worktree remove --force <dir> for ${passed.map((x) => x.dir).join(', ')}) but KEEP the branches. In summary, one line per branch: what it changed visually.`, { model: 'sonnet', schema: REPORT, label: `merge r${r}`, phase: 'Merge' })
  round.merged = passed.map((x) => ({ branch: x.branch, summary: x.built && x.built.summary }))
  round.mergeReport = merged
}

return {
  integ, integCheck,
  rounds: rounds.map((x) => ({
    round: x.round, files: x.files,
    critics: (x.critics || []).map((c) => ({ lens: c.lens, verdict: c.verdict, scores: c.scores, defects: c.defects, improvedSinceLast: c.improvedSinceLast })),
    triage: x.triage, merged: x.merged, failed: x.failed,
  })),
}
