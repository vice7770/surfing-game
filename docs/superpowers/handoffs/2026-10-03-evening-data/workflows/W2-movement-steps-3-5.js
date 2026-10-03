export const meta = {
  name: 'movement-steps-3-5',
  description: 'Movement prototype steps 3-5 on the Wave Pool: catches and flow probe re-checked, cutback finished physics-first, pumping with real physics, then a harsh motion-critic loop on filmed rides',
  phases: [
    { title: 'Orient', detail: 'merge wave-pool, brief, paddled catches + flow probe' },
    { title: 'Cutback', detail: 'Opus design, Sonnet build, probe; physics first' },
    { title: 'Pumping', detail: 'Opus design, Sonnet build, still-water probe; physics only' },
    { title: 'Film', detail: 'flow rides filmed headless at the pool' },
    { title: 'Critic', detail: 'harsh Opus motion critics vs production surf games, frozen rubric' },
    { title: 'Fix', detail: 'physics-first fixes from the critics, verified' },
    { title: 'PR', detail: 'description for the steps 3-5 PR, stacked on #106' },
  ],
}

const SP = '<SCRATCH>'
const WT = '<WORKTREES>'
const DIR = WT + '/poolflow'
const MS = SP + '/move'
const HANDOFF = WT + '/advisor/docs/superpowers/handoffs/2026-10-03-all-pending-work.md'
const HARNESS = SP + '/harness/shoot.mjs'

const RULES = `Project: the Breakline surf game, repo vice7770/surfing-game (public). You are part of the "Movement mapping prototype" work. You work ONLY in the git worktree ${DIR} (branch claude/pool-flow-probe). Never touch <OWNER_CHECKOUT> (the owner's checkout; a dev server runs there) or any other worktree under ${WT}.
Context: ${HANDOFF}, section "The Movement mapping prototype" (read-only for you), the spec docs/superpowers/specs/2026-09-30-movement-flow-wave-pool.md, and the shared brief ${MS}/brief.md once it exists.
The owner's hard rules:
- Never merge, never push, never open or edit PRs: commit locally only. The main session verifies and pushes.
- The repo is public: no local absolute paths or user names in committed files or messages. No downloads.
- Controls: the pad is the design target (analog); the keyboard approximates it.
- No move recognition, names or scores.
- Physics first: real physics for pumping; an assist only where a short still-water probe misses the bar. Any gameplay assist gets its own ledger entry, like COMPRESS_PULL and CARVE_CARRY.
- Checks: NO ride reports, autopilot sweeps or slow physics suites. Use fast unit tests for new logic, npx tsc --noEmit, npm run build, short probes (PROBE=1 npx vitest run src/wave/probes/poolFlow.probe.test.ts with START= and SIZE=), and the filmed looks. Update old tests only in the files you touch; src/physics/compressTurn.test.ts (or wherever compressTurn's tests live) must stay green.
- Don't retry (measured and dropped earlier; reports in the repo): a feed-forward lean-in (LEAN_IN_FEED on the reference rate or plan), reference shaping or rate feed-forward for the lean-in (docs/research/lean-in-study.md); rail-first entries where the feet roll the rail past the body, a yaw torque at the entry, BANK_RATE_GAIN below 3.6 (docs/research/bottom-turn-entry-study.md); the feet never rolling the board past the body while steering, and the lean cap held through the turn; the autopilot's easeBelow and climbBelow bottom-turn exits; the braking-curve rail controller (designed, not built: docs/research/rail-control-study.md).
- Wave-shape questions belong to the water-physics advisor: write them in your report's questions; don't settle a wave shape yourself.
- Scratch files go in ${MS}/ (create it), never in the repo.
- Commits: conventional prefix like the branch's history (fix(physics): ..., feat(autopilot): ..., test: ..., wip(autopilot): ...), a plain-prose subject, a short body when useful, and the last line: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
- Long commands (over about 9 minutes): nohup in the background with a log under ${MS}/, then poll until done.`

