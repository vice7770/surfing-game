/** Spray sprites at least this wide, m, are mist (G6 draws mist at 0.35–0.8 m, drops at 0.06–0.14 m). */
export const MIST_SIZE = 0.25;
/**
 * Water drops' forward-scattering asymmetry. Mie theory gives g = 0.86–0.87 for drops of 10–25 µm and 0.88 for
 * 50–500 µm, 0.87–0.88 in sea water (docs/research/water-physics/notes/round4-spray-mist/spray-mist.md §3, computed
 * with Bohren 1987's optics; spray-and-mist.md, decided 2026-09-29): half of what a drop scatters goes within 5° of
 * straight on.
 */
export const DROP_G = 0.87;
/** Mist's forward-scattering asymmetry: mist is drops too, so it throws most of its light on toward the eye when backlit. */
export const MIST_G = DROP_G;

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

/**
 * The Rich foam ball (G9): a clump of the fresh whitewater a closing tube's roller tumbles, drawn as a sprite.
 * - `depth`: its optical depth across the middle of the disc, thinning to nothing at its rim as
 *   1 − smoothstep(0.55, 1, r) (`foamBallDepth`), so it is opaque but for a soft, torn rim the outer fifth of its
 *   radius wide, where it is thin enough to pass the sun on [provisional: foam's own depth is hundreds, bubbles of a
 *   millimetre or so at the void fraction near 0.2 measured under breakers (churnTexture.ts), so the rim's width is a
 *   render value].
 * - `fray`: how far the outline draws in across a crease of the churn's clumps, as a share of the radius [provisional].
 * - `lumps`: the metres of churn seen across a ball, so its clumps are a fifth of a metre or so on a 0.5–0.8 m ball
 *   [provisional].
 * - `relief`: how far the clumps' slope tilts the sphere's normal [provisional].
 * - `shadows`: the most balls whose shadows one ball's pixels look through (the nearest the eye) [a budget].
 * - `contact`: how far from the water's surface, as a share of its radius, a ball's pixel is all there (`foamBallContact`):
 *   a sprite is flat, so the depth test cuts it along the line where the water crosses its face, and a ball fades to
 *   nothing at that line, over this share of its radius, in place of a hard edge. Soft particles (Lorach 2007, NVIDIA)
 *   fade by the depth between a particle and the surface behind it, done here against the water's height field in place
 *   of the depth buffer [the width provisional: a render value, a quarter of the radius].
 * Its creases are shaded as the water's fresh churn is (0.88 + 0.12 × the clump's height, richWaterGlsl.ts
 * `RICH_FOAM`), so it is the whitewater it tumbles on.
 */
export const FOAM_BALL = { depth: 8, fray: 0.2, lumps: 2, relief: 0.18, shadows: 64, contact: 0.25 } as const;

/**
 * How much of a foam ball shows at a point of its face `height` m over (or, negative, under) the drawn water: nothing at
 * the water, all of it `FOAM_BALL.contact` of its `radius` away from it, a smoothstep between, the same on either side.
 * The depth test hides the face the water is in front of, so the points left are on the eye's side of the water (over it
 * for an eye above, under it for an eye below), and the fade is the same distance from the surface for either. The
 * face's point is the one in the sprite's plane under the pixel (`point - centre` along the view's right and up), where
 * the depth test cuts the sprite, not the sphere's point under it, which stands up to a radius nearer the eye: there
 * the fade would not be nothing at the cut.
 */
export function foamBallContact(height: number, radius: number): number {
  const width = FOAM_BALL.contact * radius;
  if (!(width > 0)) return height === 0 ? 0 : 1;
  const t = Math.min(1, Math.abs(height) / width);
  return t * t * (3 - 2 * t);
}

const luminance = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** What a foam ball is lit by, in the scene's light units (linear RGB). */
export interface BallLight {
  /** The sky's irradiance on a level surface, per channel: the photographed sky's own (its environment map). */
  readonly sky: readonly [number, number, number];
  /** The sun's irradiance square on to it, per channel, and the sine of its elevation. */
  readonly sun: readonly [number, number, number];
  readonly sunHeight: number;
  /** The water's foam colour (linear): the reflectance it draws its foam with. */
  readonly foam: readonly [number, number, number];
}

