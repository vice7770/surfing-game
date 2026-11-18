import { Color, Mesh, Vector3, type Material, type Scene } from 'three';
import type { StandRefusal } from '../physics/AttachedRider';
import type { WaveFrame } from '../physics/waveFrame';
import type { RiderPlacement } from '../physics/RideSession';
import type { StanceName } from '../physics/riderPosture';
import { buildBoardShape } from '../physics/boardShape';
import { createBoardMesh } from '../scene/BoardMesh';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { SurferView } from '../scene/character/SurferView';
import { waterLightSwitch } from '../scene/water/waterLight';
import { RiderMotion } from '../scene/rig/riderMotion';
import { RIG_SWITCHES, turnBodySwitches } from '../scene/rig/stanceBlend';
import { SnapshotTrack } from './snapshotTrack';
import { POINT, createRiderVisualState, readRiderSnapshot } from '../scene/rig/riderVisualState';
import { LeashCord } from '../scene/board/LeashCord';
import { HoldReading } from './holdReading';
import { EdgeBand } from '../scene/EdgeBand';
import { EdgeWhitewater } from '../scene/EdgeWhitewater';
import { EDGE_BAND, bandBedWeight, mirrorX } from '../scene/water/edgeBandGlsl';
import { rockCoverFor } from '../scene/water/rockBed';
import { FarFieldOcean } from '../scene/FarFieldOcean';
import { gradedAxis } from '../scene/gridGeometry';
import { BubblePoints } from '../scene/BubblePoints';
import { SprayPoints } from '../scene/SprayPoints';
import { SpraySheetMesh } from '../scene/SpraySheetMesh';
import { BoardFanMesh } from '../scene/BoardFanMesh';
import { LipSheetMesh } from '../scene/LipSheetMesh';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { SpectatorCamera, type FollowTarget } from '../scene/SpectatorCamera';
import { SpotSeabed } from '../scene/SpotSeabed';
import { PoolScenery } from '../scene/PoolScenery';
import { POOL, POOL_EDGE_HEIGHT, POOL_REF, POOL_STRAIGHT, poolDeckZ, poolFloorOf, poolRefOn, regularSignificantHeight, type PoolWaves } from '../wave/pool';
import { SPOT_OPTICS } from '../scene/waterOptics';
import { sampleSurfaceHeight, type WaterSurface } from '../scene/WaterSurface';
import { SpillingCurlMesh } from '../scene/SpillingCurlMesh';
import { RollerFrontMesh, rollerFrontMode } from '../scene/RollerFrontMesh';
import type { WaterLook } from '../scene/water/waterLook';
import { createSpot, smoothstep, type SpotName } from '../wave/Bathymetry';
import { FarFieldProfile } from '../wave/FarFieldProfile';
import { MIXED_PEAK_FIT, skillForPeel } from '../wave/Breaking';
import { stormSwell, type StormSwell } from '../wave/StormSwell';
import type { ReadoutRow } from '../wave/SwellReadout';
import { RIDER_PHASES, RIDER_SNAPSHOT, type RideRequest, type SurfZoneStatus } from '../wave/SurfZoneRunner';
import type { SprayLook } from '../wave/SprayCloud';
import { particleBudget, type ParticleLevel } from '../wave/particleBudget';
import { RIDE_VIEWS, type RideView, type SpectatorView } from '../scene/SpectatorCamera';
import { SEA_COMPONENTS, alongShoreOf, solverStage, surfZoneSea, sweptBarrelOn, sweptCrashOn, tankDepth, tankLayout, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { SweptBarrel } from '../scene/barrel/SweptBarrel';
import { LibraryZone } from '../scene/library/LibraryZone';
import { loadWaveCaseBytes } from '../wave/library/libraryCases';
import { SWEPT_BARREL_VIEWS, type SweptBarrelMesh } from '../scene/barrel/SweptBarrelMesh';
import { DEV_TOOLS, devParam } from '../devTools';
import type { LoftResult } from '../wave/barrel/sweptLoft';
import { barrelCasesFor, libraryFromBytes, loadBarrelCaseBytes, poolTubeCaseOf, type PoolTubeCase, type TubeShape } from '../wave/barrel/barrelLibrary';
import { BARREL_SPOTS } from '../wave/barrel/barrelSpots';
import { tubeFaceOf } from '../wave/barrel/faceAnchor';
import { parseSeamBand, parseSeamTau } from '../wave/barrel/tubeSeam';
import { LocalSurfZone, SnapshotSurfZone, type SurfZoneHost } from './SurfZoneHost';
import { SUIT_COLORS, outfitFor, type SurferSettings } from './SurferChoice';

/** Wave Lab inputs for the view-only physical surf zone (buoy values or a storm, plan Q2, Q22 and Q31). */
export interface PhysicalSettings {
  spot: SpotName;
  /** Solver stage: 2 Boussinesq (dispersive, breaking by eddy viscosity), 1 shallow water (cheaper; waves break early as bores). */
  stage: 1 | 2;
  /** Stage 2 water on the GPU when WebGPU allows ('auto'), or always on the CPU. */
  compute: 'auto' | 'cpu';
  /** Buoy values taken directly, derived from a storm, or the practice groundswell. */
  source: 'buoy' | 'storm' | 'practice';
  significantHeight: number;
  peakPeriod: number;
  directionDegrees: number;
  /** 0 = narrow groundswell … 1 = broad windswell. */
  spread: number;
  /** The cos-2s spreading exponent itself, when a spot's own swell sets it (Padang Padang's refracted groundswell); otherwise `spread` gives it. */
  spreading?: number;
  /**
   * The Wave Lab's sea: its buoy and storm swells arrive as the game's own do, refracted at the tank's edge and square
   * to the beach, and no higher than the spot's Big (swellFor). Unset everywhere else.
   */
  lab?: boolean;
  tide: number;
  /** Local wind, m/s: positive onshore, negative offshore. */
  windSpeed: number;
  /** The Wave Pool's floor and sizes when its Barrel waves are chosen (`SurfZoneConfig.poolWaves`); unset is its Training. */
  poolWaves?: PoolWaves;
  /** Storm mode: wind over the fetch, m/s. */
  stormWindSpeed: number;
  stormFetchKm: number;
  stormDurationHours: number;
  stormDistanceKm: number;
}

/** The swell the tank is built from. */
export interface SwellInput {
  significantHeight: number;
  peakPeriod: number;
  spreading: number;
  bandwidth?: number;
  /** Set when the swell fixes its own direction (practice). */
  directionDegrees?: number;
  /** The storm it came from, in storm mode. */
  storm?: StormSwell;
}

/**
 * Directional spreading of a swell refracted into a surf zone's 5–10 m edge, the cos-2s exponent s: refraction
 * turns every direction toward the depth contours, narrowing a groundswell past s = 100 by h/L0 ≈ 0.025 (Goda,
 * Takayama & Suzuki 1978, eq. 17 and fig. 5; docs/research/water-physics/breaking.md). The tank's edge is that
 * shallow, so its swell arrives this narrow and square to the beach. At the buoy's s = 14–17 (the spread slider's
 * 0.2–0.3) from 10–20°, crests after the session's opening set ran across the beach
 * (docs/research/crest-angle-2026-10-05.md). Padang Padang's own value, provisional with it.
 */
export const REFRACTED_SPREADING = 150;

/**
 * Practice mode (plan P4f): a narrow-band, narrow-spread groundswell that keeps
 * catchable faces coming. Only the incoming water changes; the solver and every
 * force law are the natural mode's. Ghost riders catch most on the Point in it.
 * Its height gives the Canyon chest-to-head-high faces (1–1.5 m; the riding-the-wave
 * spec's reference wave): at Hs 2 m the faces were 2.2–2.8 m and riders reached
 * 11–12 m/s off the bottom (docs/research/reference-wave.md). Refracted, it arrives
 * square to the beach (REFRACTED_SPREADING); it came from 10° at s = 40 until 2026-10-05.
 */
export const PRACTICE_SWELL: Readonly<SwellInput> = {
  significantHeight: 1.4, peakPeriod: 12, spreading: REFRACTED_SPREADING, bandwidth: 0.08, directionDegrees: 0,
};

/**
 * The Reef's practice groundswell: the Practice swell's narrow band and spread at a
 * Teahupo'o period, square to the beach, for ~1.5–2 m faces (the Teahupo'o Reef spec);
 * the ledge's angle carries the obliquity, as Padang Padang's reef does. It came from
 * 20° at s = 40 until 2026-10-05. The Reef stays fast when small: its break runs along
 * the ledge at no less than the shelf's celerity (src/wave/ledgePeel.ts). Provisional
 * until the size report calibrates it.
 */
export const REEF_PRACTICE_SWELL: Readonly<SwellInput> = {
  significantHeight: 1, peakPeriod: 14, spreading: REFRACTED_SPREADING, bandwidth: 0.08, directionDegrees: 0,
};

/**
 * Padang Padang's directional spreading, the cos-2s exponent s at its edge: a Southern Ocean groundswell
 * is Goda's long-decay swell (s_max 75), and refraction into 10 m narrows it further, past 100 by h/L0 ≈ 0.025
 * (Goda, Takayama & Suzuki 1978, eq. 17 and fig. 5); the Bukit's tip also filters the directions that wrap round.
 * Provisional (the advisor's ruling, 2026-09-28): swept over 100–250, never below 75.
 */
export const PADANG_SPREADING = REFRACTED_SPREADING;

/**
 * Padang Padang's practice groundswell: the Practice swell's narrow band and spread at a Padang Padang period,
 * square to the tank as its swells, given at its edge, for faces of 2–2.5 m (the Padang Padang spec). It "works from
 * about 4 ft" (about 2.4 m faces), so this is its smallest honest size. The size report: 1.5 m gave faces of 3.3 m at the
 * take-off, 0.9 m gave 2.8 m, so 0.6 m (round 2); provisional.
 */
export const PADANG_PRACTICE_SWELL: Readonly<SwellInput> = { significantHeight: 0.6, peakPeriod: 16, spreading: PADANG_SPREADING, bandwidth: 0.08, directionDegrees: 0 };

/** The Wave Pool's practice: its machine's Medium wave (the movement-flow spec), one regular component square to the tank. */
export const POOL_PRACTICE_SWELL: Readonly<SwellInput> = {
  significantHeight: regularSignificantHeight(POOL_EDGE_HEIGHT.medium), peakPeriod: POOL.period, spreading: 1000, directionDegrees: 0,
};

/** A spot's practice groundswell: the Reef's, Padang Padang's or the Wave Pool's own, or the shared one. */
export function practiceSwell(spot: SpotName): Readonly<SwellInput> {
  return spot === 'reef' ? REEF_PRACTICE_SWELL : spot === 'padang' ? PADANG_PRACTICE_SWELL : spot === 'pool' ? POOL_PRACTICE_SWELL : PRACTICE_SWELL;
}

/** The GPU tier's sea (plan P6): more components, so sets repeat less often. */
export const GPU_TIER_COMPONENTS = 64;

/** Whether this page can step the water on the GPU: a WebGPU adapter answers. */
export async function webGpuAvailable(): Promise<boolean> {
  try {
    return Boolean(await globalThis.navigator?.gpu?.requestAdapter());
  } catch {
    return false;
  }
}

/** Largest swell the tank carries, matching the buoy sliders; the tank deepens with the swell (the wave-sizes spec). */
export const TANK_SWELL_LIMITS = { height: { min: 0.3, max: 4 }, period: { min: 6, max: 18 } };

/** The Canyon keeps its tank and sea as they were (the wave-sizes spec), and so its 3 m cap. */
export function swellHeightLimit(spot: SpotName): number {
  return spot === 'canyon' ? 3 : TANK_SWELL_LIMITS.height.max;
}

/**
 * Each spot's Big, Hs: SurfConditions' swellChoice(spot, 'big'), and the Wave Pool machine's Big wave. Written out
 * here because SurfConditions imports this module; a test keeps them equal.
 */
const BIG_HEIGHTS: Record<SpotName, number> = {
  pool: regularSignificantHeight(POOL_EDGE_HEIGHT.big), beach: 2.4, point: 2.4, reef: 3, canyon: 2.4, padang: 3.8,
};

/**
 * The Wave Lab's largest swell at a spot: its Big, so the lab never offers a sea the game's own swells don't reach.
 * Above them the 2026-10-21 playtest saw the Canyon break in four or five rows at Hs 3 m, and Padang Padang close out at 4 m.
 */
export function labHeightLimit(spot: SpotName): number {
  return Math.min(swellHeightLimit(spot), BIG_HEIGHTS[spot]);
}

function clamp(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, value));
}

/** Far-field ocean layout: deepening from the tank floor to FAR_DEPTH over FAR_SLOPE_LENGTH offshore of the tank, out to FAR_EXTENT. */
const FAR_DEPTH = 60;
const FAR_SLOPE_LENGTH = 870;
const FAR_EXTENT = 1500;

export const DEFAULT_PHYSICAL_SETTINGS: PhysicalSettings = {
  spot: 'beach', stage: 2, compute: 'auto', source: 'buoy', significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spread: 0.4, tide: 0, windSpeed: 0,
  stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 3000,
};

/** Shading chop from local wind: onshore wind roughens the surf, offshore wind grooms it (qualitative, plan Q23). */
export function chopForWind(windSpeed: number): number {
  return windSpeed >= 0 ? 0.12 + 0.03 * windSpeed : 0.12 + 0.008 * -windSpeed;
}

/** Spread slider to the cos-2s exponent: s = 24 (groundswell) falling geometrically to 4 (windswell). */
export function spreadingFor(spread: number): number {
  const t = Math.min(1, Math.max(0, spread));
  return 24 * Math.pow(4 / 24, t);
}

/**
 * The broadest spread a Wave Lab swell reaches the tank's edge with, the cos-2s exponent s: Goda's s_max for swell
 * with a long decay distance, the water-physics advisor's floor for swell at a tank edge.
 */
export const LAB_SPREADING_FLOOR = 75;

/**
 * The Wave Lab's spread slider as the tank's edge takes it: s = 150 (REFRACTED_SPREADING, the game's own swells') for a
 * groundswell, halving to 75 for a windswell (about 106 at Mixed). The tank's 160 m window has open, unfed sides, so a
 * broader sea drains out of them and sheds wake wedges: at the buoy's s = 8 from 10° the Canyon's crests crossed in V's
 * (a bend of 13–18° between a crest's halves, 2–5° at s = 150 from 0°; the 2026-10-21 playtest).
 */
export function labSpreadingFor(spread: number): number {
  const t = Math.min(1, Math.max(0, spread));
  return REFRACTED_SPREADING * Math.pow(LAB_SPREADING_FLOOR / REFRACTED_SPREADING, t);
}

/** `?labRawSea=1` (dev tools only): the Wave Lab's buoy and storm swells with their raw spread and direction, as before 2026-10-21. */
export function labRawSea(search?: string): boolean {
  return devParam('labRawSea', search) === '1';
}

/**
 * Buoy values as set, the practice groundswell, or the swell a storm delivers to the spot, kept within TANK_SWELL_LIMITS.
 * The Wave Lab's arrive as the game's own swells do, whatever the sliders say (waves form straight to the beach, from
 * one side at most): refracted at the tank's edge (labSpreadingFor, a storm's no broader than LAB_SPREADING_FLOOR),
 * square to the beach, and no higher than the spot's Big. `rawSea` (labRawSea) keeps the lab's raw spread and direction.
 */
export function swellFor(settings: PhysicalSettings, rawSea = labRawSea()): SwellInput {
  if (settings.source === 'practice') return { ...practiceSwell(settings.spot) };
  const lab = settings.lab === true;
  const straight = lab && !rawSea;
  const heightLimit = lab ? labHeightLimit(settings.spot) : swellHeightLimit(settings.spot);
  const square = straight ? { directionDegrees: 0 } : {};
  if (settings.source !== 'storm') {
    return {
      significantHeight: Math.min(settings.significantHeight, heightLimit), peakPeriod: settings.peakPeriod,
      spreading: settings.spreading ?? (straight ? labSpreadingFor(settings.spread) : spreadingFor(settings.spread)),
      ...square,
    };
  }
  const storm = stormSwell({
    windSpeed: settings.stormWindSpeed,
    fetchKm: settings.stormFetchKm,
    durationHours: settings.stormDurationHours,
    distanceKm: settings.stormDistanceKm,
  });
  return {
    significantHeight: clamp(storm.significantHeight, { min: TANK_SWELL_LIMITS.height.min, max: heightLimit }),
    peakPeriod: clamp(storm.peakPeriod, TANK_SWELL_LIMITS.period),
    spreading: straight ? Math.max(storm.spreading, LAB_SPREADING_FLOOR) : storm.spreading,
    bandwidth: storm.bandwidth,
    ...square,
    storm,
  };
}

/** "Hs 7.1 m · Tp 13.5 s · fetch-limited · arrives after 4.4 days". */
export function formatStorm(storm: StormSwell): string {
  const travel = storm.travelHours < 1 ? 'local sea' : storm.travelHours < 48
    ? `arrives after ${Math.round(storm.travelHours)} h` : `arrives after ${(storm.travelHours / 24).toFixed(1)} days`;
  return `Hs ${storm.stormHeight.toFixed(1)} m · Tp ${storm.stormPeriod.toFixed(1)} s · ${storm.growth} · ${travel}`;
}

/** Why a stand has no support, in the player's words. */
const REFUSAL_TEXT: Record<StandRefusal, string> = {
  strained: 'thrown off balance on the way up',
  sinking: 'board sinking, not planing yet',
  'feet under water': 'feet landed under water',
  'no water': 'no water under the board',
};

/** The rider against the crest (spec P9 phase 0): the crest's speed and the peel's required speed, and where on the face the rider is. */
function crestRows(wave: WaveFrame): ReadoutRow[] {
  if (!wave.valid) return [{ label: 'CREST', value: 'no wave face here' }];
  const need = Number.isFinite(wave.requiredSpeed) ? `need ${wave.requiredSpeed.toFixed(1)} m/s` : 'close-out';
  const face = wave.aheadOfCrest >= 0
    ? `${wave.aheadOfCrest.toFixed(1)} m ahead · ${Math.round(wave.faceFraction * 100)} % up`
    : `${(-wave.aheadOfCrest).toFixed(1)} m behind the crest`;
  return [{ label: 'CREST', value: `c ${wave.crestSpeed.toFixed(1)} m/s · ${need}` }, { label: 'FACE', value: face }];
}

/**
 * The DEVICE row (barrel-gpu, 2026-11-06): "GPU · 12 kB up, 3,682 kB back a step · whole water 0 · plunge zone 0 ·
 * layout 0 in the last second", or "CPU · the water steps here: periodic along shore, kept on the CPU (?barrelGpu=off)".
 */
export function formatDevice(config: SurfZoneConfig, status: SurfZoneStatus): string {
  if (status.compute !== 'gpu') {
    const why = status.deviceNote ?? ((config.compute ?? 'auto') === 'cpu' ? 'Water simulation: fast' : (config.stage ?? 2) === 1 ? 'shallow water on the CPU' : undefined);
    return `CPU · the water steps here${why ? `: ${why}` : ''}`;
  }
  const p = status.pipelineMs;
  if (!p) return 'GPU';
  const kb = (bytes: number) => Math.round(bytes / 1024).toLocaleString('en-US');
  return `GPU · ${kb(p.deviceUploadBytes)} kB up (${kb(p.deviceUploadMean)} mean), ${kb(p.deviceReadbackBytes)} kB back a step · whole water ${p.deviceFullWater}, plunge zone ${p.deviceFullPlunge}, layout ${p.deviceLayouts} in the last second`;
}

