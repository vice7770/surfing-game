// C2 step 5c, the look-gate probe (ruling 38 §"Next, in order" item 1). Evaluated in the water sheet dev view by
// `headless-shot.mjs sheet --probe=<this file>`, in the same held sea and the same frame the stills come from.
//
// Part 1, what the still drew — read from the page, not the code:
//  - `look`: the look the still tool asked for (`WaterSurface.look`, the graphics setting's).
//  - `writtenLook`: the look the surface last WROTE with (`effectiveLook`: rich only when the look is rich and the
//    source is cubic). This is the gate that decides whether the aeration reaches the material [WaterSurface.ts:543].
//  - `waterBodyGain`: 3 = Classic, 4 = Rich without the water light, 1 = Rich with it (ruling 25e / #282). The gain
//    and the display exposure are set in one call, so gain 1 means exposure 1.6 was set in the same frame.
//
// Part 2, the water's own luminance against the foam's, in one frame under one sun (ruling 38's branch 2). Three
// passes from the shot's own camera: as drawn, with the foam colour set magenta, and with the water mesh hidden.
//  - a pixel is WATER if hiding the water mesh changed it;
//  - its foam share is how far the magenta pass pulled its green down: `foam` = that pull >= 120 (the foam colour
//    dominates the pixel), `clear` = below 10 (no foam in it at all). Between the two is a mixed band, left out of
//    both, so neither figure is diluted by the other.
//  - `waterFoamColor` also tints the underwater plume [richWaterGlsl.ts:114], so a weak pull is not necessarily
//    surface white: that is why the strong band, not any pull at all, is the foam's figure here.
// The ratio that matters is the foam's median over the clear water's 90th percentile: white reads as white only
// where it stands above the brightest water around it. The lip-contrast tool's own target for a white that reads is
// 1.5-2x (`waterSheetLipContrast`).
const w = window;
const water = w.waterSheetWater;
const mode = w.waterSheetMode;
const state = () => {
  const foamColour = water.materialUniforms.waterFoamColor.value;
  return {
    look: water.look,
    writtenLook: water.written ? water.written.look : null,
    sourceCubic: !!(water.source && water.source.cubic),
    sourceWritesAeration: !!(water.source && water.source.writeAeration),
    waterBodyGain: water.materialUniforms.waterBodyGain.value,
    foamPattern: water.materialUniforms.waterFoamPattern.value,
    foamColour: [+foamColour.r.toFixed(4), +foamColour.g.toFixed(4), +foamColour.b.toFixed(4)],
  };
};
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');
const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const read = () => {
  const px = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return px;
};
/** The luminance percentiles of the pixels `keep` selects, and their mean linear colour. */
const stats = (drawn, keep) => {
  const lumas = [];
  const sum = [0, 0, 0];
  for (let p = 0; p < canvas.width * canvas.height; p += 1) {
    if (!keep(p)) continue;
    const k = 4 * p;
    const [r, g, b] = [linear(drawn[k]), linear(drawn[k + 1]), linear(drawn[k + 2])];
    lumas.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    sum[0] += r;
    sum[1] += g;
    sum[2] += b;
  }
  if (!lumas.length) return { pixels: 0 };
  lumas.sort((a, b) => a - b);
  const at = (q) => +lumas[Math.floor(q * (lumas.length - 1))].toFixed(4);
  return {
    pixels: lumas.length, share: +(lumas.length / (canvas.width * canvas.height)).toFixed(4),
    p10: at(0.1), p50: at(0.5), p90: at(0.9), p99: at(0.99),
    rgb: sum.map((c) => +(c / lumas.length).toFixed(4)),
  };
};
const shots = w.waterSheetShots.map((s) => s.name);
const config = {};
for (const key of ['poolSize', 'wave', 'waterLight', 'waves', 'swell', 'spot', 'wallBody', 'tubeLook', 'lipLook', 'afterTube', 'poolReach']) {
  if (mode && mode.config && mode.config[key] !== undefined) config[key] = mode.config[key];
}
const out = { search: w.location.search, seconds: w.waterSheetSeconds, canvas: [canvas.width, canvas.height], shots, config, views: {} };
const wanted = (w.__probeShots || ['curl-ride', 'curl-front', 'curl-channel', 'curl-inside', 'curl-close']).filter((n) => shots.includes(n));
for (const name of wanted) {
  // As drawn, from the shot's own camera (the shot renders and leaves its frame in the default framebuffer).
  await w.waterSheetShot(name, 'rich', 'midday', 'probe-pass.png');
  const drawn = read();
  // The foam magenta: how far each pixel's green falls is how much of it the foam colour is.
  const colour = water.materialUniforms.waterFoamColor.value;
  const was = colour.clone();
  colour.setRGB(1, 0, 1);
  await w.waterSheetShot(name, 'rich', 'midday', 'probe-pass.png');
  const magenta = read();
  colour.copy(was);
  // The water hidden: which pixels are water at all.
  water.mesh.visible = false;
  await w.waterSheetShot(name, 'rich', 'midday', 'probe-pass.png');
  const dry = read();
  water.mesh.visible = true;
  const pull = (p) => drawn[4 * p + 1] - magenta[4 * p + 1];
  const isWater = (p) => {
    const k = 4 * p;
    return drawn[k] !== dry[k] || drawn[k + 1] !== dry[k + 1] || drawn[k + 2] !== dry[k + 2];
  };
  const foam = stats(drawn, (p) => pull(p) >= 120);
  const clear = stats(drawn, (p) => isWater(p) && pull(p) < 10);
  out.views[name] = {
    state: state(),
    frame: stats(drawn, () => true),
    waterAll: stats(drawn, isWater),
    foam,
    foamAny: stats(drawn, (p) => pull(p) >= 40),
    clear,
    // White reads only where it stands above the brightest water around it.
    foamOverClearP90: foam.pixels && clear.pixels ? +(foam.p50 / clear.p90).toFixed(3) : null,
    foamOverClearP50: foam.pixels && clear.pixels ? +(foam.p50 / clear.p50).toFixed(3) : null,
  };
}
return out;
