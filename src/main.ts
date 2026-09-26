import {
  AmbientLight,
  BoxGeometry,
  Color,
  CubeCamera,
  DirectionalLight,
  FogExp2,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  MeshStandardMaterial,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
  Vector3,
} from 'three';
import { Controls } from './game/Controls';
import { frameDue } from './game/frameLimit';
import { resolveGraphics, type ResolvedGraphics } from './game/Graphics';
import { SettingsStore, defaultSettings } from './game/Settings';
import { devFlag, devParam } from './devTools';
import { RunHistory, type RunReport } from './game/RunHistory';
import { simulatedSeconds } from './game/timeScale';
import { DEFAULT_PHYSICAL_SETTINGS, PRACTICE_SWELL, PhysicalMode, localSurfZone, spreadingFor, swellFor, webGpuAvailable, type PhysicalSettings, type SurfZoneHostFactory } from './game/PhysicalMode';
import { WorkerSurfZone } from './game/WorkerSurfZone';
import { BoardPhysics, type BoardDiagnostics, type PhysicsSettings } from './physics/BoardPhysics';
import { CameraRig } from './scene/CameraRig';
import { BoardWake } from './scene/BoardWake';
import { BreakSpray } from './scene/BreakSpray';
import { Environment } from './scene/Environment';
import { Surfer } from './scene/Surfer';
import { Seabed } from './scene/Seabed';
import { PlungingSheetMesh } from './scene/PlungingSheetMesh';
import { WaterSurface } from './scene/WaterSurface';
import { CAUSTIC_WINDOW, CausticMap } from './scene/CausticMap';
import { FftChop } from './scene/FftChop';
import { LegacySurfaceSource } from './scene/LegacySurfaceSource';
import { DEFAULT_WATER_CHOP } from './scene/waterChop';
import { SPOT_OPTICS } from './scene/waterOptics';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField, type WaveSettings } from './wave/WaveModel';
import { PlungingSheet } from './wave/PlungingSheet';
import { Hud } from './ui/Hud';
import { PhysicsReadoutPanel } from './ui/PhysicsReadoutPanel';
import { describeSwell, formatSwellReadout } from './wave/SwellReadout';
import type { SpotName } from './wave/Bathymetry';
import './style.css';

interface TuningSettings extends WaveSettings, PhysicsSettings { sunHeight: number; sunDirection: number; timeScale: number }

const DEFAULT_SETTINGS: TuningSettings = {
  ...DEFAULT_WAVE_SETTINGS,
  sustained: true,
  paddleForce: 14,
  boardResponse: 1,
  sunHeight: 0.35,
  sunDirection: -25,
  timeScale: 1,
};
type Spot = 'training' | 'point' | 'reef' | 'custom';
const SPOT_SETTINGS: Record<Exclude<Spot, 'custom'>, TuningSettings> = {
  training: DEFAULT_SETTINGS,
  point: { ...DEFAULT_SETTINGS, height: 1.8, period: 9, speed: 3.3, shelfStrength: 0.25, currentX: -0.2, sunHeight: 0.2, sunDirection: 20 },
  reef: { ...DEFAULT_SETTINGS, height: 2.2, period: 6.5, speed: 4, shelfStrength: 0.65, currentX: 0.5, windX: 0.05, sunHeight: 0.6, sunDirection: -45 },
};
/** Water optics for the legacy spots, borrowed from the physical spot each one resembles. */
const LEGACY_OPTICS: Record<Spot, SpotName> = { training: 'beach', point: 'point', reef: 'reef', custom: 'beach' };
const SPOT_NAMES: Record<Spot, string> = {
  training: 'PACIFIC TRAINING BREAK', point: 'GLASSY POINT', reef: 'WINDY REEF', custom: 'CUSTOM BREAK',
};
const demoMode = devParam('demo');
type WaterModel = 'legacy' | 'physical';
/** `?physical` opens the view-only physical surf zone (plan P2c, option a). */
const physicalRequested = devFlag('physical');
/** `?record`: a dev tool films an autopilot ride frame by frame (src/dev/rideRecorder.ts); the page's own clock stays off. */
const recordRequested = devFlag('record');
/**
 * The surf zone runs in a Web Worker (plan §3.2, P4a); `?inpage`, or a browser
 * without workers, runs it on the main thread instead.
 */
const createSurfZone: SurfZoneHostFactory = typeof Worker === 'undefined' || devFlag('inpage')
  ? localSurfZone : (config) => new WorkerSurfZone(config, undefined, { rider: true });