const REPORT = { type: 'object', properties: {
  summary: { type: 'string' },
  commits: { type: 'array', items: { type: 'string' } },
  numbers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, values: { type: 'string' } }, required: ['name', 'values'] } },
  files: { type: 'array', items: { type: 'string' } },
  questions: { type: 'array', items: { type: 'string' } },
  problems: { type: 'string' },
}, required: ['summary', 'commits', 'numbers', 'files'] }
const EVAL = { type: 'object', properties: {
  passed: { type: 'boolean' },
  criteria: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['criterion', 'met', 'evidence'] } },
  feedback: { type: 'string' },
  switchToAssist: { type: 'boolean' },
}, required: ['passed', 'criteria', 'feedback'] }
const CRITIC = { type: 'object', properties: {
  scores: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, score: { type: 'number' }, evidence: { type: 'string' }, worstDefect: { type: 'string' } }, required: ['item', 'score', 'evidence', 'worstDefect'] } },
  verdict: { type: 'string', enum: ['wowed', 'not-yet'] },
  defects: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, where: { type: 'string' }, what: { type: 'string' }, productionBar: { type: 'string' } }, required: ['id', 'severity', 'where', 'what', 'productionBar'] } },
  outOfScope: { type: 'array', items: { type: 'string' } },
  improvedSinceLast: { type: 'string' },
}, required: ['scores', 'verdict', 'defects'] }
const TRIAGE = { type: 'object', properties: {
  fixes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, defects: { type: 'array', items: { type: 'string' } }, mechanism: { type: 'string' }, change: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, check: { type: 'string' } }, required: ['id', 'defects', 'mechanism', 'change', 'files', 'check'] } },
  rejected: { type: 'array', items: { type: 'object', properties: { defect: { type: 'string' }, reason: { type: 'string' } }, required: ['defect', 'reason'] } },
  stalled: { type: 'boolean' },
}, required: ['fixes', 'rejected', 'stalled'] }

const RUBRIC = [
  'Bottom turn: compression, lean into the turn and the rail biting, with believable timing',
  'Projection off the bottom turn: the extension and the speed carried up the face',
  'Cutback: the rail change from near upright, the arc, the rebound off the foam, no bog or fall',
  'Pumping: rhythm and weighting coupled to board speed; it reads as making speed',
  'Body-board coupling: feet planted, board angle consistent with the lean, no sliding or popping',
  'Flow and speed: one committed continuous line, no stalls, sticky moments or robotic snaps',
  'Physical believability against real surf footage: weight, momentum, balance',
  'Glitches: pops, jitter, interpenetration with the water, judder',
]

// ---------- Orient ----------
const orient = await agent(`${RULES}

Task (orientation and the first checks from the handoff's "Next" list):
1. Merge origin/claude/wave-pool into this branch (it is 2 commits behind; stacked-PR hygiene). Then npx tsc --noEmit and npx vitest run src/dev/Autopilot.test.ts (26 should pass).
2. Read: the handoff section, the spec, docs/superpowers/plans/2026-09-30-compress-ladder.md, docs/superpowers/plans/2026-09-26-turn-redesign.md (Task 4: the standing ankle rest that laid the board flat fought the load-line hull and threw a quarter-steer rider), the three don't-retry studies, and the code: src/dev/Autopilot.ts (style 'flow'), the carve carry (CARVE_CARRY), COMPRESS_PULL and its gate, the rails and bank, the compressTurn tests, src/wave/probes/poolFlow.probe.test.ts and src/dev/rideRecorder.ts.
3. Run, one at a time: (a) 2-3 paddled catches with the pool flow probe, START=catch, on the take-off as built (bbec2a9): did they catch? (b) the pool flow probe with the new projection end (d6a7c55): START=trough SIZE=medium, then SIZE=big.
4. Write ${MS}/brief.md: the state; the exact commands; the key code locations (file:line) for the projection end, the cutback, rail changes, planing speed, the body's bank and lean lag; the spec's bars for the cutback and for pumping; and what the probe numbers show per phase (bank at the cutback's start, speed through it, falls and when, stalls).`, { model: 'sonnet', schema: REPORT, label: 'orient + catches + flow probe', phase: 'Orient' })

