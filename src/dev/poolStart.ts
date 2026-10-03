/**
 * Dev only: a placed start on the Wave Pool for the ride recorder (`&start=trough|face`).
 *
 * Paddled, the pool's wave is hardly ever ridden: the pool flow probe's paddlers stood 3 times in 13 attempts, off the
 * plane or behind the crest, and the recorder's 6 times in 10, every one falling within 1.2 s. So, as the probe does
 * (`poolFlow.probe.test.ts`: its PLACES and its attempt loop, the measured ones), the rider waits on the lineup, and
 * when a wave is due to break in the arm's column it is put in place standing, PLACE_ALONG m further along the arm,
 * `ahead` m from the crest down the face.
 *
 * The machine's wave is the same every POOL.period s, so the first break seen in the arm's column times every later
 * one. The column's water breaks all the time (a wave's remnants run on into the next), so a break's rising edge is
 * seen only once, at the start, and the later waves are counted from it. The break's strength is the in-page solver's
 * (the CPU tier, `LocalSurfZone`): the game's worker, on the GPU, has no such view.
 */
import { LocalSurfZone, type SurfZoneHost } from '../game/SurfZoneHost';
import type { RiderPlacement } from '../physics/RideSession';
import { createWaterSample } from '../physics/SurfWater';
import { POOL, poolCrestZ } from '../wave/pool';
import { SURF_ZONE_STEP, type SurfZoneRunner } from '../wave/SurfZoneRunner';

/** The placed starts: in the trough ahead of the wave (the flow, from its bottom turn), or on its face (the trim). */
export type PoolStartKind = 'trough' | 'face';

/**
 * Where the rider goes, as the probe's PLACES: `ahead` m from the crest down the face along the wave's travel,
 * heading `angle` degrees from that toward the open face, at `speed` m/s over the water. On the face the board moves
 * along the surface (`followSurface`), or it leaves it.
 */
export const POOL_STARTS = {
  trough: { ahead: 4.5, angle: 30, speed: 7, followSurface: false },
  face: { ahead: 2.5, angle: 50, speed: 6, followSurface: true },
} as const;

/** How far along the arm, beyond the column where the wave breaks, the rider is put, m (the probe's PLACE_AHEAD). */
export const PLACE_ALONG = 8;

/** Where a column's waves are looked for, m seaward and shoreward of the reef's crest line there (the probe's window). */
const CREST_WINDOW = { seaward: 50, shoreward: 8 } as const;

/** Whether `seaTime` falls a whole number of periods after `first`, within half a step: when a later wave breaks where the first did. */
export function isDue(seaTime: number, first: number, period: number = POOL.period, step: number = SURF_ZONE_STEP): boolean {
  const since = seaTime - first;
  return since > period / 2 && Math.abs(since - Math.round(since / period) * period) < step / 2;
}

/** The placement for a start `ahead` of the crest at (x, z) on `arm` (+1 the right arm, −1 the left), the face running down toward `travel` (radians from +z toward +x). */
export function placementFor(kind: PoolStartKind, crest: { x: number; z: number }, travel: number, arm: 1 | -1): RiderPlacement {
  const at = POOL_STARTS[kind];
  return {
    x: crest.x + at.ahead * Math.sin(travel),
    z: crest.z + at.ahead * Math.cos(travel),
    heading: travel + (arm * at.angle * Math.PI) / 180,
    speed: at.speed,
    phase: 'standing',
    ...(at.followSurface ? { followSurface: true } : {}),
  };
}

/** The strength of the breaking, per cell, which the simulation keeps to itself. */
interface Breaking {
  strength: Float64Array;
}

export class PoolStart {
  private readonly runner: SurfZoneRunner;
  private readonly strength: Float64Array;
  /** The arm's column of the take-off, and the one the rider goes to. */
  private readonly takeOffX: number;
  private readonly crestX: number;
  private readonly sample = createWaterSample();
  private breaking = false;
  private first: number | undefined;

  private constructor(host: LocalSurfZone, readonly arm: 1 | -1) {
    this.runner = host.runner;
    this.strength = (host.runner.simulation as unknown as { breaking: Breaking }).breaking.strength;
    this.takeOffX = arm * POOL.takeOffX;
    this.crestX = arm * (POOL.takeOffX + PLACE_ALONG);
  }

  /** The start for the pool on `arm`, or none: not the pool, or a sea stepped elsewhere (the game's worker, on the GPU). */
  static at(host: SurfZoneHost | undefined, arm: 1 | -1): PoolStart | undefined {
    return host instanceof LocalSurfZone && host.config.spot === 'pool' ? new PoolStart(host, arm) : undefined;
  }

  /** The sea time of the first break seen in the arm's column, s (none before it). */
  get firstBreak(): number | undefined {
    return this.first;
  }

  /** Call once a step: whether a wave breaks in the arm's column now, as it did when the first was seen, a period or more ago. */
  due(): boolean {
    const { seaTime } = this.runner.simulation;
    const breaking = this.breaksAt(this.takeOffX);
    if (breaking && !this.breaking && this.first === undefined) this.first = seaTime;
    this.breaking = breaking;
    return this.first !== undefined && isDue(seaTime, this.first);
  }

  /** Where the rider goes for `kind`: ahead of the crest in the column further along the arm, down the face along the wave's travel. */
  placement(kind: PoolStartKind): RiderPlacement {
    const { water } = this.runner;
    const z = this.crestAt(this.crestX);
    const face = water.sampleAt(this.crestX, water.surfaceAt(this.crestX, z + 2), z + 2, this.sample);
    // Down the face (the surface's steepest descent), else along +z; the arms refract the wave toward their normal.
    const travel = Math.hypot(face.slopeX, face.slopeZ) > 0.02 ? Math.atan2(-face.slopeX, -face.slopeZ) : 0;
    return placementFor(kind, { x: this.crestX, z }, travel, this.arm);
  }

  /** Whether any water near the reef's crest line in the column at x breaks (strength over 0.3). */
  private breaksAt(x: number): boolean {
    const { solver } = this.runner.simulation;
    const column = Math.round((x - solver.xCenters[0]) / solver.dx);
    const line = poolCrestZ(x);
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const z = solver.zCenters[iz];
      if (z < line - CREST_WINDOW.seaward) continue;
      if (z > line + CREST_WINDOW.shoreward) break;
      if (this.strength[iz * solver.nx + column] > 0.3) return true;
    }
    return false;
  }

  /** The crest in the column at x: the highest water near the reef's crest line, z. */
  private crestAt(x: number): number {
    const { solver } = this.runner.simulation;
    const column = Math.round((x - solver.xCenters[0]) / solver.dx);
    const line = poolCrestZ(x);
    let best = Number.NaN;
    let highest = -Infinity;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const z = solver.zCenters[iz];
      if (z < line - CREST_WINDOW.seaward) continue;
      if (z > line + CREST_WINDOW.shoreward) break;
      const i = iz * solver.nx + column;
      const eta = solver.h[i] + solver.bed[i] - solver.restLevel;
      if (eta > highest) [highest, best] = [eta, z];
    }
    return best;
  }
}
