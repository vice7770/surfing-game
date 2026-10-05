import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBarrelCases } from './barrel/nodeBarrelCases';
import { SweptContact } from './barrel/sweptContact';
import { createTubeApproachObservation, type TubeApproachCue, type TubeApproachRequest } from './barrel/tubeApproach';
import { SURF_ZONE_STEP, SurfZoneRunner } from './SurfZoneRunner';
import type { SurfZoneConfig } from './SurfZoneSimulation';

const config: SurfZoneConfig = {
  spot: 'padang', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 12, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};
const input = { paddle: false, popUp: false, steer: 0, crouch: 1, retry: false };
afterEach(() => vi.restoreAllMocks());

describe('opt-in tube observations', () => {
  it('leaves normal player steps free of route searches and copies post-step body geometry for the dev driver', () => {
    const runner = new SurfZoneRunner(config, { rider: true, barrelCases: readBarrelCases() }, 'warm');
    // A controlled standing fixture tests observation plumbing; it is not evidence of a paddled tube ride.
    runner.session!.place({ x: runner.focus.x, z: runner.focus.z - 5, heading: 0, phase: 'standing', speed: 6 }, runner.water);
    let request: TubeApproachRequest | undefined;
    const query = vi.spyOn(SweptContact.prototype, 'approachNear').mockImplementation(value => {
      request = { ...value, body: value.body.map(point => ({ ...point })) };
      return undefined;
    });
    runner.advance(1, input);
    expect(query).not.toHaveBeenCalled();
    runner.advance(1, { ...input, tubeGuide: true });
    expect(query).toHaveBeenCalledTimes(1);
    expect(request!.seaTime).toBe(runner.simulation.seaTime);
    expect(request!.body).toHaveLength(14);
    const witnesses = runner.status().ride!.tubeBody!;
    expect(witnesses.seaTime).toBe(request!.seaTime);
    expect([...witnesses.renderPoints, ...witnesses.partSpheres]).toEqual(request!.body);
    witnesses.partSpheres[0].radius = 999;
    expect(runner.status().ride!.tubeBody!.partSpheres[0].radius).not.toBe(999);
    const point = new Vector3();
    for (let i = 0; i < 7; i++) {
      runner.session!.renderPoint(i, point);
      expect(request!.body[i]).toEqual({ x: point.x, y: point.y, z: point.z, radius: 0 });
      runner.session!.rider.partPosition(i, point);
      const radius = Math.cbrt(3 * runner.session!.rider.partVolumes[i] / (4 * Math.PI));
      expect(request!.body[i + 7]).toEqual({ x: point.x, y: point.y, z: point.z, radius });
      expect(request!.bodyHeight).toBeGreaterThanOrEqual(point.y + radius - runner.session!.board.position.y);
    }
    expect(request!.halfWidth).toBeGreaterThanOrEqual(0.3);
    expect(request!.halfDepth).toBeGreaterThanOrEqual(0.8);
  });

  it('detaches nested cue points from status consumers and clears guidance after disable or restart', () => {
    const runner = new SurfZoneRunner(config, { rider: true, barrelCases: readBarrelCases() }, 'warm');
    const initialTime = runner.simulation.seaTime;
    runner.session!.place({ x: runner.focus.x, z: runner.focus.z - 5, heading: 0, phase: 'standing', speed: 6 }, runner.water);
    let generated: TubeApproachCue | undefined;
    vi.spyOn(SweptContact.prototype, 'approachNear').mockImplementation(request => {
      generated = { seaTime: request.seaTime, geometryStep: 1, frontId: 1, sigma: 2, sigmaMin: 0, sigmaMax: 4,
        rayX: 0, rayZ: 1, tangentX: 1, tangentZ: 0, mouth: { x: 2, z: 3, floorY: 0, roofY: 2 },
        inside: { x: 2, z: 2, floorY: 0, roofY: 3 }, minimumClearance: 2, usableHalfWidth: 1,
        bodyFitsMouth: false, bodyInCavity: false };
      return generated;
    });
    runner.advance(1, { ...input, tubeGuide: true });
    const cue = runner.status().ride!.tubeApproach!;
    expect(cue).toEqual(generated);
    cue.mouth.x = 999; cue.inside.z = 999;
    expect(runner.status().ride!.tubeApproach!.mouth.x).toBe(2);
    expect(runner.status().ride!.tubeApproach!.inside.z).toBe(2);
    runner.invalidateTubeApproach();
    expect(runner.status().ride!.tubeApproach).toBeUndefined();
    expect(runner.status().ride!.tubeBody).toBeUndefined();
    runner.advance(1, { ...input, tubeGuide: true });
    expect(runner.status().ride!.tubeApproach).toBeDefined();
    runner.advance(1, input);
    expect(runner.status().ride!.tubeApproach).toBeUndefined();
    expect(runner.simulation.seaTime - initialTime).toBeCloseTo(3 * SURF_ZONE_STEP);
  });
});

