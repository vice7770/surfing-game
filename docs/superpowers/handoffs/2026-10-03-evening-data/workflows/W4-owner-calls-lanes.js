export const meta = {
  name: 'owner-calls-lanes',
  description: "The owner's 2026-10-03 calls: the Reef's lip jet raised and measured, S1 recordings generated with ElevenLabs and judged, the Blenkinsopp thesis read for the Reef's void; each with harsh Opus review",
  phases: [
    { title: 'Reef jet', detail: 'raise the Reef ask and source cap, measure before/after, water sheets' },
    { title: 'Sounds', detail: 'ElevenLabs candidates per sound id, processed to AAC, manifest + ASSETS' },
    { title: 'Thesis', detail: 'Blenkinsopp thesis read locally; the Reef void sourced' },
    { title: 'Critique', detail: 'harsh Opus critics: Reef lip look, sound spectrograms' },
    { title: 'Verify', detail: 'Opus review of code, numbers and docs' },
  ],
}

const SP = '<SCRATCH>'
const WT = '<WORKTREES>'
const ADV = WT + '/advisor'
const CLOG = ADV + '/docs/research/water-physics/consult-log.md'
const HARNESS = SP + '/harness/shoot.mjs'

const RULES = (dir, branch, scratch) => `Project: the Breakline surf game, repo vice7770/surfing-game (public). You work ONLY in the git worktree ${dir} (branch ${branch}, from main). Never touch <OWNER_CHECKOUT> (the owner's checkout; a dev server runs there) or any other worktree under ${WT}.
The owner's hard rules: never merge, push, or open/edit PRs (local commits only; the main session verifies and pushes); the repo is public (no local paths or user names in committed files or messages; quote sources only in short attributed phrases); every value sourced or marked provisional; Classic stays byte-identical except where the swept barrel is drawn; scratch files in ${scratch}/ (create it), never in the repo; commits in the repo's conventional style with the last line Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>; checks are npx tsc --noEmit, npm run build and npx vitest run <specific files>, never the whole suite; commands longer than about 9 minutes run with nohup in the background and are polled.`

const REPORT = { type: 'object', properties: {
  summary: { type: 'string' },
  commits: { type: 'array', items: { type: 'string' } },
  files: { type: 'array', items: { type: 'string' } },
  numbers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, values: { type: 'string' } }, required: ['name', 'values'] } },
  problems: { type: 'string' },
}, required: ['summary', 'commits', 'files', 'numbers'] }
const VERIFY = { type: 'object', properties: { ok: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } }, evidence: { type: 'string' } }, required: ['ok', 'issues', 'evidence'] }
const CRITIC = { type: 'object', properties: {
  scores: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, score: { type: 'number' }, evidence: { type: 'string' } }, required: ['item', 'score', 'evidence'] } },
  verdict: { type: 'string', enum: ['wowed', 'not-yet'] },
  defects: { type: 'array', items: { type: 'object', properties: { target: { type: 'string' }, severity: { type: 'string' }, what: { type: 'string' }, fix: { type: 'string' } }, required: ['target', 'severity', 'what', 'fix'] } },
}, required: ['scores', 'verdict', 'defects'] }

async function reviewed(label, phase, prompt, reviewPrompt) {
  let built = await agent(prompt, { model: 'sonnet', schema: REPORT, label: `${label} [sonnet]`, phase })
  let check = built ? await agent(reviewPrompt(built), { model: 'opus', schema: VERIFY, label: `verify ${label}`, phase: 'Verify' }) : { ok: false, issues: ['agent died'], evidence: '' }
  if (!check || !check.ok) {
    log(`${label}: Sonnet failed review, escalating to Opus`)
    built = await agent(`${prompt}\n\nA previous attempt failed review. Its report: ${JSON.stringify(built).slice(0, 6000)}. The review: ${JSON.stringify(check)}. Fix forward with new commits.`, { model: 'opus', schema: REPORT, label: `${label} [opus]`, phase })
    check = built ? await agent(reviewPrompt(built), { model: 'opus', schema: VERIFY, label: `re-verify ${label}`, phase: 'Verify' }) : { ok: false, issues: ['agent died'], evidence: '' }
  }
  return { built, check }
}

