import { PADANG, REEF, createSpot, padangForeFootZ, padangReefAt, reefLedgeAt, smoothstep, type SpotName, type SurfSpot } from './Bathymetry';
import { BoussinesqSolver, madsenSorensenWaveNumber } from './BoussinesqSolver';
import { BreakingModel, PeelTracker, breakerDepthFor, type PeelEstimate } from './Breaking';
import { GRAVITY, shallowWaterWaveNumber, shoalingCoefficient, waveKinematics } from './dispersion';
import { SETS_OVER_TYPICAL, komarGaughan } from './surfForecast';
import { AERATION, AerationField } from './AerationField';
import { FoamField, boreDissipation, type FoamDecay } from './FoamField';
import { PlungingLip, lipThrow } from './PlungingLip';
import { TUBE_CAPACITY, carveGrid } from './tubeTable';
import { focusX } from './Refraction';
import { breakerForm, crestMotion, submergedCrest, waveHeightAt, type CrestMotion } from './CrestKinematics';
import { jetFlightTime, orthogonalGradient, reefOverturn, tubeGeometry, type TubeGeometry } from './Overturn';
import { SeaState } from './SeaState';
import { SurfMeter, TAKE_OFF_BAND, type BreakingWave } from './SurfMeter';
import { SeaStateBoundary } from './SeaStateBoundary';
import { SideFeed } from './SideFeed';
import type { SurfZoneState } from './surfZoneState';
import type { LipImpact } from './SprayCloud';
import { OPEN_EDGE_REACH, ShallowWaterSolver, stretchedEdges } from './ShallowWaterSolver';
import { BREAKER_INDEX, describeSwell, type BreakerType } from './SwellReadout';
import { planSetRun, warmStart, type SetRunPlan } from './warmStart';

/** Sea water, kg/m³ (the lip's impact energy for the aeration, G9). */
const WATER_DENSITY = 1025;

/** One lip throw (the tube report's measure, Part B). */
export interface LipThrowEvent {
  /** The jet's water the overturn asked for, and what the crest gave, m³. */
  asked: number;
  thrown: number;
  /** The breaking wave's height, m. */
  height: number;
  /** Where along shore the crest threw, m. */
  x: number;
  tube: TubeGeometry;
  /** A reef break's vortex ratio (Mead & Black 2001), within the range they measured, and the gradient it climbs. */
  vortexRatio?: number;
  orthogonalGradient?: number;
  /** The jet's speed over its crest's. */
  speedOverCrest: number;
}

export interface SurfZoneConfig {
  spot: SpotName;
  seed: number;
  /** Significant wave height Hs, m: the buoy's, in deep water, unless `heightAt` is 'edge'. */
  significantHeight: number;
  /**
   * Where Hs is given (the wave-sizes spec): in deep water, shoaled to the tank's edge by linear theory
   * (the default), or at the edge (Practice's groundswell). The Canyon always takes it at the edge.
   */
  heightAt?: 'deep' | 'edge';
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
  /** Online (spec N1): warm start so the sea, once spun up, sits at this sea time (the room's clock). */
  startSeaTime?: number;
}

/** Columns at each open along-shore edge where no lip is thrown: the reach of the solver's stencils. */
const OPEN_EDGE_COLUMNS = OPEN_EDGE_REACH;

/** How far a breaking crest's path is followed for the gradient it climbs, m: past any window's bounds, which end it first. */
const REEF_PATH_REACH = 400;

/** Along-shore window width unless the config or the spot says otherwise, m. */
export const ALONG_SHORE = 160;

/** The window's along-shore width, m: the config's, else Padang Padang's own (its peak clear of the side feed), else ALONG_SHORE. */
export function alongShoreOf(config: Pick<SurfZoneConfig, 'spot' | 'alongShore'>): number {
  return config.alongShore ?? (config.spot === 'padang' ? PADANG.alongShore : ALONG_SHORE);
}

/**
 * Spots that always run stage 2 (the Teahupo'o Reef and Padang Padang specs): shallow water steepens waves far
 * too early in the Reef's 30 m water and under Padang Padang's 16–18 s swells, so a machine that cannot keep up
 * runs them slower than real time instead.
 */
export const STAGE_2_ONLY: readonly SpotName[] = ['reef', 'padang'];

/** The solver stage a spot runs on: the asked one, or 2 where the spot needs it. */
export function solverStage(spot: SpotName, stage: 1 | 2 | undefined): 1 | 2 {
  return STAGE_2_ONLY.includes(spot) ? 2 : stage ?? 2;
}

/** Swell components the tank's sea is built from, unless the config says otherwise. */
export const SEA_COMPONENTS = 24;

/** The stage 2 water stepped elsewhere (the GPU, plan P6): it advances the solver's own state in place. */
export interface SolverDevice {
  step(dt: number): Promise<void>;
  dispose(): void;
}

/** A surf zone built spun up (on the CPU, at once), or only warm-started, to spin up later on its device (`spinUp`). */
export type SurfZoneStart = 'spun-up' | 'warm';

export interface RenderGrid {
  xMin: number;
  zMin: number;
  spacing: number;
  nx: number;
  nz: number;
}

/** Wave-tank layout across shore, m (z increases toward the beach). */
export const TANK = { offshore: -330, zoneInner: -270, blendEnd: -190, fineFrom: -150, shore: 30 };

