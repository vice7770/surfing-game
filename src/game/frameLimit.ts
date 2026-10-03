/**
 * Whether a frame is due under the frame limit (plan P8): always with no limit
 * (interval 0), otherwise once `interval` ms have passed on the render clock, less a millisecond so a
 * 60 Hz display's frames still land on a 30 fps limit.
 */
export function frameDue(now: number, lastFrame: number, interval: number): boolean {
  return interval <= 0 || now - lastFrame >= interval - 1;
}

/** Keep the cap on its period instead of accumulating each callback's lateness. Called only for a due frame. */
export function advanceFrameClock(now: number, lastFrame: number, interval: number): number {
  if (interval <= 0 || lastFrame === 0) return now;
  // The same slack as frameDue permits a slightly early display tick without shifting the next deadline.
  const periods = Math.max(1, Math.floor((now - lastFrame + 1) / interval));
  return lastFrame + periods * interval;
}
