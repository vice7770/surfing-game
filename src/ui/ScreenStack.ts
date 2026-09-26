/** Every screen of the game (plan P8). `menu`, `ride` and `wavelab` show a scene; the rest are panels over one. */
export type ScreenId = 'menu' | 'surf' | 'logbook' | 'settings' | 'ride' | 'pause' | 'wavelab';

const SCENES: ReadonlySet<ScreenId> = new Set(['menu', 'ride', 'wavelab']);

/** Where the player is, and the way back: Esc or B pops one screen. */
export class ScreenStack {
  private screens: ScreenId[];

  constructor(root: ScreenId) {
    this.screens = [root];
  }

  get current(): ScreenId {
    return this.screens[this.screens.length - 1];
  }

  get stack(): readonly ScreenId[] {
    return this.screens;
  }

  /** The scene under any panels: the top-most menu, ride or Wave Lab. */
  get base(): ScreenId {
    for (let i = this.screens.length - 1; i >= 0; i -= 1) if (SCENES.has(this.screens[i])) return this.screens[i];
    return this.screens[0];
  }

  push(id: ScreenId): void {
    this.screens.push(id);
  }

  /** Close the current screen; undefined when already at the root. */
  back(): ScreenId | undefined {
    if (this.screens.length <= 1) return undefined;
    this.screens.pop();
    return this.current;
  }

  reset(id: ScreenId): void {
    this.screens = [id];
  }
}