// ---------- Lane 1: the Reef's lip jet ----------
const REEF_DIR = WT + '/reefjet'
const REEF_SP = SP + '/reefjet'
const reefLane = (async () => {
  const base = await agent(`${RULES(REEF_DIR, 'claude/reef-jet-ask', REEF_SP)}
Capture the Reef BEFORE any change, headless: node ${HARNESS} sheet --serve=${REEF_DIR} --port=5185 --out=${REEF_SP}/before --spot=reef --shots=tube-beside:rich:midday,tube-shoulder:rich:sunset,tube-inside:rich:midday,face:rich:midday,tube-beside:classic:midday (if a name is missing, read status.txt and use the closest). Return the PNG paths in files.`, { model: 'sonnet', schema: REPORT, label: 'Reef before shots', phase: 'Reef jet' })
  const change = await reviewed('Reef jet raise', 'Reef jet', `${RULES(REEF_DIR, 'claude/reef-jet-ask', REEF_SP)}

The owner decided on 2026-10-03 (the advisor's recommendation): raise the Reef's lip-jet ask from 0.47 H^2 to about 0.55-0.6 H^2, from the periodic Basilisk runs (consult log 2026-09-30: jet 0.55-0.62 H^2 per breaking height on the Reef's ledge), and the jet source's cap to about 0.3 on the Reef. Read the consult-log rows about the lip-jet source and the Reef's ask in ${CLOG} (2026-09-30: "Predictor gate (lip-jet source ...)", "Go ahead with the periodic wave runs", "Jet half-height taper") and the notes they cite (${ADV}/docs/research/water-physics/notes/round6-tube-profiles/periodic-runs.md and data/).
1. Find where the Reef's jet ask (0.47 H^2, the provisional slab value) and the source cap (SOURCE_SHARE = 0.2 in src/wave/PlungingLip.ts) live; make both per-spot so ONLY the Reef changes. Pick the ask from the periodic runs' numbers (cite the file and say how you chose it, e.g. their median per breaking height) and the cap 0.3; mark them provisional where the source says so. Other spots byte-identical in behaviour.
2. Before and after (one run at a time), measure what the predictor-gate rows measured: find the probe or report they used (search src/wave/probes and scripts for the lip-jet source measurement: unplaced momentum, empty and starved throws, thrown vs asked, jet counts, SurfMeter heights, d eta/dz). Run the Reef Small, Medium and Big, seeds 1-2, 110 s as those rows did. Tabulate before/after.
3. Unit tests for the per-spot values (other spots unchanged), npx tsc --noEmit, npm run build, the lip tests (src/wave/PlungingLip*.test.ts and what you touch). Commit (fix(lip): ...).
4. Capture AFTER with the same harness command into ${REEF_SP}/after. Put before/after PNG paths in files.`, (b) => `Skeptical reviewer, read-only in ${REEF_DIR}. Default to ok=false unless confirmed. The owner's decision: the Reef's jet ask from 0.47 to about 0.55-0.6 H^2 (from the periodic Basilisk runs) and the source cap to about 0.3, on the Reef only. Report: ${JSON.stringify(b).slice(0, 9000)}. Check: only the Reef changes (read the diff; other spots' values and code paths identical); the chosen values are cited to the periodic runs' files and match them; the before/after numbers match raw logs and used the stated seeds and durations; tests meaningful and passing (run them); typecheck clean; commits clean (footer, no local paths).`)
  const files = ((base && base.files) || []).concat((change.built && change.built.files) || []).filter((f) => /\.png$/.test(f))
  const critic = files.length ? await agent(`You are a principal technical art director who shipped AAA water, reviewing a WebGPU surfing game's reef break (a Teahupo'o-like slab) before and after a physics change that raised the lip jet's volume. Be brutally harsh; compare with shipped AAA games and real Teahupo'o photographs. Open every image (before/ and after/ folders): ${files.join(', ')}
Score 1-10: (1) the lip's thickness and throw read as a heavy slab lip, (2) the jet's connection to the face, (3) the tube's cavity read, (4) artefacts introduced or removed, (5) overall wow vs production. Say clearly whether AFTER is better, worse or the same as BEFORE, and list defects with fixes. Only "wowed" if all items are 9+.`, { model: 'opus', schema: CRITIC, label: 'Reef jet critic', phase: 'Critique' }) : null
  const ruling = await agent(`You are "Water physics research", the wave-shape advisor (read ${ADV}/.claude/agents/water-physics.md and the newest 25 rows of ${CLOG}; read-only). Rule on the Reef jet raise the owner approved: the builder's change and numbers ${JSON.stringify(change.built).slice(0, 9000)} (review: ${JSON.stringify(change.check)}), and the critic ${JSON.stringify(critic).slice(0, 4000)}. Does it meet the intent (jets at the periodic runs' size, no new starved or empty throws, stability held)? What should follow? Draft one consult-log row in the newest rows' style.`, { model: 'opus', label: 'advisor: Reef jet', phase: 'Verify' })
  return { base, change, critic, ruling }
})()

