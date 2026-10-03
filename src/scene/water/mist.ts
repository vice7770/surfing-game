/** Spray sprites at least this wide, m, are mist (G6 draws mist at 0.35–0.8 m, drops at 0.06–0.14 m). */
export const MIST_SIZE = 0.25;
/**
 * Water drops' forward-scattering asymmetry. Mie theory gives g = 0.86–0.87 for drops of 10–25 µm and 0.88 for
 * 50–500 µm (sea water 0.87–0.88; docs/research/water-physics/notes/round4-spray-mist/spray-mist.md §3,
 * after Bohren 1987), against the 0.6 mist was lit with. Half of what a drop scatters goes within 5° of straight on.
 */
export const DROP_G = 0.87;
/** Mist's forward-scattering asymmetry: fine droplets throw most light on toward the eye when backlit. That is the drops' own. */
export const MIST_G = DROP_G;

export function isMist(size: number): boolean {
  return size > MIST_SIZE;
}

/** The Henyey–Greenstein phase function, normalised over the sphere (per steradian). */
export function henyeyGreenstein(cosTheta: number, g: number): number {
  return (1 - g * g) / (4 * Math.PI * (1 + g * g - 2 * g * cosTheta) ** 1.5);
}

/**
 * The foam ball's lighting (G9, the advisor's ruling 2026-10-03): a ball of fresh foam lit as the whitewater under it is,
 * R (E_ambient + E_sun · lit) / π, with the sky's and the sun's light the scene is lit with, the sun passed on through
 * it when it is backlit, and a gold glow at its thin rim when the sun is behind it.
 * - `albedo`: fresh foam reflects a flat 55 % across the visible (Koepke 1984), and the water draws its foam at #d8f2e9,
 *   a reflectance of 0.84 so the lace reads against the Rich body (`RICH_WATER.bodyGain` scales the water under the
 *   foam, not the foam's own colour, so the ball carries the foam's reflectance and no body gain). A ball of it is
 *   thick and clustered, so light scattered between neighbours brightens it a little more: 0.9 keeps it as bright as
 *   the foam under it under the sky alone [provisional].
 * - `bounce`: the whitewater sheet under the ball lights its underside: its reflectance, the water's foam, times the
 *   light that sheet gets. The ambient runs from the sky (normal up) to that bounce (normal down).
 * - `wrap`: a ball of foam is optically thick, and light scattered round inside it fills the side the sun does not
 *   reach: the Lambert term is wrapped by this much, (n·L + w) / (1 + w); 1 is half-Lambert [provisional].
 * - `translucency`: the share of that light a backlit ball passes on to the eye side. A two-stream slab of optical
 *   depth τ passes 2 / (2 + (1 − g) τ) of the diffuse light (Bohren 1987): 0.4 for a ball of τ ≈ 20, white by the
 *   spray rule [provisional].
 * - `chroma`: how much of the sun's colour the ball's body keeps. Light scattered many times inside it, off its
 *   neighbours and the sky, is less coloured than the direct sun, so a sunset's orange sun does not paint it salmon; its
 *   thin rim, scattered once, keeps all of it [provisional].
 * - `glow`, `glowMax`, `depth`: where the foam is thin enough to pass the sun on (optical depth τ near 1: the single
 *   scattering of a thin medium, τ·e^(1−τ), peaks there), it takes that sun in the drops' forward lobe (`DROP_G`): the
 *   glow's coverage is `glow` times the phase function (1 for an isotropic scatterer, up to `glowMax`), so it shows only
 *   when the sun is within about 30° of the eye's line of sight. The ball's τ runs from `depth` across its middle to
 *   zero at its rim, as a sphere's chord does, thinned where the churn is thin [provisional].
 * - `lumps`, `relief`, `crease`: the churn's clumps (a cauliflower Worley pattern) seen `lumps` metres across the ball:
 *   their slope tilts its normal by `relief`, and their height shades it by `crease` per unit about the texture's mean,
 *   `creaseMean`, so the lumps add form and not dimness [provisional].
 */
export const FOAM_BALL = {
  albedo: 0.9, bounce: 0.84, wrap: 1, translucency: 0.4, chroma: 0.5, glow: 0.8, glowMax: 12, depth: 5, lumps: 2, relief: 0.25, crease: 0.8, creaseMean: 0.46,
} as const;

