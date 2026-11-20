/**
 * Dev only: stepping the game's sea from the water sheet and the ride recorder,
 * which step and render on their own, in the page or in the game's worker
 * (`&compute=gpu`).
 */
import type { PhysicalMode } from '../game/PhysicalMode';
import type { RideRequest } from '../wave/SurfZoneRunner';
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
  /**
   * **The rider's whole input, not a chosen few fields.** It is everything `PhysicalMode.advance` already accepts, so
   * nothing an autopilot can ask for has nowhere to go: the standing phases fill in far more than the stick — a bottom
   * turn asks for `crouch` and `compress` as well as `steer` (`Autopilot.next`), a cutback adds `rotate`, and
   * `style=tube` sets `tubeGuide`. Naming a subset here is how a caller comes to rebuild the input field by field and
   * silently drop the rest, which is exactly what `rideReports` did, measuring a steer-only rider. Every one of those
   * fields is optional, so the type alone cannot catch a short literal; what it does is make the whole input the thing
   * being passed, so forwarding the autopilot's own object is the natural way to call this.
   */
  step(input: Omit<RideRequest, 'retry'>): void;
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
