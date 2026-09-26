/**
 * Measures for the carve lab (turn redesign, Task 1): a damped oscillation's
 * frequency and damping, and a turn's yaw, peak rate and timing.
 */

/** An extremum found between samples: its time (in samples, sub-sample by a parabola) and value. */
interface Extremum {
  at: number;
  value: number;
}

function extrema(samples: readonly number[]): Extremum[] {
  const found: Extremum[] = [];
  for (let i = 1; i < samples.length - 1; i += 1) {
    const [a, b, c] = [samples[i - 1], samples[i], samples[i + 1]];
    const isMax = b > a && b >= c;
    const isMin = b < a && b <= c;
    if (!isMax && !isMin) continue;
    // A parabola through the three samples places the extremum between them.
    const curvature = a - 2 * b + c;
    const shift = curvature !== 0 ? (0.5 * (a - c)) / curvature : 0;
    found.push({ at: i + shift, value: b - 0.25 * (a - c) * shift });
  }
  return found;
}

/**
 * A damped oscillation's frequency (Hz) and damping ratio, from equally spaced
 * samples: the spacing of its extrema, and the logarithmic decrement of its
 * peak-to-trough swings a period apart, so a steady offset (a trace settling
 * to a turn) cancels. Undefined with fewer than two swings a period apart.
 */
export function dampedMode(samples: readonly number[], dt: number): { frequency: number; damping: number; peaks: number } | undefined {
  const all = extrema(samples);
  // Alternate maxima and minima, keeping the larger of any two alike in a row.
  const alternating: Extremum[] = [];
  for (const e of all) {
    const last = alternating[alternating.length - 1];
    const lastIsMax = last !== undefined && alternating.length >= 2 ? last.value > alternating[alternating.length - 2].value : undefined;
    if (last && alternating.length >= 2 && (e.value > last.value) === lastIsMax) {
      if (Math.abs(e.value) > Math.abs(last.value)) alternating[alternating.length - 1] = e;
      continue;
    }
    alternating.push(e);
  }
  const swings = alternating.slice(1).map((e, k) => ({ at: (e.at + alternating[k].at) / 2, size: Math.abs(e.value - alternating[k].value) }));
  const largest = Math.max(0, ...swings.map((s) => s.size));
  const kept = swings.filter((s) => s.size >= 0.05 * largest);
  if (kept.length < 3) return undefined;
  let decrement = 0;
  let pairs = 0;
  for (let k = 0; k + 2 < kept.length; k += 1) {
    decrement += Math.log(kept[k].size / kept[k + 2].size);
    pairs += 1;
  }
  const lambda = decrement / pairs;
  const halfPeriod = ((kept[kept.length - 1].at - kept[0].at) / (kept.length - 1)) * dt;
  return { frequency: 1 / (2 * halfPeriod), damping: lambda / Math.sqrt(4 * Math.PI * Math.PI + lambda * lambda), peaks: Math.ceil(kept.length / 2) };
}

/** A turn's measures from a heading trace (rad) at step dt: yaw turned, peak yaw rate, and the time to reach `degrees`. */
export function turnMeasures(headings: readonly number[], dt: number, degrees: number): { yaw: number; peakRate: number; timeTo: number | undefined } {
  const unwrapped: number[] = [];
  let offset = 0;
  for (let i = 0; i < headings.length; i += 1) {
    if (i > 0) {
      const step = headings[i] + offset - unwrapped[i - 1];
      offset -= 2 * Math.PI * Math.round(step / (2 * Math.PI));
    }
    unwrapped.push(headings[i] + offset);
  }
  const start = unwrapped[0] ?? 0;
  let peakRate = 0;
  let timeTo: number | undefined;
  const target = (degrees * Math.PI) / 180;
  for (let i = 1; i < unwrapped.length; i += 1) {
    peakRate = Math.max(peakRate, Math.abs(unwrapped[i] - unwrapped[i - 1]) / dt);
    if (timeTo === undefined && Math.abs(unwrapped[i] - start) >= target - 1e-9) timeTo = i * dt;
  }
  return { yaw: (unwrapped[unwrapped.length - 1] ?? 0) - start, peakRate, timeTo };
}