const luminance = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * The foam ball's body colour (linear, before tone mapping) at a point of its disc: `facing` is the surface normal's
 * cosine with the sun and `up` with the world's up, `sky` the sky's irradiance, `ground` the light the foam sheet under
 * the ball gets and `sun` the sun's per channel, in the scene's light units. The GLSL in `ballPars` mirrors it.
 */
export function foamBallColour(
  facing: number, up: number, sky: number, ground: number, sun: readonly [number, number, number],
): [number, number, number] {
  const lit = Math.max(0, (facing + FOAM_BALL.wrap) / (1 + FOAM_BALL.wrap));
  const passed = FOAM_BALL.translucency * Math.max(0, (FOAM_BALL.wrap - facing) / (1 + FOAM_BALL.wrap));
  const ambient = ground + (sky - ground) * (0.5 + 0.5 * up);
  const grey = luminance(sun);
  return sun.map((channel) => {
    const body = grey + (channel - grey) * FOAM_BALL.chroma;
    return (FOAM_BALL.albedo * (ambient + body * (lit + passed))) / Math.PI;
  }) as [number, number, number];
}

/**
 * The gold glow of a ball's thin parts, backlit: its colour (the foam's reflectance times the sun, whole) and its
 * coverage, 0–1. `phase` is the drops' phase function toward the eye (1 for an isotropic scatterer), `chord` the sphere's
 * chord at that point of the disc, √(1 − r²), and `density` the churn's cover there (0–1).
 */
export function foamBallGlow(phase: number, chord: number, density: number, sun: readonly [number, number, number]): { colour: [number, number, number]; coverage: number } {
  const tau = FOAM_BALL.depth * chord * (0.5 + 0.5 * density);
  return {
    colour: sun.map((channel) => (FOAM_BALL.albedo * channel) / Math.PI) as [number, number, number],
    coverage: Math.min(1, FOAM_BALL.glow * (Math.min(phase, FOAM_BALL.glowMax) / FOAM_BALL.glowMax) * tau * Math.exp(1 - tau)),
  };
}

/**
 * The light of Rich spray and mist by its optical depth (decided 2026-09-29, item 1;
 * docs/research/water-physics/notes/round4-spray-mist/spray-mist.md §3, after Bohren 1987). A cluster of optical depth τ scatters, and so adds, light: thin, the sun scattered once in the drops' forward
 * lobe (g = `MIST_G`) and the sky scattered evenly, E_sun p + E_sky / 4π per unit τ, which is dark toward a sun behind
 * the eye and burning toward one in front; thick, a white of foam's reflectance, reached by the two-stream reflectance
 * R = τ* / (2 + τ*), τ* = (1 − g) τ, which is 0.5 near τ = 15. It is drawn as the light it adds (weighted by 1 − e^−τ,
 * what it intercepts) and the share of the background it hides.
 * - `leak`: drops scatter forward, so most of the light a thin cluster stops still reaches the eye, slightly turned: it
 *   hides only this share of the background that is stopped, rising to all of it once the cluster is white. Hiding all of
 *   it at once would darken a bright foam behind every speck of thin spray [provisional].
 * - `chroma`: how much of the sun's colour the single scattering keeps. The sun a low sky gives is far more orange than
 *   the light that reaches spray through the sky's own haze and the many scatterings of a veil [provisional].
 * - `phaseMax`: the most the phase function (1 for an isotropic scatterer) may brighten a cluster, so a sun in the line
 *   of sight glows and does not blind [provisional].
 * - `readable`: the decided readability minimum. Thin spray lit from the front is physically almost invisible; it
 *   shows at least this share of the light it would be thick, as Surf's Up bent physics for readability [provisional].
 * - `whiteAt`: the reflectance at which the cluster is wholly the thick white. A splash's clusters overlap several deep
 *   where it is densest, and blend one by one, so one cluster is white at about τ = 3 where a whole column is white at 15
 *   [provisional].
 */
export const SPRAY_LIGHT = { leak: 0.3, chroma: 0.4, phaseMax: 24, readable: 0.35, whiteAt: 0.15 } as const;

const smoothstep = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** The two-stream reflectance of a non-absorbing cluster of optical depth `tau` whose drops scatter with `DROP_G` (Bohren 1987). */
export function sprayReflectance(tau: number): number {
  const reduced = (1 - DROP_G) * tau;
  return reduced / (2 + reduced);
}

