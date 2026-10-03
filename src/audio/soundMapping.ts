import { LIP_HIT_STRIDE, ROAR_SECTORS, STROKE_HIT_STRIDE, type RIDER_PHASES } from '../wave/SurfZoneRunner';

/**
 * The physics to sound (S1): one frame of what the surf zone reports, and the
 * camera, turned into loop levels, places and one-shot events. Nothing here is
 * scripted: every sound has a physical cause in the frame. The constants that
 * turn a physical quantity into loudness are provisional (by ear): they are
 * tuned in the user's listening playtest.
 */
type RiderPhase = (typeof RIDER_PHASES)[number];

export interface SoundFrame {
  /** Seconds of real time since the last frame, and the simulation's time scale (0.4–1). */
  dt: number;
  timeScale: number;
  paused: boolean;
  listener: { x: number; y: number; z: number; underwater: boolean };
  /** `ROAR_SECTORS` × (power, x, z) from the surf zone's snapshot. */
  roar: Float32Array;
  lipHits: Float32Array;
  lipHitCount: number;
  strokeHits: Float32Array;
  strokeHitCount: number;
  /** The swell's significant height, m. */
  significantHeight: number;
  /** Local wind, m/s, positive onshore. */
  windSpeed: number;
  /** The board, when there is one: its place, speed (m/s) and speed across its length (m/s). */
  board?: { x: number; y: number; z: number; speed: number; sideslip: number };
  /**
   * The rider, with the phase of the frame before, so a change is heard once; and
   * for the wipeout spec the duck-dive's press (and the frame before's), whether
   * the leash has snapped (and had), and the hardest board knock since, N·s.
   */
  ride?: {
    phase: RiderPhase; previousPhase: RiderPhase; speed: number;
    duck?: number; previousDuck?: number; leashSnapped?: boolean; previouslySnapped?: boolean; knock?: number;
    /** The fallen rider's head is under water (Part B): the world muffles, as for the camera under water. */
    headUnder?: boolean;
  };
}

export type LoopId = 'roar' | 'distant' | 'wind' | 'rush' | 'rail' | 'bubbles';
export type OneShotId = 'lipJet' | 'lipRoller' | 'paddle' | 'popUp' | 'plunge' | 'leashSnap' | 'knock' | 'duckDive';
type Position = { x: number; y: number; z: number };

export interface SoundTargets {
  /** Every loop, always listed, so a silent one ramps down rather than vanishing. */
  loops: { id: LoopId; key: string; gain: number; rate: number; position?: Position }[];
  oneShots: { id: OneShotId; gain: number; rate: number; position: Position }[];
  /** 0 clear … 1 fully muffled (under water). */
  muffle: number;
  /** Playback rate of everything: the simulation's time scale. */
  playbackRate: number;
}

/** At most this many one-shots start in one frame; the quietest are dropped. */
export const ONE_SHOT_CAP = 32;

/**
 * Loops heard without the world's muffle (the underwater low-pass, the paused bed):
 * they are made under water, so the water's filter must not colour them. The muffle
 * is for what the camera hears through the surface.
 */
export const UNMUFFLED_LOOPS: readonly LoopId[] = ['bubbles'];

/**
 * How much a sound that fires often varies from shot to shot (provisional, by
 * ear): its pitch by up to this many semitones either way, its level by up to
 * this many dB. Together with a pool of recordings it keeps a landing or a stroke
 * from repeating itself.
 */
export const ONE_SHOT_JITTER: Partial<Record<OneShotId, { semitones: number; gainDb: number }>> = {
  lipJet: { semitones: 1, gainDb: 1.5 },
  lipRoller: { semitones: 1, gainDb: 0 },
  paddle: { semitones: 1.5, gainDb: 1.5 },
};

/** A shot's playback-rate and level factors from two uniform draws in [0, 1): 0.5 is no change. */
export function oneShotJitter(id: OneShotId, pitchDraw: number, levelDraw: number): { rate: number; gain: number } {
  const jitter = ONE_SHOT_JITTER[id];
  if (!jitter) return { rate: 1, gain: 1 };
  return {
    rate: 2 ** ((jitter.semitones * (2 * pitchDraw - 1)) / 12),
    gain: 10 ** ((jitter.gainDb * (2 * levelDraw - 1)) / 20),
  };
}

