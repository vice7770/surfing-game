/**
 * Foam freshness (web-ocean plan, item 7), Rich only and drawn only: fresh whitewater stays dense, thick and white;
 * older foam breaks up by age into a thinner, streakier lace; and the water under young foam takes a faint bubble tint.
 *
 * Its age is the one the drawing already has. The foam field's two parts (dense whitewater decaying into the residual
 * lace, `FoamField`) carry age in the physics, but the snapshot draws only their sum; the drawn freshness channel is the
 * plume's void fraction (G9, `waterFreshness`), which empties as the bubbles rise out, in 1–4 s under a bore: the time
 * whitewater stays a bright bubbly mat before its surface foam is left as lace (Callaghan et al. 2013's stage A to B).
 * Foam near saturation counts as young too, as only a source holds it there. So nothing new is computed, carried or
 * felt: the foam field, its snapshot and the physics are untouched.
 *
 * Ideas adapted from web-ocean, js/wgsl/ocean.js (MIT licence, © 2026 Maksymilian Dendura), rewritten for the foam
 * network of `foamPattern`:
 * - the cover's threshold softened by the pixel's footprint (`fwidth`), so distant lace does not crawl, and softer
 *   still as foam ages: fresh foam has crisp edges, aged foam a translucent margin;
 * - aged foam breaking into streaks: its lace (as crisp as ever) gathers into patches stretched along the waves'
 *   travel, shore-normal (the axis an onshore or offshore wind shares, as web-ocean's streaks follow the wind);
 * - thin aged foam a translucent film, dense young foam opaque;
 * - the bubbles under young foam tinting the water beneath and between its lace.
 *
 * Dev: `?foamFresh=off` draws the foam as before (its program is today's, byte for byte); `window.waterFoamFresh(on)`
 * switches it in a page, for the A/B timing.
 */
import { DEV_TOOLS, devParam } from '../../devTools';
import { smoothstep } from '../../wave/Bathymetry';
import { FOAM_CELL, FOAM_EDGE, FOAM_FLOW_PERIOD, FOAM_LEVELS, FOAM_THRESHOLDS, FOAM_TILE, sampleFoamTile } from '../foamPattern';

/** Youth from the plume's void fraction: from first bubbles to well aerated (the churn's own, `FRESH_AIR`, is 0.02–0.15). */
export const YOUTH_AIR = [0.004, 0.05] as const;
/** Youth from the foam itself: only a source holds the cover this near saturation. */
export const YOUTH_COVER = [0.7, 0.98] as const;
/**
 * Aged foam gathers into streaks: the lace's patches read stretched along the waves' travel (+z), `along` times longer
 * and `across` times narrower than fresh foam's round ones (5.6 m across), and gathering harder (`gather` more).
 */
export const AGED_STREAKS = { along: 3, across: 1.6, gather: 1 } as const;
/** Where the stretched patches are read: offset so they do not line up with the round ones. */
const AGED_OFFSET = [0.37, 0.61] as const;
/** Aged foam's extra edge half-width, in cells: a soft translucent margin. */
export const AGED_SOFTNESS = 0.02;
/** The edge's half-width per pixel footprint (its larger side), in cells per cell: about half a pixel either side. */
export const FOOTPRINT_SOFTNESS = 0.35;
/** Thin aged foam's opacity (a film over the water); it rises to 1 as the foam thickens or is young (web-ocean's 0.68). */
export const AGED_OPACITY = 0.8;
const OPACITY_COVER = [0.25, 0.8] as const;
/** The bubble tint under young foam: at most this share of the way from the water's colour to the foam's. */
export const BUBBLE_TINT = 0.22;

/** Young foam (1) to aged (0), from the plume's void fraction and the foam's cover. */
export function foamYouth(air: number, foam: number): number {
  return Math.max(smoothstep(YOUTH_AIR[0], YOUTH_AIR[1], air), smoothstep(YOUTH_COVER[0], YOUTH_COVER[1], foam));
}

/** How opaque the foam is: thin aged foam is a film, thick or young foam is white through. */
export function foamOpacity(foam: number, youth: number): number {
  const aged = AGED_OPACITY + (1 - AGED_OPACITY) * smoothstep(OPACITY_COVER[0], OPACITY_COVER[1], foam);
  return aged + (1 - aged) * youth;
}

