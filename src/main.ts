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
} from 'three';
import { Controls } from './game/Controls';
import { RunHistory, type RunReport } from './game/RunHistory';
import { BoardPhysics, type BoardDiagnostics, type PhysicsSettings } from './physics/BoardPhysics';
import { CameraRig } from './scene/CameraRig';
import { BoardWake } from './scene/BoardWake';
import { BreakSpray } from './scene/BreakSpray';
import { Environment } from './scene/Environment';
import { Surfer } from './scene/Surfer';
import { Seabed } from './scene/Seabed';
import { WaterSurface } from './scene/WaterSurface';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField, type WaveSettings } from './wave/WaveModel';
import { Hud } from './ui/Hud';
import './style.css';

interface TuningSettings extends WaveSettings, PhysicsSettings { sunHeight: number; sunDirection: number }

const DEFAULT_SETTINGS: TuningSettings = {
  ...DEFAULT_WAVE_SETTINGS,
  paddleForce: 14,
  boardResponse: 1,
  sunHeight: 0.35,
  sunDirection: -25,
};
type Spot = 'training' | 'point' | 'reef' | 'custom';
const SPOT_SETTINGS: Record<Exclude<Spot, 'custom'>, TuningSettings> = {
  training: DEFAULT_SETTINGS,
  point: { ...DEFAULT_SETTINGS, height: 1.8, period: 9, speed: 3.3, shelfStrength: 0.25, currentX: -0.2, sunHeight: 0.2, sunDirection: 20 },
  reef: { ...DEFAULT_SETTINGS, height: 2.2, period: 6.5, speed: 4, shelfStrength: 0.65, currentX: 0.5, windX: 0.05, sunHeight: 0.6, sunDirection: -45 },
};
const SPOT_NAMES: Record<Spot, string> = {
  training: 'PACIFIC TRAINING BREAK', point: 'GLASSY POINT', reef: 'WINDY REEF', custom: 'CUSTOM BREAK',
};
const demoMode = new URLSearchParams(window.location.search).get('demo');

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
  private readonly sunlight: DirectionalLight;
  private reflectionMapTarget?: WebGLRenderTarget;
  private readonly hud = new Hud();
  private readonly runHistory = new RunHistory(availableStorage());
  private readonly crestMarker: Mesh;
  private readonly contactMarkers: Mesh[] = [];
  private readonly water: WaterSurface;
  private wave: InteractiveWaterField;
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
    peakSpeed: 0, peakBreaking: 0, peakFlow: 0, lowestBalance: 1,
    popUpAt: null as number | null, ridingAt: null as number | null,
  };
  private readonly fixedStep = 1 / 60;
  private isBelowSurface = false;
  private readonly underwaterFog = new FogExp2('#367e83', 0.035);
  private readonly underwaterColor = new Color('#367e83');
  private readonly skyColor = new Color('#b8e3e5');

  constructor() {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
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
    this.water = new WaterSurface(this.wave);
    this.water.mesh.material.envMapIntensity = 0.28;
    this.scene.add(this.water.mesh, this.water.lipMesh);
    this.scene.add(this.seabed.mesh);
    this.physics = this.createPhysics(this.wave, this.activeSettings);
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

    this.refreshReflection();

    this.bindUi();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(this.frame);
  }

  replay = (): void => {
    this.startRun(this.seed, this.activeSettings, this.activeSpot);
    this.focusGame();
  };

  private createPhysics(wave: InteractiveWaterField, settings: TuningSettings): BoardPhysics {
    return new BoardPhysics(wave, {
      paddleForce: settings.paddleForce,
      boardResponse: settings.boardResponse,
    });
  }

  private startRun(seed: number, settings: TuningSettings, spot: Spot = this.activeSpot): void {
    const sunChanged = settings.sunHeight !== this.activeSettings.sunHeight
      || settings.sunDirection !== this.activeSettings.sunDirection;
    const spotChanged = spot !== this.activeSpot;
    this.seed = seed;
    this.activeSettings = { ...settings };
    this.draftSettings = { ...settings };
    this.activeSpot = spot;
    this.draftSpot = spot;
    getElement<HTMLElement>('#spot-name').textContent = SPOT_NAMES[spot];
    this.wave = new InteractiveWaterField(this.seed, this.activeSettings);
    this.water.setWave(this.wave);
    this.physics = this.createPhysics(this.wave, this.activeSettings);
    if (sunChanged || spotChanged) {
      this.environment.setSunPosition(settings.sunHeight, settings.sunDirection);
      this.environment.setSpot(spot);
      this.sunlight.position.copy(this.environment.sunPosition).normalize().multiplyScalar(45);
      this.sunlight.intensity = 1.2 + 0.6 * settings.sunHeight;
      this.refreshReflection();
    }
    this.boardWake.reset();
    this.surfer.resetPose();
    this.lastPaddle = false;
    this.recordedTerminal = false;
    this.runMeasurements = {
      peakSpeed: 0, peakBreaking: 0, peakFlow: 0, lowestBalance: 1,
      popUpAt: null, ridingAt: null,
    };
    this.lastDiagnostics = this.physics.diagnostics();
    this.accumulator = 0;
    this.refreshTuningUi();
    this.renderHistory();
    this.updateHud();
  }

  private newWave(): void {
    this.seed = (this.seed + 1) >>> 0;
    if (this.seed === 0) this.seed = 1;
    this.startRun(this.seed, this.readDraftSettings(), this.draftSpot);
    this.focusGame();
  }

  private readDraftSettings(): TuningSettings {
    const number = (id: string): number => Number.parseFloat(getElement<HTMLInputElement>(id).value);
    return {
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
    };
  }

  private bindUi(): void {
    const sliders = [
      '#height-slider', '#period-slider', '#wave-speed-slider', '#shelf-slider', '#paddle-slider', '#response-slider',
      '#current-slider', '#wind-slider',
      '#sun-slider',
      '#sun-direction-slider',
    ];
    for (const selector of sliders) {
      getElement<HTMLInputElement>(selector).addEventListener('input', () => {
        this.draftSettings = this.readDraftSettings();
        this.draftSpot = 'custom';
        this.refreshTuningUi();
      });
    }
    getElement<HTMLSelectElement>('#spot-select').addEventListener('change', (event) => {
      const selected = (event.currentTarget as HTMLSelectElement).value as Spot;
      this.draftSpot = selected;
      if (selected !== 'custom') this.draftSettings = { ...SPOT_SETTINGS[selected] };
      this.refreshTuningUi();
    });
    getElement<HTMLButtonElement>('#apply-button').addEventListener('click', () => {
      this.startRun(this.seed, this.readDraftSettings(), this.draftSpot);
      this.focusGame();
    });
    getElement<HTMLButtonElement>('#replay-button').addEventListener('click', this.replay);
    getElement<HTMLButtonElement>('#replay-action').addEventListener('click', this.replay);
    getElement<HTMLButtonElement>('#get-up-button').addEventListener('click', () => controls.requestGetUp());
    getElement<HTMLButtonElement>('#new-wave-button').addEventListener('click', () => this.newWave());
    getElement<HTMLButtonElement>('#diagnostic-toggle').addEventListener('click', (event) => {
      this.cameraRig.profile = !this.cameraRig.profile;
      const button = event.currentTarget as HTMLButtonElement;
      button.setAttribute('aria-pressed', String(this.cameraRig.profile));
      button.classList.toggle('is-active', this.cameraRig.profile);
      getElement<HTMLElement>('#app').classList.toggle('is-diagnostic', this.cameraRig.profile);
      this.crestMarker.visible = this.cameraRig.profile;
      this.contactMarkers.forEach((marker) => { marker.visible = this.cameraRig.profile; });
      this.focusGame();
    });
    getElement<HTMLButtonElement>('#underwater-toggle').addEventListener('click', (event) => {
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
    const changed = this.draftSpot !== this.activeSpot || Object.keys(DEFAULT_SETTINGS).some((key) => values[key as keyof TuningSettings] !== this.activeSettings[key as keyof TuningSettings]);
    getElement<HTMLElement>('#pending-note').hidden = !changed;
    getElement<HTMLButtonElement>('#apply-button').disabled = !changed;
  }

  private frame = (timestamp: number): void => {
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
    this.accumulator = Math.min(this.accumulator + elapsed, this.fixedStep * 6);
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 5) {
      const input = demoMode !== null ? {
        paddle: this.physics.state === 'ready' || this.physics.state === 'paddling',
        steer: demoMode === 'carve' && this.physics.state === 'riding' ? Math.sin(this.physics.time * 0.72) * 0.7 : 0,
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
    this.seabed.update(this.wave);
    this.breakSpray.update(this.wave);
    const crestZ = this.wave.crestZ();
    this.crestMarker.position.set(0, this.wave.sample(0, crestZ).height + 0.05, crestZ);
    this.surfer.update(this.physics, this.lastPaddle, elapsed);
    this.boardWake.update(this.physics, this.wave, elapsed);
    const contacts = this.physics.contactPoints;
    for (let index = 0; index < contacts.length; index += 1) this.contactMarkers[index].position.copy(contacts[index]);
    this.cameraRig.update(this.physics, this.wave, elapsed || this.fixedStep);
    this.updateUnderwaterView();
    this.renderer.render(this.scene, this.cameraRig.camera);
    this.updateHud();
    requestAnimationFrame(this.frame);
  };

  private updateHud(): void {
    this.hud.update(this.seed, this.activeSettings, this.lastDiagnostics, this.fps);
  }

  private recordRunProgress(diagnostics: BoardDiagnostics): void {
    const values = this.runMeasurements;
    values.peakSpeed = Math.max(values.peakSpeed, diagnostics.speed);
    values.peakBreaking = Math.max(values.peakBreaking, diagnostics.breaking);
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
      detail.textContent = `${report.spot ?? 'SURF BREAK'} · ${report.reason} Peak ${report.peakSpeed.toFixed(1)} m/s, break ${Math.round(report.peakBreaking * 100)}%.`;
      item.append(detail);
      list.append(item);
    }
  }

  private refreshReflection(): void {
    const previousEnvironmentVisibility = this.environment.group.visible;
    const previousFog = this.scene.fog;
    const previousBackground = this.scene.background;
    this.environment.group.visible = true;
    this.scene.fog = null;
    this.scene.background = this.skyColor;
    const hidden = [this.water.mesh, this.water.lipMesh, this.surfer.group,
      this.boardWake.trail, this.boardWake.spray, this.breakSpray.points, this.seabed.mesh,
      this.crestMarker, this.environment.sunMesh, ...this.contactMarkers];
    const visibility = hidden.map((object) => object.visible);
    hidden.forEach((object) => { object.visible = false; });
    const capture = new WebGLCubeRenderTarget(128);
    const camera = new CubeCamera(0.1, 180, capture);
    camera.position.set(0, 0.6, 0);
    camera.update(this.renderer, this.scene);
    const pmrem = new PMREMGenerator(this.renderer);
    const nextMap = pmrem.fromCubemap(capture.texture);
    this.water.mesh.material.envMap = nextMap.texture;
    this.water.mesh.material.needsUpdate = true;
    this.reflectionMapTarget?.dispose();
    this.reflectionMapTarget = nextMap;
    capture.dispose();
    pmrem.dispose();
    hidden.forEach((object, index) => { object.visible = visibility[index]; });
    this.environment.group.visible = previousEnvironmentVisibility;
    this.scene.fog = previousFog;
    this.scene.background = previousBackground;
  }

  private updateUnderwaterView(): void {
    const camera = this.cameraRig.camera.position;
    const surface = this.wave.heightAt(camera.x, camera.z);
    if (!this.isBelowSurface && camera.y < surface - 0.14) this.isBelowSurface = true;
    else if (this.isBelowSurface && camera.y > surface + 0.18) this.isBelowSurface = false;
    const below = this.isBelowSurface;
    if (this.environment.group.visible === below) {
      this.scene.fog = below ? this.underwaterFog : null;
      this.scene.background = below ? this.underwaterColor : this.skyColor;
      this.environment.group.visible = !below;
    }
  }

  private focusGame(): void {
    this.renderer.domElement.focus({ preventScroll: true });
  }

  private resize(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraRig.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this.cameraRig.camera.updateProjectionMatrix();
  }
}

const game = new SurfGame();
const controls = new Controls(() => game.replay(), () => {});
getElement<HTMLElement>('#loading').classList.add('is-hidden');