/**
 * Air takes the treble out of a sound with distance. The cutoff where the air has
 * absorbed 3 dB falls as distance^−0.56: absorption grows steeply with frequency
 * (ISO 9613-1: of the order of 5 dB/km at 1 kHz and 25 dB/km at 4 kHz in mild, humid
 * air), roughly as f^1.8 above 2 kHz. Clear within the panner's reference distance,
 * and never below AIR_FLOOR_HZ, so a far sector is dull, not gone. Provisional (by
 * ear): the constants are a fit to that shape, tuned in the listening playtest.
 */
export const AIR_CLEAR_HZ = 18000;
export const AIR_FLOOR_HZ = 900;
const AIR_REFERENCE_M = 8;
const AIR_KM_CUTOFF_HZ = 1230;
export function airCutoff(distance: number): number {
  if (!(distance > AIR_REFERENCE_M)) return AIR_CLEAR_HZ;
  const cutoff = AIR_KM_CUTOFF_HZ * (distance / 1000) ** -0.56;
  return Math.min(AIR_CLEAR_HZ, Math.max(AIR_FLOOR_HZ, cutoff));
}

/**
 * The shortest time between two one-shots of a kind in one place, s
 * (provisional, by ear). Lip landings arrive by the hundred as a wave throws, and
 * a paddling hand pulls for many steps: they gather into a few crashes a second
 * and one splash per stroke, each carrying the energy it gathered.
 */
export const MIN_INTERVAL: Record<OneShotId, number> = {
  lipJet: 0.18, lipRoller: 0.25, paddle: 0.45, popUp: 0, plunge: 0, leashSnap: 0, knock: 0.15, duckDive: 0.5,
};
/**
 * The wipeout spec's sounds (provisional, by ear): a board knock on the swimmer
 * is heard from KNOCK_MIN, N·s, full at KNOCK_FULL; the snap and the duck-dive's
 * plunge at their own levels.
 */
const KNOCK_MIN = 8;
const KNOCK_FULL = 60;
const SNAP_LEVEL = 0.85;
const DUCK_LEVEL = 0.55;
/** Landings this close together, m, along and across shore, are heard as one place. */
const PLACE = 10;

interface Impulse {
  id: OneShotId;
  key: string;
  amount: number;
  /** A lip crash's own lip: the water its jet threw, m³ (the Teahupo'o Reef, Part C). */
  size?: number;
  x: number;
  y: number;
  z: number;
}

interface Gathered {
  id: OneShotId;
  amount: number;
  /** The biggest lip gathered, m³. */
  size: number;
  /** Amount-weighted sums of the places and of the weights, so a crash sounds from where most of its water landed. */
  w: number;
  wx: number;
  wy: number;
  wz: number;
}

/**
 * Gathers one-shot impulses by kind and place, and releases each place at most
 * every `MIN_INTERVAL` with all it gathered. Keep one across frames; a new one
 * releases everything at once (a single frame, as in tests).
 */
export class OneShotShaper {
  private readonly pending = new Map<string, Gathered>();
  private readonly last = new Map<string, number>();
  private clock = 0;

  release(impulses: readonly Impulse[], dt: number): Gathered[] {
    this.clock += dt;
    for (const impulse of impulses) {
      const gathered = this.pending.get(impulse.key) ?? { id: impulse.id, amount: 0, size: 0, w: 0, wx: 0, wy: 0, wz: 0 };
      const weight = Math.max(impulse.amount, 1e-9);
      gathered.amount += impulse.amount;
      gathered.size = Math.max(gathered.size, impulse.size ?? 0);
      gathered.w += weight;
      gathered.wx += impulse.x * weight;
      gathered.wy += impulse.y * weight;
      gathered.wz += impulse.z * weight;
      this.pending.set(impulse.key, gathered);
    }
    const released: Gathered[] = [];
    for (const [key, gathered] of this.pending) {
      if (this.clock - (this.last.get(key) ?? -Infinity) < MIN_INTERVAL[gathered.id]) continue;
      released.push(gathered);
      this.pending.delete(key);
      this.last.set(key, this.clock);
    }
    // Places quiet for a while are forgotten.
    for (const [key, at] of this.last) if (this.clock - at > 2) this.last.delete(key);
    return released;
  }

