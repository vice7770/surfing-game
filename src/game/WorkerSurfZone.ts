import type { SurfZoneBuffers, SurfZoneRunnerOptions } from '../wave/SurfZoneRunner';
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

function emptyLike(snapshot: SurfZoneBuffers): SurfZoneBuffers {
  return {
    surface: new Float32Array(snapshot.surface.length),
    flow: new Float32Array(snapshot.flow.length),
    lip: new Float32Array(snapshot.lip.length),
    lipCount: 0,
    bubbles: new Float32Array(snapshot.bubbles.length),
    bubbleCount: 0,
    board: new Float64Array(snapshot.board.length),
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
  private pending = 0;
  private disposed = false;

  constructor(readonly config: SurfZoneConfig, private readonly port: WorkerPort = createSurfZoneWorker(), options: SurfZoneRunnerOptions = {}) {
    super();
    this.ready = new Promise((resolve, reject) => {
      port.onerror = (event) => reject(new Error(event.message || 'The surf zone worker failed'));
      port.onmessage = ({ data }) => {
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
        }
        this.flush();
      };
    });
    port.postMessage({ type: 'start', config, options });
  }

  advance(steps: number): void {
    if (steps <= 0 || this.disposed) return;
    this.pending = Math.min(MAX_QUEUED_STEPS, this.pending + steps);
    this.flush();
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
    this.port.postMessage({ type: 'advance', steps, buffers }, transferables(buffers));
  }
}