// ---------- Lane 2: S1 recordings with ElevenLabs ----------
const SND_DIR = WT + '/sound'
const SND_SP = SP + '/sound'
const soundLane = (async () => {
  const rounds = []
  let feedback = ''
  for (let r = 1; r <= 3; r += 1) {
    const made = await reviewed(`sounds r${r}`, 'Sounds', `${RULES(SND_DIR, 'claude/s1-recordings', SND_SP)}

The S1 sound work's Task 8 (docs/superpowers/plans/2026-09-26-s1-sound.md; ROADMAP "P1 · Sound (S1)", its Open item) waited for CC0 downloads. The owner decided on 2026-10-03 to generate the recordings with ElevenLabs instead. Load the ElevenLabs MCP tools with ToolSearch (query "elevenlabs sound effects"; check_subscription first and report the credits) and use text_to_sound_effects.
Sound ids to record (public/assets/audio/sounds.json), as the ROADMAP's candidate list: roar (surf roar where the water breaks, a seamless loop), distant (distant surf, a seamless loop), bubbles (underwater, a seamless loop), lipJet and lipRoller (lip crashes: a heavy plunging lip landing, and a smaller roller's crash; one-shots), paddle (a hand's paddle stroke splash; one-shot), plunge (a wipeout plunge into the water; one-shot). Wind, rush, rail, popUp, click and chime stay synthesised.
${r === 1 ? 'Make 2 candidates per id.' : `This is round ${r}: regenerate ONLY the candidates the critic failed, using its notes: ${feedback}`}
Prompts: realistic field-recording descriptions (real ocean surf, no music, no voices, no synthetic tones), durations suited to each (loops 8-12 s; one-shots 1-3 s). Keep the raw files in ${SND_SP}/raw/. Process each with ffmpeg: trim silence, loudness-normalise (EBU R128, loops about -23 LUFS, one-shots peak -1 dBFS), make loops seamless (crossfade the end into the start and check the boundary), then convert to AAC .m4a with afconvert -f m4af -d aac -b 128000 into public/assets/audio/.
Wire them in: add each as a candidate in sounds.json (choose the best per id), and extend src/audio/soundManifest.ts so a candidate's licence can record a generated source (today it only accepts 'CC0': parseManifest drops anything else, so add a value such as 'generated' with a test). Update docs/ASSETS.md (a Sounds section: each file, "generated with ElevenLabs Sound Effects on 2026-10-03", its prompt, used under the owner's ElevenLabs plan) and the ROADMAP's S1 record (the owner's 2026-10-03 decision: generated recordings instead of CC0 downloads). Keep every sound's synthesised fallback. Run npx vitest run src/audio, npx tsc --noEmit, npm run build. For each file also render a spectrogram and waveform PNG into ${SND_SP}/r${r}/ (ffmpeg showspectrumpic and showwavespic) and the loudness (ebur128) and loop-boundary numbers. Commit (feat: ...). Put the PNG paths in files.`, (b) => `Skeptical reviewer, read-only in ${SND_DIR}. Default to ok=false unless confirmed. Report: ${JSON.stringify(b).slice(0, 9000)}. Check: every listed sound id has its candidates in public/assets/audio/ as valid AAC m4a (ffprobe them) and in sounds.json; parseManifest accepts the generated licence and still drops invalid entries (tests); the synthesised fallbacks are untouched; docs/ASSETS.md and the ROADMAP record the source and the owner's decision without local paths; tests pass (run npx vitest run src/audio); typecheck clean; commits clean.`)
    const pngs = ((made.built && made.built.files) || []).filter((f) => /\.png$/.test(f))
    const critic = await agent(`You are a supervising sound editor who cut surf documentaries and the sound of a shipped AAA surfing game. You cannot listen, so judge from spectrograms, waveforms and numbers, harshly, as you would a library you'd ship. Open every image: ${pngs.join(', ')}. The numbers: ${JSON.stringify((made.built && made.built.numbers) || []).slice(0, 6000)}.
For each sound id (roar, distant, bubbles, lipJet, lipRoller, paddle, plunge) judge 1-10: broadband ocean texture without tonal or synthetic artefacts (no pitched lines, no AI warble, no musical content); a believable envelope (a crash's sharp onset and long decay; a loop with no swell or gap at its boundary); loudness and dynamics fit the role; variety between candidates. Verdict "wowed" only if every id scores 9 or more. In defects, give per failing candidate a precise regeneration note (prompt changes, duration, processing). The owner's listening playtest has the last word on taste.`, { model: 'opus', schema: CRITIC, label: `sound critic r${r}`, phase: 'Critique' })
    rounds.push({ round: r, made, critic })
    if (critic && critic.verdict === 'wowed') break
    feedback = JSON.stringify(critic && critic.defects).slice(0, 6000)
    if (r === 3) log('sound lane: round cap (3) reached; the owner listens next')
  }
  return rounds
})()

