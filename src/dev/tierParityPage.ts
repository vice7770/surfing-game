/**
 * Dev only: the GPU check page's tier modes (`/gpu-check.html`).
 *
 * `?mode=lips`: the same surf zone (same seed, swell and sea) on the CPU tier
 * and the GPU tier side by side, each in its own worker as the game runs it,
 * for `&seconds=` (60) after its spin-up. Per minute: lip throws and landings,
 * tubes open, splash-ups, spray, mist and foam-ball sprites, and plunge-zone
 * cells held; a tier that shows none of something the other shows is flagged.
 * `&cases=` picks from PARITY_CASES (default: every spot at the Wave Lab's
 * default swell, and the Reef's Practice and Big swells), `&seed=` (1) and
 * `&components=` (the GPU tier's 64) the sea.
 *
 * `?mode=probes`: the Reef's risky cases (its CI stability probes, and the
 * Big swell at game size) on both tiers: the fastest water, where and when,
 * and any water that broke. `&cases=` picks from PROBE_CASES.
 *
 * `&tiers=gpu` (or `cpu`) runs one tier only. Results land in `window.gpuCheck`,
 * and with `&receiver=<url>` (the ride recorder's receiver) each case is posted
 * as JSON as it finishes, so long runs outlive the page.
 */
import { GPU_TIER_COMPONENTS } from '../game/PhysicalMode';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { DEFAULT_PARITY, DEFAULT_PROBES, PARITY_CASES, PROBE_CASES, describeConfig, parityCase, type TierCase } from './tierCases';
import { PROBE_DEPTH, compareTiers, perMinute, type TierActivity, type TierFinding } from './tierParity';
import type { TierRunReply, TierRunRequest } from './tierParityWorker';

export interface PageLog {
  say(line: string): void;
  /** A line kept under the log and replaced on each call: the runs' progress. */
  live(text: string): void;
}

type Tier = 'cpu' | 'gpu';
type Done = Extract<TierRunReply, { type: 'done' }>;
type Outcome = Done | Extract<TierRunReply, { type: 'failed' }>;

function runTier(request: TierRunRequest, onProgress: (seconds: number, compute: Tier) => void): Promise<Outcome> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./tierParityWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<TierRunReply>) => {
      if (data.type === 'progress') {
        onProgress(data.seconds, data.compute);
        return;
      }
      worker.terminate();
      resolve(data);
    };
    worker.onerror = (event) => {
      worker.terminate();
      resolve({ type: 'failed', message: event.message || 'the worker failed' });
    };
    worker.postMessage(request);
  });
}

export interface CaseResult {
  name: string;
  config: SurfZoneConfig;
  cpu?: Outcome;
  gpu?: Outcome;
  findings: TierFinding[];
}

/** Both tiers of one case at once, each in its own worker. */
async function runCase(log: PageLog, tierCase: TierCase, tiers: readonly Tier[]): Promise<CaseResult> {
  const progress: Record<Tier, string> = { cpu: tiers.includes('cpu') ? 'spinning up' : '—', gpu: tiers.includes('gpu') ? 'spinning up' : '—' };
  const show = () => log.live(`${tierCase.name}: CPU ${progress.cpu} · GPU ${progress.gpu}`);
  show();
  const run = (tier: Tier) => runTier(
    { config: tierCase.config, tier, seconds: tierCase.seconds, shape: tierCase.shape, step: tierCase.step },
    (seconds, compute) => {
      progress[tier] = `${seconds.toFixed(0)}/${tierCase.seconds} s${compute !== tier ? ` (on the ${compute.toUpperCase()})` : ''}`;
      show();
    },
  ).then((outcome) => {
    progress[tier] = outcome.type === 'done' ? 'done' : 'failed';
    show();
    return outcome;
  });
  const outcomes = await Promise.all(tiers.map((tier) => run(tier)));
  const byTier: Partial<Record<Tier, Outcome>> = Object.fromEntries(tiers.map((tier, k) => [tier, outcomes[k]]));
  const findings: TierFinding[] = [];
  const cpuDone = byTier.cpu?.type === 'done' ? byTier.cpu : undefined;
  const gpuDone = byTier.gpu?.type === 'done' ? byTier.gpu : undefined;
  if (cpuDone && gpuDone) findings.push(...compareTiers(cpuDone.activity, gpuDone.activity));
  if (gpuDone && (gpuDone.compute !== 'gpu' || gpuDone.fellBackAt !== undefined)) {
    findings.push({ kind: 'silent', metric: 'device', detail: `the GPU tier fell back to the CPU at t ${gpuDone.fellBackAt?.toFixed(2) ?? '?'} s` });
  }
  for (const tier of tiers) {
    const outcome = byTier[tier];
    if (outcome?.type === 'failed') findings.push({ kind: 'broken', metric: 'run', detail: `${tier.toUpperCase()}: ${outcome.message.split('\n')[0]}` });
    if (outcome?.type === 'done' && tierCase.guard !== undefined && outcome.activity.fastest.speed >= tierCase.guard) {
      findings.push({ kind: 'fast', metric: 'guard', detail: `${tier.toUpperCase()} reached ${outcome.activity.fastest.speed.toFixed(1)} m/s, at or over the probe's ${tierCase.guard} m/s` });
    }
  }
  return { name: tierCase.name, config: tierCase.config, cpu: byTier.cpu, gpu: byTier.gpu, findings };
}

