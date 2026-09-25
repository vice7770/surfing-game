import type { BoardInput } from '../physics/BoardPhysics';

export class Controls {
  private paddle = false;
  private left = false;
  private right = false;
  private readonly held = new Set<string>();
  private getUpRequested = false;

  constructor(onReplay: () => void, onGetUp: () => void) {
    window.addEventListener('keydown', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLButtonElement) return;
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'Enter') event.preventDefault();
      if (event.code === 'KeyR' && !this.held.has(event.code)) onReplay();
      if (event.code === 'Enter' && !this.held.has(event.code)) {
        this.getUpRequested = true;
        onGetUp();
      }
      this.held.add(event.code);
      this.readHeld();
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
      this.readHeld();
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.readHeld();
    });
  }

  get input(): BoardInput {
    return { paddle: this.paddle, steer: Number(this.right) - Number(this.left), getUp: this.getUpRequested };
  }

  requestGetUp(): void { this.getUpRequested = true; }
  consumeGetUp(): void { this.getUpRequested = false; }

  private readHeld(): void {
    this.paddle = this.held.has('Space') || this.held.has('ArrowUp');
    this.left = this.held.has('ArrowLeft') || this.held.has('KeyA');
    this.right = this.held.has('ArrowRight') || this.held.has('KeyD');
  }
}
