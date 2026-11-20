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
 * ## C2 step 5j: the same reflectance from the bubble layers, `?foamAlbedo=bubbles`
 *
 * Step 5i's own next item, and its own words for why: the cap above *"stops at 1.102 because the sourced cap stops at
 * 0.50"*. Reflectance is not a constant with an age on it — it is set by the **number of bubble layers** the view path
 * crosses, **N ≈ α·h / d_bubble**, through **R(N) ≈ 0.55·(1 − e^(−0.2·N))**: 0.10 at one layer, 0.55 past about 25
 * [S, as above, plus Whitlock et al. 1982 and Stabeno & Monahan 1986 for R(N) and Deane & Stokes 2002 for the layer].
 * The Rich fragment already carries every term: `vWaterAir` is α, `vWaterPlumeDepth` and `vWaterDepth` give h under
 * the plume's own clamp, and `vWaterFoam` is the surface mat. One new constant, the bubble's 1 mm.
 *
 * **It is a third value of the same switch, not a replacement.** The owner has not ridden `?foamAlbedo=on` yet, so
 * `on` is left exactly as step 5i shipped it — same uniform, same GLSL, same program key — and `bubbles` sits beside
 * it. Both level the uniform to the same 0.50, so the only difference between them is the per-pixel scale, and every
 * mesh without a layer count of its own draws the same thing under either.
 *
 * **What the measurement says about it is in `c2-step5j.md`, and it does not flatter it.** The field spans the whole
 * sourced chain where the cap spanned two values — over the 18 450 render nodes carrying foam in the measured frame,
 * N runs from under one layer (40 % of them) to 685, and R(N) from 0.001 to the ceiling [M] — but it lands
 * **further from the owner's photograph than the cap does** on every measure, because **the deep plumes are under the
 * thick cover**: weighting by cover lifts the field's mean reflectance from 0.265 to **0.433**, against the cap's
 * 0.335 [M]. On the photograph's own camera the within-frame ratio is **1.146** against the cap's 1.102 and the
 * photograph's 0.748. And it moves the aged lace — step 5i's own named likeliest objection — the **wrong** way, up
 * rather than down, for a reason worth knowing before anyone touches `FOAM_REFLECTANCE.aged`: the foam's white is
 * mixed over the water by the cover, so **once the albedo is under the lit water's own brightness, lowering it makes
 * the pixel brighter**. The aged end has a floor and the floor is the water. **Read §5.1 of that file before moving
 * either end**, and §5.2 for why a layer count cannot grade an aerated plume at all.
 *
 * Dev: `?foamAlbedo=on` draws the cap, `?foamAlbedo=bubbles` the layers; without either every program and every
 * uniform is today's, byte for byte. `window.waterFoamAlbedo('bubbles')` switches it in a page (and the boolean form
 * still means `on`) — the tank and every mesh sharing its uniforms follow at once; the far ocean takes its value at
 * construction, so it follows on the next reload.
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
 *
 * **`aged` is the lever for the owner's likeliest objection, and step 5j measured that it is the only cheap one.**
 * If the aged lace behind the break reads as a sandy stain, this number is a thin-foam value where the sourced
 * ten-second end is 0.03–0.10; moving it costs nothing. `?foamAlbedo=bubbles` is the principled-looking alternative
 * and it is measurably worse (`c2-step5j.md` §5.1 and §9 item 2).
 */
export const FOAM_REFLECTANCE = { fresh: 0.50, aged: 0.18 } as const;

/** The linear scale on `#d8f2e9` that makes its luminance `FOAM_REFLECTANCE.fresh`: 0.5954. */
export const FOAM_CAP_SCALE = FOAM_REFLECTANCE.fresh / FOAM_COLOUR_LUMINANCE;

/**
 * One bubble layer's thickness, m [S, Deane & Stokes 2002, through `docs/research/whitewater-sources.md`: the bubbles
 * with radii above about **0.5 mm** carry most of a plume's void fraction, so a layer is about **1 mm** across]. It is
 * the only new constant in `?foamAlbedo=bubbles`, and it is the one that turns a void fraction and a depth into a
 * count.
 */
export const BUBBLE_DIAMETER = 0.001;

