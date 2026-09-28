/// <reference lib="webworker" />
/**
 * Dev only (`/gpu-check.html?mode=lips` and `?mode=probes`): one water tier's
 * run of a surf zone, recorded step by step (`TierRecorder`), in its own worker
 * so a hidden page's throttled timers do not slow it. The GPU tier builds warm,
 * attaches its device and spins up on it, as the game's worker does for
 * compute 'auto' (SurfZoneWorkerCore); the CPU tier spins up on the CPU.
 */
import { BoussinesqSolver } from '../wave/BoussinesqSolver';
import { GpuBoussinesq } from '../wave/gpu/GpuBoussinesq';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { TierRecorder, type TierActivity } from './tierParity';

export interface TierRunRequest {
  config: SurfZoneConfig;
  tier: 'gpu' | 'cpu';
  /** Simulated seconds recorded after the spin-up. */
  seconds: number;
  /**
   * 'game': the game's runner, stepping SURF_ZONE_STEP with its spray and bubbles (no rider);
   * 'probe': the bare surf zone stepping `step` (the Reef's CI probes step 1/30 s).
   */
  shape: 'game' | 'probe';
  step?: number;
}

export type TierRunReply =
  | { type: 'progress'; seconds: number; activity: TierActivity; compute: 'gpu' | 'cpu' }
  | {
    type: 'done'; activity: TierActivity;
    /** Where the water stepped at the end, and the solver time it fell back to the CPU at, if it did. */
    compute: 'gpu' | 'cpu'; fellBackAt?: number;
    cells: number; spinUpSeconds: number; wallSeconds: number;
  }
  | { type: 'failed'; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (reply: TierRunReply) => scope.postMessage(reply);
/** How often a run reports its progress, simulated s. */
const PROGRESS = 5;

scope.onmessage = ({ data }: MessageEvent<TierRunRequest>) => {
  run(data).catch((error: unknown) => post({ type: 'failed', message: error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error) }));
};

async function run(request: TierRunRequest): Promise<void> {
  const started = performance.now();
  const gpu = request.tier === 'gpu';
  const config: SurfZoneConfig = { ...request.config, compute: gpu ? 'auto' : 'cpu' };
  const create = (solver: BoussinesqSolver) => GpuBoussinesq.create(solver);
  let simulation: SurfZoneSimulation;
  let advance: () => Promise<void>;
  let recorder: TierRecorder;
  let dt: number;
  if (request.shape === 'game') {
    const runner = new SurfZoneRunner(config, {}, gpu ? 'warm' : 'spun-up');
    if (gpu) {
      if (!(await runner.useDevice(create))) throw new Error('No WebGPU device for this surf zone: the GPU tier would run on the CPU');
      await runner.spinUp();
    }
    simulation = runner.simulation;
    recorder = new TierRecorder(simulation);
    dt = SURF_ZONE_STEP;
    advance = async () => {
      await runner.advanceAsync(1);
      recorder.record(dt, runner.spray);
    };
  } else {
    simulation = new SurfZoneSimulation(config, gpu ? 'warm' : 'spun-up');
    if (gpu) {
      const device = simulation.solver instanceof BoussinesqSolver ? await create(simulation.solver) : undefined;
      if (!device) throw new Error('No WebGPU device for this surf zone: the GPU tier would run on the CPU');
      simulation.device = device;
      await simulation.spinUp();
    }
    recorder = new TierRecorder(simulation);
    dt = request.step ?? SURF_ZONE_STEP;
    advance = async () => {
      await simulation.stepAsync(dt);
      recorder.record(dt);
    };
  }
  const spinUpSeconds = (performance.now() - started) / 1000;
  const compute = () => (simulation.device ? 'gpu' : 'cpu') as 'gpu' | 'cpu';
  let fellBackAt: number | undefined;
  const steps = Math.round(request.seconds / dt);
  let reported = 0;
  for (let step = 1; step <= steps; step += 1) {
    await advance();
    // A failing device is dropped for the CPU without a word (SurfZoneSimulation.stepAsync): say when.
    if (gpu && fellBackAt === undefined && !simulation.device) fellBackAt = simulation.solver.time;
    const seconds = step * dt;
    if (seconds - reported >= PROGRESS - 1e-9) {
      reported = seconds;
      post({ type: 'progress', seconds, activity: recorder.activity, compute: compute() });
    }
  }
  post({
    type: 'done', activity: recorder.activity, compute: compute(), fellBackAt,
    cells: simulation.solver.nx * simulation.solver.nz, spinUpSeconds, wallSeconds: (performance.now() - started) / 1000,
  });
  simulation.device?.dispose();
}
