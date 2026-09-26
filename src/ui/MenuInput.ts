import { readPads, type PadState } from '../game/Bindings';
import { spatialNext, type Direction } from './spatialNav';

const KEY_DIRECTIONS: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const PAD_DIRECTIONS: [number, Direction][] = [[12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']];
const CONFIRM = 0;
const BACK = 1;
/** Holding a direction repeats the move this often, ms. */
const REPEAT_MS = 180;
/** The left stick counts as a D-pad press beyond this deflection. */
const STICK_PRESS = 0.55;

function padDirection(pads: readonly PadState[]): Direction | undefined {
  for (const pad of pads) {
    for (const [button, direction] of PAD_DIRECTIONS) if (pad.buttons[button]) return direction;
    const [x = 0, y = 0] = pad.axes;
    if (Math.abs(x) > STICK_PRESS || Math.abs(y) > STICK_PRESS) {
      return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    }
  }
  return undefined;
}

/**
 * Keyboard and gamepad navigation for the menus (plan P8): arrows or the D-pad
 * move focus between `[data-nav]` items by their position on screen, Enter or A
 * clicks, Esc or B goes back. Off while riding, when the ride controls take over.
 */
export class MenuInput {
  active = true;
  private previous = new Set<number>();
  private held?: Direction;
  private repeatAt = 0;

  constructor(private readonly options: {
    root: () => HTMLElement | null;
    onBack(): void;
    pads?: () => PadState[];
    target?: EventTarget;
  }) {
    (options.target ?? window).addEventListener('keydown', (event) => this.keyDown(event as KeyboardEvent));
  }

  /** Focus the screen's default item, or its first. */
  focusDefault(): void {
    const root = this.options.root();
    const target = root?.querySelector<HTMLElement>('[data-nav-default]:not([disabled])') ?? this.items()[0];
    target?.focus({ preventScroll: true });
  }

  /** Read the gamepads once a frame. */
  poll(now = performance.now()): void {
    const pads = (this.options.pads ?? (() => readPads()))();
    const pressed = new Set<number>();
    for (const pad of pads) pad.buttons.forEach((down, index) => { if (down) pressed.add(index); });
    const direction = padDirection(pads);
    if (this.active) {
      if (pressed.has(CONFIRM) && !this.previous.has(CONFIRM)) this.focused()?.click();
      if (pressed.has(BACK) && !this.previous.has(BACK)) this.options.onBack();
      if (direction && (direction !== this.held || now >= this.repeatAt)) {
        this.move(direction);
        this.repeatAt = now + (direction === this.held ? REPEAT_MS : REPEAT_MS * 2);
      }
    }
    this.held = direction;
    this.previous = pressed;
  }

  private keyDown(event: KeyboardEvent): void {
    // A key the ride controls already acted on (Esc that just paused) is not also a menu key.
    if (!this.active || event.defaultPrevented) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      this.options.onBack();
      return;
    }
    const direction = KEY_DIRECTIONS[event.code];
    if (!direction) return;
    const target = event.target as HTMLInputElement | null;
    // A slider keeps left and right for its value.
    if (target?.tagName === 'INPUT' && target.type === 'range' && (direction === 'left' || direction === 'right')) return;
    event.preventDefault();
    this.move(direction);
  }

  private items(): HTMLElement[] {
    const root = this.options.root();
    if (!root) return [];
    return [...root.querySelectorAll<HTMLElement>('[data-nav]:not([disabled])')].filter((item) => item.getClientRects().length > 0);
  }

  private focused(): HTMLElement | undefined {
    const active = document.activeElement as HTMLElement | null;
    return active && this.options.root()?.contains(active) ? active : undefined;
  }

  private move(direction: Direction): void {
    const items = this.items();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) {
      this.focusDefault();
      return;
    }
    const next = items[spatialNext(items.map((item) => item.getBoundingClientRect()), index, direction)];
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
