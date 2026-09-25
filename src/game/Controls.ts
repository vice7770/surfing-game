import type { BoardInput } from '../physics/BoardPhysics';

export class Controls {
  private paddle = false;
  private left = false;
  private right = false;
  private touchPaddle = false;
  private touchLeft = false;
  private touchRight = false;
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
      this.touchPaddle = false;
      this.touchLeft = false;
      this.touchRight = false;
    });
    this.bindTouchButton('touch-paddle', (held) => { this.touchPaddle = held; });
    this.bindTouchButton('touch-left', (held) => { this.touchLeft = held; });
    this.bindTouchButton('touch-right', (held) => { this.touchRight = held; });
  }

  get input(): BoardInput {
    return {
      paddle: this.paddle || this.touchPaddle,
      steer: Number(this.right || this.touchRight) - Number(this.left || this.touchLeft),
      getUp: this.getUpRequested,
    };
  }

  requestGetUp(): void { this.getUpRequested = true; }
  consumeGetUp(): void { this.getUpRequested = false; }

  private bindTouchButton(id: string, setHeld: (held: boolean) => void): void {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setHeld(true);
      button.classList.add('is-held');
    });
    const release = () => {
      setHeld(false);
      button.classList.remove('is-held');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }

  private readHeld(): void {
    this.paddle = this.held.has('Space') || this.held.has('ArrowUp');
    this.left = this.held.has('ArrowLeft') || this.held.has('KeyA');
    this.right = this.held.has('ArrowRight') || this.held.has('KeyD');
  }
}
