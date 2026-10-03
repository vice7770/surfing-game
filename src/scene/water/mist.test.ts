import { describe, expect, it } from 'vitest';
import skyManifest from '../../../public/assets/skies/skies.json';
import { skyExposure, type SkyEntry } from '../PhotoSky';
import { skyIrradiance } from '../SprayPoints';
import {
  CAPSULE_MEANS, DROP_G, FOAM_BALL, MIST_G, SPRAY_DRAW, SPRAY_LIGHT, ballPars, ballShade, capsuleMean, clusterProfile, foamBallDepth, foamBallLight, henyeyGreenstein, isMist, mistPars,
  sprayLight, sprayPars, sprayWhite, twoStream, type BallLight, type BallShape, type SprayLight,
} from './mist';
import { richSprayFragment, richSprayVertex } from './richSpray';

describe('mist', () => {
  it('tells mist from drops by size', () => {
    expect(isMist(0.4)).toBe(true);
    expect(isMist(0.1)).toBe(false);
  });

  it('scatters forward: brightest looking toward the sun, normalised over the sphere', () => {
    expect(henyeyGreenstein(1, MIST_G)).toBeGreaterThan(10 * henyeyGreenstein(-1, MIST_G));
    let total = 0;
    const n = 2000;
    for (let i = 0; i < n; i += 1) {
      const c = -1 + (2 * (i + 0.5)) / n;
      total += henyeyGreenstein(c, MIST_G) * 2 * Math.PI * (2 / n);
    }
    expect(total).toBeCloseTo(1, 2);
  });

  it('has a GLSL twin', () => {
    expect(mistPars).toContain('float henyeyGreenstein( float cosTheta, float g )');
  });
});

