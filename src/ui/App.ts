import type { Controls } from '../game/Controls';
import type { SettingsStore } from '../game/Settings';
import { el, icon } from './dom';
import { ICONS } from './icons';
import { MenuInput } from './MenuInput';
import { ScreenStack, type ScreenId } from './ScreenStack';
import { t } from './strings';

/** What the menus ask of the game (implemented by `SurfGame` in main.ts). */
export interface GameHost {
  readonly canvas: HTMLCanvasElement;
}

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

  constructor(
    private readonly game: GameHost,
    private readonly controls: Controls,
    readonly settings: SettingsStore,
    options: { startInWaveLab: boolean },
  ) {
    this.stack = new ScreenStack(options.startInWaveLab ? 'wavelab' : 'menu');
    this.menuInput = new MenuInput({ root: () => this.ui.querySelector<HTMLElement>('.screen'), onBack: () => this.back() });
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = t('loading.break');
    this.show();
  }

  /** Called by the game once per rendered frame. */
  frame(_intervalMs: number): void {
    this.menuInput.poll();
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
    this.ui.replaceChildren(...this.render(current));
    if (playing) this.game.canvas.focus({ preventScroll: true });
    else this.menuInput.focusDefault();
  }

  private render(id: ScreenId): Node[] {
    if (id === 'menu') return [this.menu()];
    return [];
  }

  /** Placeholder until the main menu (plan P8, Task 10). */
  private menu(): HTMLElement {
    const tile = (label: Parameters<typeof t>[0], name: keyof typeof ICONS) =>
      el('button', { class: 'tile', attrs: { type: 'button' }, dataset: { nav: '' } }, icon(ICONS[name]), el('span', { text: t(label) }));
    return el('section', { class: 'screen screen-menu', attrs: { 'aria-label': t('app.name') } },
      el('div', { class: 'tiles' },
        tile('menu.surf', 'surf'), tile('menu.waveLab', 'waveLab'), tile('menu.multiplayer', 'multiplayer'),
        tile('menu.logbook', 'logbook'), tile('menu.settings', 'settings')));
  }
}
