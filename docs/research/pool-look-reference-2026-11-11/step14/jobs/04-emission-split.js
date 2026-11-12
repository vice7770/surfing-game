const m = window.__tube();
const F = window.__full;
const variants = {
  all: [],
  nofray: [['totalEmissiveRadiance += sweptFray *', 'totalEmissiveRadiance += 0.0 * sweptFray *']],
  nofrayback: [['0.500 * sweptBack );', '0.0 * sweptBack );']],
  notrans: [['sweptReach * sweptBack * RECIPROCAL_PI', '0.0 * sweptBack * RECIPROCAL_PI']],
};
for (const [k, pre] of Object.entries(variants)) {
  window.__patch(m, 'em-' + k, window.__out('totalEmissiveRadiance / 4.0', [F, ...pre]));
  await window.__shoot('curl-lip', 'rich', 'midday', `dbg-em-${k}-lip.png`);
  window.__patch(m, 'im-' + k, (sh) => { for (const [a, b] of [F, ...pre]) { if (!sh.fragmentShader.includes(a)) throw new Error('no ' + a); sh.fragmentShader = sh.fragmentShader.replace(a, b); } });
  await window.__shoot('curl-lip', 'rich', 'midday', `full-${k}-lip.png`);
}
window.__patch(m, '', null);
await window.__shoot('curl-lip', 'rich', 'midday', 'base-lip-midday-2.png');
const u = window.waterSheetWater.materialUniforms;
return { sun: u.waterSunDirection.value.toArray(), sunRad: u.waterSunRadiance.value.toArray() };
