import { buttonLabel, keyLabel, type Action } from '../game/Bindings';
import type { Controls } from '../game/Controls';
import { BenchmarkRecorder, adapterName, needsDetection, withPreset } from '../game/Graphics';
import { Logbook } from '../game/Logbook';
import { RideTracker, type RideFrame, type RideResult } from '../game/RideTracker';
import type { SettingsStore } from '../game/Settings';
import { DEFAULT_CONDITIONS, nextBackdropSpot, type SurfConditions } from '../game/SurfConditions';
import type { RideView } from '../scene/SpectatorCamera';
import { DEV_TOOLS } from '../devTools';
import type { SpotName } from '../wave/Bathymetry';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import type { ReadoutRow } from '../wave/SwellReadout';
import { applyAccessibility } from './accessibility';
import { PhysicsReadoutPanel } from './PhysicsReadoutPanel';
import packageJson from '../../package.json';
import { el } from './dom';
import { createLogbookScreen, logbookModel } from './LogbookScreen';
import { createSettingsScreen } from './SettingsScreen';
import { createMainMenu } from './MainMenu';
import { MenuInput } from './MenuInput';
import { createPauseMenu } from './PauseMenu';
import { createRideEndCard, endCardModel } from './RideEndCard';
import { RideHud, type HintKeys } from './RideHud';
import { ScreenStack, type ScreenId } from './ScreenStack';
import { EN, t, type StringKey } from './strings';
import { createSurfScreen, type SurfChoice } from './SurfScreen';

/** What the menus ask of the game (implemented by `SurfGame` in main.ts). */
export interface GameHost {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** Whether the menu's waves are running (not spinning up, not a still frame). */
  readonly backdropRunning: boolean;
  showBackdrop(spot: SpotName): Promise<boolean>;
  startSurf(spot: SpotName, conditions: SurfConditions, seed: number, camera: RideView | 'overview'): Promise<boolean>;
  readonly rideStatus: SurfZoneStatus['ride'] | undefined;
  readonly rideFrame: RideFrame | undefined;
  readonly viewName: string;
  setPaused(paused: boolean): void;
  cycleView(): void;
  quickRetry(): void;
  /** The Wave Lab's own replay and new wave. */
  replay(): void;
  newWave(): void;
  enterWaveLab(): void;
  setReducedMotion(reduced: boolean): void;
  readonly readout: ReadoutRow[];
}

