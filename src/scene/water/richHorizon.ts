import { devParam } from '../../devTools';
import { WATER_HAZE_OUTPUT, waterHazeFragmentPars, waterHazeVertexPars } from './horizonHaze';
import { RICH_REFLECTION } from './richWaterGlsl';
import { WATER_SKY_PARS, richSkyReflection } from './skyReflection';

/**
 * The horizon plan's Rich water (item 3): the haze toward the horizon (`horizonHaze`) and the sky mirrored from the
 * slopes' spread (`skyReflection`), laid over a Rich program's shaders once its own chunks are in. The tank (and so its
 * edge band, which builds on the tank's program) and the far ocean take it alike, so they match at their seams.
 * Classic never does.
 */

/** Dev (`?horizon=off`): the Rich water as it was before the horizon plan, for before-and-after stills and timings. */
export function horizonLookOn(search?: string): boolean {
  return devParam('horizon', search) !== 'off';
}

/** Dev (`?horizonSky=three`): the sky mirrored as three reads it (before the horizon plan), the haze kept: its cost alone. */
export function horizonSkyOn(search?: string): boolean {
  return devParam('horizonSky', search) !== 'three';
}

/** Dev (`?horizonHaze=off`): no haze toward the horizon, the sky mirror kept: its cost alone. */
export function horizonHazeOn(search?: string): boolean {
  return devParam('horizonHaze', search) !== 'off';
}

/** Where every water program has placed its vertex in the world (its vertex chunks end on it). */
const WORLD = 'vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;';

function once(source: string, target: string, replacement: string): string {
  const found = source.split(target).length - 1;
  if (found !== 1) throw new Error(`The horizon look needs the water's line ${target.split('\n')[0]} once, found ${found}`);
  return source.replace(target, () => replacement);
}

/**
 * Lay the horizon look over a Rich water program (with `RICH_REFLECTION` in place): `horizon` is the GLSL share of the
 * way to the horizon a vertex already is (the far ocean's rim fade; 0 for the tank), and `vertexPars` what that needs.
 * With `?horizon=off`, the shaders are left as they were; `?horizonSky=three` and `?horizonHaze=off` leave out one part.
 */
export function withRichHorizon(shader: { vertexShader: string; fragmentShader: string }, horizon = '0.0', vertexPars = ''): void {
  if (!horizonLookOn()) return;
  const haze = horizonHazeOn();
  let vertex = once(shader.vertexShader, '#include <common>', `#include <common>\n${waterHazeVertexPars}${vertexPars}`);
  vertex = once(vertex, WORLD, `${WORLD}\nvWaterHaze = ${haze ? `waterHazeAt( vWaterWorld, ${horizon} )` : 'vec4( 0.0 )'};`);
  let fragment = once(shader.fragmentShader, '#include <common>', `#include <common>\n${waterHazeFragmentPars}`);
  if (horizonSkyOn()) {
    fragment = once(fragment, '#include <lights_physical_pars_fragment>', WATER_SKY_PARS);
    fragment = once(fragment, RICH_REFLECTION, richSkyReflection());
  }
  if (haze) fragment = once(fragment, '#include <tonemapping_fragment>', WATER_HAZE_OUTPUT);
  shader.vertexShader = vertex;
  shader.fragmentShader = fragment;
}
