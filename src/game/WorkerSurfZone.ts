import type { RideRequest, SurfZoneBuffers, SurfZoneRunnerOptions } from '../wave/SurfZoneRunner';
import type { SprayLook } from '../wave/SprayCloud';
import type { ParticleLevel } from '../wave/particleBudget';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { SnapshotSampler, type SurfZoneHost, type SurfZoneInit, type SurfZoneSnapshot } from './SurfZoneHost';
import { transferables, type SurfZoneReply, type SurfZoneRequest } from './SurfZoneWorkerCore';

/** The part of a `Worker` the host uses; tests stand in a fake. */
export interface WorkerPort {
  onmessage: ((event: MessageEvent<SurfZoneReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(request: SurfZoneRequest, transfer?: Transferable[]): void;
  terminate(): void;
}

export function createSurfZoneWorker(): WorkerPort {
  return new Worker(new URL('./surfZoneWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerPort;
}

/** Most unsent steps kept while an advance is in flight; excess requested time is dropped. */
export const MAX_QUEUED_STEPS = 6;
/** Publish every offline physics step to preserve fresh-water cadence; explicit host options may batch catch-up. */
export const MAX_BATCH_STEPS = 1;

export interface WorkerSurfZoneOptions {
  /** Most steps queued while an advance is in flight; online play raises it to catch up with the room's clock (spec N1). */
  maxQueuedSteps?: number;
  /** Maximum steps before publishing a snapshot; online catch-up may use larger batches. */
  maxBatchSteps?: number;
  /** An encoded sea handed over by another player, to start from (spec N1). */
  sea?: Uint8Array;
}

function emptyLike(snapshot: SurfZoneBuffers): SurfZoneBuffers {
  return {
    surface: new Float32Array(snapshot.surface.length),
    flow: new Float32Array(snapshot.flow.length),
    lip: new Float32Array(snapshot.lip.length),
    lipCount: 0,
    tubes: new Float32Array(snapshot.tubes.length),
    tubeCount: 0,
    aeration: new Float32Array(snapshot.aeration.length),
    bubbles: new Float32Array(snapshot.bubbles.length),
    bubbleCount: 0,
    spray: new Float32Array(snapshot.spray.length),
    sprayCount: 0,
    board: new Float64Array(snapshot.board.length),
    rider: new Float64Array(snapshot.rider.length),
    lipHits: new Float32Array(snapshot.lipHits.length),
    lipHitCount: 0,
    strokeHits: new Float32Array(snapshot.strokeHits.length),
    strokeHitCount: 0,
    roar: new Float32Array(snapshot.roar.length),
    reaction: new Float64Array(snapshot.reaction.length),
    front: new Float32Array(snapshot.front.length),
    frontCount: 0,
    roller: new Float32Array(snapshot.roller.length),
    rollerCount: 0,
  };
}

/**
 * Runs the surf zone in a Web Worker (plan §3.2, P4a). Two buffer sets take
 * turns: the page shows one snapshot while the worker fills the other. One
 * advance is in flight at a time; steps asked for meanwhile go in the next.
 */
export class WorkerSurfZone extends SnapshotSampler implements SurfZoneHost {
  readonly ready: Promise<void>;
  init!: SurfZoneInit;
  snapshot!: SurfZoneSnapshot;
  private spare?: SurfZoneBuffers;
  private inFlight = false;
  private inFlightSteps = 0;
  private pending = 0;
  /** Other boards' pushes waiting for the next advance (spec N1). */
  private pendingReactions: number[] = [];
  private readonly maxQueuedSteps: number;
  private readonly maxBatchSteps: number;
  /** Held controls from the latest request; presses (pop-up, retry) kept until an advance carries them. */
  private input: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  private disposed = false;
  private exports = 0;
  private readonly exporting = new Map<number, (sea: { bytes: Uint8Array; deflated: boolean }) => void>();

  constructor(
    readonly config: SurfZoneConfig, private readonly port: WorkerPort = createSurfZoneWorker(), options: SurfZoneRunnerOptions = {},
    host: WorkerSurfZoneOptions = {},
  ) {
    super();
    this.maxQueuedSteps = host.maxQueuedSteps ?? MAX_QUEUED_STEPS;
    this.maxBatchSteps = Math.max(1, host.maxBatchSteps ?? (host.maxQueuedSteps === undefined ? MAX_BATCH_STEPS : this.maxQueuedSteps));
    this.ready = new Promise((resolve, reject) => {
      port.onerror = (event) => reject(new Error(event.message || 'The surf zone worker failed'));
      port.onmessage = ({ data }) => {
        if (data.type === 'state') {
          this.exporting.get(data.id)?.({ bytes: data.bytes, deflated: data.deflated });
          this.exporting.delete(data.id);
          return;
        }
        if (data.type === 'ready') {
          this.init = data.init;
          this.snapshot = data.snapshot;
          this.spare = emptyLike(data.snapshot);
          resolve();
        } else {
          const { status: _status, ...shown } = this.snapshot;
          this.snapshot = data.snapshot;
          this.spare = shown;
          this.inFlight = false;
          this.inFlightSteps = 0;
        }
        this.flush();
      };
    });
    const { sea } = host;
    // Only the actual default offline one-step Padang host grants this internal capability.
    // Room catch-up and recorded seas supply host options and retain the ordinary device path.
    const soloOneStep = host.maxQueuedSteps === undefined && host.maxBatchSteps === undefined && sea === undefined
      && config.spot === 'padang' && (config.compute ?? 'auto') === 'auto' && Boolean(options.barrelCases?.length)
      && Boolean(options.rider || options.board || options.contact);
    port.postMessage({ type: 'start', config, options, ...(sea ? { sea } : {}), ...(soloOneStep ? { soloOneStep: true as const } : {}) }, sea ? [sea.buffer] : []);
  }

  /** Steps asked for that no snapshot shows yet: queued, and in the worker now. */
  get outstandingSteps(): number {
    return this.pending + this.inFlightSteps;
  }

  advance(steps: number, input?: RideRequest, reactions?: ArrayLike<number>): void {
    if (reactions) for (let i = 0; i < reactions.length; i += 1) this.pendingReactions.push(reactions[i]);
    if (input) {
      this.input = { ...input, popUp: this.input.popUp || input.popUp, retry: this.input.retry || input.retry, place: input.place ?? this.input.place };
    }
    if (steps <= 0 || this.disposed) return;
    this.pending = Math.min(this.maxQueuedSteps, this.pending + steps);
    this.flush();
  }

  /** This sea for a player joining late (spec N1), from the worker once its step under way is done. */
  exportState(): Promise<{ bytes: Uint8Array; deflated: boolean }> {
    const id = ++this.exports;
    return new Promise((resolve) => {
      this.exporting.set(id, resolve);
      this.port.postMessage({ type: 'exportState', id });
    });
  }

  /** The sea is replaced in the worker before the next advance it receives; `sea` is handed over (transferred). */
  restore(sea: Uint8Array): void {
    if (this.disposed) return;
    this.port.postMessage({ type: 'restore', sea }, [sea.buffer]);
  }

  /** The worker's spray follows the water look (G9: Classic keeps its spray), from its next step. */
  setSprayLook(look: SprayLook): void {
    if (this.disposed) return;
    this.port.postMessage({ type: 'look', look });
  }

  setSprayEnabled(enabled: boolean): void {
    if (this.disposed) return;
    this.port.postMessage({ type: 'sprayEnabled', enabled });
  }

  /** The Particles setting: the worker's spray and bubbles take the budget from their next step. */
  setParticleLevel(level: ParticleLevel): void {
    if (this.disposed) return;
    this.port.postMessage({ type: 'particles', level });
  }

  dispose(): void {
    this.disposed = true;
    this.port.terminate();
  }

  private flush(): void {
    if (this.inFlight || this.pending === 0 || !this.spare || this.disposed) return;
    const buffers = this.spare;
    this.spare = undefined;
    this.inFlight = true;
    const steps = Math.min(this.pending, this.maxBatchSteps);
    this.pending -= steps;
    this.inFlightSteps = steps;
    const reactions = this.pendingReactions.length ? Float32Array.from(this.pendingReactions) : undefined;
    this.pendingReactions = [];
    const input = this.input;
    this.input = { ...input, popUp: false, retry: false, place: undefined };
    this.port.postMessage({ type: 'advance', steps, buffers, input, ...(reactions ? { reactions } : {}) }, transferables(buffers));
  }
}