/** Flat tank bed offshore of each spot's blend, m below datum: Padang Padang's is the deep water beyond its forereef, read live for the sweep. */
export const OFFSHORE_DEPTH: Record<SpotName, number> = {
  beach: 5, point: 8, reef: REEF.deep, canyon: 5, get padang() { return PADANG.deep; },
};

/** A tank's layout across shore, m, and the still depth of its flat edge under the relaxation zone, m below datum. */
export interface TankLayout {
  offshore: number;
  zoneInner: number;
  blendEnd: number;
  fineFrom: number;
  shore: number;
  edgeDepth: number;
}

/** A big day's edge is this many buoy heights deep, so the zone's linear sea stays near linear (the wave-sizes spec). */
export const EDGE_DEPTH_PER_HS = 3.3;
/** …and at most this share of the deep-water wavelength, keeping kh ≤ 2.5 where the solver's dispersion holds. */
export const EDGE_DEPTH_MAX_WAVELENGTHS = 0.4;
/** A deeper tank's relaxation zone is at least this share of the edge wavelength long. */
export const ZONE_WAVELENGTHS = 0.75;
/** The fine zone starts this far seaward of where the sets break, m. */
export const SET_FINE_MARGIN = 40;
/** The furthest a tank reaches offshore, m. */
const TANK_REACH = -3000;
/** A bed that gets no more than FLAT_RISE deeper anywhere within FLAT_REACH seaward has levelled off, m: the edge stops there. */
const FLAT_REACH = 300;
const FLAT_RISE = 0.1;

/**
 * The tank for a swell (the wave-sizes spec): today's for small days, Practice and the Canyon; for a big day,
 * its edge where the take-off transect's bed first reaches the edge depth (or levels off short of it), and far
 * enough out that the blend onto the spot's bed lies 20 m seaward of the fine zone, which starts 40 m seaward
 * of where the sets break (Komar–Gaughan's H1/10 over the breaker index). The relaxation zone is at least 60 m
 * and 0.75 of the edge wavelength long; the edge takes the bed's depth there, within the kh limit.
 */
export function tankLayout(config: SurfZoneConfig): TankLayout {
  const today: TankLayout = { ...TANK, edgeDepth: OFFSHORE_DEPTH[config.spot] };
  if (config.spot === 'canyon') return today;
  // The Reef's edge is always deep (REEF.deep, the Teahupo'o Reef spec): today's inner tank, whose forereef
  // lies inside it, with the zone lengthened to absorb its long waves.
  if (config.spot === 'reef') {
    const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength);
    return { ...today, offshore: TANK.zoneInner - zone };
  }
  // Padang Padang's edge is the deep water beyond its forereef (the Padang Padang spec): injected on a 10 m platform, a
  // 16 s swell (Ursell ~40) kept changing shape for 150–200 m and broke deeper at the reef's far end. Its 1:19 wedge is
  // wide, so the fine zone starts SET_FINE_MARGIN seaward of where its sets first reach their breaker depth anywhere in
  // the window (never deeper than 0.9 of the edge's water), the blend lies beyond the forereef's foot, and the zone
  // absorbs its long waves.
  if (config.spot === 'padang') {
    const spot = createSpot('padang', config.seed);
    const sets = Math.min(0.9 * (today.edgeDepth + config.tide), (SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod)) / BREAKER_INDEX);
    const reach = alongShoreOf(config) / 2;
    let setBreak = TANK.fineFrom + SET_FINE_MARGIN;
    for (let x = -reach; x <= reach; x += 5) {
      let z = TANK.shore;
      while (z > TANK_REACH && spot.depthAt(x, z) + config.tide < sets) z -= 1;
      setBreak = Math.min(setBreak, z);
    }
    const fineFrom = Math.min(TANK.fineFrom, setBreak - SET_FINE_MARGIN);
    const blend = TANK.blendEnd - TANK.zoneInner;
    const foreFoot = padangForeFootZ() - PADANG.foreRounding;
    const zoneInner = Math.min(fineFrom - 20 - blend, foreFoot - blend);
    const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength);
    return { offshore: zoneInner - zone, zoneInner, blendEnd: zoneInner + blend, fineFrom, shore: TANK.shore, edgeDepth: today.edgeDepth };
  }
  const deepWavelength = (GRAVITY * config.peakPeriod ** 2) / (2 * Math.PI);
  const wanted = Math.max(today.edgeDepth, Math.min(EDGE_DEPTH_PER_HS * config.significantHeight, EDGE_DEPTH_MAX_WAVELENGTHS * deepWavelength));
  if (wanted <= today.edgeDepth) return today;
  const spot = createSpot(config.spot, config.seed);
  const depth = (z: number) => spot.depthAt(0, z);
  const deepens = (z: number) => {
    for (let ahead = 10; ahead <= FLAT_REACH; ahead += 10) if (depth(z - ahead) - depth(z) >= FLAT_RISE) return true;
    return false;
  };
  // Out along the take-off transect until the bed is deep enough, or levels off short of it (a bar's flank is not level).
  let reached = TANK.zoneInner;
  while (depth(reached) < wanted && reached > TANK_REACH && deepens(reached)) reached -= 1;
  if (Math.min(wanted, depth(reached)) <= today.edgeDepth) return today;
  // Coming in from there, the sets break where the bed first reaches their breaker depth.
  const setDepth = (SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod)) / BREAKER_INDEX;
  let setBreak = reached;
  while (depth(setBreak) > setDepth && setBreak < TANK.fineFrom) setBreak += 1;
  const fineFrom = Math.min(TANK.fineFrom, setBreak - SET_FINE_MARGIN);
  const blend = TANK.blendEnd - TANK.zoneInner;
  const zoneInner = Math.min(reached, fineFrom - 20 - blend);
  const edgeDepth = Math.min(depth(zoneInner), EDGE_DEPTH_MAX_WAVELENGTHS * deepWavelength);
  const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, edgeDepth).wavelength);
  return { offshore: zoneInner - zone, zoneInner, blendEnd: zoneInner + blend, fineFrom, shore: TANK.shore, edgeDepth };
}

