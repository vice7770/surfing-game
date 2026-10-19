/**
 * The foam's look after the playtest of 2026-10-21 (M4, sunset, Rich), drawn only and Rich only:
 * - **the lace** (item 3, High's honeycomb): the aged lace's network read through a slow warp, so its cells vary in
 *   size and shape and stop reading as a tiled honeycomb, and, without the streaks (High, Ultra), aged foam gathering
 *   into its round patches as `setFoamStreaksForGraphics` meant it to (it read the patches' mean, so the network was
 *   one even honeycomb);
 * - **dense foam** (item 4b, the flat pink sheets): foam held near saturation churns as fresh whitewater does (its
 *   clumps, creases and relief), whether or not the plume's air is still under it, so a dense mat is lumpy and its lumps
 *   shade toward the sun and away from it under a low sun;
 * - **the light through foam** (item 4b): looking toward a low sun, two terms painted foam the sun's colour whatever
 *   way it faced, so a sheet read as one flat pink plane: the fresh foam's backlit glow, now kept to thin foam as its
 *   comment always said (a dense mat is opaque), and the roller band's wrapped sun, now shining through only near the
 *   crest of a band the sun is behind, where the band is thin and the sun enters it, and elsewhere no more than the
 *   light the band's own surface or level water around it takes. At sunset the wrap lit the whole face at about half
 *   the sun's full beam, against a tenth on the water beside it: turned from the sun it glowed, and turned toward it
 *   its N·L was more than doubled, flattening the churn's relief by half. Faces turned from the sun are now lit by the
 *   sky, and sunlit faces keep their relief.
 *
 * Nothing new is read or carried: the warp is arithmetic, the round patches are the lace tile's green channel the same
 * read already fetches, and the churn is the one the Rich foam already samples. The Rich tank sits at a cost cliff on the
 * M1 (docs/research/foam-fresh-2026-10-19, glitter-lite-2026-10-20), so each part is its own switch for the timing.
 *
 * Dev: `?foamLook=off` compiles the Rich foam as before (its program is today's, byte for byte), and draws a spilling
 * spot's white with square edges (`drawnEdges`); `?foamLook=lace`, `dense` or `light` keeps one part;
 * `window.waterFoamLook(on)` or `waterFoamLook({ on, lace, dense, light })` switches the shading in a page.
 */
import { DEV_TOOLS, devParam } from '../../devTools';
import { smoothstep } from '../../wave/Bathymetry';
import { BAND_VOLUME } from './rollerGlsl';

/**
 * The lace's warp: the network is read at p + amplitude·(sin(k₁·p + bend·sin(k₃·p)), sin(k₂·p + bend·sin(k₄·p))), m.
 * Each wave is given as its wavelength (m) and heading (degrees from +x toward +z); the bend keeps the warp from
 * repeating as one lattice. The cells' size then varies by up to about ±40 % and their shape with it, over 7–14 m.
 */
export const LACE_WARP = {
  amplitude: 0.38,
  bend: 0.8,
  waves: [
    { length: 7.3, heading: 34 },
    { length: 9.1, heading: 115 },
    { length: 13.7, heading: 83 },
    { length: 11.9, heading: -14 },
  ],
} as const;

const waveVector = (wave: { length: number; heading: number }): [number, number] => {
  const k = (2 * Math.PI) / wave.length;
  const angle = (wave.heading * Math.PI) / 180;
  return [k * Math.cos(angle), k * Math.sin(angle)];
};
const [K1, K2, K3, K4] = LACE_WARP.waves.map(waveVector);

/**
 * The lace's cells are drawn this much longer along the waves' travel (+z) than across: foam left behind a bore is
 * drawn out along the flow. Applied to each flow-map phase's carried point, so the lace still moves with the current.
 */
export const LACE_STRETCH = 1.35;

