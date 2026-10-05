import type { BoussinesqSolver } from '../wave/BoussinesqSolver';
import { SurfZoneRunner, type RideRequest, type SurfZoneBuffers, type SurfZoneRunnerOptions } from '../wave/SurfZoneRunner';
import type { SprayLook } from '../wave/SprayCloud';
import type { ParticleLevel } from '../wave/particleBudget';
import type { SolverDevice, SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { compress, decodeSurfZoneState, encodeSurfZoneState } from '../wave/surfZoneState';
import type { SurfZoneInit, SurfZoneSnapshot } from './SurfZoneHost';

/** Main thread → worker. `buffers` come back filled in the next snapshot. */
export type SurfZoneRequest =
  /** `sea`: an encoded sea handed over by another player (spec N1), taken over before the device attaches. */
  | { type: 'start'; config: SurfZoneConfig; options?: SurfZoneRunnerOptions; sea?: Uint8Array; /** Internal default offline host capability. */ soloOneStep?: true }
  | { type: 'exportState'; id: number }
  /** Take this encoded sea in place of the running one (spec L2: a lesson restarts on the same wave). */
  | { type: 'restore'; sea: Uint8Array }
  | { type: 'look'; look: SprayLook }
  | { type: 'sprayEnabled'; enabled: boolean }
  /** The Particles setting (graphics): the spray's and bubbles' budget. */
  | { type: 'particles'; level: ParticleLevel }
  | { type: 'advance'; steps: number; buffers: SurfZoneBuffers; input?: RideRequest; reactions?: Float32Array };

/** Worker → main thread. */
export type SurfZoneReply =
  | { type: 'ready'; init: SurfZoneInit; snapshot: SurfZoneSnapshot }
  | { type: 'snapshot'; snapshot: SurfZoneSnapshot }
  | { type: 'state'; id: number; bytes: Uint8Array; deflated: boolean };

/** The arrays of a snapshot, handed over without copying. */
export function transferables(buffers: SurfZoneBuffers): Transferable[] {
  return [
    buffers.surface.buffer, buffers.flow.buffer, buffers.lip.buffer, buffers.bubbles.buffer, buffers.spray.buffer, buffers.board.buffer, buffers.rider.buffer,
    buffers.lipHits.buffer, buffers.strokeHits.buffer, buffers.roar.buffer, buffers.tubes.buffer, buffers.reaction.buffer, buffers.aeration.buffer, buffers.front.buffer,
  ];
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
  /** The water look the spray is drawn in (G9: Classic keeps its spray), kept for a sea still to start. */
  private sprayLook: SprayLook = 'rich';
  /** Kept while a new sea is still spinning up. */
  private sprayEnabled = true;
  /** The Particles setting, kept for a sea still to start. */
  private particleLevel: ParticleLevel = 'high';
  /** A device step under way: an export waits for it, so it never sees half a step. */
  private stepping?: Promise<void>;
  /** The capability belongs to this runner/start generation, never to a public graphics setting. */
  private soloRunner?: SurfZoneRunner;
  private generation = 0;
  private retirement?: Promise<void>;

  constructor(
    private readonly post: (reply: SurfZoneReply, transfer: Transferable[]) => void,
    private readonly createDevice?: SolverDeviceFactory,
  ) {}

  handle(request: SurfZoneRequest): void | Promise<void> {
    if (request.type === 'look') {
      this.sprayLook = request.look;
      this.runner?.setSprayLook(request.look);
      return;
    }
    if (request.type === 'sprayEnabled') {
      this.sprayEnabled = request.enabled;
      this.runner?.setSprayEnabled(request.enabled);
      return;
    }
    if (request.type === 'particles') {
      this.particleLevel = request.level;
      this.runner?.setParticleLevel(request.level);
      return;
    }
    if (request.type === 'start') {
      const { config, options, sea } = request;
      const generation = ++this.generation;
      const previous = this.soloRunner;
      this.soloRunner = undefined;
      const retirement = previous ? this.retireSolo(previous) : this.retirement;
      if (previous) this.retirement = retirement;
      if (previous) this.runner = undefined;
      if (this.createDevice && (config.compute ?? 'auto') === 'auto') {
        // The device first, so the spin-up runs on the GPU too (several times faster than the CPU).
        const runner = SurfZoneRunner.forWorker(config, options, 'warm');
        const createDevice = this.createDevice;
        return (async () => {
          if (retirement) await retirement;
          if (this.retirement === retirement) this.retirement = undefined;
          if (generation !== this.generation) return;
          await runner.useDevice(createDevice);
          if (generation !== this.generation) { runner.simulation.device?.dispose(); return; }
          await runner.spinUp();
          if (generation !== this.generation) { runner.simulation.device?.dispose(); return; }
          if (sea) runner.simulation.importState(decodeSurfZoneState(sea));
          // Only a ready sea takes steps and exports.
          runner.setSprayLook(this.sprayLook);
          runner.setSprayEnabled(this.sprayEnabled);
          runner.setParticleLevel(this.particleLevel);
          this.runner = runner;
          if (request.soloOneStep && !sea && config.spot === 'padang' && runner.enableSoloWaterPrefetch()) this.soloRunner = runner;
          this.ready(runner);
        })();
      }
      const startCpu = () => {
        if (this.retirement === retirement) this.retirement = undefined;
        if (generation !== this.generation) return;
        const runner = SurfZoneRunner.forWorker(config, options);
        if (sea) runner.simulation.importState(decodeSurfZoneState(sea));
        runner.setSprayLook(this.sprayLook);
        runner.setSprayEnabled(this.sprayEnabled);
        runner.setParticleLevel(this.particleLevel);
        this.runner = runner;
        this.ready(runner);
      };
      if (retirement) return retirement.then(startCpu);
      startCpu();
      return;
    }
    const { runner } = this;
    if (!runner) return;
    if (request.type === 'exportState') return this.exportState(runner, request.id);
    if (request.type === 'restore') return this.restore(runner, request.sea);
    if (runner === this.soloRunner) {
      const generation = this.generation;
      return this.queueSolo(async () => {
        if (generation !== this.generation || runner !== this.runner) return;
        await runner.advanceAsync(request.steps, request.input, request.reactions);
        if (generation === this.generation && runner === this.runner) this.reply(runner, request.buffers);
      });
    }
    if (runner.simulation.device) {
      const step = runner.advanceAsync(request.steps, request.input, request.reactions).then(() => this.reply(runner, request.buffers));
      this.stepping = step.finally(() => {
        if (this.stepping === settled) this.stepping = undefined;
      });
      const settled = this.stepping;
      return step;
    }
    runner.advance(request.steps, request.input, request.reactions);
    this.reply(runner, request.buffers);
  }

  /** Serialize only the private solo runner's advances/restores; generic request handling remains unchanged. */
  private queueSolo(work: () => Promise<void>): Promise<void> {
    const previous = this.stepping;
    const step = (async () => { if (previous) await previous; await work(); })();
    const settled = step.finally(() => { if (this.stepping === settled) this.stepping = undefined; });
    this.stepping = settled;
    return settled;
  }

  private async retireSolo(runner: SurfZoneRunner): Promise<void> {
    await this.stepping;
    await runner.simulation.discardWaterPrefetch();
    runner.simulation.device?.dispose();
    runner.simulation.device = undefined;
  }

  /** This sea, encoded and compressed, for a player joining late (spec N1), once any step under way is done. */
  private async exportState(runner: SurfZoneRunner, id: number): Promise<void> {
    await this.stepping;
    const { bytes, deflated } = await compress(encodeSurfZoneState(runner.simulation.exportState()));
    this.post({ type: 'state', id, bytes, deflated }, [bytes.buffer]);
  }

  /** A restore waits for any step under way, so it never lands halfway through one. */
  private async restore(runner: SurfZoneRunner, sea: Uint8Array): Promise<void> {
    if (runner === this.soloRunner) {
      const generation = this.generation;
      return this.queueSolo(async () => {
        if (generation !== this.generation || runner !== this.runner) return;
        await runner.simulation.discardWaterPrefetch();
        runner.invalidateTubeApproach();
        runner.simulation.importState(decodeSurfZoneState(sea));
      });
    }
    await this.stepping;
    runner.invalidateTubeApproach();
    runner.simulation.importState(decodeSurfZoneState(sea));
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
