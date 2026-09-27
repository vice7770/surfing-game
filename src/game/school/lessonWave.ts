import type { RiderPlacement } from '../../physics/RideSession';
import type { SurfZoneConfig } from '../../wave/SurfZoneSimulation';
import { decompress } from '../../wave/surfZoneState';
import { LESSON_WAVES } from './lessonWaves';

/** A recorded start (spec L2): standing in the pocket, prone on a wave already carrying the board, or prone and waiting for it. */
export type RecordedStart = 'pocket' | 'caught' | 'waiting';
/** Where an attempt starts: a recorded start, or the inside (the wipeout spec's Duck-dive lesson), on the waiting start's sea. */
export type LessonStart = RecordedStart | 'inside';

/**
 * The inside start: the waiting start's recorded sea, with the rider lying `along`
 * m further in along the waves' travel, heading out to sea, at rest. Measured on
 * the stage 2 recording: its broken water reaches there 6.0 s after the start,
 * 1.1 m high, in about 1.7 m of water (a 1–1.5 m bore, as the spec's check).
 */
export const INSIDE = { sea: 'waiting', along: 33 } as const satisfies { sea: RecordedStart; along: number };

/** The recorded start whose sea a start runs on. */
export function recordedStart(start: LessonStart): RecordedStart {
  return start === 'inside' ? INSIDE.sea : start;
}

/** Where the rider goes for a start. */
export function startPlacement(wave: LessonWave, start: LessonStart): RiderPlacement {
  if (start !== 'inside') return wave.placements[start];
  const from = wave.placements[INSIDE.sea];
  const radians = (wave.config.directionDegrees * Math.PI) / 180;
  const x = Math.sin(radians);
  const z = Math.cos(radians);
  return { x: from.x + x * INSIDE.along, z: from.z + z * INSIDE.along, heading: Math.atan2(-x, -z), speed: 0, phase: 'prone' };
}

/**
 * The Surf School's wave (spec L2): one wave the autopilot rode, recorded at
 * three moments (as it began paddling, at the pop-up cue, and just after it
 * stood), each shipped as an asset, with the sea it was recorded on and where the
 * rider was at each. Every attempt restores its start's state and places the
 * rider there, so every attempt meets the same wave.
 */
export interface LessonWave {
  /** The solver stage it was recorded on; the school runs stage 2 (`schoolWave`). */
  stage: 1 | 2;
  /** The sea it was recorded on, kept here so a later change to the practice swell cannot break the recording. */
  config: {
    spot: 'canyon';
    seed: number;
    significantHeight: number;
    peakPeriod: number;
    directionDegrees: number;
    spreading: number;
    bandwidth?: number;
    tide: number;
    windSpeed: number;
    componentCount: number;
  };
  /** Each start's recorded state, deflated, under `public/`. */
  assets: Record<RecordedStart, string>;
  placements: Record<RecordedStart, RiderPlacement>;
  /** True until the riding work's reference wave backs the recording (a dev note says so). */
  provisional: boolean;
  /** What the recording script's autopilot got from each start. */
  checks: Record<RecordedStart, string>;
}

/** The surf zone to build for a lesson wave: its recorded sea, no spin-up (the recorded state replaces it). */
export function lessonConfig(wave: LessonWave): SurfZoneConfig {
  return { ...wave.config, stage: wave.stage, compute: 'auto', spinUpPeriods: 0 };
}

/**
 * The school's wave: the stage 2 recording, on every machine (the user's call,
 * 2026-09-27). Stage 1's recording could not be caught, so a machine whose
 * graphics run the Fast water still takes its lessons on stage 2: on the GPU
 * where there is one, else on the CPU, slower than real time where it cannot keep up.
 */
export function schoolWave(waves: readonly LessonWave[] = LESSON_WAVES): LessonWave {
  const wave = waves.find((candidate) => candidate.stage === 2);
  if (!wave) throw new Error('No stage 2 lesson wave recorded');
  return wave;
}

/** A start's recorded sea, fetched and inflated: an encoded state for a surf zone's handover or restore. */
export async function loadLessonSea(wave: LessonWave, start: LessonStart, fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<Uint8Array> {
  const asset = wave.assets[recordedStart(start)];
  const response = await fetcher(asset);
  if (!response.ok) throw new Error(`The lesson wave ${asset} did not load (${response.status})`);
  return decompress(new Uint8Array(await response.arrayBuffer()), true);
}
