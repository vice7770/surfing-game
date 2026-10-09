import { Vector3, Vector4 } from 'three';

/**
 * The edge band's layout (the owner's 2026-10-09 playtest: "The edges are off, they are separated from the off-map
 * waves. We could make the same wave, just limit the map access"). Past each open side edge the tank's own water is
 * drawn mirrored (`waterFoldPars`): its waves, foam and bed, as the same wave beyond the edge. Out to `pure` metres it
 * is the mirror alone; from there to `fade` it gives way to the far ocean's linear sea, which takes over beyond.
 * - `pure` 40 m: the rider is held 21 m inside the edge (`riderBounds`), so the mirror covers what the rider sees
 *   beside them, out to a peak's width beyond (the Reef's peak stands 30 m in from its −x edge).
 * - `fade` 120 m: the hand-over is 80 m long, a wavelength or more of the Medium swells (8–14 s in 5–30 m: 60–200 m
 *   offshore, 40–90 m in the break), so the far sea's crests rise through the mirror's over one to two crests.
 * - `corner` 12 m: across the relaxation zone (from its inner edge out to the tank's offshore edge), where the tank's
 *   water is the far ocean's own sea, the band hands over to the far ocean within this distance of the edge instead, so
 *   the band's offshore rim is the far ocean's (the far ocean's rim follows the tank's offshore row, `FAR_RIM_FADE`).
 * - `skirt` 0.3 m: the strip hung under the band's outer rims, closing the hairline gaps where the far ocean's coarser
 *   rim vertices (3–4 m) cut its linear sea straight between them.
 * - `uncut` 8 m: the tank's lips are drawn mirrored out to `pure` (`EdgeWhitewater`), so its tubes' voids are cut only
 *   that far; over the last `uncut` metres before it the cut eases out, and beyond it the crests are drawn whole.
 */
export const EDGE_BAND = { pure: 40, fade: 120, corner: 12, skirt: 0.3, uncut: 8 } as const;

/** Where the band lies: the tank's side edges, its offshore edge and its relaxation zone's length, m. */
export interface EdgeBandLayout {
  xMin: number;
  xMax: number;
  zMin: number;
  zone: number;
  pure?: number;
  fade?: number;
  corner?: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** How far past the nearer side edge x lies, m (0 inside). */
export function bandDistance(x: number, layout: Pick<EdgeBandLayout, 'xMin' | 'xMax'>): number {
  return Math.max(layout.xMin - x, x - layout.xMax, 0);
}

/** The far ocean's share of the band's water at (x, z): 0 at the side edges, 1 from `fade` out. CPU twin of `waterBandWeight`. */
export function bandWeight(x: number, z: number, layout: EdgeBandLayout): number {
  const d = bandDistance(x, layout);
  const sx = smoothstep(layout.pure ?? EDGE_BAND.pure, layout.fade ?? EDGE_BAND.fade, d);
  const sz = 1 - smoothstep(layout.zMin, layout.zMin + layout.zone, z);
  const r = smoothstep(0, layout.corner ?? EDGE_BAND.corner, d);
  return 1 - (1 - sx) * (1 - sz * r);
}

/** The far ocean's share of the band's bed at x: the mirrored bed gives way to the edge column's as the water does. */
export function bandBedWeight(x: number, layout: Pick<EdgeBandLayout, 'xMin' | 'xMax' | 'pure' | 'fade'>): number {
  return smoothstep(layout.pure ?? EDGE_BAND.pure, layout.fade ?? EDGE_BAND.fade, bandDistance(x, layout));
}

/** World x reflected into [xMin, xMax] across the side edges, as the water's mirror reads it (`foldGridX`). */
export function mirrorX(x: number, xMin: number, xMax: number): number {
  const span = xMax - xMin;
  if ((x >= xMin && x <= xMax) || span <= 0) return Math.min(xMax, Math.max(xMin, x));
  const p = ((((x - xMin) % (2 * span)) + 2 * span) % (2 * span));
  return xMin + (p <= span ? p : 2 * span - p);
}

/**
 * The band's uniforms: `waterBand` (side edges xMin, xMax, then `pure` and `fade`), `waterBandZ` (the offshore edge,
 * the zone's length and `corner`).
 */
export function createEdgeBandUniforms(): { waterBand: { value: Vector4 }; waterBandZ: { value: Vector3 } } {
  return { waterBand: { value: new Vector4(0, 0, EDGE_BAND.pure, EDGE_BAND.fade) }, waterBandZ: { value: new Vector3(0, 1, EDGE_BAND.corner) } };
}

export function applyEdgeBandLayout(uniforms: ReturnType<typeof createEdgeBandUniforms>, layout: EdgeBandLayout): void {
  uniforms.waterBand.value.set(layout.xMin, layout.xMax, layout.pure ?? EDGE_BAND.pure, layout.fade ?? EDGE_BAND.fade);
  uniforms.waterBandZ.value.set(layout.zMin, Math.max(1e-3, layout.zone), layout.corner ?? EDGE_BAND.corner);
}

/** The band's own: 0 where the tank's tubes cut its water (within the mirrored lips' reach), easing to 1 (uncut) by `pure`. Needs `edgeBandPars`. */
export const edgeBandUncutPars = /* glsl */ `
float waterBandUncut( vec2 xz ) {
  float d = max( max( waterBand.x - xz.x, xz.x - waterBand.y ), 0.0 );
  return smoothstep( waterBand.z - ${EDGE_BAND.uncut.toFixed(1)}, waterBand.z, d );
}
`;

/** GLSL twin of `bandWeight`, and its gradient (central differences over half a metre). */
export const edgeBandPars = /* glsl */ `
uniform vec4 waterBand;
uniform vec3 waterBandZ;
float waterBandWeight( vec2 xz ) {
  float d = max( max( waterBand.x - xz.x, xz.x - waterBand.y ), 0.0 );
  float sx = smoothstep( waterBand.z, waterBand.w, d );
  float sz = 1.0 - smoothstep( waterBandZ.x, waterBandZ.x + waterBandZ.y, xz.y );
  float r = smoothstep( 0.0, waterBandZ.z, d );
  return 1.0 - ( 1.0 - sx ) * ( 1.0 - sz * r );
}
vec2 waterBandGradient( vec2 xz ) {
  const float e = 0.5;
  return vec2( waterBandWeight( xz + vec2( e, 0.0 ) ) - waterBandWeight( xz - vec2( e, 0.0 ) ),
    waterBandWeight( xz + vec2( 0.0, e ) ) - waterBandWeight( xz - vec2( 0.0, e ) ) ) / ( 2.0 * e );
}
`;
