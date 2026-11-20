// C2 step 5c, the look-gate probe (ruling 38 §"Next, in order" item 1). Evaluated in the water sheet dev view by
// `headless-shot.mjs sheet --probe=<this file>`, in the same held sea the stills come from.
//
// Part 1, what the still drew — read from the page, not the code:
//  - `look`: the look the still tool asked for (`WaterSurface.look`, the graphics setting's).
//  - `writtenLook`: the look the surface last WROTE with (`effectiveLook`: rich only when the look is rich and the
//    source is cubic). That is the gate that decides whether the aeration reaches the material [WaterSurface.ts:543].
//  - `waterBodyGain`: 3 = Classic, 4 = Rich without the water light, 1 = Rich with it (ruling 25e / #282). The gain
//    and the display exposure are set in one call, so gain 1 means exposure 1.6 was set in the same frame.
//
// Part 2, the water's own luminance against the foam's (ruling 38's branch 2): `waterSheetFoamAgainstWater`, which
// does the three passes inside the page. It has to be in the page: a readPixels from here comes back empty, because
// the drawing buffer is gone by the time an outside caller can read it.
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
const wanted = (w.__probeShots || ['curl-ride', 'curl-front', 'curl-channel', 'curl-inside', 'curl-close', 'curl-behind']).filter((n) => shots.includes(n));
for (const name of wanted) {
  const against = await w.waterSheetFoamAgainstWater(name, 'rich', 'midday');
  out.views[name] = { state: state(), against, foamLight: await w.waterSheetFoamLight(name, 'rich', 'midday') };
}
return out;