/**
 * Whitewater's reflectance as a function of the number of bubble layers along the path [S, step 5h §5.3 and
 * `whitewater-sources.md`]: **R(N) ≈ 0.55·(1 − e^(−0.2·N))**, from a single layer at **0.10** to the laboratory
 * ceiling of **0.55** past about 25 layers (Whitlock et al. 1982; Stabeno & Monahan 1986, cited through Dierssen 2019
 * and Koepke 1984). `ceiling` is R(∞) and `rate` is the per-layer exponent; neither was fitted here, and together they
 * reproduce the published 0.10 at N = 1 (0.0997) and 0.55 past 25 (0.546).
 */
export const FOAM_LAYERS = { ceiling: 0.55, rate: 0.2 } as const;

/** R(N), the reflectance of `n` bubble layers. */
export function layerReflectance(n: number): number {
  return FOAM_LAYERS.ceiling * (1 - Math.exp(-FOAM_LAYERS.rate * Math.max(0, n)));
}

/**
 * The bubble layers along the view path at a pixel, from the fields the drawing already carries:
 * **N = α·h / d_bubble + cover**, where
 * - **α** is the drawn void fraction (`vWaterAir`) and **h** the plume's depth clamped at the water's own
 *   (`vWaterPlumeDepth`, `vWaterDepth` — the same clamp the plume's own whiteness uses, `plumeReach`), so α·h is the
 *   air per unit area in the plume and α·h/d_bubble is how many layers of it the path crosses;
 * - **cover** is the surface foam's own mat (`vWaterFoam`), counted as **at most one layer**, which is what the
 *   sourced "a single bubble layer ≈ 0.10" is a measurement of. At small N, R is very nearly linear in N, so a cover
 *   of c reads as the area-average of a one-layer foam over a fraction c — which is what a cover fraction means.
 *   Foam above 1 (a Canyon lip's landing writes it) is clamped rather than counted as a second layer.
 */
export function bubbleLayers(air: number, plumeDepth: number, depth: number, foam: number): number {
  const reach = Math.max(0, Math.min(plumeDepth, depth));
  return (Math.max(0, air) * reach) / BUBBLE_DIAMETER + Math.min(1, Math.max(0, foam));
}

/** The foam's reflectance at a pixel from the bubble layers under it (`?foamAlbedo=bubbles`): R(N). */
export function bubbleReflectance(air: number, plumeDepth: number, depth: number, foam: number): number {
  return layerReflectance(bubbleLayers(air, plumeDepth, depth, foam));
}

/**
 * What the shader multiplies the (capped) foam colour by in `bubbles`: R(N) over the cap, so **0.199 at one layer**
 * (0.10, the sourced single layer) and **1.10 at the ceiling** (0.55). It passes 1 — the cap itself — at about 12
 * layers. The uniform keeps step 5i's 0.50 in both values of the switch, so every mesh without a layer count of its
 * own (the roller front, the spilling curl, the swept lip, the far ocean) draws exactly what `on` draws.
 */
export function bubbleAlbedoScale(air: number, plumeDepth: number, depth: number, foam: number): number {
  return bubbleReflectance(air, plumeDepth, depth, foam) / FOAM_REFLECTANCE.fresh;
}

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

/**
 * GLSL (Rich fragment) for `?foamAlbedo=bubbles`: the twin of `bubbleAlbedoScale`, written out from the same exported
 * constants. Same name and same job as the cap's `waterFoamAlbedoScale`, two arguments wider, because a layer count
 * needs the plume's depth and the water's as well as the air and the cover — all four are varyings the Rich fragment
 * already has.
 */
export const waterFoamBubblePars = /* glsl */ `
// The bubble layers whitewater actually reflects from (C2 step 5j): N = air * h / ${f(BUBBLE_DIAMETER)} m + cover,
// R(N) = ${f(FOAM_LAYERS.ceiling)} * ( 1 - exp( -${f(FOAM_LAYERS.rate)} N ) ) -- ${layerReflectance(1).toFixed(3)} at one layer,
// ${layerReflectance(25).toFixed(3)} past 25 (Deane & Stokes 2002 for the layer; Whitlock 1982 and Stabeno & Monahan 1986 for R).
float waterFoamLayers( float air, float plume, float depth, float foam ) {
  float reach = max( 0.0, min( plume, depth ) );
  return max( 0.0, air ) * reach / ${f(BUBBLE_DIAMETER)} + clamp( foam, 0.0, 1.0 );
}
float waterFoamAlbedoScale( float air, float foam, float plume, float depth ) {
  float layers = waterFoamLayers( air, plume, depth, foam );
  return ${f(FOAM_LAYERS.ceiling / FOAM_REFLECTANCE.fresh)} * ( 1.0 - exp( -${f(FOAM_LAYERS.rate)} * layers ) );
}
`;

