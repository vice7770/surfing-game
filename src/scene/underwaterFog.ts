import { BackSide, BoxGeometry, Mesh, ShaderChunk, ShaderLib, ShaderMaterial, UniformsLib, type IUniform } from 'three';
import { DIFFUSE_PATH, DIFFUSE_SKY_REFLECTANCE } from './SpotSeabed';
import { REFERENCE_LIGHT } from './PhotoSky';
import { WATER_F0, WATER_IOR, refractedCosine, schlickFresnel, type Rgb } from './waterOptics';

/**
 * Underwater item 1 (docs/research/water-physics/underwater.md, decided 2026-09-29), Rich only: the colour and fog of
 * the view under the surface come from each spot's own water, in the materials, per colour channel, in the form the
 * prototype built and measured (underwater-prototype.md; notes/round5-underwater/prototype-1-2.diff, `uwRadiance`).
 *
 * Each fogged fragment fades toward the water's own radiance along its view ray as Beer–Lambert says,
 * L = L_fragment e^{−c d} + L_water (1 − e^{−c d}), with a c for red, green and blue: red goes first, so the far view
 * is blue-green, and the bed reads as far as the water's clarity says. L_water is the light the water scatters toward
 * the eye along that ray, taken at the depth the ray reaches within 1/c of the eye (where most of it is scattered), so
 * looking up toward the surface is brighter and looking down darker. It is done in the scene-referred light before the
 * tone mapping (three's own fog mixes after it, on the display's colours, and by one number for all channels), in the
 * shared fog chunks every material includes, so it costs no extra pass. Where nothing is drawn, a backdrop shows the
 * same water at infinity, by direction. Classic keeps three's FogExp2 untouched: the chunks take the new path only
 * while `underwaterFogEye.w` is set.
 */

/** The owner's readability floor, m (decision 2026-09-29: 6–8 m, as Subnautica chose): a black object stays visible at least this far [the middle of the range]. */
export const VISIBILITY_FLOOR = 7;
/** A black target vanishes at 4.8/c (Davies-Colley 1988; Zaneveld & Pegau 2003, within about 10 %): the sighting distance the floor and the prototype's checks use. */
export const SIGHTING = 4.8;
/** Tyler 1960 (Lake Pend Oreille, 6.1 m): the zenith's radiance is 25× the horizontal's, which is 7× the nadir's (175/25). */
export const TYLER = { zenithOverLevel: 25, levelOverNadir: 7 } as const;
/** Radiance of the water per unit irradiance below it, with Q = π: the nadir's R∞ E_d / π [estimated by the prototype; provisional]. */
const NADIR_PER_IRRADIANCE = 1 / Math.PI;
/** The shape of the radiance between the level and the zenith, log-interpolated as μ^1.5 [estimated by the prototype; provisional]. */
export const ZENITH_SHAPE = 1.5;
/** The renderer's exposure above water (main.ts), against which the underwater gain is fitted. */
export const DISPLAY_EXPOSURE = 1.05;
/** Today's flat underwater fog, the colour whose brightness the level view is brought back to. */
export const LEGACY_FOG_COLOUR = '#367e83';
/**
 * The fit of the underwater exposure gain: Padang Padang at midday, the eye this deep, m [provisional: a rendering
 * choice, the depth of the water sheet's below shot, 1.2 m under the lineup's surface]. Fitted at 0.5 or 2 m instead,
 * the gain is 3–4 % lower or higher (pinned in the tests).
 */
export const FIT = { spot: 'padang', time: 'midday', depth: 1.2 } as const;
/**
 * The underwater exposure gain (the owner's decision, 2026-09-29: "one gain that brings the level view back to today's
 * brightness"; the physics keeps its shapes, as the gains the owner accepted for Rich above water do) [provisional:
 * fitted, not measured]. It multiplies the display's exposure while the eye is under the Rich water, so everything the
 * eye sees there takes it alike (the water, the bed, the surfer, the surface overhead) and their ratios stay as the
 * physics has them. Fitted so that the level view at `FIT` shows today's flat fog's luminance on screen (pinned in the
 * tests); fitted again whenever the water's optics change (a sourced colour term changes Padang Padang's R∞ and K).
 */
export const UNDERWATER_GAIN = 1.64;

