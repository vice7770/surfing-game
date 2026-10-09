/** The water's along-shore mirror addressing (the edge mirror): its CPU and GLSL twins. */

/**
 * The water's along-shore mirror addressing (the edge mirror, the owner's 2026-10-09 playtest): a grid x (in nodes)
 * past either side edge reads the field reflected across that edge, so the surface continues as its own mirror image
 * beyond the tank's open sides (`EdgeBand` draws it there) and the edge columns' slopes see the same water both sides.
 * Inside the grid it returns its argument unchanged. CPU twin of `waterFoldX` in `waterFoldPars`.
 */
export function foldGridX(g: number, nx: number): number {
  const span = nx - 1;
  if (g >= 0 && g <= span) return g;
  if (span <= 0) return 0;
  const p = ((g % (2 * span)) + 2 * span) % (2 * span);
  return p <= span ? p : 2 * span - p;
}

/** −1 where `foldGridX` reads the field mirrored (an along-shore velocity's sign flips there), else 1. */
export function foldSignX(g: number, nx: number): number {
  const span = nx - 1;
  if ((g >= 0 && g <= span) || span <= 0) return 1;
  return ((Math.floor(g / span) % 2) + 2) % 2 === 0 ? 1 : -1;
}

/**
 * The along-shore mirror addressing (`foldGridX`): a grid x past a side edge reads the field reflected across it.
 * Needs `waterGrid` and `waterGridSize`.
 */
export const waterFoldPars = /* glsl */ `
float waterFoldX( float g ) {
  float span = waterGridSize.x - 1.0;
  if ( g >= 0.0 && g <= span ) return g;
  float p = mod( g, 2.0 * span );
  return p <= span ? p : 2.0 * span - p;
}
float waterFoldSign( float g ) {
  float span = waterGridSize.x - 1.0;
  if ( g >= 0.0 && g <= span ) return 1.0;
  return mod( floor( g / span ), 2.0 ) < 0.5 ? 1.0 : - 1.0;
}
vec2 waterFoldXZ( vec2 xz ) {
  float g = ( xz.x - waterGrid.x ) / waterGrid.z;
  if ( g < 0.0 || g > waterGridSize.x - 1.0 ) xz.x = waterGrid.x + waterFoldX( g ) * waterGrid.z;
  return xz;
}
`;

