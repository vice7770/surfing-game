import {
  AmbientLight,
  Color,
  CubeCamera,
  DirectionalLight,
  FogExp2,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
  Vector3,
  type Mesh,
} from 'three';
import { addPadSource } from './game/Bindings';
import { Controls } from './game/Controls';
import { SteamControllerDriver } from './game/steam/SteamControllerDriver';
import { frameDue } from './game/frameLimit';
import { resolveGraphics, type ResolvedGraphics } from './game/Graphics';
import { schoolPocketReflex, showsPocketReflex } from './game/pocketReflex';
import { SettingsStore, defaultSettings, type GameplaySettings } from './game/Settings';
import { SURFER_BODIES, type SurferSettings } from './game/SurferChoice';
import { DEV_TOOLS, devFlag, devParam } from './devTools';
import { simulatedSeconds } from './game/timeScale';
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, PhysicalMode, webGpuAvailable, type PhysicalSettings, type SurfZoneHostFactory } from './game/PhysicalMode';
import { OnlinePlay, type OnlinePhase } from './game/OnlinePlay';
import type { OnlineController } from './net/OnlineController';
import { ONLINE_QUEUE } from './net/OnlinePacer';
import { decompress } from './wave/surfZoneState';
import { INTERPOLATION_DELAY, createRemoteState, type RemoteState } from './net/RemoteSurfers';
import { RemoteSurferViews } from './scene/RemoteSurferViews';
import { NameTags, type TagEntry } from './ui/NameTags';
import { t } from './ui/strings';
import { LocalSurfZone } from './game/SurfZoneHost';
import { StillFrameGate } from './game/StillFrameGate';
import { BACKDROP_TIME, TIMES, backdropSettings, physicalSettingsFor, type SurfConditions, type SwellSize, type TimeOfDay } from './game/SurfConditions';
import type { WaterLook } from './scene/water/waterLook';
import type { RideView } from './scene/SpectatorCamera';
import { RIDER_SNAPSHOT, SURF_ZONE_STEP, type SurfZoneStatus } from './wave/SurfZoneRunner';
import type { SurfZoneConfig } from './wave/SurfZoneSimulation';
import type { RideFrame } from './game/RideTracker';
import type { SoundFrame } from './audio/soundMapping';
import type { ListenerPose } from './audio/AudioEngine';
import { WorkerSurfZone } from './game/WorkerSurfZone';
import { Environment } from './scene/Environment';
import { PhotoSky, sunElevationFromSlider } from './scene/PhotoSky';
import { ShadowRig, parseShadowLevel } from './scene/ShadowRig';
import { WaterSurface } from './scene/WaterSurface';
import { CAUSTIC_WINDOW, CausticMap } from './scene/CausticMap';
import { FftChop } from './scene/FftChop';
import { FlatSurfaceSource } from './scene/FlatSurfaceSource';
import type { ReadoutRow } from './wave/SwellReadout';
import { Autopilot, autopilotView } from './dev/Autopilot';
import type { SpotName } from './wave/Bathymetry';
import { App, type LabHost, type SchoolHost } from './ui/App';
import { WaveLab } from './game/waveLab/WaveLab';
import { FlyInput } from './game/waveLab/FlyInput';
import { labWater, type WaveLabSettings } from './game/waveLab/labSettings';
import { SchoolSession } from './game/school/SchoolSession';
import { lessonConfig } from './game/school/lessonWave';
import type { FlowFrame } from './game/school/lessonFlow';
import type { RiderPlacement } from './physics/RideSession';
import './style.css';
import './ui/ui.css';

/** `?demo`: a Surf ride the dev autopilot rides (`?demo=line` holds a line; otherwise S-turns). */
const demoMode = devParam('demo');
/** The light before any scene sets its own: the menu's. */
const START_SUN = TIMES[BACKDROP_TIME];
/** Seconds the menu's waves run before holding still on the Low preset. */
const BACKDROP_SETTLE_SECONDS = 1.5;
/** `?physical` (and `?demo`) start a Surf ride straight away (spec L1). */
const startRide = devFlag('physical') || demoMode !== null;
/** `?record`: a dev tool films an autopilot ride frame by frame (src/dev/rideRecorder.ts); the page's own clock stays off. */
const recordRequested = devFlag('record');
/** `?waterSheet`: a dev tool renders fixed water shots, Classic beside Rich, under each sky (src/dev/waterSheet.ts; G8). */
const waterSheetRequested = devFlag('waterSheet');
/**
 * The surf zone runs in a Web Worker (plan §3.2, P4a); `?inpage`, or a browser
 * without workers, runs it on the main thread instead.
 */
const inPage = typeof Worker === 'undefined' || devFlag('inpage');
/** A surf zone with a rider the player controls, or none (the menu's waves, plan P8). */
function surfZoneFactory(rider: boolean): SurfZoneHostFactory {
  // `?renderSpacing=0.5` draws the water on a finer grid, for close recordings (dev flag).
  const renderSpacing = Number(devParam('renderSpacing')) || undefined;
  return inPage
    ? (config) => new LocalSurfZone(config, { rider, renderSpacing })
    : (config) => new WorkerSurfZone(config, undefined, { rider, renderSpacing });
}
/**
 * Online (spec N1): the rider starts at `spawn` (m along shore from the take-off, and
 * outside the break line), and the worker may queue enough steps to catch up with the
 * room's clock.
 */