/** Where the water's light comes from at the surface, in the scene's units: the sun's irradiance, its height, and the sky's. */
export interface SurfaceLight {
  /** The sun's irradiance across its beam (its light's colour × intensity), per channel. */
  sun: Rgb;
  /** The sun's height: the cosine of its angle from the vertical. */
  sunCosine: number;
  /** The sky's horizontal irradiance, per channel. */
  sky: Rgb;
}

/** The water the view looks through: its beam attenuation c, diffuse attenuation K and bottomless reflectance R∞, per channel. */
export interface UnderwaterWater {
  beam: Rgb;
  diffuse: Rgb;
  deep: Rgb;
}

/**
 * The eye path's attenuation, per channel: the spot's beam attenuation c, scaled down for the whole spectrum, so the hue
 * stays, wherever the water is murkier than the floor, until the green channel's black-target sighting 4.8/c is the
 * floor (the owner's decision, 2026-09-29: apply it wherever the water is murkier than that). Clear water is left
 * physical.
 */
export function eyeAttenuation(beam: Rgb, floor = VISIBILITY_FLOOR): Rgb {
  const scale = Math.min(1, SIGHTING / floor / Math.max(1e-6, beam[1]));
  return [beam[0] * scale, beam[1] * scale, beam[2] * scale];
}

/** What is left of a target's contrast with the water behind it at `distance` m, per channel: e^{−c d}. */
export function contrastAt(attenuation: Rgb, distance: number): Rgb {
  return [Math.exp(-attenuation[0] * distance), Math.exp(-attenuation[1] * distance), Math.exp(-attenuation[2] * distance)];
}

/** The distance at which a black target is left `contrast` of its contrast in one channel, m: −ln(contrast)/c. */
export function distanceToContrast(attenuationChannel: number, contrast: number): number {
  return -Math.log(contrast) / attenuationChannel;
}

/**
 * The irradiance on a level plane `depth` m under the surface, per channel, in the scene's units:
 * E_d(z) = E_sun μ (1 − F) e^{−K z/μ_w} + E_sky (1 − 0.066) e^{−1.2 K z}, with Gordon's K (`diffuseAttenuation`), μ the
 * sun's cosine, μ_w its refracted cosine and F Schlick's Fresnel reflectance at μ (the seabed's `bedLight` has the
 * same terms, split into the beam and the light it scattered). Above the surface it is the surface's.
 */
export function irradianceBelow(light: SurfaceLight, diffuse: Rgb, depth: number): Rgb {
  const mu = Math.min(1, Math.max(0.05, light.sunCosine));
  const toward = refractedCosine(mu);
  const entering = mu * (1 - schlickFresnel(mu));
  const z = Math.max(0, depth);
  const one = (i: number) => light.sun[i] * entering * Math.exp(-(diffuse[i] * z) / toward)
    + light.sky[i] * (1 - DIFFUSE_SKY_REFLECTANCE) * Math.exp(-DIFFUSE_PATH * diffuse[i] * z);
  return [one(0), one(1), one(2)];
}

/** The water's radiance looking level at depth `depth`, per channel: 7 R∞ E_d(z)/π (Morel & Prieur's R∞, Tyler's 7). */
export function levelRadiance(deep: Rgb, light: SurfaceLight, diffuse: Rgb, depth: number): Rgb {
  const e = irradianceBelow(light, diffuse, depth);
  const one = (i: number) => TYLER.levelOverNadir * deep[i] * e[i] * NADIR_PER_IRRADIANCE;
  return [one(0), one(1), one(2)];
}

/**
 * How much brighter the zenith is than the level, per channel: Tyler's 25, capped at what a uniform sky can send
 * through the window, n² (1 − F) E_d/π, which over 7 R∞ E_d/π leaves R∞ alone [estimated by the prototype;
 * provisional]. The cap stays above 1 for any R∞ under 0.25; the murkiest water in the game, the Beach's, has at most
 * 0.09.
 */
export function zenithOverLevel(deep: Rgb): Rgb {
  const cap = WATER_IOR * WATER_IOR * (1 - WATER_F0);
  const one = (i: number) => Math.min(TYLER.zenithOverLevel, cap / Math.max(1e-9, TYLER.levelOverNadir * deep[i]));
  return [one(0), one(1), one(2)];
}

