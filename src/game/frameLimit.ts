/**
 * Whether a frame is due under the frame limit (plan P8): always with no limit
 * (interval 0), otherwise once `interval` ms have passed, less a millisecond so a
 * 60 Hz display's frames still land on a 30 fps limit.
 */
export function frameDue(now: number, lastFrame: number, interval: number): boolean {
  return interval <= 0 || now - lastFrame >= interval - 1;
}
