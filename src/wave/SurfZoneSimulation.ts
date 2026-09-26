import { createSpot, smoothstep, type SpotName, type SurfSpot } from './Bathymetry';
import { BoussinesqSolver } from './BoussinesqSolver';
import { BreakingModel, PeelTracker, breakerDepthFor, type PeelEstimate } from './Breaking';
import { GRAVITY, shallowWaterWaveNumber } from './dispersion';
import { FoamField, type FoamDecay } from './FoamField';
import { PlungingLip, lipThrow } from './PlungingLip';
import { focusX } from './Refraction';
import { JET_SPEED_RATIO, breakerForm, crestMotion } from './CrestKinematics';
import { SeaState } from './SeaState';
import { SeaStateBoundary } from './SeaStateBoundary';
import type { LipImpact } from './SprayCloud';
import { ShallowWaterSolver, stretchedEdges } from './ShallowWaterSolver';
import { BREAKER_INDEX, describeSwell, type BreakerType } from './SwellReadout';
import { planSetRun, warmStart, type SetRunPlan } from './warmStart';

export interface SurfZoneConfig {
  spot: SpotName;
  seed: number;
  /** Offshore significant wave height Hs, m. */
  significantHeight: number;
  peakPeriod: number;
  /** Mean direction from shore-normal, degrees (positive toward +x). */
  directionDegrees: number;
  /** cos-2s spreading exponent s. */
  spreading: number;
  /** Relative width of the frequencies arriving together from a distant storm; omitted for the full band. */
  bandwidth?: number;
  /** Still-water level above datum, m. */
  tide: number;
  componentCount?: number;
  /** Along-shore window width, m. */
  alongShore?: number;
  dx?: number;
  fineSpacing?: number;
  coarseSpacing?: number;
  spinUpPeriods?: number;
  /** Seconds between hand-over and the next set peak at the zone. */
  lead?: number;
  /** Local wind, m/s: positive onshore, negative offshore. */
  windSpeed?: number;
  /** Kennedy onset threshold as a fraction of √(gh); defaults per spot. */
  breakingOnset?: number;
  /** Foam e-folding times; defaults per spot. */
  foamDecay?: FoamDecay;
  /** Solver stage: 1 shallow water, 2 Madsen–Sørensen Boussinesq with Kennedy breaking (the default). */
  stage?: 1 | 2;
  /** Where stage 2 water steps: 'auto' on the GPU when a host offers one (the worker, with WebGPU), 'cpu' always on the CPU. */
  compute?: 'auto' | 'cpu';
}

/** Along-shore window width unless the config says otherwise, m. */
export const ALONG_SHORE = 160;

/** Swell components the tank's sea is built from, unless the config says otherwise. */
export const SEA_COMPONENTS = 24;

/** The stage 2 water stepped elsewhere (the GPU, plan P6): it advances the solver's own state in place. */
export interface SolverDevice {
  step(dt: number): Promise<void>;
  dispose(): void;
}

export interface RenderGrid {
  xMin: number;
  zMin: number;
  spacing: number;
  nx: number;
  nz: number;
}

/** Wave-tank layout across shore, m (z increases toward the beach). */
export const TANK = { offshore: -330, zoneInner: -270, blendEnd: -190, fineFrom: -150, shore: 30 };

/** Flat tank bed offshore of each spot's blend, m below datum. */
export const OFFSHORE_DEPTH: Record<SpotName, number> = { beach: 5, point: 8, reef: 10, canyon: 5 };

/** Kennedy onset per spot (plan Q27): 0.35√(gh) on the barred beach, 0.65√(gh) on plain or steep beds. */
export const BREAKING_ONSET: Record<SpotName, number> = { beach: 0.35, point: 0.65, reef: 0.65, canyon: 0.65 };

/**
 * Foam e-folding times per spot, s (plan §2.4, G4). Dense whitewater decays like
 * oceanic whitecap foam, whose effective decay time is 1.4–4.8 s (Callaghan,
 * Deane & Stokes 2012). Surfactants stabilise a residual lace for much longer
 * (Callaghan et al. 2013, 2017); its times are game values, longest in the
 * beach's sandy surf and shortest in the reef's clear water.
 */