  clear(): void {
    this.pending.clear();
  }
}

// Provisional (by ear): the roar's reference power, m⁴/s, and how many decades above it reach full level.
// The sound report puts a practice set's sectors at a few hundred m⁴/s: this leaves them room to swell.
const ROAR_REF = 20;
const ROAR_DECADES = 3;
// Provisional (by ear): distant surf from Hs 0.3 m (silent) to 3 m (full).
const DISTANT_MIN_HS = 0.3;
const DISTANT_MAX_HS = 3;
// Provisional (by ear): wind reaches full level at 12 m/s, the Wind slider's end.
const WIND_FULL = 12;
// Provisional (by ear): the board's rush starts at 0.5 m/s and is full at 12 m/s; rail spray is full at 12 m²/s² of sideslip × speed.
const RUSH_START = 0.5;
const RUSH_FULL = 12;
const RAIL_FULL = 30;
const BUBBLES_LEVEL = 0.6;
// Provisional (by ear): a landing is a plunging jet from this impact speed, m/s; its loudness follows volume × speed² (energy).
const JET_SPEED = 4;
const LIP_REF = 0.5;
const LIP_DECADES = 2;
// Provisional (by ear): a paddle stroke's loudness follows its work, J.
const PADDLE_REF = 10;
const PADDLE_DECADES = 2;
const POP_UP_LEVEL = 0.6;
const PAUSED_BED = 0.25;
const PAUSED_MUFFLE = 0.85;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const decibelsLike = (value: number, reference: number, decades: number) => clamp01(Math.log10(1 + Math.max(0, value) / reference) / decades);

/**
 * A crash's pitch falls as its lip grows (the Teahupo'o Reef, Part C). A bubble rings at a frequency inversely
 * proportional to its radius (Minnaert 1933), and a lip's trapped air scales with its water V, so the playback rate
 * goes as V^(−1/3) from the reference down, no lower than an octave. The reference sits above a Practice lip at
 * every spot, so only heavy lips deepen (reference and floor provisional).
 */
export const CRASH_SIZE_REFERENCE = 2;
export const CRASH_RATE_MIN = 0.5;

function crashRate(gathered: Gathered): number {
  if (gathered.id !== 'lipJet' && gathered.id !== 'lipRoller') return 1;
  return Math.min(1, Math.max(CRASH_RATE_MIN, Math.cbrt(CRASH_SIZE_REFERENCE / Math.max(gathered.size, 1e-9))));
}

/** The impulse's loudness: lip crashes by their energy (volume × speed²), strokes by their work, the plunge by the speed. */
function impulseGain(id: OneShotId, amount: number): number {
  if (id === 'lipJet' || id === 'lipRoller') return decibelsLike(amount, LIP_REF, LIP_DECADES);
  if (id === 'paddle') return decibelsLike(amount, PADDLE_REF, PADDLE_DECADES);
  if (id === 'popUp') return POP_UP_LEVEL;
  if (id === 'leashSnap') return SNAP_LEVEL;
  if (id === 'duckDive') return DUCK_LEVEL;
  if (id === 'knock') return clamp01(0.25 + (0.75 * (amount - KNOCK_MIN)) / (KNOCK_FULL - KNOCK_MIN));
  return clamp01(0.4 + amount / 15);
}