/** The pars the Rich fragment takes for the value of `?foamAlbedo` in force: the cap's, or the bubble layers'. */
export function foamAlbedoPars(): string {
  return foamAlbedoBubbles() ? waterFoamBubblePars : waterFoamAlbedoPars;
}

/** The one line the age hooks on: the Rich foam's crease, which every site that paints foam white multiplies in. */
const CREASE_LINE = 'float waterCrease = mix( 1.0, 0.88 + 0.12 * waterChurn.y, waterFresh );';

/**
 * The Rich fragment with the foam's albedo scaled: the crease every foam-white site multiplies in takes the scale with
 * it, so the tank's surface foam, the plume's creased white and the roller band's own `waterFoamColor * waterCrease`
 * all follow together — while the band's fresh albedo (`waterBandAlbedo`, a fresh crest) keeps the cap alone, which
 * is what it is. `bubbles` hands the call the two depth varyings as well, for the layer count (step 5j); the hook is
 * the same one line either way.
 */
export function withFoamAlbedo(fragment: string, bubbles = false): string {
  if (fragment.split(CREASE_LINE).length !== 2) throw new Error('The foam albedo needs the Rich foam\'s crease once');
  const call = bubbles
    ? 'waterFoamAlbedoScale( vWaterAir, vWaterFoam, vWaterPlumeDepth, vWaterDepth )'
    : 'waterFoamAlbedoScale( vWaterAir, vWaterFoam )';
  return fragment.replace(CREASE_LINE, () => `${CREASE_LINE}\n  waterCrease *= ${call};`);
}

/**
 * Which of the two sourced foam albedos is drawn (dev: `?foamAlbedo=on` for step 5i's cap aged over the plume's void
 * fraction, `?foamAlbedo=bubbles` for step 5j's bubble-layer count; anything else, including nothing, draws today's).
 * `on` is **exactly** what step 5i shipped and nothing in 5j moves it, so a three-way comparison on one wave is off
 * against 5i's cap against the field. `window.waterFoamAlbedo('bubbles')` switches it in a page, and the boolean form
 * `window.waterFoamAlbedo(true)` still means `on`.
 */
export type FoamAlbedoValue = 'off' | 'on' | 'bubbles';
const requested = devParam('foamAlbedo')?.trim().toLowerCase();
export const foamAlbedoMode: { value: FoamAlbedoValue } = {
  value: requested === 'on' ? 'on' : requested === 'bubbles' ? 'bubbles' : 'off',
};
const listeners = new Set<() => void>();

/** Whether either sourced albedo is drawn: the cap is in the uniform for both, so this gates the uniform too. */
export function foamAlbedoOn(): boolean {
  return foamAlbedoMode.value !== 'off';
}

/** Whether the reflectance comes from the bubble layers (step 5j) rather than from the aged cap (step 5i). */
export function foamAlbedoBubbles(): boolean {
  return foamAlbedoMode.value === 'bubbles';
}

/** Called whenever the switch changes: the foam colour is re-levelled and the Rich programs compile again. */
export function onFoamAlbedoChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFoamAlbedo(on: boolean | FoamAlbedoValue): void {
  const value: FoamAlbedoValue = on === true ? 'on' : on === false ? 'off' : on;
  if (value === foamAlbedoMode.value) return;
  foamAlbedoMode.value = value;
  for (const listener of listeners) listener();
}

/**
 * The Rich programs' cache-key part: none with the switch off (the default), so today's program is reused; and a
 * different part for each value, so the cap's program and the layers' are never confused for one another.
 */
export function foamAlbedoProgramKey(): string {
  return foamAlbedoMode.value === 'off' ? '' : foamAlbedoMode.value === 'on' ? '-foam-albedo' : '-foam-albedo-bubbles';
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterFoamAlbedo: setFoamAlbedo });