// ---------- a design -> build -> evaluate loop ----------
async function designBuildLoop({ name, phase, goal, criteria, maxIter, assistAllowed }) {
  const history = []
  let mode = 'physics'
  for (let i = 1; i <= maxIter; i += 1) {
    const design = await agent(`${RULES}

You design, you don't build. Goal: ${goal}
Mode: ${mode === 'physics' ? 'PHYSICS FIRST: a real physical mechanism, no assist.' : 'ASSIST: physics has failed the bar; design the lean-out pull named in the handoff (toward the new rail while the steer asks for the side opposite the body\'s bank), mirroring COMPRESS_PULL\'s gate, with its own ledger entry. It is not the lean-in feed-forward on the don\'t-retry list.'}
Read ${MS}/brief.md, the code it points to, and the earlier attempts below. Respect the don't-retry list and the turn redesign's Task 4 lesson. Write a precise design to ${MS}/${name}-design-${i}.md: the mechanism (why it works physically), the exact code changes (file:line), every constant with its source or marked provisional, the gate (when it acts and when it doesn't), the unit tests to add, and the probe runs that judge it against these criteria:
${criteria.map((c) => '- ' + c).join('\n')}
Earlier attempts: ${JSON.stringify(history).slice(0, 12000)}
Return the design file path and a short summary as your final text.`, { model: 'opus', label: `${name} design ${i}`, phase })
    const builderModel = i >= 2 ? 'opus' : 'sonnet'
    const built = await agent(`${RULES}

Build exactly the design in ${MS}/${name}-design-${i}.md (summary: ${String(design).slice(0, 1500)}). Add its unit tests; run them and the tests of every file you touch, npx tsc --noEmit and npm run build. Then run the probes the design names (short probes only) and report every number against the criteria. Commit locally when the checks pass (one or two focused commits).`, { model: builderModel, schema: REPORT, label: `${name} build ${i} [${builderModel}]`, phase })
    const judged = await agent(`You judge a movement change for the Breakline surf game, strictly. Default to passed=false unless the evidence proves each criterion. Work read-only in ${DIR}: read the design ${MS}/${name}-design-${i}.md, the diff of the builder's commits (git log -5, git show), and the raw probe logs it names.
Criteria:
${criteria.map((c) => '- ' + c).join('\n')}
Also fail it if: it uses anything on the don't-retry list; it changes behaviour outside its gate (compressTurn tests must pass: run them); an assist lacks its own ledger entry; tests were weakened.
The builder's report: ${JSON.stringify(built).slice(0, 10000)}
${assistAllowed && mode === 'physics' ? 'If physics clearly cannot meet the bar (say why from the numbers), set switchToAssist=true.' : ''}`, { model: 'opus', schema: EVAL, label: `${name} judge ${i}`, phase })
    history.push({ iteration: i, mode, design: String(design).slice(0, 2000), built, judged })
    if (judged && judged.passed) return { passed: true, iterations: history }
    if (judged && judged.switchToAssist && assistAllowed && mode === 'physics') { mode = 'assist'; log(`${name}: switching to the assist after iteration ${i}`) }
  }
  log(`${name}: not passed after ${maxIter} iterations (cap); returning to the main session`)
  return { passed: false, iterations: history }
}

const cutback = await designBuildLoop({
  name: 'cutback', phase: 'Cutback', maxIter: 4, assistAllowed: true,
  goal: 'finish the cutback: change rails from near upright and keep planing speed. Candidate 1 (physics first): on release, as the legs extend, the feet roll the board off its rail toward flat under the body instead of locking at the rail\'s bite, gated to that moment so compressTurn stays green. Also try SIZE=big (more face gives the body time to come upright).',
  criteria: [
    'In the pool flow probe (START=trough, SIZE=medium and big) the flow runs bottom turn -> projection -> cutback -> rebound without a fall in the cutback or within 1 s after it',
    'The cutback changes rails starting with the body within about 12 degrees of upright',
    'Speed stays at or above planing through the cutback (report the minimum against the planing threshold)',
    'No carve up the face to a stall',
    'compressTurn tests and src/dev/Autopilot.test.ts pass; npx tsc --noEmit clean; npm run build passes',
  ],
})

