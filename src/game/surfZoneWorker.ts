/// <reference lib="webworker" />
import { GpuBoussinesq } from '../wave/gpu/GpuBoussinesq';
import { SurfZoneWorkerCore, type SurfZoneRequest } from './SurfZoneWorkerCore';

/** Web Worker entry: the physical surf zone runs here, off the main thread (plan §3.2, P4a). */
const scope = self as unknown as DedicatedWorkerGlobalScope;
// Stage 2 water steps on the GPU where WebGPU allows (plan P6), else on the CPU.
const core = new SurfZoneWorkerCore((reply, transfer) => scope.postMessage(reply, transfer), (solver) => GpuBoussinesq.create(solver));
scope.onmessage = (event: MessageEvent<SurfZoneRequest>) => {
  const pending = core.handle(event.data);
  // A failure inside an async step reaches the page's onerror like a synchronous one.
  pending?.catch((error: unknown) => setTimeout(() => {
    throw error;
  }));
};