/** The threshold's half-width, in cells: the network's own, the pixel's footprint (m) and aged foam's margin. */
export function foamEdge(youth: number, footprint: number): number {
  return FOAM_EDGE + (FOOTPRINT_SOFTNESS * footprint) / FOAM_CELL + AGED_SOFTNESS * (1 - youth);
}

/** `foamCoverage` with its edge half-width given, in cells. */
export function softCoverage(foam: number, distance: number, edge: number): number {
  if (!(foam > 0.001)) return 0;
  const s = Math.min(1, foam) * FOAM_LEVELS;
  const k = Math.min(FOAM_LEVELS - 1, Math.floor(s));
  const radius = FOAM_THRESHOLDS[k] + (FOAM_THRESHOLDS[k + 1] - FOAM_THRESHOLDS[k]) * (s - k);
  return 1 - smoothstep(radius - edge, radius + edge, distance);
}

/** Where aged foam's stretched patches are read, in tile cells, for world (x, z), m. */
export function agedTileAt(x: number, z: number): [number, number] {
  return [(x * AGED_STREAKS.across) / FOAM_CELL + AGED_OFFSET[0] * FOAM_TILE, z / (FOAM_CELL * AGED_STREAKS.along) + AGED_OFFSET[1] * FOAM_TILE];
}

/** One flow-map phase's cover at world (x, z): the lace's network, in patches turning from round to streaks by age. */
function phaseCover(foam: number, aged: number, edge: number, x: number, z: number): number {
  const distance = sampleFoamTile(x / FOAM_CELL, z / FOAM_CELL, 0);
  let patch = sampleFoamTile(x / FOAM_CELL, z / FOAM_CELL, 1);
  if (aged > 0) {
    const [u, v] = agedTileAt(x, z);
    patch += (sampleFoamTile(u, v, 1) - patch) * aged;
  }
  const f = Math.min(1, foam);
  const local = Math.min(1, Math.max(0, f * (1 + (2 * patch - 1) * (1 - f) * (1 + AGED_STREAKS.gather * aged))));
  return softCoverage(local, distance, edge);
}

/**
 * CPU mirror of `waterFreshFoamCover`: the foam's cover at world (x, z), m, with the current (m/s), its value, its youth
 * (`foamYouth`), the time (s) and the pixel's footprint (m). Young foam at a fine footprint is `foamCover` exactly.
 */
export function freshFoamCover(x: number, z: number, flowX: number, flowZ: number, foam: number, youth: number, time: number, footprint = 0): number {
  if (!(foam > 0.001)) return 0;
  const opacity = foamOpacity(foam, youth);
  const fade = smoothstep(0.25, 1, footprint / FOAM_CELL);
  if (fade >= 1) return foam * opacity;
  const aged = 1 - youth;
  const edge = foamEdge(youth, footprint);
  const a = time / FOAM_FLOW_PERIOD - Math.floor(time / FOAM_FLOW_PERIOD);
  const b = a + 0.5 - Math.floor(a + 0.5);
  const weight = 1 - Math.abs(2 * a - 1);
  const offset = smoothstep(0, 0.5, (Math.hypot(flowX, flowZ) * FOAM_FLOW_PERIOD) / FOAM_CELL);
  const coverA = phaseCover(foam, aged, edge, x - flowX * a * FOAM_FLOW_PERIOD, z - flowZ * a * FOAM_FLOW_PERIOD);
  const coverB = phaseCover(foam, aged, edge, x - flowX * b * FOAM_FLOW_PERIOD + 17.3 * FOAM_CELL * offset,
    z - flowZ * b * FOAM_FLOW_PERIOD + 5.9 * FOAM_CELL * offset);
  const cover = weight * coverA + (1 - weight) * coverB;
  return (fade > 0 ? cover + (foam - cover) * fade : cover) * opacity;
}

/** The share of the way the water under foam turns toward the foam's colour: young foam's bubbles, as far as it covers. */
export function bubbleTint(foam: number, youth: number): number {
  return BUBBLE_TINT * youth * Math.min(1, Math.max(0, foam));
}

const f = (value: number) => value.toFixed(4);

/**
 * GLSL (Rich fragment): `waterFoamYouth`, `waterFreshFoamCover` and `waterBubbleTint`, the twins above. Needs
 * `foamPatternPars` (its tile, thresholds and flow period).
 */
