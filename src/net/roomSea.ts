import { GPU_TIER_COMPONENTS, swellFor } from '../game/PhysicalMode';
import { physicalSettingsFor, type SurfConditions } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';

/** What fixes a room's sea: every player builds it from exactly these. */
export interface RoomSea {
  spot: SpotName;
  conditions: SurfConditions;
  seed: number;
}

/**
 * The surf zone every player in a room builds (spec N1): stage 2 with the GPU
 * tier's 64 components whatever the graphics settings, so the seas match, spun
 * up to sit at `startSeaTime`. `compute` is 'cpu' only for reports in Node.
 */
export function roomSurfZoneConfig(room: RoomSea, startSeaTime: number, compute: 'auto' | 'cpu' = 'auto'): SurfZoneConfig {
  const settings = physicalSettingsFor(room.spot, room.conditions, { stage: 2, compute });
  const swell = swellFor(settings);
  return {
    spot: room.spot,
    seed: room.seed,
    significantHeight: swell.significantHeight,
    peakPeriod: swell.peakPeriod,
    directionDegrees: swell.directionDegrees ?? settings.directionDegrees,
    spreading: swell.spreading,
    bandwidth: swell.bandwidth,
    tide: settings.tide,
    windSpeed: settings.windSpeed,
    stage: 2,
    compute,
    // Practice's groundswell is given at the tank's edge, as the Surf screen's is (the wave-sizes spec).
    ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
    componentCount: GPU_TIER_COMPONENTS,
    startSeaTime,
  };
}
