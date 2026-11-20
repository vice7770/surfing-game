import type { RiderPlacement } from '../physics/RideSession';
import type { SurfZoneRunner } from './SurfZoneRunner';

/** Controls recorded from the Canyon paddle-in, starting one solver step before placement. */
export interface CanyonApproach {
  approachPlacement: RiderPlacement;
  approachInputs: { steps: number; paddle: boolean; sprint: boolean; popUp: boolean }[];
}

/** Replay inside the CPU host, stopping at its first actual standing frame with all rider dynamics intact. */
export function replayCanyonApproach(runner: SurfZoneRunner, approach: CanyonApproach): void {
  let place: RiderPlacement | undefined = approach.approachPlacement;
  for (const { steps, paddle, sprint, popUp } of approach.approachInputs) {
    for (let tick = 0; tick < steps; tick++) {
      runner.advance(1, { paddle, sprint, popUp, steer: 0, retry: false, place });
      place = undefined;
      if (runner.session?.phase === 'standing') return;
    }
  }
  throw new Error('The recorded Canyon approach ended before the rider stood.');
}