/**
 * Spots whose tank sides are fed with the incoming sea (the wave-sizes work: open sides drained a directional sea).
 * Padang Padang only, for now (the owner, 2026-09-30): its 320 m window and its peak are laid out around the feed, and
 * on the other spots the feed is not finished (on a 40 m window it ran the Reef's Big swell to 64 m/s, and it moves
 * their take-offs), so they keep main's open sides until the feed's own rollout.
 */
export const SIDE_FEED_SPOTS: readonly SpotName[] = ['padang'];

/** Kennedy onset per spot (plan Q27): 0.35√(gh) on the barred beach, 0.65√(gh) on plain or steep beds. */
export const BREAKING_ONSET: Record<SpotName, number> = { beach: 0.35, point: 0.65, reef: 0.65, canyon: 0.65, padang: 0.65 };

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
  // A reef's foam lasts at least as long as the Beach's (the advisor's Foam tab; Callaghan et al. 2012, 2013).
  padang: { dense: 3, residual: 20 },
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
 * Spots that take their swell at the tank's edge, as before the wave-sizes work: the Canyon (its seas are the
 * riding reference and Surf School's). The Reef's 30 m edge takes the buoy's deep-water swell shoaled to it.
 */
const EDGE_SWELL_SPOTS: readonly SpotName[] = ['canyon'];

/** The sea's Hs at the tank's edge, m: the buoy's deep-water height shoaled by linear theory, unless given at the edge. */
export function edgeHeight(config: SurfZoneConfig, edgeDepth = OFFSHORE_DEPTH[config.spot]): number {
  if (EDGE_SWELL_SPOTS.includes(config.spot) || config.heightAt === 'edge') return config.significantHeight;
  return config.significantHeight * shoalingCoefficient(config.peakPeriod, edgeDepth + config.tide);
}

/**
 * The seeded sea a surf zone is built from, at the tank's edge depth. Pure,
 * so the renderer can rebuild the same sea (for the far field) outside the worker.
 * A deeper tank's sea travels at the stage 2 solver's own (Madsen–Sørensen)
 * speeds, so its zone forces the waves the solver carries; today's tanks keep
 * the shallow-water numbers they were built with.
 */
export function surfZoneSea(config: SurfZoneConfig): SeaState {
  const tank = tankLayout(config);
  const deeper = tank.edgeDepth > OFFSHORE_DEPTH[config.spot] && solverStage(config.spot, config.stage) === 2;
  return SeaState.fromSpectrum({
    significantHeight: edgeHeight(config, tank.edgeDepth),
    peakPeriod: config.peakPeriod,
    direction: (config.directionDegrees * Math.PI) / 180,
    spreading: config.spreading,
    componentCount: config.componentCount ?? SEA_COMPONENTS,
    depth: tank.edgeDepth + config.tide,
    bandwidth: config.bandwidth,
  }, config.seed, deeper || STAGE_2_ONLY.includes(config.spot) ? madsenSorensenWaveNumber : shallowWaterWaveNumber);
}

/**
 * How each spot finds its take-off transect: straight out from the window's
 * centre, or where its bed gathers the swell. A canyon's peak sits beside the
 * shadow it casts (as measured over the Scripps canyon, Magne et al. 2007),
 * and moves with the swell's direction and period.
 */
export const TAKE_OFF: Record<SpotName, 'centre' | 'focus' | 'peak'> = { beach: 'centre', point: 'centre', reef: 'peak', canyon: 'focus', padang: 'peak' };

/**
 * The breaker index a big day's take-off is placed with, per spot: the size report measures where each spot's
 * sets break and sets these so the take-off lands there (the wave-sizes spec). Today's tanks keep BREAKER_INDEX;
 * the Reef's is the Reef rework's to set. The Point's and the Beach's are fitted to their sets' measured breaks at
 * 14 s (Point Hs 2–4 m: 1.05–1.16; Beach Hs 2–3 m: 1.08–1.20), before the side feed; they are refitted after it.
 * Padang Padang's take-off follows PADANG_TAKE_OFF_INDEX instead.
 */
export const TAKE_OFF_INDEX: Record<SpotName, number> = { beach: 1.14, point: 1.13, reef: BREAKER_INDEX, canyon: BREAKER_INDEX, padang: BREAKER_INDEX };

