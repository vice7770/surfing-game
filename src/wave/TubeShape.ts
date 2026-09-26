/**
 * A thrown lip's tube, measured from one parcel's flight in the frame of the
 * crest it left (plan P7): how far ahead of the advancing crest it landed
 * (the distance from launch to landing less the crest's own travel,
 * `crestTravel`) is the tube's length, and the drop from launch to the surface
 * it landed on is its height. A lip the wave overruns has no length. Their quotient is the width-to-length ratio that Feddersen et al.
 * (2023) measured at Surf Ranch (0.25-0.48) and passyworld bounds at a round
 * 1:1; it is an outcome of the jet's launch, not an input.
 */
export interface TubeShape {
  length: number;
  height: number;
  widthRatio: number;
}

export function measureTube(
  launch: { x: number; y: number; z: number }, landing: { x: number; z: number }, landingSurface: number, crestTravel = 0,
): TubeShape {
  const length = Math.max(0, Math.hypot(landing.x - launch.x, landing.z - launch.z) - crestTravel);
  const height = launch.y - landingSurface;
  return { length, height, widthRatio: length > 0 ? height / length : Infinity };
}
