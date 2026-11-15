/**
 * What whitewater actually reflects (C2 step 5i), drawn only and opt-in: `?foamAlbedo=on`.
 *
 * The owner's standing complaint about every spot is that *"the body of the wave itself is quite thin, in some waves
 * a lot of it is foam."* Step 5h measured the cause and did not build the fix, because it changes how every spot
 * looks. The measurement is a **within-frame ratio** — the broken water against the flat water in the same image, in
 * linear light — so no exposure or grading difference can explain it:
 *
 * | | n | linear, broken water vs flat water in the SAME frame |
 * | --- | --- | --- |
 * | the owner's photograph of Surf Abu Dhabi | 101 760 px | **0.75 — the foam is DARKER than the water beside it** |
 * | ours, the same camera geometry | 63 800 px | **1.31 — ours is BRIGHTER** |
 *
 * A factor of 1.75 with the sign reversed, and the cause has no free parameter in it: `waterFoamColor` (`#d8f2e9`) is
 * used **directly as the diffuse albedo** where foam covers, and its linear luminance is **0.840** — where measured
 * whitewater reflects **≈ 0.50 at its whitest**, 0.18 thin, 0.10 at a single bubble layer, and 0.03–0.10 after ten
 * seconds, never above about 0.55–0.60 in the laboratory (Dierssen 2019 field hyperspectral; Koepke 1984, via the
 * water-physics advisor; `../../../docs/research/wave-strategy-alternatives/c2-step5h.md` §5.3). **Real whitewater is
 * not white**, and in a side-on view it is the darker thing in the frame.
 *
 * Two sourced numbers and no third:
 * - the **cap**: the foam colour is scaled in linear light so its luminance is `FOAM_REFLECTANCE.fresh` = 0.50, an
 *   active Stage A whitecap, the brightest and freshest foam there is. It is applied to the **uniform**, so every
 *   mesh that uses `waterFoamColor` as an albedo takes it at once — the tank, the roller front, the spilling curl,
 *   the swept lip's white and the far ocean's whitecaps — rather than only the one line 5h measured.
 * - the **age**: where the tank's Rich foam is drawn, its albedo falls from 0.50 to 0.18 — thin foam and residual
 *   plume — as the foam ages, over the youth channel the drawing already has (`foamYouth`).
 *
 * **The drawn foam field does not carry an age, and this does not invent one.** `FoamField` carries age in the
 * physics, as dense whitewater (e-folding 3 s) decaying into a residual lace (8–20 s by spot), but
 * `SurfZoneSimulation`'s snapshot writes only their **sum** into the surface texture. The one age the drawing has is
 * the plume's void fraction, which empties as the bubbles rise out in 1–4 s under a bore (`foamFreshness.ts`), and
 * that is the channel used here. So this curve spans fresh to thin on a **1–4 s** clock; the sourced 0.03–0.10 at
 * **ten seconds is not drawn**, because no drawn channel has a ten-second clock to carry it.
 *
 * Nothing new is read, carried or felt: the scale is arithmetic on the two varyings the Rich fragment already has
 * (`vWaterAir`, `vWaterFoam`), and the cap is a uniform's value. The foam field, its snapshot and the physics are
 * untouched, as is every program with the switch off.
 *
 * **Judge it by the within-frame ratio, never by the foam on its own.** 5h predicts it will read as "dirty" at first
 * glance, and that reaction is the point: compare the broken water with the flat water inside one picture.
 *
 * What it measures to, on the photograph's own camera and boxes (`c2-step5i.md` §3): the near-white share of the
 * broken region falls from **83.5 % to 18.7 %** against the photograph's **14.6 %**, and the within-frame ratio
 * from **1.310 to 1.102** against its **0.748** — over the same 63 800 px, with the off leg reproducing step 5h's
 * published figures to 0.1 of 255. It does **not** reach the photograph; §7 of that file says what this will not claim and §10 what is left.
 *
 * Dev: `?foamAlbedo=on` draws it; without it every program and every uniform is today's, byte for byte.
 * `window.waterFoamAlbedo(on)` switches it in a page — the tank and every mesh sharing its uniforms follow at once;
 * the far ocean takes its value at construction, so it follows on the next reload.
 */
import { Color } from 'three';
import { DEV_TOOLS, devParam } from '../../devTools';
import { YOUTH_AIR, YOUTH_COVER, foamYouth } from './foamFreshness';

/** The foam colour's hue, unchanged: only its level moves (`WaterSurface`, `FarFieldOcean`). */
export const FOAM_COLOUR_HEX = '#d8f2e9';

/**
 * `#d8f2e9`'s linear (sRGB primaries, Rec. 709 luminance) luminance, measured through the sRGB inverse EOTF:
 * 0.2126·0.68669 + 0.7152·0.88792 + 0.0722·0.81485 (step 5h published it to three figures, 0.840). **This is a radiance-space quantity; the hex is a code value.**
 */
export const FOAM_COLOUR_LUMINANCE = 0.83986;

