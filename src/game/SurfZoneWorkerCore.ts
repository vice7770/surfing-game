import type { BoussinesqSolver } from '../wave/BoussinesqSolver';
import { SurfZoneRunner, type RideRequest, type SurfZoneBuffers, type SurfZoneRunnerOptions } from '../wave/SurfZoneRunner';
import type { SolverDevice, SurfZoneConfig } from '../wave/SurfZoneSimulation';
import type { SurfZoneInit, SurfZoneSnapshot } from './SurfZoneHost';

/** Main thread → worker. `buffers` come back filled in the next snapshot. */
export type SurfZoneRequest =
  | { type: 'start'; config: SurfZoneConfig; options?: SurfZoneRunnerOptions }
  | { type: 'advance'; steps: number; buffers: SurfZoneBuffers; input?: RideRequest };

/** Worker → main thread. */
export type SurfZoneReply =
  | { type: 'ready'; init: SurfZoneInit; snapshot: SurfZoneSnapshot }
  | { type: 'snapshot'; snapshot: SurfZoneSnapshot };

/** The arrays of a snapshot, handed over without copying. */
export function transferables(buffers: SurfZoneBuffers): Transferable[] {
  return [buffers.surface.buffer, buffers.flow.buffer, buffers.lip.buffer, buffers.bubbles.buffer, buffers.spray.buffer, buffers.board.buffer, buffers.rider.buffer];
}

/** Makes the device a stage 2 solver steps on (the GPU), or none. */
export type SolverDeviceFactory = (solver: BoussinesqSolver) => Promise<SolverDevice | undefined>;

/**
 * The worker's side of the surf zone (plan §3.2, P4a), kept free of worker
 * globals so it can be tested directly: it owns the runner, steps it when
 * asked, and fills the buffers the main thread lends it. Given a device
 * factory, stage 2 water steps on that device (plan P6) and replies come once
 * it has finished; without one everything runs, and replies, synchronously.
 */
export class SurfZoneWorkerCore {
  private runner?: SurfZoneRunner;

  constructor(
    private readonly post: (reply: SurfZoneReply, transfer: Transferable[]) => void,
    private readonly createDevice?: SolverDeviceFactory,
  ) {}

  handle(request: SurfZoneRequest): void | Promise<void> {
    if (request.type === 'start') {
      const runner = new SurfZoneRunner(request.config, request.options);
      this.runner = runner;
      if (this.createDevice && (request.config.compute ?? 'auto') === 'auto') {
        return runner.useDevice(this.createDevice).then(() => this.ready(runner));
      }
      this.ready(runner);
      return;
    }
    const { runner } = this;
    if (!runner) return;
    if (runner.simulation.device) {
      return runner.advanceAsync(request.steps, request.input).then(() => this.reply(runner, request.buffers));
    }
    runner.advance(request.steps, request.input);
    this.reply(runner, request.buffers);
  }

  private ready(runner: SurfZoneRunner): void {
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    const bed = runner.bed.slice();
    const init: SurfZoneInit = {
      grid: { ...runner.grid }, bed, focus: runner.focus, windowXMin: runner.windowXMin, dx: runner.simulation.solver.dx,
    };
    this.post({ type: 'ready', init, snapshot: { ...buffers, status: runner.status() } }, [bed.buffer, ...transferables(buffers)]);
  }

  private reply(runner: SurfZoneRunner, buffers: SurfZoneBuffers): void {
    runner.fill(buffers);
    this.post({ type: 'snapshot', snapshot: { ...buffers, status: runner.status() } }, transferables(buffers));
  }
}
