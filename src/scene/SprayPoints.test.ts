import { Color, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REFERENCE_LIGHT, skyExposure, type SkyEntry } from './PhotoSky';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { SprayPoints, groundIrradiance, skyIrradiance } from './SprayPoints';
import { DROP_G, FOAM_BALL, ballPars, foamBallColour, foamBallGlow } from './water/mist';
import { richSprayFragment } from './water/richSpray';

const sky = (id: string, timeOfDay: SkyEntry['timeOfDay'], elevation: number, irradiance: [number, number, number], skyIrradiance: number): SkyEntry => {
  const e = (elevation * Math.PI) / 180;
  return { id, timeOfDay, hdr: '', background: '', sun: { direction: [Math.cos(e) * 0.6, Math.sin(e), Math.cos(e) * 0.8], irradiance }, skyIrradiance };
};
// The committed skies' measured values (public/assets/skies/skies.json).
const skies = [
  sky('sunrise', 'dawn', 2.1, [0.31, 0.03, 0], 3.4),
  sky('noon', 'midday', 47.9, [4.16, 4.22, 3.85], 1.69),
  sky('dusk', 'sunset', 6.1, [6.94, 2.38, 0.15], 2.34),
];

/** What the scene is lit with under a photographed sky: the sun's height, its radiance per channel, and the sky's irradiance. */
function lighting(entry: SkyEntry) {
  const exposure = skyExposure(entry);
  const radiance = exposure.sunColor.clone().multiplyScalar(exposure.sun);
  const skyLight = exposure.environment * entry.skyIrradiance;
  const height = entry.sun.direction[1];
  return { height, radiance, sun: [radiance.r, radiance.g, radiance.b] as [number, number, number], sky: skyLight, ground: groundIrradiance(skyLight, height, radiance) };
}

const luminance = ([r, g, b]: readonly number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('the sky the spray is lit by', () => {
  it('is what a photographed sky leaves when the sun has brought its share, for each of the committed skies', () => {
    for (const entry of skies) {
      const { height, radiance, sky: expected } = lighting(entry);
      expect(skyIrradiance(height, radiance)).toBeCloseTo(expected, 9);
    }
  });

  it('is most of the light at sunrise and sunset and a third of it at noon, as the photographs say', () => {
    const [dawn, noon, dusk] = skies.map((entry) => {
      const { height, radiance } = lighting(entry);
      return skyIrradiance(height, radiance) / (REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(height)));
    });
    expect(noon).toBeGreaterThan(0.3);
    expect(noon).toBeLessThan(0.4);
    expect(dusk).toBeGreaterThan(0.8);
    expect(dawn).toBeGreaterThan(0.9);
  });

  it('keeps a floor when the sun is all the light the scene is told of, and the sky is all of it with the sun down', () => {
    expect(skyIrradiance(0.7, new Color(30, 30, 30))).toBeCloseTo(0.1 * REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(0.7)), 9);
    expect(skyIrradiance(-0.2, new Color(3, 3, 3))).toBeCloseTo(0.4 * REFERENCE_LIGHT, 9);
  });

  it('lights the foam sheet under a ball with the sky and the sun’s horizontal share, at the foam’s reflectance', () => {
    const { height, radiance, sky: skyLight, ground } = lighting(skies[1]);
    const horizontal = REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(height));
    expect(ground).toBeCloseTo(FOAM_BALL.bounce * horizontal, 9);
    expect(groundIrradiance(skyLight, -0.3, radiance)).toBeCloseTo(FOAM_BALL.bounce * skyLight, 9);
  });

  it('reaches the Rich foam ball with the sun, in its own uniforms', () => {
    const spray = new SprayPoints();
    spray.setLook('rich');
    for (const entry of skies) {
      const { radiance, sky: expectedSky, ground } = lighting(entry);
      spray.setSun(new Vector3(...entry.sun.direction).multiplyScalar(3), radiance);
      const { uniforms } = spray.mesh.material;
      expect((uniforms.spraySunDirection.value as Vector3).length()).toBeCloseTo(1, 9);
      expect(uniforms.spraySkyIrradiance.value).toBeCloseTo(expectedSky, 9);
      expect(uniforms.sprayGroundIrradiance.value).toBeCloseTo(ground, 9);
    }
    expect(spray.mesh.material.fragmentShader).toContain('uniform float spraySkyIrradiance;');
    expect(spray.mesh.material.fragmentShader).toContain('spraySkyIrradiance, sprayGroundIrradiance, spraySunRadiance )');
  });
});