/**
 * The water's radiance along a view ray from an eye `eyeDepth` m under the surface, per channel (the prototype's
 * `uwRadiance(dir, depth − dir.y · reach)`): the ray's world-up component `up` (1 straight up) sets the shape, falling
 * to 1/7 of the level looking straight down and rising to the zenith's ratio looking up (log-interpolated as up^1.5),
 * and the light is the level radiance at the depth the ray reaches within 1/c_G of the eye (or at its end, if nearer),
 * where most of what it carries is scattered [the reach is the prototype's estimate; provisional].
 */
export function radianceAlong(water: UnderwaterWater, light: SurfaceLight, eyeDepth: number, up: number, distance: number): Rgb {
  const eye = eyeAttenuation(water.beam);
  const reach = Math.min(distance, 1 / Math.max(1e-6, eye[1]));
  const level = levelRadiance(water.deep, light, water.diffuse, eyeDepth - up * reach);
  const zenith = zenithOverLevel(water.deep);
  const shape = (i: number) => (up <= 0 ? (1 / TYLER.levelOverNadir) ** -up : zenith[i] ** (up ** ZENITH_SHAPE));
  return [level[0] * shape(0), level[1] * shape(1), level[2] * shape(2)];
}

/** A fragment's colour `colour` seen `distance` m away along a ray of world-up component `up`: the shader's fade, `underwaterPath`. */
export function fogged(colour: Rgb, water: UnderwaterWater, light: SurfaceLight, eyeDepth: number, up: number, distance: number): Rgb {
  const through = contrastAt(eyeAttenuation(water.beam), distance);
  const radiance = radianceAlong(water, light, eyeDepth, up, distance);
  return [0, 1, 2].map((i) => colour[i] * through[i] + radiance[i] * (1 - through[i])) as unknown as Rgb;
}

/**
 * The scene's light at the photographed sky's exposure (`PhotoSky`, `skyExposure`): the horizontal light is
 * `REFERENCE_LIGHT` (0.4 + 0.6 √sin h) whatever the photo, of which the sun's share is its intensity × its colour's
 * luminance × sin h, and the sky's what is left (the sky's irradiance × the exposure scale), in the sky's own colour
 * (`skyColour`, luminance 1: `PhotoSky.skyColor`, measured from the photograph's HDR; grey where it is not known).
 */
export function photoSkyLight(
  sunDirectionY: number, sunIntensity: number, sunColour: { r: number; g: number; b: number }, skyColour: readonly [number, number, number] = [1, 1, 1],
): SurfaceLight {
  const sine = Math.max(0, sunDirectionY);
  const luminance = 0.2126 * sunColour.r + 0.7152 * sunColour.g + 0.0722 * sunColour.b;
  const horizontal = REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(sine));
  const sky = Math.max(0, horizontal - sunIntensity * luminance * sine);
  return {
    sun: [sunIntensity * sunColour.r, sunIntensity * sunColour.g, sunIntensity * sunColour.b], sunCosine: sunDirectionY,
    sky: [sky * skyColour[0], sky * skyColour[1], sky * skyColour[2]],
  };
}

/** three's Khronos PBR Neutral tone mapping of a scene-referred colour (`NeutralToneMapping`), as the renderer's display does. */
export function neutralToneMap(colour: Rgb, exposure: number): Rgb {
  const start = 0.8 - 0.04;
  const desaturation = 0.15;
  const scaled = colour.map((c) => c * exposure) as unknown as Rgb;
  const x = Math.min(scaled[0], scaled[1], scaled[2]);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const shifted = scaled.map((c) => c - offset) as unknown as Rgb;
  const peak = Math.max(shifted[0], shifted[1], shifted[2]);
  if (peak < start) return shifted;
  const d = 1 - start;
  const newPeak = 1 - (d * d) / (peak + d - start);
  const g = 1 - 1 / (desaturation * (peak - newPeak) + 1);
  return shifted.map((c) => {
    const compressed = (c * newPeak) / peak;
    return compressed + (newPeak - compressed) * g;
  }) as unknown as Rgb;
}

/**
 * The world-up component of a view-space direction, 1 straight up: the direction dotted with the view matrix's second
 * column (the world +y expressed in view space; the GLSL's `viewMatrix[ 1 ].xyz`, GLSL matrices being column-major).
 * `view` is the matrix's elements, as three keeps them (column-major).
 */
