import type { FrontPoint } from './BreakingFront';
import type { ProfileLibrary } from './ProfileLibrary';

export interface CarrierIncidentHistory {
  readonly otherId: number;
  readonly front: number;
  readonly boundSeconds: number;
  readonly minimumPacketAge: number;
  readonly potentiallyLive: boolean;
  readonly maxScale: number;
  readonly maxAuthoredTD: number;
  readonly partitions: number;
}

/** Dynamic exported evidence; none of these fields is an immutable point-identity fingerprint. */
export interface CarrierSupportHistory {
  readonly policy: 'bounded-C-incident-support/v1';
  readonly atTau: number;
  readonly solverTime: number;
  readonly ownPocketAlive: boolean;
  readonly retainedForGeometry: boolean;
  readonly geometricPaceActive: boolean;
  readonly state: 'own-pocket' | 'incident-support' | 'released';
  readonly incidents: readonly CarrierIncidentHistory[];
}

/** One authority for tracker claim/coast, crash placement, packet pace and exported carrier history. */
export function geometricPaceActive(point: FrontPoint): boolean {
  const own = point.jetPace !== undefined && point.jetUntil !== undefined && point.tau < point.jetUntil;
  const h = point.carrierSupport;
  return own || !!(h && h.policy === 'bounded-C-incident-support/v1' && h.atTau === point.tau && h.geometricPaceActive
    && point.jetPace !== undefined && point.jetBase !== undefined);
}

export function copyCarrierPoint(point: FrontPoint): FrontPoint {
  if (!point.carrierSupport) return { ...point };
  return { ...point, carrierSupport: { ...point.carrierSupport, incidents: point.carrierSupport.incidents.map(i => ({ ...i })) } };
}

/** Geometry only. It never sets jetUntil, rethrows water or changes physical void/strip expiry. */
export class CarrierSupport {
  constructor(private readonly library: ProfileLibrary, private readonly slope: number) {
    if (library.options.geometry !== 'bounded-C') throw new Error('Carrier support is C-only');
  }

  refresh(points: readonly FrontPoint[], time: number): void {
    if (!Number.isFinite(time)) throw new Error('Nonfinite carrier history epoch');
    const incident = new Map<FrontPoint, CarrierIncidentHistory[]>();
    for (let k = 0; k + 1 < points.length; k += 1) {
      const a = points[k], b = points[k + 1];
      if (a.front !== b.front || !(b.x > a.x)) continue;
      const bound = this.library.carrierRetirementBound(this.slope, a, b);
      // F32 packet ages can round downward. Retire only when both the actual and packet ages clear the bound.
      const minimumPacketAge = Math.min(a.tau, b.tau, Math.fround(a.tau), Math.fround(b.tau));
      if (!Number.isFinite(minimumPacketAge)) throw new Error('Nonfinite carrier support age');
      const potentiallyLive = minimumPacketAge < bound.seconds;
      const add = (p: FrontPoint, other: FrontPoint) => {
        const entries = incident.get(p) ?? [];
        entries.push({ otherId: other.id, front: p.front, boundSeconds: bound.seconds, minimumPacketAge, potentiallyLive,
          maxScale: bound.maxScale, maxAuthoredTD: bound.maxAuthoredTD, partitions: bound.partitions });
        incident.set(p, entries);
      };
      add(a, b); add(b, a);
    }
    for (const p of points) {
      if (p.jetPace === undefined) { if (p.carrierSupport) delete p.carrierSupport; continue; }
      if (![p.jetPace, p.jetBase, p.jetUntil, p.jetAt, p.tau].every(v => v !== undefined && Number.isFinite(v))) {
        throw new Error('Incomplete geometric carrier history');
      }
      const ownPocketAlive = p.tau < p.jetUntil!;
      const incidents = incident.get(p) ?? [];
      const retainedForGeometry = !ownPocketAlive && incidents.some(i => i.potentiallyLive);
      p.carrierSupport = { policy: 'bounded-C-incident-support/v1', atTau: p.tau, solverTime: time,
        ownPocketAlive, retainedForGeometry, geometricPaceActive: ownPocketAlive || retainedForGeometry,
        state: ownPocketAlive ? 'own-pocket' : retainedForGeometry ? 'incident-support' : 'released', incidents };
    }
  }

  /** Held points are not currently raw loft support; they keep only their individual pocket pace. */
  refreshHeld(points: readonly FrontPoint[], time: number): void {
    for (const p of points) this.refresh([p], time);
  }

  /**
   * A truly stalled, already physically expired component cannot coast forever inside the conservative bound.
   * Reuse the established 2-lifetime watchdog, now with the finite provider support bound and latest source epoch.
   * Drop the whole dependent raw component before drawing; never switch an endpoint to solver matching inside it.
   */
  stalledExpiredComponents(points: readonly FrontPoint[], time: number): { front: number; pointIds: number[]; boundSeconds: number; latestSourceTime: number }[] {
    const retired = [];
    let start = 0;
    while (start < points.length) {
      let end = start + 1;
      while (end < points.length && points[end].front === points[start].front) end += 1;
      const run = points.slice(start, end);
      if (run.some(p => p.carrierSupport?.retainedForGeometry)) {
        const ownAlive = run.some(p => p.tau < (p.jetUntil ?? (() => {
          const t = this.library.profileTimes({ slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth });
          return t.touchdownSeconds + t.collapseSeconds;
        })()));
        if (!ownAlive) {
          const boundSeconds = Math.max(...run.flatMap(p => p.carrierSupport?.incidents.map(i => i.boundSeconds) ?? []));
          const latestSourceTime = Math.max(...run.map(p => p.jetAt ?? p.broke));
          if (Number.isFinite(boundSeconds) && Number.isFinite(latestSourceTime) && time - latestSourceTime >= 2 * boundSeconds) {
            retired.push({ front: run[0].front, pointIds: run.map(p => p.id), boundSeconds, latestSourceTime });
          }
        }
      }
      start = end;
    }
    return retired;
  }
}
