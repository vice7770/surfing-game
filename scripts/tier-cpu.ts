/**
 * The CPU half of the GPU check page's tier modes, in Node (dev only): the cases of `/gpu-check.html?mode=lips`
 * and `?mode=probes` (src/dev/tierCases.ts), stepped on the CPU and recorded step by step by the same TierRecorder,
 * so the CPU side can run on a faster machine than the one with the GPU, and under Node's arithmetic as well as
 * Chrome's. Prints one row per case; `--out` writes the recordings as JSON. Reported, not asserted.
 *
 *   npm run report:tier-cpu -- --mode probes --cases ci-big,ci-edge
 *   npm run report:tier-cpu -- --mode lips --cases reef-big --seconds 60 --seed 1 --components 64 --out tier-cpu.json
 */
import { writeFileSync } from 'node:fs';
import { GPU_TIER_COMPONENTS } from '../src/game/PhysicalMode';
import { DEFAULT_PARITY, DEFAULT_PROBES, PROBE_CASES, describeConfig, parityCase, type TierCase } from '../src/dev/tierCases';
import { TierRecorder, perMinute, type TierActivity } from '../src/dev/tierParity';
import { SurfZoneRunner } from '../src/wave/SurfZoneRunner';
import { SurfZoneSimulation } from '../src/wave/SurfZoneSimulation';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const mode = option('mode') === 'lips' ? 'lips' : 'probes';
const names = option('cases')?.split(',') ?? (mode === 'lips' ? DEFAULT_PARITY : DEFAULT_PROBES);
const seconds = option('seconds');
const seed = Number(option('seed') ?? 1);
const components = Number(option('components') ?? GPU_TIER_COMPONENTS);

function caseNamed(name: string): TierCase | undefined {
  if (mode === 'lips') return parityCase(name, seed, components, Number(seconds ?? 60));
  const tierCase = PROBE_CASES[name]?.();
  if (tierCase && seconds) tierCase.seconds = Number(seconds);
  return tierCase;
}

/** One case on the CPU, as the page's CPU worker runs it: spun up on the CPU, then recorded every step. */
function run(tierCase: TierCase): { activity: TierActivity; cells: number; spinUpSeconds: number; wallSeconds: number } {
  const started = performance.now();
  let step: () => void;
  let recorder: TierRecorder;
  let cells: number;
  if (tierCase.shape === 'game') {
    const runner = new SurfZoneRunner(tierCase.config);
    recorder = new TierRecorder(runner.simulation);
    cells = runner.simulation.solver.nx * runner.simulation.solver.nz;
    step = () => {
      runner.advance(1);
      recorder.record(tierCase.step, runner.spray);
    };
  } else {
    const simulation = new SurfZoneSimulation(tierCase.config);
    recorder = new TierRecorder(simulation);
    cells = simulation.solver.nx * simulation.solver.nz;
    step = () => {
      simulation.step(tierCase.step);
      recorder.record(tierCase.step);
    };
  }
  const spinUpSeconds = (performance.now() - started) / 1000;
  for (let k = Math.round(tierCase.seconds / tierCase.step); k > 0; k -= 1) step();
  return { activity: recorder.activity, cells, spinUpSeconds, wallSeconds: (performance.now() - started) / 1000 };
}

const mean = (activity: TierActivity, total: number) => (activity.seconds > 0 ? total / activity.seconds : 0).toFixed(1);
const results: unknown[] = [];
console.log(`The CPU half of ?mode=${mode}, in Node ${process.version}`);
console.log('| Case | Throws /min | Rollers /min | Jet landings /min | Splash-up landings /min | Tubes open | Spray | Mist | Tube spray + mist | Foam balls | Plunge cells | Fastest, m/s (x, z, t s, depth m) | Broken steps | Smallest step, ms | Wall, s |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|');
for (const name of names) {
  const tierCase = caseNamed(name);
  if (!tierCase) {
    console.log(`Unknown case "${name}"`);
    continue;
  }
  const outcome = run(tierCase);
  const { activity: a } = outcome;
  const { fastest: f } = a;
  console.log(`| ${name} | ${perMinute(a.throws, a.seconds).toFixed(1)} | ${perMinute(a.rollers, a.seconds).toFixed(1)} | ${perMinute(a.jetLandings, a.seconds).toFixed(0)} | `
    + `${perMinute(a.splashLandings, a.seconds).toFixed(0)} | ${mean(a, a.tubeSeconds)} · ${a.tubesPeak} | ${mean(a, a.spraySeconds)} | ${mean(a, a.mistSeconds)} | `
    + `${mean(a, a.tubeSpraySeconds)} | ${mean(a, a.foamBallSeconds)} · ${a.foamBallsPeak} | ${mean(a, a.plungeCellSeconds)} · ${a.plungePeak} | `
    + `${f.speed.toFixed(1)} (${f.x.toFixed(1)}, ${f.z.toFixed(1)}, ${f.time.toFixed(2)}, ${f.depth.toFixed(2)}) | ${a.brokenSteps} | ${(a.smallestStep * 1000).toFixed(2)} | `
    + `${outcome.spinUpSeconds.toFixed(0)} + ${(outcome.wallSeconds - outcome.spinUpSeconds).toFixed(0)} |`);
  results.push({ name, description: describeConfig(tierCase.config), ...tierCase, ...outcome });
}
const out = option('out');
if (out) writeFileSync(out, JSON.stringify({ mode, node: process.version, results }, null, 1));