// ---------- Lane 3: the Blenkinsopp thesis ----------
const thesisLane = agent(`You are "Water physics research", the wave-shape advisor for the Breakline surf game (read ${ADV}/.claude/agents/water-physics.md, ${ADV}/docs/research/water-physics/ONBOARDING.md and README.md, and the newest 25 rows of ${CLOG}).
The owner approved on 2026-10-03 downloading the Blenkinsopp thesis (about 9 MB): C. E. Blenkinsopp's PhD thesis on breaking waves over a submerged reef/slope (void fraction and the air cavity under the jet, with J. R. Chaplin). Why: the Reef's void area is provisional (0.43 H^2, Pick & Feddersen's steepest fit) because Blenkinsopp & Chaplin's cavity-size numbers were not reachable (docs/research/teahupoo-reef-sources.md in ${ADV}; notes/round1-breaking-foam-tubes/barrel-physics.md cites A_O/H^2 0.05-0.35 and W/L 0.43-0.67 from their 2008 paper, and L/W 1.46-2.28).
1. Find the thesis's open-access copy (a university repository) and download only that one PDF to ${SP}/thesis/. Never get around a login, bot check or paywall: if it isn't openly available, stop and say so.
2. Extract the text locally (pdftotext if installed; else a small Swift PDFKit script or Python with zlib, per the onboarding's method notes) and read the chapters on the cavity and the jet. Collect every cavity-size measurement (area, width, length, aspect, against relative crest submergence, slope, period, H) with its conditions and page numbers, and the jet's throw speed if given.
3. Compare with the game's Reef: the provisional 0.43 H^2 void, L/W 1.42 and 23 deg tube, the 0.5 H lip (the owner kept these), and the ledge's submergence at each tide and size. Say which values the thesis sources, which it contradicts, and what you recommend; findings go to the owner first, so recommend, don't change rulings yourself.
4. Write a one-page note in ${ADV}/docs/research/water-physics/notes/round7-blenkinsopp/ (short attributed phrases only, no long quotes, no local paths, do NOT commit the PDF), add the thesis to sources.md, and commit locally on claude/water-physics-advisor-local (docs: ...), with the last line Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>. Don't push.
Return: the numbers found (with pages), your recommendation, and a draft consult-log row.`, { model: 'opus', label: 'Blenkinsopp thesis', phase: 'Thesis' })

const [reef, sound, thesis] = await Promise.all([reefLane, soundLane, thesisLane])
return { reef, sound, thesis }