/** How white a cluster of optical depth `tau` is, 0–1: its reflectance up to `SPRAY_LIGHT.whiteAt`. */
export function sprayWhite(tau: number): number {
  return smoothstep(0, SPRAY_LIGHT.whiteAt, sprayReflectance(tau));
}

/**
 * A spray cluster's light at optical depth `tau` along the view ray: its colour (linear, before tone mapping), the
 * `emission` that colour is added with (1 − e^−τ) and the share of the background it `hidden`. `phase` is the drops'
 * phase function toward the eye (4π · HG, 1 for an isotropic scatterer), `facing` and `up` the cluster's surface normal
 * against the sun and the world's up where it is thick, and `sky`, `ground` and `sun` the light, as for
 * `foamBallColour`. The GLSL in `sprayPars` mirrors it.
 */
export function sprayColour(
  tau: number, phase: number, facing: number, up: number, sky: number, ground: number, sun: readonly [number, number, number],
): { colour: [number, number, number]; emission: number; hidden: number } {
  const white = sprayWhite(tau);
  const grey = luminance(sun);
  const thick = foamBallColour(facing, up, sky, ground, sun);
  const base = sun.map((channel, k) => {
    const tinted = grey + (channel - grey) * SPRAY_LIGHT.chroma;
    const thin = (tinted * Math.min(phase, SPRAY_LIGHT.phaseMax) + sky) / (4 * Math.PI);
    return thin + (thick[k] - thin) * white;
  });
  // The readability minimum lifts the light, keeping its hue: a floor per channel would whiten the faint edge of a streak.
  const lift = Math.max(1, (SPRAY_LIGHT.readable * luminance(thick)) / Math.max(luminance(base), 1e-4));
  const colour = base.map((channel) => channel * lift) as [number, number, number];
  const emission = 1 - Math.exp(-tau);
  return { colour, emission, hidden: emission * (SPRAY_LIGHT.leak + (1 - SPRAY_LIGHT.leak) * white) };
}

export const mistPars = /* glsl */ `
const float MIST_SIZE = ${MIST_SIZE.toFixed(3)};
const float MIST_G = ${MIST_G.toFixed(3)};
float henyeyGreenstein( float cosTheta, float g ) {
  return ( 1.0 - g * g ) / ( 12.566370614 * pow( 1.0 + g * g - 2.0 * g * cosTheta, 1.5 ) );
}
`;

/** The foam ball's light in GLSL: the same numbers as `FOAM_BALL`, and `foamBallColour` and `foamBallGlow` as functions. */
export const ballPars = /* glsl */ `
const float DROP_G = ${DROP_G.toFixed(3)};
const float BALL_ALBEDO = ${FOAM_BALL.albedo.toFixed(3)};
const float BALL_WRAP = ${FOAM_BALL.wrap.toFixed(3)};
const float BALL_PASS = ${FOAM_BALL.translucency.toFixed(3)};
const float BALL_CHROMA = ${FOAM_BALL.chroma.toFixed(3)};
const float BALL_GLOW = ${FOAM_BALL.glow.toFixed(3)};
const float BALL_GLOW_MAX = ${FOAM_BALL.glowMax.toFixed(1)};
const float BALL_DEPTH = ${FOAM_BALL.depth.toFixed(3)};
const float BALL_LUMPS = ${FOAM_BALL.lumps.toFixed(3)};
const float BALL_RELIEF = ${FOAM_BALL.relief.toFixed(3)};
const float BALL_CREASE = ${FOAM_BALL.crease.toFixed(3)};
const float BALL_CREASE_MEAN = ${FOAM_BALL.creaseMean.toFixed(3)};
vec3 foamBallColour( float facing, float up, float sky, float ground, vec3 sun ) {
  float lit = max( 0.0, ( facing + BALL_WRAP ) / ( 1.0 + BALL_WRAP ) );
  float passed = BALL_PASS * max( 0.0, ( BALL_WRAP - facing ) / ( 1.0 + BALL_WRAP ) );
  float ambient = ground + ( sky - ground ) * ( 0.5 + 0.5 * up );
  vec3 body = vec3( dot( sun, vec3( 0.2126, 0.7152, 0.0722 ) ) );
  body += ( sun - body ) * BALL_CHROMA;
  return BALL_ALBEDO * ( vec3( ambient ) + body * ( lit + passed ) ) / 3.14159265;
}
float foamBallGlowCoverage( float phase, float chord, float density ) {
  float tau = BALL_DEPTH * chord * ( 0.5 + 0.5 * density );
  return min( 1.0, BALL_GLOW * ( min( phase, BALL_GLOW_MAX ) / BALL_GLOW_MAX ) * tau * exp( 1.0 - tau ) );
}
`;

