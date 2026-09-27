import type { RideRequest, SurfZoneBuffers, SurfZoneRunnerOptions } from '../wave/SurfZoneRunner';
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

/** Most steps queued while an advance is in flight (the page's accumulator caps its backlog the same way). */
export const MAX_QUEUED_STEPS = 6;

export interface WorkerSurfZoneOptions {
  /** Most steps queued while an advance is in flight; online play raises it to catch up with the room's clock (spec N1). */
  maxQueuedSteps?: number;
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
    port.postMessage({ type: 'start', config, options, ...(sea ? { sea } : {}) }, sea ? [sea.buffer] : []);
  }

  /** Steps asked for that no snapshot shows yet: queued, and in the worker now. */
  get outstandingSteps(): number {
    return this.pending + this.inFlightSteps;
  }

  advance(steps: number, input?: RideRequest, reactions?: ArrayLike<number>): void {
    if (reactions) for (let i = 0; i < reactions.length; i += 1) this.pendingReactions.push(reactions[i]);
    if (input) {
      this.input = { ...input, popUp: this.input.popUp || input.popUp, retry: this.input.retry || input.retry };
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

  dispose(): void {
    this.disposed = true;
    this.port.terminate();
  }

  private flush(): void {
    if (this.inFlight || this.pending === 0 || !this.spare || this.disposed) return;
    const buffers = this.spare;
    this.spare = undefined;
    this.inFlight = true;
    const steps = this.pending;
    this.pending = 0;
    this.inFlightSteps = steps;
    const reactions = this.pendingReactions.length ? Float32Array.from(this.pendingReactions) : undefined;
    this.pendingReactions = [];
    const input = this.input;
    this.input = { ...input, popUp: false, retry: false };
    this.port.postMessage({ type: 'advance', steps, buffers, input, ...(reactions ? { reactions } : {}) }, transferables(buffers));
  }
}