export const FOAM_DECAY: Record<SpotName, FoamDecay> = {
  beach: { dense: 3, residual: 20 },
  point: { dense: 3, residual: 12 },
  reef: { dense: 3, residual: 8 },
  canyon: { dense: 3, residual: 15 },
};

/**
 * Wind shifts breaking onset (plan Q23), as a factor on the breaking thresholds
 * like the breaker index γ. With u = U/√(g h_b), positive onshore: γ(1 − 0.10u)
 * onshore and γ(1 + 0.05|u|) offshore, clamped to 0.6–1.1. Lab studies (Douglass
 * 1990 to U/√(gh) = ±2.3; King & Baker 1996 to ±1.1; reviewed by Zdyrski &
 * Feddersen 2022) find onshore wind lowers H_b/h_b by up to ~40 % and offshore
 * wind raises it by up to ~10 %, mostly by moving the breaker depth.
 */
export function windOnsetScale(windSpeed: number, breakerDepth: number): number {
  const u = windSpeed / Math.sqrt(GRAVITY * Math.max(0.1, breakerDepth));
  return u >= 0 ? Math.max(0.6, 1 - 0.1 * u) : Math.min(1.1, 1 - 0.05 * u);
}

/**
 * The seeded sea a surf zone is built from, at the tank's offshore depth. Pure,
 * so the renderer can rebuild the same sea (for the far field) outside the worker.
 */
export function surfZoneSea(config: SurfZoneConfig): SeaState {
  return SeaState.fromSpectrum({
    significantHeight: config.significantHeight,
    peakPeriod: config.peakPeriod,
    direction: (config.directionDegrees * Math.PI) / 180,
    spreading: config.spreading,
    componentCount: config.componentCount ?? SEA_COMPONENTS,
    depth: OFFSHORE_DEPTH[config.spot] + config.tide,
    bandwidth: config.bandwidth,
  }, config.seed, shallowWaterWaveNumber);
}

/**
 * How each spot finds its take-off transect: straight out from the window's
 * centre, or where its bed gathers the swell. A canyon's peak sits beside the
 * shadow it casts (as measured over the Scripps canyon, Magne et al. 2007),
 * and moves with the swell's direction and period.
 */
export const TAKE_OFF: Record<SpotName, 'centre' | 'focus'> = { beach: 'centre', point: 'centre', reef: 'centre', canyon: 'focus' };

/** A focus take-off stays this far inside the window's open along-shore edges, m. */
export const TAKE_OFF_EDGE_MARGIN = 30;

/**
 * Where the rider waits for waves: on the spot's take-off transect, where the
 * still depth first reaches the shoaled breaker depth. A focus transect is
 * where linear rays from the relaxation zone gather most densely at the break
 * line (`focusX`), inside the window's open edges.
 */
export function takeOffPoint(config: SurfZoneConfig): { x: number; z: number } {
  const spot = createSpot(config.spot, config.seed);
  const offshoreDepth = OFFSHORE_DEPTH[config.spot];
  const target = breakerDepthFor(config.significantHeight, offshoreDepth + config.tide);
  const breakZ = (x: number) => {
    // Scan the whole simulated bed from the relaxation zone inward.
    for (let z = TANK.zoneInner; z < TANK.shore; z += 0.5) {
      if (tankDepth(spot, offshoreDepth, x, z) + config.tide <= target) return z;
    }
    return TANK.fineFrom;
  };
  const reach = Math.max(0, (config.alongShore ?? ALONG_SHORE) / 2 - TAKE_OFF_EDGE_MARGIN);
  if (TAKE_OFF[config.spot] === 'centre' || reach === 0) return { x: 0, z: breakZ(0) };
  const bed = (x: number, z: number) => tankDepth(spot, offshoreDepth, x, z) + config.tide;
  const swell = { period: config.peakPeriod, direction: (config.directionDegrees * Math.PI) / 180 };
  const x = focusX(bed, swell, TANK.zoneInner, breakZ(0), -reach, reach);
  return { x, z: breakZ(x) };
}