/** Surf School (spec L2): a surf zone with the player's rider, starting from a recorded sea. */
function recordedSurfZoneFactory(sea: Uint8Array): SurfZoneHostFactory {
  return inPage
    ? (config) => new LocalSurfZone(config, { rider: true }, sea)
    : (config) => new WorkerSurfZone(config, undefined, { rider: true }, { sea });
}
function onlineSurfZoneFactory(spawn: { spawnAlong: number; spawnOut: number }, sea?: Uint8Array): SurfZoneHostFactory {
  return inPage
    ? (config) => new LocalSurfZone(config, { rider: true, ...spawn }, sea)
    : (config) => new WorkerSurfZone(config, undefined, { rider: true, ...spawn }, { maxQueuedSteps: ONLINE_QUEUE, ...(sea ? { sea } : {}) });
}
/** Only the worker steps on the GPU (plan P6), so only it gets the GPU tier's sea. */
const gpuTier = inPage ? undefined : webGpuAvailable;

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required app element: ${selector}`);
  return element;
}

function availableStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

class SurfGame {
  private readonly scene = new Scene();
  private readonly renderer: WebGLRenderer;
  private readonly environment = new Environment();
  private readonly sunlight: DirectionalLight;
  private readonly ambient = new AmbientLight('#d8d9cd', 1.5);
  private readonly fill = new DirectionalLight('#76c6d3', 0.8);
  /** The photographed sky (G7): background, environment and sun, once loaded. */
  private readonly photoSky: PhotoSky;
  /** The sun's shadow around the rider (G7); `?shadows=` picks the level until P8's presets do. */
  private readonly shadows: ShadowRig;
  /** What the sun's shadow falls on from the High preset up. */
  private readonly shadowSurfaces: Mesh[];
  private readonly shadowSun = new Vector3();
  private readonly shadowNose = new Vector3();
  private reflectionMapTarget?: WebGLRenderTarget;
  private readonly water: WaterSurface;
  /** Caustics refracted through the physical surface onto its seabed (G5). */
  private readonly caustics: CausticMap;
  /** The WebGPU tier's FFT wind sea for the water's shading (plan P6). */
  private readonly fftChop = new FftChop();
  private readonly causticAhead = new Vector3();
  private seed = 1;
  private accumulator = 0;
  private previousFrame = 0;
  /** The Wave Lab (spec L1): its camera, clock and reading of the waves, and the input that flies it. */
  private readonly waveLab = new WaveLab();
  private readonly labInput: FlyInput;
  readonly lab: LabHost;
  /** The Surf School (spec L2): its recorded seas, whether a lesson sea runs now, its slow motion, and the sea time last read. */
  private readonly schoolSession = new SchoolSession();
  private schoolActive = false;
  private schoolFreePractice = false;
  private schoolSlow = false;
  private schoolSeaTime = Number.NaN;
  readonly school: SchoolHost;
  /** `?demo`'s autopilot, and how long it has been done with its ride, s. */
  private readonly demoPilot = demoMode === null ? undefined : new Autopilot({ style: demoMode === 'line' ? 'line' : 'turns' });
  private demoDone = 0;
  private readonly fixedStep = 1 / 60;
  private isBelowSurface = false;
  private readonly underwaterFog = new FogExp2('#367e83', 0.035);
  private readonly underwaterColor = new Color('#367e83');
  private readonly skyColor = new Color('#b8e3e5');
  private readonly physicalMode: PhysicalMode;
  private physicalSettings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS };
  /** A still frame: the surf zone is no longer stepped, and the scene is drawn only when it changes. */
  private frozen = false;
  /** Seconds left before the backdrop freezes, on the Low preset. */
  private freezeIn?: number;
  private needsRender = true;
  /** Slow motion: simulated seconds per real second (the Wave Lab's clock; 1 everywhere else). */
  private get timeScale(): number {
    if (this.waveLab.active) return this.waveLab.clock.scale;
    return this.schoolActive && this.schoolSlow ? 0.5 : 1;
  }

  /** Paused by the menu: nothing steps; the scene stays drawn. */
  private paused = false;
  /** Paused offline, the scene is drawn again only when what shows has changed. */
  private readonly stillFrame = new StillFrameGate();
  /** Under the loading card: nothing drawn or stepped would show, and the next sea spins up without them. */
  private covered = false;
  /** Sound (S1): the sea time of the last snapshot heard, the board's last place and sideslip, and the rider's last phase. */
  private soundSeaTime = Number.NaN;
  private soundBoard?: { x: number; y: number; z: number };
  private soundSideslip = 0;
  private soundPhase?: NonNullable<SoundFrame['ride']>['phase'];
  private readonly listenerForward = new Vector3();
  /** Online play (spec N1): the session, its frame logic, and the other surfers as drawn with their tags. */
  private online?: {
    controller: OnlineController; play: OnlinePlay; views: RemoteSurferViews; tags: NameTags;
    state: RemoteState; anchors: Vector3[]; rebuilding: boolean;
  };
  private showNameTags = true;
  /** Settings: the pocket reflex (the riding-the-wave spec), and the swell of the Surf session under way. */
  private pocketReflex: GameplaySettings['pocketReflex'] = 'practice';
  private surfSwell: SwellSize = 'practice';
  /** The sun the environment shows now, whoever set it. */
  private shownSun = { height: START_SUN.sunHeight, direction: START_SUN.sunDirection };
  /** The graphics settings in force (plan P8); until applied, today's defaults. */
  private graphics?: ResolvedGraphics;
  private lastRender = 0;

  constructor() {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = 'srgb';
    // Photographed skies carry a real sun; neutral tone mapping keeps colours and rolls off its highlights.
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', 'Surf game canvas. Click here to use keyboard controls.');
    getElement('#scene').append(this.renderer.domElement);
    this.labInput = new FlyInput({
      follow: () => this.waveLab.toggleFollow(this.physicalMode),
      jump: (point) => this.waveLab.jump(this.physicalMode, point),
      hideUi: () => this.lab.onAction?.('hide'),
      togglePause: () => this.waveLab.clock.togglePause(),
      step: () => this.waveLab.clock.step(),
      slower: () => this.waveLab.clock.slower(),
      faster: () => this.waveLab.clock.faster(),
      pause: () => this.lab.onAction?.('menu'),
      speed: (steps) => this.waveLab.fly.scaleSpeed(steps),
    }, { surface: this.renderer.domElement });
    this.labInput.enabled = false;
    // Dev tools: the lab, for checks in the page.
    if (DEV_TOOLS) (globalThis as unknown as { breaklineLab?: WaveLab }).breaklineLab = this.waveLab;

    this.scene.background = new Color('#b8e3e5');
    this.scene.add(this.environment.group);
    this.scene.add(this.ambient);
    this.sunlight = new DirectionalLight('#ffe7bd', 1.2 + 0.6 * START_SUN.sunHeight);
    this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45);
    this.scene.add(this.sunlight);
    this.fill.position.set(8, 4, -10);
    this.scene.add(this.fill);
    this.photoSky = new PhotoSky(this.renderer);

    // The water shows once a surf zone runs; until then it holds a still sea.
    this.water = new WaterSurface(new FlatSurfaceSource());
    this.water.mesh.material.envMapIntensity = 0.28;
    this.water.mesh.visible = false;
    this.scene.add(this.water.mesh);
    this.physicalMode = new PhysicalMode(this.scene);
    this.physicalMode.farField.mesh.material.envMapIntensity = 0.28;
    this.caustics = new CausticMap(this.water.causticSource, this.water.causticUniforms);
    this.physicalMode.seabed.useCaustics(this.water.causticUniforms, this.water.causticSource as never);
    this.physicalMode.spray.useWater(this.water.causticSource);
    this.lab = this.labHost();
    this.school = this.schoolHost();
    this.shadows = new ShadowRig(this.renderer, this.sunlight, this.scene);
    this.shadowSurfaces = [this.water.mesh, this.physicalMode.seabed.mesh, this.physicalMode.farField.mesh];
    this.shadows.setLevel(parseShadowLevel(window.location.search), { surfaces: this.shadowSurfaces });

    this.refreshSun();
    this.refreshReflection();
    this.applySun(START_SUN);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    // The app shows the loading card whenever a scene builds.
    getElement<HTMLElement>('#loading').classList.add('is-hidden');
    if (!recordRequested && !waterSheetRequested) requestAnimationFrame(this.frame);
  }

  /**
   * Dev hooks for filming a ride (`?record`): start a physical session, take one
   * fixed step with a given input, render at a given size, all without the
   * animation-frame clock, so even a hidden page films frame by frame.
   */
  get recording() {
    return {
      start: async (settings: PhysicalSettings) => {
        await this.startPhysical(this.seed, settings);
        getElement<HTMLElement>('#loading').classList.add('is-hidden');
      },
      step: (input: { paddle: boolean; popUp: boolean; steer: number }) => this.physicalMode.advance(1, input),
      retry: () => this.physicalMode.retry(),
      render: (seconds: number, camera?: PerspectiveCamera) => this.physicalRender(seconds, camera),
      resize: (width: number, height: number) => {
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(width, height, false);
        this.physicalMode.camera.resize(width / height);
      },
      mode: this.physicalMode,
      canvas: this.renderer.domElement,
      /** G8's water sheet: the look, the time of day (resolved once its sky is in), and a render from any camera. */
      setWaterLook: (look: WaterLook) => this.applyWaterLook(look),
      setTimeOfDay: (time: TimeOfDay) => this.applySun(TIMES[time]),
      renderView: (camera: PerspectiveCamera) => {
        const host = this.physicalMode.host;
        this.setUnderwater(host !== undefined && camera.position.y < host.heightAt(camera.position.x, camera.position.z) - 0.1);
        this.drawPhysical(camera);
      },
      water: this.water,
    };
  }

  /** Called once per rendered frame with the time since the last one, ms (the menus poll the gamepad here). */
  onFrame?: (intervalMs: number, status?: SurfZoneStatus) => void;

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  get gl(): WebGLRenderingContext | WebGL2RenderingContext {
    return this.renderer.getContext();
  }

  /** Apply the graphics settings (plan P8): resolution, frame limit, and what is drawn; water changes wait for the next wave. */
  /** Ride as the player's surfer (G7 Part B); `?surfer=surfer1…4` still picks the body (dev flag). */
  setSurfer(choice: SurferSettings): void {
    const body = SURFER_BODIES.find((candidate) => candidate.id === devParam('surfer'))?.id;
    this.physicalMode.setSurfer(body ? { ...choice, body } : choice);
  }

  applyGraphics(resolved: ResolvedGraphics): void {
    this.graphics = resolved;
    this.needsRender = true;
    this.resize();
    if (!resolved.caustics) this.caustics.disable();
    this.physicalMode.setSprayVisible(resolved.sprayMist);
    this.physicalMode.farField.setViewDistance(resolved.oceanView);
    this.water.setFoamDetail(resolved.detailedFoam);
    // The preset's shadow and surfer detail (G7 Part B); `?shadows=` still picks the level.
    const level = parseShadowLevel(window.location.search, resolved.shadows);
    // A new level recompiles every material, so only a change applies it.
    if (level !== this.shadows.currentLevel) this.shadows.setLevel(level, { surfaces: this.shadowSurfaces });
    this.physicalMode.surfer.setDetail(resolved.surferLodDistance, resolved.textureCap);
    this.online?.views.setDetail(resolved.surferLodDistance, resolved.textureCap);
    this.applyWaterLook(resolved.waterLook);
  }

  /** R: paddle out again from the lineup while the waves carry on. */
  quickRetry = (): void => {
    // Online, R counts down to a free spot in the lineup (spec N1).
    if (this.online) {
      this.online.play.respawn();
      return;
    }
    this.physicalMode.retry();
  };

  /** Build the physical surf zone (with the player's rider unless `rider` is false) and show it in `sun`, or the light already shown. */
  private async startPhysical(
    seed: number, settings: PhysicalSettings,
    options: {
      sun?: { sunHeight: number; sunDirection: number }; rider?: boolean; factory?: SurfZoneHostFactory; overrides?: Partial<SurfZoneConfig>;
      /** The Wave Lab's sea (spec L1); any other scene ends the lab. */
      lab?: boolean;
      /** A Surf School lesson's sea (spec L2); any other scene ends the school. */
      school?: boolean;
    } = {},
  ): Promise<boolean> {
    const factory = options.factory ?? surfZoneFactory(options.rider ?? true);
    // An online room fixes its own sea (components included); otherwise the GPU tier decides.
    const tier = options.overrides || this.graphics?.richSea === false ? undefined : gpuTier;
    if (!(await this.physicalMode.start(settings, seed, this.water, options.overrides ?? {}, factory, tier))) return false;
    this.frozen = false;
    this.freezeIn = undefined;
    if (!options.lab) this.leaveLab();
    this.waveLab.active = options.lab === true;
    if (!options.school) this.leaveSchool();
    this.schoolActive = options.school === true;
    this.seed = seed;
    this.physicalSettings = { ...settings };
    this.water.mesh.visible = true;
    this.physicalMode.setVisible(true);
    this.physicalMode.camera.setView(this.physicalMode.homeView);
    this.environment.group.scale.setScalar(5);
    this.environment.group.position.set(this.physicalMode.focus.x, 0, this.physicalMode.focus.z);
    const { sun } = options;
    if (sun && (sun.sunHeight !== this.shownSun.height || sun.sunDirection !== this.shownSun.direction)) this.applySun(sun);
    this.accumulator = 0;
    return true;
  }

  /**
   * The menu's waves (plan P8): a riderless surf zone on the practice groundswell,
   * seen by the cinematic sweep. On the Low preset it runs briefly, then holds still.
   */
  async showBackdrop(spot: SpotName): Promise<boolean> {
    this.leaveOnline();
    this.physicalMode.idleView = 'cinematic';
    const water = { stage: this.graphics?.stage ?? 2, compute: this.graphics?.compute ?? 'auto' } as const;
    if (!(await this.startPhysical(this.seed, backdropSettings(spot, water), { sun: TIMES[BACKDROP_TIME], rider: false }))) return false;
    if (this.graphics?.stillBackdrop) this.freezeIn = BACKDROP_SETTLE_SECONDS;
    return true;
  }

  /** A Surf session (plan P8): the physical surf zone with the player's rider, in the chosen conditions and camera. */
  async startSurf(spot: SpotName, conditions: SurfConditions, seed: number, camera: RideView | 'overview'): Promise<boolean> {
    this.leaveOnline();
    this.surfSwell = conditions.swell;
    this.physicalMode.idleView = 'overview';
    this.physicalMode.defaultView = camera;
    const water = { stage: this.graphics?.stage ?? 2, compute: this.graphics?.compute ?? 'auto' } as const;
    return this.startPhysical(seed, physicalSettingsFor(spot, conditions, water), { sun: TIMES[conditions.time], rider: true });
  }

  /** The physical ride's status, while a rider is on the water. */
  get rideStatus(): SurfZoneStatus['ride'] | undefined {
    return this.physicalMode.host?.snapshot.status.ride;
  }

  /** Accessibility (plan P8): the menu's cinematic camera holds still. */
  setReducedMotion(reduced: boolean): void {
    this.physicalMode.camera.setReducedMotion(reduced);
  }

  /** The physical surf zone's readout rows, for the dev-tools telemetry overlay. */
  get readout(): ReadoutRow[] {
    return this.physicalMode.readout();
  }

  /**
   * Online (spec N1): the room's sea, built from its seed and conditions at the room's
   * clock (stage 2 with the GPU tier's 64 components, whatever the graphics settings),
   * with the rider waiting outside the break until the sea has caught up with the room.
   * The sea is another player's, handed over through the server, whenever someone else
   * is in the room (spec N1: late joiners' fresh seas break elsewhere); fresh otherwise.
   * Called again to rebuild the sea when it falls behind.
   */
  async startOnline(controller: OnlineController, camera: RideView | 'overview' = 'front'): Promise<boolean> {
    const room = controller.room;
    if (!room) return false;
    this.physicalMode.idleView = 'overview';
    this.physicalMode.defaultView = camera;
    const settings = physicalSettingsFor(room.spot, room.conditions, { stage: 2, compute: 'auto' });
    const spawn = { spawnAlong: (Math.random() - 0.5) * 40, spawnOut: 10 + Math.random() * 15 };
    const handed = await controller.requestSea();
    const sea = handed ? await decompress(handed.bytes, handed.deflated) : undefined;
    // Left the room while waiting for its sea: build nothing (it would replace the menu's waves).
    if (controller.closed) return false;
    // A handed-over sea brings its own clock and replaces everything a spin-up would build; a fresh one starts at the room's.
    const overrides: Partial<SurfZoneConfig> = {
      stage: 2, compute: 'auto', componentCount: GPU_TIER_COMPONENTS, startSeaTime: controller.seaTimeNow(), ...(sea ? { spinUpPeriods: 0 } : {}),
    };
    const started = await this.startPhysical(room.seed, settings, {
      sun: TIMES[room.conditions.time], rider: true, factory: onlineSurfZoneFactory(spawn, sea), overrides,
    });
    if (!started) return false;
    if (this.online?.controller === controller) {
      this.online.play.restart();
      this.online.rebuilding = false;
      return true;
    }
    this.leaveOnline();
    const views = new RemoteSurferViews(this.scene);
    if (this.graphics) views.setDetail(this.graphics.surferLodDistance, this.graphics.textureCap);
    this.online = {
      controller, play: new OnlinePlay(controller), views, tags: new NameTags(getElement('#app')),
      state: createRemoteState(), anchors: [], rebuilding: false,
    };
    // Someone joining late takes this sea (spec N1).
    controller.provideSea = async () => (this.online?.controller === controller ? this.physicalMode.host?.exportState() : undefined);
    return true;
  }

  /** Leave online play: the other surfers and their tags go (the session is closed by whoever opened it). */
  leaveOnline(): void {
    const { online } = this;
    if (!online) return;
    online.views.dispose();
    online.tags.dispose();
    this.online = undefined;
  }

  /** Online play for the HUD: catching up, riding or rebuilding the sea, and a respawn's countdown. */
  get onlineState(): { phase: OnlinePhase; behind: number; respawnIn?: number } | undefined {
    const { online } = this;
    return online && { phase: online.rebuilding ? 'resyncing' : online.play.phase, behind: online.play.behind, respawnIn: online.play.respawnIn };
  }

  /** Settings: names over the other surfers online. */
  setNameTags(show: boolean): void {
    this.showNameTags = show;
  }

  /** Settings: the pocket reflex, on the Practice swell only, always, or never. */
  setPocketReflex(setting: GameplaySettings['pocketReflex']): void {
    this.pocketReflex = setting;
  }

  setPaused(paused: boolean): void {
    if (paused !== this.paused) this.stillFrame.reset();
    this.paused = paused;
  }

  setCovered(covered: boolean): void {
    this.covered = covered;
    this.needsRender = true;
  }

  /** The ride as the ride tracker reads it: status, the board's position, and the sea's clock. */
  get rideFrame(): RideFrame | undefined {
    const host = this.physicalMode.host;
    const ride = host?.snapshot.status.ride;
    if (!host || !ride) return undefined;
    const { board, status } = host.snapshot;
    return {
      phase: ride.phase, speed: ride.speed, resets: ride.resets, separation: ride.separation, seaTime: status.seaTime, x: board[0], z: board[2],
      report: ride.report, timeScale: this.timeScale,
    };
  }

  /**
   * What makes sound this frame (S1): the surf zone's report and the camera.
   * A snapshot's landings and strokes are heard once, on the frame it arrives
   * (the sea's clock tells a new one); the board's sideslip comes from its
   * motion between snapshots. Undefined before any surf zone runs.
   */
  soundFrame(dt: number, paused: boolean): SoundFrame | undefined {
    const host = this.physicalMode.host;
    if (!host) {
      this.soundSeaTime = Number.NaN;
      this.soundPhase = undefined;
      return undefined;
    }
    const { snapshot } = host;
    const { status } = snapshot;
    const elapsed = status.seaTime - this.soundSeaTime;
    const fresh = !(elapsed === 0);
    this.soundSeaTime = status.seaTime;
    const pose = snapshot.board;
    let board: SoundFrame['board'];
    if (pose[7] > 0) {
      const [x, y, z, qx, qy, qz, qw] = pose;
      if (fresh && elapsed > 0 && this.soundBoard) {
        // Across the board: its local +x turned by its orientation.
        const rx = 1 - 2 * (qy * qy + qz * qz);
        const ry = 2 * (qx * qy + qw * qz);
        const rz = 2 * (qx * qz - qw * qy);
        this.soundSideslip = Math.abs(((x - this.soundBoard.x) * rx + (y - this.soundBoard.y) * ry + (z - this.soundBoard.z) * rz) / elapsed);
      }
      this.soundBoard = { x, y, z };
      board = { x, y, z, speed: status.ride?.boardSpeed ?? status.board?.speed ?? 0, sideslip: this.soundSideslip };
    } else {
      this.soundBoard = undefined;
      this.soundSideslip = 0;
    }
    const ride = status.ride;
    const previousPhase = this.soundPhase ?? ride?.phase;
    this.soundPhase = ride?.phase;
    const camera = this.physicalMode.camera.camera;
    return {
      dt,
      timeScale: this.timeScale,
      paused: paused || (this.waveLab.active && this.waveLab.clock.paused),
      listener: { x: camera.position.x, y: camera.position.y, z: camera.position.z, underwater: this.physicalMode.cameraBelowSurface() },
      roar: snapshot.roar,
      lipHits: snapshot.lipHits,
      lipHitCount: fresh ? snapshot.lipHitCount : 0,
      strokeHits: snapshot.strokeHits,
      strokeHitCount: fresh ? snapshot.strokeHitCount : 0,
      significantHeight: this.physicalMode.config?.significantHeight ?? 0,
      windSpeed: this.physicalMode.config?.windSpeed ?? 0,
      ...(board ? { board } : {}),
      ...(ride && previousPhase ? { ride: { phase: ride.phase, previousPhase, speed: ride.boardSpeed } } : {}),
    };
  }

  /** The camera, as the sound's listener. */
  get listenerPose(): ListenerPose {
    const { camera } = this.physicalMode.camera;
    const forward = camera.getWorldDirection(this.listenerForward);
    return { x: camera.position.x, y: camera.position.y, z: camera.position.z, forward: { x: forward.x, y: forward.y, z: forward.z } };
  }

  /** The camera view now in use, for the pause menu. */
  get viewName(): string {
    return this.physicalMode.camera.view;
  }

  /** Whether the menu's waves are running, not held as a still frame. */
  get backdropRunning(): boolean {
    return this.physicalMode.ready && !this.frozen && this.freezeIn === undefined;
  }

  /** C, or the pause menu's Camera: cycle the physical mode's camera. */
  cycleView = (): void => {
    this.physicalMode.nextView();
    this.focusGame();
  };

  private frame = (timestamp: number): void => {
    // Under a frame limit, skipped frames leave the clock alone, so the next one steps the time they covered.
    if (!frameDue(timestamp, this.lastRender, this.graphics?.frameInterval ?? 0)) {
      requestAnimationFrame(this.frame);
      return;
    }
    this.lastRender = timestamp;
    controls.poll();
    this.labInput.poll();
    const rawElapsed = this.previousFrame === 0 ? 0 : (timestamp - this.previousFrame) / 1000;
    this.onFrame?.(rawElapsed * 1000, this.physicalMode.host?.snapshot.status);
    // Behind the loading card, the sea being replaced neither steps nor draws: the GPU is the new one's to spin up on.
    if (this.covered) {
      this.previousFrame = timestamp;
      requestAnimationFrame(this.frame);
      return;
    }
    // Online the sea never pauses: the menu only takes the controls (spec N1).
    if (this.paused && !this.online) {
      this.pausedRender(timestamp);
      requestAnimationFrame(this.frame);
      return;
    }
    const elapsed = Math.min(rawElapsed, 0.1);
    this.previousFrame = timestamp;
    const simElapsed = simulatedSeconds(elapsed, this.timeScale);
    if (this.freezeIn !== undefined) {
      this.freezeIn -= elapsed;
      if (this.freezeIn <= 0) {
        this.freezeIn = undefined;
        this.frozen = true;
      }
    }
    if (!this.frozen) this.physicalFrame(elapsed, simElapsed);
    else if (this.needsRender) this.physicalRender(0);
    this.needsRender = false;
    requestAnimationFrame(this.frame);
  };

  /** One frame of the physical surf zone: fixed solver steps with the player's (or `?demo`'s autopilot's) input, then render. */
  private physicalFrame(elapsed: number, simElapsed: number): void {
    if (this.online) {
      this.onlineFrame(elapsed);
      return;
    }
    if (this.waveLab.active) {
      this.labFrame(elapsed);
      return;
    }
    this.accumulator = Math.min(this.accumulator + simElapsed, this.fixedStep * 4);
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 3) {
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    if (this.demoPilot) {
      this.demoFrame(this.demoPilot, steps, elapsed);
      this.physicalRender(simElapsed);
      return;
    }
    // The arrows steer toward the screen's left or right, whichever way the camera faces. Standing, the same
    // keys trim, crouch and reach for the water (P9); their ramps run on simulated time, like the physics.
    const standing = this.physicalMode.host?.snapshot.status.ride?.phase === 'standing';
    const request = controls.rideRequest(simElapsed, standing);
    const pocketReflex = this.schoolActive ? schoolPocketReflex(this.pocketReflex, this.schoolFreePractice)
      : showsPocketReflex(this.pocketReflex, this.surfSwell);
    this.physicalMode.advance(steps, { ...request, steer: this.physicalMode.screenSteer(request.steer), pocketReflex });
    if (request.popUp) controls.consumeGetUp();
    this.physicalRender(simElapsed);
  }

  /** The Wave Lab's frame (spec L1): the camera flies, and the sea steps on the lab's clock (paused, slowed or stepped). */
  private labFrame(elapsed: number): void {
    const sim = this.waveLab.frame(this.physicalMode, elapsed, this.labInput.read(elapsed));
    this.accumulator = Math.min(this.accumulator + sim, this.fixedStep * 4);
    let steps = 0;
    while (this.accumulator >= this.fixedStep - 1e-9 && steps < 3) {
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    this.physicalMode.advance(steps);
    this.physicalRender(sim);
  }

  /** The lab as the app drives it: a sea with no rider, rebuilt on Apply, lit and looked as asked. */
  private labHost(): LabHost {
    // The physical mode is read when used: this runs while the game is still being built.
    const { waveLab } = this;
    const mode = () => this.physicalMode;
    return {
      onAction: undefined,
      input: this.labInput,
      clock: waveLab.clock,
      get following() {
        return waveLab.following;
      },
      get readout() {
        return mode().readout();
      },
      enter: (settings) => this.enterLab(settings),
      apply: async (settings, newSea) => {
        if (newSea) this.seed = (this.seed % 9999) + 1;
        const { fly, clock } = waveLab;
        const kept = { position: fly.position.clone(), yaw: fly.yaw, pitch: fly.pitch, paused: clock.paused, scale: clock.scale };
        if (!(await this.enterLab(settings))) return false;
        // A rebuilt sea keeps the camera where it was, and the clock as it was.
        if (mode().camera.view === 'free') {
          fly.position.copy(kept.position);
          fly.yaw = kept.yaw;
          fly.pitch = kept.pitch;
          fly.applyTo(mode().camera.camera);
        }
        clock.paused = kept.paused;
        clock.scale = kept.scale;
        return true;
      },
      setLight: (sun) => {
        if (sun.sunHeight !== this.shownSun.height || sun.sunDirection !== this.shownSun.direction) void this.applySun(sun);
      },
      setWaterLook: (look) => this.applyWaterLook(look),
      leave: () => this.leaveLab(),
      toggleFollow: () => waveLab.toggleFollow(mode()),
      jump: (point) => waveLab.jump(mode(), point),
      info: (units) => waveLab.info(mode(), units),
    };
  }

  /** The lab's sea (spec L1): no rider; solver and compute as the graphics settings say, unless a developer chose them. */
  private async enterLab(settings: WaveLabSettings): Promise<boolean> {
    this.leaveOnline();
    const graphics = { stage: this.graphics?.stage ?? 2, compute: this.graphics?.compute ?? 'auto' } as const;
    const physical = { ...settings.physical, ...labWater(settings, graphics, DEV_TOOLS) };
    if (!(await this.startPhysical(this.seed, physical, { sun: settings, rider: false, lab: true }))) return false;
    this.waveLab.begin(this.physicalMode);
    this.applyWaterLook(settings.waterLook);
    return true;
  }

  /** The school as the app drives it: lesson seas from their recordings, restarts on the same wave, slow motion and the attempt's frames. */
  private schoolHost(): SchoolHost {
    const game = this;
    return {
      enter: (start, camera, freePractice) => {
        this.schoolFreePractice = freePractice;
        return this.enterSchool(start, camera);
      },
      restart: async (start) => {
        const host = this.physicalMode.host;
        if (!host || !this.schoolActive) return;
        this.placeRider(await this.schoolSession.restart(host, start));
        this.schoolSeaTime = Number.NaN;
      },
      setSlowMotion: (on) => {
        this.schoolSlow = on;
      },
      setView: (view) => this.physicalMode.setRideView(view),
      get slowMotion() {
        return game.schoolSlow;
      },
      frame: () => this.schoolFrame(),
      get provisional() {
        return game.schoolSession.wave?.provisional ?? true;
      },
      leave: () => this.leaveSchool(),
    };
  }

  /** A lesson's sea (spec L2): the stage 2 recording whatever the graphics run, no spin-up, the rider placed for `start`. */
  private async enterSchool(start: Parameters<SchoolHost['enter']>[0], camera: RideView): Promise<boolean> {
    this.leaveOnline();
    const { wave, sea } = await this.schoolSession.prepare(start);
    // The Fast water's CPU-only compute does not apply: stage 2 takes the GPU wherever there is one.
    const settings: PhysicalSettings = {
      ...DEFAULT_PHYSICAL_SETTINGS, spot: wave.config.spot, stage: wave.stage, compute: 'auto', source: 'practice', tide: wave.config.tide, windSpeed: wave.config.windSpeed,
    };
    this.physicalMode.idleView = 'overview';
    this.physicalMode.defaultView = camera;
    const started = await this.startPhysical(wave.config.seed, settings, {
      sun: TIMES.midday, rider: true, factory: recordedSurfZoneFactory(sea), overrides: lessonConfig(wave), school: true,
    });
    if (!started) return false;
    this.placeRider(wave.placements[start]);
    this.schoolSeaTime = Number.NaN;
    return true;
  }

  /** Put the rider in place now, one step on, so it shows placed behind the lesson's card. */
  private placeRider(placement: RiderPlacement): void {
    this.physicalMode.place(placement);
    this.physicalMode.advance(1);
  }

  /** This frame of the attempt: the ride's status, the player's input, and the sea time since the last frame. */
  private schoolFrame(): FlowFrame | undefined {
    const host = this.physicalMode.host;
    const ride = host?.snapshot.status.ride;
    if (!host || !ride || !this.schoolActive) return undefined;
    const { seaTime } = host.snapshot.status;
    const dt = Number.isFinite(this.schoolSeaTime) ? Math.max(0, seaTime - this.schoolSeaTime) : 0;
    this.schoolSeaTime = seaTime;
    const request = controls.lastRequest;
    return {
      dt, phase: ride.phase, speed: ride.speed, heading: host.snapshot.rider[RIDER_SNAPSHOT.heading],
      input: { steer: request.steer, trim: request.trim ?? 0, crouch: request.crouch ?? 0, hand: request.hand ?? false, paddle: request.paddle },
      wave: { valid: ride.wave.valid, faceFraction: ride.wave.faceFraction, crestBreaking: ride.wave.crestBreaking, aheadOfCrest: ride.wave.aheadOfCrest },
      ...(ride.live ? { live: { kind: ride.live.kind, start: ride.live.start } } : {}),
      ...(ride.separation ? { separation: ride.separation } : {}),
      ...(ride.report ? { report: { id: ride.report.id, end: ride.report.end } } : {}),
    };
  }

  /** Out of the school: slow motion off. */
  private leaveSchool(): void {
    this.schoolActive = false;
    this.schoolSlow = false;
    this.schoolSeaTime = Number.NaN;
  }

  /** Out of the lab: its camera and clock let go, and the water back in the graphics settings' look. */
  private leaveLab(): void {
    if (!this.waveLab.active) return;
    this.waveLab.active = false;
    this.labInput.enabled = false;
    this.waveLab.end(this.physicalMode);
    this.applyWaterLook(this.graphics?.waterLook ?? 'rich');
  }

  /** `?demo`: the autopilot rides (its steer is already the board's), and paddles out again 2 s after each ride. */
  private demoFrame(pilot: Autopilot, steps: number, elapsed: number): void {
    const host = this.physicalMode.host;
    const view = host && autopilotView(host, this.physicalMode.focus.z, this.physicalSettings.tide);
    this.physicalMode.advance(steps, view ? pilot.next(view, steps * SURF_ZONE_STEP) : undefined);
    this.demoDone = pilot.state === 'done' ? this.demoDone + elapsed : 0;
    if (this.demoDone > 2) {
      this.demoDone = 0;
      pilot.reset();
      this.physicalMode.retry();
    }
  }

  /**
   * One online frame (spec N1): the sea follows the room's clock, the player's input
   * reaches the rider unless a menu is open, and a sea that fell behind is rebuilt.
   */
  private onlineFrame(elapsed: number): void {
    const online = this.online!;
    const standing = this.physicalMode.host?.snapshot.status.ride?.phase === 'standing';
    const request = this.paused ? undefined : controls.rideRequest(elapsed, standing);
    const input = request && { ...request, steer: this.physicalMode.screenSteer(request.steer) };
    const { resync } = online.play.step(this.physicalMode, elapsed, input);
    if (request?.popUp) controls.consumeGetUp();
    if (resync && !online.rebuilding) {
      online.rebuilding = true;
      void this.startOnline(online.controller, this.physicalMode.defaultView).then((started) => {
        if (!started && this.online === online) online.rebuilding = false;
      });
    }
    this.physicalRender(elapsed);
  }

  /** The other surfers on this water, a little in the past, with their name tags and calls (spec N1). */
  private drawOnline(): void {
    const { online } = this;
    const host = this.physicalMode.host;
    if (!online || !host) return;
    const { controller, views, tags, state, anchors } = online;
    controller.prune();
    const others = controller.players().filter((player) => player.id !== controller.you);
    views.sync(others);
    const camera = this.physicalMode.camera.camera;
    const seaTime = host.snapshot.status.seaTime - INTERPOLATION_DELAY;
    const surface = (x: number, z: number) => host.heightAt(x, z);
    const entries: TagEntry[] = [];
    const anchor = () => {
      anchors[entries.length] ??= new Vector3();
      return anchors[entries.length];
    };
    for (const player of others) {
      const drawn = controller.remote.sample(player.id, seaTime, state);
      views.update(player.id, drawn ? state : undefined, surface, camera.position);
      const world = anchor();
      if (!views.tagAnchor(player.id, world)) continue;
      const call = controller.calls.get(player.id);
      entries.push({ id: player.id, name: player.name, world, ...(call ? { call: t(`online.call.${call.call}`) } : {}) });
    }
    // The player's own call, over their own head.
    const own = controller.you === undefined ? undefined : controller.calls.get(controller.you);
    const rider = host.snapshot.rider;
    if (own && rider[RIDER_SNAPSHOT.present] > 0) {
      const head = RIDER_SNAPSHOT.points + 2 * 3;
      const world = anchor().set(rider[head], rider[head + 1] + 0.45, rider[head + 2]);
      entries.push({ id: controller.you!, name: '', world, call: t(`online.call.${own.call}`) });
    }
    const canvas = this.renderer.domElement;
    tags.update(entries, camera, canvas.clientWidth, canvas.clientHeight, this.showNameTags);
  }

  /**
   * Draw the physical surf zone as it now stands.
   * `camera` overrides the physical mode's own for this frame (the `?record` tool's shots).
   */
  private physicalRender(simElapsed: number, camera?: PerspectiveCamera): void {
    this.physicalMode.update(simElapsed || this.fixedStep);
    this.drawOnline();
    this.setUnderwater(this.physicalMode.cameraBelowSurface());
    this.drawPhysical(camera ?? this.physicalMode.camera.camera);
  }

  /**
   * A paused frame offline: nothing steps, the camera included (a new view still
   * cuts to it), and the page keeps showing the last frame, so the scene is drawn
   * again only when the view moves or something changed (a resize, a setting).
   */
  private pausedRender(now: number): void {
    this.physicalMode.update(0);
    const view = this.physicalMode.camera.camera;
    if (!this.stillFrame.needsDraw(view, now, this.needsRender)) return;
    this.needsRender = false;
    this.setUnderwater(this.physicalMode.cameraBelowSurface());
    this.drawPhysical(view);
    this.stillFrame.drawn(view, now);
  }

  /** The water, sea and shadows around `view`, drawn from it (the physical camera, or a water sheet shot). */
  private drawPhysical(view: PerspectiveCamera): void {
    this.water.update();
    // Caustics where the view looks: a window a third of its width ahead of the camera.
    const ahead = view.getWorldDirection(this.causticAhead).setY(0);
    if (ahead.lengthSq() > 1e-6) ahead.normalize();
    // The WebGPU tier shades with the FFT chop; the others keep the procedural waves.
    const host = this.physicalMode.host;
    if (host?.snapshot.status.compute === 'gpu' && this.graphics?.richSea !== false) {
      this.fftChop.setWind(this.physicalSettings.windSpeed);
      this.fftChop.render(this.renderer, host.snapshot.status.seaTime);
    } else {
      this.fftChop.disable();
    }
    if (this.graphics?.caustics === false) this.caustics.disable();
    else this.caustics.render(this.renderer, view.position.x + (ahead.x * CAUSTIC_WINDOW) / 3, view.position.z + (ahead.z * CAUSTIC_WINDOW) / 3);
    const { board } = this.physicalMode;
    const nose = this.shadowNose.set(0, 0, 1).applyQuaternion(board.quaternion);
    this.shadows.follow(board.position, this.currentSunDirection(), board.position.y - 0.04, Math.atan2(nose.x, nose.z));
    this.renderer.render(this.scene, view);
  }

  /** The water look (G8) on every water drawing: the tank, the far ocean and the spray. */
  private applyWaterLook(look: WaterLook): void {
    this.water.setLook(look);
    this.physicalMode.farField.setLook(look);
    this.physicalMode.spray.setLook(look);
    this.physicalMode.lipSheet.setLook(look);
  }

  /**
   * The painted sky follows the sun controls at once; the photographed sky
   * whose sun is nearest in height replaces it when loaded, turned to the
   * chosen direction, and then lights the scene on its own.
   */
  private applySun(settings: { sunHeight: number; sunDirection: number }): Promise<void> {
    this.shownSun = { height: settings.sunHeight, direction: settings.sunDirection };
    this.environment.setSunPosition(settings.sunHeight, settings.sunDirection);
    if (!this.photoSky.ready) {
      this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45);
      this.sunlight.intensity = 1.2 + 0.6 * settings.sunHeight;
      this.refreshSun();
      this.refreshReflection();
    }
    return this.photoSky.select(sunElevationFromSlider(settings.sunHeight), settings.sunDirection)
      .then(() => this.usePhotoSky())
      .catch((error) => console.warn('Photographed sky unavailable; keeping the painted sky.', error));
  }

  private usePhotoSky(): void {
    this.environment.showSky(false);
    this.sunlight.color.copy(this.photoSky.sunColor);
    this.sunlight.intensity = this.photoSky.sunIntensity;
    this.sunlight.position.copy(this.photoSky.sunDirection).multiplyScalar(45);
    // The environment lights the shade now.
    this.ambient.intensity = 0;
    this.fill.intensity = 0;
    this.reflectionMapTarget?.dispose();
    this.reflectionMapTarget = undefined;
    this.photoSky.applyTo(this.scene, [this.water.mesh.material, this.physicalMode.farField.mesh.material, this.physicalMode.lipSheet.richMaterial]);
    if (!this.isBelowSurface) this.scene.background = this.photoSky.background ?? this.skyColor;
    this.refreshSun();
  }

  /** Toward the sun: the photographed sky's once loaded, else the painted one's. */
  private currentSunDirection(): Vector3 {
    return this.photoSky.ready ? this.shadowSun.copy(this.photoSky.sunDirection) : this.shadowSun.copy(this.environment.sunPosition).normalize();
  }

  /** Both water meshes light their crests and bodies from the scene's sun. */
  private refreshSun(): void {
    const direction = this.photoSky.ready ? this.photoSky.sunDirection.clone() : this.environment.sunPosition.clone().normalize();
    const radiance = this.sunlight.color.clone().multiplyScalar(this.sunlight.intensity);
    this.water.setSun(direction, radiance);
    this.physicalMode.farField.setSun(direction, radiance);
    this.physicalMode.spray.setSun(direction, radiance);
    this.physicalMode.lipSheet.setSun(direction, radiance);
  }

  private refreshReflection(): void {
    if (this.photoSky.ready) return;
    const previousEnvironmentVisibility = this.environment.group.visible;
    const previousFog = this.scene.fog;
    const previousBackground = this.scene.background;
    this.environment.group.visible = true;
    this.scene.fog = null;
    this.scene.background = this.skyColor;
    const previousScale = this.environment.group.scale.x;
    const previousPosition = this.environment.group.position.clone();
    this.environment.group.scale.setScalar(1);
    this.environment.group.position.set(0, 0, 0);
    const hidden = [this.water.mesh, this.physicalMode.seabed.mesh, this.physicalMode.farField.mesh,
      this.physicalMode.lipSheet.mesh, this.physicalMode.bubbles.mesh, this.physicalMode.spray.mesh, this.environment.sunMesh];
    const visibility = hidden.map((object) => object.visible);
    hidden.forEach((object) => { object.visible = false; });
    const capture = new WebGLCubeRenderTarget(128);
    const camera = new CubeCamera(0.1, 180, capture);
    camera.position.set(0, 0.6, 0);
    camera.update(this.renderer, this.scene);
    const pmrem = new PMREMGenerator(this.renderer);
    const nextMap = pmrem.fromCubemap(capture.texture);
    for (const material of [this.water.mesh.material, this.physicalMode.farField.mesh.material]) {
      material.envMap = nextMap.texture;
      material.needsUpdate = true;
    }
    this.reflectionMapTarget?.dispose();
    this.reflectionMapTarget = nextMap;
    capture.dispose();
    pmrem.dispose();
    hidden.forEach((object, index) => { object.visible = visibility[index]; });
    this.environment.group.visible = previousEnvironmentVisibility;
    this.environment.group.scale.setScalar(previousScale);
    this.environment.group.position.copy(previousPosition);
    this.scene.fog = previousFog;
    this.scene.background = previousBackground;
  }

  private setUnderwater(below: boolean): void {
    this.isBelowSurface = below;
    if (this.environment.group.visible === below) {
      this.scene.fog = below ? this.underwaterFog : null;
      this.scene.background = below ? this.underwaterColor : (this.photoSky.background ?? this.skyColor);
      this.environment.group.visible = !below;
    }
  }

  private focusGame(): void {
    this.renderer.domElement.focus({ preventScroll: true });
  }

  private pixelRatio(): number {
    return this.graphics?.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 1.75);
  }

  private resize(): void {
    this.needsRender = true;
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.physicalMode.camera.resize(window.innerWidth / Math.max(1, window.innerHeight));
  }
}

const game = new SurfGame();
if (recordRequested) void import('./dev/rideRecorder').then(({ recordRide }) => recordRide(game.recording));
if (waterSheetRequested) void import('./dev/waterSheet').then(({ renderWaterSheet }) => renderWaterSheet(game.recording));
const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = new SettingsStore(availableStorage(), defaultSettings(reducedMotion));
const applyGraphics = () => game.applyGraphics(resolveGraphics(settings.value.graphics, settings.value.detected, window.devicePixelRatio));
applyGraphics();
game.setSurfer(settings.value.surfer);
game.setNameTags(settings.value.gameplay.nameTags);
game.setPocketReflex(settings.value.gameplay.pocketReflex);
settings.subscribe((value, change) => {
  if (change === 'graphics' || change === 'detected') applyGraphics();
  if (change === 'surfer') game.setSurfer(value.surfer);
  if (change === 'gameplay') {
    game.setNameTags(value.gameplay.nameTags);
    game.setPocketReflex(value.gameplay.pocketReflex);
  }
});
// C1: the 2026 Steam Controller over WebHID, offered to every pad reader as one more standard pad.
const steamController = new SteamControllerDriver();
addPadSource(() => steamController.pads());
void steamController.start();
const controls = new Controls(() => settings.value.controls.bindings, {
  retry: () => app.retry(),
  camera: () => game.cycleView(),
  pause: () => app.pause(),
  mute: () => app.toggleMute(),
  call: (call) => app.call(call),
}, { stick: () => settings.value.controls });
const app = new App(game, controls, settings, { start: recordRequested || waterSheetRequested ? 'stage' : startRide ? 'ride' : 'menu', steam: steamController });
game.onFrame = (intervalMs, status) => app.frame(intervalMs, status);