function localStore(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Frames skipped after the menu's waves start, before the benchmark counts (shaders compile, caches fill). */
const BENCHMARK_WARMUP_FRAMES = 30;

/**
 * The game's screens (plan P8): which one shows, the way back, and the calls into
 * the game. `#app[data-screen]` is the current screen and `#app[data-base]` the
 * scene under it, which the stylesheets key off.
 */
export class App {
  private readonly stack: ScreenStack;
  private readonly root = document.getElementById('app')!;
  private readonly ui = document.getElementById('ui')!;
  private readonly menuInput: MenuInput;
  /** The scene the game shows now: the menu's waves, a ride, or the Wave Lab. */
  private scene?: 'backdrop' | 'ride' | 'wavelab';
  private backdropSpot?: SpotName;
  private readonly adapter: string;
  private benchmark?: BenchmarkRecorder;
  private warmup = 0;
  private notice?: HTMLElement;
  private readonly loading = document.getElementById('loading')!;
  private readonly loadingText = document.getElementById('loading-text');
  private surfChoice: SurfChoice = { spot: 'point', conditions: { ...DEFAULT_CONDITIONS } };
  /** The current wave's seed: Replay keeps it, New wave moves on. */
  private seed = 1 + Math.floor(Math.random() * 9999);
  private readonly rideHud: RideHud;
  private readonly tracker = new RideTracker();
  private readonly logbook = new Logbook(localStore());
  private endCard?: HTMLElement;
  /** The dev tools' telemetry over a Surf ride: the physical readout and the frame rate, at 4 Hz. */
  private readonly telemetryList = el('dl');
  private readonly telemetry = el('aside', { class: 'ride-telemetry physics-readout' }, this.telemetryList);
  private readonly telemetryPanel = new PhysicsReadoutPanel(this.telemetryList);
  private telemetryClock = 0;
  private fps = 0;
  private rotateHint?: HTMLElement;
  private rotateDismissed = false;

  constructor(
    private readonly game: GameHost,
    private readonly controls: Controls,
    readonly settings: SettingsStore,
    options: { startInWaveLab: boolean },
  ) {
    this.stack = new ScreenStack(options.startInWaveLab ? 'wavelab' : 'menu');
    this.scene = options.startInWaveLab ? 'wavelab' : undefined;
    this.menuInput = new MenuInput({ root: () => this.ui, onBack: () => this.back() });
    this.adapter = adapterName(game.gl);
    this.rideHud = new RideHud(() => this.pause());
    this.setLoadingText('loading.break');
    this.bindTouch();
    this.settings.subscribe((_, change) => {
      if (change === 'accessibility' || change === 'gameplay' || change === 'controls') this.applyAccessibility();
    });
    this.show();
  }

  /** Called by the game once per rendered frame: the gamepad, and the Auto benchmark while the menu's waves run. */
  frame(intervalMs: number, status?: SurfZoneStatus): void {
    this.menuInput.poll();
    if (intervalMs > 0 && intervalMs < 500) this.fps += (1000 / intervalMs - this.fps) * 0.1;
    if (this.stack.current === 'ride' && this.telemetry.isConnected) {
      this.telemetryClock += intervalMs;
      if (this.telemetryClock >= 250) {
        this.telemetryClock = 0;
        this.telemetryPanel.render([...this.game.readout, { label: 'FRAME RATE', value: `${Math.round(this.fps)} fps` }]);
      }
    }
    if (this.stack.current === 'ride') {
      const { gameplay, seen } = this.settings.value;
      this.rideHud.update(this.game.rideStatus, gameplay.units, this.hintKeys(), !seen.rideHints);
      this.trackRide();
    }
    if (!this.benchmark || this.stack.base !== 'menu' || !this.game.backdropRunning) return;
    if (this.warmup < BENCHMARK_WARMUP_FRAMES) {
      this.warmup += 1;
      return;
    }
    this.benchmark.add(intervalMs, status?.stepMs, status?.compute === 'gpu');
    if (this.benchmark.done) this.finishBenchmark();
  }

  /** Forget the detection and benchmark again the next time the menu's waves run (Settings' Re-detect). */
  redetect(): void {
    this.settings.setDetected(undefined);
    this.startBenchmarkIfNeeded();
  }

  get detecting(): boolean {
    return this.benchmark !== undefined;
  }

  /** Esc, Start or the pause button, during a ride or in the Wave Lab. */
  pause(): void {
    if (this.stack.current === 'ride' || this.stack.current === 'wavelab') this.go('pause');
  }

  /** The player paddled out again (R): the ride in progress ends by choice, and the card goes. */
  noteRetry(): void {
    this.tracker.noteRetry();
    this.hideEndCard();
  }

  back(): void {
    if (this.stack.back() !== undefined) this.show();
  }

  go(id: ScreenId): void {
    this.stack.push(id);
    this.show();
  }

  private show(): void {
    const { current, base } = this.stack;
    this.root.dataset.screen = current;
    this.root.dataset.base = base;
    const playing = current === 'ride' || current === 'wavelab';
    this.controls.enabled = playing;
    this.menuInput.active = !playing;
    this.game.setPaused(this.stack.stack.includes('pause'));
    this.applyAccessibility();
    if (base === 'menu' && this.scene !== 'backdrop') this.openBackdrop();
    // The gradient only stands in for the menu's first waves; a ride or the Wave Lab shows its own scene.
    if (base !== 'menu') this.root.classList.remove('is-scene-pending');
    this.ui.replaceChildren(...this.render(current));
    if (this.notice) this.ui.append(this.notice);
    if (playing) this.game.canvas.focus({ preventScroll: true });
    else this.menuInput.focusDefault();
  }

  private render(id: ScreenId): Node[] {
    if (id === 'menu') {
      return [createMainMenu({
        surf: () => this.go('surf'),
        waveLab: () => this.enterWaveLab(),
        logbook: () => this.go('logbook'),
        settings: () => this.go('settings'),
      }, { devTools: DEV_TOOLS, version: packageJson.version })];
    }
    if (id === 'surf') {
      return [createSurfScreen(this.surfChoice, {
        change: (choice) => { this.surfChoice = choice; },
        paddleOut: () => void this.paddleOut(),
        back: () => this.back(),
      })];
    }
    if (id === 'settings') {
      return [createSettingsScreen({
        store: this.settings,
        context: () => ({ devTools: DEV_TOOLS, detecting: this.detecting }),
        onBack: () => this.back(),
        onRedetect: () => this.redetect(),
        onCapture: (capturing) => { this.menuInput.active = !capturing; },
      })];
    }
    if (id === 'logbook') {
      return [createLogbookScreen(logbookModel(this.logbook, this.settings.value.gameplay.units, Date.now()), () => this.back())];
    }
    if (id === 'ride') {
      const { gameplay } = this.settings.value;
      return [
        this.rideHud.root,
        ...(DEV_TOOLS && gameplay.showTelemetry ? [this.telemetry] : []),
        ...(this.needsRotateHint() ? [this.rotateHintElement()] : []),
        ...(this.endCard ? [this.endCard] : []),
      ];
    }
    if (id === 'pause') {
      const inLab = this.stack.base === 'wavelab';
      return [createPauseMenu({
        resume: () => this.back(),
        replay: () => (inLab ? this.resumeWith(() => this.game.replay()) : void this.paddleOut()),
        newWave: () => (inLab ? this.resumeWith(() => this.game.newWave()) : this.nextWave()),
        camera: () => {
          this.game.cycleView();
          return this.viewLabel();
        },
        settings: () => this.go('settings'),
        quit: () => this.quitToMenu(),
      }, this.viewLabel())];
    }
    return [];
  }

  private viewLabel(): string {
    const key = `view.${this.game.viewName}`;
    return key in EN ? t(key as StringKey) : this.game.viewName;
  }

  /** Close the pause menu, then act (the Wave Lab's own replay and new wave). */
  private resumeWith(action: () => void): void {
    this.back();
    action();
  }

  private nextWave(): void {
    this.seed = (this.seed % 9999) + 1;
    void this.paddleOut();
  }

  private quitToMenu(): void {
    this.hideEndCard();
    this.stack.reset('menu');
    this.show();
  }

  private changeSpot(): void {
    this.hideEndCard();
    this.stack.reset('menu');
    this.stack.push('surf');
    this.show();
  }

  /** Feed the ride tracker; a finished ride is logged and summed up on the end card. */
  private trackRide(): void {
    const frame = this.game.rideFrame;
    if (!frame) return;
    if (frame.phase === 'standing') this.hideEndCard();
    const result = this.tracker.update(frame);
    if (result) this.finishRide(result);
  }

  private finishRide(result: RideResult): void {
    const { spot, conditions } = this.surfChoice;
    const records = this.logbook.add({ ...result, spot, conditions, seed: this.seed, at: Date.now() });
    if (!this.settings.value.seen.rideHints) this.settings.markSeen('rideHints');
    this.hideEndCard();
    this.endCard = createRideEndCard(endCardModel(result, records, this.settings.value.gameplay.units), {
      replay: () => {
        this.game.quickRetry();
        this.noteRetry();
      },
      newWave: () => this.nextWave(),
      changeSpot: () => this.changeSpot(),
      menu: () => this.quitToMenu(),
    }, this.hintKeys().retry);
    if (this.stack.current === 'ride') this.ui.append(this.endCard);
  }

  private hideEndCard(): void {
    this.endCard?.remove();
    this.endCard = undefined;
  }

  /** Start the chosen session behind the loading card, then ride. */
  private async paddleOut(): Promise<void> {
    this.setLoadingText('loading.paddleOut');
    this.loading.classList.remove('is-hidden');
    const { spot, conditions } = this.surfChoice;
    const started = await this.game.startSurf(spot, conditions, this.seed, this.settings.value.gameplay.defaultCamera);
    this.loading.classList.add('is-hidden');
    if (!started) return;
    this.hideEndCard();
    this.tracker.reset();
    this.scene = 'ride';
    this.stack.reset('ride');
    this.show();
  }

  private setLoadingText(key: Parameters<typeof t>[0]): void {
    if (this.loadingText) this.loadingText.textContent = t(key);
  }

  /** The keys (or pad buttons) the prompts and hints name, from the player's bindings and last-used device. */
  private hintKeys(): HintKeys {
    // On touch the prompts name the on-screen buttons; paddling out again is the end card's Replay.
    if (this.touchActive()) {
      return { paddle: t('touch.paddle'), popUp: t('touch.popUp'), retry: t('touch.retry'), steer: '', pause: '' };
    }
    const { bindings } = this.settings.value.controls;
    const pad = this.controls.lastDevice === 'gamepad';
    const label = (action: Action) => (pad ? buttonLabel(bindings.gamepad[action][0]) : keyLabel(bindings.keyboard[action][0]));
    return {
      paddle: label('paddle'),
      popUp: label('popUp'),
      retry: label('retry'),
      steer: pad ? t('hud.stick') : `${label('steerLeft')} ${label('steerRight')}`,
      pause: label('pause'),
    };
  }

  /** The touch buttons: labelled from the strings, Pop up wired, shown per the Touch controls setting. */
  private bindTouch(): void {
    const label = (id: string, key: Parameters<typeof t>[0], aria = false) => {
      const button = document.getElementById(id);
      if (!button) return;
      if (aria) button.setAttribute('aria-label', t(key));
      else button.textContent = t(key);
    };
    label('touch-paddle', 'touch.paddle');
    label('touch-popup', 'touch.popUp');
    label('touch-crouch', 'touch.crouch');
    label('touch-left', 'touch.left', true);
    label('touch-right', 'touch.right', true);
    document.getElementById('touch-popup')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.controls.requestGetUp();
    });
  }

  private touchActive(): boolean {
    const { touchControls } = this.settings.value.gameplay;
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return touchControls === 'on' || (touchControls === 'auto' && coarse);
  }

  /** UI scale, reduced motion, high contrast, touch and handedness, from the settings. */
  private applyAccessibility(): void {
    const { accessibility, controls } = this.settings.value;
    applyAccessibility(this.root, accessibility, this.touchActive(), controls.handedness);
    this.game.setReducedMotion(accessibility.reducedMotion);
  }

  /** A ride on a phone held upright suggests turning it sideways, once per visit. */
  private needsRotateHint(): boolean {
    return !this.rotateDismissed && this.touchActive() && window.innerHeight > window.innerWidth;
  }

  private rotateHintElement(): HTMLElement {
    this.rotateHint ??= el('button', {
      class: 'rotate-hint',
      attrs: { type: 'button' },
      text: t('hud.rotate'),
      on: {
        click: () => {
          this.rotateDismissed = true;
          this.rotateHint?.remove();
        },
      },
    });
    return this.rotateHint;
  }

  /** The Wave Lab (dev tools): today's screen with the legacy wave; Esc pauses, and Quit returns to the menu. */
  private enterWaveLab(): void {
    this.scene = 'wavelab';
    this.game.enterWaveLab();
    this.stack.reset('wavelab');
    this.show();
  }

  /**
   * The menu's waves at a new spot. The menu never waits for them: on first launch
   * it stands on a gradient in the brand's colours and the sea fades in once ready.
   */
  private openBackdrop(): void {
    const first = this.scene === undefined;
    this.scene = 'backdrop';
    this.backdropSpot = nextBackdropSpot(this.backdropSpot);
    if (first) this.root.classList.add('is-scene-pending');
    void this.game.showBackdrop(this.backdropSpot).then((shown) => {
      if (!shown) return;
      this.root.classList.remove('is-scene-pending');
      this.warmup = 0;
      this.startBenchmarkIfNeeded();
    });
  }

  private startBenchmarkIfNeeded(): void {
    const { graphics, detected } = this.settings.value;
    if (!this.benchmark && needsDetection(graphics, detected, this.adapter)) {
      this.benchmark = new BenchmarkRecorder();
      this.warmup = 0;
    }
  }

  private finishBenchmark(): void {
    const result = { ...this.benchmark!.result(), adapter: this.adapter };
    this.benchmark = undefined;
    this.settings.setDetected(result);
    const { graphics } = this.settings.value;
    if (graphics.preset === 'auto') this.settings.update('graphics', withPreset(graphics, 'auto', result));
    if (result.lowPerformance && !this.settings.value.seen.lowPerformanceNotice) this.showLowPerformanceNotice();
  }

  private showLowPerformanceNotice(): void {
    const dismiss = el('button', {
      class: 'strip-button', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('notice.dismiss'),
      on: {
        click: () => {
          this.settings.markSeen('lowPerformanceNotice');
          this.notice?.remove();
          this.notice = undefined;
          this.menuInput.focusDefault();
        },
      },
    });
    this.notice = el('aside', { class: 'notice', attrs: { role: 'status' } },
      el('h2', { text: t('notice.lowPerformance.title') }),
      el('p', { text: t('notice.lowPerformance.body') }),
      dismiss);
    this.ui.append(this.notice);
  }
}
