import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField, type WaveSettings } from '../wave/WaveModel';
import { BoardPhysics, type BoardDiagnostics, type PhysicsSettings, type RunState } from './BoardPhysics';

/** A scripted legacy run: paddle until the pop-up window, stand, then steer by `steer`. */
export interface TraceScenario {
  name: string;
  seed: number;
  wave: WaveSettings;
  physics: PhysicsSettings;
  frames: number;
  steer?: (board: BoardPhysics) => number;
}

export interface TraceResult {
  /** FNV-1a hash of every step's state: any change to the physics shows here. */
  hash: string;
  frames: number;
  state: RunState;
  outcome: string;
  catchTime: number | null;
  rideTime: number | null;
  rideDistance: number;
  peakSpeed: number;
  peakTurnRate: number;
  lowestBalance: number;
  fell: boolean;
}

const STATES: RunState[] = ['ready', 'paddling', 'pop-up-available', 'catching', 'riding', 'missed', 'wipeout', 'complete'];
const STEP = 1 / 60;

/** Default legacy settings and the presets the game offers (main.ts SPOT_SETTINGS). */
export const LEGACY_PRESETS: Record<'training' | 'point' | 'reef', WaveSettings> = {
  training: { ...DEFAULT_WAVE_SETTINGS },
  point: { ...DEFAULT_WAVE_SETTINGS, height: 1.8, period: 9, speed: 3.3, shelfStrength: 0.25, currentX: -0.2 },
  reef: { ...DEFAULT_WAVE_SETTINGS, height: 2.2, period: 6.5, speed: 4, shelfStrength: 0.65, currentX: 0.5, windX: 0.05 },
};

class Fnv1a {
  private hash = 0x811c9dc5;
  private readonly view = new DataView(new ArrayBuffer(8));

  add(value: number): void {
    this.view.setFloat64(0, value);
    for (let i = 0; i < 8; i += 1) {
      this.hash ^= this.view.getUint8(i);
      this.hash = Math.imul(this.hash, 0x01000193) >>> 0;
    }
  }

  get digest(): string {
    return this.hash.toString(16).padStart(8, '0');
  }
}

function hashDiagnostics(hash: Fnv1a, d: BoardDiagnostics): void {
  for (const value of [d.speed, d.rideDistance, d.waterline, d.submersion, d.catchProgress, d.localWaterSpeed, d.relativeSpeed,
    d.distanceToCrest, d.breaking, d.lipImpact, d.lateralSpeed, d.pathTurnRate, d.balance, d.flow]) hash.add(value);
  hash.add(STATES.indexOf(d.state));
}

/** Run a scenario on the legacy field and summarise it. */
export function runTrace(scenario: TraceScenario): TraceResult {
  const wave = new InteractiveWaterField(scenario.seed, { ...scenario.wave });
  const board = new BoardPhysics(wave, { ...scenario.physics });
  const hash = new Fnv1a();
  let catchTime: number | null = null;
  let rideTime: number | null = null;
  let peakSpeed = 0;
  let peakTurnRate = 0;
  let lowestBalance = 1;
  let frame = 0;
  for (; frame < scenario.frames; frame += 1) {
    const before = board.diagnostics();
    const diagnostics = board.step(STEP, {
      paddle: board.state === 'ready' || board.state === 'paddling',
      steer: board.state === 'riding' && scenario.steer ? scenario.steer(board) : 0,
      getUp: before.popUpAvailable,
    });
    for (const vector of [board.position, board.velocity, board.riderFall.position, board.riderFall.velocity]) {
      hash.add(vector.x);
      hash.add(vector.y);
      hash.add(vector.z);
    }
    hash.add(board.rotation.x);
    hash.add(board.rotation.y);
    hash.add(board.rotation.z);
    hash.add(board.riderFall.submersion);
    hashDiagnostics(hash, diagnostics);
    hash.add(wave.crestZ());
    hash.add(wave.heightAt(board.position.x, board.position.z));
    hash.add(wave.heightAt(0, wave.zMin + 20));
    if (catchTime === null && board.state === 'catching') catchTime = board.time;
    if (rideTime === null && board.state === 'riding') rideTime = board.time;
    peakSpeed = Math.max(peakSpeed, diagnostics.speed);
    if (board.state === 'riding') {
      peakTurnRate = Math.max(peakTurnRate, Math.abs(diagnostics.pathTurnRate));
      lowestBalance = Math.min(lowestBalance, diagnostics.balance);
    }
    if (board.state === 'missed' || board.state === 'complete') break;
  }
  return {
    hash: hash.digest,
    frames: frame,
    state: board.state,
    outcome: board.diagnostics().outcomeReason,
    catchTime,
    rideTime,
    rideDistance: board.rideDistance,
    peakSpeed,
    peakTurnRate,
    lowestBalance,
    fell: board.riderFall.active,
  };
}

const carve = (board: BoardPhysics) => Math.sin(board.time * 0.72) * 0.45;

/** The locked scenarios: the default catch on three seeds, a sustained carve, a forced wipeout, and both presets. */
export const TRACE_SCENARIOS: TraceScenario[] = [
  ...[1, 5, 9].map((seed) => ({ name: `training seed ${seed}`, seed, wave: LEGACY_PRESETS.training, physics: { paddleForce: 14, boardResponse: 1 }, frames: 900 })),
  { name: 'sustained carve', seed: 1, wave: { ...LEGACY_PRESETS.training, sustained: true }, physics: { paddleForce: 14, boardResponse: 1 }, frames: 1800, steer: carve },
  { name: 'sustained wipeout', seed: 1, wave: { ...LEGACY_PRESETS.training, sustained: true }, physics: { paddleForce: 14, boardResponse: 2 }, frames: 1500, steer: () => 1 },
  { name: 'point preset', seed: 3, wave: { ...LEGACY_PRESETS.point, sustained: true }, physics: { paddleForce: 14, boardResponse: 1 }, frames: 1200, steer: carve },
  { name: 'reef preset', seed: 7, wave: { ...LEGACY_PRESETS.reef, sustained: true }, physics: { paddleForce: 14, boardResponse: 1 }, frames: 1200, steer: carve },
];