/** The water's own foam colour, #d8f2e9, linear: what the balls tumble on. */
const FOAM: [number, number, number] = [0.6867, 0.8879, 0.8148];
const luminance = ([r, g, b]: readonly number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const skies = skyManifest.skies as unknown as SkyEntry[];
const at = (time: SkyEntry['timeOfDay']) => skies.find((entry) => entry.timeOfDay === time)!;

/** A committed sky's light as the scene has it, its sky taken as neutral (the light before the photograph is up). */
function lightOf(entry: SkyEntry): BallLight {
  const exposure = skyExposure(entry);
  const radiance = exposure.sunColor.clone().multiplyScalar(exposure.sun);
  const sunHeight = entry.sun.direction[1];
  const sky = skyIrradiance(sunHeight, radiance);
  return { sky: [sky, sky, sky], sun: [radiance.r, radiance.g, radiance.b], sunHeight, foam: FOAM };
}

/** The foam on a level water surface under the same light: its colour times (sky + sun sin h) / π. */
function foamOnTheWater(entry: SkyEntry): number {
  const light = lightOf(entry);
  return luminance(FOAM.map((reflectance, k) => (reflectance * (light.sky[k] + light.sun[k] * light.sunHeight)) / Math.PI));
}

/**
 * A lone ball's mean colour as a level eye looking down −z sees it, the sun at its own height and `azimuth` degrees
 * round from straight ahead (0: behind the ball, 180: behind the eye), and the mean over its rim (the outer tenth).
 */
function ballSeen(entry: SkyEntry, azimuth: number): { mean: [number, number, number]; rim: [number, number, number] } {
  const light = lightOf(entry);
  const a = (azimuth * Math.PI) / 180;
  const level = Math.sqrt(1 - light.sunHeight ** 2);
  const toSun = [level * Math.sin(a), light.sunHeight, -level * Math.cos(a)];
  const forward = henyeyGreenstein(-toSun[2], DROP_G);
  const mean = [0, 0, 0];
  const rim = [0, 0, 0];
  let weight = 0;
  let rimWeight = 0;
  for (let i = 0; i < 200; i += 1) {
    const r = (i + 0.5) / 200;
    for (let j = 0; j < 72; j += 1) {
      const t = ((j + 0.5) / 72) * 2 * Math.PI;
      const normal = [r * Math.cos(t), r * Math.sin(t), Math.sqrt(1 - r * r)];
      const { colour, alpha } = foamBallLight(light, normal[0] * toSun[0] + normal[1] * toSun[1] + normal[2] * toSun[2], normal[1], 1, 0, 1, foamBallDepth(r), forward);
      for (let k = 0; k < 3; k += 1) mean[k] += colour[k] * alpha * r;
      weight += alpha * r;
      if (r > 0.9) {
        for (let k = 0; k < 3; k += 1) rim[k] += colour[k] * alpha * r;
        rimWeight += alpha * r;
      }
    }
  }
  return { mean: mean.map((v) => v / weight) as [number, number, number], rim: rim.map((v) => v / rimWeight) as [number, number, number] };
}

describe('the foam ball (G9), lit as fresh foam', () => {
  it('takes the drops’ asymmetry from Mie theory: 0.86–0.88', () => {
    expect(DROP_G).toBeGreaterThanOrEqual(0.86);
    expect(DROP_G).toBeLessThanOrEqual(0.88);
  });

  it('is R (E_sky / π + E_sun n·L / π), R a neutral white of the water foam’s luminance: its top lit by the sky, its underside by the foam sheet, its lit side by the sun', () => {
    const light: BallLight = { sky: [2, 2.2, 2.6], sun: [4, 2, 1], sunHeight: 0.5, foam: FOAM };
    const albedo = luminance(FOAM);
    const ground = FOAM.map((reflectance, k) => reflectance * (light.sky[k] + light.sun[k] * 0.5));
    const top = foamBallLight(light, 0, 1, 1, 0, 1, 20, 0).colour;
    const under = foamBallLight(light, 0, -1, 1, 0, 1, 20, 0).colour;
    const sunward = foamBallLight(light, 1, 0, 1, 0, 1, 20, 0).colour;
    for (let k = 0; k < 3; k += 1) {
      expect(top[k]).toBeCloseTo((albedo * light.sky[k]) / Math.PI, 9);
      expect(under[k]).toBeCloseTo((albedo * ground[k]) / Math.PI, 9);
      expect(sunward[k]).toBeCloseTo((albedo * (0.5 * light.sky[k] + 0.5 * ground[k] + light.sun[k])) / Math.PI, 9);
    }
    // In the shade of the balls between it and the sun, the sky and the sheet only; where they fill its view, their own light.
    const shaded = foamBallLight(light, 1, 0, 0, 0, 1, 20, 0).colour;
    const crowded = foamBallLight(light, 1, 0, 0, 1, 1, 20, 0).colour;
    for (let k = 0; k < 3; k += 1) {
      expect(shaded[k]).toBeCloseTo((albedo * (0.5 * light.sky[k] + 0.5 * ground[k])) / Math.PI, 9);
      expect(crowded[k]).toBeCloseTo((albedo * albedo * (0.5 * (light.sky[k] + ground[k]) + 0.25 * light.sun[k])) / Math.PI, 9);
    }
  });

  it('is opaque to near its rim, soft over its outer fifth, and covers nothing at the rim', () => {
    expect(1 - Math.exp(-foamBallDepth(0))).toBeGreaterThan(0.999);
    expect(1 - Math.exp(-foamBallDepth(0.7))).toBeGreaterThan(0.99);
    expect(1 - Math.exp(-foamBallDepth(0.8))).toBeGreaterThan(0.95);
    expect(1 - Math.exp(-foamBallDepth(0.9))).toBeGreaterThan(0.6);
    expect(1 - Math.exp(-foamBallDepth(0.95))).toBeLessThan(0.5);
    expect(foamBallDepth(1)).toBe(0);
    expect(foamBallDepth(0.3)).toBe(FOAM_BALL.depth);
  });

  it('is white at noon: as bright as the foam on the water in the same light, lit from behind the eye, and as grey as it is white', () => {
    const noon = ballSeen(at('midday'), 180).mean;
    expect(luminance(noon)).toBeGreaterThanOrEqual(foamOnTheWater(at('midday')));
    expect(Math.abs(noon[0] - noon[2]) / noon[1]).toBeLessThan(0.05);
    // From the side and from behind it the eye sees its shaded side, a sphere's share of the light: never under half.
    for (const azimuth of [0, 45, 90]) expect(luminance(ballSeen(at('midday'), azimuth).mean)).toBeGreaterThan(0.5 * foamOnTheWater(at('midday')));
  });

  it('is gold where the low sun lights it at sunset, and its thin rim is gold when the sun is behind it', () => {
    const frontlit = ballSeen(at('sunset'), 180).mean;
    expect(frontlit[0]).toBeGreaterThan(1.5 * frontlit[2]);
    const backlit = ballSeen(at('sunset'), 15);
    expect(backlit.rim[0]).toBeGreaterThan(1.2 * backlit.rim[2]);
    // Its face, turned from the sun, is the sky's (neutral here): no more red than blue.
    expect(backlit.mean[0] / backlit.mean[2]).toBeLessThan(backlit.rim[0] / backlit.rim[2]);
  });

  it('glows only in the drops’ forward lobe, and not where other balls take the sun', () => {
    const light = lightOf(at('sunset'));
    const away = foamBallLight(light, 0, 0, 1, 0, 1, 0.7, henyeyGreenstein(-0.9, DROP_G)).colour;
    const toward = foamBallLight(light, 0, 0, 1, 0, 1, 0.7, henyeyGreenstein(0.97, DROP_G)).colour;
    expect(toward[0] - away[0]).toBeGreaterThan(10 * (toward[2] - away[2]));
    expect(foamBallLight(light, 0, 0, 0, 0, 1, 0.7, henyeyGreenstein(0.97, DROP_G)).colour).toEqual(foamBallLight(light, 0, 0, 0, 0, 1, 0.7, 0).colour);
  });
});

describe('the shade foam balls throw on each other', () => {
  const ball = (x: number, y: number, z: number, radius = 0.3): BallShape => ({ x, y, z, radius });
  const up = { x: 0, y: 1, z: 0 };
  const east = { x: 1, y: 0, z: 0 };

  it('takes the sun where a ball stands between, through the depth of its disc the ray crosses', () => {
    const point = { x: 0, y: 0.3, z: 0 };
    expect(ballShade(point, up, up, [ball(0, 1.5, 0)]).sunlit).toBeCloseTo(Math.exp(-FOAM_BALL.depth), 9);
    // Beside the ray, behind the point, or past the far side of the sky: no shade.
    expect(ballShade(point, up, up, [ball(0.7, 1.5, 0)]).sunlit).toBe(1);
    expect(ballShade(point, up, up, [ball(0, -1, 0)]).sunlit).toBe(1);
    // Through its thin rim, the rim's depth.
    expect(ballShade(point, up, up, [ball(0.28, 1.5, 0)]).sunlit).toBeCloseTo(Math.exp(-foamBallDepth(0.28 / 0.3)), 9);
    // Two in a row: their depths add.
    expect(ballShade(point, up, up, [ball(0.27, 1.5, 0), ball(-0.27, 2.5, 0)]).sunlit).toBeCloseTo(Math.exp(-2 * foamBallDepth(0.9)), 9);
  });

  it('leaves the ball the point is on out of it', () => {
    const self = ball(0, 0, 0);
    expect(ballShade({ x: 0, y: 0.3, z: 0 }, up, up, [self], self)).toEqual({ sunlit: 1, enclosed: 0, visible: 1 });
  });

  it('fills a point’s view by a sphere’s view factor, cos θ (R / d)², and overlapping balls as independent ones', () => {
    const point = { x: 0, y: 0, z: 0 };
    expect(ballShade(point, up, east, [ball(0, 2, 0, 0.5)]).enclosed).toBeCloseTo(0.0625, 9);
    expect(ballShade(point, up, east, [ball(2, 2, 0, 0.5)]).enclosed).toBeCloseTo(Math.SQRT1_2 * (0.25 / 8), 9);
    expect(ballShade(point, up, east, [ball(0, -2, 0, 0.5)]).enclosed).toBe(0);
    const two = ballShade(point, up, east, [ball(0, 2, 0, 0.5), ball(0, 3, 0, 1.5)]).enclosed;
    expect(two).toBeCloseTo(1 - (1 - 0.0625) * (1 - 0.25), 9);
  });

  it('hides a point inside another ball by the depth of that ball’s disc there, so the balls show as their union', () => {
    const shade = ballShade({ x: 0, y: 0, z: 0 }, up, east, [ball(0, 0.1, 0, 0.5)]);
    expect(shade.visible).toBeCloseTo(Math.exp(-foamBallDepth(0.2)), 9);
    expect(shade.enclosed).toBe(1);
    expect(ballShade({ x: 0, y: 0, z: 0 }, up, east, [ball(0, 0.49, 0, 0.5)]).visible).toBeGreaterThan(0.5);
  });

  it('has a GLSL twin with the same numbers, which the Rich spray draws the foam ball with', () => {
    for (const [name, value] of [['DROP_G', DROP_G], ['BALL_DEPTH', FOAM_BALL.depth], ['BALL_FRAY', FOAM_BALL.fray], ['BALL_LUMPS', FOAM_BALL.lumps], ['BALL_RELIEF', FOAM_BALL.relief]] as const) {
      expect(ballPars).toContain(`const float ${name} = ${value.toFixed(3)};`);
    }
    expect(ballPars).toContain(`#define BALL_SHADOWS ${FOAM_BALL.shadows}`);
    expect(ballPars).toContain('float foamBallDepth( float r ) {\n  return BALL_DEPTH * ( 1.0 - smoothstep( 0.55, 1.0, r ) );');
    expect(ballPars).toContain('vec3 ballShade( vec3 point, vec3 normal, vec3 toSun, vec3 self )');
    expect(ballPars).toContain('vec3 foamBallLight( float facing, float up, float sunlit, float enclosed, float crease, float depth, float forward, vec3 sky, vec3 sun, float sunHeight, vec3 foam )');
    expect(richSprayFragment).toContain('henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), DROP_G )');
    expect(richSprayFragment).toContain('vOpacity * ( 1.0 - exp( -ballDepth ) ) * shade.z');
    // The water's fresh churn is creased 0.88–1 (richWaterGlsl.ts); so is the ball.
    expect(richSprayFragment).toContain('0.88 + 0.12 * churn.y');
    expect(richSprayVertex).toContain('vRadius = 0.5 * shape.x;');
  });
});

describe('spray drawn by its optical depth (decided 2026-09-29, spray item 1)', () => {
  const light: SprayLight = { sky: [1.7, 1.7, 1.7], sun: [4.95, 1.7, 0.11], sunHeight: 0.106, foam: FOAM };

  it('scatters as water drops do: mist’s asymmetry is the drops’ own, 0.86–0.88', () => {
    expect(MIST_G).toBe(DROP_G);
  });

  it('is see-through near τ = 1 and white past 15: Bohren’s two-stream slab', () => {
    const reduced = (tau: number) => (1 - MIST_G) * tau;
    expect(twoStream(15).reflect).toBeCloseTo(reduced(15) / (2 + reduced(15)), 12);
    expect(twoStream(15).reflect).toBeGreaterThan(0.45);
    expect(twoStream(1).reflect).toBeLessThan(0.07);
    expect(twoStream(1).through).toBeCloseTo(2 / (2 + reduced(1)) - Math.exp(-1), 12);
    expect(sprayWhite(1)).toBeLessThan(0.15);
    expect(sprayWhite(15)).toBeGreaterThan(0.8);
    expect(sprayWhite(100)).toBeGreaterThan(0.99);
  });

  it('stops 1 − e^−τ of what is behind it, and hides half of that while thin (half of what drops scatter goes within 5°), all of it once white', () => {
    const thin = sprayLight(light, 0.3, 0.3, 1 / (4 * Math.PI), 0, 0);
    expect(thin.emission).toBeCloseTo(1 - Math.exp(-0.3), 12);
    expect(thin.hidden / thin.emission).toBeCloseTo(SPRAY_LIGHT.leak + (1 - SPRAY_LIGHT.leak) * sprayWhite(0.3), 12);
    expect(SPRAY_LIGHT.leak).toBe(0.5);
    const thick = sprayLight(light, 0.3, 200, 1 / (4 * Math.PI), 0, 0);
    expect(thick.hidden / thick.emission).toBeGreaterThan(0.99);
  });

  it('glows with the sun’s own colour where thin spray is backlit, and is the readable minimum of white where it is lit from the front', () => {
    const backlit = sprayLight(light, 0.3, 0.3, henyeyGreenstein(0.97, MIST_G), 0, 0).colour;
    expect(backlit[0] / backlit[1]).toBeGreaterThan(0.8 * (light.sun[0] / light.sun[1]));
    expect(luminance(backlit)).toBeGreaterThan(4 * luminance(sprayLight(light, 0.3, 0.3, henyeyGreenstein(-0.9, MIST_G), 0, 0).colour));
    // Front-lit thin spray is never under the readable share of a white cloud's light in the same place; with no sky to
    // scatter, the sun's backscatter alone is far under it, and it is lifted to it.
    const whiteIn = (l: SprayLight) => l.sky.map((sky, k) => (sky * 0.5 + FOAM[k] * (sky + l.sun[k] * l.sunHeight) * 0.5 + l.sun[k] * 0.5) / Math.PI);
    const front = sprayLight(light, 0.3, 0.3, henyeyGreenstein(-0.9, MIST_G), 0.5, 0).colour;
    expect(luminance(front)).toBeGreaterThanOrEqual(SPRAY_LIGHT.readable * luminance(whiteIn(light)) - 1e-9);
    const noSky: SprayLight = { ...light, sky: [0, 0, 0] };
    const lifted = sprayLight(noSky, 0.3, 0.3, henyeyGreenstein(-0.9, MIST_G), 0.5, 0).colour;
    expect(luminance(lifted)).toBeCloseTo(SPRAY_LIGHT.readable * luminance(whiteIn(noSky)), 9);
    // In its own hue, the sun's: the lift scales it, it does not whiten it.
    expect(lifted[0] / lifted[2]).toBeGreaterThan(10);
  });

  it('is a white of the sun on its lit side where the spray round it is thick, and passes the sun through on the other while it is not too thick', () => {
    const lit = sprayLight(light, 2, 400, 0, 1, 0).colour;
    const shaded = sprayLight(light, 2, 400, 0, -1, 0).colour;
    expect(luminance(lit)).toBeGreaterThan(2 * luminance(shaded));
    // At τ = 15 round it, half the sun comes through to its far side: the silver lining of a backlit cloud.
    const through = sprayLight(light, 2, 15, 0, -1, 0).colour;
    expect(luminance(through)).toBeGreaterThan(1.5 * luminance(shaded));
  });

  it('spreads a cluster’s depth over the capsule drawn, most at its middle and nothing at its edge, keeping its water', () => {
    expect(clusterProfile(0)).toBe(1);
    expect(clusterProfile(1)).toBeCloseTo(0, 12);
    expect(clusterProfile(0.5)).toBeCloseTo((Math.exp(-0.5) - Math.exp(-2)) / (1 - Math.exp(-2)), 12);
    // Over a disc the profile's mean is ((1 − e^−2) / 2 − e^−2) / (1 − e^−2); across a band, (√(π/8) erf √2 − e^−2) / (1 − e^−2).
    const rim = Math.exp(-2);
    expect(CAPSULE_MEANS.disc).toBeCloseTo(((1 - rim) / 2 - rim) / (1 - rim), 6);
    expect(CAPSULE_MEANS.line).toBeCloseTo((0.598144 - rim) / (1 - rim), 5);
    expect(capsuleMean(0)).toBeCloseTo(CAPSULE_MEANS.disc, 12);
    expect(capsuleMean(1e9)).toBeCloseTo(CAPSULE_MEANS.line, 6);
    // Integrate the profile over a capsule of half length 2 numerically: its mean is capsuleMean(2).
    let sum = 0;
    let area = 0;
    for (let i = -300; i < 300; i += 1) {
      for (let j = -100; j < 100; j += 1) {
        const x = (i + 0.5) / 100;
        const y = (j + 0.5) / 100;
        const beyond = Math.max(0, Math.abs(x) - 2);
        const edge2 = beyond * beyond + y * y;
        if (edge2 > 1) continue;
        sum += clusterProfile(Math.sqrt(edge2));
        area += 1;
      }
    }
    expect(sum / area).toBeCloseTo(capsuleMean(2), 2);
  });

  it('has a GLSL twin with the same numbers, which the Rich spray draws its spray and mist with', () => {
    for (const [name, value] of [['SPRAY_LEAK', SPRAY_LIGHT.leak], ['SPRAY_READABLE', SPRAY_LIGHT.readable], ['SPRAY_GLASS', SPRAY_LIGHT.glass]] as const) {
      expect(sprayPars).toContain(`const float ${name} = ${value.toFixed(3)};`);
    }
    expect(sprayPars).toContain('vec3 sprayLight( float column, float phase, float facing, float up, vec3 sky, vec3 sun, float sunHeight, vec3 foam )');
    expect(richSprayFragment).toContain('sprayLight( vColumn, phase, dot( worldNormal, spraySunDirection ), worldNormal.y, vSky, spraySunRadiance, spraySunDirection.y, waterFoamColor )');
    expect(richSprayFragment).toContain('hidden = ( stopped * mix( SPRAY_LEAK, 1.0, white ) + clear * SPRAY_GLASS ) * fade;');
    expect(richSprayFragment).toContain('gl_FragColor = vec4( gl_FragColor.rgb * emission, hidden );');
    expect(richSprayVertex).toContain('capsuleMean( halfLength / vRadius )');
    expect(richSprayVertex).toContain('smoothstep( SPRAY_FADE_FROM, SPRAY_FADE_TO, pixels / screenHeight )');
    expect(richSprayVertex).toContain(`const float SPRAY_FADE_FROM = ${SPRAY_DRAW.fadeFrom.toFixed(3)};`);
    expect(richSprayFragment).toContain('float profile = max( 0.0, ( exp( -2.0 * edge2 ) - 0.135335283 ) / 0.864664717 );');
  });
});
