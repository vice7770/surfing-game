/**
 * Dev only: stepping the game's sea from the water sheet and the ride recorder,
 * which step and render on their own, in the page or in the game's worker
 * (`&compute=gpu`).
 */
import type { PhysicalMode } from '../game/PhysicalMode';
import { MAX_QUEUED_STEPS } from '../game/WorkerSurfZone';

/**
 * One channel for every yield: `advance` yields thousands of times a second while the worker steps on the GPU, and
 * a channel apiece held native memory the collector never saw (the GPU water sheet's page grew ~150 MB/s to 12 GB).
 */
const channel = new MessageChannel();
const waiting: (() => void)[] = [];
channel.port1.onmessage = () => waiting.shift()?.();

/** Yield to the event loop without a timer (timers are throttled in hidden pages). */
export const breathe = () => new Promise<void>((resolve) => {
  waiting.push(resolve);
  channel.port2.postMessage(0);
});

export interface SteppedHooks {
  step(input: { paddle: boolean; popUp: boolean; steer: number }): void;
  mode: PhysicalMode;
}

/**
 * `steps` more steps of the sea, shown in the snapshot: the page's own surf zone takes them at once; the worker's
 * (`&compute=gpu`) queues only a few at a time, so they are fed as it takes them, and waited for.
 */
export async function advance(hooks: SteppedHooks, steps: number, input: Parameters<SteppedHooks['step']>[0]): Promise<void> {
  const outstanding = () => hooks.mode.host?.outstandingSteps ?? 0;
  for (let asked = 0; asked < steps;) {
    if (outstanding() < MAX_QUEUED_STEPS) {
      hooks.step(input);
      asked += 1;
    } else {
      await breathe();
    }
  }
  while (outstanding() > 0) await breathe();
}