/**
 * The light of a point of a foam ball (linear RGB, before tone mapping), and its coverage. Fresh foam reflects a flat
 * share across the visible (Koepke 1984: 55 %), so the ball is a neutral white of the water's foam colour's luminance,
 * which carries the gain the water's foam composite does over Koepke's 0.55, and it is lit as the foam on the water is,
 * R (E_sky + E_sun max(0, n·L)) / π (decided 2026-09-29, spray-and-mist.md), by the same sky and sun. A surface with
 * normal `facing` the sun (n·L) and `up` (n·up) sees the sky over (1 + up) / 2 of its view (the sky's radiance taken
 * as even over the dome [provisional]) and the lit whitewater sheet under the ball over the rest (its foam colour times
 * the sky and the sun's level share). The other balls fill `enclosed` of its view (`ballShade`): there it sees foam lit
 * as a ball is on average, by the sky and the ground over half of it each and the sun over a quarter (a sphere's
 * cross-section over its surface), so the creases of a cluster fill with the light of the foam round them. `sunlit` is
 * the share of the sun the other balls leave it, `crease` the churn's shading (0.88–1). `depth` is the optical depth τ
 * at this point of the disc and `forward` the drops' phase function toward the eye, per steradian (Henyey–Greenstein,
 * `DROP_G`): where the ball is thin the sun it passes on is scattered once toward the eye, E_sun p e^−τ over the
 * 1 − e^−τ it covers, so a backlit ball has a gold rim (the drops' forward lobe) and a front-lit one none. The GLSL in
 * `ballPars` mirrors it.
 */
export function foamBallLight(
  light: BallLight, facing: number, up: number, sunlit: number, enclosed: number, crease: number, depth: number, forward: number,
): { colour: [number, number, number]; alpha: number } {
  const albedo = luminance(light.foam);
  const lit = Math.max(0, facing) * sunlit;
  const level = Math.max(0, light.sunHeight);
  const colour = light.sky.map((sky, k) => {
    const ground = light.foam[k] * (sky + light.sun[k] * level);
    const open = sky * 0.5 * (1 + up) + ground * 0.5 * (1 - up);
    const foam = albedo * (0.5 * (sky + ground) + 0.25 * light.sun[k]);
    const irradiance = (1 - enclosed) * open + enclosed * foam + light.sun[k] * lit;
    return (albedo * crease * irradiance) / Math.PI + light.sun[k] * forward * Math.exp(-depth) * sunlit;
  }) as [number, number, number];
  return { colour, alpha: 1 - Math.exp(-depth) };
}

/** The ball's optical depth at `r` (0 at its centre, 1 at its rim) of its disc: `FOAM_BALL.depth` thinning to nothing at the rim. */
export function foamBallDepth(r: number): number {
  const t = Math.min(1, Math.max(0, (r - 0.55) / 0.45));
  return FOAM_BALL.depth * (1 - t * t * (3 - 2 * t));
}

/** A foam ball as the shadows see it: its centre, m, and its radius. */
export interface BallShape {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
}

/**
 * What the other foam balls (`self`, the one the point is on, aside) do to a point of a ball's surface with normal
 * `normal`. `sunlit`: the share of the sun that reaches it. A ray toward the sun (`toSun`, a unit vector) through a ball
 * at r of its radius from its centre passes the optical depth its disc has there (`foamBallDepth`, the same at any angle
 * for a ball), and a point inside another ball is in its depth too; the depths add, and the sun is dimmed by e^−τ.
 * `enclosed`: the share of its view (cosine-weighted) the balls fill, each the view factor of a sphere from a small
 * surface facing it, cos θ (R / d)² (exact while the sphere is clear of the surface's plane), all of it inside one,
 * the balls overlapping in its view as independent ones do: 1 − Π (1 − F). `visible`: how much of it shows past the
 * balls it is inside: a sprite has no depth, so where one ball's face is inside another the other's foam hides it, by
 * e^−τ of the depth that ball's disc has there, and the union of the balls is what is seen whatever order they are
 * drawn in. The GLSL in `ballPars` mirrors it.
 */
