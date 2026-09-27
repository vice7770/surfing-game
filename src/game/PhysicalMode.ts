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
import { createRiderVisualState, readRiderSnapshot } from '../scene/rig/riderVisualState';
import { FarFieldOcean } from '../scene/FarFieldOcean';
import { gradedAxis } from '../scene/gridGeometry';
import { BubblePoints } from '../scene/BubblePoints';
import { SprayPoints } from '../scene/SprayPoints';
import { LipSheetMesh } from '../scene/LipSheetMesh';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { SpectatorCamera, type FollowTarget } from '../scene/SpectatorCamera';
import { SpotSeabed } from '../scene/SpotSeabed';
import { SPOT_OPTICS } from '../scene/waterOptics';
import type { WaterSurface } from '../scene/WaterSurface';
import { createSpot, smoothstep, type SpotName } from '../wave/Bathymetry';
import { FarFieldProfile } from '../wave/FarFieldProfile';
import { MIXED_PEAK_FIT, skillForPeel } from '../wave/Breaking';
import { stormSwell, type StormSwell } from '../wave/StormSwell';
import type { ReadoutRow } from '../wave/SwellReadout';
import { RIDER_PHASES, RIDER_SNAPSHOT, type RideRequest, type SurfZoneStatus } from '../wave/SurfZoneRunner';
import type { SprayLook } from '../wave/SprayCloud';
import { RIDE_VIEWS, type RideView, type SpectatorView } from '../scene/SpectatorCamera';
import { OFFSHORE_DEPTH, SEA_COMPONENTS, TANK, surfZoneSea, tankDepth, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
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

/** Largest swell the tank carries, matching the buoy sliders: deeper water would be needed beyond this. */
export const TANK_SWELL_LIMITS = { height: { min: 0.3, max: 3 }, period: { min: 6, max: 18 } };

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
  if (settings.source === 'practice') return { ...PRACTICE_SWELL };
  if (settings.source !== 'storm') {
    return { significantHeight: settings.significantHeight, peakPeriod: settings.peakPeriod, spreading: spreadingFor(settings.spread) };
  }
  const storm = stormSwell({
    windSpeed: settings.stormWindSpeed,
    fetchKm: settings.stormFetchKm,
    durationHours: settings.stormDurationHours,
    distanceKm: settings.stormDistanceKm,
  });
  return {
    significantHeight: clamp(storm.significantHeight, TANK_SWELL_LIMITS.height),
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
export type SurfZoneHostFactory = (config: SurfZoneConfig) => SurfZoneHost;

/** Runs the surf zone in the page (tests, and browsers without Web Workers). */
export const localSurfZone: SurfZoneHostFactory = (config) => new LocalSurfZone(config, { rider: true });

export class PhysicalMode {
  readonly camera = new SpectatorCamera();
  readonly seabed = new SpotSeabed();
  readonly farField = new FarFieldOcean();
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
  private readonly riderState = createRiderVisualState();
  /** How the rider's board moves, for the drawn body (Part B). */
  private readonly riderMotion = new RiderMotion();
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

  /** Hand the water look to the running sea's spray, and to every sea started after. */
  setSprayLook(look: SprayLook): void {
    this.sprayLook = look;
    this.host?.setSprayLook(look);
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
   * The ride view's lead and lip: the followed point's velocity over the sea time
   * between snapshots, and the crest of the wave under the rider (spec P9 phase 0).
   */
  private followMotion(host: SurfZoneHost): void {
    const { follow, followedAt } = this;
    const { seaTime, ride } = host.snapshot.status;
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
    scene.add(this.seabed.mesh, this.farField.mesh, this.lipSheet.mesh, this.bubbles.mesh, this.spray.mesh, this.board, this.surfer.group);
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
    const tier = settings.stage === 2 && settings.compute === 'auto' && gpuTier !== undefined && await gpuTier();
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
      stage: settings.stage,
      compute: settings.compute,
      ...(tier ? { componentCount: GPU_TIER_COMPONENTS } : {}),
      ...overrides,
    };
    // Superseded while asking for the GPU: never build it, and never drop the newer start's spin-up.
    if (start !== this.starts) return false;
    const host = createHost(config);
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
    this.config = config;
    this.storm = swell.storm;
    this.practice = settings.source === 'practice';
    const { init } = host;
    water.setSource(new PhysicalSurfaceSource(new SnapshotSurfZone(host), init.grid.spacing));
    water.setChop(chopForWind(settings.windSpeed));
    water.setOptics(SPOT_OPTICS[settings.spot]);
    this.farField.setOptics(SPOT_OPTICS[settings.spot]);
    this.lipSheet.setOptics(SPOT_OPTICS[settings.spot]);
    const spot = createSpot(config.spot, config.seed);
    const offshoreDepth = OFFSHORE_DEPTH[settings.spot];
    const windowMin = init.windowXMin;
    const windowMax = windowMin + (init.grid.nx - 1) * init.grid.spacing;
    const leftX = windowMin + init.dx / 2;
    const rightX = windowMax - init.dx / 2;
    // Beyond the window the world continues each edge column's seabed; offshore it deepens to FAR_DEPTH.
    const offshoreBed = (z: number) => offshoreDepth + (FAR_DEPTH - offshoreDepth) * smoothstep(TANK.offshore, TANK.offshore - FAR_SLOPE_LENGTH, z);
    const bedDepth = (x: number, z: number) => {
      if (z < TANK.offshore) return offshoreBed(z);
      return tankDepth(spot, offshoreDepth, x < windowMin ? leftX : x > windowMax ? rightX : x, z);
    };
    this.focus = { ...init.focus };
    const hole = { xMin: windowMin, xMax: windowMax, zMin: TANK.offshore, zMax: TANK.shore };
    this.seabed.setDepthOnGrid(
      bedDepth,
      gradedAxis(this.focus.x - 600, this.focus.x + 600, windowMin, windowMax, 2, 30),
      gradedAxis(-900, TANK.shore + 30, TANK.offshore, TANK.shore, 2, 30),
    );
    const profile = new FarFieldProfile(surfZoneSea(config), {
      referenceZ: TANK.offshore,
      shoreZ: TANK.shore,
      offshoreZ: TANK.offshore - (FAR_EXTENT - 330),
      shoreSamples: 181,
      offshoreSamples: 391,
      offshoreDepth: (z) => offshoreBed(z) + settings.tide,
      leftDepth: (z) => tankDepth(spot, offshoreDepth, leftX, z) + settings.tide,
      rightDepth: (z) => tankDepth(spot, offshoreDepth, rightX, z) + settings.tide,
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
    this.board.visible = false;
    this.surfer.group.visible = false;
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
    const pose = host.snapshot.board;
    const rider = host.snapshot.rider;
    const riding = rider[RIDER_SNAPSHOT.present] > 0;
    // Follow the rider's body once it is in the water, the board while it rides.
    const fallen = riding && rider[RIDER_SNAPSHOT.phase] === RIDER_PHASES.indexOf('fallen');
    this.follow.position.x = fallen ? rider[RIDER_SNAPSHOT.points] : pose[0];
    this.follow.position.y = fallen ? rider[RIDER_SNAPSHOT.points + 1] : pose[1];
    this.follow.position.z = fallen ? rider[RIDER_SNAPSHOT.points + 2] : pose[2];
    this.follow.heading = riding ? rider[RIDER_SNAPSHOT.heading] : 0;
    this.followMotion(host);
    this.camera.update(host, this.focus, dt, pose[7] > 0 ? this.follow : undefined);
    this.farField.update(host.snapshot.status.seaTime);
    this.lipSheet.update(host.snapshot.lip, host.snapshot.lipCount, host.init.dx);
    this.board.visible = this.shown && pose[7] > 0;
    this.board.position.set(pose[0], pose[1], pose[2]);
    this.board.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    this.surfer.group.visible = this.shown && riding;
    if (riding) {
      readRiderSnapshot(rider, pose, this.riderState);
      this.riderMotion.update(this.riderState, host.snapshot.status.seaTime);
      this.riderState.stroking = this.paddling && this.riderState.phase === 'prone' ? 1 : 0;
      this.surfer.update(this.riderState, this.camera.camera.position);
    } else {
      this.riderMotion.reset();
    }
    this.bubbles.update({ positions: host.snapshot.bubbles, count: host.snapshot.bubbleCount });
    this.spray.update({ particles: host.snapshot.spray, count: host.snapshot.sprayCount });
  }

  /** The Wave Lab rows for the running surf zone. */
  readout(): ReadoutRow[] {
    return this.host && this.config ? formatPhysicalReadout(this.config, this.host.snapshot.status, this.storm, this.practice) : [];
  }

  setSprayVisible(visible: boolean): void {
    this.sprayShown = visible;
    this.spray.mesh.visible = this.shown && visible;
  }

  cameraBelowSurface(margin = 0.1): boolean {
    if (!this.host) return false;
    const position = this.camera.camera.position;
    return position.y < this.host.heightAt(position.x, position.z) - margin;
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.board.visible = visible && (this.host?.snapshot.board[7] ?? 0) > 0;
    this.surfer.group.visible = visible && (this.host?.snapshot.rider[RIDER_SNAPSHOT.present] ?? 0) > 0;
    this.seabed.mesh.visible = visible;
    this.farField.mesh.visible = visible;
    this.lipSheet.mesh.visible = visible;
    this.bubbles.mesh.visible = visible;
    this.spray.mesh.visible = visible && this.sprayShown;
  }
}
