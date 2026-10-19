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
 * - the cover's threshold softened by the pixel's footprint (`fwidth`), so distant lace does not crawl, and a little
 *   softer as foam ages: fresh foam has crisp edges, aged foam a translucent margin;
 * - aged foam breaking into streaks: its lace (as crisp as ever) gathers into patches stretched along the waves'
 *   travel, shore-normal (the axis an onshore or offshore wind shares, as web-ocean's streaks follow the wind), carried
 *   by the current in the lace's own flow-map phases;
 * - thin aged foam a translucent film, dense young foam opaque;
 * - the bubbles under young foam tinting the water beneath and between its lace.
 *
 * All of it is worked out per pixel from the varyings the Rich fragment already has (its foam and air): the Rich tank
 * sits at a cost cliff on the M1, and a version that handed the same terms over from the vertex in new varyings cost
 * High 1–3.6 ms a frame where this costs nothing measurable (docs/research/foam-fresh-2026-10-19).
 *
 * Dev: `?foamFresh=off` draws the foam as before (its program is today's, byte for byte), `?foamStreaks=off` without
 * the streaks; `window.waterFoamFresh(on)` or `waterFoamFresh({ on, streaks })` switches it in a page.
 */
import { DEV_TOOLS, devParam } from '../../devTools';
import { smoothstep } from '../../wave/Bathymetry';
import { FOAM_CELL, FOAM_EDGE, FOAM_FLOW_PERIOD, FOAM_LEVELS, FOAM_THRESHOLDS, FOAM_TILE, sampleFoamTile } from '../foamPattern';
import { laceStretch, laceWarp, waterLaceWarpGlsl } from './foamLook';

/** Youth from the plume's void fraction: from first bubbles to well aerated (the churn's own, `FRESH_AIR`, is 0.02–0.15). */
export const YOUTH_AIR = [0.004, 0.05] as const;
/** Youth from the foam itself: only a source holds the cover this near saturation. */
export const YOUTH_COVER = [0.7, 0.98] as const;
/**
 * Aged foam gathers into streaks: the lace's patches read stretched along the waves' travel (+z), `along` times longer
 * and `across` times narrower than fresh foam's round ones (5.6 m across), and gathering harder (`gather` more).
 */
export const AGED_STREAKS = { along: 3, across: 1.6, gather: 1.5 } as const;
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
export const BUBBLE_TINT = 0.15;

/** Young foam (1) to aged (0), from the plume's void fraction and the foam's cover. */
export function foamYouth(air: number, foam: number): number {
  return Math.max(smoothstep(YOUTH_AIR[0], YOUTH_AIR[1], air), smoothstep(YOUTH_COVER[0], YOUTH_COVER[1], foam));
}

/** How opaque the foam is: thin aged foam is a film, thick or young foam is white through. */
export function foamOpacity(foam: number, youth: number): number {
  const aged = AGED_OPACITY + (1 - AGED_OPACITY) * smoothstep(OPACITY_COVER[0], OPACITY_COVER[1], foam);
  return aged + (1 - aged) * youth;
}

/** The share of the way the water under foam turns toward the foam's colour: young foam's bubbles, as far as it covers. */
export function bubbleTint(foam: number, youth: number): number {
  return BUBBLE_TINT * youth * Math.min(1, Math.max(0, foam));
}

/** The threshold's half-width, in cells: the network's own, the pixel's footprint (m) and aged foam's margin. */
export function foamEdge(youth: number, footprint: number): number {
  return FOAM_EDGE + AGED_SOFTNESS * (1 - youth) + (FOOTPRINT_SOFTNESS * footprint) / FOAM_CELL;
}

/** `foamCoverage` with its edge half-width given, in cells, and its threshold raised by `rise` cells. */
export function softCoverage(foam: number, distance: number, edge: number, rise = 0): number {
  if (!(foam > 0.001)) return 0;
  const s = Math.min(1, foam) * FOAM_LEVELS;
  const k = Math.min(FOAM_LEVELS - 1, Math.floor(s));
  const radius = FOAM_THRESHOLDS[k] + (FOAM_THRESHOLDS[k + 1] - FOAM_THRESHOLDS[k]) * (s - k) + rise;
  return 1 - smoothstep(radius - edge, radius + edge, distance);
}

/**
 * How far the threshold rises for foam of value `foam` with an edge `edge` cells wide: dense foam's threshold sits near
 * the network's widest gap, so an edge softer than the network's own would open faint holes in it; the threshold rises
 * by the extra softness as the foam closes up, and dense foam stays white through.
 */
export function foamRise(foam: number, edge: number): number {
  return (edge - FOAM_EDGE) * smoothstep(0.75, 1, foam);
}

/** Where aged foam's stretched patches are read, in tile cells, for world (x, z), m. */
export function agedTileAt(x: number, z: number): [number, number] {
  return [(x * AGED_STREAKS.across) / FOAM_CELL + AGED_OFFSET[0] * FOAM_TILE, z / (FOAM_CELL * AGED_STREAKS.along) + AGED_OFFSET[1] * FOAM_TILE];
}

/** The stretched patches' value at world (x, z), m (the phase's own point). */
export function streakAt(x: number, z: number): number {
  const [u, v] = agedTileAt(x, z);
  return sampleFoamTile(u, v, 1);
}

/**
 * The lace's local foam value is linear in its round patch's value v and its streak's s: x + y·v + z·s, clamped to 0–1.
 * For young foam it is `foamPattern`'s F·(1 + (2v − 1)(1 − F)); as foam ages its patch value turns toward the streaks'
 * (v → v + (s − v)·aged) and gathers harder (F(1 − F) → F(1 − F)(1 + gather·aged)).
 */
export function freshLace(foam: number, youth: number): [number, number, number] {
  const f = Math.min(1, Math.max(0, foam));
  const aged = 1 - youth;
  const spread = f * (1 - f) * (1 + AGED_STREAKS.gather * aged);
  return [f - spread, 2 * spread * youth, 2 * spread * aged];
}

/**
 * CPU mirror of `waterFreshFoamCover`: the foam's cover at world (x, z), m, with the current (m/s), its value, its youth
 * (`foamYouth`), the time (s) and the pixel's footprint (m); `streaks` false leaves them out. Young foam at a fine
 * footprint is `foamCover` to rounding.
 * `lace` (the foam look, item 3): the network is read through `laceWarp`, and without the streaks aged foam gathers
 * into its round patches; without it, aged foam reads the patches' mean, an even network.
 */
export function freshFoamCover(x: number, z: number, flowX: number, flowZ: number, foam: number, youth: number, time: number, footprint = 0,
  streaks = true, lace = false): number {
  if (!(foam > 0.001)) return 0;
  if (lace) [x, z] = laceWarp(x, z);
  const [base, gain, gather] = freshLace(foam, youth);
  const opacity = foamOpacity(foam, youth);
  const fade = smoothstep(0.25, 1, footprint / FOAM_CELL);
  // In the distance, the lace's mean: its patches average out (v = s = ½). Drawn foam above 1 (the Canyon lip's landing)
  // keeps its excess there, as the lace always did: the landing's white stays as bright.
  const mean = Math.min(1, Math.max(0, base + 0.5 * gain + 0.5 * gather)) + Math.max(0, foam - 1);
  if (fade >= 1) return mean * opacity;
  const edge = foamEdge(youth, footprint);
  const rise = foamRise(foam, edge);
  const a = time / FOAM_FLOW_PERIOD - Math.floor(time / FOAM_FLOW_PERIOD);
  const b = a + 0.5 - Math.floor(a + 0.5);
  const weight = 1 - Math.abs(2 * a - 1);
  const offset = smoothstep(0, 0.5, (Math.hypot(flowX, flowZ) * FOAM_FLOW_PERIOD) / FOAM_CELL);
  const phase = (px: number, pz: number) => {
    if (lace) [px, pz] = laceStretch(px, pz);
    const streak = streaks && gather > 0 ? streakAt(px, pz) : lace ? sampleFoamTile(px / FOAM_CELL, pz / FOAM_CELL, 1) : 0.5;
    const local = Math.min(1, Math.max(0, base + gain * sampleFoamTile(px / FOAM_CELL, pz / FOAM_CELL, 1) + gather * streak));
    return softCoverage(local, sampleFoamTile(px / FOAM_CELL, pz / FOAM_CELL, 0), edge, rise);
  };
  const coverA = phase(x - flowX * a * FOAM_FLOW_PERIOD, z - flowZ * a * FOAM_FLOW_PERIOD);
  const coverB = phase(x - flowX * b * FOAM_FLOW_PERIOD + 17.3 * FOAM_CELL * offset, z - flowZ * b * FOAM_FLOW_PERIOD + 5.9 * FOAM_CELL * offset);
  const cover = weight * coverA + (1 - weight) * coverB;
  return (fade > 0 ? cover + (mean - cover) * fade : cover) * opacity;
}

const f = (value: number) => value.toFixed(4);

/**
 * GLSL (Rich fragment): `waterFoamYouth` and `waterFreshFoamCover`, the twins of `foamYouth` and `freshFoamCover`.
 * Needs `foamPatternPars` (its tile, thresholds and flow period). Without `streaks`, no stretched patches are read.
 * With `lace` (the foam look, item 3) the network is read through the warp, and without the streaks aged foam
 * gathers into the round patches its read already holds.
 */
export function waterFoamFreshPars(streaks = true, lace = false): string {
  const streak = `texture( waterFoamTile, p * vec2( ${f(AGED_STREAKS.across)}, ${f(1 / AGED_STREAKS.along)} ) / ( FOAM_CELL * FOAM_TILE ) + vec2( ${f(AGED_OFFSET[0])}, ${f(AGED_OFFSET[1])} ) ).g`;
  return /* glsl */ `
// Foam freshness (web-ocean plan, item 7): the cover's soft threshold, aged foam's streaks and film, young foam's
// bubbles; adapted from web-ocean, js/wgsl/ocean.js (MIT licence, (c) 2026 Maksymilian Dendura).${lace ? waterLaceWarpGlsl : ''}
float waterFoamYouth( float air, float foam ) {
  return max( smoothstep( ${f(YOUTH_AIR[0])}, ${f(YOUTH_AIR[1])}, air ), smoothstep( ${f(YOUTH_COVER[0])}, ${f(YOUTH_COVER[1])}, foam ) );
}
float waterFreshPhase( vec3 lace, vec2 edge, vec2 p ) {${lace ? '\n  p *= LACE_STRETCH;' : ''}
  vec2 tile = texture( waterFoamTile, p / ( FOAM_CELL * FOAM_TILE ) ).rg;
  float streak = ${lace && !streaks ? 'tile.g' : '0.5'};
  ${streaks ? `if ( lace.z > 0.0 ) streak = ${streak};` : ''}
  float local = clamp( lace.x + lace.y * tile.g + lace.z * streak, 0.0, 1.0 );
  if ( local <= 0.001 ) return 0.0;
  float s = local * ${FOAM_LEVELS.toFixed(1)};
  int k = min( ${FOAM_LEVELS - 1}, int( floor( s ) ) );
  float radius = mix( FOAM_THRESHOLDS[ k ], FOAM_THRESHOLDS[ k + 1 ], s - float( k ) ) + edge.y;
  return 1.0 - smoothstep( radius - edge.x, radius + edge.x, tile.r );
}
float waterFreshFoamCover( vec2 p, vec2 flow, float foam, float youth, float time, float footprint ) {
  if ( foam <= 0.001 ) return 0.0;${lace ? '\n  p = waterLaceWarp( p );' : ''}
  float aged = 1.0 - youth;
  float f = clamp( foam, 0.0, 1.0 );
  float spread = f * ( 1.0 - f ) * ( 1.0 + ${f(AGED_STREAKS.gather)} * aged );
  vec3 lace = vec3( f - spread, 2.0 * spread * youth, 2.0 * spread * aged );
  float opacity = mix( ${f(AGED_OPACITY)} + ${f(1 - AGED_OPACITY)} * smoothstep( ${f(OPACITY_COVER[0])}, ${f(OPACITY_COVER[1])}, foam ), 1.0, youth );
  float fade = smoothstep( 0.25, 1.0, footprint / FOAM_CELL );
  float cover = clamp( lace.x + 0.5 * lace.y + 0.5 * lace.z, 0.0, 1.0 ) + max( foam - 1.0, 0.0 );
  if ( fade < 1.0 ) {
    float soft = ${f(AGED_SOFTNESS)} * aged + ${f(FOOTPRINT_SOFTNESS)} * footprint / FOAM_CELL;
    vec2 edge = vec2( ${f(FOAM_EDGE)} + soft, soft * smoothstep( 0.75, 1.0, f ) );
    float a = fract( time / FOAM_FLOW_PERIOD );
    float b = fract( a + 0.5 );
    float weight = 1.0 - abs( 2.0 * a - 1.0 );
    float offset = smoothstep( 0.0, 0.5, length( flow ) * FOAM_FLOW_PERIOD / FOAM_CELL );
    float coverA = waterFreshPhase( lace, edge, p - flow * a * FOAM_FLOW_PERIOD );
    float coverB = waterFreshPhase( lace, edge, p - flow * b * FOAM_FLOW_PERIOD + vec2( 17.3, 5.9 ) * FOAM_CELL * offset );
    cover = mix( weight * coverA + ( 1.0 - weight ) * coverB, cover, fade );
  }
  return cover * opacity;
}
`;
}

/** The bubble tint's GLSL (`bubbleTint`), from the youth `RICH_FOAM_FRESH` works out. */
export const BUBBLE_TINT_GLSL = `${f(BUBBLE_TINT)} * waterYouth * clamp( vWaterFoam, 0.0, 1.0 )`;

/**
 * Whether the Rich foam ages, and with its streaks (dev: `?foamFresh=off` draws it as before; `?foamStreaks=on|off`
 * forces the streaks either way, whatever the graphics say; `window.waterFoamFresh(on)` or
 * `waterFoamFresh({ on, streaks })` in a page).
 */
export interface FoamFreshMode {
  on: boolean;
  streaks: boolean;
}
const forcedStreaks = devParam('foamStreaks');
export const foamFreshMode: FoamFreshMode = { on: devParam('foamFresh') !== 'off', streaks: forcedStreaks !== 'off' };
const listeners = new Set<() => void>();

/** Called whenever the switch changes: the Rich programs compile again. */
export function onFoamFreshChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFoamFresh(patch: boolean | Partial<FoamFreshMode>): void {
  const was = foamFreshProgramKey();
  Object.assign(foamFreshMode, typeof patch === 'boolean' ? { on: patch } : patch);
  if (foamFreshProgramKey() !== was) for (const listener of listeners) listener();
}

/**
 * The graphics' choice: the streaks come without the Sea detail's rich sea (Low and Medium, the M1's Auto), unless
 * `?foamStreaks=` forces them. High and Ultra spend the Rich tank's headroom on the sun's glitter: with it, the M1 timed
 * the streaks' reads at +0.6 to +1.3 ms a frame on a foam-filled Canyon view (the cost pass, 2026-10-19), past the
 * +0.5 ms budget, where Medium timed them within its noise. There aged foam gathers into its round patches.
 */
export function setFoamStreaksForGraphics(richSea: boolean): void {
  setFoamFresh({ streaks: forcedStreaks === 'on' ? true : forcedStreaks === 'off' ? false : !richSea });
}

/** The Rich programs' cache-key part: none when the foam ages with its streaks (the default). */
export function foamFreshProgramKey(): string {
  if (!foamFreshMode.on) return '-no-foam-fresh';
  return foamFreshMode.streaks ? '' : '-foam-fresh-no-streaks';
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterFoamFresh: setFoamFresh });
