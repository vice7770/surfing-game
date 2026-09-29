/**
 * Dev only: what a surf zone's lip, tubes and whitewater did over a run, measured
 * the same way on either water tier, so the GPU tier (plan P6) can be held
 * against the CPU tier (`/gpu-check.html?mode=lips`). The two diverge wave by
 * wave (32-bit floats, chaotic breaking); their activity per minute should not.
 * Until 33fae37 the GPU tier threw no lips at all, and nothing noticed.
 */
import { SPRAY_STRIDE } from '../wave/SprayCloud';

/** Water thinner than this is swash, whose speed is not the flow's, m (the Reef's stability probes). */
export const PROBE_DEPTH = 0.05;
/** The Reef's stability probes guard at this speed, m/s (docs/research/teahupoo-reef-report.md). */
export const PROBE_SPEED = 20;
/**
 * A tier is silent on a metric when it shows none of it while the other makes at least this much a minute: a stray
 * event is not a silent tier (the Reef's Big swell spilled one roller a minute on the GPU and none on the CPU, beside
 * 486 throws a minute on each), while the GPU's missing lips were hundreds a minute.
 */
const SILENT_FLOOR = 3;
/** One tier more than this many times as busy as the other diverges… */
const DIVERGENCE = 2;
/** …once the busier makes at least this much of it per minute (events, or tubes or particles on average × 60 s). */
const DIVERGENCE_FLOOR = 10;

/** What a recorder reads from a surf zone after each step: a `SurfZoneSimulation` is one. */
export interface ActivitySource {
  readonly solver: {
    readonly nx: number;
    readonly time: number;
    readonly xCenters: ArrayLike<number>;
    readonly zCenters: ArrayLike<number>;
    readonly h: ArrayLike<number>;
    readonly qx: ArrayLike<number>;
    readonly qz: ArrayLike<number>;
    /** The jet plunge zone's holds (stage 2 only). */
    readonly plungeHold?: ArrayLike<number>;
    maxStableStep(): number;
  };
  readonly lipLaunches: number;
  readonly lipRollers: number;
  readonly lipImpacts: readonly { readonly kind?: number }[];
  readonly lip: { readonly tubeCount: number };
}

/** A spray cloud's live particles, their kind at `SPRAY_STRIDE` offset 5. */
export interface ParticleSource {
  readonly count: number;
  readonly particles: ArrayLike<number>;
}

/** One tier's run, totalled; "seconds" fields integrate a population over time (its mean is that over `seconds`). */
export interface TierActivity {
  /** Simulated time and steps recorded. */
  seconds: number;
  steps: number;
  /** Jets thrown with water, and breaks that spilled as a roller instead. */
  throws: number;
  rollers: number;
  /** Lip parcels that came down: a jet's water, and a splash-up's (G9). */
  jetLandings: number;
  splashLandings: number;
  /** Flying tubes (the tube table's rows) × s, and the most at once. */
  tubeSeconds: number;
  tubesPeak: number;
  /** Particles in the air × s: spray, mist, a closing tube's spray and mist, and foam-ball sprites (with their peak). */
  spraySeconds: number;
  mistSeconds: number;
  tubeSpraySeconds: number;
  foamBallSeconds: number;
  foamBallsPeak: number;
  /** Cells the jet plunge zone holds in shallow water × s, and the most at once. */
  plungeCellSeconds: number;
  plungePeak: number;
  /** The fastest water deeper than PROBE_DEPTH, m/s, where, when (solver time, s) and how deep. */
  fastest: { speed: number; x: number; z: number; time: number; depth: number };
  /** Steps that left water not finite or below zero, and the solver time of the first. */
  brokenSteps: number;
  firstBroken?: number;
  /** The smallest stable step the water allowed, s. */
  smallestStep: number;
}

/** A count over `seconds`, per minute. */
export function perMinute(count: number, seconds: number): number {
  return seconds > 0 ? (count * 60) / seconds : 0;
}

/** Records a surf zone's activity after each of its steps. */
export class TierRecorder {
  readonly activity: TierActivity = {
    seconds: 0, steps: 0, throws: 0, rollers: 0, jetLandings: 0, splashLandings: 0, tubeSeconds: 0, tubesPeak: 0,
    spraySeconds: 0, mistSeconds: 0, tubeSpraySeconds: 0, foamBallSeconds: 0, foamBallsPeak: 0, plungeCellSeconds: 0, plungePeak: 0,
    fastest: { speed: 0, x: 0, z: 0, time: 0, depth: 0 }, brokenSteps: 0, smallestStep: Infinity,
  };
  private launches: number;
  private rollers: number;

  constructor(private readonly zone: ActivitySource) {
    this.launches = zone.lipLaunches;
    this.rollers = zone.lipRollers;
  }

