import { SurfZoneRunner, type RideRequest, type SurfZoneBuffers, type SurfZoneRunnerOptions } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
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

/**
 * The worker's side of the surf zone (plan §3.2, P4a), kept free of worker
 * globals so it can be tested directly: it owns the runner, steps it when
 * asked, and fills the buffers the main thread lends it.
 */
export class SurfZoneWorkerCore {
  private runner?: SurfZoneRunner;

  constructor(private readonly post: (reply: SurfZoneReply, transfer: Transferable[]) => void) {}

  handle(request: SurfZoneRequest): void {
    if (request.type === 'start') {
      const runner = new SurfZoneRunner(request.config, request.options);
      this.runner = runner;
      const buffers = runner.createBuffers();
      runner.fill(buffers);
      const bed = runner.bed.slice();
      const init: SurfZoneInit = {
        grid: { ...runner.grid }, bed, focus: runner.focus, windowXMin: runner.windowXMin, dx: runner.simulation.solver.dx,
      };
      this.post({ type: 'ready', init, snapshot: { ...buffers, status: runner.status() } }, [bed.buffer, ...transferables(buffers)]);
      return;
    }
    const { runner } = this;
    if (!runner) return;
    runner.advance(request.steps, request.input);
    runner.fill(request.buffers);
    this.post({ type: 'snapshot', snapshot: { ...request.buffers, status: runner.status() } }, transferables(request.buffers));
  }
}
