import { Color, Mesh, Vector3, type Material, type Scene } from 'three';
import type { StandRefusal } from '../physics/AttachedRider';
import type { WaveFrame } from '../physics/waveFrame';
import type { RiderPlacement } from '../physics/RideSession';
import type { StanceName } from '../physics/riderPosture';
import { buildBoardShape } from '../physics/boardShape';
import { createBoardMesh } from '../scene/BoardMesh';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { SurferView } from '../scene/character/SurferView';
import { RiderMotion } from '../scene/rig/riderMotion';
import { SnapshotTrack } from './snapshotTrack';
import { POINT, createRiderVisualState, readRiderSnapshot } from '../scene/rig/riderVisualState';
import { LeashCord } from '../scene/board/LeashCord';
import { FarFieldOcean } from '../scene/FarFieldOcean';
import { gradedAxis } from '../scene/gridGeometry';
import { BubblePoints } from '../scene/BubblePoints';
import { SprayPoints } from '../scene/SprayPoints';
import { LipSheetMesh } from '../scene/LipSheetMesh';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { SpectatorCamera, type FollowTarget } from '../scene/SpectatorCamera';
import { SpotSeabed } from '../scene/SpotSeabed';
import { PoolScenery } from '../scene/PoolScenery';
import { POOL, POOL_EDGE_HEIGHT, poolDeckZ, regularSignificantHeight } from '../wave/pool';
import { SPOT_OPTICS } from '../scene/waterOptics';
import type { WaterSurface } from '../scene/WaterSurface';
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
import { SEA_COMPONENTS, solverStage, surfZoneSea, sweptBarrelOn, tankDepth, tankLayout, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { SweptBarrel } from '../scene/barrel/SweptBarrel';
import { SWEPT_BARREL_VIEWS, type SweptBarrelMesh } from '../scene/barrel/SweptBarrelMesh';
import { devParam } from '../devTools';
import type { LoftResult } from '../wave/barrel/sweptLoft';
import { barrelCasesFor, libraryFromBytes, loadBarrelCaseBytes } from '../wave/barrel/barrelLibrary';
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
  tide: number;
  /** Local wind, m/s: positive onshore, negative offshore. */
  windSpeed: number;
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
 * Practice mode (plan P4f): a narrow-band, narrow-spread groundswell that keeps
 * catchable faces coming. Only the incoming water changes; the solver and every
 * force law are the natural mode's. Ghost riders catch most on the Point in it.
 * Its height gives the Canyon chest-to-head-high faces (1–1.5 m; the riding-the-wave
 * spec's reference wave): at Hs 2 m the faces were 2.2–2.8 m and riders reached
 * 11–12 m/s off the bottom (docs/research/reference-wave.md).
 */
export const PRACTICE_SWELL: Readonly<SwellInput> = { significantHeight: 1.4, peakPeriod: 12, spreading: 40, bandwidth: 0.08, directionDegrees: 10 };

/**
 * The Reef's practice groundswell: the Practice swell's narrow band and spread at a
 * Teahupo'o period, from the peak's side, for ~1.5–2 m faces (the Teahupo'o Reef spec).
 * The Reef stays fast when small: its break runs along the ledge at no less than the
 * shelf's celerity (src/wave/ledgePeel.ts). Provisional until the size report calibrates it.
 */
export const REEF_PRACTICE_SWELL: Readonly<SwellInput> = { significantHeight: 1, peakPeriod: 14, spreading: 40, bandwidth: 0.08, directionDegrees: 20 };

/**
 * Padang Padang's directional spreading, the cos-2s exponent s at its edge: a Southern Ocean groundswell
 * is Goda's long-decay swell (s_max 75), and refraction into 10 m narrows it further, past 100 by h/L0 ≈ 0.025
 * (Goda, Takayama & Suzuki 1978, eq. 17 and fig. 5); the Bukit's tip also filters the directions that wrap round.
 * Provisional (the advisor's ruling, 2026-09-28): swept over 100–250, never below 75.
 */
export const PADANG_SPREADING = 150;

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

/** Buoy values as set, the practice groundswell, or the swell a storm delivers to the spot, kept within TANK_SWELL_LIMITS. */
export function swellFor(settings: PhysicalSettings): SwellInput {
  if (settings.source === 'practice') return { ...practiceSwell(settings.spot) };
  if (settings.source !== 'storm') {
    return {
      significantHeight: Math.min(settings.significantHeight, swellHeightLimit(settings.spot)), peakPeriod: settings.peakPeriod,
      spreading: settings.spreading ?? spreadingFor(settings.spread),
    };
  }
  const storm = stormSwell({
    windSpeed: settings.stormWindSpeed,
    fetchKm: settings.stormFetchKm,
    durationHours: settings.stormDurationHours,
    distanceKm: settings.stormDistanceKm,
  });
  return {
    significantHeight: clamp(storm.significantHeight, { min: TANK_SWELL_LIMITS.height.min, max: swellHeightLimit(settings.spot) }),
    peakPeriod: clamp(storm.peakPeriod, TANK_SWELL_LIMITS.period),
    spreading: storm.spreading,
    bandwidth: storm.bandwidth,
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
}

/** Runs the surf zone in the page (tests, and browsers without Web Workers). */
export const localSurfZone: SurfZoneHostFactory = (config, extra) => new LocalSurfZone(config, { rider: true, ...extra });

const barrelBytes = new Map<SpotName, Promise<Uint8Array[] | undefined>>();

/**
 * A spot's barrel case files, fetched once for the page's drawing and the surf zone's contact (the Padang Padang spec,
 * Part B, PR 4; each spot its own transect's, PR 7). A failed fetch leaves the swept barrel off for that start and is
 * tried again at the next.
 */
export function barrelCaseBytes(spot: SpotName): Promise<Uint8Array[] | undefined> {
  let bytes = barrelBytes.get(spot);
  if (!bytes) {
    bytes = loadBarrelCaseBytes(barrelCasesFor(spot)).catch((error: unknown) => {
      console.warn('The barrel library did not load; the swept barrel stays off.', error);
      barrelBytes.delete(spot);
      return undefined;
    });
    barrelBytes.set(spot, bytes);
  }
  return bytes;
}

/** Forget the fetched files (tests). */
export function resetBarrelCaseBytes(): void {
  barrelBytes.clear();
}

/** No front points: the swept barrel draws nothing. */
const NO_FRONT = new Float32Array(0);

export class PhysicalMode {
  readonly camera = new SpectatorCamera();
  readonly seabed = new SpotSeabed();
  readonly farField = new FarFieldOcean();
  /** The Wave Pool's walls, deck and machine hall (the movement-flow spec); the open ocean stays hidden there. */
  readonly poolScenery = new PoolScenery();
  private atPool = false;
  /** The thrown lip, drawn as one sheet (plan P7). */
  readonly lipSheet = new LipSheetMesh();
  /** Bubbles entrained under breaking bores, seen from below the surface. */
  readonly bubbles = new BubblePoints();
  /** Spray and mist thrown up by lip impacts, bores and offshore wind (G6). */
  readonly spray = new SprayPoints();
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
  private swept = false;
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
    this.scene = scene;
    scene.add(this.poolScenery.group, this.seabed.mesh, this.farField.mesh, this.lipSheet.mesh, this.bubbles.mesh, this.spray.mesh, this.board, this.surfer.group, this.leash.object);
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
    const diagnosticDx = Number(devParam('physicsDx'));
    const diagnosticDz = Number(devParam('physicsDz'));
    const config: SurfZoneConfig = {
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
      // Ordinary Padang seas halve alongshore work, keeping the original 1 m cross-shore grid.
      // Supplied room/replay/report configurations retain their own grid, including legacy defaults.
      ...(settings.spot === 'padang' && Object.keys(overrides).length === 0 ? { dx: 2, fineSpacing: 1 } : {}),
      // Practice's groundswell is given at the tank's edge, so its sea stays as it was (the wave-sizes spec).
      ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
      ...(tier ? { componentCount: GPU_TIER_COMPONENTS } : {}),
      ...(diagnosticDx > 0 && Number.isFinite(diagnosticDx) ? { dx: diagnosticDx } : {}),
      ...(diagnosticDz > 0 && Number.isFinite(diagnosticDz) ? { fineSpacing: diagnosticDz } : {}),
      ...overrides,
    };
    // Superseded while asking for the GPU: never build it, and never drop the newer start's spin-up.
    if (start !== this.starts) return false;
    // A swept spot's contact needs the barrel files in the surf zone (Part B, PR 4).
    const barrelCases = sweptBarrelOn(config) ? await barrelCaseBytes(config.spot) : undefined;
    if (start !== this.starts) return false;
    const host = createHost(config, barrelCases ? { barrelCases } : undefined);
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
    water.setSource(new PhysicalSurfaceSource(new SnapshotSurfZone(host, { sweptBarrel: this.swept }), init.grid.spacing));
    if (!this.sweptBarrel) {
      // `?barrelView=phase|front`: the curl flat-coloured by its slices' phase or front (a dev view, the tube review).
      const view = SWEPT_BARREL_VIEWS.find((candidate) => candidate === devParam('barrelView'));
      this.sweptBarrel = new SweptBarrel(water, async (spot) => {
        const bytes = await barrelCaseBytes(spot);
        if (!bytes) throw new Error('No barrel case files');
        return libraryFromBytes(bytes);
      }, view);
      this.scene.add(this.sweptBarrel.mesh.mesh);
    }
    this.sweptBarrel.setSpot(this.swept ? config.spot : undefined, this.swept);
    this.lipSheet.mesh.visible = this.shown;
    water.setChop(chopForWind(settings.windSpeed));
    water.setOptics(SPOT_OPTICS[settings.spot]);
    this.farField.setOptics(SPOT_OPTICS[settings.spot]);
    this.lipSheet.setOptics(SPOT_OPTICS[settings.spot]);
    const spot = createSpot(config.spot, config.seed);
    // The tank this swell needs (the wave-sizes spec): the far field and seabed start at its edge.
    const tank = tankLayout(config);
    const offshoreDepth = tank.edgeDepth;
    const windowMin = init.windowXMin;
    const windowMax = windowMin + (init.grid.nx - 1) * init.grid.spacing;
    const leftX = windowMin + init.dx / 2;
    const rightX = windowMax - init.dx / 2;
    // Beyond the window the world continues each edge column's seabed; offshore it deepens to FAR_DEPTH.
    const offshoreBed = (z: number) => offshoreDepth + (FAR_DEPTH - offshoreDepth) * smoothstep(tank.offshore, tank.offshore - FAR_SLOPE_LENGTH, z);
    const bedDepth = (x: number, z: number) => {
      if (z < tank.offshore) return offshoreBed(z);
      return tankDepth(spot, offshoreDepth, x < windowMin ? leftX : x > windowMax ? rightX : x, z, tank);
    };
    this.focus = { ...init.focus };
    const hole = { xMin: windowMin, xMax: windowMax, zMin: tank.offshore, zMax: tank.shore };
    // The Wave Pool: walls and a deck around the window, no open ocean beyond, and a painted concrete floor.
    this.atPool = config.spot === 'pool';
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
      gradedAxis(this.focus.x - 600, this.focus.x + 600, windowMin, windowMax, 2, 30),
      gradedAxis(Math.min(-900, tank.offshore - 300), tank.shore + 30, tank.offshore, tank.shore, 2, 30),
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
    const request = input || retry || place
      ? {
        paddle: false, popUp: false, steer: 0, ...input, retry,
        ...(spawnAt ? { spawnAt } : {}), ...(place ? { place } : {}), ...(this.stance ? { stance: this.stance } : {}),
      } : undefined;
    this.host?.advance(steps, request, reactions);
  }

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
      this.lipSheet.update(host.snapshot.lip, this.swept ? 0 : host.snapshot.lipCount, host.init.dx);
      this.bubbles.update({ positions: host.snapshot.bubbles, count: host.snapshot.bubbleCount });
      // Surface foam and spray show the swept whitewater; opaque foam balls obscure its opening.
      this.spray.update({ particles: host.snapshot.spray, count: host.snapshot.sprayCount }, !this.swept);
      this.visualHost = host;
      this.visualStatus = status;
      this.visualSprayLook = this.spray.look;
      this.visualLipLook = this.lipSheet.look;
      this.visualsDirty = false;
    }
    this.board.visible = this.shown && pose[7] > 0;
    this.board.position.set(pose[0], pose[1], pose[2]);
    this.board.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    this.surfer.group.visible = this.shown && riding;
    this.leash.object.visible = this.shown && riding && pose[7] > 0;
    if (riding) {
      readRiderSnapshot(rider, pose, this.riderState);
      this.riderMotion.update(this.riderState, time);
      this.riderState.stroking = this.paddling && this.riderState.phase === 'prone' ? 1 : 0;
      this.riderState.clock = time;
      this.surfer.update(this.riderState, this.camera.camera.position);
      const { leash } = this.riderState;
      // The leash is on the back foot: the right regular, the left goofy (the stances spec's setting).
      this.leash.update(this.riderState.points[this.stance === 'goofy' ? POINT.leftFoot : POINT.rightFoot], leash.plug, {
        snapped: leash.snapped, hand: leash.reeling ? this.riderState.points[POINT.leftHand] : undefined,
      });
    } else {
      this.riderMotion.reset();
    }
  }

  /**
   * The swept barrel (the Padang Padang spec, Part B, PR 3), lofted over the water as drawn: the page calls this once
   * the water has uploaded this frame's heights. Hidden, or at a spot without it, it draws nothing and masks nothing.
   */
  drawBarrel(): void {
    const { host, sweptBarrel } = this;
    if (!sweptBarrel) return;
    if (!host || !this.swept || !this.shown) {
      sweptBarrel.draw(NO_FRONT, 0, 0, host?.snapshot.status);
      return;
    }
    sweptBarrel.draw(host.snapshot.front, host.snapshot.frontCount, this.config?.tide ?? 0, host.snapshot.status);
  }

  /** The swept barrel's loft as last drawn, at a swept spot (the water sheet's curl shots). */
  get barrelLoft(): LoftResult | undefined {
    return this.sweptBarrel?.lastLoft;
  }

  /** The swept barrel's mesh, once a swept spot has made it (the water sheet's views and before-and-after). */
  get barrelMesh(): SweptBarrelMesh | undefined {
    return this.sweptBarrel?.mesh;
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
  }

  cameraBelowSurface(margin = 0.1, position = this.camera.camera.position): boolean {
    if (!this.host) return false;
    const drawn = this.sweptBarrel?.waterAt(position.x, position.y, position.z, margin);
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
  }
}