/**
 * The Rich spray's drawing in GLSL: each cluster is a capsule, as long as it travels in `streak` seconds (a drop's
 * frame or two; mist's, 0.3 s) and as wide as `width` times its cluster, mist drawn wider (1.2 against a drop's 0.5),
 * thickest on its axis and falling away to its edge as (1 − edge)^`shape`; the light of `sprayColour`; and the cluster
 * faded as it grows to fill the view or comes near the eye (True Surf's overdraw lesson,
 * docs/research/water-physics/notes/round4-spray-mist/spray-mist.md §5, item 1). Mist's trail and width are
 * provisional, set by eye on the water sheet: the veil is shed all along a crest and drawn out downwind, so it reads as
 * the filament it is and not as a row of round puffs (a 0.1 s trail, 1.6 wide, did).
 */
export const SPRAY_DRAW = {
  streakDrop: 1 / 30, streakMist: 0.3, widthDrop: 0.5, widthMist: 1.2, shapeDrop: 2.5, shapeMist: 1.5, grain: 1.2, wisp: 0.7,
  fadeFrom: 0.12, fadeTo: 0.3, nearFrom: 0.4, nearTo: 2,
} as const;

export const sprayDrawPars = /* glsl */ `
const float STREAK_DROP = ${SPRAY_DRAW.streakDrop.toFixed(5)};
const float STREAK_MIST = ${SPRAY_DRAW.streakMist.toFixed(5)};
const float WIDTH_DROP = ${SPRAY_DRAW.widthDrop.toFixed(3)};
const float WIDTH_MIST = ${SPRAY_DRAW.widthMist.toFixed(3)};
const float SHAPE_DROP = ${SPRAY_DRAW.shapeDrop.toFixed(3)};
const float SHAPE_MIST = ${SPRAY_DRAW.shapeMist.toFixed(3)};
const float SPRAY_GRAIN = ${SPRAY_DRAW.grain.toFixed(3)};
const float SPRAY_WISP = ${SPRAY_DRAW.wisp.toFixed(3)};
const float FADE_FROM = ${SPRAY_DRAW.fadeFrom.toFixed(3)};
const float FADE_TO = ${SPRAY_DRAW.fadeTo.toFixed(3)};
const float NEAR_FROM = ${SPRAY_DRAW.nearFrom.toFixed(3)};
const float NEAR_TO = ${SPRAY_DRAW.nearTo.toFixed(3)};
`;

export const sprayPars = /* glsl */ `
const float SPRAY_LEAK = ${SPRAY_LIGHT.leak.toFixed(3)};
const float SPRAY_CHROMA = ${SPRAY_LIGHT.chroma.toFixed(3)};
const float SPRAY_PHASE_MAX = ${SPRAY_LIGHT.phaseMax.toFixed(1)};
const float SPRAY_READABLE = ${SPRAY_LIGHT.readable.toFixed(3)};
const float SPRAY_WHITE_AT = ${SPRAY_LIGHT.whiteAt.toFixed(3)};
float sprayWhite( float tau ) {
  float reduced = ( 1.0 - DROP_G ) * tau;
  return smoothstep( 0.0, SPRAY_WHITE_AT, reduced / ( 2.0 + reduced ) );
}
vec3 sprayColour( float tau, float phase, float facing, float up, float sky, float ground, vec3 sun ) {
  vec3 tinted = vec3( dot( sun, vec3( 0.2126, 0.7152, 0.0722 ) ) );
  tinted += ( sun - tinted ) * SPRAY_CHROMA;
  vec3 thin = ( tinted * min( phase, SPRAY_PHASE_MAX ) + vec3( sky ) ) / 12.566370614;
  vec3 thick = foamBallColour( facing, up, sky, ground, sun );
  vec3 base = mix( thin, thick, sprayWhite( tau ) );
  return base * max( 1.0, SPRAY_READABLE * dot( thick, vec3( 0.2126, 0.7152, 0.0722 ) ) / max( dot( base, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-4 ) );
}
`;