export function ballShade(
  point: { x: number; y: number; z: number }, normal: { x: number; y: number; z: number }, toSun: { x: number; y: number; z: number },
  balls: readonly BallShape[], self?: BallShape,
): { sunlit: number; enclosed: number; visible: number } {
  let depth = 0;
  let open = 1;
  let buried = 0;
  for (const ball of balls) {
    if (ball === self) continue;
    const dx = ball.x - point.x;
    const dy = ball.y - point.y;
    const dz = ball.z - point.z;
    const distance2 = dx * dx + dy * dy + dz * dz;
    const inside = distance2 < ball.radius * ball.radius;
    if (inside) buried += foamBallDepth(Math.sqrt(distance2) / ball.radius);
    const facing = (dx * normal.x + dy * normal.y + dz * normal.z) / Math.sqrt(distance2);
    open *= inside ? 0 : 1 - Math.max(0, facing) * (ball.radius * ball.radius) / distance2;
    const along = dx * toSun.x + dy * toSun.y + dz * toSun.z;
    if (!(along > 0) && !inside) continue;
    const miss = Math.hypot(dx - along * toSun.x, dy - along * toSun.y, dz - along * toSun.z) / ball.radius;
    depth += foamBallDepth(miss);
  }
  return { sunlit: Math.exp(-depth), enclosed: 1 - open, visible: Math.exp(-buried) };
}

/** The foam ball's light in GLSL: the same numbers as `FOAM_BALL`, and `foamBallDepth`, `foamBallContact`, `ballShade` and `foamBallLight` as functions. */
export const ballPars = /* glsl */ `
const float DROP_G = ${DROP_G.toFixed(3)};
const float BALL_DEPTH = ${FOAM_BALL.depth.toFixed(3)};
const float BALL_FRAY = ${FOAM_BALL.fray.toFixed(3)};
const float BALL_LUMPS = ${FOAM_BALL.lumps.toFixed(3)};
const float BALL_RELIEF = ${FOAM_BALL.relief.toFixed(3)};
const float BALL_CONTACT = ${FOAM_BALL.contact.toFixed(3)};
#define BALL_SHADOWS ${FOAM_BALL.shadows}
uniform vec4 sprayBalls[ BALL_SHADOWS ];
uniform int sprayBallCount;
float foamBallDepth( float r ) {
  return BALL_DEPTH * ( 1.0 - smoothstep( 0.55, 1.0, r ) );
}
float foamBallContact( float height, float radius ) {
  return smoothstep( 0.0, BALL_CONTACT * radius, abs( height ) );
}
vec3 ballShade( vec3 point, vec3 normal, vec3 toSun, vec3 self ) {
  float depth = 0.0;
  float open = 1.0;
  float buried = 0.0;
  for ( int j = 0; j < BALL_SHADOWS; j ++ ) {
    if ( j >= sprayBallCount ) break;
    vec4 ball = sprayBalls[ j ];
    vec3 toBall = ball.xyz - point;
    vec3 fromSelf = ball.xyz - self;
    if ( dot( fromSelf, fromSelf ) < 1e-8 ) continue;
    float distance2 = dot( toBall, toBall );
    bool inside = distance2 < ball.w * ball.w;
    if ( inside ) buried += foamBallDepth( sqrt( distance2 ) / ball.w );
    open *= inside ? 0.0 : 1.0 - max( 0.0, dot( toBall, normal ) ) * inversesqrt( distance2 ) * ball.w * ball.w / distance2;
    float along = dot( toBall, toSun );
    if ( along <= 0.0 && ! inside ) continue;
    depth += foamBallDepth( length( toBall - along * toSun ) / ball.w );
  }
  return vec3( exp( -depth ), 1.0 - open, exp( -buried ) );
}
vec3 foamBallLight( float facing, float up, float sunlit, float enclosed, float crease, float depth, float forward, vec3 sky, vec3 sun, float sunHeight, vec3 foam ) {
  float albedo = dot( foam, vec3( 0.2126, 0.7152, 0.0722 ) );
  vec3 ground = foam * ( sky + sun * max( 0.0, sunHeight ) );
  vec3 open = sky * 0.5 * ( 1.0 + up ) + ground * 0.5 * ( 1.0 - up );
  vec3 fill = albedo * ( 0.5 * ( sky + ground ) + 0.25 * sun );
  vec3 irradiance = ( 1.0 - enclosed ) * open + enclosed * fill + sun * max( 0.0, facing ) * sunlit;
  return albedo * crease * irradiance / 3.14159265 + sun * forward * exp( -depth ) * sunlit;
}
`;

