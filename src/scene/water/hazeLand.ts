import { Material, type Object3D, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { DEV_TOOLS, devParam } from '../../devTools';
import { horizonHazeUniforms, waterHazeColorPars, waterHazeUniformPars } from './horizonHaze';
import { horizonHazeOn, horizonLookOn } from './richHorizon';
import type { WaterLook } from './waterLook';

/**
 * The horizon haze on what the Rich look draws besides the water (the web-ocean plan's step-7 follow-up): the dry
 * sand and the seabed, the lip sheets, the spilling curl, the swept barrel, the spray and mist, the bubbles, and the
 * riders, boards and leashes. Without it the far water greyed toward the horizon while the sand beside it stayed
 * sharp: at 1 km the water took 28 % haze and the beach none.
 *
 * The maths and the uniforms are the water's (`horizonHaze.ts`): what lies d m off keeps e^{−βd} of its colour and
 * takes the rest from the horizon's colour in its direction (the photo's ring, turned with it; its AgX preimage under
 * the glow), mixed over the tone-mapped colour. So a point hazed all the way is the sky's horizon pixel, as the water
 * is, glow or no glow. The one `applyHorizonHaze` call that reaches the water reaches these too: no haze under water,
 * none before a photographed sky. Rich only; never in Classic. No sampler anywhere (the ring is a uniform array).
 *
 * Two routes: per vertex (one varying, `vHazeLand`) or per pixel (from a world position the program already hands
 * its fragments; no new varying). The Rich tank's programs are untouched: they keep their own haze.
 */

/** Where the haze is worked out: per vertex (a varying), or per pixel (the ring's lookup in every pixel, no varying). */
export type HazeRoute = 'vertex' | 'pixel';

/** The drawings the land haze reaches; `scenery` is three's own materials (riders, boards, leash, bubbles, the pool's). */
export type HazeSiteName = 'seabed' | 'lip' | 'curl' | 'front' | 'barrel' | 'spray' | 'scenery';

export interface HazeLandMode {
  /** Dev (`?hazeLand=off`, `window.waterHazeLand(false)`): nothing but the water hazed, as before. */
  on: boolean;
  /** Dev (`?hazeLand=vertex|pixel`): one route wherever a drawing can take either, for timing them. */
  route?: HazeRoute;
  /** Dev (`window.waterHazeLand({ sites: { barrel: 'vertex', seabed: 'off' } })`): one drawing's route, or none. */
  sites?: Partial<Record<HazeSiteName, HazeRoute | 'off'>>;
}

const param = devParam('hazeLand');
export const hazeLandMode: HazeLandMode = { on: param !== 'off', route: param === 'vertex' || param === 'pixel' ? param : undefined };

/** The look the drawings that have none of their own follow (the seabed, the bubbles, the riders): the water's. */
let sceneLook: WaterLook = 'classic';
const listeners = new Set<() => void>();

/** Whether a drawing in `look` is hazed: Rich, the switch on, and the water's own haze in (`?horizon=off`, `?horizonHaze=off`). */
export function hazeLandOn(look: WaterLook): boolean {
  return look === 'rich' && hazeLandMode.on && horizonLookOn() && horizonHazeOn();
}

/**
 * Each drawing's route where it can take either (a world position in its fragments). Timed on the M1 (the haze-land
 * notes): the seabed per vertex (its small program pays less for a varying than for the ring's lookup in each pixel:
 * +0.3–0.7 ms against +0.8–1.6 ms with the whole seabed bared); the thin water sheets per pixel, from the world position
 * the water's shading already hands them (a new varying in a big Rich program costs more than arithmetic, the foam
 * work's lesson); three's lit materials per pixel from their view position, right over the Wave Pool's few big ground
 * planes, whose vertices lie up to 1.5 km apart.
 */
export const HAZE_ROUTES: Record<HazeSiteName, HazeRoute> = {
  seabed: 'vertex',
  lip: 'pixel',
  curl: 'pixel',
  // The roller front (a standard material): per pixel from its view position, as three's lit materials.
  front: 'pixel',
  barrel: 'pixel',
  spray: 'vertex',
  scenery: 'pixel',
};

/**
 * The route `site` takes in `look`, or none (no haze): its own (`HAZE_ROUTES`) unless a dev switch forces one. A drawing
 * that cannot take the pixel route (`either` false: no world position in its fragments) goes per vertex.
 */
export function hazeLandRoute(site: HazeSiteName, look: WaterLook, either = true): HazeRoute | undefined {
  if (!hazeLandOn(look)) return undefined;
  const forced = hazeLandMode.sites?.[site];
  if (forced === 'off') return undefined;
  const route = forced ?? hazeLandMode.route ?? HAZE_ROUTES[site];
  return either ? route : 'vertex';
}

/** The program cache key's part for a route: none without the haze. */
export function hazeLandKey(route: HazeRoute | undefined): string {
  return route ? `-haze-land-${route}` : '';
}

/** Called whenever the switch or the scene's look changes: the hazed programs compile again. */
export function onHazeLandChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tell the hazed programs when the switch, its route or the scene's look changed. */
function changed(apply: () => void): void {
  const state = () => `${hazeLandMode.on}|${hazeLandMode.route}|${JSON.stringify(hazeLandMode.sites ?? {})}|${sceneLook}`;
  const was = state();
  apply();
  if (state() !== was) for (const listener of listeners) listener();
}

/** The water's look, for the drawings that follow it (main's `applyWaterLook`). */
export function setHazeLandLook(look: WaterLook): void {
  changed(() => {
    sceneLook = look;
  });
}

/** The scene's look as the haze follows it. */
export function hazeLandLook(): WaterLook {
  return sceneLook;
}

/** Dev: the haze on or off, or one route forced (`window.waterHazeLand`). */
export function setHazeLand(patch: boolean | HazeRoute | 'off' | Partial<HazeLandMode>): void {
  changed(() => {
    if (typeof patch === 'boolean') hazeLandMode.on = patch;
    else if (patch === 'off') hazeLandMode.on = false;
    else if (patch === 'vertex' || patch === 'pixel') Object.assign(hazeLandMode, { on: true, route: patch });
    else Object.assign(hazeLandMode, patch);
  });
}

/**
 * GLSL: the haze toward a point `toward` m from the eye (world axes): rgb the horizon's colour that way, a its share.
 * The water's `waterHazeAt` with no far-ocean share.
 */
export const hazeLandPars = /* glsl */ `${waterHazeUniformPars}${waterHazeColorPars}vec4 hazeLandToward( vec3 toward ) {
  if ( waterHazeExtinction <= 0.0 ) return vec4( 0.0 );
  return vec4( waterHazeColor( toward.xz + vec2( 1e-4, 0.0 ) ), 1.0 - exp( -waterHazeExtinction * length( toward ) ) );
}
`;

/**
 * Nearer than this, m, the pixel route works out no haze: it would be under 0.82 % (e^{−β·25}), within a level of 255
 * of none, and the riders, a curl at the face or a barrel from the inside, the pixel route's largest areas on screen, are
 * mostly that near.
 */
export const HAZE_NEAR = 25;

/** GLSL: from the eye to the vertex, world axes, after three's `<project_vertex>` (skinning and instancing in). */
export const MV_TOWARD = '( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz';
/** GLSL: from the eye to the pixel, world axes, in a standard or physical material's fragment (its `vViewPosition`). */
export const VIEW_TOWARD = '( vec4( -vViewPosition, 0.0 ) * viewMatrix ).xyz';
const TONE_MAPPING = '#include <tonemapping_fragment>';
const PROJECT = '#include <project_vertex>';
const COMMON = '#include <common>';

/** Where a program takes the haze. */
export interface HazeSite {
  route: HazeRoute;
  /** Vertex route: the line after which the vertex's `toward` is known (three's `<project_vertex>` by default). */
  vertexAnchor?: string;
  /** Vertex route: GLSL from the eye to the vertex, world axes (`MV_TOWARD` by default). */
  vertexToward?: string;
  /** Pixel route: GLSL from the eye to the pixel, world axes (a world position the fragment has, less `cameraPosition`). */
  pixelToward?: string;
  /** The line after which the colour is final but for its encoding (three's `<tonemapping_fragment>` by default). */
  outputAnchor?: string;
}

function once(source: string, target: string, replacement: string, stage: string): string {
  const found = source.split(target).length - 1;
  if (found !== 1) throw new Error(`The land haze needs the ${stage}'s line ${target.split('\n')[0]} once, found ${found}`);
  return source.replace(target, () => replacement);
}

/** Declarations at the top of a stage: after three's `<common>`, or first in a shader with none (a ShaderMaterial's). */
function declare(source: string, pars: string, stage: string): string {
  return source.includes(COMMON) ? once(source, COMMON, `${COMMON}\n${pars}`, stage) : `${pars}\n${source}`;
}

/**
 * Lay the haze over a program's shaders, at `site`: the haze worked out per vertex or per pixel, and mixed over the
 * colour once it is tone mapped, before its encoding (as the water's, `WATER_HAZE_OUTPUT`). Needs the haze's uniforms
 * (`horizonHazeUniforms`) in the program's.
 */
export function withHazeLand(shader: { vertexShader: string; fragmentShader: string }, site: HazeSite): void {
  const output = site.outputAnchor ?? TONE_MAPPING;
  if (site.route === 'vertex') {
    const anchor = site.vertexAnchor ?? PROJECT;
    let vertex = declare(shader.vertexShader, `${hazeLandPars}varying vec4 vHazeLand;`, 'vertex');
    vertex = once(vertex, anchor, `${anchor}\nvHazeLand = hazeLandToward( ${site.vertexToward ?? MV_TOWARD} );`, 'vertex');
    let fragment = declare(shader.fragmentShader, 'varying vec4 vHazeLand;', 'fragment');
    fragment = once(fragment, output, `${output}\ngl_FragColor.rgb = mix( gl_FragColor.rgb, vHazeLand.rgb, vHazeLand.a );`, 'fragment');
    shader.vertexShader = vertex;
    shader.fragmentShader = fragment;
    return;
  }
  if (!site.pixelToward) throw new Error('The land haze per pixel needs the pixel\'s way from the eye');
  let fragment = declare(shader.fragmentShader, hazeLandPars, 'fragment');
  fragment = once(fragment, output, `${output}
{
  vec3 hazeLandWay = ${site.pixelToward};
  if ( dot( hazeLandWay, hazeLandWay ) > ${(HAZE_NEAR * HAZE_NEAR).toFixed(1)} ) {
    vec4 hazeLand = hazeLandToward( hazeLandWay );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, hazeLand.rgb, hazeLand.a );
  }
}`, 'fragment');
  shader.fragmentShader = fragment;
}

/** The materials `hazeMaterial` has wrapped (a clone carries none of the wrapper, so it is not marked on the material). */
const hazed = new WeakSet<Material>();

/**
 * Haze one of three's own materials (standard, physical, basic, points) in the Rich look, following the
 * scene's look (`setHazeLandLook`) and the dev switch: its own `onBeforeCompile` runs first, its cache key gains the
 * haze's part. Call it after the material's own `onBeforeCompile` is set.
 */
export function hazeMaterial<T extends Material>(material: T): T {
  if (hazed.has(material)) return material;
  hazed.add(material);
  const before = material.onBeforeCompile;
  // Three's default key is the source of `onBeforeCompile`, which is about to become this wrapper's: keep the original's.
  const own = material.customProgramCacheKey === Material.prototype.customProgramCacheKey ? before.toString() : undefined;
  const ownKey = material.customProgramCacheKey;
  // Standard and physical materials hand their fragments the view position: per pixel from it (no new varying, and
  // right over the Wave Pool's few big ground planes); the rest (points, basic) per vertex.
  const lit = (material as Material & { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial === true;
  material.onBeforeCompile = function hazedCompile(this: Material, shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) {
    before.call(this, shader, renderer);
    const route = hazeLandRoute('scenery', sceneLook, lit);
    if (!route) return;
    Object.assign(shader.uniforms, horizonHazeUniforms);
    withHazeLand(shader, { route, pixelToward: VIEW_TOWARD });
  };
  material.customProgramCacheKey = function hazedKey(this: Material) {
    return `${own ?? ownKey.call(this)}${hazeLandKey(hazeLandRoute('scenery', sceneLook, lit))}`;
  };
  // Held weakly: a body swapped for another is let go without being disposed.
  const held = new WeakRef(material);
  const stop = onHazeLandChange(() => {
    const live = held.deref();
    if (live) live.needsUpdate = true;
    else stop();
  });
  material.addEventListener('dispose', stop);
  material.needsUpdate = true;
  return material;
}

/** Haze every material under `root` (`hazeMaterial`): a board, a body. */
export function hazeObject(root: Object3D): void {
  root.traverse((object) => {
    const { material } = object as Object3D & { material?: Material | Material[] };
    if (!material) return;
    for (const each of ([] as Material[]).concat(material)) hazeMaterial(each);
  });
}

if (DEV_TOOLS && typeof window !== 'undefined') Object.assign(window, { waterHazeLand: setHazeLand });
