import { describe, expect, it } from 'vitest';
import { skyExposure, type SkyEntry } from '../PhotoSky';
import { groundIrradiance, skyIrradiance } from '../SprayPoints';
import { DROP_G, MIST_G, SPRAY_DRAW, SPRAY_LIGHT, ballPars, foamBallColour, henyeyGreenstein, isMist, mistPars, sprayColour, sprayDrawPars, sprayPars, sprayReflectance, sprayWhite } from './mist';

const sky = (timeOfDay: SkyEntry['timeOfDay'], elevation: number, irradiance: [number, number, number], skyLight: number): SkyEntry => {
  const e = (elevation * Math.PI) / 180;
  return { id: timeOfDay, timeOfDay, hdr: '', background: '', sun: { direction: [Math.cos(e) * 0.6, Math.sin(e), Math.cos(e) * 0.8], irradiance }, skyIrradiance: skyLight };
};
/** The committed noon and sunset skies' light as the spray gets it: the sky, the foam sheet's bounce and the sun per channel. */
function lit(entry: SkyEntry) {
  const exposure = skyExposure(entry);
  const radiance = exposure.sunColor.clone().multiplyScalar(exposure.sun);
  const height = entry.sun.direction[1];
  const skyLight = skyIrradiance(height, radiance);
  return { sky: skyLight, ground: groundIrradiance(skyLight, height, radiance), sun: [radiance.r, radiance.g, radiance.b] as [number, number, number] };
}
const noon = lit(sky('midday', 47.9, [4.16, 4.22, 3.85], 1.69));
const dusk = lit(sky('sunset', 6.1, [6.94, 2.38, 0.15], 2.34));
const luma = ([r, g, b]: readonly number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** The drops' phase function (1 for an isotropic scatterer) at an angle, degrees, from straight toward the sun. */
const phaseAt = (degrees: number) => 4 * Math.PI * henyeyGreenstein(Math.cos((degrees * Math.PI) / 180), MIST_G);

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

  it('scatters as water drops do: Mie g is 0.86–0.88, 180–510 times brighter at 10° than at 90° (notes/round4-spray-mist/spray-mist.md §3)', () => {
    expect(DROP_G).toBeGreaterThanOrEqual(0.86);
    expect(DROP_G).toBeLessThanOrEqual(0.88);
    const contrast = henyeyGreenstein(Math.cos((10 * Math.PI) / 180), DROP_G) / henyeyGreenstein(0, DROP_G);
    expect(contrast).toBeGreaterThan(180);
    expect(contrast).toBeLessThan(510);
    // The game's old mist g gave 21.
    expect(henyeyGreenstein(Math.cos((10 * Math.PI) / 180), 0.6) / henyeyGreenstein(0, 0.6)).toBeLessThan(25);
  });

  it('has a GLSL twin', () => {
    expect(mistPars).toContain('float henyeyGreenstein( float cosTheta, float g )');
    expect(ballPars).toContain(`const float DROP_G = ${DROP_G.toFixed(3)};`);
  });
});

