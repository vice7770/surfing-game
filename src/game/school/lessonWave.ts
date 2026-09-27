import type { RiderPlacement } from '../../physics/RideSession';
import type { SurfZoneConfig } from '../../wave/SurfZoneSimulation';
import { decompress } from '../../wave/surfZoneState';
import { LESSON_WAVES } from './lessonWaves';

/** Where an attempt starts (spec L2): standing in the pocket, prone on a wave already carrying the board, or prone and waiting for it. */
export type LessonStart = 'pocket' | 'caught' | 'waiting';

/**
 * The Surf School's wave (spec L2): one wave the autopilot rode, recorded at
 * three moments (as it began paddling, at the pop-up cue, and just after it
 * stood), each shipped as an asset, with the sea it was recorded on and where the
 * rider was at each. Every attempt restores its start's state and places the
 * rider there, so every attempt meets the same wave.
 */
export interface LessonWave {
  /** The solver stage it was recorded on; the school uses the one the graphics settings run. */
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
  assets: Record<LessonStart, string>;
  placements: Record<LessonStart, RiderPlacement>;
  /** True until the riding work's reference wave backs the recording (a dev note says so). */
  provisional: boolean;
  /** What the recording script's autopilot got from each start. */
  checks: Record<LessonStart, string>;
}

/** The surf zone to build for a lesson wave: its recorded sea, no spin-up (the recorded state replaces it). */
export function lessonConfig(wave: LessonWave): SurfZoneConfig {
  return { ...wave.config, stage: wave.stage, compute: 'auto', spinUpPeriods: 0 };
}

/** The recording for a solver stage. */
export function lessonWaveFor(stage: 1 | 2): LessonWave {
  const wave = LESSON_WAVES.find((candidate) => candidate.stage === stage);
  if (!wave) throw new Error(`No lesson wave recorded for stage ${stage}`);
  return wave;
}

/** A start's recorded sea, fetched and inflated: an encoded state for a surf zone's handover or restore. */
export async function loadLessonSea(wave: LessonWave, start: LessonStart, fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<Uint8Array> {
  const asset = wave.assets[start];
  const response = await fetcher(asset);
  if (!response.ok) throw new Error(`The lesson wave ${asset} did not load (${response.status})`);
  return decompress(new Uint8Array(await response.arrayBuffer()), true);
}
