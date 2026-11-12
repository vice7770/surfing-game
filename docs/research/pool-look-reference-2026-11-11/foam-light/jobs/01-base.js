// Display and linear stills per view and time. Linear = LinearToneMapping at exposure 0.25, so a pixel stores sRGB(L / 4).
// (The run also tried masks here; they did not compile, `waterCover` is out of scope at the end of main. 02-terms.js makes them.)
const r = window.__r; const V = window.__views; const s = window.__shoot; const tube = window.__tube(); const water = window.__water();
const clear = () => { window.__patch(tube, '', null); window.__patch(water, '', null); };
const res = {};
for (const v of ['curl-lip', 'curl-front']) for (const t of ['midday', 'sunset']) {
  const tag = `${v.replace('curl-', '')}-${t}`;
  clear(); r.toneMapping = 7; r.toneMappingExposure = 1.05;
  await s(V[v], 'rich', t, `disp-${tag}.png`);
  r.toneMapping = 1; r.toneMappingExposure = 0.25;
  await s(V[v], 'rich', t, `lin-${tag}.png`);
  r.toneMapping = 7; r.toneMappingExposure = 1.05;
  clear();
  const u = window.waterSheetWater.materialUniforms;
  res[tag] = { sun: u.waterSunDirection.value.toArray(), sunRad: u.waterSunRadiance.value.toArray(), gain: u.waterBodyGain.value,
    deep: u.waterDeepReflectance.value.toArray(), bed: u.waterBedAlbedo.value.toArray(), att: u.waterAttenuation.value.toArray(), dif: u.waterDiffuseAttenuation.value.toArray(),
    envI: water.envMapIntensity, refl: u.waterReflection?.value };
}
clear(); r.toneMapping = 7; r.toneMappingExposure = 1.05;
return res;