/** Only the worker steps on the GPU (plan P6), so only it gets the GPU tier's sea. */
const gpuTier = createSurfZone === localSurfZone ? undefined : webGpuAvailable;

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
  private readonly cameraRig = new CameraRig();
  private readonly surfer = new Surfer();
  private readonly boardWake = new BoardWake();
  private readonly breakSpray = new BreakSpray();
  private readonly environment = new Environment();
  private readonly seabed = new Seabed();
  private readonly sheetMesh: PlungingSheetMesh;
  private readonly sunlight: DirectionalLight;
  private reflectionMapTarget?: WebGLRenderTarget;
  private readonly hud = new Hud();
  private readonly readoutPanel = new PhysicsReadoutPanel(getElement<HTMLElement>('#physics-readout'));
  private readonly runHistory = new RunHistory(availableStorage());
  private readonly crestMarker: Mesh;
  private readonly contactMarkers: Mesh[] = [];
  private readonly water: WaterSurface;
  /** Caustics refracted through the physical surface onto its seabed (G5). */
  private readonly caustics: CausticMap;
  /** The WebGPU tier's FFT wind sea for the water's shading (plan P6). */
  private readonly fftChop = new FftChop();
  private readonly causticAhead = new Vector3();
  private wave: InteractiveWaterField;
  private plungingSheet: PlungingSheet;
  private physics: BoardPhysics;
  private seed = 1;
  private activeSettings = { ...DEFAULT_SETTINGS };
  private draftSettings = { ...DEFAULT_SETTINGS };
  private activeSpot: Spot = 'training';
  private draftSpot: Spot = 'training';
  private lastDiagnostics: BoardDiagnostics;
  private accumulator = 0;
  private previousFrame = 0;
  private fpsFrames = 0;
  private fpsSeconds = 0;
  private fps = 0;
  private lastPaddle = false;
  private recordedTerminal = false;
  private runMeasurements = {
    peakSpeed: 0, peakBreaking: 0, peakLipImpact: 0, peakFlow: 0, lowestBalance: 1,
    popUpAt: null as number | null, ridingAt: null as number | null,
  };
  private readonly fixedStep = 1 / 60;
  private isBelowSurface = false;
  private readonly underwaterFog = new FogExp2('#367e83', 0.035);
  private readonly underwaterColor = new Color('#367e83');
  private readonly skyColor = new Color('#b8e3e5');
  private readonly physicalMode: PhysicalMode;
  /** The mode being simulated; the physical mode only takes over once its surf zone is ready. */
  private mode: WaterModel = 'legacy';
  private draftMode: WaterModel = physicalRequested ? 'physical' : 'legacy';
  private physicalSettings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS };
  private draftPhysical: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS };
  private readoutClock = 0;
  /** The graphics settings in force (plan P8); until applied, today's defaults. */
  private graphics?: ResolvedGraphics;
  private lastRender = 0;

  constructor() {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = 'srgb';
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', 'Surf game canvas. Click here to use keyboard controls.');
    getElement('#scene').append(this.renderer.domElement);

    this.scene.background = new Color('#b8e3e5');
    this.scene.add(this.environment.group);
    this.scene.add(new AmbientLight('#d8d9cd', 1.5));
    this.sunlight = new DirectionalLight('#ffe7bd', 1.2 + 0.6 * this.activeSettings.sunHeight);
    this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45);
    this.scene.add(this.sunlight);
    const fill = new DirectionalLight('#76c6d3', 0.8);
    fill.position.set(8, 4, -10);
    this.scene.add(fill);

    this.wave = new InteractiveWaterField(this.seed, this.activeSettings);
    this.plungingSheet = new PlungingSheet(this.wave);
    this.sheetMesh = new PlungingSheetMesh(this.plungingSheet);
    this.water = new WaterSurface(new LegacySurfaceSource(this.wave));
    this.water.mesh.material.envMapIntensity = 0.28;
    this.scene.add(this.water.mesh, this.sheetMesh.mesh);
    this.scene.add(this.seabed.mesh);
    this.physicalMode = new PhysicalMode(this.scene);
    this.physicalMode.farField.mesh.material.envMapIntensity = 0.28;
    this.caustics = new CausticMap(this.water.causticSource, this.water.causticUniforms);
    this.physicalMode.seabed.useCaustics(this.water.causticUniforms, this.water.causticSource as never);
    this.physics = this.createPhysics(this.wave, this.activeSettings, this.plungingSheet);
    this.lastDiagnostics = this.physics.diagnostics();
    this.scene.add(this.surfer.group);
    this.scene.add(this.boardWake.trail, this.boardWake.spray, this.breakSpray.points);

    const markerMaterial = new MeshStandardMaterial({ color: '#f9a273', emissive: '#a34b2d', emissiveIntensity: 0.22, roughness: 0.5 });
    this.crestMarker = new Mesh(new BoxGeometry(9, 0.025, 0.055), markerMaterial);
    this.crestMarker.visible = false;
    this.scene.add(this.crestMarker);
    const contactMaterial = new MeshBasicMaterial({ color: '#ffd091', depthTest: false, depthWrite: false, transparent: true, opacity: 0.96 });
    const contactGeometry = new SphereGeometry(0.075, 10, 8);
    for (let index = 0; index < 4; index += 1) {
      const marker = new Mesh(contactGeometry, contactMaterial);
      marker.visible = false;
      marker.renderOrder = 10;
      this.contactMarkers.push(marker);
      this.scene.add(marker);
    }

    this.refreshSun();
    this.refreshReflection();

    this.bindUi();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (physicalRequested) this.showLoadingThen(() => this.startPhysical(this.seed, this.physicalSettings));
    else getElement<HTMLElement>('#loading').classList.add('is-hidden');
    if (!recordRequested) requestAnimationFrame(this.frame);
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
      render: (seconds: number) => this.physicalRender(seconds, seconds),
      resize: (width: number, height: number) => {
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(width, height, false);
        this.physicalMode.camera.resize(width / height);
      },
      mode: this.physicalMode,
      canvas: this.renderer.domElement,
    };
  }

  /** Apply the graphics settings (plan P8): resolution, frame limit, and what is drawn; water changes wait for the next wave. */
  applyGraphics(resolved: ResolvedGraphics): void {
    this.graphics = resolved;
    this.resize();
    if (!resolved.caustics) this.caustics.disable();
    this.physicalMode.setSprayVisible(resolved.sprayMist);
    this.breakSpray.points.visible = resolved.sprayMist && this.mode === 'legacy';
    this.physicalMode.farField.setViewDistance(resolved.oceanView);
    this.water.setFoamDetail(resolved.detailedFoam);
  }

  /** R: in the physical mode, paddle out again from the lineup while the waves carry on; otherwise replay. */
  quickRetry = (): void => {
    if (this.mode === 'physical') {
      this.physicalMode.retry();
      return;
    }
    this.replay();
  };

  replay = (): void => {
    if (this.mode === 'physical') {
      this.showLoadingThen(() => this.startPhysical(this.seed, this.physicalSettings));
      return;
    }
    this.startRun(this.seed, this.activeSettings, this.activeSpot);
    this.focusGame();
  };

  private createPhysics(wave: InteractiveWaterField, settings: TuningSettings, sheet: PlungingSheet): BoardPhysics {
    return new BoardPhysics(wave, {
      paddleForce: settings.paddleForce,
      boardResponse: settings.boardResponse,
    }, sheet);
  }

  private startRun(seed: number, settings: TuningSettings, spot: Spot = this.activeSpot): void {
    const sunChanged = settings.sunHeight !== this.activeSettings.sunHeight
      || settings.sunDirection !== this.activeSettings.sunDirection;
    const spotChanged = spot !== this.activeSpot || this.mode !== 'legacy';
    this.physicalMode.cancel();
    this.leavePhysical();
    this.seed = seed;
    this.activeSettings = { ...settings };
    this.draftSettings = { ...settings };
    this.activeSpot = spot;
    this.draftSpot = spot;
    getElement<HTMLElement>('#spot-name').textContent = SPOT_NAMES[spot];
    this.wave = new InteractiveWaterField(this.seed, this.activeSettings);
    this.plungingSheet = new PlungingSheet(this.wave);
    this.water.setSource(new LegacySurfaceSource(this.wave));
    this.water.setChop(DEFAULT_WATER_CHOP);
    this.water.setOptics(SPOT_OPTICS[LEGACY_OPTICS[spot]]);
    this.physics = this.createPhysics(this.wave, this.activeSettings, this.plungingSheet);
    this.sheetMesh.update(this.plungingSheet);
    this.environment.group.position.z = 0;
    if (sunChanged || spotChanged) {
      this.environment.setSunPosition(settings.sunHeight, settings.sunDirection);
      this.environment.setSpot(spot);
      this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45);
      this.sunlight.intensity = 1.2 + 0.6 * settings.sunHeight;
      this.refreshSun();
      this.refreshReflection();
    }
    this.boardWake.reset();
    this.surfer.resetPose();
    this.lastPaddle = false;
    this.recordedTerminal = false;
    this.runMeasurements = {
      peakSpeed: 0, peakBreaking: 0, peakLipImpact: 0, peakFlow: 0, lowestBalance: 1,
      popUpAt: null, ridingAt: null,
    };
    this.lastDiagnostics = this.physics.diagnostics();
    this.accumulator = 0;
    this.refreshTuningUi();
    this.renderHistory();
    this.renderPhysicsReadout();
    this.updateHud();
  }

  private newWave(): void {
    this.seed = (this.seed + 1) >>> 0;
    if (this.seed === 0) this.seed = 1;
    this.applyDraft(this.seed);
  }

  /** Start whichever water model the Wave Lab has selected, with the drafted settings. */
  private applyDraft(seed: number): void {
    if (this.draftMode === 'physical') {
      const settings = this.readDraftPhysical();
      this.showLoadingThen(() => this.startPhysical(seed, settings));
      return;
    }
    this.startRun(seed, this.readDraftSettings(), this.draftSpot);
    this.focusGame();
  }

  private readDraftPhysical(): PhysicalSettings {
    const number = (id: string): number => Number.parseFloat(getElement<HTMLInputElement>(id).value);
    return {
      spot: getElement<HTMLSelectElement>('#physical-spot').value as SpotName,
      stage: getElement<HTMLSelectElement>('#physical-solver').value === '1' ? 1 : 2,
      compute: getElement<HTMLSelectElement>('#physical-compute').value === 'cpu' ? 'cpu' : 'auto',
      source: getElement<HTMLSelectElement>('#swell-source').value as PhysicalSettings['source'],
      significantHeight: number('#hs-slider'),
      peakPeriod: number('#tp-slider'),
      directionDegrees: number('#direction-slider'),
      spread: number('#spread-slider'),
      tide: number('#tide-slider'),
      windSpeed: number('#wind-speed-slider'),
      stormWindSpeed: number('#storm-wind-slider'),
      stormFetchKm: number('#storm-fetch-slider'),
      stormDurationHours: number('#storm-duration-slider'),
      stormDistanceKm: number('#storm-distance-slider'),
    };
  }

  /** Build the physical surf zone with its ridden board, and hide the legacy board, rider and HUD. */
  private async startPhysical(seed: number, settings: PhysicalSettings): Promise<void> {
    if (!(await this.physicalMode.start(settings, seed, this.water, {}, createSurfZone, this.graphics?.richSea === false ? undefined : gpuTier))) return;
    const shared = this.readDraftSettings();
    const sunChanged = shared.sunHeight !== this.activeSettings.sunHeight || shared.sunDirection !== this.activeSettings.sunDirection;
    this.activeSettings = { ...this.activeSettings, timeScale: shared.timeScale, sunHeight: shared.sunHeight, sunDirection: shared.sunDirection };
    this.draftSettings = { ...this.activeSettings };
    this.seed = seed;
    this.mode = 'physical';
    this.draftMode = 'physical';
    this.physicalSettings = { ...settings };
    this.draftPhysical = { ...settings };
    this.setLegacyVisible(false);
    this.physicalMode.setVisible(true);
    this.physicalMode.camera.setView(this.physicalMode.homeView);
    this.environment.showCoastline(false);
    this.environment.group.scale.setScalar(5);
    this.environment.group.position.set(this.physicalMode.focus.x, 0, this.physicalMode.focus.z);
    if (sunChanged) {
      this.environment.setSunPosition(shared.sunHeight, shared.sunDirection);
      this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45);
      this.sunlight.intensity = 1.2 + 0.6 * shared.sunHeight;
      this.refreshSun();
      this.refreshReflection();
    }
    getElement<HTMLElement>('#app').classList.add('is-physical');
    getElement<HTMLElement>('#spot-name').textContent = `${settings.spot.toUpperCase()} · PHYSICAL SURF ZONE`;
    getElement<HTMLElement>('#run-state').textContent = 'RIDE';
    getElement<HTMLElement>('#seed-label').textContent = `SEED ${seed.toString().padStart(4, '0')}`;
    this.accumulator = 0;
    this.syncViewButtons();
    this.refreshTuningUi();
    this.renderPhysicalReadout();
  }

  /** Return to the playable legacy wave; startRun installs its water source. */
  private leavePhysical(): void {
    if (this.mode !== 'physical') return;
    this.mode = 'legacy';
    this.draftMode = 'legacy';
    this.physicalMode.stop();
    this.physicalMode.setVisible(false);
    this.setLegacyVisible(true);
    this.environment.showCoastline(true);
    this.environment.group.scale.setScalar(1);
    this.environment.group.position.set(0, 0, 0);
    getElement<HTMLElement>('#app').classList.remove('is-physical');
    this.syncViewButtons();
  }

  private setLegacyVisible(visible: boolean): void {
    for (const object of [this.surfer.group, this.boardWake.trail, this.boardWake.spray, this.breakSpray.points, this.sheetMesh.mesh, this.seabed.mesh]) {
      object.visible = visible;
    }
    this.breakSpray.points.visible = visible && this.graphics?.sprayMist !== false;
    const markers = visible && this.cameraRig.profile;
    this.crestMarker.visible = markers;
    this.contactMarkers.forEach((marker) => { marker.visible = markers; });
  }

  /** Show a loading card, let it paint, then run a blocking build such as the surf-zone spin-up. */
  private showLoadingThen(action: () => void | Promise<void>): void {
    const loading = getElement<HTMLElement>('#loading');
    loading.classList.remove('is-hidden');
    requestAnimationFrame(() => setTimeout(async () => {
      await action();
      loading.classList.add('is-hidden');
      this.focusGame();
    }, 0));
  }

  private syncViewButtons(): void {
    const physical = this.mode === 'physical';
    const profile = physical ? this.physicalMode.camera.view === 'profile' : this.cameraRig.profile;
    const below = physical ? this.physicalMode.camera.view === 'below' : this.cameraRig.underwater;
    const diagnostic = getElement<HTMLButtonElement>('#diagnostic-toggle');
    diagnostic.setAttribute('aria-pressed', String(profile));
    diagnostic.classList.toggle('is-active', profile);
    const underwater = getElement<HTMLButtonElement>('#underwater-toggle');
    underwater.setAttribute('aria-pressed', String(below));
    underwater.classList.toggle('is-active', below);
    getElement<HTMLElement>('#app').classList.toggle('is-diagnostic', !physical && this.cameraRig.profile);
    getElement<HTMLElement>('#view-label').textContent = physical ? this.physicalMode.homeView.toUpperCase() : 'FRONT';
  }

  /** C, or the view button: cycle the physical mode's camera. */
  cycleView = (): void => {
    if (this.mode !== 'physical') return;
    this.physicalMode.nextView();
    this.syncViewButtons();
    this.focusGame();
  };

  private readDraftSettings(): TuningSettings {
    const number = (id: string): number => Number.parseFloat(getElement<HTMLInputElement>(id).value);
    return {
      sustained: true,
      height: number('#height-slider'),
      period: number('#period-slider'),
      speed: number('#wave-speed-slider'),
      shelfStrength: number('#shelf-slider'),
      paddleForce: number('#paddle-slider'),
      boardResponse: number('#response-slider'),
      currentX: number('#current-slider'),
      windX: number('#wind-slider'),
      sunHeight: number('#sun-slider'),
      sunDirection: number('#sun-direction-slider'),
      timeScale: number('#time-scale-slider'),
    };
  }

  private bindUi(): void {
    const sliders = [
      '#height-slider', '#period-slider', '#wave-speed-slider', '#shelf-slider', '#paddle-slider', '#response-slider',
      '#current-slider', '#wind-slider',
      '#sun-slider',
      '#sun-direction-slider',
      '#time-scale-slider',
    ];
    for (const selector of sliders) {
      getElement<HTMLInputElement>(selector).addEventListener('input', () => {
        this.draftSettings = this.readDraftSettings();
        this.draftSpot = 'custom';
        this.refreshTuningUi();
      });
    }
    const physicalInputs = ['#hs-slider', '#tp-slider', '#direction-slider', '#spread-slider', '#tide-slider', '#wind-speed-slider',
      '#storm-wind-slider', '#storm-fetch-slider', '#storm-duration-slider', '#storm-distance-slider'];
    for (const selector of [...physicalInputs, '#physical-spot', '#physical-solver', '#physical-compute', '#swell-source']) {
      getElement<HTMLInputElement>(selector).addEventListener(selector.startsWith('#physical-') || selector === '#swell-source' ? 'change' : 'input', () => {
        this.draftPhysical = this.readDraftPhysical();
        this.refreshTuningUi();
      });
    }
    getElement<HTMLSelectElement>('#model-select').addEventListener('change', (event) => {
      this.draftMode = (event.currentTarget as HTMLSelectElement).value as WaterModel;
      this.refreshTuningUi();
    });
    getElement<HTMLSelectElement>('#spot-select').addEventListener('change', (event) => {
      const selected = (event.currentTarget as HTMLSelectElement).value as Spot;
      this.draftSpot = selected;
      if (selected !== 'custom') this.draftSettings = { ...SPOT_SETTINGS[selected] };
      this.refreshTuningUi();
    });
    getElement<HTMLButtonElement>('#apply-button').addEventListener('click', () => this.applyDraft(this.seed));
    getElement<HTMLButtonElement>('#replay-button').addEventListener('click', this.replay);
    getElement<HTMLButtonElement>('#replay-action').addEventListener('click', this.replay);
    getElement<HTMLButtonElement>('#get-up-button').addEventListener('click', () => controls.requestGetUp());
    getElement<HTMLButtonElement>('#new-wave-button').addEventListener('click', () => this.newWave());
    getElement<HTMLButtonElement>('#diagnostic-toggle').addEventListener('click', (event) => {
      if (this.mode === 'physical') {
        this.physicalMode.camera.setView(this.physicalMode.camera.view === 'profile' ? this.physicalMode.homeView : 'profile');
        this.syncViewButtons();
        this.focusGame();
        return;
      }
      this.cameraRig.profile = !this.cameraRig.profile;
      const button = event.currentTarget as HTMLButtonElement;
      button.setAttribute('aria-pressed', String(this.cameraRig.profile));
      button.classList.toggle('is-active', this.cameraRig.profile);
      getElement<HTMLElement>('#app').classList.toggle('is-diagnostic', this.cameraRig.profile);
      this.crestMarker.visible = this.cameraRig.profile;
      this.contactMarkers.forEach((marker) => { marker.visible = this.cameraRig.profile; });
      this.focusGame();
    });
    getElement<HTMLButtonElement>('#view-toggle').addEventListener('click', this.cycleView);
    getElement<HTMLButtonElement>('#underwater-toggle').addEventListener('click', (event) => {
      if (this.mode === 'physical') {
        this.physicalMode.camera.setView(this.physicalMode.camera.view === 'below' ? this.physicalMode.homeView : 'below');
        this.syncViewButtons();
        this.focusGame();
        return;
      }
      this.cameraRig.underwater = !this.cameraRig.underwater;
      const button = event.currentTarget as HTMLButtonElement;
      button.setAttribute('aria-pressed', String(this.cameraRig.underwater));
      button.classList.toggle('is-active', this.cameraRig.underwater);
      this.focusGame();
    });
    getElement<HTMLButtonElement>('#panel-toggle').addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const panel = getElement<HTMLDivElement>('#tuning-controls');
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.textContent = expanded ? '+' : '−';
      panel.hidden = expanded;
    });
    if (window.innerWidth <= 620) {
      getElement<HTMLDivElement>('#tuning-controls').hidden = true;
      const toggle = getElement<HTMLButtonElement>('#panel-toggle');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '+';
    }
    this.refreshTuningUi();
    this.renderHistory();
    this.renderPhysicsReadout();
  }

  private renderPhysicalReadout(): void {
    getElement<HTMLElement>('#readout-summary').textContent = `PHYSICAL SURF ZONE · ${this.physicalSettings.stage === 1 ? 'SHALLOW-WATER' : 'BOUSSINESQ'} SOLVER`;
    this.readoutPanel.render(this.physicalMode.readout());
  }

  private renderPhysicsReadout(): void {
    getElement<HTMLElement>('#readout-summary').textContent = 'PHYSICS READOUT · LINEAR WAVE THEORY';
    const settings = this.activeSettings;
    const readout = describeSwell({
      height: settings.height, period: settings.period, depth: this.wave.meanDepth, bedSlope: this.wave.maxBedSlope(),
    });
    this.readoutPanel.render(formatSwellReadout(readout, { depth: this.wave.meanDepth, simSpeed: settings.speed }));
  }

  private refreshTuningUi(): void {
    const values = this.draftSettings;
    getElement<HTMLSelectElement>('#spot-select').value = this.draftSpot;
    getElement<HTMLInputElement>('#height-slider').value = String(values.height);
    getElement<HTMLInputElement>('#period-slider').value = String(values.period);
    getElement<HTMLInputElement>('#wave-speed-slider').value = String(values.speed);
    getElement<HTMLInputElement>('#shelf-slider').value = String(values.shelfStrength ?? 0);
    getElement<HTMLInputElement>('#paddle-slider').value = String(values.paddleForce);
    getElement<HTMLInputElement>('#response-slider').value = String(values.boardResponse);
    getElement<HTMLInputElement>('#current-slider').value = String(values.currentX ?? 0);
    getElement<HTMLInputElement>('#wind-slider').value = String(values.windX ?? 0);
    getElement<HTMLInputElement>('#sun-slider').value = String(values.sunHeight);
    getElement<HTMLInputElement>('#sun-direction-slider').value = String(values.sunDirection);
    getElement<HTMLOutputElement>('#height-output').value = `${values.height.toFixed(1)} m`;
    getElement<HTMLOutputElement>('#period-output').value = `${values.period.toFixed(1)} s`;
    getElement<HTMLOutputElement>('#wave-speed-output').value = `${values.speed.toFixed(1)} m/s`;
    getElement<HTMLOutputElement>('#shelf-output').value = `${Math.round((values.shelfStrength ?? 0) * 100)}%`;
    getElement<HTMLOutputElement>('#paddle-output').value = `${values.paddleForce.toFixed(0)} N`;
    getElement<HTMLOutputElement>('#response-output').value = `${values.boardResponse.toFixed(1)}×`;
    getElement<HTMLOutputElement>('#current-output').value = `${(values.currentX ?? 0).toFixed(1)} m/s`;
    getElement<HTMLOutputElement>('#wind-output').value = `${(values.windX ?? 0).toFixed(2)} m/s²`;
    getElement<HTMLOutputElement>('#sun-output').value = `${Math.round(values.sunHeight * 100)}%`;
    getElement<HTMLOutputElement>('#sun-direction-output').value = `${values.sunDirection}°`;
    getElement<HTMLInputElement>('#time-scale-slider').value = String(values.timeScale);
    getElement<HTMLOutputElement>('#time-scale-output').value = `${values.timeScale.toFixed(2)}×`;
    getElement<HTMLSelectElement>('#model-select').value = this.draftMode;
    getElement<HTMLElement>('#legacy-controls').hidden = this.draftMode !== 'legacy';
    getElement<HTMLElement>('#physical-controls').hidden = this.draftMode !== 'physical';
    const physical = this.draftPhysical;
    getElement<HTMLSelectElement>('#physical-spot').value = physical.spot;
    getElement<HTMLSelectElement>('#physical-solver').value = String(physical.stage);
    getElement<HTMLSelectElement>('#physical-compute').value = physical.compute;
    getElement<HTMLSelectElement>('#swell-source').value = physical.source;
    getElement<HTMLElement>('#buoy-controls').hidden = physical.source !== 'buoy';
    getElement<HTMLElement>('#storm-controls').hidden = physical.source !== 'storm';
    getElement<HTMLElement>('#practice-note').hidden = physical.source !== 'practice';
    getElement<HTMLInputElement>('#direction-slider').disabled = physical.source === 'practice';
    if (physical.source === 'practice') {
      getElement<HTMLElement>('#practice-note').textContent = `SAME WATER AND FORCES, STEADIER SWELL · HS ${PRACTICE_SWELL.significantHeight.toFixed(1)} M`
        + ` · TP ${PRACTICE_SWELL.peakPeriod} S · S ${PRACTICE_SWELL.spreading} · BAND ±${Math.round(PRACTICE_SWELL.bandwidth! * 100)} % · ${PRACTICE_SWELL.directionDegrees}° · BEST AT THE POINT`;
    }
    getElement<HTMLInputElement>('#storm-wind-slider').value = String(physical.stormWindSpeed);
    getElement<HTMLInputElement>('#storm-fetch-slider').value = String(physical.stormFetchKm);
    getElement<HTMLInputElement>('#storm-duration-slider').value = String(physical.stormDurationHours);
    getElement<HTMLInputElement>('#storm-distance-slider').value = String(physical.stormDistanceKm);
    getElement<HTMLOutputElement>('#storm-wind-output').value = `${physical.stormWindSpeed} m/s`;
    getElement<HTMLOutputElement>('#storm-fetch-output').value = `${physical.stormFetchKm} km`;
    getElement<HTMLOutputElement>('#storm-duration-output').value = `${physical.stormDurationHours} h`;
    getElement<HTMLOutputElement>('#storm-distance-output').value = physical.stormDistanceKm === 0 ? 'in the storm' : `${physical.stormDistanceKm} km`;
    if (physical.source === 'storm') {
      const swell = swellFor(physical);
      const storm = swell.storm!;
      const limited = Math.abs(storm.significantHeight - swell.significantHeight) > 0.05 ? ` (${storm.significantHeight.toFixed(1)} m capped)` : '';
      getElement<HTMLElement>('#storm-derived').textContent = `${storm.growth.toUpperCase()} · STORM HS ${storm.stormHeight.toFixed(1)} M`
        + ` → AT THE SPOT HS ${swell.significantHeight.toFixed(1)} M${limited.toUpperCase()} · TP ${swell.peakPeriod.toFixed(1)} S · S ${swell.spreading.toFixed(0)}`;
    }
    getElement<HTMLInputElement>('#hs-slider').value = String(physical.significantHeight);
    getElement<HTMLInputElement>('#tp-slider').value = String(physical.peakPeriod);
    getElement<HTMLInputElement>('#direction-slider').value = String(physical.directionDegrees);
    getElement<HTMLInputElement>('#spread-slider').value = String(physical.spread);
    getElement<HTMLInputElement>('#tide-slider').value = String(physical.tide);
    getElement<HTMLOutputElement>('#hs-output').value = `${physical.significantHeight.toFixed(1)} m`;
    getElement<HTMLOutputElement>('#tp-output').value = `${physical.peakPeriod.toFixed(1)} s`;
    getElement<HTMLOutputElement>('#direction-output').value = `${physical.directionDegrees}°`;
    const spreadName = physical.spread < 0.34 ? 'groundswell' : physical.spread < 0.67 ? 'mixed' : 'windswell';
    getElement<HTMLOutputElement>('#spread-output').value = `${spreadName} · s ${spreadingFor(physical.spread).toFixed(0)}`;
    getElement<HTMLOutputElement>('#tide-output').value = `${physical.tide.toFixed(1)} m`;
    getElement<HTMLInputElement>('#wind-speed-slider').value = String(physical.windSpeed);
    getElement<HTMLOutputElement>('#wind-speed-output').value = physical.windSpeed === 0 ? 'calm'
      : `${Math.abs(physical.windSpeed)} m/s ${physical.windSpeed > 0 ? 'onshore' : 'offshore'}`;
    const sharedChanged = (['timeScale', 'sunHeight', 'sunDirection'] as const).some((key) => values[key] !== this.activeSettings[key]);
    const changed = this.draftMode !== this.mode || (this.draftMode === 'physical'
      ? sharedChanged || (Object.keys(physical) as Array<keyof PhysicalSettings>).some((key) => physical[key] !== this.physicalSettings[key])
      : this.draftSpot !== this.activeSpot || Object.keys(DEFAULT_SETTINGS).some((key) => values[key as keyof TuningSettings] !== this.activeSettings[key as keyof TuningSettings]));
    getElement<HTMLElement>('#pending-note').hidden = !changed;
    getElement<HTMLButtonElement>('#apply-button').disabled = !changed;
  }

  private frame = (timestamp: number): void => {
    // Under a frame limit, skipped frames leave the clock alone, so the next one steps the time they covered.
    if (!frameDue(timestamp, this.lastRender, this.graphics?.frameInterval ?? 0)) {
      requestAnimationFrame(this.frame);
      return;
    }
    this.lastRender = timestamp;
    controls.poll();
    const rawElapsed = this.previousFrame === 0 ? 0 : (timestamp - this.previousFrame) / 1000;
    const elapsed = Math.min(rawElapsed, 0.1);
    this.previousFrame = timestamp;
    if (rawElapsed > 0 && rawElapsed < 0.5) {
      this.fpsFrames += 1;
      this.fpsSeconds += rawElapsed;
      if (this.fpsSeconds >= 1) {
        this.fps = this.fpsFrames / this.fpsSeconds;
        this.fpsFrames = 0;
        this.fpsSeconds = 0;
      }
    }
    const simElapsed = simulatedSeconds(elapsed, this.activeSettings.timeScale);
    if (this.mode === 'physical') {
      this.physicalFrame(elapsed, simElapsed);
      requestAnimationFrame(this.frame);
      return;
    }
    this.accumulator = Math.min(this.accumulator + simElapsed, this.fixedStep * 6);
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 5) {
      const input = demoMode !== null ? {
        paddle: this.physics.state === 'ready' || this.physics.state === 'paddling',
        steer: demoMode === 'carve' && this.physics.state === 'riding' ? Math.sin(this.physics.time * 0.72) * 0.45 : 0,
        getUp: this.lastDiagnostics.popUpAvailable,
      } : controls.input;
      this.lastPaddle = input.paddle;
      // Leave the first wave parked while the player reads or tunes the setup.
      if (demoMode === null && this.physics.state === 'ready' && !input.paddle) {
        this.accumulator -= this.fixedStep;
        steps += 1;
        continue;
      }
      this.lastDiagnostics = this.physics.step(this.fixedStep, input);
      this.recordRunProgress(this.lastDiagnostics);
      if (input.getUp) controls.consumeGetUp();
      this.accumulator -= this.fixedStep;
      steps += 1;
    }

    this.water.update();
    this.sheetMesh.update(this.plungingSheet);
    this.seabed.update(this.wave);
    this.breakSpray.update(this.wave);
    const crestZ = this.wave.crestZ();
    this.crestMarker.position.set(0, this.wave.sample(0, crestZ).height + 0.05, crestZ);
    this.surfer.update(this.physics, this.lastPaddle, simElapsed);
    this.environment.group.position.z = this.physics.position.z;
    this.boardWake.update(this.physics, this.wave, simElapsed);
    const contacts = this.physics.contactPoints;
    for (let index = 0; index < contacts.length; index += 1) this.contactMarkers[index].position.copy(contacts[index]);
    this.cameraRig.update(this.physics, this.wave, simElapsed || this.fixedStep);
    this.updateUnderwaterView();
    this.caustics.disable();
    this.fftChop.disable();
    this.renderer.render(this.scene, this.cameraRig.camera);
    this.updateHud();
    requestAnimationFrame(this.frame);
  };

  /** One frame of the physical surf zone: fixed solver steps with the player's input, render, 4 Hz readout. */
  private physicalFrame(elapsed: number, simElapsed: number): void {
    this.accumulator = Math.min(this.accumulator + simElapsed, this.fixedStep * 4);
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 3) {
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    // The arrows steer toward the screen's left or right, whichever way the camera faces.
    const input = controls.input;
    this.physicalMode.advance(steps, { paddle: input.paddle, popUp: input.getUp, steer: this.physicalMode.screenSteer(input.steer) });
    if (input.getUp) controls.consumeGetUp();
    this.physicalRender(elapsed, simElapsed);
  }

  /** Draw the physical surf zone as it now stands, and refresh the readout at 4 Hz. */
  private physicalRender(elapsed: number, simElapsed: number): void {
    this.water.update();
    this.physicalMode.update(simElapsed || this.fixedStep);
    this.setUnderwater(this.physicalMode.cameraBelowSurface());
    // Caustics where the view looks: a window a third of its width ahead of the camera.
    const view = this.physicalMode.camera.camera;
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
    this.renderer.render(this.scene, this.physicalMode.camera.camera);
    this.readoutClock += elapsed;
    if (this.readoutClock >= 0.25) {
      this.readoutClock = 0;
      this.renderPhysicalReadout();
    }
  }

  private updateHud(): void {
    this.hud.update(this.seed, this.activeSettings, this.lastDiagnostics, this.fps);
  }

  private recordRunProgress(diagnostics: BoardDiagnostics): void {
    const values = this.runMeasurements;
    values.peakSpeed = Math.max(values.peakSpeed, diagnostics.speed);
    values.peakBreaking = Math.max(values.peakBreaking, diagnostics.breaking);
    values.peakLipImpact = Math.max(values.peakLipImpact, diagnostics.lipImpact);
    values.peakFlow = Math.max(values.peakFlow, diagnostics.flow);
    values.lowestBalance = Math.min(values.lowestBalance, diagnostics.balance);
    if (diagnostics.state === 'catching' && values.popUpAt === null) values.popUpAt = this.physics.time;
    if (diagnostics.state === 'riding' && values.ridingAt === null) values.ridingAt = this.physics.time;
    if (this.recordedTerminal || !['missed', 'wipeout', 'complete'].includes(diagnostics.state)) return;
    this.recordedTerminal = true;
    if (demoMode !== null) return;
    const report: RunReport = {
      seed: this.seed,
      outcome: diagnostics.state as RunReport['outcome'],
      reason: diagnostics.outcomeReason,
      spot: SPOT_NAMES[this.activeSpot],
      settings: { ...this.activeSettings },
      elapsedSeconds: this.physics.time,
      rideDistance: this.physics.rideDistance,
      ...values,
    };
    this.runHistory.add(report);
    this.renderHistory();
  }

  private renderHistory(): void {
    const list = getElement<HTMLOListElement>('#history-list');
    list.replaceChildren();
    const reports = this.runHistory.recent;
    getElement<HTMLElement>('#history-summary').textContent = `RECENT RUNS · ${reports.length}`;
    for (const report of reports.slice(0, 5)) {
      const item = document.createElement('li');
      item.textContent = `SEED ${report.seed.toString().padStart(4, '0')} · ${report.outcome.toUpperCase()} · ${report.rideDistance.toFixed(1)} m`;
      const detail = document.createElement('small');
      detail.textContent = `${report.spot ?? 'SURF BREAK'} · ${report.reason} Peak ${report.peakSpeed.toFixed(1)} m/s, break ${Math.round(report.peakBreaking * 100)}%, lip hit ${Math.round((report.peakLipImpact ?? 0) * 100)}%.`;
      item.append(detail);
      list.append(item);
    }
  }

  /** Both water meshes light their crests and bodies from the scene's sun. */
  private refreshSun(): void {
    const direction = this.environment.sunPosition.clone().normalize();
    const radiance = this.sunlight.color.clone().multiplyScalar(this.sunlight.intensity);
    this.water.setSun(direction, radiance);
    this.physicalMode.farField.setSun(direction, radiance);
  }

  private refreshReflection(): void {
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
    const hidden = [this.water.mesh, this.sheetMesh.mesh, this.surfer.group, this.physicalMode.seabed.mesh, this.physicalMode.farField.mesh,
      this.physicalMode.lipPoints.mesh, this.physicalMode.bubbles.mesh, this.physicalMode.spray.mesh, this.boardWake.trail, this.boardWake.spray, this.breakSpray.points, this.seabed.mesh,
      this.crestMarker, this.environment.sunMesh, ...this.contactMarkers];
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

  private updateUnderwaterView(): void {
    const camera = this.cameraRig.camera.position;
    const surface = this.wave.heightAt(camera.x, camera.z);
    if (!this.isBelowSurface && camera.y < surface - 0.14) this.isBelowSurface = true;
    else if (this.isBelowSurface && camera.y > surface + 0.18) this.isBelowSurface = false;
    this.setUnderwater(this.isBelowSurface);
  }

  private setUnderwater(below: boolean): void {
    this.isBelowSurface = below;
    if (this.environment.group.visible === below) {
      this.scene.fog = below ? this.underwaterFog : null;
      this.scene.background = below ? this.underwaterColor : this.skyColor;
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
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraRig.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this.cameraRig.camera.updateProjectionMatrix();
    this.physicalMode.camera.resize(window.innerWidth / Math.max(1, window.innerHeight));
  }
}

const game = new SurfGame();
if (recordRequested) void import('./dev/rideRecorder').then(({ recordRide }) => recordRide(game.recording));
const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = new SettingsStore(availableStorage(), defaultSettings(reducedMotion));
const applyGraphics = () => game.applyGraphics(resolveGraphics(settings.value.graphics, settings.value.detected, window.devicePixelRatio));
applyGraphics();
settings.subscribe((_, change) => {
  if (change === 'graphics' || change === 'detected') applyGraphics();
});
const controls = new Controls(() => settings.value.controls.bindings, {
  retry: () => game.quickRetry(),
  camera: () => game.cycleView(),
  pause: () => {},
});