  /** The step just taken, `dt` s long, and the spray it left in the air (the runner's, when there is one). */
  record(dt: number, spray?: ParticleSource): void {
    const { zone, activity } = this;
    activity.seconds += dt;
    activity.steps += 1;
    activity.throws += zone.lipLaunches - this.launches;
    activity.rollers += zone.lipRollers - this.rollers;
    this.launches = zone.lipLaunches;
    this.rollers = zone.lipRollers;
    for (const impact of zone.lipImpacts) {
      if (impact.kind === 1) activity.splashLandings += 1;
      else activity.jetLandings += 1;
    }
    const tubes = zone.lip.tubeCount;
    activity.tubeSeconds += tubes * dt;
    activity.tubesPeak = Math.max(activity.tubesPeak, tubes);
    if (spray) this.recordSpray(dt, spray);
    this.recordWater(dt);
  }

  private recordSpray(dt: number, spray: ParticleSource): void {
    const { activity } = this;
    let foamBalls = 0;
    for (let k = 0; k < spray.count; k += 1) {
      const kind = spray.particles[k * SPRAY_STRIDE + 5];
      if (kind === 0) activity.spraySeconds += dt;
      else if (kind === 1) activity.mistSeconds += dt;
      else if (kind === 2) foamBalls += 1;
      else activity.tubeSpraySeconds += dt;
    }
    activity.foamBallSeconds += foamBalls * dt;
    activity.foamBallsPeak = Math.max(activity.foamBallsPeak, foamBalls);
  }

  private recordWater(dt: number): void {
    const { activity } = this;
    const { solver } = this.zone;
    const { h, qx, qz, nx, plungeHold } = solver;
    let broken = false;
    let held = 0;
    for (let i = 0; i < h.length; i += 1) {
      const depth = h[i];
      if (!Number.isFinite(depth + qx[i] + qz[i]) || depth < 0) {
        broken = true;
        continue;
      }
      if (plungeHold && plungeHold[i] > 0) held += 1;
      if (!(depth > PROBE_DEPTH)) continue;
      const speed = Math.hypot(qx[i], qz[i]) / depth;
      if (speed <= activity.fastest.speed) continue;
      activity.fastest = { speed, x: solver.xCenters[i % nx], z: solver.zCenters[Math.floor(i / nx)], time: solver.time, depth };
    }
    activity.plungeCellSeconds += held * dt;
    activity.plungePeak = Math.max(activity.plungePeak, held);
    if (broken) {
      activity.brokenSteps += 1;
      activity.firstBroken ??= solver.time;
    }
    const stable = solver.maxStableStep();
    if (stable < activity.smallestStep) activity.smallestStep = stable;
  }
}

/** Something one tier's run shows that the other's does not, or that neither should. */
export interface TierFinding {
  kind: 'silent' | 'diverges' | 'broken' | 'fast';
  metric: string;
  detail: string;
}

/** The activity compared across tiers, in the order the page lists it. */
export const COMPARED = [
  'throws', 'rollers', 'jetLandings', 'splashLandings', 'tubeSeconds', 'spraySeconds', 'mistSeconds', 'tubeSpraySeconds', 'foamBallSeconds', 'plungeCellSeconds',
] as const;

/**
 * What to look at in a CPU and a GPU run of the same sea: a metric one tier
 * shows and the other never does (a silent tier, as the GPU's lips were), one
 * more than twice as busy on one tier once there is enough of it, water that
 * broke, and water faster than the Reef's probes allow.
 */
export function compareTiers(cpu: TierActivity, gpu: TierActivity): TierFinding[] {
  const findings: TierFinding[] = [];
  for (const metric of COMPARED) {
    const onCpu = perMinute(cpu[metric], cpu.seconds);
    const onGpu = perMinute(gpu[metric], gpu.seconds);
    if ((onCpu > 0) !== (onGpu > 0) && Math.max(onCpu, onGpu) >= SILENT_FLOOR) {
      findings.push({ kind: 'silent', metric, detail: `${onCpu > 0 ? 'GPU' : 'CPU'} has none; the other ${(onCpu || onGpu).toFixed(1)}/min` });
    } else if (Math.max(onCpu, onGpu) >= DIVERGENCE_FLOOR && Math.max(onCpu, onGpu) > DIVERGENCE * Math.min(onCpu, onGpu)) {
      findings.push({ kind: 'diverges', metric, detail: `CPU ${onCpu.toFixed(1)}/min, GPU ${onGpu.toFixed(1)}/min` });
    }
  }
  for (const [tier, activity] of [['CPU', cpu], ['GPU', gpu]] as const) {
    if (activity.brokenSteps > 0) findings.push({ kind: 'broken', metric: 'water', detail: `${tier}: ${activity.brokenSteps} steps, first at ${activity.firstBroken?.toFixed(2)} s` });
  }
  for (const [tier, activity] of [['CPU', cpu], ['GPU', gpu]] as const) {
    const { fastest } = activity;
    if (fastest.speed > PROBE_SPEED) {
      findings.push({ kind: 'fast', metric: 'fastest', detail: `${tier}: ${fastest.speed.toFixed(1)} m/s at x ${fastest.x.toFixed(1)}, z ${fastest.z.toFixed(1)}, t ${fastest.time.toFixed(2)} s, ${fastest.depth.toFixed(2)} m deep` });
    }
  }
  return findings;
}