export function soundTargets(frame: SoundFrame, shaper = new OneShotShaper()): SoundTargets {
  const { paused, listener, board } = frame;
  const bed = paused ? PAUSED_BED : 1;
  const loops: SoundTargets['loops'] = [];
  for (let sector = 0; sector < ROAR_SECTORS; sector += 1) {
    const power = frame.roar[sector * 3];
    loops.push({
      id: 'roar', key: `roar:${sector}`, rate: 1,
      gain: bed * decibelsLike(power, ROAR_REF, ROAR_DECADES),
      ...(power > 0 ? { position: { x: frame.roar[sector * 3 + 1], y: 0, z: frame.roar[sector * 3 + 2] } } : {}),
    });
  }
  const windLevel = clamp01(Math.abs(frame.windSpeed) / WIND_FULL);
  loops.push(
    { id: 'distant', key: 'distant', rate: 1, gain: bed * clamp01((frame.significantHeight - DISTANT_MIN_HS) / (DISTANT_MAX_HS - DISTANT_MIN_HS)) },
    { id: 'wind', key: 'wind', rate: 0.9 + 0.2 * windLevel, gain: bed * windLevel },
  );
  const boardPosition = board ? { x: board.x, y: board.y, z: board.z } : undefined;
  const speed = board?.speed ?? 0;
  loops.push(
    {
      id: 'rush', key: 'rush', rate: 0.8 + 0.5 * clamp01(speed / RUSH_FULL),
      gain: paused || !board ? 0 : clamp01((speed - RUSH_START) / (RUSH_FULL - RUSH_START)),
      ...(boardPosition ? { position: boardPosition } : {}),
    },
    {
      id: 'rail', key: 'rail', rate: 1,
      gain: paused || !board ? 0 : clamp01((Math.abs(board.sideslip) * speed) / RAIL_FULL),
      ...(boardPosition ? { position: boardPosition } : {}),
    },
    { id: 'bubbles', key: 'bubbles', rate: 1, gain: listener.underwater ? bed * BUBBLES_LEVEL : 0 },
  );

  const oneShots: SoundTargets['oneShots'] = [];
  if (paused) {
    shaper.clear();
  } else {
    const impulses: Impulse[] = [];
    for (let i = 0; i < frame.lipHitCount; i += 1) {
      const o = i * LIP_HIT_STRIDE;
      const x = frame.lipHits[o];
      const z = frame.lipHits[o + 1];
      const volume = frame.lipHits[o + 2];
      const impact = frame.lipHits[o + 3];
      const lip = frame.lipHits[o + 4];
      const id: OneShotId = impact >= JET_SPEED ? 'lipJet' : 'lipRoller';
      impulses.push({ id, key: `${id}:${Math.round(x / PLACE)}:${Math.round(z / PLACE)}`, amount: volume * impact * impact, size: lip, x, y: 0, z });
    }
    for (let i = 0; i < frame.strokeHitCount; i += 1) {
      const o = i * STROKE_HIT_STRIDE;
      impulses.push({ id: 'paddle', key: 'paddle', amount: frame.strokeHits[o + 2], x: frame.strokeHits[o], y: 0, z: frame.strokeHits[o + 1] });
    }
    const ride = frame.ride;
    if (ride && ride.phase !== ride.previousPhase) {
      const where = boardPosition ?? { x: listener.x, y: listener.y, z: listener.z };
      if (ride.previousPhase === 'prone' && ride.phase === 'push') impulses.push({ id: 'popUp', key: 'popUp', amount: 1, ...where });
      if (ride.phase === 'fallen') impulses.push({ id: 'plunge', key: 'plunge', amount: ride.speed, ...where });
    }
    if (ride) {
      const where = boardPosition ?? { x: listener.x, y: listener.y, z: listener.z };
      if (ride.leashSnapped && ride.previouslySnapped === false) impulses.push({ id: 'leashSnap', key: 'leashSnap', amount: 1, ...where });
      if ((ride.knock ?? 0) >= KNOCK_MIN) impulses.push({ id: 'knock', key: 'knock', amount: ride.knock!, ...where });
      if ((ride.duck ?? 0) >= 0.5 && (ride.previousDuck ?? 0) < 0.5) impulses.push({ id: 'duckDive', key: 'duckDive', amount: 1, ...where });
    }
    for (const gathered of shaper.release(impulses, frame.dt)) {
      oneShots.push({
        id: gathered.id, rate: crashRate(gathered),
        gain: impulseGain(gathered.id, gathered.amount),
        position: { x: gathered.wx / gathered.w, y: gathered.wy / gathered.w, z: gathered.wz / gathered.w },
      });
    }
  }
  oneShots.sort((a, b) => b.gain - a.gain);
  if (oneShots.length > ONE_SHOT_CAP) oneShots.length = ONE_SHOT_CAP;

  return {
    loops,
    oneShots,
    muffle: listener.underwater || frame.ride?.headUnder ? 1 : paused ? PAUSED_MUFFLE : 0,
    playbackRate: frame.timeScale,
  };
}
