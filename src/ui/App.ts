import type { Controls } from '../game/Controls';
import { BenchmarkRecorder, adapterName, needsDetection, withPreset } from '../game/Graphics';
import type { SettingsStore } from '../game/Settings';
import { nextBackdropSpot } from '../game/SurfConditions';
import { DEV_TOOLS } from '../devTools';
import type { SpotName } from '../wave/Bathymetry';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import packageJson from '../../package.json';
import { el } from './dom';
import { createMainMenu } from './MainMenu';
import { MenuInput } from './MenuInput';
import { ScreenStack, type ScreenId } from './ScreenStack';
import { t } from './strings';

/** What the menus ask of the game (implemented by `SurfGame` in main.ts). */
export interface GameHost {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** Whether the menu's waves are running (not spinning up, not a still frame). */
  readonly backdropRunning: boolean;
  showBackdrop(spot: SpotName): Promise<boolean>;
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
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = t('loading.break');
    this.show();
  }

  /** Called by the game once per rendered frame: the gamepad, and the Auto benchmark while the menu's waves run. */
  frame(intervalMs: number, status?: SurfZoneStatus): void {
    this.menuInput.poll();
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
    if (base === 'menu' && this.scene !== 'backdrop') this.openBackdrop();
    this.ui.replaceChildren(...this.render(current));
    if (this.notice) this.ui.append(this.notice);
    if (playing) this.game.canvas.focus({ preventScroll: true });
    else this.menuInput.focusDefault();
  }

  private render(id: ScreenId): Node[] {
    if (id === 'menu') {
      return [createMainMenu({
        surf: () => {},
        waveLab: () => {},
        logbook: () => {},
        settings: () => {},
      }, { devTools: DEV_TOOLS, version: packageJson.version })];
    }
    return [];
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
