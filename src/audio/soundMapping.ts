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
  /** The rider, with the phase of the frame before, so a change is heard once. */
  ride?: { phase: RiderPhase; previousPhase: RiderPhase; speed: number };
}

export type LoopId = 'roar' | 'distant' | 'wind' | 'rush' | 'rail' | 'bubbles';
export type OneShotId = 'lipJet' | 'lipRoller' | 'paddle' | 'popUp' | 'plunge';
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

// Provisional (by ear): the roar's reference power, m⁴/s, and how many decades above it reach full level.
const ROAR_REF = 5;
const ROAR_DECADES = 2.5;
// Provisional (by ear): distant surf from Hs 0.3 m (silent) to 3 m (full).
const DISTANT_MIN_HS = 0.3;
const DISTANT_MAX_HS = 3;
// Provisional (by ear): wind reaches full level at 12 m/s, the Wind slider's end.
const WIND_FULL = 12;
// Provisional (by ear): the board's rush starts at 0.5 m/s and is full at 12 m/s; rail spray is full at 12 m²/s² of sideslip × speed.
const RUSH_START = 0.5;
const RUSH_FULL = 12;
const RAIL_FULL = 12;
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

export function soundTargets(frame: SoundFrame): SoundTargets {
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
  if (!paused) {
    for (let i = 0; i < frame.lipHitCount; i += 1) {
      const o = i * LIP_HIT_STRIDE;
      const volume = frame.lipHits[o + 2];
      const impact = frame.lipHits[o + 3];
      oneShots.push({
        id: impact >= JET_SPEED ? 'lipJet' : 'lipRoller', rate: 1,
        gain: decibelsLike(volume * impact * impact, LIP_REF, LIP_DECADES),
        position: { x: frame.lipHits[o], y: 0, z: frame.lipHits[o + 1] },
      });
    }
    for (let i = 0; i < frame.strokeHitCount; i += 1) {
      const o = i * STROKE_HIT_STRIDE;
      oneShots.push({
        id: 'paddle', rate: 1,
        gain: decibelsLike(frame.strokeHits[o + 2], PADDLE_REF, PADDLE_DECADES),
        position: { x: frame.strokeHits[o], y: 0, z: frame.strokeHits[o + 1] },
      });
    }
    const ride = frame.ride;
    if (ride && ride.phase !== ride.previousPhase) {
      const where = boardPosition ?? { x: listener.x, y: listener.y, z: listener.z };
      if (ride.previousPhase === 'prone' && ride.phase === 'push') oneShots.push({ id: 'popUp', rate: 1, gain: POP_UP_LEVEL, position: where });
      if (ride.phase === 'fallen') oneShots.push({ id: 'plunge', rate: 1, gain: clamp01(0.4 + ride.speed / 15), position: where });
    }
  }
  oneShots.sort((a, b) => b.gain - a.gain);
  if (oneShots.length > ONE_SHOT_CAP) oneShots.length = ONE_SHOT_CAP;

  return {
    loops,
    oneShots,
    muffle: listener.underwater ? 1 : paused ? PAUSED_MUFFLE : 0,
    playbackRate: frame.timeScale,
  };
}
