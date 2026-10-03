import { LANDMARK, PROFILE_POINTS, type BarrelCase } from './ProfileLibrary';

/** A toy case for tests: its lip moves forward with each frame, so interpolation is checkable; its crest stays at x = 1 h0. */
export function toyCase(nonlinearity: number, lipGain: number): BarrelCase {
  const frames = 5;
  const data = new Float32Array(frames * 2 * PROFILE_POINTS);
  for (let f = 0; f < frames; f += 1) {
    for (let p = 0; p < PROFILE_POINTS; p += 1) {
      data[(f * PROFILE_POINTS + p) * 2] = p / 32 + (p === LANDMARK.lip ? lipGain * f : 0);
      data[(f * PROFILE_POINTS + p) * 2 + 1] = p === LANDMARK.crest ? 0.5 : 0.1;
    }
  }
  return {
    id: `toy-${nonlinearity}`, slope: 0.05, nonlinearity, flatDepth: 0.18, breakerHeight: 0.5, tauStep: 0.25, tauStart: -0.5, touchdown: 0.5,
    frames: data, tipVelocity: new Float32Array(2 * frames),
  };
}

/**
 * A lip of uniform thickness for the sheet's tests (h0 units, x forward from the crest). From τ = 0 its outer surface
 * (crest to tip) is an arc of radius 0.3 about (0, 0.5), from straight above the centre 120° round to the front, its
 * underside (tip back to the throat) the concentric arc of radius 0.3 − `thickness`, the tip on the end cap between them;
 * the face drops from the throat to the toe at (0.05, 0), then runs flat to (2, 0); the back rises from (−2, 0). Before
 * τ = 0 the underside is folded onto the tip, as the library's frames are before the cavity forms.
 */
export function lipCase(nonlinearity: number, thickness: number): BarrelCase {
  const frames = 5;
  const floats = 2 * PROFILE_POINTS;
  const data = new Float32Array(frames * floats);
  const radius = 0.3;
  const [cx, cy] = [0, 0.5];
  const top = Math.PI / 2;
  const end = top - (2 * Math.PI) / 3;
  const arc = (r: number, angle: number): [number, number] => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  const tip = arc(radius - thickness / 2, end);
  const line = (i: number, from: number, to: number, a: [number, number], b: [number, number]): [number, number] => {
    const t = (i - from) / (to - from);
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  const { crest, lip, throat, toe, front } = LANDMARK;
  const throatPoint = arc(radius - thickness, top);
  const point = (i: number, formed: boolean): [number, number] => {
    if (i <= crest) return line(i, 0, crest, [-2, 0], arc(radius, top));
    // The outer arc up to the point before the tip, then the tip.
    if (i < lip) return arc(radius, top + ((end - top) * (i - crest)) / (lip - 1 - crest));
    if (i === lip) return tip;
    if (i < throat) return formed ? arc(radius - thickness, end + ((top - end) * (i - lip - 1)) / (throat - lip - 1)) : tip;
    if (i <= toe) return line(i, throat, toe, formed ? throatPoint : tip, [0.05, 0]);
    return line(i, toe, front, [0.05, 0], [2, 0]);
  };
  for (let f = 0; f < frames; f += 1) {
    for (let p = 0; p < PROFILE_POINTS; p += 1) {
      const [x, y] = point(p, f >= 2);
      data[f * floats + 2 * p] = x;
      data[f * floats + 2 * p + 1] = y;
    }
  }
  return {
    id: `lip-${nonlinearity}`, slope: 0.05, nonlinearity, flatDepth: 0.18, breakerHeight: 0.8, tauStep: 0.25, tauStart: -0.5,
    touchdown: 0.5, frames: data, tipVelocity: new Float32Array(2 * frames),
  };
}

/**
 * An overturned toy for the contact's tests (h0 units, x forward from the crest): before τ = 0 a tent, from τ = 0 a
 * tube whose lip's top runs (0, 0.8) → tip (1.2, 0.5), its underside back to the throat (0.6, 0.6), the face down to the
 * toe (0.8, 0) and on flat to (2, 0). The back rises from (−2, 0). Straight segments between landmarks, so the tube's
 * crossings are known: at x = 1 h0 the flat at 0, the underside at 0.7 − 1/6 and the top at 0.55. The tip runs at
 * (0.9, −0.3) √(g h0) throughout.
 */
export function tubeCase(nonlinearity: number): BarrelCase {
  const frames = 5;
  const floats = 2 * PROFILE_POINTS;
  const data = new Float32Array(frames * floats);
  const line = (i: number, from: number, to: number, a: [number, number], b: [number, number]): [number, number] => {
    const t = (i - from) / (to - from);
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  const tube = (i: number): [number, number] =>
    i <= LANDMARK.crest ? line(i, 0, LANDMARK.crest, [-2, 0], [0, 0.8])
      : i <= LANDMARK.lip ? line(i, LANDMARK.crest, LANDMARK.lip, [0, 0.8], [1.2, 0.5])
        : i <= LANDMARK.throat ? line(i, LANDMARK.lip, LANDMARK.throat, [1.2, 0.5], [0.6, 0.6])
          : i <= LANDMARK.toe ? line(i, LANDMARK.throat, LANDMARK.toe, [0.6, 0.6], [0.8, 0])
            : line(i, LANDMARK.toe, LANDMARK.front, [0.8, 0], [2, 0]);
  const tent = (i: number): [number, number] =>
    i <= LANDMARK.crest ? line(i, 0, LANDMARK.crest, [-2, 0], [0, 0.8]) : line(i, LANDMARK.crest, LANDMARK.front, [0, 0.8], [2, 0]);
  for (let f = 0; f < frames; f += 1) {
    for (let p = 0; p < PROFILE_POINTS; p += 1) {
      const [x, y] = f < 2 ? tent(p) : tube(p);
      data[f * floats + 2 * p] = x;
      data[f * floats + 2 * p + 1] = y;
    }
  }
  const tipVelocity = new Float32Array(2 * frames);
  for (let f = 0; f < frames; f += 1) {
    tipVelocity[2 * f] = 0.9;
    tipVelocity[2 * f + 1] = -0.3;
  }
  return {
    id: `tube-${nonlinearity}`, slope: 0.05, nonlinearity, flatDepth: 0.18, breakerHeight: 0.8, tauStep: 0.25, tauStart: -0.5,
    touchdown: 0.5, frames: data, tipVelocity,
  };
}
