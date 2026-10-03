/** Spray sprites at least this wide, m, are mist (G6 draws mist at 0.35–0.8 m, drops at 0.06–0.14 m). */
export const MIST_SIZE = 0.25;
/** Mist's forward-scattering asymmetry: fine droplets throw most light on toward the eye when backlit. */
export const MIST_G = 0.6;

export function isMist(size: number): boolean {
  return size > MIST_SIZE;
}

/** The Henyey–Greenstein phase function, normalised over the sphere (per steradian). */
export function henyeyGreenstein(cosTheta: number, g: number): number {
  return (1 - g * g) / (4 * Math.PI * (1 + g * g - 2 * g * cosTheta) ** 1.5);
}

export const mistPars = /* glsl */ `
const float MIST_SIZE = ${MIST_SIZE.toFixed(3)};
const float MIST_G = ${MIST_G.toFixed(3)};
float henyeyGreenstein( float cosTheta, float g ) {
  return ( 1.0 - g * g ) / ( 12.566370614 * pow( 1.0 + g * g - 2.0 * g * cosTheta, 1.5 ) );
}
`;
