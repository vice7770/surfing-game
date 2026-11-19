import type { BrokenLimit } from '../wave/SurfZoneRunner';
import type { SpotName } from '../wave/Bathymetry';
import type { RideResult } from './RideTracker';
import { DEFAULT_CONDITIONS, type SurfConditions } from './SurfConditions';

/** A ride as the logbook keeps it: the summary, where and in what, when (epoch ms), and its score when the player asked for one (P9). */
export interface LoggedRide extends RideResult {
  spot: SpotName;
  conditions: SurfConditions;
  seed: number;
  at: number;
  score?: number;
  /** Surfed in an online room (N1). */
  online?: boolean;
}

export type BestKind = 'distance' | 'topSpeed' | 'seconds' | 'score';
export type SpotBests = Partial<Record<BestKind, number>>;

export const LOGBOOK_KEY = 'breakline.logbook.v1';
export const LOGBOOK_SIZE = 50;

const SPOTS: readonly SpotName[] = ['beach', 'point', 'reef', 'canyon', 'padang', 'pool'];
const OUTCOMES = ['wipeout', 'complete', 'ended'];
const BEST_KINDS: readonly BestKind[] = ['distance', 'topSpeed', 'seconds', 'score'];
const BROKEN_LIMITS: readonly BrokenLimit['limit'][] = ['margin', 'grip', 'knee', 'posture'];

type Loose = Record<string, unknown>;
const record = (value: unknown): Loose => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Loose : {});
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * A stored fall (the Logbook's fall readout), or nothing. Every ride logged before the readout shipped has no `fall`
 * at all, and a stored one that is not whole is dropped rather than part-read: the readout then says it was not
 * recorded, which is true, instead of showing a zero for a number nobody measured.
 */
function validFall(value: unknown): BrokenLimit | undefined {
  const fall = record(value);
  if (!BROKEN_LIMITS.includes(fall.limit as BrokenLimit['limit'])) return undefined;
  if (!finite(fall.speed) || !finite(fall.steer) || typeof fall.across !== 'boolean') return undefined;
  return { limit: fall.limit as BrokenLimit['limit'], across: fall.across, speed: fall.speed, steer: fall.steer };
}

function validRide(value: unknown): LoggedRide | undefined {
  const ride = record(value);
  if (!SPOTS.includes(ride.spot as SpotName) || !OUTCOMES.includes(ride.outcome as string) || typeof ride.reason !== 'string') return undefined;
  if (![ride.distance, ride.topSpeed, ride.seconds, ride.seed, ride.at].every(finite)) return undefined;
  const conditions = record(ride.conditions);
  const { score, online, fall: stored, ...rest } = ride as unknown as LoggedRide;
  const fall = validFall(stored);
  return {
    ...rest,
    conditions: { ...DEFAULT_CONDITIONS, ...(conditions as Partial<SurfConditions>) },
    ...(finite(score) ? { score } : {}),
    ...(online === true ? { online } : {}),
    ...(fall ? { fall } : {}),
  };
}

function validBests(value: unknown): SpotBests {
  const source = record(value);
  const bests: SpotBests = {};
  for (const kind of BEST_KINDS) {
    const best = source[kind];
    if (finite(best) && best >= 0) bests[kind] = best;
  }
  return bests;
}

/**
 * The player's rides (plan P8): the latest `LOGBOOK_SIZE`, and each spot's bests
 * kept apart so they outlive the recent list. Stored in SI; shown in the player's units.
 */
export class Logbook {
  private entries: LoggedRide[] = [];
  private readonly best: Partial<Record<SpotName, SpotBests>> = {};

  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const stored = record(JSON.parse(storage?.getItem(LOGBOOK_KEY) ?? 'null'));
      if (Array.isArray(stored.recent)) {
        this.entries = stored.recent.map(validRide).filter((ride): ride is LoggedRide => ride !== undefined).slice(0, LOGBOOK_SIZE);
      }
      const bests = record(stored.bests);
      for (const spot of SPOTS) if (spot in bests) this.best[spot] = validBests(bests[spot]);
    } catch {
      this.entries = [];
    }
  }

  get recent(): readonly LoggedRide[] {
    return this.entries;
  }

  bests(spot: SpotName): SpotBests {
    return { ...this.best[spot] };
  }

  /** Log a ride; returns the bests it set at its spot. */
  add(ride: LoggedRide): BestKind[] {
    this.entries = [ride, ...this.entries].slice(0, LOGBOOK_SIZE);
    const bests = this.best[ride.spot] ?? {};
    const records = BEST_KINDS.filter((kind) => (ride[kind] ?? -Infinity) > (bests[kind] ?? -Infinity));
    for (const kind of records) bests[kind] = ride[kind];
    this.best[ride.spot] = bests;
    try {
      this.storage?.setItem(LOGBOOK_KEY, JSON.stringify({ recent: this.entries, bests: this.best }));
    } catch {
      // Storage may be unavailable or full; the logbook still works for this visit.
    }
    return records;
  }
}
