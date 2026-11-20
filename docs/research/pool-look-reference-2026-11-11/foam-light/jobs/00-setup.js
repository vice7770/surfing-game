window.__patch = (material, name, edit) => {
  if (!material.__orig) { material.__orig = material.onBeforeCompile; material.__key = material.customProgramCacheKey; }
  material.onBeforeCompile = (shader, r) => { window.__r = r; material.__orig(shader, r); if (edit) edit(shader); };
  material.customProgramCacheKey = () => (material.__key ? material.__key() : '') + (name ? '-dbg-' + name : '');
  material.needsUpdate = true;
};
window.__tube = () => window.waterSheetBarrel.mesh.material;
window.__water = () => window.waterSheetWater.mesh.material;
window.__shoot = async (view, look, time, file) => { for (let k = 0; k < 2; k += 1) await window.waterSheetShot(view, look, time, file); return true; };
window.__out = (expr, pre) => (shader) => {
  if (pre) for (const [a, b] of pre) { if (!shader.fragmentShader.includes(a)) throw new Error('no anchor ' + a); shader.fragmentShader = shader.fragmentShader.replace(a, b); }
  shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\n gl_FragColor = vec4( ${expr}, 1.0 );`);
};
// curl-lip as step 14 defined it: curl-front's line of sight at 0.4 of its distance.
const f = window.waterSheetShots.find((x) => x.name === 'curl-front');
const eye = f.eye.clone().sub(f.target).multiplyScalar(0.4).add(f.target);
window.__views = { 'curl-lip': { eye: eye.toArray(), target: f.target.toArray() }, 'curl-front': 'curl-front', 'curl-inside': 'curl-inside' };
// Grab the renderer through a throwaway compile of the tube.
window.__patch(window.__tube(), 'cap', null);
await window.__shoot('curl-front', 'rich', 'midday', 'cap.png');
window.__patch(window.__tube(), '', null);
const r = window.__r;
const progs = (r.info.programs || []).map((p) => ({ name: p.name, key: (p.cacheKey || '').slice(0, 200), frag: r.getContext().getShaderSource(r.getContext().getAttachedShaders(p.program)[1]) }));
const u = window.waterSheetWater.materialUniforms;
const names = [];
window.__scene = null;
let o = window.waterSheetWater.mesh; while (o.parent) o = o.parent; window.__scene = o;
o.traverse((m) => { if (m.isMesh || m.isPoints || m.isSprite) names.push([m.type, m.name, m.material?.name ?? '', m.material?.type ?? '', m.visible, m.material?.toneMapped]); });
return { seconds: window.waterSheetSeconds, toneMapping: r.toneMapping, exposure: r.toneMappingExposure, outputColorSpace: r.outputColorSpace,
  views: window.__views, sun: u.waterSunDirection.value.toArray(), sunRad: u.waterSunRadiance.value.toArray(), foam: u.waterFoamColor.value.toArray(),
  uniformNames: Object.keys(u), objects: names, programs: progs };