export const waterFoamFreshPars = /* glsl */ `
// Foam freshness (web-ocean plan, item 7): the cover's soft threshold, aged foam's streaks and film, young foam's
// bubbles; adapted from web-ocean, js/wgsl/ocean.js (MIT licence, (c) 2026 Maksymilian Dendura).
float waterFoamYouth( float air, float foam ) {
  return max( smoothstep( ${f(YOUTH_AIR[0])}, ${f(YOUTH_AIR[1])}, air ), smoothstep( ${f(YOUTH_COVER[0])}, ${f(YOUTH_COVER[1])}, foam ) );
}
float waterFreshPhase( float foam, float aged, float edge, vec2 p ) {
  vec2 tile = texture( waterFoamTile, p / ( FOAM_CELL * FOAM_TILE ) ).rg;
  if ( aged > 0.0 ) {
    float streak = texture( waterFoamTile, p * vec2( ${f(AGED_STREAKS.across)}, ${f(1 / AGED_STREAKS.along)} ) / ( FOAM_CELL * FOAM_TILE ) + vec2( ${f(AGED_OFFSET[0])}, ${f(AGED_OFFSET[1])} ) ).g;
    tile.g = mix( tile.g, streak, aged );
  }
  float f = min( foam, 1.0 );
  float local = clamp( f * ( 1.0 + ( 2.0 * tile.g - 1.0 ) * ( 1.0 - f ) * ( 1.0 + ${f(AGED_STREAKS.gather)} * aged ) ), 0.0, 1.0 );
  if ( local <= 0.001 ) return 0.0;
  float s = local * ${FOAM_LEVELS.toFixed(1)};
  int k = min( ${FOAM_LEVELS - 1}, int( floor( s ) ) );
  float radius = mix( FOAM_THRESHOLDS[ k ], FOAM_THRESHOLDS[ k + 1 ], s - float( k ) );
  return 1.0 - smoothstep( radius - edge, radius + edge, tile.r );
}
float waterFreshFoamCover( vec2 p, vec2 flow, float foam, float youth, float time, float footprint ) {
  if ( foam <= 0.001 ) return 0.0;
  float opacity = mix( ${f(AGED_OPACITY)} + ${f(1 - AGED_OPACITY)} * smoothstep( ${f(OPACITY_COVER[0])}, ${f(OPACITY_COVER[1])}, foam ), 1.0, youth );
  float fade = smoothstep( 0.25, 1.0, footprint / FOAM_CELL );
  if ( fade >= 1.0 ) return foam * opacity;
  float aged = 1.0 - youth;
  float edge = ${f(FOAM_EDGE)} + ${f(FOOTPRINT_SOFTNESS)} * footprint / FOAM_CELL + ${f(AGED_SOFTNESS)} * aged;
  float a = fract( time / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  float weight = 1.0 - abs( 2.0 * a - 1.0 );
  float offset = smoothstep( 0.0, 0.5, length( flow ) * FOAM_FLOW_PERIOD / FOAM_CELL );
  float coverA = waterFreshPhase( foam, aged, edge, p - flow * a * FOAM_FLOW_PERIOD );
  float coverB = waterFreshPhase( foam, aged, edge, p - flow * b * FOAM_FLOW_PERIOD + vec2( 17.3, 5.9 ) * FOAM_CELL * offset );
  return mix( weight * coverA + ( 1.0 - weight ) * coverB, foam, fade ) * opacity;
}
float waterBubbleTint( float foam, float youth ) { return ${f(BUBBLE_TINT)} * youth * clamp( foam, 0.0, 1.0 ); }
`;

/** Whether the Rich foam ages (dev: `?foamFresh=off` draws it as before; `window.waterFoamFresh(on)` in a page). */
export const foamFreshMode = { on: devParam('foamFresh') !== 'off' };
const listeners = new Set<() => void>();

/** Called whenever the switch changes: the Rich programs compile again. */
export function onFoamFreshChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFoamFresh(on: boolean): void {
  if (foamFreshMode.on === on) return;
  foamFreshMode.on = on;
  for (const listener of listeners) listener();
}

/** The Rich programs' cache-key part: none when the foam ages (the default). */
export function foamFreshProgramKey(): string {
  return foamFreshMode.on ? '' : '-no-foam-fresh';
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterFoamFresh: setFoamFresh });
