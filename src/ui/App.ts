import { buttonLabel, keyLabel, type Action } from '../game/Bindings';
import type { Controls } from '../game/Controls';
import { BenchmarkRecorder, adapterName, needsDetection, withPreset } from '../game/Graphics';
import type { SettingsStore } from '../game/Settings';
import { DEFAULT_CONDITIONS, nextBackdropSpot, type SurfConditions } from '../game/SurfConditions';
import type { RideView } from '../scene/SpectatorCamera';
import { DEV_TOOLS } from '../devTools';
import type { SpotName } from '../wave/Bathymetry';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import packageJson from '../../package.json';
import { el } from './dom';
import { createMainMenu } from './MainMenu';
import { MenuInput } from './MenuInput';
import { RideHud, type HintKeys } from './RideHud';
import { ScreenStack, type ScreenId } from './ScreenStack';
import { t } from './strings';
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
    this.show();
  }

  /** Called by the game once per rendered frame: the gamepad, and the Auto benchmark while the menu's waves run. */
  frame(intervalMs: number, status?: SurfZoneStatus): void {
    this.menuInput.poll();
    if (this.stack.current === 'ride') {
      const { gameplay, seen } = this.settings.value;
      this.rideHud.update(this.game.rideStatus, gameplay.units, this.hintKeys(), !seen.rideHints);
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

  /** Esc, Start or the pause button: until the pause menu exists (Task 12), nothing. */
  pause(): void {}

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
    this.applyTouch();
    if (base === 'menu' && this.scene !== 'backdrop') this.openBackdrop();
    this.ui.replaceChildren(...this.render(current));
    if (this.notice) this.ui.append(this.notice);
    if (playing) this.game.canvas.focus({ preventScroll: true });
    else this.menuInput.focusDefault();
  }

  private render(id: ScreenId): Node[] {
    if (id === 'menu') {
      return [createMainMenu({
        surf: () => this.go('surf'),
        waveLab: () => {},
        logbook: () => {},
        settings: () => {},
      }, { devTools: DEV_TOOLS, version: packageJson.version })];
    }
    if (id === 'surf') {
      return [createSurfScreen(this.surfChoice, {
        change: (choice) => { this.surfChoice = choice; },
        paddleOut: () => void this.paddleOut(),
        back: () => this.back(),
      })];
    }
    if (id === 'ride') return [this.rideHud.root];
    return [];
  }

  /** Start the chosen session behind the loading card, then ride. */
  private async paddleOut(): Promise<void> {
    this.setLoadingText('loading.paddleOut');
    this.loading.classList.remove('is-hidden');
    const { spot, conditions } = this.surfChoice;
    const started = await this.game.startSurf(spot, conditions, this.seed, this.settings.value.gameplay.defaultCamera);
    this.loading.classList.add('is-hidden');
    if (!started) return;
    this.scene = 'ride';
    this.stack.reset('ride');
    this.show();
  }

  private setLoadingText(key: Parameters<typeof t>[0]): void {
    if (this.loadingText) this.loadingText.textContent = t(key);
  }

  /** The keys (or pad buttons) the prompts and hints name, from the player's bindings and last-used device. */
  private hintKeys(): HintKeys {
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
    label('touch-left', 'touch.left', true);
    label('touch-right', 'touch.right', true);
    document.getElementById('touch-popup')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.controls.requestGetUp();
    });
  }

  private applyTouch(): void {
    const { gameplay, controls } = this.settings.value;
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const touch = gameplay.touchControls === 'on' || (gameplay.touchControls === 'auto' && coarse);
    this.root.classList.toggle('has-touch', touch);
    this.root.classList.toggle('is-left-handed', controls.handedness === 'left');
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
    void this.game.showBackdrop(this.backdropSpot).then(() => {
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