/**
 * Visible reflectance of whitewater, sourced [S, Dierssen 2019; Koepke 1984, via the advisor]. Both ends are
 * published single values, not the centres of brackets:
 * - `fresh` — an active Stage A whitecap, the brightest, freshest thing there is (the laboratory ceiling for thick
 *   foam is 0.55–0.60, which is why 0.50 is a cap and not a guess);
 * - `aged` — thin foam and the residual plume.
 *
 * The chain goes on below this (a single bubble layer ≈ 0.10, 0.03–0.10 after ten seconds) and is **not drawn**: see
 * the file header on why the drawn field has no ten-second clock.
 */
export const FOAM_REFLECTANCE = { fresh: 0.50, aged: 0.18 } as const;

/** The linear scale on `#d8f2e9` that makes its luminance `FOAM_REFLECTANCE.fresh`: 0.5954. */
export const FOAM_CAP_SCALE = FOAM_REFLECTANCE.fresh / FOAM_COLOUR_LUMINANCE;

/**
 * The foam's reflectance at a pixel, from the plume's void fraction and the foam's cover: fresh foam at
 * `FOAM_REFLECTANCE.fresh`, aged at `.aged`, over the youth the drawing already has (`foamYouth`, whose air term
 * empties in 1–4 s under a bore and whose cover term keeps foam near saturation young).
 */
export function foamReflectance(air: number, foam: number): number {
  const youth = foamYouth(air, foam);
  return FOAM_REFLECTANCE.aged + (FOAM_REFLECTANCE.fresh - FOAM_REFLECTANCE.aged) * youth;
}

/**
 * What the shader multiplies the (already capped) foam colour by: `foamReflectance` over the cap, so 1 on fresh foam
 * and 0.36 on aged. The cap itself lives in the uniform, so a mesh without a youth channel still gets it.
 */
export function foamAlbedoScale(air: number, foam: number): number {
  return foamReflectance(air, foam) / FOAM_REFLECTANCE.fresh;
}

/** The `waterFoamColor` uniform's value: `#d8f2e9`, scaled in linear light to the sourced cap when the switch is on. */
export function foamAlbedoColour(): Color {
  const colour = new Color(FOAM_COLOUR_HEX);
  return foamAlbedoOn() ? colour.multiplyScalar(FOAM_CAP_SCALE) : colour;
}

const f = (value: number) => value.toFixed(4);

/**
 * GLSL (Rich fragment): `waterFoamAlbedoScale`, the twin of `foamAlbedoScale`. Its youth is `foamYouth`'s, written out
 * here from the same exported constants rather than calling `waterFoamYouth`, which only exists when `?foamFresh` is
 * on — so this reads the same whatever the other foam switches say.
 */
export const waterFoamAlbedoPars = /* glsl */ `
// What whitewater reflects (C2 step 5i): fresh ${f(FOAM_REFLECTANCE.fresh)} to aged ${f(FOAM_REFLECTANCE.aged)}
// (Dierssen 2019; Koepke 1984), over the cap the foam colour already carries.
float waterFoamAlbedoScale( float air, float foam ) {
  float youth = max( smoothstep( ${f(YOUTH_AIR[0])}, ${f(YOUTH_AIR[1])}, air ), smoothstep( ${f(YOUTH_COVER[0])}, ${f(YOUTH_COVER[1])}, foam ) );
  return mix( ${f(FOAM_REFLECTANCE.aged / FOAM_REFLECTANCE.fresh)}, 1.0, youth );
}
`;

/** The one line the age hooks on: the Rich foam's crease, which every site that paints foam white multiplies in. */
const CREASE_LINE = 'float waterCrease = mix( 1.0, 0.88 + 0.12 * waterChurn.y, waterFresh );';

/**
 * The Rich fragment with the foam's albedo aged: the crease every foam-white site multiplies in takes the age scale
 * with it, so the tank's surface foam, the plume's creased white and the roller band's own `waterFoamColor *
 * waterCrease` all age together — while the band's fresh albedo (`waterBandAlbedo`, a fresh crest) keeps the cap
 * alone, which is what it is.
 */
export function withFoamAlbedo(fragment: string): string {
  if (fragment.split(CREASE_LINE).length !== 2) throw new Error('The foam albedo needs the Rich foam\'s crease once');
  return fragment.replace(CREASE_LINE, () => `${CREASE_LINE}\n  waterCrease *= waterFoamAlbedoScale( vWaterAir, vWaterFoam );`);
}

/** Whether the sourced foam albedo is drawn (dev: `?foamAlbedo=on`; `window.waterFoamAlbedo(on)` in a page). */
export const foamAlbedoMode = { on: devParam('foamAlbedo')?.trim().toLowerCase() === 'on' };
const listeners = new Set<() => void>();

export function foamAlbedoOn(): boolean {
  return foamAlbedoMode.on;
}

/** Called whenever the switch changes: the foam colour is re-levelled and the Rich programs compile again. */
export function onFoamAlbedoChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFoamAlbedo(on: boolean): void {
  if (on === foamAlbedoMode.on) return;
  foamAlbedoMode.on = on;
  for (const listener of listeners) listener();
}

/** The Rich programs' cache-key part: none with the switch off (the default), so today's program is reused. */
export function foamAlbedoProgramKey(): string {
  return foamAlbedoMode.on ? '-foam-albedo' : '';
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterFoamAlbedo: setFoamAlbedo });