export function worldUp(view: ArrayLike<number>, direction: readonly [number, number, number]): number {
  const length = Math.hypot(direction[0], direction[1], direction[2]);
  return length > 1e-4 ? (direction[0] * view[4] + direction[1] * view[5] + direction[2] * view[6]) / length : 0;
}

/** The linear luminance of a colour. */
export const luminance = (c: Rgb): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * The fog's uniforms, shared by every material that includes three's fog chunks and by the backdrop (typed arrays,
 * which three uploads and `cloneUniforms` keeps by reference, so one write here reaches all of them):
 * - `underwaterFogEye`: the eye path's attenuation c (`eyeAttenuation`), and 1 while the Rich underwater fog is on;
 * - `underwaterFogSun`: the sun's irradiance on a level plane just under the surface, μ (1 − F) E_sun, and μ_w;
 * - `underwaterFogSky`: the sky's, (1 − 0.066) E_sky, and the eye's depth under the surface, m;
 * - `underwaterFogDiffuse`: K, and the in-scatter's reach, 1/c_G;
 * - `underwaterFogLevel`: the level radiance per unit irradiance, 7 R∞/π;
 * - `underwaterFogZenith`: the zenith's ratio to the level (`zenithOverLevel`).
 */
export const underwaterFogUniforms = {
  underwaterFogEye: { value: new Float32Array(4) },
  underwaterFogSun: { value: new Float32Array(4) },
  underwaterFogSky: { value: new Float32Array(4) },
  underwaterFogDiffuse: { value: new Float32Array(4) },
  underwaterFogLevel: { value: new Float32Array(3) },
  underwaterFogZenith: { value: new Float32Array(3) },
};

const FOG_VIEW = 'vFogView';
const glsl = (value: number) => value.toFixed(6);

/**
 * The uniforms and the water's radiance in GLSL (`irradianceBelow`, `radianceAlong`), and a dither, for the fog chunks'
 * fragment side and the backdrop. `UNDERWATER_FOG` marks a program that has them: the fade runs only there.
 */
export const underwaterRadiancePars = /* glsl */ `
#define UNDERWATER_FOG
uniform vec4 underwaterFogEye;
uniform vec4 underwaterFogSun;
uniform vec4 underwaterFogSky;
uniform vec4 underwaterFogDiffuse;
uniform vec3 underwaterFogLevel;
uniform vec3 underwaterFogZenith;
vec3 underwaterIrradiance( float depth ) {
	float z = max( depth, 0.0 );
	return underwaterFogSun.rgb * exp( - underwaterFogDiffuse.rgb * z / underwaterFogSun.w )
		+ underwaterFogSky.rgb * exp( - ${glsl(DIFFUSE_PATH)} * underwaterFogDiffuse.rgb * z );
}
vec3 underwaterRadiance( float up, float distance ) {
	float reach = min( distance, underwaterFogDiffuse.w );
	vec3 level = underwaterFogLevel * underwaterIrradiance( underwaterFogSky.w - up * reach );
	vec3 shape = up <= 0.0 ? pow( vec3( ${glsl(1 / TYLER.levelOverNadir)} ), vec3( - up ) ) : pow( underwaterFogZenith, vec3( pow( up, ${glsl(ZENITH_SHAPE)} ) ) );
	return level * shape;
}
// Half an 8-bit step of noise in the display's colours, so the water's long smooth gradients do not band: three's own
// dithering (its hash and shifts), which these materials do not otherwise take [a rendering choice].
vec3 underwaterDither() {
	highp float dt = mod( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ), 3.141592653589793 );
	vec3 shift = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
	return mix( 2.0 * shift, -2.0 * shift, fract( sin( dt ) * 43758.5453 ) );
}
`;

/**
 * The fragment path, before the tone mapping: the fragment fades toward the water's radiance along its view ray, per
 * channel, over its distance from the eye (`vFogView`, the view-space position; `fogged`).
 */
const underwaterPath = /* glsl */ `
#if defined( USE_FOG ) && defined( UNDERWATER_FOG )
	if ( underwaterFogEye.w > 0.5 ) {
		float uwDistance = length( ${FOG_VIEW} );
		float uwUp = dot( ${FOG_VIEW}, viewMatrix[ 1 ].xyz ) / max( uwDistance, 1e-4 );
		vec3 uwThrough = exp( - underwaterFogEye.rgb * uwDistance );
		gl_FragColor.rgb = gl_FragColor.rgb * uwThrough + underwaterRadiance( uwUp, uwDistance ) * ( 1.0 - uwThrough );
	}
#endif
`;

