// C2 step 5c, the look-gate probe (ruling 38 §"Next, in order" item 1). Evaluated in the water sheet dev view by
// `headless-shot.mjs sheet --probe=<this file>`, in the same held sea and the same frame the stills come from.
//
// What it answers, by reading the page rather than the code:
//  - `look`: the look the still tool asked for (`WaterSurface.look`, the graphics setting's).
//  - `writtenLook`: the look the surface last WROTE with (`effectiveLook`: rich only when the look is rich and the
//    source is cubic). This is the gate that decides whether the aeration — any foam at all — reaches the material
//    [WaterSurface.ts:543].
//  - `waterBodyGain`: 3 = Classic, 4 = Rich without the water light, 1 = Rich with it (ruling 25e / #282). The gain
//    and the display exposure are set in one call, so gain 1 means exposure 1.6 was set in the same frame.
//  - `foam`: the foam's OWN pixels and their luminance, found by drawing the foam magenta and diffing. 0 pixels means
//    no foam reached the screen at all.
//  - `curl`: the foam-free water beside the lip (`faceWaterClear`), so the foam's luminance can be read against the
//    water's in the same frame under the same sun — the measurement ruling 38 asks for if the look was Rich all along.
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
const shots = w.waterSheetShots.map((s) => s.name);
const config = {};
for (const key of ['poolSize', 'wave', 'waterLight', 'waves', 'swell', 'spot', 'wallBody', 'tubeLook', 'lipLook', 'afterTube', 'poolReach']) {
  if (mode && mode.config && mode.config[key] !== undefined) config[key] = mode.config[key];
}
const out = { search: w.location.search, seconds: w.waterSheetSeconds, shots, config, views: {} };
const wanted = (w.__probeShots || ['curl-ride', 'curl-front', 'curl-channel', 'curl-inside', 'curl-close']).filter((n) => shots.includes(n));
for (const name of wanted) {
  const view = { state: null, luma: null, foam: null, curl: null };
  view.luma = await w.waterSheetLuma(name, 'rich', 'midday');
  view.state = state();
  view.foam = await w.waterSheetFoamLight(name, 'rich', 'midday');
  const curl = await w.waterSheetCurlLuma(name, 'rich', 'midday');
  // Only the drawn frame's regions matter here; the sheet-off and owner-winding passes are step 5a's question.
  if (curl) view.curl = { lip: curl.drawn.lip, backWall: curl.drawn.backWall, faceWater: curl.drawn.faceWater, faceWaterClear: curl.drawn.faceWaterClear };
  out.views[name] = view;
}
return out;
