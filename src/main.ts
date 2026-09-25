import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  MeshStandardMaterial,
  Scene,
  WebGLRenderer,
} from 'three';
import { Controls } from './game/Controls';
import { BoardPhysics, type BoardDiagnostics, type PhysicsSettings } from './physics/BoardPhysics';
import { CameraRig } from './scene/CameraRig';
import { Surfer } from './scene/Surfer';
import { WaterSurface } from './scene/WaterSurface';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField, type WaveSettings } from './wave/WaveModel';
import { Hud } from './ui/Hud';
import './style.css';

interface TuningSettings extends WaveSettings, PhysicsSettings {}

const DEFAULT_SETTINGS: TuningSettings = {
  ...DEFAULT_WAVE_SETTINGS,
  paddleForce: 14,
  boardResponse: 1,
};

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required app element: ${selector}`);
  return element;
}

class SurfGame {
  private readonly scene = new Scene();
  private readonly renderer: WebGLRenderer;
  private readonly cameraRig = new CameraRig();
  private readonly surfer = new Surfer();
  private readonly hud = new Hud();
  private readonly crestMarker: Mesh;
  private readonly contactMarkers: Mesh[] = [];
  private readonly water: WaterSurface;
  private wave: InteractiveWaterField;
  private physics: BoardPhysics;
  private seed = 1;
  private activeSettings = { ...DEFAULT_SETTINGS };
  private draftSettings = { ...DEFAULT_SETTINGS };
  private lastDiagnostics: BoardDiagnostics;
  private accumulator = 0;
  private previousFrame = 0;
  private readonly fixedStep = 1 / 60;

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
    this.scene.add(new AmbientLight('#b8d9d5', 1.6));
    const sunlight = new DirectionalLight('#fff2d8', 3.2);
    sunlight.position.set(-7, 12, 5);
    this.scene.add(sunlight);
    const fill = new DirectionalLight('#76c6d3', 0.7);
    fill.position.set(8, 4, -10);
    this.scene.add(fill);

    this.wave = new InteractiveWaterField(this.seed, this.activeSettings);
    this.water = new WaterSurface(this.wave);
    this.scene.add(this.water.mesh);
    this.physics = this.createPhysics(this.wave, this.activeSettings);
    this.lastDiagnostics = this.physics.diagnostics();
    this.scene.add(this.surfer.group);

    const markerMaterial = new MeshStandardMaterial({ color: '#f9a273', emissive: '#a34b2d', emissiveIntensity: 0.22, roughness: 0.5 });
    this.crestMarker = new Mesh(new BoxGeometry(9, 0.025, 0.055), markerMaterial);
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

    this.bindUi();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(this.frame);
  }

  replay = (): void => {
    this.startRun(this.seed, this.activeSettings);
    this.focusGame();
  };

  private createPhysics(wave: InteractiveWaterField, settings: TuningSettings): BoardPhysics {
    return new BoardPhysics(wave, {
      paddleForce: settings.paddleForce,
      boardResponse: settings.boardResponse,
    });
  }

  private startRun(seed: number, settings: TuningSettings): void {
    this.seed = seed;
    this.activeSettings = { ...settings };
    this.draftSettings = { ...settings };
    this.wave = new InteractiveWaterField(this.seed, this.activeSettings);
    this.water.setWave(this.wave);
    this.physics = this.createPhysics(this.wave, this.activeSettings);
    this.lastDiagnostics = this.physics.diagnostics();
    this.accumulator = 0;
    this.refreshTuningUi();
    this.updateHud();
  }

  private newWave(): void {
    this.seed = (this.seed + 1) >>> 0;
    if (this.seed === 0) this.seed = 1;
    this.startRun(this.seed, this.readDraftSettings());
    this.focusGame();
  }

  private readDraftSettings(): TuningSettings {
    const number = (id: string): number => Number.parseFloat(getElement<HTMLInputElement>(id).value);
    return {
      height: number('#height-slider'),
      period: number('#period-slider'),
      speed: number('#wave-speed-slider'),
      paddleForce: number('#paddle-slider'),
      boardResponse: number('#response-slider'),
    };
  }

  private bindUi(): void {
    const sliders = [
      '#height-slider', '#period-slider', '#wave-speed-slider', '#paddle-slider', '#response-slider',
    ];
    for (const selector of sliders) {
      getElement<HTMLInputElement>(selector).addEventListener('input', () => {
        this.draftSettings = this.readDraftSettings();
        this.refreshTuningUi();
      });
    }
    getElement<HTMLButtonElement>('#apply-button').addEventListener('click', () => {
      this.startRun(this.seed, this.readDraftSettings());
      this.focusGame();
    });
    getElement<HTMLButtonElement>('#replay-button').addEventListener('click', this.replay);
    getElement<HTMLButtonElement>('#get-up-button').addEventListener('click', () => controls.requestGetUp());
    getElement<HTMLButtonElement>('#new-wave-button').addEventListener('click', () => this.newWave());
    getElement<HTMLButtonElement>('#diagnostic-toggle').addEventListener('click', (event) => {
      this.cameraRig.profile = !this.cameraRig.profile;
      const button = event.currentTarget as HTMLButtonElement;
      button.setAttribute('aria-pressed', String(this.cameraRig.profile));
      button.classList.toggle('is-active', this.cameraRig.profile);
      this.contactMarkers.forEach((marker) => { marker.visible = this.cameraRig.profile; });
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
    this.refreshTuningUi();
  }

  private refreshTuningUi(): void {
    const values = this.draftSettings;
    getElement<HTMLInputElement>('#height-slider').value = String(values.height);
    getElement<HTMLInputElement>('#period-slider').value = String(values.period);
    getElement<HTMLInputElement>('#wave-speed-slider').value = String(values.speed);
    getElement<HTMLInputElement>('#paddle-slider').value = String(values.paddleForce);
    getElement<HTMLInputElement>('#response-slider').value = String(values.boardResponse);
    getElement<HTMLOutputElement>('#height-output').value = `${values.height.toFixed(1)} m`;
    getElement<HTMLOutputElement>('#period-output').value = `${values.period.toFixed(1)} s`;
    getElement<HTMLOutputElement>('#wave-speed-output').value = `${values.speed.toFixed(1)} m/s`;
    getElement<HTMLOutputElement>('#paddle-output').value = `${values.paddleForce.toFixed(0)} N`;
    getElement<HTMLOutputElement>('#response-output').value = `${values.boardResponse.toFixed(1)}×`;
    const changed = Object.keys(DEFAULT_SETTINGS).some((key) => values[key as keyof TuningSettings] !== this.activeSettings[key as keyof TuningSettings]);
    getElement<HTMLElement>('#pending-note').hidden = !changed;
    getElement<HTMLButtonElement>('#apply-button').disabled = !changed;
  }

  private frame = (timestamp: number): void => {
    const elapsed = this.previousFrame === 0 ? 0 : Math.min((timestamp - this.previousFrame) / 1000, 0.1);
    this.previousFrame = timestamp;
    this.accumulator = Math.min(this.accumulator + elapsed, this.fixedStep * 6);
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < 5) {
      const input = controls.input;
      this.lastDiagnostics = this.physics.step(this.fixedStep, input);
      if (input.getUp) controls.consumeGetUp();
      this.accumulator -= this.fixedStep;
      steps += 1;
    }

    this.water.update();
    const crestZ = this.wave.crestZ();
    this.crestMarker.position.set(0, this.wave.sample(0, crestZ).height + 0.05, crestZ);
    this.surfer.update(this.physics, controls.input.paddle);
    const contacts = this.physics.contactPoints;
    for (let index = 0; index < contacts.length; index += 1) this.contactMarkers[index].position.copy(contacts[index]);
    this.cameraRig.update(this.physics, elapsed || this.fixedStep);
    this.renderer.render(this.scene, this.cameraRig.camera);
    this.updateHud();
    requestAnimationFrame(this.frame);
  };

  private updateHud(): void {
    this.hud.update(this.seed, this.activeSettings, this.lastDiagnostics);
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
