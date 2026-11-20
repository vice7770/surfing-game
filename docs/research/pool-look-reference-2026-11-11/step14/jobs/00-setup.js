window.__patch = (material, name, edit) => {
  if (!material.__orig) { material.__orig = material.onBeforeCompile; material.__key = material.customProgramCacheKey; }
  material.onBeforeCompile = (shader, r) => { material.__orig(shader, r); if (edit) edit(shader); };
  material.customProgramCacheKey = () => (material.__key ? material.__key() : '') + (name ? '-dbg-' + name : '');
  material.needsUpdate = true;
};
window.__tube = () => window.waterSheetBarrel.mesh.material;
window.__shoot = async (view, look, time, file) => { for (let k = 0; k < 2; k += 1) await window.waterSheetShot(view, look, time, file); return true; };
// Debug output at the very end of the fragment: X / 4, linear, no encoding; non-target meshes untouched.
window.__out = (expr, pre) => (shader) => {
  if (pre) for (const [a, b] of pre) { if (!shader.fragmentShader.includes(a)) throw new Error('no anchor ' + a); shader.fragmentShader = shader.fragmentShader.replace(a, b); }
  shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\n gl_FragColor = vec4( ${expr}, 1.0 );`);
};
window.__full = ['float sweptStreakOwn = sweptStreakFoam();', 'float sweptStreakOwn = vSweptStreak.z > 0.0 ? 0.85 : 0.0;'];
const u = window.waterSheetWater.materialUniforms;
return { shots: window.waterSheetShots.map((s) => [s.name, s.eye.toArray().map((v) => +v.toFixed(2)), s.target.toArray().map((v) => +v.toFixed(2))]), seconds: window.waterSheetSeconds,
  sun: u.waterSunDirection.value.toArray(), sunRad: u.waterSunRadiance.value.toArray(), foam: u.waterFoamColor.value.toArray() };
