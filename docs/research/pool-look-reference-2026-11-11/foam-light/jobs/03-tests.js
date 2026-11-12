// Held-frame tests: the body gain scaled in the program (setWaterLook resets the uniform each shot), and the exposure.
const r = window.__r; const V = window.__views; const s = window.__shoot; const tube = window.__tube(); const water = window.__water();
const gain = (k) => (sh) => {
  const decl = 'uniform float waterBodyGain;';
  const parts = sh.fragmentShader.split(decl);
  sh.fragmentShader = parts.map((p) => p.split('waterBodyGain').join(`( waterBodyGain * ${k.toFixed(4)} )`)).join(decl);
};
const clear = () => { window.__patch(tube, '', null); window.__patch(water, '', null); r.toneMappingExposure = 1.05; };
const variants = {
  g1: { tube: 0.25, water: 0.25, exp: 1.05 },
  g075: { tube: 0.1875, water: 0.1875, exp: 1.05 },
  g1e16: { tube: 0.25, water: 0.25, exp: 1.6 },
  g075e2: { tube: 0.1875, water: 0.1875, exp: 2.0 },
  g1e2: { tube: 0.25, water: 0.25, exp: 2.0 },
  e16: { tube: 1, water: 1, exp: 1.6 },
  tg1: { tube: 0.25, water: 1, exp: 1.05 },
};
for (const [k, v] of Object.entries(variants)) {
  window.__patch(tube, 'gain' + v.tube, v.tube === 1 ? null : gain(v.tube));
  window.__patch(water, 'gain' + v.water, v.water === 1 ? null : gain(v.water));
  for (const [view, t] of [['curl-lip', 'midday'], ['curl-front', 'midday'], ['curl-lip', 'sunset'], ['curl-front', 'sunset']]) {
    r.toneMappingExposure = v.exp; await s(V[view], 'rich', t, `${k}-${view.replace('curl-', '')}-${t}.png`);
  }
  r.toneMappingExposure = 1.05;
}
clear();
await s(V['curl-lip'], 'rich', 'midday', 'again-lip-midday.png');
return true;