/** The Wave Lab rows for a running surf zone, from plain status values (they can come from the worker). */
export function formatPhysicalReadout(config: SurfZoneConfig, status: SurfZoneStatus, storm?: StormSwell, practice = false): ReadoutRow[] {
  const { breakPoint, breaker, peel } = status;
  const toSet = status.timeToSet;
  const wind = config.windSpeed ?? 0;
  let peelText = 'waiting for a break';
  if (peel) {
    const angle = Math.round(peel.angleDegrees);
    const skill = skillForPeel(peel.angleDegrees);
    if (skill === 'closeout') peelText = `closing out · ${angle}° (needs ≥ 27°)`;
    else if (peel.fit < MIXED_PEAK_FIT) peelText = `mixed peaks · ${angle}°`;
    else if (peel.peak) peelText = `peak${peel.bowl ? ` into a ${peel.bowl} reef bowl` : ''} · ${Math.round(peel.peak.left)}° toward +x, ${Math.round(peel.peak.right)}° toward −x · ${skill}`;
    else peelText = `${angle}° toward ${peel.direction > 0 ? '+x' : '−x'} · ${skill}`;
  }
  const band = config.bandwidth !== undefined && Number.isFinite(config.bandwidth) ? ` · band ±${Math.round(config.bandwidth * 100)} %` : '';
  const clamped = storm && Math.abs(storm.significantHeight - config.significantHeight) > 0.05
    ? ` (storm delivers ${storm.significantHeight.toFixed(1)} m; tank limit)` : '';
  return [
    { label: 'SPOT', value: config.spot.toUpperCase() },
    ...(storm ? [{ label: 'STORM', value: formatStorm(storm) }] : []),
    { label: 'SWELL', value: `Hs ${config.significantHeight.toFixed(1)} m · Tp ${config.peakPeriod.toFixed(1)} s · ${config.directionDegrees}°${clamped}${practice ? ' · practice groundswell' : ''}` },
    { label: 'SPREAD', value: `s ${config.spreading.toFixed(0)}${band}` },
    { label: 'TIDE', value: `${config.tide.toFixed(1)} m` },
    { label: 'BREAK LINE', value: `${Math.round(-breakPoint.z)} m out · ${status.breakDepth.toFixed(2)} m deep` },
    { label: 'SOLVER', value: `${(config.stage ?? 2) === 2 ? 'Boussinesq' : 'shallow water'} · ${status.compute === 'gpu' ? 'GPU' : 'CPU'} · ${config.componentCount ?? SEA_COMPONENTS} components · ${status.cells.toLocaleString('en-US')} cells · ${status.stepMs.toFixed(1)} ms/step` },
    // The worker's whole time a step (pool-barrel-perf): the water, its CPU stages and the snapshot; over 16.7 ms the sea
    // falls behind real time. The SOLVER row's is the water and the board alone.
    ...(status.pipelineMs ? [{ label: 'WORKER', value: `${status.pipelineMs.total.toFixed(1)} ms a step (16.7 keeps real time) · water ${status.pipelineMs.water.toFixed(1)} · contact ${status.pipelineMs.contact.toFixed(1)} · snapshot ${status.pipelineMs.snapshot.toFixed(1)}` }] : []),
    // Where the water steps and what the GPU's step moves (barrel-gpu): on the CPU, the reason; on the GPU, the
    // latest step's kB up and back, and over the last second of sea how many steps sent the whole water.
    { label: 'DEVICE', value: formatDevice(config, status) },
    { label: 'NEXT SET', value: toSet > 0 ? `in ${Math.round(toSet)} s` : `${Math.round(-toSet)} s ago` },
    { label: 'BREAKER', value: breaker.type === 'none' ? 'FLAT BED' : `ξ ${breaker.value.toFixed(2)} · ${breaker.type.toUpperCase()}` },
    { label: 'BREAKING', value: `${Math.round(status.breakingFraction * 100)} % of the surf zone` },
    ...(status.board ? [{ label: 'BOARD', value: `riderless · ${status.board.speed.toFixed(1)} m/s${status.board.resets ? ` · back in the lineup ×${status.board.resets}` : ''}` }] : []),
    ...(status.ride ? [
      { label: 'RIDER', value: `${status.ride.phase.toUpperCase()} · ${status.ride.speed.toFixed(1)} m/s${status.ride.cue ? ' · POP UP NOW' : ''}` },
      ...crestRows(status.ride.wave),
      { label: 'POP-UP', value: status.ride.popUp.outcome === 'none' ? 'not yet'
        : status.ride.popUp.outcome === 'stood' ? `stood in ${status.ride.popUp.duration.toFixed(2)} s · landing ${status.ride.popUp.landingPeak.toFixed(1)} BW, ${Math.round(status.ride.popUp.frontShare * 100)} % front${status.ride.popUp.refusal ? ` · no support: ${REFUSAL_TEXT[status.ride.popUp.refusal]}` : ''}`
        : 'rising' },
      ...(status.ride.separation ? [{ label: 'FELL', value: `${status.ride.separation} · swim back (Space, arrows) and press Enter by the board to climb on, or R to paddle out again` }] : []),
    ] : []),
    { label: 'PEEL', value: peelText },
    { label: 'LIP', value: status.lipLaunches === 0 ? 'no lip yet'
      : `${status.lipLaunches} throws · ${status.lipVolume.toFixed(1)} m³ · ${status.lipAirborne.toFixed(1)} m³ airborne` },
    { label: 'SPRAY', value: status.spray > 0 ? `${status.spray.toLocaleString('en-US')} drops and mist in the air` : 'none' },
    { label: 'WIND', value: wind === 0 ? 'calm'
      : `${Math.abs(wind)} m/s ${wind > 0 ? 'onshore' : 'offshore'} · breaking thresholds ×${status.onsetScale.toFixed(2)}` },
  ];
}

/**
 * The physical surf zone (plan P2c, P4 and P5): the chosen solver stage on
 * the shared water surface, a seabed mesh from the spot, a spectator camera,
 * and the rider who paddles, pops up and rides these waves.
 */
export type SurfZoneHostFactory = (config: SurfZoneConfig, extra?: HostExtras) => SurfZoneHost;

/** What a start hands its surf zone beyond the config: the barrel case files at a swept spot (Part B, PR 4). */
export interface HostExtras {
  barrelCases?: readonly Uint8Array[];
  /** C2 step 3 (`?wave=library`): the wave library's case files (public/library). */
  waveCases?: readonly Uint8Array[];
}

/**
 * The surf zone a start builds from these settings (`PhysicalMode.start`): `tier` is the GPU tier's richer sea, which
 * the page decides. Shared with the dev pages that time the game's own seas (gpu-check's `?mode=pipeline`).
 */
export function surfZoneConfigFor(settings: PhysicalSettings, seed: number, tier: boolean, overrides: Partial<SurfZoneConfig> = {}): SurfZoneConfig {
  return poolRefConfig(switchedConfigFor(settings, seed, tier, overrides), poolWindowSwitch().poolWindow, poolHeldOld(), poolReefShort(), poolReachLong());
}

/**
 * A config at the straight Barrel's reference size (`poolSize` 'ref', ruling 13): the machine's wave and period are
 * `POOL_REF`'s in place of the Small / Big choice's, its tube the pool's 1.8 m case alone (scaled by the bigger foot
 * crest) unless `?poolTubeCase=a38|pool` names another (ruling 16's call 1: the switch wins; without it, `big`), and
 * the steeper ledge (`poolFloor` 'ledge') is dropped. Its wrapped window is `POOL_REF.alongShore` wide
 * (311 m, ruling 14; `alongShoreOf` gives it, so the config carries no width) unless `window` (`?poolWindow`) says another,
 * which becomes the config's `alongShore`. Its tube case's held frame is found with the jet-step test (`heldRule`
 * 'jet-step', ruling 16: `big` holds at frame 175, not 176) unless `heldOld` (`?poolHeld=old`). Its reef's lengths along
 * its line are × 1.11 (`POOL_REF`, ruling 16) unless `reefShort` (`?poolReef=short`: `poolReef` 'short', the lengths
 * before step 4). With `reachLong` (`?poolReach=long`, ruling 17) the long reef's front reach ends at s 150, not 111
 * (`poolReach` 'long'). Any other config, as given: `window`, `heldOld`, `reefShort` and `reachLong` are read at this
 * size alone.
 */
export function poolRefConfig(config: SurfZoneConfig, window?: number, heldOld = false, reefShort = false, reachLong = false): SurfZoneConfig {
  if (!poolRefOn(config)) return config;
  const { poolFloor, ...rest } = config;
  return {
    ...rest, significantHeight: regularSignificantHeight(POOL_REF.edgeHeight), peakPeriod: POOL_REF.period, poolTubeCase: config.poolTubeCase ?? 'big',
    ...(heldOld ? {} : { heldRule: 'jet-step' as const }),
    ...(reefShort ? { poolReef: 'short' as const } : {}),
    ...(reachLong && !reefShort ? { poolReach: 'long' as const } : {}),
    ...(poolFloor === 'inside' ? { poolFloor } : {}),
    ...(window !== undefined ? { alongShore: window } : {}),
  };
}

function switchedConfigFor(settings: PhysicalSettings, seed: number, tier: boolean, overrides: Partial<SurfZoneConfig>): SurfZoneConfig {
  const swell = swellFor(settings);
  const stage = solverStage(settings.spot, settings.stage);
  const compute = stage !== settings.stage ? 'auto' : settings.compute;
  const diagnosticDx = Number(devParam('physicsDx'));
  const diagnosticDz = Number(devParam('physicsDz'));
  return {
    spot: settings.spot,
    seed,
    significantHeight: swell.significantHeight,
    peakPeriod: swell.peakPeriod,
    directionDegrees: swell.directionDegrees ?? settings.directionDegrees,
    spreading: swell.spreading,
    bandwidth: swell.bandwidth,
    tide: settings.tide,
    windSpeed: settings.windSpeed,
    stage,
    compute,
    // The Wave Pool's Barrel floor, when its Barrel waves are chosen (the Surf screen's Waves row; a room's conditions).
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? { poolWaves: 'barrel' as const } : {}),
    // Ordinary Padang seas halve alongshore work, keeping the original 1 m cross-shore grid.
    // Supplied room/replay/report configurations retain their own grid, including legacy defaults.
    ...(settings.spot === 'padang' && Object.keys(overrides).length === 0 ? { dx: 2, fineSpacing: 1 } : {}),
    // Practice's groundswell is given at the tank's edge, so its sea stays as it was (the wave-sizes spec).
    ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
    ...(tier ? { componentCount: GPU_TIER_COMPONENTS } : {}),
    ...(diagnosticDx > 0 && Number.isFinite(diagnosticDx) ? { dx: diagnosticDx } : {}),
    ...(diagnosticDz > 0 && Number.isFinite(diagnosticDz) ? { fineSpacing: diagnosticDz } : {}),
    // `?spillingCurl=0`: the Canyon's spilling front drawn as felt, with no curl (a dev switch, for the lip's costs).
    ...(devParam('spillingCurl') === '0' ? { spillingCurl: false } : {}),
    // `?curlLocal=off`: the curl, band and roller front take the nominal take-off H where a column has none, as before.
    ...(devParam('curlLocal') === 'off' ? { curlLocal: false } : {}),
    // `?foamLook=off`: a spilling spot's drawn white with square edges, as before the foam look (item 4a).
    ...(devParam('foamLook') === 'off' ? { drawnEdges: false } : {}),
    // `?startOut=<m>`: the rider starts this far seaward of the take-off (`?startOut=11` is the Canyon Big's old start).
    ...startOutSwitch(),
    // `?rollerFront=off`: no roller front's toe spray (its ribbon is the page's, off with the same switch), for A/Bs.
    ...(devParam('rollerFront') === 'off' ? { rollerFront: false } : {}),
    // `?canyonBed=b` or `=old`: the Canyon's version B or A, with its take-off and starts (main's until 2026-11-03 or 2026-11-01);
    // `?canyonWaves=true` (or `=b`): version B, the waves before version C; `?canyonWaves=a`: version A;
    // `?canyonRamp=half`: today's with its bank's edge ramp halved, with its own take-off and starts (the advisor's option (b)).
    ...canyonBedSwitch(),
    // `?canyonJoin=zone`: version C's bank passing its breaking age by its take-off zone, as before the bed-keyed join.
    ...(settings.spot === 'canyon' ? canyonJoinSwitch() : {}),
    // `?canyonStart=old`: the Canyon's rider starting at its take-off, as before 2026-11-08 (now 10 m screen-left of it).
    ...(settings.spot === 'canyon' ? canyonStartSwitch() : {}),
    // `?tubeShape=c`: the swept barrel drawn and felt as the authored bounded-C (2026-10-05 to 2026-10-22), for A/Bs.
    ...tubeShapeSwitch(),
    // `?canyonTube=on`: the Canyon with its swept tubes on the reef (its default until canyon-beach-break, 2026-10-23).
    ...(settings.spot === 'canyon' ? canyonTubeSwitch() : {}),
    // `?canyonAgeJoin=<J>`: the Canyon's breaking-age join (0: rule A, as before canyon-wave-r2), for A/Bs.
    ...(settings.spot === 'canyon' ? canyonAgeJoinSwitch() : {}),
    // `?poolAgeJoin=<J>`: the Wave Pool's Barrel floor's breaking-age join (0: rule A, as its training floor), for A/Bs.
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? poolAgeJoinSwitch() : {}),
    // `?poolBarrel=aframe`: the Wave Pool's Barrel on step 1's A-frame (pool-barrel, merged 2026-11-01), for A/Bs.
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? poolBarrelSwitch() : {}),
    // `?poolFloor=ledge`: the straight Barrel on the advisor's steeper reef ledge (pool-ledge-floor, the owner's call 2026-11-08).
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? poolFloorSwitch() : {}),
    // `?poolSize=ref`: the straight Barrel re-sized to the owner's reference, 2 m faces (ruling 13), opt-in (`poolRefConfig`).
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? poolSizeSwitch() : {}),
    // `?poolTube=off` / `?poolCrash=off`: the straight Barrel without its swept tube, or with it and the solver's own lip.
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? poolTubeSwitch() : {}),
    // `?poolTubeCase=pool`: the straight Barrel's tube from its own runs, for A/Bs (a38, the default since 2026-11-04,
    // answers to `?poolTubeCase=a38` as well).
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? poolTubeCaseSwitch() : {}),
    // `?tubeFace=old`, `?tubeFrom=piece`, `?tubeLag=0`, `?tubeClock=old`: the surfable tube's A/Bs (the advisor's step 3
    // ruling); `?tubeFace=old&tubeFrom=piece` is the fitted piece exactly as before. Step 7's: `?tubeAnchor=old`,
    // `?tubeForm=old`, `?tubeThrow=break`, `?wallFlow=old` (each piece alone; the three old together, step 6). The step 7
    // follow-up's: `?tubeContact=old`, `?tubeCap=old`, `?tubeMerge=old` (all three old: main before it), and the opt-in
    // `?tubeGuard=on`. Ruling 3's: `?tubeInertia=old`, `?tubeRetire=old` (both old: main before it), and the opt-in
    // `?tubeTrack=on`, `?tubeBuoy=on`, `?tubeDrop=on`.
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? tubeFaceSwitches() : {}),
    // `?wave=library`: C2 step 3, the 2 m pool's breaking wave from the Basilisk library (with `?poolSize=ref`), opt-in.
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? waveSwitch() : {}),
    // `?onset=old`: every spot's breaking onset as before step 3b of the all-spots survey (the Point's flat 0.65), for A/Bs.
    ...onsetSwitch(),
    // `?stroke=old`: the paddler's hands broadside to water outrunning them, as before canyon-catch, for A/Bs.
    ...strokeSwitch(),
    // `?surfaceMotion=old`: the sea's surface held still through the bodies' step, as before popup-moving-face, for A/Bs.
    ...surfaceMotionSwitch(),
    // `?plainHeight=old`: the water's heights gathered for every sample, as before pool-barrel-perf (the same bits, slower).
    ...plainHeightSwitch(),
    // `?waterLight=on|off`: the water light (ruling 25e) at any spot, or off in the 2 m pool; drawn only (`waterLightOn`).
    ...waterLightSwitch(),
    // `?contactRows=old`: the Barrel's worker contact builds all its rows each step, as before pool-barrel-perf (the same answers).
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? contactRowsSwitch() : {}),
    // `?deviceWater=old`, `?launchWater=old`, `?devicePlunge=old`: the GPU gets the CPU's changes as before barrel-gpu
    // (one span of water, all of it at a launch, the plunge zone whole); the same water on the device.
    ...deviceTrafficSwitches(),
    // `?barrelGpu=off`: the straight Barrel's periodic sea steps on the CPU, as before barrel-gpu.
    ...(settings.spot === 'pool' && settings.poolWaves === 'barrel' ? barrelGpuSwitch() : {}),
    // `?swim=old`: back on the board after a wipeout as before swim-back (the reel to the ankle, the springs' pull), for A/Bs.
    ...swimSwitch(),
    // `?froth=old`: a roller's froth dragging a board anywhere in its footprint, uncapped, as before bottom-stop, for A/Bs.
    ...frothSwitch(),
    // `?extension=old`: the legs extending at their full pace letting Compress go, as before compress-exit, for A/Bs.
    ...extensionSwitch(),
    // `?snap=off`: the riders' Snap input ignored, as before the snap stance, for A/Bs.
    ...snapSwitch(),
    // `?snapQuick=old`: the riders' Snap set up at the balance's calm pace, as before snap-quick, for A/Bs.
    ...snapQuickSwitch(),
    // `?snapPivot=lean`: the riders' Snap leaning for its own turn, up to 70° (snap-lean), opt-in, to ride.
    ...snapPivotSwitch(),
    // `?snapRecentre=old`: Snap let go, the riders' weight left over the tail, as before snap-recentre, for A/Bs.
    ...snapRecentreSwitch(),
    // `?snapUpturn=old`: with `?snapPivot=lean`, the riders' Snap up the face leaning as far as a top turn, as before snap-upturn, for A/Bs.
    ...snapUpturnSwitch(),
    // `?snapDepth=deep`: the riders' Snap loading to the tube tuck's 0.45 m (snap-carve), opt-in, to ride.
    ...snapDepthSwitch(),
    // `?snapStamp=on`: a full steer under Snap stamps the riders' weight past the tail, then back over the fins (snap-stamp), opt-in, to ride.
    ...snapStampSwitch(),
    // `?agile=on`: the riders' two legs act apart; a full steer under Snap launches the tail with the feet's couple (rider-agile), opt-in, to ride.
    ...agileSwitch(),
    // `?legDrive=on`: at a rail change the riders' legs push the body toward the new rail against the board at the back foot, in the lean-out pull's place (leg-drive), opt-in, to ride. `?legDrive=turn` adds the compressed turn's lead-in, in COMPRESS_PULL's place (step 3.2t).
    ...legDriveSwitch(),
    // `?hull=rail` (step 3.2u): the board gets a real rail band — its own normals, the buried rail's suction and its
    // ventilation latch — in place of the flat sheet with a knife edge. `?railSuction=off` keeps the section and drops
    // the grip; `?compressPull=off` deletes the old rider's unpaired compressed-turn pull. Opt-in, to ride.
    ...hullSwitch(),
    // `?carveFlex=on`: on a standing, stick-only carve the riders' legs flex with the turn's load, low at the bottom and taller as it ends (carve-flex), opt-in, to ride.
    ...carveFlexSwitch(),
    // `?snapLegs=drive`: under Snap the riders' legs load and then extend as the board comes round, in place of holding the full depth (snap-legs), opt-in, to ride.
    ...snapLegsSwitch(),
    // `?snapCross=on`: a Snap taken on the other rail weights the tail only once the body has come over the board, the back foot pushing it across (snap-cross), opt-in, to ride.
    ...snapCrossSwitch(),
    // `?legPower=cap`: the standing contact makes no energy on steep water, the board taking only what the legs give and the legs' power capped (ruling 27's A-lite), opt-in, to ride.
    ...legPowerSwitch(),
    // `?rider=new`: the new surfer (docs/research/new-rider): step 3.1, standing, the body free along the board too, leaning with the face, softer knees with a strength cap, opt-in, to ride.
    ...riderSwitch(),
    // `?feltFrame=deck`: the standing riders' felt vertical is low-passed on the deck's own axes, as a body-fixed sensor does, instead of in the world (step 3.3c), opt-in, to ride.
    ...feltFrameSwitch(),
    // `?kneeRoom=achieved`: the new surfer's balance reads the knees' travel left at the depth its leg has reached, not the one commanded, so its own knee drop no longer spends the whole of Compress's travel on a standing stance (step 3.3f), opt-in, to ride.
    ...kneeRoomSwitch(),
    // `?stanceReach=keep`: a deep crouch keeps the riding stance's hip range and free arms, so Compress keeps its catching reach as well as its lower centre of mass (step 3.3h, the owner's ruling of 2026-11-16), opt-in, to ride.
    ...stanceReachSwitch(),
    // `?ankleLimit=feet`: the ankle's torque is bounded by the moment the soles can transmit, `legLoad` × the feet's half-width across (step 3.3i; the bound `LEAN_IN_RATE` derives at 93 N·m and nothing enforced), opt-in, to ride.
    ...ankleLimitSwitch(),
    // `?ankleRange=load|wide`: the bound on the rest the balance may command at the ankle, off the live sole or doubled (step 3.3k; step 3.3j measured the shipped ±14.32° at its stop in 62 of 72 falls), opt-in, to ride.
    ...ankleRangeSwitch(),
    // `?bankClamp=off`: the 70 degree clamp on the MEASURED bank lifted at `AttachedRider.frame`'s three sites (step 3.4i; step 3.4h read `bankFall` at 70.00 exactly in 21 of 24 runs, so the fall classifier's 45 degree threshold sat on a truncated column), opt-in, to ride.
    ...bankClampSwitch(),
    // `?askCap=1.5|2|4|4.5|9`: the lean the rider ASKS for — the balance's own reference and the steer's request alike —
    // bounded by atan(v²/(g R_min)) at every speed on this minimum carved radius in metres, in place of the shipped
    // 4.5 m with no ask at all off the plane (step 3.5a, the owner's ruling of 2026-11-17), opt-in, to ride.
    ...askCapSwitch(),
    // `?stanceDeep=off`: the stance ladder's fourth rung, the tube tuck's 0.45 m, read by the balance's plant and by its gain schedule, SHIPS (step 3.5b, the owner's ruling D of 2026-11-17 "keep the row"; the achieved depth already passed the old 0.30 m clamp in 0.11-0.96 of Compress's live ticks), and `off` is the old three-row plant, kept to price a ride against this track's published history.
    ...stanceDeepSwitch(),
    // `?deepen=on`: the deepen button — full manual crouch reaches the tube tuck's 0.45 m anywhere and Compress does not fade it away, so the crouch key dips whatever stance is held (step 3.5b, ruling C; on the owner's input only, no clock and no stamina), opt-in, to ride.
    ...deepenSwitch(),
    // `?armCarry=on|rest`: the arm carriage channel — the drawn standing hands get a height, a spread and a left/right of their own, answering the player's own stick and never leg depth (both depth links are refuted by the footage): both hands low and in at rest, the lead hand down at the rail with the rear arm up and back at a turn's load, the rear arm overhead on a hard ask only, fast up and slow back; `rest` is the rest carriage alone (step 3.5g, rows 4, 5 and 15 of `engine-target.md`; drawing only, no force, no clock), opt-in, to ride.
    ...armCarrySwitch(),
    // `?trunk=mass`: the new surfer's hip rotor folds the mass model's trunk, head and arms about the pelvis, and the drawn trunk stops being a function of leg depth (step 3.5h, rows 1-2 of the engine target), opt-in, to ride.
    ...trunkSwitch(),
    // `?buoyFrame=hull`: the water's hydrostatic support points along the hull's own normal where the deck is dry and the board planes, as Savitsky's method resolves it, instead of along the water's surface normal (step 3.3d), opt-in, to ride.
    ...buoyFrameSwitch(),
    // `?waterHeel=tilt`: the balance's internal model reads the water's derivatives at the board's heel against the WATER,
    // with the face's own tilt as a measured input, instead of at its roll from the world's level (step 3.3p), opt-in, to ride.
    ...waterHeelSwitch(),
    // `?mountAgree=deck|felt|both`: the mount places the standing body square to the deck at any entry speed, and/or seeds
    // the felt vertical's low pass at the face's own normal, so the moment of standing up agrees with its own argument (step 3.4e), opt-in, to ride.
    ...mountAgreeSwitch(),
    // `?riderBody=two`: the balance's internal plant gives the rider's body an inertia of its own and solves the lateral
    // accelerations together, instead of a point mass on a massless leg with a substituted force at the feet (step 3.4a), opt-in, to ride.
    ...riderBodySwitch(),
    // `?riderCost=point|fixed|plant`: the balance's two optional costs (the bank's own limit per stance, the capture point's
    // rank-one cost) turned on together, with the capture point's ω₀ the point mass's, the body's own or the plant's own (step 3.4b), opt-in, to ride.
    ...riderCostSwitch(),
    // `?plantFloor=4.5|5|6`: the balance's internal model is built on the lowest MEASURED row of its water table at or above
    // this speed, so a design below 4 m/s stops inheriting row '4', the table's own sign-turnover row (step 3.4m), opt-in, to ride.
    ...plantFloorSwitch(),
    // `?deckHollow=on`: a banked planing board's deck, and the standing rider's legs over it, stay dry in the open hollow behind the low rail's entry (deck-hollow), opt-in, to ride.
    ...deckHollowSwitch(),
    // `?boardSpray=off`: no spray off the boards, as before board-spray, for A/Bs.
    ...boardSpraySwitch(),
    // `?lipVeil=on`: a plunging lip throws Erinin's veil and the breaker's air carries it (C2 step 5g), opt-in, to look at.
    ...lipVeilSwitch(),
    // `?spraySheet=off`: the boards' spray leaving the hull as drops, without the curtain, as before spray-sheet.
    ...spraySheetSwitch(),
    // `?snapFan=old`: the boards' spray as before snap-fan (a steep jet's exit; other players' spin is the page's), for A/Bs.
    ...snapFanSwitch(),
    // `?duckBody=old`: the duck-dive's single rigid rider and the board's planing law at any depth, as before duck-two-body.
    ...duckBodySwitch(),
    // `?canyonBeachLook=off`: the Canyon's beach peaks drawn and felt as the solver breaks them, as before canyon-beach-look.
    ...(settings.spot === 'canyon' ? canyonBeachLookSwitch() : {}),
    // `?canyonReefSeq=off`: the Canyon's reef counting its onsets as main did until canyon-reef-sequence, for A/Bs.
    ...(settings.spot === 'canyon' ? canyonReefSeqSwitch() : {}),
    ...overrides,
  };
}

