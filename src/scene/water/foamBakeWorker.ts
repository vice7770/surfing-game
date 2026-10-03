/// <reference lib="webworker" />
import { churnTextureBytes } from './churnTexture';

/**
 * Web Worker entry: bakes the churn map's bytes, the churn and the foam's life cycle (`churnTextureBytes`), off the main
 * thread, and hands them back once (`startFoamBake`).
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = () => {
  const data = churnTextureBytes();
  scope.postMessage(data, [data.buffer]);
};