/** Spot seabed with a flat offshore floor under the relaxation zone, blended over TANK.zoneInner…blendEnd. */
export function tankDepth(spot: SurfSpot, offshoreDepth: number, x: number, z: number): number {
  const toSpot = smoothstep(TANK.zoneInner, TANK.blendEnd, z);
  return offshoreDepth + (spot.depthAt(x, z) - offshoreDepth) * toSpot;
}

const WET = 0.01;

/**
 * Physical surf zone for one spot: a seeded sea enters through an offshore
 * relaxation zone into the stretched solver (stage 2 Boussinesq by default,
 * stage 1 shallow water on request), which starts from a warm WKB field a
 * set's lead time before its peak.
 */
export class SurfZoneSimulation {
  readonly spot: SurfSpot;
  readonly sea: SeaState;
  readonly solver: ShallowWaterSolver;
  readonly plan: SetRunPlan;
  readonly breaking: BreakingModel;
  /** Ballistic lip parcels thrown by plunging breakers (plan Q12). */
  readonly lip: PlungingLip;
  /** Lip parcels that landed during the latest step: where spray splashes up (G6). */
  readonly lipImpacts: LipImpact[] = [];
  /** Foam carried by the flow (plan §2.4): made by bores and lip splashes. */
  readonly foam: FoamField;
  /** Lip throws so far, and their total volume, m³. */
  lipLaunches = 0;
  lipVolume = 0;
  /** Breaks since the start that threw a plunging jet, and that spilled as a roller (plan P7). */
  lipJets = 0;
  lipRollers = 0;
  readonly peel: PeelTracker;
  lastStepMs = 0;
  /** Most offshore breaking cell per column last step (Infinity when none). */
  private readonly outerBreak: Float64Array;
  /** The first pass only records the spin-up's bores; onsets count from the next step. */
  private onsetsArmed = false;
  /** When each column last started a wave that could throw a lip, s. */
  private lastThrow!: Float64Array;
  /** When each column last started breaking a new wave, s. */
  private lastOnset!: Float64Array;
  private readonly seaTimeOffset: number;
  private takeOff?: { x: number; z: number };
  private mapping?: {
    grid: RenderGrid; xMin: number; columns: Int32Array; columnWeights: Float64Array;
    rows: Int32Array; rowWeights: Float64Array;
  };
  /** Per-cell velocity scratch for `writeUniformFlow`. */
  private velocityX?: Float64Array;
  private velocityZ?: Float64Array;