/**
 * The `?startOut=<m>` dev switch (`SurfZoneConfig.startOut`): where the rider starts and relaunches, m seaward of the
 * take-off, in place of the spot's own (`rideLineupOffset`), to compare starts; nothing when absent or not a number.
 */
export function startOutSwitch(search?: string): { startOut?: number } {
  const text = devParam('startOut', search)?.trim();
  const metres = text ? Number(text) : Number.NaN;
  return Number.isFinite(metres) ? { startOut: metres } : {};
}

/**
 * The `?canyonTube=on` dev switch (`SurfZoneConfig.sweptBarrel` true at the Canyon): the reef's swept tubes, drawn and
 * felt, as main ran them from 2026-10-22 until canyon-beach-break. Off by default since (the owner, 2026-10-23: "I really
 * don't want the Canyon to have a tube; spilling waves are supposed to be the default for the Canyon. The tube in the
 * video isn't surfable"): the reef's spilling curl and its white draw every wave, as before the tubes were wired. The
 * barrel's wiring is kept for the tube work to come; online rooms run the default.
 */
export function canyonTubeSwitch(search?: string): { sweptBarrel?: true } {
  return devParam('canyonTube', search)?.trim().toLowerCase() === 'on' ? { sweptBarrel: true } : {};
}

/**
 * The `?canyonAgeJoin=<J>` dev switch (`SurfZoneConfig.canyonAgeJoin`): the Canyon's breaking age passes through the
 * diagonal parents only where the cell rises at J √(g h) or faster; 0 is rule A, the Canyon before canyon-wave-r2 (its
 * default is `CANYON.ageJoin`, 0.5). A number of 0 or more, else nothing.
 */
export function canyonAgeJoinSwitch(search?: string): { canyonAgeJoin?: number } {
  const text = devParam('canyonAgeJoin', search)?.trim();
  const join = text ? Number(text) : Number.NaN;
  return Number.isFinite(join) && join >= 0 ? { canyonAgeJoin: join } : {};
}

/**
 * The `?poolAgeJoin=<J>` dev switch (`SurfZoneConfig.poolAgeJoin`): the Wave Pool's Barrel floor's breaking age passed along
 * its crests at J (0: rule A, as before pool-barrel's gate and as its training floor runs), in place of `POOL_BARREL.ageJoin`.
 */
export function poolAgeJoinSwitch(search?: string): { poolAgeJoin?: number } {
  const text = devParam('poolAgeJoin', search)?.trim();
  const join = text ? Number(text) : Number.NaN;
  return Number.isFinite(join) && join >= 0 ? { poolAgeJoin: join } : {};
}

/**
 * The `?poolBarrel=aframe` dev switch (`SurfZoneConfig.poolBarrel`): the Wave Pool's Barrel on step 1's mirrored A-frame
 * (`POOL_BARREL`) in place of its straight reef, at the Barrel sizes' machine heights.
 */
export function poolBarrelSwitch(search?: string): { poolBarrel?: 'aframe' } {
  return devParam('poolBarrel', search)?.trim() === 'aframe' ? { poolBarrel: 'aframe' } : {};
}

/**
 * The `?poolFloor=ledge` dev switch (`SurfZoneConfig.poolFloor`, pool-ledge-floor 2026-11-08): the straight Barrel's reef
 * face as the advisor's step-7 ledge (`POOL_LEDGE`), which the owner adopted on the M4 L13 batch; anything else keeps
 * today's face. `?poolFloor=inside` (after-tube, 2026-11-11; ruling 12): today's face with a shallow shelf behind the
 * reef's top (`POOL_INSIDE`), so the whitewater behind the tube runs on. One or the other, not both. Online rooms always
 * run the default.
 */
/**
 * The `?poolSize=ref` dev switch (`SurfZoneConfig.poolSize`, pool-look-reference 2026-11-11; ruling 13): the straight
 * Barrel re-sized to the owner's reference, today's 1.8 m Barrel 1.11 times larger for 2 m faces (`POOL_REF`), in place of
 * the Small / Big choice. Anything else keeps today's sizes. Online rooms always run the default.
 */
export function poolSizeSwitch(search?: string): { poolSize?: 'ref' } {
  return devParam('poolSize', search)?.trim().toLowerCase() === 'ref' ? { poolSize: 'ref' } : {};
}

/**
 * The widths `?poolWindow` takes, m: the straight reef and its slopes span x −66 to 118, so the wrap column stays plain
 * platform. Since step 4 (ruling 16) the reference's reef is × 1.11 along its line and spans x −72 to 128: its own 311 m
 * window holds it, but a window under about 270 m does not, so A/Bs on narrow windows go with `?poolReef=short` (the
 * first build's: `?poolSize=ref&poolWindow=280&poolReef=short`).
 */
export const POOL_WINDOW_RANGE = { min: 240, max: 400 } as const;

/**
 * The `?poolWindow=<metres>` dev switch (pool-look-reference step 2, 2026-11-11; ruling 14): the width of the straight
 * Barrel's wrapped window at the reference size, in place of its 311 m (`POOL_REF.alongShore`), for A/Bs:
 * `?poolSize=ref&poolWindow=280` is the first build's window. A whole number of metres from 240 to 400 (rounded);
 * anything else keeps 311 m. Read only together with `?poolSize=ref` (`poolRefConfig`): without it, and in online rooms
 * (which pin `poolSize`), it does nothing. The machine's direction follows the width (`poolStraightDirection`).
 */
export function poolWindowSwitch(search?: string): { poolWindow?: number } {
  const raw = devParam('poolWindow', search)?.trim();
  const value = raw ? Math.round(Number(raw)) : Number.NaN;
  return value >= POOL_WINDOW_RANGE.min && value <= POOL_WINDOW_RANGE.max ? { poolWindow: value } : {};
}

/**
 * The `?poolHeld=old` dev switch (pool-look-reference step 4, 2026-11-11; ruling 16): the reference size's tube case held
 * at the frame the old rule finds (`big`'s frame 176, whose jet area counts the void too), for A/Bs against the jet-step
 * test (`heldFrameJetStep`, frame 175). Read only together with `?poolSize=ref` (`poolRefConfig`): without it, and in
 * online rooms (which pin `poolSize`), it does nothing.
 */
export function poolHeldOld(search?: string): boolean {
  return devParam('poolHeld', search)?.trim().toLowerCase() === 'old';
}

/**
 * The `?poolReef=short` dev switch (pool-look-reference step 4, 2026-11-11; ruling 16): the reference size's reef with
 * the 1.8 m Barrel's own lengths along its line (235 m long from x 115, take-off at s 40, the front's reach s 20 to 100),
 * as before step 4, for A/Bs against the lengths × 1.11 (`POOL_REF`). Read only together with `?poolSize=ref`
 * (`poolRefConfig`): without it, and in online rooms (which pin `poolSize`), it does nothing.
 */
export function poolReefShort(search?: string): boolean {
  return devParam('poolReef', search)?.trim().toLowerCase() === 'short';
}

/**
 * The `?poolReach=long` dev switch (pool-look-reference step 5, 2026-11-12; ruling 17): the reference size's tube front
 * follows crests to s 150 along the long reef, not 111 (`POOL_REF_FRONT_REACH_LONG`), so the tube is 39 m longer. Read
 * only together with `?poolSize=ref` and without `?poolReef=short` (`poolRefConfig`): otherwise, and in online rooms
 * (which pin `poolSize`), it does nothing.
 */
export function poolReachLong(search?: string): boolean {
  return devParam('poolReach', search)?.trim().toLowerCase() === 'long';
}

export function poolFloorSwitch(search?: string): { poolFloor?: 'ledge' | 'inside' } {
  const value = devParam('poolFloor', search)?.trim().toLowerCase();
  return value === 'ledge' || value === 'inside' ? { poolFloor: value } : {};
}

/**
 * The `?poolTube=off` and `?poolCrash=off` dev switches (`SurfZoneConfig.sweptBarrel`, `.sweptCrash`; pool-barrel-drawing,
 * 2026-11-01): the Wave Pool's straight Barrel as merged before its tube was drawn (no swept barrel: the solver's white and
 * its lip sheet), or with its tube drawn and felt but the solver's own lip throws in place of the tube's jets (the crash's
 * A/B: the crash changes the pool's water). Nothing otherwise; online rooms run the default.
 */
export function poolTubeSwitch(search?: string): { sweptBarrel?: false; sweptCrash?: false } {
  if (devParam('poolTube', search)?.trim().toLowerCase() === 'off') return { sweptBarrel: false };
  return devParam('poolCrash', search)?.trim().toLowerCase() === 'off' ? { sweptCrash: false } : {};
}

/**
 * The surfable tube's dev switches (`SurfZoneConfig.tubeFace`, `.tubeFrom`, `.tubeLag`, `.tubeClock`; pool-tube-face,
 * 2026-11-03, the water-physics advisor's step 3 ruling): `?tubeFace=old`, the support the loft's floor wherever it is;
 * `?tubeFrom=piece`, the fitted piece (the crest anchor, the forward rest, zero lag, the 2× clock); both together, the
 * build before; `?tubeLag=0`, the join at the white; `?tubeClock=old`, the 2× catch-up after the throw. Step 7, Q1's
 * (pool-tube-wall, 2026-11-04, the advisor's ruling): `?tubeAnchor=old`, the anchor's shift afresh each build (no
 * continuity); `?tubeForm=old`, the lagged join and clock of step 6 (no formation by distance); `?tubeThrow=break`, by
 * distance, the throw waits for the solver's break too; `?wallFlow=old`, the wall's water the solver's flow. The first three
 * of those old together are step 6's build. The step 7 follow-up's (pool-tube-contact, 2026-11-05, the advisor's second
 * ruling): `?tubeContact=old`, a body's water from the vertical line through it; `?tubeCap=old`, the anchor's cap at 0.3 C;
 * `?tubeMerge=old`, joins and overlap drops as before; all three old together are main's build before it. `?tubeGuard=on`
 * (opt-in) turns on the retire guard by the case's open time. Ruling 3's (pool-tube-track, 2026-11-05, the advisor's third
 * ruling): `?tubeInertia=old`, no water acceleration on the added mass in the wall water; `?tubeInertia=path`, that
 * acceleration along the board's path even with `?wallBody=stream` (which takes the water's own, step 2 of the surfer
 * track, docs/research/board-in-water/b-wall); `?tubeRetire=old`, contour-thrown
 * points retired unbroken as before; both old together are main's build before it; `?tubeTrack=on` (opt-in), the smooth
 * wall (the trough read, the tracked anchor, the wall water's speed, normal speed and blend); `?tubeBuoy=on` (opt-in), the
 * wall water's buoyancy along the true normal past the clamp; `?tubeDrop=on` (opt-in), the lighter of two overlapping strips
 * gives way. Ruling 4's rank 1 (form-clock, 2026-11-11, the advisor's fourth ruling): `?formClock=old`, step 7's formation
 * clock exactly; `?formClock=c1`, the C1 clock (a rate that follows −D/C_p critically damped, a sub-cell crest, the wall
 * water on the same rate); neither: `FORM_CLOCK_DEFAULT`'s. Ruling 5's (tube-seam, 2026-11-11), opt-in: `?tubeSeam=blend`,
 * the seam blend (one weight for the case's loft, contact and flow, by its height over the solver's surface and its slice
 * clock), with `?seamTau=on,full` (the clock's course, s; −0.5,0 without it) and `?seamBand=m` (the height band; 0.25),
 * both read with it alone. Ruling 6's (wall-body, 2026-11-11), opt-in: `?wallBody=stream`, the streamline wall water (the
 * case's water follows its surface at the wave's own speed), read with `?tubeSeam=blend` alone. Ruling 7's step 1
 * (crest-line, 2026-11-11), opt-in: `?crestLine=sub` or `?crestLine=top`, each front point stands where its crest stands
 * within its cell before its throw (by the parabola through three cells, or by the centre of the crest's top quarter).
 * Ruling 17's (pool-look-reference step 5, 2026-11-12), opt-in: `?tubeForm=early`, the seam blend's share runs from −2.3
 * to −0.7 √(h0/g) before the throw (h0 the point's foot depth), not over the last 0.5 s; the switch turns `?tubeSeam=blend`
 * and `?crestLine=top` on by itself (a `?crestLine=sub` given is kept), and a `?seamTau` given with it wins.
 * Ruling 18's build 1 (pool-look-reference step 6, 2026-11-12), opt-in: `?anchorLine=smooth`, the kept anchor shifts
 * smoothed along the crest once more and the loft's records joined by a C1 curve, read with the crest line alone
 * (`?crestLine`, or `?tubeForm=early`). Its build 2, opt-in: `?loftMesh=arc`, the loft's vertices before the throw at
 * fixed shares of the crest-to-toe arc (the same curve, no pleats where the lip mark slides).
 * Ruling 21 (pool-look-reference step 9, 2026-11-12), opt-in and with the seam blend alone: `?wallFoot=dug`, the wave's
 * front keeps the case's own surface where it lies under the sea, and returns to the sea ahead of the toe.
 * Ruling 11's step 1 (after-tube, 2026-11-11), opt-in: `?afterTube=roller`, the Canyon's roller lens seeded where the
 * lip touches down, drawn only (the rider's water does not read it).
 * Online rooms run the defaults (the guard, the smooth wall, the buoyancy, the drop rule, the seam blend, the streamline
 * wall water, the crest line, the smooth anchor line, the arc mesh, the dug foot and the after-tube roller off).
 */
