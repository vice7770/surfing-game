// C2 step 5d, the veil probe (ruling 39's lead 1): the grey-brown veils over the broken water, measured rather than
// read off a crop. `waterSheetVeil` renders each view twice, as drawn and with the swept barrel's mesh hidden, and
// reports what share of the frame's colourless mid-tone pixels that mesh draws.
//
// `greyOnBarrel` near 1 says the veils are the loft and the lip sheets it carries (ruling 37's fray lip, stacking);
// near 0 says they are the water's own.
const w = window;
const shots = w.waterSheetShots.map((s) => s.name);
const out = { seconds: w.waterSheetSeconds, search: w.location.search, views: {} };
for (const name of ['bore-above', 'bore-line', 'bore-face', 'curl-ride'].filter((n) => shots.includes(n))) {
  out.views[name] = await w.waterSheetVeil(name, 'rich', 'midday');
}
return out;