describe('the foam ball (G9) lit as fresh foam', () => {
  /** The water's own foam colour (#d8f2e9, linear): what the ball tumbles on. */
  const waterFoam = [0.6867, 0.8879, 0.8148];

  /**
   * The ball's mean luminance and colour over the inner 90 % of its disc (a smooth sphere: the lumps' shading is
   * mean-preserving), seen by a level eye looking down −z with the sun at its own height and `azimuth` degrees round
   * from straight ahead (0 backlit, 180 behind the eye).
   */
  function ball(entry: SkyEntry, azimuth: number): { luminance: number; red: number; blue: number } {
    const { height, sun, sky: skyLight, ground } = lighting(entry);
    const a = (azimuth * Math.PI) / 180;
    const horizontal = Math.sqrt(1 - height * height);
    const toSun = new Vector3(horizontal * Math.sin(a), height, -horizontal * Math.cos(a));
    let total = 0;
    let red = 0;
    let blue = 0;
    let weight = 0;
    const steps = 90;
    for (let i = 0; i < steps; i += 1) {
      const r = ((i + 0.5) / steps) * 0.9;
      for (let j = 0; j < 72; j += 1) {
        const t = ((j + 0.5) / 72) * 2 * Math.PI;
        const normal = new Vector3(r * Math.cos(t), r * Math.sin(t), Math.sqrt(1 - r * r));
        const colour = foamBallColour(normal.dot(toSun), normal.y, skyLight, ground, sun);
        total += luminance(colour) * r;
        red += colour[0] * r;
        blue += colour[2] * r;
        weight += r;
      }
    }
    return { luminance: total / weight, red: red / weight, blue: blue / weight };
  }

  /** The foam on a level water surface under the same light: its colour times (sky + sun · sin h) / π. */
  function foamBeneath(entry: SkyEntry): number {
    const { height, sun, sky: skyLight } = lighting(entry);
    return luminance(waterFoam.map((c, k) => (c * (skyLight + sun[k] * height)) / Math.PI));
  }

  it('is at least as bright as the foam under it, with the sun at any azimuth from 60° round to behind the eye, at dawn, noon and sunset', () => {
    for (const entry of skies) {
      for (const azimuth of [60, 90, 100, 120, 150, 180]) {
        expect(ball(entry, azimuth).luminance, `${entry.id} at ${azimuth}°`).toBeGreaterThanOrEqual(foamBeneath(entry));
      }
    }
  });

  it('keeps most of the foam’s light even looking into a sun 48° up, where its lit side is turned away from the eye', () => {
    for (const azimuth of [0, 15, 30]) expect(ball(skies[1], azimuth).luminance, `${azimuth}°`).toBeGreaterThan(0.95 * foamBeneath(skies[1]));
  });

  it('is not blown out: its mean stays under 3 × the foam under it, with the sun at any azimuth', () => {
    for (const entry of skies) {
      for (const azimuth of [0, 90, 180]) expect(ball(entry, azimuth).luminance).toBeLessThan(3 * foamBeneath(entry));
    }
  });

  it('is white at noon and only warm at sunset: the body keeps half of the sun’s colour, so a low sun does not paint it salmon', () => {
    const noon = ball(skies[1], 150);
    expect(Math.abs(noon.red - noon.blue) / noon.red).toBeLessThan(0.15);
    const dusk = ball(skies[2], 150);
    expect(dusk.red).toBeGreaterThan(1.1 * dusk.blue);
    expect(dusk.red).toBeLessThan(2.5 * dusk.blue);
  });

  it('shades with the sun on its lit side, and still lights its shaded side and passes the sun on when backlit', () => {
    const { sky: skyLight, ground, sun } = lighting(skies[1]);
    const lit = luminance(foamBallColour(1, 0, skyLight, ground, sun));
    const side = luminance(foamBallColour(0, 0, skyLight, ground, sun));
    const shaded = luminance(foamBallColour(-1, 0, skyLight, ground, sun));
    expect(lit).toBeGreaterThan(side);
    expect(side).toBeGreaterThan(shaded);
    // Backlit, the shaded side is lit by the sky and the sun it passes on, not by the sky alone.
    expect(shaded).toBeGreaterThan((FOAM_BALL.albedo * ((skyLight + ground) / 2)) / Math.PI);
  });

  it('lights its top with the sky and its underside with the foam sheet’s bounce', () => {
    const { sky: skyLight, ground } = lighting(skies[1]);
    expect(foamBallColour(0, 1, skyLight, ground, [0, 0, 0])[1]).toBeCloseTo((FOAM_BALL.albedo * skyLight) / Math.PI, 9);
    expect(foamBallColour(0, -1, skyLight, ground, [0, 0, 0])[1]).toBeCloseTo((FOAM_BALL.albedo * ground) / Math.PI, 9);
  });

  it('keeps the sun’s colour in the body by `chroma` and takes the luminance whole', () => {
    const { sky: skyLight, ground, sun } = lighting(skies[2]);
    const none = foamBallColour(1, 0, 0, 0, sun);
    // With no sky the colour is the sun's body: a grey plus `chroma` of how far the sun is from it.
    const grey = luminance(sun);
    expect(none[0] / none[1]).toBeCloseTo((grey + (sun[0] - grey) * FOAM_BALL.chroma) / (grey + (sun[1] - grey) * FOAM_BALL.chroma), 9);
    const direct = foamBallColour(1, 0, skyLight, ground, sun);
    const whole = sun.map((channel) => (FOAM_BALL.albedo * ((skyLight + ground) / 2 + channel * 1)) / Math.PI);
    expect(luminance(direct)).toBeCloseTo(luminance(whole), 9);
  });

  it('glows gold where it is thin and the sun is behind it, and nowhere else', () => {
    const { sun } = lighting(skies[2]);
    // The drops' phase function toward a sun 30° off the line of sight against 90° off (1 is an isotropic scatterer).
    const near = foamBallGlow(4 * Math.PI * 0.1657, 0.2, 1, sun);
    const side = foamBallGlow(4 * Math.PI * 0.0, 0.2, 1, sun);
    expect(near.coverage).toBeGreaterThan(0.05);
    expect(side.coverage).toBe(0);
    // The sun’s whole colour, red over blue, not the body’s tempered one.
    expect(near.colour[0] / near.colour[2]).toBeCloseTo(sun[0] / sun[2], 9);
    // Thin edges glow more than the thick middle, and thin churn more than dense.
    expect(foamBallGlow(12, 0.2, 1, sun).coverage).toBeGreaterThan(foamBallGlow(12, 1, 1, sun).coverage);
    expect(foamBallGlow(12, 0.5, 0.2, sun).coverage).toBeGreaterThan(foamBallGlow(12, 0.5, 1, sun).coverage);
    // Looking straight into the sun the glow is capped, not burnt out.
    expect(foamBallGlow(95, 0.2, 1, sun).coverage).toBe(foamBallGlow(FOAM_BALL.glowMax, 0.2, 1, sun).coverage);
    expect(foamBallGlow(95, 0.2, 1, sun).coverage).toBeLessThanOrEqual(1);
  });

  it('has a GLSL twin with the same numbers', () => {
    for (const [name, value, digits] of [
      ['BALL_ALBEDO', FOAM_BALL.albedo, 3], ['BALL_WRAP', FOAM_BALL.wrap, 3], ['BALL_PASS', FOAM_BALL.translucency, 3], ['BALL_CHROMA', FOAM_BALL.chroma, 3],
      ['BALL_GLOW', FOAM_BALL.glow, 3], ['BALL_GLOW_MAX', FOAM_BALL.glowMax, 1], ['BALL_DEPTH', FOAM_BALL.depth, 3], ['BALL_LUMPS', FOAM_BALL.lumps, 3],
      ['BALL_RELIEF', FOAM_BALL.relief, 3], ['BALL_CREASE', FOAM_BALL.crease, 3], ['BALL_CREASE_MEAN', FOAM_BALL.creaseMean, 3], ['DROP_G', DROP_G, 3],
    ] as const) expect(ballPars).toContain(`const float ${name} = ${value.toFixed(digits)};`);
    expect(ballPars).toContain('vec3 foamBallColour( float facing, float up, float sky, float ground, vec3 sun )');
    expect(ballPars).toContain('float foamBallGlowCoverage( float phase, float chord, float density )');
    expect(richSprayFragment).toContain('foamBallGlowCoverage( ballPhase, sqrt( max( 0.0, 1.0 - r * r ) ), churn.x )');
  });
});