export function tubeFaceSwitches(search?: string): Pick<SurfZoneConfig, 'tubeFace' | 'tubeFrom' | 'tubeLag' | 'tubeClock' | 'tubeAnchor' | 'tubeForm' | 'tubeThrow' | 'wallFlow' | 'tubeContact' | 'tubeCap' | 'tubeMerge' | 'tubeGuard' | 'tubeTrack' | 'tubeInertia' | 'tubeRetire' | 'tubeBuoy' | 'tubeDrop' | 'formClock' | 'tubeSeam' | 'seamTau' | 'seamBand' | 'wallBody' | 'crestLine' | 'anchorLine' | 'loftMesh' | 'wallFoot' | 'afterTube'> {
  const value = (name: string) => devParam(name, search)?.trim().toLowerCase();
  const seamTau = parseSeamTau(value('seamTau'));
  const seamBand = parseSeamBand(value('seamBand'));
  // Ruling 17's `?tubeForm=early` turns the seam blend and the crest line on by itself.
  const early = value('tubeForm') === 'early';
  const blend = value('tubeSeam') === 'blend' || early;
  return {
    ...(value('tubeFace') === 'old' ? { tubeFace: 'old' as const } : {}),
    ...(value('tubeFrom') === 'piece' ? { tubeFrom: 'piece' as const } : {}),
    ...(value('tubeLag') === '0' ? { tubeLag: 0 as const } : {}),
    ...(value('tubeClock') === 'old' ? { tubeClock: 'old' as const } : {}),
    ...(value('tubeAnchor') === 'old' ? { tubeAnchor: 'old' as const } : {}),
    ...(value('tubeForm') === 'old' ? { tubeForm: 'old' as const } : early ? { tubeForm: 'early' as const } : {}),
    ...(value('tubeThrow') === 'break' ? { tubeThrow: 'break' as const } : {}),
    ...(value('wallFlow') === 'old' ? { wallFlow: 'old' as const } : {}),
    ...(value('tubeContact') === 'old' ? { tubeContact: 'old' as const } : {}),
    ...(value('tubeCap') === 'old' ? { tubeCap: 'old' as const } : {}),
    ...(value('tubeMerge') === 'old' ? { tubeMerge: 'old' as const } : {}),
    ...(value('tubeGuard') === 'on' ? { tubeGuard: 'on' as const } : {}),
    ...(value('tubeTrack') === 'on' ? { tubeTrack: 'on' as const } : {}),
    ...(value('tubeInertia') === 'old' ? { tubeInertia: 'old' as const } : value('tubeInertia') === 'path' ? { tubeInertia: 'path' as const } : {}),
    ...(value('tubeRetire') === 'old' ? { tubeRetire: 'old' as const } : {}),
    ...(value('tubeBuoy') === 'on' ? { tubeBuoy: 'on' as const } : {}),
    ...(value('tubeDrop') === 'on' ? { tubeDrop: 'on' as const } : {}),
    ...(value('formClock') === 'old' ? { formClock: 'old' as const } : value('formClock') === 'c1' ? { formClock: 'c1' as const } : {}),
    ...(blend ? { tubeSeam: 'blend' as const, ...(seamTau ? { seamTau } : {}), ...(seamBand !== undefined ? { seamBand } : {}) } : {}),
    ...(blend && value('wallBody') === 'stream' ? { wallBody: 'stream' as const } : {}),
    ...(value('afterTube') === 'roller' ? { afterTube: 'roller' as const } : {}),
    ...(value('crestLine') === 'sub' || value('crestLine') === 'top' ? { crestLine: value('crestLine') as 'sub' | 'top' } : early ? { crestLine: 'top' as const } : {}),
    ...(value('anchorLine') === 'smooth' ? { anchorLine: 'smooth' as const } : {}),
    ...(value('loftMesh') === 'arc' ? { loftMesh: 'arc' as const } : {}),
    ...(blend && value('wallFoot') === 'dug' ? { wallFoot: 'dug' as const } : {}),
  };
}

/**
 * The `?poolTubeCase` dev switch (`SurfZoneConfig.poolTubeCase`; pool-tube-cases, 2026-11-03; pool-tube-face, 2026-11-04):
 * which cases draw and feel the Wave Pool's straight Barrel's tube. The default is the Canyon's a38 (the owner, 2026-11-04,
 * until the bigger-tube work lands); `?poolTubeCase=pool` draws the owner's level-13 runs on the pool's own reef instead,
 * to compare the two, and `?poolTubeCase=a38` names the default. Anything else is the default. Online rooms run the
 * default.
 */
export function poolTubeCaseSwitch(search?: string): { poolTubeCase?: PoolTubeCase } {
  const value = devParam('poolTubeCase', search)?.trim().toLowerCase();
  return value === 'pool' || value === 'a38' ? { poolTubeCase: value } : {};
}

/**
 * The `?wave=library` dev switch (`SurfZoneConfig.wave`; C2 step 3, docs/research/wave-strategy-alternatives/c2-step3.md):
 * the 2 m pool's breaking wave from the Basilisk library, handed over from the sea lane by lane, written into the water's
 * own render nodes and lofted where it overturns. Read with `?poolSize=ref` alone (the surf zone builds it only there).
 * Anything else: off. Online rooms pin it off.
 */
export function waveSwitch(search?: string): { wave?: 'library' } {
  return devParam('wave', search)?.trim().toLowerCase() === 'library' ? { wave: 'library' } : {};
}

/**
 * The `?canyonReefSeq=off` dev switch (`SurfZoneConfig.canyonReefSeq` false): the Canyon's reef counts its waves' onsets
 * as main did until canyon-reef-sequence (2026-10-27), where a bore dropping out or the shore break behind the reef kept
 * the next crest's onsets out and its white undrawn across metres of the peak (`CANYON.reefBoreHold`). 'off', else nothing.
 */
export function canyonReefSeqSwitch(search?: string): { canyonReefSeq?: false } {
  return devParam('canyonReefSeq', search)?.trim().toLowerCase() === 'off' ? { canyonReefSeq: false } : {};
}

/**
 * The `?canyonBeachLook=off` dev switch (`SurfZoneConfig.canyonBeachLook` false): the Canyon's beach peaks without the
 * reef's spilling look (canyon-beach-look, 2026-10-28): no drawn lip or curl, roller lenses, roller push or roller front
 * there, their whitewater the solver's own, as main drew them until then. 'off', else nothing.
 */
export function canyonBeachLookSwitch(search?: string): { canyonBeachLook?: false } {
  return devParam('canyonBeachLook', search)?.trim().toLowerCase() === 'off' ? { canyonBeachLook: false } : {};
}

/**
 * The `?onset=old` dev switch (`SurfZoneConfig.onsetRule`): every spot's Kennedy onset as before step 3b of the all-spots
 * survey (2026-10-28), one value a spot, the Canyon's per-cell field kept: today the Point's depth-keyed onset (0.45 in
 * water up to 3 m, 0.65 by 4.5 m, `POINT_ONSET`) goes back to its flat 0.65. 'old', else nothing.
 */
export function onsetSwitch(search?: string): { onsetRule?: 'old' } {
  return devParam('onset', search)?.trim().toLowerCase() === 'old' ? { onsetRule: 'old' } : {};
}

/**
 * The `?stroke=old` dev switch (`SurfZoneConfig.stroke`): every spot's paddler with hands that meet water outrunning the
 * stroke broadside and the sprint's blade as fitted before, as until canyon-catch (2026-10-29). 'old', else nothing.
 */
export function strokeSwitch(search?: string): { stroke?: 'old' } {
  return devParam('stroke', search)?.trim().toLowerCase() === 'old' ? { stroke: 'old' } : {};
}

/**
 * The `?plainHeight=old` dev switch (`SurfZoneConfig.plainHeight`, pool-barrel-perf 2026-11-06): every spot's water reads
 * its plain surface's heights as before, gathering a sample's 16 render nodes every time, in place of keeping the last
 * sample's within a cache scope. The same bits either way; only the speed differs.
 */
export function plainHeightSwitch(search?: string): { plainHeight?: 'old' } {
  return devParam('plainHeight', search)?.trim().toLowerCase() === 'old' ? { plainHeight: 'old' } : {};
}

/**
 * barrel-gpu's dev switches (2026-11-06; `SurfZoneConfig.deviceWater`, `launchWater`, `devicePlunge`), every spot:
 * `?deviceWater=old` sends the water the CPU changed as one span from the first changed cell to the last; `?launchWater=old`
 * has each lip launch mark the whole water; `?devicePlunge=old` sends the whole plunge zone when a cell enters or leaves
 * it. Each 'old', else nothing. The device holds the same water either way; only the bytes it is sent differ.
 */
export function deviceTrafficSwitches(search?: string): { deviceWater?: 'old'; launchWater?: 'old'; devicePlunge?: 'old' } {
  const old = (name: string) => devParam(name, search)?.trim().toLowerCase() === 'old';
  return {
    ...(old('deviceWater') ? { deviceWater: 'old' as const } : {}),
    ...(old('launchWater') ? { launchWater: 'old' as const } : {}),
    ...(old('devicePlunge') ? { devicePlunge: 'old' as const } : {}),
  };
}

/**
 * The `?barrelGpu=off` dev switch (`SurfZoneConfig.barrelGpu`, barrel-gpu 2026-11-06): the Wave Pool's straight Barrel, whose
 * sea is periodic along shore, steps its water on the CPU as before, in place of the GPU. 'off', else nothing.
 */
export function barrelGpuSwitch(search?: string): { barrelGpu?: 'off' } {
  return devParam('barrelGpu', search)?.trim().toLowerCase() === 'off' ? { barrelGpu: 'off' } : {};
}

/**
 * The `?contactRows=old` dev switch (`SurfZoneConfig.contactRows`, pool-barrel-perf 2026-11-06): the Wave Pool's straight
 * Barrel's worker contact builds every row's heights and normals at each step, as before, in place of finding them as the
 * bodies' queries need them. The same answers either way; only the speed differs. 'old', else nothing.
 */
export function contactRowsSwitch(search?: string): { contactRows?: 'old' } {
  return devParam('contactRows', search)?.trim().toLowerCase() === 'old' ? { contactRows: 'old' } : {};
}

/**
 * The `?surfaceMotion=old` dev switch (`SurfZoneConfig.surfaceMotion`, popup-moving-face 2026-10-29): every spot's
 * boards and riders sample the sea's surface held still through their step, as before, in place of moving at its rise
 * rate to each substep's time.
 */
export function surfaceMotionSwitch(search?: string): { surfaceMotion?: 'old' } {
  return devParam('surfaceMotion', search)?.trim().toLowerCase() === 'old' ? { surfaceMotion: 'old' } : {};
}

/**
 * The `?swim=old` dev switch (`SurfZoneConfig.swim`, swim-back 2026-10-29): every spot's fallen surfer gets back on the
 * board as before, the reel stopping by the ankle and the hands' and chest's springs pulling the body onto the deck, in
 * place of the reel to the hand and the climb from where the body is.
 */
export function swimSwitch(search?: string): { swim?: 'old' } {
  return devParam('swim', search)?.trim().toLowerCase() === 'old' ? { swim: 'old' } : {};
}

/**
 * The `?froth=old` dev switch (`SurfZoneConfig.froth`, bottom-stop 2026-10-29): a roller's froth drags a board's whole
 * wetted hull anywhere in the lens's footprint, past the lens's g-blended flow and uncapped, as before, in place of only
 * where the lens reaches, past the roller's own water and at most its grip on the face. Only the Canyon has roller lenses.
 */
export function frothSwitch(search?: string): { froth?: 'old' } {
  return devParam('froth', search)?.trim().toLowerCase() === 'old' ? { froth: 'old' } : {};
}

/**
 * The `?extension=old` dev switch (`SurfZoneConfig.extension`, compress-exit 2026-10-29): every spot's rider, letting
 * Compress go, extends the legs at their full pace, as before, in place of no faster than the stance's spring can catch
 * the body.
 */
export function extensionSwitch(search?: string): { extension?: 'old' } {
  return devParam('extension', search)?.trim().toLowerCase() === 'old' ? { extension: 'old' } : {};
}

/**
 * The `?snap=off` dev switch (`SurfZoneConfig.snap`, the snap stance 2026-11-03): every spot's rider ignores Snap's
 * input (Q, RB, the touch button), as before the stance.
 */
export function snapSwitch(search?: string): { snap?: 'off' } {
  return devParam('snap', search)?.trim().toLowerCase() === 'off' ? { snap: 'off' } : {};
}

/**
 * The `?snapQuick=old` dev switch (`SurfZoneConfig.snapQuick`, snap-quick 2026-11-05): every spot's rider sets Snap up
 * at the balance's calm pace, as before, in place of the shoulders and the weight going onto the tail as fast as the body
 * can take them.
 */
export function snapQuickSwitch(search?: string): { snapQuick?: 'old' } {
  return devParam('snapQuick', search)?.trim().toLowerCase() === 'old' ? { snapQuick: 'old' } : {};
}

/**
 * The `?snapPivot=lean` dev switch (`SurfZoneConfig.snapPivot`, snap-lean 2026-11-05, the owner's pick): every spot's
 * rider leans Snap as far as its tight turn holds, up to 70°, in place of the steer's 50°. Opt-in, to ride on waves.
 */
export function snapPivotSwitch(search?: string): { snapPivot?: 'lean' } {
  return devParam('snapPivot', search)?.trim().toLowerCase() === 'lean' ? { snapPivot: 'lean' } : {};
}

/**
 * The `?snapRecentre=old` dev switch (`SurfZoneConfig.snapRecentre`, snap-recentre 2026-11-06, the owner's "stuck in snap
 * stance"): every spot's rider, letting Snap go, leaves the weight over the tail, as before, in place of centring it again.
 */
export function snapRecentreSwitch(search?: string): { snapRecentre?: 'old' } {
  return devParam('snapRecentre', search)?.trim().toLowerCase() === 'old' ? { snapRecentre: 'old' } : {};
}

/**
 * The `?snapUpturn=old` dev switch (`SurfZoneConfig.snapUpturn`, snap-upturn 2026-11-08, the owner's "I can't turn UP
 * the wave"): with `?snapPivot=lean`, every spot's rider leans a Snap up the face as far as a top turn, as before, in
 * place of the steer's rail.
 */
export function snapUpturnSwitch(search?: string): { snapUpturn?: 'old' } {
  return devParam('snapUpturn', search)?.trim().toLowerCase() === 'old' ? { snapUpturn: 'old' } : {};
}

/**
 * The `?snapDepth=deep` dev switch (`SurfZoneConfig.snapDepth`, snap-carve 2026-11-08, the owner's "doesn't lower the
 * center of gravity so much"): opt-in, every spot's rider loads Snap's legs to the tube tuck's 0.45 m in place of
 * Compress's 0.3 m.
 */
export function snapDepthSwitch(search?: string): { snapDepth?: 'deep' } {
  return devParam('snapDepth', search)?.trim().toLowerCase() === 'deep' ? { snapDepth: 'deep' } : {};
}

/**
 * The `?agile=on` dev switch (`SurfZoneConfig.agile`, rider-agile 2026-11-09, the owner's "the movement work that allows
 * for snap"): opt-in, every spot's rider uses its two legs apart, and a full steer under Snap launches the tail with the
 * feet's couple in place of the stamp; a partial steer is Snap's carve as before.
 */
export function agileSwitch(search?: string): { agile?: 'on' } {
  return devParam('agile', search)?.trim().toLowerCase() === 'on' ? { agile: 'on' } : {};
}

/**
 * The `?legDrive=on` dev switch (`SurfZoneConfig.legDrive`, leg-drive 2026-11-10, "no force without its reaction"):
 * opt-in, every spot's rider rights itself at a rail change by its legs, a push on the body toward the new rail with its
 * equal and opposite on the board at the back foot, in the place of the lean-out pull on the body alone.
 *
 * **`?legDrive=turn`** (step 3.2t) is that and one thing more: the same leg pair leads the lean into a compressed turn,
 * in COMPRESS_PULL's place, so the compressed turn's inward pull on the body is paired too (`AttachedRider`'s `legTurn` note).
 */
export function legDriveSwitch(search?: string): { legDrive?: 'on' | 'turn' } {
  const value = devParam('legDrive', search)?.trim().toLowerCase();
  return value === 'on' ? { legDrive: 'on' } : value === 'turn' ? { legDrive: 'turn' } : {};
}

/**
 * The `?hull=rail`, `?railSuction=off` and `?compressPull=off` dev switches (step 3.2u; `SurfZoneConfig.hull`,
 * `.railSuction`, `.compressPull`).
 *
 * `?hull=rail` gives the board a cross-section: a flat bottom out to the rail, then a circular band with its own
 * normals, and on the buried rail's leeward facets the band's **suction** with a ventilation latch
 * (`BoardShape`'s `RAIL_BAND`, `hullForces`' `RAIL_SUCTION`, `BoardBody`'s `RAIL_LATCH`). Until this every bottom patch
 * carried one flat-bottom normal, so rolled on its rail the board had no surface left pointing down and the hull could
 * only push, never grip. `?railSuction=off` builds the section and makes no suction, which tells the geometry's own
 * effect from the grip's. `?compressPull=off` deletes COMPRESS_PULL, the old rider's unpaired sideways force in a
 * compressed turn, with nothing in its place. All three opt-in, to ride; online rooms run the default.
 */
export function hullSwitch(search?: string): { hull?: 'rail'; railSuction?: 'off'; compressPull?: 'off' } {
  const hull = devParam('hull', search)?.trim().toLowerCase();
  const suction = devParam('railSuction', search)?.trim().toLowerCase();
  const pull = devParam('compressPull', search)?.trim().toLowerCase();
  return {
    ...(hull === 'rail' ? { hull: 'rail' as const } : {}),
    ...(suction === 'off' ? { railSuction: 'off' as const } : {}),
    ...(pull === 'off' ? { compressPull: 'off' as const } : {}),
  };
}

/**
 * The `?carveFlex=on` dev switch (`SurfZoneConfig.carveFlex`, carve-flex 2026-11-10, the owner: the surfer's movement in
 * turns is "very off"): opt-in, every spot's standing rider flexes the legs with a steered turn's load, the knees sinking
 * as the load comes on and extending as it ends, to a moderate crouch at most; Compress stays the deeper stance.
 */
export function carveFlexSwitch(search?: string): { carveFlex?: 'on' } {
  return devParam('carveFlex', search)?.trim().toLowerCase() === 'on' ? { carveFlex: 'on' } : {};
}

/**
 * The `?snapLegs=drive` dev switch (`SurfZoneConfig.snapLegs`, snap-legs 2026-11-10, the owner on a cutback: the
 * surfer's movement "is very off"): opt-in, every spot's rider under Snap with the stick pushed loads the legs as the
 * Snap begins and extends them as the board comes round, in place of holding Snap's full depth for as long as it is held.
 */
export function snapLegsSwitch(search?: string): { snapLegs?: 'drive' } {
  return devParam('snapLegs', search)?.trim().toLowerCase() === 'drive' ? { snapLegs: 'drive' } : {};
}