/**
 * The light of Rich spray and mist by its optical depth (decided 2026-09-29, item 1; spray-and-mist.md, "Optics", and
 * notes/round4-spray-mist/spray-mist.md §3, after Bohren 1987). A cluster of drops stops 1 − e^−τ of the light behind
 * it, τ = 1.5 w / r, and adds the light it scatters toward the eye:
 * - once, where the spray around it is thin: the sun in the drops' forward lobe (Henyey–Greenstein, `MIST_G`) and the
 *   light all round it (the sky over half, the lit whitewater under the rest), E_sun p + (E_sky + E_ground) / 2π;
 * - many times, where the spray around it is thick (`column`, its optical depth): the white of Bohren's two-stream
 *   slab, R = τ* / (2 + τ*) of the sun on its lit side and T = 2 / (2 + τ*) − e^−τ through it on the other,
 *   τ* = (1 − g) τ, with the sky and the whitewater on both (R + T of them). The share of its light scattered more than
 *   once is taken as 1 − e^−τ*, so spray is see-through near τ = 1 and white past 15 [the share's form provisional].
 * - `leak`: drops scatter half of what they stop within 5° of straight on (Mie, §3), so a thin cluster hides only the
 *   other half of the light behind it, and all of it once it is white.
 * - `readable`: the decided readability minimum. Thin spray lit from the front is physically almost dark; it shows at
 *   least this share of the light it would if it were white [the share provisional].
 * - `glass`: where a cluster's water is still sheets and ligaments (Surf's Up: "clear refractive water" before it is
 *   white), it reflects as the water does: 6.6 % of the light round it and of the sun, the diffuse reflectance of water
 *   (Fresnel, n = 1.333), its surfaces turned every way, and hides only what it reflects.
 */
export const SPRAY_LIGHT = { leak: 0.5, readable: 0.35, glass: 0.066 } as const;

/** The two-stream reflectance and diffuse transmittance of a non-absorbing slab of optical depth `tau` of drops scattering with `MIST_G` (Bohren 1987). */
export function twoStream(tau: number): { reflect: number; through: number } {
  const reduced = (1 - MIST_G) * tau;
  return { reflect: reduced / (2 + reduced), through: Math.max(0, 2 / (2 + reduced) - Math.exp(-tau)) };
}

/** How much of a cluster's light has been scattered more than once, in spray of optical depth `column`: 1 − e^−(1 − g) τ. */
export function sprayWhite(column: number): number {
  return 1 - Math.exp(-(1 - MIST_G) * column);
}

/** What a spray cluster is lit by: as for a foam ball (`BallLight`), its sky per channel, the sun and its height, and the water's foam colour for the whitewater under it. */
export type SprayLight = BallLight;

/**
 * A spray cluster's light (linear RGB, before tone mapping) at a point with optical depth `tau` along the view, in spray
 * of optical depth `column` round it: the colour it adds, the share of what is behind it it adds that colour with
 * (`emission`, 1 − e^−τ) and the share of that it hides (`hidden`). `phase` is the drops' phase function toward the eye,
 * per steradian; `facing` and `up` the cluster's normal where it is thick, against the sun and the world's up. The GLSL
 * in `sprayPars` mirrors it.
 */
export function sprayLight(
  light: SprayLight, tau: number, column: number, phase: number, facing: number, up: number,
): { colour: [number, number, number]; emission: number; hidden: number } {
  const white = sprayWhite(column);
  const { reflect, through } = twoStream(column);
  const level = Math.max(0, light.sunHeight);
  const lit = Math.max(0, facing);
  const back = Math.max(0, -facing);
  const base = light.sky.map((sky, k) => {
    const ground = light.foam[k] * (sky + light.sun[k] * level);
    const once = light.sun[k] * phase + (sky + ground) / (2 * Math.PI);
    const open = sky * 0.5 * (1 + up) + ground * 0.5 * (1 - up);
    const many = (open + light.sun[k] * (reflect * lit + through * back) / Math.max(reflect + through, 1e-6)) / Math.PI;
    return once + (many - once) * white;
  });
  const solid = light.sky.map((sky, k) => {
    const ground = light.foam[k] * (sky + light.sun[k] * level);
    return (sky * 0.5 * (1 + up) + ground * 0.5 * (1 - up) + light.sun[k] * lit) / Math.PI;
  });
  const lift = Math.max(1, (SPRAY_LIGHT.readable * luminance(solid)) / Math.max(luminance(base), 1e-6));
  const emission = 1 - Math.exp(-tau);
  return { colour: base.map((v) => v * lift) as [number, number, number], emission, hidden: emission * (SPRAY_LIGHT.leak + (1 - SPRAY_LIGHT.leak) * white) };
}

