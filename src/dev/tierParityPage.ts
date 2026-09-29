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
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, swellFor, type PhysicalSettings } from '../game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
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

interface TierCase {
  name: string;
  config: SurfZoneConfig;
  shape: TierRunRequest['shape'];
  step: number;
  seconds: number;
  /** The fastest water its CI probe allows, m/s. */
  guard?: number;
}

/** The surf zone the game builds for these settings (as PhysicalMode.start does), on a sea of `components`. */
function gameConfig(settings: PhysicalSettings, seed: number, components: number): SurfZoneConfig {
  const swell = swellFor(settings);
  return {
    spot: settings.spot, seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
    directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
    tide: settings.tide, windSpeed: settings.windSpeed, stage: 2,
    ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
    componentCount: components,
  };
}

/** A Surf screen choice at mid tide in calm air. */
const surfScreen = (spot: SpotName, swell: SwellSize) => physicalSettingsFor(spot, { swell, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
/** The Wave Lab's default swell (buoy Hs 1.4 m, Tp 10 s, from 10°) at a spot. */
const labDefault = (spot: SpotName): PhysicalSettings => ({ ...DEFAULT_PHYSICAL_SETTINGS, spot });

export const PARITY_CASES: Record<string, () => PhysicalSettings> = {
  beach: () => labDefault('beach'),
  point: () => labDefault('point'),
  reef: () => labDefault('reef'),
  canyon: () => labDefault('canyon'),
  'reef-practice': () => surfScreen('reef', 'practice'),
  'reef-big': () => surfScreen('reef', 'big'),
  'reef-small': () => surfScreen('reef', 'small'),
  'reef-medium': () => surfScreen('reef', 'medium'),
  'beach-practice': () => surfScreen('beach', 'practice'),
  'point-practice': () => surfScreen('point', 'practice'),
  'canyon-practice': () => surfScreen('canyon', 'practice'),
};
const DEFAULT_PARITY = ['beach', 'point', 'reef', 'canyon', 'reef-practice', 'reef-big'];

/** The Reef's CI stability probes (SurfZoneSimulation.test.ts, "the steep Reef holds"): the Big swell in a 40 m window, seed 3, 1/30 s steps for 45 s. */
const CI_PROBE: SurfZoneConfig = {
  spot: 'reef', seed: 3, significantHeight: 3, peakPeriod: 17, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 12, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};
const ciProbe = (name: string, overrides: Partial<SurfZoneConfig>, guard: number): TierCase => ({
  name, config: { ...CI_PROBE, ...overrides }, shape: 'probe', step: 1 / 30, seconds: 45, guard,
});
/** The Reef report's game-size probes: the Big swell on the GPU tier's sea (64 components) in the game's window, 45 s. */
const gameProbe = (name: string, overrides: Partial<SurfZoneConfig>, seconds = 45): TierCase => ({
  name, config: { ...gameConfig(surfScreen('reef', 'big'), 3, GPU_TIER_COMPONENTS), ...overrides }, shape: 'game', step: SURF_ZONE_STEP, seconds,
});

export const PROBE_CASES: Record<string, () => TierCase> = {
  'ci-big': () => ciProbe('ci-big', {}, 30),
  'ci-low': () => ciProbe('ci-low', { tide: -0.6 }, 30),
  'ci-minus': () => ciProbe('ci-minus', { directionDegrees: -25, alongShore: 60 }, 20),
  'ci-plus': () => ciProbe('ci-plus', { directionDegrees: 25, alongShore: 60 }, 20),
  'ci-lagoon': () => ciProbe('ci-lagoon', { tide: -1, alongShore: 60 }, 30),
  'ci-edge': () => ciProbe('ci-edge', { directionDegrees: 25 }, 30),
  'game-big': () => gameProbe('game-big', {}),
  'game-low': () => gameProbe('game-low', { tide: -0.6 }),
  'game-lower': () => gameProbe('game-lower', { tide: -1 }),
  'game-minus': () => gameProbe('game-minus', { directionDegrees: -25 }),
  'game-plus': () => gameProbe('game-plus', { directionDegrees: 25 }),
  // The Surf screen's Big swell at high tide (+0.6 m): the water ran away near the open −x edge offshore on both tiers at t ≈ 84 s (docs/research/gpu-tier-parity.md).
  'game-high': () => gameProbe('game-high', { tide: 0.6 }, 60),
  // The open edge's offshore peak (Hs 3 m at the edge, 18 s, tide +1, seed 3, the default sea; ~21 m/s at t ≈ 95 s on the CPU once, now a runaway at t ≈ 80 s on both tiers).
  'edge-offshore': () => gameProbe('edge-offshore', { significantHeight: 3, heightAt: 'edge', peakPeriod: 18, tide: 1, componentCount: 24 }, 100),
};
const DEFAULT_PROBES = Object.keys(PROBE_CASES);

function describeConfig(config: SurfZoneConfig): string {
  const window = config.alongShore ? `, ${config.alongShore} m window` : '';
  return `${config.spot}, Hs ${config.significantHeight} m${config.heightAt === 'edge' ? ' at the edge' : ''}, Tp ${config.peakPeriod} s, from ${config.directionDegrees}°, `
    + `s ${config.spreading.toFixed(1)}${config.bandwidth ? `, band ${config.bandwidth}` : ''}, tide ${config.tide} m, `
    + `${config.componentCount ?? 24} components, seed ${config.seed}${window}`;
}

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
    const settings = PARITY_CASES[name]?.();
    if (!settings) {
      log.say(`Unknown case "${name}": pick from ${Object.keys(PARITY_CASES).join(', ')}.`);
      continue;
    }
    cases.push({ name, config: gameConfig(settings, seed, components), shape: 'game', step: SURF_ZONE_STEP, seconds });
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
