/**
 * A held breath (the wipeout spec, Part B; the gameplay survey §6), provisional
 * design parameters from Guimard et al. 2021's untrained adults:
 * - `rest`, s: how long a breath lasts held under doing nothing (static apnea
 *   68 ± 24 s; most people cannot hold a full breath much past a minute);
 * - effort x (% of peak) shortens it as e^(−`effortFall` x): their dynamic
 *   apneas fit 56.4·e^(−0.025 x) s, so thrashing at half effort lasts about 17 s;
 * - `recover`, s: a few breaths at the surface refill it;
 * - `relaxed` and `working`, %: the effort of letting the water have you, and
 *   of swimming, diving or swimming up (the spec's higher cost).
 */
export const BREATH = { rest: 65, effortFall: 0.025, recover: 8, relaxed: 10, working: 50 } as const;

/** The breath a surfer holds: 1 full to 0 gone, draining under water and refilling at the surface. */
export class Breath {
  level = 1;

  reset(): void {
    this.level = 1;
  }

  /** `dt` s with the head under water or not, at `effort` % of peak. */
  step(dt: number, underwater: boolean, effort: number): void {
    if (underwater) this.level -= dt / (BREATH.rest * Math.exp(-BREATH.effortFall * Math.max(0, effort)));
    else this.level = Math.min(1, this.level + dt / BREATH.recover);
  }

  get empty(): boolean {
    return this.level <= 0;
  }
}
