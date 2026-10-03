export const meta = {
  name: 'merge-everything-into-wave-pool',
  description: "Merge the remaining work (#105's last commit, #102's fix round, the front-split link, movement steps 3-5 so far) into the owner's local claude/wave-pool test branch, review the conflict resolutions, run the checks and a headless smoke test",
  phases: [
    { title: 'Merge', detail: 'Opus integrator, snapshot hashes, conflicts kept on both sides' },
    { title: 'Review', detail: 'Opus review of every resolution + checks' },
    { title: 'Fix', detail: 'one more pass on blocking issues' },
  ],
}

const SP = '<SCRATCH>'
const MAIN = '<OWNER_CHECKOUT>'
const CLOG = '<WORKTREES>/advisor/docs/research/water-physics/consult-log.md'
const SNAP = args

const REPORT = { type: 'object', properties: {
  summary: { type: 'string' }, merges: { type: 'array', items: { type: 'string' } },
  conflicts: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, sides: { type: 'string' }, resolution: { type: 'string' } }, required: ['file', 'sides', 'resolution'] } },
  checks: { type: 'array', items: { type: 'string' } }, smoke: { type: 'array', items: { type: 'string' } }, notes: { type: 'array', items: { type: 'string' } },
}, required: ['summary', 'merges', 'conflicts', 'checks'] }
const VERIFY = { type: 'object', properties: { ok: { type: 'boolean' }, blocking: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['ok', 'blocking', 'issues'] }

const TASK = `Merge the remaining work into the owner's local test branch for the Breakline surf game.
Work in ${MAIN} (the owner's checkout, on claude/wave-pool, which already holds every pushed PR merged locally: #82, #94, #100, #106, the Padang stack with #107 and #102@822a8a5, #108, #109, and the movement work at d6a7c55). A Vite dev server is running there on port 5173 for the owner. Leave it running. The owner is testing in the browser, so keep the tree compiling between merges if you can.
NEVER push, never touch GitHub PRs, never modify the lane branches you merge from (they live in worktrees under <WORKTREES>/ where other agents keep working). Merge EXACTLY these snapshot commits, not the branches' moving tips:
${JSON.stringify(SNAP, null, 1)}
Order: (1) #105's tip, (2) the front-split link, (3) #102's fix round, (4) the movement steps. Each with git merge --no-ff -m "Merge <what> (<hash>) for the owner's test build".
Conflicts: keep BOTH sides' intent. Read each side's commits (git log -p) and the consult-log rulings they implement (${CLOG}, read-only). #102's fix round implements the advisor's 2026-10-03 ruling (the anchor on the slice's ray, smoothstep to 0.8 T, the pace for every thrown point with no z blend, the 2 T exit, the pour at the crash): where it conflicts with the integration fixes already on this branch (catch report, barrel tests), keep the fix round's behaviour plus the integration fixes' per-spot case loading. The front link is behind FrontOptions.clockLink, off unless its branch's last commits turned it on for Padang. Keep whatever its branch says.
After each merge: npx tsc --noEmit. At the end: npm run build; npx vitest run src/wave/barrel src/scene/barrel src/scene/waterLooks.test.ts src/wave/PlungingLip.test.ts src/wave/Overturn.test.ts src/audio src/dev/Autopilot.test.ts, plus the movement tests that exist (search src for compressTurn*.test.ts and the files the movement commits touched). Never the whole suite or the SurfZoneSimulation/SurfZoneRunner suites. Fix any failure the merges caused with a commit (machine identity; last line Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>) and explain it.
Smoke test, headless only (never a visible window): node ${SP}/harness/shoot.mjs (read its header), using the RUNNING server, so --url=http://localhost:5173/ and no --serve. Use --cdp=9471 --recv=5371 so you don't collide. Take the menu (page mode, --wait=15000, out ${SP}/testbuild2/menu.png) and a Padang sheet (--spot=padang, shots curl-close:rich:midday, out ${SP}/testbuild2/padang). Look at them.
Return: merges with hashes, every conflict and its resolution, the checks, the smoke images, and notes for the owner (what each new piece changes when playing).`

let res = await agent(TASK, { model: 'opus', schema: REPORT, label: 'merge into claude/wave-pool', phase: 'Merge' })
const reviewPrompt = (r) => `Skeptical reviewer, read-only in ${MAIN} (branch claude/wave-pool, local). Default to issues unless you can confirm each point. Set blocking=true only for a resolution that drops a side's intended behaviour, a failing check, or a merged hash that isn't the snapshot. ok=true only with no issues.
Snapshot: ${JSON.stringify(SNAP)}. Report: ${JSON.stringify(r).slice(0, 12000)}
Check: each snapshot hash is an ancestor of HEAD (git merge-base --is-ancestor); each conflict resolution keeps both sides' intent (compare git show <merge>^1:<file>, <merge>^2:<file> and the result; read the rulings in ${CLOG}); no conflict markers (git grep -n '<<<<<<<'); npx tsc --noEmit clean; the targeted tests pass (run them yourself); nothing was pushed (git status -sb shows no upstream change except 'ahead').`
let rev = res ? await agent(reviewPrompt(res), { model: 'opus', schema: VERIFY, label: 'review merges', phase: 'Review' }) : { ok: false, blocking: true, issues: ['merge agent died'] }
if (rev && rev.blocking) {
  log('blocking review issues; one more pass')
  res = await agent(`${TASK}\n\nThe merges are done (see the branch history). A review found blocking issues: ${JSON.stringify(rev)}. Fix them with new commits on claude/wave-pool (don't rewrite history), rerun the checks, and report.`, { model: 'opus', schema: REPORT, label: 'fix merges', phase: 'Fix' })
  rev = res ? await agent(reviewPrompt(res), { model: 'opus', schema: VERIFY, label: 're-review merges', phase: 'Review' }) : rev
}
return { res, rev }