describe('spray drawn by its optical depth (decided 2026-09-29, item 1)', () => {
  it('reflects as the two-stream layer does (Bohren 1987): 0.06 at τ = 1, near a half at 15, 0.87 at 100', () => {
    expect(sprayReflectance(1)).toBeCloseTo(0.06, 1);
    expect(sprayReflectance(3)).toBeCloseTo(0.16, 1);
    expect(sprayReflectance(15)).toBeCloseTo(0.49, 1);
    expect(sprayReflectance(30)).toBeCloseTo(0.66, 1);
    expect(sprayReflectance(100)).toBeCloseTo(0.87, 1);
  });

  it('weights the light it adds by 1 − e^−τ: see-through near τ = 1, opaque by 5', () => {
    expect(sprayColour(1, 1, 0, 0, noon.sky, noon.ground, noon.sun).emission).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(sprayColour(1, 1, 0, 0, noon.sky, noon.ground, noon.sun).emission).toBeLessThan(0.7);
    expect(sprayColour(5, 1, 0, 0, noon.sky, noon.ground, noon.sun).emission).toBeGreaterThan(0.99);
    expect(sprayColour(0, 1, 0, 0, noon.sky, noon.ground, noon.sun).emission).toBe(0);
  });

  it('hides only part of what is behind it while it is thin, as drops scatter forward, and all of it once it is white', () => {
    const thin = sprayColour(0.5, 1, 0, 0, noon.sky, noon.ground, noon.sun);
    expect(thin.hidden).toBeGreaterThan(SPRAY_LIGHT.leak * thin.emission - 1e-12);
    expect(thin.hidden).toBeLessThan(0.5 * thin.emission);
    const thick = sprayColour(30, 1, 0, 0, noon.sky, noon.ground, noon.sun);
    expect(thick.hidden).toBeCloseTo(thick.emission, 9);
    expect(sprayWhite(30)).toBe(1);
    expect(sprayWhite(0.5)).toBeLessThan(0.2);
    // Whiter as it thickens, never the other way.
    for (let tau = 0.1; tau < 20; tau += 0.1) expect(sprayWhite(tau + 0.1)).toBeGreaterThanOrEqual(sprayWhite(tau));
  });

  it('does not darken a bright foam behind it, however faint the front-lit spray: every speck leaves at least 95 % of the foam’s light', () => {
    // The foam on a level surface under the light, as the water draws it; spray in front of it, lit from the front.
    for (const light of [noon, dusk]) {
      const foam = luma([0.6867, 0.8879, 0.8148].map((c, k) => (c * (light.sky + light.sun[k] * (light === noon ? 0.742 : 0.106))) / Math.PI));
      for (const tau of [0.1, 0.5, 1, 2, 5]) {
        const { colour, emission, hidden } = sprayColour(tau, phaseAt(160), 0, 0.3, light.sky, light.ground, light.sun);
        expect(luma(colour) * emission + foam * (1 - hidden), `τ ${tau}`).toBeGreaterThanOrEqual(0.95 * foam);
      }
    }
  });

  it('glows toward the sun and is faint from the front: thin spray 20° from the sun outshines the same 150° from it, which sits on the readability floor', () => {
    const near = luma(sprayColour(0.6, phaseAt(20), 0, 0.3, noon.sky, noon.ground, noon.sun).colour);
    const far = luma(sprayColour(0.6, phaseAt(150), 0, 0.3, noon.sky, noon.ground, noon.sun).colour);
    expect(near).toBeGreaterThan(3 * far);
    const floor = SPRAY_LIGHT.readable * luma(foamBallColour(0, 0.3, noon.sky, noon.ground, noon.sun));
    expect(far).toBeCloseTo(floor, 6);
    // Mie gives 180–510 times more light at 10° than at 90° for drops of 50–500 µm; the lobe is in the phase function.
    expect(phaseAt(10) / phaseAt(90)).toBeGreaterThan(180);
  });

  it('keeps the decided readability minimum: thin spray lit from the front shows at least a third of the light it would be thick, in its own hue', () => {
    for (const light of [noon, dusk]) {
      const thin = sprayColour(0.3, phaseAt(160), 0, 0.3, light.sky, light.ground, light.sun).colour;
      const thick = foamBallColour(0, 0.3, light.sky, light.ground, light.sun);
      expect(luma(thin)).toBeGreaterThanOrEqual(SPRAY_LIGHT.readable * luma(thick) - 1e-12);
      // Spray at the floor is lifted as a whole (by a factor, not channel by channel): at sunset it keeps the sun's warmth.
      if (light === dusk) expect(thin[0]).toBeGreaterThan(thin[2]);
    }
    // Where the physical light is above the floor nothing is lifted: toward the sun the colour is the single scattering's.
    const glow = sprayColour(0.3, phaseAt(10), 0, 0.3, noon.sky, noon.ground, noon.sun).colour;
    expect(luma(glow)).toBeGreaterThan(1.5 * SPRAY_LIGHT.readable * luma(foamBallColour(0, 0.3, noon.sky, noon.ground, noon.sun)));
  });

  it('is white once thick: from τ of 30 its colour is the foam’s, whichever way the sun lies', () => {
    for (const degrees of [10, 60, 150]) {
      const white = sprayColour(30, phaseAt(degrees), 0.2, 0.4, noon.sky, noon.ground, noon.sun).colour;
      const foam = foamBallColour(0.2, 0.4, noon.sky, noon.ground, noon.sun);
      for (let k = 0; k < 3; k += 1) expect(white[k]).toBeCloseTo(foam[k], 9);
    }
  });

  it('keeps only part of a low sun’s colour when thin, so a veil glows pale gold and not orange', () => {
    const colour = sprayColour(0.5, phaseAt(25), 0, 0.3, dusk.sky, dusk.ground, dusk.sun).colour;
    expect(colour[0]).toBeGreaterThan(colour[2]);
    // The sun itself is red over blue by ~48; the veil's glow by well under a third of that.
    expect(dusk.sun[0] / dusk.sun[2]).toBeGreaterThan(30);
    expect(colour[0] / colour[2]).toBeLessThan(5);
  });

  it('caps the glow toward a sun in the line of sight, not letting it burn out', () => {
    const into = sprayColour(0.5, phaseAt(1), 0, 0.3, noon.sky, noon.ground, noon.sun).colour;
    const capped = sprayColour(0.5, SPRAY_LIGHT.phaseMax, 0, 0.3, noon.sky, noon.ground, noon.sun).colour;
    expect(into).toEqual(capped);
  });

  it('has a GLSL twin with the same numbers', () => {
    expect(sprayPars).toContain(`const float SPRAY_CHROMA = ${SPRAY_LIGHT.chroma.toFixed(3)};`);
    expect(sprayPars).toContain(`const float SPRAY_PHASE_MAX = ${SPRAY_LIGHT.phaseMax.toFixed(1)};`);
    expect(sprayPars).toContain(`const float SPRAY_READABLE = ${SPRAY_LIGHT.readable.toFixed(3)};`);
    expect(sprayPars).toContain(`const float SPRAY_LEAK = ${SPRAY_LIGHT.leak.toFixed(3)};`);
    expect(sprayPars).toContain('vec3 sprayColour( float tau, float phase, float facing, float up, float sky, float ground, vec3 sun )');
    expect(sprayPars).toContain('float sprayWhite( float tau )');
    expect(sprayDrawPars).toContain(`const float STREAK_DROP = ${SPRAY_DRAW.streakDrop.toFixed(5)};`);
    expect(sprayDrawPars).toContain(`const float STREAK_MIST = ${SPRAY_DRAW.streakMist.toFixed(5)};`);
    expect(sprayDrawPars).toContain(`const float WIDTH_MIST = ${SPRAY_DRAW.widthMist.toFixed(3)};`);
    // The drops’ g is the mist’s: one lobe for all spray.
    expect(MIST_G).toBe(DROP_G);
  });

  it('draws mist as a trail longer than a drop’s frame and narrower than it was, so that a veil reads as filaments and not puffs', () => {
    // Provisional, set by eye on the water sheet: a drop is a frame's streak (1/30 s), mist trails 0.3 s and is 1.2 of its
    // cluster wide, where it trailed 0.1 s and was 1.6 wide, and read as a row of round puffs.
    expect(SPRAY_DRAW.streakMist).toBeGreaterThan(5 * SPRAY_DRAW.streakDrop);
    expect(SPRAY_DRAW.widthMist).toBeGreaterThan(SPRAY_DRAW.widthDrop);
    expect(SPRAY_DRAW.widthMist).toBeLessThan(1.6);
  });
});
