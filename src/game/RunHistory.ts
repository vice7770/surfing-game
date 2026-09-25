import type { RunState } from '../physics/BoardPhysics';
import type { WaveSettings } from '../wave/WaveModel';

export interface RunReport {
  seed: number;
  outcome: Extract<RunState, 'missed' | 'wipeout' | 'complete'>;
  reason: string;
  spot?: string;
  settings: WaveSettings & { paddleForce: number; boardResponse: number; sunHeight?: number; sunDirection?: number };
  elapsedSeconds: number;
  rideDistance: number;
  peakSpeed: number;
  peakBreaking: number;
  peakFlow: number;
  peakLipImpact?: number;
  lowestBalance: number;
  popUpAt: number | null;
  ridingAt: number | null;
}

interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'breakline.run-history.v2';
const MAX_RUNS = 12;

/** Session reports are retained locally for comparing conditions and outcomes. */
export class RunHistory {
  private entries: RunReport[] = [];

  constructor(private readonly storage?: HistoryStorage) {
    try {
      const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
      if (Array.isArray(parsed)) {
        this.entries = parsed.filter((value): value is RunReport =>
          value !== null && typeof value === 'object'
          && ['missed', 'wipeout', 'complete'].includes(value.outcome)
          && Number.isFinite(value.seed) && Number.isFinite(value.rideDistance)
          && typeof value.reason === 'string',
        ).slice(0, MAX_RUNS);
      }
    } catch {
      this.entries = [];
    }
  }

  get recent(): readonly RunReport[] { return this.entries; }

  add(report: RunReport): void {
    this.entries.unshift(report);
    this.entries = this.entries.slice(0, MAX_RUNS);
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.entries)); }
    catch { /* Storage may be unavailable; the in-memory log still works. */ }
  }
}
