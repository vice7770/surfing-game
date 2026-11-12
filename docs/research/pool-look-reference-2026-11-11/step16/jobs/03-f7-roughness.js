// F7 trace: on the thin sheet, take the roughness (and the glitter's cover) from the cover without the streak.
const s = window.__shoot; const m = window.__tube();
const THIN = 'vSweptSheetWeight * ( 1.0 - smoothstep( 0.040, 0.150, vSweptSheet ) )';
const R = 'roughnessFactor = mix( roughnessFactor, 0.7, waterCover );';
const G = 'waterGlitterCover = waterCover;';
const CLEAN = `float sweptCoverClean = ( ${THIN} ) > 0.0 ? mix( vWaterFoam, waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) ), waterFoamPattern * vSweptLace ) : waterCover;\n`;
const rough = (sh) => { for (const a of [R, G]) if (!sh.fragmentShader.includes(a)) throw new Error('no ' + a);
  sh.fragmentShader = sh.fragmentShader.replace(G, CLEAN + 'waterGlitterCover = sweptCoverClean;').replace(R, 'roughnessFactor = mix( roughnessFactor, 0.7, sweptCoverClean );'); };
const roughOnly = (sh) => { sh.fragmentShader = sh.fragmentShader.replace(G, CLEAN + G).replace(R, 'roughnessFactor = mix( roughnessFactor, 0.7, sweptCoverClean );'); };
for (const [v, t] of [['curl-lip', 'midday'], ['curl-lip', 'sunset'], ['curl-front', 'midday']]) {
  const tag = `${v.replace('curl-', '')}-${t}`;
  window.__patch(m, 'f7r', rough); await s(v, 'rich', t, `f7r-${tag}.png`);
  window.__patch(m, 'f7ro', roughOnly); await s(v, 'rich', t, `f7ro-${tag}.png`);
}
// debug: albedo-only change (diffuse) at the lip view
window.__patch(m, 'dbgrough', window.__out('vec3( roughnessFactor, 0.0, 0.0 )')); await s('curl-lip', 'rich', 'midday', 'dbg-rough-after.png');
window.__patch(m, '', null);
return 1;