/**
 * The `?snapCross=on` dev switch (`SurfZoneConfig.snapCross`, snap-cross 2026-11-10, the owner on a cutback: "very off",
 * not as sharp as a surfer's): opt-in, every spot's rider taking Snap on the other rail keeps the weight where it is
 * until the body has come over the board, the back foot pushing it across, and only then weights the tail.
 */
export function snapCrossSwitch(search?: string): { snapCross?: 'on' } {
  return devParam('snapCross', search)?.trim().toLowerCase() === 'on' ? { snapCross: 'on' } : {};
}

/**
 * The `?legPower=cap` dev switch (`SurfZoneConfig.legPower`, ruling 27's A-lite 2026-11-12, the board study's energy leak
 * on steep water): opt-in, every spot's standing rider whose feet cannot give the push the coupled solve needs hands the
 * board only what the legs give, and the contact's net power stays within a human's (docs/research/board-in-water/a-lite).
 */
export function legPowerSwitch(search?: string): { legPower?: 'cap' } {
  return devParam('legPower', search)?.trim().toLowerCase() === 'cap' ? { legPower: 'cap' } : {};
}

/**
 * The `?rider=new` dev switch (`SurfZoneConfig.rider`, the new surfer's steps, docs/research/new-rider/design.md and the
 * advisor's ruling 29): opt-in, every spot's rider is the new surfer. Step 3.1: standing, the body is free along the board
 * as well (a ninth unknown in the board's solve), leaning with the face on its pitch ankle; the knees are softer, with a
 * strength cap; the contact's power is A-lite's window (docs/research/new-rider/3.1). Anything else, the old rider.
 */
export function riderSwitch(search?: string): { rider?: 'new' } {
  return devParam('rider', search)?.trim().toLowerCase() === 'new' ? { rider: 'new' } : {};
}

/**
 * The `?feltFrame=deck` dev switch (`SurfZoneConfig.feltFrame`, step 3.3c, the wave-shape advisor's second ruling of
 * 2026-11-15): opt-in, every spot's standing rider keeps the felt vertical's 0.1 s low pass on the **deck's own axes**,
 * which is what a body-fixed sensor does, instead of low-passing it in the world and only then reading it against a
 * deck that has rolled under it. The time constant and the smoothing are unchanged; no force, no hull law and no spot's
 * drive is touched (docs/research/new-rider/3.3 Part 27). Anything else, the world frame as before.
 */
export function feltFrameSwitch(search?: string): { feltFrame?: 'deck' } {
  return devParam('feltFrame', search)?.trim().toLowerCase() === 'deck' ? { feltFrame: 'deck' } : {};
}

/**
 * The `?kneeRoom=achieved` dev switch (`SurfZoneConfig.kneeRoom`, step 3.3f): opt-in, the new surfer's balance reads
 * the **knees' travel left** (`humanBalance`'s `stanceRoom`) at the depth its leg has actually reached rather than at
 * the depth the player commands. By default a standing rider whose balance has its knees down rests the leg at
 * `CROUCH_DEPTH` itself, so pressing Compress adds only 0.05 m of the 0.30 m it is for — measured as 0.067–0.299 m of
 * contrast over twelve cells against the default rider's 0.296–0.300 (docs/research/new-rider/3.3 Part 29). Nothing on
 * the default rider, no force and no hull law. Anything else, the commanded depth as before.
 */
export function kneeRoomSwitch(search?: string): { kneeRoom?: 'achieved' } {
  return devParam('kneeRoom', search)?.trim().toLowerCase() === 'achieved' ? { kneeRoom: 'achieved' } : {};
}

/**
 * The `?stanceReach=keep` dev switch (`SurfZoneConfig.stanceReach`, step 3.3h): opt-in, **a deep crouch keeps its
 * catching reach** — the stance room's hip range and arms (`humanBalance`'s `stanceRoom`) are read at the riding
 * stance whatever the leg's depth is, while the knees' travel stays the stance's own. By default Compress's reach is
 * 0.161–0.181 m against the standing stance's 0.252–0.354, measured over twelve runs a stance in step 3.3g §2b, so
 * the crouch wins the fall test's moment bar by 1.3–1.7× and loses its catching reach by 1.4–2.2×. **The owner's
 * ruling of 2026-11-16** keeps the reach: *"a deep crouch keeps its arms and hip swing."* Nothing on the default
 * rider, no force and no hull law. Anything else, the stance's own room as before.
 */
export function stanceReachSwitch(search?: string): { stanceReach?: 'keep' } {
  return devParam('stanceReach', search)?.trim().toLowerCase() === 'keep' ? { stanceReach: 'keep' } : {};
}

/**
 * The `?ankleLimit=feet` dev switch (`SurfZoneConfig.ankleLimit`, step 3.3i): opt-in, **the ankle's torque is bounded
 * by the moment the soles can transmit** — the load through the legs times the feet's own half-width across, which
 * `AttachedRider`'s LEAN_IN_RATE note derives at `m g d` = 716 N × 0.13 m = 93 N·m and which nothing enforced. Step
 * 3.3i measured the shipped ankle's demand at a median of 23–33 N·m, which is 30 % of that bound, and a **peak of
 * 717 N·m**, past the bound in 2.3–10.1 % of substeps and by up to 4.9×, over twelve full-stick runs. Nothing on the
 * default rider, no force and no hull law. Anything else, the ankle unbounded as before.
 */
export function ankleLimitSwitch(search?: string): { ankleLimit?: 'feet' } {
  return devParam('ankleLimit', search)?.trim().toLowerCase() === 'feet' ? { ankleLimit: 'feet' } : {};
}

/**
 * The `?ankleRange=load|wide` dev switch (`SurfZoneConfig.ankleRange`, step 3.3k): opt-in, **the bound on the rest the
 * balance may command at the ankle**. Step 3.3j measured the shipped bound — ANKLE_REST_RANGE, ±14.32° — at its stop
 * at the fall in **62 of 72** runs while the hip still had room in 69 of 72, and asked for exactly one A/B on it.
 * `load` is that bound's own derivation (`rollModel.bankAuthority`'s `restRange = footReach · m g / series`) read with
 * the **live** load and the **live** sole, so it is identically the shipped 14.32° at one body weight on the standing
 * support, wider under load and narrower when the feet go light; `wide` is twice the shipped bound, which no geometry
 * pays for and which is here because a plain widening is what step 3.3j's prediction was written against. Nothing on
 * the default rider, no force and no hull law. Anything else, the shipped bound as before.
 */
export function ankleRangeSwitch(search?: string): { ankleRange?: 'load' | 'wide' } {
  const v = devParam('ankleRange', search)?.trim().toLowerCase();
  return v === 'load' || v === 'wide' ? { ankleRange: v } : {};
}

/**
 * The `?bankClamp=off` dev switch (`SurfZoneConfig.bankClamp`, step 3.4i): opt-in, **the 70 degree clamp on the
 * MEASURED bank lifted** at `AttachedRider.frame`'s three sites. The bank there is a *reading* — how far the body's
 * centre of mass leans over its feet — and it is the datum the ankle's own spring and the body's frame are built on,
 * so past MAX_BANK the spring pulls against a lean the body is not at. Step 3.4h measured `bankFall` at 70.00 exactly
 * in 21 of 24 runs of the shipped arm, which is why the published fall classifier's 45 degree threshold could not be
 * read. `off` removes those three clamps and nothing else: every other MAX_BANK in the file bounds a force or a
 * command and is left as it ships. Nothing on the default rider, no force and no hull law. Anything else, the clamp
 * as before.
 */
export function bankClampSwitch(search?: string): { bankClamp?: 'off' } {
  return devParam('bankClamp', search)?.trim().toLowerCase() === 'off' ? { bankClamp: 'off' } : {};
}

/**
 * The `?askCap=1.5|2|4|4.5|9` dev switch (`SurfZoneConfig.askCap`, step 3.5a, the owner's ruling of 2026-11-17 —
 * *"Yes — cap the ask"*): opt-in, **the lean the rider asks for bounded by what its speed can hold**, on this minimum
 * carved radius in metres. The bound is `θ_max = atan(v² / (g R_min))` and it applies to **both** reference lines
 * `prepareBank` writes — the balance's own (`leanAsked`, the predictor's reference) and the steer's
 * (`bankReference`) — which are the two the ruling names. On the advisor's 2.0 m
 * (`docs/research/water-physics/board-roll-stiffness.md` §7) it is **4.9° at 1.3 m/s, 25° at 3, 52° at 5, 65° at 6.5**.
 *
 * **The cap is not new, and that is the first thing to know about this switch.** `AttachedRider.prepareBank` has
 * bounded both lines by exactly this formula since 2026-10, at `TURN_RADIUS = 4.5 m` — *tighter* than 2.0 m, giving
 * 2.2° at 1.3 m/s against 4.9° and 29.5° at 5 against 52° — and shipped the bound is **0 whenever the board is not
 * planing**, so below `PLANING_DROP = 3 m/s` the rider already asks to stand perfectly plumb. So every value of this
 * switch at or below 4.5 m **loosens** the low-speed ask and tightens nothing, and the switch does two separable
 * things: it replaces R_min and it removes the planing gate. `4.5` keeps the shipped radius and isolates the gate;
 * `9` is the opposite direction — double the shipped radius, so a genuinely TIGHTER cap wherever the board planes —
 * and it is here because the loosening direction was measured worse and the tightening one had to be measured too.
 *
 * **R_min is the one unsourced number here.** Nobody has published a shortboard's minimum carved radius: 2.0 m is the
 * advisor's judgement from a 1.778 m board's rail line, 1.5 and 4 the bracket it offered beside it, 9 this round's own
 * tightening arm, and 4.5 the constant the game already chose from a Canyon ride report and Forsyth et al. 2024's 3.8 m bottom turns.
 *
 * It bounds a **command**, so it is **not a hidden motor**: no torque, damper, brake or yaw moment is added, and no
 * force the water or the board applies is touched. Both riders read it, since both reference lines live in
 * `prepareBank`. Nothing on the default rider. Anything else, the shipped 4.5 m with its planing gate, as before.
 * docs/research/new-rider/3.5 Part 1.
 */
export function askCapSwitch(search?: string): { askCap?: '1.5' | '2' | '4' | '4.5' | '9' } {
  const v = devParam('askCap', search)?.trim().toLowerCase();
  return v === '1.5' || v === '2' || v === '4' || v === '4.5' || v === '9' ? { askCap: v } : {};
}

/**
 * The `?stanceDeep` dev switch (`SurfZoneConfig.stanceDeep`, step 3.5b, **shipped by default since step 3.5c**):
 * **the stance ladder's fourth rung — the tube tuck's 0.45 m of leg depth — read by the balance**. Without it
 * `stanceAt` clamps the depth at Compress's 0.30 m (`predictiveBalance.ts`) and the gain schedule clamps it again at
 * its own last knot, so every leg deeper than Compress is designed with Compress's pendulum length (0.55 m, **37.5 %
 * too long**), body inertia (**1.89x** out), rider yaw inertia and bank limit. On `?rider=new` the **achieved** depth
 * already passes that ceiling in **0.11–0.96 of Compress's live ticks, 20 of 20 runs** (step 3.3f's uncommanded knee
 * drop, up to 0.044 m on top of the command), so the clamp was never a deep-stance-only matter. The row is
 * `STANCE_TUCK` (measured from de Leva's segments, `3.2/inertia.probe.ts`) plus the schedule's fourth knot, together
 * — **neither reaches the gains without the other.**
 *
 * **The owner's ruling D of 2026-11-17 was "keep the row", read as the correct physics shipping by default**, shown
 * that on step 3.5b's own cell it takes 0.70 s (23 %) off Compress's median ride with the fall count unchanged at
 * 20 of 20. **`off` is the old three-row plant, kept so a ride can still be priced against this track's published
 * history** — every ride time it published before that ruling was measured on the clamped plant. `on` is the shipped
 * behaviour spelled out loud, so step 3.5b's own addresses keep working. Anything else, the shipped fourth rung.
 *
 * Nothing on the default rider, no force and no hull law.
 */
export function stanceDeepSwitch(search?: string): { stanceDeep?: 'on' | 'off' } {
  const v = devParam('stanceDeep', search)?.trim().toLowerCase();
  return v === 'on' || v === 'off' ? { stanceDeep: v } : {};
}

/**
 * The `?deepen=on` dev switch (`SurfZoneConfig.deepen`, step 3.5b, the owner's ruling C of 2026-11-17): opt-in, **the
 * deepen button**. Full manual crouch reaches the tube tuck's depth (`MANUAL_CROUCH_DEPTH`, 0.45 m) **anywhere**, not
 * only under a tube's curl, and Compress no longer fades that extra tuck away — so the crouch key deepens whatever
 * stance the rider is in, landing in the **35–50 % of straight-legged standing hip height** spike band that four of
 * the five video references show at turn entry (`docs/research/new-rider/3.5/stance-frame.md`). Ruling C keeps the
 * held Compress, so this is an **addition**: no stance's depth is changed.
 *
 * **On the owner's input only.** All five clips tie the dip to turn entry, but an automatic dip is the game moving the
 * owner's body for them and they have not been asked. And there is **no clock, timer, fatigue or stamina** in it (the
 * owner's *"lets leave it as infite stamina"*): the depth is a commanded leg length, so the dip lasts as long as the
 * key is held. Nothing is added but the reach of an existing posture target — no force, no new quantity. Anything
 * else, the tuck under a curl only, as it ships.
 */
export function deepenSwitch(search?: string): { deepen?: 'on' } {
  return devParam('deepen', search)?.trim().toLowerCase() === 'on' ? { deepen: 'on' } : {};
}

/**
 * The `?armCarry=on|rest` dev switch (`SurfZoneConfig.armCarry`, step 3.5g; `engine-target.md` rows 4, 5 and 15, built
 * on the owner's **"geometry rows first"** of 2026-11-18): opt-in, **the arm carriage channel**.
 *
 * The game's only arm quantity is `HumanBalance.arms`, **one scalar 0–1** that physics reads as an **inertia**, and
 * the drawn hand is that scalar's `ARM_SPREAD + ARM_ALARM × (1 − balanceMargin)` applied to **both** hands along the
 * board — **no height, no spread and no left/right**, so there is exactly one arm pose per stage and depth. The
 * footage refutes the depth link outright (V7 found **four carriages inside the Tall band** with the narrowest and
 * lowest arms at its **deepest** leg position; V8 found two Tall-band segments with arms wide in one and hanging
 * below the waist in the other), so this channel reads the **player's own stick** and never leg depth.
 *
 * - `'on'` — the whole channel. **rest**: both hands low and drawn in, inside the rails (the single most common arm
 *   position in two of the three sharpest clips — V8 5 windows, V9 6 windows, V7 9 frames). **reach**: the pairing —
 *   lead hand down at the rail, board or knee with the rear arm up and back (V5 3 of 3 turns, V6, V7). **over**: the
 *   rear arm above the head, on the **top** of the stick's throw only, because the overhead arm belongs to some turns
 *   and not others (V10's bottom turn took it and a top turn 0.5 s later did not; V9's roundhouse went without it).
 *   The carriage rises fast and returns slowly, so the hand can arrive **before** the rail bites (the footage's lead
 *   is **+0.07 to +0.30 s**, 2 clips, 3 riders) and **stay** after the ask drops (V9's overhead window ~0.7 s,
 *   SINGLE). The balance alarm still wins, so a near fall reads as it does today.
 * - `'rest'` — the rest carriage only, whatever the stick says: row 15 on its own, for an A/B against `'on'`.
 *
 * **Drawing only.** It touches one expression — the standing hand branch of `AttachedRider.renderPoint`, which is the
 * **drawn** point. The seven point masses, `partPosition`, the CoM, `bodyInertiaAt`, `riderYawInertia` and
 * `HumanBalance.arms` (the arms' only physical path) are all untouched, so **no force is added and no existing force
 * changes**. No clock, timer, fatigue or stamina. Anything else, and an online room, the shipped one-scalar spread.
 */
export function armCarrySwitch(search?: string): { armCarry?: 'on' | 'rest' } {
  const v = devParam('armCarry', search)?.trim().toLowerCase();
  return v === 'on' || v === 'rest' ? { armCarry: v } : {};
}

/**
 * The `?trunk=mass` dev switch (`SurfZoneConfig.trunk`, step 3.5h; rows 1 and 2 of
 * `docs/research/new-rider/3.5/engine-target.md`): opt-in, **the trunk's fold moves the body's mass, and the drawn
 * trunk stops being a function of leg depth.**
 *
 * Two halves of one state, and that is the point of doing them together:
 * - **physics** (`AttachedRiderOptions.trunk`): the hip rotor's own parts — the torso, the head and both arms — turn
 *   about the physical pelvis by `StandingBody.hip.angle`, about the same axis `couple()` already pairs the rotor's
 *   torque on. The rotor's torque was already paired and its power already booked; its angle was simply never read
 *   by `this.parts`, so the centre of mass, the inertia, the per-part water forces and the drawn body were all
 *   computed from an **unfolded** trunk while the trunk folded. **Geometry: no force, no drive, no constant.**
 * - **drawing** (`RIG_SWITCHES.trunk`): standing, the rig adds no fold of its own, because the physics' pelvis, torso
 *   and head now carry one. `HumanoidRig.ts:1383–1385` interpolated the drawn trunk from the drawn leg depth and from
 *   nothing else, so **folding at a fixed leg depth was impossible at any value** — that structural defect, not any
 *   footage angle, is the reason for this change. **No footage figure licenses a target for the range** (after
 *   thirteen clips the series has no gated measurement of trunk angular travel), so the range is reported as a fact
 *   about the engine and the owner rides the feel.
 *
 * The new surfer (`?rider=new`) only — there is no hip rotor anywhere else, so without it the switch is ignored on
 * both sides. Off by default and pinned off for online rooms.
 */
export function trunkSwitch(search?: string): { trunk?: 'mass' } {
  return devParam('trunk', search)?.trim().toLowerCase() === 'mass' ? { trunk: 'mass' } : {};
}

/**
 * The `?buoyFrame=hull` dev switch (`SurfZoneConfig.buoyFrame`, step 3.3d, the wave-shape advisor's item 2): opt-in,
 * every spot's board resolves the water's hydrostatic support along the **hull** normal where the deck is dry and the
 * patch planes — Savitsky's own convention for a bottom wetted on one side — blending back to the water-surface normal
 * as it floats or submerges (`hullForces`' `HULL_BUOYANCY`, docs/research/new-rider/3.3 Part 28). One existing force is
 * rotated, not added, but it **is** a hull law and it changes every spot's drive, which is why the owner asked for it
 * behind a switch with an A/B. Anything else, the water-surface normal as before.
 */
export function buoyFrameSwitch(search?: string): { buoyFrame?: 'hull' } {
  return devParam('buoyFrame', search)?.trim().toLowerCase() === 'hull' ? { buoyFrame: 'hull' } : {};
}

/**
 * The `?waterHeel=tilt` dev switch (`SurfZoneConfig.waterHeel`, step 3.3p): opt-in, the new surfer's balance reads its
 * internal model's three **heel** derivatives at the board's heel against the **water** and takes the face's own tilt as
 * a measured third input, instead of reading them at the board's roll from the world's level — the angle the lab that
 * measured them never used (docs/research/new-rider/3.3 Part 39). Measured and NOT a fix: it buys the sign of the roll
 * acceleration and costs both rows' size. Anything else, the world's level as before, and then the design is
 * byte-for-byte the shipped one. `tilt` carries the face's tilt through the forward prediction and the reference's own
 * steady turn; `predict` through the forward prediction alone; `ref` (step 3.4e) the reference's own steady turn
 * alone, which is the 2×2's fourth cell and the arm that isolates 3.3p's own *"the reference is the destabiliser"*.
 */
export function waterHeelSwitch(search?: string): { waterHeel?: 'tilt' | 'predict' | 'ref' } {
  const v = devParam('waterHeel', search)?.trim().toLowerCase();
  return v === 'tilt' || v === 'predict' || v === 'ref' ? { waterHeel: v } : {};
}