  constructor(readonly config: SurfZoneConfig) {
    this.spot = createSpot(config.spot, config.seed);
    const offshoreDepth = OFFSHORE_DEPTH[config.spot];
    const alongShore = config.alongShore ?? ALONG_SHORE;
    const dx = config.dx ?? 1;
    const grid = {
      nx: Math.round(alongShore / dx), xMin: -alongShore / 2, dx, xBoundary: 'open' as const,
      zEdges: stretchedEdges(TANK.offshore, TANK.shore, TANK.fineFrom, config.fineSpacing ?? 1, config.coarseSpacing ?? 4),
    };
    const depthAt = (x: number, z: number) => tankDepth(this.spot, offshoreDepth, x, z);
    const onset = config.breakingOnset ?? BREAKING_ONSET[config.spot];
    this.solver = (config.stage ?? 2) === 2
      ? new BoussinesqSolver(grid, depthAt, { waterLevel: config.tide, breaking: { onset } })
      : new ShallowWaterSolver(grid, depthAt, { waterLevel: config.tide });
    this.sea = surfZoneSea(config);
    if (this.solver instanceof BoussinesqSolver) this.solver.onsetScale = windOnsetScale(config.windSpeed ?? 0, this.breakerDepth());
    const spinUp = (config.spinUpPeriods ?? 2) * config.peakPeriod;
    this.plan = planSetRun(this.sea, 0, TANK.zoneInner, 0, config.lead ?? 25, spinUp);
    this.seaTimeOffset = this.plan.warmStartSeaTime;
    warmStart(this.solver, this.sea, { referenceZ: TANK.zoneInner, seaTime: this.plan.warmStartSeaTime });
    this.solver.addRelaxationZone(new SeaStateBoundary(
      this.solver, this.sea, this.solver.zoneWeightsAlongZ(TANK.zoneInner, TANK.offshore), this.seaTimeOffset,
    ));
    // Settle the nonlinear shape at the CFL limit, re-checking stability every quarter second.
    while (this.solver.time < spinUp - 1e-9) this.solver.step(Math.min(0.25, spinUp - this.solver.time));
    this.breaking = new BreakingModel(this.solver, { onset });
    this.breaking.onsetScale = windOnsetScale(config.windSpeed ?? 0, this.breakerDepth());
    this.breaking.update(0);
    this.peel = new PeelTracker(this.solver.xCenters, config.peakPeriod);
    this.outerBreak = new Float64Array(this.solver.nx).fill(Infinity);
    this.lip = new PlungingLip(this.solver);
    this.foam = new FoamField(this.solver, config.foamDecay ?? FOAM_DECAY[config.spot]);
    this.lip.onLand = (x, z, volume, vx, vy, vz) => {
      this.foam.addSplash(x, z, volume);
      this.lipImpacts.push({ x, z, volume, vx, vy, vz });
    };
    this.lastThrow = new Float64Array(this.solver.nx).fill(-Infinity);
    this.lastOnset = new Float64Array(this.solver.nx).fill(-Infinity);
  }

  get seaTime(): number {
    return this.solver.time + this.seaTimeOffset;
  }

  /** Seconds until the planned set peaks at the offshore zone line (negative once it has passed). */
  get timeToSet(): number {
    return this.plan.setPeakSeaTime - this.seaTime;
  }

  get windowXMin(): number {
    return this.solver.xCenters[0] - 0.5 * this.solver.dx;
  }

  /** Steps the water on a device instead of the CPU solver, when set (`stepAsync`). */
  device?: SolverDevice;

  step(dt: number): void {
    const start = performance.now();
    this.lipImpacts.length = 0;
    this.solver.step(dt);
    this.afterWater(dt, start);
  }

  /** `step` with the water on the device when there is one; a failing device is dropped for the CPU solver. */
  async stepAsync(dt: number): Promise<void> {
    const { device } = this;
    if (!device) {
      this.step(dt);
      return;
    }
    const start = performance.now();
    this.lipImpacts.length = 0;
    try {
      await device.step(dt);
    } catch (error) {
      console.warn('Surf zone device step failed; stepping on the CPU from here.', error);
      device.dispose();
      this.device = undefined;
      this.solver.step(dt);
    }
    this.afterWater(dt, start);
  }

  /** Everything a step does once the water has moved: breaking, lip, foam. */
  private afterWater(dt: number, start: number): void {
    this.breaking.update(dt);
    this.markBreakingOnsets();
    this.lip.step(dt);
    this.foam.update(dt, this.breaking.strength);
    this.lastStepMs = performance.now() - start;
  }

  /** Still depth where the shoaled swell breaks, h_b = (Hs·D^¼/γ)^⅘, m. */
  breakerDepth(): number {
    return breakerDepthFor(this.config.significantHeight, this.sea.depth);
  }

  /** Bore speed at the break, √(g h_b), m/s. */
  breakerCelerity(): number {
    return Math.sqrt(GRAVITY * this.breakerDepth());
  }