/**
 * Padang Padang's take-off index against the swell's height at its edge, m: on its wedge a bigger set breaks shallower
 * for its height, so one index seated Practice's and Small's take-offs where their sets broke but left Medium's 23 m
 * and Big's 89 m seaward of theirs. The size report's sets broke, at mid tide, where γ is 0.57, 0.70, 0.90 and 1.20
 * for Practice, Small, Medium and Big (Hs at the edge 0.60, 1.18, 2.21 and 3.89 m): a least-squares line through
 * them (provisional; refit when the sizes change).
 */
export const PADANG_TAKE_OFF_INDEX = { intercept: 0.47, perMetre: 0.19 } as const;

/** Where a peak take-off waits along shore: at the Reef's or Padang Padang's own peak. */
export function peakTakeOffX(spot: SpotName): number {
  return spot === 'padang' ? PADANG.takeOffX : REEF.takeOffX;
}

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
  const tank = tankLayout(config);
  const deeper = tank.edgeDepth > OFFSHORE_DEPTH[config.spot];
  const height = edgeHeight(config, tank.edgeDepth);
  const index = config.spot === 'padang' ? PADANG_TAKE_OFF_INDEX.intercept + PADANG_TAKE_OFF_INDEX.perMetre * height
    : deeper ? TAKE_OFF_INDEX[config.spot] : BREAKER_INDEX;
  const target = breakerDepthFor(height, tank.edgeDepth + config.tide, index);
  const breakZ = (x: number) => {
    // Scan the whole simulated bed from the relaxation zone inward.
    for (let z = tank.zoneInner; z < tank.shore; z += 0.5) {
      if (tankDepth(spot, tank.edgeDepth, x, z, tank) + config.tide <= target) return z;
    }
    return tank.fineFrom;
  };
  const reach = Math.max(0, alongShoreOf(config) / 2 - TAKE_OFF_EDGE_MARGIN);
  if (TAKE_OFF[config.spot] === 'centre' || reach === 0) return { x: 0, z: breakZ(0) };
  // The Reef's and Padang Padang's riders wait at their peak, where each wave first breaks.
  if (TAKE_OFF[config.spot] === 'peak') {
    const x = Math.min(reach, Math.max(-reach, peakTakeOffX(config.spot)));
    return { x, z: breakZ(x) };
  }
  const bed = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank) + config.tide;
  const swell = { period: config.peakPeriod, direction: (config.directionDegrees * Math.PI) / 180 };
  const x = focusX(bed, swell, tank.zoneInner, breakZ(0), -reach, reach);
  return { x, z: breakZ(x) };
}