/** The side-by-side table of one case. */
function table(log: PageLog, result: CaseResult, tierCase: TierCase): void {
  const rows: [string, (done: Done) => string][] = [
    ['lip throws /min', (d) => perMinute(d.activity.throws, d.activity.seconds).toFixed(1)],
    ['rollers /min', (d) => perMinute(d.activity.rollers, d.activity.seconds).toFixed(1)],
    ['jet landings /min', (d) => perMinute(d.activity.jetLandings, d.activity.seconds).toFixed(0)],
    ['splash-up landings /min', (d) => perMinute(d.activity.splashLandings, d.activity.seconds).toFixed(0)],
    ['tubes open (mean · peak)', (d) => `${mean(d.activity, 'tubeSeconds')} · ${d.activity.tubesPeak}`],
    ['spray in the air (mean)', (d) => mean(d.activity, 'spraySeconds')],
    ['mist in the air (mean)', (d) => mean(d.activity, 'mistSeconds')],
    ['tube spray + mist (mean)', (d) => mean(d.activity, 'tubeSpraySeconds')],
    ['foam balls (mean · peak)', (d) => `${mean(d.activity, 'foamBallSeconds')} · ${d.activity.foamBallsPeak}`],
    ['plunge cells (mean · peak)', (d) => `${mean(d.activity, 'plungeCellSeconds')} · ${d.activity.plungePeak}`],
    [`fastest water > ${PROBE_DEPTH} m, m/s`, (d) => d.activity.fastest.speed.toFixed(1)],
    ['  where (x, z), when (t)', (d) => `${d.activity.fastest.x.toFixed(1)}, ${d.activity.fastest.z.toFixed(1)}, ${d.activity.fastest.time.toFixed(2)} s`],
    ['  its depth, m', (d) => d.activity.fastest.depth.toFixed(2)],
    ['broken steps', (d) => `${d.activity.brokenSteps}${d.activity.firstBroken !== undefined ? ` (from ${d.activity.firstBroken.toFixed(2)} s)` : ''}`],
    ['smallest stable step, ms', (d) => (d.activity.smallestStep * 1000).toFixed(2)],
    ['stepped on', (d) => `${d.compute.toUpperCase()}${d.fellBackAt !== undefined ? ` (fell back at ${d.fellBackAt.toFixed(2)} s)` : ''}`],
    ['cells', (d) => d.cells.toLocaleString('en-US')],
    ['wall time: spin-up + run, s', (d) => `${d.spinUpSeconds.toFixed(0)} + ${(d.wallSeconds - d.spinUpSeconds).toFixed(0)}`],
  ];
  const cell = (outcome: Outcome | undefined, value: (done: Done) => string) => (outcome?.type === 'done' ? value(outcome) : outcome ? 'failed' : '—');
  const width = 30;
  const columns = 26;
  log.say(`\n${result.name}: ${describeConfig(result.config)}; ${tierCase.seconds} s after the spin-up, ${tierCase.shape === 'game' ? 'the game\'s runner' : 'the bare surf zone'} at ${(tierCase.step * 1000).toFixed(1)} ms steps`);
  log.say(`${''.padEnd(width)}${'CPU'.padEnd(columns)}GPU`);
  for (const [label, value] of rows) log.say(`${label.padEnd(width)}${cell(result.cpu, value).padEnd(columns)}${cell(result.gpu, value)}`);
  log.say(result.findings.length === 0 ? 'Findings: none.' : `Findings:\n${result.findings.map((finding) => `  ${finding.kind.toUpperCase()} ${finding.metric}: ${finding.detail}`).join('\n')}`);
}