  /** Breaker-point Iribarren number from the bed slope at the break line and H_b = γ h_b. */
  iribarren(): { value: number; type: BreakerType } {
    const point = this.breakPoint();
    const offshoreDepth = OFFSHORE_DEPTH[this.config.spot];
    const bed = (z: number) => tankDepth(this.spot, offshoreDepth, point.x, z);
    const slope = Math.abs(bed(point.z - 2) - bed(point.z + 2)) / 4;
    const depth = this.breakerDepth();
    const readout = describeSwell({ height: BREAKER_INDEX * depth, period: this.config.peakPeriod, depth, bedSlope: slope });
    return { value: readout.iribarren, type: readout.breakerType };
  }

  peelEstimate(): PeelEstimate | undefined {
    return this.peel.estimate(this.solver.time, this.breakerCelerity());
  }

  /** Share of wet surf-zone cells breaking with B > 0.3. */
  breakingFraction(): number {
    const { solver } = this;
    let wet = 0;
    let breaking = 0;
    for (let iz = solver.rowBelow(TANK.fineFrom); iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        if (solver.h[i] <= WET) continue;
        wet += 1;
        if (this.breaking.strength[i] > 0.3) breaking += 1;
      }
    }
    return wet > 0 ? breaking / wet : 0;
  }

  /**
   * A new wave starts breaking in a column when its most offshore breaking cell
   * jumps seaward by more than 5 m. Bores still crossing the inner surf zone
   * therefore do not hide the next onset.
   */
  private markBreakingOnsets(): void {
    const { solver } = this;
    const firstRow = solver.rowBelow(TANK.fineFrom);
    for (let column = 0; column < solver.nx; column += 1) {
      let outer = Infinity;
      let row = -1;
      for (let iz = firstRow; iz < solver.nz; iz += 1) {
        if (this.breaking.strength[iz * solver.nx + column] > 0.3) {
          outer = solver.zCenters[iz];
          row = iz;
          break;
        }
      }
      const previous = this.outerBreak[column];
      this.outerBreak[column] = outer;
      if (this.onsetsArmed && outer < previous - 5 && this.newBreaker(column, row)) {
        this.lastOnset[column] = solver.time;
        this.peel.markOnset(column, solver.time);
        this.throwLip(column, row);
      }
    }
    this.onsetsArmed = true;
  }

  /** Where each column's outermost breaking cell lies across shore, z (Infinity when the column is not breaking). */
  outerBreakZ(column: number): number {
    return this.outerBreak[column];
  }

  /**
   * Whether a column's break at `row` starts a new wave: at most one per
   * 0.7 Tp, and only where the still depth is at least 0.4 h_b. Shallower
   * first breaks are swash bores reaching the shore after a lull; counting
   * them read every spot's peel as mixed peaks.
   */
  private newBreaker(column: number, row: number): boolean {
    const { solver } = this;
    if (solver.time - this.lastOnset[column] < 0.7 * this.config.peakPeriod) return false;
    return solver.restLevel - solver.bed[row * solver.nx + column] >= 0.4 * this.breakerDepth();
  }

  /**
   * Throw a lip where a new wave starts breaking in `column`, if the local
   * breaker-point Iribarren number says plunging. The crest is the highest
   * surface up to four cells seaward of the outermost breaking cell; H_b = γ h
   * there, and the slope is the local bed gradient. A column throws at most once
   * per 0.7 Tp (one wave), and only where the still depth is at least 0.4 h_b:
   * shallower first breaks are swash bores reaching the shore after a lull, not
   * new breakers, and a lip there would carry almost no water (volume ∝ H²).
   */
  private throwLip(column: number, row: number): void {
    const { solver } = this;
    const { nx, nz, bed, zCenters } = solver;
    if (solver.time - this.lastThrow[column] < 0.7 * this.config.peakPeriod) return;
    let crest = row * nx + column;
    for (let iz = row - 1; iz >= Math.max(1, row - 4); iz -= 1) {
      if (solver.surfaceAt(iz * nx + column) > solver.surfaceAt(crest)) crest = iz * nx + column;
    }
    const crestRow = Math.floor(crest / nx);
    const stillDepth = solver.restLevel - bed[crest];
    if (!(stillDepth >= 0.4 * this.breakerDepth()) || crestRow < 1 || crestRow > nz - 2) return;
    this.lastThrow[column] = solver.time;
    const slopeZ = (bed[crest + nx] - bed[crest - nx]) / (zCenters[crestRow + 1] - zCenters[crestRow - 1]);
    const slopeX = column > 0 && column < nx - 1 ? (bed[crest + 1] - bed[crest - 1]) / (2 * solver.dx) : 0;
    const breakerHeight = BREAKER_INDEX * stillDepth;
    const deepWavelength = (GRAVITY * this.config.peakPeriod ** 2) / (2 * Math.PI);
    const iribarren = Math.hypot(slopeX, slopeZ) / Math.sqrt(breakerHeight / deepWavelength);
    const form = breakerForm(iribarren);
    if (form === 'roller') this.lipRollers += 1;
    if (form !== 'jet') return;
    const shape = lipThrow({
      iribarren,
      breakerHeight,
      windOverCelerity: (this.config.windSpeed ?? 0) / Math.sqrt(GRAVITY * stillDepth),
      width: solver.dx,
    });
    // The jet leaves the way the crest travels, at its speed, measured from the crest's own motion (plan P7).
    const motion = crestMotion(solver, crest);
    if (!shape || !motion) return;
    const speed = JET_SPEED_RATIO * motion.speed;
    const along = motion.direction;
    const thrown = this.lip.launch(crest, { x: along.x * speed, z: along.z * speed }, solver.surfaceAt(crest), shape.volume, motion.speed);
    if (thrown > 0) {
      this.lipLaunches += 1;
      this.lipJets += 1;
      this.lipVolume += thrown;
    }
  }

  /** Water surface elevation, m; on dry land this is the bed. */
  heightAt(x: number, z: number): number {
    return this.solver.sampleCentered(this.solver.h, x, z) + this.bedAt(x, z);
  }

  bedAt(x: number, z: number): number {
    return this.solver.sampleCentered(this.solver.bed, x, z);
  }

  /** Uniform render grid covering the window and the whole tank. */
  renderGrid(spacing: number): RenderGrid {
    const width = this.solver.nx * this.solver.dx;
    return {
      xMin: this.windowXMin,
      zMin: TANK.offshore,
      spacing,
      nx: Math.round(width / spacing) + 1,
      nz: Math.round((TANK.shore - TANK.offshore) / spacing) + 1,
    };
  }

  /**
   * Resample the water to interleaved (height, foam) per render node. Dry nodes
   * sit 5 cm under the bed so the seabed mesh hides them. Foam is the foam
   * field's covered fraction.
   */
  writeUniformSurface(data: Float32Array, grid: RenderGrid): void {
    const mapping = this.mappingFor(grid);
    const { h, bed, nx } = this.solver;
    const { dense, residual } = this.foam;
    const { columns, columnWeights, rows, rowWeights } = mapping;
    for (let r = 0; r < grid.nz; r += 1) {
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      for (let c = 0; c < grid.nx; c += 1) {
        const i = row + columns[c];
        const tx = columnWeights[c];
        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        const depth = h[i] * w00 + h[i + 1] * w10 + h[i + nx] * w01 + h[i + nx + 1] * w11;
        const bottom = bed[i] * w00 + bed[i + 1] * w10 + bed[i + nx] * w01 + bed[i + nx + 1] * w11;
        const k = r * grid.nx + c;
        if (depth > WET) {
          data[k * 2] = depth + bottom;
          data[k * 2 + 1] = (dense[i] + residual[i]) * w00 + (dense[i + 1] + residual[i + 1]) * w10
            + (dense[i + nx] + residual[i + nx]) * w01 + (dense[i + nx + 1] + residual[i + nx + 1]) * w11;
        } else {
          data[k * 2] = bottom - 0.05;
          data[k * 2 + 1] = 0;
        }
      }
    }
  }

  /** Resample the depth-averaged current to interleaved (u, w) per render node, m/s; 0 on dry nodes. */
  writeUniformFlow(data: Float32Array, grid: RenderGrid): void {
    const { columns, columnWeights, rows, rowWeights } = this.mappingFor(grid);
    const { h, qx, qz, nx } = this.solver;
    if (!this.velocityX || this.velocityX.length !== h.length) {
      this.velocityX = new Float64Array(h.length);
      this.velocityZ = new Float64Array(h.length);
    }
    const u = this.velocityX;
    const w = this.velocityZ!;
    for (let i = 0; i < h.length; i += 1) {
      const wet = h[i] > WET;
      u[i] = wet ? qx[i] / h[i] : 0;
      w[i] = wet ? qz[i] / h[i] : 0;
    }
    for (let r = 0; r < grid.nz; r += 1) {
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      for (let c = 0; c < grid.nx; c += 1) {
        const i = row + columns[c];
        const tx = columnWeights[c];
        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        const k = (r * grid.nx + c) * 2;
        const depth = h[i] * w00 + h[i + 1] * w10 + h[i + nx] * w01 + h[i + nx + 1] * w11;
        if (depth <= WET) {
          data[k] = 0;
          data[k + 1] = 0;
          continue;
        }
        data[k] = u[i] * w00 + u[i + 1] * w10 + u[i + nx] * w01 + u[i + nx + 1] * w11;
        data[k + 1] = w[i] * w00 + w[i + 1] * w10 + w[i + nx] * w01 + w[i + nx + 1] * w11;
      }
    }
  }

  /** Resample the bed elevation to one value per render node, with the same interpolation as `writeUniformSurface`. */
  writeUniformBed(data: Float32Array, grid: RenderGrid): void {
    const { columns, columnWeights, rows, rowWeights } = this.mappingFor(grid);
    const { bed, nx } = this.solver;
    for (let r = 0; r < grid.nz; r += 1) {
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      for (let c = 0; c < grid.nx; c += 1) {
        const i = row + columns[c];
        const tx = columnWeights[c];
        data[r * grid.nx + c] = (bed[i] * (1 - tx) + bed[i + 1] * tx) * (1 - tz) + (bed[i + nx] * (1 - tx) + bed[i + nx + 1] * tx) * tz;
      }
    }
  }

  /** The take-off: where the break line crosses the spot's take-off transect (see `takeOffPoint`), the camera's break focus. */
  breakPoint(): { x: number; z: number } {
    this.takeOff ??= takeOffPoint(this.config);
    return { ...this.takeOff };
  }

  private mappingFor(grid: RenderGrid) {
    const { solver } = this;
    let mapping = this.mapping;
    if (!mapping || mapping.grid.nx !== grid.nx || mapping.grid.nz !== grid.nz
      || mapping.grid.spacing !== grid.spacing || mapping.grid.zMin !== grid.zMin) {
      const rows = new Int32Array(grid.nz);
      const rowWeights = new Float64Array(grid.nz);
      for (let r = 0; r < grid.nz; r += 1) {
        const z = grid.zMin + r * grid.spacing;
        const iz = solver.rowBelow(z);
        rows[r] = iz;
        rowWeights[r] = Math.min(1, Math.max(0, (z - solver.zCenters[iz]) / (solver.zCenters[iz + 1] - solver.zCenters[iz])));
      }
      mapping = {
        grid: { ...grid }, xMin: Number.NaN, columns: new Int32Array(grid.nx), columnWeights: new Float64Array(grid.nx), rows, rowWeights,
      };
      this.mapping = mapping;
    }
    if (mapping.xMin !== grid.xMin) {
      for (let c = 0; c < grid.nx; c += 1) {
        const gx = Math.min(solver.nx - 1, Math.max(0, (grid.xMin + c * grid.spacing - solver.xCenters[0]) / solver.dx));
        const ix = Math.min(solver.nx - 2, Math.floor(gx));
        mapping.columns[c] = ix;
        mapping.columnWeights[c] = gx - ix;
      }
      mapping.xMin = grid.xMin;
    }
    return mapping;
  }
}