const pumping = await designBuildLoop({
  name: 'pumping', phase: 'Pumping', maxIter: 3, assistAllowed: false,
  goal: 'pumping with real physics only (handoff step 4; the spec\'s pumping notes and bar): weighting and unweighting with rail changes that make speed on the face, measured with a short still-water probe and the pool flow probe.',
  criteria: [
    'A short still-water probe shows pumping gains speed (or holds it against drag) as the spec\'s bar asks; report the numbers against the bar',
    'On the pool (SIZE=medium) a pumping rider keeps planing speed along the open face without falls',
    'No assist: the speed comes from the physics (rail, weighting, board), nothing added',
    'compressTurn tests and src/dev/Autopilot.test.ts pass; npx tsc --noEmit clean; npm run build passes',
  ],
})

// ---------- film + critic loop ----------
const rounds = []
let frozen = null
for (let r = 1; r <= 3; r += 1) {
  const film = await agent(`${RULES}

Film the flow at the pool for the critics, headless (never open a visible window). The harness ${HARNESS} (read its header) has a record mode that loads ?inpage&record (src/dev/rideRecorder.ts), saves the MP4 the page posts, and cuts 4x4 contact sheets with ffmpeg.
${r === 1 ? `First, if src/dev/rideRecorder.ts only accepts style=line|turns, add style=flow (the Autopilot already has it) as a dev-only change, test it builds, and commit it (feat(dev): ...).` : ''}
Run: node ${HARNESS} record --serve=${DIR} --port=5182 --out=${MS}/r${r}/flow-medium.mp4 --query="spot=pool&style=flow" and the same for the Big size if the recorder takes a size or swell parameter (find out how the pool's sizes are chosen: read the recorder and the spot code). Then cut extra 8 fps sheets around the bottom turn, the cutback and pumping (ffmpeg -ss/-t; the recorder's log or status gives the turn times). Open a few sheets yourself to confirm the rider is visible and riding (not paddling or fallen). Return every PNG path in files, and in summary what each sheet shows.`, { model: 'sonnet', schema: REPORT, label: `film round ${r}`, phase: 'Film' })
  const sheets = (film && film.files ? film.files : []).filter((f) => /\.png$/.test(f))
  if (!sheets.length) { log(`film round ${r} produced no sheets; stopping the visual loop`); rounds.push({ round: r, film }); break }
  const lenses = [
    'a lead animator and motion director who shipped AAA sports games with physically driven characters',
    'a professional surf coach who also designed a shipped surfing game, and judges against real surf footage',
  ]
  const critics = await parallel(lenses.map((lens, k) => () => agent(`You are ${lens}. You are reviewing filmed rides from a browser surfing game's movement prototype (a rider on a wave pool doing bottom turn, projection, cutback, rebound and pumping). Be brutally harsh. "Good for a browser game" or "good for a prototype" earns nothing: compare directly with the best shipped production surfing and action-sports games and with real surf footage. Only say "wowed" if every rubric item scores 9 or more and it would hold up side by side with a shipped AAA title.
Open every one of these contact sheets (4x4 frames, left to right, top to bottom; read the time step from the summary): ${sheets.join(', ')}
What they show: ${film.summary}
Score ONLY the rider's motion with this frozen rubric (1-10 each, same items every round):
${(frozen || RUBRIC).map((c, i) => `${i + 1}. ${c}`).join('\n')}
Out of scope (list under outOfScope, don't score): the character model and textures, the wave's look, the HUD, the camera design.
${rounds.length ? `Last round's scores from your lens: ${JSON.stringify((rounds[rounds.length - 1].critics || [])[k] && rounds[rounds.length - 1].critics[k].scores)}. Say what improved and what didn't, honestly; don't move the bar.` : ''}
List every defect with severity, where (sheet and frame), what is wrong, and what production games do instead.`, { model: 'opus', schema: CRITIC, label: `critic ${k + 1} r${r}`, phase: 'Critic' })))
  frozen = RUBRIC
  const valid = critics.filter(Boolean)
  const wowed = valid.length === lenses.length && valid.every((c) => c.verdict === 'wowed')
  rounds.push({ round: r, film, critics: valid })
  log(`round ${r}: ${valid.map((c, i) => `critic ${i + 1} ${c.verdict} (min ${Math.min(...c.scores.map((s) => s.score))})`).join('; ')}`)
  if (wowed) break
  if (r === 3) { log('motion critic loop: round cap (3) reached in this run; the main session decides on more rounds'); break }
  const triage = await agent(`${RULES}

You triage the motion critics' defects into physics-first fixes for the next build. Read ${MS}/brief.md and the code. For each defect: a fix within the rules (physical mechanism first; an assist only with a still-water probe showing physics misses the bar; never anything on the don't-retry list), or rejected with the reason (out of scope, needs the advisor, a wave-shape matter, contradicts the spec, or the critic is wrong about the physics: say why). Group fixes so that each has a clear check.
The critics: ${JSON.stringify(valid).slice(0, 16000)}
Set stalled=true if nothing actionable remains.`, { model: 'opus', schema: TRIAGE, label: `triage r${r}`, phase: 'Fix' })
  rounds[rounds.length - 1].triage = triage
  if (!triage || triage.stalled || !triage.fixes.length) { log(`round ${r}: triage found nothing actionable; stopping`); break }
  for (const fix of triage.fixes) {
    let built = await agent(`${RULES}

Implement this fix (from the motion critics, triaged): ${JSON.stringify(fix)}
Add or update unit tests for the new logic, run them and the tests of every file you touch (compressTurn and Autopilot tests must pass), npx tsc --noEmit, npm run build, and the short probe the fix names. Commit locally when the checks pass.`, { model: 'sonnet', schema: REPORT, label: `fix ${fix.id} r${r}`, phase: 'Fix' })
    const check = await agent(`Strict reviewer. Read-only in ${DIR}. Did this commit implement the fix exactly, within the rules (no don't-retry items, assists with their own ledger, compressTurn and Autopilot tests passing, typecheck clean), without weakening tests? Run the tests yourself. Fix: ${JSON.stringify(fix)}. Builder report: ${JSON.stringify(built).slice(0, 8000)}`, { model: 'opus', schema: { type: 'object', properties: { ok: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['ok', 'issues'] }, label: `check ${fix.id} r${r}`, phase: 'Fix' })
    if (!check || !check.ok) {
      log(`fix ${fix.id}: Sonnet failed review, escalating to Opus`)
      built = await agent(`${RULES}

Implement this fix: ${JSON.stringify(fix)}. A previous attempt failed review: ${JSON.stringify(check)}. Its report: ${JSON.stringify(built).slice(0, 6000)}. Fix forward with new commits (or git revert its commits if the approach is wrong), run the checks, commit.`, { model: 'opus', schema: REPORT, label: `fix ${fix.id} r${r} [opus]`, phase: 'Fix' })
    }
    rounds[rounds.length - 1].fixes = (rounds[rounds.length - 1].fixes || []).concat([{ fix, built, check }])
  }
}

const pr = await agent(`${RULES}

Draft the description of the steps 3-5 PR (pumping, bottom turn and projection, cutback), stacked on #106 (base branch claude/wave-pool), in the style of #100's and #106's descriptions (gh pr view 106 --repo vice7770/surfing-game). Cover: what changed and why (physics first; any assist and its ledger), the probe numbers before and after, what the owner should playtest, the checks run (only the allowed ones), and open questions. No local paths. End with the line: 🤖 Generated with [Claude Code](https://claude.com/claude-code)
Write it to ${MS}/pr-body.md and give a one-line title in summary. Work from: the orientation ${JSON.stringify(orient).slice(0, 4000)}, the cutback ${JSON.stringify(cutback).slice(0, 6000)}, pumping ${JSON.stringify(pumping).slice(0, 6000)}, and the critic rounds' scores ${JSON.stringify(rounds.map((x) => ({ round: x.round, critics: (x.critics || []).map((c) => ({ verdict: c.verdict, scores: c.scores.map((s) => s.score) })) })))}.`, { model: 'sonnet', schema: REPORT, label: 'PR description', phase: 'PR' })

return { orient, cutback, pumping, rounds, pr }