const mean = (activity: TierActivity, key: 'tubeSeconds' | 'spraySeconds' | 'mistSeconds' | 'tubeSpraySeconds' | 'foamBallSeconds' | 'plungeCellSeconds') =>
  (activity.seconds > 0 ? activity[key] / activity.seconds : 0).toFixed(1);

function tiersFrom(params: URLSearchParams): Tier[] {
  const asked = params.get('tiers');
  return asked === 'gpu' || asked === 'cpu' ? [asked] : ['cpu', 'gpu'];
}

/** Post a finished case to the receiver (`&receiver=`), when there is one. */
async function post(receiver: string | null, name: string, body: unknown): Promise<void> {
  if (!receiver) return;
  await fetch(`${receiver}/upload?name=${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify(body, null, 1) }).catch(() => undefined);
}

async function runCases(log: PageLog, mode: string, cases: TierCase[], tiers: Tier[], receiver: string | null): Promise<void> {
  const results: CaseResult[] = [];
  (window as unknown as { gpuCheck: unknown }).gpuCheck = { mode, done: false, results };
  for (const tierCase of cases) {
    const result = await runCase(log, tierCase, tiers);
    results.push(result);
    table(log, result, tierCase);
    await post(receiver, `gpu-check-${mode}-${tierCase.name}.json`, { ...result, seconds: tierCase.seconds, shape: tierCase.shape, step: tierCase.step });
  }
  log.live('');
  log.say(`\nSummary (${mode}):`);
  for (const result of results) {
    log.say(`  ${result.name.padEnd(16)}${result.findings.length === 0 ? 'ok' : result.findings.map((finding) => `${finding.kind} ${finding.metric}`).join(', ')}`);
  }
  (window as unknown as { gpuCheck: unknown }).gpuCheck = { mode, done: true, results };
  log.say('DONE');
}

/** `?mode=lips`: lip, tube and whitewater activity on both tiers. */
export async function lipParity(log: PageLog, params: URLSearchParams): Promise<void> {
  const names = (params.get('cases') ?? DEFAULT_PARITY.join(',')).split(',').filter(Boolean);
  const seconds = Number(params.get('seconds') ?? 60);
  const seed = Number(params.get('seed') ?? 1);
  const components = Number(params.get('components') ?? GPU_TIER_COMPONENTS);
  const cases: TierCase[] = [];
  for (const name of names) {
    const tierCase = parityCase(name, seed, components, seconds);
    if (!tierCase) {
      log.say(`Unknown case "${name}": pick from ${Object.keys(PARITY_CASES).join(', ')}.`);
      continue;
    }
    cases.push(tierCase);
  }
  log.say(`Lip, tube and whitewater parity: ${cases.length} cases, ${seconds} s each on ${tiersFrom(params).map((tier) => tier.toUpperCase()).join(' and ')}.`);
  await runCases(log, 'lips', cases, tiersFrom(params), params.get('receiver'));
}

/** `?mode=probes`: the Reef's risky cases on both tiers. */
export async function probeParity(log: PageLog, params: URLSearchParams): Promise<void> {
  const names = (params.get('cases') ?? DEFAULT_PROBES.join(',')).split(',').filter(Boolean);
  const cases: TierCase[] = [];
  for (const name of names) {
    const tierCase = PROBE_CASES[name]?.();
    if (!tierCase) {
      log.say(`Unknown case "${name}": pick from ${Object.keys(PROBE_CASES).join(', ')}.`);
      continue;
    }
    if (params.has('seconds')) tierCase.seconds = Number(params.get('seconds'));
    cases.push(tierCase);
  }
  log.say(`The Reef's stability probes: ${cases.length} cases on ${tiersFrom(params).map((tier) => tier.toUpperCase()).join(' and ')}.`);
  await runCases(log, 'probes', cases, tiersFrom(params), params.get('receiver'));
}
