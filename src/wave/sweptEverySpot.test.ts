import { describe, expect, it } from 'vitest';
import type { SpotName } from './Bathymetry';
import { BARREL_SPOTS } from './barrel/barrelSpots';
import { readBarrelCases } from './barrel/nodeBarrelCases';
import { createContactHit } from './barrel/sweptContact';
import { LOFT, LOFT_SAMPLES } from './barrel/sweptLoft';
import { LANDMARK } from './barrel/ProfileLibrary';
import { SURF_ZONE_STEP, SurfZoneRunner } from './SurfZoneRunner';
import { SWEPT_BARREL, type SurfZoneConfig } from './SurfZoneSimulation';

/**
 * Each spot with a barrel transect but not yet switched on (Part B, PR 7), on a small sea of its own with the switch on
 * inside this test only: its front forms from its own onset tables, its slices throw, and the contact built from its
 * cases answers under a thrown slice, as the flip would run them. Padang Padang has its own tests
 * (SurfZoneSimulation.test.ts, SurfZoneRunner.test.ts).
 */
const SEAS: Partial<Record<SpotName, Omit<SurfZoneConfig, 'spot'>>> = {
  // The shared Practice swell (PhysicalMode's PRACTICE_SWELL), given at the edge, on a small window of the game's 1 m
  // cells: on 2 m cells the solver breaks the Point's crests only at the shore (today's lip throws none there either).
  point: {
    seed: 1, significantHeight: 1.4, peakPeriod: 12, directionDegrees: 0, spreading: 150, bandwidth: 0.08, heightAt: 'edge', tide: 0,
    componentCount: 12, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
  },
  // The Reef's Practice groundswell (PhysicalMode's REEF_PRACTICE_SWELL), given at the edge, on a small window.
  reef: {
    seed: 1, significantHeight: 1, peakPeriod: 14, directionDegrees: 0, spreading: 150, bandwidth: 0.08, heightAt: 'edge', tide: 0,
    componentCount: 12, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
  },
};
const SPOTS = (Object.keys(BARREL_SPOTS) as SpotName[]).filter((spot) => !SWEPT_BARREL.includes(spot) && SEAS[spot]);

describe.each(SPOTS)('the swept barrel on %s’s own sea, switched on inside the test', (spot) => {
  it('throws slices from its front and answers its contact under them', () => {
    const runner = new SurfZoneRunner({ spot, ...SEAS[spot]!, sweptBarrel: true }, { rider: true, barrelCases: readBarrelCases(spot) });
    expect(runner.simulation.front).toBeDefined();
    expect(runner.contact).toBeDefined();
    // Until a slice of a front is open (thrown, before touchdown) and overturned, mostly lifted off the water, step by step
    // (a small wave's tube is open about a second, and a short front's ends blend), at most three minutes of sea.
    let open = -1;
    for (let step = 0; step < 180 / SURF_ZONE_STEP && open < 0; step += 1) {
      runner.advance(1);
      const loft = runner.contact!.last;
      if (!loft) continue;
      let weight = 0.5;
      for (let s = 0; s < loft.sliceCount; s += 1) {
        if (loft.slicePhase[s] === 1 && loft.sliceOverturned[s] === 1 && loft.sliceWeight[s] > weight) {
          open = s;
          weight = loft.sliceWeight[s];
        }
      }
    }
    expect(open).toBeGreaterThanOrEqual(0);
    const loft = runner.contact!.last!;
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
    // Under the open slice's lip, half-way from its throat to its tip: the face below, the curl's underside above.
    const vertex = (index: number) => {
      const v = open * LOFT_SAMPLES + LOFT.extensionSamples + index;
      return { x: loft.positions[3 * v], z: loft.positions[3 * v + 2] };
    };
    const tip = vertex(LANDMARK.lip);
    const throat = vertex(LANDMARK.throat);
    const x = (tip.x + throat.x) / 2;
    const z = (tip.z + throat.z) / 2;
    const face = runner.contact!.floorAt(x, z);
    expect(Number.isFinite(face)).toBe(true);
    const hit = createContactHit();
    expect(runner.contact!.query(x, face + 0.02, z, hit)).toBe(true);
    expect(Number.isFinite(hit.surfaceY)).toBe(true);
  }, 1_800_000);
});