/** Where the lace's network is read for world (x, z), m (`LACE_WARP`): before the stretch and the flow map. */
export function laceWarp(x: number, z: number): [number, number] {
  const { amplitude, bend } = LACE_WARP;
  const u = Math.sin(K1[0] * x + K1[1] * z + bend * Math.sin(K3[0] * x + K3[1] * z));
  const v = Math.sin(K2[0] * x + K2[1] * z + bend * Math.sin(K4[0] * x + K4[1] * z));
  return [x + amplitude * u, z + amplitude * v];
}

/** Foam over which a mat churns as fresh whitewater does, its air gone or not: only a source holds it there. */
export const DENSE_CHURN = [0.8, 1] as const;

/** CPU twin of the GLSL `waterChurnFresh`: the churn's share, from the plume's freshness (0–1) and the foam. */
export function churnFreshness(airFreshness: number, foam: number): number {
  return Math.max(airFreshness, smoothstep(DENSE_CHURN[0], DENSE_CHURN[1], foam));
}

const f = (value: number) => value.toFixed(4);
const vec = (k: [number, number]) => `vec2( ${f(k[0])}, ${f(k[1])} )`;

/** The lace's read point, in the tile's world metres, for a phase's carried point (x, z), m (`LACE_STRETCH`). */
export function laceStretch(x: number, z: number): [number, number] {
  return [x, z / LACE_STRETCH];
}

/** GLSL: `waterLaceWarp` and `LACE_STRETCH`, the twins of `laceWarp` and `laceStretch`. */
export const waterLaceWarpGlsl = /* glsl */ `
const vec2 LACE_STRETCH = vec2( 1.0, ${f(1 / LACE_STRETCH)} );
vec2 waterLaceWarp( vec2 p ) {
  vec2 bend = ${f(LACE_WARP.bend)} * sin( vec2( dot( p, ${vec(K3)} ), dot( p, ${vec(K4)} ) ) );
  return p + ${f(LACE_WARP.amplitude)} * sin( vec2( dot( p, ${vec(K1)} ), dot( p, ${vec(K2)} ) ) + bend );
}`;

/** GLSL: `waterChurnFresh`, the twin of `churnFreshness`, from the void fraction and the foam. Needs `waterChurnPars`. */
export const waterChurnFreshGlsl = /* glsl */ `
float waterChurnFresh( float air, float foam ) {
  return max( waterFreshness( air ), smoothstep( ${f(DENSE_CHURN[0])}, ${f(DENSE_CHURN[1])}, foam ) );
}`;

/**
 * The Rich fragment with dense foam churning: every reading of the churn's freshness from the air alone (the foam's
 * churn, crease and glow, and the normal's relief, the roller's hooked lines among them) reads it from the foam too.
 */
export function withDenseChurn(fragment: string): string {
  const air = 'waterFreshness( vWaterAir )';
  if (!fragment.includes(air)) throw new Error('The dense foam needs the churn\'s freshness from the air');
  return fragment.split(air).join('waterChurnFresh( vWaterAir, vWaterFoam )');
}

/**
 * The backlit glow's share left on dense foam (`thinGlow`): from `GLOW_THICK[0]` of foam up to `GLOW_THICK[1]` it falls to
 * `GLOW_DENSE`. Thin fresh foam glows as before.
 */
export const GLOW_THICK = [0.7, 1] as const;
export const GLOW_DENSE = 0.25;

/** CPU twin of the glow's share for foam of a value (`withFoamLight`). */
export function thinGlow(foam: number): number {
  return 1 - (1 - GLOW_DENSE) * smoothstep(GLOW_THICK[0], GLOW_THICK[1], foam);
}

/** The band's N·L over which the sun stops shining through it: a face turned toward the sun takes it directly. */
export const BAND_THROUGH = [0, 0.3] as const;

/**
 * CPU twin of the roller band's wrapped sun with its cap: the wrap (N·L + w)/(1 + w) held to no more than the band's own
 * N·L or level water's (the sun's height, L_y), except where the sun shines through: near the crest (`fresh` 1,
 * `waterRollerFresh`) of a face turned from it (`BAND_THROUGH`); less the N·L three's light already gives.
 */