/**
 * How the Rich spray draws a cluster: a capsule along the way it travels while the eye takes it in, as wide as the
 * cluster, its drops spread across it as a cloud of drops flying apart is, most at its middle: a Gaussian, two
 * standard deviations to its edge, let down to nothing there so no rim shows (`clusterProfile`) [the edge's place
 * provisional]. It fades as it grows past 10–15 % of the screen's height (`fadeFrom`, True Surf's overdraw lesson,
 * round-4 notes §5, item 1) to nothing at `fadeTo`, and from `capFrom` of the largest point the GPU draws (ANGLE's is
 * 511 px, §4) to nothing there, so no sprite is cut at it; and as it comes within `nearTo` m of the eye, gone at
 * `nearFrom` [`fadeTo`, `capFrom`, `nearFrom` and `nearTo` provisional]. A cluster is not even inside: its drops
 * gather in ligaments and clumps, drawn out along the way they fly. The churn's clumps (`waterChurnMap`), `clumps`
 * across it and stretched along its streak, thin and thicken its depth by `wisp` either way about its mean, so a
 * cluster reads as streaks and wisps, not a disc [`clumps` and `wisp` provisional].
 */
export const SPRAY_DRAW = { fadeFrom: 0.12, fadeTo: 0.3, capFrom: 0.6, nearFrom: 0.4, nearTo: 2, clumps: 3, wisp: 0.8 } as const;

/** A cluster's optical depth across it, 1 on its axis and 0 at its edge (`edge` 0–1): e^(−2 e²) let down by its value at the edge. */
export function clusterProfile(edge: number): number {
  const rim = Math.exp(-2);
  return Math.max(0, (Math.exp(-2 * edge * edge) - rim) / (1 - rim));
}

/** The means of `clusterProfile`: over a unit disc, and across a band of unit half-width (∫₀¹ e^(−2x²) dx = √(π/8) erf √2, by the midpoint rule). */
export const CAPSULE_MEANS = (() => {
  let line = 0;
  let disc = 0;
  for (let i = 0; i < 4096; i += 1) {
    const x = (i + 0.5) / 4096;
    line += clusterProfile(x) / 4096;
    disc += (2 * x * clusterProfile(x)) / 4096;
  }
  return { disc, line };
})();

/** The mean over a capsule of radius 1 and half length `half` of `clusterProfile` across it: what turns the capsule's mean optical depth into its depth on its axis. */
export function capsuleMean(half: number): number {
  return (CAPSULE_MEANS.disc * Math.PI + CAPSULE_MEANS.line * 4 * half) / (Math.PI + 4 * half);
}

/** The spray's light in GLSL: the same numbers as `SPRAY_LIGHT`, and `sprayLight` as a function. */
export const sprayPars = /* glsl */ `
const float SPRAY_LEAK = ${SPRAY_LIGHT.leak.toFixed(3)};
const float SPRAY_READABLE = ${SPRAY_LIGHT.readable.toFixed(3)};
const float SPRAY_GLASS = ${SPRAY_LIGHT.glass.toFixed(3)};
vec3 sprayLight( float column, float phase, float facing, float up, vec3 sky, vec3 sun, float sunHeight, vec3 foam ) {
  float reduced = ( 1.0 - MIST_G ) * column;
  float white = 1.0 - exp( -reduced );
  float reflect = reduced / ( 2.0 + reduced );
  float through = max( 0.0, 2.0 / ( 2.0 + reduced ) - exp( -column ) );
  vec3 ground = foam * ( sky + sun * max( 0.0, sunHeight ) );
  vec3 once = sun * phase + ( sky + ground ) / 6.283185307;
  vec3 open = sky * 0.5 * ( 1.0 + up ) + ground * 0.5 * ( 1.0 - up );
  vec3 many = ( open + sun * ( reflect * max( 0.0, facing ) + through * max( 0.0, -facing ) ) / max( reflect + through, 1e-6 ) ) / 3.14159265;
  vec3 base = mix( once, many, white );
  vec3 solid = ( open + sun * max( 0.0, facing ) ) / 3.14159265;
  vec3 luma = vec3( 0.2126, 0.7152, 0.0722 );
  return base * max( 1.0, SPRAY_READABLE * dot( solid, luma ) / max( dot( base, luma ), 1e-6 ) );
}
`;
