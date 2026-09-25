import { describe, expect, it } from 'vitest';
import { TRACE_SCENARIOS, runTrace } from './boardTrace';

/**
 * Golden hashes of whole legacy runs, taken before the board moved onto the
 * SurfWater seam (P4b). Any change to the legacy physics changes them: update
 * them only for a deliberate, recorded behaviour change.
 */
const GOLDEN: Record<string, { hash: string; state: string }> = {
  'training seed 1': { hash: '09e1c91a', state: 'complete' },
  'training seed 5': { hash: 'e7a83a0d', state: 'complete' },
  'training seed 9': { hash: 'e9860335', state: 'complete' },
  'sustained carve': { hash: '5d4fae15', state: 'wipeout' },
  'sustained wipeout': { hash: '1443dd0a', state: 'wipeout' },
  'point preset': { hash: '6a494755', state: 'wipeout' },
  'reef preset': { hash: '0eaf1a45', state: 'riding' },
};

describe('legacy board traces', () => {
  for (const scenario of TRACE_SCENARIOS) {
    it(`replays ${scenario.name} bit for bit`, () => {
      const result = runTrace(scenario);
      expect({ hash: result.hash, state: result.state }).toEqual(GOLDEN[scenario.name]);
    }, 30_000);
  }

  it('changes its hash when the physics changes', () => {
    const scenario = TRACE_SCENARIOS[0];
    expect(runTrace({ ...scenario, physics: { ...scenario.physics, paddleForce: 14.001 } }).hash).not.toBe(GOLDEN[scenario.name].hash);
  });
});