/** The chunks the underwater fog edits. */
const FOG_CHUNKS = ['fog_pars_vertex', 'fog_vertex', 'fog_pars_fragment', 'fog_fragment', 'tonemapping_fragment'] as const;
type FogChunks = Record<(typeof FOG_CHUNKS)[number], string>;

/**
 * three's fog chunks with the underwater fog put in, or undefined if three's no longer have the shape the edits expect
 * (a new three: the Rich underwater fog then stays off and the flat fog stays, as `usePcss` does for its chunk).
 * The chunks keep three's own path whole for Classic and for the air: the new path runs only while `underwaterFogEye.w`
 * is set, before the tone mapping, and three's mix toward the fog colour after it only while it is not.
 */
export function withUnderwaterFog(chunks: Readonly<FogChunks>): FogChunks | undefined {
  const replace = (chunk: string, from: string | RegExp, to: string): string | undefined => {
    const next = chunk.replace(from, to);
    return next === chunk ? undefined : next;
  };
  const parsVertex = replace(chunks.fog_pars_vertex, 'varying float vFogDepth;', `varying float vFogDepth;\n\tvarying vec3 ${FOG_VIEW};`);
  const vertex = replace(chunks.fog_vertex, 'vFogDepth = - mvPosition.z;', `vFogDepth = - mvPosition.z;\n\t${FOG_VIEW} = mvPosition.xyz;`);
  const parsFragment = replace(chunks.fog_pars_fragment, 'varying float vFogDepth;', `varying float vFogDepth;\n\tvarying vec3 ${FOG_VIEW};\n${underwaterRadiancePars}`);
  const opened = replace(chunks.fog_fragment, '#ifdef USE_FOG', '#ifdef USE_FOG\n\n\tif ( underwaterFogEye.w < 0.5 ) {');
  // Under the Rich water three's mix is skipped (the fade ran before the tone mapping) and the display's colours dithered.
  const fragment = opened && replace(opened, /#endif\s*$/, '\t} else {\n\n\t\tgl_FragColor.rgb += underwaterDither();\n\n\t}\n\n#endif\n');
  if (!parsVertex || !vertex || !parsFragment || !fragment || !chunks.tonemapping_fragment.includes('toneMapping(')) return undefined;
  return {
    fog_pars_vertex: parsVertex, fog_vertex: vertex, fog_pars_fragment: parsFragment, fog_fragment: fragment,
    tonemapping_fragment: `${underwaterPath}${chunks.tonemapping_fragment}`,
  };
}

let installed: boolean | undefined;

/**
 * Put the underwater fog into three's shared fog chunks and the shared uniforms into every shader that has fog; once,
 * before the first program is built. Returns whether the Rich underwater fog is available: false (and a warning) if
 * three's chunks have changed shape, and then `UnderwaterFog` stays off.
 */
export function installUnderwaterFog(): boolean {
  if (installed !== undefined) return installed;
  const chunks = ShaderChunk as unknown as Record<string, string>;
  const edited = withUnderwaterFog(Object.fromEntries(FOG_CHUNKS.map((name) => [name, chunks[name]])) as FogChunks);
  if (!edited) {
    console.warn('three\'s fog chunks have a shape the underwater fog does not expect; the Rich underwater fog stays off.');
    installed = false;
    return false;
  }
  Object.assign(chunks, edited);
  const uniforms = underwaterFogUniforms as unknown as Record<string, IUniform>;
  Object.assign(UniformsLib.fog, uniforms);
  for (const shader of Object.values(ShaderLib)) if ('fogColor' in shader.uniforms) Object.assign(shader.uniforms, uniforms);
  installed = true;
  return true;
}

/**
 * The backdrop where nothing is drawn: the water at infinity in each direction (`radianceAlong` over an endless ray,
 * the fog's own limit), tone-mapped as everything else is. A box around the eye at the far plane, drawn after the
 * opaque objects and depth-tested, so only the pixels nothing covered are shaded; the transparent ones (the far ocean)
 * blend over it after.
 */
function createBackdrop(): Mesh<BoxGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    name: 'UnderwaterBackdrop',
    uniforms: underwaterFogUniforms as unknown as Record<string, IUniform>,
    vertexShader: /* glsl */ `
varying vec3 vUnderwaterDirection;
#include <common>
void main() {
	vUnderwaterDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,
    fragmentShader: /* glsl */ `
varying vec3 vUnderwaterDirection;
${underwaterRadiancePars}
void main() {
	gl_FragColor = vec4( underwaterRadiance( normalize( vUnderwaterDirection ).y, 1e9 ), 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	gl_FragColor.rgb += underwaterDither();
}`,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
  const backdrop = new Mesh(new BoxGeometry(1, 1, 1), material);
  backdrop.name = 'underwater-backdrop';
  backdrop.frustumCulled = false;
  backdrop.renderOrder = Number.MAX_SAFE_INTEGER;
  backdrop.visible = false;
  // Centred on the eye that draws it, as three's background box.
  backdrop.onBeforeRender = (_renderer, _scene, camera) => {
    backdrop.matrixWorld.copyPosition(camera.matrixWorld);
  };
  return backdrop;
}

/**
 * The Rich underwater fog's state: switched on under water in Rich, refreshed with the spot's water, the light and the
 * eye's depth; its backdrop goes in the scene and shows while it is on.
 */
export class UnderwaterFog {
  readonly backdrop = createBackdrop();
  private on = false;

  get active(): boolean {
    return this.on;
  }

  /** On only where `installUnderwaterFog` could install the chunks. */
  setActive(on: boolean): void {
    this.on = on && installed === true;
    underwaterFogUniforms.underwaterFogEye.value[3] = this.on ? 1 : 0;
    this.backdrop.visible = this.on;
  }

  /** The spot's water, the light at the surface and the eye's depth under it, m. */
  update(water: UnderwaterWater, light: SurfaceLight, depth: number): void {
    const eye = eyeAttenuation(water.beam);
    const mu = Math.min(1, Math.max(0.05, light.sunCosine));
    const entering = mu * (1 - schlickFresnel(mu));
    const { underwaterFogEye, underwaterFogSun, underwaterFogSky, underwaterFogDiffuse, underwaterFogLevel, underwaterFogZenith } = underwaterFogUniforms;
    underwaterFogEye.value.set(eye, 0);
    underwaterFogSun.value.set(light.sun.map((e) => e * entering), 0);
    underwaterFogSun.value[3] = refractedCosine(mu);
    underwaterFogSky.value.set(light.sky.map((e) => e * (1 - DIFFUSE_SKY_REFLECTANCE)), 0);
    underwaterFogSky.value[3] = Math.max(0, depth);
    underwaterFogDiffuse.value.set(water.diffuse, 0);
    underwaterFogDiffuse.value[3] = 1 / Math.max(1e-6, eye[1]);
    underwaterFogLevel.value.set(water.deep.map((r) => TYLER.levelOverNadir * r * NADIR_PER_IRRADIANCE), 0);
    underwaterFogZenith.value.set(zenithOverLevel(water.deep), 0);
  }
}

/** A Vector3-like uniform's value as RGB. */
const rgbOf = (uniform: { value: unknown } | undefined): Rgb | undefined => {
  const value = uniform?.value as { x: number; y: number; z: number } | undefined;
  return value ? [value.x, value.y, value.z] : undefined;
};

/**
 * The water the Rich view under the surface looks through, from the water mesh's own uniforms: the Rich look's own
 * optics where the water binds them (`richAttenuation`, `richDiffuseAttenuation`, `richDeepReflectance`: the sourced
 * per-spot colour, underwater-colour.md, decided 2026-09-29), else the optics both looks share.
 */
export function underwaterWaterOf(uniforms: Readonly<Record<string, { value: unknown } | undefined>>): UnderwaterWater {
  const pick = (rich: string, shared: string): Rgb => rgbOf(uniforms[rich]) ?? rgbOf(uniforms[shared]) ?? [0, 0, 0];
  return {
    beam: pick('richAttenuation', 'waterAttenuation'),
    diffuse: pick('richDiffuseAttenuation', 'waterDiffuseAttenuation'),
    deep: pick('richDeepReflectance', 'waterDeepReflectance'),
  };
}
