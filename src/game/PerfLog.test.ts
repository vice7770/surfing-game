import { describe, expect, it } from 'vitest';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import { PERF_LOG_SECONDS, PerfLog } from './PerfLog';

/** A status with only what the log reads. */
function status(seaTime: number, total: number, board: number, phase = 'standing'): SurfZoneStatus {
  const pipelineMs = { water: 1, board, contact: 0.5, front: 1, foam: 1, spray: 0.2, surface: 0.3, snapshot: 2, deviceMap: 5, total };
  return { seaTime, compute: 'gpu', pipelineMs, ride: { phase, speed: 6.5, wave: { valid: true, crestBreaking: 0.4 } } } as unknown as SurfZoneStatus;
}

describe('PerfLog', () => {
  it('writes a row a second: frames, the worst frame, the sea a wall second got, and each fresh step once', () => {
    const log = new PerfLog(() => 'note');
    // 60 frames of 16.7 ms and one of 50: a fresh step every second frame (the sea at half speed), one dear step.
    let sea = 10;
    for (let frame = 0; frame < 60; frame += 1) {
      if (frame % 2 === 0) sea += 1 / 60;
      log.frame(frame === 30 ? 50 : 1000 / 60, status(sea, frame === 30 ? 21 : 9, frame === 30 ? 12 : 1));
    }
    expect(log.seconds).toBe(1);
    const lines = log.text().trimEnd().split('\n');
    expect(lines[1]).toBe('note');
    const head = lines[3].split('\t');
    const row = lines[4].split('\t');
    expect(row).toHaveLength(head.length);
    const cell = (name: string) => row[head.indexOf(name)];
    expect(Number(cell('fps'))).toBeGreaterThan(55);
    expect(cell('worst frame ms')).toBe('50');
    expect(Number(cell('sea s per s'))).toBeCloseTo(0.5, 1);
    expect(cell('water on')).toBe('gpu');
    expect(cell('worker ms max')).toBe('21.0');
    expect(Number(cell('worker ms mean'))).toBeCloseTo((9 * 29 + 21) / 30, 1);
    expect(cell('board max')).toBe('12.0');
    expect(cell('rider')).toBe('standing');
  });

  it('ignores frames with no status and keeps only the latest seconds', () => {
    const log = new PerfLog(() => '');
    log.frame(16, undefined);
    expect(log.seconds).toBe(0);
    for (let second = 0; second < PERF_LOG_SECONDS + 5; second += 1) log.frame(1000, status(second, 8, 1));
    expect(log.seconds).toBe(PERF_LOG_SECONDS);
  });
});
