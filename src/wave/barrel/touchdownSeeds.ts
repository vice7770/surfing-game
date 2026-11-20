import type { RollerSeeds } from '../SpillingRoller';
import type { FrontPoint } from './BreakingFront';

/** What the seeds read of a front point. */
export type SeedPoint = Pick<FrontPoint, 'front' | 'column' | 'z' | 'tau' | 'footHeight' | 'footDepth' | 'crashedAt' | 'jetReturned'>;

/**
 * The lens after a plunge (ruling 11, docs/research/after-tube-2026-11-11/README.md), where it differs from the
 * Canyon's spilling one (`ROLLER_DEFAULTS`, untouched):
 * - `lead`: it is seeded this long before its slice's touchdown, s (with the roof's last 0.2 s; provisional);
 * - `birthScale`: it starts part-grown: a plunge hands its lost energy to the roller's forward momentum at once
 *   (Svendsen 1984, ICCE 19, §5; the 0.5 is provisional);
 * - `growthDepths`: it grows over this many breaker depths of travel: one splash cycle's travel, c · 2√(2 H_b / g)
 *   ≈ 3 h_b (reasoned from Watanabe et al. 2005's cycle);
 * - `breakerHeight`: H_b over h_b, for that cycle's length, the time it is kept from shedding (0.85);
 * - `froudeBy`: its bore's Froude number is read from its height over its trough's depth (`RollerOptions.froudeBy`;
 *   ruling 12): behind the pool's reef the bed falls away under the bore, and the Canyon's reading from the two depths
 *   shed every lens at Fr 1.03 while the solver's own breaking was still on (B 0.46). Mutable for the probe.
 */
export const AFTER_TUBE: { lead: number; birthScale: number; growthDepths: number; breakerHeight: number; froudeBy: 'depths' | 'height' } = {
  lead: 0.2, birthScale: 0.5, growthDepths: 3, breakerHeight: 0.85, froudeBy: 'height',
};

/**
 * The after-tube whitewater's seeds (after-tube, 2026-11-11; `?afterTube=roller`; ruling 11): where a swept barrel's lip
 * touches down, its wave's crest per column, for the roller lens to be born on (`SpillingRoller.update`, as the Canyon's
 * is on its spilling front's crests). After a plunge the slice's own clock decides the birth (R3 §1.4): a point seeds
 * its column from `AFTER_TUBE.lead` before its touchdown (`touchdown`: its slice's, s of its clock), so the lens is under the
 * roof's end when the roof stops, and never under an open tube before that. A point whose jet went back to its crest
 * (the guard: its lip never plunged) seeds nothing. A wave is one front (`FrontPoint.front`). Read afresh each step; it
 * keeps nothing.
 */
export class TouchdownSeeds implements RollerSeeds {
  readonly waves: { id: number }[] = [];
  private readonly crests: Float64Array[] = [];

  constructor(private readonly columns: number, private readonly touchdown: (point: SeedPoint) => number) {}

  /** The seeds of this step's front points. */
  read(points: readonly SeedPoint[]): this {
    this.waves.length = 0;
    for (const p of points) {
      if (p.jetReturned || !(p.column >= 0 && p.column < this.columns) || !(p.z === p.z)) continue;
      if (p.crashedAt === undefined && !(p.tau >= this.touchdown(p) - AFTER_TUBE.lead)) continue;
      let k = 0;
      while (k < this.waves.length && this.waves[k].id !== p.front) k += 1;
      if (k === this.waves.length) {
        if (k === this.crests.length) this.crests.push(new Float64Array(this.columns));
        this.crests[k].fill(Number.NaN);
        this.waves.push({ id: p.front });
      }
      this.crests[k][p.column] = p.z;
    }
    return this;
  }

  crestAt(wave: number, column: number): number {
    if (!(wave >= 0 && wave < this.waves.length && column >= 0 && column < this.columns)) return Number.NaN;
    return this.crests[wave][column];
  }
}