/** Spot seabed with a flat floor under the relaxation zone at the edge depth, blended over the layout's zoneInner…blendEnd. */
export function tankDepth(
  spot: SurfSpot, edgeDepth: number, x: number, z: number, layout: Pick<TankLayout, 'zoneInner' | 'blendEnd'> = TANK,
): number {
  const toSpot = smoothstep(layout.zoneInner, layout.blendEnd, z);
  return edgeDepth + (spot.depthAt(x, z) - edgeDepth) * toSpot;
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
  /** The tank this swell needs (the wave-sizes spec). */
  readonly tank: TankLayout;
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
  /** G9: the air breaking drives into the water. */
  readonly aeration: AerationField;
  /** Lip throws so far, and their total volume, m³. */
  lipLaunches = 0;
  lipVolume = 0;
  /** Breaks since the start that threw a plunging jet, and that spilled as a roller (plan P7). */
  lipJets = 0;
  lipRollers = 0;
  /** Each throw, for reports: the jet asked for and thrown, the wave, its void and, for a reef break, its vortex ratio. */
  onThrow?: (event: LipThrowEvent) => void;
  readonly peel: PeelTracker;
  /** The waves breaking at the take-off, as surf reports measure them (the wave-sizes spec). */
  readonly surf: SurfMeter;
  /** Called with every wave measured starting to break, anywhere in the window (reports listen here). */
  onBreak?: (wave: BreakingWave) => void;
  lastStepMs = 0;
  /** Most offshore breaking cell per column last step (Infinity when none). */
  private readonly outerBreak: Float64Array;
  /** The first pass only records the spin-up's bores; onsets count from the next step. */
  private onsetsArmed = false;
  /** When each column last started a wave that could throw a lip, s. */
  private lastThrow!: Float64Array;
  /** When each column last started breaking a new wave, s. */
  private lastOnset!: Float64Array;
  /** Sea time at solver time 0, s: set by the warm start, or taken over with a handed-over sea (spec N1). */
  private seaTimeOffset: number;
  private readonly boundary: SeaStateBoundary;
  /** The incoming sea fed into the window's sides (the wave-sizes spec): open sides drained a directional sea. */
  private readonly sideFeed?: SideFeed;
  private takeOff?: { x: number; z: number };
  private mapping?: {
    grid: RenderGrid; xMin: number; columns: Int32Array; columnWeights: Float64Array;
    rows: Int32Array; rowWeights: Float64Array;
  };
  /** Per-cell velocity scratch for `writeUniformFlow`. */
  private velocityX?: Float64Array;
  private velocityZ?: Float64Array;
  /** Each cell's void fraction, for `writeUniformAeration`. */
  private voidFractions?: Float64Array;

  /** Solver seconds of spin-up that settle the warm-started sea's nonlinear shape. */
  private readonly spinUpSeconds: number;

  constructor(readonly config: SurfZoneConfig, start: SurfZoneStart = 'spun-up') {
    this.spot = createSpot(config.spot, config.seed);
    const tank = tankLayout(config);
    this.tank = tank;
    const offshoreDepth = tank.edgeDepth;
    const alongShore = alongShoreOf(config);
    const dx = config.dx ?? 1;
    const grid = {
      nx: Math.round(alongShore / dx), xMin: -alongShore / 2, dx, xBoundary: 'open' as const,
      zEdges: stretchedEdges(tank.offshore, tank.shore, tank.fineFrom, config.fineSpacing ?? 1, config.coarseSpacing ?? 4),
    };
    const depthAt = (x: number, z: number) => tankDepth(this.spot, offshoreDepth, x, z, tank);
    const onset = config.breakingOnset ?? BREAKING_ONSET[config.spot];
    this.solver = solverStage(config.spot, config.stage) === 2
      ? new BoussinesqSolver(grid, depthAt, { waterLevel: config.tide, breaking: { onset } })
      : new ShallowWaterSolver(grid, depthAt, { waterLevel: config.tide });
    this.sea = surfZoneSea(config);
    if (this.solver instanceof BoussinesqSolver) this.solver.onsetScale = windOnsetScale(config.windSpeed ?? 0, this.breakerDepth());
    const spinUp = (config.spinUpPeriods ?? 2) * config.peakPeriod;
    this.plan = planSetRun(this.sea, 0, tank.zoneInner, 0, config.lead ?? 25, spinUp);
    this.seaTimeOffset = config.startSeaTime !== undefined ? config.startSeaTime - spinUp : this.plan.warmStartSeaTime;
    warmStart(this.solver, this.sea, { referenceZ: tank.zoneInner, seaTime: this.seaTimeOffset });
    this.boundary = new SeaStateBoundary(
      this.solver, this.sea, this.solver.zoneWeightsAlongZ(tank.zoneInner, tank.offshore), this.seaTimeOffset,
    );
    this.solver.addRelaxationZone(this.boundary);
    if (SIDE_FEED_SPOTS.includes(config.spot)) {
      this.sideFeed = new SideFeed(this.solver, this.sea, { referenceZ: tank.zoneInner, timeOffset: this.seaTimeOffset });
      this.solver.addRelaxationZone(this.sideFeed);
    }
    this.spinUpSeconds = spinUp;
    // Nothing below reads the water, so all of it can be built before the spin-up.
    this.breaking = new BreakingModel(this.solver, { onset });
    this.breaking.onsetScale = windOnsetScale(config.windSpeed ?? 0, this.breakerDepth());
    // The Reef's peel is its ledge's: breaks past it (the pass, the lagoon's beach face) are not its wave.
    // Padang Padang's is its reef's, from the peak to the channel.
    const xCenters = this.solver.xCenters;
    const ridden = config.spot === 'reef' ? reefLedgeAt : config.spot === 'padang' ? padangReefAt : undefined;
    this.peel = new PeelTracker(xCenters, config.peakPeriod, undefined, ridden && ((column) => ridden(xCenters[column])));
    this.outerBreak = new Float64Array(this.solver.nx).fill(Infinity);
    this.lip = new PlungingLip(this.solver);
    this.foam = new FoamField(this.solver, config.foamDecay ?? FOAM_DECAY[config.spot]);
    this.aeration = new AerationField(this.solver, { period: config.peakPeriod });
    this.lip.onLand = (x, z, volume, vx, vy, vz, flight) => {
      this.foam.addSplash(x, z, volume);
      this.lipImpacts.push({ x, z, volume, vx, vy, vz, whole: flight?.volume ?? volume, kind: flight?.kind ?? 0 });
      // Its impact's energy drives air down in proportion to how far it fell (G9).
      const drop = flight ? Math.max(0.1, flight.launch.y - flight.y) : 1;
      this.aeration.addPlunge(x, z, 0.5 * WATER_DENSITY * volume * (vx * vx + vy * vy + vz * vz), AERATION.plungeDepth * drop);
      // Where it lands the water is an impact, not a dispersive wave: its wave's young roller is shallow water for a
      // while (a splash-up's short fall's zone lies inside its jet's), never back past where it left the crest.
      if (this.solver instanceof BoussinesqSolver) {
        const speed = Math.hypot(vx, vz);
        const flown = flight && speed > 0 ? ((x - flight.launch.x) * vx + (z - flight.launch.z) * vz) / speed : Infinity;
        this.solver.holdPlunge(x, z, vx, vz, flight && flight.waveHeight > 0 ? flight.waveHeight : drop, flown);
      }
    };
    // A collapsing tube's air that does not blow out breaks into bubbles (G9).
    this.lip.onAir = (x, z, volume, penetration) => this.aeration.addAir(x, z, volume, penetration);
    this.lastThrow = new Float64Array(this.solver.nx).fill(-Infinity);
    this.lastOnset = new Float64Array(this.solver.nx).fill(-Infinity);
    const takeOff = this.breakPoint();
    this.surf = new SurfMeter([{ xMin: takeOff.x - TAKE_OFF_BAND, xMax: takeOff.x + TAKE_OFF_BAND }], config.peakPeriod);
    if (start === 'spun-up') {
      while (this.spinUpLeft() > 0) this.solver.step(this.spinUpStep());
      this.breaking.update(0);
    }
  }

  /**
   * Spin a `'warm'`-built surf zone up: on its device when it has one (the GPU
   * is several times faster), else on the CPU. A failing device is dropped and
   * the CPU finishes from where it stopped.
   */
  async spinUp(): Promise<void> {
    while (this.spinUpLeft() > 0) {
      const dt = this.spinUpStep();
      const { device } = this;
      if (!device) {
        this.solver.step(dt);
        continue;
      }
      try {
        await device.step(dt);
      } catch (error) {
        console.warn('Surf zone device failed during the spin-up; finishing it on the CPU.', error);
        device.dispose();
        this.device = undefined;
        this.solver.step(dt);
      }
    }
    this.breaking.update(0);
  }

  private spinUpLeft(): number {
    return this.spinUpSeconds - 1e-9 - this.solver.time;
  }

  /**
   * The next spin-up step: one substep at the CFL limit, re-checked every time. A trough draining a
   * shallow reef can shrink the stable step fivefold within a quarter second, and a stale bound diverges.
   */
  private spinUpStep(): number {
    return Math.min(this.solver.maxStableStep(), this.spinUpSeconds - this.solver.time);
  }

  /** The arrays that carry the sea's history (the handover's state probe found them; spec N1), by name. */
  private stateArrays(): Record<string, Float64Array> {
    const { solver } = this;
    const arrays: Record<string, Float64Array> = {
      h: solver.h, qx: solver.qx, qz: solver.qz,
      'foam.dense': this.foam.dense, 'foam.residual': this.foam.residual,
      // G9: the air breaking drove into the water, which draws the churn.
      'aeration.air': this.aeration.air, 'aeration.depth': this.aeration.depth,
      outerBreak: this.outerBreak, lastThrow: this.lastThrow, lastOnset: this.lastOnset,
    };
    if (solver instanceof BoussinesqSolver) {
      arrays.breakingStrength = solver.breakingStrength;
      arrays.breakingAge = solver.breakingAge;
      arrays.plungeHold = solver.plungeHold;
      const { predictor } = solver;
      if (predictor) {
        arrays['predictor.x'] = predictor.x;
        arrays['predictor.z'] = predictor.z;
      }
    }
    return arrays;
  }

  /**
   * This sea's state for a player joining the room late (spec N1: the sea
   * handover): the water, its breaking and foam, the lip in the air, and the
   * clock, copied. A sea built from the same room config and given it with
   * `importState` steps on exactly as this one does.
   */
  exportState(): SurfZoneState {
    const arrays = Object.fromEntries(Object.entries(this.stateArrays()).map(([name, array]) => [name, array.slice()]));
    return {
      nx: this.solver.nx, nz: this.solver.nz, solverTime: this.solver.time, seaTimeOffset: this.seaTimeOffset, arrays,
      counters: { lipLaunches: this.lipLaunches, lipVolume: this.lipVolume, lipJets: this.lipJets, lipRollers: this.lipRollers, onsetsArmed: this.onsetsArmed },
      lip: this.lip.exportState(),
    };
  }

  /** Takes over another player's sea (`exportState`): this sea must be built from the same room config. */
  importState(state: SurfZoneState): void {
    const { solver } = this;
    if (state.nx !== solver.nx || state.nz !== solver.nz) throw new Error(`A sea state from another tank (${state.nx}×${state.nz}, not ${solver.nx}×${solver.nz})`);
    const arrays = this.stateArrays();
    for (const [name, values] of Object.entries(state.arrays)) {
      const target = arrays[name];
      if (!target || target.length !== values.length) throw new Error(`A sea state from another tank: ${name} does not fit`);
      target.set(values);
    }
    // The turbulence is not handed over (it never feeds back into the water): the breaking stirs it afresh.
    this.aeration.turbulence.fill(0);
    solver.time = state.solverTime;
    // The outer break line came over as the donor last measured it, so the copy watches for new breakers when the
    // donor does (a wave starting to break then throws on both). A spun-up donor that has not stepped yet does not:
    // its line is unmeasured. States from before the flag was handed over had always stepped.
    this.onsetsArmed = state.counters.onsetsArmed ?? state.solverTime > 0;
    // The surf is measured afresh from here (the wave-sizes spec): its waves belong to the sea that was replaced.
    this.surf.clear();
    this.seaTimeOffset = state.seaTimeOffset;
    this.boundary.timeOffset = state.seaTimeOffset;
    if (this.sideFeed) this.sideFeed.timeOffset = state.seaTimeOffset;
    this.lipLaunches = state.counters.lipLaunches;
    this.lipVolume = state.counters.lipVolume;
    this.lipJets = state.counters.lipJets;
    this.lipRollers = state.counters.lipRollers;
    this.lip.importState(state.lip);
    if (solver instanceof BoussinesqSolver) solver.invalidateDeviceLayout();
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
    this.aerateBores(dt);
    this.aeration.update(dt);
    this.lastStepMs = performance.now() - start;
  }

  /** Still depth where the shoaled swell breaks, h_b = (Hs·D^¼/γ)^⅘, m. */
  breakerDepth(): number {
    return breakerDepthFor(edgeHeight(this.config, this.tank.edgeDepth), this.sea.depth);
  }

  /** Bore speed at the break, √(g h_b), m/s. */
  breakerCelerity(): number {
    return Math.sqrt(GRAVITY * this.breakerDepth());
  }

  /** Breaker-point Iribarren number from the bed slope at the break line and H_b = γ h_b. */
  iribarren(): { value: number; type: BreakerType } {
    const point = this.breakPoint();
    const bed = (z: number) => tankDepth(this.spot, this.tank.edgeDepth, point.x, z, this.tank);
    const slope = Math.abs(bed(point.z - 2) - bed(point.z + 2)) / 4;
    const depth = this.breakerDepth();
    const overCrest = submergedCrest((ahead) => bed(point.z + ahead) + this.config.tide, depth, slope);
    const readout = describeSwell({ height: BREAKER_INDEX * depth, period: this.config.peakPeriod, depth, bedSlope: slope, submergedCrest: overCrest });
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
    for (let iz = solver.rowBelow(this.tank.fineFrom); iz < solver.nz; iz += 1) {
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
    const firstRow = solver.rowBelow(this.tank.fineFrom);
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
        this.peel.markOnset(column, solver.time, outer);
        this.measureBreak(column, row);
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
   * Measure a wave starting to break in `column` (the wave-sizes spec): its crest is the highest surface up to
   * four cells seaward of the outermost breaking cell, as for the lip, and its face runs from that crest to the
   * lowest water within half a wavelength ahead (√(g h) Tp / 2 at the crest's still depth).
   */
  private measureBreak(column: number, row: number): void {
    const { solver } = this;
    const { nx } = solver;
    let crest = row * nx + column;
    for (let iz = row - 1; iz >= Math.max(1, row - 4); iz -= 1) {
      if (solver.surfaceAt(iz * nx + column) > solver.surfaceAt(crest)) crest = iz * nx + column;
    }
    const stillDepth = Math.max(WET, solver.restLevel - solver.bed[crest]);
    const wave: BreakingWave = {
      time: solver.time,
      x: solver.xCenters[column],
      z: solver.zCenters[Math.floor(crest / nx)],
      face: waveHeightAt(solver, crest, 0.5 * this.config.peakPeriod * Math.sqrt(GRAVITY * stillDepth)),
    };
    this.surf.add(wave);
    this.onBreak?.(wave);
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
    // The window's along-shore edges are open: their columns are what the boundary copies, within the
    // solver stencils' two columns. Lip water and momentum dropped there ran the oblique Reef away (Part B).
    if (column < OPEN_EDGE_COLUMNS || column >= nx - OPEN_EDGE_COLUMNS) return;
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
    const slope = Math.hypot(slopeX, slopeZ);
    const x = solver.xCenters[column];
    const overCrest = submergedCrest(
      (ahead) => solver.restLevel - solver.sampleCentered(bed, x, zCenters[crestRow] + ahead), stillDepth, Math.abs(slopeZ),
    );
    // A break over a submerged crest is a reef break: its shape follows Mead & Black by the gradient it climbs
    // along its travel (the Teahupo'o Reef, Part B); every other break keeps the plane-slope rule.
    const iribarren = slope / Math.sqrt(breakerHeight / deepWavelength);
    let motion: CrestMotion | undefined;
    let height = 0;
    let orthogonal: number | undefined;
    // Mead & Black's fit is of plunging waves: a spilling break over a crest (a bar's) stays a roller.
    if (overCrest && iribarren >= 0.4) {
      motion = crestMotion(solver, crest);
      if (!motion) return;
      height = this.breakingWaveHeight(crest, motion);
      const gradient = this.orthogonalGradient(x, zCenters[crestRow], motion, height);
      if (reefOverturn(gradient, edgeHeight(this.config, this.tank.edgeDepth) / (this.tank.edgeDepth + this.config.tide))) orthogonal = gradient;
    }
    const form = orthogonal !== undefined ? 'jet' : breakerForm(iribarren);
    if (form === 'roller') this.lipRollers += 1;
    if (form !== 'jet') return;
    if (!motion) {
      motion = crestMotion(solver, crest);
      if (!motion) return;
      height = this.breakingWaveHeight(crest, motion);
    }
    const shape = lipThrow({
      iribarren,
      slope,
      // The overturn fits' H0/h0: the incoming sea's height over the tank's offshore depth.
      nonlinearity: edgeHeight(this.config, this.tank.edgeDepth) / (this.tank.edgeDepth + this.config.tide),
      breakerHeight: height,
      windOverCelerity: (this.config.windSpeed ?? 0) / Math.sqrt(GRAVITY * stillDepth),
      width: solver.dx,
      reef: orthogonal !== undefined ? { orthogonalGradient: orthogonal } : undefined,
    });
    if (!shape) return;
    // The jet leaves the way the crest travels, measured from the crest's own motion, and outruns it
    // by the speed that flies it over its overturn's void (plan P7).
    const speed = motion.speed + shape.relativeSpeed;
    const along = motion.direction;
    // It keeps pouring from the crest until it lands, as measured jets do (Erinin et al. 2023).
    const thrown = this.lip.launch(
      crest, { x: along.x * speed, z: along.z * speed }, solver.surfaceAt(crest), shape.volume, motion.speed, tubeGeometry(shape.shape, height),
      jetFlightTime(shape.shape, height), height,
    );
    this.onThrow?.({
      asked: shape.volume, thrown, height, x, tube: tubeGeometry(shape.shape, height), vortexRatio: shape.reef?.vortexRatio, orthogonalGradient: orthogonal,
      speedOverCrest: speed / motion.speed,
    });
    if (thrown > 0) {
      this.lipLaunches += 1;
      this.lipJets += 1;
      this.lipVolume += thrown;
    }
  }

  /** The overturn scales with the wave the solver has: its crest over the trough half a wavelength ahead. */
  private breakingWaveHeight(crest: number, motion: CrestMotion): number {
    return waveHeightAt(this.solver, crest, 0.5 * motion.speed * this.config.peakPeriod);
  }

  /**
   * The gradient a breaking crest climbs, as Mead & Black (2001) measured it: along its travel, across the band
   * about its breaking depth (H / 0.78), over the window's own seabed (not the level strips at its open edges).
   */
  private orthogonalGradient(x: number, z: number, motion: CrestMotion, height: number): number {
    const { solver } = this;
    const { nx, nz, xCenters, zCenters, bed, dx } = solver;
    const [west, east] = [xCenters[OPEN_EDGE_REACH], xCenters[nx - 1 - OPEN_EDGE_REACH]];
    const [south, north] = [zCenters[0], zCenters[nz - 1]];
    const { direction } = motion;
    const depthAhead = (s: number) => {
      const px = x + s * direction.x;
      const pz = z + s * direction.z;
      return px < west || px > east || pz < south || pz > north ? Number.NaN : solver.restLevel - solver.sampleCentered(bed, px, pz);
    };
    return orthogonalGradient(depthAhead, height / BREAKER_INDEX, 0.5 * dx, REEF_PATH_REACH);
  }

  /** The flying tubes as a `tubeTable` (G9); returns how many. */
  writeTubes(into: Float32Array): number {
    return this.lip.writeTubes(into, TUBE_CAPACITY);
  }

  /** The width of the columns the lip throws in, m. */
  get tubeColumnWidth(): number {
    return this.solver.dx;
  }

  /** Water surface elevation, m; on dry land this is the bed. */
  heightAt(x: number, z: number): number {
    return this.lip.carve(x, z, this.solver.sampleCentered(this.solver.h, x, z) + this.bedAt(x, z));
  }

  bedAt(x: number, z: number): number {
    return this.solver.sampleCentered(this.solver.bed, x, z);
  }

  /** Uniform render grid covering the window and the whole tank. */
  renderGrid(spacing: number): RenderGrid {
    const width = this.solver.nx * this.solver.dx;
    return {
      xMin: this.windowXMin,
      zMin: this.tank.offshore,
      spacing,
      nx: Math.round(width / spacing) + 1,
      nz: Math.round((this.tank.shore - this.tank.offshore) / spacing) + 1,
    };
  }

  /**
   * Resample the water to interleaved (height, foam) per render node. Dry nodes
   * sit 5 cm under the bed so the seabed mesh hides them. Foam is the foam
   * field's covered fraction. Under a flying lip the surface drops to its
   * void's floor, unless `carve` is false (the snapshot's raw heights, G9: the
   * page carves them from the tube table).
   */
  writeUniformSurface(data: Float32Array, grid: RenderGrid, carve = true): void {
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
    if (carve) carveGrid(data, grid, this.lip.tubeTable, this.lip.tubeCount, this.solver.dx);
  }

  /** G9: every breaking bore drives air in by its dissipation, spilling shallower than a plunge. */
  private aerateBores(dt: number): void {
    const { h, bed, restLevel } = this.solver;
    const strength = this.breaking.strength;
    for (let i = 0; i < h.length; i += 1) {
      if (!(strength[i] > 0)) continue;
      const still = restLevel - bed[i];
      const dissipation = strength[i] * boreDissipation(still, h[i]);
      if (dissipation > 0) this.aeration.addBore(i, dissipation, h[i] - still, dt);
      // The wipeout spec, Part B: breaking stirs the water's turbulence.
      this.aeration.stir(i, strength[i], dt);
    }
  }

  /** G9: resample the aeration to interleaved (void fraction, plume depth, m) per render node; 0 on dry nodes. */
  writeUniformAeration(data: Float32Array, grid: RenderGrid): void {
    const { columns, columnWeights, rows, rowWeights } = this.mappingFor(grid);
    const { nx, h } = this.solver;
    const { depth } = this.aeration;
    if (!this.voidFractions || this.voidFractions.length !== h.length) this.voidFractions = new Float64Array(h.length);
    const fraction = this.voidFractions;
    for (let i = 0; i < h.length; i += 1) fraction[i] = this.aeration.voidFraction(i);
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
        const o = (r * grid.nx + c) * 2;
        data[o] = w00 * fraction[i] + w10 * fraction[i + 1] + w01 * fraction[i + nx] + w11 * fraction[i + nx + 1];
        data[o + 1] = w00 * depth[i] + w10 * depth[i + 1] + w01 * depth[i + nx] + w11 * depth[i + nx + 1];
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