export function bandVolumeLight(nDotL: number, sunHeight: number, fresh = 0, wrap = 1): number {
  const wrapped = Math.max(0, (nDotL + wrap) / (1 + wrap));
  const capped = Math.min(wrapped, Math.max(Math.max(0, nDotL), sunHeight));
  const through = fresh * fresh * (1 - smoothstep(BAND_THROUGH[0], BAND_THROUGH[1], nDotL));
  return capped + (wrapped - capped) * through - Math.max(0, nDotL);
}

const GLOW = 'totalEmissiveRadiance += 0.18 * waterFresh * ( 1.0 - waterChurn.x ) * pow(';
const WRAP = 'max( 0.0, ( waterBandSun + 1.0 ) / 2.0 )';

/**
 * The Rich fragment with the light through foam kept to what the foam lets through (see the header): the glow on thin
 * fresh foam only, its freshness the air's (not the dense foam's churn), and the roller band's wrap capped.
 */
export function withFoamLight(fragment: string): string {
  if (fragment.split(GLOW).length !== 2) throw new Error('The foam light needs the fresh foam\'s glow once');
  let out = fragment.replace(GLOW, `totalEmissiveRadiance += 0.18 * waterFreshness( vWaterAir ) * waterFoamPattern
    * ( 1.0 - ${f(1 - GLOW_DENSE)} * smoothstep( ${f(GLOW_THICK[0])}, ${f(GLOW_THICK[1])}, vWaterFoam ) ) * ( 1.0 - waterChurn.x ) * pow(`);
  if (out.includes(BAND_VOLUME)) {
    if (!BAND_VOLUME.includes(WRAP)) throw new Error('The foam light needs the band\'s wrap');
    out = out.replace(BAND_VOLUME, BAND_VOLUME.replace(WRAP,
      `mix( min( ${WRAP}, max( max( 0.0, waterBandSun ), waterSunDirection.y ) ), ${WRAP}, waterRollerFresh * waterRollerFresh
    * ( 1.0 - smoothstep( ${f(BAND_THROUGH[0])}, ${f(BAND_THROUGH[1])}, waterBandSun ) ) )`));
  }
  return out;
}

/** The foam look's parts (dev): all on by default. */
export interface FoamLookMode {
  on: boolean;
  lace: boolean;
  dense: boolean;
  light: boolean;
}
const asked = devParam('foamLook');
const only = asked === 'lace' || asked === 'dense' || asked === 'light' ? asked : undefined;
export const foamLookMode: FoamLookMode = {
  on: asked !== 'off',
  lace: !only || only === 'lace',
  dense: !only || only === 'dense',
  light: !only || only === 'light',
};
const listeners = new Set<() => void>();

/** Called whenever the switch changes: the Rich programs compile again. */
export function onFoamLookChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFoamLook(patch: boolean | Partial<FoamLookMode>): void {
  const was = foamLookProgramKey();
  Object.assign(foamLookMode, typeof patch === 'boolean' ? { on: patch } : patch);
  if (foamLookProgramKey() !== was) for (const listener of listeners) listener();
}

/** Whether each part is drawn. */
export const laceLookOn = (): boolean => foamLookMode.on && foamLookMode.lace;
export const denseLookOn = (): boolean => foamLookMode.on && foamLookMode.dense;
export const lightLookOn = (): boolean => foamLookMode.on && foamLookMode.light;

/** The Rich programs' cache-key part: none with every part on (the default). */
export function foamLookProgramKey(): string {
  if (laceLookOn() && denseLookOn() && lightLookOn()) return '';
  return `-foam-look${laceLookOn() ? '-lace' : ''}${denseLookOn() ? '-dense' : ''}${lightLookOn() ? '-light' : ''}`;
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterFoamLook: setFoamLook });
