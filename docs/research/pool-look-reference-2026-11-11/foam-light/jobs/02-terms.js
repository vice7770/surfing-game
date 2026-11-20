// Light terms per pixel on the tube and the water, captured into file-scope globals (the block's locals are out of
// scope at the end of main). Debug outputs are linear, written after the tone map, so no tone map or encoding.
const r = window.__r; const V = window.__views; const s = window.__shoot; const tube = window.__tube(); const water = window.__water();
const G = `vec3 dbgN = vec3( 0.0 ); float dbgView = 0.0; float dbgCover = 0.0; vec3 dbgBody = vec3( 0.0 ); vec3 dbgE1s = vec3( 0.0 ); vec3 dbgE1w = vec3( 0.0 );
vec3 dbgE2 = vec3( 0.0 ); vec3 dbgE3 = vec3( 0.0 ); vec3 dbgE4 = vec3( 0.0 ); vec3 dbgE4b = vec3( 0.0 ); vec3 dbgWall = vec3( 0.0 ); float dbgShare = 0.0; float dbgDepth = 0.0;
void main() {`;
const TUBE_D = 'diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor, waterCover );';
const WATER_D = 'diffuseColor.rgb = mix( waterUnder, mix( waterFoamColor * waterCrease, waterBandAlbedo, waterBandShare ), waterCover );';
const CAP = ' dbgN = waterN; dbgView = waterViewCos; dbgCover = waterCover; dbgBody = waterBody; dbgDepth = vWaterDepth;';
const FRAY = '      + 0.500 * sweptBack );';
const TUBE_E = `${FRAY}
    { float dbgPre = vSweptSheetWeight * ( 1.0 - vWaterFoam ) * ( 1.0 - waterFresnel( waterViewCos ) );
      dbgE1s = dbgPre * sweptReach * sweptSkyShare * sweptSky * RECIPROCAL_PI;
      dbgE1w = dbgPre * sweptReach * ( 1.0 - sweptSkyShare ) * sweptWall * RECIPROCAL_PI;
      dbgE2 = dbgPre * 0.35 * sweptSunBehind * waterSunRadiance * exp( -waterAttenuation * sweptSunPath );
      dbgE3 = dbgPre * max( 0.0, -dot( waterN, waterSunDirection ) ) * mix( vSweptWallView.z, 1.0, clamp( vSweptThroat.w, 0.0, 1.0 ) ) * waterSunRadiance * exp( -vec3( 0.340000, 0.056500, 0.009220 ) * 8.0 * vSweptSheet ) * RECIPROCAL_PI;
      float dbgFm = sweptFray * max( waterFoamColor.r, max( waterFoamColor.g, waterFoamColor.b ) ) * RECIPROCAL_PI;
      dbgE4 = dbgFm * waterSunRadiance * max( 0.0, 0.500 * sweptFrayNear + 0.500 * sweptFrayFar - max( 0.0, sweptFraySun ) );
      dbgE4b = dbgFm * 0.5 * sweptBack; dbgWall = sweptWall; dbgShare = sweptSkyShare; }`;
const rep = (sh, a, b) => { if (!sh.fragmentShader.includes(a)) throw new Error('no anchor ' + a.slice(0, 50)); sh.fragmentShader = sh.fragmentShader.replace(a, b); };
const capTube = (sh) => { rep(sh, 'void main() {', G); rep(sh, TUBE_D, TUBE_D + CAP); rep(sh, FRAY, TUBE_E); };
const capWater = (sh) => { rep(sh, 'void main() {', G); rep(sh, WATER_D, WATER_D + CAP); };
const end = (expr) => (sh) => rep(sh, '#include <dithering_fragment>', `#include <dithering_fragment>\n gl_FragColor = vec4( ${expr}, 1.0 );`);
const SUN = 'max( 0.0, dot( dbgN, waterSunDirection ) )';
const common = {
  out: 'outgoingLight / 4.0', alb: 'diffuseColor.rgb / 4.0', dd: 'reflectedLight.directDiffuse / 4.0', id: 'reflectedLight.indirectDiffuse / 4.0',
  sp: '( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) / 4.0', em: 'totalEmissiveRadiance / 4.0',
  geo: `vec3( ${SUN}, dbgView, dbgCover )`, body: 'dbgBody', dep: 'vec3( clamp( dbgDepth / 4.0, 0.0, 1.0 ), 0.0, 0.0 )',
};
const tubeOnly = { e1s: 'dbgE1s / 4.0', e1w: 'dbgE1w / 4.0', e2: 'dbgE2 / 4.0', e3: 'dbgE3 / 4.0', e4: 'dbgE4 / 4.0', e4b: 'dbgE4b / 4.0', wall: 'dbgWall / 16.0',
  misc: 'vec3( dbgShare, vSweptSheetWeight, clamp( vSweptSheet, 0.0, 1.0 ) )', thr: 'vec3( clamp( vSweptThroat.w, 0.0, 1.0 ), clamp( vWaterFoam, 0.0, 1.0 ), clamp( vSweptSheetBack, 0.0, 1.0 ) )' };
const clear = () => { window.__patch(tube, '', null); window.__patch(water, '', null); };
const set = (name, tubeExpr, waterExpr) => {
  window.__patch(tube, 'c-' + name, (sh) => { capTube(sh); end(tubeExpr)(sh); });
  window.__patch(water, 'c-' + name, (sh) => { capWater(sh); end(waterExpr)(sh); });
};
for (const v of ['curl-lip', 'curl-front']) for (const t of ['midday', 'sunset']) {
  const tag = `${v.replace('curl-', '')}-${t}`;
  set('m1', 'vec3( 1.0, dbgCover, 1.0 )', 'vec3( 0.5, dbgCover, 1.0 )'); await s(V[v], 'rich', t, `mask1-${tag}.png`);
  set('m0', 'vec3( 1.0, dbgCover, 0.0 )', 'vec3( 0.5, dbgCover, 0.0 )'); await s(V[v], 'rich', t, `mask0-${tag}.png`);
  for (const [k, e] of Object.entries(common)) { set(k, e, e); await s(V[v], 'rich', t, `t-${k}-${tag}.png`); }
  for (const [k, e] of Object.entries(tubeOnly)) { set(k, e, 'vec3( 0.0 )'); await s(V[v], 'rich', t, `t-${k}-${tag}.png`); }
}
clear();
return true;