/**
 * The `?mountAgree=deck|felt|both` dev switch (`SurfZoneConfig.mountAgree`, step 3.4e): opt-in, the moment the new
 * surfer stands up made to agree with its own stated argument. The shipped mount places the standing body square to
 * the deck above `PLANING_SPEED` and plumb to the world below it, *"where the felt vertical is the face's normal"* —
 * and step 3.4d measured that the felt vertical the body's balance reads at frame 1 is the **world's** gravity
 * (reaching the face's normal at 0.250 s, 24 of 24), and that on the owner's own low-speed cell the placement rule
 * flips at one metre a second, nine runs of eighteen each way and 8.37° apart, while the frame after the mount forces
 * the body banked whatever the speed. `deck` places it square to the deck at any entry speed; `felt` seeds the felt
 * vertical's low pass at the face's own normal; `both` does both. Anything else, the mount as it ships.
 * docs/research/new-rider/3.4 Part 5.
 */
export function mountAgreeSwitch(search?: string): { mountAgree?: 'deck' | 'felt' | 'both' } {
  const v = devParam('mountAgree', search)?.trim().toLowerCase();
  return v === 'deck' || v === 'felt' || v === 'both' ? { mountAgree: v } : {};
}

/**
 * The `?riderBody=two` dev switch (`SurfZoneConfig.riderBody`, step 3.4a): opt-in, the new surfer's balance runs its
 * internal plant with the rider's **body as a segment of its own** — an inertia in the frontal plane about its own
 * centre of mass (de Leva 1996 posed in the game's stances) — so the board's roll, the body's bank, the turn and the
 * sway are solved **together** and the force at the feet comes out of the solve, instead of a point mass on a massless
 * leg whose reaction is the substituted `τ / h − m g θ`. `control` is the same assembly with that inertia at zero,
 * which reproduces the shipped plant exactly (the positive control, shipped so it can be ridden too), and `symmetric`
 * is the point mass with only the coupling made consistent — the feet feel the board's own roll, which the shipped
 * `feet` row omits while its roll row carries the same lever. Anything else, the point mass as before.
 * docs/research/new-rider/3.4.
 */
export function riderBodySwitch(search?: string): { riderBody?: 'two' | 'control' | 'symmetric' } {
  const v = devParam('riderBody', search)?.trim().toLowerCase();
  return v === 'two' || v === 'control' || v === 'symmetric' ? { riderBody: v } : {};
}

/**
 * The `?riderCost=point|fixed|plant` dev switch (`SurfZoneConfig.riderCost`, step 3.4b): opt-in, the new surfer's
 * balance designs its gains against **two costs the shipped design does not have** — the bank's cost as each stance's
 * own limit (`feetReach`, step 3.2n) and the capture point's own rank-one cost (`captureScale`, step 3.2j) — with the
 * capture point's lean divergence rate ω₀ taken from the point mass with its feet held (`point`, which is exactly
 * 3.2j's and 3.2n's own design and the control that separates the weights from the constant), from the body's own
 * inertia with its feet still held (`fixed`), or from the plant's own lateral compliance (`plant`), which is the
 * plant the design is actually built on. Anything else, the shipped cost function, which has neither weight.
 * docs/research/new-rider/3.4.
 */
export function riderCostSwitch(search?: string): { riderCost?: 'point' | 'fixed' | 'plant' } {
  const v = devParam('riderCost', search)?.trim().toLowerCase();
  return v === 'point' || v === 'fixed' || v === 'plant' ? { riderCost: v } : {};
}

/**
 * The `?plantFloor=4.5|5|6` dev switch (`SurfZoneConfig.plantFloor`, step 3.4m): opt-in, the lowest row of the
 * balance's own water table (`PLANT_SPEEDS`) its internal model may be built on, m/s.
 *
 * Shipped, `labAt` clamps the lookup with `Math.max(speeds[0], …)` and the table starts at 4, so **every design at or
 * below 4 m/s is built on row `'4'`** — and row `'4'` is the table's own **sign-turnover row**: measured at 46.4° of
 * trim and 0.513 m of draft (the deepest, most trimmed row it owns), with the yaw moment per radian of slip at
 * **+143.8** against **+41.3, −28.6 and −161.0** at 4.5, 5 and 6, and the roll moment per radian of roll at **−37.2**
 * against −98.0 at both 4.5 and 5. So the clamp does not extrapolate the planing table downward; it pins every sub-4
 * m/s design to the one row where the signs have turned over, and step 3.4l measured the consequence: before the fall
 * (the board inside 25° of roll) the model's side force — 95.8–96.7 % of the controller's own bank row — has the
 * **wrong sign** on crouch and compress ticks, a sign-correct share of 0.167 and 0.292 against 0.900 and 0.932 where
 * the table is honest.
 *
 * `4.5` is the row the game's own board picks out down there by its draft (0.273–0.301 m at 16.0–17.3° of trim, modal
 * nearest row per tick in all three stances); `5` and `6` are the other two rows step 3.4k's sensitivity swapped in,
 * kept so the bracket can be ridden. **Every value is a row the lab measured and none is invented** — the captive rig
 * has no equilibrium below planing (at 1.16–3 m/s the towed board settles to 90.00° of trim and 3.002 m of draft, i.e.
 * stood on end and through the lab's bed), so there is no honest row below 4 to offer.
 *
 * It is a change of **plant**, not of controller: Φ, Γ, K and L are rebuilt on a different measured row and nothing
 * else moves. The table is read by `plantAt` alone and `plantAt` by `predictiveBalance.ts` alone, so no water force in
 * the game is computed from it; the only thing that changes outside the model is the ankle's commanded rest angle, and
 * the ankle is a real spring already paired by its reaction on the board's roll row. **Not a hidden motor.** Nothing
 * on the default rider. Anything else, the shipped floor of 4. docs/research/new-rider/3.4 Part 13.
 */
export function plantFloorSwitch(search?: string): { plantFloor?: '4.5' | '5' | '6' } {
  const v = devParam('plantFloor', search)?.trim().toLowerCase();
  return v === '4.5' || v === '5' || v === '6' ? { plantFloor: v } : {};
}

/**
 * The `?deckHollow=on` dev switch (`SurfZoneConfig.deckHollow`, deck-hollow 2026-11-10, the Compress turn's drag): opt-in,
 * every spot's banked planing board keeps its deck, and the standing rider's legs over it, dry below the surface line
 * while the hollow behind the low rail's entry is open, where by default they are wet wherever the surface is above them.
 */
export function deckHollowSwitch(search?: string): { deckHollow?: 'on' } {
  return devParam('deckHollow', search)?.trim().toLowerCase() === 'on' ? { deckHollow: 'on' } : {};
}

/**
 * The `?snapStamp=on` dev switch (`SurfZoneConfig.snapStamp`, snap-stamp 2026-11-08, the owner's "turn less or very
 * sharply with snap"): opt-in, every spot's rider stamps the weight past the tail for a moment on a full steer under Snap,
 * then back over the fins; a partial steer is Snap's carve as before.
 */
export function snapStampSwitch(search?: string): { snapStamp?: 'on' } {
  return devParam('snapStamp', search)?.trim().toLowerCase() === 'on' ? { snapStamp: 'on' } : {};
}

/**
 * The `?boardSpray=off` dev switch (`SurfZoneConfig.boardSpray`, board-spray 2026-10-29): no board throws spray, as before,
 * in place of the sheets a planing board throws off its rails and tail.
 */
export function boardSpraySwitch(search?: string): { boardSpray?: 'off' | 'old' } {
  const value = devParam('boardSpray', search)?.trim().toLowerCase();
  // `?boardSpray=old` (spray-rework): #171's spray, its drops the worker's round sprites and its curtain clear glass.
  return value === 'off' ? { boardSpray: 'off' } : value === 'old' ? { boardSpray: 'old' } : {};
}

/**
 * The `?lipVeil=on` dev switch (`SurfZoneConfig.lipVeil`, C2 step 5g 2026-11-14, opt-in): a plunging lip throws the
 * veil the owner's Abu Dhabi reference shows — Erinin 2023's two post-impact droplet regions, their measured speed
 * law and three size classes, carried up by the air the breaker drives (`SprayCloud`). Visual only; off, every
 * landing throws the splash-up's drops exactly as it did and no air blows.
 */
export function lipVeilSwitch(search?: string): { lipVeil?: 'on' } {
  return devParam('lipVeil', search)?.trim().toLowerCase() === 'on' ? { lipVeil: 'on' } : {};
}

/**
 * The `?duckBody=old` dev switch (`SurfZoneConfig.duckBody`, duck-two-body 2026-10-31): the board under water meets it
 * with the planing hull's law, and the ducking rider is the single rigid body on the deck, as before.
 */
export function duckBodySwitch(search?: string): { duckBody?: 'old' } {
  return devParam('duckBody', search)?.trim().toLowerCase() === 'old' ? { duckBody: 'old' } : {};
}

/**
 * The `?duckDrawn=old` dev switch (duck-drawn 2026-10-31): the player's own two-body duck-dive drawn as main drew it
 * before (the lying pose's duck, from the swimmer's parts as though they were hands and feet), for A/Bs of the drawing;
 * the physics is the same.
 */
export function duckDrawnOld(search?: string): boolean {
  return devParam('duckDrawn', search)?.trim().toLowerCase() === 'old';
}

/**
 * The `?snapArms=old` dev switch (snap-carve 2026-11-08, the owner's "the surfer doesn't move the arms"): Snap's arms drawn
 * as before (the trailing arm hanging, the leading arm by the yaw rate alone, no hand at the water), for A/Bs of the
 * drawing; the physics is the same. Drawing only: every rider on this page, the player's and other players'.
 */
export function snapArmsSwitch(search?: string): { snapArms?: 'old' } {
  return devParam('snapArms', search)?.trim().toLowerCase() === 'old' ? { snapArms: 'old' } : {};
}

/**
 * The `?lipFoam=old` dev switch (pool-barrel-drawing, T3, 2026-11-01): the swept barrel's lifted water painted with the
 * water's foam under it on a crest already white, and no landing white on its lip, as main drew it before T3 (the owner's
 * option (a) of 2026-10-22), for A/Bs at every swept spot. Drawing only: each player's own view.
 */
export function lipFoamOld(search?: string): boolean {
  return devParam('lipFoam', search)?.trim().toLowerCase() === 'old';
}

/**
 * The `?lipBack=old` dev switch (pool-barrel-drawing, 2026-11-01; Rich only): the swept barrel's lip shows the sky behind
 * it by its underside's diffuse view everywhere, as before (the pale band from in front), not per view ray. Drawing only.
 */
export function lipBackOld(search?: string): boolean {
  return devParam('lipBack', search)?.trim().toLowerCase() === 'old';
}

/**
 * The `?barrelHeight=old` dev switch (pool-barrel-perf, 2026-11-06; Rich only): the swept barrel's drawing reads the water's
 * height at each vertex through `sampleCubicSurface`, slopes and all, as before, in place of `sampleCubicHeight` (the same
 * bits without the slopes or allocations). Drawing only; the output is the same either way.
 */
export function barrelHeightOld(search?: string): boolean {
  return devParam('barrelHeight', search)?.trim().toLowerCase() === 'old';
}

/**
 * The `?cameraWater=old` dev switch (pool-barrel-perf, 2026-11-06): the camera's water/air test in the drawn barrel
 * (`BarrelWater`) keeps its strips and their triangle ranges as objects and arrays, as before, in place of typed arrays.
 * The same strips in the same order, so the same answers. Drawing only.
 */
export function cameraWaterOld(search?: string): boolean {
  return devParam('cameraWater', search)?.trim().toLowerCase() === 'old';
}

/**
 * The `?barrelMesh=old` dev switch (pool-barrel-perf, 2026-11-06): the swept barrel's mesh turns its triangles to face out
 * (`SweptBarrelMesh.facesOut`) building three small arrays per triangle, as before, in place of plain locals. The same
 * indices. Drawing only.
 */
export function barrelMeshOld(search?: string): boolean {
  return devParam('barrelMesh', search)?.trim().toLowerCase() === 'old';
}

/**
 * The `?spraySheet=off` dev switch (`SurfZoneConfig.spraySheet`, spray-sheet 2026-10-30): the boards' spray leaves the
 * hull as drops, as before, in place of a curtain of water that tears into them a little way out.
 */
export function spraySheetSwitch(search?: string): { spraySheet?: 'off' } {
  return devParam('spraySheet', search)?.trim().toLowerCase() === 'off' ? { spraySheet: 'off' } : {};
}

/**
 * The `?snapFan=old` dev switch (`SurfZoneConfig.snapFan`, snap-fan 2026-11-05): the boards' spray as before. A jet
 * steeper than 45° off its path leaves where its run through a negative tan(2α) put it, in place of the high rail of its
 * own station; and on the page (`RemoteSpray`), other players' hulls throw at their board's velocity alone, without their
 * spin.
 */
export function snapFanSwitch(search?: string): { snapFan?: 'old' } {
  return devParam('snapFan', search)?.trim().toLowerCase() === 'old' ? { snapFan: 'old' } : {};
}

/**
 * The `?tubeShape=c` dev switch (`SurfZoneConfig.tubeShape`): the swept barrel drawn and felt as the authored bounded-C
 * profile the game drew from 2026-10-05 to 2026-10-22, in place of the cases' own Basilisk frames, to compare the two.
 */
export function tubeShapeSwitch(search?: string): { tubeShape?: 'bounded-C' } {
  return devParam('tubeShape', search)?.trim().toLowerCase() === 'c' ? { tubeShape: 'bounded-C' } : {};
}

/**
 * The `?canyonBed` dev switch (`SurfZoneConfig.canyonBed`), to ride the layouts side by side: 'b', version B (canyon-b,
 * 2026-11-01, `CANYON_B`: the upcoast peak's +x arm runs into the reef bowl, main's at 4eee1e5f); 'old', the whole layout
 * before it (`CANYON_BEACH`: the reef 120 m out with a sandbar A-frame either side, main's at 376d9cd4); nothing otherwise
 * (today's layout, version C, canyon-c: one straight bank peeling from +x into the flipped reef bowl). And the
 * `?canyonRamp=half` dev switch, on today's layout only: its bank's edge ramp halved (`CANYON_HALF_RAMP`, 'half'; the
 * water-physics advisor's option (b), 2026-11-04, the owner's call), with its own take-off depth and starts. And the
 * `?canyonWaves` dev switch (the owner, 2026-11-05: version C "is really not surfable as waves are too scattered", "give me
 * like an option like ?canyonwaves=true to allow me to use the previous waves"): 'true' (or 'b'), version B, the waves C
 * replaced; 'a' (or 'old'), version A; the name in either case. `?canyonBed` wins over it, and it over `?canyonRamp`.
 */
export function canyonBedSwitch(search?: string): { canyonBed?: 'old' | 'b' | 'half' } {
  const bed = devParam('canyonBed', search)?.trim();
  if (bed === 'old' || bed === 'b') return { canyonBed: bed };
  const waves = (devParam('canyonWaves', search) ?? devParam('canyonwaves', search))?.trim().toLowerCase();
  if (waves === 'true' || waves === 'b') return { canyonBed: 'b' };
  if (waves === 'a' || waves === 'old') return { canyonBed: 'old' };
  return devParam('canyonRamp', search)?.trim().toLowerCase() === 'half' ? { canyonBed: 'half' } : {};
}

/**
 * The `?canyonJoin=zone` dev switch (`SurfZoneConfig.canyonJoin`): version C's bank passes its breaking age by its take-off
 * zone (rule A to x +31, the reef's gate up the line from there: the branch's head at ca567450), in place of its bed (rule A
 * on its face, the gate behind its edge; the water-physics advisor's second ruling, 2026-11-04). 'zone', else nothing.
 */
export function canyonStartSwitch(search?: string): { canyonStart?: 'old' } {
  return devParam('canyonStart', search)?.trim().toLowerCase() === 'old' ? { canyonStart: 'old' } : {};
}

/** See canyonStartSwitch above for `?canyonStart=old`; below, `?canyonJoin=zone`. */
export function canyonJoinSwitch(search?: string): { canyonJoin?: 'zone' } {
  return devParam('canyonJoin', search)?.trim().toLowerCase() === 'zone' ? { canyonJoin: 'zone' } : {};
}

/** Runs the surf zone in the page (tests, and browsers without Web Workers). */
export const localSurfZone: SurfZoneHostFactory = (config, extra) => new LocalSurfZone(config, { rider: true, ...extra });

const barrelBytes = new Map<string, Promise<Uint8Array[] | undefined>>();

/**
 * A spot's barrel case files, fetched once for the page's drawing and the surf zone's contact (the Padang Padang spec,
 * Part B, PR 4; each spot its own transect's, PR 7). A failed fetch leaves the swept barrel off for that start and is
 * tried again at the next.
 */
export function barrelCaseBytes(spot: SpotName, poolTubeCase?: PoolTubeCase): Promise<Uint8Array[] | undefined> {
  // The pool's two case lists (a38, the default, and its own, `?poolTubeCase=pool`) are fetched and kept apart.
  const key = spot === 'pool' ? `${spot}:${poolTubeCaseOf(poolTubeCase)}` : spot;
  let bytes = barrelBytes.get(key);
  if (!bytes) {
    bytes = loadBarrelCaseBytes(barrelCasesFor(spot, undefined, spot === 'pool' ? poolTubeCase : undefined)).catch((error: unknown) => {
      console.warn('The barrel library did not load; the swept barrel stays off.', error);
      barrelBytes.delete(key);
      return undefined;
    });
    barrelBytes.set(key, bytes);
  }
  return bytes;
}

/** Forget the fetched files (tests). */
export function resetBarrelCaseBytes(): void {
  barrelBytes.clear();
  waveBytes = undefined;
}

let waveBytes: Promise<Uint8Array[] | undefined> | undefined;

/** The wave library's case files (C2 step 3, `?wave=library`), fetched once; a failed fetch leaves it off and is tried again. */
export function waveCaseBytes(): Promise<Uint8Array[] | undefined> {
  waveBytes ??= loadWaveCaseBytes().catch((error: unknown) => {
    console.warn('The wave library did not load; the sea draws the wave.', error);
    waveBytes = undefined;
    return undefined;
  });
  return waveBytes;
}

/** No front points: the swept barrel draws nothing. */
const NO_FRONT = new Float32Array(0);