describe('the spray drawn by its optical depth', () => {
  /** Two particles as the cloud packs them: x, y, z, size, opacity, kind, then velocity and optical depth. */
  const particles = (() => {
    const packed = new Float32Array(2 * SPRAY_STRIDE);
    packed.set([1, 2, 3, 0.1, 0.8, 0, 4, 5, -6, 0.75], 0);
    packed.set([7, 8, 9, 0.5, 0.25, 1, -1, 0.5, -2, 0.125], SPRAY_STRIDE);
    return packed;
  })();

  it('carries each particle’s velocity and optical depth to attributes of their own, in both looks', () => {
    for (const look of ['classic', 'rich'] as const) {
      const spray = new SprayPoints();
      spray.setLook(look);
      spray.update({ particles, count: 2 });
      const { geometry } = spray.mesh;
      expect(Array.from(geometry.getAttribute('velocity').array.slice(0, 6))).toEqual([4, 5, -6, -1, 0.5, -2]);
      expect(Array.from(geometry.getAttribute('tau').array.slice(0, 2))).toEqual([0.75, 0.125]);
      // The older attributes keep their offsets.
      expect(Array.from(geometry.getAttribute('look').array.slice(0, 4))).toEqual([Math.fround(0.1), Math.fround(0.8), 0.5, 0.25]);
      expect(Array.from(geometry.getAttribute('kind').array.slice(0, 2))).toEqual([0, 1]);
    }
  });

  it('blends the Rich spray as premultiplied light and the Classic spray as it always was', () => {
    const spray = new SprayPoints();
    expect(spray.mesh.material.premultipliedAlpha).toBe(false);
    spray.setLook('rich');
    expect(spray.mesh.material.premultipliedAlpha).toBe(true);
    // The fragment adds the light it scatters and hides a share of the background, and says so in its output.
    expect(spray.mesh.material.fragmentShader).toContain('gl_FragColor = vec4( gl_FragColor.rgb * emission, hidden );');
    spray.setLook('classic');
    expect(spray.mesh.material.premultipliedAlpha).toBe(false);
  });

  it('reads them in the Rich shaders, and the Classic shaders do not', () => {
    const spray = new SprayPoints();
    const classic = spray.mesh.material.vertexShader;
    expect(classic).not.toContain('velocity');
    spray.setLook('rich');
    expect(spray.mesh.material.vertexShader).toContain('attribute vec3 velocity;');
    expect(spray.mesh.material.vertexShader).toContain('attribute float tau;');
  });
});
