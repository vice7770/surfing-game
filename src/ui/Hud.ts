import type { BoardDiagnostics, RunState } from '../physics/BoardPhysics';
import type { WaveSettings } from '../wave/WaveModel';

const labels: Record<RunState, string> = {
  ready: 'READY',
  paddling: 'PADDLING',
  'pop-up-available': 'GET UP',
  catching: 'CATCHING',
  riding: 'RIDING',
  missed: 'WAVE MISSED',
  wipeout: 'WIPEOUT',
  complete: 'RIDE COMPLETE',
};

const outcomes: Partial<Record<RunState, string>> = {
  missed: 'The wave passed by. Replay to try the same conditions, or call a new wave.',
  wipeout: 'The board lost its line. Reset the same wave and try again.',
  complete: 'The wave ran on ahead. Ride complete—replay to work on your timing.',
};

export class Hud {
  private readonly state = document.querySelector<HTMLElement>('#run-state')!;
  private readonly seed = document.querySelector<HTMLElement>('#seed-label')!;
  private readonly speed = document.querySelector<HTMLElement>('#speed-value')!;
  private readonly waterline = document.querySelector<HTMLElement>('#waterline-value')!;
  private readonly submersion = document.querySelector<HTMLElement>('#submersion-value')!;
  private readonly period = document.querySelector<HTMLElement>('#period-value')!;
  private readonly outcome = document.querySelector<HTMLElement>('#outcome-message')!;
  private readonly getUp = document.querySelector<HTMLButtonElement>('#get-up-button')!;
  private readonly crest = document.querySelector<HTMLElement>('#crest-value')!;
  private readonly waterSpeed = document.querySelector<HTMLElement>('#water-speed-value')!;
  private readonly relativeSpeed = document.querySelector<HTMLElement>('#relative-speed-value')!;
  private readonly eligibility = document.querySelector<HTMLElement>('#eligibility-value')!;

  update(seed: number, settings: WaveSettings, diagnostics: BoardDiagnostics): void {
    this.state.textContent = labels[diagnostics.state];
    this.state.dataset.state = diagnostics.state;
    this.seed.textContent = `SEED ${seed.toString().padStart(4, '0')}`;
    this.speed.textContent = diagnostics.speed.toFixed(1);
    this.waterSpeed.textContent = diagnostics.localWaterSpeed.toFixed(1);
    this.relativeSpeed.textContent = diagnostics.relativeSpeed.toFixed(1);
    this.waterline.textContent = diagnostics.waterline.toFixed(2);
    this.submersion.textContent = Math.round(diagnostics.submersion * 100).toString();
    this.period.textContent = settings.period.toFixed(1);
    this.crest.textContent = `${diagnostics.distanceToCrest.toFixed(1)} m`;
    this.getUp.disabled = !diagnostics.popUpAvailable;
    this.getUp.classList.toggle('is-ready', diagnostics.popUpAvailable);
    this.eligibility.textContent = diagnostics.popUpAvailable ? 'NOW' : 'WAIT';
    this.outcome.textContent = outcomes[diagnostics.state] ?? '';
  }
}