export class PhysicalMode {
  readonly camera = new SpectatorCamera();
  readonly seabed = new SpotSeabed();
  readonly farField = new FarFieldOcean();
  /** The tank's own water past its open sides, handed over to the far ocean, made at the first start (it shares the water's shading). */
  private edgeBand?: EdgeBand;
  /** The Wave Pool's walls, deck and machine hall (the movement-flow spec); the open ocean stays hidden there. */
  readonly poolScenery = new PoolScenery();
  private atPool = false;
  /** The thrown lip, drawn as one sheet (plan P7). */
  readonly lipSheet = new LipSheetMesh();
  /** Bubbles entrained under breaking bores, seen from below the surface. */
  readonly bubbles = new BubblePoints();
  /** Spray and mist thrown up by lip impacts, bores and offshore wind (G6). */
  readonly spray = new SprayPoints();
  /** The lip sheets and spray mirrored past the open sides, with the edge band's water. */
  private readonly edgeWhitewater = new EdgeWhitewater([this.lipSheet.mesh, this.spray.mesh]);
  /** The boards' spray sheets drawn as curtains of water (spray-sheet). */
  readonly curtains = new SpraySheetMesh();
  /**
   * The boards' spray as a fan of fine streaked drops, mist and the carve's foam line, on the page (spray-rework); the
   * worker's drops are #171's (`?boardSpray=old`).
   */
  readonly fan = new BoardFanMesh();
  /** Other players' sheets as last drawn (spray-sheet), for their curtains. */
  private otherCurtains?: ArrayLike<number>;
  private readonly curtainOffset = new Vector3();
  /** The physical board, drawn at the snapshot's pose. */
  private readonly boardShape = buildBoardShape();
  readonly board = createBoardMesh(this.boardShape);
  private boardDesign = BOARD_DESIGNS[0].id;
  private surferBody?: string;
  /** The rider's body, solved from the snapshot's seven points: a skinned surfer (G7), or the simple one until it loads. */
  readonly surfer = new SurferView();
  /** The leash (the wipeout spec), from the back foot to the tail plug. */
  private readonly leash = new LeashCord();
  private readonly riderState = createRiderVisualState();
  /** `?duckDrawn=old`: the two-body duck-dive drawn as before duck-drawn (`duckDrawnOld`). */
  private readonly duckDrawnOld = duckDrawnOld();
  /** How the rider's board moves, for the drawn body (Part B). */
  private readonly riderMotion = new RiderMotion();
  /** The snapshots the board, rider and camera target are drawn between, and the arrays drawn this frame. */
  private readonly track = new SnapshotTrack();
  private readonly drawnRider = new Float64Array(RIDER_SNAPSHOT.length);
  private readonly drawnBoard = new Float64Array(8);
  private trackedHost?: SurfZoneHost;
  private visualHost?: SurfZoneHost;
  private visualStatus?: SurfZoneStatus;
  private visualsDirty = true;
  private visualSprayLook?: WaterLook;
  private visualLipLook?: WaterLook;
  /** Whether the latest input paddles, which cups the drawn hands. */
  private paddling = false;
  /** The stick last sent to the ride (the drawn body's lead into a turn, `RIG_SWITCHES.turnLead`). */
  private steerSent = 0;
  /**
   * The pop-up key asked this frame and the dive past half (the hold's reading), and whether the fallen surfer holds
   * the board (the animation-realism plan's phase 4: the snapshot does not carry it): drawn, and sent to the others.
   */
  private asking = false;
  private diving = false;
  private readonly holds = new HoldReading();
  get holding(): boolean {
    return this.holds.holding;
  }
  private retryPending = false;
  /** Where the next advance puts the rider (Surf School, spec L2). */
  private placePending?: RiderPlacement;
  /** Where the pending retry puts the rider (online: a free spot in the lineup). */
  private spawnAt?: { x: number; z: number };
  /** The player's stance (the stances spec), sent with every request: the runner takes it up at the next ride. */
  stance?: StanceName;
  /** The running surf zone, once it has spun up. */
  host?: SurfZoneHost;
  /** The water look the sea's spray is drawn in (G9: Classic keeps its lip-impact spray as it was). */
  private sprayLook: SprayLook = 'rich';
  /** The Particles setting (graphics): how many particles the sea's spray and bubbles keep. Visual only. */
  private particleLevel: ParticleLevel = 'high';

  /** Hand the water look to the running sea's spray, and to every sea started after. */
  setSprayLook(look: SprayLook): void {
    this.sprayLook = look;
    this.visualsDirty = true;
    this.host?.setSprayLook(look);
  }

  /** Hand the Particles setting to the running sea, and to every sea started after; the lip sheet draws at its detail. */
  setParticleLevel(level: ParticleLevel): void {
    this.particleLevel = level;
    this.visualsDirty = true;
    this.host?.setParticleLevel(level);
    this.lipSheet.setSubdivisions(particleBudget(level).lipSubdivisions);
    this.fan.setLevel(level);
  }
  config?: SurfZoneConfig;
  /** The storm behind the running sea, in storm mode. */
  storm?: StormSwell;
  /** Whether the running sea is the practice groundswell. */
  practice = false;
  focus = { x: 0, z: 0 };
  private starts = 0;
  /** Lets go of the surf zone still spinning up, when a later start or a cancel supersedes it. */
  private dropPending?: () => void;
  private shown = true;
  /** The swept barrel (the Padang Padang spec, Part B, PR 3): built with the water on the first start, on at a swept spot. */
  private sweptBarrel?: SweptBarrel;
  /** C2 step 3's overturn (`?wave=library`), drawn in the old tube's place, and whether this start runs it. */
  private libraryZone?: LibraryZone;
  private libraryOn = false;
  private swept = false;
  /** Whether the swept spot's jets land on its clock (`sweptCrashOn`): off at the Canyon, which keeps its own white. */
  private sweptCrash = false;
  /** The spilling lip's curls (the Canyon spilling lip), built with the water on the first start; drawn wherever a sea has them. */
  private spillingCurl?: { mesh: SpillingCurlMesh; water: WaterSurface; drawn?: { status: unknown; surface: number; look: WaterLook } };
  /** The roller front (the Canyon roller front), built with the curl; drawn in Rich wherever a sea's roller has a drawn look. */
  private rollerFront?: { mesh: RollerFrontMesh; water: WaterSurface; drawn?: { status: unknown } };
  private readonly scene: Scene;
  /** Graphics setting (plan P8): spray and mist are still simulated, only not drawn. */
  private sprayShown = true;
  private chosenView: RideView | 'overview' = 'front';
  /** The view with no rider on the water: the overview in the Wave Lab, the cinematic sweep behind the menu (plan P8). */
  idleView: SpectatorView = 'overview';
  /** The ride view each new session starts in: the player's default camera (plan P8). */
  defaultView: RideView | 'overview' = 'front';
  /** Whether the screen's right is the board's left (+1) or its right (−1), from the latest clear view. */
  private steerSign = -1;
  /** The way (±1) the held steer was pressed when its mapping was read; 0 with nothing held. */
  private steerHeld = 0;
  private readonly cameraRight = new Vector3();
  private readonly boardLeft = new Vector3();
  private readonly follow: FollowTarget = { position: { x: 0, y: 0, z: 0 }, heading: 0, velocity: { x: 0, y: 0, z: 0 } };
  /** The followed point and sea time at the latest new snapshot, for the ride view's lead. */
  private readonly followedAt = { x: 0, y: 0, z: 0, seaTime: Number.NaN };
  private readonly followCrest = { x: 0, y: 0, z: 0 };

  /**
   * The ride view's lead and lip: the followed point's velocity over the drawn
   * sea time between frames, and the crest of the wave under the rider (spec P9 phase 0).
   */
  private followMotion(host: SurfZoneHost, seaTime: number): void {
    const { follow, followedAt } = this;
    const { ride } = host.snapshot.status;
    const elapsed = seaTime - followedAt.seaTime;
    const velocity = follow.velocity!;
    if (elapsed > 0 && elapsed < 0.5) {
      velocity.x = (follow.position.x - followedAt.x) / elapsed;
      velocity.y = (follow.position.y - followedAt.y) / elapsed;
      velocity.z = (follow.position.z - followedAt.z) / elapsed;
    } else if (!(elapsed >= 0)) {
      velocity.x = velocity.y = velocity.z = 0;
    }
    if (!(elapsed === 0)) Object.assign(followedAt, follow.position, { seaTime });
    const wave = ride?.wave;
    if (wave?.valid) {
      const { position } = follow;
      const surface = host.heightAt(position.x, position.z);
      this.followCrest.x = position.x - wave.aheadOfCrest * wave.directionX;
      this.followCrest.z = position.z - wave.aheadOfCrest * wave.directionZ;
      this.followCrest.y = surface + (1 - wave.faceFraction) * wave.faceHeight;
      follow.crest = this.followCrest;
    } else {
      follow.crest = undefined;
    }
  }

  constructor(scene: Scene) {
    // `?snapArms=old`: Snap's arms drawn as before snap-carve (`RIG_SWITCHES`, every rider this page draws).
    RIG_SWITCHES.snapArms = snapArmsSwitch().snapArms;
    // `?turnTrunk=lean`, `?turnLead=on`, `?cutbackHand=back`, or `?turnBody=on` for all three: the turning body (drawn only;
    // every rider this page draws, another player's without the stick's lead: their stick is not on the wire).
    Object.assign(RIG_SWITCHES, { turnTrunk: undefined, turnLead: undefined, cutbackHand: undefined }, turnBodySwitches(globalThis.location?.search ?? '', DEV_TOOLS));
    // `?rider=new` (step 3.2e): the new surfer's twist turns the hips by all of it (`RIG_SWITCHES.twistHips`).
    RIG_SWITCHES.twistHips = riderSwitch().rider === 'new' ? 'whole' : undefined;
    this.scene = scene;
    scene.add(this.poolScenery.group, this.seabed.mesh, this.farField.mesh, this.lipSheet.mesh, this.bubbles.mesh, this.spray.mesh, this.edgeWhitewater.group, this.board, this.surfer.group, this.leash.object, this.curtains.mesh, this.fan.group);
    this.leash.object.visible = false;
    this.board.visible = false;
    this.surfer.group.visible = false;
  }

