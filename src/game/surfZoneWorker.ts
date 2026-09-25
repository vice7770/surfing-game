/// <reference lib="webworker" />
import { SurfZoneWorkerCore, type SurfZoneRequest } from './SurfZoneWorkerCore';

/** Web Worker entry: the physical surf zone runs here, off the main thread (plan §3.2, P4a). */
const scope = self as unknown as DedicatedWorkerGlobalScope;
const core = new SurfZoneWorkerCore((reply, transfer) => scope.postMessage(reply, transfer));
scope.onmessage = (event: MessageEvent<SurfZoneRequest>) => core.handle(event.data);
