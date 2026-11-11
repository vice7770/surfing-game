import type { SurfZoneStatus } from '../wave/SurfZoneRunner';

/**
 * Dev tool (`?perfLog=on`; barrel-ride-perf, 2026-11-11): a ride's performance, second by second, as text the player
 * can save (F9) and send. It answers where a slow stretch went: the drawing (frames a second, the worst frame), or the
 * worker (its whole time a step against the 16.7 ms that keep real time, the dearest stages, and how much sea a second
 * of wall clock got), with what the rider was doing then. It only reads the frame's interval and the latest status.
 */

/** The longest log kept, s: the oldest seconds drop off. */
export const PERF_LOG_SECONDS = 900;

const STAGES = ['water', 'board', 'contact', 'front', 'foam', 'spray', 'surface', 'snapshot', 'deviceMap'] as const;
type Stage = (typeof STAGES)[number];

interface Bucket {
  frames: number;
  worstFrame: number;
  steps: number;
  workerSum: number;
  workerMax: number;
  stageMax: Record<Stage, number>;
  seaStart: number;
  seaEnd: number;
  wall: number;
  compute: string;
  phase: string;
  speed: number;
  breaking: number;
}

function emptyBucket(sea: number): Bucket {
  return {
    frames: 0, worstFrame: 0, steps: 0, workerSum: 0, workerMax: 0,
    stageMax: { water: 0, board: 0, contact: 0, front: 0, foam: 0, spray: 0, surface: 0, snapshot: 0, deviceMap: 0 },
    seaStart: sea, seaEnd: sea, wall: 0, compute: '-', phase: '-', speed: 0, breaking: 0,
  };
}

export class PerfLog {
  private readonly rows: string[] = [];
  private bucket: Bucket | undefined;
  private lastSea = Number.NaN;
  private elapsed = 0;

  /** `note`: what the rows cannot say (the build, the window, the settings); printed above them. */
  constructor(private readonly note: () => string) {}

  /** Seconds logged so far. */
  get seconds(): number {
    return this.rows.length;
  }

  /** One rendered frame of a ride: its interval, ms, and the latest status (the same one until a fresh step arrives). */
  frame(intervalMs: number, status: SurfZoneStatus | undefined): void {
    if (!(intervalMs > 0) || !status) return;
    const bucket = this.bucket ??= emptyBucket(status.seaTime);
    bucket.frames += 1;
    bucket.wall += intervalMs;
    bucket.worstFrame = Math.max(bucket.worstFrame, intervalMs);
    if (status.seaTime !== this.lastSea) {
      // A fresh step: its worker times count once, however many frames show it.
      this.lastSea = status.seaTime;
      bucket.seaEnd = status.seaTime;
      const p = status.pipelineMs;
      if (p) {
        bucket.steps += 1;
        bucket.workerSum += p.total;
        bucket.workerMax = Math.max(bucket.workerMax, p.total);
        for (const stage of STAGES) bucket.stageMax[stage] = Math.max(bucket.stageMax[stage], p[stage]);
      }
    }
    bucket.compute = status.compute;
    if (status.ride) {
      bucket.phase = status.ride.phase;
      bucket.speed = status.ride.speed;
      bucket.breaking = status.ride.wave.valid ? status.ride.wave.crestBreaking : 0;
    }
    if (bucket.wall < 1000) return;
    this.elapsed += bucket.wall / 1000;
    this.rows.push(this.row(bucket));
    if (this.rows.length > PERF_LOG_SECONDS) this.rows.shift();
    this.bucket = emptyBucket(status.seaTime);
  }

  private row(b: Bucket): string {
    const wall = b.wall / 1000;
    const cells = [
      this.elapsed.toFixed(0),
      (b.frames / wall).toFixed(0),
      b.worstFrame.toFixed(0),
      ((b.seaEnd - b.seaStart) / wall).toFixed(2),
      b.compute,
      b.steps > 0 ? (b.workerSum / b.steps).toFixed(1) : '-',
      b.steps > 0 ? b.workerMax.toFixed(1) : '-',
      ...STAGES.map((stage) => (b.steps > 0 ? b.stageMax[stage].toFixed(1) : '-')),
      b.phase,
      b.speed.toFixed(1),
      b.breaking.toFixed(2),
    ];
    return cells.join('\t');
  }

  /** The whole log: the note, what the columns are, and a row a second. */
  text(): string {
    const head = ['s', 'fps', 'worst frame ms', 'sea s per s', 'water on', 'worker ms mean', 'worker ms max',
      ...STAGES.map((stage) => `${stage} max`), 'rider', 'm/s', 'crest breaking'];
    return [
      'Breakline performance log',
      this.note(),
      'A row a second of riding. fps and the worst frame are the drawing. worker ms is the sea and the bodies: over 16.7 the sea falls behind real time (sea s per s under 1).',
      head.join('\t'),
      ...this.rows,
      '',
    ].join('\n');
  }
}