  /** Rides as the player's surfer (G7 Part B): a new body loads, it is dressed, and the board is built in its design. */
  setSurfer(choice: SurferSettings): void {
    this.surfer.dress(outfitFor(choice), { accent: new Color(SUIT_COLORS[choice.color]) });
    if (choice.body !== this.surferBody) {
      this.surferBody = choice.body;
      void this.surfer.load(choice.body);
    }
    const design = BOARD_DESIGNS.find((candidate) => candidate.id === choice.board);
    if (design && design.id !== this.boardDesign) {
      this.boardDesign = design.id;
      const next = createBoardMesh(this.boardShape, design);
      for (const old of [...this.board.children]) {
        old.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.geometry.dispose();
          for (const material of ([] as Material[]).concat(object.material)) material.dispose();
        });
        this.board.remove(old);
      }
      this.board.add(...next.children);
    }
  }

  get ready(): boolean {
    return this.host !== undefined;
  }

  /**
   * Build the surf zone (warm start and spin-up take a few seconds) and show it
   * on `water`. Resolves false when a later start superseded this one.
   */
  async start(
    settings: PhysicalSettings, seed: number, water: WaterSurface, overrides: Partial<SurfZoneConfig> = {},
    createHost: SurfZoneHostFactory = localSurfZone, gpuTier?: () => Promise<boolean>,
  ): Promise<boolean> {
    const start = ++this.starts;
    const swell = swellFor(settings);
    // The GPU tier builds a richer sea; the page decides, so its far field matches the worker's tank.
    // A spot that needs stage 2 raises a stage 1 tier, and then asks for the GPU (as SurfConditions' raisedWater).
    const stage = solverStage(settings.spot, settings.stage);
    const compute = stage !== settings.stage ? 'auto' : settings.compute;
    const tier = stage === 2 && compute === 'auto' && gpuTier !== undefined && await gpuTier();
    const config = surfZoneConfigFor(settings, seed, tier, overrides);
    // `?trunk=mass` with `?rider=new` (step 3.5h): standing, the drawn trunk is the physics' folded one and the rig
    // adds no fold of its own (`RIG_SWITCHES.trunk`). **Read off the config that is actually in force, not off the
    // address**, because an online room's `overrides` clear `rider` and `trunk` for the physics (`main.ts`): taken
    // from the URL, joining a room from `?rider=new&trunk=mass` would stand the drawn hinge down on riders whose
    // physics has no fold at all — which is the very drawn-against-physical disagreement this switch exists to
    // remove. Every rider in a zone runs the zone's own config, the local one and the remote ones alike, so one flag
    // off `config` is one flag per rider. Without the new surfer there is no hip rotor to read, so the drawing keeps
    // its own hinge.
    RIG_SWITCHES.trunk = config.trunk === 'mass' && config.rider === 'new' ? 'mass' : undefined;
    // Superseded while asking for the GPU: never build it, and never drop the newer start's spin-up.
    if (start !== this.starts) return false;
    // A swept spot's contact needs the barrel files in the surf zone (Part B, PR 4).
    const barrelCases = sweptBarrelOn(config) ? await barrelCaseBytes(config.spot, config.poolTubeCase) : undefined;
    const waveCases = config.wave === 'library' ? await waveCaseBytes() : undefined;
    if (start !== this.starts) return false;
    const extras = { ...(barrelCases ? { barrelCases } : {}), ...(waveCases ? { waveCases } : {}) };
    const host = createHost(config, Object.keys(extras).length ? extras : undefined);
    // A superseded spin-up is let go at once, so its worker stops competing with the next one.
    this.dropPending?.();
    const dropped = new Promise<'dropped'>((resolve) => {
      this.dropPending = () => resolve('dropped');
    });
    const outcome = await Promise.race([host.ready.then(() => 'ready' as const), dropped]);
    if (outcome === 'dropped' || start !== this.starts) {
      host.dispose();
      return false;
    }
    this.dropPending = undefined;
    this.stop();
    this.host = host;
    host.setSprayLook(this.sprayLook);
    host.setParticleLevel(this.particleLevel);
    host.setSprayEnabled(this.sprayShown);
    this.config = config;
    this.storm = swell.storm;
    this.practice = settings.source === 'practice';
    const { init } = host;
    // A swept spot draws its barrel as one lofted surface: its water is never carved, and its lip strips are off.
    this.swept = sweptBarrelOn(config);
    // A swept spot without the crash (the Canyon) keeps its own white: its lip sheets and foam balls as before.
    this.sweptCrash = sweptCrashOn(config);
    // A rock floor in its own albedo where the spot has one (the Canyon's ledge, the 2026-10-22 playtest): drawn only.
    const rockCover = rockCoverFor(config.spot, config.canyonBed);
    water.setSource(new PhysicalSurfaceSource(new SnapshotSurfZone(host, { sweptBarrel: this.swept }), init.grid.spacing, rockCover));
    if (!this.sweptBarrel) {
      // `?barrelView=phase|front`: the curl flat-coloured by its slices' phase or front (a dev view, the tube review).
      const view = SWEPT_BARREL_VIEWS.find((candidate) => candidate === devParam('barrelView'));
      this.sweptBarrel = new SweptBarrel(water, async (spot) => {
        const bytes = await barrelCaseBytes(spot, this.config?.poolTubeCase);
        if (!bytes) throw new Error('No barrel case files');
        // The page draws what the surf zone feels: the same cases, as the same shape (`?tubeShape=c`).
        return libraryFromBytes(bytes, this.config?.tubeShape, spot, this.config?.heldRule);
      }, view, cameraWaterOld() ? 'old' : 'fast');
      // `?lipFoam=old` and `?lipBack=old`: the curl's foam and the Rich lip's background as before pool-barrel-drawing.
      if (lipFoamOld()) this.sweptBarrel.mesh.lipFoam = 'old';
      if (lipBackOld()) this.sweptBarrel.mesh.lipBack = 'old';
      // `?barrelHeight=old`: the Rich drawing reads the water's heights as before pool-barrel-perf (the same bits, slower).
      if (barrelHeightOld()) this.sweptBarrel.heights = 'old';
      // `?barrelMesh=old`: the mesh turns its triangles to face out as before pool-barrel-perf (the same indices, slower).
      if (barrelMeshOld()) this.sweptBarrel.mesh.faces = 'old';
      this.scene.add(this.sweptBarrel.mesh.mesh);
    }
    // The surfable tube's (the advisor's step 3 ruling) drawn as the surf zone feels it, switches and all.
    const face = this.swept && this.config.tubeShape !== 'bounded-C' ? tubeFaceOf(BARREL_SPOTS[config.spot]?.faceAnchor !== undefined, config) : undefined;
    this.sweptBarrel.setSpot(this.swept ? config.spot : undefined, this.swept, face);
    this.libraryOn = config.wave === 'library' && waveCases !== undefined;
    if (this.libraryOn) {
      // The library draws the wave: the old tube draws nothing (and leaves the water's seam mask to the library's).
      this.sweptBarrel.draw(NO_FRONT, 0, 0);
      if (!this.libraryZone) {
        this.libraryZone = new LibraryZone(water);
        this.scene.add(this.libraryZone.mesh.mesh);
      }
    } else this.libraryZone?.draw(NO_FRONT, 0);
    if (!this.spillingCurl) {
      this.spillingCurl = { mesh: new SpillingCurlMesh(water.materialUniforms), water };
      this.spillingCurl.mesh.rockBed = () => water.rockBed;
      this.scene.add(this.spillingCurl.mesh.mesh);
    }
    this.spillingCurl.drawn = undefined;
    if (!this.rollerFront) {
      this.rollerFront = { mesh: new RollerFrontMesh(water.materialUniforms), water };
      this.scene.add(this.rollerFront.mesh.mesh);
    }
    this.rollerFront.drawn = undefined;
    this.lipSheet.mesh.visible = this.shown;
    water.setChop(chopForWind(settings.windSpeed));
    water.setOptics(SPOT_OPTICS[settings.spot]);
    this.farField.setOptics(SPOT_OPTICS[settings.spot]);
    this.lipSheet.setOptics(SPOT_OPTICS[settings.spot]);
    this.curtains.setOptics(SPOT_OPTICS[settings.spot]);
    const spot = createSpot(config.spot, config.seed, { canyonBed: config.canyonBed, poolWaves: config.poolWaves, poolBarrel: config.poolBarrel, poolFloor: config.poolFloor, poolSize: config.poolSize, poolWindow: alongShoreOf(config), poolReef: config.poolReef });
    // The tank this swell needs (the wave-sizes spec): the far field and seabed start at its edge.
    const tank = tankLayout(config);
    const offshoreDepth = tank.edgeDepth;
    const windowMin = init.windowXMin;
    const windowMax = windowMin + (init.grid.nx - 1) * init.grid.spacing;
    const leftX = windowMin + init.dx / 2;
    const rightX = windowMax - init.dx / 2;
    // Beyond the window the world continues each edge column's seabed; offshore it deepens to FAR_DEPTH. Over the edge
    // band (open sides), the window's own bed mirrored across the edge gives way to the edge column's, as its water does.
    const offshoreBed = (z: number) => offshoreDepth + (FAR_DEPTH - offshoreDepth) * smoothstep(tank.offshore, tank.offshore - FAR_SLOPE_LENGTH, z);
    const band = config.spot === 'pool' ? 0 : EDGE_BAND.fade;
    const bedDepth = (x: number, z: number) => {
      if (z < tank.offshore) return offshoreBed(z);
      const edge = tankDepth(spot, offshoreDepth, x < windowMin ? leftX : x > windowMax ? rightX : x, z, tank);
      if ((x >= windowMin && x <= windowMax) || band === 0) return edge;
      const share = bandBedWeight(x, { xMin: windowMin, xMax: windowMax });
      const mirrored = tankDepth(spot, offshoreDepth, mirrorX(x, windowMin, windowMax), z, tank);
      return mirrored + (edge - mirrored) * share;
    };
    this.focus = { ...init.focus };
    // The far ocean's hole takes in the edge band past each side edge.
    const hole = { xMin: windowMin - band, xMax: windowMax + band, zMin: tank.offshore, zMax: tank.shore };
    // The Wave Pool: walls and a deck around the window, no open ocean beyond, and a painted concrete floor.
    this.atPool = config.spot === 'pool';
    // The Barrel's straight reef starts near the +x wall: its overview stands down the reef's line, inside the walls.
    this.camera.overviewSide = this.atPool && poolFloorOf(config) === 'straight' ? (POOL_STRAIGHT.side > 0 ? -1 : 1) : 1;
    if (this.atPool) {
      this.poolScenery.show({ xMin: windowMin, xMax: windowMax, zBack: tank.offshore, zFront: poolDeckZ(), deck: POOL.deck, floor: POOL.feedDepth + 0.5 });
      this.seabed.setPalette('#dfe6e4', '#a9c3c6');
    } else {
      this.poolScenery.hide();
      this.seabed.setPalette('#d6c69c', '#2f5f66');
    }
    this.farField.mesh.visible = this.shown && !this.atPool;
    this.seabed.setDepthOnGrid(
      bedDepth,
      gradedAxis(this.focus.x - 600, this.focus.x + 600, windowMin - band, windowMax + band, 2, 30),
      gradedAxis(Math.min(-900, tank.offshore - 300), tank.shore + 30, tank.offshore, tank.shore, 2, 30),
      rockCover,
    );
    const profile = new FarFieldProfile(surfZoneSea(config), {
      referenceZ: tank.offshore,
      shoreZ: tank.shore,
      offshoreZ: Math.min(-FAR_EXTENT, tank.offshore - 300),
      shoreSamples: 181,
      offshoreSamples: 391,
      offshoreDepth: (z) => offshoreBed(z) + settings.tide,
      leftDepth: (z) => tankDepth(spot, offshoreDepth, leftX, z, tank) + settings.tide,
      rightDepth: (z) => tankDepth(spot, offshoreDepth, rightX, z, tank) + settings.tide,
    });
    this.farField.setProfile(profile, hole, this.focus, { extent: FAR_EXTENT });
    this.farField.setChop(chopForWind(settings.windSpeed));
    // The edge band (the owner, 2026-10-09): past the open sides the tank's own waves, mirrored, handed over to the far
    // ocean, whose rim holds on the drawn tank offshore. None at the Wave Pool, walled in.
    this.edgeBand ??= new EdgeBand(water, this.farField);
    this.farField.attachRim(this.edgeBand.rimUniforms);
    this.edgeBand.setSpot(this.atPool ? undefined : { zone: tank.zoneInner - tank.offshore });
    this.chosenView = this.defaultView;
    this.camera.setView(this.homeView);
    return true;
  }

  /** Supersede any start still spinning up, so it never takes over. */
  cancel(): void {
    this.starts += 1;
    this.dropPending?.();
    this.dropPending = undefined;
  }

  /** Let the running surf zone go (its worker, if any, ends). */
  stop(): void {
    this.host?.dispose();
    this.host = undefined;
    this.swept = false;
    this.sweptCrash = false;
    this.sweptBarrel?.setSpot(undefined);
    this.board.visible = false;
    this.surfer.group.visible = false;
    this.leash.object.visible = false;
  }

  /** Request `steps` fixed physics steps (`SURF_ZONE_STEP` each). */
  /** The following view last chosen (or the overview), which profile and underwater toggles return to. */
  get homeView(): SpectatorView {
    return this.host && this.host.snapshot.rider[RIDER_SNAPSHOT.present] > 0 ? this.chosenView : this.idleView;
  }

  /** A lesson's view (spec L2): this ride view now, and for the rest of the session. */
  setRideView(view: RideView): void {
    this.chosenView = view;
    this.camera.setView(view);
  }

  /** Cycle the camera: in front, behind, to the side of the rider, then the overview of the break. */
  nextView(): SpectatorView {
    const order: (RideView | 'overview')[] = [...RIDE_VIEWS, 'overview'];
    const current = order.indexOf(this.camera.view as RideView | 'overview');
    const next = order[(current + 1) % order.length];
    this.chosenView = next;
    this.camera.setView(next);
    return next;
  }

  /**
   * The arrow keys steer toward the screen's left or right in any view: facing
   * the rider from the beach, the screen's right is the board's left. Returns the
   * board's steer (+1 its left). The mapping is read when a key is pressed (or
   * the other one), and held while it is: read every frame, a hard turn took the
   * board past side-on to the camera, the mapping flipped, and the held key
   * turned it back. With the board end-on to the camera, the last clear mapping
   * holds.
   */
  screenSteer(steer: number): number {
    const way = Math.sign(steer);
    if (way === 0) {
      this.steerHeld = 0;
      return 0;
    }
    if (way !== this.steerHeld) {
      this.steerHeld = way;
      this.cameraRight.setFromMatrixColumn(this.camera.camera.matrixWorld, 0).setY(0);
      this.boardLeft.set(1, 0, 0).applyQuaternion(this.board.quaternion).setY(0);
      if (this.cameraRight.lengthSq() > 1e-6 && this.boardLeft.lengthSq() > 1e-6) {
        const alignment = this.cameraRight.normalize().dot(this.boardLeft.normalize());
        if (Math.abs(alignment) > 0.25) this.steerSign = alignment > 0 ? 1 : -1;
      }
    }
    return steer * this.steerSign;
  }

  /** Put board and rider back in the lineup on the next advance (online, at `spawnAt` from then on); the waves carry on. */
  retry(spawnAt?: { x: number; z: number }): void {
    this.retryPending = true;
    this.spawnAt = spawnAt;
  }

  /** Put the rider here on the next advance (a lesson's start, spec L2); the waves carry on from wherever they are. */
  /** The other players' boards' sheets for the next batch (`setRemoteSheets`). */
  private boardSheets?: Float32Array;

  place(placement: RiderPlacement): void {
    this.placePending = placement;
  }

  /** Request `steps` fixed physics steps, with the player's input and (online) other boards' pushes on the water. */
  advance(steps: number, input?: Omit<RideRequest, 'retry'>, reactions?: ArrayLike<number>): void {
    const retry = this.retryPending;
    const spawnAt = retry ? this.spawnAt : undefined;
    const place = this.placePending;
    if (input || retry || place) {
      this.retryPending = false;
      this.spawnAt = undefined;
      this.placePending = undefined;
    }
    if (input) this.paddling = input.paddle;
    // The stick as the ride gets it, for the drawing only (`RiderVisualState.steer`).
    if (input) this.steerSent = input.steer;
    this.asking = Boolean(input && (input.popUp || input.reel));
    this.diving = (input?.duckDive ?? 0) > 0.3;
    const request = input || retry || place
      ? {
        paddle: false, popUp: false, steer: 0, ...input, retry,
        ...(spawnAt ? { spawnAt } : {}), ...(place ? { place } : {}), ...(this.stance ? { stance: this.stance } : {}),
        ...(this.boardSheets && this.host?.config.boardSpray === 'old' ? { boardSheets: this.boardSheets } : {}),
      } : undefined;
    this.boardSheets = undefined;
    this.host?.advance(steps, request, reactions);
  }

  /** Online (board-spray): the other players' boards' sheets, from their poses on this water, for the next batch of steps. */
  setRemoteSheets(packed: Float32Array | undefined): void {
    this.boardSheets = packed;
    // Drawn as curtains too, where the config draws them (spray-sheet).
    this.otherCurtains = this.host?.config.spraySheet === 'off' || this.host?.config.boardSpray === 'off' ? undefined : packed;
    this.otherFans = this.host?.config.boardSpray === undefined ? packed : undefined;
  }

  /** Other players' sheets for their fans (spray-rework), as last drawn. */
  private otherFans?: ArrayLike<number>;

  update(dt: number): void {
    const { host } = this;
    if (!host) return;
    // The board, the rider and the camera's target are drawn between physics snapshots (the riding-body plan, step 1).
    const { status } = host.snapshot;
    const refreshVisuals = host !== this.visualHost || status !== this.visualStatus || this.visualsDirty
      || this.visualSprayLook !== this.spray.look || this.visualLipLook !== this.lipSheet.look;
    if (host !== this.trackedHost) {
      this.track.reset();
      this.trackedHost = host;
    }
    this.track.push(status.seaTime, host.snapshot.rider, host.snapshot.board);
    const time = this.track.sample(dt, this.drawnRider, this.drawnBoard) ?? status.seaTime;
    const pose = this.drawnBoard;
    const rider = this.drawnRider;
    const riding = rider[RIDER_SNAPSHOT.present] > 0;
    // Follow the rider's body once it is in the water, the board while it rides.
    const fallen = riding && rider[RIDER_SNAPSHOT.phase] === RIDER_PHASES.indexOf('fallen');
    this.follow.position.x = fallen ? rider[RIDER_SNAPSHOT.points] : pose[0];
    this.follow.position.y = fallen ? rider[RIDER_SNAPSHOT.points + 1] : pose[1];
    this.follow.position.z = fallen ? rider[RIDER_SNAPSHOT.points + 2] : pose[2];
    this.follow.heading = riding ? rider[RIDER_SNAPSHOT.heading] : 0;
    this.followMotion(host, time);
    this.camera.update(host, this.focus, dt, pose[7] > 0 ? this.follow : undefined);
    if (refreshVisuals) {
      this.farField.update(status.seaTime);
      // Swept barrels draw the jet; foam and spray draw the splash water. Extra splash ribbons form detached white bands.
      this.lipSheet.update(host.snapshot.lip, this.swept && this.sweptCrash ? 0 : host.snapshot.lipCount, host.init.dx);
      this.bubbles.update({ positions: host.snapshot.bubbles, count: host.snapshot.bubbleCount });
      // Surface foam and spray show the swept whitewater; opaque foam balls obscure its opening.
      this.spray.update({ particles: host.snapshot.spray, count: host.snapshot.sprayCount }, !(this.swept && this.sweptCrash));
      // Mirrored past the open sides with the edge band's water (none at the Wave Pool).
      this.edgeWhitewater.update(this.edgeBand?.layout);
      this.visualHost = host;
      this.visualStatus = status;
      this.visualSprayLook = this.spray.look;
      this.visualLipLook = this.lipSheet.look;
      this.visualsDirty = false;
    }
    this.board.visible = this.shown && pose[7] > 0;
    this.board.position.set(pose[0], pose[1], pose[2]);
    this.board.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    // The spray's curtains, carried with the drawn board (the snapshot's sheets are where it was at the snapshot).
    const snapshotBoard = host.snapshot.board;
    this.curtainOffset.set(pose[0] - snapshotBoard[0], pose[1] - snapshotBoard[1], pose[2] - snapshotBoard[2]);
    if (!(snapshotBoard[7] > 0)) this.curtainOffset.set(0, 0, 0);
    this.curtains.setStyle(host.config.boardSpray === 'old' ? 'glass' : 'smeared');
    this.curtains.update(status.seaTime, host.snapshot.sheets, host.snapshot.sheetCount, this.curtainOffset, this.otherCurtains);
    this.curtains.mesh.visible = this.shown && this.sprayShown;
    this.updateFan();
    this.fan.group.visible = host.config.boardSpray === undefined && this.shown && this.sprayShown;
    this.surfer.group.visible = this.shown && riding;
    this.leash.object.visible = this.shown && riding && pose[7] > 0;
    if (riding) {
      readRiderSnapshot(rider, pose, this.riderState);
      // `?duckDrawn=old`: the two-body duck-dive drawn as before duck-drawn.
      if (this.duckDrawnOld) this.riderState.swim.ducking = false;
      // Beyond the snapshot (the animation-realism plan's phase 4): why the rider fell, as the ride's status names it (the
      // drawn fall's shape), and the player's stance (the leash's hand).
      this.riderState.separation = status.ride?.separation;
      this.riderState.stance = this.stance ?? 'regular';
      this.riderState.steer = this.steerSent;
      this.riderState.swim.holding = this.holds.update({
        fallen: this.riderState.phase === 'fallen', asked: this.asking, diving: this.diving, status: status.ride,
        chest: this.riderState.points[POINT.torso], board: this.riderState.boardPosition, turn: this.riderState.boardQuaternion,
      });
      this.riderMotion.update(this.riderState, time);
      this.riderState.stroking = this.paddling && this.riderState.phase === 'prone' ? 1 : 0;
      this.riderState.clock = time;
      this.surfer.update(this.riderState, this.camera.camera.position);
      const { leash } = this.riderState;
      // The leash is on the back foot: the right regular, the left goofy (the stances spec's setting); reeling, it runs
      // from the hand on the cord (the drawn rider's hand over hand), or the back foot's side's hand.
      const goofy = this.stance === 'goofy';
      this.leash.update(this.riderState.points[goofy ? POINT.leftFoot : POINT.rightFoot], leash.plug, {
        snapped: leash.snapped, hand: leash.reeling ? (leash.gripped ? leash.grip : this.riderState.points[goofy ? POINT.leftHand : POINT.rightHand]) : undefined,
      });
    } else {
      this.riderMotion.reset();
      this.holds.reset();
    }
  }

  /**
   * The edge band past the tank's open sides (the owner, 2026-10-09), and the far ocean's rim held on the drawn tank:
   * call once the water has uploaded this frame's heights. Hidden with the far ocean.
   */
  drawEdgeBand(): void {
    const band = this.edgeBand;
    if (!band) return;
    const shown = Boolean(this.host) && this.shown && this.farField.mesh.visible && this.farField.time === this.farField.time;
    band.update(shown);
    this.edgeWhitewater.group.visible = band.mesh.visible;
  }

  /**
   * The swept barrel (the Padang Padang spec, Part B, PR 3), lofted over the water as drawn: the page calls this once
   * the water has uploaded this frame's heights. Hidden, or at a spot without it, it draws nothing and masks nothing.
   */
  drawBarrel(): void {
    const { host, sweptBarrel } = this;
    if (!sweptBarrel) return;
    if (this.libraryOn && this.libraryZone && host) {
      this.libraryZone.draw(host.snapshot.zone, this.shown ? host.snapshot.zoneCount : 0);
      return;
    }
    if (!host || !this.swept || !this.shown) {
      sweptBarrel.draw(NO_FRONT, 0, 0, host?.snapshot.status);
      return;
    }
    sweptBarrel.draw(host.snapshot.front, host.snapshot.frontCount, this.config?.tide ?? 0, host.snapshot.status);
  }

  /**
   * The spilling lip's curls (the Canyon spilling lip) over the heights the water just uploaded: the page calls this once
   * the water has uploaded this frame's heights. Rebuilt only for a new snapshot, look or surface; none hidden.
   */
  drawCurl(): void {
    const curl = this.spillingCurl;
    if (!curl) return;
    const { host } = this;
    if (!host || !this.shown || host.snapshot.curlCount === 0) {
      curl.mesh.update(host?.snapshot.curl ?? new Float32Array(0), 0, () => 0);
      curl.drawn = undefined;
      return;
    }
    const { water, mesh } = curl;
    const look = water.drawnLook;
    const { status } = host.snapshot;
    const drawn = curl.drawn;
    if (drawn && drawn.status === status && drawn.surface === water.surfaceRevision && drawn.look === look) return;
    mesh.setLook(look);
    const { grid, surfaceData } = water;
    mesh.update(host.snapshot.curl, host.snapshot.curlCount, (x, z) => sampleSurfaceHeight(surfaceData, grid, x, z));
    curl.drawn = { status, surface: water.surfaceRevision, look };
  }

  /**
   * The roller front (the Canyon roller front) over the heights the water just uploaded: the page calls this once the
   * water has uploaded this frame's heights. Its patches are laid out only for a new snapshot; the heights are read on
   * the GPU each frame. Rich only; none hidden, or with `?rollerFront=off` (`window.waterRollerFront(false)`).
   */
  drawRollerFront(): void {
    const front = this.rollerFront;
    if (!front) return;
    const { host } = this;
    const { water, mesh } = front;
    const look = host?.snapshot.rollerLook;
    if (!host || !look || look.length === 0 || !this.shown || water.drawnLook !== 'rich') {
      mesh.hide();
      front.drawn = undefined;
      return;
    }
    const { status } = host.snapshot;
    // The A/B switch only hides it, so turning it back on uploads nothing.
    mesh.mesh.visible = rollerFrontMode.on && mesh.hasBand;
    if (!rollerFrontMode.on || (front.drawn && front.drawn.status === status)) return;
    // The table itself is the water's roller texture, uploaded with its heights; the front uploads only its look.
    mesh.update(host.snapshot.roller, look, water.materialUniforms.waterRollerColumns.value as number);
    front.drawn = { status };
  }

  /** The roller front's mesh, once a sea has started (the water sheet's checks). */
  get rollerFrontMesh(): RollerFrontMesh | undefined {
    return this.rollerFront?.mesh;
  }

  /** The spilling lip's mesh, once a sea has started (the water sheet's checks). */
  get curlMesh(): SpillingCurlMesh | undefined {
    return this.spillingCurl?.mesh;
  }

  /** The swept barrel's loft as last drawn, at a swept spot (the water sheet's curl shots). */
  get barrelLoft(): LoftResult | undefined {
    return this.libraryOn && this.libraryZone ? this.libraryZone.lastLoft : this.sweptBarrel?.lastLoft;
  }

  /** C2 step 3's overturn on the page (`?wave=library`): its last build's cost, ms (the fps trace's). */
  get libraryDrawMs(): number {
    return this.libraryZone?.lastMs ?? 0;
  }

  /** The swept barrel's mesh, once a swept spot has made it (the water sheet's views and before-and-after). */
  get barrelMesh(): SweptBarrelMesh | undefined {
    return this.sweptBarrel?.mesh;
  }

  /**
   * Dev A/B (the water sheet's `waterSheetTubeShape`): draw the running spot's cases as `shape` from now on, on the same
   * held sea; the surf zone's contact and crash keep the shape they started with (`SurfZoneConfig.tubeShape`).
   */
  async setDrawnTubeShape(shape: TubeShape): Promise<boolean> {
    const spot = this.config?.spot;
    const bytes = spot && this.swept ? await barrelCaseBytes(spot, this.config?.poolTubeCase) : undefined;
    if (!spot || !bytes || !this.sweptBarrel) return false;
    this.sweptBarrel.useLibrary(spot, libraryFromBytes(bytes, shape, spot, this.config?.heldRule));
    return true;
  }

  /** The Wave Lab rows for the running surf zone. */
  readout(): ReadoutRow[] {
    return this.host && this.config ? formatPhysicalReadout(this.config, this.host.snapshot.status, this.storm, this.practice) : [];
  }

  setSprayVisible(visible: boolean): void {
    this.sprayShown = visible;
    this.visualsDirty = true;
    this.host?.setSprayEnabled(visible);
    this.spray.mesh.visible = this.shown && visible;
    this.fan.group.visible = this.shown && visible && this.host?.config.boardSpray === undefined;
  }

  cameraBelowSurface(margin = 0.1, position = this.camera.camera.position): boolean {
    if (!this.host) return false;
    const drawn = this.libraryOn && this.libraryZone
      ? this.libraryZone.waterAt(position.x, position.y, position.z, margin) : this.sweptBarrel?.waterAt(position.x, position.y, position.z, margin);
    if (drawn !== undefined) return drawn;
    return position.y < this.host.heightAt(position.x, position.z) - margin;
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.board.visible = visible && (this.host?.snapshot.board[7] ?? 0) > 0;
    this.surfer.group.visible = visible && (this.host?.snapshot.rider[RIDER_SNAPSHOT.present] ?? 0) > 0;
    this.leash.object.visible = this.surfer.group.visible && (this.host?.snapshot.board[7] ?? 0) > 0;
    this.seabed.mesh.visible = visible;
    this.farField.mesh.visible = visible && !this.atPool;
    this.poolScenery.group.visible = visible && this.atPool;
    this.lipSheet.mesh.visible = visible;
    this.bubbles.mesh.visible = visible;
    this.spray.mesh.visible = visible && this.sprayShown;
    this.curtains.mesh.visible = visible && this.sprayShown;
    this.fan.group.visible = visible && this.sprayShown && this.host?.config.boardSpray === undefined;
  }

  /**
   * The fan (spray-rework): its drops thrown from the snapshot's sheets since the last call, flown on the GPU; #171's
   * are the worker's (`?boardSpray=old`). Each frame, from `update`; dev tools stepping the sea call it each step.
   */
  updateFan(): void {
    const { host } = this;
    if (!host || host.config.boardSpray !== undefined) return;
    this.fan.update(host.snapshot.status.seaTime, host.snapshot.sheets, host.snapshot.sheetCount, this.otherFans, this.surfaceAt, host.config.windSpeed ?? 0, this.curtainOffset);
  }

  /** The water's height for the fan's drops and carve lines (the running sea's). */
  private readonly surfaceAt = (x: number, z: number) => this.host?.heightAt(x, z) ?? 0;
}