describe('passive guide status lifetime', () => {
  it('publishes detached opt-in scalars and invalidates at the same time, placement and retry boundaries', () => {
    const runner = new SurfZoneRunner(config, { rider: true, barrelCases: readBarrelCases() }, 'warm');
    const standing = () => runner.session!.place({ x: runner.focus.x, z: runner.focus.z - 5, heading: 0, phase: 'standing', speed: 6 }, runner.water);
    standing();
    let generation = 0;
    const spy = vi.spyOn(SweptContact.prototype, 'approachNear').mockImplementation((request, observation) => {
      generation++;
      if (observation) Object.assign(observation, createTubeApproachObservation(request, generation), {
        outcome: 'all-existing-route-attempts-rejected', eligibleMaturePairs: 1, nondegenerateMatureCapSegments: 1,
        candidatesInReach: 1, routesAttempted: 1,
        nearestEligibleCap: { frontId: 1, strip: 2, fraction: 0.5, sigma: 3, x: 4, z: 5, distanceSquared: 6, preferred: false },
        firstAttempt: { columnCalls: 2, clearRouteCalls: 0, rejection: 'outer-column-unavailable',
          cap: { frontId: 1, strip: 2, fraction: 0.5, sigma: 3, x: 4, z: 5, distanceSquared: 6, preferred: false } },
        rejectionCounts: { 'outer-column-unavailable': 1 },
      });
      return undefined;
    });
    runner.advance(1, input);
    expect(spy).not.toHaveBeenCalled(); expect(runner.status().ride!.tubeApproachObservation).toBeUndefined();
    runner.advance(1, { ...input, tubeGuide: true });
    expect(spy).toHaveBeenCalledTimes(1);
    const observation = runner.status().ride!.tubeApproachObservation!;
    expect(observation.seaTime).toBe(runner.simulation.seaTime); expect(observation.geometryStep).toBe(1);
    expect(observation.request.bodyHeight).toBeGreaterThan(0); expect('body' in observation.request).toBe(false);
    observation.request.x = 999; observation.nearestEligibleCap!.x = 999; observation.firstAttempt!.cap.x = 999;
    observation.rejectionCounts['outer-column-unavailable'] = 999;
    const intact = runner.status().ride!.tubeApproachObservation!;
    expect(intact.request.x).not.toBe(999); expect(intact.nearestEligibleCap!.x).toBe(4);
    expect(intact.firstAttempt!.cap.x).toBe(4); expect(intact.rejectionCounts['outer-column-unavailable']).toBe(1);
    const time = runner.simulation.seaTime;
    // This same-time invalidation entry is also used after restoring diagnostic sea state.
    runner.invalidateTubeApproach();
    expect(runner.simulation.seaTime).toBe(time); expect(runner.status().ride!.tubeApproachObservation).toBeUndefined();
    runner.advance(1, { ...input, tubeGuide: true });
    expect(runner.status().ride!.tubeApproachObservation!.geometryStep).toBe(2);
    runner.advance(1, { ...input, tubeGuide: true, place: { x: runner.focus.x, z: runner.focus.z - 5, heading: 0, phase: 'prone', speed: 0 } });
    expect(runner.status().ride!.tubeApproachObservation).toBeUndefined();
    standing(); runner.advance(1, { ...input, tubeGuide: true });
    expect(runner.status().ride!.tubeApproachObservation!.geometryStep).toBe(3);
    runner.advance(1, { ...input, tubeGuide: true, retry: true });
    expect(runner.status().ride!.tubeApproachObservation).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
